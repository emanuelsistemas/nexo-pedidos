/*
  # Adicionar campo materia_prima à tabela produtos

  1. Mudança na tabela produtos:
    - Adicionar campo `materia_prima` do tipo BOOLEAN
    - Campo indica se o produto pode ser usado como matéria-prima/insumo
    - Padrão FALSE para produtos existentes
    
  2. Funcionalidades:
    - Filtrar produtos no modal de seleção de insumos
    - Organizar melhor o estoque entre produtos finais e matérias-primas
    - Facilitar relatórios de consumo de insumos
    
  3. Uso:
    - TRUE: Produto pode ser usado como insumo (ex: Arroz, Feijão, Carne)
    - FALSE: Produto final para venda (ex: Prato Executivo, Hambúrguer)
*/

-- =====================================================
-- ADICIONAR CAMPO MATERIA_PRIMA À TABELA PRODUTOS
-- =====================================================

-- Adicionar campo materia_prima como BOOLEAN com padrão FALSE
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS materia_prima BOOLEAN DEFAULT FALSE;

-- =====================================================
-- ÍNDICE PARA PERFORMANCE EM CONSULTAS
-- =====================================================

-- Índice para consultas eficientes de produtos que são matéria-prima
CREATE INDEX IF NOT EXISTS idx_produtos_materia_prima ON produtos (materia_prima) WHERE materia_prima = TRUE;

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON COLUMN produtos.materia_prima IS 'Indica se o produto pode ser usado como matéria-prima/insumo para outros produtos. TRUE = pode ser insumo, FALSE = produto final';

-- =====================================================
-- EXEMPLO DE USO
-- =====================================================

/*
Exemplos de como o campo materia_prima será usado:

-- Marcar produtos como matéria-prima
UPDATE produtos 
SET materia_prima = TRUE 
WHERE nome IN ('Arroz Branco 5kg', 'Feijão Preto 1kg', 'Carne Bovina 1kg', 'Óleo de Soja 900ml');

-- Consultar apenas produtos que podem ser usados como insumos
SELECT id, nome, unidade_medida, estoque_atual 
FROM produtos 
WHERE materia_prima = TRUE 
AND empresa_id = 'uuid-da-empresa'
ORDER BY nome;

-- Consultar produtos finais (não são matéria-prima)
SELECT id, nome, preco_venda 
FROM produtos 
WHERE materia_prima = FALSE 
AND empresa_id = 'uuid-da-empresa'
ORDER BY nome;
*/
