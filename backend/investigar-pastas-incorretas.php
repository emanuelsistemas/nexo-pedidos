<?php
/**
 * Script para investigar e corrigir as pastas 55 e 65 criadas incorretamente na raiz
 * 
 * PROBLEMA: Pastas 55 e 65 estão sendo criadas em:
 * - backend/storage/xml/55/
 * - backend/storage/xml/65/
 * - backend/storage/pdf/55/
 * - backend/storage/pdf/65/
 * 
 * CORRETO: Devem estar apenas dentro das pastas das empresas:
 * - backend/storage/xml/empresa_{id}/ambiente/55/
 * - backend/storage/xml/empresa_{id}/ambiente/65/
 */

echo "🔍 INVESTIGANDO PASTAS 55 E 65 CRIADAS INCORRETAMENTE...\n";
echo "=" . str_repeat("=", 70) . "\n\n";

$storageDir = "/root/nexo-pedidos/backend/storage";

// 1. Verificar estrutura atual
echo "📋 ESTRUTURA ATUAL:\n";

$tipos = ['xml', 'pdf'];
$problemasEncontrados = [];

foreach ($tipos as $tipo) {
    $tipoDir = "{$storageDir}/{$tipo}";
    echo "\n📁 Verificando: {$tipo}/\n";
    
    if (!is_dir($tipoDir)) {
        echo "   ⚠️  Diretório não existe: {$tipoDir}\n";
        continue;
    }
    
    // Verificar se há pastas 55 e 65 na raiz
    $pasta55 = "{$tipoDir}/55";
    $pasta65 = "{$tipoDir}/65";
    
    if (is_dir($pasta55)) {
        echo "   ❌ PROBLEMA: Pasta 55 encontrada na raiz: {$pasta55}\n";
        $problemasEncontrados[] = [
            'tipo' => $tipo,
            'pasta' => '55',
            'caminho' => $pasta55
        ];
        
        // Verificar se há arquivos dentro
        $arquivos = glob("{$pasta55}/*");
        if (!empty($arquivos)) {
            echo "      📄 Contém " . count($arquivos) . " itens\n";
        } else {
            echo "      📭 Pasta vazia\n";
        }
    }
    
    if (is_dir($pasta65)) {
        echo "   ❌ PROBLEMA: Pasta 65 encontrada na raiz: {$pasta65}\n";
        $problemasEncontrados[] = [
            'tipo' => $tipo,
            'pasta' => '65',
            'caminho' => $pasta65
        ];
        
        // Verificar se há arquivos dentro
        $arquivos = glob("{$pasta65}/*");
        if (!empty($arquivos)) {
            echo "      📄 Contém " . count($arquivos) . " itens\n";
        } else {
            echo "      📭 Pasta vazia\n";
        }
    }
    
    // Verificar estrutura correta (empresas)
    $empresas = glob("{$tipoDir}/empresa_*", GLOB_ONLYDIR);
    echo "   ✅ Empresas encontradas: " . count($empresas) . "\n";
    
    foreach ($empresas as $empresaDir) {
        $empresaId = basename($empresaDir);
        echo "      🏢 {$empresaId}\n";
        
        // Verificar se tem estrutura correta
        $ambientes = ['homologacao', 'producao'];
        foreach ($ambientes as $ambiente) {
            $ambienteDir = "{$empresaDir}/{$ambiente}";
            if (is_dir($ambienteDir)) {
                $modelos = glob("{$ambienteDir}/*", GLOB_ONLYDIR);
                foreach ($modelos as $modeloDir) {
                    $modelo = basename($modeloDir);
                    if (in_array($modelo, ['55', '65'])) {
                        echo "         ✅ {$ambiente}/{$modelo}/ (CORRETO)\n";
                    }
                }
            }
        }
    }
}

// 2. Análise dos problemas
echo "\n🔍 ANÁLISE DOS PROBLEMAS:\n";

if (empty($problemasEncontrados)) {
    echo "✅ Nenhum problema encontrado! Estrutura está correta.\n";
    exit(0);
}

echo "❌ Encontrados " . count($problemasEncontrados) . " problemas:\n";
foreach ($problemasEncontrados as $problema) {
    echo "   - {$problema['tipo']}/{$problema['pasta']}/ na raiz\n";
}

// 3. Investigar possível causa
echo "\n🔍 INVESTIGANDO POSSÍVEL CAUSA:\n";

// Verificar se há código que pode estar criando essas pastas
$arquivosSuspeitos = [
    'emitir-nfe.php',
    'emitir-nfce.php',
    'gerar-danfe.php',
    'carta-correcao.php'
];

foreach ($arquivosSuspeitos as $arquivo) {
    $caminhoArquivo = "/root/nexo-pedidos/backend/public/{$arquivo}";
    if (file_exists($caminhoArquivo)) {
        echo "   📄 Verificando: {$arquivo}\n";
        
        $conteudo = file_get_contents($caminhoArquivo);
        
        // Buscar por padrões suspeitos
        $padroesSuspeitos = [
            '/mkdir\s*\(\s*["\']\.\.\/storage\/(xml|pdf)\/55/',
            '/mkdir\s*\(\s*["\']\.\.\/storage\/(xml|pdf)\/65/',
            '/mkdir\s*\(\s*["\'][^"\']*storage\/(xml|pdf)\/55/',
            '/mkdir\s*\(\s*["\'][^"\']*storage\/(xml|pdf)\/65/'
        ];
        
        foreach ($padroesSuspeitos as $padrao) {
            if (preg_match($padrao, $conteudo, $matches)) {
                echo "      ⚠️  Padrão suspeito encontrado: {$matches[0]}\n";
            }
        }
    }
}

// 4. Propor solução
echo "\n💡 SOLUÇÃO PROPOSTA:\n";
echo "1. Remover pastas 55 e 65 da raiz (se estiverem vazias)\n";
echo "2. Verificar código que pode estar criando essas pastas\n";
echo "3. Garantir que mkdir sempre use empresa_id no caminho\n";

// 5. Executar limpeza (apenas se as pastas estiverem vazias)
echo "\n🧹 EXECUTANDO LIMPEZA AUTOMÁTICA:\n";

$removidas = 0;
foreach ($problemasEncontrados as $problema) {
    $caminho = $problema['caminho'];
    
    // Verificar se a pasta está vazia
    $arquivos = glob("{$caminho}/*");
    $arquivos = array_filter($arquivos, function($item) {
        return !in_array(basename($item), ['.', '..']);
    });
    
    if (empty($arquivos)) {
        echo "   🗑️  Removendo pasta vazia: {$problema['tipo']}/{$problema['pasta']}/\n";
        if (rmdir($caminho)) {
            echo "      ✅ Removida com sucesso\n";
            $removidas++;
        } else {
            echo "      ❌ Erro ao remover\n";
        }
    } else {
        echo "   ⚠️  Pasta não vazia, não removendo: {$problema['tipo']}/{$problema['pasta']}/\n";
        echo "      📄 Contém " . count($arquivos) . " itens\n";
        
        // Listar alguns itens
        $primeiros = array_slice($arquivos, 0, 5);
        foreach ($primeiros as $item) {
            echo "         - " . basename($item) . "\n";
        }
        if (count($arquivos) > 5) {
            echo "         ... e mais " . (count($arquivos) - 5) . " itens\n";
        }
    }
}

echo "\n📊 RESULTADO:\n";
echo "   Problemas encontrados: " . count($problemasEncontrados) . "\n";
echo "   Pastas removidas: {$removidas}\n";
echo "   Problemas restantes: " . (count($problemasEncontrados) - $removidas) . "\n";

if ($removidas > 0) {
    echo "\n✅ Limpeza concluída! Pastas vazias foram removidas.\n";
}

if (count($problemasEncontrados) - $removidas > 0) {
    echo "\n⚠️  Ainda há pastas com conteúdo que precisam ser analisadas manualmente.\n";
    echo "   Verifique o conteúdo antes de remover.\n";
}

echo "\n🎯 PRÓXIMOS PASSOS:\n";
echo "1. Verificar se o problema foi resolvido\n";
echo "2. Testar emissão de NFe/NFCe\n";
echo "3. Monitorar se as pastas são criadas novamente\n";
echo "4. Se forem criadas novamente, investigar o código responsável\n";

echo "\n✅ INVESTIGAÇÃO CONCLUÍDA!\n";
?>
