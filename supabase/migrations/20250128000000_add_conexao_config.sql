-- Criar tabela de configuração de conexão
CREATE TABLE IF NOT EXISTS conexao_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    habilita_conexao_whatsapp BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para empresa_id
CREATE INDEX IF NOT EXISTS idx_conexao_config_empresa_id ON conexao_config(empresa_id);

-- Adicionar RLS (Row Level Security)
ALTER TABLE conexao_config ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam apenas dados da sua empresa
CREATE POLICY "Users can view conexao_config from their company" ON conexao_config
    FOR SELECT USING (
        empresa_id IN (
            SELECT empresa_id FROM usuarios WHERE id = auth.uid()
        )
    );

-- Política para permitir que usuários insiram dados apenas para sua empresa
CREATE POLICY "Users can insert conexao_config for their company" ON conexao_config
    FOR INSERT WITH CHECK (
        empresa_id IN (
            SELECT empresa_id FROM usuarios WHERE id = auth.uid()
        )
    );

-- Política para permitir que usuários atualizem dados apenas da sua empresa
CREATE POLICY "Users can update conexao_config from their company" ON conexao_config
    FOR UPDATE USING (
        empresa_id IN (
            SELECT empresa_id FROM usuarios WHERE id = auth.uid()
        )
    );

-- Política para permitir que usuários deletem dados apenas da sua empresa
CREATE POLICY "Users can delete conexao_config from their company" ON conexao_config
    FOR DELETE USING (
        empresa_id IN (
            SELECT empresa_id FROM usuarios WHERE id = auth.uid()
        )
    );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_conexao_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conexao_config_updated_at
    BEFORE UPDATE ON conexao_config
    FOR EACH ROW
    EXECUTE FUNCTION update_conexao_config_updated_at();
