-- Adicionar campo logo_url na configuração do PDV
-- Data: 2025-07-04
-- Descrição: Adiciona campo para armazenar URL do logo da empresa no cardápio digital

-- Adicionar campo logo_url na tabela pdv_config
ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '';

-- Adicionar campo storage_path para controle do arquivo
ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS logo_storage_path TEXT DEFAULT '';

-- Comentários para documentação
COMMENT ON COLUMN pdv_config.logo_url IS 'URL pública do logo da empresa para o cardápio digital';
COMMENT ON COLUMN pdv_config.logo_storage_path IS 'Caminho do arquivo no storage do Supabase para controle de exclusão';
