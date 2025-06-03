<?php
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    // Validar método
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método não permitido. Use POST.');
    }
    
    // Receber dados
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Dados JSON inválidos');
    }
    
    // Extrair dados da NFe do payload (formato do frontend)
    $nfeData = $input['nfe_data'] ?? $input;
    
    // Analisar estrutura dos produtos
    $produtos = $nfeData['produtos'] ?? [];
    
    $analise = [
        'total_produtos' => count($produtos),
        'estrutura_produtos' => [],
        'campos_encontrados' => [],
        'dados_completos' => $nfeData
    ];
    
    foreach ($produtos as $index => $produto) {
        $analise['estrutura_produtos'][$index] = [
            'campos_disponiveis' => array_keys($produto),
            'dados' => $produto
        ];
        
        // Coletar todos os campos únicos
        foreach (array_keys($produto) as $campo) {
            if (!in_array($campo, $analise['campos_encontrados'])) {
                $analise['campos_encontrados'][] = $campo;
            }
        }
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Debug da estrutura NFe',
        'analise' => $analise,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
