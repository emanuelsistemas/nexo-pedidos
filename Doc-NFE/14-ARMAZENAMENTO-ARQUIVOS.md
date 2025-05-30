# 📁 Armazenamento de Arquivos XML e PDF - Estratégia Completa

## 📋 Visão Geral
Documentação completa sobre onde e como armazenar os arquivos XML e PDF gerados pelo sistema de NFe/NFC-e.

---

## 🏗️ Arquitetura de Armazenamento

### **Estratégia Híbrida Recomendada:**
```
VPS (Geração) → Supabase Storage (Armazenamento) → Frontend (Acesso)
      ↓                    ↓                           ↓
  Temporário         Permanente                   Download/Visualização
```

---

## 🎯 **Opção 1: Supabase Storage (Recomendada) ✅**

### **Vantagens:**
- ✅ **Integração nativa** com sistema existente
- ✅ **Backup automático** e redundância
- ✅ **Acesso direto** do frontend React
- ✅ **Escalabilidade** automática
- ✅ **CDN integrado** para downloads rápidos
- ✅ **Controle de acesso** por empresa/usuário
- ✅ **Versionamento** automático
- ✅ **Sem custo adicional** de infraestrutura

### **Estrutura de Pastas:**
```
Bucket: documentos-fiscais
├── empresa-123/
│   ├── nfe/
│   │   ├── 2024/
│   │   │   ├── 12/
│   │   │   │   ├── xml/
│   │   │   │   │   ├── 35241212345678000195550010000000011234567890.xml
│   │   │   │   │   └── 35241212345678000195550010000000011234567890-proc.xml
│   │   │   │   ├── pdf/
│   │   │   │   │   └── 35241212345678000195550010000000011234567890.pdf
│   │   │   │   └── cancelamento/
│   │   │   │       └── 35241212345678000195550010000000011234567890-canc.xml
│   │   └── nfce/
│   │       ├── 2024/
│   │       │   ├── 12/
│   │       │   │   ├── xml/
│   │       │   │   │   └── 35241212345678000195650010000000011234567890.xml
│   │       │   │   └── cupom/
│   │       │   │       └── 35241212345678000195650010000000011234567890.html
│   └── certificados/
│       └── certificado-empresa-123.p12
```

### **Implementação PHP - SupabaseStorageHelper.php:**

```php
<?php

namespace App\Helpers;

use Exception;

class SupabaseStorageHelper
{
    private $supabaseUrl;
    private $supabaseKey;
    private $bucketName;
    
    public function __construct()
    {
        $this->supabaseUrl = env('SUPABASE_URL');
        $this->supabaseKey = env('SUPABASE_SERVICE_KEY'); // Service key para backend
        $this->bucketName = 'documentos-fiscais';
    }
    
    /**
     * Salva XML da NFe/NFC-e no Supabase Storage
     */
    public function salvarXML($xml, $chave, $empresaId, $tipo = 'nfe')
    {
        try {
            $ano = date('Y');
            $mes = date('m');
            $caminho = "empresa-{$empresaId}/{$tipo}/{$ano}/{$mes}/xml/{$chave}.xml";
            
            $response = $this->uploadFile($caminho, $xml, 'application/xml');
            
            if ($response['sucesso']) {
                LogHelper::info('XML salvo no Supabase Storage', [
                    'chave' => $chave,
                    'caminho' => $caminho,
                    'tipo' => $tipo
                ]);
                
                return [
                    'sucesso' => true,
                    'caminho' => $caminho,
                    'url_publica' => $this->getUrlPublica($caminho)
                ];
            }
            
            throw new Exception('Erro ao fazer upload: ' . $response['erro']);
            
        } catch (Exception $e) {
            LogHelper::error('Erro ao salvar XML no Supabase', [
                'chave' => $chave,
                'erro' => $e->getMessage()
            ]);
            
            return [
                'sucesso' => false,
                'erro' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Salva PDF/Cupom no Supabase Storage
     */
    public function salvarPDF($conteudoPdf, $chave, $empresaId, $tipo = 'nfe')
    {
        try {
            $ano = date('Y');
            $mes = date('m');
            $pasta = $tipo === 'nfce' ? 'cupom' : 'pdf';
            $extensao = $tipo === 'nfce' ? 'html' : 'pdf';
            $caminho = "empresa-{$empresaId}/{$tipo}/{$ano}/{$mes}/{$pasta}/{$chave}.{$extensao}";
            
            $contentType = $tipo === 'nfce' ? 'text/html' : 'application/pdf';
            $response = $this->uploadFile($caminho, $conteudoPdf, $contentType);
            
            if ($response['sucesso']) {
                LogHelper::info('PDF/Cupom salvo no Supabase Storage', [
                    'chave' => $chave,
                    'caminho' => $caminho,
                    'tipo' => $tipo
                ]);
                
                return [
                    'sucesso' => true,
                    'caminho' => $caminho,
                    'url_publica' => $this->getUrlPublica($caminho)
                ];
            }
            
            throw new Exception('Erro ao fazer upload: ' . $response['erro']);
            
        } catch (Exception $e) {
            LogHelper::error('Erro ao salvar PDF no Supabase', [
                'chave' => $chave,
                'erro' => $e->getMessage()
            ]);
            
            return [
                'sucesso' => false,
                'erro' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Upload genérico para Supabase Storage
     */
    private function uploadFile($caminho, $conteudo, $contentType)
    {
        try {
            $url = "{$this->supabaseUrl}/storage/v1/object/{$this->bucketName}/{$caminho}";
            
            $headers = [
                'Authorization: Bearer ' . $this->supabaseKey,
                'Content-Type: ' . $contentType,
                'x-upsert: true' // Sobrescrever se existir
            ];
            
            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => $url,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $conteudo,
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 30
            ]);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($httpCode >= 200 && $httpCode < 300) {
                return ['sucesso' => true, 'response' => $response];
            } else {
                return ['sucesso' => false, 'erro' => "HTTP {$httpCode}: {$response}"];
            }
            
        } catch (Exception $e) {
            return ['sucesso' => false, 'erro' => $e->getMessage()];
        }
    }
    
    /**
     * Gera URL pública para download
     */
    public function getUrlPublica($caminho)
    {
        return "{$this->supabaseUrl}/storage/v1/object/public/{$this->bucketName}/{$caminho}";
    }
    
    /**
     * Gera URL assinada (temporária) para acesso privado
     */
    public function getUrlAssinada($caminho, $expiresIn = 3600)
    {
        try {
            $url = "{$this->supabaseUrl}/storage/v1/object/sign/{$this->bucketName}/{$caminho}";
            
            $data = json_encode(['expiresIn' => $expiresIn]);
            
            $headers = [
                'Authorization: Bearer ' . $this->supabaseKey,
                'Content-Type: application/json'
            ];
            
            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => $url,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $data,
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_RETURNTRANSFER => true
            ]);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($httpCode === 200) {
                $result = json_decode($response, true);
                return $this->supabaseUrl . $result['signedURL'];
            }
            
            throw new Exception("Erro ao gerar URL assinada: HTTP {$httpCode}");
            
        } catch (Exception $e) {
            LogHelper::error('Erro ao gerar URL assinada', [
                'caminho' => $caminho,
                'erro' => $e->getMessage()
            ]);
            return null;
        }
    }
    
    /**
     * Lista arquivos de uma empresa
     */
    public function listarArquivos($empresaId, $tipo = null, $ano = null, $mes = null)
    {
        try {
            $prefixo = "empresa-{$empresaId}/";
            if ($tipo) $prefixo .= "{$tipo}/";
            if ($ano) $prefixo .= "{$ano}/";
            if ($mes) $prefixo .= "{$mes}/";
            
            $url = "{$this->supabaseUrl}/storage/v1/object/list/{$this->bucketName}";
            
            $data = json_encode([
                'prefix' => $prefixo,
                'limit' => 1000
            ]);
            
            $headers = [
                'Authorization: Bearer ' . $this->supabaseKey,
                'Content-Type: application/json'
            ];
            
            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => $url,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $data,
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_RETURNTRANSFER => true
            ]);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($httpCode === 200) {
                return json_decode($response, true);
            }
            
            throw new Exception("Erro ao listar arquivos: HTTP {$httpCode}");
            
        } catch (Exception $e) {
            LogHelper::error('Erro ao listar arquivos', [
                'empresa_id' => $empresaId,
                'erro' => $e->getMessage()
            ]);
            return [];
        }
    }
}
```

### **Integração no NFCeService.php:**

```php
/**
 * Salva arquivos XML e PDF no Supabase Storage
 */
private function salvarArquivos($xml, $chave, $empresaId)
{
    try {
        $storage = new SupabaseStorageHelper();
        $arquivos = [];
        
        // Salvar XML
        $resultadoXml = $storage->salvarXML($xml, $chave, $empresaId, 'nfce');
        if ($resultadoXml['sucesso']) {
            $arquivos['xml'] = $resultadoXml;
        }
        
        // Gerar e salvar cupom HTML
        $cupomHtml = $this->gerarCupomHTML($chave, $empresaId);
        $resultadoCupom = $storage->salvarPDF($cupomHtml, $chave, $empresaId, 'nfce');
        if ($resultadoCupom['sucesso']) {
            $arquivos['cupom'] = $resultadoCupom;
        }
        
        LogHelper::info('Arquivos salvos no Supabase Storage', [
            'chave' => $chave,
            'arquivos' => array_keys($arquivos)
        ]);
        
        return $arquivos;
        
    } catch (Exception $e) {
        LogHelper::error('Erro ao salvar arquivos', [
            'chave' => $chave,
            'erro' => $e->getMessage()
        ]);
        return [];
    }
}
```

---

## 🎯 **Opção 2: VPS Local (Alternativa)**

### **Vantagens:**
- ✅ **Controle total** dos arquivos
- ✅ **Acesso rápido** local
- ✅ **Sem dependência** externa

### **Desvantagens:**
- ❌ **Backup manual** necessário
- ❌ **Escalabilidade limitada**
- ❌ **Ponto único** de falha
- ❌ **Gerenciamento complexo**

### **Estrutura VPS:**
```
/var/www/nfe-storage/
├── empresa-123/
│   ├── nfe/
│   │   ├── 2024/
│   │   │   └── 12/
│   │   │       ├── xml/
│   │   │       └── pdf/
│   └── nfce/
│       ├── 2024/
│       │   └── 12/
│       │       ├── xml/
│       │       └── cupom/
```

---

## 📊 **Comparação das Opções:**

| Aspecto | Supabase Storage | VPS Local |
|---------|------------------|-----------|
| **Backup** | ✅ Automático | ❌ Manual |
| **Escalabilidade** | ✅ Ilimitada | ❌ Limitada |
| **Acesso Frontend** | ✅ Direto | ❌ Via API |
| **Custo** | ✅ Incluído | ❌ Storage extra |
| **Manutenção** | ✅ Zero | ❌ Alta |
| **Segurança** | ✅ Gerenciada | ❌ Manual |
| **CDN** | ✅ Integrado | ❌ Não |

---

## 🚀 **Implementação Recomendada:**

### **Fase 1: Supabase Storage**
1. **Configurar bucket** `documentos-fiscais`
2. **Implementar SupabaseStorageHelper**
3. **Integrar nos services** NFe/NFC-e
4. **Testar upload/download**

### **Fase 2: Interface Frontend**
1. **Botões download** XML/PDF
2. **Visualização inline** de cupoms
3. **Histórico de documentos**
4. **Filtros por período**

### **Fase 3: Otimizações**
1. **Cache local** temporário
2. **Compressão** de arquivos
3. **Limpeza automática** arquivos antigos
4. **Relatórios** de uso

---

## ⚙️ **Configurações Necessárias:**

### **Supabase Storage:**
```sql
-- Criar bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documentos-fiscais', 'documentos-fiscais', false);

-- Políticas de acesso
CREATE POLICY "Empresas podem acessar seus documentos" ON storage.objects
FOR ALL USING (
  bucket_id = 'documentos-fiscais' AND 
  (storage.foldername(name))[1] = 'empresa-' || auth.jwt() ->> 'empresa_id'
);
```

### **Variáveis Ambiente (.env):**
```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua-service-key-aqui
STORAGE_BUCKET=documentos-fiscais
```

---

## 📝 **Conclusão:**

**Recomendação: Usar Supabase Storage** para armazenamento de XML e PDF, pois oferece:

✅ **Integração perfeita** com o sistema existente  
✅ **Backup e segurança** automáticos  
✅ **Escalabilidade** sem limites  
✅ **Acesso direto** do frontend  
✅ **Custo-benefício** excelente  

Os arquivos ficam **seguros, organizados e acessíveis** tanto para o sistema quanto para os usuários finais!
