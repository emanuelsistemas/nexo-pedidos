<?php
/**
 * Script para executar migração: Adicionar campo vendas_itens_multiplicacao à tabela pdv_config
 * Data: 2024-12-18
 */

// Configuração do Supabase
$supabaseUrl = 'https://xsrirnfwsjeovekwtluz.supabase.co';
$supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcmlybmZ3c2plb3Zla3d0bHV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjY2NDk5NywiZXhwIjoyMDYyMjQwOTk3fQ.UC2DvFRcfrNUbRrnQhrpqsX_hJXBLy9g-YVZbpaTcso'; // Service role key

try {
    echo "🚀 INICIANDO MIGRAÇÃO: Adicionar campo vendas_itens_multiplicacao\n";

    // Tentar executar SQL usando RPC function
    echo "🔧 Tentando executar ALTER TABLE via RPC...\n";

    $sql = "ALTER TABLE pdv_config ADD COLUMN IF NOT EXISTS vendas_itens_multiplicacao BOOLEAN DEFAULT false";

    $rpcUrl = $supabaseUrl . '/rest/v1/rpc/exec_sql';
    $rpcData = json_encode(['sql' => $sql]);

    $headers = [
        'Authorization: Bearer ' . $supabaseKey,
        'apikey: ' . $supabaseKey,
        'Content-Type: application/json'
    ];

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
        echo "✅ Coluna adicionada com sucesso via RPC!\n";

        // Verificar se a coluna foi criada
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
                echo "✅ Coluna 'vendas_itens_multiplicacao' confirmada na tabela!\n";
                echo "🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!\n";
            } else {
                echo "⚠️ Coluna pode ter sido criada, mas não foi possível confirmar.\n";
            }
        }

    } else {
        echo "❌ Erro ao executar RPC: HTTP $httpCode\n";
        echo "Resposta: $response\n";

        // Método alternativo: Tentar usar SQL direto
        echo "🔄 Tentando método alternativo...\n";

        // Criar função SQL temporária
        $createFunctionSql = "
        CREATE OR REPLACE FUNCTION add_vendas_itens_multiplicacao_column()
        RETURNS void AS \$\$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'pdv_config'
                AND column_name = 'vendas_itens_multiplicacao'
            ) THEN
                ALTER TABLE pdv_config ADD COLUMN vendas_itens_multiplicacao BOOLEAN DEFAULT false;
            END IF;
        END;
        \$\$ LANGUAGE plpgsql;
        ";

        echo "📝 SQL para executar manualmente no Supabase Dashboard:\n\n";
        echo $createFunctionSql . "\n\n";
        echo "SELECT add_vendas_itens_multiplicacao_column();\n\n";
        echo "DROP FUNCTION add_vendas_itens_multiplicacao_column();\n\n";

        echo "📋 Instruções:\n";
        echo "1. Acesse: https://supabase.com/dashboard/project/xsrirnfwsjeovekwtluz/sql/new\n";
        echo "2. Cole e execute o SQL acima\n";
        echo "3. Teste a aplicação novamente\n\n";
    }

} catch (Exception $e) {
    echo "❌ ERRO na migração: " . $e->getMessage() . "\n";
}

/**
 * Função para executar SQL no Supabase
 */
function executarSQL($supabaseUrl, $supabaseKey, $sql) {
    // Usar a API REST do Supabase para executar SQL
    $url = $supabaseUrl . '/rest/v1/rpc/exec_sql';
    
    $headers = [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $supabaseKey,
        'apikey: ' . $supabaseKey
    ];
    
    $data = json_encode(['sql' => $sql]);
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $data,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    
    curl_close($ch);
    
    if ($error) {
        throw new Exception('Erro cURL: ' . $error);
    }
    
    if ($httpCode >= 400) {
        // Tentar método alternativo usando query direta
        return executarSQLAlternativo($supabaseUrl, $supabaseKey, $sql);
    }
    
    return json_decode($response, true);
}

/**
 * Método alternativo para executar SQL
 */
function executarSQLAlternativo($supabaseUrl, $supabaseKey, $sql) {
    // Para consultas SELECT, usar a API REST diretamente
    if (stripos($sql, 'SELECT') === 0 || stripos(trim($sql), 'SELECT') === 0) {
        // Extrair nome da tabela para consultas simples
        if (preg_match('/FROM\s+(\w+)/i', $sql, $matches)) {
            $table = $matches[1];
            
            if ($table === 'information_schema.columns') {
                // Para consultas de schema, usar endpoint específico
                $url = $supabaseUrl . '/rest/v1/' . $table;
                
                // Adicionar filtros se necessário
                if (strpos($sql, "table_name = 'pdv_config'") !== false) {
                    $url .= '?table_name=eq.pdv_config';
                }
                if (strpos($sql, "column_name = 'vendas_itens_multiplicacao'") !== false) {
                    $url .= (strpos($url, '?') ? '&' : '?') . 'column_name=eq.vendas_itens_multiplicacao';
                }
                
                $headers = [
                    'Authorization: Bearer ' . $supabaseKey,
                    'apikey: ' . $supabaseKey
                ];
                
                $ch = curl_init();
                curl_setopt_array($ch, [
                    CURLOPT_URL => $url,
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_HTTPHEADER => $headers,
                    CURLOPT_TIMEOUT => 30
                ]);
                
                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                
                if ($httpCode === 200) {
                    return json_decode($response, true);
                }
            }
        }
    }
    
    // Para comandos DDL (ALTER TABLE), simular sucesso
    if (stripos($sql, 'ALTER TABLE') === 0 || stripos($sql, 'COMMENT ON') === 0) {
        echo "⚠️ Comando DDL detectado. Execute manualmente no Supabase Dashboard:\n";
        echo $sql . "\n";
        return ['status' => 'manual_execution_required'];
    }
    
    throw new Exception('Não foi possível executar SQL: ' . $sql);
}
?>
