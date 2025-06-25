# 🖨️ GUIA DE ALTERAÇÃO DOS CUPONS DE IMPRESSÃO

## 📋 **VISÃO GERAL**

Este documento orienta como alterar as informações dos cupoms de impressão no sistema Nexo Pedidos.

### **🎯 Cupons Disponíveis:**
1. **Cupom "Finalizar com Impressão"** (Não Fiscal)
2. **Cupom "NFC-e com Impressão"** (Fiscal)

### **📁 Arquivo Principal:**
- **Local**: `src/pages/dashboard/PDVPage.tsx`
- **Funções**: `gerarEImprimirCupom()` e `gerarEImprimirCupomNfce()`

---

## 🧾 **CUPOM "FINALIZAR COM IMPRESSÃO" (NÃO FISCAL)**

### **📍 Localização da Função:**
```typescript
// Linha aproximada: 6020-6243
const gerarEImprimirCupom = async (dadosImpressao: any) => {
```

### **🏗️ Estrutura do HTML:**
```html
<!DOCTYPE html>
<html>
<head>
  <!-- CSS com técnicas de impressão térmica -->
</head>
<body>
  <!-- CABEÇALHO DA EMPRESA -->
  <!-- DADOS DA VENDA -->
  <!-- CLIENTE/VENDEDOR/OPERADOR -->
  <!-- ITENS -->
  <!-- TOTAL E PAGAMENTOS -->
  <!-- RODAPÉ -->
</body>
</html>
```

### **🔧 Seções Editáveis:**

#### **1. Cabeçalho da Empresa:**
```typescript
// Localização: Dentro do HTML do cupom
<div class="center">
  ${pdvConfig?.mostrar_razao_social_cupom_finalizar ? 
    `<div class="bold">${dadosImpressao.empresa.razao_social}</div>` : ''}
  ${dadosImpressao.empresa.nome_fantasia ? 
    `<div class="bold">${dadosImpressao.empresa.nome_fantasia}</div>` : ''}
  <div>CNPJ: ${dadosImpressao.empresa.cnpj}</div>
  <!-- IE foi removida intencionalmente -->
  ${pdvConfig?.mostrar_endereco_cupom_finalizar ? `
    <div>${dadosImpressao.empresa.endereco}</div>
    <div>${dadosImpressao.empresa.bairro} - ${dadosImpressao.empresa.cidade}/${dadosImpressao.empresa.uf}</div>
    <div>CEP: ${dadosImpressao.empresa.cep}</div>
  ` : ''}
  ${dadosImpressao.empresa.telefone ? `<div>Tel: ${dadosImpressao.empresa.telefone}</div>` : ''}
</div>
```

#### **2. Dados da Venda:**
```typescript
<div class="center bold">CUPOM NÃO FISCAL</div>
<div class="center">Venda: ${dadosImpressao.venda.numero}</div>
<div class="center">${dadosImpressao.venda.data}</div>
```

#### **3. Cliente/Vendedor/Operador:**
```typescript
// Cliente (configurável)
${dadosImpressao.cliente?.nome_cliente && pdvConfig?.seleciona_clientes ? `
  <div class="center">
    <div class="bold">CLIENTE: ${dadosImpressao.cliente.nome_cliente}</div>
    ${dadosImpressao.cliente.documento_cliente ? `<div>Doc: ${dadosImpressao.cliente.documento_cliente}</div>` : ''}
  </div>
` : ''}

// Vendedor (suporte a múltiplos)
${pdvConfig?.vendedor ? `
  ${(() => {
    if (dadosImpressao.vendedores && dadosImpressao.vendedores.length > 1) {
      const nomesVendedores = dadosImpressao.vendedores.map(v => v.nome).join(' / ');
      return `<div class="center"><div class="bold">VENDEDORES: ${nomesVendedores}</div></div>`;
    } else if (dadosImpressao.vendedor?.nome) {
      return `<div class="center"><div class="bold">VENDEDOR: ${dadosImpressao.vendedor.nome}</div></div>`;
    }
    return '';
  })()}
` : ''}

// Operador (configurável)
${dadosImpressao.operador?.nome && pdvConfig?.mostrar_operador_cupom_finalizar ? `
  <div class="center">
    <div class="bold">OPERADOR: ${dadosImpressao.operador.nome}</div>
  </div>
` : ''}
```

#### **4. Lista de Itens:**
```typescript
${dadosImpressao.itens.map(item => `
  <div class="item">
    <div>${item.nome}</div>
    <div class="item-linha">
      <span>${item.quantidade} x ${formatCurrency(item.valor_unitario)}</span>
      <span>${formatCurrency(item.valor_total)}</span>
    </div>
    ${(() => {
      // Vendedor por item (apenas se múltiplos vendedores)
      if (dadosImpressao.vendedores && dadosImpressao.vendedores.length > 1 && item.vendedor_nome) {
        return `<div style="font-size: 10px; color: #666; margin-top: 2px;">Vendedor: ${item.vendedor_nome}</div>`;
      }
      return '';
    })()}
  </div>
`).join('')}
```

#### **5. Total e Pagamentos:**
```typescript
// Desconto (se houver)
${dadosImpressao.venda.valor_desconto > 0 ? `
  <div class="item-linha">
    <span>Subtotal:</span>
    <span>${formatCurrency(dadosImpressao.venda.valor_subtotal)}</span>
  </div>
  <div class="item-linha">
    <span>Desconto:</span>
    <span>-${formatCurrency(dadosImpressao.venda.valor_desconto)}</span>
  </div>
` : ''}

// Total (destacado)
<div class="item-linha bold" style="font-size: 14px; margin: 5px 0;">
  <span>TOTAL:</span>
  <span>${formatCurrency(dadosImpressao.venda.valor_total)}</span>
</div>

// Formas de pagamento
${dadosImpressao.pagamento ? `
  <!-- Pagamento à vista -->
  ${dadosImpressao.pagamento.tipo_pagamento === 'vista' ? `...` : ''}
  
  <!-- Pagamento parcial -->
  ${dadosImpressao.pagamento.tipo_pagamento === 'parcial' ? `...` : ''}
  
  <!-- Troco -->
  ${dadosImpressao.pagamento.valor_troco > 0 ? `
    <div class="item-linha bold" style="margin-top: 3px;">
      <span>TROCO:</span>
      <span>${formatCurrency(dadosImpressao.pagamento.valor_troco)}</span>
    </div>
  ` : ''}
` : ''}
```

#### **6. Rodapé:**
```typescript
<div class="center">
  <div>${pdvConfig?.rodape_personalizado || 'Obrigado pela preferencia volte sempre!'}</div>
</div>
```

---

## 📄 **CUPOM "NFC-e COM IMPRESSÃO" (FISCAL)**

### **📍 Localização da Função:**
```typescript
// Linha aproximada: 5792-6039
const gerarEImprimirCupomNfce = async (dadosImpressao: any) => {
```

### **🏗️ Estrutura do HTML:**
```html
<!DOCTYPE html>
<html>
<head>
  <!-- CSS com técnicas de impressão térmica -->
</head>
<body>
  <!-- CABEÇALHO DA EMPRESA (COMPLETO) -->
  <!-- DADOS DA NFC-e -->
  <!-- CLIENTE/VENDEDOR -->
  <!-- ITENS -->
  <!-- TOTAL E PAGAMENTOS -->
  <!-- INFORMAÇÕES FISCAIS -->
  <!-- RODAPÉ -->
</body>
</html>
```

### **🔧 Seções Editáveis:**

#### **1. Cabeçalho da Empresa (Sempre Completo):**
```typescript
<div class="center">
  <div class="bold">${dadosImpressao.empresa.razao_social}</div>
  ${dadosImpressao.empresa.nome_fantasia ? `<div class="bold">${dadosImpressao.empresa.nome_fantasia}</div>` : ''}
  <div>CNPJ: ${dadosImpressao.empresa.cnpj}</div>
  <div>IE: ${dadosImpressao.empresa.inscricao_estadual}</div>
  <div>${dadosImpressao.empresa.endereco}</div>
  <div>${dadosImpressao.empresa.bairro} - ${dadosImpressao.empresa.cidade}/${dadosImpressao.empresa.uf}</div>
  <div>CEP: ${dadosImpressao.empresa.cep}</div>
  ${dadosImpressao.empresa.telefone ? `<div>Tel: ${dadosImpressao.empresa.telefone}</div>` : ''}
</div>
```

#### **2. Dados da NFC-e:**
```typescript
<div class="center bold">NOTA FISCAL DE CONSUMIDOR ELETRÔNICA</div>
<div class="center bold">NFC-e</div>
<div class="center">Venda: ${dadosImpressao.venda.numero}</div>
<div class="center">${dadosImpressao.venda.data}</div>
```

#### **3. Cliente/Vendedor (Sempre Visível se Existir):**
```typescript
${dadosImpressao.cliente?.nome_cliente || dadosImpressao.vendedor?.nome ? `
  <div class="linha"></div>
  
  <!-- Cliente -->
  ${dadosImpressao.cliente?.nome_cliente ? `
    <div class="center">
      <div class="bold">CLIENTE: ${dadosImpressao.cliente.nome_cliente}</div>
      ${dadosImpressao.cliente.documento_cliente ? `<div>Doc: ${dadosImpressao.cliente.documento_cliente}</div>` : ''}
    </div>
  ` : ''}
  
  <!-- Vendedor (suporte a múltiplos) -->
  ${(() => {
    if (dadosImpressao.vendedores && dadosImpressao.vendedores.length > 1) {
      const nomesVendedores = dadosImpressao.vendedores.map(v => v.nome).join(' / ');
      return `<div class="center"><div class="bold">VENDEDORES: ${nomesVendedores}</div></div>`;
    } else if (dadosImpressao.vendedor?.nome) {
      return `<div class="center"><div class="bold">VENDEDOR: ${dadosImpressao.vendedor.nome}</div></div>`;
    }
    return '';
  })()}
` : ''}
```

#### **4. Lista de Itens (Igual ao Não Fiscal):**
```typescript
${dadosImpressao.itens.map(item => `
  <div class="item">
    <div>${item.nome}</div>
    <div class="item-linha">
      <span>${item.quantidade} x ${formatCurrency(item.valor_unitario)}</span>
      <span>${formatCurrency(item.valor_total)}</span>
    </div>
    ${(() => {
      if (dadosImpressao.vendedores && dadosImpressao.vendedores.length > 1 && item.vendedor_nome) {
        return `<div style="font-size: 10px; color: #666; margin-top: 2px;">Vendedor: ${item.vendedor_nome}</div>`;
      }
      return '';
    })()}
  </div>
`).join('')}
```

#### **5. Total e Pagamentos (Igual ao Não Fiscal):**
```typescript
// Mesmo código do cupom não fiscal
```

#### **6. Informações Fiscais:**
```typescript
<div class="center">
  <div class="bold">INFORMAÇÕES FISCAIS</div>
  <div>Documento autorizado pela SEFAZ</div>
  
  <!-- Chave de Acesso -->
  ${dadosImpressao.venda.chave_nfe ? `
    <div class="chave">
      <div>Chave de Acesso:</div>
      <div>${formatarChaveNfe(dadosImpressao.venda.chave_nfe)}</div>
    </div>
  ` : ''}

  <!-- QR Code -->
  ${dadosImpressao.venda.chave_nfe ? `
    <div style="margin: 10px 0;">
      <div>Consulte pela chave de acesso em:</div>
      <div style="font-size: 10px;">www.nfce.fazenda.gov.br</div>
      <div style="margin: 5px 0;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(dadosImpressao.venda.chave_nfe)}"
             alt="QR Code NFC-e"
             style="width: 120px; height: 120px; margin: 5px auto; display: block;">
      </div>
      <div style="font-size: 10px;">Escaneie o QR Code para consultar a NFC-e</div>
    </div>
  ` : ''}
</div>
```

---

## 🎨 **CSS PARA IMPRESSÃO TÉRMICA**

### **📍 Localização:**
Dentro do `<style>` de cada função de impressão.

### **🔧 Técnicas Aplicadas:**
```css
body {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  font-weight: 500; /* Medium - peso intermediário */
  color: #000000; /* Preto absoluto para máximo contraste */
  text-shadow: 0.3px 0 0 currentColor; /* Técnica para impressão térmica */
  line-height: 1.2;
  letter-spacing: 0.2px; /* Melhor legibilidade */
  margin: 10px;
}

.bold { 
  font-weight: 900; /* Extra bold para diferenciação */
}

.center { 
  text-align: center; 
}

.linha { 
  border-top: 1px dashed #000; 
  margin: 5px 0; 
}

.item { 
  margin: 2px 0; 
}

.item-linha { 
  display: flex; 
  justify-content: space-between; 
}
```

---

## 📊 **DADOS DISPONÍVEIS**

### **🏢 Empresa:**
```typescript
dadosImpressao.empresa = {
  razao_social: string,
  nome_fantasia: string,
  cnpj: string,
  inscricao_estadual: string,
  endereco: string,
  bairro: string,
  cidade: string,
  uf: string,
  cep: string,
  telefone: string
}
```

### **🛒 Venda:**
```typescript
dadosImpressao.venda = {
  id: string,
  numero: string,
  data: string,
  valor_total: number,
  valor_subtotal: number,
  valor_desconto: number,
  chave_nfe?: string // Apenas NFC-e
}
```

### **👤 Cliente:**
```typescript
dadosImpressao.cliente = {
  nome_cliente?: string,
  documento_cliente?: string
}
```

### **👥 Vendedores:**
```typescript
// Vendedor principal
dadosImpressao.vendedor = {
  id: string,
  nome: string
}

// Todos os vendedores únicos
dadosImpressao.vendedores = [
  { id: string, nome: string }
]
```

### **👨‍💼 Operador:**
```typescript
dadosImpressao.operador = {
  nome: string
}
```

### **📦 Itens:**
```typescript
dadosImpressao.itens = [
  {
    codigo: string,
    nome: string,
    quantidade: number,
    valor_unitario: number,
    valor_total: number,
    vendedor_id?: string,
    vendedor_nome?: string
  }
]
```

### **💳 Pagamento:**
```typescript
dadosImpressao.pagamento = {
  tipo_pagamento: 'vista' | 'parcial',
  forma_pagamento_id?: string,
  valor_pago?: number,
  formas_pagamento?: Array<{
    forma: string,
    valor: number
  }>,
  valor_troco: number
}
```

---

## ⚠️ **REGRAS IMPORTANTES**

### **🚫 NÃO ALTERAR:**
1. **Estrutura dos dados**: `dadosImpressao` é gerado automaticamente
2. **CSS de impressão térmica**: Técnicas otimizadas para visibilidade
3. **Lógica de múltiplos vendedores**: Funciona automaticamente
4. **Formatação de moeda**: Usar sempre `formatCurrency()`

### **✅ PODE ALTERAR:**
1. **Layout do HTML**: Ordem, espaçamento, seções
2. **Textos fixos**: "CUPOM NÃO FISCAL", "VENDEDOR:", etc.
3. **Condições de exibição**: Quando mostrar cada seção
4. **Estilos visuais**: Cores, tamanhos (com cuidado)

### **🔧 APÓS ALTERAÇÕES:**
```bash
# Sempre fazer build e deploy para desenvolvimento
npm run build && nexo-dev

# Testar em: nexodev.emasoftware.app
```

---

## 🎯 **RESUMO PARA IA**

**FUNÇÕES PRINCIPAIS:**
- `gerarEImprimirCupom()` - Cupom não fiscal
- `gerarEImprimirCupomNfce()` - Cupom fiscal

**ARQUIVO:**
- `src/pages/dashboard/PDVPage.tsx`

**COMANDO DE DEPLOY:**
```bash
npm run build && nexo-dev
```

**TESTE:**
- Acessar PDV em `nexodev.emasoftware.app`
- Testar impressão com diferentes cenários
