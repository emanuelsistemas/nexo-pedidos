/*
  # Create orders management tables

  1. New Tables
    - `pedidos`
      - `id` (uuid, primary key)
      - `numero` (text, unique)
      - `cliente_nome` (text)
      - `cliente_telefone` (text)
      - `status` (text)
      - `valor_total` (numeric)
      - `valor_entrega` (numeric)
      - `bairro` (text)
      - `endereco` (text)
      - `forma_pagamento` (text)
      - `entregador_id` (uuid, foreign key)
      - `empresa_id` (uuid, foreign key)
      - `created_at` (timestamptz)

    - `pedidos_itens`
      - `id` (uuid, primary key)
      - `pedido_id` (uuid, foreign key)
      - `produto_id` (uuid, foreign key)
      - `quantidade` (integer)
      - `valor_unitario` (numeric)
      - `observacao` (text)
      - `created_at` (timestamptz)

    - `pedidos_itens_adicionais`
      - `id` (uuid, primary key)
      - `pedido_item_id` (uuid, foreign key)
      - `item_adicional_id` (uuid, foreign key)
      - `quantidade` (integer)
      - `valor_unitario` (numeric)
      - `created_at` (timestamptz)

  2. Changes
    - Add foreign key constraints
    - Add indexes for better performance
*/

-- Create pedidos table
CREATE TABLE IF NOT EXISTS pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text UNIQUE NOT NULL,
  cliente_nome text NOT NULL,
  cliente_telefone text NOT NULL,
  status text NOT NULL DEFAULT 'aguardando',
  valor_total numeric(10,2) NOT NULL,
  valor_entrega numeric(10,2),
  bairro text,
  endereco text,
  forma_pagamento text,
  entregador_id uuid REFERENCES entregadores(id) ON DELETE SET NULL,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create pedidos_itens table
CREATE TABLE IF NOT EXISTS pedidos_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  quantidade integer NOT NULL DEFAULT 1,
  valor_unitario numeric(10,2) NOT NULL,
  observacao text,
  created_at timestamptz DEFAULT now()
);

-- Create pedidos_itens_adicionais table
CREATE TABLE IF NOT EXISTS pedidos_itens_adicionais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_item_id uuid NOT NULL REFERENCES pedidos_itens(id) ON DELETE CASCADE,
  item_adicional_id uuid NOT NULL REFERENCES opcoes_adicionais_itens(id) ON DELETE RESTRICT,
  quantidade integer NOT NULL DEFAULT 1,
  valor_unitario numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_pedidos_empresa_id ON pedidos(empresa_id);
CREATE INDEX idx_pedidos_entregador_id ON pedidos(entregador_id);
CREATE INDEX idx_pedidos_status ON pedidos(status);
CREATE INDEX idx_pedidos_itens_pedido_id ON pedidos_itens(pedido_id);
CREATE INDEX idx_pedidos_itens_produto_id ON pedidos_itens(produto_id);
CREATE INDEX idx_pedidos_itens_adicionais_pedido_item_id ON pedidos_itens_adicionais(pedido_item_id);
CREATE INDEX idx_pedidos_itens_adicionais_item_adicional_id ON pedidos_itens_adicionais(item_adicional_id);