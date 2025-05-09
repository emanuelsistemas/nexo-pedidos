/*
  # Add store status management

  1. New Tables
    - `status_loja`
      - `id` (uuid, primary key)
      - `empresa_id` (uuid, foreign key)
      - `aberto` (boolean) - Indicates if store is open
      - `aberto_manual` (boolean) - Indicates if store was manually opened/closed
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `status_loja` table
    - Add policy for authenticated users to read/write their own data
*/

CREATE TABLE IF NOT EXISTS status_loja (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  aberto boolean NOT NULL DEFAULT true,
  aberto_manual boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (empresa_id)
);

ALTER TABLE status_loja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own store status"
  ON status_loja
  FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own store status"
  ON status_loja
  FOR UPDATE
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE id = auth.uid()
    )
  );