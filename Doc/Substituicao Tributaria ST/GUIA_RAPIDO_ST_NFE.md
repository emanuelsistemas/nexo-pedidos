# ⚡ GUIA RÁPIDO - IMPLEMENTAÇÃO ST EM NFe

## 🎯 **RESUMO EXECUTIVO**
Guia prático para implementação correta de Substituição Tributária (ST) em NFe usando a biblioteca sped-nfe, baseado nos sistemas de referência ACBr e sped-nfe oficial.

---

## 🚨 **REGRA DE OURO**
```
NUNCA manipule totalizadores manualmente
SEMPRE deixe a biblioteca sped-nfe calcular automaticamente
JAMAIS use reflexão para alterar totalizadores internos
```

---

## ⚡ **IMPLEMENTAÇÃO RÁPIDA**

### **1. CSOSN 500 (Simples Nacional - ST Retido)**
```php
// Calcular valores ST
$baseST = $valorProduto * 1.30;  // +30% margem
$valorST = $baseST * 0.18;       // 18% alíquota

// Configurar item
$std = new stdClass();
$std->item = $numeroItem;
$std->cProd = $codigoProduto;
$std->vBCSTRet = $baseST;
$std->vICMSSTRet = $valorST;
$make->tagprod($std);

// Configurar tributação
$stdICMS = new stdClass();
$stdICMS->item = $numeroItem;
$stdICMS->orig = '0';
$stdICMS->CSOSN = '500';
$stdICMS->vBCSTRet = $baseST;
$stdICMS->vICMSSTRet = $valorST;
$make->tagICMSSN($stdICMS);  // ✅ Biblioteca calcula totais
```

### **2. CST 60 (Regime Normal - ST Retido)**
```php
// Configurar tributação
$stdICMS = new stdClass();
$stdICMS->item = $numeroItem;
$stdICMS->orig = '0';
$stdICMS->CST = '60';
$stdICMS->vBCSTRet = $baseSTRetido;
$stdICMS->vICMSSTRet = $valorSTRetido;
$make->tagICMS($stdICMS);  // ✅ Biblioteca calcula totais
```

### **3. CST 10 (Regime Normal - ST Próprio)**
```php
// Calcular valores
$valorICMS = $valorProduto * ($aliquotaICMS / 100);
$baseST = $valorProduto * (1 + ($margemST / 100));
$valorSTTotal = $baseST * ($aliquotaST / 100);
$valorST = $valorSTTotal - $valorICMS;

// Configurar tributação
$stdICMS = new stdClass();
$stdICMS->item = $numeroItem;
$stdICMS->orig = '0';
$stdICMS->CST = '10';
$stdICMS->modBC = '3';
$stdICMS->vBC = $valorProduto;
$stdICMS->pICMS = $aliquotaICMS;
$stdICMS->vICMS = $valorICMS;
$stdICMS->modBCST = '4';
$stdICMS->pMVAST = $margemST;
$stdICMS->vBCST = $baseST;
$stdICMS->pICMSST = $aliquotaST;
$stdICMS->vICMSST = $valorST;
$make->tagICMS($stdICMS);  // ✅ Biblioteca calcula totais
```

---

## 🎯 **TOTAIS DA NFe**

### **✅ IMPLEMENTAÇÃO CORRETA:**
```php
// Acessar totalizadores automáticos da biblioteca
$reflection = new ReflectionClass($make);
$stdTotProperty = $reflection->getProperty('stdTot');
$stdTotProperty->setAccessible(true);
$stdTotBiblioteca = $stdTotProperty->getValue($make);

// Configurar totais
$std = new stdClass();
$std->vBC = $totalICMSBC;     // Calculado manualmente
$std->vICMS = $totalICMS;     // Calculado manualmente
$std->vICMSDeson = 0.00;

// ✅ USAR TOTALIZADORES AUTOMÁTICOS
$std->vBCST = $stdTotBiblioteca->vBCST ?? 0.00;
$std->vST = $stdTotBiblioteca->vST ?? 0.00;

$std->vProd = $totalProdutos;
$std->vNF = $totalNFe;

$make->tagICMSTot($std);
```

### **❌ NUNCA FAZER:**
```php
// ❌ Cálculos manuais duplicados
$totalSTManual = 0;
foreach ($produtos as $produto) {
    $totalSTManual += $produto['valor_st'];
}
$std->vST = $totalSTManual;  // ERRO 533!

// ❌ Manipulação via reflexão
$stdTot->vBCST += $valor;  // ERRO 533!
```

---

## 🔍 **DEBUG E LOGS**

### **Logs Essenciais:**
```php
// Log dos dados configurados
error_log("✅ CSOSN 500 configurado:");
error_log("  - vBCSTRet: " . $std->vBCSTRet);
error_log("  - vICMSSTRet: " . $std->vICMSSTRet);

// Log dos totalizadores automáticos
error_log("🔍 TOTALIZADORES AUTOMÁTICOS:");
error_log("  - vBCST: " . ($stdTotBiblioteca->vBCST ?? 'NULL'));
error_log("  - vST: " . ($stdTotBiblioteca->vST ?? 'NULL'));
```

### **Validação de Consistência:**
```php
// Verificar se biblioteca calculou
if (($stdTotBiblioteca->vBCST ?? 0) == 0 && $temProdutosST) {
    error_log("❌ ERRO: Biblioteca não calculou totais ST");
}
```

---

## ⚠️ **ERROS COMUNS**

### **Erro 533: "Total da BC ICMS-ST difere do somatório dos itens"**
```php
// ❌ CAUSA: Manipulação manual dos totalizadores
$stdTot->vBCST += $valor;  // REMOVE ISSO!

// ✅ SOLUÇÃO: Usar totalizadores automáticos
$std->vBCST = $stdTotBiblioteca->vBCST ?? 0.00;
```

### **Erro 539: "Valor do ICMS ST difere do produto BC ST × Alíquota"**
```php
// ✅ SOLUÇÃO: Garantir cálculo correto
$valorST = round($baseST * ($aliquotaST / 100), 2);
```

---

## 📊 **CONFIGURAÇÕES POR ESTADO**

### **Alíquotas Comuns:**
```php
$configST = [
    'SP' => ['icms_st' => 18.0, 'fcp' => 2.0, 'margem' => 30.0],
    'RJ' => ['icms_st' => 20.0, 'fcp' => 2.0, 'margem' => 35.0],
    'MG' => ['icms_st' => 18.0, 'fcp' => 2.0, 'margem' => 30.0],
];
```

---

## ✅ **CHECKLIST RÁPIDO**

### **Antes de Implementar:**
- [ ] Estudar documentação sped-nfe
- [ ] Analisar sistemas de referência (ACBr)
- [ ] Entender tipos de ST (CSOSN 500, CST 10, CST 60)

### **Durante a Implementação:**
- [ ] Usar apenas métodos públicos da biblioteca
- [ ] NÃO manipular totalizadores via reflexão
- [ ] Calcular ST apenas uma vez por item
- [ ] Implementar logs detalhados

### **Após a Implementação:**
- [ ] Testar com produtos ST reais
- [ ] Verificar ausência do erro 533
- [ ] Monitorar logs de produção
- [ ] Validar com SEFAZ

---

## 🚀 **COMANDOS DE TESTE**

### **Teste Local:**
```bash
# Build e deploy
npm run build && nexo-dev

# Verificar logs
curl https://nexodev.emasoftware.app/backend/public/logs.php
```

### **Teste de NFe:**
1. Acessar: `https://nexodev.emasoftware.app`
2. Ir para: NFe → Nova NFe
3. Adicionar produtos com ST
4. Emitir NFe
5. Verificar sucesso (sem erro 533)

---

## 📚 **REFERÊNCIAS RÁPIDAS**

### **Documentação:**
- [sped-nfe GitHub](https://github.com/nfephp-org/sped-nfe)
- [ACBr GitHub](https://github.com/frones/ACBr)
- [Manual NFe SEFAZ](https://www.nfe.fazenda.gov.br/)

### **Códigos ST Comuns:**
- **CSOSN 500**: ST retido (Simples Nacional)
- **CST 10**: ST próprio (Regime Normal)
- **CST 60**: ST retido anteriormente (Regime Normal)
- **CSOSN 201/202/203**: ST com crédito (Simples Nacional)

---

## 🎯 **RESUMO FINAL**

### **O QUE FAZER:**
1. ✅ Configurar dados ST nos itens
2. ✅ Chamar `tagICMS()` ou `tagICMSSN()`
3. ✅ Usar totalizadores automáticos nos totais
4. ✅ Implementar logs para debug

### **O QUE NÃO FAZER:**
1. ❌ Manipular totalizadores via reflexão
2. ❌ Recalcular ST nos totais
3. ❌ Usar valores manuais nos totais
4. ❌ Ignorar logs de erro

---

**⚡ LEMBRE-SE: A biblioteca sped-nfe é sua amiga - confie nela!**

---

**📝 Documento criado em: 24/06/2025**  
**🔄 Última atualização: 24/06/2025**  
**✅ Status: Guia validado e testado**  
**🎯 Baseado em: Implementação real funcionando no sistema Nexo Pedidos**
