-- Desabilitar RLS na tabela tipo_pagamentos_opcoes
-- Data: 06/08/2025
-- Descrição: Remove políticas RLS e desabilita Row Level Security para acesso livre

-- =====================================================
-- REMOVER POLÍTICAS RLS
-- =====================================================
DROP POLICY IF EXISTS "Usuários podem ver tipos de pagamentos da própria empresa" ON tipo_pagamentos_opcoes;
DROP POLICY IF EXISTS "Usuários podem criar tipos de pagamentos na própria empresa" ON tipo_pagamentos_opcoes;
DROP POLICY IF EXISTS "Usuários podem atualizar tipos de pagamentos da própria empresa" ON tipo_pagamentos_opcoes;
DROP POLICY IF EXISTS "Usuários podem deletar tipos de pagamentos da própria empresa" ON tipo_pagamentos_opcoes;

-- =====================================================
-- DESABILITAR RLS
-- =====================================================
ALTER TABLE tipo_pagamentos_opcoes DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- COMENTÁRIO PARA DOCUMENTAÇÃO
-- =====================================================
COMMENT ON TABLE tipo_pagamentos_opcoes IS 'Tipos de pagamentos personalizados por empresa - TABELA DESPROTEGIDA (sem RLS)';
