<?php
// Script para adicionar endpoints de logs ao index.php

$indexFile = '/var/www/nfe-api/public/index.php';
$content = file_get_contents($indexFile);

// Código dos endpoints de logs para inserir
$logsEndpoints = '
                case "/api/logs":
                    if ($method === "GET") {
                        require_once "../src/Controllers/LogsController.php";
                        $controller = new \NexoNFe\Controllers\LogsController();
                        $controller->getLogs();
                    } else {
                        http_response_code(405);
                        echo json_encode(["error" => "Método não permitido"]);
                    }
                    break;

                case "/api/logs/monitor":
                    if ($method === "GET") {
                        require_once "../src/Controllers/LogsController.php";
                        $controller = new \NexoNFe\Controllers\LogsController();
                        $controller->getMonitorLogs();
                    } else {
                        http_response_code(405);
                        echo json_encode(["error" => "Método não permitido"]);
                    }
                    break;

                case "/api/logs/clear":
                    if ($method === "POST") {
                        require_once "../src/Controllers/LogsController.php";
                        $controller = new \NexoNFe\Controllers\LogsController();
                        $controller->clearLogs();
                    } else {
                        http_response_code(405);
                        echo json_encode(["error" => "Método não permitido"]);
                    }
                    break;
';

// Encontrar onde inserir (antes do default)
$defaultPos = strpos($content, 'default:');
if ($defaultPos !== false) {
    // Inserir antes do default
    $beforeDefault = substr($content, 0, $defaultPos);
    $afterDefault = substr($content, $defaultPos);
    
    $newContent = $beforeDefault . $logsEndpoints . "\n                " . $afterDefault;
    
    // Salvar o arquivo
    file_put_contents($indexFile, $newContent);
    echo "✅ Endpoints de logs adicionados com sucesso!\n";
    echo "📋 Endpoints implementados:\n";
    echo "   - GET /api/logs\n";
    echo "   - GET /api/logs/monitor\n";
    echo "   - POST /api/logs/clear\n";
} else {
    echo "❌ Não foi possível encontrar a seção 'default' no arquivo.\n";
}
?>
