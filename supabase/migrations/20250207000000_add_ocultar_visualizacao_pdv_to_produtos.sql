/*
  # Adicionar campo ocultar_visualizacao_pdv à tabela produtos

  1. Mudança na tabela produtos:
    - Adicionar campo `ocultar_visualizacao_pdv` do tipo BOOLEAN
    - Campo indica se o produto deve ser ocultado na visualização do PDV
    - Padrão FALSE para produtos existentes
    - Funcionalidade disponível apenas quando materia_prima = TRUE
    
  2. Funcionalidades:
    - Ocultar produtos matéria-prima da visualização do PDV
    - Manter produtos disponíveis no banco mas não visíveis na interface
    - Facilitar organização entre produtos finais e matérias-primas
    
  3. Uso:
    - TRUE: Produto oculto no PDV (apenas quando materia_prima = TRUE)
    - FALSE: Produto visível no PDV (padrão)
    
  4. Regra de negócio:
    - Só pode ser TRUE se materia_prima = TRUE
    - Se materia_prima = FALSE, ocultar_visualizacao_pdv deve ser FALSE
*/

-- =====================================================
-- ADICIONAR CAMPO OCULTAR_VISUALIZACAO_PDV À TABELA PRODUTOS
-- =====================================================

-- Adicionar campo ocultar_visualizacao_pdv como BOOLEAN com padrão FALSE
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS ocultar_visualizacao_pdv BOOLEAN DEFAULT FALSE;

-- =====================================================
-- ÍNDICE PARA PERFORMANCE EM CONSULTAS
-- =====================================================

-- Índice para consultas eficientes de produtos ocultos no PDV
CREATE INDEX IF NOT EXISTS idx_produtos_ocultar_pdv ON produtos (ocultar_visualizacao_pdv) WHERE ocultar_visualizacao_pdv = TRUE;

-- Índice composto para consultas de matéria-prima oculta
CREATE INDEX IF NOT EXISTS idx_produtos_materia_prima_oculta ON produtos (materia_prima, ocultar_visualizacao_pdv) WHERE materia_prima = TRUE;

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON COLUMN produtos.ocultar_visualizacao_pdv IS 'Indica se o produto deve ser ocultado na visualização do PDV. TRUE = oculto no PDV, FALSE = visível no PDV. Só pode ser TRUE se materia_prima = TRUE';

-- =====================================================
-- CONSTRAINT PARA GARANTIR REGRA DE NEGÓCIO
-- =====================================================

-- Constraint para garantir que ocultar_visualizacao_pdv só pode ser TRUE se materia_prima = TRUE
ALTER TABLE produtos 
ADD CONSTRAINT chk_ocultar_pdv_apenas_materia_prima 
CHECK (
  (ocultar_visualizacao_pdv = FALSE) OR 
  (ocultar_visualizacao_pdv = TRUE AND materia_prima = TRUE)
);

-- =====================================================
-- EXEMPLO DE USO
-- =====================================================

/*
Exemplos de como o campo ocultar_visualizacao_pdv será usado:

-- Marcar matéria-prima para ser oculta no PDV
UPDATE produtos 
SET ocultar_visualizacao_pdv = TRUE 
WHERE materia_prima = TRUE 
AND nome IN ('Arroz Branco 5kg', 'Feijão Preto 1kg', 'Carne Bovina 1kg');

-- Consultar produtos visíveis no PDV (excluir ocultos)
SELECT * FROM produtos 
WHERE empresa_id = 'uuid-da-empresa'
AND ativo = TRUE 
AND deletado = FALSE
AND (ocultar_visualizacao_pdv = FALSE OR ocultar_visualizacao_pdv IS NULL);

-- Consultar apenas matérias-primas ocultas
SELECT * FROM produtos 
WHERE empresa_id = 'uuid-da-empresa'
AND materia_prima = TRUE 
AND ocultar_visualizacao_pdv = TRUE;

-- Tentar marcar produto não-matéria-prima como oculto (vai dar erro)
-- UPDATE produtos SET ocultar_visualizacao_pdv = TRUE WHERE materia_prima = FALSE; -- ERRO!
*/

-- =====================================================
-- TRIGGER PARA MANTER CONSISTÊNCIA
-- =====================================================

-- Função para garantir que se materia_prima = FALSE, ocultar_visualizacao_pdv = FALSE
CREATE OR REPLACE FUNCTION check_ocultar_pdv_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Se materia_prima for FALSE, forçar ocultar_visualizacao_pdv = FALSE
  IF NEW.materia_prima = FALSE THEN
    NEW.ocultar_visualizacao_pdv = FALSE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para executar a função antes de INSERT ou UPDATE
DROP TRIGGER IF EXISTS trigger_check_ocultar_pdv_consistency ON produtos;
CREATE TRIGGER trigger_check_ocultar_pdv_consistency
  BEFORE INSERT OR UPDATE ON produtos
  FOR EACH ROW
  EXECUTE FUNCTION check_ocultar_pdv_consistency();

-- =====================================================
-- ATUALIZAÇÃO DE PRODUTOS EXISTENTES
-- =====================================================

-- Garantir que todos os produtos existentes tenham ocultar_visualizacao_pdv = FALSE
UPDATE produtos 
SET ocultar_visualizacao_pdv = FALSE 
WHERE ocultar_visualizacao_pdv IS NULL;
