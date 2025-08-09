-- Adicionar campos de devolução à tabela pdv_itens
-- Data: 2025-08-09
-- Objetivo: Persistir a rastreabilidade de trocas/devoluções por item de venda

-- 1) Novos campos (nulos por padrão, compatível com vendas normais)
ALTER TABLE pdv_itens
  ADD COLUMN IF NOT EXISTS devolucao_origem_id UUID,
  ADD COLUMN IF NOT EXISTS devolucao_codigo TEXT;

-- 2) Índices para consultas
CREATE INDEX IF NOT EXISTS idx_pdv_itens_devolucao_origem_id ON pdv_itens(devolucao_origem_id);
CREATE INDEX IF NOT EXISTS idx_pdv_itens_devolucao_codigo ON pdv_itens(devolucao_codigo);

-- 3) Foreign key opcional (somente se a tabela devolucoes existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'devolucoes'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public'
        AND table_name = 'pdv_itens'
        AND constraint_name = 'fk_pdv_itens_devolucao_origem'
    ) THEN
      ALTER TABLE pdv_itens
        ADD CONSTRAINT fk_pdv_itens_devolucao_origem
        FOREIGN KEY (devolucao_origem_id)
        REFERENCES devolucoes(id)
        ON DELETE SET NULL;
    END IF;
  END IF;
END$$;

-- 4) Comentários para documentação
COMMENT ON COLUMN pdv_itens.devolucao_origem_id IS 'Referência à devolução (devolucoes.id) quando o item foi inserido por troca/devolução';
COMMENT ON COLUMN pdv_itens.devolucao_codigo IS 'Número/código da devolução associado ao item (cache textual para exibição/relatórios)';

