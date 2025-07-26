/*
  # Criar tabelas para controle de Mesas e Comandas

  1. Tabela mesas:
    - Controla o range de mesas disponíveis por empresa
    - Campos: empresa_id, numero_inicio, numero_fim, ativo
    - Permite configurar quantas mesas a empresa tem
    
  2. Tabela comandas:
    - Controla o range de comandas disponíveis por empresa
    - Campos: empresa_id, numero_inicio, numero_fim, ativo
    - Permite configurar quantas comandas a empresa tem
    
  3. Funcionalidades:
    - Multi-tenant (isolamento por empresa_id)
    - Range configurável (início e fim)
    - Status ativo/inativo
    - Timestamps para auditoria
*/

-- =====================================================
-- TABELA MESAS
-- =====================================================

CREATE TABLE IF NOT EXISTS mesas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  numero_inicio INTEGER NOT NULL CHECK (numero_inicio > 0),
  numero_fim INTEGER NOT NULL CHECK (numero_fim >= numero_inicio),
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA COMANDAS
-- =====================================================

CREATE TABLE IF NOT EXISTS comandas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  numero_inicio INTEGER NOT NULL CHECK (numero_inicio > 0),
  numero_fim INTEGER NOT NULL CHECK (numero_fim >= numero_inicio),
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para consultas eficientes por empresa
CREATE INDEX IF NOT EXISTS idx_mesas_empresa_id ON mesas (empresa_id);
CREATE INDEX IF NOT EXISTS idx_comandas_empresa_id ON comandas (empresa_id);

-- Índices para consultas de ranges ativos
CREATE INDEX IF NOT EXISTS idx_mesas_ativo ON mesas (empresa_id, ativo) WHERE ativo = TRUE;
CREATE INDEX IF NOT EXISTS idx_comandas_ativo ON comandas (empresa_id, ativo) WHERE ativo = TRUE;

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

-- Trigger para atualizar updated_at automaticamente na tabela mesas
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_mesas_updated_at 
    BEFORE UPDATE ON mesas 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comandas_updated_at 
    BEFORE UPDATE ON comandas 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS nas tabelas
ALTER TABLE mesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE comandas ENABLE ROW LEVEL SECURITY;

-- Política para mesas - usuários só veem dados da própria empresa
CREATE POLICY "Usuários podem ver mesas da própria empresa" ON mesas
    FOR ALL USING (
        empresa_id IN (
            SELECT empresa_id 
            FROM usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política para comandas - usuários só veem dados da própria empresa
CREATE POLICY "Usuários podem ver comandas da própria empresa" ON comandas
    FOR ALL USING (
        empresa_id IN (
            SELECT empresa_id 
            FROM usuarios 
            WHERE id = auth.uid()
        )
    );

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE mesas IS 'Controla o range de mesas disponíveis por empresa para restaurantes';
COMMENT ON TABLE comandas IS 'Controla o range de comandas disponíveis por empresa para organização de pedidos';

COMMENT ON COLUMN mesas.numero_inicio IS 'Número inicial do range de mesas (ex: 1)';
COMMENT ON COLUMN mesas.numero_fim IS 'Número final do range de mesas (ex: 50)';
COMMENT ON COLUMN comandas.numero_inicio IS 'Número inicial do range de comandas (ex: 1)';
COMMENT ON COLUMN comandas.numero_fim IS 'Número final do range de comandas (ex: 100)';

-- =====================================================
-- CONSTRAINTS ADICIONAIS
-- =====================================================

-- Garantir que cada empresa tenha apenas um range ativo por vez
CREATE UNIQUE INDEX IF NOT EXISTS idx_mesas_empresa_ativo_unique 
ON mesas (empresa_id) WHERE ativo = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_comandas_empresa_ativo_unique 
ON comandas (empresa_id) WHERE ativo = TRUE;
