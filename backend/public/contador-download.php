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

    case 'download_mes_completo':
        downloadMesCompleto($input);
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
 * Download completo dos XMLs de um mês (todos os tipos juntos)
 */
function downloadMesCompleto($input) {
    try {
        $empresaId = $input['empresa_id'] ?? '';
        $ano = $input['ano'] ?? '';
        $mes = $input['mes'] ?? '';
        $modelo = $input['modelo'] ?? 'todos';

        if (empty($empresaId) || empty($ano) || empty($mes)) {
            throw new Exception('Parâmetros obrigatórios não informados');
        }

        // PORTAL DO CONTADOR: APENAS ARQUIVOS DE PRODUÇÃO
        $basePath = "../storage/xml/empresa_{$empresaId}/producao";

        if (!is_dir($basePath)) {
            throw new Exception('Pasta de PRODUÇÃO da empresa não encontrada');
        }

        // Criar nome do arquivo ZIP
        $nomeEmpresa = sanitizeFilename("Empresa_{$empresaId}");
        $nomeMes = getNomeMes($mes);
        $sufixoModelo = $modelo === 'todos' ? '' : "_NFe{$modelo}";
        $zipFilename = "{$nomeEmpresa}_{$ano}_{$nomeMes}{$sufixoModelo}.zip";

        // Criar ZIP temporário
        $tempZipPath = sys_get_temp_dir() . '/' . uniqid('contador_') . '.zip';

        $zip = new ZipArchive();
        if ($zip->open($tempZipPath, ZipArchive::CREATE) !== TRUE) {
            throw new Exception('Erro ao criar arquivo ZIP');
        }

        $totalArquivos = 0;
        $tipos = ['Autorizados', 'Cancelados', 'CCe'];

        // Adicionar arquivos de cada tipo
        foreach ($tipos as $tipo) {
            $tipoPath = "{$basePath}/{$tipo}/{$ano}/{$mes}";

            if (is_dir($tipoPath)) {
                $xmlFiles = glob("{$tipoPath}/*.xml");

                foreach ($xmlFiles as $xmlFile) {
                    // Filtrar por modelo se especificado
                    if ($modelo !== 'todos') {
                        $modeloXML = extrairModeloXML($xmlFile);
                        if ($modeloXML !== $modelo) {
                            continue; // Pular este arquivo
                        }
                    }

                    $filename = "{$tipo}/" . basename($xmlFile);
                    $zip->addFile($xmlFile, $filename);
                    $totalArquivos++;
                }
            }
        }

        if ($totalArquivos === 0) {
            throw new Exception('Nenhum arquivo XML encontrado para este período');
        }

        // Adicionar relatório de resumo
        $relatorio = gerarRelatorioMesCompleto($basePath, $ano, $mes, $tipos, $modelo);
        $sufixoRelatorio = $modelo === 'todos' ? '' : "_NFe{$modelo}";
        $zip->addFromString('RELATORIO_' . strtoupper($nomeMes) . '_' . $ano . $sufixoRelatorio . '.txt', $relatorio);

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
        
        // PORTAL DO CONTADOR: APENAS ARQUIVOS DE PRODUÇÃO
        $sourcePath = "../storage/xml/empresa_{$empresaId}/producao/{$tipo}/{$ano}/{$mes}";

        if (!is_dir($sourcePath)) {
            throw new Exception('Pasta de PRODUÇÃO não encontrada');
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
        
        // PORTAL DO CONTADOR: APENAS ARQUIVOS DE PRODUÇÃO
        $sourcePath = "../storage/xml/empresa_{$empresaId}/producao/{$tipo}/{$ano}";

        if (!is_dir($sourcePath)) {
            throw new Exception('Pasta de PRODUÇÃO não encontrada');
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
 * Gera relatório de resumo para um mês completo (todos os tipos)
 */
function gerarRelatorioMesCompleto($basePath, $ano, $mes, $tipos, $modelo = 'todos') {
    $nomeMes = getNomeMes($mes);
    $totalGeralArquivos = 0;
    $totalGeralValor = 0;

    $tituloModelo = $modelo === 'todos' ? 'COMPLETO' : "NFe MODELO {$modelo}";
    $relatorio = "RELATÓRIO {$tituloModelo} DE XMLs\n";
    $relatorio .= "Período: {$nomeMes}/{$ano}\n";
    if ($modelo !== 'todos') {
        $relatorio .= "Filtro: NFe Modelo {$modelo}\n";
    }
    $relatorio .= "Data de geração: " . date('d/m/Y H:i:s') . "\n";
    $relatorio .= str_repeat("=", 80) . "\n\n";

    foreach ($tipos as $tipo) {
        $tipoPath = "{$basePath}/{$tipo}/{$ano}/{$mes}";

        if (is_dir($tipoPath)) {
            $xmlFiles = glob("{$tipoPath}/*.xml");
            $totalTipo = count($xmlFiles);
            $totalValorTipo = 0;
            $totalGeralArquivos += $totalTipo;

            $relatorio .= "=== {$tipo} ===\n";
            $relatorio .= "Total: {$totalTipo} arquivos\n";

            if ($totalTipo > 0) {
                $relatorio .= sprintf("%-12s %-40s %-15s %-12s %s\n",
                    "Número", "Arquivo", "Valor (R$)", "Tamanho", "Data"
                );
                $relatorio .= str_repeat("-", 80) . "\n";

                foreach ($xmlFiles as $xmlFile) {
                    // Filtrar por modelo se especificado
                    if ($modelo !== 'todos') {
                        $modeloXML = extrairModeloXML($xmlFile);
                        if ($modeloXML !== $modelo) {
                            continue; // Pular este arquivo
                        }
                    }

                    $filename = basename($xmlFile);
                    $size = filesize($xmlFile);
                    $date = date('d/m/Y H:i:s', filemtime($xmlFile));

                    // Extrair dados do XML
                    $dadosXML = extrairDadosXML($xmlFile);
                    $numeroNFe = $dadosXML['numero'] ?? 'N/A';
                    $valorNFe = $dadosXML['valor'] ?? 0;

                    // Somar valor apenas para Autorizados (NFe válidas)
                    if ($tipo === 'Autorizados') {
                        $totalValorTipo += $valorNFe;
                    }

                    $relatorio .= sprintf("%-12s %-40s R$ %-11s %-12s %s\n",
                        $numeroNFe,
                        $filename,
                        number_format($valorNFe, 2, ',', '.'),
                        formatBytes($size),
                        $date
                    );
                }

                $relatorio .= str_repeat("-", 80) . "\n";

                // Mostrar total do tipo apenas para Autorizados
                if ($tipo === 'Autorizados' && $totalValorTipo > 0) {
                    $relatorio .= sprintf("TOTAL %s: %d arquivos - R$ %s\n",
                        $tipo,
                        $totalTipo,
                        number_format($totalValorTipo, 2, ',', '.')
                    );
                    $totalGeralValor += $totalValorTipo;
                } else {
                    $relatorio .= sprintf("TOTAL %s: %d arquivos\n", $tipo, $totalTipo);
                }
            } else {
                $relatorio .= "  Nenhum arquivo encontrado\n";
            }

            $relatorio .= "\n";
        }
    }

    $relatorio .= str_repeat("=", 80) . "\n";
    $relatorio .= sprintf("RESUMO GERAL:\n");
    $relatorio .= sprintf("Total de arquivos: %d\n", $totalGeralArquivos);
    if ($totalGeralValor > 0) {
        $relatorio .= sprintf("Valor total das NFe Autorizadas: R$ %s\n",
            number_format($totalGeralValor, 2, ',', '.')
        );
    }
    $relatorio .= str_repeat("=", 80) . "\n";

    return $relatorio;
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
 * Extrai dados importantes do XML (número e valor da NFe)
 */
function extrairDadosXML($xmlFile) {
    try {
        // Carregar XML com namespace
        $xmlContent = file_get_contents($xmlFile);
        if (!$xmlContent) {
            return ['numero' => 'N/A', 'valor' => 0];
        }

        $xml = simplexml_load_string($xmlContent);

        if (!$xml) {
            return ['numero' => 'N/A', 'valor' => 0];
        }

        $dados = ['numero' => 'N/A', 'valor' => 0];

        // Registrar namespace se necessário
        $namespaces = $xml->getNamespaces(true);
        if (isset($namespaces[''])) {
            $xml->registerXPathNamespace('nfe', $namespaces['']);
        }

        // Tentar diferentes formas de acessar os dados

        // Método 1: Acesso direto (sem namespace)
        if (isset($xml->infNFe->ide->nNF)) {
            $dados['numero'] = (string)$xml->infNFe->ide->nNF;
        }
        if (isset($xml->infNFe->total->ICMSTot->vNF)) {
            $dados['valor'] = (float)$xml->infNFe->total->ICMSTot->vNF;
        }

        // Método 2: Se não encontrou, tentar com xpath
        if ($dados['numero'] === 'N/A') {
            $numeroNodes = $xml->xpath('//nNF');
            if (!empty($numeroNodes)) {
                $dados['numero'] = (string)$numeroNodes[0];
            }
        }

        if ($dados['valor'] === 0) {
            $valorNodes = $xml->xpath('//vNF');
            if (!empty($valorNodes)) {
                $dados['valor'] = (float)$valorNodes[0];
            }
        }

        // Método 3: Busca por regex se xpath falhar
        if ($dados['numero'] === 'N/A') {
            if (preg_match('/<nNF>(\d+)<\/nNF>/', $xmlContent, $matches)) {
                $dados['numero'] = $matches[1];
            }
        }

        if ($dados['valor'] === 0) {
            if (preg_match('/<vNF>([\d.,]+)<\/vNF>/', $xmlContent, $matches)) {
                $dados['valor'] = (float)str_replace(',', '.', $matches[1]);
            }
        }

        return $dados;

    } catch (Exception $e) {
        error_log("Erro ao extrair dados do XML {$xmlFile}: " . $e->getMessage());
        return ['numero' => 'ERRO', 'valor' => 0];
    }
}

/**
 * Extrai o modelo da NFe do XML (55 ou 65)
 */
function extrairModeloXML($xmlFile) {
    try {
        $xmlContent = file_get_contents($xmlFile);
        if (!$xmlContent) {
            return '55'; // Default para modelo 55
        }

        // Buscar por regex o campo <mod>
        if (preg_match('/<mod>(\d+)<\/mod>/', $xmlContent, $matches)) {
            return $matches[1];
        }

        // Se não encontrar, assumir modelo 55 (padrão)
        return '55';

    } catch (Exception $e) {
        return '55'; // Default em caso de erro
    }
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
