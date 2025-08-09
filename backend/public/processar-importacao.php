<?php
/**
 * Processa importação de produtos no servidor
 * - Lê o arquivo salvo em storage
 * - Valida dados (subset das regras usadas no frontend)
 * - Atualiza a tabela importacao_produtos com progresso, erros e conclusão
 * - Objetivo: continuar mesmo se o cliente atualizar/fechar a página
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['success' => false, 'message' => 'Método não permitido']);
  exit();
}

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/supabase.php';

use PhpOffice\PhpSpreadsheet\IOFactory;

try {
  $input = json_decode(file_get_contents('php://input'), true);
  if (!$input) throw new Exception('JSON inválido');

  $importacaoId = $input['importacao_id'] ?? '';
  $empresaId = $input['empresa_id'] ?? '';
  $arquivoPath = $input['arquivo_path'] ?? '';

  if (!$importacaoId || !$empresaId || !$arquivoPath) {
    throw new Exception('Parâmetros obrigatórios ausentes');
  }

  // Atualiza status para processando
  supabaseRequest(
    $supabaseUrl . '/rest/v1/importacao_produtos?id=eq.' . urlencode($importacaoId),
    'PATCH',
    [
      'status' => 'processando',
      'etapa_atual' => 'lendo_arquivo',
      'mensagem_atual' => 'Lendo arquivo no servidor...',
      'progresso_percentual' => 10,
      'log_erros' => null,
      'linhas_sucesso' => 0,
      'linhas_erro' => 0
    ]
  );

  $baseDir = __DIR__ . '/../storage/planilhas_importacoes/';
  $fullPath = realpath($baseDir . $arquivoPath) ?: $baseDir . $arquivoPath;

  if (!file_exists($fullPath)) {
    throw new Exception('Arquivo não encontrado: ' . $arquivoPath);
  }

  // Carrega planilha
  $spreadsheet = IOFactory::load($fullPath);
  $worksheet = $spreadsheet->getSheet(0);
  $rows = [];
  foreach ($worksheet->toArray(null, true, true, true) as $idx => $row) {
    // Ignora cabeçalho (primeira linha)
    if ($idx === 1) continue;
    $rows[] = array_values($row);
  }

  if (count($rows) === 0) {
    throw new Exception('Planilha está vazia ou não contém dados válidos');
  }

  // Atualiza etapa de validação
  supabaseRequest(
    $supabaseUrl . '/rest/v1/importacao_produtos?id=eq.' . urlencode($importacaoId),
    'PATCH',
    [
      'total_linhas' => count($rows),
      'etapa_atual' => 'validando_dados',
      'mensagem_atual' => 'Validando dados (servidor)...',
      'progresso_percentual' => 20
    ]
  );

  // Buscar unidades de medida cadastradas (case-insensitive)
  $unidades = supabaseRequest(
    $supabaseUrl . '/rest/v1/unidade_medida?empresa_id=eq.' . urlencode($empresaId) . '&select=sigla'
  );
  $setUnidades = [];
  foreach ($unidades as $u) {
    if (!empty($u['sigla'])) {
      $setUnidades[strtoupper(trim((string)$u['sigla']))] = true;
    }
  }

  $erros = [];
  $linhasValidas = [];

  foreach ($rows as $i => $row) {
    $numeroLinha = $i + 2; // considerando cabeçalho

    $valorUnidade = isset($row[4]) ? trim((string)$row[4]) : '';
    $valorCodigo = isset($row[1]) ? trim((string)$row[1]) : '';
    $valorNome = isset($row[3]) ? trim((string)$row[3]) : '';
    $valorPrecoPadrao = isset($row[7]) ? trim((string)$row[7]) : '';

    // Unidade de Medida obrigatória com 2 chars
    if ($valorUnidade === '' || strlen($valorUnidade) !== 2) {
      $erros[] = [
        'linha' => $numeroLinha,
        'coluna' => 'Unidade de Medida',
        'colunaNumero' => 5,
        'valor' => $valorUnidade,
        'erro' => 'Unidade de medida deve ter exatamente 2 caracteres (Coluna 5, Linha ' . $numeroLinha . ')',
        'tipo' => 'tamanho'
      ];
    } else if (!isset($setUnidades[strtoupper($valorUnidade)])) {
      $lista = implode(', ', array_keys($setUnidades));
      $erros[] = [
        'linha' => $numeroLinha,
        'coluna' => 'Unidade de Medida',
        'colunaNumero' => 5,
        'valor' => $valorUnidade,
        'erro' => 'Unidade de medida não cadastrada na empresa. Unidades disponíveis: ' . ($lista ?: 'Nenhuma cadastrada') . ' (Coluna 5, Linha ' . $numeroLinha . ')',
        'tipo' => 'invalido'
      ];
    }

    // Código e Nome básicos (exemplos simples)
    if ($valorCodigo === '' || !preg_match('/^\d+$/', $valorCodigo)) {
      $erros[] = [
        'linha' => $numeroLinha,
        'coluna' => 'Código do Produto',
        'colunaNumero' => 2,
        'valor' => $valorCodigo,
        'erro' => 'Código deve conter apenas números, sem caracteres especiais (Coluna 2, Linha ' . $numeroLinha . ')',
        'tipo' => 'formato'
      ];
    }

    if ($valorNome === '') {
      $erros[] = [
        'linha' => $numeroLinha,
        'coluna' => 'Nome do Produto',
        'colunaNumero' => 4,
        'valor' => $valorNome,
        'erro' => 'Campo obrigatório não preenchido (Coluna 4, Linha ' . $numeroLinha . ')',
        'tipo' => 'obrigatorio'
      ];
    }

    // Preço padrão mínimo validação simples
    if ($valorPrecoPadrao === '' || !is_numeric(str_replace(',', '.', $valorPrecoPadrao))) {
      $erros[] = [
        'linha' => $numeroLinha,
        'coluna' => 'Preço Padrão',
        'colunaNumero' => 8,
        'valor' => $valorPrecoPadrao,
        'erro' => 'Deve ser um número válido maior ou igual a zero (pode ser 0,00) (Coluna 8, Linha ' . $numeroLinha . ')',
        'tipo' => 'formato'
      ];
    }

    if (empty($erros)) {
      $linhasValidas[] = $row;
    }
  }

  // Atualizar contadores
  supabaseRequest(
    $supabaseUrl . '/rest/v1/importacao_produtos?id=eq.' . urlencode($importacaoId),
    'PATCH',
    [
      'linhas_sucesso' => count($linhasValidas),
      'linhas_erro' => count($erros),
      'log_erros' => count($erros) > 0 ? $erros : null,
      'etapa_atual' => count($erros) > 0 ? 'erro' : 'processando_grupos',
      'mensagem_atual' => count($erros) > 0 ? ('Validação concluída com ' . count($erros) . ' erros') : 'Validação concluída. Processando grupos...',
      'progresso_percentual' => count($erros) > 0 ? 100 : 60
    ]
  );

  // Para este primeiro passo, finalizamos aqui e marcamos status final
  supabaseRequest(
    $supabaseUrl . '/rest/v1/importacao_produtos?id=eq.' . urlencode($importacaoId),
    'PATCH',
    [
      'status' => 'concluida',
      'etapa_atual' => 'finalizado',
      'mensagem_atual' => 'Processamento no servidor finalizado',
      'progresso_percentual' => 100
    ]
  );

  echo json_encode(['success' => true]);
} catch (Exception $e) {
  // Marca como processada com erro (não deixa em "processando")
  try {
    if (!empty($importacaoId)) {
      supabaseRequest(
        $supabaseUrl . '/rest/v1/importacao_produtos?id=eq.' . urlencode($importacaoId),
        'PATCH',
        [
          'status' => 'erro',
          'etapa_atual' => 'erro',
          'mensagem_atual' => 'Falha no processamento: ' . $e->getMessage(),
          'progresso_percentual' => 100
        ]
      );
    }
  } catch (Exception $inner) {}

  http_response_code(500);
  echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

