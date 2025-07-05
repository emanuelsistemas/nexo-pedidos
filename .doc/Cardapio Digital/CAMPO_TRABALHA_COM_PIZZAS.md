# 🍕 Campo "Trabalha com Pizzas" - Cardápio Digital

## 📋 **RESUMO DA IMPLEMENTAÇÃO**

Implementação do campo "Trabalha com Pizzas" na seção de Configurações Avançadas do Cardápio Digital, permitindo que empresas habilitem funcionalidades específicas para pizzarias.

## 🎯 **OBJETIVO**

Adicionar uma configuração que permita às empresas indicar se trabalham com pizzas, habilitando funcionalidades específicas para pizzarias no cardápio digital.

## 🗄️ **ALTERAÇÕES NO BANCO DE DADOS**

### **Migração Criada**
```sql
-- Arquivo: supabase/migrations/20250705000000_add_trabalha_com_pizzas_cardapio.sql

ALTER TABLE pdv_config 
ADD COLUMN trabalha_com_pizzas BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN pdv_config.trabalha_com_pizzas IS 'Indica se a empresa trabalha com pizzas no cardápio digital';
```

### **Estrutura Atualizada da Tabela `pdv_config`**
```sql
-- Campos relacionados ao Cardápio Digital
cardapio_digital BOOLEAN DEFAULT FALSE           -- Habilita/desabilita cardápio
cardapio_url_personalizada VARCHAR(100) DEFAULT '' -- URL única da empresa
modo_escuro_cardapio BOOLEAN DEFAULT FALSE       -- Tema escuro/claro
cardapio_fotos_minimizadas BOOLEAN DEFAULT FALSE -- Fotos minimizadas
trabalha_com_pizzas BOOLEAN DEFAULT FALSE        -- ✅ NOVO CAMPO
```

## 🔧 **ALTERAÇÕES NO FRONTEND**

### **1. Estado do Componente (ConfiguracoesPage.tsx)**

**Adicionado no estado inicial:**
```typescript
const [pdvConfig, setPdvConfig] = useState({
  // ... outros campos
  trabalha_com_pizzas: false  // ✅ NOVO CAMPO
});
```

**Adicionado no carregamento:**
```typescript
trabalha_com_pizzas: config.trabalha_com_pizzas || false
```

**Adicionado na criação de configuração:**
```typescript
trabalha_com_pizzas: field === 'trabalha_com_pizzas' ? value : false,
```

**Adicionado nos nomes dos campos:**
```typescript
const fieldNames: { [key: string]: string } = {
  // ... outros campos
  trabalha_com_pizzas: 'Trabalha com Pizzas'  // ✅ NOVO CAMPO
};
```

### **2. Interface do Usuário**

**Localização:** Configurações → PDV → Cardápio Digital → Configurações Avançadas

**Código da Interface:**
```tsx
<label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
  <input
    type="checkbox"
    checked={pdvConfig.trabalha_com_pizzas}
    onChange={(e) => handlePdvConfigChange('trabalha_com_pizzas', e.target.checked)}
    className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
    style={{ borderRadius: '50%' }}
  />
  <div>
    <h5 className="text-white font-medium">Trabalha com Pizzas</h5>
    <p className="text-sm text-gray-400 mt-1">
      Habilita funcionalidades específicas para pizzarias no cardápio digital.
    </p>
  </div>
</label>
```

### **3. Cardápio Público (CardapioPublicoPage.tsx)**

**Interface atualizada:**
```typescript
interface CardapioConfig {
  mostrar_precos: boolean;
  permitir_pedidos: boolean;
  modo_escuro: boolean;
  mostrar_fotos: boolean;
  cardapio_fotos_minimizadas?: boolean;
  trabalha_com_pizzas?: boolean;  // ✅ NOVO CAMPO
}
```

**Query atualizada:**
```typescript
const { data: pdvConfigData, error: configError } = await supabase
  .from('pdv_config')
  .select('empresa_id, cardapio_url_personalizada, modo_escuro_cardapio, exibir_fotos_itens_cardapio, cardapio_fotos_minimizadas, logo_url, cardapio_digital, trabalha_com_pizzas')  // ✅ CAMPO ADICIONADO
  .eq('cardapio_url_personalizada', slug)
  .single();
```

**Estado atualizado:**
```typescript
setConfig(prev => ({
  ...prev,
  modo_escuro: pdvConfigData.modo_escuro_cardapio || false,
  mostrar_fotos: pdvConfigData.exibir_fotos_itens_cardapio !== false,
  cardapio_fotos_minimizadas: pdvConfigData.cardapio_fotos_minimizadas || false,
  trabalha_com_pizzas: pdvConfigData.trabalha_com_pizzas || false  // ✅ NOVO CAMPO
}));
```

## 📱 **EXPERIÊNCIA DO USUÁRIO**

### **Localização do Campo**
1. **Acesso:** Configurações → PDV → Cardápio Digital (aba)
2. **Seção:** Configurações Avançadas
3. **Posição:** Após o campo "Exibir Fotos ao LADO e minimizado nos Itens"

### **Comportamento**
- **Checkbox:** Habilitado/desabilitado com feedback visual
- **Descrição:** "Habilita funcionalidades específicas para pizzarias no cardápio digital"
- **Salvamento:** Automático ao alterar o estado
- **Feedback:** Toast de sucesso "Trabalha com Pizzas habilitada/desabilitada com sucesso!"

## 🔄 **FLUXO COMPLETO**

### **1. Configuração (Admin)**
1. Empresa acessa Configurações → PDV → Cardápio Digital
2. Na seção "Configurações Avançadas", encontra o campo "Trabalha com Pizzas"
3. Habilita/desabilita conforme necessário
4. Sistema salva automaticamente no banco de dados

### **2. Cardápio Público**
1. Sistema carrega a configuração da empresa
2. Campo `trabalha_com_pizzas` fica disponível no estado `config`
3. Funcionalidades específicas para pizzarias podem ser condicionalmente exibidas

### **3. Isolamento Multi-tenant**
- ✅ Campo isolado por empresa_id
- ✅ Configuração independente por empresa
- ✅ Impossível afetar outras empresas

## 🚀 **FUNCIONALIDADES FUTURAS**

Com o campo `trabalha_com_pizzas` disponível, podem ser implementadas:

### **Funcionalidades Específicas para Pizzarias**
- **Seletor de Sabores:** Modal para escolher múltiplos sabores
- **Tamanhos de Pizza:** P, M, G com preços diferentes
- **Bordas Especiais:** Catupiry, cheddar, etc.
- **Metades Diferentes:** Sabores diferentes em cada metade
- **Calculadora de Preços:** Baseada em sabores e tamanhos
- **Layout Especializado:** Interface otimizada para pizzas

### **Exemplo de Uso Futuro**
```typescript
// No CardapioPublicoPage.tsx
{config.trabalha_com_pizzas && (
  <PizzaCustomizationModal 
    produto={produto}
    onAddToCart={adicionarAoCarrinho}
  />
)}
```

## 📊 **STATUS DA IMPLEMENTAÇÃO**

- ✅ **Migração do banco:** Executada com sucesso
- ✅ **Backend:** Campo adicionado na tabela pdv_config
- ✅ **Frontend - Configurações:** Interface implementada
- ✅ **Frontend - Cardápio:** Campo disponível no estado
- ✅ **Deploy:** Implementação deployada no ambiente dev
- ✅ **Testes:** Campo funcional e salvando corretamente

## 🧪 **COMO TESTAR**

### **Ambiente de Desenvolvimento**
1. Acesse: `http://nexodev.emasoftware.app`
2. Faça login como administrador
3. Vá para: Configurações → PDV → Cardápio Digital
4. Na seção "Configurações Avançadas", encontre "Trabalha com Pizzas"
5. Habilite/desabilite e verifique o toast de sucesso
6. Acesse o cardápio digital da empresa e verifique se o campo está disponível

### **Verificação no Banco**
```sql
-- Verificar se o campo foi criado
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'pdv_config' 
  AND column_name = 'trabalha_com_pizzas';

-- Verificar valores salvos
SELECT empresa_id, trabalha_com_pizzas 
FROM pdv_config 
WHERE trabalha_com_pizzas = true;
```

## 📝 **PRÓXIMOS PASSOS**

1. **Implementar funcionalidades específicas** baseadas no campo
2. **Criar componentes de pizzaria** (seletor de sabores, tamanhos, etc.)
3. **Otimizar interface** para empresas que trabalham com pizzas
4. **Adicionar validações** específicas para produtos de pizzaria
5. **Criar documentação** das funcionalidades de pizzaria

## 🍕 **CAMPO "PIZZA" NO CADASTRO DE PRODUTOS**

### **Implementação Completa**

Com a configuração "Trabalha com Pizzas" ativada, foi implementado um sistema completo de identificação de produtos pizza:

#### **1. Ativação Dinâmica**
- ✅ Campo "Pizza" aparece automaticamente no formulário quando a configuração é ativada
- ✅ Sistema de eventos customizados para atualização em tempo real
- ✅ Não requer recarregamento da página

#### **2. Banco de Dados**
```sql
-- Campo adicionado na tabela produtos
ALTER TABLE produtos
ADD COLUMN IF NOT EXISTS pizza BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN produtos.pizza IS 'Indica se o produto é uma pizza';
```

#### **3. Interface do Usuário**
**Localização:** Produtos → Cadastrar/Editar Produto → Logo após "Produto Ativo"

```tsx
{/* Campo Pizza - Só aparece se a empresa trabalha com pizzas */}
{trabalhaComPizzas && (
  <div className="mb-4">
    <div className="flex items-center">
      <input
        type="checkbox"
        id="pizza"
        checked={novoProduto.pizza || false}
        onChange={(e) => setNovoProduto({ ...novoProduto, pizza: e.target.checked })}
        className="mr-3 rounded border-gray-700 text-primary-500 focus:ring-primary-500/20"
      />
      <label htmlFor="pizza" className="text-sm font-medium text-white cursor-pointer">
        Pizza
      </label>
    </div>
  </div>
)}
```

#### **4. Funcionalidades Implementadas**
- ✅ **Criação:** Campo salvo como TRUE quando marcado
- ✅ **Edição:** Campo atualizado corretamente no banco
- ✅ **Clonagem:** Campo copiado do produto original
- ✅ **Interface TypeScript:** Tipo `Produto` atualizado
- ✅ **Eventos Dinâmicos:** Ativação/desativação em tempo real

#### **5. Fluxo de Funcionamento**
1. **Admin habilita "Trabalha com Pizzas"** nas configurações
2. **Sistema dispara evento** `pizzasChanged`
3. **Página de produtos recebe evento** e atualiza estado
4. **Campo "Pizza" aparece** no formulário automaticamente
5. **Produtos podem ser marcados** como pizza
6. **Campo é salvo** no banco de dados

#### **6. Eventos Customizados**
```typescript
// Configurações - Dispara evento quando altera
window.dispatchEvent(new CustomEvent('pizzasChanged', {
  detail: { trabalhaComPizzas: value }
}));

// Produtos - Escuta evento para atualização
const handlePizzasChange = (event: CustomEvent) => {
  setTrabalhaComPizzas(event.detail.trabalhaComPizzas);
};
window.addEventListener('pizzasChanged', handlePizzasChange);
```

### **Como Testar a Funcionalidade Completa**

#### **Teste 1: Ativação Dinâmica**
1. Acesse Configurações → PDV → Cardápio Digital
2. Habilite "Trabalha com Pizzas"
3. Vá para Produtos → Cadastrar Produto
4. ✅ Campo "Pizza" deve aparecer automaticamente

#### **Teste 2: Cadastro de Pizza**
1. No formulário de produto, marque "Pizza"
2. Preencha os dados e salve
3. ✅ Produto deve ser salvo com `pizza = true`

#### **Teste 3: Edição de Pizza**
1. Edite um produto existente
2. Marque/desmarque "Pizza"
3. Salve as alterações
4. ✅ Campo deve ser atualizado no banco

#### **Teste 4: Clonagem de Pizza**
1. Clone um produto que tem "Pizza" marcado
2. ✅ Produto clonado deve manter "Pizza" ativado

#### **Teste 5: Desativação Dinâmica**
1. Desabilite "Trabalha com Pizzas" nas configurações
2. Vá para Produtos
3. ✅ Campo "Pizza" deve desaparecer automaticamente

### **Verificação no Banco de Dados**
```sql
-- Verificar produtos marcados como pizza
SELECT id, nome, pizza
FROM produtos
WHERE pizza = true;

-- Verificar configuração da empresa
SELECT empresa_id, trabalha_com_pizzas
FROM pdv_config
WHERE trabalha_com_pizzas = true;
```

---

**📅 Data de Implementação:** 05/07/2025
**👨‍💻 Implementado por:** Augment Agent
**🔄 Status:** ✅ Concluído e Funcional
**🌐 Ambiente:** Desenvolvimento (nexodev.emasoftware.app)
**🍕 Funcionalidade:** Campo Pizza implementado com ativação dinâmica
