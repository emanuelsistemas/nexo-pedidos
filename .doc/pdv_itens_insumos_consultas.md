# 📊 Consultas Úteis - Tabela PDV_ITENS_INSUMOS

## 🎯 **TABELA CRIADA COM SUCESSO**

### **✅ Estrutura Implementada:**
- **Tabela**: `pdv_itens_insumos`
- **Campos**: 17 campos incluindo controle de soft delete
- **Constraints**: 5 constraints de validação
- **Índices**: 10 índices para performance otimizada
- **RLS**: Políticas de segurança multi-tenant configuradas
- **Triggers**: Atualização automática de `updated_at`

---

## 🔍 **CONSULTAS PARA RELATÓRIOS**

### **1. Insumos de uma Venda Específica**
```sql
-- Buscar todos os insumos selecionados em uma venda
SELECT 
  pii.nome_insumo,
  pii.quantidade,
  pii.unidade_medida,
  pii.custo_unitario,
  pii.custo_total,
  pi.nome_produto as produto_principal,
  pi.quantidade as quantidade_produto
FROM pdv_itens_insumos pii
JOIN pdv_itens pi ON pii.pdv_item_id = pi.id
JOIN pdv p ON pi.pdv_id = p.id
WHERE p.numero_venda = 'PDV-2025-001'
  AND p.empresa_id = 'sua-empresa-uuid'
  AND pii.deletado = FALSE
ORDER BY pi.nome_produto, pii.nome_insumo;
```

### **2. Consumo de Insumos por Período**
```sql
-- Relatório de consumo de insumos no mês
SELECT 
  pii.nome_insumo,
  pii.unidade_medida,
  SUM(pii.quantidade) as total_consumido,
  SUM(pii.custo_total) as custo_total,
  COUNT(DISTINCT p.id) as vendas_utilizadas,
  AVG(pii.custo_unitario) as custo_medio_unitario
FROM pdv_itens_insumos pii
JOIN pdv_itens pi ON pii.pdv_item_id = pi.id
JOIN pdv p ON pi.pdv_id = p.id
WHERE p.data_venda >= '2025-01-01'
  AND p.data_venda < '2025-02-01'
  AND p.empresa_id = 'sua-empresa-uuid'
  AND pii.deletado = FALSE
  AND p.status_venda = 'finalizada'
GROUP BY pii.nome_insumo, pii.unidade_medida
ORDER BY total_consumido DESC;
```

### **3. Produtos que Mais Consomem Insumos**
```sql
-- Top 10 produtos que mais consomem insumos (por custo)
SELECT 
  pi.nome_produto,
  COUNT(DISTINCT pii.insumo_produto_id) as tipos_insumos,
  SUM(pii.custo_total) as custo_total_insumos,
  COUNT(DISTINCT p.id) as vendas,
  SUM(pii.custo_total) / COUNT(DISTINCT p.id) as custo_medio_por_venda
FROM pdv_itens_insumos pii
JOIN pdv_itens pi ON pii.pdv_item_id = pi.id
JOIN pdv p ON pi.pdv_id = p.id
WHERE p.data_venda >= CURRENT_DATE - INTERVAL '30 days'
  AND p.empresa_id = 'sua-empresa-uuid'
  AND pii.deletado = FALSE
  AND p.status_venda = 'finalizada'
GROUP BY pi.nome_produto
ORDER BY custo_total_insumos DESC
LIMIT 10;
```

### **4. Análise de Custos por Venda**
```sql
-- Análise detalhada de custos de uma venda
SELECT 
  p.numero_venda,
  p.data_venda,
  p.valor_total as valor_venda,
  pi.nome_produto,
  pi.valor_total_item as valor_item,
  COALESCE(SUM(pii.custo_total), 0) as custo_insumos,
  pi.valor_total_item - COALESCE(SUM(pii.custo_total), 0) as margem_bruta
FROM pdv p
JOIN pdv_itens pi ON p.id = pi.pdv_id
LEFT JOIN pdv_itens_insumos pii ON pi.id = pii.pdv_item_id AND pii.deletado = FALSE
WHERE p.numero_venda = 'PDV-2025-001'
  AND p.empresa_id = 'sua-empresa-uuid'
GROUP BY p.id, p.numero_venda, p.data_venda, p.valor_total, pi.id, pi.nome_produto, pi.valor_total_item
ORDER BY pi.nome_produto;
```

### **5. Insumos Mais Utilizados**
```sql
-- Ranking dos insumos mais utilizados
SELECT 
  pii.nome_insumo,
  pii.unidade_medida,
  COUNT(*) as vezes_utilizado,
  SUM(pii.quantidade) as quantidade_total,
  AVG(pii.quantidade) as quantidade_media,
  SUM(pii.custo_total) as custo_total,
  AVG(pii.custo_unitario) as custo_medio_unitario
FROM pdv_itens_insumos pii
JOIN pdv_itens pi ON pii.pdv_item_id = pi.id
JOIN pdv p ON pi.pdv_id = p.id
WHERE p.data_venda >= CURRENT_DATE - INTERVAL '30 days'
  AND p.empresa_id = 'sua-empresa-uuid'
  AND pii.deletado = FALSE
  AND p.status_venda = 'finalizada'
GROUP BY pii.nome_insumo, pii.unidade_medida
ORDER BY vezes_utilizado DESC, quantidade_total DESC;
```

---

## 🔧 **INTEGRAÇÃO COM O PDV**

### **Como Salvar Insumos no PDV:**
```typescript
// Exemplo de como salvar os insumos selecionados
const salvarInsumosVenda = async (
  pdvItemId: string, 
  insumosSelecionados: InsumoSelecionado[],
  empresaId: string,
  usuarioId: string
) => {
  for (const insumo of insumosSelecionados) {
    await supabase.from('pdv_itens_insumos').insert({
      empresa_id: empresaId,
      usuario_id: usuarioId,
      pdv_item_id: pdvItemId,
      insumo_produto_id: insumo.insumo.produto_id,
      nome_insumo: insumo.insumo.nome,
      quantidade: insumo.quantidade,
      unidade_medida: insumo.insumo.unidade_medida,
      custo_unitario: insumo.insumo.preco_custo || 0,
      custo_total: (insumo.insumo.preco_custo || 0) * insumo.quantidade,
      origem_insumo: 'manual'
    });
  }
};
```

### **Como Buscar Insumos de um Item:**
```typescript
// Buscar insumos de um item específico do PDV
const buscarInsumosItem = async (pdvItemId: string) => {
  const { data, error } = await supabase
    .from('pdv_itens_insumos')
    .select(`
      *,
      produto:produtos!insumo_produto_id(
        id,
        nome,
        codigo,
        preco_custo
      )
    `)
    .eq('pdv_item_id', pdvItemId)
    .eq('deletado', false)
    .order('nome_insumo');

  return { data, error };
};
```

---

## 📈 **VANTAGENS DA IMPLEMENTAÇÃO**

### **✅ Rastreabilidade Completa:**
- Histórico de todos os insumos selecionados
- Controle de custos por venda
- Análise de consumo por período

### **✅ Performance Otimizada:**
- Índices específicos para consultas frequentes
- Consultas rápidas com JOINs otimizados
- Suporte a grandes volumes de dados

### **✅ Segurança Multi-Tenant:**
- RLS configurado para isolamento por empresa
- Políticas de acesso granulares
- Auditoria completa com soft delete

### **✅ Flexibilidade:**
- Suporte a importação de pedidos (futuro)
- Extensível para novas funcionalidades
- Integração fácil com relatórios

---

## 🚀 **PRÓXIMOS PASSOS**

1. **Integrar com o PDV** - Modificar a finalização de vendas
2. **Criar relatórios** - Implementar telas de análise
3. **Dashboard de custos** - Visualização gráfica
4. **Alertas de consumo** - Notificações automáticas

**A tabela está 100% pronta para uso!** 🎉
