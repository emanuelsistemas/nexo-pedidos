/*
  # Initial Schema Setup

  1. New Tables
    - `usuarios`
      - `id` (uuid, primary key)
      - `nome` (text, not null)
      - `email` (text, unique, not null)
      - `created_at` (timestamptz)
      - `empresa_id` (uuid, foreign key)
    
    - `empresas`
      - `id` (uuid, primary key)
      - `nome` (text, not null)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create empresas table
CREATE TABLE IF NOT EXISTS empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create usuarios table with reference to empresas
CREATE TABLE IF NOT EXISTS usuarios (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  nome text NOT NULL,
  email text NOT NULL UNIQUE,
  empresa_id uuid REFERENCES empresas(id),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Create policies for empresas
CREATE POLICY "Users can view their own company"
  ON empresas
  FOR SELECT
  TO authenticated
  USING (id IN (
    SELECT empresa_id 
    FROM usuarios 
    WHERE usuarios.id = auth.uid()
  ));

-- Create policies for usuarios
CREATE POLICY "Users can view own profile"
  ON usuarios
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON usuarios
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());