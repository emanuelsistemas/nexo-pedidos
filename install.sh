#!/bin/bash

echo "🚀 Instalando Nexo - Sistema de Gestão para Delivery"
echo "=================================================="

# Verificar se está rodando como root ou com sudo
if [[ $EUID -eq 0 ]]; then
   echo "❌ Este script não deve ser executado como root"
   echo "   Execute: bash install.sh"
   exit 1
fi

# Verificar se tem sudo
if ! sudo -n true 2>/dev/null; then
    echo "❌ Este script precisa de permissões sudo"
    echo "   Execute: sudo bash install.sh"
    exit 1
fi

# Verificar dependências
echo "🔍 Verificando dependências..."

# Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Instale Node.js 18+ primeiro"
    exit 1
fi

# npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado. Instale npm primeiro"
    exit 1
fi

echo "✅ Node.js $(node --version) encontrado"
echo "✅ npm $(npm --version) encontrado"

# Instalar dependências do sistema
echo ""
echo "📦 Instalando dependências do sistema..."
sudo apt update
sudo apt install -y nginx php7.4-fpm php7.4-cli php7.4-xml php7.4-mbstring php7.4-curl php7.4-zip php7.4-gd php7.4-json php7.4-soap composer

# Verificar se Composer foi instalado
if ! command -v composer &> /dev/null; then
    echo "📦 Instalando Composer..."
    curl -sS https://getcomposer.org/installer | php
    sudo mv composer.phar /usr/local/bin/composer
fi

echo "✅ Dependências do sistema instaladas"

# Instalar dependências do projeto
echo ""
echo "📦 Instalando dependências do frontend..."
npm install

echo "📦 Instalando dependências do backend..."
cd backend
composer install
cd ..

echo "✅ Dependências do projeto instaladas"

# Configurar Nginx
echo ""
echo "🔧 Configurando Nginx..."

# Obter caminho atual
CURRENT_PATH=$(pwd)

# Criar configuração do Nginx com caminho correto
sudo cp backend/nginx-production.conf /etc/nginx/sites-available/nexo-backend

# Substituir caminho no arquivo de configuração
sudo sed -i "s|/root/nexo/nexo-pedidos|$CURRENT_PATH|g" /etc/nginx/sites-available/nexo-backend

# Habilitar site
sudo ln -sf /etc/nginx/sites-available/nexo-backend /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

echo "✅ Nginx configurado"

# Configurar permissões
echo ""
echo "🔐 Configurando permissões..."

# Permissões para o diretório do projeto
sudo chmod -R 755 "$CURRENT_PATH"
sudo chown -R www-data:www-data "$CURRENT_PATH/backend/storage"
sudo chmod -R 700 "$CURRENT_PATH/backend/storage/certificados"

echo "✅ Permissões configuradas"

# Testar configuração do Nginx
echo ""
echo "🧪 Testando configuração do Nginx..."
if sudo nginx -t; then
    echo "✅ Configuração do Nginx válida"
else
    echo "❌ Erro na configuração do Nginx"
    exit 1
fi

# Reiniciar serviços
echo ""
echo "🔄 Reiniciando serviços..."
sudo systemctl restart nginx php7.4-fpm
sudo systemctl enable nginx php7.4-fpm

echo "✅ Serviços reiniciados"

# Build da aplicação
echo ""
echo "🏗️  Fazendo build da aplicação..."
npm run build

echo "✅ Build concluído"

# Testar instalação
echo ""
echo "🧪 Testando instalação..."
if curl -s http://localhost/backend/public/test.php | grep -q "success"; then
    echo "✅ Backend funcionando"
else
    echo "⚠️  Backend pode não estar funcionando corretamente"
fi

# Finalizar
echo ""
echo "🎉 Instalação concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure o arquivo .env com suas credenciais do Supabase"
echo "2. Acesse: http://localhost"
echo "3. Faça login no sistema"
echo ""
echo "🔧 Comandos úteis:"
echo "- Rebuild: npm run build"
echo "- Status: sudo systemctl status nginx php7.4-fpm"
echo "- Logs: sudo tail -f /var/log/nginx/error.log"
echo ""
echo "📞 Suporte: emanuel.sistemas@gmail.com"
