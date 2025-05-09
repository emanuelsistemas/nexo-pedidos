/*
  # Add configuracoes table

  1. New Tables
    - `configuracoes`
      - `id` (uuid, primary key)
      - `empresa_id` (uuid, foreign key to empresas)
      - `taxa_modo` (text, either 'bairro' or 'distancia')
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `configuracoes` table
    - Add policy for authenticated users to read/write their own company's data

  3. Changes
    - Add foreign key constraint to empresas table
    - Add check constraint for taxa_modo values
*/

CREATE TABLE IF NOT EXISTS configuracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  taxa_modo text NOT NULL DEFAULT 'bairro' CHECK (taxa_modo IN ('bairro', 'distancia')),
  created_at timestamptz DEFAULT now()
);

-- Create index for empresa_id for better query performance
CREATE INDEX IF NOT EXISTS idx_configuracoes_empresa_id ON configuracoes(empresa_id);

-- Enable RLS
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own company's configurations"
  ON configuracoes
  FOR SELECT
  TO authenticated
  USING (empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert own company's configurations"
  ON configuracoes
  FOR INSERT
  TO authenticated
  WITH CHECK (empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update own company's configurations"
  ON configuracoes
  FOR UPDATE
  TO authenticated
  USING (empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE id = auth.uid()
  ))
  WITH CHECK (empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE id = auth.uid()
  ));

-- Insert default configuration for existing companies
INSERT INTO configuracoes (empresa_id, taxa_modo)
SELECT id, 'bairro'
FROM empresas
WHERE NOT EXISTS (
  SELECT 1 FROM configuracoes WHERE configuracoes.empresa_id = empresas.id
);