-- Adicionar campo para exibir fotos minimizadas no cardápio digital
-- Data: 2025-07-05
-- Descrição: Adiciona campo para controlar exibição de fotos ao lado dos itens no carrinho do cardápio digital

-- Adicionar campo cardapio_fotos_minimizadas na tabela pdv_config
ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS cardapio_fotos_minimizadas BOOLEAN DEFAULT FALSE;

-- Comentário para documentação
COMMENT ON COLUMN pdv_config.cardapio_fotos_minimizadas IS 'Exibe fotos dos produtos ao lado dos itens no carrinho do cardápio digital, similar ao PDV';

-- Atualizar registros existentes para garantir valor padrão
UPDATE pdv_config 
SET cardapio_fotos_minimizadas = FALSE 
WHERE cardapio_fotos_minimizadas IS NULL;
