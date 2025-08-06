-- Criar tabelas para sangria e suprimento
-- Data: 06/08/2025
-- Descrição: Tabelas independentes para controle de sangrias e suprimentos do caixa

/*
  # Criar tabelas para sangria e suprimento

  1. Nova Tabela sangrias:
    - Registra todas as sangrias realizadas no caixa
    - Vinculada ao caixa_controle_id
    - Permite múltiplas sangrias por caixa
    
  2. Nova Tabela suprimentos:
    - Registra todos os suprimentos realizados no caixa
    - Vinculada ao caixa_controle_id
    - Permite múltiplos suprimentos por caixa
    
  3. Remoção dos campos sangria e suprimento da tabela caixa_controle:
    - Campos serão removidos pois agora temos controle detalhado
    - Relacionamento através das novas tabelas
*/

-- =====================================================
-- TABELA SANGRIAS
-- =====================================================

CREATE TABLE IF NOT EXISTS sangrias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação e controle
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, -- Usuário que fez a sangria
  caixa_controle_id UUID NOT NULL REFERENCES caixa_controle(id) ON DELETE CASCADE,
  
  -- Dados da sangria
  data TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valor DECIMAL(10,2) NOT NULL CHECK (valor > 0),
  observacao TEXT,
  
  -- Controle de timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA SUPRIMENTOS
-- =====================================================

CREATE TABLE IF NOT EXISTS suprimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação e controle
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, -- Usuário que fez o suprimento
  caixa_controle_id UUID NOT NULL REFERENCES caixa_controle(id) ON DELETE CASCADE,
  
  -- Dados do suprimento
  data TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valor DECIMAL(10,2) NOT NULL CHECK (valor > 0),
  observacao TEXT,
  
  -- Controle de timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para sangrias
CREATE INDEX IF NOT EXISTS idx_sangrias_empresa_id ON sangrias(empresa_id);
CREATE INDEX IF NOT EXISTS idx_sangrias_usuario_id ON sangrias(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sangrias_caixa_controle_id ON sangrias(caixa_controle_id);
CREATE INDEX IF NOT EXISTS idx_sangrias_data ON sangrias(data);
CREATE INDEX IF NOT EXISTS idx_sangrias_created_at ON sangrias(created_at);

-- Índice composto para consultas por empresa e caixa
CREATE INDEX IF NOT EXISTS idx_sangrias_empresa_caixa ON sangrias(empresa_id, caixa_controle_id);

-- Índices para suprimentos
CREATE INDEX IF NOT EXISTS idx_suprimentos_empresa_id ON suprimentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_suprimentos_usuario_id ON suprimentos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_suprimentos_caixa_controle_id ON suprimentos(caixa_controle_id);
CREATE INDEX IF NOT EXISTS idx_suprimentos_data ON suprimentos(data);
CREATE INDEX IF NOT EXISTS idx_suprimentos_created_at ON suprimentos(created_at);

-- Índice composto para consultas por empresa e caixa
CREATE INDEX IF NOT EXISTS idx_suprimentos_empresa_caixa ON suprimentos(empresa_id, caixa_controle_id);

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

-- Comentários na tabela sangrias
COMMENT ON TABLE sangrias IS 'Tabela para registrar todas as sangrias realizadas no caixa';
COMMENT ON COLUMN sangrias.usuario_id IS 'Usuário que realizou a sangria';
COMMENT ON COLUMN sangrias.caixa_controle_id IS 'Referência para o caixa onde foi feita a sangria';
COMMENT ON COLUMN sangrias.data IS 'Data e hora da sangria';
COMMENT ON COLUMN sangrias.valor IS 'Valor da sangria (sempre positivo)';
COMMENT ON COLUMN sangrias.observacao IS 'Observação sobre a sangria (motivo, etc.)';

-- Comentários na tabela suprimentos
COMMENT ON TABLE suprimentos IS 'Tabela para registrar todos os suprimentos realizados no caixa';
COMMENT ON COLUMN suprimentos.usuario_id IS 'Usuário que realizou o suprimento';
COMMENT ON COLUMN suprimentos.caixa_controle_id IS 'Referência para o caixa onde foi feito o suprimento';
COMMENT ON COLUMN suprimentos.data IS 'Data e hora do suprimento';
COMMENT ON COLUMN suprimentos.valor IS 'Valor do suprimento (sempre positivo)';
COMMENT ON COLUMN suprimentos.observacao IS 'Observação sobre o suprimento (motivo, etc.)';

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_sangrias_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_suprimentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at automaticamente
CREATE TRIGGER trigger_sangrias_updated_at
  BEFORE UPDATE ON sangrias
  FOR EACH ROW
  EXECUTE FUNCTION update_sangrias_updated_at();

CREATE TRIGGER trigger_suprimentos_updated_at
  BEFORE UPDATE ON suprimentos
  FOR EACH ROW
  EXECUTE FUNCTION update_suprimentos_updated_at();

-- =====================================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS nas tabelas
ALTER TABLE sangrias ENABLE ROW LEVEL SECURITY;
ALTER TABLE suprimentos ENABLE ROW LEVEL SECURITY;

-- Políticas para usuários autenticados acessarem apenas dados da sua empresa
CREATE POLICY "Usuários podem acessar sangrias da sua empresa"
ON sangrias
FOR ALL
TO authenticated
USING (
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Usuários podem acessar suprimentos da sua empresa"
ON suprimentos
FOR ALL
TO authenticated
USING (
  empresa_id IN (
    SELECT empresa_id 
    FROM usuarios 
    WHERE id = auth.uid()
  )
);

-- =====================================================
-- REMOVER CAMPOS SANGRIA E SUPRIMENTO DA TABELA CAIXA_CONTROLE
-- =====================================================

-- Remover os campos que não são mais necessários
ALTER TABLE caixa_controle DROP COLUMN IF EXISTS sangria;
ALTER TABLE caixa_controle DROP COLUMN IF EXISTS suprimento;
