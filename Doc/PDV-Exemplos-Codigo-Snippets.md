# 💻 Exemplos de Código - Modal de Pedidos PDV

## 🎯 Snippets Essenciais

### 1. 📊 Estados Principais

```typescript
// Estados do modal de pedidos
const [pedidos, setPedidos] = useState<any[]>([]);
const [pedidosFiltrados, setPedidosFiltrados] = useState<any[]>([]);
const [searchPedidos, setSearchPedidos] = useState('');
const [statusFilterPedidos, setStatusFilterPedidos] = useState<string>('pendente');
const [showFiltersPedidos, setShowFiltersPedidos] = useState(false);
const [contadorPedidosPendentes, setContadorPedidosPendentes] = useState<number>(0);
const [showPedidosModal, setShowPedidosModal] = useState(false);
const [pedidoDetalhado, setPedidoDetalhado] = useState<any>(null);
const [showDetalhePedido, setShowDetalhePedido] = useState(false);
```

### 2. 🔄 Função de Carregamento Completa

```typescript
const loadPedidos = async () => {
  try {
    setLoadingPedidos(true);

    // Obter usuário autenticado
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw new Error('Usuário não autenticado');
    }

    // Obter empresa do usuário
    const { data: usuarioData, error: usuarioError } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', userData.user.id)
      .single();

    if (usuarioError || !usuarioData) {
      throw new Error('Dados do usuário não encontrados');
    }

    // Carregar pedidos da empresa
    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        id,
        numero,
        created_at,
        status,
        valor_total,
        empresa_id,
        desconto_prazo_id,
        desconto_valor_id,
        usuario_id,
        cliente:clientes(id, nome, telefone),
        usuario:usuarios(id, nome),
        pedidos_itens(
          id,
          quantidade,
          valor_unitario,
          valor_total,
          produto:produtos(
            id,
            nome,
            preco,
            codigo,
            codigo_barras,
            descricao,
            promocao,
            tipo_desconto,
            valor_desconto,
            unidade_medida_id,
            grupo_id,
            produto_fotos(url, principal)
          )
        )
      `)
      .eq('empresa_id', usuarioData.empresa_id)
      .eq('deletado', false)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    const pedidosData = data || [];
    
    // Processar dados dos pedidos
    const pedidosProcessados = pedidosData.map(pedido => ({
      ...pedido,
      created_at: new Date(pedido.created_at).toLocaleString('pt-BR'),
      valor_total: Number(pedido.valor_total) || 0
    }));

    setPedidos(pedidosProcessados);
    aplicarFiltrosPedidos(pedidosProcessados);
    
    // Atualizar contador apenas com pedidos pendentes
    const pedidosPendentes = pedidosProcessados.filter(p => p.status === 'pendente');
    setContadorPedidosPendentes(pedidosPendentes.length);

  } catch (error: any) {
    console.error('Erro ao carregar pedidos:', error);
    toast.error(`Erro ao carregar pedidos: ${error.message}`);
  } finally {
    setLoadingPedidos(false);
  }
};
```

### 3. 🔍 Sistema de Filtros Completo

```typescript
// Função principal de filtros
const aplicarFiltrosPedidos = (pedidosParaFiltrar = pedidos) => {
  let filtered = [...pedidosParaFiltrar];

  // Aplicar filtro de status
  if (statusFilterPedidos !== 'todos') {
    filtered = filtered.filter(pedido => pedido.status === statusFilterPedidos);
  }

  // Aplicar filtro de busca
  if (searchPedidos.trim()) {
    const termoLower = searchPedidos.toLowerCase();
    filtered = filtered.filter(pedido =>
      pedido.numero.toString().includes(termoLower) ||
      pedido.cliente?.nome?.toLowerCase().includes(termoLower) ||
      pedido.cliente?.telefone?.includes(searchPedidos)
    );
  }

  setPedidosFiltrados(filtered);
};

// Função para filtrar por termo de busca
const filtrarPedidos = (termo: string) => {
  setSearchPedidos(termo);
  aplicarFiltrosPedidos();
};

// Função para filtrar por status
const filtrarPedidosPorStatus = (status: string) => {
  setStatusFilterPedidos(status);
  aplicarFiltrosPedidos();
};

// useEffect para aplicar filtros automaticamente
useEffect(() => {
  aplicarFiltrosPedidos();
}, [pedidos, searchPedidos, statusFilterPedidos]);
```

### 4. 🔗 Geração de Link Público

```typescript
const gerarLinkPedido = async (pedido: any) => {
  try {
    console.log('Pedido recebido:', pedido);
    console.log('empresa_id:', pedido.empresa_id);

    // Fallback para empresa_id
    let empresaId = pedido.empresa_id;
    if (!empresaId) {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) throw new Error('Empresa do usuário não encontrada');
      empresaId = usuarioData.empresa_id;
    }

    // Buscar CNPJ da empresa
    const { data: empresaData, error: empresaError } = await supabase
      .from('empresas')
      .select('documento')
      .eq('id', empresaId)
      .single();

    if (empresaError || !empresaData || !empresaData.documento) {
      throw new Error('Não foi possível obter o CNPJ da empresa');
    }

    // Limpar CNPJ (remover caracteres especiais)
    const cnpjLimpo = empresaData.documento.replace(/[^\d]/g, '');

    // Gerar código único
    const codigoPedido = `${cnpjLimpo}${pedido.numero}`;

    // Gerar URL completa
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/pedido/${codigoPedido}`;

    console.log('URL gerada:', url);
    return url;
  } catch (error: any) {
    console.error('Erro ao gerar link do pedido:', error);
    toast.error(`Erro ao gerar link: ${error.message}`);
    return null;
  }
};
```

### 5. 🎨 Interface do Modal

```jsx
<AnimatePresence>
  {showPedidosModal && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowPedidosModal(false);
          setSearchPedidos('');
          setStatusFilterPedidos('pendente');
          setShowFiltersPedidos(false);
        }
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-background-card rounded-lg border border-gray-800 w-full max-w-4xl mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho Fixo */}
        <div className="flex-shrink-0 p-6 border-b border-gray-800">
          {/* Título e controles */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">
                {statusFilterPedidos === 'todos' ? 'Todos os Pedidos' :
                 statusFilterPedidos === 'pendente' ? 'Pedidos Pendentes' :
                 statusFilterPedidos === 'faturado' ? 'Pedidos Faturados' :
                 statusFilterPedidos === 'cancelado' ? 'Pedidos Cancelados' :
                 'Pedidos'}
              </h3>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-400">Atualização automática</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFiltersPedidos(!showFiltersPedidos)}
                className="text-gray-400 hover:text-white transition-colors p-1"
                title="Filtros"
              >
                <Filter size={18} />
              </button>
              <button
                onClick={() => {
                  setShowPedidosModal(false);
                  setSearchPedidos('');
                  setStatusFilterPedidos('pendente');
                  setShowFiltersPedidos(false);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Campo de Pesquisa */}
          <div className="relative mb-4">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar por número do pedido, cliente ou telefone..."
              value={searchPedidos}
              onChange={(e) => filtrarPedidos(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
            />
          </div>

          {/* Filtros Expansíveis */}
          <AnimatePresence>
            {showFiltersPedidos && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-4"
              >
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Status do Pedido
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'pendente', label: 'Pendentes', count: contadorPedidosPendentes },
                        { value: 'faturado', label: 'Faturados', count: pedidos.filter(p => p.status === 'faturado').length },
                        { value: 'cancelado', label: 'Cancelados', count: pedidos.filter(p => p.status === 'cancelado').length },
                        { value: 'todos', label: 'Todos', count: pedidos.length }
                      ].map((status) => (
                        <button
                          key={status.value}
                          onClick={() => filtrarPedidosPorStatus(status.value)}
                          className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                            statusFilterPedidos === status.value
                              ? 'bg-primary-500 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {status.label}
                          <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                            statusFilterPedidos === status.value
                              ? 'bg-white/20 text-white'
                              : 'bg-gray-600 text-gray-300'
                          }`}>
                            {status.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Conteúdo Rolável */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {/* Lista de pedidos ou estado vazio */}
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

### 6. 🎛️ Botões de Ação

```jsx
<div className="flex gap-2 flex-wrap">
  {/* Botão Importar - apenas para pendentes */}
  {pedido.status === 'pendente' && (
    <button
      onClick={() => importarPedidoParaCarrinho(pedido)}
      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors font-medium"
    >
      Importar para Carrinho
    </button>
  )}
  
  {/* Botão Ver Detalhes - sempre visível */}
  <button
    onClick={() => carregarDetalhesPedido(pedido.id)}
    className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs transition-colors"
  >
    Ver Detalhes
  </button>
  
  {/* Botão Abrir - sempre visível */}
  <button
    onClick={async () => {
      const url = await gerarLinkPedido(pedido);
      if (url) {
        window.open(url, '_blank');
      }
    }}
    className="px-3 py-1.5 bg-blue-500/80 hover:bg-blue-600/90 text-white rounded text-xs transition-colors"
    title="Abrir nota de pedido em nova página"
  >
    Abrir
  </button>
</div>
```

### 7. 🏷️ Função de Status

```typescript
// Função para obter cor do status
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pendente':
      return 'text-yellow-400';
    case 'preparando':
      return 'text-blue-400';
    case 'pronto':
      return 'text-green-400';
    case 'entregue':
      return 'text-gray-400';
    case 'faturado':
      return 'text-green-400';
    case 'cancelado':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
};

// Função para obter texto do status
const getStatusText = (status: string) => {
  switch (status) {
    case 'pendente':
      return 'Pendente';
    case 'preparando':
      return 'Preparando';
    case 'pronto':
      return 'Pronto';
    case 'entregue':
      return 'Entregue';
    case 'faturado':
      return 'Faturado';
    case 'cancelado':
      return 'Cancelado';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};
```

### 8. 📱 CSS Customizado

```css
/* Scrollbar customizada */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.3);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.5);
}

/* Altura otimizada para mobile */
@media (max-width: 768px) {
  .lista-pedidos {
    max-height: calc(100vh - 320px);
  }
}
```

### 9. 🔄 Imports Necessários

```typescript
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Filter, 
  FileText, 
  Search, 
  X, 
  ShoppingBag,
  Calendar,
  User,
  Phone,
  DollarSign
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';
```

### 10. 🧪 Dados de Teste

```typescript
// Exemplo de pedido para testes
const pedidoExemplo = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  numero: "041852",
  created_at: "2025-01-26T10:30:00.000Z",
  status: "pendente",
  valor_total: 150.00,
  empresa_id: "empresa-uuid-123",
  desconto_prazo_id: null,
  desconto_valor_id: null,
  usuario_id: "usuario-uuid-456",
  cliente: {
    id: "cliente-uuid-789",
    nome: "João Silva",
    telefone: "(11) 99999-9999"
  },
  usuario: {
    id: "usuario-uuid-456",
    nome: "Maria Santos"
  },
  pedidos_itens: [
    {
      id: "item-uuid-001",
      quantidade: 2,
      valor_unitario: 75.00,
      valor_total: 150.00,
      produto: {
        id: "produto-uuid-001",
        nome: "Produto Exemplo",
        preco: 75.00,
        codigo: "PROD001",
        codigo_barras: "7891234567890",
        descricao: "Descrição do produto",
        promocao: false,
        tipo_desconto: null,
        valor_desconto: null,
        unidade_medida_id: "un",
        grupo_id: "grupo-uuid-001",
        produto_fotos: [
          {
            url: "https://exemplo.com/foto.jpg",
            principal: true
          }
        ]
      }
    }
  ]
};
```

---

**💡 Dica:** Use estes snippets como base para implementar ou corrigir funcionalidades do modal de pedidos no PDV!
