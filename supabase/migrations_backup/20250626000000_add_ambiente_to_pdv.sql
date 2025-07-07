-- Adicionar campo ambiente à tabela PDV para rastrear o ambiente de emissão de cada NFe
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS ambiente VARCHAR(20) DEFAULT 'homologacao' CHECK (ambiente IN ('homologacao', 'producao'));

-- Criar índice para melhor performance nas consultas por ambiente
CREATE INDEX IF NOT EXISTS idx_pdv_ambiente ON pdv(ambiente);

-- Comentário para documentação
COMMENT ON COLUMN pdv.ambiente IS 'Ambiente de emissão da NFe: homologacao ou producao';

-- Atualizar registros existentes baseado na configuração da empresa
-- Buscar ambiente da configuração NFe de cada empresa e aplicar aos registros existentes
UPDATE pdv 
SET ambiente = (
    SELECT nfe_config.ambiente 
    FROM nfe_config 
    WHERE nfe_config.empresa_id = pdv.empresa_id
)
WHERE ambiente IS NULL 
AND empresa_id IN (SELECT empresa_id FROM nfe_config);

-- Para empresas sem configuração NFe, manter o padrão 'homologacao'
UPDATE pdv 
SET ambiente = 'homologacao'
WHERE ambiente IS NULL;
