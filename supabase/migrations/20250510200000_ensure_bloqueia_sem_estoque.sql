/*
  # Ensure bloqueia_sem_estoque field exists and has correct values

  1. Changes
    - Drop and recreate the column to ensure it has the correct type and default value
    - Set all existing rows to have the default value
*/

-- Drop the column if it exists (to fix any potential issues)
ALTER TABLE tipo_controle_estoque_config 
DROP COLUMN IF EXISTS bloqueia_sem_estoque;

-- Add the column with the correct type and default value
ALTER TABLE tipo_controle_estoque_config 
ADD COLUMN bloqueia_sem_estoque boolean NOT NULL DEFAULT false;

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
