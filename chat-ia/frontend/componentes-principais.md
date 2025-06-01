# ⚛️ Componentes Principais do Frontend

## 📁 Estrutura de Componentes

### 🎯 Componente Principal: NfePage.tsx
**Localização**: `src/pages/dashboard/NfePage.tsx`  
**Responsabilidade**: Interface completa de NFe (grid + formulário)

```typescript
// Estrutura principal
const NfePage: React.FC = () => {
  // Estados principais
  const [showForm, setShowForm] = useState(false);
  const [nfes, setNfes] = useState<NFe[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Renderização condicional
  if (showForm) {
    return <NfeForm onBack={() => setShowForm(false)} />;
  }
  
  return <NfeGrid />; // Grid principal
};
```

### 🎨 Subcomponentes do Formulário

#### 1. IdentificacaoSection
```typescript
interface IdentificacaoProps {
  data: any;
  onChange: (data: any) => void;
  naturezasOperacao: Array<{id: number, descricao: string}>;
}

// Campos principais:
- numero (automático)
- modelo (55 fixo)
- serie (editável)
- data_emissao
- natureza_operacao (dropdown)
- informacao_adicional (textarea)
```

#### 2. DestinatarioSection
```typescript
interface DestinatarioProps {
  data: any;
  onChange: (data: any) => void;
  onClienteSelected?: (observacaoNfe: string) => void;
}

// Funcionalidades:
- Busca de clientes integrada
- Preenchimento automático
- Múltiplos emails
- Observação NFe automática
```

#### 3. ProdutosSection
```typescript
interface ProdutosProps {
  produtos: any[];
  empresaId: string;
  onChange: (produtos: any[]) => void;
}

// Funcionalidades:
- Modal de seleção de produtos
- Cálculo automático de totais
- Validação de campos fiscais
- Botão "Adicionar" condicional
```

#### 4. TotaisSection
```typescript
interface TotaisProps {
  data: any;
  onChange: (data: any) => void;
}

// Campos calculados:
- valor_produtos (automático)
- valor_desconto (editável)
- valor_total (calculado)
- impostos (ICMS, PIS, COFINS)
```

#### 5. PagamentosSection
```typescript
interface PagamentosProps {
  data: any[];
  onChange: (data: any[]) => void;
  totalNota: number;
}

// Validações:
- Soma deve igualar total da nota
- Formas de pagamento válidas
- Valores positivos
```

## 🎛️ Sistema de Estados

### Estado Principal (NfeForm)
```typescript
const [nfeData, setNfeData] = useState({
  identificacao: {
    modelo: 55,
    serie: 1,
    numero: '',
    data_emissao: new Date().toISOString().slice(0, 16),
    natureza_operacao: 'Venda de Mercadoria',
    informacao_adicional: ''
  },
  destinatario: {
    documento: '',
    nome: '',
    endereco: '',
    emails: []
  },
  produtos: [],
  totais: {
    valor_produtos: 0,
    valor_total: 0
  },
  pagamentos: [],
  empresa: null // Carregado automaticamente
});
```

### Estados de Controle
```typescript
// Navegação
const [activeSection, setActiveSection] = useState('identificacao');

// Loading states
const [isLoading, setIsLoading] = useState(false);
const [isSavingRascunho, setIsSavingRascunho] = useState(false);

// Modais
const [showProgressModal, setShowProgressModal] = useState(false);
const [showExitModal, setShowExitModal] = useState(false);

// Status
const [apiStatus, setApiStatus] = useState<'online' | 'offline' | 'checking'>('checking');
const [sefazStatus, setSefazStatus] = useState<'online' | 'offline' | 'checking'>('checking');

// Configurações
const [ambienteNFe, setAmbienteNFe] = useState<'homologacao' | 'producao'>('homologacao');
```

## 🔄 Fluxo de Dados

### Atualização de Seções
```typescript
// Padrão para atualizar dados de uma seção
const updateSection = (section: string, data: any) => {
  setNfeData(prev => ({
    ...prev,
    [section]: {
      ...prev[section],
      ...data
    }
  }));
};

// Exemplo de uso
<IdentificacaoSection
  data={nfeData.identificacao}
  onChange={(data) => updateSection('identificacao', data)}
/>
```

### Cálculos Automáticos
```typescript
// Atualização de produtos com recálculo de totais
const updateProdutos = (produtos: any[]) => {
  const valorProdutos = produtos.reduce((sum, p) => sum + (p.valor_total || 0), 0);
  
  setNfeData(prev => ({
    ...prev,
    produtos,
    totais: {
      ...prev.totais,
      valor_produtos: valorProdutos,
      valor_total: valorProdutos - prev.totais.valor_desconto
    }
  }));
};
```

## 🎨 Padrões de UI

### Layout Responsivo
```typescript
// Grid padrão para formulários
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Campos do formulário */}
</div>

// Layout específico para identificação
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
  <div className="lg:col-span-1">{/* Número */}</div>
  <div className="lg:col-span-1">{/* Modelo */}</div>
  <div className="lg:col-span-1">{/* Série */}</div>
  <div className="lg:col-span-2">{/* Código */}</div>
  <div className="lg:col-span-2">{/* Data */}</div>
</div>
```

### Cores e Status
```typescript
// Cores padronizadas para status
const getStatusColor = (status: string) => {
  switch (status) {
    case 'rascunho':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    case 'emitido':
    case 'autorizada':
      return 'bg-green-500/15 text-green-400 border-green-500/30';
    case 'cancelada':
      return 'bg-red-500/15 text-red-400 border-red-500/30';
    case 'inutilizada':
      return 'bg-yellow-600/15 text-yellow-400 border-yellow-600/30';
    default:
      return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
  }
};
```

### Navegação por Abas
```typescript
// Seções com numeração
const sections = [
  { id: 'identificacao', label: 'Identificação', number: 1 },
  { id: 'destinatario', label: 'Destinatário', number: 2 },
  { id: 'produtos', label: 'Produtos', number: 3 },
  { id: 'totais', label: 'Totais', number: 4 },
  { id: 'pagamentos', label: 'Pagamentos', number: 5 },
  { id: 'chaves_ref', label: 'Chaves Ref.', icon: FileText },
  { id: 'transportadora', label: 'Transportadora', icon: FileText },
  { id: 'intermediador', label: 'Intermediador', icon: FileText }
];

// Renderização da navegação
{sections.map((section) => (
  <button
    key={section.id}
    onClick={() => setActiveSection(section.id)}
    className={`sidebar-button ${activeSection === section.id ? 'active' : ''}`}
  >
    {section.number ? (
      <div className="numbered-circle">{section.number}</div>
    ) : (
      <section.icon size={18} />
    )}
    <span>{section.label}</span>
  </button>
))}
```

## 🔧 Hooks Personalizados

### useNfeValidation
```typescript
const useNfeValidation = (nfeData: any) => {
  const validateData = useCallback(() => {
    const errors: string[] = [];
    
    // Validações obrigatórias
    if (!nfeData.empresa) {
      errors.push('Dados da empresa não carregados');
    }
    
    if (!nfeData.destinatario.nome) {
      errors.push('Nome do destinatário é obrigatório');
    }
    
    if (nfeData.produtos.length === 0) {
      errors.push('Pelo menos um produto deve ser adicionado');
    }
    
    return errors;
  }, [nfeData]);
  
  return { validateData };
};
```

### useApiStatus
```typescript
const useApiStatus = () => {
  const [apiStatus, setApiStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  
  const checkStatus = useCallback(async () => {
    try {
      setApiStatus('checking');
      const response = await fetch('https://apinfe.nexopdv.com/api/status', {
        signal: AbortSignal.timeout(5000)
      });
      
      setApiStatus(response.ok ? 'online' : 'offline');
    } catch {
      setApiStatus('offline');
    }
  }, []);
  
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);
  
  return { apiStatus, checkStatus };
};
```

## 📱 Componentes Reutilizáveis

### Toast System
```typescript
const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <svg class="toast-icon">${getIcon(type)}</svg>
    <span>${message}</span>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 4000);
};
```

### Modal de Progresso
```typescript
const ProgressModal = ({ steps, logs, onCopyLogs }) => (
  <div className="modal-overlay">
    <div className="modal-content">
      {/* Steps */}
      <div className="progress-steps">
        {steps.map((step, index) => (
          <div key={step.id} className="step">
            <div className={`step-icon ${step.status}`}>
              {getStepIcon(step.status, index + 1)}
            </div>
            <div className="step-content">
              <span className="step-label">{step.label}</span>
              {step.message && <span className="step-message">{step.message}</span>}
            </div>
          </div>
        ))}
      </div>
      
      {/* Logs */}
      <div className="logs-area">
        <div className="logs-header">
          <h4>Logs do Processo</h4>
          <button onClick={onCopyLogs}>Copiar Logs</button>
        </div>
        <div className="logs-content">
          {logs.map((log, index) => (
            <div key={index} className={`log-line ${getLogType(log)}`}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
```
