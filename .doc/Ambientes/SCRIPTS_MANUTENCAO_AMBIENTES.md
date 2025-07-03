# 🔧 SCRIPTS DE MANUTENÇÃO DOS AMBIENTES
**Nexo Pedidos - Automação e Manutenção**

---

## 📋 **VISÃO GERAL**

Scripts e comandos automatizados para facilitar a manutenção dos ambientes de desenvolvimento e produção do Nexo Pedidos.

---

## 🔍 **SCRIPT DE VERIFICAÇÃO DE AMBIENTES**

### **📄 Arquivo: `/root/nexo-pedidos/.doc/Ambientes/verificar-ambientes.sh`**

Script para verificar se os ambientes estão configurados corretamente e identificar problemas comuns.

#### **🎯 Funcionalidades:**
- ✅ Verifica arquivos JS servidos por cada ambiente
- ✅ Compara se ambientes estão realmente separados
- ✅ Verifica configuração do Nginx
- ✅ Verifica diretórios e serviços
- ✅ Fornece diagnóstico completo com cores

#### **🚀 Como usar:**
```bash
# Executar verificação completa
/root/nexo-pedidos/.doc/Ambientes/verificar-ambientes.sh

# Ou navegar até o diretório
cd /root/nexo-pedidos/.doc/Ambientes/
./verificar-ambientes.sh
```

#### **📊 Exemplo de saída:**
```
🔍 VERIFICAÇÃO DE AMBIENTES - NEXO PEDIDOS
==========================================

📊 1. VERIFICANDO ARQUIVOS SERVIDOS
-----------------------------------
✅ DEV (nexodev): index-BaLvCqcn.js
✅ PROD (nexo): index-Dini8DaF.js

✅ RESULTADO: Ambientes estão SEPARADOS corretamente!

📁 2. VERIFICANDO CONFIGURAÇÃO NGINX
------------------------------------
✅ Arquivo de configuração encontrado
...
```

#### **🚨 Quando usar:**
- Após configurar ambientes separados
- Quando mudanças não aparecem no desenvolvimento
- Para diagnóstico de problemas de cache/configuração
- Como verificação de rotina

---

## 🚀 **SCRIPT DE DEPLOY PARA PRODUÇÃO**

### **📄 Criar arquivo: `/root/scripts/deploy-producao.sh`**

```bash
#!/bin/bash

# 🔒 DEPLOY PARA PRODUÇÃO - Nexo Pedidos
# Uso: ./deploy-producao.sh

set -e  # Parar em caso de erro

echo "🔒 INICIANDO DEPLOY PARA PRODUÇÃO"
echo "=================================="

# Verificar se está na branch main
cd /root/nexo-pedidos
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ ERRO: Você deve estar na branch main para fazer deploy em produção"
    echo "Branch atual: $CURRENT_BRANCH"
    exit 1
fi

# Verificar se há alterações não commitadas
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ ERRO: Há alterações não commitadas na branch main"
    git status
    exit 1
fi

# Fazer backup da produção atual
echo "📦 Criando backup da produção atual..."
BACKUP_DIR="/var/backups/nexo-producao-$(date +%Y%m%d-%H%M%S)"
sudo cp -r /var/www/nexo-producao "$BACKUP_DIR"
echo "✅ Backup criado em: $BACKUP_DIR"

# Atualizar código de produção
echo "🔄 Atualizando código de produção..."
cd /var/www/nexo-producao
sudo -u www-data git pull origin main

# Instalar dependências
echo "📦 Instalando dependências..."
sudo -u www-data npm install

# Gerar build
echo "🔨 Gerando build de produção..."
sudo -u www-data npm run build

# Testar configuração do Nginx
echo "🧪 Testando configuração do Nginx..."
sudo nginx -t

# Recarregar Nginx
echo "🔄 Recarregando Nginx..."
sudo systemctl reload nginx

# Verificar se o site está funcionando
echo "✅ Verificando funcionamento..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://nexo.emasoftware.app)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ SUCESSO: Deploy concluído com sucesso!"
    echo "🌐 Site disponível em: https://nexo.emasoftware.app"
else
    echo "❌ ERRO: Site retornou código $HTTP_CODE"
    echo "🔄 Restaurando backup..."
    sudo rm -rf /var/www/nexo-producao
    sudo mv "$BACKUP_DIR" /var/www/nexo-producao
    sudo systemctl reload nginx
    exit 1
fi

echo "=================================="
echo "🎉 DEPLOY PARA PRODUÇÃO CONCLUÍDO"
```

### **🔐 Tornar executável:**
```bash
mkdir -p /root/scripts
chmod +x /root/scripts/deploy-producao.sh
```

---

## 🔧 **SCRIPT DE VERIFICAÇÃO DOS AMBIENTES**

### **📄 Criar arquivo: `/root/scripts/verificar-ambientes.sh`**

```bash
#!/bin/bash

# 🔍 VERIFICAÇÃO DOS AMBIENTES - Nexo Pedidos
# Uso: ./verificar-ambientes.sh

echo "🔍 VERIFICAÇÃO DOS AMBIENTES NEXO PEDIDOS"
echo "========================================"

# Função para verificar status HTTP
check_http() {
    local url=$1
    local name=$2
    local code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    if [ "$code" = "200" ]; then
        echo "✅ $name: OK ($code)"
    else
        echo "❌ $name: ERRO ($code)"
    fi
}

# Verificar branches
echo ""
echo "📂 BRANCHES:"
echo "Desenvolvimento: $(cd /root/nexo-pedidos && git branch --show-current)"
echo "Produção: $(cd /var/www/nexo-producao && git branch --show-current)"

# Verificar últimos commits
echo ""
echo "📝 ÚLTIMOS COMMITS:"
echo "DEV: $(cd /root/nexo-pedidos && git log -1 --oneline)"
echo "PROD: $(cd /var/www/nexo-producao && git log -1 --oneline)"

# Verificar sites
echo ""
echo "🌐 STATUS DOS SITES:"
check_http "http://nexodev.emasoftware.app" "Desenvolvimento"
check_http "https://nexo.emasoftware.app" "Produção"

# Verificar serviços
echo ""
echo "⚙️ STATUS DOS SERVIÇOS:"
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx: Ativo"
else
    echo "❌ Nginx: Inativo"
fi

if systemctl is-active --quiet php8.3-fpm; then
    echo "✅ PHP-FPM: Ativo"
else
    echo "❌ PHP-FPM: Inativo"
fi

# Verificar espaço em disco
echo ""
echo "💾 ESPAÇO EM DISCO:"
df -h /root/nexo-pedidos | tail -1 | awk '{print "DEV: " $4 " disponível"}'
df -h /var/www/nexo-producao | tail -1 | awk '{print "PROD: " $4 " disponível"}'

# Verificar logs recentes
echo ""
echo "📋 LOGS RECENTES (últimas 5 linhas):"
echo "--- Desenvolvimento ---"
tail -5 /var/log/nginx/nexo-dev-error.log 2>/dev/null || echo "Nenhum erro recente"
echo "--- Produção ---"
tail -5 /var/log/nginx/nexo-error.log 2>/dev/null || echo "Nenhum erro recente"

echo ""
echo "========================================"
echo "🏁 VERIFICAÇÃO CONCLUÍDA"
```

### **🔐 Tornar executável:**
```bash
chmod +x /root/scripts/verificar-ambientes.sh
```

---

## 🔄 **SCRIPT DE SINCRONIZAÇÃO DEV → MAIN**

### **📄 Criar arquivo: `/root/scripts/sync-dev-to-main.sh`**

```bash
#!/bin/bash

# 🔄 SINCRONIZAÇÃO DEV → MAIN - Nexo Pedidos
# Uso: ./sync-dev-to-main.sh

set -e

echo "🔄 SINCRONIZAÇÃO DEV → MAIN"
echo "=========================="

cd /root/nexo-pedidos

# Verificar se está na branch dev
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "dev" ]; then
    echo "❌ ERRO: Você deve estar na branch dev"
    echo "Branch atual: $CURRENT_BRANCH"
    exit 1
fi

# Verificar se há alterações não commitadas
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ ERRO: Há alterações não commitadas na branch dev"
    git status
    exit 1
fi

# Atualizar dev
echo "🔄 Atualizando branch dev..."
git pull origin dev

# Mudar para main
echo "🔄 Mudando para branch main..."
git checkout main

# Atualizar main
echo "🔄 Atualizando branch main..."
git pull origin main

# Fazer merge da dev
echo "🔄 Fazendo merge da dev para main..."
git merge dev

# Push para main
echo "🔄 Enviando alterações para main..."
git push origin main

# Voltar para dev
echo "🔄 Voltando para branch dev..."
git checkout dev

echo "=========================="
echo "✅ SINCRONIZAÇÃO CONCLUÍDA"
echo "🎯 Próximo passo: Execute ./deploy-producao.sh"
```

### **🔐 Tornar executável:**
```bash
chmod +x /root/scripts/sync-dev-to-main.sh
```

---

## 📊 **SCRIPT DE MONITORAMENTO**

### **📄 Criar arquivo: `/root/scripts/monitor-ambientes.sh`**

```bash
#!/bin/bash

# 📊 MONITORAMENTO DOS AMBIENTES - Nexo Pedidos
# Uso: ./monitor-ambientes.sh

echo "📊 MONITORAMENTO NEXO PEDIDOS"
echo "============================="

# Função para verificar uso de CPU e memória
check_resources() {
    echo "💻 RECURSOS DO SISTEMA:"
    echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)% em uso"
    echo "RAM: $(free | grep Mem | awk '{printf "%.1f%% em uso", $3/$2 * 100.0}')"
    echo "Swap: $(free | grep Swap | awk '{printf "%.1f%% em uso", $3/$2 * 100.0}')"
}

# Verificar processos do Nginx e PHP
check_processes() {
    echo ""
    echo "🔧 PROCESSOS:"
    echo "Nginx: $(pgrep nginx | wc -l) processos"
    echo "PHP-FPM: $(pgrep php-fpm | wc -l) processos"
}

# Verificar conexões ativas
check_connections() {
    echo ""
    echo "🌐 CONEXÕES ATIVAS:"
    echo "Porta 80: $(netstat -an | grep :80 | grep ESTABLISHED | wc -l) conexões"
    echo "Porta 443: $(netstat -an | grep :443 | grep ESTABLISHED | wc -l) conexões"
}

# Verificar tamanho dos logs
check_logs() {
    echo ""
    echo "📋 TAMANHO DOS LOGS:"
    echo "DEV Access: $(du -h /var/log/nginx/nexo-dev-access.log 2>/dev/null | cut -f1 || echo '0B')"
    echo "DEV Error: $(du -h /var/log/nginx/nexo-dev-error.log 2>/dev/null | cut -f1 || echo '0B')"
    echo "PROD Access: $(du -h /var/log/nginx/nexo-access.log 2>/dev/null | cut -f1 || echo '0B')"
    echo "PROD Error: $(du -h /var/log/nginx/nexo-error.log 2>/dev/null | cut -f1 || echo '0B')"
}

# Executar verificações
check_resources
check_processes
check_connections
check_logs

echo ""
echo "============================="
echo "📅 $(date)"
```

### **🔐 Tornar executável:**
```bash
chmod +x /root/scripts/monitor-ambientes.sh
```

---

## ⏰ **CONFIGURAÇÃO DE CRON JOBS**

### **📄 Adicionar ao crontab:**

```bash
# Editar crontab
crontab -e

# Adicionar as seguintes linhas:

# Verificação automática a cada 30 minutos
*/30 * * * * /root/scripts/verificar-ambientes.sh >> /var/log/nexo-verificacao.log 2>&1

# Monitoramento a cada hora
0 * * * * /root/scripts/monitor-ambientes.sh >> /var/log/nexo-monitoramento.log 2>&1

# Limpeza de logs antigos (semanal)
0 2 * * 0 find /var/log/nginx/nexo-*.log -mtime +30 -delete
```

---

## 🔧 **ALIASES ÚTEIS**

### **📄 Adicionar ao ~/.bashrc:**

```bash
# Aliases para Nexo Pedidos
alias nexo-check='/root/scripts/verificar-ambientes.sh'
alias nexo-monitor='/root/scripts/monitor-ambientes.sh'
alias nexo-deploy='/root/scripts/deploy-producao.sh'
alias nexo-sync='/root/scripts/sync-dev-to-main.sh'

# Navegação rápida
alias nexo-dev='cd /root/nexo-pedidos'
alias nexo-prod='cd /var/www/nexo-producao'

# Logs rápidos
alias nexo-logs-dev='tail -f /var/log/nginx/nexo-dev-error.log'
alias nexo-logs-prod='tail -f /var/log/nginx/nexo-error.log'
```

### **🔄 Recarregar aliases:**
```bash
source ~/.bashrc
```

---

## 📞 **COMANDOS DE EMERGÊNCIA**

### **🚨 Restaurar produção rapidamente:**
```bash
# Parar Nginx
sudo systemctl stop nginx

# Restaurar último backup
sudo rm -rf /var/www/nexo-producao
sudo mv /var/backups/nexo-producao-YYYYMMDD-HHMMSS /var/www/nexo-producao

# Reiniciar Nginx
sudo systemctl start nginx
```

### **🔄 Reiniciar todos os serviços:**
```bash
sudo systemctl restart nginx php8.3-fpm
```

### **🧹 Limpeza de emergência:**
```bash
# Limpar logs grandes
sudo truncate -s 0 /var/log/nginx/nexo-*.log

# Limpar cache do npm
cd /root/nexo-pedidos && npm cache clean --force
cd /var/www/nexo-producao && sudo -u www-data npm cache clean --force
```

## 🔗 **DOCUMENTOS RELACIONADOS**

- 📖 **[CONFIGURACAO_AMBIENTES_SEPARADOS.md](./CONFIGURACAO_AMBIENTES_SEPARADOS.md)** - Configuração completa dos ambientes
- 🚨 **[TROUBLESHOOTING_NGINX_AMBIENTES.md](./TROUBLESHOOTING_NGINX_AMBIENTES.md)** - Solução para problemas de configuração
- 🔍 **[verificar-ambientes.sh](./verificar-ambientes.sh)** - Script de verificação automática

---

**📅 Última atualização:** 03/07/2025
**👤 Responsável:** Emanuel Luis
**🔧 Versão:** 1.1
