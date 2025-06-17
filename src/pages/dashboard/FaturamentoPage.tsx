import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Calendar, Clock, CheckCircle, AlertCircle, X, DollarSign, User, Building, FileText, Edit, Share2, Copy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { verificarTipoControleEstoque, atualizarEstoquePorPedido } from '../../utils/estoqueUtils';

interface Pedido {
  id: string;
  numero: string;
  cliente_id: string;
  valor_total: number;
  status: string;
  created_at: string;
  usuario_id: string;
  usuario_nome?: string;
  empresa_id: string;
  empresa_nome?: string;
  data_faturamento?: string;
  cliente?: {
    nome: string;
    telefone: string;
  };
}

interface Usuario {
  id: string;
  nome: string;
}



const FaturamentoPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filteredPedidos, setFilteredPedidos] = useState<Pedido[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [dataInicioFilter, setDataInicioFilter] = useState<string>('');
  const [dataFimFilter, setDataFimFilter] = useState<string>('');
  const [vendedorFilter, setVendedorFilter] = useState<string>('todos');
  const [vendedores, setVendedores] = useState<Usuario[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);
  const [isFaturando, setIsFaturando] = useState(false);
  const [observacaoFaturamento, setObservacaoFaturamento] = useState('');

  useEffect(() => {
    loadPedidos();
    loadVendedores();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [pedidos, searchTerm, statusFilter, dataInicioFilter, dataFimFilter, vendedorFilter]);

  const loadVendedores = async () => {
    try {
      // Obter o usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Obter a empresa do usuário
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // Carregar todos os usuários da empresa (não apenas vendedores)
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          id,
          nome,
          tipo_user_config_id
        `)
        .eq('empresa_id', usuarioData.empresa_id)
        .order('nome');

      if (error) throw error;
      setVendedores(data || []);
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
    }
  };



  const loadPedidos = async () => {
    try {
      setIsLoading(true);

      // Obter o usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Obter a empresa do usuário
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // Carregar apenas os pedidos da empresa do usuário
      const { data: pedidosData, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          empresa:empresas(nome),
          cliente:clientes(nome, telefone)
        `)
        .eq('empresa_id', usuarioData.empresa_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Se não temos pedidos, retornamos uma lista vazia
      if (!pedidosData || pedidosData.length === 0) {
        setPedidos([]);
        setFilteredPedidos([]);
        return;
      }

      // Extraímos os IDs de usuários únicos dos pedidos
      const usuarioIds = [...new Set(pedidosData.filter(p => p.usuario_id).map(p => p.usuario_id))];

      // Se temos IDs de usuários, buscamos seus nomes
      let usuariosMap = {};
      if (usuarioIds.length > 0) {
        const { data: usuariosData, error: usuariosError } = await supabase
          .from('usuarios')
          .select('id, nome')
          .in('id', usuarioIds);

        if (!usuariosError && usuariosData) {
          // Criamos um mapa de ID -> nome para fácil acesso
          usuariosMap = usuariosData.reduce((acc, user) => {
            acc[user.id] = user.nome;
            return acc;
          }, {});
        }
      }

      // Formatar dados dos pedidos com os nomes de usuários
      const formattedPedidos = pedidosData.map(pedido => ({
        ...pedido,
        usuario_nome: usuarioIds.includes(pedido.usuario_id) ? usuariosMap[pedido.usuario_id] : undefined,
        empresa_nome: pedido.empresa?.nome
      }));

      setPedidos(formattedPedidos);
      setFilteredPedidos(formattedPedidos);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      toast.error('Erro ao carregar pedidos');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...pedidos];

    // Aplicar filtro de busca
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        pedido =>
          pedido.cliente?.nome?.toLowerCase().includes(searchLower) ||
          pedido.numero?.toLowerCase().includes(searchLower) ||
          pedido.usuario_nome?.toLowerCase().includes(searchLower)
      );
    }

    // Aplicar filtro de status
    if (statusFilter !== 'todos') {
      if (statusFilter === 'faturado') {
        // Filtrar pedidos faturados (status entregue com data de faturamento)
        filtered = filtered.filter(pedido => pedido.status === 'entregue' && pedido.data_faturamento);
      } else if (statusFilter === 'pendente') {
        // Filtrar todos os pedidos pendentes (incluindo pendentes de faturamento)
        filtered = filtered.filter(pedido =>
          pedido.status === 'pendente' ||
          pedido.status === 'confirmado' ||
          pedido.status === 'em_preparo' ||
          pedido.status === 'em_entrega' ||
          (pedido.status === 'entregue' && !pedido.data_faturamento)
        );
      } else if (statusFilter === 'cancelado') {
        // Filtrar pedidos cancelados
        filtered = filtered.filter(pedido => pedido.status === 'cancelado');
      }
    }

    // Aplicar filtro de data inicial
    if (dataInicioFilter) {
      const dataInicio = new Date(dataInicioFilter);
      dataInicio.setHours(0, 0, 0, 0);
      filtered = filtered.filter(pedido => new Date(pedido.created_at) >= dataInicio);
    }

    // Aplicar filtro de data final
    if (dataFimFilter) {
      const dataFim = new Date(dataFimFilter);
      dataFim.setHours(23, 59, 59, 999);
      filtered = filtered.filter(pedido => new Date(pedido.created_at) <= dataFim);
    }

    // Aplicar filtro de vendedor
    if (vendedorFilter !== 'todos') {
      filtered = filtered.filter(pedido => pedido.usuario_id === vendedorFilter);
    }



    setFilteredPedidos(filtered);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string, dataFaturamento?: string) => {
    // Se tiver data de faturamento, sempre usar a cor de faturado
    if (dataFaturamento) {
      return 'bg-green-500/10 text-green-500';
    }

    // Se o status for 'faturado', usar a cor de faturado mesmo sem data
    if (status === 'faturado') {
      return 'bg-green-500/10 text-green-500';
    }

    switch (status) {
      case 'pendente': return 'bg-yellow-500/10 text-yellow-500';
      case 'confirmado': return 'bg-blue-500/10 text-blue-500';
      case 'em_preparo': return 'bg-orange-500/10 text-orange-500';
      case 'em_entrega': return 'bg-purple-500/10 text-purple-500';
      case 'entregue': return 'bg-teal-500/10 text-teal-500';
      case 'cancelado': return 'bg-red-500/10 text-red-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getStatusText = (status: string, dataFaturamento?: string) => {
    // Se tiver data de faturamento, sempre mostrar como FATURADO
    if (dataFaturamento) {
      return 'FATURADO';
    }

    // Se o status for 'faturado', mostrar como FATURADO mesmo sem data
    if (status === 'faturado') {
      return 'FATURADO';
    }

    switch (status) {
      case 'pendente': return 'Pendente';
      case 'confirmado': return 'Confirmado';
      case 'em_preparo': return 'Em Preparo';
      case 'em_entrega': return 'Em Entrega';
      case 'entregue': return 'Entregue';
      case 'cancelado': return 'Cancelado';
      default: return 'Pendente'; // Fallback para status desconhecido
    }
  };

  const handleFaturar = (pedido: Pedido) => {
    setPedidoSelecionado(pedido);
    setObservacaoFaturamento('');
    setShowModal(true);
  };

  const handleEditar = async (pedido: Pedido) => {
    try {
      // Não vamos mais alterar o status do pedido automaticamente
      // Apenas redirecionar para a página de edição
      navigate(`/dashboard/editar-pedido/${pedido.id}`);
    } catch (error: any) {
      console.error('Erro ao abrir pedido para edição:', error);
      toast.error(`Erro ao abrir pedido: ${error.message}`);
    }
  };

  const handleConfirmarFaturamento = async () => {
    if (!pedidoSelecionado) return;

    setIsFaturando(true);

    try {
      // Obter o usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const dataFaturamento = new Date().toISOString();

      const { error } = await supabase
        .from('pedidos')
        .update({
          status: 'faturado',
          data_faturamento: dataFaturamento,
          observacao_faturamento: observacaoFaturamento || null
        })
        .eq('id', pedidoSelecionado.id);

      if (error) throw error;

      // Verificar o tipo de controle de estoque configurado
      const tipoControle = await verificarTipoControleEstoque(supabase, pedidoSelecionado.empresa_id);

      // Se o tipo de controle for por faturamento, atualizar o estoque agora
      if (tipoControle === 'faturamento') {
        const resultado = await atualizarEstoquePorPedido(
          supabase,
          pedidoSelecionado.id,
          pedidoSelecionado.empresa_id,
          userData.user.id,
          'saida',
          'faturamento'
        );

        if (!resultado.success) {
          console.warn('Aviso ao atualizar estoque:', resultado.message);
          toast.warning(resultado.message);
        }
      }

      toast.success('Pedido faturado com sucesso!');
      setShowModal(false);
      loadPedidos();
    } catch (error: any) {
      console.error('Erro ao faturar pedido:', error);
      toast.error(`Erro ao faturar pedido: ${error.message}`);
    } finally {
      setIsFaturando(false);
    }
  };



  const calcularTotalFiltrado = () => {
    return filteredPedidos.reduce((total, pedido) => total + pedido.valor_total, 0);
  };

  // Função para gerar o link público do pedido
  const gerarLinkPedido = async (pedido: Pedido) => {
    try {
      // Buscar o CNPJ da empresa
      const { data: empresaData, error: empresaError } = await supabase
        .from('empresas')
        .select('documento')
        .eq('id', pedido.empresa_id)
        .single();

      if (empresaError || !empresaData || !empresaData.documento) {
        throw new Error('Não foi possível obter o CNPJ da empresa');
      }

      // Remover caracteres não numéricos do CNPJ (pontos, traços, barras)
      const cnpjLimpo = empresaData.documento.replace(/[^\d]/g, '');

      // Gerar o código do pedido (CNPJ + número do pedido)
      const codigoPedido = `${cnpjLimpo}${pedido.numero}`;

      // Gerar a URL completa
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/pedido/${codigoPedido}`;

      return url;
    } catch (error: any) {
      console.error('Erro ao gerar link do pedido:', error);
      toast.error(`Erro ao gerar link: ${error.message}`);
      return null;
    }
  };

  // Função para copiar o link para a área de transferência
  const copiarLinkPedido = async (pedido: Pedido) => {
    const url = await gerarLinkPedido(pedido);

    if (url) {
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link copiado para a área de transferência!');
      } catch (error) {
        console.error('Erro ao copiar link:', error);
        toast.error('Não foi possível copiar o link');
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-white">Faturamento</h1>
        <div className="text-lg font-medium text-primary-400">
          Total: {formatCurrency(calcularTotalFiltrado())}
        </div>
      </div>

      <div className="bg-background-card rounded-lg border border-gray-800 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          {/* Barra de busca */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar por cliente, número do pedido ou vendedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
            />
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <Filter size={18} />
            <span>Filtros</span>
          </button>
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
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Filtro de Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                    >
                      <option value="todos">Todas</option>
                      <option value="faturado">Faturado</option>
                      <option value="pendente">Pendentes</option>
                      <option value="cancelado">Cancelados</option>
                    </select>
                  </div>

                  {/* Filtro de Data Inicial */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Data Inicial
                    </label>
                    <input
                      type="date"
                      value={dataInicioFilter}
                      onChange={(e) => setDataInicioFilter(e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                    />
                  </div>

                  {/* Filtro de Data Final */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Data Final
                    </label>
                    <input
                      type="date"
                      value={dataFimFilter}
                      onChange={(e) => setDataFimFilter(e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                    />
                  </div>

                  {/* Filtro de Vendedor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Vendedor
                    </label>
                    <select
                      value={vendedorFilter}
                      onChange={(e) => setVendedorFilter(e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                    >
                      <option value="todos">Todos</option>
                      {vendedores.map(vendedor => (
                        <option key={vendedor.id} value={vendedor.id}>{vendedor.nome}</option>
                      ))}
                    </select>
                  </div>



                  {/* Botões de Ação */}
                  <div className="flex items-end gap-2">
                    <button
                      onClick={() => {
                        setStatusFilter('todos');
                        setDataInicioFilter('');
                        setDataFimFilter('');
                        setVendedorFilter('todos');
                      }}
                      className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors"
                    >
                      Limpar Filtros
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Lista de pedidos */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="p-4 bg-background-card rounded-lg border border-gray-800">
              <div className="flex justify-between items-start">
                <div className="space-y-2 w-2/3">
                  <div className="h-5 w-32 bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-40 bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-36 bg-gray-700 rounded animate-pulse"></div>
                </div>
                <div className="space-y-2 w-1/3 flex flex-col items-end">
                  <div className="h-5 w-20 bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-28 bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-8 w-24 bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredPedidos.length === 0 ? (
        <div className="bg-background-card rounded-lg border border-gray-800 p-8 text-center">
          <AlertCircle size={32} className="text-gray-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-2">
            Nenhum pedido encontrado
          </h3>
          <p className="text-gray-400 mb-4">
            Tente ajustar os filtros de busca
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[calc(100vh-350px)] overflow-y-auto custom-scrollbar pr-2">
          {filteredPedidos.map((pedido) => (
            <motion.div
              key={pedido.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-background-card rounded-lg border border-gray-800"
            >
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-white font-medium">#{pedido.numero}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(pedido.status, pedido.data_faturamento)}`}>
                      {getStatusText(pedido.status, pedido.data_faturamento)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-gray-400 text-sm">
                    <User size={14} />
                    <span>Cliente: {pedido.cliente?.nome || 'Cliente'}</span>
                  </div>

                  {pedido.usuario_nome && (
                    <div className="flex items-center gap-1 text-gray-400 text-sm mt-1">
                      <User size={14} />
                      <span>Vendedor: {pedido.usuario_nome}</span>
                    </div>
                  )}



                  <div className="flex items-center gap-1 text-gray-500 text-xs mt-2">
                    <Calendar size={12} />
                    <span>{formatDate(pedido.created_at)}</span>
                    <Clock size={12} className="ml-1" />
                    <span>{formatTime(pedido.created_at)}</span>
                  </div>

                  {pedido.data_faturamento && (
                    <div className="flex items-center gap-1 text-green-500 text-xs mt-1">
                      <FileText size={12} />
                      <span>Faturado em: {formatDate(pedido.data_faturamento)} às {formatTime(pedido.data_faturamento)}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end">
                  <p className="text-primary-400 font-medium text-lg">
                    {formatCurrency(pedido.valor_total)}
                  </p>

                  <div className="flex gap-2 mt-2">
                    {/* Botão de Editar - disponível para todos os pedidos */}
                    <button
                      onClick={() => handleEditar(pedido)}
                      className="px-3 py-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center gap-1.5"
                    >
                      <Edit size={16} />
                      <span>Editar</span>
                    </button>

                    {/* Botão de Faturar - apenas para pedidos entregues não faturados */}
                    {pedido.status === 'entregue' && !pedido.data_faturamento && (
                      <button
                        onClick={() => handleFaturar(pedido)}
                        className="px-3 py-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center gap-1.5"
                      >
                        <DollarSign size={16} />
                        <span>Faturar</span>
                      </button>
                    )}

                    {/* Botão para abrir o pedido em uma nova página */}
                    <button
                      onClick={async () => {
                        const url = await gerarLinkPedido(pedido);
                        if (url) {
                          window.open(url, '_blank');
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors flex items-center gap-1.5"
                      title="Abrir nota de pedido em nova página"
                    >
                      <FileText size={16} />
                      <span className="hidden sm:inline">Abrir</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal de confirmação de faturamento */}
      <AnimatePresence>
        {showModal && pedidoSelecionado && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background-card rounded-lg p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">
                  Confirmar Faturamento
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-gray-300 mb-2">
                  Você está prestes a faturar o pedido:
                </p>
                <div className="bg-gray-800/50 p-3 rounded-lg">
                  <p className="text-white"><strong>Pedido:</strong> #{pedidoSelecionado.numero}</p>
                  <p className="text-white"><strong>Cliente:</strong> {pedidoSelecionado.cliente?.nome || 'Cliente'}</p>
                  <p className="text-white"><strong>Valor:</strong> {formatCurrency(pedidoSelecionado.valor_total)}</p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Observação (opcional)
                </label>
                <textarea
                  value={observacaoFaturamento}
                  onChange={(e) => setObservacaoFaturamento(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                  rows={3}
                  placeholder="Adicione uma observação sobre este faturamento"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarFaturamento}
                  disabled={isFaturando}
                  className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isFaturando ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Processando...</span>
                    </>
                  ) : (
                    <>
                      <DollarSign size={18} />
                      <span>Confirmar Faturamento</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FaturamentoPage;
