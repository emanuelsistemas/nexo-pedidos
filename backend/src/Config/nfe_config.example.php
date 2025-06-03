<?php

/**
 * Configuração da NFe
 * 
 * Copie este arquivo para nfe_config.php e configure com seus dados
 */

return [
    // Ambiente: 1 = Produção, 2 = Homologação
    'ambiente' => 2,
    
    // Dados da empresa
    'razao_social' => 'SUA EMPRESA LTDA',
    'cnpj' => '00000000000000', // Apenas números
    'uf' => 'SP', // Sigla do estado
    
    // Certificado digital
    'cert_path' => __DIR__ . '/../../storage/certificados/certificado.pfx',
    'cert_password' => 'senha_do_certificado',
    
    // CSC (Código de Segurança do Contribuinte) - Para NFCe
    'csc' => '',
    'csc_id' => '',
    
    // Diretórios
    'storage_path' => __DIR__ . '/../../storage',
    'xml_path' => __DIR__ . '/../../storage/xml',
    'pdf_path' => __DIR__ . '/../../storage/pdf',

    // URL base para acesso aos arquivos
    'base_url' => 'http://localhost', // Altere para seu domínio
    
    // Configurações de timeout
    'timeout' => 60,
    
    // Proxy (se necessário)
    'proxy' => [
        'ip' => '',
        'port' => '',
        'user' => '',
        'password' => ''
    ]
];
