<?php
// Script para limpar o OPcache
if (function_exists('opcache_reset')) {
    if (opcache_reset()) {
        echo "OPcache limpo com sucesso!\n";
    } else {
        echo "Erro ao limpar OPcache!\n";
    }
} else {
    echo "OPcache não está disponível!\n";
}

// Mostrar status do OPcache
if (function_exists('opcache_get_status')) {
    $status = opcache_get_status();
    echo "OPcache Status: " . ($status['opcache_enabled'] ? 'Ativo' : 'Inativo') . "\n";
    if ($status['opcache_enabled']) {
        echo "Arquivos em cache: " . $status['opcache_statistics']['num_cached_scripts'] . "\n";
        echo "Memória usada: " . round($status['memory_usage']['used_memory'] / 1024 / 1024, 2) . " MB\n";
    }
}
?>
