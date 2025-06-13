# 🔧 Detalhes Técnicos - Sistema NFC-e Edição e Reprocessamento

## 🎯 **ESTRUTURA TÉCNICA DETALHADA**

### **1. Estados React Adicionados:**
```typescript
// Localização: PDVPage.tsx linha 172-177
const [showEditarNfceModal, setShowEditarNfceModal] = useState(false);
const [vendaParaEditarNfce, setVendaParaEditarNfce] = useState<any>(null);
const [itensNfceEdicao, setItensNfceEdicao] = useState<any[]>([]);
const [loadingItensNfce, setLoadingItensNfce] = useState(false);
const [reprocessandoNfce, setReprocessandoNfce] = useState(false);
```

### **2. Estrutura de Dados dos Itens Editáveis:**
```typescript
// Processamento dos itens para edição
const itensProcessados = (itensData || []).map((item, index) => ({
  ...item,
  sequencia: index + 1,
  cfop_editavel: item.produto?.cfop || '',
  cst_editavel: item.produto?.cst_icms || '',
  csosn_editavel: item.produto?.csosn || '',
  regime_tributario: item.produto?.regime_tributario || 1,
  editando_cfop: false,
  editando_cst: false,
  editando_csosn: false
}));
```

---

## 🗄️ **QUERIES SUPABASE UTILIZADAS**

### **1. Query para Carregar Vendas (Atualizada):**
```typescript
// Localização: PDVPage.tsx linha 1923-1952
let query = supabase
  .from('pdv')
  .select(`
    id, numero_venda, data_venda, created_at, status_venda,
    valor_total, valor_subtotal, valor_desconto, valor_acrescimo,
    nome_cliente, telefone_cliente, pedidos_importados,
    cancelada_em, motivo_cancelamento, cancelada_por_usuario_id,
    empresa_id, usuario_id,
    tentativa_nfce,        // ✅ NOVO
    status_fiscal,         // ✅ NOVO
    erro_fiscal,           // ✅ NOVO
    modelo_documento, numero_documento, chave_nfe, protocolo_nfe
  `)
  .eq('empresa_id', usuarioData.empresa_id);
```

### **2. Query para Carregar Itens para Edição:**
```typescript
// Localização: PDVPage.tsx linha 2230-2250
const { data: itensData } = await supabase
  .from('pdv_itens')
  .select(`
    id, produto_id, codigo_produto, nome_produto,
    quantidade, valor_unitario, valor_total_item,
    produto:produtos(
      id, codigo, codigo_barras, nome, unidade_medida_id,
      cfop, cst_icms, csosn, regime_tributario,
      unidade_medida:unidades_medida(sigla)
    )
  `)
  .eq('pdv_id', vendaId)
  .order('created_at', { ascending: true });
```

### **3. Update para Salvar Venda Pendente:**
```typescript
// Localização: PDVPage.tsx linha 9432-9440
const { error } = await supabase
  .from('pdv')
  .update({
    modelo_documento: 65,
    status_fiscal: 'pendente',
    erro_fiscal: erroProcessamento,
    tentativa_nfce: true
  })
  .eq('id', vendaProcessadaId);
```

---

## 🎨 **COMPONENTES DE INTERFACE**

### **1. Tags Visuais - CSS Classes:**
```css
/* Tag Venda Direta */
.tag-venda-direta {
  @apply px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full border border-blue-500/30;
}

/* Tag NFC-e */
.tag-nfce {
  @apply px-2 py-1 bg-purple-500/20 text-purple-400 text-xs font-medium rounded-full border border-purple-500/30;
}

/* Tag Pendente */
.tag-pendente {
  @apply px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full border border-yellow-500/30 animate-pulse;
}

/* Tag Autorizada */
.tag-autorizada {
  @apply px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full border border-green-500/30;
}
```

### **2. Modal de Edição - Estrutura:**
```typescript
// Localização: PDVPage.tsx linha 9640-9884
<AnimatePresence>
  {showEditarNfceModal && vendaParaEditarNfce && (
    <motion.div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div className="bg-background-card rounded-lg border border-gray-800 w-full max-w-6xl mx-4 max-h-[90vh] flex flex-col">
        
        {/* Cabeçalho com Erro */}
        <div className="flex-shrink-0 p-6 border-b border-gray-800">
          <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm font-medium">Erro Fiscal:</p>
            <p className="text-red-300 text-sm mt-1">{vendaParaEditarNfce.erro_fiscal}</p>
          </div>
        </div>

        {/* Tabela de Itens */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th>Item</th><th>Código</th><th>Cód. Barras</th>
                <th>Nome</th><th>Unidade</th><th>Preço</th>
                <th>CFOP</th><th>CST/CSOSN</th>
              </tr>
            </thead>
            <tbody>
              {/* Renderização dos itens editáveis */}
            </tbody>
          </table>
        </div>

        {/* Footer com Botões */}
        <div className="flex-shrink-0 p-6 border-t border-gray-800">
          <button onClick={reprocessarNfce}>Reprocessar Envio</button>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

---

## 🔄 **FLUXO DE REPROCESSAMENTO DETALHADO**

### **1. Preparação dos Dados:**
```typescript
// Localização: PDVPage.tsx linha 2320-2340
const itensAtualizados = itensNfceEdicao.map(item => ({
  codigo: item.produto?.codigo || item.codigo_produto,
  descricao: item.nome_produto,
  quantidade: item.quantidade,
  valor_unitario: item.valor_unitario,
  unidade: item.produto?.unidade_medida?.sigla || 'UN',
  cfop: item.cfop_editavel,
  cst_icms: item.regime_tributario === 1 ? item.cst_editavel : undefined,
  csosn: item.regime_tributario === 1 ? undefined : item.csosn_editavel,
  codigo_barras: item.produto?.codigo_barras
}));
```

### **2. Função Auxiliar - Código UF:**
```typescript
// Localização: PDVPage.tsx linha 2450-2463
const getCodigoUF = (estado: string): number => {
  const codigosUF: { [key: string]: number } = {
    'AC': 12, 'AL': 17, 'AP': 16, 'AM': 13, 'BA': 29, 'CE': 23, 'DF': 53,
    'ES': 32, 'GO': 52, 'MA': 21, 'MT': 51, 'MS': 50, 'MG': 31, 'PA': 15,
    'PB': 25, 'PR': 41, 'PE': 26, 'PI': 22, 'RJ': 33, 'RN': 24, 'RS': 43,
    'RO': 11, 'RR': 14, 'SC': 42, 'SP': 35, 'SE': 28, 'TO': 27
  };
  return codigosUF[estado] || 35; // Default SP
};
```

### **3. Montagem do Payload Completo:**
```typescript
// Localização: PDVPage.tsx linha 2360-2395
const nfceData = {
  empresa: {
    razao_social: empresaData.razao_social,
    cnpj: empresaData.documento,
    nome_fantasia: empresaData.nome_fantasia,
    inscricao_estadual: empresaData.inscricao_estadual,
    regime_tributario: empresaData.regime_tributario || 1,
    uf: empresaData.estado,
    codigo_municipio: parseInt(empresaData.codigo_municipio) || 3524402,
    codigo_uf: getCodigoUF(empresaData.estado),
    endereco: {
      logradouro: empresaData.endereco,
      numero: empresaData.numero,
      bairro: empresaData.bairro,
      cidade: empresaData.cidade,
      cep: empresaData.cep
    },
    csc_homologacao: empresaData.csc_homologacao,
    csc_id_homologacao: empresaData.csc_id_homologacao,
    csc_producao: empresaData.csc_producao,
    csc_id_producao: empresaData.csc_id_producao
  },
  ambiente: nfeConfigData.ambiente,
  identificacao: {
    numero: vendaParaEditarNfce.numero_documento || await gerarProximoNumeroNFCe(usuarioData.empresa_id),
    serie: 1,
    codigo_numerico: Math.floor(Math.random() * 99999999).toString().padStart(8, '0'),
    natureza_operacao: 'Venda de mercadoria'
  },
  destinatario: vendaParaEditarNfce.nome_cliente ? {
    documento: vendaParaEditarNfce.documento_cliente,
    nome: vendaParaEditarNfce.nome_cliente
  } : {},
  produtos: itensAtualizados
};
```

---

## 🔧 **FUNÇÕES DE EDIÇÃO DE CAMPOS**

### **1. Habilitar Edição:**
```typescript
// Localização: PDVPage.tsx linha 2279-2285
const habilitarEdicaoCampo = (itemIndex: number, campo: 'cfop' | 'cst' | 'csosn') => {
  setItensNfceEdicao(prev => prev.map((item, index) => 
    index === itemIndex 
      ? { ...item, [`editando_${campo}`]: true }
      : item
  ));
};
```

### **2. Salvar Edição:**
```typescript
// Localização: PDVPage.tsx linha 2287-2295
const salvarEdicaoCampo = (itemIndex: number, campo: 'cfop' | 'cst' | 'csosn', novoValor: string) => {
  setItensNfceEdicao(prev => prev.map((item, index) => 
    index === itemIndex 
      ? { 
          ...item, 
          [`${campo}_editavel`]: novoValor,
          [`editando_${campo}`]: false 
        }
      : item
  ));
};
```

### **3. Cancelar Edição:**
```typescript
// Localização: PDVPage.tsx linha 2297-2303
const cancelarEdicaoCampo = (itemIndex: number, campo: 'cfop' | 'cst' | 'csosn') => {
  setItensNfceEdicao(prev => prev.map((item, index) => 
    index === itemIndex 
      ? { ...item, [`editando_${campo}`]: false }
      : item
  ));
};
```

---

## 📡 **COMUNICAÇÃO COM BACKEND**

### **1. Endpoint de Reprocessamento:**
```typescript
// Localização: PDVPage.tsx linha 2400-2415
const response = await fetch('/backend/public/emitir-nfce.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    empresa_id: usuarioData.empresa_id,
    nfce_data: nfceData
  })
});
```

### **2. Tratamento de Resposta:**
```typescript
// Localização: PDVPage.tsx linha 2415-2430
if (!response.ok) {
  const errorResponse = await response.text();
  try {
    const errorJson = JSON.parse(errorResponse);
    throw new Error(errorJson.error || 'Erro no reprocessamento');
  } catch {
    throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
  }
}

const result = await response.json();
if (!result.success) {
  throw new Error(result.error || 'Erro no reprocessamento');
}
```

### **3. Update de Sucesso:**
```typescript
// Localização: PDVPage.tsx linha 2432-2445
const { error: updateError } = await supabase
  .from('pdv')
  .update({
    modelo_documento: 65,
    numero_documento: result.data.numero,
    serie_documento: result.data.serie,
    chave_nfe: result.data.chave,
    protocolo_nfe: result.data.protocolo,
    xml_path: result.data.xml_path,
    pdf_path: result.data.pdf_path,
    status_fiscal: 'autorizada',
    erro_fiscal: null,
    data_autorizacao: result.data.data_autorizacao
  })
  .eq('id', vendaParaEditarNfce.id);
```

---

## 🎯 **PONTOS CRÍTICOS PARA MANUTENÇÃO**

### **1. Validação de Regime Tributário:**
```typescript
// CST para Lucro Real/Presumido (regime_tributario = 1)
// CSOSN para Simples Nacional (regime_tributario != 1)
{item.regime_tributario === 1 ? (
  // Mostrar campo CST
) : (
  // Mostrar campo CSOSN
)}
```

### **2. Sincronização de Estados:**
```typescript
// Sempre manter sincronizados:
// - itensNfceEdicao (dados editáveis)
// - vendaParaEditarNfce (dados da venda)
// - reprocessandoNfce (estado de loading)
```

### **3. Limpeza de Estados:**
```typescript
// Ao fechar modal:
setShowEditarNfceModal(false);
setVendaParaEditarNfce(null);
setItensNfceEdicao([]);
setReprocessandoNfce(false);
```

---

**🔧 DOCUMENTAÇÃO TÉCNICA COMPLETA**

**Status:** ✅ Implementação funcional e testada
**Última Atualização:** 13/06/2025
