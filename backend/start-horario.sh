#!/bin/bash

# Carregar NVM se disponível
export NVM_DIR="$HOME/.var/app/com.visualstudio.code/config/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Diretório atual
cd "$(dirname "$0")"

# Verificar se o serviço já está rodando
echo "Verificando se o serviço de horário de funcionamento já está rodando..."
if pm2 list | grep -q "Horario-Funcionamento"; then
  echo "Serviço já está rodando. Reiniciando..."
  pm2 restart Horario-Funcionamento
else
  echo "Iniciando serviço de horário de funcionamento com PM2..."
  pm2 start ecosystem.horario.config.js
fi

# Mostrar status
echo "Status dos processos PM2:"
pm2 list

echo "Para ver os logs do serviço, execute: pm2 logs Horario-Funcionamento"
