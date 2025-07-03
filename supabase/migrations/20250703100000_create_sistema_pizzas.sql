-- =====================================================
-- SISTEMA DE PIZZAS - CRIAÇÃO DAS TABELAS
-- Data: 2025-07-03
-- Descrição: Implementa sistema completo para pizzarias
-- =====================================================

-- =====================================================
-- 1. TABELA: produto_variacoes
-- =====================================================

CREATE TABLE IF NOT EXISTS produto_variacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  produto_base_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  
  -- Informações básicas da variação
  nome VARCHAR(255) NOT NULL,
  codigo VARCHAR(50) NOT NULL,
  preco NUMERIC(10,2) NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  
  -- Configurações específicas para pizzas
  permite_meio_a_meio BOOLEAN DEFAULT FALSE,
  max_sabores INTEGER DEFAULT 1,
  preco_sabor_adicional NUMERIC(10,2) DEFAULT 0,
  
  -- Campos fiscais (podem sobrescrever os do produto base)
  ncm VARCHAR(8),
  cfop VARCHAR(4),
  origem_produto INTEGER,
  situacao_tributaria VARCHAR(50),
  cst_icms VARCHAR(3),
  csosn_icms VARCHAR(4),
  aliquota_icms NUMERIC(5,2),
  cest VARCHAR(7),
  margem_st NUMERIC(5,2),
  peso_liquido NUMERIC(10,3),
  
  -- Controle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deletado BOOLEAN DEFAULT FALSE,
  deletado_em TIMESTAMPTZ,
  deletado_por UUID REFERENCES usuarios(id)
);

-- =====================================================
-- 2. TABELA: produto_variacoes_opcoes
-- =====================================================

CREATE TABLE IF NOT EXISTS produto_variacoes_opcoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  variacao_id UUID NOT NULL REFERENCES produto_variacoes(id) ON DELETE CASCADE,
  opcao_adicional_id UUID NOT NULL REFERENCES opcoes_adicionais(id) ON DELETE CASCADE,
  
  -- Configurações da opção para esta variação
  obrigatorio BOOLEAN DEFAULT FALSE,
  quantidade_minima INTEGER DEFAULT 0,
  quantidade_maxima INTEGER DEFAULT NULL,
  permite_multipla_selecao BOOLEAN DEFAULT FALSE,
  
  -- Controle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deletado BOOLEAN DEFAULT FALSE
);

-- =====================================================
-- 3. TABELA: pdv_itens_variacoes
-- =====================================================

CREATE TABLE IF NOT EXISTS pdv_itens_variacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  pdv_item_id UUID NOT NULL REFERENCES pdv_itens(id) ON DELETE CASCADE,
  variacao_id UUID NOT NULL REFERENCES produto_variacoes(id) ON DELETE RESTRICT,
  
  -- Configuração específica do item
  configuracao_sabores JSONB, -- Array com sabores e porcentagens
  observacoes TEXT,
  
  -- Controle
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para produto_variacoes
CREATE INDEX idx_produto_variacoes_empresa_id ON produto_variacoes(empresa_id);
CREATE INDEX idx_produto_variacoes_produto_base_id ON produto_variacoes(produto_base_id);
CREATE INDEX idx_produto_variacoes_ativo ON produto_variacoes(ativo) WHERE ativo = TRUE;
CREATE INDEX idx_produto_variacoes_empresa_ativo ON produto_variacoes(empresa_id, ativo) WHERE ativo = TRUE AND deletado = FALSE;

-- Índices para produto_variacoes_opcoes
CREATE INDEX idx_produto_variacoes_opcoes_variacao_id ON produto_variacoes_opcoes(variacao_id);
CREATE INDEX idx_produto_variacoes_opcoes_opcao_id ON produto_variacoes_opcoes(opcao_adicional_id);
CREATE INDEX idx_produto_variacoes_opcoes_empresa_id ON produto_variacoes_opcoes(empresa_id);

-- Índices para pdv_itens_variacoes
CREATE INDEX idx_pdv_itens_variacoes_pdv_item_id ON pdv_itens_variacoes(pdv_item_id);
CREATE INDEX idx_pdv_itens_variacoes_variacao_id ON pdv_itens_variacoes(variacao_id);
CREATE INDEX idx_pdv_itens_variacoes_empresa_id ON pdv_itens_variacoes(empresa_id);

-- =====================================================
-- 5. CONSTRAINTS DE VALIDAÇÃO
-- =====================================================

-- Validações para produto_variacoes
ALTER TABLE produto_variacoes 
ADD CONSTRAINT chk_produto_variacoes_preco_positivo 
CHECK (preco >= 0);

ALTER TABLE produto_variacoes 
ADD CONSTRAINT chk_produto_variacoes_max_sabores_positivo 
CHECK (max_sabores > 0);

ALTER TABLE produto_variacoes 
ADD CONSTRAINT chk_produto_variacoes_preco_sabor_adicional 
CHECK (preco_sabor_adicional >= 0);

-- Validações para produto_variacoes_opcoes
ALTER TABLE produto_variacoes_opcoes 
ADD CONSTRAINT chk_produto_variacoes_opcoes_quantidade_minima 
CHECK (quantidade_minima >= 0);

ALTER TABLE produto_variacoes_opcoes 
ADD CONSTRAINT chk_produto_variacoes_opcoes_quantidade_maxima 
CHECK (quantidade_maxima IS NULL OR quantidade_maxima >= quantidade_minima);

-- =====================================================
-- 6. UNIQUE CONSTRAINTS
-- =====================================================

-- Código único por empresa
ALTER TABLE produto_variacoes 
ADD CONSTRAINT uk_produto_variacoes_codigo_empresa 
UNIQUE (empresa_id, codigo);

-- Evitar duplicação de opções por variação
ALTER TABLE produto_variacoes_opcoes 
ADD CONSTRAINT uk_produto_variacoes_opcoes_variacao_opcao 
UNIQUE (variacao_id, opcao_adicional_id);

-- =====================================================
-- 7. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE produto_variacoes IS 'Variações de produtos (ex: Pizza Pequena, Pizza Média)';
COMMENT ON COLUMN produto_variacoes.produto_base_id IS 'Referência ao produto base (ex: Pizza)';
COMMENT ON COLUMN produto_variacoes.permite_meio_a_meio IS 'Se permite dividir em sabores diferentes';
COMMENT ON COLUMN produto_variacoes.max_sabores IS 'Quantidade máxima de sabores permitidos';
COMMENT ON COLUMN produto_variacoes.preco_sabor_adicional IS 'Valor adicional por sabor extra';

COMMENT ON TABLE produto_variacoes_opcoes IS 'Opções adicionais disponíveis para cada variação';
COMMENT ON COLUMN produto_variacoes_opcoes.obrigatorio IS 'Se a seleção desta opção é obrigatória';
COMMENT ON COLUMN produto_variacoes_opcoes.permite_multipla_selecao IS 'Se permite selecionar múltiplos itens desta opção';

COMMENT ON TABLE pdv_itens_variacoes IS 'Configuração específica de variações nos itens do PDV';
COMMENT ON COLUMN pdv_itens_variacoes.configuracao_sabores IS 'JSON com sabores e porcentagens: [{"sabor_id": "uuid", "nome": "Calabresa", "porcentagem": 50}]';

-- =====================================================
-- 8. DADOS INICIAIS PARA TESTE
-- =====================================================

-- Inserir opções adicionais padrão para pizzarias
INSERT INTO opcoes_adicionais (nome, empresa_id) 
SELECT 'Tamanhos de Pizza', id FROM empresas 
WHERE NOT EXISTS (
  SELECT 1 FROM opcoes_adicionais oa 
  WHERE oa.nome = 'Tamanhos de Pizza' AND oa.empresa_id = empresas.id
);

INSERT INTO opcoes_adicionais (nome, empresa_id) 
SELECT 'Sabores de Pizza', id FROM empresas 
WHERE NOT EXISTS (
  SELECT 1 FROM opcoes_adicionais oa 
  WHERE oa.nome = 'Sabores de Pizza' AND oa.empresa_id = empresas.id
);

INSERT INTO opcoes_adicionais (nome, empresa_id) 
SELECT 'Bordas de Pizza', id FROM empresas 
WHERE NOT EXISTS (
  SELECT 1 FROM opcoes_adicionais oa 
  WHERE oa.nome = 'Bordas de Pizza' AND oa.empresa_id = empresas.id
);

-- =====================================================
-- 9. TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_produto_variacoes_updated_at 
BEFORE UPDATE ON produto_variacoes 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. CONFIGURAÇÃO INICIAL PARA PIZZARIAS
-- =====================================================

-- Adicionar campo para identificar produtos como "pizza base"
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS tipo_produto VARCHAR(50) DEFAULT 'simples';

COMMENT ON COLUMN produtos.tipo_produto IS 'Tipo do produto: simples, pizza_base, combo, etc.';

-- Adicionar configuração para habilitar sistema de pizzas
ALTER TABLE produtos_config 
ADD COLUMN IF NOT EXISTS sistema_pizzas BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN produtos_config.sistema_pizzas IS 'Habilita o sistema de variações para pizzarias';
