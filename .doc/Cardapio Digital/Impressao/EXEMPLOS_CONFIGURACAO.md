# 🛠️ Exemplos de Configuração - Impressão Cardápio Digital

## 📋 Configurações Práticas

### **1. Configuração Básica no PDV**

```typescript
// src/pages/dashboard/ConfiguracoesPage.tsx
const atualizarConfigCardapio = async (field: string, value: boolean) => {
  try {
    // Atualizar estado local
    setPdvConfig(prev => ({ ...prev, [field]: value }));
    
    // Salvar no banco
    const { error } = await supabase
      .from('pdv_config')
      .update({ [field]: value })
      .eq('empresa_id', empresaData.id);
      
    if (error) throw error;
    toast.success('Configuração atualizada!');
  } catch (error) {
    console.error('Erro:', error);
    toast.error('Erro ao salvar configuração');
  }
};
```

### **2. Interface de Configuração**

```tsx
{/* Checkbox para impressão automática */}
<label className="flex items-center space-x-3">
  <input
    type="checkbox"
    checked={pdvConfig?.impressao_automatica_cardapio || false}
    onChange={(e) => atualizarConfigCardapio('impressao_automatica_cardapio', e.target.checked)}
    className="w-4 h-4 text-blue-600 rounded"
  />
  <span className="text-white">Impressão automática de pedidos</span>
</label>

{/* Seleção do tipo de impressão */}
<div className="space-y-2">
  <label className="flex items-center space-x-3">
    <input
      type="radio"
      name="tipo_impressao"
      checked={pdvConfig?.tipo_impressao_50mm === true}
      onChange={() => {
        atualizarConfigCardapio('tipo_impressao_50mm', true);
        atualizarConfigCardapio('tipo_impressao_80mm', false);
      }}
    />
    <span>Impressão 50mm (compacta)</span>
  </label>
  
  <label className="flex items-center space-x-3">
    <input
      type="radio"
      name="tipo_impressao"
      checked={pdvConfig?.tipo_impressao_80mm === true}
      onChange={() => {
        atualizarConfigCardapio('tipo_impressao_50mm', false);
        atualizarConfigCardapio('tipo_impressao_80mm', true);
      }}
    />
    <span>Impressão 80mm (padrão)</span>
  </label>
</div>
```

---

## 🎨 Templates de Impressão

### **1. Template 50mm (Compacto)**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      margin: 0;
      padding: 5px;
      width: 48mm;
    }
    .header {
      text-align: center;
      font-weight: bold;
      font-size: 12px;
      margin-bottom: 8px;
      border-bottom: 1px dashed #000;
      padding-bottom: 5px;
    }
    .item {
      margin-bottom: 6px;
      font-size: 10px;
    }
    .item-linha {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .produto-nome {
      font-weight: bold;
      margin-bottom: 2px;
    }
    .adicional {
      margin-left: 10px;
      font-size: 9px;
      color: #666;
    }
  </style>
</head>
<body>
  <!-- Conteúdo do cupom 50mm -->
</body>
</html>
```

### **2. Template 80mm (Padrão)**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      margin: 0;
      padding: 10px;
      width: 78mm;
    }
    .header {
      text-align: center;
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 10px;
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
    }
    .item {
      margin-bottom: 8px;
      font-size: 11px;
    }
    .item-linha {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .adicional {
      margin-left: 15px;
      font-size: 10px;
      color: #666;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <!-- Conteúdo do cupom 80mm -->
</body>
</html>
```

---

## 🔧 Funções Auxiliares

### **1. Formatação de Moeda**

```typescript
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};
```

### **2. Formatação de Data**

```typescript
const formatarDataHora = (dataISO: string): string => {
  return new Date(dataISO).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
```

### **3. Validação de Dados**

```typescript
const validarDadosImpressao = (dadosImpressao: any): boolean => {
  if (!dadosImpressao.pedido?.numero) {
    console.error('Número do pedido não encontrado');
    return false;
  }
  
  if (!dadosImpressao.itens || dadosImpressao.itens.length === 0) {
    console.error('Nenhum item encontrado no pedido');
    return false;
  }
  
  return true;
};
```

---

## 📊 Estruturas de Dados Completas

### **1. Dados de Impressão**

```typescript
interface DadosImpressao {
  pedido: {
    numero: string;
    data: string;
    cliente: {
      nome: string;
      telefone?: string;
    };
  };
  itens: ItemImpressao[];
  total: number;
  observacao_pedido?: string;
  tipo: 'cardapio_digital';
}

interface ItemImpressao {
  produto_nome: string;
  quantidade: number;
  preco_unitario: number;
  preco_original?: number;
  preco_total: number;
  promocao?: boolean;
  desconto_quantidade?: boolean;
  sabores?: Array<{
    nome: string;
    produto?: { nome: string };
  }>;
  adicionais?: Array<{
    nome: string;
    preco: number;
    quantidade: number;
  }>;
  observacao?: string;
}
```

### **2. Configuração PDV**

```typescript
interface PDVConfig {
  // Impressão do cardápio digital
  impressao_automatica_cardapio: boolean;
  tipo_impressao_50mm: boolean;
  tipo_impressao_80mm: boolean;
  
  // Outras configurações...
  empresa_id: string;
  usuario_id: string;
}
```

---

## 🎯 Casos de Uso Específicos

### **1. Produto com Promoção**

```typescript
// Item com preço riscado
const itemPromocao = {
  produto_nome: "X-Salada",
  quantidade: 2,
  preco_unitario: 9.00,      // Preço promocional
  preco_original: 12.00,     // Preço original (será riscado)
  preco_total: 18.00,
  promocao: true,
  desconto_quantidade: false
};

// Renderização no cupom:
// 2 x R$ 12,00 R$ 9,00 🏷️PROMO    R$ 18,00
```

### **2. Produto com Desconto por Quantidade**

```typescript
const itemDescontoQtd = {
  produto_nome: "Pizza Grande",
  quantidade: 3,
  preco_unitario: 40.00,     // Preço com desconto
  preco_original: 45.00,     // Preço sem desconto
  preco_total: 120.00,
  promocao: false,
  desconto_quantidade: true
};

// Renderização no cupom:
// 3 x R$ 45,00 R$ 40,00 📦QTD     R$ 120,00
```

### **3. Produto com Adicionais**

```typescript
const itemComAdicionais = {
  produto_nome: "X-Bacon",
  quantidade: 1,
  preco_unitario: 15.00,
  preco_total: 15.00,
  adicionais: [
    { nome: "Bacon Extra", preco: 3.00, quantidade: 2 },
    { nome: "Queijo Extra", preco: 2.50, quantidade: 1 }
  ]
};

// Renderização no cupom:
// X-Bacon                          R$ 15,00
//   + 2x Bacon Extra - R$ 6,00
//   + 1x Queijo Extra - R$ 2,50
```

---

## 🔍 Debug e Logs

### **1. Logs de Debug**

```typescript
const imprimirPedidoCardapio = async (pedido: any) => {
  console.group('🖨️ [CARDAPIO-PRINT] Iniciando impressão');
  console.log('Pedido:', pedido.numero_pedido);
  console.log('Cliente:', pedido.nome_cliente);
  console.log('Total de itens:', pedido.itens_pedido?.length || 0);
  console.log('Valor total:', pedido.valor_total);
  console.log('Configuração impressão:', {
    automatica: pdvConfig?.impressao_automatica_cardapio,
    tipo_50mm: pdvConfig?.tipo_impressao_50mm,
    tipo_80mm: pdvConfig?.tipo_impressao_80mm
  });
  
  try {
    // ... lógica de impressão
    console.log('✅ Impressão concluída com sucesso');
  } catch (error) {
    console.error('❌ Erro na impressão:', error);
  } finally {
    console.groupEnd();
  }
};
```

### **2. Validação de Configuração**

```typescript
const verificarConfiguracaoImpressao = (): boolean => {
  if (!pdvConfig) {
    console.warn('⚠️ Configuração PDV não carregada');
    return false;
  }
  
  if (!pdvConfig.tipo_impressao_50mm && !pdvConfig.tipo_impressao_80mm) {
    console.warn('⚠️ Nenhum tipo de impressão configurado');
    return false;
  }
  
  console.log('✅ Configuração de impressão válida');
  return true;
};
```

---

## 🚀 Deploy e Testes

### **1. Checklist de Deploy**

```bash
# 1. Build do projeto
npm run build

# 2. Deploy para desenvolvimento
nexo-dev

# 3. Verificar configurações no banco
# Conectar ao Supabase e verificar pdv_config

# 4. Testar impressão
# Fazer pedido no cardápio digital
# Verificar se aparece no PDV
# Testar impressão manual e automática
```

### **2. Testes Funcionais**

```typescript
// Teste 1: Impressão manual
const testeImpressaoManual = async () => {
  const pedidoTeste = {
    numero_pedido: 'TEST-001',
    nome_cliente: 'Cliente Teste',
    valor_total: 25.50,
    itens_pedido: [/* itens de teste */]
  };
  
  await imprimirPedidoCardapio(pedidoTeste);
};

// Teste 2: Configuração automática
const testeConfiguracaoAutomatica = () => {
  console.log('Configuração atual:', {
    automatica: pdvConfig?.impressao_automatica_cardapio,
    tipo: pdvConfig?.tipo_impressao_50mm ? '50mm' : '80mm'
  });
};
```

---

## 📚 Referências Técnicas

### **Arquivos Principais:**
- `src/pages/dashboard/PDVPage.tsx` - Lógica principal
- `src/pages/dashboard/ConfiguracoesPage.tsx` - Interface de configuração
- `backend/public/imprimir-cupom.php` - Backend de impressão

### **Tabelas do Banco:**
- `cardapio_digital` - Pedidos do cardápio
- `pdv_config` - Configurações do PDV

### **Hooks e Utilitários:**
- `useCardapioDigitalNotifications` - Notificações realtime
- `formatCurrency` - Formatação de moeda
- `gerarEImprimirCupomCardapio` - Geração do cupom

**🎯 Com essa documentação, qualquer desenvolvedor pode implementar, configurar e manter a impressão do cardápio digital!**
