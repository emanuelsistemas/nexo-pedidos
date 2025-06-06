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
    $requiredFields = ['empresa_id', 'chave_nfe', 'motivo'];
    foreach ($requiredFields as $field) {
        if (empty($input[$field])) {
            throw new Exception("Campo obrigatório não informado: {$field}");
        }
    }

    $empresaId = $input['empresa_id'];
    $chaveNFe = $input['chave_nfe'];
    $motivo = trim($input['motivo']);
    $nfeId = $input['nfe_id'] ?? null;

    // 3. Validar empresa_id (UUID)
    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $empresaId)) {
        throw new Exception('empresa_id inválido');
    }

    // 4. Validar chave NFe (44 dígitos)
    if (!preg_match('/^\d{44}$/', $chaveNFe)) {
        throw new Exception('Chave NFe inválida. Deve conter 44 dígitos.');
    }

    // 5. Validar motivo (mínimo 15 caracteres)
    if (strlen($motivo) < 15) {
        throw new Exception('Motivo deve ter pelo menos 15 caracteres');
    }

    // 6. Carregar certificado da empresa
    $certificadoPath = "../storage/certificados/empresa_{$empresaId}.pfx";
    $metadataPath = "../storage/certificados/empresa_{$empresaId}.json";
    
    if (!file_exists($certificadoPath) || !file_exists($metadataPath)) {
        throw new Exception('Certificado não encontrado para esta empresa');
    }
    
    $metadata = json_decode(file_get_contents($metadataPath), true);
    if (!$metadata) {
        throw new Exception('Metadados do certificado inválidos');
    }

    // 7. Carregar configuração da empresa do Supabase
    $configResponse = file_get_contents("http://localhost/backend/public/get-empresa-config.php?empresa_id={$empresaId}");
    $configData = json_decode($configResponse, true);
    
    if (!$configData || !$configData['success']) {
        throw new Exception('Erro ao carregar configuração da empresa: ' . ($configData['error'] ?? 'Erro desconhecido'));
    }

    $empresa = $configData['data']['empresa'];
    $nfeConfig = $configData['data']['nfe_config'];

    // 8. Configurar ambiente NFe
    $config = [
        "atualizacao" => date('Y-m-d H:i:s'),
        "tpAmb" => $nfeConfig['ambiente_codigo'], // 1=Produção, 2=Homologação
        "razaosocial" => $empresa['razao_social'],
        "cnpj" => preg_replace('/[^0-9]/', '', $empresa['cnpj']),
        "siglaUF" => $empresa['uf'],
        "schemes" => "PL_009_V4",
        "versao" => '4.00'
    ];

    // 9. Carregar certificado
    $certificadoContent = file_get_contents($certificadoPath);
    $senha = $metadata['password'] ?? '';

    // 10. Criar objeto Certificate
    $certificate = Certificate::readPfx($certificadoContent, $senha);

    // 11. Inicializar Tools da sped-nfe
    $tools = new Tools(json_encode($config), $certificate);
    $tools->model('55'); // Modelo NFe

    // 12. VERIFICAR SE NFe EXISTE NA SEFAZ ANTES DE CANCELAR
    error_log("🔍 VERIFICANDO NFe na SEFAZ antes do cancelamento:");
    error_log("  - Chave NFe: {$chaveNFe}");

    $consultaResponse = $tools->sefazConsultaChave($chaveNFe);
    error_log("🔍 Resposta consulta SEFAZ: " . $consultaResponse);

    $consultaXml = simplexml_load_string($consultaResponse);
    if (!$consultaXml) {
        throw new Exception('Erro ao consultar NFe na SEFAZ');
    }

    $consultaCstat = (string)$consultaXml->xpath('//cStat')[0] ?? '';
    $consultaMotivo = (string)$consultaXml->xpath('//xMotivo')[0] ?? '';

    // Verificar se NFe existe e está autorizada
    if ($consultaCstat !== '100') {
        error_log("❌ NFe não pode ser cancelada. Status SEFAZ: {$consultaCstat} - {$consultaMotivo}");

        // Mensagens específicas por status
        $mensagemEspecifica = '';
        switch ($consultaCstat) {
            case '217':
                $mensagemEspecifica = 'NFe não encontrada na base da SEFAZ. Verifique se a NFe foi realmente autorizada.';
                break;
            case '101':
                $mensagemEspecifica = 'NFe cancelada. Esta NFe já foi cancelada anteriormente.';
                break;
            case '110':
                $mensagemEspecifica = 'NFe denegada. NFes denegadas não podem ser canceladas.';
                break;
            default:
                $mensagemEspecifica = "Status SEFAZ: {$consultaCstat} - {$consultaMotivo}";
        }

        throw new Exception("NFe não pode ser cancelada. {$mensagemEspecifica}");
    }

    // Extrair protocolo real da SEFAZ
    $nProtReal = $consultaXml->xpath('//protNFe/infProt/nProt') ?:
                 $consultaXml->xpath('//infProt/nProt') ?:
                 $consultaXml->xpath('//nProt');

    $protocoloReal = !empty($nProtReal) ? (string)$nProtReal[0] : null;

    if (!$protocoloReal) {
        throw new Exception('Protocolo real não encontrado na consulta SEFAZ');
    }

    error_log("✅ NFe encontrada na SEFAZ. Protocolo real: {$protocoloReal}");

    // 13. Log de debug
    error_log("🚫 CANCELAMENTO NFe - Iniciando processo:");
    error_log("  - Empresa ID: {$empresaId}");
    error_log("  - Chave NFe: {$chaveNFe}");
    error_log("  - Motivo: {$motivo}");
    error_log("  - Protocolo Real: {$protocoloReal}");
    error_log("  - Ambiente: " . $nfeConfig['ambiente_codigo']);

    // 14. Executar cancelamento na SEFAZ com protocolo real
    $response = $tools->sefazCancela($chaveNFe, $motivo, $protocoloReal);
    
    error_log("🚫 Resposta SEFAZ: " . $response);

    // 15. Processar resposta da SEFAZ
    $xml = simplexml_load_string($response);
    if (!$xml) {
        throw new Exception('Resposta inválida da SEFAZ');
    }

    // Extrair informações da resposta
    $cStat = (string)$xml->xpath('//cStat')[0] ?? '';
    $xMotivo = (string)$xml->xpath('//xMotivo')[0] ?? '';
    $nProt = (string)$xml->xpath('//nProt')[0] ?? '';

    // 16. Verificar se cancelamento foi aceito
    if ($cStat !== '135') { // 135 = Evento registrado e vinculado a NFe
        throw new Exception("Cancelamento rejeitado pela SEFAZ. Código: {$cStat} - {$xMotivo}");
    }

    // 17. Atualizar status no banco local (se nfe_id foi fornecido)
    if ($nfeId) {
        // Aqui você pode implementar a atualização no Supabase
        // Por enquanto, vamos apenas logar
        error_log("🚫 NFe cancelada com sucesso. ID local: {$nfeId}");
    }

    // 18. Retornar sucesso
    echo json_encode([
        'success' => true,
        'message' => 'NFe cancelada com sucesso',
        'data' => [
            'chave_nfe' => $chaveNFe,
            'protocolo_cancelamento' => $nProt,
            'protocolo_original' => $protocoloReal,
            'motivo' => $motivo,
            'data_cancelamento' => date('Y-m-d H:i:s'),
            'codigo_status' => $cStat,
            'descricao_status' => $xMotivo,
            'ambiente' => $nfeConfig['ambiente']
        ],
        'response_sefaz' => $response
    ]);

} catch (Exception $e) {
    error_log("❌ ERRO no cancelamento NFe: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
