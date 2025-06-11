<?php

/**
 * Teste simples para verificar se o email está funcionando
 */

header('Content-Type: application/json; charset=utf-8');

try {
    require_once '../includes/storage-paths.php';
    
    $empresa_id = "acd26a4f-7220-405e-9c96-faffb7e6480e";
    $chave_nfe = "35250624163237000151550010000000251101326808";
    
    // Determinar ambiente e modelo baseado na chave NFe
    $ambiente = 'homologacao';
    $modelo = '55';
    
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

    // Usar funções helper
    $xml_dir = getXmlPath($empresa_id, $ambiente, $modelo, 'Autorizados', $ano, $mes);
    $pdf_dir = getPdfPath($empresa_id, $ambiente, $modelo, 'Autorizados', $ano, $mes);
    
    $xml_path = "{$xml_dir}/{$chave_nfe}.xml";
    $pdf_path = "{$pdf_dir}/{$chave_nfe}.pdf";

    $result = [
        'success' => true,
        'chave_nfe' => $chave_nfe,
        'ambiente' => $ambiente,
        'modelo' => $modelo,
        'ano' => $ano,
        'mes' => $mes,
        'xml_dir' => $xml_dir,
        'pdf_dir' => $pdf_dir,
        'xml_path' => $xml_path,
        'pdf_path' => $pdf_path,
        'xml_existe' => file_exists($xml_path),
        'pdf_existe' => file_exists($pdf_path),
        'xml_tamanho' => file_exists($xml_path) ? filesize($xml_path) : 0,
        'pdf_tamanho' => file_exists($pdf_path) ? filesize($pdf_path) : 0
    ];

    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}

?>
