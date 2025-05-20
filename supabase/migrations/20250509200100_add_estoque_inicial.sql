/*
  # Add estoque_inicial field to produtos table

  1. Changes
    - Add estoque_inicial column to produtos table
    - Default value is null
*/

-- Add estoque_inicial to produtos table
ALTER TABLE produtos
ADD COLUMN IF NOT EXISTS estoque_inicial numeric(10,2) DEFAULT NULL;
