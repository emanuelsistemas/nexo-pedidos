<?php
/**
 * Teste de conexão com Supabase para debug da CCe
 */

header('Content-Type: application/json');

try {
    // Configuração Supabase
    $supabaseUrl = 'https://xsrirnfwsjeovekwtluz.supabase.co';
    $supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcmlybmZ3c2plb3Zla3d0bHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NjQ5OTcsImV4cCI6MjA2MjI0MDk5N30.SrIEj_akvD9x-tltfpV3K4hQSKtPjJ_tQ4FFhPwiIy4';
    
    $chaveNFe = '35250624163237000151550010000000201995318594';
    $empresaId = 'acd26a4f-7220-405e-9c96-faffb7e6480e';
    
    echo "🔍 TESTE SUPABASE - Buscando NFe...\n";
    
    // 1. Buscar NFe
    $nfeQuery = $supabaseUrl . '/rest/v1/pdv?chave_nfe=eq.' . urlencode($chaveNFe) . '&empresa_id=eq.' . urlencode($empresaId);
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $nfeQuery);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $supabaseKey,
        'apikey: ' . $supabaseKey
    ]);
    
    $nfeResponse = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    echo "📝 HTTP Code: {$httpCode}\n";
    echo "📝 cURL Error: " . ($curlError ?: 'Nenhum') . "\n";
    echo "📝 Response: " . substr($nfeResponse, 0, 200) . "...\n";
    
    if ($httpCode !== 200) {
        throw new Exception("Erro na consulta: HTTP {$httpCode}");
    }
    
    $nfeData = json_decode($nfeResponse, true);
    
    if (!$nfeData || empty($nfeData)) {
        throw new Exception('NFe não encontrada');
    }
    
    $nfe = $nfeData[0];
    $pdvId = $nfe['id'];
    
    echo "✅ NFe encontrada - PDV ID: {$pdvId}\n";
    
    // 2. Testar update no campo cartas_correcao
    $testCce = [
        'sequencia' => 999,
        'data_envio' => date('c'),
        'protocolo' => 'TESTE123',
        'correcao' => 'Teste de conexão',
        'status' => 'teste'
    ];
    $testData = json_encode(['cartas_correcao' => json_encode([$testCce])]);
    $updateQuery = $supabaseUrl . '/rest/v1/pdv?id=eq.' . $pdvId;
    
    echo "🔍 TESTE UPDATE...\n";
    echo "📝 Query: {$updateQuery}\n";
    echo "📝 Data: {$testData}\n";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $updateQuery);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $supabaseKey,
        'apikey: ' . $supabaseKey,
        'Prefer: return=minimal'
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $testData);
    
    $updateResponse = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    echo "📝 Update HTTP Code: {$httpCode}\n";
    echo "📝 Update cURL Error: " . ($curlError ?: 'Nenhum') . "\n";
    echo "📝 Update Response: " . ($updateResponse === false ? 'FALSE' : $updateResponse) . "\n";
    
    if ($httpCode >= 200 && $httpCode < 300) {
        echo "✅ TESTE SUPABASE PASSOU!\n";
    } else {
        echo "❌ TESTE SUPABASE FALHOU!\n";
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Teste concluído',
        'data' => [
            'pdv_id' => $pdvId,
            'http_code' => $httpCode,
            'curl_error' => $curlError
        ]
    ]);
    
} catch (Exception $e) {
    echo "❌ ERRO: " . $e->getMessage() . "\n";
    
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
