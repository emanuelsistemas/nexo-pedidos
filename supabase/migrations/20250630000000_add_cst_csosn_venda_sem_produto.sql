-- Adicionar campos CST e CSOSN diretos para venda sem produto
-- Data: 2025-06-30
-- Descrição: Adiciona campos diretos para CST e CSOSN na configuração de venda sem produto

-- Adicionar campos CST e CSOSN diretos na tabela pdv_config
ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS venda_sem_produto_cst VARCHAR(2) DEFAULT NULL;

ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS venda_sem_produto_csosn VARCHAR(3) DEFAULT NULL;

-- Adicionar campo para exibir dados fiscais na venda (debug)
-- Data: 2025-07-01
-- Descrição: Campo para habilitar exibição de dados fiscais no carrinho do PDV
ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS exibir_dados_fiscais_venda BOOLEAN DEFAULT FALSE;

-- Comentários para documentação
COMMENT ON COLUMN pdv_config.venda_sem_produto_cst IS 'CST (Código de Situação Tributária) para venda sem produto - usado quando empresa está no Regime Normal';
COMMENT ON COLUMN pdv_config.venda_sem_produto_csosn IS 'CSOSN (Código de Situação da Operação no Simples Nacional) para venda sem produto - usado quando empresa está no Simples Nacional';

-- Migrar dados existentes baseado na situacao_tributaria atual
-- Para empresas no Simples Nacional (regime_tributario = 1)
UPDATE pdv_config 
SET venda_sem_produto_csosn = CASE 
    WHEN venda_sem_produto_situacao_tributaria = 'tributado_integral' THEN '102'
    WHEN venda_sem_produto_situacao_tributaria = 'st' THEN '500'
    ELSE '102'
END
WHERE empresa_id IN (
    SELECT id FROM empresas WHERE regime_tributario = 1
);

-- Para empresas no Regime Normal (regime_tributario != 1)
UPDATE pdv_config 
SET venda_sem_produto_cst = CASE 
    WHEN venda_sem_produto_situacao_tributaria = 'tributado_integral' THEN '00'
    WHEN venda_sem_produto_situacao_tributaria = 'st' THEN '60'
    ELSE '00'
END
WHERE empresa_id IN (
    SELECT id FROM empresas WHERE regime_tributario != 1
);
