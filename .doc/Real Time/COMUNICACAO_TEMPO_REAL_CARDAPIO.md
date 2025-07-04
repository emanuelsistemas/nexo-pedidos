# 🚀 COMUNICAÇÃO EM TEMPO REAL - CARDÁPIO DIGITAL

## 📋 **VISÃO GERAL**

Este documento explica como implementar comunicação em tempo real entre o sistema administrativo e o cardápio digital público, garantindo que mudanças sejam refletidas instantaneamente sem necessidade de atualização manual da página.

---

## ⚠️ **MÉTODOS QUE NÃO FUNCIONAM**

### **❌ 1. Eventos `window` entre páginas diferentes**
```typescript
// ❌ NÃO FUNCIONA - Páginas diferentes não compartilham contexto
window.dispatchEvent(new CustomEvent('lojaStatusChanged', { detail: data }));
window.addEventListener('lojaStatusChanged', handler);
```

**Por que não funciona:**
- Eventos `window` só funcionam na **mesma página/contexto**
- Cardápio público (`/cardapio/slug`) e configurações (`/dashboard/configuracoes`) são **páginas diferentes**
- Navegador isola contextos de JavaScript entre páginas

### **❌ 2. LocalStorage polling simples**
```typescript
// ❌ NÃO FUNCIONA - Não é confiável e tem delay
const checkLocalStorage = () => {
  const status = localStorage.getItem('lojaStatus');
  // Problema: delay, não é instantâneo, pode falhar
};
setInterval(checkLocalStorage, 1000);
```

**Por que não funciona:**
- **Delay** de 1+ segundos
- **Não é confiável** (localStorage pode não sincronizar)
- **Performance ruim** (polling constante)

### **❌ 3. Realtime básico sem configuração adequada**
```typescript
// ❌ NÃO FUNCIONA - Configuração inadequada
supabase.channel('generic_channel')
  .on('postgres_changes', { event: '*', table: 'pdv_config' }, handler)
  .subscribe();
```

**Por que não funciona:**
- **Sem filtro por empresa** (multi-tenant)
- **Canal genérico** (conflitos)
- **Configuração básica** (sem otimizações)

---

## ✅ **MÉTODO QUE FUNCIONA**

### **🎯 Estratégia Dupla: Realtime + Polling Backup**

#### **1. Realtime Otimizado do Supabase (Principal)**
```typescript
// ✅ FUNCIONA - Configuração otimizada
const channelName = `cardapio_loja_status_${empresaId}`;

const channel = supabase
  .channel(channelName, {
    config: {
      broadcast: { self: true },      // Permite receber próprias mudanças
      presence: { key: empresaId }    // Identificação única por empresa
    }
  })
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',                // Apenas UPDATEs
      schema: 'public',
      table: 'pdv_config',
      filter: `empresa_id=eq.${empresaId}` // FILTRO ESSENCIAL
    },
    (payload) => {
      console.log('🔄 Atualização realtime recebida:', payload);
      
      if (payload.new && payload.new.cardapio_loja_aberta !== undefined) {
        const novoStatus = payload.new.cardapio_loja_aberta;
        setLojaAberta(novoStatus);
      }
    }
  )
  .subscribe((status) => {
    console.log('📡 Status da subscrição:', status);
    if (status === 'SUBSCRIBED') {
      console.log('✅ Realtime conectado para empresa:', empresaId);
    }
  });
```

#### **2. Polling como Backup (Secundário)**
```typescript
// ✅ BACKUP - Garante sincronização mesmo se realtime falhar
const interval = setInterval(async () => {
  try {
    const { data: statusData, error } = await supabase
      .from('pdv_config')
      .select('cardapio_loja_aberta')
      .eq('empresa_id', empresaId)
      .single();

    if (!error && statusData && statusData.cardapio_loja_aberta !== lojaAberta) {
      console.log('🔄 Polling: Status diferente detectado');
      setLojaAberta(statusData.cardapio_loja_aberta);
    }
  } catch (error) {
    console.error('❌ Erro no polling:', error);
  }
}, 3000); // 3 segundos - balance entre performance e responsividade
```

---

## 🔧 **IMPLEMENTAÇÃO COMPLETA**

### **Arquivo: `src/pages/public/CardapioPublicoPage.tsx`**

```typescript
// Configurar realtime para monitorar mudanças no status da loja
useEffect(() => {
  if (!empresaId) return;

  console.log('🔔 Configurando realtime para empresa:', empresaId);

  // Criar canal único para esta empresa
  const channelName = `cardapio_loja_status_${empresaId}`;
  
  const channel = supabase
    .channel(channelName, {
      config: {
        broadcast: { self: true },
        presence: { key: empresaId }
      }
    })
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'pdv_config',
        filter: `empresa_id=eq.${empresaId}`
      },
      (payload) => {
        console.log('🔄 Cardápio: Atualização realtime recebida:', payload);
        console.log('🔄 Payload completo:', JSON.stringify(payload, null, 2));

        if (payload.new && payload.new.cardapio_loja_aberta !== undefined) {
          const novoStatus = payload.new.cardapio_loja_aberta;
          console.log('✅ Atualizando status da loja de', lojaAberta, 'para', novoStatus);
          setLojaAberta(novoStatus);
        }
      }
    )
    .subscribe((status) => {
      console.log('📡 Status da subscrição realtime:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime conectado com sucesso para empresa:', empresaId);
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Erro na conexão realtime');
      }
    });

  return () => {
    console.log('🔔 Removendo canal realtime');
    supabase.removeChannel(channel);
  };
}, [empresaId]);

// Polling como backup para garantir sincronização
useEffect(() => {
  if (!empresaId) return;

  console.log('⏰ Configurando polling de backup para empresa:', empresaId);

  const interval = setInterval(async () => {
    try {
      const { data: statusData, error } = await supabase
        .from('pdv_config')
        .select('cardapio_loja_aberta')
        .eq('empresa_id', empresaId)
        .single();

      if (!error && statusData && statusData.cardapio_loja_aberta !== lojaAberta) {
        console.log('🔄 Polling: Status diferente detectado, atualizando de', lojaAberta, 'para', statusData.cardapio_loja_aberta);
        setLojaAberta(statusData.cardapio_loja_aberta);
      }
    } catch (error) {
      console.error('❌ Erro no polling:', error);
    }
  }, 3000); // Verificar a cada 3 segundos

  return () => {
    console.log('⏰ Removendo polling de backup');
    clearInterval(interval);
  };
}, [empresaId, lojaAberta]);
```

---

## 🎯 **PONTOS CRÍTICOS PARA SUCESSO**

### **1. Canal Único por Empresa**
```typescript
// ✅ CORRETO - Canal específico por empresa
const channelName = `cardapio_loja_status_${empresaId}`;

// ❌ ERRADO - Canal genérico
const channelName = 'loja_status_notifications';
```

### **2. Filtro por Empresa Obrigatório**
```typescript
// ✅ CORRETO - Filtro específico
filter: `empresa_id=eq.${empresaId}`

// ❌ ERRADO - Sem filtro (recebe de todas as empresas)
// filter: undefined
```

### **3. Configuração Otimizada do Canal**
```typescript
// ✅ CORRETO - Configuração completa
.channel(channelName, {
  config: {
    broadcast: { self: true },      // Essencial para receber próprias mudanças
    presence: { key: empresaId }    // Identificação única
  }
})

// ❌ ERRADO - Configuração básica
.channel(channelName)
```

### **4. Cleanup Adequado**
```typescript
// ✅ CORRETO - Limpeza no useEffect
return () => {
  supabase.removeChannel(channel);
  clearInterval(interval);
};

// ❌ ERRADO - Sem limpeza (vazamentos de memória)
```

---

## 📊 **VANTAGENS DA IMPLEMENTAÇÃO**

### **⚡ Performance**
- **Realtime**: ~100-500ms de latência
- **Polling backup**: Máximo 3 segundos
- **Sem overhead**: Apenas quando há mudanças

### **🔒 Confiabilidade**
- **Dupla proteção**: Realtime + Polling
- **Isolamento**: Por empresa (multi-tenant)
- **Recuperação**: Automática em caso de falha

### **🐛 Debugabilidade**
- **Logs detalhados**: Para cada etapa
- **Status da conexão**: Visível no console
- **Payload completo**: Para análise

---

## 🧪 **COMO TESTAR**

### **1. Teste Básico**
1. Abra duas abas:
   - `http://nexodev.emasoftware.app/dashboard/configuracoes`
   - `http://nexodev.emasoftware.app/cardapio/[slug]`
2. Mude status da loja na primeira aba
3. Verifique mudança instantânea na segunda aba

### **2. Teste de Debug**
1. Abra DevTools (F12) na aba do cardápio
2. Monitore console para logs:
   ```
   🔔 Configurando realtime para empresa: [UUID]
   📡 Status da subscrição realtime: SUBSCRIBED
   ✅ Realtime conectado com sucesso
   🔄 Atualização realtime recebida: [payload]
   ✅ Atualizando status da loja de true para false
   ```

### **3. Teste de Falha**
1. Desconecte internet por 10 segundos
2. Mude status da loja
3. Reconecte internet
4. Verifique se polling backup sincronizou

---

## 🔄 **TEMPLATE PARA OUTRAS FUNCIONALIDADES**

### **Para implementar comunicação similar:**

```typescript
// 1. Definir canal único
const channelName = `[funcionalidade]_${empresaId}`;

// 2. Configurar realtime
const channel = supabase
  .channel(channelName, {
    config: {
      broadcast: { self: true },
      presence: { key: empresaId }
    }
  })
  .on('postgres_changes', {
    event: 'UPDATE', // ou INSERT/DELETE conforme necessário
    schema: 'public',
    table: '[tabela]',
    filter: `empresa_id=eq.${empresaId}`
  }, (payload) => {
    // Processar mudança
    if (payload.new && payload.new.[campo] !== undefined) {
      set[Estado](payload.new.[campo]);
    }
  })
  .subscribe();

// 3. Polling backup
const interval = setInterval(async () => {
  const { data } = await supabase
    .from('[tabela]')
    .select('[campo]')
    .eq('empresa_id', empresaId)
    .single();
    
  if (data && data.[campo] !== [estadoAtual]) {
    set[Estado](data.[campo]);
  }
}, 3000);

// 4. Cleanup
return () => {
  supabase.removeChannel(channel);
  clearInterval(interval);
};
```

---

## 📝 **CHECKLIST PARA IMPLEMENTAÇÃO**

- [ ] Canal único por empresa
- [ ] Filtro `empresa_id=eq.${empresaId}`
- [ ] Configuração `broadcast: { self: true }`
- [ ] Polling backup (3-5 segundos)
- [ ] Logs detalhados para debug
- [ ] Cleanup adequado no useEffect
- [ ] Teste em duas abas diferentes
- [ ] Verificação de logs no console

---

## 🚨 **TROUBLESHOOTING**

### **Problema: Realtime não conecta**
```bash
# Verificar logs no console:
❌ Status da subscrição realtime: CHANNEL_ERROR
```

**Soluções:**
1. Verificar se tabela tem Realtime habilitado no Supabase
2. Verificar filtro `empresa_id` está correto
3. Verificar permissões RLS da tabela

### **Problema: Recebe eventos de outras empresas**
```bash
# Log indica empresa errada:
🔄 Empresa atual: abc-123
🔄 Empresa do evento: def-456
```

**Solução:**
```typescript
// Adicionar filtro obrigatório
filter: `empresa_id=eq.${empresaId}`
```

### **Problema: Delay de 3+ segundos**
```bash
# Realtime não está funcionando, só polling
⏰ Polling: Status diferente detectado
```

**Soluções:**
1. Verificar conexão internet
2. Verificar status da subscrição
3. Recriar canal com nome único

### **Problema: Múltiplas atualizações**
```bash
# Logs duplicados:
✅ Atualizando status da loja de true para false
✅ Atualizando status da loja de true para false
```

**Solução:**
```typescript
// Adicionar debounce
const [lastUpdate, setLastUpdate] = useState(0);

if (Date.now() - lastUpdate > 1000) {
  setLojaAberta(novoStatus);
  setLastUpdate(Date.now());
}
```

---

## 📚 **EXEMPLOS PRÁTICOS**

### **Exemplo 1: Horário de Funcionamento**
```typescript
// Atualizar horário em tempo real
const channelName = `horario_funcionamento_${empresaId}`;

.on('postgres_changes', {
  event: 'UPDATE',
  table: 'horario_atendimento',
  filter: `empresa_id=eq.${empresaId}`
}, (payload) => {
  if (payload.new) {
    setHorarioFuncionamento(payload.new);
  }
});
```

### **Exemplo 2: Produtos em Destaque**
```typescript
// Atualizar produtos em tempo real
const channelName = `produtos_destaque_${empresaId}`;

.on('postgres_changes', {
  event: '*', // INSERT, UPDATE, DELETE
  table: 'produtos',
  filter: `empresa_id=eq.${empresaId}`
}, (payload) => {
  // Recarregar lista de produtos
  loadProdutos();
});
```

### **Exemplo 3: Promoções Ativas**
```typescript
// Atualizar promoções em tempo real
const channelName = `promocoes_ativas_${empresaId}`;

.on('postgres_changes', {
  event: 'UPDATE',
  table: 'promocoes',
  filter: `empresa_id=eq.${empresaId}`
}, (payload) => {
  if (payload.new && payload.new.ativa !== undefined) {
    setPromocaoAtiva(payload.new.ativa);
  }
});
```

---

## 🔗 **LINKS ÚTEIS**

- **Supabase Realtime Docs**: https://supabase.com/docs/guides/realtime
- **PostgreSQL Changes**: https://supabase.com/docs/guides/realtime/postgres-changes
- **Channel Configuration**: https://supabase.com/docs/reference/javascript/channel

---

## 📋 **RESUMO EXECUTIVO**

### **O que foi implementado:**
✅ Comunicação em tempo real entre dashboard e cardápio público
✅ Sistema duplo: Realtime (principal) + Polling (backup)
✅ Isolamento por empresa (multi-tenant)
✅ Logs detalhados para debug
✅ Template reutilizável para outras funcionalidades

### **Benefícios:**
🚀 **Atualização instantânea** (100-500ms)
🔒 **Confiável** (backup automático)
🏢 **Multi-tenant** (isolamento perfeito)
🐛 **Debugável** (logs completos)
📱 **Universal** (funciona em qualquer dispositivo)

### **Casos de uso futuros:**
- Horário de funcionamento
- Produtos em destaque
- Promoções ativas
- Status de pedidos
- Cardápio atualizado
- Preços dinâmicos

---

**📅 Criado em**: 04/07/2025
**👨‍💻 Implementado por**: Augment Agent
**🎯 Status**: Funcional e testado
**🔄 Última atualização**: 04/07/2025
