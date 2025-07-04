# ⚡ GUIA RÁPIDO - REALTIME SUPABASE

## 🎯 **TEMPLATE COPY-PASTE**

### **Para qualquer funcionalidade que precisa de atualização em tempo real:**

```typescript
// 1. IMPORTS
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// 2. ESTADO
const [dadoAtual, setDadoAtual] = useState(null);
const [empresaId, setEmpresaId] = useState(null);

// 3. REALTIME + POLLING
useEffect(() => {
  if (!empresaId) return;

  // REALTIME (Principal)
  const channelName = `[NOME_FUNCIONALIDADE]_${empresaId}`;
  
  const channel = supabase
    .channel(channelName, {
      config: {
        broadcast: { self: true },
        presence: { key: empresaId }
      }
    })
    .on('postgres_changes', {
      event: 'UPDATE', // ou 'INSERT', 'DELETE', '*'
      schema: 'public',
      table: '[NOME_TABELA]',
      filter: `empresa_id=eq.${empresaId}`
    }, (payload) => {
      console.log('🔄 Atualização recebida:', payload);
      
      if (payload.new && payload.new.[CAMPO] !== undefined) {
        setDadoAtual(payload.new.[CAMPO]);
      }
    })
    .subscribe((status) => {
      console.log('📡 Status realtime:', status);
    });

  // POLLING (Backup)
  const interval = setInterval(async () => {
    try {
      const { data } = await supabase
        .from('[NOME_TABELA]')
        .select('[CAMPO]')
        .eq('empresa_id', empresaId)
        .single();

      if (data && data.[CAMPO] !== dadoAtual) {
        console.log('🔄 Polling: Atualizando via backup');
        setDadoAtual(data.[CAMPO]);
      }
    } catch (error) {
      console.error('❌ Erro no polling:', error);
    }
  }, 3000);

  // CLEANUP
  return () => {
    supabase.removeChannel(channel);
    clearInterval(interval);
  };
}, [empresaId, dadoAtual]);
```

---

## 🔧 **SUBSTITUIÇÕES NECESSÁRIAS**

| Placeholder | Exemplo | Descrição |
|-------------|---------|-----------|
| `[NOME_FUNCIONALIDADE]` | `loja_status` | Nome único da funcionalidade |
| `[NOME_TABELA]` | `pdv_config` | Tabela do banco de dados |
| `[CAMPO]` | `cardapio_loja_aberta` | Campo específico a monitorar |
| `dadoAtual` | `lojaAberta` | Nome do estado React |
| `setDadoAtual` | `setLojaAberta` | Setter do estado React |

---

## 📋 **CHECKLIST RÁPIDO**

### **Antes de implementar:**
- [ ] Tabela tem Realtime habilitado no Supabase?
- [ ] Campo `empresa_id` existe na tabela?
- [ ] RLS (Row Level Security) configurado?

### **Durante implementação:**
- [ ] Canal único: `funcionalidade_${empresaId}`
- [ ] Filtro obrigatório: `empresa_id=eq.${empresaId}`
- [ ] Config: `broadcast: { self: true }`
- [ ] Polling backup (3-5 segundos)
- [ ] Cleanup no useEffect

### **Após implementação:**
- [ ] Teste em duas abas diferentes
- [ ] Verificar logs no console
- [ ] Testar com internet instável
- [ ] Verificar isolamento entre empresas

---

## 🚨 **ERROS COMUNS**

### **❌ Erro 1: Canal genérico**
```typescript
// ERRADO
.channel('generic_channel')

// CORRETO
.channel(`funcionalidade_${empresaId}`)
```

### **❌ Erro 2: Sem filtro por empresa**
```typescript
// ERRADO
filter: undefined

// CORRETO
filter: `empresa_id=eq.${empresaId}`
```

### **❌ Erro 3: Sem cleanup**
```typescript
// ERRADO
useEffect(() => {
  const channel = supabase.channel(...)
  // Sem return
}, []);

// CORRETO
useEffect(() => {
  const channel = supabase.channel(...)
  return () => supabase.removeChannel(channel);
}, []);
```

### **❌ Erro 4: Dependências incorretas**
```typescript
// ERRADO
}, []); // Sem dependências

// CORRETO
}, [empresaId, dadoAtual]); // Com dependências necessárias
```

---

## 🎯 **CASOS DE USO COMUNS**

### **1. Status On/Off**
```typescript
// Para campos boolean (ativo/inativo, aberto/fechado)
if (payload.new && payload.new.status !== undefined) {
  setStatus(payload.new.status);
}
```

### **2. Lista de Itens**
```typescript
// Para quando lista inteira precisa ser recarregada
.on('postgres_changes', {
  event: '*', // INSERT, UPDATE, DELETE
  table: 'produtos'
}, () => {
  loadProdutos(); // Recarregar lista completa
});
```

### **3. Dados Complexos**
```typescript
// Para objetos/JSON
if (payload.new && payload.new.configuracao) {
  setConfiguracao(JSON.parse(payload.new.configuracao));
}
```

### **4. Múltiplos Campos**
```typescript
// Para atualizar vários campos de uma vez
if (payload.new) {
  setDados(prev => ({
    ...prev,
    campo1: payload.new.campo1,
    campo2: payload.new.campo2
  }));
}
```

---

## 🔍 **DEBUG RÁPIDO**

### **Console logs esperados:**
```bash
✅ Logs de sucesso:
📡 Status realtime: SUBSCRIBED
🔄 Atualização recebida: {new: {...}}

❌ Logs de problema:
📡 Status realtime: CHANNEL_ERROR
❌ Erro no polling: [error]
```

### **Comandos úteis no DevTools:**
```javascript
// Verificar canais ativos
console.log(supabase.getChannels());

// Forçar reconexão
supabase.removeAllChannels();
// Depois recarregar página
```

---

## 📊 **PERFORMANCE**

### **Tempos esperados:**
- **Realtime**: 100-500ms
- **Polling backup**: Máximo 3-5 segundos
- **Reconexão**: 1-2 segundos

### **Otimizações:**
```typescript
// Debounce para evitar múltiplas atualizações
const [lastUpdate, setLastUpdate] = useState(0);

if (Date.now() - lastUpdate > 1000) {
  setDadoAtual(novoValor);
  setLastUpdate(Date.now());
}
```

---

## 🔗 **LINKS DE REFERÊNCIA**

- **Documentação completa**: `.chat-ia/COMUNICACAO_TEMPO_REAL_CARDAPIO.md`
- **Supabase Realtime**: https://supabase.com/docs/guides/realtime
- **Exemplo funcionando**: `src/pages/public/CardapioPublicoPage.tsx`

---

**📅 Criado em**: 04/07/2025  
**🎯 Objetivo**: Referência rápida para implementações futuras  
**⚡ Uso**: Copy-paste e adaptar conforme necessário
