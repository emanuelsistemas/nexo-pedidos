<?php
// Teste CLI que simula exatamente a chamada do frontend
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== TESTE CLI NFC-e (Simulando Frontend) ===\n";

// Simular dados POST
$_SERVER['REQUEST_METHOD'] = 'POST';
$_POST = [];

// Simular input JSON
$input = [
    'empresa_id' => 'acd26a4f-7220-405e-9c96-faffb7e6480e',
    'nfce_data' => [
        'identificacao' => [
            'numero' => 1,
            'serie' => 1,
            'codigo_numerico' => '87654321',
            'natureza_operacao' => 'Venda de mercadoria'
        ],
        'destinatario' => [],
        'produtos' => [[
            'codigo' => '1',
            'descricao' => 'SKOL LATA 350ml',
            'quantidade' => 1,
            'valor_unitario' => 42.8,
            'unidade' => 'UN',
            'ncm' => '22030000',
            'cfop' => '5102',
            'codigo_barras' => '7891991010023'
        ]]
    ]
];

// Simular php://input
$GLOBALS['mock_input'] = json_encode($input);

// Função para interceptar file_get_contents('php://input')
function file_get_contents_mock($filename) {
    if ($filename === 'php://input') {
        return $GLOBALS['mock_input'];
    }
    return file_get_contents($filename);
}

// Substituir file_get_contents temporariamente
$originalContent = file_get_contents('emitir-nfce.php');

// Substituir a linha que lê php://input
$modifiedContent = str_replace(
    '$rawInput = file_get_contents(\'php://input\');',
    '$rawInput = $GLOBALS[\'mock_input\'];',
    $originalContent
);

// Salvar versão modificada temporariamente
file_put_contents('emitir-nfce-temp.php', $modifiedContent);

echo "Executando emissão NFC-e...\n";

try {
    // Capturar output
    ob_start();
    include 'emitir-nfce-temp.php';
    $output = ob_get_clean();
    
    echo "✅ SUCESSO! NFC-e processada\n";
    echo "Output: " . substr($output, 0, 500) . "\n";
    
} catch (Exception $e) {
    echo "❌ ERRO: " . $e->getMessage() . "\n";
    echo "Arquivo: " . $e->getFile() . ":" . $e->getLine() . "\n";
} finally {
    // Limpar arquivo temporário
    if (file_exists('emitir-nfce-temp.php')) {
        unlink('emitir-nfce-temp.php');
    }
}

echo "\n=== FIM DO TESTE CLI ===\n";
?>
