# 🔧 Detalhes Técnicos da Implementação NFC-e

## 📋 **CONTEXTO DO PROJETO**

### **Sistema**: Nexo Pedidos - PDV e Gestão Fiscal
### **Tecnologias**: React + TypeScript + Supabase + PHP Backend
### **Foco**: Melhorias em NFC-e e experiência do usuário

## 🗃️ **ESTRUTURA DO BANCO DE DADOS**

### **Tabela: `pdv`**
```sql
-- Campos relacionados à implementação:
documento_cliente TEXT,           -- CPF/CNPJ informado na venda
tipo_documento_cliente TEXT,      -- 'cpf' ou 'cnpj'
status_fiscal TEXT,              -- 'pendente', 'autorizada', 'cancelada', 'nao_fiscal'
modelo_documento INTEGER,        -- null=PDV, 65=NFC-e, 55=NFe
protocolo_cancelamento TEXT,     -- Protocolo SEFAZ para cancelamentos
tentativa_nfce BOOLEAN,         -- Flag de tentativa de emissão NFC-e
chave_nfe TEXT,                 -- Chave da NFC-e
protocolo_nfe TEXT,             -- Protocolo de autorização
numero_documento INTEGER,       -- Número da NFC-e
serie_documento INTEGER,        -- Série da NFC-e
```

### **Consulta Principal Corrigida:**
```typescript
// Filtro corrigido para mostrar vendas PDV e NFC-e (excluir apenas NFe)
.or('modelo_documento.is.null,modelo_documento.eq.65')
```

## 🎨 **COMPONENTES DE INTERFACE**

### **1. Filtros de NFC-e**
**Localização**: `src/pages/dashboard/PDVPage.tsx:8300-8310`

```typescript
// Estado do filtro
const [filtroNfce, setFiltroNfce] = useState<'todas' | 'pendentes' | 'autorizadas' | 'canceladas'>('todas');

// Interface visual
{[
  { value: 'todas', label: 'Todas as vendas', icon: '📋' },
  { value: 'pendentes', label: 'NFC-e Pendentes', icon: '⏳' },
  { value: 'autorizadas', label: 'NFC-e Autorizadas', icon: '✅' },
  { value: 'canceladas', label: 'NFC-e Canceladas', icon: '❌' }
].map((nfce) => (
  // Botões de filtro
))}
```

### **2. Tags de Status Fiscal**
**Localização**: `src/pages/dashboard/PDVPage.tsx:8489-8501`

```typescript
// Tag Pendente
{venda.status_fiscal === 'pendente' && (
  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full border border-yellow-500/30 animate-pulse">
    Pendente
  </span>
)}

// Tag Autorizada
{venda.status_fiscal === 'autorizada' && (
  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full border border-green-500/30">
    Autorizada
  </span>
)}

// Tag Cancelada
{venda.status_fiscal === 'cancelada' && venda.modelo_documento === 65 && (
  <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded-full border border-red-500/30">
    NFC-e Cancelada
  </span>
)}
```

### **3. Exibição de CPF/CNPJ**
**Localização**: `src/pages/dashboard/PDVPage.tsx:8516-8544`

```typescript
{venda.cliente ? (
  <div className="space-y-1">
    {/* Documento do cliente cadastrado */}
    {venda.cliente.documento && (
      <div className="text-xs text-gray-500 truncate">
        {venda.cliente.documento.length === 11 ? 'CPF' : 'CNPJ'}: {venda.cliente.documento}
      </div>
    )}
    <div className="text-sm text-gray-400 truncate">
      Cliente: {venda.cliente.nome}
    </div>
  </div>
) : venda.documento_cliente ? (
  <div className="space-y-1">
    {/* Documento informado sem cliente cadastrado */}
    <div className="text-xs text-gray-500 truncate">
      {venda.documento_cliente.length === 11 ? 'CPF' : 'CNPJ'}: {venda.documento_cliente}
    </div>
    <div className="text-sm text-gray-400">
      Cliente: Consumidor Final
    </div>
  </div>
) : (
  <div className="text-sm text-gray-400">
    Cliente: Consumidor Final
  </div>
)}
```

## 🔄 **FLUXOS DE DADOS**

### **1. Salvamento de Documento na Venda**
**Problema identificado**: CPF/CNPJ não era salvo quando cliente não estava cadastrado

**Solução implementada** (`src/pages/dashboard/PDVPage.tsx:4104-4118`):
```typescript
// Cenário 1: Cliente encontrado no cadastro
if (cpfCnpjNota && clienteEncontrado) {
  clienteData = {
    cliente_id: clienteEncontrado.id,
    nome_cliente: clienteEncontrado.nome,
    documento_cliente: clienteEncontrado.documento,
    // ...
  };
}
// Cenário 2: CPF/CNPJ informado mas cliente não encontrado
else if (cpfCnpjNota && cpfCnpjNota.trim()) {
  clienteData = {
    documento_cliente: cpfCnpjNota.replace(/\D/g, ''),
    tipo_documento_cliente: tipoDocumento
  };
}
```

### **2. Emissão de NFC-e no Modal de Itens**
**Função principal**: `emitirNfceModalItens()` (linhas 3953-4135)

**Fluxo completo**:
1. Validação de documento (se informado)
2. Busca de dados da empresa e configurações
3. Geração do próximo número de NFC-e
4. Preparação dos dados fiscais
5. Chamada ao backend PHP
6. Atualização da venda no banco
7. Feedback visual e recarregamento

```typescript
const emitirNfceModalItens = async () => {
  // 1. Validações
  if (cpfCnpjModalItens.trim() && isDocumentoModalItensInvalido()) {
    toast.error('CPF/CNPJ inválido');
    return;
  }

  // 2. Buscar dados necessários
  const { data: empresaData } = await supabase.from('empresas')...
  const { data: nfeConfigData } = await supabase.from('nfe_config')...

  // 3. Preparar dados da NFC-e
  const nfceData = {
    empresa: { /* dados da empresa */ },
    destinatario: cpfCnpjModalItens.trim() ? {
      documento: cpfCnpjModalItens.replace(/\D/g, ''),
      nome: 'CONSUMIDOR'
    } : {},
    produtos: itensVenda.map(item => ({ /* dados dos produtos */ }))
  };

  // 4. Emitir via backend
  const response = await fetch('/backend/public/emitir-nfce.php', {
    method: 'POST',
    body: JSON.stringify({ empresa_id, nfce_data: nfceData })
  });

  // 5. Atualizar venda
  await supabase.from('pdv').update({
    modelo_documento: 65,
    numero_documento: proximoNumero,
    chave_nfe: result.data.chave,
    status_fiscal: 'autorizada',
    documento_cliente: cpfCnpjModalItens.replace(/\D/g, ''),
    // ...
  }).eq('id', vendaParaExibirItens.id);
};
```

## 🎯 **VALIDAÇÕES IMPLEMENTADAS**

### **Validação de CPF**
```typescript
const validarCpf = (cpf: string): boolean => {
  const numbers = cpf.replace(/\D/g, '');
  if (numbers.length !== 11) return false;
  
  // Algoritmo padrão de validação de CPF
  // ... implementação completa
};
```

### **Validação de CNPJ**
```typescript
const validarCnpj = (cnpj: string): boolean => {
  const numbers = cnpj.replace(/\D/g, '');
  if (numbers.length !== 14) return false;
  
  // Algoritmo padrão de validação de CNPJ
  // ... implementação completa
};
```

### **Formatação de Documentos**
```typescript
const formatDocumento = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 11) {
    // Formato CPF: 000.000.000-00
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else {
    // Formato CNPJ: 00.000.000/0000-00
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
};
```

## 🔍 **DEBUGGING E LOGS**

### **Pontos de Log Importantes**:
1. **Salvamento de documento**: Console.log na função de finalização
2. **Emissão de NFC-e**: Logs detalhados no processo de emissão
3. **Filtros**: Logs das consultas SQL geradas
4. **Validações**: Feedback visual em tempo real

### **Tratamento de Erros**:
- Toast notifications para feedback do usuário
- Console.error para debugging técnico
- Fallbacks para dados não encontrados
- Validações preventivas antes de operações críticas

## 📊 **PERFORMANCE E OTIMIZAÇÕES**

### **Consultas Otimizadas**:
- Uso de `.select()` específico para campos necessários
- Filtros aplicados no banco (não no frontend)
- Limit de 100 registros por consulta
- Índices sugeridos: `status_fiscal`, `modelo_documento`, `empresa_id`

### **Estados Gerenciados**:
- Estados locais para validações em tempo real
- Debounce implícito nas validações
- Loading states para feedback visual
- Cleanup de estados ao fechar modais

## 🎯 **PONTOS DE ATENÇÃO PARA CONTINUIDADE**

### **Arquitetura**:
- Sistema usa Supabase para banco de dados
- Backend PHP para integração com SEFAZ
- Frontend React com TypeScript
- Comunicação via REST API

### **Padrões do Projeto**:
- Estados com `useState` do React
- Funções async/await para operações assíncronas
- Toast notifications para feedback
- AnimatePresence para modais
- Tailwind CSS para estilização

### **Integração com SEFAZ**:
- Endpoint: `/backend/public/emitir-nfce.php`
- Ambiente configurável (homologação/produção)
- CSC (Código de Segurança do Contribuinte) por ambiente
- Séries individuais por usuário

### **Campos Críticos**:
- `documento_cliente`: Sempre salvar quando informado
- `status_fiscal`: Controla exibição de tags e filtros
- `modelo_documento`: Determina tipo de documento fiscal
- `tentativa_nfce`: Flag para identificar tentativas de NFC-e
