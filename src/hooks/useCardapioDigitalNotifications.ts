import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [somContinuoAtivo, setSomContinuoAtivo] = useState(false);
  const [audioHabilitado, setAudioHabilitado] = useState(false);

  // ✅ HOOK DE SOM PARA NOTIFICAÇÕES
  const [playNotificationSound] = useSound('/sounds/notification.mp3', {
    volume: 0.8,
    interrupt: true,
    onload: () => {
      console.log('🔊 Som carregado com sucesso');
    },
    onloaderror: (error) => {
      console.error('❌ Erro ao carregar som:', error);
    },
    onplay: () => {
      console.log('▶️ Som sendo reproduzido');
    },
    onend: () => {
      console.log('⏹️ Som finalizado');
    }
  });

  // ✅ FUNÇÃO PARA TOCAR SOM COM FALLBACK MELHORADO
  const tocarSomNotificacao = useCallback(async (forcado = false) => {
    const tipoSom = forcado ? 'FORÇADO' : 'AUTOMÁTICO';
    console.log(`🔊 === INICIANDO REPRODUÇÃO DE SOM ${tipoSom} ===`);
    console.log('🔊 Timestamp:', new Date().toISOString());
    console.log('🔊 Pedidos pendentes:', contadorPendentes);

    // Método 1: Audio API direto (mais confiável)
    try {
      console.log('🔊 Método 1: Tentando Audio API direto...');
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 1.0; // Volume máximo
      audio.preload = 'auto';

      // Aguardar carregamento
      await new Promise((resolve, reject) => {
        audio.addEventListener('canplaythrough', resolve, { once: true });
        audio.addEventListener('error', reject, { once: true });
        audio.load();
      });

      const playPromise = audio.play();

      if (playPromise !== undefined) {
        await playPromise;
        console.log('✅ Som tocado via Audio API direto');
        return true;
      }
    } catch (error) {
      console.error('❌ Erro no Audio API direto:', error);
    }

    // Método 2: Tentar usar useSound
    try {
      console.log('🔊 Método 2: Tentando useSound...');
      playNotificationSound();
      console.log('✅ useSound executado com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro no useSound:', error);
    }

    // Método 3: Último recurso - createElement com eventos
    try {
      console.log('🔊 Método 3: Último recurso com eventos...');
      const audioElement = document.createElement('audio');
      audioElement.src = '/sounds/notification.mp3';
      audioElement.volume = 1.0;
      audioElement.preload = 'auto';

      // Adicionar ao DOM temporariamente
      document.body.appendChild(audioElement);

      const playPromise = audioElement.play();
      if (playPromise) {
        await playPromise;
        console.log('✅ Som tocado via createElement');

        // Remover do DOM após tocar
        setTimeout(() => {
          document.body.removeChild(audioElement);
        }, 1000);

        return true;
      }
    } catch (lastError) {
      console.error('❌ Todos os métodos falharam:', lastError);
    }

    console.log('🔊 === FIM DA REPRODUÇÃO DE SOM ===');
    return false;
  }, [playNotificationSound, contadorPendentes]);

  // ✅ REFERÊNCIA PARA O INTERVALO DO SOM CONTÍNUO
  const intervalSomRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ FUNÇÃO PARA INICIAR SOM CONTÍNUO
  const iniciarSomContinuo = useCallback(() => {
    // Verificações de segurança
    if (somContinuoAtivo) {
      console.log('⚠️ Som contínuo já está ativo, ignorando...');
      return;
    }

    if (contadorPendentes === 0) {
      console.log('⚠️ Sem pedidos pendentes, não iniciando som...');
      return;
    }

    console.log('🔔 INICIANDO SOM CONTÍNUO - Pedidos pendentes:', contadorPendentes);
    setSomContinuoAtivo(true);

    // Limpar intervalo anterior se existir (segurança)
    if (intervalSomRef.current) {
      console.log('🧹 Limpando intervalo anterior...');
      clearInterval(intervalSomRef.current);
      intervalSomRef.current = null;
    }

    // Tocar som imediatamente
    console.log('🔊 Tocando som inicial...');
    tocarSomNotificacao(true);

    // Configurar intervalo para tocar a cada 10 segundos
    intervalSomRef.current = setInterval(() => {
      console.log('🔔 VERIFICAÇÃO PERIÓDICA - Pedidos pendentes:', contadorPendentes);

      // Verificar se ainda há pedidos pendentes
      if (contadorPendentes > 0) {
        console.log('🔔 SOM CONTÍNUO - Tocando novamente...');
        tocarSomNotificacao(true);
      } else {
        console.log('🔕 PARANDO SOM CONTÍNUO - Sem pedidos pendentes');
        if (intervalSomRef.current) {
          clearInterval(intervalSomRef.current);
          intervalSomRef.current = null;
        }
        setSomContinuoAtivo(false);
      }
    }, 10000); // 10 segundos (mais frequente)

    console.log('✅ Som contínuo configurado com sucesso!');

  }, [contadorPendentes, somContinuoAtivo, tocarSomNotificacao]);

  // ✅ FUNÇÃO PARA PARAR SOM CONTÍNUO
  const pararSomContinuo = useCallback(() => {
    console.log('🔕 Parando som contínuo manualmente');
    if (intervalSomRef.current) {
      clearInterval(intervalSomRef.current);
      intervalSomRef.current = null;
    }
    setSomContinuoAtivo(false);
  }, []);

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
      const contadorAnterior = contadorPendentes;
      const novoContador = pedidos.length;

      console.log('📊 Pedidos encontrados:', {
        anterior: contadorAnterior,
        novo: novoContador,
        pedidos: pedidos.length
      });

      setPedidosPendentes(pedidos);
      setContadorPendentes(novoContador);

      // ✅ INICIAR SOM CONTÍNUO SE HÁ PEDIDOS PENDENTES
      if (novoContador > 0 && !somContinuoAtivo) {
        console.log('🔔 DETECTADOS PEDIDOS PENDENTES - INICIANDO SOM CONTÍNUO IMEDIATAMENTE!');
        setTimeout(() => iniciarSomContinuo(), 500); // Pequeno delay para garantir que o estado foi atualizado
      }

    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [empresaId, enabled, contadorPendentes, somContinuoAtivo, iniciarSomContinuo]);

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

    console.log('🔔 Configurando realtime para pedidos do cardápio digital:', {
      empresaId,
      enabled,
      timestamp: new Date().toISOString()
    });

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
          console.log('🆕🔊 NOVO PEDIDO DETECTADO - TOCANDO SOM!', {
            payload,
            timestamp: new Date().toISOString(),
            empresaId
          });

          // Tocar som de notificação IMEDIATAMENTE
          console.log('🔊 Chamando tocarSomNotificacao...');
          tocarSomNotificacao();

          // Mostrar notificação visual
          const novoPedido = payload.new as PedidoCardapio;
          showMessage('info', `🍽️ Novo pedido #${novoPedido.numero_pedido} de ${novoPedido.nome_cliente}`);

          // Recarregar lista de pedidos
          console.log('🔄 Recarregando lista de pedidos...');
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
        console.log('📡 Status do canal cardápio digital:', {
          status,
          channelName,
          empresaId,
          timestamp: new Date().toISOString()
        });

        if (status === 'SUBSCRIBED') {
          console.log('✅ REALTIME ATIVO - Aguardando novos pedidos...');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ ERRO NO CANAL REALTIME');
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ TIMEOUT NO CANAL REALTIME');
        }
      });

    // Carregar pedidos iniciais
    carregarPedidosPendentes();

    // Cleanup
    return () => {
      console.log('🔌 Desconectando canal cardápio digital');
      supabase.removeChannel(channel);
    };
  }, [empresaId, enabled, tocarSomNotificacao, carregarPedidosPendentes]);

  // ✅ SOM CONTÍNUO QUANDO HÁ PEDIDOS PENDENTES (MONITORAMENTO ATIVO)
  useEffect(() => {
    console.log('🔔 MONITORAMENTO ATIVO - Pedidos pendentes:', {
      contadorPendentes,
      somContinuoAtivo,
      empresaId,
      enabled,
      timestamp: new Date().toISOString()
    });

    // Se há pedidos pendentes e som não está ativo, iniciar
    if (contadorPendentes > 0 && !somContinuoAtivo && empresaId && enabled) {
      console.log('🔔 DETECTADOS PEDIDOS PENDENTES - INICIANDO SOM CONTÍNUO AUTOMATICAMENTE!');
      setTimeout(() => iniciarSomContinuo(), 1000); // Delay de 1 segundo para garantir estabilidade
    }
    // Se não há pedidos pendentes e som está ativo, parar
    else if (contadorPendentes === 0 && somContinuoAtivo) {
      console.log('🔕 SEM PEDIDOS PENDENTES - PARANDO SOM CONTÍNUO AUTOMATICAMENTE!');
      pararSomContinuo();
    }
  }, [contadorPendentes, somContinuoAtivo, empresaId, enabled, iniciarSomContinuo, pararSomContinuo]);

  // ✅ MONITORAMENTO INICIAL - VERIFICAR PEDIDOS EXISTENTES AO CARREGAR
  useEffect(() => {
    if (empresaId && enabled) {
      console.log('🔍 VERIFICAÇÃO INICIAL - Carregando pedidos existentes...');
      carregarPedidosPendentes();

      // Verificar novamente após 3 segundos para garantir
      const timeoutVerificacao = setTimeout(() => {
        console.log('🔍 VERIFICAÇÃO SECUNDÁRIA - Recarregando pedidos...');
        carregarPedidosPendentes();
      }, 3000);

      return () => clearTimeout(timeoutVerificacao);
    }
  }, [empresaId, enabled, carregarPedidosPendentes]);

  // ✅ CLEANUP DO INTERVALO AO DESMONTAR
  useEffect(() => {
    return () => {
      if (intervalSomRef.current) {
        console.log('🧹 Limpando intervalo do som contínuo');
        clearInterval(intervalSomRef.current);
        intervalSomRef.current = null;
      }
    };
  }, []);

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
    recarregarPedidos: carregarPedidosPendentes,
    tocarSomNotificacao,
    somContinuoAtivo,
    pararSomContinuo
  };
};
