# Sistema de Navegação com Botões Horizontais

## 📋 Visão Geral

Este documento descreve como implementar um sistema de navegação horizontal usando botões `<` e `>` ao invés de barras de rolagem tradicionais. O sistema calcula automaticamente quantos itens cabem na tela e mostra botões de navegação quando necessário.

## 🎯 Funcionalidades

- ✅ Cálculo automático de itens visíveis baseado na largura da tela
- ✅ Botões de navegação aparecem apenas quando necessário
- ✅ Navegação item por item (ou por grupos)
- ✅ Responsivo - se adapta ao redimensionar a tela
- ✅ Mantém largura mínima dos itens para evitar compressão
- ✅ Feedback visual com hover effects

## 🏗️ Estrutura da Implementação

### 1. Estados Necessários

```typescript
// Estados para navegação do menu
const [menuStartIndex, setMenuStartIndex] = useState(0);
const [visibleMenuItems, setVisibleMenuItems] = useState(9); // Quantos itens são visíveis
```

### 2. Função de Cálculo de Itens Visíveis

```typescript
const calcularItensVisiveis = () => {
  if (typeof window === 'undefined') return 9;
  const larguraTela = window.innerWidth;
  const larguraBotaoNavegacao = 40; // Largura dos botões < e >
  const larguraMinimaBotao = 120; // Largura mínima de cada item
  
  // Calcular quantos botões cabem (considerando espaço para botões de navegação)
  const temBotaoAnterior = menuStartIndex > 0;
  const temBotaoProximo = menuStartIndex + visibleMenuItems < totalItens;
  const espacoBotoes = (temBotaoAnterior ? larguraBotaoNavegacao : 0) + 
                      (temBotaoProximo ? larguraBotaoNavegacao : 0);
  
  const larguraDisponivel = larguraTela - espacoBotoes;
  const itensPossiveis = Math.floor(larguraDisponivel / larguraMinimaBotao);
  
  return Math.max(1, Math.min(itensPossiveis, totalItens));
};
```

### 3. Funções de Navegação

```typescript
const navegarMenuAnterior = () => {
  setMenuStartIndex(Math.max(0, menuStartIndex - 1));
};

const navegarMenuProximo = () => {
  const maxIndex = Math.max(0, totalItens - visibleMenuItems);
  setMenuStartIndex(Math.min(maxIndex, menuStartIndex + 1));
};
```

### 4. useEffect para Responsividade

```typescript
useEffect(() => {
  const handleResize = () => {
    const novosItensVisiveis = calcularItensVisiveis();
    setVisibleMenuItems(novosItensVisiveis);
    
    // Ajustar startIndex se necessário
    const maxIndex = Math.max(0, totalItens - novosItensVisiveis);
    if (menuStartIndex > maxIndex) {
      setMenuStartIndex(maxIndex);
    }
  };

  handleResize(); // Calcular inicialmente
  window.addEventListener('resize', handleResize);
  
  return () => window.removeEventListener('resize', handleResize);
}, [menuStartIndex, totalItens]);
```

## 🎨 Estrutura HTML/JSX

```jsx
<div className="h-14 flex items-center">
  {/* Botão Anterior */}
  {menuStartIndex > 0 && (
    <button
      onClick={navegarMenuAnterior}
      className="w-10 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors border-r border-gray-800"
    >
      <ChevronLeft size={20} />
    </button>
  )}

  {/* Itens Visíveis */}
  <div className="flex items-center h-full flex-1">
    {itens.slice(menuStartIndex, menuStartIndex + visibleMenuItems).map((item, index) => {
      const originalIndex = menuStartIndex + index;
      return (
        <button
          key={item.id}
          className="flex flex-col items-center justify-center transition-all duration-200 h-full relative"
          style={{ flex: '1 1 120px', minWidth: '120px' }}
        >
          {/* Conteúdo do item */}
        </button>
      );
    })}
  </div>

  {/* Botão Próximo */}
  {menuStartIndex + visibleMenuItems < itens.length && (
    <button
      onClick={navegarMenuProximo}
      className="w-10 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors border-l border-gray-800"
    >
      <ChevronRight size={20} />
    </button>
  )}
</div>
```

## 🎯 Pontos Importantes

### Largura Mínima dos Itens
```css
style={{ flex: '1 1 120px', minWidth: '120px' }}
```
- `flex: '1 1 120px'` - permite crescer e encolher com base inicial de 120px
- `minWidth: '120px'` - nunca fica menor que 120px

### Cálculo do Índice Original
```typescript
const originalIndex = menuStartIndex + index;
```
Importante para manter referências corretas (como teclas F1-F9).

### Condições dos Botões
```typescript
// Botão anterior aparece quando há itens à esquerda
{menuStartIndex > 0 && (/* botão anterior */)}

// Botão próximo aparece quando há itens à direita
{menuStartIndex + visibleMenuItems < totalItens && (/* botão próximo */)}
```

## 🔧 Customizações Possíveis

### 1. Navegação por Grupos
```typescript
const navegarGrupoAnterior = () => {
  setMenuStartIndex(Math.max(0, menuStartIndex - visibleMenuItems));
};

const navegarGrupoProximo = () => {
  const maxIndex = Math.max(0, totalItens - visibleMenuItems);
  setMenuStartIndex(Math.min(maxIndex, menuStartIndex + visibleMenuItems));
};
```

### 2. Diferentes Larguras Mínimas
```typescript
const larguraMinimaBotao = 100; // Para itens menores
const larguraMinimaBotao = 150; // Para itens maiores
```

### 3. Indicadores Visuais
```jsx
{/* Indicador de posição */}
<div className="text-xs text-gray-500">
  {menuStartIndex + 1}-{Math.min(menuStartIndex + visibleMenuItems, totalItens)} de {totalItens}
</div>
```

## 📱 Considerações de UX

1. **Feedback Visual**: Botões devem ter hover effects claros
2. **Acessibilidade**: Usar `aria-label` nos botões de navegação
3. **Performance**: Evitar recálculos desnecessários
4. **Consistência**: Manter o mesmo padrão em toda a aplicação

## 🚀 Exemplo de Uso Completo

Ver implementação completa em: `src/pages/dashboard/PDVPage.tsx` (linhas 2926-2984)

## 📝 Notas de Implementação

- Testado em React com TypeScript
- Usa Tailwind CSS para estilização
- Compatível com Framer Motion para animações
- Funciona bem em dispositivos móveis e desktop
- Mantém performance mesmo com muitos itens
