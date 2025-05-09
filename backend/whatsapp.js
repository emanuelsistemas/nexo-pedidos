const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// Garantir que o diretório de sessões existe
const sessionDir = path.resolve(config.whatsapp.sessionDir);
if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir, { recursive: true });
}

// Array para armazenar callbacks para o evento QR
let qrCallbacks = [];

// Cliente WhatsApp
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: sessionDir
  }),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true
  }
});

// Estado da conexão
let connectionState = 'disconnected';
let qrCode = null;
let currentConnectionId = null;
let connectionInfo = null;

// Eventos do cliente
client.on('qr', (qr) => {
  qrCode = qr;
  console.log('QR Code recebido, escaneie para autenticar:');
  qrcode.generate(qr, { small: true });
  
  // Notificar todos os callbacks registrados
  qrCallbacks.forEach(callback => callback(qr));
});

client.on('ready', () => {
  console.log('Cliente WhatsApp conectado e pronto!');
  connectionState = 'connected';
  // Limpar explicitamente o QR code e notificar os clientes
  qrCode = "";
  // Notificar todos os callbacks registrados com QR vazio (sinal de conexão)
  qrCallbacks.forEach(callback => callback(""));
});

client.on('authenticated', () => {
  console.log('Autenticado com sucesso no WhatsApp!');
  connectionState = 'authenticated';
});

client.on('auth_failure', (error) => {
  console.error('Falha na autenticação do WhatsApp:', error);
  connectionState = 'auth_failure';
});

client.on('disconnected', (reason) => {
  console.log('Cliente WhatsApp desconectado:', reason);
  connectionState = 'disconnected';
  
  // Tentar reconectar após um tempo
  setTimeout(() => {
    console.log('Tentando reconectar...');
    client.initialize();
  }, config.whatsapp.reconnectTimeout);
});

// Inicializar o cliente
const initialize = () => {
  connectionState = 'initializing';
  // Inicialmente definir como null, não como string vazia
  qrCode = null;
  client.initialize();
  
  // Notificar sobre o status de inicialização
  qrCallbacks.forEach(callback => callback(null));
};

// Função para reinicializar completamente o cliente
const reinitialize = async () => {
  console.log('Reinicializando cliente WhatsApp...');
  
  // Tentar desconectar o cliente atual
  try {
    if (client.pupBrowser) {
      await client.logout();
      await client.destroy();
    }
  } catch (error) {
    console.error('Erro ao desconectar cliente anterior:', error);
  }
  
  // Resetar o estado
  connectionState = 'disconnected';
  qrCode = null;
  currentConnectionId = null;
  connectionInfo = null;
  
  // Aguardar um momento antes de reinicializar
  setTimeout(() => {
    console.log('Inicializando novo cliente...');
    client.initialize();
  }, 1000);
  
  return { success: true };
};

// Métodos de interação com o WhatsApp
const sendMessage = async (to, message) => {
  if (connectionState !== 'connected') {
    throw new Error('Cliente WhatsApp não está conectado');
  }
  
  // Verificar formato do número e adicionar @c.us se necessário
  const chatId = to.includes('@c.us') ? to : `${to}@c.us`;
  
  try {
    const response = await client.sendMessage(chatId, message);
    return {
      success: true,
      messageId: response.id._serialized,
      timestamp: response.timestamp
    };
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    throw error;
  }
};

// Registrar callback para receber QR code
const onQR = (callback) => {
  qrCallbacks.push(callback);
  
  // Se já tiver um QR code, notificar imediatamente
  if (qrCode) {
    callback(qrCode);
  }
  
  // Retornar função para remover callback
  return () => {
    qrCallbacks = qrCallbacks.filter(cb => cb !== callback);
  };
};

// Obter status atual
const getStatus = () => {
  return {
    state: connectionState,
    hasQR: qrCode !== null,
    qrCode: qrCode,
    connectionId: currentConnectionId,
    connectionInfo
  };
};

// Definir conexão atual
const setConnection = (connectionData) => {
  currentConnectionId = connectionData.id;
  connectionInfo = connectionData;
  console.log(`Conexão definida para: ${connectionData.nome} (ID: ${connectionData.id})`);
  return {
    success: true,
    connectionId: currentConnectionId
  };
};

module.exports = {
  client,
  initialize,
  sendMessage,
  onQR,
  getStatus,
  setConnection
};
