import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { supabase } from '../../lib/supabase';
import { showMessage } from '../../utils/toast';
import Button from '../../components/comum/Button';

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
  ticketMedio: number;
  crescimento: number;
}

interface StoreStatus {
  aberto: boolean;
  aberto_manual: boolean;
  modo_operacao: 'manual' | 'automatico';
}

const DashboardPage: React.FC = () => {
  const chartRef = useRef<ChartJS | null>(null);
  const [data, setData] = useState<DashboardData>({
    totalPedidos: 0,
    pedidosHoje: 0,
    faturamentoTotal: 0,
    faturamentoHoje: 0,
    clientesUnicos: 0,
    entregasRealizadas: 0,
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

  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [],
  });

  useEffect(() => {
    loadDashboardData();
    loadStoreStatus();
    checkStoreStatus();

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
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // Get all orders
      const { data: pedidos } = await supabase
        .from('pedidos')
        .select('*')
        .eq('empresa_id', usuarioData.empresa_id);

      if (!pedidos) return;

      // Calculate metrics
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const pedidosHoje = pedidos.filter(p => new Date(p.created_at) >= hoje);
      const entregasRealizadas = pedidos.filter(p => p.status === 'entregue').length;
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

        return pedidos.filter(p => {
          const orderDate = new Date(p.created_at);
          return orderDate >= startOfDay && orderDate <= endOfDay;
        }).reduce((acc, p) => acc + p.valor_total, 0);
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
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
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
    {
      title: 'Status da Loja',
      value: (
        <div className="flex flex-col items-start gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${storeStatus.aberto ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>{storeStatus.aberto ? 'Aberta' : 'Fechada'}</span>
          </div>
          <Button
            type="button"
            variant="primary"
            className={`text-sm ${storeStatus.aberto ? '!bg-red-500 hover:!bg-red-600' : '!bg-green-500 hover:!bg-green-600'}`}
            onClick={toggleStoreStatus}
            disabled={isLoading}
          >
            {isLoading ? 'Atualizando...' : storeStatus.aberto ? 'Fechar Loja' : 'Abrir Loja'}
          </Button>
        </div>
      ),
      icon: Store,
      color: 'bg-purple-500/10',
      iconColor: 'text-purple-500',
      borderColor: 'border-purple-500/20',
      customContent: (
        <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
          <Clock size={14} />
          <span>{currentTime.toLocaleTimeString()}</span>
        </div>
      ),
    },
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
      title: 'Ticket Médio',
      value: formatCurrency(data.ticketMedio),
      icon: ShoppingBag,
      color: 'bg-purple-500/10',
      iconColor: 'text-purple-500',
      borderColor: 'border-purple-500/20',
    },
    {
      title: 'Entregas Realizadas',
      value: data.entregasRealizadas,
      icon: Truck,
      color: 'bg-orange-500/10',
      iconColor: 'text-orange-500',
      borderColor: 'border-orange-500/20',
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
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-6 rounded-lg border ${card.borderColor} ${card.color}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg ${card.color}`}>
                <card.icon size={24} className={card.iconColor} />
              </div>
              {card.change !== undefined && (
                <div className={`flex items-center gap-1 text-sm ${
                  card.change >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {card.change >= 0 ? (
                    <ArrowUpRight size={16} />
                  ) : (
                    <ArrowDownRight size={16} />
                  )}
                  <span>{Math.abs(card.change).toFixed(1)}%</span>
                </div>
              )}
            </div>
            <h3 className="text-gray-400 text-sm mb-1">{card.title}</h3>
            {typeof card.value === 'string' || typeof card.value === 'number' ? (
              <p className="text-2xl font-semibold text-white">{card.value}</p>
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
        className="bg-background-card rounded-lg border border-gray-800 p-6"
      >
        <h2 className="text-lg font-medium text-white mb-6">Faturamento dos Últimos 7 Dias</h2>
        <div className="h-[300px]">
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