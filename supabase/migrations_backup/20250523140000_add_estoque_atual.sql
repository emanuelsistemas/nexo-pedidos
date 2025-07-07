/*
  # Add estoque_atual field to produtos table

  1. Changes
    - Add estoque_atual column to produtos table if it doesn't exist
    - Default value is 0
    - Create function to recalculate stock based on movements
*/

-- Add estoque_atual to produtos table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'produtos'
    AND column_name = 'estoque_atual'
  ) THEN
    ALTER TABLE produtos
    ADD COLUMN estoque_atual numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- Create function to recalculate stock for a product
CREATE OR REPLACE FUNCTION recalcular_estoque_produto(produto_id_param uuid, empresa_id_param uuid)
RETURNS numeric AS $$
DECLARE
  estoque_calculado numeric := 0;
  movimento RECORD;
BEGIN
  -- Calculate stock based on movements
  FOR movimento IN
    SELECT tipo_movimento, quantidade
    FROM produto_estoque
    WHERE produto_id = produto_id_param
    AND empresa_id = empresa_id_param
    ORDER BY data_hora_movimento ASC
  LOOP
    IF movimento.tipo_movimento = 'entrada' THEN
      estoque_calculado := estoque_calculado + movimento.quantidade;
    ELSE
      estoque_calculado := estoque_calculado - movimento.quantidade;
    END IF;
  END LOOP;

  -- Update the product's current stock
  UPDATE produtos
  SET estoque_atual = estoque_calculado
  WHERE id = produto_id_param
  AND empresa_id = empresa_id_param;

  RETURN estoque_calculado;
END;
$$ LANGUAGE plpgsql;

-- Create function to recalculate stock for all products of a company
CREATE OR REPLACE FUNCTION recalcular_estoque_empresa(empresa_id_param uuid)
RETURNS void AS $$
DECLARE
  produto RECORD;
BEGIN
  FOR produto IN
    SELECT id
    FROM produtos
    WHERE empresa_id = empresa_id_param
    AND deletado = false
  LOOP
    PERFORM recalcular_estoque_produto(produto.id, empresa_id_param);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to check stock inconsistencies
CREATE OR REPLACE FUNCTION verificar_inconsistencias_estoque(empresa_id_param uuid)
RETURNS TABLE(
  id uuid,
  nome text,
  estoque_atual numeric,
  estoque_calculado numeric,
  diferenca numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.nome,
    p.estoque_atual,
    COALESCE(SUM(
      CASE
        WHEN pe.tipo_movimento = 'entrada' THEN pe.quantidade
        ELSE -pe.quantidade
      END
    ), 0) as estoque_calculado,
    p.estoque_atual - COALESCE(SUM(
      CASE
        WHEN pe.tipo_movimento = 'entrada' THEN pe.quantidade
        ELSE -pe.quantidade
      END
    ), 0) as diferenca
  FROM produtos p
  LEFT JOIN produto_estoque pe ON p.id = pe.produto_id
  WHERE p.empresa_id = empresa_id_param
  AND p.deletado = false
  GROUP BY p.id, p.nome, p.estoque_atual
  HAVING ABS(p.estoque_atual - COALESCE(SUM(
    CASE
      WHEN pe.tipo_movimento = 'entrada' THEN pe.quantidade
      ELSE -pe.quantidade
    END
  ), 0)) > 0.01;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON COLUMN produtos.estoque_atual IS 'Estoque atual do produto calculado baseado nas movimentações';
COMMENT ON FUNCTION recalcular_estoque_produto(uuid, uuid) IS 'Recalcula o estoque de um produto baseado no histórico de movimentações';
COMMENT ON FUNCTION recalcular_estoque_empresa(uuid) IS 'Recalcula o estoque de todos os produtos de uma empresa';
COMMENT ON FUNCTION verificar_inconsistencias_estoque(uuid) IS 'Verifica produtos com inconsistências entre estoque atual e calculado';
