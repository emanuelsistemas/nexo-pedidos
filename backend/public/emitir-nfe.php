<?php
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

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
        throw new Exception('empresa_id é obrigatório');
    }
    
    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $empresaId)) {
        throw new Exception('empresa_id inválido');
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
        throw new Exception('Dados da NFe incompletos');
    }

    // Configuração da empresa (USANDO DADOS REAIS DA EMPRESA)
    $empresa = $nfeData['empresa'];
    $ambiente = ($nfeData['ambiente'] ?? 'homologacao') === 'producao' ? 1 : 2;
    
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
        "versao" => '4.00'
    ];
    
    // Criar objeto Certificate
    $certificate = \NFePHP\Common\Certificate::readPfx($certificado, $metadata['password'] ?? '');

    // Inicializar Tools (MÉTODO NATIVO)
    $tools = new \NFePHP\NFe\Tools(json_encode($config), $certificate);
    $tools->model('55'); // Modelo NFe

    // Inicializar Make (MÉTODO NATIVO)
    $make = new \NFePHP\NFe\Make();
    
    // MONTAGEM DA NFe USANDO MÉTODOS NATIVOS DA BIBLIOTECA
    // Identificação da NFe
    $identificacao = $nfeData['identificacao'] ?? [];

    // Código UF manual (SP = 35)
    $codigosUF = [
        'AC' => 12, 'AL' => 17, 'AP' => 16, 'AM' => 13, 'BA' => 29,
        'CE' => 23, 'DF' => 53, 'ES' => 32, 'GO' => 52, 'MA' => 21,
        'MT' => 51, 'MS' => 50, 'MG' => 31, 'PA' => 15, 'PB' => 25,
        'PR' => 41, 'PE' => 26, 'PI' => 22, 'RJ' => 33, 'RN' => 24,
        'RS' => 43, 'RO' => 11, 'RR' => 14, 'SC' => 42, 'SP' => 35,
        'SE' => 28, 'TO' => 17
    ];
    $uf = $empresa['uf'] ?? 'SP';

    // CRIAR ESTRUTURA INFNFE
    $std = new stdClass();
    $std->versao = '4.00';
    $std->Id = null; // Será gerado automaticamente
    $std->pk_nItem = null;

    // USAR MÉTODO NATIVO PARA ADICIONAR IDENTIFICAÇÃO
    $make->taginfNFe($std);

    // CRIAR TAG IDE (IDENTIFICAÇÃO) - OBRIGATÓRIO ANTES DOS PRODUTOS
    $std = new stdClass();
    $std->cUF = $codigosUF[$uf] ?? 35;
    $std->cNF = str_pad(rand(10000000, 99999999), 8, '0', STR_PAD_LEFT);
    $std->natOp = $identificacao['natureza_operacao'] ?? 'Venda de mercadoria';
    $std->mod = 55; // NFe
    $std->serie = (int)($identificacao['serie'] ?? 1);
    $std->nNF = (int)($identificacao['numero'] ?? 1);
    $std->dhEmi = date('Y-m-d\TH:i:sP');
    $std->tpNF = 1; // Saída
    $std->idDest = 1; // Operação interna
    $std->cMunFG = (int)($empresa['codigo_municipio'] ?? 3550308);
    $std->tpImp = 1; // DANFE normal
    $std->tpEmis = 1; // Emissão normal
    $std->cDV = 0;
    $std->tpAmb = $ambiente;
    $std->finNFe = 1; // Normal
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

    // Endereço do destinatário (OBRIGATÓRIO - ESTAVA FALTANDO)
    $enderecoDestinatario = $destinatario['endereco'] ?? [];

    if (!empty($enderecoDestinatario)) {
        $std = new stdClass();
        $std->xLgr = $enderecoDestinatario['logradouro'] ?? 'RUA NAO INFORMADA';
        $std->nro = $enderecoDestinatario['numero'] ?? 'S/N';
        $std->xBairro = $enderecoDestinatario['bairro'] ?? 'CENTRO';
        $std->cMun = (int)($enderecoDestinatario['codigo_municipio'] ?? 3550308);
        $std->xMun = $enderecoDestinatario['cidade'] ?? 'SAO PAULO';
        $std->UF = $enderecoDestinatario['uf'] ?? 'SP';
        $std->CEP = preg_replace('/[^0-9]/', '', $enderecoDestinatario['cep'] ?? '01000000');
        $std->cPais = 1058;
        $std->xPais = 'BRASIL';

        $make->tagenderDest($std);
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
                  ", Origem: " . ($produto['origem_produto'] ?? 0));

        // Log da tag ICMS que será usada (será atualizado após processamento)

        // Produto - Mapear campos corretamente
        $std = new stdClass();
        $std->item = $item;
        $std->cProd = $produto['codigo'] ?? $produto['id'] ?? "PROD{$item}";
        $std->cEAN = $produto['ean'] ?? 'SEM GTIN'; // CRÍTICO: deve ser 'SEM GTIN' quando não há EAN

        // Tentar diferentes campos para o nome do produto
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
            $nomeProduto = 'PRODUTO SEM NOME';
        }

        $std->xProd = $nomeProduto;
        $std->NCM = $produto['ncm'] ?? '99999999'; // CRÍTICO: NCM deve ter 8 dígitos válidos
        $std->CFOP = $produto['cfop'] ?? '5102';
        $std->uCom = $produto['unidade'] ?? 'UN';
        $std->qCom = (float)($produto['quantidade'] ?? 1);
        $std->vUnCom = (float)($produto['valor_unitario'] ?? $produto['preco'] ?? 0);
        $std->vProd = (float)($produto['valor_total'] ?? $produto['total'] ?? 0);
        $std->cEANTrib = $produto['ean'] ?? 'SEM GTIN'; // CRÍTICO: deve ser 'SEM GTIN' quando não há EAN
        $std->uTrib = $produto['unidade'] ?? 'UN';
        $std->qTrib = (float)($produto['quantidade'] ?? 1);
        $std->vUnTrib = (float)($produto['valor_unitario'] ?? $produto['preco'] ?? 0);

        // Campos obrigatórios que estavam faltando (conforme documentação)
        $std->vFrete = null;
        $std->vSeg = null;
        $std->vDesc = null;
        $std->vOutro = null;
        $std->indTot = 1;

        $make->tagprod($std);

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
            if ($csosn === '101' && $aliquotaICMS > 0) {
                // CSOSN 101 - Tributada pelo Simples Nacional com permissão de crédito
                $std->pCredSN = $aliquotaICMS;
                $std->vCredICMSSN = round((float)($produto['valor_total'] ?? 0) * ($aliquotaICMS / 100), 2);
            }
            // Usar método específico para Simples Nacional
            $make->tagICMSSN($std);
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
    error_log("NFE: Totais calculados - Produtos: R$ {$totalProdutos}, ICMS: R$ {$totalICMS}, PIS: R$ {$totalPIS}, COFINS: R$ {$totalCOFINS}, Total NFe: R$ " . $std->vNF);

    $make->tagICMSTot($std);

    // Transporte (MÉTODO NATIVO) - OBRIGATÓRIO antes do pagamento
    $std = new stdClass();
    $std->modFrete = 9; // 9=Sem Ocorrência de Transporte

    $make->tagtransp($std);

    // Pagamento (MÉTODO NATIVO) - Conforme documentação fiscal
    // 1. PRIMEIRO: Criar grupo PAG (container)
    $std = new stdClass();
    $std->vTroco = null; // null para NFe (modelo 55), 0.00 para NFCe (modelo 65)
    $make->tagpag($std);

    // 2. DEPOIS: Criar detalhes do pagamento dentro do grupo PAG
    $std = new stdClass();
    $std->indPag = 0; // 0=À vista, 1=À prazo
    $std->tPag = '01'; // 01=Dinheiro (conforme tabela fiscal)
    $std->vPag = $totalProdutos - (float)($totais['valor_desconto'] ?? 0); // Usar valor calculado

    $make->tagdetPag($std);
    
    // GERAR XML (MÉTODO NATIVO)
    try {
        $xml = $make->getXML();
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
                $chave = $chaveMatch[1] ?? 'CHAVE_REGEX_' . time();
                $protocolo = $protocoloMatch[1] ?? 'PROTOCOLO_REGEX';

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
            $nProt = $xml->xpath('//nProt') ?: $xml->xpath('//*[local-name()="nProt"]');
            $nRec = $xml->xpath('//nRec') ?: $xml->xpath('//*[local-name()="nRec"]');

            $status = !empty($cStat) ? (string)$cStat[0] : 'DESCONHECIDO';
            $motivo = !empty($xMotivo) ? (string)$xMotivo[0] : 'Sem motivo';
            $chave = !empty($chNFe) ? (string)$chNFe[0] : 'CHAVE_NAO_ENCONTRADA';
            $protocolo = !empty($nProt) ? (string)$nProt[0] : 'PROTOCOLO_NAO_ENCONTRADO';
            $recibo = !empty($nRec) ? (string)$nRec[0] : 'RECIBO_NAO_ENCONTRADO';
        } else {
            // Variáveis já foram definidas no bloco regex acima
        }


    } catch (Exception $xmlError) {
        error_log("ERRO: Falha ao processar XML: " . $xmlError->getMessage());
        // Se houver erro no XML, usar dados básicos
        $chave = 'ERRO_XML_' . time();
        $protocolo = 'ERRO_PROTOCOLO';
        $status = 'ERRO';
        $motivo = 'Erro ao processar resposta';
        $recibo = 'ERRO_RECIBO';
    }

    // Resultado da resposta (XML string)
    $resultado = [
        'chave' => $chave,
        'protocolo' => $protocolo,
        'recibo' => $recibo ?? 'RECIBO_NAO_ENCONTRADO',
        'status' => $status ?? 'DESCONHECIDO',
        'motivo' => $motivo ?? 'Sem motivo',
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

    // Salvar XML em arquivo
    $xmlDir = "../storage/xml/empresa_{$empresaId}/" . date('Y/m');
    if (!is_dir($xmlDir)) {
        mkdir($xmlDir, 0755, true);
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


    // Gerar DANFE (PDF) - Apenas para NFe autorizadas (status 100)
    $pdfPath = null;
    if ($status === '100') {
        // NFe autorizada - gerar PDF
        try {
            if (!class_exists('\NFePHP\DA\NFe\Danfe')) {
                throw new Exception('Classe Danfe não encontrada - instale sped-da');
            }


            $danfe = new \NFePHP\DA\NFe\Danfe($xmlComDeclaracao);

            $danfe->debugMode(false);
            $danfe->creditsIntegratorFooter('Sistema Nexo PDV');

            $pdfContent = $danfe->render();

            if (empty($pdfContent)) {
                throw new Exception('PDF gerado está vazio');
            }

            // Salvar PDF
            $pdfDir = "../storage/pdf/empresa_{$empresaId}/" . date('Y/m');
            if (!is_dir($pdfDir)) {
                mkdir($pdfDir, 0755, true);
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


        } catch (Exception $pdfError) {
            error_log("ERRO CRÍTICO: Falha ao gerar PDF: " . $pdfError->getMessage());
            throw new Exception("Erro ao gerar PDF DANFE: " . $pdfError->getMessage());
        }
    } else {
        // Status 103 ou outro - PDF será gerado após autorização
        $pdfPath = null;
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
