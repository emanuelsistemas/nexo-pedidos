/*
  # Criar tabelas para sistema de devoluções
  
  1. Nova Tabela: devolucoes
    - Armazena as devoluções principais
    - Segue padrão multi-tenant com empresa_id
    - Controle de status e formas de reembolso
    - Relacionamento com clientes e usuários
    
  2. Nova Tabela: devolucao_itens
    - Armazena os itens específicos de cada devolução
    - Relaciona com produtos e vendas originais
    - Controle de quantidades e valores
    - Motivos específicos por item
    
  3. Funcionalidades:
    - Devoluções totais e parciais
    - Múltiplas formas de reembolso
    - Rastreabilidade completa
    - Integração com sistema de vendas existente
*/

-- =====================================================
-- TABELA: devolucoes
-- =====================================================
-- Armazena as devoluções principais
CREATE TABLE IF NOT EXISTS devolucoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação e numeração
  numero VARCHAR(50) NOT NULL,
  
  -- Multi-tenant (obrigatório)
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  
  -- Relacionamentos
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nome TEXT, -- Salvo no momento da devolução
  cliente_telefone TEXT,
  cliente_email TEXT,
  
  -- Usuário responsável
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  
  -- Referência à venda/pedido original (opcional)
  pedido_id UUID, -- Pode referenciar pdv.id ou cardapio_digital.id
  pedido_numero TEXT,
  pedido_tipo VARCHAR(20) DEFAULT 'pdv', -- 'pdv', 'cardapio_digital'
  
  -- Valores da devolução
  valor_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Classificação da devolução
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'processada', 'cancelada')),
  tipo_devolucao VARCHAR(10) NOT NULL CHECK (tipo_devolucao IN ('total', 'parcial')),
  forma_reembolso VARCHAR(20) NOT NULL CHECK (forma_reembolso IN ('dinheiro', 'credito', 'troca', 'estorno_cartao')),
  
  -- Motivos e observações
  motivo_geral TEXT,
  observacoes TEXT,
  
  -- Controle de processamento
  processada_em TIMESTAMPTZ,
  processada_por_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  
  -- Controle temporal
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Soft delete
  deletado BOOLEAN DEFAULT FALSE,
  deletado_em TIMESTAMPTZ,
  deletado_por_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL
);

-- =====================================================
-- TABELA: devolucao_itens
-- =====================================================
-- Armazena os itens específicos de cada devolução
CREATE TABLE IF NOT EXISTS devolucao_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referência à devolução principal
  devolucao_id UUID NOT NULL REFERENCES devolucoes(id) ON DELETE CASCADE,
  
  -- Multi-tenant (obrigatório)
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  
  -- Produto devolvido
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  produto_nome TEXT NOT NULL, -- Salvo no momento da devolução
  produto_codigo TEXT,
  
  -- Referência ao item original da venda (se aplicável)
  pdv_item_id UUID, -- Referência a pdv_itens.id
  venda_origem_id UUID, -- ID da venda original
  venda_origem_numero TEXT, -- Número da venda original
  
  -- Quantidades e valores
  quantidade DECIMAL(10,3) NOT NULL DEFAULT 1,
  preco_unitario DECIMAL(10,2) NOT NULL,
  preco_total DECIMAL(10,2) NOT NULL,
  
  -- Motivo específico do item
  motivo TEXT,
  
  -- Controle temporal
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Soft delete
  deletado BOOLEAN DEFAULT FALSE,
  deletado_em TIMESTAMPTZ,
  deletado_por_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices principais para devolucoes
CREATE INDEX IF NOT EXISTS idx_devolucoes_empresa_id ON devolucoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_devolucoes_numero ON devolucoes(empresa_id, numero);
CREATE INDEX IF NOT EXISTS idx_devolucoes_cliente_id ON devolucoes(cliente_id) WHERE cliente_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_devolucoes_usuario_id ON devolucoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_devolucoes_status ON devolucoes(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_devolucoes_created_at ON devolucoes(empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_devolucoes_pedido ON devolucoes(pedido_id, pedido_tipo) WHERE pedido_id IS NOT NULL;

-- Índices principais para devolucao_itens
CREATE INDEX IF NOT EXISTS idx_devolucao_itens_devolucao_id ON devolucao_itens(devolucao_id);
CREATE INDEX IF NOT EXISTS idx_devolucao_itens_empresa_id ON devolucao_itens(empresa_id);
CREATE INDEX IF NOT EXISTS idx_devolucao_itens_produto_id ON devolucao_itens(produto_id);
CREATE INDEX IF NOT EXISTS idx_devolucao_itens_pdv_item_id ON devolucao_itens(pdv_item_id) WHERE pdv_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_devolucao_itens_venda_origem ON devolucao_itens(venda_origem_id) WHERE venda_origem_id IS NOT NULL;

-- Índices compostos para consultas específicas
CREATE INDEX IF NOT EXISTS idx_devolucoes_empresa_status_data ON devolucoes(empresa_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_devolucao_itens_empresa_produto ON devolucao_itens(empresa_id, produto_id);

-- =====================================================
-- CONSTRAINTS ADICIONAIS
-- =====================================================

-- Garantir numeração única por empresa
CREATE UNIQUE INDEX IF NOT EXISTS idx_devolucoes_numero_empresa_unique 
ON devolucoes(empresa_id, numero) WHERE deletado = FALSE;

-- Garantir valores positivos
ALTER TABLE devolucoes ADD CONSTRAINT chk_devolucoes_valor_total_positivo 
CHECK (valor_total >= 0);

ALTER TABLE devolucao_itens ADD CONSTRAINT chk_devolucao_itens_quantidade_positiva 
CHECK (quantidade > 0);

ALTER TABLE devolucao_itens ADD CONSTRAINT chk_devolucao_itens_preco_unitario_positivo 
CHECK (preco_unitario >= 0);

ALTER TABLE devolucao_itens ADD CONSTRAINT chk_devolucao_itens_preco_total_positivo 
CHECK (preco_total >= 0);

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

-- Trigger para atualizar updated_at em devolucoes
CREATE OR REPLACE FUNCTION update_devolucoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_devolucoes_updated_at
  BEFORE UPDATE ON devolucoes
  FOR EACH ROW
  EXECUTE FUNCTION update_devolucoes_updated_at();

-- Trigger para atualizar updated_at em devolucao_itens
CREATE OR REPLACE FUNCTION update_devolucao_itens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_devolucao_itens_updated_at
  BEFORE UPDATE ON devolucao_itens
  FOR EACH ROW
  EXECUTE FUNCTION update_devolucao_itens_updated_at();

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE devolucoes IS 'Tabela principal para controle de devoluções - suporte multi-tenant';
COMMENT ON COLUMN devolucoes.numero IS 'Número sequencial da devolução por empresa';
COMMENT ON COLUMN devolucoes.empresa_id IS 'ID da empresa (multi-tenant) - obrigatório';
COMMENT ON COLUMN devolucoes.cliente_nome IS 'Nome do cliente salvo no momento da devolução';
COMMENT ON COLUMN devolucoes.pedido_id IS 'ID do pedido/venda original (pdv.id ou cardapio_digital.id)';
COMMENT ON COLUMN devolucoes.pedido_tipo IS 'Tipo do pedido original: pdv ou cardapio_digital';
COMMENT ON COLUMN devolucoes.status IS 'Status da devolução: pendente, processada, cancelada';
COMMENT ON COLUMN devolucoes.tipo_devolucao IS 'Tipo: total (venda completa) ou parcial (itens específicos)';
COMMENT ON COLUMN devolucoes.forma_reembolso IS 'Forma de reembolso: dinheiro, credito, troca, estorno_cartao';

COMMENT ON TABLE devolucao_itens IS 'Tabela para itens específicos de cada devolução';
COMMENT ON COLUMN devolucao_itens.produto_nome IS 'Nome do produto salvo no momento da devolução';
COMMENT ON COLUMN devolucao_itens.pdv_item_id IS 'Referência ao item original da venda (pdv_itens.id)';
COMMENT ON COLUMN devolucao_itens.venda_origem_id IS 'ID da venda original para rastreabilidade';
COMMENT ON COLUMN devolucao_itens.quantidade IS 'Quantidade devolvida (suporta decimais)';
COMMENT ON COLUMN devolucao_itens.motivo IS 'Motivo específico da devolução deste item';

-- =====================================================
-- FUNÇÃO PARA GERAR PRÓXIMO NÚMERO DE DEVOLUÇÃO
-- =====================================================

CREATE OR REPLACE FUNCTION get_proximo_numero_devolucao(p_empresa_id UUID)
RETURNS TEXT AS $$
DECLARE
  proximo_numero INTEGER;
  numero_formatado TEXT;
BEGIN
  -- Buscar o maior número atual da empresa
  SELECT COALESCE(MAX(CAST(numero AS INTEGER)), 0) + 1
  INTO proximo_numero
  FROM devolucoes
  WHERE empresa_id = p_empresa_id
    AND numero ~ '^[0-9]+$' -- Apenas números
    AND deletado = FALSE;
  
  -- Formatar com zeros à esquerda (6 dígitos)
  numero_formatado := LPAD(proximo_numero::TEXT, 6, '0');
  
  RETURN numero_formatado;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_proximo_numero_devolucao(UUID) IS 'Gera o próximo número sequencial de devolução para a empresa';
