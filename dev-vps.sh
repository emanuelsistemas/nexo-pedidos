#!/bin/bash

# 🚀 Script para rodar Vite dev server na VPS
# Configurado para acesso externo via IP 31.97.166.71:5173

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
echo "║                🚀 NEXO PEDIDOS - DEV VPS                   ║"
echo "║              Vite Dev Server para VPS                       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz do projeto (onde está o package.json)"
    exit 1
fi

# Verificar se a porta 5173 está livre
log "🔍 Verificando porta 5173..."
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null ; then
    warn "Porta 5173 está ocupada. Matando processo..."
    pkill -f "vite" || true
    sleep 2
    
    if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null ; then
        error "Não foi possível liberar a porta 5173"
        info "Execute manualmente: sudo lsof -ti:5173 | xargs sudo kill -9"
        exit 1
    fi
fi

log "✅ Porta 5173 está livre"

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

# Configurar firewall se necessário
log "🔥 Verificando firewall..."
if command -v ufw &> /dev/null; then
    if ufw status | grep -q "Status: active"; then
        if ! ufw status | grep -q "5173"; then
            warn "Porta 5173 não está liberada no firewall"
            info "Execute: sudo ufw allow 5173"
            info "Ou execute: sudo ufw allow 5173/tcp"
        else
            log "✅ Porta 5173 já está liberada no firewall"
        fi
    fi
fi

# Informações importantes
echo -e "\n${BLUE}🎯 INFORMAÇÕES IMPORTANTES:${NC}"
echo -e "   • Servidor será acessível em: ${GREEN}http://31.97.166.71:5173${NC}"
echo -e "   • Hot reload: ${GREEN}✅ Habilitado${NC}"
echo -e "   • CORS: ${GREEN}✅ Habilitado${NC}"
echo -e "   • Host: ${GREEN}0.0.0.0 (acesso externo)${NC}"

echo -e "\n${YELLOW}⚠️  IMPORTANTE:${NC}"
echo -e "   • Mantenha este terminal aberto"
echo -e "   • Para parar: Ctrl+C"
echo -e "   • Para build de produção use: ./build-dev.sh"

echo -e "\n${BLUE}🚀 Iniciando Vite dev server...${NC}"
echo -e "${GREEN}Aguarde alguns segundos para o servidor inicializar...${NC}\n"

# Iniciar o servidor Vite
npm run dev
