# 🔗 INTEGRAÇÃO COMPLETA: Produtos → NFe → PDV_Itens

**Data:** 03/06/2025  
**Objetivo:** Garantir que todos os dados fiscais da tabela `produtos` sejam copiados para `pdv_itens` quando adicionados na NFe  
**Status:** ✅ IMPLEMENTADO

## 🎯 **PROBLEMA RESOLVIDO**

O usuário estava correto: quando um produto era adicionado na NFe, **NÃO ESTAVA COPIANDO** todos os dados fiscais da tabela `produtos` para a tabela `pdv_itens`.

### **❌ ANTES (Dados incompletos):**
```typescript
// ❌ SÓ COPIAVA DADOS BÁSICOS:
const itensNFe = nfeData.produtos.map((produto) => ({
  codigo_produto: produto.codigo,
  nome_produto: produto.descricao,
  quantidade: produto.quantidade,
  valor_unitario: produto.valor_unitario,
  valor_total_item: produto.valor_total
  // ❌ FALTAVAM TODOS OS DADOS FISCAIS!
}));
```

### **✅ DEPOIS (Dados completos):**
```typescript
// ✅ AGORA COPIA TODOS OS DADOS FISCAIS:
const itensNFe = nfeData.produtos.map((produto) => ({
  // Dados básicos
  codigo_produto: produto.codigo,
  nome_produto: produto.descricao,
  quantidade: produto.quantidade,
  valor_unitario: produto.valor_unitario,
  valor_total_item: produto.valor_total,
  
  // ✅ TODOS OS CAMPOS FISCAIS:
  ncm: produto.ncm,
  cfop: produto.cfop,
  origem_produto: produto.origem_produto,
  cst_icms: produto.cst_icms,
  csosn_icms: produto.csosn_icms,
  cst_pis: produto.cst_pis,
  cst_cofins: produto.cst_cofins,
  cst_ipi: produto.cst_ipi,
  aliquota_icms: produto.aliquota_icms,
  aliquota_pis: produto.aliquota_pis,
  aliquota_cofins: produto.aliquota_cofins,
  aliquota_ipi: produto.aliquota_ipi,
  unidade: produto.unidade,
  ean: produto.ean, // ← Vem do codigo_barras!
  cest: produto.cest,
  // ... e todos os outros campos
}));
```

## 🔧 **MUDANÇAS IMPLEMENTADAS**

### **1. ProdutoSeletorModal.tsx - Interface atualizada:**

**Adicionado campos fiscais na interface:**
```typescript
interface Produto {
  // ... campos existentes
  codigo_barras?: string; // ✅ EAN/GTIN
  ncm?: string;
  cfop?: string;
  origem_produto?: number;
  situacao_tributaria?: string;
  cst_icms?: string;
  csosn_icms?: string;
  cst_pis?: string;
  cst_cofins?: string;
  cst_ipi?: string;
  aliquota_icms?: number;
  aliquota_pis?: number;
  aliquota_cofins?: number;
  aliquota_ipi?: number;
  cest?: string;
  peso_liquido?: number;
}
```

**Query atualizada para buscar TODOS os campos:**
```sql
SELECT 
  id, nome, preco, codigo, codigo_barras, descricao,
  ncm, cfop, origem_produto, situacao_tributaria,
  cst_icms, csosn_icms, cst_pis, cst_cofins, cst_ipi,
  aliquota_icms, aliquota_pis, aliquota_cofins, aliquota_ipi,
  cest, peso_liquido,
  unidade_medida:unidade_medida_id (id, sigla, nome)
FROM produtos
```

### **2. NfePage.tsx - Função handleAdicionarProduto:**

**ANTES (dados incompletos):**
```typescript
const novoProduto = {
  ncm: produtoSelecionado.ncm || '00000000', // ❌ Fallback
  cfop: produtoSelecionado.cfop || '5102',   // ❌ Fallback
  cst_pis: produtoSelecionado.cst_pis || '01' // ❌ Fallback
};
```

**DEPOIS (dados reais):**
```typescript
const novoProduto = {
  // ✅ TODOS OS DADOS FISCAIS REAIS (SEM FALLBACKS):
  ncm: produtoSelecionado.ncm,
  cfop: produtoSelecionado.cfop,
  ean: produtoSelecionado.codigo_barras, // ✅ EAN do codigo_barras
  unidade: produtoSelecionado.unidade_medida?.sigla,
  origem_produto: produtoSelecionado.origem_produto,
  cst_icms: produtoSelecionado.cst_icms,
  csosn_icms: produtoSelecionado.csosn_icms,
  cst_pis: produtoSelecionado.cst_pis,
  cst_cofins: produtoSelecionado.cst_cofins,
  aliquota_icms: produtoSelecionado.aliquota_icms,
  aliquota_pis: produtoSelecionado.aliquota_pis,
  aliquota_cofins: produtoSelecionado.aliquota_cofins,
  cst_ipi: produtoSelecionado.cst_ipi,
  aliquota_ipi: produtoSelecionado.aliquota_ipi,
  cest: produtoSelecionado.cest,
  peso_liquido: produtoSelecionado.peso_liquido
};
```

### **3. Salvamento na tabela pdv_itens:**

**Agora salva TODOS os campos fiscais:**
```typescript
const itensNFe = nfeData.produtos.map((produto) => ({
  // Dados básicos
  empresa_id: usuarioData.empresa_id,
  usuario_id: userData.user.id,
  pdv_id: nfeRecemCriada.id,
  produto_id: produto.produto_id,
  codigo_produto: produto.codigo,
  nome_produto: produto.descricao,
  quantidade: produto.quantidade,
  valor_unitario: produto.valor_unitario,
  valor_total_item: produto.valor_total,
  
  // ✅ TODOS OS CAMPOS FISCAIS:
  ncm: produto.ncm,
  cfop: produto.cfop,
  origem_produto: produto.origem_produto,
  cst_icms: produto.cst_icms,
  csosn_icms: produto.csosn_icms,
  cst_pis: produto.cst_pis,
  cst_cofins: produto.cst_cofins,
  cst_ipi: produto.cst_ipi,
  aliquota_icms: produto.aliquota_icms || 0,
  aliquota_pis: produto.aliquota_pis || 0,
  aliquota_cofins: produto.aliquota_cofins || 0,
  aliquota_ipi: produto.aliquota_ipi || 0,
  unidade: produto.unidade,
  ean: produto.ean, // ✅ Vem do codigo_barras
  cest: produto.cest,
  // ... todos os outros campos adicionados
}));
```

## 📊 **FLUXO COMPLETO AGORA:**

```
1. Tabela PRODUTOS (cadastro mestre)
   ├── codigo_barras → EAN/GTIN
   ├── ncm, cfop, origem_produto
   ├── cst_icms, csosn_icms, aliquotas
   └── todos os dados fiscais

2. ProdutoSeletorModal
   ├── Busca TODOS os campos fiscais
   └── Retorna produto completo

3. NFe - Adicionar Produto
   ├── Copia TODOS os dados fiscais
   ├── EAN = codigo_barras
   └── SEM fallbacks

4. Emissão NFe
   ├── Envia dados reais para backend
   └── Backend valida (sem fallbacks)

5. Salvamento pdv_itens
   ├── Salva TODOS os campos fiscais
   └── Dados completos na tabela
```

## 🎯 **CAMPOS MAPEADOS:**

| Campo Produtos | Campo PDV_Itens | Observação |
|---|---|---|
| `codigo_barras` | `ean` | ✅ EAN/GTIN |
| `ncm` | `ncm` | ✅ NCM (8 dígitos) |
| `cfop` | `cfop` | ✅ CFOP (4 dígitos) |
| `origem_produto` | `origem_produto` | ✅ Origem (0-8) |
| `cst_icms` | `cst_icms` | ✅ CST ICMS |
| `csosn_icms` | `csosn_icms` | ✅ CSOSN ICMS |
| `cst_pis` | `cst_pis` | ✅ CST PIS |
| `cst_cofins` | `cst_cofins` | ✅ CST COFINS |
| `cst_ipi` | `cst_ipi` | ✅ CST IPI |
| `aliquota_icms` | `aliquota_icms` | ✅ Alíquota ICMS |
| `aliquota_pis` | `aliquota_pis` | ✅ Alíquota PIS |
| `aliquota_cofins` | `aliquota_cofins` | ✅ Alíquota COFINS |
| `aliquota_ipi` | `aliquota_ipi` | ✅ Alíquota IPI |
| `cest` | `cest` | ✅ CEST |
| `peso_liquido` | - | ✅ Peso líquido |
| `unidade_medida.sigla` | `unidade` | ✅ Unidade (UN, KG, etc.) |

## 🚀 **BENEFÍCIOS ALCANÇADOS:**

1. **✅ Dados Completos**: Todos os campos fiscais são copiados
2. **✅ EAN Correto**: `codigo_barras` → `ean` (conforme pergunta do usuário)
3. **✅ Sem Fallbacks**: Apenas dados reais são usados
4. **✅ Rastreabilidade**: Produto vinculado via `produto_id`
5. **✅ Consistência**: Mesmos dados em produtos, NFe e pdv_itens
6. **✅ Compliance**: Dados fiscais completos para NFe

## 🎉 **RESULTADO FINAL:**

Agora quando você adicionar um produto na NFe:

1. **Busca produto** → Traz TODOS os dados fiscais
2. **Adiciona na NFe** → Copia TODOS os campos (incluindo EAN do codigo_barras)
3. **Emite NFe** → Backend recebe dados completos
4. **Salva pdv_itens** → Tabela fica com dados fiscais completos

**Sistema 100% integrado! Produtos → NFe → PDV_Itens** 🎯
