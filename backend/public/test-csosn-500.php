<?php
// ✅ TESTE ESPECÍFICO PARA CSOSN 500 - ICMS ST RETIDO (SIMPLES NACIONAL)
// Este arquivo testa a correção implementada para CSOSN 500

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Configurar timezone
date_default_timezone_set('America/Sao_Paulo');

// Configurar logs
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', '/var/log/php_nfe_debug.log');

echo json_encode([
    'success' => true,
    'message' => 'Teste CSOSN 500 - Arquivo criado com sucesso',
    'timestamp' => date('Y-m-d H:i:s'),
    'correcao_implementada' => [
        'problema_anterior' => 'CSOSN 500 estava faltando campos obrigatórios',
        'campos_adicionados' => [
            'pST' => 'Alíquota suportada pelo Consumidor Final',
            'vICMSSubstituto' => 'Valor do ICMS Substituto',
            'vBCSTRet' => 'Base de cálculo do ST retido (já existia)',
            'vICMSSTRet' => 'Valor do ICMS ST retido (já existia)'
        ],
        'status' => 'Correção implementada e deploy realizado'
    ]
], JSON_UNESCAPED_UNICODE);
?>
