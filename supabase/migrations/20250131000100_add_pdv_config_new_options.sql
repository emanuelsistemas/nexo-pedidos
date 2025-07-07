-- Adicionar novas opções de configuração do PDV
-- Data: 2025-01-31
-- Descrição: Adiciona nove novas opções de configuração para o PDV:
--   1. observacao_no_item - Permite adicionar observações aos itens
--   2. desconto_no_item - Permite aplicar desconto individual em cada item
--   3. desconto_no_total - Permite aplicar desconto no total da venda
--   4. acrescimo_no_item - Permite aplicar acréscimo individual em cada item
--   5. acrescimo_no_total - Permite aplicar acréscimo no total da venda
--   6. quantidade_fracionada - Permite vender quantidades fracionadas (ex: 0.5, 1.25)
--   7. preco_variavel - Permite alterar o preço do produto na venda
--   8. cliente_obrigatorio - Torna obrigatório informar o cliente na venda
--   9. vendedor_obrigatorio - Torna obrigatório informar o vendedor na venda

-- Adicionar as novas colunas na tabela pdv_config
ALTER TABLE public.pdv_config 
ADD COLUMN IF NOT EXISTS observacao_no_item BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS desconto_no_item BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS desconto_no_total BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS acrescimo_no_item BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS acrescimo_no_total BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS quantidade_fracionada BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS preco_variavel BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cliente_obrigatorio BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS vendedor_obrigatorio BOOLEAN DEFAULT false;

-- Adicionar comentários para documentar as colunas
COMMENT ON COLUMN public.pdv_config.observacao_no_item IS 'Permite adicionar observações aos itens da venda';
COMMENT ON COLUMN public.pdv_config.desconto_no_item IS 'Permite aplicar desconto individual em cada item';
COMMENT ON COLUMN public.pdv_config.desconto_no_total IS 'Permite aplicar desconto no total da venda';
COMMENT ON COLUMN public.pdv_config.acrescimo_no_item IS 'Permite aplicar acréscimo individual em cada item';
COMMENT ON COLUMN public.pdv_config.acrescimo_no_total IS 'Permite aplicar acréscimo no total da venda';
COMMENT ON COLUMN public.pdv_config.quantidade_fracionada IS 'Permite vender quantidades fracionadas (ex: 0.5, 1.25)';
COMMENT ON COLUMN public.pdv_config.preco_variavel IS 'Permite alterar o preço do produto na venda';
COMMENT ON COLUMN public.pdv_config.cliente_obrigatorio IS 'Torna obrigatório informar o cliente na venda';
COMMENT ON COLUMN public.pdv_config.vendedor_obrigatorio IS 'Torna obrigatório informar o vendedor na venda';

-- Atualizar registros existentes com valores padrão (opcional)
-- Você pode personalizar estes valores conforme necessário
UPDATE public.pdv_config 
SET 
    observacao_no_item = false,
    desconto_no_item = true,
    desconto_no_total = true,
    acrescimo_no_item = false,
    acrescimo_no_total = false,
    quantidade_fracionada = false,
    preco_variavel = false,
    cliente_obrigatorio = false,
    vendedor_obrigatorio = false
WHERE 
    observacao_no_item IS NULL OR
    desconto_no_item IS NULL OR
    desconto_no_total IS NULL OR
    acrescimo_no_item IS NULL OR
    acrescimo_no_total IS NULL OR
    quantidade_fracionada IS NULL OR
    preco_variavel IS NULL OR
    cliente_obrigatorio IS NULL OR
    vendedor_obrigatorio IS NULL;
