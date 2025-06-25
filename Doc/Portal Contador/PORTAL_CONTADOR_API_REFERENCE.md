# Portal do Contador - Referência de APIs

## 📡 **ENDPOINTS DISPONÍVEIS**

### **1. Listagem de Estrutura de Arquivos**

**URL:** `POST /backend/public/contador-portal.php`

**Payload:**
```json
{
  "action": "listar_estrutura",
  "empresa_id": "acd26a4f-7220-405e-9c96-faffb7e6480e",
  "ambiente": "homologacao",  // "producao", "homologacao", "todos"
  "modelo": "55"              // "55", "65", "todos"
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "Autorizados": {
      "tipo": "Autorizados",
      "anos": [
        {
          "ano": 2025,
          "meses": [
            {
              "mes": "06",
              "nome_mes": "Junho",
              "total_arquivos": 1,
              "path": "../storage/xml/empresa_acd26a4f-7220-405e-9c96-faffb7e6480e/homologacao/55/Autorizados/2025/06"
            }
          ],
          "total_arquivos": 1
        }
      ],
      "total_arquivos": 1
    }
  }
}
```

### **2. Download de Arquivos ZIP**

**URL:** `POST /backend/public/contador-download.php`

**Payload:**
```json
{
  "action": "download_mes_completo",
  "empresa_id": "acd26a4f-7220-405e-9c96-faffb7e6480e",
  "ano": "2025",
  "mes": "06",
  "modelo": "55",             // "55", "65", "todos"
  "ambiente": "homologacao"   // "producao", "homologacao", "todos"
}
```

**Resposta:** Arquivo ZIP binário ou JSON de erro

**Estrutura do ZIP:**
```
ambiente/modelo/tipo/arquivo.xml
RELATORIO_MES_ANO_MODELO.txt
```

### **3. Busca de Empresa**

**URL:** `POST /backend/public/contador-portal.php`

**Payload:**
```json
{
  "action": "buscar_empresa",
  "cnpj": "24163237000151"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "acd26a4f-7220-405e-9c96-faffb7e6480e",
    "nome": "EMANUEL LUIS PEREIRA SOUZA VALESIS INFORMATICA",
    "razao_social": "EMANUEL LUIS PEREIRA SOUZA VALESIS INFORMATICA",
    "nome_fantasia": "DISTRIBUIDORA EXEMPLO"
  }
}
```

---

## 🗂️ **ESTRUTURA DE DADOS**

### **Formato de Resposta da Listagem:**

```typescript
interface EstruturaResposta {
  success: boolean;
  data: {
    [tipo: string]: {
      tipo: string;
      anos: Array<{
        ano: number;
        meses: Array<{
          mes: string;
          nome_mes: string;
          total_arquivos: number;
          path: string;
        }>;
        total_arquivos: number;
      }>;
      total_arquivos: number;
    };
  };
}
```

### **Formato do Frontend (FileExplorer):**

```typescript
interface EstruturaAno {
  ano: number;
  meses: Array<{
    mes: string;
    nome_mes: string;
    tipos: {
      Autorizados: number;
      Cancelados: number;
      CCe: number;
    };
    total_arquivos: number;
    path: string;
  }>;
  total_arquivos: number;
}
```

---

## 🔄 **FLUXO DE DADOS**

### **1. Busca de Empresa:**
```
Frontend → contador-portal.php → Validação CNPJ → Retorna dados da empresa
```

### **2. Listagem de Arquivos:**
```
Frontend → contador-portal.php → Busca em storage/xml → Organiza por estrutura → Retorna JSON
```

### **3. Download de ZIP:**
```
Frontend → contador-download.php → Coleta arquivos → Gera ZIP → Cria relatório → Retorna arquivo
```

---

## 🛠️ **FUNÇÕES PRINCIPAIS DO BACKEND**

### **contador-portal.php:**

```php
// Função principal de listagem
function listarEstrutura($input) {
    $empresaId = $input['empresa_id'];
    $ambiente = $input['ambiente'] ?? 'todos';
    $modelo = $input['modelo'] ?? 'todos';
    
    // Determina ambientes e modelos para busca
    $ambientes = $ambiente === 'todos' ? ['producao', 'homologacao'] : [$ambiente];
    $modelos = $modelo === 'todos' ? ['55', '65'] : [$modelo];
    
    // Busca arquivos e organiza estrutura
    foreach ($ambientes as $amb) {
        foreach ($modelos as $mod) {
            $basePath = "../storage/xml/empresa_{$empresaId}/{$amb}/{$mod}";
            // Processa tipos: Autorizados, Cancelados, CCe
        }
    }
}
```

### **contador-download.php:**

```php
// Função de download completo
function downloadMesCompleto($input) {
    // Cria ZIP temporário
    $zip = new ZipArchive();
    
    // Adiciona arquivos por ambiente/modelo/tipo
    foreach ($ambientes as $amb) {
        foreach ($tipos as $tipo) {
            $tipoPath = "{$basePath}/{$modelo}/{$tipo}/{$ano}/{$mes}";
            $xmlFiles = glob("{$tipoPath}/*.xml");
            
            foreach ($xmlFiles as $xmlFile) {
                $filename = "{$amb}/{$modelo}/{$tipo}/" . basename($xmlFile);
                $zip->addFile($xmlFile, $filename);
            }
        }
    }
    
    // Adiciona relatório
    $relatorio = gerarRelatorioMesCompletoMultiAmbiente(...);
    $zip->addFromString('RELATORIO_...txt', $relatorio);
}
```

---

## 📊 **GERAÇÃO DE RELATÓRIOS**

### **Função de Extração de Dados XML:**

```php
function extrairDadosXML($xmlFile) {
    $xmlContent = file_get_contents($xmlFile);
    $xml = simplexml_load_string($xmlContent);
    
    $dados = ['numero' => 'N/A', 'valor' => 0];
    
    // Método 1: Acesso direto
    if (isset($xml->infNFe->ide->nNF)) {
        $dados['numero'] = (string)$xml->infNFe->ide->nNF;
    }
    if (isset($xml->infNFe->total->ICMSTot->vNF)) {
        $dados['valor'] = (float)$xml->infNFe->total->ICMSTot->vNF;
    }
    
    // Método 2: XPath
    if ($dados['numero'] === 'N/A') {
        $numeroNodes = $xml->xpath('//nNF');
        if (!empty($numeroNodes)) {
            $dados['numero'] = (string)$numeroNodes[0];
        }
    }
    
    // Método 3: Regex (fallback)
    if ($dados['numero'] === 'N/A') {
        if (preg_match('/<nNF>(\d+)<\/nNF>/', $xmlContent, $matches)) {
            $dados['numero'] = $matches[1];
        }
    }
    
    return $dados;
}
```

### **Estrutura do Relatório:**

```
RELATÓRIO NFe MODELO 55 DE XMLs - HOMOLOGACAO
Período: Junho/2025
Filtro: NFe Modelo 55
Data de geração: 25/06/2025 17:37:27
================================================================================

=== AMBIENTE: HOMOLOGACAO ===

--- Autorizados ---
Total: 1 arquivos
Número      Arquivo                                  Valor (R$)      Tamanho      Data
--------------------------------------------------------------------------------
100         arquivo.xml                              R$ 5,00         6.26 KB      25/06/2025 16:36:54
--------------------------------------------------------------------------------
TOTAL Autorizados: 1 arquivos - R$ 5,00

RESUMO GERAL:
Total de arquivos: 1
Valor total das NFe Autorizadas: R$ 5,00
================================================================================
```

---

## 🔧 **CONFIGURAÇÕES E CONSTANTES**

### **Tipos de Documentos:**
```php
$tipos = ['Autorizados', 'Cancelados', 'CCe'];
```

### **Modelos Suportados:**
```php
$modelos = ['55', '65']; // NFe e NFC-e
```

### **Ambientes:**
```php
$ambientes = ['producao', 'homologacao'];
```

### **Estrutura de Pastas Base:**
```php
$basePath = "../storage/xml/empresa_{$empresaId}/{$ambiente}/{$modelo}";
```

---

## 🚨 **CÓDIGOS DE ERRO**

### **Erros Comuns:**

| Código | Mensagem | Causa |
|--------|----------|-------|
| 400 | "Ação não especificada" | Action não enviada |
| 400 | "Parâmetros obrigatórios não informados" | Faltam empresa_id, ano, mes |
| 404 | "Empresa não encontrada" | CNPJ não existe no mapeamento |
| 500 | "Pasta da empresa não encontrada" | Estrutura de pastas incorreta |
| 500 | "Nenhum arquivo XML encontrado" | Não há arquivos no período |
| 500 | "Erro ao criar arquivo ZIP" | Problema com ZipArchive |

### **Tratamento de Erros:**

```php
try {
    // Operação
} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
```

---

## 🧪 **TESTES E VALIDAÇÃO**

### **Comandos de Teste:**

```bash
# Testar listagem
curl -X POST "http://nexodev.emasoftware.app/backend/public/contador-portal.php" \
  -H "Content-Type: application/json" \
  -d '{"action":"listar_estrutura","empresa_id":"acd26a4f-7220-405e-9c96-faffb7e6480e","ambiente":"homologacao","modelo":"55"}'

# Testar download
curl -X POST "http://nexodev.emasoftware.app/backend/public/contador-download.php" \
  -H "Content-Type: application/json" \
  -d '{"action":"download_mes_completo","empresa_id":"acd26a4f-7220-405e-9c96-faffb7e6480e","ano":"2025","mes":"06","modelo":"55","ambiente":"homologacao"}' \
  --output teste.zip

# Verificar ZIP
unzip -l teste.zip
```

### **Validações Importantes:**

1. **Estrutura de pastas existe?**
2. **Permissões de leitura corretas?**
3. **Arquivos XML válidos?**
4. **ZipArchive habilitado no PHP?**
5. **Espaço em disco suficiente?**

---

## 📈 **PERFORMANCE E OTIMIZAÇÃO**

### **Pontos de Atenção:**

1. **Cache de listagem:** Considerar cache para estruturas grandes
2. **Limite de arquivos:** ZIPs muito grandes podem causar timeout
3. **Memória PHP:** Ajustar memory_limit se necessário
4. **Timeout:** Ajustar max_execution_time para downloads grandes

### **Configurações Recomendadas:**

```ini
; php.ini
memory_limit = 512M
max_execution_time = 300
upload_max_filesize = 100M
post_max_size = 100M
```
