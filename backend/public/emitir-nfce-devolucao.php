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

// Imports necessários (devem estar no topo)
use NFePHP\NFe\Tools;
use NFePHP\NFe\Make;
use NFePHP\Common\Certificate;

// SISTEMA DE LOGS DETALHADOS
ini_set('memory_limit', '512M');
ini_set('max_execution_time', 300);
ini_set('log_errors', 1);
ini_set('error_log', '/tmp/nfce_devolucao_debug.log');

function logDetalhado($step, $message, $data = null, $status = 'info') {
    $timestamp = date('Y-m-d H:i:s.u');

    // Determinar emoji baseado no status
    $emoji = '🔵'; // Padrão azul para info
    switch ($status) {
        case 'success':
        case 'ok':
            $emoji = '🟢'; // Verde para sucesso
            break;
        case 'error':
        case 'erro':
            $emoji = '🔴'; // Vermelho para erro
            break;
        case 'warning':
        case 'aviso':
            $emoji = '🟡'; // Amarelo para aviso
            break;
        case 'info':
        default:
            $emoji = '🔵'; // Azul para informação
            break;
    }

    $logEntry = "[{$timestamp}] DEVOLUCAO_STEP_{$step}: {$message}";
    if ($data !== null) {
        $logEntry .= " | DATA: " . json_encode($data, JSON_UNESCAPED_UNICODE);
    }

    // Log padrão do PHP (para o sistema de logs)
    error_log($logEntry);

    // Log detalhado específico
    try {
        $logDir = dirname('/tmp/nfce_devolucao_detailed.log');
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        file_put_contents('/tmp/nfce_devolucao_detailed.log', $logEntry . "\n", FILE_APPEND | LOCK_EX);
    } catch (Exception $logError) {
        error_log("ERRO: Exceção ao escrever log detalhado: " . $logError->getMessage());
    }

    // Log no formato que o sistema de logs consegue ler COM EMOJI
    try {
        $systemLogEntry = "[" . date('H:i:s') . "] [NFE-SYSTEM] [NFCE-DEVOLUCAO] {$emoji} {$message}";
        if ($data !== null) {
            $systemLogEntry .= " | " . json_encode($data, JSON_UNESCAPED_UNICODE);
        }
        file_put_contents('/var/log/php_nfe_debug.log', $systemLogEntry . "\n", FILE_APPEND | LOCK_EX);
    } catch (Exception $systemLogError) {
        error_log("ERRO: Não foi possível escrever no log do sistema: " . $systemLogError->getMessage());
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
    logDetalhado('INCLUINDO_LIBS', 'Incluindo bibliotecas necessárias');

    if (!file_exists(__DIR__ . '/../vendor/autoload.php')) {
        throw new Exception('Autoload do Composer não encontrado');
    }
    require_once __DIR__ . '/../vendor/autoload.php';

    if (!file_exists(__DIR__ . '/../config/database.php')) {
        logDetalhado('WARNING', 'Arquivo database.php não encontrado, continuando sem ele');
    } else {
        require_once __DIR__ . '/../config/database.php';
    }

    logDetalhado('LIBS_CARREGADAS', 'Bibliotecas carregadas com sucesso');

    // Buscar configurações da empresa (reutilizar função existente)
    $supabaseUrl = 'https://xsrirnfwsjeovekwtluz.supabase.co';
    $supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcmlybmZ3c2plb3Zla3d0bHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NjQ5OTcsImV4cCI6MjA2MjI0MDk5N30.SrIEj_akvD9x-tltfpV3K4hQSKtPjJ_tQ4FFhPwiIy4';

    // Receber dados da empresa do payload (igual ao emitir-nfce.php)
    if (!isset($nfceData['empresa'])) {
        throw new Exception('Dados da empresa não informados no payload');
    }

    $empresa = $nfceData['empresa'];
    logDetalhado('EMPRESA_RECEBIDA', 'Dados da empresa recebidos do payload', [
        'razao_social' => $empresa['razao_social'],
        'cnpj' => $empresa['cnpj'],
        'uf' => $empresa['uf']
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

    // ✅ USAR dados do payload em vez de buscar do banco (igual ao PDV)
    $serieDocumento = $nfceData['serie_documento'] ?? $nfeConfig['serie_nfce'] ?? 1;
    $proximoNumero = $nfceData['numero_documento'] ?? 1;

    logDetalhado('NFE_CONFIG_CARREGADA', 'Configuração NFe carregada', [
        'ambiente' => $nfeConfig['ambiente'],
        'serie_banco' => $nfeConfig['serie_nfce'],
        'serie_payload' => $nfceData['serie_documento'],
        'serie_final' => $serieDocumento
    ], 'success');

    logDetalhado('NUMERO_SERIE', 'Série e número obtidos do payload', [
        'serie' => $serieDocumento,
        'proximo_numero' => $proximoNumero,
        'fonte' => 'payload_frontend'
    ], 'success');

    // Configurar NFePHP (mesmo padrão do emitir-nfce.php)
    logDetalhado('CONFIG_BUILD', 'Construindo configuração NFePHP');

    $ambiente = ($nfeConfig['ambiente'] === 'producao') ? 1 : 2;

    // Limpar CNPJ - usar campo 'cnpj' igual ao emitir-nfce.php
    $cnpjLimpo = preg_replace('/[^0-9]/', '', $empresa['cnpj']);
    logDetalhado('CNPJ_PROCESSADO', 'CNPJ processado', [
        'original' => $empresa['cnpj'],
        'limpo' => $cnpjLimpo,
        'tamanho' => strlen($cnpjLimpo)
    ], 'success');

    if (strlen($cnpjLimpo) !== 14) {
        logDetalhado('CNPJ_ERROR', 'CNPJ com tamanho inválido', [
            'cnpj' => $cnpjLimpo,
            'tamanho' => strlen($cnpjLimpo)
        ], 'error');
        throw new Exception('CNPJ da empresa deve ter 14 dígitos');
    }

    // Validações obrigatórias (igual ao emitir-nfce.php)
    if (empty($empresa['uf'])) {
        throw new Exception('UF da empresa é obrigatória');
    }

    if (empty($empresa['codigo_municipio'])) {
        throw new Exception('Código do município da empresa é obrigatório');
    }

    if (empty($empresa['inscricao_estadual'])) {
        throw new Exception('Inscrição Estadual da empresa é obrigatória');
    }

    // Determinar campos CSC baseado no ambiente
    $cscField = ($ambiente === 1) ? 'csc_producao' : 'csc_homologacao';
    $cscIdField = ($ambiente === 1) ? 'csc_id_producao' : 'csc_id_homologacao';

    // Configuração IGUAL ao emitir-nfce.php
    $config = [
        "atualizacao" => date('Y-m-d H:i:s'),
        "tpAmb" => $ambiente,
        "razaosocial" => $empresa['razao_social'],
        "cnpj" => $cnpjLimpo,
        "siglaUF" => $empresa['uf'],
        "schemes" => "PL_009_V4",
        "versao" => '4.00',
        "CSC" => $empresa[$cscField],
        "CSCid" => (string)$empresa[$cscIdField], // Converter para string
        "cmun" => (int)$empresa['codigo_municipio'] // ✅ ADICIONADO: código do município
    ];

    logDetalhado('CONFIG_NFEPHP', 'Configuração NFePHP preparada', $config, 'success');

    // Inicializar NFePHP Tools
    logDetalhado('INIT_NFEPHP', 'Inicializando classes NFePHP');

    // Carregar certificado (mesmo padrão do emitir-nfce.php)
    logDetalhado('CERT_LOAD', 'Carregando certificado da empresa');

    $certificadoPath = "../storage/certificados/empresa_{$empresaId}.pfx";
    $metadataPath = "../storage/certificados/empresa_{$empresaId}.json";

    logDetalhado('CERT_PATHS', 'Verificando caminhos do certificado', [
        'certificado_path' => $certificadoPath,
        'metadata_path' => $metadataPath,
        'certificado_exists' => file_exists($certificadoPath),
        'metadata_exists' => file_exists($metadataPath)
    ]);

    if (!file_exists($certificadoPath)) {
        throw new Exception('Certificado digital não encontrado para esta empresa');
    }

    if (!file_exists($metadataPath)) {
        throw new Exception('Metadados do certificado não encontrados');
    }

    $certificadoContent = file_get_contents($certificadoPath);
    $metadata = json_decode(file_get_contents($metadataPath), true);

    logDetalhado('CERT_LOADED', 'Certificado carregado', [
        'size' => strlen($certificadoContent),
        'metadata' => $metadata
    ]);

    try {
        $certificate = Certificate::readPfx($certificadoContent, $metadata['password'] ?? '');
        logDetalhado('CERT_PARSED', 'Certificado parseado com sucesso');
    } catch (Exception $certError) {
        logDetalhado('CERT_PARSE_ERROR', 'Erro ao parsear certificado', ['erro' => $certError->getMessage()]);
        throw new Exception('Erro no certificado: ' . $certError->getMessage());
    }

    try {
        $tools = new Tools(json_encode($config), $certificate);
        $tools->model('65'); // NFC-e
        logDetalhado('TOOLS_INICIALIZADO', 'NFePHP Tools inicializado com sucesso');
    } catch (Exception $toolsError) {
        logDetalhado('TOOLS_ERROR', 'Erro ao inicializar Tools', ['erro' => $toolsError->getMessage()]);
        throw new Exception('Erro ao inicializar NFePHP Tools: ' . $toolsError->getMessage());
    }

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
    $std->serie = $serieDocumento;
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
        'serie' => $serieDocumento,
        'natureza_operacao' => 'DEVOLUCAO DE VENDA'
    ], 'success');

    // IMPORTANTE: Tag de referência à NFC-e original
    $std = new stdClass();
    $std->refNFe = $nfceData['chave_nfe_original']; // Chave da NFC-e original
    $make->tagrefNFe($std);

    logDetalhado('REFERENCIA_ORIGINAL', 'Referência à NFC-e original adicionada', [
        'chave_original' => $nfceData['chave_nfe_original']
    ]);

    // Emitente (EXATAMENTE igual ao emitir-nfce.php)
    $std = new stdClass();
    $std->xNome = $empresa['razao_social'];
    $std->CNPJ = $cnpjLimpo; // ✅ CORREÇÃO: Usar CNPJ já processado
    $std->xFant = $empresa['nome_fantasia'] ?? null; // OPCIONAL
    $std->IE = $empresa['inscricao_estadual'];
    $std->CRT = (int)$empresa['regime_tributario'];

    logDetalhado('EMITENTE_PREPARADO', 'Dados do emitente preparados', (array)$std);
    $make->tagemit($std);

    // Endereço do emitente (EXATAMENTE igual ao emitir-nfce.php)
    $endereco = $empresa['endereco']; // Dados do endereço já vêm estruturados
    $std = new stdClass();
    $std->xLgr = $endereco['logradouro'];
    $std->nro = $endereco['numero'];
    $std->xCpl = $endereco['complemento'] ?? null; // OPCIONAL
    $std->xBairro = $endereco['bairro'];
    $std->cMun = (int)$empresa['codigo_municipio']; // ✅ CORREÇÃO: Usar código do município da empresa
    $std->xMun = $endereco['cidade'] ?? $empresa['cidade'] ?? '';
    $std->UF = $empresa['uf'];
    $std->CEP = $endereco['cep'];
    $std->cPais = 1058;
    $std->xPais = 'BRASIL';

    logDetalhado('ENDERECO_PREPARADO', 'Endereço do emitente preparado', (array)$std);
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

    // Verificar erros antes de gerar XML
    $erros = $make->getErrors();
    if (!empty($erros)) {
        logDetalhado('ERROS_VALIDACAO', 'Erros encontrados na validação das tags', $erros, 'error');
        throw new Exception('Erros na validação: ' . implode('; ', $erros));
    }

    // Gerar XML
    logDetalhado('XML_GERANDO', 'Iniciando geração do XML da NFC-e de devolução');
    $xml = $make->getXML();
    logDetalhado('XML_GERADO', 'XML da NFC-e de devolução gerado com sucesso');

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
    $erroDetalhado = [
        'erro' => $e->getMessage(),
        'linha' => $e->getLine(),
        'arquivo' => basename($e->getFile()),
        'trace' => $e->getTraceAsString(),
        'timestamp' => date('Y-m-d H:i:s'),
        'dados_recebidos' => $data ?? 'Não disponível'
    ];

    logDetalhado('ERRO_CRITICO', 'Erro durante o processo de emissão NFC-e devolução', $erroDetalhado);

    // Log adicional para debug
    error_log("ERRO NFCE DEVOLUCAO: " . json_encode($erroDetalhado, JSON_UNESCAPED_UNICODE));

    http_response_code(500);
    echo json_encode([
        'erro' => true,
        'mensagem' => $e->getMessage(),
        'detalhes' => [
            'arquivo' => basename($e->getFile()),
            'linha' => $e->getLine(),
            'timestamp' => date('Y-m-d H:i:s'),
            'trace' => $e->getTraceAsString()
        ]
    ]);
} catch (Error $e) {
    $erroDetalhado = [
        'erro' => $e->getMessage(),
        'linha' => $e->getLine(),
        'arquivo' => basename($e->getFile()),
        'trace' => $e->getTraceAsString(),
        'timestamp' => date('Y-m-d H:i:s'),
        'tipo' => 'Fatal Error'
    ];

    logDetalhado('ERRO_FATAL', 'Erro fatal durante o processo', $erroDetalhado);
    error_log("ERRO FATAL NFCE DEVOLUCAO: " . json_encode($erroDetalhado, JSON_UNESCAPED_UNICODE));

    http_response_code(500);
    echo json_encode([
        'erro' => true,
        'mensagem' => 'Erro fatal: ' . $e->getMessage(),
        'detalhes' => [
            'arquivo' => basename($e->getFile()),
            'linha' => $e->getLine(),
            'timestamp' => date('Y-m-d H:i:s'),
            'tipo' => 'Fatal Error',
            'trace' => $e->getTraceAsString()
        ]
    ]);
}
?>
