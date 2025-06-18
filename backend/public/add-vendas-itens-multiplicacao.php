<?php
/**
 * Script para adicionar campo vendas_itens_multiplicacao à tabela pdv_config
 * Data: 2025-06-18
 */

// Configuração do Supabase
$supabaseUrl = 'https://xsrirnfwsjeovekwtluz.supabase.co';
$supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcmlybmZ3c2plb3Zla3d0bHV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjY2NDk5NywiZXhwIjoyMDYyMjQwOTk3fQ.UC2DvFRcfrNUbRrnQhrpqsX_hJXBLy9g-YVZbpaTcso';

try {
    echo "🚀 INICIANDO: Adicionar campo vendas_itens_multiplicacao\n";

    // 1. Primeiro verificar se a coluna já existe
    echo "🔍 Verificando se a coluna já existe...\n";
    
    $checkUrl = $supabaseUrl . '/rest/v1/pdv_config?limit=1';
    $headers = [
        'Authorization: Bearer ' . $supabaseKey,
        'apikey: ' . $supabaseKey,
        'Content-Type: application/json'
    ];

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $checkUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 30
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200) {
        $data = json_decode($response, true);
        if (!empty($data) && isset($data[0]['vendas_itens_multiplicacao'])) {
            echo "✅ Campo 'vendas_itens_multiplicacao' já existe na tabela!\n";
            echo "🎉 MIGRAÇÃO JÁ CONCLUÍDA!\n";
            exit(0);
        }
    }

    // 2. Se não existe, tentar adicionar via SQL direto
    echo "➕ Campo não existe. Adicionando...\n";

    // Usar a função SQL para adicionar a coluna
    $sql = "
    DO \$\$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'pdv_config'
            AND column_name = 'vendas_itens_multiplicacao'
        ) THEN
            ALTER TABLE pdv_config ADD COLUMN vendas_itens_multiplicacao BOOLEAN DEFAULT false;
            RAISE NOTICE 'Coluna vendas_itens_multiplicacao adicionada com sucesso!';
        ELSE
            RAISE NOTICE 'Coluna vendas_itens_multiplicacao já existe.';
        END IF;
    END \$\$;
    ";

    // Tentar executar via RPC
    $rpcUrl = $supabaseUrl . '/rest/v1/rpc/exec_sql';
    $rpcData = json_encode(['sql' => $sql]);

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $rpcUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $rpcData,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 30
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200) {
        echo "✅ SQL executado com sucesso!\n";
        
        // Verificar se funcionou
        echo "🔍 Verificando se a coluna foi criada...\n";
        
        $checkUrl = $supabaseUrl . '/rest/v1/pdv_config?limit=1';
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $checkUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 30
        ]);

        $checkResponse = curl_exec($ch);
        $checkHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($checkHttpCode === 200) {
            $data = json_decode($checkResponse, true);
            if (!empty($data) && isset($data[0]['vendas_itens_multiplicacao'])) {
                echo "✅ Campo 'vendas_itens_multiplicacao' confirmado na tabela!\n";
                echo "🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!\n";
            } else {
                echo "⚠️ Campo pode ter sido criado, mas não foi possível confirmar.\n";
                echo "📝 Execute manualmente no Supabase Dashboard:\n";
                echo "ALTER TABLE pdv_config ADD COLUMN IF NOT EXISTS vendas_itens_multiplicacao BOOLEAN DEFAULT false;\n";
            }
        }
    } else {
        echo "❌ Erro ao executar SQL: HTTP $httpCode\n";
        echo "Resposta: $response\n";
        echo "📝 Execute manualmente no Supabase Dashboard:\n";
        echo "ALTER TABLE pdv_config ADD COLUMN IF NOT EXISTS vendas_itens_multiplicacao BOOLEAN DEFAULT false;\n";
    }

} catch (Exception $e) {
    echo "❌ ERRO: " . $e->getMessage() . "\n";
    echo "📝 Execute manualmente no Supabase Dashboard:\n";
    echo "ALTER TABLE pdv_config ADD COLUMN IF NOT EXISTS vendas_itens_multiplicacao BOOLEAN DEFAULT false;\n";
}
?>
