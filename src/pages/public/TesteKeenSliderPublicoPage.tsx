import React, { useState, useEffect } from 'react';
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";
import { supabase } from '../../lib/supabase';

const TesteKeenSliderPublicoPage: React.FC = () => {
  // Estados para o Keen Slider - Dados Fictícios
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [grupoSelecionado, setGrupoSelecionado] = useState<string>('todos');

  // Estados para o Keen Slider - Dados Reais
  const [currentSlideReal, setCurrentSlideReal] = useState(0);
  const [loadedReal, setLoadedReal] = useState(false);
  const [grupoSelecionadoReal, setGrupoSelecionadoReal] = useState<string>('todos');
  const [gruposReais, setGruposReais] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Configuração do Keen Slider - Dados Fictícios
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
      const currentIndex = slider.track.details.rel;
      console.log('📊 Slide fictício mudou para:', currentIndex);
      setCurrentSlide(currentIndex);
    },
    animationEnded(slider) {
      const currentIndex = slider.track.details.rel;
      console.log('🎬 Animação fictícia terminou no slide:', currentIndex);
      setCurrentSlide(currentIndex);
    },
    dragEnded(slider) {
      const currentIndex = slider.track.details.rel;
      console.log('🖱️ Drag fictício terminou no slide:', currentIndex);
      setCurrentSlide(currentIndex);
    },
    created() {
      setLoaded(true);
    },
  });

  // Configuração do Keen Slider - Dados Reais
  const [sliderRefReal, instanceRefReal] = useKeenSlider({
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
      const currentIndex = slider.track.details.rel;
      console.log('📊 Slide real mudou para:', currentIndex);
      setCurrentSlideReal(currentIndex);
    },
    animationEnded(slider) {
      const currentIndex = slider.track.details.rel;
      console.log('🎬 Animação real terminou no slide:', currentIndex);
      setCurrentSlideReal(currentIndex);
    },
    dragEnded(slider) {
      const currentIndex = slider.track.details.rel;
      console.log('🖱️ Drag real terminou no slide:', currentIndex);
      setCurrentSlideReal(currentIndex);
    },
    created() {
      setLoadedReal(true);
    },
  });

  // Função para carregar grupos reais do banco
  const carregarGruposReais = async () => {
    try {
      setLoading(true);

      // ID da empresa específica para teste
      const empresaId = 'acd26a4f-7220-405e-9c96-faffb7e6480e';

      console.log('🔍 Carregando grupos para empresa:', empresaId);

      // Buscar grupos que têm produtos visíveis no cardápio digital
      const { data: grupos, error } = await supabase
        .from('grupos')
        .select(`
          *,
          produtos!inner(
            id,
            cardapio_digital,
            deletado
          )
        `)
        .eq('empresa_id', empresaId)
        .eq('produtos.cardapio_digital', true)
        .eq('produtos.deletado', false)
        .order('nome');

      if (error) {
        console.error('❌ Erro ao carregar grupos:', error);
        return;
      }

      // Filtrar grupos únicos (já que pode haver duplicatas devido ao JOIN)
      const gruposUnicos = grupos?.reduce((acc: any[], grupo: any) => {
        if (!acc.find(g => g.id === grupo.id)) {
          acc.push({
            id: grupo.id,
            nome: grupo.nome,
            empresa_id: grupo.empresa_id,
            created_at: grupo.created_at,
            updated_at: grupo.updated_at
          });
        }
        return acc;
      }, []) || [];

      console.log('✅ Grupos com produtos no cardápio digital:', gruposUnicos);
      console.log('📊 Total de grupos filtrados:', gruposUnicos.length);

      setGruposReais(gruposUnicos);
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados reais ao montar o componente
  useEffect(() => {
    carregarGruposReais();
  }, []);

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#111827', 
      color: 'white', 
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            🧪 Teste Keen Slider - Categorias (Público)
          </h1>
          <p style={{ color: '#9CA3AF' }}>
            Página isolada para testar a implementação do Keen Slider nas categorias do cardápio
          </p>
        </div>

        {/* Informações de Debug */}
        <div style={{ 
          backgroundColor: '#1F2937', 
          borderRadius: '0.5rem', 
          padding: '1rem', 
          marginBottom: '1.5rem' 
        }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            📊 Debug Info
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem', 
            fontSize: '0.875rem' 
          }}>
            <div>
              <span style={{ color: '#9CA3AF' }}>Slide Atual: </span>
              <span style={{ color: '#10B981' }}>{currentSlide}</span>
            </div>
            <div>
              <span style={{ color: '#9CA3AF' }}>Loaded: </span>
              <span style={{ color: '#10B981' }}>{loaded ? 'Sim' : 'Não'}</span>
            </div>
            <div>
              <span style={{ color: '#9CA3AF' }}>Total Categorias: </span>
              <span style={{ color: '#10B981' }}>{categoriasTeste.length}</span>
            </div>
            <div>
              <span style={{ color: '#9CA3AF' }}>Selecionado: </span>
              <span style={{ color: '#A855F7' }}>{grupoSelecionado}</span>
            </div>
            <div>
              <span style={{ color: '#9CA3AF' }}>Indicadores: </span>
              <span style={{ color: '#F59E0B' }}>
                {loaded && instanceRef.current
                  ? Math.max(1, (instanceRef.current?.track?.details?.slides?.length || 0) - 4 + 1)
                  : 'Calculando...'
                }
              </span>
            </div>
          </div>
        </div>

        {/* Container Principal do Teste */}
        <div style={{ 
          backgroundColor: '#1F2937', 
          borderRadius: '0.5rem', 
          padding: '1.5rem' 
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#A855F7' }}>
            🏷️ Navegação de Categorias - DADOS FICTÍCIOS
          </h2>
          
          {/* Área do Slider */}
          <div style={{ 
            backgroundColor: '#374151', 
            borderRadius: '0.5rem', 
            padding: '1rem', 
            marginBottom: '1.5rem' 
          }}>
            <div style={{ height: '48px', position: 'relative' }}>
              {/* Slider Container */}
              <div ref={sliderRef} className="keen-slider" style={{ height: '100%' }}>
                {categoriasTeste.map((categoria) => (
                  <div 
                    key={categoria.id} 
                    className="keen-slider__slide" 
                    style={{ minWidth: '120px', width: '120px' }}
                  >
                    <button
                      onClick={() => setGrupoSelecionado(categoria.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        height: '100%',
                        padding: '0 1rem',
                        fontWeight: '500',
                        fontSize: '0.875rem',
                        whiteSpace: 'nowrap',
                        width: '100%',
                        borderRadius: '0.375rem',
                        border: 'none',
                        cursor: 'pointer',
                        background: grupoSelecionado === categoria.id
                          ? 'linear-gradient(to right, #7C3AED, #2563EB)'
                          : '#4B5563',
                        color: grupoSelecionado === categoria.id ? 'white' : '#D1D5DB',
                        boxShadow: grupoSelecionado === categoria.id ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (grupoSelecionado !== categoria.id) {
                          e.currentTarget.style.backgroundColor = '#6B7280';
                          e.currentTarget.style.color = 'white';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (grupoSelecionado !== categoria.id) {
                          e.currentTarget.style.backgroundColor = '#4B5563';
                          e.currentTarget.style.color = '#D1D5DB';
                        }
                      }}
                    >
                      {categoria.nome}
                    </button>
                  </div>
                ))}
              </div>

              {/* Indicadores de Dots */}
              {loaded && instanceRef.current && categoriasTeste.length > 4 && (
                <div style={{
                  position: 'absolute',
                  bottom: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: '4px'
                }}>
                  {(() => {
                    const totalSlides = instanceRef.current?.track?.details?.slides?.length || 0;
                    const slidesPerView = 4; // Configurado no Keen Slider
                    const totalIndicators = Math.max(1, totalSlides - slidesPerView + 1);

                    console.log('🔍 Fictício - Total slides:', totalSlides, 'Indicadores:', totalIndicators, 'Current:', currentSlide);

                    return Array.from({ length: totalIndicators }).map((_, idx) => {
                      const isActive = currentSlide === idx;
                      console.log(`🎯 Indicador ${idx}: ${isActive ? 'ATIVO' : 'inativo'}`);

                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            console.log('🖱️ Clicou no indicador:', idx);
                            instanceRef.current?.moveToIdx(idx);
                            // Forçar atualização do estado após um pequeno delay
                            setTimeout(() => {
                              if (instanceRef.current) {
                                const newIndex = instanceRef.current.track.details.rel;
                                console.log('🔄 Forçando atualização para slide:', newIndex);
                                setCurrentSlide(newIndex);
                              }
                            }, 100);
                          }}
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            backgroundColor: isActive ? '#A855F7' : '#6B7280'
                          }}
                        />
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Controles Manuais */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <button
              onClick={() => instanceRef.current?.prev()}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#2563EB',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1D4ED8'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563EB'}
            >
              ← Anterior
            </button>
            <button
              onClick={() => instanceRef.current?.next()}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#2563EB',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1D4ED8'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563EB'}
            >
              Próximo →
            </button>
            <button
              onClick={() => instanceRef.current?.moveToIdx(0)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#047857'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#059669'}
            >
              Ir para Início
            </button>
          </div>

          {/* Lista de Categorias para Debug */}
          <div style={{ 
            backgroundColor: '#4B5563', 
            borderRadius: '0.5rem', 
            padding: '1rem' 
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem' }}>
              📋 Lista de Categorias
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
              gap: '0.5rem' 
            }}>
              {categoriasTeste.map((categoria, index) => (
                <div
                  key={categoria.id}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem',
                    textAlign: 'center',
                    backgroundColor: grupoSelecionado === categoria.id ? '#7C3AED' : '#6B7280',
                    color: grupoSelecionado === categoria.id ? 'white' : '#E5E7EB'
                  }}
                >
                  {index + 1}. {categoria.nome}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SEÇÃO COM DADOS REAIS */}
        <div style={{
          backgroundColor: '#1F2937',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          marginTop: '2rem',
          border: '2px solid #059669'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', color: '#10B981' }}>
            🏢 Navegação de Categorias - DADOS REAIS (FILTRADOS)
          </h2>
          <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '1rem' }}>
            <p>Empresa ID: acd26a4f-7220-405e-9c96-faffb7e6480e</p>
            <p>✅ Filtros aplicados:</p>
            <ul style={{ marginLeft: '1rem', marginTop: '0.25rem' }}>
              <li>• Produtos com cardapio_digital = true</li>
              <li>• Produtos com deletado = false</li>
              <li>• Apenas grupos que têm produtos visíveis</li>
            </ul>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>
              Carregando categorias reais...
            </div>
          ) : gruposReais.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#F87171' }}>
              Nenhuma categoria encontrada no banco de dados
            </div>
          ) : (
            <>
              {/* Debug Info - Dados Reais */}
              <div style={{
                backgroundColor: '#374151',
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '1rem'
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#10B981' }}>
                  📊 Debug Info - Dados Reais
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  fontSize: '0.875rem'
                }}>
                  <div>
                    <span style={{ color: '#9CA3AF' }}>Slide Atual: </span>
                    <span style={{ color: '#10B981' }}>{currentSlideReal}</span>
                  </div>
                  <div>
                    <span style={{ color: '#9CA3AF' }}>Loaded: </span>
                    <span style={{ color: '#10B981' }}>{loadedReal ? 'Sim' : 'Não'}</span>
                  </div>
                  <div>
                    <span style={{ color: '#9CA3AF' }}>Total Categorias: </span>
                    <span style={{ color: '#10B981' }}>{gruposReais.length + 1}</span>
                  </div>
                  <div>
                    <span style={{ color: '#9CA3AF' }}>Selecionado: </span>
                    <span style={{ color: '#A855F7' }}>{grupoSelecionadoReal}</span>
                  </div>
                  <div>
                    <span style={{ color: '#9CA3AF' }}>Indicadores: </span>
                    <span style={{ color: '#F59E0B' }}>
                      {loadedReal && instanceRefReal.current
                        ? Math.max(1, (instanceRefReal.current?.track?.details?.slides?.length || 0) - 4 + 1)
                        : 'Calculando...'
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Área do Slider - Dados Reais */}
              <div style={{
                backgroundColor: '#374151',
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ height: '48px', position: 'relative' }}>
                  {/* Slider Container - Dados Reais */}
                  <div ref={sliderRefReal} className="keen-slider" style={{ height: '100%' }}>
                    {/* Categoria "Todos" */}
                    <div
                      className="keen-slider__slide"
                      style={{ minWidth: '120px', width: '120px' }}
                    >
                      <button
                        onClick={() => setGrupoSelecionadoReal('todos')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s',
                          height: '100%',
                          padding: '0 1rem',
                          fontWeight: '500',
                          fontSize: '0.875rem',
                          whiteSpace: 'nowrap',
                          width: '100%',
                          borderRadius: '0.375rem',
                          border: 'none',
                          cursor: 'pointer',
                          background: grupoSelecionadoReal === 'todos'
                            ? 'linear-gradient(to right, #7C3AED, #2563EB)'
                            : '#4B5563',
                          color: grupoSelecionadoReal === 'todos' ? 'white' : '#D1D5DB',
                          boxShadow: grupoSelecionadoReal === 'todos' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
                        }}
                      >
                        🍽️ Todos
                      </button>
                    </div>

                    {/* Categorias Reais */}
                    {gruposReais.map((grupo) => (
                      <div
                        key={grupo.id}
                        className="keen-slider__slide"
                        style={{ minWidth: '120px', width: '120px' }}
                      >
                        <button
                          onClick={() => setGrupoSelecionadoReal(grupo.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            height: '100%',
                            padding: '0 1rem',
                            fontWeight: '500',
                            fontSize: '0.875rem',
                            whiteSpace: 'nowrap',
                            width: '100%',
                            borderRadius: '0.375rem',
                            border: 'none',
                            cursor: 'pointer',
                            background: grupoSelecionadoReal === grupo.id
                              ? 'linear-gradient(to right, #7C3AED, #2563EB)'
                              : '#4B5563',
                            color: grupoSelecionadoReal === grupo.id ? 'white' : '#D1D5DB',
                            boxShadow: grupoSelecionadoReal === grupo.id ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
                          }}
                        >
                          {grupo.nome}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Indicadores de Dots - Dados Reais */}
                  {loadedReal && instanceRefReal.current && (gruposReais.length + 1) > 4 && (
                    <div style={{
                      position: 'absolute',
                      bottom: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      gap: '4px'
                    }}>
                      {(() => {
                        const totalSlides = instanceRefReal.current?.track?.details?.slides?.length || 0;
                        const slidesPerView = 4; // Configurado no Keen Slider
                        const totalIndicators = Math.max(1, totalSlides - slidesPerView + 1);

                        console.log('🔍 Real - Total slides:', totalSlides, 'Indicadores:', totalIndicators, 'Current:', currentSlideReal);

                        return Array.from({ length: totalIndicators }).map((_, idx) => {
                          const isActive = currentSlideReal === idx;
                          console.log(`🎯 Indicador Real ${idx}: ${isActive ? 'ATIVO' : 'inativo'}`);

                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                console.log('🖱️ Clicou no indicador real:', idx);
                                instanceRefReal.current?.moveToIdx(idx);
                              }}
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                backgroundColor: isActive ? '#10B981' : '#6B7280'
                              }}
                            />
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Lista de Categorias Reais para Debug */}
              <div style={{
                backgroundColor: '#4B5563',
                borderRadius: '0.5rem',
                padding: '1rem'
              }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem', color: '#10B981' }}>
                  📋 Lista de Categorias Reais
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '0.5rem'
                }}>
                  <div
                    style={{
                      padding: '0.5rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem',
                      textAlign: 'center',
                      backgroundColor: grupoSelecionadoReal === 'todos' ? '#10B981' : '#6B7280',
                      color: grupoSelecionadoReal === 'todos' ? 'white' : '#E5E7EB'
                    }}
                  >
                    1. 🍽️ Todos
                  </div>
                  {gruposReais.map((grupo, index) => (
                    <div
                      key={grupo.id}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem',
                        textAlign: 'center',
                        backgroundColor: grupoSelecionadoReal === grupo.id ? '#10B981' : '#6B7280',
                        color: grupoSelecionadoReal === grupo.id ? 'white' : '#E5E7EB'
                      }}
                    >
                      {index + 2}. {grupo.nome}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Instruções */}
        <div style={{ 
          marginTop: '1.5rem', 
          backgroundColor: 'rgba(30, 58, 138, 0.5)', 
          border: '1px solid #1E40AF', 
          borderRadius: '0.5rem', 
          padding: '1rem' 
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            📝 Como Testar
          </h3>
          <ul style={{
            listStyle: 'disc',
            paddingLeft: '1.5rem',
            fontSize: '0.875rem',
            color: '#BFDBFE',
            lineHeight: '1.5'
          }}>
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

export default TesteKeenSliderPublicoPage;
