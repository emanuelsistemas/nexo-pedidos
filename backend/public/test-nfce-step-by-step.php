<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('max_execution_time', 30);

echo "=== TESTE NFC-e PASSO A PASSO ===\n";

try {
    // Simular dados de entrada
    $input = [
        'empresa_id' => 'acd26a4f-7220-405e-9c96-faffb7e6480e',
        'nfce_data' => [
            'identificacao' => [
                'numero' => 1,
                'serie' => 1,
                'codigo_numerico' => '19506401',
                'natureza_operacao' => 'Venda de mercadoria'
            ],
            'destinatario' => [],
            'produtos' => [[
                'codigo' => '1',
                'descricao' => 'SKOL LATA 350ml',
                'quantidade' => 1,
                'valor_unitario' => 42.8,
                'unidade' => 'UN',
                'ncm' => '22030000',
                'cfop' => '5102',
                'codigo_barras' => '7891991010023'
            ]]
        ]
    ];

    echo "1. ✅ Dados de entrada preparados\n";

    // Passo 1: Buscar configurações
    echo "2. Buscando configurações da empresa...\n";
    $configUrl = "http://localhost/backend/public/get-empresa-config.php?empresa_id={$input['empresa_id']}";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $configUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $configResponse = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        throw new Exception("Erro HTTP: {$httpCode}");
    }
    
    $configData = json_decode($configResponse, true);
    if (!$configData || !$configData['success']) {
        throw new Exception('Configurações inválidas');
    }
    
    echo "2. ✅ Configurações carregadas\n";
    
    $empresa = $configData['data']['empresa'];
    $nfeConfig = $configData['data']['nfe_config'];
    
    // Passo 2: Carregar certificado
    echo "3. Carregando certificado...\n";
    $certificadoPath = "../storage/certificados/empresa_{$input['empresa_id']}.pfx";
    $metadataPath = "../storage/certificados/empresa_{$input['empresa_id']}.json";
    
    if (!file_exists($certificadoPath)) {
        throw new Exception('Certificado não encontrado');
    }
    
    if (!file_exists($metadataPath)) {
        throw new Exception('Metadata não encontrado');
    }
    
    $certificado = file_get_contents($certificadoPath);
    $metadata = json_decode(file_get_contents($metadataPath), true);
    
    echo "3. ✅ Certificado carregado\n";
    
    // Passo 3: Configurar biblioteca
    echo "4. Configurando biblioteca sped-nfe...\n";
    require_once '../vendor/autoload.php';
    
    $ambiente = $nfeConfig['ambiente_codigo'];
    $cnpjLimpo = preg_replace('/[^0-9]/', '', $empresa['cnpj']);
    $cscField = $ambiente == 1 ? 'csc_producao' : 'csc_homologacao';
    $cscIdField = $ambiente == 1 ? 'csc_id_producao' : 'csc_id_homologacao';
    
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
    
    echo "4. ✅ Configuração preparada\n";
    
    // Passo 4: Criar objetos
    echo "5. Criando objetos da biblioteca...\n";
    
    $certificate = \NFePHP\Common\Certificate::readPfx($certificado, $metadata['password'] ?? '');
    echo "5.1 ✅ Certificate criado\n";
    
    $tools = new \NFePHP\NFe\Tools(json_encode($config), $certificate);
    $tools->model('65');
    echo "5.2 ✅ Tools criado\n";
    
    $make = new \NFePHP\NFe\Make();
    echo "5.3 ✅ Make criado\n";
    
    // Passo 5: Criar tags básicas
    echo "6. Criando tags básicas...\n";
    
    // IDE
    $std = new stdClass();
    $std->cUF = (int)$empresa['codigo_uf'];
    $std->cNF = str_pad($input['nfce_data']['identificacao']['codigo_numerico'], 8, '0', STR_PAD_LEFT);
    $std->natOp = $input['nfce_data']['identificacao']['natureza_operacao'];
    $std->mod = 65;
    $std->serie = (int)$input['nfce_data']['identificacao']['serie'];
    $std->nNF = (int)$input['nfce_data']['identificacao']['numero'];
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
    echo "6.1 ✅ IDE criada\n";
    
    // Emitente
    $std = new stdClass();
    $std->xNome = $empresa['razao_social'];
    $std->CNPJ = $cnpjLimpo;
    $std->xFant = $empresa['nome_fantasia'] ?? null;
    $std->IE = $empresa['inscricao_estadual'];
    $std->CRT = (int)$empresa['regime_tributario'];
    
    $make->tagemit($std);
    echo "6.2 ✅ Emitente criado\n";
    
    echo "\n=== TESTE CONCLUÍDO ATÉ AQUI ===\n";
    echo "Próximo passo seria criar produtos e impostos...\n";
    
} catch (Exception $e) {
    echo "❌ ERRO: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}
?>
