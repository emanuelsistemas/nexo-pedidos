<?php
/**
 * Script de debug para inutilização NFe
 * Testa cada etapa separadamente
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    echo json_encode([
        'step' => 'inicio',
        'message' => 'Script de debug iniciado',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
    // Teste 1: Verificar dados de entrada
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data) {
        throw new Exception('Dados JSON inválidos');
    }
    
    error_log("DEBUG: Dados recebidos: " . print_r($data, true));
    
    // Teste 2: Buscar empresa
    $empresaId = $data['empresa_id'] ?? 'f35b742b-b3b5-4e99-bbb8-acfccb5c56b0';
    
    $supabaseUrl = 'https://xsrirnfwsjeovekwtluz.supabase.co';
    $supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcmlybmZ3c2plb3Zla3d0bHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMzMzk5NzEsImV4cCI6MjA0ODkxNTk3MX0.VmyrqjgFO8nT_Lqzq0_HQmJnKQiIkTtClQUEWdxwP5s';

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $supabaseUrl . '/rest/v1/empresas?id=eq.' . $empresaId);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $supabaseKey,
        'apikey: ' . $supabaseKey
    ]);

    $empresaResponse = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    error_log("DEBUG: HTTP Code empresa: " . $httpCode);
    error_log("DEBUG: Resposta empresa: " . $empresaResponse);
    
    $empresaData = json_decode($empresaResponse, true);
    
    if (empty($empresaData) || !is_array($empresaData) || count($empresaData) === 0) {
        throw new Exception('Empresa não encontrada');
    }

    $empresa = $empresaData[0];
    
    // Teste 3: Verificar CNPJ
    $cnpjLimpo = preg_replace('/[^0-9]/', '', $empresa['documento']);
    
    error_log("DEBUG: CNPJ original: " . $empresa['documento']);
    error_log("DEBUG: CNPJ limpo: " . $cnpjLimpo);
    error_log("DEBUG: Tamanho CNPJ: " . strlen($cnpjLimpo));
    
    if (strlen($cnpjLimpo) !== 14) {
        throw new Exception('CNPJ da empresa deve ter 14 dígitos. Atual: ' . strlen($cnpjLimpo));
    }
    
    // Teste 4: Buscar configuração NFe
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $supabaseUrl . '/rest/v1/nfe_config?empresa_id=eq.' . $empresaId);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $supabaseKey,
        'apikey: ' . $supabaseKey
    ]);

    $configResponse = curl_exec($ch);
    $httpCodeConfig = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    error_log("DEBUG: HTTP Code config: " . $httpCodeConfig);
    error_log("DEBUG: Resposta config: " . $configResponse);
    
    $configData = json_decode($configResponse, true);
    
    if (empty($configData) || !is_array($configData) || count($configData) === 0) {
        throw new Exception('Configuração NFe não encontrada para esta empresa');
    }

    $nfeConfig = $configData[0];
    
    // Teste 5: Verificar certificado
    require_once '../vendor/autoload.php';
    require_once '../src/Services/CertificateManager.php';
    
    use Nexo\Services\CertificateManager;
    
    $certificateManager = new CertificateManager();
    $certificateResult = $certificateManager->getCertificateByEmpresaId($empresaId);
    
    error_log("DEBUG: Resultado certificado: " . print_r($certificateResult, true));
    
    if (!$certificateResult['success']) {
        throw new Exception('Erro no certificado: ' . $certificateResult['error']);
    }
    
    // Retornar sucesso com todos os dados
    echo json_encode([
        'success' => true,
        'message' => 'Todos os testes passaram',
        'dados' => [
            'empresa_id' => $empresaId,
            'empresa_nome' => $empresa['razao_social'],
            'cnpj_original' => $empresa['documento'],
            'cnpj_limpo' => $cnpjLimpo,
            'cnpj_tamanho' => strlen($cnpjLimpo),
            'ambiente' => $nfeConfig['ambiente'] ?? 2,
            'certificado_path' => $certificateResult['path'],
            'certificado_ok' => $certificateResult['success']
        ]
    ]);

} catch (Exception $e) {
    error_log("DEBUG: Erro capturado: " . $e->getMessage());
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'step' => 'debug'
    ]);
}
?>
