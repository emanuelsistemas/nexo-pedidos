/*
  # Add cliente_formas_pagamento tables

  1. Changes
    - Create formas_pagamento_tipos table for payment method types
    - Create cliente_formas_pagamento table for client payment methods
*/

-- Table for payment method types
CREATE TABLE IF NOT EXISTS formas_pagamento_tipos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'transferencia', 'boleto', 'outro')),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX idx_formas_pagamento_tipos_empresa_id ON formas_pagamento_tipos(empresa_id);

-- Insert default payment methods for all companies
INSERT INTO formas_pagamento_tipos (nome, tipo, empresa_id)
SELECT 'Dinheiro', 'dinheiro', id FROM empresas
ON CONFLICT DO NOTHING;

INSERT INTO formas_pagamento_tipos (nome, tipo, empresa_id)
SELECT 'PIX', 'pix', id FROM empresas
ON CONFLICT DO NOTHING;

INSERT INTO formas_pagamento_tipos (nome, tipo, empresa_id)
SELECT 'Cartão de Crédito', 'cartao_credito', id FROM empresas
ON CONFLICT DO NOTHING;

INSERT INTO formas_pagamento_tipos (nome, tipo, empresa_id)
SELECT 'Cartão de Débito', 'cartao_debito', id FROM empresas
ON CONFLICT DO NOTHING;

-- Table for client payment methods
CREATE TABLE IF NOT EXISTS cliente_formas_pagamento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  forma_pagamento_id UUID NOT NULL REFERENCES formas_pagamento_tipos(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  prazo_dias INTEGER DEFAULT 0,
  percentual_desconto DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_cliente_formas_pagamento_cliente_id ON cliente_formas_pagamento(cliente_id);
CREATE INDEX idx_cliente_formas_pagamento_empresa_id ON cliente_formas_pagamento(empresa_id);
CREATE INDEX idx_cliente_formas_pagamento_forma_id ON cliente_formas_pagamento(forma_pagamento_id);

-- Add multiple payment methods field to pedidos table
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS formas_pagamento JSONB;
