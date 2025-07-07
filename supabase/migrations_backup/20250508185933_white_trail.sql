/*
  # Add product code field
  
  1. Changes
    - Add `codigo` column to produtos table
    - Add unique constraint on `codigo` column
    - Add index for faster lookups
*/

ALTER TABLE produtos 
ADD COLUMN codigo text NOT NULL DEFAULT '';

-- Add unique constraint
ALTER TABLE produtos
ADD CONSTRAINT produtos_codigo_key UNIQUE (codigo);

-- Add index for performance
CREATE INDEX idx_produtos_codigo ON produtos (codigo);