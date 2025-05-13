const { checkAndUpdateStoreStatus } = require('./services/storeStatusService');

// Intervalo de verificação em milissegundos (1 minuto)
const CHECK_INTERVAL = 60 * 1000;

/**
 * Inicia o agendador para verificar o status das lojas periodicamente
 */
function startScheduler() {
  console.log('Iniciando agendador de verificação de status das lojas...');
  
  // Executar imediatamente na inicialização
  checkAndUpdateStoreStatus();
  
  // Agendar execuções periódicas
  setInterval(() => {
    checkAndUpdateStoreStatus();
  }, CHECK_INTERVAL);
}

// Iniciar o agendador
startScheduler();

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('Erro não tratado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promessa rejeitada não tratada:', reason);
});
