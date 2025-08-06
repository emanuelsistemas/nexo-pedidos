-- Criar tabela pagamentos_caixa
-- Data: 06/08/2025
-- Descrição: Tabela para registrar todos os pagamentos recebidos no caixa

-- =====================================================
-- CRIAR TABELA pagamentos_caixa
-- =====================================================
CREATE TABLE IF NOT EXISTS pagamentos_caixa (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    caixa_controle_id UUID NOT NULL REFERENCES caixa_controle(id) ON DELETE CASCADE,
    formas_pagamento_empresa_id UUID REFERENCES formas_pagamento_empresa(id) ON DELETE SET NULL,
    tipo_pagamentos_opcoes_id UUID REFERENCES tipo_pagamentos_opcoes(id) ON DELETE SET NULL,
    valor_pagamento NUMERIC(10,2) NOT NULL DEFAULT 0,
    observacoes TEXT,
    descricao TEXT,
    data_pagamento TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Soft delete
    deletado BOOLEAN DEFAULT false NOT NULL,
    deletado_em TIMESTAMP WITH TIME ZONE,
    deletado_por_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    motivo_exclusao TEXT,
    
    -- Constraints
    CONSTRAINT pagamentos_caixa_valor_positivo CHECK (valor_pagamento >= 0)
);

-- =====================================================
-- CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_pagamentos_caixa_empresa ON pagamentos_caixa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_caixa_caixa_controle ON pagamentos_caixa(caixa_controle_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_caixa_forma_pagamento ON pagamentos_caixa(formas_pagamento_empresa_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_caixa_tipo_pagamento ON pagamentos_caixa(tipo_pagamentos_opcoes_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_caixa_data ON pagamentos_caixa(data_pagamento);
CREATE INDEX IF NOT EXISTS idx_pagamentos_caixa_deletado ON pagamentos_caixa(deletado);
CREATE INDEX IF NOT EXISTS idx_pagamentos_caixa_empresa_caixa ON pagamentos_caixa(empresa_id, caixa_controle_id) WHERE deletado = false;

-- =====================================================
-- TRIGGER PARA UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_pagamentos_caixa_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pagamentos_caixa_updated_at
    BEFORE UPDATE ON pagamentos_caixa
    FOR EACH ROW
    EXECUTE FUNCTION update_pagamentos_caixa_updated_at();

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================
COMMENT ON TABLE pagamentos_caixa IS 'Registro de todos os pagamentos recebidos no caixa';
COMMENT ON COLUMN pagamentos_caixa.empresa_id IS 'ID da empresa proprietária do pagamento';
COMMENT ON COLUMN pagamentos_caixa.caixa_controle_id IS 'ID do caixa onde foi recebido o pagamento';
COMMENT ON COLUMN pagamentos_caixa.formas_pagamento_empresa_id IS 'Forma de pagamento utilizada (opcional)';
COMMENT ON COLUMN pagamentos_caixa.tipo_pagamentos_opcoes_id IS 'Tipo de pagamento personalizado (opcional)';
COMMENT ON COLUMN pagamentos_caixa.valor_pagamento IS 'Valor do pagamento recebido';
COMMENT ON COLUMN pagamentos_caixa.observacoes IS 'Observações sobre o pagamento';
COMMENT ON COLUMN pagamentos_caixa.descricao IS 'Descrição do pagamento';
COMMENT ON COLUMN pagamentos_caixa.data_pagamento IS 'Data e hora do pagamento';
COMMENT ON COLUMN pagamentos_caixa.deletado IS 'Soft delete - indica se foi excluído logicamente';
COMMENT ON COLUMN pagamentos_caixa.deletado_em IS 'Data/hora da exclusão lógica';
COMMENT ON COLUMN pagamentos_caixa.deletado_por_usuario_id IS 'Usuário que fez a exclusão lógica';
COMMENT ON COLUMN pagamentos_caixa.motivo_exclusao IS 'Motivo da exclusão lógica';
