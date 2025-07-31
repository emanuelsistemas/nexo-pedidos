import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Calendar, Clock, CheckCircle, AlertCircle, X, Edit, RotateCcw, Plus, DollarSign, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { isDesktopScreen } from '../../config/responsive';
import { Devolucao } from '../../types';
import NovaDevolucaoModal from '../../components/devolucao/NovaDevolucaoModal';
import DetalhesDevolucaoModal from '../../components/devolucao/DetalhesDevolucaoModal';

import EditarDevolucaoModal from '../../components/devolucao/EditarDevolucaoModal';
import { devolucaoService, CriarDevolucaoData } from '../../services/devolucaoService';

const DevolucoesPage: React.FC = () => {
  const [devolucoes, setDevolucoes] = useState<Devolucao[]>([]);
  const [filteredDevolucoes, setFilteredDevolucoes] = useState<Devolucao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [dataFilter, setDataFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showNovaDevolucaoModal, setShowNovaDevolucaoModal] = useState(false);

  const [showEditarModal, setShowEditarModal] = useState(false);
  const [devolucaoSelecionada, setDevolucaoSelecionada] = useState<Devolucao | null>(null);
  const [isCreatingDevolucao, setIsCreatingDevolucao] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Estados para modal de detalhes
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [devolucaoDetalhes, setDevolucaoDetalhes] = useState<Devolucao | null>(null);

  // Estados para modal de exclusão
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [devolucaoParaDeletar, setDevolucaoParaDeletar] = useState<Devolucao | null>(null);
  const [isDeletingDevolucao, setIsDeletingDevolucao] = useState(false);

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

      // Usar o serviço para carregar devoluções
      const filtros = {
        status: statusFilter !== 'todos' ? statusFilter : undefined,
        dataInicio: dataFilter || undefined,
        searchTerm: searchTerm || undefined,
        limite: 100
      };

      const devolucoesList = await devolucaoService.listarDevolucoes(filtros);
      setDevolucoes(devolucoesList);
    } catch (error) {
      console.error('Erro ao carregar devoluções:', error);
      // Em caso de erro, manter array vazio
      setDevolucoes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDevolucoes();
  }, []);

  // Recarregar quando filtros mudarem
  useEffect(() => {
    if (devolucoes.length > 0) { // Só recarregar se já tiver carregado uma vez
      loadDevolucoes(false);
    }
  }, [statusFilter, dataFilter, searchTerm]);

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

  const handleConfirmDevolucao = async (vendaId: string, vendaData: any) => {
    try {
      setIsCreatingDevolucao(true);

      // Verificar se temos dados válidos
      if (!vendaData || !vendaData.itens || vendaData.itens.length === 0) {
        console.error('Dados de devolução inválidos:', vendaData);
        alert('Erro: Nenhum item selecionado para devolução');
        return;
      }

      // Filtrar apenas itens que são produtos reais (têm produto_id)
      const itensValidos = vendaData.itens.filter((item: any) => {
        return item.produto_id !== null && item.produto_id !== undefined;
      });

      if (itensValidos.length === 0) {
        alert('Erro: Nenhum produto válido selecionado para devolução.\n\nTaxas de entrega, serviços e outros itens sem produto não podem ser devolvidos.');
        return;
      }

      // Mapear itens válidos para o formato esperado pelo serviço
      const itensFormatados = itensValidos.map((item: any) => {
        const itemFormatado = {
          produto_id: item.produto_id,
          produto_nome: item.nome_produto,
          produto_codigo: item.codigo_produto || null,
          pdv_item_id: item.id, // ID do item original da venda
          venda_origem_id: item.pdv_id, // ID da venda original
          venda_origem_numero: vendaData.vendaOrigem?.numero || vendaData.numeroVenda || null, // Número da venda selecionada
          quantidade: item.quantidade,
          preco_unitario: item.valor_unitario,
          preco_total: item.valor_total_item,
          motivo: 'Devolução solicitada pelo cliente'
        };

        // Debug: Log do item formatado
        console.log('🔍 Debug frontend - Item formatado:', itemFormatado);

        return itemFormatado;
      });

      // Calcular valor total apenas dos itens válidos (produtos reais)
      const valorTotalValido = itensFormatados.reduce((total, item) => total + item.preco_total, 0);

      // Preparar dados para criação da devolução
      const dadosDevolucao: CriarDevolucaoData = {
        clienteId: vendaData.clienteId || undefined,
        clienteNome: vendaData.clienteNome || undefined,
        clienteTelefone: vendaData.clienteTelefone || undefined,
        clienteEmail: vendaData.clienteEmail || undefined,
        itens: itensFormatados,
        valorTotal: valorTotalValido, // Usar apenas o valor dos produtos válidos
        tipoDevolucao: vendaData.vendasCompletas?.length > 0 ? 'total' : 'parcial',
        formaReembolso: 'dinheiro', // Padrão - pode ser alterado depois
        motivoGeral: 'Devolução solicitada pelo cliente',
        observacoes: `Itens selecionados: ${itensFormatados.length} produtos (Valor: R$ ${valorTotalValido.toFixed(2)})${vendaData.vendaOrigem ? ` - Venda origem: #${vendaData.vendaOrigem.numero}` : ''}`,
        pedidoTipo: 'pdv',
        // Adicionar informações da venda origem se disponível
        ...(vendaData.vendaOrigem && {
          pedidoId: vendaData.vendaOrigem.id,
          pedidoNumero: vendaData.vendaOrigem.numero
        })
      };

      // Debug: Log dos dados completos da devolução
      console.log('🔍 Debug frontend - Dados completos da devolução:', {
        dadosDevolucao,
        vendaData,
        vendaOrigem: vendaData.vendaOrigem
      });

      // Criar a devolução
      const novaDevolucao = await devolucaoService.criarDevolucao(dadosDevolucao);

      // Mostrar mensagem de sucesso
      setSuccessMessage(`Devolução #${novaDevolucao.numero} criada com sucesso!`);
      setShowSuccessMessage(true);

      // Recarregar a lista de devoluções
      await loadDevolucoes(false);

      // Fechar o modal
      setShowNovaDevolucaoModal(false);

      // Esconder mensagem de sucesso após 3 segundos
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);

    } catch (error) {
      console.error('Erro ao criar devolução:', error);
      alert(`Erro ao criar devolução: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsCreatingDevolucao(false);
    }
  };

  const handleEditarDevolucao = (devolucao: Devolucao) => {
    setDevolucaoSelecionada(devolucao);
    setShowEditarModal(true);
  };

  const handleVerDetalhes = (devolucao: Devolucao) => {
    setDevolucaoDetalhes(devolucao);
    setShowDetalhesModal(true);
  };

  const handleDeletarDevolucao = (devolucao: Devolucao) => {
    setDevolucaoParaDeletar(devolucao);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!devolucaoParaDeletar) return;

    // Verificar se a devolução já foi processada
    if (devolucaoParaDeletar.status === 'processada') {
      alert('Esta devolução não pode ser cancelada pois já foi processada no PDV. Para cancelar, é necessário cancelar a venda no PDV primeiro.');
      setShowDeleteModal(false);
      setDevolucaoParaDeletar(null);
      return;
    }

    try {
      setIsDeletingDevolucao(true);

      // Deletar a devolução usando o serviço
      await devolucaoService.deletarDevolucao(devolucaoParaDeletar.id);

      // Recarregar a lista de devoluções
      await loadDevolucoes(false);

      // Fechar o modal
      setShowDeleteModal(false);
      setDevolucaoParaDeletar(null);

      // Mostrar mensagem de sucesso
      setSuccessMessage('Devolução cancelada com sucesso!');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);

    } catch (error) {
      console.error('Erro ao deletar devolução:', error);
      alert(`Erro ao cancelar devolução: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsDeletingDevolucao(false);
    }
  };

  const handleConfirmEdicao = async (dadosAtualizados: any) => {
    if (!devolucaoSelecionada) return;

    try {
      await devolucaoService.atualizarDevolucao(
        devolucaoSelecionada.id,
        dadosAtualizados
      );

      // Recarregar a lista de devoluções
      await loadDevolucoes(false);

      // Fechar o modal
      setShowEditarModal(false);
      setDevolucaoSelecionada(null);

    } catch (error) {
      console.error('Erro ao editar devolução:', error);
      // TODO: Mostrar toast de erro
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
      {/* Mensagem de Sucesso */}
      <AnimatePresence>
        {showSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-green-600 text-white p-3 rounded-lg border border-green-500 flex items-center gap-2"
          >
            <CheckCircle size={20} />
            <span>{successMessage}</span>
            <button
              onClick={() => setShowSuccessMessage(false)}
              className="ml-auto p-1 hover:bg-green-700 rounded"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
              onClick={() => handleVerDetalhes(devolucao)}
            >
              {/* Layout em três colunas - Compacto */}
              <div className="flex items-start gap-3">
                {/* Coluna Esquerda - Número e Cliente */}
                <div className={`${isLargeScreen ? 'flex-[2]' : 'flex-1'} min-w-0`}>
                  {/* Código de Troca */}
                  {devolucao.codigo_troca && (
                    <div className="mb-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30 font-mono">
                          {devolucao.codigo_troca}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(devolucao.codigo_troca);
                            // Toast de confirmação
                            const toast = document.createElement('div');
                            toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity';
                            toast.textContent = 'Código copiado!';
                            document.body.appendChild(toast);
                            setTimeout(() => {
                              toast.style.opacity = '0';
                              setTimeout(() => document.body.removeChild(toast), 300);
                            }, 2000);
                          }}
                          className="text-blue-400 hover:text-blue-300 transition-colors p-1"
                          title="Copiar código"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-white font-medium text-sm">#{devolucao.numero}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${getStatusColor(devolucao.status)} bg-opacity-20 border`}>
                      {getStatusText(devolucao.status)}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm truncate">
                    {devolucao.cliente_nome || 'Sem Cliente'}
                  </p>
                  {/* Número do pedido removido conforme solicitado */}
                </div>

                {/* Coluna Central - Detalhes da Devolução */}
                <div className={`${isLargeScreen ? 'flex-[2]' : 'flex-1'} min-w-0`}>
                  <div className="space-y-1">
                    {/* Data da devolução */}
                    <p className="text-gray-400 text-xs">
                      {formatDate(devolucao.created_at)}
                    </p>

                    {/* Número da venda origem */}
                    {devolucao.venda_origem_numero && (
                      <p className="text-gray-500 text-xs">
                        Venda: #{devolucao.venda_origem_numero}
                      </p>
                    )}

                    {/* Quantidade de itens */}
                    <p className="text-gray-500 text-xs">
                      {devolucao.itens?.length || 0} item(ns)
                    </p>
                  </div>
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
                    {/* Botão de editar removido conforme solicitado */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletarDevolucao(devolucao);
                      }}
                      className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-900/30 transition-colors"
                      title="Deletar devolução"
                    >
                      <X size={14} />
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
        onClose={() => !isCreatingDevolucao && setShowNovaDevolucaoModal(false)}
        onConfirm={handleConfirmDevolucao}
        isLoading={isCreatingDevolucao}
      />

      {/* Modal Detalhes da Devolução */}
      <DetalhesDevolucaoModal
        isOpen={showDetalhesModal}
        onClose={() => {
          setShowDetalhesModal(false);
          setDevolucaoDetalhes(null);
        }}
        devolucao={devolucaoDetalhes}
      />

      {/* Modal Editar Devolução */}
      <EditarDevolucaoModal
        isOpen={showEditarModal}
        onClose={() => {
          setShowEditarModal(false);
          setDevolucaoSelecionada(null);
        }}
        devolucao={devolucaoSelecionada}
        onConfirm={handleConfirmEdicao}
      />

      {/* Modal Confirmação de Exclusão */}
      {showDeleteModal && devolucaoParaDeletar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-card rounded-lg border border-gray-800 w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-xl font-semibold text-white">
                Cancelar Devolução
              </h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDevolucaoParaDeletar(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
                disabled={isDeletingDevolucao}
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                  <X size={24} className="text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-white mb-2">
                    Tem certeza que deseja cancelar esta devolução?
                  </h3>
                  <div className="space-y-2 text-sm text-gray-400">
                    <p><strong>Devolução:</strong> #{devolucaoParaDeletar.numero}</p>
                    <p><strong>Código:</strong> {devolucaoParaDeletar.codigo_troca}</p>
                    <p><strong>Status:</strong> {devolucaoParaDeletar.status}</p>
                    <p><strong>Valor:</strong> R$ {devolucaoParaDeletar.valor_total?.toFixed(2)}</p>
                  </div>
                  <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-yellow-400 text-sm">
                      ⚠️ Esta ação não pode ser desfeita. Os produtos ficarão disponíveis para nova devolução.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-800">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDevolucaoParaDeletar(null);
                }}
                disabled={isDeletingDevolucao}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeletingDevolucao}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
              >
                {isDeletingDevolucao ? 'Cancelando...' : 'Sim, Cancelar Devolução'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevolucoesPage;
