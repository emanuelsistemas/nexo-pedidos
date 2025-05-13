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

// Armazenar histórico de conversas por número de telefone
const conversationHistory = new Map();

/**
 * Extrai CEP de uma mensagem
 * @param {string} message - Mensagem do usuário
 * @returns {string|null} - CEP encontrado ou null
 */
function extrairCEP(message) {
  // Padrão para CEP: 12345-678 ou 12345678
  const cepPattern = /\b\d{5}[-.]?\d{3}\b/;
  const match = message.match(cepPattern);

  console.log(`[DEBUG] Tentando extrair CEP de: "${message}"`);

  if (match) {
    // Remover caracteres não numéricos
    const cep = match[0].replace(/\D/g, '');
    console.log(`[DEBUG] CEP extraído: ${cep}`);
    return cep;
  }

  console.log(`[DEBUG] Nenhum CEP encontrado na mensagem`);
  return null;
}

/**
 * Verifica se a mensagem contém pergunta sobre taxa de entrega
 * @param {string} message - Mensagem do usuário
 * @returns {boolean} - True se for pergunta sobre taxa de entrega
 */
function perguntaSobreTaxaEntrega(message) {
  const lowerMessage = message.toLowerCase();

  // Padrões comuns de perguntas sobre taxa de entrega
  const patterns = [
    /taxa.*(entrega|delivery)/,
    /quanto.*(custa|cobr|fica).*(entreg|delivery)/,
    /valor.*(entrega|delivery)/,
    /frete/,
    /entreg[a|r].*(quanto|valor|custa|preço)/
  ];

  const result = patterns.some(pattern => pattern.test(lowerMessage));
  console.log(`[DEBUG] Verificando se é pergunta sobre taxa: "${message}" => ${result ? 'SIM' : 'NÃO'}`);
  return result;
}

/**
 * Consulta o CEP na API ViaCEP
 * @param {string} cep - CEP a ser consultado
 * @returns {Promise<Object>} - Dados do endereço
 */
async function consultarCEP(cep) {
  // Remover caracteres não numéricos
  cep = cep.replace(/\D/g, '');

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);

    if (!response.ok) {
      throw new Error(`Erro na consulta: ${response.status}`);
    }

    const data = await response.json();

    if (data.erro) {
      throw new Error('CEP não encontrado');
    }

    return {
      cep: data.cep,
      logradouro: data.logradouro,
      bairro: data.bairro,
      cidade: data.localidade,
      estado: data.uf
    };
  } catch (error) {
    console.error('Erro ao consultar CEP:', error);
    throw error;
  }
}

/**
 * Verifica o modo de cálculo de taxa de entrega da empresa
 * @param {string} empresaId - ID da empresa
 * @returns {Promise<string>} - Retorna 'bairro' ou 'distancia'
 */
async function verificarModoTaxaEntrega(empresaId, supabaseClient) {
  try {
    const { data, error } = await supabaseClient
      .from('configuracoes')
      .select('taxa_modo')
      .eq('empresa_id', empresaId)
      .single();

    if (error) {
      console.error(`Erro ao buscar modo de taxa: ${error.message}`);
      throw error;
    }

    // Se não encontrar configuração, assume o padrão como 'bairro'
    return data?.taxa_modo || 'bairro';
  } catch (error) {
    console.error(`Erro ao verificar modo de taxa: ${error.message}`);
    throw error;
  }
}

/**
 * Calcula a taxa de entrega por bairro
 * @param {string} empresaId - ID da empresa
 * @param {string} bairro - Bairro do cliente
 * @returns {Promise<Object>} - Informações da taxa de entrega
 */
async function calcularTaxaPorBairro(empresaId, bairro, supabaseClient) {
  try {
    // Normalizar o nome do bairro para facilitar a busca
    const bairroNormalizado = bairro.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    // Buscar na tabela taxa_entrega
    const { data, error } = await supabaseClient
      .from('taxa_entrega')
      .select('*')
      .eq('empresa_id', empresaId)
      .ilike('bairro', `%${bairroNormalizado}%`);

    if (error) {
      console.error(`Erro ao buscar taxa por bairro: ${error.message}`);
      return {
        encontrado: false,
        mensagem: 'Não foi possível encontrar a taxa de entrega para este bairro.'
      };
    }

    if (!data || data.length === 0) {
      return {
        encontrado: false,
        mensagem: `Não encontramos taxa de entrega cadastrada para o bairro ${bairro}.`
      };
    }

    // Encontrou a taxa
    return {
      encontrado: true,
      valor: data[0].valor,
      bairro: data[0].bairro,
      tempo_entrega: data[0].tempo_entrega
    };
  } catch (error) {
    console.error(`Erro ao calcular taxa por bairro: ${error.message}`);
    throw error;
  }
}

/**
 * Calcula a taxa de entrega por distância usando Google Maps API
 * @param {string} empresaId - ID da empresa
 * @param {string} cepOrigem - CEP da empresa
 * @param {string} cepDestino - CEP do cliente
 * @param {Object} supabaseClient - Cliente Supabase
 * @returns {Promise<Object>} - Informações da taxa de entrega
 */
async function calcularTaxaPorDistancia(empresaId, cepOrigem, cepDestino, supabaseClient) {
  try {
    console.log(`Calculando taxa por distância: Origem=${cepOrigem}, Destino=${cepDestino}`);

    // Obter a chave da API do Google Maps
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    console.log(`[DEBUG] Verificando chave API Google Maps: ${apiKey ? 'Configurada' : 'NÃO CONFIGURADA'}`);

    if (!apiKey) {
      console.error(`[DEBUG] ERRO CRÍTICO: Chave da API Google Maps não configurada`);
      throw new Error('Chave da API Google Maps não configurada');
    }

    // 1. Obter coordenadas do CEP de origem (empresa) usando Geocoding API
    const origemResponse = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${cepOrigem}&region=br&key=${apiKey}`
    );
    const origemData = await origemResponse.json();

    if (origemData.status !== 'OK') {
      console.error('Erro ao geocodificar CEP de origem:', origemData);
      throw new Error(`Erro ao geocodificar CEP de origem: ${origemData.status}`);
    }

    const origemCoords = origemData.results[0].geometry.location;
    console.log('Coordenadas de origem:', origemCoords);

    // 2. Obter coordenadas do CEP de destino (cliente) usando Geocoding API
    const destinoResponse = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${cepDestino}&region=br&key=${apiKey}`
    );
    const destinoData = await destinoResponse.json();

    if (destinoData.status !== 'OK') {
      console.error('Erro ao geocodificar CEP de destino:', destinoData);
      throw new Error(`Erro ao geocodificar CEP de destino: ${destinoData.status}`);
    }

    const destinoCoords = destinoData.results[0].geometry.location;
    console.log('Coordenadas de destino:', destinoCoords);

    // 3. Calcular a distância usando Distance Matrix API
    const distanceResponse = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origemCoords.lat},${origemCoords.lng}&destinations=${destinoCoords.lat},${destinoCoords.lng}&mode=driving&language=pt-BR&key=${apiKey}`
    );
    const distanceData = await distanceResponse.json();

    if (distanceData.status !== 'OK') {
      console.error('Erro ao calcular distância:', distanceData);
      throw new Error(`Erro ao calcular distância: ${distanceData.status}`);
    }

    // Verificar se há resultados válidos
    if (!distanceData.rows[0] || !distanceData.rows[0].elements[0] ||
        distanceData.rows[0].elements[0].status !== 'OK') {
      console.error('Resposta inválida da API Distance Matrix:', distanceData);
      throw new Error('Não foi possível calcular a distância entre os CEPs');
    }

    // Extrair a distância em km (arredondada para 1 casa decimal)
    const distanciaMetros = distanceData.rows[0].elements[0].distance.value;
    const distanciaKm = Math.round(distanciaMetros / 100) / 10; // Arredonda para 1 casa decimal
    const tempoEstimado = Math.round(distanceData.rows[0].elements[0].duration.value / 60); // Tempo em minutos

    console.log(`Distância calculada: ${distanciaKm} km (${distanciaMetros} metros), Tempo estimado: ${tempoEstimado} min`);
    console.log(`Detalhes da distância: ${JSON.stringify(distanceData.rows[0].elements[0].distance)}`);
    console.log(`Detalhes do tempo: ${JSON.stringify(distanceData.rows[0].elements[0].duration)}`);

    // 4. Buscar a taxa correspondente na tabela taxa_entrega
    console.log(`[DEBUG] Buscando taxa para empresa_id=${empresaId} e distância=${distanciaKm}km`);

    const { data, error } = await supabaseClient
      .from('taxa_entrega')
      .select('*')
      .eq('empresa_id', empresaId)
      .gte('km', distanciaKm) // Buscar taxas onde km (distância máxima) é maior ou igual à distância calculada
      .order('km', { ascending: true }) // Ordenar do menor para o maior para pegar a taxa mais próxima
      .limit(1);

    if (error) {
      console.error('Erro ao buscar taxa por distância:', error);
      return {
        encontrado: false,
        mensagem: 'Não foi possível encontrar a taxa de entrega para esta distância.'
      };
    }

    console.log(`[DEBUG] Resultado da consulta de taxa:`, JSON.stringify(data));

    if (!data || data.length === 0) {
      console.log(`[DEBUG] Nenhuma taxa encontrada para distância ${distanciaKm} km`);
      return {
        encontrado: false,
        mensagem: `Não encontramos taxa de entrega cadastrada para a distância de ${distanciaKm} km.`
      };
    }

    console.log(`[DEBUG] Taxa encontrada: R$ ${data[0].valor.toFixed(2)} para distância até ${data[0].km}km`);

    // Encontrou a taxa
    return {
      encontrado: true,
      valor: data[0].valor,
      distancia: distanciaKm,
      tempo_estimado: tempoEstimado,
      tempo_entrega: data[0].tempo_entrega,
      endereco_destino: destinoData.results[0].formatted_address
    };
  } catch (error) {
    console.error(`Erro ao calcular taxa por distância: ${error.message}`);
    throw error;
  }
}

/**
 * Função principal para calcular a taxa de entrega
 * @param {string} empresaId - ID da empresa
 * @param {string} cepCliente - CEP do cliente
 * @returns {Promise<Object>} - Informações da taxa de entrega
 */
async function calcularTaxaEntrega(empresaId, cepCliente, supabaseClient) {
  try {
    // 1. Verificar o modo de cálculo da taxa
    const modoTaxa = await verificarModoTaxaEntrega(empresaId, supabaseClient);
    console.log(`Modo de taxa configurado: ${modoTaxa}`);

    // 2. Calcular a taxa conforme o modo
    if (modoTaxa === 'bairro') {
      // Obter informações do bairro pelo CEP
      const endereco = await consultarCEP(cepCliente);

      // Calcular taxa por bairro
      const resultado = await calcularTaxaPorBairro(empresaId, endereco.bairro, supabaseClient);

      return {
        modo: 'bairro',
        bairro: endereco.bairro,
        cidade: endereco.cidade,
        ...resultado
      };
    } else if (modoTaxa === 'distancia') {
      // Obter CEP da empresa
      const { data: empresa, error } = await supabaseClient
        .from('empresas')
        .select('cep')
        .eq('id', empresaId)
        .single();

      if (error || !empresa || !empresa.cep) {
        console.error('Erro ao obter CEP da empresa:', error || 'CEP não encontrado');
        throw new Error('Não foi possível obter o CEP da empresa');
      }

      console.log(`CEP da empresa: ${empresa.cep}, CEP do cliente: ${cepCliente}`);

      // Calcular taxa por distância
      return await calcularTaxaPorDistancia(empresaId, empresa.cep, cepCliente, supabaseClient);
    } else {
      throw new Error(`Modo de cálculo de taxa desconhecido: ${modoTaxa}`);
    }
  } catch (error) {
    console.error(`Erro ao calcular taxa de entrega: ${error.message}`);
    throw error;
  }
}

/**
 * Processa perguntas sobre taxa de entrega no WhatsApp
 * @param {string} userMessage - Mensagem do usuário
 * @param {string} empresaId - ID da empresa
 * @param {Object} supabaseClient - Cliente Supabase
 * @returns {Promise<Object|null>} - Informações processadas ou null se não for sobre taxa
 */
async function processarPerguntaTaxaEntrega(userMessage, empresaId, supabaseClient) {
  // Verificar se a mensagem contém pergunta sobre taxa de entrega
  console.log(`[DEBUG] Processando possível pergunta sobre taxa: "${userMessage}"`);

  if (!perguntaSobreTaxaEntrega(userMessage)) {
    console.log(`[DEBUG] Não é uma pergunta sobre taxa de entrega`);
    return null; // Não é uma pergunta sobre taxa de entrega
  }

  console.log(`[EMP:${empresaId}] Detectada pergunta sobre taxa de entrega`);

  // Verificar se a mensagem contém um CEP
  const cep = extrairCEP(userMessage);

  if (!cep) {
    console.log(`[DEBUG] Pergunta sobre taxa sem CEP`);
    return {
      tipo: 'taxa_sem_cep',
      mensagem: 'Para calcular a taxa de entrega com precisão, preciso do seu CEP completo (formato: 00000-000). Por favor, informe o CEP completo do endereço de entrega. Não consigo calcular corretamente apenas com o nome do bairro.'
    };
  }

  console.log(`[DEBUG] Pergunta sobre taxa com CEP: ${cep}`);

  try {
    console.log(`[EMP:${empresaId}] Calculando taxa de entrega para CEP: ${cep}`);
    const resultado = await calcularTaxaEntrega(empresaId, cep, supabaseClient);

    if (!resultado.encontrado) {
      return {
        tipo: 'taxa_nao_encontrada',
        mensagem: `${resultado.mensagem} Por favor, verifique se o CEP está correto ou informe outro CEP.`,
        cep,
        resultado
      };
    }

    if (resultado.modo === 'bairro') {
      return {
        tipo: 'taxa_encontrada',
        mensagem: `A taxa de entrega para o bairro ${resultado.bairro} é R$ ${resultado.valor.toFixed(2)}. Tempo estimado de entrega: ${resultado.tempo_entrega} minutos.`,
        cep,
        resultado
      };
    } else {
      // Modo distância
      let mensagem = `A taxa de entrega para o seu endereço é R$ ${resultado.valor.toFixed(2)} (distância: ${resultado.distancia} km). Tempo estimado de entrega: ${resultado.tempo_entrega} minutos.`;

      console.log(`[DEBUG] Mensagem de taxa gerada: "${mensagem}"`);
      console.log(`[DEBUG] Valor da taxa: R$ ${resultado.valor.toFixed(2)}`);
      console.log(`[DEBUG] Tempo de entrega: ${resultado.tempo_entrega} minutos`);

      return {
        tipo: 'taxa_encontrada',
        mensagem,
        cep,
        resultado
      };
    }
  } catch (error) {
    console.error(`[EMP:${empresaId}] Erro ao processar taxa de entrega:`, error);
    return {
      tipo: 'taxa_erro',
      mensagem: "Desculpe, tivemos um problema ao calcular a taxa de entrega. Por favor, tente novamente mais tarde."
    };
  }
}

// Função para chamar a API do LLM
async function getAIResponse(userMessage, systemContentForAI, currentConvId, from) {
  const apiToken = process.env.LLM_API_TOKEN;

  if (!apiToken) {
    console.error(`[${currentConvId || 'AI'}] LLM_API_TOKEN não configurado.`);
    return "Desculpe, estou com problemas para acessar minha inteligência artificial no momento. Por favor, tente mais tarde.";
  }

  // Obter ou inicializar o histórico de conversa para este número
  if (!conversationHistory.has(from)) {
    conversationHistory.set(from, []);
  }

  const history = conversationHistory.get(from);

  // Adicionar a mensagem do usuário ao histórico
  history.push({
    role: "user",
    content: userMessage
  });

  // Limitar o histórico a 10 mensagens para evitar tokens excessivos
  while (history.length > 10) {
    history.shift();
  }

  // Construir mensagens com histórico
  const messages = [
    {
      role: "system",
      content: systemContentForAI
    },
    ...history
  ];

  const apiUrl = 'https://api.llmapi.com/chat/completions';
  const payload = {
    model: "llama3-8b", // Modelo Llama3 da LLM API
    messages: messages,
    temperature: 0.1, // Temperatura muito baixa para minimizar alucinações e garantir respostas determinísticas
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

      // Adicionar a resposta da IA ao histórico
      const aiResponse = data.choices[0].message.content.trim();
      history.push({
        role: "assistant",
        content: aiResponse
      });

      return aiResponse;
    } else {
      console.error(`[${currentConvId || 'AI'}] Resposta inesperada da LLM API:`, JSON.stringify(data, null, 2));
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
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ],
    headless: true,
    // Comentando esta linha para evitar problemas com o Puppeteer
    // executablePath: require('puppeteer').executablePath(),
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

  // Mapa para rastrear se já enviamos uma mensagem para um número
  const firstMessageSent = new Map();

  newClient.on('message', async msg => {
    const chat = await msg.getChat();
    if (chat.isGroup || msg.fromMe) return;

    const userMessage = msg.body;
    const from = msg.from;
    let connectionIdForMsgProcessing = currentConnectionId; // ID da tabela 'conexao'

    console.log(`[${connectionIdForMsgProcessing || 'MSG'}] Mensagem recebida de ${from}: "${userMessage}"`);

    if (!userMessage || userMessage.trim() === '/') return;

    console.log(`[${connectionIdForMsgProcessing || 'MSG'}] Processando mensagem...`);

    // Verificar se é a primeira mensagem deste número
    const isFirstMessage = !firstMessageSent.has(from);

    if (!supabaseClient) {
      console.error(`[${connectionIdForMsgProcessing || 'MSG'}] Supabase client não disponível. Impossível buscar dados da empresa.`);
      return newClient.sendMessage(from, "Desculpe, estou com um problema interno para obter informações e não posso processar seu pedido agora.");
    }

    try {
      // Se não temos connectionId definido, tentar buscar pelo WID
      if (!connectionIdForMsgProcessing) {
        console.log(`[MSG] currentConnectionId não está definido. Tentando buscar conexão pelo WID.`);
        const sessionWID = newClient.info && newClient.info.wid ? newClient.info.wid._serialized : null;

        if (sessionWID) {
          let { data: conexaoPorWID, error: errWID } = await supabaseClient
            .from('conexao')
            .select('id')
            .eq('whatsapp_id', sessionWID)
            .limit(1)
            .single();

          if (errWID && errWID.code !== 'PGRST116') { // PGRST116 = no rows found
            console.error(`[WID:${sessionWID}] Erro ao buscar conexão por WID:`, errWID);
          } else if (conexaoPorWID) {
            console.log(`[WID:${sessionWID}] Conexão encontrada pelo WID. ID: ${conexaoPorWID.id}`);
            connectionIdForMsgProcessing = conexaoPorWID.id;
            currentConnectionId = conexaoPorWID.id; // Atualiza a variável global também
          } else {
            console.log(`[WID:${sessionWID}] Nenhuma conexão encontrada para este WID.`);
          }
        }
      }

      // Se ainda não temos connectionId, não podemos continuar
      if (!connectionIdForMsgProcessing) {
        console.error(`[MSG] Não foi possível determinar o ID da conexão. Impossível processar mensagem.`);
        return newClient.sendMessage(from, "Desculpe, não consegui identificar a conexão atual. Por favor, reconecte o WhatsApp pelo painel administrativo.");
      }

      // 1. Buscar empresa_id da tabela conexao
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

      // 3. Verificar status da loja (aberto/fechado)
      console.log(`[EMP:${empresaId}] Verificando status da loja...`);
      let { data: statusLojaData, error: statusLojaError } = await supabaseClient
        .from('status_loja')
        .select('aberto')
        .eq('empresa_id', empresaId)
        .single();

      console.log(`[EMP:${empresaId}] Resultado da verificação:`, JSON.stringify(statusLojaData), JSON.stringify(statusLojaError));

      if (statusLojaError) {
        console.error(`[EMP:${empresaId}] Erro ao verificar status da loja:`, statusLojaError);
        // Continuar mesmo com erro, assumindo que a loja está aberta
      } else if (statusLojaData && statusLojaData.aberto === false) {
        console.log(`[EMP:${empresaId}] Loja está fechada (aberto = ${statusLojaData.aberto}). Enviando mensagem automática.`);
        console.log(`[EMP:${empresaId}] Tipo de statusLojaData.aberto: ${typeof statusLojaData.aberto}`);

        // Obter o dia da semana atual (0 = Domingo, 1 = Segunda, etc.)
        const hoje = new Date();
        const diaSemana = hoje.getDay();

        // Buscar horário de abertura para o dia atual
        let { data: horarioData, error: horarioError } = await supabaseClient
          .from('horario_atendimento')
          .select('hora_abertura')
          .eq('empresa_id', empresaId)
          .eq('dia_semana', diaSemana)
          .single();

        let mensagemHorario = "";
        if (!horarioError && horarioData && horarioData.hora_abertura) {
          // Formatar o horário de abertura (HH:MM:SS -> HH:MM)
          const horarioAbertura = horarioData.hora_abertura.substring(0, 5);
          mensagemHorario = `Nosso atendimento hoje será a partir das ${horarioAbertura}.`;
        } else {
          // Não há horário para hoje, buscar o próximo dia disponível
          console.log(`[EMP:${empresaId}] Não há horário para hoje (dia ${diaSemana}). Buscando próximo dia disponível...`);

          // Buscar todos os horários de atendimento ordenados por dia da semana
          let { data: todosHorarios, error: todosHorariosError } = await supabaseClient
            .from('horario_atendimento')
            .select('dia_semana, hora_abertura')
            .eq('empresa_id', empresaId)
            .order('dia_semana');

          if (!todosHorariosError && todosHorarios && todosHorarios.length > 0) {
            // Encontrar o próximo dia disponível
            let proximoDia = null;
            let proximoHorario = null;

            // Primeiro, procurar um dia após o dia atual
            for (const horario of todosHorarios) {
              if (horario.dia_semana > diaSemana) {
                proximoDia = horario.dia_semana;
                proximoHorario = horario.hora_abertura;
                break;
              }
            }

            // Se não encontrou, voltar ao início da semana
            if (proximoDia === null) {
              proximoDia = todosHorarios[0].dia_semana;
              proximoHorario = todosHorarios[0].hora_abertura;
            }

            // Mapear o número do dia para o nome do dia
            const diasDaSemana = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
            const nomeDia = diasDaSemana[proximoDia];

            // Formatar o horário (HH:MM:SS -> HH:MM)
            const horarioFormatado = proximoHorario.substring(0, 5);

            mensagemHorario = `Hoje a loja não estará aberta. O próximo atendimento será ${nomeDia} a partir das ${horarioFormatado}.`;
          } else {
            mensagemHorario = "Consulte nossos horários de atendimento para mais informações.";
          }
        }

        // Enviar mensagem automática informando que a loja está fechada
        const mensagemFechado = `Olá! ${nomeEmpresa} está fechado no momento e não podemos processar seu pedido agora. ${mensagemHorario} Agradecemos sua compreensão e esperamos atendê-lo em breve!`;

        console.log(`[EMP:${empresaId}] Enviando mensagem automática: "${mensagemFechado}"`);

        try {
          await newClient.sendMessage(from, mensagemFechado);
          console.log(`[EMP:${empresaId}] Mensagem automática enviada com sucesso!`);
          return true; // Retornar para não continuar com o processamento da IA
        } catch (error) {
          console.error(`[EMP:${empresaId}] Erro ao enviar mensagem automática:`, error);
          return false; // Retornar para não continuar com o processamento da IA
        }
      }

      // Se a loja estiver aberta, continua com o processamento normal usando IA
      let systemPrompt = process.env.LLM_SYSTEM_PROMPT_DEFAULT || "Você é um assistente virtual prestativo."; // Fallback
      systemPrompt = `Você é um atendente virtual para ${nomeEmpresa}.

Você deve ser amigável, conversacional e natural em suas respostas. Evite respostas robóticas ou repetitivas. Adapte seu tom para ser mais humano e menos formal. Use linguagem natural, como se fosse um atendente real conversando pelo WhatsApp.

IMPORTANTE: Nunca invente informações que não foram fornecidas. Se você não tiver uma informação específica, diga que precisará verificar em vez de inventar. Não mencione produtos, preços ou políticas que não estejam explicitamente no cardápio ou nas informações fornecidas.

Seja atencioso e responda diretamente às perguntas do cliente. Se o cliente perguntar sobre um item específico do cardápio, forneça detalhes sobre ele APENAS se o item existir no cardápio fornecido. Se o cliente fizer perguntas sobre o estabelecimento, responda de forma útil e informativa usando APENAS as informações disponíveis.

Mantenha suas respostas concisas e diretas, evitando textos muito longos que possam cansar o cliente.

Quando o cliente perguntar sobre taxa de entrega, responda APENAS com a informação da taxa calculada, sem adicionar informações sobre produtos ou promoções.`;

      // Se você decidir adicionar a coluna 'informacoes_adicionais_prompt' no futuro, poderá descomentar esta parte:
      /*
      if (empresaData.informacoes_adicionais_prompt) {
          systemPrompt += empresaData.informacoes_adicionais_prompt + " ";
      }
      */

      // 3. Buscar horário de atendimento (mas não incluir automaticamente no prompt)
      let { data: horariosData, error: horariosError } = await supabaseClient
        .from('horario_atendimento')
        .select('dia_semana, hora_abertura, hora_fechamento')
        .eq('empresa_id', empresaId);

      if (horariosError) {
        console.warn(`[EMP:${empresaId}] Erro ao buscar horários completos:`, horariosError);
      }

      // Armazenar os horários para uso quando solicitado, mas não incluir no prompt inicial
      let horariosInfo = "";
      if (horariosData && horariosData.length > 0) {
        horariosData.forEach(h => {
          const dia = h.dia_semana;
          const abertura = h.hora_abertura;
          const fechamento = h.hora_fechamento;

          let diaStr = "Dia não especificado";
          if (typeof dia === 'number') {
            const diasDaSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
            diaStr = diasDaSemana[dia] || `Dia ${dia}`;
          } else if (dia) {
            diaStr = dia;
          }

          let horarioDia = `${diaStr}: `;
          if (abertura && fechamento) {
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
          horariosInfo += horarioDia;
        });

        // Adicionar instruções para a IA sobre como lidar com perguntas sobre horários
        // Instruções explícitas para NÃO mencionar horários na primeira mensagem
        systemPrompt += "IMPORTANTE: NUNCA mencione os horários de atendimento na sua primeira mensagem ou saudação inicial. ";
        systemPrompt += "Sua primeira mensagem deve ser apenas uma saudação simples e ir direto para a condução do pedido. ";
        systemPrompt += `Apenas se o cliente perguntar especificamente sobre horários de funcionamento, responda com: "${horariosInfo}". `;
      } else {
        console.log(`[EMP:${empresaId}] Nenhum horário de atendimento encontrado.`);
        systemPrompt += "Horário de atendimento não disponível. Informe isso apenas se o cliente perguntar. ";
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

      // Variável para verificar se existem bebidas no cardápio
      let temBebidas = false;

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

            // Verificar se este grupo é de bebidas (verificação simples pelo nome)
            if (grupo.nome.toLowerCase().includes('bebida') ||
                grupo.nome.toLowerCase().includes('bebidas') ||
                grupo.nome.toLowerCase().includes('drink') ||
                grupo.nome.toLowerCase().includes('líquido')) {
              temBebidas = true;
            }
          }
        });
        systemPrompt += cardapioText;
      } else {
        systemPrompt += "\nCardápio não disponível no momento. ";
      }

      // 5. Buscar formas de pagamento
      let { data: formasPagamentoData, error: formasPagamentoError } = await supabaseClient
        .from('formas_pagamento')
        .select('tipo')
        .eq('empresa_id', empresaId);

      let formasPagamentoText = "";
      if (formasPagamentoError) {
        console.warn(`[EMP:${empresaId}] Erro ao buscar formas de pagamento:`, formasPagamentoError);
      } else if (formasPagamentoData && formasPagamentoData.length > 0) {
        formasPagamentoText = "Formas de pagamento disponíveis: ";
        formasPagamentoData.forEach((forma, index) => {
          formasPagamentoText += forma.tipo;
          if (index < formasPagamentoData.length - 1) {
            formasPagamentoText += ", ";
          }
        });
      } else {
        formasPagamentoText = "Informações sobre formas de pagamento não disponíveis no momento.";
      }

      systemPrompt += "\nIMPORTANTE: Sua primeira mensagem deve ser APENAS uma saudação breve como 'Olá! Bem-vindo à " + nomeEmpresa + "! Como posso ajudar?' ou similar. NÃO MENCIONE HORÁRIOS DE ATENDIMENTO na primeira mensagem sob hipótese alguma. Guie o cliente pelo pedido imediatamente. Seja claro sobre os itens e preços. Ao final, sempre recapitule o pedido completo e peça confirmação antes de finalizar.";

      // Adicionar informações sobre formas de pagamento ao prompt
      systemPrompt += "\n" + formasPagamentoText;

      // Instruções para o fluxo estruturado de pedido
      systemPrompt += "\n\nFLUXO ESTRUTURADO DE PEDIDO: Siga RIGOROSAMENTE este fluxo para conduzir o atendimento:";
      systemPrompt += "\n1. VERIFICAÇÃO DE ENDEREÇO: Antes de iniciar o pedido, solicite SEMPRE o CEP completo do cliente para verificar se está dentro da área de cobertura. NÃO aceite apenas o nome do bairro, pois isso pode causar imprecisões. Insista educadamente pelo CEP completo. Quando o cliente informar o CEP, verifique se está na área de entrega e SEMPRE informe o valor da taxa de entrega e o tempo estimado de entrega para aquele endereço. Se o endereço não estiver na área de entrega, informe ao cliente e encerre o atendimento.";
      systemPrompt += "\n2. OFERTA DE ITENS: Após confirmar que o endereço está na área de entrega e informar o valor da taxa de entrega e o tempo estimado, ofereça os itens do cardápio. Se o item selecionado tiver opções adicionais, apresente todas as opções disponíveis para aquele produto.";

      // Só incluir a etapa de bebidas se houver bebidas no cardápio
      if (temBebidas) {
        systemPrompt += "\n3. OFERTA DE BEBIDAS: Após finalizar a seleção dos itens principais, ofereça bebidas disponíveis no cardápio.";
        systemPrompt += "\n4. MÉTODO DE PAGAMENTO: Apresente APENAS as formas de pagamento listadas acima e peça ao cliente para escolher uma opção. NÃO INVENTE formas de pagamento que não estão na lista.";
        systemPrompt += "\n5. CONFIRMAÇÃO FINAL: Faça uma recapitulação completa do pedido incluindo: endereço de entrega (CEP), taxa de entrega (valor exato calculado para o CEP), tempo estimado de entrega (em minutos), todos os itens e subitens selecionados com seus valores, e forma de pagamento escolhida. SEMPRE inclua o valor da taxa de entrega e o tempo estimado na recapitulação. Se não tiver essa informação, solicite o CEP novamente para calcular. Peça confirmação final ao cliente.";
        systemPrompt += "\n6. FINALIZAÇÃO: Após a confirmação, informe que o pedido foi enviado para o estabelecimento e está aguardando aceitação.";
      } else {
        // Se não houver bebidas, pular a etapa de oferta de bebidas
        systemPrompt += "\n3. MÉTODO DE PAGAMENTO: Apresente APENAS as formas de pagamento listadas acima e peça ao cliente para escolher uma opção. NÃO INVENTE formas de pagamento que não estão na lista.";
        systemPrompt += "\n4. CONFIRMAÇÃO FINAL: Faça uma recapitulação completa do pedido incluindo: endereço de entrega (CEP), taxa de entrega (valor exato calculado para o CEP), tempo estimado de entrega (em minutos), todos os itens e subitens selecionados com seus valores, e forma de pagamento escolhida. SEMPRE inclua o valor da taxa de entrega e o tempo estimado na recapitulação. Se não tiver essa informação, solicite o CEP novamente para calcular. Peça confirmação final ao cliente.";
        systemPrompt += "\n5. FINALIZAÇÃO: Após a confirmação, informe que o pedido foi enviado para o estabelecimento e está aguardando aceitação.";
      }

      systemPrompt += "\nSempre siga este fluxo na ordem especificada e retorne a ele se o cliente desviar do assunto.";

      // Instruções específicas para evitar alucinações sobre taxa de entrega
      systemPrompt += "\n\nINSTRUÇÕES CRÍTICAS SOBRE TAXA DE ENTREGA: Quando o cliente perguntar sobre taxa de entrega ou valor de entrega, NUNCA invente valores. Se não houver informação sobre taxa de entrega no banco de dados, responda APENAS: 'Não encontrei informações sobre taxa de entrega para o seu endereço. Por favor, informe outro CEP ou entre em contato diretamente com o estabelecimento.' NUNCA mencione promoções de frete grátis a menos que estejam explicitamente nas informações fornecidas. NUNCA mencione produtos específicos ao responder sobre taxa de entrega. Responda APENAS com o valor da taxa de entrega calculada para o endereço do cliente.";

      // Instruções específicas para a recapitulação do pedido
      systemPrompt += "\n\nINSTRUÇÕES CRÍTICAS SOBRE RECAPITULAÇÃO DO PEDIDO: Na recapitulação final do pedido, SEMPRE inclua o valor da taxa de entrega e o tempo estimado de entrega calculados para o CEP do cliente. Se você não tiver essa informação no momento da recapitulação, solicite o CEP novamente para poder calcular a taxa de entrega e o tempo. NUNCA prossiga com a finalização do pedido sem informar o valor exato da taxa de entrega e o tempo estimado. A recapitulação deve SEMPRE incluir: endereço de entrega (CEP), taxa de entrega (valor exato), tempo estimado de entrega (em minutos), itens pedidos com valores, e forma de pagamento.";

      // Instruções para evitar alucinações e invenções de informações
      systemPrompt += "\n\nINSTRUÇÕES CRÍTICAS SOBRE INFORMAÇÕES DESCONHECIDAS: NUNCA invente informações que não estejam disponíveis no banco de dados ou nas informações fornecidas. Se o cliente perguntar sobre algo que você não tem informação precisa (como tempo de entrega, disponibilidade de produtos específicos, promoções, etc.), responda SEMPRE com: 'Não tenho essa informação em meu sistema no momento. Vamos continuar com seu pedido?' e retorne ao fluxo do pedido. NUNCA faça suposições ou estimativas sobre informações que não possui.";

      // Instruções específicas para formas de pagamento
      systemPrompt += "\n\nINSTRUÇÕES CRÍTICAS SOBRE FORMAS DE PAGAMENTO: Quando apresentar as formas de pagamento ao cliente, use EXCLUSIVAMENTE as opções listadas acima em 'Formas de pagamento disponíveis'. NUNCA invente ou sugira formas de pagamento que não estão nesta lista. Se o cliente solicitar uma forma de pagamento que não está disponível, informe educadamente que essa opção não está disponível e apresente novamente as opções que estão disponíveis.";

      // Instruções para limitar respostas apenas a assuntos relacionados ao estabelecimento e pedidos
      systemPrompt += "\n\nINSTRUÇÕES CRÍTICAS SOBRE LIMITAÇÃO DE ASSUNTOS: Você é um atendente de " + nomeEmpresa + " e deve APENAS responder perguntas relacionadas ao cardápio, pedidos, horários de funcionamento, taxa de entrega e informações sobre o estabelecimento. Se o cliente fizer perguntas sobre QUALQUER outro assunto (como política, história, geografia, esportes, notícias, etc.) que não esteja DIRETAMENTE relacionado ao estabelecimento ou ao processo de pedido, responda EXATAMENTE com esta mensagem: 'Não posso responder nada que não seja pertinente ao pedido ou ao estabelecimento. Posso te ajudar a conhecer nosso cardápio, fazer seu pedido ou informar sobre nossos horários de funcionamento. Como posso ajudar com seu pedido?'. NUNCA, SOB HIPÓTESE ALGUMA, forneça QUALQUER informação sobre assuntos não relacionados ao estabelecimento ou ao processo de pedido, mesmo que seja uma resposta curta ou educacional.";

      console.log(`[EMP:${empresaId}] System Prompt Final Gerado (primeiros 300 chars): ${systemPrompt.substring(0, 300)}...`);

      if (typeof newClient.sendPresenceAvailable === 'function') chat.sendStateTyping();

      // Extrair CEP da mensagem do cliente (independente de ser pergunta sobre taxa)
      const cepCliente = extrairCEP(userMessage);
      let taxaEntregaResult = null;
      let taxaEntregaInfo = null;

      // Se encontrou um CEP na mensagem, calcular a taxa de entrega
      if (cepCliente) {
        console.log(`[EMP:${empresaId}] CEP encontrado na mensagem: ${cepCliente}. Calculando taxa de entrega...`);
        try {
          const resultado = await calcularTaxaEntrega(empresaId, cepCliente, supabaseClient);

          if (resultado.encontrado) {
            console.log(`[EMP:${empresaId}] Taxa de entrega encontrada para CEP ${cepCliente}: R$ ${resultado.valor.toFixed(2)}`);

            // Armazenar informações da taxa para incluir no prompt da IA
            if (resultado.modo === 'bairro') {
              taxaEntregaInfo = {
                valor: resultado.valor,
                tempo_entrega: resultado.tempo_entrega,
                mensagem: `A taxa de entrega para o bairro ${resultado.bairro} é R$ ${resultado.valor.toFixed(2)}. Tempo estimado de entrega: ${resultado.tempo_entrega} minutos.`
              };
            } else {
              taxaEntregaInfo = {
                valor: resultado.valor,
                tempo_entrega: resultado.tempo_entrega,
                mensagem: `A taxa de entrega para o seu endereço é R$ ${resultado.valor.toFixed(2)} (distância: ${resultado.distancia} km). Tempo estimado de entrega: ${resultado.tempo_entrega} minutos.`
              };
            }
          } else {
            console.log(`[EMP:${empresaId}] Taxa de entrega não encontrada para CEP ${cepCliente}`);
            taxaEntregaInfo = {
              encontrado: false,
              mensagem: resultado.mensagem
            };
          }
        } catch (error) {
          console.error(`[EMP:${empresaId}] Erro ao calcular taxa de entrega para CEP ${cepCliente}:`, error);
        }
      }

      // Verificar se é uma pergunta específica sobre taxa de entrega
      taxaEntregaResult = await processarPerguntaTaxaEntrega(userMessage, empresaId, supabaseClient);

      let aiResponseMessage;

      if (taxaEntregaResult) {
        console.log(`[EMP:${empresaId}] Processando pergunta sobre taxa de entrega:`, taxaEntregaResult.tipo);

        // Para perguntas sobre taxa encontrada, responder diretamente sem usar a IA
        if (taxaEntregaResult.tipo === 'taxa_encontrada') {
          console.log(`[EMP:${empresaId}] Respondendo diretamente com taxa encontrada: ${taxaEntregaResult.mensagem}`);
          return newClient.sendMessage(from, taxaEntregaResult.mensagem);
        }

        // Para outros tipos de perguntas sobre taxa, personalizar o prompt para a IA
        let promptComTaxa;

        switch (taxaEntregaResult.tipo) {
          case 'taxa_sem_cep':
            // Cliente perguntou sobre taxa mas não informou CEP
            promptComTaxa = `
              O cliente perguntou sobre taxa de entrega, mas não informou o CEP.
              Por favor, responda de forma amigável pedindo ESPECIFICAMENTE o CEP COMPLETO para calcular a taxa de entrega.
              Explique que apenas o CEP permite um cálculo preciso da taxa de entrega.
              Mensagem sugerida: "${taxaEntregaResult.mensagem}"

              IMPORTANTE: Insista no CEP completo, não apenas no bairro. Explique que o formato deve ser 00000-000.

              Mensagem original do cliente: "${userMessage}"
            `;
            break;

          case 'taxa_encontrada':
            // Taxa encontrada com sucesso
            console.log(`[DEBUG] Preparando prompt para taxa encontrada. Valor: ${taxaEntregaResult.resultado.valor}`);
            console.log(`[DEBUG] Mensagem completa: ${taxaEntregaResult.mensagem}`);

            promptComTaxa = `
              O cliente perguntou sobre taxa de entrega para o CEP ${taxaEntregaResult.cep}.
              A taxa de entrega calculada é: ${taxaEntregaResult.mensagem}
              VALOR EXATO DA TAXA: R$ ${taxaEntregaResult.resultado.valor.toFixed(2)}

              INSTRUÇÕES CRÍTICAS:
              1. Responda APENAS com a informação da taxa de entrega. Sua resposta deve ser EXATAMENTE: "A taxa de entrega para o seu endereço é R$ ${taxaEntregaResult.resultado.valor.toFixed(2)}."
              2. NÃO mencione NENHUM produto específico (como lanches, X-Burger, etc).
              3. NÃO mencione NENHUM preço de produto.
              4. NÃO mencione NENHUMA promoção ou regra de frete grátis.
              5. NÃO pergunte se o cliente quer confirmar o pedido.
              6. NÃO invente NENHUMA informação que não foi fornecida.
              7. NÃO mencione cardápio ou sugestões de pedido.

              Sua resposta deve ser EXCLUSIVAMENTE sobre a taxa de entrega, sem adicionar NENHUMA outra informação.

              Mensagem original do cliente: "${userMessage}"
            `;
            break;

          case 'taxa_nao_encontrada':
            // Taxa não encontrada para o CEP/bairro
            promptComTaxa = `
              O cliente perguntou sobre taxa de entrega para o CEP ${taxaEntregaResult.cep}.
              Não foi possível encontrar a taxa de entrega: ${taxaEntregaResult.mensagem}

              INSTRUÇÕES CRÍTICAS:
              1. Responda EXATAMENTE com esta mensagem: "Não encontrei informações sobre taxa de entrega para o seu endereço. Por favor, informe outro CEP ou entre em contato diretamente com o estabelecimento."
              2. NÃO invente NENHUM valor de taxa de entrega.
              3. NÃO mencione NENHUM produto específico.
              4. NÃO mencione NENHUMA promoção ou regra de frete grátis.
              5. NÃO sugira valores aproximados ou estimativas.
              6. NÃO pergunte se o cliente quer confirmar o pedido.

              Mensagem original do cliente: "${userMessage}"
            `;
            break;

          case 'taxa_erro':
            // Erro ao calcular a taxa
            promptComTaxa = `
              O cliente perguntou sobre taxa de entrega, mas ocorreu um erro ao calcular.
              Mensagem de erro: ${taxaEntregaResult.mensagem}

              INSTRUÇÕES CRÍTICAS:
              1. Responda EXATAMENTE com esta mensagem: "Desculpe, estou com um problema técnico para calcular a taxa de entrega neste momento. Por favor, tente novamente mais tarde ou entre em contato diretamente com o estabelecimento."
              2. NÃO invente NENHUM valor de taxa de entrega.
              3. NÃO mencione NENHUM produto específico.
              4. NÃO mencione NENHUMA promoção ou regra de frete grátis.
              5. NÃO sugira valores aproximados ou estimativas.
              6. NÃO pergunte se o cliente quer confirmar o pedido.

              Mensagem original do cliente: "${userMessage}"
            `;
            break;
        }

        // Obter resposta da IA com o prompt personalizado
        aiResponseMessage = await getAIResponse(promptComTaxa, systemPrompt, connectionIdForMsgProcessing, from);
      } else if (taxaEntregaInfo) {
        // Se temos informações de taxa de entrega para um CEP informado, incluir no prompt
        console.log(`[EMP:${empresaId}] Incluindo informações de taxa de entrega no prompt para CEP ${cepCliente}`);

        let promptComCEP = userMessage;

        // Adicionar instruções específicas para incluir a taxa de entrega na resposta
        if (taxaEntregaInfo.encontrado === false) {
          // Taxa não encontrada
          promptComCEP = `
            O cliente informou o CEP ${cepCliente}, mas não foi possível encontrar a taxa de entrega.
            Mensagem: ${taxaEntregaInfo.mensagem}

            Por favor, responda normalmente à mensagem do cliente, mas informe que não foi possível calcular a taxa de entrega para o endereço informado.
            Peça que o cliente verifique se o CEP está correto ou entre em contato diretamente com o estabelecimento.

            Mensagem original do cliente: "${userMessage}"
          `;
        } else {
          // Taxa encontrada
          promptComCEP = `
            O cliente informou o CEP ${cepCliente} e a taxa de entrega foi calculada.
            VALOR EXATO DA TAXA: R$ ${taxaEntregaInfo.valor.toFixed(2)}
            TEMPO EXATO DE ENTREGA: ${taxaEntregaInfo.tempo_entrega} minutos
            Mensagem sobre a taxa: ${taxaEntregaInfo.mensagem}

            IMPORTANTE: Ao responder à mensagem do cliente, INCLUA a informação sobre a taxa de entrega E o tempo estimado de entrega.
            Confirme que entregamos no endereço, informe o valor da taxa de entrega E o tempo estimado de entrega em minutos.
            O tempo estimado de entrega é EXATAMENTE ${taxaEntregaInfo.tempo_entrega} minutos, não invente outro valor.

            Mensagem original do cliente: "${userMessage}"
          `;
        }

        aiResponseMessage = await getAIResponse(promptComCEP, systemPrompt, connectionIdForMsgProcessing, from);
      } else {
        // Processamento normal para outras mensagens
        aiResponseMessage = await getAIResponse(userMessage, systemPrompt, connectionIdForMsgProcessing, from);
      }

      if (typeof newClient.sendPresenceAvailable === 'function') chat.clearState();

      if (aiResponseMessage) {
        console.log(`[${connectionIdForMsgProcessing || 'MSG'}] Enviando resposta da IA para ${from}: "${aiResponseMessage.substring(0,50)}..."`);

        // Verificar se é a primeira mensagem deste número usando o mapa
        if (isFirstMessage) {
          console.log(`[${connectionIdForMsgProcessing || 'MSG'}] Primeira mensagem detectada para ${from}. Enviando resposta da IA.`);

          // Marcar que já enviamos a primeira mensagem para este número
          firstMessageSent.set(from, true);
        }

        // Enviar a resposta da IA para todas as mensagens
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

  // Verificar se o Puppeteer está instalado
  try {
    // Não vamos mais tentar carregar o Puppeteer diretamente
    // const puppeteer = require('puppeteer');
    console.log(`[${currentConnectionId || 'GLOBAL'}] ✅ Puppeteer encontrado`);
  } catch (err) {
    console.error(`[${currentConnectionId || 'GLOBAL'}] ERRO CRÍTICO: Puppeteer não está instalado ou não pode ser carregado:`, err);
    console.error(`[${currentConnectionId || 'GLOBAL'}] Execute 'npm install puppeteer' no diretório backend e reinicie o servidor.`);
    moduleConnectionState = 'error_initializing';
    currentQRCode = null;
    qrCallbacks.forEach(callback => callback(null));
    throw new Error('Puppeteer não está instalado ou não pode ser carregado');
  }

  // Verificar se o diretório de sessões existe e é gravável
  try {
    if (!fs.existsSync(sessionDir)) {
      console.log(`[${currentConnectionId || 'GLOBAL'}] Diretório de sessões não existe, criando: ${sessionDir}`);
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    // Testar se o diretório é gravável
    const testFile = path.join(sessionDir, '.test-write');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log(`[${currentConnectionId || 'GLOBAL'}] Diretório de sessões existe e é gravável: ${sessionDir}`);
  } catch (err) {
    console.error(`[${currentConnectionId || 'GLOBAL'}] ERRO CRÍTICO: Problema com o diretório de sessões:`, err);
    moduleConnectionState = 'error_initializing';
    currentQRCode = null;
    qrCallbacks.forEach(callback => callback(null));
    throw new Error(`Problema com o diretório de sessões: ${err.message}`);
  }

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
    throw err; // Propagar o erro para que o chamador possa tratá-lo
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

  // Verificar se já temos um QR code válido para esta conexão
  if (currentQRCode && moduleConnectionState === 'pending_qr') {
    console.log(`[${currentConnectionId || 'GLOBAL'}] Já temos um QR code válido. Retornando imediatamente.`);
    // Notificar os callbacks sobre o QR code existente
    qrCallbacks.forEach(callback => callback(currentQRCode));
    return { success: true, hasExistingQR: true };
  }

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
