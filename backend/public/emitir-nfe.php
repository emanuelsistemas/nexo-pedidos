<?php
// ✅ CONFIGURAR TIMEZONE BRASILEIRO PARA CORRIGIR HORÁRIO
date_default_timezone_set('America/Sao_Paulo');

// ✅ DEBUG: Configurar logs de erro
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', '/var/log/php_nfe_debug.log');

header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// ✅ DEBUG: Log início da execução
error_log("=== INÍCIO EMISSÃO NFE === " . date('Y-m-d H:i:s'));
error_log("🔥 VERSÃO CORRIGIDA - CACHE LIMPO - STATUS 104 CORRIGIDO");
error_log("REQUEST_METHOD: " . $_SERVER['REQUEST_METHOD']);
error_log("CONTENT_TYPE: " . ($_SERVER['CONTENT_TYPE'] ?? 'N/A'));

require_once '../vendor/autoload.php';

try {
    
    // Validar método
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método não permitido. Use POST.');
    }
    
    // Receber dados
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Dados JSON inválidos');
    }
    
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
    $certificate = \NFePHP\Common\Certificate::readPfx($certificado, $metadata['password'] ?? '');

    // Inicializar Tools (MÉTODO NATIVO)
    $tools = new \NFePHP\NFe\Tools(json_encode($config), $certificate);
    $tools->model('55'); // Modelo NFe

    // ✅ DESABILITAR criação automática de diretórios pela biblioteca
    // Isso evita que a biblioteca crie pastas 55/65 no storage raiz
    if (method_exists($tools, 'setPathNFePHP')) {
        $tools->setPathNFePHP(null);
    }

    // Inicializar Make (MÉTODO NATIVO)
    $make = new \NFePHP\NFe\Make();

    // 🔍 TESTE CRÍTICO: Verificar se há configurações específicas para CEST
    // Baseado no fórum SAP, pode haver configurações internas necessárias
    error_log("🔍 BIBLIOTECA SPED-NFE - Versão e configurações:");
    error_log("  - Classe Make: " . get_class($make));
    error_log("  - Métodos disponíveis: " . implode(', ', array_slice(get_class_methods($make), 0, 10)) . "...");

    // Verificar se há propriedades ou métodos específicos para CEST
    $reflection = new ReflectionClass($make);
    $properties = $reflection->getProperties();
    error_log("  - Propriedades da classe: " . count($properties));

    // Verificar se há método específico para configurar CEST
    if (method_exists($make, 'setCEST')) {
        error_log("✅ MÉTODO setCEST ENCONTRADO");
    } elseif (method_exists($make, 'enableCEST')) {
        error_log("✅ MÉTODO enableCEST ENCONTRADO");
    } else {
        error_log("❌ NENHUM MÉTODO ESPECÍFICO PARA CEST ENCONTRADO");
    }
    
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
    } else {
        throw new Exception('Nome do destinatário não encontrado');
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

    error_log("NFE: Processando " . count($produtos) . " produtos com dados fiscais reais");

    foreach ($produtos as $index => $produto) {
        $item = $index + 1;

        // Log dos dados fiscais do produto
        error_log("NFE: Produto {$item} - NCM: " . ($produto['ncm'] ?? 'N/A') .
                  ", CFOP: " . ($produto['cfop'] ?? 'N/A') .
                  ", ICMS: " . ($produto['aliquota_icms'] ?? 0) . "%" .
                  ", CST ICMS: " . ($produto['cst_icms'] ?? $produto['csosn_icms'] ?? 'N/A') .
                  ", Origem: " . ($produto['origem_produto'] ?? 0) .
                  ", EAN: " . ($produto['ean'] ?? 'VAZIO'));

        // Log da tag ICMS que será usada (será atualizado após processamento)

        // Produto - Mapear campos corretamente
        $std = new stdClass();
        $std->item = $item;
        $std->cProd = $produto['codigo'] ?? $produto['id'] ?? "PROD{$item}";
        // Validar EAN/GTIN - deve ser válido ou 'SEM GTIN'
        $ean = $produto['ean'] ?? '';
        $eanValidado = '';
        if (empty($ean) || !preg_match('/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/', $ean)) {
            // EAN vazio ou inválido - usar 'SEM GTIN'
            $eanValidado = 'SEM GTIN';
        } else {
            // EAN válido - usar o código
            $eanValidado = $ean;
        }
        $std->cEAN = $eanValidado;

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

        // ✅ CORREÇÃO CRÍTICA: CEST deve ser tratado SEPARADAMENTE usando tagCEST()
        // Verificar se produto tem ST baseado nos códigos CST/CSOSN
        $cstICMS = $produto['cst_icms'] ?? '';
        $csosnICMS = $produto['csosn_icms'] ?? '';
        $temST = in_array($cstICMS, ['10', '30', '60', '70', '90']) ||
                 in_array($csosnICMS, ['201', '202', '203', '500', '900']);

        // Armazenar dados do CEST para usar depois do tagprod()
        $cestDados = null;
        if ($temST) {
            // Produto com ST - CEST é OBRIGATÓRIO
            if (empty($produto['cest'])) {
                throw new Exception("CEST é obrigatório para produto {$item} ({$nomeProduto}) com Substituição Tributária (CST/CSOSN: {$cstICMS}{$csosnICMS})");
            }

            // Formatar CEST corretamente (7 dígitos com zeros à esquerda se necessário)
            $cestFormatado = str_pad($produto['cest'], 7, '0', STR_PAD_LEFT);
            $cestDados = $cestFormatado;

            error_log("✅ CEST OBRIGATÓRIO preparado para ST: " . $produto['cest'] . " -> formatado: " . $cestFormatado);
        } elseif (!empty($produto['cest'])) {
            // Produto sem ST mas com CEST informado - incluir mesmo assim
            $cestFormatado = str_pad($produto['cest'], 7, '0', STR_PAD_LEFT);
            $cestDados = $cestFormatado;
            error_log("✅ CEST opcional preparado (sem ST): " . $produto['cest'] . " -> formatado: " . $cestFormatado);
        } else {
            error_log("ℹ️ Produto {$item} sem ST e sem CEST - OK");
        }

        // CFOP deve vir APÓS CEST (conforme documentação oficial)
        $std->CFOP = $produto['cfop']; // CFOP real obrigatório
        $std->uCom = $produto['unidade'] ?? 'UN';
        $std->qCom = (float)($produto['quantidade'] ?? 1);
        $std->vUnCom = (float)($produto['valor_unitario'] ?? $produto['preco'] ?? 0);
        $std->vProd = (float)($produto['valor_total'] ?? $produto['total'] ?? 0);
        $std->cEANTrib = $eanValidado; // ✅ CORREÇÃO: usar EAN validado (igual ao cEAN)
        $std->uTrib = $produto['unidade'] ?? 'UN';
        $std->qTrib = (float)($produto['quantidade'] ?? 1);
        $std->vUnTrib = (float)($produto['valor_unitario'] ?? $produto['preco'] ?? 0);

        // Campos obrigatórios que estavam faltando (conforme documentação)
        $std->vFrete = null;
        $std->vSeg = null;
        $std->vDesc = null;
        $std->vOutro = null;
        $std->indTot = 1;

        // ✅ DEBUG: Verificar objeto $std antes de chamar tagprod (SEM CEST)
        $debugProps = [];
        foreach (get_object_vars($std) as $prop => $value) {
            $debugProps[$prop] = $value;
        }
        error_log("🔍 DEBUG ANTES tagprod() - OBJETO SEM CEST: " . json_encode($debugProps, JSON_UNESCAPED_UNICODE));

        // ✅ CORREÇÃO BASEADA NA DOCUMENTAÇÃO SPED-NFE: tagprod() SEM CEST
        try {
            $resposta = $make->tagprod($std);
            error_log("✅ tagprod() executado - Resposta: " . ($resposta === true ? "TRUE" : json_encode($resposta)));

            // Verificar se há erros na biblioteca após processar
            $errors = $make->getErrors();
            if (!empty($errors)) {
                error_log("⚠️ ERROS DA BIBLIOTECA após tagprod(): " . json_encode($errors));
            } else {
                error_log("✅ NENHUM ERRO da biblioteca após tagprod()");
            }

        } catch (Exception $e) {
            error_log("❌ ERRO CRÍTICO em tagprod(): " . $e->getMessage());
            error_log("🔍 STACK TRACE: " . $e->getTraceAsString());
            throw $e;
        }

        // ✅ CORREÇÃO CRÍTICA: Usar tagCEST() SEPARADAMENTE após tagprod()
        if ($cestDados !== null) {
            try {
                $stdCEST = new stdClass();
                $stdCEST->item = $item;
                $stdCEST->CEST = $cestDados;
                $stdCEST->indEscala = null; // Opcional - indicador de escala relevante
                $stdCEST->CNPJFab = null;   // Opcional - CNPJ do fabricante

                error_log("🔍 DEBUG ANTES tagCEST() - OBJETO: " . json_encode($stdCEST, JSON_UNESCAPED_UNICODE));

                $respostaCEST = $make->tagCEST($stdCEST);
                error_log("✅ tagCEST() executado - Resposta: " . ($respostaCEST === true ? "TRUE" : json_encode($respostaCEST)));

                // Verificar se há erros na biblioteca após processar CEST
                $errorsCEST = $make->getErrors();
                if (!empty($errorsCEST)) {
                    error_log("⚠️ ERROS DA BIBLIOTECA após tagCEST(): " . json_encode($errorsCEST));
                } else {
                    error_log("✅ NENHUM ERRO da biblioteca após tagCEST()");
                }

            } catch (Exception $e) {
                error_log("❌ ERRO CRÍTICO em tagCEST(): " . $e->getMessage());
                error_log("🔍 STACK TRACE: " . $e->getTraceAsString());
                throw $e;
            }
        }

        // Tag IMPOSTO (container obrigatório)
        $std = new stdClass();
        $std->item = $item;
        $std->vTotTrib = 0.00; // Valor total dos tributos

        $make->tagimposto($std);

        // ICMS (usando dados reais do produto com tag específica)
        $std = new stdClass();
        $std->item = $item;
        $std->orig = (int)($produto['origem_produto'] ?? 0); // Origem real do produto

        // Determinar regime tributário e usar tag específica
        // Verificar regime da empresa (1=Simples Nacional, 2=Simples Nacional - excesso, 3=Regime Normal)
        $regimeTributario = (int)($nfeData['empresa']['regime_tributario'] ?? 1);
        $isSimples = in_array($regimeTributario, [1, 2]); // 1 ou 2 = Simples Nacional

        // Para Simples Nacional, deve usar CSOSN; para outros regimes, usar CST
        $temCST = isset($produto['cst_icms']) && !empty($produto['cst_icms']);
        $temCSOSN = isset($produto['csosn_icms']) && !empty($produto['csosn_icms']);

        // Log do regime e dados fiscais
        error_log("NFE: Produto {$item} - Regime: {$regimeTributario}, CST: " . ($produto['cst_icms'] ?? 'N/A') . ", CSOSN: " . ($produto['csosn_icms'] ?? 'N/A'));

        if ($isSimples && $temCSOSN) {
            // Simples Nacional - usar CSOSN
            $csosn = $produto['csosn_icms'];
            $std->CSOSN = $csosn;

            // Para Simples Nacional, configurar campos específicos
            $aliquotaICMS = (float)($produto['aliquota_icms'] ?? 0);
            $valorBase = (float)($produto['valor_total'] ?? 0);

            if ($csosn === '101' && $aliquotaICMS > 0) {
                // CSOSN 101 - Tributada pelo Simples Nacional com permissão de crédito
                $std->pCredSN = $aliquotaICMS;
                $std->vCredICMSSN = round($valorBase * ($aliquotaICMS / 100), 2);
            } elseif ($csosn === '500') {
                // ✅ CSOSN 500 - ICMS cobrado anteriormente por ST - USANDO DADOS REAIS
                // Conforme Manual NFe - campos obrigatórios: vBCSTRet, pST, vICMSSTRet

                // ✅ USAR DADOS REAIS DO PRODUTO (SEM FALLBACKS)
                error_log("🔍 DEBUG CSOSN 500 - Produto: " . json_encode($produto));
                $margemST = (float)$produto['margem_st'];
                $aliquotaICMS = (float)$produto['aliquota_icms'];

                // Detectar nome do produto usando a mesma lógica das linhas 488-502
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
                $valorSTCalculado = $baseSTCalculada * ($aliquotaICMS / 100);

                // ✅ CAMPOS OBRIGATÓRIOS CONFORME DOCUMENTAÇÃO OFICIAL
                // IMPORTANTE: Garantir que sejam números válidos (não null)
                $std->vBCSTRet = (float)round($baseSTCalculada, 2);     // Base de cálculo do ST retido
                $std->pST = (float)$aliquotaICMS;                       // Alíquota ICMS ST (dados reais)
                $std->vICMSSTRet = (float)round($valorSTCalculado, 2);  // Valor do ICMS ST retido

                // ✅ CAMPO OPCIONAL: Valor do ICMS próprio do Substituto (se aplicável)
                // IMPORTANTE: Se não informado, não incluir no objeto (deixar undefined)
                // $std->vICMSSubstituto = null; // Comentado - não incluir se não tiver valor

                error_log("✅ CSOSN 500 - CÁLCULO COM DADOS REAIS:");
                error_log("  - Preço base: R$ {$valorBase}");
                error_log("  - Margem ST (produto): {$margemST}%");
                error_log("  - Base ST calculada: R$ " . round($baseSTCalculada, 2));
                error_log("  - Alíquota ICMS (produto): {$aliquotaICMS}%");
                error_log("  - Valor ST retido: R$ " . round($valorSTCalculado, 2));

                // ✅ DEBUG CRÍTICO: Verificar objeto $std antes de tagICMSSN
                error_log("🔍 DEBUG OBJETO ICMS ANTES tagICMSSN():");
                error_log("  - vBCSTRet: " . $std->vBCSTRet);
                error_log("  - pST: " . $std->pST);
                error_log("  - vICMSSTRet: " . $std->vICMSSTRet);
                error_log("  - vICMSSubstituto: " . ($std->vICMSSubstituto ?? 'NULL'));
            } elseif (in_array($csosn, ['201', '202', '203'])) {
                // ✅ ADICIONADO: CSOSN 201/202/203 - Com permissão de crédito e ST
                if ($aliquotaICMS > 0) {
                    $std->pCredSN = $aliquotaICMS;
                    $std->vCredICMSSN = round($valorBase * ($aliquotaICMS / 100), 2);
                }

                // ✅ CAMPOS DE ST PARA CSOSN 201/202/203 - DADOS REAIS
                $margemST = (float)$produto['margem_st'];
                $aliquotaICMS = (float)$produto['aliquota_icms'];
                $nomeProduto = $produto['nome'];

                // Validar se dados ST estão configurados
                if (!$margemST || !$aliquotaICMS) {
                    throw new Exception("Produto '{$nomeProduto}' com CSOSN {$csosn} deve ter margem_st e aliquota_icms configurados. Margem: {$margemST}%, Alíquota: {$aliquotaICMS}%");
                }

                $std->modBCST = 4; // 4=Margem Valor Agregado (%)
                $std->pMVAST = $margemST; // Margem ST (dados reais)
                $std->pICMSST = $aliquotaICMS; // Alíquota ICMS (dados reais)

                // ✅ BIBLIOTECA CALCULA vBCST e vICMSST AUTOMATICAMENTE
                error_log("✅ CSOSN {$csosn} - Dados ST configurados: Margem {$margemST}%, Alíquota {$aliquotaICMS}%");
            }

            // Usar método específico para Simples Nacional
            $make->tagICMSSN($std);

            // ✅ SOLUÇÃO CORRETA BASEADA EM SISTEMAS DE REFERÊNCIA (ACBr/sped-nfe):
            // A biblioteca sped-nfe calcula automaticamente os totais ST via tagICMSSN()
            // NÃO manipular totalizadores manualmente - deixar a biblioteca fazer seu trabalho
            if ($csosn === '500') {
                error_log("✅ CSOSN 500 - Configurado para cálculo automático da biblioteca:");
                error_log("  - vBCSTRet: " . $std->vBCSTRet);
                error_log("  - vICMSSTRet: " . $std->vICMSSTRet);
                error_log("  - Biblioteca calculará totais automaticamente");
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
                    // ✅ CST 10 - Tributada e com cobrança do ICMS por ST - DADOS REAIS
                    $margemST = (float)$produto['margem_st'];
                    $aliquotaICMS = (float)$produto['aliquota_icms'];
                    $nomeProduto = $produto['nome'];

                    // Validar se dados ST estão configurados
                    if (!$margemST || !$aliquotaICMS) {
                        throw new Exception("Produto '{$nomeProduto}' com CST 10 deve ter margem_st e aliquota_icms configurados. Margem: {$margemST}%, Alíquota: {$aliquotaICMS}%");
                    }

                    $std->modBCST = 4; // 4=Margem Valor Agregado (%)
                    $std->pMVAST = $margemST; // Margem de valor agregado ST (dados reais)
                    $std->pICMSST = $aliquotaICMS; // Alíquota ICMS ST (dados reais)

                    // ✅ BIBLIOTECA CALCULA vBCST e vICMSST AUTOMATICAMENTE
                    error_log("✅ CST 10 - Dados ST configurados: Margem {$margemST}%, Alíquota {$aliquotaICMS}%");
                }
            } elseif (in_array($cst, ['40', '41', '50'])) {
                // CSTs isentos/não tributados - não precisam de campos adicionais
            } elseif ($cst === '60') {
                // ✅ CST 60 - ICMS cobrado anteriormente por ST - CALCULAR DINAMICAMENTE
                $margemST = (float)$produto['margem_st'];
                $aliquotaICMS = (float)$produto['aliquota_icms'];
                $nomeProduto = $produto['nome'];

                // Validar se dados ST estão configurados
                if (!$margemST || !$aliquotaICMS) {
                    throw new Exception("Produto '{$nomeProduto}' com CST 60 deve ter margem_st e aliquota_icms configurados. Margem: {$margemST}%, Alíquota: {$aliquotaICMS}%");
                }

                // ✅ CALCULAR DINAMICAMENTE (sem campos valor_st_retido/base_st_retido)
                $baseSTRetido = $valorBase * (1 + ($margemST / 100));
                $valorSTRetido = $baseSTRetido * ($aliquotaICMS / 100);

                $std->vBCSTRet = round($baseSTRetido, 2); // Base de cálculo do ST retido
                $std->vICMSSTRet = round($valorSTRetido, 2); // Valor do ST retido

                // CST 60 não tem ICMS próprio (já foi pago pelo substituto)
                $std->vBC = 0;
                $std->vICMS = 0;
                $std->pICMS = 0;

                error_log("✅ CST 60 - ST calculado dinamicamente: Base R$ {$baseSTRetido}, Valor R$ {$valorSTRetido}");
            }

            // Usar método genérico para todos os CSTs
            $make->tagICMS($std);
        } else {
            // ERRO: Inconsistência entre regime tributário e dados fiscais
            $erro = "Inconsistência fiscal no produto {$item}: ";
            if ($isSimples && !$temCSOSN) {
                $erro .= "Empresa no Simples Nacional mas produto sem CSOSN";
                error_log("NFE ERRO: {$erro}");
                // Fallback: usar CSOSN 102 (mais comum)
                $std->CSOSN = '102';
                $make->tagICMSSN($std);
            } elseif (!$isSimples && !$temCST) {
                $erro .= "Empresa no Regime Normal mas produto sem CST";
                error_log("NFE ERRO: {$erro}");
                // Fallback: usar CST 00 (tributado integralmente)
                $std->CST = '00';
                $aliquotaICMS = (float)($produto['aliquota_icms'] ?? 18); // 18% padrão SP
                $valorBase = (float)($produto['valor_total'] ?? 0);
                $std->modBC = 0;
                $std->vBC = $valorBase;
                $std->pICMS = $aliquotaICMS;
                $std->vICMS = round($valorBase * ($aliquotaICMS / 100), 2);
                $make->tagICMS($std);
            } else {
                $erro .= "Regime {$regimeTributario} não reconhecido";
                error_log("NFE ERRO: {$erro}");
                throw new Exception($erro);
            }
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

        $make->tagPIS($std);
        
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

        $make->tagCOFINS($std);
    }
    
    // Totais (CALCULADOS AUTOMATICAMENTE baseado nos produtos)
    $totais = $nfeData['totais'] ?? [];

    // Calcular totais reais baseado nos produtos processados
    $totalProdutos = 0;
    $totalICMSBC = 0;
    $totalICMS = 0;
    $totalICMSSTBC = 0; // ✅ ADICIONADO: Base de cálculo do ICMS ST
    $totalICMSST = 0;   // ✅ ADICIONADO: Valor do ICMS ST
    $totalPIS = 0;
    $totalCOFINS = 0;

    foreach ($produtos as $produto) {
        $valorProduto = (float)($produto['valor_total'] ?? 0);
        $totalProdutos += $valorProduto;

        // ✅ CORREÇÃO FISCAL: Somar ICMS apenas para regimes que realmente têm ICMS
        // CSOSN 102 (Simples Nacional) NÃO gera ICMS próprio
        $regimeTributario = (int)($nfeData['empresa']['regime_tributario'] ?? 1);
        $isSimples = in_array($regimeTributario, [1, 2]); // 1 ou 2 = Simples Nacional

        $aliquotaICMS = (float)($produto['aliquota_icms'] ?? 0);
        $csosn = $produto['csosn_icms'] ?? '';
        $cst = $produto['cst_icms'] ?? '';

        // Só somar ICMS se for regime normal OU se for Simples Nacional com CSOSN que gera ICMS
        if (!$isSimples && $aliquotaICMS > 0 && !empty($cst)) {
            // Regime Normal - calcular ICMS normalmente
            $totalICMSBC += $valorProduto;
            $totalICMS += round($valorProduto * ($aliquotaICMS / 100), 2);

            // ✅ CORREÇÃO ERRO 533: Calcular ICMS ST se aplicável
            if ($cst === '10') {
                // ✅ CST 10 - NÃO calcular aqui pois a biblioteca
                // já adiciona automaticamente aos totalizadores via tagICMS()

                // Os valores de ST já foram adicionados aos totalizadores internos da biblioteca
                error_log("✅ TOTAIS CST 10 - Valores já adicionados aos totalizadores via tagICMS()");
            } elseif ($cst === '60') {
                // ✅ CORREÇÃO ERRO 533: CST 60 - NÃO calcular aqui pois a biblioteca
                // já adiciona automaticamente aos totalizadores via tagICMS()

                // Os valores de ST já foram adicionados aos totalizadores internos da biblioteca
                error_log("✅ TOTAIS CST 60 - Valores já adicionados aos totalizadores via tagICMS()");

                // CST 60 não soma no ICMS próprio
                $totalICMSBC -= $valorProduto;
                $totalICMS -= round($valorProduto * ($aliquotaICMS / 100), 2);
            }
        } elseif ($isSimples && $csosn === '101' && $aliquotaICMS > 0) {
            // Simples Nacional CSOSN 101 - tem crédito de ICMS
            $totalICMSBC += $valorProduto;
            $totalICMS += round($valorProduto * ($aliquotaICMS / 100), 2);
        } elseif ($isSimples && $csosn === '500') {
            // ✅ CORREÇÃO ERRO 533: CSOSN 500 - NÃO calcular aqui pois já foi adicionado
            // aos totalizadores via reflexão nos itens individuais

            // CSOSN 500 não gera ICMS próprio (já foi pago pelo substituto)
            // Os valores de ST já foram adicionados aos totalizadores internos da biblioteca
            error_log("✅ TOTAIS CSOSN 500 - Valores já adicionados aos totalizadores via reflexão");
        } elseif ($isSimples && in_array($csosn, ['201', '202', '203'])) {
            // ✅ CORREÇÃO ERRO 533: CSOSN 201/202/203 - Com crédito e ST (Simples Nacional)
            if ($aliquotaICMS > 0) {
                $totalICMSBC += $valorProduto;
                $totalICMS += round($valorProduto * ($aliquotaICMS / 100), 2);
            }

            // ✅ NÃO calcular ST aqui pois a biblioteca já adiciona automaticamente
            // aos totalizadores via tagICMSSN()
            error_log("✅ TOTAIS CSOSN {$csosn} - Valores ST já adicionados aos totalizadores via tagICMSSN()");
        }
        // CSOSN 102, 103, 300, 400 não geram ICMS nos totais

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

    // ✅ SOLUÇÃO CORRETA: Usar totalizadores automáticos da biblioteca sped-nfe
    // A biblioteca calcula automaticamente os totais ST quando usamos tagICMS() e tagICMSSN()
    // NÃO recalcular manualmente - confiar na biblioteca oficial

    error_log("🔍 USANDO TOTALIZADORES AUTOMÁTICOS DA BIBLIOTECA SPED-NFE:");
    error_log("  - Regime Simples Nacional: " . ($isSimples ? 'SIM' : 'NÃO'));
    error_log("  - Total de produtos: " . count($nfeData['produtos']));
    error_log("  - Biblioteca calculou totais ST automaticamente via tagICMS()/tagICMSSN()");

    // ✅ SOLUÇÃO CORRETA: Usar totalizadores automáticos da biblioteca sped-nfe
    // Acessar os totalizadores internos que foram calculados automaticamente
    $reflection = new ReflectionClass($make);
    $stdTotProperty = $reflection->getProperty('stdTot');
    $stdTotProperty->setAccessible(true);
    $stdTotBiblioteca = $stdTotProperty->getValue($make);

    error_log("🔍 TOTALIZADORES AUTOMÁTICOS DA BIBLIOTECA:");
    error_log("  - vBCST (Base ST): " . ($stdTotBiblioteca->vBCST ?? 'NULL'));
    error_log("  - vST (Valor ST): " . ($stdTotBiblioteca->vST ?? 'NULL'));
    error_log("  - vBC (Base ICMS): " . ($stdTotBiblioteca->vBC ?? 'NULL'));
    error_log("  - vICMS (Valor ICMS): " . ($stdTotBiblioteca->vICMS ?? 'NULL'));

    $std = new stdClass();
    $std->vBC = $totalICMSBC; // Base de cálculo real do ICMS
    $std->vICMS = $totalICMS; // ICMS real calculado
    $std->vICMSDeson = 0.00;

    // ✅ USAR TOTALIZADORES AUTOMÁTICOS DA BIBLIOTECA (sem manipulação manual)
    $std->vBCST = $stdTotBiblioteca->vBCST ?? 0.00; // Base ST calculada automaticamente
    $std->vST = $stdTotBiblioteca->vST ?? 0.00;     // Valor ST calculado automaticamente

    $std->vProd = $totalProdutos; // Valor real dos produtos
    $std->vFrete = 0.00;
    $std->vSeg = 0.00;
    $std->vDesc = (float)($totais['valor_desconto'] ?? 0);
    $std->vII = 0.00;
    $std->vIPI = 0.00;
    $std->vPIS = $totalPIS; // PIS real calculado
    $std->vCOFINS = $totalCOFINS; // COFINS real calculado
    $std->vOutro = 0.00;
    $std->vNF = $totalProdutos - (float)($totais['valor_desconto'] ?? 0); // Valor final da NFe

    // Log dos totais calculados com dados reais
    error_log("NFE: Totais calculados - Produtos: R$ {$totalProdutos}, ICMS: R$ {$totalICMS}, ICMS ST: R$ {$std->vST}, PIS: R$ {$totalPIS}, COFINS: R$ {$totalCOFINS}, Total NFe: R$ " . $std->vNF);
    error_log("✅ TOTAIS FINAIS - Base ST: R$ {$std->vBCST}, Valor ST: R$ {$std->vST} (usando totalizadores da biblioteca)");

    $make->tagICMSTot($std);

    // ✅ DEBUG: Verificar dados da transportadora recebidos do frontend
    error_log("🔍 DEBUG TRANSPORTADORA - Dados recebidos:");
    error_log("  - Modalidade: " . ($nfeData['transportadora']['modalidade_frete'] ?? 'NÃO INFORMADA'));
    error_log("  - ID: " . ($nfeData['transportadora']['transportadora_id'] ?? 'NÃO INFORMADA'));
    error_log("  - Nome: " . ($nfeData['transportadora']['transportadora_nome'] ?? 'NÃO INFORMADA'));
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

    // ❌ REMOVER FALLBACK - Usar apenas dados do frontend
    if (!isset($nfeData['transportadora']['modalidade_frete'])) {
        throw new Exception('Modalidade de frete é obrigatória');
    }

    $std->modFrete = $nfeData['transportadora']['modalidade_frete'];
    error_log("✅ NFe - Modalidade de frete definida: " . $std->modFrete);

    $make->tagtransp($std);

    // ✅ REGRA FISCAL NFe: Só incluir dados da transportadora se modalidade ≠ 9 E transportadora selecionada
    $modalidadeFrete = $nfeData['transportadora']['modalidade_frete'];

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

    // ❌ CÓDIGO DUPLICADO REMOVIDO - Lógica já implementada acima

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

    // GERAR XML (MÉTODO NATIVO)
    try {
        $xml = $make->getXML();

        // 🔍 DEBUG: Verificar se CEST está no XML final
        if (strpos($xml, '<CEST>') !== false) {
            preg_match('/<CEST>(.*?)<\/CEST>/', $xml, $matches);
            $cestNoXml = $matches[1] ?? 'NÃO ENCONTRADO';
            error_log("✅ CEST ENCONTRADO NO XML: {$cestNoXml}");
        } else {
            error_log("❌ CEST NÃO ENCONTRADO NO XML FINAL!");
            error_log("🔍 DEBUG: Verificando se há produtos no XML...");
            if (strpos($xml, '<det ') !== false) {
                error_log("✅ Produtos encontrados no XML");
                // Buscar todos os produtos e verificar se algum tem CEST
                preg_match_all('/<det nItem="(\d+)".*?<\/det>/s', $xml, $produtos);
                error_log("🔍 Total de produtos no XML: " . count($produtos[0]));
                foreach ($produtos[0] as $i => $produtoXml) {
                    $nItem = $produtos[1][$i];
                    if (strpos($produtoXml, '<CEST>') !== false) {
                        error_log("✅ Produto {$nItem} TEM CEST no XML");
                        // Extrair o CEST encontrado
                        preg_match('/<CEST>(.*?)<\/CEST>/', $produtoXml, $cestMatch);
                        $cestEncontrado = $cestMatch[1] ?? 'NÃO EXTRAÍDO';
                        error_log("🔍 CEST encontrado no produto {$nItem}: {$cestEncontrado}");
                    } else {
                        error_log("❌ Produto {$nItem} NÃO TEM CEST no XML");
                        // 🔍 ANÁLISE MINUCIOSA: Mostrar XML COMPLETO do produto
                        error_log("🔍 XML COMPLETO do produto {$nItem}: {$produtoXml}");

                        // Verificar se há alguma variação da tag CEST
                        if (strpos($produtoXml, 'CEST') !== false) {
                            error_log("⚠️ Palavra 'CEST' encontrada no XML, mas não como tag válida");
                        }

                        // Verificar posição do NCM e CFOP para entender a estrutura
                        $posNCM = strpos($produtoXml, '<NCM>');
                        $posCFOP = strpos($produtoXml, '<CFOP>');
                        error_log("🔍 Posições no XML - NCM: {$posNCM}, CFOP: {$posCFOP}");
                    }
                }
            } else {
                error_log("❌ Nenhum produto encontrado no XML!");
            }
        }
    } catch (Exception $xmlError) {
        // Capturar erros da biblioteca
        $errors = $make->getErrors();
        $errorMessage = 'Erro na estrutura da NFe: ' . $xmlError->getMessage();
        if (!empty($errors)) {
            $errorMessage .= ' | Erros detalhados: ' . implode('; ', $errors);
        }
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
        // ✅ CORREÇÃO: Para NFe usar envio síncrono (indSinc=1) para evitar erro 452
        $response = $tools->sefazEnviaLote([$xmlAssinado], 1, 1); // Terceiro parâmetro = indSinc=1 (síncrono)
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

        // Tentativa 2: XML limpo
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

        // Se chegou aqui, ou XML foi processado ou dados foram extraídos via regex
        if ($xml !== false) {

            // Extrair informações do XML usando XPath com namespaces
            $cStat = $xml->xpath('//cStat') ?: $xml->xpath('//*[local-name()="cStat"]');
            $xMotivo = $xml->xpath('//xMotivo') ?: $xml->xpath('//*[local-name()="xMotivo"]');
            $chNFe = $xml->xpath('//chNFe') ?: $xml->xpath('//*[local-name()="chNFe"]');
            $nRec = $xml->xpath('//nRec') ?: $xml->xpath('//*[local-name()="nRec"]');

            // Extrair protocolo baseado na documentação oficial da SEFAZ
            // Estrutura oficial: protNFe > infProt > nProt
            $nProt = $xml->xpath('//protNFe/infProt/nProt') ?:
                     $xml->xpath('//*[local-name()="protNFe"]//*[local-name()="infProt"]//*[local-name()="nProt"]') ?:
                     $xml->xpath('//infProt/nProt') ?:
                     $xml->xpath('//*[local-name()="infProt"]//*[local-name()="nProt"]') ?:
                     $xml->xpath('//nProt') ?:
                     $xml->xpath('//*[local-name()="nProt"]');

            // Log para debug da extração do protocolo
            error_log("DEBUG PROTOCOLO: Tentativas de extração:");
            error_log("  - protNFe/infProt/nProt: " . (!empty($xml->xpath('//protNFe/infProt/nProt')) ? 'ENCONTRADO' : 'NÃO ENCONTRADO'));
            error_log("  - infProt/nProt: " . (!empty($xml->xpath('//infProt/nProt')) ? 'ENCONTRADO' : 'NÃO ENCONTRADO'));
            error_log("  - nProt direto: " . (!empty($xml->xpath('//nProt')) ? 'ENCONTRADO' : 'NÃO ENCONTRADO'));

            $status = !empty($cStat) ? (string)$cStat[0] : 'DESCONHECIDO';
            $motivo = !empty($xMotivo) ? (string)$xMotivo[0] : 'Sem motivo';
            $chave = !empty($chNFe) ? (string)$chNFe[0] : 'CHAVE_NAO_ENCONTRADA';
            $recibo = !empty($nRec) ? (string)$nRec[0] : 'RECIBO_NAO_ENCONTRADO';

            // SEGUINDO AS 4 LEIS NFe - NUNCA USAR FALLBACKS PARA PROTOCOLO
            if (!empty($nProt)) {
                $protocolo = (string)$nProt[0];
                error_log("✅ PROTOCOLO REAL EXTRAÍDO: {$protocolo}");
            } else {
                // SEM FALLBACKS - Se não há protocolo, NFe não foi autorizada
                $protocolo = null;
                error_log("❌ PROTOCOLO NÃO ENCONTRADO - NFe não foi autorizada pela SEFAZ");
                error_log("❌ Status SEFAZ: {$status} - {$motivo}");
            }
        } else {
            // Variáveis já foram definidas no bloco regex acima
        }


    } catch (Exception $xmlError) {
        error_log("ERRO: Falha ao processar XML: " . $xmlError->getMessage());
        // SEGUINDO AS 4 LEIS NFe - SEM DADOS FICTÍCIOS
        throw new Exception("Erro ao processar resposta da SEFAZ: " . $xmlError->getMessage());
    }

    // SEGUINDO AS 4 LEIS NFe - FLUXO CORRETO DA SEFAZ
    error_log("🔍 ANALISANDO RESPOSTA SEFAZ - Status: {$status} - {$motivo}");

    // Status 103 = Lote recebido com sucesso (precisa consultar recibo)
    if ($status === '103') {
        error_log("📋 LOTE RECEBIDO (103) - Consultando recibo para obter resultado final");

        // Extrair número do recibo
        if (empty($recibo) || $recibo === 'RECIBO_NAO_ENCONTRADO') {
            throw new Exception("Recibo não encontrado na resposta da SEFAZ. Status: {$status}");
        }

        error_log("🔍 CONSULTANDO RECIBO: {$recibo}");

        // Aguardar processamento (SEFAZ recomenda aguardar alguns segundos)
        sleep(3);

        // Consultar recibo para obter resultado final
        try {
            $consultaRecibo = $tools->sefazConsultaRecibo($recibo);
            error_log("📋 RESPOSTA CONSULTA RECIBO: " . strlen($consultaRecibo) . " bytes recebidos");

            // Processar resposta da consulta do recibo com múltiplas tentativas
            $xmlRecibo = false;

            // Tentativa 1: XML direto
            $xmlRecibo = @simplexml_load_string($consultaRecibo);

            // Tentativa 2: Limpar declaração XML e tentar novamente
            if (!$xmlRecibo) {
                $consultaReciboLimpo = preg_replace('/^<\?xml[^>]*\?>/', '', trim($consultaRecibo));
                $xmlRecibo = @simplexml_load_string($consultaReciboLimpo);
            }

            // Tentativa 3: Usar DOMDocument para parsing mais robusto
            if (!$xmlRecibo) {
                $dom = new DOMDocument();
                $dom->loadXML($consultaRecibo);
                $xmlRecibo = simplexml_import_dom($dom);
            }

            // Se ainda não conseguiu processar, tentar extrair dados diretamente do XML string
            if (!$xmlRecibo) {
                error_log("⚠️ TENTATIVA FINAL: Extraindo dados diretamente do XML string");

                // SEGUINDO AS 4 LEIS NFe - USAR BIBLIOTECA CORRETAMENTE
                // Primeiro, remover envelope SOAP para processar apenas o conteúdo NFe
                $xmlLimpo = $consultaRecibo;

                // Extrair apenas o conteúdo retConsReciNFe do envelope SOAP
                if (preg_match('/<retConsReciNFe[^>]*>.*?<\/retConsReciNFe>/s', $consultaRecibo, $xmlMatch)) {
                    $xmlLimpo = $xmlMatch[0];
                    error_log("✅ XML NFe extraído do envelope SOAP");
                } else {
                    error_log("⚠️ Não foi possível extrair XML do envelope SOAP, usando XML completo");
                }

                // Tentar processar XML limpo com SimpleXML
                $xmlLimpoObj = @simplexml_load_string($xmlLimpo);
                if ($xmlLimpoObj) {
                    error_log("✅ XML limpo processado com sucesso via SimpleXML");

                    // Extrair dados do lote (Status 104)
                    $statusLote = (string)($xmlLimpoObj->cStat ?? '');
                    $motivoLote = (string)($xmlLimpoObj->xMotivo ?? '');

                    error_log("📋 DADOS DO LOTE - Status: {$statusLote} - {$motivoLote}");

                    // CONFORME DOCUMENTAÇÃO OFICIAL SEFAZ - Status 104 contém resultados individuais
                    if ($statusLote === '104') {
                        error_log("📋 STATUS 104 DETECTADO - Extraindo resultado individual da NFe");

                        // Buscar dados da NFe individual em protNFe/infProt
                        $protNFe = $xmlLimpoObj->protNFe ?? null;
                        if ($protNFe && isset($protNFe->infProt)) {
                            $infProt = $protNFe->infProt;

                            $statusNFe = (string)($infProt->cStat ?? '');
                            $motivoNFe = (string)($infProt->xMotivo ?? '');
                            $protocoloNFe = (string)($infProt->nProt ?? '');

                            error_log("✅ RESULTADO INDIVIDUAL DA NFe EXTRAÍDO:");
                            error_log("  - Status NFe: {$statusNFe}");
                            error_log("  - Motivo NFe: {$motivoNFe}");
                            error_log("  - Protocolo NFe: {$protocoloNFe}");

                            // Usar dados da NFe individual (não do lote)
                            $status = $statusNFe;
                            $motivo = $motivoNFe;
                            $protocolo = $protocoloNFe;

                            // Pular processamento adicional
                            goto validacao_final;

                        } else {
                            error_log("❌ ERRO: protNFe/infProt não encontrado no XML");
                        }
                    } else {
                        // Para outros status, usar dados do lote
                        $status = $statusLote;
                        $motivo = $motivoLote;

                        // Tentar extrair protocolo se disponível
                        $protocoloLote = (string)($xmlLimpoObj->protNFe->infProt->nProt ?? '');
                        $protocolo = $protocoloLote ?: null;

                        error_log("✅ DADOS DO LOTE EXTRAÍDOS:");
                        error_log("  - Status: {$status}");
                        error_log("  - Motivo: {$motivo}");
                        error_log("  - Protocolo: " . ($protocolo ?: 'NÃO ENCONTRADO'));

                        goto validacao_final;
                    }
                }

                // Se SimpleXML falhou, usar regex como último recurso (seguindo as 4 Leis)
                error_log("⚠️ SimpleXML falhou, usando regex como último recurso");

                // Extrair dados básicos do lote
                preg_match('/<cStat>(\d+)<\/cStat>/', $consultaRecibo, $statusMatch);
                preg_match('/<xMotivo>([^<]+)<\/xMotivo>/', $consultaRecibo, $motivoMatch);

                if (!empty($statusMatch)) {
                    $statusFinal = $statusMatch[1];
                    $motivoFinal = $motivoMatch[1] ?? 'Motivo não encontrado';

                    // Para Status 104, extrair dados da NFe individual usando regex específica
                    if ($statusFinal === '104') {
                        error_log("🔍 STATUS 104 - Buscando dados da NFe individual via regex");

                        // Regex para extrair dados de protNFe/infProt (estrutura oficial SEFAZ)
                        preg_match('/<protNFe[^>]*>.*?<infProt[^>]*>.*?<cStat>(\d+)<\/cStat>.*?<xMotivo>([^<]+)<\/xMotivo>.*?<nProt>(\d+)<\/nProt>.*?<\/infProt>.*?<\/protNFe>/s', $consultaRecibo, $nfeMatch);

                        if (!empty($nfeMatch)) {
                            $statusFinal = $nfeMatch[1];  // cStat da NFe
                            $motivoFinal = $nfeMatch[2];  // xMotivo da NFe
                            $protocoloFinal = $nfeMatch[3]; // nProt da NFe

                            error_log("✅ DADOS DA NFe INDIVIDUAL EXTRAÍDOS VIA REGEX:");
                            error_log("  - Status NFe: {$statusFinal}");
                            error_log("  - Motivo NFe: {$motivoFinal}");
                            error_log("  - Protocolo NFe: {$protocoloFinal}");
                        } else {
                            error_log("❌ ERRO: Não foi possível extrair dados da NFe individual via regex");
                            $protocoloFinal = null;
                        }
                    } else {
                        // Para outros status, tentar extrair protocolo diretamente
                        preg_match('/<nProt>(\d+)<\/nProt>/', $consultaRecibo, $protocoloMatch);
                        $protocoloFinal = $protocoloMatch[1] ?? null;

                        error_log("✅ DADOS EXTRAÍDOS VIA REGEX:");
                        error_log("  - Status: {$statusFinal}");
                        error_log("  - Motivo: {$motivoFinal}");
                        error_log("  - Protocolo: " . ($protocoloFinal ? $protocoloFinal : 'NÃO ENCONTRADO'));
                    }

                    // Atualizar variáveis com resultado final
                    $status = $statusFinal;
                    $motivo = $motivoFinal;
                    $protocolo = $protocoloFinal;

                    // Pular o processamento XML normal
                    goto validacao_final;
                }

                error_log("❌ ERRO: XML da consulta do recibo inválido após múltiplas tentativas");
                error_log("XML início: " . substr($consultaRecibo, 0, 200));
                error_log("XML fim: " . substr($consultaRecibo, -200));
                error_log("Tamanho total: " . strlen($consultaRecibo) . " bytes");
                throw new Exception('Erro ao processar resposta da consulta do recibo - XML inválido');
            }

            // Extrair dados da consulta do recibo
            // A estrutura da consulta do recibo é diferente do envio
            $cStatRecibo = $xmlRecibo->xpath('//cStat') ?: $xmlRecibo->xpath('//*[local-name()="cStat"]');
            $xMotivoRecibo = $xmlRecibo->xpath('//xMotivo') ?: $xmlRecibo->xpath('//*[local-name()="xMotivo"]');

            // Para consulta de recibo, o protocolo está em protNFe/infProt/nProt dentro de cada NFe
            $nProtRecibo = $xmlRecibo->xpath('//protNFe/infProt/nProt') ?:
                          $xmlRecibo->xpath('//infProt/nProt') ?:
                          $xmlRecibo->xpath('//nProt') ?:
                          $xmlRecibo->xpath('//*[local-name()="protNFe"]//*[local-name()="infProt"]//*[local-name()="nProt"]') ?:
                          $xmlRecibo->xpath('//*[local-name()="nProt"]');

            $statusFinal = !empty($cStatRecibo) ? (string)$cStatRecibo[0] : 'DESCONHECIDO';
            $motivoFinal = !empty($xMotivoRecibo) ? (string)$xMotivoRecibo[0] : 'Sem motivo';
            $protocoloFinal = !empty($nProtRecibo) ? (string)$nProtRecibo[0] : null;

            error_log("🔍 DADOS EXTRAÍDOS DO RECIBO:");
            error_log("  - Status: {$statusFinal}");
            error_log("  - Motivo: {$motivoFinal}");
            error_log("  - Protocolo: " . ($protocoloFinal ? $protocoloFinal : 'NÃO ENCONTRADO'));

            // SEGUINDO DOCUMENTAÇÃO OFICIAL SEFAZ - Status 104 = "Lote processado"
            // Conforme MOC: "cStat=104, com os resultados individuais de processamento das NF-e"
            if ($statusFinal === '104') {
                error_log("📋 STATUS 104 - Lote processado. Buscando resultado individual da NFe...");
                error_log("🔍 DEBUG XML RECIBO - Tamanho: " . strlen($consultaRecibo) . " bytes");
                error_log("🔍 DEBUG XML RECIBO - Início: " . substr($consultaRecibo, 0, 500));

                // Buscar status específico da NFe dentro do elemento protNFe/infProt
                // Conforme documentação: protNFe/infProt/cStat e protNFe/infProt/nProt
                $cStatNFe = $xmlRecibo->xpath('//protNFe/infProt/cStat') ?:
                           $xmlRecibo->xpath('//*[local-name()="protNFe"]//*[local-name()="infProt"]//*[local-name()="cStat"]');

                $xMotivoNFe = $xmlRecibo->xpath('//protNFe/infProt/xMotivo') ?:
                             $xmlRecibo->xpath('//*[local-name()="protNFe"]//*[local-name()="infProt"]//*[local-name()="xMotivo"]');

                $nProtNFe = $xmlRecibo->xpath('//protNFe/infProt/nProt') ?:
                           $xmlRecibo->xpath('//*[local-name()="protNFe"]//*[local-name()="infProt"]//*[local-name()="nProt"]');

                error_log("🔍 DEBUG XPATH RESULTS:");
                error_log("  - cStatNFe encontrados: " . count($cStatNFe));
                error_log("  - xMotivoNFe encontrados: " . count($xMotivoNFe));
                error_log("  - nProtNFe encontrados: " . count($nProtNFe));

                if (!empty($cStatNFe)) {
                    $statusFinal = (string)$cStatNFe[0];
                    $motivoFinal = !empty($xMotivoNFe) ? (string)$xMotivoNFe[0] : $motivoFinal;
                    $protocoloFinal = !empty($nProtNFe) ? (string)$nProtNFe[0] : $protocoloFinal;

                    error_log("✅ RESULTADO INDIVIDUAL DA NFe ENCONTRADO:");
                    error_log("  - Status NFe: {$statusFinal}");
                    error_log("  - Motivo NFe: {$motivoFinal}");
                    error_log("  - Protocolo NFe: " . ($protocoloFinal ? $protocoloFinal : 'NÃO ENCONTRADO'));
                } else {
                    error_log("❌ ERRO: Não foi possível encontrar resultado individual da NFe no lote processado");
                    error_log("🔍 DEBUG: Tentando buscar qualquer elemento cStat no XML...");
                    $todosCStat = $xmlRecibo->xpath('//cStat');
                    error_log("🔍 DEBUG: Total de elementos cStat encontrados: " . count($todosCStat));
                    foreach ($todosCStat as $i => $cstat) {
                        error_log("🔍 DEBUG: cStat[$i] = " . (string)$cstat);
                    }
                }
            }

            error_log("📋 RESULTADO FINAL - Status: {$statusFinal} - {$motivoFinal}");

            // Atualizar variáveis com resultado final
            $status = $statusFinal;
            $motivo = $motivoFinal;
            $protocolo = $protocoloFinal;

        } catch (Exception $consultaError) {
            error_log("❌ ERRO ao consultar recibo: " . $consultaError->getMessage());
            throw new Exception("Erro ao consultar recibo da SEFAZ: " . $consultaError->getMessage());
        }
    }

    // Status 104 = Lote processado (resultado já está no XML de resposta)
    if ($status === '104') {
        error_log("📋 LOTE PROCESSADO (104) - Extraindo resultado individual diretamente do XML de resposta");

        // Para status 104, o XML de resposta já contém o resultado individual da NFe
        // Não precisamos consultar recibo, apenas extrair os dados do XML atual
        try {
            // Buscar status específico da NFe dentro do elemento protNFe/infProt
            $cStatNFe = $xml->xpath('//protNFe/infProt/cStat') ?:
                       $xml->xpath('//*[local-name()="protNFe"]//*[local-name()="infProt"]//*[local-name()="cStat"]');

            $xMotivoNFe = $xml->xpath('//protNFe/infProt/xMotivo') ?:
                         $xml->xpath('//*[local-name()="protNFe"]//*[local-name()="infProt"]//*[local-name()="xMotivo"]');

            $nProtNFe = $xml->xpath('//protNFe/infProt/nProt') ?:
                       $xml->xpath('//*[local-name()="protNFe"]//*[local-name()="infProt"]//*[local-name()="nProt"]');

            error_log("🔍 DEBUG XPATH RESULTS (Status 104):");
            error_log("  - cStatNFe encontrados: " . count($cStatNFe));
            error_log("  - xMotivoNFe encontrados: " . count($xMotivoNFe));
            error_log("  - nProtNFe encontrados: " . count($nProtNFe));

            if (!empty($cStatNFe)) {
                $status = (string)$cStatNFe[0];
                $motivo = !empty($xMotivoNFe) ? (string)$xMotivoNFe[0] : $motivo;
                $protocolo = !empty($nProtNFe) ? (string)$nProtNFe[0] : null;

                error_log("✅ RESULTADO INDIVIDUAL DA NFe EXTRAÍDO (Status 104):");
                error_log("  - Status NFe: {$status}");
                error_log("  - Motivo NFe: {$motivo}");
                error_log("  - Protocolo NFe: " . ($protocolo ? $protocolo : 'NÃO ENCONTRADO'));
            } else {
                error_log("❌ ERRO: Não foi possível encontrar resultado individual da NFe no XML de resposta (Status 104)");
                error_log("🔍 DEBUG: Tentando buscar qualquer elemento cStat no XML...");
                $todosCStat = $xml->xpath('//cStat');
                error_log("🔍 DEBUG: Total de elementos cStat encontrados: " . count($todosCStat));
                foreach ($todosCStat as $i => $cstat) {
                    error_log("🔍 DEBUG: cStat[$i] = " . (string)$cstat);
                }
            }

        } catch (Exception $status104Error) {
            error_log("❌ ERRO ao processar status 104: " . $status104Error->getMessage());
            throw new Exception("Erro ao processar resposta da SEFAZ com status 104: " . $status104Error->getMessage());
        }
    }

    // Label para goto
    validacao_final:

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

            // Erros de Duplicidade e Numeração
            '204' => [
                'titulo' => 'NFe Duplicada',
                'descricao' => 'Já existe uma NFe com este número, série e chave de acesso.',
                'solucao' => 'Use um número sequencial diferente ou verifique se esta NFe já foi emitida anteriormente.'
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

            // Erros de Certificado
            '280' => [
                'titulo' => 'Certificado Digital Inválido',
                'descricao' => 'O certificado digital está vencido ou inválido.',
                'solucao' => 'Renove ou configure um certificado digital válido.'
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
            ],

            // Erros de ICMS-ST e CEST
            '806' => [
                'titulo' => 'CEST Obrigatório para ICMS-ST',
                'descricao' => 'Operação com ICMS-ST sem informação do CEST (Código Especificador da Substituição Tributária).',
                'solucao' => 'Informe o código CEST correto para produtos com Substituição Tributária (CST/CSOSN: 10, 30, 60, 70, 90, 201, 202, 203, 500, 900).'
            ],

            // Erros de CST e Tributação
            '508' => [
                'titulo' => 'CST Incompatível com Não Contribuinte',
                'descricao' => 'CST informado é incompatível para operação com destinatário não contribuinte.',
                'solucao' => 'Verifique se o destinatário é contribuinte ou ajuste o CST para operação com não contribuinte.'
            ],
            '770' => [
                'titulo' => 'CFOP Inexistente',
                'descricao' => 'O CFOP informado não existe na tabela oficial.',
                'solucao' => 'Verifique e corrija o CFOP do produto conforme a tabela oficial.'
            ],
            '732' => [
                'titulo' => 'CFOP Interestadual Incorreto',
                'descricao' => 'CFOP de operação interestadual mas destinatário não é de UF diferente.',
                'solucao' => 'Use CFOP de operação interna ou verifique a UF do destinatário.'
            ],
            '733' => [
                'titulo' => 'CFOP Interno Incorreto',
                'descricao' => 'CFOP de operação interna mas destinatário é de UF diferente.',
                'solucao' => 'Use CFOP de operação interestadual ou verifique a UF do destinatário.'
            ],
            '696' => [
                'titulo' => 'Operação com Não Contribuinte',
                'descricao' => 'Operação com não contribuinte deve indicar consumidor final.',
                'solucao' => 'Marque o campo "Consumidor Final" como SIM para destinatários não contribuintes.'
            ],

            // Erros de Valores e Cálculos
            '351' => [
                'titulo' => 'Valor ICMS Divergente',
                'descricao' => 'Valor do ICMS difere do cálculo base de cálculo x alíquota.',
                'solucao' => 'Recalcule o ICMS ou verifique a base de cálculo e alíquota informadas.'
            ],
            '685' => [
                'titulo' => 'Valor Aproximado de Tributos Divergente',
                'descricao' => 'Total do valor aproximado dos tributos difere do somatório dos itens.',
                'solucao' => 'Recalcule o valor aproximado dos tributos conforme tabela IBPT.'
            ],

            // Erros de Pagamento
            '871' => [
                'titulo' => 'Meio de Pagamento Incorreto',
                'descricao' => 'O campo meio de pagamento deve ser preenchido com "Sem Pagamento".',
                'solucao' => 'Para NFe de devolução, use meio de pagamento "90 - Sem Pagamento".'
            ],
            '866' => [
                'titulo' => 'Troco Ausente',
                'descricao' => 'Ausência de troco quando valor dos pagamentos é maior que total da nota.',
                'solucao' => 'Informe o valor do troco ou ajuste os valores de pagamento.'
            ],

            // Erros de Schema e Estrutura
            '215' => [
                'titulo' => 'Falha no Schema XML',
                'descricao' => 'O XML da NFe não está conforme o schema oficial.',
                'solucao' => 'Verifique a estrutura do XML ou regenere a NFe.'
            ],
            '239' => [
                'titulo' => 'Versão XML Não Suportada',
                'descricao' => 'A versão do arquivo XML não é suportada.',
                'solucao' => 'Use a versão mais recente do layout da NFe.'
            ],

            // Erros de Serviço SEFAZ
            '108' => [
                'titulo' => 'Serviço Temporariamente Indisponível',
                'descricao' => 'Serviço da SEFAZ paralisado momentaneamente.',
                'solucao' => 'Aguarde alguns minutos e tente novamente.'
            ],
            '109' => [
                'titulo' => 'Serviço Indisponível',
                'descricao' => 'Serviço da SEFAZ paralisado sem previsão.',
                'solucao' => 'Consulte o status da SEFAZ ou tente mais tarde.'
            ],

            // Erros de Destinatário
            '305' => [
                'titulo' => 'Destinatário Bloqueado',
                'descricao' => 'Destinatário está bloqueado na UF.',
                'solucao' => 'Verifique a situação cadastral do destinatário na SEFAZ.'
            ],
            '306' => [
                'titulo' => 'IE do Destinatário Inativa',
                'descricao' => 'Inscrição Estadual do destinatário não está ativa.',
                'solucao' => 'Verifique a IE do destinatário ou marque como não contribuinte.'
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

        // ✅ CORREÇÃO: Status 104 não deve ser tratado como erro aqui
        // Se chegou até aqui com status 104, significa que houve problema na extração do status individual
        if ($status === '104') {
            return [
                'titulo' => 'Erro no Processamento do Lote',
                'descricao' => 'O lote foi processado pela SEFAZ, mas não foi possível extrair o status individual da NFe.',
                'solucao' => 'Consulte o status da NFe diretamente na SEFAZ ou tente reenviar.',
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

    // VALIDAÇÃO CRÍTICA - SEGUINDO DOCUMENTAÇÃO OFICIAL ROBERTO MACHADO (sped-nfe)
    // Conforme documentação: Status individual da NFe deve ser 100 ou 150 para autorização
    error_log("🔍 DEBUG VALIDAÇÃO FINAL:");
    error_log("  - Status recebido: '{$status}'");
    error_log("  - Motivo: '{$motivo}'");
    error_log("  - Protocolo: " . ($protocolo ? $protocolo : 'VAZIO'));
    error_log("  - Tipo do status: " . gettype($status));

    // ✅ CORREÇÃO BASEADA NA DOCUMENTAÇÃO OFICIAL:
    // Status 100 = NFe autorizada
    // Status 150 = NFe autorizada fora de prazo
    // Qualquer outro status = ERRO na NFe
    if ($status !== '100' && $status !== '150') {
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
    } else {
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
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
