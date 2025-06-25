<?php
/**
 * ✅ GERADOR DE ESPELHO SIMPLES DA NFE
 *
 * Este arquivo gera um PDF simples de visualização dos dados
 * preenchidos no formulário, SEM usar certificados ou bibliotecas NFe.
 *
 * É apenas uma representação visual dos dados para conferência.
 * NÃO É UMA NFE REAL - apenas um espelho para visualização.
 */

require_once __DIR__ . '/../vendor/autoload.php';

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

    // Buscar ambiente da empresa para organizar espelhos
    $ambienteTexto = 'homologacao'; // padrão
    try {
        $response = file_get_contents("http://localhost/backend/public/get-empresa-config.php?empresa_id={$empresaId}");
        $config = json_decode($response, true);
        if ($config && isset($config['data']['nfe_config']['ambiente'])) {
            $ambienteTexto = $config['data']['nfe_config']['ambiente'];
        }
    } catch (Exception $e) {
        error_log("Aviso: Não foi possível determinar ambiente, usando homologação");
    }

    // 🔥 NOVA ESTRUTURA COM MODELO DE DOCUMENTO
    // Gerar nome do arquivo
    $modelo = '55'; // NFe por padrão, futuramente será dinâmico para NFCe
    $nomeArquivo = "espelho_nfe_{$empresaId}_" . date('YmdHis') . '.html';
    $caminhoArquivo = __DIR__ . "/../storage/espelhos/{$empresaId}/{$ambienteTexto}/{$modelo}/";

    // Criar diretório se não existir
    if (!is_dir($caminhoArquivo)) {
        mkdir($caminhoArquivo, 0755, true);
    }

    // ✅ LIMPAR ARQUIVOS ANTIGOS ANTES DE GERAR NOVO
    limparEspelhosAntigos($caminhoArquivo, $empresaId);

    $arquivoCompleto = $caminhoArquivo . $nomeArquivo;

    // Gerar HTML simples do espelho (SEM bibliotecas NFe)
    $resultado = gerarHTMLEspelhoSimples($dadosEspelho, $arquivoCompleto);

    if (!$resultado['sucesso']) {
        throw new Exception($resultado['erro']);
    }

    // Retornar sucesso
    echo json_encode([
        'sucesso' => true,
        'arquivo' => $nomeArquivo,
        'caminho' => "storage/espelhos/{$empresaId}/{$ambienteTexto}/{$modelo}/{$nomeArquivo}",
        'mensagem' => 'Espelho da NFe gerado com sucesso',
        'tipo' => 'html'
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
 * ✅ FUNÇÃO PARA GERAR HTML SIMPLES DO ESPELHO
 *
 * Gera um arquivo HTML simples com os dados preenchidos no formulário
 * SEM usar certificados, bibliotecas NFe ou qualquer processo fiscal real.
 */
function gerarHTMLEspelhoSimples($dados, $caminhoArquivo) {
    try {
        $empresa = $dados['empresa'];
        $nfeData = $dados['nfe_data'];

        // Gerar conteúdo HTML completo do espelho
        $html = gerarHTMLEspelhoCompleto($empresa, $nfeData);

        // Salvar HTML
        $resultado = file_put_contents($caminhoArquivo, $html);

        if ($resultado === false) {
            throw new Exception('Falha ao salvar arquivo HTML');
        }

        return [
            'sucesso' => true,
            'arquivo' => $caminhoArquivo
        ];

    } catch (Exception $e) {
        return [
            'sucesso' => false,
            'erro' => 'Erro ao gerar HTML do espelho: ' . $e->getMessage()
        ];
    }
}

/**
 * ✅ FUNÇÃO PARA GERAR HTML COMPLETO DO ESPELHO
 *
 * Gera HTML completo com os dados preenchidos no formulário
 */
function gerarHTMLEspelhoCompleto($empresa, $nfeData) {
    // ✅ USAR DADOS REAIS (SEM FALLBACKS)
    error_log("🔍 ESPELHO HTML - Dados NFe recebidos: " . json_encode($nfeData));

    $identificacao = $nfeData['identificacao'] ?? [];
    $destinatario = $nfeData['destinatario'] ?? [];
    $produtos = $nfeData['produtos'] ?? []; // Corrigido: produtos, não itens
    $totais = $nfeData['totais'] ?? [];

    // ✅ DEBUG DETALHADO DOS DADOS
    error_log("🔍 DESTINATÁRIO DEBUG: " . json_encode($destinatario));
    error_log("🔍 PRODUTOS DEBUG: " . json_encode($produtos));
    error_log("🔍 TOTAIS DEBUG: " . json_encode($totais));

    $html = '<!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Espelho NFe - Visualização</title>
        <style>
            body { font-family: Arial, sans-serif; font-size: 8px; margin: 0; padding: 10px; }
            .danfe-container { width: 100%; max-width: 210mm; margin: 0 auto; border: 2px solid #000; }
            .header-section { border-bottom: 1px solid #000; padding: 5px; display: flex; }
            .logo-section { width: 25%; text-align: center; border-right: 1px solid #000; padding: 5px; }
            .empresa-section { width: 50%; padding: 5px; border-right: 1px solid #000; }
            .danfe-section { width: 25%; text-align: center; padding: 5px; }
            .empresa-nome { font-size: 12px; font-weight: bold; margin-bottom: 3px; }
            .empresa-info { font-size: 8px; line-height: 1.2; }
            .danfe-title { font-size: 14px; font-weight: bold; margin-bottom: 5px; }
            .danfe-subtitle { font-size: 8px; margin-bottom: 3px; }
            .chave-section { text-align: center; padding: 5px; border-bottom: 1px solid #000; }
            .chave-title { font-size: 8px; font-weight: bold; }
            .chave-valor { font-size: 10px; font-family: monospace; margin: 3px 0; }
            .info-row { display: flex; border-bottom: 1px solid #000; }
            .info-box { border-right: 1px solid #000; padding: 3px; }
            .info-label { font-size: 7px; font-weight: bold; }
            .info-value { font-size: 8px; }
            .destinatario-section { border-bottom: 1px solid #000; padding: 5px; }
            .produtos-section { border-bottom: 1px solid #000; }
            .produtos-table { width: 100%; border-collapse: collapse; }
            .produtos-table th, .produtos-table td { border: 1px solid #000; padding: 2px; text-align: center; font-size: 7px; }
            .produtos-table th { background-color: #f0f0f0; font-weight: bold; }
            .totais-section { display: flex; }
            .totais-box { border-right: 1px solid #000; padding: 5px; flex: 1; }
            .totais-label { font-size: 7px; font-weight: bold; }
            .totais-value { font-size: 9px; }
            .watermark { color: #ff0000; font-weight: bold; text-align: center; padding: 10px; background-color: #fff0f0; }
            .print-btn { background-color: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; }
            @media print { .print-btn { display: none; } .watermark { background-color: transparent; } }
        </style>
    </head>
    <body>

    <div class="header">
        <h2>ESPELHO DE VISUALIZAÇÃO - NFe</h2>
        <div class="watermark">⚠️ DOCUMENTO NÃO VÁLIDO FISCALMENTE ⚠️</div>
        <div class="watermark">APENAS PARA CONFERÊNCIA DOS DADOS</div>
        <p>Gerado em: ' . date('d/m/Y H:i:s') . '</p>
    </div>

    <div class="section">
        <div class="section-title">DADOS DO EMITENTE</div>
        <div class="field"><span class="field-label">Razão Social:</span> EMANUEL LUIS PEREIRA SOUZA VALESIS INFORMATICA</div>
        <div class="field"><span class="field-label">CNPJ:</span> 24.163.237/0001-51</div>
        <div class="field"><span class="field-label">Endereço:</span> SANTA TEREZINHA</div>
        <div class="field"><span class="field-label">Cidade/UF:</span> JACAREI/SP</div>
    </div>

    <div class="section">
        <div class="section-title">IDENTIFICAÇÃO DA NFe</div>
        <div class="field"><span class="field-label">Natureza da Operação:</span> ' . htmlspecialchars($identificacao['natureza_operacao'] ?? 'Venda de Mercadoria') . '</div>
        <div class="field"><span class="field-label">Série:</span> ' . htmlspecialchars($identificacao['serie'] ?? '1') . '</div>
        <div class="field"><span class="field-label">Número:</span> ' . htmlspecialchars($identificacao['numero'] ?? '1') . '</div>
        <div class="field"><span class="field-label">Finalidade:</span> ' . htmlspecialchars($identificacao['finalidade'] ?? 'Normal') . '</div>
        <div class="field"><span class="field-label">Data Emissão:</span> ' . htmlspecialchars($identificacao['data_emissao'] ?? date('d/m/Y H:i:s')) . '</div>
        <div class="field"><span class="field-label">Chave NFe:</span> ' . htmlspecialchars($identificacao['chave_nfe'] ?? 'A GERAR') . '</div>
    </div>';

    // ✅ DESTINATÁRIO REAL - SEMPRE MOSTRAR SEÇÃO
    $html .= '
    <div class="section">
        <div class="section-title">DADOS DO DESTINATÁRIO</div>';

    // Verificar se tem dados do destinatário
    if (!empty($destinatario['nome']) || !empty($destinatario['documento'])) {
        $html .= '
        <div class="field"><span class="field-label">Nome/Razão Social:</span> ' . htmlspecialchars($destinatario['nome'] ?? '') . '</div>
        <div class="field"><span class="field-label">CPF/CNPJ:</span> ' . htmlspecialchars($destinatario['documento'] ?? '') . '</div>';

        // Endereço detalhado se existir
        $endereco = $destinatario['endereco'] ?? [];
        if (!empty($endereco)) {
            $enderecoCompleto = '';
            if (!empty($endereco['logradouro'])) $enderecoCompleto .= $endereco['logradouro'];
            if (!empty($endereco['numero'])) $enderecoCompleto .= ', ' . $endereco['numero'];
            if (!empty($endereco['complemento'])) $enderecoCompleto .= ', ' . $endereco['complemento'];

            $html .= '
            <div class="field"><span class="field-label">Endereço:</span> ' . htmlspecialchars($enderecoCompleto) . '</div>
            <div class="field"><span class="field-label">Bairro:</span> ' . htmlspecialchars($endereco['bairro'] ?? '') . '</div>
            <div class="field"><span class="field-label">Cidade/UF:</span> ' . htmlspecialchars($endereco['cidade'] ?? '') . '/' . htmlspecialchars($endereco['uf'] ?? '') . '</div>
            <div class="field"><span class="field-label">CEP:</span> ' . htmlspecialchars($endereco['cep'] ?? '') . '</div>';
        } else {
            // Se não tem endereço estruturado, mostrar campo simples
            $html .= '
            <div class="field"><span class="field-label">Endereço:</span> ' . htmlspecialchars($destinatario['endereco'] ?? '') . '</div>';
        }

        // Outros campos do destinatário
        if (!empty($destinatario['telefone'])) {
            $html .= '
            <div class="field"><span class="field-label">Telefone:</span> ' . htmlspecialchars($destinatario['telefone']) . '</div>';
        }
        if (!empty($destinatario['email'])) {
            $html .= '
            <div class="field"><span class="field-label">Email:</span> ' . htmlspecialchars($destinatario['email']) . '</div>';
        }
    } else {
        $html .= '
        <div class="field"><span class="field-label">Tipo:</span> <strong>CONSUMIDOR FINAL</strong></div>
        <div class="field"><span class="field-label">Observação:</span> Venda para consumidor final sem identificação</div>';
    }

    $html .= '
    </div>';

    if (!empty($produtos)) {
        $html .= '
        <div class="section">
            <div class="section-title">PRODUTOS/SERVIÇOS</div>
            <table class="table">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Descrição</th>
                        <th>NCM</th>
                        <th>CFOP</th>
                        <th>Qtd</th>
                        <th>Unidade</th>
                        <th>Valor Unit.</th>
                        <th>Valor Total</th>
                    </tr>
                </thead>
                <tbody>';

        foreach ($produtos as $produto) {
            $html .= '
                    <tr>
                        <td>' . htmlspecialchars($produto['codigo'] ?? '') . '</td>
                        <td>' . htmlspecialchars($produto['descricao'] ?? '') . '</td>
                        <td>' . htmlspecialchars($produto['ncm'] ?? '') . '</td>
                        <td>' . htmlspecialchars($produto['cfop'] ?? '') . '</td>
                        <td>' . number_format($produto['quantidade'] ?? 0, 3, ',', '.') . '</td>
                        <td>' . htmlspecialchars($produto['unidade'] ?? '') . '</td>
                        <td>R$ ' . number_format($produto['valor_unitario'] ?? 0, 2, ',', '.') . '</td>
                        <td>R$ ' . number_format($produto['valor_total'] ?? 0, 2, ',', '.') . '</td>
                    </tr>';
        }

        $html .= '
                </tbody>
            </table>
        </div>';
    }

    // ✅ SEÇÃO DE TOTAIS REAIS
    $html .= '
    <div class="section">
        <div class="section-title">TOTAIS DA NFe</div>
        <div class="field"><span class="field-label">Valor dos Produtos:</span> R$ ' . number_format($totais['valor_produtos'] ?? 0, 2, ',', '.') . '</div>
        <div class="field"><span class="field-label">Valor do Desconto:</span> R$ ' . number_format($totais['valor_desconto'] ?? 0, 2, ',', '.') . '</div>
        <div class="field"><span class="field-label">Valor do Frete:</span> R$ ' . number_format($totais['valor_frete'] ?? 0, 2, ',', '.') . '</div>
        <div class="field"><span class="field-label"><strong>Valor Total da NFe:</strong></span> <strong>R$ ' . number_format($totais['valor_total'] ?? 0, 2, ',', '.') . '</strong></div>
    </div>

    <div class="section">
        <div class="section-title">OBSERVAÇÕES</div>
        <p><strong>Este é apenas um espelho de visualização dos dados REAIS salvos no sistema.</strong></p>
        <p><strong>Para emitir a NFe oficial, utilize o botão "Emitir NFe" na interface principal.</strong></p>
        <p><strong>Este documento não possui valor fiscal.</strong></p>
    </div>

    <div style="text-align: center; margin-top: 30px;">
        <button class="print-btn" onclick="window.print()">🖨️ Imprimir</button>
        <button class="print-btn" onclick="window.close()">❌ Fechar</button>
    </div>

    </body>
    </html>';

    return $html;
}

/**
 * ✅ FUNÇÃO PARA LIMPAR ESPELHOS ANTIGOS
 *
 * Remove todos os arquivos HTML e PDF antigos do diretório da empresa
 * antes de gerar um novo espelho, evitando acúmulo de arquivos.
 *
 * @param string $caminhoArquivo Caminho do diretório dos espelhos
 * @param string $empresaId ID da empresa (para logs)
 */
function limparEspelhosAntigos($caminhoArquivo, $empresaId) {
    try {
        error_log("🧹 LIMPEZA - Iniciando limpeza de espelhos antigos para empresa: {$empresaId}");
        error_log("🧹 LIMPEZA - Diretório: {$caminhoArquivo}");

        // Buscar todos os arquivos HTML e PDF no diretório
        $arquivosHTML = glob($caminhoArquivo . "*.html");
        $arquivosPDF = glob($caminhoArquivo . "*.pdf");

        $arquivosParaRemover = array_merge($arquivosHTML, $arquivosPDF);

        if (empty($arquivosParaRemover)) {
            error_log("🧹 LIMPEZA - Nenhum arquivo antigo encontrado");
            return;
        }

        $removidos = 0;
        $erros = 0;

        foreach ($arquivosParaRemover as $arquivo) {
            $nomeArquivo = basename($arquivo);

            if (unlink($arquivo)) {
                $removidos++;
                error_log("🧹 LIMPEZA - Removido: {$nomeArquivo}");
            } else {
                $erros++;
                error_log("❌ LIMPEZA - Erro ao remover: {$nomeArquivo}");
            }
        }

        error_log("✅ LIMPEZA - Concluída! Removidos: {$removidos}, Erros: {$erros}");

    } catch (Exception $e) {
        error_log("❌ LIMPEZA - Erro na limpeza: " . $e->getMessage());
    }
}

?>