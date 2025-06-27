# 📋 Implementação: Venda sem Produto no PDV

## 🎯 Resumo da Funcionalidade

Implementada funcionalidade **"Venda sem Produto"** no PDV que permite realizar vendas de serviços ou itens não cadastrados, adicionando valores diretos ao carrinho sem necessidade de produtos específicos.

## 🔧 Implementações Realizadas

### **1. Banco de Dados**
- ✅ Campo `venda_sem_produto` adicionado na tabela `pdv_config` (BOOLEAN DEFAULT FALSE)
- ✅ Campo `venda_sem_produto_ncm` (VARCHAR(8) DEFAULT '22021000')
- ✅ Campo `venda_sem_produto_cfop` (VARCHAR(4) DEFAULT '5102')
- ✅ Campo `venda_sem_produto_origem` (INTEGER DEFAULT 0)
- ✅ **NOVO**: Campo `venda_sem_produto_situacao_tributaria` (VARCHAR(50) DEFAULT 'tributado_integral')
- ✅ **NOVO**: Campo `venda_sem_produto_cest` (VARCHAR(7) DEFAULT '')
- ✅ **NOVO**: Campo `venda_sem_produto_margem_st` (NUMERIC DEFAULT NULL)
- ✅ Migrações executadas com valores padrão configurados

### **2. Interface de Configuração**
- ✅ Nova aba dedicada "Venda sem Produto" nas configurações PDV
- ✅ Checkbox "Habilitar Venda sem Produto" com descrição explicativa
- ✅ Informações detalhadas sobre funcionamento e casos de uso
- ✅ Status visual da funcionalidade (ativa/desativada)
- ✅ **NOVO**: Seção completa de configurações fiscais
- ✅ **NOVO**: Campos NCM, CFOP e Origem com validações
- ✅ Habilitação em tempo real (seguindo padrão das outras configurações)

### **3. Menu PDV**
- ✅ Botão "Venda sem Produto" adicionado como **primeira opção** do menu
- ✅ Tecla de atalho **F0** (primeira posição)
- ✅ Ícone: DollarSign (verde)
- ✅ Visibilidade controlada pela configuração `pdv_config.venda_sem_produto`

### **4. Modal de Venda sem Produto**
- ✅ Interface para inserir descrição e valor
- ✅ Validação de campos obrigatórios
- ✅ Adição automática ao carrinho
- ✅ Feedback visual com toast notifications

### **5. Configurações Fiscais Completas (NOVO)**
- ✅ **Campo NCM**: Validação automática via API local e BrasilAPI
- ✅ **Campo CFOP**: Dropdown pesquisável com CFOPs mais utilizados
- ✅ **Campo Origem**: Select com todas as 9 opções oficiais (0-8)
- ✅ **Campo Situação Tributária**: Baseado no regime da empresa (Simples/Normal)
- ✅ **Campo CEST**: Só aparece para situação tributária ST (com máscara)
- ✅ **Campo Margem ST**: Só aparece para situação tributária ST
- ✅ **Validação em tempo real**: NCM com máscara e feedback visual
- ✅ **Valores padrão**: NCM 22021000, CFOP 5102, Origem 0, Situação Tributado Integral
- ✅ **Interface condicional**: Só aparece quando funcionalidade está ativa
- ✅ **Lógica automática**: CFOP sugere situação tributária automaticamente

## 📊 Estrutura Técnica

### **Arquivos Modificados:**

#### **1. Migração SQL**
```sql
-- supabase/migrations/20250131000000_add_pdv_config_new_options.sql
ALTER TABLE pdv_config ADD COLUMN IF NOT EXISTS venda_sem_produto BOOLEAN DEFAULT FALSE;
```

#### **2. Interface TypeScript**
```typescript
// src/types.ts
export interface PDVConfig {
  // ... outros campos
  venda_sem_produto?: boolean;
}
```

#### **3. Configurações PDV**
```typescript
// src/pages/dashboard/ConfiguracoesPage.tsx
- Estado inicial: venda_sem_produto: false
- Carregamento das configurações
- Salvamento no banco
- Nova aba dedicada "Venda sem Produto"
- Interface visual completa com status e informações
- Tipo de aba atualizado: 'geral' | 'botoes' | 'impressoes' | 'venda-sem-produto'
```

#### **4. PDV Principal**
```typescript
// src/pages/dashboard/PDVPage.tsx
- Novo item no menu (primeira posição)
- Estados para modal: showVendaSemProdutoModal, valorVendaSemProduto, descricaoVendaSemProduto
- Filtro de visibilidade baseado na configuração
- Modal completo com validações
```

#### **5. Cadastro de Empresas**
```typescript
// src/components/cadastro/FormCadastro.tsx
- Valor padrão venda_sem_produto: false na criação de novas empresas
```

## 🎮 Sistema de Teclas de Atalho

### **Mapeamento Atualizado:**
- **F0**: Venda sem Produto (primeira opção)
- **F1**: Produtos
- **F2**: Pedidos
- **F3**: Comandas (se habilitado)
- **F4-F9**: Outras funcionalidades conforme configuração

### **Lógica Implementada:**
```typescript
// Captura F0-F9
if (fNumber === 0) {
  menuIndex = 0; // F0 = primeiro item
} else {
  menuIndex = fNumber; // F1-F9 = índices 1-9
}
```

## 🔄 Fluxo de Funcionamento

### **1. Habilitação**
1. Usuário vai em Configurações → PDV → Aba Geral
2. Marca checkbox "Venda sem produto"
3. Configuração é salva automaticamente
4. Botão aparece imediatamente no PDV (F0)

### **2. Uso no PDV**
1. Pressiona F0 ou clica no botão "Venda sem Produto"
2. Modal abre com campos:
   - **Descrição**: Texto livre (obrigatório)
   - **Valor**: Número decimal (obrigatório, > 0)
3. Clica "Adicionar"
4. Item é adicionado ao carrinho com:
   - `id`: `venda-sem-produto-${timestamp}`
   - `produto_id`: null
   - `nome`: descrição inserida
   - `preco`: valor inserido
   - `quantidade`: 1
   - `vendaSemProduto`: true

### **3. Finalização**
- Item sem produto é tratado normalmente no carrinho
- Pode ser finalizado com qualquer forma de pagamento
- Aparece nos relatórios e movimentos

## ✅ Benefícios Implementados

1. **✅ Flexibilidade** - Permite venda de serviços não cadastrados
2. **✅ Agilidade** - Acesso rápido via F0
3. **✅ Controle** - Habilitação opcional por empresa
4. **✅ Integração** - Funciona com todo o sistema existente
5. **✅ Padrão** - Segue o mesmo padrão das outras configurações PDV

## 🎯 Casos de Uso

- **Serviços**: Consultoria, manutenção, instalação
- **Taxa de entrega**: Valores específicos não cadastrados
- **Produtos únicos**: Itens personalizados ou sob encomenda
- **Ajustes**: Correções de valores ou descontos especiais

## 🔍 Validações Implementadas

- **Descrição**: Não pode estar vazia
- **Valor**: Deve ser numérico e maior que 0
- **Configuração**: Botão só aparece se habilitado
- **Interface**: Feedback visual em tempo real

## 📱 Status Atual

**✅ IMPLEMENTADO E FUNCIONANDO**

- ✅ Configuração PDV funcional
- ✅ Botão F0 no menu PDV
- ✅ Modal de venda sem produto
- ✅ Adição ao carrinho
- ✅ Integração completa com sistema

**🌐 Disponível em:** http://nexodev.emasoftware.app

---

## 🔧 Para Desenvolvedores

### **Padrão Seguido:**
Esta implementação seguiu exatamente o mesmo padrão da funcionalidade "Comandas":

1. **Campo na tabela** `pdv_config`
2. **Interface nas configurações** com checkbox
3. **Filtro no menu PDV** baseado na configuração
4. **Habilitação em tempo real** via eventos
5. **Tecla de atalho** funcional

### **Extensibilidade:**
O sistema pode ser facilmente estendido para:
- Categorias de venda sem produto
- Histórico de itens mais usados
- Templates de descrições
- Integração com contabilidade específica
