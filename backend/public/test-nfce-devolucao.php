<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    // Teste básico
    echo json_encode([
        'erro' => false,
        'mensagem' => 'Endpoint de devolução NFC-e funcionando',
        'timestamp' => date('Y-m-d H:i:s'),
        'php_version' => phpversion(),
        'autoload_exists' => file_exists(__DIR__ . '/../vendor/autoload.php'),
        'config_exists' => file_exists(__DIR__ . '/../config/nfe_config.json')
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'erro' => true,
        'mensagem' => $e->getMessage()
    ]);
}
?>
