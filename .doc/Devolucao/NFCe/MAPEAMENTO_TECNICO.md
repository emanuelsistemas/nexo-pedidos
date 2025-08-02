# 🗺️ Mapeamento Técnico - Sistema de Devolução NFC-e

## 📁 **ESTRUTURA DE ARQUIVOS**

```
src/components/devolucao/
└── NovaDevolucaoModal.tsx
    ├── NovaDevolucaoModal (Componente Principal)
    ├── FinalizarDevolucaoModal (Componente Interno)
    └── Modal de Confirmação Devolução Manual
```

## 🔧 **COMPONENTES E FUNÇÕES**

### **1. NovaDevolucaoModal (Principal)**

#### **Estados Principais**
```typescript
// Controle de vendas e itens
const [vendas, setVendas] = useState<VendaComItens[]>([]);
const [selectedVendas, setSelectedVendas] = useState<Set<string>>(new Set());
const [selectedItens, setSelectedItens] = useState<Set<string>>(new Set());

// Controle de expansão
const [expandedVendas, setExpandedVendas] = useState<Set<string>>(new Set());
const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

// Modais
const [showFinalizarModal, setShowFinalizarModal] = useState(false);
```

#### **Funções Críticas**
```typescript
// Carregamento de dados
loadVendas() // Busca vendas da empresa
loadItensVenda(vendaId) // Carrega itens + dados fiscais
getVendaOrigemInfo() // Obtém info da venda origem

// Controle de seleção
handleSelectVenda(vendaId) // Seleciona venda completa
handleSelectItem(itemId) // Seleciona item individual
toggleItemExpansion(itemId) // Expande dados fiscais
```

### **2. FinalizarDevolucaoModal (Interno)**

#### **Estados Específicos**
```typescript
// Dados fiscais
const [itensComDadosFiscais, setItensComDadosFiscais] = useState<any[]>([]);
const [ambienteNFe, setAmbienteNFe] = useState<'homologacao' | 'producao' | null>(null);

// Modal de confirmação
const [showConfirmacaoManualModal, setShowConfirmacaoManualModal] = useState(false);
const [confirmacaoTexto, setConfirmacaoTexto] = useState('');
```

#### **Funções Específicas**
```typescript
// Carregamento automático
carregarDadosFiscais() // useEffect - carrega dados fiscais dos produtos
carregarAmbienteNFe() // useEffect - busca ambiente da empresa

// Confirmação
handleConfirmarDevolucao(tipo) // Função principal de confirmação
handleConfirmarDevolucaoManualForcada() // Confirmação forçada após validação
```

## 🗄️ **QUERIES E DADOS**

### **1. Busca de Vendas**
```sql
-- Localização: loadVendas()
SELECT 
  pv.id,
  pv.numero_venda,
  pv.data_venda,
  pv.valor_total,
  pv.modelo_documento,
  pv.chave_nfe,
  c.nome as cliente_nome
FROM pdv_vendas pv
LEFT JOIN clientes c ON pv.cliente_id = c.id
WHERE pv.empresa_id = ? 
  AND pv.status = 'finalizada'
ORDER BY pv.created_at DESC
```

### **2. Busca de Itens + Dados Fiscais**
```sql
-- Localização: loadItensVenda()
-- Primeira query: Itens da venda
SELECT 
  id, pdv_id, produto_id, nome_produto,
  quantidade, valor_unitario, valor_total_item
FROM pdv_itens 
WHERE pdv_id = ?

-- Segunda query: Dados fiscais dos produtos
SELECT 
  id, codigo, ncm, cfop, csosn_icms,
  aliquota_icms, aliquota_pis, aliquota_cofins,
  unidade_medida:unidade_medida_id (id, sigla, nome)
FROM produtos 
WHERE id IN (?) AND empresa_id = ?
```

### **3. Configuração NFe**
```sql
-- Localização: carregarAmbienteNFe()
SELECT ambiente 
FROM nfe_config 
WHERE empresa_id = ?
```

## 🎨 **COMPONENTES VISUAIS**

### **1. Tags de Identificação**
```typescript
// Tag NFC-e (verde)
{vendaOrigem?.modelo_documento === 65 && (
  <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded border border-green-500/30">
    NFC-e
  </span>
)}

// Tag PDV (cinza)
{!vendaOrigem?.modelo_documento && (
  <span className="text-xs px-2 py-1 bg-gray-500/20 text-gray-400 rounded border border-gray-500/30">
    PDV
  </span>
)}

// Tag HOMOLOG (laranja)
{ambienteNFe === 'homologacao' && (
  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full border bg-orange-500/10 text-orange-400 border-orange-500/20">
    HOMOLOG.
  </span>
)}
```

### **2. Dados Fiscais Expandíveis**
```typescript
// Botão de expansão
<button onClick={() => toggleItemExpansion(item.id)}>
  Dados Fiscais
</button>

// Seção expandida
{expandedItems.has(item.id) && (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
    <div>NCM: {item.dadosFiscais.ncm}</div>
    <div>CFOP: {item.dadosFiscais.cfop}</div>
    <div className="text-red-400">CFOP Devolução: 5202</div>
    // ... outros campos
  </div>
)}
```

### **3. Botões de Ação**
```typescript
// Botão Devolução Manual (azul)
<button 
  onClick={() => handleConfirmarDevolucao('manual')}
  className="bg-primary-500 hover:bg-primary-600"
>
  Confirmar Devolução Manual
</button>

// Botão Devolução NFC-e (verde)
<button 
  onClick={() => handleConfirmarDevolucao('nfce')}
  className="bg-green-600 hover:bg-green-700"
>
  Confirmar Devolução NFC-e
</button>
```

## 🔄 **FLUXO DE DADOS**

### **1. Carregamento Inicial**
```
loadVendas() → setVendas() → Renderização da lista
```

### **2. Seleção de Venda**
```
Click na venda → handleExpandVenda() → loadItensVenda() → 
carregarDadosFiscais() → setItensComDadosFiscais()
```

### **3. Finalização**
```
Click "Finalizar" → setShowFinalizarModal(true) → 
carregarAmbienteNFe() → Renderizar modal com dados
```

### **4. Confirmação**
```
Click botão → handleConfirmarDevolucao() → 
Validação → Modal confirmação (se necessário) → 
handleConfirm() → Processamento
```

## 🔍 **PONTOS DE INTEGRAÇÃO**

### **1. Props do Componente Principal**
```typescript
interface NovaDevolucaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresaId: string;
  onDevolucaoCreated?: () => void;
}
```

### **2. Props do Modal Finalizar**
```typescript
interface FinalizarDevolucaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItens: Set<string>;
  selectedVendas: Set<string>;
  vendas: VendaComItens[];
  empresaId: string;
  valorTotal: number;
  isLoading?: boolean;
  onConfirm: (clienteId: string, tipo: 'manual' | 'nfce', dadosExtras?: any) => Promise<void>;
}
```

### **3. Função de Callback**
```typescript
// Implementada no componente pai
const handleConfirm = async (clienteId: string, tipo: 'manual' | 'nfce', dadosExtras?: any) => {
  // Lógica de processamento da devolução
  // - Salvar na tabela devolucoes
  // - Atualizar estoque
  // - Emitir NFC-e (se tipo === 'nfce')
  // - Notificar usuário
};
```

## 🎯 **PONTOS DE EXTENSÃO**

### **1. Validações Customizadas**
```typescript
// Adicionar em handleConfirmarDevolucao()
const validarRegrasNegocio = (itens: ItemVenda[]) => {
  // Validações específicas da empresa
  // Limites de valor, prazo, etc.
};
```

### **2. Logs e Auditoria**
```typescript
// Adicionar em pontos críticos
const logAcao = (acao: string, dados: any) => {
  console.log(`[DEVOLUCAO] ${acao}:`, dados);
  // Enviar para sistema de logs
};
```

### **3. Notificações**
```typescript
// Adicionar após processamento
const notificarSucesso = (tipo: 'manual' | 'nfce', dados: any) => {
  // Toast, email, webhook, etc.
};
```

## 🔧 **CONFIGURAÇÕES**

### **1. Constantes**
```typescript
const CFOP_DEVOLUCAO = '5202';
const MODELO_NFCE = 65;
const TIMEOUT_API = 30000; // 30 segundos
```

### **2. Validações**
```typescript
const CAMPOS_OBRIGATORIOS_NFCE = [
  'ncm', 'cfop', 'csosn_icms', 'unidade_medida'
];
```

### **3. Mensagens**
```typescript
const MENSAGENS = {
  ERRO_DADOS_FISCAIS: 'Dados fiscais incompletos para emissão de NFC-e',
  CONFIRMACAO_MANUAL: 'Digite CONFIRMAR para prosseguir com devolução manual',
  SUCESSO_NFCE: 'NFC-e de devolução emitida com sucesso'
};
```

## 📊 **MÉTRICAS E MONITORAMENTO**

### **1. Eventos para Tracking**
```typescript
// Adicionar em pontos estratégicos
analytics.track('devolucao_iniciada', { tipo: 'nfce' });
analytics.track('devolucao_finalizada', { sucesso: true });
analytics.track('erro_emissao_nfce', { erro: error.message });
```

### **2. Performance**
```typescript
// Monitorar tempos de carregamento
const startTime = performance.now();
await loadItensVenda(vendaId);
const loadTime = performance.now() - startTime;
console.log(`Carregamento de itens: ${loadTime}ms`);
```

**🎯 Este mapeamento serve como guia para qualquer desenvolvedor que precise dar continuidade à implementação do sistema de devolução NFC-e.**
