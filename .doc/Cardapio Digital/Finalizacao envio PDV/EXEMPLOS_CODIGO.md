# 💻 Exemplos de Código - Integração Cardápio → PDV

## 🎯 Hook Principal Completo

### **`useCardapioDigitalNotifications.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import useSound from 'use-sound';

interface PedidoCardapio {
  id: string;
  numero_pedido: string;
  nome_cliente: string;
  telefone_cliente: string;
  status_pedido: string;
  data_pedido: string;
  valor_total: number;
  itens: any[];
  endereco_entrega?: any;
  forma_pagamento?: any;
  observacoes?: string;
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
  const [isLoading, setIsLoading] = useState(false);
  const [contadorPendentes, setContadorPendentes] = useState(0);

  // 🔊 Hook de som para notificações
  const [playNotification] = useSound('/sounds/notification.mp3', {
    volume: 0.8,
    interrupt: true
  });

  // 📂 Carregar pedidos pendentes
  const carregarPedidosPendentes = useCallback(async () => {
    if (!empresaId || !enabled) return;

    console.log('🔍 Carregando pedidos pendentes para empresa:', empresaId);
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('cardapio_digital')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('status_pedido', 'pendente')
        .order('data_pedido', { ascending: false });

      if (error) {
        console.error('❌ Erro ao carregar pedidos:', error);
        return;
      }

      console.log('📊 Pedidos encontrados:', data?.length || 0, data);
      setPedidosPendentes(data || []);
      setContadorPendentes(data?.length || 0);
    } catch (error) {
      console.error('❌ Erro inesperado:', error);
    } finally {
      setIsLoading(false);
    }
  }, [empresaId, enabled]);

  // 🔔 Configurar realtime
  useEffect(() => {
    if (!empresaId || !enabled) {
      console.log('❌ Hook cardápio digital desabilitado:', { empresaId, enabled });
      return;
    }

    console.log('🔔 Configurando realtime para pedidos do cardápio digital:', empresaId);

    // Carregar pedidos iniciais
    carregarPedidosPendentes();

    // Configurar canal realtime
    const channel = supabase
      .channel(`cardapio_pedidos_${empresaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cardapio_digital',
          filter: `empresa_id=eq.${empresaId}`
        },
        (payload) => {
          console.log('🆕 Novo pedido do cardápio digital:', payload.new);
          
          // Adicionar novo pedido à lista
          const novoPedido = payload.new as PedidoCardapio;
          setPedidosPendentes(prev => [novoPedido, ...prev]);
          setContadorPendentes(prev => prev + 1);

          // Tocar som e mostrar notificação
          playNotification();
          toast.success(`🔔 Novo pedido #${novoPedido.numero_pedido} de ${novoPedido.nome_cliente}!`, {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true
          });
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
          console.log('🔄 Pedido atualizado:', payload.new);
          
          const pedidoAtualizado = payload.new as PedidoCardapio;
          
          // Se não é mais pendente, remover da lista
          if (pedidoAtualizado.status_pedido !== 'pendente') {
            setPedidosPendentes(prev => 
              prev.filter(p => p.id !== pedidoAtualizado.id)
            );
            setContadorPendentes(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Status do canal cardápio digital:', status);
      });

    // Cleanup
    return () => {
      console.log('🧹 Limpando canal realtime cardápio digital');
      supabase.removeChannel(channel);
    };
  }, [empresaId, enabled, carregarPedidosPendentes, playNotification]);

  // ✅ Aceitar pedido
  const aceitarPedido = useCallback(async (pedidoId: string) => {
    try {
      const { error } = await supabase
        .from('cardapio_digital')
        .update({ status_pedido: 'aceito' })
        .eq('id', pedidoId);

      if (error) {
        console.error('❌ Erro ao aceitar pedido:', error);
        toast.error('Erro ao aceitar pedido');
        return;
      }

      toast.success('✅ Pedido aceito com sucesso!');
    } catch (error) {
      console.error('❌ Erro inesperado ao aceitar pedido:', error);
      toast.error('Erro inesperado');
    }
  }, []);

  // ❌ Rejeitar pedido
  const rejeitarPedido = useCallback(async (pedidoId: string) => {
    try {
      const { error } = await supabase
        .from('cardapio_digital')
        .update({ status_pedido: 'rejeitado' })
        .eq('id', pedidoId);

      if (error) {
        console.error('❌ Erro ao rejeitar pedido:', error);
        toast.error('Erro ao rejeitar pedido');
        return;
      }

      toast.success('❌ Pedido rejeitado');
    } catch (error) {
      console.error('❌ Erro inesperado ao rejeitar pedido:', error);
      toast.error('Erro inesperado');
    }
  }, []);

  return {
    pedidosPendentes,
    contadorPendentes,
    isLoading,
    aceitarPedido,
    rejeitarPedido,
    recarregarPedidos: carregarPedidosPendentes
  };
};
```

## 🖥️ Implementação no PDV

### **`PDVPage.tsx` - Integração**

```typescript
import React, { useState } from 'react';
import { useCardapioDigitalNotifications } from '../hooks/useCardapioDigitalNotifications';

const PDVPage: React.FC = () => {
  const [empresaData, setEmpresaData] = useState<any>(null);
  const [modalCardapioAberto, setModalCardapioAberto] = useState(false);

  // ✅ HOOK PARA NOTIFICAÇÕES DO CARDÁPIO DIGITAL
  const {
    pedidosPendentes,
    contadorPendentes,
    isLoading: loadingCardapio,
    aceitarPedido,
    rejeitarPedido,
    recarregarPedidos
  } = useCardapioDigitalNotifications({
    empresaId: empresaData?.id || '',
    enabled: !!empresaData?.id
  });

  return (
    <div className="pdv-container">
      {/* Botão Cardápio Digital com Contador */}
      <button
        onClick={() => setModalCardapioAberto(true)}
        className="relative bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
      >
        📱 Cardápio Digital
        
        {/* Contador de Pedidos Pendentes */}
        {contadorPendentes > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full px-2 py-1 text-xs font-bold animate-pulse">
            {contadorPendentes}
          </span>
        )}
      </button>

      {/* Modal de Pedidos */}
      {modalCardapioAberto && (
        <CardapioDigitalModal
          isOpen={modalCardapioAberto}
          onClose={() => setModalCardapioAberto(false)}
          pedidos={pedidosPendentes}
          onAceitar={aceitarPedido}
          onRejeitar={rejeitarPedido}
          isLoading={loadingCardapio}
          onRecarregar={recarregarPedidos}
        />
      )}
    </div>
  );
};
```

## 🎨 Modal de Pedidos

### **`CardapioDigitalModal.tsx`**

```typescript
import React from 'react';
import { X, Check, XCircle, RefreshCw } from 'lucide-react';

interface PedidoCardapio {
  id: string;
  numero_pedido: string;
  nome_cliente: string;
  telefone_cliente: string;
  valor_total: number;
  data_pedido: string;
  itens: any[];
}

interface CardapioDigitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  pedidos: PedidoCardapio[];
  onAceitar: (pedidoId: string) => Promise<void>;
  onRejeitar: (pedidoId: string) => Promise<void>;
  isLoading: boolean;
  onRecarregar: () => Promise<void>;
}

export const CardapioDigitalModal: React.FC<CardapioDigitalModalProps> = ({
  isOpen,
  onClose,
  pedidos,
  onAceitar,
  onRejeitar,
  isLoading,
  onRecarregar
}) => {
  if (!isOpen) return null;

  const formatarPreco = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleString('pt-BR');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">📱 Pedidos do Cardápio Digital</h2>
            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-sm font-medium">
              {pedidos.length} pendente{pedidos.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onRecarregar}
              disabled={isLoading}
              className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {pedidos.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📱</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum pedido pendente
              </h3>
              <p className="text-gray-500">
                Os novos pedidos do cardápio digital aparecerão aqui automaticamente.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pedidos.map((pedido) => (
                <div
                  key={pedido.id}
                  className="border rounded-lg p-4 bg-orange-50 border-orange-200"
                >
                  {/* Header do Pedido */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg">
                        Pedido #{pedido.numero_pedido}
                      </h3>
                      <p className="text-gray-600">
                        {pedido.nome_cliente} • {pedido.telefone_cliente}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatarData(pedido.data_pedido)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {formatarPreco(pedido.valor_total)}
                      </div>
                    </div>
                  </div>

                  {/* Itens do Pedido */}
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Itens:</h4>
                    <div className="space-y-1">
                      {pedido.itens?.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.quantidade}x {item.nome}</span>
                          <span>{formatarPreco(item.preco_total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => onAceitar(pedido.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <Check size={16} />
                      Aceitar Pedido
                    </button>
                    <button
                      onClick={() => onRejeitar(pedido.id)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <XCircle size={16} />
                      Rejeitar Pedido
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

## 🔧 Configuração do Som

### **Arquivo de Som**
- **Localização:** `/public/sounds/notification.mp3`
- **Formato:** MP3, OGG ou WAV
- **Duração:** 1-3 segundos
- **Volume:** Moderado (não muito alto)

### **Implementação do useSound**
```typescript
import useSound from 'use-sound';

// Configuração básica
const [playNotification] = useSound('/sounds/notification.mp3');

// Configuração avançada
const [playNotification] = useSound('/sounds/notification.mp3', {
  volume: 0.8,           // Volume (0-1)
  interrupt: true,       // Interromper som anterior
  playbackRate: 1,       // Velocidade de reprodução
  onend: () => {         // Callback quando terminar
    console.log('Som finalizado');
  }
});

// Usar o som
const handleNovoPedido = () => {
  playNotification();
};
```

## 📱 Configuração do Toast

### **Setup no App Principal**
```typescript
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <div className="App">
      {/* Seu conteúdo */}
      
      {/* Container de Toasts */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}
```

### **Tipos de Toast**
```typescript
import { toast } from 'react-toastify';

// Sucesso
toast.success('✅ Pedido aceito!');

// Erro
toast.error('❌ Erro ao processar pedido');

// Aviso
toast.warn('⚠️ Atenção necessária');

// Info
toast.info('ℹ️ Informação importante');

// Toast customizado
toast('🔔 Novo pedido recebido!', {
  position: "top-right",
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: "light",
});
```

---

## 🎯 Resumo da Implementação

1. **Hook personalizado** gerencia toda a lógica
2. **Supabase Realtime** para notificações instantâneas
3. **React-Toastify** para notificações visuais
4. **Use-Sound** para alertas sonoros
5. **Modal responsivo** para gerenciar pedidos
6. **Contador visual** no botão do PDV

Esta implementação garante que o PDV seja notificado imediatamente quando um novo pedido chegar do cardápio digital, com feedback visual e sonoro para o operador.
