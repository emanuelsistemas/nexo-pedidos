# 🚀 GUIA RÁPIDO - IMPLEMENTAR IMPRESSÃO DE PRODUÇÃO EM OUTRAS TELAS

## 📋 **OBJETIVO**

Este guia mostra como implementar a impressão de cupons de produção em **outras telas** do sistema, seguindo o mesmo padrão usado no PDV.

---

## 🔧 **PASSO A PASSO PARA IMPLEMENTAÇÃO**

### **1. Verificar se os Produtos Carregam o Campo `producao`**

**Localizar a consulta de produtos na tela:**
```typescript
// Procurar por algo como:
const { data, error } = await supabase
  .from('produtos')
  .select(`
    id,
    nome,
    // ... outros campos
  `)
```

**Adicionar o campo `producao`:**
```typescript
const { data, error } = await supabase
  .from('produtos')
  .select(`
    id,
    nome,
    // ... outros campos
    producao,  // ← ADICIONAR ESTE CAMPO
    // ... resto dos campos
  `)
```

### **2. Importar as Funções de Impressão**

**No topo do arquivo, verificar se já existe:**
```typescript
// Se não existir, adicionar:
import { imprimirCuponsProducaoPorGrupo } from './caminho/para/funcoes';
```

**Nota:** No PDVPage.tsx as funções já estão definidas no mesmo arquivo.

### **3. Implementar a Verificação e Impressão**

**Localizar a função de salvamento/finalização:**
```typescript
const salvarOuFinalizar = async () => {
  // ... código existente de salvamento

  // ✅ ADICIONAR: Verificação de itens de produção
  try {
    // Verificar se há itens com produção = true
    const itensComProducao = itens.filter(item => {
      if (item.vendaSemProduto) return false;
      const produto = produtos.find(p => p.id === (item.produto_id || item.produto?.id));
      return produto?.producao === true;
    });

    if (itensComProducao.length > 0) {
      console.log('🖨️ Encontrados', itensComProducao.length, 'itens de produção');
      
      // Preparar dados do pedido para impressão
      const pedidoParaImpressao = {
        numero_pedido: numeroPedido, // Adaptar conforme a tela
        nome_cliente: cliente?.nome || 'Cliente não informado',
        telefone_cliente: cliente?.telefone || '',
        created_at: new Date().toISOString()
      };

      // Usar configuração de impressão (adaptar conforme disponível)
      const usarImpressao50mm = config?.tipo_impressao_50mm || false;

      // Imprimir cupons de produção
      await imprimirCuponsProducaoPorGrupo(pedidoParaImpressao, itensComProducao, usarImpressao50mm);
      
      console.log('🖨️ ✅ Cupons de produção enviados para impressão');
    } else {
      console.log('🖨️ Nenhum item de produção encontrado');
    }
  } catch (errorImpressao) {
    console.error('❌ Erro ao imprimir cupons de produção:', errorImpressao);
    // Não interromper o fluxo principal por erro de impressão
  }

  // ... resto do código existente
};
```

---

## 📁 **EXEMPLOS DE IMPLEMENTAÇÃO POR TELA**

### **1. Página de Edição de Pedidos (`EditarPedidoPage.tsx`)**

**Localização:** Função `handleFaturarPedido()` - linha ~729

```typescript
const handleFaturarPedido = async () => {
  // ... código existente

  // ✅ ADICIONAR ANTES DE FINALIZAR:
  try {
    const itensComProducao = itensPedido.filter(item => {
      const produto = produtos.find(p => p.id === item.produto_id);
      return produto?.producao === true;
    });

    if (itensComProducao.length > 0) {
      const pedidoParaImpressao = {
        numero_pedido: pedido.numero_pedido,
        nome_cliente: pedido.nome_cliente,
        telefone_cliente: pedido.telefone_cliente,
        created_at: pedido.created_at
      };

      await imprimirCuponsProducaoPorGrupo(pedidoParaImpressao, itensComProducao, false);
    }
  } catch (error) {
    console.error('Erro na impressão de produção:', error);
  }

  // ... resto da função
};
```

### **2. Página de Novo Pedido (`UserNovoPedidoPage.tsx`)**

**Localização:** Função de submit do formulário - linha ~1896

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  // ... código existente de salvamento

  // ✅ ADICIONAR APÓS SALVAR PEDIDO:
  if (pedidoSalvo) {
    try {
      const itensComProducao = itensPedido.filter(item => {
        const produto = produtos.find(p => p.id === item.produto_id);
        return produto?.producao === true;
      });

      if (itensComProducao.length > 0) {
        const pedidoParaImpressao = {
          numero_pedido: pedidoSalvo.numero_pedido,
          nome_cliente: pedidoSalvo.nome_cliente,
          telefone_cliente: pedidoSalvo.telefone_cliente,
          created_at: pedidoSalvo.created_at
        };

        await imprimirCuponsProducaoPorGrupo(pedidoParaImpressao, itensComProducao, false);
      }
    } catch (error) {
      console.error('Erro na impressão de produção:', error);
    }
  }
};
```

### **3. Página de Faturamento (`FaturamentoPage.tsx`)**

**Localização:** Função `handleFaturar()` - linha ~642

```typescript
const handleFaturar = async (pedido: any) => {
  // ... código existente

  // ✅ ADICIONAR APÓS FATURAMENTO:
  try {
    // Buscar itens do pedido
    const { data: itens } = await supabase
      .from('pedido_itens')
      .select('*, produto:produtos(producao)')
      .eq('pedido_id', pedido.id);

    const itensComProducao = itens?.filter(item => 
      item.produto?.producao === true
    ) || [];

    if (itensComProducao.length > 0) {
      const pedidoParaImpressao = {
        numero_pedido: pedido.numero_pedido,
        nome_cliente: pedido.nome_cliente,
        telefone_cliente: pedido.telefone_cliente,
        created_at: pedido.created_at
      };

      await imprimirCuponsProducaoPorGrupo(pedidoParaImpressao, itensComProducao, false);
    }
  } catch (error) {
    console.error('Erro na impressão de produção:', error);
  }
};
```

---

## 🔍 **CHECKLIST DE IMPLEMENTAÇÃO**

### **Antes de Implementar:**
- [ ] Verificar se a tela carrega produtos
- [ ] Verificar se produtos têm campo `producao`
- [ ] Identificar função de salvamento/finalização
- [ ] Verificar estrutura dos dados (item.produto_id vs item.produto.id)

### **Durante a Implementação:**
- [ ] Adicionar campo `producao` na consulta de produtos
- [ ] Importar funções de impressão (se necessário)
- [ ] Adicionar verificação de itens de produção
- [ ] Preparar dados do pedido corretamente
- [ ] Configurar tipo de impressão (50mm/80mm)
- [ ] Adicionar tratamento de erro

### **Após a Implementação:**
- [ ] Testar com produto que tem `producao = true`
- [ ] Verificar logs no console
- [ ] Testar com múltiplos grupos
- [ ] Verificar se não quebra fluxo existente

---

## 🚨 **CUIDADOS IMPORTANTES**

### **1. Não Interromper Fluxo Principal:**
```typescript
try {
  // Impressão de produção
} catch (error) {
  console.error('Erro na impressão:', error);
  // NÃO fazer throw error aqui
  // Deixar o fluxo principal continuar
}
```

### **2. Verificar Estrutura dos Dados:**
```typescript
// Sempre usar compatibilidade:
const produtoId = item.produto_id || item.produto?.id;
const produto = produtos.find(p => p.id === produtoId);
```

### **3. Logs para Debug:**
```typescript
console.log('🖨️ Verificando itens de produção...');
console.log('🖨️ Itens encontrados:', itensComProducao.length);
```

### **4. Configuração de Impressão:**
```typescript
// Verificar se existe configuração específica da tela
const usarImpressao50mm = config?.tipo_impressao_50mm || false;
```

---

## 📚 **REFERÊNCIAS**

### **Arquivos de Referência:**
- **PDVPage.tsx** - Implementação completa (linha ~9386)
- **CUPONS_PRODUCAO.md** - Documentação das funções
- **EXEMPLOS_MODIFICACAO.md** - Como modificar tamanhos

### **Funções Principais:**
- **`imprimirCuponsProducaoPorGrupo()`** - Coordena impressão
- **`imprimirCupomProducaoGrupo()`** - Imprime grupo específico

### **Logs Importantes:**
- `🖨️ [NOME-TELA]` - Logs da tela específica
- `🏭 [PRODUCAO-PRINT]` - Logs das funções de impressão
- `🖨️ [GRUPO-PRINT]` - Logs de grupos específicos

---

**📅 Criado em:** Janeiro 2025  
**🎯 Objetivo:** Facilitar implementação em outras telas do sistema
