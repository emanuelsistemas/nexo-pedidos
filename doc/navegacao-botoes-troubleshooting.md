# Troubleshooting - Sistema de Navegação com Botões

## 🚨 Problemas Comuns e Soluções

### 1. Botões não aparecem quando deveriam

**Problema**: Os botões `<` e `>` não aparecem mesmo quando há itens ocultos.

**Possíveis causas**:
- Cálculo incorreto de `visibleItems`
- Estado `startIndex` não atualizado
- Condições de renderização incorretas

**Solução**:
```typescript
// Verificar se o cálculo está correto
console.log('Total items:', items.length);
console.log('Visible items:', visibleItems);
console.log('Start index:', startIndex);
console.log('Should show previous:', startIndex > 0);
console.log('Should show next:', startIndex + visibleItems < items.length);

// Forçar recálculo
useEffect(() => {
  const handleResize = () => {
    const novosItensVisiveis = calcularItensVisiveis();
    console.log('Novos itens visíveis:', novosItensVisiveis);
    setVisibleItems(novosItensVisiveis);
  };
  
  handleResize();
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

### 2. Itens ficam muito comprimidos

**Problema**: Mesmo com `minWidth`, os itens aparecem comprimidos.

**Causa**: CSS conflitante ou cálculo de largura incorreto.

**Solução**:
```typescript
// Verificar se o CSS está sendo aplicado
const itemStyle = {
  flex: '1 1 120px',
  minWidth: '120px',
  maxWidth: 'none' // Garantir que não há limitação
};

// Adicionar !important se necessário (último recurso)
className="min-w-[120px] !min-w-[120px]"
```

### 3. Navegação não funciona corretamente

**Problema**: Clicar nos botões não move os itens ou move incorretamente.

**Solução**:
```typescript
const navegarAnterior = () => {
  console.log('Navegando anterior. Index atual:', startIndex);
  const novoIndex = Math.max(0, startIndex - 1);
  console.log('Novo index:', novoIndex);
  setStartIndex(novoIndex);
};

const navegarProximo = () => {
  console.log('Navegando próximo. Index atual:', startIndex);
  const maxIndex = Math.max(0, items.length - visibleItems);
  const novoIndex = Math.min(maxIndex, startIndex + 1);
  console.log('Novo index:', novoIndex, 'Max index:', maxIndex);
  setStartIndex(novoIndex);
};
```

### 4. Performance ruim com muitos itens

**Problema**: Lag ao redimensionar ou navegar com muitos itens.

**Solução**:
```typescript
// Debounce do resize
import { debounce } from 'lodash';

useEffect(() => {
  const debouncedResize = debounce(() => {
    const novosItensVisiveis = calcularItensVisiveis();
    setVisibleItems(novosItensVisiveis);
  }, 100);

  window.addEventListener('resize', debouncedResize);
  return () => {
    window.removeEventListener('resize', debouncedResize);
    debouncedResize.cancel();
  };
}, []);

// Memoizar cálculos
const calcularItensVisiveis = useMemo(() => {
  return () => {
    // ... lógica de cálculo
  };
}, [/* dependências específicas */]);
```

### 5. Atalhos de teclado não funcionam

**Problema**: Teclas F1-F9 não ativam os itens corretos.

**Solução**:
```typescript
// Verificar se o índice original está correto
{items.slice(startIndex, startIndex + visibleItems).map((item, index) => {
  const originalIndex = startIndex + index; // ← Importante!
  const teclaAtalho = `F${originalIndex + 1}`;
  
  console.log(`Item ${item.label} tem tecla ${teclaAtalho} e índice original ${originalIndex}`);
  
  return (
    // ... renderização do item
  );
})}

// No listener de teclado
const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key.startsWith('F')) {
    const fNumber = parseInt(event.key.substring(1));
    const itemIndex = fNumber - 1; // F1 = índice 0
    
    console.log(`Tecla ${event.key} pressionada, índice ${itemIndex}`);
    
    if (items[itemIndex]) {
      console.log(`Executando item: ${items[itemIndex].label}`);
      items[itemIndex].onClick();
    }
  }
};
```

## ⚡ Otimizações de Performance

### 1. Virtualização para Listas Grandes

```typescript
// Para mais de 50 itens, considere virtualização
const useVirtualizedNavigation = (items: any[], itemWidth: number) => {
  const [startIndex, setStartIndex] = useState(0);
  const [visibleItems, setVisibleItems] = useState(5);
  
  // Renderizar apenas itens visíveis + buffer
  const buffer = 2;
  const startWithBuffer = Math.max(0, startIndex - buffer);
  const endWithBuffer = Math.min(items.length, startIndex + visibleItems + buffer);
  
  return {
    visibleItems: items.slice(startWithBuffer, endWithBuffer),
    startIndex,
    setStartIndex,
    // ... outras funções
  };
};
```

### 2. Memoização Inteligente

```typescript
// Memoizar componentes de item
const MenuItem = React.memo(({ item, index, onClick }: MenuItemProps) => {
  return (
    <button onClick={() => onClick(item)} className="...">
      <item.icon size={20} />
      <span>{item.label}</span>
    </button>
  );
});

// Memoizar lista de itens visíveis
const visibleItems = useMemo(() => {
  return items.slice(startIndex, startIndex + visibleItems);
}, [items, startIndex, visibleItems]);
```

### 3. Lazy Loading de Ícones

```typescript
// Carregar ícones apenas quando necessário
const LazyIcon = ({ iconName, ...props }: { iconName: string }) => {
  const [IconComponent, setIconComponent] = useState<React.ComponentType | null>(null);
  
  useEffect(() => {
    import(`lucide-react`).then((module) => {
      setIconComponent(() => module[iconName]);
    });
  }, [iconName]);
  
  if (!IconComponent) return <div className="w-5 h-5 bg-gray-600 rounded" />;
  
  return <IconComponent {...props} />;
};
```

## 🔧 Configurações Avançadas

### 1. Navegação por Grupos

```typescript
const useGroupNavigation = (items: any[], groupSize: number = 3) => {
  const [currentGroup, setCurrentGroup] = useState(0);
  
  const totalGroups = Math.ceil(items.length / groupSize);
  
  const navegarGrupoAnterior = () => {
    setCurrentGroup(prev => Math.max(0, prev - 1));
  };
  
  const navegarGrupoProximo = () => {
    setCurrentGroup(prev => Math.min(totalGroups - 1, prev + 1));
  };
  
  const startIndex = currentGroup * groupSize;
  const visibleItems = items.slice(startIndex, startIndex + groupSize);
  
  return {
    visibleItems,
    currentGroup,
    totalGroups,
    navegarGrupoAnterior,
    navegarGrupoProximo,
    canGoBack: currentGroup > 0,
    canGoForward: currentGroup < totalGroups - 1
  };
};
```

### 2. Navegação Infinita

```typescript
const useInfiniteNavigation = (items: any[]) => {
  const [startIndex, setStartIndex] = useState(0);
  
  const navegarAnterior = () => {
    setStartIndex(prev => {
      const newIndex = prev - 1;
      return newIndex < 0 ? items.length - 1 : newIndex; // Volta para o final
    });
  };
  
  const navegarProximo = () => {
    setStartIndex(prev => {
      const newIndex = prev + 1;
      return newIndex >= items.length ? 0 : newIndex; // Volta para o início
    });
  };
  
  return { startIndex, navegarAnterior, navegarProximo };
};
```

### 3. Indicadores de Posição

```typescript
const PositionIndicator = ({ current, total }: { current: number; total: number }) => {
  return (
    <div className="flex items-center gap-1 px-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full transition-colors ${
            i === current ? 'bg-primary-500' : 'bg-gray-600'
          }`}
        />
      ))}
    </div>
  );
};
```

## 📱 Adaptações para Diferentes Dispositivos

### Mobile
```typescript
const mobileConfig = {
  itemWidth: 100, // Menor para mobile
  showLabels: false, // Apenas ícones
  swipeEnabled: true
};
```

### Tablet
```typescript
const tabletConfig = {
  itemWidth: 110,
  showLabels: true,
  shortLabels: true // Versões abreviadas
};
```

### Desktop
```typescript
const desktopConfig = {
  itemWidth: 120,
  showLabels: true,
  showShortcuts: true, // F1, F2, etc.
  keyboardNavigation: true
};
```

## 🎯 Checklist de Implementação

- [ ] Estados de navegação configurados
- [ ] Função de cálculo de itens implementada
- [ ] Funções de navegação funcionando
- [ ] useEffect para resize configurado
- [ ] Botões de navegação renderizando condicionalmente
- [ ] Largura mínima dos itens definida
- [ ] Atalhos de teclado (se necessário)
- [ ] Contadores/badges (se necessário)
- [ ] Testes em diferentes tamanhos de tela
- [ ] Performance otimizada
- [ ] Acessibilidade considerada
