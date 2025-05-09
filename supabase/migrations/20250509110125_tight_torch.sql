/*
  # Add business hours management

  1. New Tables
    - `horario_atendimento`
      - `id` (uuid, primary key)
      - `empresa_id` (uuid, references empresas)
      - `dia_semana` (integer, 0-6 representing Sunday to Saturday)
      - `hora_abertura` (time)
      - `hora_fechamento` (time)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `horario_atendimento` table
    - Add policies for authenticated users to manage their own business hours
*/

CREATE TABLE IF NOT EXISTS horario_atendimento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  dia_semana integer NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6),
  hora_abertura time NOT NULL,
  hora_fechamento time NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (empresa_id, dia_semana)
);

ALTER TABLE horario_atendimento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own business hours"
  ON horario_atendimento
  FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own business hours"
  ON horario_atendimento
  FOR ALL
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