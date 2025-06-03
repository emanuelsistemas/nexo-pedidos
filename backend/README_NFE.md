# Integração NFe - Biblioteca sped-nfe

Este projeto utiliza a biblioteca **sped-nfe** para emissão de Notas Fiscais Eletrônicas (NFe) no Brasil.

## 📦 Biblioteca Instalada

- **sped-nfe v5.1.27** - Biblioteca oficial para NFe
- **PHP 7.4** com extensões necessárias
- **Composer** para gerenciamento de dependências

## 🚀 Instalação Concluída

A biblioteca foi instalada com sucesso no diretório `backend/` com a seguinte estrutura:

```
backend/
├── composer.json          # Configuração do Composer
├── composer.lock          # Lock das dependências
├── vendor/                # Dependências instaladas
│   └── nfephp-org/
│       ├── sped-nfe/      # Biblioteca principal
│       ├── sped-common/   # Biblioteca comum
│       └── sped-gtin/     # Biblioteca GTIN
├── src/
│   ├── Services/
│   │   └── NFeService.php # Classe de serviço NFe
│   └── Config/
│       └── nfe_config.example.php # Configuração exemplo
└── storage/
    ├── certificados/      # Certificados digitais
    ├── xml/              # XMLs gerados
    └── pdf/              # PDFs gerados
```

## ⚙️ Configuração

### 1. Certificado Digital

1. Coloque seu certificado digital (.pfx) em `storage/certificados/`
2. Configure o caminho e senha no arquivo de configuração

### 2. Configuração da Empresa

1. Copie `src/Config/nfe_config.example.php` para `src/Config/nfe_config.php`
2. Configure os dados da sua empresa:

```php
return [
    'ambiente' => 2, // 1=Produção, 2=Homologação
    'razao_social' => 'SUA EMPRESA LTDA',
    'cnpj' => '00000000000000',
    'uf' => 'SP',
    'cert_path' => __DIR__ . '/../../storage/certificados/certificado.pfx',
    'cert_password' => 'senha_do_certificado',
    // ... outras configurações
];
```

## 🔧 Uso Básico

### Exemplo de Emissão de NFe

```php
<?php
require_once 'vendor/autoload.php';

use Nexo\Services\NFeService;

// Carrega configuração
$config = require_once 'src/Config/nfe_config.php';

// Cria serviço
$nfeService = new NFeService($config);

// Dados da NFe
$dadosNfe = [
    'destinatario' => [
        'cnpj' => '22333444000195',
        'razao_social' => 'CLIENTE TESTE LTDA',
        // ... outros dados
    ],
    'produtos' => [
        [
            'codigo' => 'PROD001',
            'descricao' => 'Produto Teste',
            'valor_unitario' => 100.00,
            // ... outros dados
        ]
    ]
];

// Cria NFe
$resultado = $nfeService->createNFe($dadosNfe);

if ($resultado['success']) {
    echo "NFe criada com sucesso!";
    echo "Chave: " . $resultado['chave'];
} else {
    echo "Erro: " . $resultado['error'];
}
```

## 📋 Próximos Passos

### 1. Implementação Completa

- [ ] Configurar certificado digital
- [ ] Implementar métodos de construção da NFe
- [ ] Adicionar validações de dados
- [ ] Implementar tratamento de erros
- [ ] Criar testes unitários

### 2. Funcionalidades a Implementar

- [ ] Emissão de NFe
- [ ] Cancelamento de NFe
- [ ] Carta de Correção
- [ ] Consulta de status
- [ ] Geração de PDF (DANFE)
- [ ] Envio por email

### 3. Estrutura Recomendada

```php
// Adicionar métodos na classe NFeService:
- buildIdentificacao()
- buildEmitente()
- buildDestinatario()
- buildProdutos()
- buildImpostos()
- buildTotais()
- buildTransporte()
- buildPagamento()
```

## 📚 Documentação

- **Biblioteca sped-nfe**: https://github.com/nfephp-org/sped-nfe
- **Documentação Make**: https://github.com/nfephp-org/sped-nfe/blob/master/docs/Make.md
- **Manual da NFe**: Portal da Receita Federal

## 🧪 Testes

Execute os testes básicos:

```bash
# Teste da instalação
php test_nfe.php

# Exemplo de uso
php exemplo_uso_nfe.php
```

## ⚠️ Importante

1. **Ambiente de Homologação**: Sempre teste primeiro em homologação
2. **Certificado Digital**: Necessário certificado A1 válido
3. **Backup**: Mantenha backup dos XMLs gerados
4. **Logs**: Implemente sistema de logs para auditoria
5. **Segurança**: Nunca exponha certificados ou senhas

## 🆘 Suporte

- Issues da biblioteca: https://github.com/nfephp-org/sped-nfe/issues
- Comunidade NFePHP: https://github.com/nfephp-org
- Documentação oficial da SEFAZ

---

✅ **Instalação concluída com sucesso!**

A biblioteca sped-nfe está pronta para uso. Configure os dados da sua empresa e certificado digital para começar a emitir NFe.
