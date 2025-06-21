<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    $logs = [];
    
    // Ler logs detalhados da NFe
    $detailedLogFile = '/tmp/nfe_detailed.log';
    if (file_exists($detailedLogFile)) {
        $detailedContent = file_get_contents($detailedLogFile);
        $detailedLines = explode("\n", $detailedContent);
        
        // Pegar últimas 100 linhas
        $recentDetailedLines = array_slice($detailedLines, -100);
        
        foreach ($recentDetailedLines as $line) {
            if (!empty(trim($line))) {
                $logs[] = [
                    'type' => 'detailed',
                    'message' => trim($line),
                    'timestamp' => date('Y-m-d H:i:s')
                ];
            }
        }
    }
    
    // Ler logs de erro PHP
    $errorLogFile = '/var/log/php_nfe_debug.log';
    if (file_exists($errorLogFile)) {
        $errorContent = file_get_contents($errorLogFile);
        $errorLines = explode("\n", $errorContent);
        
        // Pegar últimas 50 linhas
        $recentErrorLines = array_slice($errorLines, -50);
        
        foreach ($recentErrorLines as $line) {
            if (!empty(trim($line))) {
                $logs[] = [
                    'type' => 'error',
                    'message' => trim($line),
                    'timestamp' => date('Y-m-d H:i:s')
                ];
            }
        }
    }
    
    // Ordenar logs por timestamp (mais recentes primeiro)
    usort($logs, function($a, $b) {
        return strcmp($b['timestamp'], $a['timestamp']);
    });
    
    echo json_encode([
        'success' => true,
        'logs' => array_slice($logs, 0, 200), // Limitar a 200 logs
        'total' => count($logs),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
}
?>
