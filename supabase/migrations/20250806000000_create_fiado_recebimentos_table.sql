-- Criar tabela para controle de recebimentos de fiado
-- Data: 06/08/2025
-- Descrição: Tabela para registrar todos os recebimentos de valores em fiado dos clientes

-- =====================================================
-- TABELA: fiado_recebimentos
-- =====================================================
-- Armazena todos os recebimentos de valores fiado dos clientes
CREATE TABLE IF NOT EXISTS fiado_recebimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Multi-tenant (obrigatório)
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  
  -- Relacionamentos
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  cliente_nome TEXT NOT NULL, -- Nome do cliente no momento do recebimento
  
  -- Forma de pagamento
  forma_pagamento_empresa_id UUID NOT NULL REFERENCES formas_pagamento_empresa(id) ON DELETE RESTRICT,
  forma_pagamento_nome TEXT NOT NULL, -- Nome da forma de pagamento no momento do recebimento
  
  -- Valores
  valor_recebimento DECIMAL(10,2) NOT NULL CHECK (valor_recebimento > 0),
  saldo_anterior DECIMAL(10,2) NOT NULL DEFAULT 0, -- Saldo devedor antes do recebimento
  saldo_posterior DECIMAL(10,2) NOT NULL DEFAULT 0, -- Saldo devedor após o recebimento
  
  -- Controle operacional
  caixa_recebimento TEXT, -- Identificação do caixa/terminal
  operador_usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  operador_nome TEXT NOT NULL, -- Nome do operador no momento do recebimento
  
  -- Datas e controle
  data_recebimento TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  observacoes TEXT, -- Observações sobre o recebimento
  
  -- Controle temporal
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Soft delete
  deletado BOOLEAN DEFAULT FALSE,
  deletado_em TIMESTAMPTZ,
  deletado_por_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  motivo_exclusao TEXT
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_fiado_recebimentos_empresa_id ON fiado_recebimentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_fiado_recebimentos_cliente_id ON fiado_recebimentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_fiado_recebimentos_data ON fiado_recebimentos(data_recebimento);
CREATE INDEX IF NOT EXISTS idx_fiado_recebimentos_operador ON fiado_recebimentos(operador_usuario_id);
CREATE INDEX IF NOT EXISTS idx_fiado_recebimentos_forma_pagamento ON fiado_recebimentos(forma_pagamento_empresa_id);
CREATE INDEX IF NOT EXISTS idx_fiado_recebimentos_deletado ON fiado_recebimentos(deletado) WHERE deletado = FALSE;

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================
COMMENT ON TABLE fiado_recebimentos IS 'Registra todos os recebimentos de valores em fiado dos clientes';
COMMENT ON COLUMN fiado_recebimentos.cliente_nome IS 'Nome do cliente no momento do recebimento (para histórico)';
COMMENT ON COLUMN fiado_recebimentos.forma_pagamento_nome IS 'Nome da forma de pagamento no momento do recebimento (para histórico)';
COMMENT ON COLUMN fiado_recebimentos.valor_recebimento IS 'Valor recebido do cliente';
COMMENT ON COLUMN fiado_recebimentos.saldo_anterior IS 'Saldo devedor do cliente antes deste recebimento';
COMMENT ON COLUMN fiado_recebimentos.saldo_posterior IS 'Saldo devedor do cliente após este recebimento';
COMMENT ON COLUMN fiado_recebimentos.caixa_recebimento IS 'Identificação do caixa/terminal onde foi feito o recebimento';
COMMENT ON COLUMN fiado_recebimentos.operador_nome IS 'Nome do operador no momento do recebimento (para histórico)';
COMMENT ON COLUMN fiado_recebimentos.data_recebimento IS 'Data e hora do recebimento';

-- =====================================================
-- DESABILITAR RLS (Row Level Security)
-- =====================================================
ALTER TABLE fiado_recebimentos DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- TRIGGER PARA ATUALIZAR updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_fiado_recebimentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fiado_recebimentos_updated_at
    BEFORE UPDATE ON fiado_recebimentos
    FOR EACH ROW
    EXECUTE FUNCTION update_fiado_recebimentos_updated_at();
