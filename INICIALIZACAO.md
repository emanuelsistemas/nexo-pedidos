# 🚀 Nexo Pedidos - Guia de Inicialização (Sem Vite)

Este guia detalha o processo de inicialização do sistema Nexo Pedidos usando build estático ao invés do servidor de desenvolvimento Vite.

## 📋 Índice

- [Por que Sem Vite?](#por-que-sem-vite)
- [Arquitetura](#arquitetura)
- [Pré-requisitos](#pré-requisitos)
- [Processo de Inicialização](#processo-de-inicialização)
- [Configuração Nginx](#configuração-nginx)
- [Verificação](#verificação)
- [Troubleshooting](#troubleshooting)

## 🎯 Por que Sem Vite?

### **❌ Problemas com Vite Dev Server**
- 🐌 **Performance**: Servidor de desenvolvimento mais lento
- 🔄 **Instabilidade**: Recarregamentos frequentes
- 💾 **Recursos**: Maior consumo de RAM/CPU
- 🔧 **Complexidade**: Duas etapas (dev + build)

### **✅ Vantagens do Build Estático**
- ⚡ **Performance**: Arquivos estáticos servidos diretamente pelo Nginx
- 🛡️ **Estabilidade**: Sem servidor de desenvolvimento
- 🔋 **Eficiência**: Menor consumo de recursos
- 📦 **Simplicidade**: Uma única etapa de deploy
- 🚀 **Produção**: Pronto para ambiente de produção

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        NGINX                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐              ┌─────────────────────┐   │
│  │   Frontend      │              │      Backend        │   │
│  │   (Estático)    │              │    (PHP-FPM)        │   │
│  │                 │              │                     │   │
│  │ • /dist/*       │              │ • /backend/public/* │   │
│  │ • index.html    │              │ • *.php             │   │
│  │ • assets/       │              │ • sped-nfe          │   │
│  │                 │              │ • certificados      │   │
│  └─────────────────┘              └─────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 📋 Pré-requisitos

### **Sistema**
- Ubuntu 20.04+ (ou similar)
- Acesso root/sudo

### **Software**
```bash
# Node.js e npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PHP 7.4 e extensões
sudo apt update
sudo apt install -y php7.4-fpm php7.4-curl php7.4-xml php7.4-mbstring \
                    php7.4-soap php7.4-zip php7.4-gd php7.4-json

# Nginx
sudo apt install -y nginx

# Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

## 🚀 Processo de Inicialização

### **1. Preparação do Projeto**

```bash
# Clonar repositório
git clone https://github.com/emanuelsistemas/nexo-pedidos.git
cd nexo-pedidos

# Instalar dependências frontend
npm install

# Instalar dependências backend
cd backend
composer install
cd ..
```

### **2. Configuração de Ambiente**

```bash
# Criar arquivo .env
cp .env.example .env

# Editar variáveis (substitua pelos seus valores)
nano .env
```

**Conteúdo do .env:**
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

### **3. Build do Frontend**

```bash
# Gerar build de produção
npm run build
```

**Resultado:**
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── vendor-[hash].js
└── [outros arquivos estáticos]
```

### **4. Estrutura Backend**

```bash
# Criar diretórios necessários
mkdir -p backend/storage/{certificados,xml,pdf,logs}

# Definir permissões
sudo chown -R www-data:www-data backend/storage/
sudo chmod -R 755 backend/storage/
```

### **5. Configuração Nginx**

Criar arquivo `/etc/nginx/sites-available/nexo-pedidos`:

```nginx
server {
    listen 80;
    server_name localhost;
    
    # Diretório raiz aponta para /dist
    root /root/nexo/nexo-pedidos/dist;
    index index.html;

    # Frontend - Arquivos estáticos
    location / {
        try_files $uri $uri/ /index.html;
        
        # Headers para cache
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend - API PHP
    location /backend/ {
        root /root/nexo/nexo-pedidos;
        try_files $uri $uri/ =404;
        
        location ~ \.php$ {
            fastcgi_pass unix:/var/run/php/php7.4-fpm.sock;
            fastcgi_index index.php;
            include fastcgi_params;
            fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
            fastcgi_param PATH_INFO $fastcgi_path_info;
        }
    }

    # Logs
    access_log /var/log/nginx/nexo-access.log;
    error_log /var/log/nginx/nexo-error.log;
}
```

### **6. Ativar Configuração**

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/nexo-pedidos /etc/nginx/sites-enabled/

# Desativar site padrão (opcional)
sudo rm /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

### **7. Iniciar Serviços**

```bash
# Verificar status
sudo systemctl status nginx
sudo systemctl status php7.4-fpm

# Iniciar se necessário
sudo systemctl start nginx
sudo systemctl start php7.4-fpm

# Habilitar inicialização automática
sudo systemctl enable nginx
sudo systemctl enable php7.4-fpm
```

## ✅ Verificação

### **1. Teste Frontend**
```bash
curl -I http://localhost/
# Deve retornar: HTTP/1.1 200 OK
```

### **2. Teste Backend**
```bash
curl http://localhost/backend/public/status-nfe.php
# Deve retornar JSON com status do sistema
```

### **3. Teste Completo**
```bash
# Abrir no navegador
http://localhost/

# Verificar console do navegador (F12)
# Não deve haver erros 404 ou de carregamento
```

## 🔧 Comandos Úteis

### **Rebuild Completo**
```bash
# Rebuild frontend + reload nginx
npm run build && sudo systemctl reload nginx
```

### **Logs em Tempo Real**
```bash
# Logs Nginx
sudo tail -f /var/log/nginx/nexo-error.log

# Logs PHP
sudo tail -f /var/log/php7.4-fpm.log

# Logs do Sistema NFe
curl "http://localhost/backend/public/logs.php?level=error&limit=10"
```

### **Status dos Serviços**
```bash
sudo systemctl status nginx php7.4-fpm
```

## 🔍 Troubleshooting

### **❌ Erro 404 no Frontend**
```bash
# Verificar se build foi gerado
ls -la dist/

# Verificar permissões
sudo chown -R www-data:www-data dist/

# Verificar configuração Nginx
sudo nginx -t
```

### **❌ Erro 502 Bad Gateway**
```bash
# Verificar PHP-FPM
sudo systemctl status php7.4-fpm

# Verificar socket
ls -la /var/run/php/php7.4-fpm.sock

# Reiniciar PHP-FPM
sudo systemctl restart php7.4-fpm
```

### **❌ Arquivos CSS/JS não carregam**
```bash
# Verificar se arquivos existem
ls -la dist/assets/

# Verificar logs Nginx
sudo tail -f /var/log/nginx/nexo-error.log
```

### **❌ Backend não responde**
```bash
# Testar diretamente
curl -v http://localhost/backend/public/status-nfe.php

# Verificar permissões backend
sudo chown -R www-data:www-data backend/
```

## 📊 Comparação: Vite vs Build

| Aspecto | Vite Dev | Build Estático |
|---------|----------|----------------|
| **Velocidade** | ~2-3s inicialização | ⚡ **Instantâneo** |
| **Recursos** | ~200MB RAM | 🔋 **~50MB RAM** |
| **Estabilidade** | Recarregamentos | 🛡️ **Sem recarregamentos** |
| **Cache** | Limitado | 📦 **Cache completo** |
| **Produção** | Não recomendado | ✅ **Pronto para produção** |

## 🎯 Resultado Final

Após seguir este guia, você terá:

- ✅ **Frontend**: Servido estaticamente pelo Nginx
- ✅ **Backend**: PHP-FPM processando APIs
- ✅ **NFe**: Sistema local funcionando
- ✅ **Performance**: Máxima velocidade
- ✅ **Estabilidade**: Sistema robusto
- ✅ **Produção**: Ambiente pronto

**🚀 Sistema Nexo Pedidos rodando com máxima performance!**
