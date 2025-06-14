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
    if (!$type || !in_array($type, ['xml', 'pdf', 'xml_cce', 'pdf_cce', 'espelho'])) {
        throw new Exception('Tipo inválido. Use: xml, pdf, xml_cce, pdf_cce ou espelho');
    }
    
    // Para espelhos, chave não é obrigatória
    if ($type !== 'espelho' && (!$chave || strlen($chave) !== 44)) {
        throw new Exception('Chave NFe inválida');
    }
    
    if (!$empresaId) {
        throw new Exception('empresa_id é obrigatório');
    }
    
    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $empresaId)) {
        throw new Exception('empresa_id inválido');
    }
    
    // Buscar ambiente da empresa para determinar diretório correto
    $ambienteTexto = 'homologacao'; // padrão
    try {
        $response = file_get_contents("http://localhost/backend/public/get-empresa-config.php?empresa_id={$empresaId}");
        $config = json_decode($response, true);
        if ($config && isset($config['data']['nfe_config']['ambiente'])) {
            $ambienteTexto = $config['data']['nfe_config']['ambiente'];
        }
    } catch (Exception $e) {
        error_log("Aviso: Não foi possível determinar ambiente, usando homologação");
    }

    // 🔥 NOVA ESTRUTURA COM MODELO DE DOCUMENTO
    // Determinar modelo de documento (55=NFe, 65=NFCe)
    $modelo = '55'; // Por padrão NFe, futuramente será dinâmico para NFCe

    // Determinar diretório base e extensão por tipo COM AMBIENTE E MODELO
    if (in_array($type, ['xml_cce', 'pdf_cce'])) {
        // Para CCe
        $baseType = str_replace('_cce', '', $type);
        $baseDir = "/root/nexo-pedidos/backend/storage/{$baseType}/empresa_{$empresaId}/{$ambienteTexto}/{$modelo}/CCe";
        $extensao = $baseType;
        $sufixoArquivo = '_cce_' . str_pad($sequencia, 3, '0', STR_PAD_LEFT);
    } elseif ($type === 'espelho') {
        // Para Espelho NFe
        $baseDir = "/root/nexo-pedidos/backend/storage/espelhos/{$empresaId}/{$ambienteTexto}/{$modelo}";
        $extensao = 'pdf';
        $sufixoArquivo = '';
    } else {
        // Para NFe normal
        $baseDir = "/root/nexo-pedidos/backend/storage/{$type}/empresa_{$empresaId}/{$ambienteTexto}/{$modelo}/Autorizados";
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
    
    // Para espelhos, buscar por padrão diferente
    if ($type === 'espelho') {
        // Buscar arquivo mais recente que contenha a empresa_id
        $arquivoEncontrado = null;
        if (is_dir($baseDir)) {
            $files = glob($baseDir . "/espelho_danfe_{$empresaId}_*.pdf");
            if (!empty($files)) {
                // Pegar o arquivo mais recente
                usort($files, function($a, $b) {
                    return filemtime($b) - filemtime($a);
                });
                $arquivoEncontrado = $files[0];
            }
        }
    } else {
        $nomeArquivo = "{$chave}{$sufixoArquivo}.{$extensao}";
        $arquivoEncontrado = buscarArquivo($baseDir, $nomeArquivo);
    }
    
    if (!$arquivoEncontrado || !file_exists($arquivoEncontrado)) {
        // Para espelhos, não tentar busca direta pois usa padrão diferente
        if ($type !== 'espelho') {
            // Tentar buscar diretamente na raiz do tipo
            $arquivoDireto = "{$baseDir}/{$nomeArquivo}";
            if (file_exists($arquivoDireto)) {
                $arquivoEncontrado = $arquivoDireto;
            }
        }

        // Se ainda não encontrou, retornar erro
        if (!$arquivoEncontrado || !file_exists($arquivoEncontrado)) {
            http_response_code(404);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => ucfirst($type) . ' não encontrado',
                'chave' => $chave ?? 'N/A',
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
        if ($type === 'pdf_cce') {
            $filename = "CCe_{$chave}_seq{$sequencia}.pdf";
        } elseif ($type === 'espelho') {
            $filename = "Espelho_NFe_" . date('YmdHis') . ".pdf";
        } else {
            $filename = "DANFE_{$chave}.pdf";
        }
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
