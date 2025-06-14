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
    // Verificar se é POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método não permitido: ' . $_SERVER['REQUEST_METHOD']);
    }

    // Debug dos dados recebidos
    $debug = [
        'method' => $_SERVER['REQUEST_METHOD'],
        'files_received' => !empty($_FILES),
        'post_received' => !empty($_POST),
        'files_data' => $_FILES,
        'post_data' => $_POST,
        'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'não definido',
        'content_length' => $_SERVER['CONTENT_LENGTH'] ?? 'não definido'
    ];

    // Verificar se há arquivo enviado
    if (!isset($_FILES['certificado'])) {
        throw new Exception('Campo certificado não encontrado nos arquivos enviados');
    }

    $file = $_FILES['certificado'];
    
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $errors = [
            UPLOAD_ERR_INI_SIZE => 'Arquivo muito grande (php.ini)',
            UPLOAD_ERR_FORM_SIZE => 'Arquivo muito grande (formulário)',
            UPLOAD_ERR_PARTIAL => 'Upload parcial',
            UPLOAD_ERR_NO_FILE => 'Nenhum arquivo enviado',
            UPLOAD_ERR_NO_TMP_DIR => 'Diretório temporário não encontrado',
            UPLOAD_ERR_CANT_WRITE => 'Erro ao escrever arquivo',
            UPLOAD_ERR_EXTENSION => 'Upload bloqueado por extensão'
        ];
        
        throw new Exception('Erro no upload: ' . ($errors[$file['error']] ?? 'Erro desconhecido: ' . $file['error']));
    }

    // Verificar parâmetros obrigatórios
    $empresaId = $_POST['empresa_id'] ?? '';
    $senha = $_POST['senha'] ?? '';
    
    if (empty($empresaId)) {
        throw new Exception('Parâmetro empresa_id é obrigatório');
    }
    
    if (empty($senha)) {
        throw new Exception('Parâmetro senha é obrigatório');
    }

    // Validar arquivo
    $allowedExtensions = ['pfx', 'p12'];
    $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    
    if (!in_array($fileExtension, $allowedExtensions)) {
        throw new Exception('Arquivo deve ser .pfx ou .p12. Recebido: .' . $fileExtension);
    }

    // Verificar tamanho do arquivo (máximo 5MB)
    if ($file['size'] > 5 * 1024 * 1024) {
        throw new Exception('Arquivo muito grande. Máximo 5MB. Tamanho: ' . $file['size'] . ' bytes');
    }

    // Ler conteúdo do arquivo
    $certificateContent = file_get_contents($file['tmp_name']);
    if ($certificateContent === false) {
        throw new Exception('Erro ao ler arquivo do certificado');
    }

    // Tentar validar o certificado com OpenSSL
    $pkcs12 = [];
    if (!openssl_pkcs12_read($certificateContent, $pkcs12, $senha)) {
        $opensslError = openssl_error_string();
        throw new Exception('Senha do certificado incorreta ou arquivo inválido. OpenSSL: ' . $opensslError);
    }

    // Se chegou até aqui, está tudo OK
    echo json_encode([
        'success' => true,
        'message' => 'Certificado validado com sucesso!',
        'debug' => $debug,
        'file_info' => [
            'name' => $file['name'],
            'size' => $file['size'],
            'type' => $file['type'],
            'extension' => $fileExtension
        ],
        'certificate_info' => [
            'valid' => true,
            'empresa_id' => $empresaId
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug' => $debug ?? []
    ]);
}
?>
