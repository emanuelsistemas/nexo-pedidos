# 🌐 Ambientes NFe/NFC-e - Homologação vs Produção

## 🎯 **Configuração de Ambientes**

A API NFe/NFC-e suporta **dois ambientes**:

### **1. Homologação (Ambiente 2) - PADRÃO**
- **Descrição:** Ambiente de testes da SEFAZ
- **Uso:** Desenvolvimento e testes
- **Certificados:** Podem ser de teste
- **URLs SEFAZ:** Homologação
- **Valor:** `"ambiente": 2`

### **2. Produção (Ambiente 1)**
- **Descrição:** Ambiente real da SEFAZ
- **Uso:** Documentos fiscais válidos
- **Certificados:** Obrigatório certificado real
- **URLs SEFAZ:** Produção
- **Valor:** `"ambiente": 1`

---

## 🔧 **Como Configurar o Ambiente**

### **Opção 1: Global (Arquivo .env)**
```bash
NFE_AMBIENTE=2  # 1=Produção, 2=Homologação
```
**Todas as requisições usarão este ambiente**

### **Opção 2: Por Requisição (Recomendado)**
Enviar o parâmetro `ambiente` no payload:

```json
{
  "ambiente": 2,
  "empresa": {
    "id": 1,
    "cnpj": "12.345.678/0001-95"
  },
  "produtos": [...],
  "totais": {...}
}
```

---

## 📋 **Endpoints com Suporte a Ambiente**

### **NFe:**
```javascript
// Homologação
POST /api/gerar-nfe
{
  "ambiente": 2,
  "empresa": {...},
  "cliente": {...},
  "produtos": [...]
}

// Produção
POST /api/gerar-nfe
{
  "ambiente": 1,
  "empresa": {...},
  "cliente": {...},
  "produtos": [...]
}
```

### **NFC-e:**
```javascript
// Homologação
POST /api/gerar-nfce
{
  "ambiente": 2,
  "empresa": {...},
  "produtos": [...],
  "pagamentos": [...]
}

// Produção
POST /api/gerar-nfce
{
  "ambiente": 1,
  "empresa": {...},
  "produtos": [...],
  "pagamentos": [...]
}
```

---

## 🧪 **Testando Ambientes**

### **Verificar Configuração Atual:**
```bash
curl https://apinfe.nexopdv.com/api/config-ambiente
```

**Resposta:**
```json
{
  "ambiente_atual": 2,
  "ambientes_disponiveis": {
    "1": {
      "nome": "Produção",
      "descricao": "Ambiente real da SEFAZ",
      "certificado_obrigatorio": true
    },
    "2": {
      "nome": "Homologação", 
      "descricao": "Ambiente de testes da SEFAZ",
      "certificado_obrigatorio": true
    }
  },
  "como_usar": {
    "global": "Configurado no .env (NFE_AMBIENTE)",
    "por_requisicao": "Enviar parâmetro 'ambiente' no payload"
  }
}
```

### **Teste NFC-e Homologação:**
```bash
curl -X POST https://apinfe.nexopdv.com/api/gerar-nfce \
-H "Content-Type: application/json" \
-d '{
  "ambiente": 2,
  "empresa": {
    "id": 1,
    "cnpj": "12.345.678/0001-95",
    "name": "Empresa Teste"
  },
  "produtos": [
    {
      "codigo": "001",
      "descricao": "Produto Teste",
      "quantidade": 1,
      "valor_unitario": 10.00,
      "valor_total": 10.00
    }
  ],
  "totais": {
    "valor_total": 10.00
  },
  "pagamentos": [
    {
      "tipo": "01",
      "valor": 10.00
    }
  ]
}'
```

---

## ⚠️ **Diferenças Importantes**

### **Homologação (Ambiente 2):**
- ✅ Certificados de teste aceitos
- ✅ Dados fictícios permitidos
- ✅ Sem valor fiscal real
- ✅ URLs de teste da SEFAZ
- ✅ Ideal para desenvolvimento

### **Produção (Ambiente 1):**
- ❗ Certificado digital REAL obrigatório
- ❗ Dados reais obrigatórios
- ❗ Gera documentos fiscais válidos
- ❗ URLs oficiais da SEFAZ
- ❗ Apenas para operações reais

---

## 🎯 **Recomendações**

### **Para Desenvolvimento:**
```json
{
  "ambiente": 2,
  // ... resto dos dados
}
```

### **Para Produção:**
```json
{
  "ambiente": 1,
  // ... dados reais obrigatórios
}
```

### **Frontend - Seletor de Ambiente:**
```javascript
const [ambiente, setAmbiente] = useState(2); // Padrão homologação

const gerarDocumento = async (dados) => {
  const payload = {
    ambiente: ambiente, // 1 ou 2
    ...dados
  };
  
  const response = await fetch('/api/gerar-nfce', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
};
```

---

## 📊 **URLs da SEFAZ por Ambiente**

### **Homologação (Ambiente 2):**
- **NFe:** `https://homologacao.nfe.fazenda.gov.br`
- **NFC-e SP:** `https://homologacao.nfce.fazenda.sp.gov.br`

### **Produção (Ambiente 1):**
- **NFe:** `https://nfe.fazenda.gov.br`
- **NFC-e SP:** `https://www.nfce.fazenda.sp.gov.br`

---

## 🔧 **Configuração Atual da API**

**Ambiente Padrão:** Homologação (2)
**Suporte:** Ambos os ambientes
**Método:** Por parâmetro ou global
**Certificados:** Integrados com Supabase

**✅ A API está pronta para ambos os ambientes!**
