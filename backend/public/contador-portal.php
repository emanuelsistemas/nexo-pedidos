<?php
/**
 * Portal do Contador - API para acesso aos XMLs das NFe
 * 
 * Permite que contadores acessem os XMLs das empresas organizados por:
 * - Ano/Mês
 * - Tipo (NFe 55/65, Autorizados, Cancelados, CCe)
 * - Download em ZIP
 * - Relatório PDF com totais
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../vendor/autoload.php';

// Configuração do banco de dados
$host = 'aws-0-sa-east-1.pooler.supabase.com';
$port = '6543';
$dbname = 'postgres';
$username = 'postgres.xsrirnfwsjeovekwtluz';
$password = 'nexo@emanuelsistemas.com';

try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Erro de conexão com o banco de dados'
    ]);
    exit;
}

// Obter dados da requisição
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

switch ($action) {
    case 'buscar_empresa':
        buscarEmpresa($pdo, $input);
        break;
    
    case 'listar_estrutura':
        listarEstrutura($input);
        break;
    
    case 'listar_arquivos':
        listarArquivos($input);
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
function buscarEmpresa($pdo, $input) {
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
        
        // Buscar empresa no banco
        $stmt = $pdo->prepare("
            SELECT 
                id,
                nome,
                documento,
                razao_social,
                nome_fantasia
            FROM empresas 
            WHERE documento = ? OR documento = ?
        ");
        
        // Tentar com CNPJ sem formatação e com formatação
        $cnpjFormatado = preg_replace('/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/', '$1.$2.$3/$4-$5', $cnpjLimpo);
        $stmt->execute([$cnpjLimpo, $cnpjFormatado]);
        
        $empresa = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$empresa) {
            throw new Exception('Empresa não encontrada');
        }
        
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
