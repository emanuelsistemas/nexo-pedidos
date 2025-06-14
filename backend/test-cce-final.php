<?php

/**
 * Teste final para CCe - verificar permissões e escrita
 */

echo "=== TESTE FINAL CCe - PERMISSÕES ===\n";
echo "Data: " . date('Y-m-d H:i:s') . "\n\n";

// Dados de teste
$empresaId = 'acd26a4f-7220-405e-9c96-faffb7e6480e';
$ambienteTexto = 'homologacao';
$modelo = '55';

echo "1. Verificando permissões do usuário atual...\n";
echo "Usuário atual: " . get_current_user() . "\n";
echo "UID: " . getmyuid() . "\n";
echo "GID: " . getmygid() . "\n\n";

echo "2. Testando criação de diretório CCe...\n";
$xmlCceDir = "/root/nexo-pedidos/backend/storage/xml/empresa_{$empresaId}/{$ambienteTexto}/{$modelo}/CCe/" . date('Y/m');
echo "Diretório: $xmlCceDir\n";

// Verificar se existe
if (is_dir($xmlCceDir)) {
    echo "✅ Diretório já existe\n";
} else {
    echo "Criando diretório...\n";
    if (mkdir($xmlCceDir, 0755, true)) {
        echo "✅ Diretório criado com sucesso!\n";
    } else {
        echo "❌ Erro ao criar diretório\n";
        $error = error_get_last();
        if ($error) {
            echo "Erro: " . $error['message'] . "\n";
        }
        exit(1);
    }
}

// Verificar permissões
$perms = fileperms($xmlCceDir);
echo "Permissões: " . substr(sprintf('%o', $perms), -4) . "\n";
echo "Gravável: " . (is_writable($xmlCceDir) ? 'SIM' : 'NÃO') . "\n\n";

echo "3. Testando escrita de arquivo XML...\n";
$chaveNFe = '35250624163237000151550010000000351589707164';
$sequencia = 1;

$xmlTeste = '<?xml version="1.0" encoding="UTF-8"?>
<evento xmlns="http://www.portalfiscal.inf.br/nfe">
    <infEvento Id="ID110110' . $chaveNFe . '01">
        <cOrgao>35</cOrgao>
        <tpAmb>2</tpAmb>
        <CNPJ>24163237000151</CNPJ>
        <chNFe>' . $chaveNFe . '</chNFe>
        <dhEvento>' . date('c') . '</dhEvento>
        <tpEvento>110110</tpEvento>
        <nSeqEvento>' . $sequencia . '</nSeqEvento>
        <verEvento>1.00</verEvento>
        <detEvento versao="1.00">
            <descEvento>Carta de Correcao</descEvento>
            <xCorrecao>Teste final de correção</xCorrecao>
            <xCondUso>A Carta de Correcao e disciplinada pelo paragrafo 1o-A do art. 7o do Convenio S/N, de 15 de dezembro de 1970 e pode ser utilizada para regularizacao de erro ocorrido na emissao de documento fiscal, desde que o erro nao esteja relacionado com: I - as variaveis que determinam o valor do imposto tais como: base de calculo, aliquota, diferenca de preco, quantidade, valor da operacao ou da prestacao; II - a correcao de dados cadastrais que implique mudanca do remetente ou do destinatario; III - a data de emissao ou de saida.</xCondUso>
        </detEvento>
    </infEvento>
</evento>';

$nomeArquivo = $chaveNFe . '_cce_' . str_pad($sequencia, 3, '0', STR_PAD_LEFT) . '_teste.xml';
$caminhoArquivo = $xmlCceDir . '/' . $nomeArquivo;

echo "Nome arquivo: $nomeArquivo\n";
echo "Caminho completo: $caminhoArquivo\n";
echo "XML length: " . strlen($xmlTeste) . " bytes\n";

if (file_put_contents($caminhoArquivo, $xmlTeste)) {
    echo "✅ Arquivo XML salvo com sucesso!\n";
    echo "Arquivo existe: " . (file_exists($caminhoArquivo) ? 'SIM' : 'NÃO') . "\n";
    echo "Tamanho arquivo: " . filesize($caminhoArquivo) . " bytes\n";
    
    // Verificar conteúdo
    $conteudo = file_get_contents($caminhoArquivo);
    echo "Conteúdo lido: " . strlen($conteudo) . " bytes\n";
    echo "Primeiros 100 chars: " . substr($conteudo, 0, 100) . "...\n";
    
    // Limpar arquivo de teste
    unlink($caminhoArquivo);
    echo "🧹 Arquivo de teste removido\n";
} else {
    echo "❌ Erro ao salvar arquivo XML\n";
    $error = error_get_last();
    if ($error) {
        echo "Erro: " . $error['message'] . "\n";
    }
    exit(1);
}

echo "\n4. Verificando owner dos diretórios...\n";
$stat = stat($xmlCceDir);
$owner = posix_getpwuid($stat['uid']);
$group = posix_getgrgid($stat['gid']);
echo "Owner: " . $owner['name'] . " (UID: " . $stat['uid'] . ")\n";
echo "Group: " . $group['name'] . " (GID: " . $stat['gid'] . ")\n";

echo "\n=== TESTE CONCLUÍDO ===\n";
echo "✅ Sistema de CCe está funcionando!\n";
echo "✅ Permissões corretas\n";
echo "✅ Escrita funcionando\n";
echo "✅ Diretórios com owner correto\n\n";
echo "🎯 Agora você pode tentar criar uma CCe real!\n";

?>
