-- Adicionar campos de tipos de impressão na configuração do PDV
-- Data: 2025-06-25
-- Descrição: Adiciona campos para controlar os tipos de impressão (80mm e 50mm) no PDV

-- Adicionar campos de tipos de impressão na tabela pdv_config
ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS tipo_impressao_80mm BOOLEAN DEFAULT true;

ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS tipo_impressao_50mm BOOLEAN DEFAULT false;

-- Comentários para documentação
COMMENT ON COLUMN pdv_config.tipo_impressao_80mm IS 'Define se a impressão padrão é de 80mm (true = padrão)';
COMMENT ON COLUMN pdv_config.tipo_impressao_50mm IS 'Define se a impressão é de 50mm (false = não é padrão)';

-- Atualizar registros existentes para ter 80mm como padrão
UPDATE pdv_config 
SET tipo_impressao_80mm = true, tipo_impressao_50mm = false 
WHERE tipo_impressao_80mm IS NULL OR tipo_impressao_50mm IS NULL;
