/*
  # Add product stock management

  1. New Tables
    - `produto_estoque`
      - `id` (uuid, primary key)
      - `empresa_id` (uuid, foreign key to empresas)
      - `usuario_id` (uuid, foreign key to usuarios)
      - `produto_id` (uuid, foreign key to produtos)
      - `tipo_movimento` (text, enum: 'entrada', 'saida', 'faturado')
      - `quantidade` (numeric, not null)
      - `data_hora_movimento` (timestamptz, default now())
      - `created_at` (timestamptz, default now())

  2. Changes
    - Create table produto_estoque
    - Add foreign key constraints
    - Create indexes for better performance
    - Disable RLS by default
*/

-- Create produto_estoque table
CREATE TABLE IF NOT EXISTS produto_estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  produto_id uuid NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  tipo_movimento text NOT NULL CHECK (tipo_movimento IN ('entrada', 'saida', 'faturado')),
  quantidade numeric(10,2) NOT NULL,
  data_hora_movimento timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_produto_estoque_empresa_id ON produto_estoque(empresa_id);
CREATE INDEX idx_produto_estoque_produto_id ON produto_estoque(produto_id);
CREATE INDEX idx_produto_estoque_usuario_id ON produto_estoque(usuario_id);
CREATE INDEX idx_produto_estoque_data_hora ON produto_estoque(data_hora_movimento);

-- Disable RLS for produto_estoque table
ALTER TABLE produto_estoque DISABLE ROW LEVEL SECURITY;
