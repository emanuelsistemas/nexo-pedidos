import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Calendar, Clock, CheckCircle, AlertCircle, X, Edit, MessageCircle, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { isDesktopScreen } from '../../config/responsive';

interface Pedido {
  id: string;
  numero: string;
  cliente_id: string;
  valor_total: number;
  status: string;
  created_at: string;
  empresa_nome?: string;
  cliente?: {
    nome: string;
    telefone: string;
  };
}

const UserPedidosPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filteredPedidos, setFilteredPedidos] = useState<Pedido[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [dataFilter, setDataFilter] = useState<string>('');
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [empresaWhatsapp, setEmpresaWhatsapp] = useState<string>('');

  useEffect(() => {
    // Tentar carregar dados do localStorage primeiro
    const loadFromLocalStorage = () => {
      try {
        // Verificar se há dados em cache e se não estão expirados (15 minutos)
        const cachedPedidos = localStorage.getItem('pedidos_cache');
        const cachedTimestamp = localStorage.getItem('pedidos_cache_timestamp');

        if (cachedPedidos && cachedTimestamp) {
          const timestamp = parseInt(cachedTimestamp);
          const now = new Date().getTime();
          const fifteenMinutesInMs = 15 * 60 * 1000; // Pedidos precisam ser mais atualizados

          // Se o cache for válido (menos de 15 minutos)
          if (now - timestamp < fifteenMinutesInMs) {
            console.log('Carregando dados de pedidos do cache local');
            setPedidos(JSON.parse(cachedPedidos));
            setIsInitialLoading(false);

            // Ainda carregamos os dados do servidor, mas não mostramos o loading
            loadPedidos(false);
            return true;
          } else {
            console.log('Cache de pedidos expirado, carregando do servidor');
            // Limpar cache expirado
            localStorage.removeItem('pedidos_cache');
            localStorage.removeItem('pedidos_cache_timestamp');
          }
        }
        return false;
      } catch (error) {
        console.error('Erro ao carregar dados do localStorage:', error);
        return false;
      }
    };

    // Se não conseguir carregar do localStorage, carregar do servidor com loading
    if (!loadFromLocalStorage()) {
      loadPedidos(true);

      // Definir um timeout para remover o loading inicial após 2 segundos
      // mesmo se os dados ainda não tiverem sido carregados
      const timer = setTimeout(() => {
        setIsInitialLoading(false);
      }, 2000);

      return () => clearTimeout(timer);
    }

    // Carregar o WhatsApp da empresa
    loadEmpresaWhatsapp();
  }, []);

  const loadEmpresaWhatsapp = async () => {
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

      // Obter o WhatsApp da empresa
      const { data: empresaData } = await supabase
        .from('empresas')
        .select('whatsapp')
        .eq('id', usuarioData.empresa_id)
        .single();

      if (empresaData && empresaData.whatsapp) {
        setEmpresaWhatsapp(empresaData.whatsapp);
      }
    } catch (error) {
      console.error('Erro ao carregar WhatsApp da empresa:', error);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [pedidos, searchTerm, statusFilter, dataFilter]);

  const loadPedidos = async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }

      // Obter o usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Obter pedidos do usuário
      const { data: pedidosData, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          empresa:empresas(nome),
          cliente:clientes(nome, telefone)
        `)
        .eq('usuario_id', userData.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Formatar dados dos pedidos
      const formattedPedidos = pedidosData?.map(pedido => ({
        ...pedido,
        empresa_nome: pedido.empresa?.nome
      })) || [];

      setPedidos(formattedPedidos);

      // Salvar dados no localStorage
      try {
        localStorage.setItem('pedidos_cache', JSON.stringify(formattedPedidos));
        localStorage.setItem('pedidos_cache_timestamp', new Date().getTime().toString());
        console.log('Dados de pedidos salvos no cache local');
      } catch (cacheError) {
        console.error('Erro ao salvar pedidos no localStorage:', cacheError);
      }
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
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
          pedido.numero?.toLowerCase().includes(searchLower)
      );
    }

    // Aplicar filtro de status
    if (statusFilter !== 'todos') {
      if (statusFilter === 'faturado') {
        // Considerar pedidos entregues como faturados
        filtered = filtered.filter(pedido => pedido.status === 'entregue');
      } else {
        filtered = filtered.filter(pedido => pedido.status === statusFilter);
      }
    }

    // Aplicar filtro de data
    if (dataFilter) {
      const dataFiltro = new Date(dataFilter);
      dataFiltro.setHours(0, 0, 0, 0);

      const dataFiltroFim = new Date(dataFilter);
      dataFiltroFim.setHours(23, 59, 59, 999);

      filtered = filtered.filter(pedido => {
        const dataPedido = new Date(pedido.created_at);
        return dataPedido >= dataFiltro && dataPedido <= dataFiltroFim;
      });
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
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatWhatsAppNumber = (phone: string) => {
    // Remove todos os caracteres não numéricos
    const cleanNumber = phone.replace(/\D/g, '');

    // Verifica se o número já tem o código do país
    if (cleanNumber.startsWith('55')) {
      return cleanNumber;
    }

    // Adiciona o código do Brasil (55) se não tiver
    return `55${cleanNumber}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return 'text-yellow-500';
      case 'confirmado': return 'text-blue-500';
      case 'em_preparo': return 'text-orange-500';
      case 'em_entrega': return 'text-purple-500';
      case 'entregue': return 'text-green-500';
      case 'cancelado': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'confirmado': return 'Confirmado';
      case 'em_preparo': return 'Em Preparo';
      case 'em_entrega': return 'Em Entrega';
      case 'entregue': return 'Entregue';
      case 'cancelado': return 'Cancelado';
      default: return 'Desconhecido';
    }
  };

  const handleEditarPedido = (pedidoId: string) => {
    // Detectar se está na versão web ou mobile baseado na URL atual
    const isWebVersion = window.location.pathname.startsWith('/dashboard');

    if (isWebVersion) {
      // Navegar para a página de edição de pedido na versão web
      navigate(`/dashboard/pedidos/editar/${pedidoId}`);
    } else {
      // Navegar para a página de edição de pedido na versão mobile
      navigate(`/user/pedidos/editar/${pedidoId}`);
    }
  };

  const handleNovoPedido = () => {
    // Detectar se está na versão web ou mobile baseado na URL atual
    const isWebVersion = window.location.pathname.startsWith('/dashboard');

    if (isWebVersion) {
      // Navegar para a página de novo pedido na versão web
      navigate('/dashboard/pedidos/novo');
    } else {
      // Navegar para a página de novo pedido na versão mobile
      navigate('/user/pedidos/novo');
    }
  };

  const handleEnviarWhatsApp = async (pedido: Pedido) => {
    try {
      if (!empresaWhatsapp) {
        alert('Número de WhatsApp da empresa não configurado');
        return;
      }

      // Gerar o link do pedido
      const url = await gerarLinkPedido(pedido);
      if (!url) {
        alert('Não foi possível gerar o link do pedido');
        return;
      }

      // Formatar o número para o WhatsApp
      const whatsappNumber = formatWhatsAppNumber(empresaWhatsapp);

      // Criar a mensagem
      const mensagem = `Olá! Segue o link do pedido #${pedido.numero}: ${url}`;

      // Criar o link do WhatsApp
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensagem)}`;

      // Abrir o link
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
      alert('Erro ao enviar mensagem pelo WhatsApp');
    }
  };

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
      return null;
    }
  };

  // Animação de carregamento de cards
  if (isInitialLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-gray-800 rounded-lg animate-pulse"></div>
          <div className="h-10 w-10 bg-gray-800 rounded-lg animate-pulse"></div>
        </div>

        {/* Barra de busca skeleton */}
        <div className="h-10 w-full bg-gray-800 rounded-lg animate-pulse"></div>

        {/* Cards skeleton */}
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="p-4 bg-background-card rounded-lg border border-gray-800"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-2 w-2/3">
                <div className="h-5 w-32 bg-gray-700 rounded animate-pulse"></div>
                <div className="h-4 w-40 bg-gray-700 rounded animate-pulse"></div>
                <div className="h-4 w-24 bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div className="space-y-2 w-1/3 flex flex-col items-end">
                <div className="h-5 w-20 bg-gray-700 rounded animate-pulse"></div>
                <div className="h-4 w-28 bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Detectar se está na versão web e se é desktop
  const isWebVersion = window.location.pathname.startsWith('/dashboard');
  const showAddButton = isWebVersion && isDesktopScreen();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Meus Pedidos</h1>
        <div className="flex items-center gap-2">
          {/* Botão Novo Pedido - apenas na versão web E em desktop */}
          {showAddButton && (
            <button
              onClick={handleNovoPedido}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
            >
              <Plus size={18} />
              <span>Novo Pedido</span>
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
          placeholder="Buscar pedidos por clientes ou numero..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
        />
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Status do Pedido
                </label>
                <div className="flex flex-wrap gap-2">
                  {['todos', 'pendente', 'faturado'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        statusFilter === status
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {status === 'todos' ? 'Todos' : status === 'faturado' ? 'Faturado' : 'Pendente'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Data do Pedido
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar size={18} className="text-gray-500" />
                  </div>
                  <input
                    type="date"
                    value={dataFilter}
                    onChange={(e) => setDataFilter(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                  />
                </div>
                {dataFilter && (
                  <div className="flex items-center mt-2">
                    <button
                      onClick={() => setDataFilter('')}
                      className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                    >
                      <X size={14} />
                      <span>Limpar filtro de data</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de pedidos */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="p-4 bg-background-card rounded-lg border border-gray-800">
              <div className="flex justify-between items-start">
                <div className="space-y-2 w-2/3">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-16 bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-5 w-20 bg-gray-700 rounded-full animate-pulse"></div>
                  </div>
                  <div className="h-4 w-32 bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-3 w-40 bg-gray-700 rounded animate-pulse"></div>
                </div>
                <div className="space-y-2 w-1/3 flex flex-col items-end">
                  <div className="h-5 w-20 bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-3 w-28 bg-gray-700 rounded animate-pulse"></div>
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
            {searchTerm || statusFilter !== 'todos'
              ? 'Tente ajustar os filtros de busca'
              : 'Você ainda não possui pedidos registrados'}
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto custom-scrollbar pr-2">
          {filteredPedidos.map((pedido, index) => (
            <motion.div
              key={pedido.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 bg-background-card rounded-lg border border-gray-800"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium">#{pedido.numero || index + 1}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(pedido.status)} bg-opacity-20`}>
                      {getStatusText(pedido.status)}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">
                    {pedido.cliente?.nome || 'Cliente'}
                  </p>
                  {pedido.empresa_nome && (
                    <p className="text-gray-500 text-xs mt-1">
                      Empresa: {pedido.empresa_nome}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-primary-400 font-medium">
                    {formatCurrency(pedido.valor_total)}
                  </p>
                  <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
                    <Calendar size={12} />
                    <span>{formatDate(pedido.created_at)}</span>
                    <Clock size={12} className="ml-1" />
                    <span>{formatTime(pedido.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between">
                <button
                  onClick={() => handleEnviarWhatsApp(pedido)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                >
                  <MessageCircle size={14} />
                  <span className="text-sm">Enviar</span>
                </button>

                <button
                  onClick={() => handleEditarPedido(pedido.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                >
                  <Edit size={14} />
                  <span className="text-sm">Editar</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserPedidosPage;
