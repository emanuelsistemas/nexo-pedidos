import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Calendar, User, Package, DollarSign, Clock, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import ClienteDropdown from '../comum/ClienteDropdown';

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
}

interface NovaDevolucaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (vendaId: string, vendaData: Venda) => void;
}

const NovaDevolucaoModal: React.FC<NovaDevolucaoModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  // Estados do modal
  const [step, setStep] = useState<'cliente' | 'vendas'>('cliente');
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados do cliente
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

  // Carregar empresa do usuário
  useEffect(() => {
    if (isOpen) {
      loadEmpresaId();
    }
  }, [isOpen]);

  // Aplicar filtros nas vendas
  useEffect(() => {
    applyFilters();
  }, [vendas, searchTerm, dataInicio, dataFim]);

  const loadEmpresaId = async () => {
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
      }
    } catch (error) {
      console.error('Erro ao carregar empresa:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...vendas];

    // Filtro por termo de busca (número da venda)
    if (searchTerm) {
      filtered = filtered.filter(venda =>
        venda.numero_venda?.toLowerCase().includes(searchTerm.toLowerCase())
      );
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

  const handleProximoStep = async () => {
    if (step === 'cliente' && clienteId) {
      setStep('vendas');
      await loadVendas();
    }
  };

  const loadVendas = async () => {
    if (!empresaId || !clienteId) return;

    try {
      setIsLoading(true);

      // Buscar vendas do cliente na empresa
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
        .eq('empresa_id', empresaId)
        .eq('cliente_id', clienteId)
        .in('status_venda', ['finalizada', 'paga'])
        .order('created_at', { ascending: false })
        .limit(50);

      const { data, error } = await query;

      if (error) throw error;

      // Contar itens de cada venda
      const vendasComItens = await Promise.all(
        (data || []).map(async (venda) => {
          const { count } = await supabase
            .from('pdv_itens')
            .select('*', { count: 'exact', head: true })
            .eq('pdv_id', venda.id);

          return {
            ...venda,
            itens_count: count || 0
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

  const handleVendaSelect = (venda: Venda) => {
    onConfirm(venda.id, venda);
    handleClose();
  };

  const handleClose = () => {
    setStep('cliente');
    setClienteId('');
    setClienteNome('');
    setClienteTelefone('');
    setVendas([]);
    setFilteredVendas([]);
    setSearchTerm('');
    setDataInicio('');
    setDataFim('');
    setShowFilters(false);
    onClose();
  };

  const handleVoltar = () => {
    if (step === 'vendas') {
      setStep('cliente');
      setVendas([]);
      setFilteredVendas([]);
      setSearchTerm('');
      setDataInicio('');
      setDataFim('');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
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
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full h-full max-w-4xl max-h-[90vh] bg-background-card rounded-lg border border-gray-800 flex flex-col"
      >
        {/* Cabeçalho */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step === 'vendas' && (
              <button
                onClick={handleVoltar}
                className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors"
              >
                ←
              </button>
            )}
            <h2 className="text-xl font-semibold text-white">
              {step === 'cliente' ? 'Nova Devolução - Selecionar Cliente' : 'Selecionar Venda'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-hidden">
          {step === 'cliente' ? (
            // Passo 1: Seleção de Cliente
            <div className="p-6 space-y-6">
              <div className="text-center">
                <User size={48} className="text-primary-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  Selecione o Cliente
                </h3>
                <p className="text-gray-400">
                  Escolha o cliente para buscar suas vendas disponíveis para devolução
                </p>
              </div>

              <div className="max-w-md mx-auto">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Cliente <span className="text-red-500">*</span>
                </label>
                <ClienteDropdown
                  value={clienteId}
                  onChange={handleClienteSelect}
                  empresaId={empresaId}
                  placeholder="Selecione ou busque um cliente"
                  required={true}
                />
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleProximoStep}
                  disabled={!clienteId}
                  className="px-6 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
                >
                  Próximo
                </button>
              </div>
            </div>
          ) : (
            // Passo 2: Seleção de Venda
            <div className="flex flex-col h-full">
              {/* Informações do cliente selecionado */}
              <div className="p-4 bg-gray-800/50 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-gray-400" />
                  <span className="text-white font-medium">{clienteNome}</span>
                  {clienteTelefone && (
                    <span className="text-gray-400">• {clienteTelefone}</span>
                  )}
                </div>
              </div>

              {/* Filtros de busca */}
              <div className="p-4 border-b border-gray-800 space-y-3">
                {/* Barra de busca */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar por número da venda..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded py-2 pl-9 pr-3 text-white text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                  />
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>

                {/* Botão de filtros */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors"
                  >
                    <Filter size={16} />
                    <span className="text-sm">Filtros</span>
                  </button>
                  <span className="text-sm text-gray-400">
                    {filteredVendas.length} venda(s) encontrada(s)
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
              <div className="flex-1 overflow-y-auto p-4">
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
                      {searchTerm || dataInicio || dataFim
                        ? 'Tente ajustar os filtros de busca'
                        : 'Este cliente não possui vendas disponíveis para devolução'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredVendas.map((venda) => (
                      <motion.div
                        key={venda.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-gray-800/30 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
                        onClick={() => handleVendaSelect(venda)}
                      >
                        <div className="flex items-center justify-between">
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
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-white font-medium">
                              <DollarSign size={14} className="text-green-400" />
                              {formatCurrency(venda.valor_total)}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default NovaDevolucaoModal;
