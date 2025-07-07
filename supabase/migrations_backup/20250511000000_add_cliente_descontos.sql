/*
  # Add cliente_descontos tables

  1. Changes
    - Create cliente_descontos_prazo table for payment term discounts
    - Create cliente_descontos_valor table for order value discounts
*/

-- Table for payment term discounts
CREATE TABLE IF NOT EXISTS cliente_descontos_prazo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  prazo_dias INTEGER NOT NULL,
  percentual DECIMAL(10, 2) NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('desconto', 'acrescimo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment to table
COMMENT ON TABLE cliente_descontos_prazo IS 'Descontos ou acréscimos por prazo de faturamento para clientes';

-- Add RLS policies
ALTER TABLE cliente_descontos_prazo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresas podem ver seus próprios descontos por prazo"
  ON cliente_descontos_prazo
  FOR SELECT
  USING (empresa_id = auth.uid() OR empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "Empresas podem inserir seus próprios descontos por prazo"
  ON cliente_descontos_prazo
  FOR INSERT
  WITH CHECK (empresa_id = auth.uid() OR empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "Empresas podem atualizar seus próprios descontos por prazo"
  ON cliente_descontos_prazo
  FOR UPDATE
  USING (empresa_id = auth.uid() OR empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "Empresas podem excluir seus próprios descontos por prazo"
  ON cliente_descontos_prazo
  FOR DELETE
  USING (empresa_id = auth.uid() OR empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE id = auth.uid()
  ));

-- Table for order value discounts
CREATE TABLE IF NOT EXISTS cliente_descontos_valor (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  valor_minimo DECIMAL(10, 2) NOT NULL,
  percentual DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment to table
COMMENT ON TABLE cliente_descontos_valor IS 'Descontos por valor mínimo de pedido para clientes';

-- Add RLS policies
ALTER TABLE cliente_descontos_valor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresas podem ver seus próprios descontos por valor"
  ON cliente_descontos_valor
  FOR SELECT
  USING (empresa_id = auth.uid() OR empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "Empresas podem inserir seus próprios descontos por valor"
  ON cliente_descontos_valor
  FOR INSERT
  WITH CHECK (empresa_id = auth.uid() OR empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "Empresas podem atualizar seus próprios descontos por valor"
  ON cliente_descontos_valor
  FOR UPDATE
  USING (empresa_id = auth.uid() OR empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "Empresas podem excluir seus próprios descontos por valor"
  ON cliente_descontos_valor
  FOR DELETE
  USING (empresa_id = auth.uid() OR empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE id = auth.uid()
  ));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS cliente_descontos_prazo_cliente_id_idx ON cliente_descontos_prazo(cliente_id);
CREATE INDEX IF NOT EXISTS cliente_descontos_prazo_empresa_id_idx ON cliente_descontos_prazo(empresa_id);
CREATE INDEX IF NOT EXISTS cliente_descontos_valor_cliente_id_idx ON cliente_descontos_valor(cliente_id);
CREATE INDEX IF NOT EXISTS cliente_descontos_valor_empresa_id_idx ON cliente_descontos_valor(empresa_id);
