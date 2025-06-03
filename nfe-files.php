<?php
// ✅ ENDPOINT PARA SERVIR XML E PDF COM CORS CORRETO

// Headers CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Responder OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Função para baixar XML
function baixarXML($chave_nfe) {
    try {
        // Validar chave NFe
        if (empty($chave_nfe) || strlen($chave_nfe) !== 44) {
            http_response_code(400);
            header('Content-Type: application/json');
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
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => 'XML não encontrado',
                'chave' => $chave_nfe
            ]);
            return;
        }
        
        // Ler conteúdo do XML
        $xmlContent = file_get_contents($xmlPath);
        
        if ($xmlContent === false) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => 'Erro ao ler arquivo XML'
            ]);
            return;
        }
        
        // Retornar XML
        header('Content-Type: application/json');
        echo json_encode([
            'success' => true,
            'xml' => $xmlContent,
            'chave' => $chave_nfe,
            'tamanho' => strlen($xmlContent),
            'arquivo' => basename($xmlPath)
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'error' => 'Erro interno: ' . $e->getMessage()
        ]);
    }
}

// Função para visualizar PDF
function visualizarPDF($chave_nfe) {
    try {
        // Validar chave NFe
        if (empty($chave_nfe) || strlen($chave_nfe) !== 44) {
            http_response_code(400);
            header('Content-Type: application/json');
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
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => 'PDF não encontrado',
                'chave' => $chave_nfe,
                'path_tentativa' => $pdfPath
            ]);
            return;
        }
        
        // URL pública do PDF via endpoint direto
        $pdfUrl = "https://apinfe.nexopdv.com/nfe-files.php?action=pdf-direct&chave={$chave_nfe}";
        
        // Retornar URL do PDF
        header('Content-Type: application/json');
        echo json_encode([
            'success' => true,
            'pdf_url' => $pdfUrl,
            'chave' => $chave_nfe,
            'tamanho' => filesize($pdfPath),
            'arquivo' => basename($pdfPath)
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'error' => 'Erro interno: ' . $e->getMessage()
        ]);
    }
}

// Função para servir PDF diretamente
function servirPDF($chave_nfe) {
    try {
        // Validar chave NFe
        if (empty($chave_nfe) || strlen($chave_nfe) !== 44) {
            http_response_code(400);
            echo 'Chave NFe inválida';
            return;
        }
        
        // Caminho do arquivo PDF
        $pdfPath = "/var/www/nfe-api/storage/pdfs/{$chave_nfe}.pdf";
        
        // Verificar se arquivo existe
        if (!file_exists($pdfPath)) {
            http_response_code(404);
            echo 'PDF não encontrado';
            return;
        }
        
        // Headers para PDF
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="NFe_' . $chave_nfe . '.pdf"');
        header('Content-Length: ' . filesize($pdfPath));
        header('Cache-Control: public, max-age=3600');
        
        // Servir arquivo
        readfile($pdfPath);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo 'Erro interno: ' . $e->getMessage();
    }
}

// Router
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
        case 'pdf-direct':
            servirPDF($chave);
            break;
        default:
            http_response_code(400);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => 'Ação inválida'
            ]);
    }
} else {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => 'Parâmetros obrigatórios: action e chave',
        'usage' => [
            'xml' => '?action=xml&chave=CHAVE_NFE',
            'pdf' => '?action=pdf&chave=CHAVE_NFE',
            'pdf-direct' => '?action=pdf-direct&chave=CHAVE_NFE'
        ]
    ]);
}
?>
