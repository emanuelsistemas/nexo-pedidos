<?php
/**
 * Script para verificar e corrigir todos os scripts de build do sistema
 * 
 * PROBLEMA IDENTIFICADO: O script nexo-dev estava criando pastas 55 e 65 na raiz
 * OBJETIVO: Verificar se outros scripts têm o mesmo problema
 */

echo "🔍 VERIFICANDO TODOS OS SCRIPTS DE BUILD DO SISTEMA...\n";
echo "=" . str_repeat("=", 70) . "\n\n";

// Scripts de build identificados
$scriptsParaVerificar = [
    '/usr/local/bin/nexo-dev' => 'Script de desenvolvimento (CORRIGIDO)',
    '/usr/local/bin/nexo' => 'Script de produção',
    '/usr/local/bin/nexobeta' => 'Script de beta (se existir)',
    '/root/nexo-pedidos/start.sh' => 'Script start.sh (usado pelo nexo)',
    '/root/nexo-pedidos/beta.sh' => 'Script beta.sh',
    '/root/nexo-pedidos/build-dev.sh' => 'Script build-dev.sh',
    '/root/nexo-pedidos/build-dev-fix.sh' => 'Script build-dev-fix.sh',
    '/root/nexo-pedidos/dev-vps.sh' => 'Script dev-vps.sh',
    '/root/nexo-pedidos/Doc/inicializacao_push/start.sh' => 'Script start.sh da documentação'
];

$problemasEncontrados = [];
$scriptsCorretos = [];
$scriptsNaoEncontrados = [];

echo "📋 ANALISANDO SCRIPTS DE BUILD:\n\n";

foreach ($scriptsParaVerificar as $caminho => $descricao) {
    echo "🔍 Verificando: {$descricao}\n";
    echo "   📁 Caminho: {$caminho}\n";
    
    if (!file_exists($caminho)) {
        echo "   ⚠️  Arquivo não encontrado\n";
        $scriptsNaoEncontrados[] = [
            'caminho' => $caminho,
            'descricao' => $descricao
        ];
        echo "\n";
        continue;
    }
    
    $conteudo = file_get_contents($caminho);
    
    // Padrões problemáticos que criam pastas 55/65 na raiz
    $padroesProblemáticos = [
        '/mkdir\s+-p\s+[^}]*storage\/\{[^}]*\}.*55.*65/' => 'Cria pastas 55/65 na raiz com expansão de chaves',
        '/mkdir\s+-p\s+.*storage\/pdf\/\{55,65\}/' => 'Cria pastas 55/65 diretamente em storage/pdf/',
        '/mkdir\s+-p\s+.*storage\/xml\/\{55,65\}/' => 'Cria pastas 55/65 diretamente em storage/xml/',
        '/mkdir\s+-p\s+.*storage\/pdf\/55/' => 'Cria pasta 55 diretamente em storage/pdf/',
        '/mkdir\s+-p\s+.*storage\/pdf\/65/' => 'Cria pasta 65 diretamente em storage/pdf/',
        '/mkdir\s+-p\s+.*storage\/xml\/55/' => 'Cria pasta 55 diretamente em storage/xml/',
        '/mkdir\s+-p\s+.*storage\/xml\/65/' => 'Cria pasta 65 diretamente em storage/xml/'
    ];
    
    $problemasNoScript = [];
    
    foreach ($padroesProblemáticos as $padrao => $descricaoProblema) {
        if (preg_match($padrao, $conteudo, $matches)) {
            // Verificar se a linha está comentada
            $linhaCompleta = $matches[0];
            $linhas = explode("\n", $conteudo);
            $linhaEncontrada = false;

            foreach ($linhas as $linha) {
                if (strpos($linha, trim($linhaCompleta)) !== false) {
                    // Verificar se a linha está comentada (começa com # após espaços)
                    if (preg_match('/^\s*#/', $linha)) {
                        $linhaEncontrada = true;
                        break;
                    }
                }
            }

            // Só adicionar como problema se não estiver comentada
            if (!$linhaEncontrada) {
                $problemasNoScript[] = [
                    'padrao' => $descricaoProblema,
                    'codigo' => trim($matches[0])
                ];
            }
        }
    }
    
    if (!empty($problemasNoScript)) {
        echo "   ❌ PROBLEMAS ENCONTRADOS:\n";
        foreach ($problemasNoScript as $problema) {
            echo "      • {$problema['padrao']}\n";
            echo "        Código: {$problema['codigo']}\n";
        }
        
        $problemasEncontrados[] = [
            'caminho' => $caminho,
            'descricao' => $descricao,
            'problemas' => $problemasNoScript
        ];
    } else {
        echo "   ✅ Script correto - não cria pastas 55/65 na raiz\n";
        $scriptsCorretos[] = [
            'caminho' => $caminho,
            'descricao' => $descricao
        ];
    }
    
    echo "\n";
}

// Resumo da análise
echo "📊 RESUMO DA ANÁLISE:\n";
echo "=" . str_repeat("=", 50) . "\n";
echo "✅ Scripts corretos: " . count($scriptsCorretos) . "\n";
echo "❌ Scripts com problemas: " . count($problemasEncontrados) . "\n";
echo "⚠️  Scripts não encontrados: " . count($scriptsNaoEncontrados) . "\n";

if (!empty($scriptsCorretos)) {
    echo "\n✅ SCRIPTS CORRETOS:\n";
    foreach ($scriptsCorretos as $script) {
        echo "   • {$script['descricao']}\n";
    }
}

if (!empty($problemasEncontrados)) {
    echo "\n❌ SCRIPTS COM PROBLEMAS:\n";
    foreach ($problemasEncontrados as $script) {
        echo "   • {$script['descricao']}\n";
        echo "     📁 {$script['caminho']}\n";
        foreach ($script['problemas'] as $problema) {
            echo "     ⚠️  {$problema['padrao']}\n";
        }
        echo "\n";
    }
}

if (!empty($scriptsNaoEncontrados)) {
    echo "\n⚠️  SCRIPTS NÃO ENCONTRADOS:\n";
    foreach ($scriptsNaoEncontrados as $script) {
        echo "   • {$script['descricao']}\n";
        echo "     📁 {$script['caminho']}\n";
    }
}

// Verificar estrutura atual
echo "\n🔍 VERIFICANDO ESTRUTURA ATUAL:\n";
$storageDir = "/root/nexo-pedidos/backend/storage";

foreach (['xml', 'pdf'] as $tipo) {
    $tipoDir = "{$storageDir}/{$tipo}";
    echo "\n📁 {$tipo}/:\n";
    
    if (!is_dir($tipoDir)) {
        echo "   ⚠️  Diretório não existe\n";
        continue;
    }
    
    // Verificar se há pastas 55/65 na raiz
    $pasta55 = "{$tipoDir}/55";
    $pasta65 = "{$tipoDir}/65";
    
    if (is_dir($pasta55)) {
        echo "   ❌ Pasta 55 encontrada na raiz\n";
    } else {
        echo "   ✅ Sem pasta 55 na raiz\n";
    }
    
    if (is_dir($pasta65)) {
        echo "   ❌ Pasta 65 encontrada na raiz\n";
    } else {
        echo "   ✅ Sem pasta 65 na raiz\n";
    }
    
    // Contar empresas
    $empresas = glob("{$tipoDir}/empresa_*", GLOB_ONLYDIR);
    echo "   🏢 Empresas: " . count($empresas) . "\n";
}

// Recomendações
echo "\n💡 RECOMENDAÇÕES:\n";
echo "=" . str_repeat("=", 50) . "\n";

if (empty($problemasEncontrados)) {
    echo "✅ Todos os scripts estão corretos!\n";
    echo "   O problema das pastas 55/65 na raiz foi resolvido.\n";
} else {
    echo "🔧 AÇÕES NECESSÁRIAS:\n";
    foreach ($problemasEncontrados as $script) {
        echo "\n📝 Corrigir: {$script['descricao']}\n";
        echo "   📁 Arquivo: {$script['caminho']}\n";
        echo "   🔧 Ação: Remover criação de pastas 55/65 na raiz\n";
        echo "   ✅ Manter apenas: mkdir -p backend/storage/{certificados,xml,pdf,logs}\n";
    }
}

echo "\n🎯 ESTRUTURA CORRETA:\n";
echo "backend/storage/\n";
echo "├── certificados/\n";
echo "├── logs/\n";
echo "├── xml/\n";
echo "│   └── empresa_{id}/\n";
echo "│       ├── homologacao/\n";
echo "│       │   ├── 55/ (NFe)\n";
echo "│       │   └── 65/ (NFCe)\n";
echo "│       └── producao/\n";
echo "│           ├── 55/ (NFe)\n";
echo "│           └── 65/ (NFCe)\n";
echo "└── pdf/ (mesma estrutura)\n";

echo "\n✅ VERIFICAÇÃO CONCLUÍDA!\n";
?>
