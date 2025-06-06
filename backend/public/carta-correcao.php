<?php
/**
 * Endpoint para Carta de Correção Eletrônica (CCe)
 * 
 * SEGUINDO AS 4 LEIS NFe:
 * 1. LEI DOS DADOS REAIS - Apenas dados reais da SEFAZ
 * 2. LEI DA BIBLIOTECA SAGRADA - sped-nfe intocada
 * 3. LEI DA AUTENTICIDADE - Protocolos reais obrigatórios
 * 4. LEI DA EXCELÊNCIA - Solução robusta sem contornos
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../vendor/autoload.php';
use NFePHP\NFe\Tools;
use NFePHP\Common\Certificate;

try {
    
    // 1. Validar método HTTP
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método não permitido. Use POST.');
    }
    
    // 2. Receber e validar dados JSON
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Dados JSON inválidos');
    }
    
    // 3. Validar campos obrigatórios
    $empresaId = $input['empresa_id'] ?? null;
    $chaveNFe = $input['chave_nfe'] ?? null;
    $correcao = $input['correcao'] ?? null;
    $sequencia = $input['sequencia'] ?? 1;
    
    // 4. Validações específicas
    if (!$empresaId) {
        throw new Exception('empresa_id é obrigatório');
    }

    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $empresaId)) {
        throw new Exception('empresa_id inválido');
    }

    if (!$chaveNFe || strlen($chaveNFe) !== 44) {
        throw new Exception('Chave NFe inválida (deve ter 44 dígitos)');
    }

    if (!$correcao || strlen($correcao) < 15) {
        throw new Exception('Correção deve ter pelo menos 15 caracteres');
    }

    // 5. BUSCAR PRÓXIMA SEQUÊNCIA AUTOMATICAMENTE (se não informada)
    if (!$sequencia || $sequencia === 'auto') {
        error_log("🔍 CCe - Buscando próxima sequência automaticamente...");

        // ✅ CORRIGIDO: Usar tratamento de erro para consulta Supabase
        try {
            // Conectar ao Supabase para buscar CCe existentes
            $supabaseUrl = 'https://xsrirnfwsjeovekwtluz.supabase.co';
            $supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcmlybnZ3c2plb3Zla3d0bHV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzQzMzI2NCwiZXhwIjoyMDQ5MDA5MjY0fQ.VWHOLt7jgmJlvJoUeO_rKdJhBqjdcKhHt_6cNJhOaQs';

            $nfeQuery = $supabaseUrl . '/rest/v1/pdv?chave_nfe=eq.' . urlencode($chaveNFe) . '&empresa_id=eq.' . urlencode($empresaId) . '&select=cartas_correcao';
            $nfeContext = stream_context_create([
                'http' => [
                    'method' => 'GET',
                    'header' => [
                        'apikey: ' . $supabaseKey,
                        'Authorization: Bearer ' . $supabaseKey,
                        'Content-Type: application/json'
                    ]
                ]
            ]);

            $nfeResponse = @file_get_contents($nfeQuery, false, $nfeContext);

            if ($nfeResponse !== false) {
                $nfeData = json_decode($nfeResponse, true);

                if ($nfeData && !empty($nfeData)) {
                    $ccesExistentes = $nfeData[0]['cartas_correcao'] ? json_decode($nfeData[0]['cartas_correcao'], true) : [];
                    if (is_array($ccesExistentes)) {
                        $sequencia = count($ccesExistentes) + 1;
                        error_log("📝 CCe - Próxima sequência calculada: {$sequencia}");
                    } else {
                        $sequencia = 1;
                    }
                } else {
                    $sequencia = 1;
                }
            } else {
                error_log("⚠️ CCe - Erro ao consultar Supabase, usando sequência 1");
                $sequencia = 1;
            }
        } catch (Exception $e) {
            error_log("⚠️ CCe - Erro na consulta inicial: " . $e->getMessage() . ", usando sequência 1");
            $sequencia = 1;
        }
    }

    if (!is_numeric($sequencia) || $sequencia < 1 || $sequencia > 20) {
        throw new Exception('Sequência deve ser um número entre 1 e 20');
    }
    
    error_log("📝 CCe INICIADA - Empresa: {$empresaId}, Chave: {$chaveNFe}, Sequência: {$sequencia}");
    
    // 5. Carregar certificado da empresa
    $certificadoPath = "../storage/certificados/empresa_{$empresaId}.pfx";
    $metadataPath = "../storage/certificados/empresa_{$empresaId}.json";
    
    if (!file_exists($certificadoPath) || !file_exists($metadataPath)) {
        throw new Exception('Certificado não encontrado para esta empresa');
    }
    
    $metadata = json_decode(file_get_contents($metadataPath), true);
    if (!$metadata) {
        throw new Exception('Metadados do certificado inválidos');
    }
    
    $certificadoContent = file_get_contents($certificadoPath);
    $senha = $metadata['password'] ?? ''; // ✅ CORRIGIDO: usar 'password' em vez de 'senha'

    error_log("🔐 CCe - Carregando certificado: " . strlen($certificadoContent) . " bytes, senha: " . (empty($senha) ? 'VAZIA' : 'DEFINIDA'));

    // 6. Carregar configuração da empresa do Supabase
    $configResponse = file_get_contents("http://localhost/backend/public/get-empresa-config.php?empresa_id={$empresaId}");
    $configData = json_decode($configResponse, true);

    if (!$configData || !$configData['success']) {
        throw new Exception('Erro ao carregar configuração da empresa: ' . ($configData['error'] ?? 'Erro desconhecido'));
    }

    $empresa = $configData['data']['empresa'];
    $nfeConfig = $configData['data']['nfe_config'];

    // 7. Configurar biblioteca sped-nfe (MÉTODO NATIVO)
    // ✅ CORRIGIDO: Limpar CNPJ igual emissão e cancelamento
    $cnpjLimpo = preg_replace('/[^0-9]/', '', $empresa['cnpj']);
    if (strlen($cnpjLimpo) !== 14) {
        throw new Exception('CNPJ da empresa deve ter 14 dígitos');
    }

    $config = [
        'atualizacao' => date('Y-m-d H:i:s'),
        'tpAmb' => $nfeConfig['ambiente_codigo'], // 1=Produção, 2=Homologação
        'razaosocial' => $empresa['razao_social'],
        'cnpj' => $cnpjLimpo, // ✅ CNPJ limpo sem pontuação
        'siglaUF' => $empresa['uf'],
        'schemes' => 'PL_009_V4',
        'versao' => '4.00'
    ];

    error_log("📝 CCe - CNPJ configurado: {$cnpjLimpo}");

    // ✅ CORRIGIDO: Criar objeto Certificate corretamente
    try {
        $certificate = Certificate::readPfx($certificadoContent, $senha);
        if (!$certificate) {
            throw new Exception('Falha ao carregar certificado digital. Verifique a senha.');
        }
        $tools = new Tools(json_encode($config), $certificate);
        error_log("✅ CCe - Certificado carregado com sucesso");
    } catch (Exception $e) {
        error_log("❌ CCe - Erro ao carregar certificado: " . $e->getMessage());
        throw new Exception('Impossivel ler o certificado, ocorreu o seguinte erro: (' . $e->getMessage() . ')');
    }
    
    error_log("📝 CCe CONFIG - Ambiente: {$nfeConfig['ambiente']} ({$nfeConfig['ambiente_codigo']})");
    
    // 8. VALIDAÇÃO PRÉVIA: Consultar NFe na SEFAZ (MÉTODO OFICIAL)
    error_log("🔍 CCe - Consultando NFe na SEFAZ antes da correção...");
    error_log("🔍 CCe - Chave NFe: {$chaveNFe}");

    // ✅ USANDO MÉTODO OFICIAL DA BIBLIOTECA (igual cancelamento)
    $consultaResponse = $tools->sefazConsultaChave($chaveNFe);
    error_log("🔍 CCe - Resposta consulta SEFAZ: " . $consultaResponse);

    // ✅ PROCESSAR XML SOAP CORRETAMENTE (igual cancelamento)
    $consultaXml = false;

    // Tentar processar XML direto
    $consultaXml = @simplexml_load_string($consultaResponse);

    // Se falhou, extrair conteúdo do envelope SOAP
    if (!$consultaXml) {
        if (preg_match('/<retConsSitNFe[^>]*>.*?<\/retConsSitNFe>/s', $consultaResponse, $xmlMatch)) {
            $consultaXml = @simplexml_load_string($xmlMatch[0]);
            error_log("✅ CCe - XML NFe extraído do envelope SOAP para consulta");
        }
    }

    if (!$consultaXml) {
        throw new Exception('Erro ao consultar NFe na SEFAZ para CCe');
    }

    // ✅ EXTRAIR STATUS E MOTIVO USANDO XPATH (igual cancelamento)
    $cStatArray = $consultaXml->xpath('//cStat') ?: $consultaXml->xpath('//*[local-name()="cStat"]');
    $xMotivoArray = $consultaXml->xpath('//xMotivo') ?: $consultaXml->xpath('//*[local-name()="xMotivo"]');

    $consultaCstat = !empty($cStatArray) ? (string)$cStatArray[0] : '';
    $consultaMotivo = !empty($xMotivoArray) ? (string)$xMotivoArray[0] : '';

    error_log("🔍 CCe - Status extraído da consulta: '{$consultaCstat}' - '{$consultaMotivo}'");
    
    // 9. Verificar se NFe pode receber CCe
    if ($consultaCstat !== '100') {
        $mensagemEspecifica = '';
        switch ($consultaCstat) {
            case '217':
                $mensagemEspecifica = 'NFe não encontrada na base da SEFAZ.';
                break;
            case '101':
                $mensagemEspecifica = 'NFe cancelada. NFes canceladas não podem receber Carta de Correção (Regra SEFAZ GA01).';
                break;
            case '110':
                $mensagemEspecifica = 'NFe denegada. NFes denegadas não podem receber Carta de Correção.';
                break;
            default:
                $mensagemEspecifica = "Status SEFAZ: {$consultaCstat} - {$consultaMotivo}";
        }
        throw new Exception("NFe não pode receber Carta de Correção. {$mensagemEspecifica}");
    }
    
    error_log("✅ CCe - NFe autorizada, pode receber correção");
    
    // 10. Executar Carta de Correção na SEFAZ (MÉTODO NATIVO)
    error_log("📝 CCe - Enviando para SEFAZ...");

    $response = $tools->sefazCCe($chaveNFe, $correcao, $sequencia);
    
    error_log("📝 CCe - Resposta SEFAZ: " . $response);
    
    // 11. PROCESSAR RESPOSTA DA SEFAZ (MÉTODO OFICIAL - igual cancelamento)
    error_log("📝 CCe - Processando resposta da SEFAZ...");

    // ✅ PROCESSAR XML SOAP CORRETAMENTE (igual cancelamento)
    $xml = false;

    // Tentar processar XML direto
    $xml = @simplexml_load_string($response);

    // Se falhou, extrair conteúdo do envelope SOAP
    if (!$xml) {
        if (preg_match('/<retEnvEvento[^>]*>.*?<\/retEnvEvento>/s', $response, $xmlMatch)) {
            $xml = @simplexml_load_string($xmlMatch[0]);
            error_log("✅ CCe - XML extraído do envelope SOAP");
        }
    }

    if (!$xml) {
        error_log("❌ CCe - Erro ao processar XML da resposta SEFAZ");
        error_log("📝 CCe - Resposta recebida: " . substr($response, 0, 500) . "...");
        throw new Exception('Erro ao processar resposta da SEFAZ');
    }

    // 12. EXTRAIR STATUS DA CCe USANDO XPATH (igual cancelamento)
    $cStatArray = $xml->xpath('//cStat') ?: $xml->xpath('//*[local-name()="cStat"]');
    $xMotivoArray = $xml->xpath('//xMotivo') ?: $xml->xpath('//*[local-name()="xMotivo"]');

    $cStat = !empty($cStatArray) ? (string)$cStatArray[0] : '';
    $xMotivo = !empty($xMotivoArray) ? (string)$xMotivoArray[0] : '';

    error_log("📝 CCe - Status extraído: '{$cStat}' - '{$xMotivo}'");
    
    // 13. VERIFICAR STATUS CCe COM RETRY PATTERN (igual cancelamento)
    if ($cStat === '128') {
        // Status 128 = Lote de Evento Processado - AGUARDAR E CONSULTAR NOVAMENTE
        error_log("⏳ CCe - Status 128 detectado, implementando retry pattern...");

        // ✅ RETRY PATTERN IGUAL CANCELAMENTO (que funciona)
        $maxTentativas = 3;
        $retryIntervals = [3, 5, 8]; // segundos entre tentativas

        for ($tentativa = 1; $tentativa <= $maxTentativas; $tentativa++) {
            error_log("🔄 CCe TENTATIVA {$tentativa}/{$maxTentativas} - Aguardando {$retryIntervals[$tentativa-1]} segundos...");

            // Aguardar intervalo antes da consulta
            sleep($retryIntervals[$tentativa-1]);

            // Consultar status atual da NFe usando método oficial da biblioteca
            error_log("🔍 CCe - CONSULTANDO STATUS DA NFe (Tentativa {$tentativa})...");
            $consultaCce = $tools->sefazConsultaChave($chaveNFe);

            // Processar XML da consulta
            $xmlConsulta = false;

            // Tentar processar XML direto
            $xmlConsulta = @simplexml_load_string($consultaCce);

            // Se falhou, extrair conteúdo do envelope SOAP
            if (!$xmlConsulta) {
                if (preg_match('/<retConsSitNFe[^>]*>.*?<\/retConsSitNFe>/s', $consultaCce, $xmlMatch)) {
                    $xmlConsulta = @simplexml_load_string($xmlMatch[0]);
                    error_log("✅ CCe - XML NFe extraído do envelope SOAP (tentativa {$tentativa})");
                }
            }

            if ($xmlConsulta) {
                // Verificar se há eventos de CCe na resposta
                $eventosArray = $xmlConsulta->xpath('//retEvento') ?: $xmlConsulta->xpath('//*[local-name()="retEvento"]');

                if (!empty($eventosArray)) {
                    foreach ($eventosArray as $evento) {
                        $tpEventoArray = $evento->xpath('.//tpEvento') ?: $evento->xpath('.//*[local-name()="tpEvento"]');
                        $cStatEventoArray = $evento->xpath('.//cStat') ?: $evento->xpath('.//*[local-name()="cStat"]');

                        $tpEvento = !empty($tpEventoArray) ? (string)$tpEventoArray[0] : '';
                        $cStatEvento = !empty($cStatEventoArray) ? (string)$cStatEventoArray[0] : '';

                        // Verificar se é evento de CCe (110110) com status 135
                        if ($tpEvento === '110110' && $cStatEvento === '135') {
                            error_log("✅ CCe CONFIRMADA na tentativa {$tentativa}!");
                            error_log("✅ Status 135: Evento registrado e vinculado à NFe");

                            // Extrair protocolo da CCe
                            $nProtCceArray = $evento->xpath('.//nProt') ?: $evento->xpath('.//*[local-name()="nProt"]');
                            $protocoloCceConfirmado = !empty($nProtCceArray) ? (string)$nProtCceArray[0] : null;

                            // Atualizar variáveis para retorno de sucesso
                            $cStat = '135';
                            $xMotivo = 'Evento registrado e vinculado a NFe';
                            $protocoloCCe = $protocoloCceConfirmado ?: $protocoloCCe;

                            break 2; // Sair dos dois loops
                        }
                    }
                }
            }

            if ($tentativa === $maxTentativas) {
                error_log("❌ CCe - Timeout após {$maxTentativas} tentativas");
                throw new Exception("Timeout: CCe não foi confirmada após {$maxTentativas} tentativas. Status final: {$cStat} - {$xMotivo}");
            }
        }
    } elseif ($cStat !== '135') {
        error_log("❌ CCe REJEITADA - Status: {$cStat} - {$xMotivo}");
        throw new Exception("Carta de Correção rejeitada pela SEFAZ. Status: {$cStat} - {$xMotivo}");
    }
    
    // 14. EXTRAIR PROTOCOLO DA CCe (DADOS REAIS OBRIGATÓRIOS - igual cancelamento)
    $nProtCCeArray = $xml->xpath('//nProt') ?:
                     $xml->xpath('//*[local-name()="nProt"]') ?:
                     $xml->xpath('//protEvento/infEvento/nProt') ?:
                     $xml->xpath('//*[local-name()="protEvento"]//*[local-name()="infEvento"]//*[local-name()="nProt"]');

    $protocoloCCe = !empty($nProtCCeArray) ? (string)$nProtCCeArray[0] : null;

    if (!$protocoloCCe) {
        error_log("❌ CCe - Protocolo não encontrado na resposta");
        error_log("📝 CCe - XML para debug: " . substr($response, 0, 1000) . "...");
        throw new Exception('Protocolo da CCe não encontrado na resposta da SEFAZ');
    }
    
    error_log("✅ CCe ACEITA - Protocolo: {$protocoloCCe}");
    
    // 15. GERAR E SALVAR XML COMPLETO DE CCe (procEventoNFe)
    error_log("💾 CCe - Gerando XML completo do evento...");

    try {
        // ✅ USAR MÉTODO OFICIAL DA BIBLIOTECA PARA GERAR procEventoNFe
        $xmlCompletoEvento = \NFePHP\NFe\Complements::addEnvEventoProtocol($eventoOriginal, $response);
        error_log("✅ CCe - XML completo do evento gerado com sucesso");
    } catch (Exception $e) {
        error_log("❌ CCe - Erro ao gerar XML completo: " . $e->getMessage());
        // Fallback: salvar apenas a resposta da SEFAZ
        $xmlCompletoEvento = $response;
        error_log("⚠️ CCe - Usando resposta da SEFAZ como fallback");
    }

    // Diretório para XMLs de CCe por empresa - ESTRUTURA ORGANIZADA
    $xmlCceDir = "/root/nexo/nexo-pedidos/backend/storage/xml/empresa_{$empresaId}/CCe/" . date('Y/m');
    if (!is_dir($xmlCceDir)) {
        mkdir($xmlCceDir, 0755, true);
        error_log("📁 Diretório de CCe criado: {$xmlCceDir}");
    }

    // Nome do arquivo: chave_nfe + _cce_ + sequencia.xml
    $nomeArquivoCce = $chaveNFe . '_cce_' . str_pad($sequencia, 3, '0', STR_PAD_LEFT) . '.xml';
    $caminhoArquivoCce = $xmlCceDir . '/' . $nomeArquivoCce;

    // Salvar XML completo de CCe (procEventoNFe)
    if (file_put_contents($caminhoArquivoCce, $xmlCompletoEvento)) {
        error_log("✅ XML completo de CCe salvo: {$caminhoArquivoCce}");
    } else {
        error_log("❌ Erro ao salvar XML de CCe");
        throw new Exception('Erro ao salvar XML da Carta de Correção');
    }
    
    // 16. SALVAR CCe NO BANCO DE DADOS (HISTÓRICO COMPLETO)
    error_log("💾 CCe - Salvando no banco de dados...");

    try {
        // Conectar ao Supabase
        $supabaseUrl = 'https://xsrirnfwsjeovekwtluz.supabase.co';
        $supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcmlybnZ3c2plb3Zla3d0bHV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzQzMzI2NCwiZXhwIjoyMDQ5MDA5MjY0fQ.VWHOLt7jgmJlvJoUeO_rKdJhBqjdcKhHt_6cNJhOaQs';

        // Buscar a NFe no banco
        $nfeQuery = $supabaseUrl . '/rest/v1/pdv?chave_nfe=eq.' . urlencode($chaveNFe) . '&empresa_id=eq.' . urlencode($empresaId);
        $nfeContext = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => [
                    'apikey: ' . $supabaseKey,
                    'Authorization: Bearer ' . $supabaseKey,
                    'Content-Type: application/json'
                ]
            ]
        ]);

        $nfeResponse = file_get_contents($nfeQuery, false, $nfeContext);
        $nfeData = json_decode($nfeResponse, true);

        if (!$nfeData || empty($nfeData)) {
            throw new Exception('NFe não encontrada no banco de dados');
        }

        $nfe = $nfeData[0];
        $pdvId = $nfe['id'];

        // Preparar dados da CCe para salvar
        $novaCce = [
            'sequencia' => $sequencia,
            'data_envio' => date('c'), // ISO 8601
            'protocolo' => $protocoloCCe,
            'correcao' => $correcao,
            'status' => 'aceita',
            'codigo_status' => $cStat,
            'descricao_status' => $xMotivo,
            'ambiente' => $nfeConfig['ambiente'],
            'xml_path' => $caminhoArquivoCce,
            'xml_nome' => $nomeArquivoCce
        ];

        // Obter CCe existentes
        $ccesExistentes = $nfe['cartas_correcao'] ? json_decode($nfe['cartas_correcao'], true) : [];
        if (!is_array($ccesExistentes)) {
            $ccesExistentes = [];
        }

        // Adicionar nova CCe
        $ccesExistentes[] = $novaCce;

        // Atualizar no banco
        $updateData = json_encode(['cartas_correcao' => $ccesExistentes]);
        $updateQuery = $supabaseUrl . '/rest/v1/pdv?id=eq.' . $pdvId;

        error_log("🔍 DEBUG CCe - PDV ID: {$pdvId}");
        error_log("🔍 DEBUG CCe - Update Data: " . $updateData);
        error_log("🔍 DEBUG CCe - Update Query: " . $updateQuery);

        $updateContext = stream_context_create([
            'http' => [
                'method' => 'PATCH',
                'header' => [
                    'apikey: ' . $supabaseKey,
                    'Authorization: Bearer ' . $supabaseKey,
                    'Content-Type: application/json',
                    'Prefer: return=minimal'
                ],
                'content' => $updateData
            ]
        ]);

        $updateResponse = file_get_contents($updateQuery, false, $updateContext);

        error_log("🔍 DEBUG CCe - Update Response: " . ($updateResponse === false ? 'FALSE' : $updateResponse));
        error_log("🔍 DEBUG CCe - HTTP Response Headers: " . print_r($http_response_header ?? [], true));

        if ($updateResponse === false) {
            throw new Exception('Erro ao atualizar CCe no banco de dados');
        }

        error_log("✅ CCe salva no banco - PDV ID: {$pdvId}, Sequência: {$sequencia}");

    } catch (Exception $dbError) {
        error_log("⚠️ Erro ao salvar CCe no banco: " . $dbError->getMessage());
        // Não falhar a CCe por erro de banco - CCe já foi aceita pela SEFAZ
    }

    // 17. Retornar sucesso com dados reais
    echo json_encode([
        'success' => true,
        'message' => 'Carta de Correção enviada com sucesso',
        'data' => [
            'chave_nfe' => $chaveNFe,
            'sequencia' => $sequencia,
            'correcao' => $correcao,
            'protocolo_cce' => $protocoloCCe,
            'data_cce' => date('Y-m-d H:i:s'),
            'codigo_status' => $cStat,
            'descricao_status' => $xMotivo,
            'ambiente' => $nfeConfig['ambiente'],
            'xml_cce_path' => $caminhoArquivoCce,
            'xml_cce_nome' => $nomeArquivoCce
        ],
        'response_sefaz' => $response
    ]);
    
} catch (Exception $e) {
    error_log("❌ ERRO CCe: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
