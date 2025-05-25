# Exemplos Práticos - Sistema de Navegação com Botões

## 🎯 Exemplo 1: Menu Simples

### Implementação Básica
```typescript
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  onClick: () => void;
}

const MenuNavegavel: React.FC<{ items: MenuItem[] }> = ({ items }) => {
  const [startIndex, setStartIndex] = useState(0);
  const [visibleItems, setVisibleItems] = useState(5);

  const calcularItensVisiveis = () => {
    const larguraTela = window.innerWidth;
    const larguraItem = 120;
    const larguraBotao = 40;
    
    const temBotoes = items.length > visibleItems;
    const espacoBotoes = temBotoes ? larguraBotao * 2 : 0;
    const larguraDisponivel = larguraTela - espacoBotoes;
    
    return Math.max(1, Math.floor(larguraDisponivel / larguraItem));
  };

  useEffect(() => {
    const handleResize = () => {
      setVisibleItems(calcularItensVisiveis());
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [items.length]);

  const navegarAnterior = () => {
    setStartIndex(Math.max(0, startIndex - 1));
  };

  const navegarProximo = () => {
    const maxIndex = Math.max(0, items.length - visibleItems);
    setStartIndex(Math.min(maxIndex, startIndex + 1));
  };

  return (
    <div className="flex items-center h-14 bg-gray-800 border border-gray-700 rounded-lg">
      {/* Botão Anterior */}
      {startIndex > 0 && (
        <button
          onClick={navegarAnterior}
          className="w-10 h-full flex items-center justify-center text-gray-400 hover:text-white border-r border-gray-700"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {/* Itens Visíveis */}
      <div className="flex items-center h-full flex-1">
        {items.slice(startIndex, startIndex + visibleItems).map((item) => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className="flex flex-col items-center justify-center h-full text-gray-400 hover:text-white transition-colors"
              style={{ flex: '1 1 120px', minWidth: '120px' }}
            >
              <IconComponent size={20} />
              <span className="text-xs mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Botão Próximo */}
      {startIndex + visibleItems < items.length && (
        <button
          onClick={navegarProximo}
          className="w-10 h-full flex items-center justify-center text-gray-400 hover:text-white border-l border-gray-700"
        >
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  );
};
```

## 🎯 Exemplo 2: Menu com Atalhos de Teclado

```typescript
const MenuComAtalhos: React.FC<{ items: MenuItem[] }> = ({ items }) => {
  // ... estados anteriores ...

  // Adicionar listener para atalhos
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key.startsWith('F') && event.key.length <= 3) {
        const fNumber = parseInt(event.key.substring(1));
        if (fNumber >= 1 && fNumber <= 9) {
          event.preventDefault();
          const itemIndex = fNumber - 1;
          if (items[itemIndex]) {
            items[itemIndex].onClick();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [items]);

  return (
    <div className="flex items-center h-14 bg-gray-800 border border-gray-700 rounded-lg">
      {/* ... botões de navegação ... */}
      
      <div className="flex items-center h-full flex-1">
        {items.slice(startIndex, startIndex + visibleItems).map((item, index) => {
          const IconComponent = item.icon;
          const originalIndex = startIndex + index;
          const teclaAtalho = `F${originalIndex + 1}`;
          
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className="flex flex-col items-center justify-center h-full text-gray-400 hover:text-white transition-colors"
              style={{ flex: '1 1 120px', minWidth: '120px' }}
            >
              <IconComponent size={20} />
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs">{item.label}</span>
                <span className="text-xs bg-gray-700 px-1 py-0.5 rounded text-gray-300 font-mono">
                  {teclaAtalho}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      
      {/* ... botões de navegação ... */}
    </div>
  );
};
```

## 🎯 Exemplo 3: Menu com Contadores

```typescript
interface MenuItemWithCounter extends MenuItem {
  counter?: number;
  counterColor?: 'red' | 'green' | 'blue' | 'yellow';
}

const MenuComContadores: React.FC<{ items: MenuItemWithCounter[] }> = ({ items }) => {
  // ... implementação base ...

  const getCounterColor = (color?: string) => {
    const colors = {
      red: 'bg-red-500',
      green: 'bg-green-500',
      blue: 'bg-blue-500',
      yellow: 'bg-yellow-500'
    };
    return colors[color as keyof typeof colors] || 'bg-red-500';
  };

  return (
    <div className="flex items-center h-14 bg-gray-800 border border-gray-700 rounded-lg">
      {/* ... navegação ... */}
      
      <div className="flex items-center h-full flex-1">
        {items.slice(startIndex, startIndex + visibleItems).map((item, index) => {
          const IconComponent = item.icon;
          const originalIndex = startIndex + index;
          
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className="flex flex-col items-center justify-center h-full text-gray-400 hover:text-white transition-colors relative"
              style={{ flex: '1 1 120px', minWidth: '120px' }}
            >
              <IconComponent size={20} />
              <span className="text-xs mt-1">{item.label}</span>
              
              {/* Contador */}
              {item.counter && item.counter > 0 && (
                <div className={`absolute top-1 right-1 ${getCounterColor(item.counterColor)} text-white text-xs rounded-full min-w-[20px] h-[20px] flex items-center justify-center font-bold`}>
                  {item.counter > 99 ? '99+' : item.counter}
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {/* ... navegação ... */}
    </div>
  );
};
```

## 🎯 Exemplo 4: Hook Customizado

```typescript
// Hook reutilizável para navegação
const useMenuNavegacao = (totalItems: number, itemWidth: number = 120) => {
  const [startIndex, setStartIndex] = useState(0);
  const [visibleItems, setVisibleItems] = useState(5);

  const calcularItensVisiveis = useCallback(() => {
    if (typeof window === 'undefined') return 5;
    
    const larguraTela = window.innerWidth;
    const larguraBotao = 40;
    const temBotoes = totalItems > visibleItems;
    const espacoBotoes = temBotoes ? larguraBotao * 2 : 0;
    const larguraDisponivel = larguraTela - espacoBotoes;
    
    return Math.max(1, Math.min(Math.floor(larguraDisponivel / itemWidth), totalItems));
  }, [totalItems, itemWidth, visibleItems]);

  useEffect(() => {
    const handleResize = () => {
      const novosItensVisiveis = calcularItensVisiveis();
      setVisibleItems(novosItensVisiveis);
      
      const maxIndex = Math.max(0, totalItems - novosItensVisiveis);
      if (startIndex > maxIndex) {
        setStartIndex(maxIndex);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [startIndex, totalItems, calcularItensVisiveis]);

  const navegarAnterior = useCallback(() => {
    setStartIndex(prev => Math.max(0, prev - 1));
  }, []);

  const navegarProximo = useCallback(() => {
    setStartIndex(prev => {
      const maxIndex = Math.max(0, totalItems - visibleItems);
      return Math.min(maxIndex, prev + 1);
    });
  }, [totalItems, visibleItems]);

  const podeNavegar = {
    anterior: startIndex > 0,
    proximo: startIndex + visibleItems < totalItems
  };

  return {
    startIndex,
    visibleItems,
    navegarAnterior,
    navegarProximo,
    podeNavegar
  };
};

// Uso do hook
const MenuComHook: React.FC<{ items: MenuItem[] }> = ({ items }) => {
  const {
    startIndex,
    visibleItems,
    navegarAnterior,
    navegarProximo,
    podeNavegar
  } = useMenuNavegacao(items.length);

  return (
    <div className="flex items-center h-14 bg-gray-800 border border-gray-700 rounded-lg">
      {podeNavegar.anterior && (
        <button onClick={navegarAnterior} className="w-10 h-full flex items-center justify-center text-gray-400 hover:text-white border-r border-gray-700">
          <ChevronLeft size={20} />
        </button>
      )}

      <div className="flex items-center h-full flex-1">
        {items.slice(startIndex, startIndex + visibleItems).map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            className="flex flex-col items-center justify-center h-full text-gray-400 hover:text-white transition-colors"
            style={{ flex: '1 1 120px', minWidth: '120px' }}
          >
            <item.icon size={20} />
            <span className="text-xs mt-1">{item.label}</span>
          </button>
        ))}
      </div>

      {podeNavegar.proximo && (
        <button onClick={navegarProximo} className="w-10 h-full flex items-center justify-center text-gray-400 hover:text-white border-l border-gray-700">
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  );
};
```

## 🔧 Dicas de Performance

1. **Use useCallback** para funções de navegação
2. **Memoize** cálculos pesados com useMemo
3. **Debounce** eventos de resize se necessário
4. **Virtualize** para listas muito grandes

## 📱 Adaptações Mobile

```typescript
// Ajustar para touch/swipe
const useSwipeNavegacao = (navegarAnterior: () => void, navegarProximo: () => void) => {
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e: TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) navegarProximo();
    if (isRightSwipe) navegarAnterior();
  };

  return { handleTouchStart, handleTouchMove, handleTouchEnd };
};
```
