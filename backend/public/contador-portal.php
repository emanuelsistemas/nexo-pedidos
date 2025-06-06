<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

switch ($action) {
    case 'buscar_empresa':
        buscarEmpresa($input);
        break;

    case 'listar_estrutura':
        listarEstrutura($input);
        break;

    default:
        echo json_encode([
            'success' => false,
            'message' => 'Ação não especificada'
        ]);
        break;
}

/**
 * Busca empresa pelo CNPJ
 */
function buscarEmpresa($input) {
    try {
        $cnpj = $input['cnpj'] ?? '';

        if (empty($cnpj)) {
            throw new Exception('CNPJ não informado');
        }

        // Remover formatação do CNPJ
        $cnpjLimpo = preg_replace('/\D/', '', $cnpj);

        if (strlen($cnpjLimpo) !== 14) {
            throw new Exception('CNPJ deve conter 14 dígitos');
        }

        // Mapeamento direto CNPJ -> ID da empresa (baseado nos dados que já temos)
        $empresas = [
            '24163237000151' => [
                'id' => 'acd26a4f-7220-405e-9c96-faffb7e6480e',
                'nome' => 'Empresa Teste',
                'razao_social' => 'Empresa Teste LTDA',
                'nome_fantasia' => 'Empresa Teste'
            ]
        ];

        if (!isset($empresas[$cnpjLimpo])) {
            throw new Exception('Empresa não encontrada');
        }

        $empresa = $empresas[$cnpjLimpo];

        // Verificar se existe pasta de XMLs para esta empresa
        $empresaId = $empresa['id'];
        $xmlPath = "../storage/xml/empresa_{$empresaId}";

        if (!is_dir($xmlPath)) {
            throw new Exception('Nenhum arquivo XML encontrado para esta empresa');
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'id' => $empresa['id'],
                'nome' => $empresa['nome'],
                'cnpj' => $cnpjLimpo,
                'razao_social' => $empresa['razao_social'],
                'nome_fantasia' => $empresa['nome_fantasia'],
                'xml_path' => $xmlPath
            ]
        ]);

    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
    }
}

/**
 * Lista a estrutura de pastas (anos/meses) disponíveis
 */
function listarEstrutura($input) {
    try {
        $empresaId = $input['empresa_id'] ?? '';
        
        if (empty($empresaId)) {
            throw new Exception('ID da empresa não informado');
        }
        
        $xmlPath = "../storage/xml/empresa_{$empresaId}";
        
        if (!is_dir($xmlPath)) {
            throw new Exception('Pasta de XMLs não encontrada');
        }
        
        $estrutura = [];
        $tipos = ['Autorizados', 'Cancelados', 'CCe'];
        
        foreach ($tipos as $tipo) {
            $tipoPath = "{$xmlPath}/{$tipo}";
            
            if (is_dir($tipoPath)) {
                $anos = [];
                
                // Listar anos
                $anosDir = scandir($tipoPath);
                foreach ($anosDir as $ano) {
                    if ($ano === '.' || $ano === '..' || !is_dir("{$tipoPath}/{$ano}")) {
                        continue;
                    }
                    
                    $meses = [];
                    
                    // Listar meses
                    $mesesDir = scandir("{$tipoPath}/{$ano}");
                    foreach ($mesesDir as $mes) {
                        if ($mes === '.' || $mes === '..' || !is_dir("{$tipoPath}/{$ano}/{$mes}")) {
                            continue;
                        }
                        
                        // Contar arquivos XML no mês
                        $arquivos = glob("{$tipoPath}/{$ano}/{$mes}/*.xml");
                        $totalArquivos = count($arquivos);
                        
                        if ($totalArquivos > 0) {
                            $meses[] = [
                                'mes' => $mes,
                                'nome_mes' => getNomeMes($mes),
                                'total_arquivos' => $totalArquivos,
                                'path' => "{$tipoPath}/{$ano}/{$mes}"
                            ];
                        }
                    }
                    
                    if (!empty($meses)) {
                        // Ordenar meses
                        usort($meses, function($a, $b) {
                            return (int)$a['mes'] - (int)$b['mes'];
                        });
                        
                        $anos[] = [
                            'ano' => $ano,
                            'meses' => $meses,
                            'total_arquivos' => array_sum(array_column($meses, 'total_arquivos'))
                        ];
                    }
                }
                
                if (!empty($anos)) {
                    // Ordenar anos (mais recente primeiro)
                    usort($anos, function($a, $b) {
                        return (int)$b['ano'] - (int)$a['ano'];
                    });
                    
                    $estrutura[$tipo] = [
                        'tipo' => $tipo,
                        'anos' => $anos,
                        'total_arquivos' => array_sum(array_column($anos, 'total_arquivos'))
                    ];
                }
            }
        }
        
        echo json_encode([
            'success' => true,
            'data' => $estrutura
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
    }
}

/**
 * Lista arquivos de um período específico
 */
function listarArquivos($input) {
    try {
        $empresaId = $input['empresa_id'] ?? '';
        $tipo = $input['tipo'] ?? '';
        $ano = $input['ano'] ?? '';
        $mes = $input['mes'] ?? '';
        
        if (empty($empresaId) || empty($tipo) || empty($ano) || empty($mes)) {
            throw new Exception('Parâmetros obrigatórios não informados');
        }
        
        $path = "../storage/xml/empresa_{$empresaId}/{$tipo}/{$ano}/{$mes}";
        
        if (!is_dir($path)) {
            throw new Exception('Pasta não encontrada');
        }
        
        $arquivos = [];
        $xmlFiles = glob("{$path}/*.xml");
        
        foreach ($xmlFiles as $arquivo) {
            $nomeArquivo = basename($arquivo);
            $tamanho = filesize($arquivo);
            $dataModificacao = filemtime($arquivo);
            
            $arquivos[] = [
                'nome' => $nomeArquivo,
                'tamanho' => $tamanho,
                'tamanho_formatado' => formatBytes($tamanho),
                'data_modificacao' => date('d/m/Y H:i:s', $dataModificacao),
                'path' => $arquivo
            ];
        }
        
        // Ordenar por data de modificação (mais recente primeiro)
        usort($arquivos, function($a, $b) {
            return $b['data_modificacao'] <=> $a['data_modificacao'];
        });
        
        echo json_encode([
            'success' => true,
            'data' => [
                'arquivos' => $arquivos,
                'total' => count($arquivos),
                'path' => $path
            ]
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
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
