<?php
/**
 * ✅ GERADOR DE ESPELHO DA NFE
 *
 * Este arquivo gera um PDF de visualização (espelho) da NFe
 * baseado nos dados preenchidos no formulário, sem emitir a NFe real.
 *
 * Útil para:
 * - Visualizar como a NFe ficará antes da emissão
 * - Enviar para fornecedores ou contadores para aprovação
 * - Conferir dados antes da emissão oficial
 */

// Incluir dependências primeiro
require_once __DIR__ . '/../vendor/autoload.php';

use NFePHP\NFe\Make;
use NFePHP\NFe\Tools;
use NFePHP\NFe\Common\Standardize;
use NFePHP\DA\NFe\Danfe;

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Tratar requisições OPTIONS (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Verificar se é POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['sucesso' => false, 'erro' => 'Método não permitido']);
    exit;
}

try {
    // Ler dados JSON da requisição
    $input = file_get_contents('php://input');
    $dados = json_decode($input, true);

    if (!$dados) {
        throw new Exception('Dados JSON inválidos');
    }

    // Validar dados obrigatórios
    if (!isset($dados['empresa_id']) || !isset($dados['dados_nfe'])) {
        throw new Exception('Dados obrigatórios não fornecidos (empresa_id, dados_nfe)');
    }

    $empresaId = $dados['empresa_id'];
    $dadosNfe = $dados['dados_nfe'];
    $tipo = $dados['tipo'] ?? 'espelho';

    // Log de debug
    error_log("🎯 ESPELHO NFE - Empresa ID: $empresaId");
    error_log("🎯 ESPELHO NFE - Tipo: $tipo");

    // Incluir configuração do Supabase
    require_once __DIR__ . '/../config/supabase.php';

    // Carregar dados da empresa
    $empresaQuery = $supabase->from('empresas')
        ->select('*')
        ->eq('id', $empresaId)
        ->single();

    $empresa = $empresaQuery['data'] ?? null;

    if (!$empresa) {
        throw new Exception('Empresa não encontrada');
    }

    // Preparar dados para o espelho
    $dadosEspelho = [
        'empresa' => $empresa,
        'nfe_data' => $dadosNfe,
        'tipo' => 'ESPELHO',
        'numero_espelho' => 'ESPELHO-' . date('YmdHis'),
        'data_geracao' => date('Y-m-d H:i:s')
    ];

    // Gerar nome do arquivo
    $nomeArquivo = "espelho_nfe_{$empresaId}_" . date('YmdHis') . '.pdf';
    $caminhoArquivo = __DIR__ . "/../storage/espelhos/{$empresaId}/";

    // Criar diretório se não existir
    if (!is_dir($caminhoArquivo)) {
        mkdir($caminhoArquivo, 0755, true);
    }

    $arquivoCompleto = $caminhoArquivo . $nomeArquivo;

    // Gerar PDF do espelho usando a biblioteca sped-nfe
    $resultado = gerarPDFEspelho($dadosEspelho, $arquivoCompleto);

    if (!$resultado['sucesso']) {
        throw new Exception($resultado['erro']);
    }

    // Retornar sucesso
    echo json_encode([
        'sucesso' => true,
        'arquivo' => $nomeArquivo,
        'caminho' => "storage/espelhos/{$empresaId}/{$nomeArquivo}",
        'mensagem' => 'Espelho da NFe gerado com sucesso'
    ]);

} catch (Exception $e) {
    error_log("❌ ERRO ESPELHO NFE: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'sucesso' => false,
        'erro' => $e->getMessage()
    ]);
}

/**
 * ✅ FUNÇÃO PARA GERAR PDF DO ESPELHO
 */
function gerarPDFEspelho($dados, $caminhoArquivo) {
    try {
        // Usar a mesma biblioteca sped-nfe para gerar o PDF

        $empresa = $dados['empresa'];
        $nfeData = $dados['nfe_data'];

        // Configurar certificado (mesmo processo da emissão real)
        $certificadoPath = __DIR__ . "/../storage/certificados/{$empresa['id']}.p12";

        if (!file_exists($certificadoPath)) {
            throw new Exception('Certificado digital não encontrado');
        }

        $certificadoContent = file_get_contents($certificadoPath);
        $certificadoSenha = $empresa['certificado_senha'] ?? '';

        // Configurar Tools
        $config = [
            "atualizacao" => date('Y-m-d H:i:s'),
            "tpAmb" => 2, // Sempre homologação para espelhos
            "razaosocial" => $empresa['razao_social'],
            "cnpj" => preg_replace('/\D/', '', $empresa['documento']),
            "siglaUF" => $empresa['estado'],
            "schemes" => "PL_009_V4",
            "versao" => '4.00',
            "tokenIBPT" => "",
            "CSC" => "",
            "CSCid" => ""
        ];

        $tools = new Tools(json_encode($config));
        $tools->loadSigner($certificadoContent, $certificadoSenha);

        // Gerar XML da NFe (mesmo processo da emissão)
        $xmlEspelho = gerarXMLEspelho($nfeData, $empresa);

        // Gerar DANFE do espelho
        $danfe = new Danfe($xmlEspelho);
        $danfe->debugMode(false);
        $danfe->creditsIntegratorFooter('NEXO SISTEMAS - ESPELHO DE VISUALIZAÇÃO');

        // Adicionar marca d'água de espelho
        $danfe->watermark('ESPELHO - NÃO VÁLIDO FISCALMENTE');

        // Salvar PDF
        $pdf = $danfe->render();
        file_put_contents($caminhoArquivo, $pdf);

        return [
            'sucesso' => true,
            'arquivo' => $caminhoArquivo
        ];

    } catch (Exception $e) {
        return [
            'sucesso' => false,
            'erro' => 'Erro ao gerar PDF do espelho: ' . $e->getMessage()
        ];
    }
}

/**
 * ✅ FUNÇÃO PARA GERAR XML DO ESPELHO
 */
function gerarXMLEspelho($nfeData, $empresa) {
    // Usar a mesma lógica de geração de XML da emissão real
    // mas com dados de espelho e ambiente de homologação

    $nfe = new Make();

    // Dados da empresa (mesmo processo)
    $std = new \stdClass();
    $std->versao = '4.00';
    $std->Id = null;
    $std->pk_nItem = '';

    // Identificação (marcar como espelho)
    $std = new \stdClass();
    $std->cUF = obterCodigoUF($empresa['estado']);
    $std->cNF = '12345678'; // Código fixo para espelho
    $std->natOp = $nfeData['identificacao']['natureza_operacao'] ?? 'Venda de Mercadoria';
    $std->mod = 55;
    $std->serie = $nfeData['identificacao']['serie'] ?? 1;
    $std->nNF = 999999; // Número fixo para espelho
    $std->dhEmi = date('Y-m-d\TH:i:sP');
    $std->tpNF = 1;
    $std->idDest = 1;
    $std->cMunFG = $empresa['codigo_municipio'];
    $std->tpImp = 1;
    $std->tpEmis = 1;
    $std->cDV = 0;
    $std->tpAmb = 2; // Sempre homologação
    $std->finNFe = $nfeData['identificacao']['finalidade'] ?? '1';
    $std->indFinal = 1;
    $std->indPres = 1;
    $std->procEmi = 0;
    $std->verProc = '1.0';

    $nfe->taginfNFe($std);

    // Continuar com o resto da geração...
    // (Implementar o resto da lógica de geração de XML)

    return $nfe->getXML();
}

/**
 * ✅ FUNÇÃO AUXILIAR PARA OBTER CÓDIGO DA UF
 */
function obterCodigoUF($uf) {
    $codigos = [
        'AC' => 12, 'AL' => 17, 'AP' => 16, 'AM' => 13, 'BA' => 29,
        'CE' => 23, 'DF' => 53, 'ES' => 32, 'GO' => 52, 'MA' => 21,
        'MT' => 51, 'MS' => 50, 'MG' => 31, 'PA' => 15, 'PB' => 25,
        'PR' => 41, 'PE' => 26, 'PI' => 22, 'RJ' => 33, 'RN' => 24,
        'RS' => 43, 'RO' => 11, 'RR' => 14, 'SC' => 42, 'SP' => 35,
        'SE' => 28, 'TO' => 27
    ];

    return $codigos[$uf] ?? 35; // Default SP
}
?>