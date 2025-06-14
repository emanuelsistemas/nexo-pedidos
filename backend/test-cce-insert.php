<?php
/**
 * Teste direto de inserção na tabela cce_nfe
 */

echo "🧪 TESTE DIRETO - INSERÇÃO CCe\n";
echo "==============================\n\n";

// Dados de teste
$empresaId = 'acd26a4f-7220-405e-9c96-faffb7e6480e';
$chaveNFe = '35250624163237000151550010000000211131527349';
$numeroNfe = '21';
$sequencia = 1;
$correcao = 'Teste de inserção direta na tabela cce_nfe';
$ambiente = 'homologacao';

echo "📝 Dados de teste:\n";
echo "   - Empresa ID: {$empresaId}\n";
echo "   - Chave NFe: {$chaveNFe}\n";
echo "   - Número NFe: {$numeroNfe}\n";
echo "   - Sequência: {$sequencia}\n";
echo "   - Correção: {$correcao}\n";
echo "   - Ambiente: {$ambiente}\n\n";

try {
    // Configurar dados
    $supabaseUrl = 'https://xsrirnfwsjeovekwtluz.supabase.co';
    
    // Escapar dados
    $correcaoEscapada = addslashes($correcao);
    
    // Montar query SQL
    $sqlQuery = "INSERT INTO cce_nfe (empresa_id, chave_nfe, numero_nfe, sequencia, correcao, status, codigo_status, descricao_status, ambiente, created_at) VALUES ('{$empresaId}', '{$chaveNFe}', '{$numeroNfe}', {$sequencia}, '{$correcaoEscapada}', 'pendente', 0, 'Teste de inserção', '{$ambiente}', NOW()) RETURNING id;";
    
    echo "🔍 SQL Query:\n";
    echo $sqlQuery . "\n\n";
    
    // Preparar dados para envio
    $insertData = json_encode(['query' => $sqlQuery]);
    $insertQuery = $supabaseUrl . '/v1/projects/xsrirnfwsjeovekwtluz/database/query';
    
    echo "📡 Enviando para Supabase...\n";
    echo "URL: {$insertQuery}\n";
    echo "Data: " . substr($insertData, 0, 200) . "...\n\n";
    
    // Configurar cURL
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $insertQuery);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcmlybnZ3c2plb3Zla3d0bHV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjY2NDk5NywiZXhwIjoyMDYyMjQwOTk3fQ.lJJaWepFPCgG7_5jzJW5VzlyJoEhvJkjlHMQdKVgBHo'
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $insertData);
    
    // Executar requisição
    $insertResponse = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    echo "📊 Resultado:\n";
    echo "   - HTTP Code: {$httpCode}\n";
    echo "   - cURL Error: " . ($curlError ?: 'Nenhum') . "\n";
    echo "   - Response: " . ($insertResponse === false ? 'FALSE' : $insertResponse) . "\n\n";
    
    if ($insertResponse === false || $httpCode < 200 || $httpCode >= 300) {
        throw new Exception("Erro na inserção. HTTP: {$httpCode}, cURL: {$curlError}, Response: {$insertResponse}");
    }
    
    // Processar resposta
    $insertResult = json_decode($insertResponse, true);
    if (is_array($insertResult) && !empty($insertResult)) {
        $cceId = $insertResult[0]['id'] ?? null;
        echo "✅ SUCESSO! CCe inserida com ID: {$cceId}\n";
    } else {
        echo "⚠️ Resposta inesperada: " . print_r($insertResult, true) . "\n";
    }
    
} catch (Exception $e) {
    echo "❌ ERRO: " . $e->getMessage() . "\n";
}

echo "\n🏁 TESTE FINALIZADO\n";
?>
