-- Adicionar novas opções de configuração do PDV
-- Data: 2025-01-31
-- Descrição: Adiciona nove novas opções de configuração para o PDV:
--   1. observacao_no_item - Permite adicionar observações aos itens
--   2. desconto_no_item - Permite aplicar desconto individual em cada item
--   3. editar_nome_produto - Permite editar o nome do produto durante a venda
--   4-9. Controles de exibição dos botões de finalização (lógica invertida)

-- Adicionar novos campos na tabela pdv_config
ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS observacao_no_item BOOLEAN DEFAULT FALSE;

ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS desconto_no_item BOOLEAN DEFAULT FALSE;

ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS editar_nome_produto BOOLEAN DEFAULT FALSE;

-- Campos para controlar botões de finalização (lógica invertida: true = oculta)
ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS ocultar_finalizar_com_impressao BOOLEAN DEFAULT FALSE;

ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS ocultar_finalizar_sem_impressao BOOLEAN DEFAULT FALSE;

ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS ocultar_nfce_com_impressao BOOLEAN DEFAULT FALSE;

ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS ocultar_nfce_sem_impressao BOOLEAN DEFAULT FALSE;

ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS ocultar_nfce_producao BOOLEAN DEFAULT FALSE;

ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS ocultar_producao BOOLEAN DEFAULT FALSE;

ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS fiado BOOLEAN DEFAULT FALSE;

-- Campo para habilitar desconto no total da venda
ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS desconto_no_total BOOLEAN DEFAULT FALSE;

-- Campos para armazenar valores de desconto detalhados na tabela pdv
ALTER TABLE pdv
ADD COLUMN IF NOT EXISTS valor_desconto_itens NUMERIC DEFAULT 0;

ALTER TABLE pdv
ADD COLUMN IF NOT EXISTS valor_desconto_total NUMERIC DEFAULT 0;

-- Campo para habilitar venda sem produto
ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS venda_sem_produto BOOLEAN DEFAULT FALSE;

-- Campos fiscais para venda sem produto
ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS venda_sem_produto_ncm VARCHAR(8) DEFAULT '22021000';

ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS venda_sem_produto_cfop VARCHAR(4) DEFAULT '5102';

ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS venda_sem_produto_origem INTEGER DEFAULT 0;

ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS venda_sem_produto_situacao_tributaria VARCHAR(50) DEFAULT 'tributado_integral';

ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS venda_sem_produto_cest VARCHAR(7) DEFAULT '';

ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS venda_sem_produto_margem_st NUMERIC DEFAULT NULL;

ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS venda_sem_produto_aliquota_icms NUMERIC DEFAULT 18.0;

ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS venda_sem_produto_aliquota_pis NUMERIC DEFAULT 1.65;

ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS venda_sem_produto_aliquota_cofins NUMERIC DEFAULT 7.6;

ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS venda_sem_produto_peso_liquido NUMERIC DEFAULT 0;

-- Comentários para documentação
COMMENT ON COLUMN pdv_config.observacao_no_item IS 'Permite adicionar observações personalizadas aos itens durante a venda no PDV';
COMMENT ON COLUMN pdv_config.desconto_no_item IS 'Permite aplicar desconto individual em cada item durante a venda no PDV';
COMMENT ON COLUMN pdv_config.editar_nome_produto IS 'Permite editar o nome do produto durante a venda no PDV para personalização';
COMMENT ON COLUMN pdv_config.fiado IS 'Habilita a opção de venda fiado no PDV';
COMMENT ON COLUMN pdv_config.ocultar_finalizar_com_impressao IS 'Se true, oculta o botão "Finalizar com Impressão" na finalização do PDV';
COMMENT ON COLUMN pdv_config.ocultar_finalizar_sem_impressao IS 'Se true, oculta o botão "Finalizar sem Impressão" na finalização do PDV';
COMMENT ON COLUMN pdv_config.ocultar_nfce_com_impressao IS 'Se true, oculta o botão "NFC-e com Impressão" na finalização do PDV';
COMMENT ON COLUMN pdv_config.ocultar_nfce_sem_impressao IS 'Se true, oculta o botão "NFC-e sem Impressão" na finalização do PDV';
COMMENT ON COLUMN pdv_config.ocultar_nfce_producao IS 'Se true, oculta o botão "NFC-e + Produção" na finalização do PDV';
COMMENT ON COLUMN pdv_config.ocultar_producao IS 'Se true, oculta o botão "Produção" na finalização do PDV';
