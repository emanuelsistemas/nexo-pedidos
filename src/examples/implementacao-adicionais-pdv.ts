/**
 * EXEMPLO DE IMPLEMENTAÇÃO: Como salvar adicionais no PDV
 * 
 * Este arquivo mostra como implementar o salvamento dos adicionais
 * na função de salvar venda do PDV.
 */

import { supabase } from '../lib/supabase';
import { ItemSelecionado } from '../types';
import { salvarAdicionaisItem } from '../utils/pdvAdicionaisUtils';

// ========================================
// 1. ESTRUTURA DO ITEM DO CARRINHO
// ========================================

interface ItemCarrinho {
  produto: {
    id: string;
    nome: string;
    preco: number;
    codigo: string;
    // ... outros campos do produto
  };
  quantidade: number;
  subtotal: number;
  // ✅ ADICIONAR CAMPO PARA ADICIONAIS
  adicionais?: ItemSelecionado[]; // Array de adicionais selecionados
  // ... outros campos do item
}

// ========================================
// 2. FUNÇÃO DE ADICIONAR PRODUTO AO CARRINHO
// ========================================

/**
 * Exemplo de como adicionar um produto com adicionais ao carrinho
 */
const adicionarProdutoComAdicionais = (
  produto: any,
  quantidade: number,
  adicionaisSelecionados: ItemSelecionado[]
) => {
  const novoItem: ItemCarrinho = {
    produto,
    quantidade,
    subtotal: produto.preco * quantidade,
    adicionais: adicionaisSelecionados // ✅ Salvar os adicionais no item
  };

  // Adicionar ao carrinho
  setItensCarrinho(prev => [...prev, novoItem]);
};

// ========================================
// 3. FUNÇÃO DE SALVAR VENDA (EXEMPLO)
// ========================================

/**
 * Exemplo de como implementar o salvamento da venda com adicionais
 */
const salvarVenda = async (itensCarrinho: ItemCarrinho[]) => {
  try {
    // Obter dados do usuário
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Usuário não autenticado');

    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', userData.user.id)
      .single();

    if (!usuarioData?.empresa_id) throw new Error('Empresa não encontrada');

    // 1. Salvar a venda principal na tabela PDV
    const { data: vendaSalva, error: vendaError } = await supabase
      .from('pdv')
      .insert({
        empresa_id: usuarioData.empresa_id,
        usuario_id: userData.user.id,
        numero_venda: `PDV-${Date.now()}`,
        data_venda: new Date().toISOString(),
        status_venda: 'finalizada',
        valor_total: calcularTotalVenda(itensCarrinho),
        // ... outros campos da venda
      })
      .select()
      .single();

    if (vendaError) throw vendaError;

    // 2. Salvar os itens da venda
    for (const item of itensCarrinho) {
      // 2.1. Salvar o item principal na tabela pdv_itens
      const { data: itemSalvo, error: itemError } = await supabase
        .from('pdv_itens')
        .insert({
          empresa_id: usuarioData.empresa_id,
          usuario_id: userData.user.id,
          pdv_id: vendaSalva.id,
          produto_id: item.produto.id,
          codigo_produto: item.produto.codigo,
          nome_produto: item.produto.nome,
          quantidade: item.quantidade,
          valor_unitario: item.produto.preco,
          valor_total_item: item.subtotal,
          // ... outros campos do item
        })
        .select()
        .single();

      if (itemError) throw itemError;

      // 2.2. ✅ SALVAR OS ADICIONAIS DO ITEM
      if (item.adicionais && item.adicionais.length > 0) {
        const sucessoAdicionais = await salvarAdicionaisItem(
          itemSalvo.id, // ID do item recém-criado
          item.adicionais, // Adicionais selecionados
          usuarioData.empresa_id,
          userData.user.id
        );

        if (!sucessoAdicionais) {
          console.error('Erro ao salvar adicionais do item:', item.produto.nome);
          // Decidir se deve continuar ou falhar a operação
        }
      }
    }

    console.log('Venda salva com sucesso, incluindo adicionais!');
    return vendaSalva;

  } catch (error) {
    console.error('Erro ao salvar venda:', error);
    throw error;
  }
};

// ========================================
// 4. FUNÇÃO DE RECUPERAR VENDA SALVA
// ========================================

/**
 * Exemplo de como recuperar uma venda salva com seus adicionais
 */
const recuperarVendaSalva = async (pdvId: string) => {
  try {
    // 1. Buscar a venda principal
    const { data: venda, error: vendaError } = await supabase
      .from('pdv')
      .select('*')
      .eq('id', pdvId)
      .single();

    if (vendaError) throw vendaError;

    // 2. Buscar os itens da venda
    const { data: itens, error: itensError } = await supabase
      .from('pdv_itens')
      .select('*')
      .eq('pdv_id', pdvId);

    if (itensError) throw itensError;

    // 3. ✅ BUSCAR OS ADICIONAIS DE CADA ITEM
    const itensComAdicionais = await Promise.all(
      itens.map(async (item) => {
        const { data: adicionais, error: adicionaisError } = await supabase
          .from('pdv_itens_adicionais')
          .select(`
            id,
            quantidade,
            valor_unitario,
            valor_total,
            nome_adicional,
            opcoes_adicionais_itens!inner(
              id,
              nome,
              preco,
              opcao_id
            )
          `)
          .eq('pdv_item_id', item.id)
          .eq('deletado', false);

        if (adicionaisError) {
          console.error('Erro ao buscar adicionais:', adicionaisError);
        }

        // Mapear adicionais para o formato ItemSelecionado
        const adicionaisFormatados: ItemSelecionado[] = (adicionais || []).map(adicional => ({
          item: {
            id: adicional.opcoes_adicionais_itens.id,
            nome: adicional.opcoes_adicionais_itens.nome,
            preco: adicional.opcoes_adicionais_itens.preco,
            opcao_id: adicional.opcoes_adicionais_itens.opcao_id
          },
          quantidade: adicional.quantidade
        }));

        return {
          ...item,
          adicionais: adicionaisFormatados
        };
      })
    );

    return {
      venda,
      itens: itensComAdicionais
    };

  } catch (error) {
    console.error('Erro ao recuperar venda:', error);
    throw error;
  }
};

// ========================================
// 5. FUNÇÃO AUXILIAR
// ========================================

const calcularTotalVenda = (itens: ItemCarrinho[]): number => {
  return itens.reduce((total, item) => {
    let totalItem = item.subtotal;
    
    // ✅ SOMAR O VALOR DOS ADICIONAIS
    if (item.adicionais && item.adicionais.length > 0) {
      const totalAdicionais = item.adicionais.reduce((totalAdd, adicional) => {
        return totalAdd + (adicional.item.preco * adicional.quantidade);
      }, 0);
      totalItem += totalAdicionais;
    }
    
    return total + totalItem;
  }, 0);
};

// ========================================
// 6. EXEMPLO DE USO NO MODAL DE ADICIONAIS
// ========================================

/**
 * Exemplo de como usar o modal de adicionais
 */
const handleConfirmarAdicionais = (adicionaisSelecionados: ItemSelecionado[]) => {
  // Adicionar produto com adicionais ao carrinho
  adicionarProdutoComAdicionais(produtoSelecionado, quantidade, adicionaisSelecionados);
  
  // Fechar modal
  setShowAdicionaisModal(false);
};

export {
  salvarVenda,
  recuperarVendaSalva,
  adicionarProdutoComAdicionais,
  calcularTotalVenda
};
