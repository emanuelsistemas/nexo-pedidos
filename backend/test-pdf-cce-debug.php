<?php

/**
 * Teste específico para debug do PDF CCe
 */

echo "=== TESTE PDF CCe DEBUG ===\n";
echo "Data: " . date('Y-m-d H:i:s') . "\n\n";

// Simular exatamente os dados que o frontend envia
$chave = '35250624163237000151550010000000351589707164';
$empresaId = 'acd26a4f-7220-405e-9c96-faffb7e6480e';
$sequencia = 2;

echo "1. Parâmetros simulados:\n";
echo "Chave: $chave\n";
echo "Empresa ID: $empresaId\n";
echo "Sequência: $sequencia\n\n";

echo "2. Determinando ambiente...\n";
$ambienteTexto = 'homologacao'; // padrão
try {
    $response = file_get_contents("http://localhost/backend/public/get-empresa-config.php?empresa_id={$empresaId}");
    $config = json_decode($response, true);
    if ($config && isset($config['data']['nfe_config']['ambiente'])) {
        $ambienteTexto = $config['data']['nfe_config']['ambiente'];
    }
    echo "✅ Ambiente determinado: $ambienteTexto\n";
} catch (Exception $e) {
    echo "⚠️ Erro ao determinar ambiente: " . $e->getMessage() . "\n";
}
echo "\n";

echo "3. Construindo caminhos...\n";
$modelo = '55';
$xmlCceDir = "/root/nexo-pedidos/backend/storage/xml/empresa_{$empresaId}/{$ambienteTexto}/{$modelo}/CCe";
$nomeArquivoEvento = $chave . '_cce_' . str_pad($sequencia, 3, '0', STR_PAD_LEFT) . '_evento.xml';
$nomeArquivoResposta = $chave . '_cce_' . str_pad($sequencia, 3, '0', STR_PAD_LEFT) . '_resposta.xml';

echo "Diretório CCe: $xmlCceDir\n";
echo "Arquivo evento: $nomeArquivoEvento\n";
echo "Arquivo resposta: $nomeArquivoResposta\n\n";

// Função de busca (igual do arquivo original)
function buscarXMLCce($dir, $nomeArquivo) {
    if (!is_dir($dir)) {
        return null;
    }
    
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS)
    );
    
    foreach ($iterator as $file) {
        if ($file->isFile() && $file->getFilename() === $nomeArquivo) {
            return $file->getPathname();
        }
    }
    
    return null;
}

echo "4. Testando busca de XMLs...\n";
$xmlEventoEncontrado = buscarXMLCce($xmlCceDir, $nomeArquivoEvento);
$xmlRespostaEncontrado = buscarXMLCce($xmlCceDir, $nomeArquivoResposta);

echo "Evento encontrado: " . ($xmlEventoEncontrado ?: 'NÃO') . "\n";
echo "Resposta encontrada: " . ($xmlRespostaEncontrado ?: 'NÃO') . "\n\n";

if (!$xmlEventoEncontrado) {
    echo "5. Tentando busca direta para evento...\n";
    $caminhoEventoDireto = "/root/nexo-pedidos/backend/storage/xml/empresa_{$empresaId}/{$ambienteTexto}/{$modelo}/CCe/2025/06/{$nomeArquivoEvento}";
    echo "Caminho direto: $caminhoEventoDireto\n";
    if (file_exists($caminhoEventoDireto)) {
        $xmlEventoEncontrado = $caminhoEventoDireto;
        echo "✅ Evento encontrado no caminho direto!\n";
    } else {
        echo "❌ Evento não encontrado nem no caminho direto\n";
    }
    echo "\n";
}

if (!$xmlRespostaEncontrado) {
    echo "6. Tentando busca direta para resposta...\n";
    $caminhoRespostaDireto = "/root/nexo-pedidos/backend/storage/xml/empresa_{$empresaId}/{$ambienteTexto}/{$modelo}/CCe/2025/06/{$nomeArquivoResposta}";
    echo "Caminho direto: $caminhoRespostaDireto\n";
    if (file_exists($caminhoRespostaDireto)) {
        $xmlRespostaEncontrado = $caminhoRespostaDireto;
        echo "✅ Resposta encontrada no caminho direto!\n";
    } else {
        echo "❌ Resposta não encontrada nem no caminho direto\n";
    }
    echo "\n";
}

if ($xmlEventoEncontrado && $xmlRespostaEncontrado) {
    echo "7. Testando leitura dos XMLs...\n";
    
    $xmlEventoContent = file_get_contents($xmlEventoEncontrado);
    $xmlRespostaContent = file_get_contents($xmlRespostaEncontrado);
    
    echo "XML evento lido: " . strlen($xmlEventoContent) . " bytes\n";
    echo "XML resposta lido: " . strlen($xmlRespostaContent) . " bytes\n\n";
    
    if ($xmlEventoContent && $xmlRespostaContent) {
        echo "8. Testando busca da NFe original...\n";
        $xmlNfeDir = "/root/nexo-pedidos/backend/storage/xml/empresa_{$empresaId}/{$ambienteTexto}/{$modelo}/Autorizados";
        $nomeArquivoNfe = $chave . '.xml';
        
        echo "Diretório NFe: $xmlNfeDir\n";
        echo "Arquivo NFe: $nomeArquivoNfe\n";
        
        function buscarXMLNfe($dir, $nomeArquivo) {
            if (!is_dir($dir)) {
                return null;
            }
            
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS)
            );
            
            foreach ($iterator as $file) {
                if ($file->isFile() && $file->getFilename() === $nomeArquivo) {
                    return $file->getPathname();
                }
            }
            
            return null;
        }
        
        $xmlNfeEncontrado = buscarXMLNfe($xmlNfeDir, $nomeArquivoNfe);
        echo "NFe encontrada: " . ($xmlNfeEncontrado ?: 'NÃO') . "\n";
        
        if ($xmlNfeEncontrado) {
            $xmlNfeContent = file_get_contents($xmlNfeEncontrado);
            echo "XML NFe lido: " . strlen($xmlNfeContent) . " bytes\n";
            echo "✅ Todos os XMLs necessários foram encontrados!\n";
            echo "✅ Sistema está pronto para gerar PDF\n";
        } else {
            echo "❌ XML da NFe original não encontrado\n";
        }
    } else {
        echo "❌ Erro ao ler conteúdo dos XMLs\n";
    }
} else {
    echo "❌ XMLs da CCe não encontrados\n";
}

echo "\n=== TESTE CONCLUÍDO ===\n";

?>
