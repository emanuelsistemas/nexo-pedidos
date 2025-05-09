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

// Arrays para armazenar callbacks para eventos
let qrCallbacks = [];
let statusCallbacks = [];

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
  connectionState = 'qr';
  console.log('QR Code recebido, escaneie para autenticar:');
  qrcode.generate(qr, { small: true });
  
  // Notificar todos os callbacks registrados sobre o QR
  qrCallbacks.forEach(callback => callback(qr));
  
  // Notificar todos os callbacks registrados sobre a mudança de estado
  const stateData = { type: 'status', data: getStatus() };
  statusCallbacks.forEach(callback => callback(stateData));
});

client.on('loading_screen', (percent, message) => {
  console.log(`Carregando WhatsApp: ${percent}% - ${message}`);
  connectionState = 'loading';
});

client.on('ready', () => {
  console.log('Cliente WhatsApp conectado e pronto!');
  connectionState = 'connected';
  qrCode = null;
  
  // Notificar todos os callbacks registrados sobre a mudança de estado
  const stateData = { type: 'status', data: getStatus() };
  statusCallbacks.forEach(callback => callback(stateData));
});

client.on('authenticated', () => {
  console.log('Autenticado com sucesso no WhatsApp!');
  connectionState = 'authenticated';
  
  // Notificar todos os callbacks registrados sobre a mudança de estado
  const stateData = { type: 'status', data: getStatus() };
  statusCallbacks.forEach(callback => callback(stateData));
});

client.on('auth_failure', (error) => {
  console.error('Falha na autenticação do WhatsApp:', error);
  connectionState = 'auth_failure';
  
  // Notificar todos os callbacks registrados sobre a mudança de estado
  const stateData = { type: 'status', data: getStatus() };
  statusCallbacks.forEach(callback => callback(stateData));
});

client.on('disconnected', (reason) => {
  console.log('Cliente WhatsApp desconectado:', reason);
  connectionState = 'disconnected';
  
  // Notificar todos os callbacks registrados sobre a mudança de estado
  const stateData = { type: 'status', data: getStatus() };
  statusCallbacks.forEach(callback => callback(stateData));
  
  // Tentar reconectar após um tempo
  setTimeout(() => {
    console.log('Tentando reconectar...');
    client.initialize();
  }, config.whatsapp.reconnectTimeout);
});

// Inicializar o cliente
const initialize = () => {
  connectionState = 'initializing';
  qrCode = null;
  client.initialize();
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

// Função para obter informações detalhadas do telefone conectado ao WhatsApp
const getPhoneInfo = async () => {
  if (!client || connectionState !== 'connected') {
    return { error: 'Cliente WhatsApp não está conectado' };
  }

  try {
    // Obter informações do cliente
    const info = await client.getState();
    
    // Obter informações mais detalhadas do dispositivo
    const phoneInfo = {
      number: client.info?.wid?.user || 'desconhecido', // Número de telefone
      platform: client.info?.platform || 'desconhecido', // Plataforma
      device: client.info?.phone?.device_manufacturer || 'desconhecido', // Dispositivo
      wa_version: client.info?.phone?.wa_version || 'desconhecido', // Versão do WhatsApp
      connected: client.info?.phone?.connected || false, // Status de conexão
      battery: client.info?.battery || 'desconhecido', // Nível de bateria
      sessionId: client.info?.me?.id?.user || null, // ID da sessão
      state: info || 'desconhecido' // Estado atual
    };
    
    return phoneInfo;
  } catch (error) {
    console.error('Erro ao obter informações do telefone:', error);
    return { error: 'Erro ao obter informações do telefone' };
  }
};

// Registrar callback para receber atualizações de status
const onStatus = (callback) => {
  statusCallbacks.push(callback);
  
  // Notificar imediatamente com o status atual
  const stateData = { type: 'status', data: getStatus() };
  callback(stateData);
  
  // Retornar função para remover callback
  return () => {
    statusCallbacks = statusCallbacks.filter(cb => cb !== callback);
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
  reinitialize,
  sendMessage,
  onQR,
  onStatus,
  getStatus,
  getPhoneInfo,
  setConnection
};
