-- =====================================================
-- SCRIPT PARA VERIFICAR DADOS DE CONSUMO INTERNO
-- =====================================================

-- 1. Verificar se as tabelas foram criadas
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('consumo_interno', 'consumo_interno_itens')
ORDER BY table_name;

-- 2. Verificar estrutura da tabela consumo_interno
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'consumo_interno'
ORDER BY ordinal_position;

-- 3. Verificar estrutura da tabela consumo_interno_itens
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'consumo_interno_itens'
ORDER BY ordinal_position;

-- 4. Verificar índices criados
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('consumo_interno', 'consumo_interno_itens')
ORDER BY tablename, indexname;

-- 5. Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('consumo_interno', 'consumo_interno_itens')
ORDER BY tablename, policyname;

-- 6. Listar todos os consumos internos (últimos 10)
SELECT 
    ci.id,
    ci.data_consumo,
    ci.observacao,
    ci.total_itens,
    ci.valor_total,
    u.nome as usuario_nome,
    e.nome_fantasia as empresa_nome
FROM consumo_interno ci
LEFT JOIN usuarios u ON ci.usuario_id = u.id
LEFT JOIN empresas e ON ci.empresa_id = e.id
WHERE ci.deletado = FALSE
ORDER BY ci.data_consumo DESC
LIMIT 10;

-- 7. Listar itens dos consumos internos (últimos 20)
SELECT 
    cii.id,
    ci.data_consumo,
    cii.nome_produto,
    cii.codigo_produto,
    cii.quantidade,
    cii.unidade_medida,
    cii.valor_unitario,
    cii.valor_total,
    ci.observacao as observacao_consumo
FROM consumo_interno_itens cii
JOIN consumo_interno ci ON cii.consumo_interno_id = ci.id
WHERE cii.deletado = FALSE
AND ci.deletado = FALSE
ORDER BY ci.data_consumo DESC, cii.created_at DESC
LIMIT 20;

-- 8. Resumo por período (últimos 30 dias)
SELECT 
    DATE(ci.data_consumo) as data,
    COUNT(*) as total_consumos,
    SUM(ci.total_itens) as total_itens_consumidos,
    SUM(ci.valor_total) as valor_total_consumido,
    COUNT(DISTINCT ci.usuario_id) as usuarios_diferentes
FROM consumo_interno ci
WHERE ci.deletado = FALSE
AND ci.data_consumo >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(ci.data_consumo)
ORDER BY data DESC;

-- 9. Produtos mais consumidos (últimos 30 dias)
SELECT 
    cii.nome_produto,
    cii.codigo_produto,
    COUNT(*) as vezes_consumido,
    SUM(cii.quantidade) as quantidade_total,
    cii.unidade_medida,
    AVG(cii.valor_unitario) as valor_medio,
    SUM(cii.valor_total) as valor_total
FROM consumo_interno_itens cii
JOIN consumo_interno ci ON cii.consumo_interno_id = ci.id
WHERE cii.deletado = FALSE
AND ci.deletado = FALSE
AND ci.data_consumo >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY cii.nome_produto, cii.codigo_produto, cii.unidade_medida
ORDER BY quantidade_total DESC
LIMIT 10;

-- 10. Verificar movimentações de estoque relacionadas
SELECT 
    me.id,
    me.created_at,
    me.tipo_movimentacao,
    me.quantidade,
    me.observacao,
    p.nome as produto_nome,
    p.codigo as produto_codigo
FROM movimentacoes_estoque me
JOIN produtos p ON me.produto_id = p.id
WHERE me.observacao ILIKE '%consumo interno%'
OR me.observacao ILIKE '%consumo_interno%'
ORDER BY me.created_at DESC
LIMIT 20;
