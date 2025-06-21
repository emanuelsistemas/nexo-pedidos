<?php
// ✅ CONFIGURAR TIMEZONE BRASILEIRO PARA CORRIGIR HORÁRIO
date_default_timezone_set('America/Sao_Paulo');

// ✅ DEBUG: Configurar logs de erro
error_reporting(E_ALL);
ini_set('display_errors', 0); // ✅ DESABILITAR display_errors para evitar HTML no JSON
ini_set('log_errors', 1);
ini_set('error_log', '/var/log/php_nfe_debug.log');

// ✅ FUNÇÃO DE LOG DETALHADO (igual à NFC-e)
function logDetalhado($step, $message, $data = []) {
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[{$timestamp}] [{$step}] {$message}";

    if (!empty($data)) {
        $logEntry .= " | DATA: " . json_encode($data, JSON_UNESCAPED_UNICODE);
    }

    error_log($logEntry);

    // Salvar também em arquivo específico para debug
    $debugFile = '/tmp/nfe_detailed.log';
    file_put_contents($debugFile, $logEntry . "\n", FILE_APPEND | LOCK_EX);
}

// ✅ DEBUG CRÍTICO: Registrar handler de erro fatal para capturar HTTP 502
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR])) {
        $errorMsg = "❌ ERRO FATAL NFe: " . $error['message'] . " em " . $error['file'] . ":" . $error['line'];
        error_log($errorMsg);

        // Salvar em arquivo específico para debug
        file_put_contents('/tmp/nfe_fatal_error.log', date('Y-m-d H:i:s') . " - " . $errorMsg . "\n", FILE_APPEND);

        // Tentar enviar resposta JSON mesmo com erro fatal
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erro fatal no servidor: ' . $error['message'],
                'error_type' => 'fatal_error',
                'debug_info' => [
                    'file' => basename($error['file']),
                    'line' => $error['line'],
                    'type' => $error['type'],
                    'step' => 'FATAL_ERROR'
                ]
            ]);
        }
    }
});

// ✅ CONFIGURAÇÃO DE TIMEOUT PARA EVITAR 502
ini_set('max_execution_time', 300); // 5 minutos
ini_set('memory_limit', '512M');

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// ✅ DEBUG: Log início da execução
error_log("=== INÍCIO EMISSÃO NFE === " . date('Y-m-d H:i:s'));
error_log("REQUEST_METHOD: " . $_SERVER['REQUEST_METHOD']);
error_log("CONTENT_TYPE: " . ($_SERVER['CONTENT_TYPE'] ?? 'N/A'));

require_once '../vendor/autoload.php';

// TRADUZIR ERROS SEFAZ PARA MENSAGENS AMIGÁVEIS
function traduzirErroSefaz($status, $motivo) {
    $errosComuns = [
        // Erros de Duplicidade e Numeração
        '206' => [
            'titulo' => 'NFe Duplicada',
            'descricao' => 'Esta NFe já foi inutilizada na SEFAZ e não pode ser emitida.',
            'solucao' => 'Use um número diferente ou verifique se a numeração não foi inutilizada.'
        ],
        '539' => [
            'titulo' => 'NFe Duplicada',
            'descricao' => 'Já existe uma NFe autorizada com este número e série.',
            'solucao' => 'Use um número sequencial diferente para esta NFe.'
        ],

        // Erros de Documentos
        '204' => [
            'titulo' => 'CNPJ Inválido',
            'descricao' => 'O CNPJ da empresa está incorreto ou inválido.',
            'solucao' => 'Verifique e corrija o CNPJ da empresa nas configurações.'
        ],
        '207' => [
            'titulo' => 'CNPJ Inválido',
            'descricao' => 'O CNPJ do emitente está incorreto ou inválido.',
            'solucao' => 'Verifique e corrija o CNPJ da empresa nas configurações.'
        ],
        '209' => [
            'titulo' => 'Inscrição Estadual Inválida',
            'descricao' => 'A Inscrição Estadual da empresa está incorreta ou inválida.',
            'solucao' => 'Verifique e corrija a Inscrição Estadual da empresa nas configurações.'
        ],
        '215' => [
            'titulo' => 'CNPJ do Destinatário Inválido',
            'descricao' => 'O CNPJ/CPF do destinatário está incorreto.',
            'solucao' => 'Verifique e corrija o documento do destinatário.'
        ],
        '401' => [
            'titulo' => 'CPF Inválido',
            'descricao' => 'O CPF do emitente está incorreto ou inválido.',
            'solucao' => 'Verifique e corrija o CPF nas configurações.'
        ],

        // Erros de Data e Horário
        '228' => [
            'titulo' => 'Data de Emissão Atrasada',
            'descricao' => 'A data de emissão está muito atrasada (mais de 30 dias).',
            'solucao' => 'Ajuste a data de emissão para uma data mais recente.'
        ],
        '703' => [
            'titulo' => 'Data de Emissão Futura',
            'descricao' => 'A data de emissão está no futuro.',
            'solucao' => 'Ajuste a data de emissão para a data atual ou anterior.'
        ],

        // Erros de Chave de Acesso
        '502' => [
            'titulo' => 'Chave de Acesso Inválida',
            'descricao' => 'A chave de acesso não corresponde aos dados da NFe.',
            'solucao' => 'Regenere a NFe para criar uma nova chave de acesso válida.'
        ],
        '253' => [
            'titulo' => 'Dígito Verificador Inválido',
            'descricao' => 'O dígito verificador da chave de acesso está incorreto.',
            'solucao' => 'Regenere a NFe para corrigir o dígito verificador.'
        ],

        // Erros de Ambiente
        '252' => [
            'titulo' => 'Ambiente Incorreto',
            'descricao' => 'O ambiente da NFe não corresponde ao ambiente do servidor.',
            'solucao' => 'Verifique se está emitindo no ambiente correto (produção/homologação).'
        ],

        // Erros de UF e Localização
        '226' => [
            'titulo' => 'UF Incorreta',
            'descricao' => 'A UF do emitente não corresponde à UF autorizadora.',
            'solucao' => 'Verifique se a UF da empresa está configurada corretamente.'
        ],
        '270' => [
            'titulo' => 'Município Inexistente',
            'descricao' => 'O código do município não existe na tabela do IBGE.',
            'solucao' => 'Verifique e corrija o código do município da empresa.'
        ],
        '272' => [
            'titulo' => 'Município Inexistente',
            'descricao' => 'O código do município do emitente não existe.',
            'solucao' => 'Verifique e corrija o código do município da empresa.'
        ],

        // Erros de Certificado
        '280' => [
            'titulo' => 'Certificado Digital Inválido',
            'descricao' => 'O certificado digital está vencido ou inválido.',
            'solucao' => 'Renove ou configure um certificado digital válido.'
        ],

        // Erros de Produtos e Impostos
        '897' => [
            'titulo' => 'Código Numérico Inválido',
            'descricao' => 'O código numérico da NFe está em formato inválido.',
            'solucao' => 'Regenere a NFe para criar um novo código numérico válido.'
        ],

        // Erros de Produtos
        '611' => [
            'titulo' => 'Código EAN/GTIN Inválido',
            'descricao' => 'O código de barras EAN/GTIN de um ou mais produtos está incorreto.',
            'solucao' => 'Verifique e corrija os códigos EAN/GTIN dos produtos ou deixe em branco se não possuir.'
        ],

        // Erros de Processamento
        '103' => [
            'titulo' => 'Lote em Processamento',
            'descricao' => 'A NFe foi enviada e está sendo processada pela SEFAZ.',
            'solucao' => 'Aguarde alguns segundos e consulte o status novamente.'
        ]
    ];

    if (isset($errosComuns[$status])) {
        $erro = $errosComuns[$status];
        return [
            'titulo' => $erro['titulo'],
            'descricao' => $erro['descricao'],
            'solucao' => $erro['solucao'],
            'status_original' => $status,
            'motivo_original' => $motivo
        ];
    }

    return [
        'titulo' => 'Erro na Validação da NFe',
        'descricao' => $motivo,
        'solucao' => 'Verifique os dados da NFe e tente novamente.',
        'status_original' => $status,
        'motivo_original' => $motivo
    ];
}

try {
    logDetalhado('001', 'Iniciando emissão de NFe modelo 55');
    error_log("🚀 CHECKPOINT 1: Iniciando emissão de NFe modelo 55");

    // ✅ ADICIONAR TRATAMENTO DE ERRO FATAL
    register_shutdown_function(function() {
        $error = error_get_last();
        if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
            error_log("❌ ERRO FATAL NFe: " . $error['message'] . " em " . $error['file'] . " linha " . $error['line']);

            if (!headers_sent()) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'error' => 'Erro fatal no servidor: ' . $error['message'],
                    'error_type' => 'fatal_error',
                    'timestamp' => date('Y-m-d H:i:s'),
                    'debug_info' => [
                        'file' => basename($error['file']),
                        'line' => $error['line'],
                        'step' => 'FATAL_ERROR'
                    ]
                ], JSON_UNESCAPED_UNICODE);
            }
        }
    });

    // Validar método
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        logDetalhado('002', 'Erro: Método não permitido', ['method' => $_SERVER['REQUEST_METHOD']]);
        throw new Exception('Método não permitido. Use POST.');
    }

    logDetalhado('003', 'Método POST validado');
    error_log("✅ CHECKPOINT 2: Método POST validado");

    // Receber dados
    $rawInput = file_get_contents('php://input');
    logDetalhado('004', 'Dados brutos recebidos', ['size' => strlen($rawInput)]);
    error_log("✅ CHECKPOINT 3: Dados brutos recebidos - " . strlen($rawInput) . " bytes");

    $input = json_decode($rawInput, true);

    if (!$input) {
        logDetalhado('005', 'Erro: JSON inválido', ['raw_input' => substr($rawInput, 0, 500)]);
        throw new Exception('Dados JSON inválidos');
    }

    logDetalhado('006', 'JSON decodificado com sucesso', ['keys' => array_keys($input)]);
    error_log("✅ CHECKPOINT 4: JSON decodificado com sucesso");
    
    // Validar empresa_id (OBRIGATÓRIO para multi-tenant)
    $empresaId = $input['empresa_id'] ?? null;

    if (!$empresaId) {
        error_log("❌ ERRO: empresa_id vazio ou não informado");
        error_log("Input recebido: " . json_encode($input));
        throw new Exception('empresa_id é obrigatório');
    }

    error_log("✅ empresa_id válido: " . $empresaId);

    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $empresaId)) {
        throw new Exception('empresa_id inválido');
    }

    // 🎯 BUSCAR CONFIGURAÇÃO REAL DA EMPRESA (SEM FALLBACKS)
    error_log("NFE: Buscando configuração real da empresa {$empresaId}");

    // Verificar se dados da empresa estão completos no payload
    // Se não estiverem, buscar do banco de dados
    $empresaConfigCompleta = true;
    $nfeData = $input['nfe_data'] ?? $input;

    if (empty($nfeData['empresa']['uf']) ||
        empty($nfeData['empresa']['codigo_municipio']) ||
        empty($nfeData['ambiente'])) {
        $empresaConfigCompleta = false;
        error_log("NFE: Dados da empresa incompletos no payload, buscando do banco");
    }
    
    // Carregar certificado da empresa
    $certificadoPath = "../storage/certificados/empresa_{$empresaId}.pfx";
    $metadataPath = "../storage/certificados/empresa_{$empresaId}.json";
    
    if (!file_exists($certificadoPath) || !file_exists($metadataPath)) {
        throw new Exception('Certificado não encontrado para esta empresa');
    }
    
    $metadata = json_decode(file_get_contents($metadataPath), true);
    $certificado = file_get_contents($certificadoPath);
    
    // Extrair dados da NFe do payload (formato do frontend)
    $nfeData = $input['nfe_data'] ?? $input;

    // Log da informação adicional recebida
    error_log("NFE: Informação adicional recebida: " . ($nfeData['informacao_adicional'] ?? 'VAZIO'));
    error_log("NFE: Dados recebidos - keys: " . implode(', ', array_keys($nfeData)));

    // Validação básica dos dados recebidos

    // Salvar logs detalhados em arquivo específico para debug
    $debugFile = '/tmp/nfe_debug.log';
    $debugLog = "\n=== DEBUG NFe - " . date('Y-m-d H:i:s') . " ===\n";
    $debugLog .= "Empresa presente: " . (isset($nfeData['empresa']) ? 'SIM' : 'NÃO') . "\n";
    $debugLog .= "Destinatário presente: " . (isset($nfeData['destinatario']) ? 'SIM' : 'NÃO') . "\n";
    $debugLog .= "Produtos presente: " . (isset($nfeData['produtos']) ? 'SIM (' . count($nfeData['produtos']) . ' produtos)' : 'NÃO') . "\n";
    $debugLog .= "Chaves principais: " . implode(', ', array_keys($nfeData)) . "\n";
    $debugLog .= "=== ESTRUTURA COMPLETA ===\n";
    $debugLog .= json_encode($nfeData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
    $debugLog .= "=== FIM DEBUG ===\n\n";

    file_put_contents($debugFile, $debugLog, FILE_APPEND | LOCK_EX);

    // Log simples no error_log também
    error_log("NFe Debug: Dados salvos em $debugFile");

    // Validar dados mínimos
    if (!isset($nfeData['empresa']) || !isset($nfeData['destinatario']) || !isset($nfeData['produtos'])) {
        error_log("ERRO: Dados da NFe incompletos!");
        error_log("Faltando - Empresa: " . (!isset($nfeData['empresa']) ? 'SIM' : 'NÃO'));
        error_log("Faltando - Destinatário: " . (!isset($nfeData['destinatario']) ? 'SIM' : 'NÃO'));
        error_log("Faltando - Produtos: " . (!isset($nfeData['produtos']) ? 'SIM' : 'NÃO'));
        error_log("Dados recebidos completos: " . json_encode($nfeData, JSON_PRETTY_PRINT));
        throw new Exception('Dados da NFe incompletos - verifique se todos os campos obrigatórios estão preenchidos');
    }

    // Configuração da empresa (USANDO DADOS REAIS DA EMPRESA)
    $empresa = $nfeData['empresa'];

    // Validar ambiente obrigatório (SEM FALLBACK - deve vir da tabela nfe_config)
    if (empty($nfeData['ambiente'])) {
        throw new Exception('Ambiente NFe é obrigatório (deve vir da configuração da empresa)');
    }
    $ambiente = $nfeData['ambiente'] === 'producao' ? 1 : 2;
    
    // Validar dados obrigatórios da empresa - SEM FALLBACKS
    if (empty($empresa['razao_social'])) {
        throw new Exception('Razão social da empresa é obrigatória');
    }
    if (empty($empresa['cnpj'])) {
        throw new Exception('CNPJ da empresa é obrigatório');
    }
    if (empty($empresa['uf'])) {
        throw new Exception('UF da empresa é obrigatória');
    }

    $cnpjLimpo = preg_replace('/[^0-9]/', '', $empresa['cnpj']);
    if (strlen($cnpjLimpo) !== 14) {
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
        // ✅ DESABILITAR criação automática de pastas pela biblioteca
        "pathNFePHP" => null
    ];
    
    // Criar objeto Certificate
    error_log("✅ CHECKPOINT 5: Criando certificado digital");
    $certificate = \NFePHP\Common\Certificate::readPfx($certificado, $metadata['password'] ?? '');
    error_log("✅ CHECKPOINT 6: Certificado digital criado com sucesso");

    // Inicializar Tools (MÉTODO NATIVO)
    error_log("✅ CHECKPOINT 7: Inicializando Tools NFePHP");
    $tools = new \NFePHP\NFe\Tools(json_encode($config), $certificate);
    $tools->model('55'); // Modelo NFe
    error_log("✅ CHECKPOINT 8: Tools NFePHP inicializado com sucesso");

    // ✅ DESABILITAR criação automática de diretórios pela biblioteca
    // Isso evita que a biblioteca crie pastas 55/65 no storage raiz
    if (method_exists($tools, 'setPathNFePHP')) {
        $tools->setPathNFePHP(null);
    }

    // Inicializar Make (MÉTODO NATIVO)
    error_log("✅ CHECKPOINT 9: Inicializando Make NFePHP");
    $make = new \NFePHP\NFe\Make();
    error_log("✅ CHECKPOINT 10: Make NFePHP inicializado com sucesso");
    
    // MONTAGEM DA NFe USANDO MÉTODOS NATIVOS DA BIBLIOTECA
    // Identificação da NFe
    $identificacao = $nfeData['identificacao'] ?? [];

    // Código UF dinâmico baseado na empresa (SEM FALLBACKS)
    $codigosUF = [
        'AC' => 12, 'AL' => 17, 'AP' => 16, 'AM' => 13, 'BA' => 29,
        'CE' => 23, 'DF' => 53, 'ES' => 32, 'GO' => 52, 'MA' => 21,
        'MT' => 51, 'MS' => 50, 'MG' => 31, 'PA' => 15, 'PB' => 25,
        'PR' => 41, 'PE' => 26, 'PI' => 22, 'RJ' => 33, 'RN' => 24,
        'RS' => 43, 'RO' => 11, 'RR' => 14, 'SC' => 42, 'SP' => 35,
        'SE' => 28, 'TO' => 17
    ];

    // Validar UF obrigatória (SEM FALLBACK)
    if (empty($empresa['uf'])) {
        throw new Exception('UF da empresa é obrigatória');
    }
    $uf = $empresa['uf'];

    // Validar se UF existe na tabela de códigos
    if (!isset($codigosUF[$uf])) {
        throw new Exception("UF '{$uf}' não é válida");
    }

    // CRIAR ESTRUTURA INFNFE
    $std = new stdClass();
    $std->versao = '4.00';
    $std->Id = null; // Será gerado automaticamente
    $std->pk_nItem = null;

    // USAR MÉTODO NATIVO PARA ADICIONAR IDENTIFICAÇÃO
    $make->taginfNFe($std);

    // ✅ ADICIONADO: Processar chaves de referência (obrigatórias para finalidades 2, 3 e 4)
    $chavesRef = $nfeData['chaves_ref'] ?? [];
    $finalidade = $identificacao['finalidade'] ?? '1';

    error_log("🔍 DEBUG CHAVES REF - Dados recebidos:");
    error_log("  - Finalidade: " . $finalidade);
    error_log("  - Quantidade de chaves: " . count($chavesRef));
    error_log("  - Estrutura identificacao: " . json_encode($identificacao));

    // ✅ DEBUG: Verificar se finalidade está sendo definida corretamente
    if (empty($finalidade)) {
        error_log("❌ ERRO: Finalidade vazia ou não definida");
        throw new Exception('Finalidade da NFe é obrigatória');
    }

    // ✅ CORREÇÃO: Regras oficiais de chave de referência
    // Finalidade 1 (Normal) = OPCIONAL (se informada, deve aparecer no XML/DANFE)
    // Finalidade 2 (Complementar) = OBRIGATÓRIA
    // Finalidade 3 (Ajuste) = OBRIGATÓRIA
    // Finalidade 4 (Devolução) = OBRIGATÓRIA
    $finalidadeExigeChave = in_array($finalidade, ['2', '3', '4']);

    if ($finalidadeExigeChave) {
        error_log("✅ Finalidade {$finalidade} exige chave de referência obrigatória");

        if (empty($chavesRef)) {
            error_log("❌ ERRO: Finalidade {$finalidade} exige chave de referência, mas nenhuma foi informada");
            throw new Exception("NFe com finalidade {$finalidade} deve ter pelo menos uma chave de referência");
        }
    }

    // ✅ CORREÇÃO: Processar chaves de referência se informadas (independente da finalidade)
    if (!empty($chavesRef)) {
        error_log("✅ Processando " . count($chavesRef) . " chave(s) de referência para finalidade {$finalidade}");

        foreach ($chavesRef as $index => $chaveRef) {
            $chave = $chaveRef['chave'] ?? '';

            if (empty($chave) || strlen($chave) !== 44) {
                error_log("❌ ERRO: Chave de referência {$index} inválida: {$chave}");
                throw new Exception("Chave de referência " . ($index + 1) . " deve ter 44 dígitos");
            }

            // ✅ CORREÇÃO: Usar método correto tagrefNFe() em vez de tagNFref()
            $stdRef = new stdClass();
            $stdRef->refNFe = $chave;

            $make->tagrefNFe($stdRef);
            error_log("✅ Chave de referência adicionada: {$chave}");
        }
    } else {
        if ($finalidadeExigeChave) {
            error_log("❌ ERRO: Finalidade {$finalidade} exige chave de referência");
        } else {
            error_log("ℹ️ Finalidade {$finalidade} - nenhuma chave de referência informada (opcional)");
        }
    }

    // CRIAR TAG IDE (IDENTIFICAÇÃO) - OBRIGATÓRIO ANTES DOS PRODUTOS
    $std = new stdClass();
    $std->cUF = $codigosUF[$uf]; // Usar código real da UF da empresa (SEM FALLBACK)

    // ✅ USAR CÓDIGO NUMÉRICO DO FRONTEND (SEM FALLBACK)
    $codigoNumerico = $identificacao['codigo_numerico'] ?? null;
    if (empty($codigoNumerico)) {
        throw new Exception('Código numérico da NFe é obrigatório');
    }
    $std->cNF = str_pad($codigoNumerico, 8, '0', STR_PAD_LEFT);

    $std->natOp = $identificacao['natureza_operacao'] ?? 'Venda de mercadoria';
    $std->mod = 55; // NFe
    $std->serie = (int)($identificacao['serie'] ?? 1);
    $std->nNF = (int)($identificacao['numero'] ?? 1);
    $std->dhEmi = date('Y-m-d\TH:i:sP'); // ✅ Agora com timezone brasileiro
    $std->tpNF = 1; // Saída
    $std->idDest = 1; // Operação interna

    // ✅ ADICIONADO: Finalidade da emissão (obrigatório para chaves de referência)
    $std->finNFe = (int)$finalidade; // 1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução
    error_log("✅ Finalidade NFe definida: {$finalidade}");

    // Validar código do município obrigatório (SEM FALLBACK)
    if (empty($empresa['codigo_municipio'])) {
        throw new Exception('Código do município da empresa é obrigatório');
    }
    $std->cMunFG = (int)$empresa['codigo_municipio']; // Usar código real do município da empresa

    $std->tpImp = 1; // DANFE normal
    $std->tpEmis = 1; // Emissão normal
    $std->cDV = 0;
    $std->tpAmb = $ambiente;
    // ✅ REMOVIDO: $std->finNFe = 1; (já definido acima com valor correto)
    $std->indFinal = 1; // Consumidor final
    $std->indPres = 1; // Presencial
    $std->procEmi = 0; // Aplicativo do contribuinte
    $std->verProc = '1.0.0';

    $make->tagide($std);

    // Emitente (MÉTODO NATIVO) - SEM FALLBACKS
    $std = new stdClass();
    $std->xNome = $empresa['razao_social']; // JÁ VALIDADO ACIMA
    $std->CNPJ = $cnpjLimpo; // JÁ VALIDADO ACIMA
    $std->xFant = $empresa['nome_fantasia'] ?? null; // OPCIONAL

    // Validar IE obrigatória
    if (empty($empresa['inscricao_estadual'])) {
        throw new Exception('Inscrição Estadual da empresa é obrigatória');
    }
    $std->IE = $empresa['inscricao_estadual'];

    // Validar regime tributário obrigatório
    if (empty($empresa['regime_tributario'])) {
        throw new Exception('Regime tributário da empresa é obrigatório');
    }
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
    if (empty($endereco['cidade'])) {
        throw new Exception('Cidade da empresa é obrigatória');
    }
    if (empty($endereco['cep'])) {
        throw new Exception('CEP da empresa é obrigatório');
    }
    if (empty($empresa['codigo_municipio'])) {
        throw new Exception('Código do município da empresa é obrigatório');
    }

    $std = new stdClass();
    $std->xLgr = $endereco['logradouro'];
    $std->nro = $endereco['numero'];
    $std->xBairro = $endereco['bairro'];
    $std->cMun = (int)$empresa['codigo_municipio'];
    $std->xMun = $endereco['cidade'];
    $std->UF = $empresa['uf']; // JÁ VALIDADO ACIMA
    $std->CEP = preg_replace('/[^0-9]/', '', $endereco['cep']);
    $std->cPais = 1058;
    $std->xPais = 'BRASIL';

    $make->tagenderEmit($std);

    // Destinatário (MÉTODO NATIVO)
    $destinatario = $nfeData['destinatario'];

    $std = new stdClass();

    // Tentar diferentes campos para o nome do destinatário
    $nomeDestinatario = '';
    if (isset($destinatario['nome'])) {
        $nomeDestinatario = $destinatario['nome'];
    } elseif (isset($destinatario['name'])) {
        $nomeDestinatario = $destinatario['name'];
    } elseif (isset($destinatario['razao_social'])) {
        $nomeDestinatario = $destinatario['razao_social'];
    } elseif (isset($destinatario['cliente'])) {
        $nomeDestinatario = $destinatario['cliente'];
    }

    if (empty($nomeDestinatario)) {
        throw new Exception("Nome do destinatário não encontrado");
    }

    $std->xNome = $nomeDestinatario;

    $documento = preg_replace('/[^0-9]/', '', $destinatario['documento'] ?? '');
    if (strlen($documento) === 11) {
        $std->CPF = $documento;
        $std->indIEDest = 9; // 9=Não contribuinte (pessoa física)
    } else {
        $std->CNPJ = $documento;
        $std->indIEDest = 9; // 9=Não contribuinte (assumindo não contribuinte)
        // Para contribuintes: 1=Contribuinte ICMS, 2=Contribuinte isento, 9=Não contribuinte
    }

    $make->tagdest($std);

    // Endereço do destinatário (OBRIGATÓRIO - SEM FALLBACKS FICTÍCIOS)
    $enderecoDestinatario = $destinatario['endereco'] ?? [];

    if (!empty($enderecoDestinatario)) {
        // Validar dados obrigatórios do endereço do destinatário (SEM FALLBACKS)
        if (empty($enderecoDestinatario['logradouro'])) {
            throw new Exception('Logradouro do destinatário é obrigatório');
        }
        if (empty($enderecoDestinatario['numero'])) {
            throw new Exception('Número do endereço do destinatário é obrigatório');
        }
        if (empty($enderecoDestinatario['bairro'])) {
            throw new Exception('Bairro do destinatário é obrigatório');
        }
        if (empty($enderecoDestinatario['codigo_municipio'])) {
            throw new Exception('Código do município do destinatário é obrigatório');
        }
        if (empty($enderecoDestinatario['cidade'])) {
            throw new Exception('Cidade do destinatário é obrigatória');
        }
        if (empty($enderecoDestinatario['uf'])) {
            throw new Exception('UF do destinatário é obrigatória');
        }
        if (empty($enderecoDestinatario['cep'])) {
            throw new Exception('CEP do destinatário é obrigatório');
        }

        $std = new stdClass();
        $std->xLgr = $enderecoDestinatario['logradouro'];
        $std->nro = $enderecoDestinatario['numero'];
        $std->xBairro = $enderecoDestinatario['bairro'];
        $std->cMun = (int)$enderecoDestinatario['codigo_municipio'];
        $std->xMun = $enderecoDestinatario['cidade'];
        $std->UF = $enderecoDestinatario['uf'];
        $std->CEP = preg_replace('/[^0-9]/', '', $enderecoDestinatario['cep']);
        $std->cPais = 1058;
        $std->xPais = 'BRASIL';

        $make->tagenderDest($std);
    } else {
        throw new Exception('Endereço do destinatário é obrigatório para NFe');
    }

    // Produtos (MÉTODO NATIVO) - USANDO DADOS FISCAIS REAIS
    $produtos = $nfeData['produtos'] ?? [];

    // ✅ VALIDAÇÃO CRÍTICA: Verificar se há produtos válidos
    if (empty($produtos)) {
        error_log("❌ ERRO CRÍTICO: Nenhum produto encontrado nos dados da NFe");
        error_log("📊 DADOS RECEBIDOS: " . json_encode($nfeData, JSON_UNESCAPED_UNICODE));
        throw new Exception('NFe deve conter pelo menos um produto');
    }

    error_log("🚀 INICIANDO PROCESSAMENTO NFe:");
    error_log("  - Total de produtos: " . count($produtos));
    error_log("  - Empresa ID: " . ($nfeData['empresa_id'] ?? 'N/A'));
    error_log("  - Regime tributário: " . ($nfeData['regime_tributario'] ?? 'N/A'));

    // ✅ CONTADOR DE TAGS CRIADAS PARA DIAGNÓSTICO
    $contadorTags = [
        'produtos' => 0,
        'impostos' => 0,
        'icms' => 0,
        'pis' => 0,
        'cofins' => 0
    ];

    error_log("📊 CONTADORES INICIALIZADOS: " . json_encode($contadorTags));

    foreach ($produtos as $index => $produto) {
        $item = $index + 1;

        error_log("🔍 PROCESSANDO PRODUTO {$item}:");
        error_log("  - Dados recebidos: " . json_encode($produto, JSON_UNESCAPED_UNICODE));

        // ✅ TIMEOUT DE SEGURANÇA: Verificar se não está demorando muito
        $tempoInicio = microtime(true);

        try {

        // ✅ VALIDAÇÃO CRÍTICA: Verificar se produto tem dados mínimos
        if (empty($produto) || !is_array($produto)) {
            error_log("❌ PRODUTO {$item}: Dados inválidos ou vazios - PULANDO");
            continue;
        }

        // ✅ VALIDAÇÃO: Verificar campos obrigatórios do produto
        $camposFaltando = [];

        // Verificar código do produto
        if (empty($produto['codigo']) && empty($produto['id'])) {
            $camposFaltando[] = 'codigo';
        }

        // Verificar nome/descrição do produto (aceitar qualquer um dos campos)
        $temNome = !empty($produto['descricao']) || !empty($produto['nome']) ||
                   !empty($produto['name']) || !empty($produto['produto']);
        if (!$temNome) {
            $camposFaltando[] = 'nome/descricao';
        }

        // Verificar NCM
        if (empty($produto['ncm'])) {
            $camposFaltando[] = 'ncm';
        }

        // Verificar CFOP
        if (empty($produto['cfop'])) {
            $camposFaltando[] = 'cfop';
        }

        if (!empty($camposFaltando)) {
            error_log("❌ PRODUTO {$item}: Campos obrigatórios faltando: " . implode(', ', $camposFaltando));
            error_log("📊 ESTADO DOS CONTADORES NO MOMENTO DO ERRO:");
            error_log("  - Produtos: {$contadorTags['produtos']}");
            error_log("  - IMPOSTO: {$contadorTags['impostos']}");
            error_log("  - ICMS/ICMSSN: {$contadorTags['icms']}");
            error_log("  - PIS: {$contadorTags['pis']}");
            error_log("  - COFINS: {$contadorTags['cofins']}");
            
            throw new Exception("Produto {$item}: Campos obrigatórios faltando: " . implode(', ', $camposFaltando));
        }

        error_log("✅ PRODUTO {$item}: Validação inicial aprovada - iniciando criação das tags");

        // Log dos dados fiscais do produto
        error_log("NFE: Produto {$item} - NCM: " . ($produto['ncm'] ?? 'N/A') .
                  ", CFOP: " . ($produto['cfop'] ?? 'N/A') .
                  ", ICMS: " . ($produto['aliquota_icms'] ?? 0) . "%" .
                  ", CST ICMS: " . ($produto['cst_icms'] ?? $produto['csosn_icms'] ?? 'N/A') .
                  ", Origem: " . ($produto['origem_produto'] ?? 0) .
                  ", EAN: " . ($produto['ean'] ?? 'VAZIO') .
                  ", CEST: " . ($produto['cest'] ?? 'VAZIO')); // ✅ ADICIONADO: Log do CEST

        // ✅ LOG DETALHADO DA CONFIGURAÇÃO TRIBUTÁRIA
        logDetalhado("PRODUTO_{$item}_CONFIG_TRIBUTARIA", "Configuração tributária do produto", [
            'ncm' => $produto['ncm'] ?? 'N/A',
            'cfop' => $produto['cfop'] ?? 'N/A',
            'cest' => $produto['cest'] ?? 'VAZIO',
            'cst_icms' => $produto['cst_icms'] ?? 'N/A',
            'csosn_icms' => $produto['csosn_icms'] ?? 'N/A',
            'aliquota_icms' => $produto['aliquota_icms'] ?? 0,
            'origem_produto' => $produto['origem_produto'] ?? 0,
            'situacao_tributaria' => $produto['situacao_tributaria'] ?? 'N/A'
        ]);

        // ✅ VALIDAÇÃO DETALHADA PARA SUBSTITUIÇÃO TRIBUTÁRIA
        $isSubstituicaoTributaria = ($produto['csosn_icms'] == '500' || $produto['cfop'] == '5405');
        if ($isSubstituicaoTributaria) {
            logDetalhado("PRODUTO_{$item}_ST_DETECTADA", "Produto com Substituição Tributária detectado");

            $errosST = [];

            // Validar CEST
            if (empty($produto['cest'])) {
                $errosST[] = "CEST obrigatório para ST";
            }

            // Validar alíquota ICMS
            if (empty($produto['aliquota_icms']) || $produto['aliquota_icms'] == 0) {
                $errosST[] = "Alíquota ICMS obrigatória para ST (ex: 18%)";
            }

            // Validar CFOP
            if ($produto['cfop'] != '5405') {
                $errosST[] = "CFOP deve ser 5405 para ST (atual: " . ($produto['cfop'] ?? 'N/A') . ")";
            }

            // Validar CSOSN
            if ($produto['csosn_icms'] != '500') {
                $errosST[] = "CSOSN deve ser 500 para ST (atual: " . ($produto['csosn_icms'] ?? 'N/A') . ")";
            }

            if (!empty($errosST)) {
                logDetalhado("PRODUTO_{$item}_ST_ERROS", "Erros de validação ST encontrados", [
                    'erros' => $errosST,
                    'total_erros' => count($errosST)
                ]);

                $mensagemErro = "Produto {$item} - Erros de Substituição Tributária:\n";
                foreach ($errosST as $erro) {
                    $mensagemErro .= "• {$erro}\n";
                }

                throw new Exception($mensagemErro);
            } else {
                logDetalhado("PRODUTO_{$item}_ST_VALIDACAO_OK", "Validação ST passou - todos os campos obrigatórios presentes");
            }
        }

        // Log da tag ICMS que será usada (será atualizado após processamento)

        // Produto - Mapear campos corretamente
        $std = new stdClass();
        $std->item = $item;
        $std->cProd = $produto['codigo'] ?? $produto['id'] ?? "PROD{$item}";
        // ✅ CORREÇÃO CRÍTICA: Validar EAN/GTIN - deve ser válido ou 'SEM GTIN'
        $ean = $produto['ean'] ?? $produto['codigo_barras'] ?? '';
        $eanValido = false;

        if (!empty($ean) && preg_match('/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/', $ean)) {
            // EAN válido - usar o código
            $std->cEAN = $ean;
            $eanValido = true;
            logDetalhado("PRODUTO_{$item}_EAN_VALIDO", "EAN válido encontrado", ['ean' => $ean]);
        } else {
            // EAN vazio ou inválido - usar 'SEM GTIN'
            $std->cEAN = 'SEM GTIN';
            logDetalhado("PRODUTO_{$item}_EAN_INVALIDO", "EAN inválido ou vazio - usando SEM GTIN", ['ean_original' => $ean]);
        }

        // Validar nome do produto obrigatório (SEM FALLBACKS)
        $nomeProduto = '';
        if (isset($produto['descricao'])) {
            $nomeProduto = $produto['descricao'];
        } elseif (isset($produto['nome'])) {
            $nomeProduto = $produto['nome'];
        } elseif (isset($produto['name'])) {
            $nomeProduto = $produto['name'];
        } elseif (isset($produto['produto'])) {
            $nomeProduto = $produto['produto'];
        }

        if (empty($nomeProduto)) {
            throw new Exception("Nome/descrição do produto {$item} é obrigatório");
        }

        // Validar dados fiscais obrigatórios do produto (SEM FALLBACKS)
        if (empty($produto['ncm'])) {
            throw new Exception("NCM do produto {$item} ({$nomeProduto}) é obrigatório");
        }
        if (empty($produto['cfop'])) {
            throw new Exception("CFOP do produto {$item} ({$nomeProduto}) é obrigatório");
        }

        $std->xProd = $nomeProduto;
        $std->NCM = $produto['ncm']; // NCM real obrigatório

        // ✅ CORREÇÃO CRÍTICA: CEST deve ser adicionado ANTES de tagprod() conforme documentação oficial
        if (!empty($produto['cest'])) {
            $std->CEST = trim($produto['cest']); // CEST real do produto (trim para remover espaços)
            logDetalhado("PRODUTO_{$item}_CEST_INFORMADO", "CEST configurado para tagprod", [
                'cest' => $produto['cest'],
                'cest_trimmed' => trim($produto['cest']),
                'cest_length' => strlen(trim($produto['cest']))
            ]);
        } else {
            logDetalhado("PRODUTO_{$item}_CEST_VAZIO", "CEST não informado - pode causar erro 806 se houver ST");
        }

        $std->CFOP = $produto['cfop']; // CFOP real obrigatório
        $std->uCom = $produto['unidade'] ?? 'UN';
        $std->qCom = (float)($produto['quantidade'] ?? 1);
        $std->vUnCom = (float)($produto['valor_unitario'] ?? $produto['preco'] ?? 0);
        $std->vProd = (float)($produto['valor_total'] ?? 0);

        // ✅ CORREÇÃO CRÍTICA: cEANTrib deve usar a mesma validação do cEAN
        if ($eanValido) {
            $std->cEANTrib = $ean; // Usar EAN válido
            logDetalhado("PRODUTO_{$item}_EANTRIB_VALIDO", "cEANTrib configurado com EAN válido", ['ean' => $ean]);
        } else {
            $std->cEANTrib = 'SEM GTIN'; // Usar 'SEM GTIN' quando não há EAN válido
            logDetalhado("PRODUTO_{$item}_EANTRIB_SEM_GTIN", "cEANTrib configurado como SEM GTIN");
        }

        $std->uTrib = $produto['unidade'] ?? 'UN';
        $std->qTrib = (float)($produto['quantidade'] ?? 1);
        $std->vUnTrib = (float)($produto['valor_unitario'] ?? $produto['preco'] ?? 0);

        // ✅ CORREÇÃO CRÍTICA: Campos opcionais conforme documentação oficial NFe
        // Segundo mjailton.com.br/manualnfe - campos opcionais devem ser omitidos quando zero
        // NÃO definir campos opcionais quando não há valor - biblioteca NFePHP omite automaticamente

        $std->indTot = 1;    // Indica se valor compõe total da NFe (1=Sim)

        // ✅ ADICIONADO: Campos que podem ser obrigatórios para CEST funcionar
        if (!empty($produto['cest'])) {
            // Verificar se há campos específicos necessários para CEST
            logDetalhado("PRODUTO_{$item}_CEST_CAMPOS_VERIFICACAO", "Verificando campos necessários para CEST", [
                'tem_ncm' => !empty($std->NCM),
                'tem_cfop' => !empty($std->CFOP),
                'tem_cest' => !empty($std->CEST),
                'ncm_valor' => $std->NCM ?? 'VAZIO',
                'cfop_valor' => $std->CFOP ?? 'VAZIO',
                'cest_valor' => $std->CEST ?? 'VAZIO'
            ]);
        }

        $make->tagprod($std);

        // ✅ LOG DO XML DO PRODUTO PARA DEBUG
        try {
            $xmlAtual = $make->getXML();
            if ($xmlAtual && strpos($xmlAtual, '<CEST>') !== false) {
                logDetalhado("PRODUTO_{$item}_XML_CEST_OK", "CEST encontrado no XML gerado");
            } else {
                logDetalhado("PRODUTO_{$item}_XML_CEST_FALTANDO", "CEST NÃO encontrado no XML - possível causa do erro 806");
            }
        } catch (Exception $e) {
            logDetalhado("PRODUTO_{$item}_XML_ERRO", "Erro ao verificar XML", ['erro' => $e->getMessage()]);
        }

        // ✅ CORREÇÃO CRÍTICA: Tag IMPOSTO deve ser criada APÓS todas as tags de tributos
        // Conforme documentação NFePHP, a ordem correta é:
        // 1. tagprod() - produto
        // 2. tagimposto() - container de impostos
        // 3. tagICMS/tagICMSSN() - ICMS
        // 4. tagPIS() - PIS
        // 5. tagCOFINS() - COFINS

        // PRIMEIRO: Criar container de impostos
        $std = new stdClass();
        $std->item = $item;
        $std->vTotTrib = 0.00; // Valor total dos tributos

        logDetalhado("PRODUTO_{$item}_IMPOSTO_INICIO", "Iniciando criação da tag imposto");
        try {
            $make->tagimposto($std);
            $contadorTags['impostos']++;
            logDetalhado("PRODUTO_{$item}_IMPOSTO_CRIADO", "Tag imposto criada com sucesso");
            error_log("✅ PRODUTO {$item}: Tag IMPOSTO criada (total: {$contadorTags['impostos']})");
        } catch (Exception $e) {
            logDetalhado("PRODUTO_{$item}_IMPOSTO_ERRO", "Erro ao criar tag imposto", [
                'erro' => $e->getMessage(),
                'linha' => $e->getLine(),
                'arquivo' => $e->getFile()
            ]);
            throw $e;
        }

        // ICMS (usando dados reais do produto com tag específica)
        $std = new stdClass();
        $std->item = $item;
        $std->orig = (int)($produto['origem_produto'] ?? 0); // Origem real do produto

        // Determinar regime tributário e usar tag específica
        // Verificar regime da empresa (1=Simples Nacional, 2=Simples Nacional - excesso, 3=Regime Normal)
        $regimeTributario = (int)($nfeData['empresa']['regime_tributario'] ?? 1);
        $isSimples = in_array($regimeTributario, [1, 2]); // 1 ou 2 = Simples Nacional

        // ✅ CORREÇÃO CONFORME DOCUMENTAÇÃO OFICIAL NFe:
        // "Informar apenas um dos grupos de tributação do ICMS" - mjailton.com.br/manualnfe/tag/detalhe/47
        // NUNCA processar CST e CSOSN simultaneamente - usar apenas o coerente com o regime

        if ($isSimples) {
            // ✅ SIMPLES NACIONAL: Usar APENAS CSOSN, IGNORAR CST
            $temCSOSN = isset($produto['csosn_icms']) && !empty($produto['csosn_icms']);
            $temCST = false; // FORÇAR false para ignorar CST

            error_log("✅ REGIME SIMPLES NACIONAL - Produto {$item}:");
            error_log("  - Regime: {$regimeTributario} (Simples Nacional)");
            error_log("  - CSOSN: " . ($produto['csosn_icms'] ?? 'VAZIO') . " (será usado)");
            error_log("  - CST: " . ($produto['cst_icms'] ?? 'VAZIO') . " (será IGNORADO)");

        } else {
            // ✅ REGIME NORMAL: Usar APENAS CST, IGNORAR CSOSN
            $temCST = isset($produto['cst_icms']) && !empty($produto['cst_icms']);
            $temCSOSN = false; // FORÇAR false para ignorar CSOSN

            error_log("✅ REGIME NORMAL - Produto {$item}:");
            error_log("  - Regime: {$regimeTributario} (Regime Normal)");
            error_log("  - CST: " . ($produto['cst_icms'] ?? 'VAZIO') . " (será usado)");
            error_log("  - CSOSN: " . ($produto['csosn_icms'] ?? 'VAZIO') . " (será IGNORADO)");
        }

        if ($isSimples && $temCSOSN) {
            // Simples Nacional - usar CSOSN
            $csosn = $produto['csosn_icms'];
            $std->CSOSN = $csosn;

            // Para Simples Nacional, configurar campos específicos
            $aliquotaICMS = (float)($produto['aliquota_icms'] ?? 0);

            if ($csosn === '101' && $aliquotaICMS > 0) {
                // CSOSN 101 - Tributada pelo Simples Nacional com permissão de crédito
                $std->pCredSN = $aliquotaICMS;
                $std->vCredICMSSN = round((float)($produto['valor_total'] ?? 0) * ($aliquotaICMS / 100), 2);
            } elseif ($csosn === '500') {
                // ✅ CORREÇÃO CRÍTICA: CSOSN 500 - Campos obrigatórios conforme documentação oficial
                // Conforme mjailton.com.br/manualnfe/tag/detalhe/66
                $valorProduto = (float)($produto['valor_total'] ?? 0);

                // Campos obrigatórios para CSOSN 500:
                $std->vBCSTRet = $valorProduto; // Base de cálculo ST retida (obrigatório)
                $std->pST = $aliquotaICMS; // Alíquota suportada (obrigatório)
                $std->vICMSSTRet = round($valorProduto * ($aliquotaICMS / 100), 2); // Valor ICMS ST retido (obrigatório)

                logDetalhado("PRODUTO_{$item}_ST_CAMPOS_OBRIGATORIOS", "Campos ST obrigatórios configurados", [
                    'csosn' => '500',
                    'vBCSTRet' => $std->vBCSTRet,
                    'pST' => $std->pST,
                    'vICMSSTRet' => $std->vICMSSTRet,
                    'valor_produto' => $valorProduto,
                    'aliquota' => $aliquotaICMS
                ]);
            }

            // Usar método específico para Simples Nacional
            try {
                $make->tagICMSSN($std);
                $contadorTags['icms']++;
                logDetalhado("PRODUTO_{$item}_ICMSSN_CRIADO", "Tag ICMSSN criada com sucesso", [
                    'csosn' => $std->CSOSN
                ]);
                error_log("✅ PRODUTO {$item}: Tag ICMSSN criada (total: {$contadorTags['icms']})");
            } catch (Exception $e) {
                logDetalhado("PRODUTO_{$item}_ICMSSN_ERRO", "Erro ao criar tag ICMSSN", [
                    'erro' => $e->getMessage()
                ]);
                throw $e;
            }
        } elseif (!$isSimples && $temCST) {
            // Regime Normal/Lucro Real/Lucro Presumido - usar CST
            $cst = $produto['cst_icms'];
            $std->CST = $cst;

            $aliquotaICMS = (float)($produto['aliquota_icms'] ?? 0);
            $valorBase = (float)($produto['valor_total'] ?? 0);

            // Configurar campos baseados no CST
            if (in_array($cst, ['00', '10', '20', '51'])) {
                // CSTs que têm tributação
                $std->modBC = 0; // 0=Margem Valor Agregado (%)
                $std->vBC = $valorBase;
                $std->pICMS = $aliquotaICMS;
                $std->vICMS = round($valorBase * ($aliquotaICMS / 100), 2);

                // Campos específicos para alguns CSTs
                if ($cst === '20') {
                    $std->pRedBC = 0; // Percentual de redução da BC
                }
                if ($cst === '10') {
                    $std->modBCST = 0;
                    $std->vBCST = 0;
                    $std->pICMSST = 0;
                    $std->vICMSST = 0;
                }
            } elseif (in_array($cst, ['40', '41', '50'])) {
                // CSTs isentos/não tributados - não precisam de campos adicionais
            } elseif ($cst === '60') {
                // ICMS cobrado anteriormente por ST
                $std->vBCSTRet = 0;
                $std->vICMSSTRet = 0;
            }

            // Usar método genérico para todos os CSTs
            try {
                $make->tagICMS($std);
                $contadorTags['icms']++;
                logDetalhado("PRODUTO_{$item}_ICMS_CRIADO", "Tag ICMS criada com sucesso", [
                    'cst' => $std->CST
                ]);
                error_log("✅ PRODUTO {$item}: Tag ICMS criada (total: {$contadorTags['icms']})");
            } catch (Exception $e) {
                logDetalhado("PRODUTO_{$item}_ICMS_ERRO", "Erro ao criar tag ICMS", [
                    'erro' => $e->getMessage()
                ]);
                throw $e;
            }
        } else {
            // ❌ SEM FALLBACKS - IDENTIFICAR PROBLEMA REAL
            $erro = "Produto {$item} ({$nomeProduto}): DADOS FISCAIS OBRIGATÓRIOS AUSENTES\n\n";

            $erro .= "📊 ANÁLISE DOS DADOS RECEBIDOS:\n";
            $erro .= "  - Regime da empresa: {$regimeTributario}\n";
            $erro .= "  - É Simples Nacional: " . ($isSimples ? 'SIM' : 'NÃO') . "\n";
            $erro .= "  - Tem CST: " . ($temCST ? 'SIM' : 'NÃO') . "\n";
            $erro .= "  - Tem CSOSN: " . ($temCSOSN ? 'SIM' : 'NÃO') . "\n";
            $erro .= "  - CST valor: " . ($produto['cst_icms'] ?? 'VAZIO') . "\n";
            $erro .= "  - CSOSN valor: " . ($produto['csosn_icms'] ?? 'VAZIO') . "\n\n";

            $erro .= "🔍 DADOS COMPLETOS DO PRODUTO:\n";
            $erro .= json_encode($produto, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";

            if ($isSimples && !$temCSOSN) {
                $erro .= "❌ PROBLEMA: Empresa no Simples Nacional mas produto sem CSOSN\n";
                $erro .= "✅ SOLUÇÃO: Verificar por que o campo 'csosn_icms' não está sendo enviado do frontend\n";
            } elseif (!$isSimples && !$temCST) {
                $erro .= "❌ PROBLEMA: Empresa no Regime Normal mas produto sem CST\n";
                $erro .= "✅ SOLUÇÃO: Verificar por que o campo 'cst_icms' não está sendo enviado do frontend\n";
            } else {
                $erro .= "❌ PROBLEMA: Regime tributário não reconhecido ou dados inconsistentes\n";
            }

            error_log("❌ NFE ERRO CRÍTICO - DADOS FISCAIS AUSENTES:");
            error_log($erro);

            throw new Exception($erro);
        }
        
        // PIS (usando dados reais do produto)
        $std = new stdClass();
        $std->item = $item;
        $std->CST = $produto['cst_pis'] ?? '01';

        // Calcular PIS baseado no CST
        $cstPIS = $produto['cst_pis'] ?? '01';
        $valorBase = (float)($produto['valor_total'] ?? 0);

        if (in_array($cstPIS, ['01', '02'])) {
            // PIS tributado - usar alíquota padrão ou específica
            $aliquotaPIS = (float)($produto['aliquota_pis'] ?? 1.65); // 1.65% padrão
            $std->vBC = $valorBase;
            $std->pPIS = $aliquotaPIS;
            $std->vPIS = round($valorBase * ($aliquotaPIS / 100), 2);
        } else {
            // PIS isento, não tributado, etc.
            $std->vBC = null;
            $std->pPIS = null;
            $std->vPIS = null;
        }

        try {
            $make->tagPIS($std);
            $contadorTags['pis']++;
            logDetalhado("PRODUTO_{$item}_PIS_CRIADO", "Tag PIS criada com sucesso", [
                'cst' => $std->CST
            ]);
            error_log("✅ PRODUTO {$item}: Tag PIS criada (total: {$contadorTags['pis']})");
        } catch (Exception $e) {
            logDetalhado("PRODUTO_{$item}_PIS_ERRO", "Erro ao criar tag PIS", [
                'erro' => $e->getMessage()
            ]);
            throw $e;
        }
        
        // COFINS (usando dados reais do produto)
        $std = new stdClass();
        $std->item = $item;
        $std->CST = $produto['cst_cofins'] ?? '01';

        // Calcular COFINS baseado no CST
        $cstCOFINS = $produto['cst_cofins'] ?? '01';
        $valorBase = (float)($produto['valor_total'] ?? 0);

        if (in_array($cstCOFINS, ['01', '02'])) {
            // COFINS tributado - usar alíquota padrão ou específica
            $aliquotaCOFINS = (float)($produto['aliquota_cofins'] ?? 7.60); // 7.60% padrão
            $std->vBC = $valorBase;
            $std->pCOFINS = $aliquotaCOFINS;
            $std->vCOFINS = round($valorBase * ($aliquotaCOFINS / 100), 2);
        } else {
            // COFINS isento, não tributado, etc.
            $std->vBC = null;
            $std->pCOFINS = null;
            $std->vCOFINS = null;
        }

        try {
            $make->tagCOFINS($std);
            $contadorTags['cofins']++;
            logDetalhado("PRODUTO_{$item}_COFINS_CRIADO", "Tag COFINS criada com sucesso", [
                'cst' => $std->CST
            ]);
            error_log("✅ PRODUTO {$item}: Tag COFINS criada (total: {$contadorTags['cofins']})");
        } catch (Exception $e) {
            logDetalhado("PRODUTO_{$item}_COFINS_ERRO", "Erro ao criar tag COFINS", [
                'erro' => $e->getMessage()
            ]);
            throw $e;
        }

        // ✅ LOG FINAL: Produto processado com sucesso
        $contadorTags['produtos']++;
        error_log("✅ PRODUTO {$item}: Tags fiscais criadas - ICMS/ICMSSN, PIS, COFINS (produto {$contadorTags['produtos']} de " . count($produtos) . ")");

        logDetalhado("PRODUTO_{$item}_TAGS_FINALIZADAS", "Todas as tags do produto processadas", [
            'item' => $item,
            'produto_codigo' => $produto['codigo'] ?? 'N/A',
            'produto_nome' => $produto['nome'] ?? 'N/A'
        ]);

        // ✅ LOG DE TEMPO: Verificar se algum produto está demorando muito
        $tempoFinal = microtime(true);
        $tempoProcessamento = round(($tempoFinal - $tempoInicio) * 1000, 2);
        error_log("⏱️ PRODUTO {$item}: Processado em {$tempoProcessamento}ms");

        } catch (Exception $produtoError) {
            error_log("❌ ERRO NO PROCESSAMENTO DO PRODUTO {$item}: " . $produtoError->getMessage());
            error_log("📊 ESTADO DOS CONTADORES NO MOMENTO DO ERRO:");
            error_log("  - Produtos: {$contadorTags['produtos']}");
            error_log("  - IMPOSTO: {$contadorTags['impostos']}");
            error_log("  - ICMS/ICMSSN: {$contadorTags['icms']}");
            error_log("  - PIS: {$contadorTags['pis']}");
            error_log("  - COFINS: {$contadorTags['cofins']}");
            error_log("📋 DADOS DO PRODUTO COM ERRO: " . json_encode($produto, JSON_UNESCAPED_UNICODE));

            // Re-lançar o erro para parar o processamento
            throw new Exception("Erro no produto {$item}: " . $produtoError->getMessage());
        }
    }

    // ✅ LOG FINAL: Resumo das tags criadas
    error_log("📊 RESUMO TAGS CRIADAS:");
    error_log("  - Produtos processados: {$contadorTags['produtos']} de " . count($produtos));
    error_log("  - Tags IMPOSTO: {$contadorTags['impostos']}");
    error_log("  - Tags ICMS/ICMSSN: {$contadorTags['icms']}");
    error_log("  - Tags PIS: {$contadorTags['pis']}");
    error_log("  - Tags COFINS: {$contadorTags['cofins']}");

    // ✅ VALIDAÇÃO CRÍTICA: Verificar se todas as tags foram criadas
    if ($contadorTags['produtos'] !== count($produtos)) {
        throw new Exception("Nem todos os produtos foram processados: {$contadorTags['produtos']} de " . count($produtos));
    }

    if ($contadorTags['impostos'] !== $contadorTags['produtos'] ||
        $contadorTags['icms'] !== $contadorTags['produtos'] ||
        $contadorTags['pis'] !== $contadorTags['produtos'] ||
        $contadorTags['cofins'] !== $contadorTags['produtos']) {

        error_log("❌ INCONSISTÊNCIA NAS TAGS DE IMPOSTOS:");
        error_log("  - Esperado: {$contadorTags['produtos']} de cada tipo");
        error_log("  - IMPOSTO: {$contadorTags['impostos']}");
        error_log("  - ICMS: {$contadorTags['icms']}");
        error_log("  - PIS: {$contadorTags['pis']}");
        error_log("  - COFINS: {$contadorTags['cofins']}");

        throw new Exception("Inconsistência nas tags de impostos - nem todos os produtos têm todas as tags fiscais");
    }

    // Totais (CALCULADOS AUTOMATICAMENTE baseado nos produtos)
    $totais = $nfeData['totais'] ?? [];

    // Calcular totais reais baseado nos produtos processados
    $totalProdutos = 0;
    $totalICMSBC = 0;
    $totalICMS = 0;
    $totalPIS = 0;
    $totalCOFINS = 0;

    foreach ($produtos as $produto) {
        $valorProduto = (float)($produto['valor_total'] ?? 0);
        $totalProdutos += $valorProduto;

        // Somar ICMS se tributado
        $aliquotaICMS = (float)($produto['aliquota_icms'] ?? 0);
        if ($aliquotaICMS > 0) {
            $totalICMSBC += $valorProduto;
            $totalICMS += round($valorProduto * ($aliquotaICMS / 100), 2);
        }

        // Somar PIS se tributado
        $cstPIS = $produto['cst_pis'] ?? '01';
        if (in_array($cstPIS, ['01', '02'])) {
            $aliquotaPIS = (float)($produto['aliquota_pis'] ?? 1.65);
            $totalPIS += round($valorProduto * ($aliquotaPIS / 100), 2);
        }

        // Somar COFINS se tributado
        $cstCOFINS = $produto['cst_cofins'] ?? '01';
        if (in_array($cstCOFINS, ['01', '02'])) {
            $aliquotaCOFINS = (float)($produto['aliquota_cofins'] ?? 7.60);
            $totalCOFINS += round($valorProduto * ($aliquotaCOFINS / 100), 2);
        }
    }

    $std = new stdClass();
    $std->vBC = $totalICMSBC; // Base de cálculo real do ICMS
    $std->vICMS = $totalICMS; // ICMS real calculado
    $std->vICMSDeson = 0.00;
    $std->vBCST = 0.00;
    $std->vST = 0.00;
    $std->vProd = $totalProdutos; // Valor real dos produtos

    // ✅ CORREÇÃO CRÍTICA: Campos opcionais conforme documentação oficial NFe
    // Segundo mjailton.com.br/manualnfe - campos com valor zero devem ser omitidos
    // NÃO definir vFrete, vSeg, vOutro quando zero - biblioteca NFePHP omite automaticamente

    // Desconto: só incluir se houver valor
    $valorDesconto = (float)($totais['valor_desconto'] ?? 0);
    if ($valorDesconto > 0) {
        $std->vDesc = $valorDesconto;
    }

    $std->vII = 0.00;
    $std->vIPI = 0.00;
    $std->vPIS = $totalPIS; // PIS real calculado
    $std->vCOFINS = $totalCOFINS; // COFINS real calculado
    $std->vNF = $totalProdutos - $valorDesconto; // Valor final da NFe

    // Log dos totais calculados com dados reais
    error_log("NFE: Totais calculados - Produtos: R$ {$totalProdutos}, ICMS: R$ {$totalICMS}, PIS: R$ {$totalPIS}, COFINS: R$ {$totalCOFINS}, Total NFe: R$ " . $std->vNF);

    $make->tagICMSTot($std);

    // ✅ DEBUG: Verificar dados da transportadora recebidos do frontend
    error_log("🔍 DEBUG TRANSPORTADORA - Dados recebidos:");
    error_log("  - Modalidade: " . ($nfeData['transportadora']['modalidade_frete'] ?? 'NÃO INFORMADA'));
    error_log("  - ID: " . ($nfeData['transportadora']['transportadora_id'] ?? 'NÃO INFORMADO'));
    error_log("  - Nome: " . ($nfeData['transportadora']['transportadora_nome'] ?? 'NÃO INFORMADO'));
    error_log("  - Documento: " . ($nfeData['transportadora']['transportadora_documento'] ?? 'NÃO INFORMADO'));
    error_log("  - Endereço: " . ($nfeData['transportadora']['transportadora_endereco'] ?? 'NÃO INFORMADO'));
    error_log("  - Cidade: " . ($nfeData['transportadora']['transportadora_cidade'] ?? 'NÃO INFORMADA'));
    error_log("  - UF: " . ($nfeData['transportadora']['transportadora_uf'] ?? 'NÃO INFORMADA'));
    error_log("  - IE: " . ($nfeData['transportadora']['transportadora_ie'] ?? 'NÃO INFORMADA'));
    error_log("  - Veículo Placa: " . ($nfeData['transportadora']['veiculo_placa'] ?? 'NÃO INFORMADA'));
    error_log("  - Veículo UF: " . ($nfeData['transportadora']['veiculo_uf'] ?? 'NÃO INFORMADA'));
    error_log("  - Volumes Qtd: " . ($nfeData['transportadora']['volumes_quantidade'] ?? 'NÃO INFORMADA'));
    error_log("  - Volumes Espécie: " . ($nfeData['transportadora']['volumes_especie'] ?? 'NÃO INFORMADA'));
    error_log("  - Volumes Marca: " . ($nfeData['transportadora']['volumes_marca'] ?? 'NÃO INFORMADA'));
    error_log("  - Volumes Numeração: " . ($nfeData['transportadora']['volumes_numeracao'] ?? 'NÃO INFORMADA'));
    error_log("  - Volumes Peso Bruto: " . ($nfeData['transportadora']['volumes_peso_bruto'] ?? 'NÃO INFORMADO'));
    error_log("  - Volumes Peso Líquido: " . ($nfeData['transportadora']['volumes_peso_liquido'] ?? 'NÃO INFORMADO'));

    // Transporte (MÉTODO NATIVO) - OBRIGATÓRIO antes do pagamento
    $std = new stdClass();

    // Transporte (MÉTODO NATIVO) - OBRIGATÓRIO conforme documentação oficial
    // Conforme mjailton.com.br/manualnfe/tag/detalhe/91 - Tag transp é obrigatória
    $std = new stdClass();

    // ✅ CORREÇÃO: Verificar se há dados de transportadora informados
    $transportadoraData = $nfeData['transportadora'] ?? [];
    $temTransportadora = !empty($transportadoraData) &&
                        !empty($transportadoraData['modalidade_frete']) &&
                        $transportadoraData['modalidade_frete'] !== '9';

    if ($temTransportadora) {
        // Usar modalidade informada quando há transportadora
        $std->modFrete = $transportadoraData['modalidade_frete'];
        error_log("✅ NFe - Modalidade de frete informada: " . $std->modFrete);
    } else {
        // Usar modalidade 9 (Sem Ocorrência de Transporte) quando não há transportadora
        $std->modFrete = 9;
        error_log("✅ NFe - Modalidade de frete: 9 (Sem Ocorrência de Transporte)");
    }

    logDetalhado("TRANSPORTADORA_DADOS_RECEBIDOS", "Dados da transportadora processados", [
        'tem_transportadora' => $temTransportadora,
        'modFrete' => $std->modFrete,
        'transportadora_completa' => $transportadoraData
    ]);

    logDetalhado("TRANSPORTADORA_TAG_INICIO", "Iniciando criação da tag transp");
    try {
        $make->tagtransp($std);
        logDetalhado("TRANSPORTADORA_TAG_CRIADA", "Tag transp criada com sucesso", [
            'modFrete' => $std->modFrete
        ]);

        error_log("✅ TRANSP: Tag transp criada com modFrete = " . $std->modFrete);

    } catch (Exception $e) {
        logDetalhado("TRANSPORTADORA_TAG_ERRO", "Erro ao criar tag transp", [
            'erro' => $e->getMessage(),
            'linha' => $e->getLine(),
            'arquivo' => $e->getFile(),
            'modFrete_enviado' => $std->modFrete ?? 'NÃO DEFINIDO'
        ]);
        throw $e;
    }

    // ✅ REGRA FISCAL NFe: Só incluir dados da transportadora se modalidade ≠ 9 E transportadora selecionada
    $modalidadeFrete = $std->modFrete;

    if ($modalidadeFrete !== '9' && !empty($nfeData['transportadora']['transportadora_id']) && !empty($nfeData['transportadora']['transportadora_nome'])) {
        $stdTransportadora = new stdClass();
        $stdTransportadora->xNome = $nfeData['transportadora']['transportadora_nome'];

        // Verificar se é CNPJ ou CPF baseado no tamanho do documento
        $documento = preg_replace('/[^0-9]/', '', $nfeData['transportadora']['transportadora_documento'] ?? '');
        if (strlen($documento) == 14) {
            $stdTransportadora->CNPJ = $documento;
            $stdTransportadora->CPF = null;
        } elseif (strlen($documento) == 11) {
            $stdTransportadora->CPF = $documento;
            $stdTransportadora->CNPJ = null;
        } else {
            // Se não tem documento válido, usar apenas o nome
            $stdTransportadora->CNPJ = null;
            $stdTransportadora->CPF = null;
        }

        // ✅ CORRIGIDO: Endereço da transportadora com campos obrigatórios
        $stdTransportadora->xEnder = $nfeData['transportadora']['transportadora_endereco'] ?? '';
        $stdTransportadora->xMun = $nfeData['transportadora']['transportadora_cidade'] ?? '';
        $stdTransportadora->UF = $nfeData['transportadora']['transportadora_uf'] ?? '';

        // IE da transportadora (obrigatório se aplicável)
        $ieTransportadora = $nfeData['transportadora']['transportadora_ie'] ?? '';
        if (!empty($ieTransportadora) && strtoupper($ieTransportadora) !== 'ISENTO') {
            $stdTransportadora->IE = $ieTransportadora;
        } else {
            $stdTransportadora->IE = null; // Não informar se for isento ou vazio
        }

        $make->tagtransporta($stdTransportadora);

        error_log("✅ NFe - Transportadora adicionada: " . $nfeData['transportadora']['transportadora_nome'] . " (Modalidade: $modalidadeFrete)");

        // ✅ ADICIONADO: Tag de veículo (se informado)
        if (!empty($nfeData['transportadora']['veiculo_placa'])) {
            $stdVeiculo = new stdClass();
            $stdVeiculo->placa = $nfeData['transportadora']['veiculo_placa'];
            $stdVeiculo->UF = $nfeData['transportadora']['veiculo_uf'] ?? '';
            $stdVeiculo->RNTC = $nfeData['transportadora']['veiculo_rntc'] ?? null;

            $make->tagveicTransp($stdVeiculo);
            error_log("✅ NFe - Veículo adicionado: Placa " . $stdVeiculo->placa . " (" . $stdVeiculo->UF . ")");
        }

        // ✅ ADICIONADO: Tag de volumes (se informado)
        if (!empty($nfeData['transportadora']['volumes_quantidade']) && !empty($nfeData['transportadora']['volumes_especie'])) {
            $stdVolume = new stdClass();
            $stdVolume->item = 1; // Número do volume
            $stdVolume->qVol = (int)$nfeData['transportadora']['volumes_quantidade'];
            $stdVolume->esp = $nfeData['transportadora']['volumes_especie'];

            // ✅ ADICIONADO: Campos marca e numeração
            $stdVolume->marca = !empty($nfeData['transportadora']['volumes_marca']) ?
                $nfeData['transportadora']['volumes_marca'] : null;
            $stdVolume->nVol = !empty($nfeData['transportadora']['volumes_numeracao']) ?
                $nfeData['transportadora']['volumes_numeracao'] : null;

            // ✅ ADICIONADO: Peso líquido e bruto
            $stdVolume->pesoL = !empty($nfeData['transportadora']['volumes_peso_liquido']) ?
                (float)$nfeData['transportadora']['volumes_peso_liquido'] : null;
            $stdVolume->pesoB = !empty($nfeData['transportadora']['volumes_peso_bruto']) ?
                (float)$nfeData['transportadora']['volumes_peso_bruto'] : null;

            $make->tagvol($stdVolume);
            error_log("✅ NFe - Volume adicionado: " . $stdVolume->qVol . " " . $stdVolume->esp .
                     ($stdVolume->marca ? " (Marca: " . $stdVolume->marca . ")" : "") .
                     ($stdVolume->nVol ? " (Num: " . $stdVolume->nVol . ")" : ""));
        }
    } else {
        if ($modalidadeFrete === '9') {
            error_log("ℹ️ NFe - Modalidade 9 (Sem Ocorrência de Transporte): Transportadora não incluída conforme regra fiscal");
        } else {
            error_log("ℹ️ NFe - Nenhuma transportadora selecionada para modalidade: $modalidadeFrete");
        }
    }

    // Pagamento (MÉTODO NATIVO) - Conforme documentação fiscal
    // 1. PRIMEIRO: Criar grupo PAG (container)
    $std = new stdClass();
    $std->vTroco = null; // null para NFe (modelo 55), 0.00 para NFCe (modelo 65)
    $make->tagpag($std);

    // 2. DEPOIS: Criar detalhes do pagamento dentro do grupo PAG
    $std = new stdClass();
    $std->indPag = 0; // 0=À vista, 1=À prazo

    // ✅ CORREÇÃO CRÍTICA: Para finalidade 4 (devolução), usar "90 - Sem Pagamento"
    if ($finalidade === '4') {
        $std->tPag = '90'; // 90=Sem Pagamento (específico para devolução)
        $std->vPag = 0.00; // Valor zero para devolução
        error_log("✅ Pagamento configurado para devolução: tPag=90 (Sem Pagamento), vPag=0.00");
    } else {
        $std->tPag = '01'; // 01=Dinheiro (conforme tabela fiscal)
        $std->vPag = $totalProdutos - (float)($totais['valor_desconto'] ?? 0); // Usar valor calculado
        error_log("✅ Pagamento configurado para venda normal: tPag=01, vPag=" . $std->vPag);
    }

    $make->tagdetPag($std);

    // Informações Adicionais (MÉTODO NATIVO) - ANTES DE GERAR XML
    $informacaoAdicional = $nfeData['informacao_adicional'] ?? '';

    // ✅ CORREÇÃO: Adicionar chaves de referência às informações complementares para aparecer na DANFE
    $chavesRefTexto = '';
    if (!empty($chavesRef)) {
        $chavesRefTexto = "\n\nDOCUMENTOS FISCAIS REFERENCIADOS:\n";
        foreach ($chavesRef as $index => $chaveRef) {
            $chave = $chaveRef['chave'] ?? '';
            if (!empty($chave)) {
                $chavesRefTexto .= "NFe: " . $chave . "\n";
            }
        }
        error_log("✅ Chaves de referência adicionadas às informações complementares para DANFE");
    }

    // ✅ ADICIONAR: Intermediador às informações complementares para aparecer na DANFE
    $intermediadorTexto = '';
    if (!empty($nfeData['intermediador']) && !empty($nfeData['intermediador']['nome']) && !empty($nfeData['intermediador']['cnpj'])) {
        $cnpjFormatado = preg_replace('/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/', '$1.$2.$3/$4-$5', $nfeData['intermediador']['cnpj']);
        $intermediadorTexto = "\n\nINTERMEDIADOR DA TRANSACAO:\n";
        $intermediadorTexto .= "Nome: " . $nfeData['intermediador']['nome'] . "\n";
        $intermediadorTexto .= "CNPJ: " . $cnpjFormatado;
        error_log("✅ Intermediador adicionado às informações complementares para DANFE");
    }

    // Combinar informação adicional com chaves de referência e intermediador
    $informacaoCompleta = trim($informacaoAdicional . $chavesRefTexto . $intermediadorTexto);

    if (!empty($informacaoCompleta)) {
        $std = new stdClass();
        $std->infCpl = $informacaoCompleta;
        $make->taginfAdic($std);
        error_log("NFE: Informação adicional incluída: " . substr($informacaoCompleta, 0, 100) . "...");
    } else {
        error_log("NFE: Nenhuma informação adicional fornecida");
    }

    // ✅ INTERMEDIADOR DA TRANSAÇÃO (YB01, YB02, YB03) - Nota Técnica 2020.006
    if (!empty($nfeData['intermediador']) && !empty($nfeData['intermediador']['nome']) && !empty($nfeData['intermediador']['cnpj'])) {
        error_log("🔍 DEBUG INTERMEDIADOR - Dados recebidos:");
        error_log("  - Nome: " . $nfeData['intermediador']['nome']);
        error_log("  - CNPJ: " . $nfeData['intermediador']['cnpj']);

        // Validar CNPJ do intermediador
        $cnpjIntermediador = preg_replace('/[^0-9]/', '', $nfeData['intermediador']['cnpj']);
        if (strlen($cnpjIntermediador) !== 14) {
            throw new Exception('CNPJ do intermediador deve ter 14 dígitos');
        }

        // Criar tag do intermediador conforme especificação SEFAZ
        $stdIntermed = new stdClass();
        $stdIntermed->CNPJ = $cnpjIntermediador; // YB02 - CNPJ do Intermediador da Transação
        $stdIntermed->idCadIntTran = $nfeData['intermediador']['nome']; // YB03 - Nome/Identificador do intermediador

        $make->tagIntermed($stdIntermed);

        error_log("✅ NFe - Intermediador da transação adicionado:");
        error_log("  - CNPJ: " . $cnpjIntermediador);
        error_log("  - Nome: " . $nfeData['intermediador']['nome']);
        error_log("  - Tags XML: YB01 (infIntermed), YB02 (CNPJ), YB03 (idCadIntTran)");
    } else {
        error_log("ℹ️ NFe - Nenhum intermediador informado - XML sem grupo infIntermed");
    }

    // ✅ VERIFICAR ERROS DA BIBLIOTECA ANTES DE GERAR XML
    $errors = $make->getErrors();
    if (!empty($errors)) {
        logDetalhado("BIBLIOTECA_ERROS_DETECTADOS", "Erros encontrados na biblioteca NFePHP", [
            'erros' => $errors,
            'total_erros' => count($errors)
        ]);
        throw new Exception('Erros na estrutura da NFe: ' . implode('; ', $errors));
    }

    // ✅ VALIDAÇÃO FINAL CONFORME DOCUMENTAÇÃO OFICIAL NFe
    // Verificar se todas as tags obrigatórias estão presentes antes de gerar XML final
    try {
        // ✅ DEBUG CRÍTICO: Verificar erros da biblioteca antes de gerar XML
        $errorsBeforeXML = $make->getErrors();
        if (!empty($errorsBeforeXML)) {
            error_log("❌ ERROS NA BIBLIOTECA ANTES DE GERAR XML:");
            foreach ($errorsBeforeXML as $error) {
                error_log("  - " . $error);
            }
        }

        error_log("🔍 TENTANDO GERAR XML PRELIMINAR PARA VALIDAÇÃO...");
        $xmlPreliminar = $make->getXML();
        error_log("✅ XML PRELIMINAR GERADO - Tamanho: " . strlen($xmlPreliminar) . " bytes");

        // ✅ SALVAR XML PRELIMINAR PARA DEBUG
        $xmlPreliminarPath = "/tmp/nfe_preliminar_" . date('Y-m-d_H-i-s') . ".xml";
        file_put_contents($xmlPreliminarPath, $xmlPreliminar);
        error_log("🔍 XML PRELIMINAR SALVO EM: " . $xmlPreliminarPath);

        // ✅ PREVIEW DO XML PRELIMINAR
        $xmlPreview = substr($xmlPreliminar, 0, 3000);
        error_log("🔍 XML PRELIMINAR PREVIEW (primeiros 3000 chars):");
        error_log($xmlPreview);

        // Tags obrigatórias conforme mjailton.com.br/manualnfe
        $validacaoFinal = [
            'transp' => strpos($xmlPreliminar, '<transp>') !== false,
            'modFrete' => strpos($xmlPreliminar, '<modFrete>') !== false,
            'imposto' => strpos($xmlPreliminar, '<imposto>') !== false,
            'icms_ou_icmssn' => strpos($xmlPreliminar, '<ICMS>') !== false || strpos($xmlPreliminar, '<ICMSSN>') !== false,
            'pis' => strpos($xmlPreliminar, '<PIS>') !== false,
            'cofins' => strpos($xmlPreliminar, '<COFINS>') !== false
        ];

        // ✅ LOG DETALHADO DA VALIDAÇÃO
        error_log("🔍 VALIDAÇÃO DETALHADA DAS TAGS:");
        foreach ($validacaoFinal as $tag => $encontrada) {
            $status = $encontrada ? '✅' : '❌';
            error_log("  - {$tag}: {$status}");
        }

        $tagsAusentes = [];
        foreach ($validacaoFinal as $tag => $presente) {
            if (!$presente) {
                $tagsAusentes[] = $tag;
            }
        }

        if (!empty($tagsAusentes)) {
            error_log("❌ VALIDAÇÃO FINAL FALHOU - Tags obrigatórias ausentes: " . implode(', ', $tagsAusentes));
            error_log("📊 DIAGNÓSTICO DETALHADO:");
            error_log("  - Produtos processados: {$contadorTags['produtos']}");
            error_log("  - Tags IMPOSTO criadas: {$contadorTags['impostos']}");
            error_log("  - Tags ICMS/ICMSSN criadas: {$contadorTags['icms']}");
            error_log("  - Tags PIS criadas: {$contadorTags['pis']}");
            error_log("  - Tags COFINS criadas: {$contadorTags['cofins']}");
            
            logDetalhado("VALIDACAO_FINAL_ERRO", "Tags obrigatórias ausentes no XML", [
                'tags_ausentes' => $tagsAusentes,
                'validacao_completa' => $validacaoFinal,
                'contador_tags' => $contadorTags,
                'total_produtos' => count($produtos)
            ]);
            throw new Exception('XML inválido - Tags obrigatórias ausentes: ' . implode(', ', $tagsAusentes));
        }

        error_log("✅ VALIDAÇÃO FINAL: Todas as tags obrigatórias estão presentes");
        error_log("📊 TAGS VALIDADAS COM SUCESSO:");
        error_log("  - Produtos: {$contadorTags['produtos']}");
        error_log("  - IMPOSTO: {$contadorTags['impostos']}");
        error_log("  - ICMS/ICMSSN: {$contadorTags['icms']}");
        error_log("  - PIS: {$contadorTags['pis']}");
        error_log("  - COFINS: {$contadorTags['cofins']}");
        error_log("  - TRANSP: ✅");
        error_log("  - modFrete: ✅");
        
        logDetalhado("VALIDACAO_FINAL_SUCESSO", "Todas as tags obrigatórias validadas", [
            'validacao_completa' => $validacaoFinal,
            'contador_tags' => $contadorTags,
            'total_produtos' => count($produtos)
        ]);

    } catch (Exception $xmlError) {
        error_log("ERRO: Falha ao processar XML: " . $xmlError->getMessage());
        error_log("📊 ESTADO DOS CONTADORES NO MOMENTO DO ERRO:");
        error_log("  - Produtos: {$contadorTags['produtos']}");
        error_log("  - IMPOSTO: {$contadorTags['impostos']}");
        error_log("  - ICMS/ICMSSN: {$contadorTags['icms']}");
        error_log("  - PIS: {$contadorTags['pis']}");
        error_log("  - COFINS: {$contadorTags['cofins']}");
        // SEGUINDO AS 4 LEIS NFe - SEM DADOS FICTÍCIOS
        throw new Exception("Erro ao processar resposta da SEFAZ: " . $xmlError->getMessage());
    }
    // GERAR XML (MÉTODO NATIVO)
    try {
        logDetalhado("XML_GERACAO_INICIO", "Iniciando geração do XML");
        $xml = $make->getXML();

        // ✅ SALVAR XML PARA DEBUG
        $xmlDebugPath = "/tmp/nfe_debug_" . date('Y-m-d_H-i-s') . ".xml";
        file_put_contents($xmlDebugPath, $xml);

        // ✅ VALIDAÇÃO DETALHADA DO XML CONFORME DOCUMENTAÇÃO OFICIAL
        $validacaoXML = [
            'tamanho_xml' => strlen($xml),
            'tem_imposto' => strpos($xml, '<imposto>') !== false,
            'tem_transp' => strpos($xml, '<transp>') !== false,
            'tem_modFrete' => strpos($xml, '<modFrete>') !== false,
            'tem_cest' => strpos($xml, '<CEST>') !== false,
            'tem_icms' => strpos($xml, '<ICMS>') !== false || strpos($xml, '<ICMSSN>') !== false,
            'tem_pis' => strpos($xml, '<PIS>') !== false,
            'tem_cofins' => strpos($xml, '<COFINS>') !== false,
            'xml_debug_path' => $xmlDebugPath
        ];

        // ✅ LOG DETALHADO PARA DEBUG
        error_log("🔍 VALIDAÇÃO XML DETALHADA:");
        foreach ($validacaoXML as $campo => $valor) {
            if ($campo !== 'xml_debug_path') {
                $status = is_bool($valor) ? ($valor ? '✅' : '❌') : $valor;
                error_log("  - {$campo}: {$status}");
            }
        }

        // ✅ SALVAR PREVIEW DO XML PARA ANÁLISE
        $xmlPreview = substr($xml, 0, 2000);
        error_log("🔍 XML PREVIEW (primeiros 2000 chars):");
        error_log($xmlPreview);

        logDetalhado("XML_GERACAO_SUCESSO", "XML gerado com sucesso", $validacaoXML);
    } catch (Exception $xmlError) {
        // Capturar erros da biblioteca
        $errors = $make->getErrors();
        $errorMessage = 'Erro na estrutura da NFe: ' . $xmlError->getMessage();
        if (!empty($errors)) {
            $errorMessage .= ' | Erros detalhados: ' . implode('; ', $errors);
        }
        logDetalhado("XML_GERACAO_ERRO", "Erro ao gerar XML", [
            'erro' => $xmlError->getMessage(),
            'erros_biblioteca' => $errors
        ]);
        throw new Exception($errorMessage);
    }

    // Verificar se há erros na estrutura
    if (!$xml) {
        $errors = $make->getErrors();
        throw new Exception('XML não foi gerado. Erros: ' . implode('; ', $errors));
    }
    
    // ASSINAR XML (MÉTODO NATIVO)
    $xmlAssinado = $tools->signNFe($xml);
    
    // ENVIAR PARA SEFAZ (MÉTODO NATIVO)
    try {
        $response = $tools->sefazEnviaLote([$xmlAssinado], 1);
    } catch (Exception $sefazError) {
        throw new Exception("Erro ao enviar para SEFAZ: " . $sefazError->getMessage());
    }

    // PROCESSAR RESPOSTA (MÉTODO NATIVO)

    try {
        // Analisar XML de resposta SOAP com tratamento robusto

        // Verificar se a resposta não está vazia
        if (empty($response)) {
            throw new Exception('Resposta SEFAZ está vazia');
        }

        // Remover declaração XML problemática se existir
        $cleanResponse = preg_replace('/^<\?xml[^>]*\?>/', '', trim($response));

        // Tentar carregar XML com diferentes abordagens
        $xml = false;

        // Tentativa 1: XML direto
        if (!$xml) {
            $xml = @simplexml_load_string($response);
        }

        // Tentativa 2: Limpar declaração XML e tentar novamente
        if (!$xml) {
            $xml = @simplexml_load_string($cleanResponse);
        }

        // Tentativa 3: Usar regex como fallback (mais simples e confiável)
        if (!$xml) {

            // Não usar DOMDocument para evitar problemas com libxml
            // Ir direto para extração via regex
        }

        // Se SimpleXML falhou, usar regex diretamente (mais confiável)
        if ($xml === false) {

            // Tentar extrair informações básicas usando regex
            preg_match('/<cStat>(\d+)<\/cStat>/', $response, $statusMatch);
            preg_match('/<xMotivo>([^<]+)<\/xMotivo>/', $response, $motivoMatch);
            preg_match('/<nRec>([^<]+)<\/nRec>/', $response, $reciboMatch);
            preg_match('/<chNFe>([^<]+)<\/chNFe>/', $response, $chaveMatch);
            preg_match('/<nProt>([^<]+)<\/nProt>/', $response, $protocoloMatch);

            if (!empty($statusMatch)) {
                $status = $statusMatch[1];
                $motivo = $motivoMatch[1] ?? 'Motivo não encontrado';
                $recibo = $reciboMatch[1] ?? 'RECIBO_NAO_ENCONTRADO';
                $chave = $chaveMatch[1] ?? 'CHAVE_NAO_ENCONTRADA';
                $protocolo = !empty($protocoloMatch[1]) ? $protocoloMatch[1] : null;

            } else {
                error_log("ERRO: Não foi possível extrair dados da resposta SEFAZ");
                throw new Exception('Erro ao processar resposta da SEFAZ - dados não encontrados');
            }
        }

        // Extrair dados da consulta do recibo
        // A estrutura da consulta do recibo é diferente do envio
        $cStatRecibo = $xml->xpath('//cStat') ?: $xml->xpath('//*[local-name()="cStat"]');
        $xMotivoRecibo = $xml->xpath('//xMotivo') ?: $xml->xpath('//*[local-name()="xMotivo"]');

        // Para consulta de recibo, o protocolo está em protNFe/infProt/nProt dentro de cada NFe
        $nProtRecibo = $xml->xpath('//protNFe/infProt/nProt') ?:
                      $xml->xpath('//infProt/nProt') ?:
                      $xml->xpath('//nProt') ?:
                      $xml->xpath('//*[local-name()="protNFe"]//*[local-name()="infProt"]//*[local-name()="nProt"]') ?:
                      $xml->xpath('//*[local-name()="nProt"]');

        $status = !empty($cStatRecibo) ? (string)$cStatRecibo[0] : 'DESCONHECIDO';
        $motivo = !empty($xMotivoRecibo) ? (string)$xMotivoRecibo[0] : 'Sem motivo';
        $chave = 'CHAVE_NAO_ENCONTRADA'; // Será definida posteriormente
        $recibo = 'RECIBO_NAO_ENCONTRADO'; // Será definida posteriormente
        $protocolo = null; // Inicializar protocolo

        // SEGUINDO DOCUMENTAÇÃO OFICIAL SEFAZ - Status 104 = "Lote processado"
        // Conforme MOC: "cStat=104, com os resultados individuais de processamento das NF-e"
        if ($status === '104') {
            error_log("📋 STATUS 104 - Lote processado. Buscando resultado individual da NFe...");

            // Buscar status específico da NFe dentro do elemento protNFe/infProt
            // Conforme documentação: protNFe/infProt/cStat e protNFe/infProt/nProt
            $cStatNFe = $xml->xpath('//protNFe/infProt/cStat') ?:
                       $xml->xpath('//*[local-name()="protNFe"]//*[local-name()="infProt"]//*[local-name()="cStat"]');

            $xMotivoNFe = $xml->xpath('//protNFe/infProt/xMotivo') ?:
                         $xml->xpath('//*[local-name()="protNFe"]//*[local-name()="infProt"]//*[local-name()="xMotivo"]');

            $nProtNFe = $xml->xpath('//protNFe/infProt/nProt') ?:
                       $xml->xpath('//*[local-name()="protNFe"]//*[local-name()="infProt"]//*[local-name()="nProt"]');

            if (!empty($cStatNFe)) {
                $status = (string)$cStatNFe[0];
                $motivo = !empty($xMotivoNFe) ? (string)$xMotivoNFe[0] : $motivo;
                $chave = 'CHAVE_EXTRAIDA_DO_XML'; // Será extraída posteriormente
                $protocolo = !empty($nProtNFe) ? (string)$nProtNFe[0] : null;

                error_log("✅ RESULTADO INDIVIDUAL DA NFe ENCONTRADO:");
                error_log("  - Status NFe: {$status}");
                error_log("  - Motivo NFe: {$motivo}");
                error_log("  - Chave NFe: {$chave}");
                error_log("  - Protocolo NFe: " . ($protocolo ? $protocolo : 'NÃO ENCONTRADO'));
            } else {
                error_log("❌ ERRO: Não foi possível encontrar resultado individual da NFe no lote processado");
            }
        }

        error_log("📋 RESULTADO FINAL - Status: {$status} - {$motivo}");

    } catch (Exception $consultaError) {
        error_log("❌ ERRO ao consultar recibo: " . $consultaError->getMessage());
        throw new Exception("Erro ao consultar recibo da SEFAZ: " . $consultaError->getMessage());
    }

    // VALIDAÇÃO CRÍTICA - SEGUINDO AS 4 LEIS NFe
    // Verificar se NFe foi realmente autorizada (Status 100)
    if ($status !== '100') {
        error_log("❌ NFe NÃO AUTORIZADA - Status: {$status} - {$motivo}");

        $erroTraduzido = traduzirErroSefaz($status, $motivo);

        throw new Exception(json_encode([
            'tipo' => 'erro_sefaz',
            'titulo' => $erroTraduzido['titulo'],
            'descricao' => $erroTraduzido['descricao'],
            'solucao' => $erroTraduzido['solucao'],
            'detalhes_tecnicos' => [
                'status' => $status,
                'motivo' => $motivo
            ]
        ]));
    }

    // Verificar se protocolo real existe
    if (empty($protocolo)) {
        error_log("❌ PROTOCOLO AUSENTE - NFe não pode ser considerada autorizada");
        throw new Exception("Protocolo não encontrado. NFe não foi autorizada pela SEFAZ.");
    }

    // Validar formato do protocolo (15 dígitos numéricos)
    if (!preg_match('/^\d{15}$/', $protocolo)) {
        error_log("❌ PROTOCOLO INVÁLIDO: {$protocolo} - Deve ter 15 dígitos numéricos");
        throw new Exception("Protocolo inválido recebido da SEFAZ: {$protocolo}");
    }

    error_log("✅ NFe VALIDADA - Status: {$status}, Protocolo: {$protocolo}");

    // Resultado da resposta (apenas dados reais validados)
    $resultado = [
        'chave' => $chave,
        'protocolo' => $protocolo,
        'recibo' => $recibo,
        'status' => $status,
        'motivo' => $motivo,
        'response_xml' => $response
    ];
    
    // Extrair chave real do XML gerado
    $chaveReal = null;
    try {
        $xmlDoc = new DOMDocument();
        $xmlDoc->loadXML($xmlAssinado);

        // Buscar o atributo Id da tag infNFe
        $infNFeNodes = $xmlDoc->getElementsByTagName('infNFe');
        if ($infNFeNodes->length > 0) {
            $idAttribute = $infNFeNodes->item(0)->getAttribute('Id');
            if ($idAttribute && strlen($idAttribute) >= 44) {
                // Extrair os últimos 44 caracteres (chave da NFe)
                $chaveReal = substr($idAttribute, -44);
            }
        }
    } catch (Exception $xmlParseError) {
        error_log("AVISO: Não foi possível extrair chave do XML: " . $xmlParseError->getMessage());
    }

    // Usar chave real se encontrada, senão manter a original
    $chaveParaSalvar = $chaveReal ?: $chave;

    // 🔥 NOVA ESTRUTURA COM MODELO DE DOCUMENTO
    // Salvar XML em arquivo - ESTRUTURA ORGANIZADA COM AMBIENTE E MODELO
    $ambienteTexto = $ambiente == 1 ? 'producao' : 'homologacao';
    $modelo = '55'; // NFe por padrão, futuramente será dinâmico para NFCe
    $xmlDir = "../storage/xml/empresa_{$empresaId}/{$ambienteTexto}/{$modelo}/Autorizados/" . date('Y/m');
    if (!is_dir($xmlDir)) {
        mkdir($xmlDir, 0755, true);
        error_log("📁 Diretório de NFes autorizadas criado: {$xmlDir}");
    }

    // Garantir que o XML tenha declaração XML válida
    $xmlComDeclaracao = $xmlAssinado;
    $xmlTrimmed = trim($xmlAssinado);
    if (substr($xmlTrimmed, 0, 5) !== '<?xml') {
        $xmlComDeclaracao = '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . $xmlAssinado;
    }

    $xmlPath = "{$xmlDir}/{$chaveParaSalvar}.xml";
    file_put_contents($xmlPath, $xmlComDeclaracao);


    // Gerar DANFE (PDF) - Sempre gerar PDF quando XML for válido
    $pdfPath = null;
    try {
        error_log("PDF: Iniciando geração DANFE - Status: {$status}");

        if (!class_exists('\NFePHP\DA\NFe\Danfe')) {
            throw new Exception('Classe Danfe não encontrada - instale sped-da');
        }

        error_log("PDF: Classe Danfe encontrada");
        error_log("PDF: Tamanho XML: " . strlen($xmlComDeclaracao) . " bytes");

        $danfe = new \NFePHP\DA\NFe\Danfe($xmlComDeclaracao);

        $danfe->debugMode(false);
        $danfe->creditsIntegratorFooter('Sistema Nexo PDV');

        error_log("PDF: Danfe configurado, iniciando render");
        $pdfContent = $danfe->render();

        if (empty($pdfContent)) {
            throw new Exception('PDF gerado está vazio');
        }

        error_log("PDF: PDF gerado com sucesso - " . strlen($pdfContent) . " bytes");

        // Salvar PDF - ESTRUTURA ORGANIZADA COM AMBIENTE E MODELO (igual aos XMLs)
        $pdfDir = "../storage/pdf/empresa_{$empresaId}/{$ambienteTexto}/{$modelo}/Autorizados/" . date('Y/m');
        if (!is_dir($pdfDir)) {
            mkdir($pdfDir, 0755, true);
            error_log("PDF: Diretório de PDFs autorizados criado: {$pdfDir}");
        }

        $pdfPath = "{$pdfDir}/{$chaveParaSalvar}.pdf";
        $result = file_put_contents($pdfPath, $pdfContent);

        if ($result === false) {
            throw new Exception('Falha ao salvar arquivo PDF');
        }

        // Verificar se arquivo foi salvo corretamente
        if (!file_exists($pdfPath) || filesize($pdfPath) < 1000) {
            throw new Exception('PDF salvo mas arquivo inválido ou muito pequeno');
        }

        error_log("PDF: PDF salvo com sucesso em: {$pdfPath}");
        error_log("PDF: Tamanho do arquivo: " . filesize($pdfPath) . " bytes");

    } catch (Exception $pdfError) {
        error_log("ERRO CRÍTICO: Falha ao gerar PDF: " . $pdfError->getMessage());
        error_log("ERRO CRÍTICO: Arquivo: " . $pdfError->getFile());
        error_log("ERRO CRÍTICO: Linha: " . $pdfError->getLine());

        // Em homologação, não falhar por causa do PDF
        if ($ambiente == 2) {
            error_log("AVISO: PDF falhou em homologação, continuando sem PDF");
            $pdfPath = null;
        } else {
            throw new Exception("Erro ao gerar PDF DANFE: " . $pdfError->getMessage());
        }
    }

    // ✅ SUCESSO: NFe emitida com sucesso
    echo json_encode([
        'success' => true,
        'message' => 'NFe emitida com sucesso',
        'data' => [
            'chave' => $chaveParaSalvar, // Usar chave real extraída do XML
            'protocolo' => $protocolo,
            'recibo' => $recibo ?? 'RECIBO_NAO_ENCONTRADO',
            'status' => $status ?? 'DESCONHECIDO',
            'motivo' => $motivo ?? 'Sem motivo',
            'xml_path' => $xmlPath,
            'pdf_path' => $pdfPath,
            'numero' => $identificacao['numero'] ?? null,
            'serie' => $identificacao['serie'] ?? null,
            'data_autorizacao' => date('Y-m-d H:i:s'),
            'xml' => base64_encode($xmlAssinado)
        ],
        'resultado_sefaz' => $resultado
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    logDetalhado('FATAL_ERROR', 'Erro crítico na emissão da NFe', [
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);

    // Determinar tipo de erro e código HTTP apropriado
    $errorMessage = $e->getMessage();
    $httpCode = 500;
    $errorType = 'server_error';

    // Erros de validação (dados do usuário)
    if (strpos($errorMessage, 'obrigatório') !== false ||
        strpos($errorMessage, 'inválido') !== false ||
        strpos($errorMessage, 'deve ter') !== false ||
        strpos($errorMessage, 'não encontrado') !== false) {
        $httpCode = 400;
        $errorType = 'user_error';
    }

    // Erros da SEFAZ
    if (strpos($errorMessage, 'SEFAZ') !== false ||
        strpos($errorMessage, 'Status') !== false ||
        strpos($errorMessage, 'Rejeição') !== false) {
        $httpCode = 400;
        $errorType = 'sefaz_error';
    }

    http_response_code($httpCode);
    echo json_encode([
        'success' => false,
        'error' => $errorMessage,
        'error_type' => $errorType,
        'timestamp' => date('Y-m-d H:i:s'),
        'debug_info' => [
            'file' => basename($e->getFile()),
            'line' => $e->getLine(),
            'step' => 'FATAL_ERROR'
        ]
    ], JSON_UNESCAPED_UNICODE);
}
?>
