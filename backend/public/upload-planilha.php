<?php
/**
 * Upload de planilhas de importação de produtos
 * Salva arquivos localmente organizados por empresa
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

    // Validar campos obrigatórios
    $requiredFields = ['fileName', 'empresaId', 'fileData', 'originalName'];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            throw new Exception("Campo obrigatório ausente: {$field}");
        }
    }

    $fileName = $data['fileName'];
    $empresaId = $data['empresaId'];
    $fileData = $data['fileData'];
    $originalName = $data['originalName'];

    // Validar empresa_id (UUID)
    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $empresaId)) {
        throw new Exception('ID da empresa inválido');
    }

    // Validar nome do arquivo
    if (!preg_match('/^[a-zA-Z0-9_\-\.]+$/', $fileName)) {
        throw new Exception('Nome do arquivo contém caracteres inválidos');
    }

    // Validar extensão do arquivo
    $allowedExtensions = ['xlsx', 'xls', 'csv'];
    $fileExtension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    if (!in_array($fileExtension, $allowedExtensions)) {
        throw new Exception('Tipo de arquivo não permitido. Use apenas: ' . implode(', ', $allowedExtensions));
    }

    // Decodificar dados base64
    $fileContent = base64_decode($fileData);
    if ($fileContent === false) {
        throw new Exception('Erro ao decodificar dados do arquivo');
    }

    // Validar tamanho do arquivo (máximo 25MB)
    $maxSize = 25 * 1024 * 1024; // 25MB
    if (strlen($fileContent) > $maxSize) {
        throw new Exception('Arquivo muito grande. Tamanho máximo: 25MB');
    }

    // Definir diretório base
    $baseDir = '/root/nexo-pedidos/backend/storage/planilhas_importacoes';
    $empresaDir = $baseDir . '/empresa_' . $empresaId;

    // Criar diretório da empresa se não existir
    if (!is_dir($empresaDir)) {
        if (!mkdir($empresaDir, 0755, true)) {
            throw new Exception('Erro ao criar diretório da empresa');
        }
    }

    // Caminho completo do arquivo
    $filePath = $empresaDir . '/' . $fileName;
    $relativePath = 'empresa_' . $empresaId . '/' . $fileName;

    // Verificar se arquivo já existe
    if (file_exists($filePath)) {
        throw new Exception('Arquivo já existe');
    }

    // Salvar arquivo
    if (file_put_contents($filePath, $fileContent) === false) {
        throw new Exception('Erro ao salvar arquivo');
    }

    // Definir permissões
    chmod($filePath, 0644);

    // Log da operação
    $logMessage = date('Y-m-d H:i:s') . " - Upload realizado: {$relativePath} (Empresa: {$empresaId})\n";
    file_put_contents($baseDir . '/upload.log', $logMessage, FILE_APPEND | LOCK_EX);

    // Resposta de sucesso
    echo json_encode([
        'success' => true,
        'message' => 'Arquivo enviado com sucesso',
        'filePath' => $relativePath,
        'fullPath' => $filePath,
        'size' => strlen($fileContent),
        'originalName' => $originalName
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
