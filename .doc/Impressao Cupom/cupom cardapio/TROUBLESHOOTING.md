# 🚨 TROUBLESHOOTING - CUPONS DE PRODUÇÃO

## 📋 **PROBLEMAS COMUNS E SOLUÇÕES**

Este documento contém soluções para os problemas mais frequentes com os cupons de produção.

---

## ❌ **PROBLEMA 1: TAMANHOS NÃO ALTERAM NA IMPRESSÃO**

### **Sintomas:**
- Alterações aparecem na tela de impressão
- Mas na impressão física o tamanho continua igual
- CSS parece não ter efeito

### **✅ Solução:**
**Causa:** Usando pixels (px) ao invés de pontos (pt) nas regras de impressão.

```typescript
// ❌ ERRADO
@media print {
  .header {
    font-size: 16px !important; // Pixels não funcionam bem
  }
}

// ✅ CORRETO
@media print {
  .header {
    font-size: 16pt !important; // Pontos funcionam na impressão
  }
}
```

**Verificar também:**
- Se as regras estão dentro de `@media print`
- Se tem `!important` nas regras
- Se não há CSS conflitante

---

## ❌ **PROBLEMA 2: CUPONS NÃO IMPRIMEM AUTOMATICAMENTE**

### **Sintomas:**
- Cupom principal imprime
- Cupons de produção não aparecem
- Sem erros visíveis

### **✅ Solução:**
**Verificar no console do navegador (F12):**

```javascript
// Procurar por estas mensagens:
"🖨️ [CARDAPIO-PRINT] Iniciando verificação de cupons de produção..."
"🏭 [PRODUCAO-PRINT] ===== INICIANDO VERIFICAÇÃO DE PRODUÇÃO ====="
```

**Possíveis causas:**
1. **Produtos sem grupo de produção**
2. **Bloqueador de pop-ups ativo**
3. **Erro na função de agrupamento**

**Soluções:**
```sql
-- 1. Verificar produtos sem grupo
SELECT nome, grupo_producao FROM produtos WHERE grupo_producao IS NULL;

-- 2. Atualizar produtos sem grupo
UPDATE produtos SET grupo_producao = 'Geral' WHERE grupo_producao IS NULL;
```

---

## ❌ **PROBLEMA 3: ABRE EM NOVA ABA AO INVÉS DE IMPRIMIR**

### **Sintomas:**
- Cupons abrem em nova aba com preview
- Não abre janela de impressão do navegador

### **✅ Solução:**
**Verificar se o script de impressão está correto:**

```typescript
// ✅ CORRETO - deve ter este script no HTML
const htmlComScript = htmlContent.replace(
  '</body>',
  `
    <script>
      window.onload = function() {
        window.print();
        setTimeout(function() {
          window.close();
        }, 1000);
      };
    </script>
  </body>`
);

// ✅ CORRETO - deve usar este padrão de abertura
const janelaImpressao = window.open('', '_blank', 'width=400,height=600');
janelaImpressao.document.write(htmlComScript);
janelaImpressao.document.close();
```

---

## ❌ **PROBLEMA 4: IMPRESSÃO CORTADA NAS BORDAS**

### **Sintomas:**
- Texto cortado nas laterais
- Conteúdo não cabe na largura do papel

### **✅ Solução:**
**Aumentar padding e verificar largura:**

```typescript
// Para 50mm
@media print {
  body {
    width: 1.97in !important;
    padding: 0.12in !important; // Aumentar de 0.08in
  }
}

// Para 80mm
@media print {
  body {
    width: 3.15in !important;
    padding: 0.20in !important; // Aumentar de 0.15in
  }
}
```

**Verificar configurações da impressora:**
- Margens: Nenhuma ou Mínimas
- Escala: 100% ou "Tamanho real"
- Desmarcar "Ajustar à página"

---

## ❌ **PROBLEMA 5: GRUPOS DUPLICADOS OU FALTANDO**

### **Sintomas:**
- Mesmo grupo imprime múltiplas vezes
- Alguns grupos não aparecem

### **✅ Solução:**
**Verificar lógica de agrupamento:**

```typescript
// Localizar esta função e verificar se está correta
const gruposProducao = itens.reduce((grupos, item) => {
  const grupo = item.grupo_producao || 'Geral';
  if (!grupos[grupo]) {
    grupos[grupo] = [];
  }
  grupos[grupo].push(item);
  return grupos;
}, {});
```

**Debug no console:**
```javascript
console.log('Grupos encontrados:', Object.keys(gruposProducao));
console.log('Itens por grupo:', gruposProducao);
```

---

## ❌ **PROBLEMA 6: ERRO "BLOQUEADOR DE POP-UPS"**

### **Sintomas:**
- Mensagem de erro sobre pop-ups
- Cupons não abrem

### **✅ Solução:**
**Configurar navegador:**
1. **Chrome:** Configurações → Privacidade → Pop-ups → Permitir para o site
2. **Firefox:** Configurações → Privacidade → Bloqueador de pop-ups → Exceções
3. **Edge:** Configurações → Cookies → Pop-ups → Permitir

**Verificar código:**
```typescript
const janelaImpressao = window.open('', '_blank', 'width=400,height=600');
if (!janelaImpressao) {
  // Esta mensagem deve aparecer se pop-ups estão bloqueados
  throw new Error('Não foi possível abrir janela de impressão...');
}
```

---

## ❌ **PROBLEMA 7: DEMORA ENTRE CUPONS**

### **Sintomas:**
- Muito tempo entre impressões
- Sistema parece travado

### **✅ Solução:**
**Ajustar tempos de espera:**

```typescript
// Localizar estas linhas e ajustar se necessário
await new Promise(resolve => setTimeout(resolve, 2000)); // Entre cupom principal e produção
await new Promise(resolve => setTimeout(resolve, 3000)); // Entre cupons de produção

// Reduzir para:
await new Promise(resolve => setTimeout(resolve, 1000)); // 1 segundo
await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 segundos
```

---

## ❌ **PROBLEMA 8: FONTES MUITO PEQUENAS MESMO COM PT**

### **Sintomas:**
- Usando pontos (pt) mas ainda pequeno
- Impressora específica não respeita tamanhos

### **✅ Solução:**
**Forçar tamanho base maior:**

```typescript
// Aumentar font-size base do HTML
html {
  font-size: 16pt !important; // Era 12pt ou 14pt
}
body {
  font-size: 16pt !important; // Era 12pt ou 14pt
}

// E aumentar todos os elementos proporcionalmente
.header {
  font-size: ${usarImpressao50mm ? '18pt' : '22pt'} !important;
}
```

---

## ❌ **PROBLEMA 9: LAYOUT QUEBRADO**

### **Sintomas:**
- Elementos sobrepostos
- Texto cortado verticalmente
- Layout desorganizado

### **✅ Solução:**
**Verificar propriedades anti-scaling:**

```typescript
@media print {
  * {
    max-width: none !important;
    overflow: visible !important;
    -webkit-text-size-adjust: none !important;
    -moz-text-size-adjust: none !important;
    -ms-text-size-adjust: none !important;
  }
  body {
    transform: scale(1) !important;
    zoom: 1 !important;
  }
}
```

---

## ❌ **PROBLEMA 10: ERRO NO CONSOLE**

### **Sintomas:**
- Erros JavaScript no console
- Cupons param de funcionar

### **✅ Soluções por Tipo de Erro:**

**Erro: "Cannot read property of undefined"**
```typescript
// Verificar se dados existem antes de usar
${dadosImpressao.cliente?.nome || 'Cliente não informado'}
${item.grupo_producao || 'Geral'}
```

**Erro: "window.open blocked"**
```typescript
// Verificar se janela foi criada
const janela = window.open('', '_blank', 'width=400,height=600');
if (!janela) {
  console.error('Pop-up bloqueado');
  return;
}
```

**Erro: "Promise rejected"**
```typescript
// Adicionar try/catch
try {
  await imprimirCupomProducaoGrupo(pedido, grupoData, usarImpressao50mm);
} catch (error) {
  console.error('Erro ao imprimir grupo:', error);
  // Continuar com próximo grupo
}
```

---

## 🔧 **FERRAMENTAS DE DEBUG**

### **1. Console Logs Úteis:**
```typescript
// Adicionar temporariamente para debug
console.log('🏭 Grupos encontrados:', Object.keys(gruposProducao));
console.log('🏭 Itens do grupo:', grupoData.itens);
console.log('🏭 HTML gerado:', htmlContent.substring(0, 200));
```

### **2. Teste Manual:**
```javascript
// No console do navegador
window.open('', '_blank', 'width=400,height=600'); // Testa pop-ups
```

### **3. Verificar Configuração:**
```sql
-- No banco de dados
SELECT DISTINCT grupo_producao FROM produtos WHERE grupo_producao IS NOT NULL;
```

---

## 📞 **QUANDO PEDIR AJUDA**

### **Informações para Fornecer:**
1. **Erro específico** (screenshot do console)
2. **Navegador e versão** utilizada
3. **Tipo de impressora** (50mm/80mm)
4. **Configurações** de impressão
5. **Passos** para reproduzir o problema

### **Logs Importantes:**
```
🖨️ [CARDAPIO-PRINT] - Logs do cupom principal
🏭 [PRODUCAO-PRINT] - Logs dos cupons de produção
🖨️ [GRUPO-PRINT] - Logs de grupos específicos
```

---

**📅 Atualizado em:** Janeiro 2025  
**🎯 Objetivo:** Resolver problemas rapidamente sem perder tempo
