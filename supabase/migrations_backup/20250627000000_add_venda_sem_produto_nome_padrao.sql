-- Adicionar campo para descrição padrão de venda sem produto
ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS venda_sem_produto_nome_padrao VARCHAR(255) DEFAULT 'Diversos';

-- Comentário explicativo
COMMENT ON COLUMN pdv_config.venda_sem_produto_nome_padrao IS 'Descrição padrão que aparece no placeholder do campo de venda sem produto';
