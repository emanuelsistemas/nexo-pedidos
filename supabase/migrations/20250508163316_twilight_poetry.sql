/*
  # Create grupos table

  1. New Tables
    - `grupos`
      - `id` (uuid, primary key)
      - `nome` (text, not null)
      - `empresa_id` (uuid, foreign key to empresas)
      - `created_at` (timestamp with time zone)

  2. Security
    - Enable RLS on `grupos` table
    - Add policy for authenticated users to manage their own empresa's grupos
*/

CREATE TABLE IF NOT EXISTS grupos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their empresa's grupos"
  ON grupos
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

-- Create index for better query performance
CREATE INDEX idx_grupos_empresa_id ON grupos(empresa_id);