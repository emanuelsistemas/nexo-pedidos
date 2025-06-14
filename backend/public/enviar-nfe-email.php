<?php

/**
 * API para envio de NFe por email
 * Envia XML e PDF da NFe para lista de emails
 */

require_once '../includes/storage-paths.php'; // ✅ INCLUIR funções helper

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Tratar OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Verificar método
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método não permitido. Use POST.');
    }

    // Incluir dependências
    require_once '../vendor/autoload.php';
    require_once '../src/Services/EmailService.php';

    // Obter dados da requisição
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Dados inválidos. Envie JSON válido.');
    }

    // Validar campos obrigatórios
    $empresa_id = $input['empresa_id'] ?? '';
    $chave_nfe = $input['chave_nfe'] ?? '';
    $emails = $input['emails'] ?? [];
    $nfe_data = $input['nfe_data'] ?? [];

    if (empty($empresa_id)) {
        throw new Exception('empresa_id é obrigatório');
    }

    if (empty($chave_nfe)) {
        throw new Exception('chave_nfe é obrigatória');
    }

    if (empty($emails) || !is_array($emails)) {
        throw new Exception('Lista de emails é obrigatória');
    }

    if (empty($nfe_data)) {
        throw new Exception('Dados da NFe são obrigatórios');
    }

    // Validar emails
    foreach ($emails as $email) {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception("Email inválido: {$email}");
        }
    }

    // ✅ USAR FUNÇÕES HELPER DINÂMICAS PARA MULTI-TENANT E MULTI-AMBIENTE

    // Determinar ambiente e modelo baseado na chave NFe
    $ambiente = 'homologacao'; // Padrão
    $modelo = '55'; // Padrão NFe

    // A chave NFe tem 44 caracteres, posição 20 indica ambiente (1=produção, 2=homologação)
    if (strlen($chave_nfe) === 44) {
        $ambiente_codigo = substr($chave_nfe, 20, 1);
        $ambiente = ($ambiente_codigo === '1') ? 'producao' : 'homologacao';

        // Posição 21-22 indica modelo (55=NFe, 65=NFCe)
        $modelo_codigo = substr($chave_nfe, 20, 2);
        $modelo = (substr($modelo_codigo, 1, 2) === '65') ? '65' : '55';
    }

    // Extrair ano e mês da chave NFe (posições 2-5 = AAMM)
    $ano_mes = substr($chave_nfe, 2, 4);
    $ano = '20' . substr($ano_mes, 0, 2);
    $mes = substr($ano_mes, 2, 2);

    // ✅ USAR ESTRUTURA REAL DE STORAGE (baseada nos arquivos encontrados)
    $base_storage = "/root/nexo-pedidos/backend/storage";
    $xml_dir = "{$base_storage}/xml/empresa_{$empresa_id}/{$ambiente}/{$modelo}/Autorizados/{$ano}/{$mes}";
    $pdf_dir = "{$base_storage}/pdf/empresa_{$empresa_id}/{$ambiente}/{$modelo}/Autorizados/{$ano}/{$mes}";

    $xml_path = "{$xml_dir}/{$chave_nfe}.xml";
    $pdf_path = "{$pdf_dir}/{$chave_nfe}.pdf";

    // ✅ LOGS DE DEBUG para identificar problemas
    error_log("EMAIL DEBUG: Procurando arquivos NFe");
    error_log("EMAIL DEBUG: Chave NFe: {$chave_nfe}");
    error_log("EMAIL DEBUG: Ambiente: {$ambiente}");
    error_log("EMAIL DEBUG: Modelo: {$modelo}");
    error_log("EMAIL DEBUG: Ano/Mês: {$ano}/{$mes}");
    error_log("EMAIL DEBUG: XML Path: {$xml_path}");
    error_log("EMAIL DEBUG: PDF Path: {$pdf_path}");
    error_log("EMAIL DEBUG: XML Dir: {$xml_dir}");
    error_log("EMAIL DEBUG: PDF Dir: {$pdf_dir}");
    error_log("EMAIL DEBUG: XML existe: " . (file_exists($xml_path) ? 'SIM' : 'NÃO'));
    error_log("EMAIL DEBUG: PDF existe: " . (file_exists($pdf_path) ? 'SIM' : 'NÃO'));

    // Verificar se arquivos existem
    $xml_existe = file_exists($xml_path);
    $pdf_existe = file_exists($pdf_path);

    if (!$xml_existe || !$pdf_existe) {
        // ✅ Retornar informações detalhadas sobre arquivos não encontrados
        $erro_detalhado = [
            'tipo' => 'arquivos_nao_encontrados',
            'titulo' => 'Arquivos da NFe não encontrados',
            'descricao' => 'Um ou mais arquivos necessários para envio por email não foram encontrados.',
            'solucao' => 'Verifique se a NFe foi emitida corretamente e os arquivos foram gerados.',
            'arquivos' => [
                'xml_existe' => $xml_existe,
                'pdf_existe' => $pdf_existe,
                'xml_path' => $xml_path,
                'pdf_path' => $pdf_path,
                'chave_nfe' => $chave_nfe,
                'ambiente' => $ambiente,
                'modelo' => $modelo,
                'ano_mes' => "{$ano}/{$mes}"
            ]
        ];

        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => json_encode($erro_detalhado),
            'arquivos' => $erro_detalhado['arquivos'],
            'timestamp' => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // ✅ USAR DADOS DINÂMICOS DO FRONTEND (SaaS multi-tenant)
    $nfe_data_completo = array_merge($nfe_data, [
        'empresa_id' => $empresa_id,
        'chave' => $chave_nfe
    ]);

    // Criar instância do serviço de email
    $emailService = new \NexoNFe\Services\EmailService();

    // Resultados do envio
    $resultados = [];
    $sucessos = 0;
    $falhas = 0;

    // Enviar para cada email
    foreach ($emails as $email) {
        try {
            $resultado = $emailService->enviarNFe($email, $nfe_data_completo, $xml_path, $pdf_path);

            if ($resultado['success']) {
                $sucessos++;
            } else {
                $falhas++;
            }

            $resultados[] = $resultado;

        } catch (Exception $e) {
            $falhas++;
            $resultados[] = [
                'success' => false,
                'error' => $e->getMessage(),
                'destinatario' => $email
            ];
        }
    }

    // Resposta final
    $response = [
        'success' => $sucessos > 0,
        'message' => $sucessos > 0 ? 
            "Email enviado com sucesso para {$sucessos} destinatário(s)" : 
            "Falha no envio para todos os destinatários",
        'estatisticas' => [
            'total_emails' => count($emails),
            'sucessos' => $sucessos,
            'falhas' => $falhas
        ],
        'detalhes' => $resultados,
        'arquivos' => [
            'xml_path' => $xml_path,
            'pdf_path' => $pdf_path,
            'xml_existe' => file_exists($xml_path),
            'pdf_existe' => file_exists($pdf_path)
        ],
        'nfe_info' => [
            'chave' => $chave_nfe,
            'ambiente' => $ambiente,
            'modelo' => $modelo,
            'ano' => $ano,
            'mes' => $mes
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ];

    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    error_log("Erro no envio de NFe por email: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
