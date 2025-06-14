<?php
/**
 * ✅ GERADOR DE ESPELHO DANFE USANDO SPED-DA
 *
 * Este arquivo usa a biblioteca sped-da (mesma usada para NFe real)
 * para gerar um PDF de visualização/espelho dos dados do formulário.
 *
 * É um DANFE real mas marcado como ESPELHO para conferência.
 */

require_once __DIR__ . '/../vendor/autoload.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Tratar requisições OPTIONS (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Verificar se é POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['sucesso' => false, 'erro' => 'Método não permitido']);
    exit;
}

try {
    // Ler dados JSON da requisição
    $input = file_get_contents('php://input');
    $dados = json_decode($input, true);

    if (!$dados) {
        throw new Exception('Dados JSON inválidos');
    }

    // Validar dados obrigatórios
    if (!isset($dados['empresa_id']) || !isset($dados['dados_nfe'])) {
        throw new Exception('Dados obrigatórios não fornecidos (empresa_id, dados_nfe)');
    }

    $empresaId = $dados['empresa_id'];
    $dadosNfe = $dados['dados_nfe'];

    // Log de debug
    error_log("🎯 ESPELHO DANFE - Empresa ID: $empresaId");

    // Incluir configuração do Supabase
    require_once __DIR__ . '/../config/supabase.php';

    // Carregar dados da empresa
    $empresaQuery = $supabase->from('empresas')
        ->select('*')
        ->eq('id', $empresaId)
        ->single();

    if ($empresaQuery['error']) {
        throw new Exception('Empresa não encontrada: ' . $empresaQuery['error']['message']);
    }

    $empresa = $empresaQuery['data'];

    // Criar XML temporário para o espelho
    $xmlEspelho = criarXmlEspelho($empresa, $dadosNfe);

    // Verificar se a biblioteca sped-da está disponível
    if (!class_exists('\NFePHP\DA\NFe\Danfe')) {
        throw new Exception('Biblioteca sped-da não encontrada');
    }

    // Gerar DANFE usando a biblioteca sped-da
    $danfe = new \NFePHP\DA\NFe\Danfe($xmlEspelho);
    $danfe->debugMode(false);
    $danfe->creditsIntegratorFooter('⚠️ ESPELHO - DOCUMENTO NÃO VÁLIDO FISCALMENTE ⚠️');

    // Gerar PDF
    $pdfContent = $danfe->render();

    if (empty($pdfContent)) {
        throw new Exception('Erro ao gerar PDF do espelho');
    }

    // Gerar timestamp único
    $timestamp = date('YmdHis');
    $nomeArquivo = "espelho_danfe_{$empresaId}_{$timestamp}.pdf";

    // ✅ USAR ESTRUTURA ORGANIZADA COM AMBIENTE E MODELO
    $ambienteTexto = 'homologacao'; // padrão para espelhos
    $modelo = '55'; // NFe por padrão

    // Buscar configuração real da empresa para determinar ambiente
    try {
        $response = file_get_contents("http://localhost/backend/public/get-empresa-config.php?empresa_id={$empresaId}");
        $config = json_decode($response, true);
        if ($config && isset($config['data']['nfe_config']['ambiente'])) {
            $ambienteTexto = $config['data']['nfe_config']['ambiente'];
        }
        error_log("📄 ESPELHO - Ambiente determinado: {$ambienteTexto}");
    } catch (Exception $e) {
        error_log("⚠️ ESPELHO - Não foi possível determinar ambiente, usando homologação");
    }

    // Criar diretório se não existir
    $diretorio = "/root/nexo-pedidos/backend/storage/espelhos/{$empresaId}/{$ambienteTexto}/{$modelo}";
    if (!is_dir($diretorio)) {
        mkdir($diretorio, 0755, true);
        error_log("📁 ESPELHO - Diretório criado: {$diretorio}");
    }

    $caminhoArquivo = "{$diretorio}/{$nomeArquivo}";

    // Salvar PDF
    if (file_put_contents($caminhoArquivo, $pdfContent) === false) {
        throw new Exception('Erro ao salvar arquivo PDF');
    }

    // Retornar sucesso
    echo json_encode([
        'sucesso' => true,
        'arquivo' => $nomeArquivo,
        'caminho' => $caminhoArquivo,
        'url' => "/espelhos/{$empresaId}/{$nomeArquivo}",
        'tipo' => 'pdf',
        'tamanho' => strlen($pdfContent)
    ]);

} catch (Exception $e) {
    error_log("❌ ERRO ESPELHO DANFE: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'sucesso' => false,
        'erro' => $e->getMessage()
    ]);
}

/**
 * Criar XML temporário para gerar o espelho DANFE
 */
function criarXmlEspelho($empresa, $dadosNfe) {
    // Dados básicos da NFe
    $numero = $dadosNfe['numero_documento'] ?? '999999999';
    $serie = $dadosNfe['serie'] ?? '1';
    $dataEmissao = date('Y-m-d\TH:i:s-03:00');
    
    // Chave fictícia para espelho (não será enviada para SEFAZ)
    $chave = '99999999999999999999999999999999999999999999';
    
    // Destinatário
    $destinatario = $dadosNfe['destinatario'] ?? [];
    $cnpjDest = $destinatario['cnpj'] ?? '00000000000000';
    $nomeDest = $destinatario['razao_social'] ?? 'DESTINATÁRIO TESTE';
    
    // Produtos
    $produtos = $dadosNfe['produtos'] ?? [];
    $itensXml = '';
    $valorTotal = 0;
    
    foreach ($produtos as $index => $produto) {
        $valorItem = floatval($produto['valor_total'] ?? 0);
        $valorTotal += $valorItem;
        
        $itensXml .= "
        <det nItem=\"" . ($index + 1) . "\">
            <prod>
                <cProd>" . htmlspecialchars($produto['codigo'] ?? '') . "</cProd>
                <cEAN></cEAN>
                <xProd>" . htmlspecialchars($produto['descricao'] ?? '') . "</xProd>
                <NCM>" . htmlspecialchars($produto['ncm'] ?? '00000000') . "</NCM>
                <CFOP>" . htmlspecialchars($produto['cfop'] ?? '5102') . "</CFOP>
                <uCom>" . htmlspecialchars($produto['unidade'] ?? 'UN') . "</uCom>
                <qCom>" . number_format(floatval($produto['quantidade'] ?? 1), 4, '.', '') . "</qCom>
                <vUnCom>" . number_format(floatval($produto['valor_unitario'] ?? 0), 2, '.', '') . "</vUnCom>
                <vProd>" . number_format($valorItem, 2, '.', '') . "</vProd>
                <cEANTrib></cEANTrib>
                <uTrib>" . htmlspecialchars($produto['unidade'] ?? 'UN') . "</uTrib>
                <qTrib>" . number_format(floatval($produto['quantidade'] ?? 1), 4, '.', '') . "</qTrib>
                <vUnTrib>" . number_format(floatval($produto['valor_unitario'] ?? 0), 2, '.', '') . "</vUnTrib>
            </prod>
            <imposto>
                <ICMS>
                    <ICMS00>
                        <orig>0</orig>
                        <CST>00</CST>
                        <modBC>0</modBC>
                        <vBC>0.00</vBC>
                        <pICMS>0.00</pICMS>
                        <vICMS>0.00</vICMS>
                    </ICMS00>
                </ICMS>
            </imposto>
        </det>";
    }
    
    // XML completo do espelho
    $xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>
    <nfeProc xmlns=\"http://www.portalfiscal.inf.br/nfe\" versao=\"4.00\">
        <NFe xmlns=\"http://www.portalfiscal.inf.br/nfe\">
            <infNFe Id=\"NFe{$chave}\" versao=\"4.00\">
                <ide>
                    <cUF>35</cUF>
                    <cNF>99999999</cNF>
                    <natOp>" . htmlspecialchars($dadosNfe['natureza_operacao'] ?? 'VENDA') . "</natOp>
                    <mod>55</mod>
                    <serie>{$serie}</serie>
                    <nNF>{$numero}</nNF>
                    <dhEmi>{$dataEmissao}</dhEmi>
                    <tpNF>1</tpNF>
                    <idDest>1</idDest>
                    <cMunFG>3550308</cMunFG>
                    <tpImp>1</tpImp>
                    <tpEmis>1</tpEmis>
                    <cDV>9</cDV>
                    <tpAmb>2</tpAmb>
                    <finNFe>1</finNFe>
                    <indFinal>1</indFinal>
                    <indPres>1</indPres>
                </ide>
                <emit>
                    <CNPJ>" . preg_replace('/\D/', '', $empresa['cnpj'] ?? '') . "</CNPJ>
                    <xNome>" . htmlspecialchars($empresa['razao_social'] ?? '') . "</xNome>
                    <xFant>" . htmlspecialchars($empresa['nome_fantasia'] ?? '') . "</xFant>
                    <enderEmit>
                        <xLgr>" . htmlspecialchars($empresa['endereco'] ?? '') . "</xLgr>
                        <nro>" . htmlspecialchars($empresa['numero'] ?? '') . "</nro>
                        <xBairro>" . htmlspecialchars($empresa['bairro'] ?? '') . "</xBairro>
                        <cMun>3550308</cMun>
                        <xMun>" . htmlspecialchars($empresa['cidade'] ?? '') . "</xMun>
                        <UF>" . htmlspecialchars($empresa['uf'] ?? '') . "</UF>
                        <CEP>" . preg_replace('/\D/', '', $empresa['cep'] ?? '') . "</CEP>
                        <cPais>1058</cPais>
                        <xPais>Brasil</xPais>
                    </enderEmit>
                    <IE>" . preg_replace('/\D/', '', $empresa['inscricao_estadual'] ?? '') . "</IE>
                    <CRT>1</CRT>
                </emit>
                <dest>
                    <CNPJ>{$cnpjDest}</CNPJ>
                    <xNome>{$nomeDest}</xNome>
                    <enderDest>
                        <xLgr>RUA TESTE</xLgr>
                        <nro>123</nro>
                        <xBairro>CENTRO</xBairro>
                        <cMun>3550308</cMun>
                        <xMun>SAO PAULO</xMun>
                        <UF>SP</UF>
                        <CEP>01000000</CEP>
                        <cPais>1058</cPais>
                        <xPais>Brasil</xPais>
                    </enderDest>
                    <indIEDest>9</indIEDest>
                </dest>
                {$itensXml}
                <total>
                    <ICMSTot>
                        <vBC>0.00</vBC>
                        <vICMS>0.00</vICMS>
                        <vICMSDeson>0.00</vICMSDeson>
                        <vFCP>0.00</vFCP>
                        <vBCST>0.00</vBCST>
                        <vST>0.00</vST>
                        <vFCPST>0.00</vFCPST>
                        <vFCPSTRet>0.00</vFCPSTRet>
                        <vProd>" . number_format($valorTotal, 2, '.', '') . "</vProd>
                        <vFrete>0.00</vFrete>
                        <vSeg>0.00</vSeg>
                        <vDesc>0.00</vDesc>
                        <vII>0.00</vII>
                        <vIPI>0.00</vIPI>
                        <vIPIDevol>0.00</vIPIDevol>
                        <vPIS>0.00</vPIS>
                        <vCOFINS>0.00</vCOFINS>
                        <vOutro>0.00</vOutro>
                        <vNF>" . number_format($valorTotal, 2, '.', '') . "</vNF>
                    </ICMSTot>
                </total>
                <transp>
                    <modFrete>9</modFrete>
                </transp>
                <infAdic>
                    <infCpl>⚠️ ESPELHO - DOCUMENTO NÃO VÁLIDO FISCALMENTE ⚠️</infCpl>
                </infAdic>
            </infNFe>
        </NFe>
        <protNFe versao=\"4.00\">
            <infProt>
                <tpAmb>2</tpAmb>
                <verAplic>SP_NFE_PL_009_V4</verAplic>
                <chNFe>{$chave}</chNFe>
                <dhRecbto>{$dataEmissao}</dhRecbto>
                <nProt>999999999999999</nProt>
                <digVal>ESPELHO</digVal>
                <cStat>100</cStat>
                <xMotivo>Autorizado o uso da NFe</xMotivo>
            </infProt>
        </protNFe>
    </nfeProc>";
    
    return $xml;
}
?>
