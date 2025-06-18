-- Migração: Adicionar campo vendas_itens_multiplicacao à tabela pdv_config
-- Data: 2024-12-18
-- Descrição: Adiciona o campo vendas_itens_multiplicacao com valor padrão false

-- Verificar se a coluna já existe antes de adicionar
DO $$
BEGIN
    -- Verificar se a coluna vendas_itens_multiplicacao já existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pdv_config' 
        AND column_name = 'vendas_itens_multiplicacao'
    ) THEN
        -- Adicionar a coluna vendas_itens_multiplicacao
        ALTER TABLE pdv_config 
        ADD COLUMN vendas_itens_multiplicacao BOOLEAN DEFAULT false;
        
        RAISE NOTICE 'Coluna vendas_itens_multiplicacao adicionada à tabela pdv_config com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna vendas_itens_multiplicacao já existe na tabela pdv_config.';
    END IF;
END $$;

-- Comentário da coluna para documentação
COMMENT ON COLUMN pdv_config.vendas_itens_multiplicacao IS 'Habilita a funcionalidade de venda de produtos usando multiplicação de quantidade no PDV';

-- Verificar o resultado
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'pdv_config' 
AND column_name = 'vendas_itens_multiplicacao';
