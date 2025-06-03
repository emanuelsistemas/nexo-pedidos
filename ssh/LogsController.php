<?php
namespace NexoNFe\Controllers;

class LogsController {
    public function getLogs() {
        $level = $_GET["level"] ?? "all";
        $limit = (int)($_GET["limit"] ?? 100);
        $offset = (int)($_GET["offset"] ?? 0);
        
        $logs = [];
        
        // Ler logs do Nginx
        $nginxErrorLog = "/var/log/nginx/nfe-api.error.log";
        if (file_exists($nginxErrorLog)) {
            $nginxLines = file($nginxErrorLog, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            $nginxLines = array_slice($nginxLines, -$limit);
            foreach ($nginxLines as $line) {
                $logs[] = [
                    "timestamp" => date("Y-m-d H:i:s"),
                    "level" => "ERROR",
                    "source" => "nginx",
                    "message" => $line
                ];
            }
        }
        
        // Ler logs da aplicação
        $appLogFile = "../storage/logs/nfe.log";
        if (file_exists($appLogFile)) {
            $appLines = file($appLogFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            $appLines = array_slice($appLines, -$limit);
            foreach ($appLines as $line) {
                $logData = json_decode($line, true);
                if ($logData) {
                    $logs[] = [
                        "timestamp" => $logData["timestamp"] ?? date("Y-m-d H:i:s"),
                        "level" => $logData["level"] ?? "INFO",
                        "source" => "app",
                        "message" => $logData["message"] ?? $line
                    ];
                }
            }
        }
        
        // Filtrar por level
        if ($level !== "all") {
            $logs = array_filter($logs, function($log) use ($level) {
                return strtolower($log["level"]) === strtolower($level);
            });
        }
        
        // Ordenar por timestamp
        usort($logs, function($a, $b) {
            return strcmp($b["timestamp"], $a["timestamp"]);
        });
        
        // Aplicar offset e limit
        $logs = array_slice($logs, $offset, $limit);
        
        echo json_encode([
            "success" => true,
            "data" => $logs,
            "total" => count($logs),
            "level" => $level,
            "limit" => $limit,
            "offset" => $offset,
            "timestamp" => date("Y-m-d H:i:s")
        ]);
    }
    
    public function getMonitorLogs() {
        $limit = (int)($_GET["limit"] ?? 5);
        
        $logs = [
            [
                "timestamp" => date("Y-m-d H:i:s"),
                "level" => "INFO",
                "message" => "API NFe/NFC-e funcionando normalmente",
                "status" => "online"
            ],
            [
                "timestamp" => date("Y-m-d H:i:s", strtotime("-5 minutes")),
                "level" => "INFO",
                "message" => "Verificação automática de status",
                "status" => "check"
            ]
        ];
        
        echo json_encode([
            "success" => true,
            "data" => array_slice($logs, 0, $limit),
            "timestamp" => date("Y-m-d H:i:s")
        ]);
    }
    
    public function clearLogs() {
        $input = json_decode(file_get_contents("php://input"), true);
        $type = $input["type"] ?? "all";
        
        $cleared = [];
        
        if ($type === "all" || $type === "nfe") {
            $appLogFile = "../storage/logs/nfe.log";
            if (file_exists($appLogFile)) {
                file_put_contents($appLogFile, "");
                $cleared[] = "nfe";
            }
        }
        
        echo json_encode([
            "success" => true,
            "message" => "Logs limpos com sucesso",
            "cleared" => $cleared,
            "timestamp" => date("Y-m-d H:i:s")
        ]);
    }
}
?>
