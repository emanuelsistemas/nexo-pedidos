# 🧾 Implementação NFC-e (Nota Fiscal de Consumidor Eletrônica) - Modelo 65

## 📋 Visão Geral
Documentação completa para implementação de NFC-e no sistema Nexo Pedidos, utilizando a mesma infraestrutura da NFe mas com adaptações específicas para o modelo 65.

---

## 🎯 Objetivos da NFC-e

### Diferenças Principais NFe vs NFC-e
| Aspecto | NFe (Modelo 55) | NFC-e (Modelo 65) |
|---------|-----------------|-------------------|
| **Finalidade** | B2B (empresa para empresa) | B2C (empresa para consumidor) |
| **Destinatário** | Obrigatório CNPJ/CPF | CPF opcional |
| **Valor Limite** | Sem limite | Até R$ 5.000,00 por documento |
| **DANFE** | A4 completo | Cupom fiscal (58mm) |
| **Contingência** | Offline disponível | Apenas online |
| **Transporte** | Seção obrigatória | Não aplicável |
| **Intermediador** | Opcional | Não aplicável |

---

## 🏗️ Arquitetura NFC-e

### Fluxo Simplificado
```
PDV (Frontend) → API NFC-e (VPS) → SEFAZ → Impressão Cupom
       ↓              ↓
  Supabase DB ← Salva resultado
```

### Componentes Necessários
1. **Interface NFC-e** - Formulário simplificado
2. **API Endpoints** - Extensão da API NFe existente
3. **Service NFC-e** - Adaptação do NFeService
4. **Impressão** - Template cupom 58mm

---

## 📱 Interface NFC-e - Especificações

### Página: `NfcePage.tsx`
**Localização**: `src/pages/dashboard/NfcePage.tsx`

### Seções Simplificadas (vs NFe)
```
NfcePage
├── Lista de NFC-e (Grid com filtros)
├── NfceForm (Formulário simplificado)
    ├── IdentificacaoSection (básica)
    ├── ConsumidorSection (CPF opcional)
    ├── ProdutosSection (reutilizar da NFe)
    ├── TotaisSection (simplificada)
    ├── PagamentosSection (obrigatória)
    └── EmissaoSection (imediata)
```

### Campos Obrigatórios NFC-e
```typescript
interface NFCe {
  // Identificação
  modelo: 65; // Fixo
  serie: number;
  numero: number;
  data_emissao: string;
  
  // Consumidor (opcional)
  consumidor_cpf?: string;
  consumidor_nome?: string;
  
  // Produtos (obrigatório)
  produtos: Produto[];
  
  // Totais (calculados)
  total_produtos: number;
  total_desconto: number;
  total_nota: number;
  
  // Pagamentos (obrigatório)
  pagamentos: Pagamento[];
  
  // Status
  status_nfce: 'pendente' | 'autorizada' | 'cancelada';
  chave_acesso?: string;
  protocolo_uso?: string;
  qr_code?: string; // Específico NFC-e
}
```

---

## 🔧 API NFC-e - Endpoints

### Base URL: `https://apinfe.nexopdv.com`

### 1. POST /api/gerar-nfce
**Gera XML da NFC-e**
```json
{
  "empresa": {
    "cnpj": "12345678000195",
    "razao_social": "Empresa Teste LTDA",
    "inscricao_estadual": "123456789"
  },
  "consumidor": {
    "cpf": "12345678901", // Opcional
    "nome": "João Silva"   // Opcional
  },
  "produtos": [
    {
      "codigo": "001",
      "descricao": "Produto Teste",
      "ncm": "12345678",
      "cfop": "5102",
      "unidade": "UN",
      "quantidade": 1,
      "valor_unitario": 10.00,
      "valor_total": 10.00
    }
  ],
  "pagamentos": [
    {
      "tipo": "01", // Dinheiro
      "valor": 10.00
    }
  ],
  "totais": {
    "valor_produtos": 10.00,
    "valor_desconto": 0.00,
    "valor_total": 10.00
  }
}
```

### 2. POST /api/enviar-nfce-sefaz
**Envia NFC-e para SEFAZ**
```json
{
  "xml": "<?xml version='1.0'...",
  "chave": "35240512345678000195650010000000011234567890"
}
```

### 3. GET /api/consultar-nfce/{chave}
**Consulta status na SEFAZ**

### 4. POST /api/cancelar-nfce
**Cancela NFC-e autorizada**
```json
{
  "chave": "35240512345678000195650010000000011234567890",
  "justificativa": "Erro na emissão"
}
```

---

## 🛠️ Service NFC-e - NFCeService.php

### Localização: `api/app/Services/NFCeService.php`

### Diferenças do NFeService:
```php
<?php

namespace App\Services;

use NFePHP\NFe\Make;
use NFePHP\NFe\Tools;

class NFCeService extends NFeService
{
    protected function configurarNFCe($empresa, $totais)
    {
        $std = new \stdClass();
        $std->cUF = $empresa['codigo_uf'];
        $std->cNF = str_pad(rand(1, 99999999), 8, '0', STR_PAD_LEFT);
        $std->natOp = 'VENDA';
        $std->mod = 65; // NFC-e
        $std->serie = $empresa['serie_nfce'] ?? 1;
        $std->nNF = $this->proximoNumeroNFCe($empresa['id']);
        $std->dhEmi = date('Y-m-d\TH:i:sP');
        $std->tpNF = 1; // Saída
        $std->idDest = 1; // Operação interna
        $std->cMunFG = $empresa['codigo_municipio'];
        $std->tpImp = 4; // DANFE NFC-e
        $std->tpEmis = 1; // Emissão normal
        $std->tpAmb = $empresa['ambiente'] ?? 2; // Homologação
        $std->finNFe = 1; // NFe normal
        $std->indFinal = 1; // Consumidor final
        $std->indPres = 1; // Operação presencial
        $std->procEmi = 0; // Emissão própria
        $std->verProc = '1.0';
        
        $this->make->tagide($std);
    }
    
    protected function adicionarConsumidor($consumidor = null)
    {
        if ($consumidor && !empty($consumidor['cpf'])) {
            // Consumidor identificado
            $std = new \stdClass();
            $std->CPF = preg_replace('/\D/', '', $consumidor['cpf']);
            $std->xNome = $consumidor['nome'] ?? 'CONSUMIDOR';
            $std->indIEDest = 9; // Não contribuinte
            
            $this->make->tagdest($std);
        } else {
            // Consumidor não identificado
            $std = new \stdClass();
            $std->xNome = 'CONSUMIDOR';
            $std->indIEDest = 9; // Não contribuinte
            
            $this->make->tagdest($std);
        }
    }
    
    public function gerarNFCe($empresa, $consumidor, $produtos, $totais, $pagamentos)
    {
        try {
            // 1. Configurar NFC-e
            $this->configurarNFCe($empresa, $totais);
            
            // 2. Adicionar emitente
            $this->adicionarEmitente($empresa);
            
            // 3. Adicionar consumidor
            $this->adicionarConsumidor($consumidor);
            
            // 4. Adicionar produtos
            foreach ($produtos as $index => $produto) {
                $this->adicionarProduto($produto, $index + 1);
            }
            
            // 5. Adicionar totais
            $this->adicionarTotais($totais);
            
            // 6. Adicionar pagamentos (obrigatório NFC-e)
            $this->adicionarPagamentos($pagamentos);
            
            // 7. Gerar XML
            $xml = $this->make->monta();
            $chave = $this->make->getChave();
            
            return [
                'xml' => $xml,
                'chave' => $chave,
                'numero_nfce' => $this->ultimoNumeroGerado
            ];
            
        } catch (Exception $e) {
            throw new Exception('Erro ao gerar NFC-e: ' . $e->getMessage());
        }
    }
}
```

---

## 📊 Banco de Dados - Adaptações

### Tabela `pdv` (já existente)
```sql
-- Campo modelo_documento já suporta:
-- 55 = NFe
-- 65 = NFC-e

-- Campos específicos NFC-e a adicionar:
ALTER TABLE pdv ADD COLUMN qr_code TEXT NULL;
ALTER TABLE pdv ADD COLUMN url_consulta VARCHAR(500) NULL;
```

### Filtros por Modelo
```sql
-- NFe
SELECT * FROM pdv WHERE modelo_documento = 55;

-- NFC-e  
SELECT * FROM pdv WHERE modelo_documento = 65;

-- Ambos
SELECT * FROM pdv WHERE modelo_documento IN (55, 65);
```

---

## 🖨️ Impressão NFC-e

### Template Cupom 58mm
```html
<!-- Template: cupom-nfce.html -->
<div class="cupom-nfce" style="width: 58mm; font-family: monospace;">
  <div class="cabecalho">
    <h3>{{ empresa.razao_social }}</h3>
    <p>CNPJ: {{ empresa.cnpj }}</p>
    <p>{{ empresa.endereco }}</p>
    <hr>
  </div>
  
  <div class="produtos">
    <p><strong>CUPOM FISCAL ELETRÔNICO - SAT</strong></p>
    <p>NFC-e: {{ numero_nfce }}</p>
    <hr>
    
    {{#each produtos}}
    <div class="item">
      <p>{{ codigo }} - {{ descricao }}</p>
      <p>{{ quantidade }} x {{ valor_unitario }} = {{ valor_total }}</p>
    </div>
    {{/each}}
    <hr>
  </div>
  
  <div class="totais">
    <p>TOTAL: R$ {{ total_nota }}</p>
    <hr>
  </div>
  
  <div class="pagamentos">
    {{#each pagamentos}}
    <p>{{ tipo_descricao }}: R$ {{ valor }}</p>
    {{/each}}
    <hr>
  </div>
  
  <div class="qrcode">
    <img src="{{ qr_code_url }}" alt="QR Code">
    <p>Consulte pela chave de acesso:</p>
    <p style="font-size: 8px;">{{ chave_acesso }}</p>
  </div>
</div>
```

---

## 🚀 Próximos Passos

### Fase 1: Interface (1-2 dias)
- [ ] Criar `NfcePage.tsx`
- [ ] Implementar formulário simplificado
- [ ] Adaptar componentes existentes
- [ ] Testes de interface

### Fase 2: API (2-3 dias)  
- [ ] Criar `NFCeService.php`
- [ ] Implementar endpoints NFC-e
- [ ] Adaptar controllers existentes
- [ ] Testes de geração XML

### Fase 3: Integração (1-2 dias)
- [ ] Conectar frontend com API
- [ ] Implementar impressão cupom
- [ ] Testes end-to-end
- [ ] Validação SEFAZ

### Fase 4: Produção (1 dia)
- [ ] Deploy VPS
- [ ] Configuração certificados
- [ ] Testes produção
- [ ] Documentação final

---

**Total Estimado: 5-8 dias de desenvolvimento**

## 📝 Observações Importantes

### Limitações NFC-e
- ⚠️ **Valor máximo**: R$ 5.000,00 por documento
- ⚠️ **Apenas online**: Não há contingência offline
- ⚠️ **Consumidor final**: Apenas para pessoa física
- ⚠️ **Pagamento obrigatório**: Deve informar forma de pagamento

### Vantagens NFC-e
- ✅ **Processo simplificado**: Menos campos obrigatórios
- ✅ **Emissão rápida**: Interface otimizada para PDV
- ✅ **Integração PDV**: Já tem botões implementados
- ✅ **Mesma infraestrutura**: Reutiliza API NFe existente

---

**Data de Criação**: 2024-12-19  
**Versão**: 1.0  
**Status**: Documentação Completa - Pronta para Implementação
