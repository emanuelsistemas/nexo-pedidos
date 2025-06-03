/*
  # Add tipo_user_config table and update usuarios table

  1. New Tables
    - `tipo_user_config`
      - `id` (uuid, primary key)
      - `tipo` (text, not null)
      - `descricao` (text)
      - `ativo` (boolean, default true)
      - `created_at` (timestamptz, default now())

  2. Changes
    - Create table tipo_user_config
    - Insert default user types
    - Add tipo_user_config_id to usuarios table
    - Create foreign key constraint
    - Create indexes for better performance
*/

-- Create tipo_user_config table
CREATE TABLE IF NOT EXISTS tipo_user_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL UNIQUE,
  descricao text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Insert default user types
INSERT INTO tipo_user_config (tipo, descricao) VALUES
  ('admin', 'Administrador - Acesso completo ao sistema'),
  ('user', 'Usuário - Acesso limitado às funcionalidades básicas'),
  ('vendedor', 'Vendedor - Acesso a vendas e clientes'),
  ('caixa', 'Caixa - Acesso a faturamento e pagamentos'),
  ('socio', 'Sócio - Acesso a relatórios e dashboards');

-- Add tipo_user_config_id to usuarios table
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS tipo_user_config_id uuid REFERENCES tipo_user_config(id) ON DELETE RESTRICT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_usuarios_tipo_user_config_id ON usuarios(tipo_user_config_id);
CREATE INDEX IF NOT EXISTS idx_tipo_user_config_tipo ON tipo_user_config(tipo);

-- Update existing users to have admin type by default
UPDATE usuarios 
SET tipo_user_config_id = (SELECT id FROM tipo_user_config WHERE tipo = 'admin' LIMIT 1)
WHERE tipo_user_config_id IS NULL AND tipo = 'admin';

UPDATE usuarios 
SET tipo_user_config_id = (SELECT id FROM tipo_user_config WHERE tipo = 'user' LIMIT 1)
WHERE tipo_user_config_id IS NULL AND tipo = 'user';

-- For any remaining users without tipo_user_config_id, set them as 'user'
UPDATE usuarios 
SET tipo_user_config_id = (SELECT id FROM tipo_user_config WHERE tipo = 'user' LIMIT 1)
WHERE tipo_user_config_id IS NULL;

-- Add comment
COMMENT ON TABLE tipo_user_config IS 'Configuração dos tipos de usuário do sistema';
COMMENT ON COLUMN usuarios.tipo_user_config_id IS 'Referência ao tipo de usuário configurado';

-- Disable RLS for tipo_user_config table (it's a configuration table)
ALTER TABLE tipo_user_config DISABLE ROW LEVEL SECURITY;
