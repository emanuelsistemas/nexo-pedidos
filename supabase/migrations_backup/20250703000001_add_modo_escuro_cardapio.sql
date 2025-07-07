-- Adicionar campo modo escuro para cardápio digital
-- Data: 2025-07-03
-- Descrição: Adiciona campo para controlar tema escuro do cardápio digital

-- Adicionar campo modo_escuro_cardapio na tabela pdv_config
ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS modo_escuro_cardapio BOOLEAN DEFAULT FALSE;

-- Comentário para documentação
COMMENT ON COLUMN pdv_config.modo_escuro_cardapio IS 'Habilita tema escuro no cardápio digital público';
