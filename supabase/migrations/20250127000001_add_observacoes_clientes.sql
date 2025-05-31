-- Adicionar campos de observação na tabela clientes
-- Data: 27/01/2025
-- Descrição: Adiciona campos para observações NFe e observações internas

ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS observacao_nfe TEXT,
ADD COLUMN IF NOT EXISTS observacao_interna TEXT;

-- Comentários para documentação
COMMENT ON COLUMN clientes.observacao_nfe IS 'Observações que aparecerão na NFe quando emitida para este cliente';
COMMENT ON COLUMN clientes.observacao_interna IS 'Observações internas sobre o cliente, não aparece em documentos';
