-- Adicionar campo "retirada_balcao_cardapio" na tabela pdv_config
-- Data: 25/07/2025
-- Descrição: Campo para habilitar opção de retirada no balcão no cardápio digital

-- Adicionar campo retirada_balcao_cardapio na tabela pdv_config
ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS retirada_balcao_cardapio BOOLEAN DEFAULT FALSE;

-- Comentário para documentação
COMMENT ON COLUMN pdv_config.retirada_balcao_cardapio IS 'Habilita opção de retirada no balcão no cardápio digital';

-- Atualizar registros existentes para garantir valor padrão
UPDATE pdv_config 
SET retirada_balcao_cardapio = FALSE 
WHERE retirada_balcao_cardapio IS NULL;
