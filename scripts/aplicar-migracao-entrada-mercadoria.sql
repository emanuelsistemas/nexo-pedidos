-- Script para aplicar migração de entrada de mercadoria
-- Execute este script no Supabase SQL Editor ou via CLI

-- Verificar se as tabelas já existem
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('entrada_mercadoria', 'entrada_mercadoria_itens')
ORDER BY table_name;

-- Aplicar a migração
\i supabase/migrations/20250731000001_create_entrada_mercadoria_tables.sql

-- Verificar se as tabelas foram criadas com sucesso
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('entrada_mercadoria', 'entrada_mercadoria_itens')
ORDER BY table_name, ordinal_position;

-- Verificar índices criados
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('entrada_mercadoria', 'entrada_mercadoria_itens')
ORDER BY tablename, indexname;

-- Verificar constraints
SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public' 
  AND tc.table_name IN ('entrada_mercadoria', 'entrada_mercadoria_itens')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- Verificar funções criadas
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%entrada_mercadoria%'
ORDER BY routine_name;

-- Testar função de próximo número
SELECT get_proximo_numero_entrada_mercadoria('00000000-0000-0000-0000-000000000000'::UUID) as proximo_numero;

-- Verificar triggers
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'public' 
  AND event_object_table IN ('entrada_mercadoria', 'entrada_mercadoria_itens')
ORDER BY event_object_table, trigger_name;
