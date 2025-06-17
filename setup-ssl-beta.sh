#!/bin/bash

# 🔒 Script para configurar SSL no ambiente BETA
# Configura certificado SSL para nexobeta.emasoftware.app

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠️${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ❌${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] ℹ️${NC} $1"
}

# Banner
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                🔒 CONFIGURAÇÃO SSL BETA                     ║"
echo "║            nexobeta.emasoftware.app                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Verificar se certbot está instalado
if ! command -v certbot &> /dev/null; then
    log "📦 Instalando Certbot..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
else
    log "✅ Certbot já está instalado"
fi

# Verificar se o domínio está apontando para o servidor
log "🌐 Verificando DNS do domínio..."
DOMAIN_IP=$(dig +short nexobeta.emasoftware.app)
SERVER_IP=$(curl -s ifconfig.me)

if [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
    warn "⚠️  DNS ainda não está apontando corretamente"
    info "   Domínio aponta para: $DOMAIN_IP"
    info "   Servidor IP: $SERVER_IP"
    info "   Configure o DNS no Cloudflare primeiro!"
    echo ""
    read -p "Continuar mesmo assim? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    log "✅ DNS configurado corretamente"
fi

# Obter certificado SSL
log "🔒 Obtendo certificado SSL..."
sudo certbot --nginx -d nexobeta.emasoftware.app --non-interactive --agree-tos --email admin@emasoftware.app

if [ $? -eq 0 ]; then
    log "✅ Certificado SSL configurado com sucesso!"
    
    # Substituir configuração temporária pela versão com SSL
    log "🔄 Atualizando configuração Nginx com SSL..."
    sudo cp nginx-beta.conf /etc/nginx/sites-available/nexo-beta
    sudo nginx -t && sudo systemctl reload nginx
    
    log "✅ Configuração SSL completa!"
else
    error "❌ Falha ao obter certificado SSL"
    warn "Mantendo configuração HTTP temporária"
fi

echo -e "\n${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    ✅ SSL CONFIGURADO                        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${BLUE}🎯 RESULTADO:${NC}"
echo -e "   • BETA: ${GREEN}https://nexobeta.emasoftware.app${NC}"
echo -e "   • Certificado: ${GREEN}Let's Encrypt${NC}"
echo -e "   • Renovação: ${GREEN}Automática${NC}"

echo -e "\n${BLUE}🔧 COMANDOS ÚTEIS:${NC}"
echo -e "   • Testar SSL: ${YELLOW}curl -I https://nexobeta.emasoftware.app${NC}"
echo -e "   • Renovar: ${YELLOW}sudo certbot renew${NC}"
echo -e "   • Status: ${YELLOW}sudo certbot certificates${NC}"

echo -e "\n${GREEN}🔒 SSL configurado com sucesso!${NC}"
