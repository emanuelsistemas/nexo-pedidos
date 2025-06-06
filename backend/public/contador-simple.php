<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

if ($action === 'buscar_empresa') {
    $cnpj = $input['cnpj'] ?? '';
    
    if ($cnpj === '24163237000151') {
        echo json_encode([
            'success' => true,
            'data' => [
                'id' => 'acd26a4f-7220-405e-9c96-faffb7e6480e',
                'nome' => 'Empresa Teste',
                'cnpj' => '24163237000151',
                'razao_social' => 'Empresa Teste LTDA',
                'nome_fantasia' => 'Empresa Teste'
            ]
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Empresa não encontrada'
        ]);
    }
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Ação não especificada'
    ]);
}
?>
