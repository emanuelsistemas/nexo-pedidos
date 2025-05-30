# 🚀 Implementação NFe - VPS com PHP Puro

## 📋 Visão Geral
Documentação completa para implementar microserviço NFe em VPS usando PHP puro + NFePHP, com API REST para integração com frontend Netlify.

---

## 🏗️ Arquitetura Final

```
Frontend (Netlify) → API NFe (VPS + Domínio) → SEFAZ
        ↓                    ↓
   Supabase DB ←── Salva resultados
```

### Componentes:
- **Frontend**: React no Netlify (já implementado)
- **API NFe**: PHP puro na VPS
- **Domínio**: `nfe-api.seudominio.com.br`
- **Database**: Supabase (continua como está)
- **Biblioteca**: NFePHP (nfephp-org/sped-nfe)

---

## 🖥️ Configuração da VPS

### Requisitos Mínimos:
- **OS**: Ubuntu 22.04 LTS
- **RAM**: 2GB
- **CPU**: 1 vCPU
- **Storage**: 20GB SSD
- **Provedor**: DigitalOcean, Vultr, Contabo

### 1. Instalação Base
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar PHP 8.1 e extensões necessárias
sudo apt install -y nginx php8.1-fpm php8.1-cli php8.1-xml php8.1-curl \
php8.1-zip php8.1-mbstring php8.1-gd php8.1-soap php8.1-dom \
php8.1-openssl php8.1-json unzip git

# Instalar Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

### 2. Configurar Nginx
```bash
# Criar diretório da aplicação
sudo mkdir -p /var/www/nfe-api
sudo chown -R www-data:www-data /var/www/nfe-api

# Configurar virtual host
sudo nano /etc/nginx/sites-available/nfe-api
```

**Arquivo `/etc/nginx/sites-available/nfe-api`:**
```nginx
server {
    listen 80;
    server_name nfe-api.seudominio.com.br;
    root /var/www/nfe-api/public;
    index index.php;

    # CORS Headers
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Bloquear acesso a arquivos sensíveis
    location ~ /\. {
        deny all;
    }
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/nfe-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. SSL com Let's Encrypt
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Gerar certificado
sudo certbot --nginx -d nfe-api.seudominio.com.br
```

---

## 📁 Estrutura do Projeto

```
/var/www/nfe-api/
├── public/                 # Pasta pública (DocumentRoot)
│   ├── index.php          # Router principal
│   └── .htaccess          # Regras Apache (se usar)
├── src/                   # Código fonte
│   ├── Controllers/       # Controllers da API
│   ├── Services/          # Serviços NFe
│   ├── Config/           # Configurações
│   └── Utils/            # Utilitários
├── storage/              # Armazenamento
│   ├── certificados/     # Certificados digitais
│   ├── xmls/            # XMLs gerados
│   └── logs/            # Logs da aplicação
├── vendor/              # Dependências Composer
├── composer.json        # Dependências
└── .env                # Configurações ambiente
```

---

## 🔧 Implementação Base

### 1. Composer.json
```json
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
```

### 2. Router Principal (public/index.php)
```php
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
$dotenv = parse_ini_file('../.env');
foreach ($dotenv as $key => $value) {
    $_ENV[$key] = $value;
}

// Router simples
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Rotas da API
switch ($uri) {
    case '/api/gerar-nfe':
        if ($method === 'POST') {
            require_once '../src/Controllers/GerarNFeController.php';
            $controller = new \NexoNFe\Controllers\GerarNFeController();
            $controller->handle();
        }
        break;
        
    case '/api/enviar-sefaz':
        if ($method === 'POST') {
            require_once '../src/Controllers/EnviarSefazController.php';
            $controller = new \NexoNFe\Controllers\EnviarSefazController();
            $controller->handle();
        }
        break;
        
    case '/api/consultar-nfe':
        if ($method === 'GET') {
            require_once '../src/Controllers/ConsultarNFeController.php';
            $controller = new \NexoNFe\Controllers\ConsultarNFeController();
            $controller->handle();
        }
        break;
        
    case '/api/status':
        echo json_encode(['status' => 'API NFe Online', 'timestamp' => date('Y-m-d H:i:s')]);
        break;
        
    default:
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint não encontrado']);
        break;
}
?>
```

### 3. Arquivo de Configuração (.env)
```env
# Ambiente NFe
NFE_AMBIENTE=2                    # 1=Produção, 2=Homologação
NFE_UF_EMISSAO=SP                # Estado do emitente
NFE_SERIE_NFE=1                  # Série padrão
NFE_TIMEOUT=60                   # Timeout SEFAZ

# Certificado Digital
NFE_CERTIFICADO_PATH=storage/certificados/certificado.pfx
NFE_CERTIFICADO_PASSWORD=senha123

# Logs
NFE_LOG_LEVEL=debug
NFE_LOG_PATH=storage/logs/nfe.log

# Supabase (para salvar resultados)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-service-role
```

---

## 📡 Endpoints da API

### 1. POST /api/gerar-nfe
**Gera XML da NFe**
```json
{
  "empresa": { "cnpj": "12345678000195", ... },
  "cliente": { "nome": "Cliente Teste", ... },
  "produtos": [
    { "codigo": "001", "descricao": "Produto 1", ... }
  ],
  "totais": { "valor_total": 100.00, ... }
}
```

### 2. POST /api/enviar-sefaz
**Envia NFe para SEFAZ**
```json
{
  "xml": "<?xml version='1.0'...",
  "chave": "35240512345678000195550010000000011234567890"
}
```

### 3. GET /api/consultar-nfe?chave={chave}
**Consulta status da NFe**

### 4. GET /api/status
**Status da API**

---

## 🔐 Segurança

### 1. Autenticação por Token
```php
// Middleware de autenticação
function verificarToken() {
    $headers = getallheaders();
    $token = $headers['Authorization'] ?? '';
    
    if ($token !== 'Bearer ' . $_ENV['API_TOKEN']) {
        http_response_code(401);
        echo json_encode(['error' => 'Token inválido']);
        exit();
    }
}
```

### 2. Validação de Origem
```php
// Permitir apenas domínio do frontend
$allowed_origins = ['https://seu-app.netlify.app'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (!in_array($origin, $allowed_origins)) {
    http_response_code(403);
    echo json_encode(['error' => 'Origem não autorizada']);
    exit();
}
```

---

## 📊 Monitoramento

### 1. Logs Estruturados
```php
function logNFe($level, $message, $context = []) {
    $log = [
        'timestamp' => date('Y-m-d H:i:s'),
        'level' => $level,
        'message' => $message,
        'context' => $context
    ];
    
    file_put_contents($_ENV['NFE_LOG_PATH'], json_encode($log) . "\n", FILE_APPEND);
}
```

### 2. Health Check
```bash
# Criar script de monitoramento
curl -f https://nfe-api.seudominio.com.br/api/status || echo "API NFe offline"
```

---

**Próximo arquivo**: Implementação dos Controllers e Services
