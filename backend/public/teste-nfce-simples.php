<?php
/**
 * Teste simples para verificar se a biblioteca sped-nfe funciona para NFC-e
 */

header('Content-Type: application/json; charset=utf-8');

try {
    require_once '../vendor/autoload.php';
    
    echo json_encode([
        'step' => 'autoload',
        'status' => 'success',
        'message' => 'Autoload carregado com sucesso'
    ]);
    echo "\n";
    
    // Testar se as classes existem
    if (!class_exists('\NFePHP\NFe\Tools')) {
        throw new Exception('Classe Tools não encontrada');
    }
    
    echo json_encode([
        'step' => 'class_tools',
        'status' => 'success',
        'message' => 'Classe Tools encontrada'
    ]);
    echo "\n";
    
    if (!class_exists('\NFePHP\NFe\Make')) {
        throw new Exception('Classe Make não encontrada');
    }
    
    echo json_encode([
        'step' => 'class_make',
        'status' => 'success',
        'message' => 'Classe Make encontrada'
    ]);
    echo "\n";
    
    if (!class_exists('\NFePHP\Common\Certificate')) {
        throw new Exception('Classe Certificate não encontrada');
    }
    
    echo json_encode([
        'step' => 'class_certificate',
        'status' => 'success',
        'message' => 'Classe Certificate encontrada'
    ]);
    echo "\n";
    
    // Testar configuração básica
    $config = [
        "atualizacao" => date('Y-m-d H:i:s'),
        "tpAmb" => 2,
        "razaosocial" => "TESTE EMPRESA LTDA",
        "cnpj" => "24163237000151",
        "siglaUF" => "SP",
        "schemes" => "PL_009_V4",
        "versao" => '4.00',
        "CSC" => "56c7e074-f050-4233-8417-c64f082a2970",
        "CSCid" => "3"
    ];
    
    echo json_encode([
        'step' => 'config',
        'status' => 'success',
        'message' => 'Configuração criada',
        'config' => $config
    ]);
    echo "\n";
    
    // Testar certificado (se existir)
    $certificadoPath = "../storage/certificados/empresa_acd26a4f-7220-405e-9c96-faffb7e6480e.pfx";
    $metadataPath = "../storage/certificados/empresa_acd26a4f-7220-405e-9c96-faffb7e6480e.json";
    
    if (file_exists($certificadoPath) && file_exists($metadataPath)) {
        $certificado = file_get_contents($certificadoPath);
        $metadata = json_decode(file_get_contents($metadataPath), true);
        
        echo json_encode([
            'step' => 'certificate_files',
            'status' => 'success',
            'message' => 'Arquivos de certificado encontrados',
            'cert_size' => strlen($certificado),
            'metadata' => $metadata
        ]);
        echo "\n";
        
        try {
            $certificate = \NFePHP\Common\Certificate::readPfx($certificado, $metadata['password'] ?? '');
            
            echo json_encode([
                'step' => 'certificate_load',
                'status' => 'success',
                'message' => 'Certificado carregado com sucesso'
            ]);
            echo "\n";
            
            // Testar Tools
            try {
                $tools = new \NFePHP\NFe\Tools(json_encode($config), $certificate);
                
                echo json_encode([
                    'step' => 'tools_init',
                    'status' => 'success',
                    'message' => 'Tools inicializado com sucesso'
                ]);
                echo "\n";
                
                // Testar modelo 65
                try {
                    $tools->model('65');
                    
                    echo json_encode([
                        'step' => 'model_65',
                        'status' => 'success',
                        'message' => 'Modelo 65 (NFC-e) configurado com sucesso'
                    ]);
                    echo "\n";
                    
                } catch (Exception $modelError) {
                    echo json_encode([
                        'step' => 'model_65',
                        'status' => 'error',
                        'message' => 'Erro ao configurar modelo 65: ' . $modelError->getMessage()
                    ]);
                    echo "\n";
                }
                
            } catch (Exception $toolsError) {
                echo json_encode([
                    'step' => 'tools_init',
                    'status' => 'error',
                    'message' => 'Erro ao inicializar Tools: ' . $toolsError->getMessage()
                ]);
                echo "\n";
            }
            
        } catch (Exception $certError) {
            echo json_encode([
                'step' => 'certificate_load',
                'status' => 'error',
                'message' => 'Erro ao carregar certificado: ' . $certError->getMessage()
            ]);
            echo "\n";
        }
        
    } else {
        echo json_encode([
            'step' => 'certificate_files',
            'status' => 'error',
            'message' => 'Arquivos de certificado não encontrados',
            'cert_path' => $certificadoPath,
            'meta_path' => $metadataPath,
            'cert_exists' => file_exists($certificadoPath),
            'meta_exists' => file_exists($metadataPath)
        ]);
        echo "\n";
    }
    
    // Testar Make
    try {
        $make = new \NFePHP\NFe\Make();
        
        echo json_encode([
            'step' => 'make_init',
            'status' => 'success',
            'message' => 'Make inicializado com sucesso'
        ]);
        echo "\n";
        
    } catch (Exception $makeError) {
        echo json_encode([
            'step' => 'make_init',
            'status' => 'error',
            'message' => 'Erro ao inicializar Make: ' . $makeError->getMessage()
        ]);
        echo "\n";
    }
    
    echo json_encode([
        'step' => 'final',
        'status' => 'success',
        'message' => 'Teste concluído com sucesso'
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'step' => 'fatal_error',
        'status' => 'error',
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?>
