# 🖨️ Sistema de Impressão de Cupons - Documentação

## 📋 Visão Geral

Sistema unificado de impressão de cupons que atende tanto vendas do PDV quanto pedidos do cardápio digital, mantendo layout consistente e funcionalidades avançadas.

---

## 🏗️ Arquitetura

### **Componentes Principais:**

1. **Frontend (React/TypeScript)**
   - `src/pages/dashboard/PDVPage.tsx` - Lógica de impressão
   - `src/pages/dashboard/ConfiguracoesPage.tsx` - Configurações

2. **Backend (PHP)**
   - `backend/public/imprimir-cupom.php` - Processamento de impressão

3. **Banco de Dados**
   - `pdv_config` - Configurações de impressão
   - `cardapio_digital` - Dados dos pedidos online

---

## ⚙️ Configurações

### **Tipos de Impressão:**
- **50mm** - Papel compacto (impressoras térmicas pequenas)
- **80mm** - Papel padrão (impressoras térmicas normais)

### **Configuração no PDV:**
```typescript
interface PDVConfig {
  // Impressão automática do cardápio digital
  impressao_automatica_cardapio: boolean;
  
  // Tipos de papel
  tipo_impressao_50mm: boolean;
  tipo_impressao_80mm: boolean;
}
```

### **Interface de Configuração:**
```tsx
// Checkbox para impressão automática
<input
  type="checkbox"
  checked={pdvConfig?.impressao_automatica_cardapio || false}
  onChange={(e) => atualizarConfigCardapio('impressao_automatica_cardapio', e.target.checked)}
/>

// Seleção do tipo de papel
<input type="radio" name="tipo_impressao" value="50mm" />
<input type="radio" name="tipo_impressao" value="80mm" />
```

---

## 🔧 Implementação

### **1. Função Principal de Impressão**

```typescript
// src/pages/dashboard/PDVPage.tsx
const imprimirPedidoCardapio = async (pedido: any) => {
  try {
    // 1. Processar e enriquecer dados
    const itensEnriquecidos = itens.map(item => ({
      ...item,
      promocao: item.preco_original > item.preco_unitario,
      desconto_quantidade: item.desconto_quantidade || false
    }));

    // 2. Preparar dados para impressão
    const dadosImpressao = {
      pedido: {
        numero: pedido.numero_pedido,
        data: new Date(pedido.created_at).toLocaleString('pt-BR'),
        cliente: { nome: pedido.nome_cliente, telefone: pedido.telefone_cliente }
      },
      itens: itensEnriquecidos,
      total: pedido.valor_total,
      tipo: 'cardapio_digital'
    };

    // 3. Determinar tipo de impressão
    const usarImpressao50mm = pdvConfig?.tipo_impressao_50mm === true;
    
    // 4. Gerar e imprimir
    await gerarEImprimirCupomCardapio(dadosImpressao, usarImpressao50mm);
    
  } catch (error) {
    console.error('Erro na impressão:', error);
  }
};
```

### **2. Geração do HTML**

```typescript
const gerarEImprimirCupomCardapio = async (dadosImpressao: any, usarImpressao50mm: boolean) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { 
          font-family: 'Courier New', monospace; 
          width: ${usarImpressao50mm ? '48mm' : '78mm'};
          font-size: ${usarImpressao50mm ? '10px' : '12px'};
        }
        .header { text-align: center; font-weight: bold; }
        .item { margin-bottom: 8px; }
        .item-linha { display: flex; justify-content: space-between; }
        .preco-riscado { text-decoration: line-through; color: #666; }
        .preco-promocional { color: #22c55e; font-weight: bold; }
      </style>
    </head>
    <body>
      ${gerarConteudoCupom(dadosImpressao)}
    </body>
    </html>
  `;

  // Enviar para backend de impressão
  await enviarParaImpressao(htmlContent);
};
```

### **3. Template de Item com Promoções**

```typescript
// Renderização de item com preços riscados e indicadores
${dadosImpressao.itens.map(item => {
  const temPromocao = item.promocao || (item.preco_original && item.preco_original > item.preco_unitario);
  const temDescontoQuantidade = item.desconto_quantidade;
  
  return `
    <div class="item">
      <div class="bold">${item.produto_nome}</div>
      
      ${(() => {
        if (temPromocao && item.preco_original > item.preco_unitario) {
          return `
            <div class="item-linha">
              <span>
                ${item.quantidade} x 
                <span class="preco-riscado">${formatCurrency(item.preco_original)}</span>
                <span class="preco-promocional">${formatCurrency(item.preco_unitario)}</span>
                ${temPromocao ? '<span style="color: #22c55e;"> 🏷️PROMO</span>' : ''}
                ${temDescontoQuantidade ? '<span style="color: #3b82f6;"> 📦QTD</span>' : ''}
              </span>
              <span class="valor-monetario">${formatCurrency(item.preco_total)}</span>
            </div>
          `;
        } else {
          return `
            <div class="item-linha">
              <span>${item.quantidade} x ${formatCurrency(item.preco_unitario)}</span>
              <span class="valor-monetario">${formatCurrency(item.preco_total)}</span>
            </div>
          `;
        }
      })()}

      ${item.adicionais?.map(adicional => `
        <div style="margin-left: 15px; font-size: 10px; font-weight: bold;">
          + ${adicional.quantidade}x ${adicional.nome} - ${formatCurrency(adicional.preco * adicional.quantidade)}
        </div>
      `).join('') || ''}
      
      ${item.observacao ? `<div style="font-size: 10px; color: #666;">Obs: ${item.observacao}</div>` : ''}
    </div>
  `;
}).join('')}
```

---

## 🎨 Funcionalidades Avançadas

### **1. Preços Riscados para Promoções**
- Preço original riscado em cinza
- Preço promocional em verde
- Indicador "🏷️PROMO" para promoções

### **2. Indicadores Visuais**
- **🏷️PROMO** - Promoção tradicional
- **📦QTD** - Desconto por quantidade mínima

### **3. Adicionais Detalhados**
- Identados abaixo do produto
- Quantidade e preço individual
- Cálculo automático do total

### **4. Sabores e Observações**
- Sabores listados (para pizzas)
- Observações do cliente destacadas

---

## 🔄 Impressão Automática

### **Hook de Notificações:**
```typescript
// Monitorar novos pedidos e imprimir automaticamente
useEffect(() => {
  if (pedidosPendentes.length > 0 && pdvConfig?.impressao_automatica_cardapio) {
    pedidosPendentes.forEach(pedido => {
      if (!pedidosJaImpressos.includes(pedido.id)) {
        imprimirPedidoCardapio(pedido);
        setPedidosJaImpressos(prev => [...prev, pedido.id]);
      }
    });
  }
}, [pedidosPendentes, pdvConfig?.impressao_automatica_cardapio]);
```

### **Controle de Estado:**
```typescript
// Evitar impressões duplicadas
const [pedidosJaImpressos, setPedidosJaImpressos] = useState<string[]>([]);
```

---

## 📊 Estrutura de Dados

### **Dados de Impressão:**
```typescript
interface DadosImpressao {
  pedido: {
    numero: string;
    data: string;
    cliente: { nome: string; telefone?: string };
  };
  itens: ItemImpressao[];
  total: number;
  tipo: 'cardapio_digital' | 'cupom_nao_fiscal';
}

interface ItemImpressao {
  produto_nome: string;
  quantidade: number;
  preco_unitario: number;
  preco_original?: number;
  preco_total: number;
  promocao?: boolean;
  desconto_quantidade?: boolean;
  adicionais?: Array<{
    nome: string;
    preco: number;
    quantidade: number;
  }>;
  observacao?: string;
}
```

---

## 🚨 Troubleshooting

### **Problemas Comuns:**

1. **Impressão não funciona**
   - Verificar configuração da impressora
   - Verificar permissões do navegador
   - Testar com cupom de venda normal

2. **Layout quebrado**
   - Verificar tipo de impressão (50mm vs 80mm)
   - Ajustar CSS do template
   - Verificar encoding UTF-8

3. **Dados não aparecem**
   - Verificar parse do JSON `itens_pedido`
   - Validar campos obrigatórios
   - Conferir logs do console

### **Debug:**
```typescript
// Logs para debug
console.log('🖨️ [PRINT] Dados do pedido:', pedido);
console.log('🖨️ [PRINT] Itens processados:', itensEnriquecidos);
console.log('🖨️ [PRINT] Configuração:', pdvConfig);
```

---

## 📁 Arquivos Principais

```
src/pages/dashboard/PDVPage.tsx
├── imprimirPedidoCardapio()           # Função principal
├── gerarEImprimirCupomCardapio()      # Geração HTML
└── atualizarConfigCardapio()          # Configurações

src/pages/dashboard/ConfiguracoesPage.tsx
├── Interface de configuração
└── Salvamento no banco

backend/public/imprimir-cupom.php
└── Processamento de impressão
```

---

## ✅ Checklist de Implementação

- [ ] Configurar impressora no sistema
- [ ] Habilitar impressão automática (opcional)
- [ ] Configurar tipo de papel (50mm/80mm)
- [ ] Testar com pedido real
- [ ] Verificar layout e formatação
- [ ] Validar preços riscados
- [ ] Confirmar adicionais e observações

---

## 🎯 Exemplo de Cupom Final

```
========================================
           PEDIDO CARDÁPIO DIGITAL
========================================
Pedido: #CD-001
Data: 25/07/2025 14:30

Cliente: João Silva
Telefone: (11) 99999-9999

----------------------------------------
X-Bacon
2 x R$ 15,00 R$ 12,00 🏷️PROMO  R$ 24,00
  + 2x Bacon Extra - R$ 6,00
  + 1x Queijo Extra - R$ 2,50
Obs: Sem cebola

Pizza Grande
3 x R$ 45,00 R$ 40,00 📦QTD   R$ 120,00

----------------------------------------
TOTAL:                        R$ 152,50
========================================
```

**🎯 Sistema de impressão completo e funcional para PDV e Cardápio Digital!**
