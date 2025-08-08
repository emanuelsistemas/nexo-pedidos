import { supabase } from '../lib/supabase';

/**
 * Interface para insumo selecionado (similar ao SeletorInsumosModal)
 */
interface InsumoSelecionado {
  insumo: {
    produto_id: string;
    nome: string;
    quantidade: number;
    unidade_medida: string;
    quantidade_minima?: number;
    quantidade_maxima?: number;
  };
  quantidade: number;
}

/**
 * Salva os insumos selecionados de um item na tabela pdv_itens_insumos
 * 
 * @param pdvItemId - ID do item na tabela pdv_itens
 * @param insumosSelecionados - Array de insumos selecionados
 * @param empresaId - ID da empresa
 * @param usuarioId - ID do usuário
 * @returns Promise<boolean> - true se salvou com sucesso, false caso contrário
 */
export async function salvarInsumosItem(
  pdvItemId: string,
  insumosSelecionados: InsumoSelecionado[],
  empresaId: string,
  usuarioId: string
): Promise<boolean> {
  try {
    if (!insumosSelecionados || insumosSelecionados.length === 0) {
      return true; // Não há insumos para salvar
    }

    // Mapear os insumos para o formato da tabela
    const insumosData = insumosSelecionados.map(insumoSelecionado => ({
      empresa_id: empresaId,
      usuario_id: usuarioId,
      pdv_item_id: pdvItemId,
      insumo_produto_id: insumoSelecionado.insumo.produto_id,
      nome_insumo: insumoSelecionado.insumo.nome,
      quantidade: insumoSelecionado.quantidade,
      unidade_medida: insumoSelecionado.insumo.unidade_medida,
      custo_unitario: 0, // Por enquanto 0, pode ser implementado depois
      custo_total: 0, // Por enquanto 0, pode ser implementado depois
      origem_insumo: 'manual'
    }));

    // Inserir os insumos na tabela
    const { error } = await supabase
      .from('pdv_itens_insumos')
      .insert(insumosData);

    if (error) {
      console.error('❌ Erro ao salvar insumos:', error);
      return false;
    }

    console.log('✅ Insumos salvos com sucesso:', insumosData.length, 'insumos');
    return true;
  } catch (error) {
    console.error('❌ Erro ao salvar insumos:', error);
    return false;
  }
}

/**
 * Salva todos os insumos de um produto (quando flag selecionar_insumos_venda está desativada)
 * 
 * @param pdvItemId - ID do item na tabela pdv_itens
 * @param produto - Produto com seus insumos
 * @param quantidadeItem - Quantidade do item vendido (para calcular quantidade proporcional)
 * @param empresaId - ID da empresa
 * @param usuarioId - ID do usuário
 * @returns Promise<boolean> - true se salvou com sucesso, false caso contrário
 */
export async function salvarTodosInsumosItem(
  pdvItemId: string,
  produto: any,
  quantidadeItem: number,
  empresaId: string,
  usuarioId: string
): Promise<boolean> {
  try {
    if (!produto.insumos || produto.insumos.length === 0) {
      return true; // Não há insumos para salvar
    }

    // Mapear todos os insumos do produto para o formato da tabela
    const insumosData = produto.insumos.map((insumo: any) => ({
      empresa_id: empresaId,
      usuario_id: usuarioId,
      pdv_item_id: pdvItemId,
      insumo_produto_id: insumo.produto_id,
      nome_insumo: insumo.nome,
      quantidade: insumo.quantidade * quantidadeItem, // Quantidade proporcional
      unidade_medida: insumo.unidade_medida,
      custo_unitario: 0, // Por enquanto 0, pode ser implementado depois
      custo_total: 0, // Por enquanto 0, pode ser implementado depois
      origem_insumo: 'manual'
    }));

    // Inserir os insumos na tabela
    const { error } = await supabase
      .from('pdv_itens_insumos')
      .insert(insumosData);

    if (error) {
      console.error('❌ Erro ao salvar todos os insumos:', error);
      return false;
    }

    console.log('✅ Todos os insumos salvos com sucesso:', insumosData.length, 'insumos');
    return true;
  } catch (error) {
    console.error('❌ Erro ao salvar todos os insumos:', error);
    return false;
  }
}

/**
 * Busca os insumos de um item PDV
 * 
 * @param pdvItemId - ID do item na tabela pdv_itens
 * @returns Promise<InsumoSelecionado[]> - Array de insumos do item
 */
export async function buscarInsumosItem(pdvItemId: string): Promise<InsumoSelecionado[]> {
  try {
    const { data, error } = await supabase
      .from('pdv_itens_insumos')
      .select(`
        *,
        produto:produtos!insumo_produto_id(
          id,
          nome,
          codigo,
          preco_custo
        )
      `)
      .eq('pdv_item_id', pdvItemId)
      .eq('deletado', false)
      .order('nome_insumo');

    if (error) {
      console.error('❌ Erro ao buscar insumos:', error);
      return [];
    }

    // Mapear para o formato esperado
    return (data || []).map(item => ({
      insumo: {
        produto_id: item.insumo_produto_id,
        nome: item.nome_insumo,
        quantidade: item.quantidade,
        unidade_medida: item.unidade_medida
      },
      quantidade: item.quantidade
    }));
  } catch (error) {
    console.error('❌ Erro ao buscar insumos:', error);
    return [];
  }
}

/**
 * Remove os insumos de um item (soft delete)
 * 
 * @param pdvItemId - ID do item na tabela pdv_itens
 * @param usuarioId - ID do usuário que está removendo
 * @returns Promise<boolean> - true se removeu com sucesso, false caso contrário
 */
export async function removerInsumosItem(
  pdvItemId: string,
  usuarioId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('pdv_itens_insumos')
      .update({
        deletado: true,
        deletado_em: new Date().toISOString(),
        deletado_por: usuarioId
      })
      .eq('pdv_item_id', pdvItemId)
      .eq('deletado', false);

    if (error) {
      console.error('❌ Erro ao remover insumos:', error);
      return false;
    }

    console.log('✅ Insumos removidos com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao remover insumos:', error);
    return false;
  }
}

/**
 * Atualiza os insumos de um item (remove os antigos e insere os novos)
 * 
 * @param pdvItemId - ID do item na tabela pdv_itens
 * @param insumosSelecionados - Array de insumos selecionados
 * @param empresaId - ID da empresa
 * @param usuarioId - ID do usuário
 * @returns Promise<boolean> - true se atualizou com sucesso, false caso contrário
 */
export async function atualizarInsumosItem(
  pdvItemId: string,
  insumosSelecionados: InsumoSelecionado[],
  empresaId: string,
  usuarioId: string
): Promise<boolean> {
  try {
    // Primeiro, remover os insumos existentes (soft delete)
    const removeuAntigos = await removerInsumosItem(pdvItemId, usuarioId);
    if (!removeuAntigos) {
      return false;
    }

    // Depois, salvar os novos insumos
    const salvouNovos = await salvarInsumosItem(pdvItemId, insumosSelecionados, empresaId, usuarioId);
    return salvouNovos;
  } catch (error) {
    console.error('❌ Erro ao atualizar insumos:', error);
    return false;
  }
}
