# 🔧 SSH Manager - Guia Completo para Debug da VPS

## 📋 **RESUMO**

O SSH Manager é uma ferramenta Python que permite acesso direto à VPS da API NFe via HTTP, facilitando debug e manutenção sem precisar usar SSH manual.

---

## 🚀 **SETUP RÁPIDO**

### **1. Navegar para pasta:**
```bash
cd C:\Users\Usuario\Desktop\projetos\nexo-pedidos\ssh
```

### **2. Configurar .env:**
```env
VPS_HOST=157.180.88.133
VPS_PORT=22
VPS_USER=root
VPS_PASSWORD=Gbu2yD76U38bUU
VPS_KEY_PATH=

API_DIR=/var/www/nfe-api
NGINX_LOG_DIR=/var/log/nginx
PHP_LOG_DIR=/var/log

SSH_TIMEOUT=30
DEBUG_MODE=true
```

### **3. Executar setup:**
```bash
setup.bat
```

### **4. Iniciar servidor:**
```bash
start.bat
```

### **5. Verificar funcionamento:**
```
http://localhost:5000/api/status
```

---

## 📖 **ENDPOINTS DISPONÍVEIS**

### **🔍 GET /api/status**
**Descrição:** Status do SSH Manager e configurações

**Exemplo:**
```bash
curl http://localhost:5000/api/status
```

**Resposta:**
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

---

### **🔗 POST /api/connect**
**Descrição:** Conectar na VPS via SSH

**Exemplo:**
```bash
curl -X POST http://localhost:5000/api/connect
```

**Resposta:**
```json
{
  "success": true,
  "message": "Conectado com sucesso",
  "timestamp": "2025-06-01T17:30:00"
}
```

---

### **⚡ POST /api/execute**
**Descrição:** Executar comando na VPS

**Payload:**
```json
{
  "command": "ls -la /var/www/nfe-api",
  "timeout": 30
}
```

**Exemplo:**
```bash
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "ls -la /var/www/nfe-api"}'
```

**Resposta:**
```json
{
  "success": true,
  "output": "total 48\ndrwxr-xr-x 3 www-data www-data 4096...",
  "error": "",
  "exit_code": 0,
  "command": "ls -la /var/www/nfe-api",
  "timestamp": "2025-06-01T17:30:00"
}
```

---

### **📋 GET /api/logs/nginx**
**Descrição:** Ver logs do Nginx

**Parâmetros:**
- `lines` (opcional): Número de linhas (padrão: 50)
- `type` (opcional): `error` ou `access` (padrão: error)

**Exemplos:**
```bash
# Últimas 50 linhas do log de erro
curl http://localhost:5000/api/logs/nginx

# Últimas 100 linhas do log de erro
curl http://localhost:5000/api/logs/nginx?lines=100

# Log de acesso
curl http://localhost:5000/api/logs/nginx?type=access&lines=20
```

---

### **🐘 GET /api/logs/php**
**Descrição:** Ver logs do PHP-FPM

**Parâmetros:**
- `lines` (opcional): Número de linhas (padrão: 50)

**Exemplos:**
```bash
# Últimas 50 linhas do log PHP
curl http://localhost:5000/api/logs/php

# Últimas 100 linhas
curl http://localhost:5000/api/logs/php?lines=100
```

---

### **🐛 GET /api/nfe/debug**
**Descrição:** Debug completo da API NFe

**Comandos executados automaticamente:**
1. `ls -la /var/www/nfe-api` - Lista arquivos da API
2. `ls -la /var/www/nfe-api/api` - Lista endpoints
3. `php -v` - Versão do PHP
4. `nginx -v` - Versão do Nginx
5. `systemctl status nginx` - Status do Nginx
6. `systemctl status php8.3-fpm` - Status do PHP-FPM

**Exemplo:**
```bash
curl http://localhost:5000/api/nfe/debug
```

---

## 🔧 **COMANDOS ÚTEIS PARA DEBUG NFE**

### **📋 Comandos Essenciais:**

```bash
# 1. Verificar estrutura da API
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "find /var/www/nfe-api -name \"*.php\" | head -20"}'

# 2. Ver logs de erro em tempo real
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "tail -f /var/log/nginx/nfe-api.error.log"}'

# 3. Testar endpoint NFe diretamente no servidor
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "curl -X POST localhost/api/nfe-completa -H \"Content-Type: application/json\" -d \"{}\""}'

# 4. Verificar permissões
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "ls -la /var/www/nfe-api/storage/"}'

# 5. Verificar configuração PHP
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "php -i | grep -E \"(memory_limit|max_execution_time|error_log)\""}'

# 6. Verificar status dos serviços
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "systemctl status nginx php8.3-fpm --no-pager"}'
```

### **🐛 Debug Específico HTTP 500:**

```bash
# Verificar últimos erros PHP
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "grep -i \"fatal\\|error\" /var/log/php8.3-fpm.log | tail -10"}'

# Verificar últimos erros Nginx
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "grep -i \"500\\|error\" /var/log/nginx/nfe-api.error.log | tail -10"}'

# Testar sintaxe PHP
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "find /var/www/nfe-api -name \"*.php\" -exec php -l {} \\;"}'
```

---

## 🎯 **RESOLUÇÃO DE PROBLEMAS**

### **❌ HTTP 500 na API NFe**

**Passos:**

1. **Verificar logs em tempo real:**
   ```bash
   curl http://localhost:5000/api/logs/nginx?lines=20
   curl http://localhost:5000/api/logs/php?lines=20
   ```

2. **Executar debug completo:**
   ```bash
   curl http://localhost:5000/api/nfe/debug
   ```

3. **Testar endpoint localmente:**
   ```bash
   curl -X POST http://localhost:5000/api/execute \
     -H "Content-Type: application/json" \
     -d '{"command": "curl -X POST localhost/api/nfe-completa -H \"Content-Type: application/json\" -d \"{\\\"teste\\\": true}\""}'
   ```

### **🔌 SSH Manager não conecta**

**Soluções:**

1. **Verificar .env:**
   ```env
   VPS_HOST=157.180.88.133
   VPS_USER=root
   VPS_PASSWORD=Gbu2yD76U38bUU
   ```

2. **Reinstalar dependências:**
   ```bash
   cd ssh
   rmdir /s venv
   setup.bat
   ```

3. **Verificar porta 5000:**
   ```bash
   netstat -an | findstr :5000
   ```

---

## 📁 **ESTRUTURA DOS ARQUIVOS**

```
ssh/
├── .env                 # ⚙️ Configurações da VPS
├── requirements.txt     # 📦 Dependências Python
├── ssh_manager.py       # 🚀 Servidor SSH Manager
├── setup.bat           # 🔧 Setup automático
├── start.bat           # ▶️ Iniciar servidor
├── test_connection.py  # 🧪 Testes de conexão
└── README.md           # 📖 Documentação
```

---

## 🧪 **TESTES AUTOMATIZADOS**

### **Executar testes:**
```bash
cd ssh
venv\Scripts\activate.bat
python test_connection.py
```

### **Saída esperada:**
```
🧪 Teste de Conexão SSH - VPS NFe
==================================================
✅ SSH Manager online
✅ Conexão SSH estabelecida
✅ Comando executado com sucesso
✅ Debug executado

🎯 Resultado: 4/4 testes passaram
🎉 Todos os testes passaram!
```

---

## 🔒 **SEGURANÇA**

### **Boas Práticas:**
- ✅ Senha configurada em .env (não no código)
- ✅ Timeout configurado para evitar travamentos
- ✅ Logs de todas as operações
- ✅ Validação de comandos

### **Limitações:**
- ❌ Não usar em produção sem autenticação
- ❌ Não expor porta 5000 publicamente
- ❌ Não executar comandos destrutivos

---

## 📞 **SUPORTE**

### **Se encontrar problemas:**

1. **Execute os testes:** `python test_connection.py`
2. **Verifique logs:** Use endpoints `/api/logs/nginx` e `/api/logs/php`
3. **Debug completo:** Use endpoint `/api/nfe/debug`
4. **Documente o erro** com logs e comandos executados

### **Comandos de emergência:**
```bash
# Reiniciar serviços na VPS
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "systemctl restart nginx php8.3-fpm"}'

# Verificar espaço em disco
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "df -h"}'

# Verificar uso de memória
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "free -h"}'
```

---

**🎯 SSH Manager é a ferramenta PRINCIPAL para debug da VPS!**

**📅 Criado:** 01/06/2025
**🔧 Versão:** 1.0
**👨‍💻 Autor:** IA Assistant + Emanuel Luis
