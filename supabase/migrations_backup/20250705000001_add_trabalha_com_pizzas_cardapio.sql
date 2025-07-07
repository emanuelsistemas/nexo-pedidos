-- Adicionar campo "trabalha_com_pizzas" na tabela pdv_config
-- Este campo será usado para configurar se a empresa trabalha com pizzas no cardápio digital

ALTER TABLE pdv_config
ADD COLUMN trabalha_com_pizzas BOOLEAN DEFAULT FALSE;

-- Comentário para documentar o campo
COMMENT ON COLUMN pdv_config.trabalha_com_pizzas IS 'Indica se a empresa trabalha com pizzas no cardápio digital';

-- Adicionar campo "pizza" na tabela produtos
-- Este campo será usado para identificar produtos que são pizzas
ALTER TABLE produtos
ADD COLUMN pizza BOOLEAN DEFAULT FALSE;

-- Comentário para documentar o campo
COMMENT ON COLUMN produtos.pizza IS 'Indica se o produto é uma pizza (usado no cardápio digital)';

-- Criar índice para melhorar performance nas consultas de pizzas
CREATE INDEX IF NOT EXISTS idx_produtos_pizza ON produtos(pizza) WHERE pizza = TRUE;

-- Atualizar produtos existentes que são pizzas (baseado na categoria)
-- Esta query é opcional e pode ser ajustada conforme sua estrutura de dados
UPDATE produtos 
SET pizza = TRUE 
WHERE categoria_id IN (
    SELECT id FROM categorias 
    WHERE LOWER(nome) LIKE '%pizza%'
);
