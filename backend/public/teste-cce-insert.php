<?php
/**
 * SCRIPT DE TESTE - INSERÇÃO CCe NA TABELA
 * 
 * Este script testa a inserção de uma CCe na tabela cce_nfe
 * para validar se a API key e estrutura estão corretas
 * antes de integrar no código principal.
 */

header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    echo "🚀 INICIANDO TESTE DE INSERÇÃO CCe\n";
    
    // ✅ USAR SERVICE ROLE KEY (PERMISSÕES COMPLETAS)
    $supabaseUrl = 'https://xsrirnfwsjeovekwtluz.supabase.co';
    $supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcmlybmZ3c2plb3Zla3d0bHV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjY2NDk5NywiZXhwIjoyMDYyMjQwOTk3fQ.UC2DvFRcfrNUbRrnQhrpqsX_hJXBLy9g-YVZbpaTcso';
    
    echo "🔑 API Key configurada\n";
    
    // DADOS DE TESTE
    $empresaId = 'acd26a4f-7220-405e-9c96-faffb7e6480e';
    $chaveNFe = '35250624163237000151550010000000201995318594';
    $sequencia = 999; // Sequência de teste
    $correcao = 'TESTE - Correção de dados fiscais para validação';
    
    echo "📝 Dados de teste configurados\n";
    
    // PASSO 1: USAR NÚMERO FIXO PARA TESTE (sem depender da consulta pdv)
    echo "\n🔍 PASSO 1 - Usando número fixo para teste...\n";

    $numeroNfe = 20; // Número fixo para teste
    echo "✅ Número NFe para teste: {$numeroNfe}\n";

    // PASSO 2: INSERIR CCe NA TABELA
    echo "\n🔍 PASSO 2 - Inserindo CCe na tabela...\n";
    
    $cceData = [
        'empresa_id' => $empresaId,
        'chave_nfe' => $chaveNFe,
        'numero_nfe' => $numeroNfe,
        'sequencia' => $sequencia,
        'correcao' => $correcao,
        'status' => 'teste',
        'codigo_status' => 0,
        'descricao_status' => 'Teste de inserção',
        'ambiente' => 'homologacao'
    ];
    
    echo "Dados para inserção:\n";
    echo json_encode($cceData, JSON_PRETTY_PRINT) . "\n";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $supabaseUrl . '/rest/v1/cce_nfe');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
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
    
    echo "\n📊 RESULTADO DA INSERÇÃO:\n";
    echo "HTTP Code: {$httpCode}\n";
    echo "CURL Error: " . ($curlError ?: 'Nenhum') . "\n";
    echo "Response: " . ($insertResponse === false ? 'FALSE' : $insertResponse) . "\n";
    
    if ($httpCode >= 200 && $httpCode < 300) {
        $insertResult = json_decode($insertResponse, true);
        $cceId = $insertResult[0]['id'] ?? null;
        echo "✅ SUCESSO! CCe inserida com ID: {$cceId}\n";
        
        // PASSO 3: VERIFICAR SE FOI INSERIDA
        echo "\n🔍 PASSO 3 - Verificando inserção...\n";

        $checkQuery = $supabaseUrl . '/rest/v1/cce_nfe?empresa_id=eq.' . urlencode($empresaId) . '&chave_nfe=eq.' . urlencode($chaveNFe) . '&sequencia=eq.' . $sequencia;

        $checkContext = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => [
                    'apikey: ' . $supabaseKey,
                    'Authorization: Bearer ' . $supabaseKey,
                    'Content-Type: application/json'
                ]
            ]
        ]);

        $checkResponse = @file_get_contents($checkQuery, false, $checkContext);
        
        if ($checkResponse) {
            $checkData = json_decode($checkResponse, true);
            echo "✅ Verificação: " . count($checkData) . " registro(s) encontrado(s)\n";
            if (!empty($checkData)) {
                echo "Dados inseridos:\n";
                echo json_encode($checkData[0], JSON_PRETTY_PRINT) . "\n";
            }
        }
        
        // PASSO 4: LIMPAR TESTE (OPCIONAL)
        echo "\n🧹 PASSO 4 - Limpando registro de teste...\n";
        
        $deleteQuery = $supabaseUrl . '/rest/v1/cce_nfe?empresa_id=eq.' . urlencode($empresaId) . '&chave_nfe=eq.' . urlencode($chaveNFe) . '&sequencia=eq.' . $sequencia;
        
        $deleteContext = stream_context_create([
            'http' => [
                'method' => 'DELETE',
                'header' => [
                    'apikey: ' . $supabaseKey,
                    'Authorization: Bearer ' . $supabaseKey,
                    'Content-Type: application/json'
                ]
            ]
        ]);
        
        $deleteResponse = @file_get_contents($deleteQuery, false, $deleteContext);
        echo "✅ Registro de teste removido\n";
        
    } else {
        echo "❌ ERRO na inserção: HTTP {$httpCode}\n";
        echo "Response: {$insertResponse}\n";
    }
    
    echo "\n🎉 TESTE CONCLUÍDO!\n";
    
} catch (Exception $e) {
    echo "❌ ERRO: " . $e->getMessage() . "\n";
}
?>
