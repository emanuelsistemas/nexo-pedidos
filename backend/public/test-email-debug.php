<?php

/**
 * Teste de debug para email sem envio real
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

    // Verificar se arquivos existem
    $xml_existe = file_exists($xml_path);
    $pdf_existe = file_exists($pdf_path);

    if (!$xml_existe || !$pdf_existe) {
        throw new Exception("Arquivos não encontrados - XML: " . ($xml_existe ? 'OK' : 'NÃO') . ", PDF: " . ($pdf_existe ? 'OK' : 'NÃO'));
    }

    // Tentar carregar EmailService
    require_once '../vendor/autoload.php';
    require_once '../src/Services/EmailService.php';

    $result = [
        'success' => true,
        'message' => 'Arquivos encontrados e EmailService carregado com sucesso',
        'chave_nfe' => $chave_nfe,
        'ambiente' => $ambiente,
        'modelo' => $modelo,
        'xml_path' => $xml_path,
        'pdf_path' => $pdf_path,
        'xml_existe' => $xml_existe,
        'pdf_existe' => $pdf_existe,
        'xml_tamanho' => filesize($xml_path),
        'pdf_tamanho' => filesize($pdf_path),
        'emailservice_loaded' => class_exists('NexoNFe\\Services\\EmailService')
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
