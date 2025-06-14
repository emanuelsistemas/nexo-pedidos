<?php
/**
 * Script para reorganizar PDFs existentes na nova estrutura organizada
 *
 * ANTES: backend/storage/pdf/empresa_id/2025/06/chave.pdf
 * DEPOIS: backend/storage/pdf/empresa_id/Autorizados/2025/06/chave.pdf
 *
 * PREPARA PARA:
 * - backend/storage/pdf/empresa_id/CCe/2025/06/chave_cce_001.pdf
 *
 * NOTA: Cancelamento NÃO gera PDF, apenas XML
 */

echo "🔄 REORGANIZANDO ESTRUTURA DE PDFs...\n";

$storageDir = "/root/nexo/nexo-pedidos/backend/storage/pdf";

if (!is_dir($storageDir)) {
    echo "❌ Diretório storage não encontrado: {$storageDir}\n";
    exit(1);
}

// Buscar todas as pastas de empresas
$empresas = glob($storageDir . "/empresa_*", GLOB_ONLYDIR);

if (empty($empresas)) {
    echo "ℹ️  Nenhuma pasta de empresa encontrada em: {$storageDir}\n";
    exit(0);
}

echo "📁 Encontradas " . count($empresas) . " empresas para reorganizar:\n";

foreach ($empresas as $empresaDir) {
    $empresaId = basename($empresaDir);
    echo "\n🏢 Processando empresa: {$empresaId}\n";
    
    // Buscar PDFs existentes na estrutura antiga (ano/mes/arquivo.pdf)
    $pdfsExistentes = glob($empresaDir . "/[0-9][0-9][0-9][0-9]/[0-9][0-9]/*.pdf");
    
    if (empty($pdfsExistentes)) {
        echo "   ℹ️  Nenhum PDF encontrado na estrutura antiga\n";
        continue;
    }
    
    echo "   📄 Encontrados " . count($pdfsExistentes) . " PDFs para reorganizar\n";
    
    foreach ($pdfsExistentes as $pdfPath) {
        $nomeArquivo = basename($pdfPath);
        $dirRelativo = str_replace($empresaDir . '/', '', dirname($pdfPath));

        // Todos os PDFs existentes são de NFes autorizadas (DANFE)
        $novoDir = $empresaDir . "/Autorizados/" . $dirRelativo;
        $novoPath = $novoDir . "/" . $nomeArquivo;
        
        // Criar diretório se não existir
        if (!is_dir($novoDir)) {
            mkdir($novoDir, 0755, true);
            echo "   📁 Criado: Autorizados/{$dirRelativo}\n";
        }
        
        // Mover arquivo
        if (rename($pdfPath, $novoPath)) {
            echo "   ✅ Movido: {$nomeArquivo} → Autorizados/{$dirRelativo}/\n";
        } else {
            echo "   ❌ Erro ao mover: {$nomeArquivo}\n";
        }
    }
    
    // Remover diretórios vazios da estrutura antiga
    $anosDir = glob($empresaDir . "/[0-9][0-9][0-9][0-9]", GLOB_ONLYDIR);
    foreach ($anosDir as $anoDir) {
        $mesesDir = glob($anoDir . "/*", GLOB_ONLYDIR);
        foreach ($mesesDir as $mesDir) {
            if (count(scandir($mesDir)) == 2) { // Apenas . e ..
                rmdir($mesDir);
                echo "   🗑️  Removido diretório vazio: " . basename($anoDir) . "/" . basename($mesDir) . "\n";
            }
        }
        if (count(scandir($anoDir)) == 2) { // Apenas . e ..
            rmdir($anoDir);
            echo "   🗑️  Removido diretório vazio: " . basename($anoDir) . "\n";
        }
    }
    
    // Criar estrutura apenas para CCe (que gera PDF)
    $cceDir = $empresaDir . "/CCe";
    if (!is_dir($cceDir)) {
        mkdir($cceDir, 0755, true);
        echo "   📁 Criada estrutura para: CCe/ (Carta de Correção)\n";
    }
}

echo "\n🎉 REORGANIZAÇÃO CONCLUÍDA!\n";
echo "\n📋 NOVA ESTRUTURA DE PDFs:\n";
echo "backend/storage/pdf/empresa_id/\n";
echo "├── Autorizados/2025/06/    ✅ PDFs de NFes autorizadas (DANFE)\n";
echo "└── CCe/2025/06/            📁 Preparado para PDFs de Carta de Correção\n";
echo "\n📝 NOTA: Cancelamento não gera PDF, apenas XML\n";
echo "✨ Sistema pronto para implementação de CCe!\n";
?>
