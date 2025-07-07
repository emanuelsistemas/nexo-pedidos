-- Seed data for preview branches
-- This file is used to populate preview branches with sample data

-- Insert sample empresa (company) data
INSERT INTO public.empresas (id, nome, cnpj, email, telefone, endereco, cidade, estado, cep, created_at, updated_at)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Empresa Teste Preview',
  '12.345.678/0001-90',
  'teste@preview.com',
  '(11) 99999-9999',
  'Rua Teste, 123',
  'São Paulo',
  'SP',
  '01234-567',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert sample user data
INSERT INTO public.usuarios (id, nome, email, empresa_id, tipo, created_at, updated_at)
VALUES (
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
  'Usuário Teste',
  'usuario@preview.com',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'admin',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert sample product categories
INSERT INTO public.categorias (id, nome, empresa_id, created_at, updated_at)
VALUES
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Bebidas', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW(), NOW()),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Lanches', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW(), NOW()),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'Pizzas', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert sample products
INSERT INTO public.produtos (id, nome, preco, categoria_id, empresa_id, ativo, created_at, updated_at)
VALUES
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'Coca-Cola 350ml', 5.50, 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', true, NOW(), NOW()),
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'X-Burger', 15.90, 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', true, NOW(), NOW()),
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'Pizza Margherita', 35.00, 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert sample clients
INSERT INTO public.clientes (id, nome, email, telefone, empresa_id, created_at, updated_at)
VALUES
  ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', 'Cliente Teste', 'cliente@preview.com', '(11) 88888-8888', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert sample PDV configuration
INSERT INTO public.pdv_config (id, empresa_id, impressora_termica, papel_80mm, created_at, updated_at)
VALUES
  ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', true, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Add any other sample data your application needs for testing
-- This ensures preview branches have realistic data to work with
