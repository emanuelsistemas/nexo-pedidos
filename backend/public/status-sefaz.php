<?php
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../vendor/autoload.php';

try {
    
    // Obter empresa_id (obrigatório para multi-tenant)
    $empresaId = $_GET['empresa_id'] ?? $_POST['empresa_id'] ?? null;
    
    if (!$empresaId) {
        throw new Exception('empresa_id é obrigatório');
    }
    
    // Validar formato UUID
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
    
    // Configuração básica para teste (usando dados mínimos)
    $config = [
        "atualizacao" => date('Y-m-d H:i:s'),
        "tpAmb" => 2, // Sempre homologação para teste de status
        "razaosocial" => "TESTE SEFAZ",
        "cnpj" => "11222333000181", // CNPJ genérico para teste
        "siglaUF" => "SP",
        "schemes" => "PL_009_V4",
        "versao" => '4.00'
    ];
    
    // Criar objeto Certificate
    $certificate = \NFePHP\Common\Certificate::readPfx($certificado, $metadata['password'] ?? '');

    // Inicializar Tools com certificado da empresa
    $tools = new \NFePHP\NFe\Tools(json_encode($config), $certificate);
    $tools->model('55'); // Modelo NFe
    
    // Consultar status do serviço SEFAZ
    // USANDO MÉTODO NATIVO DA BIBLIOTECA - NÃO ALTERANDO NADA FISCAL
    $response = $tools->sefazStatus();

    // Processar resposta nativa da biblioteca
    $xml = simplexml_load_string($response);

    if ($xml === false) {
        throw new Exception('Erro ao processar resposta da SEFAZ');
    }
    
    // Extrair informações usando estrutura nativa do XML
    $status = 'offline';
    $motivo = 'Serviço indisponível';
    $tempo_resposta = null;
    $codigo_status = null;

    // Registrar namespaces
    $xml->registerXPathNamespace('soap', 'http://www.w3.org/2003/05/soap-envelope');
    $xml->registerXPathNamespace('nfe', 'http://www.portalfiscal.inf.br/nfe');

    // Buscar elementos no XML (múltiplas tentativas de XPath)
    $cStat = $xml->xpath('//cStat') ?: $xml->xpath('//retConsStatServ/cStat') ?: $xml->xpath('//*[local-name()="cStat"]');
    $xMotivo = $xml->xpath('//xMotivo') ?: $xml->xpath('//retConsStatServ/xMotivo') ?: $xml->xpath('//*[local-name()="xMotivo"]');
    $dhRecbto = $xml->xpath('//dhRecbto') ?: $xml->xpath('//retConsStatServ/dhRecbto') ?: $xml->xpath('//*[local-name()="dhRecbto"]');

    if (!empty($cStat) && !empty($xMotivo)) {
        $codigo_status = (string)$cStat[0];
        $motivo = (string)$xMotivo[0];

        // Status 107 = Serviço em operação
        if ($codigo_status === '107') {
            $status = 'online';
        }

        if (!empty($dhRecbto)) {
            $tempo_resposta = (string)$dhRecbto[0];
        }
    }
    
    echo json_encode([
        'success' => true,
        'status' => $status,
        'motivo' => $motivo,
        'codigo_status' => $codigo_status ?? null,
        'tempo_resposta' => $tempo_resposta,
        'timestamp' => date('Y-m-d H:i:s'),
        'empresa_id' => $empresaId,
        'ambiente_teste' => 'homologacao'
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'status' => 'offline',
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
