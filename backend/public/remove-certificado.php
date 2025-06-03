<?php
header('Content-Type: application/json');

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

    // Ler dados JSON
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Dados inválidos');
    }

    // Verificar parâmetros obrigatórios
    $empresaId = $input['empresa_id'] ?? '';
    
    if (empty($empresaId)) {
        throw new Exception('ID da empresa é obrigatório');
    }

    // Remover certificado
    $certificateManager = new CertificateManager();
    $result = $certificateManager->removeCertificateByEmpresaId($empresaId);
    
    if (!$result['success']) {
        throw new Exception($result['error']);
    }

    // Resposta de sucesso
    echo json_encode([
        'success' => true,
        'message' => 'Certificado removido com sucesso',
        'data' => [
            'empresa_id' => $empresaId,
            'removed' => $result['removed']
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
