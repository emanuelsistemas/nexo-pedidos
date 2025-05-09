/*
  # Add product options relations

  1. New Tables
    - `produtos_opcoes_adicionais`
      - Links produtos with opcoes_adicionais
      - Allows multiple options per product
    - `produtos_opcoes_adicionais_itens`
      - Links produtos with opcoes_adicionais_itens
      - Stores which items from each option are available for the product

  2. Changes
    - Added foreign key constraints to ensure data integrity
    - Added indexes for better query performance
*/

-- Create junction table for produtos and opcoes_adicionais
CREATE TABLE IF NOT EXISTS produtos_opcoes_adicionais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  opcao_id uuid NOT NULL REFERENCES opcoes_adicionais(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(produto_id, opcao_id)
);

-- Create junction table for produtos and opcoes_adicionais_itens
CREATE TABLE IF NOT EXISTS produtos_opcoes_adicionais_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES opcoes_adicionais_itens(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(produto_id, item_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_produtos_opcoes_produto_id ON produtos_opcoes_adicionais(produto_id);
CREATE INDEX IF NOT EXISTS idx_produtos_opcoes_opcao_id ON produtos_opcoes_adicionais(opcao_id);
CREATE INDEX IF NOT EXISTS idx_produtos_itens_produto_id ON produtos_opcoes_adicionais_itens(produto_id);
CREATE INDEX IF NOT EXISTS idx_produtos_itens_item_id ON produtos_opcoes_adicionais_itens(item_id);