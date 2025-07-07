/*
  # Add tipo_user_config table and update usuarios table

  1. New Tables
    - `tipo_user_config`
      - `id` (uuid, primary key)
      - `tipo` (text, not null)
      - `descricao` (text)
      - `ativo` (boolean, default true)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
      - `empresa_id` (uuid, foreign key to empresas)

  2. Changes to existing tables
    - Update `usuarios` table to reference `tipo_user_config`
*/

-- Create tipo_user_config table
CREATE TABLE IF NOT EXISTS public.tipo_user_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo TEXT NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE
);

-- Add RLS policies
ALTER TABLE public.tipo_user_config ENABLE ROW LEVEL SECURITY;

-- Policy for empresa isolation
CREATE POLICY "Users can only access their company's user type configs" ON public.tipo_user_config
    FOR ALL USING (empresa_id = auth.jwt() ->> 'empresa_id'::text);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_tipo_user_config_empresa_id ON public.tipo_user_config(empresa_id);
CREATE INDEX IF NOT EXISTS idx_tipo_user_config_tipo ON public.tipo_user_config(tipo);

-- Insert default user types for existing companies
INSERT INTO public.tipo_user_config (tipo, descricao, empresa_id)
SELECT 'admin', 'Administrador do sistema', id FROM public.empresas
ON CONFLICT DO NOTHING;

INSERT INTO public.tipo_user_config (tipo, descricao, empresa_id)
SELECT 'vendedor', 'Vendedor/Operador de caixa', id FROM public.empresas
ON CONFLICT DO NOTHING;

INSERT INTO public.tipo_user_config (tipo, descricao, empresa_id)
SELECT 'gerente', 'Gerente da loja', id FROM public.empresas
ON CONFLICT DO NOTHING;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tipo_user_config_updated_at BEFORE UPDATE ON public.tipo_user_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.tipo_user_config IS 'Configuration table for user types per company';
