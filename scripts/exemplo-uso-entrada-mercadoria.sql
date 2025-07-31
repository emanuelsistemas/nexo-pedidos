-- Exemplo de uso das tabelas de entrada de mercadoria
-- Este script demonstra como inserir e consultar dados

-- =====================================================
-- EXEMPLO 1: ENTRADA MANUAL SIMPLES
-- =====================================================

-- Inserir uma entrada de mercadoria manual
INSERT INTO entrada_mercadoria (
  numero,
  empresa_id,
  usuario_id,
  fornecedor_id,
  fornecedor_nome,
  fornecedor_documento,
  tipo_entrada,
  numero_documento,
  tipo_documento,
  data_documento,
  data_entrada,
  valor_frete,
  valor_seguro,
  valor_outras_despesas,
  valor_desconto,
  status,
  observacoes
) VALUES (
  '000001',
  '11111111-1111-1111-1111-111111111111'::UUID, -- empresa_id (substitua pelo real)
  '22222222-2222-2222-2222-222222222222'::UUID, -- usuario_id (substitua pelo real)
  '33333333-3333-3333-3333-333333333333'::UUID, -- fornecedor_id (substitua pelo real)
  'Fornecedor ABC Ltda',
  '12.345.678/0001-90',
  'manual',
  'NFE-12345',
  'nfe',
  '2025-01-30',
  '2025-01-31',
  50.00,
  25.00,
  10.00,
  15.00,
  'rascunho',
  'Entrada de produtos diversos para estoque'
);

-- Obter o ID da entrada criada (para usar nos itens)
-- Em uma aplicação real, você usaria RETURNING id na query acima
-- SELECT id FROM entrada_mercadoria WHERE numero = '000001' AND empresa_id = '11111111-1111-1111-1111-111111111111';

-- Inserir itens da entrada
INSERT INTO entrada_mercadoria_itens (
  entrada_mercadoria_id,
  empresa_id,
  produto_id,
  codigo_produto,
  nome_produto,
  unidade_medida,
  quantidade,
  preco_unitario,
  preco_total,
  ncm,
  cfop,
  cst,
  atualizar_estoque,
  observacoes
) VALUES 
-- Item 1
(
  (SELECT id FROM entrada_mercadoria WHERE numero = '000001' LIMIT 1),
  '11111111-1111-1111-1111-111111111111'::UUID,
  '44444444-4444-4444-4444-444444444444'::UUID, -- produto_id (substitua pelo real)
  'PROD001',
  'Produto Teste 1',
  'UN',
  10.0000,
  25.50,
  255.00,
  '12345678',
  '5102',
  '000',
  true,
  'Item principal da entrada'
),
-- Item 2
(
  (SELECT id FROM entrada_mercadoria WHERE numero = '000001' LIMIT 1),
  '11111111-1111-1111-1111-111111111111'::UUID,
  NULL, -- produto não cadastrado
  'PROD002',
  'Produto Novo Não Cadastrado',
  'KG',
  5.5000,
  12.00,
  66.00,
  '87654321',
  '5102',
  '000',
  false, -- não atualizar estoque pois produto não existe
  'Produto novo que será cadastrado depois'
);

-- =====================================================
-- EXEMPLO 2: CONSULTAS ÚTEIS
-- =====================================================

-- Consultar entrada com seus itens
SELECT 
  em.numero,
  em.fornecedor_nome,
  em.data_entrada,
  em.status,
  em.valor_total,
  COUNT(emi.id) as total_itens,
  SUM(emi.quantidade) as total_quantidade
FROM entrada_mercadoria em
LEFT JOIN entrada_mercadoria_itens emi ON em.id = emi.entrada_mercadoria_id
WHERE em.empresa_id = '11111111-1111-1111-1111-111111111111'
  AND em.deletado = FALSE
GROUP BY em.id, em.numero, em.fornecedor_nome, em.data_entrada, em.status, em.valor_total
ORDER BY em.created_at DESC;

-- Consultar itens de uma entrada específica
SELECT 
  emi.codigo_produto,
  emi.nome_produto,
  emi.quantidade,
  emi.preco_unitario,
  emi.preco_total,
  emi.unidade_medida,
  emi.atualizar_estoque,
  emi.estoque_atualizado,
  p.nome as produto_cadastrado_nome
FROM entrada_mercadoria_itens emi
LEFT JOIN produtos p ON emi.produto_id = p.id
WHERE emi.entrada_mercadoria_id = (
  SELECT id FROM entrada_mercadoria WHERE numero = '000001' LIMIT 1
)
  AND emi.deletado = FALSE
ORDER BY emi.created_at;

-- =====================================================
-- EXEMPLO 3: ATUALIZAR STATUS DA ENTRADA
-- =====================================================

-- Alterar status de rascunho para pendente
UPDATE entrada_mercadoria 
SET 
  status = 'pendente',
  updated_at = NOW()
WHERE numero = '000001' 
  AND empresa_id = '11111111-1111-1111-1111-111111111111'
  AND status = 'rascunho';

-- Processar entrada (alterar para processada)
UPDATE entrada_mercadoria 
SET 
  status = 'processada',
  processada_em = NOW(),
  processada_por_usuario_id = '22222222-2222-2222-2222-222222222222'::UUID,
  updated_at = NOW()
WHERE numero = '000001' 
  AND empresa_id = '11111111-1111-1111-1111-111111111111'
  AND status = 'pendente';

-- =====================================================
-- EXEMPLO 4: RELATÓRIOS E CONSULTAS AVANÇADAS
-- =====================================================

-- Entradas por status nos últimos 30 dias
SELECT 
  status,
  COUNT(*) as quantidade,
  SUM(valor_total) as valor_total
FROM entrada_mercadoria
WHERE empresa_id = '11111111-1111-1111-1111-111111111111'
  AND created_at >= NOW() - INTERVAL '30 days'
  AND deletado = FALSE
GROUP BY status
ORDER BY status;

-- Top 10 produtos mais recebidos
SELECT 
  emi.codigo_produto,
  emi.nome_produto,
  COUNT(*) as vezes_recebido,
  SUM(emi.quantidade) as quantidade_total,
  SUM(emi.preco_total) as valor_total
FROM entrada_mercadoria_itens emi
JOIN entrada_mercadoria em ON emi.entrada_mercadoria_id = em.id
WHERE em.empresa_id = '11111111-1111-1111-1111-111111111111'
  AND em.status = 'processada'
  AND em.created_at >= NOW() - INTERVAL '90 days'
  AND emi.deletado = FALSE
  AND em.deletado = FALSE
GROUP BY emi.codigo_produto, emi.nome_produto
ORDER BY quantidade_total DESC
LIMIT 10;

-- Entradas por fornecedor
SELECT 
  em.fornecedor_nome,
  COUNT(*) as total_entradas,
  SUM(em.valor_total) as valor_total,
  AVG(em.valor_total) as valor_medio
FROM entrada_mercadoria em
WHERE em.empresa_id = '11111111-1111-1111-1111-111111111111'
  AND em.status = 'processada'
  AND em.deletado = FALSE
GROUP BY em.fornecedor_nome
ORDER BY valor_total DESC;

-- =====================================================
-- EXEMPLO 5: TESTAR FUNÇÕES AUXILIARES
-- =====================================================

-- Gerar próximo número de entrada
SELECT get_proximo_numero_entrada_mercadoria('11111111-1111-1111-1111-111111111111'::UUID) as proximo_numero;

-- Recalcular valor total de uma entrada
SELECT calcular_valor_total_entrada_mercadoria(
  (SELECT id FROM entrada_mercadoria WHERE numero = '000001' LIMIT 1)
) as valor_recalculado;

-- =====================================================
-- EXEMPLO 6: LIMPEZA (OPCIONAL)
-- =====================================================

-- Remover dados de exemplo (descomente se quiser limpar)
-- DELETE FROM entrada_mercadoria_itens WHERE entrada_mercadoria_id IN (
--   SELECT id FROM entrada_mercadoria WHERE numero = '000001'
-- );
-- DELETE FROM entrada_mercadoria WHERE numero = '000001';
