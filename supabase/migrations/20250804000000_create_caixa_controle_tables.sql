-- Criar tabelas para controle de caixa
-- Data: 04/08/2025
-- Descrição: Tabelas para gerenciar abertura/fechamento de caixa e tipos de pagamento

/*
  # Criar tabelas para controle de caixa

  1. Nova Tabela caixa_controle:
    - Controla abertura e fechamento de caixa por usuário/empresa
    - Campos: empresa_id, usuario_id (caixa), data_abertura, data_fechamento, sangria, suprimento
    - Permite controle financeiro completo do caixa
    
  2. Nova Tabela tipo_pagamentos:
    - Armazena registros específicos de pagamentos do caixa
    - Relacionada com caixa_controle
    - Permite rastreamento detalhado de todas as transações
    
  3. Funcionalidades:
    - Multi-tenant (isolamento por empresa_id)
    - Controle por usuário (caixa)
    - Timestamps para auditoria
    - Valores monetários com precisão decimal
*/

-- =====================================================
-- TABELA CAIXA_CONTROLE
-- =====================================================

CREATE TABLE IF NOT EXISTS caixa_controle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação e controle
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, -- Caixa (usuário logado)
  
  -- Controle de abertura e fechamento
  data_abertura TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_fechamento TIMESTAMPTZ,
  
  -- Valores de sangria e suprimento
  sangria DECIMAL(10,2) DEFAULT 0.00,
  suprimento DECIMAL(10,2) DEFAULT 0.00,
  
  -- Status do caixa
  status VARCHAR(20) DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
  
  -- Observações
  observacao_abertura TEXT,
  observacao_fechamento TEXT,
  
  -- Controle de timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA TIPO_PAGAMENTOS
-- =====================================================

CREATE TABLE IF NOT EXISTS tipo_pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamento com caixa_controle
  caixa_controle_id UUID NOT NULL REFERENCES caixa_controle(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  
  -- Dados do pagamento
  tipo_pagamento VARCHAR(50) NOT NULL, -- 'dinheiro', 'pix', 'cartao_credito', 'cartao_debito', etc.
  valor DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  
  -- Dados adicionais
  descricao TEXT,
  referencia_venda_id UUID, -- Referência para tabela PDV se for pagamento de venda
  
  -- Controle de timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para caixa_controle
CREATE INDEX IF NOT EXISTS idx_caixa_controle_empresa_id ON caixa_controle(empresa_id);
CREATE INDEX IF NOT EXISTS idx_caixa_controle_usuario_id ON caixa_controle(usuario_id);
CREATE INDEX IF NOT EXISTS idx_caixa_controle_data_abertura ON caixa_controle(data_abertura);
CREATE INDEX IF NOT EXISTS idx_caixa_controle_status ON caixa_controle(status);
CREATE INDEX IF NOT EXISTS idx_caixa_controle_empresa_status ON caixa_controle(empresa_id, status);

-- Índices para tipo_pagamentos
CREATE INDEX IF NOT EXISTS idx_tipo_pagamentos_caixa_controle_id ON tipo_pagamentos(caixa_controle_id);
CREATE INDEX IF NOT EXISTS idx_tipo_pagamentos_empresa_id ON tipo_pagamentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_tipo_pagamentos_tipo ON tipo_pagamentos(tipo_pagamento);
CREATE INDEX IF NOT EXISTS idx_tipo_pagamentos_created_at ON tipo_pagamentos(created_at);

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

-- Comentários na tabela caixa_controle
COMMENT ON TABLE caixa_controle IS 'Tabela para controle de abertura e fechamento de caixa por usuário/empresa';
COMMENT ON COLUMN caixa_controle.usuario_id IS 'Usuário responsável pelo caixa (operador de caixa)';
COMMENT ON COLUMN caixa_controle.data_abertura IS 'Data e hora de abertura do caixa';
COMMENT ON COLUMN caixa_controle.data_fechamento IS 'Data e hora de fechamento do caixa (NULL se ainda aberto)';
COMMENT ON COLUMN caixa_controle.sangria IS 'Valor total de sangrias realizadas no período';
COMMENT ON COLUMN caixa_controle.suprimento IS 'Valor total de suprimentos realizados no período';
COMMENT ON COLUMN caixa_controle.status IS 'Status atual do caixa: aberto ou fechado';

-- Comentários na tabela tipo_pagamentos
COMMENT ON TABLE tipo_pagamentos IS 'Tabela para registrar pagamentos específicos relacionados ao controle de caixa';
COMMENT ON COLUMN tipo_pagamentos.caixa_controle_id IS 'Referência para o controle de caixa relacionado';
COMMENT ON COLUMN tipo_pagamentos.tipo_pagamento IS 'Tipo do pagamento: dinheiro, pix, cartao_credito, cartao_debito, etc.';
COMMENT ON COLUMN tipo_pagamentos.valor IS 'Valor do pagamento';
COMMENT ON COLUMN tipo_pagamentos.referencia_venda_id IS 'Referência para venda na tabela PDV (se aplicável)';

-- =====================================================
-- CONSTRAINTS ADICIONAIS
-- =====================================================

-- Garantir que sangria e suprimento não sejam negativos
ALTER TABLE caixa_controle ADD CONSTRAINT chk_sangria_positiva CHECK (sangria >= 0);
ALTER TABLE caixa_controle ADD CONSTRAINT chk_suprimento_positivo CHECK (suprimento >= 0);

-- Garantir que valor do pagamento não seja negativo
ALTER TABLE tipo_pagamentos ADD CONSTRAINT chk_valor_positivo CHECK (valor >= 0);

-- Garantir que data_fechamento seja posterior à data_abertura (quando preenchida)
ALTER TABLE caixa_controle ADD CONSTRAINT chk_data_fechamento_posterior
  CHECK (data_fechamento IS NULL OR data_fechamento >= data_abertura);
