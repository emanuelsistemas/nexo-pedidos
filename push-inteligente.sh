#!/bin/bash

# 🚀 Push Inteligente com Sistema de Branches
# Comando personalizado que detecta a branch e faz push automático

# Caminho fixo para o repositório do projeto
PROJECT_DIR="/root/nexo-pedidos"

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

# Mudar para o diretório raiz do projeto
cd "$PROJECT_DIR"

# Verificar se o diretório atual é um repositório git
if [ ! -d .git ]; then
    error "Este diretório não é um repositório git."
    exit 1
fi

# Obter branch atual
CURRENT_BRANCH=$(git branch --show-current)
DATA_HORA=$(TZ="America/Sao_Paulo" date "+%d/%m/%Y %H:%M:%S")

# Banner com informações da branch
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                🚀 PUSH INTELIGENTE                          ║"
echo "║              Branch: $CURRENT_BRANCH                                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Verificar se há mudanças para commit
if git diff --quiet && git diff --cached --quiet; then
    warn "Nenhuma mudança detectada para commit"
    info "Status do repositório:"
    git status --short
    exit 0
fi

# Mostrar arquivos que serão commitados
log "📁 Arquivos que serão commitados:"
git status --short

# Adicionar todos os arquivos modificados
log "📦 Adicionando arquivos modificados..."
git add .

# Mensagem de commit baseada na branch
case $CURRENT_BRANCH in
    "dev")
        COMMIT_MSG="🔥 DEV: Atualização em $DATA_HORA"
        EMOJI="🔥"
        ;;
    "beta")
        COMMIT_MSG="🧪 BETA: Deploy para testes em $DATA_HORA"
        EMOJI="🧪"
        ;;
    "main")
        COMMIT_MSG="🛡️ PROD: Release em $DATA_HORA"
        EMOJI="🛡️"
        ;;
    *)
        COMMIT_MSG="📝 $CURRENT_BRANCH: Atualização em $DATA_HORA"
        EMOJI="📝"
        ;;
esac

# Realizar o commit
log "$EMOJI Realizando commit na branch $CURRENT_BRANCH..."
git commit -m "$COMMIT_MSG"

if [ $? -ne 0 ]; then
    error "Falha no commit"
    exit 1
fi

# Realizar o push
log "🚀 Enviando para origin/$CURRENT_BRANCH..."
git push

if [ $? -eq 0 ]; then
    log "✅ Push concluído com sucesso!"
    
    # Informações pós-push baseadas na branch
    case $CURRENT_BRANCH in
        "dev")
            echo -e "\n${BLUE}🎯 PRÓXIMOS PASSOS:${NC}"
            echo -e "   • Teste no desenvolvimento: ${GREEN}nexo-dev${NC}"
            echo -e "   • Quando pronto, mova para beta: ${YELLOW}git checkout beta && git merge dev${NC}"
            ;;
        "beta")
            echo -e "\n${BLUE}🎯 PRÓXIMOS PASSOS:${NC}"
            echo -e "   • Deploy para beta: ${GREEN}nexo-beta${NC}"
            echo -e "   • Teste em: ${GREEN}https://nexobeta.emasoftware.app${NC}"
            echo -e "   • Quando aprovado, mova para main: ${YELLOW}git checkout main && git merge beta${NC}"
            ;;
        "main")
            echo -e "\n${BLUE}🎯 PRÓXIMOS PASSOS:${NC}"
            echo -e "   • Deploy para produção: ${GREEN}nexo${NC}"
            echo -e "   • Acesse: ${GREEN}https://nexo.emasoftware.app${NC}"
            ;;
    esac
    
    echo -e "\n${BLUE}📊 STATUS ATUAL:${NC}"
    echo -e "   • Branch: ${GREEN}$CURRENT_BRANCH${NC}"
    echo -e "   • Último commit: ${GREEN}$COMMIT_MSG${NC}"
    echo -e "   • Repositório: ${GREEN}https://github.com/emanuelsistemas/nexo-pedidos${NC}"
    
else
    error "Falha no push"
    exit 1
fi
