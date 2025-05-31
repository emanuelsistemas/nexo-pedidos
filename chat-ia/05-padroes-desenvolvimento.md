# 📋 Padrões de Desenvolvimento

## 🎯 Convenções de Código

### TypeScript/React
```typescript
// ✅ Nomenclatura de componentes (PascalCase)
const NfeFormSection: React.FC<Props> = ({ data, onChange }) => {
  // Hooks no início
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // Funções auxiliares
  const handleSubmit = async () => {
    // Implementação
  };
  
  // Render
  return <div>...</div>;
};

// ✅ Nomenclatura de variáveis (camelCase)
const nfeData = {};
const isLoadingData = false;
const showProgressModal = true;

// ✅ Nomenclatura de constantes (UPPER_SNAKE_CASE)
const API_BASE_URL = 'https://apinfe.nexopdv.com';
const DEFAULT_TIMEOUT = 5000;
```

### Estrutura de Componentes
```typescript
// Padrão de organização
interface ComponentProps {
  data: any;
  onChange: (data: any) => void;
  onSave?: () => void;
}

const Component: React.FC<ComponentProps> = ({ 
  data, 
  onChange, 
  onSave 
}) => {
  // 1. Estados
  const [localState, setLocalState] = useState();
  
  // 2. Effects
  useEffect(() => {
    // Inicialização
  }, []);
  
  // 3. Funções auxiliares
  const handleAction = () => {
    // Implementação
  };
  
  // 4. Render
  return (
    <div className="estrutura-padrao">
      {/* Conteúdo */}
    </div>
  );
};
```

## 🎨 Padrões de UI/CSS

### Classes Tailwind
```typescript
// ✅ Padrão de cores
const colorClasses = {
  primary: 'bg-primary-600 hover:bg-primary-700 text-white',
  success: 'bg-green-500 text-white',
  error: 'bg-red-500 text-white',
  warning: 'bg-orange-500 text-white',
  info: 'bg-blue-500 text-white'
};

// ✅ Padrão de espaçamento
const spacingClasses = {
  section: 'p-4',
  card: 'bg-background-card rounded-lg border border-gray-800 p-4',
  grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
  button: 'px-4 py-2 rounded-lg transition-colors'
};
```

### Layout Responsivo
```typescript
// ✅ Padrão de responsividade
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Mobile: 1 coluna, Tablet: 2 colunas, Desktop: 3 colunas */}
</div>

// ✅ Breakpoints padrão
// sm: 640px
// md: 768px  
// lg: 1024px
// xl: 1280px
```

## 🗄️ Padrões de Banco de Dados

### Nomenclatura de Tabelas
```sql
-- ✅ Português, plural, snake_case
CREATE TABLE nfe_configuracoes ();
CREATE TABLE pdv_itens ();
CREATE TABLE naturezas_operacao ();

-- ❌ Evitar
CREATE TABLE NfeConfig (); -- PascalCase
CREATE TABLE nfe_config (); -- Singular em contexto plural
```

### Nomenclatura de Campos
```sql
-- ✅ Snake_case, descritivo
CREATE TABLE empresas (
  id UUID PRIMARY KEY,
  razao_social VARCHAR NOT NULL,
  nome_fantasia VARCHAR,
  inscricao_estadual VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ✅ Relacionamentos claros
CREATE TABLE pdv_itens (
  id UUID PRIMARY KEY,
  pdv_id UUID REFERENCES pdv(id),
  produto_id UUID REFERENCES produtos(id)
);
```

## 🔧 Padrões de API

### Estrutura de Request
```typescript
// ✅ Padrão de requisição
const apiRequest = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    // Dados estruturados
    nfe: nfeData,
    empresa_id: empresaId,
    ambiente: ambienteNFe
  })
};
```

### Estrutura de Response
```typescript
// ✅ Padrão de resposta esperado
interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp?: string;
}

// ✅ Tratamento padrão
const handleApiResponse = async (response: Response) => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Erro desconhecido');
  }
  
  return result.data;
};
```

## 📝 Padrões de Logs

### Sistema de Logs
```typescript
// ✅ Padrão de logs categorizados
const addLog = (message: string) => {
  const timestamp = new Date().toLocaleTimeString();
  const logMessage = `[${timestamp}] ${message}`;
  
  // Categorização por emoji/palavra-chave
  if (message.includes('❌') || message.includes('ERRO')) {
    console.error('🔴 NFe Error:', message);
  } else if (message.includes('✅') || message.includes('sucesso')) {
    console.log('🟢 NFe Success:', message);
  } else if (message.includes('⚠️') || message.includes('AVISO')) {
    console.warn('🟡 NFe Warning:', message);
  } else {
    console.log('🔵 NFe Info:', message);
  }
  
  setLogs(prev => [...prev, logMessage]);
};
```

### Mensagens Padronizadas
```typescript
// ✅ Templates de mensagens
const logTemplates = {
  inicio: (processo: string) => `Iniciando ${processo}...`,
  sucesso: (acao: string) => `✅ ${acao} realizada com sucesso`,
  erro: (acao: string, detalhes: string) => `❌ ERRO em ${acao}: ${detalhes}`,
  debug: (campo: string, valor: any) => `🔍 ${campo}: ${valor}`,
  validacao: (campo: string, status: string) => `📋 ${campo}: ${status}`
};
```

## 🛠️ Padrões de Ferramentas

### Package Managers
```bash
# ✅ Preferência: npm (não yarn ou pnpm)
npm install package-name
npm run dev
npm run build

# ✅ Scripts padronizados no package.json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

### PowerShell vs Batch
```powershell
# ✅ Preferência: PowerShell (.ps1)
# Comando de desenvolvimento padrão
npx kill-port 5173; cd "C:\Users\Usuario\Desktop\projetos\nexo-pedidos"; npm run dev

# ❌ Evitar: .bat files (falharam no ambiente do usuário)
```

## 🎯 Padrões de Validação

### Validação de Formulários
```typescript
// ✅ Padrão de validação
const validateNfeData = (data: NfeData): string[] => {
  const errors: string[] = [];
  
  // Validações obrigatórias
  if (!data.empresa) {
    errors.push('Dados da empresa não carregados');
  }
  
  if (!data.destinatario.nome) {
    errors.push('Nome do destinatário é obrigatório');
  }
  
  if (data.produtos.length === 0) {
    errors.push('Pelo menos um produto deve ser adicionado');
  }
  
  return errors;
};
```

### Feedback Visual
```typescript
// ✅ Padrão de cores para status
const statusColors = {
  rascunho: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  emitido: 'bg-green-500/15 text-green-400 border-green-500/30',
  cancelado: 'bg-red-500/15 text-red-400 border-red-500/30',
  inutilizada: 'bg-yellow-600/15 text-yellow-400 border-yellow-600/30'
};
```

## 🔄 Padrões de Estado

### Gerenciamento de Estado
```typescript
// ✅ Padrão de atualização de estado
const updateNfeData = (section: string, data: any) => {
  setNfeData(prev => ({
    ...prev,
    [section]: {
      ...prev[section],
      ...data
    }
  }));
};

// ✅ Padrão de loading states
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

## 📱 Padrões de UX

### Confirmações
```typescript
// ✅ Confirmações importantes (produção)
if (novoAmbiente === 'producao') {
  const confirmacao = confirm(
    '⚠️ MUDANÇA PARA AMBIENTE DE PRODUÇÃO\n\n' +
    'As próximas NFe emitidas serão REAIS...\n\n' +
    'Confirma a mudança?'
  );
  
  if (!confirmacao) return;
}
```

### Toast Notifications
```typescript
// ✅ Preferência: Toast personalizado (não alert/console)
showToast('Operação realizada com sucesso!', 'success');
showToast('Erro ao processar solicitação', 'error');
```
