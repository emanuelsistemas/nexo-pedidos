<?php
/**
 * Teste direto da classe Daevento
 */

require_once __DIR__ . '/vendor/autoload.php';

use NFePHP\DA\NFe\Daevento;

echo "🧪 TESTE DIRETO - Classe Daevento\n";
echo "=================================\n\n";

try {
    // Dados das CCe para teste
    $chaveNFe = '35250624163237000151550010000000201995318594';
    $empresaId = 'acd26a4f-7220-405e-9c96-faffb7e6480e';
    $sequencia = 2;
    
    echo "📄 Testando CCe sequência {$sequencia}...\n";
    
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
        throw new Exception("XML da CCe não encontrado: {$nomeArquivoCce}");
    }
    
    echo "   ✅ XML encontrado: {$xmlCceEncontrado}\n";
    
    // 2. Ler conteúdo do XML da CCe
    $xmlCceContent = file_get_contents($xmlCceEncontrado);
    if (!$xmlCceContent) {
        throw new Exception('Erro ao ler XML da CCe');
    }
    
    echo "   ✅ XML da CCe lido com sucesso (" . strlen($xmlCceContent) . " bytes)\n";
    
    // 3. Preparar dados do emitente
    $dadosEmitente = [
        'razao' => 'Empresa Teste',
        'logradouro' => 'Rua Teste',
        'numero' => '123',
        'complemento' => '',
        'bairro' => 'Centro',
        'CEP' => '12345678',
        'municipio' => 'Cidade Teste',
        'UF' => 'SP',
        'telefone' => '1199999999',
        'email' => 'teste@teste.com'
    ];
    
    echo "   🔧 Criando instância Daevento...\n";
    
    // 4. Criar instância da classe Daevento
    $daevento = new Daevento($xmlCceContent, $dadosEmitente);
    $daevento->debugMode(true); // Ativar debug para ver erros
    $daevento->creditsIntegratorFooter('Sistema Nexo PDV - Teste');
    
    echo "   ✅ Instância criada com sucesso\n";
    echo "   🔧 Gerando PDF...\n";
    
    // 5. Gerar PDF
    $pdfContent = $daevento->render();
    
    if (!$pdfContent) {
        throw new Exception('Erro ao gerar PDF da CCe');
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
        throw new Exception('Falha ao salvar PDF');
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
    echo "   📍 Arquivo: " . $e->getFile() . "\n";
    echo "   📍 Linha: " . $e->getLine() . "\n";
}

echo "\n🏁 TESTE CONCLUÍDO\n";
?>
