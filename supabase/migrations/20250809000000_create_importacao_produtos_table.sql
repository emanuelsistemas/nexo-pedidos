-- Criar tabela para controle de importações de produtos
-- Data: 2025-08-09
-- Descrição: Tabela para gerenciar histórico, status e controle das importações de produtos

-- =====================================================
-- TABELA: importacao_produtos
-- =====================================================
-- Armazena informações detalhadas sobre cada importação de produtos

CREATE TABLE IF NOT EXISTS importacao_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação da empresa e usuário (multi-tenant)
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  
  -- Informações do arquivo
  nome_arquivo TEXT NOT NULL,
  arquivo_storage_path TEXT NOT NULL, -- Caminho no bucket Supabase
  arquivo_url TEXT, -- URL pública se necessário
  tamanho_arquivo BIGINT, -- Tamanho em bytes
  
  -- Status e controle do processamento
  status TEXT NOT NULL DEFAULT 'iniciado' CHECK (status IN (
    'iniciado',      -- Importação iniciada
    'processando',   -- Em processamento
    'concluida',     -- Concluída com sucesso
    'erro',          -- Erro durante processamento
    'cancelada'      -- Cancelada pelo usuário
  )),
  
  -- Contadores de processamento
  total_linhas INTEGER DEFAULT 0,
  linhas_processadas INTEGER DEFAULT 0,
  linhas_sucesso INTEGER DEFAULT 0,
  linhas_erro INTEGER DEFAULT 0,
  linhas_ignoradas INTEGER DEFAULT 0, -- Linhas em branco ou inválidas
  
  -- Contadores específicos
  grupos_criados INTEGER DEFAULT 0,
  grupos_existentes INTEGER DEFAULT 0,
  produtos_criados INTEGER DEFAULT 0,
  produtos_atualizados INTEGER DEFAULT 0,
  
  -- Informações de progresso
  etapa_atual TEXT DEFAULT 'iniciando', -- Ex: 'grupos', 'produtos', 'finalizando'
  progresso_percentual DECIMAL(5,2) DEFAULT 0, -- 0.00 a 100.00
  
  -- Mensagens e logs
  mensagem_atual TEXT, -- Mensagem atual sendo exibida
  observacoes TEXT, -- Observações gerais
  log_erros JSONB, -- Array de erros detalhados
  log_alertas JSONB, -- Array de alertas/warnings
  
  -- Dados de validação
  dados_validacao JSONB, -- Informações sobre validações realizadas
  
  -- Timestamps
  iniciado_em TIMESTAMPTZ DEFAULT NOW(),
  finalizado_em TIMESTAMPTZ,
  tempo_processamento INTERVAL, -- Calculado automaticamente
  
  -- Metadados adicionais
  configuracoes JSONB, -- Configurações usadas na importação
  estatisticas JSONB, -- Estatísticas detalhadas
  
  -- Controle de auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES
-- =====================================================

-- Índice principal por empresa
CREATE INDEX IF NOT EXISTS idx_importacao_produtos_empresa_id 
ON importacao_produtos(empresa_id);

-- Índice por usuário
CREATE INDEX IF NOT EXISTS idx_importacao_produtos_usuario_id 
ON importacao_produtos(usuario_id);

-- Índice por status
CREATE INDEX IF NOT EXISTS idx_importacao_produtos_status 
ON importacao_produtos(status);

-- Índice por data de criação
CREATE INDEX IF NOT EXISTS idx_importacao_produtos_created_at 
ON importacao_produtos(created_at DESC);

-- Índice composto para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_importacao_produtos_empresa_status_data 
ON importacao_produtos(empresa_id, status, created_at DESC);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_importacao_produtos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- Calcular tempo de processamento se finalizado
  IF NEW.finalizado_em IS NOT NULL AND OLD.finalizado_em IS NULL THEN
    NEW.tempo_processamento = NEW.finalizado_em - NEW.iniciado_em;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_importacao_produtos_updated_at
  BEFORE UPDATE ON importacao_produtos
  FOR EACH ROW
  EXECUTE FUNCTION update_importacao_produtos_updated_at();

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS
ALTER TABLE importacao_produtos ENABLE ROW LEVEL SECURITY;

-- Política para usuários autenticados acessarem apenas dados da sua empresa
CREATE POLICY "Usuários podem acessar importações da sua empresa" ON importacao_produtos
  FOR ALL USING (
    empresa_id IN (
      SELECT u.empresa_id 
      FROM usuarios u 
      WHERE u.id = auth.uid()
    )
  );

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE importacao_produtos IS 'Controle e histórico de importações de produtos';
COMMENT ON COLUMN importacao_produtos.empresa_id IS 'ID da empresa (multi-tenant)';
COMMENT ON COLUMN importacao_produtos.usuario_id IS 'ID do usuário que iniciou a importação';
COMMENT ON COLUMN importacao_produtos.nome_arquivo IS 'Nome original do arquivo importado';
COMMENT ON COLUMN importacao_produtos.arquivo_storage_path IS 'Caminho do arquivo no storage Supabase';
COMMENT ON COLUMN importacao_produtos.status IS 'Status atual da importação';
COMMENT ON COLUMN importacao_produtos.total_linhas IS 'Total de linhas na planilha (excluindo cabeçalho)';
COMMENT ON COLUMN importacao_produtos.linhas_processadas IS 'Número de linhas já processadas';
COMMENT ON COLUMN importacao_produtos.linhas_sucesso IS 'Linhas importadas com sucesso';
COMMENT ON COLUMN importacao_produtos.linhas_erro IS 'Linhas com erro durante importação';
COMMENT ON COLUMN importacao_produtos.grupos_criados IS 'Número de grupos criados durante a importação';
COMMENT ON COLUMN importacao_produtos.produtos_criados IS 'Número de produtos criados';
COMMENT ON COLUMN importacao_produtos.etapa_atual IS 'Etapa atual do processamento';
COMMENT ON COLUMN importacao_produtos.progresso_percentual IS 'Percentual de progresso (0-100)';
COMMENT ON COLUMN importacao_produtos.log_erros IS 'Array JSON com detalhes dos erros';
COMMENT ON COLUMN importacao_produtos.log_alertas IS 'Array JSON com alertas e warnings';
COMMENT ON COLUMN importacao_produtos.tempo_processamento IS 'Tempo total de processamento';
