-- Criar tabela para formas de pagamento no fechamento de caixa
-- Data: 06/08/2025
-- Descrição: Tabela para armazenar detalhes das formas de pagamento no fechamento do caixa

/*
  # Criar tabela formas_pagamento_fechamento_caixa

  1. Nova Tabela formas_pagamento_fechamento_caixa:
    - Armazena valores detalhados de cada forma de pagamento no fechamento
    - Relacionada com caixa_controle
    - Inclui valores atuais, fiado e totais
    - Multi-tenant (isolamento por empresa_id)
    
  2. Funcionalidades:
    - Controle por usuário (operador que fechou)
    - Valores separados por tipo (atual, fiado, total)
    - Timestamps para auditoria
    - Referência ao caixa fechado
*/

-- =====================================================
-- TABELA FORMAS_PAGAMENTO_FECHAMENTO_CAIXA
-- =====================================================

CREATE TABLE IF NOT EXISTS formas_pagamento_fechamento_caixa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação e controle
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, -- Usuário que fechou o caixa
  caixa_controle_id UUID NOT NULL REFERENCES caixa_controle(id) ON DELETE CASCADE,
  
  -- Identificação da forma de pagamento
  forma_pagamento_opcao_id UUID NOT NULL, -- Referência para forma_pagamento_opcoes
  forma_pagamento_nome VARCHAR(100) NOT NULL, -- Nome da forma de pagamento (ex: Dinheiro, PIX, etc.)
  
  -- Valores detalhados
  valor_atual DECIMAL(10,2) DEFAULT 0.00, -- Valor das vendas normais do caixa
  valor_fiado DECIMAL(10,2) DEFAULT 0.00, -- Valor dos recebimentos de fiado
  valor_total DECIMAL(10,2) DEFAULT 0.00, -- Valor total (atual + fiado)
  
  -- Observações
  observacoes TEXT,
  
  -- Controle de timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para formas_pagamento_fechamento_caixa
CREATE INDEX IF NOT EXISTS idx_formas_pagamento_fechamento_empresa_id 
ON formas_pagamento_fechamento_caixa(empresa_id);

CREATE INDEX IF NOT EXISTS idx_formas_pagamento_fechamento_usuario_id 
ON formas_pagamento_fechamento_caixa(usuario_id);

CREATE INDEX IF NOT EXISTS idx_formas_pagamento_fechamento_caixa_id 
ON formas_pagamento_fechamento_caixa(caixa_controle_id);

CREATE INDEX IF NOT EXISTS idx_formas_pagamento_fechamento_forma_opcao 
ON formas_pagamento_fechamento_caixa(forma_pagamento_opcao_id);

CREATE INDEX IF NOT EXISTS idx_formas_pagamento_fechamento_created_at 
ON formas_pagamento_fechamento_caixa(created_at);

-- Índice composto para consultas por empresa e caixa
CREATE INDEX IF NOT EXISTS idx_formas_pagamento_fechamento_empresa_caixa 
ON formas_pagamento_fechamento_caixa(empresa_id, caixa_controle_id);

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

-- Comentários na tabela
COMMENT ON TABLE formas_pagamento_fechamento_caixa IS 'Tabela para armazenar detalhes das formas de pagamento no fechamento do caixa';
COMMENT ON COLUMN formas_pagamento_fechamento_caixa.usuario_id IS 'Usuário que realizou o fechamento do caixa';
COMMENT ON COLUMN formas_pagamento_fechamento_caixa.caixa_controle_id IS 'Referência para o caixa que foi fechado';
COMMENT ON COLUMN formas_pagamento_fechamento_caixa.forma_pagamento_opcao_id IS 'Referência para a forma de pagamento (dinheiro, pix, cartão, etc.)';
COMMENT ON COLUMN formas_pagamento_fechamento_caixa.forma_pagamento_nome IS 'Nome da forma de pagamento para facilitar consultas';
COMMENT ON COLUMN formas_pagamento_fechamento_caixa.valor_atual IS 'Valor das vendas normais do caixa nesta forma de pagamento';
COMMENT ON COLUMN formas_pagamento_fechamento_caixa.valor_fiado IS 'Valor dos recebimentos de fiado nesta forma de pagamento';
COMMENT ON COLUMN formas_pagamento_fechamento_caixa.valor_total IS 'Valor total (atual + fiado) nesta forma de pagamento';

-- =====================================================
-- CONSTRAINTS ADICIONAIS
-- =====================================================

-- Garantir que valores não sejam negativos
ALTER TABLE formas_pagamento_fechamento_caixa ADD CONSTRAINT chk_valor_atual_positivo 
CHECK (valor_atual >= 0);

ALTER TABLE formas_pagamento_fechamento_caixa ADD CONSTRAINT chk_valor_fiado_positivo 
CHECK (valor_fiado >= 0);

ALTER TABLE formas_pagamento_fechamento_caixa ADD CONSTRAINT chk_valor_total_positivo 
CHECK (valor_total >= 0);

-- Garantir que valor_total seja a soma de valor_atual + valor_fiado
ALTER TABLE formas_pagamento_fechamento_caixa ADD CONSTRAINT chk_valor_total_correto 
CHECK (valor_total = valor_atual + valor_fiado);

-- Garantir unicidade por caixa e forma de pagamento (evitar duplicatas)
ALTER TABLE formas_pagamento_fechamento_caixa ADD CONSTRAINT uk_caixa_forma_pagamento 
UNIQUE (caixa_controle_id, forma_pagamento_opcao_id);

-- =====================================================
-- TRIGGER PARA UPDATED_AT
-- =====================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_formas_pagamento_fechamento_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER trigger_formas_pagamento_fechamento_updated_at
  BEFORE UPDATE ON formas_pagamento_fechamento_caixa
  FOR EACH ROW
  EXECUTE FUNCTION update_formas_pagamento_fechamento_updated_at();

-- =====================================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS na tabela
ALTER TABLE formas_pagamento_fechamento_caixa ENABLE ROW LEVEL SECURITY;

-- Política para usuários autenticados acessarem apenas dados da sua empresa
CREATE POLICY "Usuários podem acessar formas de pagamento de fechamento da sua empresa"
ON formas_pagamento_fechamento_caixa
FOR ALL
TO authenticated
USING (
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios 
    WHERE id = auth.uid()
  )
);
