/**
 * Sistema de eventos global para comunicação entre componentes
 * Específico para cada empresa (SAAS)
 */

type EventCallback = (data?: any) => void;

class EventBus {
  private events: Map<string, EventCallback[]> = new Map();

  /**
   * Registra um listener para um evento
   */
  on(event: string, callback: EventCallback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    this.events.get(event)!.push(callback);

    // Retorna função para remover o listener
    return () => this.off(event, callback);
  }

  /**
   * Remove um listener de um evento
   */
  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emite um evento para todos os listeners
   */
  emit(event: string, data?: any): void {
    const callbacks = this.events.get(event);
    console.log(`🔥 EventBus.emit: Evento "${event}" - ${callbacks ? callbacks.length : 0} listeners registrados`);

    if (callbacks && callbacks.length > 0) {
      console.log(`🔥 EventBus.emit: Executando ${callbacks.length} callbacks para evento "${event}"`);
      callbacks.forEach((callback, index) => {
        try {
          console.log(`🔥 EventBus.emit: Executando callback ${index + 1}/${callbacks.length}`);
          callback(data);
          console.log(`✅ EventBus.emit: Callback ${index + 1} executado com sucesso`);
        } catch (error) {
          console.error(`❌ EventBus.emit: Erro ao executar callback ${index + 1} do evento ${event}:`, error);
        }
      });
    } else {
      console.warn(`⚠️ EventBus.emit: Nenhum listener registrado para o evento "${event}"`);
    }
  }

  /**
   * Remove todos os listeners de um evento
   */
  removeAllListeners(event: string): void {
    this.events.delete(event);
  }

  /**
   * Remove todos os listeners de todos os eventos
   */
  clear(): void {
    this.events.clear();
  }
}

// Instância global do EventBus
export const eventBus = new EventBus();

// Eventos específicos do sistema
export const EVENTS = {
  TAXA_ENTREGA_CONFIG_CHANGED: 'taxaEntregaConfigChanged',
  OPCOES_ADICIONAIS_CHANGED: 'opcoesAdicionaisChanged',
  MENU_ITEM_VISIBILITY_CHANGED: 'menuItemVisibilityChanged',
} as const;

// Tipos para os dados dos eventos
export interface TaxaEntregaConfigData {
  empresaId: string;
  habilitado: boolean;
  tipo: 'bairro' | 'distancia';
}

export interface OpcoesAdicionaisConfigData {
  empresaId: string;
  habilitado: boolean;
}

export interface MenuItemVisibilityData {
  empresaId: string;
  itemName: string;
  visible: boolean;
}

/**
 * Utilitário para emitir evento de mudança na configuração de taxa de entrega
 */
export const emitTaxaEntregaConfigChanged = (data: TaxaEntregaConfigData) => {
  console.log('🎯 EventBus: Emitindo evento de mudança na configuração de taxa de entrega:', data);
  console.log('🎯 EventBus: Nome do evento:', EVENTS.TAXA_ENTREGA_CONFIG_CHANGED);
  eventBus.emit(EVENTS.TAXA_ENTREGA_CONFIG_CHANGED, data);
  console.log('🎯 EventBus: Evento emitido com sucesso!');
};

/**
 * Utilitário para emitir evento de mudança nas opções adicionais
 */
export const emitOpcoesAdicionaisChanged = (data: OpcoesAdicionaisConfigData) => {
  console.log('Emitindo evento de mudança nas opções adicionais:', data);
  eventBus.emit(EVENTS.OPCOES_ADICIONAIS_CHANGED, data);
};
