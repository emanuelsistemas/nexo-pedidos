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
  onPedidoChange?: () => void; // Callback para quando houver mudanças nos pedidos
}

export const useCardapioDigitalNotifications = ({
  empresaId,
  enabled = true,
  onPedidoChange
}: UseCardapioDigitalNotificationsProps) => {
  console.log('🔧 Hook inicializado com callback:', !!onPedidoChange);
  const [pedidosPendentes, setPedidosPendentes] = useState<PedidoCardapio[]>([]);
  const [contadorPendentes, setContadorPendentes] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [somContinuoAtivo, setSomContinuoAtivo] = useState(false);
  const [audioHabilitado, setAudioHabilitado] = useState(false);
  const [somDesabilitadoPeloUsuario, setSomDesabilitadoPeloUsuario] = useState(false);
  const [pedidosProcessando, setPedidosProcessando] = useState<Set<string>>(new Set());

  // ✅ HOOK DE SOM PARA NOTIFICAÇÕES COM CONTROLES
  const [playNotificationSound, { stop: stopNotificationSound, isPlaying }] = useSound('/sounds/notification.mp3', {
    volume: 0.8,
    interrupt: true
  });

  // ✅ FUNÇÃO PARA HABILITAR ÁUDIO COM INTERAÇÃO DO USUÁRIO
  const habilitarAudio = useCallback(async () => {
    if (audioHabilitado) return true;

    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.1; // Volume baixo para teste

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
        audio.pause();
        audio.currentTime = 0;
        setAudioHabilitado(true);
        return true;
      }
    } catch (error) {
      // Erro ao habilitar áudio
    }

    return false;
  }, [audioHabilitado]);

  // ✅ FUNÇÃO PARA TOCAR SOM COM FALLBACK MELHORADO
  const tocarSomNotificacao = useCallback(async (forcado = false) => {
    // ✅ NOVA VERIFICAÇÃO: Se foi desabilitado pelo usuário, não tocar (mesmo se forçado)
    if (somDesabilitadoPeloUsuario && !forcado) {
      return false;
    }

    // Se não está habilitado e é forçado, tentar habilitar
    if (!audioHabilitado && forcado) {
      const habilitado = await habilitarAudio();
      if (!habilitado) {
        return false;
      }
    }

    // Se não está habilitado e é automático, não tocar
    if (!audioHabilitado && !forcado) {
      return false;
    }

    // Método 1: Tentar usar useSound (mais confiável após habilitação)
    try {
      playNotificationSound();
      return true;
    } catch (error) {
      // Erro no useSound
    }

    // Método 2: Audio API direto
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 1.0;

      // ✅ NOVO: Registrar instância de áudio para controle
      audioInstancesRef.current.push(audio);

      // ✅ NOVO: Remover da lista quando terminar
      audio.addEventListener('ended', () => {
        const index = audioInstancesRef.current.indexOf(audio);
        if (index > -1) {
          audioInstancesRef.current.splice(index, 1);
        }
      });

      // ✅ NOVO: Remover da lista se houver erro
      audio.addEventListener('error', () => {
        const index = audioInstancesRef.current.indexOf(audio);
        if (index > -1) {
          audioInstancesRef.current.splice(index, 1);
        }
      });

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
        return true;
      }
    } catch (error) {
      // Erro no Audio API direto
    }

    return false;
  }, [playNotificationSound, contadorPendentes, audioHabilitado, somDesabilitadoPeloUsuario, habilitarAudio]);

  // ✅ REFERÊNCIA PARA O INTERVALO DO SOM CONTÍNUO
  const intervalSomRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ REFERÊNCIA PARA CONTROLAR INSTÂNCIAS DE ÁUDIO ATIVAS
  const audioInstancesRef = useRef<HTMLAudioElement[]>([]);

  // ✅ FUNÇÃO PARA PARAR TODOS OS SONS IMEDIATAMENTE
  const pararTodosSonsImediatamente = useCallback(() => {
    // ✅ NOVO: Parar useSound primeiro (se estiver tocando)
    try {
      if (isPlaying) {
        stopNotificationSound();
      }
    } catch (error) {
      // Erro ao parar useSound
    }

    // Parar todas as instâncias de áudio ativas
    audioInstancesRef.current.forEach((audio, index) => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (error) {
        // Erro ao parar áudio
      }
    });

    // Limpar array de instâncias
    audioInstancesRef.current = [];

    // ✅ ABORDAGEM AGRESSIVA: Parar TODOS os elementos de áudio da página
    try {
      const allAudioElements = document.querySelectorAll('audio');
      allAudioElements.forEach((audio, index) => {
        try {
          if (!audio.paused) {
            audio.pause();
            audio.currentTime = 0;
          }
        } catch (error) {
          // Erro ao parar elemento de áudio
        }
      });
    } catch (error) {
      // Erro ao buscar elementos de áudio na página
    }
  }, [isPlaying, stopNotificationSound]);

  // ✅ FUNÇÃO PARA INICIAR SOM CONTÍNUO
  const iniciarSomContinuo = useCallback(() => {
    // Verificações de segurança
    if (somContinuoAtivo) {
      return;
    }

    if (contadorPendentes === 0) {
      return;
    }

    // ✅ NOVA VERIFICAÇÃO: Se foi desabilitado pelo usuário, não iniciar
    if (somDesabilitadoPeloUsuario) {
      return;
    }

    setSomContinuoAtivo(true);

    // Limpar intervalo anterior se existir (segurança)
    if (intervalSomRef.current) {
      clearInterval(intervalSomRef.current);
      intervalSomRef.current = null;
    }

    // ✅ NOVA LÓGICA: Função para tocar 2 vezes consecutivas (aguardando cada som terminar)
    const tocarDuasVezes = async () => {
      try {
        await tocarSomNotificacao(true);

        // Aguardar o som terminar completamente (duração do som + margem de segurança)
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 segundos para garantir que terminou

        await tocarSomNotificacao(true);
      } catch (error) {
        // Erro ao tocar sequência de sons
      }
    };

    // Tocar 2 vezes imediatamente
    tocarDuasVezes();

    // Configurar intervalo para tocar 2 vezes a cada ciclo
    intervalSomRef.current = setInterval(() => {
      // Verificar se ainda há pedidos pendentes
      if (contadorPendentes > 0) {
        tocarDuasVezes();
      } else {
        if (intervalSomRef.current) {
          clearInterval(intervalSomRef.current);
          intervalSomRef.current = null;
        }
        setSomContinuoAtivo(false);
      }
    }, 5000); // ✅ AJUSTADO: 5 segundos de pausa entre ciclos

  }, [contadorPendentes, somContinuoAtivo, somDesabilitadoPeloUsuario, tocarSomNotificacao]);

  // ✅ FUNÇÃO PARA PARAR SOM CONTÍNUO
  const pararSomContinuo = useCallback(() => {
    // ✅ NOVO: Parar todos os sons imediatamente
    pararTodosSonsImediatamente();

    if (intervalSomRef.current) {
      clearInterval(intervalSomRef.current);
      intervalSomRef.current = null;
    }
    setSomContinuoAtivo(false);
  }, [pararTodosSonsImediatamente]);

  // ✅ NOVA FUNÇÃO PARA DESABILITAR SOM PELO USUÁRIO
  const desabilitarSomPeloUsuario = useCallback(() => {
    // ✅ NOVO: Parar todos os sons imediatamente ANTES de desabilitar
    pararTodosSonsImediatamente();

    setSomDesabilitadoPeloUsuario(true);
    pararSomContinuo();
  }, [pararTodosSonsImediatamente, pararSomContinuo]);

  // ✅ NOVA FUNÇÃO PARA REABILITAR SOM PELO USUÁRIO
  const reabilitarSomPeloUsuario = useCallback(() => {
    setSomDesabilitadoPeloUsuario(false);

    // ✅ NOVO: Se há pedidos pendentes, iniciar som imediatamente
    if (contadorPendentes > 0 && !somContinuoAtivo && audioHabilitado) {
      setTimeout(() => iniciarSomContinuo(), 100); // Delay mínimo apenas para garantir que o estado foi atualizado
    }
  }, [contadorPendentes, somContinuoAtivo, audioHabilitado, iniciarSomContinuo]);

  // ✅ CARREGAR PEDIDOS PENDENTES
  const carregarPedidosPendentes = useCallback(async () => {
    if (!empresaId || !enabled) {
      return;
    }

    try {
      setIsLoading(true);

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
        return;
      }

      const pedidos = data || [];
      const contadorAnterior = contadorPendentes;
      const novoContador = pedidos.length;

      setPedidosPendentes(pedidos);
      setContadorPendentes(novoContador);

      // ✅ INICIAR SOM CONTÍNUO SE HÁ PEDIDOS PENDENTES E NÃO FOI DESABILITADO PELO USUÁRIO
      if (novoContador > 0 && !somContinuoAtivo && !somDesabilitadoPeloUsuario) {
        setTimeout(() => iniciarSomContinuo(), 200); // Delay reduzido para melhor responsividade
      }

    } catch (error) {
      // Erro ao carregar pedidos
    } finally {
      setIsLoading(false);
    }
  }, [empresaId, enabled, contadorPendentes, somContinuoAtivo, somDesabilitadoPeloUsuario, iniciarSomContinuo]);

  // ✅ ACEITAR PEDIDO
  const aceitarPedido = useCallback(async (pedidoId: string) => {
    if (pedidosProcessando.has(pedidoId)) return false;

    try {
      // Adicionar pedido ao conjunto de processamento
      setPedidosProcessando(prev => new Set(prev).add(pedidoId));

      const { error } = await supabase
        .from('cardapio_digital')
        .update({
          status_pedido: 'confirmado',
          data_confirmacao: new Date().toISOString()
        })
        .eq('id', pedidoId);

      if (error) {
        showMessage('error', 'Erro ao aceitar pedido');
        return false;
      }

      showMessage('success', 'Pedido aceito com sucesso!');
      await carregarPedidosPendentes(); // Recarregar lista

      // Notificar componente pai sobre mudança
      if (onPedidoChange) {
        onPedidoChange();
      }

      return true;

    } catch (error) {
      showMessage('error', 'Erro ao aceitar pedido');
      return false;
    } finally {
      // Remover pedido do conjunto de processamento
      setPedidosProcessando(prev => {
        const newSet = new Set(prev);
        newSet.delete(pedidoId);
        return newSet;
      });
    }
  }, [carregarPedidosPendentes, onPedidoChange, pedidosProcessando]);

  // ✅ REJEITAR PEDIDO
  const rejeitarPedido = useCallback(async (pedidoId: string, motivo?: string) => {
    if (pedidosProcessando.has(pedidoId)) return false;

    try {
      // Adicionar pedido ao conjunto de processamento
      setPedidosProcessando(prev => new Set(prev).add(pedidoId));

      const { error } = await supabase
        .from('cardapio_digital')
        .update({
          status_pedido: 'cancelado',
          observacao_pedido: motivo ? `Rejeitado: ${motivo}` : 'Pedido rejeitado pelo estabelecimento'
        })
        .eq('id', pedidoId);

      if (error) {
        showMessage('error', 'Erro ao rejeitar pedido');
        return false;
      }

      showMessage('success', 'Pedido rejeitado');
      await carregarPedidosPendentes(); // Recarregar lista

      // Notificar componente pai sobre mudança
      if (onPedidoChange) {
        onPedidoChange();
      }

      return true;

    } catch (error) {
      showMessage('error', 'Erro ao rejeitar pedido');
      return false;
    } finally {
      // Remover pedido do conjunto de processamento
      setPedidosProcessando(prev => {
        const newSet = new Set(prev);
        newSet.delete(pedidoId);
        return newSet;
      });
    }
  }, [carregarPedidosPendentes, onPedidoChange, pedidosProcessando]);

  // ✅ CONFIGURAR REALTIME PARA NOVOS PEDIDOS
  useEffect(() => {
    if (!empresaId || !enabled) {
      return;
    }

    const channelName = `cardapio_digital_${empresaId}`;

    console.log('🔗 Configurando Realtime para empresa:', empresaId);
    console.log('🔄 Callback onPedidoChange disponível:', !!onPedidoChange);

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
          console.log('🆕 Novo pedido recebido via Realtime:', payload.new);

          // Tocar som de notificação IMEDIATAMENTE
          tocarSomNotificacao();

          // Mostrar notificação visual
          const novoPedido = payload.new as PedidoCardapio;
          showMessage('info', `🍽️ Novo pedido #${novoPedido.numero_pedido} de ${novoPedido.nome_cliente}`);

          // Recarregar lista de pedidos pendentes
          carregarPedidosPendentes();

          // ✅ SEMPRE notificar componente pai sobre mudança (para atualizar modal completo)
          console.log('🔄 Chamando onPedidoChange callback...');
          console.log('🔄 Callback ainda disponível:', !!onPedidoChange);
          if (onPedidoChange) {
            console.log('✅ Executando callback onPedidoChange');
            onPedidoChange();
          } else {
            console.log('❌ onPedidoChange callback não definido');
          }
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
          console.log('🔄 Pedido atualizado via Realtime:', payload.new);

          // ✅ SEMPRE recarregar lista de pedidos pendentes quando houver UPDATE
          carregarPedidosPendentes();

          // ✅ SEMPRE notificar componente pai sobre mudança (para atualizar modal completo)
          console.log('🔄 UPDATE - Chamando onPedidoChange callback...');
          if (onPedidoChange) {
            console.log('✅ UPDATE - Executando callback onPedidoChange');
            onPedidoChange();
          } else {
            console.log('❌ UPDATE - onPedidoChange callback não definido');
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Realtime ativo - aguardando novos pedidos
        } else if (status === 'CHANNEL_ERROR') {
          // Erro no canal realtime
        } else if (status === 'TIMED_OUT') {
          // Timeout no canal realtime
        }
      });

    // Carregar pedidos iniciais
    carregarPedidosPendentes();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [empresaId, enabled, tocarSomNotificacao, carregarPedidosPendentes]);

  // ✅ SOM CONTÍNUO QUANDO HÁ PEDIDOS PENDENTES (MONITORAMENTO ATIVO)
  useEffect(() => {
    // Se há pedidos pendentes, áudio habilitado, som não está ativo E não foi desabilitado pelo usuário, iniciar
    if (contadorPendentes > 0 && !somContinuoAtivo && empresaId && enabled && audioHabilitado && !somDesabilitadoPeloUsuario) {
      setTimeout(() => iniciarSomContinuo(), 300); // Delay reduzido para melhor responsividade
    }
    // Se não há pedidos pendentes e som está ativo, parar
    else if (contadorPendentes === 0 && somContinuoAtivo) {
      pararSomContinuo();
    }
    // ✅ NOVO: Se foi desabilitado pelo usuário e som está ativo, parar imediatamente
    else if (somDesabilitadoPeloUsuario && somContinuoAtivo) {
      pararSomContinuo();
    }
  }, [contadorPendentes, somContinuoAtivo, empresaId, enabled, audioHabilitado, somDesabilitadoPeloUsuario, iniciarSomContinuo, pararSomContinuo]);

  // ✅ MONITORAMENTO INICIAL - VERIFICAR PEDIDOS EXISTENTES AO CARREGAR
  useEffect(() => {
    if (empresaId && enabled) {
      carregarPedidosPendentes();

      // Verificar novamente após 3 segundos para garantir
      const timeoutVerificacao = setTimeout(() => {
        carregarPedidosPendentes();
      }, 3000);

      return () => clearTimeout(timeoutVerificacao);
    }
  }, [empresaId, enabled, carregarPedidosPendentes]);

  // ✅ CLEANUP DO INTERVALO AO DESMONTAR
  useEffect(() => {
    return () => {
      if (intervalSomRef.current) {
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
    pararSomContinuo,
    habilitarAudio,
    audioHabilitado,
    desabilitarSomPeloUsuario,
    reabilitarSomPeloUsuario,
    somDesabilitadoPeloUsuario,
    pararTodosSonsImediatamente,
    pedidosProcessando
  };
};
