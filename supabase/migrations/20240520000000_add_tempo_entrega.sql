-- Adiciona o campo tempo_entrega na tabela taxa_entrega
ALTER TABLE taxa_entrega ADD COLUMN tempo_entrega INTEGER;
COMMENT ON COLUMN taxa_entrega.tempo_entrega IS 'Tempo estimado de entrega em minutos';
