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
  const [somDesabilitadoPeloUsuario, setSomDesabilitadoPeloUsuario] = useState(false);

  // ✅ HOOK DE SOM PARA NOTIFICAÇÕES COM CONTROLES
  const [playNotificationSound, { stop: stopNotificationSound, isPlaying }] = useSound('/sounds/notification.mp3', {
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

  // ✅ FUNÇÃO PARA HABILITAR ÁUDIO COM INTERAÇÃO DO USUÁRIO
  const habilitarAudio = useCallback(async () => {
    if (audioHabilitado) return true;

    try {
      console.log('🔊 Habilitando áudio com interação do usuário...');
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.1; // Volume baixo para teste

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
        audio.pause();
        audio.currentTime = 0;
        setAudioHabilitado(true);
        console.log('✅ Áudio habilitado com sucesso');
        return true;
      }
    } catch (error) {
      console.error('❌ Erro ao habilitar áudio:', error);
    }

    return false;
  }, [audioHabilitado]);

  // ✅ FUNÇÃO PARA TOCAR SOM COM FALLBACK MELHORADO
  const tocarSomNotificacao = useCallback(async (forcado = false) => {
    const tipoSom = forcado ? 'FORÇADO' : 'AUTOMÁTICO';
    console.log(`🔊 === INICIANDO REPRODUÇÃO DE SOM ${tipoSom} ===`);
    console.log('🔊 Timestamp:', new Date().toISOString());
    console.log('🔊 Pedidos pendentes:', contadorPendentes);
    console.log('🔊 Áudio habilitado:', audioHabilitado);
    console.log('🔊 Som desabilitado pelo usuário:', somDesabilitadoPeloUsuario);

    // ✅ NOVA VERIFICAÇÃO: Se foi desabilitado pelo usuário, não tocar (mesmo se forçado)
    if (somDesabilitadoPeloUsuario && !forcado) {
      console.log('🔇 Som foi desabilitado pelo usuário, não tocando');
      return false;
    }

    // Se não está habilitado e é forçado, tentar habilitar
    if (!audioHabilitado && forcado) {
      const habilitado = await habilitarAudio();
      if (!habilitado) {
        console.log('❌ Não foi possível habilitar áudio');
        return false;
      }
    }

    // Se não está habilitado e é automático, não tocar
    if (!audioHabilitado && !forcado) {
      console.log('⚠️ Áudio não habilitado, som automático bloqueado');
      return false;
    }

    // Método 1: Tentar usar useSound (mais confiável após habilitação)
    try {
      console.log('🔊 Método 1: Tentando useSound...');
      playNotificationSound();
      console.log('✅ useSound executado com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro no useSound:', error);
    }

    // Método 2: Audio API direto
    try {
      console.log('🔊 Método 2: Tentando Audio API direto...');
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 1.0;

      // ✅ NOVO: Registrar instância de áudio para controle
      audioInstancesRef.current.push(audio);

      // ✅ NOVO: Remover da lista quando terminar
      audio.addEventListener('ended', () => {
        const index = audioInstancesRef.current.indexOf(audio);
        if (index > -1) {
          audioInstancesRef.current.splice(index, 1);
          console.log('🔊 Áudio removido da lista de controle');
        }
      });

      // ✅ NOVO: Remover da lista se houver erro
      audio.addEventListener('error', () => {
        const index = audioInstancesRef.current.indexOf(audio);
        if (index > -1) {
          audioInstancesRef.current.splice(index, 1);
          console.log('🔊 Áudio removido da lista de controle (erro)');
        }
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

    console.log('🔊 === FIM DA REPRODUÇÃO DE SOM ===');
    return false;
  }, [playNotificationSound, contadorPendentes, audioHabilitado, somDesabilitadoPeloUsuario, habilitarAudio]);

  // ✅ REFERÊNCIA PARA O INTERVALO DO SOM CONTÍNUO
  const intervalSomRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ REFERÊNCIA PARA CONTROLAR INSTÂNCIAS DE ÁUDIO ATIVAS
  const audioInstancesRef = useRef<HTMLAudioElement[]>([]);

  // ✅ FUNÇÃO PARA PARAR TODOS OS SONS IMEDIATAMENTE
  const pararTodosSonsImediatamente = useCallback(() => {
    console.log('🔇 PARANDO TODOS OS SONS IMEDIATAMENTE!');

    // ✅ NOVO: Parar useSound primeiro (se estiver tocando)
    try {
      if (isPlaying) {
        console.log('🔇 Parando useSound (estava tocando)...');
        stopNotificationSound();
        console.log('✅ useSound parado com sucesso');
      } else {
        console.log('🔇 useSound não estava tocando');
      }
    } catch (error) {
      console.error('❌ Erro ao parar useSound:', error);
    }

    // Parar todas as instâncias de áudio ativas
    audioInstancesRef.current.forEach((audio, index) => {
      try {
        audio.pause();
        audio.currentTime = 0;
        console.log(`🔇 Áudio ${index + 1} parado`);
      } catch (error) {
        console.error(`❌ Erro ao parar áudio ${index + 1}:`, error);
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
            console.log(`🔇 Elemento de áudio da página ${index + 1} parado`);
          }
        } catch (error) {
          console.error(`❌ Erro ao parar elemento de áudio ${index + 1}:`, error);
        }
      });

      if (allAudioElements.length > 0) {
        console.log(`🔇 Total de ${allAudioElements.length} elementos de áudio verificados na página`);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar elementos de áudio na página:', error);
    }

    console.log('✅ Todos os sons foram parados imediatamente');
  }, [isPlaying, stopNotificationSound]);

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

    // ✅ NOVA VERIFICAÇÃO: Se foi desabilitado pelo usuário, não iniciar
    if (somDesabilitadoPeloUsuario) {
      console.log('🔇 Som foi desabilitado pelo usuário, não iniciando...');
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

    // ✅ NOVA LÓGICA: Função para tocar 2 vezes consecutivas (aguardando cada som terminar)
    const tocarDuasVezes = async () => {
      try {
        console.log('🔔 Tocando som 1/2...');
        await tocarSomNotificacao(true);

        // Aguardar o som terminar completamente (duração do som + margem de segurança)
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 segundos para garantir que terminou

        console.log('🔔 Tocando som 2/2...');
        await tocarSomNotificacao(true);

        console.log('✅ Sequência de 2 sons concluída');
      } catch (error) {
        console.error('❌ Erro ao tocar sequência de sons:', error);
      }
    };

    // Tocar 2 vezes imediatamente
    console.log('🔊 Tocando som inicial (2x)...');
    tocarDuasVezes();

    // Configurar intervalo para tocar 2 vezes a cada ciclo
    intervalSomRef.current = setInterval(() => {
      console.log('🔔 VERIFICAÇÃO PERIÓDICA - Pedidos pendentes:', contadorPendentes);

      // Verificar se ainda há pedidos pendentes
      if (contadorPendentes > 0) {
        console.log('🔔 SOM CONTÍNUO - Tocando 2x novamente...');
        tocarDuasVezes();
      } else {
        console.log('🔕 PARANDO SOM CONTÍNUO - Sem pedidos pendentes');
        if (intervalSomRef.current) {
          clearInterval(intervalSomRef.current);
          intervalSomRef.current = null;
        }
        setSomContinuoAtivo(false);
      }
    }, 5000); // ✅ AJUSTADO: 5 segundos de pausa entre ciclos

    console.log('✅ Som contínuo configurado com sucesso!');

  }, [contadorPendentes, somContinuoAtivo, somDesabilitadoPeloUsuario, tocarSomNotificacao]);

  // ✅ FUNÇÃO PARA PARAR SOM CONTÍNUO
  const pararSomContinuo = useCallback(() => {
    console.log('🔕 Parando som contínuo manualmente');

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
    console.log('🔇 Som desabilitado pelo usuário');

    // ✅ NOVO: Parar todos os sons imediatamente ANTES de desabilitar
    pararTodosSonsImediatamente();

    setSomDesabilitadoPeloUsuario(true);
    pararSomContinuo();
  }, [pararTodosSonsImediatamente, pararSomContinuo]);

  // ✅ NOVA FUNÇÃO PARA REABILITAR SOM PELO USUÁRIO
  const reabilitarSomPeloUsuario = useCallback(() => {
    console.log('🔊 Som reabilitado pelo usuário');
    setSomDesabilitadoPeloUsuario(false);

    // ✅ NOVO: Se há pedidos pendentes, iniciar som imediatamente
    if (contadorPendentes > 0 && !somContinuoAtivo && audioHabilitado) {
      console.log('🔔 REABILITAÇÃO: Iniciando som imediatamente - há pedidos pendentes!');
      setTimeout(() => iniciarSomContinuo(), 100); // Delay mínimo apenas para garantir que o estado foi atualizado
    }
  }, [contadorPendentes, somContinuoAtivo, audioHabilitado, iniciarSomContinuo]);

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

      // ✅ INICIAR SOM CONTÍNUO SE HÁ PEDIDOS PENDENTES E NÃO FOI DESABILITADO PELO USUÁRIO
      if (novoContador > 0 && !somContinuoAtivo && !somDesabilitadoPeloUsuario) {
        console.log('🔔 DETECTADOS PEDIDOS PENDENTES - INICIANDO SOM CONTÍNUO IMEDIATAMENTE!');
        setTimeout(() => iniciarSomContinuo(), 200); // Delay reduzido para melhor responsividade
      }

    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [empresaId, enabled, contadorPendentes, somContinuoAtivo, somDesabilitadoPeloUsuario, iniciarSomContinuo]);

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
      audioHabilitado,
      somDesabilitadoPeloUsuario,
      timestamp: new Date().toISOString()
    });

    // Se há pedidos pendentes, áudio habilitado, som não está ativo E não foi desabilitado pelo usuário, iniciar
    if (contadorPendentes > 0 && !somContinuoAtivo && empresaId && enabled && audioHabilitado && !somDesabilitadoPeloUsuario) {
      console.log('🔔 DETECTADOS PEDIDOS PENDENTES - INICIANDO SOM CONTÍNUO AUTOMATICAMENTE!');
      setTimeout(() => iniciarSomContinuo(), 300); // Delay reduzido para melhor responsividade
    }
    // Se não há pedidos pendentes e som está ativo, parar
    else if (contadorPendentes === 0 && somContinuoAtivo) {
      console.log('🔕 SEM PEDIDOS PENDENTES - PARANDO SOM CONTÍNUO AUTOMATICAMENTE!');
      pararSomContinuo();
    }
    // ✅ NOVO: Se foi desabilitado pelo usuário e som está ativo, parar imediatamente
    else if (somDesabilitadoPeloUsuario && somContinuoAtivo) {
      console.log('🔇 SOM DESABILITADO PELO USUÁRIO - PARANDO SOM CONTÍNUO IMEDIATAMENTE!');
      pararSomContinuo();
    }
  }, [contadorPendentes, somContinuoAtivo, empresaId, enabled, audioHabilitado, somDesabilitadoPeloUsuario, iniciarSomContinuo, pararSomContinuo]);

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
    pararSomContinuo,
    habilitarAudio,
    audioHabilitado,
    desabilitarSomPeloUsuario,
    reabilitarSomPeloUsuario,
    somDesabilitadoPeloUsuario,
    pararTodosSonsImediatamente
  };
};
