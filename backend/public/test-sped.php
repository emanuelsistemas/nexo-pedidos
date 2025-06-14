<?php
header('Content-Type: application/json');

require_once '../vendor/autoload.php';

try {
    // Testar se as classes existem
    $classes = [
        'NFePHP\NFe\Tools',
        'NFePHP\NFe\Make',
        'NFePHP\NFe\Complements'
    ];
    
    $resultado = [];
    
    foreach ($classes as $classe) {
        $resultado[$classe] = class_exists($classe);
    }
    
    echo json_encode([
        'success' => true,
        'classes' => $resultado,
        'autoload_path' => realpath('../vendor/autoload.php')
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
