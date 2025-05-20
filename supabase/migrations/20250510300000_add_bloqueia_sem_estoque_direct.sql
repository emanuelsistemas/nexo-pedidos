/*
  # Add bloqueia_sem_estoque field directly to tipo_controle_estoque_config table

  1. Changes
    - Add bloqueia_sem_estoque column directly to tipo_controle_estoque_config table
    - Set default value to false
*/

-- Add bloqueia_sem_estoque column directly
ALTER TABLE tipo_controle_estoque_config 
ADD COLUMN IF NOT EXISTS bloqueia_sem_estoque boolean NOT NULL DEFAULT false;

-- Update comment
COMMENT ON COLUMN tipo_controle_estoque_config.bloqueia_sem_estoque IS 'Se true, bloqueia pedidos quando não há estoque suficiente';
