const express = require('express');
const cors = require('cors');
const { 
  client, 
  initialize, 
  reinitialize, 
  sendMessage, 
  onQR, 
  getStatus, 
  setConnection, 
  setSupabaseClient,
  updateConnectionInDatabase,
  logout,
  forceNewQR
} = require('./whatsapp');
const config = require('./config');
const { createClient } = require('@supabase/supabase-js');

// Carregar variáveis de ambiente do arquivo .env do projeto principal
require('dotenv').config({ path: '../.env' }); // Ajuste o caminho conforme necessário

// Verificar se as variáveis de ambiente do Supabase estão definidas
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

console.log('Checking Supabase environment variables status:', {
  hasUrl: !!supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  supabaseUrlPrefix: supabaseUrl.substring(0, 10) + '...',
});

// Cliente Supabase opcional
let supabase = null;
if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('Cliente Supabase inicializado com sucesso');
    
    // Passar o cliente Supabase para o módulo WhatsApp
    setSupabaseClient(supabase);
  } catch (error) {
    console.error('Erro ao inicializar cliente Supabase:', error);
  }
} else {
  console.warn('Variáveis de ambiente do Supabase não encontradas. Funcionalidade de atualização de conexão estará limitada.');
}

// Criar app Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Armazenar referências de clientes conectados via SSE para envio de QR code
const clients = [];

// Rota para verificar status da API
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    whatsapp: getStatus()
  });
});

// Endpoint para obter o QR code atual (caso exista)
app.get('/api/qrcode', (req, res) => {
  const status = getStatus();
  if (status.hasQR) {
    res.json({ qrCode: status.qrCode });
  } else {
    res.status(404).json({ error: 'QR Code não disponível' });
  }
});

// Endpoint para atualizar o status da conexão no Supabase
app.post('/api/updateConnection', async (req, res) => {
  try {
    const { connectionId, status, last_connection } = req.body;
    
    if (!connectionId) {
      return res.status(400).json({ success: false, error: 'ID da conexão é obrigatório' });
    }
    
    // Verificar se o cliente Supabase está disponível
    if (!supabase) {
      console.warn('Solicitação para atualizar conexão, mas cliente Supabase não está disponível');
      return res.json({ 
        success: true, 
        warning: 'Atualização da conexão no banco de dados não foi realizada devido à falta de configuração do Supabase' 
      });
    }
    
    // Primeiro, definimos a conexão atual para o módulo WhatsApp
    await setConnection({ id: connectionId });
    
    // Usando a função completa passando o status explicitamente
    await updateConnectionInDatabase(status);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar conexão:', error);
    res.status(500).json({ success: false, error: error.message || 'Erro ao atualizar conexão' });
  }
});

// Endpoint para reiniciar o cliente WhatsApp (reinicialização leve)
app.post('/api/reload', (req, res) => {
  try {
    // Reiniciar cliente WhatsApp
    initialize();
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao reiniciar cliente:', error);
    res.status(500).json({ success: false, error: error.message || 'Erro ao reiniciar cliente' });
  }
});

// Endpoint para reinicialização completa do cliente WhatsApp
app.post('/api/reinitialize', async (req, res) => {
  try {
    const { connectionId } = req.body;
    
    if (connectionId) {
      console.log(`API /api/reinitialize chamada para connectionId: ${connectionId}`);
      // Definir a conexão ATUAL no módulo whatsapp para que reinitialize saiba para quem é
      await setConnection({ id: connectionId }); 
    } else {
      // Se não houver connectionId, a reinicialização será genérica (pode ser o caso de um erro inicial do sistema)
      console.log('API /api/reinitialize chamada sem connectionId específico.');
      // O módulo whatsapp usará currentConnectionId = null se não foi setado
    }

    // Em vez de fazer logout completo e reinicializar tudo,
    // usamos nossa nova função que apenas regenera o QR code
    // para essa conexão específica
    const result = await forceNewQR();
    res.json(result);
    
    // Notificar todos os clientes conectados que estamos esperando um novo QR
    const data = JSON.stringify({ 
      type: 'reload', 
      data: { 
        timestamp: Date.now(),
        connectionId,
        message: 'Aguardando novo QR code'
      } 
    });
    
    clients.forEach(client => {
      client.res.write(`data: ${data}\n\n`);
    });
  } catch (error) {
    console.error('Erro ao solicitar novo QR code:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao solicitar novo QR code' 
    });
  }
});

// Endpoint adicional específico para forçar novo QR code
app.post('/api/force-new-qr', async (req, res) => {
  try {
    const { connectionId } = req.body;
    
    if (!connectionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID da conexão é obrigatório para forçar novo QR code' 
      });
    }
    
    console.log(`API /api/force-new-qr chamada para connectionId: ${connectionId}`);
    
    // Definir a conexão atual
    await setConnection({ id: connectionId });
    
    // Forçar novo QR code
    const result = await forceNewQR();
    res.json(result);
  } catch (error) {
    console.error('Erro ao forçar novo QR code:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao forçar novo QR code' 
    });
  }
});

// Endpoint para desconexão do WhatsApp (logout)
app.post('/api/logout', async (req, res) => {
  try {
    const { connectionId } = req.body;
    
    // Definir a conexão atual se fornecida
    if (connectionId) {
      await setConnection({ id: connectionId });
    }
    
    // Realizar logout
    const result = await logout();
    res.json(result);
    
    // Notificar todos os clientes conectados sobre a desconexão
    const data = JSON.stringify({ 
      type: 'status', 
      data: { 
        state: 'disconnected', 
        timestamp: Date.now(),
        connectionId
      } 
    });
    
    clients.forEach(client => {
      client.res.write(`data: ${data}\n\n`);
    });
  } catch (error) {
    console.error('Erro ao desconectar WhatsApp:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao desconectar o WhatsApp' 
    });
  }
});

// Rota para enviar mensagem
app.post('/api/send', async (req, res) => {
  try {
    const { to, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Número de telefone e mensagem são obrigatórios' 
      });
    }
    
    const result = await sendMessage(to, message);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Erro ao processar solicitação de envio:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro interno ao enviar mensagem' 
    });
  }
});

// Endpoint SSE para stream de eventos (QR Code e status)
app.get('/api/events', (req, res) => {
  // Configurar headers para SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Enviar um evento inicial com o status atual
  const data = JSON.stringify({ type: 'status', data: getStatus() });
  res.write(`data: ${data}\n\n`);
  
  // Adicionar este cliente à lista de conexões
  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res
  };
  clients.push(newClient);
  
  // Remover cliente quando a conexão for fechada
  req.on('close', () => {
    console.log(`Cliente ${clientId} desconectado`);
    clients.splice(clients.findIndex(client => client.id === clientId), 1);
  });
});

// Registrar callback para receber QR code e distribuir para os clientes conectados
onQR((qr) => {
  const data = JSON.stringify({ type: 'qr', data: qr });
  clients.forEach(client => {
    client.res.write(`data: ${data}\n\n`);
  });
});

// Inicializar servidor
const PORT = config.server.port;
app.listen(PORT, () => {
  console.log(`Servidor API WhatsApp rodando em http://localhost:${PORT}`);
  
  // Inicializar cliente WhatsApp
  initialize();
});

// Tratar desligamento gracioso
process.on('SIGINT', () => {
  console.log('Encerrando servidor...');
  process.exit();
});
