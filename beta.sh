#!/bin/bash

# 🧪 Script para build e deploy do ambiente BETA
# Deploy para: https://nexobeta.emasoftware.app

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
echo "║                🧪 NEXO PEDIDOS - BETA                       ║"
echo "║            Deploy para nexobeta.emasoftware.app             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz do projeto (onde está o package.json)"
    exit 1
fi

# Verificar branch atual
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "beta" ]; then
    warn "Você não está na branch beta (atual: $CURRENT_BRANCH)"
    read -p "Mudar para branch beta? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
        log "Mudando para branch beta..."
        git checkout beta
    else
        warn "Continuando na branch $CURRENT_BRANCH..."
    fi
fi

# Verificar dependências
if [ ! -d "node_modules" ]; then
    log "📦 Instalando dependências..."
    npm install
else
    info "📦 Dependências já instaladas"
fi

# Verificar arquivo .env
if [ ! -f ".env" ]; then
    warn "Arquivo .env não encontrado"
    if [ -f ".env.example" ]; then
        log "📝 Criando .env a partir do .env.example..."
        cp .env.example .env
        warn "⚠️  Configure as variáveis no arquivo .env antes de continuar"
    fi
else
    log "✅ Arquivo .env encontrado"
fi

# Criar estrutura de diretórios backend
log "📁 Criando estrutura de diretórios..."
mkdir -p backend/storage/{certificados,xml,pdf,logs}

# Build do frontend para BETA
log "🔨 Gerando build BETA..."
npm run build:dev

if [ ! -d "dist-dev" ]; then
    error "Build falhou - diretório dist-dev não foi criado"
    exit 1
fi

# Criar diretório beta se não existir
log "📁 Preparando diretório beta..."
sudo mkdir -p /var/www/nexo-beta
sudo rm -rf /var/www/nexo-beta/*

# Copiar arquivos para diretório beta
log "📋 Copiando arquivos para /var/www/nexo-beta..."
sudo cp -r dist-dev/* /var/www/nexo-beta/

# Configurar permissões
log "🔐 Configurando permissões..."
sudo chown -R www-data:www-data /var/www/nexo-beta/
sudo chmod -R 755 /var/www/nexo-beta/

# Configurar permissões backend
sudo chown -R www-data:www-data backend/storage/
sudo chmod -R 755 backend/storage/

log "✅ Build BETA concluído!"

echo -e "\n${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    ✅ DEPLOY BETA CONCLUÍDO                  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${BLUE}🎯 PRÓXIMOS PASSOS:${NC}"
echo -e "   1. Configure o DNS: ${GREEN}nexobeta.emasoftware.app → 31.97.166.71${NC}"
echo -e "   2. Configure o Nginx para o domínio beta"
echo -e "   3. Acesse: ${GREEN}https://nexobeta.emasoftware.app${NC}"

echo -e "\n${BLUE}🔧 COMANDOS ÚTEIS:${NC}"
echo -e "   • Rebuild beta: ${YELLOW}./beta.sh${NC}"
echo -e "   • Logs Nginx: ${YELLOW}sudo tail -f /var/log/nginx/nexo-beta-error.log${NC}"
echo -e "   • Status: ${YELLOW}sudo systemctl status nginx${NC}"

echo -e "\n${BLUE}📊 AMBIENTES:${NC}"
echo -e "   • DEV: ${GREEN}http://31.97.166.71:5173${NC} (nexo-dev)"
echo -e "   • BETA: ${GREEN}https://nexobeta.emasoftware.app${NC} (./beta.sh)"
echo -e "   • PROD: ${GREEN}https://nexo.emasoftware.app${NC} (nexo)"

echo -e "\n${GREEN}🧪 Ambiente BETA pronto para testes!${NC}"
