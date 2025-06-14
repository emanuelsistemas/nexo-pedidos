<?php
/**
 * Teste para verificar o endpoint get-empresa-config.php
 */

header('Content-Type: application/json; charset=utf-8');

try {
    $empresaId = 'acd26a4f-7220-405e-9c96-faffb7e6480e';
    
    echo json_encode([
        'step' => 'start',
        'message' => 'Iniciando teste do endpoint get-empresa-config.php',
        'empresa_id' => $empresaId
    ]);
    echo "\n";
    
    // Simular requisição interna
    $configUrl = "http://localhost/backend/public/get-empresa-config.php?empresa_id={$empresaId}";
    
    echo json_encode([
        'step' => 'url',
        'message' => 'URL configurada',
        'url' => $configUrl
    ]);
    echo "\n";
    
    // Usar cURL para fazer a requisição
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $configUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    echo json_encode([
        'step' => 'curl_response',
        'message' => 'Resposta cURL recebida',
        'http_code' => $httpCode,
        'response_length' => strlen($response),
        'curl_error' => $error,
        'response_preview' => substr($response, 0, 200)
    ]);
    echo "\n";
    
    if ($httpCode !== 200) {
        throw new Exception("Erro HTTP: {$httpCode}");
    }
    
    if (empty($response)) {
        throw new Exception("Resposta vazia do endpoint");
    }
    
    $configData = json_decode($response, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Erro ao decodificar JSON: " . json_last_error_msg());
    }
    
    echo json_encode([
        'step' => 'json_decode',
        'message' => 'JSON decodificado com sucesso',
        'success' => $configData['success'] ?? false,
        'has_empresa' => isset($configData['data']['empresa']),
        'has_nfe_config' => isset($configData['data']['nfe_config'])
    ]);
    echo "\n";
    
    if (!$configData || !$configData['success']) {
        throw new Exception('Configurações da empresa não encontradas: ' . ($configData['error'] ?? 'Erro desconhecido'));
    }
    
    $empresa = $configData['data']['empresa'];
    $nfeConfig = $configData['data']['nfe_config'];
    
    echo json_encode([
        'step' => 'data_extracted',
        'message' => 'Dados extraídos com sucesso',
        'empresa_razao' => $empresa['razao_social'] ?? 'N/A',
        'empresa_cnpj' => $empresa['cnpj'] ?? 'N/A',
        'ambiente' => $nfeConfig['ambiente'] ?? 'N/A',
        'has_csc_homologacao' => !empty($empresa['csc_homologacao']),
        'has_csc_id_homologacao' => !empty($empresa['csc_id_homologacao'])
    ]);
    echo "\n";
    
    echo json_encode([
        'step' => 'final',
        'status' => 'success',
        'message' => 'Teste concluído com sucesso'
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'step' => 'error',
        'status' => 'error',
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?>
