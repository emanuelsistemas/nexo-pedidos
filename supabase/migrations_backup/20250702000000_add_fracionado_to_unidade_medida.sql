-- Adicionar campo fracionado à tabela unidade_medida
-- Este campo indica se a unidade de medida permite valores fracionados (decimais)

-- Adicionar a coluna fracionado com valor padrão FALSE
ALTER TABLE unidade_medida 
ADD COLUMN IF NOT EXISTS fracionado BOOLEAN DEFAULT FALSE;

-- Criar índice para melhor performance nas consultas por fracionado
CREATE INDEX IF NOT EXISTS idx_unidade_medida_fracionado ON unidade_medida(fracionado);

-- Comentário para documentação
COMMENT ON COLUMN unidade_medida.fracionado IS 'Indica se a unidade de medida permite valores fracionados/decimais (ex: KG, L = true; UN, PC = false)';

-- Atualizar algumas unidades comuns para valores apropriados
-- Unidades que tipicamente permitem fracionamento
UPDATE unidade_medida 
SET fracionado = TRUE 
WHERE UPPER(sigla) IN ('KG', 'G', 'L', 'ML', 'M', 'CM', 'MM', 'M2', 'M3', 'T', 'LT');

-- Unidades que tipicamente NÃO permitem fracionamento
UPDATE unidade_medida 
SET fracionado = FALSE 
WHERE UPPER(sigla) IN ('UN', 'PC', 'PÇ', 'CX', 'PCT', 'DZ', 'CJ', 'PAR', 'UNID', 'PEÇA');

-- Log da migration
INSERT INTO public.migration_log (migration_name, executed_at, description) 
VALUES (
    '20250702000000_add_fracionado_to_unidade_medida',
    NOW(),
    'Adicionado campo fracionado à tabela unidade_medida para controlar se permite valores decimais'
) ON CONFLICT (migration_name) DO NOTHING;
