/**
 * Configurações para o servidor backend com WhatsApp Web.js
 */
module.exports = {
  // Configurações do servidor Express
  server: {
    port: 3000,
    host: 'localhost'
  },
  
  // Configurações do WhatsApp Web.js
  whatsapp: {
    // Diretório para armazenar dados da sessão
    sessionDir: './sessions',
    // Tempo limite para o QR code em milissegundos (5 minutos)
    qrTimeout: 300000,
    // Tempo de reconexão em caso de desconexão (em milissegundos)
    reconnectTimeout: 15000
  }
};
