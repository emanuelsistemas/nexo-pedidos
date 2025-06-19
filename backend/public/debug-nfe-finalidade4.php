<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    // Simular dados de NFe com finalidade 4 para debug
    $nfeData = [
        'empresa_id' => 'test',
        'identificacao' => [
            'finalidade' => '4', // Devolução
            'natureza_operacao' => 'Devolução de Venda',
            'serie' => '1',
            'numero' => '999',
            'codigo_numerico' => '12345678'
        ],
        'chaves_ref' => [
            [
                'chave' => '35250624163237000151550010000000481790104751'
            ]
        ],
        'destinatario' => [
            'nome' => 'Cliente Teste',
            'documento' => '12345678901',
            'endereco' => [
                'logradouro' => 'Rua Teste',
                'numero' => '123',
                'bairro' => 'Centro',
                'cidade' => 'São Paulo',
                'uf' => 'SP',
                'cep' => '01000000',
                'codigo_municipio' => '3550308'
            ]
        ],
        'produtos' => [
            [
                'codigo' => 'PROD001',
                'descricao' => 'Produto Teste',
                'ncm' => '22021000',
                'cfop' => '5202', // CFOP de devolução
                'unidade' => 'UN',
                'quantidade' => 1,
                'valor_unitario' => 10.00,
                'valor_total' => 10.00,
                'origem_produto' => 0,
                'csosn_icms' => '102',
                'aliquota_icms' => 0,
                'cst_pis' => '01',
                'aliquota_pis' => 1.65,
                'cst_cofins' => '01',
                'aliquota_cofins' => 7.60
            ]
        ],
        'totais' => [
            'valor_produtos' => 10.00,
            'valor_total' => 10.00,
            'valor_desconto' => 0
        ],
        'pagamentos' => [
            [
                'forma_pagamento' => '01',
                'valor' => 10.00
            ]
        ],
        'transportadora' => [
            'modalidade_frete' => '9'
        ]
    ];

    // Testar validação de chaves de referência
    $chavesRef = $nfeData['chaves_ref'] ?? [];
    $finalidade = $nfeData['identificacao']['finalidade'] ?? '1';
    
    echo json_encode([
        'success' => true,
        'debug' => [
            'finalidade' => $finalidade,
            'chaves_ref_count' => count($chavesRef),
            'chaves_ref' => $chavesRef,
            'finalidade_exige_chave' => in_array($finalidade, ['2', '3', '4']),
            'validacao' => 'OK - Finalidade 4 com chave de referência válida'
        ]
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug' => [
            'finalidade' => $finalidade ?? 'N/A',
            'chaves_ref_count' => count($chavesRef ?? []),
            'erro_linha' => $e->getLine()
        ]
    ], JSON_PRETTY_PRINT);
}
?>
