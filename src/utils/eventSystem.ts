/**
 * Sistema de eventos em tempo real para comunicação entre componentes
 * Usa window.dispatchEvent com CustomEvent para comunicação global
 */

// Tipos de eventos disponíveis
export const EVENT_TYPES = {
  PEDIDO_CRIADO: 'pedido:criado',
  PEDIDO_ATUALIZADO: 'pedido:atualizado',
  PEDIDO_CANCELADO: 'pedido:cancelado',
  PEDIDO_FATURADO: 'pedido:faturado',
  PEDIDOS_RECARREGAR: 'pedidos:recarregar'
} as const;

// Interface para dados do evento de pedido
export interface PedidoEventData {
  pedidoId: string;
  numero: string;
  status: string;
  empresaId: string;
  valorTotal: number;
  clienteNome?: string;
  action: 'created' | 'updated' | 'cancelled' | 'invoiced';
}

// Interface para evento de recarregar
export interface RecarregarEventData {
  empresaId: string;
  forceReload?: boolean;
}

/**
 * Dispara um evento de pedido criado
 */
export const dispatchPedidoCriado = (data: Omit<PedidoEventData, 'action'>) => {
  const event = new CustomEvent(EVENT_TYPES.PEDIDO_CRIADO, {
    detail: { ...data, action: 'created' }
  });
  window.dispatchEvent(event);
};

/**
 * Dispara um evento de pedido atualizado
 */
export const dispatchPedidoAtualizado = (data: Omit<PedidoEventData, 'action'>) => {
  const event = new CustomEvent(EVENT_TYPES.PEDIDO_ATUALIZADO, {
    detail: { ...data, action: 'updated' }
  });
  window.dispatchEvent(event);
};

/**
 * Dispara um evento de pedido cancelado
 */
export const dispatchPedidoCancelado = (data: Omit<PedidoEventData, 'action'>) => {
  const event = new CustomEvent(EVENT_TYPES.PEDIDO_CANCELADO, {
    detail: { ...data, action: 'cancelled' }
  });
  window.dispatchEvent(event);
};

/**
 * Dispara um evento de pedido faturado
 */
export const dispatchPedidoFaturado = (data: Omit<PedidoEventData, 'action'>) => {
  const event = new CustomEvent(EVENT_TYPES.PEDIDO_FATURADO, {
    detail: { ...data, action: 'invoiced' }
  });
  window.dispatchEvent(event);
};

/**
 * Dispara um evento para recarregar lista de pedidos
 */
export const dispatchPedidosRecarregar = (data: RecarregarEventData) => {
  const event = new CustomEvent(EVENT_TYPES.PEDIDOS_RECARREGAR, {
    detail: data
  });
  window.dispatchEvent(event);
};

/**
 * Hook para escutar eventos de pedidos
 */
export const usePedidoEvents = (
  onPedidoCriado?: (data: PedidoEventData) => void,
  onPedidoAtualizado?: (data: PedidoEventData) => void,
  onPedidoCancelado?: (data: PedidoEventData) => void,
  onPedidoFaturado?: (data: PedidoEventData) => void,
  onPedidosRecarregar?: (data: RecarregarEventData) => void
) => {
  const addEventListeners = () => {
    if (onPedidoCriado) {
      window.addEventListener(EVENT_TYPES.PEDIDO_CRIADO, (e: any) => {
        onPedidoCriado(e.detail);
      });
    }

    if (onPedidoAtualizado) {
      window.addEventListener(EVENT_TYPES.PEDIDO_ATUALIZADO, (e: any) => {
        onPedidoAtualizado(e.detail);
      });
    }

    if (onPedidoCancelado) {
      window.addEventListener(EVENT_TYPES.PEDIDO_CANCELADO, (e: any) => {
        onPedidoCancelado(e.detail);
      });
    }

    if (onPedidoFaturado) {
      window.addEventListener(EVENT_TYPES.PEDIDO_FATURADO, (e: any) => {
        onPedidoFaturado(e.detail);
      });
    }

    if (onPedidosRecarregar) {
      window.addEventListener(EVENT_TYPES.PEDIDOS_RECARREGAR, (e: any) => {
        onPedidosRecarregar(e.detail);
      });
    }
  };

  const removeEventListeners = () => {
    if (onPedidoCriado) {
      window.removeEventListener(EVENT_TYPES.PEDIDO_CRIADO, onPedidoCriado as any);
    }
    if (onPedidoAtualizado) {
      window.removeEventListener(EVENT_TYPES.PEDIDO_ATUALIZADO, onPedidoAtualizado as any);
    }
    if (onPedidoCancelado) {
      window.removeEventListener(EVENT_TYPES.PEDIDO_CANCELADO, onPedidoCancelado as any);
    }
    if (onPedidoFaturado) {
      window.removeEventListener(EVENT_TYPES.PEDIDO_FATURADO, onPedidoFaturado as any);
    }
    if (onPedidosRecarregar) {
      window.removeEventListener(EVENT_TYPES.PEDIDOS_RECARREGAR, onPedidosRecarregar as any);
    }
  };

  return { addEventListeners, removeEventListeners };
};

/**
 * Função utilitária para contar pedidos pendentes
 */
export const contarPedidosPendentes = async (empresaId: string): Promise<number> => {
  try {
    const { supabase } = await import('../lib/supabase');
    
    const { count, error } = await supabase
      .from('pedidos')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
      .eq('status', 'pendente')
      .eq('deletado', false);

    if (error) {
      console.error('Erro ao contar pedidos pendentes:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Erro ao contar pedidos pendentes:', error);
    return 0;
  }
};
