-- Adicionar campo "exibir_desconto_qtd_minimo_no_cardapio_digital" na tabela produtos
-- Data: 11/07/2025
-- Descrição: Campo para controlar se o desconto por quantidade mínima deve ser exibido no cardápio digital

-- Adicionar campo exibir_desconto_qtd_minimo_no_cardapio_digital na tabela produtos
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS exibir_desconto_qtd_minimo_no_cardapio_digital BOOLEAN DEFAULT FALSE;

-- Comentário para documentação
COMMENT ON COLUMN produtos.exibir_desconto_qtd_minimo_no_cardapio_digital IS 'Indica se o desconto por quantidade mínima deve ser exibido no cardápio digital público';

-- Criar índice para consultas por produtos com desconto por quantidade no cardápio digital
CREATE INDEX IF NOT EXISTS idx_produtos_exibir_desconto_qtd_cardapio 
ON produtos(exibir_desconto_qtd_minimo_no_cardapio_digital) 
WHERE exibir_desconto_qtd_minimo_no_cardapio_digital = true;

-- Atualizar registros existentes para garantir valor padrão
UPDATE produtos 
SET exibir_desconto_qtd_minimo_no_cardapio_digital = FALSE 
WHERE exibir_desconto_qtd_minimo_no_cardapio_digital IS NULL;
