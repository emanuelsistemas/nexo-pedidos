-- Adicionar campos de soft delete à tabela pdv_itens
-- Data: 2025-08-09
-- Objetivo: Implementar rastreamento de itens deletados no PDV

-- =====================================================
-- 1. ADICIONAR CAMPOS DE SOFT DELETE
-- =====================================================

-- Campos de soft delete
ALTER TABLE pdv_itens
  ADD COLUMN IF NOT EXISTS deletado BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deletado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletado_por UUID;

-- Campos de rastreamento de valores no momento da deleção
ALTER TABLE pdv_itens
  ADD COLUMN IF NOT EXISTS valor_total_real_deletado NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS valor_adicionais_deletado NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantidade_adicionais_deletado INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_insumos_deletado NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantidade_insumos_deletado INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS snapshot_item_deletado JSONB;

-- =====================================================
-- 2. CHAVES ESTRANGEIRAS
-- =====================================================

-- Usuário que deletou o item
ALTER TABLE pdv_itens 
ADD CONSTRAINT IF NOT EXISTS fk_pdv_itens_deletado_por 
FOREIGN KEY (deletado_por) REFERENCES usuarios(id) ON DELETE SET NULL;

-- =====================================================
-- 3. CONSTRAINTS DE VALIDAÇÃO
-- =====================================================

-- Validação de soft delete (se deletado = true, deve ter data e usuário)
ALTER TABLE pdv_itens
ADD CONSTRAINT IF NOT EXISTS chk_pdv_itens_soft_delete
CHECK (
  (deletado = FALSE AND deletado_em IS NULL AND deletado_por IS NULL) OR
  (deletado = TRUE AND deletado_em IS NOT NULL AND deletado_por IS NOT NULL)
);

-- =====================================================
-- 4. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índice para consultas de itens ativos
CREATE INDEX IF NOT EXISTS idx_pdv_itens_deletado ON pdv_itens(deletado) WHERE deletado = FALSE;

-- Índice para consultas de itens deletados
CREATE INDEX IF NOT EXISTS idx_pdv_itens_deletado_em ON pdv_itens(deletado_em) WHERE deletado = TRUE;

-- Índice para consultas por usuário que deletou
CREATE INDEX IF NOT EXISTS idx_pdv_itens_deletado_por ON pdv_itens(deletado_por) WHERE deletado = TRUE;

-- =====================================================
-- 5. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON COLUMN pdv_itens.deletado IS 'Indica se o item foi removido da venda (soft delete)';
COMMENT ON COLUMN pdv_itens.deletado_em IS 'Data e hora em que o item foi removido';
COMMENT ON COLUMN pdv_itens.deletado_por IS 'Usuário que removeu o item da venda';
COMMENT ON COLUMN pdv_itens.valor_total_real_deletado IS 'Valor total real do item no momento da deleção (produto + adicionais)';
COMMENT ON COLUMN pdv_itens.valor_adicionais_deletado IS 'Valor total dos adicionais no momento da deleção';
COMMENT ON COLUMN pdv_itens.quantidade_adicionais_deletado IS 'Quantidade de adicionais no momento da deleção';
COMMENT ON COLUMN pdv_itens.valor_insumos_deletado IS 'Valor total dos insumos no momento da deleção';
COMMENT ON COLUMN pdv_itens.quantidade_insumos_deletado IS 'Quantidade de insumos no momento da deleção';
COMMENT ON COLUMN pdv_itens.snapshot_item_deletado IS 'Snapshot completo do item e seus relacionamentos no momento da deleção';

-- =====================================================
-- 6. ATUALIZAR COMENTÁRIO DA TABELA
-- =====================================================

COMMENT ON TABLE pdv_itens IS 'Itens das vendas do PDV com rastreabilidade completa e soft delete';

-- =====================================================
-- 7. FUNÇÃO PARA CALCULAR VALOR TOTAL REAL DO ITEM
-- =====================================================

-- Função que calcula o valor total REAL incluindo produto + adicionais + insumos
CREATE OR REPLACE FUNCTION calcular_valor_total_real_item_pdv(pdv_item_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
  valor_produto NUMERIC(10,2);
  valor_adicionais NUMERIC(10,2);
  valor_insumos NUMERIC(10,2);
  valor_total_real NUMERIC(10,2);
BEGIN
  -- Buscar valor do produto (já inclui descontos)
  SELECT valor_total_item INTO valor_produto
  FROM pdv_itens
  WHERE id = pdv_item_uuid
  AND deletado = FALSE;

  -- Buscar soma dos adicionais ativos
  SELECT COALESCE(SUM(valor_total), 0) INTO valor_adicionais
  FROM pdv_itens_adicionais
  WHERE pdv_item_id = pdv_item_uuid
  AND deletado = FALSE;

  -- Buscar soma dos insumos ativos (custo total)
  SELECT COALESCE(SUM(custo_total), 0) INTO valor_insumos
  FROM pdv_itens_insumos
  WHERE pdv_item_id = pdv_item_uuid
  AND deletado = FALSE;

  -- Calcular total real
  valor_total_real := COALESCE(valor_produto, 0) + COALESCE(valor_adicionais, 0);
  -- Nota: insumos são custos, não são somados ao valor de venda

  RETURN valor_total_real;
END;
$$ LANGUAGE plpgsql;

-- Comentário da função
COMMENT ON FUNCTION calcular_valor_total_real_item_pdv(UUID) IS 'Calcula o valor total real do item incluindo produto base + adicionais (exclui insumos que são custos)';
