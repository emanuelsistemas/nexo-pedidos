# Documentação de Implementação da Integração WhatsApp

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Componentes Principais](#componentes-principais)
4. [Fluxo de Conexão](#fluxo-de-conexão)
5. [Desafios e Soluções](#desafios-e-soluções)
6. [Limitações Implementadas](#limitações-implementadas)
7. [Animações e UX](#animações-e-ux)
8. [Configuração e Dependências](#configuração-e-dependências)
9. [Troubleshooting](#troubleshooting)

## Visão Geral

O sistema Nexo implementa uma integração com o WhatsApp que permite aos usuários conectar suas contas do WhatsApp ao sistema através da leitura de um QR Code. A implementação utiliza a biblioteca WhatsApp Web.js no backend e React no frontend, com Supabase como banco de dados.

A integração foi projetada com foco em:
- Segurança (trava de segurança para garantir conexões autênticas)
- Experiência do usuário (animações fluidas e feedback visual)
- Robustez (tratamento de erros e recuperação de falhas)
- Limitação de uma instância por empresa (para controle de uso)

## Arquitetura do Sistema

### Frontend (React + Vite)
- **Tecnologias**: React, TypeScript, Tailwind CSS, Framer Motion
- **Principais componentes**: ConexaoPage, QRCodeModal
- **Comunicação com backend**: Fetch API, Server-Sent Events (SSE)

### Backend (Node.js + Express)
- **Tecnologias**: Node.js, Express, WhatsApp Web.js, Puppeteer
- **Principais módulos**: server.js, whatsapp.js
- **Comunicação com frontend**: REST API, Server-Sent Events (SSE)

### Banco de Dados (Supabase)
- **Tabelas**: conexao, usuarios, empresa
- **Campos principais**: id, nome, status, last_connection, empresa_id

## Componentes Principais

### ConexaoPage (Frontend)
Página principal que lista as conexões do WhatsApp e permite adicionar, conectar, desconectar e remover conexões.

**Funcionalidades principais**:
- Listagem de conexões
- Adição de novas conexões (limitada a uma por empresa)
- Inicialização do processo de conexão via QR Code
- Desconexão e remoção de conexões existentes

### QRCodeModal (Frontend)
Modal responsável por exibir o QR Code para conexão com o WhatsApp e gerenciar o estado da conexão.

**Funcionalidades principais**:
- Exibição do QR Code com animações e efeitos visuais
- Monitoramento do estado da conexão via SSE
- Feedback visual durante o processo de conexão
- Tratamento de erros e opção de reinicialização

### Módulo WhatsApp (Backend)
Responsável pela integração com o WhatsApp Web.js e gerenciamento das sessões do WhatsApp.

**Funcionalidades principais**:
- Inicialização do cliente WhatsApp
- Geração e envio do QR Code
- Gerenciamento do estado da conexão
- Envio de atualizações via SSE

## Fluxo de Conexão

1. **Inicialização**:
   - Usuário clica em "Conectar" em uma conexão
   - Frontend abre o QRCodeModal e solicita inicialização ao backend
   - Backend inicializa o cliente WhatsApp e gera o QR Code
   - QR Code é enviado ao frontend via SSE

2. **Conexão**:
   - Usuário escaneia o QR Code com o WhatsApp
   - WhatsApp Web.js detecta a autenticação
   - Backend atualiza o estado para "connected"
   - Frontend recebe a atualização via SSE
   - Frontend atualiza o status da conexão no Supabase
   - Modal é fechado e a interface é atualizada

3. **Desconexão**:
   - Usuário clica em "Desconectar"
   - Frontend envia solicitação de logout ao backend
   - Backend encerra a sessão do WhatsApp
   - Frontend atualiza o status da conexão no Supabase
   - Interface é atualizada

## Desafios e Soluções

### 1. Inicialização do Puppeteer

**Desafio**: O Puppeteer (usado pelo WhatsApp Web.js) não conseguia inicializar corretamente devido à falta do Chrome no sistema.

**Solução**:
```javascript
// Configuração do cliente WhatsApp para usar o Chromium que vem com o Puppeteer
const newClient = new Client({
  // ...
  puppeteer: {
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      // Outros argumentos para melhorar a estabilidade
    ],
    headless: true,
    // Usar o Chromium que vem com o Puppeteer
    executablePath: require('puppeteer').executablePath(),
  },
});
```

### 2. Trava de Segurança

**Desafio**: Era possível que o sistema mostrasse uma conexão como "conectada" mesmo quando o WhatsApp não estava realmente conectado.

**Solução**:
1. Verificação adicional do status real do WhatsApp antes de atualizar o banco de dados:
```javascript
// No QRCodeModal.tsx
fetch('http://localhost:3001/api/status')
  .then(res => res.json())
  .then(statusData => {
    if (statusData.whatsapp && statusData.whatsapp.state === 'connected') {
      console.log('[QRCodeModal] Confirmado: WhatsApp realmente conectado.');
      setStatus('connected');
      if (!connectionNotifiedRef.current) updateConnectionStatus();
    } else {
      console.error('[QRCodeModal] TRAVA DE SEGURANÇA: Evento indica conexão, mas verificação mostra que não está conectado!');
      // Não atualizar o status para conectado
    }
  });
```

2. Forçar reinicialização e exibição do QR Code mesmo quando o backend indica que já está conectado:
```javascript
// No QRCodeModal.tsx
if (backendStatus.state === 'connected') {
  console.log('[QRCodeModal] Conexão parece estar estabelecida para este ID, mas vamos forçar reinicialização para garantir.');
  // Forçar reinicialização para garantir que o usuário escaneie o QR code novamente
  triggerReinitialize();
}
```

### 3. Demora na Exibição do QR Code

**Desafio**: O QR Code demorava muito para ser exibido, sem feedback visual adequado para o usuário.

**Solução**:
1. Otimização do processo de reinicialização no backend:
```javascript
// Verificar se já temos um QR code válido para esta conexão
if (currentQRCode && moduleConnectionState === 'pending_qr') {
  console.log(`[${currentConnectionId || 'GLOBAL'}] Já temos um QR code válido. Retornando imediatamente.`);
  // Notificar os callbacks sobre o QR code existente
  qrCallbacks.forEach(callback => callback(currentQRCode));
  return { success: true, hasExistingQR: true };
}
```

2. Resposta imediata ao frontend, mesmo que a reinicialização ainda esteja em andamento:
```javascript
// Iniciar reinicialização em background
const reinitPromise = reinitialize();

// Responder imediatamente ao cliente
res.json({ 
  success: true, 
  message: 'Reinicialização iniciada, aguarde o QR code via SSE'
});
```

3. Animações e mensagens alternadas durante o carregamento:
```jsx
<div className="relative w-16 h-16 mb-3">
  {/* Loading animado em camadas */}
  <div className="absolute inset-0 flex items-center justify-center">
    <div className="w-12 h-12 border-4 border-gray-600 border-t-primary-500 rounded-full animate-spin" />
  </div>
  {/* ... mais camadas de animação ... */}
</div>

{/* Mensagens alternadas */}
<LoadingMessages />

{/* Barra de progresso animada */}
<div className="w-48 h-1 bg-gray-800 rounded-full mt-3 overflow-hidden">
  <div className="h-full bg-primary-500 rounded-full animate-progress-bar" />
</div>
```

## Limitações Implementadas

### Limite de Uma Instância por Empresa

**Implementação**:
1. Desabilitando o botão de adicionar conexão:
```jsx
<Button
  type="button"
  variant="primary"
  className="flex items-center gap-2"
  onClick={() => setShowSidebar(true)}
  disabled={connections.length > 0}
>
  <Plus size={20} />
  Adicionar Conexão
</Button>
{connections.length > 0 && (
  <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
    No momento, apenas uma instância de WhatsApp é permitida por empresa.
  </div>
)}
```

2. Verificação no momento da criação:
```javascript
// Verificar se já existe uma conexão
if (connections.length > 0) {
  showMessage('error', 'No momento, apenas uma instância de WhatsApp é permitida por empresa.');
  setShowSidebar(false);
  return;
}

// Verificar novamente no banco de dados
const { data: existingConnections } = await supabase
  .from('conexao')
  .select('id')
  .eq('empresa_id', usuarioData.empresa_id);
  
if (existingConnections && existingConnections.length > 0) {
  throw new Error('No momento, apenas uma instância de WhatsApp é permitida por empresa.');
}
```

## Animações e UX

### Loading Interativo
- Loading animado em camadas com diferentes velocidades e direções
- Mensagens alternadas que mudam a cada 2,5 segundos
- Barra de progresso animada que simula avanço

### QR Code com Efeitos Visuais
- Moldura com gradiente animado ao redor do QR Code
- Indicador de escaneamento (animação "ping")
- Animações sequenciais para as mensagens de texto

### Configuração do Tailwind
```javascript
module.exports = {
  theme: {
    extend: {
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'progress-bar': 'progressBar 2.5s ease-in-out infinite',
      },
      keyframes: {
        progressBar: {
          '0%': { width: '0%' },
          '50%': { width: '70%' },
          '70%': { width: '85%' },
          '90%': { width: '95%' },
          '100%': { width: '0%' },
        },
      },
    },
  },
};
```

## Configuração e Dependências

### Dependências do Frontend
- React 18+
- Vite 5+
- Tailwind CSS
- Framer Motion
- Lucide React (ícones)
- Supabase JS Client

### Dependências do Backend
- Express.js
- WhatsApp Web.js
- Puppeteer
- Supabase JS Client
- CORS
- dotenv

### Configuração do Ambiente
- Node.js v16+ (recomendado v18+)
- PM2 para gerenciamento de processos
- Variáveis de ambiente para Supabase

## Troubleshooting

### Problemas com o QR Code
- Verificar se o backend está rodando corretamente: `pm2 status`
- Verificar logs do backend: `pm2 logs nexo-backend`
- Verificar se o Puppeteer está instalado corretamente
- Verificar permissões do diretório de sessões

### Problemas com o Puppeteer
- Instalar dependências do sistema para o Puppeteer
- Verificar se o Chrome/Chromium está acessível
- Usar o Chromium que vem com o Puppeteer

### Problemas com o Supabase
- Verificar variáveis de ambiente
- Testar conexão com o Supabase
- Verificar permissões das tabelas

---

Documentação criada em: `{new Date().toLocaleDateString()}`
