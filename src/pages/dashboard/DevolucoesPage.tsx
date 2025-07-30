import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Calendar, Clock, CheckCircle, AlertCircle, X, Edit, RotateCcw, Plus, DollarSign, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { isDesktopScreen } from '../../config/responsive';
import { Devolucao } from '../../types';
import NovaDevolucaoModal from '../../components/devolucao/NovaDevolucaoModal';

const DevolucoesPage: React.FC = () => {
  const [devolucoes, setDevolucoes] = useState<Devolucao[]>([]);
  const [filteredDevolucoes, setFilteredDevolucoes] = useState<Devolucao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [dataFilter, setDataFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showNovaDevolucaoModal, setShowNovaDevolucaoModal] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  
  // Detectar se é tela grande
  const isLargeScreen = window.innerWidth >= 1024;

  // Função para aplicar filtros
  const applyFilters = () => {
    let filtered = [...devolucoes];

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(devolucao =>
        devolucao.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        devolucao.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        devolucao.pedido_numero?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por status
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(devolucao => devolucao.status === statusFilter);
    }

    // Filtro por data
    if (dataFilter) {
      filtered = filtered.filter(devolucao => {
        const devolucaoDate = new Date(devolucao.created_at).toISOString().split('T')[0];
        return devolucaoDate === dataFilter;
      });
    }

    setFilteredDevolucoes(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [devolucoes, searchTerm, statusFilter, dataFilter]);

  const loadDevolucoes = async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }

      // Obter o usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Obter empresa do usuário
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // Buscar devoluções reais da empresa
      // TODO: Implementar quando a tabela devolucoes for criada
      // Por enquanto, retorna array vazio
      const { data: devolucoesData, error } = await supabase
        .from('devolucoes')
        .select(`
          *,
          cliente:clientes(nome, telefone),
          pedido:pdv(numero_venda, created_at)
        `)
        .eq('empresa_id', usuarioData.empresa_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar devoluções:', error);
        // Se a tabela não existir ainda, usar array vazio
        setDevolucoes([]);
        return;
      }

      setDevolucoes(devolucoesData || []);
    } catch (error) {
      console.error('Erro ao carregar devoluções:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDevolucoes();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'text-yellow-400 border-yellow-400';
      case 'processada':
        return 'text-green-400 border-green-400';
      case 'cancelada':
        return 'text-red-400 border-red-400';
      default:
        return 'text-gray-400 border-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'Pendente';
      case 'processada':
        return 'Processada';
      case 'cancelada':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const getFormaReembolsoText = (forma: string) => {
    switch (forma) {
      case 'dinheiro':
        return 'Dinheiro';
      case 'credito':
        return 'Crédito';
      case 'troca':
        return 'Troca';
      case 'estorno_cartao':
        return 'Estorno Cartão';
      default:
        return forma;
    }
  };

  const handleNovaDevolucao = () => {
    setShowNovaDevolucaoModal(true);
  };

  const handleConfirmDevolucao = (vendaId: string, vendaData: any) => {
    console.log('Venda selecionada para devolução:', { vendaId, vendaData });
    // TODO: Implementar criação da devolução
    // Por enquanto, apenas fecha o modal
    setShowNovaDevolucaoModal(false);
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

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={`${isLargeScreen ? 'h-full flex flex-col space-y-4' : 'space-y-2'}`}>
        <div className="flex items-center justify-between">
          <div className="h-7 w-32 bg-gray-700 rounded animate-pulse"></div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-32 bg-gray-700 rounded animate-pulse"></div>
            <div className="h-9 w-9 bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="h-10 bg-gray-700 rounded animate-pulse"></div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 bg-background-card rounded border border-gray-800">
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-32 bg-gray-700 rounded animate-pulse"></div>
                </div>
                <div className="h-6 w-12 bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Detectar se está na versão web e se é desktop
  const isWebVersion = window.location.pathname.startsWith('/dashboard');
  const showAddButton = isWebVersion && isDesktopScreen();

  return (
    <div className={`${isLargeScreen ? 'h-full flex flex-col space-y-4' : 'space-y-2'}`}>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Devoluções</h1>
        <div className="flex items-center gap-2">
          {/* Botão Nova Devolução - apenas na versão web E em desktop */}
          {showAddButton && (
            <button
              onClick={handleNovaDevolucao}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
            >
              <Plus size={18} />
              <span>Nova Devolução</span>
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Barra de busca */}
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar devoluções por cliente, número ou pedido..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-800/50 border border-gray-700 rounded py-2 pl-9 pr-3 text-white text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
        />
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      </div>

      {/* Filtros */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gray-800/50 border border-gray-700 rounded p-3 space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Status da Devolução
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['todos', 'pendente', 'processada', 'cancelada'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        statusFilter === status
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {status === 'todos' ? 'Todos' : getStatusText(status)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Data da Devolução
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar size={16} className="text-gray-500" />
                  </div>
                  <input
                    type="date"
                    value={dataFilter}
                    onChange={(e) => setDataFilter(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded py-2 pl-9 pr-3 text-white text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                  />
                </div>
                {dataFilter && (
                  <div className="flex items-center mt-1.5">
                    <button
                      onClick={() => setDataFilter('')}
                      className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                    >
                      <X size={12} />
                      Limpar filtro de data
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de devoluções */}
      {filteredDevolucoes.length === 0 ? (
        <div className="bg-background-card rounded-lg border border-gray-800 p-8 text-center">
          <RotateCcw size={32} className="text-gray-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-2">
            Nenhuma devolução encontrada
          </h3>
          <p className="text-gray-400 mb-4">
            {searchTerm || statusFilter !== 'todos'
              ? 'Tente ajustar os filtros de busca'
              : 'Você ainda não possui devoluções registradas'}
          </p>
        </div>
      ) : (
        <div className={`space-y-2 ${
          isLargeScreen
            ? 'max-h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar pr-2'
            : 'max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar pr-2'
        }`}>
          {filteredDevolucoes.map((devolucao, index) => (
            <motion.div
              key={devolucao.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-2.5 bg-background-card rounded border border-gray-800 hover:border-gray-700 transition-colors cursor-pointer"
            >
              {/* Layout em três colunas - Compacto */}
              <div className="flex items-start gap-3">
                {/* Coluna Esquerda - Número e Cliente */}
                <div className={`${isLargeScreen ? 'flex-[2]' : 'flex-1'} min-w-0`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-white font-medium text-sm">#{devolucao.numero}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${getStatusColor(devolucao.status)} bg-opacity-20 border`}>
                      {getStatusText(devolucao.status)}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm truncate">
                    {devolucao.cliente_nome || 'Cliente'}
                  </p>
                  {devolucao.pedido_numero && (
                    <p className="text-gray-500 text-xs">
                      Pedido: #{devolucao.pedido_numero}
                    </p>
                  )}
                </div>

                {/* Coluna Central - Detalhes */}
                <div className={`${isLargeScreen ? 'flex-[2]' : 'flex-1'} min-w-0`}>
                  <div className="flex items-center gap-1 mb-0.5">
                    <Package size={12} className="text-gray-500" />
                    <span className="text-xs text-gray-400">
                      {devolucao.tipo_devolucao === 'total' ? 'Total' : 'Parcial'}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs truncate">
                    {getFormaReembolsoText(devolucao.forma_reembolso)}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {formatDate(devolucao.created_at)}
                  </p>
                </div>

                {/* Coluna Direita - Valor e Ações */}
                <div className="flex-shrink-0 text-right">
                  <div className="flex items-center gap-1 mb-1">
                    <DollarSign size={12} className="text-green-400" />
                    <span className="text-white font-medium text-sm">
                      {formatCurrency(devolucao.valor_total)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                      title="Editar devolução"
                    >
                      <Edit size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal Nova Devolução */}
      <NovaDevolucaoModal
        isOpen={showNovaDevolucaoModal}
        onClose={() => setShowNovaDevolucaoModal(false)}
        onConfirm={handleConfirmDevolucao}
      />
    </div>
  );
};

export default DevolucoesPage;
