<?php
/**
 * Endpoint para servir arquivos NFe (XML e PDF)
 * URL: /files.php?type=xml&chave=44444444444444444444444444444444444444444444
 * URL: /files.php?type=pdf&chave=44444444444444444444444444444444444444444444
 */

// Headers CORS gerenciados pelo Nginx

// Validar parâmetros
$type = $_GET['type'] ?? '';
$chave = $_GET['chave'] ?? '';

if (empty($type) || empty($chave)) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => 'Parâmetros obrigatórios: type (xml|pdf) e chave'
    ]);
    exit;
}

// Validar tipo
if (!in_array($type, ['xml', 'pdf'])) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => 'Tipo deve ser xml ou pdf'
    ]);
    exit;
}

// Validar chave NFe (44 dígitos)
if (strlen($chave) !== 44 || !ctype_digit($chave)) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => 'Chave NFe deve ter 44 dígitos numéricos'
    ]);
    exit;
}

// Definir caminho do arquivo
$basePath = __DIR__ . '/../storage';
$filePath = $basePath . '/' . $type . '/' . $chave . '.' . $type;

// Verificar se arquivo existe
if (!file_exists($filePath)) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => 'Arquivo não encontrado',
        'chave' => $chave,
        'type' => $type
    ]);
    exit;
}

// Definir headers baseado no tipo
if ($type === 'xml') {
    header('Content-Type: application/xml; charset=utf-8');
    header('Content-Disposition: attachment; filename="NFe_' . $chave . '.xml"');
} else {
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="NFe_' . $chave . '.pdf"');
}

// Headers adicionais
header('Content-Length: ' . filesize($filePath));
header('Cache-Control: public, max-age=3600');
header('Last-Modified: ' . gmdate('D, d M Y H:i:s', filemtime($filePath)) . ' GMT');

// Log de acesso (opcional)
error_log("Arquivo servido: {$type} - {$chave} - IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));

// Servir arquivo
readfile($filePath);
?>
