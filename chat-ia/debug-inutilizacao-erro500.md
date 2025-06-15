# 🐛 Debug do Erro 500 - Inutilização NFe/NFC-e

## 🎯 **PROBLEMA ATUAL**

### **Sintomas**:
- ❌ **Erro HTTP 500** ao tentar inutilizar numeração
- ❌ **Endpoint**: `POST /backend/public/inutilizar-numeracao.php`
- ❌ **Resposta**: Internal Server Error (sem detalhes)

### **Contexto**:
- ✅ Interface frontend funcionando
- ✅ Validações frontend OK
- ✅ Dados sendo enviados corretamente
- ❌ Backend retornando erro 500

## 🔍 **INVESTIGAÇÃO REALIZADA**

### **1. Logs Adicionados**
```php
// Logs de debug implementados no arquivo
error_log("🚀 INICIANDO INUTILIZAÇÃO DE NUMERAÇÃO...");
error_log("🔍 PHP Version: " . PHP_VERSION);
error_log("🔍 Working Directory: " . getcwd());
error_log("🔍 Autoload exists: " . (file_exists('../vendor/autoload.php') ? 'YES' : 'NO'));
error_log("🔍 Input recebido: " . $input);
error_log("🔍 JSON decoded: " . ($data ? 'SUCCESS' : 'FAILED'));
```

### **2. Correções Implementadas**
- ✅ **Use statements**: Movidos para o topo do arquivo
- ✅ **Autoload**: Carregado no início
- ✅ **Error handling**: Melhorado com stack trace
- ✅ **Logs detalhados**: Para cada etapa

### **3. Estrutura do Arquivo Corrigida**
```php
<?php
// Headers CORS
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Autoload e imports
require_once '../vendor/autoload.php';
use NFePHP\NFe\Tools;
use NFePHP\Common\Certificate;
use NFePHP\NFe\Common\Standardize;

// Resto do código...
```

## 🔧 **POSSÍVEIS CAUSAS E SOLUÇÕES**

### **1. Problema com Autoload/Composer**

#### **Verificação**:
```bash
cd /root/nexo-pedidos/backend
ls -la vendor/
ls -la vendor/nfephp-org/
```

#### **Solução**:
```bash
cd /root/nexo-pedidos/backend
composer install --no-dev --optimize-autoloader
```

### **2. Problema com Permissões**

#### **Verificação**:
```bash
ls -la /root/nexo-pedidos/backend/public/inutilizar-numeracao.php
ls -la /root/nexo-pedidos/backend/vendor/
```

#### **Solução**:
```bash
chmod 644 /root/nexo-pedidos/backend/public/inutilizar-numeracao.php
chmod -R 755 /root/nexo-pedidos/backend/vendor/
```

### **3. Problema com PHP Extensions**

#### **Verificação**:
```bash
php -m | grep -E "(openssl|curl|json|mbstring)"
```

#### **Extensões necessárias**:
- ✅ openssl (para certificados)
- ✅ curl (para comunicação SEFAZ)
- ✅ json (para parsing)
- ✅ mbstring (para strings)

### **4. Problema com Certificado**

#### **Verificação**:
```bash
ls -la /root/nexo-pedidos/backend/storage/certificados/
```

#### **Estrutura esperada**:
```
/backend/storage/certificados/
└── empresa_{ID}/
    └── certificado.pfx
```

### **5. Problema com Configuração NFe**

#### **Verificação no banco**:
```sql
-- Verificar se empresa existe
SELECT id, razao_social FROM empresas LIMIT 5;

-- Verificar se configuração NFe existe
SELECT empresa_id, ambiente, ambiente_codigo FROM nfe_config LIMIT 5;
```

## 🧪 **TESTES PARA DIAGNÓSTICO**

### **1. Teste Básico do PHP**
```bash
cd /root/nexo-pedidos/backend/public
php -l inutilizar-numeracao.php
```

### **2. Teste do Autoload**
```bash
cd /root/nexo-pedidos/backend
php -r "
require_once 'vendor/autoload.php';
echo 'Autoload: OK\n';
echo 'Tools: ' . (class_exists('NFePHP\NFe\Tools') ? 'OK' : 'FAIL') . \"\n\";
echo 'Certificate: ' . (class_exists('NFePHP\Common\Certificate') ? 'OK' : 'FAIL') . \"\n\";
"
```

### **3. Teste HTTP Simples**
```bash
# Teste GET (deve retornar erro 405)
curl -X GET http://localhost/backend/public/inutilizar-numeracao.php

# Teste POST vazio (deve retornar erro de dados)
curl -X POST http://localhost/backend/public/inutilizar-numeracao.php \
  -H "Content-Type: application/json" \
  -d '{}'
```

### **4. Teste com Dados Válidos**
```bash
curl -X POST http://localhost/backend/public/inutilizar-numeracao.php \
  -H "Content-Type: application/json" \
  -d '{
    "empresa_id": "EMPRESA_ID_REAL",
    "modelo_documento": 65,
    "serie": 1,
    "numero_inicial": 1,
    "numero_final": 1,
    "justificativa": "Teste de inutilização para debug"
  }'
```

## 📋 **ARQUIVO DE DEBUG CRIADO**

### **Localização**: `/backend/public/test-inutilizacao-debug.php`

#### **Funcionalidades**:
- ✅ Testa autoload
- ✅ Testa classes NFe
- ✅ Testa conexão Supabase
- ✅ Testa certificado
- ✅ Testa configuração Tools
- ✅ Logs detalhados de cada etapa

#### **Como usar**:
```bash
# Teste GET (verificação básica)
curl http://localhost/backend/public/test-inutilizacao-debug.php

# Teste POST (teste completo)
curl -X POST http://localhost/backend/public/test-inutilizacao-debug.php \
  -H "Content-Type: application/json" \
  -d '{
    "empresa_id": "EMPRESA_ID_REAL",
    "modelo_documento": 65,
    "serie": 1,
    "numero_inicial": 1,
    "numero_final": 1,
    "justificativa": "Teste de debug completo"
  }'
```

## 🔍 **LOGS PARA MONITORAR**

### **1. Logs do PHP**
```bash
# Logs de erro do PHP
tail -f /var/log/php_errors.log

# Logs personalizados (error_log)
tail -f /var/log/syslog | grep "INUTILIZAÇÃO"
```

### **2. Logs do Servidor Web**
```bash
# Apache
tail -f /var/log/apache2/error.log
tail -f /var/log/apache2/access.log

# Nginx
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### **3. Logs do Sistema**
```bash
# Logs gerais do sistema
dmesg | tail -20
journalctl -f
```

## 🎯 **PRÓXIMOS PASSOS RECOMENDADOS**

### **1. Diagnóstico Imediato** (5 minutos)
```bash
# 1. Verificar sintaxe PHP
cd /root/nexo-pedidos/backend/public
php -l inutilizar-numeracao.php

# 2. Testar autoload
cd /root/nexo-pedidos/backend
php -r "require_once 'vendor/autoload.php'; echo 'OK';"

# 3. Verificar logs em tempo real
tail -f /var/log/php_errors.log &
```

### **2. Teste Isolado** (10 minutos)
```bash
# 1. Usar arquivo de debug
curl http://localhost/backend/public/test-inutilizacao-debug.php

# 2. Testar com dados reais
curl -X POST http://localhost/backend/public/test-inutilizacao-debug.php \
  -H "Content-Type: application/json" \
  -d '{"empresa_id":"ID_REAL","modelo_documento":65,"serie":1,"numero_inicial":1,"numero_final":1,"justificativa":"Teste debug completo"}'
```

### **3. Correção Direcionada** (15 minutos)
- **Se autoload falhar**: `composer install`
- **Se classes faltarem**: Verificar instalação sped-nfe
- **Se certificado falhar**: Verificar caminho e permissões
- **Se configuração falhar**: Verificar dados no banco

## 🚨 **SINAIS DE ALERTA**

### **Problemas Críticos**:
- ❌ **Autoload não carrega**: Problema com Composer
- ❌ **Classes NFe não existem**: Biblioteca não instalada
- ❌ **Certificado não encontrado**: Caminho incorreto
- ❌ **Erro de sintaxe PHP**: Código malformado

### **Problemas de Configuração**:
- ⚠️ **Empresa não encontrada**: Dados incorretos
- ⚠️ **Config NFe ausente**: Configuração incompleta
- ⚠️ **Certificado inválido**: Senha incorreta
- ⚠️ **Permissões negadas**: Problema de acesso

## 📝 **CHECKLIST DE VERIFICAÇÃO**

### **Antes de Continuar**:
- [ ] PHP syntax check passou
- [ ] Autoload carrega sem erro
- [ ] Classes NFePHP existem
- [ ] Logs estão sendo monitorados
- [ ] Arquivo de debug foi testado

### **Durante o Debug**:
- [ ] Logs mostram onde para
- [ ] Erro específico identificado
- [ ] Causa raiz encontrada
- [ ] Solução aplicada
- [ ] Teste de confirmação passou

### **Após a Correção**:
- [ ] Endpoint funciona via curl
- [ ] Interface frontend funciona
- [ ] Inutilização é processada
- [ ] XML é salvo corretamente
- [ ] Banco é atualizado

## 🎯 **RESULTADO ESPERADO**

Após resolver o erro 500, o sistema deve:
1. ✅ Aceitar requisições POST
2. ✅ Validar dados de entrada
3. ✅ Comunicar com SEFAZ
4. ✅ Processar resposta (status 102)
5. ✅ Salvar XML de inutilização
6. ✅ Registrar no banco de dados
7. ✅ Retornar sucesso para frontend

**Status Final Esperado**: Sistema de inutilização 100% funcional.
