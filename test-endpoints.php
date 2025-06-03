<?php
header('Content-Type: application/json');

// Teste de uma chave NFe real
$chave_teste = '35250624163237000151550010000000011253996677';

echo json_encode([
    'status' => 'Endpoint XML/PDF funcionando',
    'timestamp' => date('Y-m-d H:i:s'),
    'storage_xmls_exists' => file_exists('/var/www/nfe-api/storage/xmls'),
    'storage_pdfs_exists' => file_exists('/var/www/nfe-api/storage/pdfs'),
    'xml_teste_exists' => file_exists("/var/www/nfe-api/storage/xmls/{$chave_teste}.xml"),
    'pdf_teste_exists' => file_exists("/var/www/nfe-api/storage/pdfs/{$chave_teste}.pdf"),
    'chave_teste' => $chave_teste,
    'usage' => [
        'xml' => '?action=xml&chave=CHAVE_NFE',
        'pdf' => '?action=pdf&chave=CHAVE_NFE'
    ]
]);
?>
