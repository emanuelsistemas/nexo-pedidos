-- Criar tabela de configurações NFe por empresa
CREATE TABLE IF NOT EXISTS nfe_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    ambiente VARCHAR(20) NOT NULL DEFAULT 'homologacao' CHECK (ambiente IN ('homologacao', 'producao')),

    -- Campos CSC para NFCe (Código de Segurança do Contribuinte)
    csc_homologacao VARCHAR(36) NULL,
    csc_id_homologacao INTEGER NULL,
    csc_producao VARCHAR(36) NULL,
    csc_id_producao INTEGER NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Garantir que cada empresa tenha apenas uma configuração
    UNIQUE(empresa_id)
);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_nfe_config_empresa_id ON nfe_config(empresa_id);

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_nfe_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_nfe_config_updated_at
    BEFORE UPDATE ON nfe_config
    FOR EACH ROW
    EXECUTE FUNCTION update_nfe_config_updated_at();

-- Inserir configuração padrão para empresas existentes (ambiente homologação)
INSERT INTO nfe_config (empresa_id, ambiente)
SELECT id, 'homologacao'
FROM empresas
WHERE id NOT IN (SELECT empresa_id FROM nfe_config);

-- Comentários para documentação
COMMENT ON TABLE nfe_config IS 'Configurações de NFe por empresa';
COMMENT ON COLUMN nfe_config.empresa_id IS 'ID da empresa proprietária da configuração';
COMMENT ON COLUMN nfe_config.ambiente IS 'Ambiente NFe: homologacao ou producao';
COMMENT ON COLUMN nfe_config.created_at IS 'Data de criação do registro';
COMMENT ON COLUMN nfe_config.updated_at IS 'Data da última atualização';
