-- Adicionar campo delivery_local na tabela pdv
-- Data: 26/07/2025
-- Descrição: Adiciona campo para identificar vendas de delivery local

-- Adicionar campo delivery_local como BOOLEAN na tabela pdv
ALTER TABLE pdv
ADD COLUMN IF NOT EXISTS delivery_local BOOLEAN DEFAULT FALSE;

-- Comentário para documentação
COMMENT ON COLUMN pdv.delivery_local IS 'Indica se a venda foi realizada com delivery local habilitado';

-- Criar índice para consultas rápidas de pedidos delivery local
CREATE INDEX IF NOT EXISTS idx_pdv_delivery_local ON pdv(delivery_local) WHERE delivery_local = TRUE;

-- Comentário na tabela
COMMENT ON TABLE pdv IS 'Tabela principal de vendas do PDV com suporte a delivery local';
