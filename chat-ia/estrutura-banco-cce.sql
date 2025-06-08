-- =====================================================
-- ESTRUTURA COMPLETA DO BANCO PARA CCe
-- Sistema: nexo-pedidos
-- Funcionalidade: Carta de Correção Eletrônica (CCe)
-- =====================================================

-- =====================================================
-- 1. CRIAR TABELA cce_nfe (PRINCIPAL)
-- =====================================================

-- Remover tabela existente se houver
DROP TABLE IF EXISTS cce_nfe CASCADE;

-- Criar tabela principal para armazenar CCe
CREATE TABLE cce_nfe (
    -- Identificação
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pdv_id UUID,                              -- Relação com a NFe (tabela pdv)
    empresa_id UUID NOT NULL,                 -- Multi-tenant por empresa
    
    -- Dados da NFe
    chave_nfe VARCHAR(44) NOT NULL,           -- Chave da NFe que recebe a correção
    numero_nfe VARCHAR(20),                   -- Número da NFe
    
    -- Dados da CCe
    sequencia INTEGER NOT NULL,               -- Sequência da CCe (1, 2, 3...)
    correcao TEXT NOT NULL,                   -- Texto da correção
    protocolo VARCHAR(50),                    -- Protocolo retornado pela SEFAZ
    data_envio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Status
    status VARCHAR(20) DEFAULT 'aceita',      -- Status da CCe
    codigo_status INTEGER,                    -- Código de status da SEFAZ
    descricao_status TEXT,                    -- Descrição do status
    ambiente VARCHAR(20) DEFAULT 'homologacao', -- homologacao/producao
    
    -- Arquivos
    xml_path TEXT,                            -- Caminho do arquivo XML
    xml_nome VARCHAR(255),                    -- Nome do arquivo XML
    pdf_path TEXT,                            -- Caminho do PDF (futuro)
    pdf_nome VARCHAR(255),                    -- Nome do PDF (futuro)
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. DESPROTEGER TABELA (SEM RLS)
-- =====================================================

-- Desabilitar Row Level Security
ALTER TABLE cce_nfe DISABLE ROW LEVEL SECURITY;

-- Dar permissões totais para API REST
GRANT ALL ON cce_nfe TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- =====================================================
-- 3. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índice por empresa (multi-tenant)
CREATE INDEX idx_cce_nfe_empresa_id ON cce_nfe(empresa_id);

-- Índice por chave NFe (busca por NFe)
CREATE INDEX idx_cce_nfe_chave_nfe ON cce_nfe(chave_nfe);

-- Índice por data de envio (ordenação)
CREATE INDEX idx_cce_nfe_data_envio ON cce_nfe(data_envio);

-- Índice composto para busca eficiente
CREATE INDEX idx_cce_nfe_empresa_chave ON cce_nfe(empresa_id, chave_nfe);

-- =====================================================
-- 4. ADICIONAR CAMPO DE RELAÇÃO NA TABELA pdv
-- =====================================================

-- Adicionar campo para relacionar NFe com CCe
ALTER TABLE pdv ADD COLUMN cce_nfe_id UUID REFERENCES cce_nfe(id);

-- Criar índice para o campo de relação
CREATE INDEX idx_pdv_cce_nfe_id ON pdv(cce_nfe_id);

-- =====================================================
-- 5. RECARREGAR SCHEMA DA API REST
-- =====================================================

-- Notificar PostgREST para recarregar schema
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- =====================================================
-- 6. QUERIES DE TESTE E VALIDAÇÃO
-- =====================================================

-- Verificar se tabela foi criada
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name = 'cce_nfe';

-- Verificar estrutura da tabela
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'cce_nfe' 
ORDER BY ordinal_position;

-- Verificar se campo foi adicionado na tabela pdv
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pdv' AND column_name = 'cce_nfe_id';

-- Verificar índices criados
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'cce_nfe';

-- =====================================================
-- 7. TESTE DE INSERÇÃO MANUAL
-- =====================================================

-- Inserir CCe de teste
INSERT INTO cce_nfe (
    empresa_id, 
    chave_nfe, 
    numero_nfe, 
    sequencia, 
    correcao, 
    protocolo, 
    status, 
    codigo_status, 
    descricao_status, 
    ambiente, 
    xml_path, 
    xml_nome
) VALUES (
    'acd26a4f-7220-405e-9c96-faffb7e6480e',
    '35250624163237000151550010000000201995318594',
    '20',
    999,
    'Teste de inserção manual',
    '123456789',
    'aceita',
    135,
    'Teste',
    'homologacao',
    '/teste',
    'teste.xml'
) RETURNING id;

-- Verificar se foi inserido
SELECT * FROM cce_nfe WHERE sequencia = 999;

-- Limpar teste
DELETE FROM cce_nfe WHERE sequencia = 999;

-- =====================================================
-- 8. QUERIES DE CONSULTA ÚTEIS
-- =====================================================

-- Contar CCe por empresa
SELECT empresa_id, COUNT(*) as total_cce
FROM cce_nfe 
GROUP BY empresa_id;

-- Listar CCe de uma NFe específica
SELECT * FROM cce_nfe 
WHERE chave_nfe = '35250624163237000151550010000000201995318594'
ORDER BY sequencia;

-- Buscar última sequência de uma NFe
SELECT MAX(sequencia) as ultima_sequencia
FROM cce_nfe 
WHERE chave_nfe = '35250624163237000151550010000000201995318594'
AND empresa_id = 'acd26a4f-7220-405e-9c96-faffb7e6480e';

-- JOIN entre NFe e CCe
SELECT 
    p.id as nfe_id,
    p.numero_documento,
    p.chave_nfe,
    c.sequencia,
    c.correcao,
    c.protocolo,
    c.data_envio
FROM pdv p
LEFT JOIN cce_nfe c ON p.cce_nfe_id = c.id
WHERE p.empresa_id = 'acd26a4f-7220-405e-9c96-faffb7e6480e'
AND p.modelo_documento = 55
ORDER BY p.created_at DESC;

-- =====================================================
-- 9. QUERIES DE MANUTENÇÃO
-- =====================================================

-- Verificar integridade dos dados
SELECT 
    COUNT(*) as total_cce,
    COUNT(DISTINCT chave_nfe) as nfes_com_cce,
    COUNT(DISTINCT empresa_id) as empresas_com_cce
FROM cce_nfe;

-- Verificar CCe sem relação com NFe
SELECT c.* 
FROM cce_nfe c
LEFT JOIN pdv p ON p.cce_nfe_id = c.id
WHERE p.id IS NULL;

-- Verificar NFe com relação CCe inválida
SELECT p.* 
FROM pdv p
LEFT JOIN cce_nfe c ON p.cce_nfe_id = c.id
WHERE p.cce_nfe_id IS NOT NULL AND c.id IS NULL;

-- =====================================================
-- 10. BACKUP E RESTORE
-- =====================================================

-- Backup da tabela cce_nfe
-- pg_dump -h localhost -U postgres -t cce_nfe nexo > cce_nfe_backup.sql

-- Restore da tabela cce_nfe
-- psql -h localhost -U postgres nexo < cce_nfe_backup.sql

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================

/*
1. MULTI-TENANT: Sempre filtrar por empresa_id
2. SEQUÊNCIA: Deve ser única por NFe (chave_nfe + empresa_id)
3. RELAÇÃO: Campo cce_nfe_id na tabela pdv permite JOIN eficiente
4. DESPROTEGIDA: Tabela sem RLS para acesso via API REST
5. ÍNDICES: Criados para performance em consultas frequentes
6. AUDITORIA: Campos created_at e updated_at para rastreamento
7. ARQUIVOS: Campos para XML e PDF (futuro)
8. STATUS: Acompanha status da SEFAZ (aceita, rejeitada, etc.)
*/
