<?php
/**
 * Teste isolado da biblioteca sped-nfe para CCe
 * Para identificar se o problema está na biblioteca ou no nosso código
 */

echo "🧪 TESTE ISOLADO - BIBLIOTECA SPED-NFE CCe\n";
echo "==========================================\n\n";

require_once 'vendor/autoload.php';
use NFePHP\NFe\Tools;
use NFePHP\Common\Certificate;

try {
    echo "1. Carregando certificado...\n";
    
    // Carregar certificado
    $certificadoPath = 'storage/certificados/empresa_acd26a4f-7220-405e-9c96-faffb7e6480e.pfx';
    $certificadoSenha = '12345678';
    
    if (!file_exists($certificadoPath)) {
        throw new Exception("Certificado não encontrado: {$certificadoPath}");
    }
    
    $certificadoContent = file_get_contents($certificadoPath);
    $certificate = Certificate::readPfx($certificadoContent, $certificadoSenha);
    
    echo "✅ Certificado carregado: " . strlen($certificadoContent) . " bytes\n";
    
    echo "2. Configurando Tools...\n";
    
    // Configurar Tools
    $config = [
        "atualizacao" => date('Y-m-d H:i:s'),
        "tpAmb" => 2, // Homologação
        "razaosocial" => "NEXO SISTEMAS LTDA",
        "cnpj" => "24163237000151",
        "siglaUF" => "SP",
        "schemes" => "PL009_V4",
        "versao" => "4.00",
        "tokenIBPT" => "",
        "CSC" => "",
        "CSCid" => ""
    ];
    
    $tools = new Tools(json_encode($config), $certificate);
    $tools->model('55');
    
    echo "✅ Tools configurado\n";
    
    echo "3. Testando chamada sefazCCe...\n";
    
    // Dados de teste
    $chaveNFe = '35250624163237000151550010000000201995318594';
    $correcao = 'Teste isolado da biblioteca sped-nfe para CCe';
    $sequencia = 99; // Sequência alta para não conflitar
    
    echo "📝 Parâmetros:\n";
    echo "   - Chave: {$chaveNFe}\n";
    echo "   - Sequência: {$sequencia}\n";
    echo "   - Correção: " . substr($correcao, 0, 50) . "...\n\n";
    
    // Capturar erros PHP
    set_error_handler(function($severity, $message, $file, $line) {
        echo "⚠️ PHP Error: {$message} em {$file}:{$line}\n";
        throw new ErrorException($message, 0, $severity, $file, $line);
    });
    
    echo "🚀 Chamando sefazCCe...\n";
    $startTime = microtime(true);
    
    $response = $tools->sefazCCe($chaveNFe, $correcao, $sequencia);
    
    $endTime = microtime(true);
    $duration = round(($endTime - $startTime) * 1000, 2);
    
    restore_error_handler();
    
    echo "✅ Chamada concluída em {$duration}ms\n";
    echo "📝 Resposta recebida: " . strlen($response) . " bytes\n";
    echo "📝 Primeiros 500 chars:\n";
    echo substr($response, 0, 500) . "\n\n";
    
    // Salvar resposta completa
    $debugFile = "/tmp/teste_sped_nfe_cce_response.xml";
    file_put_contents($debugFile, $response);
    echo "💾 Resposta completa salva em: {$debugFile}\n";
    
    echo "✅ TESTE CONCLUÍDO COM SUCESSO!\n";
    echo "A biblioteca sped-nfe está funcionando corretamente.\n";
    
} catch (ErrorException $phpError) {
    echo "❌ ERRO PHP: " . $phpError->getMessage() . "\n";
    echo "📁 Arquivo: " . $phpError->getFile() . "\n";
    echo "📍 Linha: " . $phpError->getLine() . "\n";
    echo "📋 Stack trace:\n" . $phpError->getTraceAsString() . "\n";
    restore_error_handler();
} catch (Exception $e) {
    echo "❌ ERRO: " . $e->getMessage() . "\n";
    echo "📋 Stack trace:\n" . $e->getTraceAsString() . "\n";
} catch (Throwable $fatal) {
    echo "❌ ERRO FATAL: " . $fatal->getMessage() . "\n";
    echo "📁 Arquivo: " . $fatal->getFile() . "\n";
    echo "📍 Linha: " . $fatal->getLine() . "\n";
    echo "📋 Stack trace:\n" . $fatal->getTraceAsString() . "\n";
}

echo "\n🏁 TESTE FINALIZADO\n";
?>
