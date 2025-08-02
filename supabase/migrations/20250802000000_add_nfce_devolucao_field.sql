-- Adicionar campo nfce_devolucao na tabela PDV
-- Data: 02/08/2025
-- Descrição: Campo para identificar registros de NFC-e de devolução na tabela PDV

-- Adicionar campo nfce_devolucao como BOOLEAN na tabela pdv
ALTER TABLE pdv
ADD COLUMN IF NOT EXISTS nfce_devolucao BOOLEAN DEFAULT FALSE;

-- Comentário para documentação
COMMENT ON COLUMN pdv.nfce_devolucao IS 'Indica se o registro é uma NFC-e de devolução (true) ou venda normal (false)';

-- Criar índice para consultas rápidas de devoluções NFC-e
CREATE INDEX IF NOT EXISTS idx_pdv_nfce_devolucao ON pdv(nfce_devolucao) WHERE nfce_devolucao = TRUE;

-- Criar índice composto para filtros por empresa e tipo
CREATE INDEX IF NOT EXISTS idx_pdv_empresa_nfce_devolucao ON pdv(empresa_id, nfce_devolucao);

-- Atualizar registros existentes para garantir valor padrão
UPDATE pdv 
SET nfce_devolucao = FALSE 
WHERE nfce_devolucao IS NULL;

-- Comentário na tabela
COMMENT ON TABLE pdv IS 'Tabela principal de vendas do PDV com suporte a identificação de NFC-e de devolução';

-- Exemplos de uso:
-- 
-- Buscar apenas vendas normais:
-- SELECT * FROM pdv WHERE empresa_id = 'uuid' AND nfce_devolucao = FALSE;
--
-- Buscar apenas devoluções NFC-e:
-- SELECT * FROM pdv WHERE empresa_id = 'uuid' AND nfce_devolucao = TRUE;
--
-- Relatório completo com identificação:
-- SELECT 
--   numero_venda,
--   data_venda,
--   valor_total,
--   CASE 
--     WHEN nfce_devolucao = TRUE THEN 'Devolução NFC-e'
--     ELSE 'Venda Normal'
--   END as tipo_operacao
-- FROM pdv 
-- WHERE empresa_id = 'uuid'
-- ORDER BY data_venda DESC;
