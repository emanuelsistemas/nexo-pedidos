# 🎯 RESUMO EXECUTIVO - Implementação Frontend NFe/NFC-e

## 📋 **INSTRUÇÕES DIRETAS PARA A IA DO FRONTEND**

Você deve implementar a integração com a API NFe/NFC-e seguindo exatamente as especificações dos arquivos de documentação fornecidos.

---

## 🌐 **API PRONTA E FUNCIONANDO**

**Base URL:** `https://apinfe.nexopdv.com`
**Status:** ✅ Online e testada
**Modelos:** NFe (55) + NFC-e (65)

---

## 🎯 **O QUE VOCÊ DEVE IMPLEMENTAR**

### **1. Interface de Vendas**
- Formulário para adicionar produtos
- Seleção automática NFe vs NFC-e baseada nos dados
- Formulário de pagamentos (obrigatório para NFC-e)
- Dados do cliente/consumidor
- Botão "Finalizar Venda"

### **2. Lógica de Negócio**
```javascript
// Detecção automática do tipo de documento
if (valorTotal > 5000 || clienteTem_CNPJ) {
  tipoDocumento = 'NFe';
  endpoint = '/api/gerar-nfe';
} else {
  tipoDocumento = 'NFC-e';
  endpoint = '/api/gerar-nfce';
  // Validar pagamentos obrigatórios
}
```

### **3. Validações Críticas**
- **NFC-e:** Valor máximo R$ 5.000,00
- **NFC-e:** Pagamentos obrigatórios
- **NFC-e:** Soma pagamentos = valor total
- **NFe:** Cliente obrigatório

### **4. Endpoints Principais**
```javascript
// Mais usado - NFC-e para varejo
POST /api/gerar-nfce

// Para empresas - NFe B2B  
POST /api/gerar-nfe

// Configurações
GET /api/config-nfce
GET /api/status
```

---

## 📊 **ESTRUTURA DE DADOS**

### **Payload NFC-e (Mais Comum):**
```json
{
  "empresa": {
    "id": 1,
    "cnpj": "12.345.678/0001-95",
    "name": "Nome da Empresa"
  },
  "consumidor": { // OPCIONAL
    "cpf": "123.456.789-00",
    "nome": "João Silva"
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
    "valor_produtos": 10.00,
    "valor_total": 10.00
  },
  "pagamentos": [ // OBRIGATÓRIO
    {
      "tipo": "01", // 01=Dinheiro, 03=Cartão Crédito, 04=Cartão Débito
      "valor": 10.00
    }
  ]
}
```

### **Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "xml": "<?xml...",
    "chave": "35250512345678000195650010000000011234567890",
    "numero_nfce": 1,
    "qr_code": "https://homologacao.nfce.fazenda.sp.gov.br/...", // Apenas NFC-e
    "url_consulta": "https://homologacao.nfce.fazenda.sp.gov.br/..."
  }
}
```

---

## 🔧 **COMPONENTES NECESSÁRIOS**

### **1. FormularioVenda.jsx**
```javascript
const [tipoDocumento, setTipoDocumento] = useState('NFC-e');
const [produtos, setProdutos] = useState([]);
const [cliente, setCliente] = useState(null);
const [pagamentos, setPagamentos] = useState([]);
const [loading, setLoading] = useState(false);

// Detecção automática
useEffect(() => {
  const valorTotal = calcularTotal(produtos);
  const temCNPJ = cliente?.documento?.length === 18;
  
  if (valorTotal > 5000 || temCNPJ) {
    setTipoDocumento('NFe');
  } else {
    setTipoDocumento('NFC-e');
  }
}, [produtos, cliente]);
```

### **2. ValidadorDocumento.js**
```javascript
export const validarVenda = (dados, tipo) => {
  const erros = [];
  
  if (tipo === 'NFC-e') {
    if (dados.totais.valor_total > 5000) {
      erros.push('Valor máximo para NFC-e é R$ 5.000,00');
    }
    
    if (!dados.pagamentos?.length) {
      erros.push('Pagamentos são obrigatórios para NFC-e');
    }
    
    const totalPagamentos = dados.pagamentos?.reduce((sum, p) => sum + p.valor, 0) || 0;
    if (Math.abs(totalPagamentos - dados.totais.valor_total) > 0.01) {
      erros.push('Soma dos pagamentos deve ser igual ao valor total');
    }
  }
  
  return erros;
};
```

### **3. ApiService.js**
```javascript
export const gerarDocumento = async (dados, tipo) => {
  const endpoint = tipo === 'NFe' ? '/api/gerar-nfe' : '/api/gerar-nfce';
  
  try {
    const response = await fetch(`https://apinfe.nexopdv.com${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    return result.data;
  } catch (error) {
    console.error('Erro ao gerar documento:', error);
    throw error;
  }
};
```

### **4. ExibidorQRCode.jsx** (Para NFC-e)
```javascript
import QRCode from 'qrcode.react';

const ExibidorQRCode = ({ qrCodeUrl, chave }) => {
  if (!qrCodeUrl) return null;
  
  return (
    <div className="qr-code-container">
      <h3>NFC-e Gerada com Sucesso!</h3>
      <QRCode value={qrCodeUrl} size={200} />
      <p>Chave: {chave}</p>
      <a href={qrCodeUrl} target="_blank" rel="noopener noreferrer">
        Consultar NFC-e
      </a>
    </div>
  );
};
```

---

## 🧪 **TESTES OBRIGATÓRIOS**

### **Teste 1: NFC-e Simples**
```javascript
const dadosNFCe = {
  empresa: { id: 1, cnpj: '12.345.678/0001-95', name: 'Teste' },
  produtos: [{ codigo: '001', descricao: 'Produto', quantidade: 1, valor_unitario: 10, valor_total: 10 }],
  totais: { valor_total: 10 },
  pagamentos: [{ tipo: '01', valor: 10 }]
};

// Deve retornar sucesso com QR Code
```

### **Teste 2: Validação Erro**
```javascript
const dadosErro = {
  empresa: { id: 1, cnpj: '12.345.678/0001-95' },
  produtos: [{ codigo: '001', descricao: 'Caro', quantidade: 1, valor_unitario: 6000, valor_total: 6000 }],
  totais: { valor_total: 6000 },
  pagamentos: [{ tipo: '01', valor: 6000 }]
};

// Deve retornar erro: "Valor total não pode exceder R$ 5.000,00 para NFC-e"
```

---

## 📱 **FLUXO DA INTERFACE**

### **Tela Principal:**
1. **Lista de Produtos** (adicionar/remover)
2. **Resumo do Pedido** (total, quantidade)
3. **Dados do Cliente** (opcional NFC-e, obrigatório NFe)
4. **Formas de Pagamento** (obrigatório NFC-e)
5. **Indicador do Tipo** (NFe ou NFC-e - automático)
6. **Botão Finalizar** (gerar documento)

### **Após Geração:**
- **NFe:** Exibir chave e protocolo
- **NFC-e:** Exibir QR Code + chave + link consulta

---

## 🎯 **PRIORIDADES DE IMPLEMENTAÇÃO**

### **Fase 1 - Básico (Obrigatório):**
1. ✅ Formulário produtos
2. ✅ Detecção automática NFe/NFC-e
3. ✅ Validações críticas
4. ✅ Integração API gerar-nfce
5. ✅ Exibição QR Code

### **Fase 2 - Avançado:**
1. ✅ Integração NFe
2. ✅ Múltiplos pagamentos
3. ✅ Consulta documentos
4. ✅ Cancelamento NFC-e

### **Fase 3 - Extras:**
1. ✅ Histórico vendas
2. ✅ Impressão cupom
3. ✅ Relatórios

---

## 🚨 **PONTOS CRÍTICOS**

### **❌ Não Esquecer:**
- Validar valor máximo NFC-e (R$ 5.000)
- Pagamentos obrigatórios para NFC-e
- Soma pagamentos = valor total
- QR Code obrigatório para NFC-e
- Tratamento de erros da API

### **✅ Garantir:**
- Loading states durante requisições
- Feedback visual para usuário
- Validação em tempo real
- Responsividade mobile
- Tratamento de timeout

---

## 📋 **CHECKLIST FINAL**

### **Funcionalidades:**
- [ ] Formulário de vendas completo
- [ ] Detecção automática NFe/NFC-e
- [ ] Validações em tempo real
- [ ] Integração com API
- [ ] Exibição de resultados
- [ ] Tratamento de erros
- [ ] Loading states
- [ ] QR Code para NFC-e

### **Testes:**
- [ ] Venda NFC-e simples
- [ ] Venda NFe B2B
- [ ] Validação valor máximo
- [ ] Validação pagamentos
- [ ] Múltiplos pagamentos
- [ ] Consumidor identificado
- [ ] Tratamento de erros

---

## 🚀 **COMEÇAR IMPLEMENTAÇÃO**

**1. Primeiro:** Teste a API com `curl https://apinfe.nexopdv.com/api/status`
**2. Segundo:** Implemente caso simples NFC-e
**3. Terceiro:** Adicione validações
**4. Quarto:** Implemente interface completa

**📋 Documentação Completa:** `DOCUMENTACAO_FRONTEND_NFE_NFCE.md`
**🧪 Casos de Teste:** `CASOS_DE_USO_TESTES_API.md`

**✅ API PRONTA - IMPLEMENTAÇÃO PODE COMEÇAR AGORA!**
