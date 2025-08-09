/**
 * ✅ UTILITÁRIOS PARA ITENS CANCELADOS DO PDV
 * 
 * Este arquivo contém funções para gerenciar itens cancelados (soft delete)
 * no PDV, incluindo integração com a seção "Itens Cancelados" do caixa.
 */

import { supabase } from '../lib/supabase';

// ========================================
// INTERFACES
// ========================================

interface ItemCancelado {
  id: string;
  nome_produto: string;
  quantidade: number;
  valor_unitario: number;
  valor_total_real_deletado: number;
  valor_adicionais_deletado: number;
  quantidade_adicionais_deletado: number;
  deletado_em: string;
  snapshot_item_deletado?: any;
  pdv?: {
    id: string;
    numero_venda: string;
    nome_cliente?: string;
    caixa_id: string;
  };
  usuarios?: {
    nome: string;
  };
}

interface ResumoItensCancelados {
  total_itens: number;
  valor_total_perdido: number;
  valor_adicionais_perdido: number;
  itens: ItemCancelado[];
}

// ========================================
// FUNÇÃO: BUSCAR ITENS CANCELADOS DO CAIXA
// ========================================

/**
 * Busca todos os itens cancelados (soft delete) de um caixa específico
 * 
 * @param caixaId - ID do caixa
 * @returns Promise<ItemCancelado[]> - Lista de itens cancelados
 */
export async function buscarItensCanceladosCaixa(caixaId: string): Promise<ItemCancelado[]> {
  try {
    console.log(`🔍 Buscando itens cancelados do caixa: ${caixaId}`);
    
    const { data: itens, error } = await supabase
      .from('pdv_itens')
      .select(`
        id,
        nome_produto,
        quantidade,
        valor_unitario,
        valor_total_real_deletado,
        valor_adicionais_deletado,
        quantidade_adicionais_deletado,
        deletado_em,
        snapshot_item_deletado,
        pdv:pdv_id (
          id,
          numero_venda,
          nome_cliente,
          caixa_id
        ),
        usuarios:deletado_por (
          nome
        )
      `)
      .eq('pdv.caixa_id', caixaId)
      .eq('deletado', true)
      .not('valor_total_real_deletado', 'is', null)
      .order('deletado_em', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar itens cancelados:', error);
      return [];
    }

    console.log(`✅ Encontrados ${(itens || []).length} itens cancelados`);
    return itens || [];

  } catch (error) {
    console.error('❌ Erro ao buscar itens cancelados:', error);
    return [];
  }
}

// ========================================
// FUNÇÃO: BUSCAR ITENS CANCELADOS DE UMA VENDA
// ========================================

/**
 * Busca itens cancelados de uma venda específica
 * 
 * @param pdvId - ID da venda (tabela pdv)
 * @returns Promise<ItemCancelado[]> - Lista de itens cancelados da venda
 */
export async function buscarItensCanceladosVenda(pdvId: string): Promise<ItemCancelado[]> {
  try {
    console.log(`🔍 Buscando itens cancelados da venda: ${pdvId}`);
    
    const { data: itens, error } = await supabase
      .from('pdv_itens')
      .select(`
        id,
        nome_produto,
        quantidade,
        valor_unitario,
        valor_total_real_deletado,
        valor_adicionais_deletado,
        quantidade_adicionais_deletado,
        deletado_em,
        snapshot_item_deletado,
        usuarios:deletado_por (
          nome
        )
      `)
      .eq('pdv_id', pdvId)
      .eq('deletado', true)
      .not('valor_total_real_deletado', 'is', null)
      .order('deletado_em', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar itens cancelados da venda:', error);
      return [];
    }

    console.log(`✅ Encontrados ${(itens || []).length} itens cancelados na venda`);
    return itens || [];

  } catch (error) {
    console.error('❌ Erro ao buscar itens cancelados da venda:', error);
    return [];
  }
}

// ========================================
// FUNÇÃO: CALCULAR RESUMO DE ITENS CANCELADOS
// ========================================

/**
 * Calcula resumo dos itens cancelados (totais, valores, etc.)
 * 
 * @param itens - Lista de itens cancelados
 * @returns ResumoItensCancelados - Resumo com totais
 */
export function calcularResumoItensCancelados(itens: ItemCancelado[]): ResumoItensCancelados {
  const valorTotalPerdido = itens.reduce((total, item) => 
    total + (item.valor_total_real_deletado || 0), 0
  );
  
  const valorAdicionaisPerdido = itens.reduce((total, item) => 
    total + (item.valor_adicionais_deletado || 0), 0
  );
  
  return {
    total_itens: itens.length,
    valor_total_perdido: valorTotalPerdido,
    valor_adicionais_perdido: valorAdicionaisPerdido,
    itens: itens
  };
}

// ========================================
// FUNÇÃO: GERAR RELATÓRIO DE ITENS CANCELADOS
// ========================================

/**
 * Gera relatório detalhado de itens cancelados por período
 * 
 * @param empresaId - ID da empresa
 * @param dataInicio - Data de início (opcional)
 * @param dataFim - Data de fim (opcional)
 * @param caixaId - ID do caixa específico (opcional)
 * @returns Promise<ResumoItensCancelados> - Relatório completo
 */
export async function gerarRelatorioItensCancelados(
  empresaId: string,
  dataInicio?: string,
  dataFim?: string,
  caixaId?: string
): Promise<ResumoItensCancelados> {
  try {
    console.log('📊 Gerando relatório de itens cancelados...');
    
    let query = supabase
      .from('pdv_itens')
      .select(`
        id,
        nome_produto,
        quantidade,
        valor_unitario,
        valor_total_real_deletado,
        valor_adicionais_deletado,
        quantidade_adicionais_deletado,
        deletado_em,
        snapshot_item_deletado,
        pdv:pdv_id (
          id,
          numero_venda,
          nome_cliente,
          caixa_id,
          empresa_id
        ),
        usuarios:deletado_por (
          nome
        )
      `)
      .eq('pdv.empresa_id', empresaId)
      .eq('deletado', true)
      .not('valor_total_real_deletado', 'is', null);

    // Filtro por caixa específico
    if (caixaId) {
      query = query.eq('pdv.caixa_id', caixaId);
    }

    // Filtro por data de início
    if (dataInicio) {
      query = query.gte('deletado_em', dataInicio);
    }

    // Filtro por data de fim
    if (dataFim) {
      query = query.lte('deletado_em', dataFim);
    }

    query = query.order('deletado_em', { ascending: false });

    const { data: itens, error } = await query;

    if (error) {
      console.error('❌ Erro ao gerar relatório:', error);
      return { total_itens: 0, valor_total_perdido: 0, valor_adicionais_perdido: 0, itens: [] };
    }

    const resumo = calcularResumoItensCancelados(itens || []);
    
    console.log(`✅ Relatório gerado: ${resumo.total_itens} itens, R$ ${resumo.valor_total_perdido.toFixed(2)} perdidos`);
    
    return resumo;

  } catch (error) {
    console.error('❌ Erro ao gerar relatório:', error);
    return { total_itens: 0, valor_total_perdido: 0, valor_adicionais_perdido: 0, itens: [] };
  }
}

// ========================================
// FUNÇÃO: FORMATAR ITEM CANCELADO PARA EXIBIÇÃO
// ========================================

/**
 * Formata um item cancelado para exibição na interface
 * 
 * @param item - Item cancelado
 * @returns string - Descrição formatada do item
 */
export function formatarItemCancelado(item: ItemCancelado): string {
  let descricao = `${item.nome_produto} (Qtd: ${item.quantidade})`;
  
  if (item.quantidade_adicionais_deletado > 0) {
    descricao += ` + ${item.quantidade_adicionais_deletado} adicionais`;
  }
  
  descricao += ` - R$ ${item.valor_total_real_deletado.toFixed(2)}`;
  
  if (item.pdv?.numero_venda) {
    descricao += ` [Venda #${item.pdv.numero_venda}]`;
  }
  
  return descricao;
}

// ========================================
// FUNÇÃO: VERIFICAR SE ITEM PODE SER RESTAURADO
// ========================================

/**
 * Verifica se um item cancelado pode ser restaurado
 * (venda ainda está em andamento)
 * 
 * @param itemId - ID do item cancelado
 * @returns Promise<boolean> - true se pode ser restaurado
 */
export async function podeRestaurarItem(itemId: string): Promise<boolean> {
  try {
    const { data: item, error } = await supabase
      .from('pdv_itens')
      .select(`
        pdv:pdv_id (
          status_venda
        )
      `)
      .eq('id', itemId)
      .eq('deletado', true)
      .single();

    if (error || !item) {
      return false;
    }

    // Só pode restaurar se a venda ainda estiver em andamento
    return item.pdv?.status_venda === 'salva' || item.pdv?.status_venda === 'aberta';

  } catch (error) {
    console.error('❌ Erro ao verificar se item pode ser restaurado:', error);
    return false;
  }
}

// ========================================
// EXPORTAÇÕES
// ========================================

export type { ItemCancelado, ResumoItensCancelados };
