# NFC-e - Detalhes Técnicos da Implementação

## 🔧 **ESTRUTURA TÉCNICA ATUAL**

### **Arquivo Principal:** `/root/nexo/nexo-pedidos/backend/public/emitir-nfce.php`

### **Função de Busca de Dados Fiscais:**
```php
function buscarDadosFiscaisProduto($codigoProduto, $empresaId) {
    // Busca dados fiscais REAIS do produto na tabela produtos
    // Retorna: cst_pis, aliquota_pis, cst_cofins, aliquota_cofins, cst_icms
}
```

### **Sequência de Criação das Tags (ORDEM CORRETA):**

1. **taginfNFe()** - Container principal
2. **tagide()** - Identificação (cNF ≠ nNF conforme NT2019.001)
3. **tagemit()** - Dados do emitente
4. **tagenderEmit()** - Endereço do emitente
5. **tagprod()** - Dados do produto
6. **tagimposto()** - Container de impostos (OBRIGATÓRIO)
7. **tagICMSSN()** - ICMS Simples Nacional
8. **tagPIS()** - PIS com dados reais
9. **tagCOFINS()** - COFINS with dados reais
10. **tagICMSTot()** - Totais calculados
11. **tagtransp()** - Transporte
12. **tagpag()** - Container de pagamento
13. **tagdetPag()** - Detalhes do pagamento
14. **taginfAdic()** - Informações adicionais

## 💾 **DADOS FISCAIS REAIS IMPLEMENTADOS**

### **Produto SKOL LATA 350ml (Código: 1):**
```json
{
  "cst_pis": "01",
  "aliquota_pis": 1.65,
  "cst_cofins": "01",
  "aliquota_cofins": 7.6,
  "cst_icms": null
}
```

### **Cálculos Implementados:**
```php
// PIS
$std->vBC = $valorTotal; // Base de cálculo = valor do produto
$std->pPIS = (float)$produtoFiscal['aliquota_pis']; // 1.65%
$std->vPIS = round(($valorTotal * $std->pPIS) / 100, 2); // R$ 0,71

// COFINS  
$std->vBC = $valorTotal; // Base de cálculo = valor do produto
$std->pCOFINS = (float)$produtoFiscal['aliquota_cofins']; // 7.6%
$std->vCOFINS = round(($valorTotal * $std->pCOFINS) / 100, 2); // R$ 3,25
```

## 🔍 **PROBLEMA ESPECÍFICO IDENTIFICADO**

### **Erro Técnico:**
```
TypeError: Argument 1 passed to NFePHP\Common\DOMImproved::appChild() 
must be an instance of DOMElement, null given, called in 
/root/nexo/nexo-pedidos/backend/vendor/nfephp-org/sped-nfe/src/Make.php on line 476
```

### **Localização do Erro:**
- **Arquivo:** `vendor/nfephp-org/sped-nfe/src/Make.php`
- **Linha:** 476
- **Método:** `appChild()`
- **Problema:** Elemento DOM sendo passado como `null`

### **Contexto do Travamento:**
- Todas as tags são criadas com sucesso
- `getErrors()` retorna array vazio
- Processo para especificamente no `monta()`
- Timeout de 60 segundos não é atingido

## 🧪 **TESTES REALIZADOS**

### **Teste 1: Validação de Dados**
```php
$errors = $make->getErrors();
// Resultado: Array vazio (sem erros)
```

### **Teste 2: Verificação de Tags**
```php
// Todas as tags reportam criação com sucesso nos logs:
// STEP_053: Tag IDE criada com sucesso
// STEP_060: Tag emitente criada com sucesso  
// STEP_079: Tag endereço emitente criada com sucesso
// STEP_124: Tag produto 1 criada com sucesso
// STEP_129: ICMS criado com sucesso
// STEP_133: PIS criado com sucesso
// STEP_137: COFINS criado com sucesso
// STEP_144: Totais criados com sucesso
```

### **Teste 3: Dados Fiscais**
```php
// STEP_FISCAL_SUCCESS: Dados fiscais carregados para produto 1
// PIS: CST "01", Alíquota 1.65%, Valor R$ 0,71
// COFINS: CST "01", Alíquota 7.6%, Valor R$ 3,25
```

## 🔧 **CONFIGURAÇÃO DA BIBLIOTECA**

### **Inicialização sped-nfe:**
```php
$config = [
    "atualizacao" => date('Y-m-d H:i:s'),
    "tpAmb" => (int)$empresa['ambiente'],
    "razaosocial" => $empresa['razao_social'],
    "cnpj" => $cnpjLimpo,
    "siglaUF" => $empresa['uf'],
    "schemes" => "PL_009_V4",
    "versao" => "4.00",
    "CSC" => $csc,
    "CSCid" => $cscId
];

$make = new Make();
$tools = new Tools(json_encode($config), Certificate::readPfx($certificado, $senha));
$tools->model('65'); // NFC-e
```

## 📊 **LOGS DETALHADOS DO ÚLTIMO TESTE**

### **Início do Processo:**
```
[2025-06-12 06:57:25] STEP_001: Iniciando endpoint NFC-e
[2025-06-12 06:57:25] STEP_002: Carregando dependências
[2025-06-12 06:57:25] STEP_003: Dependências carregadas com sucesso
```

### **Configuração da Empresa:**
```
[2025-06-12 06:57:26] STEP_025: Configurações carregadas com sucesso
[2025-06-12 06:57:26] STEP_044: Biblioteca sped-nfe completamente inicializada
```

### **Criação das Tags:**
```
[2025-06-12 06:57:26] STEP_053: Tag IDE criada com sucesso
[2025-06-12 06:57:26] STEP_060: Tag emitente criada com sucesso
[2025-06-12 06:57:26] STEP_124: Tag produto 1 criada com sucesso
[2025-06-12 06:57:26] STEP_137: COFINS criado com sucesso
[2025-06-12 06:57:26] STEP_144: Totais criados com sucesso
```

### **Ponto de Travamento:**
```
[2025-06-12 06:57:26] STEP_164.0: Verificando dados antes do monta()
[2025-06-12 06:57:26] STEP_163.3: Biblioteca sem erros, prosseguindo
[2025-06-12 06:57:26] STEP_164.0.2: Dados validados, iniciando monta() com timeout de 60s
[PROCESSO TRAVA AQUI - SEM LOGS ADICIONAIS]
```

## 🎯 **INVESTIGAÇÃO RECOMENDADA**

### **1. Capturar Erro Específico:**
```php
try {
    $xml = $make->monta();
} catch (Exception $e) {
    // Capturar: message, file, line, trace
    // Identificar qual tag/elemento está null
}
```

### **2. Verificar Estrutura DOM:**
```php
// Antes do monta(), verificar se algum elemento DOM está null
// Comparar com estrutura da NFe que funciona
```

### **3. Teste com Dados Mínimos:**
```php
// Criar NFC-e apenas com tags obrigatórias
// Adicionar tags uma por vez até identificar problema
```

## 🔄 **COMPARAÇÃO COM NFE FUNCIONANDO**

### **NFe (Modelo 55) - FUNCIONA:**
- Usa mesma biblioteca sped-nfe
- Mesma empresa e certificado
- Mesmo ambiente (homologação)
- Estrutura similar de tags

### **NFC-e (Modelo 65) - PROBLEMA:**
- Mesma biblioteca e configuração
- Tags criadas com sucesso
- Trava especificamente no `monta()`

### **Diferenças Identificadas:**
- **Modelo:** 55 vs 65
- **Tags específicas:** Algumas tags podem ser diferentes entre NFe/NFC-e
- **Validações:** NFC-e pode ter validações adicionais

## 🚨 **AÇÃO IMEDIATA NECESSÁRIA**

**FOQUE EM CAPTURAR O ERRO ESPECÍFICO DO `monta()`:**

1. Execute o teste de NFC-e
2. Implemente try/catch detalhado no `monta()`
3. Capture: message, file, line, trace completo
4. Identifique qual elemento DOM está sendo passado como null
5. Corrija o problema específico

**NÃO CRIE CONTORNOS - ENCONTRE A CAUSA RAIZ!**

A solução está muito próxima. O problema é específico e identificável através do erro do `monta()`.
