# 🛠️ Implementação: Salvamento de Adicionais no PDV

## 📋 Problema Identificado

Quando uma venda é salva no PDV, os **adicionais selecionados** não estão sendo salvos na tabela `pdv_itens_adicionais`. Isso causa:

- ❌ Perda dos adicionais quando a venda é recuperada
- ❌ Relatórios incompletos
- ❌ Dados fiscais incorretos

## 🎯 Solução Implementada

### 1. **Utilitários Criados**

**Arquivo:** `src/utils/pdvAdicionaisUtils.ts`

Funções disponíveis:
- ✅ `salvarAdicionaisItem()` - Salva adicionais de um item
- ✅ `buscarAdicionaisItem()` - Busca adicionais de um item
- ✅ `removerAdicionaisItem()` - Remove adicionais (soft delete)
- ✅ `atualizarAdicionaisItem()` - Atualiza adicionais de um item

### 2. **Interface Atualizada**

**Arquivo:** `src/types.ts`

```typescript
export interface ItemSelecionado {
  item: OpcaoAdicionalItem;
  quantidade: number;
}
```

## 🔧 Como Implementar no PDV

### **Passo 1: Atualizar Interface ItemCarrinho**

No arquivo `src/pages/dashboard/PDVPage.tsx`, adicionar campo `adicionais`:

```typescript
interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
  subtotal: number;
  adicionais?: ItemSelecionado[]; // ✅ ADICIONAR ESTE CAMPO
  // ... outros campos
}
```

### **Passo 2: Modificar Função de Adicionar ao Carrinho**

Quando um produto é adicionado com adicionais:

```typescript
const adicionarProdutoComAdicionais = (
  produto: Produto,
  quantidade: number,
  adicionaisSelecionados: ItemSelecionado[]
) => {
  const novoItem: ItemCarrinho = {
    produto,
    quantidade,
    subtotal: produto.preco * quantidade,
    adicionais: adicionaisSelecionados // ✅ Salvar adicionais
  };

  setItensCarrinho(prev => [...prev, novoItem]);
};
```

### **Passo 3: Atualizar Função de Salvar Venda**

Na função que salva a venda (ex: `handleSalvarVenda`):

```typescript
import { salvarAdicionaisItem } from '../utils/pdvAdicionaisUtils';

const salvarVenda = async () => {
  // ... código existente para salvar venda e itens ...

  // Para cada item salvo:
  for (const item of itensCarrinho) {
    // 1. Salvar item principal
    const { data: itemSalvo } = await supabase
      .from('pdv_itens')
      .insert({
        // ... dados do item
      })
      .select()
      .single();

    // 2. ✅ SALVAR ADICIONAIS DO ITEM
    if (item.adicionais && item.adicionais.length > 0) {
      await salvarAdicionaisItem(
        itemSalvo.id,
        item.adicionais,
        empresaId,
        usuarioId
      );
    }
  }
};
```

### **Passo 4: Atualizar Função de Recuperar Venda**

Para recuperar vendas salvas com adicionais:

```typescript
import { buscarAdicionaisItem } from '../utils/pdvAdicionaisUtils';

const recuperarVendaSalva = async (pdvId: string) => {
  // 1. Buscar itens da venda
  const { data: itens } = await supabase
    .from('pdv_itens')
    .select('*')
    .eq('pdv_id', pdvId);

  // 2. ✅ BUSCAR ADICIONAIS DE CADA ITEM
  const itensComAdicionais = await Promise.all(
    itens.map(async (item) => {
      const adicionais = await buscarAdicionaisItem(item.id);
      return {
        ...item,
        adicionais
      };
    })
  );

  return itensComAdicionais;
};
```

## 📍 Locais Específicos para Implementar

### **No arquivo PDVPage.tsx:**

1. **Função de adicionar produto** (onde o modal de adicionais é confirmado)
2. **Função de salvar venda** (onde os itens são inseridos na `pdv_itens`)
3. **Função de recuperar venda salva** (onde as vendas são carregadas)

### **Exemplo de localização:**

```typescript
// Buscar por estas funções no PDVPage.tsx:
- handleConfirmarAdicionais()
- handleSalvarVenda() ou salvarVenda()
- recuperarVendaSalva() ou loadVendaSalva()
```

## 🔄 Fluxo Completo

### **1. Seleção de Adicionais:**
```
Usuário seleciona produto → Modal de adicionais → Confirma adicionais → Produto + adicionais vão para carrinho
```

### **2. Salvamento:**
```
Salvar venda → Inserir PDV → Inserir pdv_itens → ✅ Inserir pdv_itens_adicionais
```

### **3. Recuperação:**
```
Buscar venda → Buscar pdv_itens → ✅ Buscar pdv_itens_adicionais → Montar carrinho completo
```

## 🧪 Como Testar

### **Teste 1: Salvamento**
1. Adicionar produto com adicionais ao carrinho
2. Salvar a venda
3. Verificar na tabela `pdv_itens_adicionais` se os dados foram salvos

### **Teste 2: Recuperação**
1. Recuperar uma venda salva com adicionais
2. Verificar se os adicionais aparecem no carrinho
3. Confirmar que os valores estão corretos

### **Teste 3: Relatórios**
1. Gerar relatório com adicionais incluídos
2. Verificar se os adicionais aparecem corretamente

## 📊 Estrutura da Tabela

```sql
pdv_itens_adicionais:
- id (UUID)
- empresa_id (UUID) ✅
- usuario_id (UUID) ✅
- pdv_item_id (UUID) ✅ FK para pdv_itens
- item_adicional_id (UUID) ✅ FK para opcoes_adicionais_itens
- nome_adicional (TEXT) ✅ Cache do nome
- quantidade (NUMERIC) ✅
- valor_unitario (NUMERIC) ✅
- valor_total (NUMERIC) ✅
- origem_adicional (TEXT) ✅ 'manual'
```

## ⚠️ Pontos de Atenção

1. **Sempre usar as funções utilitárias** em `pdvAdicionaisUtils.ts`
2. **Verificar se há adicionais** antes de tentar salvar
3. **Tratar erros** adequadamente
4. **Manter consistência** entre salvamento e recuperação
5. **Testar com diferentes cenários** (com e sem adicionais)

## 🎯 Resultado Esperado

Após a implementação:
- ✅ Adicionais são salvos quando a venda é salva
- ✅ Adicionais aparecem quando a venda é recuperada
- ✅ Relatórios incluem dados dos adicionais
- ✅ Valores totais estão corretos
- ✅ Sistema funciona tanto com quanto sem adicionais
