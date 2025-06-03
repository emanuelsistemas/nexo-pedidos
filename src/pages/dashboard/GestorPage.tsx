import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, DollarSign, Check, X, ChevronDown, ChevronUp, Phone, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showMessage } from '../../utils/toast';
import { useSidebarStore } from '../../store/sidebarStore';

interface Pedido {
  id: string;
  numero: string;
  cliente_nome: string;
  cliente_telefone: string;
  status: string;
  valor_total: number;
  valor_entrega: number | null;
  bairro: string | null;
  endereco: string | null;
  created_at: string;
  itens: PedidoItem[];
}

interface PedidoItem {
  id: string;
  produto_id: string;
  quantidade: number;
  valor_unitario: number;
  observacao: string | null;
  produto: {
    nome: string;
  };
  adicionais: PedidoItemAdicional[];
}

interface PedidoItemAdicional {
  id: string;
  item_adicional_id: string;
  quantidade: number;
  valor_unitario: number;
  item_adicional: {
    nome: string;
  };
}

const statusLabels: Record<string, { full: string; short: string }> = {
  'aguardando': { full: 'Aguardando', short: 'Aguard.' },
  'preparando': { full: 'Em Preparação', short: 'Prepar.' },
  'pronto': { full: 'Pronto p/ Envio', short: 'Pronto' },
  'enviado': { full: 'Saiu p/ Entrega', short: 'Enviado' },
  'entregue': { full: 'Entregue', short: 'Entreg.' },
  'recusado': { full: 'Recusado', short: 'Recus.' }
};

const statusOrder = ['aguardando', 'preparando', 'pronto', 'enviado', 'entregue', 'recusado'];

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  'aguardando': {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-500',
    border: 'border-yellow-500/20'
  },
  'preparando': {
    bg: 'bg-blue-500/10',
    text: 'text-blue-500',
    border: 'border-blue-500/20'
  },
  'pronto': {
    bg: 'bg-purple-500/10',
    text: 'text-purple-500',
    border: 'border-purple-500/20'
  },
  'enviado': {
    bg: 'bg-orange-500/10',
    text: 'text-orange-500',
    border: 'border-orange-500/20'
  },
  'entregue': {
    bg: 'bg-green-500/10',
    text: 'text-green-500',
    border: 'border-green-500/20'
  },
  'recusado': {
    bg: 'bg-red-500/10',
    text: 'text-red-500',
    border: 'border-red-500/20'
  }
};

const GestorPage: React.FC = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [expandedPedidos, setExpandedPedidos] = useState<Record<string, boolean>>({});
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    loadPedidos();
    // Atualiza a cada 30 segundos
    const interval = setInterval(loadPedidos, 30000);

    // Handle responsive text
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 1280);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const loadPedidos = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      const { data: pedidosData, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          itens:pedidos_itens (
            *,
            produto:produtos (nome),
            adicionais:pedidos_itens_adicionais (
              *,
              item_adicional:opcoes_adicionais_itens (nome)
            )
          )
        `)
        .eq('empresa_id', usuarioData.empresa_id)
        .not('status', 'eq', 'recusado')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPedidos(pedidosData || []);
    } catch (error: any) {
      console.error('Erro ao carregar pedidos:', error);
      showMessage('error', 'Erro ao carregar pedidos');
    }
  };

  const handleStatusChange = async (pedidoId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ status: newStatus })
        .eq('id', pedidoId);

      if (error) throw error;

      setPedidos(pedidos.map(pedido =>
        pedido.id === pedidoId
          ? { ...pedido, status: newStatus }
          : pedido
      ));

      showMessage('success', 'Status atualizado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      showMessage('error', 'Erro ao atualizar status');
    }
  };

  const togglePedidoExpanded = (pedidoId: string) => {
    setExpandedPedidos(prev => ({
      ...prev,
      [pedidoId]: !prev[pedidoId]
    }));
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const renderPedidoCard = (pedido: Pedido) => {
    const isExpanded = expandedPedidos[pedido.id];

    return (
      <motion.div
        key={pedido.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-background-card rounded-lg border border-gray-800 overflow-hidden"
      >
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="text-white font-medium">Pedido #{pedido.numero}</span>
              <h3 className="text-lg font-medium text-white mt-1">{pedido.cliente_nome}</h3>
            </div>
            {pedido.status === 'aguardando' && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatusChange(pedido.id, 'preparando')}
                  className="p-1 rounded-full bg-green-500/10 text-green-500 hover:bg-green-500/20"
                >
                  <Check size={18} />
                </button>
                <button
                  onClick={() => handleStatusChange(pedido.id, 'recusado')}
                  className="p-1 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            {pedido.status !== 'aguardando' && (
              <div className="flex gap-2">
                {statusOrder.indexOf(pedido.status) < statusOrder.indexOf('entregue') && (
                  <button
                    onClick={() => handleStatusChange(pedido.id, statusOrder[statusOrder.indexOf(pedido.status) + 1])}
                    className="px-3 py-1 rounded-lg bg-primary-500/10 text-primary-400 text-sm hover:bg-primary-500/20"
                  >
                    Avançar
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="flex items-center gap-2 text-gray-400">
              <Clock size={16} />
              <span className="text-sm">{formatDateTime(pedido.created_at)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Phone size={16} />
              <span className="text-sm">{pedido.cliente_telefone}</span>
            </div>
            {pedido.bairro && (
              <div className="flex items-center gap-2 text-gray-400">
                <MapPin size={16} />
                <span className="text-sm">{pedido.bairro}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-400">
              <DollarSign size={16} />
              <span className="text-sm">
                R$ {pedido.valor_total.toFixed(2)}
                {pedido.valor_entrega && ` + ${pedido.valor_entrega.toFixed(2)}`}
              </span>
            </div>
          </div>

          <button
            onClick={() => togglePedidoExpanded(pedido.id)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-800/70 transition-colors"
          >
            <span className="text-sm text-gray-400">
              {isExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}
            </span>
            {isExpanded ? (
              <ChevronUp size={16} className="text-gray-400" />
            ) : (
              <ChevronDown size={16} className="text-gray-400" />
            )}
          </button>

          {isExpanded && (
            <div className="mt-3 space-y-3">
              {pedido.itens.map((item) => (
                <div key={item.id} className="bg-gray-800/30 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Package size={16} className="text-gray-400" />
                        <span className="text-white">
                          {item.quantidade}x {item.produto.nome}
                        </span>
                      </div>
                      {item.observacao && (
                        <p className="text-sm text-gray-400 mt-1 ml-6">
                          Obs: {item.observacao}
                        </p>
                      )}
                      {item.adicionais.length > 0 && (
                        <div className="mt-2 ml-6 space-y-1">
                          {item.adicionais.map(adicional => (
                            <div
                              key={adicional.id}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-gray-400">
                                {adicional.quantidade}x {adicional.item_adicional.nome}
                              </span>
                              <span className="text-primary-400">
                                + R$ {(adicional.quantidade * adicional.valor_unitario).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-primary-400 ml-4">
                      R$ {(item.quantidade * item.valor_unitario).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="h-[calc(100vh-4rem)] grid grid-cols-5 gap-2">
      {statusOrder.map(status => {
        if (status === 'recusado') return null;
        const statusPedidos = pedidos.filter(p => p.status === status);

        return (
          <div
            key={status}
            className={`flex flex-col rounded-lg ${statusColors[status].bg}`}
          >
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h2 className={`text-lg font-medium ${statusColors[status].text} whitespace-nowrap`}>
                  {isSmallScreen ? statusLabels[status].short : statusLabels[status].full}
                </h2>
                <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${statusColors[status].bg} ${statusColors[status].text} border ${statusColors[status].border}`}>
                  {statusPedidos.length}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
              {statusPedidos.map(pedido => renderPedidoCard(pedido))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GestorPage;