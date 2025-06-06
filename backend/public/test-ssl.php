<?php
header('Content-Type: application/json');

try {
    // Testar conectividade SSL com a SEFAZ
    $url = 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx';
    
    // Configurar contexto SSL
    $context = stream_context_create([
        'http' => [
            'timeout' => 10,
            'method' => 'GET'
        ],
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true,
            'cafile' => '/etc/ssl/certs/ca-certificates.crt'
        ]
    ]);
    
    // Testar com file_get_contents
    $headers = @get_headers($url, 1, $context);
    
    if ($headers) {
        echo json_encode([
            'success' => true,
            'message' => 'Conectividade SSL funcionando',
            'status_code' => $headers[0] ?? 'Desconhecido',
            'ssl_configured' => true,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    } else {
        throw new Exception('Falha na conectividade SSL');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'ssl_configured' => file_exists('/etc/ssl/certs/ca-certificates.crt'),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
