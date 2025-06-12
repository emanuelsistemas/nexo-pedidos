<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('max_execution_time', 30);

echo "=== TESTE SIMPLES NFC-e ===\n";

// Teste 1: Verificar se consegue ler dados
echo "1. Testando leitura de dados...\n";
$rawInput = file_get_contents('php://input');
echo "Dados recebidos: " . strlen($rawInput) . " bytes\n";
echo "Preview: " . substr($rawInput, 0, 100) . "\n";

if (empty($rawInput)) {
    echo "❌ Nenhum dado recebido\n";
    exit;
}

// Teste 2: Decodificar JSON
echo "2. Testando decodificação JSON...\n";
$input = json_decode($rawInput, true);
if (!$input) {
    echo "❌ Erro JSON: " . json_last_error_msg() . "\n";
    exit;
}
echo "✅ JSON decodificado com sucesso\n";

// Teste 3: Verificar parâmetros
echo "3. Verificando parâmetros...\n";
$empresaId = $input['empresa_id'] ?? null;
$nfceData = $input['nfce_data'] ?? null;

if (!$empresaId) {
    echo "❌ empresa_id não encontrado\n";
    exit;
}

if (!$nfceData) {
    echo "❌ nfce_data não encontrado\n";
    exit;
}

echo "✅ Parâmetros encontrados\n";
echo "Empresa ID: {$empresaId}\n";
echo "Produtos: " . count($nfceData['produtos'] ?? []) . "\n";

// Teste 4: Verificar se consegue carregar autoload
echo "4. Testando autoload...\n";
try {
    require_once '../vendor/autoload.php';
    echo "✅ Autoload carregado\n";
} catch (Exception $e) {
    echo "❌ Erro no autoload: " . $e->getMessage() . "\n";
    exit;
}

// Teste 5: Verificar se consegue criar Make
echo "5. Testando criação do Make...\n";
try {
    $make = new \NFePHP\NFe\Make();
    echo "✅ Make criado com sucesso\n";
} catch (Exception $e) {
    echo "❌ Erro no Make: " . $e->getMessage() . "\n";
    exit;
}

echo "\n=== TESTE CONCLUÍDO COM SUCESSO ===\n";
echo json_encode(['success' => true, 'message' => 'Teste básico passou']);
?>
