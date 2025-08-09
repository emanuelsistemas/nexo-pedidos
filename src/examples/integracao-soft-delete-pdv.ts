/**
 * ✅ EXEMPLO DE INTEGRAÇÃO: Soft Delete no PDV
 * 
 * Este arquivo mostra como integrar o sistema de soft delete
 * no PDV para rastrear itens removidos com todos os valores.
 */

import { supabase } from '../lib/supabase';
import { softDeleteItemPDV, buscarItensDeletados, ItemSnapshot } from '../utils/pdvSoftDeleteUtils';
import { showMessage } from '../utils/toast';

// ========================================
// 1. EXEMPLO: REMOVER ITEM DO CARRINHO (VENDA EM ANDAMENTO)
// ========================================

/**
 * Função para remover item do carrinho quando há venda em andamento
 * Substitui o hard delete por soft delete inteligente
 */
const removerItemCarrinhoComSoftDelete = async (
  itemCarrinho: any,
  vendaEmAndamento: any,
  usuarioId: string
) => {
  try {
    // Se há venda em andamento e o item já foi salvo no banco
    if (vendaEmAndamento && itemCarrinho.pdv_item_id) {
      console.log(`🗑️ Removendo item salvo no banco: ${itemCarrinho.produto.nome}`);
      
      // Usar soft delete inteligente
      const sucesso = await softDeleteItemPDV(
        itemCarrinho.pdv_item_id,
        usuarioId,
        'Removido pelo usuário no PDV'
      );
      
      if (sucesso) {
        showMessage('success', `Item "${itemCarrinho.produto.nome}" removido com sucesso`);
        return true;
      } else {
        showMessage('error', 'Erro ao remover item. Tente novamente.');
        return false;
      }
    } else {
      // Item ainda não foi salvo no banco, remover apenas do estado local
      console.log(`🗑️ Removendo item do estado local: ${itemCarrinho.produto.nome}`);
      return true;
    }
  } catch (error) {
    console.error('❌ Erro ao remover item:', error);
    showMessage('error', 'Erro ao remover item. Tente novamente.');
    return false;
  }
};

// ========================================
// 2. EXEMPLO: INTEGRAÇÃO NO COMPONENTE PDV
// ========================================

/**
 * Exemplo de como integrar no componente principal do PDV
 */
const exemploIntegracaoPDV = () => {
  // Estados do PDV (exemplo)
  const [carrinho, setCarrinho] = useState<any[]>([]);
  const [vendaEmAndamento, setVendaEmAndamento] = useState<any>(null);
  const [itensDeletados, setItensDeletados] = useState<ItemSnapshot[]>([]);
  
  // Função para remover item do carrinho
  const handleRemoverItem = async (index: number) => {
    const item = carrinho[index];
    
    // Obter dados do usuário
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      showMessage('error', 'Usuário não autenticado');
      return;
    }
    
    // Tentar remover com soft delete
    const sucesso = await removerItemCarrinhoComSoftDelete(
      item,
      vendaEmAndamento,
      userData.user.id
    );
    
    if (sucesso) {
      // Remover do estado local
      setCarrinho(prev => prev.filter((_, i) => i !== index));
      
      // Atualizar lista de itens deletados se necessário
      if (vendaEmAndamento) {
        await atualizarItensDeletados(vendaEmAndamento.id);
      }
    }
  };
  
  // Função para atualizar lista de itens deletados
  const atualizarItensDeletados = async (pdvId: string) => {
    const itens = await buscarItensDeletados(pdvId);
    setItensDeletados(itens);
  };
  
  // Função para exibir histórico de itens deletados
  const exibirHistoricoDeletados = () => {
    if (itensDeletados.length === 0) {
      showMessage('info', 'Nenhum item foi removido desta venda');
      return;
    }
    
    const valorTotal = itensDeletados.reduce((total, item) => 
      total + item.valores.valor_total_real, 0
    );
    
    console.log('📊 Histórico de Itens Deletados:');
    console.log(`💰 Valor total perdido: R$ ${valorTotal.toFixed(2)}`);
    
    itensDeletados.forEach((item, index) => {
      console.log(`${index + 1}. ${item.item.nome_produto}`);
      console.log(`   💰 Valor: R$ ${item.valores.valor_total_real.toFixed(2)}`);
      console.log(`   🍕 Adicionais: ${item.valores.quantidade_adicionais} (R$ ${item.valores.valor_adicionais.toFixed(2)})`);
      console.log(`   🗑️ Deletado em: ${new Date(item.delecao.deletado_em).toLocaleString()}`);
    });
  };
  
  return {
    handleRemoverItem,
    exibirHistoricoDeletados,
    itensDeletados
  };
};

// ========================================
// 3. EXEMPLO: MODAL DE CONFIRMAÇÃO INTELIGENTE
// ========================================

/**
 * Modal de confirmação que mostra o valor total que será perdido
 */
const ModalConfirmacaoRemocao = ({ 
  item, 
  isOpen, 
  onConfirm, 
  onCancel 
}: {
  item: any;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const [valorTotalItem, setValorTotalItem] = useState(0);
  const [detalhesItem, setDetalhesItem] = useState<any>(null);
  
  useEffect(() => {
    if (isOpen && item?.pdv_item_id) {
      calcularValorTotalItem();
    }
  }, [isOpen, item]);
  
  const calcularValorTotalItem = async () => {
    try {
      // Usar a função do banco para calcular valor real
      const { data, error } = await supabase.rpc(
        'calcular_valor_total_real_item_pdv',
        { pdv_item_uuid: item.pdv_item_id }
      );
      
      if (!error && data) {
        setValorTotalItem(data);
      }
      
      // Buscar detalhes dos adicionais e insumos
      const { data: adicionais } = await supabase
        .from('pdv_itens_adicionais')
        .select('nome_adicional, quantidade, valor_total')
        .eq('pdv_item_id', item.pdv_item_id)
        .eq('deletado', false);
      
      const { data: insumos } = await supabase
        .from('pdv_itens_insumos')
        .select('nome_insumo, quantidade, custo_total')
        .eq('pdv_item_id', item.pdv_item_id)
        .eq('deletado', false);
      
      setDetalhesItem({ adicionais: adicionais || [], insumos: insumos || [] });
      
    } catch (error) {
      console.error('❌ Erro ao calcular valor do item:', error);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-white mb-4">
          Confirmar Remoção
        </h3>
        
        <div className="text-gray-300 mb-4">
          <p>Deseja remover o item:</p>
          <p className="font-semibold text-white mt-2">{item?.produto?.nome}</p>
          
          {item?.pdv_item_id && (
            <div className="mt-4 p-3 bg-gray-700 rounded">
              <p className="text-sm text-yellow-400 mb-2">⚠️ Valor que será perdido:</p>
              <p className="text-xl font-bold text-red-400">
                R$ {valorTotalItem.toFixed(2)}
              </p>
              
              {detalhesItem && (
                <div className="mt-2 text-xs text-gray-400">
                  {detalhesItem.adicionais.length > 0 && (
                    <p>🍕 {detalhesItem.adicionais.length} adicionais</p>
                  )}
                  {detalhesItem.insumos.length > 0 && (
                    <p>🥘 {detalhesItem.insumos.length} insumos</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Remover
          </button>
        </div>
      </div>
    </div>
  );
};

// ========================================
// 4. EXEMPLO: RELATÓRIO DE ITENS DELETADOS
// ========================================

/**
 * Componente para exibir relatório de itens deletados
 */
const RelatorioItensDeletados = ({ pdvId }: { pdvId: string }) => {
  const [itens, setItens] = useState<ItemSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    carregarItensDeletados();
  }, [pdvId]);
  
  const carregarItensDeletados = async () => {
    setLoading(true);
    try {
      const itensDeletados = await buscarItensDeletados(pdvId);
      setItens(itensDeletados);
    } catch (error) {
      console.error('❌ Erro ao carregar itens deletados:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const valorTotalPerdido = itens.reduce((total, item) => 
    total + item.valores.valor_total_real, 0
  );
  
  if (loading) return <div>Carregando...</div>;
  
  if (itens.length === 0) {
    return (
      <div className="text-gray-400 text-center py-4">
        Nenhum item foi removido desta venda
      </div>
    );
  }
  
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4">
        Itens Removidos ({itens.length})
      </h3>
      
      <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded">
        <p className="text-red-400 font-semibold">
          💸 Valor Total Perdido: R$ {valorTotalPerdido.toFixed(2)}
        </p>
      </div>
      
      <div className="space-y-3">
        {itens.map((item, index) => (
          <div key={index} className="bg-gray-700 rounded p-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-white">{item.item.nome_produto}</p>
                <p className="text-sm text-gray-400">
                  Qtd: {item.item.quantidade} × R$ {item.item.valor_unitario.toFixed(2)}
                </p>
                {item.valores.quantidade_adicionais > 0 && (
                  <p className="text-xs text-blue-400">
                    🍕 {item.valores.quantidade_adicionais} adicionais (R$ {item.valores.valor_adicionais.toFixed(2)})
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="font-bold text-red-400">
                  R$ {item.valores.valor_total_real.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(item.delecao.deletado_em).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ========================================
// EXPORTAÇÕES
// ========================================

export {
  removerItemCarrinhoComSoftDelete,
  exemploIntegracaoPDV,
  ModalConfirmacaoRemocao,
  RelatorioItensDeletados
};
