# Exemplos Práticos - Sistema de Organização de Grupos

## 🎯 Cenários de Uso

### Cenário 1: Lanchonete com Grupos Fixos

**Configuração Inicial:**
```
[0] LANCHES (FIXO - Pos. 1)    | [1] CERVEJAS
[2] AÇAÍ                       | [3] CONSTRUÇÃO (vazio)
```

**Comportamento das Setas:**

#### LANCHES (Posição 0 - Fixo):
- ❌ **Nenhuma seta** (grupos fixos são imóveis)
- 🔒 **Indicador visual**: "Fixo - Pos. 1"

#### CERVEJAS (Posição 1 - Coluna Direita):
- ❌ **Para cima**: Não existe linha acima
- ✅ **Para baixo**: Pode ir para posição 3 (CONSTRUÇÃO vazio)
- ❌ **Para esquerda**: LANCHES está fixo
- ❌ **Para direita**: Já está na coluna direita

#### AÇAÍ (Posição 2 - Coluna Esquerda):
- ❌ **Para cima**: LANCHES está fixo na posição 0
- ❌ **Para baixo**: Não existe linha abaixo
- ❌ **Para esquerda**: Já está na coluna esquerda
- ✅ **Para direita**: Pode ir para posição 3 (CONSTRUÇÃO vazio)

### Cenário 2: Após Reorganização

**Estado após mover CERVEJAS para baixo:**
```
[0] LANCHES (FIXO - Pos. 1)    | [1] (vazio)
[2] AÇAÍ                       | [3] CERVEJAS
```

**Novas possibilidades:**

#### AÇAÍ (Posição 2):
- ❌ **Para cima**: LANCHES fixo
- ❌ **Para baixo**: Não existe
- ❌ **Para esquerda**: Já na esquerda
- ✅ **Para direita**: Pode trocar com CERVEJAS

#### CERVEJAS (Posição 3):
- ✅ **Para cima**: Pode ir para posição 1 (vazia)
- ❌ **Para baixo**: Não existe
- ✅ **Para esquerda**: Pode trocar com AÇAÍ
- ❌ **Para direita**: Já na direita

## 🔧 Implementação por Etapas

### Etapa 1: Estados Básicos
```typescript
// Em ProdutosPage.tsx
const [isOrganizing, setIsOrganizing] = useState(false);
const [gruposOrder, setGruposOrder] = useState<string[]>([]);
const GRUPOS_ORDER_KEY = `grupos_order_${empresaId}`;
```

### Etapa 2: Função de Verificação
```typescript
const isGrupoFixo = (gId: string) => {
  const g = grupos.find(gr => gr.id === gId);
  return g && 
         (g as any).ordenacao_cardapio_habilitada === true && 
         (g as any).ordenacao_cardapio_digital !== null && 
         (g as any).ordenacao_cardapio_digital !== undefined &&
         (g as any).ordenacao_cardapio_digital !== '';
};
```

### Etapa 3: Lógica de Movimento
```typescript
const canMove = (grupoId: string, direction: 'up' | 'down' | 'left' | 'right') => {
  // Verificar se o grupo atual é fixo
  const grupo = grupos.find(g => g.id === grupoId);
  const temPosicionamentoFixo = isGrupoFixo(grupoId);
  
  if (temPosicionamentoFixo) return false;
  
  // Obter ordem atual
  const currentOrder = gruposOrder.length > 0 && gruposOrder.join(',') !== grupos.map(g => g.id).join(',')
    ? gruposOrder
    : filteredAndSortedGrupos.map(g => g.id);
    
  const currentIndex = currentOrder.indexOf(grupoId);
  if (currentIndex === -1) return false;
  
  // Calcular posição na grid
  const isLeftColumn = currentIndex % 2 === 0;
  const isRightColumn = currentIndex % 2 === 1;
  const currentRow = Math.floor(currentIndex / 2);
  
  // Verificar por direção
  switch (direction) {
    case 'up':
      if (currentRow === 0) return false;
      const upTarget = currentIndex - 2;
      return !isGrupoFixo(currentOrder[upTarget]);
      
    case 'down':
      const downTarget = currentIndex + 2;
      if (downTarget >= currentOrder.length) return false;
      return !isGrupoFixo(currentOrder[downTarget]);
      
    case 'left':
      if (!isRightColumn) return false;
      const leftTarget = currentIndex - 1;
      return !isGrupoFixo(currentOrder[leftTarget]);
      
    case 'right':
      if (!isLeftColumn) return false;
      const rightTarget = currentIndex + 1;
      if (rightTarget >= currentOrder.length) return false;
      return !isGrupoFixo(currentOrder[rightTarget]);
      
    default:
      return false;
  }
};
```

### Etapa 4: Função de Movimento
```typescript
const moveGrupo = (grupoId: string, direction: 'up' | 'down' | 'left' | 'right') => {
  console.log(`🔄 Tentando mover grupo ${grupoId} para ${direction}`);
  
  if (!canMove(grupoId, direction)) {
    console.log('❌ Movimento bloqueado');
    toast.error('Não é possível mover para uma posição ocupada por grupo fixo');
    return;
  }

  const currentOrder = gruposOrder.length > 0 && gruposOrder.join(',') !== grupos.map(g => g.id).join(',')
    ? gruposOrder
    : filteredAndSortedGrupos.map(g => g.id);

  const currentIndex = currentOrder.indexOf(grupoId);
  let targetIndex = currentIndex;

  switch (direction) {
    case 'up':
      targetIndex = currentIndex - 2;
      break;
    case 'down':
      targetIndex = currentIndex + 2;
      break;
    case 'left':
      targetIndex = currentIndex - 1;
      break;
    case 'right':
      targetIndex = currentIndex + 1;
      break;
  }

  console.log(`📍 Movendo de ${currentIndex} para ${targetIndex}`);

  if (targetIndex === currentIndex) {
    console.log('❌ Movimento inválido - mesmo índice');
    return;
  }

  const newOrder = [...currentOrder];
  [newOrder[currentIndex], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[currentIndex]];
  
  setGruposOrder(newOrder);
  localStorage.setItem(GRUPOS_ORDER_KEY, JSON.stringify(newOrder));
  
  console.log('✅ Movimento realizado com sucesso');
  toast.success('Organização salva com sucesso!');
};
```

### Etapa 5: Interface das Setas
```typescript
{isOrganizing && !temPosicionamentoFixo && (
  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
    <div className="grid grid-cols-3 gap-1">
      {/* Seta para cima */}
      {canMove(grupo.id, 'up') && (
        <button
          onClick={() => moveGrupo(grupo.id, 'up')}
          className="col-start-2 p-1 bg-white/20 rounded hover:bg-white/30 transition-colors"
        >
          <ChevronUp className="w-6 h-6 text-white" />
        </button>
      )}
      
      {/* Linha do meio com setas laterais */}
      <div className="col-start-1 col-end-4 flex justify-between items-center">
        {canMove(grupo.id, 'left') && (
          <button
            onClick={() => moveGrupo(grupo.id, 'left')}
            className="p-1 bg-white/20 rounded hover:bg-white/30 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        )}
        
        {canMove(grupo.id, 'right') && (
          <button
            onClick={() => moveGrupo(grupo.id, 'right')}
            className="p-1 bg-white/20 rounded hover:bg-white/30 transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        )}
      </div>
      
      {/* Seta para baixo */}
      {canMove(grupo.id, 'down') && (
        <button
          onClick={() => moveGrupo(grupo.id, 'down')}
          className="col-start-2 p-1 bg-white/20 rounded hover:bg-white/30 transition-colors"
        >
          <ChevronDown className="w-6 h-6 text-white" />
        </button>
      )}
    </div>
  </div>
)}
```

## 🐛 Troubleshooting

### Problema 1: Setas aparecem quando não deveriam
**Causa**: Lógica de `canMove` não está verificando corretamente as condições
**Solução**: Verificar se:
- Grupo atual não é fixo
- Posição de destino existe
- Posição de destino não tem grupo fixo

### Problema 2: localStorage não persiste
**Causa**: Chave incorreta ou erro no JSON
**Solução**: 
```typescript
// Verificar se a chave está correta
const GRUPOS_ORDER_KEY = `grupos_order_${empresaId}`;

// Adicionar try/catch
try {
  localStorage.setItem(GRUPOS_ORDER_KEY, JSON.stringify(newOrder));
} catch (error) {
  console.error('Erro ao salvar ordem:', error);
}
```

### Problema 3: Grupos fixos se movem
**Causa**: Verificação de grupo fixo falha
**Solução**: Verificar se os campos do banco estão corretos:
```typescript
const temPosicionamentoFixo = grupo &&
  (grupo as any).ordenacao_cardapio_habilitada === true &&
  (grupo as any).ordenacao_cardapio_digital !== null &&
  (grupo as any).ordenacao_cardapio_digital !== undefined &&
  (grupo as any).ordenacao_cardapio_digital !== '';
```

### Problema 4: Grid quebra com números ímpares
**Causa**: Layout de 2 colunas não considera grupos ímpares
**Solução**: CSS Grid handle automaticamente:
```css
.grid-cols-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
```

## 📊 Logs de Debug

### Console Logs Úteis
```typescript
console.log('🔍 Estado atual:', {
  isOrganizing,
  gruposOrder,
  totalGrupos: grupos.length,
  gruposFixos: grupos.filter(g => isGrupoFixo(g.id)).length
});

console.log('📍 Posição do grupo:', {
  grupoId,
  currentIndex,
  isLeftColumn: currentIndex % 2 === 0,
  currentRow: Math.floor(currentIndex / 2)
});
```

### Verificação de Integridade
```typescript
// Verificar se todos os grupos estão na ordem
const allGroupIds = grupos.map(g => g.id);
const missingInOrder = allGroupIds.filter(id => !gruposOrder.includes(id));
const extraInOrder = gruposOrder.filter(id => !allGroupIds.includes(id));

console.log('🔍 Integridade da ordem:', {
  missing: missingInOrder,
  extra: extraInOrder
});
```

## 🎨 Customizações Visuais

### Indicadores de Estado
```typescript
// Grupo fixo
{temPosicionamentoFixo && (
  <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
    Fixo - Pos. {(grupo as any).ordenacao_cardapio_digital}
  </div>
)}

// Modo organização
{isOrganizing && (
  <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
    Organizando
  </div>
)}
```

### Animações
```css
/* Transições suaves */
.transition-all {
  transition: all 0.3s ease;
}

/* Hover effects */
.hover\:bg-white\/30:hover {
  background-color: rgba(255, 255, 255, 0.3);
}
```

## 🚀 Melhorias Futuras

1. **Drag & Drop nativo** com HTML5 API
2. **Animações de movimento** entre posições
3. **Undo/Redo** para movimentos
4. **Backup automático** da configuração
5. **Interface mobile** otimizada
