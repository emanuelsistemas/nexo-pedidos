-- Adicionar campo serie_nfce na tabela usuarios
-- Data: 14/06/2025
-- Descrição: Adiciona campo para série individual de NFC-e por usuário

-- Adicionar campo serie_nfce na tabela usuarios
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS serie_nfce INTEGER DEFAULT 1;

-- Criar índice único para garantir que não haja série duplicada por empresa
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_empresa_serie_nfce 
ON usuarios(empresa_id, serie_nfce) 
WHERE serie_nfce IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN usuarios.serie_nfce IS 'Série individual da NFC-e para este usuário (única por empresa)';

-- Atualizar usuários existentes com série 1 (apenas o primeiro usuário de cada empresa)
-- Para evitar conflitos, vamos atualizar apenas um usuário por empresa
WITH primeiro_usuario_por_empresa AS (
  SELECT DISTINCT ON (empresa_id) 
    id, 
    empresa_id,
    ROW_NUMBER() OVER (PARTITION BY empresa_id ORDER BY created_at ASC) as rn
  FROM usuarios 
  WHERE serie_nfce IS NULL OR serie_nfce = 1
)
UPDATE usuarios 
SET serie_nfce = 1 
WHERE id IN (
  SELECT id 
  FROM primeiro_usuario_por_empresa 
  WHERE rn = 1
);

-- Para outros usuários da mesma empresa, definir série sequencial
WITH usuarios_sem_serie AS (
  SELECT 
    id,
    empresa_id,
    ROW_NUMBER() OVER (PARTITION BY empresa_id ORDER BY created_at ASC) + 1 as nova_serie
  FROM usuarios 
  WHERE serie_nfce IS NULL
)
UPDATE usuarios 
SET serie_nfce = (
  SELECT nova_serie 
  FROM usuarios_sem_serie 
  WHERE usuarios_sem_serie.id = usuarios.id
)
WHERE serie_nfce IS NULL;
