# 🔧 Troubleshooting - Modal de Pedidos PDV

## 🚨 Problemas Comuns e Soluções

### 1. ❌ Erro: "empresa_id undefined" no Botão "Abrir"

#### **Sintomas:**
```
GET .../empresas?select=documento&id=eq.undefined 400 (Bad Request)
Erro ao gerar link do pedido: Error: Não foi possível obter o CNPJ da empresa
```

#### **Causa:**
Campo `empresa_id` não está sendo selecionado na consulta dos pedidos.

#### **Solução:**
```typescript
// ✅ CORRETO: Incluir empresa_id na query
const { data, error } = await supabase
  .from('pedidos')
  .select(`
    id,
    numero,
    created_at,
    status,
    valor_total,
    empresa_id,  // ← ESSENCIAL
    desconto_prazo_id,
    desconto_valor_id,
    usuario_id,
    cliente:clientes(id, nome, telefone),
    pedidos_itens(...)
  `)

// ❌ ERRADO: Sem empresa_id
.select(`
  id,
  numero,
  created_at,
  status,
  valor_total,
  // empresa_id AUSENTE
  desconto_prazo_id,
  ...
`)
```

#### **Fallback Implementado:**
```typescript
const gerarLinkPedido = async (pedido: any) => {
  try {
    // Tentar usar empresa_id do pedido
    let empresaId = pedido.empresa_id;
    
    // Se não existir, buscar do usuário atual
    if (!empresaId) {
      const { data: userData } = await supabase.auth.getUser();
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();
      empresaId = usuarioData.empresa_id;
    }
    
    // Continuar com empresaId válido...
  } catch (error) {
    console.error('Erro ao gerar link:', error);
    return null;
  }
};
```

### 2. 🎨 Botões com Cores Pouco Visíveis

#### **Sintomas:**
- Botão verde muito claro
- Botão roxo não harmonioso com o design

#### **Solução:**
```css
/* ✅ CORES OTIMIZADAS */

/* Botão Importar - Verde escuro */
.btn-importar {
  background: rgb(22 163 74); /* green-600 */
}
.btn-importar:hover {
  background: rgb(21 128 61); /* green-700 */
}

/* Botão Abrir - Azul transparente */
.btn-abrir {
  background: rgb(59 130 246 / 0.8); /* blue-500/80 */
}
.btn-abrir:hover {
  background: rgb(37 99 235 / 0.9); /* blue-600/90 */
}

/* Botão Ver Detalhes - Cinza mantido */
.btn-detalhes {
  background: rgb(75 85 99); /* gray-600 */
}
.btn-detalhes:hover {
  background: rgb(107 114 128); /* gray-500 */
}
```

### 3. 📱 Barra de Rolagem Dupla no Mobile

#### **Sintomas:**
- Duas barras de rolagem aparecem
- Interface quebrada no mobile
- Área de pedidos muito alta

#### **Causa:**
Altura excessiva da área de listagem.

#### **Solução:**
```css
/* ✅ ALTURA CORRIGIDA */
.lista-pedidos {
  max-height: calc(100vh - 320px); /* Altura otimizada */
  overflow-y: auto;
}

/* ❌ ALTURA PROBLEMÁTICA */
.lista-pedidos {
  max-height: calc(100vh - 250px); /* Muito alta */
}
```

#### **Aplicação no Código:**
```typescript
// UserPedidosPage.tsx
<div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar pr-2">

// UserClientesPage.tsx  
<div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar pr-2">

// FaturamentoPage.tsx
<div className="space-y-4 max-h-[calc(100vh-350px)] overflow-y-auto custom-scrollbar pr-2">
```

### 4. 🔍 Filtros Não Funcionam

#### **Sintomas:**
- Clicar nos filtros não altera a lista
- Contadores não atualizam
- Busca não funciona

#### **Causa:**
useEffect não está configurado corretamente.

#### **Solução:**
```typescript
// ✅ useEffect CORRETO
useEffect(() => {
  aplicarFiltrosPedidos();
}, [pedidos, searchPedidos, statusFilterPedidos]);

// ❌ useEffect AUSENTE ou INCORRETO
// Sem dependências ou dependências erradas
```

#### **Função de Filtros:**
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

### 5. 📊 Contadores Incorretos

#### **Sintomas:**
- Números nos botões de filtro estão errados
- Contador não atualiza em tempo real

#### **Solução:**
```typescript
// ✅ CONTADORES CORRETOS
const contadores = {
  pendentes: pedidos.filter(p => p.status === 'pendente').length,
  faturados: pedidos.filter(p => p.status === 'faturado').length,
  cancelados: pedidos.filter(p => p.status === 'cancelado').length,
  todos: pedidos.length
};

// Usar nos botões
{[
  { value: 'pendente', label: 'Pendentes', count: contadores.pendentes },
  { value: 'faturado', label: 'Faturados', count: contadores.faturados },
  { value: 'cancelado', label: 'Cancelados', count: contadores.cancelados },
  { value: 'todos', label: 'Todos', count: contadores.todos }
].map((status) => (
  // Botão com contador
))}
```

### 6. 🔄 Modal Não Abre ou Fecha

#### **Sintomas:**
- Clicar em "Pedidos" não abre o modal
- Modal não fecha ao clicar no X

#### **Causa:**
Estados do modal não estão sendo gerenciados corretamente.

#### **Solução:**
```typescript
// ✅ ESTADOS CORRETOS
const [showPedidosModal, setShowPedidosModal] = useState(false);

// Abrir modal
const abrirModal = () => {
  setShowPedidosModal(true);
  setSearchPedidos('');
  // Carregar pedidos se necessário
  if (pedidos.length === 0) {
    loadPedidos();
  }
};

// Fechar modal
const fecharModal = () => {
  setShowPedidosModal(false);
  setSearchPedidos('');
  setStatusFilterPedidos('pendente');
  setShowFiltersPedidos(false);
};
```

### 7. 🌐 URL Gerada Incorreta

#### **Sintomas:**
- URL não abre a página correta
- Código do pedido malformado

#### **Causa:**
CNPJ não está sendo limpo corretamente ou número do pedido está incorreto.

#### **Solução:**
```typescript
// ✅ GERAÇÃO CORRETA
const gerarLinkPedido = async (pedido: any) => {
  try {
    // Buscar CNPJ da empresa
    const { data: empresaData } = await supabase
      .from('empresas')
      .select('documento')
      .eq('id', empresaId)
      .single();

    // Limpar CNPJ (remover pontos, traços, barras)
    const cnpjLimpo = empresaData.documento.replace(/[^\d]/g, '');
    
    // Gerar código (CNPJ + número do pedido)
    const codigoPedido = `${cnpjLimpo}${pedido.numero}`;
    
    // URL final
    const url = `${window.location.origin}/pedido/${codigoPedido}`;
    
    console.log('URL gerada:', url); // Debug
    return url;
  } catch (error) {
    console.error('Erro ao gerar link:', error);
    return null;
  }
};
```

## 🔍 Debug e Diagnóstico

### 📝 Logs Essenciais

#### **Para Botão "Abrir":**
```typescript
console.log('Pedido recebido:', pedido);
console.log('empresa_id:', pedido.empresa_id);
console.log('CNPJ encontrado:', empresaData.documento);
console.log('CNPJ limpo:', cnpjLimpo);
console.log('Código do pedido:', codigoPedido);
console.log('URL final:', url);
```

#### **Para Filtros:**
```typescript
console.log('Pedidos originais:', pedidos.length);
console.log('Status filtro:', statusFilterPedidos);
console.log('Termo busca:', searchPedidos);
console.log('Pedidos filtrados:', filtered.length);
```

### 🧪 Testes Manuais

#### **Checklist de Testes:**
- [ ] Modal abre ao clicar em "Pedidos"
- [ ] Filtros funcionam corretamente
- [ ] Contadores estão corretos
- [ ] Busca funciona
- [ ] Botão "Importar" funciona (apenas pendentes)
- [ ] Botão "Ver Detalhes" funciona
- [ ] Botão "Abrir" gera URL correta
- [ ] Nova guia abre com a nota
- [ ] Modal fecha corretamente
- [ ] Interface responsiva no mobile

#### **Dados de Teste:**
```typescript
// Pedido de exemplo para testes
const pedidoTeste = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  numero: "041852",
  status: "pendente",
  valor_total: 150.00,
  empresa_id: "empresa-uuid-123",
  cliente: {
    id: "cliente-uuid-456",
    nome: "João Silva",
    telefone: "(11) 99999-9999"
  }
};
```

## 🚀 Performance e Otimização

### ⚡ Carregamento Otimizado

#### **Estratégia Implementada:**
1. **Modal abre imediatamente** (sem loading)
2. **Dados carregam em background** se necessário
3. **Cache local** dos pedidos
4. **Limite de 100 pedidos** por consulta

#### **Código de Otimização:**
```typescript
// Abrir modal IMEDIATAMENTE
const abrirModalPedidos = () => {
  setShowPedidosModal(true);
  setSearchPedidos('');

  // Carregar dados apenas se necessário
  if (pedidos.length === 0) {
    setTimeout(() => {
      loadPedidos();
    }, 100);
  }
};
```

### 🔄 Atualização em Tempo Real

#### **Sistema de Eventos:**
```typescript
// Listener para mudanças nos pedidos
useEffect(() => {
  const handlePedidoChange = (event: CustomEvent) => {
    // Recarregar pedidos quando houver mudanças
    loadPedidos();
  };

  window.addEventListener('pedidoStatusChange', handlePedidoChange);
  return () => window.removeEventListener('pedidoStatusChange', handlePedidoChange);
}, []);
```

## 📋 Checklist de Implementação

### ✅ Funcionalidades Obrigatórias
- [ ] Modal de pedidos funcional
- [ ] Filtros por status (Pendentes, Faturados, Cancelados, Todos)
- [ ] Busca por número, cliente, telefone
- [ ] Botão "Importar para Carrinho" (apenas pendentes)
- [ ] Botão "Ver Detalhes" (todos os status)
- [ ] Botão "Abrir" (todos os status)
- [ ] Contadores em tempo real
- [ ] Interface responsiva
- [ ] Cores otimizadas dos botões

### ✅ Tratamento de Erros
- [ ] Fallback para empresa_id ausente
- [ ] Validação de dados antes de processar
- [ ] Mensagens de erro amigáveis
- [ ] Logs de debug implementados

### ✅ Performance
- [ ] Carregamento otimizado
- [ ] Limite de pedidos por consulta
- [ ] useEffect configurado corretamente
- [ ] Estados gerenciados eficientemente

---

**🔧 Lembre-se:** Sempre verificar o console do navegador para logs de debug ao investigar problemas!
