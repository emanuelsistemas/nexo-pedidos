# 🔧 Problemas Conhecidos e Soluções

## 🌐 Problemas CORS

### Problema Recorrente
```
Access to fetch at 'https://apinfe.nexopdv.com' from origin 'http://localhost:5173' 
has been blocked by CORS policy
```

### Solução no Servidor (nginx)
```nginx
# /etc/nginx/sites-available/apinfe.nexopdv.com
server {
    listen 443 ssl;
    server_name apinfe.nexopdv.com;
    
    # Headers CORS
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

### Template para IA do Servidor
```
🔧 CONFIGURAÇÃO CORS NECESSÁRIA

Preciso que você configure o CORS no servidor apinfe.nexopdv.com para permitir:

1. Origin: http://localhost:5173 (desenvolvimento)
2. Methods: GET, POST, OPTIONS, PUT, DELETE
3. Headers: Origin, Content-Type, Accept, Authorization

Configuração nginx sugerida:
[incluir configuração acima]

Teste após configurar:
curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://apinfe.nexopdv.com/api/status
```

## 🔑 Problemas de Autenticação

### Problema: Token API Removido
- **Situação**: API estava exigindo token de autenticação
- **Solução**: Token removido temporariamente para desenvolvimento
- **Status**: Funcional sem autenticação

### Configuração Futura
```php
// Quando reativar autenticação
$headers = getallheaders();
if (!isset($headers['Authorization'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Token required']);
    exit;
}
```

## 📄 Problemas de Geração XML

### Problema Atual: XML/Chave Undefined
```javascript
// Logs mostram:
// XML presente: NÃO
// Chave presente: NÃO
// Resposta da API: success: true, data: presente: SIM
```

### Debug Implementado
```typescript
// Logs detalhados adicionados
addLog('📄 Resposta da API de geração:');
addLog(`   Success: ${result.success}`);
addLog(`   Data presente: ${result.data ? 'SIM' : 'NÃO'}`);
addLog(`   XML presente: ${result.data.xml ? 'SIM' : 'NÃO'}`);
addLog(`   Chave presente: ${result.data.chave ? 'SIM' : 'NÃO'}`);
```

### Template para IA do Servidor
```
🐛 PROBLEMA: API RETORNA SUCCESS MAS SEM XML/CHAVE

A API /api/gerar-nfe está retornando:
- success: true
- data: presente
- Mas data.xml e data.chave estão undefined

Dados enviados:
[incluir dados completos da requisição]

Verifique:
1. Se a biblioteca NFePHP está gerando o XML corretamente
2. Se os campos estão sendo retornados no response
3. Se há erros no log do PHP
4. Se a estrutura de retorno está correta

Estrutura esperada:
{
  "success": true,
  "data": {
    "xml": "<?xml version='1.0'...",
    "chave": "35250512345678000195550010000000011234567890",
    "numero_nfe": 1
  }
}
```

## 🗄️ Problemas de Banco de Dados

### Campos Obrigatórios Faltando
```sql
-- Erro comum: campos obrigatórios não preenchidos
INSERT INTO pdv (empresa_id, usuario_id, ...) -- usuario_id era obrigatório
```

### Solução: Validação Prévia
```typescript
// Sempre verificar campos obrigatórios
const { data: userData } = await supabase.auth.getUser();
if (!userData.user) {
  throw new Error('Usuário não autenticado');
}
```

## 🔧 Problemas de Configuração PHP

### Extensões Necessárias
```bash
# Extensões PHP obrigatórias para NFePHP
php-xml
php-openssl
php-curl
php-mbstring
php-zip
```

### Configuração php.ini
```ini
; Aumentar limites para processamento NFe
max_execution_time = 300
memory_limit = 256M
upload_max_filesize = 10M
post_max_size = 10M
```

## 🌐 Problemas de Conectividade SEFAZ

### Timeout Comum
```javascript
// Timeout configurado para SEFAZ
signal: AbortSignal.timeout(10000) // 10 segundos
```

### Status Offline
- **Causa**: SEFAZ em manutenção
- **Solução**: Verificar status periodicamente
- **Fallback**: Modo offline para desenvolvimento

## 🔄 Problemas de Estado React

### Estado Não Sincronizado
```typescript
// Problema: estado não atualiza imediatamente
setNfeData(prev => ({ ...prev, novoDado }));

// Solução: usar callback para garantir estado atual
setNfeData(prev => {
  const novoEstado = { ...prev, novoDado };
  console.log('Estado atualizado:', novoEstado);
  return novoEstado;
});
```

### Memory Leaks
```typescript
// Cleanup de listeners
useEffect(() => {
  const handleEvent = () => {};
  window.addEventListener('event', handleEvent);
  
  return () => {
    window.removeEventListener('event', handleEvent);
  };
}, []);
```

## 📱 Problemas de Toast/Notificações

### Console vs Toast
```typescript
// ❌ Problema: usar console.log para feedback
console.log('Logs copiados');

// ✅ Solução: usar toast personalizado
showToast('Logs copiados para a área de transferência!', 'success');
```

## 🔍 Debugging Geral

### Logs Estruturados
```typescript
// Sempre usar logs categorizados
addLog('🔍 Verificando dados da empresa...');
addLog('✅ Empresa carregada: SIM');
addLog('❌ ERRO: Certificado não encontrado');
```

### Informações para Suporte
```typescript
// Template de erro completo
addLog('❌ ERRO CRÍTICO NO PROCESSO');
addLog(`Detalhes: ${error.message}`);
addLog(`Tipo: ${categorizeError(error)}`);
addLog('📋 Use o botão "Copiar Logs" para enviar os detalhes para suporte');
```
