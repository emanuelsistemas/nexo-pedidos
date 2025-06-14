<?php
/**
 * Script para ler logs detalhados da NFC-e
 */

header('Content-Type: application/json; charset=utf-8');

try {
    $logs = [
        'detailed' => '/tmp/nfce_detailed.log',
        'error' => '/tmp/nfce_error.log',
        'debug' => '/tmp/nfce_debug.log'
    ];
    
    $result = [];
    
    foreach ($logs as $type => $logFile) {
        if (file_exists($logFile)) {
            $content = file_get_contents($logFile);
            $result[$type] = [
                'exists' => true,
                'size' => strlen($content),
                'lines' => substr_count($content, "\n"),
                'content' => $content
            ];
        } else {
            $result[$type] = [
                'exists' => false,
                'message' => 'Arquivo não existe'
            ];
        }
    }
    
    echo json_encode([
        'success' => true,
        'logs' => $result,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
