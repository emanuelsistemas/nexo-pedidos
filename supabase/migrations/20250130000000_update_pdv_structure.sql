/*
  # Atualização Completa da Estrutura PDV e PDV_ITENS

  1. Alterações na Tabela PDV
    - Adicionar todos os campos necessários conforme análise
    - Campos de identificação, cliente, endereço, valores, pagamento
    - Campos de controle e observações

  2. Alterações na Tabela PDV_ITENS
    - Adicionar campos de produto, quantidades, valores
    - Campos de desconto, origem e agrupamento
    - Campos de observação

  3. Relacionamentos e Índices
    - Criar chaves estrangeiras
    - Criar índices para performance
*/

-- =====================================================
-- 1. ATUALIZAÇÃO DA TABELA PDV
-- =====================================================

-- Primeiro, alterar o tipo do ID para UUID se necessário
DO $$
BEGIN
  -- Verificar se a coluna id é bigint e alterar para UUID
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pdv'
    AND column_name = 'id'
    AND data_type = 'bigint'
  ) THEN
    -- Criar nova coluna UUID
    ALTER TABLE pdv ADD COLUMN id_new UUID DEFAULT gen_random_uuid();

    -- Atualizar referências na tabela pdv_itens
    ALTER TABLE pdv_itens ADD COLUMN pdv_id_new UUID;
    UPDATE pdv_itens SET pdv_id_new = (SELECT id_new FROM pdv WHERE pdv.id::text = pdv_itens.pdv_id::text);

    -- Remover constraint antiga
    ALTER TABLE pdv_itens DROP CONSTRAINT IF EXISTS pdv_itens_pdv_id_fkey;

    -- Remover colunas antigas
    ALTER TABLE pdv DROP COLUMN id CASCADE;
    ALTER TABLE pdv_itens DROP COLUMN pdv_id;

    -- Renomear novas colunas
    ALTER TABLE pdv RENAME COLUMN id_new TO id;
    ALTER TABLE pdv_itens RENAME COLUMN pdv_id_new TO pdv_id;

    -- Adicionar constraint de primary key
    ALTER TABLE pdv ADD PRIMARY KEY (id);
  END IF;
END $$;

-- Campos de identificação da venda
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS numero_venda TEXT;
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS data_venda TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS status_venda TEXT DEFAULT 'aberta';

-- Campos de cliente
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS cliente_id UUID;
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS nome_cliente TEXT;
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS telefone_cliente TEXT;
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS documento_cliente TEXT;
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS tipo_documento_cliente TEXT;

-- Campos de endereço de entrega
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS cep_entrega TEXT;
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS rua_entrega TEXT;
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS numero_entrega TEXT;
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS complemento_entrega TEXT;
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS bairro_entrega TEXT;
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS cidade_entrega TEXT;
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS estado_entrega TEXT;

-- Campos de valores
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS valor_subtotal NUMERIC(10,2) DEFAULT 0;
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS valor_desconto NUMERIC(10,2) DEFAULT 0;
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS valor_acrescimo NUMERIC(10,2) DEFAULT 0;
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS valor_entrega NUMERIC(10,2) DEFAULT 0;
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS valor_total NUMERIC(10,2);

-- Campos de desconto aplicado
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS desconto_prazo_id UUID;
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS desconto_valor_id UUID;
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS percentual_desconto NUMERIC(5,2);

-- Campos de pagamento
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS tipo_pagamento TEXT;
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS forma_pagamento_id UUID;
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS formas_pagamento JSONB;
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS valor_pago NUMERIC(10,2) DEFAULT 0;
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS valor_troco NUMERIC(10,2) DEFAULT 0;
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS parcelas INTEGER;

-- Campos de pedidos importados
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS pedidos_importados JSONB;

-- Campos de observações
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS observacao_venda TEXT;
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS observacao_entrega TEXT;

-- Campos de controle
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS finalizada_em TIMESTAMP WITH TIME ZONE;
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS cancelada_em TIMESTAMP WITH TIME ZONE;
ALTER TABLE pdv ADD COLUMN IF NOT EXISTS motivo_cancelamento TEXT;

-- =====================================================
-- 2. ATUALIZAÇÃO DA TABELA PDV_ITENS
-- =====================================================

-- Campos de produto
ALTER TABLE pdv_itens ADD COLUMN IF NOT EXISTS produto_id UUID;
ALTER TABLE pdv_itens ADD COLUMN IF NOT EXISTS codigo_produto TEXT;
ALTER TABLE pdv_itens ADD COLUMN IF NOT EXISTS nome_produto TEXT;
ALTER TABLE pdv_itens ADD COLUMN IF NOT EXISTS descricao_produto TEXT;

-- Campos de quantidade e valores
ALTER TABLE pdv_itens ADD COLUMN IF NOT EXISTS quantidade NUMERIC(10,3);
ALTER TABLE pdv_itens ADD COLUMN IF NOT EXISTS valor_unitario NUMERIC(10,2);
ALTER TABLE pdv_itens ADD COLUMN IF NOT EXISTS valor_subtotal NUMERIC(10,2);
ALTER TABLE pdv_itens ADD COLUMN IF NOT EXISTS valor_desconto_item NUMERIC(10,2) DEFAULT 0;
ALTER TABLE pdv_itens ADD COLUMN IF NOT EXISTS valor_total_item NUMERIC(10,2);

-- Campos de desconto no item
ALTER TABLE pdv_itens ADD COLUMN IF NOT EXISTS tem_desconto BOOLEAN DEFAULT FALSE;
ALTER TABLE pdv_itens ADD COLUMN IF NOT EXISTS tipo_desconto TEXT;
ALTER TABLE pdv_itens ADD COLUMN IF NOT EXISTS percentual_desconto NUMERIC(5,2);
ALTER TABLE pdv_itens ADD COLUMN IF NOT EXISTS valor_desconto_aplicado NUMERIC(10,2);
ALTER TABLE pdv_itens ADD COLUMN IF NOT EXISTS origem_desconto TEXT;

-- Campos de origem do item
ALTER TABLE pdv_itens ADD COLUMN IF NOT EXISTS origem_item TEXT DEFAULT 'manual';
ALTER TABLE pdv_itens ADD COLUMN IF NOT EXISTS pedido_origem_id UUID;
ALTER TABLE pdv_itens ADD COLUMN IF NOT EXISTS pedido_origem_numero TEXT;
ALTER TABLE pdv_itens ADD COLUMN IF NOT EXISTS pedidos_itens_origem_id UUID;

-- Campo de agrupamento
ALTER TABLE pdv_itens ADD COLUMN IF NOT EXISTS agrupado_com JSONB;

-- Campo de observação
ALTER TABLE pdv_itens ADD COLUMN IF NOT EXISTS observacao_item TEXT;

-- =====================================================
-- 3. CHAVES ESTRANGEIRAS
-- =====================================================

-- Criar tabela clientes se não existir
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  telefones JSONB,
  documento TEXT,
  tipo_documento TEXT,
  razao_social TEXT,
  nome_fantasia TEXT,
  cep TEXT,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deletado BOOLEAN DEFAULT FALSE
);

-- Chaves estrangeiras para PDV
DO $$
BEGIN
  -- Cliente
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_pdv_cliente'
    AND table_name = 'pdv'
  ) THEN
    ALTER TABLE pdv ADD CONSTRAINT fk_pdv_cliente
    FOREIGN KEY (cliente_id) REFERENCES clientes(id);
  END IF;

  -- Forma de pagamento
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_pdv_forma_pagamento'
    AND table_name = 'pdv'
  ) THEN
    ALTER TABLE pdv ADD CONSTRAINT fk_pdv_forma_pagamento
    FOREIGN KEY (forma_pagamento_id) REFERENCES formas_pagamento(id);
  END IF;
END $$;

-- Chaves estrangeiras para PDV_ITENS
DO $$
BEGIN
  -- PDV
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_pdv_itens_pdv'
    AND table_name = 'pdv_itens'
  ) THEN
    ALTER TABLE pdv_itens ADD CONSTRAINT fk_pdv_itens_pdv
    FOREIGN KEY (pdv_id) REFERENCES pdv(id) ON DELETE CASCADE;
  END IF;

  -- Produto
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_pdv_itens_produto'
    AND table_name = 'pdv_itens'
  ) THEN
    ALTER TABLE pdv_itens ADD CONSTRAINT fk_pdv_itens_produto
    FOREIGN KEY (produto_id) REFERENCES produtos(id);
  END IF;

  -- Pedido origem
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_pdv_itens_pedido_origem'
    AND table_name = 'pdv_itens'
  ) THEN
    ALTER TABLE pdv_itens ADD CONSTRAINT fk_pdv_itens_pedido_origem
    FOREIGN KEY (pedido_origem_id) REFERENCES pedidos(id);
  END IF;

  -- Pedidos itens origem
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_pdv_itens_pedidos_itens_origem'
    AND table_name = 'pdv_itens'
  ) THEN
    ALTER TABLE pdv_itens ADD CONSTRAINT fk_pdv_itens_pedidos_itens_origem
    FOREIGN KEY (pedidos_itens_origem_id) REFERENCES pedidos_itens(id);
  END IF;
END $$;

-- =====================================================
-- 4. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para PDV
CREATE INDEX IF NOT EXISTS idx_pdv_empresa_id ON pdv(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pdv_usuario_id ON pdv(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pdv_data_venda ON pdv(data_venda);
CREATE INDEX IF NOT EXISTS idx_pdv_status ON pdv(status_venda);
CREATE INDEX IF NOT EXISTS idx_pdv_numero ON pdv(numero_venda);
CREATE INDEX IF NOT EXISTS idx_pdv_cliente_id ON pdv(cliente_id);

-- Índices para PDV_ITENS
CREATE INDEX IF NOT EXISTS idx_pdv_itens_empresa_id ON pdv_itens(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pdv_itens_pdv_id ON pdv_itens(pdv_id);
CREATE INDEX IF NOT EXISTS idx_pdv_itens_produto_id ON pdv_itens(produto_id);
CREATE INDEX IF NOT EXISTS idx_pdv_itens_origem ON pdv_itens(origem_item);
CREATE INDEX IF NOT EXISTS idx_pdv_itens_pedido_origem ON pdv_itens(pedido_origem_id);

-- =====================================================
-- 5. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

-- Comentários na tabela PDV
COMMENT ON TABLE pdv IS 'Tabela principal do PDV (Ponto de Venda) - armazena o cabeçalho das vendas';
COMMENT ON COLUMN pdv.numero_venda IS 'Número sequencial da venda';
COMMENT ON COLUMN pdv.status_venda IS 'Status da venda: aberta, finalizada, cancelada';
COMMENT ON COLUMN pdv.pedidos_importados IS 'Array JSON com IDs dos pedidos importados para esta venda';
COMMENT ON COLUMN pdv.formas_pagamento IS 'JSON com múltiplas formas de pagamento quando tipo_pagamento = parcial';

-- Comentários na tabela PDV_ITENS
COMMENT ON TABLE pdv_itens IS 'Itens das vendas do PDV com rastreabilidade de origem';
COMMENT ON COLUMN pdv_itens.origem_item IS 'Origem do item: manual ou pedido_importado';
COMMENT ON COLUMN pdv_itens.agrupado_com IS 'JSON com informações de agrupamento quando itens iguais são consolidados';
COMMENT ON COLUMN pdv_itens.quantidade IS 'Quantidade com suporte a 3 casas decimais para produtos em KG';

-- =====================================================
-- 6. CONSTRAINTS DE VALIDAÇÃO
-- =====================================================

-- Validações para PDV
ALTER TABLE pdv ADD CONSTRAINT IF NOT EXISTS chk_pdv_status_venda
CHECK (status_venda IN ('aberta', 'finalizada', 'cancelada'));

ALTER TABLE pdv ADD CONSTRAINT IF NOT EXISTS chk_pdv_tipo_documento
CHECK (tipo_documento_cliente IN ('cpf', 'cnpj') OR tipo_documento_cliente IS NULL);

ALTER TABLE pdv ADD CONSTRAINT IF NOT EXISTS chk_pdv_tipo_pagamento
CHECK (tipo_pagamento IN ('vista', 'parcial') OR tipo_pagamento IS NULL);

-- Validações para PDV_ITENS
ALTER TABLE pdv_itens ADD CONSTRAINT IF NOT EXISTS chk_pdv_itens_origem
CHECK (origem_item IN ('manual', 'pedido_importado'));

ALTER TABLE pdv_itens ADD CONSTRAINT IF NOT EXISTS chk_pdv_itens_tipo_desconto
CHECK (tipo_desconto IN ('percentual', 'valor') OR tipo_desconto IS NULL);

ALTER TABLE pdv_itens ADD CONSTRAINT IF NOT EXISTS chk_pdv_itens_origem_desconto
CHECK (origem_desconto IN ('manual', 'promocao', 'pedido_importado') OR origem_desconto IS NULL);

ALTER TABLE pdv_itens ADD CONSTRAINT IF NOT EXISTS chk_pdv_itens_quantidade_positiva
CHECK (quantidade > 0);

ALTER TABLE pdv_itens ADD CONSTRAINT IF NOT EXISTS chk_pdv_itens_valor_unitario_positivo
CHECK (valor_unitario >= 0);
