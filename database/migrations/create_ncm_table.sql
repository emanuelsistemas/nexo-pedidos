-- =====================================================
-- TABELA NCM - CORRESPONDÊNCIA NCM-CEST
-- =====================================================
-- Tabela de referência geral para correspondência entre NCM e CEST
-- Baseada no Convênio ICMS 92/15 e atualizações
-- Sem proteção RLS - uso geral para todas as empresas
-- =====================================================

CREATE TABLE IF NOT EXISTS ncm (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Dados do NCM
    codigo_ncm VARCHAR(8) NOT NULL, -- NCM com 8 dígitos (ex: 22021000)
    descricao_ncm TEXT NOT NULL, -- Descrição completa do NCM
    
    -- Dados do CEST (quando aplicável)
    codigo_cest VARCHAR(7), -- CEST com 7 dígitos (ex: 03.001.00) - NULL se não tem ST
    descricao_cest TEXT, -- Descrição específica do CEST
    especificacao_cest TEXT, -- Especificações adicionais (embalagem, capacidade, etc.)
    
    -- Classificação e organização
    segmento_cest VARCHAR(2), -- Primeiros 2 dígitos do CEST (ex: 03 para bebidas)
    item_cest VARCHAR(3), -- Dígitos 3-5 do CEST (ex: 001)
    especificacao_item VARCHAR(2), -- Últimos 2 dígitos do CEST (ex: 00)
    
    -- Informações de substituição tributária
    tem_substituicao_tributaria BOOLEAN DEFAULT FALSE, -- Se o produto tem ST
    categoria_st VARCHAR(100), -- Categoria de ST (ex: "BEBIDAS", "AUTOPEÇAS")
    
    -- Informações adicionais
    unidade_medida VARCHAR(10), -- Unidade padrão (UN, KG, L, etc.)
    observacoes TEXT, -- Observações importantes sobre o NCM/CEST
    
    -- Metadados
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índice principal para busca por NCM
CREATE INDEX IF NOT EXISTS idx_ncm_codigo_ncm ON ncm(codigo_ncm);

-- Índice para busca por CEST
CREATE INDEX IF NOT EXISTS idx_ncm_codigo_cest ON ncm(codigo_cest) WHERE codigo_cest IS NOT NULL;

-- Índice para busca por categoria de ST
CREATE INDEX IF NOT EXISTS idx_ncm_categoria_st ON ncm(categoria_st) WHERE categoria_st IS NOT NULL;

-- Índice para busca por produtos com ST
CREATE INDEX IF NOT EXISTS idx_ncm_tem_st ON ncm(tem_substituicao_tributaria) WHERE tem_substituicao_tributaria = TRUE;

-- Índice composto para busca eficiente
CREATE INDEX IF NOT EXISTS idx_ncm_codigo_ativo ON ncm(codigo_ncm, ativo);

-- =====================================================
-- TRIGGER PARA ATUALIZAR updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_ncm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ncm_updated_at
    BEFORE UPDATE ON ncm
    FOR EACH ROW
    EXECUTE FUNCTION update_ncm_updated_at();

-- =====================================================
-- COMENTÁRIOS NA TABELA
-- =====================================================

COMMENT ON TABLE ncm IS 'Tabela de correspondência NCM-CEST para substituição tributária - Uso geral sem proteção RLS';
COMMENT ON COLUMN ncm.codigo_ncm IS 'Código NCM com 8 dígitos (ex: 22021000)';
COMMENT ON COLUMN ncm.descricao_ncm IS 'Descrição completa do NCM conforme tabela oficial';
COMMENT ON COLUMN ncm.codigo_cest IS 'Código CEST com 7 dígitos (ex: 03.001.00) - NULL se não tem substituição tributária';
COMMENT ON COLUMN ncm.descricao_cest IS 'Descrição específica do CEST conforme Convênio ICMS 92/15';
COMMENT ON COLUMN ncm.especificacao_cest IS 'Especificações adicionais do CEST (tipo embalagem, capacidade, etc.)';
COMMENT ON COLUMN ncm.tem_substituicao_tributaria IS 'Indica se o produto está sujeito à substituição tributária';
COMMENT ON COLUMN ncm.categoria_st IS 'Categoria de substituição tributária (BEBIDAS, AUTOPEÇAS, etc.)';
