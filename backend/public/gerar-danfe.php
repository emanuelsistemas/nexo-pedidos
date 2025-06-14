<?php
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    require_once '../vendor/autoload.php';
    
    // Validar método
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método não permitido. Use POST.');
    }
    
    // Receber dados
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Dados JSON inválidos');
    }
    
    // Parâmetros obrigatórios
    $chave = $input['chave'] ?? null;
    $empresaId = $input['empresa_id'] ?? null;
    
    // Validações
    if (!$chave || strlen($chave) !== 44) {
        throw new Exception('Chave NFe inválida');
    }
    
    if (!$empresaId) {
        throw new Exception('empresa_id é obrigatório');
    }
    
    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $empresaId)) {
        throw new Exception('empresa_id inválido');
    }
    
    // Buscar XML da NFe
    $xmlDir = "../storage/xml/empresa_{$empresaId}";
    $xmlEncontrado = null;
    
    // Função para buscar XML recursivamente
    function buscarXML($dir, $chave) {
        if (!is_dir($dir)) {
            return null;
        }
        
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS)
        );
        
        foreach ($iterator as $file) {
            if ($file->isFile() && $file->getFilename() === "{$chave}.xml") {
                return $file->getPathname();
            }
        }
        
        return null;
    }
    
    $xmlEncontrado = buscarXML($xmlDir, $chave);
    
    if (!$xmlEncontrado || !file_exists($xmlEncontrado)) {
        throw new Exception('XML da NFe não encontrado');
    }
    
    // Ler conteúdo do XML
    $xmlContent = file_get_contents($xmlEncontrado);
    
    if (!$xmlContent) {
        throw new Exception('Erro ao ler XML da NFe');
    }
    
    // Gerar DANFE usando método nativo da biblioteca
    $danfe = new \NFePHP\DA\NFe\Danfe($xmlContent);
    $danfe->debugMode(false);
    $danfe->creditsIntegratorFooter('Sistema Nexo PDV');
    
    // Configurações opcionais do DANFE
    if (isset($input['logo_path']) && file_exists($input['logo_path'])) {
        $danfe->logoParameters($input['logo_path'], 'C', true);
    }
    
    // Gerar PDF
    $pdfContent = $danfe->render();
    
    // Buscar ambiente da empresa para salvar PDF no local correto
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
    // Salvar PDF - ESTRUTURA ORGANIZADA COM AMBIENTE E MODELO (55=NFe, 65=NFCe)
    $modelo = '55'; // NFe por padrão, futuramente será dinâmico para NFCe
    $pdfDir = "../storage/pdf/empresa_{$empresaId}/{$ambienteTexto}/{$modelo}/Autorizados/" . date('Y/m');
    if (!is_dir($pdfDir)) {
        mkdir($pdfDir, 0755, true);
    }

    $pdfPath = "{$pdfDir}/{$chave}.pdf";
    $bytesWritten = file_put_contents($pdfPath, $pdfContent);
    
    if ($bytesWritten === false) {
        throw new Exception('Erro ao salvar PDF');
    }
    
    // Retornar sucesso
    echo json_encode([
        'sucesso' => true,
        'message' => 'DANFE gerado com sucesso',
        'dados' => [
            'chave' => $chave,
            'pdf_path' => $pdfPath,
            'tamanho' => $bytesWritten,
            'url_download' => "/backend/public/download-arquivo.php?type=pdf&chave={$chave}&empresa_id={$empresaId}",
            'url_visualizar' => "/backend/public/download-arquivo.php?type=pdf&chave={$chave}&empresa_id={$empresaId}&action=view"
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'sucesso' => false,
        'erro' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
