# 🍕 SISTEMA DE PIZZAS - IMPLEMENTAÇÃO COMPLETA

## 📋 **ANÁLISE DE MERCADO**

### **Como Pizzarias Geralmente Funcionam:**

1. **Estrutura Básica:**
   - **Tamanhos**: Pequena, Média, Grande, Família
   - **Sabores**: Margherita, Calabresa, Portuguesa, etc.
   - **Combinações**: Meio a meio, 1/3, 2/3
   - **Bordas**: Tradicional, Catupiry, Cheddar
   - **Adicionais**: Ingredientes extras

2. **Modelos de Precificação:**
   - **Modelo A**: Preço por tamanho + sabor mais caro
   - **Modelo B**: Preço fixo por tamanho + taxa por sabor premium
   - **Modelo C**: Preço individual por combinação

## 🎯 **SOLUÇÃO PROPOSTA PARA O NEXO**

### **Abordagem Híbrida - Melhor dos Dois Mundos:**

Vamos usar o sistema de **Opções Adicionais** existente + **Produtos Variações** para criar um sistema flexível e poderoso.

## 🗄️ **ESTRUTURA DO BANCO DE DADOS**

### **1. Tabelas Existentes (Aproveitadas):**
- ✅ `produtos` - Produto base (ex: "Pizza")
- ✅ `opcoes_adicionais` - Categorias (Tamanho, Sabor, Borda)
- ✅ `opcoes_adicionais_itens` - Itens específicos
- ✅ `produtos_opcoes_adicionais` - Vinculação produto-opção

### **2. Nova Tabela: `produto_variacoes`**
```sql
CREATE TABLE produto_variacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  produto_base_id UUID NOT NULL REFERENCES produtos(id),
  nome VARCHAR(255) NOT NULL, -- "Pizza Pequena", "Pizza Média"
  codigo VARCHAR(50) NOT NULL, -- "PIZZA-P", "PIZZA-M"
  preco NUMERIC(10,2) NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  
  -- Configurações específicas da variação
  permite_meio_a_meio BOOLEAN DEFAULT FALSE,
  max_sabores INTEGER DEFAULT 1,
  preco_sabor_adicional NUMERIC(10,2) DEFAULT 0,
  
  -- Campos fiscais (herdam do produto base, mas podem ser sobrescritos)
  ncm VARCHAR(8),
  cfop VARCHAR(4),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **3. Nova Tabela: `produto_variacoes_opcoes`**
```sql
CREATE TABLE produto_variacoes_opcoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variacao_id UUID NOT NULL REFERENCES produto_variacoes(id),
  opcao_adicional_id UUID NOT NULL REFERENCES opcoes_adicionais(id),
  obrigatorio BOOLEAN DEFAULT FALSE,
  quantidade_minima INTEGER DEFAULT 0,
  quantidade_maxima INTEGER DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔧 **CONFIGURAÇÃO DO SISTEMA**

### **Passo 1: Configurar Opções Adicionais**

1. **Tamanhos:**
   - Pequena (25cm)
   - Média (30cm) 
   - Grande (35cm)
   - Família (40cm)

2. **Sabores:**
   - Margherita
   - Calabresa
   - Portuguesa
   - Frango com Catupiry
   - etc.

3. **Bordas:**
   - Tradicional (R$ 0,00)
   - Catupiry (R$ 5,00)
   - Cheddar (R$ 6,00)

### **Passo 2: Criar Produto Base**
```
Nome: Pizza
Código: PIZZA-BASE
Preço: 0,00 (será definido pelas variações)
Grupo: Pizzas
```

### **Passo 3: Criar Variações**
```
1. Pizza Pequena - R$ 25,00 (permite_meio_a_meio: true, max_sabores: 2)
2. Pizza Média - R$ 35,00 (permite_meio_a_meio: true, max_sabores: 2)
3. Pizza Grande - R$ 45,00 (permite_meio_a_meio: true, max_sabores: 3)
4. Pizza Família - R$ 55,00 (permite_meio_a_meio: true, max_sabores: 4)
```

## 💻 **IMPLEMENTAÇÃO NO FRONTEND**

### **1. Interface de Seleção de Pizza:**

```typescript
interface PizzaSelector {
  // 1. Selecionar tamanho (obrigatório)
  tamanho: string;
  
  // 2. Selecionar sabores (baseado no max_sabores)
  sabores: Array<{
    id: string;
    nome: string;
    porcao: number; // 50% para meio a meio, 100% para pizza inteira
  }>;
  
  // 3. Selecionar borda (opcional)
  borda?: string;
  
  // 4. Adicionais extras (opcional)
  adicionais: Array<{
    id: string;
    nome: string;
    quantidade: number;
  }>;
}
```

### **2. Componente PizzaBuilder:**

```typescript
const PizzaBuilder: React.FC = () => {
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState<string>('');
  const [saboresSelecionados, setSaboresSelecionados] = useState<Sabor[]>([]);
  const [bordaSelecionada, setBordaSelecionada] = useState<string>('');
  
  const calcularPreco = () => {
    let precoBase = variacaoSelecionada.preco;
    let precoBorda = bordaSelecionada ? borda.preco : 0;
    let precoAdicionais = adicionais.reduce((sum, item) => sum + item.preco, 0);
    
    return precoBase + precoBorda + precoAdicionais;
  };
  
  return (
    <div className="pizza-builder">
      {/* Seleção de Tamanho */}
      <TamanhoSelector />
      
      {/* Seleção de Sabores */}
      <SaboresSelector maxSabores={variacaoSelecionada.max_sabores} />
      
      {/* Seleção de Borda */}
      <BordaSelector />
      
      {/* Resumo e Preço */}
      <PizzaResumo preco={calcularPreco()} />
    </div>
  );
};
```

## 🛒 **FLUXO NO PDV**

### **1. Adicionar Pizza ao Carrinho:**

```typescript
const adicionarPizzaAoCarrinho = async (pizzaConfig: PizzaConfig) => {
  // 1. Criar item principal (variação da pizza)
  const itemPrincipal = {
    produto_id: pizzaConfig.variacao_id,
    nome_produto: `Pizza ${pizzaConfig.tamanho}`,
    quantidade: 1,
    valor_unitario: pizzaConfig.variacao.preco,
    observacao_item: gerarDescricaoPizza(pizzaConfig)
  };
  
  // 2. Adicionar sabores como observação ou itens adicionais
  const descricaoSabores = pizzaConfig.sabores
    .map(s => `${s.porcao}% ${s.nome}`)
    .join(', ');
  
  // 3. Adicionar borda como item adicional (se selecionada)
  const itensAdicionais = [];
  if (pizzaConfig.borda) {
    itensAdicionais.push({
      item_adicional_id: pizzaConfig.borda.id,
      nome_adicional: pizzaConfig.borda.nome,
      valor_unitario: pizzaConfig.borda.preco,
      quantidade: 1
    });
  }
  
  // 4. Salvar no banco
  await salvarItemPDV(itemPrincipal, itensAdicionais);
};
```

### **2. Exibição no Carrinho:**

```
🍕 Pizza Média                           R$ 35,00
   Sabores: 50% Calabresa, 50% Margherita
   Borda: Catupiry                       R$ 5,00
   ────────────────────────────────────────────
   Total:                                R$ 40,00
```

## 📱 **INTERFACE DO USUÁRIO**

### **1. Seletor de Tamanho:**
```
┌─────────────────────────────────────┐
│ 🍕 ESCOLHA O TAMANHO                │
├─────────────────────────────────────┤
│ ○ Pequena (25cm)        R$ 25,00   │
│ ● Média (30cm)          R$ 35,00   │
│ ○ Grande (35cm)         R$ 45,00   │
│ ○ Família (40cm)        R$ 55,00   │
└─────────────────────────────────────┘
```

### **2. Seletor de Sabores (Meio a Meio):**
```
┌─────────────────────────────────────┐
│ 🧀 ESCOLHA OS SABORES (máx: 2)      │
├─────────────────────────────────────┤
│ ☑ Calabresa            50% │ 50%   │
│ ☑ Margherita           50% │ 50%   │
│ ☐ Portuguesa               │       │
│ ☐ Frango c/ Catupiry       │       │
└─────────────────────────────────────┘
```

### **3. Seletor de Borda:**
```
┌─────────────────────────────────────┐
│ 🥖 ESCOLHA A BORDA                  │
├─────────────────────────────────────┤
│ ● Tradicional           R$ 0,00    │
│ ○ Catupiry              R$ 5,00    │
│ ○ Cheddar               R$ 6,00    │
│ ○ Chocolate             R$ 8,00    │
└─────────────────────────────────────┘
```

## 🎨 **VANTAGENS DESTA ABORDAGEM**

### **✅ Flexibilidade Total:**
- Suporta qualquer combinação de sabores
- Permite configurar regras por tamanho
- Fácil adição de novos tamanhos/sabores

### **✅ Compatibilidade NFe:**
- Cada variação tem NCM/CFOP próprio
- Controle fiscal adequado
- Relatórios detalhados

### **✅ Experiência do Usuário:**
- Interface intuitiva
- Visualização clara do preço
- Resumo detalhado da pizza

### **✅ Gestão Simplificada:**
- Aproveitamento do sistema existente
- Configuração via interface admin
- Relatórios de vendas por sabor/tamanho

## 🚀 **PRÓXIMOS PASSOS**

1. **Criar migrações do banco de dados**
2. **Implementar interface de configuração**
3. **Desenvolver componente PizzaBuilder**
4. **Integrar com o PDV existente**
5. **Testes e validação**

Esta solução oferece a flexibilidade de uma pizzaria profissional mantendo a simplicidade do sistema atual!
