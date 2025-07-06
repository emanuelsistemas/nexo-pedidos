-- Adicionar campos de ordenação do cardápio digital na tabela produtos
-- Data: 2025-07-06
-- Descrição: Adiciona campos para controlar a ordenação dos produtos no cardápio digital

-- Adicionar campo de habilitação da ordenação no cardápio digital
ALTER TABLE produtos
ADD COLUMN IF NOT EXISTS ordenacao_cardapio_habilitada BOOLEAN DEFAULT FALSE;

-- Adicionar campo de ordenação numérica no cardápio digital
ALTER TABLE produtos
ADD COLUMN IF NOT EXISTS ordenacao_cardapio_digital INTEGER DEFAULT NULL;

-- Comentários para documentação
COMMENT ON COLUMN produtos.ordenacao_cardapio_habilitada IS 'Habilita ordenação personalizada do produto no cardápio digital';
COMMENT ON COLUMN produtos.ordenacao_cardapio_digital IS 'Ordem de exibição do produto no cardápio digital (números inteiros, NULL = não ordenado)';

-- Criar índices para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_produtos_ordenacao_cardapio_habilitada ON produtos(ordenacao_cardapio_habilitada);
CREATE INDEX IF NOT EXISTS idx_produtos_ordenacao_cardapio_digital ON produtos(ordenacao_cardapio_digital);

-- Atualizar registros existentes para garantir valores padrão
UPDATE produtos 
SET ordenacao_cardapio_habilitada = FALSE 
WHERE ordenacao_cardapio_habilitada IS NULL;

UPDATE produtos 
SET ordenacao_cardapio_digital = NULL 
WHERE ordenacao_cardapio_digital IS NULL;
