# 📄 Implementação PDF DANFE - Nexo Pedidos NFe

## 🎯 **STATUS ATUAL: PRÓXIMO PASSO CRÍTICO**

### **Data:** 03/06/2025 - 16:55
### **Situação:** XML NFe 100% funcional, PDF pendente
### **Prioridade:** ALTA - Usuário precisa do PDF

## ✅ **O QUE JÁ ESTÁ FUNCIONANDO**

### **XML NFe Perfeito:**
- ✅ **Geração**: XML válido conforme schema NFe 4.0
- ✅ **Assinatura**: Certificado A1 funcionando
- ✅ **Dados fiscais**: NCM, CFOP, CST, alíquotas reais
- ✅ **Arquivo salvo**: `/backend/storage/xml/empresa_*/`
- ✅ **Chave válida**: `35250624163237000151550010000000011448846933`

### **Código PDF Implementado:**
```php
// Localização: backend/public/emitir-nfe.php (linha 723-770)
if ($status === '100') {
    if (!class_exists('\NFePHP\DA\NFe\Danfe')) {
        throw new Exception('Classe Danfe não encontrada - instale sped-da');
    }
    
    $danfe = new \NFePHP\DA\NFe\Danfe($xmlComDeclaracao);
    $danfe->debugMode(false);
    $danfe->creditsIntegratorFooter('Sistema Nexo PDV');
    $pdfContent = $danfe->render();
    
    // Salvar PDF
    $pdfPath = "{$pdfDir}/{$chaveParaSalvar}.pdf";
    file_put_contents($pdfPath, $pdfContent);
}
```

## 🚨 **PROBLEMA IDENTIFICADO**

### **Biblioteca sped-da:**
- ❌ **Pode não estar instalada** no Composer
- ❌ **Dependências PDF** podem estar faltando
- ❌ **Classe `\NFePHP\DA\NFe\Danfe`** não encontrada

## 🔧 **AÇÕES NECESSÁRIAS**

### **1. Verificar Dependências:**
```bash
# Verificar se sped-da está instalado
composer show | grep -i sped-da

# Verificar se danfe existe
composer show | grep -i danfe
```

### **2. Instalar sped-da (se necessário):**
```bash
cd /root/nexo/nexo-pedidos/backend
composer require nfephp-org/sped-da
```

### **3. Verificar Dependências PHP:**
```bash
# Extensões necessárias para PDF
php -m | grep -E "(gd|imagick|zip|dom)"
```

### **4. Instalar Extensões (se necessário):**
```bash
sudo apt-get update
sudo apt-get install php7.4-gd php7.4-zip php7.4-dom
sudo systemctl restart php7.4-fpm
```

## 📋 **ESTRUTURA ESPERADA**

### **Diretórios PDF:**
```
backend/storage/pdf/
├── empresa_acd26a4f-7220-405e-9c96-faffb7e6480e/
│   └── 2025/
│       └── 06/
│           └── 35250624163237000151550010000000011448846933.pdf
```

### **Resposta da API:**
```json
{
    "success": true,
    "data": {
        "xml_path": "/path/to/xml",
        "pdf_path": "/path/to/pdf",
        "chave": "35250624163237000151550010000000011448846933"
    }
}
```

## 🧪 **TESTES NECESSÁRIOS**

### **1. Teste Manual da Biblioteca:**
```php
// Criar arquivo teste: backend/test-danfe.php
<?php
require_once 'vendor/autoload.php';

try {
    if (class_exists('\NFePHP\DA\NFe\Danfe')) {
        echo "✅ Classe Danfe encontrada\n";
    } else {
        echo "❌ Classe Danfe NÃO encontrada\n";
    }
} catch (Exception $e) {
    echo "❌ Erro: " . $e->getMessage() . "\n";
}
?>
```

### **2. Teste com XML Real:**
```php
// Usar XML gerado para testar PDF
$xmlPath = '/root/nexo/nexo-pedidos/backend/storage/xml/empresa_acd26a4f-7220-405e-9c96-faffb7e6480e/2025/06/35250624163237000151550010000000011448846933.xml';
$xml = file_get_contents($xmlPath);

$danfe = new \NFePHP\DA\NFe\Danfe($xml);
$pdf = $danfe->render();
file_put_contents('/tmp/teste.pdf', $pdf);
```

## 🔍 **LOGS DE DEBUG**

### **Adicionar Logs Específicos:**
```php
// No emitir-nfe.php, adicionar antes da geração PDF:
error_log("PDF: Iniciando geração DANFE");
error_log("PDF: Status NFe: " . $status);
error_log("PDF: Classe Danfe existe: " . (class_exists('\NFePHP\DA\NFe\Danfe') ? 'SIM' : 'NÃO'));
error_log("PDF: Tamanho XML: " . strlen($xmlComDeclaracao) . " bytes");
```

## 🎯 **RESULTADO ESPERADO**

### **Após Correção:**
- ✅ **PDF DANFE gerado** automaticamente
- ✅ **Arquivo salvo** em `/backend/storage/pdf/`
- ✅ **Resposta da API** com caminho do PDF
- ✅ **Download funcionando** no frontend

### **Funcionalidades PDF:**
- ✅ **Layout oficial** DANFE
- ✅ **Dados da empresa** e destinatário
- ✅ **Produtos** com impostos
- ✅ **Totais** calculados
- ✅ **Chave de acesso** e QR Code
- ✅ **Assinatura digital** validada

## 🚀 **PRÓXIMOS PASSOS**

1. **Verificar dependências** sped-da
2. **Instalar bibliotecas** se necessário
3. **Testar geração PDF** com XML existente
4. **Corrigir erros** encontrados
5. **Testar integração** completa
6. **Validar download** no frontend

## 📞 **SUPORTE**

### **Documentação sped-da:**
- GitHub: https://github.com/nfephp-org/sped-da
- Exemplos: https://github.com/nfephp-org/sped-da/tree/master/examples

### **Dependências Comuns:**
- php-gd (manipulação de imagens)
- php-zip (compressão)
- php-dom (XML)
- php-mbstring (strings)

---

**🎯 OBJETIVO:** PDF DANFE funcionando 100%  
**⏰ PRIORIDADE:** ALTA - Última funcionalidade pendente  
**📊 PROGRESSO:** 0% → 100% (após implementação)
