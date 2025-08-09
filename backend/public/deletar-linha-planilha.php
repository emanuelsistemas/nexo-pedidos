<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit();
}

// Garantir que warnings virem exceções para responder sempre em JSON
set_error_handler(function ($severity, $message, $file, $line) {
  throw new ErrorException($message, 0, $severity, $file, $line);
});

require_once dirname(__DIR__) . '/vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

try {
  $input = json_decode(file_get_contents('php://input'), true);
  if (!$input) {
    throw new Exception('Dados inválidos');
  }

  $arquivoPath = $input['arquivo_path'] ?? '';
  $linha = intval($input['linha'] ?? 0);
  $empresaId = $input['empresa_id'] ?? '';

  if (!$arquivoPath || !$linha || !$empresaId) {
    throw new Exception('Parâmetros obrigatórios não fornecidos');
  }

  if ($linha < 2) {
    throw new Exception('Não é permitido deletar o cabeçalho (linha 1)');
  }

  // Base consistente com outros endpoints
  $baseDir = realpath(dirname(__DIR__) . '/storage/planilhas_importacoes');
  if ($baseDir === false) {
    throw new Exception('Diretório base não encontrado');
  }

  $caminhoCompleto = $baseDir . '/' . $arquivoPath;
  // Segurança: impedir path traversal
  $real = realpath($caminhoCompleto);
  if ($real === false || strpos($real, $baseDir) !== 0) {
    // se realpath falhar por o arquivo ainda não existir (não é o caso aqui), caímos no exists abaixo
    $real = $caminhoCompleto;
  }

  if (!file_exists($real)) {
    throw new Exception('Arquivo não encontrado: ' . $arquivoPath);
  }

  // Carregar e remover linha
  $spreadsheet = IOFactory::load($real);
  $sheet = $spreadsheet->getSheet(0);
  $sheet->removeRow($linha, 1);

  // Salvar
  $writer = new Xlsx($spreadsheet);
  $writer->save($real);

  echo json_encode([
    'success' => true,
    'message' => 'Linha removida com sucesso',
    'linha' => $linha,
    'arquivo' => $arquivoPath,
  ]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
