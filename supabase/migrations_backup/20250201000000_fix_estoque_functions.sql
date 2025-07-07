-- =====================================================
-- CORREÇÃO DAS FUNÇÕES DE ESTOQUE
-- =====================================================
-- Data: 2025-02-01
-- Descrição: Corrige as funções de estoque para trabalhar corretamente
--            com a estrutura atual das tabelas produto_estoque e produtos

-- Função para atualizar estoque de produto (CORRIGIDA)
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
  v_usuario_id UUID;
  v_estoque_atual NUMERIC(10,3) := 0;
  v_novo_estoque NUMERIC(10,3);
  v_bloqueia_estoque BOOLEAN := false;
BEGIN
  -- Buscar empresa_id do produto e estoque atual
  SELECT empresa_id, COALESCE(estoque_atual, 0) INTO v_empresa_id, v_estoque_atual
  FROM produtos
  WHERE id = p_produto_id;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;

  -- Verificar configuração de bloqueio de estoque da empresa
  SELECT COALESCE(bloqueia_sem_estoque, false) INTO v_bloqueia_estoque
  FROM tipo_controle_estoque_config
  WHERE empresa_id = v_empresa_id;

  -- Buscar usuário atual (se autenticado)
  SELECT auth.uid() INTO v_usuario_id;

  -- Se não há usuário autenticado, usar um UUID padrão do sistema
  IF v_usuario_id IS NULL THEN
    v_usuario_id := '00000000-0000-0000-0000-000000000000'::UUID;
  END IF;

  -- Calcular novo estoque
  v_novo_estoque := v_estoque_atual + p_quantidade;

  -- Verificar se estoque não ficará negativo (apenas se bloqueio estiver ativado e for saída)
  IF v_bloqueia_estoque AND p_quantidade < 0 AND v_novo_estoque < 0 THEN
    RAISE EXCEPTION 'Estoque insuficiente. Estoque atual: %, Tentativa de baixa: %', v_estoque_atual, ABS(p_quantidade);
  END IF;

  -- Atualizar estoque atual na tabela produtos
  UPDATE produtos
  SET estoque_atual = v_novo_estoque
  WHERE id = p_produto_id;

  -- Registrar movimentação no histórico
  INSERT INTO produto_estoque (
    empresa_id,
    usuario_id,
    produto_id,
    tipo_movimento,
    quantidade,
    data_hora_movimento,
    observacao
  )
  VALUES (
    v_empresa_id,
    v_usuario_id,
    p_produto_id,
    CASE
      WHEN p_quantidade > 0 THEN 'entrada'
      ELSE 'saida'
    END,
    ABS(p_quantidade),
    NOW(),
    p_observacao
  );

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao atualizar estoque: %', SQLERRM;
END;
$$;

-- Função para verificar estoque disponível (CORRIGIDA)
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
  -- Buscar estoque atual na tabela produtos
  SELECT COALESCE(estoque_atual, 0) INTO v_estoque_atual
  FROM produtos
  WHERE id = p_produto_id;

  -- Retornar se há estoque suficiente
  RETURN v_estoque_atual >= p_quantidade_necessaria;
END;
$$;

-- Função para obter estoque atual (CORRIGIDA)
CREATE OR REPLACE FUNCTION obter_estoque_atual(p_produto_id UUID)
RETURNS NUMERIC(10,3)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_estoque_atual NUMERIC(10,3) := 0;
BEGIN
  -- Buscar estoque atual na tabela produtos
  SELECT COALESCE(estoque_atual, 0) INTO v_estoque_atual
  FROM produtos
  WHERE id = p_produto_id;

  RETURN v_estoque_atual;
END;
$$;

-- Comentários nas funções
COMMENT ON FUNCTION atualizar_estoque_produto IS 'Atualiza estoque de produto com validações e histórico (CORRIGIDA)';
COMMENT ON FUNCTION verificar_estoque_disponivel IS 'Verifica se há estoque suficiente para uma operação (CORRIGIDA)';
COMMENT ON FUNCTION obter_estoque_atual IS 'Retorna o estoque atual de um produto (CORRIGIDA)';

-- Dar permissões para usuários autenticados
GRANT EXECUTE ON FUNCTION atualizar_estoque_produto TO authenticated;
GRANT EXECUTE ON FUNCTION verificar_estoque_disponivel TO authenticated;
GRANT EXECUTE ON FUNCTION obter_estoque_atual TO authenticated;
