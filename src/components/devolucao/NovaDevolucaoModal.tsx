import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Calendar, User, Package, DollarSign, Clock, Filter, ChevronDown, ChevronUp, Check, Minus } from 'lucide-react';
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
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);

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
          modelo_documento
        `)
        .eq('empresa_id', empresaIdToUse)
        .in('status_venda', ['finalizada', 'paga'])
        .order('created_at', { ascending: false })
        .limit(100);

      const { data, error } = await query;

      if (error) throw error;

      // Buscar produtos que já estão em devoluções pendentes
      const { data: devolucoesPendentes } = await supabase
        .from('devolucao_itens')
        .select(`
          produto_id,
          venda_origem_id,
          devolucoes!inner(status)
        `)
        .eq('devolucoes.status', 'pendente')
        .eq('devolucoes.empresa_id', empresaIdToUse);

      // Criar um Set com os produtos pendentes para busca rápida
      const produtosPendentes = new Set(
        (devolucoesPendentes || []).map(item => `${item.venda_origem_id}-${item.produto_id}`)
      );

      // Contar itens de cada venda e marcar produtos pendentes
      const vendasComItens = await Promise.all(
        (data || []).map(async (venda) => {
          const { data: itens, count } = await supabase
            .from('pdv_itens')
            .select('id, produto_id, nome_produto, quantidade, valor_unitario, valor_total_item')
            .eq('pdv_id', venda.id);

          // Marcar itens que estão pendentes de devolução
          const itensComStatus = (itens || []).map(item => ({
            ...item,
            devolucao_pendente: produtosPendentes.has(`${venda.id}-${item.produto_id}`)
          }));

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

      // Atualizar a venda com os itens carregados
      setVendas(prev => prev.map(venda =>
        venda.id === vendaId
          ? { ...venda, itens: itensData || [] }
          : venda
      ));

      setFilteredVendas(prev => prev.map(venda =>
        venda.id === vendaId
          ? { ...venda, itens: itensData || [] }
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

  const handleVendaSelect = (venda: Venda) => {
    // Coletar todos os itens selecionados
    const itensSelecionados = Array.from(selectedItens);
    const vendasSelecionadas = Array.from(selectedVendas);

    onConfirm(venda.id, venda);
    handleClose();
  };

  const handleSelectVendaCompleta = async (vendaId: string, checked: boolean) => {
    if (checked) {
      setSelectedVendas(prev => new Set([...prev, vendaId]));

      // Carregar itens se ainda não foram carregados
      const venda = vendas.find(v => v.id === vendaId);
      if (venda && !venda.itens) {
        await loadItensVenda(vendaId);
      }

      // Remover itens individuais desta venda se estavam selecionados
      if (venda?.itens) {
        setSelectedItens(prev => {
          const newSet = new Set(prev);
          venda.itens!.forEach(item => newSet.delete(item.id));
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
                                        const isDisabled = isVendaCompleteSelected || !isItemValid || hasDevolucaoPendente;

                                        return (
                                          <div
                                            key={item.id}
                                            className={`flex items-center gap-3 p-2 rounded border ${
                                              hasDevolucaoPendente
                                                ? 'bg-yellow-900/20 border-yellow-600/30 opacity-60'
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
                                                    hasDevolucaoPendente ? 'text-gray-400' : isItemValid ? 'text-white' : 'text-gray-500'
                                                  }`}>
                                                    {item.nome_produto}
                                                  </span>
                                                  {hasDevolucaoPendente && (
                                                    <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded border border-yellow-500/30">
                                                      Pendente
                                                    </span>
                                                  )}
                                                  {!isItemValid && !hasDevolucaoPendente && (
                                                    <span className="text-xs text-orange-400">
                                                      (Não disponível para devolução)
                                                    </span>
                                                  )}
                                                </div>
                                                <span className={`font-medium ${
                                                  hasDevolucaoPendente ? 'text-gray-400' : isItemValid ? 'text-white' : 'text-gray-500'
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

  const itensSelecionados = getItensSelecionados();

  const handleConfirm = () => {
    const dadosDevolucao = {
      clienteId,
      itens: itensSelecionados,
      valorTotal,
      vendasCompletas: Array.from(selectedVendas),
      itensIndividuais: Array.from(selectedItens)
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
              {itensSelecionados.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700"
                >
                  <div className="flex-1">
                    <div className="text-white font-medium">{item.nome_produto}</div>
                    <div className="text-gray-400 text-sm">
                      Qtd: {item.quantidade} | Unit: {formatCurrency(item.valor_unitario)}
                    </div>
                  </div>
                  <div className="text-white font-semibold">
                    {formatCurrency(item.valor_total_item)}
                  </div>
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
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-6 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
          >
            {isLoading ? 'Criando Devolução...' : 'Confirmar Devolução'}
          </button>
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
