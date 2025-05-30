# 🛠️ Services Completos NFC-e - NFCeService.php

## 📋 Visão Geral
Implementação completa do NFCeService.php com todos os métodos específicos para geração, envio e gestão de NFC-e.

---

## 🔧 NFCeService.php Completo

### Localização: `api/app/Services/NFCeService.php`

```php
<?php

namespace App\Services;

use NFePHP\NFe\Make;
use NFePHP\NFe\Tools;
use NFePHP\Common\Certificate;
use App\Models\NFCeDocument;
use App\Helpers\LogHelper;
use Exception;

class NFCeService
{
    private $make;
    private $tools;
    private $config;
    private $nfceDocument;
    private $ultimoNumeroGerado;

    public function __construct()
    {
        $this->config = include __DIR__ . '/../../config/nfce.php';
        $this->make = new Make();
        $this->nfceDocument = new NFCeDocument($this->getPDO());
        $this->initializeTools();
    }

    /**
     * Inicializa ferramentas NFePHP para NFC-e
     */
    private function initializeTools()
    {
        try {
            $configJson = json_encode([
                'atualizacao' => date('Y-m-d H:i:s'),
                'tpAmb' => $this->config['ambiente'],
                'razaosocial' => 'Empresa Teste', // Será substituído pelos dados reais
                'cnpj' => '12345678000195',        // Será substituído pelos dados reais
                'siglaUF' => 'SP',                 // Será substituído pelos dados reais
                'schemes' => 'PL_009_V4',
                'versao' => '4.00'
            ]);

            // Certificado será carregado dinamicamente por empresa
            $this->tools = null; // Inicializado no método configurarCertificado()

        } catch (Exception $e) {
            LogHelper::error('Erro ao inicializar ferramentas NFC-e', ['erro' => $e->getMessage()]);
            throw new Exception('Erro na configuração da NFC-e: ' . $e->getMessage());
        }
    }

    /**
     * Configura certificado específico da empresa
     */
    private function configurarCertificado($empresa)
    {
        try {
            $configJson = json_encode([
                'atualizacao' => date('Y-m-d H:i:s'),
                'tpAmb' => $this->config['ambiente'],
                'razaosocial' => $empresa['razao_social'],
                'cnpj' => preg_replace('/\D/', '', $empresa['cnpj']),
                'siglaUF' => $empresa['uf'] ?? 'SP',
                'schemes' => 'PL_009_V4',
                'versao' => '4.00'
            ]);

            // Buscar certificado da empresa no Supabase
            $certificadoData = $this->buscarCertificadoEmpresa($empresa['id']);

            if (!$certificadoData) {
                throw new Exception('Certificado digital não encontrado para a empresa');
            }

            $certificate = Certificate::readPfx(
                $certificadoData['arquivo'],
                $certificadoData['senha']
            );

            $this->tools = new Tools($configJson, $certificate);

            LogHelper::info('Certificado configurado com sucesso', [
                'empresa_cnpj' => $empresa['cnpj']
            ]);

        } catch (Exception $e) {
            LogHelper::error('Erro ao configurar certificado', [
                'empresa_cnpj' => $empresa['cnpj'] ?? 'N/A',
                'erro' => $e->getMessage()
            ]);
            throw new Exception('Erro ao configurar certificado: ' . $e->getMessage());
        }
    }

    /**
     * Gera NFC-e completa
     */
    public function gerarNFCe($empresa, $consumidor, $produtos, $totais, $pagamentos)
    {
        try {
            LogHelper::info('Iniciando geração de NFC-e', ['empresa' => $empresa['cnpj']]);

            // Configurar certificado da empresa
            $this->configurarCertificado($empresa);

            // Validar dados específicos NFC-e
            $this->validarDadosNFCe($totais, $pagamentos);

            // 1. Configurar identificação NFC-e
            $this->configurarNFCe($empresa, $totais);

            // 2. Adicionar emitente
            $this->adicionarEmitente($empresa);

            // 3. Adicionar consumidor (opcional)
            $this->adicionarConsumidor($consumidor);

            // 4. Adicionar produtos
            foreach ($produtos as $index => $produto) {
                $this->adicionarProduto($produto, $index + 1);
            }

            // 5. Adicionar totais
            $this->adicionarTotais($totais);

            // 6. Adicionar pagamentos (obrigatório NFC-e)
            $this->adicionarPagamentos($pagamentos);

            // 7. Gerar XML
            $xml = $this->make->monta();
            $chave = $this->make->getChave();

            // 8. Gerar QR Code
            $qrCode = $this->gerarQRCode($chave, $empresa['uf'], $totais['valor_total']);

            LogHelper::info('NFC-e gerada com sucesso', [
                'chave' => $chave,
                'numero' => $this->ultimoNumeroGerado
            ]);

            // 8. Salvar arquivos no Supabase Storage
            $arquivos = $this->salvarArquivos($xml, $chave, $empresa['id']);

            return [
                'xml' => $xml,
                'chave' => $chave,
                'numero_nfce' => $this->ultimoNumeroGerado,
                'qr_code' => $qrCode,
                'url_consulta' => $this->getUrlConsulta($empresa['uf']),
                'arquivos' => $arquivos
            ];

        } catch (Exception $e) {
            LogHelper::error('Erro ao gerar NFC-e', [
                'empresa' => $empresa['cnpj'] ?? 'N/A',
                'erro' => $e->getMessage()
            ]);
            throw new Exception('Erro ao gerar NFC-e: ' . $e->getMessage());
        }
    }

    /**
     * Configura identificação específica da NFC-e
     */
    private function configurarNFCe($empresa, $totais)
    {
        // Buscar próximo número
        $this->ultimoNumeroGerado = $this->nfceDocument->proximoNumero(
            $empresa['id'],
            $empresa['serie_nfce'] ?? 1
        );

        $std = new \stdClass();
        $std->cUF = $this->getCodigoUF($empresa['uf'] ?? 'SP');
        $std->cNF = str_pad(rand(1, 99999999), 8, '0', STR_PAD_LEFT);
        $std->natOp = 'VENDA';
        $std->mod = 65; // NFC-e
        $std->serie = $empresa['serie_nfce'] ?? 1;
        $std->nNF = $this->ultimoNumeroGerado;
        $std->dhEmi = date('Y-m-d\TH:i:sP');
        $std->tpNF = 1; // Saída
        $std->idDest = 1; // Operação interna
        $std->cMunFG = $empresa['codigo_municipio'] ?? 3550308; // São Paulo padrão
        $std->tpImp = 4; // DANFE NFC-e
        $std->tpEmis = 1; // Emissão normal
        $std->cDV = 0; // Calculado automaticamente
        $std->tpAmb = $this->config['ambiente'];
        $std->finNFe = 1; // NFe normal
        $std->indFinal = 1; // Consumidor final (sempre para NFC-e)
        $std->indPres = 1; // Operação presencial (sempre para NFC-e)
        $std->procEmi = 0; // Emissão própria
        $std->verProc = '1.0';

        $this->make->tagide($std);
    }

    /**
     * Adiciona dados do emitente
     */
    private function adicionarEmitente($empresa)
    {
        $std = new \stdClass();
        $std->CNPJ = preg_replace('/\D/', '', $empresa['cnpj']);
        $std->xNome = $empresa['razao_social'];
        $std->xFant = $empresa['nome_fantasia'] ?? $empresa['razao_social'];
        $std->IE = $empresa['inscricao_estadual'];
        $std->IM = $empresa['inscricao_municipal'] ?? null;
        $std->CNAE = $empresa['cnae_principal'] ?? null;
        $std->CRT = $empresa['regime_tributario'] ?? 1; // Simples Nacional padrão

        $this->make->tagemit($std);

        // Endereço do emitente
        $endereco = new \stdClass();
        $endereco->xLgr = $empresa['endereco'] ?? 'Rua Teste';
        $endereco->nro = $empresa['numero'] ?? '123';
        $endereco->xCpl = $empresa['complemento'] ?? null;
        $endereco->xBairro = $empresa['bairro'] ?? 'Centro';
        $endereco->cMun = $empresa['codigo_municipio'] ?? 3550308;
        $endereco->xMun = $empresa['cidade'] ?? 'São Paulo';
        $endereco->UF = $empresa['uf'] ?? 'SP';
        $endereco->CEP = preg_replace('/\D/', '', $empresa['cep'] ?? '01000000');
        $endereco->cPais = 1058; // Brasil
        $endereco->xPais = 'BRASIL';
        $endereco->fone = preg_replace('/\D/', '', $empresa['telefone'] ?? '');

        $this->make->tagenderEmit($endereco);
    }

    /**
     * Adiciona dados do consumidor (opcional para NFC-e)
     */
    private function adicionarConsumidor($consumidor = null)
    {
        if ($consumidor && !empty($consumidor['cpf'])) {
            // Consumidor identificado
            $std = new \stdClass();
            $std->CPF = preg_replace('/\D/', '', $consumidor['cpf']);
            $std->xNome = $consumidor['nome'] ?? 'CONSUMIDOR';
            $std->indIEDest = 9; // Não contribuinte

            $this->make->tagdest($std);

            LogHelper::info('Consumidor identificado adicionado', [
                'cpf' => $consumidor['cpf'],
                'nome' => $consumidor['nome'] ?? 'CONSUMIDOR'
            ]);
        } else {
            // Consumidor não identificado (padrão NFC-e)
            $std = new \stdClass();
            $std->xNome = 'CONSUMIDOR';
            $std->indIEDest = 9; // Não contribuinte

            $this->make->tagdest($std);

            LogHelper::info('Consumidor não identificado (padrão NFC-e)');
        }
    }

    /**
     * Adiciona produto à NFC-e
     */
    private function adicionarProduto($produto, $numeroItem)
    {
        // Produto
        $std = new \stdClass();
        $std->item = $numeroItem;
        $std->cProd = $produto['codigo'];
        $std->cEAN = $produto['codigo_barras'] ?? 'SEM GTIN';
        $std->xProd = $produto['descricao'];
        $std->NCM = $produto['ncm'];
        $std->CFOP = $produto['cfop'];
        $std->uCom = $produto['unidade'];
        $std->qCom = $produto['quantidade'];
        $std->vUnCom = number_format($produto['valor_unitario'], 2, '.', '');
        $std->vProd = number_format($produto['valor_total'], 2, '.', '');
        $std->cEANTrib = $produto['codigo_barras'] ?? 'SEM GTIN';
        $std->uTrib = $produto['unidade'];
        $std->qTrib = $produto['quantidade'];
        $std->vUnTrib = number_format($produto['valor_unitario'], 2, '.', '');

        $this->make->tagprod($std);

        // Impostos (simplificado para NFC-e)
        $this->adicionarImpostosProduto($produto, $numeroItem);
    }

    /**
     * Adiciona impostos do produto (simplificado para NFC-e)
     */
    private function adicionarImpostosProduto($produto, $numeroItem)
    {
        // ICMS
        $icms = new \stdClass();
        $icms->item = $numeroItem;
        $icms->orig = $produto['origem_produto'] ?? 0;
        $icms->CSOSN = $produto['csosn_icms'] ?? '102'; // Simples Nacional padrão

        $this->make->tagICMSSN($icms);

        // PIS
        $pis = new \stdClass();
        $pis->item = $numeroItem;
        $pis->CST = $produto['cst_pis'] ?? '01';
        $pis->vBC = 0.00;
        $pis->pPIS = 0.00;
        $pis->vPIS = 0.00;

        $this->make->tagPIS($pis);

        // COFINS
        $cofins = new \stdClass();
        $cofins->item = $numeroItem;
        $cofins->CST = $produto['cst_cofins'] ?? '01';
        $cofins->vBC = 0.00;
        $cofins->pCOFINS = 0.00;
        $cofins->vCOFINS = 0.00;

        $this->make->tagCOFINS($cofins);
    }

    /**
     * Adiciona totais da NFC-e
     */
    private function adicionarTotais($totais)
    {
        // Total dos produtos
        $icmsTotal = new \stdClass();
        $icmsTotal->vBC = 0.00;
        $icmsTotal->vICMS = 0.00;
        $icmsTotal->vICMSDeson = 0.00;
        $icmsTotal->vFCP = 0.00;
        $icmsTotal->vBCST = 0.00;
        $icmsTotal->vST = 0.00;
        $icmsTotal->vFCPST = 0.00;
        $icmsTotal->vFCPSTRet = 0.00;
        $icmsTotal->vProd = number_format($totais['valor_produtos'], 2, '.', '');
        $icmsTotal->vFrete = 0.00;
        $icmsTotal->vSeg = 0.00;
        $icmsTotal->vDesc = number_format($totais['valor_desconto'] ?? 0, 2, '.', '');
        $icmsTotal->vII = 0.00;
        $icmsTotal->vIPI = 0.00;
        $icmsTotal->vIPIDevol = 0.00;
        $icmsTotal->vPIS = 0.00;
        $icmsTotal->vCOFINS = 0.00;
        $icmsTotal->vOutro = 0.00;
        $icmsTotal->vNF = number_format($totais['valor_total'], 2, '.', '');

        $this->make->tagICMSTot($icmsTotal);
    }

    /**
     * Adiciona formas de pagamento (obrigatório NFC-e)
     */
    private function adicionarPagamentos($pagamentos)
    {
        foreach ($pagamentos as $index => $pagamento) {
            $std = new \stdClass();
            $std->indPag = 0; // Pagamento à vista
            $std->tPag = $pagamento['tipo']; // Tipo de pagamento
            $std->vPag = number_format($pagamento['valor'], 2, '.', '');

            // Adicionar dados do cartão se necessário
            if (in_array($pagamento['tipo'], ['03', '04'])) { // Cartão
                $std->tpIntegra = 1; // Integrado
                $std->CNPJ = null; // Não obrigatório para NFC-e
                $std->tBand = $pagamento['bandeira'] ?? '99'; // Outros
                $std->cAut = $pagamento['autorizacao'] ?? null;
            }

            $this->make->tagdetPag($std);
        }
    }

    /**
     * Gera QR Code específico para NFC-e
     */
    public function gerarQRCode($chave, $uf, $valorTotal)
    {
        try {
            $urlConsulta = $this->getUrlConsulta($uf);

            // Dados para QR Code NFC-e
            $dadosQR = [
                'chNFe' => $chave,
                'nVersao' => '100',
                'tpAmb' => $this->config['ambiente'],
                'cDest' => '', // CPF do destinatário (vazio se não identificado)
                'dhEmi' => date('Y-m-d\TH:i:sP'),
                'vNF' => number_format($valorTotal, 2, '.', ''),
                'vICMS' => '0.00',
                'digVal' => substr(sha1($chave), 0, 8),
                'cIdToken' => '000001', // Token padrão
                'cHashQRCode' => ''
            ];

            // Montar string do QR Code
            $stringQR = $urlConsulta . '?';
            foreach ($dadosQR as $key => $value) {
                if ($value !== '') {
                    $stringQR .= $key . '=' . urlencode($value) . '&';
                }
            }
            $stringQR = rtrim($stringQR, '&');

            LogHelper::info('QR Code gerado', [
                'chave' => $chave,
                'url' => $stringQR
            ]);

            return $stringQR;

        } catch (Exception $e) {
            LogHelper::error('Erro ao gerar QR Code', [
                'chave' => $chave,
                'erro' => $e->getMessage()
            ]);
            throw new Exception('Erro ao gerar QR Code: ' . $e->getMessage());
        }
    }

    /**
     * Envia NFC-e para SEFAZ
     */
    public function enviarNFCe($xml, $chave)
    {
        try {
            LogHelper::info('Enviando NFC-e para SEFAZ', ['chave' => $chave]);

            if (!$this->tools) {
                throw new Exception('Ferramentas NFePHP não inicializadas');
            }

            // Enviar lote para SEFAZ
            $response = $this->tools->sefazEnviaLote([$xml], 1);

            if (!$response) {
                throw new Exception('Resposta vazia da SEFAZ');
            }

            // Processar resposta
            $resultado = $this->processarRespostaSefaz($response);

            LogHelper::info('Resposta SEFAZ recebida', [
                'chave' => $chave,
                'status' => $resultado['status'],
                'protocolo' => $resultado['protocolo'] ?? null
            ]);

            return $resultado;

        } catch (Exception $e) {
            LogHelper::error('Erro ao enviar NFC-e para SEFAZ', [
                'chave' => $chave,
                'erro' => $e->getMessage()
            ]);

            return [
                'sucesso' => false,
                'erro' => 'Erro na comunicação com SEFAZ: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Consulta NFC-e na SEFAZ
     */
    public function consultarNFCe($chave)
    {
        try {
            LogHelper::info('Consultando NFC-e na SEFAZ', ['chave' => $chave]);

            if (!$this->tools) {
                throw new Exception('Ferramentas NFePHP não inicializadas');
            }

            $response = $this->tools->sefazConsultaChave($chave);

            if (!$response) {
                throw new Exception('Resposta vazia da SEFAZ');
            }

            $resultado = $this->processarConsultaSefaz($response);

            LogHelper::info('Consulta SEFAZ realizada', [
                'chave' => $chave,
                'status' => $resultado['status']
            ]);

            return $resultado;

        } catch (Exception $e) {
            LogHelper::error('Erro ao consultar NFC-e na SEFAZ', [
                'chave' => $chave,
                'erro' => $e->getMessage()
            ]);

            return [
                'sucesso' => false,
                'erro' => 'Erro na consulta SEFAZ: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Cancela NFC-e autorizada
     */
    public function cancelarNFCe($chave, $justificativa)
    {
        try {
            LogHelper::info('Cancelando NFC-e', [
                'chave' => $chave,
                'justificativa' => $justificativa
            ]);

            if (!$this->tools) {
                throw new Exception('Ferramentas NFePHP não inicializadas');
            }

            $response = $this->tools->sefazCancela($chave, $justificativa);

            if (!$response) {
                throw new Exception('Resposta vazia da SEFAZ');
            }

            $resultado = $this->processarCancelamentoSefaz($response);

            LogHelper::info('Cancelamento processado', [
                'chave' => $chave,
                'sucesso' => $resultado['sucesso']
            ]);

            return $resultado;

        } catch (Exception $e) {
            LogHelper::error('Erro ao cancelar NFC-e', [
                'chave' => $chave,
                'erro' => $e->getMessage()
            ]);

            return [
                'sucesso' => false,
                'erro' => 'Erro no cancelamento: ' . $e->getMessage()
            ];
        }
    }

    // Métodos auxiliares continuam na próxima parte...
}
```

---

## 🚀 Continuação na Próxima Documentação

Devido ao limite de linhas, vou continuar com os métodos auxiliares e utilitários na próxima documentação (`12-METODOS-AUXILIARES-NFCE.md`).

**Status**: Service Principal Documentado ✅
**Próximo**: Métodos Auxiliares e Utilitários
