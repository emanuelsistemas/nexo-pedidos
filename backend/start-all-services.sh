#!/bin/bash

# Carregar NVM se disponível
export NVM_DIR="$HOME/.var/app/com.visualstudio.code/config/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Diretório atual
cd "$(dirname "$0")"

echo "Iniciando todos os serviços Nexo..."

# Iniciar o serviço principal do WhatsApp
echo "Iniciando serviço WhatsApp API..."
if pm2 list | grep -q "nexo-backend"; then
  echo "Serviço WhatsApp já está rodando. Reiniciando..."
  pm2 restart nexo-backend
else
  echo "Iniciando serviço WhatsApp com PM2..."
  pm2 start server.js --name nexo-backend
fi

# Iniciar o serviço de status da loja
echo "Iniciando serviço de status da loja..."
if pm2 list | grep -q "nexo-store-status"; then
  echo "Serviço de status da loja já está rodando. Reiniciando..."
  pm2 restart nexo-store-status
else
  echo "Iniciando serviço de status da loja com PM2..."
  pm2 start ecosystem.store-status.config.js
fi

# Mostrar status
echo "Status dos processos PM2:"
pm2 list

echo "Para ver os logs do serviço WhatsApp, execute: pm2 logs nexo-backend"
echo "Para ver os logs do serviço de status da loja, execute: pm2 logs nexo-store-status"
