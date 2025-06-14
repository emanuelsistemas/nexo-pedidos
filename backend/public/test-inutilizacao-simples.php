<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    error_log("🚀 Teste simples de inutilização iniciado");
    
    // 1. Validar método HTTP
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método não permitido. Use POST.');
    }

    // 2. Receber e validar dados de entrada
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Dados JSON inválidos');
    }

    // Validar campos obrigatórios
    $requiredFields = ['empresa_id', 'serie', 'numero_inicial', 'numero_final', 'motivo'];
    foreach ($requiredFields as $field) {
        if (!isset($input[$field]) || $input[$field] === '') {
            throw new Exception("Campo obrigatório não informado: {$field}");
        }
    }

    $empresaId = $input['empresa_id'];
    $serie = (int)$input['serie'];
    $numeroInicial = (int)$input['numero_inicial'];
    $numeroFinal = (int)$input['numero_final'];
    $motivo = trim($input['motivo']);

    // 3. Validar empresa_id (UUID)
    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $empresaId)) {
        throw new Exception('empresa_id inválido');
    }

    // 4. Validar numeração
    if ($numeroInicial <= 0 || $numeroFinal <= 0) {
        throw new Exception('Números da NFe devem ser maiores que zero');
    }

    if ($numeroInicial > $numeroFinal) {
        throw new Exception('Número inicial não pode ser maior que o número final');
    }

    // 5. Validar motivo (mínimo 15 caracteres)
    if (strlen($motivo) < 15) {
        throw new Exception('Motivo deve ter pelo menos 15 caracteres');
    }

    error_log("✅ Validações passaram");
    error_log("  - Empresa ID: {$empresaId}");
    error_log("  - Série: {$serie}");
    error_log("  - Número Inicial: {$numeroInicial}");
    error_log("  - Número Final: {$numeroFinal}");
    error_log("  - Motivo: {$motivo}");

    // Simular sucesso
    echo json_encode([
        'success' => true,
        'message' => 'Validações passaram - dados corretos para inutilização',
        'dados' => [
            'empresa_id' => $empresaId,
            'serie' => $serie,
            'numero_inicial' => $numeroInicial,
            'numero_final' => $numeroFinal,
            'motivo' => $motivo
        ]
    ]);

} catch (Exception $e) {
    error_log("❌ Erro na validação: " . $e->getMessage());
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
