<?php
/**
 * Script de teste para gerar PDFs das CCe existentes
 * 
 * Este script testa a geração de PDF das 2 CCe que existem no sistema:
 * - CCe sequência 002
 * - CCe sequência 003
 * 
 * Chave NFe: 35250624163237000151550010000000201995318594
 * Empresa ID: acd26a4f-7220-405e-9c96-faffb7e6480e
 */

require_once __DIR__ . '/vendor/autoload.php';

use NFePHP\DA\CCe\Dace;

echo "🧪 TESTE DE GERAÇÃO DE PDF DAS CCe\n";
echo "==================================\n\n";

// Dados das CCe para teste
$chaveNFe = '35250624163237000151550010000000201995318594';
$empresaId = 'acd26a4f-7220-405e-9c96-faffb7e6480e';
$sequencias = [2, 3]; // CCe existentes

foreach ($sequencias as $sequencia) {
    echo "📄 Testando CCe sequência {$sequencia}...\n";
    
    try {
        // 1. Buscar XML da CCe
        $xmlCceDir = __DIR__ . "/storage/xml/empresa_{$empresaId}/CCe";
        $nomeArquivoCce = $chaveNFe . '_cce_' . str_pad($sequencia, 3, '0', STR_PAD_LEFT) . '.xml';
        
        echo "   🔍 Procurando XML: {$nomeArquivoCce}\n";
        
        // Função para buscar XML recursivamente
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
        
        $xmlCceEncontrado = buscarXMLCce($xmlCceDir, $nomeArquivoCce);
        
        if (!$xmlCceEncontrado) {
            echo "   ❌ XML da CCe não encontrado\n\n";
            continue;
        }
        
        echo "   ✅ XML encontrado: {$xmlCceEncontrado}\n";
        
        // 2. Ler conteúdo do XML da CCe
        $xmlCceContent = file_get_contents($xmlCceEncontrado);
        if (!$xmlCceContent) {
            echo "   ❌ Erro ao ler XML da CCe\n\n";
            continue;
        }
        
        echo "   ✅ XML da CCe lido com sucesso (" . strlen($xmlCceContent) . " bytes)\n";
        
        // 3. Buscar XML da NFe original
        $xmlNfeDir = __DIR__ . "/storage/xml/empresa_{$empresaId}/Autorizados";
        $nomeArquivoNfe = $chaveNFe . '.xml';
        
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
        
        if (!$xmlNfeEncontrado) {
            echo "   ❌ XML da NFe original não encontrado\n\n";
            continue;
        }
        
        echo "   ✅ XML da NFe encontrado: {$xmlNfeEncontrado}\n";
        
        // 4. Ler conteúdo do XML da NFe
        $xmlNfeContent = file_get_contents($xmlNfeEncontrado);
        if (!$xmlNfeContent) {
            echo "   ❌ Erro ao ler XML da NFe\n\n";
            continue;
        }
        
        echo "   ✅ XML da NFe lido com sucesso (" . strlen($xmlNfeContent) . " bytes)\n";
        
        // 5. Gerar PDF usando a biblioteca sped-da
        echo "   🔧 Gerando PDF da CCe...\n";
        
        $dace = new Dace($xmlNfeContent, $xmlCceContent);
        $dace->debugMode(false);
        $dace->creditsIntegratorFooter('Sistema Nexo PDV - Teste');
        
        // Gerar PDF
        $pdfContent = $dace->render();
        
        if (!$pdfContent) {
            echo "   ❌ Erro ao gerar PDF da CCe\n\n";
            continue;
        }
        
        echo "   ✅ PDF gerado com sucesso (" . strlen($pdfContent) . " bytes)\n";
        
        // 6. Salvar PDF
        $pdfDir = __DIR__ . "/storage/pdf/empresa_{$empresaId}/CCe/" . date('Y/m');
        if (!is_dir($pdfDir)) {
            mkdir($pdfDir, 0755, true);
            echo "   📁 Diretório criado: {$pdfDir}\n";
        }
        
        $nomeArquivoPdf = $chaveNFe . '_cce_' . str_pad($sequencia, 3, '0', STR_PAD_LEFT) . '.pdf';
        $pdfPath = "{$pdfDir}/{$nomeArquivoPdf}";
        
        $result = file_put_contents($pdfPath, $pdfContent);
        
        if ($result === false) {
            echo "   ❌ Falha ao salvar PDF\n\n";
            continue;
        }
        
        echo "   ✅ PDF salvo com sucesso: {$pdfPath}\n";
        echo "   📊 Tamanho do arquivo: " . filesize($pdfPath) . " bytes\n";
        
        // 7. Verificar se PDF é válido
        if (filesize($pdfPath) < 1000) {
            echo "   ⚠️ PDF muito pequeno, pode estar corrompido\n";
        } else {
            echo "   ✅ PDF parece válido\n";
        }
        
        echo "   🌐 URL de acesso: /backend/public/download-arquivo.php?type=pdf_cce&chave={$chaveNFe}&empresa_id={$empresaId}&sequencia={$sequencia}&action=view\n";
        
    } catch (Exception $e) {
        echo "   ❌ ERRO: " . $e->getMessage() . "\n";
    }
    
    echo "\n";
}

echo "🏁 TESTE CONCLUÍDO\n";
echo "==================\n\n";

echo "📋 RESUMO:\n";
echo "- Chave NFe: {$chaveNFe}\n";
echo "- Empresa ID: {$empresaId}\n";
echo "- CCe testadas: " . implode(', ', $sequencias) . "\n";
echo "- Biblioteca: NFePHP\\DA\\CCe\\Dace\n\n";

echo "🔗 Para testar no navegador:\n";
foreach ($sequencias as $sequencia) {
    echo "   CCe {$sequencia}: /backend/public/download-arquivo.php?type=pdf_cce&chave={$chaveNFe}&empresa_id={$empresaId}&sequencia={$sequencia}&action=view\n";
}

?>
