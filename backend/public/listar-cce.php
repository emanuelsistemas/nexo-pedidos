<?php
/**
 * Endpoint para listar Cartas de Correção Eletrônica (CCe) da nova tabela cce_nfe
 * 
 * Busca CCe por chave NFe e empresa_id (controle SaaS)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    // Obter parâmetros
    $chaveNfe = $_GET['chave_nfe'] ?? '';
    $empresaId = $_GET['empresa_id'] ?? '';

    if (empty($chaveNfe)) {
        throw new Exception('Chave NFe é obrigatória');
    }

    if (empty($empresaId)) {
        throw new Exception('ID da empresa é obrigatório');
    }

    error_log("📋 Listando CCe - Chave: {$chaveNfe}, Empresa: {$empresaId}");

    // Conectar ao Supabase
    $supabaseUrl = 'https://xsrirnfwsjeovekwtluz.supabase.co';
    $supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcmlybnZ3c2plb3Zla3d0bHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NjQ5OTcsImV4cCI6MjA2MjI0MDk5N30.SrIEj_akvD9x-tltfpV3K4hQSKtPjJ_tQ4FFhPwiIy4';

    // Buscar CCe na tabela cce_nfe
    $query = $supabaseUrl . '/rest/v1/cce_nfe?chave_nfe=eq.' . urlencode($chaveNfe) . '&empresa_id=eq.' . urlencode($empresaId) . '&order=sequencia.asc';
    
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                'apikey: ' . $supabaseKey,
                'Authorization: Bearer ' . $supabaseKey,
                'Content-Type: application/json'
            ]
        ]
    ]);

    $response = file_get_contents($query, false, $context);
    
    if ($response === false) {
        throw new Exception('Erro ao consultar CCe no banco de dados');
    }

    $cces = json_decode($response, true);
    
    if (!is_array($cces)) {
        throw new Exception('Resposta inválida do banco de dados');
    }

    error_log("📋 CCe encontradas: " . count($cces));

    // Formatar dados para compatibilidade com o frontend
    $ccesFormatadas = [];
    foreach ($cces as $cce) {
        $ccesFormatadas[] = [
            'id' => $cce['id'],
            'sequencia' => $cce['sequencia'],
            'data_envio' => $cce['data_envio'],
            'protocolo' => $cce['protocolo'],
            'correcao' => $cce['correcao'],
            'status' => $cce['status'],
            'codigo_status' => $cce['codigo_status'],
            'descricao_status' => $cce['descricao_status'],
            'ambiente' => $cce['ambiente'],
            'xml_path' => $cce['xml_path'],
            'xml_nome' => $cce['xml_nome'],
            'pdf_path' => $cce['pdf_path'],
            'pdf_nome' => $cce['pdf_nome'],
            'created_at' => $cce['created_at']
        ];
    }

    // Retornar sucesso
    echo json_encode([
        'success' => true,
        'data' => $ccesFormatadas,
        'total' => count($ccesFormatadas),
        'message' => count($ccesFormatadas) > 0 ? 'CCe encontradas' : 'Nenhuma CCe encontrada'
    ]);

} catch (Exception $e) {
    error_log("❌ ERRO ao listar CCe: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'data' => [],
        'total' => 0
    ]);
}
?>
