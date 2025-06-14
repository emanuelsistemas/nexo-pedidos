<?php
/**
 * Script para reorganizar estrutura de storage incluindo separação por modelo de documento
 * 
 * ESTRUTURA ATUAL:
 * backend/storage/{tipo}/empresa_{id}/{ambiente}/{status}/{ano}/{mes}/
 * 
 * NOVA ESTRUTURA:
 * backend/storage/{tipo}/empresa_{id}/{ambiente}/{modelo}/{status}/{ano}/{mes}/
 * 
 * Onde:
 * - {tipo} = xml, pdf, espelhos
 * - {ambiente} = homologacao, producao
 * - {modelo} = 55 (NFe), 65 (NFCe)
 * - {status} = Autorizados, Cancelados, CCe
 */

echo "🔄 REORGANIZANDO ESTRUTURA PARA INCLUIR MODELO DE DOCUMENTO...\n";
echo "📋 Nova estrutura: storage/{tipo}/empresa_{id}/{ambiente}/{modelo}/{status}/{ano}/{mes}/\n\n";

$baseStorageDir = "/root/nexo/nexo-pedidos/backend/storage";
$tipos = ['xml', 'pdf', 'espelhos'];

// Função para mover arquivos mantendo estrutura
function moverArquivos($origem, $destino, $tipo) {
    if (!is_dir($origem)) {
        return 0;
    }
    
    if (!is_dir($destino)) {
        mkdir($destino, 0755, true);
    }
    
    $arquivos = glob($origem . "/*");
    $movidos = 0;
    
    foreach ($arquivos as $arquivo) {
        if (is_file($arquivo)) {
            $nomeArquivo = basename($arquivo);
            $destinoArquivo = $destino . '/' . $nomeArquivo;
            
            if (rename($arquivo, $destinoArquivo)) {
                $movidos++;
                echo "     ✅ Movido: {$nomeArquivo}\n";
            } else {
                echo "     ❌ Erro ao mover: {$nomeArquivo}\n";
            }
        }
    }
    
    return $movidos;
}

// Função para remover diretórios vazios
function removerDiretoriosVazios($dir) {
    if (!is_dir($dir)) return;
    
    $arquivos = scandir($dir);
    $arquivos = array_diff($arquivos, ['.', '..']);
    
    foreach ($arquivos as $arquivo) {
        $caminhoCompleto = $dir . '/' . $arquivo;
        if (is_dir($caminhoCompleto)) {
            removerDiretoriosVazios($caminhoCompleto);
        }
    }
    
    // Verificar se diretório está vazio após limpeza recursiva
    $arquivos = scandir($dir);
    if (count($arquivos) == 2) { // Apenas . e ..
        rmdir($dir);
        echo "   🗑️  Removido diretório vazio: " . basename($dir) . "\n";
    }
}

foreach ($tipos as $tipo) {
    echo "📁 Processando tipo: {$tipo}\n";
    
    $tipoDir = "{$baseStorageDir}/{$tipo}";
    
    if (!is_dir($tipoDir)) {
        echo "   ⚠️  Diretório não existe: {$tipoDir}\n";
        continue;
    }
    
    // Buscar todas as pastas de empresas
    $empresas = glob($tipoDir . "/empresa_*", GLOB_ONLYDIR);
    
    if (empty($empresas)) {
        echo "   ℹ️  Nenhuma empresa encontrada em: {$tipoDir}\n";
        continue;
    }
    
    foreach ($empresas as $empresaDir) {
        $empresaId = str_replace($tipoDir . '/empresa_', '', $empresaDir);
        echo "   🏢 Empresa: {$empresaId}\n";
        
        // Buscar ambientes (homologacao, producao)
        $ambientes = ['homologacao', 'producao'];
        
        foreach ($ambientes as $ambiente) {
            $ambienteDir = "{$empresaDir}/{$ambiente}";
            
            if (!is_dir($ambienteDir)) {
                echo "     ⚠️  Ambiente {$ambiente} não existe\n";
                continue;
            }
            
            echo "     🌍 Ambiente: {$ambiente}\n";
            
            // Para espelhos, estrutura é diferente (sem status)
            if ($tipo === 'espelhos') {
                // Estrutura atual: empresa_id/ambiente/arquivo.pdf
                // Nova estrutura: empresa_id/ambiente/55/arquivo.pdf (assumindo NFe por padrão)
                
                $novoDir = "{$ambienteDir}/55"; // Modelo 55 (NFe) por padrão
                $arquivos = glob("{$ambienteDir}/*.{pdf,html}", GLOB_BRACE);
                
                if (!empty($arquivos)) {
                    echo "       📄 Movendo " . count($arquivos) . " espelhos para modelo 55\n";
                    
                    if (!is_dir($novoDir)) {
                        mkdir($novoDir, 0755, true);
                    }
                    
                    foreach ($arquivos as $arquivo) {
                        $nomeArquivo = basename($arquivo);
                        $destino = "{$novoDir}/{$nomeArquivo}";
                        
                        if (rename($arquivo, $destino)) {
                            echo "         ✅ Movido: {$nomeArquivo}\n";
                        } else {
                            echo "         ❌ Erro ao mover: {$nomeArquivo}\n";
                        }
                    }
                }
                
                continue;
            }
            
            // Para XML e PDF, buscar status (Autorizados, Cancelados, CCe)
            $statusList = ['Autorizados', 'Cancelados', 'CCe'];
            
            foreach ($statusList as $status) {
                $statusDir = "{$ambienteDir}/{$status}";
                
                if (!is_dir($statusDir)) {
                    continue;
                }
                
                echo "       📋 Status: {$status}\n";
                
                // Buscar anos
                $anos = glob($statusDir . "/[0-9][0-9][0-9][0-9]", GLOB_ONLYDIR);
                
                foreach ($anos as $anoDir) {
                    $ano = basename($anoDir);
                    
                    // Buscar meses
                    $meses = glob($anoDir . "/[0-9][0-9]", GLOB_ONLYDIR);
                    
                    foreach ($meses as $mesDir) {
                        $mes = basename($mesDir);
                        
                        // Verificar se há arquivos
                        $arquivos = glob($mesDir . "/*");
                        $arquivos = array_filter($arquivos, 'is_file');
                        
                        if (empty($arquivos)) {
                            continue;
                        }
                        
                        echo "         📅 {$ano}/{$mes} - " . count($arquivos) . " arquivos\n";
                        
                        // Mover todos os arquivos para modelo 55 (NFe) por padrão
                        // Futuramente, quando implementar NFCe, será modelo 65
                        $novoDir = "{$ambienteDir}/55/{$status}/{$ano}/{$mes}";
                        
                        $movidos = moverArquivos($mesDir, $novoDir, $tipo);
                        echo "         ✅ Movidos {$movidos} arquivos para modelo 55\n";
                    }
                }
            }
        }
        
        // Remover diretórios vazios da estrutura antiga
        echo "   🧹 Limpando diretórios vazios...\n";
        removerDiretoriosVazios($empresaDir);
    }
}

echo "\n✅ REORGANIZAÇÃO CONCLUÍDA!\n";
echo "\n📋 NOVA ESTRUTURA IMPLEMENTADA:\n";
echo "backend/storage/\n";
echo "├── xml/\n";
echo "│   └── empresa_{id}/\n";
echo "│       ├── homologacao/\n";
echo "│       │   ├── 55/                    # NFe\n";
echo "│       │   │   ├── Autorizados/{ano}/{mes}/\n";
echo "│       │   │   ├── Cancelados/{ano}/{mes}/\n";
echo "│       │   │   └── CCe/{ano}/{mes}/\n";
echo "│       │   └── 65/                    # NFCe (futuro)\n";
echo "│       │       ├── Autorizados/{ano}/{mes}/\n";
echo "│       │       └── Cancelados/{ano}/{mes}/\n";
echo "│       └── producao/\n";
echo "│           ├── 55/ (mesma estrutura)\n";
echo "│           └── 65/ (mesma estrutura)\n";
echo "├── pdf/\n";
echo "│   └── empresa_{id}/ (mesma estrutura do XML)\n";
echo "└── espelhos/\n";
echo "    └── empresa_{id}/\n";
echo "        ├── homologacao/\n";
echo "        │   ├── 55/                    # Espelhos NFe\n";
echo "        │   └── 65/                    # Espelhos NFCe (futuro)\n";
echo "        └── producao/\n";
echo "            ├── 55/\n";
echo "            └── 65/\n";
echo "\n🎯 Estrutura pronta para NFe (55) e NFCe (65)!\n";
?>
