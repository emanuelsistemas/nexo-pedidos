/*
  # Fix bloqueia_sem_estoque field in tipo_controle_estoque_config table

  1. Changes
    - Ensure the bloqueia_sem_estoque column exists
    - Set default value to false for existing rows
*/

-- Ensure the column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tipo_controle_estoque_config' 
    AND column_name = 'bloqueia_sem_estoque'
  ) THEN
    ALTER TABLE tipo_controle_estoque_config 
    ADD COLUMN bloqueia_sem_estoque boolean DEFAULT false;
  END IF;
END $$;

-- Update existing rows to have the default value if they are NULL
UPDATE tipo_controle_estoque_config
SET bloqueia_sem_estoque = false
WHERE bloqueia_sem_estoque IS NULL;

-- Add comment
COMMENT ON COLUMN tipo_controle_estoque_config.bloqueia_sem_estoque IS 'Se true, bloqueia pedidos quando não há estoque suficiente';

-- Create default configuration for companies that don't have one yet
INSERT INTO tipo_controle_estoque_config (empresa_id, tipo_controle, bloqueia_sem_estoque)
SELECT id, 'pedidos', false
FROM empresas
WHERE NOT EXISTS (
  SELECT 1 FROM tipo_controle_estoque_config 
  WHERE tipo_controle_estoque_config.empresa_id = empresas.id
);
