-- Adicionar campos para controle de abertura da loja no cardápio digital
-- Data: 2025-07-04
-- Descrição: Adiciona campos para controlar se a loja abre automaticamente ou manualmente

-- Adicionar campo para tipo de abertura (automatico ou manual)
ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS cardapio_abertura_tipo VARCHAR(20) DEFAULT 'automatico';

-- Adicionar campo para status atual da loja (aberta ou fechada)
ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS cardapio_loja_aberta BOOLEAN DEFAULT true;

-- Comentários para documentação
COMMENT ON COLUMN pdv_config.cardapio_abertura_tipo IS 'Tipo de abertura da loja no cardápio: automatico (por horário) ou manual';
COMMENT ON COLUMN pdv_config.cardapio_loja_aberta IS 'Status atual da loja no cardápio digital: true = aberta, false = fechada';

-- Atualizar registros existentes para garantir valores padrão
UPDATE pdv_config 
SET cardapio_abertura_tipo = 'automatico', 
    cardapio_loja_aberta = true 
WHERE cardapio_abertura_tipo IS NULL 
   OR cardapio_loja_aberta IS NULL;
