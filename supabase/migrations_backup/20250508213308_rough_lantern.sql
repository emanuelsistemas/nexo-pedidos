/*
  # Create conexao table

  1. New Tables
    - `conexao`
      - `id` (uuid, primary key)
      - `nome` (text, not null)
      - `empresa_id` (uuid, foreign key to empresas)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `conexao` table
    - Add policy for authenticated users to manage their own data
*/

CREATE TABLE IF NOT EXISTS conexao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE conexao ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_conexao_empresa_id ON conexao(empresa_id);

CREATE POLICY "Users can manage their own connections"
  ON conexao
  FOR ALL
  TO authenticated
  USING (empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE id = auth.uid()
  ));