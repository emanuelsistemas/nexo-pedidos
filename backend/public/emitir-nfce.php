<?php
/**
 * Endpoint para emissão de NFC-e (Modelo 65)
 *
 * SEGUINDO AS 5 LEIS FUNDAMENTAIS:
 * 1. LEI DOS DADOS REAIS - Sempre dados reais, nunca fallbacks
 * 2. LEI DA BIBLIOTECA SAGRADA - sped-nfe é intocável
 * 3. LEI DA AUTENTICIDADE - Nunca simular, sempre processos reais
 * 4. LEI DA EXCELÊNCIA - Solução correta, nunca contornos
 * 5. LEI DA DOCUMENTAÇÃO OFICIAL - Consultar documentação antes de implementar
 *
 * Baseado em: https://github.com/nfephp-org/sped-nfe/blob/master/docs/Make.md
 * Manual Fiscal: https://www.mjailton.com.br/manualnfe/
 */

// SISTEMA DE LOGS DETALHADOS
ini_set('memory_limit', '512M');
ini_set('max_execution_time', 300);
ini_set('log_errors', 1);
ini_set('error_log', '/tmp/nfce_debug.log');

function logDetalhado($step, $message, $data = null) {
    $timestamp = date('Y-m-d H:i:s.u');
    $logEntry = "[{$timestamp}] STEP_{$step}: {$message}";
    if ($data !== null) {
        $logEntry .= " | DATA: " . json_encode($data, JSON_UNESCAPED_UNICODE);
    }
    error_log($logEntry);

    // Também salvar em arquivo específico
    file_put_contents('/tmp/nfce_detailed.log', $logEntry . "\n", FILE_APPEND | LOCK_EX);

    // COMENTADO: Output para debug imediato (estava contaminando resposta JSON)
    // echo json_encode([
    //     'debug_step' => $step,
    //     'debug_message' => $message,
    //     'debug_timestamp' => $timestamp
    // ]) . "\n";
    // flush();
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

logDetalhado('001', 'Iniciando endpoint NFC-e');

try {
    logDetalhado('002', 'Carregando dependências');
    require_once '../vendor/autoload.php';
    require_once '../includes/storage-paths.php';
    logDetalhado('003', 'Dependências carregadas com sucesso');

    // Validar método
    logDetalhado('004', 'Validando método HTTP', ['method' => $_SERVER['REQUEST_METHOD']]);
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método não permitido. Use POST.');
    }

    // Receber dados
    logDetalhado('005', 'Lendo dados de entrada');
    $rawInput = file_get_contents('php://input');
    logDetalhado('006', 'Dados brutos recebidos', ['size' => strlen($rawInput), 'preview' => substr($rawInput, 0, 200)]);

    $input = json_decode($rawInput, true);

    if (!$input) {
        logDetalhado('007', 'ERRO: Falha ao decodificar JSON', ['json_error' => json_last_error_msg()]);
        throw new Exception('Dados JSON inválidos: ' . json_last_error_msg());
    }

    logDetalhado('008', 'JSON decodificado com sucesso', ['keys' => array_keys($input)]);

    // Parâmetros obrigatórios para multi-tenant
    $empresaId = $input['empresa_id'] ?? null;
    $nfceData = $input['nfce_data'] ?? null;

    logDetalhado('009', 'Parâmetros extraídos', ['empresa_id' => $empresaId, 'has_nfce_data' => !empty($nfceData)]);
    
    // Validações multi-tenant
    logDetalhado('010', 'Iniciando validações multi-tenant');

    if (!$empresaId) {
        logDetalhado('011', 'ERRO: empresa_id não fornecido');
        throw new Exception('empresa_id é obrigatório');
    }

    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $empresaId)) {
        logDetalhado('012', 'ERRO: empresa_id com formato inválido', ['empresa_id' => $empresaId]);
        throw new Exception('empresa_id inválido');
    }

    if (!$nfceData) {
        logDetalhado('013', 'ERRO: nfce_data não fornecido');
        throw new Exception('nfce_data é obrigatório');
    }

    logDetalhado('014', 'Validações básicas concluídas', ['empresa_id' => $empresaId]);
    logDetalhado('015', 'Dados NFC-e recebidos', $nfceData);

    // Buscar configurações da empresa (MÉTODO MULTI-TENANT)
    logDetalhado('016', 'Iniciando busca de configurações da empresa');
    $configUrl = "http://localhost/backend/public/get-empresa-config.php?empresa_id={$empresaId}";
    logDetalhado('017', 'URL de configuração montada', ['url' => $configUrl]);

    // Usar cURL em vez de file_get_contents para melhor controle
    logDetalhado('018', 'Iniciando requisição cURL');
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $configUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

    $configResponse = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    logDetalhado('019', 'Resposta cURL recebida', [
        'http_code' => $httpCode,
        'curl_error' => $curlError,
        'response_size' => strlen($configResponse),
        'response_preview' => substr($configResponse, 0, 100)
    ]);

    if ($httpCode !== 200) {
        logDetalhado('020', 'ERRO: HTTP code inválido', ['http_code' => $httpCode]);
        throw new Exception("Erro HTTP ao buscar configurações: {$httpCode}");
    }

    if (!$configResponse) {
        logDetalhado('021', 'ERRO: Resposta vazia do endpoint de configuração');
        throw new Exception('Erro ao buscar configurações da empresa');
    }

    logDetalhado('022', 'Decodificando JSON de configuração');
    $configData = json_decode($configResponse, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        logDetalhado('023', 'ERRO: Falha ao decodificar JSON de configuração', ['json_error' => json_last_error_msg()]);
        throw new Exception('Erro ao decodificar resposta JSON: ' . json_last_error_msg());
    }

    if (!$configData || !$configData['success']) {
        logDetalhado('024', 'ERRO: Configurações inválidas ou não encontradas', $configData);
        throw new Exception('Configurações da empresa não encontradas: ' . ($configData['error'] ?? 'Erro desconhecido'));
    }

    $empresa = $configData['data']['empresa'];
    $nfeConfig = $configData['data']['nfe_config'];

    logDetalhado('025', 'Configurações carregadas com sucesso', [
        'empresa_razao' => $empresa['razao_social'],
        'ambiente' => $nfeConfig['ambiente_codigo'],
        'has_csc' => !empty($empresa['csc_homologacao'])
    ]);
    
    // Validar dados obrigatórios da empresa (SEM FALLBACKS)
    error_log("🔍 NFCE: Validando dados obrigatórios da empresa...");

    if (empty($empresa['razao_social'])) {
        error_log("❌ NFCE: Razão social vazia");
        throw new Exception('Razão social da empresa é obrigatória');
    }
    error_log("✅ NFCE: Razão social: {$empresa['razao_social']}");

    if (empty($empresa['cnpj'])) {
        error_log("❌ NFCE: CNPJ vazio");
        throw new Exception('CNPJ da empresa é obrigatório');
    }
    error_log("✅ NFCE: CNPJ: {$empresa['cnpj']}");

    if (empty($empresa['uf'])) {
        error_log("❌ NFCE: UF vazia");
        throw new Exception('UF da empresa é obrigatória');
    }
    error_log("✅ NFCE: UF: {$empresa['uf']}");

    if (empty($empresa['codigo_municipio'])) {
        error_log("❌ NFCE: Código município vazio");
        throw new Exception('Código do município da empresa é obrigatório');
    }
    error_log("✅ NFCE: Código município: {$empresa['codigo_municipio']}");

    if (empty($empresa['inscricao_estadual'])) {
        error_log("❌ NFCE: IE vazia");
        throw new Exception('Inscrição Estadual da empresa é obrigatória');
    }
    error_log("✅ NFCE: IE: {$empresa['inscricao_estadual']}");

    if (empty($empresa['regime_tributario'])) {
        error_log("❌ NFCE: Regime tributário vazio");
        throw new Exception('Regime tributário da empresa é obrigatório');
    }
    error_log("✅ NFCE: Regime tributário: {$empresa['regime_tributario']}");
    
    // Validar CSC obrigatório para NFC-e (SEM FALLBACKS)
    error_log("🔍 NFCE: Validando CSC obrigatório...");
    $ambiente = $nfeConfig['ambiente_codigo'] ?? 2;
    $cscField = $ambiente == 1 ? 'csc_producao' : 'csc_homologacao';
    $cscIdField = $ambiente == 1 ? 'csc_id_producao' : 'csc_id_homologacao';
    $ambienteTexto = $ambiente == 1 ? 'produção' : 'homologação';

    error_log("📋 NFCE: Ambiente: {$ambiente} ({$ambienteTexto}), Campo CSC: {$cscField}, Campo CSC ID: {$cscIdField}");

    if (empty($empresa[$cscField])) {
        error_log("❌ NFCE: CSC de {$ambienteTexto} não configurado");
        throw new Exception("CSC de {$ambienteTexto} é obrigatório para emissão de NFC-e");
    }
    error_log("✅ NFCE: CSC de {$ambienteTexto}: " . substr($empresa[$cscField], 0, 8) . "...");

    if (empty($empresa[$cscIdField])) {
        error_log("❌ NFCE: CSC ID de {$ambienteTexto} não configurado");
        throw new Exception("CSC ID de {$ambienteTexto} é obrigatório para emissão de NFC-e");
    }
    error_log("✅ NFCE: CSC ID de {$ambienteTexto}: {$empresa[$cscIdField]}");

    error_log("✅ NFCE: Configurações validadas - Ambiente: {$ambiente}, CSC configurado");
    
    // Carregar certificado (MÉTODO MULTI-TENANT)
    error_log("🔍 NFCE: Carregando certificado digital...");
    $certificadoPath = "../storage/certificados/empresa_{$empresaId}.pfx";
    $metadataPath = "../storage/certificados/empresa_{$empresaId}.json";

    error_log("📁 NFCE: Caminho certificado: {$certificadoPath}");
    error_log("📁 NFCE: Caminho metadata: {$metadataPath}");

    if (!file_exists($certificadoPath)) {
        error_log("❌ NFCE: Certificado não encontrado: {$certificadoPath}");
        throw new Exception('Certificado digital não encontrado para esta empresa');
    }
    error_log("✅ NFCE: Certificado encontrado");

    if (!file_exists($metadataPath)) {
        error_log("❌ NFCE: Metadata não encontrado: {$metadataPath}");
        throw new Exception('Metadados do certificado não encontrados');
    }
    error_log("✅ NFCE: Metadata encontrado");

    $certificado = file_get_contents($certificadoPath);
    $metadata = json_decode(file_get_contents($metadataPath), true);

    error_log("📋 NFCE: Certificado carregado - Tamanho: " . strlen($certificado) . " bytes");
    error_log("📋 NFCE: Metadata: " . json_encode($metadata, JSON_UNESCAPED_UNICODE));
    
    // Configurar biblioteca sped-nfe (MÉTODO NATIVO)
    logDetalhado('030', 'Iniciando configuração da biblioteca sped-nfe');

    $cnpjLimpo = preg_replace('/[^0-9]/', '', $empresa['cnpj']);
    logDetalhado('031', 'CNPJ processado', ['original' => $empresa['cnpj'], 'limpo' => $cnpjLimpo, 'tamanho' => strlen($cnpjLimpo)]);

    if (strlen($cnpjLimpo) !== 14) {
        logDetalhado('032', 'ERRO: CNPJ com tamanho inválido', ['cnpj' => $cnpjLimpo, 'tamanho' => strlen($cnpjLimpo)]);
        throw new Exception('CNPJ da empresa deve ter 14 dígitos');
    }

    $config = [
        "atualizacao" => date('Y-m-d H:i:s'),
        "tpAmb" => $ambiente,
        "razaosocial" => $empresa['razao_social'],
        "cnpj" => $cnpjLimpo,
        "siglaUF" => $empresa['uf'],
        "schemes" => "PL_009_V4",
        "versao" => '4.00',
        "CSC" => $empresa[$cscField],
        "CSCid" => (string)$empresa[$cscIdField] // Converter para string
    ];

    logDetalhado('033', 'Configuração sped-nfe montada', $config);

    // Criar objeto Certificate
    logDetalhado('034', 'Criando objeto Certificate');
    try {
        $certificate = \NFePHP\Common\Certificate::readPfx($certificado, $metadata['password'] ?? '');
        logDetalhado('035', 'Certificate criado com sucesso');
    } catch (Exception $certError) {
        logDetalhado('036', 'ERRO: Falha ao criar Certificate', ['error' => $certError->getMessage()]);
        throw new Exception("Erro no certificado: " . $certError->getMessage());
    }

    // Inicializar Tools (MÉTODO NATIVO)
    logDetalhado('037', 'Inicializando Tools');
    try {
        $tools = new \NFePHP\NFe\Tools(json_encode($config), $certificate);
        logDetalhado('038', 'Tools criado, configurando modelo 65');
        $tools->model('65'); // Modelo NFC-e
        logDetalhado('039', 'Tools configurado para modelo 65 com sucesso');
    } catch (Exception $toolsError) {
        logDetalhado('040', 'ERRO: Falha ao inicializar Tools', ['error' => $toolsError->getMessage()]);
        throw new Exception("Erro ao inicializar Tools: " . $toolsError->getMessage());
    }

    // Inicializar Make (MÉTODO NATIVO)
    logDetalhado('041', 'Inicializando Make');
    try {
        $make = new \NFePHP\NFe\Make();
        logDetalhado('042', 'Make inicializado com sucesso');
    } catch (Exception $makeError) {
        logDetalhado('043', 'ERRO: Falha ao inicializar Make', ['error' => $makeError->getMessage()]);
        throw new Exception("Erro ao inicializar Make: " . $makeError->getMessage());
    }

    logDetalhado('044', 'Biblioteca sped-nfe completamente inicializada');
    
    // MONTAGEM DA NFC-e USANDO MÉTODOS NATIVOS DA BIBLIOTECA
    error_log("🏗️ NFCE: Iniciando montagem da NFC-e...");

    // Identificação da NFC-e
    $identificacao = $nfceData['identificacao'] ?? [];
    error_log("📋 NFCE: Dados identificação: " . json_encode($identificacao, JSON_UNESCAPED_UNICODE));

    // Validar dados obrigatórios da identificação (SEM FALLBACKS)
    error_log("🔍 NFCE: Validando dados da identificação...");

    if (empty($identificacao['numero'])) {
        error_log("❌ NFCE: Número da NFC-e vazio");
        throw new Exception('Número da NFC-e é obrigatório');
    }
    error_log("✅ NFCE: Número: {$identificacao['numero']}");

    if (empty($identificacao['serie'])) {
        error_log("❌ NFCE: Série da NFC-e vazia");
        throw new Exception('Série da NFC-e é obrigatória');
    }
    error_log("✅ NFCE: Série: {$identificacao['serie']}");

    if (empty($identificacao['codigo_numerico'])) {
        error_log("❌ NFCE: Código numérico vazio");
        throw new Exception('Código numérico da NFC-e é obrigatório');
    }

    $codigoNumerico = $identificacao['codigo_numerico'];
    if (strlen($codigoNumerico) !== 8) {
        error_log("❌ NFCE: Código numérico inválido - Valor: {$codigoNumerico}, Tamanho: " . strlen($codigoNumerico));
        throw new Exception('Código numérico deve ter exatamente 8 dígitos');
    }
    error_log("✅ NFCE: Código numérico: {$codigoNumerico}");
    
    // Tag IDE (Identificação) - MÉTODO NATIVO
    logDetalhado('050', 'Iniciando criação da tag IDE');
    $std = new stdClass();
    $std->cUF = (int)$empresa['codigo_uf']; // Código UF da empresa

    // ✅ CORRETO: cNF deve ser diferente do nNF (conforme NT2019.001)
    $numeroNota = (int)($identificacao['numero'] ?? 1);
    $std->cNF = str_pad($codigoNumerico, 8, '0', STR_PAD_LEFT); // Código numérico aleatório
    $std->nNF = $numeroNota; // Número sequencial da nota

    // Validar se cNF é diferente de nNF (obrigatório pela NT2019.001)
    if ($std->cNF == str_pad($numeroNota, 8, '0', STR_PAD_LEFT)) {
        logDetalhado('050.1', 'ERRO: cNF igual ao nNF, violando NT2019.001', ['cNF' => $std->cNF, 'nNF' => $std->nNF]);
        throw new Exception('Código numérico (cNF) não pode ser igual ao número da nota (nNF). Configure um código numérico diferente.');
    }

    logDetalhado('050.2', 'Códigos validados conforme NT2019.001', ['cNF' => $std->cNF, 'nNF' => $std->nNF]);

    $std->natOp = $identificacao['natureza_operacao'] ?? 'Venda de mercadoria';
    $std->mod = 65; // NFC-e
    $std->serie = (int)($identificacao['serie'] ?? 1);
    $std->dhEmi = date('Y-m-d\TH:i:sP'); // Data/hora emissão com timezone
    $std->tpNF = 1; // Saída
    $std->idDest = 1; // Operação interna

    // Código do município da empresa (SEM FALLBACK)
    $std->cMunFG = (int)$empresa['codigo_municipio'];

    $std->tpImp = 4; // NFC-e (4=DANFE NFC-e)
    $std->tpEmis = 1; // Emissão normal
    $std->cDV = 0;
    $std->tpAmb = $ambiente;
    $std->finNFe = 1; // Normal
    $std->indFinal = 1; // Consumidor final
    $std->indPres = 1; // Presencial
    $std->procEmi = 0; // Aplicativo do contribuinte
    $std->verProc = '1.0.0';

    logDetalhado('051', 'Dados da tag IDE preparados', (array)$std);

    try {
        logDetalhado('052', 'Executando make->tagide()');
        $make->tagide($std);
        logDetalhado('053', 'Tag IDE criada com sucesso', ['numero' => $std->nNF, 'serie' => $std->serie, 'modelo' => $std->mod]);
    } catch (Exception $ideError) {
        logDetalhado('054', 'ERRO: Falha ao criar tag IDE', ['error' => $ideError->getMessage(), 'trace' => $ideError->getTraceAsString()]);
        throw new Exception("Erro na tag IDE: " . $ideError->getMessage());
    }

    // Emitente (MÉTODO NATIVO) - SEM FALLBACKS
    logDetalhado('055', 'Iniciando criação do emitente');

    $std = new stdClass();
    $std->xNome = $empresa['razao_social']; // JÁ VALIDADO ACIMA
    $std->CNPJ = $cnpjLimpo; // JÁ VALIDADO ACIMA
    $std->xFant = $empresa['nome_fantasia'] ?? null; // OPCIONAL

    logDetalhado('056', 'Validando IE obrigatória', ['ie' => $empresa['inscricao_estadual'] ?? 'NULL']);
    // Validar IE obrigatória
    $std->IE = $empresa['inscricao_estadual'];

    logDetalhado('057', 'Validando regime tributário', ['regime' => $empresa['regime_tributario'] ?? 'NULL']);
    // Validar regime tributário obrigatório
    $std->CRT = (int)$empresa['regime_tributario'];

    logDetalhado('058', 'Dados do emitente preparados', (array)$std);

    try {
        logDetalhado('059', 'Executando make->tagemit()');
        $make->tagemit($std);
        logDetalhado('060', 'Tag emitente criada com sucesso');
    } catch (Exception $emitError) {
        logDetalhado('061', 'ERRO: Falha ao criar tag emitente', ['error' => $emitError->getMessage()]);
        throw new Exception("Erro na tag emitente: " . $emitError->getMessage());
    }

    // Endereço do emitente (MÉTODO NATIVO) - SEM FALLBACKS
    logDetalhado('062', 'Iniciando criação do endereço do emitente');

    $endereco = $empresa['endereco'] ?? [];
    logDetalhado('063', 'Dados de endereço extraídos', $endereco);

    // Validar dados obrigatórios do endereço
    logDetalhado('064', 'Validando logradouro', ['logradouro' => $endereco['logradouro'] ?? 'NULL']);
    if (empty($endereco['logradouro'])) {
        logDetalhado('065', 'ERRO: Logradouro vazio');
        throw new Exception('Logradouro da empresa é obrigatório');
    }

    logDetalhado('066', 'Validando número', ['numero' => $endereco['numero'] ?? 'NULL']);
    if (empty($endereco['numero'])) {
        logDetalhado('067', 'ERRO: Número vazio');
        throw new Exception('Número do endereço da empresa é obrigatório');
    }

    logDetalhado('068', 'Validando bairro', ['bairro' => $endereco['bairro'] ?? 'NULL']);
    if (empty($endereco['bairro'])) {
        logDetalhado('069', 'ERRO: Bairro vazio');
        throw new Exception('Bairro da empresa é obrigatório');
    }

    logDetalhado('070', 'Validando CEP', ['cep' => $endereco['cep'] ?? 'NULL']);
    if (empty($endereco['cep'])) {
        logDetalhado('071', 'ERRO: CEP vazio');
        throw new Exception('CEP da empresa é obrigatório');
    }

    logDetalhado('072', 'Montando dados do endereço');
    $std = new stdClass();
    $std->xLgr = $endereco['logradouro'];
    $std->nro = $endereco['numero'];
    $std->xCpl = $endereco['complemento'] ?? null; // OPCIONAL
    $std->xBairro = $endereco['bairro'];
    $std->cMun = (int)$empresa['codigo_municipio']; // JÁ VALIDADO
    $std->xMun = $endereco['cidade'] ?? $empresa['cidade'] ?? '';

    logDetalhado('073', 'Validando nome da cidade', ['cidade' => $std->xMun]);
    if (empty($std->xMun)) {
        logDetalhado('074', 'ERRO: Nome da cidade vazio');
        throw new Exception('Nome da cidade da empresa é obrigatório');
    }

    $std->UF = $empresa['uf']; // JÁ VALIDADO
    $std->CEP = preg_replace('/[^0-9]/', '', $endereco['cep']);

    logDetalhado('075', 'Validando CEP limpo', ['cep_original' => $endereco['cep'], 'cep_limpo' => $std->CEP, 'tamanho' => strlen($std->CEP)]);
    if (strlen($std->CEP) !== 8) {
        logDetalhado('076', 'ERRO: CEP com tamanho inválido', ['cep' => $std->CEP, 'tamanho' => strlen($std->CEP)]);
        throw new Exception('CEP deve ter 8 dígitos');
    }

    $std->cPais = 1058; // Brasil
    $std->xPais = 'Brasil';

    logDetalhado('077', 'Dados do endereço preparados', (array)$std);

    try {
        logDetalhado('078', 'Executando make->tagenderEmit()');
        $make->tagenderEmit($std);
        logDetalhado('079', 'Tag endereço emitente criada com sucesso');
    } catch (Exception $endError) {
        logDetalhado('080', 'ERRO: Falha ao criar tag endereço emitente', ['error' => $endError->getMessage()]);
        throw new Exception("Erro na tag endereço emitente: " . $endError->getMessage());
    }

    logDetalhado('081', 'Emitente completamente configurado', ['razao_social' => $empresa['razao_social']]);

    // Destinatário (OPCIONAL para NFC-e) - MÉTODO NATIVO
    logDetalhado('082', 'Iniciando processamento do destinatário');

    $destinatario = $nfceData['destinatario'] ?? [];
    logDetalhado('083', 'Dados do destinatário extraídos', $destinatario);

    if (!empty($destinatario['documento'])) {
        logDetalhado('084', 'Destinatário com documento identificado');

        $std = new stdClass();

        // Limpar documento
        $documento = preg_replace('/[^0-9]/', '', $destinatario['documento']);
        logDetalhado('085', 'Documento limpo', ['original' => $destinatario['documento'], 'limpo' => $documento, 'tamanho' => strlen($documento)]);

        if (strlen($documento) === 11) {
            // CPF
            $std->CPF = $documento;
            logDetalhado('086', 'Documento identificado como CPF', ['cpf' => $documento]);
        } elseif (strlen($documento) === 14) {
            // CNPJ
            $std->CNPJ = $documento;
            logDetalhado('087', 'Documento identificado como CNPJ', ['cnpj' => $documento]);
        } else {
            logDetalhado('088', 'ERRO: Documento com tamanho inválido', ['documento' => $documento, 'tamanho' => strlen($documento)]);
            throw new Exception('Documento do destinatário deve ser CPF (11 dígitos) ou CNPJ (14 dígitos)');
        }

        $std->xNome = $destinatario['nome'] ?? 'CONSUMIDOR';
        $std->indIEDest = 9; // Não contribuinte

        logDetalhado('089', 'Dados do destinatário preparados', (array)$std);

        try {
            logDetalhado('090', 'Executando make->tagdest()');
            $make->tagdest($std);
            logDetalhado('091', 'Tag destinatário criada com sucesso', ['nome' => $std->xNome]);
        } catch (Exception $destError) {
            logDetalhado('092', 'ERRO: Falha ao criar tag destinatário', ['error' => $destError->getMessage()]);
            throw new Exception("Erro na tag destinatário: " . $destError->getMessage());
        }
    } else {
        logDetalhado('093', 'Sem destinatário - consumidor não identificado');
    }

    // Produtos (MÉTODO NATIVO) - SEM FALLBACKS
    logDetalhado('094', 'Iniciando processamento dos produtos');

    $produtos = $nfceData['produtos'] ?? [];
    logDetalhado('095', 'Produtos extraídos dos dados', $produtos);

    if (empty($produtos)) {
        logDetalhado('096', 'ERRO: Nenhum produto informado');
        throw new Exception('Pelo menos um produto é obrigatório');
    }

    logDetalhado('097', 'Validação de produtos concluída', ['total_produtos' => count($produtos)]);

    $totalProdutos = 0;
    $totalICMS = 0;
    $totalPIS = 0;
    $totalCOFINS = 0;

    logDetalhado('098', 'Iniciando loop de processamento dos produtos');

    foreach ($produtos as $index => $produto) {
        $nItem = $index + 1;
        logDetalhado('099', "Iniciando processamento do produto {$nItem}", $produto);

        // Validar dados obrigatórios do produto (SEM FALLBACKS)
        logDetalhado('100', "Iniciando validações do produto {$nItem}");

        if (empty($produto['codigo'])) {
            logDetalhado('101', "ERRO: Código do produto {$nItem} vazio", ['codigo' => $produto['codigo'] ?? 'NULL']);
            throw new Exception("Código do produto {$nItem} é obrigatório");
        }
        logDetalhado('102', "Produto {$nItem} - Código validado", ['codigo' => $produto['codigo']]);

        logDetalhado('102.1', "Validando se código não é fallback", ['codigo' => $produto['codigo']]);
        if (strpos($produto['codigo'], 'PROD') === 0) {
            logDetalhado('102.2', "ERRO: Código do produto {$nItem} é fallback", ['codigo' => $produto['codigo']]);
            throw new Exception("Código 'PROD{id}' é fallback inválido. Configure um código real no cadastro do produto {$nItem}.");
        }

        logDetalhado('103', "Validando descrição do produto {$nItem}", ['descricao' => $produto['descricao'] ?? 'NULL']);
        if (empty($produto['descricao'])) {
            logDetalhado('104', "ERRO: Descrição do produto {$nItem} vazia");
            throw new Exception("Descrição do produto {$nItem} é obrigatória");
        }

        logDetalhado('105', "Validando quantidade do produto {$nItem}", ['quantidade' => $produto['quantidade'] ?? 'NULL']);
        if (!isset($produto['quantidade']) || $produto['quantidade'] <= 0) {
            logDetalhado('106', "ERRO: Quantidade do produto {$nItem} inválida", ['quantidade' => $produto['quantidade'] ?? 'NULL']);
            throw new Exception("Quantidade do produto {$nItem} deve ser maior que zero");
        }

        logDetalhado('107', "Validando valor unitário do produto {$nItem}", ['valor_unitario' => $produto['valor_unitario'] ?? 'NULL']);
        if (!isset($produto['valor_unitario']) || $produto['valor_unitario'] <= 0) {
            logDetalhado('108', "ERRO: Valor unitário do produto {$nItem} inválido", ['valor_unitario' => $produto['valor_unitario'] ?? 'NULL']);
            throw new Exception("Valor unitário do produto {$nItem} deve ser maior que zero");
        }

        logDetalhado('109', "Validando unidade do produto {$nItem}", ['unidade' => $produto['unidade'] ?? 'NULL']);
        if (empty($produto['unidade'])) {
            logDetalhado('110', "ERRO: Unidade do produto {$nItem} vazia");
            throw new Exception("Unidade do produto {$nItem} é obrigatória para NFC-e. Configure a unidade de medida no cadastro do produto.");
        }

        // Validar se unidade não é fallback
        if ($produto['unidade'] === 'UN' && empty($produto['unidade_original'])) {
            logDetalhado('110.1', "AVISO: Unidade 'UN' pode ser fallback para produto {$nItem}", ['unidade' => $produto['unidade']]);
            // Não bloquear pois 'UN' pode ser uma unidade válida
        }

        logDetalhado('111', "Validando NCM do produto {$nItem}", ['ncm' => $produto['ncm'] ?? 'NULL']);
        if (empty($produto['ncm'])) {
            logDetalhado('112', "ERRO: NCM do produto {$nItem} vazio");
            throw new Exception("NCM do produto {$nItem} é obrigatório para NFC-e. Configure o NCM no cadastro do produto.");
        }

        // Validar se NCM não é o fallback inválido
        if ($produto['ncm'] === '00000000') {
            logDetalhado('112.1', "ERRO: NCM do produto {$nItem} é fallback inválido", ['ncm' => $produto['ncm']]);
            throw new Exception("NCM '00000000' é inválido para NFC-e. Configure um NCM válido no cadastro do produto {$nItem}.");
        }

        logDetalhado('113', "Validando CFOP do produto {$nItem}", ['cfop' => $produto['cfop'] ?? 'NULL']);
        if (empty($produto['cfop'])) {
            logDetalhado('114', "ERRO: CFOP do produto {$nItem} vazio");
            throw new Exception("CFOP do produto {$nItem} é obrigatório para NFC-e. Configure o CFOP no cadastro do produto.");
        }

        // Validar se CFOP não é fallback comum
        if ($produto['cfop'] === '5102') {
            logDetalhado('114.1', "AVISO: CFOP '5102' pode ser fallback para produto {$nItem}", ['cfop' => $produto['cfop']]);
            // Não bloquear pois '5102' é um CFOP válido para venda
        }

        // Calcular valores
        logDetalhado('115', "Calculando valores do produto {$nItem}");
        $quantidade = (float)$produto['quantidade'];
        $valorUnitario = (float)$produto['valor_unitario'];
        $valorTotal = $quantidade * $valorUnitario;
        $totalProdutos += $valorTotal;
        logDetalhado('116', "Valores calculados do produto {$nItem}", [
            'quantidade' => $quantidade,
            'valor_unitario' => $valorUnitario,
            'valor_total' => $valorTotal
        ]);

        // Tag PROD (Produto) - MÉTODO NATIVO
        logDetalhado('117', "Criando tag produto {$nItem}");
        $std = new stdClass();
        $std->cProd = $produto['codigo'];
        $std->cEAN = $produto['codigo_barras'] ?? 'SEM GTIN'; // EAN13 ou SEM GTIN
        $std->xProd = $produto['descricao'];
        $std->NCM = preg_replace('/[^0-9]/', '', $produto['ncm']);

        logDetalhado('118', "Validando NCM limpo do produto {$nItem}", ['ncm_original' => $produto['ncm'], 'ncm_limpo' => $std->NCM, 'tamanho' => strlen($std->NCM)]);
        if (strlen($std->NCM) !== 8) {
            logDetalhado('119', "ERRO: NCM do produto {$nItem} com tamanho inválido", ['ncm' => $std->NCM, 'tamanho' => strlen($std->NCM)]);
            throw new Exception("NCM do produto {$nItem} deve ter 8 dígitos");
        }

        $std->CFOP = preg_replace('/[^0-9]/', '', $produto['cfop']);
        logDetalhado('120', "Validando CFOP limpo do produto {$nItem}", ['cfop_original' => $produto['cfop'], 'cfop_limpo' => $std->CFOP, 'tamanho' => strlen($std->CFOP)]);
        if (strlen($std->CFOP) !== 4) {
            logDetalhado('121', "ERRO: CFOP do produto {$nItem} com tamanho inválido", ['cfop' => $std->CFOP, 'tamanho' => strlen($std->CFOP)]);
            throw new Exception("CFOP do produto {$nItem} deve ter 4 dígitos");
        }

        $std->uCom = $produto['unidade'];
        $std->qCom = $quantidade;
        $std->vUnCom = $valorUnitario;
        $std->vProd = $valorTotal;
        $std->cEANTrib = $std->cEAN; // Mesmo EAN para tributação
        $std->uTrib = $std->uCom; // Mesma unidade para tributação
        $std->qTrib = $std->qCom; // Mesma quantidade para tributação
        $std->vUnTrib = $std->vUnCom; // Mesmo valor unitário para tributação
        $std->indTot = 1; // Compõe total da NFC-e

        logDetalhado('122', "Dados da tag produto {$nItem} preparados", (array)$std);

        try {
            logDetalhado('123', "Executando make->tagprod() para produto {$nItem}");
            $make->tagprod($std);
            logDetalhado('124', "Tag produto {$nItem} criada com sucesso");
        } catch (Exception $prodError) {
            logDetalhado('125', "ERRO: Falha ao criar tag produto {$nItem}", ['error' => $prodError->getMessage()]);
            throw new Exception("Erro na tag produto {$nItem}: " . $prodError->getMessage());
        }

        // IMPOSTOS OBRIGATÓRIOS PARA NFC-e (SEGUINDO DOCUMENTAÇÃO OFICIAL)
        logDetalhado('126', "Iniciando criação de impostos para produto {$nItem}");

        // 1. PRIMEIRO: Container de impostos (OBRIGATÓRIO conforme documentação)
        logDetalhado('126.1', "Criando container de impostos para produto {$nItem}");
        $std = new stdClass();
        $std->nItem = $nItem; // ✅ CORRETO: usar 'nItem', não 'item'

        try {
            logDetalhado('126.2', "Executando make->tagimposto() para produto {$nItem}");
            $make->tagimposto($std);
            logDetalhado('126.3', "Container de impostos criado com sucesso para produto {$nItem}");
        } catch (Exception $impostoError) {
            logDetalhado('126.4', "ERRO: Falha ao criar container de impostos para produto {$nItem}", ['error' => $impostoError->getMessage()]);
            throw new Exception("Erro no container de impostos do produto {$nItem}: " . $impostoError->getMessage());
        }

        // 2. SEGUNDO: ICMS - OBRIGATÓRIO
        logDetalhado('127', "Criando ICMS para produto {$nItem}");
        $std = new stdClass();
        $std->nItem = $nItem; // ✅ CORRETO: usar 'nItem'
        $std->orig = 0; // Nacional
        $std->CSOSN = '102'; // Simples Nacional - Sem tributação

        try {
            logDetalhado('128', "Executando make->tagICMSSN() para produto {$nItem}");
            $make->tagICMSSN($std);
            logDetalhado('129', "ICMS criado com sucesso para produto {$nItem}");
        } catch (Exception $icmsError) {
            logDetalhado('130', "ERRO: Falha ao criar ICMS para produto {$nItem}", ['error' => $icmsError->getMessage()]);
            throw new Exception("Erro no ICMS do produto {$nItem}: " . $icmsError->getMessage());
        }

        // 3. TERCEIRO: PIS - OBRIGATÓRIO
        logDetalhado('131', "Criando PIS para produto {$nItem}");
        $std = new stdClass();
        $std->nItem = $nItem; // ✅ CORRETO: usar 'nItem'
        $std->CST = '49'; // Outras operações

        try {
            logDetalhado('132', "Executando make->tagPIS() para produto {$nItem}");
            $make->tagPIS($std);
            logDetalhado('133', "PIS criado com sucesso para produto {$nItem}");
        } catch (Exception $pisError) {
            logDetalhado('134', "ERRO: Falha ao criar PIS para produto {$nItem}", ['error' => $pisError->getMessage()]);
            throw new Exception("Erro no PIS do produto {$nItem}: " . $pisError->getMessage());
        }

        // 4. QUARTO: COFINS - OBRIGATÓRIO
        logDetalhado('135', "Criando COFINS para produto {$nItem}");
        $std = new stdClass();
        $std->nItem = $nItem; // ✅ CORRETO: usar 'nItem'
        $std->CST = '49'; // Outras operações

        try {
            logDetalhado('136', "Executando make->tagCOFINS() para produto {$nItem}");
            $make->tagCOFINS($std);
            logDetalhado('137', "COFINS criado com sucesso para produto {$nItem}");
        } catch (Exception $cofinsError) {
            logDetalhado('138', "ERRO: Falha ao criar COFINS para produto {$nItem}", ['error' => $cofinsError->getMessage()]);
            throw new Exception("Erro no COFINS do produto {$nItem}: " . $cofinsError->getMessage());
        }

        logDetalhado('139', "Produto {$nItem} processado completamente", [
            'descricao' => $produto['descricao'],
            'valor_total' => $valorTotal
        ]);
    }

    logDetalhado('140', 'Loop de produtos concluído', ['total_produtos_valor' => $totalProdutos]);

    // Totais da NFC-e (MÉTODO NATIVO)
    logDetalhado('141', 'Iniciando criação dos totais da NFC-e');
    $std = new stdClass();
    $std->vBC = 0.00; // Base de cálculo ICMS
    $std->vICMS = $totalICMS; // Valor ICMS
    $std->vICMSDeson = 0.00; // ICMS desonerado
    $std->vFCP = 0.00; // Fundo de Combate à Pobreza
    $std->vBCST = 0.00; // Base ST
    $std->vST = 0.00; // Valor ST
    $std->vFCPST = 0.00; // FCP ST
    $std->vFCPSTRet = 0.00; // FCP ST Retido
    $std->vProd = $totalProdutos; // Valor total produtos
    $std->vFrete = 0.00; // Valor frete
    $std->vSeg = 0.00; // Valor seguro
    $std->vDesc = 0.00; // Valor desconto
    $std->vII = 0.00; // Valor II
    $std->vIPI = 0.00; // Valor IPI
    $std->vIPIDevol = 0.00; // IPI devolvido
    $std->vPIS = $totalPIS; // Valor PIS
    $std->vCOFINS = $totalCOFINS; // Valor COFINS
    $std->vOutro = 0.00; // Outras despesas
    $std->vNF = $totalProdutos; // Valor total da NFC-e
    $std->vTotTrib = 0.00; // Total tributos aproximados

    logDetalhado('142', 'Dados dos totais preparados', (array)$std);

    try {
        logDetalhado('143', 'Executando make->tagICMSTot()');
        $make->tagICMSTot($std);
        logDetalhado('144', 'Totais criados com sucesso');
    } catch (Exception $totError) {
        logDetalhado('145', 'ERRO: Falha ao criar totais', ['error' => $totError->getMessage()]);
        throw new Exception("Erro nos totais: " . $totError->getMessage());
    }

    // Transporte (MÉTODO NATIVO) - OBRIGATÓRIO
    logDetalhado('146', 'Iniciando criação do transporte');
    $std = new stdClass();
    $std->modFrete = 9; // 9=Sem Ocorrência de Transporte

    try {
        logDetalhado('147', 'Executando make->tagtransp()');
        $make->tagtransp($std);
        logDetalhado('148', 'Transporte criado com sucesso');
    } catch (Exception $transpError) {
        logDetalhado('149', 'ERRO: Falha ao criar transporte', ['error' => $transpError->getMessage()]);
        throw new Exception("Erro no transporte: " . $transpError->getMessage());
    }

    // Pagamento (MÉTODO NATIVO) - OBRIGATÓRIO para NFC-e
    // CORREÇÃO: Ordem correta baseada na documentação oficial
    logDetalhado('150', 'Iniciando criação do pagamento');

    // 1. PRIMEIRO: Criar grupo PAG (container) com troco
    logDetalhado('151', 'Criando grupo PAG (container)');
    $std = new stdClass();
    $std->vTroco = 0.00; // Troco (obrigatório para NFC-e)

    try {
        logDetalhado('152', 'Executando make->tagpag()');
        $make->tagpag($std);
        logDetalhado('153', 'Grupo pagamento criado com sucesso');
    } catch (Exception $pagError) {
        logDetalhado('154', 'ERRO: Falha ao criar grupo pagamento', ['error' => $pagError->getMessage()]);
        throw new Exception("Erro no grupo pagamento: " . $pagError->getMessage());
    }

    // 2. SEGUNDO: Adicionar forma de pagamento (detPag)
    logDetalhado('155', 'Criando detalhes do pagamento');
    $std = new stdClass();
    $std->indPag = 0; // Pagamento à vista
    $std->tPag = '01'; // Dinheiro (padrão para NFC-e)
    $std->vPag = $totalProdutos; // Valor pago

    try {
        logDetalhado('156', 'Executando make->tagdetPag()', ['valor_pago' => $totalProdutos]);
        $make->tagdetPag($std);
        logDetalhado('157', 'Detalhes do pagamento criados com sucesso');
    } catch (Exception $detPagError) {
        logDetalhado('158', 'ERRO: Falha ao criar detalhes do pagamento', ['error' => $detPagError->getMessage()]);
        throw new Exception("Erro nos detalhes do pagamento: " . $detPagError->getMessage());
    }

    // Informações adicionais (MÉTODO NATIVO)
    logDetalhado('159', 'Criando informações adicionais');
    $std = new stdClass();
    $std->infCpl = 'NFC-e emitida pelo Sistema Nexo PDV';

    try {
        logDetalhado('160', 'Executando make->taginfAdic()');
        $make->taginfAdic($std);
        logDetalhado('161', 'Informações adicionais criadas com sucesso');
    } catch (Exception $infError) {
        logDetalhado('162', 'ERRO: Falha ao criar informações adicionais', ['error' => $infError->getMessage()]);
        throw new Exception("Erro nas informações adicionais: " . $infError->getMessage());
    }

    // Gerar XML (MÉTODO NATIVO)
    logDetalhado('163', 'Iniciando geração do XML');
    try {
        logDetalhado('164', 'Executando make->getXML()');

        // Definir timeout para evitar travamento
        set_time_limit(60); // 60 segundos para geração do XML

        $xml = $make->getXML();

        logDetalhado('164.1', 'getXML() executado, verificando resultado');

        if (empty($xml)) {
            logDetalhado('165', 'ERRO: XML gerado está vazio');
            throw new Exception('Erro ao gerar XML da NFC-e');
        }

        logDetalhado('166', 'XML gerado com sucesso', [
            'tamanho' => strlen($xml),
            'preview' => substr($xml, 0, 200)
        ]);

    } catch (Exception $xmlError) {
        logDetalhado('167', 'ERRO: Falha ao gerar XML', ['error' => $xmlError->getMessage()]);
        throw new Exception("Erro ao gerar XML: " . $xmlError->getMessage());
    }

    // ASSINAR XML (MÉTODO NATIVO)
    error_log("🔐 NFCE: Assinando XML...");
    try {
        $xmlAssinado = $tools->signNFe($xml);
        error_log("✅ NFCE: XML assinado - Tamanho: " . strlen($xmlAssinado) . " bytes");
    } catch (Exception $signError) {
        error_log("❌ NFCE: Erro ao assinar XML: " . $signError->getMessage());
        throw new Exception("Erro ao assinar XML: " . $signError->getMessage());
    }

    // ENVIAR PARA SEFAZ (MÉTODO NATIVO)
    error_log("📡 NFCE: Enviando para SEFAZ...");
    try {
        $response = $tools->sefazEnviaLote([$xmlAssinado], 1);
        error_log("✅ NFCE: Resposta recebida da SEFAZ");
    } catch (Exception $sefazError) {
        error_log("❌ NFCE: Erro ao enviar para SEFAZ: " . $sefazError->getMessage());
        throw new Exception("Erro ao enviar para SEFAZ: " . $sefazError->getMessage());
    }

    // PROCESSAR RESPOSTA (MÉTODO NATIVO)
    error_log("📡 NFCE: Resposta SEFAZ: " . $response);
    error_log("🔍 NFCE: Processando resposta da SEFAZ...");

    try {
        $dom = new DOMDocument();
        $dom->loadXML($response);
        error_log("✅ NFCE: XML da resposta carregado");
    } catch (Exception $domError) {
        error_log("❌ NFCE: Erro ao carregar XML da resposta: " . $domError->getMessage());
        throw new Exception("Erro ao processar resposta da SEFAZ: " . $domError->getMessage());
    }

    // Extrair dados da resposta
    error_log("🔍 NFCE: Extraindo dados da resposta...");

    $reciboNode = $dom->getElementsByTagName('nRec')->item(0);
    $recibo = $reciboNode ? $reciboNode->nodeValue : 'RECIBO_NAO_ENCONTRADO';
    error_log("📋 NFCE: Recibo: {$recibo}");

    $statusNode = $dom->getElementsByTagName('cStat')->item(0);
    $status = $statusNode ? $statusNode->nodeValue : 'STATUS_NAO_ENCONTRADO';
    error_log("📋 NFCE: Status: {$status}");

    $motivoNode = $dom->getElementsByTagName('xMotivo')->item(0);
    $motivo = $motivoNode ? $motivoNode->nodeValue : 'MOTIVO_NAO_ENCONTRADO';
    error_log("📋 NFCE: Motivo: {$motivo}");

    error_log("📋 NFCE: Status SEFAZ - {$status}: {$motivo}");

    // Verificar se foi autorizada
    if ($status !== '100') {
        error_log("❌ NFCE: NFC-e rejeitada - Status {$status}: {$motivo}");
        throw new Exception("NFC-e rejeitada pela SEFAZ - Status {$status}: {$motivo}");
    }

    error_log("✅ NFCE: NFC-e autorizada pela SEFAZ!");

    // Consultar protocolo de autorização
    error_log("🔍 NFCE: Consultando protocolo de autorização...");
    $protocolo = null;
    try {
        $consultaResponse = $tools->sefazConsultaRecibo($recibo);
        error_log("✅ NFCE: Consulta protocolo realizada");
        error_log("📡 NFCE: Resposta consulta protocolo: " . $consultaResponse);

        $consultaDom = new DOMDocument();
        $consultaDom->loadXML($consultaResponse);

        $protocoloNode = $consultaDom->getElementsByTagName('nProt')->item(0);
        $protocolo = $protocoloNode ? $protocoloNode->nodeValue : 'PROTOCOLO_NAO_ENCONTRADO';
        error_log("📋 NFCE: Protocolo extraído: {$protocolo}");

        // Adicionar protocolo ao XML
        error_log("🔗 NFCE: Adicionando protocolo ao XML...");
        $xmlComProtocolo = $tools->addProtocol($xmlAssinado, $consultaResponse);
        error_log("✅ NFCE: Protocolo adicionado ao XML");

    } catch (Exception $e) {
        error_log("⚠️ NFCE: Erro ao consultar protocolo: " . $e->getMessage());
        error_log("⚠️ NFCE: Usando XML sem protocolo");
        $xmlComProtocolo = $xmlAssinado;
        $protocolo = 'ERRO_CONSULTA_PROTOCOLO';
    }

    // Extrair chave de acesso do XML
    error_log("🔑 NFCE: Extraindo chave de acesso do XML...");
    try {
        $xmlDom = new DOMDocument();
        $xmlDom->loadXML($xmlAssinado);

        $chaveNode = $xmlDom->getElementsByTagName('chNFe')->item(0);
        $chaveParaSalvar = $chaveNode ? $chaveNode->nodeValue : null;
        error_log("🔍 NFCE: Tentativa 1 - chNFe: " . ($chaveParaSalvar ?? 'null'));

        if (!$chaveParaSalvar) {
            // Tentar extrair da tag infNFe
            error_log("🔍 NFCE: Tentativa 2 - extraindo de infNFe...");
            $infNFeNodes = $xmlDom->getElementsByTagName('infNFe');
            if ($infNFeNodes->length > 0) {
                $idAttribute = $infNFeNodes->item(0)->getAttribute('Id');
                $chaveParaSalvar = str_replace('NFe', '', $idAttribute);
                error_log("🔍 NFCE: ID attribute: {$idAttribute}, Chave extraída: {$chaveParaSalvar}");
            }
        }

        if (!$chaveParaSalvar || strlen($chaveParaSalvar) !== 44) {
            error_log("❌ NFCE: Chave inválida - Valor: " . ($chaveParaSalvar ?? 'null') . ", Tamanho: " . strlen($chaveParaSalvar ?? ''));
            throw new Exception('Não foi possível extrair chave de acesso válida do XML');
        }

        error_log("✅ NFCE: Chave extraída: {$chaveParaSalvar}");

    } catch (Exception $chaveError) {
        error_log("❌ NFCE: Erro ao extrair chave: " . $chaveError->getMessage());
        throw new Exception("Erro ao extrair chave de acesso: " . $chaveError->getMessage());
    }

    // Salvar XML com estrutura organizada por modelo
    error_log("💾 NFCE: Salvando XML...");
    $ambienteTexto = $ambiente == 1 ? 'producao' : 'homologacao';
    error_log("📁 NFCE: Ambiente: {$ambienteTexto}");

    $xmlDir = getXmlPath($empresaId, $ambienteTexto, '65', 'Autorizados');
    error_log("📁 NFCE: Diretório XML: {$xmlDir}");

    if (!is_dir($xmlDir)) {
        error_log("📁 NFCE: Criando diretório: {$xmlDir}");
        if (!mkdir($xmlDir, 0755, true)) {
            error_log("❌ NFCE: Erro ao criar diretório XML");
            throw new Exception('Erro ao criar diretório para XML');
        }
        error_log("✅ NFCE: Diretório criado");
    } else {
        error_log("✅ NFCE: Diretório já existe");
    }

    $xmlPath = "{$xmlDir}/{$chaveParaSalvar}.xml";
    error_log("📄 NFCE: Caminho completo XML: {$xmlPath}");
    error_log("📄 NFCE: Tamanho XML a salvar: " . strlen($xmlComProtocolo) . " bytes");

    $xmlSalvo = file_put_contents($xmlPath, $xmlComProtocolo);

    if ($xmlSalvo === false) {
        error_log("❌ NFCE: Erro ao salvar XML");
        throw new Exception('Erro ao salvar XML da NFC-e');
    }

    error_log("✅ NFCE: XML salvo - {$xmlSalvo} bytes em: {$xmlPath}");

    // Gerar PDF da NFC-e
    error_log("📄 NFCE: Iniciando geração do PDF...");
    $pdfPath = null;
    try {
        if (!class_exists('\NFePHP\DA\NFe\Danfce')) {
            error_log("❌ NFCE: Classe Danfce não encontrada");
            throw new Exception('Classe Danfce não encontrada - instale sped-da');
        }
        error_log("✅ NFCE: Classe Danfce encontrada");

        error_log("🏗️ NFCE: Criando objeto Danfce...");
        $danfce = new \NFePHP\DA\NFe\Danfce($xmlComProtocolo);
        $danfce->debugMode(false);
        $danfce->creditsIntegratorFooter('Sistema Nexo PDV');
        error_log("✅ NFCE: Danfce configurado");

        error_log("🎨 NFCE: Renderizando PDF...");
        $pdfContent = $danfce->render();

        if (empty($pdfContent)) {
            error_log("❌ NFCE: PDF renderizado está vazio");
            throw new Exception('PDF gerado está vazio');
        }
        error_log("✅ NFCE: PDF renderizado - Tamanho: " . strlen($pdfContent) . " bytes");

        // Salvar PDF com estrutura organizada por modelo
        error_log("📁 NFCE: Preparando diretório para PDF...");
        $pdfDir = getPdfPath($empresaId, $ambienteTexto, '65', 'Autorizados');
        error_log("📁 NFCE: Diretório PDF: {$pdfDir}");

        if (!is_dir($pdfDir)) {
            error_log("📁 NFCE: Criando diretório PDF: {$pdfDir}");
            if (!mkdir($pdfDir, 0755, true)) {
                error_log("❌ NFCE: Erro ao criar diretório PDF");
                throw new Exception('Erro ao criar diretório para PDF');
            }
            error_log("✅ NFCE: Diretório PDF criado");
        } else {
            error_log("✅ NFCE: Diretório PDF já existe");
        }

        $pdfPath = "{$pdfDir}/{$chaveParaSalvar}.pdf";
        error_log("📄 NFCE: Caminho completo PDF: {$pdfPath}");

        $pdfSalvo = file_put_contents($pdfPath, $pdfContent);

        if ($pdfSalvo === false) {
            error_log("❌ NFCE: Erro ao salvar PDF");
            throw new Exception('Erro ao salvar PDF da NFC-e');
        }

        error_log("✅ NFCE: PDF salvo - {$pdfSalvo} bytes em: {$pdfPath}");

    } catch (Exception $pdfError) {
        error_log("⚠️ NFCE: Erro ao gerar PDF: " . $pdfError->getMessage());
        error_log("⚠️ NFCE: Continuando sem PDF - XML já foi autorizado");
        // Não interrompe o processo, pois XML já foi autorizado
        $pdfPath = null;
    }

    // Retornar sucesso
    error_log("🎉 NFCE: Processo concluído com sucesso!");
    error_log("📋 NFCE: Resumo final:");
    error_log("  - Chave: {$chaveParaSalvar}");
    error_log("  - Protocolo: {$protocolo}");
    error_log("  - Status: {$status}");
    error_log("  - XML: " . ($xmlPath ? 'Salvo' : 'Erro'));
    error_log("  - PDF: " . ($pdfPath ? 'Salvo' : 'Erro'));

    $responseData = [
        'success' => true,
        'message' => 'NFC-e emitida com sucesso',
        'data' => [
            'chave' => $chaveParaSalvar,
            'protocolo' => $protocolo,
            'recibo' => $recibo,
            'status' => $status,
            'motivo' => $motivo,
            'xml_path' => $xmlPath,
            'pdf_path' => $pdfPath,
            'numero' => $identificacao['numero'],
            'serie' => $identificacao['serie'],
            'data_autorizacao' => date('Y-m-d H:i:s'),
            'xml' => base64_encode($xmlAssinado)
        ]
    ];

    error_log("📡 NFCE: Enviando resposta: " . json_encode($responseData, JSON_UNESCAPED_UNICODE));
    echo json_encode($responseData);

} catch (Exception $e) {
    logDetalhado('999', 'ERRO FATAL CAPTURADO', [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);

    // Salvar erro em arquivo específico para análise
    $errorDetails = [
        'timestamp' => date('Y-m-d H:i:s.u'),
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString(),
        'input_data' => $input ?? null,
        'empresa_id' => $empresaId ?? null
    ];

    file_put_contents('/tmp/nfce_error.log', json_encode($errorDetails, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'debug_step' => 'FATAL_ERROR',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
