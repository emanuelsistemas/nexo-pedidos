-- Adicionar campos para inutilização de NFe na tabela pdv
-- Data: 31/01/2025
-- Descrição: Adiciona campos necessários para armazenar dados de inutilização de NFe

-- Adicionar campos de inutilização na tabela pdv
ALTER TABLE pdv 
ADD COLUMN IF NOT EXISTS motivo_inutilizacao TEXT,
ADD COLUMN IF NOT EXISTS inutilizada_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS protocolo_inutilizacao VARCHAR(50);

-- Atualizar constraint de status_nfe para incluir 'inutilizada'
-- Primeiro, remover constraint existente se houver
ALTER TABLE pdv DROP CONSTRAINT IF EXISTS chk_pdv_status_nfe;

-- Adicionar nova constraint com status 'inutilizada'
ALTER TABLE pdv ADD CONSTRAINT chk_pdv_status_nfe
CHECK (status_nfe IN ('pendente', 'autorizada', 'cancelada', 'rejeitada', 'rascunho', 'inutilizada'));

-- Comentários para documentação
COMMENT ON COLUMN pdv.motivo_inutilizacao IS 'Motivo da inutilização da NFe informado para a SEFAZ';
COMMENT ON COLUMN pdv.inutilizada_em IS 'Data e hora da inutilização da NFe';
COMMENT ON COLUMN pdv.protocolo_inutilizacao IS 'Protocolo de inutilização retornado pela SEFAZ';

-- Criar índice para consultas por status inutilizada
CREATE INDEX IF NOT EXISTS idx_pdv_status_nfe_inutilizada 
ON pdv(empresa_id, status_nfe) 
WHERE status_nfe = 'inutilizada';
