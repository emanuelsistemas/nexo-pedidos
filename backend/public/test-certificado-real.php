<?php
header('Content-Type: application/json');

try {
    $certificadoPath = '../../Doc/certificado_digital/EMANUEL LUIS PEREIRA SOUZA VALESIS INFORMATICA_SENHA_12345678.pfx';
    $senha = '12345678';
    
    if (!file_exists($certificadoPath)) {
        throw new Exception('Arquivo de certificado não encontrado');
    }
    
    $certificateContent = file_get_contents($certificadoPath);
    if ($certificateContent === false) {
        throw new Exception('Erro ao ler arquivo do certificado');
    }
    
    $results = [];
    
    // Teste 1: Sem configuração especial
    $pkcs12_1 = [];
    $result1 = openssl_pkcs12_read($certificateContent, $pkcs12_1, $senha);
    $results['test_1_standard'] = [
        'success' => $result1,
        'errors' => []
    ];
    
    while (($error = openssl_error_string()) !== false) {
        $results['test_1_standard']['errors'][] = $error;
    }
    
    // Teste 2: Com configuração legacy
    $originalEnv = getenv('OPENSSL_CONF');
    putenv('OPENSSL_CONF=' . __DIR__ . '/../openssl_legacy.cnf');
    
    $pkcs12_2 = [];
    $result2 = openssl_pkcs12_read($certificateContent, $pkcs12_2, $senha);
    $results['test_2_legacy_config'] = [
        'success' => $result2,
        'errors' => []
    ];
    
    while (($error = openssl_error_string()) !== false) {
        $results['test_2_legacy_config']['errors'][] = $error;
    }
    
    // Restaurar configuração original
    if ($originalEnv !== false) {
        putenv("OPENSSL_CONF=$originalEnv");
    } else {
        putenv('OPENSSL_CONF');
    }
    
    // Teste 3: Sem configuração (null)
    putenv('OPENSSL_CONF=/dev/null');
    
    $pkcs12_3 = [];
    $result3 = openssl_pkcs12_read($certificateContent, $pkcs12_3, $senha);
    $results['test_3_no_config'] = [
        'success' => $result3,
        'errors' => []
    ];
    
    while (($error = openssl_error_string()) !== false) {
        $results['test_3_no_config']['errors'][] = $error;
    }
    
    // Restaurar configuração original
    if ($originalEnv !== false) {
        putenv("OPENSSL_CONF=$originalEnv");
    } else {
        putenv('OPENSSL_CONF');
    }
    
    // Se algum teste funcionou, extrair informações
    $certificateInfo = null;
    $successfulPkcs12 = null;
    
    if ($result1) {
        $successfulPkcs12 = $pkcs12_1;
    } elseif ($result2) {
        $successfulPkcs12 = $pkcs12_2;
    } elseif ($result3) {
        $successfulPkcs12 = $pkcs12_3;
    }
    
    if ($successfulPkcs12) {
        $certInfo = openssl_x509_parse($successfulPkcs12['cert']);
        $certificateInfo = [
            'subject' => $certInfo['subject'] ?? [],
            'issuer' => $certInfo['issuer'] ?? [],
            'valid_from' => date('Y-m-d H:i:s', $certInfo['validFrom_time_t'] ?? 0),
            'valid_to' => date('Y-m-d H:i:s', $certInfo['validTo_time_t'] ?? 0),
            'cn' => $certInfo['subject']['CN'] ?? 'N/A'
        ];
    }
    
    echo json_encode([
        'success' => ($result1 || $result2 || $result3),
        'message' => 'Teste de certificado concluído',
        'file_info' => [
            'path' => $certificadoPath,
            'size' => filesize($certificadoPath),
            'exists' => file_exists($certificadoPath)
        ],
        'test_results' => $results,
        'certificate_info' => $certificateInfo,
        'openssl_version' => OPENSSL_VERSION_TEXT,
        'config_file' => __DIR__ . '/../openssl_legacy.cnf'
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'test_results' => $results ?? [],
        'openssl_version' => OPENSSL_VERSION_TEXT
    ], JSON_PRETTY_PRINT);
}
?>
