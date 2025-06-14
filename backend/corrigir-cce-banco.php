<?php
/**
 * Script para corrigir CCe que foram processadas mas não salvas no banco
 * Analisa XMLs de CCe existentes e popula o campo cartas_correcao na tabela pdv
 */

require_once __DIR__ . '/vendor/autoload.php';

// Configurações do Supabase
$supabaseUrl = 'https://xsrirnfwsjeovekwtluz.supabase.co';
$supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcmlybnZ3c2plb3Zla3d0bHV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzQzMzI2NCwiZXhwIjoyMDQ5MDA5MjY0fQ.VWHOLt7jgmJlvJoUeO_rKdJhBqjdcKhHt_6cNJhOaQs';

function extrairDadosCCe($xmlContent) {
    $dom = new DOMDocument();
    $dom->loadXML($xmlContent);
    
    $xpath = new DOMXPath($dom);
    $xpath->registerNamespace('nfe', 'http://www.portalfiscal.inf.br/nfe');
    
    // Extrair dados do evento
    $chave = $xpath->query('//chNFe')->item(0)?->textContent;
    $sequencia = $xpath->query('//nSeqEvento')->item(0)?->textContent;
    $protocolo = $xpath->query('//nProt')->item(0)?->textContent;
    $dataRegistro = $xpath->query('//dhRegEvento')->item(0)?->textContent;
    $cStat = $xpath->query('//cStat')->item(1)?->textContent; // Segundo cStat (do evento)
    $xMotivo = $xpath->query('//xMotivo')->item(1)?->textContent; // Segundo xMotivo (do evento)
    $tpAmb = $xpath->query('//tpAmb')->item(0)?->textContent;
    
    return [
        'chave' => $chave,
        'sequencia' => (int)$sequencia,
        'protocolo' => $protocolo,
        'data_envio' => $dataRegistro,
        'status' => $cStat == '135' ? 'aceita' : 'rejeitada',
        'codigo_status' => $cStat,
        'descricao_status' => $xMotivo,
        'ambiente' => $tpAmb == '1' ? 'producao' : 'homologacao'
    ];
}

function buscarNFePorChave($chave) {
    global $supabaseUrl, $supabaseKey;
    
    $query = $supabaseUrl . '/rest/v1/pdv?chave_nfe=eq.' . urlencode($chave) . '&select=id,cartas_correcao';
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                'apikey: ' . $supabaseKey,
                'Authorization: Bearer ' . $supabaseKey,
                'Content-Type: application/json'
            ]
        ]
    ]);
    
    $response = file_get_contents($query, false, $context);
    $data = json_decode($response, true);
    
    return $data && !empty($data) ? $data[0] : null;
}

function atualizarCCeNoBanco($pdvId, $ccesExistentes) {
    global $supabaseUrl, $supabaseKey;
    
    $updateData = json_encode(['cartas_correcao' => $ccesExistentes]);
    $updateQuery = $supabaseUrl . '/rest/v1/pdv?id=eq.' . $pdvId;
    
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
    return $updateResponse !== false;
}

// Processar XMLs de CCe
$storageDir = __DIR__ . '/storage/xml';
$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($storageDir, RecursiveDirectoryIterator::SKIP_DOTS)
);

$ccesProcessadas = [];

foreach ($iterator as $file) {
    if ($file->isFile() && strpos($file->getFilename(), '_cce_') !== false && $file->getExtension() === 'xml') {
        echo "📄 Processando: " . $file->getPathname() . "\n";
        
        try {
            $xmlContent = file_get_contents($file->getPathname());
            $dadosCCe = extrairDadosCCe($xmlContent);
            
            if (!$dadosCCe['chave']) {
                echo "❌ Chave não encontrada no XML\n";
                continue;
            }
            
            echo "✅ CCe extraída - Chave: {$dadosCCe['chave']}, Sequência: {$dadosCCe['sequencia']}\n";
            
            // Agrupar por chave
            if (!isset($ccesProcessadas[$dadosCCe['chave']])) {
                $ccesProcessadas[$dadosCCe['chave']] = [];
            }
            
            $ccesProcessadas[$dadosCCe['chave']][] = [
                'sequencia' => $dadosCCe['sequencia'],
                'data_envio' => $dadosCCe['data_envio'],
                'protocolo' => $dadosCCe['protocolo'],
                'correcao' => 'Correção importada do XML (texto original não disponível)',
                'status' => $dadosCCe['status'],
                'codigo_status' => $dadosCCe['codigo_status'],
                'descricao_status' => $dadosCCe['descricao_status'],
                'ambiente' => $dadosCCe['ambiente'],
                'xml_path' => $file->getPathname(),
                'xml_nome' => $file->getFilename()
            ];
            
        } catch (Exception $e) {
            echo "❌ Erro ao processar XML: " . $e->getMessage() . "\n";
        }
    }
}

// Atualizar banco de dados
echo "\n🔄 Atualizando banco de dados...\n";

foreach ($ccesProcessadas as $chave => $cces) {
    echo "\n📝 Processando NFe: {$chave}\n";
    
    $nfe = buscarNFePorChave($chave);
    if (!$nfe) {
        echo "❌ NFe não encontrada no banco\n";
        continue;
    }
    
    // Obter CCe existentes no banco
    $ccesExistentes = $nfe['cartas_correcao'] ? $nfe['cartas_correcao'] : [];
    
    // Verificar quais CCe já existem
    $sequenciasExistentes = array_column($ccesExistentes, 'sequencia');
    
    $ccesAdicionadas = 0;
    foreach ($cces as $cce) {
        if (!in_array($cce['sequencia'], $sequenciasExistentes)) {
            $ccesExistentes[] = $cce;
            $ccesAdicionadas++;
            echo "✅ CCe sequência {$cce['sequencia']} adicionada\n";
        } else {
            echo "⚠️ CCe sequência {$cce['sequencia']} já existe no banco\n";
        }
    }
    
    if ($ccesAdicionadas > 0) {
        // Ordenar por sequência
        usort($ccesExistentes, function($a, $b) {
            return $a['sequencia'] - $b['sequencia'];
        });
        
        if (atualizarCCeNoBanco($nfe['id'], $ccesExistentes)) {
            echo "✅ {$ccesAdicionadas} CCe(s) salva(s) no banco para NFe {$chave}\n";
        } else {
            echo "❌ Erro ao salvar CCe no banco para NFe {$chave}\n";
        }
    } else {
        echo "ℹ️ Nenhuma CCe nova para adicionar\n";
    }
}

echo "\n🎉 Processamento concluído!\n";
?>
