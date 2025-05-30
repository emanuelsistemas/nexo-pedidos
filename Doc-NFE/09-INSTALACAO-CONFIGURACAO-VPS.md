# 🚀 Scripts de Instalação e Configuração - VPS NFe

## 📋 Script de Instalação Automática

### install-nfe-api.sh
```bash
#!/bin/bash

# Script de instalação automática da API NFe
# Ubuntu 22.04 LTS

echo "🚀 Iniciando instalação da API NFe..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Verificar se é root
if [[ $EUID -eq 0 ]]; then
   error "Este script não deve ser executado como root"
fi

# Atualizar sistema
log "Atualizando sistema..."
sudo apt update && sudo apt upgrade -y

# Instalar dependências
log "Instalando PHP e dependências..."
sudo apt install -y nginx php8.1-fpm php8.1-cli php8.1-xml php8.1-curl \
php8.1-zip php8.1-mbstring php8.1-gd php8.1-soap php8.1-dom \
php8.1-openssl php8.1-json unzip git curl

# Verificar instalação PHP
if ! command -v php &> /dev/null; then
    error "PHP não foi instalado corretamente"
fi

log "PHP $(php -v | head -n1) instalado com sucesso"

# Instalar Composer
log "Instalando Composer..."
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
sudo chmod +x /usr/local/bin/composer

# Verificar Composer
if ! command -v composer &> /dev/null; then
    error "Composer não foi instalado corretamente"
fi

log "Composer $(composer --version) instalado com sucesso"

# Criar estrutura de diretórios
log "Criando estrutura de diretórios..."
sudo mkdir -p /var/www/nfe-api/{public,src/{Controllers,Services,Config,Utils},storage/{certificados,xmls,logs}}
sudo chown -R www-data:www-data /var/www/nfe-api
sudo chmod -R 755 /var/www/nfe-api

# Criar composer.json
log "Criando composer.json..."
cat > /tmp/composer.json << 'EOF'
{
    "name": "nexo/nfe-api",
    "description": "API NFe para Sistema Nexo Pedidos",
    "type": "project",
    "require": {
        "php": "^8.1",
        "nfephp-org/sped-nfe": "^6.0",
        "nfephp-org/sped-common": "^6.0"
    },
    "autoload": {
        "psr-4": {
            "NexoNFe\\": "src/"
        }
    }
}
EOF

sudo mv /tmp/composer.json /var/www/nfe-api/
sudo chown www-data:www-data /var/www/nfe-api/composer.json

# Instalar dependências PHP
log "Instalando dependências NFePHP..."
cd /var/www/nfe-api
sudo -u www-data composer install --no-dev --optimize-autoloader

# Configurar Nginx
log "Configurando Nginx..."
read -p "Digite o domínio da API (ex: nfe-api.seudominio.com.br): " DOMAIN

if [[ -z "$DOMAIN" ]]; then
    error "Domínio é obrigatório"
fi

cat > /tmp/nfe-api << EOF
server {
    listen 80;
    server_name $DOMAIN;
    root /var/www/nfe-api/public;
    index index.php;

    # CORS Headers
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;

    # Logs
    access_log /var/log/nginx/nfe-api.access.log;
    error_log /var/log/nginx/nfe-api.error.log;

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fmp.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;
        include fastcgi_params;
    }

    # Bloquear acesso a arquivos sensíveis
    location ~ /\. {
        deny all;
    }

    location ~ /(storage|vendor|src) {
        deny all;
    }
}
EOF

sudo mv /tmp/nfe-api /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/nfe-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Testar configuração Nginx
sudo nginx -t
if [[ $? -ne 0 ]]; then
    error "Configuração do Nginx inválida"
fi

# Reiniciar serviços
log "Reiniciando serviços..."
sudo systemctl restart nginx
sudo systemctl restart php8.1-fpm

# Configurar SSL com Let's Encrypt
log "Configurando SSL..."
sudo apt install -y certbot python3-certbot-nginx

read -p "Configurar SSL agora? (y/n): " SETUP_SSL

if [[ $SETUP_SSL == "y" || $SETUP_SSL == "Y" ]]; then
    sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
    
    if [[ $? -eq 0 ]]; then
        log "SSL configurado com sucesso"
    else
        warning "Erro ao configurar SSL. Configure manualmente depois."
    fi
fi

# Criar arquivo .env
log "Criando arquivo de configuração..."
cat > /tmp/.env << 'EOF'
# Ambiente NFe
NFE_AMBIENTE=2
NFE_UF_EMISSAO=SP
NFE_SERIE_NFE=1
NFE_TIMEOUT=60

# Certificado Digital
NFE_CERTIFICADO_PATH=storage/certificados/certificado.pfx
NFE_CERTIFICADO_PASSWORD=

# Logs
NFE_LOG_LEVEL=debug
NFE_LOG_PATH=storage/logs/nfe.log

# Supabase
SUPABASE_URL=
SUPABASE_KEY=

# API Security
API_TOKEN=
EOF

sudo mv /tmp/.env /var/www/nfe-api/
sudo chown www-data:www-data /var/www/nfe-api/.env
sudo chmod 600 /var/www/nfe-api/.env

# Configurar permissões
log "Configurando permissões..."
sudo chown -R www-data:www-data /var/www/nfe-api
sudo chmod -R 755 /var/www/nfe-api
sudo chmod -R 777 /var/www/nfe-api/storage

# Configurar firewall
log "Configurando firewall..."
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw --force enable

log "✅ Instalação concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Editar /var/www/nfe-api/.env com suas configurações"
echo "2. Fazer upload do certificado digital para storage/certificados/"
echo "3. Implementar os arquivos PHP da API"
echo "4. Testar a API: https://$DOMAIN/api/status"
echo ""
echo "📁 Estrutura criada em: /var/www/nfe-api"
echo "🔧 Configuração Nginx: /etc/nginx/sites-available/nfe-api"
echo "📝 Logs: /var/log/nginx/nfe-api.*.log"
```

---

## 🔧 Script de Deploy dos Arquivos

### deploy-files.sh
```bash
#!/bin/bash

# Script para fazer deploy dos arquivos da API NFe

API_DIR="/var/www/nfe-api"
BACKUP_DIR="/var/backups/nfe-api-$(date +%Y%m%d-%H%M%S)"

log() {
    echo -e "\033[0;32m[$(date +'%Y-%m-%d %H:%M:%S')] $1\033[0m"
}

error() {
    echo -e "\033[0;31m[ERROR] $1\033[0m"
    exit 1
}

# Verificar se diretório existe
if [[ ! -d "$API_DIR" ]]; then
    error "Diretório da API não encontrado: $API_DIR"
fi

# Fazer backup
log "Criando backup..."
sudo mkdir -p "$BACKUP_DIR"
sudo cp -r "$API_DIR"/* "$BACKUP_DIR/"

# Criar index.php
log "Criando router principal..."
cat > /tmp/index.php << 'EOF'
<?php
require_once '../vendor/autoload.php';

// Headers CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Responder OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Carregar configurações
if (file_exists('../.env')) {
    $dotenv = parse_ini_file('../.env');
    foreach ($dotenv as $key => $value) {
        $_ENV[$key] = $value;
    }
}

// Router simples
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Middleware de autenticação (opcional)
function verificarToken() {
    if (isset($_ENV['API_TOKEN']) && !empty($_ENV['API_TOKEN'])) {
        $headers = getallheaders();
        $token = $headers['Authorization'] ?? '';
        
        if ($token !== 'Bearer ' . $_ENV['API_TOKEN']) {
            http_response_code(401);
            echo json_encode(['error' => 'Token inválido']);
            exit();
        }
    }
}

// Rotas da API
switch ($uri) {
    case '/api/gerar-nfe':
        if ($method === 'POST') {
            verificarToken();
            require_once '../src/Controllers/GerarNFeController.php';
            $controller = new \NexoNFe\Controllers\GerarNFeController();
            $controller->handle();
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Método não permitido']);
        }
        break;
        
    case '/api/enviar-sefaz':
        if ($method === 'POST') {
            verificarToken();
            require_once '../src/Controllers/EnviarSefazController.php';
            $controller = new \NexoNFe\Controllers\EnviarSefazController();
            $controller->handle();
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Método não permitido']);
        }
        break;
        
    case '/api/consultar-nfe':
        if ($method === 'GET') {
            verificarToken();
            require_once '../src/Controllers/ConsultarNFeController.php';
            $controller = new \NexoNFe\Controllers\ConsultarNFeController();
            $controller->handle();
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Método não permitido']);
        }
        break;
        
    case '/api/status':
        echo json_encode([
            'status' => 'API NFe Online',
            'timestamp' => date('Y-m-d H:i:s'),
            'version' => '1.0.0',
            'php_version' => PHP_VERSION
        ]);
        break;
        
    default:
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint não encontrado']);
        break;
}
?>
EOF

sudo mv /tmp/index.php "$API_DIR/public/"
sudo chown www-data:www-data "$API_DIR/public/index.php"

# Criar .htaccess (caso use Apache)
log "Criando .htaccess..."
cat > /tmp/.htaccess << 'EOF'
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [QSA,L]
EOF

sudo mv /tmp/.htaccess "$API_DIR/public/"
sudo chown www-data:www-data "$API_DIR/public/.htaccess"

# Configurar permissões finais
log "Configurando permissões..."
sudo chown -R www-data:www-data "$API_DIR"
sudo chmod -R 755 "$API_DIR"
sudo chmod -R 777 "$API_DIR/storage"
sudo chmod 600 "$API_DIR/.env"

# Testar configuração
log "Testando configuração..."
sudo nginx -t
if [[ $? -eq 0 ]]; then
    sudo systemctl reload nginx
    log "✅ Deploy concluído com sucesso!"
else
    error "Erro na configuração do Nginx"
fi

echo ""
echo "📋 Deploy realizado:"
echo "📁 Backup criado em: $BACKUP_DIR"
echo "🔧 Arquivos atualizados em: $API_DIR"
echo "🌐 Teste a API: curl https://seu-dominio.com/api/status"
```

---

## 🔍 Script de Monitoramento

### monitor-nfe-api.sh
```bash
#!/bin/bash

# Script de monitoramento da API NFe

API_URL="https://nfe-api.seudominio.com.br"
LOG_FILE="/var/log/nfe-api-monitor.log"
EMAIL="admin@seudominio.com.br"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Verificar se API está respondendo
check_api() {
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/status" --max-time 10)
    
    if [[ "$response" == "200" ]]; then
        log "✅ API NFe está online"
        return 0
    else
        log "❌ API NFe está offline (HTTP: $response)"
        return 1
    fi
}

# Verificar espaço em disco
check_disk() {
    local usage=$(df /var/www/nfe-api | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [[ $usage -gt 80 ]]; then
        log "⚠️ Espaço em disco baixo: ${usage}%"
        return 1
    else
        log "✅ Espaço em disco OK: ${usage}%"
        return 0
    fi
}

# Verificar logs de erro
check_logs() {
    local errors=$(tail -n 100 /var/log/nginx/nfe-api.error.log | grep -c "$(date +'%Y/%m/%d')")
    
    if [[ $errors -gt 10 ]]; then
        log "⚠️ Muitos erros detectados: $errors"
        return 1
    else
        log "✅ Logs de erro OK: $errors erros hoje"
        return 0
    fi
}

# Verificar certificado SSL
check_ssl() {
    local expiry=$(echo | openssl s_client -servername nfe-api.seudominio.com.br -connect nfe-api.seudominio.com.br:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
    local expiry_epoch=$(date -d "$expiry" +%s)
    local current_epoch=$(date +%s)
    local days_left=$(( (expiry_epoch - current_epoch) / 86400 ))
    
    if [[ $days_left -lt 30 ]]; then
        log "⚠️ Certificado SSL expira em $days_left dias"
        return 1
    else
        log "✅ Certificado SSL OK: $days_left dias restantes"
        return 0
    fi
}

# Executar verificações
log "🔍 Iniciando monitoramento da API NFe..."

api_ok=true
check_api || api_ok=false
check_disk || api_ok=false
check_logs || api_ok=false
check_ssl || api_ok=false

if [[ "$api_ok" == "true" ]]; then
    log "✅ Todos os checks passaram"
else
    log "❌ Alguns checks falharam - verificar logs"
    
    # Enviar email de alerta (opcional)
    if command -v mail &> /dev/null; then
        echo "Problemas detectados na API NFe. Verificar logs em $LOG_FILE" | mail -s "Alerta API NFe" "$EMAIL"
    fi
fi

log "🔍 Monitoramento concluído"
```

---

## ⚙️ Configuração do Crontab

### Adicionar ao crontab
```bash
# Editar crontab
sudo crontab -e

# Adicionar linhas:
# Monitoramento a cada 5 minutos
*/5 * * * * /usr/local/bin/monitor-nfe-api.sh

# Backup diário às 2h
0 2 * * * tar -czf /var/backups/nfe-api-$(date +\%Y\%m\%d).tar.gz /var/www/nfe-api

# Limpeza de logs antigos (manter 30 dias)
0 3 * * * find /var/www/nfe-api/storage/logs -name "*.log" -mtime +30 -delete

# Renovação automática SSL
0 4 * * * certbot renew --quiet
```

---

## 📋 Checklist Final

### ✅ Verificações Pós-Instalação
- [ ] PHP 8.1+ instalado e funcionando
- [ ] Nginx configurado e rodando
- [ ] Composer instalado
- [ ] NFePHP instalado via Composer
- [ ] Estrutura de diretórios criada
- [ ] Permissões configuradas
- [ ] SSL configurado
- [ ] Firewall configurado
- [ ] Arquivo .env configurado
- [ ] Certificado digital uploaded
- [ ] API respondendo em /api/status
- [ ] Logs funcionando
- [ ] Monitoramento configurado

### 🔧 Comandos Úteis
```bash
# Verificar status dos serviços
sudo systemctl status nginx php8.1-fpm

# Ver logs em tempo real
sudo tail -f /var/log/nginx/nfe-api.access.log
sudo tail -f /var/www/nfe-api/storage/logs/nfe.log

# Testar API
curl https://nfe-api.seudominio.com.br/api/status

# Verificar certificado
openssl x509 -in /var/www/nfe-api/storage/certificados/certificado.pfx -text -noout
```

---

**🎉 Documentação VPS completa! Agora você tem tudo para implementar a API NFe na VPS.**
