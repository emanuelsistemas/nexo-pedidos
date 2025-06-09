<?php
/**
 * Script para migrar estrutura de storage para incluir separação por ambiente
 *
 * ESTRUTURA ANTIGA:
 * storage/xml/empresa_{id}/Autorizados/2025/06/
 * storage/pdf/empresa_{id}/Autorizados/2025/06/
 * storage/espelhos/{id}/
 *
 * ESTRUTURA NOVA:
 * storage/xml/empresa_{id}/homologacao/Autorizados/2025/06/
 * storage/pdf/empresa_{id}/homologacao/Autorizados/2025/06/
 * storage/espelhos/{id}/homologacao/
 */

echo "🔄 INICIANDO MIGRAÇÃO DA ESTRUTURA DE STORAGE PARA AMBIENTES\n";
echo "=" . str_repeat("=", 70) . "\n\n";

try {
    // 1. Buscar todas as pastas de empresas existentes
    echo "📋 Buscando empresas com dados de storage...\n";

    $empresasEncontradas = [];

    // Buscar em XML
    $xmlDir = 'storage/xml';
    if (is_dir($xmlDir)) {
        $pastas = scandir($xmlDir);
        foreach ($pastas as $pasta) {
            if (strpos($pasta, 'empresa_') === 0) {
                $empresaId = str_replace('empresa_', '', $pasta);
                $empresasEncontradas[$empresaId] = [
                    'id' => $empresaId,
                    'xml_path' => "{$xmlDir}/{$pasta}"
                ];
            }
        }
    }

    // Buscar em PDF
    $pdfDir = 'storage/pdf';
    if (is_dir($pdfDir)) {
        $pastas = scandir($pdfDir);
        foreach ($pastas as $pasta) {
            if (strpos($pasta, 'empresa_') === 0) {
                $empresaId = str_replace('empresa_', '', $pasta);
                if (!isset($empresasEncontradas[$empresaId])) {
                    $empresasEncontradas[$empresaId] = ['id' => $empresaId];
                }
                $empresasEncontradas[$empresaId]['pdf_path'] = "{$pdfDir}/{$pasta}";
            }
        }
    }

    // Buscar em Espelhos
    $espelhosDir = 'storage/espelhos';
    if (is_dir($espelhosDir)) {
        $pastas = scandir($espelhosDir);
        foreach ($pastas as $pasta) {
            if ($pasta !== '.' && $pasta !== '..' && is_dir("{$espelhosDir}/{$pasta}")) {
                $empresaId = $pasta;
                if (!isset($empresasEncontradas[$empresaId])) {
                    $empresasEncontradas[$empresaId] = ['id' => $empresaId];
                }
                $empresasEncontradas[$empresaId]['espelhos_path'] = "{$espelhosDir}/{$pasta}";
            }
        }
    }

    if (empty($empresasEncontradas)) {
        throw new Exception('Nenhuma empresa com dados encontrada');
    }

    echo "✅ Encontradas " . count($empresasEncontradas) . " empresas com dados\n\n";
    
    $totalMigradas = 0;
    $totalErros = 0;

    foreach ($empresasEncontradas as $empresa) {
        $empresaId = $empresa['id'];

        echo "🏢 Processando empresa ID: {$empresaId}\n";

        try {
            // Para migração, vamos usar homologação como padrão
            // (as empresas podem alterar depois nas configurações)
            $ambienteAtual = 'homologacao';

            echo "   📊 Migrando para ambiente: {$ambienteAtual}\n";
            
            // Migrar cada tipo de storage
            $tipos = ['xml', 'pdf'];
            
            foreach ($tipos as $tipo) {
                $empresaDir = "storage/{$tipo}/empresa_{$empresaId}";

                if (!is_dir($empresaDir)) {
                    echo "   ⚠️  Pasta {$tipo} não existe, pulando...\n";
                    continue;
                }

                echo "   🔄 Migrando {$tipo}...\n";

                // Verificar se já está na nova estrutura
                $ambienteDir = "{$empresaDir}/{$ambienteAtual}";
                if (is_dir($ambienteDir)) {
                    echo "   ✅ {$tipo} já migrado\n";
                    continue;
                }

                // Criar diretório de ambiente
                if (!mkdir($ambienteDir, 0755, true)) {
                    throw new Exception("Erro ao criar diretório: {$ambienteDir}");
                }

                // Mover subpastas para dentro do ambiente
                $subpastas = ['Autorizados', 'Cancelados', 'CCe'];

                foreach ($subpastas as $subpasta) {
                    $origemPath = "{$empresaDir}/{$subpasta}";
                    $destinoPath = "{$ambienteDir}/{$subpasta}";

                    if (is_dir($origemPath)) {
                        if (rename($origemPath, $destinoPath)) {
                            echo "     ✅ Movido: {$subpasta}\n";
                        } else {
                            echo "     ❌ Erro ao mover: {$subpasta}\n";
                        }
                    }
                }
            }

            // Migrar espelhos
            $espelhosDir = "storage/espelhos/{$empresaId}";
            if (is_dir($espelhosDir)) {
                echo "   🔄 Migrando espelhos...\n";

                $ambienteEspelhosDir = "{$espelhosDir}/{$ambienteAtual}";

                if (!is_dir($ambienteEspelhosDir)) {
                    mkdir($ambienteEspelhosDir, 0755, true);

                    // Mover arquivos de espelho para pasta de ambiente
                    $arquivos = glob("{$espelhosDir}/*.{pdf,html}", GLOB_BRACE);

                    foreach ($arquivos as $arquivo) {
                        $nomeArquivo = basename($arquivo);
                        $destino = "{$ambienteEspelhosDir}/{$nomeArquivo}";

                        if (rename($arquivo, $destino)) {
                            echo "     ✅ Movido espelho: {$nomeArquivo}\n";
                        } else {
                            echo "     ❌ Erro ao mover espelho: {$nomeArquivo}\n";
                        }
                    }
                } else {
                    echo "   ✅ Espelhos já migrados\n";
                }
            }
            
            $totalMigradas++;
            echo "   ✅ Empresa migrada com sucesso!\n\n";
            
        } catch (Exception $e) {
            $totalErros++;
            echo "   ❌ Erro na empresa {$razaoSocial}: " . $e->getMessage() . "\n\n";
        }
    }
    
    echo "=" . str_repeat("=", 70) . "\n";
    echo "📊 RESUMO DA MIGRAÇÃO:\n";
    echo "✅ Empresas migradas: {$totalMigradas}\n";
    echo "❌ Empresas com erro: {$totalErros}\n";
    echo "📁 Nova estrutura implementada com sucesso!\n\n";
    
    echo "🎯 PRÓXIMOS PASSOS:\n";
    echo "1. Testar emissão de NFe\n";
    echo "2. Testar cancelamento\n";
    echo "3. Testar CCe\n";
    echo "4. Verificar Portal do Contador\n";
    echo "5. Validar downloads de arquivos\n\n";
    
} catch (Exception $e) {
    echo "❌ ERRO GERAL: " . $e->getMessage() . "\n";
    exit(1);
}

echo "🚀 MIGRAÇÃO CONCLUÍDA!\n";
?>
