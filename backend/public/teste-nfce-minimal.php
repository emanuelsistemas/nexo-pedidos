<?php
// Teste MÍNIMO para identificar onde trava na NFC-e
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: text/plain; charset=utf-8');

echo "=== TESTE MÍNIMO NFC-e ===\n";

try {
    echo "1. Carregando dependências...\n";
    require_once '../vendor/autoload.php';
    echo "✅ Dependências carregadas\n";

    echo "2. Buscando configurações REAIS da empresa (LEI DOS DADOS REAIS)...\n";
    $empresaId = 'acd26a4f-7220-405e-9c96-faffb7e6480e';
    $configUrl = "http://localhost/backend/public/get-empresa-config.php?empresa_id={$empresaId}";

    echo "   URL: {$configUrl}\n";

    // Usar cURL com timeout mais baixo e debug
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $configUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5); // Timeout menor
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
    curl_setopt($ch, CURLOPT_VERBOSE, true);

    echo "   Executando cURL...\n";
    $configResponse = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    echo "   HTTP Code: {$httpCode}\n";
    echo "   cURL Error: " . ($curlError ?: 'Nenhum') . "\n";
    echo "   Response size: " . strlen($configResponse) . " bytes\n";

    if ($httpCode !== 200) {
        throw new Exception("Erro HTTP: {$httpCode} - {$curlError}");
    }

    if (!$configResponse) {
        throw new Exception('Resposta vazia do servidor');
    }

    $configData = json_decode($configResponse, true);

    if (!$configData || !$configData['success']) {
        throw new Exception('Configurações inválidas: ' . json_encode($configData));
    }

    $empresa = $configData['data']['empresa'];
    $nfeConfig = $configData['data']['nfe_config'];
    echo "✅ Configurações carregadas\n";

    echo "3. Carregando certificado...\n";
    $certificadoPath = "../storage/certificados/empresa_{$empresaId}.pfx";
    $metadataPath = "../storage/certificados/empresa_{$empresaId}.json";
    
    $certificado = file_get_contents($certificadoPath);
    $metadata = json_decode(file_get_contents($metadataPath), true);
    echo "✅ Certificado carregado\n";

    echo "4. Configurando biblioteca...\n";
    $ambiente = $nfeConfig['ambiente_codigo'] ?? 2;
    $cscField = $ambiente == 1 ? 'csc_producao' : 'csc_homologacao';
    $cscIdField = $ambiente == 1 ? 'csc_id_producao' : 'csc_id_homologacao';
    
    $cnpjLimpo = preg_replace('/[^0-9]/', '', $empresa['cnpj']);
    
    $config = [
        "atualizacao" => date('Y-m-d H:i:s'),
        "tpAmb" => $ambiente,
        "razaosocial" => $empresa['razao_social'],
        "cnpj" => $cnpjLimpo,
        "siglaUF" => $empresa['uf'],
        "schemes" => "PL_009_V4",
        "versao" => '4.00',
        "CSC" => $empresa[$cscField],
        "CSCid" => (string)$empresa[$cscIdField]
    ];
    echo "✅ Configuração montada\n";

    echo "5. Inicializando biblioteca...\n";
    $certificate = \NFePHP\Common\Certificate::readPfx($certificado, $metadata['password'] ?? '');
    $tools = new \NFePHP\NFe\Tools(json_encode($config), $certificate);
    $tools->model('65');
    $make = new \NFePHP\NFe\Make();
    echo "✅ Biblioteca inicializada\n";

    echo "6. Criando tag infNFe...\n";
    $std = new stdClass();
    $std->versao = '4.00';
    $std->Id = null;
    $std->pk_nItem = null;
    $make->taginfNFe($std);
    echo "✅ Tag infNFe criada\n";

    echo "7. Criando tag IDE...\n";
    $std = new stdClass();
    $std->cUF = (int)$empresa['codigo_uf'];
    $std->cNF = '87654321';
    $std->nNF = 1;
    $std->natOp = 'Venda de mercadoria';
    $std->mod = 65;
    $std->serie = 1;
    $std->dhEmi = date('Y-m-d\TH:i:sP');
    $std->tpNF = 1;
    $std->idDest = 1;
    $std->cMunFG = (int)$empresa['codigo_municipio'];
    $std->tpImp = 4;
    $std->tpEmis = 1;
    $std->cDV = 0;
    $std->tpAmb = $ambiente;
    $std->finNFe = 1;
    $std->indFinal = 1;
    $std->indPres = 1;
    $std->procEmi = 0;
    $std->verProc = '1.0.0';
    $make->tagide($std);
    echo "✅ Tag IDE criada\n";

    echo "8. Criando emitente...\n";
    $std = new stdClass();
    $std->xNome = $empresa['razao_social'];
    $std->CNPJ = $cnpjLimpo;
    $std->IE = $empresa['inscricao_estadual'];
    $std->CRT = (int)$empresa['regime_tributario'];
    $make->tagemit($std);
    echo "✅ Emitente criado\n";

    echo "9. Criando endereço emitente...\n";
    $endereco = $empresa['endereco'];
    $std = new stdClass();
    $std->xLgr = $endereco['logradouro'];
    $std->nro = $endereco['numero'];
    $std->xBairro = $endereco['bairro'];
    $std->cMun = (int)$empresa['codigo_municipio'];
    $std->xMun = $endereco['cidade'] ?? $empresa['cidade'] ?? 'São Paulo';
    $std->UF = $empresa['uf'];
    $std->CEP = preg_replace('/[^0-9]/', '', $endereco['cep']);
    $std->cPais = 1058;
    $std->xPais = 'Brasil';
    $make->tagenderEmit($std);
    echo "✅ Endereço emitente criado\n";

    echo "10. Adicionando produto simples...\n";
    $std = new stdClass();
    $std->item = 1;
    $std->cProd = '1';
    $std->xProd = 'SKOL LATA 350ml';
    $std->NCM = '22030000';
    $std->CFOP = '5102';
    $std->uCom = 'UN';
    $std->qCom = 1.0;
    $std->vUnCom = 42.8;
    $std->vProd = 42.8;
    $std->uTrib = 'UN';
    $std->qTrib = 1.0;
    $std->vUnTrib = 42.8;
    $std->indTot = 1;
    $make->tagprod($std);
    echo "✅ Produto criado\n";

    echo "11. Adicionando impostos...\n";
    // Container de impostos
    $std = new stdClass();
    $std->item = 1;
    $make->tagimposto($std);

    // ICMS
    $std = new stdClass();
    $std->item = 1;
    $std->orig = 0;
    $std->CSOSN = '102';
    $make->tagICMSSN($std);

    // PIS
    $std = new stdClass();
    $std->item = 1;
    $std->CST = '01';
    $std->vBC = 42.8;
    $std->pPIS = 1.65;
    $std->vPIS = 0.71;
    $make->tagPIS($std);

    // COFINS
    $std = new stdClass();
    $std->item = 1;
    $std->CST = '01';
    $std->vBC = 42.8;
    $std->pCOFINS = 7.6;
    $std->vCOFINS = 3.25;
    $make->tagCOFINS($std);
    echo "✅ Impostos criados\n";

    echo "12. Adicionando totais...\n";
    $std = new stdClass();
    $std->vBC = 0.00;
    $std->vICMS = 0.00;
    $std->vICMSDeson = 0.00;
    $std->vFCP = 0.00;
    $std->vBCST = 0.00;
    $std->vST = 0.00;
    $std->vFCPST = 0.00;
    $std->vFCPSTRet = 0.00;
    $std->vProd = 42.8;
    $std->vFrete = 0.00;
    $std->vSeg = 0.00;
    $std->vDesc = 0.00;
    $std->vII = 0.00;
    $std->vIPI = 0.00;
    $std->vIPIDevol = 0.00;
    $std->vPIS = 0.71;
    $std->vCOFINS = 3.25;
    $std->vOutro = 0.00;
    $std->vNF = 42.8;
    $std->vTotTrib = 0.00;
    $make->tagICMSTot($std);
    echo "✅ Totais criados\n";

    echo "13. Adicionando transporte...\n";
    $std = new stdClass();
    $std->modFrete = 9;
    $make->tagtransp($std);
    echo "✅ Transporte criado\n";

    echo "14. Adicionando pagamento...\n";
    $std = new stdClass();
    $std->vTroco = 0.00;
    $make->tagpag($std);

    $std = new stdClass();
    $std->indPag = 0;
    $std->tPag = 1;
    $std->vPag = 42.8;
    $make->tagdetPag($std);
    echo "✅ Pagamento criado\n";

    echo "15. TESTANDO monta() com NFC-e completa...\n";
    flush();

    try {
        $xml = $make->monta();
        echo "🎉 SUCESSO! monta() funcionou com NFC-e completa!\n";
        echo "Tamanho XML: " . strlen($xml) . " bytes\n";
        echo "Preview: " . substr($xml, 0, 200) . "...\n";
    } catch (Exception $e) {
        echo "❌ ERRO no monta(): " . $e->getMessage() . "\n";
        echo "Arquivo: " . $e->getFile() . ":" . $e->getLine() . "\n";
        echo "Trace: " . substr($e->getTraceAsString(), 0, 500) . "\n";
    }
    
} catch (Exception $e) {
    echo "❌ ERRO GERAL: " . $e->getMessage() . "\n";
    echo "Arquivo: " . $e->getFile() . ":" . $e->getLine() . "\n";
}

echo "\n=== FIM DO TESTE ===\n";
?>
