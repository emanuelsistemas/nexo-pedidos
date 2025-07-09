-- Adicionar campo produto_alcoolico na tabela produtos
-- Data: 09/07/2025
-- Descrição: Campo para identificar produtos alcoólicos

-- Adicionar coluna produto_alcoolico
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS produto_alcoolico BOOLEAN DEFAULT FALSE;

-- Comentário na coluna
COMMENT ON COLUMN produtos.produto_alcoolico IS 'Indica se o produto é alcoólico (sujeito a regulamentações específicas)';

-- Criar índice para consultas por produtos alcoólicos
CREATE INDEX IF NOT EXISTS idx_produtos_alcoolico 
ON produtos(produto_alcoolico) 
WHERE produto_alcoolico = true;

-- Criar índice composto para consultas por empresa e produtos alcoólicos
CREATE INDEX IF NOT EXISTS idx_produtos_empresa_alcoolico 
ON produtos(empresa_id, produto_alcoolico) 
WHERE produto_alcoolico = true;
