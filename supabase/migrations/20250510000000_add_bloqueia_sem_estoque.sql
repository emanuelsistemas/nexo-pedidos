/*
  # Add bloqueia_sem_estoque field to tipo_controle_estoque_config table

  1. Changes
    - Add bloqueia_sem_estoque column to tipo_controle_estoque_config table
    - Default value is false (permite pedidos mesmo sem estoque)
*/

-- Add bloqueia_sem_estoque to tipo_controle_estoque_config table
ALTER TABLE tipo_controle_estoque_config
ADD COLUMN IF NOT EXISTS bloqueia_sem_estoque boolean DEFAULT false;

-- Update comment
COMMENT ON COLUMN tipo_controle_estoque_config.bloqueia_sem_estoque IS 'Se true, bloqueia pedidos quando não há estoque suficiente';
