<?php
/**
 * TESTE SIMPLES - Geração PDF CCe
 * 
 * Teste básico para verificar se a biblioteca Daevento funciona
 */

header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Carregar autoload primeiro
require_once __DIR__ . '/../vendor/autoload.php';
use NFePHP\DA\NFe\Daevento;

try {
    echo "🚀 INICIANDO TESTE PDF CCe\n";
    
    // 1. Verificar se autoload existe
    $autoloadPath = __DIR__ . '/../vendor/autoload.php';
    if (!file_exists($autoloadPath)) {
        throw new Exception("Autoload não encontrado: {$autoloadPath}");
    }
    
    echo "✅ Autoload encontrado\n";
    
    // 2. Verificar se autoload foi carregado
    echo "✅ Autoload carregado\n";

    // 3. Verificar se classe existe
    if (!class_exists('NFePHP\DA\NFe\Daevento')) {
        throw new Exception("Classe Daevento não encontrada");
    }
    
    echo "✅ Classe Daevento encontrada\n";
    
    // 4. Verificar XML da CCe
    $xmlPath = __DIR__ . '/../storage/xml/empresa_acd26a4f-7220-405e-9c96-faffb7e6480e/CCe/2025/06/35250624163237000151550010000000201995318594_cce_017.xml';
    
    if (!file_exists($xmlPath)) {
        throw new Exception("XML CCe não encontrado: {$xmlPath}");
    }
    
    echo "✅ XML CCe encontrado\n";
    
    // 5. Ler XML
    $xmlContent = file_get_contents($xmlPath);
    if (!$xmlContent) {
        throw new Exception("Erro ao ler XML CCe");
    }

    echo "✅ XML CCe lido: " . strlen($xmlContent) . " bytes\n";

    // 5.1. Extrair XML do evento do envelope SOAP (se necessário)
    if (strpos($xmlContent, 'soap:Envelope') !== false) {
        echo "🔄 XML está em envelope SOAP, extraindo evento...\n";

        // Carregar XML como DOMDocument
        $dom = new DOMDocument();
        $dom->loadXML($xmlContent);

        // Buscar o elemento retEvento
        $retEventos = $dom->getElementsByTagName('retEvento');
        if ($retEventos->length > 0) {
            $retEvento = $retEventos->item(0);

            // Criar novo documento apenas com o retEvento
            $newDom = new DOMDocument('1.0', 'UTF-8');
            $newDom->formatOutput = true;

            // Importar o nó retEvento para o novo documento
            $importedNode = $newDom->importNode($retEvento, true);
            $newDom->appendChild($importedNode);

            $xmlContent = $newDom->saveXML();
            echo "✅ XML do evento extraído: " . strlen($xmlContent) . " bytes\n";

            // Salvar XML extraído para análise
            file_put_contents(__DIR__ . '/../storage/xml_extraido_teste.xml', $xmlContent);
            echo "📁 XML extraído salvo em: storage/xml_extraido_teste.xml\n";
        } else {
            throw new Exception('Elemento retEvento não encontrado no XML');
        }
    }
    
    // 6. Dados básicos do emitente
    $dadosEmitente = [
        'razao' => 'Empresa Teste',
        'logradouro' => 'Rua Teste',
        'numero' => '123',
        'complemento' => '',
        'bairro' => 'Centro',
        'CEP' => '12345-678',
        'municipio' => 'São Paulo',
        'UF' => 'SP',
        'telefone' => '(11) 1234-5678',
        'email' => 'teste@teste.com'
    ];
    
    echo "✅ Dados emitente preparados\n";
    
    // 7. Tentar criar instância Daevento
    echo "🔄 Criando instância Daevento...\n";
    $daevento = new Daevento($xmlContent, $dadosEmitente);
    echo "✅ Instância Daevento criada\n";
    
    // 8. Configurar Daevento
    $daevento->debugMode(true);
    $daevento->creditsIntegratorFooter('Sistema Nexo PDV - Teste');
    echo "✅ Daevento configurado\n";
    
    // 9. Tentar gerar PDF
    echo "🔄 Gerando PDF...\n";
    $pdfContent = $daevento->render();
    
    if (!$pdfContent) {
        throw new Exception("PDF não foi gerado (conteúdo vazio)");
    }
    
    echo "✅ PDF gerado com sucesso: " . strlen($pdfContent) . " bytes\n";
    
    // 10. Salvar PDF de teste
    $testPdfPath = __DIR__ . '/../storage/teste_cce.pdf';
    $result = file_put_contents($testPdfPath, $pdfContent);
    
    if ($result === false) {
        throw new Exception("Erro ao salvar PDF de teste");
    }
    
    echo "✅ PDF salvo em: {$testPdfPath}\n";
    echo "✅ Tamanho: " . filesize($testPdfPath) . " bytes\n";
    
    echo "\n🎉 TESTE CONCLUÍDO COM SUCESSO!\n";
    
} catch (Exception $e) {
    echo "❌ ERRO: " . $e->getMessage() . "\n";
    echo "📍 Linha: " . $e->getLine() . "\n";
    echo "📁 Arquivo: " . $e->getFile() . "\n";
} catch (Error $e) {
    echo "❌ ERRO FATAL: " . $e->getMessage() . "\n";
    echo "📍 Linha: " . $e->getLine() . "\n";
    echo "📁 Arquivo: " . $e->getFile() . "\n";
}
?>
