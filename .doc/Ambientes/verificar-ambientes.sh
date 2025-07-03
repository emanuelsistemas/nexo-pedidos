#!/bin/bash

# 🔍 Script de Verificação de Ambientes
# Verifica se os ambientes estão configurados corretamente

echo "🔍 VERIFICAÇÃO DE AMBIENTES - NEXO PEDIDOS"
echo "=========================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para verificar se comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verificar se curl está disponível
if ! command_exists curl; then
    echo -e "${RED}❌ ERRO: curl não está instalado${NC}"
    exit 1
fi

echo -e "${BLUE}📊 1. VERIFICANDO ARQUIVOS SERVIDOS${NC}"
echo "-----------------------------------"

# Verificar arquivo JS do desenvolvimento
DEV_JS=$(curl -s "http://nexodev.emasoftware.app" | grep -o "index-[^.]*\.js" 2>/dev/null)
if [ -n "$DEV_JS" ]; then
    echo -e "${GREEN}✅ DEV (nexodev):${NC} $DEV_JS"
else
    echo -e "${RED}❌ DEV (nexodev): Não foi possível obter arquivo JS${NC}"
fi

# Verificar arquivo JS da produção
PROD_JS=$(curl -s "http://nexo.emasoftware.app" | grep -o "index-[^.]*\.js" 2>/dev/null)
if [ -n "$PROD_JS" ]; then
    echo -e "${GREEN}✅ PROD (nexo):${NC} $PROD_JS"
else
    echo -e "${RED}❌ PROD (nexo): Não foi possível obter arquivo JS${NC}"
fi

# Comparar arquivos
echo ""
if [ "$DEV_JS" != "$PROD_JS" ] && [ -n "$DEV_JS" ] && [ -n "$PROD_JS" ]; then
    echo -e "${GREEN}✅ RESULTADO: Ambientes estão SEPARADOS corretamente!${NC}"
elif [ "$DEV_JS" = "$PROD_JS" ]; then
    echo -e "${RED}❌ PROBLEMA: Ambientes estão servindo o MESMO arquivo!${NC}"
    echo -e "${YELLOW}💡 Consulte: TROUBLESHOOTING_NGINX_AMBIENTES.md${NC}"
else
    echo -e "${YELLOW}⚠️  AVISO: Não foi possível verificar um ou ambos os ambientes${NC}"
fi

echo ""
echo -e "${BLUE}📁 2. VERIFICANDO CONFIGURAÇÃO NGINX${NC}"
echo "------------------------------------"

# Verificar configuração do Nginx
if [ -f "/etc/nginx/sites-available/nexo-pedidos" ]; then
    echo -e "${GREEN}✅ Arquivo de configuração encontrado${NC}"
    
    # Verificar diretórios configurados
    echo ""
    echo "📂 Diretórios configurados:"
    grep -n "root " /etc/nginx/sites-available/nexo-pedidos | while read line; do
        echo "   $line"
    done
    
    echo ""
    echo "🌐 Domínios configurados:"
    grep -n "server_name" /etc/nginx/sites-available/nexo-pedidos | while read line; do
        echo "   $line"
    done
    
else
    echo -e "${RED}❌ Arquivo de configuração não encontrado${NC}"
fi

echo ""
echo -e "${BLUE}📋 3. VERIFICANDO DIRETÓRIOS${NC}"
echo "----------------------------"

# Verificar diretório de desenvolvimento
if [ -d "/root/nexo-pedidos/dist" ]; then
    echo -e "${GREEN}✅ Diretório DEV:${NC} /root/nexo-pedidos/dist"
    DEV_COUNT=$(find /root/nexo-pedidos/dist -name "*.js" | wc -l)
    echo "   📄 Arquivos JS: $DEV_COUNT"
else
    echo -e "${RED}❌ Diretório DEV não encontrado:${NC} /root/nexo-pedidos/dist"
fi

# Verificar diretório de produção
if [ -d "/var/www/nexo-producao/dist" ]; then
    echo -e "${GREEN}✅ Diretório PROD:${NC} /var/www/nexo-producao/dist"
    PROD_COUNT=$(find /var/www/nexo-producao/dist -name "*.js" | wc -l)
    echo "   📄 Arquivos JS: $PROD_COUNT"
else
    echo -e "${RED}❌ Diretório PROD não encontrado:${NC} /var/www/nexo-producao/dist"
fi

echo ""
echo -e "${BLUE}🔧 4. VERIFICANDO SERVIÇOS${NC}"
echo "-------------------------"

# Verificar status do Nginx
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx está rodando${NC}"
else
    echo -e "${RED}❌ Nginx não está rodando${NC}"
fi

# Verificar configuração do Nginx
if nginx -t >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Configuração do Nginx está válida${NC}"
else
    echo -e "${RED}❌ Configuração do Nginx tem erros${NC}"
    echo "   Execute: nginx -t"
fi

echo ""
echo -e "${BLUE}📝 5. RESUMO E RECOMENDAÇÕES${NC}"
echo "-----------------------------"

if [ "$DEV_JS" != "$PROD_JS" ] && [ -n "$DEV_JS" ] && [ -n "$PROD_JS" ]; then
    echo -e "${GREEN}🎉 TUDO OK! Ambientes estão funcionando corretamente.${NC}"
else
    echo -e "${YELLOW}⚠️  AÇÃO NECESSÁRIA:${NC}"
    echo "   1. Verifique a configuração do Nginx"
    echo "   2. Consulte: TROUBLESHOOTING_NGINX_AMBIENTES.md"
    echo "   3. Execute: nginx -t && systemctl reload nginx"
fi

echo ""
echo "📖 Documentação disponível em:"
echo "   - CONFIGURACAO_AMBIENTES_SEPARADOS.md"
echo "   - TROUBLESHOOTING_NGINX_AMBIENTES.md"
echo "   - SCRIPTS_MANUTENCAO_AMBIENTES.md"

echo ""
echo "🕐 Verificação concluída em: $(date)"
