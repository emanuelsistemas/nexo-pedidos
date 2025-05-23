import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, TrendingUp, Calendar, Clock, CheckCircle, AlertCircle, Filter, User, RefreshCw, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DashboardData {
  pedidosHoje: number;
  pedidosSemana: number;
  pedidosMes: number;
  valorTotalHoje: number;
  valorTotalSemana: number;
  valorTotalMes: number;
  ultimosPedidos: any[];
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: string;
}

const UserDashboardPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<DashboardData>({
    pedidosHoje: 0,
    pedidosSemana: 0,
    pedidosMes: 0,
    valorTotalHoje: 0,
    valorTotalSemana: 0,
    valorTotalMes: 0,
    ultimosPedidos: []
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<string>('todos');
  const [showFilters, setShowFilters] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadDashboardData();
    checkUserType();
    loadUsuarios();
  }, []);

  // Recarregar dados quando o usuário selecionado mudar
  useEffect(() => {
    loadDashboardData();
  }, [usuarioSelecionado]);

  // Verificar se o usuário é admin
  const checkUserType = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select(`
          tipo_user_config:tipo_user_config_id(tipo)
        `)
        .eq('id', userData.user.id)
        .single();

      if (usuarioData?.tipo_user_config) {
        setIsAdmin(usuarioData.tipo_user_config.tipo === 'admin');
      }
    } catch (error) {
      console.error('Erro ao verificar tipo de usuário:', error);
    }
  };

  // Carregar lista de usuários (apenas para admin)
  const loadUsuarios = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select(`
          empresa_id,
          tipo_user_config:tipo_user_config_id(tipo)
        `)
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id || usuarioData.tipo_user_config?.tipo !== 'admin') return;

      const { data: usuariosData } = await supabase
        .from('usuarios')
        .select(`
          id,
          nome,
          email,
          tipo_user_config:tipo_user_config_id(tipo)
        `)
        .eq('empresa_id', usuarioData.empresa_id)
        .order('nome');

      if (usuariosData) {
        setUsuarios(usuariosData);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Obter o usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Obter informações do usuário (tipo e empresa_id)
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select(`
          empresa_id,
          tipo_user_config:tipo_user_config_id(tipo)
        `)
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // Construir a query base
      let query = supabase
        .from('pedidos')
        .select('*')
        .eq('empresa_id', usuarioData.empresa_id);

      // Se um usuário específico estiver selecionado e o usuário atual for admin
      if (usuarioSelecionado !== 'todos' && usuarioData.tipo_user_config?.tipo === 'admin') {
        query = query.eq('usuario_id', usuarioSelecionado);
      }
      // Se o usuário atual não for admin, mostrar apenas seus próprios pedidos
      else if (usuarioData.tipo_user_config?.tipo !== 'admin') {
        query = query.eq('usuario_id', userData.user.id);
      }

      // Ordenar por data de criação (mais recentes primeiro)
      query = query.order('created_at', { ascending: false });

      // Executar a query
      const { data: pedidos } = await query;

      if (!pedidos) {
        setIsLoading(false);
        return;
      }

      // Atualizar timestamp da última atualização
      setLastUpdate(new Date());

      // Calcular datas
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - hoje.getDay());

      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

      // Filtrar pedidos
      const pedidosHoje = pedidos.filter(p => new Date(p.created_at) >= hoje);
      const pedidosSemana = pedidos.filter(p => new Date(p.created_at) >= inicioSemana);
      const pedidosMes = pedidos.filter(p => new Date(p.created_at) >= inicioMes);

      // Calcular valores
      const valorTotalHoje = pedidosHoje.reduce((acc, p) => acc + p.valor_total, 0);
      const valorTotalSemana = pedidosSemana.reduce((acc, p) => acc + p.valor_total, 0);
      const valorTotalMes = pedidosMes.reduce((acc, p) => acc + p.valor_total, 0);

      // Obter últimos 5 pedidos
      const ultimosPedidos = pedidos.slice(0, 5);

      setData({
        pedidosHoje: pedidosHoje.length,
        pedidosSemana: pedidosSemana.length,
        pedidosMes: pedidosMes.length,
        valorTotalHoje,
        valorTotalSemana,
        valorTotalMes,
        ultimosPedidos
      });
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setIsLoading(false);
    }
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

  // Cards para exibir as métricas
  const cards = [
    {
      title: 'Pedidos Hoje',
      value: data.pedidosHoje,
      icon: ShoppingBag,
      color: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      borderColor: 'border-blue-500/20',
    },
    {
      title: 'Pedidos na Semana',
      value: data.pedidosSemana,
      icon: Calendar,
      color: 'bg-green-500/10',
      iconColor: 'text-green-500',
      borderColor: 'border-green-500/20',
    },
    {
      title: 'Pedidos no Mês',
      value: data.pedidosMes,
      icon: TrendingUp,
      color: 'bg-purple-500/10',
      iconColor: 'text-purple-500',
      borderColor: 'border-purple-500/20',
    },
    {
      title: 'Valor Hoje',
      value: formatCurrency(data.valorTotalHoje),
      icon: ShoppingBag,
      color: 'bg-yellow-500/10',
      iconColor: 'text-yellow-500',
      borderColor: 'border-yellow-500/20',
    },
    {
      title: 'Valor na Semana',
      value: formatCurrency(data.valorTotalSemana),
      icon: Calendar,
      color: 'bg-pink-500/10',
      iconColor: 'text-pink-500',
      borderColor: 'border-pink-500/20',
    },
    {
      title: 'Valor no Mês',
      value: formatCurrency(data.valorTotalMes),
      icon: TrendingUp,
      color: 'bg-orange-500/10',
      iconColor: 'text-orange-500',
      borderColor: 'border-orange-500/20',
    },
  ];

  // Função para formatar a data da última atualização
  const formatLastUpdate = () => {
    const now = new Date();
    const diff = now.getTime() - lastUpdate.getTime();

    // Se for menos de 1 minuto
    if (diff < 60000) {
      return 'agora mesmo';
    }

    // Se for menos de 1 hora
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `há ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    }

    // Se for menos de 1 dia
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    }

    // Se for mais de 1 dia
    const days = Math.floor(diff / 86400000);
    return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-white">Meu Dashboard</h1>

        {/* Indicador de última atualização */}
        <div className="text-xs text-gray-400 flex items-center gap-1">
          <span>Atualizado: {formatLastUpdate()}</span>
          <button
            onClick={() => loadDashboardData()}
            className="p-1 hover:bg-gray-800/50 rounded-full transition-colors"
            title="Atualizar dados"
            disabled={isLoading}
          >
            <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Filtro de usuários - visível apenas para admin */}
      {isAdmin && (
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1 px-2 py-1 bg-gray-800/50 hover:bg-gray-800 rounded-lg text-gray-300 text-sm transition-colors"
            >
              <Filter size={16} />
              <span>Filtrar por usuário</span>
            </button>
          </div>

          {/* Área de filtros - visível apenas quando showFilters é true */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 mt-2 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white text-sm font-medium flex items-center gap-1">
                      <User size={14} />
                      Usuários
                    </h3>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="p-1 hover:bg-gray-700/50 rounded-full text-gray-400"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setUsuarioSelecionado('todos')}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        usuarioSelecionado === 'todos'
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Todos
                    </button>

                    {usuarios.map((usuario) => (
                      <button
                        key={usuario.id}
                        onClick={() => setUsuarioSelecionado(usuario.id)}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          usuarioSelecionado === usuario.id
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {usuario.nome}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {isLoading ? (
        <>
          {/* Cards skeleton */}
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="p-4 rounded-lg border border-gray-800 bg-background-card">
                <div className="h-6 w-6 bg-gray-700 rounded mb-2 animate-pulse"></div>
                <div className="h-3 w-16 bg-gray-700 rounded mb-2 animate-pulse"></div>
                <div className="h-5 w-20 bg-gray-700 rounded animate-pulse"></div>
              </div>
            ))}
          </div>

          {/* Últimos pedidos skeleton */}
          <div className="bg-background-card rounded-lg border border-gray-800 p-4 mt-6">
            <div className="h-6 w-40 bg-gray-700 rounded mb-4 animate-pulse"></div>

            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="p-3 bg-gray-800/50 rounded-lg">
                  <div className="flex justify-between">
                    <div className="space-y-2 w-2/3">
                      <div className="h-4 w-24 bg-gray-700 rounded animate-pulse"></div>
                      <div className="h-3 w-32 bg-gray-700 rounded animate-pulse"></div>
                    </div>
                    <div className="space-y-2 w-1/3 flex flex-col items-end">
                      <div className="h-4 w-16 bg-gray-700 rounded animate-pulse"></div>
                      <div className="h-3 w-24 bg-gray-700 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            {cards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border ${card.borderColor} ${card.color}`}
              >
                <div className="flex items-center mb-2">
                  <div className={`p-2 rounded-lg ${card.color}`}>
                    <card.icon size={16} className={card.iconColor} />
                  </div>
                </div>
                <h3 className="text-gray-400 text-xs mb-1">{card.title}</h3>
                <p className="text-lg font-semibold text-white">{card.value}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-background-card rounded-lg border border-gray-800 p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-white">Últimos Pedidos</h2>

              {/* Indicador de usuário selecionado - visível apenas para admin */}
              {isAdmin && usuarioSelecionado !== 'todos' && (
                <div className="flex items-center gap-1 px-2 py-1 bg-primary-500/10 rounded-full">
                  <User size={12} className="text-primary-400" />
                  <span className="text-xs text-primary-400">
                    {usuarios.find(u => u.id === usuarioSelecionado)?.nome || 'Usuário'}
                  </span>
                </div>
              )}
            </div>
            {data.ultimosPedidos.length === 0 ? (
              <div className="text-center py-6">
                <AlertCircle size={24} className="text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400">Nenhum pedido encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.ultimosPedidos.map((pedido, index) => (
                  <motion.div
                    key={pedido.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="p-3 bg-gray-800/50 rounded-lg"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">#{pedido.numero_pedido || index + 1}</span>
                          <span className={`text-xs ${getStatusColor(pedido.status)}`}>
                            {getStatusText(pedido.status)}
                          </span>
                        </div>
                        <p className="text-gray-400 text-xs mt-1">
                          {pedido.cliente_nome || 'Cliente'}
                        </p>
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
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
};

export default UserDashboardPage;
