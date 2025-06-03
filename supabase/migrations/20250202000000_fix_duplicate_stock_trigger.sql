-- =====================================================
-- CORREÇÃO DO TRIGGER DE ESTOQUE DUPLICADO
-- =====================================================
-- Data: 2025-02-02
-- Descrição: Remove o trigger que estava causando baixa dupla de estoque
--            O trigger estava sendo executado automaticamente quando
--            a função RPC atualizar_estoque_produto registrava movimentações

-- Problema identificado:
-- 1. PDV chama função RPC atualizar_estoque_produto() → Atualiza estoque + registra histórico
-- 2. Trigger é disparado automaticamente → Atualiza estoque NOVAMENTE (baixa dupla!)

-- Remover o trigger que causa duplicação
DROP TRIGGER IF EXISTS trigger_atualizar_estoque_produto ON produto_estoque;

-- Remover a função do trigger que não é mais necessária
DROP FUNCTION IF EXISTS atualizar_estoque_produto() CASCADE;

-- Comentário explicativo
COMMENT ON TABLE produto_estoque IS 'Tabela de histórico de movimentações de estoque. A atualização do campo estoque_atual na tabela produtos é feita pela função RPC atualizar_estoque_produto(p_produto_id, p_quantidade, p_tipo_operacao, p_observacao)';

-- Verificar se há produtos com estoque inconsistente e corrigi-los
-- Esta query pode ser executada manualmente se necessário:
-- 
-- SELECT 
--   p.id, 
--   p.nome, 
--   p.estoque_atual,
--   COALESCE(SUM(
--     CASE 
--       WHEN pe.tipo_movimento = 'entrada' THEN pe.quantidade 
--       ELSE -pe.quantidade 
--     END
--   ), 0) as estoque_calculado,
--   p.estoque_atual - COALESCE(SUM(
--     CASE 
--       WHEN pe.tipo_movimento = 'entrada' THEN pe.quantidade 
--       ELSE -pe.quantidade 
--     END
--   ), 0) as diferenca
-- FROM produtos p 
-- LEFT JOIN produto_estoque pe ON p.id = pe.produto_id 
-- WHERE p.deletado = false
-- GROUP BY p.id, p.nome, p.estoque_atual
-- HAVING ABS(p.estoque_atual - COALESCE(SUM(
--   CASE 
--     WHEN pe.tipo_movimento = 'entrada' THEN pe.quantidade 
--     ELSE -pe.quantidade 
--   END
-- ), 0)) > 0.01;
