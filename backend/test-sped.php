<?php
echo "=== TESTE DA BIBLIOTECA SPED-NFE ===\n";

// Verificar se o autoload existe
if (file_exists('vendor/autoload.php')) {
    echo "✅ Autoload encontrado\n";
    require_once 'vendor/autoload.php';
} else {
    echo "❌ Autoload não encontrado\n";
    exit(1);
}

// Verificar classes principais
echo "\nClasses principais:\n";
$classes = [
    'NFePHP\NFe\Tools',
    'NFePHP\NFe\Make',
    'NFePHP\Common\Certificate'
];

foreach ($classes as $class) {
    echo "- $class: " . (class_exists($class) ? "✅ OK" : "❌ ERRO") . "\n";
}

// Verificar extensões PHP
echo "\nExtensões PHP:\n";
$extensoes = ['openssl', 'curl', 'json', 'mbstring', 'xml', 'soap', 'zip'];
foreach ($extensoes as $ext) {
    echo "- $ext: " . (extension_loaded($ext) ? "✅ OK" : "❌ FALTANDO") . "\n";
}

// Verificar diretórios
echo "\nDiretórios de storage:\n";
$dirs = ['certificados', 'xml', 'pdf', 'logs'];
foreach ($dirs as $dir) {
    $path = "storage/$dir";
    $status = is_dir($path) && is_writable($path) ? "✅ OK" : "❌ ERRO";
    echo "- $dir: $status\n";
}

echo "\n🚀 Teste concluído!\n";
?>
