/*
  # Adicionar campo selecionar_manualmente_insumo à tabela produtos

  1. Mudança na tabela produtos:
    - Adicionar campo `selecionar_manualmente_insumo` do tipo BOOLEAN
    - Campo controlará se o usuário pode selecionar insumos manualmente na venda
    - Padrão: false (não selecionar manualmente)
    
  2. Funcionalidade:
    - Quando true: Permite seleção manual de insumos durante a venda
    - Quando false: Usa insumos padrão do produto automaticamente
    - Trabalha em conjunto com selecionar_insumos_venda
*/

-- =====================================================
-- ADICIONAR CAMPO SELECIONAR_MANUALMENTE_INSUMO À TABELA PRODUTOS
-- =====================================================

-- Adicionar campo selecionar_manualmente_insumo como BOOLEAN com false como padrão
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS selecionar_manualmente_insumo BOOLEAN DEFAULT false;

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON COLUMN produtos.selecionar_manualmente_insumo IS 'Permite seleção manual de insumos durante a venda (true) ou usa insumos padrão automaticamente (false)';

-- =====================================================
-- ATUALIZAR TIMESTAMP DA MIGRAÇÃO
-- =====================================================

-- Registrar que a migração foi executada
INSERT INTO public.schema_migrations (version) VALUES ('20250809000002') ON CONFLICT (version) DO NOTHING;
