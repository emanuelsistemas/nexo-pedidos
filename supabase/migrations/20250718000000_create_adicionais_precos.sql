-- Criar tabela para preços dos adicionais por tabela de preços
-- Data: 18/07/2025
-- Descrição: Implementa sistema de tabelas de preços para adicionais, similar ao sistema de produtos

-- =====================================================
-- 1. CRIAR TABELA ADICIONAIS_PRECOS
-- =====================================================

CREATE TABLE IF NOT EXISTS adicionais_precos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamentos
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  adicional_item_id UUID NOT NULL REFERENCES opcoes_adicionais_itens(id) ON DELETE CASCADE,
  tabela_preco_id UUID NOT NULL REFERENCES tabela_de_preco(id) ON DELETE CASCADE,

  -- Preço do adicional nesta tabela
  preco NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Controle de auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint para garantir um preço por adicional por tabela
  CONSTRAINT uk_adicionais_precos_adicional_tabela UNIQUE (adicional_item_id, tabela_preco_id)
);

-- =====================================================
-- 2. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE adicionais_precos IS 'Armazena preços específicos dos itens adicionais para cada tabela de preços configurada pela empresa';
COMMENT ON COLUMN adicionais_precos.empresa_id IS 'Referência à empresa (isolamento multi-tenant)';
COMMENT ON COLUMN adicionais_precos.adicional_item_id IS 'Referência ao item adicional (opcoes_adicionais_itens)';
COMMENT ON COLUMN adicionais_precos.tabela_preco_id IS 'Referência à tabela de preços';
COMMENT ON COLUMN adicionais_precos.preco IS 'Preço do adicional nesta tabela específica';

-- =====================================================
-- 3. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índice para consultas por empresa
CREATE INDEX IF NOT EXISTS idx_adicionais_precos_empresa_id 
ON adicionais_precos(empresa_id);

-- Índice para consultas por adicional
CREATE INDEX IF NOT EXISTS idx_adicionais_precos_adicional_id 
ON adicionais_precos(adicional_item_id);

-- Índice para consultas por tabela de preços
CREATE INDEX IF NOT EXISTS idx_adicionais_precos_tabela_id 
ON adicionais_precos(tabela_preco_id);

-- Índice composto para consultas específicas
CREATE INDEX IF NOT EXISTS idx_adicionais_precos_empresa_adicional 
ON adicionais_precos(empresa_id, adicional_item_id);

-- =====================================================
-- 4. CONSTRAINTS DE VALIDAÇÃO
-- =====================================================

-- Preços não podem ser negativos
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_adicionais_precos_preco_positivo') THEN
        ALTER TABLE adicionais_precos 
        ADD CONSTRAINT chk_adicionais_precos_preco_positivo 
        CHECK (preco >= 0);
    END IF;
END $$;

-- =====================================================
-- 5. TRIGGER PARA UPDATED_AT AUTOMÁTICO
-- =====================================================

-- Criar função para atualizar updated_at (se não existir)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger na tabela
DROP TRIGGER IF EXISTS update_adicionais_precos_updated_at ON adicionais_precos;
CREATE TRIGGER update_adicionais_precos_updated_at
    BEFORE UPDATE ON adicionais_precos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. POLÍTICAS RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS na tabela
ALTER TABLE adicionais_precos ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: usuários podem ver apenas dados da sua empresa
CREATE POLICY "Usuários podem ver adicionais_precos da sua empresa" ON adicionais_precos
    FOR SELECT USING (
        empresa_id IN (
            SELECT u.empresa_id 
            FROM usuarios u 
            WHERE u.id = auth.uid()
        )
    );

-- Política para INSERT: usuários podem inserir apenas na sua empresa
CREATE POLICY "Usuários podem inserir adicionais_precos na sua empresa" ON adicionais_precos
    FOR INSERT WITH CHECK (
        empresa_id IN (
            SELECT u.empresa_id 
            FROM usuarios u 
            WHERE u.id = auth.uid()
        )
    );

-- Política para UPDATE: usuários podem atualizar apenas dados da sua empresa
CREATE POLICY "Usuários podem atualizar adicionais_precos da sua empresa" ON adicionais_precos
    FOR UPDATE USING (
        empresa_id IN (
            SELECT u.empresa_id 
            FROM usuarios u 
            WHERE u.id = auth.uid()
        )
    );

-- Política para DELETE: usuários podem deletar apenas dados da sua empresa
CREATE POLICY "Usuários podem deletar adicionais_precos da sua empresa" ON adicionais_precos
    FOR DELETE USING (
        empresa_id IN (
            SELECT u.empresa_id 
            FROM usuarios u 
            WHERE u.id = auth.uid()
        )
    );

-- =====================================================
-- 7. GRANTS DE PERMISSÃO
-- =====================================================

-- Conceder permissões para usuários autenticados
GRANT ALL ON adicionais_precos TO authenticated;
GRANT USAGE ON SEQUENCE adicionais_precos_id_seq TO authenticated;
