<?php

/**
 * Exemplo simples de acesso aos arquivos NFe (sem certificado)
 */

try {
    echo "=== Exemplo de Acesso aos Arquivos NFe ===\n\n";
    
    // Configuração básica
    $config = [
        'xml_path' => __DIR__ . '/storage/xml',
        'pdf_path' => __DIR__ . '/storage/pdf',
        'base_url' => 'http://localhost/backend'
    ];
    
    // Exemplo de chave NFe (44 dígitos)
    $chaveNfe = '35250624163237000151550010000000011253996677';
    
    echo "📄 Chave NFe de exemplo: {$chaveNfe}\n\n";
    
    // Função para verificar se arquivo existe
    function fileExists($config, $type, $chave) {
        $path = $config[$type . '_path'] . '/' . $chave . '.' . $type;
        return file_exists($path);
    }
    
    // Função para gerar URL
    function getFileUrl($config, $type, $chave) {
        return $config['base_url'] . '/public/files.php?type=' . $type . '&chave=' . $chave;
    }
    
    // Função para salvar arquivo
    function saveFile($config, $type, $chave, $content) {
        $path = $config[$type . '_path'] . '/' . $chave . '.' . $type;
        
        if (!is_dir(dirname($path))) {
            mkdir(dirname($path), 0755, true);
        }
        
        return file_put_contents($path, $content) !== false;
    }
    
    // 1. Verificar se arquivos existem
    echo "1. Verificando existência dos arquivos:\n";
    $xmlExists = fileExists($config, 'xml', $chaveNfe);
    $pdfExists = fileExists($config, 'pdf', $chaveNfe);
    
    echo "   XML existe: " . ($xmlExists ? "✅ Sim" : "❌ Não") . "\n";
    echo "   PDF existe: " . ($pdfExists ? "✅ Sim" : "❌ Não") . "\n\n";
    
    // 2. Criar arquivos de exemplo se não existirem
    if (!$xmlExists) {
        echo "2. Criando arquivo XML de exemplo...\n";
        $xmlContent = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xmlContent .= '<NFe xmlns="http://www.portalfiscal.inf.br/nfe">' . "\n";
        $xmlContent .= '  <infNFe Id="NFe' . $chaveNfe . '">' . "\n";
        $xmlContent .= '    <ide>' . "\n";
        $xmlContent .= '      <cUF>35</cUF>' . "\n";
        $xmlContent .= '      <cNF>12539966</cNF>' . "\n";
        $xmlContent .= '      <natOp>Venda de Mercadoria</natOp>' . "\n";
        $xmlContent .= '      <mod>55</mod>' . "\n";
        $xmlContent .= '      <serie>1</serie>' . "\n";
        $xmlContent .= '      <nNF>1</nNF>' . "\n";
        $xmlContent .= '    </ide>' . "\n";
        $xmlContent .= '    <emit>' . "\n";
        $xmlContent .= '      <CNPJ>24163237000151</CNPJ>' . "\n";
        $xmlContent .= '      <xNome>EMPRESA TESTE LTDA</xNome>' . "\n";
        $xmlContent .= '    </emit>' . "\n";
        $xmlContent .= '  </infNFe>' . "\n";
        $xmlContent .= '</NFe>';
        
        if (saveFile($config, 'xml', $chaveNfe, $xmlContent)) {
            echo "   ✅ XML criado com sucesso!\n";
        } else {
            echo "   ❌ Erro ao criar XML\n";
        }
    }
    
    if (!$pdfExists) {
        echo "3. Criando arquivo PDF de exemplo...\n";
        // PDF básico de exemplo
        $pdfContent = "%PDF-1.4\n";
        $pdfContent .= "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
        $pdfContent .= "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
        $pdfContent .= "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n";
        $pdfContent .= "4 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(NFe: {$chaveNfe}) Tj\nET\nendstream\nendobj\n";
        $pdfContent .= "xref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000229 00000 n \n";
        $pdfContent .= "trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n323\n%%EOF";
        
        if (saveFile($config, 'pdf', $chaveNfe, $pdfContent)) {
            echo "   ✅ PDF criado com sucesso!\n";
        } else {
            echo "   ❌ Erro ao criar PDF\n";
        }
    }
    
    echo "\n4. URLs de acesso aos arquivos:\n";
    $xmlUrl = getFileUrl($config, 'xml', $chaveNfe);
    $pdfUrl = getFileUrl($config, 'pdf', $chaveNfe);
    
    echo "   XML: {$xmlUrl}\n";
    echo "   PDF: {$pdfUrl}\n\n";
    
    // 5. Verificar arquivos criados
    echo "5. Verificando arquivos criados:\n";
    $xmlPath = $config['xml_path'] . '/' . $chaveNfe . '.xml';
    $pdfPath = $config['pdf_path'] . '/' . $chaveNfe . '.pdf';
    
    if (file_exists($xmlPath)) {
        echo "   ✅ XML: " . $xmlPath . " (" . filesize($xmlPath) . " bytes)\n";
    }
    
    if (file_exists($pdfPath)) {
        echo "   ✅ PDF: " . $pdfPath . " (" . filesize($pdfPath) . " bytes)\n";
    }
    
    echo "\n📋 **Resumo das opções de acesso:**\n\n";
    
    echo "🔗 **Opção 1: Via Endpoint PHP (Recomendado)**\n";
    echo "   - Arquivo: public/files.php\n";
    echo "   - XML: {$xmlUrl}\n";
    echo "   - PDF: {$pdfUrl}\n";
    echo "   - ✅ Controle de acesso\n";
    echo "   - ✅ Logs de auditoria\n";
    echo "   - ✅ Validação de parâmetros\n\n";
    
    echo "🌐 **Opção 2: Via Nginx (Acesso Direto)**\n";
    echo "   - Configure: nginx-storage.conf\n";
    echo "   - XML: {$config['base_url']}/storage/xml/{$chaveNfe}.xml\n";
    echo "   - PDF: {$config['base_url']}/storage/pdf/{$chaveNfe}.pdf\n";
    echo "   - ⚡ Mais rápido\n";
    echo "   - ⚠️  Menos controle\n\n";
    
    echo "🔗 **Opção 3: Via Symlink**\n";
    echo "   - Execute: setup-storage-link.sh\n";
    echo "   - XML: {$config['base_url']}/nfe-files/xml/{$chaveNfe}.xml\n";
    echo "   - PDF: {$config['base_url']}/nfe-files/pdf/{$chaveNfe}.pdf\n";
    echo "   - 🔄 Flexível\n";
    echo "   - 🛠️  Requer configuração do servidor\n\n";
    
    echo "✅ **Arquivos de exemplo criados com sucesso!**\n";
    echo "🔧 **Configure uma das opções acima para acessar os arquivos externamente.**\n";
    
} catch (Exception $e) {
    echo "❌ Erro: " . $e->getMessage() . "\n";
}
