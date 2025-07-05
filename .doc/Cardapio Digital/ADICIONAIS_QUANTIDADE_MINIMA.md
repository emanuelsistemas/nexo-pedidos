# Sistema de Adicionais com Quantidade Mínima - Cardápio Digital

## 📋 **VISÃO GERAL**

Implementação do sistema de validação de quantidade mínima para adicionais no cardápio digital, similar ao modal de opções adicionais do PDV. O sistema garante que apenas adicionais que atingiram a quantidade mínima sejam incluídos no carrinho.

## 🎯 **FUNCIONALIDADES IMPLEMENTADAS**

### **1. Validação de Quantidade Mínima**
- **Campo**: `quantidade_minima` na tabela `opcoes_adicionais`
- **Comportamento**: Adicionais só vão para o carrinho quando atingem a quantidade mínima
- **Contador Local**: Adicionais ficam no contador visual mas não são enviados ao WhatsApp até atingir o mínimo

### **2. Indicadores Visuais**
- **Contador Atual/Mínima**: Exibe "1/2" (atual/mínima) até atingir o mínimo
- **Check de Confirmação**: Mostra ✓ quando a quantidade mínima é atingida
- **Cores Dinâmicas**:
  - 🟡 **Amarelo**: Quando não atingiu a quantidade mínima
  - 🟢 **Verde**: Quando atingiu a quantidade mínima + ícone ✓

### **3. Lógica de Carrinho**
- **Filtragem Inteligente**: Apenas adicionais de opções que atingiram quantidade mínima vão para o carrinho
- **Validação por Grupo**: Cada opção de adicional é validada independentemente
- **Mensagem WhatsApp**: Só inclui adicionais válidos na mensagem final

## 🔧 **IMPLEMENTAÇÃO TÉCNICA**

### **Funções Principais Adicionadas**

```typescript
// Obter quantidade total selecionada de uma opção
const obterQuantidadeTotalOpcao = (produtoId: string, opcaoId: string): number

// Verificar se uma opção atingiu a quantidade mínima
const opcaoAtingiuMinimo = (produtoId: string, opcaoId: string): boolean

// Obter adicionais válidos para o carrinho (apenas os que atingiram quantidade mínima)
const obterAdicionaisValidosParaCarrinho = (produtoId: string): Array<{...}>
```

### **Estrutura de Dados Atualizada**

```typescript
interface Produto {
  opcoes_adicionais?: Array<{
    id: string;
    nome: string;
    quantidade_minima?: number; // ← NOVO CAMPO
    itens: Array<{
      id: string;
      nome: string;
      preco: number;
    }>;
  }>;
}
```

### **Query Supabase Atualizada**

```sql
SELECT 
  produto_id,
  opcoes_adicionais!inner (
    id,
    nome,
    quantidade_minima, -- ← CAMPO ADICIONADO
    opcoes_adicionais_itens (
      id,
      nome,
      preco
    )
  )
FROM produtos_opcoes_adicionais
```

## 🎨 **INTERFACE VISUAL**

### **Indicador de Quantidade Mínima**
```jsx
{opcao.quantidade_minima && opcao.quantidade_minima > 0 && (
  <div className="flex items-center gap-1">
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
      atingiuMinimo
        ? 'bg-green-100 text-green-600 border border-green-300'
        : 'bg-yellow-100 text-yellow-600 border border-yellow-300'
    }`}>
      {quantidadeTotal}/{opcao.quantidade_minima}
    </span>
    {atingiuMinimo && (
      <CheckCircle size={14} className="text-green-600" />
    )}
  </div>
)}
```

### **Estados Visuais**
- **Modo Claro**:
  - 🟡 Não atingiu: `bg-yellow-100 text-yellow-600 border-yellow-300`
  - 🟢 Atingiu: `bg-green-100 text-green-600 border-green-300`

- **Modo Escuro**:
  - 🟡 Não atingiu: `bg-yellow-900/30 text-yellow-400 border-yellow-700`
  - 🟢 Atingiu: `bg-green-900/30 text-green-400 border-green-700`

## 📱 **EXPERIÊNCIA DO USUÁRIO**

### **Fluxo Completo**
1. **Cliente adiciona produto** ao carrinho
2. **Cliente expande opção de adicional** (ex: "Complemento 2")
3. **Sistema mostra indicador** "0/2" (precisa de 2 itens mínimo)
4. **Cliente adiciona 1 item** → indicador muda para "1/2" (amarelo)
5. **Cliente adiciona mais 1 item** → indicador muda para "2/2" + ✓ (verde)
6. **Agora os adicionais vão para o carrinho** e aparecem na mensagem WhatsApp

### **Comportamento Inteligente**
- **Contador sempre funciona**: Cliente pode incrementar/decrementar normalmente
- **Validação no carrinho**: Sistema só inclui no carrinho quando atingir mínimo
- **Feedback visual claro**: Cliente sempre sabe quantos itens faltam
- **Sem bloqueios**: Cliente não é impedido de navegar ou adicionar outros produtos

## 🔄 **INTEGRAÇÃO COM SISTEMA EXISTENTE**

### **Compatibilidade**
- ✅ **Funciona com produtos sem quantidade mínima** (quantidade_minima = 0 ou null)
- ✅ **Mantém comportamento atual** para opções sem restrição
- ✅ **Não quebra funcionalidades existentes**
- ✅ **Suporte a modo claro/escuro**

### **Performance**
- **Cálculos locais**: Validações feitas no frontend sem consultas extras
- **Estado otimizado**: Usa estado existente `adicionaisSelecionados`
- **Renderização eficiente**: Apenas recalcula quando necessário

## 🚀 **DEPLOY E TESTE**

### **Ambiente de Desenvolvimento**
- **URL**: `http://nexodev.emasoftware.app`
- **Branch**: `dev`
- **Status**: ✅ Implementado e deployado

### **Como Testar**
1. Acesse um cardápio digital no ambiente dev
2. Adicione um produto que tenha adicionais com quantidade mínima
3. Expanda a opção de adicional
4. Observe o indicador "0/X" onde X é a quantidade mínima
5. Adicione itens e veja o contador subir
6. Quando atingir o mínimo, aparece o ✓ verde
7. Finalize o pedido e veja que só adicionais válidos vão para o WhatsApp

## 📊 **BENEFÍCIOS**

### **Para o Cliente**
- **Clareza visual**: Sempre sabe quantos itens precisa adicionar
- **Sem surpresas**: Feedback imediato sobre o status da opção
- **Experiência fluida**: Não há bloqueios ou mensagens de erro

### **Para o Estabelecimento**
- **Controle de vendas**: Garante que combos/promoções sejam respeitados
- **Regras de negócio**: Força quantidade mínima sem complicar a UX
- **Consistência**: Mesmo comportamento do PDV no cardápio digital

### **Para o Sistema**
- **Dados consistentes**: Apenas adicionais válidos chegam ao backend
- **Menos erros**: Validação preventiva evita problemas
- **Manutenibilidade**: Código organizado e reutilizável

## 💾 **PERSISTÊNCIA NO LOCALSTORAGE**

### **Dados Salvos Automaticamente**
O sistema agora persiste todos os estados relacionados aos adicionais no localStorage, garantindo que o usuário não perca o progresso ao atualizar a página.

**Chaves do localStorage por empresa:**
```javascript
// Estados persistidos
carrinho_${empresaId}                    // Quantidades dos produtos
carrinho_ordem_${empresaId}              // Ordem de adição dos itens
carrinho_adicionais_${empresaId}         // Adicionais selecionados
carrinho_observacoes_${empresaId}        // Observações dos produtos
carrinho_validacao_minima_${empresaId}   // Status de validação de quantidade mínima
```

### **Funcionalidades de Persistência**

**1. Salvamento Automático:**
- ✅ **Trigger**: Sempre que quantidades, adicionais ou validações mudam
- ✅ **Dados**: Estado completo do carrinho + validações de quantidade mínima
- ✅ **Isolamento**: Dados separados por empresa (multi-tenant)

**2. Carregamento na Inicialização:**
- ✅ **Restaura quantidades**: Produtos no carrinho
- ✅ **Restaura adicionais**: Itens selecionados com quantidades
- ✅ **Restaura validações**: Status de quantidade mínima por opção
- ✅ **Restaura observações**: Notas dos produtos

**3. Limpeza Automática:**
- ✅ **Ao finalizar pedido**: Remove todos os dados do localStorage
- ✅ **Por empresa**: Apenas dados da empresa atual são limpos
- ✅ **Logs detalhados**: Console mostra operações de save/load

### **Implementação Técnica da Persistência**

```typescript
// Estado para validação de quantidade mínima
const [validacaoQuantidadeMinima, setValidacaoQuantidadeMinima] =
  useState<{[produtoId: string]: {[opcaoId: string]: boolean}}>({});

// Função para atualizar validação automaticamente
const atualizarValidacaoQuantidadeMinima = () => {
  const novaValidacao = {};
  produtos.forEach(produto => {
    if (produto.opcoes_adicionais) {
      novaValidacao[produto.id] = {};
      produto.opcoes_adicionais.forEach(opcao => {
        novaValidacao[produto.id][opcao.id] = opcaoAtingiuMinimo(produto.id, opcao.id);
      });
    }
  });
  setValidacaoQuantidadeMinima(novaValidacao);
};

// useEffect para salvar sempre que estados mudarem
useEffect(() => {
  if (empresaId) {
    salvarCarrinhoLocalStorage(quantidadesProdutos);
  }
}, [quantidadesProdutos, adicionaisSelecionados, validacaoQuantidadeMinima, empresaId]);
```

### **Benefícios da Persistência**

**Para o Cliente:**
- 🔄 **Não perde progresso**: Pode atualizar a página sem perder o carrinho
- ✅ **Mantém validações**: Status de quantidade mínima é preservado
- 📱 **Experiência contínua**: Pode fechar e reabrir o navegador
- 🎯 **Estado consistente**: Indicadores visuais corretos após reload

**Para o Sistema:**
- 🛡️ **Dados seguros**: Isolamento por empresa no localStorage
- 📊 **Performance**: Carregamento rápido do estado salvo
- 🔧 **Debugging**: Logs detalhados para troubleshooting
- 🧹 **Limpeza automática**: Remove dados ao finalizar pedido

### **Fluxo Completo com Persistência**

1. **Cliente adiciona produtos e adicionais**
2. **Sistema salva automaticamente no localStorage**
3. **Cliente atualiza a página (F5)**
4. **Sistema carrega estado salvo:**
   - ✅ Produtos no carrinho
   - ✅ Adicionais selecionados
   - ✅ Status de validação de quantidade mínima
   - ✅ Indicadores visuais (1/2, ✓, cores)
5. **Cliente continua de onde parou**
6. **Ao finalizar pedido, localStorage é limpo**

## 🔮 **PRÓXIMAS MELHORIAS**

- **Quantidade máxima**: Implementar limite superior para opções
- **Dependências entre opções**: Opções que dependem de outras
- **Preços dinâmicos**: Desconto quando atingir quantidade mínima
- **Analytics**: Tracking de abandono por não atingir mínimo
- **Backup na nuvem**: Sincronizar carrinho entre dispositivos (opcional)
