/*
  # Create entregadores table

  1. New Tables
    - `entregadores`
      - `id` (uuid, primary key)
      - `nome` (text, not null)
      - `comissao` (numeric, not null)
      - `created_at` (timestamptz)

  2. Changes
    - Create table entregadores
    - Add default values and constraints
*/

CREATE TABLE IF NOT EXISTS entregadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  comissao numeric(5,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);