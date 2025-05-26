# 🗃️ Estrutura de Dados e Fluxos - Modal de Pedidos PDV

## 📊 Estrutura de Dados

### 🔗 Interface do Pedido
```typescript
interface Pedido {
  id: string;
  numero: string;
  created_at: string;
  status: 'pendente' | 'faturado' | 'cancelado' | 'entregue';
  valor_total: number;
  empresa_id: string; // ← ESSENCIAL para botão "Abrir"
  desconto_prazo_id?: string;
  desconto_valor_id?: string;
  usuario_id?: string;
  cliente?: {
    id: string;
    nome: string;
    telefone?: string;
  };
  pedidos_itens?: PedidoItem[];
  usuario?: {
    id: string;
    nome: string;
  };
}
```

### 📦 Interface do Item do Pedido
```typescript
interface PedidoItem {
  id: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  produto: {
    id: string;
    nome: string;
    preco: number;
    codigo: string;
    codigo_barras?: string;
    descricao?: string;
    promocao: boolean;
    tipo_desconto?: string;
    valor_desconto?: number;
    unidade_medida_id?: string;
    grupo_id: string;
    produto_fotos?: {
      url: string;
      principal: boolean;
    }[];
  };
}
```

### 🎛️ Estados do Modal
```typescript
// Estados principais
const [pedidos, setPedidos] = useState<any[]>([]);
const [pedidosFiltrados, setPedidosFiltrados] = useState<any[]>([]);
const [searchPedidos, setSearchPedidos] = useState('');
const [statusFilterPedidos, setStatusFilterPedidos] = useState<string>('pendente');
const [showFiltersPedidos, setShowFiltersPedidos] = useState(false);
const [contadorPedidosPendentes, setContadorPedidosPendentes] = useState<number>(0);

// Estados do modal
const [showPedidosModal, setShowPedidosModal] = useState(false);
const [pedidoDetalhado, setPedidoDetalhado] = useState<any>(null);
const [showDetalhePedido, setShowDetalhePedido] = useState(false);
```

## 🔄 Fluxos de Funcionamento

### 1. 📥 Carregamento de Pedidos

#### **Fluxo Principal:**
```
1. Usuário clica em "Pedidos" no menu PDV
2. Modal abre IMEDIATAMENTE (sem loading)
3. Se pedidos.length === 0, carrega em background
4. Aplica filtros automaticamente
5. Atualiza contadores em tempo real
```

#### **Função loadPedidos():**
```typescript
const loadPedidos = async () => {
  // 1. Obter usuário autenticado
  const { data: userData } = await supabase.auth.getUser();
  
  // 2. Obter empresa do usuário
  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('empresa_id')
    .eq('id', userData.user.id)
    .single();

  // 3. Carregar pedidos da empresa
  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      id, numero, created_at, status, valor_total, empresa_id,
      desconto_prazo_id, desconto_valor_id, usuario_id,
      cliente:clientes(id, nome, telefone),
      pedidos_itens(...)
    `)
    .eq('empresa_id', usuarioData.empresa_id)
    .eq('deletado', false)
    .order('created_at', { ascending: false })
    .limit(100);

  // 4. Processar dados e aplicar filtros
  setPedidos(pedidosData);
  aplicarFiltrosPedidos(pedidosData);
  
  // 5. Atualizar contadores
  const pedidosPendentes = pedidosData.filter(p => p.status === 'pendente');
  setContadorPedidosPendentes(pedidosPendentes.length);
};
```

### 2. 🔍 Sistema de Filtros

#### **Fluxo de Filtros:**
```
1. Usuário clica no ícone Filter
2. Área de filtros expande com animação
3. Usuário seleciona status desejado
4. aplicarFiltrosPedidos() é chamada
5. Lista atualiza instantaneamente
6. Contadores são recalculados
7. Título do modal muda dinamicamente
```

#### **Função aplicarFiltrosPedidos():**
```typescript
const aplicarFiltrosPedidos = (pedidosParaFiltrar = pedidos) => {
  let filtered = [...pedidosParaFiltrar];

  // Filtro por status
  if (statusFilterPedidos !== 'todos') {
    filtered = filtered.filter(pedido => pedido.status === statusFilterPedidos);
  }

  // Filtro por busca
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
```

### 3. 🔗 Geração de Link Público

#### **Fluxo do Botão "Abrir":**
```
1. Usuário clica no botão "Abrir" (azul)
2. gerarLinkPedido(pedido) é chamada
3. Verifica se pedido.empresa_id existe
4. Se não existir, busca empresa_id do usuário (fallback)
5. Consulta CNPJ da empresa no Supabase
6. Remove caracteres especiais do CNPJ
7. Gera código: CNPJ + número do pedido
8. Cria URL: site.com/pedido/{codigo}
9. Abre nova guia com window.open()
```

#### **Função gerarLinkPedido():**
```typescript
const gerarLinkPedido = async (pedido: any) => {
  try {
    // Fallback para empresa_id
    let empresaId = pedido.empresa_id;
    if (!empresaId) {
      const { data: userData } = await supabase.auth.getUser();
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();
      empresaId = usuarioData.empresa_id;
    }

    // Buscar CNPJ
    const { data: empresaData } = await supabase
      .from('empresas')
      .select('documento')
      .eq('id', empresaId)
      .single();

    // Gerar URL
    const cnpjLimpo = empresaData.documento.replace(/[^\d]/g, '');
    const codigoPedido = `${cnpjLimpo}${pedido.numero}`;
    const url = `${window.location.origin}/pedido/${codigoPedido}`;
    
    return url;
  } catch (error) {
    console.error('Erro ao gerar link:', error);
    toast.error(`Erro ao gerar link: ${error.message}`);
    return null;
  }
};
```

### 4. 📦 Importação de Pedidos

#### **Fluxo de Importação:**
```
1. Usuário clica em "Importar para Carrinho"
2. Validações são executadas:
   - Pedido tem itens?
   - Pedido já foi importado?
   - Cliente é diferente do atual?
3. Se há conflitos, mostra modal de confirmação
4. executarImportacaoPedido() é chamada
5. Itens são convertidos para formato do carrinho
6. Cliente e descontos são importados
7. Modal fecha e toast de sucesso é exibido
```

## 🎨 Componentes da Interface

### 🏗️ Estrutura do Modal
```jsx
<AnimatePresence>
  {showPedidosModal && (
    <motion.div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div className="bg-background-card rounded-lg border border-gray-800 w-full max-w-4xl mx-4 max-h-[80vh] flex flex-col">
        
        {/* Cabeçalho Fixo */}
        <div className="flex-shrink-0 p-6 border-b border-gray-800">
          {/* Título Dinâmico */}
          {/* Botão Filter */}
          {/* Campo de Pesquisa */}
          {/* Filtros Expansíveis */}
        </div>

        {/* Conteúdo Rolável */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {/* Lista de Pedidos */}
          {/* Estado Vazio */}
        </div>

      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

### 🎛️ Botões de Ação
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
      if (url) window.open(url, '_blank');
    }}
    className="px-3 py-1.5 bg-blue-500/80 hover:bg-blue-600/90 text-white rounded text-xs transition-colors"
    title="Abrir nota de pedido em nova página"
  >
    Abrir
  </button>
</div>
```

## 🔧 Configurações e Dependências

### 📦 Imports Necessários
```typescript
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, FileText, Search, X, ShoppingBag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';
```

### 🎯 useEffect Hooks
```typescript
// Aplicar filtros quando estados mudarem
useEffect(() => {
  aplicarFiltrosPedidos();
}, [pedidos, searchPedidos, statusFilterPedidos]);

// Listener para eventos de mudança na configuração do PDV
useEffect(() => {
  const handlePdvConfigChange = (event: CustomEvent) => {
    const { field, value, config } = event.detail;
    setPdvConfig(config);
  };

  window.addEventListener('pdvConfigChange', handlePdvConfigChange);
  return () => window.removeEventListener('pdvConfigChange', handlePdvConfigChange);
}, []);
```

### 🗄️ Estrutura do Banco de Dados

#### **Tabela: pedidos**
```sql
CREATE TABLE pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR DEFAULT 'pendente',
  valor_total DECIMAL(10,2) NOT NULL,
  empresa_id UUID REFERENCES empresas(id),
  cliente_id UUID REFERENCES clientes(id),
  usuario_id UUID REFERENCES usuarios(id),
  desconto_prazo_id UUID,
  desconto_valor_id UUID,
  deletado BOOLEAN DEFAULT FALSE
);
```

#### **Tabela: pedidos_itens**
```sql
CREATE TABLE pedidos_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES pedidos(id),
  produto_id UUID REFERENCES produtos(id),
  quantidade DECIMAL(10,3) NOT NULL,
  valor_unitario DECIMAL(10,2) NOT NULL,
  valor_total DECIMAL(10,2) NOT NULL
);
```

## 🚨 Pontos Críticos para Futuras IAs

### ⚠️ IMPORTANTE: Campo empresa_id
```typescript
// SEMPRE incluir empresa_id na consulta de pedidos
.select(`
  id,
  numero,
  // ... outros campos ...
  empresa_id,  // ← ESSENCIAL para botão "Abrir"
  // ... resto da query ...
`)
```

### 🔄 Fallback para empresa_id
```typescript
// Se empresa_id não estiver disponível no pedido,
// SEMPRE implementar fallback buscando do usuário atual
let empresaId = pedido.empresa_id;
if (!empresaId) {
  // Buscar do usuário atual
  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('empresa_id')
    .eq('id', userData.user.id)
    .single();
  empresaId = usuarioData.empresa_id;
}
```

### 🎨 Cores dos Botões
```css
/* Verde escuro para melhor visibilidade */
.btn-importar { bg-green-600 hover:bg-green-700 }

/* Azul transparente para elegância */
.btn-abrir { bg-blue-500/80 hover:bg-blue-600/90 }

/* Cinza padrão mantido */
.btn-detalhes { bg-gray-600 hover:bg-gray-500 }
```

### 📱 Altura do Modal no Mobile
```css
/* Altura otimizada para evitar barra dupla */
.lista-pedidos {
  max-height: calc(100vh - 320px); /* NÃO usar 250px */
}
```

---

**🔍 Debug:** Sempre verificar console.log('Pedido recebido:', pedido) para identificar estrutura dos dados.
