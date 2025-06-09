#!/bin/bash

# Script para executar reorganização completa da estrutura de storage
# Inclui separação por modelo de documento (55=NFe, 65=NFCe)

echo "🚀 INICIANDO REORGANIZAÇÃO COMPLETA DA ESTRUTURA DE STORAGE"
echo "📋 Incluindo separação por modelo de documento (55=NFe, 65=NFCe)"
echo ""

# Definir diretório base
BACKEND_DIR="/root/nexo/nexo-pedidos/backend"
cd "$BACKEND_DIR" || exit 1

# Função para verificar se comando foi executado com sucesso
check_success() {
    if [ $? -eq 0 ]; then
        echo "✅ $1 - Concluído com sucesso"
    else
        echo "❌ $1 - Erro durante execução"
        exit 1
    fi
}

# Função para fazer backup da estrutura atual
backup_storage() {
    echo "💾 Criando backup da estrutura atual..."
    
    BACKUP_DIR="storage_backup_$(date +%Y%m%d_%H%M%S)"
    
    if [ -d "storage" ]; then
        cp -r storage "$BACKUP_DIR"
        echo "✅ Backup criado em: $BACKUP_DIR"
    else
        echo "⚠️  Diretório storage não encontrado, pulando backup"
    fi
}

# Função para verificar espaço em disco
check_disk_space() {
    echo "💽 Verificando espaço em disco..."
    
    AVAILABLE=$(df . | tail -1 | awk '{print $4}')
    USED_STORAGE=$(du -s storage 2>/dev/null | awk '{print $1}' || echo "0")
    NEEDED=$((USED_STORAGE * 2)) # Espaço para backup + reorganização
    
    if [ "$AVAILABLE" -lt "$NEEDED" ]; then
        echo "❌ Espaço insuficiente em disco"
        echo "   Disponível: ${AVAILABLE}KB"
        echo "   Necessário: ${NEEDED}KB"
        exit 1
    else
        echo "✅ Espaço em disco suficiente"
    fi
}

# Função para validar estrutura atual
validate_current_structure() {
    echo "🔍 Validando estrutura atual..."
    
    if [ ! -d "storage" ]; then
        echo "⚠️  Diretório storage não existe, criando estrutura básica..."
        mkdir -p storage/{xml,pdf,espelhos,certificados,logs}
        echo "✅ Estrutura básica criada"
        return 0
    fi
    
    # Verificar se há dados para migrar
    EMPRESAS_XML=$(find storage/xml -name "empresa_*" -type d 2>/dev/null | wc -l)
    EMPRESAS_PDF=$(find storage/pdf -name "empresa_*" -type d 2>/dev/null | wc -l)
    EMPRESAS_ESPELHOS=$(find storage/espelhos -maxdepth 1 -type d 2>/dev/null | grep -v "^storage/espelhos$" | wc -l)
    
    echo "📊 Dados encontrados:"
    echo "   XMLs: $EMPRESAS_XML empresas"
    echo "   PDFs: $EMPRESAS_PDF empresas"
    echo "   Espelhos: $EMPRESAS_ESPELHOS empresas"
    
    if [ "$EMPRESAS_XML" -eq 0 ] && [ "$EMPRESAS_PDF" -eq 0 ] && [ "$EMPRESAS_ESPELHOS" -eq 0 ]; then
        echo "ℹ️  Nenhum dado encontrado para migrar"
        return 1
    fi
    
    return 0
}

# Função principal de reorganização
reorganize_storage() {
    echo "🔄 Executando reorganização da estrutura..."
    
    # 1. Reorganizar arquivos por modelo
    echo "📁 Passo 1: Reorganizando por modelo de documento..."
    php reorganizar-estrutura-modelo.php
    check_success "Reorganização por modelo"
    
    # 2. Atualizar referências no código
    echo "📝 Passo 2: Atualizando referências no código..."
    php atualizar-referencias-modelo.php
    check_success "Atualização de referências"
    
    echo "✅ Reorganização concluída!"
}

# Função para validar nova estrutura
validate_new_structure() {
    echo "🔍 Validando nova estrutura..."
    
    # Verificar se estrutura foi criada corretamente
    ESTRUTURA_OK=true
    
    # Verificar diretórios base
    for tipo in xml pdf espelhos; do
        if [ ! -d "storage/$tipo" ]; then
            echo "❌ Diretório storage/$tipo não encontrado"
            ESTRUTURA_OK=false
        fi
    done
    
    # Verificar se há empresas com nova estrutura
    EMPRESAS_NOVA_ESTRUTURA=$(find storage/xml -path "*/55/*" -type d 2>/dev/null | wc -l)
    
    if [ "$EMPRESAS_NOVA_ESTRUTURA" -gt 0 ]; then
        echo "✅ Nova estrutura com modelo 55 detectada"
    else
        echo "⚠️  Nova estrutura não detectada (pode ser normal se não há dados)"
    fi
    
    if [ "$ESTRUTURA_OK" = true ]; then
        echo "✅ Estrutura validada com sucesso"
        return 0
    else
        echo "❌ Problemas na estrutura detectados"
        return 1
    fi
}

# Função para mostrar resumo final
show_summary() {
    echo ""
    echo "📋 RESUMO DA REORGANIZAÇÃO:"
    echo "=========================="
    echo ""
    echo "🎯 NOVA ESTRUTURA IMPLEMENTADA:"
    echo "storage/"
    echo "├── xml/"
    echo "│   └── empresa_{id}/"
    echo "│       ├── homologacao/"
    echo "│       │   ├── 55/                    # NFe"
    echo "│       │   │   ├── Autorizados/{ano}/{mes}/"
    echo "│       │   │   ├── Cancelados/{ano}/{mes}/"
    echo "│       │   │   └── CCe/{ano}/{mes}/"
    echo "│       │   └── 65/                    # NFCe (futuro)"
    echo "│       │       ├── Autorizados/{ano}/{mes}/"
    echo "│       │       └── Cancelados/{ano}/{mes}/"
    echo "│       └── producao/"
    echo "│           ├── 55/ (mesma estrutura)"
    echo "│           └── 65/ (mesma estrutura)"
    echo "├── pdf/"
    echo "│   └── empresa_{id}/ (mesma estrutura do XML)"
    echo "└── espelhos/"
    echo "    └── empresa_{id}/"
    echo "        ├── homologacao/"
    echo "        │   ├── 55/                    # Espelhos NFe"
    echo "        │   └── 65/                    # Espelhos NFCe (futuro)"
    echo "        └── producao/"
    echo "            ├── 55/"
    echo "            └── 65/"
    echo ""
    echo "🚀 BENEFÍCIOS:"
    echo "• ✅ Separação clara entre NFe (55) e NFCe (65)"
    echo "• ✅ Não há mais mistura de documentos"
    echo "• ✅ Estrutura preparada para implementação de NFCe"
    echo "• ✅ Organização por ambiente mantida"
    echo "• ✅ Organização por status mantida"
    echo "• ✅ Organização por data mantida"
    echo ""
    echo "📚 PRÓXIMOS PASSOS:"
    echo "• Implementar NFCe usando modelo 65"
    echo "• Testar emissão de NFe com nova estrutura"
    echo "• Verificar Portal do Contador"
    echo "• Atualizar documentação"
    echo ""
    echo "✅ REORGANIZAÇÃO CONCLUÍDA COM SUCESSO!"
}

# EXECUÇÃO PRINCIPAL
echo "🔍 Verificações preliminares..."

# 1. Verificar espaço em disco
check_disk_space

# 2. Validar estrutura atual
if validate_current_structure; then
    HAS_DATA=true
else
    HAS_DATA=false
fi

# 3. Criar backup se há dados
if [ "$HAS_DATA" = true ]; then
    backup_storage
fi

# 4. Executar reorganização
reorganize_storage

# 5. Validar nova estrutura
validate_new_structure

# 6. Mostrar resumo
show_summary

echo ""
echo "🎉 PROCESSO CONCLUÍDO!"
echo "📁 Verifique os backups em caso de problemas"
echo "🧪 Teste a emissão de NFe para validar funcionamento"
