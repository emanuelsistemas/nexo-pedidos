# 🧪 Casos de Uso e Testes - API NFe/NFC-e

## 🎯 **PARA A IA DO FRONTEND - CASOS DE TESTE OBRIGATÓRIOS**

Use estes casos para testar a integração com a API. Todos devem funcionar perfeitamente.

---

## 🧾 **CASOS DE USO NFC-e (Mais Comuns)**

### **Caso 1: Lanchonete - Venda Simples**
```bash
curl -X POST https://apinfe.nexopdv.com/api/gerar-nfce \
-H "Content-Type: application/json" \
-d '{
  "empresa": {
    "id": 1,
    "cnpj": "12.345.678/0001-95",
    "name": "Lanchonete do João",
    "inscricao_estadual": "123456789",
    "address": "Rua das Flores, 123",
    "city": "São Paulo",
    "state": "SP",
    "zip_code": "01000-000"
  },
  "produtos": [
    {
      "codigo": "001",
      "descricao": "X-Burger Especial",
      "quantidade": 1,
      "valor_unitario": 18.50,
      "valor_total": 18.50,
      "unidade": "UN",
      "ncm": "21069090",
      "cfop": "5102"
    },
    {
      "codigo": "002",
      "descricao": "Batata Frita",
      "quantidade": 1,
      "valor_unitario": 8.00,
      "valor_total": 8.00,
      "unidade": "UN",
      "ncm": "20041000",
      "cfop": "5102"
    }
  ],
  "totais": {
    "valor_produtos": 26.50,
    "valor_total": 26.50
  },
  "pagamentos": [
    {
      "tipo": "04",
      "valor": 26.50
    }
  ]
}'
```

**Resultado Esperado:** ✅ Sucesso com QR Code

### **Caso 2: Farmácia - Consumidor Identificado**
```bash
curl -X POST https://apinfe.nexopdv.com/api/gerar-nfce \
-H "Content-Type: application/json" \
-d '{
  "empresa": {
    "id": 2,
    "cnpj": "98.765.432/0001-10",
    "name": "Farmácia Saúde Total"
  },
  "consumidor": {
    "cpf": "123.456.789-00",
    "nome": "Maria Silva"
  },
  "produtos": [
    {
      "codigo": "MED001",
      "descricao": "Dipirona 500mg - 20 comprimidos",
      "quantidade": 1,
      "valor_unitario": 12.90,
      "valor_total": 12.90
    }
  ],
  "totais": {
    "valor_produtos": 12.90,
    "valor_total": 12.90
  },
  "pagamentos": [
    {
      "tipo": "01",
      "valor": 12.90
    }
  ]
}'
```

**Resultado Esperado:** ✅ Sucesso com CPF no XML

### **Caso 3: Supermercado - Múltiplos Pagamentos**
```bash
curl -X POST https://apinfe.nexopdv.com/api/gerar-nfce \
-H "Content-Type: application/json" \
-d '{
  "empresa": {
    "id": 3,
    "cnpj": "11.222.333/0001-44",
    "name": "Supermercado Bom Preço"
  },
  "produtos": [
    {
      "codigo": "001",
      "descricao": "Arroz 5kg",
      "quantidade": 2,
      "valor_unitario": 22.90,
      "valor_total": 45.80
    },
    {
      "codigo": "002",
      "descricao": "Feijão 1kg",
      "quantidade": 3,
      "valor_unitario": 8.50,
      "valor_total": 25.50
    }
  ],
  "totais": {
    "valor_produtos": 71.30,
    "valor_total": 71.30
  },
  "pagamentos": [
    {
      "tipo": "01",
      "valor": 50.00
    },
    {
      "tipo": "03",
      "valor": 21.30,
      "bandeira": "01",
      "autorizacao": "123456"
    }
  ]
}'
```

**Resultado Esperado:** ✅ Sucesso com múltiplos pagamentos

---

## 📄 **CASOS DE USO NFe (B2B)**

### **Caso 4: Distribuidora para Loja**
```bash
curl -X POST https://apinfe.nexopdv.com/api/gerar-nfe \
-H "Content-Type: application/json" \
-d '{
  "empresa": {
    "id": 4,
    "cnpj": "55.666.777/0001-88",
    "name": "Distribuidora ABC Ltda"
  },
  "cliente": {
    "documento": "99.888.777/0001-66",
    "name": "Loja do Bairro Ltda",
    "address": "Av. Principal, 500",
    "city": "São Paulo",
    "state": "SP"
  },
  "produtos": [
    {
      "codigo": "DIST001",
      "descricao": "Caixa Refrigerante 12un",
      "quantidade": 20,
      "valor_unitario": 28.00,
      "valor_total": 560.00
    }
  ],
  "totais": {
    "valor_produtos": 560.00,
    "valor_total": 560.00,
    "natureza_operacao": "VENDA"
  }
}'
```

**Resultado Esperado:** ✅ Sucesso NFe B2B

---

## ❌ **CASOS DE ERRO (Para Testar Validações)**

### **Erro 1: NFC-e Acima do Limite**
```bash
curl -X POST https://apinfe.nexopdv.com/api/gerar-nfce \
-H "Content-Type: application/json" \
-d '{
  "empresa": {"id": 1, "cnpj": "12.345.678/0001-95"},
  "produtos": [{"codigo": "001", "descricao": "Produto Caro", "quantidade": 1, "valor_unitario": 6000.00, "valor_total": 6000.00}],
  "totais": {"valor_total": 6000.00},
  "pagamentos": [{"tipo": "01", "valor": 6000.00}]
}'
```

**Resultado Esperado:** ❌ Erro "Valor total não pode exceder R$ 5.000,00 para NFC-e"

### **Erro 2: NFC-e Sem Pagamentos**
```bash
curl -X POST https://apinfe.nexopdv.com/api/gerar-nfce \
-H "Content-Type: application/json" \
-d '{
  "empresa": {"id": 1, "cnpj": "12.345.678/0001-95"},
  "produtos": [{"codigo": "001", "descricao": "Produto", "quantidade": 1, "valor_unitario": 10.00, "valor_total": 10.00}],
  "totais": {"valor_total": 10.00}
}'
```

**Resultado Esperado:** ❌ Erro "Formas de pagamento são obrigatórias para NFC-e"

### **Erro 3: Soma Pagamentos Incorreta**
```bash
curl -X POST https://apinfe.nexopdv.com/api/gerar-nfce \
-H "Content-Type: application/json" \
-d '{
  "empresa": {"id": 1, "cnpj": "12.345.678/0001-95"},
  "produtos": [{"codigo": "001", "descricao": "Produto", "quantidade": 1, "valor_unitario": 100.00, "valor_total": 100.00}],
  "totais": {"valor_total": 100.00},
  "pagamentos": [{"tipo": "01", "valor": 50.00}]
}'
```

**Resultado Esperado:** ❌ Erro "Soma dos pagamentos deve ser igual ao valor total"

---

## 🔧 **TESTES DE CONFIGURAÇÃO**

### **Teste 1: Status da API**
```bash
curl https://apinfe.nexopdv.com/api/status
```

**Resultado Esperado:**
```json
{
  "status": "API NFe/NFC-e Online",
  "modelos_suportados": {
    "NFe": "Modelo 55 - Nota Fiscal Eletrônica",
    "NFC-e": "Modelo 65 - Nota Fiscal de Consumidor Eletrônica"
  }
}
```

### **Teste 2: Configurações NFC-e**
```bash
curl https://apinfe.nexopdv.com/api/config-nfce
```

**Resultado Esperado:**
```json
{
  "valor_maximo": 5000,
  "tipos_pagamento": {
    "01": "Dinheiro",
    "03": "Cartão de Crédito",
    "04": "Cartão de Débito"
  }
}
```

---

## 🎯 **CHECKLIST DE TESTES PARA O FRONTEND**

### **✅ Testes Obrigatórios NFC-e:**
- [ ] Venda simples com dinheiro
- [ ] Venda com consumidor identificado (CPF)
- [ ] Venda com múltiplos pagamentos
- [ ] Venda com cartão (crédito/débito)
- [ ] Erro: valor acima de R$ 5.000
- [ ] Erro: sem pagamentos
- [ ] Erro: soma pagamentos incorreta
- [ ] QR Code gerado corretamente
- [ ] URL de consulta válida

### **✅ Testes Obrigatórios NFe:**
- [ ] Venda B2B com CNPJ
- [ ] Venda para CPF (acima R$ 5.000)
- [ ] Produtos com impostos
- [ ] Natureza da operação
- [ ] Endereço completo cliente

### **✅ Testes de Integração:**
- [ ] Status da API
- [ ] Configurações NFC-e
- [ ] Timeout de requisições
- [ ] Tratamento de erros HTTP
- [ ] Loading states
- [ ] Retry automático

---

## 💻 **Código JavaScript para Testes Automatizados**

```javascript
// Teste automatizado para o frontend
const testarAPI = async () => {
  const testes = [
    {
      nome: 'Status da API',
      url: '/api/status',
      metodo: 'GET',
      esperado: 'API NFe/NFC-e Online'
    },
    {
      nome: 'NFC-e Simples',
      url: '/api/gerar-nfce',
      metodo: 'POST',
      dados: {
        empresa: { id: 1, cnpj: '12.345.678/0001-95' },
        produtos: [{ codigo: '001', descricao: 'Teste', quantidade: 1, valor_unitario: 10, valor_total: 10 }],
        totais: { valor_total: 10 },
        pagamentos: [{ tipo: '01', valor: 10 }]
      },
      esperado: 'success'
    },
    {
      nome: 'NFC-e Erro Valor Alto',
      url: '/api/gerar-nfce',
      metodo: 'POST',
      dados: {
        empresa: { id: 1, cnpj: '12.345.678/0001-95' },
        produtos: [{ codigo: '001', descricao: 'Caro', quantidade: 1, valor_unitario: 6000, valor_total: 6000 }],
        totais: { valor_total: 6000 },
        pagamentos: [{ tipo: '01', valor: 6000 }]
      },
      esperado: 'error'
    }
  ];

  for (const teste of testes) {
    try {
      console.log(`🧪 Testando: ${teste.nome}`);
      
      const response = await fetch(`https://apinfe.nexopdv.com${teste.url}`, {
        method: teste.metodo,
        headers: { 'Content-Type': 'application/json' },
        body: teste.dados ? JSON.stringify(teste.dados) : undefined
      });
      
      const result = await response.json();
      
      if (teste.esperado === 'success' && result.success) {
        console.log(`✅ ${teste.nome}: PASSOU`);
      } else if (teste.esperado === 'error' && !result.success) {
        console.log(`✅ ${teste.nome}: PASSOU (erro esperado)`);
      } else if (typeof teste.esperado === 'string' && result.status?.includes(teste.esperado)) {
        console.log(`✅ ${teste.nome}: PASSOU`);
      } else {
        console.log(`❌ ${teste.nome}: FALHOU`, result);
      }
      
    } catch (error) {
      console.log(`❌ ${teste.nome}: ERRO`, error.message);
    }
  }
};

// Executar testes
testarAPI();
```

---

## 🎯 **RESUMO PARA IMPLEMENTAÇÃO**

### **🔥 Casos Mais Importantes:**
1. **NFC-e Lanchonete** (Caso 1) - Mais comum
2. **NFC-e Múltiplos Pagamentos** (Caso 3) - Complexo
3. **Validação Valor Máximo** (Erro 1) - Crítico
4. **Validação Pagamentos** (Erro 2) - Crítico

### **📋 Ordem de Implementação:**
1. Implementar caso simples NFC-e
2. Adicionar validações de erro
3. Implementar múltiplos pagamentos
4. Adicionar NFe para empresas
5. Testes automatizados

### **🚨 Validações Críticas:**
- Valor máximo NFC-e: R$ 5.000,00
- Pagamentos obrigatórios NFC-e
- Soma pagamentos = total
- QR Code obrigatório NFC-e

**✅ TODOS OS CASOS TESTADOS E FUNCIONANDO NA API!**
