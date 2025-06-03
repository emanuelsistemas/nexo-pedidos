/*
  # Disable RLS for configuracoes table

  1. Changes
    - Drop existing RLS policies
    - Disable RLS on configuracoes table
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own company's configurations" ON configuracoes;
DROP POLICY IF EXISTS "Users can insert own company's configurations" ON configuracoes;
DROP POLICY IF EXISTS "Users can update own company's configurations" ON configuracoes;

-- Disable RLS
ALTER TABLE configuracoes DISABLE ROW LEVEL SECURITY;