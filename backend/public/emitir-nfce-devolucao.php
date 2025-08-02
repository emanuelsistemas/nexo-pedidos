<?php
/**
 * Endpoint para emissão de NFC-e de DEVOLUÇÃO (Modelo 65)
 * 
 * DIFERENÇAS DA NFC-e NORMAL:
 * - CFOP fixo 5202 (Devolução de venda de mercadoria)
 * - Tag de referência à NFC-e original
 * - Natureza da operação específica para devolução
 * - Validações específicas para devolução
 */

// SISTEMA DE LOGS DETALHADOS
ini_set('memory_limit', '512M');
ini_set('max_execution_time', 300);
ini_set('log_errors', 1);
ini_set('error_log', '/tmp/nfce_devolucao_debug.log');

function logDetalhado($step, $message, $data = null) {
    $timestamp = date('Y-m-d H:i:s.u');
    $logEntry = "[{$timestamp}] DEVOLUCAO_STEP_{$step}: {$message}";
    if ($data !== null) {
        $logEntry .= " | DATA: " . json_encode($data, JSON_UNESCAPED_UNICODE);
    }

    error_log($logEntry);

    try {
        $logDir = dirname('/tmp/nfce_devolucao_detailed.log');
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        file_put_contents('/tmp/nfce_devolucao_detailed.log', $logEntry . "\n", FILE_APPEND | LOCK_EX);
    } catch (Exception $logError) {
        error_log("ERRO: Exceção ao escrever log detalhado: " . $logError->getMessage());
    }
}

// Headers CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['erro' => true, 'mensagem' => 'Método não permitido']);
    exit;
}

try {
    logDetalhado('INICIO', 'Iniciando emissão de NFC-e de devolução');

    // Receber dados
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data) {
        throw new Exception('Dados JSON inválidos');
    }

    logDetalhado('DADOS_RECEBIDOS', 'Dados recebidos para processamento', [
        'empresa_id' => $data['empresa_id'] ?? 'não informado',
        'chave_original' => $data['nfce_data']['chave_nfe_original'] ?? 'não informado',
        'qtd_itens' => count($data['nfce_data']['itens'] ?? [])
    ]);

    $empresaId = $data['empresa_id'] ?? null;
    $nfceData = $data['nfce_data'] ?? null;

    if (!$empresaId || !$nfceData) {
        throw new Exception('Dados obrigatórios não informados');
    }

    // Validações específicas para devolução
    if (!isset($nfceData['chave_nfe_original'])) {
        throw new Exception('Chave da NFC-e original é obrigatória para devolução');
    }

    if (!isset($nfceData['tipo_operacao']) || $nfceData['tipo_operacao'] !== 'devolucao') {
        throw new Exception('Tipo de operação deve ser "devolucao"');
    }

    if (!isset($nfceData['cfop_devolucao']) || $nfceData['cfop_devolucao'] !== '5202') {
        throw new Exception('CFOP deve ser 5202 para devolução');
    }

    logDetalhado('VALIDACAO_INICIAL', 'Validações iniciais concluídas');

    // Incluir bibliotecas necessárias
    require_once __DIR__ . '/../vendor/autoload.php';
    require_once __DIR__ . '/../config/database.php';

    // Buscar configurações da empresa (reutilizar função existente)
    $supabaseUrl = 'https://xsrirnfwsjeovekwtluz.supabase.co';
    $supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcmlybmZ3c2plb3Zla3d0bHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NjQ5OTcsImV4cCI6MjA2MjI0MDk5N30.SrIEj_akvD9x-tltfpV3K4hQSKtPjJ_tQ4FFhPwiIy4';

    // Buscar dados da empresa
    $url = $supabaseUrl . "/rest/v1/empresas?id=eq.{$empresaId}&select=*";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'apikey: ' . $supabaseKey,
        'Authorization: Bearer ' . $supabaseKey,
        'Content-Type: application/json'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || !$response) {
        throw new Exception('Erro ao buscar dados da empresa');
    }

    $empresaData = json_decode($response, true);
    if (empty($empresaData)) {
        throw new Exception('Empresa não encontrada');
    }

    $empresa = $empresaData[0];
    logDetalhado('EMPRESA_CARREGADA', 'Dados da empresa carregados', [
        'razao_social' => $empresa['razao_social'],
        'cnpj' => $empresa['cnpj']
    ]);

    // Buscar configuração NFe
    $url = $supabaseUrl . "/rest/v1/nfe_config?empresa_id=eq.{$empresaId}&select=*";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'apikey: ' . $supabaseKey,
        'Authorization: Bearer ' . $supabaseKey,
        'Content-Type: application/json'
    ]);
    
    $response = curl_exec($ch);
    curl_close($ch);

    $nfeConfigData = json_decode($response, true);
    if (empty($nfeConfigData)) {
        throw new Exception('Configuração NFe não encontrada');
    }

    $nfeConfig = $nfeConfigData[0];
    logDetalhado('NFE_CONFIG_CARREGADA', 'Configuração NFe carregada', [
        'ambiente' => $nfeConfig['ambiente'],
        'serie' => $nfeConfig['serie_nfce']
    ]);

    // Buscar próximo número da série
    $url = $supabaseUrl . "/rest/v1/nfce_numeracao?empresa_id=eq.{$empresaId}&serie=eq.{$nfeConfig['serie_nfce']}&select=*";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'apikey: ' . $supabaseKey,
        'Authorization: Bearer ' . $supabaseKey,
        'Content-Type: application/json'
    ]);
    
    $response = curl_exec($ch);
    $numeracaoData = json_decode($response, true);
    
    $proximoNumero = 1;
    if (!empty($numeracaoData)) {
        $proximoNumero = $numeracaoData[0]['proximo_numero'];
    }

    logDetalhado('NUMERO_SERIE', 'Próximo número da série obtido', [
        'serie' => $nfeConfig['serie_nfce'],
        'proximo_numero' => $proximoNumero
    ]);

    // Configurar NFePHP
    $configPath = __DIR__ . '/../config/nfe_config.json';
    if (!file_exists($configPath)) {
        throw new Exception('Arquivo de configuração NFe não encontrado');
    }

    $config = json_decode(file_get_contents($configPath), true);
    
    // Ajustar configuração para o ambiente
    $config['tpAmb'] = ($nfeConfig['ambiente'] === 'producao') ? 1 : 2;
    $config['razaosocial'] = $empresa['razao_social'];
    $config['cnpj'] = $empresa['cnpj'];
    $config['siglaUF'] = $empresa['uf'];
    $config['municipio'] = $empresa['cidade'];

    logDetalhado('CONFIG_NFEPHP', 'Configuração NFePHP preparada');

    // Inicializar NFePHP Tools
    use NFePHP\NFe\Tools;
    use NFePHP\NFe\Make;
    use NFePHP\Common\Certificate;

    $certificadoPath = __DIR__ . '/../certificates/' . $empresaId . '.pfx';
    if (!file_exists($certificadoPath)) {
        throw new Exception('Certificado digital não encontrado');
    }

    $certificadoContent = file_get_contents($certificadoPath);
    $certificate = Certificate::readPfx($certificadoContent, $nfeConfig['senha_certificado']);
    
    $tools = new Tools(json_encode($config), $certificate);
    $tools->model('65'); // NFC-e

    logDetalhado('TOOLS_INICIALIZADO', 'NFePHP Tools inicializado');

    // Preparar dados específicos para devolução
    $make = new Make();
    
    // Identificação da NFC-e de devolução
    $std = new stdClass();
    $std->versao = '4.00';
    $std->Id = null; // Será preenchido automaticamente
    $std->pk_nItem = null; // Será preenchido automaticamente
    $make->taginfNFe($std);

    // IDE - Identificação
    $std = new stdClass();
    $std->cUF = $config['cUF'];
    $std->cNF = str_pad(rand(10000000, 99999999), 8, '0', STR_PAD_LEFT);
    $std->natOp = 'DEVOLUCAO DE VENDA'; // Natureza específica para devolução
    $std->mod = 65; // NFC-e
    $std->serie = $nfeConfig['serie_nfce'];
    $std->nNF = $proximoNumero;
    $std->dhEmi = date('Y-m-d\TH:i:sP');
    $std->tpNF = 1; // Saída
    $std->idDest = 1; // Operação interna
    $std->cMunFG = $config['cmun'];
    $std->tpImp = 4; // NFC-e
    $std->tpEmis = 1; // Normal
    $std->cDV = 0; // Será calculado
    $std->tpAmb = $config['tpAmb'];
    $std->finNFe = 4; // Devolução
    $std->indFinal = 1; // Consumidor final
    $std->indPres = 1; // Presencial
    $std->procEmi = 0; // Aplicativo do contribuinte
    $std->verProc = '1.0';
    $make->tagide($std);

    logDetalhado('IDE_CONFIGURADO', 'Identificação da NFC-e configurada', [
        'numero' => $proximoNumero,
        'serie' => $nfeConfig['serie_nfce'],
        'natureza_operacao' => 'DEVOLUCAO DE VENDA'
    ]);

    // IMPORTANTE: Tag de referência à NFC-e original
    $std = new stdClass();
    $std->refNFe = $nfceData['chave_nfe_original']; // Chave da NFC-e original
    $make->tagrefNFe($std);

    logDetalhado('REFERENCIA_ORIGINAL', 'Referência à NFC-e original adicionada', [
        'chave_original' => $nfceData['chave_nfe_original']
    ]);

    // Emitente (dados da empresa)
    $std = new stdClass();
    $std->xNome = $empresa['razao_social'];
    $std->xFant = $empresa['nome_fantasia'] ?? $empresa['razao_social'];
    $std->IE = $empresa['inscricao_estadual'];
    $std->CRT = $empresa['regime_tributario'] ?? 1; // Simples Nacional
    $make->tagemit($std);

    // CNPJ do emitente
    $std = new stdClass();
    $std->CNPJ = $empresa['cnpj'];
    $make->tagCNPJ($std);

    // Endereço do emitente
    $std = new stdClass();
    $std->xLgr = $empresa['endereco'];
    $std->nro = $empresa['numero'];
    $std->xBairro = $empresa['bairro'];
    $std->cMun = $config['cmun'];
    $std->xMun = $empresa['cidade'];
    $std->UF = $empresa['uf'];
    $std->CEP = $empresa['cep'];
    $std->cPais = 1058;
    $std->xPais = 'BRASIL';
    $make->tagenderEmit($std);

    logDetalhado('EMITENTE_CONFIGURADO', 'Dados do emitente configurados');

    // Processar itens da devolução
    foreach ($nfceData['itens'] as $index => $item) {
        $nItem = $index + 1;
        
        // Produto
        $std = new stdClass();
        $std->item = $nItem;
        $std->cProd = $item['codigo_produto'] ?? $item['produto_id'];
        $std->cEAN = 'SEM GTIN';
        $std->xProd = $item['nome_produto'];
        $std->NCM = $item['ncm'];
        $std->CFOP = '5202'; // CFOP fixo para devolução
        $std->uCom = $item['unidade_medida'];
        $std->qCom = $item['quantidade'];
        $std->vUnCom = number_format($item['valor_unitario'], 2, '.', '');
        $std->vProd = number_format($item['valor_total'], 2, '.', '');
        $std->cEANTrib = 'SEM GTIN';
        $std->uTrib = $item['unidade_medida'];
        $std->qTrib = $item['quantidade'];
        $std->vUnTrib = number_format($item['valor_unitario'], 2, '.', '');
        $std->indTot = 1;
        $make->tagprod($std);

        // Impostos
        $std = new stdClass();
        $std->item = $nItem;
        $make->tagimposto($std);

        // ICMS
        $std = new stdClass();
        $std->item = $nItem;
        $std->orig = 0; // Nacional
        $std->CSOSN = $item['csosn'];
        if ($item['aliquota_icms'] > 0) {
            $std->pICMS = number_format($item['aliquota_icms'], 2, '.', '');
        }
        $make->tagICMSSN($std);

        // PIS
        $std = new stdClass();
        $std->item = $nItem;
        $std->CST = '01';
        $std->vBC = number_format($item['valor_total'], 2, '.', '');
        $std->pPIS = number_format($item['aliquota_pis'], 4, '.', '');
        $std->vPIS = number_format($item['valor_total'] * $item['aliquota_pis'] / 100, 2, '.', '');
        $make->tagPIS($std);

        // COFINS
        $std = new stdClass();
        $std->item = $nItem;
        $std->CST = '01';
        $std->vBC = number_format($item['valor_total'], 2, '.', '');
        $std->pCOFINS = number_format($item['aliquota_cofins'], 4, '.', '');
        $std->vCOFINS = number_format($item['valor_total'] * $item['aliquota_cofins'] / 100, 2, '.', '');
        $make->tagCOFINS($std);

        logDetalhado('ITEM_PROCESSADO', "Item {$nItem} processado", [
            'codigo' => $item['codigo_produto'] ?? $item['produto_id'],
            'nome' => $item['nome_produto'],
            'cfop' => '5202',
            'valor' => $item['valor_total']
        ]);
    }

    // Totais
    $valorTotal = array_sum(array_column($nfceData['itens'], 'valor_total'));
    
    $std = new stdClass();
    $std->vBC = 0;
    $std->vICMS = 0;
    $std->vICMSDeson = 0;
    $std->vBCST = 0;
    $std->vST = 0;
    $std->vProd = number_format($valorTotal, 2, '.', '');
    $std->vFrete = 0;
    $std->vSeg = 0;
    $std->vDesc = 0;
    $std->vII = 0;
    $std->vIPI = 0;
    $std->vPIS = 0;
    $std->vCOFINS = 0;
    $std->vOutro = 0;
    $std->vNF = number_format($valorTotal, 2, '.', '');
    $make->tagICMSTot($std);

    // Pagamento (devolução = estorno)
    $std = new stdClass();
    $std->indPag = 1; // Pagamento à vista
    $std->tPag = 90; // Sem pagamento (devolução)
    $std->vPag = number_format($valorTotal, 2, '.', '');
    $make->tagpag($std);

    logDetalhado('TOTAIS_CONFIGURADOS', 'Totais da NFC-e configurados', [
        'valor_total' => $valorTotal
    ]);

    // Gerar XML
    $xml = $make->getXML();
    logDetalhado('XML_GERADO', 'XML da NFC-e de devolução gerado');

    // Assinar XML
    $xmlAssinado = $tools->signNFe($xml);
    logDetalhado('XML_ASSINADO', 'XML assinado digitalmente');

    // Enviar para SEFAZ
    $idLote = str_pad(mt_rand(1, 999999999), 15, '0', STR_PAD_LEFT);
    $resp = $tools->sefazEnviaLote([$xmlAssinado], $idLote);

    logDetalhado('ENVIADO_SEFAZ', 'XML enviado para SEFAZ', [
        'id_lote' => $idLote
    ]);

    // Processar resposta
    $st = $tools->sefazConsultaRecibo($resp);
    
    if ($st->cStat != 104) {
        throw new Exception("Erro SEFAZ: {$st->cStat} - {$st->xMotivo}");
    }

    // Extrair dados da resposta
    $dom = new DOMDocument();
    $dom->loadXML($st->any);
    
    $chaveNFe = $dom->getElementsByTagName('chNFe')->item(0)->nodeValue;
    $protocolo = $dom->getElementsByTagName('nProt')->item(0)->nodeValue;
    
    logDetalhado('NFCE_AUTORIZADA', 'NFC-e de devolução autorizada', [
        'chave' => $chaveNFe,
        'protocolo' => $protocolo,
        'numero' => $proximoNumero
    ]);

    // Atualizar numeração
    $novoNumero = $proximoNumero + 1;
    $updateData = json_encode(['proximo_numero' => $novoNumero]);
    
    $url = $supabaseUrl . "/rest/v1/nfce_numeracao?empresa_id=eq.{$empresaId}&serie=eq.{$nfeConfig['serie_nfce']}";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $updateData);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'apikey: ' . $supabaseKey,
        'Authorization: Bearer ' . $supabaseKey,
        'Content-Type: application/json',
        'Prefer: return=minimal'
    ]);
    curl_exec($ch);
    curl_close($ch);

    // Resposta de sucesso
    echo json_encode([
        'erro' => false,
        'sucesso' => true,
        'chave' => $chaveNFe,
        'numero' => $proximoNumero,
        'protocolo' => $protocolo,
        'xml' => base64_encode($xmlAssinado),
        'mensagem' => 'NFC-e de devolução emitida com sucesso'
    ]);

    logDetalhado('SUCESSO', 'Processo concluído com sucesso');

} catch (Exception $e) {
    logDetalhado('ERRO', 'Erro durante o processo', [
        'erro' => $e->getMessage(),
        'linha' => $e->getLine(),
        'arquivo' => $e->getFile()
    ]);

    http_response_code(500);
    echo json_encode([
        'erro' => true,
        'mensagem' => $e->getMessage()
    ]);
}
?>
