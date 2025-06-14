<?php
/**
 * Endpoint para gerar PDF da Carta de Correção Eletrônica (CCe)
 * 
 * ESTRUTURA ORGANIZADA COM MODELO:
 * - XML: backend/storage/xml/empresa_id/{ambiente}/55/CCe/2025/06/chave_cce_001.xml
 * - PDF: backend/storage/pdf/empresa_id/{ambiente}/55/CCe/2025/06/chave_cce_001.pdf
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../vendor/autoload.php';
use NFePHP\DA\NFe\Daevento;

try {
    
    // 1. Validar método HTTP
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método não permitido. Use POST.');
    }
    
    // 2. Receber e validar dados JSON
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Dados JSON inválidos');
    }
    
    // 3. Validar parâmetros obrigatórios
    $chave = $input['chave'] ?? null;
    $empresaId = $input['empresa_id'] ?? null;
    $sequencia = $input['sequencia'] ?? 1;
    
    // 4. Validações específicas
    if (!$chave || strlen($chave) !== 44) {
        throw new Exception('Chave NFe inválida');
    }
    
    if (!$empresaId) {
        throw new Exception('empresa_id é obrigatório');
    }
    
    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $empresaId)) {
        throw new Exception('empresa_id inválido');
    }
    
    if (!is_numeric($sequencia) || $sequencia < 1 || $sequencia > 20) {
        throw new Exception('Sequência deve ser um número entre 1 e 20');
    }
    
    error_log("📄 PDF CCe - Chave: {$chave}, Empresa: {$empresaId}, Sequência: {$sequencia}");
    
    // 5. Buscar XMLs da CCe (evento original + resposta SEFAZ)
    $xmlCceDir = "../storage/xml/empresa_{$empresaId}/CCe";
    $nomeArquivoEvento = $chave . '_cce_' . str_pad($sequencia, 3, '0', STR_PAD_LEFT) . '_evento.xml';
    $nomeArquivoResposta = $chave . '_cce_' . str_pad($sequencia, 3, '0', STR_PAD_LEFT) . '_resposta.xml';
    $xmlEventoEncontrado = null;
    $xmlRespostaEncontrado = null;
    
    // Função para buscar XML recursivamente
    function buscarXMLCce($dir, $nomeArquivo) {
        if (!is_dir($dir)) {
            return null;
        }
        
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS)
        );
        
        foreach ($iterator as $file) {
            if ($file->isFile() && $file->getFilename() === $nomeArquivo) {
                return $file->getPathname();
            }
        }
        
        return null;
    }
    
    // Buscar XMLs do evento e resposta
    $xmlEventoEncontrado = buscarXMLCce($xmlCceDir, $nomeArquivoEvento);
    $xmlRespostaEncontrado = buscarXMLCce($xmlCceDir, $nomeArquivoResposta);

    if (!$xmlEventoEncontrado || !file_exists($xmlEventoEncontrado)) {
        throw new Exception("XML do evento CCe não encontrado: {$nomeArquivoEvento}");
    }
    if (!$xmlRespostaEncontrado || !file_exists($xmlRespostaEncontrado)) {
        throw new Exception("XML da resposta CCe não encontrado: {$nomeArquivoResposta}");
    }

    error_log("📄 PDF CCe - XML evento encontrado: {$xmlEventoEncontrado}");
    error_log("📄 PDF CCe - XML resposta encontrado: {$xmlRespostaEncontrado}");

    // 6. Ler conteúdos dos XMLs
    $xmlEventoContent = file_get_contents($xmlEventoEncontrado);
    $xmlRespostaContent = file_get_contents($xmlRespostaEncontrado);

    if (!$xmlEventoContent) {
        throw new Exception('Erro ao ler XML do evento CCe');
    }
    if (!$xmlRespostaContent) {
        throw new Exception('Erro ao ler XML da resposta CCe');
    }

    // ✅ CRIAR XML procEventoNFe CONFORME DOCUMENTAÇÃO DA BIBLIOTECA
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
            error_log("📄 PDF CCe - procEventoNFe criado com sucesso: " . strlen($xmlFinal) . " bytes");

            return $xmlFinal;

        } catch (Exception $e) {
            error_log("❌ Erro ao criar procEventoNFe: " . $e->getMessage());
            throw new Exception('Erro ao criar XML procEventoNFe: ' . $e->getMessage());
        }
    }

    // Criar XML no formato correto para a biblioteca Daevento
    $xmlContent = criarProcEventoNFe($xmlEventoContent, $xmlRespostaContent);
    
    // 7. Buscar XML da NFe original (necessário para o DACE)
    $xmlNfeDir = "../storage/xml/empresa_{$empresaId}/Autorizados";
    $nomeArquivoNfe = $chave . '.xml';
    
    function buscarXMLNfe($dir, $nomeArquivo) {
        if (!is_dir($dir)) {
            return null;
        }
        
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS)
        );
        
        foreach ($iterator as $file) {
            if ($file->isFile() && $file->getFilename() === $nomeArquivo) {
                return $file->getPathname();
            }
        }
        
        return null;
    }
    
    $xmlNfeEncontrado = buscarXMLNfe($xmlNfeDir, $nomeArquivoNfe);
    
    if (!$xmlNfeEncontrado || !file_exists($xmlNfeEncontrado)) {
        throw new Exception('XML da NFe original não encontrado');
    }
    
    $xmlNfeContent = file_get_contents($xmlNfeEncontrado);
    
    if (!$xmlNfeContent) {
        throw new Exception('Erro ao ler XML da NFe original');
    }
    
    error_log("📄 PDF CCe - XML NFe original encontrado: {$xmlNfeEncontrado}");

    // 8. Extrair dados REAIS do emitente do XML da NFe (LEI DOS DADOS REAIS)
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

            error_log("📄 PDF CCe - Dados emitente extraídos: " . $dados['razao'] . " - " . $dados['municipio'] . "/" . $dados['UF']);
            return $dados;

        } catch (Exception $e) {
            error_log("❌ Erro ao extrair dados do emitente: " . $e->getMessage());
            throw new Exception('Erro ao extrair dados do emitente do XML da NFe: ' . $e->getMessage());
        }
    }

    // Extrair dados reais do emitente
    $dadosEmitente = extrairDadosEmitente($xmlNfeContent);

    // 9. Gerar PDF da CCe usando método nativo da biblioteca
    error_log("📄 PDF CCe - Criando instância Daevento...");

    try {
        $daevento = new Daevento($xmlContent, $dadosEmitente);
        error_log("📄 PDF CCe - Instância Daevento criada com sucesso");

        $daevento->debugMode(true); // Ativar debug para ver mais detalhes
        error_log("📄 PDF CCe - Debug mode ativado");

        $daevento->creditsIntegratorFooter('Sistema Nexo PDV');
        error_log("📄 PDF CCe - Footer configurado");

        // 10. Configurações opcionais do Daevento
        if (isset($input['logo_path']) && file_exists($input['logo_path'])) {
            $daevento->logoParameters($input['logo_path'], 'C', true);
            error_log("📄 PDF CCe - Logo configurado");
        }

        // 11. Gerar PDF
        error_log("📄 PDF CCe - Iniciando render...");
        $pdfContent = $daevento->render();
        error_log("📄 PDF CCe - Render concluído - " . strlen($pdfContent) . " bytes");

    } catch (Exception $e) {
        error_log("❌ ERRO Daevento Exception: " . $e->getMessage());
        error_log("❌ ERRO Daevento File: " . $e->getFile());
        error_log("❌ ERRO Daevento Line: " . $e->getLine());
        throw $e;
    } catch (Error $e) {
        error_log("❌ ERRO FATAL Daevento: " . $e->getMessage());
        error_log("❌ ERRO FATAL File: " . $e->getFile());
        error_log("❌ ERRO FATAL Line: " . $e->getLine());
        throw new Exception('Erro fatal na biblioteca Daevento: ' . $e->getMessage());
    }
    
    if (!$pdfContent) {
        throw new Exception('Erro ao gerar PDF da Carta de Correção');
    }

    error_log("📄 PDF CCe - PDF gerado com sucesso - " . strlen($pdfContent) . " bytes");

    // 12. Salvar PDF na estrutura organizada COM AMBIENTE
    // Buscar ambiente da empresa
    $configData = json_decode(file_get_contents("php://input"), true);
    $ambienteTexto = 'homologacao'; // padrão

    // Buscar configuração real da empresa para determinar ambiente
    try {
        $response = file_get_contents("http://localhost/backend/public/get-empresa-config.php?empresa_id={$empresaId}");
        $config = json_decode($response, true);
        if ($config && isset($config['data']['nfe_config']['ambiente'])) {
            $ambienteTexto = $config['data']['nfe_config']['ambiente'];
        }
    } catch (Exception $e) {
        error_log("Aviso: Não foi possível determinar ambiente, usando homologação");
    }

    // 🔥 NOVA ESTRUTURA COM MODELO DE DOCUMENTO
    $modelo = '55'; // NFe por padrão, futuramente será dinâmico para NFCe
    $pdfCceDir = "../storage/pdf/empresa_{$empresaId}/{$ambienteTexto}/{$modelo}/CCe/" . date('Y/m');
    if (!is_dir($pdfCceDir)) {
        mkdir($pdfCceDir, 0755, true);
        error_log("📁 PDF CCe - Diretório criado: {$pdfCceDir}");
    }
    
    $nomeArquivoPdf = $chave . '_cce_' . str_pad($sequencia, 3, '0', STR_PAD_LEFT) . '.pdf';
    $pdfPath = "{$pdfCceDir}/{$nomeArquivoPdf}";
    $result = file_put_contents($pdfPath, $pdfContent);
    
    if ($result === false) {
        throw new Exception('Falha ao salvar arquivo PDF da CCe');
    }
    
    // 13. Verificar se arquivo foi salvo corretamente
    if (!file_exists($pdfPath) || filesize($pdfPath) < 1000) {
        throw new Exception('PDF da CCe salvo mas arquivo inválido ou muito pequeno');
    }

    error_log("📄 PDF CCe - PDF salvo com sucesso em: {$pdfPath}");
    error_log("📄 PDF CCe - Tamanho do arquivo: " . filesize($pdfPath) . " bytes");

    // 14. Retornar sucesso
    echo json_encode([
        'success' => true,
        'message' => 'PDF da Carta de Correção gerado com sucesso',
        'data' => [
            'chave' => $chave,
            'sequencia' => $sequencia,
            'pdf_path' => $pdfPath,
            'pdf_nome' => $nomeArquivoPdf,
            'tamanho' => filesize($pdfPath),
            'url_download' => "/backend/public/download-arquivo.php?type=pdf_cce&chave={$chave}&empresa_id={$empresaId}&sequencia={$sequencia}",
            'url_visualizar' => "/backend/public/download-arquivo.php?type=pdf_cce&chave={$chave}&empresa_id={$empresaId}&sequencia={$sequencia}&action=view"
        ]
    ]);
    
} catch (Exception $e) {
    error_log("❌ ERRO PDF CCe: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
