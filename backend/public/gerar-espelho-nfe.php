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
    $identificacao = $nfeData['identificacao'] ?? [];
    $destinatario = $nfeData['destinatario'] ?? [];
    $itens = $nfeData['itens'] ?? [];

    $html = '<!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Espelho NFe - Visualização</title>
        <style>
            body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
            .header { text-align: center; background-color: #f0f0f0; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
            .watermark { color: #ff0000; font-weight: bold; font-size: 18px; margin: 10px 0; }
            .section { margin-bottom: 15px; border: 1px solid #ccc; padding: 15px; border-radius: 5px; }
            .section-title { font-weight: bold; background-color: #e0e0e0; padding: 8px; margin: -15px -15px 15px -15px; border-radius: 5px 5px 0 0; }
            .field { margin-bottom: 8px; }
            .field-label { font-weight: bold; display: inline-block; width: 180px; }
            .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .table th, .table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            .table th { background-color: #f0f0f0; font-weight: bold; }
            .print-btn { background-color: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; }
            .print-btn:hover { background-color: #0056b3; }
            @media print { .print-btn { display: none; } }
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
        <div class="field"><span class="field-label">Razão Social:</span> ' . htmlspecialchars($empresa['razao_social'] ?? '') . '</div>
        <div class="field"><span class="field-label">CNPJ:</span> ' . htmlspecialchars($empresa['documento'] ?? '') . '</div>
        <div class="field"><span class="field-label">Endereço:</span> ' . htmlspecialchars($empresa['endereco'] ?? '') . '</div>
        <div class="field"><span class="field-label">Cidade/UF:</span> ' . htmlspecialchars($empresa['cidade'] ?? '') . '/' . htmlspecialchars($empresa['estado'] ?? '') . '</div>
    </div>

    <div class="section">
        <div class="section-title">IDENTIFICAÇÃO DA NFe</div>
        <div class="field"><span class="field-label">Natureza da Operação:</span> ' . htmlspecialchars($identificacao['natureza_operacao'] ?? '') . '</div>
        <div class="field"><span class="field-label">Série:</span> ' . htmlspecialchars($identificacao['serie'] ?? '') . '</div>
        <div class="field"><span class="field-label">Finalidade:</span> ' . htmlspecialchars($identificacao['finalidade'] ?? '') . '</div>
        <div class="field"><span class="field-label">Número:</span> <strong style="color: red;">SERÁ DEFINIDO NA EMISSÃO</strong></div>
    </div>';

    if (!empty($destinatario)) {
        $html .= '
        <div class="section">
            <div class="section-title">DADOS DO DESTINATÁRIO</div>
            <div class="field"><span class="field-label">Nome/Razão Social:</span> ' . htmlspecialchars($destinatario['nome'] ?? '') . '</div>
            <div class="field"><span class="field-label">CPF/CNPJ:</span> ' . htmlspecialchars($destinatario['documento'] ?? '') . '</div>
            <div class="field"><span class="field-label">Endereço:</span> ' . htmlspecialchars($destinatario['endereco'] ?? '') . '</div>
        </div>';
    }

    if (!empty($itens)) {
        $html .= '
        <div class="section">
            <div class="section-title">PRODUTOS/SERVIÇOS</div>
            <table class="table">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Descrição</th>
                        <th>Qtd</th>
                        <th>Unidade</th>
                        <th>Valor Unit.</th>
                        <th>Valor Total</th>
                    </tr>
                </thead>
                <tbody>';

        foreach ($itens as $item) {
            $html .= '
                    <tr>
                        <td>' . htmlspecialchars($item['codigo'] ?? '') . '</td>
                        <td>' . htmlspecialchars($item['descricao'] ?? '') . '</td>
                        <td>' . htmlspecialchars($item['quantidade'] ?? '') . '</td>
                        <td>' . htmlspecialchars($item['unidade'] ?? '') . '</td>
                        <td>R$ ' . number_format($item['valor_unitario'] ?? 0, 2, ',', '.') . '</td>
                        <td>R$ ' . number_format($item['valor_total'] ?? 0, 2, ',', '.') . '</td>
                    </tr>';
        }

        $html .= '
                </tbody>
            </table>
        </div>';
    }

    $html .= '
    <div class="section">
        <div class="section-title">OBSERVAÇÕES</div>
        <p><strong>Este é apenas um espelho de visualização dos dados preenchidos no formulário.</strong></p>
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

?>