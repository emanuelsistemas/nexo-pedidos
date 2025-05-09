/*
  # Add empresa_id to product options tables

  1. Changes
    - Add empresa_id column to produtos_opcoes_adicionais and produtos_opcoes_adicionais_itens
    - Create indexes for empresa_id columns
    - Update RLS policies to use empresa_id
    - Drop old RLS policies that used relationships

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
*/

-- Add empresa_id to produtos_opcoes_adicionais if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'produtos_opcoes_adicionais' 
    AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE produtos_opcoes_adicionais 
    ADD COLUMN empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add empresa_id to produtos_opcoes_adicionais_itens if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'produtos_opcoes_adicionais_itens' 
    AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE produtos_opcoes_adicionais_itens 
    ADD COLUMN empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_produtos_opcoes_adicionais_empresa_id 
ON produtos_opcoes_adicionais(empresa_id);

CREATE INDEX IF NOT EXISTS idx_produtos_opcoes_adicionais_itens_empresa_id 
ON produtos_opcoes_adicionais_itens(empresa_id);

-- Drop old policies that used relationships
DROP POLICY IF EXISTS "Users can manage their own product options" ON produtos_opcoes_adicionais;
DROP POLICY IF EXISTS "Users can manage their own product option items" ON produtos_opcoes_adicionais_itens;

-- Create new policies using empresa_id
CREATE POLICY "Users can manage their own product options"
ON produtos_opcoes_adicionais
FOR ALL
TO authenticated
USING (
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can manage their own product option items"
ON produtos_opcoes_adicionais_itens
FOR ALL
TO authenticated
USING (
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios 
    WHERE id = auth.uid()
  )
);