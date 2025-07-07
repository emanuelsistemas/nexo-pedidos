-- Adicionar constraint única para ordenação do cardápio digital em produtos
-- Data: 2025-07-06
-- Descrição: Garante que não existam produtos com a mesma ordenação no mesmo grupo da mesma empresa

-- Primeiro, vamos limpar possíveis duplicatas existentes
-- Atualizar produtos duplicados para NULL (mantendo apenas o primeiro)
WITH duplicatas AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY empresa_id, grupo_id, ordenacao_cardapio_digital 
      ORDER BY created_at ASC
    ) as rn
  FROM produtos 
  WHERE ordenacao_cardapio_habilitada = true 
    AND ordenacao_cardapio_digital IS NOT NULL
    AND deletado = false
)
UPDATE produtos 
SET 
  ordenacao_cardapio_habilitada = false,
  ordenacao_cardapio_digital = NULL
WHERE id IN (
  SELECT id FROM duplicatas WHERE rn > 1
);

-- Criar constraint única parcial (apenas para produtos com ordenação habilitada)
-- Esta constraint garante que não existam dois produtos no mesmo grupo da mesma empresa
-- com a mesma ordenação quando ordenacao_cardapio_habilitada = true
CREATE UNIQUE INDEX IF NOT EXISTS idx_produtos_ordenacao_cardapio_unique 
ON produtos (empresa_id, grupo_id, ordenacao_cardapio_digital) 
WHERE ordenacao_cardapio_habilitada = true 
  AND ordenacao_cardapio_digital IS NOT NULL 
  AND deletado = false;

-- Comentário para documentação
COMMENT ON INDEX idx_produtos_ordenacao_cardapio_unique IS 'Garante unicidade da ordenação do cardápio digital por empresa/grupo para produtos ativos com ordenação habilitada';
