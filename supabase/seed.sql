-- Seed data for preview branches
-- This file is used to populate preview branches with sample data

-- Insert sample empresa (company) data
INSERT INTO public.empresas (id, nome, cnpj, email, telefone, endereco, cidade, estado, cep, created_at, updated_at)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Restaurante Preview',
  '12.345.678/0001-90',
  'contato@restaurantepreview.com',
  '(11) 99999-9999',
  'Rua das Delícias, 123',
  'São Paulo',
  'SP',
  '01234-567',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert sample user data
INSERT INTO public.usuarios (id, nome, email, empresa_id, tipo, serie_nfce, created_at, updated_at)
VALUES (
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
  'Admin Preview',
  'admin@restaurantepreview.com',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'admin',
  1,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert sample product categories
INSERT INTO public.categorias (id, nome, empresa_id, ordenacao, created_at, updated_at)
VALUES
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Bebidas', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 1, NOW(), NOW()),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Lanches', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 2, NOW(), NOW()),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'Pizzas', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 3, NOW(), NOW()),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'Sobremesas', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 4, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert sample products
INSERT INTO public.produtos (id, nome, preco, categoria_id, empresa_id, ativo, pizza, ordenacao, created_at, updated_at)
VALUES
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'Coca-Cola 350ml', 5.50, 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', true, false, 1, NOW(), NOW()),
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'Guaraná Antarctica 350ml', 5.00, 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', true, false, 2, NOW(), NOW()),
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 'X-Burger', 15.90, 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', true, false, 1, NOW(), NOW()),
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 'X-Salada', 18.50, 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', true, false, 2, NOW(), NOW()),
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'Pizza Margherita', 35.00, 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', true, true, 1, NOW(), NOW()),
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Pizza Calabresa', 38.00, 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', true, true, 2, NOW(), NOW()),
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'Pudim', 8.50, 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', true, false, 1, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert sample clients
INSERT INTO public.clientes (id, nome, email, telefone, empresa_id, estado, created_at, updated_at)
VALUES
  ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'João Silva', 'joao@email.com', '(11) 99999-1111', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'SP', NOW(), NOW()),
  ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 'Maria Santos', 'maria@email.com', '(11) 99999-2222', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'SP', NOW(), NOW()),
  ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a26', 'Pedro Costa', 'pedro@email.com', '(11) 99999-3333', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'SP', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert sample PDV configuration
INSERT INTO public.pdv_config (id, empresa_id, impressora_termica, papel_80mm, trabalha_com_pizzas, created_at, updated_at)
VALUES
  ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a27', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', true, true, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert sample sales
INSERT INTO public.vendas (id, empresa_id, cliente_id, usuario_id, total, status, created_at, updated_at)
VALUES
  ('g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a28', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 59.40, 'finalizada', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  ('g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a29', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 23.50, 'finalizada', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Insert sample sale items
INSERT INTO public.venda_itens (id, venda_id, produto_id, quantidade, preco_unitario, subtotal, created_at)
VALUES
  ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380a30', 'g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a28', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 1, 35.00, 35.00, NOW() - INTERVAL '2 days'),
  ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a28', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 2, 5.50, 11.00, NOW() - INTERVAL '2 days'),
  ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', 'g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a28', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 1, 8.50, 8.50, NOW() - INTERVAL '2 days'),
  ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a29', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 1, 15.90, 15.90, NOW() - INTERVAL '1 day'),
  ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380a34', 'g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a29', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 1, 5.00, 5.00, NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Add any other sample data your application needs for testing
-- This ensures preview branches have realistic data to work with
