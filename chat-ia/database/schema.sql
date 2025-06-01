-- 🗄️ Schema Completo do Banco de Dados NFe/NFC-e
-- Supabase PostgreSQL

-- ============================================================================
-- TABELAS PRINCIPAIS
-- ============================================================================

-- Empresas (Multi-tenant)
CREATE TABLE IF NOT EXISTS empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    cnpj VARCHAR(18) UNIQUE,
    inscricao_estadual VARCHAR(20),
    regime_tributario INTEGER DEFAULT 1, -- 1=Simples, 2=Presumido, 3=Real
    
    -- Endereço
    endereco TEXT,
    numero VARCHAR(10),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    uf VARCHAR(2),
    cep VARCHAR(10),
    codigo_municipio VARCHAR(10),
    
    -- Contato
    telefone VARCHAR(20),
    email VARCHAR(255),
    
    -- Certificado Digital
    certificado_digital BOOLEAN DEFAULT false,
    certificado_senha VARCHAR(255), -- Criptografado
    certificado_validade DATE,
    certificado_nome VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurações NFe por empresa
CREATE TABLE IF NOT EXISTS nfe_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    
    -- Ambiente padrão
    ambiente VARCHAR(20) DEFAULT 'homologacao', -- homologacao, producao
    
    -- Numeração
    ultimo_numero_nfe INTEGER DEFAULT 0,
    ultimo_numero_nfce INTEGER DEFAULT 0,
    serie_nfe INTEGER DEFAULT 1,
    serie_nfce INTEGER DEFAULT 1,
    
    -- Configurações
    email_automatico BOOLEAN DEFAULT false,
    backup_xml BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(empresa_id)
);

-- Naturezas de Operação
CREATE TABLE IF NOT EXISTS nfe_natureza_op (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(10) NOT NULL, -- Código para XML
    descricao VARCHAR(255) NOT NULL, -- Descrição amigável
    tipo VARCHAR(20) DEFAULT 'venda', -- venda, compra, devolucao, etc
    ativo BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    
    -- Dados básicos
    nome VARCHAR(255) NOT NULL,
    razao_social VARCHAR(255),
    documento VARCHAR(18), -- CPF/CNPJ
    inscricao_estadual VARCHAR(20),
    
    -- Endereço
    endereco TEXT,
    numero VARCHAR(10),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    uf VARCHAR(2),
    cep VARCHAR(10),
    
    -- Contato
    telefones JSONB DEFAULT '[]', -- Array de telefones
    emails JSONB DEFAULT '[]', -- Array de emails
    
    -- Observações
    observacao_nfe TEXT, -- Para incluir na NFe
    observacao_interna TEXT, -- Uso interno
    
    -- Flags
    ativo BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Produtos
CREATE TABLE IF NOT EXISTS produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    
    -- Dados básicos
    codigo VARCHAR(50),
    descricao VARCHAR(255) NOT NULL,
    unidade VARCHAR(10) DEFAULT 'UN',
    
    -- Valores
    valor_unitario DECIMAL(10,2) DEFAULT 0,
    custo DECIMAL(10,2) DEFAULT 0,
    
    -- Dados fiscais
    ncm VARCHAR(10),
    cest VARCHAR(10),
    cfop VARCHAR(4) DEFAULT '5102',
    
    -- Impostos - Regime Normal
    cst VARCHAR(3),
    aliquota_icms DECIMAL(5,2) DEFAULT 0,
    
    -- Impostos - Simples Nacional  
    csosn VARCHAR(4),
    
    -- PIS/COFINS
    cst_pis VARCHAR(2),
    aliquota_pis DECIMAL(5,2) DEFAULT 0,
    cst_cofins VARCHAR(2), 
    aliquota_cofins DECIMAL(5,2) DEFAULT 0,
    
    -- Flags
    ativo BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendas/PDV (NFe e NFC-e)
CREATE TABLE IF NOT EXISTS pdv (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL, -- Referência ao auth.users
    cliente_id UUID REFERENCES clientes(id),
    
    -- Identificação do documento
    modelo_documento INTEGER DEFAULT 55, -- 55=NFe, 65=NFC-e
    serie_documento INTEGER DEFAULT 1,
    numero_documento INTEGER,
    
    -- NFe específico
    chave_nfe VARCHAR(44),
    status_nfe VARCHAR(20) DEFAULT 'rascunho', -- rascunho, emitido, autorizada, cancelada, rejeitada, inutilizada
    protocolo_nfe VARCHAR(20),
    data_emissao_nfe TIMESTAMP WITH TIME ZONE,
    xml_nfe TEXT,
    
    -- Dados da venda
    nome_cliente VARCHAR(255),
    valor_total DECIMAL(10,2) DEFAULT 0,
    valor_desconto DECIMAL(10,2) DEFAULT 0,
    valor_acrescimo DECIMAL(10,2) DEFAULT 0,
    
    -- Operação
    natureza_operacao VARCHAR(255),
    informacao_adicional TEXT,
    
    -- Rascunho
    data_rascunho TIMESTAMP WITH TIME ZONE,
    usuario_rascunho UUID,
    observacoes_rascunho TEXT,
    dados_nfe JSONB, -- JSON completo da NFe para rascunhos
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Itens das vendas
CREATE TABLE IF NOT EXISTS pdv_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL,
    pdv_id UUID REFERENCES pdv(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES produtos(id),
    
    -- Dados do item
    codigo_produto VARCHAR(50),
    nome_produto VARCHAR(255) NOT NULL,
    quantidade DECIMAL(10,3) DEFAULT 1,
    valor_unitario DECIMAL(10,2) DEFAULT 0,
    valor_total_item DECIMAL(10,2) DEFAULT 0,
    valor_desconto DECIMAL(10,2) DEFAULT 0,
    
    -- Dados fiscais
    ncm VARCHAR(10),
    cfop VARCHAR(4),
    cst VARCHAR(3),
    csosn VARCHAR(4),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================

-- Empresas
CREATE INDEX IF NOT EXISTS idx_empresas_cnpj ON empresas(cnpj);

-- Clientes
CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_documento ON clientes(documento);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);

-- Produtos
CREATE INDEX IF NOT EXISTS idx_produtos_empresa ON produtos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON produtos(codigo);
CREATE INDEX IF NOT EXISTS idx_produtos_descricao ON produtos(descricao);

-- PDV
CREATE INDEX IF NOT EXISTS idx_pdv_empresa ON pdv(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pdv_usuario ON pdv(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pdv_cliente ON pdv(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pdv_status ON pdv(status_nfe);
CREATE INDEX IF NOT EXISTS idx_pdv_numero ON pdv(numero_documento);
CREATE INDEX IF NOT EXISTS idx_pdv_chave ON pdv(chave_nfe);
CREATE INDEX IF NOT EXISTS idx_pdv_created ON pdv(created_at);

-- PDV Itens
CREATE INDEX IF NOT EXISTS idx_pdv_itens_pdv ON pdv_itens(pdv_id);
CREATE INDEX IF NOT EXISTS idx_pdv_itens_produto ON pdv_itens(produto_id);

-- ============================================================================
-- RLS (ROW LEVEL SECURITY)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfe_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdv ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdv_itens ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (exemplo - ajustar conforme necessário)
-- Usuários só veem dados da própria empresa

-- ============================================================================
-- DADOS INICIAIS
-- ============================================================================

-- Naturezas de Operação padrão
INSERT INTO nfe_natureza_op (codigo, descricao, tipo) VALUES
('5102', 'Venda de Mercadoria', 'venda'),
('5405', 'Venda de Mercadoria Sujeita ao Regime de Substituição Tributária', 'venda'),
('5101', 'Venda de Produção do Estabelecimento', 'venda'),
('6102', 'Venda de Mercadoria Adquirida de Terceiros', 'venda'),
('1102', 'Compra para Comercialização', 'compra'),
('1202', 'Devolução de Venda de Mercadoria', 'devolucao')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger nas tabelas
CREATE TRIGGER update_empresas_updated_at BEFORE UPDATE ON empresas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nfe_config_updated_at BEFORE UPDATE ON nfe_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON produtos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pdv_updated_at BEFORE UPDATE ON pdv FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
