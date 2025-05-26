# 📋 Documentação: Modal de Pedidos no PDV

## 🎯 Visão Geral

Esta documentação detalha a implementação completa do **Modal de Pedidos no PDV** com filtros de status e botão "Abrir" para visualização de notas em nova guia.

## 📁 Arquivos Modificados

### 🔧 Principal
- **`src/pages/dashboard/PDVPage.tsx`** - Arquivo principal com toda a implementação

### 🎨 Melhorias Visuais
- **Cores dos botões** otimizadas para melhor visibilidade
- **Layout responsivo** para mobile e desktop

## 🚀 Funcionalidades Implementadas

### 1. 📊 Sistema de Filtros de Status

#### **Estados Adicionados:**
```typescript
const [statusFilterPedidos, setStatusFilterPedidos] = useState<string>('pendente');
const [showFiltersPedidos, setShowFiltersPedidos] = useState(false);
```

#### **Filtros Disponíveis:**
- **Pendentes** - Pedidos que podem ser importados para o carrinho
- **Faturados** - Pedidos já processados e finalizados
- **Cancelados** - Pedidos cancelados pelo sistema
- **Todos** - Visualização completa de todos os pedidos

#### **Função de Filtros:**
```typescript
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
```

### 2. 🔗 Botão "Abrir" para Visualização de Notas

#### **Função Principal:**
```typescript
const gerarLinkPedido = async (pedido: any) => {
  try {
    // Fallback inteligente para empresa_id
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

    // Buscar CNPJ da empresa
    const { data: empresaData } = await supabase
      .from('empresas')
      .select('documento')
      .eq('id', empresaId)
      .single();

    // Gerar código único: CNPJ + número do pedido
    const cnpjLimpo = empresaData.documento.replace(/[^\d]/g, '');
    const codigoPedido = `${cnpjLimpo}${pedido.numero}`;
    
    // URL final
    const url = `${window.location.origin}/pedido/${codigoPedido}`;
    return url;
  } catch (error) {
    console.error('Erro ao gerar link:', error);
    toast.error(`Erro ao gerar link: ${error.message}`);
    return null;
  }
};
```

### 3. 🎨 Interface do Modal

#### **Cabeçalho Dinâmico:**
```typescript
<h3 className="text-lg font-semibold text-white">
  {statusFilterPedidos === 'todos' ? 'Todos os Pedidos' :
   statusFilterPedidos === 'pendente' ? 'Pedidos Pendentes' :
   statusFilterPedidos === 'faturado' ? 'Pedidos Faturados' :
   statusFilterPedidos === 'cancelado' ? 'Pedidos Cancelados' :
   'Pedidos'}
</h3>
```

#### **Botões de Filtro com Contadores:**
```typescript
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
    <span className="px-1.5 py-0.5 rounded-full text-xs">
      {status.count}
    </span>
  </button>
))}
```

## 🔧 Detalhes Técnicos Importantes

### 📊 Consulta de Pedidos

#### **Query Otimizada:**
```typescript
const { data, error } = await supabase
  .from('pedidos')
  .select(`
    id,
    numero,
    created_at,
    status,
    valor_total,
    empresa_id,  // ← CAMPO ESSENCIAL para botão "Abrir"
    desconto_prazo_id,
    desconto_valor_id,
    usuario_id,
    cliente:clientes(id, nome, telefone),
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
```

### 🎨 Cores dos Botões Otimizadas

#### **Botão "Importar para Carrinho":**
```css
/* Verde mais escuro e visível */
bg-green-600 hover:bg-green-700
```

#### **Botão "Ver Detalhes":**
```css
/* Cinza padrão mantido */
bg-gray-600 hover:bg-gray-500
```

#### **Botão "Abrir":**
```css
/* Azul transparente elegante */
bg-blue-500/80 hover:bg-blue-600/90
```

### 🔄 Sistema de Eventos em Tempo Real

#### **useEffect para Filtros:**
```typescript
useEffect(() => {
  aplicarFiltrosPedidos();
}, [pedidos, searchPedidos, statusFilterPedidos]);
```

#### **Atualização de Contadores:**
```typescript
// Atualizar contador apenas com pedidos pendentes
const pedidosPendentes = pedidosData.filter(p => p.status === 'pendente');
setContadorPedidosPendentes(pedidosPendentes.length);
```

## 🐛 Problemas Resolvidos

### 1. ❌ Erro: empresa_id undefined

#### **Problema:**
```
GET .../empresas?select=documento&id=eq.undefined 400 (Bad Request)
```

#### **Causa:**
Campo `empresa_id` não estava sendo selecionado na consulta dos pedidos.

#### **Solução:**
1. **Adicionado `empresa_id`** na query SELECT
2. **Implementado fallback** para buscar empresa_id do usuário atual
3. **Debug logs** para identificar problemas futuros

### 2. 🎨 Cores dos Botões Pouco Visíveis

#### **Problema:**
- Verde muito claro (green-500)
- Roxo sólido não harmonioso

#### **Solução:**
- **Verde escuro:** green-600 → green-700
- **Azul transparente:** blue-500/80 → blue-600/90

### 3. 📱 Barra de Rolagem Dupla no Mobile

#### **Problema:**
Altura excessiva da área de listagem causando overflow duplo.

#### **Solução:**
```css
/* ANTES */
max-h-[calc(100vh-250px)]

/* AGORA */
max-h-[calc(100vh-320px)]
```

## 🧪 Testes e Validação

### ✅ Cenários Testados

1. **Filtros de Status:**
   - ✅ Pendentes → Mostra apenas pedidos pendentes
   - ✅ Faturados → Mostra apenas pedidos faturados
   - ✅ Cancelados → Mostra apenas pedidos cancelados
   - ✅ Todos → Mostra todos os pedidos

2. **Botão "Abrir":**
   - ✅ Gera URL correta: `site.com/pedido/{CNPJ}{NUMERO}`
   - ✅ Abre em nova guia
   - ✅ Funciona com fallback quando empresa_id ausente

3. **Interface Responsiva:**
   - ✅ Mobile: Uma única barra de rolagem
   - ✅ Desktop: Layout otimizado
   - ✅ Cores visíveis em ambos

### 🔍 Debug e Logs

#### **Console Logs Implementados:**
```typescript
console.log('Pedido recebido:', pedido);
console.log('empresa_id:', pedido.empresa_id);
```

#### **Como Verificar:**
1. Abrir DevTools (F12)
2. Ir para aba Console
3. Clicar no botão "Abrir"
4. Verificar logs para debug

## 🚀 Próximos Passos Sugeridos

### 🔮 Melhorias Futuras

1. **Cache de Empresas:**
   - Armazenar CNPJ em localStorage
   - Evitar consultas repetidas

2. **Filtros Avançados:**
   - Filtro por data
   - Filtro por cliente
   - Filtro por vendedor

3. **Ações em Lote:**
   - Importar múltiplos pedidos
   - Alterar status em lote

4. **Notificações:**
   - Toast de sucesso melhorado
   - Indicadores visuais de loading

## 📚 Referências e Dependências

### 🔗 Arquivos Relacionados
- `src/pages/dashboard/FaturamentoPage.tsx` - Referência para botão "Abrir"
- `src/utils/eventSystem.ts` - Sistema de eventos em tempo real
- `src/lib/supabase.ts` - Configuração do Supabase

### 📦 Dependências Utilizadas
- **Framer Motion** - Animações do modal
- **Lucide React** - Ícones (Filter, FileText, etc.)
- **React Toastify** - Notificações
- **Supabase** - Backend e consultas

### 🎯 Padrões Seguidos
- **Nomenclatura em português** para campos do banco
- **Estados locais** para performance
- **Fallbacks robustos** para tratamento de erros
- **Interface consistente** com resto do sistema

---

**📝 Nota:** Esta documentação deve ser atualizada sempre que houver modificações na implementação do modal de pedidos do PDV.
