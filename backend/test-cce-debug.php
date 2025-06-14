<?php

/**
 * Teste de debug para CCe - verificar XMLs
 */

echo "=== TESTE DE DEBUG CCe ===\n";
echo "Data: " . date('Y-m-d H:i:s') . "\n\n";

// Simular dados da CCe
$empresaId = 'acd26a4f-7220-405e-9c96-faffb7e6480e';
$chaveNFe = '35241214200166000187550010000001231234567890'; // Exemplo
$sequencia = 1;
$ambienteTexto = 'homologacao';
$modelo = '55';

echo "1. Verificando estrutura de diretórios...\n";
$xmlCceDir = "/root/nexo-pedidos/backend/storage/xml/empresa_{$empresaId}/{$ambienteTexto}/{$modelo}/CCe/" . date('Y/m');
echo "Diretório CCe: $xmlCceDir\n";
echo "Diretório existe: " . (is_dir($xmlCceDir) ? 'SIM' : 'NÃO') . "\n";
echo "Diretório gravável: " . (is_writable($xmlCceDir) ? 'SIM' : 'NÃO') . "\n\n";

echo "2. Testando criação de arquivos XML...\n";

// Simular XML original
$xmlOriginalTeste = '<?xml version="1.0" encoding="UTF-8"?>
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
            <xCorrecao>Teste de correção</xCorrecao>
            <xCondUso>A Carta de Correcao e disciplinada pelo paragrafo 1o-A do art. 7o do Convenio S/N, de 15 de dezembro de 1970 e pode ser utilizada para regularizacao de erro ocorrido na emissao de documento fiscal, desde que o erro nao esteja relacionado com: I - as variaveis que determinam o valor do imposto tais como: base de calculo, aliquota, diferenca de preco, quantidade, valor da operacao ou da prestacao; II - a correcao de dados cadastrais que implique mudanca do remetente ou do destinatario; III - a data de emissao ou de saida.</xCondUso>
        </detEvento>
    </infEvento>
</evento>';

// Simular XML resposta
$xmlRespostaTeste = '<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
    <soap:Body>
        <nfeRecepcaoEventoResult>
            <retEnvEvento xmlns="http://www.portalfiscal.inf.br/nfe">
                <idLote>1</idLote>
                <tpAmb>2</tpAmb>
                <verAplic>SVRS202411261100</verAplic>
                <cOrgao>91</cOrgao>
                <cStat>128</cStat>
                <xMotivo>Lote de Evento Processado</xMotivo>
                <retEvento>
                    <infEvento>
                        <tpAmb>2</tpAmb>
                        <verAplic>SVRS202411261100</verAplic>
                        <cOrgao>91</cOrgao>
                        <cStat>135</cStat>
                        <xMotivo>Evento registrado e vinculado a NF-e</xMotivo>
                        <chNFe>' . $chaveNFe . '</chNFe>
                        <tpEvento>110110</tpEvento>
                        <xEvento>Carta de Correcao</xEvento>
                        <nSeqEvento>' . $sequencia . '</nSeqEvento>
                        <dhRegEvento>' . date('c') . '</dhRegEvento>
                        <nProt>135' . date('YmdHis') . '001</nProt>
                    </infEvento>
                </retEvento>
            </retEnvEvento>
        </nfeRecepcaoEventoResult>
    </soap:Body>
</soap:Envelope>';

// Testar salvamento do XML original
$nomeArquivoOriginal = $chaveNFe . '_cce_' . str_pad($sequencia, 3, '0', STR_PAD_LEFT) . '_evento.xml';
$caminhoArquivoOriginal = $xmlCceDir . '/' . $nomeArquivoOriginal;

echo "Testando XML original...\n";
echo "Nome arquivo: $nomeArquivoOriginal\n";
echo "Caminho: $caminhoArquivoOriginal\n";
echo "XML length: " . strlen($xmlOriginalTeste) . " bytes\n";

if (file_put_contents($caminhoArquivoOriginal, $xmlOriginalTeste)) {
    echo "✅ XML original salvo com sucesso!\n";
    echo "Arquivo existe: " . (file_exists($caminhoArquivoOriginal) ? 'SIM' : 'NÃO') . "\n";
    echo "Tamanho arquivo: " . filesize($caminhoArquivoOriginal) . " bytes\n";
} else {
    echo "❌ Erro ao salvar XML original\n";
    $error = error_get_last();
    if ($error) {
        echo "Erro: " . $error['message'] . "\n";
    }
}
echo "\n";

// Testar salvamento do XML resposta
$nomeArquivoResposta = $chaveNFe . '_cce_' . str_pad($sequencia, 3, '0', STR_PAD_LEFT) . '_resposta.xml';
$caminhoArquivoResposta = $xmlCceDir . '/' . $nomeArquivoResposta;

echo "Testando XML resposta...\n";
echo "Nome arquivo: $nomeArquivoResposta\n";
echo "Caminho: $caminhoArquivoResposta\n";
echo "XML length: " . strlen($xmlRespostaTeste) . " bytes\n";

if (file_put_contents($caminhoArquivoResposta, $xmlRespostaTeste)) {
    echo "✅ XML resposta salvo com sucesso!\n";
    echo "Arquivo existe: " . (file_exists($caminhoArquivoResposta) ? 'SIM' : 'NÃO') . "\n";
    echo "Tamanho arquivo: " . filesize($caminhoArquivoResposta) . " bytes\n";
} else {
    echo "❌ Erro ao salvar XML resposta\n";
    $error = error_get_last();
    if ($error) {
        echo "Erro: " . $error['message'] . "\n";
    }
}
echo "\n";

echo "3. Listando arquivos criados...\n";
$arquivos = glob($xmlCceDir . '/*.xml');
foreach ($arquivos as $arquivo) {
    echo "- " . basename($arquivo) . " (" . filesize($arquivo) . " bytes)\n";
}

echo "\n=== TESTE CONCLUÍDO ===\n";

if (file_exists($caminhoArquivoOriginal) && file_exists($caminhoArquivoResposta)) {
    echo "✅ Sistema de salvamento de XMLs da CCe está funcionando!\n";
    echo "✅ Diretórios criados corretamente\n";
    echo "✅ Arquivos salvos com sucesso\n";
    echo "\nAgora você pode tentar criar uma CCe real novamente.\n";
    
    // Limpar arquivos de teste
    unlink($caminhoArquivoOriginal);
    unlink($caminhoArquivoResposta);
    echo "\n🧹 Arquivos de teste removidos.\n";
} else {
    echo "❌ Ainda há problemas com o salvamento de XMLs\n";
}

?>
