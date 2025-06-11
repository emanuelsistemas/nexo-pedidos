#!/bin/bash

# ===================================================================
# SCRIPT DE DIAGNÓSTICO - SISTEMA DE EMAIL NFe
# ===================================================================
# Este script verifica a configuração e funcionamento do sistema
# de email para NFe no Sistema Nexo.
#
# Uso: ./diagnostico-email.sh
# ===================================================================

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir com cores
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️ $1${NC}"; }
print_header() { echo -e "${BLUE}=== $1 ===${NC}"; }

# Variáveis
PROJECT_ROOT="/root/nexo/nexo-pedidos"
BACKEND_ROOT="$PROJECT_ROOT/backend"
STORAGE_ROOT="$PROJECT_ROOT/storage"
LOG_FILE="/tmp/diagnostico-email-$(date +%Y%m%d-%H%M%S).log"

# Iniciar log
echo "Diagnóstico iniciado em $(date)" > "$LOG_FILE"

print_header "DIAGNÓSTICO DO SISTEMA DE EMAIL NFe"
echo "Data: $(date)"
echo "Log salvo em: $LOG_FILE"
echo ""

# ===================================================================
# 1. VERIFICAR ESTRUTURA DE DIRETÓRIOS
# ===================================================================
print_header "1. VERIFICANDO ESTRUTURA DE DIRETÓRIOS"

if [ -d "$PROJECT_ROOT" ]; then
    print_success "Diretório do projeto encontrado: $PROJECT_ROOT"
else
    print_error "Diretório do projeto não encontrado: $PROJECT_ROOT"
    exit 1
fi

if [ -d "$BACKEND_ROOT" ]; then
    print_success "Diretório backend encontrado"
else
    print_error "Diretório backend não encontrado"
fi

if [ -d "$STORAGE_ROOT" ]; then
    print_success "Diretório storage encontrado"
else
    print_error "Diretório storage não encontrado"
fi

echo ""

# ===================================================================
# 2. VERIFICAR ARQUIVOS DO SISTEMA
# ===================================================================
print_header "2. VERIFICANDO ARQUIVOS DO SISTEMA"

FILES_TO_CHECK=(
    "$BACKEND_ROOT/src/Services/EmailService.php"
    "$BACKEND_ROOT/public/enviar-nfe-email.php"
    "$BACKEND_ROOT/templates/email-nfe.html"
    "$BACKEND_ROOT/templates/email-nfe.txt"
    "$PROJECT_ROOT/.env"
)

for file in "${FILES_TO_CHECK[@]}"; do
    if [ -f "$file" ]; then
        print_success "$(basename "$file")"
        echo "Arquivo: $file" >> "$LOG_FILE"
    else
        print_error "$(basename "$file") - NÃO ENCONTRADO"
        echo "ERRO: Arquivo não encontrado: $file" >> "$LOG_FILE"
    fi
done

echo ""

# ===================================================================
# 3. VERIFICAR CONFIGURAÇÕES DO .ENV
# ===================================================================
print_header "3. VERIFICANDO CONFIGURAÇÕES DO .ENV"

if [ -f "$PROJECT_ROOT/.env" ]; then
    print_info "Verificando configurações de email..."
    
    # Verificar cada configuração necessária
    ENV_VARS=("MAIL_HOST" "MAIL_PORT" "MAIL_USERNAME" "MAIL_PASSWORD" "MAIL_FROM_ADDRESS")
    
    for var in "${ENV_VARS[@]}"; do
        if grep -q "^$var=" "$PROJECT_ROOT/.env"; then
            if [ "$var" = "MAIL_PASSWORD" ]; then
                print_success "$var=***OCULTO***"
            else
                value=$(grep "^$var=" "$PROJECT_ROOT/.env" | cut -d'=' -f2)
                print_success "$var=$value"
            fi
        else
            print_error "$var não configurado"
        fi
    done
else
    print_error "Arquivo .env não encontrado"
fi

echo ""

# ===================================================================
# 4. VERIFICAR DEPENDÊNCIAS PHP
# ===================================================================
print_header "4. VERIFICANDO DEPENDÊNCIAS PHP"

# Verificar se PHP está instalado
if command -v php >/dev/null 2>&1; then
    PHP_VERSION=$(php -v | head -n1)
    print_success "PHP instalado: $PHP_VERSION"
else
    print_error "PHP não encontrado"
    exit 1
fi

# Verificar extensões necessárias
PHP_EXTENSIONS=("openssl" "curl" "mbstring" "json")

for ext in "${PHP_EXTENSIONS[@]}"; do
    if php -m | grep -q "^$ext$"; then
        print_success "Extensão $ext"
    else
        print_error "Extensão $ext não encontrada"
    fi
done

# Verificar Composer
if [ -f "$BACKEND_ROOT/vendor/autoload.php" ]; then
    print_success "Composer autoload encontrado"
else
    print_error "Composer autoload não encontrado"
fi

# Verificar PHPMailer
if [ -d "$BACKEND_ROOT/vendor/phpmailer" ]; then
    print_success "PHPMailer instalado"
else
    print_error "PHPMailer não encontrado"
fi

echo ""

# ===================================================================
# 5. VERIFICAR CONECTIVIDADE SMTP
# ===================================================================
print_header "5. VERIFICANDO CONECTIVIDADE SMTP"

# Testar conectividade com Gmail
if command -v nc >/dev/null 2>&1; then
    print_info "Testando conectividade com smtp.gmail.com:587..."
    if timeout 5 nc -z smtp.gmail.com 587 2>/dev/null; then
        print_success "Conectividade SMTP OK"
    else
        print_error "Falha na conectividade SMTP"
    fi
else
    print_warning "netcat não instalado - não foi possível testar conectividade"
fi

# Verificar se curl está disponível
if command -v curl >/dev/null 2>&1; then
    print_success "cURL disponível para testes"
else
    print_error "cURL não encontrado"
fi

echo ""

# ===================================================================
# 6. VERIFICAR ESTRUTURA DE STORAGE
# ===================================================================
print_header "6. VERIFICANDO ESTRUTURA DE STORAGE"

if [ -d "$STORAGE_ROOT" ]; then
    # Verificar diretórios principais
    STORAGE_DIRS=("xml" "pdf" "espelhos")
    
    for dir in "${STORAGE_DIRS[@]}"; do
        if [ -d "$STORAGE_ROOT/$dir" ]; then
            print_success "Diretório $dir existe"
            
            # Contar empresas
            empresa_count=$(find "$STORAGE_ROOT/$dir" -maxdepth 1 -name "empresa_*" -type d 2>/dev/null | wc -l)
            if [ "$empresa_count" -gt 0 ]; then
                print_info "  → $empresa_count empresa(s) encontrada(s)"
            else
                print_warning "  → Nenhuma empresa encontrada"
            fi
        else
            print_error "Diretório $dir não existe"
        fi
    done
    
    # Verificar arquivos recentes
    xml_count=$(find "$STORAGE_ROOT" -name "*.xml" -mtime -7 2>/dev/null | wc -l)
    pdf_count=$(find "$STORAGE_ROOT" -name "*.pdf" -mtime -7 2>/dev/null | wc -l)
    
    print_info "Arquivos da última semana:"
    print_info "  → XMLs: $xml_count"
    print_info "  → PDFs: $pdf_count"
else
    print_error "Diretório storage não encontrado"
fi

echo ""

# ===================================================================
# 7. TESTAR EMAILSERVICE
# ===================================================================
print_header "7. TESTANDO EMAILSERVICE"

if [ -f "$BACKEND_ROOT/src/Services/EmailService.php" ]; then
    print_info "Testando carregamento da classe EmailService..."
    
    cd "$BACKEND_ROOT"
    
    # Criar script de teste temporário
    cat > /tmp/test_email_service.php << 'EOF'
<?php
require_once 'vendor/autoload.php';
require_once 'src/Services/EmailService.php';

try {
    $service = new \NexoNFe\Services\EmailService();
    echo "SUCCESS: EmailService carregado com sucesso\n";
    
    $config = $service->verificarConfiguracao();
    if ($config['configurado']) {
        echo "SUCCESS: Configuração válida\n";
    } else {
        echo "ERROR: Problemas na configuração:\n";
        foreach ($config['problemas'] as $problema) {
            echo "  - $problema\n";
        }
    }
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
EOF

    # Executar teste
    php_output=$(php /tmp/test_email_service.php 2>&1)
    
    if echo "$php_output" | grep -q "SUCCESS: EmailService carregado"; then
        print_success "EmailService carregado com sucesso"
    else
        print_error "Erro ao carregar EmailService"
        echo "$php_output" >> "$LOG_FILE"
    fi
    
    if echo "$php_output" | grep -q "SUCCESS: Configuração válida"; then
        print_success "Configuração de email válida"
    else
        print_warning "Problemas na configuração de email"
    fi
    
    # Limpar arquivo temporário
    rm -f /tmp/test_email_service.php
else
    print_error "EmailService.php não encontrado"
fi

echo ""

# ===================================================================
# 8. VERIFICAR LOGS
# ===================================================================
print_header "8. VERIFICANDO LOGS"

LOG_FILES=(
    "/var/log/php_errors.log"
    "/var/log/nginx/error.log"
    "/var/log/nginx/access.log"
)

for log_file in "${LOG_FILES[@]}"; do
    if [ -f "$log_file" ]; then
        print_success "$(basename "$log_file") encontrado"
        
        # Verificar erros relacionados a email nas últimas 24h
        email_errors=$(grep -i "email\|smtp\|mail" "$log_file" 2>/dev/null | tail -5 | wc -l)
        if [ "$email_errors" -gt 0 ]; then
            print_warning "  → $email_errors entradas relacionadas a email encontradas"
        fi
    else
        print_warning "$(basename "$log_file") não encontrado"
    fi
done

echo ""

# ===================================================================
# 9. TESTAR API DE ENVIO
# ===================================================================
print_header "9. TESTANDO API DE ENVIO"

if command -v curl >/dev/null 2>&1; then
    print_info "Testando endpoint de envio de email..."
    
    # Testar se a API responde
    api_response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST http://localhost/backend/public/enviar-nfe-email.php \
        -H "Content-Type: application/json" \
        -d '{"test": true}' 2>/dev/null)
    
    if [ "$api_response" = "200" ] || [ "$api_response" = "400" ] || [ "$api_response" = "500" ]; then
        print_success "API respondendo (HTTP $api_response)"
    else
        print_error "API não respondendo (HTTP $api_response)"
    fi
else
    print_warning "cURL não disponível para testar API"
fi

echo ""

# ===================================================================
# 10. VERIFICAR PERMISSÕES
# ===================================================================
print_header "10. VERIFICANDO PERMISSÕES"

# Verificar permissões dos diretórios importantes
DIRS_TO_CHECK=(
    "$BACKEND_ROOT/templates"
    "$BACKEND_ROOT/src/Services"
    "$STORAGE_ROOT"
)

for dir in "${DIRS_TO_CHECK[@]}"; do
    if [ -d "$dir" ]; then
        perms=$(stat -c "%a" "$dir" 2>/dev/null)
        if [ "$perms" ]; then
            print_success "$(basename "$dir"): $perms"
        else
            print_warning "Não foi possível verificar permissões de $(basename "$dir")"
        fi
    fi
done

echo ""

# ===================================================================
# 11. RESUMO E RECOMENDAÇÕES
# ===================================================================
print_header "11. RESUMO E RECOMENDAÇÕES"

# Contar sucessos e erros
success_count=$(grep -c "✅" "$LOG_FILE" 2>/dev/null || echo "0")
error_count=$(grep -c "❌" "$LOG_FILE" 2>/dev/null || echo "0")
warning_count=$(grep -c "⚠️" "$LOG_FILE" 2>/dev/null || echo "0")

echo "Resultados do diagnóstico:"
print_success "Sucessos: $success_count"
print_warning "Avisos: $warning_count"
print_error "Erros: $error_count"

echo ""

if [ "$error_count" -eq 0 ]; then
    print_success "Sistema de email aparenta estar funcionando corretamente!"
    echo ""
    print_info "Próximos passos recomendados:"
    echo "  1. Testar envio de email via interface web"
    echo "  2. Emitir uma NFe de teste e verificar envio automático"
    echo "  3. Testar reenvio manual pelo menu de ações"
elif [ "$error_count" -lt 3 ]; then
    print_warning "Sistema parcialmente configurado - alguns ajustes necessários"
    echo ""
    print_info "Consulte o arquivo TROUBLESHOOTING.md para soluções"
else
    print_error "Sistema com problemas significativos"
    echo ""
    print_info "Recomendações:"
    echo "  1. Verificar configuração do .env"
    echo "  2. Instalar dependências faltantes"
    echo "  3. Consultar documentação completa"
fi

echo ""
print_info "Log completo salvo em: $LOG_FILE"
print_info "Documentação disponível em: $PROJECT_ROOT/Doc/email/"

echo ""
print_header "DIAGNÓSTICO CONCLUÍDO"

# Salvar resumo no log
echo "" >> "$LOG_FILE"
echo "=== RESUMO ===" >> "$LOG_FILE"
echo "Sucessos: $success_count" >> "$LOG_FILE"
echo "Avisos: $warning_count" >> "$LOG_FILE"
echo "Erros: $error_count" >> "$LOG_FILE"
echo "Diagnóstico concluído em $(date)" >> "$LOG_FILE"
