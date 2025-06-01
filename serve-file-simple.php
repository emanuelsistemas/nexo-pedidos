<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

if (!isset($_GET['type']) || !isset($_GET['chave'])) {
    http_response_code(400);
    echo 'Parâmetros obrigatórios: type (xml|pdf) e chave';
    exit;
}

$type = $_GET['type'];
$chave = $_GET['chave'];

if (!in_array($type, ['xml', 'pdf'])) {
    http_response_code(400);
    echo 'Tipo inválido. Use: xml ou pdf';
    exit;
}

if (strlen($chave) !== 44) {
    http_response_code(400);
    echo 'Chave NFe inválida';
    exit;
}

$basePath = '/var/www/nfe-api/storage';
$filePath = $basePath . '/' . $type . 's/' . $chave . '.' . $type;

if (!file_exists($filePath)) {
    http_response_code(404);
    echo 'Arquivo não encontrado: ' . basename($filePath);
    exit;
}

if ($type === 'xml') {
    header('Content-Type: application/xml');
    header('Content-Disposition: attachment; filename="NFe_' . $chave . '.xml"');
} else {
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="NFe_' . $chave . '.pdf"');
}

header('Content-Length: ' . filesize($filePath));
header('Cache-Control: public, max-age=3600');

readfile($filePath);
?>
