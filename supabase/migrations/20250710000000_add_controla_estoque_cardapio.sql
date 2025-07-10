-- Adicionar campo controla_estoque_cardapio na tabela pdv_config
-- Data: 10/07/2025
-- Descrição: Campo para controlar se o estoque deve ser verificado no cardápio digital

ALTER TABLE pdv_config 
ADD COLUMN IF NOT EXISTS controla_estoque_cardapio BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN pdv_config.controla_estoque_cardapio IS 'Indica se deve controlar estoque no cardápio digital - produtos sem estoque ficam indisponíveis';
