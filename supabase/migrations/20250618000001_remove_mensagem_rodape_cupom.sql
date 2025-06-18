-- Remover campo duplicado mensagem_rodape_cupom da configuração do PDV
-- Data: 2025-06-18
-- Descrição: Remove campo desnecessário que estava duplicando a funcionalidade do rodape_personalizado

-- Remover campo mensagem_rodape_cupom da tabela pdv_config
-- Este campo não estava sendo usado no código e duplicava a funcionalidade do rodape_personalizado
ALTER TABLE pdv_config
DROP COLUMN IF EXISTS mensagem_rodape_cupom;
