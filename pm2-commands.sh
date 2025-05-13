#!/bin/bash
export NVM_DIR="$HOME/.var/app/com.visualstudio.code/config/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Listar processos PM2
echo "Listando processos PM2:"
pm2 list

# Remover processo whatsapp se existir
echo "Removendo processo whatsapp (se existir):"
pm2 delete whatsapp 2>/dev/null || echo "Processo whatsapp não encontrado"

# Iniciar o backend com PM2
echo "Iniciando o backend com PM2:"
cd backend
pm2 start server.js --name nexo-backend

# Listar processos novamente
echo "Processos PM2 após inicialização:"
pm2 list
