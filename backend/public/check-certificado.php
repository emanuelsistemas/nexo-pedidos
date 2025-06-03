<?php
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../vendor/autoload.php';

use Nexo\Services\CertificateManager;

try {
    // Verificar se é GET
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        throw new Exception('Método não permitido');
    }

    // Verificar parâmetros obrigatórios
    $empresaId = $_GET['empresa_id'] ?? '';
    
    if (empty($empresaId)) {
        throw new Exception('ID da empresa é obrigatório');
    }

    // Verificar certificado
    $certificateManager = new CertificateManager();
    $result = $certificateManager->loadCertificateByEmpresaId($empresaId);
    
    if (!$result['success']) {
        // Certificado não encontrado
        echo json_encode([
            'success' => true,
            'exists' => false,
            'message' => 'Certificado não encontrado'
        ]);
        exit;
    }

    // Certificado encontrado - verificar validade
    $metadata = $result['metadata'];
    $validade = $metadata['validade'] ?? null;
    $isValid = true;
    $status = 'ativo';

    if ($validade) {
        $validadeDate = new DateTime($validade);
        $now = new DateTime();
        
        if ($validadeDate < $now) {
            $isValid = false;
            $status = 'vencido';
        } elseif ($validadeDate->diff($now)->days <= 30) {
            $status = 'vencendo';
        }
    }

    // Resposta de sucesso
    echo json_encode([
        'success' => true,
        'exists' => true,
        'data' => [
            'empresa_id' => $empresaId,
            'filename' => $metadata['filename'] ?? '',
            'nome_certificado' => $metadata['nome_certificado'] ?? '',
            'validade' => $validade,
            'status' => $status,
            'is_valid' => $isValid,
            'uploaded_at' => $metadata['uploaded_at'] ?? $metadata['created_at'] ?? '',
            'tamanho' => $metadata['tamanho'] ?? 0
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
