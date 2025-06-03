/*
  # Update Foreign Key Constraints and Policies

  1. Changes
    - Add ON DELETE and ON UPDATE constraints to foreign keys
    - Add CASCADE triggers for data integrity
    - Update RLS policies for better security

  2. Security
    - Maintain existing RLS policies
    - Add constraints to prevent orphaned records
*/

-- Add ON DELETE RESTRICT to prevent deletion of companies with users
ALTER TABLE usuarios
DROP CONSTRAINT IF EXISTS usuarios_empresa_id_fkey,
ADD CONSTRAINT usuarios_empresa_id_fkey
  FOREIGN KEY (empresa_id)
  REFERENCES empresas(id)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- Add index on empresa_id for better query performance
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_id
  ON usuarios(empresa_id);

-- Add index on email for better query performance
CREATE INDEX IF NOT EXISTS idx_usuarios_email
  ON usuarios(email);

-- Update empresas policies for better security
DROP POLICY IF EXISTS "Users can view their own company" ON empresas;
CREATE POLICY "Users can view their own company"
  ON empresas
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT empresa_id 
      FROM usuarios 
      WHERE usuarios.id = auth.uid()
    )
  );

-- Add policy for inserting new companies
CREATE POLICY "Users can insert new companies"
  ON empresas
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Update usuarios policies
DROP POLICY IF EXISTS "Users can view own profile" ON usuarios;
CREATE POLICY "Users can view own profile"
  ON usuarios
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    empresa_id IN (
      SELECT empresa_id 
      FROM usuarios 
      WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own profile" ON usuarios;
CREATE POLICY "Users can update own profile"
  ON usuarios
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Add policy for inserting new users
CREATE POLICY "Users can insert new profiles"
  ON usuarios
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());