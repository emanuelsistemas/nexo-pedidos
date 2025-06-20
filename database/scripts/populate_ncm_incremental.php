<?php
/**
 * Script para popular tabela NCM com dados completos das tabelas SQL
 * Converte dados MySQL para PostgreSQL e popula tabela NCM-CEST
 */

// require_once __DIR__ . '/../../vendor/autoload.php'; // Não necessário para este script

// Configuração do banco
$host = 'aws-0-sa-east-1.pooler.supabase.com';
$port = '6543';
$dbname = 'postgres';
$username = 'postgres.xsrirnfwsjeovekwtluz';
$password = 'nexopdv2024!';

try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "🔗 Conectado ao banco de dados Supabase\n";

    // Limpar tabela NCM existente
    echo "🧹 Limpando tabela NCM existente...\n";
    $pdo->exec("TRUNCATE TABLE ncm RESTART IDENTITY CASCADE");

    // 1. PROCESSAR TABELA NCM
    echo "\n📋 PROCESSANDO TABELA NCM...\n";
    $ncmData = processarTabelaNCM();
    echo "   ✅ Processados " . count($ncmData) . " registros NCM\n";

    // 2. PROCESSAR TABELA CEST
    echo "\n📋 PROCESSANDO TABELA CEST...\n";
    $cestData = processarTabelaCEST();
    echo "   ✅ Processados " . count($cestData) . " registros CEST\n";

    // 3. CRIAR CORRESPONDÊNCIA NCM-CEST
    echo "\n🔗 CRIANDO CORRESPONDÊNCIA NCM-CEST...\n";
    $correspondencias = criarCorrespondencia($ncmData, $cestData);
    echo "   ✅ Criadas " . count($correspondencias) . " correspondências\n";

    // 4. INSERIR DADOS NO BANCO
    echo "\n💾 INSERINDO DADOS NO BANCO...\n";
    $inseridos = inserirDadosNoBanco($pdo, $correspondencias);
    echo "   ✅ Inseridos $inseridos registros\n";

    // 5. ESTATÍSTICAS FINAIS
    mostrarEstatisticas($pdo);

} catch (Exception $e) {
    echo "❌ Erro: " . $e->getMessage() . "\n";
    echo "📍 Linha: " . $e->getLine() . "\n";
    echo "📄 Arquivo: " . $e->getFile() . "\n";
}

/**
 * Processar dados da tabela NCM
 */
function processarTabelaNCM() {
    $arquivo = __DIR__ . '/../../supabase/ncm.sql';

    if (!file_exists($arquivo)) {
        throw new Exception("Arquivo NCM não encontrado: $arquivo");
    }

    $conteudo = file_get_contents($arquivo);
    $ncmData = [];

    // Extrair INSERTs da tabela NCM
    preg_match_all("/INSERT INTO `ncm` VALUES \('(\d+)', '(\d+)', '([^']+)'\);/", $conteudo, $matches, PREG_SET_ORDER);

    foreach ($matches as $match) {
        $id = $match[1];
        $codigo = str_pad($match[2], 8, '0', STR_PAD_LEFT); // Normalizar para 8 dígitos
        $descricao = $match[3];

        $ncmData[$codigo] = [
            'codigo_ncm' => $codigo,
            'descricao_ncm' => $descricao,
            'tem_substituicao_tributaria' => false,
            'categoria_st' => null,
            'unidade_medida' => 'UN'
        ];
    }

    return $ncmData;
}

/**
 * Valida NCM via BrasilAPI
 */
function validarNCMBrasilAPI($ncm) {
    try {
        $url = "https://brasilapi.com.br/api/ncm/v1/$ncm";
        
        $context = stream_context_create([
            'http' => [
                'timeout' => 10,
                'user_agent' => 'Nexo-PDV/1.0'
            ]
        ]);
        
        $response = file_get_contents($url, false, $context);
        
        if ($response === false) {
            return false;
        }
        
        $data = json_decode($response, true);
        
        if (isset($data['descricao']) && !empty($data['descricao'])) {
            return $data['descricao'];
        }
        
        return false;
        
    } catch (Exception $e) {
        return false;
    }
}

/**
 * Função para adicionar CEST manualmente
 */
function adicionarCEST($ncm, $cest, $descricao, $especificacao = null) {
    global $pdo;
    
    try {
        // Verificar se NCM existe
        $checkStmt = $pdo->prepare("SELECT id FROM ncm WHERE codigo_ncm = ? LIMIT 1");
        $checkStmt->execute([$ncm]);
        
        if (!$checkStmt->fetch()) {
            throw new Exception("NCM $ncm não encontrado na tabela");
        }
        
        // Inserir novo registro com CEST
        $insertStmt = $pdo->prepare("
            INSERT INTO ncm (
                codigo_ncm, 
                descricao_ncm,
                codigo_cest,
                descricao_cest,
                especificacao_cest,
                segmento_cest,
                item_cest,
                especificacao_item,
                tem_substituicao_tributaria,
                categoria_st,
                unidade_medida
            ) 
            SELECT 
                codigo_ncm,
                descricao_ncm,
                ?,
                ?,
                ?,
                SUBSTRING(?, 1, 2),
                SUBSTRING(?, 3, 3),
                SUBSTRING(?, 6, 2),
                true,
                'CATEGORIA_A_DEFINIR',
                unidade_medida
            FROM ncm 
            WHERE codigo_ncm = ? 
            LIMIT 1
        ");
        
        $cestLimpo = str_replace('.', '', $cest);
        
        $insertStmt->execute([
            $cestLimpo,
            $descricao,
            $especificacao,
            $cestLimpo,
            $cestLimpo,
            $cestLimpo,
            $ncm
        ]);
        
        echo "✅ CEST $cest adicionado para NCM $ncm\n";
        return true;
        
    } catch (Exception $e) {
        echo "❌ Erro ao adicionar CEST: " . $e->getMessage() . "\n";
        return false;
    }
}

// Exemplos de uso para adicionar CEST manualmente:
/*
echo "\n🏷️  ADICIONANDO CEST MANUALMENTE:\n";
adicionarCEST('22021000', '03.001.00', 'Água mineral em garrafa de vidro até 500ml');
adicionarCEST('22021000', '03.002.00', 'Água mineral em embalagem >= 5.000ml');
adicionarCEST('22030000', '03.012.00', 'Cerveja em garrafa de vidro até 600ml');
*/

/**
 * Processar dados da tabela CEST
 */
function processarTabelaCEST() {
    $arquivo = __DIR__ . '/../../supabase/cest.sql';

    if (!file_exists($arquivo)) {
        throw new Exception("Arquivo CEST não encontrado: $arquivo");
    }

    $conteudo = file_get_contents($arquivo);
    $cestData = [];

    // Extrair INSERTs da tabela CEST
    preg_match_all("/INSERT INTO `tabelacest` VALUES \((\d+), (\d+), (\d+), '([^']+)'\);/", $conteudo, $matches, PREG_SET_ORDER);

    foreach ($matches as $match) {
        $id = $match[1];
        $cest = str_pad($match[2], 7, '0', STR_PAD_LEFT); // Normalizar CEST para 7 dígitos
        $ncm = str_pad($match[3], 8, '0', STR_PAD_LEFT); // Normalizar NCM para 8 dígitos
        $descricao = $match[4];

        // Determinar categoria baseada no segmento CEST
        $segmento = substr($cest, 0, 2);
        $categoria = determinarCategoriaST($segmento);

        $cestData[] = [
            'codigo_ncm' => $ncm,
            'codigo_cest' => $cest,
            'descricao_cest' => $descricao,
            'segmento_cest' => $segmento,
            'item_cest' => substr($cest, 2, 3),
            'especificacao_item' => substr($cest, 5, 2),
            'categoria_st' => $categoria,
            'tem_substituicao_tributaria' => true
        ];
    }

    return $cestData;
}

/**
 * Determinar categoria de ST baseada no segmento CEST
 */
function determinarCategoriaST($segmento) {
    $categorias = [
        '01' => 'AUTOPEÇAS',
        '02' => 'BEBIDAS ALCOÓLICAS',
        '03' => 'CERVEJAS, CHOPES, REFRIGERANTES, ÁGUAS E OUTRAS BEBIDAS',
        '04' => 'CIGARROS E OUTROS PRODUTOS DERIVADOS DO FUMO',
        '05' => 'CIMENTO',
        '06' => 'COMBUSTÍVEIS E LUBRIFICANTES',
        '07' => 'ENERGIA ELÉTRICA',
        '08' => 'FERRAMENTAS',
        '09' => 'LÂMPADAS, REATORES E STARTER',
        '10' => 'MATERIAIS DE CONSTRUÇÃO E CONGÊNERES',
        '11' => 'MATERIAIS DE LIMPEZA',
        '12' => 'MATERIAIS ELÉTRICOS',
        '13' => 'MEDICAMENTOS DE USO HUMANO E OUTROS PRODUTOS FARMACÊUTICOS',
        '14' => 'MEDICAMENTOS DE USO VETERINÁRIO',
        '15' => 'PAPÉIS, PLÁSTICOS, PRODUTOS CERÂMICOS E VIDROS',
        '16' => 'PNEUMÁTICOS, CÂMARAS DE AR E PROTETORES DE BORRACHA',
        '17' => 'PRODUTOS ALIMENTÍCIOS',
        '18' => 'PRODUTOS DE PAPELARIA',
        '19' => 'PRODUTOS ELETRÔNICOS, ELETROELETRÔNICOS E ELETRODOMÉSTICOS',
        '20' => 'PRODUTOS DE PERFUMARIA E DE HIGIENE PESSOAL E COSMÉTICOS',
        '21' => 'PRODUTOS ELETRÔNICOS, ELETROELETRÔNICOS E ELETRODOMÉSTICOS',
        '22' => 'RAÇÕES PARA ANIMAIS DOMÉSTICOS',
        '23' => 'SORVETES E PREPARADOS PARA FABRICAÇÃO DE SORVETES EM MÁQUINAS',
        '24' => 'TINTAS E VERNIZES',
        '25' => 'VEÍCULOS AUTOMOTORES',
        '26' => 'MOTOCICLETAS',
        '27' => 'PRODUTOS DE VIDRO',
        '28' => 'PRODUTOS DE PERFUMARIA, DE HIGIENE PESSOAL E COSMÉTICOS'
    ];

    return $categorias[$segmento] ?? 'OUTROS PRODUTOS';
}

/**
 * Criar correspondência unificada NCM-CEST
 */
function criarCorrespondencia($ncmData, $cestData) {
    $correspondencias = [];

    // Primeiro, adicionar todos os NCM sem CEST
    foreach ($ncmData as $codigo => $ncm) {
        $correspondencias[$codigo] = $ncm;
    }

    // Depois, adicionar/atualizar com dados CEST
    foreach ($cestData as $cest) {
        $ncmCodigo = $cest['codigo_ncm'];

        // Se NCM não existe na base, criar entrada básica
        if (!isset($correspondencias[$ncmCodigo])) {
            $correspondencias[$ncmCodigo] = [
                'codigo_ncm' => $ncmCodigo,
                'descricao_ncm' => 'Descrição não disponível - NCM encontrado apenas na tabela CEST',
                'tem_substituicao_tributaria' => true,
                'categoria_st' => $cest['categoria_st'],
                'unidade_medida' => 'UN'
            ];
        }

        // Criar entrada separada para cada CEST (um NCM pode ter múltiplos CEST)
        $chave = $ncmCodigo . '_' . $cest['codigo_cest'];
        $correspondencias[$chave] = array_merge($correspondencias[$ncmCodigo], $cest);
    }

    return $correspondencias;
}

/**
 * Inserir dados no banco PostgreSQL
 */
function inserirDadosNoBanco($pdo, $correspondencias) {
    $inseridos = 0;
    $erros = 0;

    $insertStmt = $pdo->prepare("
        INSERT INTO ncm (
            codigo_ncm, descricao_ncm, codigo_cest, descricao_cest, especificacao_cest,
            segmento_cest, item_cest, especificacao_item, tem_substituicao_tributaria,
            categoria_st, unidade_medida, observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    foreach ($correspondencias as $chave => $dados) {
        try {
            $insertStmt->execute([
                $dados['codigo_ncm'],
                $dados['descricao_ncm'],
                $dados['codigo_cest'] ?? null,
                $dados['descricao_cest'] ?? null,
                $dados['especificacao_cest'] ?? null,
                $dados['segmento_cest'] ?? null,
                $dados['item_cest'] ?? null,
                $dados['especificacao_item'] ?? null,
                $dados['tem_substituicao_tributaria'],
                $dados['categoria_st'] ?? null,
                $dados['unidade_medida'],
                'Importado automaticamente das tabelas NCM e CEST'
            ]);

            $inseridos++;

            if ($inseridos % 100 == 0) {
                echo "   📦 Inseridos $inseridos registros...\n";
            }

        } catch (Exception $e) {
            $erros++;
            echo "   ❌ Erro ao inserir NCM {$dados['codigo_ncm']}: " . $e->getMessage() . "\n";
        }
    }

    if ($erros > 0) {
        echo "   ⚠️  Total de erros: $erros\n";
    }

    return $inseridos;
}

/**
 * Mostrar estatísticas finais
 */
function mostrarEstatisticas($pdo) {
    echo "\n📊 ESTATÍSTICAS FINAIS:\n";

    // Estatísticas gerais
    $statsStmt = $pdo->query("
        SELECT
            COUNT(*) as total_registros,
            COUNT(DISTINCT codigo_ncm) as ncm_unicos,
            COUNT(CASE WHEN codigo_cest IS NOT NULL THEN 1 END) as com_cest,
            COUNT(CASE WHEN tem_substituicao_tributaria = true THEN 1 END) as com_st
        FROM ncm
    ");

    $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);

    echo "   📦 Total de registros: {$stats['total_registros']}\n";
    echo "   🔢 NCM únicos: {$stats['ncm_unicos']}\n";
    echo "   🏷️  Com CEST: {$stats['com_cest']}\n";
    echo "   🔄 Com ST: {$stats['com_st']}\n";

    // Top 5 categorias
    echo "\n🏆 TOP 5 CATEGORIAS DE ST:\n";
    $topCategorias = $pdo->query("
        SELECT categoria_st, COUNT(*) as total
        FROM ncm
        WHERE categoria_st IS NOT NULL
        GROUP BY categoria_st
        ORDER BY total DESC
        LIMIT 5
    ");

    foreach ($topCategorias as $categoria) {
        echo "   • {$categoria['categoria_st']}: {$categoria['total']} produtos\n";
    }

    // Exemplos de correspondências
    echo "\n💡 EXEMPLOS DE CORRESPONDÊNCIAS CRIADAS:\n";
    $exemplos = $pdo->query("
        SELECT codigo_ncm, descricao_ncm, codigo_cest, descricao_cest, categoria_st
        FROM ncm
        WHERE codigo_cest IS NOT NULL
        ORDER BY codigo_ncm
        LIMIT 3
    ");

    foreach ($exemplos as $exemplo) {
        echo "   📋 NCM {$exemplo['codigo_ncm']}: {$exemplo['descricao_ncm']}\n";
        echo "      🏷️  CEST {$exemplo['codigo_cest']}: {$exemplo['descricao_cest']}\n";
        echo "      📂 Categoria: {$exemplo['categoria_st']}\n\n";
    }
}

echo "\n✅ Script concluído!\n";
echo "💡 Para adicionar CEST manualmente, use a função adicionarCEST()\n";
echo "📖 Exemplo: adicionarCEST('22021000', '03.001.00', 'Descrição do CEST')\n";
?>
