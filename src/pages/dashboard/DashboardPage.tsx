import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Package,
  Truck,
  DollarSign,
  Users,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  Store,
  Clock,
  Filter,
  User,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, ChartData } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { supabase } from '../../lib/supabase';
import { showMessage } from '../../utils/toast';
import { useAuthSession } from '../../hooks/useAuthSession';
import Button from '../../components/comum/Button';
import { useNavigate } from 'react-router-dom';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardData {
  totalPedidos: number;
  pedidosHoje: number;
  faturamentoTotal: number;
  faturamentoHoje: number;
  clientesUnicos: number;
  entregasRealizadas: number;
  valorFaturado: number;
  ticketMedio: number;
  crescimento: number;
}

interface StoreStatus {
  aberto: boolean;
  aberto_manual: boolean;
  modo_operacao: 'manual' | 'automatico';
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: string;
}

const DashboardPage: React.FC = () => {
  const { withSessionCheck } = useAuthSession();
  const navigate = useNavigate();
  const chartRef = useRef<ChartJS | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<DashboardData>({
    totalPedidos: 0,
    pedidosHoje: 0,
    faturamentoTotal: 0,
    faturamentoHoje: 0,
    clientesUnicos: 0,
    entregasRealizadas: 0,
    valorFaturado: 0,
    ticketMedio: 0,
    crescimento: 0,
  });
  const [storeStatus, setStoreStatus] = useState<StoreStatus>({
    aberto: true,
    aberto_manual: false,
    modo_operacao: 'manual'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const updateStatusRef = useRef(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<string>('todos');
  const [showFilters, setShowFilters] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [produtosEstoqueMinimo, setProdutosEstoqueMinimo] = useState<number>(0);

  const [chartData, setChartData] = useState<ChartData<'line'>>({
    labels: [],
    datasets: [],
  });

  useEffect(() => {
    loadDashboardData();
    loadStoreStatus();
    checkStoreStatus();
    checkUserType();
    loadUsuarios();
    loadProdutosEstoqueMinimo();

    const timer = setInterval(() => {
      setCurrentTime(new Date());
      checkStoreStatus();
    }, 60000); // Check every minute

    return () => {
      clearInterval(timer);
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  // Recarregar dados quando o usuário selecionado mudar
  useEffect(() => {
    loadDashboardData();
  }, [usuarioSelecionado]);

  // Ajustar o gráfico quando os dados mudarem
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.update();
    }
  }, [chartData]);

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

  // Carregar produtos com estoque mínimo
  const loadProdutosEstoqueMinimo = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // Buscar produtos com estoque mínimo ativo e que atingiram o estoque mínimo
      const { data: produtos } = await supabase
        .from('produtos')
        .select('id, nome, estoque_atual, estoque_minimo')
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('estoque_minimo_ativo', true)
        .eq('deletado', false)
        .gt('estoque_minimo', 0);

      if (produtos) {
        // Filtrar produtos que atingiram o estoque mínimo
        const produtosAbaixoMinimo = produtos.filter(produto =>
          produto.estoque_atual <= produto.estoque_minimo
        );

        setProdutosEstoqueMinimo(produtosAbaixoMinimo.length);
      }
    } catch (error) {
      console.error('Erro ao carregar produtos com estoque mínimo:', error);
    }
  };

  const loadStoreStatus = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      const { data: statusData } = await supabase
        .from('status_loja')
        .select('*')
        .eq('empresa_id', usuarioData.empresa_id)
        .maybeSingle();

      if (statusData) {
        setStoreStatus(statusData);
      } else {
        // Create initial status if it doesn't exist
        const { data: newStatus } = await supabase
          .from('status_loja')
          .insert([{
            empresa_id: usuarioData.empresa_id,
            aberto: true,
            aberto_manual: false,
            modo_operacao: 'manual'
          }])
          .select()
          .single();

        if (newStatus) {
          setStoreStatus(newStatus);
        }
      }
    } catch (error) {
      console.error('Error loading store status:', error);
    }
  };

  const checkStoreStatus = async () => {
    if (updateStatusRef.current) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // Only check automatic status if mode is automatic
      if (storeStatus.modo_operacao === 'automatico') {
        const now = new Date();
        const currentDay = now.getDay();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const { data: horario } = await supabase
          .from('horario_atendimento')
          .select('*')
          .eq('empresa_id', usuarioData.empresa_id)
          .eq('dia_semana', currentDay)
          .maybeSingle();

        if (!horario) {
          // If no schedule is set for today, consider it closed
          if (!storeStatus.aberto_manual) {
            await updateStoreStatus(false, false);
          }
          return;
        }

        const [horaAbertura, minutoAbertura] = horario.hora_abertura.split(':').map(Number);
        const [horaFechamento, minutoFechamento] = horario.hora_fechamento.split(':').map(Number);
        const aberturaMinutos = horaAbertura * 60 + minutoAbertura;
        const fechamentoMinutos = horaFechamento * 60 + minutoFechamento;

        const shouldBeOpen = currentTime >= aberturaMinutos && currentTime <= fechamentoMinutos;

        if (!storeStatus.aberto_manual && storeStatus.aberto !== shouldBeOpen) {
          await updateStoreStatus(shouldBeOpen, false);
        }
      }
    } catch (error) {
      console.error('Error checking store status:', error);
    }
  };

  const updateStoreStatus = async (aberto: boolean, manual: boolean) => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      updateStatusRef.current = true;

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      const { data: updatedStatus, error } = await supabase
        .from('status_loja')
        .update({
          aberto,
          aberto_manual: manual
        })
        .eq('empresa_id', usuarioData.empresa_id)
        .select()
        .single();

      if (error) throw error;

      if (updatedStatus) {
        setStoreStatus(prev => ({ ...prev, ...updatedStatus }));
        showMessage('success', `Loja ${aberto ? 'aberta' : 'fechada'} com sucesso!`);
      }
    } catch (error) {
      console.error('Error updating store status:', error);
      showMessage('error', 'Erro ao atualizar status da loja');
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        updateStatusRef.current = false;
      }, 1000);
    }
  };

  const toggleStoreStatus = () => {
    updateStoreStatus(!storeStatus.aberto, true);
  };

  const loadDashboardData = async () => {
    await withSessionCheck(async () => {
      setIsLoading(true);
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

      // Executar a query
      const { data: pedidos } = await query;

      if (!pedidos) return;

      // Atualizar timestamp da última atualização
      setLastUpdate(new Date());

      // Calculate metrics
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const pedidosHoje = pedidos.filter(p => new Date(p.created_at) >= hoje);
      const pedidosFaturados = pedidos.filter(p => p.status === 'entregue');
      const entregasRealizadas = pedidosFaturados.length;
      const valorFaturado = pedidosFaturados.reduce((acc, p) => acc + p.valor_total, 0);
      const clientesUnicos = new Set(pedidos.map(p => p.cliente_telefone)).size;
      const faturamentoTotal = pedidos.reduce((acc, p) => acc + p.valor_total, 0);
      const faturamentoHoje = pedidosHoje.reduce((acc, p) => acc + p.valor_total, 0);
      const ticketMedio = faturamentoTotal / pedidos.length || 0;

      // Calculate growth (comparing today with yesterday)
      const ontem = new Date(hoje);
      ontem.setDate(ontem.getDate() - 1);
      const pedidosOntem = pedidos.filter(p => {
        const data = new Date(p.created_at);
        return data >= ontem && data < hoje;
      });
      const crescimento = pedidosOntem.length > 0
        ? ((pedidosHoje.length - pedidosOntem.length) / pedidosOntem.length) * 100
        : 0;

      setData({
        totalPedidos: pedidos.length,
        pedidosHoje: pedidosHoje.length,
        faturamentoTotal,
        faturamentoHoje,
        clientesUnicos,
        entregasRealizadas,
        valorFaturado,
        ticketMedio,
        crescimento,
      });

      // Prepare chart data
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date;
      }).reverse();

      const chartLabels = last7Days.map(date =>
        date.toLocaleDateString('pt-BR', { weekday: 'short' })
      );

      const chartValues = last7Days.map(date => {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // Calcular o valor total dos pedidos para este dia
        const valorDia = pedidos.filter(p => {
          const orderDate = new Date(p.created_at);
          return orderDate >= startOfDay && orderDate <= endOfDay;
        }).reduce((acc, p) => acc + p.valor_total, 0);

        // Retornar o valor arredondado para 2 casas decimais para evitar problemas de precisão
        return Math.round(valorDia * 100) / 100;
      });

      setChartData({
        labels: chartLabels,
        datasets: [
          {
            fill: true,
            label: 'Faturamento',
            data: chartValues,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
          },
        ],
      });
    });
    setIsLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleEstoqueMinimoClick = () => {
    if (produtosEstoqueMinimo > 0) {
      navigate('/dashboard/estoque-minimo');
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return formatCurrency(context.parsed.y);
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#9CA3AF',
          callback: (value: number) => formatCurrency(value),
          maxTicksLimit: 5, // Limitar o número de ticks no eixo Y
        },
        // Definir limites automáticos para evitar valores extremos
        adapters: {
          date: {
            locale: 'pt-BR',
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#9CA3AF',
        },
      },
    },
  };

  const cards = [
    // Card "Status da Loja" removido
    {
      title: 'Pedidos Hoje',
      value: data.pedidosHoje,
      icon: Package,
      change: data.crescimento,
      color: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      borderColor: 'border-blue-500/20',
    },
    {
      title: 'Faturamento Hoje',
      value: formatCurrency(data.faturamentoHoje),
      icon: DollarSign,
      color: 'bg-green-500/10',
      iconColor: 'text-green-500',
      borderColor: 'border-green-500/20',
    },
    {
      title: 'Faturados',
      value: formatCurrency(data.valorFaturado),
      icon: CheckCircle,
      color: 'bg-orange-500/10',
      iconColor: 'text-orange-500',
      borderColor: 'border-orange-500/20',
    },
    {
      title: 'Ticket Médio',
      value: formatCurrency(data.ticketMedio),
      icon: ShoppingBag,
      color: 'bg-purple-500/10',
      iconColor: 'text-purple-500',
      borderColor: 'border-purple-500/20',
    },
    {
      title: 'Total de Pedidos',
      value: data.totalPedidos,
      icon: TrendingUp,
      color: 'bg-pink-500/10',
      iconColor: 'text-pink-500',
      borderColor: 'border-pink-500/20',
    },
    {
      title: 'Clientes Únicos',
      value: data.clientesUnicos,
      icon: Users,
      color: 'bg-yellow-500/10',
      iconColor: 'text-yellow-500',
      borderColor: 'border-yellow-500/20',
    },
    {
      title: 'Estoque Mínimo',
      value: produtosEstoqueMinimo,
      icon: AlertTriangle,
      color: produtosEstoqueMinimo > 0 ? 'bg-red-500/10' : 'bg-gray-500/10',
      iconColor: produtosEstoqueMinimo > 0 ? 'text-red-500' : 'text-gray-500',
      borderColor: produtosEstoqueMinimo > 0 ? 'border-red-500/20' : 'border-gray-500/20',
      clickable: produtosEstoqueMinimo > 0,
      onClick: handleEstoqueMinimoClick,
      customContent: (
        <div>
          <p className={`text-xs mt-1 ${
            produtosEstoqueMinimo === 0
              ? 'text-gray-400'
              : 'text-red-400 font-medium animate-pulse'
          }`}>
            {produtosEstoqueMinimo === 0
              ? 'Todos os produtos estão OK'
              : `⚠️ ${produtosEstoqueMinimo} ${produtosEstoqueMinimo === 1 ? 'produto atingiu' : 'produtos atingiram'} o estoque mínimo`
            }
          </p>
          {produtosEstoqueMinimo > 0 && (
            <p className="text-xs text-primary-400 mt-1 font-medium animate-pulse">
              Clique para ver detalhes →
            </p>
          )}
        </div>
      ),
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
      {/* Cabeçalho com filtros - visível apenas para admin */}
      {isAdmin && (
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 hover:bg-gray-800 rounded-lg text-gray-300 transition-colors"
            >
              <Filter size={18} />
              <span>Filtros</span>
            </button>

            <div className="text-sm text-gray-400 flex items-center gap-1">
              <span>Atualizado: {formatLastUpdate()}</span>
              <button
                onClick={() => loadDashboardData()}
                className="p-1 hover:bg-gray-800/50 rounded-full transition-colors"
                title="Atualizar dados"
                disabled={isLoading}
              >
                <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Área de filtros - visível apenas quando showFilters é true */}
      <AnimatePresence>
        {isAdmin && showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-6">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <User size={18} />
                Filtrar por Usuário
              </h3>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setUsuarioSelecionado('todos')}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
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
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
        {cards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: 1,
              y: 0,
              // Animação especial para o card de estoque mínimo quando há produtos
              ...(card.title === 'Estoque Mínimo' && produtosEstoqueMinimo > 0 && {
                boxShadow: [
                  "0 0 0 0 rgba(239, 68, 68, 0.7)",
                  "0 0 0 10px rgba(239, 68, 68, 0)",
                  "0 0 0 0 rgba(239, 68, 68, 0)"
                ]
              })
            }}
            transition={{
              delay: index * 0.1,
              ...(card.title === 'Estoque Mínimo' && produtosEstoqueMinimo > 0 && {
                boxShadow: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              })
            }}
            className={`p-4 rounded-lg border ${
              card.title === 'Estoque Mínimo' && produtosEstoqueMinimo > 0
                ? 'border-red-500/50 shadow-red-500/20'
                : card.borderColor
            } ${card.color} ${
              card.clickable ? 'cursor-pointer hover:bg-opacity-80 transition-all duration-200 hover:scale-105' : ''
            }`}
            onClick={card.onClick}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-1.5 rounded-lg ${card.color} ${
                card.title === 'Estoque Mínimo' && produtosEstoqueMinimo > 0 ? 'animate-pulse' : ''
              }`}>
                <card.icon size={20} className={`${card.iconColor} ${
                  card.title === 'Estoque Mínimo' && produtosEstoqueMinimo > 0 ? 'animate-pulse' : ''
                }`} />
              </div>
              {card.change !== undefined && (
                <div className={`flex items-center gap-1 text-xs ${
                  card.change >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {card.change >= 0 ? (
                    <ArrowUpRight size={14} />
                  ) : (
                    <ArrowDownRight size={14} />
                  )}
                  <span>{Math.abs(card.change).toFixed(1)}%</span>
                </div>
              )}
            </div>
            <h3 className="text-gray-400 text-xs mb-1">{card.title}</h3>
            {typeof card.value === 'string' || typeof card.value === 'number' ? (
              <p className={`text-xl font-semibold text-white ${
                card.title === 'Estoque Mínimo' && produtosEstoqueMinimo > 0 ? 'animate-pulse' : ''
              }`}>{card.value}</p>
            ) : (
              card.value
            )}
            {card.customContent}
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-background-card rounded-lg border border-gray-800 p-6 overflow-hidden"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-white">Faturamento dos Últimos 7 Dias</h2>

          {/* Indicador de usuário selecionado - visível apenas para admin */}
          {isAdmin && usuarioSelecionado !== 'todos' && (
            <div className="flex items-center gap-2 px-3 py-1 bg-primary-500/10 rounded-full">
              <User size={14} className="text-primary-400" />
              <span className="text-xs text-primary-400">
                {usuarios.find(u => u.id === usuarioSelecionado)?.nome || 'Usuário'}
              </span>
            </div>
          )}
        </div>
        <div ref={chartContainerRef} className="h-[250px] w-full relative">
          <Line
            options={chartOptions}
            data={chartData}
            ref={chartRef}
          />
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardPage;