<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    $empresaId = $_GET['empresa_id'] ?? 'f35b742b-b3b5-4e99-bbb8-acfccb5c56b0';
    
    $supabaseUrl = 'https://xsrirnfwsjeovekwtluz.supabase.co';
    $supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcmlybmZ3c2plb3Zla3d0bHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMzMzk5NzEsImV4cCI6MjA0ODkxNTk3MX0.VmyrqjgFO8nT_Lqzq0_HQmJnKQiIkTtClQUEWdxwP5s';

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $supabaseUrl . '/rest/v1/empresas?id=eq.' . $empresaId);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $supabaseKey,
        'apikey: ' . $supabaseKey
    ]);

    $empresaResponse = curl_exec($ch);
    $empresaData = json_decode($empresaResponse, true);
    curl_close($ch);

    if (empty($empresaData) || !is_array($empresaData) || count($empresaData) === 0) {
        throw new Exception('Empresa não encontrada');
    }

    $empresa = $empresaData[0];
    
    // Analisar CNPJ
    $cnpjOriginal = $empresa['documento'] ?? '';
    $cnpjLimpo = preg_replace('/[^0-9]/', '', $cnpjOriginal);
    
    echo json_encode([
        'success' => true,
        'empresa_id' => $empresaId,
        'dados_empresa' => $empresa,
        'cnpj_original' => $cnpjOriginal,
        'cnpj_limpo' => $cnpjLimpo,
        'cnpj_tamanho' => strlen($cnpjLimpo),
        'cnpj_valido' => strlen($cnpjLimpo) === 14,
        'todos_campos' => array_keys($empresa)
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
