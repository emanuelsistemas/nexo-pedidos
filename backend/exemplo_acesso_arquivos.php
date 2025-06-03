<?php

require_once 'vendor/autoload.php';

use Nexo\Services\NFeService;

/**
 * Exemplo de como acessar arquivos XML e PDF gerados
 */

try {
    echo "=== Exemplo de Acesso aos Arquivos NFe ===\n\n";
    
    // Configuração de exemplo
    $config = [
        'ambiente' => 2,
        'razao_social' => 'EMPRESA TESTE LTDA',
        'cnpj' => '11222333000181',
        'uf' => 'SP',
        'storage_path' => __DIR__ . '/storage',
        'xml_path' => __DIR__ . '/storage/xml',
        'pdf_path' => __DIR__ . '/storage/pdf',
        'base_url' => 'http://localhost/backend' // Ajuste conforme seu ambiente
    ];
    
    $nfeService = new NFeService($config);
    
    // Exemplo de chave NFe (44 dígitos)
    $chaveNfe = '35250624163237000151550010000000011253996677';
    
    echo "📄 Chave NFe de exemplo: {$chaveNfe}\n\n";
    
    // 1. Verificar se arquivos existem
    echo "1. Verificando existência dos arquivos:\n";
    $xmlExists = $nfeService->fileExists('xml', $chaveNfe);
    $pdfExists = $nfeService->fileExists('pdf', $chaveNfe);
    
    echo "   XML existe: " . ($xmlExists ? "✅ Sim" : "❌ Não") . "\n";
    echo "   PDF existe: " . ($pdfExists ? "✅ Sim" : "❌ Não") . "\n\n";
    
    // 2. Gerar URLs de acesso
    echo "2. URLs de acesso aos arquivos:\n";
    $xmlUrl = $nfeService->getFileUrl('xml', $chaveNfe);
    $pdfUrl = $nfeService->getFileUrl('pdf', $chaveNfe);
    
    echo "   XML: {$xmlUrl}\n";
    echo "   PDF: {$pdfUrl}\n\n";
    
    // 3. Criar arquivos de exemplo (se não existirem)
    if (!$xmlExists) {
        echo "3. Criando arquivo XML de exemplo...\n";
        $xmlContent = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xmlContent .= '<NFe xmlns="http://www.portalfiscal.inf.br/nfe">' . "\n";
        $xmlContent .= '  <!-- Conteúdo da NFe aqui -->' . "\n";
        $xmlContent .= '  <infNFe Id="NFe' . $chaveNfe . '">' . "\n";
        $xmlContent .= '    <ide>' . "\n";
        $xmlContent .= '      <cUF>35</cUF>' . "\n";
        $xmlContent .= '      <cNF>12539966</cNF>' . "\n";
        $xmlContent .= '      <natOp>Venda</natOp>' . "\n";
        $xmlContent .= '    </ide>' . "\n";
        $xmlContent .= '  </infNFe>' . "\n";
        $xmlContent .= '</NFe>';
        
        $result = $nfeService->saveXML($xmlContent, $chaveNfe);
        if ($result['success']) {
            echo "   ✅ XML criado: {$result['url']}\n";
        } else {
            echo "   ❌ Erro ao criar XML: {$result['error']}\n";
        }
    }
    
    if (!$pdfExists) {
        echo "4. Criando arquivo PDF de exemplo...\n";
        // Para um PDF real, você usaria uma biblioteca como TCPDF ou FPDF
        $pdfContent = "%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n";
        $pdfContent .= "2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n";
        $pdfContent .= "3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\n";
        $pdfContent .= "xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n";
        $pdfContent .= "0000000115 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n174\n%%EOF";
        
        $result = $nfeService->savePDF($pdfContent, $chaveNfe);
        if ($result['success']) {
            echo "   ✅ PDF criado: {$result['url']}\n";
        } else {
            echo "   ❌ Erro ao criar PDF: {$result['error']}\n";
        }
    }
    
    echo "\n📋 Como acessar os arquivos:\n\n";
    
    echo "🔗 **Opção 1: Via Endpoint PHP (Recomendado)**\n";
    echo "   - Configure o arquivo public/files.php\n";
    echo "   - Acesse: {$config['base_url']}/public/files.php?type=xml&chave={$chaveNfe}\n";
    echo "   - Acesse: {$config['base_url']}/public/files.php?type=pdf&chave={$chaveNfe}\n\n";
    
    echo "🌐 **Opção 2: Via Nginx (Acesso Direto)**\n";
    echo "   - Configure nginx-storage.conf\n";
    echo "   - Acesse: {$config['base_url']}/storage/xml/{$chaveNfe}.xml\n";
    echo "   - Acesse: {$config['base_url']}/storage/pdf/{$chaveNfe}.pdf\n\n";
    
    echo "🔗 **Opção 3: Via Symlink**\n";
    echo "   - Execute setup-storage-link.sh\n";
    echo "   - Acesse: {$config['base_url']}/nfe-files/xml/{$chaveNfe}.xml\n";
    echo "   - Acesse: {$config['base_url']}/nfe-files/pdf/{$chaveNfe}.pdf\n\n";
    
    echo "⚠️  **Importante:**\n";
    echo "   - Nunca exponha a pasta certificados/\n";
    echo "   - Implemente autenticação se necessário\n";
    echo "   - Configure HTTPS em produção\n";
    echo "   - Mantenha logs de acesso aos arquivos\n";
    
} catch (Exception $e) {
    echo "❌ Erro: " . $e->getMessage() . "\n";
}
