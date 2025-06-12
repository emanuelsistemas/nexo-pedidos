<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('max_execution_time', 10);

echo "=== TESTE ENDPOINT CONFIG ===\n";

$empresaId = 'acd26a4f-7220-405e-9c96-faffb7e6480e';
$url = "http://localhost/backend/public/get-empresa-config.php?empresa_id={$empresaId}";

echo "1. Testando endpoint: {$url}\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

echo "2. Executando requisição...\n";
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

echo "HTTP Code: {$httpCode}\n";
echo "cURL Error: {$curlError}\n";
echo "Response size: " . strlen($response) . " bytes\n";

if ($response) {
    echo "Response preview: " . substr($response, 0, 300) . "\n";
    
    $data = json_decode($response, true);
    if ($data) {
        echo "✅ JSON válido\n";
        if ($data['success'] ?? false) {
            echo "✅ Configuração carregada com sucesso\n";
            echo "Empresa: " . ($data['data']['empresa']['razao_social'] ?? 'N/A') . "\n";
            echo "Ambiente: " . ($data['data']['nfe_config']['ambiente'] ?? 'N/A') . "\n";
        } else {
            echo "❌ Erro na configuração: " . ($data['error'] ?? 'Erro desconhecido') . "\n";
        }
    } else {
        echo "❌ JSON inválido\n";
    }
} else {
    echo "❌ Resposta vazia\n";
}

echo "\n=== FIM TESTE ===\n";
?>
