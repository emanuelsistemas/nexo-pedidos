<?php
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    // Validar método
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        throw new Exception('Método não permitido. Use GET.');
    }
    
    // Validar empresa_id (OBRIGATÓRIO para multi-tenant)
    $empresaId = $_GET['empresa_id'] ?? null;
    
    if (!$empresaId) {
        throw new Exception('empresa_id é obrigatório');
    }
    
    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $empresaId)) {
        throw new Exception('empresa_id inválido');
    }
    
    // Configuração do Supabase
    $supabaseUrl = 'https://xsrirnfwsjeovekwtluz.supabase.co';
    $supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcmlybmZ3c2plb3Zla3d0bHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NjQ5OTcsImV4cCI6MjA2MjI0MDk5N30.SrIEj_akvD9x-tltfpV3K4hQSKtPjJ_tQ4FFhPwiIy4';
    
    // Função para fazer requisições ao Supabase
    function supabaseRequest($url, $headers = []) {
        global $supabaseKey;
        
        $defaultHeaders = [
            'apikey: ' . $supabaseKey,
            'Authorization: Bearer ' . $supabaseKey,
            'Content-Type: application/json'
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array_merge($defaultHeaders, $headers));
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            throw new Exception("Erro na requisição Supabase: HTTP {$httpCode}");
        }
        
        return json_decode($response, true);
    }
    
    // Buscar dados da empresa
    $empresaUrl = $supabaseUrl . "/rest/v1/empresas?id=eq.{$empresaId}&select=*";
    $empresaData = supabaseRequest($empresaUrl);
    
    if (empty($empresaData)) {
        throw new Exception('Empresa não encontrada');
    }
    
    $empresa = $empresaData[0];

    // Função para obter código da UF
    function getCodigoUF($uf) {
        $codigosUF = [
            'AC' => 12, 'AL' => 17, 'AP' => 16, 'AM' => 13, 'BA' => 29,
            'CE' => 23, 'DF' => 53, 'ES' => 32, 'GO' => 52, 'MA' => 21,
            'MT' => 51, 'MS' => 50, 'MG' => 31, 'PA' => 15, 'PB' => 25,
            'PR' => 41, 'PE' => 26, 'PI' => 22, 'RJ' => 33, 'RN' => 24,
            'RS' => 43, 'RO' => 11, 'RR' => 14, 'SC' => 42, 'SP' => 35,
            'SE' => 28, 'TO' => 27
        ];
        return $codigosUF[$uf] ?? null;
    }

    // Buscar configuração NFe da empresa
    $nfeConfigUrl = $supabaseUrl . "/rest/v1/nfe_config?empresa_id=eq.{$empresaId}&select=*";
    $nfeConfigData = supabaseRequest($nfeConfigUrl);
    
    if (empty($nfeConfigData)) {
        throw new Exception('Configuração NFe não encontrada para esta empresa');
    }
    
    $nfeConfig = $nfeConfigData[0];
    
    // Validar dados obrigatórios
    $errors = [];
    
    if (empty($empresa['razao_social'])) {
        $errors[] = 'Razão social da empresa não está cadastrada';
    }
    if (empty($empresa['documento'])) {
        $errors[] = 'CNPJ da empresa não está cadastrado';
    }
    if (empty($empresa['estado'])) {
        $errors[] = 'UF da empresa não está cadastrada';
    }
    if (empty($empresa['codigo_municipio'])) {
        $errors[] = 'Código do município da empresa não está cadastrado';
    }
    if (empty($empresa['inscricao_estadual'])) {
        $errors[] = 'Inscrição Estadual da empresa não está cadastrada';
    }
    if (empty($empresa['regime_tributario'])) {
        $errors[] = 'Regime tributário da empresa não está cadastrado';
    }
    
    // Validar endereço
    if (empty($empresa['endereco'])) {
        $errors[] = 'Endereço da empresa não está cadastrado';
    }
    if (empty($empresa['numero'])) {
        $errors[] = 'Número do endereço da empresa não está cadastrado';
    }
    if (empty($empresa['bairro'])) {
        $errors[] = 'Bairro da empresa não está cadastrado';
    }
    if (empty($empresa['cidade'])) {
        $errors[] = 'Cidade da empresa não está cadastrada';
    }
    if (empty($empresa['cep'])) {
        $errors[] = 'CEP da empresa não está cadastrado';
    }
    
    if (!empty($errors)) {
        echo json_encode([
            'success' => false,
            'error' => 'Dados da empresa incompletos',
            'missing_fields' => $errors,
            'message' => 'Complete o cadastro da empresa antes de emitir NFe'
        ]);
        exit;
    }
    
    // Retornar configuração completa
    echo json_encode([
        'success' => true,
        'data' => [
            'empresa' => [
                'id' => $empresa['id'],
                'razao_social' => $empresa['razao_social'],
                'nome_fantasia' => $empresa['nome_fantasia'],
                'cnpj' => $empresa['documento'],
                'inscricao_estadual' => $empresa['inscricao_estadual'],
                'regime_tributario' => $empresa['regime_tributario'],
                'uf' => $empresa['estado'],
                'codigo_municipio' => $empresa['codigo_municipio'],
                'codigo_uf' => getCodigoUF($empresa['estado']), // Calcular código UF
                'csc_homologacao' => $empresa['csc_homologacao'], // CSC para NFC-e
                'csc_id_homologacao' => $empresa['csc_id_homologacao'], // CSC ID para NFC-e
                'csc_producao' => $empresa['csc_producao'], // CSC para NFC-e
                'csc_id_producao' => $empresa['csc_id_producao'], // CSC ID para NFC-e
                'endereco' => [
                    'logradouro' => $empresa['endereco'],
                    'numero' => $empresa['numero'],
                    'complemento' => $empresa['complemento'],
                    'bairro' => $empresa['bairro'],
                    'cidade' => $empresa['cidade'],
                    'cep' => $empresa['cep']
                ]
            ],
            'nfe_config' => [
                'ambiente' => $nfeConfig['ambiente'], // 'homologacao' ou 'producao'
                'ambiente_codigo' => $nfeConfig['ambiente'] === 'producao' ? 1 : 2
            ]
        ],
        'message' => 'Configuração da empresa carregada com sucesso'
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
