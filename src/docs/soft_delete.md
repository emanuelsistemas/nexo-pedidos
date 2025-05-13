# Implementação de Soft Delete

Este documento descreve como implementar a funcionalidade de "soft delete" (exclusão lógica) no sistema, utilizando o campo `deletado` adicionado às tabelas.

## Conceito

Em vez de excluir permanentemente registros do banco de dados, marcamos eles como "deletados" alterando o campo `deletado` para `TRUE`. Isso permite:

1. Manter histórico completo para relatórios
2. Possibilidade de restaurar itens excluídos
3. Manter a integridade referencial do banco de dados

## Tabelas com Soft Delete

As seguintes tabelas agora suportam soft delete:

- `produtos`
- `grupos`
- `opcoes_adicionais`
- `opcoes_adicionais_itens`
- `pedidos`
- `pedidos_itens`
- `pedidos_itens_adicionais`
- `produtos_opcoes_adicionais`
- `produtos_opcoes_adicionais_itens`

## Implementação no Frontend

### 1. Modificar funções de exclusão

Todas as funções que atualmente excluem registros devem ser modificadas para fazer um UPDATE em vez de DELETE:

```typescript
// Antes
const handleDelete = async (id: string) => {
  const { error } = await supabase
    .from('tabela')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  // ...
};

// Depois
const handleDelete = async (id: string) => {
  const { error } = await supabase
    .from('tabela')
    .update({ deletado: true })
    .eq('id', id);
  
  if (error) throw error;
  // ...
};
```

### 2. Modificar consultas para filtrar itens deletados

Todas as consultas que buscam dados devem ser modificadas para excluir itens marcados como deletados:

```typescript
// Antes
const { data, error } = await supabase
  .from('tabela')
  .select('*');

// Depois
const { data, error } = await supabase
  .from('tabela')
  .select('*')
  .eq('deletado', false);
```

### 3. Implementar funcionalidade de restauração (opcional)

Para permitir a restauração de itens excluídos, implemente uma função de restauração:

```typescript
const handleRestore = async (id: string) => {
  const { error } = await supabase
    .from('tabela')
    .update({ deletado: false })
    .eq('id', id);
  
  if (error) throw error;
  // ...
};
```

## Exemplo de Implementação em ProdutosPage

### Modificar handleDeleteProduto

```typescript
const handleDeleteProduto = async (produtoId: string, grupoId: string) => {
  // Verificações existentes...
  
  setDeleteConfirmation({
    isOpen: true,
    type: 'produto',
    id: produtoId,
    grupoId,
    title: 'Excluir Produto',
    message: 'Tem certeza que deseja excluir este produto? Você poderá restaurá-lo posteriormente se necessário.',
  });
};
```

### Modificar handleConfirmDelete

```typescript
const handleConfirmDelete = async () => {
  try {
    if (deleteConfirmation.type === 'grupo') {
      const { error } = await supabase
        .from('grupos')
        .update({ deletado: true })
        .eq('id', deleteConfirmation.id);

      if (error) throw error;
      
      // Atualizar estado local para remover o grupo da UI
      setGrupos(grupos.filter(g => g.id !== deleteConfirmation.id));
      showMessage('success', 'Grupo excluído com sucesso!');
    } else {
      const { error } = await supabase
        .from('produtos')
        .update({ deletado: true })
        .eq('id', deleteConfirmation.id);

      if (error) throw error;
      
      // Atualizar estado local para remover o produto da UI
      setGrupos(grupos.map(grupo =>
        grupo.id === deleteConfirmation.grupoId
          ? { ...grupo, produtos: grupo.produtos.filter(p => p.id !== deleteConfirmation.id) }
          : grupo
      ));
      showMessage('success', 'Produto excluído com sucesso!');
    }
  } catch (error: any) {
    showMessage('error', `Erro ao excluir ${deleteConfirmation.type}: ` + error.message);
  } finally {
    setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
  }
};
```

### Modificar loadGrupos

```typescript
const loadGrupos = async () => {
  try {
    // Código existente...

    const { data: gruposData, error: gruposError } = await supabase
      .from('grupos')
      .select('*')
      .eq('empresa_id', usuarioData.empresa_id)
      .eq('deletado', false);

    if (gruposError) throw gruposError;

    const { data: produtosData, error: produtosError } = await supabase
      .from('produtos')
      .select('*')
      .eq('deletado', false);

    // Resto do código existente...
  } catch (error: any) {
    showMessage('error', 'Erro ao carregar grupos: ' + error.message);
  }
};
```

## Considerações para Relatórios

Para relatórios que precisam incluir itens excluídos, crie consultas específicas que não filtram pelo campo `deletado` ou que permitem escolher se itens excluídos devem ser incluídos:

```typescript
const loadReportData = async (includeDeleted = false) => {
  let query = supabase
    .from('tabela')
    .select('*');
    
  if (!includeDeleted) {
    query = query.eq('deletado', false);
  }
  
  const { data, error } = await query;
  // ...
};
```

## Próximos Passos

1. Atualizar todas as funções de exclusão no frontend
2. Atualizar todas as consultas para filtrar itens deletados
3. Considerar a implementação de uma interface para visualizar e restaurar itens excluídos
4. Atualizar a documentação da API para refletir esta mudança
