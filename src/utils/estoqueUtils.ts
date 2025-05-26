import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Atualiza o estoque de um produto com base no tipo de movimento
 * @param supabase Cliente Supabase
 * @param empresaId ID da empresa
 * @param usuarioId ID do usuário que está realizando a operação
 * @param produtoId ID do produto
 * @param quantidade Quantidade a ser movimentada
 * @param tipoMovimento Tipo de movimento ('entrada', 'saida')
 * @param observacao Observação sobre o movimento
 * @returns Objeto com status da operação e mensagem
 */
export const atualizarEstoqueProduto = async (
  supabase: SupabaseClient,
  empresaId: string,
  usuarioId: string,
  produtoId: string,
  quantidade: number,
  tipoMovimento: 'entrada' | 'saida',
  observacao: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Verificar configuração de bloqueio de estoque
    const { data: configData, error: configError } = await supabase
      .from('tipo_controle_estoque_config')
      .select('bloqueia_sem_estoque')
      .eq('empresa_id', empresaId)
      .single();

    const bloqueiaEstoque = configData?.bloqueia_sem_estoque || false;

    // Buscar estoque atual do produto
    const { data: produtoData, error: produtoError } = await supabase
      .from('produtos')
      .select('estoque_atual')
      .eq('id', produtoId)
      .eq('empresa_id', empresaId)
      .single();

    if (produtoError) {
      console.error('Erro ao buscar estoque do produto:', produtoError);
      return { success: false, message: 'Erro ao buscar estoque do produto' };
    }

    // Calcular novo estoque
    const estoqueAtual = parseFloat(produtoData.estoque_atual || '0');
    const novoEstoque = tipoMovimento === 'entrada'
      ? estoqueAtual + quantidade
      : estoqueAtual - quantidade;

    // Verificar se há estoque suficiente para saída apenas se a opção de bloqueio estiver ativada
    if (bloqueiaEstoque && tipoMovimento === 'saida' && novoEstoque < 0) {
      return { success: false, message: 'Estoque insuficiente para esta operação' };
    }

    // Registrar movimento no histórico
    const { error: movimentoError } = await supabase
      .from('produto_estoque')
      .insert([{
        empresa_id: empresaId,
        usuario_id: usuarioId,
        produto_id: produtoId,
        tipo_movimento: tipoMovimento,
        quantidade: quantidade,
        data_hora_movimento: new Date().toISOString(),
        observacao: observacao
      }]);

    if (movimentoError) {
      console.error('Erro ao registrar movimento de estoque:', movimentoError);
      return { success: false, message: 'Erro ao registrar movimento de estoque' };
    }

    // Atualizar estoque do produto
    const { error: updateError } = await supabase
      .from('produtos')
      .update({ estoque_atual: novoEstoque })
      .eq('id', produtoId)
      .eq('empresa_id', empresaId);

    if (updateError) {
      console.error('Erro ao atualizar estoque do produto:', updateError);
      return { success: false, message: 'Erro ao atualizar estoque do produto' };
    }

    return { success: true, message: 'Estoque atualizado com sucesso' };
  } catch (error: any) {
    console.error('Erro ao atualizar estoque:', error);
    return { success: false, message: `Erro ao atualizar estoque: ${error.message}` };
  }
};

/**
 * Verifica o tipo de controle de estoque configurado para a empresa
 * @param supabase Cliente Supabase
 * @param empresaId ID da empresa
 * @returns Tipo de controle de estoque ('pedidos', 'faturamento' ou 'pdv')
 */
export const verificarTipoControleEstoque = async (
  supabase: SupabaseClient,
  empresaId: string
): Promise<'pedidos' | 'faturamento' | 'pdv'> => {
  try {
    const { data, error } = await supabase
      .from('tipo_controle_estoque_config')
      .select('tipo_controle')
      .eq('empresa_id', empresaId)
      .single();

    if (error) {
      console.error('Erro ao verificar tipo de controle de estoque:', error);
      return 'pedidos'; // Valor padrão em caso de erro
    }

    return data?.tipo_controle as 'pedidos' | 'faturamento' | 'pdv' || 'pedidos';
  } catch (error) {
    console.error('Erro ao verificar tipo de controle de estoque:', error);
    return 'pedidos'; // Valor padrão em caso de erro
  }
};

/**
 * Atualiza o estoque com base nos itens de um pedido
 * @param supabase Cliente Supabase
 * @param pedidoId ID do pedido
 * @param empresaId ID da empresa
 * @param usuarioId ID do usuário
 * @param tipoMovimento Tipo de movimento ('entrada' ou 'saida')
 * @param origem Origem do movimento ('pedido' ou 'faturamento')
 * @returns Objeto com status da operação e mensagem
 */
export const atualizarEstoquePorPedido = async (
  supabase: SupabaseClient,
  pedidoId: string,
  empresaId: string,
  usuarioId: string,
  tipoMovimento: 'entrada' | 'saida',
  origem: 'pedido' | 'faturamento'
): Promise<{ success: boolean; message: string }> => {
  try {
    // Buscar itens do pedido
    const { data: itensPedido, error: itensError } = await supabase
      .from('pedidos_itens')
      .select(`
        id,
        produto_id,
        quantidade
      `)
      .eq('pedido_id', pedidoId);

    if (itensError) {
      console.error('Erro ao buscar itens do pedido:', itensError);
      return { success: false, message: 'Erro ao buscar itens do pedido' };
    }

    if (!itensPedido || itensPedido.length === 0) {
      return { success: false, message: 'Pedido não possui itens' };
    }

    // Verificar configuração de bloqueio de estoque
    const { data: configData, error: configError } = await supabase
      .from('tipo_controle_estoque_config')
      .select('bloqueia_sem_estoque')
      .eq('empresa_id', empresaId)
      .single();

    const bloqueiaEstoque = configData?.bloqueia_sem_estoque || false;

    // Atualizar estoque de cada item
    let erros = [];

    for (const item of itensPedido) {
      const observacao = origem === 'pedido' ? 'pedido' : 'faturamento';

      const resultado = await atualizarEstoqueProduto(
        supabase,
        empresaId,
        usuarioId,
        item.produto_id,
        item.quantidade,
        tipoMovimento,
        observacao
      );

      // Se a opção de bloqueio estiver ativada, retornar erro imediatamente
      if (!resultado.success && bloqueiaEstoque) {
        return resultado;
      }
      // Se a opção de bloqueio estiver desativada, apenas registrar o erro e continuar
      else if (!resultado.success) {
        erros.push(resultado.message);
        console.warn(`Aviso: ${resultado.message} para o produto ID ${item.produto_id}`);
      }
    }

    // Se houver erros mas a opção de bloqueio estiver desativada, retornar sucesso com aviso
    if (erros.length > 0) {
      return {
        success: true,
        message: `Estoque atualizado com avisos: ${erros.join(', ')}. Alguns produtos ficaram com estoque negativo.`
      };
    }

    return { success: true, message: 'Estoque atualizado com sucesso para todos os itens' };
  } catch (error: any) {
    console.error('Erro ao atualizar estoque por pedido:', error);
    return { success: false, message: `Erro ao atualizar estoque por pedido: ${error.message}` };
  }
};
