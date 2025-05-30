# 🔧 Controllers e Services - VPS NFe

## 📋 Implementação dos Controllers

### 1. GerarNFeController.php
```php
<?php
namespace NexoNFe\Controllers;

require_once '../src/Services/NFeService.php';
require_once '../src/Utils/ResponseHelper.php';

use NexoNFe\Services\NFeService;
use NexoNFe\Utils\ResponseHelper;

class GerarNFeController
{
    private $nfeService;
    
    public function __construct()
    {
        $this->nfeService = new NFeService();
    }
    
    public function handle()
    {
        try {
            // Validar método
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                ResponseHelper::error('Método não permitido', 405);
                return;
            }
            
            // Obter dados JSON
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                ResponseHelper::error('Dados JSON inválidos', 400);
                return;
            }
            
            // Validar dados obrigatórios
            $this->validarDados($input);
            
            // Gerar NFe
            $resultado = $this->nfeService->gerarNFe(
                $input['empresa'],
                $input['cliente'],
                $input['produtos'],
                $input['totais'],
                $input['pagamentos'] ?? []
            );
            
            if ($resultado['sucesso']) {
                ResponseHelper::success([
                    'xml' => $resultado['xml'],
                    'chave' => $resultado['chave'],
                    'numero_nfe' => $resultado['numero_nfe'],
                    'protocolo' => $resultado['protocolo'] ?? null
                ]);
            } else {
                ResponseHelper::error($resultado['erro'], 422);
            }
            
        } catch (Exception $e) {
            error_log("Erro GerarNFeController: " . $e->getMessage());
            ResponseHelper::error('Erro interno do servidor', 500);
        }
    }
    
    private function validarDados($dados)
    {
        $required = ['empresa', 'cliente', 'produtos', 'totais'];
        
        foreach ($required as $field) {
            if (!isset($dados[$field])) {
                ResponseHelper::error("Campo obrigatório: {$field}", 400);
                exit();
            }
        }
        
        // Validar empresa
        if (!isset($dados['empresa']['cnpj'])) {
            ResponseHelper::error('CNPJ da empresa é obrigatório', 400);
            exit();
        }
        
        // Validar produtos
        if (empty($dados['produtos']) || !is_array($dados['produtos'])) {
            ResponseHelper::error('Pelo menos um produto é obrigatório', 400);
            exit();
        }
    }
}
?>
```

### 2. EnviarSefazController.php
```php
<?php
namespace NexoNFe\Controllers;

require_once '../src/Services/SefazService.php';
require_once '../src/Utils/ResponseHelper.php';

use NexoNFe\Services\SefazService;
use NexoNFe\Utils\ResponseHelper;

class EnviarSefazController
{
    private $sefazService;
    
    public function __construct()
    {
        $this->sefazService = new SefazService();
    }
    
    public function handle()
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['xml']) || !isset($input['chave'])) {
                ResponseHelper::error('XML e chave são obrigatórios', 400);
                return;
            }
            
            $resultado = $this->sefazService->enviarNFe($input['xml'], $input['chave']);
            
            if ($resultado['sucesso']) {
                ResponseHelper::success([
                    'protocolo' => $resultado['protocolo'],
                    'status' => $resultado['status'],
                    'motivo' => $resultado['motivo'],
                    'data_autorizacao' => $resultado['data_autorizacao'] ?? null
                ]);
            } else {
                ResponseHelper::error($resultado['erro'], 422);
            }
            
        } catch (Exception $e) {
            error_log("Erro EnviarSefazController: " . $e->getMessage());
            ResponseHelper::error('Erro interno do servidor', 500);
        }
    }
}
?>
```

### 3. ConsultarNFeController.php
```php
<?php
namespace NexoNFe\Controllers;

require_once '../src/Services/SefazService.php';
require_once '../src/Utils/ResponseHelper.php';

use NexoNFe\Services\SefazService;
use NexoNFe\Utils\ResponseHelper;

class ConsultarNFeController
{
    private $sefazService;
    
    public function __construct()
    {
        $this->sefazService = new SefazService();
    }
    
    public function handle()
    {
        try {
            $chave = $_GET['chave'] ?? '';
            
            if (empty($chave) || strlen($chave) !== 44) {
                ResponseHelper::error('Chave de acesso inválida', 400);
                return;
            }
            
            $resultado = $this->sefazService->consultarNFe($chave);
            
            if ($resultado['sucesso']) {
                ResponseHelper::success([
                    'chave' => $chave,
                    'status' => $resultado['status'],
                    'motivo' => $resultado['motivo'],
                    'protocolo' => $resultado['protocolo'] ?? null,
                    'data_consulta' => date('Y-m-d H:i:s')
                ]);
            } else {
                ResponseHelper::error($resultado['erro'], 422);
            }
            
        } catch (Exception $e) {
            error_log("Erro ConsultarNFeController: " . $e->getMessage());
            ResponseHelper::error('Erro interno do servidor', 500);
        }
    }
}
?>
```

---

## 🔧 Services Principais

### 1. NFeService.php
```php
<?php
namespace NexoNFe\Services;

require_once '../vendor/autoload.php';
require_once '../src/Utils/LogHelper.php';

use NFePHP\NFe\Make;
use NFePHP\NFe\Tools;
use NFePHP\Common\Certificate;
use NexoNFe\Utils\LogHelper;
use Exception;

class NFeService
{
    private $make;
    private $tools;
    private $config;
    
    public function __construct()
    {
        $this->config = $this->loadConfig();
        $this->make = new Make();
        $this->initializeTools();
    }
    
    private function loadConfig()
    {
        return [
            'ambiente' => $_ENV['NFE_AMBIENTE'] ?? 2,
            'uf_emissao' => $_ENV['NFE_UF_EMISSAO'] ?? 'SP',
            'serie_nfe' => $_ENV['NFE_SERIE_NFE'] ?? 1,
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
            
            if (!file_exists($this->config['certificado_path'])) {
                throw new Exception('Certificado digital não encontrado');
            }
            
            $certificate = Certificate::readPfx(
                file_get_contents($this->config['certificado_path']),
                $this->config['certificado_password']
            );
            
            $this->tools = new Tools($configJson, $certificate);
            
        } catch (Exception $e) {
            LogHelper::error('Erro ao inicializar ferramentas NFe', ['erro' => $e->getMessage()]);
            throw new Exception('Erro na configuração da NFe: ' . $e->getMessage());
        }
    }
    
    public function gerarNFe($empresa, $cliente, $produtos, $totais, $pagamentos = [])
    {
        try {
            LogHelper::info('Iniciando geração de NFe', ['empresa' => $empresa['cnpj']]);
            
            // 1. Configurar NFe
            $this->configurarNFe($empresa, $totais);
            
            // 2. Adicionar emitente
            $this->adicionarEmitente($empresa);
            
            // 3. Adicionar destinatário
            $this->adicionarDestinatario($cliente);
            
            // 4. Adicionar produtos
            foreach ($produtos as $index => $produto) {
                $this->adicionarProduto($produto, $index + 1);
            }
            
            // 5. Adicionar totais
            $this->adicionarTotais($totais);
            
            // 6. Adicionar transporte
            $this->adicionarTransporte();
            
            // 7. Adicionar pagamentos
            $this->adicionarPagamentos($pagamentos);
            
            // 8. Gerar XML
            $xml = $this->make->monta();
            $chave = $this->make->getChave();
            
            // 9. Salvar XML
            $this->salvarXML($xml, $chave);
            
            LogHelper::info('NFe gerada com sucesso', ['chave' => $chave]);
            
            return [
                'sucesso' => true,
                'xml' => $xml,
                'chave' => $chave,
                'numero_nfe' => $this->getProximoNumero()
            ];
            
        } catch (Exception $e) {
            LogHelper::error('Erro ao gerar NFe', ['erro' => $e->getMessage()]);
            
            return [
                'sucesso' => false,
                'erro' => $e->getMessage(),
                'detalhes' => $this->make->getErrors()
            ];
        }
    }
    
    private function configurarNFe($empresa, $totais)
    {
        // Tag principal
        $std = new \stdClass();
        $std->versao = '4.00';
        $this->make->taginfNFe($std);
        
        // Identificação
        $std = new \stdClass();
        $std->cUF = $this->getCodigoUF($empresa['state'] ?? 'SP');
        $std->cNF = str_pad(rand(1, 99999999), 8, '0', STR_PAD_LEFT);
        $std->natOp = $totais['natureza_operacao'] ?? 'VENDA';
        $std->mod = 55; // NFe
        $std->serie = $this->config['serie_nfe'];
        $std->nNF = $this->getProximoNumero();
        $std->dhEmi = date('Y-m-d\TH:i:sP');
        $std->tpNF = 1; // Saída
        $std->idDest = 1; // Operação interna
        $std->cMunFG = $empresa['codigo_municipio'] ?? 3550308;
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
    }
    
    private function adicionarEmitente($empresa)
    {
        // Dados da empresa
        $std = new \stdClass();
        $std->CNPJ = preg_replace('/\D/', '', $empresa['cnpj']);
        $std->xNome = $empresa['name'];
        $std->xFant = $empresa['nome_fantasia'] ?? $empresa['name'];
        $std->IE = $empresa['inscricao_estadual'];
        $std->CRT = $empresa['regime_tributario'] ?? 1;
        $this->make->tagemit($std);
        
        // Endereço da empresa
        $std = new \stdClass();
        $std->xLgr = $empresa['address'];
        $std->nro = $empresa['numero_endereco'] ?? 'S/N';
        $std->xBairro = $empresa['bairro'];
        $std->cMun = $empresa['codigo_municipio'] ?? 3550308;
        $std->xMun = $empresa['city'];
        $std->UF = $empresa['state'];
        $std->CEP = preg_replace('/\D/', '', $empresa['zip_code']);
        $std->cPais = 1058;
        $std->xPais = 'BRASIL';
        $std->fone = preg_replace('/\D/', '', $empresa['phone'] ?? '');
        $this->make->tagenderEmit($std);
    }
    
    private function adicionarDestinatario($cliente)
    {
        // Dados do cliente
        $std = new \stdClass();
        
        if (strlen(preg_replace('/\D/', '', $cliente['documento'])) === 11) {
            $std->CPF = preg_replace('/\D/', '', $cliente['documento']);
        } else {
            $std->CNPJ = preg_replace('/\D/', '', $cliente['documento']);
        }
        
        $std->xNome = $cliente['name'];
        $std->indIEDest = 9; // Não contribuinte
        $std->email = $cliente['email'] ?? '';
        $this->make->tagdest($std);
        
        // Endereço do cliente
        $std = new \stdClass();
        $std->xLgr = $cliente['address'] ?? 'Não informado';
        $std->nro = $cliente['numero_endereco'] ?? 'S/N';
        $std->xBairro = $cliente['bairro'] ?? 'Centro';
        $std->cMun = $cliente['codigo_municipio'] ?? 3550308;
        $std->xMun = $cliente['city'] ?? 'São Paulo';
        $std->UF = $cliente['state'] ?? 'SP';
        $std->CEP = preg_replace('/\D/', '', $cliente['zip_code'] ?? '01000000');
        $std->cPais = 1058;
        $std->xPais = 'BRASIL';
        $this->make->tagenderDest($std);
    }
    
    // Continua no próximo arquivo...
}
?>
```

---

## 🛠️ Utilitários

### 1. ResponseHelper.php
```php
<?php
namespace NexoNFe\Utils;

class ResponseHelper
{
    public static function success($data, $code = 200)
    {
        http_response_code($code);
        echo json_encode([
            'success' => true,
            'data' => $data,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
    
    public static function error($message, $code = 400, $details = null)
    {
        http_response_code($code);
        $response = [
            'success' => false,
            'error' => $message,
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
        if ($details) {
            $response['details'] = $details;
        }
        
        echo json_encode($response);
    }
}
?>
```

### 2. LogHelper.php
```php
<?php
namespace NexoNFe\Utils;

class LogHelper
{
    public static function info($message, $context = [])
    {
        self::log('INFO', $message, $context);
    }
    
    public static function error($message, $context = [])
    {
        self::log('ERROR', $message, $context);
    }
    
    public static function debug($message, $context = [])
    {
        self::log('DEBUG', $message, $context);
    }
    
    private static function log($level, $message, $context)
    {
        $log = [
            'timestamp' => date('Y-m-d H:i:s'),
            'level' => $level,
            'message' => $message,
            'context' => $context,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ];
        
        $logPath = $_ENV['NFE_LOG_PATH'] ?? '../storage/logs/nfe.log';
        file_put_contents($logPath, json_encode($log) . "\n", FILE_APPEND | LOCK_EX);
    }
}
?>
```

---

**Próximo**: Implementação completa dos Services e integração com Supabase
