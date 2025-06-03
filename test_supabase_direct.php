<?php
// Teste direto do SupabaseService
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== TESTE SUPABASE SERVICE ===\n";

try {
    // Tentar carregar o SupabaseService
    require_once '/var/www/nfe-api/src/Services/SupabaseService.php';
    echo "✅ SupabaseService carregado\n";
    
    // Tentar instanciar
    $supabase = new \NexoNFe\Services\SupabaseService();
    echo "✅ SupabaseService instanciado\n";
    
    // Tentar buscar empresa
    $empresa = $supabase->buscarEmpresa('acd26a4f-7220-405e-9c96-faffb7e6480e');
    echo "✅ Empresa encontrada: " . $empresa['razao_social'] . "\n";
    
    // Tentar baixar certificado
    if (!empty($empresa['certificado_digital_path'])) {
        $cert = $supabase->baixarCertificado($empresa['certificado_digital_path']);
        echo "✅ Certificado baixado: " . strlen($cert) . " bytes\n";
    }
    
    echo "🎉 TESTE CONCLUÍDO COM SUCESSO!\n";
    
} catch (Exception $e) {
    echo "❌ ERRO: " . $e->getMessage() . "\n";
    echo "Stack: " . $e->getTraceAsString() . "\n";
}
?>
