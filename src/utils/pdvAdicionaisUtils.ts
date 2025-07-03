import { supabase } from '../lib/supabase';
import { ItemSelecionado } from '../types';

/**
 * Salva os adicionais de um item na tabela pdv_itens_adicionais
 * 
 * @param pdvItemId - ID do item na tabela pdv_itens
 * @param adicionais - Array de adicionais selecionados
 * @param empresaId - ID da empresa
 * @param usuarioId - ID do usuário
 * @returns Promise<boolean> - true se salvou com sucesso, false caso contrário
 */
export async function salvarAdicionaisItem(
  pdvItemId: string,
  adicionais: ItemSelecionado[],
  empresaId: string,
  usuarioId: string
): Promise<boolean> {
  try {
    if (!adicionais || adicionais.length === 0) {
      return true; // Não há adicionais para salvar
    }

    // Mapear os adicionais para o formato da tabela
    const adicionaisData = adicionais.map(adicional => ({
      empresa_id: empresaId,
      usuario_id: usuarioId,
      pdv_item_id: pdvItemId,
      item_adicional_id: adicional.item.id,
      nome_adicional: adicional.item.nome,
      quantidade: adicional.quantidade,
      valor_unitario: adicional.item.preco,
      valor_total: adicional.item.preco * adicional.quantidade,
      origem_adicional: 'manual'
    }));

    // Inserir os adicionais na tabela
    const { error } = await supabase
      .from('pdv_itens_adicionais')
      .insert(adicionaisData);

    if (error) {
      console.error('Erro ao salvar adicionais:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao salvar adicionais:', error);
    return false;
  }
}

/**
 * Busca os adicionais de um item PDV
 * 
 * @param pdvItemId - ID do item na tabela pdv_itens
 * @returns Promise<ItemSelecionado[]> - Array de adicionais do item
 */
export async function buscarAdicionaisItem(pdvItemId: string): Promise<ItemSelecionado[]> {
  try {
    const { data, error } = await supabase
      .from('pdv_itens_adicionais')
      .select(`
        id,
        quantidade,
        valor_unitario,
        valor_total,
        nome_adicional,
        item_adicional_id,
        opcoes_adicionais_itens!inner(
          id,
          nome,
          preco,
          opcao_id
        )
      `)
      .eq('pdv_item_id', pdvItemId)
      .eq('deletado', false);

    if (error) {
      console.error('Erro ao buscar adicionais:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Mapear os dados para o formato ItemSelecionado
    return data.map(adicional => ({
      item: {
        id: adicional.opcoes_adicionais_itens.id,
        nome: adicional.opcoes_adicionais_itens.nome,
        preco: adicional.opcoes_adicionais_itens.preco,
        opcao_id: adicional.opcoes_adicionais_itens.opcao_id
      },
      quantidade: adicional.quantidade
    }));
  } catch (error) {
    console.error('Erro ao buscar adicionais:', error);
    return [];
  }
}

/**
 * Remove todos os adicionais de um item PDV (soft delete)
 * 
 * @param pdvItemId - ID do item na tabela pdv_itens
 * @param usuarioId - ID do usuário que está removendo
 * @returns Promise<boolean> - true se removeu com sucesso, false caso contrário
 */
export async function removerAdicionaisItem(
  pdvItemId: string,
  usuarioId: string
): Promise<boolean> {
  try {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('pdv_itens_adicionais')
      .update({
        deletado: true,
        deletado_em: now,
        deletado_por: usuarioId
      })
      .eq('pdv_item_id', pdvItemId)
      .eq('deletado', false);

    if (error) {
      console.error('Erro ao remover adicionais:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao remover adicionais:', error);
    return false;
  }
}

/**
 * Atualiza os adicionais de um item PDV
 * Remove os antigos e adiciona os novos
 * 
 * @param pdvItemId - ID do item na tabela pdv_itens
 * @param novosAdicionais - Array de novos adicionais selecionados
 * @param empresaId - ID da empresa
 * @param usuarioId - ID do usuário
 * @returns Promise<boolean> - true se atualizou com sucesso, false caso contrário
 */
export async function atualizarAdicionaisItem(
  pdvItemId: string,
  novosAdicionais: ItemSelecionado[],
  empresaId: string,
  usuarioId: string
): Promise<boolean> {
  try {
    // Primeiro, remove os adicionais existentes
    const removeuAntigos = await removerAdicionaisItem(pdvItemId, usuarioId);
    if (!removeuAntigos) {
      return false;
    }

    // Depois, salva os novos adicionais
    const salvouNovos = await salvarAdicionaisItem(pdvItemId, novosAdicionais, empresaId, usuarioId);
    return salvouNovos;
  } catch (error) {
    console.error('Erro ao atualizar adicionais:', error);
    return false;
  }
}
