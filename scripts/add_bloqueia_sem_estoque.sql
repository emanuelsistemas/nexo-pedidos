-- Add bloqueia_sem_estoque column directly
ALTER TABLE tipo_controle_estoque_config 
ADD COLUMN IF NOT EXISTS bloqueia_sem_estoque boolean NOT NULL DEFAULT false;

-- Update comment
COMMENT ON COLUMN tipo_controle_estoque_config.bloqueia_sem_estoque IS 'Se true, bloqueia pedidos quando não há estoque suficiente';

-- Update existing rows to have the default value
UPDATE tipo_controle_estoque_config
SET bloqueia_sem_estoque = false
WHERE bloqueia_sem_estoque IS NULL;
