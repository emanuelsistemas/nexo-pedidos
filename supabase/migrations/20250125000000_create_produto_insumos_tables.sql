/*
  # Criar tabelas para controle de insumos dos produtos

  1. Nova Tabela: produto_insumos
    - Armazena a composição de cada produto (quais insumos ele usa)
    - Relaciona produto final → produtos que são matérias-primas
    
  2. Nova Tabela: produto_insumos_itens  
    - Armazena os itens específicos de cada composição
    - Define quantidade que será descontada do estoque do insumo
    
  3. Funcionalidades:
    - Controle de estoque automático por composição
    - Cálculo de custo baseado nos insumos
    - Rastreabilidade de matérias-primas
    - Integração com sistema de vendas existente
*/

-- =====================================================
-- TABELA: produto_insumos
-- =====================================================
-- Armazena as composições/receitas dos produtos
CREATE TABLE IF NOT EXISTS produto_insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Produto que possui a composição (produto final)
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  
  -- Identificação da empresa (multi-tenant)
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  
  -- Informações da composição
  nome TEXT NOT NULL DEFAULT 'Composição Padrão',
  descricao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  
  -- Custo calculado automaticamente baseado nos insumos
  custo_total_calculado DECIMAL(10,2) DEFAULT 0,
  
  -- Controle de timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Garantir que cada produto tenha apenas uma composição ativa por empresa
  UNIQUE(produto_id, empresa_id)
);

-- =====================================================
-- TABELA: produto_insumos_itens
-- =====================================================
-- Armazena os itens específicos de cada composição
CREATE TABLE IF NOT EXISTS produto_insumos_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referência à composição
  produto_insumo_id UUID NOT NULL REFERENCES produto_insumos(id) ON DELETE CASCADE,
  
  -- Produto que será usado como insumo (matéria-prima)
  insumo_produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  
  -- Quantidade que será descontada do estoque do insumo
  quantidade_necessaria DECIMAL(10,4) NOT NULL DEFAULT 0,
  
  -- Custo unitário no momento da criação (para histórico)
  custo_unitario DECIMAL(10,2) DEFAULT 0,
  
  -- Custo total deste item (quantidade * custo_unitario)
  custo_total_item DECIMAL(10,2) DEFAULT 0,
  
  -- Observações específicas do item
  observacoes TEXT,
  
  -- Controle de timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Garantir que o mesmo insumo não seja adicionado duas vezes na mesma composição
  UNIQUE(produto_insumo_id, insumo_produto_id)
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para produto_insumos
CREATE INDEX IF NOT EXISTS idx_produto_insumos_produto_id ON produto_insumos(produto_id);
CREATE INDEX IF NOT EXISTS idx_produto_insumos_empresa_id ON produto_insumos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_produto_insumos_ativo ON produto_insumos(ativo) WHERE ativo = TRUE;

-- Índices para produto_insumos_itens
CREATE INDEX IF NOT EXISTS idx_produto_insumos_itens_produto_insumo_id ON produto_insumos_itens(produto_insumo_id);
CREATE INDEX IF NOT EXISTS idx_produto_insumos_itens_insumo_produto_id ON produto_insumos_itens(insumo_produto_id);

-- =====================================================
-- TRIGGERS PARA ATUALIZAR updated_at
-- =====================================================

-- Trigger para produto_insumos
CREATE OR REPLACE FUNCTION update_produto_insumos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_produto_insumos_updated_at
    BEFORE UPDATE ON produto_insumos
    FOR EACH ROW
    EXECUTE FUNCTION update_produto_insumos_updated_at();

-- Trigger para produto_insumos_itens
CREATE OR REPLACE FUNCTION update_produto_insumos_itens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_produto_insumos_itens_updated_at
    BEFORE UPDATE ON produto_insumos_itens
    FOR EACH ROW
    EXECUTE FUNCTION update_produto_insumos_itens_updated_at();

-- =====================================================
-- TRIGGER PARA CALCULAR CUSTO TOTAL AUTOMATICAMENTE
-- =====================================================

-- Função para recalcular o custo total da composição
CREATE OR REPLACE FUNCTION recalcular_custo_total_composicao()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalcular o custo total da composição baseado nos itens
    UPDATE produto_insumos
    SET custo_total_calculado = (
        SELECT COALESCE(SUM(custo_total_item), 0)
        FROM produto_insumos_itens
        WHERE produto_insumo_id = COALESCE(NEW.produto_insumo_id, OLD.produto_insumo_id)
    )
    WHERE id = COALESCE(NEW.produto_insumo_id, OLD.produto_insumo_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para recalcular quando itens são inseridos, atualizados ou deletados
CREATE TRIGGER trigger_recalcular_custo_total_insert_update
    AFTER INSERT OR UPDATE ON produto_insumos_itens
    FOR EACH ROW
    EXECUTE FUNCTION recalcular_custo_total_composicao();

CREATE TRIGGER trigger_recalcular_custo_total_delete
    AFTER DELETE ON produto_insumos_itens
    FOR EACH ROW
    EXECUTE FUNCTION recalcular_custo_total_composicao();

-- =====================================================
-- COMENTÁRIOS NAS TABELAS
-- =====================================================

COMMENT ON TABLE produto_insumos IS 'Tabela para armazenar as composições/receitas dos produtos - define quais insumos cada produto utiliza';
COMMENT ON COLUMN produto_insumos.produto_id IS 'Produto final que possui a composição (ex: Prato Executivo)';
COMMENT ON COLUMN produto_insumos.custo_total_calculado IS 'Custo total calculado automaticamente baseado nos insumos';

COMMENT ON TABLE produto_insumos_itens IS 'Tabela para armazenar os itens específicos de cada composição - matérias-primas e quantidades';
COMMENT ON COLUMN produto_insumos_itens.insumo_produto_id IS 'Produto que será usado como insumo/matéria-prima (ex: Arroz, Feijão)';
COMMENT ON COLUMN produto_insumos_itens.quantidade_necessaria IS 'Quantidade que será descontada do estoque do insumo quando o produto final for vendido';
COMMENT ON COLUMN produto_insumos_itens.custo_unitario IS 'Custo unitário do insumo no momento da criação (para histórico de custos)';
