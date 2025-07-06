-- Adicionar campos de ordenação do cardápio digital na tabela grupos
-- Data: 2025-07-06
-- Descrição: Adiciona campos para controlar a ordenação dos grupos no cardápio digital

-- Adicionar campo de habilitação da ordenação no cardápio digital
ALTER TABLE grupos
ADD COLUMN IF NOT EXISTS ordenacao_cardapio_habilitada BOOLEAN DEFAULT FALSE;

-- Adicionar campo de ordenação numérica no cardápio digital
ALTER TABLE grupos
ADD COLUMN IF NOT EXISTS ordenacao_cardapio_digital INTEGER DEFAULT NULL;

-- Comentários para documentação
COMMENT ON COLUMN grupos.ordenacao_cardapio_habilitada IS 'Habilita ordenação personalizada do grupo no cardápio digital';
COMMENT ON COLUMN grupos.ordenacao_cardapio_digital IS 'Ordem de exibição do grupo no cardápio digital (números inteiros, NULL = não ordenado)';

-- Criar índices para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_grupos_ordenacao_cardapio_habilitada ON grupos(ordenacao_cardapio_habilitada);
CREATE INDEX IF NOT EXISTS idx_grupos_ordenacao_cardapio_digital ON grupos(ordenacao_cardapio_digital);

-- Atualizar registros existentes para garantir valores padrão
UPDATE grupos
SET ordenacao_cardapio_habilitada = FALSE
WHERE ordenacao_cardapio_habilitada IS NULL;

UPDATE grupos
SET ordenacao_cardapio_digital = NULL
WHERE ordenacao_cardapio_digital IS NULL;
