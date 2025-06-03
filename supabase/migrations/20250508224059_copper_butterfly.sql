/*
  # Add empresa_id to produtos table

  1. Changes
    - Add empresa_id column to produtos table
    - Create index for empresa_id
    - Update RLS policy to use empresa_id directly

  2. Security
    - Update RLS policy to use empresa_id instead of grupo relationship
*/

-- Add empresa_id to produtos if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'produtos' 
    AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE produtos 
    ADD COLUMN empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_produtos_empresa_id 
ON produtos(empresa_id);

-- Drop old policy that used grupo relationship
DROP POLICY IF EXISTS "Users can manage their own products" ON produtos;

-- Create new policy using empresa_id
CREATE POLICY "Users can manage their own products"
ON produtos
FOR ALL
TO authenticated
USING (
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios 
    WHERE id = auth.uid()
  )
);