/*
  # Create payment methods table

  1. New Tables
    - `formas_pagamento`
      - `id` (uuid, primary key)
      - `empresa_id` (uuid, foreign key to empresas)
      - `tipo` (text, payment type)
      - `created_at` (timestamp with time zone)

  2. Changes
    - Create table formas_pagamento
    - Add foreign key constraint to empresas table
    - Create index on empresa_id for better performance
*/

CREATE TABLE IF NOT EXISTS formas_pagamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for better query performance
CREATE INDEX idx_formas_pagamento_empresa_id ON formas_pagamento(empresa_id);