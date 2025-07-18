-- =====================================================
-- SISTEMA DE TABELA DE PREÇOS - CRIAÇÃO DAS TABELAS
-- Data: 2025-07-03
-- Descrição: Implementa sistema de tabela de preços flexível
-- =====================================================

-- =====================================================
-- 1. TABELA: tabela_preco_config
-- =====================================================

CREATE TABLE IF NOT EXISTS tabela_preco_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,

  -- Configurações principais
  trabalha_com_tabela_precos BOOLEAN DEFAULT FALSE,
  trabalha_com_sabores BOOLEAN DEFAULT FALSE,
  tipo_preco_pizza VARCHAR(20) DEFAULT 'sabor_mais_caro',

  -- Controle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint para garantir uma configuração por empresa
  CONSTRAINT uk_tabela_preco_config_empresa UNIQUE (empresa_id),

  -- Constraint para validar tipo de preço da pizza
  CONSTRAINT chk_tipo_preco_pizza CHECK (tipo_preco_pizza IN ('sabor_mais_caro', 'media_sabores'))
);

-- =====================================================
-- 2. TABELA: tabela_de_preco
-- =====================================================

CREATE TABLE IF NOT EXISTS tabela_de_preco (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,

  -- Informações da tabela
  nome VARCHAR(255) NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,

  -- Configurações específicas para sabores (pizzarias)
  quantidade_sabores INTEGER DEFAULT 1,
  permite_meio_a_meio BOOLEAN DEFAULT FALSE,

  -- Controle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deletado BOOLEAN DEFAULT FALSE,
  deletado_em TIMESTAMPTZ,
  deletado_por UUID REFERENCES usuarios(id)
);

-- =====================================================
-- 3. TABELA: produto_variacoes (mantida para compatibilidade)
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

-- Índices para tabela_preco_config
CREATE INDEX idx_tabela_preco_config_empresa_id ON tabela_preco_config(empresa_id);

-- Índices para tabela_de_preco
CREATE INDEX idx_tabela_de_preco_empresa_id ON tabela_de_preco(empresa_id);
CREATE INDEX idx_tabela_de_preco_ativo ON tabela_de_preco(ativo) WHERE ativo = TRUE;
CREATE INDEX idx_tabela_de_preco_empresa_ativo ON tabela_de_preco(empresa_id, ativo) WHERE ativo = TRUE AND deletado = FALSE;

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

-- Validações para tabela_de_preco
ALTER TABLE tabela_de_preco
ADD CONSTRAINT chk_tabela_de_preco_quantidade_sabores_positivo
CHECK (quantidade_sabores > 0);

ALTER TABLE tabela_de_preco
ADD CONSTRAINT chk_tabela_de_preco_nome_nao_vazio
CHECK (LENGTH(TRIM(nome)) > 0);

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

-- Nome único por empresa para tabela_de_preco
ALTER TABLE tabela_de_preco
ADD CONSTRAINT uk_tabela_de_preco_nome_empresa
UNIQUE (empresa_id, nome);

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

COMMENT ON TABLE tabela_preco_config IS 'Configurações de tabela de preços por empresa';
COMMENT ON COLUMN tabela_preco_config.trabalha_com_tabela_precos IS 'Se a empresa utiliza sistema de tabela de preços';
COMMENT ON COLUMN tabela_preco_config.trabalha_com_sabores IS 'Se a empresa trabalha com sabores (pizzarias)';
COMMENT ON COLUMN tabela_preco_config.tipo_preco_pizza IS 'Tipo de cálculo do preço: sabor_mais_caro ou media_sabores';

COMMENT ON TABLE tabela_de_preco IS 'Tabelas de preços criadas pela empresa (ex: Pizza Pequena, Atacado 10un)';
COMMENT ON COLUMN tabela_de_preco.nome IS 'Nome da tabela (ex: Pizza Pequena, Atacado 10un)';
COMMENT ON COLUMN tabela_de_preco.quantidade_sabores IS 'Quantidade máxima de sabores para esta tabela (pizzarias)';
COMMENT ON COLUMN tabela_de_preco.permite_meio_a_meio IS 'Se permite dividir em sabores diferentes (pizzarias)';

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

CREATE TRIGGER update_tabela_preco_config_updated_at
BEFORE UPDATE ON tabela_preco_config
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tabela_de_preco_updated_at
BEFORE UPDATE ON tabela_de_preco
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

-- =====================================================
-- 11. TABELA DE PREÇOS POR PRODUTO
-- =====================================================

-- Criar tabela para armazenar preços dos produtos por tabela de preços
CREATE TABLE IF NOT EXISTS produto_precos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  tabela_preco_id UUID NOT NULL REFERENCES tabela_de_preco(id) ON DELETE CASCADE,

  -- Preço do produto nesta tabela
  preco NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Controle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint para garantir um preço por produto por tabela
  CONSTRAINT uk_produto_precos_produto_tabela UNIQUE (produto_id, tabela_preco_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_produto_precos_empresa_id ON produto_precos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_produto_precos_produto_id ON produto_precos(produto_id);
CREATE INDEX IF NOT EXISTS idx_produto_precos_tabela_id ON produto_precos(tabela_preco_id);

-- Constraint de validação
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_produto_precos_preco_positivo') THEN
        ALTER TABLE produto_precos ADD CONSTRAINT chk_produto_precos_preco_positivo CHECK (preco >= 0);
    END IF;
END $$;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_produto_precos_updated_at ON produto_precos;
CREATE TRIGGER update_produto_precos_updated_at
BEFORE UPDATE ON produto_precos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE produto_precos IS 'Preços dos produtos por tabela de preços';
COMMENT ON COLUMN produto_precos.preco IS 'Preço do produto nesta tabela de preços específica';

-- =====================================================
-- 12. CAMPOS DE PREÇO DE CUSTO E MARGEM
-- =====================================================

-- Adicionar campos de preço de custo e margem percentual na tabela produtos
ALTER TABLE produtos
ADD COLUMN IF NOT EXISTS preco_custo NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS margem_percentual NUMERIC(5,2) DEFAULT 0;

-- Adicionar constraints de validação
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_produtos_preco_custo_positivo') THEN
        ALTER TABLE produtos ADD CONSTRAINT chk_produtos_preco_custo_positivo CHECK (preco_custo >= 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_produtos_margem_positiva') THEN
        ALTER TABLE produtos ADD CONSTRAINT chk_produtos_margem_positiva CHECK (margem_percentual >= 0);
    END IF;
END $$;

-- Comentar os campos
COMMENT ON COLUMN produtos.preco_custo IS 'Preço de custo do produto';
COMMENT ON COLUMN produtos.margem_percentual IS 'Margem de lucro em percentual sobre o custo';

-- =====================================================
-- 13. TRIGGER AUTOMÁTICO PARA NOVAS EMPRESAS
-- =====================================================

-- Função para criar configuração padrão de tabela de preços
CREATE OR REPLACE FUNCTION create_default_tabela_preco_config()
RETURNS TRIGGER AS $$
BEGIN
    -- Inserir configuração padrão para a nova empresa
    INSERT INTO tabela_preco_config (
        empresa_id,
        trabalha_com_tabela_precos,
        trabalha_com_sabores,
        tipo_preco_pizza
    ) VALUES (
        NEW.id,
        FALSE,
        FALSE,
        'sabor_mais_caro'
    );

    -- Log para debug
    RAISE NOTICE 'Configuração de tabela de preços criada para empresa: %', NEW.id;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro, não falhar o cadastro da empresa
        RAISE WARNING 'Erro ao criar configuração de tabela de preços para empresa %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para executar após inserir nova empresa
DROP TRIGGER IF EXISTS trigger_create_tabela_preco_config ON empresas;
CREATE TRIGGER trigger_create_tabela_preco_config
    AFTER INSERT ON empresas
    FOR EACH ROW
    EXECUTE FUNCTION create_default_tabela_preco_config();

COMMENT ON TRIGGER trigger_create_tabela_preco_config ON empresas IS 'Cria automaticamente configuração padrão de tabela de preços para novas empresas';

-- =====================================================
-- 14. CONFIGURAÇÃO INICIAL PARA EMPRESAS EXISTENTES
-- =====================================================

-- Inserir configurações padrão para empresas existentes que não possuem
INSERT INTO tabela_preco_config (
    empresa_id,
    trabalha_com_tabela_precos,
    trabalha_com_sabores,
    tipo_preco_pizza
)
SELECT
    e.id,
    FALSE,
    FALSE,
    'sabor_mais_caro'
FROM empresas e
LEFT JOIN tabela_preco_config tpc ON e.id = tpc.empresa_id
WHERE tpc.empresa_id IS NULL;
