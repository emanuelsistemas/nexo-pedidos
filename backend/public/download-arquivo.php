<?php
// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    // Parâmetros obrigatórios
    $type = $_GET['type'] ?? null; // 'xml', 'pdf', 'xml_cce', 'pdf_cce'
    $chave = $_GET['chave'] ?? null;
    $empresaId = $_GET['empresa_id'] ?? null;
    $sequencia = $_GET['sequencia'] ?? 1; // Para CCe

    // Validações
    if (!$type || !in_array($type, ['xml', 'pdf', 'xml_cce', 'pdf_cce'])) {
        throw new Exception('Tipo inválido. Use: xml, pdf, xml_cce ou pdf_cce');
    }
    
    if (!$chave || strlen($chave) !== 44) {
        throw new Exception('Chave NFe inválida');
    }
    
    if (!$empresaId) {
        throw new Exception('empresa_id é obrigatório');
    }
    
    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $empresaId)) {
        throw new Exception('empresa_id inválido');
    }
    
    // Determinar diretório base e extensão por tipo
    if (in_array($type, ['xml_cce', 'pdf_cce'])) {
        // Para CCe
        $baseType = str_replace('_cce', '', $type);
        $baseDir = "../storage/{$baseType}/empresa_{$empresaId}/CCe";
        $extensao = $baseType;
        $sufixoArquivo = '_cce_' . str_pad($sequencia, 3, '0', STR_PAD_LEFT);
    } else {
        // Para NFe normal
        $baseDir = "../storage/{$type}/empresa_{$empresaId}/Autorizados";
        $extensao = $type;
        $sufixoArquivo = '';
    }

    // Buscar arquivo recursivamente (pode estar em subpastas por data)
    $arquivoEncontrado = null;
    
    // Função para buscar arquivo recursivamente
    function buscarArquivo($dir, $nomeArquivo) {
        if (!is_dir($dir)) {
            return null;
        }
        
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS)
        );
        
        foreach ($iterator as $file) {
            if ($file->isFile() && $file->getFilename() === $nomeArquivo) {
                return $file->getPathname();
            }
        }
        
        return null;
    }
    
    $nomeArquivo = "{$chave}{$sufixoArquivo}.{$extensao}";
    $arquivoEncontrado = buscarArquivo($baseDir, $nomeArquivo);
    
    if (!$arquivoEncontrado || !file_exists($arquivoEncontrado)) {
        // Tentar buscar diretamente na raiz do tipo
        $arquivoDireto = "{$baseDir}/{$nomeArquivo}";
        if (file_exists($arquivoDireto)) {
            $arquivoEncontrado = $arquivoDireto;
        } else {
            http_response_code(404);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => ucfirst($type) . ' não encontrado',
                'chave' => $chave,
                'empresa_id' => $empresaId
            ]);
            exit;
        }
    }
    
    // Determinar tipo de conteúdo e nome do arquivo
    if (in_array($type, ['xml', 'xml_cce'])) {
        $contentType = 'application/xml';
        $filename = $type === 'xml_cce' ? "CCe_{$chave}_seq{$sequencia}.xml" : "NFe_{$chave}.xml";
    } else {
        $contentType = 'application/pdf';
        $filename = $type === 'pdf_cce' ? "CCe_{$chave}_seq{$sequencia}.pdf" : "DANFE_{$chave}.pdf";
    }
    
    // Verificar se é para download ou visualização
    $action = $_GET['action'] ?? 'download'; // 'download' ou 'view'
    
    // Headers para download/visualização
    header('Content-Type: ' . $contentType);
    header('Content-Length: ' . filesize($arquivoEncontrado));
    
    if ($action === 'download') {
        header('Content-Disposition: attachment; filename="' . $filename . '"');
    } else {
        // Para visualização (especialmente PDF)
        header('Content-Disposition: inline; filename="' . $filename . '"');
    }
    
    // Cache headers
    header('Cache-Control: private, max-age=3600');
    header('Expires: ' . gmdate('D, d M Y H:i:s', time() + 3600) . ' GMT');
    
    // Enviar arquivo
    readfile($arquivoEncontrado);
    
} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
