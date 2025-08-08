-- Adicionar opção de Consumo Interno ao PDV
-- Data: 2025-08-08
-- Descrição: Adiciona campo consumo_interno na tabela pdv_config para permitir
--            baixa de estoque de produtos para consumo interno da empresa

-- Adicionar a nova coluna na tabela pdv_config
ALTER TABLE public.pdv_config 
ADD COLUMN IF NOT EXISTS consumo_interno BOOLEAN DEFAULT false;

-- Adicionar comentário para documentar a coluna
COMMENT ON COLUMN public.pdv_config.consumo_interno IS 'Permite realizar baixa de estoque para consumo interno da empresa';

-- Atualizar registros existentes com valor padrão false (opcional)
UPDATE public.pdv_config 
SET consumo_interno = false
WHERE consumo_interno IS NULL;
