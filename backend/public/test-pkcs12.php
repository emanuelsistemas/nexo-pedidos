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

    $debug = [
        'file_name' => $file['name'],
        'file_size' => $file['size'],
        'file_type' => $file['type'],
        'content_length' => strlen($certificateContent),
        'senha_length' => strlen($senha),
        'openssl_version' => OPENSSL_VERSION_TEXT
    ];

    // Limpar erros anteriores do OpenSSL
    while (openssl_error_string() !== false) {
        // Limpa a pilha de erros
    }

    // Tentar validar o certificado com OpenSSL
    $pkcs12 = [];
    $result = openssl_pkcs12_read($certificateContent, $pkcs12, $senha);
    
    if (!$result) {
        // Capturar erros específicos do OpenSSL
        $opensslErrors = [];
        while (($error = openssl_error_string()) !== false) {
            $opensslErrors[] = $error;
        }
        
        throw new Exception('Falha na validação PKCS12. Erros OpenSSL: ' . implode(', ', $opensslErrors));
    }

    // Se chegou até aqui, o certificado é válido
    $certInfo = openssl_x509_parse($pkcs12['cert']);
    
    echo json_encode([
        'success' => true,
        'message' => 'Certificado validado com sucesso!',
        'debug' => $debug,
        'certificate_info' => [
            'subject' => $certInfo['subject'] ?? [],
            'issuer' => $certInfo['issuer'] ?? [],
            'valid_from' => date('Y-m-d H:i:s', $certInfo['validFrom_time_t'] ?? 0),
            'valid_to' => date('Y-m-d H:i:s', $certInfo['validTo_time_t'] ?? 0),
            'serial_number' => $certInfo['serialNumber'] ?? 'N/A'
        ]
    ]);

} catch (Exception $e) {
    // Capturar erros adicionais do OpenSSL
    $opensslErrors = [];
    while (($error = openssl_error_string()) !== false) {
        $opensslErrors[] = $error;
    }
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug' => $debug ?? [],
        'openssl_errors' => $opensslErrors
    ]);
}
?>
