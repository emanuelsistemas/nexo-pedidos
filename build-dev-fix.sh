#!/bin/bash

# Script para build de desenvolvimento que funciona com nginx
# Gera build rápido mas no diretório correto para o IP 31.97.166.71

echo "🔨 Build de desenvolvimento (rápido) para 31.97.166.71..."

# Build de desenvolvimento
npm run build:dev

# Copiar para o diretório que o nginx espera (se necessário)
if [ -d "dist-dev" ] && [ -d "dist" ]; then
    echo "📁 Copiando dist-dev para dist..."
    rm -rf dist/*
    cp -r dist-dev/* dist/
fi

# Recarregar nginx
echo "🔄 Recarregando nginx..."
sudo systemctl reload nginx

echo "✅ Build de desenvolvimento concluído!"
echo "🌐 Acesse: http://31.97.166.71"
