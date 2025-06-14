<?php
/**
 * Teste do endpoint carta-correcao.php
 */

echo "🧪 TESTE ENDPOINT CCe\n";
echo "====================\n\n";

// Dados de teste
$postData = json_encode([
    'chave_nfe' => '35250624163237000151550010000000201995318594',
    'empresa_id' => 'acd26a4f-7220-405e-9c96-faffb7e6480e',
    'correcao' => 'Teste de correção para verificar funcionamento',
    'sequencia' => 4 // Nova sequência para não conflitar
]);

echo "📡 Enviando requisição para carta-correcao.php...\n";
echo "📄 Dados: " . $postData . "\n\n";

// Configurar cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'http://localhost/backend/public/carta-correcao.php');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Content-Length: ' . strlen($postData)
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 60);
curl_setopt($ch, CURLOPT_VERBOSE, true);

// Executar requisição
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "📊 RESULTADO:\n";
echo "=============\n";
echo "HTTP Code: {$httpCode}\n";

if ($error) {
    echo "❌ Erro cURL: {$error}\n";
} else {
    echo "✅ Requisição executada\n";
}

echo "\n📄 RESPOSTA:\n";
echo "=============\n";
echo $response . "\n";

if ($httpCode === 200) {
    echo "\n✅ SUCESSO - Endpoint funcionando\n";
} else {
    echo "\n❌ ERRO - HTTP {$httpCode}\n";
    
    // Tentar decodificar JSON se possível
    $jsonResponse = json_decode($response, true);
    if ($jsonResponse) {
        echo "📋 Erro decodificado: " . ($jsonResponse['error'] ?? 'Erro desconhecido') . "\n";
    }
}

echo "\n🏁 TESTE CONCLUÍDO\n";
?>
