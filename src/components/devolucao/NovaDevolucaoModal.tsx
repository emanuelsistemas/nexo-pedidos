import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Calendar, User, Package, DollarSign, Clock, Filter, ChevronDown, ChevronUp, Check, Minus, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import ClienteDropdown from '../comum/ClienteDropdown';
import ClienteFormCompleto from '../comum/ClienteFormCompleto';

// Função para formatar moeda
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

interface ItemVenda {
  id: string;
  pdv_id: string;
  produto_id: string;
  nome_produto: string;
  quantidade: number;
  valor_unitario: number;
  valor_total_item: number;
  observacao_item?: string;
}

interface Venda {
  id: string;
  numero_venda: string;
  data_venda: string;
  created_at: string;
  nome_cliente: string;
  valor_total: number;
  status_venda: string;
  status_fiscal?: string;
  modelo_documento?: number;
  itens_count?: number;
  itens?: ItemVenda[];
}

interface NovaDevolucaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (vendaId: string, vendaData: Venda) => void;
  isLoading?: boolean;
}

const NovaDevolucaoModal: React.FC<NovaDevolucaoModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading: externalLoading = false
}) => {
  // Estados do modal
  const [isLoading, setIsLoading] = useState(false);

  // Estados do cliente (opcional)
  const [clienteId, setClienteId] = useState('');
  const [clienteNome, setClienteNome] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [empresaId, setEmpresaId] = useState('');

  // Estados das vendas
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [filteredVendas, setFilteredVendas] = useState<Venda[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Estados de expansão e seleção
  const [expandedVendas, setExpandedVendas] = useState<Set<string>>(new Set());
  const [selectedItens, setSelectedItens] = useState<Set<string>>(new Set());
  const [selectedVendas, setSelectedVendas] = useState<Set<string>>(new Set());
  const [loadingItens, setLoadingItens] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [showAvisoModal, setShowAvisoModal] = useState(false);
  const [avisoMensagem, setAvisoMensagem] = useState('');

  // Carregar empresa do usuário e vendas
  useEffect(() => {
    if (isOpen) {
      loadEmpresaIdAndVendas();
    }
  }, [isOpen]);

  // Aplicar filtros nas vendas
  useEffect(() => {
    applyFilters();
  }, [vendas, searchTerm, dataInicio, dataFim, clienteId]);

  const loadEmpresaIdAndVendas = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (usuarioData?.empresa_id) {
        setEmpresaId(usuarioData.empresa_id);
        await loadVendas(usuarioData.empresa_id);
      }
    } catch (error) {
      console.error('Erro ao carregar empresa:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...vendas];

    // Filtro por termo de busca (número da venda ou nome do cliente)
    if (searchTerm) {
      filtered = filtered.filter(venda =>
        venda.numero_venda?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venda.nome_cliente?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por cliente (se selecionado)
    if (clienteId) {
      filtered = filtered.filter(venda => venda.nome_cliente === clienteNome);
    }

    // Filtro por data de início
    if (dataInicio) {
      filtered = filtered.filter(venda => {
        const vendaDate = new Date(venda.created_at).toISOString().split('T')[0];
        return vendaDate >= dataInicio;
      });
    }

    // Filtro por data de fim
    if (dataFim) {
      filtered = filtered.filter(venda => {
        const vendaDate = new Date(venda.created_at).toISOString().split('T')[0];
        return vendaDate <= dataFim;
      });
    }

    setFilteredVendas(filtered);
  };

  const handleClienteSelect = (id: string, nome: string, telefone: string) => {
    setClienteId(id);
    setClienteNome(nome);
    setClienteTelefone(telefone);
  };

  const loadVendas = async (empresaIdParam?: string) => {
    const empresaIdToUse = empresaIdParam || empresaId;
    if (!empresaIdToUse) return;

    try {
      setIsLoading(true);

      // Buscar todas as vendas da empresa (não apenas do cliente)
      let query = supabase
        .from('pdv')
        .select(`
          id,
          numero_venda,
          data_venda,
          created_at,
          nome_cliente,
          valor_total,
          status_venda,
          status_fiscal,
          modelo_documento,
          chave_nfe
        `)
        .eq('empresa_id', empresaIdToUse)
        .in('status_venda', ['finalizada', 'paga'])
        .order('created_at', { ascending: false })
        .limit(100);

      const { data, error } = await query;

      if (error) throw error;

      // Buscar produtos que já estão em devoluções pendentes OU processadas
      const { data: devolucoesPendentes, error: errorPendentes } = await supabase
        .from('devolucao_itens')
        .select(`
          produto_id,
          venda_origem_id,
          pdv_item_id,
          devolucoes!inner(status, empresa_id, codigo_troca)
        `)
        .in('devolucoes.status', ['pendente', 'processada'])
        .eq('devolucoes.empresa_id', empresaIdToUse);

      // Debug: Log dos produtos pendentes/processados
      console.log('🔍 Debug - Produtos em devoluções pendentes/processadas:', {
        devolucoesPendentes,
        errorPendentes,
        empresaId: empresaIdToUse
      });

      // Criar um Map com os produtos devolvidos para busca rápida
      // Incluir informações sobre status e código da troca
      const produtosDevolvidos = new Map();
      (devolucoesPendentes || []).forEach(item => {
        const chaveItem = `pdv_item-${item.pdv_item_id}`;
        const chaveProduto = `${item.venda_origem_id}-${item.produto_id}`;

        const infoItem = {
          status: item.devolucoes.status,
          codigo_troca: item.devolucoes.codigo_troca,
          isPendente: item.devolucoes.status === 'pendente',
          isProcessada: item.devolucoes.status === 'processada'
        };

        if (item.pdv_item_id) {
          produtosDevolvidos.set(chaveItem, infoItem);
        }
        produtosDevolvidos.set(chaveProduto, infoItem);
      });

      // Contar itens de cada venda e marcar produtos pendentes
      const vendasComItens = await Promise.all(
        (data || []).map(async (venda) => {
          const { data: itens, count } = await supabase
            .from('pdv_itens')
            .select('id, produto_id, nome_produto, quantidade, valor_unitario, valor_total_item')
            .eq('pdv_id', venda.id);

          // Marcar itens que estão em devolução (pendente ou processada)
          const itensComStatus = (itens || []).map(item => {
            const infoPorItem = produtosDevolvidos.get(`pdv_item-${item.id}`);
            const infoPorProduto = produtosDevolvidos.get(`${venda.id}-${item.produto_id}`);
            const infoItem = infoPorItem || infoPorProduto;

            const devolucao_pendente = infoItem?.isPendente || false;
            const devolucao_processada = infoItem?.isProcessada || false;
            const codigo_troca = infoItem?.codigo_troca || null;
            const tem_devolucao = devolucao_pendente || devolucao_processada;

            // Debug: Log de itens marcados como devolvidos
            if (tem_devolucao) {
              console.log('🔍 Debug - Item com devolução:', {
                item: item.nome_produto,
                produto_id: item.produto_id,
                pdv_item_id: item.id,
                venda_id: venda.id,
                status: infoItem?.status,
                codigo_troca,
                devolucao_pendente,
                devolucao_processada
              });
            }

            return {
              ...item,
              devolucao_pendente,
              devolucao_processada,
              codigo_troca,
              tem_devolucao
            };
          });

          return {
            ...venda,
            itens_count: count || 0,
            itens: itensComStatus
          };
        })
      );

      setVendas(vendasComItens);
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadItensVenda = async (vendaId: string) => {
    try {
      setLoadingItens(prev => new Set([...prev, vendaId]));

      const { data: itensData, error } = await supabase
        .from('pdv_itens')
        .select(`
          id,
          pdv_id,
          produto_id,
          nome_produto,
          quantidade,
          valor_unitario,
          valor_total_item,
          observacao_item
        `)
        .eq('pdv_id', vendaId)
        .order('nome_produto');

      if (error) throw error;

      // Buscar dados fiscais dos produtos
      const produtoIds = itensData?.map(item => item.produto_id).filter(Boolean) || [];
      let dadosFiscais: {[produtoId: string]: any} = {};

      if (produtoIds.length > 0) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data: usuarioData } = await supabase
            .from('usuarios')
            .select('empresa_id')
            .eq('id', userData.user.id)
            .single();

          if (usuarioData?.empresa_id) {
            const { data: produtosFiscais, error: fiscaisError } = await supabase
              .from('produtos')
              .select(`
                id,
                codigo,
                ncm,
                cfop,
                origem_produto,
                situacao_tributaria,
                cst_icms,
                csosn_icms,
                cst_pis,
                cst_cofins,
                aliquota_icms,
                aliquota_pis,
                aliquota_cofins
              `)
              .in('id', produtoIds)
              .eq('empresa_id', usuarioData.empresa_id);

            if (!fiscaisError && produtosFiscais) {
              produtosFiscais.forEach(produto => {
                dadosFiscais[produto.id] = produto;
              });
            }
          }
        }
      }

      // Combinar dados dos itens com dados fiscais
      const itensComDadosFiscais = itensData?.map(item => ({
        ...item,
        dadosFiscais: dadosFiscais[item.produto_id] || null
      })) || [];

      // Atualizar a venda com os itens carregados
      setVendas(prev => prev.map(venda =>
        venda.id === vendaId
          ? { ...venda, itens: itensComDadosFiscais }
          : venda
      ));

      setFilteredVendas(prev => prev.map(venda =>
        venda.id === vendaId
          ? { ...venda, itens: itensComDadosFiscais }
          : venda
      ));

    } catch (error) {
      console.error('Erro ao carregar itens da venda:', error);
    } finally {
      setLoadingItens(prev => {
        const newSet = new Set(prev);
        newSet.delete(vendaId);
        return newSet;
      });
    }
  };

  const handleExpandVenda = async (vendaId: string) => {
    const isExpanded = expandedVendas.has(vendaId);

    if (isExpanded) {
      // Recolher
      setExpandedVendas(prev => {
        const newSet = new Set(prev);
        newSet.delete(vendaId);
        return newSet;
      });
    } else {
      // Expandir e carregar itens se necessário
      setExpandedVendas(prev => new Set([...prev, vendaId]));

      const venda = vendas.find(v => v.id === vendaId);
      if (venda && !venda.itens) {
        await loadItensVenda(vendaId);
      }
    }
  };

  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleVendaSelect = (venda: Venda) => {
    // Coletar todos os itens selecionados
    const itensSelecionados = Array.from(selectedItens);
    const vendasSelecionadas = Array.from(selectedVendas);

    onConfirm(venda.id, venda);
    handleClose();
  };

  const handleSelectVendaCompleta = async (vendaId: string, checked: boolean) => {
    if (checked) {
      // Carregar itens se ainda não foram carregados
      const venda = vendas.find(v => v.id === vendaId);
      if (venda && !venda.itens) {
        await loadItensVenda(vendaId);
      }

      // Verificar se há itens com devolução (pendente ou processada) na venda
      const vendaAtualizada = vendas.find(v => v.id === vendaId);
      const temItensComDevolucao = vendaAtualizada?.itens?.some(item => item.tem_devolucao);

      if (temItensComDevolucao) {
        setAvisoMensagem('Esta venda contém itens que já foram devolvidos ou estão em processo de devolução e não pode ser selecionada completamente.');
        setShowAvisoModal(true);
        return;
      }

      setSelectedVendas(prev => new Set([...prev, vendaId]));

      // Remover itens individuais desta venda se estavam selecionados
      if (vendaAtualizada?.itens) {
        setSelectedItens(prev => {
          const newSet = new Set(prev);
          vendaAtualizada.itens!.forEach(item => newSet.delete(item.id));
          return newSet;
        });
      }
    } else {
      setSelectedVendas(prev => {
        const newSet = new Set(prev);
        newSet.delete(vendaId);
        return newSet;
      });
    }
  };

  const handleSelectItem = (itemId: string, vendaId: string, checked: boolean) => {
    if (checked) {
      setSelectedItens(prev => new Set([...prev, itemId]));
      // Remover venda completa se estava selecionada
      setSelectedVendas(prev => {
        const newSet = new Set(prev);
        newSet.delete(vendaId);
        return newSet;
      });
    } else {
      setSelectedItens(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const getValorTotalSelecionado = () => {
    let total = 0;

    // Somar vendas completas selecionadas (apenas produtos, excluindo taxa de entrega)
    selectedVendas.forEach(vendaId => {
      const venda = vendas.find(v => v.id === vendaId);
      if (venda && venda.itens) {
        // Somar apenas itens que têm produto_id e não são taxa de entrega
        venda.itens.forEach(item => {
          const nome = item.produto_nome?.toLowerCase() || '';
          const isNotTaxaEntrega = !nome.includes('taxa de entrega') &&
                                  !nome.includes('taxa entrega') &&
                                  !nome.includes('entrega');

          if (item.produto_id !== null &&
              item.produto_id !== undefined &&
              isNotTaxaEntrega) {
            total += item.valor_total_item;
          }
        });
      }
    });

    // Somar itens individuais selecionados (apenas produtos válidos)
    selectedItens.forEach(itemId => {
      vendas.forEach(venda => {
        const item = venda.itens?.find(i => i.id === itemId);
        const nome = item?.produto_nome?.toLowerCase() || '';
        const isNotTaxaEntrega = !nome.includes('taxa de entrega') &&
                                !nome.includes('taxa entrega') &&
                                !nome.includes('entrega');

        if (item &&
            item.produto_id !== null &&
            item.produto_id !== undefined &&
            isNotTaxaEntrega) {
          total += item.valor_total_item;
        }
      });
    });

    return total;
  };

  const getQuantidadeItensSelecionados = () => {
    let count = 0;

    // Contar itens válidos de vendas completas
    selectedVendas.forEach(vendaId => {
      const venda = vendas.find(v => v.id === vendaId);
      if (venda) {
        // Se a venda tem itens carregados, contar apenas os itens válidos (com produto_id)
        if (venda.itens && venda.itens.length > 0) {
          const itensValidos = venda.itens.filter(item =>
            item.produto_id !== null && item.produto_id !== undefined
          );
          count += itensValidos.length;
        } else {
          // Caso contrário, usar o contador de itens (assumindo que são válidos)
          count += venda.itens_count || 0;
        }
      }
    });

    // Contar itens individuais válidos (apenas os que não fazem parte de vendas completas selecionadas)
    selectedItens.forEach(itemId => {
      // Verificar se este item não faz parte de uma venda completa selecionada
      const itemVenda = vendas.find(venda =>
        venda.itens?.some(item => item.id === itemId)
      );
      if (itemVenda && !selectedVendas.has(itemVenda.id)) {
        const item = itemVenda.itens?.find(i => i.id === itemId);
        // Contar apenas se for um item válido (com produto_id)
        if (item && item.produto_id !== null && item.produto_id !== undefined) {
          count += 1;
        }
      }
    });

    return count;
  };

  // Função para calcular o valor válido de uma venda (apenas produtos, sem taxas/serviços)
  const getValorValidoVenda = (venda: any) => {
    if (!venda.itens || venda.itens.length === 0) {
      // Se não tem itens carregados, retorna o valor total (assumindo que é válido)
      return venda.valor_total;
    }

    // Somar apenas itens válidos (com produto_id)
    return venda.itens.reduce((total: number, item: any) => {
      if (item.produto_id !== null && item.produto_id !== undefined) {
        return total + item.valor_total_item;
      }
      return total;
    }, 0);
  };

  const handleClose = () => {
    setClienteId('');
    setClienteNome('');
    setClienteTelefone('');
    setVendas([]);
    setFilteredVendas([]);
    setSearchTerm('');
    setDataInicio('');
    setDataFim('');
    setShowFilters(false);
    setExpandedVendas(new Set());
    setSelectedItens(new Set());
    setSelectedVendas(new Set());
    setLoadingItens(new Set());
    setExpandedItems(new Set());
    onClose();
  };



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'finalizada':
        return 'text-green-400 border-green-400';
      case 'paga':
        return 'text-blue-400 border-blue-400';
      default:
        return 'text-gray-400 border-gray-400';
    }
  };

  const getTipoVenda = (modelo?: number) => {
    if (modelo === 65) return 'NFC-e';
    if (modelo === 55) return 'NFe';
    return 'PDV';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 z-[9999] bg-background-card" style={{ margin: 0, padding: 0 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="w-full h-full bg-background-card flex flex-col"
        style={{ margin: 0, padding: 0, minHeight: '100vh', minWidth: '100vw' }}
      >
        {/* Cabeçalho */}
        <div className="flex-shrink-0 px-6 py-3 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-white">
              Nova Devolução - Selecionar Venda
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {(selectedItens.size > 0 || selectedVendas.size > 0) && (
              <button
                onClick={() => setShowFinalizarModal(true)}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium"
              >
                Finalizar Devolução
              </button>
            )}
            <button
              onClick={handleClose}
              className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Seleção de Venda */}
          <div className="flex flex-col h-full">

            {/* Filtros de busca */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-gray-800 space-y-3">
              {/* Linha única com Cliente, Busca e Filtros */}
              <div className="flex gap-4 items-center">
                {/* Filtro de Cliente (opcional) */}
                <div className="w-80">
                  <ClienteDropdown
                    value={clienteId}
                    onChange={handleClienteSelect}
                    empresaId={empresaId}
                    placeholder="Todos os clientes"
                    required={false}
                  />
                </div>

                {/* Barra de busca */}
                <div className="relative flex-1 max-w-2xl">
                  <input
                    type="text"
                    placeholder="Buscar por número da venda ou nome do cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>

                {/* Botão de filtros (apenas ícone) */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="p-2.5 bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors"
                  title="Filtros Avançados"
                >
                  <Filter size={18} />
                </button>

                {/* Contador de vendas */}
                <span className="text-gray-400 font-medium whitespace-nowrap">
                  {filteredVendas.length} venda(s)
                </span>
              </div>

                {/* Filtros expandidos */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-gray-800/50 border border-gray-700 rounded p-3 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">
                              Data Início
                            </label>
                            <input
                              type="date"
                              value={dataInicio}
                              onChange={(e) => setDataInicio(e.target.value)}
                              className="w-full bg-gray-800/50 border border-gray-700 rounded py-1.5 px-2 text-white text-sm focus:outline-none focus:border-primary-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">
                              Data Fim
                            </label>
                            <input
                              type="date"
                              value={dataFim}
                              onChange={(e) => setDataFim(e.target.value)}
                              className="w-full bg-gray-800/50 border border-gray-700 rounded py-1.5 px-2 text-white text-sm focus:outline-none focus:border-primary-500"
                            />
                          </div>
                        </div>
                        {(dataInicio || dataFim) && (
                          <button
                            onClick={() => {
                              setDataInicio('');
                              setDataFim('');
                            }}
                            className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                          >
                            <X size={12} />
                            Limpar filtros de data
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Lista de vendas */}
              <div className="flex-1 overflow-y-auto p-4 min-h-0 custom-scrollbar">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Carregando vendas...</p>
                  </div>
                ) : filteredVendas.length === 0 ? (
                  <div className="text-center py-8">
                    <Package size={32} className="text-gray-500 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-white mb-2">
                      Nenhuma venda encontrada
                    </h3>
                    <p className="text-gray-400">
                      {searchTerm || dataInicio || dataFim || clienteId
                        ? 'Tente ajustar os filtros de busca'
                        : 'Não há vendas disponíveis para devolução'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredVendas.map((venda) => {
                      const isExpanded = expandedVendas.has(venda.id);
                      const isVendaSelected = selectedVendas.has(venda.id);
                      const isLoadingItens = loadingItens.has(venda.id);

                      return (
                        <motion.div
                          key={venda.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-gray-800/30 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                        >
                          {/* Cabeçalho da Venda */}
                          <div className="p-4">
                            <div className="flex items-center gap-3">
                              {/* Checkbox para selecionar venda completa */}
                              <div className="flex-shrink-0">
                                <input
                                  type="checkbox"
                                  checked={isVendaSelected}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleSelectVendaCompleta(venda.id, e.target.checked);
                                  }}
                                  className="w-4 h-4 text-primary-500 bg-gray-700 border-gray-600 rounded focus:ring-primary-500 focus:ring-2"
                                />
                              </div>

                              {/* Informações da venda */}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-white font-medium">
                                    #{venda.numero_venda || 'S/N'}
                                  </span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full border ${getStatusColor(venda.status_venda)}`}>
                                    {venda.status_venda}
                                  </span>
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">
                                    {getTipoVenda(venda.modelo_documento)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-400">
                                  <div className="flex items-center gap-1">
                                    <Clock size={12} />
                                    {formatDate(venda.created_at)}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Package size={12} />
                                    {venda.itens_count} item(s)
                                  </div>
                                  {venda.nome_cliente && (
                                    <div className="flex items-center gap-1">
                                      <User size={12} />
                                      {venda.nome_cliente}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Valor e botão expandir */}
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <div className="flex items-center gap-1 text-white font-medium">
                                    <DollarSign size={14} className="text-green-400" />
                                    {formatCurrency(getValorValidoVenda(venda))}
                                  </div>
                                  {venda.itens && venda.itens.length > 0 && getValorValidoVenda(venda) !== venda.valor_total && (
                                    <div className="text-xs text-gray-400">
                                      Total: {formatCurrency(venda.valor_total)}
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExpandVenda(venda.id);
                                  }}
                                  className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                                >
                                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Lista de Itens (quando expandido) */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="border-t border-gray-700 p-3 bg-gray-800/20">
                                  {isLoadingItens ? (
                                    <div className="text-center py-4">
                                      <div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-2"></div>
                                      <p className="text-sm text-gray-400">Carregando itens...</p>
                                    </div>
                                  ) : venda.itens && venda.itens.length > 0 ? (
                                    <div className="space-y-2">
                                      <h4 className="text-sm font-medium text-gray-300 mb-2">
                                        Itens da Venda:
                                      </h4>
                                      {venda.itens.map((item) => {
                                        const isVendaCompleteSelected = selectedVendas.has(venda.id);
                                        const isItemSelected = selectedItens.has(item.id);
                                        const isChecked = isVendaCompleteSelected || isItemSelected;
                                        const isItemValid = item.produto_id !== null && item.produto_id !== undefined;
                                        const hasDevolucaoPendente = item.devolucao_pendente;
                                        const hasDevolucaoProcessada = item.devolucao_processada;
                                        const temDevolucao = item.tem_devolucao;
                                        const isDisabled = isVendaCompleteSelected || !isItemValid || temDevolucao;

                                        return (
                                          <div
                                            key={item.id}
                                            className={`flex items-center gap-3 p-2 rounded border ${
                                              hasDevolucaoPendente
                                                ? 'bg-yellow-900/20 border-yellow-600/30 opacity-60'
                                                : hasDevolucaoProcessada
                                                ? 'bg-green-900/20 border-green-600/30 opacity-60'
                                                : isItemValid
                                                ? 'bg-gray-700/30 border-gray-600'
                                                : 'bg-gray-800/50 border-gray-700 opacity-60'
                                            }`}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              disabled={isDisabled}
                                              onChange={(e) => {
                                                e.stopPropagation();
                                                if (!isDisabled) {
                                                  handleSelectItem(item.id, venda.id, e.target.checked);
                                                }
                                              }}
                                              className={`w-4 h-4 text-primary-500 bg-gray-700 border-gray-600 rounded focus:ring-primary-500 focus:ring-2 ${
                                                isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                                              }`}
                                            />
                                            <div className="flex-1">
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                  <span className={`text-sm font-medium ${
                                                    temDevolucao ? 'text-gray-400' : isItemValid ? 'text-white' : 'text-gray-500'
                                                  }`}>
                                                    {item.nome_produto}
                                                  </span>
                                                  {hasDevolucaoPendente && (
                                                    <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded border border-yellow-500/30">
                                                      Pendente
                                                    </span>
                                                  )}
                                                  {hasDevolucaoProcessada && item.codigo_troca && (
                                                    <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded border border-green-500/30">
                                                      Devolvido troca {item.codigo_troca}
                                                    </span>
                                                  )}
                                                  {!isItemValid && !temDevolucao && (
                                                    <span className="text-xs text-orange-400">
                                                      (Não disponível para devolução)
                                                    </span>
                                                  )}
                                                  {/* Botão para expandir dados fiscais */}
                                                  {item.dadosFiscais && (
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleItemExpansion(item.id);
                                                      }}
                                                      className="text-xs px-2 py-1 bg-orange-600/20 text-orange-400 rounded border border-orange-600/30 hover:bg-orange-600/30 transition-colors"
                                                    >
                                                      Dados Fiscais
                                                    </button>
                                                  )}
                                                </div>
                                                <span className={`font-medium ${
                                                  temDevolucao ? 'text-gray-400' : isItemValid ? 'text-white' : 'text-gray-500'
                                                }`}>
                                                  {formatCurrency(item.valor_total_item)}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-4 text-xs text-gray-400">
                                                <span>Qtd: {item.quantidade}</span>
                                                <span>Unit: {formatCurrency(item.valor_unitario)}</span>
                                                {!isItemValid && (
                                                  <span className="text-orange-400">• Taxa/Serviço</span>
                                                )}
                                              </div>

                                              {/* Dados Fiscais Expandidos */}
                                              {expandedItems.has(item.id) && item.dadosFiscais && (
                                                <div className="mt-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                                                  <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-xs px-2 py-1 bg-orange-600/20 text-orange-400 rounded border border-orange-600/30">
                                                      Dados Fiscais
                                                    </span>
                                                  </div>
                                                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
                                                    <div>
                                                      <span className="text-gray-400">NCM:</span>
                                                      <div className="text-white font-mono">{item.dadosFiscais.ncm || '-'}</div>
                                                    </div>
                                                    <div>
                                                      <span className="text-gray-400">CFOP:</span>
                                                      <div className="text-white font-mono">{item.dadosFiscais.cfop || '-'}</div>
                                                    </div>
                                                    <div>
                                                      <span className="text-gray-400">CSOSN:</span>
                                                      <div className="text-white font-mono">{item.dadosFiscais.csosn_icms || '-'}</div>
                                                    </div>
                                                    <div>
                                                      <span className="text-gray-400">Alíquota:</span>
                                                      <div className="text-white font-mono">{item.dadosFiscais.aliquota_icms ? `${item.dadosFiscais.aliquota_icms}%` : '-'}</div>
                                                    </div>
                                                    <div>
                                                      <span className="text-gray-400">PIS:</span>
                                                      <div className="text-white font-mono">{item.dadosFiscais.aliquota_pis ? `${item.dadosFiscais.aliquota_pis}%` : '-'}</div>
                                                    </div>
                                                    <div>
                                                      <span className="text-gray-400">COFINS:</span>
                                                      <div className="text-white font-mono">{item.dadosFiscais.aliquota_cofins ? `${item.dadosFiscais.aliquota_cofins}%` : '-'}</div>
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-400 text-center py-2">
                                      Nenhum item encontrado
                                    </p>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

        {/* Controlador de Valor - Rodapé */}
        {(selectedItens.size > 0 || selectedVendas.size > 0) && (
          <div className="flex-shrink-0 px-6 py-4 border-t border-gray-800 bg-gray-900/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-400">
                    {getQuantidadeItensSelecionados()} item(s) selecionado(s)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-green-400" />
                  <span className="text-lg font-semibold text-white">
                    {formatCurrency(getValorTotalSelecionado())}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedItens(new Set());
                    setSelectedVendas(new Set());
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Limpar Seleção
                </button>
                <button
                  onClick={() => {
                    // Abrir modal de finalização
                    setShowFinalizarModal(true);
                  }}
                  className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </motion.div>

      {/* Modal de Finalização da Devolução */}
      {showFinalizarModal && (
        <FinalizarDevolucaoModal
          isOpen={showFinalizarModal}
          onClose={() => !externalLoading && setShowFinalizarModal(false)}
          selectedItens={selectedItens}
          selectedVendas={selectedVendas}
          vendas={vendas}
          empresaId={empresaId}
          valorTotal={getValorTotalSelecionado()}
          isLoading={externalLoading}
          onConfirm={(dadosDevolucao) => {
            // Processar a devolução final
            onConfirm('', dadosDevolucao);
            if (!externalLoading) {
              setShowFinalizarModal(false);
              handleClose();
            }
          }}
        />
      )}

      {/* Modal de Aviso */}
      {showAvisoModal && (
        <div className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-background-card rounded-lg border border-gray-800 shadow-2xl"
          >
            {/* Cabeçalho */}
            <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <AlertCircle size={20} className="text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Atenção
              </h3>
            </div>

            {/* Conteúdo */}
            <div className="p-6">
              <p className="text-gray-300 leading-relaxed">
                {avisoMensagem}
              </p>
            </div>

            {/* Rodapé */}
            <div className="px-6 py-4 border-t border-gray-800 flex justify-end">
              <button
                onClick={() => setShowAvisoModal(false)}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium"
              >
                Entendi
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

// Interfaces para o modal de finalização
interface FinalizarDevolucaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItens: Set<string>;
  selectedVendas: Set<string>;
  vendas: Venda[];
  empresaId: string;
  valorTotal: number;
  isLoading?: boolean;
  onConfirm: (dadosDevolucao: any) => void;
}

// Componente do Modal de Finalização
const FinalizarDevolucaoModal: React.FC<FinalizarDevolucaoModalProps> = ({
  isOpen,
  onClose,
  selectedItens,
  selectedVendas,
  vendas,
  empresaId,
  valorTotal,
  isLoading = false,
  onConfirm
}) => {
  const [clienteId, setClienteId] = useState('');
  const [showNovoClienteModal, setShowNovoClienteModal] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [itensComDadosFiscais, setItensComDadosFiscais] = useState<any[]>([]);

  // Função para formatar data (local do componente)
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Função para alternar expansão dos dados fiscais
  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Carregar dados fiscais dos itens selecionados
  useEffect(() => {
    const carregarDadosFiscais = async () => {
      if (!isOpen) return;

      const itensSelecionados = getItensSelecionados();
      const produtoIds = itensSelecionados.map(item => item.produto_id).filter(Boolean);

      if (produtoIds.length === 0) {
        setItensComDadosFiscais(itensSelecionados);
        return;
      }

      try {
        const { data: produtosFiscais, error } = await supabase
          .from('produtos')
          .select(`
            id,
            codigo,
            ncm,
            cfop,
            origem_produto,
            situacao_tributaria,
            cst_icms,
            csosn_icms,
            cst_pis,
            cst_cofins,
            aliquota_icms,
            aliquota_pis,
            aliquota_cofins
          `)
          .in('id', produtoIds)
          .eq('empresa_id', empresaId);

        if (error) {
          console.error('Erro ao carregar dados fiscais:', error);
          setItensComDadosFiscais(itensSelecionados);
          return;
        }

        // Criar mapa de dados fiscais por produto_id
        const dadosFiscaisMap: {[produtoId: string]: any} = {};
        (produtosFiscais || []).forEach(produto => {
          dadosFiscaisMap[produto.id] = produto;
        });

        // Combinar itens com dados fiscais
        const itensComDados = itensSelecionados.map(item => ({
          ...item,
          dadosFiscais: dadosFiscaisMap[item.produto_id] || null
        }));

        setItensComDadosFiscais(itensComDados);
      } catch (error) {
        console.error('Erro ao buscar dados fiscais:', error);
        setItensComDadosFiscais(itensSelecionados);
      }
    };

    carregarDadosFiscais();
  }, [isOpen, selectedItens, selectedVendas, vendas, empresaId]);

  // Função para obter todos os itens selecionados (excluindo taxa de entrega)
  const getItensSelecionados = () => {
    const itens: ItemVenda[] = [];

    // Itens de vendas completas
    selectedVendas.forEach(vendaId => {
      const venda = vendas.find(v => v.id === vendaId);
      if (venda?.itens) {
        // Filtrar apenas produtos, excluindo taxa de entrega
        const produtosApenas = venda.itens.filter(item => {
          const nome = item.produto_nome?.toLowerCase() || '';
          return !nome.includes('taxa de entrega') &&
                 !nome.includes('taxa entrega') &&
                 !nome.includes('entrega') &&
                 item.produto_id !== null &&
                 item.produto_id !== undefined;
        });
        itens.push(...produtosApenas);
      }
    });

    // Itens individuais
    selectedItens.forEach(itemId => {
      const item = vendas
        .flatMap(v => v.itens || [])
        .find(i => i.id === itemId);
      if (item) {
        // Verificar se não é taxa de entrega
        const nome = item.produto_nome?.toLowerCase() || '';
        const isNotTaxaEntrega = !nome.includes('taxa de entrega') &&
                                !nome.includes('taxa entrega') &&
                                !nome.includes('entrega');

        if (isNotTaxaEntrega && item.produto_id !== null && item.produto_id !== undefined) {
          // Verificar se não faz parte de uma venda completa selecionada
          const itemVenda = vendas.find(venda =>
            venda.itens?.some(i => i.id === itemId)
          );
          if (itemVenda && !selectedVendas.has(itemVenda.id)) {
            itens.push(item);
          }
        }
      }
    });

    return itens;
  };

  // Função para obter informações da venda origem
  const getVendaOrigemInfo = () => {
    // Primeiro, verificar se há vendas completas selecionadas
    if (selectedVendas.size > 0) {
      const vendaId = Array.from(selectedVendas)[0]; // Pegar a primeira venda selecionada
      const venda = vendas.find(v => v.id === vendaId);
      return venda ? {
        id: venda.id,
        numero: venda.numero_venda,
        data: venda.data_venda || venda.created_at,
        modelo_documento: venda.modelo_documento,
        chave_nfe: venda.chave_nfe
      } : null;
    }

    // Se não há vendas completas, verificar itens individuais
    if (selectedItens.size > 0) {
      const itemId = Array.from(selectedItens)[0]; // Pegar o primeiro item
      const vendaDoItem = vendas.find(venda =>
        venda.itens?.some(i => i.id === itemId)
      );
      return vendaDoItem ? {
        id: vendaDoItem.id,
        numero: vendaDoItem.numero_venda,
        data: vendaDoItem.data_venda || vendaDoItem.created_at,
        modelo_documento: vendaDoItem.modelo_documento,
        chave_nfe: vendaDoItem.chave_nfe
      } : null;
    }

    return null;
  };

  const itensSelecionados = getItensSelecionados();
  const vendaOrigemInfo = getVendaOrigemInfo();

  const handleConfirm = (tipoConfirmacao: 'manual' | 'nfce' = 'manual') => {
    const dadosDevolucao = {
      clienteId,
      itens: itensSelecionados,
      valorTotal,
      vendasCompletas: Array.from(selectedVendas),
      itensIndividuais: Array.from(selectedItens),
      vendaOrigem: vendaOrigemInfo, // Adicionar informações da venda origem
      tipoConfirmacao // Adicionar tipo de confirmação
    };
    onConfirm(dadosDevolucao);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-background-card rounded-lg border border-gray-800 flex flex-col shadow-2xl max-h-[90vh]"
      >
        {/* Cabeçalho */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            Finalizar Devolução
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Informações da Venda Origem */}
          {vendaOrigemInfo && (
            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-400 mb-2">
                Venda de Origem
              </h3>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium">
                      #{vendaOrigemInfo.numero}
                    </span>
                    {/* Tag NFC-e ou PDV */}
                    {vendaOrigemInfo.modelo_documento === 65 ? (
                      <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded border border-green-600/30">
                        NFC-e
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-600/20 text-gray-400 text-xs rounded border border-gray-600/30">
                        PDV
                      </span>
                    )}
                  </div>
                  <div className="text-gray-400 text-sm">
                    {formatDate(vendaOrigemInfo.data)}
                  </div>
                  {/* Mostrar chave NFC-e se existir */}
                  {vendaOrigemInfo.modelo_documento === 65 && vendaOrigemInfo.chave_nfe && (
                    <div className="text-gray-500 text-xs mt-1 font-mono">
                      Chave: {vendaOrigemInfo.chave_nfe}
                    </div>
                  )}
                </div>
                <div className="text-blue-400 text-sm">
                  Venda selecionada para devolução
                </div>
              </div>
            </div>
          )}

          {/* Seleção de Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-3">
              Cliente para a Devolução <span className="text-gray-500">(opcional)</span>
            </label>
            <div className="flex gap-3">
              <div className="flex-1">
                <ClienteDropdown
                  value={clienteId}
                  onChange={setClienteId}
                  empresaId={empresaId}
                  placeholder="Selecione o cliente (opcional)"
                  required={false}
                />
              </div>
              <button
                onClick={() => setShowNovoClienteModal(true)}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors whitespace-nowrap"
              >
                Novo Cliente
              </button>
            </div>
          </div>

          {/* Lista de Itens Selecionados */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">
              Itens para Devolução ({itensSelecionados.length})
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {itensComDadosFiscais.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  className="bg-gray-800/50 rounded-lg border border-gray-700"
                >
                  <div className="flex items-center justify-between p-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-white font-medium">{item.nome_produto}</div>
                        {/* Botão para expandir dados fiscais */}
                        {item.dadosFiscais && (
                          <button
                            onClick={() => toggleItemExpansion(item.id)}
                            className="text-xs px-2 py-1 bg-orange-600/20 text-orange-400 rounded border border-orange-600/30 hover:bg-orange-600/30 transition-colors"
                          >
                            Dados Fiscais
                          </button>
                        )}
                      </div>
                      <div className="text-gray-400 text-sm">
                        Qtd: {item.quantidade} | Unit: {formatCurrency(item.valor_unitario)}
                      </div>
                    </div>
                    <div className="text-white font-semibold">
                      {formatCurrency(item.valor_total_item)}
                    </div>
                  </div>

                  {/* Dados Fiscais Expandidos */}
                  {expandedItems.has(item.id) && item.dadosFiscais && (
                    <div className="px-3 pb-3">
                      <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs px-2 py-1 bg-orange-600/20 text-orange-400 rounded border border-orange-600/30">
                            Dados Fiscais
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
                          <div>
                            <span className="text-gray-400">NCM:</span>
                            <div className="text-white font-mono">{item.dadosFiscais.ncm || '-'}</div>
                          </div>
                          <div>
                            <span className="text-gray-400">CFOP:</span>
                            <div className="text-white font-mono">{item.dadosFiscais.cfop || '-'}</div>
                          </div>
                          <div>
                            <span className="text-gray-400">CSOSN:</span>
                            <div className="text-white font-mono">{item.dadosFiscais.csosn_icms || '-'}</div>
                          </div>
                          <div>
                            <span className="text-gray-400">Alíquota:</span>
                            <div className="text-white font-mono">{item.dadosFiscais.aliquota_icms ? `${item.dadosFiscais.aliquota_icms}%` : '-'}</div>
                          </div>
                          <div>
                            <span className="text-gray-400">PIS:</span>
                            <div className="text-white font-mono">{item.dadosFiscais.aliquota_pis ? `${item.dadosFiscais.aliquota_pis}%` : '-'}</div>
                          </div>
                          <div>
                            <span className="text-gray-400">COFINS:</span>
                            <div className="text-white font-mono">{item.dadosFiscais.aliquota_cofins ? `${item.dadosFiscais.aliquota_cofins}%` : '-'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Valor Total */}
          <div className="border-t border-gray-700 pt-4">
            <div className="flex items-center justify-between text-lg">
              <span className="text-gray-400">Valor Total da Devolução:</span>
              <span className="text-white font-bold text-xl">
                {formatCurrency(valorTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-800 flex items-center justify-between">
          <button
            onClick={() => {
              setExpandedItems(new Set());
              setItensComDadosFiscais([]);
              onClose();
            }}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleConfirm('manual')}
              disabled={isLoading}
              className="px-6 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              {isLoading ? 'Criando Devolução...' : 'Confirmar Devolução Manual'}
            </button>

            <button
              onClick={() => handleConfirm('nfce')}
              disabled={isLoading}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              {isLoading ? 'Criando Devolução...' : 'Confirmar Devolução NFC-e'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Formulário Completo de Novo Cliente */}
      <ClienteFormCompleto
        isOpen={showNovoClienteModal}
        onClose={() => setShowNovoClienteModal(false)}
        empresaId={empresaId}
        onClienteCreated={(novoClienteId) => {
          setClienteId(novoClienteId);
          setShowNovoClienteModal(false);
        }}
        fornecedorMode={false}
      />
    </div>
  );
};

export default NovaDevolucaoModal;
