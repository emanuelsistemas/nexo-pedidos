# 🚨 Troubleshooting - Impressão Cardápio Digital

## 🔍 Problemas Comuns e Soluções

### **1. Impressão Não Funciona**

#### **Sintomas:**
- Botão "Imprimir" não responde
- Erro no console do navegador
- Impressora não imprime

#### **Diagnóstico:**
```typescript
// Verificar no console do navegador
console.log('Configuração PDV:', pdvConfig);
console.log('Dados do pedido:', pedido);
console.log('Função de impressão disponível:', typeof imprimirPedidoCardapio);
```

#### **Soluções:**

**A. Verificar Configuração da Impressora**
```bash
# Windows - Verificar impressoras instaladas
wmic printer list brief

# Linux - Verificar CUPS
lpstat -p -d
```

**B. Verificar Permissões do Navegador**
- Acessar configurações do navegador
- Permitir pop-ups para o domínio
- Habilitar impressão automática

**C. Verificar Configuração no Banco**
```sql
-- Verificar configurações da empresa
SELECT 
  impressao_automatica_cardapio,
  tipo_impressao_50mm,
  tipo_impressao_80mm
FROM pdv_config 
WHERE empresa_id = 'sua_empresa_id';
```

---

### **2. Layout Quebrado no Cupom**

#### **Sintomas:**
- Texto cortado ou sobreposto
- Formatação incorreta
- Caracteres especiais não aparecem

#### **Diagnóstico:**
```typescript
// Verificar tipo de impressão configurado
const tipoImpressao = pdvConfig?.tipo_impressao_50mm ? '50mm' : '80mm';
console.log('Tipo de impressão:', tipoImpressao);

// Verificar dados dos itens
console.log('Itens para impressão:', dadosImpressao.itens);
```

#### **Soluções:**

**A. Ajustar CSS para 50mm**
```css
/* Para impressão 50mm */
body {
  width: 48mm;
  font-size: 10px;
  padding: 3px;
}

.item-linha {
  font-size: 9px;
  line-height: 1.2;
}

.adicional {
  font-size: 8px;
  margin-left: 8px;
}
```

**B. Ajustar CSS para 80mm**
```css
/* Para impressão 80mm */
body {
  width: 78mm;
  font-size: 12px;
  padding: 10px;
}

.item-linha {
  font-size: 11px;
  line-height: 1.4;
}

.adicional {
  font-size: 10px;
  margin-left: 15px;
}
```

**C. Corrigir Encoding**
```html
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
```

---

### **3. Dados Não Aparecem no Cupom**

#### **Sintomas:**
- Cupom imprime em branco
- Faltam informações do pedido
- Preços não aparecem

#### **Diagnóstico:**
```typescript
// Verificar estrutura dos dados
console.log('Dados completos:', JSON.stringify(dadosImpressao, null, 2));

// Verificar itens processados
dadosImpressao.itens.forEach((item, index) => {
  console.log(`Item ${index + 1}:`, {
    nome: item.produto_nome,
    quantidade: item.quantidade,
    preco: item.preco_unitario,
    total: item.preco_total
  });
});
```

#### **Soluções:**

**A. Verificar Parse do JSON**
```typescript
// Corrigir parse dos itens_pedido
let itens = [];
try {
  if (typeof pedido.itens_pedido === 'string') {
    itens = JSON.parse(pedido.itens_pedido);
  } else if (Array.isArray(pedido.itens_pedido)) {
    itens = pedido.itens_pedido;
  }
} catch (error) {
  console.error('Erro ao parsear itens:', error);
  itens = [];
}
```

**B. Validar Campos Obrigatórios**
```typescript
const validarItem = (item: any): boolean => {
  const camposObrigatorios = ['produto_nome', 'quantidade', 'preco_unitario'];
  
  for (const campo of camposObrigatorios) {
    if (!item[campo]) {
      console.error(`Campo obrigatório ausente: ${campo}`, item);
      return false;
    }
  }
  
  return true;
};
```

**C. Fallbacks para Dados Ausentes**
```typescript
const item = {
  produto_nome: item.produto_nome || item.nome || 'Produto sem nome',
  quantidade: item.quantidade || 1,
  preco_unitario: item.preco_unitario || item.preco || 0,
  preco_total: item.preco_total || (item.quantidade * item.preco_unitario)
};
```

---

### **4. Impressão Automática Não Funciona**

#### **Sintomas:**
- Pedidos chegam mas não imprimem automaticamente
- Configuração habilitada mas não funciona

#### **Diagnóstico:**
```typescript
// Verificar hook de notificações
useEffect(() => {
  console.log('Pedidos pendentes:', pedidosPendentes.length);
  console.log('Impressão automática:', pdvConfig?.impressao_automatica_cardapio);
  console.log('Pedidos já impressos:', pedidosJaImpressos);
}, [pedidosPendentes, pdvConfig]);
```

#### **Soluções:**

**A. Verificar Estado dos Pedidos**
```typescript
// Garantir que pedidos não sejam impressos múltiplas vezes
const [pedidosJaImpressos, setPedidosJaImpressos] = useState<string[]>([]);

useEffect(() => {
  if (pedidosPendentes.length > 0 && pdvConfig?.impressao_automatica_cardapio) {
    pedidosPendentes.forEach(pedido => {
      if (!pedidosJaImpressos.includes(pedido.id)) {
        console.log('Imprimindo automaticamente:', pedido.numero_pedido);
        imprimirPedidoCardapio(pedido);
        setPedidosJaImpressos(prev => [...prev, pedido.id]);
      }
    });
  }
}, [pedidosPendentes, pdvConfig?.impressao_automatica_cardapio]);
```

**B. Verificar Realtime Subscription**
```typescript
// Verificar se as notificações estão chegando
const { pedidosPendentes } = useCardapioDigitalNotifications({
  empresaId: empresaData?.id || '',
  enabled: !!empresaData?.id
});

// Debug das notificações
useEffect(() => {
  console.log('Notificações ativas:', !!empresaData?.id);
  console.log('Empresa ID:', empresaData?.id);
}, [empresaData]);
```

---

### **5. Preços Riscados Não Aparecem**

#### **Sintomas:**
- Promoções não mostram preço original riscado
- Indicadores 🏷️PROMO não aparecem

#### **Diagnóstico:**
```typescript
// Verificar dados de promoção
itens.forEach(item => {
  console.log('Item:', item.produto_nome, {
    preco_unitario: item.preco_unitario,
    preco_original: item.preco_original,
    promocao: item.promocao,
    tem_promocao: item.preco_original > item.preco_unitario
  });
});
```

#### **Soluções:**

**A. Enriquecer Dados Corretamente**
```typescript
const itensEnriquecidos = itens.map(item => {
  const precoUnitario = item.preco_unitario || item.preco || 0;
  const precoOriginal = item.preco_original || precoUnitario;
  const temPromocao = precoOriginal > precoUnitario;
  
  return {
    ...item,
    promocao: temPromocao,
    preco_original: precoOriginal,
    preco_unitario: precoUnitario
  };
});
```

**B. Verificar Template HTML**
```typescript
// Template para preços riscados
${(() => {
  if (temPromocao && precoOriginal > precoUnitario) {
    return `
      <span>
        ${quantidade} x 
        <span style="text-decoration: line-through; color: #666;">${formatCurrency(precoOriginal)}</span>
        <span style="color: #22c55e; font-weight: bold;">${formatCurrency(precoUnitario)}</span>
        <span style="color: #22c55e; font-size: 9px;"> 🏷️PROMO</span>
      </span>
    `;
  } else {
    return `<span>${quantidade} x ${formatCurrency(precoUnitario)}</span>`;
  }
})()}
```

---

### **6. Adicionais Não Aparecem**

#### **Sintomas:**
- Adicionais selecionados não são impressos
- Formatação dos adicionais incorreta

#### **Diagnóstico:**
```typescript
// Verificar estrutura dos adicionais
item.adicionais?.forEach((adicional, index) => {
  console.log(`Adicional ${index + 1}:`, {
    nome: adicional.nome,
    preco: adicional.preco,
    quantidade: adicional.quantidade
  });
});
```

#### **Soluções:**

**A. Validar Estrutura dos Adicionais**
```typescript
const adicionaisValidos = (item.adicionais || []).filter(adicional => 
  adicional.nome && 
  adicional.preco !== undefined && 
  adicional.quantidade > 0
);
```

**B. Template Correto para Adicionais**
```typescript
${item.adicionais && item.adicionais.length > 0 ? `
  ${item.adicionais.map(adicional => `
    <div style="margin-left: 15px; font-size: 10px; color: #666; font-weight: bold;">
      + ${adicional.quantidade || 1}x ${adicional.nome} - ${formatCurrency((adicional.preco || 0) * (adicional.quantidade || 1))}
    </div>
  `).join('')}
` : ''}
```

---

### **7. Erro "obterTotalFinal is not defined"**

#### **Sintomas:**
- Erro no console ao clicar em forma de pagamento
- Aplicação quebra na finalização

#### **Solução:**
```typescript
// Adicionar função obterTotalFinal
const obterTotalFinal = () => {
  const totalProdutos = obterTotalCarrinho();
  const taxaEntrega = (tipoEntregaSelecionado === 'entrega' && calculoTaxa?.valor) ? calculoTaxa.valor : 0;
  const descontoCupom = calcularDescontoCupom();
  return totalProdutos + taxaEntrega - descontoCupom;
};
```

---

## 🔧 Ferramentas de Debug

### **1. Console de Debug Completo**

```typescript
const debugImpressao = (pedido: any, dadosImpressao: any) => {
  console.group('🔍 DEBUG IMPRESSÃO CARDÁPIO');
  
  console.log('📋 Pedido Original:', pedido);
  console.log('🖨️ Dados para Impressão:', dadosImpressao);
  console.log('⚙️ Configuração PDV:', pdvConfig);
  console.log('📏 Tipo de Impressão:', pdvConfig?.tipo_impressao_50mm ? '50mm' : '80mm');
  
  // Validar cada item
  dadosImpressao.itens?.forEach((item, index) => {
    console.group(`📦 Item ${index + 1}: ${item.produto_nome}`);
    console.log('Quantidade:', item.quantidade);
    console.log('Preço Unitário:', item.preco_unitario);
    console.log('Preço Original:', item.preco_original);
    console.log('Tem Promoção:', item.promocao);
    console.log('Adicionais:', item.adicionais?.length || 0);
    console.groupEnd();
  });
  
  console.groupEnd();
};
```

### **2. Validador de Configuração**

```typescript
const validarConfiguracao = (): string[] => {
  const erros: string[] = [];
  
  if (!pdvConfig) {
    erros.push('Configuração PDV não carregada');
  }
  
  if (!pdvConfig?.tipo_impressao_50mm && !pdvConfig?.tipo_impressao_80mm) {
    erros.push('Nenhum tipo de impressão configurado');
  }
  
  if (pdvConfig?.impressao_automatica_cardapio && !empresaData?.id) {
    erros.push('Empresa não identificada para impressão automática');
  }
  
  return erros;
};
```

---

## 📞 Suporte e Contato

### **Para Problemas Técnicos:**
1. Verificar logs do console do navegador
2. Testar com cupom de venda normal
3. Verificar configurações no banco de dados
4. Consultar esta documentação

### **Logs Importantes:**
- `🖨️ [CARDAPIO-PRINT]` - Logs de impressão
- `🔍 [DEBUG]` - Logs de debug
- `⚠️` - Avisos de configuração
- `❌` - Erros críticos

**🎯 Com essas soluções, 99% dos problemas de impressão podem ser resolvidos!**
