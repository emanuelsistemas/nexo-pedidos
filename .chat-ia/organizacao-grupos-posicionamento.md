# Sistema de Organização e Posicionamento de Grupos

## 📋 Visão Geral

Sistema implementado para permitir reorganização drag-and-drop de grupos de produtos em layout de 2 colunas, com suporte a grupos com posicionamento fixo e persistência em localStorage.

## 🏗️ Arquitetura do Sistema

### Estrutura de Layout (2 Colunas)
```
Linha 0: [0] GRUPO_A    | [1] GRUPO_B
Linha 1: [2] GRUPO_C    | [3] GRUPO_D
Linha 2: [4] GRUPO_E    | [5] GRUPO_F
```

### Conceitos Fundamentais
- **Posições Pares (0, 2, 4...)**: Coluna esquerda
- **Posições Ímpares (1, 3, 5...)**: Coluna direita
- **Linha**: `Math.floor(index / 2)`
- **Coluna**: `index % 2`

## 🔧 Implementação Técnica

### 1. Estados e Variáveis

```typescript
// Estado para controlar modo de organização
const [isOrganizing, setIsOrganizing] = useState(false);

// Estado para ordem personalizada dos grupos
const [gruposOrder, setGruposOrder] = useState<string[]>([]);

// Chave do localStorage
const GRUPOS_ORDER_KEY = `grupos_order_${empresaId}`;
```

### 2. Grupos com Posicionamento Fixo

Grupos que têm `ordenacao_cardapio_habilitada = true` e `ordenacao_cardapio_digital` definido são considerados fixos:

```typescript
const temPosicionamentoFixo = grupo &&
  (grupo as any).ordenacao_cardapio_habilitada === true &&
  (grupo as any).ordenacao_cardapio_digital !== null &&
  (grupo as any).ordenacao_cardapio_digital !== undefined &&
  (grupo as any).ordenacao_cardapio_digital !== '';
```

**Características dos grupos fixos:**
- ❌ Não podem ser movidos
- ❌ Outros grupos não podem ocupar suas posições
- ✅ Têm prioridade na ordenação (posição 1 = topo)
- 🔒 São imóveis no modo organização

### 3. Lógica de Movimentação

#### Função `canMove(grupoId, direction)`

Verifica se um movimento é possível considerando:

```typescript
const canMove = (grupoId: string, direction: 'up' | 'down' | 'left' | 'right') => {
  // 1. Verificar se o grupo atual é fixo (grupos fixos não se movem)
  if (temPosicionamentoFixo) return false;
  
  // 2. Calcular posição atual na grid
  const currentIndex = currentOrder.indexOf(grupoId);
  const isLeftColumn = currentIndex % 2 === 0;
  const isRightColumn = currentIndex % 2 === 1;
  const currentRow = Math.floor(currentIndex / 2);
  
  // 3. Verificar movimento por direção
  switch (direction) {
    case 'up':
      if (currentRow === 0) return false; // Primeira linha
      const upTarget = currentIndex - 2;
      return !isGrupoFixo(currentOrder[upTarget]);
      
    case 'down':
      const downTarget = currentIndex + 2;
      if (downTarget >= currentOrder.length) return false; // Não existe
      return !isGrupoFixo(currentOrder[downTarget]);
      
    case 'left':
      if (!isRightColumn) return false; // Só da direita para esquerda
      const leftTarget = currentIndex - 1;
      return !isGrupoFixo(currentOrder[leftTarget]);
      
    case 'right':
      if (!isLeftColumn) return false; // Só da esquerda para direita
      const rightTarget = currentIndex + 1;
      if (rightTarget >= currentOrder.length) return false; // Não existe
      return !isGrupoFixo(currentOrder[rightTarget]);
  }
};
```

### 4. Função de Movimento

```typescript
const moveGrupo = (grupoId: string, direction: 'up' | 'down' | 'left' | 'right') => {
  if (!canMove(grupoId, direction)) {
    toast.error('Não é possível mover para uma posição ocupada por grupo fixo');
    return;
  }

  const currentOrder = gruposOrder.length > 0 ? gruposOrder : filteredAndSortedGrupos.map(g => g.id);
  const currentIndex = currentOrder.indexOf(grupoId);
  
  let targetIndex = currentIndex;
  switch (direction) {
    case 'up': targetIndex = currentIndex - 2; break;
    case 'down': targetIndex = currentIndex + 2; break;
    case 'left': targetIndex = currentIndex - 1; break;
    case 'right': targetIndex = currentIndex + 1; break;
  }

  // Trocar posições
  const newOrder = [...currentOrder];
  [newOrder[currentIndex], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[currentIndex]];
  
  setGruposOrder(newOrder);
  localStorage.setItem(GRUPOS_ORDER_KEY, JSON.stringify(newOrder));
  
  toast.success('Organização salva com sucesso!');
};
```

## 🎨 Interface do Usuário

### Botão de Organização
```typescript
<button
  onClick={() => setIsOrganizing(!isOrganizing)}
  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
>
  <Move className="w-4 h-4" />
  {isOrganizing ? 'Finalizar' : 'Organizar'}
</button>
```

### Setas Direcionais
```typescript
{isOrganizing && !temPosicionamentoFixo && (
  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
    <div className="grid grid-cols-3 gap-1">
      {/* Seta para cima */}
      {canMove(grupo.id, 'up') && (
        <button onClick={() => moveGrupo(grupo.id, 'up')} className="col-start-2">
          <ChevronUp className="w-6 h-6 text-white" />
        </button>
      )}
      
      {/* Setas laterais */}
      <div className="col-start-1 col-end-4 flex justify-between">
        {canMove(grupo.id, 'left') && (
          <button onClick={() => moveGrupo(grupo.id, 'left')}>
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        )}
        {canMove(grupo.id, 'right') && (
          <button onClick={() => moveGrupo(grupo.id, 'right')}>
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        )}
      </div>
      
      {/* Seta para baixo */}
      {canMove(grupo.id, 'down') && (
        <button onClick={() => moveGrupo(grupo.id, 'down')} className="col-start-2">
          <ChevronDown className="w-6 h-6 text-white" />
        </button>
      )}
    </div>
  </div>
)}
```

### Indicadores Visuais

#### Grupos Fixos
```typescript
{temPosicionamentoFixo && (
  <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs">
    Fixo - Pos. {(grupo as any).ordenacao_cardapio_digital}
  </div>
)}
```

#### Modo Organização
```typescript
{isOrganizing && (
  <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs">
    Organizando
  </div>
)}
```

## 💾 Persistência de Dados

### localStorage
```typescript
// Salvar ordem
localStorage.setItem(GRUPOS_ORDER_KEY, JSON.stringify(newOrder));

// Carregar ordem
useEffect(() => {
  const savedOrder = localStorage.getItem(GRUPOS_ORDER_KEY);
  if (savedOrder) {
    try {
      const parsedOrder = JSON.parse(savedOrder);
      setGruposOrder(parsedOrder);
    } catch (error) {
      console.error('Erro ao carregar ordem dos grupos:', error);
    }
  }
}, [empresaId]);
```

### Aplicação da Ordem
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

  // Ordem padrão: fixos primeiro, depois móveis alfabeticamente
  return [...gruposFixos, ...gruposMoveis.sort((a, b) => a.nome.localeCompare(b.nome))];
}, [grupos, searchTerm, gruposOrder]);
```

## 🚨 Tratamento de Erros

### Validações
- ✅ Verificar se grupo é fixo antes de mover
- ✅ Verificar se destino existe
- ✅ Verificar se destino não é fixo
- ✅ Mostrar toast de erro para movimentos inválidos

### Mensagens de Erro
```typescript
if (!canMove(grupoId, direction)) {
  toast.error('Não é possível mover para uma posição ocupada por grupo fixo');
  return;
}
```

## 🔄 Fluxo de Funcionamento

1. **Inicialização**: Carrega ordem do localStorage
2. **Modo Organização**: Ativa/desativa setas direcionais
3. **Validação**: Verifica se movimento é possível
4. **Movimento**: Troca posições na array
5. **Persistência**: Salva nova ordem no localStorage
6. **Feedback**: Mostra toast de sucesso/erro

## 📝 Notas Importantes

- **Grupos fixos têm prioridade absoluta** na ordenação
- **localStorage é específico por empresa** (`grupos_order_${empresaId}`)
- **Setas só aparecem quando movimento é válido**
- **Sistema funciona em grid de 2 colunas responsiva**
- **Toast notifications confirmam ações**

## 🔧 Dependências

```typescript
import { Move, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
```

## 🎯 Casos de Uso

1. **Reorganizar grupos móveis** para melhor UX
2. **Manter grupos fixos imóveis** (ex: LANCHES sempre no topo)
3. **Persistir preferências** do usuário por empresa
4. **Interface intuitiva** com setas direcionais
5. **Feedback visual** claro sobre estado atual
