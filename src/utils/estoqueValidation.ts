import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Verifica e corrige inconsistências de estoque para todos os produtos de uma empresa
 * @param supabase Cliente Supabase
 * @param empresaId ID da empresa
 * @returns Objeto com status da operação e produtos corrigidos
 */
export const verificarECorrigirEstoque = async (
  supabase: SupabaseClient,
  empresaId: string
): Promise<{ success: boolean; message: string; produtosCorrigidos: number }> => {
  try {
    // Buscar produtos com inconsistências de estoque
    const { data: produtosInconsistentes, error: queryError } = await supabase
      .rpc('verificar_inconsistencias_estoque', { empresa_id_param: empresaId });

    if (queryError) {
      console.error('Erro ao verificar inconsistências:', queryError);
      return { success: false, message: 'Erro ao verificar inconsistências de estoque', produtosCorrigidos: 0 };
    }

    if (!produtosInconsistentes || produtosInconsistentes.length === 0) {
      return { success: true, message: 'Nenhuma inconsistência encontrada', produtosCorrigidos: 0 };
    }

    // Corrigir cada produto com inconsistência
    let produtosCorrigidos = 0;
    for (const produto of produtosInconsistentes) {
      const { error: correcaoError } = await supabase
        .rpc('recalcular_estoque_produto', { 
          produto_id_param: produto.id, 
          empresa_id_param: empresaId 
        });

      if (!correcaoError) {
        produtosCorrigidos++;
      } else {
        console.error(`Erro ao corrigir produto ${produto.nome}:`, correcaoError);
      }
    }

    return {
      success: true,
      message: `${produtosCorrigidos} produto(s) corrigido(s) com sucesso`,
      produtosCorrigidos
    };
  } catch (error: any) {
    console.error('Erro ao verificar e corrigir estoque:', error);
    return { 
      success: false, 
      message: `Erro ao verificar e corrigir estoque: ${error.message}`, 
      produtosCorrigidos: 0 
    };
  }
};

/**
 * Recalcula o estoque de um produto específico baseado no histórico de movimentações
 * @param supabase Cliente Supabase
 * @param empresaId ID da empresa
 * @param produtoId ID do produto
 * @returns Objeto com status da operação e novo estoque
 */
export const recalcularEstoqueProdutoUtil = async (
  supabase: SupabaseClient,
  empresaId: string,
  produtoId: string
): Promise<{ success: boolean; message: string; novoEstoque?: number }> => {
  try {
    const { data: novoEstoque, error } = await supabase
      .rpc('recalcular_estoque_produto', { 
        produto_id_param: produtoId, 
        empresa_id_param: empresaId 
      });

    if (error) {
      console.error('Erro ao recalcular estoque:', error);
      return { success: false, message: 'Erro ao recalcular estoque do produto' };
    }

    return {
      success: true,
      message: 'Estoque recalculado com sucesso',
      novoEstoque: parseFloat(novoEstoque || '0')
    };
  } catch (error: any) {
    console.error('Erro ao recalcular estoque:', error);
    return { 
      success: false, 
      message: `Erro ao recalcular estoque: ${error.message}` 
    };
  }
};

/**
 * Valida se o estoque atual de um produto está correto baseado no histórico
 * @param supabase Cliente Supabase
 * @param empresaId ID da empresa
 * @param produtoId ID do produto
 * @returns Objeto com status da validação e diferença encontrada
 */
export const validarEstoqueProduto = async (
  supabase: SupabaseClient,
  empresaId: string,
  produtoId: string
): Promise<{ 
  isValid: boolean; 
  estoqueAtual: number; 
  estoqueCalculado: number; 
  diferenca: number 
}> => {
  try {
    // Buscar estoque atual do produto
    const { data: produtoData, error: produtoError } = await supabase
      .from('produtos')
      .select('estoque_atual')
      .eq('id', produtoId)
      .eq('empresa_id', empresaId)
      .single();

    if (produtoError) {
      throw produtoError;
    }

    const estoqueAtual = parseFloat(produtoData.estoque_atual || '0');

    // Calcular estoque baseado nas movimentações
    const { data: movimentosData, error: movimentosError } = await supabase
      .from('produto_estoque')
      .select('tipo_movimento, quantidade')
      .eq('produto_id', produtoId)
      .eq('empresa_id', empresaId);

    if (movimentosError) {
      throw movimentosError;
    }

    let estoqueCalculado = 0;
    if (movimentosData) {
      movimentosData.forEach(movimento => {
        if (movimento.tipo_movimento === 'entrada') {
          estoqueCalculado += parseFloat(movimento.quantidade);
        } else {
          estoqueCalculado -= parseFloat(movimento.quantidade);
        }
      });
    }

    const diferenca = estoqueAtual - estoqueCalculado;
    const isValid = Math.abs(diferenca) < 0.01; // Tolerância para diferenças de arredondamento

    return {
      isValid,
      estoqueAtual,
      estoqueCalculado,
      diferenca
    };
  } catch (error: any) {
    console.error('Erro ao validar estoque:', error);
    return {
      isValid: false,
      estoqueAtual: 0,
      estoqueCalculado: 0,
      diferenca: 0
    };
  }
};
