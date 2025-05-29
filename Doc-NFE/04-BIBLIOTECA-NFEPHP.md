# 📚 Documentação da Biblioteca NFePHP

## 📋 Objetivo
Documentar o uso da biblioteca NFePHP para geração de NFe, incluindo instalação, configuração e exemplos práticos.

---

## 📊 Status da Biblioteca
- [ ] **Biblioteca Instalada**
- [ ] **Configuração Básica** 
- [ ] **Certificado Configurado**
- [ ] **Testes de Conexão**
- [ ] **Exemplos Funcionando**

---

## 🔧 Instalação

### 1. Via Composer
```bash
composer require nfephp-org/sped-nfe
```

### 2. Dependências Necessárias
```bash
# Verificar extensões PHP
php -m | grep -E "(curl|dom|json|gd|mbstring|openssl|soap|xml|zip)"
```

### 3. Estrutura de Pastas
```
app/
├── Services/
│   ├── NFe/
│   │   ├── NFeService.php
│   │   ├── NFeConfigService.php
│   │   ├── NFeValidationService.php
│   │   └── NFeXmlService.php
├── Models/
│   ├── NfeDocument.php
│   ├── NfeItem.php
│   └── NfeTax.php
storage/
├── app/
│   ├── nfe/
│   │   ├── certificados/
│   │   ├── xml/
│   │   └── logs/
```

---

## ⚙️ Configuração

### 1. Variáveis de Ambiente (.env)
```env
# NFe Configuration
NFE_AMBIENTE=2                    # 1=Produção, 2=Homologação
NFE_UF_EMISSAO=SP                # Estado do emitente
NFE_SERIE_NFE=1                  # Série padrão
NFE_PROXIMO_NUMERO=1             # Próximo número

# Certificado Digital
NFE_CERTIFICADO_PATH=storage/app/nfe/certificados/certificado.pfx
NFE_CERTIFICADO_PASSWORD=senha123

# SEFAZ
NFE_TIMEOUT=60                   # Timeout em segundos
NFE_CONTINGENCIA=false           # Modo contingência

# Logs
NFE_LOG_LEVEL=debug             # debug, info, warning, error
NFE_LOG_PATH=storage/logs/nfe.log
```

### 2. Arquivo de Configuração (config/nfe.php)
```php
<?php

return [
    'ambiente' => env('NFE_AMBIENTE', 2),
    'uf_emissao' => env('NFE_UF_EMISSAO', 'SP'),
    'serie_nfe' => env('NFE_SERIE_NFE', 1),
    'proximo_numero' => env('NFE_PROXIMO_NUMERO', 1),
    
    'certificado' => [
        'path' => env('NFE_CERTIFICADO_PATH'),
        'password' => env('NFE_CERTIFICADO_PASSWORD'),
    ],
    
    'sefaz' => [
        'timeout' => env('NFE_TIMEOUT', 60),
        'contingencia' => env('NFE_CONTINGENCIA', false),
    ],
    
    'logs' => [
        'level' => env('NFE_LOG_LEVEL', 'debug'),
        'path' => env('NFE_LOG_PATH', 'storage/logs/nfe.log'),
    ],
    
    'csc' => [
        'codigo' => env('NFE_CSC_CODIGO'),
        'id_token' => env('NFE_CSC_ID_TOKEN'),
    ],
];
```

---

## 🏗️ Estrutura Básica de Uso

### 1. Classe Principal NFeService
```php
<?php

namespace App\Services\NFe;

use NFePHP\NFe\Make;
use NFePHP\NFe\Tools;
use NFePHP\Common\Certificate;
use Exception;

class NFeService
{
    private $make;
    private $tools;
    private $config;
    
    public function __construct()
    {
        $this->config = config('nfe');
        $this->make = new Make();
        $this->initializeTools();
    }
    
    private function initializeTools()
    {
        $configJson = json_encode([
            'atualizacao' => date('Y-m-d H:i:s'),
            'tpAmb' => $this->config['ambiente'],
            'razaosocial' => 'Sua Empresa',
            'cnpj' => '12345678000195',
            'siglaUF' => $this->config['uf_emissao'],
            'schemes' => 'PL_009_V4',
            'versao' => '4.00'
        ]);
        
        $certificate = Certificate::readPfx(
            file_get_contents($this->config['certificado']['path']),
            $this->config['certificado']['password']
        );
        
        $this->tools = new Tools($configJson, $certificate);
    }
    
    public function gerarNFe($dadosVenda, $dadosCliente, $itensPedido)
    {
        try {
            // Implementação da geração
            return $this->processarNFe($dadosVenda, $dadosCliente, $itensPedido);
        } catch (Exception $e) {
            throw new Exception("Erro ao gerar NFe: " . $e->getMessage());
        }
    }
}
```

### 2. Exemplo de Geração Completa
```php
public function processarNFe($dadosVenda, $dadosCliente, $itensPedido)
{
    // 1. Configurar NFe
    $std = new \stdClass();
    $std->versao = '4.00';
    $this->make->taginfNFe($std);
    
    // 2. Identificação
    $std = new \stdClass();
    $std->cUF = 35; // SP
    $std->cNF = str_pad(rand(1, 99999999), 8, '0', STR_PAD_LEFT);
    $std->natOp = $dadosVenda['natureza_operacao'];
    $std->mod = 55;
    $std->serie = $dadosVenda['serie'];
    $std->nNF = $dadosVenda['numero_nfe'];
    $std->dhEmi = date('Y-m-d\TH:i:sP');
    $std->tpNF = 1; // Saída
    $std->idDest = 1; // Operação interna
    $std->cMunFG = 3550308; // São Paulo
    $std->tpImp = 1; // DANFE normal
    $std->tpEmis = 1; // Emissão normal
    $std->cDV = 0; // Calculado automaticamente
    $std->tpAmb = $this->config['ambiente'];
    $std->finNFe = 1; // NFe normal
    $std->indFinal = 1; // Consumidor final
    $std->indPres = 1; // Presencial
    $std->procEmi = 0; // Emissão própria
    $std->verProc = '1.0';
    $this->make->tagide($std);
    
    // 3. Emitente
    $empresa = auth()->user()->company;
    $std = new \stdClass();
    $std->CNPJ = $empresa->cnpj;
    $std->xNome = $empresa->name;
    $std->xFant = $empresa->nome_fantasia;
    $std->IE = $empresa->inscricao_estadual;
    $std->CRT = $empresa->regime_tributario;
    $this->make->tagemit($std);
    
    // 4. Endereço do Emitente
    $std = new \stdClass();
    $std->xLgr = $empresa->address;
    $std->nro = $empresa->numero_endereco;
    $std->xCpl = $empresa->complemento_endereco;
    $std->xBairro = $empresa->bairro;
    $std->cMun = $empresa->codigo_municipio;
    $std->xMun = $empresa->city;
    $std->UF = $empresa->state;
    $std->CEP = preg_replace('/\D/', '', $empresa->zip_code);
    $std->cPais = $empresa->codigo_pais ?? '1058';
    $std->xPais = $empresa->nome_pais ?? 'BRASIL';
    $std->fone = preg_replace('/\D/', '', $empresa->phone);
    $this->make->tagenderEmit($std);
    
    // 5. Destinatário
    $std = new \stdClass();
    if ($dadosCliente['tipo_documento'] === 'cpf') {
        $std->CPF = $dadosCliente['cpf'];
    } else {
        $std->CNPJ = $dadosCliente['cnpj'];
    }
    $std->xNome = $dadosCliente['name'];
    $std->indIEDest = $dadosCliente['indicador_ie'];
    $std->IE = $dadosCliente['inscricao_estadual'];
    $std->email = $dadosCliente['email'];
    $this->make->tagdest($std);
    
    // 6. Endereço do Destinatário
    $std = new \stdClass();
    $std->xLgr = $dadosCliente['address'];
    $std->nro = $dadosCliente['numero_endereco'];
    $std->xCpl = $dadosCliente['complemento_endereco'];
    $std->xBairro = $dadosCliente['bairro'];
    $std->cMun = $dadosCliente['codigo_municipio'];
    $std->xMun = $dadosCliente['city'];
    $std->UF = $dadosCliente['state'];
    $std->CEP = preg_replace('/\D/', '', $dadosCliente['zip_code']);
    $std->cPais = $dadosCliente['codigo_pais'] ?? '1058';
    $std->xPais = $dadosCliente['nome_pais'] ?? 'BRASIL';
    $std->fone = preg_replace('/\D/', '', $dadosCliente['phone']);
    $this->make->tagenderDest($std);
    
    // 7. Produtos
    foreach ($itensPedido as $index => $item) {
        $this->adicionarProduto($item, $index + 1);
    }
    
    // 8. Totais (calculados automaticamente)
    $std = new \stdClass();
    $this->make->tagICMSTot($std);
    
    // 9. Transporte
    $std = new \stdClass();
    $std->modFrete = 9; // Sem frete
    $this->make->tagtransp($std);
    
    // 10. Pagamento
    $std = new \stdClass();
    $this->make->tagpag($std);
    
    $std = new \stdClass();
    $std->tPag = $dadosVenda['forma_pagamento']['tipo'];
    $std->vPag = $dadosVenda['forma_pagamento']['valor'];
    $this->make->tagdetPag($std);
    
    // 11. Gerar XML
    $xml = $this->make->monta();
    $chave = $this->make->getChave();
    
    return [
        'xml' => $xml,
        'chave' => $chave,
        'numero_nfe' => $dadosVenda['numero_nfe']
    ];
}
```

### 3. Método para Adicionar Produtos
```php
private function adicionarProduto($item, $numeroItem)
{
    // Produto
    $std = new \stdClass();
    $std->item = $numeroItem;
    $std->cProd = $item['codigo_produto'];
    $std->cEAN = $item['codigo_barras'] ?: 'SEM GTIN';
    $std->xProd = $item['descricao'];
    $std->NCM = $item['ncm'];
    $std->CFOP = $item['cfop'];
    $std->uCom = $item['unidade'];
    $std->qCom = $item['quantidade'];
    $std->vUnCom = $item['valor_unitario'];
    $std->vProd = $item['valor_total'];
    $std->cEANTrib = $item['codigo_barras'] ?: 'SEM GTIN';
    $std->uTrib = $item['unidade'];
    $std->qTrib = $item['quantidade'];
    $std->vUnTrib = $item['valor_unitario'];
    $std->indTot = 1;
    $this->make->tagprod($std);
    
    // Impostos
    $std = new \stdClass();
    $std->item = $numeroItem;
    $this->make->tagimposto($std);
    
    // ICMS
    $std = new \stdClass();
    $std->item = $numeroItem;
    $std->orig = $item['origem_produto'];
    $std->CST = $item['cst_icms'];
    $std->modBC = 3; // Valor da operação
    $std->vBC = $item['valor_total'];
    $std->pICMS = $item['aliquota_icms'];
    $std->vICMS = ($item['valor_total'] * $item['aliquota_icms']) / 100;
    $this->make->tagICMS($std);
    
    // PIS
    $std = new \stdClass();
    $std->item = $numeroItem;
    $std->CST = $item['cst_pis'];
    $std->vBC = $item['valor_total'];
    $std->pPIS = $item['aliquota_pis'];
    $std->vPIS = ($item['valor_total'] * $item['aliquota_pis']) / 100;
    $this->make->tagPIS($std);
    
    // COFINS
    $std = new \stdClass();
    $std->item = $numeroItem;
    $std->CST = $item['cst_cofins'];
    $std->vBC = $item['valor_total'];
    $std->pCOFINS = $item['aliquota_cofins'];
    $std->vCOFINS = ($item['valor_total'] * $item['aliquota_cofins']) / 100;
    $this->make->tagCOFINS($std);
}
```

---

## 📡 Comunicação com SEFAZ

### 1. Envio da NFe
```php
public function enviarNFe($xml)
{
    try {
        $response = $this->tools->sefazEnviaLote([$xml], 1);
        
        if ($response) {
            $stdClass = json_decode($response);
            return [
                'sucesso' => true,
                'protocolo' => $stdClass->protNFe->infProt->nProt ?? null,
                'status' => $stdClass->protNFe->infProt->cStat ?? null,
                'motivo' => $stdClass->protNFe->infProt->xMotivo ?? null
            ];
        }
        
        return ['sucesso' => false, 'erro' => 'Resposta vazia da SEFAZ'];
        
    } catch (Exception $e) {
        return ['sucesso' => false, 'erro' => $e->getMessage()];
    }
}
```

### 2. Consulta Status
```php
public function consultarNFe($chave)
{
    try {
        $response = $this->tools->sefazConsultaChave($chave);
        
        if ($response) {
            $stdClass = json_decode($response);
            return [
                'sucesso' => true,
                'status' => $stdClass->protNFe->infProt->cStat ?? null,
                'motivo' => $stdClass->protNFe->infProt->xMotivo ?? null
            ];
        }
        
        return ['sucesso' => false, 'erro' => 'Resposta vazia da SEFAZ'];
        
    } catch (Exception $e) {
        return ['sucesso' => false, 'erro' => $e->getMessage()];
    }
}
```

### 3. Cancelamento
```php
public function cancelarNFe($chave, $protocolo, $justificativa)
{
    try {
        $response = $this->tools->sefazCancela($chave, $justificativa, $protocolo);
        
        if ($response) {
            $stdClass = json_decode($response);
            return [
                'sucesso' => true,
                'status' => $stdClass->retEvento->infEvento->cStat ?? null,
                'motivo' => $stdClass->retEvento->infEvento->xMotivo ?? null
            ];
        }
        
        return ['sucesso' => false, 'erro' => 'Resposta vazia da SEFAZ'];
        
    } catch (Exception $e) {
        return ['sucesso' => false, 'erro' => $e->getMessage()];
    }
}
```

---

## 🔍 Tratamento de Erros

### 1. Códigos de Status Comuns
```php
const STATUS_CODES = [
    '100' => 'Autorizado o uso da NF-e',
    '101' => 'Cancelamento de NF-e homologado',
    '102' => 'Inutilização de número homologado',
    '110' => 'Uso Denegado',
    '150' => 'Autorizado fora de prazo',
    '301' => 'Uso Denegado: Irregularidade fiscal do emitente',
    '302' => 'Uso Denegado: Irregularidade fiscal do destinatário',
    '303' => 'Uso Denegado: Destinatário não habilitado a operar na UF'
];
```

### 2. Validação de Erros
```php
public function validarRetorno($response)
{
    $stdClass = json_decode($response);
    $status = $stdClass->protNFe->infProt->cStat ?? null;
    
    if (in_array($status, ['100', '150'])) {
        return ['valido' => true, 'autorizada' => true];
    }
    
    if (in_array($status, ['110', '301', '302', '303'])) {
        return ['valido' => true, 'autorizada' => false, 'denegada' => true];
    }
    
    return ['valido' => false, 'erro' => $stdClass->protNFe->infProt->xMotivo ?? 'Erro desconhecido'];
}
```

---

**Status:** 🔄 Documentação Base
**Próxima Etapa:** Implementar serviços (Fase 4)
**Responsável:** Desenvolvimento
**Data:** {{ date('Y-m-d') }}
