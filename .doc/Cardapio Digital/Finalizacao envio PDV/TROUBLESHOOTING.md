# 🔧 Troubleshooting - Integração Cardápio → PDV

## 🚨 Problemas Comuns e Soluções

### **1. PDV não recebe notificações**

#### **Sintomas:**
- Pedidos são criados no cardápio mas não aparecem no PDV
- Contador permanece em zero
- Sem som ou toast de notificação

#### **Diagnóstico:**
```typescript
// Verificar no console do PDV:
console.log('EmpresaId:', empresaData?.id);
console.log('Hook habilitado:', !!empresaData?.id);
console.log('Canal realtime:', `cardapio_pedidos_${empresaId}`);
```

#### **Soluções:**

**A) Verificar empresaId**
```typescript
// PDVPage.tsx - Adicionar log
useEffect(() => {
  console.log('🏢 PDV - Dados da empresa:', {
    empresaId: empresaData?.id,
    empresaNome: empresaData?.nome_fantasia,
    contadorCardapio,
    pedidosCardapio: pedidosPendentes.length
  });
}, [empresaData, contadorCardapio, pedidosPendentes]);
```

**B) Verificar conexão Supabase**
```typescript
// Testar conexão
const testarConexao = async () => {
  const { data, error } = await supabase
    .from('cardapio_digital')
    .select('count')
    .eq('empresa_id', empresaId);
  
  console.log('Teste conexão:', { data, error });
};
```

**C) Verificar RLS (Row Level Security)**
```sql
-- Verificar políticas na tabela
SELECT * FROM pg_policies WHERE tablename = 'cardapio_digital';

-- Política correta:
CREATE POLICY "Empresas podem acessar seus pedidos" 
ON cardapio_digital FOR ALL 
USING (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid);
```

### **2. Som não toca**

#### **Sintomas:**
- Notificações visuais funcionam
- Som não é reproduzido

#### **Soluções:**

**A) Verificar arquivo de som**
```bash
# Verificar se arquivo existe
ls -la public/sounds/notification.mp3

# Testar no navegador
# Abrir: http://localhost:3000/sounds/notification.mp3
```

**B) Verificar permissões do navegador**
```typescript
// Solicitar permissão para áudio
const solicitarPermissaoAudio = async () => {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log('✅ Permissão de áudio concedida');
  } catch (error) {
    console.log('❌ Permissão de áudio negada');
  }
};
```

**C) Testar useSound manualmente**
```typescript
// Adicionar botão de teste
<button onClick={() => playNotification()}>
  🔊 Testar Som
</button>
```

### **3. Balão do pedido não persiste**

#### **Sintomas:**
- Balão aparece após fazer pedido
- Desaparece após recarregar página
- Taxa de entrega persiste, mas pedido não

#### **Diagnóstico:**
```typescript
// Verificar localStorage
const debugLocalStorage = () => {
  console.log('🔍 DEBUG - Dados salvos:');
  Object.keys(localStorage)
    .filter(key => key.includes('pedido_') || key.includes('cep_'))
    .forEach(key => {
      console.log(`📋 ${key}:`, localStorage.getItem(key));
    });
};
```

#### **Soluções:**

**A) Verificar chaves do localStorage**
```typescript
// Chaves corretas:
// pedido_status_slug_${slug}
// pedido_backup_slug_${slug}
// pedido_status_${empresaId}

// Verificar se slug está definido
console.log('Slug atual:', slug);
console.log('EmpresaId atual:', empresaId);
```

**B) Verificar timing de carregamento**
```typescript
// useEffect deve depender do slug
useEffect(() => {
  if (!slug) {
    console.log('⏳ Aguardando slug...');
    return;
  }
  // Carregar pedido
}, [slug, empresaId]);
```

### **4. Realtime não conecta**

#### **Sintomas:**
- Status do canal não é "SUBSCRIBED"
- Logs mostram erro de conexão

#### **Diagnóstico:**
```typescript
// Verificar status do canal
.subscribe((status) => {
  console.log('📡 Status do canal:', status);
  if (status === 'SUBSCRIBED') {
    console.log('✅ Realtime conectado');
  } else if (status === 'CHANNEL_ERROR') {
    console.log('❌ Erro no canal realtime');
  }
});
```

#### **Soluções:**

**A) Verificar configuração Supabase**
```typescript
// Verificar URL e chave
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...');
```

**B) Verificar filtros**
```typescript
// Filtro deve usar UUID válido
filter: `empresa_id=eq.${empresaId}`

// Verificar se empresaId é UUID válido
const isValidUUID = (uuid: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};
```

### **5. Modal não abre**

#### **Sintomas:**
- Botão clicável mas modal não aparece
- Estado não atualiza

#### **Soluções:**

**A) Verificar estado do modal**
```typescript
// Adicionar log
const abrirModal = () => {
  console.log('🔄 Abrindo modal cardápio');
  setModalCardapioAberto(true);
};

// Verificar renderização condicional
{modalCardapioAberto && (
  <div>Modal está sendo renderizado</div>
)}
```

**B) Verificar z-index**
```css
/* Modal deve ter z-index alto */
.modal-overlay {
  z-index: 9999;
}
```

## 📊 Logs de Debug Essenciais

### **Console Logs Importantes**
```typescript
// 1. Inicialização do hook
console.log('🔔 Configurando realtime para pedidos:', empresaId);

// 2. Carregamento de pedidos
console.log('📊 Pedidos encontrados:', data?.length || 0);

// 3. Novos pedidos
console.log('🆕 Novo pedido recebido:', payload.new);

// 4. Status do canal
console.log('📡 Status do canal:', status);

// 5. Ações do usuário
console.log('✅ Aceitando pedido:', pedidoId);
console.log('❌ Rejeitando pedido:', pedidoId);
```

### **Verificações de Estado**
```typescript
// Hook de debug
useEffect(() => {
  console.log('🔍 Estado atual:', {
    empresaId,
    enabled: !!empresaId,
    pedidosPendentes: pedidosPendentes.length,
    contadorPendentes,
    isLoading
  });
}, [empresaId, pedidosPendentes, contadorPendentes, isLoading]);
```

## 🧪 Testes Manuais

### **1. Teste de Conexão**
```typescript
// Função para testar manualmente
const testarIntegracao = async () => {
  console.log('🧪 Iniciando teste de integração...');
  
  // 1. Verificar conexão
  const { data: empresas } = await supabase.from('empresas').select('id').limit(1);
  console.log('✅ Conexão Supabase:', empresas ? 'OK' : 'ERRO');
  
  // 2. Verificar realtime
  const channel = supabase.channel('teste').subscribe();
  console.log('✅ Realtime:', channel ? 'OK' : 'ERRO');
  
  // 3. Verificar som
  try {
    playNotification();
    console.log('✅ Som: OK');
  } catch (error) {
    console.log('❌ Som: ERRO', error);
  }
};
```

### **2. Teste de Pedido**
```typescript
// Criar pedido de teste
const criarPedidoTeste = async () => {
  const pedidoTeste = {
    numero_pedido: 'TESTE001',
    empresa_id: empresaId,
    nome_cliente: 'Cliente Teste',
    telefone_cliente: '(11) 99999-9999',
    status_pedido: 'pendente',
    valor_total: 25.90,
    itens: [
      {
        nome: 'Produto Teste',
        quantidade: 1,
        preco_total: 25.90
      }
    ]
  };

  const { data, error } = await supabase
    .from('cardapio_digital')
    .insert(pedidoTeste);

  console.log('🧪 Pedido teste criado:', { data, error });
};
```

## 🔍 Ferramentas de Debug

### **1. Supabase Dashboard**
- Acessar: https://app.supabase.com
- Verificar logs em tempo real
- Monitorar conexões ativas
- Testar queries SQL

### **2. Browser DevTools**
```javascript
// Console commands úteis:

// Verificar localStorage
Object.keys(localStorage).filter(k => k.includes('pedido'))

// Limpar dados de teste
Object.keys(localStorage).forEach(k => {
  if (k.includes('pedido_')) localStorage.removeItem(k);
});

// Verificar estado React (com React DevTools)
$r.state // ou $r.props
```

### **3. Network Tab**
- Verificar requisições WebSocket
- Monitorar calls para Supabase
- Verificar headers de autenticação

## 📋 Checklist de Verificação

### **Antes de Reportar Bug:**
- [ ] EmpresaId está definido e é UUID válido
- [ ] Arquivo de som existe em `/public/sounds/`
- [ ] Permissões do navegador para áudio
- [ ] Console não mostra erros JavaScript
- [ ] Supabase está online e acessível
- [ ] RLS policies estão corretas
- [ ] Canal realtime está "SUBSCRIBED"
- [ ] localStorage tem dados corretos
- [ ] Slug está definido no cardápio público

### **Informações para Suporte:**
1. **Logs do console** (completos)
2. **URL da página** onde ocorre o problema
3. **Navegador e versão**
4. **Passos para reproduzir**
5. **Comportamento esperado vs atual**
6. **Screenshots/vídeos** se aplicável

## 🚀 Performance e Otimização

### **Monitoramento de Performance**
```typescript
// Medir tempo de carregamento
const startTime = performance.now();
await carregarPedidosPendentes();
const endTime = performance.now();
console.log(`⏱️ Carregamento levou ${endTime - startTime}ms`);

// Monitorar memória
console.log('💾 Uso de memória:', {
  usedJSHeapSize: performance.memory?.usedJSHeapSize,
  totalJSHeapSize: performance.memory?.totalJSHeapSize
});
```

### **Otimizações Recomendadas**
1. **Debounce** em atualizações frequentes
2. **Memoização** de componentes pesados
3. **Lazy loading** de modais
4. **Cleanup** adequado de listeners
5. **Throttling** de notificações

---

## 📞 Suporte Técnico

**Para problemas não resolvidos:**
1. Coletar logs completos do console
2. Verificar status do Supabase
3. Testar em navegador diferente
4. Verificar configurações de rede/firewall
5. Contactar equipe de desenvolvimento

**Desenvolvido por:** Emanuel Luis  
**Última atualização:** Janeiro 2025
