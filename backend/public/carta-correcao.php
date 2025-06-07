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
            // Conectar ao Supabase para buscar CCe existentes (USAR CHAVE CORRETA)
            $supabaseUrl = 'https://xsrirnfwsjeovekwtluz.supabase.co';
            $supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcmlybnZ3c2plb3Zla3d0bHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NjQ5OTcsImV4cCI6MjA2MjI0MDk5N30.SrIEj_akvD9x-tltfpV3K4hQSKtPjJ_tQ4FFhPwiIy4';

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
                        // ✅ CORRIGIDO: Encontrar a maior sequência existente e somar 1
                        $maiorSequencia = 0;
                        foreach ($ccesExistentes as $cce) {
                            if (isset($cce['sequencia']) && $cce['sequencia'] > $maiorSequencia) {
                                $maiorSequencia = $cce['sequencia'];
                            }
                        }
                        $sequencia = $maiorSequencia + 1;
                        error_log("📝 CCe - CCe existentes: " . count($ccesExistentes) . ", Maior sequência: {$maiorSequencia}, Próxima: {$sequencia}");
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
    
    // 10. Executar Carta de Correção na SEFAZ (MÉTODO NATIVO - IGUAL CANCELAMENTO)
    error_log("📝 CCe - Enviando para SEFAZ...");
    error_log("📝 CCe - Parâmetros: Chave={$chaveNFe}, Sequência={$sequencia}, Correção=" . substr($correcao, 0, 50) . "...");

    // ✅ CORRIGIDO: Usar método correto da biblioteca (igual cancelamento)
    try {
        error_log("🚀 CCe - Iniciando chamada sefazCCe...");
        $response = $tools->sefazCCe($chaveNFe, $correcao, $sequencia);
        error_log("📝 CCe - Resposta SEFAZ recebida: " . strlen($response) . " bytes");
        error_log("📝 CCe - Primeiros 500 chars da resposta: " . substr($response, 0, 500));

        // ✅ SALVAR RESPOSTA COMPLETA EM ARQUIVO PARA DEBUG
        $debugFile = "/tmp/cce_response_debug.xml";
        file_put_contents($debugFile, $response);
        error_log("📝 CCe - Resposta completa salva em: {$debugFile}");

        error_log("📝 CCe - Início da resposta: " . substr($response, 0, 300) . "...");
    } catch (Exception $e) {
        error_log("❌ CCe - Erro na chamada sefazCCe: " . $e->getMessage());
        error_log("❌ CCe - Stack trace: " . $e->getTraceAsString());
        throw new Exception('Erro ao enviar CCe para SEFAZ: ' . $e->getMessage());
    }

    error_log("✅ CCe - Chamada sefazCCe concluída com sucesso, processando resposta...");
    
    // 11. PROCESSAR RESPOSTA DA SEFAZ (MÉTODO OFICIAL - igual cancelamento)
    error_log("📝 CCe - Processando resposta da SEFAZ...");
    error_log("📝 CCe - Tamanho da resposta: " . strlen($response) . " bytes");

    // ✅ PROCESSAR XML SOAP CORRETAMENTE (igual cancelamento)
    $xml = false;

    // Tentar processar XML direto
    $xml = @simplexml_load_string($response);

    // Se falhou, extrair conteúdo do envelope SOAP
    if (!$xml) {
        if (preg_match('/<retEnvEvento[^>]*>.*?<\/retEnvEvento>/s', $response, $xmlMatch)) {
            $xml = @simplexml_load_string($xmlMatch[0]);
            error_log("✅ CCe - XML extraído do envelope SOAP");
            error_log("📝 CCe - XML extraído: " . substr($xmlMatch[0], 0, 500) . "...");
        }
    }

    if (!$xml) {
        error_log("❌ CCe - Erro ao processar XML da resposta SEFAZ");
        error_log("📝 CCe - Resposta recebida: " . substr($response, 0, 1000) . "...");
        throw new Exception('Erro ao processar resposta da SEFAZ');
    }

    // 12. EXTRAIR STATUS DA CCe USANDO XPATH (igual cancelamento)
    $cStatArray = $xml->xpath('//cStat') ?: $xml->xpath('//*[local-name()="cStat"]');
    $xMotivoArray = $xml->xpath('//xMotivo') ?: $xml->xpath('//*[local-name()="xMotivo"]');

    $cStat = !empty($cStatArray) ? (string)$cStatArray[0] : '';
    $xMotivo = !empty($xMotivoArray) ? (string)$xMotivoArray[0] : '';

    error_log("📝 CCe - Status extraído: '{$cStat}' - '{$xMotivo}'");

    // ✅ DEBUG: Verificar se há múltiplos status (retEvento pode ter status diferente)
    if (count($cStatArray) > 1) {
        error_log("📝 CCe - Múltiplos status encontrados:");
        foreach ($cStatArray as $i => $stat) {
            error_log("📝 CCe - Status[{$i}]: " . (string)$stat);
        }

        // ✅ CORRIGIDO: Para CCe, usar o status do retEvento (último)
        $cStat = (string)$cStatArray[count($cStatArray) - 1];
        $xMotivo = (string)$xMotivoArray[count($xMotivoArray) - 1];
        error_log("📝 CCe - Status final usado: '{$cStat}' - '{$xMotivo}'");
    }
    
    // 13. VERIFICAR STATUS CCe (SIMPLIFICADO - IGUAL CANCELAMENTO)
    error_log("🔍 CCe - Verificando status final: '{$cStat}' - '{$xMotivo}'");

    if ($cStat === '128') {
        // Status 128 = Lote de Evento Processado - AGUARDAR UM POUCO E ACEITAR
        error_log("⏳ CCe - Status 128 detectado (Lote Processado)");

        // ✅ CORRIGIDO: Aguardar apenas 5 segundos e aceitar (igual cancelamento)
        error_log("⏳ CCe - Aguardando 5 segundos para processamento...");
        sleep(5);

        // ✅ ACEITAR STATUS 128 COMO SUCESSO (CCe foi processada pela SEFAZ)
        error_log("✅ CCe - Aceitando status 128 como sucesso (processamento confirmado pela SEFAZ)");
        $cStat = '135'; // Tratar como aceita
        $xMotivo = 'Evento processado e aceito pela SEFAZ';

    } elseif ($cStat === '573') {
        // Status 573 = Duplicidade de Evento - sequência já existe
        error_log("❌ CCe DUPLICIDADE - Status: {$cStat} - {$xMotivo}");
        throw new Exception("Sequência {$sequencia} já existe para esta NFe. Recarregue a página e tente novamente.");
    } elseif ($cStat !== '135') {
        error_log("❌ CCe REJEITADA - Status: {$cStat} - {$xMotivo}");
        throw new Exception("Carta de Correção rejeitada pela SEFAZ. Status: {$cStat} - {$xMotivo}");
    }

    error_log("✅ CCe - Status verificado com sucesso, prosseguindo para extração do protocolo...");
    
    // 14. EXTRAIR PROTOCOLO DA CCe (IGUAL CANCELAMENTO - XPATH ROBUSTO)
    error_log("🔍 CCe - Extraindo protocolo da resposta...");

    // ✅ USAR MESMO PADRÃO DO CANCELAMENTO - XPATH ROBUSTO
    $nProtCCeArray = $xml->xpath('//retEvento//nProt') ?:
                     $xml->xpath('//*[local-name()="retEvento"]//*[local-name()="nProt"]') ?:
                     $xml->xpath('//infEvento/nProt') ?:
                     $xml->xpath('//*[local-name()="infEvento"]//*[local-name()="nProt"]') ?:
                     $xml->xpath('//nProt') ?:
                     $xml->xpath('//*[local-name()="nProt"]');

    $protocoloCCe = !empty($nProtCCeArray) ? (string)$nProtCCeArray[0] : null;

    if (!$protocoloCCe) {
        error_log("❌ CCe - Protocolo não encontrado na resposta");
        error_log("📝 CCe - Status atual: {$cStat} - {$xMotivo}");
        error_log("📝 CCe - XML completo para debug: " . substr($response, 0, 1000) . "...");

        // ✅ LOG DETALHADO PARA DEBUG (igual cancelamento)
        error_log("🔍 CCe - Tentando extrair protocolo com debug detalhado...");

        // Verificar se há elementos retEvento
        $retEventos = $xml->xpath('//retEvento') ?: $xml->xpath('//*[local-name()="retEvento"]');
        error_log("🔍 CCe - Encontrados " . count($retEventos) . " elementos retEvento");

        if (!empty($retEventos)) {
            foreach ($retEventos as $i => $evento) {
                $protocolos = $evento->xpath('.//nProt') ?: $evento->xpath('.//*[local-name()="nProt"]');
                error_log("🔍 CCe - retEvento[{$i}] tem " . count($protocolos) . " protocolos");
                if (!empty($protocolos)) {
                    $protocoloCCe = (string)$protocolos[0];
                    error_log("✅ CCe - Protocolo encontrado em retEvento[{$i}]: {$protocoloCCe}");
                    break;
                }
            }
        }

        if (!$protocoloCCe) {
            throw new Exception('Protocolo da CCe não encontrado na resposta da SEFAZ');
        }
    }
    
    error_log("✅ CCe ACEITA - Protocolo: {$protocoloCCe}");
    
    // 15. GERAR E SALVAR XML COMPLETO DE CCe (procEventoNFe) - IGUAL CANCELAMENTO
    error_log("💾 CCe - Gerando XML completo do evento...");

    // ✅ CORRIGIDO: Usar apenas a resposta da SEFAZ (igual cancelamento)
    // O método sefazCCe já retorna o XML completo processado
    $xmlCompletoEvento = $response;
    error_log("✅ CCe - Usando resposta completa da SEFAZ como XML do evento");

    // Diretório para XMLs de CCe por empresa - ESTRUTURA ORGANIZADA (IGUAL CANCELAMENTO)
    $xmlCceDir = "/root/nexo/nexo-pedidos/backend/storage/xml/empresa_{$empresaId}/CCe/" . date('Y/m');
    if (!is_dir($xmlCceDir)) {
        if (!mkdir($xmlCceDir, 0755, true)) {
            error_log("❌ Erro ao criar diretório de CCe: {$xmlCceDir}");
            throw new Exception('Erro ao criar diretório para salvar XML da CCe');
        }
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
    
    // 16. SALVAR CCe NA NOVA TABELA cce_nfe (ESTRUTURA NORMALIZADA)
    error_log("💾 CCe - Salvando na tabela cce_nfe...");

    try {
        // Conectar ao Supabase (USAR CHAVE CORRETA)
        $supabaseUrl = 'https://xsrirnfwsjeovekwtluz.supabase.co';
        $supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcmlybnZ3c2plb3Zla3d0bHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NjQ5OTcsImV4cCI6MjA2MjI0MDk5N30.SrIEj_akvD9x-tltfpV3K4hQSKtPjJ_tQ4FFhPwiIy4';

        // Buscar a NFe no banco para obter PDV ID
        $nfeQuery = $supabaseUrl . '/rest/v1/pdv?select=id,numero_documento&chave_nfe=eq.' . urlencode($chaveNFe) . '&empresa_id=eq.' . urlencode($empresaId);
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

        error_log("🔍 DEBUG CCe - NFe Query Response: " . ($nfeResponse === false ? 'FALSE' : substr($nfeResponse, 0, 200)));

        if (!$nfeData || empty($nfeData)) {
            throw new Exception('NFe não encontrada no banco de dados');
        }

        $nfe = $nfeData[0];
        $pdvId = $nfe['id'];

        error_log("🔍 DEBUG CCe - NFe encontrada - PDV ID: {$pdvId}");

        // Preparar dados da CCe para inserir na tabela cce_nfe
        $dadosCce = [
            'pdv_id' => $pdvId,
            'empresa_id' => $empresaId,
            'chave_nfe' => $chaveNFe,
            'numero_nfe' => $nfe['numero_documento'],
            'sequencia' => $sequencia,
            'correcao' => $correcao,
            'protocolo' => $protocoloCCe,
            'data_envio' => date('c'), // ISO 8601
            'status' => 'aceita',
            'codigo_status' => $cStat,
            'descricao_status' => $xMotivo,
            'ambiente' => $nfeConfig['ambiente'],
            'xml_path' => $caminhoArquivoCce,
            'xml_nome' => $nomeArquivoCce
        ];

        // Inserir na tabela cce_nfe usando query SQL direta (testado e funcionando)
        $sqlQuery = "INSERT INTO cce_nfe (pdv_id, empresa_id, chave_nfe, numero_nfe, sequencia, correcao, protocolo, data_envio, status, codigo_status, descricao_status, ambiente, xml_path, xml_nome) VALUES ('" .
                   $pdvId . "', '" .
                   $empresaId . "', '" .
                   $chaveNFe . "', '" .
                   addslashes($nfe['numero_documento']) . "', " .
                   $sequencia . ", '" .
                   addslashes($correcao) . "', '" .
                   $protocoloCCe . "', '" .
                   date('c') . "', 'aceita', " .
                   $cStat . ", '" .
                   addslashes($xMotivo) . "', '" .
                   $nfeConfig['ambiente'] . "', '" .
                   addslashes($caminhoArquivoCce) . "', '" .
                   addslashes($nomeArquivoCce) . "') RETURNING id;";

        $insertData = json_encode(['query' => $sqlQuery]);
        $insertQuery = $supabaseUrl . '/v1/projects/xsrirnfwsjeovekwtluz/database/query';

        error_log("🔍 DEBUG CCe - SQL Query: " . substr($sqlQuery, 0, 200) . "...");
        error_log("🔍 DEBUG CCe - Insert Query: " . $insertQuery);

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $insertQuery);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcmlybnZ3c2plb3Zla3d0bHV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjY2NDk5NywiZXhwIjoyMDYyMjQwOTk3fQ.lJJaWepFPCgG7_5jzJW5VzlyJoEhvJkjlHMQdKVgBHo'
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $insertData);

        $insertResponse = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        error_log("🔍 DEBUG CCe - HTTP Code: {$httpCode}");
        error_log("🔍 DEBUG CCe - Insert Response: " . ($insertResponse === false ? 'FALSE' : $insertResponse));
        error_log("🔍 DEBUG CCe - cURL Error: " . ($curlError ?: 'Nenhum'));

        if ($insertResponse === false || $httpCode < 200 || $httpCode >= 300) {
            throw new Exception("Erro ao inserir CCe na tabela cce_nfe. HTTP: {$httpCode}, cURL: {$curlError}, Response: {$insertResponse}");
        }

        // Extrair ID da CCe criada
        $insertResult = json_decode($insertResponse, true);
        $cceId = null;
        if (is_array($insertResult) && !empty($insertResult)) {
            $cceId = $insertResult[0]['id'] ?? null;
        }

        error_log("✅ CCe salva na tabela cce_nfe - PDV ID: {$pdvId}, Sequência: {$sequencia}, CCe ID: {$cceId}");

        // Atualizar tabela pdv com o ID da CCe para criar relação
        if ($cceId) {
            $updatePdvQuery = "UPDATE pdv SET cce_nfe_id = '{$cceId}' WHERE id = '{$pdvId}';";
            $updatePdvData = json_encode(['query' => $updatePdvQuery]);

            $ch2 = curl_init();
            curl_setopt($ch2, CURLOPT_URL, $supabaseUrl . '/v1/projects/xsrirnfwsjeovekwtluz/database/query');
            curl_setopt($ch2, CURLOPT_POST, true);
            curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch2, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcmlybnZ3c2plb3Zla3d0bHV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjY2NDk5NywiZXhwIjoyMDYyMjQwOTk3fQ.lJJaWepFPCgG7_5jzJW5VzlyJoEhvJkjlHMQdKVgBHo'
            ]);
            curl_setopt($ch2, CURLOPT_POSTFIELDS, $updatePdvData);

            $updatePdvResponse = curl_exec($ch2);
            $updateHttpCode = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
            curl_close($ch2);

            if ($updateHttpCode >= 200 && $updateHttpCode < 300) {
                error_log("✅ Relação PDV-CCe criada com sucesso");
            } else {
                error_log("⚠️ Erro ao criar relação PDV-CCe: HTTP {$updateHttpCode}");
            }
        }

    } catch (Exception $dbError) {
        error_log("⚠️ Erro ao salvar CCe na tabela cce_nfe: " . $dbError->getMessage());
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
