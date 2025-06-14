<?php

/**
 * Teste do script real de geração de PDF CCe
 */

echo "=== TESTE SCRIPT REAL PDF CCe ===\n";
echo "Data: " . date('Y-m-d H:i:s') . "\n\n";

// Simular dados JSON que o frontend envia
$dadosJson = [
    'chave' => '35250624163237000151550010000000351589707164',
    'empresa_id' => 'acd26a4f-7220-405e-9c96-faffb7e6480e',
    'sequencia' => 2
];

echo "1. Dados simulados:\n";
echo json_encode($dadosJson, JSON_PRETTY_PRINT) . "\n\n";

echo "2. Fazendo requisição POST para o script real...\n";

// Fazer requisição POST para o script real
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'http://localhost/backend/public/gerar-pdf-cce.php');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($dadosJson));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Content-Length: ' . strlen(json_encode($dadosJson))
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "3. Resultado da requisição:\n";
echo "HTTP Code: $httpCode\n";
echo "CURL Error: " . ($error ?: 'Nenhum') . "\n";
echo "Response Length: " . strlen($response) . " bytes\n\n";

if ($httpCode === 200) {
    echo "✅ Requisição bem-sucedida!\n";
    
    $responseData = json_decode($response, true);
    if ($responseData) {
        echo "4. Dados da resposta:\n";
        echo json_encode($responseData, JSON_PRETTY_PRINT) . "\n";
        
        if (isset($responseData['success']) && $responseData['success']) {
            echo "✅ PDF gerado com sucesso!\n";
            if (isset($responseData['data']['pdf_path'])) {
                $pdfPath = $responseData['data']['pdf_path'];
                echo "PDF Path: $pdfPath\n";
                if (file_exists($pdfPath)) {
                    echo "✅ Arquivo PDF existe: " . filesize($pdfPath) . " bytes\n";
                } else {
                    echo "❌ Arquivo PDF não encontrado no caminho informado\n";
                }
            }
        } else {
            echo "❌ Erro na geração do PDF:\n";
            echo "Erro: " . ($responseData['error'] ?? 'Erro desconhecido') . "\n";
        }
    } else {
        echo "❌ Resposta não é JSON válido\n";
        echo "Resposta raw:\n";
        echo substr($response, 0, 500) . "\n";
    }
} else {
    echo "❌ Erro HTTP: $httpCode\n";
    echo "Resposta:\n";
    echo substr($response, 0, 500) . "\n";
}

echo "\n=== TESTE CONCLUÍDO ===\n";

?>
