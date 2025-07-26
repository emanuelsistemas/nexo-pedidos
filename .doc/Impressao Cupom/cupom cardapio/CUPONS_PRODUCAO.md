# 🏭 CUPONS DE PRODUÇÃO - DOCUMENTAÇÃO COMPLETA

## 📋 **VISÃO GERAL**

Os cupons de produção são impressos **automaticamente** após o cupom principal do cardápio digital, separados por **grupos de produção** (Cozinha, Chapa, Bar, etc.).

### **🎯 Características:**
- ✅ **Impressão automática** após cupom principal
- ✅ **Separação por grupos** de produção
- ✅ **Fontes grandes** para visibilidade na cozinha
- ✅ **Mesmo padrão** de janela de impressão do navegador
- ✅ **Suporte a 50mm e 80mm**

---

## 📁 **LOCALIZAÇÃO NO CÓDIGO**

### **Arquivo Principal:**
```
src/pages/dashboard/PDVPage.tsx
```

### **Funções Envolvidas:**
1. **`imprimirPedidoCardapio()`** - Função principal (linha ~3230)
2. **`imprimirCuponsProducaoPorGrupo()`** - Coordena impressão por grupos (linha ~3255)
3. **`imprimirCupomProducaoGrupo()`** - Imprime cupom de um grupo específico (linha ~3403)

---

## 🔄 **FLUXO DE IMPRESSÃO**

### **Sequência Automática:**
```
1. Cupom Principal (todos os itens)
   ↓
2. Aguarda 2 segundos
   ↓
3. Verifica grupos de produção
   ↓
4. Imprime cupom para cada grupo
   ↓ (aguarda 3 segundos entre cada)
5. Finaliza
```

### **Código do Fluxo:**
```typescript
// 1. CUPOM PRINCIPAL
await gerarEImprimirCupomCardapio(dadosImpressao, usarImpressao50mm);

// 2. AGUARDAR
await new Promise(resolve => setTimeout(resolve, 2000));

// 3. CUPONS DE PRODUÇÃO
await imprimirCuponsProducaoPorGrupo(pedido, itens, usarImpressao50mm);
```

---

## 🏗️ **ESTRUTURA DOS CUPONS DE PRODUÇÃO**

### **HTML Gerado:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    /* CSS específico para impressão térmica */
  </style>
</head>
<body>
  <div class="header">🏭 PRODUÇÃO</div>
  <div class="grupo-titulo">NOME DO GRUPO</div>
  <div class="info-pedido">
    Pedido: #000123
    Cliente: Nome do Cliente
    Horário: 14:30
  </div>
  
  <!-- ITENS DO GRUPO -->
  <div class="item">
    <div class="item-nome">NOME DO PRODUTO</div>
    <div class="item-quantidade">Quantidade: 2</div>
    <div class="observacao">Observações especiais</div>
    <div class="adicionais">• Adicional 1<br>• Adicional 2</div>
  </div>
  
  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 1000);
    };
  </script>
</body>
</html>
```

---

## 🎨 **CSS E TAMANHOS**

### **📏 Tamanhos Atuais (IDEAIS):**

#### **Para 50mm:**
- **Fonte base**: `12pt`
- **Cabeçalho**: `14pt`
- **Título do Grupo**: `13pt`
- **Info do Pedido**: `11pt`
- **Nome do Item**: `13pt` (MAIÚSCULO)
- **Quantidade**: `14pt`
- **Observações**: `11pt`
- **Adicionais**: `11pt`

#### **Para 80mm:**
- **Fonte base**: `14pt`
- **Cabeçalho**: `16pt`
- **Título do Grupo**: `15pt`
- **Info do Pedido**: `13pt`
- **Nome do Item**: `15pt` (MAIÚSCULO)
- **Quantidade**: `16pt`
- **Observações**: `13pt`
- **Adicionais**: `13pt`

### **🔧 CSS Crítico para Impressão:**
```css
@media print {
  @page {
    margin: 0;
    size: 1.97in auto; /* 50mm */ 
    /* size: 3.15in auto; para 80mm */
  }
  html {
    width: 1.97in !important;
    font-size: 12pt !important;
  }
  body {
    width: 1.97in !important;
    padding: 0.08in !important;
    font-size: 12pt !important;
    transform: scale(1) !important;
    zoom: 1 !important;
  }
  * {
    max-width: none !important;
    overflow: visible !important;
    -webkit-text-size-adjust: none !important;
    -moz-text-size-adjust: none !important;
    -ms-text-size-adjust: none !important;
  }
}
```

---

## ⚙️ **CONFIGURAÇÃO DE GRUPOS**

### **Como os Grupos São Determinados:**
Os grupos são baseados no campo `grupo_producao` dos produtos no banco de dados.

### **Grupos Comuns:**
- **Cozinha** - Pratos quentes, massas, etc.
- **Chapa** - Lanches, hambúrgueres, etc.
- **Bar** - Bebidas, sucos, etc.
- **Sobremesas** - Doces, sobremesas, etc.

### **Lógica de Agrupamento:**
```typescript
// Agrupa itens por grupo de produção
const gruposProducao = itens.reduce((grupos, item) => {
  const grupo = item.grupo_producao || 'Geral';
  if (!grupos[grupo]) {
    grupos[grupo] = [];
  }
  grupos[grupo].push(item);
  return grupos;
}, {});
```

---

## 🔧 **COMO MODIFICAR TAMANHOS**

### **📍 Localização das Configurações:**
**Arquivo:** `src/pages/dashboard/PDVPage.tsx`  
**Função:** `imprimirCupomProducaoGrupo()` (linha ~3403)

### **1. Alterar Tamanho Base:**
```typescript
// Linha ~3422 (50mm) e ~3464 (80mm)
html {
  font-size: 12pt !important; // ← ALTERAR AQUI
}
body {
  font-size: 12pt !important; // ← ALTERAR AQUI
}
```

### **2. Alterar Tamanhos Específicos:**
```typescript
// Linha ~3509 em diante
.header {
  font-size: ${usarImpressao50mm ? '14px' : '18px'}; // ← ALTERAR
}
.grupo-titulo {
  font-size: ${usarImpressao50mm ? '13px' : '16px'}; // ← ALTERAR
}
// ... outros elementos
```

### **3. Alterar Tamanhos de Impressão (MAIS IMPORTANTE):**
```typescript
// Linha ~3575 em diante - REGRAS DE IMPRESSÃO
@media print {
  .header {
    font-size: ${usarImpressao50mm ? '14pt' : '16pt'} !important; // ← ALTERAR
  }
  .grupo-titulo {
    font-size: ${usarImpressao50mm ? '13pt' : '15pt'} !important; // ← ALTERAR
  }
  // ... outros elementos
}
```

---

## 📊 **GUIA DE AJUSTES RÁPIDOS**

### **🔼 Para AUMENTAR tamanhos:**
```typescript
// Exemplo: aumentar 2pt em todos
.header { font-size: 16pt/18pt !important; } // era 14pt/16pt
.grupo-titulo { font-size: 15pt/17pt !important; } // era 13pt/15pt
.item-nome { font-size: 15pt/17pt !important; } // era 13pt/15pt
```

### **🔽 Para DIMINUIR tamanhos:**
```typescript
// Exemplo: diminuir 1pt em todos
.header { font-size: 13pt/15pt !important; } // era 14pt/16pt
.grupo-titulo { font-size: 12pt/14pt !important; } // era 13pt/15pt
.item-nome { font-size: 12pt/14pt !important; } // era 13pt/15pt
```

### **⚖️ Proporções Recomendadas:**
- **Cabeçalho**: Base + 2pt
- **Título do Grupo**: Base + 1pt
- **Nome do Item**: Base + 1pt
- **Quantidade**: Base + 2pt
- **Info/Observações**: Base - 1pt

---

## 🚨 **REGRAS IMPORTANTES**

### **✅ SEMPRE FAZER:**
1. **Usar pontos (pt)** nas regras `@media print`
2. **Manter `!important`** nas regras de impressão
3. **Testar impressão física** após alterações
4. **Manter proporções** entre elementos

### **❌ NUNCA FAZER:**
1. **Remover propriedades anti-scaling** (`transform`, `zoom`, etc.)
2. **Usar apenas pixels (px)** para impressão
3. **Alterar estrutura do `@page`**
4. **Remover `max-width: none !important`**

### **🔧 Após Alterações:**
```bash
# Salvar arquivo e testar
# O Vite faz hot reload automaticamente
```

---

## 🧪 **COMO TESTAR**

### **1. Teste Completo:**
1. Fazer pedido com itens de **diferentes grupos**
2. Clicar em **"Imprimir Pedido"**
3. Verificar se:
   - Cupom principal imprime primeiro
   - Cupons de produção imprimem em sequência
   - Tamanhos estão adequados
   - Grupos estão separados corretamente

### **2. Teste de Tamanho:**
1. Imprimir cupom de produção
2. Verificar legibilidade na **distância da chapa**
3. Ajustar se necessário

### **3. Configurações de Impressora:**
- **Tamanho do papel**: 50mm ou 80mm
- **Escala**: 100% ou "Tamanho real"
- **Margens**: Nenhuma ou Mínimas
- **Desmarcar "Ajustar à página"**

---

## 📚 **REFERÊNCIAS TÉCNICAS**

### **Conversões de Unidades:**
- **50mm = 1.97 polegadas**
- **80mm = 3.15 polegadas**
- **1pt = 1/72 polegadas**

### **Propriedades CSS Críticas:**
- **`@page { size: 3.15in auto; }`** - Define tamanho da página
- **`transform: scale(1) !important`** - Previne scaling automático
- **`-webkit-text-size-adjust: none`** - Força tamanho fixo
- **`max-width: none !important`** - Previne redimensionamento

---

**📅 Documentado em:** Janeiro 2025  
**✅ Status:** Implementado e funcionando  
**🎯 Resultado:** Cupons de produção com tamanhos ideais para cozinha
