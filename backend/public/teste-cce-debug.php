<?php
/**
 * Script para testar a inserção na tabela cce_nfe diretamente
 */

header('Content-Type: application/json');
error_log("🔍 INICIANDO TESTE DE INSERÇÃO NA TABELA CCE_NFE");

try {
    // Dados de teste (use valores reais conforme a Lei dos Dados Reais)
    $empresaId = 'acd26a4f-7220-405e-9c96-faffb7e6480e';
    $chaveNfe = '35250624163237000151550010000000221438112180';
    $sequencia = 901; // Número alto para teste
    $correcao = 'Teste de correção via script de debug ' . date('Y-m-d H:i:s');
    
    // Configuração do Supabase
    $supabaseUrl = 'https://xsrirnfwsjeovekwtluz.supabase.co';
    $supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcmlybnZ3c2plb3Zla3d0bHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMzMzk5NzEsImV4cCI6MjA0ODkxNTk3MX0.VmyrqjgFO8nT_Lqzq0_HQmJnKQiIkTtClQUEWdxwP5s';
    
    // Dados para inserção
    $cceData = [
        'empresa_id' => $empresaId,
        'chave_nfe' => $chaveNfe,
        'numero_nfe' => '22', // Pode ser qualquer valor para teste
        'sequencia' => $sequencia,
        'correcao' => $correcao,
        'protocolo' => '123456789', // Protocolo de teste
        'status' => 'teste',
        'codigo_status' => 999,
        'descricao_status' => 'Teste de inserção direta',
        'ambiente' => 'homologacao',
        'xml_path' => '/teste/path',
        'xml_nome' => 'teste.xml'
    ];
    
    error_log("🔍 DEBUG - Dados para inserção: " . json_encode($cceData));
    
    // Tentar inserção direta
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $supabaseUrl . '/rest/v1/cce_nfe');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Ignorar verificação SSL
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false); // Ignorar verificação de host SSL
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $supabaseKey,
        'apikey: ' . $supabaseKey,
        'Prefer: return=representation'
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($cceData));
    
    $insertResponse = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    error_log("🔍 DEBUG - HTTP Code: {$httpCode}");
    error_log("🔍 DEBUG - CURL error: {$curlError}");
    error_log("🔍 DEBUG - Response: " . ($insertResponse === false ? 'FALSE' : $insertResponse));
    
    // Verificar sucesso
    if ($httpCode >= 200 && $httpCode < 300) {
        $insertResult = json_decode($insertResponse, true);
        $cceId = $insertResult[0]['id'] ?? null;
        error_log("✅ CCe teste gravada no banco com ID: {$cceId}");
        
        // Dados para sucesso
        $resultado = [
            'success' => true,
            'message' => 'Registro de teste inserido com sucesso',
            'data' => [
                'id' => $cceId,
                'sequencia' => $sequencia
            ],
            'response' => $insertResult
        ];
    } else {
        // Dados para erro
        $resultado = [
            'success' => false,
            'error' => "Falha na inserção - HTTP {$httpCode}",
            'curl_error' => $curlError,
            'response' => $insertResponse
        ];
        error_log("❌ ERRO na inserção de teste: HTTP {$httpCode}, Response: {$insertResponse}");
    }
    
    // Retornar resultado
    echo json_encode($resultado, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    error_log("❌ ERRO GERAL: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
