<?php

/**
 * Script de debug para verificar estrutura de arquivos NFe
 * Usado para diagnosticar problemas de envio de email
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Tratar OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Parâmetros
    $empresa_id = $_GET['empresa_id'] ?? '';
    $chave_nfe = $_GET['chave_nfe'] ?? '';

    if (empty($empresa_id) || empty($chave_nfe)) {
        throw new Exception('empresa_id e chave_nfe são obrigatórios');
    }

    // Determinar ambiente e modelo baseado na chave NFe
    $ambiente = 'homologacao'; // Padrão
    $modelo = '55'; // Padrão NFe
    
    if (strlen($chave_nfe) === 44) {
        $ambiente_codigo = substr($chave_nfe, 20, 1);
        $ambiente = ($ambiente_codigo === '1') ? 'producao' : 'homologacao';
        
        $modelo_codigo = substr($chave_nfe, 20, 2);
        $modelo = (substr($modelo_codigo, 1, 2) === '65') ? '65' : '55';
    }

    // Extrair ano e mês da chave NFe
    $ano_mes = substr($chave_nfe, 2, 4);
    $ano = '20' . substr($ano_mes, 0, 2);
    $mes = substr($ano_mes, 2, 2);

    // Base path - CORRIGIDO para usar caminho real
    $base_path = "/root/nexo/nexo-pedidos/backend/storage";

    // Estruturas possíveis para verificar
    $estruturas = [
        'atual' => [
            'xml' => "{$base_path}/xml/empresa_{$empresa_id}/{$ambiente}/{$modelo}/Autorizados/{$ano}/{$mes}/{$chave_nfe}.xml",
            'pdf' => "{$base_path}/pdf/empresa_{$empresa_id}/{$ambiente}/{$modelo}/Autorizados/{$ano}/{$mes}/{$chave_nfe}.pdf"
        ],
        'antiga' => [
            'xml' => "{$base_path}/xml/empresa_{$empresa_id}/{$ambiente}/{$modelo}/{$ano}/{$mes}/Autorizados/{$chave_nfe}.xml",
            'pdf' => "{$base_path}/pdf/empresa_{$empresa_id}/{$ambiente}/{$modelo}/{$ano}/{$mes}/Autorizados/{$chave_nfe}.pdf"
        ],
        'com_sufixo' => [
            'xml' => "{$base_path}/xml/empresa_{$empresa_id}/{$ambiente}/{$modelo}/Autorizados/{$ano}/{$mes}/{$chave_nfe}-nfe.xml",
            'pdf' => "{$base_path}/pdf/empresa_{$empresa_id}/{$ambiente}/{$modelo}/Autorizados/{$ano}/{$mes}/{$chave_nfe}-danfe.pdf"
        ]
    ];

    $resultado = [
        'chave_nfe' => $chave_nfe,
        'empresa_id' => $empresa_id,
        'ambiente' => $ambiente,
        'modelo' => $modelo,
        'ano' => $ano,
        'mes' => $mes,
        'base_path' => $base_path,
        'estruturas_testadas' => []
    ];

    // Testar cada estrutura
    foreach ($estruturas as $nome => $caminhos) {
        $xml_existe = file_exists($caminhos['xml']);
        $pdf_existe = file_exists($caminhos['pdf']);
        
        $resultado['estruturas_testadas'][$nome] = [
            'xml_path' => $caminhos['xml'],
            'pdf_path' => $caminhos['pdf'],
            'xml_existe' => $xml_existe,
            'pdf_existe' => $pdf_existe,
            'xml_tamanho' => $xml_existe ? filesize($caminhos['xml']) : 0,
            'pdf_tamanho' => $pdf_existe ? filesize($caminhos['pdf']) : 0
        ];
    }

    // Verificar diretórios existentes
    $diretorios_para_verificar = [
        "{$base_path}/xml/empresa_{$empresa_id}",
        "{$base_path}/xml/empresa_{$empresa_id}/{$ambiente}",
        "{$base_path}/xml/empresa_{$empresa_id}/{$ambiente}/{$modelo}",
        "{$base_path}/xml/empresa_{$empresa_id}/{$ambiente}/{$modelo}/Autorizados",
        "{$base_path}/xml/empresa_{$empresa_id}/{$ambiente}/{$modelo}/Autorizados/{$ano}",
        "{$base_path}/xml/empresa_{$empresa_id}/{$ambiente}/{$modelo}/Autorizados/{$ano}/{$mes}",
        "{$base_path}/pdf/empresa_{$empresa_id}",
        "{$base_path}/pdf/empresa_{$empresa_id}/{$ambiente}",
        "{$base_path}/pdf/empresa_{$empresa_id}/{$ambiente}/{$modelo}",
        "{$base_path}/pdf/empresa_{$empresa_id}/{$ambiente}/{$modelo}/Autorizados",
        "{$base_path}/pdf/empresa_{$empresa_id}/{$ambiente}/{$modelo}/Autorizados/{$ano}",
        "{$base_path}/pdf/empresa_{$empresa_id}/{$ambiente}/{$modelo}/Autorizados/{$ano}/{$mes}"
    ];

    $resultado['diretorios'] = [];
    foreach ($diretorios_para_verificar as $dir) {
        $resultado['diretorios'][$dir] = [
            'existe' => is_dir($dir),
            'permissoes' => is_dir($dir) ? substr(sprintf('%o', fileperms($dir)), -4) : null
        ];
    }

    // Listar arquivos nos diretórios que existem
    $xml_dir = "{$base_path}/xml/empresa_{$empresa_id}/{$ambiente}/{$modelo}/Autorizados/{$ano}/{$mes}";
    $pdf_dir = "{$base_path}/pdf/empresa_{$empresa_id}/{$ambiente}/{$modelo}/Autorizados/{$ano}/{$mes}";

    if (is_dir($xml_dir)) {
        $resultado['arquivos_xml'] = array_diff(scandir($xml_dir), ['.', '..']);
    }

    if (is_dir($pdf_dir)) {
        $resultado['arquivos_pdf'] = array_diff(scandir($pdf_dir), ['.', '..']);
    }

    echo json_encode($resultado, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}

?>
