# 🔧 EXEMPLOS PRÁTICOS - MODIFICAÇÃO DOS CUPONS DE PRODUÇÃO

## 📋 **CENÁRIOS COMUNS DE MODIFICAÇÃO**

Este documento contém exemplos práticos para as modificações mais comuns nos cupons de produção.

---

## 🔼 **CENÁRIO 1: AUMENTAR TODOS OS TAMANHOS**

### **Situação:** 
"Os cupons estão legíveis, mas quero que fiquem um pouco maiores"

### **Solução:**
**Arquivo:** `src/pages/dashboard/PDVPage.tsx`  
**Localização:** Função `imprimirCupomProducaoGrupo()` - linha ~3575

```typescript
// ANTES (tamanhos atuais)
@media print {
  .header {
    font-size: ${usarImpressao50mm ? '14pt' : '16pt'} !important;
  }
  .grupo-titulo {
    font-size: ${usarImpressao50mm ? '13pt' : '15pt'} !important;
  }
  .info-pedido {
    font-size: ${usarImpressao50mm ? '11pt' : '13pt'} !important;
  }
  .item-nome {
    font-size: ${usarImpressao50mm ? '13pt' : '15pt'} !important;
  }
  .item-quantidade {
    font-size: ${usarImpressao50mm ? '14pt' : '16pt'} !important;
  }
}

// DEPOIS (aumentando 2pt em todos)
@media print {
  .header {
    font-size: ${usarImpressao50mm ? '16pt' : '18pt'} !important;
  }
  .grupo-titulo {
    font-size: ${usarImpressao50mm ? '15pt' : '17pt'} !important;
  }
  .info-pedido {
    font-size: ${usarImpressao50mm ? '13pt' : '15pt'} !important;
  }
  .item-nome {
    font-size: ${usarImpressao50mm ? '15pt' : '17pt'} !important;
  }
  .item-quantidade {
    font-size: ${usarImpressao50mm ? '16pt' : '18pt'} !important;
  }
}
```

---

## 🔽 **CENÁRIO 2: DIMINUIR TODOS OS TAMANHOS**

### **Situação:** 
"Os cupons estão muito grandes, quero diminuir um pouco"

### **Solução:**
```typescript
// DEPOIS (diminuindo 1pt em todos)
@media print {
  .header {
    font-size: ${usarImpressao50mm ? '13pt' : '15pt'} !important;
  }
  .grupo-titulo {
    font-size: ${usarImpressao50mm ? '12pt' : '14pt'} !important;
  }
  .info-pedido {
    font-size: ${usarImpressao50mm ? '10pt' : '12pt'} !important;
  }
  .item-nome {
    font-size: ${usarImpressao50mm ? '12pt' : '14pt'} !important;
  }
  .item-quantidade {
    font-size: ${usarImpressao50mm ? '13pt' : '15pt'} !important;
  }
}
```

---

## 🎯 **CENÁRIO 3: DESTACAR APENAS NOMES DOS PRODUTOS**

### **Situação:** 
"Quero que apenas os nomes dos produtos fiquem bem grandes"

### **Solução:**
```typescript
@media print {
  .header {
    font-size: ${usarImpressao50mm ? '12pt' : '14pt'} !important; // Normal
  }
  .grupo-titulo {
    font-size: ${usarImpressao50mm ? '13pt' : '15pt'} !important; // Normal
  }
  .info-pedido {
    font-size: ${usarImpressao50mm ? '10pt' : '12pt'} !important; // Menor
  }
  .item-nome {
    font-size: ${usarImpressao50mm ? '18pt' : '22pt'} !important; // MUITO MAIOR
  }
  .item-quantidade {
    font-size: ${usarImpressao50mm ? '14pt' : '16pt'} !important; // Normal
  }
}
```

---

## 📏 **CENÁRIO 4: AJUSTAR APENAS IMPRESSÃO 80MM**

### **Situação:** 
"50mm está bom, mas 80mm precisa ser maior"

### **Solução:**
```typescript
@media print {
  .header {
    font-size: ${usarImpressao50mm ? '14pt' : '20pt'} !important; // 80mm maior
  }
  .grupo-titulo {
    font-size: ${usarImpressao50mm ? '13pt' : '18pt'} !important; // 80mm maior
  }
  .info-pedido {
    font-size: ${usarImpressao50mm ? '11pt' : '16pt'} !important; // 80mm maior
  }
  .item-nome {
    font-size: ${usarImpressao50mm ? '13pt' : '18pt'} !important; // 80mm maior
  }
  .item-quantidade {
    font-size: ${usarImpressao50mm ? '14pt' : '20pt'} !important; // 80mm maior
  }
}
```

---

## 🎨 **CENÁRIO 5: MODIFICAR ESPAÇAMENTOS**

### **Situação:** 
"Quero mais espaço entre os itens"

### **Solução:**
**Localização:** linha ~3509 em diante

```typescript
// ANTES
.item {
  margin-bottom: 10px;
  border-bottom: 2px dashed #333;
  padding-bottom: 8px;
}

// DEPOIS (mais espaçamento)
.item {
  margin-bottom: 15px;        // Era 10px
  border-bottom: 2px dashed #333;
  padding-bottom: 12px;       // Era 8px
}

.info-pedido {
  margin-bottom: 18px;        // Era 12px
}

.header {
  margin-bottom: 18px;        // Era 12px
}
```

---

## 🏷️ **CENÁRIO 6: MODIFICAR CORES E DESTAQUE**

### **Situação:** 
"Quero destacar mais as observações"

### **Solução:**
```typescript
.observacao {
  font-size: ${usarImpressao50mm ? '11px' : '13px'};
  color: #000;
  margin-top: 5px;
  font-style: italic;
  font-weight: bold;
  background-color: #000000;    // Fundo preto
  color: #ffffff;               // Texto branco
  padding: 8px;                 // Mais padding
  border-left: 5px solid #ff0000; // Borda vermelha
}
```

---

## 📱 **CENÁRIO 7: AJUSTAR PARA IMPRESSORA ESPECÍFICA**

### **Situação:** 
"Minha impressora corta o texto nas bordas"

### **Solução:**
**Localização:** linha ~3422 e ~3464

```typescript
// Para 50mm
body {
  width: 1.97in !important;
  padding: 0.12in !important;  // Era 0.08in - mais padding
}

// Para 80mm  
body {
  width: 3.15in !important;
  padding: 0.20in !important;  // Era 0.15in - mais padding
}
```

---

## 🔄 **CENÁRIO 8: VOLTAR AOS TAMANHOS ORIGINAIS**

### **Situação:** 
"Fiz muitas alterações e quero voltar ao padrão"

### **Solução - Tamanhos Padrão Atuais:**
```typescript
@media print {
  .header {
    font-size: ${usarImpressao50mm ? '14pt' : '16pt'} !important;
  }
  .grupo-titulo {
    font-size: ${usarImpressao50mm ? '13pt' : '15pt'} !important;
  }
  .info-pedido {
    font-size: ${usarImpressao50mm ? '11pt' : '13pt'} !important;
  }
  .item {
    font-size: ${usarImpressao50mm ? '12pt' : '14pt'} !important;
  }
  .item-nome {
    font-size: ${usarImpressao50mm ? '13pt' : '15pt'} !important;
  }
  .item-quantidade {
    font-size: ${usarImpressao50mm ? '14pt' : '16pt'} !important;
  }
  .observacao {
    font-size: ${usarImpressao50mm ? '11pt' : '13pt'} !important;
  }
  .adicionais {
    font-size: ${usarImpressao50mm ? '11pt' : '13pt'} !important;
  }
}
```

---

## 🧪 **PROCESSO DE TESTE APÓS MODIFICAÇÕES**

### **1. Teste Rápido:**
```bash
# 1. Salvar arquivo (Ctrl+S)
# 2. Vite faz reload automático
# 3. Fazer pedido de teste
# 4. Imprimir e verificar
```

### **2. Teste Completo:**
1. **Criar pedido** com itens de diferentes grupos
2. **Imprimir** cupons de produção
3. **Verificar legibilidade** na distância real da cozinha
4. **Ajustar** se necessário
5. **Repetir** até ficar ideal

### **3. Backup das Alterações:**
```bash
# Sempre fazer backup antes de grandes mudanças
cp src/pages/dashboard/PDVPage.tsx src/pages/dashboard/PDVPage.tsx.backup
```

---

## 📊 **TABELA DE REFERÊNCIA RÁPIDA**

| Elemento | 50mm Atual | 80mm Atual | Função |
|----------|------------|------------|---------|
| `.header` | 14pt | 16pt | Título "🏭 PRODUÇÃO" |
| `.grupo-titulo` | 13pt | 15pt | Nome do grupo (ex: "COZINHA") |
| `.info-pedido` | 11pt | 13pt | Pedido, cliente, horário |
| `.item-nome` | 13pt | 15pt | Nome do produto |
| `.item-quantidade` | 14pt | 16pt | "Quantidade: X" |
| `.observacao` | 11pt | 13pt | Observações especiais |
| `.adicionais` | 11pt | 13pt | Lista de adicionais |

---

## 🚨 **DICAS IMPORTANTES**

### **✅ Boas Práticas:**
- **Sempre testar** impressão física após alterações
- **Manter proporções** entre elementos
- **Usar incrementos** de 1pt ou 2pt
- **Testar com diferentes** grupos de produção

### **❌ Evitar:**
- **Mudanças muito drásticas** de uma vez
- **Tamanhos muito pequenos** (< 10pt)
- **Tamanhos muito grandes** (> 24pt)
- **Remover propriedades** anti-scaling

### **🔧 Em Caso de Problemas:**
1. **Verificar console** do navegador para erros
2. **Recarregar página** completamente (Ctrl+F5)
3. **Voltar aos tamanhos** padrão se necessário
4. **Testar com impressora** diferente se disponível

---

**📅 Atualizado em:** Janeiro 2025  
**🎯 Objetivo:** Facilitar modificações futuras dos cupons de produção
