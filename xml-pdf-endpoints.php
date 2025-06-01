<?php
// ✅ ENDPOINTS PARA XML E PDF DA NFe

// Função para baixar XML
function baixarXML($chave_nfe) {
    header('Content-Type: application/json');
    
    try {
        // Validar chave NFe
        if (empty($chave_nfe) || strlen($chave_nfe) !== 44) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Chave NFe inválida'
            ]);
            return;
        }
        
        // Caminho do arquivo XML
        $xmlPath = "/var/www/nfe-api/storage/xmls/{$chave_nfe}.xml";
        
        // Verificar se arquivo existe
        if (!file_exists($xmlPath)) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'XML não encontrado'
            ]);
            return;
        }
        
        // Ler conteúdo do XML
        $xmlContent = file_get_contents($xmlPath);
        
        if ($xmlContent === false) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erro ao ler arquivo XML'
            ]);
            return;
        }
        
        // Retornar XML
        echo json_encode([
            'success' => true,
            'xml' => $xmlContent,
            'chave' => $chave_nfe,
            'tamanho' => strlen($xmlContent)
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro interno: ' . $e->getMessage()
        ]);
    }
}

// Função para visualizar PDF
function visualizarPDF($chave_nfe) {
    header('Content-Type: application/json');
    
    try {
        // Validar chave NFe
        if (empty($chave_nfe) || strlen($chave_nfe) !== 44) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Chave NFe inválida'
            ]);
            return;
        }
        
        // Caminho do arquivo PDF
        $pdfPath = "/var/www/nfe-api/storage/pdfs/{$chave_nfe}.pdf";
        
        // Verificar se arquivo existe
        if (!file_exists($pdfPath)) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'PDF não encontrado'
            ]);
            return;
        }
        
        // URL pública do PDF (assumindo que storage/pdfs é acessível via web)
        $pdfUrl = "https://apinfe.nexopdv.com/storage/pdfs/{$chave_nfe}.pdf";
        
        // Retornar URL do PDF
        echo json_encode([
            'success' => true,
            'pdf_url' => $pdfUrl,
            'chave' => $chave_nfe,
            'tamanho' => filesize($pdfPath)
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro interno: ' . $e->getMessage()
        ]);
    }
}

// Router simples para testar
if (isset($_GET['action']) && isset($_GET['chave'])) {
    $action = $_GET['action'];
    $chave = $_GET['chave'];
    
    switch ($action) {
        case 'xml':
            baixarXML($chave);
            break;
        case 'pdf':
            visualizarPDF($chave);
            break;
        default:
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Ação inválida'
            ]);
    }
} else {
    echo json_encode([
        'success' => false,
        'error' => 'Parâmetros obrigatórios: action e chave',
        'usage' => [
            'xml' => '?action=xml&chave=CHAVE_NFE',
            'pdf' => '?action=pdf&chave=CHAVE_NFE'
        ]
    ]);
}
?>
