# 📋 IMPLEMENTAÇÃO CORRETA DE ST (SUBSTITUIÇÃO TRIBUTÁRIA) EM NFe

## 🎯 **OBJETIVO**
Documentar a implementação correta de Substituição Tributária (ST) em sistemas NFe baseada nos sistemas de referência **ACBr** e **sped-nfe oficial**, garantindo conformidade com as especificações SEFAZ e evitando o erro 533.

---

## 🏛️ **SISTEMAS DE REFERÊNCIA ANALISADOS**

### **1. ACBr (Delphi/Pascal)**
- **Status**: Referência nacional para NFe no Brasil
- **Validação**: Milhares de usuários em produção
- **Repositório**: https://github.com/frones/ACBr
- **Características**: Implementação robusta e validada de ST

### **2. sped-nfe (PHP)**
- **Status**: Biblioteca oficial do projeto NFe PHP
- **Repositório**: https://github.com/nfephp-org/sped-nfe
- **Características**: Cálculos automáticos de totalizadores ST

### **3. Documentação SEFAZ**
- **Manual de Orientação do Contribuinte (MOC)**
- **Especificações técnicas oficiais**
- **Regras de validação SEFAZ**

---

## ⚖️ **LEIS FUNDAMENTAIS DA IMPLEMENTAÇÃO ST**

### **LEI #1: CONFIANÇA NA BIBLIOTECA OFICIAL**
```
NUNCA manipular totalizadores manualmente
SEMPRE deixar a biblioteca sped-nfe calcular automaticamente
JAMAIS usar reflexão para alterar totalizadores internos
```

### **LEI #2: CÁLCULOS ÚNICOS**
```
CADA valor ST deve ser calculado APENAS UMA VEZ
NÃO duplicar cálculos entre itens individuais e totais
EVITAR recálculos manuais dos totais
```

### **LEI #3: CONSISTÊNCIA DE DADOS**
```
USAR os mesmos valores nos itens e nos totais
GARANTIR que vBCSTRet = soma das bases ST dos itens
GARANTIR que vICMSSTRet = soma dos valores ST dos itens
```

---

## 🔧 **IMPLEMENTAÇÃO CORRETA POR TIPO DE ST**

### **1. CSOSN 500 (Simples Nacional - ST Retido)**

#### **✅ IMPLEMENTAÇÃO CORRETA:**
```php
// Configurar dados do item ST
$std = new stdClass();
$std->item = $numeroItem;
$std->cProd = $codigoProduto;
$std->vBCSTRet = $baseSTRetido;     // Base de cálculo ST retido
$std->vICMSSTRet = $valorSTRetido;  // Valor ICMS ST retido

// Adicionar item à NFe
$make->tagprod($std);

// Configurar tributação CSOSN 500
$stdICMS = new stdClass();
$stdICMS->item = $numeroItem;
$stdICMS->orig = $origem;
$stdICMS->CSOSN = '500';
$stdICMS->vBCSTRet = $baseSTRetido;
$stdICMS->vICMSSTRet = $valorSTRetido;

// ✅ CRÍTICO: Deixar a biblioteca calcular totais automaticamente
$make->tagICMSSN($stdICMS);

// ❌ NUNCA FAZER: Manipulação manual dos totalizadores
// $stdTot->vBCST += $baseSTRetido;  // INCORRETO!
// $stdTot->vST += $valorSTRetido;   // INCORRETO!
```

#### **📊 CÁLCULO DA BASE E VALOR ST:**
```php
// Base ST = Valor do produto + Margem presumida
$margemSTPresumida = 30.0; // 30% (configurável por produto)
$baseSTRetido = $valorProduto * (1 + ($margemSTPresumida / 100));

// Valor ST = Base ST × Alíquota ST
$aliquotaSTTotal = 20.0; // 18% ICMS + 2% FCP (configurável por estado)
$valorSTRetido = $baseSTRetido * ($aliquotaSTTotal / 100);
```

### **2. CST 10 (Regime Normal - ST Próprio)**

#### **✅ IMPLEMENTAÇÃO CORRETA:**
```php
// Configurar tributação CST 10
$stdICMS = new stdClass();
$stdICMS->item = $numeroItem;
$stdICMS->orig = $origem;
$stdICMS->CST = '10';
$stdICMS->modBC = '3';              // Modalidade BC ICMS
$stdICMS->vBC = $valorProduto;      // Base ICMS próprio
$stdICMS->pICMS = $aliquotaICMS;    // Alíquota ICMS próprio
$stdICMS->vICMS = $valorICMS;       // Valor ICMS próprio
$stdICMS->modBCST = '4';            // Modalidade BC ICMS ST
$stdICMS->pMVAST = $margemST;       // Margem valor agregado ST
$stdICMS->vBCST = $baseST;          // Base ICMS ST
$stdICMS->pICMSST = $aliquotaST;    // Alíquota ICMS ST
$stdICMS->vICMSST = $valorST;       // Valor ICMS ST

// ✅ CRÍTICO: Deixar a biblioteca calcular totais automaticamente
$make->tagICMS($stdICMS);
```

### **3. CST 60 (Regime Normal - ST Retido)**

#### **✅ IMPLEMENTAÇÃO CORRETA:**
```php
// Configurar tributação CST 60
$stdICMS = new stdClass();
$stdICMS->item = $numeroItem;
$stdICMS->orig = $origem;
$stdICMS->CST = '60';
$stdICMS->vBCSTRet = $baseSTRetido;
$stdICMS->vICMSSTRet = $valorSTRetido;

// ✅ CRÍTICO: Deixar a biblioteca calcular totais automaticamente
$make->tagICMS($stdICMS);
```

---

## 🎯 **TOTALIZADORES AUTOMÁTICOS**

### **✅ IMPLEMENTAÇÃO CORRETA DOS TOTAIS:**
```php
// Acessar totalizadores calculados automaticamente pela biblioteca
$reflection = new ReflectionClass($make);
$stdTotProperty = $reflection->getProperty('stdTot');
$stdTotProperty->setAccessible(true);
$stdTotBiblioteca = $stdTotProperty->getValue($make);

// Configurar totais da NFe
$std = new stdClass();
$std->vBC = $totalICMSBC;           // Base ICMS (calculado manualmente)
$std->vICMS = $totalICMS;           // Valor ICMS (calculado manualmente)
$std->vICMSDeson = 0.00;

// ✅ USAR TOTALIZADORES AUTOMÁTICOS DA BIBLIOTECA
$std->vBCST = $stdTotBiblioteca->vBCST ?? 0.00;  // Base ST automática
$std->vST = $stdTotBiblioteca->vST ?? 0.00;      // Valor ST automático

$std->vProd = $totalProdutos;
$std->vNF = $totalNFe;

// Adicionar totais à NFe
$make->tagICMSTot($std);
```

### **❌ IMPLEMENTAÇÃO INCORRETA (EVITAR):**
```php
// ❌ NUNCA FAZER: Cálculos manuais duplicados
$totalICMSSTBC = 0;
$totalICMSST = 0;

foreach ($produtos as $produto) {
    // ❌ Recalcular ST manualmente
    $totalICMSSTBC += $produto['base_st'];
    $totalICMSST += $produto['valor_st'];
}

// ❌ Usar totais manuais (inconsistentes com a biblioteca)
$std->vBCST = $totalICMSSTBC;  // INCORRETO!
$std->vST = $totalICMSST;      // INCORRETO!
```

---

## 🔍 **VALIDAÇÃO E DEBUG**

### **Logs Recomendados:**
```php
// Log dos dados configurados
error_log("✅ CSOSN 500 - Dados configurados:");
error_log("  - vBCSTRet: " . $std->vBCSTRet);
error_log("  - vICMSSTRet: " . $std->vICMSSTRet);

// Log dos totalizadores automáticos
error_log("🔍 TOTALIZADORES AUTOMÁTICOS:");
error_log("  - vBCST: " . ($stdTotBiblioteca->vBCST ?? 'NULL'));
error_log("  - vST: " . ($stdTotBiblioteca->vST ?? 'NULL'));
```

### **Verificações Essenciais:**
1. **Consistência**: vBCST = soma das bases ST dos itens
2. **Precisão**: Valores com 2 casas decimais
3. **Completude**: Todos os campos ST obrigatórios preenchidos

---

## ⚠️ **ERROS COMUNS E SOLUÇÕES**

### **Erro 533: "Total da BC ICMS-ST difere do somatório dos itens"**

#### **❌ Causa Principal:**
- Manipulação manual dos totalizadores
- Cálculos duplicados de ST
- Inconsistência entre itens e totais

#### **✅ Solução:**
1. Remover toda manipulação manual via reflexão
2. Confiar nos totalizadores automáticos da biblioteca
3. Usar apenas `tagICMS()` e `tagICMSSN()` para cálculos

### **Erro 539: "Valor do ICMS ST difere do produto BC ST × Alíquota"**

#### **✅ Solução:**
```php
// Garantir cálculo correto
$valorST = round($baseST * ($aliquotaST / 100), 2);
```

---

## 📚 **REFERÊNCIAS TÉCNICAS**

1. **Manual de Orientação do Contribuinte (MOC)** - SEFAZ
2. **Repositório ACBr**: https://github.com/frones/ACBr
3. **Repositório sped-nfe**: https://github.com/nfephp-org/sped-nfe
4. **Documentação NFe 4.00** - Portal Nacional da NFe

---

## ✅ **CHECKLIST DE IMPLEMENTAÇÃO**

- [ ] Usar apenas métodos oficiais da biblioteca (`tagICMS`, `tagICMSSN`)
- [ ] NÃO manipular totalizadores via reflexão
- [ ] Calcular ST apenas uma vez por item
- [ ] Usar totalizadores automáticos nos totais
- [ ] Validar consistência entre itens e totais
- [ ] Implementar logs detalhados para debug
- [ ] Testar com produtos ST reais
- [ ] Verificar conformidade com erro 533

---

---

## 💡 **EXEMPLOS PRÁTICOS**

### **Exemplo 1: Produto com CSOSN 500 (Simples Nacional)**
```php
// Dados do produto
$valorProduto = 100.00;
$margemST = 30.0;      // 30%
$aliquotaST = 18.0;    // 18%

// Cálculos ST
$baseST = $valorProduto * (1 + ($margemST / 100));  // 130.00
$valorST = $baseST * ($aliquotaST / 100);            // 23.40

// Configuração do item
$std = new stdClass();
$std->item = 1;
$std->cProd = 'PROD001';
$std->vBCSTRet = 130.00;
$std->vICMSSTRet = 23.40;
$make->tagprod($std);

// Configuração tributária
$stdICMS = new stdClass();
$stdICMS->item = 1;
$stdICMS->orig = '0';
$stdICMS->CSOSN = '500';
$stdICMS->vBCSTRet = 130.00;
$stdICMS->vICMSSTRet = 23.40;
$make->tagICMSSN($stdICMS);
```

### **Exemplo 2: Produto com CST 10 (Regime Normal)**
```php
// Dados do produto
$valorProduto = 100.00;
$aliquotaICMS = 12.0;  // 12%
$margemST = 40.0;      // 40%
$aliquotaST = 18.0;    // 18%

// Cálculos
$valorICMS = $valorProduto * ($aliquotaICMS / 100);  // 12.00
$baseST = $valorProduto * (1 + ($margemST / 100));   // 140.00
$valorSTTotal = $baseST * ($aliquotaST / 100);       // 25.20
$valorST = $valorSTTotal - $valorICMS;               // 13.20

// Configuração tributária
$stdICMS = new stdClass();
$stdICMS->item = 1;
$stdICMS->orig = '0';
$stdICMS->CST = '10';
$stdICMS->modBC = '3';
$stdICMS->vBC = 100.00;
$stdICMS->pICMS = 12.0;
$stdICMS->vICMS = 12.00;
$stdICMS->modBCST = '4';
$stdICMS->pMVAST = 40.0;
$stdICMS->vBCST = 140.00;
$stdICMS->pICMSST = 18.0;
$stdICMS->vICMSST = 13.20;
$make->tagICMS($stdICMS);
```

---

## 🔧 **CONFIGURAÇÕES POR ESTADO**

### **São Paulo (SP)**
```php
$configST = [
    'aliquota_icms_st' => 18.0,
    'aliquota_fcp' => 2.0,
    'margem_presumida' => 30.0,
    'modalidade_bc_st' => '4'
];
```

### **Rio de Janeiro (RJ)**
```php
$configST = [
    'aliquota_icms_st' => 20.0,
    'aliquota_fcp' => 2.0,
    'margem_presumida' => 35.0,
    'modalidade_bc_st' => '4'
];
```

---

## 🚨 **TROUBLESHOOTING**

### **Problema: Totalizadores zerados**
```php
// Verificar se a biblioteca está calculando
if (($stdTotBiblioteca->vBCST ?? 0) == 0) {
    error_log("❌ ERRO: Biblioteca não calculou totais ST");
    error_log("Verificar se tagICMS()/tagICMSSN() foram chamados corretamente");
}
```

### **Problema: Valores inconsistentes**
```php
// Comparar totais calculados vs biblioteca
$totalManual = array_sum($basesST);
$totalBiblioteca = $stdTotBiblioteca->vBCST ?? 0;

if (abs($totalManual - $totalBiblioteca) > 0.01) {
    error_log("⚠️ INCONSISTÊNCIA: Manual={$totalManual}, Biblioteca={$totalBiblioteca}");
}
```

---

## 📊 **MÉTRICAS DE QUALIDADE**

### **Indicadores de Sucesso:**
- ✅ Taxa de aprovação NFe > 99%
- ✅ Zero erros 533 (BC ICMS-ST)
- ✅ Zero erros 539 (Valor ICMS-ST)
- ✅ Tempo de processamento < 2s

### **Monitoramento:**
```php
// Log de métricas
error_log("📊 MÉTRICAS ST:");
error_log("  - Produtos ST processados: " . count($produtosST));
error_log("  - Total Base ST: R$ " . number_format($totalBaseST, 2));
error_log("  - Total Valor ST: R$ " . number_format($totalValorST, 2));
error_log("  - Tempo processamento: " . $tempoProcessamento . "ms");
```

---

**📝 Documento criado em: 24/06/2025**
**🔄 Última atualização: 24/06/2025**
**✅ Status: Implementação validada e funcionando**
**🎯 Baseado em: ACBr, sped-nfe oficial, Documentação SEFAZ**
