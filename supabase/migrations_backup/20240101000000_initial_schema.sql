-- Initial schema for Nexo Pedidos
-- This migration creates the basic structure needed for the application

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create empresas table (companies)
CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    cnpj TEXT,
    email TEXT,
    telefone TEXT,
    endereco TEXT,
    cidade TEXT,
    estado TEXT,
    cep TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create usuarios table (users)
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    tipo TEXT DEFAULT 'vendedor',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create categorias table (categories)
CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create produtos table (products)
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    preco DECIMAL(10,2) NOT NULL DEFAULT 0,
    categoria_id UUID REFERENCES public.categorias(id),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create clientes table (clients)
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create pdv_config table (PDV configuration)
CREATE TABLE IF NOT EXISTS public.pdv_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    impressora_termica BOOLEAN DEFAULT false,
    papel_80mm BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create conexao table (connections)
CREATE TABLE IF NOT EXISTS public.conexao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdv_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conexao ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (empresa isolation)
CREATE POLICY "Users can only access their company data" ON public.empresas
    FOR ALL USING (id = (auth.jwt() ->> 'empresa_id')::uuid);

CREATE POLICY "Users can only access their company users" ON public.usuarios
    FOR ALL USING (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid);

CREATE POLICY "Users can only access their company categories" ON public.categorias
    FOR ALL USING (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid);

CREATE POLICY "Users can only access their company products" ON public.produtos
    FOR ALL USING (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid);

CREATE POLICY "Users can only access their company clients" ON public.clientes
    FOR ALL USING (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid);

CREATE POLICY "Users can only access their company PDV config" ON public.pdv_config
    FOR ALL USING (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid);

CREATE POLICY "Users can only access their company connections" ON public.conexao
    FOR ALL USING (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_id ON public.usuarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_categorias_empresa_id ON public.categorias(empresa_id);
CREATE INDEX IF NOT EXISTS idx_produtos_empresa_id ON public.produtos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria_id ON public.produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_clientes_empresa_id ON public.clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pdv_config_empresa_id ON public.pdv_config(empresa_id);
CREATE INDEX IF NOT EXISTS idx_conexao_empresa_id ON public.conexao(empresa_id);
