# 📞 Templates de Comunicação com IA do Servidor

## 🎯 Objetivo
Templates padronizados para comunicação eficiente com a IA responsável pelo servidor apinfe.nexopdv.com, evitando reexplicações e garantindo contexto completo.

## 🔧 Template Geral de Problema

```
🔧 PROBLEMA: [Título claro e específico]

📋 CONTEXTO:
- Sistema: NFe/NFC-e SaaS Multi-tenant
- Frontend: React localhost:5173
- API: apinfe.nexopdv.com (PHP + NFePHP)
- Database: Supabase PostgreSQL

🎯 ENDPOINT AFETADO:
[GET/POST] /api/[endpoint]

📤 DADOS ENVIADOS:
```json
{
  // JSON completo da requisição
}
```

❌ ERRO OBSERVADO:
[Logs específicos, códigos de erro, comportamento inesperado]

✅ RESULTADO ESPERADO:
[Descrição clara do que deveria acontecer]

🧪 TESTE SUGERIDO:
```bash
curl -X POST https://apinfe.nexopdv.com/api/[endpoint] \
  -H "Content-Type: application/json" \
  -d '[json_data]'
```

🔍 VERIFICAÇÕES NECESSÁRIAS:
- [ ] Logs PHP: tail -f /var/log/nginx/error.log
- [ ] Configuração nginx
- [ ] Extensões PHP necessárias
- [ ] Estrutura de resposta
```

## 🐛 Template para Debug de XML

```
🐛 URGENTE: API /api/gerar-nfe retorna success mas sem XML

📋 SITUAÇÃO ATUAL:
- Request: Enviado com dados completos ✅
- Response: { "success": true, "data": {...} } ✅  
- Problema: data.xml e data.chave são undefined ❌

📤 DADOS COMPLETOS ENVIADOS:
```json
{
  "empresa": {
    "id": "uuid",
    "cnpj": "12345678000195",
    "name": "Empresa Teste"
  },
  "destinatario": {
    "documento": "12345678901",
    "nome": "Cliente Teste"
  },
  "produtos": [
    {
      "codigo": "001",
      "descricao": "Produto Teste",
      "quantidade": 1,
      "valor_unitario": 100.00
    }
  ]
}
```

🔍 VERIFICAÇÕES URGENTES:
1. **Logs PHP**: `tail -f /var/log/nginx/error.log`
2. **NFePHP**: Se biblioteca está gerando XML corretamente
3. **Response Structure**: Se campos estão sendo retornados
4. **Debug**: Adicionar var_dump() no retorno da API

✅ ESTRUTURA ESPERADA:
```json
{
  "success": true,
  "data": {
    "xml": "<?xml version='1.0' encoding='UTF-8'?>...",
    "chave": "35250512345678000195550010000000011234567890",
    "numero_nfe": 1
  }
}
```

⚡ PRIORIDADE: CRÍTICA - Sistema bloqueado
```

## 🌐 Template para Problemas CORS

```
🌐 PROBLEMA CORS: Bloqueio de requisições do frontend

❌ ERRO OBSERVADO:
```
Access to fetch at 'https://apinfe.nexopdv.com/api/[endpoint]' 
from origin 'http://localhost:5173' has been blocked by CORS policy
```

🔧 CONFIGURAÇÃO NGINX NECESSÁRIA:
```nginx
server {
    listen 443 ssl;
    server_name apinfe.nexopdv.com;
    
    # Headers CORS obrigatórios
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
    add_header 'Access-Control-Allow-Headers' 'Origin, Content-Type, Accept, Authorization' always;
    
    # Preflight requests
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' '*';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE';
        add_header 'Access-Control-Allow-Headers' 'Origin, Content-Type, Accept, Authorization';
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Type' 'text/plain; charset=utf-8';
        add_header 'Content-Length' 0;
        return 204;
    }
}
```

🧪 TESTE APÓS CONFIGURAR:
```bash
curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://apinfe.nexopdv.com/api/status
```

✅ RESPOSTA ESPERADA:
Headers incluindo Access-Control-Allow-Origin: *
```

## 🔐 Template para Problemas de Certificado

```
🔐 PROBLEMA: Certificado digital não está sendo processado

📋 CONTEXTO:
- Certificado: Armazenado no Supabase Storage
- Formato: PKCS#12 (.p12)
- Envio: Base64 via API junto com senha

📤 DADOS ENVIADOS:
```json
{
  "certificado": {
    "arquivo": "base64_encoded_p12_file",
    "senha": "senha_do_certificado"
  },
  "nfe_data": { ... }
}
```

🔍 VERIFICAÇÕES NECESSÁRIAS:
1. **Extensões PHP**: openssl, zip habilitadas
2. **Decodificação**: Base64 → arquivo temporário
3. **Validação**: Senha correta do certificado
4. **NFePHP**: Configuração do certificado na biblioteca

💡 CÓDIGO PHP SUGERIDO:
```php
// Decodificar certificado
$certificadoData = base64_decode($request['certificado']['arquivo']);
$tempFile = tempnam(sys_get_temp_dir(), 'cert_') . '.p12';
file_put_contents($tempFile, $certificadoData);

// Configurar NFePHP
$config = [
    'atualizacao' => date('Y-m-d H:i:s'),
    'tpAmb' => $ambiente,
    'razaosocial' => $empresa['name'],
    'cnpj' => $empresa['cnpj'],
    'siglaUF' => $empresa['uf'],
    'schemes' => 'PL_009_V4',
    'versao' => '4.00',
    'tokenIBPT' => '',
    'CSC' => '',
    'CSCid' => ''
];

$nfe = new NFePHP\NFe\Make();
$nfe->loadSoapClass($certificadoPath, $certificadoSenha);
```
```

## ⚡ Template para Problemas de Performance

```
⚡ PROBLEMA: Timeout ou lentidão na API

📊 MÉTRICAS OBSERVADAS:
- Endpoint: /api/[endpoint]
- Tempo resposta: [X] segundos
- Timeout configurado: [Y] segundos
- Tamanho request: [Z] KB

🔍 INVESTIGAÇÕES NECESSÁRIAS:
1. **Logs de Performance**: Tempo de execução PHP
2. **Recursos**: CPU, memória, disco
3. **Rede**: Latência para SEFAZ
4. **Database**: Queries lentas

🔧 OTIMIZAÇÕES SUGERIDAS:
```php
// Aumentar limites PHP
ini_set('max_execution_time', 300);
ini_set('memory_limit', '256M');

// Cache de certificados
$certificadoCache = '/tmp/cert_' . md5($empresa_id) . '.p12';

// Timeout SEFAZ
$soap->timeout = 60;
```

📈 MONITORAMENTO:
```bash
# CPU e memória
top -p $(pgrep php-fpm)

# Logs de performance
tail -f /var/log/nginx/access.log | grep "api/"

# Conexões ativas
netstat -an | grep :443 | wc -l
```
```

## 🗄️ Template para Problemas de Banco

```
🗄️ PROBLEMA: Erro de banco de dados

❌ ERRO SQL:
[Mensagem específica do erro]

📋 CONTEXTO:
- Operação: INSERT/UPDATE/SELECT
- Tabela: [nome_da_tabela]
- Dados: [dados sendo processados]

🔍 VERIFICAÇÕES:
1. **Campos obrigatórios**: Todos preenchidos?
2. **Tipos de dados**: Compatíveis com schema?
3. **Constraints**: Foreign keys válidas?
4. **Permissions**: RLS configurado?

💡 QUERY SUGERIDA:
```sql
-- Verificar estrutura
\d+ nome_da_tabela

-- Testar inserção
INSERT INTO nome_da_tabela (campo1, campo2) 
VALUES ('valor1', 'valor2');

-- Verificar constraints
SELECT * FROM information_schema.table_constraints 
WHERE table_name = 'nome_da_tabela';
```

🔧 SOLUÇÃO COMUM:
- Adicionar campos obrigatórios faltando
- Ajustar tipos de dados
- Verificar RLS policies
```

## 📝 Template para Logs e Debug

```
📝 SOLICITAÇÃO: Ativar logs detalhados para debug

🎯 OBJETIVO:
Identificar exatamente onde está falhando o processo de [operação]

🔧 LOGS NECESSÁRIOS:
1. **PHP Error Log**: Erros e warnings
2. **NFePHP Debug**: Saída da biblioteca
3. **Request/Response**: Dados completos
4. **SEFAZ Communication**: Requisições para SEFAZ

💡 CÓDIGO SUGERIDO:
```php
// Ativar debug
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', '/var/log/php_errors.log');

// Log personalizado
function debugLog($message, $data = null) {
    $log = date('Y-m-d H:i:s') . ' - ' . $message;
    if ($data) {
        $log .= ' - ' . json_encode($data);
    }
    error_log($log, 3, '/var/log/nfe_debug.log');
}

// Usar nos pontos críticos
debugLog('Iniciando geração NFe', $requestData);
debugLog('XML gerado', ['xml_size' => strlen($xml)]);
debugLog('Resposta SEFAZ', $sefazResponse);
```

📊 MONITORAMENTO:
```bash
# Acompanhar logs em tempo real
tail -f /var/log/php_errors.log
tail -f /var/log/nfe_debug.log
tail -f /var/log/nginx/error.log
```
```

## 🚀 Template para Deploy e Configuração

```
🚀 DEPLOY: Configuração de ambiente para NFe

📋 CHECKLIST DE CONFIGURAÇÃO:

### 1. Extensões PHP
```bash
php -m | grep -E "(openssl|curl|xml|zip|mbstring)"
```

### 2. Configuração php.ini
```ini
max_execution_time = 300
memory_limit = 256M
upload_max_filesize = 10M
post_max_size = 10M
```

### 3. Nginx CORS
```nginx
add_header 'Access-Control-Allow-Origin' '*' always;
add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
add_header 'Access-Control-Allow-Headers' 'Content-Type' always;
```

### 4. Permissões
```bash
chown -R www-data:www-data /var/www/apinfe
chmod -R 755 /var/www/apinfe
chmod -R 777 /tmp
```

### 5. SSL Certificate
```bash
certbot --nginx -d apinfe.nexopdv.com
```

### 6. Firewall
```bash
ufw allow 80
ufw allow 443
ufw allow 22
```

✅ TESTE FINAL:
```bash
curl -X GET https://apinfe.nexopdv.com/api/status
```
```
