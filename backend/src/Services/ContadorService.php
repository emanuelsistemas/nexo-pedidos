<?php

namespace Nexo\Services;

use Exception;
use PDO;

/**
 * Serviço para o Portal do Contador
 */
class ContadorService
{
    private $pdo;
    
    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }
    
    /**
     * Busca empresa pelo CNPJ
     */
    public function buscarEmpresaPorCNPJ($cnpj)
    {
        try {
            // Remover formatação do CNPJ
            $cnpjLimpo = preg_replace('/\D/', '', $cnpj);
            
            if (strlen($cnpjLimpo) !== 14) {
                throw new Exception('CNPJ deve conter 14 dígitos');
            }
            
            // Buscar empresa no banco
            $stmt = $this->pdo->prepare("
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
            
            // Verificar se existe pasta de XMLs DE PRODUÇÃO para esta empresa
            $empresaId = $empresa['id'];
            $xmlPath = "../storage/xml/empresa_{$empresaId}/producao";

            if (!is_dir($xmlPath)) {
                throw new Exception('Nenhum arquivo XML de PRODUÇÃO encontrado para esta empresa');
            }
            
            return [
                'id' => $empresa['id'],
                'nome' => $empresa['nome'],
                'cnpj' => $cnpjLimpo,
                'razao_social' => $empresa['razao_social'],
                'nome_fantasia' => $empresa['nome_fantasia'],
                'xml_path' => $xmlPath
            ];
            
        } catch (Exception $e) {
            throw $e;
        }
    }
    
    /**
     * Lista a estrutura de pastas (anos/meses) disponíveis APENAS DE PRODUÇÃO
     */
    public function listarEstrutura($empresaId)
    {
        try {
            // PORTAL DO CONTADOR: APENAS ARQUIVOS DE PRODUÇÃO
            $xmlPath = "../storage/xml/empresa_{$empresaId}/producao";

            if (!is_dir($xmlPath)) {
                throw new Exception('Pasta de XMLs de PRODUÇÃO não encontrada');
            }

            $estrutura = [];
            $tipos = ['Autorizados', 'Cancelados', 'CCe'];

            // Buscar APENAS em produção
            foreach ($tipos as $tipo) {
                $tipoPath = "{$xmlPath}/{$tipo}";

                if (is_dir($tipoPath)) {
                    $anos = $this->listarAnosMeses($tipoPath);

                    if (!empty($anos)) {
                        // Ordenar anos (mais recente primeiro)
                        usort($anos, function($a, $b) {
                            return (int)$b['ano'] - (int)$a['ano'];
                        });

                        $estrutura[$tipo] = [
                            'tipo' => $tipo,
                            'ambiente' => 'producao',
                            'anos' => $anos,
                            'total_arquivos' => array_sum(array_column($anos, 'total_arquivos'))
                        ];
                    }
                }
            }

            return $estrutura;

        } catch (Exception $e) {
            throw $e;
        }
    }
    
    /**
     * Lista anos e meses de um tipo específico
     */
    private function listarAnosMeses($tipoPath)
    {
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
                        'nome_mes' => $this->getNomeMes($mes),
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
        
        return $anos;
    }
    
    /**
     * Lista arquivos de um período específico APENAS DE PRODUÇÃO
     */
    public function listarArquivos($empresaId, $tipo, $ano, $mes)
    {
        try {
            // PORTAL DO CONTADOR: APENAS ARQUIVOS DE PRODUÇÃO
            $path = "../storage/xml/empresa_{$empresaId}/producao/{$tipo}/{$ano}/{$mes}";

            if (!is_dir($path)) {
                throw new Exception('Pasta de PRODUÇÃO não encontrada');
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
                    'tamanho_formatado' => $this->formatBytes($tamanho),
                    'data_modificacao' => date('d/m/Y H:i:s', $dataModificacao),
                    'path' => $arquivo
                ];
            }

            // Ordenar por data de modificação (mais recente primeiro)
            usort($arquivos, function($a, $b) {
                return $b['data_modificacao'] <=> $a['data_modificacao'];
            });

            return [
                'arquivos' => $arquivos,
                'total' => count($arquivos),
                'path' => $path
            ];

        } catch (Exception $e) {
            throw $e;
        }
    }
    
    /**
     * Valida se o CNPJ é válido
     */
    public function validarCNPJ($cnpj)
    {
        $numbers = preg_replace('/\D/', '', $cnpj);
        
        if (strlen($numbers) !== 14) return false;
        
        // Verificar se todos os dígitos são iguais
        if (preg_match('/^(\d)\1+$/', $numbers)) return false;
        
        // Validar dígitos verificadores
        $soma = 0;
        $peso = 2;
        
        for ($i = 11; $i >= 0; $i--) {
            $soma += (int)$numbers[$i] * $peso;
            $peso = $peso === 9 ? 2 : $peso + 1;
        }
        
        $digito1 = $soma % 11 < 2 ? 0 : 11 - ($soma % 11);
        
        if ((int)$numbers[12] !== $digito1) return false;
        
        $soma = 0;
        $peso = 2;
        
        for ($i = 12; $i >= 0; $i--) {
            $soma += (int)$numbers[$i] * $peso;
            $peso = $peso === 9 ? 2 : $peso + 1;
        }
        
        $digito2 = $soma % 11 < 2 ? 0 : 11 - ($soma % 11);
        
        return (int)$numbers[13] === $digito2;
    }
    
    /**
     * Converte número do mês para nome
     */
    private function getNomeMes($mes)
    {
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
    private function formatBytes($bytes, $precision = 2)
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        
        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }
        
        return round($bytes, $precision) . ' ' . $units[$i];
    }
}
