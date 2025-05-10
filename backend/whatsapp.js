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
    ],
  };

  try {
    console.log(`[${currentConvId || 'AI'}] Enviando para LLM API. User: "${userMessage.substring(0,50)}..."`);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'accept': '*/*',
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

  newClient.on('ready', async () => {
    console.log(`[${currentConnectionId || 'GLOBAL'}] Client is ready! WID: ${newClient.info ? newClient.info.wid._serialized : 'N/A'}`);
    moduleConnectionState = 'connected';
    currentQRCode = ""; 
    
    const sessionWID = newClient.info && newClient.info.wid ? newClient.info.wid._serialized : null;

    if (sessionWID && supabaseClient) {
        // Tentar encontrar uma conexão existente pelo WID ou usar currentConnectionId se já estiver definido
        let connectionToUpdateId = currentConnectionId;

        if (!connectionToUpdateId) {
            console.log(`[WID:${sessionWID}] currentConnectionId não está definido. Tentando buscar conexão pelo WID.`);
            try {
                let { data: conexaoPorWID, error: errWID } = await supabaseClient
                    .from('conexao')
                    .select('id')
                    .eq('whatsapp_id', sessionWID)
                    // .order('updated_at', { ascending: false }) // Opcional: pegar a mais recente se houver duplicatas
                    .limit(1)
                    .single();

                if (errWID && errWID.code !== 'PGRST116') { // PGRST116 = no rows found, o que é ok
                    console.error(`[WID:${sessionWID}] Erro ao buscar conexão por WID:`, errWID);
                } else if (conexaoPorWID) {
                    console.log(`[WID:${sessionWID}] Conexão encontrada pelo WID. ID: ${conexaoPorWID.id}`);
                    currentConnectionId = conexaoPorWID.id; // Define o currentConnectionId do módulo!
                    connectionToUpdateId = conexaoPorWID.id;
                } else {
                    console.log(`[WID:${sessionWID}] Nenhuma conexão encontrada para este WID. Uma nova será criada/linkada se o usuário conectar via UI.`);
                    // Se nenhuma conexão for encontrada, não podemos atualizar o DB aqui de forma significativa sem um ID.
                    // A atualização ocorrerá quando o usuário interagir via UI e currentConnectionId for setado por setConnection.
                }
            } catch (e) {
                console.error(`[WID:${sessionWID}] Exceção ao buscar conexão por WID:`, e);
            }
        }
        
        // Atualizar o whatsapp_id e outros campos se tivermos um ID de conexão para trabalhar
        if (connectionToUpdateId) {
            console.log(`[CONEX:${connectionToUpdateId}] WID da sessão: ${sessionWID}. Atualizando whatsapp_id no banco.`);
            // Atualiza o whatsapp_id na conexão correspondente, junto com outros status
            // A função updateConnectionInDatabase usará o currentConnectionId que acabamos de definir (se encontrado).
            await updateConnectionInDatabase('connected', { whatsapp_id: sessionWID }); 
        } else {
            // Se não temos connectionToUpdateId (nem currentConnectionId inicial, nem encontrado por WID)
            // apenas logamos. A atualização do banco para esta sessão WID específica dependerá
            // de uma ação do usuário na UI que defina um currentConnectionId.
            console.log(`[WID:${sessionWID}] Sessão pronta, mas sem currentConnectionId para associar/atualizar no DB imediatamente.`);
        }
    } else if (!supabaseClient) {
      console.warn("Supabase client não disponível, não foi possível buscar/atualizar whatsapp_id na conexão.");
    }

    qrCallbacks.forEach(callback => callback(""));
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
    if (chat.isGroup || msg.fromMe) return;

    const userMessage = msg.body;
    const from = msg.from;
    const connectionIdForMsgProcessing = currentConnectionId; // ID da tabela 'conexao'

    console.log(`[${connectionIdForMsgProcessing || 'MSG'}] Mensagem recebida de ${from}: "${userMessage}"`);

    if (!userMessage || userMessage.trim() === '/') return;

    if (!supabaseClient) {
      console.error(`[${connectionIdForMsgProcessing || 'MSG'}] Supabase client não disponível. Impossível buscar dados da empresa.`);
      return newClient.sendMessage(from, "Desculpe, estou com um problema interno para obter informações e não posso processar seu pedido agora.");
    }
    
    let systemPrompt = process.env.LLM_SYSTEM_PROMPT_DEFAULT || "Você é um assistente virtual prestativo."; // Fallback

    try {
      // 1. Buscar empresa_id da tabela conexao (usa currentConnectionId que é o ID da conexão ativa)
      let { data: conexaoData, error: conexaoError } = await supabaseClient
        .from('conexao')
        .select('empresa_id')
        .eq('id', connectionIdForMsgProcessing)
        .single();

      if (conexaoError || !conexaoData || !conexaoData.empresa_id) {
        console.error(`[${connectionIdForMsgProcessing || 'MSG'}] Erro ao buscar empresa_id:`, conexaoError);
        return newClient.sendMessage(from, "Não consegui identificar a empresa associada a esta conversa. Por favor, contate o suporte.");
      }
      const empresaId = conexaoData.empresa_id;
      console.log(`[CONEX:${connectionIdForMsgProcessing}] Empresa ID: ${empresaId} associada.`);

      // 2. Buscar dados da empresa
      let { data: empresaData, error: empresaError } = await supabaseClient
        .from('empresas')
        .select('nome_fantasia') // Removido informacoes_adicionais_prompt por enquanto
        .eq('id', empresaId)
        .single();

      if (empresaError || !empresaData) {
        console.error(`[EMP:${empresaId}] Erro ao buscar dados da empresa (nome_fantasia):`, empresaError);
        return newClient.sendMessage(from, "Não encontrei os dados básicos da empresa para prosseguir."); // Mensagem de erro mais específica
      }
      
      const nomeEmpresa = empresaData.nome_fantasia || "nosso estabelecimento";
      systemPrompt = `Você é um atendente virtual para ${nomeEmpresa}. `;
      
      // Se você decidir adicionar a coluna 'informacoes_adicionais_prompt' no futuro, poderá descomentar esta parte:
      /*
      if (empresaData.informacoes_adicionais_prompt) { 
          systemPrompt += empresaData.informacoes_adicionais_prompt + " ";
      }
      */

      // 3. Buscar horário de atendimento
      let { data: horariosData, error: horariosError } = await supabaseClient
        .from('horario_atendimento')
        .select('dia_semana, hora_abertura, hora_fechamento') // Reintroduzindo os campos de hora
        .eq('empresa_id', empresaId);

      if (horariosError) {
        console.warn(`[EMP:${empresaId}] Erro ao buscar horários completos:`, horariosError);
        systemPrompt += "Problema ao carregar horários detalhados. "; 
      } else if (horariosData && horariosData.length > 0) {
        let horariosStr = "Nossos horários de atendimento são: ";
        horariosData.forEach(h => {
          const dia = h.dia_semana;
          const abertura = h.hora_abertura; // Formato HH:MM:SS
          const fechamento = h.hora_fechamento; // Formato HH:MM:SS

          let diaStr = "Dia não especificado";
          // Mapear número do dia para nome, se necessário (ex: 0 para Domingo, 1 para Segunda...)
          // Isso depende de como você armazena 'dia_semana' (0-6, 1-7, ou strings)
          // Por enquanto, vamos apenas usar o número se for um número.
          if (typeof dia === 'number') {
            // Exemplo simples, você pode querer um mapeamento mais elaborado
            const diasDaSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
            diaStr = diasDaSemana[dia] || `Dia ${dia}`;
          } else if (dia) {
            diaStr = dia; // Se já for uma string
          }

          let horarioDia = `${diaStr}: `;
          if (abertura && fechamento) {
            // Extrair apenas HH:MM de HH:MM:SS
            const aberturaSimples = abertura.substring(0, 5);
            const fechamentoSimples = fechamento.substring(0, 5);
            horarioDia += `${aberturaSimples} às ${fechamentoSimples}. `;
          } else if (abertura) {
            horarioDia += `abre às ${abertura.substring(0, 5)}. `;
          } else if (fechamento) {
            horarioDia += `fecha às ${fechamento.substring(0, 5)}. `;
          } else {
            horarioDia += "Horário não especificado. ";
          }
          horariosStr += horarioDia;
        });
        systemPrompt += horariosStr;
      } else {
        console.log(`[EMP:${empresaId}] Nenhum horário de atendimento encontrado.`);
        systemPrompt += "Horário de atendimento não informado. ";
      }

      // 4. Buscar cardápio
      // Assumindo que 'grupos' tem 'empresa_id' e 'produtos' tem 'grupo_id' e 'empresa_id'
      // A query abaixo busca grupos e seus produtos associados para a empresa específica
      let { data: gruposData, error: gruposError } = await supabaseClient
        .from('grupos')
        .select(`
          nome, 
          produtos (nome, descricao, preco)
        `)
        .eq('empresa_id', empresaId);
        // .order('ordem', { foreignTable: 'grupos' }) // Se tiver campo de ordenação
        // .order('nome', { foreignTable: 'produtos' });

      if (gruposError) {
        console.warn(`[EMP:${empresaId}] Erro ao buscar cardápio (grupos/produtos):`, gruposError);
        systemPrompt += "No momento, não consigo carregar o cardápio completo, mas posso tentar ajudar com itens específicos se você souber o nome.";
      } else if (gruposData && gruposData.length > 0) {
        let cardapioText = "\nNosso Cardápio:\n";
        gruposData.forEach(grupo => {
          if (grupo.produtos && grupo.produtos.length > 0) {
            cardapioText += `\n**${grupo.nome}**:\n`;
            grupo.produtos.forEach(produto => {
              cardapioText += `- ${produto.nome}`; 
              if (produto.descricao) cardapioText += ` (${produto.descricao})`;
              if (produto.preco) cardapioText += ` - R$${parseFloat(produto.preco).toFixed(2)}`;
              cardapioText += `\n`;
            });
          }
        });
        systemPrompt += cardapioText;
      } else {
        systemPrompt += "\nCardápio não disponível no momento. ";
      }
      
      systemPrompt += "\nGuie o cliente pelo pedido. Seja claro sobre os itens e preços. Ao final, sempre recapitule o pedido completo e peça confirmação antes de finalizar.";

      console.log(`[EMP:${empresaId}] System Prompt Final Gerado (primeiros 300 chars): ${systemPrompt.substring(0, 300)}...`);
      
      if (typeof newClient.sendPresenceAvailable === 'function') chat.sendStateTyping();
      const aiResponseMessage = await getAIResponse(userMessage, systemPrompt, connectionIdForMsgProcessing);
      if (typeof newClient.sendPresenceAvailable === 'function') chat.clearState();
      
      if (aiResponseMessage) {
        console.log(`[${connectionIdForMsgProcessing || 'MSG'}] Enviando resposta da IA para ${from}: "${aiResponseMessage.substring(0,50)}..."`);
        newClient.sendMessage(from, aiResponseMessage);
      }

    } catch (e) {
      console.error(`[${connectionIdForMsgProcessing || 'MSG'}] Erro GERAL ao processar mensagem com IA para ${from}:`, e);
      newClient.sendMessage(from, "Desculpe, tive um problema inesperado ao processar sua solicitação. Tente novamente.");
       if (typeof newClient.sendPresenceAvailable === 'function') chat.clearState();
    }
  });

  return newClient;
}

// Inicializa o primeiro cliente
client = createAndConfigureClient();

// Função para atualizar a conexão no banco de dados
const updateConnectionInDatabase = async (customStatus, extraFields = {}) => {
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
    const updatePayload = {
      status: statusToUse,
      qrcode: currentQRCode || "",
      retries: 0,
      last_connection: new Date().toISOString(),
      battery: await getBatteryInfo(),
      session: await getSessionData(),
      updated_at: new Date().toISOString(),
      ...extraFields // Incorpora campos extras como whatsapp_id
    };
    console.log(`[${currentConnectionId}] UPDATE_DB: Payload:`, updatePayload);
    
    const { error } = await supabaseClient
      .from('conexao')
      .update(updatePayload)
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
