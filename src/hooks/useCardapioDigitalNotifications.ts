import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { showMessage } from '../utils/toast';
import useSound from 'use-sound';

interface PedidoCardapio {
  id: string;
  numero_pedido: string;
  nome_cliente: string;
  telefone_cliente: string;
  valor_total: number;
  status_pedido: string;
  data_pedido: string;
  itens_pedido: any[];
}

interface UseCardapioDigitalNotificationsProps {
  empresaId: string;
  enabled?: boolean;
}

export const useCardapioDigitalNotifications = ({ 
  empresaId, 
  enabled = true 
}: UseCardapioDigitalNotificationsProps) => {
  const [pedidosPendentes, setPedidosPendentes] = useState<PedidoCardapio[]>([]);
  const [contadorPendentes, setContadorPendentes] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ HOOK DE SOM PARA NOTIFICAÇÕES
  const [playNotificationSound] = useSound('/sounds/notification.mp3', {
    volume: 0.8,
    interrupt: true
  });

  // ✅ CARREGAR PEDIDOS PENDENTES
  const carregarPedidosPendentes = useCallback(async () => {
    if (!empresaId || !enabled) {
      console.log('❌ Não carregando pedidos:', { empresaId, enabled });
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔍 Carregando pedidos pendentes para empresa:', empresaId);

      const { data, error } = await supabase
        .from('cardapio_digital')
        .select(`
          id,
          numero_pedido,
          nome_cliente,
          telefone_cliente,
          valor_total,
          status_pedido,
          data_pedido,
          itens_pedido
        `)
        .eq('empresa_id', empresaId)
        .eq('status_pedido', 'pendente')
        .order('data_pedido', { ascending: false });

      if (error) {
        console.error('Erro ao carregar pedidos do cardápio digital:', error);
        return;
      }

      const pedidos = data || [];
      console.log('📊 Pedidos encontrados:', pedidos.length, pedidos);
      setPedidosPendentes(pedidos);
      setContadorPendentes(pedidos.length);

    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [empresaId, enabled]);

  // ✅ ACEITAR PEDIDO
  const aceitarPedido = useCallback(async (pedidoId: string) => {
    try {
      const { error } = await supabase
        .from('cardapio_digital')
        .update({ 
          status_pedido: 'confirmado',
          data_confirmacao: new Date().toISOString()
        })
        .eq('id', pedidoId);

      if (error) {
        console.error('Erro ao aceitar pedido:', error);
        showMessage('error', 'Erro ao aceitar pedido');
        return false;
      }

      showMessage('success', 'Pedido aceito com sucesso!');
      await carregarPedidosPendentes(); // Recarregar lista
      return true;

    } catch (error) {
      console.error('Erro ao aceitar pedido:', error);
      showMessage('error', 'Erro ao aceitar pedido');
      return false;
    }
  }, [carregarPedidosPendentes]);

  // ✅ REJEITAR PEDIDO
  const rejeitarPedido = useCallback(async (pedidoId: string, motivo?: string) => {
    try {
      const { error } = await supabase
        .from('cardapio_digital')
        .update({ 
          status_pedido: 'cancelado',
          observacao_pedido: motivo ? `Rejeitado: ${motivo}` : 'Pedido rejeitado pelo estabelecimento'
        })
        .eq('id', pedidoId);

      if (error) {
        console.error('Erro ao rejeitar pedido:', error);
        showMessage('error', 'Erro ao rejeitar pedido');
        return false;
      }

      showMessage('success', 'Pedido rejeitado');
      await carregarPedidosPendentes(); // Recarregar lista
      return true;

    } catch (error) {
      console.error('Erro ao rejeitar pedido:', error);
      showMessage('error', 'Erro ao rejeitar pedido');
      return false;
    }
  }, [carregarPedidosPendentes]);

  // ✅ CONFIGURAR REALTIME PARA NOVOS PEDIDOS
  useEffect(() => {
    if (!empresaId || !enabled) {
      console.log('❌ Hook cardápio digital desabilitado:', { empresaId, enabled });
      return;
    }

    console.log('🔔 Configurando realtime para pedidos do cardápio digital:', empresaId);

    const channelName = `cardapio_digital_${empresaId}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cardapio_digital',
          filter: `empresa_id=eq.${empresaId}`
        },
        (payload) => {
          console.log('🆕 Novo pedido do cardápio digital:', payload);
          
          // Tocar som de notificação
          playNotificationSound();
          
          // Mostrar notificação visual
          const novoPedido = payload.new as PedidoCardapio;
          showMessage('info', `🍽️ Novo pedido #${novoPedido.numero_pedido} de ${novoPedido.nome_cliente}`);
          
          // Recarregar lista de pedidos
          carregarPedidosPendentes();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cardapio_digital',
          filter: `empresa_id=eq.${empresaId}`
        },
        (payload) => {
          console.log('📝 Pedido do cardápio digital atualizado:', payload);
          
          // Recarregar lista se status mudou
          const pedidoAtualizado = payload.new as PedidoCardapio;
          if (payload.old && (payload.old as any).status_pedido !== pedidoAtualizado.status_pedido) {
            carregarPedidosPendentes();
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Status do canal cardápio digital:', status);
      });

    // Carregar pedidos iniciais
    carregarPedidosPendentes();

    // Cleanup
    return () => {
      console.log('🔌 Desconectando canal cardápio digital');
      supabase.removeChannel(channel);
    };
  }, [empresaId, enabled, playNotificationSound, carregarPedidosPendentes]);

  // ✅ POLLING BACKUP (a cada 10 segundos)
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      carregarPedidosPendentes();
    }, 10000); // 10 segundos

    return () => clearInterval(interval);
  }, [carregarPedidosPendentes, enabled]);

  return {
    pedidosPendentes,
    contadorPendentes,
    isLoading,
    aceitarPedido,
    rejeitarPedido,
    recarregarPedidos: carregarPedidosPendentes
  };
};
