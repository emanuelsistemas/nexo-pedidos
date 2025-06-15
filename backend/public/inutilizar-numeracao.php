<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Carregar autoload primeiro
require_once '../vendor/autoload.php';

use NFePHP\NFe\Tools;
use NFePHP\Common\Certificate;
use NFePHP\NFe\Common\Standardize;

// Tratar requisições OPTIONS (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Verificar se é POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método não permitido']);
    exit();
}

try {
    // Log de início
    error_log("🚀 INICIANDO INUTILIZAÇÃO DE NUMERAÇÃO...");
    error_log("🔍 PHP Version: " . PHP_VERSION);
    error_log("🔍 Working Directory: " . getcwd());
    error_log("🔍 Autoload exists: " . (file_exists('../vendor/autoload.php') ? 'YES' : 'NO'));

    // Ler dados da requisição
    $input = file_get_contents('php://input');
    error_log("🔍 Input recebido: " . $input);
    $data = json_decode($input, true);
    error_log("🔍 JSON decoded: " . ($data ? 'SUCCESS' : 'FAILED'));
    
    if (!$data) {
        throw new Exception('Dados inválidos recebidos');
    }
    
    // Validar campos obrigatórios
    $requiredFields = ['empresa_id', 'modelo_documento', 'ambiente', 'serie', 'numero_inicial', 'numero_final', 'justificativa'];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || $data[$field] === '') {
            throw new Exception("Campo obrigatório ausente: {$field}");
        }
    }
    
    $empresaId = $data['empresa_id'];
    $modeloDocumento = (int)$data['modelo_documento'];
    $ambienteSelecionado = (int)$data['ambiente']; // Ambiente selecionado pelo usuário
    $serie = (int)$data['serie'];
    $numeroInicial = (int)$data['numero_inicial'];
    $numeroFinal = (int)$data['numero_final'];
    $justificativa = trim($data['justificativa']);
    
    // Validações
    if (!in_array($modeloDocumento, [55, 65])) {
        throw new Exception('Modelo de documento inválido. Use 55 (NFe) ou 65 (NFC-e)');
    }

    if (!in_array($ambienteSelecionado, [1, 2])) {
        throw new Exception('Ambiente inválido. Use 1 (Produção) ou 2 (Homologação)');
    }
    
    if ($serie < 1) {
        throw new Exception('Série deve ser maior que zero');
    }
    
    if ($numeroInicial < 1 || $numeroFinal < 1) {
        throw new Exception('Números devem ser maiores que zero');
    }
    
    if ($numeroInicial > $numeroFinal) {
        throw new Exception('Número inicial deve ser menor ou igual ao final');
    }
    
    if (strlen($justificativa) < 15) {
        throw new Exception('Justificativa deve ter pelo menos 15 caracteres');
    }
    
    error_log("📋 Dados validados: Empresa={$empresaId}, Modelo={$modeloDocumento}, Ambiente={$ambienteSelecionado}, Série={$serie}, Range={$numeroInicial}-{$numeroFinal}");
    
    // Configuração Supabase
    $supabaseUrl = 'https://xsrirnfwsjeovekwtluz.supabase.co';
    $supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcmlybmZ3c2plb3Zla3d0bHV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjY2NDk5NywiZXhwIjoyMDYyMjQwOTk3fQ.UC2DvFRcfrNUbRrnQhrpqsX_hJXBLy9g-YVZbpaTcso';
    
    // Buscar dados da empresa
    $empresaUrl = "{$supabaseUrl}/rest/v1/empresas?id=eq.{$empresaId}&select=*";
    $empresaContext = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                "Authorization: Bearer {$supabaseKey}",
                "apikey: {$supabaseKey}",
                "Content-Type: application/json"
            ]
        ]
    ]);
    
    $empresaResponse = file_get_contents($empresaUrl, false, $empresaContext);
    if ($empresaResponse === false) {
        throw new Exception('Erro ao buscar dados da empresa');
    }
    
    $empresaData = json_decode($empresaResponse, true);
    if (empty($empresaData)) {
        throw new Exception('Empresa não encontrada');
    }
    
    $empresa = $empresaData[0];
    error_log("🏢 Empresa encontrada: {$empresa['razao_social']}");
    
    // Buscar configuração NFe
    $nfeConfigUrl = "{$supabaseUrl}/rest/v1/nfe_config?empresa_id=eq.{$empresaId}&select=*";
    $nfeConfigContext = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                "Authorization: Bearer {$supabaseKey}",
                "apikey: {$supabaseKey}",
                "Content-Type: application/json"
            ]
        ]
    ]);
    
    $nfeConfigResponse = file_get_contents($nfeConfigUrl, false, $nfeConfigContext);
    if ($nfeConfigResponse === false) {
        throw new Exception('Erro ao buscar configuração NFe');
    }
    
    $nfeConfigData = json_decode($nfeConfigResponse, true);
    if (empty($nfeConfigData)) {
        throw new Exception('Configuração NFe não encontrada');
    }
    
    $nfeConfig = $nfeConfigData[0];
    error_log("⚙️ Configuração NFe carregada - Ambiente: {$nfeConfig['ambiente']}");
    
    // Preparar dados para inutilização via sped-nfe
    error_log("✅ Autoload já carregado, iniciando configuração...");
    
    // 4. Carregar certificado (EXATAMENTE COMO NO NFE-V2)
    $certificadoPath = "../storage/certificados/empresa_{$empresaId}.pfx";
    if (!file_exists($certificadoPath)) {
        throw new Exception('Certificado digital não encontrado: ' . $certificadoPath);
    }

    error_log("📜 Certificado encontrado: {$certificadoPath}");

    // 5. Carregar metadados do certificado
    $metadataPath = "../storage/certificados/empresa_{$empresaId}.json";
    $metadata = [];
    if (file_exists($metadataPath)) {
        $metadata = json_decode(file_get_contents($metadataPath), true) ?: [];
        error_log("📋 Metadados do certificado carregados");
    }

    // 6. Criar objeto Certificate (EXATAMENTE COMO NO NFE-V2)
    $certificate = Certificate::readPfx(file_get_contents($certificadoPath), $metadata['password'] ?? '');
    
    // 7. Configurar Tools usando AMBIENTE SELECIONADO PELO USUÁRIO
    $config = [
        "atualizacao" => date('Y-m-d H:i:s'),
        "tpAmb" => $ambienteSelecionado, // Usar ambiente selecionado pelo usuário
        "razaosocial" => $empresa['razao_social'],
        "cnpj" => preg_replace('/\D/', '', $empresa['documento']), // Usar 'documento' e limpar formatação
        "siglaUF" => $empresa['estado'], // Usar 'estado' em vez de 'uf'
        "schemes" => "PL_009_V4",
        "versao" => '4.00',
        "tokenIBPT" => "",
        "CSC" => $ambienteSelecionado == 1 ? $nfeConfig['csc_producao'] : $nfeConfig['csc_homologacao'],
        "CSCid" => $ambienteSelecionado == 1 ? $nfeConfig['csc_id_producao'] : $nfeConfig['csc_id_homologacao']
    ];

    error_log("⚙️ Configuração preparada para ambiente SELECIONADO: {$ambienteSelecionado} (1=Produção, 2=Homologação)");

    // 8. Inicializar Tools (EXATAMENTE COMO NO NFE-V2)
    $tools = new Tools(json_encode($config), $certificate);
    $tools->model($modeloDocumento); // Configurar modelo (55=NFe, 65=NFC-e)

    error_log("🔧 Tools configurado para modelo {$modeloDocumento}");
    
    // 9. Executar inutilização na SEFAZ (MÉTODO OFICIAL)
    error_log("🚫 Executando inutilização na SEFAZ...");
    error_log("  - Modelo: {$modeloDocumento}");
    error_log("  - Série: {$serie}");
    error_log("  - Número inicial: {$numeroInicial}");
    error_log("  - Número final: {$numeroFinal}");
    error_log("  - Justificativa: {$justificativa}");

    $response = $tools->sefazInutiliza($serie, $numeroInicial, $numeroFinal, $justificativa);

    if (!$response) {
        throw new Exception('Erro na comunicação com a SEFAZ');
    }

    error_log("📋 Resposta SEFAZ: " . $response);

    // 10. Processar resposta da SEFAZ (EXATAMENTE COMO NO NFE-V2)
    $xml = @simplexml_load_string($response);

    // Se não conseguir carregar diretamente, tentar extrair do envelope SOAP
    if (!$xml && strpos($response, 'soap:') !== false) {
        error_log("🔍 Tentando extrair XML do envelope SOAP...");
        $xmlLimpo = preg_replace('/.*?(<retInutNFe.*?<\/retInutNFe>).*/s', '$1', $response);
        if ($xmlLimpo !== $response) {
            $xml = @simplexml_load_string($xmlLimpo);
            error_log("✅ XML Inutilização extraído do envelope SOAP");
        }
    }

    if (!$xml) {
        error_log("❌ ERRO: Não foi possível processar resposta da SEFAZ");
        error_log("📋 Resposta recebida (primeiros 500 chars): " . substr($response, 0, 500));
        throw new Exception('Resposta inválida da SEFAZ');
    }

    // 11. Extrair informações da resposta usando XPath robusto (IGUAL AO NFE-V2)
    $cStatArray = $xml->xpath('//cStat') ?: $xml->xpath('//*[local-name()="cStat"]');
    $xMotivoArray = $xml->xpath('//xMotivo') ?: $xml->xpath('//*[local-name()="xMotivo"]');
    $nProtArray = $xml->xpath('//nProt') ?: $xml->xpath('//*[local-name()="nProt"]');
    $dhRecbtoArray = $xml->xpath('//dhRecbto') ?: $xml->xpath('//*[local-name()="dhRecbto"]');

    $cStat = !empty($cStatArray) ? (string)$cStatArray[0] : '';
    $xMotivo = !empty($xMotivoArray) ? (string)$xMotivoArray[0] : '';
    $protocolo = !empty($nProtArray) ? (string)$nProtArray[0] : '';
    $dhRecbto = !empty($dhRecbtoArray) ? (string)$dhRecbtoArray[0] : '';

    error_log("📊 Status SEFAZ: {$cStat} - {$xMotivo}");
    
    // Verificar se inutilização foi aceita (status 102)
    if ($cStat !== '102') {
        throw new Exception("Erro na inutilização: {$cStat} - {$xMotivo}");
    }
    
    // Salvar XML de inutilização usando AMBIENTE SELECIONADO
    $ambienteTexto = $ambienteSelecionado == 1 ? 'producao' : 'homologacao';
    $modeloTexto = $modeloDocumento == 55 ? '55' : '65';
    $xmlInutDir = "../storage/xml/empresa_{$empresaId}/{$ambienteTexto}/{$modeloTexto}/Inutilizados/" . date('Y/m');
    
    if (!is_dir($xmlInutDir)) {
        mkdir($xmlInutDir, 0755, true);
        error_log("📁 Diretório de inutilizações criado: {$xmlInutDir}");
    }
    
    $xmlFileName = "inut_{$serie}_{$numeroInicial}_{$numeroFinal}_" . date('YmdHis') . ".xml";
    $xmlFilePath = "{$xmlInutDir}/{$xmlFileName}";
    
    if (file_put_contents($xmlFilePath, $response) === false) {
        error_log("⚠️ Erro ao salvar XML de inutilização: {$xmlFilePath}");
    } else {
        error_log("💾 XML de inutilização salvo: {$xmlFilePath}");
    }
    
    // Salvar no banco de dados
    $inutilizacaoData = [
        'empresa_id' => $empresaId,
        'modelo_documento' => $modeloDocumento,
        'serie' => $serie,
        'numero_inicial' => $numeroInicial,
        'numero_final' => $numeroFinal,
        'justificativa' => $justificativa,
        'protocolo' => $protocolo,
        'ambiente' => $ambienteSelecionado, // Ambiente selecionado pelo usuário
        'data_inutilizacao' => date('c')
    ];
    
    $insertUrl = "{$supabaseUrl}/rest/v1/inutilizacoes";
    $insertContext = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => [
                "Authorization: Bearer {$supabaseKey}",
                "apikey: {$supabaseKey}",
                "Content-Type: application/json",
                "Prefer: return=minimal"
            ],
            'content' => json_encode($inutilizacaoData)
        ]
    ]);
    
    $insertResponse = file_get_contents($insertUrl, false, $insertContext);
    if ($insertResponse === false) {
        error_log("⚠️ Erro ao salvar inutilização no banco, mas SEFAZ foi processada com sucesso");
    } else {
        error_log("💾 Inutilização salva no banco de dados");
    }
    
    // Resposta de sucesso
    $result = [
        'success' => true,
        'message' => 'Numeração inutilizada com sucesso',
        'data' => [
            'protocolo' => $protocolo,
            'status' => $cStat,
            'motivo' => $xMotivo,
            'modelo_documento' => $modeloDocumento,
            'serie' => $serie,
            'numero_inicial' => $numeroInicial,
            'numero_final' => $numeroFinal,
            'data_inutilizacao' => date('c')
        ]
    ];
    
    error_log("✅ INUTILIZAÇÃO CONCLUÍDA COM SUCESSO - Protocolo: {$protocolo}");
    
    echo json_encode($result);
    
} catch (Exception $e) {
    error_log("❌ ERRO NA INUTILIZAÇÃO: " . $e->getMessage());
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'error_type' => 'inutilizacao_error',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
} catch (Throwable $e) {
    error_log("💥 ERRO FATAL NA INUTILIZAÇÃO: " . $e->getMessage());
    error_log("💥 STACK TRACE: " . $e->getTraceAsString());
    error_log("💥 ARQUIVO: " . $e->getFile() . " LINHA: " . $e->getLine());

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro interno do servidor: ' . $e->getMessage(),
        'error_type' => 'fatal_error',
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
