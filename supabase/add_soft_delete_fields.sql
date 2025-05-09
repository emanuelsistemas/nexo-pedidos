-- Adiciona campos de soft delete para as tabelas especificadas
-- Campos:
-- - deletado: boolean (default: false)
-- - data_deletacao: timestamp with time zone
-- - user_deletacao: uuid (referencia a tabela de usuários)

-- Tabela: grupo
ALTER TABLE IF EXISTS public.grupo
  ADD COLUMN IF NOT EXISTS deletado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_deletacao TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS user_deletacao UUID REFERENCES auth.users(id);

-- Tabela: opcoes_adicionais
ALTER TABLE IF EXISTS public.opcoes_adicionais
  ADD COLUMN IF NOT EXISTS deletado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_deletacao TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS user_deletacao UUID REFERENCES auth.users(id);

-- Tabela: opcoes_adicionais_itens
ALTER TABLE IF EXISTS public.opcoes_adicionais_itens
  ADD COLUMN IF NOT EXISTS deletado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_deletacao TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS user_deletacao UUID REFERENCES auth.users(id);

-- Tabela: pedidos
ALTER TABLE IF EXISTS public.pedidos
  ADD COLUMN IF NOT EXISTS deletado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_deletacao TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS user_deletacao UUID REFERENCES auth.users(id);

-- Tabela: pedidos_itens
ALTER TABLE IF EXISTS public.pedidos_itens
  ADD COLUMN IF NOT EXISTS deletado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_deletacao TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS user_deletacao UUID REFERENCES auth.users(id);

-- Tabela: pedidos_itens_adicionais
ALTER TABLE IF EXISTS public.pedidos_itens_adicionais
  ADD COLUMN IF NOT EXISTS deletado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_deletacao TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS user_deletacao UUID REFERENCES auth.users(id);

-- Tabela: produtos
ALTER TABLE IF EXISTS public.produtos
  ADD COLUMN IF NOT EXISTS deletado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_deletacao TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS user_deletacao UUID REFERENCES auth.users(id);

-- Tabela: produtos_opcoes_adicionais
ALTER TABLE IF EXISTS public.produtos_opcoes_adicionais
  ADD COLUMN IF NOT EXISTS deletado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_deletacao TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS user_deletacao UUID REFERENCES auth.users(id);

-- Tabela: produtos_opcoes_adicionais_itens
ALTER TABLE IF EXISTS public.produtos_opcoes_adicionais_itens
  ADD COLUMN IF NOT EXISTS deletado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_deletacao TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS user_deletacao UUID REFERENCES auth.users(id);
