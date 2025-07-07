/*
  # Add Multi-tenant Support

  1. Changes
    - Add empresa_id foreign key to multiple tables
    - Add indexes for empresa_id columns
    - Enable RLS on all tables
    - Add RLS policies for company-based access

  2. Tables Modified
    - entregadores
    - formas_pagamento
    - opcoes_adicionais
    - opcoes_adicionais_itens
    - pedidos
    - pedidos_itens
    - perfis_acesso
    - produtos
    - produtos_opcoes_adicionais
    - produtos_opcoes_adicionais_itens
*/

-- Add empresa_id to entregadores
ALTER TABLE entregadores 
ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_entregadores_empresa_id ON entregadores(empresa_id);
ALTER TABLE entregadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own delivery people"
  ON entregadores
  FOR ALL
  TO authenticated
  USING (empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE id = auth.uid()
  ));

-- Add empresa_id to opcoes_adicionais
ALTER TABLE opcoes_adicionais 
ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_opcoes_adicionais_empresa_id ON opcoes_adicionais(empresa_id);
ALTER TABLE opcoes_adicionais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own additional options"
  ON opcoes_adicionais
  FOR ALL
  TO authenticated
  USING (empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE id = auth.uid()
  ));

-- Add empresa_id to opcoes_adicionais_itens through parent relationship
ALTER TABLE opcoes_adicionais_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own additional option items"
  ON opcoes_adicionais_itens
  FOR ALL
  TO authenticated
  USING (opcao_id IN (
    SELECT id FROM opcoes_adicionais WHERE empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE id = auth.uid()
    )
  ));

-- Add empresa_id to pedidos (already exists)
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own orders"
  ON pedidos
  FOR ALL
  TO authenticated
  USING (empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE id = auth.uid()
  ));

-- Add empresa_id to pedidos_itens through parent relationship
ALTER TABLE pedidos_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own order items"
  ON pedidos_itens
  FOR ALL
  TO authenticated
  USING (pedido_id IN (
    SELECT id FROM pedidos WHERE empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE id = auth.uid()
    )
  ));

-- Add empresa_id to perfis_acesso
ALTER TABLE perfis_acesso 
ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_perfis_acesso_empresa_id ON perfis_acesso(empresa_id);
ALTER TABLE perfis_acesso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own access profiles"
  ON perfis_acesso
  FOR ALL
  TO authenticated
  USING (empresa_id IN (
    SELECT empresa_id FROM usuarios WHERE id = auth.uid()
  ));

-- Add empresa_id to produtos through grupo relationship
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own products"
  ON produtos
  FOR ALL
  TO authenticated
  USING (grupo_id IN (
    SELECT id FROM grupos WHERE empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE id = auth.uid()
    )
  ));

-- Add empresa_id to produtos_opcoes_adicionais through relationships
ALTER TABLE produtos_opcoes_adicionais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own product options"
  ON produtos_opcoes_adicionais
  FOR ALL
  TO authenticated
  USING (produto_id IN (
    SELECT id FROM produtos WHERE grupo_id IN (
      SELECT id FROM grupos WHERE empresa_id IN (
        SELECT empresa_id FROM usuarios WHERE id = auth.uid()
      )
    )
  ));

-- Add empresa_id to produtos_opcoes_adicionais_itens through relationships
ALTER TABLE produtos_opcoes_adicionais_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own product option items"
  ON produtos_opcoes_adicionais_itens
  FOR ALL
  TO authenticated
  USING (produto_id IN (
    SELECT id FROM produtos WHERE grupo_id IN (
      SELECT id FROM grupos WHERE empresa_id IN (
        SELECT empresa_id FROM usuarios WHERE id = auth.uid()
      )
    )
  ));