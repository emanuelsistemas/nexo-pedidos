-- Atualizar tabela fiado_recebimentos para usar caixa_controle_id
-- Data: 06/08/2025
-- Descrição: Remove campo caixa_recebimento e adiciona caixa_controle_id

-- =====================================================
-- REMOVER CAMPO caixa_recebimento
-- =====================================================
ALTER TABLE fiado_recebimentos DROP COLUMN IF EXISTS caixa_recebimento;

-- =====================================================
-- ADICIONAR CAMPO caixa_controle_id
-- =====================================================
ALTER TABLE fiado_recebimentos 
ADD COLUMN caixa_controle_id UUID REFERENCES caixa_controle(id) ON DELETE RESTRICT;

-- =====================================================
-- CRIAR ÍNDICE PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_fiado_recebimentos_caixa_controle ON fiado_recebimentos(caixa_controle_id);

-- =====================================================
-- COMENTÁRIO PARA DOCUMENTAÇÃO
-- =====================================================
COMMENT ON COLUMN fiado_recebimentos.caixa_controle_id IS 'Referência ao caixa onde foi feito o recebimento';
