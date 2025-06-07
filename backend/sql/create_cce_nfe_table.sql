-- Tabela específica para Cartas de Correção Eletrônica (CCe)
-- Sistema SaaS multi-tenant com controle por empresa_id

CREATE TABLE IF NOT EXISTS cce_nfe (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relacionamentos
    pdv_id UUID NOT NULL REFERENCES pdv(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL, -- Controle SaaS multi-tenant
    
    -- Dados da NFe
    chave_nfe VARCHAR(44) NOT NULL,
    numero_nfe VARCHAR(20),
    
    -- Dados da CCe
    sequencia INTEGER NOT NULL,
    correcao TEXT NOT NULL,
    protocolo VARCHAR(50),
    data_envio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Status SEFAZ
    status VARCHAR(20) DEFAULT 'aceita',
    codigo_status INTEGER,
    descricao_status TEXT,
    ambiente VARCHAR(20) DEFAULT 'homologacao',
    
    -- Arquivos
    xml_path TEXT,
    xml_nome VARCHAR(255),
    pdf_path TEXT,
    pdf_nome VARCHAR(255),
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints únicos
    CONSTRAINT uk_cce_pdv_sequencia UNIQUE(pdv_id, sequencia),
    CONSTRAINT uk_cce_chave_sequencia UNIQUE(chave_nfe, sequencia),
    CONSTRAINT uk_cce_empresa_chave_sequencia UNIQUE(empresa_id, chave_nfe, sequencia)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cce_nfe_empresa_id ON cce_nfe(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cce_nfe_pdv_id ON cce_nfe(pdv_id);
CREATE INDEX IF NOT EXISTS idx_cce_nfe_chave_nfe ON cce_nfe(chave_nfe);
CREATE INDEX IF NOT EXISTS idx_cce_nfe_data_envio ON cce_nfe(data_envio);

-- Comentários para documentação
COMMENT ON TABLE cce_nfe IS 'Cartas de Correção Eletrônica (CCe) - Sistema SaaS multi-tenant';
COMMENT ON COLUMN cce_nfe.empresa_id IS 'ID da empresa (controle SaaS multi-tenant)';
COMMENT ON COLUMN cce_nfe.pdv_id IS 'Referência para a NFe na tabela pdv';
COMMENT ON COLUMN cce_nfe.chave_nfe IS 'Chave de acesso da NFe (44 dígitos)';
COMMENT ON COLUMN cce_nfe.sequencia IS 'Sequência da CCe (1-20 por NFe)';
COMMENT ON COLUMN cce_nfe.correcao IS 'Texto da correção (mínimo 15 caracteres)';
COMMENT ON COLUMN cce_nfe.protocolo IS 'Protocolo de autorização da SEFAZ';
COMMENT ON COLUMN cce_nfe.ambiente IS 'Ambiente SEFAZ (homologacao/producao)';
