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

// Incluir arquivo de funções de storage
require_once '../includes/storage-paths.php';

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
        "cmun" => (int)$empresa['codigo_municipio'], // Código do município
        "cUF" => (int)$empresa['codigo_uf'] // ✅ ADICIONADO: código da UF
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

    // ✅ TRANSPORTE (OBRIGATÓRIO) - FIXO PARA DEVOLUÇÃO CFOP 5202
    // Para devolução: "9 = Sem Ocorrência de Transporte" (padrão para devoluções)
    logDetalhado('TRANSPORTE_INICIANDO', 'Configurando transporte para devolução CFOP 5202');
    $std = new stdClass();
    $std->modFrete = 9; // 9 = Sem Ocorrência de Transporte (FIXO para devolução)
    $make->tagtransp($std);
    logDetalhado('TRANSPORTE_CONFIGURADO', 'Transporte configurado para devolução', ['modFrete' => 9]);

    // ✅ PAGAMENTO (OBRIGATÓRIO) - FIXO PARA DEVOLUÇÃO CFOP 5202
    // Para devolução: "90 = Sem Pagamento" (padrão para devoluções)
    logDetalhado('PAGAMENTO_INICIANDO', 'Configurando pagamento para devolução CFOP 5202');

    // 1. Grupo PAG (container) - SEM TROCO para devolução
    $std = new stdClass();
    $std->vTroco = 0.00; // FIXO: Sem troco em devolução
    $make->tagpag($std);
    logDetalhado('PAGAMENTO_GRUPO_CONFIGURADO', 'Grupo pagamento configurado', ['vTroco' => 0.00]);

    // 2. Detalhes do pagamento - ESPECÍFICO PARA DEVOLUÇÃO
    $std = new stdClass();
    $std->indPag = 0; // 0 = Pagamento à vista (padrão)
    $std->tPag = '90'; // 90 = Sem Pagamento (FIXO para devolução CFOP 5202)
    $std->vPag = 0.00; // FIXO: Valor zero para devolução
    $make->tagdetPag($std);
    logDetalhado('PAGAMENTO_DETALHES_CONFIGURADO', 'Detalhes pagamento configurado para devolução', [
        'indPag' => 0,
        'tPag' => '90',
        'vPag' => 0.00
    ]);

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

    // ENVIAR PARA SEFAZ (MÉTODO SÍNCRONO IGUAL AO emitir-nfce.php)
    logDetalhado('ENVIANDO_SEFAZ', 'Enviando para SEFAZ com modo síncrono...');
    try {
        // ✅ CORREÇÃO: Para NFC-e usar envio síncrono (indSinc=1) igual ao emitir-nfce.php
        $response = $tools->sefazEnviaLote([$xmlAssinado], 1, 1); // Terceiro parâmetro = indSinc=1 (síncrono)
        logDetalhado('RESPOSTA_RECEBIDA', 'Resposta recebida da SEFAZ (modo síncrono)');
    } catch (Exception $sefazError) {
        logDetalhado('ERRO_ENVIO_SEFAZ', 'Erro ao enviar para SEFAZ', [
            'erro' => $sefazError->getMessage()
        ], 'error');
        throw new Exception("Erro ao enviar para SEFAZ: " . $sefazError->getMessage());
    }

    // PROCESSAR RESPOSTA (MÉTODO NATIVO IGUAL AO emitir-nfce.php)
    logDetalhado('PROCESSANDO_RESPOSTA', 'Processando resposta da SEFAZ', [
        'resposta_sefaz' => $response
    ]);

    try {
        $dom = new DOMDocument();
        $dom->loadXML($response);
        logDetalhado('XML_RESPOSTA_CARREGADO', 'XML da resposta carregado');
    } catch (Exception $domError) {
        logDetalhado('ERRO_XML_RESPOSTA', 'Erro ao carregar XML da resposta', [
            'erro' => $domError->getMessage()
        ], 'error');
        throw new Exception("Erro ao processar resposta da SEFAZ: " . $domError->getMessage());
    }

    // Extrair dados da resposta (IGUAL AO emitir-nfce.php)
    logDetalhado('EXTRAINDO_DADOS', 'Extraindo dados da resposta...');

    // Status do lote (104 = Lote processado é OK)
    $statusLoteNode = $dom->getElementsByTagName('cStat')->item(0);
    $statusLote = $statusLoteNode ? $statusLoteNode->nodeValue : 'STATUS_NAO_ENCONTRADO';
    logDetalhado('STATUS_LOTE', 'Status do Lote', ['status' => $statusLote]);

    $motivoLoteNode = $dom->getElementsByTagName('xMotivo')->item(0);
    $motivoLote = $motivoLoteNode ? $motivoLoteNode->nodeValue : 'MOTIVO_NAO_ENCONTRADO';
    logDetalhado('MOTIVO_LOTE', 'Motivo do Lote', ['motivo' => $motivoLote]);

    // ✅ CORREÇÃO: Para modo síncrono, verificar status individual da NFC-e
    logDetalhado('BUSCANDO_STATUS_INDIVIDUAL', 'Buscando status individual da NFC-e...');

    // Buscar status da NFC-e individual (dentro de protNFe)
    $protNFeNodes = $dom->getElementsByTagName('protNFe');
    if ($protNFeNodes->length > 0) {
        $protNFe = $protNFeNodes->item(0);
        $infProtNodes = $protNFe->getElementsByTagName('infProt');

        if ($infProtNodes->length > 0) {
            $infProt = $infProtNodes->item(0);

            $statusNFeNode = $infProt->getElementsByTagName('cStat')->item(0);
            $status = $statusNFeNode ? $statusNFeNode->nodeValue : 'STATUS_NFE_NAO_ENCONTRADO';

            $motivoNFeNode = $infProt->getElementsByTagName('xMotivo')->item(0);
            $motivo = $motivoNFeNode ? $motivoNFeNode->nodeValue : 'MOTIVO_NFE_NAO_ENCONTRADO';

            logDetalhado('STATUS_NFCE', 'Status da NFC-e', ['status' => $status, 'motivo' => $motivo]);
        } else {
            logDetalhado('ERRO_INFPROT', 'infProt não encontrado', [], 'error');
            $status = 'INFPROT_NAO_ENCONTRADO';
            $motivo = 'Estrutura de protocolo inválida';
        }
    } else {
        logDetalhado('ERRO_PROTNFE', 'protNFe não encontrado', [], 'error');
        $status = 'PROTNFE_NAO_ENCONTRADO';
        $motivo = 'Protocolo da NFC-e não encontrado na resposta';
    }

    logDetalhado('STATUS_FINAL', 'Status final da NFC-e', ['status' => $status, 'motivo' => $motivo]);

    // Verificar se foi autorizada (100 = Autorizado) - IGUAL AO emitir-nfce.php
    if ($status !== '100') {
        logDetalhado('NFCE_REJEITADA', 'NFC-e rejeitada', ['status' => $status, 'motivo' => $motivo], 'error');

        // ✅ CORREÇÃO: Criar mensagem específica baseada no status (IGUAL AO emitir-nfce.php)
        $mensagemEspecifica = "NFC-e de devolução rejeitada pela SEFAZ";

        // Tratar erros específicos mais comuns
        switch ($status) {
            case '539':
                $mensagemEspecifica = "ERRO: Número da NFC-e já foi utilizado. Configure o próximo número disponível no sistema.";
                break;
            case '204':
                $mensagemEspecifica = "ERRO: Duplicidade de NFC-e. Verifique a numeração sequencial.";
                break;
            case '225':
                $mensagemEspecifica = "ERRO: Falha no Schema XML. Verifique os dados obrigatórios.";
                break;
            case '402':
                $mensagemEspecifica = "ERRO: XML mal formado. Problema na estrutura dos dados.";
                break;
            case '503':
                $mensagemEspecifica = "ERRO: Serviço da SEFAZ temporariamente indisponível. Tente novamente em alguns minutos.";
                break;
            case '656':
                $mensagemEspecifica = "ERRO: Consumo indevido. Verifique se o ambiente (homologação/produção) está correto.";
                break;
            default:
                $mensagemEspecifica = "NFC-e de devolução rejeitada pela SEFAZ - Status {$status}: {$motivo}";
                break;
        }

        throw new Exception($mensagemEspecifica);
    }

    logDetalhado('NFCE_AUTORIZADA', 'NFC-e de devolução autorizada pela SEFAZ!', [], 'success');

    // ✅ CORREÇÃO: No modo síncrono, extrair protocolo e recibo da resposta (IGUAL AO emitir-nfce.php)
    logDetalhado('EXTRAINDO_PROTOCOLO', 'Extraindo protocolo e recibo da resposta síncrona...');
    $protocolo = null;
    $recibo = null;

    try {
        // Buscar protocolo na resposta síncrona (dentro de infProt)
        if ($protNFeNodes->length > 0) {
            $protNFe = $protNFeNodes->item(0);
            $infProtNodes = $protNFe->getElementsByTagName('infProt');

            if ($infProtNodes->length > 0) {
                $infProt = $infProtNodes->item(0);

                $protocoloNode = $infProt->getElementsByTagName('nProt')->item(0);
                $protocolo = $protocoloNode ? $protocoloNode->nodeValue : null;

                // Para modo síncrono, o recibo pode estar no cabeçalho
                $reciboNode = $dom->getElementsByTagName('nRec')->item(0);
                $recibo = $reciboNode ? $reciboNode->nodeValue : 'SINCRONO';
            }
        }

        if ($protocolo) {
            logDetalhado('PROTOCOLO_EXTRAIDO', 'Protocolo extraído da resposta síncrona', [
                'protocolo' => $protocolo,
                'recibo' => $recibo
            ], 'success');

            // ✅ CORREÇÃO: Usar método oficial da biblioteca sped-nfe (IGUAL AO emitir-nfce.php)
            logDetalhado('ADICIONANDO_PROTOCOLO', 'Adicionando protocolo ao XML usando Complements::toAuthorize...');
            try {
                // Usar a classe Complements da biblioteca sped-nfe (OFICIAL)
                $xmlComProtocolo = \NFePHP\NFe\Complements::toAuthorize($xmlAssinado, $response);
                logDetalhado('PROTOCOLO_ADICIONADO', 'Protocolo adicionado ao XML usando Complements::toAuthorize', [], 'success');
            } catch (Exception $protocolError) {
                logDetalhado('ERRO_ADICIONAR_PROTOCOLO', 'Erro ao adicionar protocolo', [
                    'erro' => $protocolError->getMessage()
                ], 'warning');
                $xmlComProtocolo = $xmlAssinado;
            }
        } else {
            logDetalhado('PROTOCOLO_NAO_ENCONTRADO', 'Protocolo não encontrado na resposta síncrona', [], 'warning');
            $xmlComProtocolo = $xmlAssinado;
            $protocolo = 'PROTOCOLO_NAO_ENCONTRADO';
            $recibo = 'RECIBO_NAO_ENCONTRADO';
        }

    } catch (Exception $e) {
        logDetalhado('ERRO_EXTRAIR_PROTOCOLO', 'Erro ao extrair protocolo', [
            'erro' => $e->getMessage()
        ], 'warning');
        $xmlComProtocolo = $xmlAssinado;
        $protocolo = 'ERRO_PROTOCOLO';
        $recibo = 'ERRO_RECIBO';
    }

    // Extrair chave de acesso do XML (IGUAL AO emitir-nfce.php)
    logDetalhado('EXTRAINDO_CHAVE', 'Extraindo chave de acesso do XML...');
    try {
        $xmlDom = new DOMDocument();
        $xmlDom->loadXML($xmlAssinado);

        $chaveNode = $xmlDom->getElementsByTagName('chNFe')->item(0);
        $chaveNFe = $chaveNode ? $chaveNode->nodeValue : null;
        logDetalhado('TENTATIVA_1_CHAVE', 'Tentativa 1 - chNFe', ['chave' => $chaveNFe ?? 'null']);

        if (!$chaveNFe) {
            // Tentar extrair da tag infNFe
            logDetalhado('TENTATIVA_2_CHAVE', 'Tentativa 2 - extraindo de infNFe...');
            $infNFeNodes = $xmlDom->getElementsByTagName('infNFe');
            if ($infNFeNodes->length > 0) {
                $idAttribute = $infNFeNodes->item(0)->getAttribute('Id');
                $chaveNFe = str_replace('NFe', '', $idAttribute);
                logDetalhado('ID_ATTRIBUTE', 'ID attribute extraído', [
                    'id_attribute' => $idAttribute,
                    'chave_extraida' => $chaveNFe
                ]);
            }
        }

        if (!$chaveNFe || strlen($chaveNFe) !== 44) {
            logDetalhado('CHAVE_INVALIDA', 'Chave inválida', [
                'chave' => $chaveNFe ?? 'null',
                'tamanho' => strlen($chaveNFe ?? '')
            ], 'error');
            throw new Exception('Não foi possível extrair chave de acesso válida do XML');
        }

        logDetalhado('CHAVE_EXTRAIDA', 'Chave extraída com sucesso', ['chave' => $chaveNFe], 'success');

    } catch (Exception $chaveError) {
        logDetalhado('ERRO_EXTRAIR_CHAVE', 'Erro ao extrair chave', [
            'erro' => $chaveError->getMessage()
        ], 'error');
        throw new Exception('Erro ao extrair chave de acesso: ' . $chaveError->getMessage());
    }
    
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

    // ✅ SALVAR XML NO STORAGE (IGUAL AO emitir-nfce.php)
    logDetalhado('XML_SALVANDO', 'Iniciando salvamento do XML da NFC-e de devolução');

    // Protocolar XML (adicionar protocolo ao XML)
    $xmlComProtocolo = $tools->addProtocol($xmlAssinado, $st->any);
    logDetalhado('XML_PROTOCOLADO', 'XML protocolado com sucesso');

    // Determinar ambiente para salvamento
    $ambienteTexto = $ambiente == 1 ? 'producao' : 'homologacao';
    logDetalhado('AMBIENTE_DETERMINADO', 'Ambiente determinado', ['ambiente' => $ambienteTexto]);

    // Gerar caminho usando função do storage-paths.php
    $xmlDir = getXmlPath($empresaId, $ambienteTexto, '65', 'Autorizados');
    logDetalhado('DIRETORIO_XML', 'Diretório XML determinado', ['path' => $xmlDir]);

    // Criar diretório se não existir
    if (!is_dir($xmlDir)) {
        logDetalhado('CRIANDO_DIRETORIO', 'Criando diretório XML', ['path' => $xmlDir]);
        if (!mkdir($xmlDir, 0755, true)) {
            logDetalhado('ERRO_DIRETORIO', 'Erro ao criar diretório XML', ['path' => $xmlDir], 'error');
            throw new Exception('Erro ao criar diretório para XML da NFC-e de devolução');
        }
        logDetalhado('DIRETORIO_CRIADO', 'Diretório XML criado com sucesso', [], 'success');
    } else {
        logDetalhado('DIRETORIO_EXISTE', 'Diretório XML já existe', [], 'success');
    }

    // Salvar XML
    $xmlPath = "{$xmlDir}/{$chaveNFe}.xml";
    logDetalhado('SALVANDO_XML', 'Salvando XML no caminho', ['path' => $xmlPath]);

    $xmlSalvo = file_put_contents($xmlPath, $xmlComProtocolo);

    if ($xmlSalvo === false) {
        logDetalhado('ERRO_SALVAR_XML', 'Erro ao salvar XML', ['path' => $xmlPath], 'error');
        throw new Exception('Erro ao salvar XML da NFC-e de devolução');
    }

    logDetalhado('XML_SALVO', 'XML da NFC-e de devolução salvo com sucesso', [
        'path' => $xmlPath,
        'bytes' => $xmlSalvo,
        'chave' => $chaveNFe
    ], 'success');

    // ✅ CRIAR REGISTRO NA TABELA PDV PARA CONTROLE DE NUMERAÇÃO
    logDetalhado('PDV_CRIANDO', 'Criando registro na tabela PDV para controle de numeração');

    // Buscar dados da empresa para o registro PDV
    $url = $supabaseUrl . "/rest/v1/empresas?id=eq.{$empresaId}&select=*";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'apikey: ' . $supabaseKey,
        'Authorization: Bearer ' . $supabaseKey,
        'Content-Type: application/json'
    ]);
    $empresaResponse = curl_exec($ch);
    curl_close($ch);

    $empresaData = json_decode($empresaResponse, true);
    if (!$empresaData || empty($empresaData)) {
        logDetalhado('ERRO_EMPRESA', 'Empresa não encontrada para criar registro PDV', [], 'error');
        throw new Exception('Empresa não encontrada para criar registro PDV');
    }

    $empresa = $empresaData[0];
    logDetalhado('EMPRESA_ENCONTRADA', 'Dados da empresa carregados', ['razao_social' => $empresa['razao_social']]);

    // Gerar número de venda único para a devolução
    $numeroVendaDevolucao = 'DEV-' . date('YmdHis') . '-' . substr($chaveNFe, -6);
    logDetalhado('NUMERO_VENDA_GERADO', 'Número de venda da devolução gerado', ['numero' => $numeroVendaDevolucao]);

    // Preparar dados do registro PDV para devolução
    $pdvDevolucaoData = [
        'empresa_id' => $empresaId,
        'usuario_id' => $empresa['usuario_proprietario_id'], // Usar proprietário da empresa
        'numero_venda' => $numeroVendaDevolucao,
        'data_venda' => date('Y-m-d\TH:i:s.u\Z'),
        'status_venda' => 'finalizada',
        'nfce_devolucao' => true, // ✅ CAMPO ESPECIAL PARA IDENTIFICAR DEVOLUÇÕES
        'modelo_documento' => 65, // NFC-e
        'serie_documento' => (int)$nfeConfig['serie_nfce'],
        'numero_documento' => $proximoNumero,
        'chave_acesso' => $chaveNFe,
        'protocolo_autorizacao' => $protocolo,
        'status_fiscal' => 'autorizada',
        'valor_total' => $dadosNFCe['valor_total'],
        'observacao_venda' => 'NFC-e de Devolução - Chave: ' . $chaveNFe,
        'created_at' => date('Y-m-d\TH:i:s.u\Z'),
        'updated_at' => date('Y-m-d\TH:i:s.u\Z')
    ];

    logDetalhado('PDV_DADOS_PREPARADOS', 'Dados do registro PDV preparados', $pdvDevolucaoData);

    // Inserir registro na tabela PDV
    $url = $supabaseUrl . "/rest/v1/pdv";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($pdvDevolucaoData));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'apikey: ' . $supabaseKey,
        'Authorization: Bearer ' . $supabaseKey,
        'Content-Type: application/json',
        'Prefer: return=representation'
    ]);
    $pdvResponse = curl_exec($ch);
    $pdvHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($pdvHttpCode !== 201) {
        logDetalhado('ERRO_PDV', 'Erro ao criar registro PDV', [
            'http_code' => $pdvHttpCode,
            'response' => $pdvResponse
        ], 'error');
        throw new Exception('Erro ao criar registro PDV para devolução');
    }

    $pdvCriado = json_decode($pdvResponse, true);
    $pdvId = $pdvCriado[0]['id'];
    logDetalhado('PDV_CRIADO', 'Registro PDV criado com sucesso', [
        'id' => $pdvId,
        'numero_venda' => $numeroVendaDevolucao
    ], 'success');

    // ✅ CRIAR ITENS DA DEVOLUÇÃO NA TABELA PDV_ITENS
    logDetalhado('PDV_ITENS_CRIANDO', 'Criando itens da devolução na tabela pdv_itens');

    $pdvItensData = [];
    foreach ($dadosNFCe['itens'] as $index => $item) {
        $pdvItensData[] = [
            'empresa_id' => $empresaId,
            'usuario_id' => $empresa['usuario_proprietario_id'],
            'pdv_id' => $pdvId,
            'produto_id' => $item['produto_id'],
            'codigo_produto' => $item['codigo_produto'] ?? null,
            'nome_produto' => $item['nome_produto'],
            'descricao_produto' => 'Item de devolução NFC-e',
            'quantidade' => $item['quantidade'],
            'valor_unitario' => $item['valor_unitario'],
            'valor_subtotal' => $item['valor_total'],
            'valor_total_item' => $item['valor_total'],
            'origem_item' => 'nfce_devolucao',
            'observacao_item' => 'Item de devolução - NFC-e: ' . $chaveNFe,
            'created_at' => date('Y-m-d\TH:i:s.u\Z'),
            'updated_at' => date('Y-m-d\TH:i:s.u\Z')
        ];
    }

    logDetalhado('PDV_ITENS_DADOS_PREPARADOS', 'Dados dos itens PDV preparados', [
        'total_itens' => count($pdvItensData)
    ]);

    // Inserir itens na tabela PDV_ITENS
    $url = $supabaseUrl . "/rest/v1/pdv_itens";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($pdvItensData));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'apikey: ' . $supabaseKey,
        'Authorization: Bearer ' . $supabaseKey,
        'Content-Type: application/json',
        'Prefer: return=representation'
    ]);
    $pdvItensResponse = curl_exec($ch);
    $pdvItensHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($pdvItensHttpCode !== 201) {
        logDetalhado('ERRO_PDV_ITENS', 'Erro ao criar itens PDV', [
            'http_code' => $pdvItensHttpCode,
            'response' => $pdvItensResponse
        ], 'error');
        // Não falhar aqui - o principal já foi criado
        logDetalhado('AVISO_PDV_ITENS', 'Continuando sem os itens PDV - registro principal criado', [], 'warning');
    } else {
        $pdvItensCriados = json_decode($pdvItensResponse, true);
        logDetalhado('PDV_ITENS_CRIADOS', 'Itens PDV criados com sucesso', [
            'total_criados' => count($pdvItensCriados)
        ], 'success');
    }

    // Resposta de sucesso
    echo json_encode([
        'erro' => false,
        'sucesso' => true,
        'chave' => $chaveNFe,
        'numero' => $proximoNumero,
        'protocolo' => $protocolo,
        'xml' => base64_encode($xmlAssinado),
        'pdv_id' => $pdvId,
        'numero_venda_devolucao' => $numeroVendaDevolucao,
        'xml_path' => $xmlPath,
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
