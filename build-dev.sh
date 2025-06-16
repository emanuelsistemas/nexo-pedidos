#!/bin/bash

# Script para build rápido de desenvolvimento
# Uso: ./build-dev.sh

echo "🚀 Iniciando build de desenvolvimento..."

# Build otimizado para desenvolvimento
npm run build:dev

if [ $? -eq 0 ]; then
    echo "✅ Build de desenvolvimento concluído!"
    echo "📍 Acesse: http://31.97.166.71"
    echo "📁 Arquivos em: /root/nexo-pedidos/dist-dev/"
    echo ""
    echo "💡 Para produção use: npm run build:prod"
else
    echo "❌ Erro no build de desenvolvimento"
    exit 1
fi
