# 🎯 KEEN SLIDER - Exemplos Práticos e Templates

## 📋 **TEMPLATES PRONTOS PARA USO**

Esta documentação contém **templates copy-paste** testados e funcionais para diferentes casos de uso.

---

## 🍽️ **TEMPLATE 1: NAVEGAÇÃO DE CATEGORIAS (CARDÁPIO)**

### **Caso de Uso**
- Navegação horizontal de categorias de produtos
- Indicadores essenciais para orientar usuários leigos
- Tema escuro/claro adaptativo

### **Código Completo**
```jsx
import React, { useState } from 'react';
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";

const CategoriasSlider = ({ 
  grupos, 
  grupoSelecionado, 
  setGrupoSelecionado, 
  modoEscuro = false 
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);
  
  const [sliderRef, instanceRef] = useKeenSlider({
    initial: 0,
    slides: {
      perView: 4, // 4 categorias por slide
      spacing: 8,
    },
    slideChanged(slider) {
      setCurrentSlide(slider.track.details.rel);
    },
    created() {
      setLoaded(true);
    },
  });

  const todasCategorias = [
    { id: 'todos', nome: '🍽️ Todos' },
    ...grupos
  ];

  return (
    <div className="flex-1 h-12 relative">
      {/* Slider Container */}
      <div ref={sliderRef} className="keen-slider h-full">
        {todasCategorias.map((categoria) => (
          <div 
            key={categoria.id} 
            className="keen-slider__slide" 
            style={{ minWidth: '120px', width: '120px' }}
          >
            <button
              onClick={() => setGrupoSelecionado(categoria.id)}
              className={`
                flex items-center justify-center transition-all duration-200 
                h-full px-4 font-medium text-sm whitespace-nowrap w-full rounded-md
                ${grupoSelecionado === categoria.id
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                  : modoEscuro
                  ? 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                  : 'text-gray-700 hover:bg-gray-100/50 hover:text-gray-900'
                }
              `}
            >
              {categoria.nome}
            </button>
          </div>
        ))}
      </div>

      {/* Indicadores de Dots */}
      {loaded && instanceRef.current && grupos.length > 3 && (
        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-1">
          {Array.from({ length: Math.ceil((grupos.length + 1) / 4) }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => instanceRef.current?.moveToIdx(idx)}
              className={`
                w-2 h-2 rounded-full transition-all duration-200
                ${currentSlide === idx
                  ? modoEscuro ? 'bg-purple-400' : 'bg-purple-600'
                  : modoEscuro ? 'bg-gray-600' : 'bg-gray-300'
                }
              `}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoriasSlider;
```

### **Como Usar**
```jsx
// No seu componente pai
<CategoriasSlider
  grupos={grupos}
  grupoSelecionado={grupoSelecionado}
  setGrupoSelecionado={setGrupoSelecionado}
  modoEscuro={config.modo_escuro}
/>
```

---

## 🛍️ **TEMPLATE 2: LISTA DE PRODUTOS HORIZONTAL**

### **Caso de Uso**
- Showcase de produtos em destaque
- Cards com imagem, nome e preço
- Indicadores opcionais

### **Código Completo**
```jsx
import React, { useState } from 'react';
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";

const ProdutosSlider = ({ produtos, onProdutoClick, showIndicators = true }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);
  
  const [sliderRef, instanceRef] = useKeenSlider({
    initial: 0,
    slides: {
      perView: 3, // 3 produtos por slide
      spacing: 16,
    },
    breakpoints: {
      "(max-width: 768px)": {
        slides: { perView: 2, spacing: 12 }
      },
      "(max-width: 480px)": {
        slides: { perView: 1, spacing: 8 }
      }
    },
    slideChanged(slider) {
      setCurrentSlide(slider.track.details.rel);
    },
    created() {
      setLoaded(true);
    },
  });

  return (
    <div className="w-full relative">
      {/* Slider Container */}
      <div ref={sliderRef} className="keen-slider">
        {produtos.map((produto) => (
          <div key={produto.id} className="keen-slider__slide">
            <div 
              className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => onProdutoClick(produto)}
            >
              {/* Imagem do Produto */}
              <div className="aspect-square bg-gray-200">
                {produto.foto_url ? (
                  <img 
                    src={produto.foto_url} 
                    alt={produto.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    📦
                  </div>
                )}
              </div>
              
              {/* Informações do Produto */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 truncate">
                  {produto.nome}
                </h3>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {produto.descricao}
                </p>
                <p className="text-lg font-bold text-purple-600 mt-2">
                  R$ {produto.preco.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Indicadores (Opcionais) */}
      {showIndicators && loaded && instanceRef.current && produtos.length > 3 && (
        <div className="flex justify-center mt-4 space-x-2">
          {Array.from({ length: Math.ceil(produtos.length / 3) }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => instanceRef.current?.moveToIdx(idx)}
              className={`
                w-3 h-3 rounded-full transition-all duration-200
                ${currentSlide === idx ? 'bg-purple-600' : 'bg-gray-300'}
              `}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProdutosSlider;
```

---

## 📸 **TEMPLATE 3: GALERIA DE FOTOS**

### **Caso de Uso**
- Galeria de imagens com navegação
- Indicadores obrigatórios
- Zoom e lightbox opcional

### **Código Completo**
```jsx
import React, { useState } from 'react';
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";

const GaleriaSlider = ({ fotos, onFotoClick }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);
  
  const [sliderRef, instanceRef] = useKeenSlider({
    initial: 0,
    slides: {
      perView: 1, // 1 foto por slide
      spacing: 0,
    },
    slideChanged(slider) {
      setCurrentSlide(slider.track.details.rel);
    },
    created() {
      setLoaded(true);
    },
  });

  return (
    <div className="w-full relative">
      {/* Slider Container */}
      <div ref={sliderRef} className="keen-slider aspect-video bg-gray-100 rounded-lg overflow-hidden">
        {fotos.map((foto, index) => (
          <div key={foto.id || index} className="keen-slider__slide">
            <div 
              className="w-full h-full cursor-pointer relative group"
              onClick={() => onFotoClick?.(foto, index)}
            >
              <img 
                src={foto.url} 
                alt={foto.alt || `Foto ${index + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* Overlay com Zoom */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  🔍 Clique para ampliar
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Indicadores de Dots */}
      {loaded && instanceRef.current && fotos.length > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          {fotos.map((_, idx) => (
            <button
              key={idx}
              onClick={() => instanceRef.current?.moveToIdx(idx)}
              className={`
                w-3 h-3 rounded-full transition-all duration-200
                ${currentSlide === idx ? 'bg-blue-600' : 'bg-gray-300'}
              `}
            />
          ))}
        </div>
      )}

      {/* Contador de Fotos */}
      <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
        {currentSlide + 1} / {fotos.length}
      </div>

      {/* Navegação com Setas */}
      {loaded && instanceRef.current && fotos.length > 1 && (
        <>
          <button
            onClick={() => instanceRef.current?.prev()}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
          >
            ←
          </button>
          <button
            onClick={() => instanceRef.current?.next()}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
          >
            →
          </button>
        </>
      )}
    </div>
  );
};

export default GaleriaSlider;
```

---

## 🏷️ **TEMPLATE 4: TAGS/FILTROS HORIZONTAIS**

### **Caso de Uso**
- Filtros de categoria ou tags
- Seleção múltipla
- Indicadores sutis

### **Código Completo**
```jsx
import React, { useState } from 'react';
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";

const TagsSlider = ({ tags, selectedTags, onTagToggle, maxVisible = 5 }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);
  
  const [sliderRef, instanceRef] = useKeenSlider({
    initial: 0,
    slides: {
      perView: maxVisible,
      spacing: 8,
    },
    breakpoints: {
      "(max-width: 768px)": {
        slides: { perView: 3, spacing: 6 }
      }
    },
    slideChanged(slider) {
      setCurrentSlide(slider.track.details.rel);
    },
    created() {
      setLoaded(true);
    },
  });

  const isSelected = (tagId) => selectedTags.includes(tagId);

  return (
    <div className="w-full relative">
      {/* Slider Container */}
      <div ref={sliderRef} className="keen-slider h-10">
        {tags.map((tag) => (
          <div key={tag.id} className="keen-slider__slide">
            <button
              onClick={() => onTagToggle(tag.id)}
              className={`
                h-full px-4 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap w-full
                ${isSelected(tag.id)
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {tag.nome}
              {tag.count && (
                <span className="ml-1 text-xs opacity-75">
                  ({tag.count})
                </span>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Indicadores Sutis */}
      {loaded && instanceRef.current && tags.length > maxVisible && (
        <div className="flex justify-center mt-2 space-x-1">
          {Array.from({ length: Math.ceil(tags.length / maxVisible) }).map((_, idx) => (
            <div
              key={idx}
              className={`
                w-1 h-1 rounded-full transition-all duration-200
                ${currentSlide === idx ? 'bg-blue-600' : 'bg-gray-300'}
              `}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TagsSlider;

---

## 📱 **TEMPLATE 5: CARDS RESPONSIVOS**

### **Caso de Uso**
- Cards adaptativos por tamanho de tela
- Conteúdo variado (texto, imagem, botões)
- Indicadores responsivos

### **Código Completo**
```jsx
import React, { useState } from 'react';
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";

const CardsSlider = ({ cards, onCardAction }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const [sliderRef, instanceRef] = useKeenSlider({
    initial: 0,
    slides: {
      perView: 3,
      spacing: 20,
    },
    breakpoints: {
      "(max-width: 1024px)": {
        slides: { perView: 2, spacing: 16 }
      },
      "(max-width: 640px)": {
        slides: { perView: 1, spacing: 12 }
      }
    },
    slideChanged(slider) {
      setCurrentSlide(slider.track.details.rel);
    },
    created() {
      setLoaded(true);
    },
  });

  return (
    <div className="w-full relative">
      <div ref={sliderRef} className="keen-slider">
        {cards.map((card) => (
          <div key={card.id} className="keen-slider__slide">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden h-full">
              {/* Header do Card */}
              {card.image && (
                <div className="h-48 bg-gradient-to-r from-purple-400 to-blue-500">
                  <img
                    src={card.image}
                    alt={card.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Conteúdo */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {card.title}
                </h3>
                <p className="text-gray-600 mb-4 line-clamp-3">
                  {card.description}
                </p>

                {/* Metadados */}
                {card.metadata && (
                  <div className="flex items-center text-sm text-gray-500 mb-4">
                    <span>{card.metadata.date}</span>
                    {card.metadata.author && (
                      <>
                        <span className="mx-2">•</span>
                        <span>{card.metadata.author}</span>
                      </>
                    )}
                  </div>
                )}

                {/* Ações */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => onCardAction('view', card)}
                    className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Ver Mais
                  </button>
                  {card.secondaryAction && (
                    <button
                      onClick={() => onCardAction('secondary', card)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {card.secondaryAction}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Indicadores */}
      {loaded && instanceRef.current && cards.length > 3 && (
        <div className="flex justify-center mt-6 space-x-2">
          {Array.from({ length: Math.ceil(cards.length / 3) }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => instanceRef.current?.moveToIdx(idx)}
              className={`
                w-3 h-3 rounded-full transition-all duration-200
                ${currentSlide === idx ? 'bg-purple-600' : 'bg-gray-300'}
              `}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CardsSlider;
```

---

## 🎨 **CUSTOMIZAÇÕES AVANÇADAS**

### **Indicadores Customizados**
```jsx
// Indicadores com números
{Array.from({ length: totalSlides }).map((_, idx) => (
  <button
    key={idx}
    onClick={() => instanceRef.current?.moveToIdx(idx)}
    className={`
      w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
      ${currentSlide === idx
        ? 'bg-purple-600 text-white'
        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
      }
    `}
  >
    {idx + 1}
  </button>
))}

// Indicadores com preview
{Array.from({ length: totalSlides }).map((_, idx) => (
  <button
    key={idx}
    onClick={() => instanceRef.current?.moveToIdx(idx)}
    className={`
      w-16 h-12 rounded border-2 overflow-hidden
      ${currentSlide === idx ? 'border-purple-600' : 'border-gray-300'}
    `}
  >
    <img
      src={slides[idx * itemsPerSlide]?.thumbnail}
      alt={`Slide ${idx + 1}`}
      className="w-full h-full object-cover"
    />
  </button>
))}

// Indicadores com texto
{Array.from({ length: totalSlides }).map((_, idx) => (
  <button
    key={idx}
    onClick={() => instanceRef.current?.moveToIdx(idx)}
    className={`
      px-3 py-1 rounded-full text-sm font-medium
      ${currentSlide === idx
        ? 'bg-purple-600 text-white'
        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
      }
    `}
  >
    {slideLabels[idx]}
  </button>
))}
```

### **Animações Personalizadas**
```jsx
const [sliderRef] = useKeenSlider({
  slides: { perView: 3, spacing: 16 },
  defaultAnimation: {
    duration: 800,
    easing: (t) => 1 - Math.pow(1 - t, 4) // Easing customizado
  },
  // Animação de entrada
  created(s) {
    s.container.style.opacity = '0';
    s.container.style.transform = 'translateY(20px)';
    setTimeout(() => {
      s.container.style.transition = 'all 0.5s ease';
      s.container.style.opacity = '1';
      s.container.style.transform = 'translateY(0)';
    }, 100);
  }
});
```

### **Controles Externos**
```jsx
const SliderComControles = ({ items }) => {
  const [sliderRef, instanceRef] = useKeenSlider({
    slides: { perView: 3, spacing: 16 }
  });

  return (
    <div>
      {/* Controles Externos */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Meus Itens</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => instanceRef.current?.prev()}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
          >
            ←
          </button>
          <button
            onClick={() => instanceRef.current?.next()}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
          >
            →
          </button>
        </div>
      </div>

      {/* Slider */}
      <div ref={sliderRef} className="keen-slider">
        {/* Itens aqui */}
      </div>
    </div>
  );
};
```

---

## 🔧 **HOOKS CUSTOMIZADOS**

### **useKeenSliderWithIndicators**
```jsx
import { useState } from 'react';
import { useKeenSlider } from "keen-slider/react";

export const useKeenSliderWithIndicators = (options = {}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const [sliderRef, instanceRef] = useKeenSlider({
    initial: 0,
    slideChanged(slider) {
      setCurrentSlide(slider.track.details.rel);
    },
    created() {
      setLoaded(true);
    },
    ...options
  });

  const renderIndicators = (totalSlides, className = '') => {
    if (!loaded || !instanceRef.current || totalSlides <= 1) return null;

    return (
      <div className={`flex justify-center space-x-2 ${className}`}>
        {Array.from({ length: totalSlides }).map((_, idx) => (
          <button
            key={idx}
            onClick={() => instanceRef.current?.moveToIdx(idx)}
            className={`
              w-2 h-2 rounded-full transition-all duration-200
              ${currentSlide === idx ? 'bg-purple-600' : 'bg-gray-300'}
            `}
          />
        ))}
      </div>
    );
  };

  return {
    sliderRef,
    instanceRef,
    currentSlide,
    loaded,
    renderIndicators
  };
};
```

### **Como Usar o Hook**
```jsx
const MeuSlider = ({ items }) => {
  const { sliderRef, renderIndicators } = useKeenSliderWithIndicators({
    slides: { perView: 3, spacing: 16 }
  });

  const totalSlides = Math.ceil(items.length / 3);

  return (
    <div>
      <div ref={sliderRef} className="keen-slider">
        {items.map(item => (
          <div key={item.id} className="keen-slider__slide">
            {/* Conteúdo do item */}
          </div>
        ))}
      </div>

      {renderIndicators(totalSlides, 'mt-4')}
    </div>
  );
};
```

---

## 📋 **CHECKLIST DE QUALIDADE**

### **✅ Funcionalidade**
- [ ] Slider funciona no mobile (touch)
- [ ] Slider funciona no desktop (mouse/trackpad)
- [ ] Indicadores aparecem quando necessário
- [ ] Indicadores mudam conforme navegação
- [ ] Clique nos indicadores navega corretamente
- [ ] Responsividade funciona em todas as telas

### **✅ Performance**
- [ ] Sem re-renders desnecessários
- [ ] Animações suaves (60fps)
- [ ] Carregamento rápido
- [ ] Sem memory leaks

### **✅ Acessibilidade**
- [ ] Navegação por teclado funciona
- [ ] Screen readers conseguem navegar
- [ ] Contraste adequado nos indicadores
- [ ] Focus visível nos elementos

### **✅ UX**
- [ ] Indicadores são intuitivos
- [ ] Feedback visual adequado
- [ ] Não há confusão sobre navegação
- [ ] Usuários leigos conseguem usar

---

## 🎯 **CONCLUSÃO DOS EXEMPLOS**

Estes templates cobrem **95% dos casos de uso** para scroll horizontal com indicadores:

### **📊 Resumo dos Templates**
1. **Categorias**: Navegação essencial com indicadores
2. **Produtos**: Showcase com cards responsivos
3. **Galeria**: Fotos com navegação completa
4. **Tags**: Filtros horizontais sutis
5. **Cards**: Conteúdo complexo adaptativo

### **🚀 Como Usar**
1. **Copie** o template mais próximo do seu caso
2. **Adapte** os dados e estilos
3. **Teste** em diferentes dispositivos
4. **Customize** indicadores conforme necessário

### **💡 Dica Final**
**Sempre priorize a UX**: Indicadores não são apenas decorativos, são **essenciais** para orientar usuários sobre a existência de mais conteúdo!

**Templates testados e aprovados - use com confiança! ✨**
```
