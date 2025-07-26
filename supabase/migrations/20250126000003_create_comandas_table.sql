/*
  # Criar tabela para controle de Comandas

  1. Tabela comandas:
    - Controla o range de comandas disponíveis por empresa
    - Campos: empresa_id, numero_inicio, numero_fim, ativo
    - Permite configurar quantas comandas a empresa tem
    - Multi-tenant (isolamento por empresa_id)
    
  2. Funcionalidades:
    - Range configurável (início e fim)
    - Status ativo/inativo
    - Timestamps para auditoria
    - RLS para segurança multi-tenant
    
  3. Uso:
    - Bares podem configurar comandas de 1 a 200
    - Restaurantes podem ter comandas de 1 a 100
    - Cada empresa tem seu próprio range independente
*/

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

-- Índice para consultas eficientes por empresa
CREATE INDEX IF NOT EXISTS idx_comandas_empresa_id ON comandas (empresa_id);

-- Índice para consultas de ranges ativos
CREATE INDEX IF NOT EXISTS idx_comandas_ativo ON comandas (empresa_id, ativo) WHERE ativo = TRUE;

-- =====================================================
-- TRIGGER PARA UPDATED_AT
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_comandas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at automaticamente na tabela comandas
CREATE TRIGGER update_comandas_updated_at 
    BEFORE UPDATE ON comandas 
    FOR EACH ROW 
    EXECUTE FUNCTION update_comandas_updated_at();

-- =====================================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS na tabela
ALTER TABLE comandas ENABLE ROW LEVEL SECURITY;

-- Política para comandas - usuários só veem dados da própria empresa
CREATE POLICY "Usuários podem gerenciar comandas da própria empresa" ON comandas
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_comandas_empresa_ativo_unique 
ON comandas (empresa_id) WHERE ativo = TRUE;

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE comandas IS 'Controla o range de comandas disponíveis por empresa para organização de pedidos numerados';

COMMENT ON COLUMN comandas.empresa_id IS 'ID da empresa proprietária das comandas (multi-tenant)';
COMMENT ON COLUMN comandas.numero_inicio IS 'Número inicial do range de comandas (ex: 1)';
COMMENT ON COLUMN comandas.numero_fim IS 'Número final do range de comandas (ex: 200)';
COMMENT ON COLUMN comandas.ativo IS 'Se este range está ativo (apenas um range ativo por empresa)';

-- =====================================================
-- EXEMPLOS DE USO
-- =====================================================

/*
Exemplos de como a tabela comandas será usada:

-- Configurar comandas para um bar (comandas 1 a 200)
INSERT INTO comandas (empresa_id, numero_inicio, numero_fim, ativo)
VALUES ('uuid-empresa-bar', 1, 200, TRUE);

-- Configurar comandas para um restaurante (comandas 1 a 100)
INSERT INTO comandas (empresa_id, numero_inicio, numero_fim, ativo)
VALUES ('uuid-empresa-restaurante', 1, 100, TRUE);

-- Consultar range de comandas ativo de uma empresa
SELECT numero_inicio, numero_fim 
FROM comandas 
WHERE empresa_id = 'uuid-da-empresa' 
  AND ativo = TRUE;

-- Atualizar range de comandas (desativa o anterior e cria novo)
UPDATE comandas SET ativo = FALSE WHERE empresa_id = 'uuid-da-empresa';
INSERT INTO comandas (empresa_id, numero_inicio, numero_fim, ativo)
VALUES ('uuid-da-empresa', 1, 150, TRUE);

-- Verificar se uma comanda específica está no range
SELECT EXISTS(
  SELECT 1 FROM comandas 
  WHERE empresa_id = 'uuid-da-empresa' 
    AND ativo = TRUE 
    AND 85 BETWEEN numero_inicio AND numero_fim
) AS comanda_valida;

-- Listar todas as comandas disponíveis para uma empresa
SELECT generate_series(numero_inicio, numero_fim) AS numero_comanda
FROM comandas 
WHERE empresa_id = 'uuid-da-empresa' 
  AND ativo = TRUE;
*/
