<?php
/**
 * Endpoint para inutilização de NFe
 * REPLICANDO EXATAMENTE O PADRÃO DA EMISSÃO
 * Seguindo as 5 Leis Fundamentais do projeto
 */

require_once '../vendor/autoload.php';
require_once '../src/Services/CertificateManager.php';

use NFePHP\NFe\Tools;
use NFePHP\Common\Certificate;
use Nexo\Services\CertificateManager;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    error_log("🚀 INUTILIZAÇÃO: Iniciando processo");

    // 1. Validar método HTTP
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método não permitido');
    }

    error_log("✅ INUTILIZAÇÃO: Método HTTP validado");

    // 2. Receber dados JSON
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data) {
        throw new Exception('Dados JSON inválidos');
    }

    // 3. Validar campos obrigatórios
    $requiredFields = ['empresa_id', 'serie', 'numero_inicial', 'numero_final', 'motivo'];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || $data[$field] === '') {
            throw new Exception("Campo obrigatório: {$field}");
        }
    }

    $empresaId = $data['empresa_id'];
    $serie = (int)$data['serie'];
    $numeroInicial = (int)$data['numero_inicial'];
    $numeroFinal = (int)$data['numero_final'];
    $motivo = trim($data['motivo']);

    // 4. Validações específicas
    if (strlen($motivo) < 15) {
        throw new Exception('Motivo deve ter pelo menos 15 caracteres');
    }

    if ($numeroInicial <= 0 || $numeroFinal <= 0) {
        throw new Exception('Números devem ser maiores que zero');
    }

    if ($numeroInicial > $numeroFinal) {
        throw new Exception('Número inicial não pode ser maior que final');
    }

    // 5. Carregar configuração da empresa (EXATAMENTE COMO NO CANCELAMENTO)
    $configResponse = file_get_contents("http://localhost/backend/public/get-empresa-config.php?empresa_id={$empresaId}");
    $configData = json_decode($configResponse, true);

    if (!$configData || !$configData['success']) {
        throw new Exception('Erro ao carregar configuração da empresa: ' . ($configData['error'] ?? 'Erro desconhecido'));
    }

    $empresa = $configData['data']['empresa'];
    $nfeConfig = $configData['data']['nfe_config'];

    // 6. Carregar certificado da empresa (EXATAMENTE COMO NO CANCELAMENTO)
    $certificadoPath = "../storage/certificados/empresa_{$empresaId}.pfx";
    $metadataPath = "../storage/certificados/empresa_{$empresaId}.json";

    if (!file_exists($certificadoPath) || !file_exists($metadataPath)) {
        throw new Exception('Certificado não encontrado para esta empresa');
    }

    $metadata = json_decode(file_get_contents($metadataPath), true);
    if (!$metadata) {
        throw new Exception('Metadados do certificado inválidos');
    }

    // 7. Configurar ambiente NFe (EXATAMENTE COMO NO CANCELAMENTO)
    $cnpjLimpo = preg_replace('/[^0-9]/', '', $empresa['cnpj']);
    if (strlen($cnpjLimpo) !== 14) {
        throw new Exception('CNPJ da empresa deve ter 14 dígitos');
    }

    $config = [
        'atualizacao' => date('Y-m-d H:i:s'),
        'tpAmb' => $nfeConfig['ambiente_codigo'], // 1=Produção, 2=Homologação
        'razaosocial' => $empresa['razao_social'],
        'cnpj' => $cnpjLimpo, // ✅ CNPJ limpo sem pontuação
        'siglaUF' => $empresa['uf'],
        'schemes' => 'PL_009_V4',
        'versao' => '4.00'
    ];

    // 8. Criar objeto Certificate (EXATAMENTE COMO NO CANCELAMENTO)
    $certificate = Certificate::readPfx(file_get_contents($certificadoPath), $metadata['password'] ?? '');

    // 9. Inicializar Tools (EXATAMENTE COMO NO CANCELAMENTO)
    $tools = new Tools(json_encode($config), $certificate);
    $tools->model('55'); // Modelo NFe

    // 11. Executar inutilização na SEFAZ (MÉTODO OFICIAL)
    error_log("🚫 Executando inutilização na SEFAZ...");
    error_log("  - Série: {$serie}");
    error_log("  - Número inicial: {$numeroInicial}");
    error_log("  - Número final: {$numeroFinal}");
    error_log("  - Motivo: {$motivo}");

    $response = $tools->sefazInutiliza($serie, $numeroInicial, $numeroFinal, $motivo);

    error_log("📋 Resposta SEFAZ: " . $response);

    // 12. Processar resposta da SEFAZ (EXATAMENTE COMO NO CANCELAMENTO)
    $xml = false;

    // Tentar processar XML direto
    $xml = @simplexml_load_string($response);

    // Se falhou, extrair conteúdo do envelope SOAP
    if (!$xml) {
        if (preg_match('/<retInutNFe[^>]*>.*?<\/retInutNFe>/s', $response, $xmlMatch)) {
            $xmlLimpo = $xmlMatch[0];
            $xml = @simplexml_load_string($xmlLimpo);
            error_log("✅ XML Inutilização extraído do envelope SOAP");
        }
    }

    if (!$xml) {
        error_log("❌ ERRO: Não foi possível processar resposta da SEFAZ");
        error_log("📋 Resposta recebida (primeiros 500 chars): " . substr($response, 0, 500));
        throw new Exception('Resposta inválida da SEFAZ');
    }

    // 13. Extrair informações da resposta usando XPath robusto (IGUAL AO CANCELAMENTO)
    $cStatArray = $xml->xpath('//cStat') ?: $xml->xpath('//*[local-name()="cStat"]');
    $xMotivoArray = $xml->xpath('//xMotivo') ?: $xml->xpath('//*[local-name()="xMotivo"]');
    $nProtArray = $xml->xpath('//nProt') ?: $xml->xpath('//*[local-name()="nProt"]');
    $dhRecbtoArray = $xml->xpath('//dhRecbto') ?: $xml->xpath('//*[local-name()="dhRecbto"]');

    $cStat = !empty($cStatArray) ? (string)$cStatArray[0] : '';
    $xMotivo = !empty($xMotivoArray) ? (string)$xMotivoArray[0] : '';
    $nProt = !empty($nProtArray) ? (string)$nProtArray[0] : '';
    $dhRecbto = !empty($dhRecbtoArray) ? (string)$dhRecbtoArray[0] : '';

    error_log("Status SEFAZ: {$cStat} - {$xMotivo}");

    // 14. Verificar se inutilização foi aceita (status 102)
    if ($cStat !== '102') {
        throw new Exception("Erro na inutilização: {$cStat} - {$xMotivo}");
    }

    // 15. Salvar XML de inutilização (EXATAMENTE COMO NO CANCELAMENTO)
    $ambienteTexto = $nfeConfig['ambiente_codigo'] == 1 ? 'producao' : 'homologacao';
    $modelo = '55'; // NFe por padrão, futuramente será dinâmico para NFCe
    $xmlInutDir = "../storage/xml/empresa_{$empresaId}/{$ambienteTexto}/{$modelo}/Inutilizados/" . date('Y/m');

    if (!is_dir($xmlInutDir)) {
        mkdir($xmlInutDir, 0755, true);
        error_log("📁 Diretório de NFes inutilizadas criado: {$xmlInutDir}");
    }

    // Nome do arquivo: inut_serie_numeroInicial_numeroFinal_timestamp.xml
    $nomeArquivoInut = "inut_{$serie}_{$numeroInicial}_{$numeroFinal}_" . date('YmdHis') . ".xml";
    $xmlPath = $xmlInutDir . '/' . $nomeArquivoInut;

    // Salvar XML completo de inutilização (resposta da SEFAZ)
    file_put_contents($xmlPath, $response);
    error_log("💾 XML de inutilização salvo: {$xmlPath}");

    // 16. Atualizar status no banco (SE NFE_ID FOI FORNECIDO)
    if (isset($data['nfe_id']) && !empty($data['nfe_id'])) {
        $updateData = [
            'status_nfe' => 'inutilizada',
            'inutilizada_em' => date('c'),
            'motivo_inutilizacao' => $motivo,
            'protocolo_inutilizacao' => $nProt,
            'updated_at' => date('c')
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $supabaseUrl . '/rest/v1/pdv?id=eq.' . $data['nfe_id']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $supabaseKey,
            'apikey: ' . $supabaseKey,
            'Prefer: return=minimal'
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($updateData));

        $updateResponse = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 204) {
            error_log("⚠️ Erro ao atualizar status no banco: " . $updateResponse);
        }
    }

    // 17. Retornar sucesso
    echo json_encode([
        'success' => true,
        'protocolo' => $nProt,
        'data_inutilizacao' => $dhRecbto,
        'cstat' => $cStat,
        'motivo_sefaz' => $xMotivo,
        'xml_path' => $xmlPath,
        'message' => 'NFe inutilizada com sucesso na SEFAZ'
    ]);

} catch (Exception $e) {
    error_log("❌ Erro na inutilização: " . $e->getMessage());
    error_log("❌ Stack trace: " . $e->getTraceAsString());

    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?>
