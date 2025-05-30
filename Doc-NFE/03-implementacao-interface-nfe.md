# Implementação da Interface de NFe - Documentação Técnica

## 📋 Visão Geral
Esta documentação detalha a implementação completa da interface de criação e edição de NFe no sistema Nexo Pedidos, realizada em dezembro de 2024.

## 🎯 Objetivos Alcançados
- ✅ Interface completa de NFe com todas as seções obrigatórias
- ✅ Layout responsivo e profissional em dark mode
- ✅ Formulários dinâmicos para produtos e pagamentos
- ✅ Validações e estados condicionais
- ✅ Estrutura preparada para integração com biblioteca NFe

## 🏗️ Arquitetura da Implementação

### Arquivo Principal
- **Localização**: `src/pages/dashboard/NfePage.tsx`
- **Tipo**: Componente React funcional com TypeScript
- **Padrão**: Single File Component com múltiplas seções

### Estrutura de Componentes
```
NfePage (Componente Principal)
├── Lista de NFes (Grid com filtros)
├── NfeForm (Formulário com abas laterais)
    ├── IdentificacaoSection
    ├── DestinatarioSection
    ├── ProdutosSection (com formulário dinâmico)
    ├── TotaisSection
    ├── PagamentosSection (com formulário dinâmico)
    ├── ChavesRefSection
    ├── TransportadoraSection
    ├── IntermediadorSection
    └── AutorizacaoSection (condicional)
```

## 📱 Seções Implementadas

### 1. Seção de Identificação
**Componente**: `IdentificacaoSection`
**Características**:
- Campos básicos da NFe (código, modelo, série, número)
- Data/hora de emissão com valor atual automático
- Dropdowns para tipo, finalidade e presença
- Campo de natureza da operação
- Área de informações adicionais

**Campos Principais**:
- Código (readonly, gerado automaticamente)
- Modelo (fixo: 55)
- Série (editável, padrão: 1)
- Número (editável, próximo disponível)
- Emitida em (datetime-local, atual)
- Tipo Documento, Finalidade, Presença (selects)
- Natureza da Operação (text input)

### 2. Seção de Destinatário
**Componente**: `DestinatarioSection`
**Características**:
- Campo de busca/seleção de destinatário
- Botão para adicionar novo destinatário
- Configurações de IE e operação
- Identificação de consumidor final

**Campos Principais**:
- Destinatário (input com botão +)
- Identificador da IE (select)
- Identificador de Operação (select)
- Consumidor (select)

### 3. Seção de Produtos ⭐
**Componente**: `ProdutosSection`
**Características**:
- **Formulário de adição dinâmico**
- **Lista vazia por padrão**
- **Tabela responsiva com produtos adicionados**
- **Cálculo automático de totais**

**Estrutura do Formulário**:
```tsx
// Estado para gerenciar produtos
const [produtos, setProdutos] = useState<any[]>([]);

// Layout responsivo
- Campo Produto (largura total)
- Grid 4 colunas: Valor unit. | Quantidade | Total | Botão
```

**Funcionalidades**:
- Adição de produtos via formulário
- Remoção de produtos (botão lixeira)
- Cálculo automático do total (valor × quantidade)
- Validação de campos obrigatórios

### 4. Seção de Totais
**Componente**: `TotaisSection`
**Características**:
- Layout organizado em linhas conforme padrão NFe
- Campos calculados (readonly) e editáveis
- Totalizadores de impostos

**Organização dos Campos**:
```
Linha 1: Total produtos | Total Crédito SN
Linha 2: Total PIS | Total COFINS | Total IPI
Linha 3: Total ICMS BC | Total ICMS | Total FCP
Linha 4: Total ICMS BC ST | Total ICMS ST | Total FCP ST
Linha 5: Desconto | Frete | Seguro | Outros (readonly)
Final: Total Nota (calculado)
```

### 5. Seção de Pagamentos ⭐
**Componente**: `PagamentosSection`
**Características**:
- **Formulário de adição dinâmico**
- **Lista vazia por padrão**
- **Dropdown com todos os tipos de pagamento NFe**

**Estrutura do Formulário**:
```tsx
// Estado para gerenciar pagamentos
const [pagamentos, setPagamentos] = useState<any[]>([]);

// Tipos de pagamento disponíveis
01 - Dinheiro, 02 - Cheque, 03 - Cartão Crédito,
04 - Cartão Débito, 05 - Crédito Loja, 10 - Vale Alimentação,
11 - Vale Refeição, 12 - Vale Presente, 13 - Vale Combustível,
15 - Boleto Bancário, 90 - Sem pagamento, 99 - Outros
```

### 6. Seção de Chaves Referenciadas
**Componente**: `ChavesRefSection`
**Características**:
- Estado vazio por padrão
- Preparado para futuras implementações
- Mensagem informativa

### 7. Seção de Transportadora
**Componente**: `TransportadoraSection`
**Características**:
- Campo de busca/seleção de transportadora
- Dropdown de identificação do frete (FOB, CIF, etc.)
- Botão para adicionar nova transportadora

### 8. Seção de Intermediador
**Componente**: `IntermediadorSection`
**Características**:
- Campo de busca/seleção de intermediador
- Botão para adicionar novo intermediador

### 9. Seção de Autorização ⭐
**Componente**: `AutorizacaoSection`
**Características**:
- **Renderização condicional baseada no status da NFe**
- **Estado não autorizada**: Mensagem explicativa
- **Estado autorizada**: Campos funcionais

**Lógica Condicional**:
```tsx
const [nfeAutorizada, setNfeAutorizada] = useState(false);

if (!nfeAutorizada) {
  // Mostra mensagem: "NFe Não Autorizada"
  // Explica que campos serão preenchidos após SEFAZ
}

// Estado autorizada mostra:
// - Chave de Acesso (readonly, da SEFAZ)
// - Protocolo de Uso (readonly, da SEFAZ)
// - Sequencia CCe (editável)
// - Carta de correção (textarea)
// - Motivo do cancelamento (textarea)
```

## 🎨 Design System

### Layout Responsivo
- **Mobile First**: Grid adaptativo
- **Breakpoints**: sm (640px), md (768px), lg (1024px)
- **Navegação**: Abas laterais em coluna

### Cores e Estilo
- **Background**: Dark mode (#1a1a1a, #2a2a2a)
- **Texto**: Branco (#ffffff) e cinza (#9ca3af)
- **Primary**: Azul (#3b82f6)
- **Bordas**: Cinza escuro (#374151)

### Componentes Reutilizados
- **Button**: Componente customizado
- **Inputs**: Estilo padronizado
- **Cards**: Background-card com bordas
- **Tables**: Responsivas com hover

## 🔧 Estados e Funcionalidades

### Estados React Implementados
```tsx
// Estados principais
const [showForm, setShowForm] = useState(false);
const [activeSection, setActiveSection] = useState('identificacao');
const [produtos, setProdutos] = useState<any[]>([]);
const [pagamentos, setPagamentos] = useState<any[]>([]);
const [nfeAutorizada, setNfeAutorizada] = useState(false);
```

### Navegação Entre Seções
```tsx
const sections = [
  { id: 'identificacao', label: 'Identificação', icon: FileText },
  { id: 'destinatario', label: 'Destinatário', icon: FileText },
  { id: 'produtos', label: 'Produtos', icon: FileText },
  { id: 'totais', label: 'Totais', icon: FileText },
  { id: 'pagamentos', label: 'Pagamentos', icon: FileText },
  { id: 'chaves_ref', label: 'Chaves Ref.', icon: FileText },
  { id: 'transportadora', label: 'Transportadora', icon: FileText },
  { id: 'intermediador', label: 'Intermediador', icon: FileText },
  { id: 'autorizacao', label: 'Autorização', icon: FileText },
];
```

### Validações Implementadas
- Campos obrigatórios marcados com *
- Campos readonly para valores calculados
- Placeholders informativos
- Estados vazios com mensagens

## 📦 Dependências Utilizadas
```json
{
  "lucide-react": "Ícones (Plus, Edit, Eye, Trash2, etc.)",
  "react": "^18.x (useState, useEffect)",
  "typescript": "Tipagem forte",
  "tailwindcss": "Estilização responsiva"
}
```

## 🔄 Fluxo de Dados Preparado

### Estrutura de Dados NFe
```typescript
interface NFe {
  // Identificação
  codigo?: string;
  modelo: string;
  serie: number;
  numero: number;
  data_emissao: string;
  
  // Destinatário
  destinatario_id?: string;
  
  // Produtos
  produtos: Produto[];
  
  // Totais
  total_produtos: number;
  total_impostos: number;
  total_nota: number;
  
  // Pagamentos
  pagamentos: Pagamento[];
  
  // Status
  status_nfe: 'rascunho' | 'enviada' | 'autorizada' | 'cancelada';
  chave_acesso?: string;
  protocolo_uso?: string;
}
```

## 🚀 Próximos Passos Identificados

### 1. Integração com Biblioteca NFe
- Implementar nfephp-org/sped-nfe
- Mapeamento de dados da interface para XML
- Validações específicas da biblioteca

### 2. Conexão com SEFAZ
- Configuração de certificados digitais
- Envio de NFe para autorização
- Tratamento de retornos da SEFAZ

### 3. Funcionalidades Pendentes
- Cálculos automáticos de impostos
- Validação de NCM e CFOP
- Integração com base de produtos
- Histórico de alterações

## 📝 Observações Técnicas

### Boas Práticas Aplicadas
- Componentes funcionais com hooks
- Tipagem TypeScript
- Separação de responsabilidades
- Layout responsivo mobile-first
- Estados locais bem definidos

### Pontos de Atenção
- Estados ainda não persistem no banco
- Cálculos de impostos não implementados
- Validações de negócio pendentes
- Integração com produtos existentes pendente

---

**Data da Implementação**: Dezembro 2024  
**Desenvolvedor**: Augment Agent  
**Status**: Interface Completa - Pronta para Integração Backend
