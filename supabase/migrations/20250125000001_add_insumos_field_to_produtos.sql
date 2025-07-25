/*
  # Adicionar campo insumos à tabela produtos

  1. Mudança na tabela produtos:
    - Adicionar campo `insumos` do tipo JSONB
    - Campo armazenará array com composição do produto
    - Cada item terá: produto_id, nome, quantidade, unidade_medida
    
  2. Funcionalidades:
    - Controle de estoque automático por composição
    - Baixa automática dos insumos na venda
    - Flexibilidade para alterar composições
    - Sem complicações de relacionamentos
    
  3. Formato do campo insumos:
    [
      {
        "produto_id": "uuid-do-produto-insumo",
        "nome": "Nome do Produto Insumo", 
        "quantidade": 0.2,
        "unidade_medida": "KG"
      }
    ]
*/

-- =====================================================
-- ADICIONAR CAMPO INSUMOS À TABELA PRODUTOS
-- =====================================================

-- Adicionar campo insumos como JSONB com array vazio como padrão
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS insumos JSONB DEFAULT '[]';

-- =====================================================
-- ÍNDICE PARA PERFORMANCE EM CONSULTAS JSONB
-- =====================================================

-- Índice GIN para consultas eficientes no campo JSONB
CREATE INDEX IF NOT EXISTS idx_produtos_insumos_gin ON produtos USING GIN (insumos);

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON COLUMN produtos.insumos IS 'Array JSON com composição do produto - lista de insumos e quantidades que serão descontadas do estoque na venda';

-- =====================================================
-- EXEMPLO DE USO
-- =====================================================

/*
Exemplo de como o campo insumos será usado:

UPDATE produtos 
SET insumos = '[
  {
    "produto_id": "123e4567-e89b-12d3-a456-426614174000",
    "nome": "Arroz Branco 5kg",
    "quantidade": 0.2,
    "unidade_medida": "KG"
  },
  {
    "produto_id": "123e4567-e89b-12d3-a456-426614174001", 
    "nome": "Feijão Preto 1kg",
    "quantidade": 0.15,
    "unidade_medida": "KG"
  }
]'
WHERE id = 'produto-prato-executivo-id';

-- Para consultar produtos que usam um insumo específico:
SELECT * FROM produtos 
WHERE insumos @> '[{"produto_id": "123e4567-e89b-12d3-a456-426614174000"}]';

-- Para consultar todos os produtos que têm insumos:
SELECT * FROM produtos 
WHERE jsonb_array_length(insumos) > 0;
*/
