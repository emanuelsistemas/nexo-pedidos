<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../vendor/autoload.php';

use NFePHP\NFe\Tools;
use NFePHP\Common\Certificate;

try {
    // 1. Validar método HTTP
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método não permitido. Use POST.');
    }

    // 2. Receber e validar dados de entrada
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Dados JSON inválidos');
    }

    // Validar campos obrigatórios
    $requiredFields = ['empresa_id', 'chave_nfe'];
    foreach ($requiredFields as $field) {
        if (empty($input[$field])) {
            throw new Exception("Campo obrigatório não informado: {$field}");
        }
    }

    $empresaId = $input['empresa_id'];
    $chaveNFe = $input['chave_nfe'];

    // 3. Validar empresa_id (UUID)
    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $empresaId)) {
        throw new Exception('empresa_id inválido');
    }

    // 4. Validar chave NFe (44 dígitos)
    if (!preg_match('/^\d{44}$/', $chaveNFe)) {
        throw new Exception('Chave NFe inválida. Deve conter 44 dígitos.');
    }

    // 5. Carregar certificado da empresa
    $certificadoPath = "../storage/certificados/empresa_{$empresaId}.pfx";
    $metadataPath = "../storage/certificados/empresa_{$empresaId}.json";
    
    if (!file_exists($certificadoPath) || !file_exists($metadataPath)) {
        throw new Exception('Certificado não encontrado para esta empresa');
    }
    
    $metadata = json_decode(file_get_contents($metadataPath), true);
    if (!$metadata) {
        throw new Exception('Metadados do certificado inválidos');
    }

    // 6. Carregar configuração da empresa do Supabase
    $configResponse = file_get_contents("http://localhost/backend/public/get-empresa-config.php?empresa_id={$empresaId}");
    $configData = json_decode($configResponse, true);
    
    if (!$configData || !$configData['success']) {
        throw new Exception('Erro ao carregar configuração da empresa: ' . ($configData['error'] ?? 'Erro desconhecido'));
    }

    $empresa = $configData['data']['empresa'];
    $nfeConfig = $configData['data']['nfe_config'];

    // 7. Configurar ambiente NFe
    $config = [
        "atualizacao" => date('Y-m-d H:i:s'),
        "tpAmb" => $nfeConfig['ambiente_codigo'], // 1=Produção, 2=Homologação
        "razaosocial" => $empresa['razao_social'],
        "cnpj" => preg_replace('/[^0-9]/', '', $empresa['cnpj']),
        "siglaUF" => $empresa['uf'],
        "schemes" => "PL_009_V4",
        "versao" => '4.00'
    ];

    // 8. Carregar certificado
    $certificadoContent = file_get_contents($certificadoPath);
    $senha = $metadata['password'] ?? '';

    // 9. Criar objeto Certificate
    $certificate = Certificate::readPfx($certificadoContent, $senha);

    // 10. Inicializar Tools da sped-nfe
    $tools = new Tools(json_encode($config), $certificate);
    $tools->model('55'); // Modelo NFe

    // 11. Log de debug
    error_log("🔍 CONSULTA NFe - Iniciando processo:");
    error_log("  - Empresa ID: {$empresaId}");
    error_log("  - Chave NFe: {$chaveNFe}");
    error_log("  - Ambiente: " . $nfeConfig['ambiente_codigo']);

    // 12. Executar consulta na SEFAZ
    $response = $tools->sefazConsultaChave($chaveNFe);
    
    error_log("🔍 Resposta SEFAZ: " . $response);

    // 13. Processar resposta da SEFAZ
    $xml = simplexml_load_string($response);
    if (!$xml) {
        throw new Exception('Resposta inválida da SEFAZ');
    }

    // Extrair informações da resposta
    $cStat = (string)$xml->xpath('//cStat')[0] ?? '';
    $xMotivo = (string)$xml->xpath('//xMotivo')[0] ?? '';
    
    // Extrair protocolo real da SEFAZ
    $nProt = $xml->xpath('//protNFe/infProt/nProt') ?:
             $xml->xpath('//infProt/nProt') ?:
             $xml->xpath('//nProt');
    
    $protocoloReal = !empty($nProt) ? (string)$nProt[0] : null;

    // 14. Verificar se NFe foi encontrada
    if ($cStat !== '100') { // 100 = Autorizado o uso da NFe
        error_log("⚠️ NFe não autorizada. Status: {$cStat} - {$xMotivo}");
    }

    // 15. Retornar resultado
    echo json_encode([
        'success' => true,
        'message' => 'Consulta realizada com sucesso',
        'data' => [
            'chave_nfe' => $chaveNFe,
            'protocolo_real' => $protocoloReal,
            'status_sefaz' => $cStat,
            'motivo_sefaz' => $xMotivo,
            'ambiente' => $nfeConfig['ambiente'],
            'data_consulta' => date('Y-m-d H:i:s')
        ],
        'response_sefaz' => $response
    ]);

} catch (Exception $e) {
    error_log("❌ ERRO na consulta NFe: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
