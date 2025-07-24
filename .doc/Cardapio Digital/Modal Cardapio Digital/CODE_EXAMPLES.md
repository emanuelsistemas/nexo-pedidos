# 💻 Exemplos de Código: Realtime + Modal Auto-Update

## 🔧 **HOOK FINAL IMPLEMENTADO**

### **useCardapioDigitalNotifications.ts**

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface UseCardapioDigitalNotificationsProps {
  empresaId: string;
  enabled: boolean;
  onPedidoChange: () => void;
}

export const useCardapioDigitalNotifications = ({
  empresaId,
  enabled,
  onPedidoChange
}: UseCardapioDigitalNotificationsProps) => {
  
  // ✅ ESTABILIZAÇÃO COM useRef
  const empresaIdRef = useRef(empresaId);
  const enabledRef = useRef(enabled);
  const onPedidoChangeRef = useRef(onPedidoChange);
  const isInitializedRef = useRef(false);

  // Estados
  const [pedidosPendentes, setPedidosPendentes] = useState([]);
  const [contadorPendentes, setContadorPendentes] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ ATUALIZAR REFS QUANDO PROPS MUDAREM
  empresaIdRef.current = empresaId;
  enabledRef.current = enabled;
  onPedidoChangeRef.current = onPedidoChange;

  // ✅ FUNÇÃO INTELIGENTE DE CARREGAMENTO
  const carregarPedidosPendentes = useCallback(async (chamarCallback = false) => {
    const currentEmpresaId = empresaIdRef.current;
    const currentEnabled = enabledRef.current;
    
    if (!currentEmpresaId || !currentEnabled) {
      console.log('❌ [HOOK] carregarPedidosPendentes: empresaId ou enabled inválido');
      return;
    }

    try {
      console.log('🔍 [HOOK] Carregando pedidos pendentes para empresa:', currentEmpresaId);
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
        .eq('empresa_id', currentEmpresaId)
        .eq('status_pedido', 'pendente')
        .order('data_pedido', { ascending: false });

      if (error) {
        console.error('❌ [HOOK] Erro ao carregar pedidos pendentes:', error);
        return;
      }

      const pedidos = data || [];
      const contadorAnterior = contadorPendentes;
      const novoContador = pedidos.length;

      console.log('✅ [HOOK] Pedidos pendentes carregados:', novoContador);
      console.log('📊 [HOOK] Contador anterior:', contadorAnterior, '→ Novo contador:', novoContador);

      setPedidosPendentes(pedidos);
      setContadorPendentes(novoContador);

      // ✅ SE HOUVE AUMENTO NO CONTADOR OU chamarCallback=true, NOTIFICAR COMPONENTE PAI
      if ((novoContador > contadorAnterior) || chamarCallback) {
        console.log('🔔 [HOOK] Novo pedido detectado ou callback solicitado - Notificando componente pai');
        const currentCallback = onPedidoChangeRef.current;
        if (currentCallback && typeof currentCallback === 'function') {
          console.log('✅ [HOOK] Executando callback onPedidoChange');
          try {
            currentCallback();
            console.log('✅ [HOOK] Callback executado com sucesso');
          } catch (error) {
            console.error('❌ [HOOK] Erro ao executar callback:', error);
          }
        }
      }

    } catch (error) {
      console.error('❌ [HOOK] Erro ao carregar pedidos:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ✅ CONFIGURAR REALTIME PARA NOVOS PEDIDOS - REATIVO
  useEffect(() => {
    console.log('🔧 [REALTIME-SETUP] useEffect executado - empresaId:', empresaId, 'enabled:', enabled);

    if (!empresaId || !enabled) {
      console.log('❌ [REALTIME-SETUP] Não configurando Realtime - empresaId:', empresaId, 'enabled:', enabled);
      return;
    }

    console.log('🔧 [REALTIME-SETUP] Configurando Realtime para empresa:', empresaId);
    const channelName = `cardapio_digital_${empresaId}`;
    console.log('🔧 [REALTIME-SETUP] Nome do canal:', channelName);

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
          console.log('🆕 [REALTIME] *** EVENTO INSERT DETECTADO ***');
          console.log('🆕 [REALTIME] Novo pedido recebido via Realtime:', payload.new);
          
          // Recarregar lista de pedidos pendentes
          carregarPedidosPendentes();

          // Notificar componente pai
          const currentCallback = onPedidoChangeRef.current;
          if (currentCallback && typeof currentCallback === 'function') {
            console.log('✅ [REALTIME] Executando callback onPedidoChange');
            currentCallback();
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
          console.log('🔄 [REALTIME] *** EVENTO UPDATE DETECTADO ***');
          
          // Recarregar lista de pedidos pendentes
          carregarPedidosPendentes();

          // Notificar componente pai
          const currentCallback = onPedidoChangeRef.current;
          if (currentCallback) {
            console.log('🔄 [REALTIME] Executando callback UPDATE');
            currentCallback();
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 [REALTIME-SETUP] Status da subscription:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ [REALTIME-SETUP] Realtime ativo - aguardando novos pedidos');
        }
      });

    // Carregar pedidos iniciais
    carregarPedidosPendentes();

    console.log('✅ [REALTIME-SETUP] Subscription criada para canal:', channelName);

    // Cleanup
    return () => {
      console.log('🔌 [REALTIME-SETUP] Desconectando canal:', channelName);
      supabase.removeChannel(channel);
    };
  }, [empresaId, enabled]); // ✅ REAGIR QUANDO empresaId OU enabled MUDAREM

  // ✅ POLLING INTELIGENTE (a cada 5 segundos) - CHAMA CALLBACK QUANDO DETECTA MUDANÇAS
  useEffect(() => {
    const interval = setInterval(() => {
      const currentEnabled = enabledRef.current;
      if (currentEnabled) {
        console.log('🔄 [POLLING] Verificando novos pedidos...');
        carregarPedidosPendentes(true); // ✅ SEMPRE CHAMAR CALLBACK NO POLLING
      }
    }, 5000); // 5 segundos - mais responsivo

    return () => clearInterval(interval);
  }, []); // ✅ SEM DEPENDÊNCIAS - USAR REFS

  return {
    pedidosPendentes,
    contadorPendentes,
    isLoading,
    carregarPedidosPendentes
  };
};
```

---

## 🎯 **COMPONENTE PAI (PDVPage.tsx)**

### **Implementação do Callback Estável**

```typescript
import React, { useCallback, useRef, useEffect } from 'react';
import { useCardapioDigitalNotifications } from '@/hooks/useCardapioDigitalNotifications';

export const PDVPage = () => {
  const [showCardapioDigitalModal, setShowCardapioDigitalModal] = useState(false);
  const modalCardapioAbertoRef = useRef(false);
  const [empresaData, setEmpresaData] = useState(null);

  // ✅ SINCRONIZAR REF COM ESTADO DO MODAL
  useEffect(() => {
    modalCardapioAbertoRef.current = showCardapioDigitalModal;
  }, [showCardapioDigitalModal]);

  // ✅ CALLBACK ESTÁVEL PARA NOTIFICAÇÕES
  const onPedidoChangeStable = useCallback(() => {
    console.log('🔄 [CALLBACK] onPedidoChange chamado - Modal aberto:', modalCardapioAbertoRef.current);
    console.log('🔄 [CALLBACK] empresaData?.id:', empresaData?.id);
    if (modalCardapioAbertoRef.current) {
      console.log('📋 [CALLBACK] Modal está aberto - Chamando carregarTodosPedidosCardapio...');
      carregarTodosPedidosCardapio();
    } else {
      console.log('📋 [CALLBACK] Modal não está aberto - não recarregando');
    }
  }, [empresaData?.id]); // ✅ ADICIONAR empresaData?.id como dependência

  // ✅ HOOK PARA NOTIFICAÇÕES DO CARDÁPIO DIGITAL
  const {
    pedidosPendentes,
    contadorCardapio,
    isLoading,
    carregarPedidosPendentes
  } = useCardapioDigitalNotifications({
    empresaId: empresaData?.id || '',
    enabled: !!empresaData?.id,
    onPedidoChange: onPedidoChangeStable
  });

  // ✅ FUNÇÃO PARA CARREGAR TODOS OS PEDIDOS DO CARDÁPIO DIGITAL
  const carregarTodosPedidosCardapio = async () => {
    if (!empresaData?.id) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('cardapio_digital')
        .select('*')
        .eq('empresa_id', empresaData.id)
        .order('data_pedido', { ascending: false });

      if (error) {
        console.error('❌ Erro ao carregar pedidos do cardápio:', error);
        return;
      }

      setTodosOsPedidosCardapio(data || []);
      console.log('✅ [MODAL] Lista de pedidos atualizada:', data?.length || 0);
    } catch (error) {
      console.error('❌ Erro ao carregar pedidos:', error);
    }
  };

  // ✅ USEEFFECT PARA CARREGAR PEDIDOS DO CARDÁPIO QUANDO MODAL ABRIR
  useEffect(() => {
    if (showCardapioDigitalModal && empresaData?.id) {
      carregarTodosPedidosCardapio();
    }
  }, [showCardapioDigitalModal, empresaData?.id]);

  return (
    <div>
      {/* Badge com contador */}
      <button onClick={() => setShowCardapioDigitalModal(true)}>
        Cardápio Digital
        {contadorCardapio > 0 && (
          <span className="badge">{contadorCardapio}</span>
        )}
      </button>

      {/* Modal */}
      {showCardapioDigitalModal && (
        <div className="modal">
          <button onClick={() => carregarTodosPedidosCardapio()}>
            🔄 Atualizar
          </button>
          {/* Lista de pedidos */}
        </div>
      )}
    </div>
  );
};
```

---

## 🔍 **LOGS DE DEBUG ESTRUTURADOS**

### **Sequência de Logs Esperada**

```bash
# 1. Inicialização
🔧 [HOOK-INIT] Hook useCardapioDigitalNotifications inicializado
🔧 [REALTIME-SETUP] useEffect executado - empresaId:  enabled: false
❌ [REALTIME-SETUP] Não configurando Realtime

# 2. Quando empresaId fica disponível
🔧 [REALTIME-SETUP] useEffect executado - empresaId: abc123 enabled: true
🔧 [REALTIME-SETUP] Configurando Realtime para empresa: abc123
📡 [REALTIME-SETUP] Status da subscription: SUBSCRIBED
✅ [REALTIME-SETUP] Realtime ativo - aguardando novos pedidos

# 3. Polling periódico
🔄 [POLLING] Verificando novos pedidos...
🔍 [HOOK] Carregando pedidos pendentes para empresa: abc123
📊 [HOOK] Contador anterior: 0 → Novo contador: 1

# 4. Novo pedido detectado
🔔 [HOOK] Novo pedido detectado - Notificando componente pai
✅ [HOOK] Executando callback onPedidoChange
🔄 [CALLBACK] onPedidoChange chamado - Modal aberto: true
📋 [CALLBACK] Modal está aberto - Chamando carregarTodosPedidosCardapio...
✅ [MODAL] Lista de pedidos atualizada: 1
```

---

*Exemplos de código da solução implementada para auto-atualização do modal do cardápio digital.*
