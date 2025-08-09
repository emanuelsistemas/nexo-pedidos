# 🗑️ SOFT DELETE PDV - RESUMO COMPLETO

## 📋 **STATUS ATUAL**
- ✅ **Soft delete funcionando**: Itens são deletados corretamente no banco
- ✅ **Função de busca implementada**: `atualizarItensCanceladosCaixa()`
- ❌ **Modal não exibe itens**: Seção "Itens Cancelados" sempre vazia

## 🔍 **PROBLEMA IDENTIFICADO**
O soft delete está funcionando (logs confirmam), mas a busca dos itens cancelados no modal do caixa não retorna resultados.

### **Logs Observados:**
```
🗑️ Fazendo soft delete do item: Coca cola Lata
✅ Soft delete concluído com sucesso
🔄 Atualizando lista de itens cancelados do caixa: 861c9089-53a6-48c7-8752-526615dfc2a2
✅ Lista atualizada: 1 itens cancelados  <- Primeiro retorna 1
✅ Lista atualizada: 0 itens cancelados  <- Depois retorna 0
```

## 🏗️ **ESTRUTURA IMPLEMENTADA**

### **1. Banco de Dados**
```sql
-- Campos adicionados à tabela pdv_itens
ALTER TABLE pdv_itens ADD COLUMN deletado BOOLEAN DEFAULT FALSE;
ALTER TABLE pdv_itens ADD COLUMN deletado_em TIMESTAMPTZ;
ALTER TABLE pdv_itens ADD COLUMN deletado_por UUID;
ALTER TABLE pdv_itens ADD COLUMN valor_total_real_deletado NUMERIC(10,2);
ALTER TABLE pdv_itens ADD COLUMN valor_adicionais_deletado NUMERIC(10,2) DEFAULT 0;
ALTER TABLE pdv_itens ADD COLUMN quantidade_adicionais_deletado INTEGER DEFAULT 0;
ALTER TABLE pdv_itens ADD COLUMN valor_insumos_deletado NUMERIC(10,2) DEFAULT 0;
ALTER TABLE pdv_itens ADD COLUMN quantidade_insumos_deletado INTEGER DEFAULT 0;
ALTER TABLE pdv_itens ADD COLUMN snapshot_item_deletado JSONB;
```

### **2. Função de Soft Delete**
**Arquivo:** `src/utils/pdvSoftDeleteUtils.ts`
- ✅ Captura valores completos (produto + adicionais + insumos)
- ✅ Salva snapshot do item
- ✅ Marca `deletado = true`
- ✅ Registra usuário e timestamp

### **3. Integração no PDV**
**Arquivo:** `src/pages/dashboard/PDVPage.tsx`
- ✅ Função `removerDoCarrinho()` chama soft delete
- ✅ Função `atualizarItensCanceladosCaixa()` busca itens deletados
- ✅ Vinculação automática da venda ao caixa

## 🔧 **IMPLEMENTAÇÕES TENTADAS**

### **Tentativa 1: Query com JOIN**
```typescript
const { data } = await supabase
  .from('pdv_itens')
  .select(`
    id, nome_produto, quantidade, valor_total_real_deletado,
    pdv:pdv_id (id, numero_venda, caixa_id)
  `)
  .eq('pdv.caixa_id', caixaId)
  .eq('deletado', true)
```
**Resultado:** Erro 400 - `caixa_id = undefined`

### **Tentativa 2: Busca em Duas Etapas**
```typescript
// 1. Buscar vendas do caixa
const { data: vendas } = await supabase
  .from('pdv')
  .select('id')
  .eq('caixa_id', caixaId);

// 2. Buscar itens deletados das vendas
const { data: itens } = await supabase
  .from('pdv_itens')
  .select('*')
  .in('pdv_id', vendas.map(v => v.id))
  .eq('deletado', true)
```
**Resultado:** Retorna 1 item, depois 0 itens

### **Tentativa 3: Query com INNER JOIN**
```typescript
const { data } = await supabase
  .from('pdv_itens')
  .select(`
    id, nome_produto, quantidade, valor_total_real_deletado,
    pdv:pdv_id!inner (id, numero_venda, caixa_id)
  `)
  .eq('pdv.caixa_id', caixaId)
  .eq('deletado', true)
```
**Resultado:** Ainda não funciona

## 🎯 **PRÓXIMOS PASSOS SUGERIDOS**

### **1. Verificar RLS (Row Level Security)**
```sql
-- Verificar se há políticas RLS bloqueando a consulta
SELECT * FROM pg_policies WHERE tablename = 'pdv_itens';
```

### **2. Testar Query Direta no Supabase**
```sql
-- Testar no SQL Editor do Supabase
SELECT pi.*, p.caixa_id, p.numero_venda
FROM pdv_itens pi
JOIN pdv p ON pi.pdv_id = p.id
WHERE p.caixa_id = '861c9089-53a6-48c7-8752-526615dfc2a2'
  AND pi.deletado = true
  AND pi.valor_total_real_deletado IS NOT NULL;
```

### **3. Verificar Vinculação Venda-Caixa**
```sql
-- Verificar se as vendas estão vinculadas ao caixa
SELECT id, numero_venda, caixa_id, status_venda
FROM pdv
WHERE caixa_id = '861c9089-53a6-48c7-8752-526615dfc2a2';
```

### **4. Debug Detalhado**
Adicionar logs mais específicos na função `atualizarItensCanceladosCaixa()`:
```typescript
console.log('🔍 Buscando com caixaId:', caixaId);
console.log('🔍 Query result:', { data: itensCanceladosData, error: itensCanceladosError });
console.log('🔍 Raw data:', JSON.stringify(itensCanceladosData, null, 2));
```

## 📁 **ARQUIVOS MODIFICADOS**

### **Principais:**
- `src/pages/dashboard/PDVPage.tsx` - Integração do soft delete
- `src/utils/pdvSoftDeleteUtils.ts` - Função de soft delete
- `supabase/migrations/20250809000001_add_soft_delete_to_pdv_itens.sql` - Schema

### **Funções Chave:**
- `removerDoCarrinho()` - Linha ~11440 (chama soft delete)
- `atualizarItensCanceladosCaixa()` - Linha ~11345 (busca itens cancelados)
- `softDeleteItemPDV()` - Arquivo separado (executa soft delete)

## 🚨 **POSSÍVEIS CAUSAS DO PROBLEMA**

1. **RLS Policy** bloqueando consulta com JOIN
2. **Timing Issue** - Estado não sincronizado
3. **Filtro incorreto** na query
4. **Venda não vinculada** ao caixa no momento do soft delete
5. **Cache/Estado** do React não atualizando

## 💡 **SUGESTÃO DE INVESTIGAÇÃO**

1. Testar query SQL diretamente no Supabase Dashboard
2. Verificar se `pdv.caixa_id` está preenchido nas vendas
3. Verificar políticas RLS da tabela `pdv_itens`
4. Adicionar logs detalhados na função de busca
5. Testar sem filtro de caixa (buscar todos os itens deletados)

## 🔍 **COMANDOS PARA DEBUG**

### **1. Verificar Dados no Banco**
```bash
# Conectar ao Supabase e executar:
SELECT pi.id, pi.nome_produto, pi.deletado, pi.valor_total_real_deletado,
       p.id as venda_id, p.caixa_id, p.numero_venda
FROM pdv_itens pi
LEFT JOIN pdv p ON pi.pdv_id = p.id
WHERE pi.deletado = true
ORDER BY pi.deletado_em DESC
LIMIT 10;
```

### **2. Verificar RLS Policies**
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('pdv_itens', 'pdv');
```

### **3. Testar Query Específica**
```sql
-- Substituir pelo ID do caixa real
SELECT pi.*, p.caixa_id
FROM pdv_itens pi
JOIN pdv p ON pi.pdv_id = p.id
WHERE p.caixa_id = '861c9089-53a6-48c7-8752-526615dfc2a2'
  AND pi.deletado = true;
```

## 📝 **CÓDIGO ATUAL DA FUNÇÃO PROBLEMÁTICA**

```typescript
// Localização: src/pages/dashboard/PDVPage.tsx - linha ~11345
const atualizarItensCanceladosCaixa = async () => {
  // ... código de identificação do caixa ...

  const { data: itensCanceladosData, error: itensCanceladosError } = await supabase
    .from('pdv_itens')
    .select(`
      id, nome_produto, quantidade, valor_unitario,
      valor_total_real_deletado, valor_adicionais_deletado,
      quantidade_adicionais_deletado, deletado_em,
      snapshot_item_deletado,
      pdv:pdv_id!inner (id, numero_venda, nome_cliente, caixa_id),
      usuarios:deletado_por (nome)
    `)
    .eq('pdv.caixa_id', caixaId)
    .eq('deletado', true)
    .not('valor_total_real_deletado', 'is', null)
    .order('deletado_em', { ascending: false });
};
```

## 🎯 **TESTE RÁPIDO SUGERIDO**

1. **Remover filtro de caixa temporariamente:**
```typescript
// Testar sem filtro de caixa para ver se retorna algum item
.select('*')
.eq('deletado', true)
.limit(5)
```

2. **Verificar se venda tem caixa_id:**
```typescript
// Antes do soft delete, verificar:
console.log('Venda em andamento:', vendaEmAndamento);
const { data: vendaCheck } = await supabase
  .from('pdv')
  .select('id, caixa_id, numero_venda')
  .eq('id', vendaEmAndamento.id)
  .single();
console.log('Venda no banco:', vendaCheck);
```

---
**Data:** 2025-08-09
**Status:** Soft delete implementado, busca com problemas
**Próximo:** Investigar query e RLS policies
**Caixa ID Teste:** 861c9089-53a6-48c7-8752-526615dfc2a2
