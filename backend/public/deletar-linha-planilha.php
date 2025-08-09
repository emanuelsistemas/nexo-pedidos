<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  exit(0);
}

require_once __DIR__ . '/../vendor/autoload.php';

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

  // Segurança básica: caminho precisa apontar para diretório permitido
  $baseDir = realpath(__DIR__ . '/../storage/planilhas_importacoes');
  $fullPath = realpath($baseDir . '/' . $arquivoPath);
  if (!$fullPath || strpos($fullPath, $baseDir) !== 0) {
    throw new Exception('Caminho do arquivo inválido');
  }

  if (!file_exists($fullPath)) {
    throw new Exception('Arquivo não encontrado: ' . $arquivoPath);
  }

  // Carregar
  $spreadsheet = IOFactory::load($fullPath);
  $sheet = $spreadsheet->getSheet(0);

  // Remover a linha (1-based no Excel)
  $sheet->removeRow($linha, 1);

  // Salvar
  $writer = new Xlsx($spreadsheet);
  $writer->save($fullPath);

  echo json_encode([
    'success' => true,
    'message' => 'Linha removida com sucesso',
    'linha' => $linha,
    'arquivo' => $arquivoPath,
  ]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

