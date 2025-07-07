-- Migração para adicionar controle de PDV ao sistema de estoque
-- Data: 2025-01-31
-- Descrição: Move a funcionalidade "Baixa estoque na venda do PDV" das configurações do PDV
--            para o sistema de controle de estoque como uma nova opção de tipo de controle

-- 1. Adicionar 'pdv' como opção válida no enum tipo_controle
ALTER TABLE tipo_controle_estoque_config 
DROP CONSTRAINT IF EXISTS tipo_controle_estoque_config_tipo_controle_check;

ALTER TABLE tipo_controle_estoque_config 
ADD CONSTRAINT tipo_controle_estoque_config_tipo_controle_check 
CHECK (tipo_controle IN ('manual', 'automatico', 'pdv'));

-- 2. Inserir configuração de controle PDV para empresas existentes
INSERT INTO tipo_controle_estoque_config (empresa_id, tipo_controle, ativo, descricao)
SELECT 
    e.id as empresa_id,
    'pdv' as tipo_controle,
    COALESCE(p.baixa_estoque_pdv, false) as ativo,
    'Baixa estoque automaticamente nas vendas do PDV' as descricao
FROM empresas e
LEFT JOIN pdv_config p ON p.empresa_id = e.id
WHERE NOT EXISTS (
    SELECT 1 FROM tipo_controle_estoque_config tce 
    WHERE tce.empresa_id = e.id AND tce.tipo_controle = 'pdv'
);

-- 3. Remover a coluna baixa_estoque_pdv da tabela pdv_config (se existir)
-- Comentado para evitar perda de dados - descomente se tiver certeza
-- ALTER TABLE pdv_config DROP COLUMN IF EXISTS baixa_estoque_pdv;

-- 4. Adicionar comentário explicativo
COMMENT ON CONSTRAINT tipo_controle_estoque_config_tipo_controle_check 
ON tipo_controle_estoque_config IS 'Tipos válidos: manual (controle manual), automatico (baixa automática), pdv (baixa nas vendas do PDV)';
