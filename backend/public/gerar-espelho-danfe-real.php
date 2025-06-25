<?php
require_once __DIR__ . '/../vendor/autoload.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// ✅ ENDPOINT PARA GERAR ESPELHO DANFE USANDO BIBLIOTECA SPED-DA

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

    error_log("🔍 DANFE REAL - Dados recebidos: " . json_encode($nfeData));

    // ✅ VERIFICAR SE TEM XML SALVO PARA GERAR DANFE REAL
    $chaveNfe = $nfeData['identificacao']['chave_nfe'] ?? null;
    
    if ($chaveNfe && $chaveNfe !== 'A GERAR') {
        // Tentar encontrar XML salvo
        $possiveisCaminhos = [
            __DIR__ . "/../storage/xml/empresa_{$empresa_id}/" . date('Y/m') . "/{$chaveNfe}.xml",
            __DIR__ . "/../storage/xml55/empresa_{$empresa_id}/" . date('Y/m') . "/{$chaveNfe}.xml",
            __DIR__ . "/../storage/xml/homologacao/55/empresa_{$empresa_id}/" . date('Y/m') . "/{$chaveNfe}.xml"
        ];
        
        $xmlEncontrado = null;
        foreach ($possiveisCaminhos as $caminho) {
            if (file_exists($caminho)) {
                $xmlEncontrado = $caminho;
                break;
            }
        }
        
        if ($xmlEncontrado) {
            error_log("✅ DANFE REAL: XML encontrado: {$xmlEncontrado}");
            return gerarDANFEReal($xmlEncontrado, $empresa_id, $chaveNfe);
        } else {
            error_log("⚠️ DANFE REAL: XML não encontrado para chave: {$chaveNfe}");
        }
    }

    // ✅ SE NÃO TEM XML, GERAR ESPELHO SIMPLES COM DADOS DO FORMULÁRIO
    error_log("📝 DANFE REAL: Gerando espelho simples com dados do formulário");
    return gerarEspelhoSimples($nfeData, $empresa_id);

} catch (Exception $e) {
    error_log("❌ DANFE REAL - Erro: " . $e->getMessage());
    
    echo json_encode([
        'sucesso' => false,
        'erro' => $e->getMessage()
    ]);
}

function gerarDANFEReal($xmlPath, $empresa_id, $chave) {
    try {
        error_log("🎨 DANFE REAL: Iniciando geração com biblioteca sped-da");
        
        // Verificar se a classe existe
        if (!class_exists('\NFePHP\DA\NFe\Danfe')) {
            throw new Exception('Biblioteca sped-da não encontrada');
        }
        
        // Ler XML
        $xmlContent = file_get_contents($xmlPath);
        if (!$xmlContent) {
            throw new Exception('Erro ao ler XML');
        }
        
        error_log("✅ DANFE REAL: XML carregado (" . strlen($xmlContent) . " bytes)");
        
        // Criar instância Danfe
        $danfe = new \NFePHP\DA\NFe\Danfe($xmlContent);
        $danfe->debugMode(false);
        $danfe->creditsIntegratorFooter('Sistema Nexo PDV');
        
        error_log("✅ DANFE REAL: Instância Danfe criada");
        
        // Gerar PDF
        $pdfContent = $danfe->render();
        
        if (empty($pdfContent)) {
            throw new Exception('PDF gerado está vazio');
        }
        
        error_log("✅ DANFE REAL: PDF gerado (" . strlen($pdfContent) . " bytes)");
        
        // Salvar PDF
        $diretorioEspelhos = __DIR__ . "/../storage/espelhos/{$empresa_id}/homologacao/55/";
        
        if (!is_dir($diretorioEspelhos)) {
            mkdir($diretorioEspelhos, 0755, true);
        }
        
        // Limpar arquivos antigos
        $arquivosAntigos = glob($diretorioEspelhos . "danfe_real_*.pdf");
        foreach ($arquivosAntigos as $arquivo) {
            unlink($arquivo);
        }
        
        // Salvar novo arquivo
        $timestamp = date('YmdHis');
        $empresaIdLimpo = str_replace('-', '', $empresa_id);
        $nomeArquivo = "danfe_real_{$empresaIdLimpo}_{$timestamp}.pdf";
        $caminhoCompleto = $diretorioEspelhos . $nomeArquivo;
        
        if (file_put_contents($caminhoCompleto, $pdfContent) === false) {
            throw new Exception('Erro ao salvar PDF');
        }
        
        error_log("✅ DANFE REAL: PDF salvo: {$caminhoCompleto}");
        
        // Retornar sucesso
        echo json_encode([
            'sucesso' => true,
            'arquivo' => $nomeArquivo,
            'caminho' => "storage/espelhos/{$empresa_id}/homologacao/55/{$nomeArquivo}",
            'mensagem' => 'DANFE real gerado com sucesso',
            'tipo' => 'pdf',
            'metodo' => 'biblioteca_sped_da'
        ]);
        
        return true;
        
    } catch (Exception $e) {
        error_log("❌ DANFE REAL: Erro na geração: " . $e->getMessage());
        throw $e;
    }
}

function gerarEspelhoSimples($nfeData, $empresa_id) {
    try {
        error_log("📝 ESPELHO SIMPLES: Gerando com dados do formulário");
        
        $identificacao = $nfeData['identificacao'] ?? [];
        $destinatario = $nfeData['destinatario'] ?? [];
        $produtos = $nfeData['produtos'] ?? [];
        $totais = $nfeData['totais'] ?? [];
        
        // HTML simples para espelho
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
        
        // Adicionar destinatário se existir
        if (!empty($destinatario['nome'])) {
            $html .= '
            <div class="section">
                <div class="section-title">DADOS DO DESTINATÁRIO</div>
                <div class="field"><span class="field-label">Nome:</span> ' . htmlspecialchars($destinatario['nome']) . '</div>
                <div class="field"><span class="field-label">CPF/CNPJ:</span> ' . htmlspecialchars($destinatario['documento'] ?? '') . '</div>
            </div>';
        }
        
        // Adicionar produtos se existirem
        if (!empty($produtos)) {
            $html .= '
            <div class="section">
                <div class="section-title">PRODUTOS/SERVIÇOS</div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Descrição</th>
                            <th>Qtd</th>
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
                            <td>' . htmlspecialchars($produto['quantidade'] ?? '') . '</td>
                            <td>R$ ' . number_format($produto['valor_unitario'] ?? 0, 2, ',', '.') . '</td>
                            <td>R$ ' . number_format($produto['valor_total'] ?? 0, 2, ',', '.') . '</td>
                        </tr>';
            }
            
            $html .= '
                    </tbody>
                </table>
            </div>';
        }
        
        // Adicionar totais se existirem
        if (!empty($totais)) {
            $html .= '
            <div class="section">
                <div class="section-title">TOTAIS</div>
                <div class="field"><span class="field-label">Valor Total dos Produtos:</span> R$ ' . number_format($totais['valor_produtos'] ?? 0, 2, ',', '.') . '</div>
                <div class="field"><span class="field-label">Valor Total da NFe:</span> R$ ' . number_format($totais['valor_total'] ?? 0, 2, ',', '.') . '</div>
            </div>';
        }
        
        $html .= '
        <div style="text-align: center; margin-top: 30px;">
            <button class="print-btn" onclick="window.print()">🖨️ Imprimir</button>
            <button class="print-btn" onclick="window.close()">❌ Fechar</button>
        </div>
        
        </body>
        </html>';
        
        // Salvar HTML
        $diretorioEspelhos = __DIR__ . "/../storage/espelhos/{$empresa_id}/homologacao/55/";
        
        if (!is_dir($diretorioEspelhos)) {
            mkdir($diretorioEspelhos, 0755, true);
        }
        
        // Limpar arquivos antigos
        $arquivosAntigos = glob($diretorioEspelhos . "espelho_simples_*.html");
        foreach ($arquivosAntigos as $arquivo) {
            unlink($arquivo);
        }
        
        // Salvar novo arquivo
        $timestamp = date('YmdHis');
        $empresaIdLimpo = str_replace('-', '', $empresa_id);
        $nomeArquivo = "espelho_simples_{$empresaIdLimpo}_{$timestamp}.html";
        $caminhoCompleto = $diretorioEspelhos . $nomeArquivo;
        
        if (file_put_contents($caminhoCompleto, $html) === false) {
            throw new Exception('Erro ao salvar HTML');
        }
        
        error_log("✅ ESPELHO SIMPLES: HTML salvo: {$caminhoCompleto}");
        
        // Retornar sucesso
        echo json_encode([
            'sucesso' => true,
            'arquivo' => $nomeArquivo,
            'caminho' => "storage/espelhos/{$empresa_id}/homologacao/55/{$nomeArquivo}",
            'mensagem' => 'Espelho simples gerado com sucesso',
            'tipo' => 'html',
            'metodo' => 'formulario_dados'
        ]);
        
        return true;
        
    } catch (Exception $e) {
        error_log("❌ ESPELHO SIMPLES: Erro na geração: " . $e->getMessage());
        throw $e;
    }
}
?>
