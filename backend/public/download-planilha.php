<?php
/**
 * Download de planilhas de importação de produtos
 * Permite download seguro de arquivos organizados por empresa
 */

// Verificar método
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
    exit();
}

try {
    // Obter parâmetros
    $filePath = $_GET['file'] ?? '';
    $empresaId = $_GET['empresa'] ?? '';

    // Validar parâmetros
    if (empty($filePath) || empty($empresaId)) {
        throw new Exception('Parâmetros obrigatórios ausentes');
    }

    // Validar empresa_id (UUID)
    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $empresaId)) {
        throw new Exception('ID da empresa inválido');
    }

    // Validar formato do caminho (permitir espaços e parênteses no nome do arquivo)
    if (!preg_match('/^empresa_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[a-zA-Z0-9 _\-\.\(\)]+$/i', $filePath)) {
        throw new Exception('Caminho do arquivo inválido');
    }

    // Verificar se o arquivo pertence à empresa informada
    if (strpos($filePath, "empresa_{$empresaId}/") !== 0) {
        throw new Exception('Acesso negado: arquivo não pertence à empresa');
    }

    // Definir caminho completo
    $baseDir = '/root/nexo-pedidos/backend/storage/planilhas_importacoes';
    $fullPath = $baseDir . '/' . $filePath;

    // Verificar se arquivo existe
    if (!file_exists($fullPath)) {
        throw new Exception('Arquivo não encontrado');
    }

    // Verificar se é um arquivo
    if (!is_file($fullPath)) {
        throw new Exception('Caminho não aponta para um arquivo válido');
    }

    // Verificar se está dentro do diretório permitido (segurança)
    $realBasePath = realpath($baseDir);
    $realFilePath = realpath($fullPath);
    
    if (!$realFilePath || strpos($realFilePath, $realBasePath) !== 0) {
        throw new Exception('Acesso negado: arquivo fora do diretório permitido');
    }

    // Obter informações do arquivo
    $fileName = basename($fullPath);
    $fileSize = filesize($fullPath);
    $fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

    // Definir tipo MIME baseado na extensão
    $mimeTypes = [
        'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'xls' => 'application/vnd.ms-excel',
        'csv' => 'text/csv'
    ];

    $mimeType = $mimeTypes[$fileExtension] ?? 'application/octet-stream';

    // Headers para download
    header('Content-Type: ' . $mimeType);
    header('Content-Disposition: attachment; filename="' . $fileName . '"');
    header('Content-Length: ' . $fileSize);
    header('Cache-Control: no-cache, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');

    // Enviar arquivo
    if (!readfile($fullPath)) {
        throw new Exception('Erro ao ler arquivo');
    }

    // Log da operação
    $logMessage = date('Y-m-d H:i:s') . " - Download realizado: {$filePath} (Empresa: {$empresaId})\n";
    file_put_contents($baseDir . '/download.log', $logMessage, FILE_APPEND | LOCK_EX);

} catch (Exception $e) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} catch (Error $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Erro interno do servidor'
    ]);
}
?>
