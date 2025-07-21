/*
  # Criar tabela cardapio_digital para gerenciar pedidos do cardápio digital

  1. Nova Tabela
    - `cardapio_digital` - Armazena todos os pedidos feitos através do cardápio digital
    
  2. Relacionamentos
    - empresa_id → empresas(id)
    - cliente_id → clientes(id) 
    - cupom_desconto_id → cupons_desconto(id)
    
  3. Funcionalidades
    - Controle completo dos pedidos do cardápio digital
    - Integração com sistema de clientes
    - Controle de uso de cupons de desconto
    - Dados de entrega e pagamento
    - Histórico completo dos itens do pedido
*/

-- Criar tabela cardapio_digital
CREATE TABLE IF NOT EXISTS cardapio_digital (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação e controle
  numero_pedido VARCHAR(50) NOT NULL,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  
  -- Status do pedido
  status_pedido VARCHAR(20) DEFAULT 'pendente' CHECK (status_pedido IN ('pendente', 'confirmado', 'preparando', 'pronto', 'entregue', 'cancelado')),
  
  -- Dados do cliente (salvos no momento do pedido)
  nome_cliente TEXT NOT NULL,
  telefone_cliente TEXT NOT NULL,
  quer_nota_fiscal BOOLEAN DEFAULT FALSE,
  cpf_cnpj_cliente TEXT,
  
  -- Dados de entrega
  tem_entrega BOOLEAN DEFAULT FALSE,
  cep_entrega TEXT,
  endereco_entrega TEXT,
  numero_entrega TEXT,
  complemento_entrega TEXT,
  bairro_entrega TEXT,
  cidade_entrega TEXT,
  estado_entrega TEXT,
  tipo_endereco VARCHAR(20), -- 'casa' ou 'condominio'
  nome_condominio TEXT,
  bloco_endereco TEXT,
  proximo_a TEXT,
  
  -- Taxa de entrega
  valor_taxa_entrega DECIMAL(10,2) DEFAULT 0,
  distancia_km DECIMAL(8,2),
  tempo_estimado_minutos INTEGER,
  
  -- Forma de pagamento
  forma_pagamento_nome TEXT,
  forma_pagamento_tipo VARCHAR(20), -- 'dinheiro', 'pix', 'cartao_credito', 'cartao_debito'
  forma_pagamento_detalhes JSONB, -- Detalhes específicos (chave PIX, troco, parcelas, etc.)
  
  -- Cupom de desconto
  cupom_desconto_id UUID REFERENCES cupons_desconto(id) ON DELETE SET NULL,
  cupom_codigo TEXT,
  cupom_descricao TEXT,
  cupom_tipo_desconto VARCHAR(20), -- 'percentual' ou 'valor_fixo'
  cupom_valor_desconto DECIMAL(10,2),
  
  -- Valores do pedido
  valor_produtos DECIMAL(10,2) NOT NULL DEFAULT 0,
  valor_desconto_cupom DECIMAL(10,2) DEFAULT 0,
  valor_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Itens do pedido (JSONB para flexibilidade)
  itens_pedido JSONB NOT NULL DEFAULT '[]',
  
  -- Observações
  observacao_pedido TEXT,
  observacao_entrega TEXT,
  
  -- Dados de origem
  url_cardapio TEXT, -- URL do cardápio usado
  ip_cliente INET,
  user_agent TEXT,
  
  -- Controle de timestamps
  data_pedido TIMESTAMPTZ DEFAULT NOW(),
  data_confirmacao TIMESTAMPTZ,
  data_entrega TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentários na tabela
COMMENT ON TABLE cardapio_digital IS 'Tabela para gerenciar pedidos feitos através do cardápio digital';
COMMENT ON COLUMN cardapio_digital.numero_pedido IS 'Número único do pedido para identificação';
COMMENT ON COLUMN cardapio_digital.itens_pedido IS 'Array JSON com todos os itens do pedido (produtos, sabores, adicionais, observações)';
COMMENT ON COLUMN cardapio_digital.forma_pagamento_detalhes IS 'JSON com detalhes específicos da forma de pagamento';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cardapio_digital_empresa_id ON cardapio_digital(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cardapio_digital_cliente_id ON cardapio_digital(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cardapio_digital_numero_pedido ON cardapio_digital(numero_pedido);
CREATE INDEX IF NOT EXISTS idx_cardapio_digital_data_pedido ON cardapio_digital(data_pedido);
CREATE INDEX IF NOT EXISTS idx_cardapio_digital_status ON cardapio_digital(status_pedido);
CREATE INDEX IF NOT EXISTS idx_cardapio_digital_cupom ON cardapio_digital(cupom_desconto_id);

-- Índice único para número do pedido por empresa
CREATE UNIQUE INDEX IF NOT EXISTS idx_cardapio_digital_numero_empresa 
ON cardapio_digital(empresa_id, numero_pedido);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_cardapio_digital_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cardapio_digital_updated_at
  BEFORE UPDATE ON cardapio_digital
  FOR EACH ROW
  EXECUTE FUNCTION update_cardapio_digital_updated_at();

-- RLS (Row Level Security)
ALTER TABLE cardapio_digital ENABLE ROW LEVEL SECURITY;

-- Política para empresas verem apenas seus próprios pedidos
CREATE POLICY "Empresas podem ver seus próprios pedidos do cardápio digital"
  ON cardapio_digital
  FOR SELECT
  USING (empresa_id = auth.uid() OR empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE id = auth.uid()
  ));

-- Política para inserir pedidos
CREATE POLICY "Empresas podem inserir pedidos do cardápio digital"
  ON cardapio_digital
  FOR INSERT
  WITH CHECK (empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE id = auth.uid()
  ));

-- Política para atualizar pedidos
CREATE POLICY "Empresas podem atualizar seus próprios pedidos do cardápio digital"
  ON cardapio_digital
  FOR UPDATE
  USING (empresa_id = auth.uid() OR empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE id = auth.uid()
  ));

-- Função para gerar número sequencial do pedido por empresa
CREATE OR REPLACE FUNCTION gerar_numero_pedido_cardapio(empresa_uuid UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  proximo_numero INTEGER;
  numero_formatado VARCHAR(50);
BEGIN
  -- Buscar o próximo número sequencial para a empresa
  SELECT COALESCE(MAX(CAST(numero_pedido AS INTEGER)), 0) + 1
  INTO proximo_numero
  FROM cardapio_digital
  WHERE empresa_id = empresa_uuid
    AND numero_pedido ~ '^[0-9]+$'; -- Apenas números
  
  -- Formatar com zeros à esquerda (6 dígitos)
  numero_formatado := LPAD(proximo_numero::TEXT, 6, '0');
  
  RETURN numero_formatado;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION gerar_numero_pedido_cardapio IS 'Gera número sequencial único do pedido por empresa';
