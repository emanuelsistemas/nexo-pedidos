<?php
/**
 * Teste simples para gerar PDF da CCe usando o endpoint existente
 */

echo "🧪 TESTE SIMPLES - GERAÇÃO PDF CCe\n";
echo "===================================\n\n";

// Dados das CCe para teste
$chaveNFe = '35250624163237000151550010000000201995318594';
$empresaId = 'acd26a4f-7220-405e-9c96-faffb7e6480e';
$sequencias = [2, 3]; // CCe existentes

foreach ($sequencias as $sequencia) {
    echo "📄 Testando CCe sequência {$sequencia}...\n";
    
    // Dados para enviar ao endpoint
    $postData = json_encode([
        'chave' => $chaveNFe,
        'empresa_id' => $empresaId,
        'sequencia' => $sequencia
    ]);
    
    // Configurar cURL
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'http://localhost/backend/public/gerar-pdf-cce.php');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Content-Length: ' . strlen($postData)
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    // Executar requisição
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        echo "   ❌ Erro cURL: {$error}\n\n";
        continue;
    }
    
    echo "   📡 HTTP Code: {$httpCode}\n";
    
    if ($httpCode !== 200) {
        echo "   ❌ Erro HTTP: {$httpCode}\n";
        echo "   📄 Response: {$response}\n\n";
        continue;
    }
    
    $result = json_decode($response, true);
    
    if (!$result) {
        echo "   ❌ Resposta JSON inválida\n";
        echo "   📄 Response: {$response}\n\n";
        continue;
    }
    
    if (!$result['success']) {
        echo "   ❌ Erro: " . ($result['error'] ?? 'Erro desconhecido') . "\n\n";
        continue;
    }
    
    echo "   ✅ PDF gerado com sucesso!\n";
    echo "   📁 Arquivo: " . $result['data']['pdf_nome'] . "\n";
    echo "   📊 Tamanho: " . $result['data']['tamanho'] . " bytes\n";
    echo "   🌐 URL: " . $result['data']['url_visualizar'] . "\n\n";
}

echo "🏁 TESTE CONCLUÍDO\n";
?>
