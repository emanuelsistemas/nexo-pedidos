<?php
/**
 * Script de debug para inutilização NFe
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    echo json_encode([
        'debug' => 'Script iniciado',
        'method' => $_SERVER['REQUEST_METHOD'],
        'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'não definido',
        'php_version' => PHP_VERSION,
        'timestamp' => date('Y-m-d H:i:s')
    ]);

    // Teste 1: Verificar se consegue ler input
    $input = file_get_contents('php://input');
    error_log("DEBUG: Input recebido: " . $input);

    // Teste 2: Verificar se consegue fazer parse JSON
    $data = json_decode($input, true);
    error_log("DEBUG: JSON parsed: " . print_r($data, true));

    // Teste 3: Verificar autoload
    if (file_exists('../vendor/autoload.php')) {
        require_once '../vendor/autoload.php';
        error_log("DEBUG: Autoload carregado com sucesso");
    } else {
        error_log("DEBUG: Autoload não encontrado");
    }

    // Teste 4: Verificar CertificateManager
    if (file_exists('../src/Services/CertificateManager.php')) {
        require_once '../src/Services/CertificateManager.php';
        error_log("DEBUG: CertificateManager carregado");
    } else {
        error_log("DEBUG: CertificateManager não encontrado");
    }

} catch (Exception $e) {
    error_log("DEBUG: Erro capturado: " . $e->getMessage());
    echo json_encode([
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?>
