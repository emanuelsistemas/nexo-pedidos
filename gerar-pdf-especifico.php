<?php
/**
 * SCRIPT PARA GERAR PDF DE NFE ESPECÍFICA
 * Gera PDF para a chave: 35250624163237000151550010000000011253996677
 */

require_once '../vendor/autoload.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

try {
    // Chave específica que precisa do PDF
    $chave = '35250624163237000151550010000000011253996677';
    $xmlFile = "../storage/xmls/{$chave}.xml";
    
    echo json_encode([
        'message' => 'Gerando PDF para NFe específica',
        'chave' => $chave,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
    
    if (!file_exists($xmlFile)) {
        throw new Exception("XML não encontrado: {$xmlFile}");
    }
    
    $xml = file_get_contents($xmlFile);
    
    // Função para gerar PDF
    function gerarPDFEspecifico($xml, $chave) {
        try {
            // Aumentar limites
            ini_set('memory_limit', '512M');
            ini_set('max_execution_time', 300);
            
            // Validar e processar XML
            $dom = new DOMDocument();
            if (!$dom->loadXML($xml)) {
                throw new Exception('XML inválido');
            }

            // Extrair apenas a parte NFe se houver protocolo
            $nfeNode = $dom->getElementsByTagName('NFe')->item(0);
            if ($nfeNode) {
                $nfeDom = new DOMDocument();
                $nfeDom->appendChild($nfeDom->importNode($nfeNode, true));
                $xml = $nfeDom->saveXML();
            }
            
            // Criar diretório se não existir
            $pdfPath = "../storage/pdfs/{$chave}.pdf";
            $dir = dirname($pdfPath);
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
            
            // Gerar DANFE usando NFePHP
            $danfe = new \NFePHP\DA\NFe\Danfe($xml);
            $danfe->debugMode(true);
            $danfe->creditsIntegratorFooter('Sistema NFe - Nexo PDV');
            
            // Renderizar PDF
            $pdf = $danfe->render();
            
            if (empty($pdf)) {
                throw new Exception('PDF vazio gerado');
            }
            
            // Salvar arquivo
            $result = file_put_contents($pdfPath, $pdf);
            
            if ($result === false) {
                throw new Exception('Falha ao salvar PDF');
            }
            
            // Definir permissões
            chmod($pdfPath, 0755);
            
            return [
                'success' => true,
                'path' => $pdfPath,
                'size' => strlen($pdf),
                'file_size' => filesize($pdfPath),
                'chave' => $chave
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'chave' => $chave
            ];
        }
    }
    
    // Gerar o PDF
    $resultado = gerarPDFEspecifico($xml, $chave);
    
    echo "\n\nResultado da geração:\n";
    echo json_encode($resultado, JSON_PRETTY_PRINT);
    
    if ($resultado['success']) {
        echo "\n\n✅ PDF gerado com sucesso!";
        echo "\n📁 Arquivo: " . $resultado['path'];
        echo "\n📊 Tamanho: " . number_format($resultado['file_size']) . " bytes";
        echo "\n🔗 URL: https://apinfe.nexopdv.com/serve-file.php?type=pdf&chave={$chave}";
    } else {
        echo "\n\n❌ Erro na geração: " . $resultado['error'];
    }
    
} catch (Exception $e) {
    echo "\n\nErro geral:\n";
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
?>
