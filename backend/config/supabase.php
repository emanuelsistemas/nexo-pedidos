<?php
/**
 * ✅ CONFIGURAÇÃO DO SUPABASE
 * 
 * Arquivo centralizado de configuração do Supabase
 * para uso em todos os endpoints do backend
 */

// Configurações do Supabase
$supabaseUrl = 'https://xsrirnfwsjeovekwtluz.supabase.co';
$supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcmlybmZ3c2plb3Zla3d0bHV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjY2NDk5NywiZXhwIjoyMDYyMjQwOTk3fQ.UC2DvFRcfrNUbRrnQhrpqsX_hJXBLy9g-YVZbpaTcso';

// Criar instância do cliente Supabase
class SupabaseClient {
    private $url;
    private $key;
    
    public function __construct($url, $key) {
        $this->url = $url;
        $this->key = $key;
    }
    
    public function from($table) {
        return new SupabaseQuery($this->url, $this->key, $table);
    }
}

class SupabaseQuery {
    private $url;
    private $key;
    private $table;
    private $filters = [];
    private $select = '*';
    
    public function __construct($url, $key, $table) {
        $this->url = $url;
        $this->key = $key;
        $this->table = $table;
    }
    
    public function select($columns) {
        $this->select = $columns;
        return $this;
    }
    
    public function eq($column, $value) {
        $this->filters[] = $column . '=eq.' . urlencode($value);
        return $this;
    }
    
    public function single() {
        $this->filters[] = 'limit=1';
        $result = $this->execute();
        return [
            'data' => isset($result[0]) ? $result[0] : null,
            'error' => null
        ];
    }
    
    public function execute() {
        $url = $this->url . '/rest/v1/' . $this->table;
        
        if (!empty($this->filters)) {
            $url .= '?' . implode('&', $this->filters);
        }
        
        if ($this->select !== '*') {
            $url .= (strpos($url, '?') !== false ? '&' : '?') . 'select=' . urlencode($this->select);
        }
        
        $headers = [
            'apikey: ' . $this->key,
            'Authorization: Bearer ' . $this->key,
            'Content-Type: application/json'
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            throw new Exception("Erro na requisição Supabase: HTTP {$httpCode} - {$response}");
        }
        
        return json_decode($response, true);
    }
}

// Instanciar cliente global
$supabase = new SupabaseClient($supabaseUrl, $supabaseKey);

// Função auxiliar para requisições diretas
function supabaseRequest($url, $method = 'GET', $data = null) {
    global $supabaseKey;

    $headers = [
        'apikey: ' . $supabaseKey,
        'Authorization: Bearer ' . $supabaseKey,
        'Content-Type: application/json'
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);

    $upper = strtoupper($method);
    if ($upper !== 'GET') {
        if ($upper === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
        } else {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $upper);
        }
        if ($data !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($response === false) {
        $err = curl_error($ch);
        curl_close($ch);
        throw new Exception('Erro cURL: ' . $err);
    }
    curl_close($ch);

    if ($httpCode < 200 || $httpCode >= 300) {
        throw new Exception("Erro na requisição Supabase: HTTP {$httpCode} - {$response}");
    }

    return json_decode($response, true);
}
?>
