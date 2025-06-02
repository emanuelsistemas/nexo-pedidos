<?php

// Teste do SupabaseService
require_once 'SupabaseService.php';

use NexoNFe\Services\SupabaseService;

try {
    echo "🔍 Testando SupabaseService...\n";
    
    // Inicializar serviço
    $supabase = new SupabaseService();
    echo "✅ SupabaseService inicializado\n";
    
    // Testar busca de empresa
    $empresaId = 'acd26a4f-7220-405e-9c96-faffb7e6480e';
    echo "🔍 Buscando empresa: $empresaId\n";
    
    $empresa = $supabase->buscarEmpresa($empresaId);
    
    if ($empresa) {
        echo "✅ Empresa encontrada:\n";
        echo "   - ID: " . $empresa['id'] . "\n";
        echo "   - Razão Social: " . ($empresa['razao_social'] ?? 'N/A') . "\n";
        echo "   - CNPJ: " . ($empresa['documento'] ?? 'N/A') . "\n";
        echo "   - Certificado Path: " . ($empresa['certificado_digital_path'] ?? 'N/A') . "\n";
        echo "   - Certificado Status: " . ($empresa['certificado_digital_status'] ?? 'N/A') . "\n";
        
        // Testar download de certificado se existir
        if (!empty($empresa['certificado_digital_path'])) {
            echo "🔍 Testando download de certificado...\n";
            try {
                $certificado = $supabase->baixarCertificado($empresa['certificado_digital_path']);
                echo "✅ Certificado baixado - Tamanho: " . strlen($certificado) . " bytes\n";
            } catch (Exception $e) {
                echo "❌ Erro ao baixar certificado: " . $e->getMessage() . "\n";
            }
        } else {
            echo "⚠️ Certificado não configurado para esta empresa\n";
        }
        
    } else {
        echo "❌ Empresa não encontrada\n";
    }
    
} catch (Exception $e) {
    echo "❌ ERRO: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}

echo "\n🏁 Teste concluído\n";

?>
