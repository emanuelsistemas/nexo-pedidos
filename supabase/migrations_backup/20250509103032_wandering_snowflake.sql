/*
  # Disable RLS for status_loja table

  1. Changes
    - Drop existing RLS policies
    - Disable RLS on status_loja table
*/

DROP POLICY IF EXISTS "Users can read own store status" ON status_loja;
DROP POLICY IF EXISTS "Users can update own store status" ON status_loja;

ALTER TABLE status_loja DISABLE ROW LEVEL SECURITY;