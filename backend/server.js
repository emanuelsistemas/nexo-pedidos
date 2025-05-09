const express = require('express');
const cors = require('cors');
const { client, initialize, reinitialize, sendMessage, onQR, getStatus, setConnection } = require('./whatsapp');
const config = require('./config');
const { createClient } = require('@supabase/supabase-js');

// Verificar se as variáveis de ambiente do Supabase estão definidas
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// Cliente Supabase opcional
let supabase = null;
if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('Cliente Supabase inicializado com sucesso');
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

// Endpoint para obter informações detalhadas do telefone conectado
app.get('/api/phone-info', async (req, res) => {
  try {
    const { getPhoneInfo } = require('./whatsapp');
    const phoneInfo = await getPhoneInfo();
    if (phoneInfo.error) {
      return res.status(400).json(phoneInfo);
    }
    res.json(phoneInfo);
  } catch (error) {
    console.error('Erro ao obter informações do telefone:', error);
    res.status(500).json({ error: 'Erro ao obter informações do telefone' });
  }
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
    const { 
      connectionId, 
      status, 
      lastConnection,
      conectado,
      ultima_verificacao,
      id_sessao 
    } = req.body;
    
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
    
    console.log(`Atualizando conexão ${connectionId} com status ${status}, conectado: ${conectado}`);
    
    // Montar objeto de dados para atualizar
    const updateData = {
      status,
      lastConnection
    };
    
    // Adicionar campos opcionais se fornecidos
    if (conectado !== undefined) updateData.conectado = conectado;
    if (ultima_verificacao) updateData.ultima_verificacao = ultima_verificacao;
    if (id_sessao) updateData.id_sessao = id_sessao;
    
    // Atualizar a conexão no Supabase
    const { error } = await supabase
      .from('conexao')
      .update(updateData)
      .eq('id', connectionId);
    
    if (error) throw error;
    
    // Obter os dados atualizados da conexão
    const { data: connectionData, error: getError } = await supabase
      .from('conexao')
      .select('*')
      .eq('id', connectionId)
      .single();
      
    if (getError) throw getError;
    
    res.json({ success: true, connection: connectionData });
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
    // Reinicialização completa, desconectando sessão atual
    const result = await reinitialize();
    res.json(result);
    
    // Notificar todos os clientes conectados sobre a reinicialização
    const data = JSON.stringify({ type: 'reload', data: { timestamp: Date.now() } });
    clients.forEach(client => {
      client.res.write(`data: ${data}\n\n`);
    });
  } catch (error) {
    console.error('Erro na reinicialização completa:', error);
    res.status(500).json({ success: false, error: error.message || 'Erro ao reinicializar o cliente WhatsApp' });
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
