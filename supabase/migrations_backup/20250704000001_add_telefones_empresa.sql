-- Adicionar campo telefones na tabela empresas
-- Data: 2025-07-04
-- Descrição: Adiciona campo JSONB para múltiplos telefones com tipo e WhatsApp

-- Adicionar campo telefones como JSONB na tabela empresas
ALTER TABLE empresas
ADD COLUMN IF NOT EXISTS telefones JSONB DEFAULT '[]'::jsonb;

-- Comentário para documentação
COMMENT ON COLUMN empresas.telefones IS 'Array JSON com múltiplos telefones da empresa: [{"numero": "11999999999", "tipo": "Celular", "whatsapp": true}]';

-- Migrar dados existentes do campo whatsapp para o novo formato (se houver)
-- Apenas se o campo whatsapp não estiver vazio
UPDATE empresas 
SET telefones = jsonb_build_array(
  jsonb_build_object(
    'numero', whatsapp,
    'tipo', 'Celular',
    'whatsapp', true
  )
)
WHERE whatsapp IS NOT NULL 
  AND whatsapp != '' 
  AND telefones = '[]'::jsonb;
