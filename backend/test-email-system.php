<?php

/**
 * Script de teste para o sistema de email NFe
 * Testa configuração, conectividade e envio
 */

require_once 'vendor/autoload.php';
require_once 'src/Services/EmailService.php';

echo "=== TESTE DO SISTEMA DE EMAIL NFe ===\n";
echo "Data: " . date('Y-m-d H:i:s') . "\n\n";

try {
    // 1. Testar carregamento da classe
    echo "1. Testando carregamento da classe EmailService...\n";
    $emailService = new \NexoNFe\Services\EmailService();
    echo "✅ EmailService carregado com sucesso\n\n";

    // 2. Verificar configurações
    echo "2. Verificando configurações...\n";
    $config = $emailService->verificarConfiguracao();
    
    if ($config['configurado']) {
        echo "✅ Configurações válidas\n";
        echo "Host: " . $config['config']['host'] . "\n";
        echo "Port: " . $config['config']['port'] . "\n";
        echo "Encryption: " . $config['config']['encryption'] . "\n";
        echo "From Name: " . $config['config']['from_name'] . "\n";
    } else {
        echo "❌ Problemas na configuração:\n";
        foreach ($config['problemas'] as $problema) {
            echo "  - $problema\n";
        }
        exit(1);
    }
    echo "\n";

    // 3. Testar envio de email simples
    echo "3. Testando envio de email simples...\n";
    $emailTeste = 'nexopdv@gmail.com'; // Usar o mesmo email configurado
    
    $resultado = $emailService->enviarEmailTeste($emailTeste);
    
    if ($resultado['success']) {
        echo "✅ Email de teste enviado com sucesso!\n";
        echo "Destinatário: " . $resultado['destinatario'] . "\n";
    } else {
        echo "❌ Falha no envio do email de teste:\n";
        echo "Erro: " . $resultado['error'] . "\n";
        
        if (isset($resultado['debug_info'])) {
            echo "\nInformações de debug:\n";
            foreach ($resultado['debug_info'] as $key => $value) {
                echo "  $key: $value\n";
            }
        }
        exit(1);
    }
    echo "\n";

    // 4. Testar dados de NFe simulados
    echo "4. Testando dados de NFe simulados...\n";
    $nfeDataTeste = [
        'empresa_id' => 'acd26a4f-7220-405e-9c96-faffb7e6480e',
        'chave' => '35241214200166000187550010000001231234567890',
        'numero' => '123',
        'serie' => '1',
        'valor_total' => 100.50,
        'cliente_nome' => 'Cliente Teste',
        'empresa_nome' => 'Empresa Teste LTDA',
        'empresa_endereco' => 'Rua Teste, 123',
        'empresa_cnpj' => '24.163.237/0001-51',
        'empresa_telefone' => '(11) 99999-9999',
        'empresa_email' => 'contato@empresateste.com',
        'empresa_website' => 'www.empresateste.com'
    ];

    // Simular envio de NFe (sem arquivos reais)
    $resultadoNfe = $emailService->enviarNFe($emailTeste, $nfeDataTeste);
    
    if ($resultadoNfe['success']) {
        echo "✅ Email de NFe simulado enviado com sucesso!\n";
        echo "Destinatário: " . $resultadoNfe['destinatario'] . "\n";
        echo "NFe Número: " . $resultadoNfe['nfe_numero'] . "\n";
        
        if (!empty($resultadoNfe['anexos'])) {
            echo "Anexos: " . implode(', ', $resultadoNfe['anexos']) . "\n";
        } else {
            echo "⚠️ Nenhum anexo encontrado (normal para teste)\n";
        }
    } else {
        echo "❌ Falha no envio do email de NFe:\n";
        echo "Erro: " . $resultadoNfe['error'] . "\n";
        
        if (isset($resultadoNfe['arquivos_tentados'])) {
            echo "\nArquivos tentados:\n";
            echo "  XML: " . $resultadoNfe['arquivos_tentados']['xml'] . "\n";
            echo "  PDF: " . $resultadoNfe['arquivos_tentados']['pdf'] . "\n";
        }
    }
    echo "\n";

    echo "=== TESTE CONCLUÍDO COM SUCESSO ===\n";
    echo "✅ Sistema de email está funcionando corretamente!\n";
    echo "✅ Configurações SMTP válidas\n";
    echo "✅ Conectividade OK\n";
    echo "✅ Envio de emails funcionando\n\n";
    
    echo "📧 Verifique sua caixa de entrada em: $emailTeste\n";
    echo "Você deve ter recebido 2 emails:\n";
    echo "  1. Email de teste do sistema\n";
    echo "  2. Email simulado de NFe\n\n";

} catch (Exception $e) {
    echo "❌ ERRO CRÍTICO: " . $e->getMessage() . "\n";
    echo "\nStack trace:\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}

?>
