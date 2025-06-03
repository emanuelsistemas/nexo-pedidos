/*
  # Add empresa_id to product options tables

  1. Changes
    - Add empresa_id column to produtos_opcoes_adicionais
    - Add empresa_id column to produtos_opcoes_adicionais_itens
    - Update RLS policies to include empresa_id checks
    
  2. Security
    - Enable RLS on both tables
    - Add policies to ensure users can only access their own company's data
*/

-- Add empresa_id to produtos_opcoes_adicionais
ALTER TABLE produtos_opcoes_adicionais 
ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE;

-- Add empresa_id to produtos_opcoes_adicionais_itens
ALTER TABLE produtos_opcoes_adicionais_itens 
ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_produtos_opcoes_adicionais_empresa_id 
ON produtos_opcoes_adicionais(empresa_id);

CREATE INDEX IF NOT EXISTS idx_produtos_opcoes_adicionais_itens_empresa_id 
ON produtos_opcoes_adicionais_itens(empresa_id);

-- Update RLS policies
DROP POLICY IF EXISTS "Users can manage their own product options" ON produtos_opcoes_adicionais;
DROP POLICY IF EXISTS "Users can manage their own product option items" ON produtos_opcoes_adicionais_itens;

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
)
WITH CHECK (
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
)
WITH CHECK (
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios 
    WHERE id = auth.uid()
  )
);