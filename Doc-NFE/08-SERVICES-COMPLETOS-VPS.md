# 🔧 Services Completos - VPS NFe

## 📋 Continuação do NFeService.php

### Métodos Complementares do NFeService
```php
<?php
// Continuação da classe NFeService

    private function adicionarProduto($produto, $numeroItem)
    {
        // Dados do produto
        $std = new \stdClass();
        $std->item = $numeroItem;
        $std->cProd = $produto['codigo'] ?? str_pad($numeroItem, 6, '0', STR_PAD_LEFT);
        $std->cEAN = $produto['codigo_barras'] ?? 'SEM GTIN';
        $std->xProd = $produto['descricao'];
        $std->NCM = $produto['ncm'] ?? '99999999';
        $std->CFOP = $produto['cfop'] ?? '5102';
        $std->uCom = $produto['unidade'] ?? 'UN';
        $std->qCom = $produto['quantidade'];
        $std->vUnCom = $produto['valor_unitario'];
        $std->vProd = $produto['valor_total'];
        $std->cEANTrib = $produto['codigo_barras'] ?? 'SEM GTIN';
        $std->uTrib = $produto['unidade'] ?? 'UN';
        $std->qTrib = $produto['quantidade'];
        $std->vUnTrib = $produto['valor_unitario'];
        $std->indTot = 1;
        $this->make->tagprod($std);
        
        // Impostos
        $std = new \stdClass();
        $std->item = $numeroItem;
        $this->make->tagimposto($std);
        
        // ICMS
        $this->adicionarICMS($produto, $numeroItem);
        
        // PIS
        $this->adicionarPIS($produto, $numeroItem);
        
        // COFINS
        $this->adicionarCOFINS($produto, $numeroItem);
    }
    
    private function adicionarICMS($produto, $numeroItem)
    {
        $std = new \stdClass();
        $std->item = $numeroItem;
        $std->orig = $produto['origem_produto'] ?? 0;
        $std->CST = $produto['cst_icms'] ?? '00';
        
        // Para CST 00 (Tributada integralmente)
        if ($produto['cst_icms'] === '00') {
            $std->modBC = 3; // Valor da operação
            $std->vBC = $produto['valor_total'];
            $std->pICMS = $produto['aliquota_icms'] ?? 18;
            $std->vICMS = ($produto['valor_total'] * ($produto['aliquota_icms'] ?? 18)) / 100;
        }
        
        $this->make->tagICMS($std);
    }
    
    private function adicionarPIS($produto, $numeroItem)
    {
        $std = new \stdClass();
        $std->item = $numeroItem;
        $std->CST = $produto['cst_pis'] ?? '01';
        
        if ($produto['cst_pis'] === '01') {
            $std->vBC = $produto['valor_total'];
            $std->pPIS = $produto['aliquota_pis'] ?? 1.65;
            $std->vPIS = ($produto['valor_total'] * ($produto['aliquota_pis'] ?? 1.65)) / 100;
        }
        
        $this->make->tagPIS($std);
    }
    
    private function adicionarCOFINS($produto, $numeroItem)
    {
        $std = new \stdClass();
        $std->item = $numeroItem;
        $std->CST = $produto['cst_cofins'] ?? '01';
        
        if ($produto['cst_cofins'] === '01') {
            $std->vBC = $produto['valor_total'];
            $std->pCOFINS = $produto['aliquota_cofins'] ?? 7.6;
            $std->vCOFINS = ($produto['valor_total'] * ($produto['aliquota_cofins'] ?? 7.6)) / 100;
        }
        
        $this->make->tagCOFINS($std);
    }
    
    private function adicionarTotais($totais)
    {
        $std = new \stdClass();
        // Os valores serão calculados automaticamente pela biblioteca
        $this->make->tagICMSTot($std);
    }
    
    private function adicionarTransporte()
    {
        $std = new \stdClass();
        $std->modFrete = 9; // Sem frete
        $this->make->tagtransp($std);
    }
    
    private function adicionarPagamentos($pagamentos)
    {
        $std = new \stdClass();
        $this->make->tagpag($std);
        
        if (empty($pagamentos)) {
            // Pagamento padrão
            $std = new \stdClass();
            $std->tPag = '01'; // Dinheiro
            $std->vPag = 0.00;
            $this->make->tagdetPag($std);
        } else {
            foreach ($pagamentos as $pagamento) {
                $std = new \stdClass();
                $std->tPag = $pagamento['tipo'] ?? '01';
                $std->vPag = $pagamento['valor'];
                $this->make->tagdetPag($std);
            }
        }
    }
    
    private function salvarXML($xml, $chave)
    {
        $xmlPath = "../storage/xmls/{$chave}.xml";
        
        // Criar diretório se não existir
        $dir = dirname($xmlPath);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        
        file_put_contents($xmlPath, $xml);
        LogHelper::info('XML salvo', ['chave' => $chave, 'path' => $xmlPath]);
    }
    
    private function getProximoNumero()
    {
        // Implementar lógica para obter próximo número
        // Por enquanto, número fixo para teste
        return 1;
    }
    
    private function getCodigoUF($uf)
    {
        $codigos = [
            'AC' => 12, 'AL' => 17, 'AP' => 16, 'AM' => 23, 'BA' => 29,
            'CE' => 23, 'DF' => 53, 'ES' => 32, 'GO' => 52, 'MA' => 21,
            'MT' => 51, 'MS' => 50, 'MG' => 31, 'PA' => 15, 'PB' => 25,
            'PR' => 41, 'PE' => 26, 'PI' => 22, 'RJ' => 33, 'RN' => 24,
            'RS' => 43, 'RO' => 11, 'RR' => 14, 'SC' => 42, 'SP' => 35,
            'SE' => 28, 'TO' => 17
        ];
        
        return $codigos[$uf] ?? 35; // SP como padrão
    }
}
?>
```

---

## 📡 SefazService.php

### Comunicação com SEFAZ
```php
<?php
namespace NexoNFe\Services;

require_once '../vendor/autoload.php';
require_once '../src/Utils/LogHelper.php';

use NFePHP\NFe\Tools;
use NFePHP\Common\Certificate;
use NexoNFe\Utils\LogHelper;
use Exception;

class SefazService
{
    private $tools;
    private $config;
    
    public function __construct()
    {
        $this->config = $this->loadConfig();
        $this->initializeTools();
    }
    
    private function loadConfig()
    {
        return [
            'ambiente' => $_ENV['NFE_AMBIENTE'] ?? 2,
            'uf_emissao' => $_ENV['NFE_UF_EMISSAO'] ?? 'SP',
            'certificado_path' => $_ENV['NFE_CERTIFICADO_PATH'],
            'certificado_password' => $_ENV['NFE_CERTIFICADO_PASSWORD'],
            'timeout' => $_ENV['NFE_TIMEOUT'] ?? 60
        ];
    }
    
    private function initializeTools()
    {
        try {
            $configJson = json_encode([
                'atualizacao' => date('Y-m-d H:i:s'),
                'tpAmb' => $this->config['ambiente'],
                'razaosocial' => 'Empresa Teste',
                'cnpj' => '12345678000195',
                'siglaUF' => $this->config['uf_emissao'],
                'schemes' => 'PL_009_V4',
                'versao' => '4.00'
            ]);
            
            $certificate = Certificate::readPfx(
                file_get_contents($this->config['certificado_path']),
                $this->config['certificado_password']
            );
            
            $this->tools = new Tools($configJson, $certificate);
            
        } catch (Exception $e) {
            LogHelper::error('Erro ao inicializar SefazService', ['erro' => $e->getMessage()]);
            throw new Exception('Erro na configuração SEFAZ: ' . $e->getMessage());
        }
    }
    
    public function enviarNFe($xml, $chave)
    {
        try {
            LogHelper::info('Enviando NFe para SEFAZ', ['chave' => $chave]);
            
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
            LogHelper::error('Erro ao enviar NFe para SEFAZ', [
                'chave' => $chave,
                'erro' => $e->getMessage()
            ]);
            
            return [
                'sucesso' => false,
                'erro' => 'Erro na comunicação com SEFAZ: ' . $e->getMessage()
            ];
        }
    }
    
    public function consultarNFe($chave)
    {
        try {
            LogHelper::info('Consultando NFe na SEFAZ', ['chave' => $chave]);
            
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
            LogHelper::error('Erro ao consultar NFe na SEFAZ', [
                'chave' => $chave,
                'erro' => $e->getMessage()
            ]);
            
            return [
                'sucesso' => false,
                'erro' => 'Erro na consulta SEFAZ: ' . $e->getMessage()
            ];
        }
    }
    
    public function cancelarNFe($chave, $protocolo, $justificativa)
    {
        try {
            LogHelper::info('Cancelando NFe na SEFAZ', [
                'chave' => $chave,
                'protocolo' => $protocolo
            ]);
            
            if (strlen($justificativa) < 15) {
                throw new Exception('Justificativa deve ter pelo menos 15 caracteres');
            }
            
            $response = $this->tools->sefazCancela($chave, $justificativa, $protocolo);
            
            if (!$response) {
                throw new Exception('Resposta vazia da SEFAZ');
            }
            
            $resultado = $this->processarCancelamentoSefaz($response);
            
            LogHelper::info('Cancelamento SEFAZ processado', [
                'chave' => $chave,
                'status' => $resultado['status']
            ]);
            
            return $resultado;
            
        } catch (Exception $e) {
            LogHelper::error('Erro ao cancelar NFe na SEFAZ', [
                'chave' => $chave,
                'erro' => $e->getMessage()
            ]);
            
            return [
                'sucesso' => false,
                'erro' => 'Erro no cancelamento SEFAZ: ' . $e->getMessage()
            ];
        }
    }
    
    private function processarRespostaSefaz($response)
    {
        $xml = simplexml_load_string($response);
        
        if (!$xml) {
            throw new Exception('XML de resposta inválido');
        }
        
        // Verificar se há protocolo de autorização
        if (isset($xml->protNFe->infProt)) {
            $infProt = $xml->protNFe->infProt;
            $status = (string)$infProt->cStat;
            $motivo = (string)$infProt->xMotivo;
            $protocolo = (string)$infProt->nProt;
            
            // Status de sucesso: 100 (Autorizado) ou 150 (Autorizado fora de prazo)
            if (in_array($status, ['100', '150'])) {
                return [
                    'sucesso' => true,
                    'status' => $status,
                    'motivo' => $motivo,
                    'protocolo' => $protocolo,
                    'data_autorizacao' => (string)$infProt->dhRecbto
                ];
            } else {
                return [
                    'sucesso' => false,
                    'erro' => "SEFAZ: {$status} - {$motivo}",
                    'status' => $status,
                    'motivo' => $motivo
                ];
            }
        }
        
        // Verificar erros no lote
        if (isset($xml->infRec)) {
            $status = (string)$xml->infRec->cStat;
            $motivo = (string)$xml->infRec->xMotivo;
            
            return [
                'sucesso' => false,
                'erro' => "Erro no lote: {$status} - {$motivo}",
                'status' => $status,
                'motivo' => $motivo
            ];
        }
        
        throw new Exception('Formato de resposta SEFAZ não reconhecido');
    }
    
    private function processarConsultaSefaz($response)
    {
        $xml = simplexml_load_string($response);
        
        if (!$xml) {
            throw new Exception('XML de resposta inválido');
        }
        
        if (isset($xml->protNFe->infProt)) {
            $infProt = $xml->protNFe->infProt;
            $status = (string)$infProt->cStat;
            $motivo = (string)$infProt->xMotivo;
            $protocolo = (string)$infProt->nProt;
            
            return [
                'sucesso' => true,
                'status' => $status,
                'motivo' => $motivo,
                'protocolo' => $protocolo
            ];
        }
        
        throw new Exception('Resposta de consulta inválida');
    }
    
    private function processarCancelamentoSefaz($response)
    {
        $xml = simplexml_load_string($response);
        
        if (!$xml) {
            throw new Exception('XML de resposta inválido');
        }
        
        if (isset($xml->retEvento->infEvento)) {
            $infEvento = $xml->retEvento->infEvento;
            $status = (string)$infEvento->cStat;
            $motivo = (string)$infEvento->xMotivo;
            
            // Status 135 = Evento registrado e vinculado à NF-e
            if ($status === '135') {
                return [
                    'sucesso' => true,
                    'status' => $status,
                    'motivo' => $motivo,
                    'protocolo_cancelamento' => (string)$infEvento->nProt
                ];
            } else {
                return [
                    'sucesso' => false,
                    'erro' => "Cancelamento rejeitado: {$status} - {$motivo}",
                    'status' => $status,
                    'motivo' => $motivo
                ];
            }
        }
        
        throw new Exception('Resposta de cancelamento inválida');
    }
}
?>
```

---

## 🔗 SupabaseService.php

### Integração com Supabase
```php
<?php
namespace NexoNFe\Services;

require_once '../src/Utils/LogHelper.php';

use NexoNFe\Utils\LogHelper;
use Exception;

class SupabaseService
{
    private $supabaseUrl;
    private $supabaseKey;
    
    public function __construct()
    {
        $this->supabaseUrl = $_ENV['SUPABASE_URL'];
        $this->supabaseKey = $_ENV['SUPABASE_KEY'];
        
        if (!$this->supabaseUrl || !$this->supabaseKey) {
            throw new Exception('Configurações do Supabase não encontradas');
        }
    }
    
    public function salvarNFe($dados)
    {
        try {
            $url = $this->supabaseUrl . '/rest/v1/pdv';
            
            $headers = [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $this->supabaseKey,
                'apikey: ' . $this->supabaseKey
            ];
            
            $response = $this->makeRequest('POST', $url, $dados, $headers);
            
            LogHelper::info('NFe salva no Supabase', ['id' => $response['id'] ?? null]);
            
            return $response;
            
        } catch (Exception $e) {
            LogHelper::error('Erro ao salvar NFe no Supabase', ['erro' => $e->getMessage()]);
            throw $e;
        }
    }
    
    public function atualizarStatusNFe($id, $status, $dadosAdicionais = [])
    {
        try {
            $url = $this->supabaseUrl . '/rest/v1/pdv?id=eq.' . $id;
            
            $dados = array_merge([
                'status_nfe' => $status,
                'updated_at' => date('Y-m-d H:i:s')
            ], $dadosAdicionais);
            
            $headers = [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $this->supabaseKey,
                'apikey: ' . $this->supabaseKey
            ];
            
            $response = $this->makeRequest('PATCH', $url, $dados, $headers);
            
            LogHelper::info('Status NFe atualizado no Supabase', [
                'id' => $id,
                'status' => $status
            ]);
            
            return $response;
            
        } catch (Exception $e) {
            LogHelper::error('Erro ao atualizar status NFe no Supabase', [
                'id' => $id,
                'erro' => $e->getMessage()
            ]);
            throw $e;
        }
    }
    
    private function makeRequest($method, $url, $data = null, $headers = [])
    {
        $ch = curl_init();
        
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 30
        ]);
        
        if ($data && in_array($method, ['POST', 'PATCH', 'PUT'])) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        
        curl_close($ch);
        
        if ($error) {
            throw new Exception('Erro cURL: ' . $error);
        }
        
        if ($httpCode >= 400) {
            throw new Exception('Erro HTTP: ' . $httpCode . ' - ' . $response);
        }
        
        return json_decode($response, true);
    }
}
?>
```

---

**Próximo**: Scripts de instalação e configuração da VPS
