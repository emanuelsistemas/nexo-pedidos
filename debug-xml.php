<?php
/**
 * DEBUG XML - Verificar se o XML está válido
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    $chave = '35250624163237000151550010000000011253996677';
    $xmlFile = "../storage/xmls/{$chave}.xml";
    
    if (!file_exists($xmlFile)) {
        throw new Exception("XML não encontrado: {$xmlFile}");
    }
    
    $xml = file_get_contents($xmlFile);
    
    echo json_encode([
        'message' => 'Debug XML',
        'chave' => $chave,
        'xml_size' => strlen($xml),
        'xml_preview' => substr($xml, 0, 500) . '...'
    ], JSON_PRETTY_PRINT);
    
    // Testar carregamento básico
    $dom = new DOMDocument();
    $dom->loadXML($xml);
    
    echo "\n\n✅ XML carregado com sucesso no DOMDocument";
    
    // Verificar se tem NFe (com namespace)
    $nfeNodes = $dom->getElementsByTagName('NFe');
    echo "\n📄 Nós NFe encontrados (sem namespace): " . $nfeNodes->length;

    // Tentar com namespace
    $nfeNodesNS = $dom->getElementsByTagNameNS('http://www.portalfiscal.inf.br/nfe', 'NFe');
    echo "\n📄 Nós NFe encontrados (com namespace): " . $nfeNodesNS->length;

    // Verificar root element
    echo "\n🌳 Root element: " . $dom->documentElement->tagName;
    echo "\n🔗 Namespace URI: " . $dom->documentElement->namespaceURI;

    if ($nfeNodesNS->length > 0) {
        $nfeNode = $nfeNodesNS->item(0);
        echo "\n✅ NFe encontrada com namespace!";
        echo "\n📏 Tamanho do nó NFe: " . $nfeNode->ownerDocument->saveXML($nfeNode);
    } else if ($nfeNodes->length > 0) {
        $nfeNode = $nfeNodes->item(0);
        echo "\n✅ NFe encontrada sem namespace!";
    } else {
        echo "\n❌ Nenhuma NFe encontrada";
    }
    
} catch (Exception $e) {
    echo "\n\n❌ Erro: " . $e->getMessage();
}
?>
