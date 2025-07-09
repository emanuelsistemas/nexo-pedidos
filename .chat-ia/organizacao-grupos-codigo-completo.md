# Código Completo - Sistema de Organização de Grupos

## 📁 Arquivo Principal: `src/pages/dashboard/ProdutosPage.tsx`

### Imports Necessários
```typescript
import { Move, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
```

### Estados e Constantes
```typescript
// Dentro do componente ProdutosPage
const [isOrganizing, setIsOrganizing] = useState(false);
const [gruposOrder, setGruposOrder] = useState<string[]>([]);
const GRUPOS_ORDER_KEY = `grupos_order_${empresaId}`;
```

### useEffect para carregar ordem do localStorage
```typescript
useEffect(() => {
  const savedOrder = localStorage.getItem(GRUPOS_ORDER_KEY);
  if (savedOrder) {
    try {
      const parsedOrder = JSON.parse(savedOrder);
      if (Array.isArray(parsedOrder)) {
        setGruposOrder(parsedOrder);
      }
    } catch (error) {
      console.error('Erro ao carregar ordem dos grupos:', error);
    }
  }
}, [empresaId]);
```

### Função para verificar se grupo é fixo
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

### Função canMove (CÓDIGO PRINCIPAL)
```typescript
const canMove = (grupoId: string, direction: 'up' | 'down' | 'left' | 'right') => {
  // Verificar se o grupo tem posicionamento fixo
  const grupo = grupos.find(g => g.id === grupoId);
  const temPosicionamentoFixo = grupo &&
                               (grupo as any).ordenacao_cardapio_habilitada === true &&
                               (grupo as any).ordenacao_cardapio_digital !== null &&
                               (grupo as any).ordenacao_cardapio_digital !== undefined &&
                               (grupo as any).ordenacao_cardapio_digital !== '';

  // Grupos com posicionamento fixo não podem ser movidos
  if (temPosicionamentoFixo) {
    return false;
  }

  // Usar a ordem atual da grid
  const currentOrder = gruposOrder.length > 0 && gruposOrder.join(',') !== grupos.map(g => g.id).join(',')
    ? gruposOrder
    : filteredAndSortedGrupos.map(g => g.id);

  const currentIndex = currentOrder.indexOf(grupoId);

  if (currentIndex === -1) return false;

  // Grid de 2 colunas: posições pares = coluna esquerda, ímpares = coluna direita
  // Linha = Math.floor(index / 2), Coluna = index % 2
  
  const isLeftColumn = currentIndex % 2 === 0;  // Par = coluna esquerda
  const isRightColumn = currentIndex % 2 === 1; // Ímpar = coluna direita
  const currentRow = Math.floor(currentIndex / 2);
  
  // Verificações específicas por direção
  switch (direction) {
    case 'up':
      // Só pode subir se não está na primeira linha (linha 0)
      if (currentRow === 0) return false;
      const upTargetIndex = currentIndex - 2; // Sobe uma linha (2 posições)
      const upTargetGrupoId = currentOrder[upTargetIndex];
      return !isGrupoFixo(upTargetGrupoId);

    case 'down':
      // Só pode descer se existe uma linha abaixo
      const downTargetIndex = currentIndex + 2; // Desce uma linha (2 posições)
      if (downTargetIndex >= currentOrder.length) return false;
      const downTargetGrupoId = currentOrder[downTargetIndex];
      return !isGrupoFixo(downTargetGrupoId);

    case 'left':
      // Só pode ir para esquerda se está na coluna direita
      if (!isRightColumn) return false;
      const leftTargetIndex = currentIndex - 1;
      const leftTargetGrupoId = currentOrder[leftTargetIndex];
      return !isGrupoFixo(leftTargetGrupoId);

    case 'right':
      // Só pode ir para direita se está na coluna esquerda E existe posição à direita
      if (!isLeftColumn) return false;
      const rightTargetIndex = currentIndex + 1;
      if (rightTargetIndex >= currentOrder.length) return false; // Não existe posição à direita
      const rightTargetGrupoId = currentOrder[rightTargetIndex];
      return !isGrupoFixo(rightTargetGrupoId);

    default:
      return false;
  }
};
```

### Função moveGrupo
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

### Botão de Organização (JSX)
```typescript
<button
  onClick={() => setIsOrganizing(!isOrganizing)}
  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
>
  <Move className="w-4 h-4" />
  {isOrganizing ? 'Finalizar Organização' : 'Organizar Grupos'}
</button>
```

### Interface das Setas (JSX)
```typescript
{/* Overlay de organização com setas direcionais */}
{isOrganizing && !temPosicionamentoFixo && (
  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
    <div className="grid grid-cols-3 gap-1">
      {/* Seta para cima */}
      {canMove(grupo.id, 'up') && (
        <button
          onClick={() => moveGrupo(grupo.id, 'up')}
          className="col-start-2 p-1 bg-white/20 rounded hover:bg-white/30 transition-colors"
          title="Mover para cima"
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
            title="Mover para esquerda"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        )}
        
        {canMove(grupo.id, 'right') && (
          <button
            onClick={() => moveGrupo(grupo.id, 'right')}
            className="p-1 bg-white/20 rounded hover:bg-white/30 transition-colors"
            title="Mover para direita"
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
          title="Mover para baixo"
        >
          <ChevronDown className="w-6 h-6 text-white" />
        </button>
      )}
    </div>
  </div>
)}
```

### Indicadores Visuais (JSX)
```typescript
{/* Indicador de grupo fixo */}
{temPosicionamentoFixo && (
  <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
    Fixo - Pos. {(grupo as any).ordenacao_cardapio_digital}
  </div>
)}

{/* Indicador de modo organização */}
{isOrganizing && (
  <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
    Organizando
  </div>
)}
```

## 🔧 Modificações no useMemo filteredAndSortedGrupos

### Aplicação da Ordem Personalizada
```typescript
const filteredAndSortedGrupos = useMemo(() => {
  let filtered = grupos.filter(grupo => 
    grupo.nome.toLowerCase().includes(searchTerm.toLowerCase()) && !grupo.deletado
  );

  // Separar grupos fixos e móveis
  const gruposFixos = filtered.filter(grupo => {
    const temPosicionamentoFixo = grupo &&
      (grupo as any).ordenacao_cardapio_habilitada === true &&
      (grupo as any).ordenacao_cardapio_digital !== null &&
      (grupo as any).ordenacao_cardapio_digital !== undefined &&
      (grupo as any).ordenacao_cardapio_digital !== '';
    return temPosicionamentoFixo;
  }).sort((a, b) => {
    const posA = parseInt((a as any).ordenacao_cardapio_digital) || 0;
    const posB = parseInt((b as any).ordenacao_cardapio_digital) || 0;
    return posA - posB;
  });

  const gruposMoveis = filtered.filter(grupo => {
    const temPosicionamentoFixo = grupo &&
      (grupo as any).ordenacao_cardapio_habilitada === true &&
      (grupo as any).ordenacao_cardapio_digital !== null &&
      (grupo as any).ordenacao_cardapio_digital !== undefined &&
      (grupo as any).ordenacao_cardapio_digital !== '';
    return !temPosicionamentoFixo;
  });

  // Se há ordem personalizada, aplicar
  if (gruposOrder.length > 0) {
    const orderedGrupos: any[] = [];
    
    gruposOrder.forEach(grupoId => {
      const grupo = filtered.find(g => g.id === grupoId);
      if (grupo) {
        orderedGrupos.push(grupo);
      }
    });
    
    // Adicionar grupos que não estão na ordem personalizada
    filtered.forEach(grupo => {
      if (!gruposOrder.includes(grupo.id)) {
        orderedGrupos.push(grupo);
      }
    });
    
    return orderedGrupos;
  }

  // Ordem padrão: fixos primeiro (por posição), depois móveis (alfabético)
  return [...gruposFixos, ...gruposMoveis.sort((a, b) => a.nome.localeCompare(b.nome))];
}, [grupos, searchTerm, gruposOrder]);
```

## 📋 Checklist de Implementação

### ✅ Estados e Hooks
- [ ] `isOrganizing` state
- [ ] `gruposOrder` state  
- [ ] `GRUPOS_ORDER_KEY` constant
- [ ] useEffect para localStorage

### ✅ Funções Core
- [ ] `isGrupoFixo()` helper
- [ ] `canMove()` validation
- [ ] `moveGrupo()` execution

### ✅ Interface
- [ ] Botão "Organizar Grupos"
- [ ] Setas direcionais (4 direções)
- [ ] Indicadores visuais (fixo/organizando)
- [ ] Tooltips nas setas

### ✅ Persistência
- [ ] Save no localStorage
- [ ] Load do localStorage
- [ ] Error handling

### ✅ Validações
- [ ] Grupos fixos não se movem
- [ ] Destino não pode ser fixo
- [ ] Verificar limites da grid
- [ ] Toast notifications

## 🚨 Pontos Críticos

1. **Sempre verificar se grupo é fixo** antes de qualquer movimento
2. **localStorage key deve incluir empresaId** para isolamento
3. **Grid de 2 colunas**: par=esquerda, ímpar=direita
4. **Movimentos verticais**: ±2 posições
5. **Movimentos horizontais**: ±1 posição
6. **Verificar se destino existe** antes de mover

## 📞 Suporte

Para dúvidas sobre implementação:
1. Consultar logs no console (🔄, ❌, ✅)
2. Verificar estrutura da grid no DevTools
3. Testar com diferentes cenários de grupos fixos
4. Validar localStorage no Application tab
