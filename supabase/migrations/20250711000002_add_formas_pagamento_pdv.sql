-- Adicionar campos para formas de pagamento no PDV
-- Data: 11/07/2025
-- Descrição: Campos para configurar formas de pagamento específicas da empresa no PDV

-- Criar tabela para formas de pagamento configuradas por empresa
CREATE TABLE IF NOT EXISTS formas_pagamento_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    forma_pagamento_opcao_id UUID NOT NULL REFERENCES forma_pagamento_opcoes(id) ON DELETE CASCADE,
    
    -- Configurações específicas
    ativo BOOLEAN DEFAULT true,
    cardapio_digital BOOLEAN DEFAULT false,
    
    -- Configurações para cartão de crédito
    max_parcelas INTEGER DEFAULT 1,
    juros_por_parcela NUMERIC(5,2) DEFAULT 0.00, -- Percentual de juros por parcela
    
    -- Controle
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint para garantir uma forma de pagamento por empresa
    CONSTRAINT uk_formas_pagamento_empresa UNIQUE (empresa_id, forma_pagamento_opcao_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_formas_pagamento_empresa_empresa_id ON formas_pagamento_empresa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_formas_pagamento_empresa_forma_opcao_id ON formas_pagamento_empresa(forma_pagamento_opcao_id);

-- Desabilitar RLS (tabela desprotegida conforme solicitado)
ALTER TABLE formas_pagamento_empresa DISABLE ROW LEVEL SECURITY;

-- Comentários
COMMENT ON TABLE formas_pagamento_empresa IS 'Formas de pagamento configuradas por empresa para uso no PDV';
COMMENT ON COLUMN formas_pagamento_empresa.cardapio_digital IS 'Se esta forma de pagamento deve aparecer no cardápio digital';
COMMENT ON COLUMN formas_pagamento_empresa.max_parcelas IS 'Número máximo de parcelas permitidas (usado principalmente para cartão de crédito)';
COMMENT ON COLUMN formas_pagamento_empresa.juros_por_parcela IS 'Percentual de juros aplicado por parcela (ex: 2.5 para 2,5% ao mês)';
