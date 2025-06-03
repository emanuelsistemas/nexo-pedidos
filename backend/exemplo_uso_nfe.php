<?php

require_once 'vendor/autoload.php';

use Nexo\Services\NFeService;

try {
    echo "=== Exemplo de uso da biblioteca sped-nfe ===\n\n";
    
    // Carrega a configuração
    $config = require_once 'src/Config/nfe_config.example.php';
    
    // Cria o serviço NFe
    echo "1. Inicializando serviço NFe...\n";
    
    // Para este exemplo, vamos usar configuração mínima sem certificado
    $configMinima = [
        'ambiente' => 2, // Homologação
        'razao_social' => 'EMPRESA TESTE LTDA',
        'cnpj' => '11222333000181',
        'uf' => 'SP'
    ];
    
    // Nota: Para usar completamente, você precisa configurar o certificado
    echo "⚠️  Para usar completamente, configure:\n";
    echo "   - Certificado digital (.pfx) em storage/certificados/\n";
    echo "   - Dados da empresa no arquivo de configuração\n";
    echo "   - CSC para NFCe (se aplicável)\n\n";
    
    // Exemplo de dados de uma NFe
    $dadosNfe = [
        'destinatario' => [
            'cnpj' => '22333444000195',
            'razao_social' => 'CLIENTE TESTE LTDA',
            'endereco' => [
                'logradouro' => 'Rua Teste, 123',
                'bairro' => 'Centro',
                'cidade' => 'São Paulo',
                'uf' => 'SP',
                'cep' => '01000000'
            ]
        ],
        'produtos' => [
            [
                'codigo' => 'PROD001',
                'descricao' => 'Produto Teste',
                'ncm' => '12345678',
                'cfop' => '5102',
                'unidade' => 'UN',
                'quantidade' => 1,
                'valor_unitario' => 100.00,
                'valor_total' => 100.00
            ]
        ],
        'totais' => [
            'valor_produtos' => 100.00,
            'valor_total' => 100.00
        ]
    ];
    
    echo "2. Dados de exemplo da NFe preparados\n";
    echo "   - Destinatário: " . $dadosNfe['destinatario']['razao_social'] . "\n";
    echo "   - Produtos: " . count($dadosNfe['produtos']) . " item(s)\n";
    echo "   - Valor total: R$ " . number_format($dadosNfe['totais']['valor_total'], 2, ',', '.') . "\n\n";
    
    echo "3. Próximos passos para implementação completa:\n";
    echo "   a) Configure o certificado digital\n";
    echo "   b) Implemente os métodos de construção da NFe\n";
    echo "   c) Configure os dados da empresa\n";
    echo "   d) Teste em ambiente de homologação\n";
    echo "   e) Implemente validações e tratamento de erros\n\n";
    
    echo "✅ Estrutura básica criada com sucesso!\n";
    echo "📁 Arquivos criados:\n";
    echo "   - src/Services/NFeService.php (Classe principal)\n";
    echo "   - src/Config/nfe_config.example.php (Configuração)\n";
    echo "   - storage/ (Diretórios para certificados, XML e PDF)\n\n";
    
    echo "📖 Documentação da biblioteca:\n";
    echo "   - GitHub: https://github.com/nfephp-org/sped-nfe\n";
    echo "   - Documentação: https://github.com/nfephp-org/sped-nfe/blob/master/docs/Make.md\n";
    
} catch (Exception $e) {
    echo "❌ Erro: " . $e->getMessage() . "\n";
}
