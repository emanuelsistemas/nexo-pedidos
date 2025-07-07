/*
  # Add empresa_id to pedidos_itens table

  1. Changes
    - Add empresa_id column to pedidos_itens table
    - Create index for empresa_id
    - Update RLS policy to use direct empresa_id relationship

  2. Security
    - Enable RLS
    - Add policy for authenticated users to manage their own order items
*/

-- Add empresa_id to pedidos_itens if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pedidos_itens' 
    AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE pedidos_itens 
    ADD COLUMN empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_pedidos_itens_empresa_id 
ON pedidos_itens(empresa_id);

-- Drop old policy that used relationships
DROP POLICY IF EXISTS "Users can manage their own order items" ON pedidos_itens;

-- Create new policy using empresa_id
CREATE POLICY "Users can manage their own order items"
ON pedidos_itens
FOR ALL
TO authenticated
USING (
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios 
    WHERE id = auth.uid()
  )
);