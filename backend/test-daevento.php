<?php

/**
 * Teste específico para a biblioteca Daevento
 */

require_once __DIR__ . '/vendor/autoload.php';
use NFePHP\DA\NFe\Daevento;

echo "=== TESTE BIBLIOTECA DAEVENTO ===\n";
echo "Data: " . date('Y-m-d H:i:s') . "\n\n";

try {
    // Dados de teste
    $chave = '35250624163237000151550010000000351589707164';
    $empresaId = 'acd26a4f-7220-405e-9c96-faffb7e6480e';
    $sequencia = 2;
    $ambienteTexto = 'homologacao';
    $modelo = '55';

    echo "1. Carregando XMLs...\n";
    
    // Caminhos dos XMLs
    $xmlEventoPath = "/root/nexo-pedidos/backend/storage/xml/empresa_{$empresaId}/{$ambienteTexto}/{$modelo}/CCe/2025/06/{$chave}_cce_002_evento.xml";
    $xmlRespostaPath = "/root/nexo-pedidos/backend/storage/xml/empresa_{$empresaId}/{$ambienteTexto}/{$modelo}/CCe/2025/06/{$chave}_cce_002_resposta.xml";
    $xmlNfePath = "/root/nexo-pedidos/backend/storage/xml/empresa_{$empresaId}/{$ambienteTexto}/{$modelo}/Autorizados/2025/06/{$chave}.xml";

    echo "XML Evento: $xmlEventoPath\n";
    echo "XML Resposta: $xmlRespostaPath\n";
    echo "XML NFe: $xmlNfePath\n\n";

    // Verificar se arquivos existem
    if (!file_exists($xmlEventoPath)) {
        throw new Exception("XML evento não encontrado: $xmlEventoPath");
    }
    if (!file_exists($xmlRespostaPath)) {
        throw new Exception("XML resposta não encontrado: $xmlRespostaPath");
    }
    if (!file_exists($xmlNfePath)) {
        throw new Exception("XML NFe não encontrado: $xmlNfePath");
    }

    echo "✅ Todos os arquivos XML existem\n\n";

    // Ler conteúdos
    $xmlEventoContent = file_get_contents($xmlEventoPath);
    $xmlRespostaContent = file_get_contents($xmlRespostaPath);
    $xmlNfeContent = file_get_contents($xmlNfePath);

    echo "2. Conteúdos lidos:\n";
    echo "Evento: " . strlen($xmlEventoContent) . " bytes\n";
    echo "Resposta: " . strlen($xmlRespostaContent) . " bytes\n";
    echo "NFe: " . strlen($xmlNfeContent) . " bytes\n\n";

    // Função para criar procEventoNFe
    function criarProcEventoNFe($xmlEvento, $xmlResposta) {
        try {
            // Carregar XMLs
            $domEvento = new DOMDocument();
            $domEvento->loadXML($xmlEvento);

            $domResposta = new DOMDocument();
            $domResposta->loadXML($xmlResposta);

            // Extrair elementos necessários
            $evento = $domEvento->getElementsByTagName('evento')->item(0);
            $retEvento = $domResposta->getElementsByTagName('retEvento')->item(0);

            if (!$evento) {
                throw new Exception('Elemento evento não encontrado no XML do evento');
            }
            if (!$retEvento) {
                throw new Exception('Elemento retEvento não encontrado no XML da resposta');
            }

            // Criar XML procEventoNFe conforme biblioteca espera
            $procEventoNFe = new DOMDocument('1.0', 'UTF-8');
            $procEventoNFe->formatOutput = true;

            // Elemento raiz procEventoNFe
            $root = $procEventoNFe->createElement('procEventoNFe');
            $root->setAttribute('versao', '1.00');
            $root->setAttribute('xmlns', 'http://www.portalfiscal.inf.br/nfe');
            $procEventoNFe->appendChild($root);

            // Importar evento
            $eventoImportado = $procEventoNFe->importNode($evento, true);
            $root->appendChild($eventoImportado);

            // Importar retEvento
            $retEventoImportado = $procEventoNFe->importNode($retEvento, true);
            $root->appendChild($retEventoImportado);

            $xmlFinal = $procEventoNFe->saveXML();
            echo "✅ procEventoNFe criado: " . strlen($xmlFinal) . " bytes\n";

            return $xmlFinal;

        } catch (Exception $e) {
            throw new Exception('Erro ao criar XML procEventoNFe: ' . $e->getMessage());
        }
    }

    echo "3. Criando procEventoNFe...\n";
    $xmlContent = criarProcEventoNFe($xmlEventoContent, $xmlRespostaContent);

    // Extrair dados do emitente
    function extrairDadosEmitente($xmlNfeContent) {
        try {
            $dom = new DOMDocument();
            $dom->loadXML($xmlNfeContent);

            // Buscar elemento emit (emitente)
            $emit = $dom->getElementsByTagName('emit')->item(0);
            if (!$emit) {
                throw new Exception('Elemento emit não encontrado no XML da NFe');
            }

            // Extrair dados reais do emitente
            $dados = [
                'razao' => $emit->getElementsByTagName('xNome')->item(0)->nodeValue ?? '',
                'logradouro' => $emit->getElementsByTagName('xLgr')->item(0)->nodeValue ?? '',
                'numero' => $emit->getElementsByTagName('nro')->item(0)->nodeValue ?? '',
                'complemento' => $emit->getElementsByTagName('xCpl')->item(0)->nodeValue ?? '',
                'bairro' => $emit->getElementsByTagName('xBairro')->item(0)->nodeValue ?? '',
                'CEP' => $emit->getElementsByTagName('CEP')->item(0)->nodeValue ?? '',
                'municipio' => $emit->getElementsByTagName('xMun')->item(0)->nodeValue ?? '',
                'UF' => $emit->getElementsByTagName('UF')->item(0)->nodeValue ?? '',
                'telefone' => $emit->getElementsByTagName('fone')->item(0)->nodeValue ?? '',
                'email' => $emit->getElementsByTagName('email')->item(0)->nodeValue ?? ''
            ];

            echo "✅ Dados emitente extraídos: " . $dados['razao'] . "\n";
            return $dados;

        } catch (Exception $e) {
            throw new Exception('Erro ao extrair dados do emitente: ' . $e->getMessage());
        }
    }

    echo "4. Extraindo dados do emitente...\n";
    $dadosEmitente = extrairDadosEmitente($xmlNfeContent);

    echo "5. Testando Daevento...\n";
    
    // Criar instância Daevento
    $daevento = new Daevento($xmlContent, $dadosEmitente);
    echo "✅ Instância Daevento criada\n";

    $daevento->debugMode(true);
    echo "✅ Debug mode ativado\n";

    $daevento->creditsIntegratorFooter('Sistema Nexo PDV');
    echo "✅ Footer configurado\n";

    echo "6. Gerando PDF...\n";
    $pdfContent = $daevento->render();
    echo "✅ PDF gerado: " . strlen($pdfContent) . " bytes\n";

    if (strlen($pdfContent) > 1000) {
        echo "✅ PDF parece válido (tamanho adequado)\n";
        
        // Salvar PDF de teste
        $pdfTestPath = "/tmp/teste_cce.pdf";
        file_put_contents($pdfTestPath, $pdfContent);
        echo "✅ PDF salvo em: $pdfTestPath\n";
        echo "✅ Tamanho arquivo: " . filesize($pdfTestPath) . " bytes\n";
    } else {
        echo "❌ PDF muito pequeno, pode estar inválido\n";
    }

    echo "\n=== TESTE CONCLUÍDO COM SUCESSO ===\n";
    echo "✅ Biblioteca Daevento funcionando\n";
    echo "✅ PDF da CCe pode ser gerado\n";

} catch (Exception $e) {
    echo "❌ ERRO: " . $e->getMessage() . "\n";
    echo "Arquivo: " . $e->getFile() . "\n";
    echo "Linha: " . $e->getLine() . "\n";
} catch (Error $e) {
    echo "❌ ERRO FATAL: " . $e->getMessage() . "\n";
    echo "Arquivo: " . $e->getFile() . "\n";
    echo "Linha: " . $e->getLine() . "\n";
}

?>
