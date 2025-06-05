<?php
require_once 'vendor/autoload.php';

use NFePHP\DA\NFe\Danfe;

try {
    echo "=== TESTE DE GERAÇÃO PDF DANFE ===\n\n";
    
    // 1. Verificar se a classe Danfe existe
    if (class_exists('\NFePHP\DA\NFe\Danfe')) {
        echo "✅ Classe Danfe encontrada\n";
    } else {
        echo "❌ Classe Danfe NÃO encontrada\n";
        exit(1);
    }
    
    // 2. Verificar se o XML existe
    $xmlPath = 'storage/xml/empresa_acd26a4f-7220-405e-9c96-faffb7e6480e/2025/06/35250624163237000151550010000000011448846933.xml';
    
    if (!file_exists($xmlPath)) {
        echo "❌ XML não encontrado: {$xmlPath}\n";
        exit(1);
    }
    
    echo "✅ XML encontrado: {$xmlPath}\n";
    
    // 3. Carregar XML
    $xml = file_get_contents($xmlPath);
    if (empty($xml)) {
        echo "❌ XML está vazio\n";
        exit(1);
    }
    
    echo "✅ XML carregado: " . strlen($xml) . " bytes\n";
    
    // 4. Tentar criar instância do Danfe
    echo "\n--- Criando instância Danfe ---\n";
    $danfe = new Danfe($xml);
    echo "✅ Instância Danfe criada com sucesso\n";
    
    // 5. Configurar Danfe
    $danfe->debugMode(false);
    $danfe->creditsIntegratorFooter('Sistema Nexo PDV - Teste');
    echo "✅ Danfe configurado\n";
    
    // 6. Tentar gerar PDF
    echo "\n--- Gerando PDF ---\n";
    $pdfContent = $danfe->render();
    
    if (empty($pdfContent)) {
        echo "❌ PDF gerado está vazio\n";
        exit(1);
    }
    
    echo "✅ PDF gerado com sucesso: " . strlen($pdfContent) . " bytes\n";
    
    // 7. Salvar PDF de teste
    $testPdfPath = '/tmp/teste_danfe.pdf';
    $result = file_put_contents($testPdfPath, $pdfContent);
    
    if ($result === false) {
        echo "❌ Falha ao salvar PDF de teste\n";
        exit(1);
    }
    
    echo "✅ PDF salvo em: {$testPdfPath}\n";
    echo "✅ Tamanho do arquivo: " . filesize($testPdfPath) . " bytes\n";
    
    echo "\n=== TESTE CONCLUÍDO COM SUCESSO ===\n";
    echo "O PDF DANFE foi gerado corretamente!\n";
    
} catch (Exception $e) {
    echo "❌ ERRO: " . $e->getMessage() . "\n";
    echo "❌ Arquivo: " . $e->getFile() . "\n";
    echo "❌ Linha: " . $e->getLine() . "\n";
    echo "\n--- Stack Trace ---\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}
?>
