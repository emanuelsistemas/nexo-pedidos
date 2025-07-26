-- Adicionar campo "solicitar_nome_cliente" na tabela pdv_config
-- Data: 26/07/2025
-- Descrição: Campo para habilitar solicitação obrigatória do nome do cliente no PDV

-- Adicionar campo solicitar_nome_cliente na tabela pdv_config
ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS solicitar_nome_cliente BOOLEAN DEFAULT FALSE;

-- Comentário para documentação
COMMENT ON COLUMN pdv_config.solicitar_nome_cliente IS 'Torna obrigatório informar o nome do cliente antes de finalizar a venda no PDV';

-- Atualizar registros existentes para garantir valor padrão
UPDATE pdv_config 
SET solicitar_nome_cliente = FALSE 
WHERE solicitar_nome_cliente IS NULL;
