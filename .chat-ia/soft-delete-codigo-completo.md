# 🔧 CÓDIGO COMPLETO - SOFT DELETE PDV

## 📁 **ARQUIVO: src/utils/pdvSoftDeleteUtils.ts**

```typescript
import { supabase } from '../lib/supabase';

export async function softDeleteItemPDV(
  itemId: string,
  usuarioId: string,
  motivo: string = 'Item removido'
): Promise<boolean> {
  try {
    console.log(`🗑️ Iniciando soft delete do item PDV: ${itemId}`);

    // 1. Buscar dados completos do item antes de deletar
    const { data: itemData, error: itemError } = await supabase
      .from('pdv_itens')
      .select(`
        *,
        pdv_itens_adicionais (
          id, adicional_id, nome_adicional, quantidade, valor_unitario, valor_total
        ),
        pdv_itens_insumos (
          id, insumo_produto_id, nome_insumo, quantidade, custo_unitario, custo_total
        )
      `)
      .eq('id', itemId)
      .eq('deletado', false)
      .single();

    if (itemError || !itemData) {
      console.error('❌ Item não encontrado ou já deletado:', itemError);
      return false;
    }

    // 2. Calcular valores totais reais
    const valorProduto = parseFloat(itemData.valor_total || '0');
    const valorAdicionais = (itemData.pdv_itens_adicionais || []).reduce((total, add) => {
      return total + parseFloat(add.valor_total || '0');
    }, 0);
    const valorInsumos = (itemData.pdv_itens_insumos || []).reduce((total, ins) => {
      return total + parseFloat(ins.custo_total || '0');
    }, 0);
    const valorTotalReal = valorProduto + valorAdicionais + valorInsumos;

    console.log(`💰 Valor total capturado: R$ ${valorTotalReal.toFixed(2)}`);
    console.log(`🍕 Adicionais: ${itemData.pdv_itens_adicionais?.length || 0} (R$ ${valorAdicionais.toFixed(2)})`);
    console.log(`🥘 Insumos: ${itemData.pdv_itens_insumos?.length || 0} (R$ ${valorInsumos.toFixed(2)})`);

    // 3. Fazer soft delete do item principal
    const { error: deleteError } = await supabase
      .from('pdv_itens')
      .update({
        deletado: true,
        deletado_em: new Date().toISOString(),
        deletado_por: usuarioId,
        valor_total_real_deletado: valorTotalReal,
        valor_adicionais_deletado: valorAdicionais,
        quantidade_adicionais_deletado: itemData.pdv_itens_adicionais?.length || 0,
        valor_insumos_deletado: valorInsumos,
        quantidade_insumos_deletado: itemData.pdv_itens_insumos?.length || 0,
        snapshot_item_deletado: {
          item_original: itemData,
          motivo_delecao: motivo,
          timestamp_delecao: new Date().toISOString()
        }
      })
      .eq('id', itemId);

    if (deleteError) {
      console.error('❌ Erro ao fazer soft delete:', deleteError);
      return false;
    }

    // 4. Soft delete dos adicionais
    if (itemData.pdv_itens_adicionais?.length > 0) {
      const { error: addError } = await supabase
        .from('pdv_itens_adicionais')
        .update({
          deletado: true,
          deletado_em: new Date().toISOString(),
          deletado_por: usuarioId
        })
        .eq('pdv_item_id', itemId);

      if (addError) {
        console.warn('⚠️ Erro ao deletar adicionais:', addError);
      }
    }

    // 5. Soft delete dos insumos
    if (itemData.pdv_itens_insumos?.length > 0) {
      const { error: insError } = await supabase
        .from('pdv_itens_insumos')
        .update({
          deletado: true,
          deletado_em: new Date().toISOString(),
          deletado_por: usuarioId
        })
        .eq('pdv_item_id', itemId);

      if (insError) {
        console.warn('⚠️ Erro ao deletar insumos:', insError);
      }
    }

    console.log(`✅ Soft delete concluído com sucesso para item: ${itemId}`);
    return true;

  } catch (error) {
    console.error('❌ Erro inesperado no soft delete:', error);
    return false;
  }
}
```

## 📁 **ARQUIVO: src/pages/dashboard/PDVPage.tsx (Trechos Modificados)**

### **Função removerDoCarrinho (linha ~11440)**
```typescript
const removerDoCarrinho = async (itemId: string) => {
  const itemRemovido = carrinho.find(item => item.id === itemId);

  // ✅ NOVO: Se há venda em andamento e item foi salvo no banco, fazer soft delete
  if (vendaEmAndamento && itemRemovido?.pdv_item_id) {
    try {
      console.log(`🗑️ Fazendo soft delete do item: ${itemRemovido.produto.nome}`);
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('Usuário não autenticado');
        return;
      }

      // ✅ NOVO: Garantir que a venda está vinculada ao caixa
      try {
        if (pdvConfig?.controla_caixa) {
          let caixaId: string | null = null;
          const { data: caixaByStatus } = await supabase
            .from('caixa_controle')
            .select('id')
            .eq('usuario_id', userData.user.id)
            .eq('status', 'aberto')
            .order('data_abertura', { ascending: false })
            .limit(1)
            .single();
          caixaId = caixaByStatus?.id || null;
          
          if (caixaId) {
            await supabase
              .from('pdv')
              .update({ caixa_id: caixaId })
              .eq('id', vendaEmAndamento.id);
          }
        }
      } catch (e) {
        console.warn('⚠️ Não foi possível vincular venda ao caixa:', e);
      }

      const { softDeleteItemPDV } = await import('../../utils/pdvSoftDeleteUtils');
      
      const sucesso = await softDeleteItemPDV(
        itemRemovido.pdv_item_id,
        userData.user.id,
        'Removido pelo usuário no PDV'
      );

      if (!sucesso) {
        toast.error('Erro ao remover item do banco. Tente novamente.');
        return;
      }

      console.log(`✅ Soft delete realizado com sucesso para: ${itemRemovido.produto.nome}`);
      
      // ✅ NOVO: Atualizar lista de itens cancelados
      await atualizarItensCanceladosCaixa();
      
    } catch (error) {
      console.error('❌ Erro no soft delete:', error);
      toast.error('Erro ao remover item. Tente novamente.');
      return;
    }
  }

  // Atualizar carrinho removendo o item
  const novoCarrinho = carrinho.filter(item => item.id !== itemId);
  setCarrinho(novoCarrinho);
  
  // ... resto da função
};
```

### **Função atualizarItensCanceladosCaixa (linha ~11345)**
```typescript
const atualizarItensCanceladosCaixa = async () => {
  // Garantir que temos um caixa_id válido
  let caixaId: string | null = null;
  if (dadosCaixa?.id) {
    caixaId = dadosCaixa.id;
  } else {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;
      
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', authData.user.id)
        .single();
      if (!usuarioData?.empresa_id) return;
      
      const { data: caixaAberto } = await supabase
        .from('caixa_controle')
        .select('id')
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('usuario_id', authData.user.id)
        .eq('status', 'aberto')
        .order('data_abertura', { ascending: false })
        .limit(1)
        .single();
      caixaId = caixaAberto?.id || null;
    } catch (e) {
      console.error('❌ Erro ao identificar caixa:', e);
      return;
    }
  }

  if (!caixaId) return;
  
  try {
    console.log(`🔄 Atualizando lista de itens cancelados do caixa: ${caixaId}`);
    
    const { data: itensCanceladosData, error: itensCanceladosError } = await supabase
      .from('pdv_itens')
      .select(`
        id, nome_produto, quantidade, valor_unitario,
        valor_total_real_deletado, valor_adicionais_deletado,
        quantidade_adicionais_deletado, deletado_em,
        snapshot_item_deletado,
        pdv:pdv_id!inner (id, numero_venda, nome_cliente, caixa_id),
        usuarios:deletado_por (nome)
      `)
      .eq('pdv.caixa_id', caixaId)
      .eq('deletado', true)
      .not('valor_total_real_deletado', 'is', null)
      .order('deletado_em', { ascending: false });

    if (itensCanceladosError) {
      console.error('❌ Erro ao buscar itens cancelados:', itensCanceladosError);
    } else {
      const itens = itensCanceladosData || [];
      setItensCanceladosCaixaModal(itens);
      const totalItensCancelados = itens.reduce((total, item) => {
        const v = (typeof item.valor_total_real_deletado === 'number')
          ? item.valor_total_real_deletado
          : parseFloat(item.valor_total_real_deletado || '0');
        return total + (isNaN(v) ? 0 : v);
      }, 0);
      setTotalItensCanceladosCaixa(totalItensCancelados);
      
      console.log('✅ Lista atualizada:', itens.length, 'itens cancelados', { itens });
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar itens cancelados:', error);
  }
};
```

---
**Arquivo criado em:** 2025-08-09  
**Status:** Código completo implementado, problema na busca dos itens
