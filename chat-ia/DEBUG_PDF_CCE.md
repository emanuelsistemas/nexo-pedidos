# 🔧 DEBUG ESPECÍFICO - PDF CCe

## 🚨 PROBLEMA EXATO

### **Sintoma:**
- Script `gerar-pdf-cce.php` executa até linha ~179
- Não retorna resposta (nem sucesso nem erro)
- Processo "trava" na biblioteca Daevento

### **Último Log Visto:**
```
📄 PDF CCe - XML é envEvento, extraindo elemento evento...
📄 PDF CCe - Elemento evento extraído: XXXX bytes
📄 PDF CCe - XML NFe original encontrado: path/to/nfe.xml
[PARA AQUI]
```

---

## 🔍 ANÁLISE TÉCNICA

### **XML Original Correto:**
```xml
<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
  <idLote>202506072200123</idLote>
  <evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
    <infEvento Id="ID1101103525062416323700015155001000000023170536345301">
      <cOrgao>35</cOrgao>
      <tpAmb>2</tpAmb>
      <CNPJ>24163237000151</CNPJ>
      <chNFe>35250624163237000151550010000000231705363453</chNFe>
      <dhEvento>2025-06-07T22:00:12-03:00</dhEvento>
      <tpEvento>110110</tpEvento>
      <nSeqEvento>1</nSeqEvento>
      <verEvento>1.00</verEvento>
      <detEvento versao="1.00">
        <descEvento>Carta de Correcao</descEvento>
        <xCorrecao>TESTE - Correção para validar geração de PDF com XML original</xCorrecao>
        <xCondUso>A Carta de Correcao e disciplinada pelo paragrafo 1o-A...</xCondUso>
      </detEvento>
    </infEvento>
    <Signature>...</Signature>
  </evento>
</envEvento>
```

### **Extração Implementada:**
```php
// Extrai apenas o elemento <evento> do <envEvento>
$eventos = $dom->getElementsByTagName('evento');
$evento = $eventos->item(0);
// Resultado: XML com apenas <evento>...</evento>
```

---

## 🎯 POSSÍVEIS CAUSAS

### **1. Dados do Emitente Incompletos**
```php
// Atual (dados fixos):
$dadosEmitente = [
    'razao' => 'Empresa Emitente',
    'logradouro' => '',
    'numero' => '',
    // ... campos vazios
];

// Solução: Extrair da NFe original
$dadosEmitente = extrairDadosEmitenteDaNFe($xmlNfeContent);
```

### **2. Biblioteca Daevento Espera Formato Diferente**
```php
// Testar diferentes formatos:
// A) Apenas <evento>
// B) <envEvento> completo  
// C) <retEvento> (resposta)
```

### **3. Erro Silencioso na Biblioteca**
```php
// Adicionar try-catch detalhado:
try {
    error_log("🔧 Criando Daevento...");
    $daevento = new Daevento($xmlContent, $dadosEmitente);
    
    error_log("🔧 Configurando Daevento...");
    $daevento->debugMode(true);
    
    error_log("🔧 Chamando render...");
    $pdfContent = $daevento->render();
    
    error_log("🔧 Render concluído: " . strlen($pdfContent) . " bytes");
} catch (Exception $e) {
    error_log("❌ ERRO Daevento: " . $e->getMessage());
} catch (Error $e) {
    error_log("❌ ERRO FATAL Daevento: " . $e->getMessage());
}
```

---

## 🛠️ SOLUÇÕES PARA TESTAR

### **SOLUÇÃO 1: Debug Detalhado**
```php
// Adicionar em gerar-pdf-cce.php linha ~175:
error_log("🔧 DEBUG - XML para Daevento: " . substr($xmlContent, 0, 500));
error_log("🔧 DEBUG - Dados emitente: " . json_encode($dadosEmitente));

// Testar criação da classe
try {
    $daevento = new Daevento($xmlContent, $dadosEmitente);
    error_log("✅ Daevento criado com sucesso");
} catch (Exception $e) {
    error_log("❌ Erro ao criar Daevento: " . $e->getMessage());
    throw $e;
}
```

### **SOLUÇÃO 2: Extrair Dados Reais do Emitente**
```php
// Função para extrair dados da NFe:
function extrairDadosEmitente($xmlNfeContent) {
    $dom = new DOMDocument();
    $dom->loadXML($xmlNfeContent);
    
    $emit = $dom->getElementsByTagName('emit')->item(0);
    if (!$emit) return null;
    
    return [
        'razao' => $emit->getElementsByTagName('xNome')->item(0)->nodeValue ?? '',
        'logradouro' => $emit->getElementsByTagName('xLgr')->item(0)->nodeValue ?? '',
        'numero' => $emit->getElementsByTagName('nro')->item(0)->nodeValue ?? '',
        'bairro' => $emit->getElementsByTagName('xBairro')->item(0)->nodeValue ?? '',
        'CEP' => $emit->getElementsByTagName('CEP')->item(0)->nodeValue ?? '',
        'municipio' => $emit->getElementsByTagName('xMun')->item(0)->nodeValue ?? '',
        'UF' => $emit->getElementsByTagName('UF')->item(0)->nodeValue ?? '',
        'telefone' => $emit->getElementsByTagName('fone')->item(0)->nodeValue ?? '',
        'email' => $emit->getElementsByTagName('email')->item(0)->nodeValue ?? ''
    ];
}
```

### **SOLUÇÃO 3: Testar Formato XML Diferente**
```php
// Testar se biblioteca aceita envEvento completo:
// Em vez de extrair <evento>, usar XML completo
$xmlContent = file_get_contents($xmlEncontrado); // XML original completo
```

### **SOLUÇÃO 4: Verificar Dependências**
```bash
# Verificar se todas as dependências estão instaladas:
cd backend
composer show nfephp-org/sped-da
composer show nfephp-org/sped-nfe

# Verificar se há conflitos:
composer diagnose
```

---

## 🧪 SCRIPT DE TESTE ISOLADO

```php
<?php
// Criar: backend/public/teste-daevento-isolado.php

require_once '../vendor/autoload.php';
use NFePHP\DA\NFe\Daevento;

try {
    echo "🧪 TESTE ISOLADO DAEVENTO\n";
    
    // XML de teste (elemento evento extraído)
    $xmlEvento = file_get_contents('../storage/xml/empresa_acd26a4f-7220-405e-9c96-faffb7e6480e/CCe/2025/06/35250624163237000151550010000000231705363453_cce_001_evento.xml');
    
    // Extrair apenas evento
    $dom = new DOMDocument();
    $dom->loadXML($xmlEvento);
    $eventos = $dom->getElementsByTagName('evento');
    $evento = $eventos->item(0);
    $newDom = new DOMDocument('1.0', 'UTF-8');
    $importedNode = $newDom->importNode($evento, true);
    $newDom->appendChild($importedNode);
    $xmlContent = $newDom->saveXML();
    
    echo "✅ XML preparado: " . strlen($xmlContent) . " bytes\n";
    
    // Dados básicos
    $dadosEmitente = [
        'razao' => 'EMANUEL LUIS PEREIRA SOUZA VALESIS INFORMATICA',
        'logradouro' => 'RUA TESTE',
        'numero' => '123',
        'bairro' => 'CENTRO',
        'CEP' => '12345-678',
        'municipio' => 'SAO PAULO',
        'UF' => 'SP',
        'telefone' => '(11) 1234-5678',
        'email' => 'teste@teste.com'
    ];
    
    echo "🔧 Criando Daevento...\n";
    $daevento = new Daevento($xmlContent, $dadosEmitente);
    
    echo "🔧 Configurando...\n";
    $daevento->debugMode(true);
    
    echo "🔧 Gerando PDF...\n";
    $pdfContent = $daevento->render();
    
    if ($pdfContent) {
        file_put_contents('../storage/teste_cce_isolado.pdf', $pdfContent);
        echo "✅ SUCESSO! PDF gerado: " . strlen($pdfContent) . " bytes\n";
    } else {
        echo "❌ ERRO: PDF vazio\n";
    }
    
} catch (Exception $e) {
    echo "❌ ERRO: " . $e->getMessage() . "\n";
    echo "📍 Linha: " . $e->getLine() . "\n";
    echo "📁 Arquivo: " . $e->getFile() . "\n";
}
?>
```

---

## 🎯 COMANDO PARA PRÓXIMA IA

```bash
# 1. Executar teste isolado:
cd /root/nexo/nexo-pedidos/backend
php public/teste-daevento-isolado.php

# 2. Se falhar, adicionar debug em gerar-pdf-cce.php
# 3. Se funcionar, comparar diferenças

# 4. Testar PDF original:
curl -X POST "http://localhost/backend/public/gerar-pdf-cce.php" \
  -H "Content-Type: application/json" \
  -d '{"chave":"35250624163237000151550010000000231705363453","empresa_id":"acd26a4f-7220-405e-9c96-faffb7e6480e","sequencia":1}'
```

**OBJETIVO:** PDF salvo em `/storage/pdf/empresa_id/CCe/2025/06/chave_cce_001.pdf`
