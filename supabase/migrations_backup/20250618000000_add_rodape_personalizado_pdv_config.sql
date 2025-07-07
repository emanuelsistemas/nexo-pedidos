-- Adicionar campo rodapé personalizado na configuração do PDV
-- Data: 2025-06-18
-- Descrição: Adiciona campo para armazenar texto personalizado do rodapé das impressões

-- Adicionar campo rodape_personalizado na tabela pdv_config
ALTER TABLE pdv_config
ADD COLUMN IF NOT EXISTS rodape_personalizado TEXT DEFAULT 'Obrigado pela preferencia volte sempre!';

-- Comentário para documentação
COMMENT ON COLUMN pdv_config.rodape_personalizado IS 'Texto personalizado que aparece no rodapé dos recibos impressos no PDV';
