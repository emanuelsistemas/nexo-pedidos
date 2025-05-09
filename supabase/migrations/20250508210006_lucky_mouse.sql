/*
  # Create horario_atendimento table
  
  1. New Table
    - `horario_atendimento`
      - `id` (uuid, primary key)
      - `empresa_id` (uuid, foreign key)
      - `dia_semana` (integer, 0-6 where 0 is Sunday)
      - `hora_abertura` (time)
      - `hora_fechamento` (time)
      - `created_at` (timestamptz)

  2. Changes
    - Add foreign key constraint to empresas table
    - Add unique constraint to prevent duplicate days for same empresa
*/

CREATE TABLE IF NOT EXISTS horario_atendimento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  dia_semana integer NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6),
  hora_abertura time NOT NULL,
  hora_fechamento time NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(empresa_id, dia_semana)
);

-- Create index for better query performance
CREATE INDEX idx_horario_atendimento_empresa_id ON horario_atendimento(empresa_id);