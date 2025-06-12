<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('max_execution_time', 10);

echo "=== TESTE BIBLIOTECA APENAS ===\n";

try {
    echo "1. Carregando autoload...\n";
    require_once '../vendor/autoload.php';
    echo "1. ✅ Autoload carregado\n";
    
    echo "2. Criando Make...\n";
    $make = new \NFePHP\NFe\Make();
    echo "2. ✅ Make criado\n";
    
    echo "3. Testando tag IDE simples...\n";
    $std = new stdClass();
    $std->cUF = 35;
    $std->cNF = '87654321'; // ✅ CORRETO: Diferente do nNF (seguindo NT2019.001)
    $std->natOp = 'Venda';
    $std->mod = 65;
    $std->serie = 1;
    $std->nNF = 1; // ✅ CORRETO: Diferente do cNF
    $std->dhEmi = date('Y-m-d\TH:i:sP');
    $std->tpNF = 1;
    $std->idDest = 1;
    $std->cMunFG = 3550308;
    $std->tpImp = 4;
    $std->tpEmis = 1;
    $std->cDV = 0;
    $std->tpAmb = 2;
    $std->finNFe = 1;
    $std->indFinal = 1;
    $std->indPres = 1;
    $std->procEmi = 0;
    $std->verProc = '1.0.0';
    
    $make->tagide($std);
    echo "3. ✅ IDE criada\n";
    
    echo "4. Testando emitente simples...\n";
    $std = new stdClass();
    $std->xNome = 'EMPRESA TESTE';
    $std->CNPJ = '11222333000181';
    $std->IE = '123456789';
    $std->CRT = 1;
    
    $make->tagemit($std);
    echo "4. ✅ Emitente criado\n";
    
    echo "\n=== BIBLIOTECA FUNCIONANDO ===\n";
    
} catch (Exception $e) {
    echo "❌ ERRO: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
} catch (Error $e) {
    echo "❌ ERRO FATAL: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}
?>
