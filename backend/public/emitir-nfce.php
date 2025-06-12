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

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    require_once '../vendor/autoload.php';
    require_once '../includes/storage-paths.php';
    
    // Validar método
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método não permitido. Use POST.');
    }
    
    // Receber dados
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Dados JSON inválidos');
    }
    
    // Parâmetros obrigatórios para multi-tenant
    $empresaId = $input['empresa_id'] ?? null;
    $nfceData = $input['nfce_data'] ?? null;
    
    // Validações multi-tenant
    if (!$empresaId) {
        throw new Exception('empresa_id é obrigatório');
    }
    
    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $empresaId)) {
        throw new Exception('empresa_id inválido');
    }
    
    if (!$nfceData) {
        throw new Exception('nfce_data é obrigatório');
    }
    
    error_log("🚀 NFCE: Iniciando emissão para empresa: {$empresaId}");
    error_log("📋 NFCE: Dados recebidos - " . json_encode($nfceData, JSON_UNESCAPED_UNICODE));

    // Buscar configurações da empresa (MÉTODO MULTI-TENANT)
    error_log("🔍 NFCE: Buscando configurações da empresa...");
    $configUrl = "http://localhost/backend/public/get-empresa-config.php?empresa_id={$empresaId}";
    $configResponse = file_get_contents($configUrl);

    if (!$configResponse) {
        error_log("❌ NFCE: Erro ao buscar configurações - resposta vazia");
        throw new Exception('Erro ao buscar configurações da empresa');
    }

    error_log("📡 NFCE: Resposta configurações: " . $configResponse);
    $configData = json_decode($configResponse, true);

    if (!$configData || !$configData['success']) {
        error_log("❌ NFCE: Configurações inválidas: " . json_encode($configData));
        throw new Exception('Configurações da empresa não encontradas: ' . ($configData['error'] ?? 'Erro desconhecido'));
    }

    $empresa = $configData['data']['empresa'];
    $nfeConfig = $configData['data']['nfe_config'];

    error_log("✅ NFCE: Configurações carregadas - Empresa: {$empresa['razao_social']}, Ambiente: {$nfeConfig['ambiente_codigo']}");
    
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
    error_log("🔧 NFCE: Configurando biblioteca sped-nfe...");
    $cnpjLimpo = preg_replace('/[^0-9]/', '', $empresa['cnpj']);
    if (strlen($cnpjLimpo) !== 14) {
        error_log("❌ NFCE: CNPJ inválido - Original: {$empresa['cnpj']}, Limpo: {$cnpjLimpo}, Tamanho: " . strlen($cnpjLimpo));
        throw new Exception('CNPJ da empresa deve ter 14 dígitos');
    }
    error_log("✅ NFCE: CNPJ limpo: {$cnpjLimpo}");

    $config = [
        "atualizacao" => date('Y-m-d H:i:s'),
        "tpAmb" => $ambiente,
        "razaosocial" => $empresa['razao_social'],
        "cnpj" => $cnpjLimpo,
        "siglaUF" => $empresa['uf'],
        "schemes" => "PL_009_V4",
        "versao" => '4.00',
        "CSC" => $empresa[$cscField],
        "CSCid" => $empresa[$cscIdField]
    ];

    error_log("📋 NFCE: Configuração sped-nfe: " . json_encode($config, JSON_UNESCAPED_UNICODE));

    // Criar objeto Certificate
    error_log("🔐 NFCE: Criando objeto Certificate...");
    try {
        $certificate = \NFePHP\Common\Certificate::readPfx($certificado, $metadata['password'] ?? '');
        error_log("✅ NFCE: Certificate criado com sucesso");
    } catch (Exception $certError) {
        error_log("❌ NFCE: Erro ao criar Certificate: " . $certError->getMessage());
        throw new Exception("Erro no certificado: " . $certError->getMessage());
    }

    // Inicializar Tools (MÉTODO NATIVO)
    error_log("🛠️ NFCE: Inicializando Tools...");
    try {
        $tools = new \NFePHP\NFe\Tools(json_encode($config), $certificate);
        $tools->model('65'); // Modelo NFC-e
        error_log("✅ NFCE: Tools inicializado - Modelo 65");
    } catch (Exception $toolsError) {
        error_log("❌ NFCE: Erro ao inicializar Tools: " . $toolsError->getMessage());
        throw new Exception("Erro ao inicializar Tools: " . $toolsError->getMessage());
    }

    // Inicializar Make (MÉTODO NATIVO)
    error_log("🏗️ NFCE: Inicializando Make...");
    try {
        $make = new \NFePHP\NFe\Make();
        error_log("✅ NFCE: Make inicializado");
    } catch (Exception $makeError) {
        error_log("❌ NFCE: Erro ao inicializar Make: " . $makeError->getMessage());
        throw new Exception("Erro ao inicializar Make: " . $makeError->getMessage());
    }

    error_log("🔧 NFCE: Biblioteca sped-nfe inicializada - Modelo 65");
    
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
    error_log("🏷️ NFCE: Criando tag IDE...");
    $std = new stdClass();
    $std->cUF = (int)$empresa['codigo_uf']; // Código UF da empresa
    $std->cNF = str_pad($codigoNumerico, 8, '0', STR_PAD_LEFT);

    $std->natOp = $identificacao['natureza_operacao'] ?? 'Venda de mercadoria';
    $std->mod = 65; // NFC-e
    $std->serie = (int)($identificacao['serie'] ?? 1);
    $std->nNF = (int)($identificacao['numero'] ?? 1);
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

    error_log("📋 NFCE: Dados tag IDE: " . json_encode($std, JSON_UNESCAPED_UNICODE));

    try {
        $make->tagide($std);
        error_log("✅ NFCE: Tag IDE criada - Número: {$std->nNF}, Série: {$std->serie}, Modelo: {$std->mod}");
    } catch (Exception $ideError) {
        error_log("❌ NFCE: Erro ao criar tag IDE: " . $ideError->getMessage());
        throw new Exception("Erro na tag IDE: " . $ideError->getMessage());
    }

    // Emitente (MÉTODO NATIVO) - SEM FALLBACKS
    $std = new stdClass();
    $std->xNome = $empresa['razao_social']; // JÁ VALIDADO ACIMA
    $std->CNPJ = $cnpjLimpo; // JÁ VALIDADO ACIMA
    $std->xFant = $empresa['nome_fantasia'] ?? null; // OPCIONAL

    // Validar IE obrigatória
    $std->IE = $empresa['inscricao_estadual'];

    // Validar regime tributário obrigatório
    $std->CRT = (int)$empresa['regime_tributario'];

    $make->tagemit($std);

    // Endereço do emitente (MÉTODO NATIVO) - SEM FALLBACKS
    $endereco = $empresa['endereco'] ?? [];

    // Validar dados obrigatórios do endereço
    if (empty($endereco['logradouro'])) {
        throw new Exception('Logradouro da empresa é obrigatório');
    }
    if (empty($endereco['numero'])) {
        throw new Exception('Número do endereço da empresa é obrigatório');
    }
    if (empty($endereco['bairro'])) {
        throw new Exception('Bairro da empresa é obrigatório');
    }
    if (empty($endereco['cep'])) {
        throw new Exception('CEP da empresa é obrigatório');
    }

    $std = new stdClass();
    $std->xLgr = $endereco['logradouro'];
    $std->nro = $endereco['numero'];
    $std->xCpl = $endereco['complemento'] ?? null; // OPCIONAL
    $std->xBairro = $endereco['bairro'];
    $std->cMun = (int)$empresa['codigo_municipio']; // JÁ VALIDADO
    $std->xMun = $endereco['cidade'] ?? $empresa['cidade'] ?? '';
    if (empty($std->xMun)) {
        throw new Exception('Nome da cidade da empresa é obrigatório');
    }
    $std->UF = $empresa['uf']; // JÁ VALIDADO
    $std->CEP = preg_replace('/[^0-9]/', '', $endereco['cep']);
    if (strlen($std->CEP) !== 8) {
        throw new Exception('CEP deve ter 8 dígitos');
    }
    $std->cPais = 1058; // Brasil
    $std->xPais = 'Brasil';

    $make->tagenderEmit($std);

    error_log("🏢 NFCE: Emitente configurado - {$empresa['razao_social']}");

    // Destinatário (OPCIONAL para NFC-e) - MÉTODO NATIVO
    $destinatario = $nfceData['destinatario'] ?? [];

    if (!empty($destinatario['documento'])) {
        $std = new stdClass();

        // Limpar documento
        $documento = preg_replace('/[^0-9]/', '', $destinatario['documento']);

        if (strlen($documento) === 11) {
            // CPF
            $std->CPF = $documento;
        } elseif (strlen($documento) === 14) {
            // CNPJ
            $std->CNPJ = $documento;
        } else {
            throw new Exception('Documento do destinatário deve ser CPF (11 dígitos) ou CNPJ (14 dígitos)');
        }

        $std->xNome = $destinatario['nome'] ?? 'CONSUMIDOR';
        $std->indIEDest = 9; // Não contribuinte

        $make->tagdest($std);

        error_log("👤 NFCE: Destinatário configurado - {$std->xNome}");
    } else {
        error_log("👤 NFCE: Sem destinatário (consumidor não identificado)");
    }

    // Produtos (MÉTODO NATIVO) - SEM FALLBACKS
    error_log("📦 NFCE: Processando produtos...");
    $produtos = $nfceData['produtos'] ?? [];

    if (empty($produtos)) {
        error_log("❌ NFCE: Nenhum produto informado");
        throw new Exception('Pelo menos um produto é obrigatório');
    }

    error_log("📋 NFCE: Total de produtos: " . count($produtos));
    error_log("📋 NFCE: Produtos recebidos: " . json_encode($produtos, JSON_UNESCAPED_UNICODE));

    $totalProdutos = 0;
    $totalICMS = 0;
    $totalPIS = 0;
    $totalCOFINS = 0;

    foreach ($produtos as $index => $produto) {
        $nItem = $index + 1;
        error_log("📦 NFCE: Processando produto {$nItem}: " . json_encode($produto, JSON_UNESCAPED_UNICODE));

        // Validar dados obrigatórios do produto (SEM FALLBACKS)
        error_log("🔍 NFCE: Validando produto {$nItem}...");

        if (empty($produto['codigo'])) {
            error_log("❌ NFCE: Código do produto {$nItem} vazio");
            throw new Exception("Código do produto {$nItem} é obrigatório");
        }
        error_log("✅ NFCE: Produto {$nItem} - Código: {$produto['codigo']}");

        if (empty($produto['descricao'])) {
            error_log("❌ NFCE: Descrição do produto {$nItem} vazia");
            throw new Exception("Descrição do produto {$nItem} é obrigatória");
        }
        error_log("✅ NFCE: Produto {$nItem} - Descrição: {$produto['descricao']}");

        if (!isset($produto['quantidade']) || $produto['quantidade'] <= 0) {
            error_log("❌ NFCE: Quantidade do produto {$nItem} inválida: " . ($produto['quantidade'] ?? 'null'));
            throw new Exception("Quantidade do produto {$nItem} deve ser maior que zero");
        }
        error_log("✅ NFCE: Produto {$nItem} - Quantidade: {$produto['quantidade']}");

        if (!isset($produto['valor_unitario']) || $produto['valor_unitario'] <= 0) {
            error_log("❌ NFCE: Valor unitário do produto {$nItem} inválido: " . ($produto['valor_unitario'] ?? 'null'));
            throw new Exception("Valor unitário do produto {$nItem} deve ser maior que zero");
        }
        error_log("✅ NFCE: Produto {$nItem} - Valor unitário: {$produto['valor_unitario']}");

        if (empty($produto['unidade'])) {
            error_log("❌ NFCE: Unidade do produto {$nItem} vazia");
            throw new Exception("Unidade do produto {$nItem} é obrigatória");
        }
        error_log("✅ NFCE: Produto {$nItem} - Unidade: {$produto['unidade']}");

        if (empty($produto['ncm'])) {
            error_log("❌ NFCE: NCM do produto {$nItem} vazio");
            throw new Exception("NCM do produto {$nItem} é obrigatório");
        }
        error_log("✅ NFCE: Produto {$nItem} - NCM: {$produto['ncm']}");

        if (empty($produto['cfop'])) {
            error_log("❌ NFCE: CFOP do produto {$nItem} vazio");
            throw new Exception("CFOP do produto {$nItem} é obrigatório");
        }
        error_log("✅ NFCE: Produto {$nItem} - CFOP: {$produto['cfop']}");

        // Calcular valores
        $quantidade = (float)$produto['quantidade'];
        $valorUnitario = (float)$produto['valor_unitario'];
        $valorTotal = $quantidade * $valorUnitario;
        $totalProdutos += $valorTotal;

        // Tag PROD (Produto) - MÉTODO NATIVO
        $std = new stdClass();
        $std->cProd = $produto['codigo'];
        $std->cEAN = $produto['codigo_barras'] ?? 'SEM GTIN'; // EAN13 ou SEM GTIN
        $std->xProd = $produto['descricao'];
        $std->NCM = preg_replace('/[^0-9]/', '', $produto['ncm']);
        if (strlen($std->NCM) !== 8) {
            throw new Exception("NCM do produto {$nItem} deve ter 8 dígitos");
        }
        $std->CFOP = preg_replace('/[^0-9]/', '', $produto['cfop']);
        if (strlen($std->CFOP) !== 4) {
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

        $make->tagprod($std);

        error_log("📦 NFCE: Produto {$nItem} - {$produto['descricao']} - R$ {$valorTotal}");
    }

    error_log("💰 NFCE: Total produtos: R$ {$totalProdutos}");

    // Impostos simplificados para NFC-e (MÉTODO NATIVO)
    foreach ($produtos as $index => $produto) {
        $nItem = $index + 1;

        // ICMS Simples Nacional (CST 102 - Sem tributação)
        $std = new stdClass();
        $std->orig = 0; // Nacional
        $std->CSOSN = '102'; // Simples Nacional - Sem tributação

        $make->tagICMSSN($std);

        // PIS (CST 49 - Outras operações)
        $std = new stdClass();
        $std->CST = '49'; // Outras operações

        $make->tagPIS($std);

        // COFINS (CST 49 - Outras operações)
        $std = new stdClass();
        $std->CST = '49'; // Outras operações

        $make->tagCOFINS($std);

        error_log("💸 NFCE: Impostos produto {$nItem} - ICMS: Simples Nacional");
    }

    // Totais da NFC-e (MÉTODO NATIVO)
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

    $make->tagICMSTot($std);

    error_log("💰 NFCE: Totais - Produtos: R$ {$totalProdutos}, Total NFC-e: R$ {$std->vNF}");

    // Transporte (MÉTODO NATIVO) - OBRIGATÓRIO
    $std = new stdClass();
    $std->modFrete = 9; // 9=Sem Ocorrência de Transporte

    $make->tagtransp($std);

    // Pagamento (MÉTODO NATIVO) - Específico para NFC-e
    // 1. PRIMEIRO: Criar grupo PAG (container)
    $std = new stdClass();
    $std->vTroco = 0.00; // Troco (obrigatório para NFC-e)
    $make->tagpag($std);

    // 2. SEGUNDO: Adicionar forma de pagamento
    $std = new stdClass();
    $std->indPag = 0; // Pagamento à vista
    $std->tPag = '01'; // Dinheiro (padrão para NFC-e)
    $std->vPag = $totalProdutos; // Valor pago

    $make->tagdetPag($std);

    error_log("💳 NFCE: Pagamento configurado - Dinheiro: R$ {$totalProdutos}");

    // Informações adicionais (MÉTODO NATIVO)
    $std = new stdClass();
    $std->infCpl = 'NFC-e emitida pelo Sistema Nexo PDV';

    $make->taginfAdic($std);

    // Gerar XML (MÉTODO NATIVO)
    error_log("📄 NFCE: Gerando XML...");
    try {
        $xml = $make->getXML();

        if (empty($xml)) {
            error_log("❌ NFCE: XML gerado está vazio");
            throw new Exception('Erro ao gerar XML da NFC-e');
        }

        error_log("✅ NFCE: XML gerado - Tamanho: " . strlen($xml) . " bytes");
        error_log("📄 NFCE: XML (primeiros 500 chars): " . substr($xml, 0, 500) . "...");

    } catch (Exception $xmlError) {
        error_log("❌ NFCE: Erro ao gerar XML: " . $xmlError->getMessage());
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
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
