<?php
/**
 * Portal do Contador - Download de arquivos ZIP
 * 
 * Gera e serve arquivos ZIP com os XMLs organizados por período
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Obter dados da requisição
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

switch ($action) {
    case 'download_mes':
        downloadMes($input);
        break;
    
    case 'download_ano':
        downloadAno($input);
        break;
    
    case 'download_tipo':
        downloadTipo($input);
        break;
    
    default:
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Ação não especificada'
        ]);
        break;
}

/**
 * Download dos XMLs de um mês específico
 */
function downloadMes($input) {
    try {
        $empresaId = $input['empresa_id'] ?? '';
        $tipo = $input['tipo'] ?? '';
        $ano = $input['ano'] ?? '';
        $mes = $input['mes'] ?? '';
        
        if (empty($empresaId) || empty($tipo) || empty($ano) || empty($mes)) {
            throw new Exception('Parâmetros obrigatórios não informados');
        }
        
        $sourcePath = "../storage/xml/empresa_{$empresaId}/{$tipo}/{$ano}/{$mes}";
        
        if (!is_dir($sourcePath)) {
            throw new Exception('Pasta não encontrada');
        }
        
        // Verificar se existem arquivos XML
        $xmlFiles = glob("{$sourcePath}/*.xml");
        if (empty($xmlFiles)) {
            throw new Exception('Nenhum arquivo XML encontrado');
        }
        
        // Criar nome do arquivo ZIP
        $nomeEmpresa = sanitizeFilename(getEmpresaNome($empresaId));
        $nomeMes = getNomeMes($mes);
        $zipFilename = "{$nomeEmpresa}_{$tipo}_{$ano}_{$nomeMes}.zip";
        
        // Criar ZIP temporário
        $tempZipPath = sys_get_temp_dir() . '/' . uniqid('contador_') . '.zip';
        
        $zip = new ZipArchive();
        if ($zip->open($tempZipPath, ZipArchive::CREATE) !== TRUE) {
            throw new Exception('Erro ao criar arquivo ZIP');
        }
        
        // Adicionar arquivos XML ao ZIP
        foreach ($xmlFiles as $xmlFile) {
            $filename = basename($xmlFile);
            $zip->addFile($xmlFile, $filename);
        }
        
        // Adicionar relatório de resumo
        $relatorio = gerarRelatorioMes($xmlFiles, $tipo, $ano, $mes);
        $zip->addFromString('RELATORIO_' . strtoupper($nomeMes) . '_' . $ano . '.txt', $relatorio);
        
        $zip->close();
        
        // Verificar se o ZIP foi criado
        if (!file_exists($tempZipPath)) {
            throw new Exception('Erro ao gerar arquivo ZIP');
        }
        
        // Configurar headers para download
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="' . $zipFilename . '"');
        header('Content-Length: ' . filesize($tempZipPath));
        header('Cache-Control: no-cache, must-revalidate');
        header('Pragma: no-cache');
        
        // Enviar arquivo
        readfile($tempZipPath);
        
        // Limpar arquivo temporário
        unlink($tempZipPath);
        
    } catch (Exception $e) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
    }
}

/**
 * Download dos XMLs de um ano completo
 */
function downloadAno($input) {
    try {
        $empresaId = $input['empresa_id'] ?? '';
        $tipo = $input['tipo'] ?? '';
        $ano = $input['ano'] ?? '';
        
        if (empty($empresaId) || empty($tipo) || empty($ano)) {
            throw new Exception('Parâmetros obrigatórios não informados');
        }
        
        $sourcePath = "../storage/xml/empresa_{$empresaId}/{$tipo}/{$ano}";
        
        if (!is_dir($sourcePath)) {
            throw new Exception('Pasta não encontrada');
        }
        
        // Criar nome do arquivo ZIP
        $nomeEmpresa = sanitizeFilename(getEmpresaNome($empresaId));
        $zipFilename = "{$nomeEmpresa}_{$tipo}_{$ano}.zip";
        
        // Criar ZIP temporário
        $tempZipPath = sys_get_temp_dir() . '/' . uniqid('contador_') . '.zip';
        
        $zip = new ZipArchive();
        if ($zip->open($tempZipPath, ZipArchive::CREATE) !== TRUE) {
            throw new Exception('Erro ao criar arquivo ZIP');
        }
        
        // Adicionar todos os meses do ano
        $meses = scandir($sourcePath);
        $totalArquivos = 0;
        
        foreach ($meses as $mes) {
            if ($mes === '.' || $mes === '..' || !is_dir("{$sourcePath}/{$mes}")) {
                continue;
            }
            
            $xmlFiles = glob("{$sourcePath}/{$mes}/*.xml");
            
            foreach ($xmlFiles as $xmlFile) {
                $filename = $mes . '/' . basename($xmlFile);
                $zip->addFile($xmlFile, $filename);
                $totalArquivos++;
            }
        }
        
        if ($totalArquivos === 0) {
            throw new Exception('Nenhum arquivo XML encontrado');
        }
        
        // Adicionar relatório de resumo do ano
        $relatorio = gerarRelatorioAno($sourcePath, $tipo, $ano);
        $zip->addFromString('RELATORIO_' . $ano . '.txt', $relatorio);
        
        $zip->close();
        
        // Configurar headers para download
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="' . $zipFilename . '"');
        header('Content-Length: ' . filesize($tempZipPath));
        header('Cache-Control: no-cache, must-revalidate');
        header('Pragma: no-cache');
        
        // Enviar arquivo
        readfile($tempZipPath);
        
        // Limpar arquivo temporário
        unlink($tempZipPath);
        
    } catch (Exception $e) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
    }
}

/**
 * Gera relatório de resumo para um mês
 */
function gerarRelatorioMes($xmlFiles, $tipo, $ano, $mes) {
    $nomeMes = getNomeMes($mes);
    $totalArquivos = count($xmlFiles);
    
    $relatorio = "RELATÓRIO DE XMLs - {$tipo}\n";
    $relatorio .= "Período: {$nomeMes}/{$ano}\n";
    $relatorio .= "Total de arquivos: {$totalArquivos}\n";
    $relatorio .= "Data de geração: " . date('d/m/Y H:i:s') . "\n\n";
    
    $relatorio .= "LISTA DE ARQUIVOS:\n";
    $relatorio .= str_repeat("-", 50) . "\n";
    
    foreach ($xmlFiles as $xmlFile) {
        $filename = basename($xmlFile);
        $size = filesize($xmlFile);
        $date = date('d/m/Y H:i:s', filemtime($xmlFile));
        
        $relatorio .= sprintf("%-40s %10s %s\n", 
            $filename, 
            formatBytes($size), 
            $date
        );
    }
    
    return $relatorio;
}

/**
 * Gera relatório de resumo para um ano
 */
function gerarRelatorioAno($sourcePath, $tipo, $ano) {
    $relatorio = "RELATÓRIO DE XMLs - {$tipo}\n";
    $relatorio .= "Período: {$ano}\n";
    $relatorio .= "Data de geração: " . date('d/m/Y H:i:s') . "\n\n";
    
    $meses = scandir($sourcePath);
    $totalGeral = 0;
    
    foreach ($meses as $mes) {
        if ($mes === '.' || $mes === '..' || !is_dir("{$sourcePath}/{$mes}")) {
            continue;
        }
        
        $xmlFiles = glob("{$sourcePath}/{$mes}/*.xml");
        $totalMes = count($xmlFiles);
        $totalGeral += $totalMes;
        
        $nomeMes = getNomeMes($mes);
        $relatorio .= sprintf("%-15s: %d arquivos\n", $nomeMes, $totalMes);
    }
    
    $relatorio .= str_repeat("-", 30) . "\n";
    $relatorio .= sprintf("%-15s: %d arquivos\n", "TOTAL", $totalGeral);
    
    return $relatorio;
}

/**
 * Obtém o nome da empresa
 */
function getEmpresaNome($empresaId) {
    // Aqui você pode buscar no banco de dados se necessário
    // Por simplicidade, retornando um nome genérico
    return "Empresa_{$empresaId}";
}

/**
 * Converte número do mês para nome
 */
function getNomeMes($mes) {
    $meses = [
        '01' => 'Janeiro', '02' => 'Fevereiro', '03' => 'Março',
        '04' => 'Abril', '05' => 'Maio', '06' => 'Junho',
        '07' => 'Julho', '08' => 'Agosto', '09' => 'Setembro',
        '10' => 'Outubro', '11' => 'Novembro', '12' => 'Dezembro'
    ];
    
    return $meses[$mes] ?? $mes;
}

/**
 * Sanitiza nome de arquivo
 */
function sanitizeFilename($filename) {
    return preg_replace('/[^a-zA-Z0-9_-]/', '_', $filename);
}

/**
 * Formata bytes em formato legível
 */
function formatBytes($bytes, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB'];
    
    for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
        $bytes /= 1024;
    }
    
    return round($bytes, $precision) . ' ' . $units[$i];
}
?>
