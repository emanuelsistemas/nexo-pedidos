-- Migração para adicionar controle de PDV ao sistema de estoque
-- Data: 2025-01-31
-- Descrição: Move a funcionalidade "Baixa estoque na venda do PDV" das configurações do PDV
--            para o sistema de controle de estoque como uma nova opção de tipo de controle

-- 1. Adicionar 'pdv' como opção válida no enum tipo_controle
ALTER TABLE tipo_controle_estoque_config 
DROP CONSTRAINT IF EXISTS tipo_controle_estoque_config_tipo_controle_check;

ALTER TABLE tipo_controle_estoque_config 
ADD CONSTRAINT tipo_controle_estoque_config_tipo_controle_check 
CHECK (tipo_controle IN ('faturamento', 'pedidos', 'pdv'));

-- 2. Migrar dados existentes: empresas que têm baixa_estoque_pdv = true devem ter tipo_controle = 'pdv'
UPDATE tipo_controle_estoque_config 
SET tipo_controle = 'pdv'
WHERE empresa_id IN (
  SELECT empresa_id 
  FROM pdv_config 
  WHERE baixa_estoque_pdv = true
);

-- 3. Para empresas que não têm configuração de estoque mas têm baixa_estoque_pdv = true,
--    criar nova configuração com tipo_controle = 'pdv'
INSERT INTO tipo_controle_estoque_config (empresa_id, tipo_controle, bloqueia_sem_estoque)
SELECT pc.empresa_id, 'pdv', false
FROM pdv_config pc
WHERE pc.baixa_estoque_pdv = true
AND NOT EXISTS (
  SELECT 1 FROM tipo_controle_estoque_config tce 
  WHERE tce.empresa_id = pc.empresa_id
);

-- 4. Comentário para documentação
COMMENT ON CONSTRAINT tipo_controle_estoque_config_tipo_controle_check 
ON tipo_controle_estoque_config IS 'Tipos de controle: faturamento (baixa no faturamento), pedidos (baixa no pedido), pdv (baixa na venda do PDV)';
