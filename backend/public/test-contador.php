<?php
header('Content-Type: application/json');

// Teste simples
echo json_encode([
    'success' => true,
    'message' => 'Endpoint funcionando',
    'data' => [
        'id' => 'acd26a4f-7220-405e-9c96-faffb7e6480e',
        'nome' => 'Empresa Teste',
        'cnpj' => '24163237000151',
        'razao_social' => 'Empresa Teste LTDA',
        'nome_fantasia' => 'Empresa Teste'
    ]
]);
?>
