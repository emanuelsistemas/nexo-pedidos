# Natureza da Operação Padrão - NFe

## 📋 Resumo da Alteração

Definido **"Venda de Mercadoria"** como valor padrão já selecionado no campo "Natureza da Operação" da NFe.

## 🎯 Objetivo

Facilitar o preenchimento da NFe definindo automaticamente a natureza da operação mais comum, evitando que o usuário precise selecionar manualmente a cada nova NFe.

## 🔧 Implementação Realizada

### **Estado Inicial da NFe**
- ✅ Campo `natureza_operacao` alterado de `''` (vazio) para `'Venda de Mercadoria'`
- ✅ Valor aplicado no estado inicial do componente `NfePage`

### **Código Modificado**
```typescript
// Estado inicial da NFe
const [nfeData, setNfeData] = useState({
  identificacao: {
    modelo: 55,
    serie: 1,
    numero: '',
    data_emissao: new Date().toISOString().slice(0, 16),
    tipo_documento: '1',
    finalidade: '1',
    presenca: '9',
    natureza_operacao: 'Venda de Mercadoria', // ← VALOR PADRÃO DEFINIDO
    informacao_adicional: ''
  },
  // ... outros campos
});
```

## 🎨 Comportamento da Interface

### **Antes da Alteração:**
- Campo "Natureza da Operação" aparecia com "Selecione a natureza da operação"
- Usuário precisava clicar e selecionar manualmente

### **Após a Alteração:**
- Campo "Natureza da Operação" já aparece com **"Venda de Mercadoria"** selecionado
- Usuário pode manter o valor padrão ou alterar se necessário
- Campo permanece editável para outras opções

## 🔄 Fluxo de Funcionamento

1. **Usuário acessa NFe** → Aba "Identificação"
2. **Campo "Natureza da Operação"** → Já vem preenchido com "Venda de Mercadoria"
3. **Usuário pode:**
   - ✅ Manter o valor padrão (mais comum)
   - ✅ Alterar para outra natureza se necessário
4. **Continua preenchimento** → Outros campos da NFe

## 📊 Benefícios

1. **Agilidade**: Reduz cliques e tempo de preenchimento
2. **Praticidade**: Valor mais comum já selecionado
3. **Flexibilidade**: Ainda permite alteração quando necessário
4. **Consistência**: Padroniza o processo de criação de NFe
5. **Experiência**: Melhora UX do usuário

## 🎯 Casos de Uso

### **Cenário Comum (90% dos casos):**
- Empresa vende produtos/mercadorias
- Natureza: "Venda de Mercadoria" ✅ (já selecionado)
- Usuário não precisa alterar nada

### **Cenários Específicos:**
- Devolução de mercadoria → Usuário altera para "Devolução"
- Transferência → Usuário altera para "Transferência"
- Outros → Usuário seleciona conforme necessário

## 📝 Exemplo Prático

### **Nova NFe:**
1. **Acessa NFe** → Aba "Identificação"
2. **Campo já preenchido:**
   ```
   Natureza da Operação: [Venda de Mercadoria] ▼
   ```
3. **Continua preenchimento** → Destinatário, Produtos, etc.
4. **Emite NFe** → Natureza já definida corretamente

## ✅ Status

**IMPLEMENTADO E FUNCIONANDO** ✅

O campo "Natureza da Operação" agora vem com **"Venda de Mercadoria"** já selecionado por padrão em todas as novas NFe, agilizando o processo de preenchimento.

## 🔧 Arquivo Modificado

- `src/pages/dashboard/NfePage.tsx` - Estado inicial da NFe

## 📋 Observações

- Valor padrão aplicado apenas para **novas NFe**
- **Rascunhos salvos** mantêm seus valores originais
- Campo permanece **totalmente editável**
- Não afeta NFe já emitidas ou em andamento
