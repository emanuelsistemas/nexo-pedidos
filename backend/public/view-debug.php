<?php
header('Content-Type: text/plain; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

// Verificar se o arquivo de debug existe
$debugFile = '/tmp/nfe_debug.log';

if (!file_exists($debugFile)) {
    echo "Arquivo de debug não encontrado.\n";
    echo "Tente emitir uma NFe primeiro para gerar os logs.\n";
    exit;
}

// Ler e exibir o conteúdo do arquivo
$content = file_get_contents($debugFile);

if (empty($content)) {
    echo "Arquivo de debug está vazio.\n";
    echo "Tente emitir uma NFe primeiro para gerar os logs.\n";
    exit;
}

echo "=== LOGS DE DEBUG DA NFe ===\n\n";
echo $content;

// Opcional: Limpar o arquivo após visualizar (descomente se quiser)
// file_put_contents($debugFile, '');
?>
