<?php
header('Content-Type: text/html; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

// ✅ ENDPOINT PARA VISUALIZAR ESPELHOS NFE (SEM FALLBACKS)

try {
    // Verificar parâmetros obrigatórios
    if (!isset($_GET['empresa_id']) || !isset($_GET['arquivo'])) {
        throw new Exception('Parâmetros empresa_id e arquivo são obrigatórios');
    }

    $empresa_id = $_GET['empresa_id'];
    $arquivo = $_GET['arquivo'];
    
    // ✅ VALIDAR EMPRESA_ID (UUID)
    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $empresa_id)) {
        throw new Exception('empresa_id inválido');
    }
    
    // ✅ VALIDAR NOME DO ARQUIVO (apenas arquivos de espelho)
    if (!preg_match('/^espelho_nfe_[a-f0-9\-_]+\.html$/i', $arquivo)) {
        throw new Exception('Nome de arquivo inválido');
    }
    
    // ✅ CONSTRUIR CAMINHO SEGURO
    $caminhoEspelho = __DIR__ . "/../storage/espelhos/{$empresa_id}/homologacao/55/{$arquivo}";
    
    // ✅ VERIFICAR SE ARQUIVO EXISTE
    if (!file_exists($caminhoEspelho)) {
        throw new Exception('Espelho não encontrado');
    }
    
    // ✅ VERIFICAR SE É REALMENTE UM ARQUIVO (não diretório)
    if (!is_file($caminhoEspelho)) {
        throw new Exception('Caminho inválido');
    }
    
    // ✅ VERIFICAR SE ESTÁ DENTRO DO DIRETÓRIO PERMITIDO (segurança)
    $caminhoReal = realpath($caminhoEspelho);
    $caminhoBase = realpath(__DIR__ . "/../storage/espelhos/{$empresa_id}");
    
    if (!$caminhoReal || !$caminhoBase || strpos($caminhoReal, $caminhoBase) !== 0) {
        throw new Exception('Acesso negado');
    }
    
    // ✅ LER E SERVIR O ARQUIVO HTML
    $conteudoHtml = file_get_contents($caminhoEspelho);
    
    if ($conteudoHtml === false) {
        throw new Exception('Erro ao ler arquivo');
    }
    
    // ✅ LOG DE ACESSO
    error_log("👁️ ESPELHO - Visualizando: {$arquivo} para empresa: {$empresa_id}");
    
    // ✅ SERVIR O HTML
    echo $conteudoHtml;
    
} catch (Exception $e) {
    // ✅ LOG DE ERRO
    error_log("❌ ESPELHO - Erro: " . $e->getMessage());
    
    // ✅ RETORNAR ERRO 404
    http_response_code(404);
    echo '<!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>Espelho não encontrado</title>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
            .error { color: #d32f2f; font-size: 18px; }
        </style>
    </head>
    <body>
        <h1>Espelho NFe não encontrado</h1>
        <p class="error">' . htmlspecialchars($e->getMessage()) . '</p>
        <p>Verifique se o espelho foi gerado corretamente.</p>
    </body>
    </html>';
}
?>
