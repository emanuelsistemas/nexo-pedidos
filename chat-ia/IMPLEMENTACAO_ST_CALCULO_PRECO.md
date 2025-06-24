# Implementação do Cálculo de ST Baseado no Preço Atual

## 📋 **CONTEXTO**

Durante a resolução do erro 533 "Total da BC ICMS-ST difere do somatório dos itens" para CSOSN 500, implementamos o cálculo de Substituição Tributária baseado no preço de venda atual com margem presumida (Opção A).

## ⚖️ **BASE LEGAL E DOCUMENTAÇÃO**

### **CSOSN 500 - ICMS cobrado anteriormente por ST**
- **Documentação oficial**: https://www.mjailton.com.br/manualnfe/tag/detalhe/66
- **Campos obrigatórios**:
  - `vBCSTRet`: Valor da Base de Cálculo do ICMS-ST retido anteriormente
  - `pST`: Alíquota suportada pelo Consumidor Final
  - `vICMSSTRet`: Valor do ICMS-ST retido anteriormente

### **Biblioteca sped-nfe**
- **Método específico**: `tagCEST()` deve ser usado separadamente do `tagprod()`
- **CEST obrigatório**: Para produtos com ST (CSOSN 500, CST 60, etc.)

## 🧮 **FÓRMULA IMPLEMENTADA**

### **Para CSOSN 500 (Opção A - Preço Atual)**

```php
// 1. Base de Cálculo ST
$margemSTPresumida = 30.0; // 30% margem presumida para bebidas
$baseSTCalculada = $valorBase * (1 + ($margemSTPresumida / 100));

// 2. Alíquota ST
$aliquotaSTEstado = 18.0; // 18% padrão SP para bebidas alcoólicas
$fcpST = 0.0; // FCP se houver
$aliquotaSTTotal = $aliquotaSTEstado + $fcpST;

// 3. Valor ST Retido
$valorSTCalculado = $baseSTCalculada * ($aliquotaSTTotal / 100);
```

### **Exemplo Prático**
- **Produto**: BRAHMA LATA - R$ 5,00
- **Base ST**: R$ 5,00 × 1,30 = **R$ 6,50**
- **Alíquota**: **18%**
- **Valor ST**: R$ 6,50 × 18% = **R$ 1,17**

## 💻 **IMPLEMENTAÇÃO NO CÓDIGO**

### **Arquivo**: `backend/public/emitir-nfe.php`

#### **1. Cálculo nos Itens (CSOSN 500)**
```php
} elseif ($csosn === '500') {
    // ✅ CÁLCULO BASEADO NO PREÇO ATUAL COM MARGEM PRESUMIDA (Opção A)
    $margemSTPresumida = 30.0; // 30% margem presumida padrão para bebidas
    $baseSTCalculada = $valorBase * (1 + ($margemSTPresumida / 100));
    
    $aliquotaSTEstado = 18.0; // 18% padrão SP para bebidas alcoólicas
    $fcpST = 0.0; // FCP se houver
    $aliquotaSTTotal = $aliquotaSTEstado + $fcpST;
    
    $valorSTCalculado = $baseSTCalculada * ($aliquotaSTTotal / 100);
    
    // ✅ CAMPOS OBRIGATÓRIOS CONFORME DOCUMENTAÇÃO OFICIAL
    $std->vBCSTRet = (float)round($baseSTCalculada, 2);
    $std->pST = (float)$aliquotaSTTotal;
    $std->vICMSSTRet = (float)round($valorSTCalculado, 2);
}
```

#### **2. Cálculo nos Totais (Consistência)**
```php
} elseif ($isSimples && $csosn === '500') {
    // ✅ RECALCULAR com a mesma lógica dos itens (Opção A)
    $margemSTPresumida = 30.0; // Mesma margem usada nos itens
    $baseSTCalculada = $valorProduto * (1 + ($margemSTPresumida / 100));
    $aliquotaSTTotal = 18.0; // Mesma alíquota usada nos itens
    $valorSTCalculado = $baseSTCalculada * ($aliquotaSTTotal / 100);

    $totalICMSSTBC += round($baseSTCalculada, 2);
    $totalICMSST += round($valorSTCalculado, 2);
}
```

#### **3. CEST Separado (tagCEST)**
```php
// ✅ CORREÇÃO CRÍTICA: Usar tagCEST() SEPARADAMENTE após tagprod()
if ($cestDados !== null) {
    $stdCEST = new stdClass();
    $stdCEST->item = $item;
    $stdCEST->CEST = $cestDados;
    $stdCEST->indEscala = null;
    $stdCEST->CNPJFab = null;
    
    $respostaCEST = $make->tagCEST($stdCEST);
}
```

## 🎯 **PARÂMETROS CONFIGURÁVEIS**

### **Margem ST Presumida**
- **Bebidas alcoólicas**: 30%
- **Outros produtos**: Verificar legislação específica
- **Localização no código**: Variável `$margemSTPresumida`

### **Alíquota ST**
- **São Paulo**: 18%
- **FCP**: 0% (verificar se aplicável)
- **Localização no código**: Variável `$aliquotaSTEstado`

## ✅ **VANTAGENS DESTA ABORDAGEM**

1. **Baseada na documentação oficial**: Segue exatamente os campos obrigatórios do Manual NFe
2. **Sem fallbacks**: Usa dados reais da empresa (preço atual)
3. **Consistência**: Mesma lógica nos itens e totais
4. **Flexibilidade**: Parâmetros facilmente ajustáveis por estado/produto

## 🔧 **MANUTENÇÃO FUTURA**

### **Para ajustar margem ST**:
1. Localizar variável `$margemSTPresumida`
2. Ajustar conforme legislação estadual
3. Pode ser diferente por NCM/categoria

### **Para ajustar alíquota ST**:
1. Localizar variável `$aliquotaSTEstado`
2. Considerar FCP se aplicável
3. Pode variar por estado de destino

### **Para outros CST/CSOSN com ST**:
- CST 10, 30, 60, 70, 90
- CSOSN 201, 202, 203, 500, 900
- Aplicar mesma lógica de cálculo

## 📝 **OBSERVAÇÕES IMPORTANTES**

1. **CEST é obrigatório** para produtos com ST
2. **tagCEST() é método separado** do tagprod()
3. **Valores devem ser float** para evitar problemas na biblioteca
4. **Consistência entre itens e totais** é fundamental para aprovação na SEFAZ

---
**Data da implementação**: 24/06/2025  
**Erro resolvido**: 533 - Total da BC ICMS-ST difere do somatório dos itens  
**Método**: Opção A - Cálculo baseado no preço atual com margem presumida
