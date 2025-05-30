-- Adicionar coluna para armazenar o método de extração do certificado
-- Execute este SQL no Supabase Dashboard > SQL Editor

ALTER TABLE empresas 
ADD COLUMN IF NOT EXISTS metodo_extracao TEXT DEFAULT 'unknown';

-- Comentário da coluna
COMMENT ON COLUMN empresas.metodo_extracao IS 'Método usado para extrair informações do certificado digital: backend_secure, frontend_fallback, basic_fallback, unknown';

-- Atualizar registros existentes
UPDATE empresas 
SET metodo_extracao = 'unknown' 
WHERE metodo_extracao IS NULL;
