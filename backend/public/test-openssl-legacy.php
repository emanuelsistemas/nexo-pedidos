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
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método não permitido');
    }

    // Verificar se há arquivo enviado
    if (!isset($_FILES['certificado'])) {
        throw new Exception('Nenhum arquivo de certificado enviado');
    }

    $file = $_FILES['certificado'];
    $senha = $_POST['senha'] ?? '';

    if (empty($senha)) {
        throw new Exception('Senha é obrigatória');
    }

    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('Erro no upload: ' . $file['error']);
    }

    // Ler conteúdo do arquivo
    $certificateContent = file_get_contents($file['tmp_name']);
    if ($certificateContent === false) {
        throw new Exception('Erro ao ler arquivo do certificado');
    }

    // Configurar OpenSSL para modo legacy (mais permissivo)
    $originalConfig = openssl_get_config();
    
    // Tentar diferentes abordagens para OpenSSL 3.0
    $attempts = [];
    
    // Tentativa 1: Padrão
    $pkcs12 = [];
    $result1 = openssl_pkcs12_read($certificateContent, $pkcs12, $senha);
    $attempts['standard'] = [
        'success' => $result1,
        'errors' => []
    ];
    
    // Capturar erros da tentativa 1
    while (($error = openssl_error_string()) !== false) {
        $attempts['standard']['errors'][] = $error;
    }
    
    if (!$result1) {
        // Tentativa 2: Com configuração de segurança reduzida
        putenv('OPENSSL_CONF=/dev/null'); // Desabilita configuração padrão
        
        $pkcs12_2 = [];
        $result2 = openssl_pkcs12_read($certificateContent, $pkcs12_2, $senha);
        $attempts['no_config'] = [
            'success' => $result2,
            'errors' => []
        ];
        
        // Capturar erros da tentativa 2
        while (($error = openssl_error_string()) !== false) {
            $attempts['no_config']['errors'][] = $error;
        }
        
        if ($result2) {
            $pkcs12 = $pkcs12_2;
        }
    }
    
    // Se nenhuma tentativa funcionou
    if (!$result1 && !($result2 ?? false)) {
        throw new Exception('Falha na validação do certificado em todas as tentativas');
    }

    // Se chegou até aqui, o certificado é válido
    $certInfo = openssl_x509_parse($pkcs12['cert']);
    
    echo json_encode([
        'success' => true,
        'message' => 'Certificado validado com sucesso!',
        'attempts' => $attempts,
        'openssl_version' => OPENSSL_VERSION_TEXT,
        'certificate_info' => [
            'subject' => $certInfo['subject'] ?? [],
            'issuer' => $certInfo['issuer'] ?? [],
            'valid_from' => date('Y-m-d H:i:s', $certInfo['validFrom_time_t'] ?? 0),
            'valid_to' => date('Y-m-d H:i:s', $certInfo['validTo_time_t'] ?? 0),
            'serial_number' => $certInfo['serialNumber'] ?? 'N/A',
            'cn' => $certInfo['subject']['CN'] ?? 'N/A'
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'attempts' => $attempts ?? [],
        'openssl_version' => OPENSSL_VERSION_TEXT
    ]);
}
?>
