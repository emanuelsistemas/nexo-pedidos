/*
  # Disable RLS for tables
  
  This migration disables Row Level Security (RLS) for both the empresas and usuarios tables
  as per project requirements.
*/

-- Disable RLS for empresas table
ALTER TABLE empresas DISABLE ROW LEVEL SECURITY;

-- Disable RLS for usuarios table
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies since they won't be needed
DROP POLICY IF EXISTS "Enable inserts for signup process and authenticated users" ON empresas;
DROP POLICY IF EXISTS "Users can view their own company" ON empresas;
DROP POLICY IF EXISTS "Users can view own profile" ON usuarios;
DROP POLICY IF EXISTS "Users can update own profile" ON usuarios;
DROP POLICY IF EXISTS "Users can insert new profiles" ON usuarios;