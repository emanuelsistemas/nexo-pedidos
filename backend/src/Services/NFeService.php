<?php

namespace Nexo\Services;

use NFePHP\NFe\Make;
use NFePHP\NFe\Tools;
use NFePHP\Common\Certificate;
use Exception;

/**
 * Serviço para emissão de NFe
 */
class NFeService
{
    private $tools;
    private $config;
    
    public function __construct(array $config)
    {
        $this->config = $config;
        $this->initializeTools();
    }
    
    /**
     * Inicializa as ferramentas da NFe
     */
    private function initializeTools()
    {
        try {
            // Configuração básica
            $configJson = json_encode([
                "atualizacao" => date('Y-m-d H:i:s'),
                "tpAmb" => $this->config['ambiente'] ?? 2, // 1-Produção, 2-Homologação
                "razaosocial" => $this->config['razao_social'] ?? "",
                "cnpj" => $this->config['cnpj'] ?? "",
                "siglaUF" => $this->config['uf'] ?? "SP",
                "schemes" => "PL_009_V4",
                "versao" => "4.00",
                "tokenIBPT" => "",
                "CSC" => $this->config['csc'] ?? "",
                "CSCid" => $this->config['csc_id'] ?? ""
            ]);
            
            // Carrega o certificado
            $certificateContent = $this->loadCertificate();
            
            if ($certificateContent) {
                $certificate = Certificate::readPfx($certificateContent, $this->config['cert_password'] ?? '');
                $this->tools = new Tools($configJson, $certificate);
            }
            
        } catch (Exception $e) {
            throw new Exception("Erro ao inicializar ferramentas NFe: " . $e->getMessage());
        }
    }
    
    /**
     * Carrega o certificado digital
     */
    private function loadCertificate()
    {
        $certPath = $this->config['cert_path'] ?? '';
        
        if (empty($certPath) || !file_exists($certPath)) {
            throw new Exception("Certificado digital não encontrado: " . $certPath);
        }
        
        return file_get_contents($certPath);
    }
    
    /**
     * Cria uma nova NFe
     */
    public function createNFe(array $dadosNfe)
    {
        try {
            $make = new Make();
            
            // Aqui você implementará a lógica para construir a NFe
            // baseado nos dados fornecidos
            
            // Exemplo básico de estrutura
            $this->buildNFeStructure($make, $dadosNfe);
            
            // Monta o XML
            $xml = $make->getXML();
            
            return [
                'success' => true,
                'xml' => $xml,
                'chave' => $make->getChave()
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Constrói a estrutura básica da NFe
     */
    private function buildNFeStructure(Make $make, array $dados)
    {
        // Implementar conforme a documentação da biblioteca
        // Este é apenas um exemplo básico
        
        // Tag infNFe
        $std = new \stdClass();
        $std->versao = '4.00';
        $std->Id = null;
        $std->pk_nItem = null;
        $make->taginfNFe($std);
        
        // Adicionar outras tags conforme necessário
        // $this->addIdentificacao($make, $dados);
        // $this->addEmitente($make, $dados);
        // $this->addDestinatario($make, $dados);
        // $this->addProdutos($make, $dados);
        // etc...
    }
    
    /**
     * Assina e envia a NFe
     */
    public function sendNFe($xml)
    {
        try {
            if (!$this->tools) {
                throw new Exception("Ferramentas NFe não inicializadas");
            }

            // Assina o XML
            $xmlSigned = $this->tools->signNFe($xml);

            // Envia para a SEFAZ
            $response = $this->tools->sefazEnviaLote([$xmlSigned], 1);

            return [
                'success' => true,
                'response' => $response
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Salva XML no storage
     */
    public function saveXML($xml, $chave)
    {
        try {
            $xmlPath = $this->config['xml_path'] . '/' . $chave . '.xml';

            if (!is_dir(dirname($xmlPath))) {
                mkdir(dirname($xmlPath), 0755, true);
            }

            file_put_contents($xmlPath, $xml);

            return [
                'success' => true,
                'path' => $xmlPath,
                'url' => $this->getFileUrl('xml', $chave)
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Salva PDF no storage
     */
    public function savePDF($pdf, $chave)
    {
        try {
            $pdfPath = $this->config['pdf_path'] . '/' . $chave . '.pdf';

            if (!is_dir(dirname($pdfPath))) {
                mkdir(dirname($pdfPath), 0755, true);
            }

            file_put_contents($pdfPath, $pdf);

            return [
                'success' => true,
                'path' => $pdfPath,
                'url' => $this->getFileUrl('pdf', $chave)
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Gera URL para acesso ao arquivo
     */
    public function getFileUrl($type, $chave)
    {
        $baseUrl = $this->config['base_url'] ?? 'http://localhost';

        // Opção 1: Via endpoint PHP
        return $baseUrl . '/files.php?type=' . $type . '&chave=' . $chave;

        // Opção 2: Via acesso direto (se configurado)
        // return $baseUrl . '/storage/' . $type . '/' . $chave . '.' . $type;
    }

    /**
     * Verifica se arquivo existe
     */
    public function fileExists($type, $chave)
    {
        $path = $this->config[$type . '_path'] . '/' . $chave . '.' . $type;
        return file_exists($path);
    }
}
