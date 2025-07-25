-- Adicionar campos de automação para cardápio digital na tabela pdv_config
-- Data: 25/07/2025
-- Descrição: Campos para controlar impressão automática e aceitar pedidos automaticamente no cardápio digital

-- Adicionar campo impressao_automatica_cardapio na tabela pdv_config
ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS impressao_automatica_cardapio BOOLEAN DEFAULT FALSE;

-- Adicionar campo aceitar_pedido_automatico_cardapio na tabela pdv_config
ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS aceitar_pedido_automatico_cardapio BOOLEAN DEFAULT FALSE;

-- Comentários para documentação
COMMENT ON COLUMN pdv_config.impressao_automatica_cardapio IS 'Habilita impressão automática quando novos pedidos chegam do cardápio digital';
COMMENT ON COLUMN pdv_config.aceitar_pedido_automatico_cardapio IS 'Aceita automaticamente pedidos do cardápio digital sem intervenção manual';

-- Atualizar registros existentes para garantir valor padrão
UPDATE pdv_config 
SET impressao_automatica_cardapio = FALSE 
WHERE impressao_automatica_cardapio IS NULL;

UPDATE pdv_config 
SET aceitar_pedido_automatico_cardapio = FALSE 
WHERE aceitar_pedido_automatico_cardapio IS NULL;
