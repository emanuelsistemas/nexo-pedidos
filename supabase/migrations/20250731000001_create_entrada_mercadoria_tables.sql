/*
  # Criar tabelas para sistema de entrada de mercadoria
  
  1. Nova Tabela: entrada_mercadoria
    - Armazena as entradas principais de mercadoria
    - Segue padrão multi-tenant com empresa_id
    - Controle de status incluindo rascunho
    - Suporte para entrada manual e XML
    - Relacionamento com fornecedores
    
  2. Nova Tabela: entrada_mercadoria_itens
    - Armazena os itens específicos de cada entrada
    - Relaciona com produtos
    - Controle de quantidades, preços e dados fiscais
    - Suporte para produtos não cadastrados
    
  3. Funcionalidades:
    - Entradas manuais e por XML
    - Status: rascunho, pendente, processada, cancelada
    - Controle de estoque automático
    - Rastreabilidade completa
    - Integração com fornecedores (tabela clientes)
*/

-- =====================================================
-- TABELA: entrada_mercadoria
-- =====================================================
-- Armazena as entradas principais de mercadoria
CREATE TABLE IF NOT EXISTS entrada_mercadoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação e numeração
  numero VARCHAR(50) NOT NULL,
  
  -- Multi-tenant (obrigatório)
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  
  -- Usuário responsável
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  
  -- Fornecedor (opcional - pode ser entrada sem fornecedor específico)
  fornecedor_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  fornecedor_nome TEXT, -- Salvo no momento da entrada
  fornecedor_documento TEXT, -- CNPJ/CPF do fornecedor
  
  -- Tipo de entrada
  tipo_entrada VARCHAR(10) NOT NULL DEFAULT 'manual' CHECK (tipo_entrada IN ('manual', 'xml')),
  
  -- Dados do documento fiscal (quando aplicável)
  numero_documento VARCHAR(50), -- Número da NFe/Cupom
  tipo_documento VARCHAR(20), -- 'nfe', 'nfce', 'cupom', 'recibo', 'outros'
  data_documento DATE, -- Data de emissão do documento
  
  -- Data da entrada
  data_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Valores da entrada
  valor_produtos DECIMAL(10,2) DEFAULT 0,
  valor_frete DECIMAL(10,2) DEFAULT 0,
  valor_seguro DECIMAL(10,2) DEFAULT 0,
  valor_outras_despesas DECIMAL(10,2) DEFAULT 0,
  valor_desconto DECIMAL(10,2) DEFAULT 0,
  valor_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Status da entrada
  status VARCHAR(15) DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'pendente', 'processada', 'cancelada')),
  
  -- Observações
  observacoes TEXT,
  observacoes_internas TEXT,
  
  -- Dados do XML (quando tipo_entrada = 'xml')
  xml_filename VARCHAR(255),
  xml_content TEXT,
  xml_processado_em TIMESTAMPTZ,
  
  -- Controle de processamento
  processada_em TIMESTAMPTZ,
  processada_por_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  
  -- Controle temporal
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Soft delete
  deletado BOOLEAN DEFAULT FALSE,
  deletado_em TIMESTAMPTZ,
  deletado_por_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL
);

-- =====================================================
-- TABELA: entrada_mercadoria_itens
-- =====================================================
-- Armazena os itens específicos de cada entrada
CREATE TABLE IF NOT EXISTS entrada_mercadoria_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referência à entrada principal
  entrada_mercadoria_id UUID NOT NULL REFERENCES entrada_mercadoria(id) ON DELETE CASCADE,
  
  -- Multi-tenant (obrigatório)
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  
  -- Produto (pode ser NULL para produtos não cadastrados)
  produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
  
  -- Dados do produto (salvos no momento da entrada)
  codigo_produto VARCHAR(50), -- Código/EAN do produto
  nome_produto TEXT NOT NULL, -- Nome/descrição do produto
  unidade_medida VARCHAR(10) DEFAULT 'UN', -- UN, KG, L, M, etc.
  
  -- Quantidades e valores
  quantidade DECIMAL(10,4) NOT NULL DEFAULT 1,
  preco_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
  preco_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Dados fiscais (quando aplicável)
  ncm VARCHAR(8), -- Código NCM
  cfop VARCHAR(4), -- Código CFOP
  cst VARCHAR(3), -- Código CST
  
  -- Controle de estoque
  atualizar_estoque BOOLEAN DEFAULT TRUE, -- Se deve atualizar o estoque
  estoque_atualizado BOOLEAN DEFAULT FALSE, -- Se já foi atualizado
  estoque_atualizado_em TIMESTAMPTZ,
  
  -- Observações específicas do item
  observacoes TEXT,
  
  -- Controle temporal
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Soft delete
  deletado BOOLEAN DEFAULT FALSE,
  deletado_em TIMESTAMPTZ,
  deletado_por_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices principais para entrada_mercadoria
CREATE INDEX IF NOT EXISTS idx_entrada_mercadoria_empresa_id ON entrada_mercadoria(empresa_id);
CREATE INDEX IF NOT EXISTS idx_entrada_mercadoria_numero ON entrada_mercadoria(empresa_id, numero);
CREATE INDEX IF NOT EXISTS idx_entrada_mercadoria_fornecedor_id ON entrada_mercadoria(fornecedor_id) WHERE fornecedor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entrada_mercadoria_usuario_id ON entrada_mercadoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_entrada_mercadoria_status ON entrada_mercadoria(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_entrada_mercadoria_tipo_entrada ON entrada_mercadoria(empresa_id, tipo_entrada);
CREATE INDEX IF NOT EXISTS idx_entrada_mercadoria_data_entrada ON entrada_mercadoria(empresa_id, data_entrada DESC);
CREATE INDEX IF NOT EXISTS idx_entrada_mercadoria_created_at ON entrada_mercadoria(empresa_id, created_at DESC);

-- Índices principais para entrada_mercadoria_itens
CREATE INDEX IF NOT EXISTS idx_entrada_mercadoria_itens_entrada_id ON entrada_mercadoria_itens(entrada_mercadoria_id);
CREATE INDEX IF NOT EXISTS idx_entrada_mercadoria_itens_empresa_id ON entrada_mercadoria_itens(empresa_id);
CREATE INDEX IF NOT EXISTS idx_entrada_mercadoria_itens_produto_id ON entrada_mercadoria_itens(produto_id) WHERE produto_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entrada_mercadoria_itens_codigo ON entrada_mercadoria_itens(empresa_id, codigo_produto) WHERE codigo_produto IS NOT NULL;

-- Índices compostos para consultas específicas
CREATE INDEX IF NOT EXISTS idx_entrada_mercadoria_empresa_status_data ON entrada_mercadoria(empresa_id, status, data_entrada DESC);
CREATE INDEX IF NOT EXISTS idx_entrada_mercadoria_itens_empresa_produto ON entrada_mercadoria_itens(empresa_id, produto_id) WHERE produto_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entrada_mercadoria_itens_estoque ON entrada_mercadoria_itens(empresa_id, atualizar_estoque, estoque_atualizado) WHERE atualizar_estoque = TRUE;

-- =====================================================
-- CONSTRAINTS ADICIONAIS
-- =====================================================

-- Garantir numeração única por empresa
CREATE UNIQUE INDEX IF NOT EXISTS idx_entrada_mercadoria_numero_empresa_unique 
ON entrada_mercadoria(empresa_id, numero) WHERE deletado = FALSE;

-- Garantir valores positivos
ALTER TABLE entrada_mercadoria ADD CONSTRAINT chk_entrada_mercadoria_valor_total_positivo 
CHECK (valor_total >= 0);

ALTER TABLE entrada_mercadoria ADD CONSTRAINT chk_entrada_mercadoria_valor_produtos_positivo 
CHECK (valor_produtos >= 0);

ALTER TABLE entrada_mercadoria ADD CONSTRAINT chk_entrada_mercadoria_valor_frete_positivo 
CHECK (valor_frete >= 0);

ALTER TABLE entrada_mercadoria ADD CONSTRAINT chk_entrada_mercadoria_valor_seguro_positivo 
CHECK (valor_seguro >= 0);

ALTER TABLE entrada_mercadoria ADD CONSTRAINT chk_entrada_mercadoria_valor_outras_despesas_positivo 
CHECK (valor_outras_despesas >= 0);

ALTER TABLE entrada_mercadoria ADD CONSTRAINT chk_entrada_mercadoria_valor_desconto_positivo 
CHECK (valor_desconto >= 0);

ALTER TABLE entrada_mercadoria_itens ADD CONSTRAINT chk_entrada_mercadoria_itens_quantidade_positiva 
CHECK (quantidade > 0);

ALTER TABLE entrada_mercadoria_itens ADD CONSTRAINT chk_entrada_mercadoria_itens_preco_unitario_positivo 
CHECK (preco_unitario >= 0);

ALTER TABLE entrada_mercadoria_itens ADD CONSTRAINT chk_entrada_mercadoria_itens_preco_total_positivo 
CHECK (preco_total >= 0);

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

-- Trigger para atualizar updated_at em entrada_mercadoria
CREATE OR REPLACE FUNCTION update_entrada_mercadoria_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_entrada_mercadoria_updated_at
  BEFORE UPDATE ON entrada_mercadoria
  FOR EACH ROW
  EXECUTE FUNCTION update_entrada_mercadoria_updated_at();

-- Trigger para atualizar updated_at em entrada_mercadoria_itens
CREATE OR REPLACE FUNCTION update_entrada_mercadoria_itens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_entrada_mercadoria_itens_updated_at
  BEFORE UPDATE ON entrada_mercadoria_itens
  FOR EACH ROW
  EXECUTE FUNCTION update_entrada_mercadoria_itens_updated_at();

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE entrada_mercadoria IS 'Tabela principal para controle de entrada de mercadoria - suporte multi-tenant';
COMMENT ON COLUMN entrada_mercadoria.numero IS 'Número sequencial da entrada por empresa';
COMMENT ON COLUMN entrada_mercadoria.empresa_id IS 'ID da empresa (multi-tenant) - obrigatório';
COMMENT ON COLUMN entrada_mercadoria.fornecedor_nome IS 'Nome do fornecedor salvo no momento da entrada';
COMMENT ON COLUMN entrada_mercadoria.tipo_entrada IS 'Tipo de entrada: manual (digitação) ou xml (importação)';
COMMENT ON COLUMN entrada_mercadoria.numero_documento IS 'Número do documento fiscal (NFe, cupom, etc.)';
COMMENT ON COLUMN entrada_mercadoria.status IS 'Status: rascunho, pendente, processada, cancelada';
COMMENT ON COLUMN entrada_mercadoria.valor_total IS 'Valor total da entrada (produtos + frete + seguro + outras - desconto)';

COMMENT ON TABLE entrada_mercadoria_itens IS 'Tabela para itens específicos de cada entrada de mercadoria';
COMMENT ON COLUMN entrada_mercadoria_itens.produto_id IS 'Referência ao produto cadastrado (pode ser NULL para produtos não cadastrados)';
COMMENT ON COLUMN entrada_mercadoria_itens.codigo_produto IS 'Código/EAN do produto no momento da entrada';
COMMENT ON COLUMN entrada_mercadoria_itens.nome_produto IS 'Nome/descrição do produto salvo no momento da entrada';
COMMENT ON COLUMN entrada_mercadoria_itens.quantidade IS 'Quantidade do produto na entrada (suporta decimais)';
COMMENT ON COLUMN entrada_mercadoria_itens.atualizar_estoque IS 'Se deve atualizar o estoque quando a entrada for processada';
COMMENT ON COLUMN entrada_mercadoria_itens.estoque_atualizado IS 'Se o estoque já foi atualizado para este item';

-- =====================================================
-- FUNÇÃO PARA GERAR PRÓXIMO NÚMERO DE ENTRADA
-- =====================================================

CREATE OR REPLACE FUNCTION get_proximo_numero_entrada_mercadoria(p_empresa_id UUID)
RETURNS TEXT AS $$
DECLARE
  proximo_numero INTEGER;
  numero_formatado TEXT;
BEGIN
  -- Buscar o maior número atual da empresa
  SELECT COALESCE(MAX(CAST(numero AS INTEGER)), 0) + 1
  INTO proximo_numero
  FROM entrada_mercadoria
  WHERE empresa_id = p_empresa_id
    AND numero ~ '^[0-9]+$' -- Apenas números
    AND deletado = FALSE;

  -- Formatar com zeros à esquerda (6 dígitos)
  numero_formatado := LPAD(proximo_numero::TEXT, 6, '0');

  RETURN numero_formatado;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_proximo_numero_entrada_mercadoria(UUID) IS 'Gera o próximo número sequencial de entrada de mercadoria para a empresa';

-- =====================================================
-- FUNÇÃO PARA CALCULAR VALOR TOTAL DA ENTRADA
-- =====================================================

CREATE OR REPLACE FUNCTION calcular_valor_total_entrada_mercadoria(p_entrada_mercadoria_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  valor_itens DECIMAL(10,2);
  valor_frete DECIMAL(10,2);
  valor_seguro DECIMAL(10,2);
  valor_outras_despesas DECIMAL(10,2);
  valor_desconto DECIMAL(10,2);
  valor_total DECIMAL(10,2);
BEGIN
  -- Buscar valores da entrada
  SELECT
    COALESCE(em.valor_frete, 0),
    COALESCE(em.valor_seguro, 0),
    COALESCE(em.valor_outras_despesas, 0),
    COALESCE(em.valor_desconto, 0)
  INTO valor_frete, valor_seguro, valor_outras_despesas, valor_desconto
  FROM entrada_mercadoria em
  WHERE em.id = p_entrada_mercadoria_id;

  -- Calcular soma dos itens
  SELECT COALESCE(SUM(preco_total), 0)
  INTO valor_itens
  FROM entrada_mercadoria_itens
  WHERE entrada_mercadoria_id = p_entrada_mercadoria_id
    AND deletado = FALSE;

  -- Calcular valor total
  valor_total := valor_itens + valor_frete + valor_seguro + valor_outras_despesas - valor_desconto;

  -- Atualizar na tabela principal
  UPDATE entrada_mercadoria
  SET
    valor_produtos = valor_itens,
    valor_total = valor_total,
    updated_at = NOW()
  WHERE id = p_entrada_mercadoria_id;

  RETURN valor_total;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calcular_valor_total_entrada_mercadoria(UUID) IS 'Calcula e atualiza o valor total da entrada baseado nos itens e despesas';

-- =====================================================
-- TRIGGER PARA RECALCULAR VALOR TOTAL AUTOMATICAMENTE
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_recalcular_valor_entrada_mercadoria()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalcular valor total quando itens são inseridos, atualizados ou deletados
  IF TG_OP = 'DELETE' THEN
    PERFORM calcular_valor_total_entrada_mercadoria(OLD.entrada_mercadoria_id);
    RETURN OLD;
  ELSE
    PERFORM calcular_valor_total_entrada_mercadoria(NEW.entrada_mercadoria_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalcular_valor_entrada_mercadoria_itens
  AFTER INSERT OR UPDATE OR DELETE ON entrada_mercadoria_itens
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalcular_valor_entrada_mercadoria();
