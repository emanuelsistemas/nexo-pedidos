/*
  # Disable RLS for specified tables

  This migration disables row level security (RLS) for the following tables:
  - conexao
  - entregadores
  - opcoes_adicionais
  - opcoes_adicionais_itens
  - pedidos
  - pedidos_itens
  - pedidos_itens_adicionais
  - perfis_acesso
  - produtos
  - produtos_opcoes_adicionais
  - produtos_opcoes_adicionais_itens
*/

-- Disable RLS for specified tables
ALTER TABLE conexao DISABLE ROW LEVEL SECURITY;
ALTER TABLE entregadores DISABLE ROW LEVEL SECURITY;
ALTER TABLE opcoes_adicionais DISABLE ROW LEVEL SECURITY;
ALTER TABLE opcoes_adicionais_itens DISABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos DISABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_itens DISABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_itens_adicionais DISABLE ROW LEVEL SECURITY;
ALTER TABLE perfis_acesso DISABLE ROW LEVEL SECURITY;
ALTER TABLE produtos DISABLE ROW LEVEL SECURITY;
ALTER TABLE produtos_opcoes_adicionais DISABLE ROW LEVEL SECURITY;
ALTER TABLE produtos_opcoes_adicionais_itens DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own connections" ON conexao;
DROP POLICY IF EXISTS "Users can manage their own delivery people" ON entregadores;
DROP POLICY IF EXISTS "Users can manage their own additional options" ON opcoes_adicionais;
DROP POLICY IF EXISTS "Users can manage their own additional option items" ON opcoes_adicionais_itens;
DROP POLICY IF EXISTS "Users can manage their own orders" ON pedidos;
DROP POLICY IF EXISTS "Users can manage their own order items" ON pedidos_itens;
DROP POLICY IF EXISTS "Users can manage their own order item addons" ON pedidos_itens_adicionais;
DROP POLICY IF EXISTS "Users can manage their own access profiles" ON perfis_acesso;
DROP POLICY IF EXISTS "Users can manage their own products" ON produtos;
DROP POLICY IF EXISTS "Users can manage their own product options" ON produtos_opcoes_adicionais;
DROP POLICY IF EXISTS "Users can manage their own product option items" ON produtos_opcoes_adicionais_itens;