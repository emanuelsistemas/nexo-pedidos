<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

try {
    // Receber dados JSON
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Dados inválidos');
    }
    
    $arquivoPath = $input['arquivo_path'] ?? '';
    $linha = $input['linha'] ?? 0;
    $coluna = $input['coluna'] ?? '';
    $novoValor = $input['novo_valor'] ?? '';
    $empresaId = $input['empresa_id'] ?? '';
    
    if (!$arquivoPath || !$linha || !$coluna || !$empresaId) {
        throw new Exception('Parâmetros obrigatórios não fornecidos');
    }
    
    // Verificar se arquivo existe
    $caminhoCompleto = "../storage/planilhas_importacoes/" . $arquivoPath;
    if (!file_exists($caminhoCompleto)) {
        throw new Exception('Arquivo não encontrado: ' . $arquivoPath);
    }
    
    // Mapear nome da coluna para índice (0-based)
    $mapeamentoColunas = [
        'GRUPO' => 0,
        'Código do Produto' => 1,
        'Código de Barras' => 2,
        'Nome do Produto' => 3,
        'Unidade de Medida' => 4,
        'Unidade fracionada' => 5,
        'Preço de Custo' => 6,
        'Preço Padrão' => 7,
        'Descrição Adicional' => 8,
        'Estoque Inicial' => 9,
        'Produto Alcoólico' => 10,
        'Este produto é Pizza?' => 11,
        'Matéria prima' => 12,
        'Produção' => 13,
        'NCM' => 14,
        'CFOP' => 15,
        'CSOSN/CST' => 16,
        'CEST' => 17,
        'Origem do Produto' => 18,
        'Alíquota ICMS (%)' => 19,
        'Alíquota PIS (%)' => 20,
        'Alíquota COFINS (%)' => 21,
        'Peso Líquido (kg)' => 22
    ];
    
    $indiceColuna = $mapeamentoColunas[$coluna] ?? null;
    if ($indiceColuna === null) {
        throw new Exception('Coluna não encontrada: ' . $coluna);
    }
    
    // Carregar planilha
    $spreadsheet = IOFactory::load($caminhoCompleto);
    $worksheet = $spreadsheet->getActiveSheet();
    
    // Converter linha para índice (1-based para 0-based, mas pular cabeçalho)
    $indiceLinha = $linha; // Linha já vem 1-based, mas precisa considerar cabeçalho
    
    // Verificar se a linha existe
    $highestRow = $worksheet->getHighestRow();
    if ($indiceLinha > $highestRow) {
        throw new Exception('Linha não encontrada: ' . $linha);
    }
    
    // Atualizar célula
    $worksheet->setCellValueByColumnAndRow($indiceColuna + 1, $indiceLinha, $novoValor);
    
    // Salvar arquivo
    $writer = new Xlsx($spreadsheet);
    $writer->save($caminhoCompleto);
    
    // Log da alteração
    $logPath = "../storage/planilhas_importacoes/edit.log";
    $logEntry = date('Y-m-d H:i:s') . " - Empresa: {$empresaId} - Arquivo: {$arquivoPath} - Linha: {$linha} - Coluna: {$coluna} - Novo valor: {$novoValor}\n";
    file_put_contents($logPath, $logEntry, FILE_APPEND | LOCK_EX);
    
    echo json_encode([
        'success' => true,
        'message' => 'Valor alterado com sucesso',
        'linha' => $linha,
        'coluna' => $coluna,
        'novo_valor' => $novoValor
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
