/*
  # Add tipo_controle_estoque_config table

  1. New Tables
    - `tipo_controle_estoque_config`
      - `id` (uuid, primary key)
      - `empresa_id` (uuid, foreign key to empresas)
      - `tipo_controle` (text, enum: 'faturamento', 'pedidos')
      - `created_at` (timestamptz, default now())

  2. Changes
    - Create table tipo_controle_estoque_config
    - Add foreign key constraints
    - Create indexes for better performance
    - Disable RLS by default
*/

-- Create tipo_controle_estoque_config table
CREATE TABLE IF NOT EXISTS tipo_controle_estoque_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo_controle text NOT NULL CHECK (tipo_controle IN ('faturamento', 'pedidos')),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_tipo_controle_estoque_config_empresa_id ON tipo_controle_estoque_config(empresa_id);

-- Disable RLS for tipo_controle_estoque_config table
ALTER TABLE tipo_controle_estoque_config DISABLE ROW LEVEL SECURITY;
