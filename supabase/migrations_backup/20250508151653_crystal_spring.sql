/*
  # Fix empresas table RLS policy

  1. Changes
    - Drop existing INSERT policy
    - Add new INSERT policy that allows inserts during signup process
    
  2. Security
    - Allows inserts for both authenticated users and during signup
    - Maintains existing SELECT policy for data access control
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert new companies" ON empresas;

-- Create new INSERT policy that allows inserts during signup
CREATE POLICY "Enable inserts for signup process and authenticated users" ON empresas
  FOR INSERT 
  TO authenticated, anon
  WITH CHECK (true);