-- Adicionar campo conectado à tabela conexao
ALTER TABLE IF EXISTS public.conexao 
ADD COLUMN IF NOT EXISTS conectado BOOLEAN DEFAULT false;

-- Adicionar campo última_verificação para rastrear quando o status foi verificado pela última vez
ALTER TABLE IF EXISTS public.conexao 
ADD COLUMN IF NOT EXISTS ultima_verificacao TIMESTAMP WITH TIME ZONE;

-- Adicionar campo id_sessao para vincular a conexão à sessão específica do WhatsApp
ALTER TABLE IF EXISTS public.conexao 
ADD COLUMN IF NOT EXISTS id_sessao TEXT;
