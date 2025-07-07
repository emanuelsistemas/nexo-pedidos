/*
  # Disable RLS on grupos table
  
  1. Changes
    - Disable Row Level Security on the grupos table
    - Drop existing RLS policy
*/

ALTER TABLE grupos DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their empresa's grupos" ON grupos;