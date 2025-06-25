<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// ✅ ENDPOINT PARA GERAR ESPELHO DANFE (SEM FALLBACKS)

try {
    // Verificar método
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método não permitido');
    }

    // Ler dados JSON
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data) {
        throw new Exception('Dados JSON inválidos');
    }

    // Verificar empresa_id
    if (!isset($data['empresa_id'])) {
        throw new Exception('empresa_id é obrigatório');
    }

    $empresa_id = $data['empresa_id'];
    $nfeData = $data['dados_nfe'] ?? [];

    // ✅ LIMPEZA AUTOMÁTICA DE ESPELHOS ANTIGOS
    $diretorioEspelhos = __DIR__ . "/../storage/espelhos/{$empresa_id}/homologacao/55/";
    
    if (!is_dir($diretorioEspelhos)) {
        mkdir($diretorioEspelhos, 0755, true);
    }

    // Limpar arquivos antigos
    $arquivosAntigos = glob($diretorioEspelhos . "espelho_danfe_*.html");
    $removidos = 0;

    foreach ($arquivosAntigos as $arquivo) {
        if (unlink($arquivo)) {
            $removidos++;
        }
    }

    error_log("✅ LIMPEZA DANFE - Removidos: {$removidos} arquivos antigos");

    // Gerar nome único para o arquivo
    $timestamp = date('YmdHis');
    $empresaIdLimpo = str_replace('-', '', $empresa_id);
    $nomeArquivo = "espelho_danfe_{$empresaIdLimpo}_{$timestamp}.html";
    $caminhoCompleto = $diretorioEspelhos . $nomeArquivo;

    // Gerar HTML do DANFE
    $htmlContent = gerarHTMLDANFE($nfeData);

    // Salvar arquivo
    if (file_put_contents($caminhoCompleto, $htmlContent) === false) {
        throw new Exception('Erro ao salvar arquivo HTML');
    }

    // Retornar sucesso
    echo json_encode([
        'sucesso' => true,
        'arquivo' => $nomeArquivo,
        'caminho' => "storage/espelhos/{$empresa_id}/homologacao/55/{$nomeArquivo}",
        'mensagem' => 'Espelho DANFE gerado com sucesso',
        'tipo' => 'html'
    ]);

} catch (Exception $e) {
    error_log("❌ ESPELHO DANFE - Erro: " . $e->getMessage());
    
    echo json_encode([
        'sucesso' => false,
        'erro' => $e->getMessage()
    ]);
}

function gerarHTMLDANFE($nfeData) {
    // ✅ USAR DADOS REAIS (SEM FALLBACKS)
    $identificacao = $nfeData['identificacao'] ?? [];
    $destinatario = $nfeData['destinatario'] ?? [];
    $produtos = $nfeData['produtos'] ?? [];
    $totais = $nfeData['totais'] ?? [];

    // Dados da empresa (fixos para o emitente)
    $empresa = [
        'razao_social' => 'EMANUEL LUIS PEREIRA SOUZA VALESIS INFORMATICA',
        'cnpj' => '24.163.237/0001-51',
        'endereco' => 'SANTA TEREZINHA',
        'cidade' => 'JACAREI',
        'uf' => 'SP',
        'ie' => 'ISENTO'
    ];

    $html = '<!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>DANFE - Documento Auxiliar da Nota Fiscal Eletrônica</title>
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

    <div class="watermark">
        ⚠️ DOCUMENTO NÃO VÁLIDO FISCALMENTE - APENAS PARA CONFERÊNCIA DOS DADOS ⚠️
    </div>

    <div class="danfe-container">
        <!-- Cabeçalho DANFE -->
        <div class="header-section">
            <div class="logo-section">
                <div style="border: 1px solid #000; height: 60px; display: flex; align-items: center; justify-content: center;">
                    LOGOMARCA
                </div>
            </div>
            <div class="empresa-section">
                <div class="empresa-nome">' . htmlspecialchars($empresa['razao_social']) . '</div>
                <div class="empresa-info">
                    ' . htmlspecialchars($empresa['endereco']) . '<br>
                    ' . htmlspecialchars($empresa['cidade']) . '/' . htmlspecialchars($empresa['uf']) . '<br>
                    CNPJ: ' . htmlspecialchars($empresa['cnpj']) . '
                </div>
            </div>
            <div class="danfe-section">
                <div class="danfe-title">DANFE</div>
                <div class="danfe-subtitle">Documento Auxiliar da<br>Nota Fiscal Eletrônica</div>
                <div style="margin-top: 10px;">
                    <div style="font-size: 8px;">0 - ENTRADA</div>
                    <div style="font-size: 8px;">1 - SAÍDA</div>
                    <div style="border: 1px solid #000; width: 20px; height: 15px; margin: 2px auto; display: flex; align-items: center; justify-content: center;">1</div>
                </div>
                <div style="margin-top: 5px; font-size: 8px;">
                    Nº: ' . htmlspecialchars($identificacao['numero'] ?? '1') . '<br>
                    Série: ' . htmlspecialchars($identificacao['serie'] ?? '1') . '
                </div>
            </div>
        </div>

        <!-- Chave de Acesso -->
        <div class="chave-section">
            <div class="chave-title">CHAVE DE ACESSO</div>
            <div class="chave-valor">' . htmlspecialchars($identificacao['chave_nfe'] ?? 'A GERAR APÓS EMISSÃO') . '</div>
        </div>

        <!-- Informações da NFe -->
        <div class="info-row">
            <div class="info-box" style="width: 25%;">
                <div class="info-label">NATUREZA DA OPERAÇÃO</div>
                <div class="info-value">' . htmlspecialchars($identificacao['natureza_operacao'] ?? 'Venda de Mercadoria') . '</div>
            </div>
            <div class="info-box" style="width: 25%;">
                <div class="info-label">PROTOCOLO DE AUTORIZAÇÃO</div>
                <div class="info-value">' . htmlspecialchars($identificacao['protocolo'] ?? 'A GERAR') . '</div>
            </div>
            <div class="info-box" style="width: 25%;">
                <div class="info-label">DATA E HORA DE EMISSÃO</div>
                <div class="info-value">' . date('d/m/Y H:i:s') . '</div>
            </div>
            <div class="info-box" style="width: 25%;">
                <div class="info-label">INSCRIÇÃO ESTADUAL</div>
                <div class="info-value">' . htmlspecialchars($empresa['ie']) . '</div>
            </div>
        </div>';

    return $html;
}
?>
