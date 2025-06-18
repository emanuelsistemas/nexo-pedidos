-- Adicionar campos de configuração para cupom "Finalizar com Impressão"
-- Data: 2025-06-18
-- Descrição: Adiciona campos para controlar quais informações aparecem no cupom não fiscal

-- Adicionar campos de configuração do cupom finalizar na tabela pdv_config
ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS mostrar_razao_social_cupom_finalizar BOOLEAN DEFAULT false;

ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS mostrar_endereco_cupom_finalizar BOOLEAN DEFAULT false;

ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS mostrar_operador_cupom_finalizar BOOLEAN DEFAULT false;

-- Comentários para documentação
COMMENT ON COLUMN pdv_config.mostrar_razao_social_cupom_finalizar IS 'Controla se a razão social da empresa aparece no cupom "Finalizar com Impressão"';
COMMENT ON COLUMN pdv_config.mostrar_endereco_cupom_finalizar IS 'Controla se o endereço da empresa aparece no cupom "Finalizar com Impressão"';
COMMENT ON COLUMN pdv_config.mostrar_operador_cupom_finalizar IS 'Controla se o operador/vendedor aparece no cupom "Finalizar com Impressão"';
