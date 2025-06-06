<?php
/**
 * Portal do Contador - Geração de Relatórios PDF
 * 
 * Gera relatórios PDF com totais diários das NFe
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../vendor/autoload.php';

use Dompdf\Dompdf;
use Dompdf\Options;

// Obter dados da requisição
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

switch ($action) {
    case 'relatorio_mes':
        gerarRelatorioMes($input);
        break;
    
    case 'relatorio_ano':
        gerarRelatorioAno($input);
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
 * Gera relatório PDF de um mês específico
 */
function gerarRelatorioMes($input) {
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
        
        // Buscar todos os XMLs do mês
        $xmlFiles = glob("{$sourcePath}/*.xml");
        
        if (empty($xmlFiles)) {
            throw new Exception('Nenhum arquivo XML encontrado');
        }
        
        // Processar XMLs e agrupar por dia
        $dadosPorDia = processarXMLsPorDia($xmlFiles);
        
        // Gerar HTML do relatório
        $html = gerarHTMLRelatorio($dadosPorDia, $tipo, $ano, $mes, $empresaId);
        
        // Configurar Dompdf
        $options = new Options();
        $options->set('defaultFont', 'Arial');
        $options->set('isRemoteEnabled', true);
        
        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();
        
        // Configurar headers para download
        $nomeMes = getNomeMes($mes);
        $filename = "Relatorio_{$tipo}_{$nomeMes}_{$ano}.pdf";
        
        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: no-cache, must-revalidate');
        header('Pragma: no-cache');
        
        // Enviar PDF
        echo $dompdf->output();
        
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
 * Processa XMLs e agrupa por dia
 */
function processarXMLsPorDia($xmlFiles) {
    $dadosPorDia = [];
    
    foreach ($xmlFiles as $xmlFile) {
        try {
            $xml = simplexml_load_file($xmlFile);
            
            if (!$xml) {
                continue;
            }
            
            // Extrair data de emissão
            $dataEmissao = '';
            if (isset($xml->NFe->infNFe->ide->dhEmi)) {
                $dataEmissao = (string)$xml->NFe->infNFe->ide->dhEmi;
            } elseif (isset($xml->NFe->infNFe->ide->dEmi)) {
                $dataEmissao = (string)$xml->NFe->infNFe->ide->dEmi;
            }
            
            if (empty($dataEmissao)) {
                continue;
            }
            
            // Converter para data
            $data = date('Y-m-d', strtotime($dataEmissao));
            $dataFormatada = date('d/m/Y', strtotime($dataEmissao));
            
            // Extrair valor total
            $valorTotal = 0;
            if (isset($xml->NFe->infNFe->total->ICMSTot->vNF)) {
                $valorTotal = (float)$xml->NFe->infNFe->total->ICMSTot->vNF;
            }
            
            // Extrair número da NFe
            $numeroNFe = '';
            if (isset($xml->NFe->infNFe->ide->nNF)) {
                $numeroNFe = (string)$xml->NFe->infNFe->ide->nNF;
            }
            
            // Extrair chave de acesso
            $chaveAcesso = '';
            if (isset($xml->NFe->infNFe['Id'])) {
                $chaveAcesso = str_replace('NFe', '', (string)$xml->NFe->infNFe['Id']);
            }
            
            // Agrupar por dia
            if (!isset($dadosPorDia[$data])) {
                $dadosPorDia[$data] = [
                    'data' => $dataFormatada,
                    'nfes' => [],
                    'total_valor' => 0,
                    'total_nfes' => 0
                ];
            }
            
            $dadosPorDia[$data]['nfes'][] = [
                'numero' => $numeroNFe,
                'chave' => $chaveAcesso,
                'valor' => $valorTotal,
                'arquivo' => basename($xmlFile)
            ];
            
            $dadosPorDia[$data]['total_valor'] += $valorTotal;
            $dadosPorDia[$data]['total_nfes']++;
            
        } catch (Exception $e) {
            // Ignorar XMLs com erro
            continue;
        }
    }
    
    // Ordenar por data
    ksort($dadosPorDia);
    
    return $dadosPorDia;
}

/**
 * Gera HTML do relatório
 */
function gerarHTMLRelatorio($dadosPorDia, $tipo, $ano, $mes, $empresaId) {
    $nomeMes = getNomeMes($mes);
    $totalGeral = array_sum(array_column($dadosPorDia, 'total_valor'));
    $totalNFes = array_sum(array_column($dadosPorDia, 'total_nfes'));
    
    $html = '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Relatório de NFe</title>
        <style>
            body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .header h1 { margin: 0; color: #333; }
            .header p { margin: 5px 0; color: #666; }
            .info-box { background: #f5f5f5; padding: 10px; margin-bottom: 20px; border-radius: 5px; }
            .day-section { margin-bottom: 20px; page-break-inside: avoid; }
            .day-header { background: #e0e0e0; padding: 8px; font-weight: bold; border-radius: 3px; }
            .nfe-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .nfe-table th, .nfe-table td { border: 1px solid #ddd; padding: 6px; text-align: left; }
            .nfe-table th { background: #f0f0f0; font-weight: bold; }
            .total-row { background: #f9f9f9; font-weight: bold; }
            .summary { background: #e8f4f8; padding: 15px; margin-top: 30px; border-radius: 5px; }
            .summary h3 { margin-top: 0; color: #2c5aa0; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Relatório de Notas Fiscais Eletrônicas</h1>
            <p><strong>Tipo:</strong> ' . $tipo . '</p>
            <p><strong>Período:</strong> ' . $nomeMes . '/' . $ano . '</p>
            <p><strong>Data de Geração:</strong> ' . date('d/m/Y H:i:s') . '</p>
        </div>
        
        <div class="info-box">
            <strong>Resumo Geral:</strong><br>
            Total de NFe: ' . $totalNFes . '<br>
            Valor Total: R$ ' . number_format($totalGeral, 2, ',', '.') . '<br>
            Dias com emissão: ' . count($dadosPorDia) . '
        </div>';
    
    foreach ($dadosPorDia as $data => $dadosDia) {
        $html .= '
        <div class="day-section">
            <div class="day-header">
                ' . $dadosDia['data'] . ' - ' . $dadosDia['total_nfes'] . ' NFe(s) - Total: R$ ' . number_format($dadosDia['total_valor'], 2, ',', '.') . '
            </div>
            <table class="nfe-table">
                <thead>
                    <tr>
                        <th>Número</th>
                        <th>Chave de Acesso</th>
                        <th>Valor (R$)</th>
                        <th>Arquivo</th>
                    </tr>
                </thead>
                <tbody>';
        
        foreach ($dadosDia['nfes'] as $nfe) {
            $html .= '
                    <tr>
                        <td>' . $nfe['numero'] . '</td>
                        <td>' . $nfe['chave'] . '</td>
                        <td>R$ ' . number_format($nfe['valor'], 2, ',', '.') . '</td>
                        <td>' . $nfe['arquivo'] . '</td>
                    </tr>';
        }
        
        $html .= '
                    <tr class="total-row">
                        <td colspan="2"><strong>Total do Dia</strong></td>
                        <td><strong>R$ ' . number_format($dadosDia['total_valor'], 2, ',', '.') . '</strong></td>
                        <td><strong>' . $dadosDia['total_nfes'] . ' NFe(s)</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>';
    }
    
    $html .= '
        <div class="summary">
            <h3>Resumo Final</h3>
            <p><strong>Total de NFe no período:</strong> ' . $totalNFes . '</p>
            <p><strong>Valor total no período:</strong> R$ ' . number_format($totalGeral, 2, ',', '.') . '</p>
            <p><strong>Valor médio por NFe:</strong> R$ ' . number_format($totalNFes > 0 ? $totalGeral / $totalNFes : 0, 2, ',', '.') . '</p>
        </div>
        
        <div class="footer">
            <p>Relatório gerado pelo Sistema Nexo PDV - Portal do Contador</p>
            <p>Este documento contém informações confidenciais e deve ser tratado com sigilo</p>
        </div>
    </body>
    </html>';
    
    return $html;
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
?>
