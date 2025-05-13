const express = require('express');
const cors = require('cors');
const {
  initialize,
  reinitialize,
  sendMessage,
  onQR,
  getStatus,
  setConnection,
  setSupabaseClient,
  updateConnectionInDatabase,
  logout
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
      await setConnection({ id: connectionId });
    } else {
      console.log('API /api/reinitialize chamada sem connectionId específico.');
    }

    // Verificar status atual antes de reinicializar
    const currentStatus = getStatus();

    // Se já temos um QR code válido, retornar imediatamente
    if (currentStatus.hasQR && currentStatus.qrCode && currentStatus.state === 'pending_qr') {
      console.log('API /api/reinitialize: QR code já disponível, retornando imediatamente');

      // Enviar o QR code existente via SSE
      const qrData = JSON.stringify({
        type: 'qr',
        data: currentStatus.qrCode
      });

      clients.forEach(client => {
        client.res.write(`data: ${qrData}\n\n`);
      });

      return res.json({
        success: true,
        hasExistingQR: true,
        message: 'QR code já disponível'
      });
    }

    // Iniciar reinicialização em background
    const reinitPromise = reinitialize();

    // Responder imediatamente ao cliente
    res.json({
      success: true,
      message: 'Reinicialização iniciada, aguarde o QR code via SSE'
    });

    // Notificar clientes via SSE que a reinicialização foi iniciada
    const data = JSON.stringify({
      type: 'reload',
      data: {
        timestamp: Date.now(),
        connectionId,
        message: 'Sessão reinicializada, aguardando novo QR code'
      }
    });

    clients.forEach(client => {
      client.res.write(`data: ${data}\n\n`);
    });

    // Continuar o processo de reinicialização em background
    reinitPromise.catch(error => {
      console.error('Erro durante reinicialização em background:', error);

      // Notificar clientes sobre o erro
      const errorData = JSON.stringify({
        type: 'error',
        data: {
          message: 'Erro ao reinicializar sessão',
          error: error.message
        }
      });

      clients.forEach(client => {
        client.res.write(`data: ${errorData}\n\n`);
      });
    });
  } catch (error) {
    console.error('Erro ao solicitar reinicialização da sessão:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao solicitar reinicialização da sessão'
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

// Verificar dependências críticas
try {
  // Verificar se o Puppeteer está instalado
  require('puppeteer');
  console.log('✅ Puppeteer encontrado');
} catch (error) {
  console.error('❌ Puppeteer não encontrado. Instalando...');
  console.error('Execute: npm install puppeteer');
  console.error('Depois reinicie o servidor');
  process.exit(1);
}

// Importar o serviço de verificação de status da loja
const { checkAndUpdateStoreStatus } = require('./services/storeStatusService');

// Inicializar servidor
const PORT = config.server.port;
app.listen(PORT, () => {
  console.log(`Servidor API WhatsApp rodando em http://localhost:${PORT}`);
  console.log(`Supabase configurado: ${!!supabase}`);
  console.log(`Diretório de sessões: ${config.whatsapp.sessionDir}`);

  // Inicializar cliente WhatsApp
  initialize().catch(err => {
    console.error('Erro ao inicializar cliente WhatsApp:', err);
    console.error('O servidor continuará rodando, mas o WhatsApp pode não funcionar corretamente');
    console.error('Verifique se todas as dependências estão instaladas e tente novamente');
  });

  // Iniciar verificação periódica do status das lojas
  console.log('Iniciando verificação periódica do status das lojas...');

  // Verificar imediatamente na inicialização
  checkAndUpdateStoreStatus();

  // Configurar verificação periódica (a cada 1 minuto)
  setInterval(() => {
    checkAndUpdateStoreStatus();
  }, 60 * 1000);
});

// Tratar desligamento gracioso
process.on('SIGINT', () => {
  console.log('Encerrando servidor...');
  process.exit();
});
