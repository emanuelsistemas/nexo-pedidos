-- Criar tabela tipo_pagamentos_opcoes
-- Data: 06/08/2025
-- Descrição: Tabela para gerenciar tipos de pagamentos personalizados por empresa

-- =====================================================
-- CRIAR TABELA tipo_pagamentos_opcoes
-- =====================================================
CREATE TABLE IF NOT EXISTS tipo_pagamentos_opcoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Soft delete
    deletado BOOLEAN DEFAULT false NOT NULL,
    deletado_em TIMESTAMP WITH TIME ZONE,
    deletado_por_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    motivo_exclusao TEXT
);

-- =====================================================
-- CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_tipo_pagamentos_opcoes_empresa ON tipo_pagamentos_opcoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_tipo_pagamentos_opcoes_ativo ON tipo_pagamentos_opcoes(ativo);
CREATE INDEX IF NOT EXISTS idx_tipo_pagamentos_opcoes_deletado ON tipo_pagamentos_opcoes(deletado);
CREATE INDEX IF NOT EXISTS idx_tipo_pagamentos_opcoes_empresa_ativo ON tipo_pagamentos_opcoes(empresa_id, ativo) WHERE deletado = false;

-- =====================================================
-- CONSTRAINT PARA EVITAR DUPLICATAS
-- =====================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_tipo_pagamentos_opcoes_empresa_descricao_unique 
ON tipo_pagamentos_opcoes(empresa_id, LOWER(TRIM(descricao))) 
WHERE deletado = false;

-- =====================================================
-- TRIGGER PARA UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_tipo_pagamentos_opcoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tipo_pagamentos_opcoes_updated_at
    BEFORE UPDATE ON tipo_pagamentos_opcoes
    FOR EACH ROW
    EXECUTE FUNCTION update_tipo_pagamentos_opcoes_updated_at();

-- =====================================================
-- RLS (ROW LEVEL SECURITY)
-- =====================================================
ALTER TABLE tipo_pagamentos_opcoes ENABLE ROW LEVEL SECURITY;

-- Política para SELECT
CREATE POLICY "Usuários podem ver tipos de pagamentos da própria empresa" ON tipo_pagamentos_opcoes
    FOR SELECT USING (
        empresa_id IN (
            SELECT empresa_id FROM usuarios WHERE id = auth.uid()
        )
    );

-- Política para INSERT
CREATE POLICY "Usuários podem criar tipos de pagamentos na própria empresa" ON tipo_pagamentos_opcoes
    FOR INSERT WITH CHECK (
        empresa_id IN (
            SELECT empresa_id FROM usuarios WHERE id = auth.uid()
        )
    );

-- Política para UPDATE
CREATE POLICY "Usuários podem atualizar tipos de pagamentos da própria empresa" ON tipo_pagamentos_opcoes
    FOR UPDATE USING (
        empresa_id IN (
            SELECT empresa_id FROM usuarios WHERE id = auth.uid()
        )
    );

-- Política para DELETE
CREATE POLICY "Usuários podem deletar tipos de pagamentos da própria empresa" ON tipo_pagamentos_opcoes
    FOR DELETE USING (
        empresa_id IN (
            SELECT empresa_id FROM usuarios WHERE id = auth.uid()
        )
    );

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================
COMMENT ON TABLE tipo_pagamentos_opcoes IS 'Tipos de pagamentos personalizados por empresa';
COMMENT ON COLUMN tipo_pagamentos_opcoes.empresa_id IS 'ID da empresa proprietária do tipo de pagamento';
COMMENT ON COLUMN tipo_pagamentos_opcoes.descricao IS 'Descrição do tipo de pagamento (ex: PIX, Cartão, Dinheiro, etc.)';
COMMENT ON COLUMN tipo_pagamentos_opcoes.ativo IS 'Indica se o tipo de pagamento está ativo';
COMMENT ON COLUMN tipo_pagamentos_opcoes.deletado IS 'Soft delete - indica se foi excluído logicamente';
COMMENT ON COLUMN tipo_pagamentos_opcoes.deletado_em IS 'Data/hora da exclusão lógica';
COMMENT ON COLUMN tipo_pagamentos_opcoes.deletado_por_usuario_id IS 'Usuário que fez a exclusão lógica';
COMMENT ON COLUMN tipo_pagamentos_opcoes.motivo_exclusao IS 'Motivo da exclusão lógica';
