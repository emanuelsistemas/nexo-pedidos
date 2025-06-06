<?php
/**
 * Script para reorganizar XMLs existentes na nova estrutura
 * 
 * ANTES: backend/storage/xml/empresa_id/2025/06/chave.xml
 * DEPOIS: backend/storage/xml/empresa_id/Autorizados/2025/06/chave.xml
 */

echo "🔄 REORGANIZANDO ESTRUTURA DE XMLs...\n";

$storageDir = "/root/nexo/nexo-pedidos/backend/storage/xml";

if (!is_dir($storageDir)) {
    echo "❌ Diretório storage não encontrado: {$storageDir}\n";
    exit(1);
}

// Buscar todas as pastas de empresas
$empresas = glob($storageDir . "/empresa_*", GLOB_ONLYDIR);

foreach ($empresas as $empresaDir) {
    $empresaId = basename($empresaDir);
    echo "\n📁 Processando: {$empresaId}\n";
    
    // Buscar XMLs existentes (estrutura antiga)
    $xmlsExistentes = glob($empresaDir . "/*/*.xml");
    
    if (empty($xmlsExistentes)) {
        echo "   ℹ️  Nenhum XML encontrado na estrutura antiga\n";
        continue;
    }
    
    foreach ($xmlsExistentes as $xmlPath) {
        $nomeArquivo = basename($xmlPath);
        $dirRelativo = str_replace($empresaDir . '/', '', dirname($xmlPath));
        
        // Criar nova estrutura: Autorizados/ano/mes
        $novoDir = $empresaDir . "/Autorizados/" . $dirRelativo;
        $novoPath = $novoDir . "/" . $nomeArquivo;
        
        // Criar diretório se não existir
        if (!is_dir($novoDir)) {
            mkdir($novoDir, 0755, true);
            echo "   📁 Criado: Autorizados/{$dirRelativo}\n";
        }
        
        // Mover arquivo
        if (rename($xmlPath, $novoPath)) {
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
}

echo "\n✅ REORGANIZAÇÃO CONCLUÍDA!\n";
echo "\n📋 NOVA ESTRUTURA:\n";
echo "backend/storage/xml/\n";
echo "├── empresa_id/\n";
echo "│   ├── Autorizados/\n";
echo "│   │   └── 2025/06/chave.xml\n";
echo "│   └── Cancelados/\n";
echo "│       └── 2025/06/chave_cancelamento.xml\n";
echo "\n🎯 Estrutura organizada e pronta para uso!\n";
?>
