/*
  # Criar tabela para controle de Mesas

  1. Tabela mesas:
    - Controla o range de mesas disponíveis por empresa
    - Campos: empresa_id, numero_inicio, numero_fim, ativo
    - Permite configurar quantas mesas a empresa tem
    - Multi-tenant (isolamento por empresa_id)
    
  2. Funcionalidades:
    - Range configurável (início e fim)
    - Status ativo/inativo
    - Timestamps para auditoria
    - RLS para segurança multi-tenant
    
  3. Uso:
    - Restaurantes podem configurar mesas de 1 a 50
    - Lanchonetes podem ter mesas de 1 a 20
    - Cada empresa tem seu próprio range independente
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
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índice para consultas eficientes por empresa
CREATE INDEX IF NOT EXISTS idx_mesas_empresa_id ON mesas (empresa_id);

-- Índice para consultas de ranges ativos
CREATE INDEX IF NOT EXISTS idx_mesas_ativo ON mesas (empresa_id, ativo) WHERE ativo = TRUE;

-- =====================================================
-- TRIGGER PARA UPDATED_AT
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_mesas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at automaticamente na tabela mesas
CREATE TRIGGER update_mesas_updated_at 
    BEFORE UPDATE ON mesas 
    FOR EACH ROW 
    EXECUTE FUNCTION update_mesas_updated_at();

-- =====================================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS na tabela
ALTER TABLE mesas ENABLE ROW LEVEL SECURITY;

-- Política para mesas - usuários só veem dados da própria empresa
CREATE POLICY "Usuários podem gerenciar mesas da própria empresa" ON mesas
    FOR ALL USING (
        empresa_id IN (
            SELECT empresa_id 
            FROM usuarios 
            WHERE id = auth.uid()
        )
    );

-- =====================================================
-- CONSTRAINT ADICIONAL
-- =====================================================

-- Garantir que cada empresa tenha apenas um range ativo por vez
CREATE UNIQUE INDEX IF NOT EXISTS idx_mesas_empresa_ativo_unique 
ON mesas (empresa_id) WHERE ativo = TRUE;

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE mesas IS 'Controla o range de mesas disponíveis por empresa para restaurantes e estabelecimentos com atendimento no local';

COMMENT ON COLUMN mesas.empresa_id IS 'ID da empresa proprietária das mesas (multi-tenant)';
COMMENT ON COLUMN mesas.numero_inicio IS 'Número inicial do range de mesas (ex: 1)';
COMMENT ON COLUMN mesas.numero_fim IS 'Número final do range de mesas (ex: 50)';
COMMENT ON COLUMN mesas.ativo IS 'Se este range está ativo (apenas um range ativo por empresa)';

-- =====================================================
-- EXEMPLOS DE USO
-- =====================================================

/*
Exemplos de como a tabela mesas será usada:

-- Configurar mesas para um restaurante (mesas 1 a 50)
INSERT INTO mesas (empresa_id, numero_inicio, numero_fim, ativo)
VALUES ('uuid-empresa-restaurante', 1, 50, TRUE);

-- Configurar mesas para uma lanchonete (mesas 1 a 20)
INSERT INTO mesas (empresa_id, numero_inicio, numero_fim, ativo)
VALUES ('uuid-empresa-lanchonete', 1, 20, TRUE);

-- Consultar range de mesas ativo de uma empresa
SELECT numero_inicio, numero_fim 
FROM mesas 
WHERE empresa_id = 'uuid-da-empresa' 
  AND ativo = TRUE;

-- Atualizar range de mesas (desativa o anterior e cria novo)
UPDATE mesas SET ativo = FALSE WHERE empresa_id = 'uuid-da-empresa';
INSERT INTO mesas (empresa_id, numero_inicio, numero_fim, ativo)
VALUES ('uuid-da-empresa', 1, 30, TRUE);

-- Verificar se uma mesa específica está no range
SELECT EXISTS(
  SELECT 1 FROM mesas 
  WHERE empresa_id = 'uuid-da-empresa' 
    AND ativo = TRUE 
    AND 15 BETWEEN numero_inicio AND numero_fim
) AS mesa_valida;
*/
