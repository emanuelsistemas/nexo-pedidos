<?php
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    // Verificar se a biblioteca sped-nfe está disponível
    require_once '../vendor/autoload.php';
    
    // Verificar se as classes principais existem
    $classes_necessarias = [
        'NFePHP\NFe\Tools',
        'NFePHP\NFe\Make',
        'NFePHP\Common\Certificate'
    ];
    
    $classes_ok = true;
    $classes_status = [];
    
    foreach ($classes_necessarias as $classe) {
        $existe = class_exists($classe);
        $classes_status[$classe] = $existe;
        if (!$existe) {
            $classes_ok = false;
        }
    }
    
    // Verificar extensões PHP necessárias
    $extensoes_necessarias = [
        'openssl',
        'curl',
        'json',
        'mbstring',
        'xml',
        'soap'
    ];
    
    $extensoes_ok = true;
    $extensoes_status = [];
    
    foreach ($extensoes_necessarias as $extensao) {
        $carregada = extension_loaded($extensao);
        $extensoes_status[$extensao] = $carregada;
        if (!$carregada) {
            $extensoes_ok = false;
        }
    }
    
    // Verificar diretórios de storage
    $diretorios = [
        'certificados' => '../storage/certificados',
        'xml' => '../storage/xml',
        'pdf' => '../storage/pdf'
    ];
    
    $diretorios_ok = true;
    $diretorios_status = [];
    
    foreach ($diretorios as $nome => $caminho) {
        $existe = is_dir($caminho);
        $gravavel = $existe ? is_writable($caminho) : false;
        
        $diretorios_status[$nome] = [
            'existe' => $existe,
            'gravavel' => $gravavel,
            'caminho' => realpath($caminho) ?: $caminho
        ];
        
        if (!$existe || !$gravavel) {
            $diretorios_ok = false;
        }
    }
    
    // Status geral
    $status_geral = $classes_ok && $extensoes_ok && $diretorios_ok;
    
    echo json_encode([
        'success' => true,
        'status' => $status_geral ? 'Online - Sistema NFe Local Funcionando' : 'Offline - Problemas Detectados',
        'timestamp' => date('Y-m-d H:i:s'),
        'detalhes' => [
            'biblioteca_sped_nfe' => [
                'status' => $classes_ok ? 'OK' : 'ERRO',
                'classes' => $classes_status
            ],
            'extensoes_php' => [
                'status' => $extensoes_ok ? 'OK' : 'ERRO',
                'extensoes' => $extensoes_status
            ],
            'diretorios_storage' => [
                'status' => $diretorios_ok ? 'OK' : 'ERRO',
                'diretorios' => $diretorios_status
            ]
        ],
        'versao_php' => PHP_VERSION,
        'servidor' => $_SERVER['SERVER_SOFTWARE'] ?? 'Desconhecido'
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'status' => 'Offline - Erro no Sistema',
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
