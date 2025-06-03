/*
  # Criação da Tabela PDV_ITENS_ADICIONAIS
  
  1. Nova Tabela
    - `pdv_itens_adicionais` para gerenciar opções adicionais no PDV
    - Segue o mesmo padrão da tabela `pedidos_itens_adicionais`
    - Suporte completo a rastreabilidade e importação de pedidos
    
  2. Relacionamentos
    - FK para pdv_itens (item principal)
    - FK para opcoes_adicionais_itens (adicional selecionado)
    - FK para pedidos_itens_adicionais (origem se importado)
    
  3. Índices e Constraints
    - Índices para performance
    - Constraints de validação
    - Comentários para documentação
*/

-- =====================================================
-- 1. CRIAÇÃO DA TABELA PDV_ITENS_ADICIONAIS
-- =====================================================

CREATE TABLE IF NOT EXISTS pdv_itens_adicionais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  usuario_id UUID NOT NULL,
  pdv_item_id UUID NOT NULL,
  
  -- Referência ao adicional
  item_adicional_id UUID NOT NULL,
  nome_adicional TEXT NOT NULL,
  
  -- Valores
  quantidade NUMERIC(10,3) NOT NULL DEFAULT 1,
  valor_unitario NUMERIC(10,2) NOT NULL,
  valor_total NUMERIC(10,2) NOT NULL,
  
  -- Origem (para rastreabilidade)
  origem_adicional TEXT DEFAULT 'manual',
  pedido_item_adicional_origem_id UUID,
  
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
ALTER TABLE pdv_itens_adicionais 
ADD CONSTRAINT fk_pdv_itens_adicionais_empresa 
FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

-- Usuário
ALTER TABLE pdv_itens_adicionais 
ADD CONSTRAINT fk_pdv_itens_adicionais_usuario 
FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT;

-- Item do PDV
ALTER TABLE pdv_itens_adicionais 
ADD CONSTRAINT fk_pdv_itens_adicionais_pdv_item 
FOREIGN KEY (pdv_item_id) REFERENCES pdv_itens(id) ON DELETE CASCADE;

-- Item adicional
ALTER TABLE pdv_itens_adicionais 
ADD CONSTRAINT fk_pdv_itens_adicionais_item_adicional 
FOREIGN KEY (item_adicional_id) REFERENCES opcoes_adicionais_itens(id) ON DELETE RESTRICT;

-- Origem do pedido (se importado)
ALTER TABLE pdv_itens_adicionais 
ADD CONSTRAINT fk_pdv_itens_adicionais_origem 
FOREIGN KEY (pedido_item_adicional_origem_id) REFERENCES pedidos_itens_adicionais(id);

-- Usuário que deletou
ALTER TABLE pdv_itens_adicionais 
ADD CONSTRAINT fk_pdv_itens_adicionais_deletado_por 
FOREIGN KEY (deletado_por) REFERENCES usuarios(id);

-- =====================================================
-- 3. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices principais
CREATE INDEX idx_pdv_itens_adicionais_empresa_id ON pdv_itens_adicionais(empresa_id);
CREATE INDEX idx_pdv_itens_adicionais_usuario_id ON pdv_itens_adicionais(usuario_id);
CREATE INDEX idx_pdv_itens_adicionais_pdv_item_id ON pdv_itens_adicionais(pdv_item_id);
CREATE INDEX idx_pdv_itens_adicionais_item_adicional_id ON pdv_itens_adicionais(item_adicional_id);

-- Índices para consultas específicas
CREATE INDEX idx_pdv_itens_adicionais_origem ON pdv_itens_adicionais(origem_adicional);
CREATE INDEX idx_pdv_itens_adicionais_deletado ON pdv_itens_adicionais(deletado);
CREATE INDEX idx_pdv_itens_adicionais_created_at ON pdv_itens_adicionais(created_at);

-- Índice composto para consultas de empresa + não deletado
CREATE INDEX idx_pdv_itens_adicionais_empresa_ativo 
ON pdv_itens_adicionais(empresa_id, deletado) 
WHERE deletado = FALSE;

-- =====================================================
-- 4. CONSTRAINTS DE VALIDAÇÃO
-- =====================================================

-- Origem do adicional
ALTER TABLE pdv_itens_adicionais 
ADD CONSTRAINT chk_pdv_itens_adicionais_origem 
CHECK (origem_adicional IN ('manual', 'pedido_importado'));

-- Quantidade positiva
ALTER TABLE pdv_itens_adicionais 
ADD CONSTRAINT chk_pdv_itens_adicionais_quantidade_positiva 
CHECK (quantidade > 0);

-- Valor unitário não negativo
ALTER TABLE pdv_itens_adicionais 
ADD CONSTRAINT chk_pdv_itens_adicionais_valor_unitario_positivo 
CHECK (valor_unitario >= 0);

-- Valor total não negativo
ALTER TABLE pdv_itens_adicionais 
ADD CONSTRAINT chk_pdv_itens_adicionais_valor_total_positivo 
CHECK (valor_total >= 0);

-- Validação de soft delete
ALTER TABLE pdv_itens_adicionais 
ADD CONSTRAINT chk_pdv_itens_adicionais_soft_delete 
CHECK (
  (deletado = FALSE AND deletado_em IS NULL AND deletado_por IS NULL) OR
  (deletado = TRUE AND deletado_em IS NOT NULL AND deletado_por IS NOT NULL)
);

-- =====================================================
-- 5. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE pdv_itens_adicionais IS 'Opções adicionais dos itens vendidos no PDV (ex: tamanho, extras, bordas)';

COMMENT ON COLUMN pdv_itens_adicionais.pdv_item_id IS 'Referência ao item principal do PDV';
COMMENT ON COLUMN pdv_itens_adicionais.item_adicional_id IS 'Referência ao item adicional selecionado';
COMMENT ON COLUMN pdv_itens_adicionais.nome_adicional IS 'Cache do nome do adicional para performance';
COMMENT ON COLUMN pdv_itens_adicionais.quantidade IS 'Quantidade do adicional (suporte a decimais)';
COMMENT ON COLUMN pdv_itens_adicionais.origem_adicional IS 'Origem: manual (lançado no PDV) ou pedido_importado';
COMMENT ON COLUMN pdv_itens_adicionais.pedido_item_adicional_origem_id IS 'ID do adicional original se importado de pedido';

-- =====================================================
-- 6. TRIGGER PARA UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_pdv_itens_adicionais_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pdv_itens_adicionais_updated_at
  BEFORE UPDATE ON pdv_itens_adicionais
  FOR EACH ROW
  EXECUTE FUNCTION update_pdv_itens_adicionais_updated_at();

-- =====================================================
-- 7. FUNÇÃO PARA CALCULAR VALOR TOTAL DO ITEM
-- =====================================================

CREATE OR REPLACE FUNCTION calcular_valor_total_item_pdv(pdv_item_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
  valor_produto NUMERIC(10,2);
  valor_adicionais NUMERIC(10,2);
  valor_total NUMERIC(10,2);
BEGIN
  -- Buscar valor do produto
  SELECT valor_total_item INTO valor_produto
  FROM pdv_itens 
  WHERE id = pdv_item_uuid;
  
  -- Buscar soma dos adicionais
  SELECT COALESCE(SUM(valor_total), 0) INTO valor_adicionais
  FROM pdv_itens_adicionais 
  WHERE pdv_item_id = pdv_item_uuid 
  AND deletado = FALSE;
  
  -- Calcular total
  valor_total := COALESCE(valor_produto, 0) + COALESCE(valor_adicionais, 0);
  
  RETURN valor_total;
END;
$$ LANGUAGE plpgsql;
