<?php
/**
 * Script para limpar logs de debug da NFC-e
 */

header('Content-Type: application/json; charset=utf-8');

try {
    // Limpar arquivos de log
    $logs = [
        '/tmp/nfce_debug.log',
        '/tmp/nfce_detailed.log',
        '/tmp/nfce_error.log'
    ];
    
    $cleaned = [];
    
    foreach ($logs as $logFile) {
        if (file_exists($logFile)) {
            unlink($logFile);
            $cleaned[] = $logFile;
        }
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Logs limpos com sucesso',
        'cleaned_files' => $cleaned,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
