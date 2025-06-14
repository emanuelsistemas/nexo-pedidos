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

    // ✅ CORREÇÃO: Buscar dados da empresa pela chave da NFC-e (igual à emissão)
    logDetalhado('BUSCA_EMPRESA', 'Buscando dados da empresa pela chave da NFC-e', [
        'chave' => $chaveNFCe
    ]);

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
    $supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcmlybmZ3c2plb3Zla3d0bHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NjQ5OTcsImV4cCI6MjA2MjI0MDk5N30.SrIEj_akvD9x-tltfpV3K4hQSKtPjJ_tQ4FFhPwiIy4';

    // ✅ CORREÇÃO: Buscar dados da venda pela chave para obter empresa_id
    $vendaQuery = $supabaseUrl . '/rest/v1/pdv?chave_nfe=eq.' . $chaveNFCe . '&select=empresa_id,usuario_id';
    $vendaContext = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                'apikey: ' . $supabaseKey,
                'Authorization: Bearer ' . $supabaseKey
            ]
        ]
    ]);

    $vendaResponse = file_get_contents($vendaQuery, false, $vendaContext);
    $vendaData = json_decode($vendaResponse, true);

    logDetalhado('VENDA_RESPONSE', 'Resposta da consulta venda', [
        'query' => $vendaQuery,
        'response_raw' => $vendaResponse,
        'response_length' => strlen($vendaResponse),
        'data_count' => is_array($vendaData) ? count($vendaData) : 'NOT_ARRAY',
        'json_error' => json_last_error_msg(),
        'vendaData_type' => gettype($vendaData)
    ]);

    if (empty($vendaData)) {
        throw new Exception('NFC-e não encontrada no sistema');
    }

    $venda = $vendaData[0];
    $empresaId = $venda['empresa_id'];

    logDetalhado('EMPRESA_ID', 'Empresa ID obtido da venda', ['empresa_id' => $empresaId]);

    // ✅ CORREÇÃO: Buscar dados da empresa usando o empresa_id da venda
    $empresaQuery = $supabaseUrl . '/rest/v1/empresas?id=eq.' . $empresaId . '&select=*';
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
    logDetalhado('EMPRESA', 'Empresa carregada', [
        'razao_social' => $empresa['razao_social'] ?? 'NULL',
        'documento' => $empresa['documento'] ?? 'NULL',
        'estado' => $empresa['estado'] ?? 'NULL',
        'campos_disponiveis' => array_keys($empresa),
        'total_campos' => count($empresa)
    ]);

    // ✅ CORREÇÃO: Usar dados diretos da empresa (igual à emissão)
    // Determinar ambiente (assumir homologação por padrão para cancelamento)
    $ambiente = 2; // Homologação por padrão
    $cscField = $ambiente == 1 ? 'csc_producao' : 'csc_homologacao';
    $cscIdField = $ambiente == 1 ? 'csc_id_producao' : 'csc_id_homologacao';

    logDetalhado('AMBIENTE', 'Ambiente determinado para cancelamento', [
        'ambiente' => $ambiente,
        'csc_field' => $cscField,
        'csc_id_field' => $cscIdField
    ]);

    // ✅ CORREÇÃO: Usar nomes corretos dos campos da tabela empresas
    // Validar dados obrigatórios da empresa
    if (empty($empresa['razao_social'])) {
        throw new Exception('Razão social da empresa não encontrada');
    }

    if (empty($empresa['documento'])) {
        throw new Exception('CNPJ da empresa não encontrado');
    }

    if (empty($empresa['estado'])) {
        throw new Exception('UF da empresa não encontrada');
    }

    // Validar CSC para NFC-e
    if (empty($empresa[$cscField])) {
        throw new Exception("CSC de homologação não configurado para a empresa");
    }

    if (empty($empresa[$cscIdField])) {
        throw new Exception("CSC ID de homologação não configurado para a empresa");
    }

    // Preparar configuração para Tools (igual à emissão)
    $cnpjLimpo = preg_replace('/[^0-9]/', '', $empresa['documento']);
    $config = [
        'atualizacao' => date('Y-m-d H:i:s'),
        'tpAmb' => $ambiente,
        'razaosocial' => $empresa['razao_social'],
        'cnpj' => $cnpjLimpo,
        'siglaUF' => $empresa['estado'],
        'schemes' => 'PL_009_V4',
        'versao' => '4.00',
        'CSC' => $empresa[$cscField],
        'CSCid' => (string)$empresa[$cscIdField]
    ];

    logDetalhado('CONFIG', 'Configuração preparada', [
        'ambiente' => $config['tpAmb'],
        'uf' => $config['siglaUF']
    ]);

    // ✅ CORREÇÃO: Usar mesmo caminho da emissão
    $certificadoPath = "../storage/certificados/empresa_{$empresaId}.pfx";
    $metadataPath = "../storage/certificados/empresa_{$empresaId}.json";

    logDetalhado('CERTIFICADO_PATHS', 'Caminhos do certificado', [
        'certificado_path' => $certificadoPath,
        'metadata_path' => $metadataPath,
        'certificado_exists' => file_exists($certificadoPath),
        'metadata_exists' => file_exists($metadataPath)
    ]);

    if (!file_exists($certificadoPath)) {
        throw new Exception('Certificado digital não encontrado');
    }

    $certificadoContent = file_get_contents($certificadoPath);

    if (!file_exists($metadataPath)) {
        throw new Exception('Metadados do certificado não encontrados');
    }

    $metadata = json_decode(file_get_contents($metadataPath), true);
    $senha = $metadata['password'] ?? '';

    logDetalhado('CERTIFICADO_LOADED', 'Certificado carregado', [
        'certificado_size' => strlen($certificadoContent),
        'metadata_keys' => array_keys($metadata)
    ]);

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

    // ✅ CORREÇÃO: Usar estrutura correta igual à NFe
    // Estrutura: storage/xml/empresa_{id}/{ambiente}/{modelo}/Cancelados/{ano}/{mes}/
    $ambienteTexto = $ambiente == 1 ? 'producao' : 'homologacao';
    $modelo = '65'; // NFC-e
    $xmlCancelDir = "/root/nexo-pedidos/backend/storage/xml/empresa_{$empresaId}/{$ambienteTexto}/{$modelo}/Cancelados/" . date('Y/m');

    if (!is_dir($xmlCancelDir)) {
        mkdir($xmlCancelDir, 0755, true);
        logDetalhado('DIRETORIO', 'Diretório de NFC-e canceladas criado', ['path' => $xmlCancelDir]);
    }

    // Nome do arquivo: chave_nfce + _cancelamento.xml
    $nomeArquivoCancel = $chaveNFCe . '_cancelamento.xml';
    $xmlCancelamentoPath = $xmlCancelDir . '/' . $nomeArquivoCancel;

    file_put_contents($xmlCancelamentoPath, $xmlProtocolado);

    logDetalhado('ARQUIVO', 'XML de cancelamento salvo na estrutura correta', [
        'path' => $xmlCancelamentoPath,
        'ambiente' => $ambienteTexto,
        'modelo' => $modelo,
        'estrutura' => 'empresa_id/ambiente/modelo/Cancelados/ano/mes/'
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
