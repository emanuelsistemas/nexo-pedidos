<?php

/**
 * Teste para verificar busca de XMLs da CCe
 */

echo "=== TESTE BUSCA XML CCe ===\n";
echo "Data: " . date('Y-m-d H:i:s') . "\n\n";

// Dados de teste
$empresaId = 'acd26a4f-7220-405e-9c96-faffb7e6480e';
$chave = '35250624163237000151550010000000351589707164';
$sequencia = 2;
$ambienteTexto = 'homologacao';
$modelo = '55';

echo "1. Parâmetros de teste:\n";
echo "Empresa ID: $empresaId\n";
echo "Chave: $chave\n";
echo "Sequência: $sequencia\n";
echo "Ambiente: $ambienteTexto\n";
echo "Modelo: $modelo\n\n";

// Construir caminhos
$xmlCceDir = "/root/nexo-pedidos/backend/storage/xml/empresa_{$empresaId}/{$ambienteTexto}/{$modelo}/CCe";
$nomeArquivoEvento = $chave . '_cce_' . str_pad($sequencia, 3, '0', STR_PAD_LEFT) . '_evento.xml';
$nomeArquivoResposta = $chave . '_cce_' . str_pad($sequencia, 3, '0', STR_PAD_LEFT) . '_resposta.xml';

echo "2. Caminhos construídos:\n";
echo "Diretório CCe: $xmlCceDir\n";
echo "Arquivo evento: $nomeArquivoEvento\n";
echo "Arquivo resposta: $nomeArquivoResposta\n\n";

echo "3. Verificando diretório:\n";
echo "Diretório existe: " . (is_dir($xmlCceDir) ? 'SIM' : 'NÃO') . "\n";
if (is_dir($xmlCceDir)) {
    echo "Conteúdo do diretório:\n";
    $arquivos = scandir($xmlCceDir);
    foreach ($arquivos as $arquivo) {
        if ($arquivo !== '.' && $arquivo !== '..') {
            echo "  - $arquivo\n";
        }
    }
} else {
    echo "❌ Diretório não existe!\n";
}
echo "\n";

echo "4. Verificando subdiretórios:\n";
$subDirs = ['2025', '2025/06'];
foreach ($subDirs as $subDir) {
    $fullPath = "$xmlCceDir/$subDir";
    echo "Subdiretório $subDir: " . (is_dir($fullPath) ? 'EXISTE' : 'NÃO EXISTE') . "\n";
    if (is_dir($fullPath)) {
        $arquivos = scandir($fullPath);
        foreach ($arquivos as $arquivo) {
            if ($arquivo !== '.' && $arquivo !== '..') {
                echo "  - $arquivo\n";
            }
        }
    }
}
echo "\n";

echo "5. Testando busca direta:\n";
$caminhoEventoDireto = "$xmlCceDir/2025/06/$nomeArquivoEvento";
$caminhoRespostaDireto = "$xmlCceDir/2025/06/$nomeArquivoResposta";

echo "Caminho evento direto: $caminhoEventoDireto\n";
echo "Evento existe: " . (file_exists($caminhoEventoDireto) ? 'SIM' : 'NÃO') . "\n";
if (file_exists($caminhoEventoDireto)) {
    echo "Tamanho evento: " . filesize($caminhoEventoDireto) . " bytes\n";
}

echo "Caminho resposta direto: $caminhoRespostaDireto\n";
echo "Resposta existe: " . (file_exists($caminhoRespostaDireto) ? 'SIM' : 'NÃO') . "\n";
if (file_exists($caminhoRespostaDireto)) {
    echo "Tamanho resposta: " . filesize($caminhoRespostaDireto) . " bytes\n";
}
echo "\n";

// Função de busca recursiva (igual do arquivo original)
function buscarXMLCce($dir, $nomeArquivo) {
    echo "🔍 Buscando '$nomeArquivo' em '$dir'\n";
    
    if (!is_dir($dir)) {
        echo "❌ Diretório não existe: $dir\n";
        return null;
    }
    
    try {
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS)
        );
        
        foreach ($iterator as $file) {
            echo "  Verificando: " . $file->getFilename() . " em " . $file->getPath() . "\n";
            if ($file->isFile() && $file->getFilename() === $nomeArquivo) {
                echo "  ✅ ENCONTRADO: " . $file->getPathname() . "\n";
                return $file->getPathname();
            }
        }
    } catch (Exception $e) {
        echo "❌ Erro na busca: " . $e->getMessage() . "\n";
    }
    
    echo "❌ Arquivo não encontrado\n";
    return null;
}

echo "6. Testando função de busca recursiva:\n";
$xmlEventoEncontrado = buscarXMLCce($xmlCceDir, $nomeArquivoEvento);
echo "Resultado busca evento: " . ($xmlEventoEncontrado ?: 'NÃO ENCONTRADO') . "\n\n";

$xmlRespostaEncontrado = buscarXMLCce($xmlCceDir, $nomeArquivoResposta);
echo "Resultado busca resposta: " . ($xmlRespostaEncontrado ?: 'NÃO ENCONTRADO') . "\n\n";

echo "7. Listando todos os arquivos CCe no sistema:\n";
$comando = "find /root/nexo-pedidos/backend/storage -name '*cce*' -type f";
echo "Comando: $comando\n";
$output = shell_exec($comando);
echo "Resultado:\n$output\n";

echo "=== TESTE CONCLUÍDO ===\n";

if ($xmlEventoEncontrado && $xmlRespostaEncontrado) {
    echo "✅ Ambos os XMLs foram encontrados!\n";
    echo "✅ Sistema de busca funcionando\n";
} else {
    echo "❌ Problemas na busca de XMLs\n";
    echo "Evento encontrado: " . ($xmlEventoEncontrado ? 'SIM' : 'NÃO') . "\n";
    echo "Resposta encontrada: " . ($xmlRespostaEncontrado ? 'SIM' : 'NÃO') . "\n";
}

?>
