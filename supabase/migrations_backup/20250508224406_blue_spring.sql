/*
  # Add empresa_id to pedidos_itens_adicionais

  1. Changes
    - Add empresa_id column to pedidos_itens_adicionais table
    - Create index for empresa_id
    - Enable RLS
    - Create policy for authenticated users

  2. Security
    - Enable RLS on pedidos_itens_adicionais table
    - Add policy for authenticated users to manage their own records
*/

-- Add empresa_id to pedidos_itens_adicionais if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pedidos_itens_adicionais' 
    AND column_name = 'empresa_id'
  ) THEN
    ALTER TABLE pedidos_itens_adicionais 
    ADD COLUMN empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_pedidos_itens_adicionais_empresa_id 
ON pedidos_itens_adicionais(empresa_id);

-- Enable RLS
ALTER TABLE pedidos_itens_adicionais ENABLE ROW LEVEL SECURITY;

-- Create policy using empresa_id
CREATE POLICY "Users can manage their own order item addons"
ON pedidos_itens_adicionais
FOR ALL
TO authenticated
USING (
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios 
    WHERE id = auth.uid()
  )
);