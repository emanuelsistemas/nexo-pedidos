<?php
/**
 * Exclusão de planilhas de importação de produtos
 * Remove arquivos localmente organizados por empresa
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Tratar preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Verificar método
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
    exit();
}

try {
    // Ler dados JSON
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data) {
        throw new Exception('Dados JSON inválidos');
    }

    // Validar campo obrigatório
    if (!isset($data['filePath']) || empty($data['filePath'])) {
        throw new Exception('Caminho do arquivo não informado');
    }

    $relativePath = $data['filePath'];

    // Validar formato do caminho (deve ser empresa_UUID/arquivo)
    if (!preg_match('/^empresa_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[a-zA-Z0-9_\-\.]+$/i', $relativePath)) {
        throw new Exception('Caminho do arquivo inválido');
    }

    // Definir diretório base
    $baseDir = '/root/nexo-pedidos/backend/storage/planilhas_importacoes';
    $fullPath = $baseDir . '/' . $relativePath;

    // Verificar se arquivo existe
    if (!file_exists($fullPath)) {
        // Não é erro se arquivo não existe (pode já ter sido deletado)
        echo json_encode([
            'success' => true,
            'message' => 'Arquivo não encontrado (pode já ter sido removido)',
            'filePath' => $relativePath
        ]);
        exit();
    }

    // Verificar se é um arquivo (não diretório)
    if (!is_file($fullPath)) {
        throw new Exception('Caminho não aponta para um arquivo válido');
    }

    // Verificar se está dentro do diretório permitido (segurança)
    $realBasePath = realpath($baseDir);
    $realFilePath = realpath($fullPath);
    
    if (!$realFilePath || strpos($realFilePath, $realBasePath) !== 0) {
        throw new Exception('Acesso negado: arquivo fora do diretório permitido');
    }

    // Tentar deletar arquivo
    if (!unlink($fullPath)) {
        throw new Exception('Erro ao deletar arquivo');
    }

    // Tentar remover diretório da empresa se estiver vazio
    $empresaDir = dirname($fullPath);
    if (is_dir($empresaDir)) {
        $files = scandir($empresaDir);
        // Se só tem . e .. (diretório vazio)
        if (count($files) <= 2) {
            rmdir($empresaDir);
        }
    }

    // Log da operação
    $logMessage = date('Y-m-d H:i:s') . " - Arquivo deletado: {$relativePath}\n";
    file_put_contents($baseDir . '/delete.log', $logMessage, FILE_APPEND | LOCK_EX);

    // Resposta de sucesso
    echo json_encode([
        'success' => true,
        'message' => 'Arquivo deletado com sucesso',
        'filePath' => $relativePath
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} catch (Error $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro interno do servidor'
    ]);
}
?>
