<?php
/**
 * CANCELAMENTO DE NFC-e (MODELO 65)
 *
 * Seguindo as 5 LEIS FUNDAMENTAIS do sistema NFe:
 * 1. LEI DOS DADOS REAIS - Usar apenas dados reais da SEFAZ
 * 2. LEI DA BIBLIOTECA SAGRADA - Usar métodos oficiais da sped-nfe
 * 3. LEI DA AUTENTICIDADE - Processos reais de cancelamento
 * 4. LEI DA EXCELÊNCIA - Implementação correta sem contornos
 * 5. LEI DA DOCUMENTAÇÃO OFICIAL - Seguir documentação oficial
 *
 * DOCUMENTAÇÃO OFICIAL:
 * https://github.com/nfephp-org/sped-nfe/blob/master/docs/metodos/Cancelamento.md
 *
 * PRAZO ESPECÍFICO NFC-e: 15 MINUTOS (diferente da NFe que é 24h)
 */

// Carregar dependências
require_once '../vendor/autoload.php';

use NFePHP\NFe\Tools;
use NFePHP\Common\Certificate;
use NFePHP\NFe\Common\Standardize;
use NFePHP\NFe\Complements;

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método não permitido']);
    exit;
}

// Função de log detalhado
function logDetalhado($codigo, $descricao, $dados = []) {
    $timestamp = date('Y-m-d H:i:s.u');
    $logEntry = [
        'timestamp' => $timestamp,
        'codigo' => $codigo,
        'descricao' => $descricao,
        'dados' => $dados
    ];
    
    $logLine = json_encode($logEntry, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n";
    file_put_contents('/tmp/nfce_cancelamento.log', $logLine, FILE_APPEND | LOCK_EX);
    error_log("🚫 NFCE CANCELAMENTO [{$codigo}]: {$descricao}");
}

try {
    // Capturar dados de entrada
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    logDetalhado('INICIO', 'Iniciando cancelamento de NFC-e', [
        'input_recebido' => $data
    ]);

    // Validar dados obrigatórios
    if (!$data || !isset($data['chave_nfe']) || !isset($data['motivo']) || !isset($data['protocolo_nfe'])) {
        throw new Exception('Dados obrigatórios não fornecidos: chave_nfe, motivo, protocolo_nfe');
    }

    $chaveNFCe = $data['chave_nfe'];
    $motivo = trim($data['motivo']);
    $protocoloNFCe = $data['protocolo_nfe'];
    $empresaId = $data['empresa_id'] ?? null;

    // Validar chave da NFC-e (44 dígitos)
    if (!preg_match('/^\d{44}$/', $chaveNFCe)) {
        throw new Exception('Chave da NFC-e inválida. Deve conter 44 dígitos numéricos.');
    }

    // Validar motivo (mínimo 15 caracteres conforme SEFAZ)
    if (strlen($motivo) < 15) {
        throw new Exception('Motivo deve ter pelo menos 15 caracteres');
    }

    // Validar protocolo (15 dígitos)
    if (!preg_match('/^\d{15}$/', $protocoloNFCe)) {
        throw new Exception('Protocolo da NFC-e inválido. Deve conter 15 dígitos numéricos.');
    }

    logDetalhado('VALIDACAO', 'Dados validados com sucesso', [
        'chave' => $chaveNFCe,
        'protocolo' => $protocoloNFCe,
        'motivo_length' => strlen($motivo)
    ]);

    // Dependências já carregadas no topo do arquivo

    // Configuração Supabase
    $supabaseUrl = 'https://xsrirnfwsjeovekwtluz.supabase.co';
    $supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcmlybmZ3c2plb3Zla3d0bHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMzMzk5NzEsImV4cCI6MjA0ODkxNTk3MX0.VmyrqjgFO8nT_Lqzq0_HQmJnKQiIkTtClQUEWdxwP5s';

    // Buscar configuração da empresa
    if (!$empresaId) {
        throw new Exception('ID da empresa não fornecido');
    }

    $empresaQuery = $supabaseUrl . '/rest/v1/empresas?id=eq.' . $empresaId;
    $empresaContext = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                'apikey: ' . $supabaseKey,
                'Authorization: Bearer ' . $supabaseKey
            ]
        ]
    ]);

    $empresaResponse = file_get_contents($empresaQuery, false, $empresaContext);
    $empresaData = json_decode($empresaResponse, true);

    if (empty($empresaData)) {
        throw new Exception('Empresa não encontrada');
    }

    $empresa = $empresaData[0];
    logDetalhado('EMPRESA', 'Empresa carregada', ['empresa_id' => $empresaId]);

    // Carregar configuração NFe da empresa
    $nfeConfig = json_decode($empresa['config_nfe'] ?? '{}', true);
    if (empty($nfeConfig)) {
        throw new Exception('Configuração NFe não encontrada para a empresa');
    }

    // Preparar configuração para Tools
    $config = [
        'atualizacao' => date('Y-m-d H:i:s'),
        'tpAmb' => $nfeConfig['ambiente_codigo'] ?? 2,
        'razaosocial' => $empresa['razao_social'],
        'cnpj' => preg_replace('/\D/', '', $empresa['cnpj']),
        'siglaUF' => $empresa['uf'],
        'schemes' => 'PL_009_V4',
        'versao' => '4.00',
        'tokenIBPT' => '',
        'CSC' => $nfeConfig['csc'] ?? '',
        'CSCid' => $nfeConfig['csc_id'] ?? '1'
    ];

    logDetalhado('CONFIG', 'Configuração preparada', [
        'ambiente' => $config['tpAmb'],
        'uf' => $config['siglaUF']
    ]);

    // Carregar certificado
    $certificadoPath = "/root/nexo-pedidos/backend/storage/certificados/empresa_{$empresaId}/certificado.pfx";
    
    if (!file_exists($certificadoPath)) {
        throw new Exception('Certificado digital não encontrado');
    }

    $certificadoContent = file_get_contents($certificadoPath);
    $metadataPath = "/root/nexo-pedidos/backend/storage/certificados/empresa_{$empresaId}/metadata.json";
    
    if (!file_exists($metadataPath)) {
        throw new Exception('Metadados do certificado não encontrados');
    }

    $metadata = json_decode(file_get_contents($metadataPath), true);
    $senha = $metadata['password'] ?? '';

    // Criar objeto Certificate
    $certificate = Certificate::readPfx($certificadoContent, $senha);
    logDetalhado('CERTIFICADO', 'Certificado carregado com sucesso');

    // ✅ SEGUINDO DOCUMENTAÇÃO OFICIAL: Inicializar Tools
    $tools = new Tools(json_encode($config), $certificate);
    $tools->model('65'); // ✅ IMPORTANTE: Modelo 65 para NFC-e

    logDetalhado('TOOLS', 'Tools inicializada para NFC-e modelo 65');

    // ✅ SEGUINDO DOCUMENTAÇÃO OFICIAL: Executar cancelamento
    logDetalhado('CANCELAMENTO', 'Executando cancelamento na SEFAZ', [
        'chave' => $chaveNFCe,
        'protocolo' => $protocoloNFCe,
        'motivo' => $motivo
    ]);

    $response = $tools->sefazCancela($chaveNFCe, $motivo, $protocoloNFCe);
    
    logDetalhado('SEFAZ_RESPONSE', 'Resposta da SEFAZ recebida', [
        'response_length' => strlen($response)
    ]);

    // ✅ SEGUINDO DOCUMENTAÇÃO OFICIAL: Processar resposta
    $stdCl = new Standardize($response);
    $std = $stdCl->toStd();

    logDetalhado('STANDARDIZE', 'Resposta processada', [
        'cStat_lote' => $std->cStat ?? 'N/A',
        'xMotivo_lote' => $std->xMotivo ?? 'N/A'
    ]);

    // Verificar se o lote foi processado (128 = Lote de Evento Processado)
    if ($std->cStat != 128) {
        throw new Exception("Falha no processamento do lote: {$std->cStat} - {$std->xMotivo}");
    }

    // Verificar status do evento de cancelamento
    $cStatEvento = $std->retEvento->infEvento->cStat ?? '';
    $xMotivoEvento = $std->retEvento->infEvento->xMotivo ?? '';
    $nProtCancelamento = $std->retEvento->infEvento->nProt ?? '';

    logDetalhado('EVENTO', 'Status do evento de cancelamento', [
        'cStat' => $cStatEvento,
        'xMotivo' => $xMotivoEvento,
        'nProt' => $nProtCancelamento
    ]);

    // ✅ SEGUINDO DOCUMENTAÇÃO OFICIAL: Verificar códigos de sucesso
    // 101 = Cancelamento homologado
    // 135 = Evento registrado e vinculado a NF-e  
    // 155 = Cancelamento homologado fora de prazo
    if (!in_array($cStatEvento, ['101', '135', '155'])) {
        throw new Exception("Cancelamento rejeitado pela SEFAZ: {$cStatEvento} - {$xMotivoEvento}");
    }

    // ✅ SEGUINDO DOCUMENTAÇÃO OFICIAL: Protocolar XML
    $xmlProtocolado = Complements::toAuthorize($tools->lastRequest, $response);
    
    logDetalhado('PROTOCOLO', 'XML protocolado com sucesso');

    // Salvar XML de cancelamento
    $storageDir = "/root/nexo-pedidos/backend/storage/xml/empresa_{$empresaId}/" . date('Y/m');
    if (!is_dir($storageDir)) {
        mkdir($storageDir, 0755, true);
    }

    $xmlCancelamentoPath = $storageDir . "/{$chaveNFCe}_cancelamento.xml";
    file_put_contents($xmlCancelamentoPath, $xmlProtocolado);

    logDetalhado('ARQUIVO', 'XML de cancelamento salvo', [
        'path' => $xmlCancelamentoPath
    ]);

    // Atualizar status no banco
    $updateData = [
        'status_fiscal' => 'cancelada',
        'cancelada_em' => date('c'),
        'motivo_cancelamento' => $motivo,
        'protocolo_cancelamento' => $nProtCancelamento,
        'updated_at' => date('c')
    ];

    $updateQuery = $supabaseUrl . '/rest/v1/pdv?chave_nfe=eq.' . $chaveNFCe;
    $updateContext = stream_context_create([
        'http' => [
            'method' => 'PATCH',
            'header' => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $supabaseKey,
                'apikey: ' . $supabaseKey,
                'Prefer: return=minimal'
            ],
            'content' => json_encode($updateData)
        ]
    ]);

    $updateResponse = file_get_contents($updateQuery, false, $updateContext);
    
    logDetalhado('BANCO', 'Status atualizado no banco', $updateData);

    // Resposta de sucesso
    $responseData = [
        'success' => true,
        'message' => 'NFC-e cancelada com sucesso',
        'data' => [
            'chave_nfce' => $chaveNFCe,
            'protocolo_cancelamento' => $nProtCancelamento,
            'protocolo_original' => $protocoloNFCe,
            'motivo' => $motivo,
            'data_cancelamento' => date('Y-m-d H:i:s'),
            'codigo_status' => $cStatEvento,
            'descricao_status' => $xMotivoEvento,
            'xml_cancelamento_path' => $xmlCancelamentoPath
        ]
    ];

    logDetalhado('SUCESSO', 'Cancelamento concluído com sucesso', $responseData['data']);

    echo json_encode($responseData, JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    logDetalhado('ERRO', 'Erro no cancelamento', [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
}
?>
