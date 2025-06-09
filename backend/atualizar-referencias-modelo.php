<?php
/**
 * Script para atualizar todas as referências de caminhos no código
 * para usar a nova estrutura com modelo de documento
 * 
 * MUDANÇA:
 * DE:   storage/{tipo}/empresa_{id}/{ambiente}/{status}/{ano}/{mes}/
 * PARA: storage/{tipo}/empresa_{id}/{ambiente}/{modelo}/{status}/{ano}/{mes}/
 */

echo "🔄 ATUALIZANDO REFERÊNCIAS DE CAMINHOS NO CÓDIGO...\n";

// Arquivos que precisam ser atualizados
$arquivosParaAtualizar = [
    // APIs principais
    'public/gerar-danfe.php',
    'public/gerar-pdf-cce.php',
    'public/gerar-espelho-nfe.php',
    'public/carta-correcao.php',
    'public/download-arquivo.php',
    'public/contador-portal.php',
    
    // Scripts de migração existentes
    'reorganizar-xmls.php',
    'reorganizar-pdfs.php',
    'migrar-estrutura-ambiente.php',
];

// Função para criar backup de arquivo
function criarBackup($arquivo) {
    $backup = $arquivo . '.backup.' . date('YmdHis');
    if (copy($arquivo, $backup)) {
        echo "   💾 Backup criado: " . basename($backup) . "\n";
        return true;
    }
    return false;
}

// Função para atualizar caminhos em arquivo
function atualizarCaminhos($arquivo) {
    if (!file_exists($arquivo)) {
        echo "   ⚠️  Arquivo não encontrado: {$arquivo}\n";
        return false;
    }
    
    echo "   📝 Atualizando: " . basename($arquivo) . "\n";
    
    // Criar backup
    if (!criarBackup($arquivo)) {
        echo "   ❌ Erro ao criar backup, pulando arquivo\n";
        return false;
    }
    
    $conteudo = file_get_contents($arquivo);
    $conteudoOriginal = $conteudo;
    
    // Padrões para substituir - NFe (modelo 55)
    $substituicoes = [
        // XML paths
        '/storage\/xml\/empresa_([^\/]+)\/([^\/]+)\/Autorizados/' => 'storage/xml/empresa_$1/$2/55/Autorizados',
        '/storage\/xml\/empresa_([^\/]+)\/([^\/]+)\/Cancelados/' => 'storage/xml/empresa_$1/$2/55/Cancelados',
        '/storage\/xml\/empresa_([^\/]+)\/([^\/]+)\/CCe/' => 'storage/xml/empresa_$1/$2/55/CCe',
        
        // PDF paths
        '/storage\/pdf\/empresa_([^\/]+)\/([^\/]+)\/Autorizados/' => 'storage/pdf/empresa_$1/$2/55/Autorizados',
        '/storage\/pdf\/empresa_([^\/]+)\/([^\/]+)\/CCe/' => 'storage/pdf/empresa_$1/$2/55/CCe',
        
        // Espelhos paths (sem status)
        '/storage\/espelhos\/([^\/]+)\/([^\/]+)\/([^\/]+)/' => 'storage/espelhos/$1/$2/55/',
        
        // Paths com aspas duplas
        '/"\.\.\/storage\/xml\/empresa_([^\/]+)\/([^\/]+)\/Autorizados/' => '"../storage/xml/empresa_$1/$2/55/Autorizados',
        '/"\.\.\/storage\/xml\/empresa_([^\/]+)\/([^\/]+)\/Cancelados/' => '"../storage/xml/empresa_$1/$2/55/Cancelados',
        '/"\.\.\/storage\/xml\/empresa_([^\/]+)\/([^\/]+)\/CCe/' => '"../storage/xml/empresa_$1/$2/55/CCe',
        '/"\.\.\/storage\/pdf\/empresa_([^\/]+)\/([^\/]+)\/Autorizados/' => '"../storage/pdf/empresa_$1/$2/55/Autorizados',
        '/"\.\.\/storage\/pdf\/empresa_([^\/]+)\/([^\/]+)\/CCe/' => '"../storage/pdf/empresa_$1/$2/55/CCe',
        
        // Paths absolutos
        '/\/root\/nexo\/nexo-pedidos\/backend\/storage\/xml\/empresa_([^\/]+)\/([^\/]+)\/Autorizados/' => '/root/nexo/nexo-pedidos/backend/storage/xml/empresa_$1/$2/55/Autorizados',
        '/\/root\/nexo\/nexo-pedidos\/backend\/storage\/xml\/empresa_([^\/]+)\/([^\/]+)\/Cancelados/' => '/root/nexo/nexo-pedidos/backend/storage/xml/empresa_$1/$2/55/Cancelados',
        '/\/root\/nexo\/nexo-pedidos\/backend\/storage\/xml\/empresa_([^\/]+)\/([^\/]+)\/CCe/' => '/root/nexo/nexo-pedidos/backend/storage/xml/empresa_$1/$2/55/CCe',
        '/\/root\/nexo\/nexo-pedidos\/backend\/storage\/pdf\/empresa_([^\/]+)\/([^\/]+)\/Autorizados/' => '/root/nexo/nexo-pedidos/backend/storage/pdf/empresa_$1/$2/55/Autorizados',
        '/\/root\/nexo\/nexo-pedidos\/backend\/storage\/pdf\/empresa_([^\/]+)\/([^\/]+)\/CCe/' => '/root/nexo/nexo-pedidos/backend/storage/pdf/empresa_$1/$2/55/CCe',
    ];
    
    $alteracoes = 0;
    
    foreach ($substituicoes as $padrao => $substituto) {
        $novoConteudo = preg_replace($padrao, $substituto, $conteudo);
        if ($novoConteudo !== $conteudo) {
            $alteracoes += preg_match_all($padrao, $conteudo);
            $conteudo = $novoConteudo;
        }
    }
    
    // Salvar arquivo atualizado
    if ($alteracoes > 0) {
        if (file_put_contents($arquivo, $conteudo)) {
            echo "     ✅ {$alteracoes} alterações aplicadas\n";
            return true;
        } else {
            echo "     ❌ Erro ao salvar arquivo\n";
            return false;
        }
    } else {
        echo "     ℹ️  Nenhuma alteração necessária\n";
        // Remover backup se não houve alterações
        $backup = $arquivo . '.backup.' . date('YmdHis');
        if (file_exists($backup)) {
            unlink($backup);
        }
        return true;
    }
}

// Processar cada arquivo
foreach ($arquivosParaAtualizar as $arquivo) {
    echo "📁 Processando: {$arquivo}\n";
    atualizarCaminhos($arquivo);
    echo "\n";
}

echo "✅ ATUALIZAÇÃO DE REFERÊNCIAS CONCLUÍDA!\n";
echo "\n📋 RESUMO DAS MUDANÇAS:\n";
echo "• Todos os caminhos agora incluem modelo de documento (55 para NFe)\n";
echo "• Estrutura preparada para NFCe (modelo 65) no futuro\n";
echo "• Backups criados para todos os arquivos alterados\n";
echo "\n🎯 NOVA ESTRUTURA DE CAMINHOS:\n";
echo "• XML: storage/xml/empresa_{id}/{ambiente}/55/{status}/{ano}/{mes}/\n";
echo "• PDF: storage/pdf/empresa_{id}/{ambiente}/55/{status}/{ano}/{mes}/\n";
echo "• Espelhos: storage/espelhos/{empresa_id}/{ambiente}/55/\n";
echo "\n🚀 Sistema pronto para NFe e NFCe!\n";
?>
