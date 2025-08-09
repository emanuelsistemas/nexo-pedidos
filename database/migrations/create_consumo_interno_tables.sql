-- =====================================================
-- CRIAÇÃO DAS TABELAS PARA CONTROLE DE CONSUMO INTERNO
-- =====================================================

-- Tabela principal para registrar consumos internos
CREATE TABLE IF NOT EXISTS consumo_interno (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    caixa_controle_id UUID REFERENCES caixa_controle(id) ON DELETE SET NULL,
    data_consumo TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    observacao TEXT,
    total_itens INTEGER DEFAULT 0,
    valor_total DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deletado BOOLEAN DEFAULT FALSE,
    deletado_em TIMESTAMP WITH TIME ZONE,
    deletado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Tabela para os itens do consumo interno
CREATE TABLE IF NOT EXISTS consumo_interno_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consumo_interno_id UUID NOT NULL REFERENCES consumo_interno(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    nome_produto VARCHAR(255) NOT NULL,
    codigo_produto VARCHAR(50),
    quantidade DECIMAL(10,3) NOT NULL,
    unidade_medida VARCHAR(10),
    valor_unitario DECIMAL(10,2) DEFAULT 0.00,
    valor_total DECIMAL(10,2) DEFAULT 0.00,
    observacao_item TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deletado BOOLEAN DEFAULT FALSE
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para consumo_interno
CREATE INDEX IF NOT EXISTS idx_consumo_interno_empresa_id ON consumo_interno(empresa_id);
CREATE INDEX IF NOT EXISTS idx_consumo_interno_usuario_id ON consumo_interno(usuario_id);
CREATE INDEX IF NOT EXISTS idx_consumo_interno_caixa_id ON consumo_interno(caixa_controle_id);
CREATE INDEX IF NOT EXISTS idx_consumo_interno_data ON consumo_interno(data_consumo);
CREATE INDEX IF NOT EXISTS idx_consumo_interno_deletado ON consumo_interno(deletado);
CREATE INDEX IF NOT EXISTS idx_consumo_interno_empresa_data ON consumo_interno(empresa_id, data_consumo);

-- Índices para consumo_interno_itens
CREATE INDEX IF NOT EXISTS idx_consumo_interno_itens_consumo_id ON consumo_interno_itens(consumo_interno_id);
CREATE INDEX IF NOT EXISTS idx_consumo_interno_itens_produto_id ON consumo_interno_itens(produto_id);
CREATE INDEX IF NOT EXISTS idx_consumo_interno_itens_deletado ON consumo_interno_itens(deletado);

-- =====================================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS nas tabelas
ALTER TABLE consumo_interno ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumo_interno_itens ENABLE ROW LEVEL SECURITY;

-- Política para consumo_interno - usuários só veem dados da própria empresa
CREATE POLICY "Usuários veem consumo interno da própria empresa" ON consumo_interno
    FOR ALL USING (
        empresa_id IN (
            SELECT empresa_id FROM usuarios WHERE id = auth.uid()
        )
    );

-- Política para consumo_interno_itens - através da relação com consumo_interno
CREATE POLICY "Usuários veem itens de consumo da própria empresa" ON consumo_interno_itens
    FOR ALL USING (
        consumo_interno_id IN (
            SELECT id FROM consumo_interno 
            WHERE empresa_id IN (
                SELECT empresa_id FROM usuarios WHERE id = auth.uid()
            )
        )
    );

-- =====================================================
-- TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- =====================================================

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_consumo_interno_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_consumo_interno_updated_at
    BEFORE UPDATE ON consumo_interno
    FOR EACH ROW
    EXECUTE FUNCTION update_consumo_interno_updated_at();

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE consumo_interno IS 'Registra consumos internos da empresa (produtos retirados para uso próprio)';
COMMENT ON COLUMN consumo_interno.empresa_id IS 'ID da empresa (isolamento multi-tenant)';
COMMENT ON COLUMN consumo_interno.usuario_id IS 'Usuário que registrou o consumo';
COMMENT ON COLUMN consumo_interno.caixa_controle_id IS 'Caixa onde foi registrado o consumo (se aplicável)';
COMMENT ON COLUMN consumo_interno.data_consumo IS 'Data e hora do consumo';
COMMENT ON COLUMN consumo_interno.observacao IS 'Observação sobre o motivo do consumo';
COMMENT ON COLUMN consumo_interno.total_itens IS 'Quantidade total de itens consumidos';
COMMENT ON COLUMN consumo_interno.valor_total IS 'Valor total dos produtos consumidos';

COMMENT ON TABLE consumo_interno_itens IS 'Itens específicos de cada consumo interno';
COMMENT ON COLUMN consumo_interno_itens.consumo_interno_id IS 'Referência ao consumo interno';
COMMENT ON COLUMN consumo_interno_itens.produto_id IS 'Produto consumido';
COMMENT ON COLUMN consumo_interno_itens.nome_produto IS 'Nome do produto (snapshot)';
COMMENT ON COLUMN consumo_interno_itens.codigo_produto IS 'Código do produto (snapshot)';
COMMENT ON COLUMN consumo_interno_itens.quantidade IS 'Quantidade consumida';
COMMENT ON COLUMN consumo_interno_itens.unidade_medida IS 'Unidade de medida do produto';
COMMENT ON COLUMN consumo_interno_itens.valor_unitario IS 'Valor unitário do produto no momento do consumo';
COMMENT ON COLUMN consumo_interno_itens.valor_total IS 'Valor total do item (quantidade × valor_unitario)';
COMMENT ON COLUMN consumo_interno_itens.observacao_item IS 'Observação específica do item';
