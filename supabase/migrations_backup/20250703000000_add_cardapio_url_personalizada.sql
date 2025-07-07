-- Adicionar campo URL personalizada do cardápio digital
-- Data: 2025-07-03
-- Descrição: Adiciona campo para armazenar URL personalizada do cardápio digital

-- Adicionar campo cardapio_url_personalizada na tabela pdv_config
ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS cardapio_url_personalizada VARCHAR(100) DEFAULT '';

-- Comentário para documentação
COMMENT ON COLUMN pdv_config.cardapio_url_personalizada IS 'URL personalizada para o cardápio digital (ex: minha-loja)';
