-- =====================================================
-- FUNÇÃO PARA ATUALIZAR ESTOQUE DE PRODUTOS
-- =====================================================

-- Função para atualizar estoque de produto
CREATE OR REPLACE FUNCTION atualizar_estoque_produto(
  p_produto_id UUID,
  p_quantidade NUMERIC(10,3),
  p_tipo_operacao TEXT DEFAULT 'manual',
  p_observacao TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_empresa_id UUID;
  v_estoque_atual NUMERIC(10,3) := 0;
  v_novo_estoque NUMERIC(10,3);
BEGIN
  -- Buscar empresa_id do produto
  SELECT empresa_id INTO v_empresa_id
  FROM produtos
  WHERE id = p_produto_id;
  
  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;
  
  -- Buscar estoque atual
  SELECT COALESCE(quantidade_atual, 0) INTO v_estoque_atual
  FROM produto_estoque
  WHERE produto_id = p_produto_id;
  
  -- Calcular novo estoque
  v_novo_estoque := v_estoque_atual + p_quantidade;
  
  -- Verificar se estoque não ficará negativo
  IF v_novo_estoque < 0 THEN
    RAISE EXCEPTION 'Estoque insuficiente. Estoque atual: %, Tentativa de baixa: %', v_estoque_atual, ABS(p_quantidade);
  END IF;
  
  -- Atualizar ou inserir estoque
  INSERT INTO produto_estoque (
    empresa_id,
    produto_id,
    quantidade_atual,
    updated_at
  )
  VALUES (
    v_empresa_id,
    p_produto_id,
    v_novo_estoque,
    NOW()
  )
  ON CONFLICT (produto_id)
  DO UPDATE SET
    quantidade_atual = v_novo_estoque,
    updated_at = NOW();
  
  -- Registrar movimentação no histórico (se a tabela existir)
  BEGIN
    INSERT INTO produto_estoque_historico (
      empresa_id,
      produto_id,
      tipo_operacao,
      quantidade_anterior,
      quantidade_movimentada,
      quantidade_atual,
      observacao,
      created_at
    )
    VALUES (
      v_empresa_id,
      p_produto_id,
      p_tipo_operacao,
      v_estoque_atual,
      p_quantidade,
      v_novo_estoque,
      p_observacao,
      NOW()
    );
  EXCEPTION
    WHEN undefined_table THEN
      -- Tabela de histórico não existe, continuar sem erro
      NULL;
  END;
  
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao atualizar estoque: %', SQLERRM;
END;
$$;

-- Comentário na função
COMMENT ON FUNCTION atualizar_estoque_produto IS 'Atualiza estoque de produto com validações e histórico';

-- =====================================================
-- FUNÇÃO PARA VERIFICAR ESTOQUE DISPONÍVEL
-- =====================================================

CREATE OR REPLACE FUNCTION verificar_estoque_disponivel(
  p_produto_id UUID,
  p_quantidade_necessaria NUMERIC(10,3)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_estoque_atual NUMERIC(10,3) := 0;
BEGIN
  -- Buscar estoque atual
  SELECT COALESCE(quantidade_atual, 0) INTO v_estoque_atual
  FROM produto_estoque
  WHERE produto_id = p_produto_id;
  
  -- Retornar se há estoque suficiente
  RETURN v_estoque_atual >= p_quantidade_necessaria;
END;
$$;

-- Comentário na função
COMMENT ON FUNCTION verificar_estoque_disponivel IS 'Verifica se há estoque suficiente para uma operação';

-- =====================================================
-- FUNÇÃO PARA OBTER ESTOQUE ATUAL
-- =====================================================

CREATE OR REPLACE FUNCTION obter_estoque_atual(p_produto_id UUID)
RETURNS NUMERIC(10,3)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_estoque_atual NUMERIC(10,3) := 0;
BEGIN
  -- Buscar estoque atual
  SELECT COALESCE(quantidade_atual, 0) INTO v_estoque_atual
  FROM produto_estoque
  WHERE produto_id = p_produto_id;
  
  RETURN v_estoque_atual;
END;
$$;

-- Comentário na função
COMMENT ON FUNCTION obter_estoque_atual IS 'Retorna o estoque atual de um produto';

-- =====================================================
-- PERMISSÕES
-- =====================================================

-- Dar permissões para usuários autenticados
GRANT EXECUTE ON FUNCTION atualizar_estoque_produto TO authenticated;
GRANT EXECUTE ON FUNCTION verificar_estoque_disponivel TO authenticated;
GRANT EXECUTE ON FUNCTION obter_estoque_atual TO authenticated;
