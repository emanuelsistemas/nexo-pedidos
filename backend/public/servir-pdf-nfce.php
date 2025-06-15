<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Tratar requisições OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config/supabase.php';

try {
    // Verificar se é uma requisição GET
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        throw new Exception('Método não permitido. Use GET.');
    }

    // Obter parâmetros
    $chave_nfe = $_GET['chave'] ?? '';
    $empresa_id = $_GET['empresa_id'] ?? '';

    if (empty($chave_nfe)) {
        throw new Exception('Chave da NFC-e é obrigatória');
    }

    if (empty($empresa_id)) {
        throw new Exception('ID da empresa é obrigatório');
    }

    // Validar formato da chave (44 dígitos)
    if (!preg_match('/^\d{44}$/', $chave_nfe)) {
        throw new Exception('Formato de chave inválido');
    }

    // Buscar dados da empresa para determinar ambiente
    $stmt = $pdo->prepare("
        SELECT ambiente_nfe 
        FROM empresas 
        WHERE id = :empresa_id
    ");
    $stmt->execute([':empresa_id' => $empresa_id]);
    $empresa = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$empresa) {
        throw new Exception('Empresa não encontrada');
    }

    // Determinar ambiente
    $ambiente = ($empresa['ambiente_nfe'] === 'producao') ? 'producao' : 'homologacao';

    // Construir caminho do PDF
    $caminhoBase = "/root/nexo-pedidos/backend/storage/pdf/empresa_{$empresa_id}/{$ambiente}/65";
    $nomeArquivo = "{$chave_nfe}.pdf";
    $caminhoCompleto = "{$caminhoBase}/{$nomeArquivo}";

    // Verificar se o arquivo existe
    if (!file_exists($caminhoCompleto)) {
        // Tentar buscar em subdiretórios por data (estrutura antiga)
        $padraoData = "/root/nexo-pedidos/backend/storage/pdf/empresa_{$empresa_id}/{$ambiente}/65/*/";
        $diretorios = glob($padraoData, GLOB_ONLYDIR);
        
        $arquivoEncontrado = false;
        foreach ($diretorios as $diretorio) {
            $caminhoTentativa = "{$diretorio}/{$nomeArquivo}";
            if (file_exists($caminhoTentativa)) {
                $caminhoCompleto = $caminhoTentativa;
                $arquivoEncontrado = true;
                break;
            }
        }

        if (!$arquivoEncontrado) {
            throw new Exception('PDF da NFC-e não encontrado');
        }
    }

    // Verificar se o arquivo é legível
    if (!is_readable($caminhoCompleto)) {
        throw new Exception('Arquivo PDF não pode ser lido');
    }

    // Obter informações do arquivo
    $tamanhoArquivo = filesize($caminhoCompleto);
    $nomeDownload = "NFC-e_{$chave_nfe}.pdf";

    // Definir headers para download/visualização do PDF
    header('Content-Type: application/pdf');
    header('Content-Length: ' . $tamanhoArquivo);
    header('Content-Disposition: inline; filename="' . $nomeDownload . '"');
    header('Cache-Control: private, max-age=0, must-revalidate');
    header('Pragma: public');

    // Limpar buffer de saída
    if (ob_get_level()) {
        ob_end_clean();
    }

    // Enviar arquivo
    readfile($caminhoCompleto);
    exit();

} catch (Exception $e) {
    // Em caso de erro, retornar JSON
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit();
}
?>
