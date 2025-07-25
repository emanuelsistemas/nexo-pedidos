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

    // Log no error_log do PHP
    error_log($logEntry);

    // Também salvar em arquivo específico com tratamento de erro
    try {
        // Garantir que o diretório existe
        $logDir = dirname('/tmp/nfce_detailed.log');
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }

        // Escrever no arquivo
        $result = file_put_contents('/tmp/nfce_detailed.log', $logEntry . "\n", FILE_APPEND | LOCK_EX);
        if ($result === false) {
            error_log("ERRO: Falha ao escrever no arquivo de log detalhado");
        }
    } catch (Exception $logError) {
        error_log("ERRO: Exceção ao escrever log detalhado: " . $logError->getMessage());
    }

    // COMENTADO: Output para debug imediato (estava contaminando resposta JSON)
    // echo json_encode([
    //     'debug_step' => $step,
    //     'debug_message' => $message,
    //     'debug_timestamp' => $timestamp
    // ]) . "\n";
    // flush();
}

// Função para buscar configuração PDV da empresa (LEI DOS DADOS REAIS)
function buscarConfiguracaoPDV($empresaId) {
    $supabaseUrl = 'https://xsrirnfwsjeovekwtluz.supabase.co';
    $supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcmlybmZ3c2plb3Zla3d0bHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NjQ5OTcsImV4cCI6MjA2MjI0MDk5N30.SrIEj_akvD9x-tltfpV3K4hQSKtPjJ_tQ4FFhPwiIy4';

    $url = $supabaseUrl . "/rest/v1/pdv_config?empresa_id=eq.{$empresaId}&select=seleciona_clientes";

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'apikey: ' . $supabaseKey,
        'Authorization: Bearer ' . $supabaseKey,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || !$response) {
        logDetalhado('PDV_CONFIG_ERROR', "Erro ao buscar configuração PDV da empresa {$empresaId}", [
            'http_code' => $httpCode,
            'response' => $response
        ]);
        return ['seleciona_clientes' => false]; // Fallback seguro
    }

    $data = json_decode($response, true);
    if (empty($data)) {
        logDetalhado('PDV_CONFIG_NOT_FOUND', "Configuração PDV não encontrada para empresa {$empresaId}");
        return ['seleciona_clientes' => false]; // Fallback seguro
    }

    $config = $data[0];
    logDetalhado('PDV_CONFIG_SUCCESS', "Configuração PDV carregada para empresa {$empresaId}", $config);

    return $config;
}

// ✅ NOVA FUNÇÃO: Buscar configurações fiscais para venda sem produto (código 999999)
function buscarConfiguracoesFiscaisVendaSemProduto($empresaId) {
    $supabaseUrl = 'https://xsrirnfwsjeovekwtluz.supabase.co';
    $supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcmlybmZ3c2plb3Zla3d0bHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NjQ5OTcsImV4cCI6MjA2MjI0MDk5N30.SrIEj_akvD9x-tltfpV3K4hQSKtPjJ_tQ4FFhPwiIy4';

    $url = $supabaseUrl . "/rest/v1/pdv_config?empresa_id=eq.{$empresaId}&select=venda_sem_produto_ncm,venda_sem_produto_cfop,venda_sem_produto_origem,venda_sem_produto_situacao_tributaria,venda_sem_produto_cest,venda_sem_produto_margem_st,venda_sem_produto_aliquota_icms,venda_sem_produto_aliquota_pis,venda_sem_produto_aliquota_cofins";

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'apikey: ' . $supabaseKey,
        'Authorization: Bearer ' . $supabaseKey,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || !$response) {
        logDetalhado('VENDA_SEM_PRODUTO_ERROR', "Erro ao buscar configurações fiscais de venda sem produto", [
            'empresa_id' => $empresaId,
            'http_code' => $httpCode,
            'response' => $response
        ]);
        return null;
    }

    $data = json_decode($response, true);
    if (empty($data)) {
        logDetalhado('VENDA_SEM_PRODUTO_NOT_FOUND', "Configurações fiscais de venda sem produto não encontradas", ['empresa_id' => $empresaId]);
        return null;
    }

    $config = $data[0];

    // ✅ MAPEAR configurações PDV para formato esperado pelo sistema fiscal
    $dadosFiscais = [
        'codigo' => '999999',
        'cfop' => $config['venda_sem_produto_cfop'] ?? '5102', // ✅ CORREÇÃO: Incluir CFOP da configuração PDV
        'ncm' => $config['venda_sem_produto_ncm'] ?? '22021000', // ✅ CORREÇÃO: Incluir NCM da configuração PDV
        'origem_produto' => (int)($config['venda_sem_produto_origem'] ?? 0),
        'margem_st' => (float)($config['venda_sem_produto_margem_st'] ?? 0),
        'cest' => $config['venda_sem_produto_cest'] ?? '',
        'aliquota_icms' => (float)($config['venda_sem_produto_aliquota_icms'] ?? 18.0),
        'aliquota_pis' => (float)($config['venda_sem_produto_aliquota_pis'] ?? 1.65),
        'aliquota_cofins' => (float)($config['venda_sem_produto_aliquota_cofins'] ?? 7.6),
        'cst_pis' => '01', // Operação tributável (base de cálculo = valor da operação)
        'cst_cofins' => '01', // Operação tributável (base de cálculo = valor da operação)
    ];

    // ✅ MAPEAR situação tributária para CST/CSOSN corretos
    $situacaoTributaria = $config['venda_sem_produto_situacao_tributaria'] ?? 'tributado_integral';

    switch ($situacaoTributaria) {
        case 'tributado_integral':
            $dadosFiscais['cst_icms'] = '00';      // Regime Normal
            $dadosFiscais['csosn_icms'] = '102';   // Simples Nacional
            break;
        case 'tributado_st':
            $dadosFiscais['cst_icms'] = '60';      // Regime Normal - ICMS cobrado anteriormente por ST
            $dadosFiscais['csosn_icms'] = '500';   // Simples Nacional - ICMS cobrado anteriormente por ST
            break;
        case 'isento':
            $dadosFiscais['cst_icms'] = '40';      // Regime Normal - Isenta
            $dadosFiscais['csosn_icms'] = '300';   // Simples Nacional - Imune
            break;
        case 'nao_tributado':
            $dadosFiscais['cst_icms'] = '41';      // Regime Normal - Não tributada
            $dadosFiscais['csosn_icms'] = '400';   // Simples Nacional - Não tributada
            break;
        default:
            $dadosFiscais['cst_icms'] = '00';      // Fallback seguro
            $dadosFiscais['csosn_icms'] = '102';   // Fallback seguro
    }

    logDetalhado('VENDA_SEM_PRODUTO_SUCCESS', "Configurações fiscais de venda sem produto carregadas", [
        'empresa_id' => $empresaId,
        'situacao_tributaria' => $situacaoTributaria,
        'cfop_configurado' => $config['venda_sem_produto_cfop'] ?? 'NULL',
        'dados_fiscais' => $dadosFiscais
    ]);

    return $dadosFiscais;
}

// Função para buscar dados fiscais REAIS do produto (LEI DOS DADOS REAIS)
function buscarDadosFiscaisProduto($codigoProduto, $empresaId) {
    $supabaseUrl = 'https://xsrirnfwsjeovekwtluz.supabase.co';
    $supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcmlybmZ3c2plb3Zla3d0bHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NjQ5OTcsImV4cCI6MjA2MjI0MDk5N30.SrIEj_akvD9x-tltfpV3K4hQSKtPjJ_tQ4FFhPwiIy4';

    // ✅ CÓDIGO ESPECIAL: 999999 = Venda sem Produto - usar configurações PDV
    if ($codigoProduto === '999999') {
        logDetalhado('VENDA_SEM_PRODUTO', "Código 999999 detectado - buscando configurações fiscais do PDV", ['empresa_id' => $empresaId]);
        return buscarConfiguracoesFiscaisVendaSemProduto($empresaId);
    }

    $url = $supabaseUrl . "/rest/v1/produtos?empresa_id=eq.{$empresaId}&codigo=eq.{$codigoProduto}&select=codigo,cst_pis,aliquota_pis,cst_cofins,aliquota_cofins,cst_icms,csosn_icms,aliquota_icms,origem_produto,margem_st,cest";

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'apikey: ' . $supabaseKey,
        'Authorization: Bearer ' . $supabaseKey,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5); // ✅ CORREÇÃO: Timeout menor
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3); // ✅ CORREÇÃO: Timeout de conexão

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || !$response) {
        logDetalhado('FISCAL_ERROR', "Erro ao buscar dados fiscais do produto {$codigoProduto}", [
            'http_code' => $httpCode,
            'response' => $response
        ]);
        return null;
    }

    $data = json_decode($response, true);
    if (empty($data)) {
        logDetalhado('FISCAL_ERROR', "Produto {$codigoProduto} não encontrado");
        return null;
    }

    $produto = $data[0];
    logDetalhado('FISCAL_SUCCESS', "Dados fiscais carregados para produto {$codigoProduto}", $produto);

    return $produto;
}

// ✅ NOVA FUNÇÃO: Validar dados fiscais conforme regime tributário
function validarDadosFiscaisPorRegime($produtoFiscal, $regimeTributario, $codigoProduto) {
    $isSimples = in_array((int)$regimeTributario, [1, 2]); // 1 ou 2 = Simples Nacional

    logDetalhado('FISCAL_VALIDATION', "Validando dados fiscais por regime", [
        'produto' => $codigoProduto,
        'regime_tributario' => $regimeTributario,
        'is_simples' => $isSimples,
        'dados_fiscais_completos' => $produtoFiscal
    ]);

    if ($isSimples) {
        // ✅ SIMPLES NACIONAL: Validar CSOSN obrigatório
        if (empty($produtoFiscal['csosn_icms'])) {
            logDetalhado('FISCAL_ERROR', "Produto {$codigoProduto} - CSOSN ICMS obrigatório para Simples Nacional", [
                'regime' => $regimeTributario,
                'csosn_icms' => $produtoFiscal['csosn_icms'] ?? 'NULL'
            ]);
            throw new Exception("Produto {$codigoProduto}: CSOSN ICMS é obrigatório para empresas do Simples Nacional");
        }

        logDetalhado('FISCAL_SUCCESS', "Produto {$codigoProduto} - Dados Simples Nacional válidos", [
            'csosn_icms' => $produtoFiscal['csosn_icms']
        ]);
    } else {
        // ✅ REGIME NORMAL: Validar CST obrigatório
        if (empty($produtoFiscal['cst_icms'])) {
            logDetalhado('FISCAL_ERROR', "Produto {$codigoProduto} - CST ICMS obrigatório para Regime Normal", [
                'regime' => $regimeTributario,
                'cst_icms' => $produtoFiscal['cst_icms'] ?? 'NULL'
            ]);
            throw new Exception("Produto {$codigoProduto}: CST ICMS é obrigatório para empresas do Regime Normal");
        }

        logDetalhado('FISCAL_SUCCESS', "Produto {$codigoProduto} - Dados Regime Normal válidos", [
            'cst_icms' => $produtoFiscal['cst_icms']
        ]);
    }

    // ✅ Validar PIS e COFINS (obrigatórios para ambos os regimes)
    if (empty($produtoFiscal['cst_pis'])) {
        throw new Exception("Produto {$codigoProduto}: CST PIS é obrigatório");
    }

    if (empty($produtoFiscal['cst_cofins'])) {
        throw new Exception("Produto {$codigoProduto}: CST COFINS é obrigatório");
    }

    return true;
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
    // ✅ CORREÇÃO: Definir timezone brasileiro no início
    date_default_timezone_set('America/Sao_Paulo');

    logDetalhado('002', 'Carregando dependências');
    require_once '../vendor/autoload.php';
    require_once '../includes/storage-paths.php';
    logDetalhado('003', 'Dependências carregadas com sucesso', [
        'timezone' => date_default_timezone_get()
    ]);

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

    // ✅ CORREÇÃO: Usar dados da empresa do payload (igual à NFe que funciona)
    logDetalhado('016', 'Extraindo dados da empresa do payload (seguindo padrão NFe)');

    // Verificar se dados da empresa estão no payload
    if (!isset($nfceData['empresa'])) {
        logDetalhado('017.ERROR', 'Dados da empresa não encontrados no payload');
        throw new Exception('Dados da empresa são obrigatórios no payload');
    }

    $empresa = $nfceData['empresa'];
    logDetalhado('018', 'Dados da empresa extraídos do payload', [
        'razao_social' => $empresa['razao_social'] ?? 'NULL',
        'cnpj' => $empresa['cnpj'] ?? 'NULL',
        'uf' => $empresa['uf'] ?? 'NULL',
        'total_campos' => count($empresa),
        'campos_disponiveis' => array_keys($empresa)
    ]);

    // Verificar se ambiente está no payload
    if (!isset($nfceData['ambiente'])) {
        logDetalhado('019.ERROR', 'Ambiente não encontrado no payload');
        throw new Exception('Ambiente é obrigatório no payload');
    }

    $ambiente = $nfceData['ambiente'] === 'producao' ? 1 : 2;
    logDetalhado('020', 'Ambiente extraído do payload', ['ambiente' => $ambiente]);

    logDetalhado('021', 'Configurações extraídas do payload com sucesso', [
        'empresa_razao' => $empresa['razao_social'] ?? 'NULL',
        'ambiente' => $ambiente
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
    // ✅ CORREÇÃO: Usar ambiente do payload, não de variável indefinida
    $ambiente = $nfceData['ambiente'] === 'producao' ? 1 : 2;
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

        // ✅ DESABILITAR criação automática de diretórios pela biblioteca
        // Isso evita que a biblioteca crie pastas 55/65 no storage raiz
        if (method_exists($tools, 'setPathNFePHP')) {
            $tools->setPathNFePHP(null);
            logDetalhado('038.1', 'PathNFePHP desabilitado para evitar criação de pastas automáticas');
        }

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

    // ✅ LOG ESPECÍFICO: Capturar série para análise
    logDetalhado('SERIE_ANALYSIS', 'Série da NFC-e sendo transmitida', [
        'serie_recebida' => $identificacao['serie'],
        'numero_recebido' => $identificacao['numero'],
        'dados_identificacao_completos' => $identificacao
    ]);

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
    
    // ✅ CORREÇÃO CRÍTICA: Tag infNFe OBRIGATÓRIA (igual à NFe que funciona)
    logDetalhado('049', 'Criando tag infNFe obrigatória (seguindo NFe funcionando)');
    $std = new stdClass();
    $std->versao = '4.00';
    $std->Id = null; // Será gerado automaticamente
    $std->pk_nItem = null;

    // USAR MÉTODO NATIVO PARA ADICIONAR IDENTIFICAÇÃO (igual à NFe)
    $make->taginfNFe($std);
    logDetalhado('049.1', 'Tag infNFe criada com sucesso (seguindo padrão NFe)');

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
    $std->dhEmi = date('Y-m-d\TH:i:sP'); // Data/hora emissão com timezone brasileiro (já definido no início)

    // ✅ LOG ESPECÍFICO: Horário de emissão para verificação
    logDetalhado('HORARIO_EMISSAO', 'Data/hora de emissão configurada', [
        'dhEmi' => $std->dhEmi,
        'timezone' => date_default_timezone_get(),
        'timestamp_local' => date('Y-m-d H:i:s'),
        'timestamp_utc' => gmdate('Y-m-d H:i:s')
    ]);

    // ✅ LOG ESPECÍFICO: Série sendo enviada para SEFAZ
    logDetalhado('SEFAZ_SERIE', 'Série configurada na tag IDE para envio à SEFAZ', [
        'serie_final' => $std->serie,
        'numero_final' => $std->nNF,
        'modelo' => $std->mod,
        'natureza_operacao' => $std->natOp
    ]);
    $std->tpNF = 1; // Saída
    $std->idDest = 1; // Operação interna

    // Código do município da empresa (SEM FALLBACK)
    $std->cMunFG = (int)$empresa['codigo_municipio'];

    $std->tpImp = 4; // NFC-e (4=DANFE NFC-e)
    $std->tpEmis = 1; // Emissão normal
    $std->cDV = 0;
    $std->tpAmb = $ambiente;
    $std->finNFe = 1; // Normal

    // ✅ CORREÇÃO CRÍTICA: Para NFC-e, SEMPRE indFinal = 1 (consumidor final)
    // Conforme documentação oficial: "Operações acobertadas por NFCe devem apenas ocorrer com Consumidor Final"
    // Rejeição 716: "NFC-e para operação não destinada a Consumidor Final (tag:indFinal=0)"
    $pdvConfig = buscarConfiguracaoPDV($empresaId);
    $destinatario = $nfceData['destinatario'] ?? [];

    // ✅ REGRA OFICIAL: NFC-e SEMPRE é consumidor final, independente do tipo de documento
    $std->indFinal = 1; // ✅ SEMPRE consumidor final para NFC-e

    if (!empty($pdvConfig['seleciona_clientes']) && $pdvConfig['seleciona_clientes'] && !empty($destinatario['documento'])) {
        // Funcionalidade de clientes HABILITADA + cliente SELECIONADO
        $documento = preg_replace('/[^0-9]/', '', $destinatario['documento']);

        if (strlen($documento) === 11) {
            // Cliente com CPF
            logDetalhado('050.1', 'NFC-e com CPF - SEMPRE consumidor final', [
                'documento_tipo' => 'CPF',
                'documento_tamanho' => strlen($documento),
                'indFinal' => $std->indFinal,
                'regra' => 'NFC-e sempre consumidor final'
            ]);
        } elseif (strlen($documento) === 14) {
            // Cliente com CNPJ - MAS NFC-e SEMPRE é consumidor final
            logDetalhado('050.2', 'NFC-e com CNPJ - SEMPRE consumidor final (regra NFC-e)', [
                'documento_tipo' => 'CNPJ',
                'documento_tamanho' => strlen($documento),
                'indFinal' => $std->indFinal,
                'regra' => 'NFC-e sempre consumidor final (diferente de NFe)'
            ]);
        } else {
            // Documento inválido
            logDetalhado('050.3', 'NFC-e com documento inválido - SEMPRE consumidor final', [
                'documento_tamanho' => strlen($documento),
                'indFinal' => $std->indFinal,
                'regra' => 'NFC-e sempre consumidor final'
            ]);
        }
    } else {
        // Funcionalidade DESABILITADA OU sem cliente
        logDetalhado('050.4', 'NFC-e sem cliente - SEMPRE consumidor final', [
            'seleciona_clientes' => $pdvConfig['seleciona_clientes'] ?? false,
            'tem_documento' => !empty($destinatario['documento']),
            'indFinal' => $std->indFinal,
            'regra' => 'NFC-e sempre consumidor final'
        ]);
    }

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

    // ✅ LOG ESPECÍFICO: Verificar se documento está sendo recebido
    logDetalhado('DOCUMENTO_DESTINATARIO', 'Verificação do documento do destinatário', [
        'tem_destinatario' => !empty($destinatario),
        'tem_documento' => !empty($destinatario['documento']),
        'documento_original' => $destinatario['documento'] ?? 'VAZIO',
        'nome' => $destinatario['nome'] ?? 'VAZIO'
    ]);

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

        // ✅ CORREÇÃO CRÍTICA: Usar indicador IE real do destinatário (não hardcoded)
        // Para sistema SaaS, este campo é VITAL e deve ser dinâmico
        if (!empty($destinatario['ie_destinatario'])) {
            $std->indIEDest = (int)$destinatario['ie_destinatario']; // ✅ VALOR REAL do payload
            logDetalhado('089.1', 'Usando indicador IE real do destinatário', ['ie_destinatario' => $std->indIEDest]);
        } else {
            $std->indIEDest = 9; // Fallback = Não contribuinte (apenas se não informado)
            logDetalhado('089.2', 'Usando indicador IE fallback (não contribuinte)', ['ie_destinatario' => $std->indIEDest]);
        }

        // ✅ ADICIONAR: Inscrição Estadual se informada (para contribuintes)
        if (!empty($destinatario['inscricao_estadual']) && $std->indIEDest !== 9) {
            $std->IE = $destinatario['inscricao_estadual']; // ✅ IE REAL do destinatário
            logDetalhado('089.3', 'Adicionando IE do destinatário', ['ie' => $std->IE]);
        }

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
    logDetalhado('095', 'Produtos extraídos dos dados (antes do filtro)', $produtos);

    if (empty($produtos)) {
        logDetalhado('096', 'ERRO: Nenhum produto informado');
        throw new Exception('Pelo menos um produto é obrigatório');
    }

    // ✅ CORREÇÃO CRÍTICA: Filtrar itens adicionais para NFC-e (apenas para SEFAZ)
    // Itens adicionais não têm dados fiscais e causam erro 386
    // Manter internamente para impressão e banco, mas excluir do XML fiscal
    $produtosFiscais = [];
    $totalItensOriginais = count($produtos);

    foreach ($produtos as $produto) {
        // ✅ CRITÉRIO MAIS ESPECÍFICO: Verificar se é item adicional por nome/código
        // Não verificar campos fiscais vazios pois podem estar em outras tabelas
        $descricao = strtolower($produto['descricao'] ?? '');
        $codigo = strtolower($produto['codigo'] ?? '');

        $isItemAdicional = (
            // Verificar por palavras-chave na descrição
            strpos($descricao, 'adicional') !== false ||
            strpos($descricao, 'extra') !== false ||
            strpos($descricao, 'complemento') !== false ||
            strpos($descricao, 'acréscimo') !== false ||
            // Verificar por código
            strpos($codigo, 'add') !== false ||
            strpos($codigo, 'ext') !== false ||
            // Verificar se valor é muito baixo (provavelmente adicional)
            (isset($produto['valor_unitario']) && (float)$produto['valor_unitario'] <= 0.50)
        );

        if ($isItemAdicional) {
            logDetalhado('095.1', 'Item adicional excluído da NFC-e (identificado por critério)', [
                'codigo' => $produto['codigo'] ?? 'N/A',
                'descricao' => $produto['descricao'] ?? 'N/A',
                'valor_unitario' => $produto['valor_unitario'] ?? 'N/A',
                'motivo' => 'Item adicional identificado por nome/código/valor'
            ]);
            continue; // ✅ Pular item adicional apenas para SEFAZ
        }

        // ✅ Incluir produto principal na NFC-e
        $produtosFiscais[] = $produto;
        logDetalhado('095.2', 'Produto principal incluído na NFC-e', [
            'codigo' => $produto['codigo'] ?? 'N/A',
            'descricao' => $produto['descricao'] ?? 'N/A',
            'valor_unitario' => $produto['valor_unitario'] ?? 'N/A'
        ]);
    }

    // Usar produtos filtrados para processamento fiscal
    $produtos = $produtosFiscais;

    logDetalhado('095.3', 'Filtro de itens adicionais aplicado', [
        'total_original' => $totalItensOriginais,
        'total_fiscal' => count($produtos),
        'itens_excluidos' => $totalItensOriginais - count($produtos)
    ]);

    if (empty($produtos)) {
        logDetalhado('096.1', 'ERRO: Nenhum produto principal encontrado após filtro');
        throw new Exception('Pelo menos um produto principal (com dados fiscais) é obrigatório para NFC-e');
    }

    logDetalhado('097', 'Validação de produtos fiscais concluída', ['total_produtos_fiscais' => count($produtos)]);

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
        $std->item = $nItem; // ✅ CORREÇÃO CRÍTICA: Definir nItem para a tag <det>
        $std->cProd = $produto['codigo'];

        // ✅ CORREÇÃO CRÍTICA: GTIN conforme documentação oficial NFe
        // Documentação: https://www.mjailton.com.br/manualnfe/tag/campo/153
        // Para produtos SEM código de barras, deve ser informado o literal "SEM GTIN"
        $codigoBarras = $produto['codigo_barras'] ?? '';
        if (empty($codigoBarras) || trim($codigoBarras) === '') {
            $std->cEAN = 'SEM GTIN'; // ✅ OBRIGATÓRIO conforme documentação oficial
            logDetalhado('117.1', "Produto {$nItem} sem código de barras - usando 'SEM GTIN'");
        } else {
            // Validar se é um GTIN válido (8, 12, 13 ou 14 dígitos)
            $codigoLimpo = preg_replace('/[^0-9]/', '', $codigoBarras);
            if (in_array(strlen($codigoLimpo), [8, 12, 13, 14])) {
                $std->cEAN = $codigoLimpo; // GTIN válido
                logDetalhado('117.2', "Produto {$nItem} com GTIN válido", ['gtin' => $codigoLimpo]);
            } else {
                $std->cEAN = 'SEM GTIN'; // GTIN inválido = SEM GTIN
                logDetalhado('117.3', "Produto {$nItem} com GTIN inválido - usando 'SEM GTIN'", ['gtin_original' => $codigoBarras]);
            }
        }

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

        // ✅ CORREÇÃO CRÍTICA: cEANTrib deve ter o mesmo valor de cEAN
        // Documentação: https://www.mjailton.com.br/manualnfe/tag/campo/168
        // Para produtos SEM GTIN, deve ser informado o literal "SEM GTIN"
        $std->cEANTrib = $std->cEAN; // ✅ OBRIGATÓRIO: mesmo valor de cEAN
        logDetalhado('117.4', "Produto {$nItem} - cEANTrib configurado", ['cEANTrib' => $std->cEANTrib]);

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
        $std->item = $nItem; // ✅ CORREÇÃO: usar 'item' igual à NFe que funciona

        try {
            logDetalhado('126.2', "Executando make->tagimposto() para produto {$nItem}");
            $make->tagimposto($std);
            logDetalhado('126.3', "Container de impostos criado com sucesso para produto {$nItem}");
        } catch (Exception $impostoError) {
            logDetalhado('126.4', "ERRO: Falha ao criar container de impostos para produto {$nItem}", ['error' => $impostoError->getMessage()]);
            throw new Exception("Erro no container de impostos do produto {$nItem}: " . $impostoError->getMessage());
        }

        // 2. SEGUNDO: ICMS - OBRIGATÓRIO (USANDO DADOS REAIS DO PRODUTO)
        logDetalhado('127', "Criando ICMS para produto {$nItem}");

        // ✅ BUSCAR DADOS FISCAIS REAIS DO PRODUTO PARA ICMS (LEI DOS DADOS REAIS)
        logDetalhado('126.1', "Buscando dados fiscais para produto {$nItem}", ['codigo' => $produto['codigo'], 'empresa_id' => $empresaId]);
        $produtoFiscal = buscarDadosFiscaisProduto($produto['codigo'], $empresaId);

        if (!$produtoFiscal) {
            logDetalhado('126.2', "ERRO: Dados fiscais não encontrados", ['codigo' => $produto['codigo']]);
            throw new Exception("Dados fiscais não encontrados para produto {$produto['codigo']}");
        }

        logDetalhado('126.3', "Dados fiscais encontrados para produto {$nItem}", $produtoFiscal);

        // ✅ VALIDAR DADOS FISCAIS CONFORME REGIME TRIBUTÁRIO (SEM FALLBACKS)
        $regimeTributario = (int)($empresa['regime_tributario'] ?? 1);
        logDetalhado('126.4', "Validando dados fiscais por regime", ['regime' => $regimeTributario, 'codigo' => $produto['codigo']]);

        try {
            validarDadosFiscaisPorRegime($produtoFiscal, $regimeTributario, $produto['codigo']);
            logDetalhado('126.5', "Validação fiscal aprovada para produto {$nItem}");
        } catch (Exception $e) {
            logDetalhado('126.6', "ERRO na validação fiscal", ['erro' => $e->getMessage(), 'codigo' => $produto['codigo']]);
            throw $e;
        }

        $std = new stdClass();
        $std->item = $nItem; // ✅ CORREÇÃO: usar 'item' igual à NFe que funciona
        $std->orig = (int)($produtoFiscal['origem_produto'] ?? 0); // ✅ ORIGEM REAL do produto

        // ✅ USAR REGIME TRIBUTÁRIO VALIDADO PARA DETERMINAR CST/CSOSN
        $isSimples = in_array($regimeTributario, [1, 2]); // 1 ou 2 = Simples Nacional

        logDetalhado('127.0', "Regime tributário validado - usando dados fiscais corretos", [
            'regime_tributario' => $regimeTributario,
            'is_simples' => $isSimples,
            'produto' => $nItem,
            'csosn_icms' => $produtoFiscal['csosn_icms'] ?? 'NULL',
            'cst_icms' => $produtoFiscal['cst_icms'] ?? 'NULL'
        ]);

        if ($isSimples) {
            // ✅ EMPRESA SIMPLES NACIONAL: Usar CSOSN REAL (SEM FALLBACKS)
            $std->CSOSN = $produtoFiscal['csosn_icms']; // ✅ CSOSN REAL do produto (já validado)

            logDetalhado('127.1', "Produto {$nItem} - Empresa Simples Nacional - Usando CSOSN real", [
                'csosn' => $std->CSOSN,
                'origem' => $std->orig,
                'regime' => $regimeTributario
            ]);

            // Para CSOSN 500 (ST), adicionar campos específicos obrigatórios
            if ($std->CSOSN === '500') {
                // ✅ CSOSN 500 - ICMS cobrado anteriormente por ST - USANDO DADOS REAIS
                // Conforme Manual NFe - campos obrigatórios: vBCSTRet, pST, vICMSSTRet

                logDetalhado('127.2', "Produto {$nItem} - CSOSN 500 (Substituição Tributária)", [
                    'csosn' => $std->CSOSN
                ]);

                // ✅ USAR DADOS REAIS DO PRODUTO (SEM FALLBACKS)
                $margemST = (float)($produtoFiscal['margem_st'] ?? 0);
                $aliquotaICMS = (float)($produtoFiscal['aliquota_icms'] ?? 0);
                $valorBase = (float)($produto['valor_total'] ?? 0);

                // Detectar nome do produto usando a mesma lógica da NFe
                $nomeProduto = '';
                if (isset($produto['descricao'])) {
                    $nomeProduto = $produto['descricao'];
                } elseif (isset($produto['nome'])) {
                    $nomeProduto = $produto['nome'];
                } elseif (isset($produto['name'])) {
                    $nomeProduto = $produto['name'];
                } elseif (isset($produto['produto'])) {
                    $nomeProduto = $produto['produto'];
                } else {
                    $nomeProduto = 'Produto sem nome';
                }

                // Validar se dados ST estão configurados
                if (!$margemST || !$aliquotaICMS) {
                    throw new Exception("Produto '{$nomeProduto}' com CSOSN 500 deve ter margem_st e aliquota_icms configurados. Margem: {$margemST}%, Alíquota: {$aliquotaICMS}%");
                }

                // ✅ CÁLCULO BASEADO NOS DADOS REAIS DO PRODUTO
                $baseSTCalculada = $valorBase * (1 + ($margemST / 100));
                $valorSTRetido = round($baseSTCalculada * ($aliquotaICMS / 100), 2);

                // ✅ CAMPOS OBRIGATÓRIOS PARA CSOSN 500
                $std->vBCSTRet = $baseSTCalculada;  // Base de cálculo do ST retido
                $std->pST = $aliquotaICMS;          // Alíquota do ST
                $std->vICMSSTRet = $valorSTRetido;  // Valor do ST retido

                logDetalhado('127.3', "CSOSN 500 - CÁLCULO COM DADOS REAIS", [
                    'produto' => $nomeProduto,
                    'preco_base' => $valorBase,
                    'margem_st' => $margemST,
                    'base_st_calculada' => $baseSTCalculada,
                    'aliquota_icms' => $aliquotaICMS,
                    'valor_st_retido' => $valorSTRetido
                ]);
            }

            try {
                logDetalhado('128', "Executando make->tagICMSSN() para produto {$nItem} (Simples Nacional)", ['csosn' => $std->CSOSN, 'origem' => $std->orig]);
                $make->tagICMSSN($std);
                logDetalhado('129', "ICMS Simples Nacional criado com sucesso para produto {$nItem}");
            } catch (Exception $icmsError) {
                logDetalhado('130', "ERRO: Falha ao criar ICMS Simples Nacional para produto {$nItem}", ['error' => $icmsError->getMessage()]);
                throw new Exception("Erro no ICMS Simples Nacional do produto {$nItem}: " . $icmsError->getMessage());
            }
        } else {
            // ✅ EMPRESA REGIME NORMAL: Usar CST REAL (SEM FALLBACKS)
            $std->CST = $produtoFiscal['cst_icms']; // ✅ CST REAL do produto (já validado)

            logDetalhado('127.4', "Produto {$nItem} - Empresa Regime Normal - Usando CST real", [
                'cst' => $std->CST,
                'origem' => $std->orig,
                'regime' => $regimeTributario
            ]);

            // Adicionar campos obrigatórios para CST
            $aliquotaICMS = (float)($produtoFiscal['aliquota_icms'] ?? 0);
            $valorBase = (float)($produto['valor_total'] ?? 0);

            if ($std->CST === '00' || $std->CST === '10' || $std->CST === '20') {
                // Operações tributadas
                $std->modBC = 0; // Margem Valor Agregado (%)
                $std->vBC = $valorBase; // Base de cálculo
                $std->pICMS = $aliquotaICMS; // Alíquota
                $std->vICMS = round(($valorBase * $aliquotaICMS) / 100, 2); // Valor ICMS
                $totalICMS += $std->vICMS;
                logDetalhado('127.5', "Produto {$nItem} - CST tributado configurado", [
                    'cst' => $std->CST,
                    'aliquota' => $aliquotaICMS,
                    'valor_icms' => $std->vICMS
                ]);
            } elseif ($std->CST === '60') {
                // ✅ CST 60 - ICMS cobrado anteriormente por ST - CALCULAR DINAMICAMENTE
                $margemST = (float)($produtoFiscal['margem_st'] ?? 0);
                $aliquotaICMS = (float)($produtoFiscal['aliquota_icms'] ?? 0);

                // Detectar nome do produto usando a mesma lógica da NFe
                $nomeProduto = '';
                if (isset($produto['descricao'])) {
                    $nomeProduto = $produto['descricao'];
                } elseif (isset($produto['nome'])) {
                    $nomeProduto = $produto['nome'];
                } elseif (isset($produto['name'])) {
                    $nomeProduto = $produto['name'];
                } elseif (isset($produto['produto'])) {
                    $nomeProduto = $produto['produto'];
                } else {
                    $nomeProduto = 'Produto sem nome';
                }

                // Validar se dados ST estão configurados
                if (!$margemST || !$aliquotaICMS) {
                    throw new Exception("Produto '{$nomeProduto}' com CST 60 deve ter margem_st e aliquota_icms configurados. Margem: {$margemST}%, Alíquota: {$aliquotaICMS}%");
                }

                // ✅ CÁLCULO BASEADO NOS DADOS REAIS DO PRODUTO
                $baseSTCalculada = $valorBase * (1 + ($margemST / 100));
                $valorSTRetido = round($baseSTCalculada * ($aliquotaICMS / 100), 2);

                // ✅ CAMPOS OBRIGATÓRIOS PARA CST 60
                $std->vBCSTRet = $baseSTCalculada;  // Base de cálculo do ST retido
                $std->pST = $aliquotaICMS;          // Alíquota do ST
                $std->vICMSSTRet = $valorSTRetido;  // Valor do ST retido

                logDetalhado('127.7', "CST 60 - CÁLCULO COM DADOS REAIS", [
                    'produto' => $nomeProduto,
                    'preco_base' => $valorBase,
                    'margem_st' => $margemST,
                    'base_st_calculada' => $baseSTCalculada,
                    'aliquota_icms' => $aliquotaICMS,
                    'valor_st_retido' => $valorSTRetido
                ]);
            } else {
                // Outras operações (isentas, não tributadas, etc.)
                $std->vBC = null;
                $std->pICMS = null;
                $std->vICMS = null;
                logDetalhado('127.6', "Produto {$nItem} - CST não tributado configurado", [
                    'cst' => $std->CST
                ]);
            }

            try {
                logDetalhado('128.1', "Executando make->tagICMS() para produto {$nItem} (Regime Normal)", ['cst' => $std->CST, 'origem' => $std->orig]);
                $make->tagICMS($std);
                logDetalhado('129.1', "ICMS Regime Normal criado com sucesso para produto {$nItem}");
            } catch (Exception $icmsError) {
                logDetalhado('130.1', "ERRO: Falha ao criar ICMS Regime Normal para produto {$nItem}", ['error' => $icmsError->getMessage()]);
                throw new Exception("Erro no ICMS Regime Normal do produto {$nItem}: " . $icmsError->getMessage());
            }
        }

        // 3. TERCEIRO: PIS - OBRIGATÓRIO (USANDO DADOS REAIS DO PRODUTO)
        logDetalhado('131', "Criando PIS para produto {$nItem}");

        // ✅ DADOS FISCAIS JÁ CARREGADOS ACIMA (reutilizar $produtoFiscal)
        $std = new stdClass();
        $std->item = $nItem; // ✅ CORREÇÃO: usar 'item' igual à NFe que funciona
        $std->CST = $produtoFiscal['cst_pis']; // ✅ DADO REAL do produto

        // Calcular valores baseados no CST real
        if ($produtoFiscal['cst_pis'] === '01' || $produtoFiscal['cst_pis'] === '02') {
            // Operação tributável - calcular valores reais
            $std->vBC = $valorTotal; // Base de cálculo = valor do produto
            $std->pPIS = (float)$produtoFiscal['aliquota_pis']; // ✅ ALÍQUOTA REAL
            $std->vPIS = round(($valorTotal * $std->pPIS) / 100, 2); // ✅ VALOR CALCULADO
            $totalPIS += $std->vPIS;
        } else {
            // Outras operações conforme CST
            $std->vBC = null;
            $std->pPIS = null;
            $std->vPIS = null;
        }

        logDetalhado('131.1', "PIS configurado com dados reais", [
            'cst' => $std->CST,
            'aliquota' => $std->pPIS,
            'valor' => $std->vPIS
        ]);

        try {
            logDetalhado('132', "Executando make->tagPIS() para produto {$nItem}");
            $make->tagPIS($std);
            logDetalhado('133', "PIS criado com sucesso para produto {$nItem}");
        } catch (Exception $pisError) {
            logDetalhado('134', "ERRO: Falha ao criar PIS para produto {$nItem}", ['error' => $pisError->getMessage()]);
            throw new Exception("Erro no PIS do produto {$nItem}: " . $pisError->getMessage());
        }

        // 4. QUARTO: COFINS - OBRIGATÓRIO (USANDO DADOS REAIS DO PRODUTO)
        logDetalhado('135', "Criando COFINS para produto {$nItem}");

        $std = new stdClass();
        $std->item = $nItem; // ✅ CORREÇÃO: usar 'item' igual à NFe que funciona
        $std->CST = $produtoFiscal['cst_cofins']; // ✅ DADO REAL do produto

        // Calcular valores baseados no CST real
        if ($produtoFiscal['cst_cofins'] === '01' || $produtoFiscal['cst_cofins'] === '02') {
            // Operação tributável - calcular valores reais
            $std->vBC = $valorTotal; // Base de cálculo = valor do produto
            $std->pCOFINS = (float)$produtoFiscal['aliquota_cofins']; // ✅ ALÍQUOTA REAL
            $std->vCOFINS = round(($valorTotal * $std->pCOFINS) / 100, 2); // ✅ VALOR CALCULADO
            $totalCOFINS += $std->vCOFINS;
        } else {
            // Outras operações conforme CST
            $std->vBC = null;
            $std->pCOFINS = null;
            $std->vCOFINS = null;
        }

        logDetalhado('135.1', "COFINS configurado com dados reais", [
            'cst' => $std->CST,
            'aliquota' => $std->pCOFINS,
            'valor' => $std->vCOFINS
        ]);

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

    // 1. PRIMEIRO: Criar grupo PAG (container) com troco - USANDO DADOS REAIS
    logDetalhado('151', 'Criando grupo PAG (container)');

    // ✅ BUSCAR DADOS DE PAGAMENTO REAIS (não hardcoded)
    $pagamento = $nfceData['pagamento'] ?? [];
    logDetalhado('151.0', 'Dados de pagamento para troco extraídos', $pagamento);

    $std = new stdClass();

    // ✅ CORREÇÃO CRÍTICA: Usar troco real (não hardcoded)
    if (!empty($pagamento['troco'])) {
        $std->vTroco = (float)$pagamento['troco']; // ✅ TROCO REAL do PDV
        logDetalhado('151.1', 'Usando troco real', ['troco' => $std->vTroco]);
    } else {
        $std->vTroco = 0.00; // Fallback = sem troco
        logDetalhado('151.2', 'Usando troco fallback (zero)', ['troco' => $std->vTroco]);
    }

    try {
        logDetalhado('152', 'Executando make->tagpag()');
        $make->tagpag($std);
        logDetalhado('153', 'Grupo pagamento criado com sucesso');
    } catch (Exception $pagError) {
        logDetalhado('154', 'ERRO: Falha ao criar grupo pagamento', ['error' => $pagError->getMessage()]);
        throw new Exception("Erro no grupo pagamento: " . $pagError->getMessage());
    }

    // 2. SEGUNDO: Adicionar forma de pagamento (detPag) - USANDO DADOS REAIS
    logDetalhado('155', 'Criando detalhes do pagamento');

    // ✅ CORREÇÃO CRÍTICA: Buscar forma de pagamento real dos dados (não hardcoded)
    $pagamento = $nfceData['pagamento'] ?? [];
    logDetalhado('155.1', 'Dados de pagamento extraídos', $pagamento);

    $std = new stdClass();
    $std->indPag = 0; // Pagamento à vista (padrão para NFC-e)

    // ✅ USAR FORMA DE PAGAMENTO REAL (não hardcoded)
    if (!empty($pagamento['forma_pagamento'])) {
        $std->tPag = $pagamento['forma_pagamento']; // ✅ FORMA REAL do PDV
        logDetalhado('155.2', 'Usando forma de pagamento real', ['forma' => $std->tPag]);
    } else {
        // Fallback apenas se não informado
        $std->tPag = '01'; // Dinheiro (fallback)
        logDetalhado('155.3', 'Usando forma de pagamento fallback (dinheiro)', ['forma' => $std->tPag]);
    }

    // ✅ USAR VALOR REAL DO PAGAMENTO (pode ser diferente do total se houver troco)
    if (!empty($pagamento['valor_pago'])) {
        $std->vPag = (float)$pagamento['valor_pago']; // ✅ VALOR REAL pago
        logDetalhado('155.4', 'Usando valor pago real', ['valor' => $std->vPag]);
    } else {
        $std->vPag = $totalProdutos; // Fallback = total dos produtos
        logDetalhado('155.5', 'Usando valor pago fallback (total produtos)', ['valor' => $std->vPag]);
    }

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
        // PRIMEIRO: Verificar se há erros na biblioteca (conforme documentação oficial)
        logDetalhado('163.1', 'Verificando erros da biblioteca antes da geração');
        $errors = $make->getErrors();
        if (!empty($errors)) {
            logDetalhado('163.2', 'ERRO: Biblioteca contém erros', ['errors' => $errors]);
            throw new Exception('Erros na montagem da NFC-e: ' . implode(', ', $errors));
        }
        logDetalhado('163.3', 'Biblioteca sem erros, prosseguindo');

        // SEGUNDO: Verificar se todas as tags foram criadas corretamente
        logDetalhado('163.9', 'Verificando integridade das tags antes da geração');

        // Verificar se há tags null que podem causar erro DOMElement
        $errors = $make->getErrors();
        if (!empty($errors)) {
            logDetalhado('163.10', 'ERRO: Tags com problemas detectadas', ['errors' => $errors]);
            throw new Exception('Problemas na criação das tags: ' . implode(', ', $errors));
        }

        // TERCEIRO: Usar monta() conforme documentação oficial (LEI DA DOCUMENTAÇÃO OFICIAL)
        logDetalhado('164', 'Executando make->monta() conforme documentação oficial');

        // Definir timeout para evitar travamento
        set_time_limit(60); // 60 segundos para geração do XML

        // INVESTIGAR: Verificar se há problema específico nos dados antes do monta()
        logDetalhado('164.0', 'Verificando dados antes do monta()');

        // Verificar se há erros acumulados
        $errorsBeforeMonta = $make->getErrors();
        if (!empty($errorsBeforeMonta)) {
            logDetalhado('164.0.1', 'ERRO: Erros encontrados antes do monta()', ['errors' => $errorsBeforeMonta]);
            throw new Exception('Erros nos dados antes da montagem: ' . implode(', ', $errorsBeforeMonta));
        }

        logDetalhado('164.0.2', 'Dados validados, iniciando monta() com timeout de 60s');

        try {
            // INVESTIGAÇÃO ESPECÍFICA: Capturar erro do DOMElement null
            logDetalhado('164.0.3', 'Iniciando monta() com captura específica de erro DOMElement');

            // Configurar error handler personalizado para capturar erros fatais
            set_error_handler(function($severity, $message, $file, $line) {
                logDetalhado('164.ERROR.HANDLER', 'Erro capturado durante monta()', [
                    'severity' => $severity,
                    'message' => $message,
                    'file' => $file,
                    'line' => $line
                ]);

                // Se for o erro específico do DOMElement, logar detalhes
                if (strpos($message, 'DOMElement') !== false || strpos($message, 'appChild') !== false) {
                    logDetalhado('164.ERROR.DOMELEMENT', 'ERRO ESPECÍFICO DOMElement detectado', [
                        'message' => $message,
                        'file' => $file,
                        'line' => $line
                    ]);
                }

                // Restaurar error handler padrão e lançar exceção
                restore_error_handler();
                throw new Exception("Erro fatal durante monta(): {$message} em {$file}:{$line}");
            });

            $xml = $make->monta(); // ✅ Método CORRETO conforme documentação oficial

            // Restaurar error handler
            restore_error_handler();

            logDetalhado('164.1', 'monta() executado com sucesso', ['tamanho_xml' => strlen($xml)]);
        } catch (TypeError $e) {
            // Capturar especificamente TypeError (DOMElement null)
            logDetalhado('164.1.TYPEERROR', 'ERRO TYPEERROR ESPECÍFICO no monta()', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace_preview' => substr($e->getTraceAsString(), 0, 1000)
            ]);

            // Verificar se é o erro específico do DOMElement
            if (strpos($e->getMessage(), 'DOMElement') !== false && strpos($e->getMessage(), 'appChild') !== false) {
                logDetalhado('164.1.DOMELEMENT_CONFIRMED', 'CONFIRMADO: Erro DOMElement null no appChild()', [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine()
                ]);

                throw new Exception("ERRO IDENTIFICADO: Elemento DOM null sendo passado para appChild(). " .
                                  "Problema na estrutura de tags da NFC-e. Detalhes: " . $e->getMessage());
            }

            throw new Exception("Erro de tipo durante monta(): " . $e->getMessage());
        } catch (Exception $e) {
            logDetalhado('164.1.ERROR', 'ERRO GERAL no monta()', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace_preview' => substr($e->getTraceAsString(), 0, 500)
            ]);
            throw $e;
        } finally {
            // Garantir que o error handler seja restaurado
            restore_error_handler();
        }

        logDetalhado('164.4', 'XML gerado, verificando resultado');

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

    // ENVIAR PARA SEFAZ (MÉTODO ESPECÍFICO PARA NFC-e)
    error_log("📡 NFCE: Enviando para SEFAZ com modo síncrono...");
    try {
        // ✅ CORREÇÃO: Para NFC-e usar envio síncrono (indSinc=1)
        $response = $tools->sefazEnviaLote([$xmlAssinado], 1, 1); // Terceiro parâmetro = indSinc=1 (síncrono)
        error_log("✅ NFCE: Resposta recebida da SEFAZ (modo síncrono)");
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

    // Status do lote (104 = Lote processado é OK)
    $statusLoteNode = $dom->getElementsByTagName('cStat')->item(0);
    $statusLote = $statusLoteNode ? $statusLoteNode->nodeValue : 'STATUS_NAO_ENCONTRADO';
    error_log("📋 NFCE: Status do Lote: {$statusLote}");

    $motivoLoteNode = $dom->getElementsByTagName('xMotivo')->item(0);
    $motivoLote = $motivoLoteNode ? $motivoLoteNode->nodeValue : 'MOTIVO_NAO_ENCONTRADO';
    error_log("📋 NFCE: Motivo do Lote: {$motivoLote}");

    // ✅ CORREÇÃO: Para modo síncrono, verificar status individual da NFC-e
    error_log("🔍 NFCE: Buscando status individual da NFC-e...");

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

            error_log("📋 NFCE: Status da NFC-e: {$status}");
            error_log("📋 NFCE: Motivo da NFC-e: {$motivo}");
        } else {
            error_log("❌ NFCE: infProt não encontrado");
            $status = 'INFPROT_NAO_ENCONTRADO';
            $motivo = 'Estrutura de protocolo inválida';
        }
    } else {
        error_log("❌ NFCE: protNFe não encontrado");
        $status = 'PROTNFE_NAO_ENCONTRADO';
        $motivo = 'Protocolo da NFC-e não encontrado na resposta';
    }

    error_log("📋 NFCE: Status final da NFC-e - {$status}: {$motivo}");

    // Verificar se foi autorizada (100 = Autorizado)
    if ($status !== '100') {
        error_log("❌ NFCE: NFC-e rejeitada - Status {$status}: {$motivo}");

        // ✅ CORREÇÃO: Criar mensagem específica baseada no status
        $mensagemEspecifica = "NFC-e rejeitada pela SEFAZ";

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
                $mensagemEspecifica = "NFC-e rejeitada pela SEFAZ - Status {$status}: {$motivo}";
                break;
        }

        logDetalhado('SEFAZ_REJECTION', 'NFC-e rejeitada com status específico', [
            'status' => $status,
            'motivo' => $motivo,
            'mensagem_especifica' => $mensagemEspecifica
        ]);

        throw new Exception($mensagemEspecifica);
    }

    error_log("✅ NFCE: NFC-e autorizada pela SEFAZ!");

    // ✅ CORREÇÃO: No modo síncrono, extrair protocolo e recibo da resposta
    error_log("🔍 NFCE: Extraindo protocolo e recibo da resposta síncrona...");
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
            error_log("✅ NFCE: Protocolo extraído da resposta síncrona: {$protocolo}");
            error_log("✅ NFCE: Recibo: {$recibo}");

            // ✅ CORREÇÃO: Usar método oficial da biblioteca sped-nfe
            error_log("🔗 NFCE: Adicionando protocolo ao XML usando Complements::toAuthorize...");
            try {
                // Usar a classe Complements da biblioteca sped-nfe (OFICIAL)
                $xmlComProtocolo = \NFePHP\NFe\Complements::toAuthorize($xmlAssinado, $response);
                error_log("✅ NFCE: Protocolo adicionado ao XML usando Complements::toAuthorize");
            } catch (Exception $protocolError) {
                error_log("⚠️ NFCE: Erro ao adicionar protocolo: " . $protocolError->getMessage());
                error_log("⚠️ NFCE: Usando XML assinado sem protocolo adicional");
                $xmlComProtocolo = $xmlAssinado;
            }
        } else {
            error_log("⚠️ NFCE: Protocolo não encontrado na resposta síncrona");
            $xmlComProtocolo = $xmlAssinado;
            $protocolo = 'PROTOCOLO_NAO_ENCONTRADO';
            $recibo = 'RECIBO_NAO_ENCONTRADO';
        }

    } catch (Exception $e) {
        error_log("⚠️ NFCE: Erro ao extrair protocolo: " . $e->getMessage());
        error_log("⚠️ NFCE: Usando XML sem protocolo");
        $xmlComProtocolo = $xmlAssinado;
        $protocolo = 'ERRO_PROTOCOLO';
        $recibo = 'ERRO_RECIBO';
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

        // ✅ LOG ESPECÍFICO: Analisar série na chave de acesso
        // Formato da chave: CCAAMMDDEMITENTEMODELOSSERIEEEEEEEEENNNNNNNNNNDV
        // Posições 22-24 = série (3 dígitos)
        $serieNaChave = substr($chaveParaSalvar, 22, 3);
        $numeroNaChave = substr($chaveParaSalvar, 25, 9);
        logDetalhado('CHAVE_ANALYSIS', 'Análise da chave de acesso gerada', [
            'chave_completa' => $chaveParaSalvar,
            'serie_na_chave' => $serieNaChave,
            'numero_na_chave' => $numeroNaChave,
            'posicao_serie' => '22-24',
            'posicao_numero' => '25-33'
        ]);

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
            'xml_path' => $xmlPath, // ✅ INFORMATIVO: Caminho local do arquivo (não salvo no banco)
            'pdf_path' => $pdfPath, // ✅ INFORMATIVO: Caminho local do arquivo (não salvo no banco)
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

    // ✅ CORREÇÃO: Determinar se é erro de usuário ou erro técnico
    $isUserError = false;
    $userMessage = $e->getMessage();

    // Verificar se é um erro que o usuário pode resolver
    if (strpos($e->getMessage(), 'Número da NFC-e já foi utilizado') !== false ||
        strpos($e->getMessage(), 'Duplicidade de NFC-e') !== false ||
        strpos($e->getMessage(), 'rejeitada pela SEFAZ') !== false ||
        strpos($e->getMessage(), 'obrigatório') !== false ||
        strpos($e->getMessage(), 'inválido') !== false) {
        $isUserError = true;
    }

    // ✅ CORREÇÃO: Para erros de usuário, usar status 400 (Bad Request)
    // Para erros técnicos, usar status 500 (Internal Server Error)
    if ($isUserError) {
        http_response_code(400); // Bad Request - erro do usuário
        logDetalhado('USER_ERROR', 'Erro de usuário identificado', ['message' => $userMessage]);
    } else {
        http_response_code(500); // Internal Server Error - erro técnico
        logDetalhado('TECHNICAL_ERROR', 'Erro técnico identificado', ['message' => $userMessage]);
    }

    // ✅ CORREÇÃO: Resposta JSON estruturada para o frontend
    $response = [
        'success' => false,
        'error' => $userMessage,
        'error_type' => $isUserError ? 'user_error' : 'technical_error',
        'timestamp' => date('Y-m-d H:i:s'),
        'debug_info' => [
            'file' => basename($e->getFile()), // Apenas nome do arquivo por segurança
            'line' => $e->getLine(),
            'step' => 'FATAL_ERROR'
        ]
    ];

    // Log da resposta que será enviada
    logDetalhado('RESPONSE_SENT', 'Resposta de erro enviada ao frontend', $response);

    // ✅ CORREÇÃO: Log adicional para debug
    error_log("🔍 NFCE: Enviando resposta de erro para frontend:");
    error_log("🔍 NFCE: HTTP Status: " . http_response_code());
    error_log("🔍 NFCE: Mensagem: " . $userMessage);
    error_log("🔍 NFCE: Tipo: " . ($isUserError ? 'user_error' : 'technical_error'));
    error_log("🔍 NFCE: JSON completo: " . json_encode($response, JSON_UNESCAPED_UNICODE));

    echo json_encode($response, JSON_UNESCAPED_UNICODE);
}
?>
