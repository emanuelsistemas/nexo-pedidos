const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const config = require('./config');
// Se Node < 18, descomente a linha abaixo após instalar node-fetch: npm install node-fetch@2
// const fetch = require('node-fetch'); 

// Variável para referência ao cliente Supabase
let supabaseClient = null;

// Função para definir o cliente Supabase
const setSupabaseClient = (dbClient) => {
  supabaseClient = dbClient;
  console.log('Cliente Supabase definido no módulo WhatsApp');
};

// Garantir que o diretório de sessões existe
const sessionDir = path.resolve(config.whatsapp.sessionDir);
if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir, { recursive: true });
}

// Array para armazenar callbacks para o evento QR
let qrCallbacks = [];

// Variável para o cliente WhatsApp, será recriada
let client;

// Estado do módulo (não diretamente do client.state)
let moduleConnectionState = 'disconnected';
let currentQRCode = null;
let currentConnectionId = null;

// Função para chamar a API do LLM
async function getAIResponse(userMessage, systemContentForAI, currentConvId) {
  const apiToken = process.env.LLM_API_TOKEN;

  if (!apiToken) {
    console.error(`[${currentConvId || 'AI'}] LLM_API_TOKEN não configurado.`);
    return "Desculpe, estou com problemas para acessar minha inteligência artificial no momento. Por favor, tente mais tarde.";
  }

  const apiUrl = 'https://api.llmapi.com/chat/completions';
  const payload = {
    model: "llama3-8b",
    messages: [
      {
        role: "system",
        content: systemContentForAI
      },
      {
        role: "user",
        content: userMessage
      }
      // TODO: Considerar adicionar histórico da conversa para melhor contexto
    ],
    // stream: false, // Definir como true se quiser lidar com streaming de resposta
    // temperature: 0.7, // Ajustar conforme necessidade
    // max_tokens: 1000, // Ajustar conforme necessidade
  };

  try {
    console.log(`[${currentConvId || 'AI'}] Enviando para LLM API. User: "${userMessage.substring(0,50)}..."`);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'accept': '*/*', // API pode ser flexível aqui, Curl usa '/'
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[${currentConvId || 'AI'}] LLM API Error ${response.status}:`, errorBody);
      return `Desculpe, encontrei um problema ao tentar gerar uma resposta (${response.status}). Tente novamente ou contate o suporte.`;
    }

    const data = await response.json();
    if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
      console.log(`[${currentConvId || 'AI'}] Resposta da LLM API recebida.`);
      return data.choices[0].message.content.trim();
    } else {
      console.error("[${currentConvId || 'AI'}] Resposta inesperada da LLM API:", JSON.stringify(data, null, 2));
      return "Não consegui gerar uma resposta no momento. Tente de novo.";
    }
  } catch (error) {
    console.error(`[${currentConvId || 'AI'}] Exceção ao chamar LLM API:`, error);
    return "Ocorreu um erro de comunicação com a inteligência artificial. Por favor, tente novamente.";
  }
}

// Função para criar e configurar um novo cliente
function createAndConfigureClient() {
  console.log(`[${currentConnectionId || 'GLOBAL'}] Creating new WhatsApp client instance...`);
  const newClient = new Client({
    authStrategy: new LocalAuth({
      dataPath: sessionDir,
      // Se você usar multi-device e quiser sessões totalmente separadas por connectionId:
      // clientId: currentConnectionId 
    }),
    puppeteer: {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
      // Se ainda houver problemas com AppState, pode ser necessário configurar userDataDir para isolar completamente as instâncias do Chrome
      // userDataDir: path.join(sessionDir, 'puppeteer_data', currentConnectionId || 'default') 
    },
    // Parâmetros para tentar evitar o erro AppState em algumas versões
    // qrMaxRetries: 1, // Tenta gerar QR no máximo 1 vez antes de talvez precisar de um restart do puppeteer
  });

  newClient.on('qr', (qr) => {
    console.log(`[${currentConnectionId || 'GLOBAL'}] QR Code received.`);
    currentQRCode = qr;
    moduleConnectionState = 'pending_qr';
    qrCallbacks.forEach(callback => callback(qr));
  });

  newClient.on('ready', () => {
    console.log(`[${currentConnectionId || 'GLOBAL'}] Client is ready!`);
    moduleConnectionState = 'connected';
    currentQRCode = ""; // Sinaliza conectado
    qrCallbacks.forEach(callback => callback(""));
    updateConnectionInDatabase();
  });

  newClient.on('authenticated', () => {
    console.log(`[${currentConnectionId || 'GLOBAL'}] Client authenticated.`);
    moduleConnectionState = 'authenticated'; 
    // Não necessariamente conectado ainda, 'ready' é o evento final.
  });

  newClient.on('auth_failure', (msg) => {
    console.error(`[${currentConnectionId || 'GLOBAL'}] Authentication failure: ${msg}`);
    moduleConnectionState = 'auth_failure';
    currentQRCode = null;
    qrCallbacks.forEach(callback => callback(null)); // Notifica frontend que precisa de novo QR
    updateConnectionInDatabase('auth_failure');
    // Considerar destruir o cliente aqui se a falha for irrecuperável
    // client?.destroy().catch(e => console.error('Error destroying client on auth_failure:', e));
    // client = null;
  });

  newClient.on('disconnected', (reason) => {
    console.log(`[${currentConnectionId || 'GLOBAL'}] Client disconnected. Reason: ${reason}`);
    moduleConnectionState = 'disconnected';
    currentQRCode = null;
    updateConnectionInDatabase('disconnected');
    // Não recriar/reinicializar automaticamente aqui. O usuário fará via UI se desejar.
  });

  newClient.on('loading_screen', (percent, message) => {
    console.log(`[${currentConnectionId || 'GLOBAL'}] Loading screen: ${percent}% - ${message}`);
  });

  newClient.on('error', (err) => {
    console.error(`[${currentConnectionId || 'GLOBAL'}] Client error:`, err);
    // Este é um erro genérico do cliente, pode ser grave.
    moduleConnectionState = 'error';
    currentQRCode = null;
    // Atualizar DB e notificar frontend sobre o erro.
  });

  newClient.on('message', async msg => {
    const chat = await msg.getChat();
    // Ignorar mensagens de grupo e mensagens do próprio bot (se aplicável, baseado no ID)
    if (chat.isGroup || msg.fromMe) return;

    const userMessage = msg.body;
    const from = msg.from; // Número do usuário (ex: 55119XXXXXXXX@c.us)
    const connectionIdForAI = currentConnectionId; // Usar o ID da conexão atual do whatsapp.js

    console.log(`[${connectionIdForAI || 'MSG'}] Mensagem recebida de ${from}: "${userMessage}"`);

    // Obter o prompt do sistema. No futuro, isso pode vir do DB por empresa.
    // Para agora, usaremos a variável de ambiente.
    const systemPrompt = process.env.LLM_SYSTEM_PROMPT || "Você é um assistente virtual. Responda de forma concisa.";

    if (!userMessage || userMessage.trim() === '/') return; // Ignorar comandos ou mensagens vazias (exemplo)

    try {
      // Sinalizar que o bot está "digitando" (opcional, mas bom para UX)
      if (typeof client !== 'undefined' && client && typeof client.sendPresenceAvailable === 'function') {
        chat.sendStateTyping();
      }

      const aiResponseMessage = await getAIResponse(userMessage, systemPrompt, connectionIdForAI);
      
      if (aiResponseMessage) {
        console.log(`[${connectionIdForAI || 'MSG'}] Enviando resposta da IA para ${from}: "${aiResponseMessage.substring(0,50)}..."`);
        newClient.sendMessage(from, aiResponseMessage); // Usar newClient aqui, pois estamos dentro do escopo de createAndConfigureClient
      }
      
      // Limpar o estado de "digitando"
       if (typeof client !== 'undefined' && client && typeof client.sendPresenceAvailable === 'function') {
        chat.clearState();
      }
    } catch (error) {
      // Erro já logado em getAIResponse, aqui apenas enviamos uma mensagem genérica
      console.error(`[${connectionIdForAI || 'MSG'}] Erro final ao processar mensagem com IA para ${from}:`, error);
      newClient.sendMessage(from, "Desculpe, não consegui processar sua solicitação no momento. Tente novamente.");
    }
  });

  return newClient;
}

// Inicializa o primeiro cliente
client = createAndConfigureClient();

// Função para atualizar a conexão no banco de dados
const updateConnectionInDatabase = async (customStatus) => {
  if (!currentConnectionId) {
    console.log('UPDATE_DB: No currentConnectionId. Skipping DB update.');
    return;
  }
  if (!supabaseClient) {
    console.warn('UPDATE_DB: Supabase client not available. Skipping DB update.');
    return;
  }
  try {
    const statusToUse = customStatus || moduleConnectionState;
    console.log(`[${currentConnectionId}] UPDATE_DB: Updating connection with status: ${statusToUse}`);
    const { error } = await supabaseClient
      .from('conexao')
      .update({
        status: statusToUse,
        qrcode: currentQRCode || "",
        retries: 0,
        last_connection: new Date().toISOString(),
        battery: await getBatteryInfo(),
        session: await getSessionData(),
        updated_at: new Date().toISOString()
      })
      .eq('id', currentConnectionId);
    if (error) {
      console.error(`[${currentConnectionId}] UPDATE_DB: Error:`, error);
    } else {
      console.log(`[${currentConnectionId}] UPDATE_DB: Success.`);
    }
  } catch (error) {
    console.error(`[${currentConnectionId}] UPDATE_DB: Exception:`, error);
  }
};

// Função para obter informações de bateria (quando disponível)
async function getBatteryInfo() {
  if (client && client.info && typeof client.info.getBatteryStatus === 'function') {
    try { return JSON.stringify(await client.info.getBatteryStatus()); } catch { /* ignore */ }
  }
  return null;
}

// Função para obter dados da sessão (quando disponível)
async function getSessionData() {
  if (client && client.pupPage) {
    try { return JSON.stringify({ connected: moduleConnectionState === 'connected' }); } catch { /* ignore */ }
  }
  return null;
}

// Inicializar o cliente
const initialize = async (isReinitialization = false) => {
  console.log(`[${currentConnectionId || 'GLOBAL'}] INITIALIZE${isReinitialization ? '_RE' : ''} called.`);
  if (!client) {
    console.log(`[${currentConnectionId || 'GLOBAL'}] No existing client. Creating new one.`);
    client = createAndConfigureClient();
  } else {
    console.log(`[${currentConnectionId || 'GLOBAL'}] Existing client found.`);
    // Se for uma reinicialização explícita e o cliente já existe, é melhor destruí-lo primeiro.
    // No entanto, reinitialize() já deve cuidar disso.
  }

  moduleConnectionState = 'initializing';
  currentQRCode = null;
  
  console.log(`[${currentConnectionId || 'GLOBAL'}] Calling client.initialize()...`);
  try {
    await client.initialize();
    console.log(`[${currentConnectionId || 'GLOBAL'}] client.initialize() completed.`);
  } catch (err) {
    console.error(`[${currentConnectionId || 'GLOBAL'}] Error during client.initialize():`, err);
    moduleConnectionState = 'error_initializing';
    currentQRCode = null;
    qrCallbacks.forEach(callback => callback(null));
    // Se a inicialização falhar, pode ser necessário destruir o cliente para tentar de novo
    if (client) {
        try { await client.destroy(); } catch (e) { console.error('Error destroying client after init failure:', e); }
        client = null;
    }
  }
};

// Registrar callback para receber QR code
const onQR = (callback) => {
  console.log(`[${currentConnectionId || 'GLOBAL'}] Registering QR callback.`);
  qrCallbacks.push(callback);
  if (currentQRCode) {
    console.log(`[${currentConnectionId || 'GLOBAL'}] Existing QR code found. Calling callback immediately.`);
    callback(currentQRCode);
  }
  return () => {
    qrCallbacks = qrCallbacks.filter(cb => cb !== callback);
  };
};

// Função para reinicializar completamente o cliente (forçar novo QR)
const reinitialize = async () => {
  console.log(`[${currentConnectionId || 'GLOBAL'}] REINITIALIZE called.`);
  if (client) {
    console.log(`[${currentConnectionId || 'GLOBAL'}] Existing client found. Destroying it...`);
    try {
      await client.destroy();
      console.log(`[${currentConnectionId || 'GLOBAL'}] Previous client destroyed.`);
    } catch (e) {
      console.error(`[${currentConnectionId || 'GLOBAL'}] Error destroying previous client:`, e);
    }
    client = null; // Garante que a referência seja limpa
  }
  
  // Cria e inicializa um novo cliente
  await initialize(true); // Passa flag para indicar que é uma reinicialização
  return { success: true }; // Sucesso aqui significa que o processo de reinicialização foi iniciado.
};

// Função para desconectar/logout do WhatsApp
const logout = async () => {
  console.log(`[${currentConnectionId || 'GLOBAL'}] LOGOUT called.`);
  moduleConnectionState = 'disconnected';
  currentQRCode = null;
  await updateConnectionInDatabase('disconnected');

  if (client) {
    console.log(`[${currentConnectionId || 'GLOBAL'}] Client exists. Attempting logout and destroy...`);
    try {
      await client.logout();
      console.log(`[${currentConnectionId || 'GLOBAL'}] client.logout() successful.`);
    } catch (e) {
      console.error(`[${currentConnectionId || 'GLOBAL'}] Error during client.logout():`, e);
    }
    try {
      await client.destroy();
      console.log(`[${currentConnectionId || 'GLOBAL'}] client.destroy() successful.`);
    } catch (e) {
      console.error(`[${currentConnectionId || 'GLOBAL'}] Error during client.destroy():`, e);
    }
    client = null; // Limpa a referência
  }
  console.log(`[${currentConnectionId || 'GLOBAL'}] Logout process finished.`);
  return { success: true };
};

// Métodos de interação com o WhatsApp
const sendMessage = async (to, message) => {
  if (moduleConnectionState !== 'connected' || !client) {
    throw new Error('Client not connected or not initialized');
  }
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

// Obter status atual
const getStatus = () => {
  return {
    state: moduleConnectionState,
    hasQR: currentQRCode !== null && currentQRCode !== "",
    qrCode: currentQRCode,
    connectionId: currentConnectionId,
    // connectionInfo: connectionInfo, // Este não está sendo muito usado/atualizado
    pupPageExists: client ? !!client.pupPage : false
  };
};

// Definir conexão atual
const setConnection = async (connectionData) => {
  console.log(`[${connectionData.id}] SET_CONNECTION called.`);
  currentConnectionId = connectionData.id;
  // Não tentamos mais alinhar o estado do client com o DB aqui, pois é complexo.
  // O estado do client será atualizado quando initialize/reinitialize/logout for chamado para este ID.
  // Se o cliente já estiver conectado e este ID for o mesmo, getStatus() refletirá isso.
  // Se for um ID diferente, o próximo reinitialize para este ID cuidará de criar/usar a sessão correta.
  return { success: true, connectionId: currentConnectionId };
};

module.exports = {
  initialize,
  reinitialize,
  logout,
  sendMessage,
  onQR,
  getStatus,
  setConnection,
  setSupabaseClient,
  updateConnectionInDatabase
  // forceNewQR não é mais necessário, reinitialize faz o trabalho
};
