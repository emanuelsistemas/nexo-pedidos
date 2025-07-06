-- Adicionar campo "trabalha_com_pizzas" na tabela pdv_config
-- Este campo será usado para configurar se a empresa trabalha com pizzas no cardápio digital

ALTER TABLE pdv_config
ADD COLUMN trabalha_com_pizzas BOOLEAN DEFAULT FALSE;

-- Comentário para documentar o campo
COMMENT ON COLUMN pdv_config.trabalha_com_pizzas IS 'Indica se a empresa trabalha com pizzas no cardápio digital';

-- Adicionar campo "pizza" na tabela produtos
-- Este campo será usado para identificar produtos que são pizzas

ALTER TABLE produtos
ADD COLUMN IF NOT EXISTS pizza BOOLEAN DEFAULT FALSE;

-- Comentário para documentar o campo
COMMENT ON COLUMN produtos.pizza IS 'Indica se o produto é uma pizza';

-- Adicionar campo "cardapio_digital" na tabela produtos
-- Este campo será usado para controlar se o produto aparece no cardápio digital

ALTER TABLE produtos
ADD COLUMN IF NOT EXISTS cardapio_digital BOOLEAN DEFAULT FALSE;

-- Comentário para documentar o campo
COMMENT ON COLUMN produtos.cardapio_digital IS 'Indica se o produto aparece no cardápio digital';
