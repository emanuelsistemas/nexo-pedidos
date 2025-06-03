# SSH Manager - VPS NFe/NFC-e

Sistema de conexão SSH para debug e manutenção da VPS da API NFe/NFC-e.

## 🚀 Setup Rápido

### 1. Configurar Ambiente
```bash
# Executar setup
setup.bat
```

### 2. Configurar VPS
Edite o arquivo `.env` com os dados da sua VPS:

```env
VPS_HOST=seu-ip-ou-dominio
VPS_PORT=22
VPS_USER=root
VPS_PASSWORD=sua-senha
VPS_KEY_PATH=caminho/para/chave.pem

API_DIR=/var/www/html
NGINX_LOG_DIR=/var/log/nginx
PHP_LOG_DIR=/var/log
```

### 3. Iniciar SSH Manager
```bash
# Iniciar servidor
start.bat
```

## 📖 API Endpoints - Documentação Completa

### 🔍 **GET /api/status**
**Descrição**: Verifica o status do SSH Manager e configurações

**Resposta**:
```json
{
  "status": "SSH Manager Online",
  "timestamp": "2025-06-01T17:30:00",
  "config": {
    "host": "157.180.88.133",
    "port": 22,
    "user": "root",
    "connected": true
  }
}
```

**Exemplo**:
```bash
curl http://localhost:5000/api/status
```

---

### 🔗 **POST /api/connect**
**Descrição**: Estabelece conexão SSH com a VPS

**Resposta**:
```json
{
  "success": true,
  "message": "Conectado com sucesso",
  "timestamp": "2025-06-01T17:30:00"
}
```

**Exemplo**:
```bash
curl -X POST http://localhost:5000/api/connect
```

---

### 🔌 **POST /api/disconnect**
**Descrição**: Encerra a conexão SSH com a VPS

**Resposta**:
```json
{
  "success": true,
  "message": "Desconectado",
  "timestamp": "2025-06-01T17:30:00"
}
```

**Exemplo**:
```bash
curl -X POST http://localhost:5000/api/disconnect
```

---

### ⚡ **POST /api/execute**
**Descrição**: Executa comando na VPS via SSH

**Payload**:
```json
{
  "command": "ls -la /var/www/html",
  "timeout": 30
}
```

**Resposta**:
```json
{
  "success": true,
  "output": "total 48\ndrwxr-xr-x 3 www-data www-data 4096...",
  "error": "",
  "exit_code": 0,
  "command": "ls -la /var/www/html",
  "timestamp": "2025-06-01T17:30:00"
}
```

**Exemplos**:
```bash
# Listar arquivos
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "ls -la /var/www/html"}'

# Verificar status do Nginx
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "systemctl status nginx"}'

# Ver logs em tempo real
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "tail -20 /var/log/nginx/error.log"}'
```

---

### 📋 **GET /api/logs/nginx**
**Descrição**: Visualiza logs do Nginx

**Parâmetros Query**:
- `lines` (opcional): Número de linhas (padrão: 50)
- `type` (opcional): Tipo de log - `error` ou `access` (padrão: error)

**Resposta**:
```json
{
  "success": true,
  "output": "2025/06/01 17:30:00 [error] 1234#0: *1 FastCGI sent in stderr...",
  "error": "",
  "exit_code": 0,
  "command": "tail -50 /var/log/nginx/error.log",
  "timestamp": "2025-06-01T17:30:00"
}
```

**Exemplos**:
```bash
# Últimas 50 linhas do log de erro
curl http://localhost:5000/api/logs/nginx

# Últimas 100 linhas do log de erro
curl http://localhost:5000/api/logs/nginx?lines=100

# Log de acesso
curl http://localhost:5000/api/logs/nginx?type=access&lines=20
```

---

### 🐘 **GET /api/logs/php**
**Descrição**: Visualiza logs do PHP-FPM

**Parâmetros Query**:
- `lines` (opcional): Número de linhas (padrão: 50)

**Resposta**:
```json
{
  "success": true,
  "output": "[01-Jun-2025 17:30:00] ERROR: Pool www: server reached...",
  "error": "",
  "exit_code": 0,
  "command": "tail -50 /var/log/php8.3-fpm.log",
  "timestamp": "2025-06-01T17:30:00"
}
```

**Exemplos**:
```bash
# Últimas 50 linhas do log PHP
curl http://localhost:5000/api/logs/php

# Últimas 100 linhas
curl http://localhost:5000/api/logs/php?lines=100
```

---

### 🐛 **GET /api/nfe/debug**
**Descrição**: Executa debug completo da API NFe (múltiplos comandos)

**Comandos executados**:
1. `ls -la /var/www/html` - Lista arquivos da API
2. `ls -la /var/www/html/api` - Lista endpoints
3. `php -v` - Versão do PHP
4. `nginx -v` - Versão do Nginx
5. `systemctl status nginx` - Status do Nginx
6. `systemctl status php8.3-fpm` - Status do PHP-FPM

**Resposta**:
```json
{
  "success": true,
  "results": [
    {
      "success": true,
      "output": "total 48\ndrwxr-xr-x...",
      "error": "",
      "exit_code": 0,
      "command": "ls -la /var/www/html",
      "timestamp": "2025-06-01T17:30:00"
    },
    // ... outros resultados
  ],
  "timestamp": "2025-06-01T17:30:00"
}
```

**Exemplo**:
```bash
curl http://localhost:5000/api/nfe/debug
```

## 🧪 Testar Conexão

```bash
# Ativar ambiente virtual
venv\Scripts\activate.bat

# Executar testes automatizados
python test_connection.py
```

**Saída esperada**:
```
🧪 Teste de Conexão SSH - VPS NFe
==================================================
🔍 Testando status do SSH Manager...
✅ SSH Manager online
   Host: 157.180.88.133
   Usuário: root

🔗 Testando conexão SSH...
✅ Conexão SSH estabelecida

🔧 Testando execução de comando...
✅ Comando executado com sucesso
   Output: root
/root
Sun Jun  1 17:30:00 UTC 2025

🐛 Testando debug da API NFe...
✅ Debug executado
   Comandos executados: 6
   ✅ Comando 1: OK
   ✅ Comando 2: OK
   ✅ Comando 3: OK
   ✅ Comando 4: OK
   ✅ Comando 5: OK
   ✅ Comando 6: OK

==================================================
📊 RESUMO DOS TESTES:
   Status: ✅ PASSOU
   Conexão: ✅ PASSOU
   Comando: ✅ PASSOU
   Debug NFe: ✅ PASSOU

🎯 Resultado: 4/4 testes passaram
🎉 Todos os testes passaram! SSH Manager funcionando perfeitamente.
```

## 🔧 Comandos Úteis para Debug NFe

### 📋 **Comandos Essenciais via /api/execute**

```bash
# 1. Verificar estrutura da API
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "find /var/www/html -name \"*.php\" | head -20"}'

# 2. Verificar logs de erro em tempo real
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "tail -f /var/log/nginx/error.log"}'

# 3. Testar endpoint NFe diretamente no servidor
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "curl -X POST localhost/api/nfe-completa -H \"Content-Type: application/json\" -d \"{}\""}'

# 4. Verificar permissões de diretórios
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "ls -la /var/www/html/storage/"}'

# 5. Verificar configuração PHP
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "php -i | grep -E \"(memory_limit|max_execution_time|error_log)\""}'

# 6. Verificar status dos serviços
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "systemctl status nginx php8.3-fpm --no-pager"}'

# 7. Verificar certificados digitais
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "ls -la /var/www/html/certificados/ 2>/dev/null || echo \"Diretório certificados não encontrado\""}'

# 8. Testar conectividade com SEFAZ
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "curl -s -o /dev/null -w \"%{http_code}\" https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx"}'
```

### 🐛 **Debug Específico HTTP 500**

```bash
# Verificar últimos erros PHP
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "grep -i \"fatal\\|error\" /var/log/php8.3-fpm.log | tail -10"}'

# Verificar últimos erros Nginx
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "grep -i \"500\\|error\" /var/log/nginx/error.log | tail -10"}'

# Testar sintaxe PHP dos arquivos da API
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "find /var/www/html/api -name \"*.php\" -exec php -l {} \\;"}'

# Verificar se NFePHP está instalado
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "find /var/www/html -name \"*nfe*\" -type d"}'
```

## 🎯 Resolução de Problemas

### ❌ **HTTP 500 na API NFe**

**Passos de diagnóstico**:

1. **Verificar logs em tempo real**:
   ```bash
   curl http://localhost:5000/api/logs/nginx?lines=20
   curl http://localhost:5000/api/logs/php?lines=20
   ```

2. **Executar debug completo**:
   ```bash
   curl http://localhost:5000/api/nfe/debug
   ```

3. **Testar endpoint localmente no servidor**:
   ```bash
   curl -X POST http://localhost:5000/api/execute \
     -H "Content-Type: application/json" \
     -d '{"command": "curl -X POST localhost/api/nfe-completa -H \"Content-Type: application/json\" -d \"{\\\"teste\\\": true}\""}'
   ```

4. **Verificar permissões**:
   ```bash
   curl -X POST http://localhost:5000/api/execute \
     -H "Content-Type: application/json" \
     -d '{"command": "chown -R www-data:www-data /var/www/html && chmod -R 755 /var/www/html"}'
   ```

### 🔌 **Problemas de Conexão SSH**

**Sintomas**: Erro ao conectar, timeout, acesso negado

**Soluções**:

1. **Verificar conectividade**:
   ```bash
   ping seu-ip-da-vps
   telnet seu-ip-da-vps 22
   ```

2. **Verificar credenciais no .env**:
   ```env
   VPS_HOST=IP-CORRETO
   VPS_USER=USUARIO-CORRETO
   VPS_PASSWORD=SENHA-CORRETA
   ```

3. **Testar conexão manual**:
   ```bash
   ssh usuario@ip-da-vps
   ```

### 🐍 **Problemas do SSH Manager**

**Sintomas**: Servidor não inicia, erro de dependências

**Soluções**:

1. **Reinstalar dependências**:
   ```bash
   cd ssh
   rmdir /s venv
   setup.bat
   ```

2. **Verificar Python**:
   ```bash
   python --version
   pip --version
   ```

3. **Verificar porta 5000**:
   ```bash
   netstat -an | findstr :5000
   ```

## 🔒 Segurança e Boas Práticas

### 🛡️ **Configuração Segura**

- ✅ **Use chaves SSH** quando possível (mais seguro que senhas)
- ✅ **Configure firewall** para permitir apenas IPs necessários
- ✅ **Monitore logs** regularmente
- ✅ **Use usuário específico** com privilégios mínimos
- ✅ **Mantenha .env seguro** (não commitar no git)

### 🔐 **Exemplo com Chave SSH**

```env
# .env com chave SSH (mais seguro)
VPS_HOST=157.180.88.133
VPS_PORT=22
VPS_USER=nfe-user
VPS_KEY_PATH=C:\Users\Usuario\.ssh\vps-nfe-key.pem
VPS_PASSWORD=
```

### 📊 **Monitoramento**

```bash
# Verificar tentativas de login
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "grep \"Failed password\" /var/log/auth.log | tail -10"}'

# Verificar uso de recursos
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "top -bn1 | head -20"}'
```

## 📞 **Suporte**

Se encontrar problemas:

1. **Execute os testes**: `python test_connection.py`
2. **Verifique logs**: Use endpoints `/api/logs/nginx` e `/api/logs/php`
3. **Debug completo**: Use endpoint `/api/nfe/debug`
4. **Documente o erro** com logs e comandos executados
