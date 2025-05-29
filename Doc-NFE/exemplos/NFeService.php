<?php

namespace App\Services\NFe;

use NFePHP\NFe\Make;
use NFePHP\NFe\Tools;
use NFePHP\Common\Certificate;
use App\Models\NfeDocument;
use App\Models\Order;
use Exception;
use Illuminate\Support\Facades\Log;

/**
 * Serviço principal para geração e gestão de NFe
 * 
 * Este serviço orquestra todo o processo de geração de NFe,
 * desde a preparação dos dados até o envio para SEFAZ
 */
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
    
    /**
     * Inicializa as ferramentas da NFePHP
     */
    private function initializeTools()
    {
        try {
            $configJson = json_encode([
                'atualizacao' => date('Y-m-d H:i:s'),
                'tpAmb' => $this->config['ambiente'],
                'razaosocial' => auth()->user()->company->name ?? 'Empresa',
                'cnpj' => auth()->user()->company->cnpj ?? '12345678000195',
                'siglaUF' => $this->config['uf_emissao'],
                'schemes' => 'PL_009_V4',
                'versao' => '4.00'
            ]);
            
            $certificate = Certificate::readPfx(
                file_get_contents($this->config['certificado']['path']),
                $this->config['certificado']['password']
            );
            
            $this->tools = new Tools($configJson, $certificate);
            
        } catch (Exception $e) {
            Log::error('Erro ao inicializar ferramentas NFe: ' . $e->getMessage());
            throw new Exception('Erro na configuração da NFe: ' . $e->getMessage());
        }
    }
    
    /**
     * Gera uma NFe completa a partir de um pedido
     * 
     * @param Order $order
     * @return array
     */
    public function gerarNFeFromOrder(Order $order)
    {
        try {
            // Validar se o pedido pode gerar NFe
            $this->validarPedido($order);
            
            // Preparar dados
            $dadosVenda = $this->prepararDadosVenda($order);
            $dadosCliente = $this->prepararDadosCliente($order->customer);
            $itensPedido = $this->prepararItensPedido($order->orderItems);
            
            // Gerar NFe
            $resultado = $this->gerarNFe($dadosVenda, $dadosCliente, $itensPedido);
            
            // Salvar no banco
            $nfeDocument = $this->salvarNFeDocument($order, $resultado);
            
            return [
                'sucesso' => true,
                'nfe_document' => $nfeDocument,
                'xml' => $resultado['xml'],
                'chave' => $resultado['chave']
            ];
            
        } catch (Exception $e) {
            Log::error('Erro ao gerar NFe do pedido ' . $order->id . ': ' . $e->getMessage());
            
            return [
                'sucesso' => false,
                'erro' => $e->getMessage(),
                'detalhes' => $this->make->getErrors()
            ];
        }
    }
    
    /**
     * Gera o XML da NFe
     */
    public function gerarNFe($dadosVenda, $dadosCliente, $itensPedido)
    {
        // 1. Configurar NFe
        $this->configurarNFe($dadosVenda);
        
        // 2. Adicionar emitente
        $this->adicionarEmitente();
        
        // 3. Adicionar destinatário
        $this->adicionarDestinatario($dadosCliente);
        
        // 4. Adicionar produtos
        foreach ($itensPedido as $index => $item) {
            $this->adicionarProduto($item, $index + 1);
        }
        
        // 5. Adicionar totais
        $this->adicionarTotais();
        
        // 6. Adicionar transporte
        $this->adicionarTransporte();
        
        // 7. Adicionar pagamento
        $this->adicionarPagamento($dadosVenda['forma_pagamento']);
        
        // 8. Gerar XML
        $xml = $this->make->monta();
        $chave = $this->make->getChave();
        
        return [
            'xml' => $xml,
            'chave' => $chave,
            'numero_nfe' => $dadosVenda['numero_nfe']
        ];
    }
    
    /**
     * Configura os dados básicos da NFe
     */
    private function configurarNFe($dadosVenda)
    {
        // Tag principal
        $std = new \stdClass();
        $std->versao = '4.00';
        $this->make->taginfNFe($std);
        
        // Identificação
        $std = new \stdClass();
        $std->cUF = 35; // SP - buscar da empresa
        $std->cNF = str_pad(rand(1, 99999999), 8, '0', STR_PAD_LEFT);
        $std->natOp = $dadosVenda['natureza_operacao'];
        $std->mod = 55; // NFe
        $std->serie = $dadosVenda['serie'];
        $std->nNF = $dadosVenda['numero_nfe'];
        $std->dhEmi = date('Y-m-d\TH:i:sP', strtotime($dadosVenda['data_emissao']));
        $std->tpNF = $dadosVenda['tipo_operacao'];
        $std->idDest = 1; // Operação interna
        $std->cMunFG = 3550308; // Buscar da empresa
        $std->tpImp = 1; // DANFE normal
        $std->tpEmis = 1; // Emissão normal
        $std->cDV = 0; // Calculado automaticamente
        $std->tpAmb = $dadosVenda['ambiente'];
        $std->finNFe = 1; // NFe normal
        $std->indFinal = $dadosVenda['consumidor_final'];
        $std->indPres = $dadosVenda['presenca_comprador'];
        $std->procEmi = 0; // Emissão própria
        $std->verProc = '1.0';
        
        $this->make->tagide($std);
    }
    
    /**
     * Adiciona dados do emitente
     */
    private function adicionarEmitente()
    {
        $empresa = auth()->user()->company;
        
        // Dados da empresa
        $std = new \stdClass();
        $std->CNPJ = preg_replace('/\D/', '', $empresa->cnpj);
        $std->xNome = $empresa->name;
        $std->xFant = $empresa->nome_fantasia;
        $std->IE = $empresa->inscricao_estadual;
        $std->IM = $empresa->inscricao_municipal;
        $std->CNAE = $empresa->cnae_principal;
        $std->CRT = $empresa->regime_tributario;
        $this->make->tagemit($std);
        
        // Endereço da empresa
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
    }
    
    /**
     * Adiciona dados do destinatário
     */
    private function adicionarDestinatario($dadosCliente)
    {
        // Dados do cliente
        $std = new \stdClass();
        
        if ($dadosCliente['tipo_documento'] === 'cpf') {
            $std->CPF = preg_replace('/\D/', '', $dadosCliente['cpf']);
        } else {
            $std->CNPJ = preg_replace('/\D/', '', $dadosCliente['cnpj']);
        }
        
        $std->xNome = $dadosCliente['name'];
        $std->indIEDest = $dadosCliente['indicador_ie'];
        $std->IE = $dadosCliente['inscricao_estadual'];
        $std->email = $dadosCliente['email'];
        $this->make->tagdest($std);
        
        // Endereço do cliente
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
    }
    
    /**
     * Adiciona um produto à NFe
     */
    private function adicionarProduto($item, $numeroItem)
    {
        // Dados do produto
        $std = new \stdClass();
        $std->item = $numeroItem;
        $std->cProd = $item['codigo_produto'];
        $std->cEAN = $item['codigo_barras'] ?: 'SEM GTIN';
        $std->xProd = $item['descricao'];
        $std->NCM = $item['ncm'];
        $std->CFOP = $item['cfop'];
        $std->uCom = $item['unidade_comercial'];
        $std->qCom = $item['quantidade'];
        $std->vUnCom = $item['valor_unitario'];
        $std->vProd = $item['valor_total'];
        $std->cEANTrib = $item['codigo_barras'] ?: 'SEM GTIN';
        $std->uTrib = $item['unidade_tributavel'];
        $std->qTrib = $item['quantidade'];
        $std->vUnTrib = $item['valor_unitario'];
        $std->vFrete = $item['valor_frete'] ?? 0.00;
        $std->vSeg = $item['valor_seguro'] ?? 0.00;
        $std->vDesc = $item['valor_desconto'] ?? 0.00;
        $std->vOutro = $item['valor_outras_despesas'] ?? 0.00;
        $std->indTot = $item['compoe_total_nfe'] ?? 1;
        $this->make->tagprod($std);
        
        // Impostos
        $std = new \stdClass();
        $std->item = $numeroItem;
        $this->make->tagimposto($std);
        
        // ICMS
        $this->adicionarICMS($item, $numeroItem);
        
        // PIS
        $this->adicionarPIS($item, $numeroItem);
        
        // COFINS
        $this->adicionarCOFINS($item, $numeroItem);
    }
    
    /**
     * Adiciona ICMS do item
     */
    private function adicionarICMS($item, $numeroItem)
    {
        $std = new \stdClass();
        $std->item = $numeroItem;
        $std->orig = $item['origem_produto'];
        $std->CST = $item['cst_icms'];
        
        // Configurar conforme CST
        if (in_array($item['cst_icms'], ['00', '10', '20', '51', '70', '90'])) {
            $std->modBC = 3; // Valor da operação
            $std->vBC = $item['valor_total'];
            $std->pICMS = $item['aliquota_icms'];
            $std->vICMS = ($item['valor_total'] * $item['aliquota_icms']) / 100;
        }
        
        $this->make->tagICMS($std);
    }
    
    /**
     * Adiciona PIS do item
     */
    private function adicionarPIS($item, $numeroItem)
    {
        $std = new \stdClass();
        $std->item = $numeroItem;
        $std->CST = $item['cst_pis'];
        
        if (in_array($item['cst_pis'], ['01', '02'])) {
            $std->vBC = $item['valor_total'];
            $std->pPIS = $item['aliquota_pis'];
            $std->vPIS = ($item['valor_total'] * $item['aliquota_pis']) / 100;
        }
        
        $this->make->tagPIS($std);
    }
    
    /**
     * Adiciona COFINS do item
     */
    private function adicionarCOFINS($item, $numeroItem)
    {
        $std = new \stdClass();
        $std->item = $numeroItem;
        $std->CST = $item['cst_cofins'];
        
        if (in_array($item['cst_cofins'], ['01', '02'])) {
            $std->vBC = $item['valor_total'];
            $std->pCOFINS = $item['aliquota_cofins'];
            $std->vCOFINS = ($item['valor_total'] * $item['aliquota_cofins']) / 100;
        }
        
        $this->make->tagCOFINS($std);
    }
    
    /**
     * Adiciona totais da NFe
     */
    private function adicionarTotais()
    {
        $std = new \stdClass();
        // Os valores serão calculados automaticamente pela biblioteca
        $this->make->tagICMSTot($std);
    }
    
    /**
     * Adiciona dados de transporte
     */
    private function adicionarTransporte()
    {
        $std = new \stdClass();
        $std->modFrete = 9; // Sem frete
        $this->make->tagtransp($std);
    }
    
    /**
     * Adiciona forma de pagamento
     */
    private function adicionarPagamento($formaPagamento)
    {
        $std = new \stdClass();
        $this->make->tagpag($std);
        
        $std = new \stdClass();
        $std->tPag = $formaPagamento['tipo'];
        $std->vPag = $formaPagamento['valor'];
        $this->make->tagdetPag($std);
    }
    
    // Métodos auxiliares para preparar dados...
    private function prepararDadosVenda($order) { /* implementar */ }
    private function prepararDadosCliente($customer) { /* implementar */ }
    private function prepararItensPedido($orderItems) { /* implementar */ }
    private function validarPedido($order) { /* implementar */ }
    private function salvarNFeDocument($order, $resultado) { /* implementar */ }
}
