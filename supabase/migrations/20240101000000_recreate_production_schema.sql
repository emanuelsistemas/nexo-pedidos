-- Recreate production schema for preview branches
-- This migration recreates the essential structure from production

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create empresas table
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

-- Create usuarios table
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    tipo TEXT DEFAULT 'vendedor',
    ativo BOOLEAN DEFAULT true,
    serie_nfce INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create categorias table
CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    ativo BOOLEAN DEFAULT true,
    ordenacao INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create produtos table
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    preco DECIMAL(10,2) NOT NULL DEFAULT 0,
    categoria_id UUID REFERENCES public.categorias(id),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    ativo BOOLEAN DEFAULT true,
    pizza BOOLEAN DEFAULT false,
    ordenacao INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create clientes table
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    estado TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create pdv_config table
CREATE TABLE IF NOT EXISTS public.pdv_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    impressora_termica BOOLEAN DEFAULT false,
    papel_80mm BOOLEAN DEFAULT true,
    trabalha_com_pizzas BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create conexao table
CREATE TABLE IF NOT EXISTS public.conexao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true,
    whatsapp_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vendas table (basic structure)
CREATE TABLE IF NOT EXISTS public.vendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES public.clientes(id),
    usuario_id UUID REFERENCES public.usuarios(id),
    total DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'pendente',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create venda_itens table
CREATE TABLE IF NOT EXISTS public.venda_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES public.produtos(id),
    quantidade DECIMAL(10,3) DEFAULT 1,
    preco_unitario DECIMAL(10,2) DEFAULT 0,
    subtotal DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdv_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conexao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venda_itens ENABLE ROW LEVEL SECURITY;

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_id ON public.usuarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_categorias_empresa_id ON public.categorias(empresa_id);
CREATE INDEX IF NOT EXISTS idx_produtos_empresa_id ON public.produtos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria_id ON public.produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_clientes_empresa_id ON public.clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pdv_config_empresa_id ON public.pdv_config(empresa_id);
CREATE INDEX IF NOT EXISTS idx_conexao_empresa_id ON public.conexao(empresa_id);
CREATE INDEX IF NOT EXISTS idx_vendas_empresa_id ON public.vendas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_venda_itens_venda_id ON public.venda_itens(venda_id);
