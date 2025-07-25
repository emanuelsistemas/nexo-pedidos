# 🔧 Implementação Prática - Sistema de Impressão

## 🚀 Como Implementar do Zero

### **1. Configuração Inicial**

#### **A. Adicionar Campos no Banco**
```sql
-- Adicionar configurações de impressão na tabela pdv_config
ALTER TABLE pdv_config ADD COLUMN IF NOT EXISTS impressao_automatica_cardapio BOOLEAN DEFAULT FALSE;
ALTER TABLE pdv_config ADD COLUMN IF NOT EXISTS tipo_impressao_50mm BOOLEAN DEFAULT FALSE;
ALTER TABLE pdv_config ADD COLUMN IF NOT EXISTS tipo_impressao_80mm BOOLEAN DEFAULT TRUE;
```

#### **B. Interface de Configuração**
```tsx
// src/pages/dashboard/ConfiguracoesPage.tsx
const atualizarConfigCardapio = async (field: string, value: boolean) => {
  try {
    setPdvConfig(prev => ({ ...prev, [field]: value }));
    
    const { error } = await supabase
      .from('pdv_config')
      .update({ [field]: value })
      .eq('empresa_id', empresaData.id);
      
    if (error) throw error;
    toast.success('Configuração atualizada!');
  } catch (error) {
    toast.error('Erro ao salvar configuração');
  }
};

// Checkbox para impressão automática
<label className="flex items-center space-x-3">
  <input
    type="checkbox"
    checked={pdvConfig?.impressao_automatica_cardapio || false}
    onChange={(e) => atualizarConfigCardapio('impressao_automatica_cardapio', e.target.checked)}
  />
  <span>Impressão automática de pedidos do cardápio</span>
</label>
```

### **2. Função Principal de Impressão**

```typescript
// src/pages/dashboard/PDVPage.tsx
const imprimirPedidoCardapio = async (pedido: any) => {
  try {
    console.log('🖨️ Iniciando impressão do pedido:', pedido.numero_pedido);
    
    // 1. Processar itens do pedido
    let itens = [];
    try {
      if (typeof pedido.itens_pedido === 'string') {
        itens = JSON.parse(pedido.itens_pedido);
      } else if (Array.isArray(pedido.itens_pedido)) {
        itens = pedido.itens_pedido;
      }
    } catch (error) {
      console.error('Erro ao parsear itens:', error);
      return;
    }

    // 2. Enriquecer dados com informações de promoção
    const itensEnriquecidos = itens.map(item => {
      const precoUnitario = item.preco_unitario || item.preco || 0;
      const precoOriginal = item.preco_original || precoUnitario;
      const temPromocao = precoOriginal > precoUnitario;
      
      return {
        ...item,
        promocao: temPromocao,
        desconto_quantidade: item.desconto_quantidade || false,
        preco_original: precoOriginal,
        preco_unitario: precoUnitario
      };
    });

    // 3. Preparar dados para impressão
    const dadosImpressao = {
      pedido: {
        numero: pedido.numero_pedido,
        data: new Date(pedido.created_at).toLocaleString('pt-BR'),
        cliente: {
          nome: pedido.nome_cliente,
          telefone: pedido.telefone_cliente
        }
      },
      itens: itensEnriquecidos,
      total: pedido.valor_total,
      observacao_pedido: pedido.observacao_pedido,
      tipo: 'cardapio_digital'
    };

    // 4. Determinar tipo de impressão
    const usarImpressao50mm = pdvConfig?.tipo_impressao_50mm === true;
    
    // 5. Gerar e imprimir cupom
    await gerarEImprimirCupomCardapio(dadosImpressao, usarImpressao50mm);
    
    toast.success('Cupom impresso com sucesso!');
    
  } catch (error) {
    console.error('Erro na impressão:', error);
    toast.error('Erro ao imprimir pedido');
  }
};
```

### **3. Geração do HTML do Cupom**

```typescript
const gerarEImprimirCupomCardapio = async (dadosImpressao: any, usarImpressao50mm: boolean = false) => {
  try {
    console.log('🖨️ Gerando cupom:', usarImpressao50mm ? '50MM' : '80MM');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <style>
          body {
            font-family: 'Courier New', monospace;
            margin: 0;
            padding: ${usarImpressao50mm ? '5px' : '10px'};
            width: ${usarImpressao50mm ? '48mm' : '78mm'};
            font-size: ${usarImpressao50mm ? '10px' : '12px'};
            line-height: 1.2;
          }
          .header {
            text-align: center;
            font-weight: bold;
            font-size: ${usarImpressao50mm ? '11px' : '14px'};
            margin-bottom: 10px;
            border-bottom: 2px solid #000;
            padding-bottom: 5px;
          }
          .info-pedido {
            margin-bottom: 10px;
            font-size: ${usarImpressao50mm ? '9px' : '11px'};
          }
          .item {
            margin-bottom: 8px;
            font-size: ${usarImpressao50mm ? '9px' : '11px'};
          }
          .item-linha {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .bold { font-weight: bold; }
          .valor-monetario { font-weight: bold; }
          .total {
            border-top: 1px dashed #000;
            padding-top: 5px;
            margin-top: 10px;
            text-align: center;
            font-weight: bold;
            font-size: ${usarImpressao50mm ? '11px' : '14px'};
          }
        </style>
      </head>
      <body>
        <div class="header">
          PEDIDO CARDÁPIO DIGITAL
        </div>
        
        <div class="info-pedido">
          <div><strong>Pedido:</strong> ${dadosImpressao.pedido.numero}</div>
          <div><strong>Data:</strong> ${dadosImpressao.pedido.data}</div>
          <div><strong>Cliente:</strong> ${dadosImpressao.pedido.cliente.nome}</div>
          ${dadosImpressao.pedido.cliente.telefone ? `<div><strong>Telefone:</strong> ${dadosImpressao.pedido.cliente.telefone}</div>` : ''}
        </div>
        
        <div style="border-bottom: 1px dashed #000; margin-bottom: 10px;"></div>
        
        ${dadosImpressao.itens.map(item => {
          const temPromocao = item.promocao || (item.preco_original && item.preco_original > item.preco_unitario);
          const temDescontoQuantidade = item.desconto_quantidade;
          const precoUnitario = item.preco_unitario || item.preco || 0;
          const precoOriginal = item.preco_original || precoUnitario;
          const quantidade = item.quantidade || 1;
          const precoTotal = item.preco_total || (quantidade * precoUnitario);

          return `
            <div class="item">
              <div class="bold">${item.produto_nome || item.nome || 'Item sem nome'}</div>
              
              ${(() => {
                if (temPromocao && precoOriginal > precoUnitario) {
                  return `
                    <div class="item-linha">
                      <span>
                        ${quantidade} x 
                        <span style="text-decoration: line-through; color: #666; font-size: ${usarImpressao50mm ? '8px' : '10px'};">${formatCurrency(precoOriginal)}</span>
                        <span style="color: #22c55e; font-weight: bold;">${formatCurrency(precoUnitario)}</span>
                        ${temPromocao ? '<span style="color: #22c55e; font-size: 8px;"> 🏷️PROMO</span>' : ''}
                        ${temDescontoQuantidade ? '<span style="color: #3b82f6; font-size: 8px;"> 📦QTD</span>' : ''}
                      </span>
                      <span class="valor-monetario">${formatCurrency(precoTotal)}</span>
                    </div>
                  `;
                } else {
                  return `
                    <div class="item-linha">
                      <span>${quantidade} x ${formatCurrency(precoUnitario)}</span>
                      <span class="valor-monetario">${formatCurrency(precoTotal)}</span>
                    </div>
                  `;
                }
              })()}

              ${item.observacao ? `<div style="font-size: ${usarImpressao50mm ? '8px' : '10px'}; color: #666; margin-top: 1px;">Obs: ${item.observacao}</div>` : ''}
              
              ${item.sabores && item.sabores.length > 0 ? `
                <div style="font-size: ${usarImpressao50mm ? '8px' : '10px'}; color: #666; margin-top: 1px;">
                  Sabores: ${item.sabores.map(sabor => sabor.produto?.nome || sabor.nome || 'Sabor').join(', ')}
                </div>
              ` : ''}
              
              ${item.adicionais && item.adicionais.length > 0 ? `
                ${item.adicionais.map(adicional => `
                  <div style="margin-left: ${usarImpressao50mm ? '10px' : '15px'}; font-size: ${usarImpressao50mm ? '8px' : '10px'}; color: #666; margin-top: 1px; font-weight: bold;">
                    + ${adicional.quantidade || 1}x ${adicional.nome} - ${formatCurrency((adicional.preco || 0) * (adicional.quantidade || 1))}
                  </div>
                `).join('')}
              ` : ''}
            </div>
          `;
        }).join('')}
        
        ${dadosImpressao.observacao_pedido ? `
          <div style="margin-top: 10px; font-size: ${usarImpressao50mm ? '9px' : '11px'};">
            <strong>Observação do Pedido:</strong><br>
            ${dadosImpressao.observacao_pedido}
          </div>
        ` : ''}
        
        <div class="total">
          TOTAL: ${formatCurrency(dadosImpressao.total)}
        </div>
      </body>
      </html>
    `;

    // Enviar para impressão
    await enviarParaImpressao(htmlContent);
    
  } catch (error) {
    console.error('Erro ao gerar cupom:', error);
    throw error;
  }
};
```

### **4. Função de Envio para Impressão**

```typescript
const enviarParaImpressao = async (htmlContent: string) => {
  try {
    // Abrir nova janela para impressão
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Não foi possível abrir janela de impressão');
    }

    // Escrever conteúdo HTML
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Aguardar carregamento e imprimir
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };

  } catch (error) {
    console.error('Erro ao enviar para impressão:', error);
    throw error;
  }
};
```

### **5. Impressão Automática**

```typescript
// Hook para monitorar novos pedidos
useEffect(() => {
  if (pedidosPendentes.length > 0 && pdvConfig?.impressao_automatica_cardapio) {
    pedidosPendentes.forEach(pedido => {
      if (!pedidosJaImpressos.includes(pedido.id)) {
        console.log('🖨️ Imprimindo automaticamente:', pedido.numero_pedido);
        imprimirPedidoCardapio(pedido);
        setPedidosJaImpressos(prev => [...prev, pedido.id]);
      }
    });
  }
}, [pedidosPendentes, pdvConfig?.impressao_automatica_cardapio]);
```

---

## 🎯 Botão de Impressão Manual

```tsx
// No modal do cardápio digital
<button
  onClick={() => imprimirPedidoCardapio(pedido)}
  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs transition-colors"
  title="Imprimir cupom do pedido"
>
  🖨️ Imprimir Pedido
</button>
```

---

## 🔧 Função Auxiliar de Formatação

```typescript
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
};
```

---

## ✅ Checklist de Implementação

1. **[ ] Banco de Dados**
   - Adicionar campos na tabela `pdv_config`
   - Verificar estrutura da tabela `cardapio_digital`

2. **[ ] Configurações**
   - Implementar interface de configuração
   - Função `atualizarConfigCardapio()`

3. **[ ] Impressão**
   - Função `imprimirPedidoCardapio()`
   - Função `gerarEImprimirCupomCardapio()`
   - Função `enviarParaImpressao()`

4. **[ ] Interface**
   - Botão de impressão manual
   - Hook de impressão automática

5. **[ ] Testes**
   - Testar impressão manual
   - Testar impressão automática
   - Verificar layout 50mm e 80mm

---

## 🚨 Pontos de Atenção

1. **Parse do JSON**: Sempre validar `itens_pedido`
2. **Encoding**: Usar UTF-8 para caracteres especiais
3. **Fallbacks**: Valores padrão para campos ausentes
4. **Performance**: Evitar impressões duplicadas
5. **Logs**: Manter logs para debug

**🎯 Com essa implementação, o sistema de impressão estará completo e funcional!**
