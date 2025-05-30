/*
  # Add client types to clientes table

  1. Changes
    - Add is_cliente column (boolean, default true)
    - Add is_funcionario column (boolean, default false)
    - Add is_vendedor column (boolean, default false)
    - Add is_fornecedor column (boolean, default false)
    - Add is_transportadora column (boolean, default false)
*/

-- Add client type columns to clientes table
DO $$ 
BEGIN
  -- Add is_cliente column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clientes' 
    AND column_name = 'is_cliente'
  ) THEN
    ALTER TABLE clientes 
    ADD COLUMN is_cliente boolean DEFAULT true;
  END IF;

  -- Add is_funcionario column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clientes' 
    AND column_name = 'is_funcionario'
  ) THEN
    ALTER TABLE clientes 
    ADD COLUMN is_funcionario boolean DEFAULT false;
  END IF;

  -- Add is_vendedor column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clientes' 
    AND column_name = 'is_vendedor'
  ) THEN
    ALTER TABLE clientes 
    ADD COLUMN is_vendedor boolean DEFAULT false;
  END IF;

  -- Add is_fornecedor column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clientes' 
    AND column_name = 'is_fornecedor'
  ) THEN
    ALTER TABLE clientes 
    ADD COLUMN is_fornecedor boolean DEFAULT false;
  END IF;

  -- Add is_transportadora column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clientes' 
    AND column_name = 'is_transportadora'
  ) THEN
    ALTER TABLE clientes 
    ADD COLUMN is_transportadora boolean DEFAULT false;
  END IF;
END $$;

-- Add comments to columns
COMMENT ON COLUMN clientes.is_cliente IS 'Indica se o registro é um cliente';
COMMENT ON COLUMN clientes.is_funcionario IS 'Indica se o registro é um funcionário';
COMMENT ON COLUMN clientes.is_vendedor IS 'Indica se o registro é um vendedor';
COMMENT ON COLUMN clientes.is_fornecedor IS 'Indica se o registro é um fornecedor';
COMMENT ON COLUMN clientes.is_transportadora IS 'Indica se o registro é uma transportadora';

-- Update existing records to have is_cliente = true by default
UPDATE clientes SET is_cliente = true WHERE is_cliente IS NULL;
