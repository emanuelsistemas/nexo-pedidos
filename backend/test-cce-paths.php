<?php

/**
 * Teste específico para verificar caminhos da CCe
 */

echo "=== TESTE DE CAMINHOS DA CCe ===\n";
echo "Data: " . date('Y-m-d H:i:s') . "\n\n";

// Dados de teste
$empresaId = 'acd26a4f-7220-405e-9c96-faffb7e6480e';
$ambienteTexto = 'homologacao';
$modelo = '55';

// Testar criação do diretório da CCe
echo "1. Testando criação do diretório da CCe...\n";
$xmlCceDir = "/root/nexo-pedidos/backend/storage/xml/empresa_{$empresaId}/{$ambienteTexto}/{$modelo}/CCe/" . date('Y/m');

echo "Caminho: $xmlCceDir\n";

// Verificar se o diretório pai existe
$parentDir = dirname($xmlCceDir);
echo "Diretório pai: $parentDir\n";
echo "Pai existe: " . (is_dir($parentDir) ? 'SIM' : 'NÃO') . "\n";

// Tentar criar o diretório
if (!is_dir($xmlCceDir)) {
    echo "Criando diretório...\n";
    if (mkdir($xmlCceDir, 0755, true)) {
        echo "✅ Diretório criado com sucesso!\n";
    } else {
        echo "❌ Erro ao criar diretório\n";
        $error = error_get_last();
        if ($error) {
            echo "Erro: " . $error['message'] . "\n";
        }
    }
} else {
    echo "✅ Diretório já existe\n";
}

// Verificar permissões
echo "\n2. Verificando permissões...\n";
$perms = fileperms($xmlCceDir);
echo "Permissões: " . substr(sprintf('%o', $perms), -4) . "\n";

// Testar escrita
echo "\n3. Testando escrita no diretório...\n";
$testFile = $xmlCceDir . '/test.txt';
if (file_put_contents($testFile, 'teste')) {
    echo "✅ Escrita funcionando\n";
    unlink($testFile); // Limpar arquivo de teste
} else {
    echo "❌ Erro na escrita\n";
}

// Verificar estrutura completa
echo "\n4. Verificando estrutura completa...\n";
$baseStorage = "/root/nexo-pedidos/backend/storage";
echo "Base storage: $baseStorage\n";
echo "Base existe: " . (is_dir($baseStorage) ? 'SIM' : 'NÃO') . "\n";

$empresaDir = "$baseStorage/xml/empresa_$empresaId";
echo "Empresa dir: $empresaDir\n";
echo "Empresa existe: " . (is_dir($empresaDir) ? 'SIM' : 'NÃO') . "\n";

$ambienteDir = "$empresaDir/$ambienteTexto";
echo "Ambiente dir: $ambienteDir\n";
echo "Ambiente existe: " . (is_dir($ambienteDir) ? 'SIM' : 'NÃO') . "\n";

$modeloDir = "$ambienteDir/$modelo";
echo "Modelo dir: $modeloDir\n";
echo "Modelo existe: " . (is_dir($modeloDir) ? 'SIM' : 'NÃO') . "\n";

echo "\n=== TESTE CONCLUÍDO ===\n";

if (is_dir($xmlCceDir) && is_writable($xmlCceDir)) {
    echo "✅ Sistema de CCe está funcionando!\n";
    echo "✅ Diretórios criados corretamente\n";
    echo "✅ Permissões adequadas\n";
    echo "\nAgora você pode tentar criar uma CCe novamente.\n";
} else {
    echo "❌ Ainda há problemas com os diretórios\n";
    echo "Verifique as permissões do sistema de arquivos\n";
}

?>
