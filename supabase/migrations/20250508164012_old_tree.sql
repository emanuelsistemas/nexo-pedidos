/*
  # Create produtos table

  1. New Tables
    - `produtos`
      - `id` (uuid, primary key)
      - `nome` (text, not null)
      - `preco` (numeric, not null)
      - `descricao` (text)
      - `grupo_id` (uuid, foreign key to grupos)
      - `created_at` (timestamp with time zone)

  2. Changes
    - Create table produtos
    - Add foreign key constraint to grupos table
    - Create index on grupo_id for better performance
    - RLS is disabled by default
*/

CREATE TABLE IF NOT EXISTS produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  preco numeric(10,2) NOT NULL,
  descricao text,
  grupo_id uuid NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create index for better query performance
CREATE INDEX idx_produtos_grupo_id ON produtos(grupo_id);