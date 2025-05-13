#!/bin/bash

# Carregar NVM se disponível
export NVM_DIR="$HOME/.var/app/com.visualstudio.code/config/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Diretório atual
cd "$(dirname "$0")"

# Verificar se o serviço já está rodando
echo "Verificando se o serviço do WhatsApp já está rodando..."
if pm2 list | grep -q "nexo-whatsapp"; then
  echo "Serviço já está rodando. Reiniciando..."
  pm2 restart nexo-whatsapp
else
  echo "Iniciando serviço do WhatsApp com PM2..."
  pm2 start ecosystem.whatsapp.config.js
fi

# Mostrar status
echo "Status dos processos PM2:"
pm2 list

echo "Para ver os logs do serviço, execute: pm2 logs nexo-whatsapp"
