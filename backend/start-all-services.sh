#!/bin/bash

# Carregar NVM se disponível
export NVM_DIR="$HOME/.var/app/com.visualstudio.code/config/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Diretório atual
cd "$(dirname "$0")"

echo "Iniciando todos os serviços Nexo..."

# Iniciar o serviço principal do WhatsApp
echo "Iniciando serviço WhatsApp API..."
if pm2 list | grep -q "whatsapp"; then
  echo "Serviço WhatsApp já está rodando. Reiniciando..."
  pm2 restart whatsapp
else
  echo "Iniciando serviço WhatsApp com PM2..."
  pm2 start server.js --name whatsapp
fi

# Iniciar o serviço de horário de funcionamento
echo "Iniciando serviço de horário de funcionamento..."
if pm2 list | grep -q "Horario-Funcionamento"; then
  echo "Serviço de horário de funcionamento já está rodando. Reiniciando..."
  pm2 restart Horario-Funcionamento
else
  echo "Iniciando serviço de horário de funcionamento com PM2..."
  pm2 start ecosystem.horario.config.js
fi

# Mostrar status
echo "Status dos processos PM2:"
pm2 list

echo "Para ver os logs do serviço WhatsApp, execute: pm2 logs whatsapp"
echo "Para ver os logs do serviço de horário de funcionamento, execute: pm2 logs Horario-Funcionamento"
