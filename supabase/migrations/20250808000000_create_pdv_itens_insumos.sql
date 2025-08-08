/*
  # Criação da Tabela PDV_ITENS_INSUMOS
  
  1. Nova Tabela
    - `pdv_itens_insumos` para gerenciar insumos selecionados no PDV
    - Segue o mesmo padrão da tabela `pdv_itens_adicionais`
    - Suporte completo a rastreabilidade e importação de pedidos
    
  2. Relacionamentos
    - FK para pdv_itens (item principal)
    - FK para produtos (insumo selecionado)
    - FK para pedidos_itens_insumos (origem se importado) - futuro
    
  3. Índices e Constraints
    - Índices para performance
    - Constraints de validação
    - Comentários para documentação
*/

-- =====================================================
-- 1. CRIAÇÃO DA TABELA PDV_ITENS_INSUMOS
-- =====================================================

CREATE TABLE IF NOT EXISTS pdv_itens_insumos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  usuario_id UUID NOT NULL,
  pdv_item_id UUID NOT NULL,
  
  -- Referência ao insumo
  insumo_produto_id UUID NOT NULL,
  nome_insumo TEXT NOT NULL,
  
  -- Quantidades
  quantidade NUMERIC(10,4) NOT NULL DEFAULT 1,
  unidade_medida TEXT NOT NULL,
  
  -- Valores (para análise de custos)
  custo_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
  custo_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Origem (para rastreabilidade)
  origem_insumo TEXT DEFAULT 'manual',
  pedido_item_insumo_origem_id UUID,
  
  -- Controle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Soft delete
  deletado BOOLEAN DEFAULT FALSE,
  deletado_em TIMESTAMPTZ,
  deletado_por UUID
);

-- =====================================================
-- 2. CHAVES ESTRANGEIRAS
-- =====================================================

-- Empresa
ALTER TABLE pdv_itens_insumos 
ADD CONSTRAINT fk_pdv_itens_insumos_empresa 
FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

-- Usuário
ALTER TABLE pdv_itens_insumos 
ADD CONSTRAINT fk_pdv_itens_insumos_usuario 
FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT;

-- Item do PDV
ALTER TABLE pdv_itens_insumos 
ADD CONSTRAINT fk_pdv_itens_insumos_pdv_item 
FOREIGN KEY (pdv_item_id) REFERENCES pdv_itens(id) ON DELETE CASCADE;

-- Produto insumo
ALTER TABLE pdv_itens_insumos 
ADD CONSTRAINT fk_pdv_itens_insumos_produto 
FOREIGN KEY (insumo_produto_id) REFERENCES produtos(id) ON DELETE RESTRICT;

-- Usuário que deletou
ALTER TABLE pdv_itens_insumos 
ADD CONSTRAINT fk_pdv_itens_insumos_deletado_por 
FOREIGN KEY (deletado_por) REFERENCES usuarios(id);

-- =====================================================
-- 3. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices principais
CREATE INDEX idx_pdv_itens_insumos_empresa_id ON pdv_itens_insumos(empresa_id);
CREATE INDEX idx_pdv_itens_insumos_usuario_id ON pdv_itens_insumos(usuario_id);
CREATE INDEX idx_pdv_itens_insumos_pdv_item_id ON pdv_itens_insumos(pdv_item_id);
CREATE INDEX idx_pdv_itens_insumos_produto_id ON pdv_itens_insumos(insumo_produto_id);

-- Índices para consultas específicas
CREATE INDEX idx_pdv_itens_insumos_origem ON pdv_itens_insumos(origem_insumo);
CREATE INDEX idx_pdv_itens_insumos_deletado ON pdv_itens_insumos(deletado);
CREATE INDEX idx_pdv_itens_insumos_created_at ON pdv_itens_insumos(created_at);

-- Índice composto para consultas de empresa + não deletado
CREATE INDEX idx_pdv_itens_insumos_empresa_ativo 
ON pdv_itens_insumos(empresa_id, deletado) 
WHERE deletado = FALSE;

-- Índice composto para relatórios de consumo
CREATE INDEX idx_pdv_itens_insumos_relatorios
ON pdv_itens_insumos(empresa_id, insumo_produto_id, created_at)
WHERE deletado = FALSE;

-- =====================================================
-- 4. CONSTRAINTS DE VALIDAÇÃO
-- =====================================================

-- Origem do insumo
ALTER TABLE pdv_itens_insumos
ADD CONSTRAINT chk_pdv_itens_insumos_origem
CHECK (origem_insumo IN ('manual', 'pedido_importado'));

-- Quantidade positiva
ALTER TABLE pdv_itens_insumos
ADD CONSTRAINT chk_pdv_itens_insumos_quantidade_positiva
CHECK (quantidade > 0);

-- Custo unitário não negativo
ALTER TABLE pdv_itens_insumos
ADD CONSTRAINT chk_pdv_itens_insumos_custo_unitario_positivo
CHECK (custo_unitario >= 0);

-- Custo total não negativo
ALTER TABLE pdv_itens_insumos
ADD CONSTRAINT chk_pdv_itens_insumos_custo_total_positivo
CHECK (custo_total >= 0);

-- Validação de soft delete
ALTER TABLE pdv_itens_insumos
ADD CONSTRAINT chk_pdv_itens_insumos_soft_delete
CHECK (
  (deletado = FALSE AND deletado_em IS NULL AND deletado_por IS NULL) OR
  (deletado = TRUE AND deletado_em IS NOT NULL AND deletado_por IS NOT NULL)
);

-- =====================================================
-- 5. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE pdv_itens_insumos IS 'Insumos selecionados dos itens vendidos no PDV para controle de estoque e custos';

COMMENT ON COLUMN pdv_itens_insumos.pdv_item_id IS 'Referência ao item principal do PDV';
COMMENT ON COLUMN pdv_itens_insumos.insumo_produto_id IS 'Referência ao produto usado como insumo';
COMMENT ON COLUMN pdv_itens_insumos.nome_insumo IS 'Cache do nome do insumo para performance';
COMMENT ON COLUMN pdv_itens_insumos.quantidade IS 'Quantidade do insumo selecionada (suporte a 4 decimais)';
COMMENT ON COLUMN pdv_itens_insumos.unidade_medida IS 'Unidade de medida do insumo (kg, un, ml, etc)';
COMMENT ON COLUMN pdv_itens_insumos.custo_unitario IS 'Custo unitário do insumo no momento da venda';
COMMENT ON COLUMN pdv_itens_insumos.custo_total IS 'Custo total calculado (quantidade × custo_unitario)';
COMMENT ON COLUMN pdv_itens_insumos.origem_insumo IS 'Origem: manual (selecionado no PDV) ou pedido_importado';
COMMENT ON COLUMN pdv_itens_insumos.pedido_item_insumo_origem_id IS 'ID do insumo original se importado de pedido';

-- =====================================================
-- 6. TRIGGERS PARA AUDITORIA
-- =====================================================

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_pdv_itens_insumos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pdv_itens_insumos_updated_at
  BEFORE UPDATE ON pdv_itens_insumos
  FOR EACH ROW
  EXECUTE FUNCTION update_pdv_itens_insumos_updated_at();

-- =====================================================
-- 7. TABELA DESPROTEGIDA (SEM RLS)
-- =====================================================

-- NOTA: Esta tabela foi deixada SEM proteção RLS por solicitação
-- A segurança multi-tenant deve ser implementada na aplicação
-- através do filtro por empresa_id nas consultas

-- RLS DESABILITADA - Tabela acessível sem restrições de políticas
ALTER TABLE pdv_itens_insumos DISABLE ROW LEVEL SECURITY;
