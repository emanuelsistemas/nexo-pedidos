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
