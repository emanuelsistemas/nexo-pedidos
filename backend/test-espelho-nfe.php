<?php

/**
 * Teste para o sistema de espelho NFe
 */

echo "=== TESTE ESPELHO NFe ===\n";
echo "Data: " . date('Y-m-d H:i:s') . "\n\n";

// Dados de teste
$empresaId = 'acd26a4f-7220-405e-9c96-faffb7e6480e';

echo "1. Testando geração de espelho...\n";

// Dados simulados para o espelho
$dadosEspelho = [
    'empresa_id' => $empresaId,
    'dados_nfe' => [
        'numero_documento' => '999',
        'serie' => '1',
        'natureza_operacao' => 'VENDA DE MERCADORIA',
        'destinatario' => [
            'cnpj' => '12345678000123',
            'razao_social' => 'CLIENTE TESTE LTDA'
        ],
        'produtos' => [
            [
                'codigo' => 'PROD001',
                'descricao' => 'PRODUTO TESTE',
                'ncm' => '22021000',
                'cfop' => '5102',
                'unidade' => 'UN',
                'quantidade' => 1,
                'valor_unitario' => 10.50,
                'valor_total' => 10.50
            ]
        ]
    ]
];

echo "Dados do espelho:\n";
echo json_encode($dadosEspelho, JSON_PRETTY_PRINT) . "\n\n";

echo "2. Fazendo requisição para gerar espelho...\n";

// Fazer requisição POST para gerar espelho
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'http://localhost/backend/public/gerar-espelho-danfe.php');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($dadosEspelho));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Content-Length: ' . strlen(json_encode($dadosEspelho))
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "3. Resultado da geração:\n";
echo "HTTP Code: $httpCode\n";
echo "CURL Error: " . ($error ?: 'Nenhum') . "\n";
echo "Response Length: " . strlen($response) . " bytes\n\n";

if ($httpCode === 200) {
    echo "✅ Geração bem-sucedida!\n";
    
    $responseData = json_decode($response, true);
    if ($responseData && isset($responseData['sucesso']) && $responseData['sucesso']) {
        echo "✅ Espelho gerado com sucesso!\n";
        echo "Arquivo: " . $responseData['arquivo'] . "\n";
        echo "Caminho: " . $responseData['caminho'] . "\n";
        echo "Tamanho: " . $responseData['tamanho'] . " bytes\n\n";
        
        // Verificar se arquivo existe
        $caminhoArquivo = $responseData['caminho'];
        if (file_exists($caminhoArquivo)) {
            echo "✅ Arquivo PDF existe: " . filesize($caminhoArquivo) . " bytes\n\n";
            
            echo "4. Testando download do espelho...\n";
            
            // Testar download
            $urlDownload = "http://localhost/backend/public/download-arquivo.php?type=espelho&empresa_id={$empresaId}&action=view";
            echo "URL de download: $urlDownload\n";
            
            $ch2 = curl_init();
            curl_setopt($ch2, CURLOPT_URL, $urlDownload);
            curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch2, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch2, CURLOPT_HEADER, true);
            
            $downloadResponse = curl_exec($ch2);
            $downloadHttpCode = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
            $downloadError = curl_error($ch2);
            curl_close($ch2);
            
            echo "Download HTTP Code: $downloadHttpCode\n";
            echo "Download Error: " . ($downloadError ?: 'Nenhum') . "\n";
            
            if ($downloadHttpCode === 200) {
                echo "✅ Download funcionando!\n";
                
                // Extrair headers
                $headerSize = curl_getinfo($ch2, CURLINFO_HEADER_SIZE);
                $headers = substr($downloadResponse, 0, $headerSize);
                $body = substr($downloadResponse, $headerSize);
                
                echo "Content-Type encontrado: " . (strpos($headers, 'application/pdf') !== false ? 'SIM' : 'NÃO') . "\n";
                echo "Tamanho do body: " . strlen($body) . " bytes\n";
            } else {
                echo "❌ Erro no download: $downloadHttpCode\n";
                echo "Primeiros 500 chars da resposta:\n";
                echo substr($downloadResponse, 0, 500) . "\n";
            }
        } else {
            echo "❌ Arquivo PDF não encontrado no caminho informado\n";
        }
    } else {
        echo "❌ Erro na geração do espelho:\n";
        echo "Resposta: $response\n";
    }
} else {
    echo "❌ Erro HTTP na geração: $httpCode\n";
    echo "Resposta:\n";
    echo substr($response, 0, 500) . "\n";
}

echo "\n5. Verificando estrutura de diretórios...\n";
$ambienteTexto = 'homologacao';
$modelo = '55';
$diretorioEspelho = "/root/nexo-pedidos/backend/storage/espelhos/{$empresaId}/{$ambienteTexto}/{$modelo}";

echo "Diretório esperado: $diretorioEspelho\n";
echo "Diretório existe: " . (is_dir($diretorioEspelho) ? 'SIM' : 'NÃO') . "\n";

if (is_dir($diretorioEspelho)) {
    $arquivos = glob($diretorioEspelho . '/*.pdf');
    echo "Arquivos PDF encontrados: " . count($arquivos) . "\n";
    foreach ($arquivos as $arquivo) {
        echo "  - " . basename($arquivo) . " (" . filesize($arquivo) . " bytes)\n";
    }
}

echo "\n=== TESTE CONCLUÍDO ===\n";

?>
