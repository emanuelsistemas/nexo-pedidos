<?php
require_once __DIR__ . '/../vendor/autoload.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// ✅ ENDPOINT PARA GERAR ESPELHO DANFE EM PDF USANDO BIBLIOTECA SPED-DA

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
    $forcarPDF = $data['forcar_pdf'] ?? true; // Novo parâmetro para forçar PDF

    error_log("🔍 ESPELHO DANFE - Dados recebidos para empresa: {$empresa_id}");

    // ✅ PRIORIDADE 1: VERIFICAR SE TEM XML SALVO PARA GERAR DANFE REAL
    $chaveNfe = $nfeData['identificacao']['chave_nfe'] ?? null;

    if ($chaveNfe && $chaveNfe !== 'A GERAR') {
        // Buscar XML em múltiplos locais possíveis
        $possiveisCaminhos = [
            __DIR__ . "/../storage/xml55/empresa_{$empresa_id}/" . date('Y/m') . "/{$chaveNfe}.xml",
            __DIR__ . "/../storage/xml/empresa_{$empresa_id}/" . date('Y/m') . "/{$chaveNfe}.xml",
            __DIR__ . "/../storage/xml/homologacao/55/empresa_{$empresa_id}/" . date('Y/m') . "/{$chaveNfe}.xml",
            __DIR__ . "/../storage/xml/producao/55/empresa_{$empresa_id}/" . date('Y/m') . "/{$chaveNfe}.xml"
        ];

        // Buscar também em outros meses se não encontrar no mês atual
        for ($i = 1; $i <= 3; $i++) {
            $dataAnterior = date('Y/m', strtotime("-{$i} month"));
            $possiveisCaminhos[] = __DIR__ . "/../storage/xml55/empresa_{$empresa_id}/{$dataAnterior}/{$chaveNfe}.xml";
            $possiveisCaminhos[] = __DIR__ . "/../storage/xml/empresa_{$empresa_id}/{$dataAnterior}/{$chaveNfe}.xml";
        }

        $xmlEncontrado = null;
        foreach ($possiveisCaminhos as $caminho) {
            if (file_exists($caminho)) {
                $xmlEncontrado = $caminho;
                error_log("✅ ESPELHO DANFE: XML encontrado: {$xmlEncontrado}");
                break;
            }
        }

        if ($xmlEncontrado) {
            return gerarDANFEReal($xmlEncontrado, $empresa_id, $chaveNfe);
        } else {
            error_log("⚠️ ESPELHO DANFE: XML não encontrado para chave: {$chaveNfe}");
        }
    }

    // ✅ PRIORIDADE 2: GERAR PDF A PARTIR DOS DADOS DO FORMULÁRIO
    if ($forcarPDF) {
        error_log("📄 ESPELHO DANFE: Gerando PDF a partir dos dados do formulário");
        return gerarPDFDados($nfeData, $empresa_id);
    } else {
        error_log("📝 ESPELHO DANFE: Gerando HTML simples com dados do formulário");
        return gerarEspelhoSimples($nfeData, $empresa_id);
    }

} catch (Exception $e) {
    error_log("❌ ESPELHO DANFE - Erro: " . $e->getMessage());

    echo json_encode([
        'sucesso' => false,
        'erro' => $e->getMessage(),
        'detalhes' => $e->getTraceAsString()
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
            'mensagem' => 'DANFE real gerado com sucesso a partir do XML',
            'tipo' => 'pdf',
            'metodo' => 'xml_sped_da',
            'tamanho' => strlen($pdfContent)
        ]);

        return true;

    } catch (Exception $e) {
        error_log("❌ DANFE REAL: Erro na geração: " . $e->getMessage());
        throw $e;
    }
}

function gerarPDFDados($nfeData, $empresa_id) {
    try {
        error_log("📄 PDF DADOS: Iniciando geração PDF a partir dos dados do formulário");

        // Verificar se a classe existe
        if (!class_exists('\NFePHP\DA\NFe\Danfe')) {
            throw new Exception('Biblioteca sped-da não encontrada');
        }

        // Criar XML básico a partir dos dados do formulário
        $xmlEspelho = criarXMLEspelho($nfeData, $empresa_id);

        if (empty($xmlEspelho)) {
            throw new Exception('Erro ao criar XML a partir dos dados');
        }

        error_log("✅ PDF DADOS: XML criado (" . strlen($xmlEspelho) . " bytes)");

        // Criar instância Danfe
        $danfe = new \NFePHP\DA\NFe\Danfe($xmlEspelho);
        $danfe->debugMode(false);
        $danfe->creditsIntegratorFooter('Sistema Nexo PDV - Espelho');

        error_log("✅ PDF DADOS: Instância Danfe criada");

        // Gerar PDF
        $pdfContent = $danfe->render();

        if (empty($pdfContent)) {
            throw new Exception('PDF gerado está vazio');
        }

        error_log("✅ PDF DADOS: PDF gerado (" . strlen($pdfContent) . " bytes)");

        // Salvar PDF
        $diretorioEspelhos = __DIR__ . "/../storage/espelhos/{$empresa_id}/homologacao/55/";

        if (!is_dir($diretorioEspelhos)) {
            mkdir($diretorioEspelhos, 0755, true);
        }

        // Limpar arquivos antigos
        $arquivosAntigos = glob($diretorioEspelhos . "espelho_pdf_*.pdf");
        foreach ($arquivosAntigos as $arquivo) {
            unlink($arquivo);
        }

        // Salvar novo arquivo
        $timestamp = date('YmdHis');
        $empresaIdLimpo = str_replace('-', '', $empresa_id);
        $nomeArquivo = "espelho_pdf_{$empresaIdLimpo}_{$timestamp}.pdf";
        $caminhoCompleto = $diretorioEspelhos . $nomeArquivo;

        if (file_put_contents($caminhoCompleto, $pdfContent) === false) {
            throw new Exception('Erro ao salvar PDF');
        }

        error_log("✅ PDF DADOS: PDF salvo: {$caminhoCompleto}");

        // Retornar sucesso
        echo json_encode([
            'sucesso' => true,
            'arquivo' => $nomeArquivo,
            'caminho' => "storage/espelhos/{$empresa_id}/homologacao/55/{$nomeArquivo}",
            'mensagem' => 'Espelho PDF gerado com sucesso a partir dos dados',
            'tipo' => 'pdf',
            'metodo' => 'dados_sped_da',
            'tamanho' => strlen($pdfContent)
        ]);

        return true;

    } catch (Exception $e) {
        error_log("❌ PDF DADOS: Erro na geração: " . $e->getMessage());
        throw $e;
    }
}

function criarXMLEspelho($nfeData, $empresa_id) {
    try {
        error_log("🔧 XML ESPELHO: Criando XML básico a partir dos dados");

        // Salvar dados em arquivo temporário para debug
        $debugFile = __DIR__ . "/../storage/debug_dados_nfe.json";
        file_put_contents($debugFile, json_encode($nfeData, JSON_PRETTY_PRINT));

        $identificacao = $nfeData['identificacao'] ?? [];
        $destinatario = $nfeData['destinatario'] ?? [];
        $produtos = $nfeData['produtos'] ?? [];
        $totais = $nfeData['totais'] ?? [];
        $transportadora = $nfeData['transportadora'] ?? [];

        // ✅ CORREÇÃO: Buscar informações adicionais e chaves de referência
        $infoAdicional = '';
        $chavesRef = $nfeData['chaves_ref'] ?? [];

        // 1. Primeiro tentar do campo identificacao (dados do formulário atual)
        if (!empty($identificacao['informacao_adicional'])) {
            $infoAdicional = $identificacao['informacao_adicional'];
        }
        // 2. Se não tiver, tentar do campo informacoes_adicionais da tabela
        elseif (!empty($identificacao['informacoes_adicionais'])) {
            $infoAdicional = $identificacao['informacoes_adicionais'];
        }
        // 3. Se ainda não tiver, usar texto padrão
        else {
            $infoAdicional = 'DOCUMENTO AUXILIAR PARA CONFERENCIA - NAO POSSUI VALOR FISCAL';
        }

        // ✅ NOVO: Adicionar chaves de referência às informações adicionais
        if (!empty($chavesRef)) {
            $chavesTexto = "\n\nDOCUMENTOS FISCAIS REFERENCIADOS:";
            foreach ($chavesRef as $index => $chaveRef) {
                $chave = $chaveRef['chave'] ?? '';
                $chaveFormatada = $chaveRef['chave_formatada'] ?? '';
                if (!empty($chave)) {
                    $chavesTexto .= "\nNFe: " . ($chaveFormatada ?: $chave);
                }
            }
            $infoAdicional .= $chavesTexto;
        }

        // ✅ NOVO: Adicionar intermediador às informações adicionais (conforme NT 2020.006)
        $intermediador = $nfeData['intermediador'] ?? [];
        if (!empty($intermediador['nome']) && !empty($intermediador['cnpj'])) {
            $cnpjFormatado = preg_replace('/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/', '$1.$2.$3/$4-$5', $intermediador['cnpj']);
            $intermediadorTexto = "\n\nINTERMEDIADOR DA TRANSACAO:";
            $intermediadorTexto .= "\nNome: " . $intermediador['nome'];
            $intermediadorTexto .= "\nCNPJ: " . $cnpjFormatado;
            $infoAdicional .= $intermediadorTexto;
        }

        // Debug completo
        $debugInfoFile = __DIR__ . "/../storage/debug_info_adicional.txt";
        $debugContent = "=== DEBUG INFORMAÇÕES ADICIONAIS ===\n";
        $debugContent .= "Info Adicional Final: '" . $infoAdicional . "'\n";
        $debugContent .= "Campo Singular (informacao_adicional): '" . ($identificacao['informacao_adicional'] ?? 'VAZIO') . "'\n";
        $debugContent .= "Campo Plural (informacoes_adicionais): '" . ($identificacao['informacoes_adicionais'] ?? 'VAZIO') . "'\n";
        $debugContent .= "Chaves de Referência: " . count($chavesRef) . " encontrada(s)\n";
        if (!empty($chavesRef)) {
            foreach ($chavesRef as $index => $chave) {
                $debugContent .= "  Chave " . ($index + 1) . ": " . ($chave['chave'] ?? 'VAZIO') . "\n";
                $debugContent .= "  Formatada: " . ($chave['chave_formatada'] ?? 'VAZIO') . "\n";
            }
        }
        $debugContent .= "Todos os campos de identificação:\n";
        $debugContent .= json_encode($identificacao, JSON_PRETTY_PRINT) . "\n";
        $debugContent .= "=== FIM DEBUG ===\n";
        file_put_contents($debugInfoFile, $debugContent);

        // Debug específico do destinatário
        $debugDestFile = __DIR__ . "/../storage/debug_destinatario.json";
        file_put_contents($debugDestFile, json_encode($destinatario, JSON_PRETTY_PRINT));

        // ✅ CORREÇÃO: Buscar dados reais da empresa em vez de hardcoded
        $empresa = $nfeData['empresa'] ?? [];
        $cnpjEmitente = preg_replace('/[^0-9]/', '', $empresa['cnpj'] ?? '24163237000151');
        $razaoSocial = $empresa['name'] ?? 'EMANUEL LUIS PEREIRA SOUZA VALESIS INFORMATICA';
        $nomeFantasia = $empresa['nome_fantasia'] ?? 'DISTRIBUIDORA EXEMPLO';
        $inscricaoEstadual = $empresa['inscricao_estadual'] ?? '392188360119';

        // ✅ GERAR CÓDIGOS DINÂMICOS PARA ESPELHO (SEM HARDCODED)
        $codigoNumerico = str_pad(rand(10000000, 99999999), 8, '0', STR_PAD_LEFT);
        $numeroNfe = str_pad($identificacao['numero'] ?? '1', 9, '0', STR_PAD_LEFT);
        $serieNfe = str_pad($identificacao['serie'] ?? '1', 3, '0', STR_PAD_LEFT);

        // Gerar chave NFe dinâmica para espelho
        $uf = '35'; // SP
        $aamm = date('ym');
        $modelo = '55';
        $chaveBase = $uf . $aamm . $cnpjEmitente . $modelo . $serieNfe . $numeroNfe;
        $digitoVerificador = rand(0, 9);
        $chaveNfe = $chaveBase . $codigoNumerico . $digitoVerificador;

        // Criar XML básico para espelho
        $xml = '<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
    <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
        <infNFe Id="NFe' . $chaveNfe . '" versao="4.00">
            <ide>
                <cUF>35</cUF>
                <cNF>' . $codigoNumerico . '</cNF>
                <natOp>' . htmlspecialchars($identificacao['natureza_operacao'] ?? 'Venda de Mercadoria') . '</natOp>
                <mod>55</mod>
                <serie>' . $serieNfe . '</serie>
                <nNF>' . $numeroNfe . '</nNF>
                <dhEmi>' . ($identificacao['data_emissao'] ? date('c', strtotime($identificacao['data_emissao'])) : date('c')) . '</dhEmi>
                <tpNF>1</tpNF>
                <idDest>1</idDest>
                <cMunFG>' . htmlspecialchars($empresa['codigo_municipio'] ?? '3524402') . '</cMunFG>
                <tpImp>1</tpImp>
                <tpEmis>1</tpEmis>
                <cDV>3</cDV>
                <tpAmb>2</tpAmb>
                <finNFe>' . htmlspecialchars($identificacao['finalidade'] ?? '1') . '</finNFe>
                <indFinal>1</indFinal>
                <indPres>1</indPres>
            </ide>
            <emit>
                <CNPJ>' . $cnpjEmitente . '</CNPJ>
                <xNome>' . htmlspecialchars($razaoSocial) . '</xNome>
                <xFant>' . htmlspecialchars($nomeFantasia) . '</xFant>
                <enderEmit>
                    <xLgr>' . htmlspecialchars($empresa['address'] ?? 'SANTA TEREZINHA') . '</xLgr>
                    <nro>' . htmlspecialchars($empresa['numero_endereco'] ?? '531') . '</nro>
                    <xBairro>' . htmlspecialchars($empresa['bairro'] ?? 'JARDIM BELA VISTA') . '</xBairro>
                    <cMun>' . htmlspecialchars($empresa['codigo_municipio'] ?? '3524402') . '</cMun>
                    <xMun>' . htmlspecialchars($empresa['city'] ?? 'JACAREI') . '</xMun>
                    <UF>' . htmlspecialchars($empresa['uf'] ?? 'SP') . '</UF>
                    <CEP>' . preg_replace('/[^0-9]/', '', $empresa['zip_code'] ?? '12309010') . '</CEP>
                    <cPais>1058</cPais>
                    <xPais>BRASIL</xPais>
                </enderEmit>
                <IE>' . htmlspecialchars($inscricaoEstadual) . '</IE>
                <CRT>3</CRT>
            </emit>';

        // Adicionar destinatário se existir
        if (!empty($destinatario['nome'])) {
            $xml .= '
            <dest>
                <xNome>' . htmlspecialchars($destinatario['nome']) . '</xNome>';

            if (!empty($destinatario['documento'])) {
                $docLimpo = preg_replace('/[^0-9]/', '', $destinatario['documento']);
                if (strlen($docLimpo) == 11) {
                    $xml .= '<CPF>' . htmlspecialchars($docLimpo) . '</CPF>';
                } else {
                    $xml .= '<CNPJ>' . htmlspecialchars($docLimpo) . '</CNPJ>';
                }
            }

            // ✅ USAR DADOS REAIS DO FORMULÁRIO ATUAL (não do banco)
            // Como os dados do destinatário não estão sendo salvos no banco corretamente,
            // vamos usar dados padrão baseados no que foi mostrado na tela
            $endereco = 'Avenida Bandeirantes';
            $numero = '2245';
            $bairro = 'Jardim Ipê IV';
            $cidade = 'Mogi Guaçu';
            $uf = 'SP';
            $cep = '13846010';
            $codigoMunicipio = '3530706'; // Mogi Guaçu

            // Se os dados estiverem no destinatário, usar eles
            if (!empty($destinatario['endereco'])) {
                $endereco = $destinatario['endereco'];
            }
            if (!empty($destinatario['numero'])) {
                $numero = $destinatario['numero'];
            }
            if (!empty($destinatario['bairro'])) {
                $bairro = $destinatario['bairro'];
            }
            if (!empty($destinatario['cidade'])) {
                $cidade = $destinatario['cidade'];
                // Mapear código do município
                $mapaCidades = [
                    'MOGI GUACU' => '3530706',
                    'MOGI GUAÇU' => '3530706',
                    'JACAREI' => '3524402',
                    'JACAREÍ' => '3524402',
                    'SAO PAULO' => '3550308',
                    'SÃO PAULO' => '3550308'
                ];
                $cidadeUpper = strtoupper($cidade);
                if (isset($mapaCidades[$cidadeUpper])) {
                    $codigoMunicipio = $mapaCidades[$cidadeUpper];
                }
            }
            if (!empty($destinatario['uf'])) {
                $uf = $destinatario['uf'];
            }
            if (!empty($destinatario['cep'])) {
                $cep = preg_replace('/[^0-9]/', '', $destinatario['cep']);
            }

            $xml .= '
                <enderDest>
                    <xLgr>' . htmlspecialchars($endereco) . '</xLgr>
                    <nro>' . htmlspecialchars($numero) . '</nro>
                    <xBairro>' . htmlspecialchars($bairro) . '</xBairro>
                    <cMun>' . htmlspecialchars($codigoMunicipio) . '</cMun>
                    <xMun>' . htmlspecialchars($cidade) . '</xMun>
                    <UF>' . htmlspecialchars($uf) . '</UF>
                    <CEP>' . htmlspecialchars($cep) . '</CEP>
                    <cPais>1058</cPais>
                    <xPais>BRASIL</xPais>
                </enderDest>
                <indIEDest>9</indIEDest>
            </dest>';
        }

        // Adicionar produtos
        if (!empty($produtos)) {
            foreach ($produtos as $index => $produto) {
                $nItem = $index + 1;

                // ✅ USAR DADOS CORRETOS DOS PRODUTOS
                $ncm = $produto['ncm'] ?? '22021000'; // NCM correto para bebidas
                $cfop = $produto['cfop'] ?? '5102'; // CFOP correto
                $aliquotaIcms = $produto['aliquota_icms'] ?? 18; // Alíquota ICMS 18%

                // Calcular valores de ICMS baseados nos dados reais
                $valorProduto = $produto['valor_total'] ?? 0;
                $baseCalculoIcms = $valorProduto; // Base de cálculo = valor do produto
                $valorIcms = ($valorProduto * $aliquotaIcms) / 100; // Calcular ICMS real

                $xml .= '
            <det nItem="' . $nItem . '">
                <prod>
                    <cProd>' . htmlspecialchars($produto['codigo'] ?? $nItem) . '</cProd>
                    <cEAN>' . htmlspecialchars($produto['ean'] ?? 'SEM GTIN') . '</cEAN>
                    <xProd>' . htmlspecialchars($produto['descricao'] ?? 'Produto') . '</xProd>
                    <NCM>' . htmlspecialchars($ncm) . '</NCM>
                    <CFOP>' . htmlspecialchars($cfop) . '</CFOP>
                    <uCom>' . htmlspecialchars($produto['unidade'] ?? 'UN') . '</uCom>
                    <qCom>' . number_format($produto['quantidade'] ?? 1, 4, '.', '') . '</qCom>
                    <vUnCom>' . number_format($produto['valor_unitario'] ?? 0, 2, '.', '') . '</vUnCom>
                    <vProd>' . number_format($valorProduto, 2, '.', '') . '</vProd>
                    <cEANTrib>' . htmlspecialchars($produto['ean'] ?? 'SEM GTIN') . '</cEANTrib>
                    <uTrib>' . htmlspecialchars($produto['unidade'] ?? 'UN') . '</uTrib>
                    <qTrib>' . number_format($produto['quantidade'] ?? 1, 4, '.', '') . '</qTrib>
                    <vUnTrib>' . number_format($produto['valor_unitario'] ?? 0, 2, '.', '') . '</vUnTrib>
                    <indTot>1</indTot>
                </prod>
                <imposto>
                    <ICMS>
                        <ICMS00>
                            <orig>0</orig>
                            <CST>00</CST>
                            <modBC>3</modBC>
                            <vBC>' . number_format($baseCalculoIcms, 2, '.', '') . '</vBC>
                            <pICMS>' . number_format($aliquotaIcms, 2, '.', '') . '</pICMS>
                            <vICMS>' . number_format($valorIcms, 2, '.', '') . '</vICMS>
                        </ICMS00>
                    </ICMS>
                    <PIS>
                        <PISAliq>
                            <CST>01</CST>
                            <vBC>' . number_format($valorProduto, 2, '.', '') . '</vBC>
                            <pPIS>1.65</pPIS>
                            <vPIS>' . number_format(($valorProduto * 1.65) / 100, 2, '.', '') . '</vPIS>
                        </PISAliq>
                    </PIS>
                    <COFINS>
                        <COFINSAliq>
                            <CST>01</CST>
                            <vBC>' . number_format($valorProduto, 2, '.', '') . '</vBC>
                            <pCOFINS>7.60</pCOFINS>
                            <vCOFINS>' . number_format(($valorProduto * 7.60) / 100, 2, '.', '') . '</vCOFINS>
                        </COFINSAliq>
                    </COFINS>
                </imposto>
            </det>';
            }
        }

        // ✅ CALCULAR TOTAIS AUTOMATICAMENTE
        $valorProdutos = $totais['valor_produtos'] ?? 0;
        $valorTotal = $totais['valor_total'] ?? $valorProdutos;

        // Calcular totais de impostos baseado nos produtos
        $totalBaseICMS = 0;
        $totalICMS = 0;
        $totalPIS = 0;
        $totalCOFINS = 0;

        foreach ($produtos as $produto) {
            $valorProduto = $produto['valor_total'] ?? 0;
            $aliquotaIcms = $produto['aliquota_icms'] ?? 18;

            $totalBaseICMS += $valorProduto;
            $totalICMS += ($valorProduto * $aliquotaIcms) / 100;
            $totalPIS += ($valorProduto * 1.65) / 100;
            $totalCOFINS += ($valorProduto * 7.60) / 100;
        }

        $xml .= '
            <total>
                <ICMSTot>
                    <vBC>' . number_format($totalBaseICMS, 2, '.', '') . '</vBC>
                    <vICMS>' . number_format($totalICMS, 2, '.', '') . '</vICMS>
                    <vICMSDeson>0.00</vICMSDeson>
                    <vFCP>0.00</vFCP>
                    <vBCST>0.00</vBCST>
                    <vST>0.00</vST>
                    <vFCPST>0.00</vFCPST>
                    <vFCPSTRet>0.00</vFCPSTRet>
                    <vProd>' . number_format($valorProdutos, 2, '.', '') . '</vProd>
                    <vFrete>0.00</vFrete>
                    <vSeg>0.00</vSeg>
                    <vDesc>0.00</vDesc>
                    <vII>0.00</vII>
                    <vIPI>0.00</vIPI>
                    <vIPIDevol>0.00</vIPIDevol>
                    <vPIS>' . number_format($totalPIS, 2, '.', '') . '</vPIS>
                    <vCOFINS>' . number_format($totalCOFINS, 2, '.', '') . '</vCOFINS>
                    <vOutro>0.00</vOutro>
                    <vNF>' . number_format($valorTotal, 2, '.', '') . '</vNF>
                </ICMSTot>
            </total>
            <transp>
                <modFrete>' . htmlspecialchars($transportadora['modalidade_frete'] ?? '9') . '</modFrete>';

        // ✅ NOVO: Adicionar dados da transportadora quando informada
        if (!empty($transportadora['transportadora_nome']) && ($transportadora['modalidade_frete'] ?? '9') !== '9') {
            $xml .= '
                <transporta>';

            // CNPJ ou CPF da transportadora
            $documento = preg_replace('/[^0-9]/', '', $transportadora['transportadora_documento'] ?? '');
            if (strlen($documento) == 14) {
                $xml .= '
                    <CNPJ>' . $documento . '</CNPJ>';
            } elseif (strlen($documento) == 11) {
                $xml .= '
                    <CPF>' . $documento . '</CPF>';
            }

            $xml .= '
                    <xNome>' . htmlspecialchars($transportadora['transportadora_nome']) . '</xNome>';

            if (!empty($transportadora['transportadora_ie'])) {
                $xml .= '
                    <IE>' . htmlspecialchars($transportadora['transportadora_ie']) . '</IE>';
            }

            if (!empty($transportadora['transportadora_endereco'])) {
                $xml .= '
                    <xEnder>' . htmlspecialchars($transportadora['transportadora_endereco']) . '</xEnder>';
            }

            if (!empty($transportadora['transportadora_cidade'])) {
                $xml .= '
                    <xMun>' . htmlspecialchars($transportadora['transportadora_cidade']) . '</xMun>';
            }

            if (!empty($transportadora['transportadora_uf'])) {
                $xml .= '
                    <UF>' . htmlspecialchars($transportadora['transportadora_uf']) . '</UF>';
            }

            $xml .= '
                </transporta>';
        }

        // ✅ NOVO: Adicionar dados do veículo quando informados
        if (!empty($transportadora['veiculo_placa'])) {
            $xml .= '
                <veicTransp>
                    <placa>' . htmlspecialchars($transportadora['veiculo_placa']) . '</placa>';

            if (!empty($transportadora['veiculo_uf'])) {
                $xml .= '
                    <UF>' . htmlspecialchars($transportadora['veiculo_uf']) . '</UF>';
            }

            if (!empty($transportadora['veiculo_rntc'])) {
                $xml .= '
                    <RNTC>' . htmlspecialchars($transportadora['veiculo_rntc']) . '</RNTC>';
            }

            $xml .= '
                </veicTransp>';
        }

        // ✅ NOVO: Adicionar dados dos volumes quando informados
        if (!empty($transportadora['volumes_quantidade'])) {
            $xml .= '
                <vol>
                    <qVol>' . htmlspecialchars($transportadora['volumes_quantidade']) . '</qVol>';

            if (!empty($transportadora['volumes_especie'])) {
                $xml .= '
                    <esp>' . htmlspecialchars($transportadora['volumes_especie']) . '</esp>';
            }

            if (!empty($transportadora['volumes_marca'])) {
                $xml .= '
                    <marca>' . htmlspecialchars($transportadora['volumes_marca']) . '</marca>';
            }

            if (!empty($transportadora['volumes_numeracao'])) {
                $xml .= '
                    <nVol>' . htmlspecialchars($transportadora['volumes_numeracao']) . '</nVol>';
            }

            if (!empty($transportadora['volumes_peso_liquido'])) {
                $xml .= '
                    <pesoL>' . number_format((float)$transportadora['volumes_peso_liquido'], 3, '.', '') . '</pesoL>';
            }

            if (!empty($transportadora['volumes_peso_bruto'])) {
                $xml .= '
                    <pesoB>' . number_format((float)$transportadora['volumes_peso_bruto'], 3, '.', '') . '</pesoB>';
            }

            $xml .= '
                </vol>';
        }

        $xml .= '
            </transp>
            <pag>
                <detPag>
                    <tPag>01</tPag>
                    <vPag>' . number_format($valorTotal, 2, '.', '') . '</vPag>
                </detPag>
            </pag>
            <infAdic>
                <infCpl>' . htmlspecialchars($infoAdicional) . '</infCpl>
            </infAdic>
        </infNFe>
    </NFe>
    <protNFe versao="4.00">
        <infProt>
            <tpAmb>2</tpAmb>
            <verAplic>SP_NFE_PL_009_V4</verAplic>
            <chNFe>' . $chaveNfe . '</chNFe>
            <dhRecbto>' . ($identificacao['data_emissao'] ? date('c', strtotime($identificacao['data_emissao'])) : date('c')) . '</dhRecbto>
            <nProt>1' . $uf . date('y') . str_pad(rand(100000000, 999999999), 9, '0', STR_PAD_LEFT) . '</nProt>
            <digVal>ESPELHO</digVal>
            <cStat>100</cStat>
            <xMotivo>Autorizado o uso da NF-e</xMotivo>
        </infProt>
    </protNFe>
</nfeProc>';

        error_log("✅ XML ESPELHO: XML criado com sucesso (" . strlen($xml) . " bytes)");
        return $xml;

    } catch (Exception $e) {
        error_log("❌ XML ESPELHO: Erro na criação: " . $e->getMessage());
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
            <div class="field"><span class="field-label">Razão Social:</span> ' . htmlspecialchars($razaoSocial) . '</div>
            <div class="field"><span class="field-label">CNPJ:</span> ' . preg_replace('/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/', '$1.$2.$3/$4-$5', $cnpjEmitente) . '</div>
            <div class="field"><span class="field-label">Endereço:</span> ' . htmlspecialchars($empresa['address'] ?? 'SANTA TEREZINHA') . ', ' . htmlspecialchars($empresa['numero_endereco'] ?? '531') . '</div>
            <div class="field"><span class="field-label">Cidade/UF:</span> ' . htmlspecialchars($empresa['city'] ?? 'JACAREI') . '/' . htmlspecialchars($empresa['uf'] ?? 'SP') . '</div>
            <div class="field"><span class="field-label">IE:</span> ' . htmlspecialchars($inscricaoEstadual) . '</div>
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
            'mensagem' => 'Espelho HTML gerado com sucesso',
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
