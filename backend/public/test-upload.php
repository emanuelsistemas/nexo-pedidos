<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    echo json_encode([
        'success' => true,
        'message' => 'Endpoint funcionando',
        'method' => $_SERVER['REQUEST_METHOD'],
        'files' => $_FILES,
        'post' => $_POST,
        'autoload_exists' => file_exists('../vendor/autoload.php'),
        'php_version' => PHP_VERSION,
        'openssl_loaded' => extension_loaded('openssl')
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
