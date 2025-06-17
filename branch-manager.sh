#!/bin/bash

# 🌿 Gerenciador de Branches - Nexo Pedidos
# Facilita mudança entre branches e merges

PROJECT_DIR="/root/nexo-pedidos"
cd "$PROJECT_DIR"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠️${NC} $1"; }
error() { echo -e "${RED}[$(date +'%H:%M:%S')] ❌${NC} $1"; }
info() { echo -e "${BLUE}[$(date +'%H:%M:%S')] ℹ️${NC} $1"; }

# Função para mostrar status das branches
show_status() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                🌿 STATUS DAS BRANCHES                       ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    CURRENT_BRANCH=$(git branch --show-current)
    echo -e "📍 Branch atual: ${GREEN}$CURRENT_BRANCH${NC}\n"
    
    echo -e "${BLUE}🌿 Branches disponíveis:${NC}"
    git branch -a
    
    echo -e "\n${BLUE}📊 Últimos commits por branch:${NC}"
    for branch in dev beta main; do
        if git show-ref --verify --quiet refs/heads/$branch; then
            LAST_COMMIT=$(git log $branch --oneline -1)
            echo -e "   • ${GREEN}$branch${NC}: $LAST_COMMIT"
        fi
    done
}

# Função para mudança de branch
change_branch() {
    local target_branch=$1
    local current_branch=$(git branch --show-current)
    
    if [ "$current_branch" = "$target_branch" ]; then
        warn "Você já está na branch $target_branch"
        return 0
    fi
    
    # Verificar se há mudanças não commitadas
    if ! git diff --quiet || ! git diff --cached --quiet; then
        warn "Há mudanças não commitadas!"
        echo -e "Opções:"
        echo -e "1. ${YELLOW}push${NC} - Fazer commit e push das mudanças"
        echo -e "2. ${YELLOW}stash${NC} - Guardar mudanças temporariamente"
        echo -e "3. ${YELLOW}discard${NC} - Descartar mudanças"
        echo -e "4. ${YELLOW}cancel${NC} - Cancelar mudança de branch"
        
        read -p "Escolha uma opção (1-4): " choice
        case $choice in
            1) 
                log "Fazendo push das mudanças..."
                push
                ;;
            2)
                log "Guardando mudanças no stash..."
                git stash push -m "Mudanças salvas antes de trocar para $target_branch"
                ;;
            3)
                log "Descartando mudanças..."
                git reset --hard HEAD
                git clean -fd
                ;;
            4)
                info "Mudança de branch cancelada"
                return 0
                ;;
            *)
                error "Opção inválida"
                return 1
                ;;
        esac
    fi
    
    log "Mudando para branch $target_branch..."
    git checkout $target_branch
    
    if [ $? -eq 0 ]; then
        log "✅ Agora você está na branch $target_branch"
        
        # Informações específicas da branch
        case $target_branch in
            "dev")
                echo -e "\n${BLUE}🔥 BRANCH DE DESENVOLVIMENTO${NC}"
                echo -e "   • Para desenvolver: ${GREEN}nexo-dev${NC}"
                echo -e "   • Para commit: ${GREEN}push${NC}"
                ;;
            "beta")
                echo -e "\n${BLUE}🧪 BRANCH DE TESTE${NC}"
                echo -e "   • Para deploy beta: ${GREEN}nexo-beta${NC}"
                echo -e "   • URL: ${GREEN}https://nexobeta.emasoftware.app${NC}"
                ;;
            "main")
                echo -e "\n${BLUE}🛡️ BRANCH DE PRODUÇÃO${NC}"
                echo -e "   • Para deploy prod: ${GREEN}nexo${NC}"
                echo -e "   • URL: ${GREEN}https://nexo.emasoftware.app${NC}"
                ;;
        esac
    else
        error "Falha ao mudar para branch $target_branch"
        return 1
    fi
}

# Função para merge entre branches
merge_branch() {
    local source_branch=$1
    local target_branch=$2
    local current_branch=$(git branch --show-current)
    
    if [ "$current_branch" != "$target_branch" ]; then
        log "Mudando para branch $target_branch..."
        git checkout $target_branch
    fi
    
    log "Fazendo merge de $source_branch para $target_branch..."
    git merge $source_branch
    
    if [ $? -eq 0 ]; then
        log "✅ Merge concluído com sucesso!"
        
        # Push automático após merge
        read -p "Fazer push do merge? (Y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
            push
        fi
    else
        error "Conflito no merge! Resolva os conflitos e execute 'git commit'"
    fi
}

# Menu principal
case $1 in
    "status"|"s")
        show_status
        ;;
    "dev"|"d")
        change_branch "dev"
        ;;
    "beta"|"b")
        change_branch "beta"
        ;;
    "main"|"prod"|"p")
        change_branch "main"
        ;;
    "merge")
        if [ -z "$2" ] || [ -z "$3" ]; then
            error "Uso: branch merge <origem> <destino>"
            echo "Exemplo: branch merge dev beta"
            exit 1
        fi
        merge_branch $2 $3
        ;;
    *)
        echo -e "${BLUE}🌿 Gerenciador de Branches - Nexo Pedidos${NC}\n"
        echo "Uso: branch <comando>"
        echo ""
        echo "Comandos disponíveis:"
        echo "  status, s          - Mostrar status das branches"
        echo "  dev, d            - Mudar para branch dev"
        echo "  beta, b           - Mudar para branch beta"
        echo "  main, prod, p     - Mudar para branch main"
        echo "  merge <orig> <dest> - Fazer merge entre branches"
        echo ""
        echo "Exemplos:"
        echo "  branch dev        - Vai para desenvolvimento"
        echo "  branch beta       - Vai para testes"
        echo "  branch main       - Vai para produção"
        echo "  branch merge dev beta - Merge dev → beta"
        ;;
esac
