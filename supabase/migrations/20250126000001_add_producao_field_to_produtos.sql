/*
  # Adicionar campo producao à tabela produtos

  1. Mudança na tabela produtos:
    - Adicionar campo `producao` do tipo BOOLEAN
    - Campo indica se o produto deve aparecer na impressão de produção
    - Padrão FALSE para produtos existentes
    
  2. Funcionalidades:
    - Controlar quais produtos aparecem na impressão de produção
    - Filtrar produtos para impressão específica de cozinha/produção
    - Organizar melhor o fluxo de produção
    
  3. Uso:
    - TRUE: Produto aparece na impressão de produção (ex: Hambúrguer, Pizza, Prato Executivo)
    - FALSE: Produto não aparece na impressão de produção (ex: Refrigerante, Água)
*/

-- =====================================================
-- ADICIONAR CAMPO PRODUCAO À TABELA PRODUTOS
-- =====================================================

-- Adicionar campo producao como BOOLEAN com padrão FALSE
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS producao BOOLEAN DEFAULT FALSE;

-- =====================================================
-- ÍNDICE PARA PERFORMANCE EM CONSULTAS
-- =====================================================

-- Índice para consultas eficientes de produtos que são para produção
CREATE INDEX IF NOT EXISTS idx_produtos_producao ON produtos (producao) WHERE producao = TRUE;

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON COLUMN produtos.producao IS 'Indica se o produto deve aparecer na impressão de funções que tenham impressão para produção. TRUE = aparece na impressão de produção, FALSE = não aparece';

-- =====================================================
-- EXEMPLO DE USO
-- =====================================================

/*
Exemplos de como o campo producao será usado:

-- Marcar produtos que devem aparecer na impressão de produção
UPDATE produtos 
SET producao = TRUE 
WHERE nome IN ('Hambúrguer Artesanal', 'Pizza Margherita', 'Prato Executivo', 'Lasanha Bolonhesa');

-- Produtos que NÃO devem aparecer na impressão de produção (mantém FALSE)
-- Exemplos: Refrigerante, Água, Cerveja, Sobremesas prontas

-- Consultar produtos para impressão de produção
SELECT id, nome, codigo 
FROM produtos 
WHERE producao = TRUE 
  AND ativo = TRUE 
  AND deletado = FALSE
  AND empresa_id = 'uuid-da-empresa'
ORDER BY nome;

-- Consultar produtos que não precisam de produção
SELECT id, nome, codigo 
FROM produtos 
WHERE producao = FALSE 
  AND ativo = TRUE 
  AND deletado = FALSE
  AND empresa_id = 'uuid-da-empresa'
ORDER BY nome;
*/
