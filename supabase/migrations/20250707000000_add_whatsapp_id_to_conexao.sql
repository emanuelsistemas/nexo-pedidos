ALTER TABLE public.conexao
ADD COLUMN IF NOT EXISTS whatsapp_id TEXT NULL;

COMMENT ON COLUMN public.conexao.whatsapp_id IS 'Armazena o WID (WhatsApp ID, ex: 55119XXXXXXXX@c.us) da sessão do WhatsApp conectada. Usado para reassociar sessões ativas após reinícios do servidor.';
 
-- Opcional: Adicionar um índice se você for frequentemente buscar por esta coluna
-- CREATE INDEX IF NOT EXISTS idx_conexao_whatsapp_id ON public.conexao (whatsapp_id); 
