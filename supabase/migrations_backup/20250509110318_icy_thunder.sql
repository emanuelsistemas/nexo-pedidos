/*
  # Disable RLS for horario_atendimento table

  1. Changes
    - Disable RLS on horario_atendimento table
    - Drop existing RLS policies
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own business hours" ON horario_atendimento;
DROP POLICY IF EXISTS "Users can manage own business hours" ON horario_atendimento;

-- Disable RLS
ALTER TABLE horario_atendimento DISABLE ROW LEVEL SECURITY;