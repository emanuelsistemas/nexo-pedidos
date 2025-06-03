<?php
namespace NexoNFe\Services;

use Exception;

class SupabaseService
{
    private $supabaseUrl;
    private $supabaseKey;
    
    public function __construct()
    {
        // Configurações do Supabase
        $this->supabaseUrl = 'https://xsrirnfwsjeovekwtluz.supabase.co';
        $this->supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcmlybmZ3c2plb3Zla3d0bHV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjY2NDk5NywiZXhwIjoyMDYyMjQwOTk3fQ.UC2DvFRcfrNUbRrnQhrpqsX_hJXBLy9g-YVZbpaTcso'; // Service role key CORRETA
        
        if (!$this->supabaseUrl || !$this->supabaseKey) {
            throw new Exception('Configurações do Supabase não encontradas');
        }
        
        error_log("SupabaseService inicializado - URL: " . $this->supabaseUrl);
    }
    
    /**
     * Buscar dados da empresa
     */
    public function buscarEmpresa($empresaId)
    {
        try {
            error_log("Buscando empresa: " . $empresaId);
            
            $url = $this->supabaseUrl . '/rest/v1/empresas?id=eq.' . $empresaId;
            
            $headers = [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $this->supabaseKey,
                'apikey: ' . $this->supabaseKey
            ];
            
            $response = $this->makeRequest('GET', $url, null, $headers);
            
            if (empty($response)) {
                throw new Exception("Empresa não encontrada: " . $empresaId);
            }
            
            $empresa = $response[0];
            error_log("Empresa encontrada: " . $empresa['razao_social']);
            
            return $empresa;
            
        } catch (Exception $e) {
            error_log("ERRO ao buscar empresa: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Baixar certificado digital do Supabase Storage
     */
    public function baixarCertificado($certificadoPath)
    {
        try {
            error_log("Baixando certificado: " . $certificadoPath);
            
            $url = $this->supabaseUrl . '/storage/v1/object/certificadodigital/' . $certificadoPath;
            
            $headers = [
                'Authorization: Bearer ' . $this->supabaseKey
            ];
            
            $ch = curl_init();
            
            curl_setopt_array($ch, [
                CURLOPT_URL => $url,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_TIMEOUT => 30,
                CURLOPT_FOLLOWLOCATION => true
            ]);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            
            curl_close($ch);
            
            if ($error) {
                throw new Exception('Erro cURL ao baixar certificado: ' . $error);
            }
            
            if ($httpCode !== 200) {
                throw new Exception('Erro HTTP ao baixar certificado: ' . $httpCode);
            }
            
            if (empty($response)) {
                throw new Exception('Certificado vazio ou não encontrado');
            }
            
            error_log("Certificado baixado com sucesso - Tamanho: " . strlen($response) . " bytes");
            
            return $response;
            
        } catch (Exception $e) {
            error_log("ERRO ao baixar certificado: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Salvar NFe no Supabase
     */
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
            
            error_log('NFe salva no Supabase - ID: ' . ($response['id'] ?? 'N/A'));
            
            return $response;
            
        } catch (Exception $e) {
            error_log('Erro ao salvar NFe no Supabase: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Atualizar status da NFe
     */
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
            
            error_log('Status NFe atualizado - ID: ' . $id . ' Status: ' . $status);
            
            return $response;
            
        } catch (Exception $e) {
            error_log('Erro ao atualizar status NFe: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Fazer requisição HTTP
     */
    private function makeRequest($method, $url, $data = null, $headers = [])
    {
        $ch = curl_init();
        
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false
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
