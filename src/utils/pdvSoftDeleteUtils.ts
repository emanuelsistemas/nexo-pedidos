/**
 * ✅ UTILITÁRIOS PARA SOFT DELETE INTELIGENTE DE ITENS PDV
 * 
 * Este arquivo contém funções para fazer soft delete de itens do PDV
 * capturando TODOS os valores e componentes no momento da deleção.
 */

import { supabase } from '../lib/supabase';

// ========================================
// INTERFACES
// ========================================

interface ItemSnapshot {
  // Dados do item principal
  item: {
    id: string;
    produto_id: string;
    codigo_produto: string;
    nome_produto: string;
    quantidade: number;
    valor_unitario: number;
    valor_total_item: number;
    tem_desconto: boolean;
    tipo_desconto?: string;
    percentual_desconto?: number;
    valor_desconto_aplicado?: number;
    vendedor_id?: string;
    vendedor_nome?: string;
    observacao_item?: string;
  };
  
  // Adicionais do item
  adicionais: Array<{
    id: string;
    nome_adicional: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
  }>;
  
  // Insumos do item
  insumos: Array<{
    id: string;
    nome_insumo: string;
    quantidade: number;
    unidade_medida: string;
    custo_unitario: number;
    custo_total: number;
  }>;
  
  // Valores calculados
  valores: {
    valor_produto: number;
    valor_adicionais: number;
    valor_insumos: number;
    valor_total_real: number;
    quantidade_adicionais: number;
    quantidade_insumos: number;
  };
  
  // Metadados da deleção
  delecao: {
    deletado_em: string;
    deletado_por: string;
    motivo?: string;
  };
}

// ========================================
// FUNÇÃO PRINCIPAL: SOFT DELETE INTELIGENTE
// ========================================

/**
 * Faz soft delete de um item do PDV capturando todos os valores e componentes
 * 
 * @param pdvItemId - ID do item na tabela pdv_itens
 * @param usuarioId - ID do usuário que está deletando
 * @param motivo - Motivo da deleção (opcional)
 * @returns Promise<boolean> - true se deletou com sucesso, false caso contrário
 */
export async function softDeleteItemPDV(
  pdvItemId: string,
  usuarioId: string,
  motivo?: string
): Promise<boolean> {
  try {
    console.log(`🗑️ Iniciando soft delete do item PDV: ${pdvItemId}`);
    
    // 1. Buscar dados completos do item
    const snapshot = await criarSnapshotItem(pdvItemId, usuarioId, motivo);
    if (!snapshot) {
      console.error('❌ Erro ao criar snapshot do item');
      return false;
    }
    
    // 2. Fazer soft delete dos adicionais
    if (snapshot.adicionais.length > 0) {
      const { error: adicionaisError } = await supabase
        .from('pdv_itens_adicionais')
        .update({
          deletado: true,
          deletado_em: snapshot.delecao.deletado_em,
          deletado_por: usuarioId
        })
        .eq('pdv_item_id', pdvItemId)
        .eq('deletado', false);
      
      if (adicionaisError) {
        console.error('❌ Erro ao deletar adicionais:', adicionaisError);
        return false;
      }
    }
    
    // 3. Fazer soft delete dos insumos
    if (snapshot.insumos.length > 0) {
      const { error: insumosError } = await supabase
        .from('pdv_itens_insumos')
        .update({
          deletado: true,
          deletado_em: snapshot.delecao.deletado_em,
          deletado_por: usuarioId
        })
        .eq('pdv_item_id', pdvItemId)
        .eq('deletado', false);
      
      if (insumosError) {
        console.error('❌ Erro ao deletar insumos:', insumosError);
        return false;
      }
    }
    
    // 4. Fazer soft delete do item principal com snapshot completo
    const { error: itemError } = await supabase
      .from('pdv_itens')
      .update({
        deletado: true,
        deletado_em: snapshot.delecao.deletado_em,
        deletado_por: usuarioId,
        valor_total_real_deletado: snapshot.valores.valor_total_real,
        valor_adicionais_deletado: snapshot.valores.valor_adicionais,
        quantidade_adicionais_deletado: snapshot.valores.quantidade_adicionais,
        valor_insumos_deletado: snapshot.valores.valor_insumos,
        quantidade_insumos_deletado: snapshot.valores.quantidade_insumos,
        snapshot_item_deletado: snapshot
      })
      .eq('id', pdvItemId)
      .eq('deletado', false);
    
    if (itemError) {
      console.error('❌ Erro ao deletar item principal:', itemError);
      return false;
    }
    
    console.log(`✅ Soft delete concluído com sucesso para item: ${pdvItemId}`);
    console.log(`💰 Valor total capturado: R$ ${snapshot.valores.valor_total_real.toFixed(2)}`);
    console.log(`🍕 Adicionais: ${snapshot.valores.quantidade_adicionais} (R$ ${snapshot.valores.valor_adicionais.toFixed(2)})`);
    console.log(`🥘 Insumos: ${snapshot.valores.quantidade_insumos} (R$ ${snapshot.valores.valor_insumos.toFixed(2)})`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro no soft delete do item PDV:', error);
    return false;
  }
}

// ========================================
// FUNÇÃO AUXILIAR: CRIAR SNAPSHOT
// ========================================

/**
 * Cria um snapshot completo do item antes da deleção
 */
async function criarSnapshotItem(
  pdvItemId: string,
  usuarioId: string,
  motivo?: string
): Promise<ItemSnapshot | null> {
  try {
    const agora = new Date().toISOString();
    
    // 1. Buscar dados do item principal
    const { data: item, error: itemError } = await supabase
      .from('pdv_itens')
      .select('*')
      .eq('id', pdvItemId)
      .eq('deletado', false)
      .single();
    
    if (itemError || !item) {
      console.error('❌ Item não encontrado:', itemError);
      return null;
    }
    
    // 2. Buscar adicionais ativos
    const { data: adicionais, error: adicionaisError } = await supabase
      .from('pdv_itens_adicionais')
      .select('id, nome_adicional, quantidade, valor_unitario, valor_total')
      .eq('pdv_item_id', pdvItemId)
      .eq('deletado', false);
    
    if (adicionaisError) {
      console.error('❌ Erro ao buscar adicionais:', adicionaisError);
      return null;
    }
    
    // 3. Buscar insumos ativos
    const { data: insumos, error: insumosError } = await supabase
      .from('pdv_itens_insumos')
      .select('id, nome_insumo, quantidade, unidade_medida, custo_unitario, custo_total')
      .eq('pdv_item_id', pdvItemId)
      .eq('deletado', false);
    
    if (insumosError) {
      console.error('❌ Erro ao buscar insumos:', insumosError);
      return null;
    }
    
    // 4. Calcular valores
    const valorProduto = item.valor_total_item || 0;
    const valorAdicionais = (adicionais || []).reduce((total, add) => total + (add.valor_total || 0), 0);
    const valorInsumos = (insumos || []).reduce((total, ins) => total + (ins.custo_total || 0), 0);
    const valorTotalReal = valorProduto + valorAdicionais;
    
    // 5. Criar snapshot
    const snapshot: ItemSnapshot = {
      item: {
        id: item.id,
        produto_id: item.produto_id,
        codigo_produto: item.codigo_produto,
        nome_produto: item.nome_produto,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        valor_total_item: item.valor_total_item,
        tem_desconto: item.tem_desconto,
        tipo_desconto: item.tipo_desconto,
        percentual_desconto: item.percentual_desconto,
        valor_desconto_aplicado: item.valor_desconto_aplicado,
        vendedor_id: item.vendedor_id,
        vendedor_nome: item.vendedor_nome,
        observacao_item: item.observacao_item
      },
      adicionais: adicionais || [],
      insumos: insumos || [],
      valores: {
        valor_produto: valorProduto,
        valor_adicionais: valorAdicionais,
        valor_insumos: valorInsumos,
        valor_total_real: valorTotalReal,
        quantidade_adicionais: (adicionais || []).length,
        quantidade_insumos: (insumos || []).length
      },
      delecao: {
        deletado_em: agora,
        deletado_por: usuarioId,
        motivo: motivo
      }
    };
    
    return snapshot;
    
  } catch (error) {
    console.error('❌ Erro ao criar snapshot:', error);
    return null;
  }
}

// ========================================
// FUNÇÃO: BUSCAR ITENS DELETADOS
// ========================================

/**
 * Busca itens deletados de uma venda com todos os detalhes
 */
export async function buscarItensDeletados(pdvId: string): Promise<ItemSnapshot[]> {
  try {
    const { data: itens, error } = await supabase
      .from('pdv_itens')
      .select('snapshot_item_deletado')
      .eq('pdv_id', pdvId)
      .eq('deletado', true)
      .not('snapshot_item_deletado', 'is', null);
    
    if (error) {
      console.error('❌ Erro ao buscar itens deletados:', error);
      return [];
    }
    
    return (itens || []).map(item => item.snapshot_item_deletado as ItemSnapshot);
    
  } catch (error) {
    console.error('❌ Erro ao buscar itens deletados:', error);
    return [];
  }
}

// ========================================
// FUNÇÃO: RELATÓRIO DE ITENS DELETADOS
// ========================================

/**
 * Gera relatório de itens deletados com valores
 */
export async function gerarRelatorioItensDeletados(
  empresaId: string,
  dataInicio?: string,
  dataFim?: string
): Promise<{
  total_itens: number;
  valor_total_perdido: number;
  valor_adicionais_perdido: number;
  itens: ItemSnapshot[];
}> {
  try {
    let query = supabase
      .from('pdv_itens')
      .select('snapshot_item_deletado, deletado_em')
      .eq('empresa_id', empresaId)
      .eq('deletado', true)
      .not('snapshot_item_deletado', 'is', null);
    
    if (dataInicio) {
      query = query.gte('deletado_em', dataInicio);
    }
    
    if (dataFim) {
      query = query.lte('deletado_em', dataFim);
    }
    
    const { data: itens, error } = await query;
    
    if (error) {
      console.error('❌ Erro ao gerar relatório:', error);
      return { total_itens: 0, valor_total_perdido: 0, valor_adicionais_perdido: 0, itens: [] };
    }
    
    const snapshots = (itens || []).map(item => item.snapshot_item_deletado as ItemSnapshot);
    
    const valorTotalPerdido = snapshots.reduce((total, snap) => total + snap.valores.valor_total_real, 0);
    const valorAdicionaisPerdido = snapshots.reduce((total, snap) => total + snap.valores.valor_adicionais, 0);
    
    return {
      total_itens: snapshots.length,
      valor_total_perdido: valorTotalPerdido,
      valor_adicionais_perdido: valorAdicionaisPerdido,
      itens: snapshots
    };
    
  } catch (error) {
    console.error('❌ Erro ao gerar relatório:', error);
    return { total_itens: 0, valor_total_perdido: 0, valor_adicionais_perdido: 0, itens: [] };
  }
}

export type { ItemSnapshot };
