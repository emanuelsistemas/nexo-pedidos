import React, { useState } from 'react';
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";

const TesteKeenSliderPage: React.FC = () => {
  // Estados para o Keen Slider
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [grupoSelecionado, setGrupoSelecionado] = useState<string>('todos');

  // Dados de teste das categorias
  const categoriasTeste = [
    { id: 'todos', nome: '🍽️ Todos' },
    { id: 'bebidas', nome: '🥤 Bebidas' },
    { id: 'pizzas', nome: '🍕 Pizzas' },
    { id: 'lanches', nome: '🍔 Lanches' },
    { id: 'sobremesas', nome: '🍰 Sobremesas' },
    { id: 'saladas', nome: '🥗 Saladas' },
    { id: 'massas', nome: '🍝 Massas' },
    { id: 'carnes', nome: '🥩 Carnes' },
    { id: 'frutos-mar', nome: '🦐 Frutos do Mar' },
    { id: 'vegetariano', nome: '🌱 Vegetariano' }
  ];

  // Configuração do Keen Slider
  const [sliderRef, instanceRef] = useKeenSlider({
    initial: 0,
    slides: {
      perView: 4, // 4 categorias por slide
      spacing: 8,
    },
    breakpoints: {
      "(max-width: 768px)": {
        slides: { perView: 3, spacing: 6 }
      },
      "(max-width: 480px)": {
        slides: { perView: 2, spacing: 4 }
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
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🧪 Teste Keen Slider - Categorias</h1>
          <p className="text-gray-400">
            Página isolada para testar a implementação do Keen Slider nas categorias do cardápio
          </p>
        </div>

        {/* Informações de Debug */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">📊 Debug Info</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Slide Atual:</span>
              <span className="ml-2 text-green-400">{currentSlide}</span>
            </div>
            <div>
              <span className="text-gray-400">Loaded:</span>
              <span className="ml-2 text-green-400">{loaded ? 'Sim' : 'Não'}</span>
            </div>
            <div>
              <span className="text-gray-400">Total Categorias:</span>
              <span className="ml-2 text-green-400">{categoriasTeste.length}</span>
            </div>
            <div>
              <span className="text-gray-400">Selecionado:</span>
              <span className="ml-2 text-purple-400">{grupoSelecionado}</span>
            </div>
          </div>
        </div>

        {/* Container Principal do Teste */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">🏷️ Navegação de Categorias</h2>
          
          {/* Área do Slider */}
          <div className="bg-gray-700 rounded-lg p-4 mb-6">
            <div className="flex-1 h-12 relative">
              {/* Slider Container */}
              <div ref={sliderRef} className="keen-slider h-full">
                {categoriasTeste.map((categoria) => (
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
                          : 'text-gray-300 hover:bg-gray-600 hover:text-white'
                        }
                      `}
                    >
                      {categoria.nome}
                    </button>
                  </div>
                ))}
              </div>

              {/* Indicadores de Dots */}
              {loaded && instanceRef.current && categoriasTeste.length > 4 && (
                <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-1">
                  {Array.from({ length: Math.ceil(categoriasTeste.length / 4) }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => instanceRef.current?.moveToIdx(idx)}
                      className={`
                        w-2 h-2 rounded-full transition-all duration-200
                        ${currentSlide === idx ? 'bg-purple-400' : 'bg-gray-600'}
                      `}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Controles Manuais */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => instanceRef.current?.prev()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              ← Anterior
            </button>
            <button
              onClick={() => instanceRef.current?.next()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Próximo →
            </button>
            <button
              onClick={() => instanceRef.current?.moveToIdx(0)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              Ir para Início
            </button>
          </div>

          {/* Lista de Categorias para Debug */}
          <div className="bg-gray-600 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">📋 Lista de Categorias</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {categoriasTeste.map((categoria, index) => (
                <div
                  key={categoria.id}
                  className={`p-2 rounded text-sm text-center ${
                    grupoSelecionado === categoria.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-500 text-gray-200'
                  }`}
                >
                  {index + 1}. {categoria.nome}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Instruções */}
        <div className="mt-6 bg-blue-900/50 border border-blue-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">📝 Como Testar</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-200">
            <li>Arraste horizontalmente no slider para navegar</li>
            <li>Clique nos indicadores (pontos) para pular para uma seção</li>
            <li>Use os botões de controle manual</li>
            <li>Clique nas categorias para selecioná-las</li>
            <li>Teste em diferentes tamanhos de tela (responsivo)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TesteKeenSliderPage;
