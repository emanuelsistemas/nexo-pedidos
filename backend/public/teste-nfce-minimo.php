<?php
/**
 * Teste mínimo NFC-e seguindo EXATAMENTE a documentação oficial
 * https://github.com/nfephp-org/sped-nfe/blob/master/docs/Make.md
 *
 * SEGUINDO AS 5 LEIS FUNDAMENTAIS:
 * - LEI DA BIBLIOTECA SAGRADA: sped-nfe está correta, nos adaptamos
 * - LEI DA DOCUMENTAÇÃO OFICIAL: seguir exatamente a documentação
 */

// Aumentar limites
ini_set('memory_limit', '512M');
ini_set('max_execution_time', 300);

header('Content-Type: application/json; charset=utf-8');

try {
    require_once '../vendor/autoload.php';
    
    echo json_encode(['step' => 'autoload', 'status' => 'ok']);
    echo "\n";
    
    // Configuração mínima seguindo documentação
    $config = [
        "atualizacao" => date('Y-m-d H:i:s'),
        "tpAmb" => 2, // Homologação
        "razaosocial" => "EMPRESA TESTE LTDA",
        "cnpj" => "24163237000151",
        "siglaUF" => "SP",
        "schemes" => "PL_009_V4",
        "versao" => '4.00',
        "CSC" => "56c7e074-f050-4233-8417-c64f082a2970",
        "CSCid" => "3"
    ];
    
    echo json_encode(['step' => 'config', 'status' => 'ok']);
    echo "\n";
    
    // Certificado
    $certificadoPath = "../storage/certificados/empresa_acd26a4f-7220-405e-9c96-faffb7e6480e.pfx";
    $metadataPath = "../storage/certificados/empresa_acd26a4f-7220-405e-9c96-faffb7e6480e.json";
    
    if (!file_exists($certificadoPath)) {
        throw new Exception('Certificado não encontrado');
    }
    
    $certificado = file_get_contents($certificadoPath);
    $metadata = json_decode(file_get_contents($metadataPath), true);
    
    echo json_encode(['step' => 'certificate_load', 'status' => 'ok']);
    echo "\n";
    
    $certificate = \NFePHP\Common\Certificate::readPfx($certificado, $metadata['password'] ?? '');
    
    echo json_encode(['step' => 'certificate_create', 'status' => 'ok']);
    echo "\n";
    
    // Tools
    $tools = new \NFePHP\NFe\Tools(json_encode($config), $certificate);
    $tools->model('65'); // NFC-e
    
    echo json_encode(['step' => 'tools_create', 'status' => 'ok']);
    echo "\n";
    
    // Make
    $make = new \NFePHP\NFe\Make();
    
    echo json_encode(['step' => 'make_create', 'status' => 'ok']);
    echo "\n";
    
    // IDE - Seguindo documentação EXATA
    $std = new stdClass();
    $std->cUF = 35; // SP
    $std->cNF = '87654321'; // Código numérico DIFERENTE do nNF (seguindo NT 2019.001)
    $std->natOp = 'Venda de mercadoria';
    $std->mod = 65; // NFC-e
    $std->serie = 1;
    $std->nNF = 1;
    $std->dhEmi = date('Y-m-d\TH:i:sP');
    $std->tpNF = 1;
    $std->idDest = 1;
    $std->cMunFG = 3550308; // São Paulo
    $std->tpImp = 4; // NFC-e
    $std->tpEmis = 1;
    $std->cDV = 0;
    $std->tpAmb = 2;
    $std->finNFe = 1;
    $std->indFinal = 1;
    $std->indPres = 1;
    $std->procEmi = 0;
    $std->verProc = '1.0.0';
    
    $make->tagide($std);
    
    echo json_encode(['step' => 'ide_create', 'status' => 'ok']);
    echo "\n";
    
    // Emitente
    $std = new stdClass();
    $std->xNome = 'EMPRESA TESTE LTDA';
    $std->CNPJ = '24163237000151';
    $std->IE = '123456789012';
    $std->CRT = 1; // Simples Nacional
    
    $make->tagemit($std);
    
    echo json_encode(['step' => 'emit_create', 'status' => 'ok']);
    echo "\n";
    
    // Endereço emitente
    $std = new stdClass();
    $std->xLgr = 'RUA TESTE';
    $std->nro = '123';
    $std->xBairro = 'CENTRO';
    $std->cMun = 3550308;
    $std->xMun = 'SAO PAULO';
    $std->UF = 'SP';
    $std->CEP = '01234567';
    $std->cPais = 1058;
    $std->xPais = 'Brasil';
    
    $make->tagenderEmit($std);
    
    echo json_encode(['step' => 'endereco_create', 'status' => 'ok']);
    echo "\n";
    
    // Produto
    $std = new stdClass();
    $std->cProd = 'PROD001';
    $std->cEAN = 'SEM GTIN';
    $std->xProd = 'PRODUTO TESTE';
    $std->NCM = '22030000';
    $std->CFOP = '5102';
    $std->uCom = 'UN';
    $std->qCom = 1;
    $std->vUnCom = 10.00;
    $std->vProd = 10.00;
    $std->cEANTrib = 'SEM GTIN';
    $std->uTrib = 'UN';
    $std->qTrib = 1;
    $std->vUnTrib = 10.00;
    $std->indTot = 1;
    
    $make->tagprod($std);
    
    echo json_encode(['step' => 'produto_create', 'status' => 'ok']);
    echo "\n";
    
    // ICMS
    $std = new stdClass();
    $std->orig = 0;
    $std->CSOSN = '102';
    
    $make->tagICMSSN($std);
    
    echo json_encode(['step' => 'icms_create', 'status' => 'ok']);
    echo "\n";
    
    // PIS
    $std = new stdClass();
    $std->CST = '49';
    
    $make->tagPIS($std);
    
    echo json_encode(['step' => 'pis_create', 'status' => 'ok']);
    echo "\n";
    
    // COFINS
    $std = new stdClass();
    $std->CST = '49';
    
    $make->tagCOFINS($std);
    
    echo json_encode(['step' => 'cofins_create', 'status' => 'ok']);
    echo "\n";
    
    // Totais
    $std = new stdClass();
    $std->vBC = 0.00;
    $std->vICMS = 0.00;
    $std->vICMSDeson = 0.00;
    $std->vFCP = 0.00;
    $std->vBCST = 0.00;
    $std->vST = 0.00;
    $std->vFCPST = 0.00;
    $std->vFCPSTRet = 0.00;
    $std->vProd = 10.00;
    $std->vFrete = 0.00;
    $std->vSeg = 0.00;
    $std->vDesc = 0.00;
    $std->vII = 0.00;
    $std->vIPI = 0.00;
    $std->vIPIDevol = 0.00;
    $std->vPIS = 0.00;
    $std->vCOFINS = 0.00;
    $std->vOutro = 0.00;
    $std->vNF = 10.00;
    $std->vTotTrib = 0.00;
    
    $make->tagICMSTot($std);
    
    echo json_encode(['step' => 'totais_create', 'status' => 'ok']);
    echo "\n";
    
    // Transporte
    $std = new stdClass();
    $std->modFrete = 9;
    
    $make->tagtransp($std);
    
    echo json_encode(['step' => 'transporte_create', 'status' => 'ok']);
    echo "\n";
    
    // PAGAMENTO - OBRIGATÓRIO PARA NFC-e
    // Testando ordem: primeiro pag (container), depois detPag (detalhes)

    $std = new stdClass();
    $std->vTroco = 0.00;

    $make->tagpag($std);

    echo json_encode(['step' => 'pag_create', 'status' => 'ok']);
    echo "\n";

    $std = new stdClass();
    $std->indPag = 0;
    $std->tPag = '01';
    $std->vPag = 10.00;

    $make->tagdetPag($std);

    echo json_encode(['step' => 'detpag_create', 'status' => 'ok']);
    echo "\n";

    // Informações adicionais (pode ser obrigatório)
    $std = new stdClass();
    $std->infCpl = 'NFC-e emitida em ambiente de homologacao';

    $make->taginfAdic($std);

    echo json_encode(['step' => 'infadic_create', 'status' => 'ok']);
    echo "\n";

    // Gerar XML
    echo json_encode(['step' => 'xml_start', 'status' => 'ok']);
    echo "\n";

    try {
        $xml = $make->getXML();

        echo json_encode(['step' => 'xml_generated', 'status' => 'ok']);
        echo "\n";

        if (empty($xml)) {
            throw new Exception('XML vazio');
        }

        echo json_encode(['step' => 'xml_validate', 'status' => 'ok', 'xml_size' => strlen($xml)]);
        echo "\n";

        echo json_encode(['step' => 'final', 'status' => 'success', 'message' => 'NFC-e mínima criada com sucesso']);

    } catch (Exception $xmlError) {
        echo json_encode(['step' => 'xml_error', 'status' => 'error', 'message' => $xmlError->getMessage()]);
        echo "\n";
        throw $xmlError;
    }
    
} catch (Exception $e) {
    echo json_encode([
        'step' => 'error',
        'status' => 'error',
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
}
?>
