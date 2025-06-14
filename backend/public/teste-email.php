<?php

/**
 * Script para testar o envio de emails
 * Acesse: /backend/public/teste-email.php
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Tratar OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Incluir autoload do Composer
    $autoloadPath = '../vendor/autoload.php';
    if (!file_exists($autoloadPath)) {
        throw new Exception('Autoload do Composer não encontrado. Execute: composer install');
    }
    require_once $autoloadPath;

    // Verificar se PHPMailer está disponível
    if (!class_exists('PHPMailer\PHPMailer\PHPMailer')) {
        throw new Exception('PHPMailer não encontrado. Execute: composer require phpmailer/phpmailer');
    }

    require_once '../src/Services/EmailService.php';

    // Verificar método
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método não permitido. Use POST.');
    }

    // Obter dados da requisição
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Dados inválidos. Envie JSON válido.');
    }

    $acao = $input['acao'] ?? '';
    $email_destino = $input['email_destino'] ?? '';

    // Validar ação
    if (!in_array($acao, ['verificar', 'teste', 'debug'])) {
        throw new Exception('Ação inválida. Use: verificar, teste ou debug');
    }

    // Criar instância do serviço de email
    $emailService = new \NexoNFe\Services\EmailService();

    switch ($acao) {
        case 'verificar':
            // Verificar configurações
            $resultado = $emailService->verificarConfiguracao();
            
            echo json_encode([
                'success' => true,
                'acao' => 'verificar',
                'data' => $resultado,
                'timestamp' => date('Y-m-d H:i:s')
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'teste':
            // Enviar email de teste
            if (empty($email_destino)) {
                throw new Exception('Email de destino é obrigatório para teste');
            }

            if (!filter_var($email_destino, FILTER_VALIDATE_EMAIL)) {
                throw new Exception('Email de destino inválido');
            }

            $resultado = $emailService->enviarEmailTeste($email_destino);
            
            echo json_encode([
                'success' => $resultado['success'],
                'acao' => 'teste',
                'data' => $resultado,
                'timestamp' => date('Y-m-d H:i:s')
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        case 'debug':
            // Enviar email com debug habilitado
            if (empty($email_destino)) {
                throw new Exception('Email de destino é obrigatório para debug');
            }

            if (!filter_var($email_destino, FILTER_VALIDATE_EMAIL)) {
                throw new Exception('Email de destino inválido');
            }

            // Capturar output do debug
            ob_start();
            $emailService->enableDebug();
            $resultado = $emailService->enviarEmailTeste($email_destino, 'Teste DEBUG - Sistema Nexo NFe');
            $debugOutput = ob_get_clean();

            echo json_encode([
                'success' => $resultado['success'],
                'acao' => 'debug',
                'data' => $resultado,
                'debug_output' => $debugOutput,
                'timestamp' => date('Y-m-d H:i:s')
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;
    }

} catch (Exception $e) {
    error_log("Erro no teste de email: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
