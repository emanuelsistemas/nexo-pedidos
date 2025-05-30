# 📋 Documentação Completa - API NFe/NFC-e para Frontend

## 🎯 **INSTRUÇÕES PARA A IA DO FRONTEND**

Esta documentação contém **TODAS** as informações necessárias para implementar a integração com a API NFe/NFC-e no frontend. Siga exatamente as especificações abaixo.

---

## 🌐 **Configurações da API**

### **Base URL:**
```
https://apinfe.nexopdv.com
```

### **Autenticação:**
```javascript
headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer {API_TOKEN}' // Opcional por enquanto
}
```

---

## 📊 **Endpoints Disponíveis**

### 🟢 **1. Status da API**
```http
GET /api/status
```

**Resposta:**
```json
{
  "status": "API NFe/NFC-e Online",
  "timestamp": "2025-05-30 13:45:28",
  "version": "1.1.0",
  "modelos_suportados": {
    "NFe": "Modelo 55 - Nota Fiscal Eletrônica",
    "NFC-e": "Modelo 65 - Nota Fiscal de Consumidor Eletrônica"
  }
}
```

---

## 📄 **NFe (Modelo 55) - B2B (Empresa para Empresa)**

### **🔧 Quando usar NFe:**
- Vendas para outras empresas (CNPJ)
- Vendas para consumidores com CPF (acima de R$ 5.000)
- Operações que exigem destinatário identificado

### **📤 1. Gerar NFe**
```http
POST /api/gerar-nfe
```

**Payload Completo:**
```json
{
  "empresa": {
    "id": 1,
    "cnpj": "12.345.678/0001-95",
    "name": "Empresa Teste Ltda",
    "nome_fantasia": "Empresa Teste",
    "inscricao_estadual": "123456789",
    "regime_tributario": 1,
    "address": "Rua Teste, 123",
    "numero_endereco": "123",
    "bairro": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "zip_code": "01000-000",
    "codigo_municipio": 3550308,
    "phone": "(11) 99999-9999"
  },
  "cliente": {
    "documento": "12.345.678/0001-95", // CNPJ ou CPF
    "name": "Cliente Teste",
    "address": "Rua Cliente, 456",
    "numero_endereco": "456",
    "bairro": "Vila Nova",
    "city": "São Paulo",
    "state": "SP",
    "zip_code": "02000-000",
    "codigo_municipio": 3550308,
    "email": "cliente@teste.com"
  },
  "produtos": [
    {
      "codigo": "001",
      "descricao": "Produto Teste",
      "quantidade": 2,
      "valor_unitario": 100.00,
      "valor_total": 200.00,
      "unidade": "UN",
      "ncm": "12345678",
      "cfop": "5102",
      "codigo_barras": "1234567890123",
      "origem_produto": 0,
      "cst_icms": "00",
      "aliquota_icms": 18,
      "cst_pis": "01",
      "aliquota_pis": 1.65,
      "cst_cofins": "01",
      "aliquota_cofins": 7.6
    }
  ],
  "totais": {
    "valor_produtos": 200.00,
    "valor_desconto": 0.00,
    "valor_total": 200.00,
    "natureza_operacao": "VENDA"
  },
  "pagamentos": [ // Opcional para NFe
    {
      "tipo": "01", // 01=Dinheiro, 03=Cartão Crédito, 04=Cartão Débito
      "valor": 200.00
    }
  ]
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "xml": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>...",
    "chave": "35250512345678000195550010000000011234567890",
    "numero_nfe": 1,
    "protocolo": null
  },
  "timestamp": "2025-05-30 13:45:28"
}
```

### **📤 2. Enviar NFe para SEFAZ**
```http
POST /api/enviar-sefaz
```

**Payload:**
```json
{
  "xml": "<?xml version=\"1.0\"...",
  "chave": "35250512345678000195550010000000011234567890",
  "empresa_id": 1
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "protocolo": "135202505301345001",
    "status": "100",
    "motivo": "Autorizado o uso da NF-e",
    "data_autorizacao": "2025-05-30 13:45:28"
  }
}
```

### **📤 3. Consultar NFe**
```http
GET /api/consultar-nfe?chave={chave}&empresa_id={id}
```

---

## 🧾 **NFC-e (Modelo 65) - B2C (Empresa para Consumidor)**

### **🔧 Quando usar NFC-e:**
- Vendas no balcão/presenciais
- Vendas até R$ 5.000,00
- Consumidor final (CPF opcional)
- Operações de varejo

### **⚠️ VALIDAÇÕES OBRIGATÓRIAS NFC-e:**
- ✅ Valor máximo: **R$ 5.000,00**
- ✅ Pagamentos: **OBRIGATÓRIOS**
- ✅ Soma pagamentos = valor total
- ✅ QR Code: **OBRIGATÓRIO**

### **📤 1. Gerar NFC-e**
```http
POST /api/gerar-nfce
```

**Payload Completo:**
```json
{
  "empresa": {
    "id": 1,
    "cnpj": "12.345.678/0001-95",
    "name": "Empresa Teste Ltda",
    "nome_fantasia": "Loja Teste",
    "inscricao_estadual": "123456789",
    "regime_tributario": 1,
    "address": "Rua Teste, 123",
    "numero_endereco": "123",
    "bairro": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "zip_code": "01000-000",
    "codigo_municipio": 3550308,
    "phone": "(11) 99999-9999"
  },
  "consumidor": { // OPCIONAL
    "cpf": "123.456.789-00",
    "nome": "João da Silva"
  },
  "produtos": [
    {
      "codigo": "001",
      "descricao": "Refrigerante 2L",
      "quantidade": 1,
      "valor_unitario": 8.50,
      "valor_total": 8.50,
      "unidade": "UN",
      "ncm": "22021000",
      "cfop": "5102",
      "codigo_barras": "7891234567890",
      "origem_produto": 0,
      "csosn_icms": "102" // Simples Nacional
    },
    {
      "codigo": "002",
      "descricao": "Salgadinho 100g",
      "quantidade": 2,
      "valor_unitario": 3.75,
      "valor_total": 7.50,
      "unidade": "UN",
      "ncm": "19059090",
      "cfop": "5102",
      "origem_produto": 0,
      "csosn_icms": "102"
    }
  ],
  "totais": {
    "valor_produtos": 16.00,
    "valor_desconto": 0.00,
    "valor_total": 16.00
  },
  "pagamentos": [ // OBRIGATÓRIO
    {
      "tipo": "01", // Dinheiro
      "valor": 16.00
    }
  ]
}
```

**Exemplo com Múltiplos Pagamentos:**
```json
{
  // ... outros campos ...
  "totais": {
    "valor_total": 50.00
  },
  "pagamentos": [
    {
      "tipo": "01", // Dinheiro
      "valor": 20.00
    },
    {
      "tipo": "03", // Cartão Crédito
      "valor": 30.00,
      "bandeira": "01", // Visa
      "autorizacao": "123456"
    }
  ]
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "xml": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>...",
    "chave": "35250512345678000195650010000000011234567890",
    "numero_nfce": 1,
    "qr_code": "https://homologacao.nfce.fazenda.sp.gov.br/NFCeConsultaPublica?chNFe=35250512345678000195650010000000011234567890&nVersao=100&tpAmb=2",
    "url_consulta": "https://homologacao.nfce.fazenda.sp.gov.br/NFCeConsultaPublica"
  },
  "timestamp": "2025-05-30 13:45:28"
}
```

### **📤 2. Enviar NFC-e para SEFAZ**
```http
POST /api/enviar-nfce-sefaz
```

### **📤 3. Consultar NFC-e**
```http
GET /api/consultar-nfce?chave={chave}&empresa_id={id}
```

### **📤 4. Cancelar NFC-e**
```http
POST /api/cancelar-nfce
```

**Payload:**
```json
{
  "chave": "35250512345678000195650010000000011234567890",
  "justificativa": "Cancelamento por erro de digitação do valor",
  "empresa_id": 1
}
```

### **📤 5. Gerar QR Code**
```http
POST /api/gerar-qrcode-nfce
```

**Payload:**
```json
{
  "chave": "35250512345678000195650010000000011234567890",
  "uf": "SP",
  "valor_total": 16.00
}
```

### **📤 6. Configurações NFC-e**
```http
GET /api/config-nfce
```

**Resposta:**
```json
{
  "valor_maximo": 5000,
  "tipos_pagamento": {
    "01": "Dinheiro",
    "02": "Cheque",
    "03": "Cartão de Crédito",
    "04": "Cartão de Débito",
    "05": "Crédito Loja",
    "10": "Vale Alimentação",
    "11": "Vale Refeição",
    "12": "Vale Presente",
    "13": "Vale Combustível",
    "15": "Boleto Bancário",
    "99": "Outros"
  },
  "ambiente_padrao": 2,
  "serie_padrao": 1,
  "consumidor_obrigatorio": false
}
```

---

## 🔍 **Tabela Comparativa: NFe vs NFC-e**

| Aspecto | NFe (Modelo 55) | NFC-e (Modelo 65) |
|---------|-----------------|-------------------|
| **Finalidade** | B2B (empresa → empresa) | B2C (empresa → consumidor) |
| **Destinatário** | **OBRIGATÓRIO** (CNPJ/CPF) | **OPCIONAL** (CPF) |
| **Valor Limite** | Sem limite | **Máximo R$ 5.000,00** |
| **Pagamentos** | Opcional | **OBRIGATÓRIO** |
| **QR Code** | Não | **OBRIGATÓRIO** |
| **DANFE** | A4 completo | Cupom fiscal (58mm) |
| **Operação** | Qualquer | Presencial obrigatório |

---

## 💻 **Códigos de Exemplo para Frontend**

### **JavaScript/React - Gerar NFe:**
```javascript
const gerarNFe = async (dadosNFe) => {
  try {
    const response = await fetch('https://apinfe.nexopdv.com/api/gerar-nfe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': 'Bearer ' + apiToken // Se necessário
      },
      body: JSON.stringify(dadosNFe)
    });

    const result = await response.json();

    if (result.success) {
      console.log('NFe gerada:', result.data.chave);
      return result.data;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Erro ao gerar NFe:', error);
    throw error;
  }
};
```

### **JavaScript/React - Gerar NFC-e:**
```javascript
const gerarNFCe = async (dadosNFCe) => {
  // Validar valor máximo
  if (dadosNFCe.totais.valor_total > 5000) {
    throw new Error('Valor máximo para NFC-e é R$ 5.000,00');
  }

  // Validar pagamentos obrigatórios
  if (!dadosNFCe.pagamentos || dadosNFCe.pagamentos.length === 0) {
    throw new Error('Pagamentos são obrigatórios para NFC-e');
  }

  // Validar soma dos pagamentos
  const totalPagamentos = dadosNFCe.pagamentos.reduce((sum, pag) => sum + pag.valor, 0);
  if (Math.abs(totalPagamentos - dadosNFCe.totais.valor_total) > 0.01) {
    throw new Error('Soma dos pagamentos deve ser igual ao valor total');
  }

  try {
    const response = await fetch('https://apinfe.nexopdv.com/api/gerar-nfce', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dadosNFCe)
    });

    const result = await response.json();

    if (result.success) {
      console.log('NFC-e gerada:', result.data.chave);
      console.log('QR Code:', result.data.qr_code);
      return result.data;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Erro ao gerar NFC-e:', error);
    throw error;
  }
};
```

### **Função para Detectar Tipo de Documento:**
```javascript
const detectarTipoDocumento = (dadosVenda) => {
  // Se valor > R$ 5.000 → NFe obrigatória
  if (dadosVenda.totais.valor_total > 5000) {
    return 'NFe';
  }

  // Se cliente tem CNPJ → NFe
  if (dadosVenda.cliente && dadosVenda.cliente.documento &&
      dadosVenda.cliente.documento.replace(/\D/g, '').length === 14) {
    return 'NFe';
  }

  // Se é venda balcão/presencial → NFC-e
  if (dadosVenda.tipo_operacao === 'balcao' || dadosVenda.tipo_operacao === 'presencial') {
    return 'NFC-e';
  }

  // Padrão para consumidor final
  return 'NFC-e';
};
```

---

## 🎯 **Fluxo Recomendado para o Frontend**

### **1. Tela de Vendas:**
```javascript
// 1. Usuário adiciona produtos
// 2. Usuário informa cliente (opcional para NFC-e)
// 3. Usuário informa pagamentos (obrigatório para NFC-e)
// 4. Sistema detecta automaticamente NFe ou NFC-e
// 5. Sistema valida dados conforme o tipo
// 6. Sistema gera documento
// 7. Sistema envia para SEFAZ
// 8. Sistema exibe resultado (QR Code para NFC-e)
```

### **2. Validações no Frontend:**
```javascript
const validarDadosVenda = (dados, tipoDocumento) => {
  const erros = [];

  if (tipoDocumento === 'NFC-e') {
    // Validações específicas NFC-e
    if (dados.totais.valor_total > 5000) {
      erros.push('Valor máximo para NFC-e é R$ 5.000,00');
    }

    if (!dados.pagamentos || dados.pagamentos.length === 0) {
      erros.push('Pagamentos são obrigatórios para NFC-e');
    }

    const totalPagamentos = dados.pagamentos?.reduce((sum, pag) => sum + pag.valor, 0) || 0;
    if (Math.abs(totalPagamentos - dados.totais.valor_total) > 0.01) {
      erros.push('Soma dos pagamentos deve ser igual ao valor total');
    }
  }

  if (tipoDocumento === 'NFe') {
    // Validações específicas NFe
    if (!dados.cliente || !dados.cliente.documento) {
      erros.push('Cliente é obrigatório para NFe');
    }
  }

  return erros;
};
```

---

## 🚨 **Tratamento de Erros**

### **Códigos de Erro Comuns:**
- `400` - Dados inválidos
- `401` - Token inválido
- `405` - Método não permitido
- `422` - Erro de validação
- `500` - Erro interno do servidor

### **Exemplo de Resposta de Erro:**
```json
{
  "success": false,
  "error": "Valor total não pode exceder R$ 5.000,00 para NFC-e",
  "timestamp": "2025-05-30 13:45:28"
}
```

---

## 📱 **Interface Sugerida**

### **Tela de Vendas:**
1. **Seleção de Produtos** (comum)
2. **Dados do Cliente** (obrigatório NFe, opcional NFC-e)
3. **Formas de Pagamento** (obrigatório NFC-e, opcional NFe)
4. **Botão "Finalizar Venda"** → Sistema detecta automaticamente NFe/NFC-e
5. **Exibição do Resultado:**
   - NFe: Chave + Protocolo
   - NFC-e: Chave + QR Code + URL Consulta

### **Componentes Necessários:**
- `SeletorProdutos`
- `FormularioCliente` (com validação CPF/CNPJ)
- `FormularioPagamentos` (com tipos de pagamento)
- `ExibidorQRCode` (para NFC-e)
- `ValidadorDocumento` (NFe vs NFC-e)

---

## 🔧 **Configurações Recomendadas**

### **Variáveis de Ambiente:**
```javascript
const API_CONFIG = {
  BASE_URL: 'https://apinfe.nexopdv.com',
  API_TOKEN: process.env.REACT_APP_NFE_API_TOKEN, // Se necessário
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3
};
```

### **Estados da Aplicação:**
```javascript
const [tipoDocumento, setTipoDocumento] = useState('NFC-e'); // 'NFe' ou 'NFC-e'
const [dadosVenda, setDadosVenda] = useState({});
const [documentoGerado, setDocumentoGerado] = useState(null);
const [loading, setLoading] = useState(false);
const [erro, setErro] = useState(null);
```

---

## 🎯 **RESUMO PARA IMPLEMENTAÇÃO**

### **✅ O que implementar:**
1. **Formulário de vendas** com detecção automática NFe/NFC-e
2. **Validações específicas** para cada tipo de documento
3. **Integração com todos os endpoints** da API
4. **Exibição de QR Code** para NFC-e
5. **Tratamento de erros** robusto
6. **Interface responsiva** para desktop/mobile

### **🔄 Fluxo Principal:**
```
Produtos → Cliente → Pagamentos → Validação → Geração → Envio SEFAZ → Resultado
```

### **📋 Endpoints Prioritários:**
1. `POST /api/gerar-nfce` (mais usado)
2. `POST /api/gerar-nfe` (empresas)
3. `GET /api/config-nfce` (configurações)
4. `GET /api/status` (monitoramento)

---

**🚀 API Pronta:** `https://apinfe.nexopdv.com`
**📋 Documentação Completa:** Acima
**✅ Próximo Passo:** Implementar frontend conforme especificações

---

## 📎 **ANEXOS - Exemplos Práticos**

### **Exemplo 1: Venda Simples NFC-e (Lanchonete)**
```json
{
  "empresa": {
    "id": 1,
    "cnpj": "12.345.678/0001-95",
    "name": "Lanchonete do João"
  },
  "produtos": [
    {
      "codigo": "001",
      "descricao": "X-Burger",
      "quantidade": 1,
      "valor_unitario": 15.00,
      "valor_total": 15.00
    }
  ],
  "totais": {
    "valor_produtos": 15.00,
    "valor_total": 15.00
  },
  "pagamentos": [
    {
      "tipo": "04",
      "valor": 15.00
    }
  ]
}
```

**🚀 IMPLEMENTAÇÃO PRONTA PARA INICIAR!**

