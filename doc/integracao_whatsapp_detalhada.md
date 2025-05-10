# Documentação Detalhada: Integração WhatsApp no Nexo (Conexão/Desconexão)

## 1. Introdução

Este documento descreve o processo de implementação e a lógica por trás da funcionalidade de conexão, desconexão e reconexão de sessões do WhatsApp no projeto Nexo. O objetivo é fornecer um guia detalhado para manutenção futura e como referência para implementações similares. A funcionalidade permite que os usuários conectem suas contas do WhatsApp ao sistema para, por exemplo, receber pedidos, e gerenciem o estado dessas conexões.

## 2. Visão Geral da Arquitetura

A integração envolve componentes no frontend e no backend:

*   **Frontend (React/TypeScript):**
    *   `src/pages/dashboard/ConexaoPage.tsx`: Página principal para listar, adicionar, remover, conectar e desconectar as contas WhatsApp.
    *   `src/components/conexao/QRCodeModal.tsx`: Componente modal responsável por exibir o QR Code para escaneamento, gerenciar o estado visual do processo de conexão e interagir com o backend para obter o QR Code e atualizações de status.
*   **Backend (Node.js/Express):**
    *   `backend/server.js`: Servidor Express que expõe os endpoints da API para o frontend.
    *   `backend/whatsapp.js`: Módulo principal que encapsula a lógica da biblioteca `whatsapp-web.js`, gerenciando a instância do cliente WhatsApp, geração de QR Code, envio de mensagens (não abordado aqui) e estado da conexão.
*   **Comunicação:**
    *   **API HTTP:** Para ações como solicitar status, iniciar reinicialização da sessão, e logout.
    *   **Server-Sent Events (SSE):** Usado para streaming de eventos do backend para o frontend em tempo real (ex: envio do QR Code, atualizações de status da conexão). O endpoint é `/api/events`.

## 3. Lógica e Fluxos Detalhados

### 3.1. Variáveis de Estado Chave no Backend (`whatsapp.js`)

Para gerenciar o estado da conexão de forma mais controlada, o módulo `whatsapp.js` utiliza:

*   `client`: A instância da biblioteca `whatsapp-web.js`. É dinamicamente criada e destruída.
*   `moduleConnectionState`: String que representa o estado atual da conexão gerenciada pelo módulo (ex: `'disconnected'`, `'initializing'`, `'pending_qr'`, `'connected'`, `'auth_failure'`).
*   `currentQRCode`: Armazena o string do QR Code atual ou `""` se conectado, ou `null`.
*   `currentConnectionId`: O ID da conexão do banco de dados que está atualmente em foco para operações como conexão ou logout.
*   `qrCallbacks`: Um array de callbacks para notificar os listeners (como o endpoint SSE) sobre novos QR Codes.

### 3.2. Função Principal: `createAndConfigureClient()` (Backend)

Esta função é central para criar uma nova instância do cliente `whatsapp-web.js` e anexar todos os handlers de evento necessários (`on('qr')`, `on('ready')`, `on('auth_failure')`, `on('disconnected')`, etc.). Cada vez que uma nova instância é necessária (ex: após um logout completo ou para a primeira inicialização), esta função é chamada. Os handlers de evento atualizam `moduleConnectionState` e `currentQRCode` e notificam o frontend via `qrCallbacks` ou atualizam o banco de dados.

### 3.3. Fluxo de Conexão Inicial / Reconexão (Gerar Novo QR Code)

1.  **Abertura do Modal (Frontend):**
    *   O usuário clica em "Conectar" em `ConexaoPage.tsx` para uma determinada `connectionId`.
    *   `QRCodeModal.tsx` é montado e seu `useEffect` principal é disparado.
2.  **Verificação de Status Inicial (Frontend):**
    *   O `useEffect` do `QRCodeModal` faz um `fetch` para `/api/status`.
    *   O backend (`server.js`) responde com o estado atual do módulo `whatsapp.js` (via `getStatus()`).
3.  **Decisão de Reinicializar (Frontend):**
    *   Com base no status recebido:
        *   Se o estado para a `connectionId` atual já for `'connected'`, o modal chama `updateConnectionStatus()` que, por sua vez, chama `onConnect()` (que é `handleConnectionSuccess` em `ConexaoPage`), e a `ConexaoPage` fecha o modal.
        *   Se o estado for `'pending_qr'` ou `'initializing'` e já houver um `qrCode` válido para a `connectionId` correspondente, o modal exibe esse QR Code (`setStatus('ready')`).
        *   **Caso contrário** (ex: estado `'disconnected'`, `'auth_failure'`, ou o `connectionId` do backend não corresponde, ou não há QR Code), o modal chama a função interna `triggerReinitialize()`.
4.  **`triggerReinitialize()` (Frontend):**
    *   Faz um `POST` para `/api/reinitialize` no backend, enviando a `connectionId` desejada.
5.  **Endpoint `/api/reinitialize` (Backend - `server.js`):**
    *   Recebe a requisição.
    *   Chama `await setConnection({ id: connectionId })` no `whatsapp.js` para definir qual conexão está em foco.
    *   Chama `await reinitialize()` no `whatsapp.js`.
6.  **Função `reinitialize()` (Backend - `whatsapp.js`):**
    *   **Crucial:** Se uma instância `client` existir, ela é destruída (`await client.destroy(); client = null;`). Isso garante que qualquer estado anterior problemático seja limpo.
    *   Em seguida, chama `await initialize(true)`.
7.  **Função `initialize()` (Backend - `whatsapp.js`):**
    *   Se `client` for `null` (o que será o caso após `reinitialize` ou no primeiro boot), uma nova instância é criada chamando `client = createAndConfigureClient()`.
    *   Define `moduleConnectionState = 'initializing'` e `currentQRCode = null`.
    *   Chama `await client.initialize()` na instância do cliente. Erros aqui são capturados, e o cliente é destruído para permitir uma nova tentativa limpa.
8.  **Geração do QR Code (Backend - `whatsapp.js` dentro de `createAndConfigureClient`):**
    *   O `client.initialize()` eventualmente dispara o evento `'qr'` na instância do cliente.
    *   O handler `newClient.on('qr', (qr) => ...)`:
        *   Atualiza `currentQRCode = qr`.
        *   Define `moduleConnectionState = 'pending_qr'`.
        *   Chama os `qrCallbacks` (que no `server.js` enviam um evento SSE `type: 'qr', data: qr` para o frontend).
9.  **Exibição do QR Code (Frontend - `QRCodeModal.tsx`):**
    *   O `EventSource` no modal recebe o evento SSE `type: 'qr'` com os dados do QR Code.
    *   O `onmessage` handler atualiza o estado do modal com o `qrCode` recebido e define `setStatus('ready')`, fazendo com que o QR Code seja renderizado.
10. **Usuário Escaneia o QR Code.**
11. **Conexão Estabelecida (Backend - `whatsapp.js` dentro de `createAndConfigureClient`):**
    *   A biblioteca dispara o evento `'ready'` na instância do cliente.
    *   O handler `newClient.on('ready', () => ...)`:
        *   Define `moduleConnectionState = 'connected'`.
        *   Define `currentQRCode = ""` (sinalizando conexão estabelecida).
        *   Chama os `qrCallbacks` (que enviam um evento SSE `type: 'qr', data: ""`).
        *   Chama `updateConnectionInDatabase()` para salvar o status no banco.
12. **Processamento de Conexão no Frontend (`QRCodeModal.tsx`):**
    *   O `EventSource` recebe o evento SSE `type: 'qr', data: ""`.
    *   O `onmessage` handler:
        *   Define `setStatus('connected')`.
        *   Chama `updateConnectionStatus()`.
    *   `updateConnectionStatus()`:
        *   Marca `connectionNotifiedRef.current = true` (para evitar chamadas múltiplas).
        *   Chama `props.onConnect()` (que é a função `handleConnectionSuccess` passada pela `ConexaoPage`).
13. **Finalização na `ConexaoPage.tsx`:**
    *   `handleConnectionSuccess()`:
        *   Atualiza o estado visual da conexão na lista.
        *   Mostra uma mensagem de sucesso (toast).
        *   **Chama `setShowQrModal(false)` para fechar o `QRCodeModal`.**
        *   Agenda `loadConnections()` para recarregar a lista de conexões do banco.

### 3.4. Fluxo de Desconexão

1.  **Ação do Usuário (Frontend):**
    *   O usuário clica no botão "Desconectar" em `ConexaoPage.tsx` para uma conexão ativa.
2.  **`handleDisconnect()` (Frontend - `ConexaoPage.tsx`):**
    *   Faz um `POST` para `/api/logout` no backend, enviando a `connectionId`.
3.  **Endpoint `/api/logout` (Backend - `server.js`):**
    *   Recebe a requisição.
    *   Chama `await setConnection({ id: connectionId })` no `whatsapp.js`.
    *   Chama `await logout()` no `whatsapp.js`.
4.  **Função `logout()` (Backend - `whatsapp.js`):**
    *   Define `moduleConnectionState = 'disconnected'` e `currentQRCode = null`.
    *   Chama `await updateConnectionInDatabase('disconnected')` para atualizar o banco.
    *   Se uma instância `client` existir:
        *   Tenta `await client.logout()`.
        *   **Obrigatoriamente tenta `await client.destroy()`** para limpar completamente a sessão do Puppeteer.
        *   Define `client = null` para garantir que a próxima inicialização crie uma nova instância.
5.  **Feedback no Frontend (`ConexaoPage.tsx`):**
    *   O `handleDisconnect` atualiza o estado da conexão na UI para `'disconnected'`.
    *   Mostra uma mensagem de sucesso.
    *   Recarrega a lista de conexões.

### 3.5. Gerenciamento de Sessão e PM2

*   **`LocalAuth`**: A biblioteca `whatsapp-web.js` usa `LocalAuth` com `dataPath: sessionDir` para persistir os dados da sessão no sistema de arquivos (pasta `backend/sessions`). Isso permite que, se o servidor backend for reiniciado (ex: pelo PM2), ele possa tentar restaurar sessões previamente autenticadas sem a necessidade de escanear o QR Code novamente, *desde que a sessão ainda seja válida no WhatsApp Web*.
*   **PM2**: O backend é configurado para rodar com PM2 (`pm2 start server.js --name nexo-whatsapp-api`). O PM2 gerencia o processo, reiniciando-o automaticamente em caso de falhas e permitindo comandos como `pm2 logs`, `pm2 restart`, `pm2 save`. O comando `pm2 save` é importante para que o PM2 lembre dos processos a serem iniciados após um reboot do sistema.

## 4. Pontos Críticos da Implementação

*   **Destruir e Recriar o Cliente:** A chave para a robustez na reconexão e na prevenção de erros como o "AppState" foi adotar uma política rigorosa de destruir (`client.destroy()`) a instância anterior do cliente `whatsapp-web.js` e criar uma completamente nova (`client = createAndConfigureClient()`) sempre que uma reinicialização completa é necessária (via `reinitialize()`). Isso garante um estado limpo.
*   **Gerenciamento de Estado Centralizado no Módulo:** O uso de `moduleConnectionState` e `currentQRCode` no `whatsapp.js` ajuda a ter um controle mais preciso sobre o estado percebido pelo sistema, em vez de depender apenas de estados internos da biblioteca que podem ser menos previsíveis.
*   **Comunicação Frontend-Backend Clara:** A combinação de chamadas API para ações e SSE para atualizações de estado permite que o frontend reaja dinamicamente.
*   **Coordenação de Fechamento do Modal:** A responsabilidade de fechar o `QRCodeModal` após uma conexão bem-sucedida foi centralizada na `ConexaoPage` (através do callback `onConnect`), evitando loops e comportamentos inesperados.
*   **Tratamento do `useEffect` no Modal:** A lógica no `useEffect` do `QRCodeModal` foi refinada para verificar o status inicial, decidir se uma reinicialização é necessária, e gerenciar a instância do `EventSource` de forma a evitar múltiplas conexões ou execuções desnecessárias.

Esta documentação deve servir como um bom ponto de partida para entender a complexidade envolvida e para futuras manutenções ou evoluções da funcionalidade. 