<?php
// Teste específico para debug do erro NFC-e
// Seguindo as 5 Leis Fundamentais

error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', '/tmp/nfce_debug_test.log');

function logDebug($message, $data = null) {
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[{$timestamp}] DEBUG: {$message}";
    if ($data !== null) {
        $logEntry .= " | " . json_encode($data, JSON_UNESCAPED_UNICODE);
    }
    
    error_log($logEntry);
    file_put_contents('/tmp/nfce_debug_test.log', $logEntry . "\n", FILE_APPEND | LOCK_EX);
    echo $logEntry . "\n";
    flush();
}

header('Content-Type: text/plain; charset=utf-8');

logDebug('Iniciando teste de debug NFC-e');

try {
    logDebug('Carregando dependências');
    require_once '../vendor/autoload.php';
    logDebug('Dependências carregadas');

    // Dados mínimos para teste
    $empresaId = 'acd26a4f-7220-405e-9c96-faffb7e6480e';
    
    logDebug('Buscando configurações da empresa');
    $configUrl = "http://localhost/backend/public/get-empresa-config.php?empresa_id={$empresaId}";
    
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
    
    $empresa = $configData['data']['empresa'];
    $nfeConfig = $configData['data']['nfe_config'];
    
    logDebug('Configurações carregadas', ['empresa' => $empresa['razao_social']]);
    
    // Carregar certificado
    $certificadoPath = "../storage/certificados/empresa_{$empresaId}.pfx";
    $metadataPath = "../storage/certificados/empresa_{$empresaId}.json";
    
    if (!file_exists($certificadoPath)) {
        throw new Exception('Certificado não encontrado');
    }
    
    $certificado = file_get_contents($certificadoPath);
    $metadata = json_decode(file_get_contents($metadataPath), true);
    
    logDebug('Certificado carregado');
    
    // Configurar biblioteca
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
    
    logDebug('Configuração montada');
    
    // Inicializar biblioteca
    $certificate = \NFePHP\Common\Certificate::readPfx($certificado, $metadata['password'] ?? '');
    $tools = new \NFePHP\NFe\Tools(json_encode($config), $certificate);
    $tools->model('65');
    $make = new \NFePHP\NFe\Make();
    
    logDebug('Biblioteca inicializada');
    
    // ✅ CORREÇÃO: Criar tag infNFe PRIMEIRO (igual à NFe que funciona)
    logDebug('Criando tag infNFe obrigatória');
    $std = new stdClass();
    $std->versao = '4.00';
    $std->Id = null;
    $std->pk_nItem = null;

    $make->taginfNFe($std);
    logDebug('Tag infNFe criada');

    // Criar tags mínimas para teste
    logDebug('Criando tag IDE');
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
    logDebug('Tag IDE criada');
    
    // Emitente
    logDebug('Criando emitente');
    $std = new stdClass();
    $std->xNome = $empresa['razao_social'];
    $std->CNPJ = $cnpjLimpo;
    $std->IE = $empresa['inscricao_estadual'];
    $std->CRT = (int)$empresa['regime_tributario'];
    
    $make->tagemit($std);
    logDebug('Emitente criado');
    
    // Endereço emitente
    logDebug('Criando endereço emitente');
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
    logDebug('Endereço emitente criado');
    
    logDebug('TESTE: Tentando monta() com tags mínimas');
    
    try {
        $xml = $make->monta();
        logDebug('SUCESSO: monta() executado com tags mínimas', ['tamanho_xml' => strlen($xml)]);
        echo "\n=== XML GERADO ===\n";
        echo substr($xml, 0, 500) . "...\n";
    } catch (Exception $e) {
        logDebug('ERRO no monta() com tags mínimas', [
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]);
        throw $e;
    }
    
} catch (Exception $e) {
    logDebug('ERRO FATAL', [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
    
    echo "\nERRO: " . $e->getMessage() . "\n";
    echo "Arquivo: " . $e->getFile() . ":" . $e->getLine() . "\n";
}

logDebug('Teste finalizado');
?>
