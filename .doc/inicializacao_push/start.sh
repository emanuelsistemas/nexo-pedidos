#!/bin/bash

# 🚀 Script de Inicialização Nexo Pedidos (Sem Vite)
# Este script automatiza o processo de build e inicialização

set -e  # Parar em caso de erro

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
echo "║                    🚀 NEXO PEDIDOS                          ║"
echo "║              Inicialização Sem Vite                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz do projeto (onde está o package.json)"
    exit 1
fi

# 1. Verificar dependências
log "🔍 Verificando dependências..."

# Node.js
if ! command -v node &> /dev/null; then
    error "Node.js não encontrado. Instale Node.js 18+"
    exit 1
fi

# PHP
if ! command -v php &> /dev/null; then
    error "PHP não encontrado. Instale PHP 7.4+"
    exit 1
fi

# Nginx
if ! command -v nginx &> /dev/null; then
    error "Nginx não encontrado. Instale Nginx"
    exit 1
fi

# Composer
if ! command -v composer &> /dev/null; then
    error "Composer não encontrado. Instale Composer"
    exit 1
fi

log "✅ Todas as dependências encontradas"

# 2. Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    log "📦 Instalando dependências do frontend..."
    npm install
else
    info "📦 Dependências do frontend já instaladas"
fi

if [ ! -d "backend/vendor" ]; then
    log "📦 Instalando dependências do backend..."
    cd backend
    composer install --no-dev --optimize-autoloader
    cd ..
else
    info "📦 Dependências do backend já instaladas"
fi

# 3. Verificar arquivo .env
if [ ! -f ".env" ]; then
    warn "Arquivo .env não encontrado"
    if [ -f ".env.example" ]; then
        log "📝 Criando .env a partir do .env.example..."
        cp .env.example .env
        warn "⚠️  Configure as variáveis no arquivo .env antes de continuar"
        info "   VITE_SUPABASE_URL=sua_url_supabase"
        info "   VITE_SUPABASE_ANON_KEY=sua_chave_supabase"
    else
        error "Arquivo .env.example não encontrado"
        exit 1
    fi
else
    log "✅ Arquivo .env encontrado"
fi

# 4. Criar estrutura de diretórios backend
log "📁 Criando estrutura de diretórios..."
mkdir -p backend/storage/{certificados,xml,pdf,logs}

# 5. Build do frontend
log "🔨 Gerando build do frontend..."
npm run build

if [ ! -d "dist" ]; then
    error "Build falhou - diretório dist não foi criado"
    exit 1
fi

log "✅ Build gerado com sucesso em /dist"

# 6. Configurar permissões
log "🔐 Configurando permissões..."
if command -v sudo &> /dev/null; then
    sudo chown -R www-data:www-data backend/storage/ 2>/dev/null || warn "Não foi possível alterar owner para www-data"
    sudo chmod -R 755 backend/storage/
    sudo chown -R www-data:www-data dist/ 2>/dev/null || warn "Não foi possível alterar owner do dist para www-data"
else
    chmod -R 755 backend/storage/
    warn "Sudo não disponível - configure permissões manualmente se necessário"
fi

# 7. Verificar configuração Nginx
log "🌐 Verificando configuração Nginx..."

NGINX_CONF="/etc/nginx/sites-available/nexo-pedidos"
NGINX_ENABLED="/etc/nginx/sites-enabled/nexo-pedidos"

if [ ! -f "$NGINX_CONF" ]; then
    warn "Configuração Nginx não encontrada em $NGINX_CONF"
    info "Execute: sudo cp nginx.conf $NGINX_CONF"
    info "Execute: sudo ln -s $NGINX_CONF $NGINX_ENABLED"
    info "Execute: sudo nginx -t && sudo systemctl reload nginx"
else
    log "✅ Configuração Nginx encontrada"
fi

# 8. Verificar serviços
log "🔧 Verificando serviços..."

# PHP-FPM
if systemctl is-active --quiet php7.4-fpm; then
    log "✅ PHP-FPM está rodando"
else
    warn "PHP-FPM não está rodando"
    info "Execute: sudo systemctl start php7.4-fpm"
fi

# Nginx
if systemctl is-active --quiet nginx; then
    log "✅ Nginx está rodando"
else
    warn "Nginx não está rodando"
    info "Execute: sudo systemctl start nginx"
fi

# 9. Teste básico
log "🧪 Testando endpoints..."

# Teste frontend
if curl -s -o /dev/null -w "%{http_code}" http://localhost/ | grep -q "200"; then
    log "✅ Frontend acessível em http://localhost/"
else
    warn "Frontend não acessível - verifique configuração Nginx"
fi

# Teste backend
if curl -s -o /dev/null -w "%{http_code}" http://localhost/backend/public/status-nfe.php | grep -q "200"; then
    log "✅ Backend acessível"
else
    warn "Backend não acessível - verifique PHP-FPM"
fi

# 10. Resumo final
echo -e "\n${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    ✅ INICIALIZAÇÃO CONCLUÍDA                ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${BLUE}🎯 PRÓXIMOS PASSOS:${NC}"
echo -e "   1. Configure o arquivo .env com suas credenciais Supabase"
echo -e "   2. Acesse: ${GREEN}http://localhost/${NC}"
echo -e "   3. Faça upload do certificado digital na seção NFe"

echo -e "\n${BLUE}🔧 COMANDOS ÚTEIS:${NC}"
echo -e "   • Rebuild: ${YELLOW}npm run build && sudo systemctl reload nginx${NC}"
echo -e "   • Logs: ${YELLOW}sudo tail -f /var/log/nginx/nexo-error.log${NC}"
echo -e "   • Status: ${YELLOW}sudo systemctl status nginx php7.4-fpm${NC}"

echo -e "\n${BLUE}📊 ENDPOINTS:${NC}"
echo -e "   • Frontend: ${GREEN}http://localhost/${NC}"
echo -e "   • API Status: ${GREEN}http://localhost/backend/public/status-nfe.php${NC}"
echo -e "   • Logs API: ${GREEN}http://localhost/backend/public/logs.php${NC}"

echo -e "\n${GREEN}🚀 Sistema pronto para uso!${NC}"
