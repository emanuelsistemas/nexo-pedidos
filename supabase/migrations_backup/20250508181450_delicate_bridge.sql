/*
  # Create configuration tables

  1. New Tables
    - `perfis_acesso`
      - `id` (uuid, primary key)
      - `nome` (text, not null)
      - `created_at` (timestamptz)

    - `opcoes_adicionais`
      - `id` (uuid, primary key)
      - `nome` (text, not null)
      - `created_at` (timestamptz)

    - `opcoes_adicionais_itens`
      - `id` (uuid, primary key)
      - `nome` (text, not null)
      - `preco` (numeric, not null)
      - `opcao_id` (uuid, foreign key)
      - `created_at` (timestamptz)

  2. Changes
    - Add perfil_id to usuarios table
    - Create necessary indexes
*/

-- Create perfis_acesso table
CREATE TABLE IF NOT EXISTS perfis_acesso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create opcoes_adicionais table
CREATE TABLE IF NOT EXISTS opcoes_adicionais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create opcoes_adicionais_itens table
CREATE TABLE IF NOT EXISTS opcoes_adicionais_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  preco numeric(10,2) NOT NULL,
  opcao_id uuid NOT NULL REFERENCES opcoes_adicionais(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Add perfil_id to usuarios table
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS perfil_id uuid REFERENCES perfis_acesso(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_usuarios_perfil_id ON usuarios(perfil_id);
CREATE INDEX IF NOT EXISTS idx_opcoes_adicionais_itens_opcao_id ON opcoes_adicionais_itens(opcao_id);