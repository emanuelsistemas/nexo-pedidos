-- =====================================================
-- OTIMIZAÇÃO DO CÁLCULO DE ESTOQUE
-- =====================================================
-- Data: 2025-02-02
-- Descrição: Otimiza o sistema para que a grid de produtos
--            calcule o estoque baseado nas movimentações reais,
--            eliminando inconsistências e a necessidade do botão
--            "Recalcular Estoque"

-- Comentário explicativo sobre a mudança
COMMENT ON TABLE produto_estoque IS 'Tabela de histórico de movimentações de estoque. O estoque exibido na grid é calculado em tempo real baseado nestas movimentações, garantindo precisão total entre grid e histórico.';

-- Comentário sobre o campo estoque_atual
COMMENT ON COLUMN produtos.estoque_atual IS 'Campo de estoque atual mantido para compatibilidade. O valor real é calculado dinamicamente baseado nas movimentações da tabela produto_estoque.';

-- Função para sincronizar estoque_atual com as movimentações (opcional)
CREATE OR REPLACE FUNCTION sincronizar_estoque_atual()
RETURNS void AS $$
DECLARE
  produto_record RECORD;
  estoque_calculado numeric;
BEGIN
  -- Para cada produto, recalcular o estoque baseado nas movimentações
  FOR produto_record IN 
    SELECT DISTINCT p.id, p.empresa_id 
    FROM produtos p 
    WHERE p.deletado = false
  LOOP
    -- Calcular estoque baseado nas movimentações
    SELECT COALESCE(SUM(
      CASE 
        WHEN pe.tipo_movimento = 'entrada' THEN pe.quantidade 
        ELSE -pe.quantidade 
      END
    ), 0) INTO estoque_calculado
    FROM produto_estoque pe
    WHERE pe.produto_id = produto_record.id
    AND pe.empresa_id = produto_record.empresa_id;
    
    -- Atualizar o campo estoque_atual
    UPDATE produtos 
    SET estoque_atual = estoque_calculado
    WHERE id = produto_record.id;
  END LOOP;
  
  RAISE NOTICE 'Sincronização de estoque concluída';
END;
$$ LANGUAGE plpgsql;

-- Comentário sobre a função
COMMENT ON FUNCTION sincronizar_estoque_atual() IS 'Função opcional para sincronizar o campo estoque_atual com as movimentações. Não é necessária para o funcionamento normal do sistema, pois a grid calcula em tempo real.';

-- Exemplo de uso da função (comentado):
-- SELECT sincronizar_estoque_atual();
