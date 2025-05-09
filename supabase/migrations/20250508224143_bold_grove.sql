/*
  # Add empresa_id to opcoes_adicionais_itens

  1. Changes
    - Add empresa_id column to opcoes_adicionais_itens table
    - Create index for empresa_id
    - Update RLS policy to use empresa_id directly

  2. Security
    - Drop old RLS policy that used relationships
    - Create new RLS policy using empresa_id directly
*/

-- Add empresa_id to opcoes_adicionais_itens if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opcoes_adicionais_itens' 
    AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE opcoes_adicionais_itens 
    ADD COLUMN empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_opcoes_adicionais_itens_empresa_id 
ON opcoes_adicionais_itens(empresa_id);

-- Drop old policy that used relationships
DROP POLICY IF EXISTS "Users can manage their own additional option items" ON opcoes_adicionais_itens;

-- Create new policy using empresa_id
CREATE POLICY "Users can manage their own additional option items"
ON opcoes_adicionais_itens
FOR ALL
TO authenticated
USING (
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios 
    WHERE id = auth.uid()
  )
);