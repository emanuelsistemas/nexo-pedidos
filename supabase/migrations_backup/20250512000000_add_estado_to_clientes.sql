/*
  # Add estado column to clientes table

  1. Changes
    - Add estado column to clientes table if it doesn't exist
    - Set default value to empty string
*/

-- Add estado column to clientes if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clientes' 
    AND column_name = 'estado'
  ) THEN
    ALTER TABLE clientes 
    ADD COLUMN estado text DEFAULT '';
  END IF;
END $$;

-- Add comment to column
COMMENT ON COLUMN clientes.estado IS 'Estado (UF) do endereço do cliente';
