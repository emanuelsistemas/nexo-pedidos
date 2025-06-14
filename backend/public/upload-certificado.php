<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../vendor/autoload.php';

use Nexo\Services\CertificateManager;

try {
    // Verificar se é POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método não permitido');
    }

    // Verificar se há arquivo enviado
    if (!isset($_FILES['certificado']) || $_FILES['certificado']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('Nenhum arquivo de certificado enviado');
    }

    // Verificar parâmetros obrigatórios
    $empresaId = $_POST['empresa_id'] ?? '';
    $senha = $_POST['senha'] ?? '';
    
    if (empty($empresaId) || empty($senha)) {
        throw new Exception('Parâmetros obrigatórios: empresa_id e senha');
    }

    // Validar arquivo
    $file = $_FILES['certificado'];
    $allowedExtensions = ['pfx', 'p12'];
    $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    
    if (!in_array($fileExtension, $allowedExtensions)) {
        throw new Exception('Arquivo deve ser .pfx ou .p12');
    }

    // Verificar tamanho do arquivo (máximo 5MB)
    if ($file['size'] > 5 * 1024 * 1024) {
        throw new Exception('Arquivo muito grande. Máximo 5MB');
    }

    // Ler conteúdo do arquivo
    $certificateContent = file_get_contents($file['tmp_name']);
    if ($certificateContent === false) {
        throw new Exception('Erro ao ler arquivo do certificado');
    }

    // Validar certificado (tentar abrir com a senha)
    try {
        $tempFile = tempnam(sys_get_temp_dir(), 'cert_validation_');
        file_put_contents($tempFile, $certificateContent);

        // Limpar erros anteriores do OpenSSL
        while (openssl_error_string() !== false) {
            // Limpa a pilha de erros
        }

        // Tentar validar o certificado com OpenSSL
        $pkcs12 = [];
        $validationSuccess = false;

        // Tentativa 1: Padrão
        if (openssl_pkcs12_read($certificateContent, $pkcs12, $senha)) {
            $validationSuccess = true;
        } else {
            // Tentativa 2: Com configuração legacy para OpenSSL 3.0
            $originalEnv = getenv('OPENSSL_CONF');
            putenv('OPENSSL_CONF=/dev/null'); // Desabilita configuração restritiva

            // Limpar erros da tentativa anterior
            while (openssl_error_string() !== false) {
                // Limpa a pilha de erros
            }

            if (openssl_pkcs12_read($certificateContent, $pkcs12, $senha)) {
                $validationSuccess = true;
            }

            // Restaurar configuração original
            if ($originalEnv !== false) {
                putenv("OPENSSL_CONF=$originalEnv");
            } else {
                putenv('OPENSSL_CONF');
            }
        }

        if (!$validationSuccess) {
            // Capturar erros específicos do OpenSSL
            $opensslErrors = [];
            while (($error = openssl_error_string()) !== false) {
                $opensslErrors[] = $error;
            }

            $errorMsg = 'Senha do certificado incorreta ou arquivo inválido';
            if (!empty($opensslErrors)) {
                $errorMsg .= '. Detalhes OpenSSL: ' . implode(', ', $opensslErrors);
            }

            throw new Exception($errorMsg);
        }
        
        // Extrair informações do certificado
        $certInfo = openssl_x509_parse($pkcs12['cert']);
        $validTo = date('Y-m-d H:i:s', $certInfo['validTo_time_t']);
        $validFrom = date('Y-m-d H:i:s', $certInfo['validFrom_time_t']);
        $commonName = $certInfo['subject']['CN'] ?? 'Certificado Digital';
        
        unlink($tempFile);
        
    } catch (Exception $e) {
        if (isset($tempFile) && file_exists($tempFile)) {
            unlink($tempFile);
        }
        throw new Exception('Erro ao validar certificado: ' . $e->getMessage());
    }

    // Salvar certificado usando o ID da empresa
    $certificateManager = new CertificateManager();
    
    // Criar metadados
    $metadata = [
        'empresa_id' => $empresaId,
        'nome_original' => $file['name'],
        'tamanho' => $file['size'],
        'validade' => $validTo,
        'validade_inicio' => $validFrom,
        'nome_certificado' => $commonName,
        'uploaded_at' => date('Y-m-d H:i:s')
    ];

    // Salvar usando ID da empresa como identificador
    $result = $certificateManager->saveCertificateByEmpresaId($empresaId, $certificateContent, $senha, $metadata);
    
    if (!$result['success']) {
        throw new Exception($result['error']);
    }

    // Resposta de sucesso
    echo json_encode([
        'success' => true,
        'message' => 'Certificado enviado com sucesso',
        'data' => [
            'empresa_id' => $empresaId,
            'filename' => $result['filename'],
            'validade' => $validTo,
            'nome_certificado' => $commonName,
            'path' => $result['path']
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
