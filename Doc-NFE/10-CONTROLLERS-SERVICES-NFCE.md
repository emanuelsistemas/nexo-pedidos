# 🔧 Controllers e Services NFC-e - Implementação Técnica

## 📋 Visão Geral
Documentação técnica detalhada dos controllers e services específicos para NFC-e, baseados na infraestrutura NFe existente.

---

## 🏗️ Estrutura de Arquivos

```
api/
├── app/
│   ├── Controllers/
│   │   ├── NFeController.php (existente)
│   │   └── NFCeController.php (novo)
│   ├── Services/
│   │   ├── NFeService.php (existente)
│   │   └── NFCeService.php (novo)
│   └── Models/
│       └── NFCeDocument.php (novo)
├── routes/
│   └── api.php (adicionar rotas NFC-e)
└── config/
    └── nfce.php (novo)
```

---

## 🎮 NFCeController.php

### Localização: `api/app/Controllers/NFCeController.php`

```php
<?php

namespace App\Controllers;

use App\Services\NFCeService;
use App\Helpers\LogHelper;
use App\Helpers\ResponseHelper;
use Exception;

class NFCeController
{
    private $nfceService;
    
    public function __construct()
    {
        $this->nfceService = new NFCeService();
    }
    
    /**
     * Gera XML da NFC-e
     * POST /api/gerar-nfce
     */
    public function gerarNFCe()
    {
        try {
            $dados = json_decode(file_get_contents('php://input'), true);
            
            // Validar dados obrigatórios
            $this->validarDadosNFCe($dados);
            
            LogHelper::info('Iniciando geração de NFC-e', [
                'empresa_cnpj' => $dados['empresa']['cnpj'] ?? 'N/A'
            ]);
            
            // Gerar NFC-e
            $resultado = $this->nfceService->gerarNFCe(
                $dados['empresa'],
                $dados['consumidor'] ?? null,
                $dados['produtos'],
                $dados['totais'],
                $dados['pagamentos']
            );
            
            LogHelper::info('NFC-e gerada com sucesso', [
                'chave' => $resultado['chave'],
                'numero' => $resultado['numero_nfce']
            ]);
            
            return ResponseHelper::success([
                'xml' => $resultado['xml'],
                'chave' => $resultado['chave'],
                'numero_nfce' => $resultado['numero_nfce'],
                'qr_code' => $resultado['qr_code'] ?? null
            ], 'NFC-e gerada com sucesso');
            
        } catch (Exception $e) {
            LogHelper::error('Erro ao gerar NFC-e', [
                'erro' => $e->getMessage(),
                'dados' => $dados ?? null
            ]);
            
            return ResponseHelper::error(
                'Erro ao gerar NFC-e: ' . $e->getMessage(),
                500
            );
        }
    }
    
    /**
     * Envia NFC-e para SEFAZ
     * POST /api/enviar-nfce-sefaz
     */
    public function enviarSefaz()
    {
        try {
            $dados = json_decode(file_get_contents('php://input'), true);
            
            if (empty($dados['xml']) || empty($dados['chave'])) {
                return ResponseHelper::error('XML e chave são obrigatórios', 400);
            }
            
            LogHelper::info('Enviando NFC-e para SEFAZ', [
                'chave' => $dados['chave']
            ]);
            
            $resultado = $this->nfceService->enviarNFCe(
                $dados['xml'],
                $dados['chave']
            );
            
            if ($resultado['sucesso']) {
                LogHelper::info('NFC-e enviada com sucesso', [
                    'chave' => $dados['chave'],
                    'protocolo' => $resultado['protocolo'] ?? null
                ]);
                
                return ResponseHelper::success($resultado, 'NFC-e enviada com sucesso');
            } else {
                return ResponseHelper::error($resultado['erro'], 422);
            }
            
        } catch (Exception $e) {
            LogHelper::error('Erro ao enviar NFC-e para SEFAZ', [
                'erro' => $e->getMessage(),
                'chave' => $dados['chave'] ?? 'N/A'
            ]);
            
            return ResponseHelper::error(
                'Erro ao enviar NFC-e: ' . $e->getMessage(),
                500
            );
        }
    }
    
    /**
     * Consulta NFC-e na SEFAZ
     * GET /api/consultar-nfce/{chave}
     */
    public function consultarSefaz($chave)
    {
        try {
            if (empty($chave) || strlen($chave) !== 44) {
                return ResponseHelper::error('Chave de acesso inválida', 400);
            }
            
            LogHelper::info('Consultando NFC-e na SEFAZ', ['chave' => $chave]);
            
            $resultado = $this->nfceService->consultarNFCe($chave);
            
            return ResponseHelper::success($resultado, 'Consulta realizada com sucesso');
            
        } catch (Exception $e) {
            LogHelper::error('Erro ao consultar NFC-e', [
                'erro' => $e->getMessage(),
                'chave' => $chave
            ]);
            
            return ResponseHelper::error(
                'Erro ao consultar NFC-e: ' . $e->getMessage(),
                500
            );
        }
    }
    
    /**
     * Cancela NFC-e autorizada
     * POST /api/cancelar-nfce
     */
    public function cancelarNFCe()
    {
        try {
            $dados = json_decode(file_get_contents('php://input'), true);
            
            if (empty($dados['chave']) || empty($dados['justificativa'])) {
                return ResponseHelper::error('Chave e justificativa são obrigatórios', 400);
            }
            
            if (strlen($dados['justificativa']) < 15) {
                return ResponseHelper::error('Justificativa deve ter pelo menos 15 caracteres', 400);
            }
            
            LogHelper::info('Cancelando NFC-e', [
                'chave' => $dados['chave'],
                'justificativa' => $dados['justificativa']
            ]);
            
            $resultado = $this->nfceService->cancelarNFCe(
                $dados['chave'],
                $dados['justificativa']
            );
            
            if ($resultado['sucesso']) {
                return ResponseHelper::success($resultado, 'NFC-e cancelada com sucesso');
            } else {
                return ResponseHelper::error($resultado['erro'], 422);
            }
            
        } catch (Exception $e) {
            LogHelper::error('Erro ao cancelar NFC-e', [
                'erro' => $e->getMessage(),
                'dados' => $dados ?? null
            ]);
            
            return ResponseHelper::error(
                'Erro ao cancelar NFC-e: ' . $e->getMessage(),
                500
            );
        }
    }
    
    /**
     * Gera QR Code para NFC-e
     * POST /api/gerar-qrcode-nfce
     */
    public function gerarQRCode()
    {
        try {
            $dados = json_decode(file_get_contents('php://input'), true);
            
            if (empty($dados['chave']) || empty($dados['url_consulta'])) {
                return ResponseHelper::error('Chave e URL de consulta são obrigatórios', 400);
            }
            
            $qrCode = $this->nfceService->gerarQRCode(
                $dados['chave'],
                $dados['url_consulta'],
                $dados['valor_total'] ?? 0
            );
            
            return ResponseHelper::success([
                'qr_code' => $qrCode,
                'url_consulta' => $dados['url_consulta']
            ], 'QR Code gerado com sucesso');
            
        } catch (Exception $e) {
            return ResponseHelper::error(
                'Erro ao gerar QR Code: ' . $e->getMessage(),
                500
            );
        }
    }
    
    /**
     * Valida dados obrigatórios para NFC-e
     */
    private function validarDadosNFCe($dados)
    {
        // Validar empresa
        if (empty($dados['empresa'])) {
            throw new Exception('Dados da empresa são obrigatórios');
        }
        
        if (empty($dados['empresa']['cnpj'])) {
            throw new Exception('CNPJ da empresa é obrigatório');
        }
        
        // Validar produtos
        if (empty($dados['produtos']) || !is_array($dados['produtos'])) {
            throw new Exception('Produtos são obrigatórios');
        }
        
        // Validar valor total (limite NFC-e)
        $valorTotal = $dados['totais']['valor_total'] ?? 0;
        if ($valorTotal > 5000.00) {
            throw new Exception('Valor total não pode exceder R$ 5.000,00 para NFC-e');
        }
        
        // Validar pagamentos
        if (empty($dados['pagamentos']) || !is_array($dados['pagamentos'])) {
            throw new Exception('Formas de pagamento são obrigatórias para NFC-e');
        }
        
        // Validar soma dos pagamentos
        $totalPagamentos = array_sum(array_column($dados['pagamentos'], 'valor'));
        if (abs($totalPagamentos - $valorTotal) > 0.01) {
            throw new Exception('Soma dos pagamentos deve ser igual ao valor total');
        }
    }
    
    /**
     * Retorna configurações específicas da NFC-e
     * GET /api/config-nfce
     */
    public function getConfig()
    {
        try {
            $config = [
                'valor_maximo' => 5000.00,
                'tipos_pagamento' => [
                    '01' => 'Dinheiro',
                    '02' => 'Cheque',
                    '03' => 'Cartão de Crédito',
                    '04' => 'Cartão de Débito',
                    '05' => 'Crédito Loja',
                    '10' => 'Vale Alimentação',
                    '11' => 'Vale Refeição',
                    '12' => 'Vale Presente',
                    '13' => 'Vale Combustível',
                    '15' => 'Boleto Bancário',
                    '99' => 'Outros'
                ],
                'ambiente_padrao' => 2, // Homologação
                'serie_padrao' => 1,
                'consumidor_obrigatorio' => false
            ];
            
            return ResponseHelper::success($config, 'Configurações NFC-e');
            
        } catch (Exception $e) {
            return ResponseHelper::error(
                'Erro ao obter configurações: ' . $e->getMessage(),
                500
            );
        }
    }
}
```

---

## 🔧 Rotas API - routes/api.php

### Adicionar ao arquivo existente:

```php
// Rotas NFC-e
Route::prefix('api')->group(function () {
    
    // Geração e envio
    Route::post('/gerar-nfce', [NFCeController::class, 'gerarNFCe']);
    Route::post('/enviar-nfce-sefaz', [NFCeController::class, 'enviarSefaz']);
    
    // Consulta e cancelamento
    Route::get('/consultar-nfce/{chave}', [NFCeController::class, 'consultarSefaz']);
    Route::post('/cancelar-nfce', [NFCeController::class, 'cancelarNFCe']);
    
    // Utilitários
    Route::post('/gerar-qrcode-nfce', [NFCeController::class, 'gerarQRCode']);
    Route::get('/config-nfce', [NFCeController::class, 'getConfig']);
    
    // Impressão
    Route::post('/imprimir-cupom-nfce', [NFCeController::class, 'imprimirCupom']);
});
```

---

## ⚙️ Configuração - config/nfce.php

```php
<?php

return [
    
    // Ambiente (1 = Produção, 2 = Homologação)
    'ambiente' => env('NFCE_AMBIENTE', 2),
    
    // Série padrão para NFC-e
    'serie_padrao' => env('NFCE_SERIE', 1),
    
    // Valor máximo permitido
    'valor_maximo' => 5000.00,
    
    // Configurações de impressão
    'impressao' => [
        'largura_cupom' => '58mm',
        'fonte_padrao' => 'monospace',
        'tamanho_fonte' => '12px',
        'incluir_qrcode' => true
    ],
    
    // URLs SEFAZ por UF (exemplo SP)
    'urls_sefaz' => [
        'SP' => [
            'homologacao' => 'https://homologacao.nfce.fazenda.sp.gov.br/NFCeConsultaPublica',
            'producao' => 'https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica'
        ]
    ],
    
    // Tipos de pagamento permitidos
    'tipos_pagamento' => [
        '01' => 'Dinheiro',
        '02' => 'Cheque', 
        '03' => 'Cartão de Crédito',
        '04' => 'Cartão de Débito',
        '05' => 'Crédito Loja',
        '10' => 'Vale Alimentação',
        '11' => 'Vale Refeição',
        '12' => 'Vale Presente',
        '13' => 'Vale Combustível',
        '15' => 'Boleto Bancário',
        '99' => 'Outros'
    ],
    
    // Validações específicas
    'validacoes' => [
        'cpf_obrigatorio' => false,
        'valor_minimo' => 0.01,
        'valor_maximo' => 5000.00,
        'justificativa_cancelamento_min' => 15
    ]
];
```

---

## 📊 Model NFCeDocument.php

```php
<?php

namespace App\Models;

class NFCeDocument
{
    private $pdo;
    
    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }
    
    /**
     * Salva NFC-e no banco de dados
     */
    public function salvar($dados)
    {
        $sql = "INSERT INTO pdv (
            empresa_id, modelo_documento, serie_documento, numero_documento,
            chave_nfe, status_nfe, valor_total, nome_cliente, natureza_operacao,
            xml_nfe, qr_code, url_consulta, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
        
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute([
            $dados['empresa_id'],
            65, // Modelo NFC-e
            $dados['serie'],
            $dados['numero'],
            $dados['chave'],
            $dados['status'],
            $dados['valor_total'],
            $dados['consumidor_nome'] ?? 'CONSUMIDOR',
            'VENDA',
            $dados['xml'],
            $dados['qr_code'] ?? null,
            $dados['url_consulta'] ?? null
        ]);
    }
    
    /**
     * Atualiza status da NFC-e
     */
    public function atualizarStatus($chave, $status, $protocolo = null)
    {
        $sql = "UPDATE pdv SET status_nfe = ?, protocolo_uso = ? WHERE chave_nfe = ?";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute([$status, $protocolo, $chave]);
    }
    
    /**
     * Busca próximo número de NFC-e
     */
    public function proximoNumero($empresaId, $serie = 1)
    {
        $sql = "SELECT COALESCE(MAX(numero_documento), 0) + 1 as proximo 
                FROM pdv 
                WHERE empresa_id = ? AND modelo_documento = 65 AND serie_documento = ?";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$empresaId, $serie]);
        $result = $stmt->fetch();
        
        return $result['proximo'] ?? 1;
    }
}
```

---

## 🚀 Próximos Arquivos

Na próxima documentação (`11-SERVICES-COMPLETOS-NFCE.md`), vou detalhar:

1. **NFCeService.php completo**
2. **Métodos específicos NFC-e**
3. **Geração de QR Code**
4. **Integração com SEFAZ**
5. **Tratamento de erros específicos**

---

**Status**: Controllers e Rotas Documentados ✅  
**Próximo**: Services Completos NFC-e
