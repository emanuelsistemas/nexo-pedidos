<?php
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    // Parâmetros
    $level = $_GET['level'] ?? 'all';
    $limit = (int)($_GET['limit'] ?? 10);
    $offset = (int)($_GET['offset'] ?? 0);
    
    // Validar parâmetros
    if ($limit > 100) $limit = 100;
    if ($limit < 1) $limit = 10;
    
    $logs = [];
    
    // Coletar logs do Nginx
    $nginxErrorLog = '/var/log/nginx/error.log';
    if (file_exists($nginxErrorLog)) {
        $nginxLogs = collectLogsFromFile($nginxErrorLog, 'nginx', 'error', $limit);
        $logs = array_merge($logs, $nginxLogs);
    }
    
    // Coletar logs do PHP-FPM
    $phpLogs = [
        '/var/log/php7.4-fpm.log',
        '/var/log/php-fpm.log',
        '/var/log/php/error.log'
    ];
    
    foreach ($phpLogs as $phpLog) {
        if (file_exists($phpLog)) {
            $phpLogEntries = collectLogsFromFile($phpLog, 'php-fpm', 'error', $limit);
            $logs = array_merge($logs, $phpLogEntries);
            break; // Usar apenas o primeiro arquivo encontrado
        }
    }
    
    // Coletar logs específicos do sistema NFe (se existir)
    $nfeLogPath = '../storage/logs/nfe.log';
    if (file_exists($nfeLogPath)) {
        $nfeLogs = collectLogsFromFile($nfeLogPath, 'nfe-system', 'info', $limit);
        $logs = array_merge($logs, $nfeLogs);
    }
    
    // Filtrar por nível se especificado
    if ($level !== 'all') {
        $logs = array_filter($logs, function($log) use ($level) {
            return strtolower($log['level']) === strtolower($level);
        });
    }
    
    // Ordenar por timestamp (mais recente primeiro)
    usort($logs, function($a, $b) {
        return strtotime($b['timestamp']) - strtotime($a['timestamp']);
    });
    
    // Aplicar paginação
    $totalLogs = count($logs);
    $logs = array_slice($logs, $offset, $limit);
    
    // Resposta
    echo json_encode([
        'success' => true,
        'data' => $logs,
        'total' => $totalLogs,
        'level' => $level,
        'limit' => $limit,
        'offset' => $offset,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}

/**
 * Coleta logs de um arquivo específico
 */
function collectLogsFromFile($filePath, $source, $defaultLevel, $maxLines = 50) {
    $logs = [];
    
    if (!file_exists($filePath) || !is_readable($filePath)) {
        return $logs;
    }
    
    try {
        // Ler últimas linhas do arquivo
        $lines = tail($filePath, $maxLines);
        
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line)) continue;
            
            $logEntry = parseLogLine($line, $source, $defaultLevel);
            if ($logEntry) {
                $logs[] = $logEntry;
            }
        }
        
    } catch (Exception $e) {
        // Se houver erro ao ler o arquivo, adicionar log de erro
        $logs[] = [
            'timestamp' => date('Y-m-d H:i:s'),
            'level' => 'error',
            'source' => $source,
            'message' => "Erro ao ler arquivo de log: " . $e->getMessage()
        ];
    }
    
    return $logs;
}

/**
 * Função para ler últimas linhas de um arquivo (similar ao tail)
 */
function tail($filename, $lines = 50) {
    $handle = fopen($filename, "r");
    if (!$handle) {
        return [];
    }
    
    $linecounter = $lines;
    $pos = -2;
    $beginning = false;
    $text = [];
    
    while ($linecounter > 0) {
        $t = " ";
        while ($t != "\n") {
            if (fseek($handle, $pos, SEEK_END) == -1) {
                $beginning = true;
                break;
            }
            $t = fgetc($handle);
            $pos--;
        }
        $linecounter--;
        if ($beginning) {
            rewind($handle);
        }
        $text[$lines - $linecounter - 1] = fgets($handle);
        if ($beginning) break;
    }
    
    fclose($handle);
    return array_reverse($text);
}

/**
 * Parse de linha de log para extrair informações
 */
function parseLogLine($line, $source, $defaultLevel) {
    $timestamp = date('Y-m-d H:i:s');
    $level = $defaultLevel;
    $message = $line;
    
    // Tentar extrair timestamp e nível de diferentes formatos de log
    
    // Formato Nginx: 2025/06/03 11:56:35 [error] 5646#5646: ...
    if (preg_match('/^(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}) \[(\w+)\] (.+)/', $line, $matches)) {
        $timestamp = str_replace('/', '-', $matches[1]);
        $level = $matches[2];
        $message = $matches[3];
    }
    // Formato PHP-FPM: [03-Jun-2025 11:56:35] NOTICE: ...
    elseif (preg_match('/^\[([^\]]+)\] (\w+): (.+)/', $line, $matches)) {
        $timestamp = date('Y-m-d H:i:s', strtotime($matches[1]));
        $level = strtolower($matches[2]);
        $message = $matches[3];
    }
    // Formato genérico com timestamp
    elseif (preg_match('/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})(.+)/', $line, $matches)) {
        $timestamp = $matches[1];
        $message = trim($matches[2]);
    }
    
    // Determinar nível baseado no conteúdo se não foi extraído
    if ($level === $defaultLevel) {
        if (stripos($message, 'error') !== false || stripos($message, 'fatal') !== false) {
            $level = 'error';
        } elseif (stripos($message, 'warning') !== false || stripos($message, 'warn') !== false) {
            $level = 'warning';
        } elseif (stripos($message, 'notice') !== false || stripos($message, 'info') !== false) {
            $level = 'info';
        } elseif (stripos($message, 'debug') !== false) {
            $level = 'debug';
        }
    }
    
    return [
        'timestamp' => $timestamp,
        'level' => $level,
        'source' => $source,
        'message' => $message
    ];
}
?>
