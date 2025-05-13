# Guia de Referência Rápida - Integração WhatsApp

Este guia fornece uma referência rápida para as principais funcionalidades e componentes da integração WhatsApp no sistema Nexo.

## Estrutura de Arquivos

```
nexo/
├── src/
│   ├── components/
│   │   ├── conexao/
│   │   │   └── QRCodeModal.tsx    # Modal para exibição do QR Code
│   │   └── comum/
│   │       └── Button.tsx         # Componente de botão reutilizável
│   ├── pages/
│   │   └── dashboard/
│   │       └── ConexaoPage.tsx    # Página de gerenciamento de conexões
│   ├── lib/
│   │   └── supabase.ts            # Cliente Supabase
│   └── utils/
│       └── toast.ts               # Utilitário para mensagens toast
└── backend/
    ├── server.js                  # Servidor Express
    ├── whatsapp.js                # Módulo de integração com WhatsApp
    └── config.js                  # Configurações do backend
```

## Endpoints da API

| Endpoint | Método | Descrição | Parâmetros |
|----------|--------|-----------|------------|
| `/api/status` | GET | Retorna o status atual do WhatsApp | - |
| `/api/qrcode` | GET | Retorna o QR Code atual | - |
| `/api/reinitialize` | POST | Reinicializa o cliente WhatsApp | `connectionId` (opcional) |
| `/api/logout` | POST | Desconecta o WhatsApp | `connectionId` |
| `/api/updateConnection` | POST | Atualiza o status da conexão no banco | `connectionId`, `status`, `last_connection` |
| `/api/events` | GET | Endpoint SSE para eventos em tempo real | - |

## Componentes Principais

### QRCodeModal

**Props:**
```typescript
interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectionId: string;
  connectionName: string;
  onConnect: () => void;
}
```

**Estados:**
```typescript
const [qrCode, setQrCode] = useState<string | null>(null);
const [status, setStatus] = useState<'loading' | 'ready' | 'connected' | 'error'>('loading');
const [errorMessage, setErrorMessage] = useState<string>('');
```

**Funções Principais:**
- `triggerReinitialize()`: Solicita reinicialização do cliente WhatsApp
- `updateConnectionStatus()`: Atualiza o status da conexão no banco de dados
- `handleReload()`: Reinicia o processo de conexão em caso de erro

### ConexaoPage

**Estados:**
```typescript
const [connections, setConnections] = useState<Connection[]>([]);
const [showSidebar, setShowSidebar] = useState(false);
const [isLoading, setIsLoading] = useState(false);
const [novaConexao, setNovaConexao] = useState({ nome: '' });
const [showQrModal, setShowQrModal] = useState(false);
const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
```

**Funções Principais:**
- `loadConnections()`: Carrega as conexões do banco de dados
- `handleSubmit()`: Cria uma nova conexão
- `handleConnect()`: Inicia o processo de conexão via QR Code
- `handleConnectionSuccess()`: Processa o sucesso da conexão
- `handleDisconnect()`: Desconecta o WhatsApp
- `handleRemoveConnection()`: Remove uma conexão

## Fluxo de Dados

1. **Carregamento Inicial:**
   ```
   ConexaoPage -> loadConnections() -> Supabase -> setConnections()
   ```

2. **Criação de Conexão:**
   ```
   handleSubmit() -> Verificação de limite -> Supabase -> loadConnections()
   ```

3. **Processo de Conexão:**
   ```
   handleConnect() -> QRCodeModal -> triggerReinitialize() -> 
   Backend (/api/reinitialize) -> SSE -> QRCodeModal (exibe QR) -> 
   Usuário escaneia -> Backend (detecta autenticação) -> SSE -> 
   QRCodeModal (updateConnectionStatus) -> onConnect() -> 
   ConexaoPage (handleConnectionSuccess) -> Atualiza UI
   ```

4. **Desconexão:**
   ```
   handleDisconnect() -> Backend (/api/logout) -> 
   Atualiza UI -> loadConnections()
   ```

## Trava de Segurança

A trava de segurança garante que o WhatsApp esteja realmente conectado antes de atualizar o status no banco de dados:

```javascript
// No QRCodeModal.tsx
if (eventData.data.state === 'connected' && status !== 'connected') {
  // Verificar se o WhatsApp está realmente conectado
  fetch('http://localhost:3001/api/status')
    .then(res => res.json())
    .then(statusData => {
      if (statusData.whatsapp && statusData.whatsapp.state === 'connected') {
        setStatus('connected');
        if (!connectionNotifiedRef.current) updateConnectionStatus();
      } else {
        console.error('TRAVA DE SEGURANÇA: Evento indica conexão, mas verificação mostra que não está conectado!');
      }
    });
}
```

## Limitação de Instâncias

A limitação de uma instância por empresa é implementada em três níveis:

1. **Interface (botão desabilitado):**
   ```jsx
   <Button
     disabled={connections.length > 0}
     // ...
   >
     Adicionar Conexão
   </Button>
   ```

2. **Verificação no frontend antes de enviar:**
   ```javascript
   if (connections.length > 0) {
     showMessage('error', 'No momento, apenas uma instância de WhatsApp é permitida por empresa.');
     return;
   }
   ```

3. **Verificação no banco de dados:**
   ```javascript
   const { data: existingConnections } = await supabase
     .from('conexao')
     .select('id')
     .eq('empresa_id', usuarioData.empresa_id);
     
   if (existingConnections && existingConnections.length > 0) {
     throw new Error('No momento, apenas uma instância de WhatsApp é permitida por empresa.');
   }
   ```

## Animações

### Loading Animado em Camadas

```jsx
<div className="relative w-16 h-16 mb-3">
  {/* Camada externa */}
  <div className="absolute inset-0 flex items-center justify-center">
    <div className="w-12 h-12 border-4 border-gray-600 border-t-primary-500 rounded-full animate-spin" />
  </div>
  {/* Camada média */}
  <div className="absolute inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-3 border-gray-700 border-t-primary-400 rounded-full animate-spin-slow" 
         style={{animationDirection: 'reverse'}} />
  </div>
  {/* Camada interna */}
  <div className="absolute inset-0 flex items-center justify-center">
    <div className="w-4 h-4 bg-primary-500 rounded-full animate-pulse" />
  </div>
</div>
```

### QR Code com Efeitos

```jsx
<div className="relative">
  {/* Moldura animada */}
  <div className="absolute -inset-2 rounded-lg bg-gradient-to-r from-primary-500 via-accent-500 to-primary-500 opacity-75 blur-sm animate-pulse"></div>
  
  {/* QR code */}
  <div className="relative bg-white p-2 rounded-lg shadow-lg">
    <QRCodeSVG value={qrCode} size={150} />
    
    {/* Indicador de escaneamento */}
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="w-24 h-24 border-2 border-primary-500 opacity-50 animate-ping rounded-sm"></div>
    </div>
  </div>
</div>
```

## Troubleshooting Rápido

| Problema | Verificação | Solução |
|----------|-------------|---------|
| QR Code não aparece | Logs do backend | Reiniciar backend: `pm2 restart nexo-backend` |
| Erro de Puppeteer | Dependências | Instalar Puppeteer: `npm install puppeteer` |
| Conexão não atualiza | Status no Supabase | Verificar tabela `conexao` no Supabase |
| Erro no frontend | Console do navegador | Verificar erros de rede ou JavaScript |
| Backend não inicia | Logs do PM2 | Verificar logs: `pm2 logs nexo-backend` |

## Adaptação para Outros Projetos

Para adaptar esta integração para outros projetos:

1. Copie os arquivos principais:
   - `backend/whatsapp.js`
   - `backend/server.js` (adapte conforme necessário)
   - `src/components/conexao/QRCodeModal.tsx`
   - `src/pages/dashboard/ConexaoPage.tsx` (adapte conforme necessário)

2. Instale as dependências necessárias:
   - Frontend: React, Framer Motion, Tailwind CSS, Supabase
   - Backend: Express, WhatsApp Web.js, Puppeteer, Supabase

3. Configure o banco de dados:
   - Crie uma tabela `conexao` com os campos: id, nome, status, last_connection, empresa_id

4. Adapte as URLs e endpoints conforme necessário

5. Ajuste as animações e estilos conforme o design do seu projeto
