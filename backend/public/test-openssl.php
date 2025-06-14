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
        'message' => 'Teste de OpenSSL',
        'tests' => [
            'openssl_loaded' => extension_loaded('openssl'),
            'openssl_version' => OPENSSL_VERSION_TEXT ?? 'N/A',
            'pkcs12_function' => function_exists('openssl_pkcs12_read'),
            'x509_function' => function_exists('openssl_x509_parse'),
            'error_function' => function_exists('openssl_error_string'),
            'php_version' => PHP_VERSION,
            'upload_enabled' => ini_get('file_uploads'),
            'upload_max_size' => ini_get('upload_max_filesize'),
            'post_max_size' => ini_get('post_max_size'),
            'temp_dir' => sys_get_temp_dir(),
            'temp_writable' => is_writable(sys_get_temp_dir())
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
