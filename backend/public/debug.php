<?php
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

echo json_encode([
    'success' => true,
    'message' => 'Debug endpoint funcionando!',
    'debug_info' => [
        'php_version' => PHP_VERSION,
        'method' => $_SERVER['REQUEST_METHOD'],
        'timestamp' => date('Y-m-d H:i:s'),
        'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
        'upload_max_filesize' => ini_get('upload_max_filesize'),
        'post_max_size' => ini_get('post_max_size'),
        'extensions' => [
            'openssl' => extension_loaded('openssl'),
            'curl' => extension_loaded('curl'),
            'json' => extension_loaded('json'),
            'mbstring' => extension_loaded('mbstring')
        ],
        'storage_path' => realpath(__DIR__ . '/../storage'),
        'storage_writable' => is_writable(__DIR__ . '/../storage'),
        'certificados_path' => realpath(__DIR__ . '/../storage/certificados'),
        'certificados_writable' => is_writable(__DIR__ . '/../storage/certificados')
    ]
]);
?>
