-- =====================================================
-- SCRIPT PARA DELETAR EMPRESA COMPLETA
-- =====================================================
-- ATENÇÃO: Este script deleta TODOS os dados de uma empresa
-- Incluindo usuários, pedidos, produtos, clientes, etc.
-- USE COM MUITO CUIDADO!
-- =====================================================

-- INSTRUÇÕES:
-- 1. Substitua 'SEU_EMPRESA_ID_AQUI' pelo ID real da empresa
-- 2. Execute o script no Supabase SQL Editor
-- 3. Confirme que é a empresa correta antes de executar

DO $$
DECLARE
    empresa_uuid UUID := 'SEU_EMPRESA_ID_AQUI'; -- ⚠️ SUBSTITUA AQUI
    user_record RECORD;
    empresa_nome TEXT;
    total_usuarios INTEGER;
    total_pedidos INTEGER;
    total_produtos INTEGER;
    total_clientes INTEGER;
BEGIN
    -- Verificar se a empresa existe
    SELECT nome INTO empresa_nome FROM empresas WHERE id = empresa_uuid;
    
    IF empresa_nome IS NULL THEN
        RAISE EXCEPTION 'Empresa com ID % não encontrada!', empresa_uuid;
    END IF;
    
    -- Mostrar estatísticas antes da exclusão
    SELECT COUNT(*) INTO total_usuarios FROM usuarios WHERE empresa_id = empresa_uuid;
    SELECT COUNT(*) INTO total_pedidos FROM pedidos WHERE empresa_id = empresa_uuid;
    SELECT COUNT(*) INTO total_produtos FROM produtos WHERE empresa_id = empresa_uuid;
    SELECT COUNT(*) INTO total_clientes FROM clientes WHERE empresa_id = empresa_uuid;
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'DELETANDO EMPRESA: %', empresa_nome;
    RAISE NOTICE 'ID: %', empresa_uuid;
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Estatísticas antes da exclusão:';
    RAISE NOTICE '- Usuários: %', total_usuarios;
    RAISE NOTICE '- Pedidos: %', total_pedidos;
    RAISE NOTICE '- Produtos: %', total_produtos;
    RAISE NOTICE '- Clientes: %', total_clientes;
    RAISE NOTICE '==========================================';
    
    -- 1. Deletar dados de pedidos (mais profundos primeiro)
    RAISE NOTICE 'Deletando dados de pedidos...';
    DELETE FROM pedidos_itens_adicionais WHERE empresa_id = empresa_uuid;
    DELETE FROM pedidos_itens WHERE empresa_id = empresa_uuid;
    DELETE FROM forma_pagamento_pedido WHERE empresa_id = empresa_uuid;
    DELETE FROM fidelizacao_pontos WHERE empresa_id = empresa_uuid;
    DELETE FROM pedidos WHERE empresa_id = empresa_uuid;
    
    -- 2. Deletar dados de produtos
    RAISE NOTICE 'Deletando dados de produtos...';
    DELETE FROM produto_estoque WHERE empresa_id = empresa_uuid;
    DELETE FROM produto_fotos WHERE empresa_id = empresa_uuid;
    DELETE FROM produtos_opcoes_adicionais_itens WHERE empresa_id = empresa_uuid;
    DELETE FROM produtos_opcoes_adicionais WHERE empresa_id = empresa_uuid;
    DELETE FROM produtos WHERE empresa_id = empresa_uuid;
    
    -- 3. Deletar opções adicionais
    RAISE NOTICE 'Deletando opções adicionais...';
    DELETE FROM opcoes_adicionais_itens WHERE empresa_id = empresa_uuid;
    DELETE FROM opcoes_adicionais WHERE empresa_id = empresa_uuid;
    
    -- 4. Deletar dados de clientes
    RAISE NOTICE 'Deletando dados de clientes...';
    DELETE FROM telefone_clientes WHERE empresa_id = empresa_uuid;
    DELETE FROM cliente_descontos_prazo WHERE empresa_id = empresa_uuid;
    DELETE FROM cliente_descontos_valor WHERE empresa_id = empresa_uuid;
    DELETE FROM clientes_empresas WHERE empresa_id = empresa_uuid;
    DELETE FROM clientes WHERE empresa_id = empresa_uuid;
    
    -- 5. Deletar configurações e outros dados
    RAISE NOTICE 'Deletando configurações...';
    DELETE FROM unidade_medida WHERE empresa_id = empresa_uuid;
    DELETE FROM grupos WHERE empresa_id = empresa_uuid;
    DELETE FROM entregadores WHERE empresa_id = empresa_uuid;
    DELETE FROM gestor WHERE empresa_id = empresa_uuid;
    DELETE FROM conexao WHERE empresa_id = empresa_uuid;
    DELETE FROM configuracoes WHERE empresa_id = empresa_uuid;
    DELETE FROM horario_atendimento WHERE empresa_id = empresa_uuid;
    DELETE FROM taxa_entrega WHERE empresa_id = empresa_uuid;
    DELETE FROM tipo_controle_estoque_config WHERE empresa_id = empresa_uuid;
    DELETE FROM pedidos_config WHERE empresa_id = empresa_uuid;
    DELETE FROM fidelizacao_config WHERE empresa_id = empresa_uuid;
    DELETE FROM perfis_acesso WHERE empresa_id = empresa_uuid;
    DELETE FROM forma_pagamento_opcoes WHERE empresa_id = empresa_uuid;
    
    -- 6. Deletar usuários do auth.users (IMPORTANTE!)
    RAISE NOTICE 'Deletando usuários da autenticação...';
    FOR user_record IN 
        SELECT id FROM usuarios WHERE empresa_id = empresa_uuid
    LOOP
        DELETE FROM auth.users WHERE id = user_record.id;
        RAISE NOTICE 'Usuário % deletado do auth.users', user_record.id;
    END LOOP;
    
    -- 7. Deletar usuários da tabela usuarios
    DELETE FROM usuarios WHERE empresa_id = empresa_uuid;
    
    -- 8. Finalmente, deletar a empresa
    RAISE NOTICE 'Deletando empresa...';
    DELETE FROM empresas WHERE id = empresa_uuid;
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ EMPRESA DELETADA COM SUCESSO!';
    RAISE NOTICE 'Empresa: %', empresa_nome;
    RAISE NOTICE 'ID: %', empresa_uuid;
    RAISE NOTICE '==========================================';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erro ao deletar empresa: %', SQLERRM;
END $$;
