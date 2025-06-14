# 🚨 Problemas Resolvidos - Sistema NFC-e

## 🎯 **HISTÓRICO DE PROBLEMAS E SOLUÇÕES**

Este documento detalha todos os problemas enfrentados durante a implementação do sistema NFC-e e suas respectivas soluções. **FUNDAMENTAL para evitar retrabalho!**

---

## ❌ **PROBLEMA 1: Busca de Dados da Empresa**

### **Erro Inicial:**
```
❌ Backend tentava buscar dados da empresa internamente via HTTP
❌ Causava erro 500 e timeout
❌ Violava o padrão da NFe que já funcionava
```

### **Código Problemático:**
```php
// ❌ ERRADO - Backend fazendo busca HTTP interna
$empresaUrl = "{$supabaseUrl}/rest/v1/empresas?id=eq.{$empresaId}";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $empresaUrl);
// ... mais código de busca HTTP
```

### **✅ Solução Implementada:**
```php
// ✅ CORRETO - Usar dados do payload (igual à NFe)
$empresa = $nfceData['empresa']; // Dados vêm do frontend
```

### **Frontend Atualizado:**
```typescript
// Frontend busca e envia dados completos
const { data: empresaData } = await supabase
  .from('empresas')
  .select('*')
  .eq('id', usuarioData.empresa_id)
  .single();

const nfceData = {
  empresa: empresaData, // ✅ Dados completos da empresa
  ambiente: nfeConfigData.ambiente,
  // ... resto dos dados
};
```

---

## ❌ **PROBLEMA 2: Estrutura do Payload**

### **Erro Inicial:**
```
❌ Perdemos MUITO tempo tentando descobrir como acessar dados no backend
❌ Não sabíamos a estrutura correta do payload
❌ Tentativas de acesso incorretas causavam erros fatais
```

### **Descoberta da Estrutura Correta:**
```php
// ✅ ESTRUTURA CORRETA DO PAYLOAD:
{
  "empresa_id": "uuid-da-empresa",
  "nfce_data": {
    "empresa": {
      "razao_social": "...",
      "cnpj": "...",
      "uf": "...",
      // ... todos os dados da empresa
    },
    "ambiente": "homologacao|producao",
    "identificacao": {
      "numero": 123,
      "serie": 1,
      // ... dados da NFC-e
    },
    "produtos": [
      {
        "codigo": "...",
        "descricao": "...",
        // ... dados dos produtos
      }
    ]
  }
}
```

### **Acesso Correto no Backend:**
```php
// ✅ COMO ACESSAR OS DADOS:
$nfceData = json_decode(file_get_contents('php://input'), true)['nfce_data'];
$empresa = $nfceData['empresa'];           // Dados da empresa
$ambiente = $nfceData['ambiente'];         // Ambiente (homologacao/producao)
$produtos = $nfceData['produtos'];         // Array de produtos
$identificacao = $nfceData['identificacao']; // Dados da NFC-e
```

---

## ❌ **PROBLEMA 3: Modo de Envio SEFAZ**

### **Erro SEFAZ:**
```
❌ Status 452: "Solicitada resposta assíncrona para Lote com somente 1 (uma) NFC-e"
❌ NFC-e com 1 documento deve usar modo SÍNCRONO
❌ Estávamos usando modo assíncrono (igual à NFe)
```

### **Código Problemático:**
```php
// ❌ ERRADO - Modo assíncrono para NFC-e
$response = $tools->sefazEnviaLote([$xmlAssinado], 1);
```

### **✅ Solução Implementada:**
```php
// ✅ CORRETO - Modo síncrono para NFC-e
$response = $tools->sefazEnviaLote([$xmlAssinado], 1, 1); // indSinc=1
```

### **Processamento de Resposta Síncrona:**
```php
// ✅ No modo síncrono, protocolo vem na resposta direta
$protNFeNodes = $dom->getElementsByTagName('protNFe');
if ($protNFeNodes->length > 0) {
    $protNFe = $protNFeNodes->item(0);
    $infProtNodes = $protNFe->getElementsByTagName('infProt');
    
    if ($infProtNodes->length > 0) {
        $infProt = $infProtNodes->item(0);
        $statusNFeNode = $infProt->getElementsByTagName('cStat')->item(0);
        $status = $statusNFeNode ? $statusNFeNode->nodeValue : 'STATUS_NAO_ENCONTRADO';
    }
}
```

---

## ❌ **PROBLEMA 4: Código UF Incorreto**

### **Erro SEFAZ:**
```
❌ "cUF incorreto! [0] não existe"
❌ Campo codigo_uf não existia na tabela empresas
❌ Estava sendo passado valor 0 ou null
```

### **Código Problemático:**
```typescript
// ❌ ERRADO - Campo inexistente
codigo_uf: empresaData.codigo_uf, // Campo não existe!
```

### **✅ Solução Implementada:**
```typescript
// ✅ CORRETO - Calcular a partir do estado
const getCodigoUF = (estado: string): number => {
  const codigosUF: { [key: string]: number } = {
    'AC': 12, 'AL': 17, 'AP': 16, 'AM': 13, 'BA': 29, 'CE': 23, 'DF': 53,
    'ES': 32, 'GO': 52, 'MA': 21, 'MT': 51, 'MS': 50, 'MG': 31, 'PA': 15,
    'PB': 25, 'PR': 41, 'PE': 26, 'PI': 22, 'RJ': 33, 'RN': 24, 'RS': 43,
    'RO': 11, 'RR': 14, 'SC': 42, 'SP': 35, 'SE': 28, 'TO': 27
  };
  return codigosUF[estado] || 35; // Default SP
};

// Uso correto:
codigo_uf: getCodigoUF(empresaData.estado),
```

---

## ❌ **PROBLEMA 5: Atributo nItem Vazio**

### **Erro de Validação XML:**
```
❌ "Element 'det', attribute 'nItem': The value '' is not accepted by the pattern"
❌ Tag <det> precisa do atributo nItem com valor numérico
❌ Biblioteca sped-nfe não estava recebendo esse valor
```

### **Código Problemático:**
```php
// ❌ ERRADO - nItem não definido
$std = new stdClass();
$std->cProd = $produto['codigo'];
// ... outros campos, mas sem nItem
```

### **✅ Solução Implementada:**
```php
// ✅ CORRETO - Definir nItem para a tag <det>
$std = new stdClass();
$std->item = $nItem; // ✅ CRÍTICO: Define nItem para <det nItem="1">
$std->cProd = $produto['codigo'];
// ... resto dos campos
```

---

## ❌ **PROBLEMA 6: Campo ambiente_codigo vs ambiente**

### **Erro de Query:**
```
❌ GET /nfe_config?select=ambiente_codigo - 400 Bad Request
❌ Campo ambiente_codigo não existe na tabela
❌ Campo correto é 'ambiente' (text)
```

### **Código Problemático:**
```typescript
// ❌ ERRADO - Campo inexistente
.select('ambiente_codigo')
```

### **✅ Solução Implementada:**
```typescript
// ✅ CORRETO - Campo que existe
.select('ambiente')

// Uso correto:
ambiente: nfeConfigData.ambiente, // 'homologacao' ou 'producao'
```

---

## ❌ **PROBLEMA 7: Status 104 vs Status Individual**

### **Erro de Interpretação:**
```
❌ "Status 104: Lote processado" sendo tratado como erro
❌ Status 104 significa que o LOTE foi processado (OK)
❌ Precisava verificar status INDIVIDUAL da NFC-e
```

### **Código Problemático:**
```php
// ❌ ERRADO - Verificar apenas status do lote
$status = $dom->getElementsByTagName('cStat')->item(0)->nodeValue;
if ($status !== '100') {
    throw new Exception("Erro: Status {$status}");
}
```

### **✅ Solução Implementada:**
```php
// ✅ CORRETO - Verificar status individual da NFC-e
$statusLote = $dom->getElementsByTagName('cStat')->item(0)->nodeValue; // 104 = OK

// Buscar status individual dentro de protNFe
$protNFeNodes = $dom->getElementsByTagName('protNFe');
if ($protNFeNodes->length > 0) {
    $protNFe = $protNFeNodes->item(0);
    $infProtNodes = $protNFe->getElementsByTagName('infProt');
    
    if ($infProtNodes->length > 0) {
        $infProt = $infProtNodes->item(0);
        $statusNFeNode = $infProt->getElementsByTagName('cStat')->item(0);
        $status = $statusNFeNode ? $statusNFeNode->nodeValue : 'STATUS_NAO_ENCONTRADO';
        
        // Agora sim verificar se foi autorizada (100)
        if ($status !== '100') {
            throw new Exception("NFC-e rejeitada - Status {$status}");
        }
    }
}
```

---

## ❌ **PROBLEMA 8: Tratamento de Erro no Frontend**

### **Erro de UX:**
```
❌ Frontend mostrando "Erro HTTP 500: Internal Server Error" genérico
❌ Erro específico estava no JSON mas não sendo exibido
❌ Usuário não sabia qual era o problema real
```

### **Código Problemático:**
```typescript
// ❌ ERRADO - Catch aninhado sobrescrevendo erro específico
catch (jsonError) {
  throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
}
```

### **✅ Solução Implementada:**
```typescript
// ✅ CORRETO - Mostrar mensagem específica do backend
try {
  const errorJson = JSON.parse(errorResponse);
  const mensagemErro = errorJson.error || errorJson.message || 'Erro desconhecido';
  throw new Error(mensagemErro); // Mensagem específica!
} catch (jsonError) {
  if (jsonError instanceof Error && jsonError.message.includes('Status')) {
    throw jsonError; // Re-lançar erro específico
  }
  // Fallback apenas se não conseguir fazer parse
}
```

---

## 🎯 **LIÇÕES APRENDIDAS CRÍTICAS**

### **1. SEMPRE seguir o padrão da NFe:**
- ✅ NFe funciona = usar mesma estrutura
- ✅ Dados vêm do frontend, não buscar no backend
- ✅ Payload idêntico, apenas modelo diferente

### **2. Modo de envio SEFAZ:**
- ✅ NFe = Assíncrono (múltiplos documentos)
- ✅ NFC-e = Síncrono (1 documento)

### **3. Validação de campos:**
- ✅ Sempre verificar se campos existem no banco
- ✅ Calcular valores derivados (codigo_uf a partir de estado)
- ✅ Validar estrutura XML antes de enviar

### **4. Tratamento de erros:**
- ✅ Mostrar mensagens específicas do SEFAZ
- ✅ Não sobrescrever erros com mensagens genéricas
- ✅ Logs detalhados para debug

### **5. Estrutura de dados:**
- ✅ Documentar estrutura do payload
- ✅ Testar acesso aos dados antes de implementar
- ✅ Seguir convenções existentes

---

## 🔍 **COMANDOS DE DEBUG ÚTEIS**

### **1. Verificar estrutura do payload:**
```php
error_log("📋 PAYLOAD RECEBIDO: " . json_encode($_POST));
error_log("📋 NFCE_DATA: " . json_encode($nfceData));
error_log("📋 EMPRESA: " . json_encode($nfceData['empresa']));
```

### **2. Verificar resposta SEFAZ:**
```php
error_log("📡 RESPOSTA SEFAZ: " . $response);
error_log("📋 STATUS LOTE: " . $statusLote);
error_log("📋 STATUS NFCE: " . $status);
```

### **3. Verificar campos do banco:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'empresas' 
AND column_name LIKE '%codigo%';
```

---

**🚨 DOCUMENTAÇÃO DE PROBLEMAS COMPLETA**

**Objetivo:** Evitar que os mesmos erros sejam cometidos novamente
**Status:** ✅ Todos os problemas resolvidos e documentados
**Última Atualização:** 13/06/2025
