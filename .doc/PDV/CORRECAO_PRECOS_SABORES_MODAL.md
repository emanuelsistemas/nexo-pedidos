# 🍕 Correção de Preços no Modal de Sabores - PDV e Cardápio Digital

## 📋 **PROBLEMA IDENTIFICADO**

Os preços dos sabores estavam aparecendo como R$ 0,00 tanto no modal de sabores do PDV quanto no cardápio digital, porque as funções estavam buscando apenas o campo `preco` da tabela `produtos`, ignorando os preços específicos das tabelas de preços.

## 🎯 **CAUSA RAIZ**

### **PDV (SeletorSaboresModal.tsx)**
- Função `carregarSaboresDisponiveis` buscava apenas `produtos.preco`
- Não consultava a tabela `produto_precos` com o ID da tabela de preços
- Usava empresa_id do usuário autenticado

### **Cardápio Digital (CardapioPublicoPage.tsx)**
- Função `carregarSaboresDisponiveis` também buscava apenas `produtos.preco`
- Não consultava a tabela `produto_precos` com o ID da tabela de preços
- Usava empresa_id obtido pelo slug da empresa

## 🔧 **SOLUÇÃO IMPLEMENTADA**

### **1. PDV - SeletorSaboresModal.tsx**

**Adicionada busca de preços da tabela específica:**

```typescript
// ✅ BUSCAR PREÇOS DA TABELA DE PREÇOS ESPECÍFICA
const produtosIds = produtosPizza?.map(p => p.id) || [];
let precosTabela: {[produtoId: string]: number} = {};

if (produtosIds.length > 0 && tabelaPreco?.id) {
  const { data: precosData, error: precosError } = await supabase
    .from('produto_precos')
    .select('produto_id, preco')
    .eq('empresa_id', usuarioData.empresa_id)
    .eq('tabela_preco_id', tabelaPreco.id)
    .in('produto_id', produtosIds)
    .gt('preco', 0); // Apenas preços maiores que 0

  if (!precosError && precosData) {
    precosData.forEach(item => {
      precosTabela[item.produto_id] = item.preco;
    });
  }
}
```

**Processamento dos produtos com preços corretos:**

```typescript
// ✅ PROCESSAR PRODUTOS COM FOTOS E PREÇOS DA TABELA
const produtosComFotos = (produtosPizza || []).map(produto => {
  const foto = fotosData.find(f => f.produto_id === produto.id);
  const precoTabela = precosTabela[produto.id];
  
  return {
    ...produto,
    preco: precoTabela || produto.preco, // Usar preço da tabela se disponível, senão preço padrão
    produto_fotos: foto ? [{
      id: foto.produto_id,
      url: foto.url,
      principal: true
    }] : []
  };
});

// ✅ PROCESSAR PRODUTOS (filtrar apenas os que têm preço > 0)
let sabores = produtosComFotos.filter(produto => produto.preco > 0);
```

### **2. Cardápio Digital - CardapioPublicoPage.tsx**

**Implementação similar, mas usando dados da empresa pelo slug:**

```typescript
// ✅ BUSCAR PREÇOS DA TABELA DE PREÇOS ESPECÍFICA
const produtosIds = produtosPizza?.map(p => p.id) || [];
let precosTabela: {[produtoId: string]: number} = {};

if (produtosIds.length > 0 && dadosModalSabores?.tabelaPreco?.id) {
  const { data: precosData, error: precosError } = await supabase
    .from('produto_precos')
    .select('produto_id, preco')
    .eq('empresa_id', empresa.id)
    .eq('tabela_preco_id', dadosModalSabores.tabelaPreco.id)
    .in('produto_id', produtosIds)
    .gt('preco', 0); // Apenas preços maiores que 0

  if (!precosError && precosData) {
    precosData.forEach(item => {
      precosTabela[item.produto_id] = item.preco;
    });
  }
}
```

## 📊 **DIFERENÇAS ENTRE PDV E CARDÁPIO DIGITAL**

| Aspecto | PDV | Cardápio Digital |
|---------|-----|------------------|
| **Autenticação** | Usuário autenticado | Acesso público por slug |
| **Empresa ID** | `usuarioData.empresa_id` | `empresa.id` (via slug) |
| **Tabela de Preços** | `tabelaPreco.id` | `dadosModalSabores.tabelaPreco.id` |
| **Contexto** | Modal direto | Modal dentro de modal |

## 🔍 **CONSULTAS SQL IMPLEMENTADAS**

### **Busca de Preços:**
```sql
SELECT produto_id, preco 
FROM produto_precos 
WHERE empresa_id = ? 
  AND tabela_preco_id = ? 
  AND produto_id IN (?, ?, ...)
  AND preco > 0
```

### **Busca de Fotos:**
```sql
SELECT produto_id, url, principal 
FROM produto_fotos 
WHERE produto_id IN (?, ?, ...)
  AND principal = true
```

### **Busca de Produtos Pizza:**
```sql
SELECT id, nome, codigo, grupo_id, deletado, ativo, pizza, preco
FROM produtos 
WHERE empresa_id = ? 
  AND ativo = true 
  AND (deletado IS NULL OR deletado = false)
  AND pizza = true
```

## ✅ **RESULTADOS**

### **Antes da Correção:**
- ❌ Todos os sabores mostravam R$ 0,00
- ❌ Preços da tabela de preços ignorados
- ❌ Apenas preço padrão do produto considerado

### **Depois da Correção:**
- ✅ Preços corretos da tabela de preços exibidos
- ✅ Fallback para preço padrão quando não há preço na tabela
- ✅ Filtro automático de produtos sem preço (> 0)
- ✅ Fotos dos sabores funcionando corretamente

## 🔄 **FLUXO DE PRIORIDADE DE PREÇOS**

1. **Primeiro**: Buscar preço na tabela `produto_precos` para a tabela específica
2. **Fallback**: Usar preço padrão da tabela `produtos`
3. **Filtro**: Exibir apenas produtos com preço > 0

## 🚀 **DEPLOY E TESTE**

### **Ambiente de Desenvolvimento**
- **URL**: `http://nexodev.emasoftware.app`
- **Branch**: `dev`
- **Status**: ✅ Implementado e deployado

### **Como Testar**

#### **PDV:**
1. Acesse o PDV no ambiente dev
2. Adicione um produto pizza ao carrinho
3. Clique no produto → "Configurar Sabores"
4. ✅ Verifique se os preços aparecem corretamente

#### **Cardápio Digital:**
1. Acesse um cardápio digital público
2. Selecione um produto pizza com múltiplos sabores
3. Escolha uma tabela de preços
4. ✅ Verifique se os preços dos sabores aparecem corretamente

## 📝 **ARQUIVOS MODIFICADOS**

### **PDV:**
- `src/components/pdv/SeletorSaboresModal.tsx`
  - Adicionada busca de preços da tabela específica
  - Processamento de produtos com preços corretos
  - Filtro de produtos com preço > 0

### **Cardápio Digital:**
- `src/pages/public/CardapioPublicoPage.tsx`
  - Implementação similar para contexto público
  - Uso do ID da empresa via slug
  - Integração com dados do modal de sabores

## 🐛 **CORREÇÃO ADICIONAL - CARDÁPIO DIGITAL**

### **Problema Identificado:**
- Erro: `dadosModalSabores is not defined` no cardápio digital
- Modal de sabores não exibia nenhuma opção de pizza

### **Causa:**
- Função `carregarSaboresDisponiveis` tentava acessar `dadosModalSabores` fora do escopo
- Variável não estava disponível dentro da função

### **Solução Implementada:**

**1. Atualização da assinatura da função:**
```typescript
// ❌ ANTES
const carregarSaboresDisponiveis = async () => {

// ✅ DEPOIS
const carregarSaboresDisponiveis = async (tabelaPrecoParam: TabelaPreco) => {
```

**2. Atualização da chamada da função:**
```typescript
// ❌ ANTES
useEffect(() => {
  if (isOpen) {
    carregarSaboresDisponiveis();
  }
}, [isOpen]);

// ✅ DEPOIS
useEffect(() => {
  if (isOpen && tabelaPreco) {
    carregarSaboresDisponiveis(tabelaPreco);
  }
}, [isOpen, tabelaPreco]);
```

**3. Correção das referências internas:**
```typescript
// ❌ ANTES
.eq('tabela_preco_id', dadosModalSabores.tabelaPreco.id)

// ✅ DEPOIS
.eq('tabela_preco_id', tabelaPrecoParam.id)
```

**4. Remoção do filtro restritivo:**
```typescript
// ❌ ANTES (muito restritivo)
let sabores = produtosComFotos.filter(produto => produto.preco > 0);

// ✅ DEPOIS (permite produtos sem preço na tabela)
let sabores = produtosComFotos;
```

## ✅ **STATUS FINAL**

### **PDV:**
- ✅ Preços corretos exibidos
- ✅ Fotos dos sabores funcionando
- ✅ Busca por empresa_id do usuário autenticado

### **Cardápio Digital:**
- ✅ Erro `dadosModalSabores is not defined` corrigido
- ✅ Sabores de pizza exibidos corretamente
- ✅ Preços da tabela de preços funcionando
- ✅ Fotos dos sabores implementadas
- ✅ Busca por empresa_id via slug público

## 🔮 **MELHORIAS FUTURAS**

- **Cache de preços**: Implementar cache para evitar consultas repetidas
- **Validação de tabelas**: Verificar se tabela de preços está ativa
- **Logs detalhados**: Adicionar logs para debug de preços
- **Performance**: Otimizar consultas com joins

---

**📅 Data de Implementação:** 20/07/2025
**👨‍💻 Implementado por:** Augment Agent
**🔄 Status:** ✅ Concluído e Funcional
**🌐 Ambiente:** Desenvolvimento (nexodev.emasoftware.app)
**🍕 Funcionalidade:** Preços corretos nos modais de sabores PDV e Cardápio Digital
**🐛 Correção Final:** Erro `dadosModalSabores is not defined` resolvido
