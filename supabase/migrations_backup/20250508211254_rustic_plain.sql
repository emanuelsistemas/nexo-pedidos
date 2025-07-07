/*
  # Create taxa_entrega table

  1. New Tables
    - `taxa_entrega`
      - `id` (uuid, primary key)
      - `empresa_id` (uuid, foreign key to empresas)
      - `cep` (text, not null)
      - `bairro` (text, not null)
      - `valor` (numeric, not null)
      - `created_at` (timestamptz)

  2. Changes
    - Add foreign key constraint to empresas table
    - Create index for better performance
*/

CREATE TABLE IF NOT EXISTS taxa_entrega (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cep text NOT NULL,
  bairro text NOT NULL,
  valor numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for better query performance
CREATE INDEX idx_taxa_entrega_empresa_id ON taxa_entrega(empresa_id);
CREATE INDEX idx_taxa_entrega_cep ON taxa_entrega(cep);