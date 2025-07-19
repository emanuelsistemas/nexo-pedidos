import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronDown, Clock, Minus, Plus, ShoppingCart, X, Trash2, CheckCircle, AlertCircle, ArrowDown, List, Package, ChevronUp, Edit, MessageSquare, ShoppingBag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showMessage } from '../../utils/toast';
import FotoGaleria from '../../components/comum/FotoGaleria';
// Keen Slider
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";

// Componente para slider de promoções
interface PromocoesSliderProps {
  promocoes: Array<{
    id: string;
    nome: string;
    preco: number;
    tipo_desconto?: string;
    valor_desconto?: number;
    foto_url?: string;
    // Campos de desconto por quantidade
    desconto_quantidade?: boolean;
    quantidade_minima?: number;
    tipo_desconto_quantidade?: string;
    percentual_desconto_quantidade?: number;
    valor_desconto_quantidade?: number;
    exibir_desconto_qtd_minimo_no_cardapio_digital?: boolean;
  }>;
  config: {modo_escuro: boolean};
  formatarPreco: (preco: number) => string;
  calcularValorFinal: (preco: number, tipo: string, desconto: number) => number;
}

const PromocoesSlider: React.FC<PromocoesSliderProps> = ({ promocoes, config, formatarPreco, calcularValorFinal }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const [sliderRef, instanceRef] = useKeenSlider({
    initial: 0,
    slides: {
      perView: 2.5, // Mostrar 2.5 cards por vez para dar sensação de continuidade
      spacing: 12,
    },
    breakpoints: {
      "(min-width: 768px)": {
        slides: { perView: 3.5, spacing: 16 }
      },
      "(min-width: 1024px)": {
        slides: { perView: 4.5, spacing: 20 }
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
    <div className="relative">
      <div ref={sliderRef} className="keen-slider">
        {promocoes.map((produto) => {
          // Determinar tipo de promoção e calcular valores
          let valorFinal = produto.preco;
          let descontoExibicao = '';
          let tipoPromocao = 'PROMO'; // Padrão para promoções tradicionais
          let iconePromocao = '🔥'; // Padrão para promoções tradicionais

          // Verificar se é desconto por quantidade
          if (produto.desconto_quantidade && produto.exibir_desconto_qtd_minimo_no_cardapio_digital) {
            tipoPromocao = 'QTD';
            iconePromocao = '📦';

            // Calcular desconto por quantidade
            if (produto.tipo_desconto_quantidade === 'percentual' && produto.percentual_desconto_quantidade) {
              const valorDesconto = (produto.preco * produto.percentual_desconto_quantidade) / 100;
              valorFinal = produto.preco - valorDesconto;
              descontoExibicao = `${produto.percentual_desconto_quantidade}% OFF (min. ${produto.quantidade_minima})`;
            } else if (produto.tipo_desconto_quantidade === 'valor' && produto.valor_desconto_quantidade) {
              valorFinal = produto.preco - produto.valor_desconto_quantidade;
              descontoExibicao = `- ${formatarPreco(produto.valor_desconto_quantidade)} (min. ${produto.quantidade_minima})`;
            }
          } else if (produto.tipo_desconto && produto.valor_desconto !== undefined) {
            // Promoção tradicional
            valorFinal = calcularValorFinal(produto.preco, produto.tipo_desconto, produto.valor_desconto);

            if (produto.tipo_desconto === 'percentual') {
              descontoExibicao = `${produto.valor_desconto}% OFF`;
            } else {
              descontoExibicao = `- ${formatarPreco(produto.valor_desconto)}`;
            }
          }

          return (
            <div key={produto.id} className="keen-slider__slide" style={{ minWidth: '160px' }}>
              <div
                className={`relative p-3 rounded-xl border transition-all duration-200 h-full ${
                  config.modo_escuro
                    ? 'bg-gray-800/50 border-gray-600 text-white'
                    : 'bg-white border-gray-200 text-gray-800 shadow-sm'
                }`}
              >
                {/* Badge de promoção */}
                <div className="absolute -top-2 -right-2 z-10">
                  <div className={`text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg ${
                    tipoPromocao === 'QTD'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500'
                      : 'bg-gradient-to-r from-red-500 to-pink-500'
                  }`}>
                    {iconePromocao} {tipoPromocao}
                  </div>
                </div>

                {/* Imagem do produto */}
                <div className="w-full h-20 mb-2 rounded-lg overflow-hidden bg-gray-100">
                  {produto.foto_url ? (
                    <img
                      src={produto.foto_url}
                      alt={produto.nome}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${config.modo_escuro ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <Package className={`w-8 h-8 ${config.modo_escuro ? 'text-gray-600' : 'text-gray-400'}`} />
                    </div>
                  )}
                </div>

                {/* Nome do produto */}
                <div className="text-sm font-medium truncate mb-1">{produto.nome}</div>

                {/* Preços */}
                <div className="space-y-1">
                  {/* Preço original riscado */}
                  <div className={`text-xs line-through ${
                    config.modo_escuro ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {formatarPreco(produto.preco)}
                  </div>

                  {/* Preço promocional */}
                  <div className="text-sm font-bold text-green-500">
                    {formatarPreco(valorFinal)}
                  </div>

                  {/* Badge de desconto */}
                  {descontoExibicao && (
                    <div className="inline-block px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      {descontoExibicao}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Indicadores de navegação */}
      {loaded && instanceRef.current && promocoes.length > 3 && (
        <div className="flex justify-center mt-3 space-x-1">
          {Array.from({ length: Math.ceil(promocoes.length / 3) }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => instanceRef.current?.moveToIdx(idx * 3)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                Math.floor(currentSlide / 3) === idx
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600'
                  : config.modo_escuro
                  ? 'bg-gray-600'
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Componente para slider de tabelas de preços
interface TabelasPrecosSliderProps {
  tabelas: Array<{id: string; nome: string; preco: number; quantidade_sabores: number}>;
  config: {modo_escuro: boolean};
  formatarPreco: (preco: number) => string;
  onSlideChange?: (currentSlide: number, totalSlides: number) => void;
  produto?: Produto; // ✅ ADICIONAR PRODUTO PARA ACESSAR INFORMAÇÕES DE PROMOÇÃO
  calcularValorFinal?: (preco: number, tipoDesconto: string, valorDesconto: number) => number; // ✅ FUNÇÃO PARA CALCULAR PROMOÇÃO
}

const TabelasPrecosSlider: React.FC<TabelasPrecosSliderProps> = ({ tabelas, config, formatarPreco, onSlideChange, tabelaSelecionada, onTabelaSelect, produto, calcularValorFinal }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [hasShownPeek, setHasShownPeek] = useState(false);

  const [sliderRef, instanceRef] = useKeenSlider({
    initial: 0,
    slides: {
      perView: 2.5, // ✅ Mostra 2.5 itens para criar efeito "peek" natural
      spacing: 12,
    },
    slideChanged(slider) {
      const newSlide = slider.track.details.rel;
      setCurrentSlide(newSlide);
      const slidesPerView = 2.5;
      const totalSlides = Math.ceil(tabelas.length / slidesPerView);
      onSlideChange?.(newSlide, totalSlides);
    },
    created(slider) {
      setLoaded(true);

      // ✅ EFEITO PEEK: Leve arrastada automática após 2.5 segundos
      if (tabelas.length > 3) {
        setTimeout(() => {
          slider.moveToIdx(0.3); // Move levemente para mostrar que há mais itens
          setTimeout(() => {
            slider.moveToIdx(0); // Volta para o início
            setHasShownPeek(true);
          }, 1000);
        }, 2500);
      }
    },
  });

  return (
    <div className="relative">

      <div ref={sliderRef} className="keen-slider">
        {tabelas.map((tabela) => {
          const isSelected = tabelaSelecionada === tabela.id;

          return (
            <div key={tabela.id} className="keen-slider__slide" style={{ minWidth: '120px' }}>
              <button
                onClick={() => onTabelaSelect?.(tabela.id)}
                className={`w-full p-3 rounded-lg border-2 transition-all duration-200 h-full hover:scale-105 text-left ${
                  isSelected
                    ? config.modo_escuro
                      ? 'bg-purple-900/50 border-purple-400 text-white shadow-lg ring-2 ring-purple-400/50'
                      : 'bg-blue-50 border-blue-500 text-gray-800 shadow-md ring-2 ring-blue-500/50'
                    : config.modo_escuro
                      ? 'bg-gray-700 border-gray-500 text-white shadow-md hover:border-purple-400'
                      : 'bg-white border-gray-300 text-gray-800 shadow-sm hover:border-blue-400 hover:shadow-md'
                }`}
              >
              <div className={`text-xs font-bold truncate mb-1 ${
                config.modo_escuro ? 'text-gray-200' : 'text-gray-700'
              }`}>
                {tabela.nome}
              </div>
              {/* ✅ VERIFICAR SE PRODUTO TEM PROMOÇÃO PARA APLICAR SOBRE PREÇO DA TABELA */}
              {(() => {
                if (!produto || !calcularValorFinal) {
                  // Fallback: mostrar preço normal se não tiver produto ou função
                  return (
                    <div className={`text-lg font-bold ${
                      config.modo_escuro ? 'text-green-400' : 'text-green-600'
                    }`}>
                      {formatarPreco(tabela.preco)}
                    </div>
                  );
                }

                const temPromocao = produto.promocao &&
                  produto.exibir_promocao_cardapio &&
                  produto.tipo_desconto &&
                  produto.valor_desconto !== undefined &&
                  produto.valor_desconto > 0;

                if (temPromocao) {
                  // Calcular valor final aplicando promoção sobre preço da tabela
                  const valorFinal = calcularValorFinal(tabela.preco, produto.tipo_desconto, produto.valor_desconto);

                  return (
                    <div className="flex flex-col">
                      {/* Preço da tabela original riscado */}
                      <div className={`text-xs line-through ${
                        config.modo_escuro ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {formatarPreco(tabela.preco)}
                      </div>
                      {/* Preço promocional da tabela */}
                      <div className={`text-lg font-bold ${
                        config.modo_escuro ? 'text-green-400' : 'text-green-600'
                      }`}>
                        {formatarPreco(valorFinal)}
                      </div>
                    </div>
                  );
                } else {
                  // Preço da tabela sem promoção
                  return (
                    <div className={`text-lg font-bold ${
                      config.modo_escuro ? 'text-green-400' : 'text-green-600'
                    }`}>
                      {formatarPreco(tabela.preco)}
                    </div>
                  );
                }
              })()}
              {/* Tag de quantidade de sabores */}
              {tabela.quantidade_sabores > 1 && (
                <div className={`inline-block px-1.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                  config.modo_escuro
                    ? 'bg-purple-900/50 text-purple-300 border border-purple-700'
                    : 'bg-purple-100 text-purple-700 border border-purple-300'
                }`}>
                  {tabela.quantidade_sabores} sabores
                </div>
              )}
              </button>
            </div>
          );
        })}
      </div>

      {/* ✅ INDICADORES MELHORADOS PARA USUÁRIOS LEIGOS */}
      {loaded && instanceRef.current && tabelas.length > 3 && (
        <div className="mt-3 flex items-center justify-center gap-3">
          {/* Indicadores de navegação */}
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${
              config.modo_escuro ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {currentSlide + 1} de {Math.ceil(tabelas.length / 2.5)}
            </span>
            <div className="flex space-x-1">
              {Array.from({ length: Math.ceil(tabelas.length / 2.5) }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => instanceRef.current?.moveToIdx(idx)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 hover:scale-125 ${
                    currentSlide === idx
                      ? config.modo_escuro
                        ? 'bg-blue-400 shadow-lg shadow-blue-400/50'
                        : 'bg-blue-600 shadow-lg shadow-blue-600/50'
                      : config.modo_escuro
                        ? 'bg-gray-600 hover:bg-gray-500'
                        : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Setas de navegação */}
          <div className="flex gap-1">
            <button
              onClick={() => instanceRef.current?.prev()}
              disabled={currentSlide === 0}
              className={`p-1 rounded-full transition-all duration-200 ${
                currentSlide === 0
                  ? config.modo_escuro ? 'text-gray-600' : 'text-gray-300'
                  : config.modo_escuro
                    ? 'text-blue-400 hover:bg-gray-700 active:scale-95'
                    : 'text-blue-600 hover:bg-blue-50 active:scale-95'
              }`}
            >
              <ChevronDown className="w-4 h-4 rotate-90" />
            </button>
            <button
              onClick={() => instanceRef.current?.next()}
              disabled={currentSlide >= Math.ceil(tabelas.length / 2.5) - 1}
              className={`p-1 rounded-full transition-all duration-200 ${
                currentSlide >= Math.ceil(tabelas.length / 2.5) - 1
                  ? config.modo_escuro ? 'text-gray-600' : 'text-gray-300'
                  : config.modo_escuro
                    ? 'text-blue-400 hover:bg-gray-700 active:scale-95'
                    : 'text-blue-600 hover:bg-blue-50 active:scale-95'
              }`}
            >
              <ChevronDown className="w-4 h-4 -rotate-90" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface Produto {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  foto_url?: string;
  grupo_id: string;
  grupo_nome?: string;
  ativo: boolean;
  deletado?: boolean;
  produto_alcoolico?: boolean;
  produto_fotos?: Array<{
    id: string;
    url: string;
    principal: boolean;
  }>;
  fotos_count?: number;
  unidade_medida?: {
    id: string;
    sigla: string;
    nome: string;
    fracionado: boolean;
  };
  opcoes_adicionais?: Array<{
    id: string;
    nome: string;
    quantidade_minima?: number;
    itens: Array<{
      id: string;
      nome: string;
      preco: number;
    }>;
  }>;
  // Campos de estoque
  estoque_atual?: number;
  estoque_minimo?: number;
  controla_estoque_cardapio?: boolean;
  // Campos de promoção
  promocao?: boolean;
  exibir_promocao_cardapio?: boolean;
  tipo_desconto?: string;
  valor_desconto?: number;
  // Campos de desconto por quantidade
  desconto_quantidade?: boolean;
  quantidade_minima?: number;
  tipo_desconto_quantidade?: string;
  percentual_desconto_quantidade?: number;
  valor_desconto_quantidade?: number;
  exibir_desconto_qtd_minimo_no_cardapio_digital?: boolean;
}

interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
  precoProduto?: number; // ✅ PREÇO DO PRODUTO DA TABELA SELECIONADA
  tabelaPrecoId?: string; // ✅ ID DA TABELA DE PREÇO SELECIONADA
  adicionais?: Array<{
    id: string;
    nome: string;
    preco: number;
    quantidade: number;
  }>;
  observacao?: string;
}

interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia: string;
  whatsapp?: string;
  telefones?: Array<{
    numero: string;
    tipo: string;
    whatsapp: boolean;
  }>;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  logo_url?: string;
}

interface HorarioAtendimento {
  id: string;
  dia_semana: number;
  hora_abertura: string;
  hora_fechamento: string;
}

interface CardapioConfig {
  mostrar_precos: boolean;
  permitir_pedidos: boolean;
  modo_escuro: boolean;
  mostrar_fotos: boolean;
  cardapio_fotos_minimizadas?: boolean;
  trabalha_com_pizzas?: boolean;
  ocultar_grupos_cardapio?: boolean;
}

const CardapioPublicoPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [horarios, setHorarios] = useState<HorarioAtendimento[]>([]);
  const [horariosExpanded, setHorariosExpanded] = useState(false);
  const [proximaAbertura, setProximaAbertura] = useState<Date | null>(null);
  const [contadorRegressivo, setContadorRegressivo] = useState<string>('');
  const [modoAutomatico, setModoAutomatico] = useState<boolean>(false);
  const [proximoFechamento, setProximoFechamento] = useState<Date | null>(null);
  const [contadorFechamento, setContadorFechamento] = useState<string>('');
  const [mostrarAvisoFechamento, setMostrarAvisoFechamento] = useState<boolean>(false);
  const [lojaAberta, setLojaAberta] = useState<boolean | null>(null);
  const [config, setConfig] = useState<CardapioConfig>({
    mostrar_precos: true,
    permitir_pedidos: true,
    modo_escuro: false,
    mostrar_fotos: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [grupoSelecionado, setGrupoSelecionado] = useState<string>('todos');
  const [termoPesquisa, setTermoPesquisa] = useState<string>('');
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  // Estados para o Keen Slider das categorias
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [hasShownPeekCategoria, setHasShownPeekCategoria] = useState(false);

  // Configuração do Keen Slider para categorias com efeito peek
  const [sliderRef, instanceRef] = useKeenSlider({
    initial: 0,
    slides: {
      perView: 3.5, // ✅ Mostra 3.5 categorias para criar efeito "peek" natural
      spacing: 12,
    },
    breakpoints: {
      "(max-width: 768px)": {
        slides: { perView: 2.5, spacing: 8 }
      },
      "(max-width: 480px)": {
        slides: { perView: 1.8, spacing: 6 }
      }
    },
    slideChanged(slider) {
      const currentIndex = slider.track.details.rel;
      setCurrentSlide(currentIndex);
    },
    animationEnded(slider) {
      const currentIndex = slider.track.details.rel;
      setCurrentSlide(currentIndex);
    },
    dragEnded(slider) {
      const currentIndex = slider.track.details.rel;
      setCurrentSlide(currentIndex);
    },
    created(slider) {
      setLoaded(true);

      // ✅ EFEITO PEEK: Leve arrastada automática após 1.5 segundos
      const totalCategorias = grupos.length + 1; // +1 para "Todos"
      if (totalCategorias > 4) {
        setTimeout(() => {
          slider.moveToIdx(0.4); // Move levemente para mostrar que há mais categorias
          setTimeout(() => {
            slider.moveToIdx(0); // Volta para o início
            setHasShownPeekCategoria(true);
          }, 1000);
        }, 1500);
      }
    },
  });

  // Função para calcular valor final com desconto
  const calcularValorFinal = (preco: number, tipoDesconto: string, valorDesconto: number): number => {
    if (tipoDesconto === 'percentual') {
      return preco - (preco * valorDesconto / 100);
    } else {
      return Math.max(0, preco - valorDesconto);
    }
  };



  // ✅ FUNÇÃO PARA OBTER PREÇO FINAL DO PRODUTO (considerando promoções + tabela de preço)
  const obterPrecoFinalProduto = (produtoId: string): number => {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return 0;

    // 1. Primeiro, obter preço base (tabela de preço ou preço padrão)
    let precoBase = produto.preco;

    // Se trabalha com tabelas de preço, usar preço da tabela selecionada
    if (trabalhaComTabelaPrecos) {
      const tabelasComPrecos = obterTabelasComPrecos(produtoId);
      const tabelaSelecionadaId = tabelasSelecionadas[produtoId];

      if (tabelasComPrecos.length > 0 && tabelaSelecionadaId) {
        const tabelaEscolhida = tabelasComPrecos.find(t => t.id === tabelaSelecionadaId);
        if (tabelaEscolhida) {
          precoBase = tabelaEscolhida.preco;
        }
      }
    }

    // 2. Aplicar promoção sobre o preço base (se houver)
    let precoFinal = precoBase;

    // Verificar promoção tradicional
    const temPromocaoTradicional = produto.promocao &&
      produto.exibir_promocao_cardapio &&
      produto.tipo_desconto &&
      produto.valor_desconto !== undefined &&
      produto.valor_desconto > 0;

    if (temPromocaoTradicional) {
      precoFinal = calcularValorFinal(precoBase, produto.tipo_desconto!, produto.valor_desconto!);
    }

    // Verificar desconto por quantidade (só aplica se quantidade mínima for atingida)
    const temDescontoQuantidade = produto.desconto_quantidade &&
      produto.quantidade_minima &&
      produto.quantidade_minima > 0;

    // ✅ APLICAR DESCONTO POR QUANTIDADE SOBRE O PREÇO PROMOCIONAL (SE HOUVER)
    if (temDescontoQuantidade) { // Aplicar sempre que houver desconto por quantidade
      const quantidadeSelecionada = obterQuantidadeSelecionada(produtoId);



      if (quantidadeSelecionada >= produto.quantidade_minima!) {
        // ✅ APLICAR DESCONTO SOBRE O PREÇO ATUAL (que já pode ter promoção aplicada)
        if (produto.tipo_desconto_quantidade === 'percentual' && produto.percentual_desconto_quantidade) {
          const valorDesconto = (precoFinal * produto.percentual_desconto_quantidade) / 100;
          precoFinal = precoFinal - valorDesconto;
        } else if (produto.tipo_desconto_quantidade === 'valor' && produto.valor_desconto_quantidade) {
          precoFinal = Math.max(0, precoFinal - produto.valor_desconto_quantidade);
        }
      }
    }

    return precoFinal;
  };

  // Filtrar produtos em promoção (incluindo promoções tradicionais e desconto por quantidade)
  const produtosEmPromocao = produtos.filter(produto => {
    // Promoções tradicionais
    const temPromocaoTradicional = produto.promocao &&
      produto.exibir_promocao_cardapio &&
      produto.tipo_desconto &&
      produto.valor_desconto !== undefined &&
      produto.valor_desconto > 0;

    // Desconto por quantidade mínima
    const temDescontoQuantidade = produto.desconto_quantidade &&
      produto.exibir_desconto_qtd_minimo_no_cardapio_digital &&
      produto.quantidade_minima &&
      produto.quantidade_minima > 0 &&
      ((produto.tipo_desconto_quantidade === 'percentual' && produto.percentual_desconto_quantidade && produto.percentual_desconto_quantidade > 0) ||
       (produto.tipo_desconto_quantidade === 'valor' && produto.valor_desconto_quantidade && produto.valor_desconto_quantidade > 0));

    return temPromocaoTradicional || temDescontoQuantidade;
  }).map(produto => ({
    id: produto.id,
    nome: produto.nome,
    preco: produto.preco,
    tipo_desconto: produto.tipo_desconto,
    valor_desconto: produto.valor_desconto,
    foto_url: produto.foto_url,
    // Campos de desconto por quantidade
    desconto_quantidade: produto.desconto_quantidade,
    quantidade_minima: produto.quantidade_minima,
    tipo_desconto_quantidade: produto.tipo_desconto_quantidade,
    percentual_desconto_quantidade: produto.percentual_desconto_quantidade,
    valor_desconto_quantidade: produto.valor_desconto_quantidade,
    exibir_desconto_qtd_minimo_no_cardapio_digital: produto.exibir_desconto_qtd_minimo_no_cardapio_digital
  }));

  // Filtrar produtos em promoção com base no termo de pesquisa
  const produtosEmPromocaoFiltrados = produtosEmPromocao.filter(produto => {
    if (!termoPesquisa) return true;

    const termo = termoPesquisa.toLowerCase();
    return produto.nome.toLowerCase().includes(termo);
  });

  // Estados para controle de quantidade dos produtos (carrinho)
  const [quantidadesProdutos, setQuantidadesProdutos] = useState<Record<string, number>>({});
  const [produtoEditandoQuantidade, setProdutoEditandoQuantidade] = useState<string | null>(null);

  // Estado para itens separados no carrinho (cada adição é um item único)
  const [itensCarrinhoSeparados, setItensCarrinhoSeparados] = useState<Record<string, {
    produtoId: string;
    quantidade: number;
    precoProduto?: number; // ✅ PREÇO DO PRODUTO DA TABELA SELECIONADA
    tabelaPrecoId?: string; // ✅ ID DA TABELA DE PREÇO SELECIONADA
    adicionais: {[itemId: string]: number};
    observacao?: string;
    ordemAdicao: number;
  }>>({});

  // Estados para quantidades selecionadas (antes de adicionar ao carrinho)
  const [quantidadesSelecionadas, setQuantidadesSelecionadas] = useState<Record<string, number>>({});

  // Estados para o modal do carrinho
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
  const [carrinhoRecemAberto, setCarrinhoRecemAberto] = useState(false);
  const [itemEditandoCarrinho, setItemEditandoCarrinho] = useState<string | null>(null);
  const [modalConfirmacaoAberto, setModalConfirmacaoAberto] = useState(false);
  const [modalTodosItensAberto, setModalTodosItensAberto] = useState(false);
  const [modalRemoverItemAberto, setModalRemoverItemAberto] = useState(false);
  const [produtoParaRemover, setProdutoParaRemover] = useState<string | null>(null);

  // Estado para o modal de finalização do pedido
  const [modalFinalizacaoAberto, setModalFinalizacaoAberto] = useState(false);

  // Estados para o modal de validação de área de entrega
  const [modalAreaEntregaAberto, setModalAreaEntregaAberto] = useState(false);
  const [taxaEntregaConfig, setTaxaEntregaConfig] = useState<{
    habilitado: boolean;
    tipo: 'bairro' | 'distancia';
  } | null>(null);
  const [bairrosDisponiveis, setBairrosDisponiveis] = useState<Array<{
    id: string;
    bairro: string;
    valor: number;
    tempo_entrega?: number;
  }>>([]);
  const [cepCliente, setCepCliente] = useState('');
  const [bairroSelecionado, setBairroSelecionado] = useState('');
  const [termoPesquisaBairro, setTermoPesquisaBairro] = useState('');
  const [validandoCep, setValidandoCep] = useState(false);
  const [enderecoEncontrado, setEnderecoEncontrado] = useState<{
    logradouro: string;
    bairro: string;
    localidade: string;
    uf: string;
  } | null>(null);
  const [areaValidada, setAreaValidada] = useState(false);

  // Estados para modal de configuração individual (mantendo apenas os necessários)
  const [modalAdicionarCarrinho, setModalAdicionarCarrinho] = useState(false);
  const [produtoConfiguracaoIndividual, setProdutoConfiguracaoIndividual] = useState<any>(null);

  // Estados para modal de organização de adicionais
  const [modalOrganizacao, setModalOrganizacao] = useState(false);
  const [produtoOrganizacao, setProdutoOrganizacao] = useState<any>(null);
  const [itensOrganizados, setItensOrganizados] = useState<any[]>([]);
  const [excedentesDisponiveis, setExcedentesDisponiveis] = useState<any[]>([]);

  // Estados para modal secundário de vinculação
  const [modalVincularExcedente, setModalVincularExcedente] = useState(false);
  const [excedenteAtual, setExcedenteAtual] = useState<any>(null);

  // Estados para controle de quantidade dos excedentes agrupados
  const [excedentesAgrupados, setExcedentesAgrupados] = useState<{[originalId: string]: {
    originalId: string;
    nome: string;
    preco: number;
    quantidadeTotal: number;
    quantidadeSelecionada: number;
  }}>({});
  const [quantidadeExcedenteTemp, setQuantidadeExcedenteTemp] = useState<{[originalId: string]: number}>({});



  // ✅ NOVO: Modal de conscientização para produtos alcoólicos
  const [modalProdutoAlcoolico, setModalProdutoAlcoolico] = useState(false);
  const [produtoAlcoolicoPendente, setProdutoAlcoolicoPendente] = useState<string | null>(null);

  // Estados para modal de estoque insuficiente
  const [modalEstoqueInsuficiente, setModalEstoqueInsuficiente] = useState(false);
  const [dadosEstoqueInsuficiente, setDadosEstoqueInsuficiente] = useState<{
    nomeProduto: string;
    quantidadeSolicitada: number;
    estoqueDisponivel: number;
  } | null>(null);

  // Estados para modal de tabela de preço obrigatória
  const [modalTabelaPrecoObrigatoria, setModalTabelaPrecoObrigatoria] = useState(false);
  const [produtoTabelaPrecoObrigatoria, setProdutoTabelaPrecoObrigatoria] = useState<{
    id: string;
    nome: string;
  } | null>(null);

  // Estados para modal de configuração individual
  const [modalConfiguracaoAberto, setModalConfiguracaoAberto] = useState(false);
  const [produtoConfiguracaoAtual, setProdutoConfiguracaoAtual] = useState<any>(null);
  const [quantidadeConfiguracao, setQuantidadeConfiguracao] = useState(1);
  const [desejaAdicionais, setDesejaAdicionais] = useState<boolean | null>(null);
  const [adicionaisConfiguracao, setAdicionaisConfiguracao] = useState<{[itemId: string]: number}>({});
  const [observacaoConfiguracao, setObservacaoConfiguracao] = useState('');
  const [toastVisivel, setToastVisivel] = useState(false);
  const [ordemAdicaoItens, setOrdemAdicaoItens] = useState<Record<string, number>>({});
  const [itemChacoalhando, setItemChacoalhando] = useState<string | null>(null);
  const [itemEditandoQuantidade, setItemEditandoQuantidade] = useState<string | null>(null);

  // Estados para galeria de fotos
  const [galeriaAberta, setGaleriaAberta] = useState(false);
  const [fotosProdutoSelecionado, setFotosProdutoSelecionado] = useState<Array<{id: string; url: string; principal?: boolean}>>([]);
  const [fotoInicialIndex, setFotoInicialIndex] = useState(0);

  // Estados para adicionais
  const [adicionaisExpandidos, setAdicionaisExpandidos] = useState<{[produtoId: string]: {[opcaoId: string]: boolean}}>({});
  const [adicionaisSelecionados, setAdicionaisSelecionados] = useState<{[produtoId: string]: {[itemId: string]: number}}>({});

  // Estado para controlar validação de quantidade mínima por opção
  const [validacaoQuantidadeMinima, setValidacaoQuantidadeMinima] = useState<{[produtoId: string]: {[opcaoId: string]: boolean}}>({});

  // Estado para controlar validação de quantidade máxima por opção
  const [validacaoQuantidadeMaxima, setValidacaoQuantidadeMaxima] = useState<{[produtoId: string]: {[opcaoId: string]: boolean}}>({});

  // Estados para observações
  const [observacoesProdutos, setObservacoesProdutos] = useState<Record<string, string>>({});
  const [observacoesSelecionadas, setObservacoesSelecionadas] = useState<Record<string, string>>({});
  const [modalObservacaoAberto, setModalObservacaoAberto] = useState(false);
  const [produtoObservacaoAtual, setProdutoObservacaoAtual] = useState<string | null>(null);
  const [observacaoTemp, setObservacaoTemp] = useState('');

  // Estados para tabelas de preços
  const [trabalhaComTabelaPrecos, setTrabalhaComTabelaPrecos] = useState(false);
  const [tabelasPrecos, setTabelasPrecos] = useState<Array<{id: string; nome: string; quantidade_sabores: number}>>([]);
  const [produtoPrecos, setProdutoPrecos] = useState<{[produtoId: string]: {[tabelaId: string]: number}}>({});
  const [tabelasSelecionadas, setTabelasSelecionadas] = useState<{[produtoId: string]: string}>({});

  // Estados para preços dos adicionais por tabela
  const [adicionaisPrecos, setAdicionaisPrecos] = useState<{[adicionalId: string]: {[tabelaId: string]: number}}>({});

  // Funções para observações
  const abrirModalObservacao = (produtoId: string, itemId?: string) => {
    setProdutoObservacaoAtual(itemId || produtoId);

    if (itemId) {
      // Observação do carrinho - buscar no item específico
      const item = itensCarrinhoSeparados[itemId];
      setObservacaoTemp(item?.observacao || '');
    } else {
      // Observação de seleção - buscar nas observações selecionadas
      setObservacaoTemp(observacoesSelecionadas[produtoId] || '');
    }

    setModalObservacaoAberto(true);
  };

  const salvarObservacao = () => {
    if (produtoObservacaoAtual) {
      // Verificar se é um itemId (carrinho) ou produtoId (seleção)
      if (itensCarrinhoSeparados[produtoObservacaoAtual]) {
        // Observação do carrinho - atualizar item específico
        setItensCarrinhoSeparados(prev => ({
          ...prev,
          [produtoObservacaoAtual]: {
            ...prev[produtoObservacaoAtual],
            observacao: observacaoTemp.trim() || undefined
          }
        }));
      } else {
        // Observação de seleção
        if (observacaoTemp.trim()) {
          setObservacoesSelecionadas(prev => ({
            ...prev,
            [produtoObservacaoAtual]: observacaoTemp.trim()
          }));
        } else {
          // Remove observação se estiver vazia
          setObservacoesSelecionadas(prev => {
            const nova = { ...prev };
            delete nova[produtoObservacaoAtual];
            return nova;
          });
        }
      }
    }
    fecharModalObservacao();
  };

  const fecharModalObservacao = () => {
    setModalObservacaoAberto(false);
    setProdutoObservacaoAtual(null);
    setObservacaoTemp('');
  };
  // Funções para validação de área de entrega
  const formatarCEP = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{5})(\d{3})$/, '$1-$2')
      .substring(0, 9);
  };

  const validarCEP = async (cep: string) => {
    try {
      setValidandoCep(true);
      const cepLimpo = cep.replace(/\D/g, '');

      if (cepLimpo.length !== 8) {
        showMessage('error', 'CEP inválido. O CEP deve conter 8 dígitos.');
        return;
      }

      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (data.erro) {
        showMessage('error', 'CEP não encontrado.');
        setEnderecoEncontrado(null);
        return;
      }

      setEnderecoEncontrado({
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        localidade: data.localidade || '',
        uf: data.uf || ''
      });

      showMessage('success', 'CEP válido! Verificando área de entrega...');

    } catch (error) {
      console.error('Erro ao validar CEP:', error);
      showMessage('error', 'Erro ao validar CEP. Tente novamente.');
      setEnderecoEncontrado(null);
    } finally {
      setValidandoCep(false);
    }
  };

  const confirmarAreaEntrega = () => {
    if (taxaEntregaConfig?.tipo === 'bairro' && !bairroSelecionado) {
      showMessage('error', 'Por favor, selecione um bairro.');
      return;
    }

    if (taxaEntregaConfig?.tipo === 'distancia' && (!cepCliente || !enderecoEncontrado)) {
      showMessage('error', 'Por favor, informe um CEP válido.');
      return;
    }

    // Salvar validação no localStorage
    if (empresaId) {
      localStorage.setItem(`area_validada_${empresaId}`, 'true');
      if (taxaEntregaConfig?.tipo === 'bairro') {
        localStorage.setItem(`bairro_selecionado_${empresaId}`, bairroSelecionado);
      } else {
        localStorage.setItem(`cep_cliente_${empresaId}`, cepCliente);
      }
    }

    setAreaValidada(true);
    setModalAreaEntregaAberto(false);
    showMessage('success', 'Área de entrega confirmada!');
  };

  // Filtrar bairros com base na pesquisa
  const bairrosFiltrados = bairrosDisponiveis.filter(item =>
    item.bairro.toLowerCase().includes(termoPesquisaBairro.toLowerCase())
  );





  // Atualizar meta tags para preview do WhatsApp quando empresa for carregada
  useEffect(() => {
    if (empresa && slug) {
      const nomeEmpresa = empresa.nome_fantasia || empresa.razao_social;
      const logoUrl = empresa.logo_url || '';
      const cardapioUrl = `https://nexo.emasoftware.app/cardapio/${slug}`;

      // Atualizar título da página
      document.title = `${nomeEmpresa} - Cardápio Digital`;

      // Função para atualizar ou criar meta tag
      const updateMetaTag = (property: string, content: string) => {
        let metaTag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
        if (!metaTag) {
          metaTag = document.createElement('meta');
          metaTag.setAttribute('property', property);
          document.head.appendChild(metaTag);
        }
        metaTag.setAttribute('content', content);
      };

      // Atualizar meta tags Open Graph para WhatsApp
      updateMetaTag('og:title', nomeEmpresa);
      updateMetaTag('og:description', 'Consulte o cardápio e faça seu pedido');
      updateMetaTag('og:url', cardapioUrl);
      updateMetaTag('og:type', 'website');
      updateMetaTag('og:site_name', 'Nexo Pedidos');

      if (logoUrl) {
        updateMetaTag('og:image', logoUrl);
        updateMetaTag('og:image:width', '400');
        updateMetaTag('og:image:height', '400');
        updateMetaTag('og:image:alt', `Logo ${nomeEmpresa}`);
      }

      // Meta tags para Twitter
      updateMetaTag('twitter:card', 'summary_large_image');
      updateMetaTag('twitter:title', nomeEmpresa);
      updateMetaTag('twitter:description', 'Consulte o cardápio e faça seu pedido');
      if (logoUrl) {
        updateMetaTag('twitter:image', logoUrl);
      }


    }
  }, [empresa, slug]);

  useEffect(() => {
    if (slug) {
      carregarDadosCardapio();
    }
  }, [slug]);

  // Configurar realtime para monitorar mudanças no status da loja
  useEffect(() => {
    if (!empresaId) return;

    // Criar canal único para esta empresa
    const channelName = `cardapio_loja_status_${empresaId}`;

    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true },
          presence: { key: empresaId }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pdv_config',
          filter: `empresa_id=eq.${empresaId}`
        },
        (payload) => {
          if (payload.new && payload.new.cardapio_loja_aberta !== undefined) {
            const novoStatus = payload.new.cardapio_loja_aberta;
            setLojaAberta(novoStatus);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [empresaId]);

  // Polling como backup para garantir sincronização
  useEffect(() => {
    if (!empresaId) return;

    const interval = setInterval(async () => {
      try {
        const { data: statusData, error } = await supabase
          .from('pdv_config')
          .select('cardapio_loja_aberta')
          .eq('empresa_id', empresaId)
          .single();

        if (!error && statusData && statusData.cardapio_loja_aberta !== lojaAberta) {
          setLojaAberta(statusData.cardapio_loja_aberta);
        }
      } catch (error) {
        // Erro no polling removido
      }
    }, 3000); // Verificar a cada 3 segundos

    return () => {
      clearInterval(interval);
    };
  }, [empresaId, lojaAberta]);



  // Realtime para horários de atendimento
  useEffect(() => {
    if (!empresaId) return;

    const channel = supabase
      .channel(`teste_horarios_${empresaId}_${Date.now()}`, {
        config: {
          broadcast: { self: true }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'horario_atendimento',
          filter: `empresa_id=eq.${empresaId}`
        },
        (payload) => {
          // Forçar atualização do status da loja
          setTimeout(async () => {
            try {
              // Buscar configuração atual
              const { data: config } = await supabase
                .from('pdv_config')
                .select('cardapio_abertura_tipo, cardapio_loja_aberta')
                .eq('empresa_id', empresaId)
                .single();

              if (config?.cardapio_abertura_tipo === 'automatico') {

                const now = new Date();
                const currentDay = now.getDay();
                const currentTime = now.getHours() * 60 + now.getMinutes();

                const { data: horario } = await supabase
                  .from('horario_atendimento')
                  .select('*')
                  .eq('empresa_id', empresaId)
                  .eq('dia_semana', currentDay)
                  .single();



                if (horario) {
                  const [horaAbertura, minutoAbertura] = horario.hora_abertura.split(':').map(Number);
                  const [horaFechamento, minutoFechamento] = horario.hora_fechamento.split(':').map(Number);
                  const aberturaMinutos = horaAbertura * 60 + minutoAbertura;
                  const fechamentoMinutos = horaFechamento * 60 + minutoFechamento;
                  const shouldBeOpen = currentTime >= aberturaMinutos && currentTime <= fechamentoMinutos;

                  if (shouldBeOpen !== lojaAberta) {
                    setLojaAberta(shouldBeOpen);
                  }
                } else {
                  if (lojaAberta) {
                    setLojaAberta(false);
                  }
                }
              }
            } catch (error) {
              // Erro ao verificar horários removido
            }
          }, 1000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [empresaId]);

  // Carregar modo automático e calcular próxima abertura
  useEffect(() => {
    const carregarModoAutomatico = async () => {
      if (!empresaId) return;

      try {
        const { data: configData } = await supabase
          .from('pdv_config')
          .select('cardapio_abertura_tipo')
          .eq('empresa_id', empresaId)
          .single();

        const isAutomatico = configData?.cardapio_abertura_tipo === 'automatico';
        setModoAutomatico(isAutomatico);

        if (isAutomatico && lojaAberta === false) {
          calcularProximaAbertura();
        }
      } catch (error) {
        // Erro ao carregar modo automático removido
      }
    };

    carregarModoAutomatico();
  }, [empresaId, lojaAberta, horarios]);

  // Atualizar contagem regressiva a cada segundo
  useEffect(() => {
    if (!modoAutomatico || lojaAberta !== false || !proximaAbertura) {
      return;
    }

    const interval = setInterval(() => {
      formatarContadorRegressivo();
    }, 1000);

    // Executar imediatamente
    formatarContadorRegressivo();

    return () => clearInterval(interval);
  }, [modoAutomatico, lojaAberta, proximaAbertura]);

  // Recalcular próxima abertura quando horários mudarem
  useEffect(() => {
    if (modoAutomatico && lojaAberta === false) {
      calcularProximaAbertura();
    }
  }, [horarios, modoAutomatico, lojaAberta]);

  // Calcular próximo fechamento quando necessário
  useEffect(() => {
    if (modoAutomatico && lojaAberta === true) {
      calcularProximoFechamento();
    }
  }, [horarios, modoAutomatico, lojaAberta]);

  // Atualizar contagem regressiva de fechamento a cada segundo
  useEffect(() => {
    if (!modoAutomatico || !mostrarAvisoFechamento || !proximoFechamento) {
      return;
    }

    const interval = setInterval(() => {
      formatarContadorFechamento();
    }, 1000);

    // Executar imediatamente
    formatarContadorFechamento();

    return () => clearInterval(interval);
  }, [modoAutomatico, mostrarAvisoFechamento, proximoFechamento]);

  // Recalcular fechamento quando horários mudarem
  useEffect(() => {
    if (modoAutomatico && lojaAberta === true) {
      calcularProximoFechamento();
    }
  }, [horarios, modoAutomatico, lojaAberta]);







  // Fechar carrinho automaticamente quando não há itens
  useEffect(() => {
    const totalItens = obterQuantidadeTotalItens();
    if (totalItens === 0 && carrinhoAberto) {
      setCarrinhoAberto(false);
    }
  }, [itensCarrinhoSeparados, carrinhoAberto]);

  // ✅ LIMPAR LOCALSTORAGE ANTIGO QUE PODE ESTAR INTERFERINDO
  useEffect(() => {
    if (empresaId) {
      try {
        // Limpar dados antigos do localStorage que podem estar interferindo
        const chaves = [
          `carrinho_${empresaId}`,
          `carrinho_ordem_${empresaId}`,
          `carrinho_adicionais_${empresaId}`,
          `tabelas_selecionadas_${empresaId}`,
          `precos_produtos_${empresaId}`
        ];

        chaves.forEach(chave => {
          if (localStorage.getItem(chave)) {
            console.log('🧹 Removendo localStorage antigo:', chave);
            localStorage.removeItem(chave);
          }
        });
      } catch (error) {
        console.error('Erro ao limpar localStorage:', error);
      }
    }
  }, [empresaId]);

  // localStorage removido - carrinho não persiste entre reloads

  // Validar e filtrar carrinho quando produtos estão disponíveis
  useEffect(() => {
    if (produtos.length > 0 && Object.keys(quantidadesProdutos).length > 0) {
      const carrinhoFiltrado: Record<string, number> = {};
      Object.entries(quantidadesProdutos).forEach(([produtoId, quantidade]) => {
        const produtoExiste = produtos.some(p => p.id === produtoId);
        if (produtoExiste && quantidade > 0) {
          carrinhoFiltrado[produtoId] = quantidade;
        }
      });

      // Só atualizar se houve mudanças
      if (JSON.stringify(carrinhoFiltrado) !== JSON.stringify(quantidadesProdutos)) {
        setQuantidadesProdutos(carrinhoFiltrado);
      }
    }
  }, [produtos]);

  // Atualizar validação de quantidade mínima sempre que adicionais mudarem
  useEffect(() => {
    if (produtos.length > 0) {
      atualizarValidacaoQuantidadeMinima();
    }
  }, [adicionaisSelecionados, produtos]);

  // ✅ LIMPAR ADICIONAIS INVÁLIDOS QUANDO TABELA DE PREÇO MUDA
  useEffect(() => {
    if (!trabalhaComTabelaPrecos || produtos.length === 0) return;

    // Para cada produto que tem tabela selecionada
    Object.keys(tabelasSelecionadas).forEach(produtoId => {
      const adicionaisItem = adicionaisSelecionados[produtoId];
      if (!adicionaisItem) return;

      // Verificar quais adicionais devem ser removidos
      const adicionaisParaRemover: string[] = [];
      Object.keys(adicionaisItem).forEach(adicionalId => {
        if (!adicionalDeveSerExibido(produtoId, adicionalId)) {
          adicionaisParaRemover.push(adicionalId);
        }
      });

      // Remover adicionais inválidos
      if (adicionaisParaRemover.length > 0) {
        setAdicionaisSelecionados(prev => {
          const novosAdicionais = { ...prev };
          if (novosAdicionais[produtoId]) {
            adicionaisParaRemover.forEach(adicionalId => {
              delete novosAdicionais[produtoId][adicionalId];
            });

            // Se não sobrou nenhum adicional, remover o produto do objeto
            if (Object.keys(novosAdicionais[produtoId]).length === 0) {
              delete novosAdicionais[produtoId];
            }
          }
          return novosAdicionais;
        });
      }
    });
  }, [tabelasSelecionadas, trabalhaComTabelaPrecos, produtos, adicionaisSelecionados]);



  const carregarDadosCardapio = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Buscar configuração PDV pelo slug personalizado
      const { data: pdvConfigData, error: configError } = await supabase
        .from('pdv_config')
        .select('empresa_id, cardapio_url_personalizada, modo_escuro_cardapio, exibir_fotos_itens_cardapio, cardapio_fotos_minimizadas, logo_url, cardapio_digital, trabalha_com_pizzas, ocultar_grupos_cardapio')
        .eq('cardapio_url_personalizada', slug)
        .single();

      if (configError || !pdvConfigData) {
        setError('Cardápio não encontrado ou não está disponível.');
        return;
      }

      // 2. Buscar dados da empresa
      const { data: empresaData, error: empresaError } = await supabase
        .from('empresas')
        .select('id, razao_social, nome_fantasia, whatsapp, telefones, endereco, numero, bairro, cidade, estado')
        .eq('id', pdvConfigData.empresa_id)
        .single();

      if (empresaError || !empresaData) {
        setError('Dados da empresa não encontrados.');
        return;
      }

      // Adicionar logo_url da configuração PDV aos dados da empresa
      const empresaComLogo = {
        ...empresaData,
        logo_url: pdvConfigData.logo_url || ''
      };

      setEmpresa(empresaComLogo);

      // Definir o ID da empresa para o realtime
      setEmpresaId(empresaComLogo.id);

      // 2.0. Carregar configuração de taxa de entrega
      const { data: taxaConfigData } = await supabase
        .from('taxa_entrega_config')
        .select('habilitado, tipo')
        .eq('empresa_id', empresaComLogo.id)
        .single();

      if (taxaConfigData?.habilitado) {
        console.log('🚚 Taxa de entrega habilitada:', taxaConfigData);
        setTaxaEntregaConfig(taxaConfigData);

        // Se for por bairro, carregar lista de bairros
        if (taxaConfigData.tipo === 'bairro') {
          const { data: bairrosData } = await supabase
            .from('taxa_entrega')
            .select('id, bairro, valor, tempo_entrega')
            .eq('empresa_id', empresaComLogo.id)
            .order('bairro');

          console.log('🏘️ Bairros carregados:', bairrosData);
          if (bairrosData) {
            setBairrosDisponiveis(bairrosData);
          }
        }

        // Mostrar modal de validação de área apenas se não foi validada ainda
        const areaJaValidada = localStorage.getItem(`area_validada_${empresaComLogo.id}`);
        console.log('✅ Área já validada?', areaJaValidada);
        console.log('🏢 Empresa ID:', empresaComLogo.id);
        console.log('🚚 Taxa config:', taxaConfigData);

        // TESTE: Sempre mostrar modal para debug
        setTimeout(() => {
          console.log('📋 Forçando abertura do modal para teste');
          setModalAreaEntregaAberto(true);
        }, 2000);

        if (!areaJaValidada) {
          console.log('📋 Abrindo modal de validação de área');
          setModalAreaEntregaAberto(true);
        } else {
          setAreaValidada(true);
        }
      } else {
        console.log('❌ Taxa de entrega não habilitada ou não encontrada');
      }

      // 2.1. Carregar configuração de tabela de preços
      const { data: tabelaPrecoConfig } = await supabase
        .from('tabela_preco_config')
        .select('trabalha_com_tabela_precos')
        .eq('empresa_id', empresaComLogo.id)
        .single();

      if (tabelaPrecoConfig?.trabalha_com_tabela_precos) {
        setTrabalhaComTabelaPrecos(true);

        // Carregar tabelas de preços ativas
        const { data: tabelasData, error: tabelasError } = await supabase
          .from('tabela_de_preco')
          .select('id, nome, quantidade_sabores')
          .eq('empresa_id', empresaComLogo.id)
          .eq('ativo', true)
          .eq('deletado', false)
          .order('created_at', { ascending: true });

        if (tabelasData && tabelasData.length > 0) {
          setTabelasPrecos(tabelasData);

          // Carregar preços dos produtos para as tabelas
          const { data: precosData, error: precosError } = await supabase
            .from('produto_precos')
            .select('produto_id, tabela_preco_id, preco')
            .eq('empresa_id', empresaComLogo.id)
            .gt('preco', 0); // Apenas preços maiores que 0

          if (precosData && precosData.length > 0) {
            const precosMap: {[produtoId: string]: {[tabelaId: string]: number}} = {};

            precosData.forEach(item => {
              if (!precosMap[item.produto_id]) {
                precosMap[item.produto_id] = {};
              }
              precosMap[item.produto_id][item.tabela_preco_id] = item.preco;
            });

            setProdutoPrecos(precosMap);
          }

          // Carregar preços dos adicionais para as tabelas
          const { data: adicionaisPrecosData, error: adicionaisPrecosError } = await supabase
            .from('adicionais_precos')
            .select('adicional_item_id, tabela_preco_id, preco')
            .eq('empresa_id', empresaComLogo.id)
            .gt('preco', 0); // Apenas preços maiores que 0

          if (adicionaisPrecosData && adicionaisPrecosData.length > 0) {
            const adicionaisPrecosMap: {[adicionalId: string]: {[tabelaId: string]: number}} = {};

            adicionaisPrecosData.forEach(item => {
              if (!adicionaisPrecosMap[item.adicional_item_id]) {
                adicionaisPrecosMap[item.adicional_item_id] = {};
              }
              adicionaisPrecosMap[item.adicional_item_id][item.tabela_preco_id] = item.preco;
            });

            setAdicionaisPrecos(adicionaisPrecosMap);
          }
        }
      }

      // Configurar tema e exibição de fotos baseado na configuração da empresa
      setConfig(prev => ({
        ...prev,
        modo_escuro: pdvConfigData.modo_escuro_cardapio || false,
        mostrar_fotos: pdvConfigData.exibir_fotos_itens_cardapio !== false, // Default true se não definido
        cardapio_fotos_minimizadas: pdvConfigData.cardapio_fotos_minimizadas || false,
        trabalha_com_pizzas: pdvConfigData.trabalha_com_pizzas || false,
        ocultar_grupos_cardapio: pdvConfigData.ocultar_grupos_cardapio || false
      }));

      // 3. Buscar produtos ativos da empresa com unidades de medida
      // ✅ FILTRO: Apenas produtos com cardapio_digital = true
      const { data: produtosData, error: produtosError } = await supabase
        .from('produtos')
        .select(`
          id,
          nome,
          descricao,
          preco,
          grupo_id,
          ativo,
          deletado,
          cardapio_digital,
          ordenacao_cardapio_habilitada,
          ordenacao_cardapio_digital,
          promocao,
          tipo_desconto,
          valor_desconto,
          exibir_promocao_cardapio,
          desconto_quantidade,
          quantidade_minima,
          tipo_desconto_quantidade,
          percentual_desconto_quantidade,
          valor_desconto_quantidade,
          exibir_desconto_qtd_minimo_no_cardapio_digital,
          produto_alcoolico,
          estoque_atual,
          estoque_minimo,
          controla_estoque_cardapio,
          created_at,
          unidade_medida_id,
          unidade_medida:unidade_medida_id (
            id,
            sigla,
            nome,
            fracionado
          ),
          produto_fotos (
            id,
            url,
            principal
          )
        `)
        .eq('empresa_id', pdvConfigData.empresa_id)
        .eq('ativo', true)
        .eq('cardapio_digital', true)
        .neq('deletado', true); // ✅ FILTRO: Excluir produtos deletados (soft delete)

      if (produtosError) {
        // Erro ao carregar produtos removido
        setError('Erro ao carregar produtos do cardápio.');
        return;
      }

      // Logs de produtos removidos



      // 4. Buscar todas as fotos dos produtos
      const produtosIds = produtosData?.map(p => p.id) || [];
      let todasFotosData: any[] = [];

      if (produtosIds.length > 0) {
        const { data: fotosResult, error: fotosError } = await supabase
          .from('produto_fotos')
          .select('id, produto_id, url, principal')
          .in('produto_id', produtosIds)
          .order('principal', { ascending: false }); // Principal primeiro

        if (!fotosError && fotosResult) {
          todasFotosData = fotosResult;
        }
      }

      // 5. Buscar adicionais dos produtos
      let adicionaisData: any[] = [];
      if (produtosIds.length > 0) {
        const { data: adicionaisResult, error: adicionaisError } = await supabase
          .from('produtos_opcoes_adicionais')
          .select(`
            produto_id,
            opcoes_adicionais!inner (
              id,
              nome,
              quantidade_minima,
              quantidade_maxima,
              opcoes_adicionais_itens (
                id,
                nome,
                preco
              )
            )
          `)
          .in('produto_id', produtosIds)
          .eq('deletado', false);

        if (!adicionaisError && adicionaisResult) {
          adicionaisData = adicionaisResult;
        }
      }

      // 5. Buscar grupos dos produtos
      const gruposIds = [...new Set(produtosData?.map(p => p.grupo_id).filter(Boolean))];
      // Log de grupos removido

      let gruposData: any[] = [];

      if (gruposIds.length > 0) {
        const { data: gruposResult, error: gruposError } = await supabase
          .from('grupos')
          .select('id, nome, ordenacao_cardapio_habilitada, ordenacao_cardapio_digital, exibir_emoji_cardapio, emoji_selecionado')
          .in('id', gruposIds);

        if (!gruposError && gruposResult) {
          gruposData = gruposResult;
          // Logs de grupos removidos
        } else {
          // Erro ao carregar grupos removido
        }
      } else {
        // Log de grupos removido
      }

      // 6. Buscar horários de atendimento
      const { data: horariosData, error: horariosError } = await supabase
        .from('horario_atendimento')
        .select('id, dia_semana, hora_abertura, hora_fechamento')
        .eq('empresa_id', empresaComLogo.id)
        .order('dia_semana');

      if (!horariosError && horariosData) {
        setHorarios(horariosData);
      }

      // 7. Buscar status da loja (configuração PDV)
      const { data: statusLojaData, error: statusLojaError } = await supabase
        .from('pdv_config')
        .select('cardapio_loja_aberta, cardapio_abertura_tipo')
        .eq('empresa_id', empresaComLogo.id)
        .single();

      if (!statusLojaError && statusLojaData) {
        // Usar exatamente o valor do banco, sem fallbacks
        const statusInicial = statusLojaData.cardapio_loja_aberta;
        setLojaAberta(statusInicial);
      } else {
        // Se não conseguir carregar, não assumir nenhum valor padrão
        setLojaAberta(null);
      }

      // Processar produtos com nome do grupo, fotos e adicionais
      const produtosProcessados = produtosData?.map(produto => {
        const grupo = gruposData.find(g => g.id === produto.grupo_id);
        const fotosProduto = todasFotosData.filter(f => f.produto_id === produto.id);
        const fotoPrincipal = fotosProduto.find(f => f.principal) || fotosProduto[0];

        // Buscar adicionais do produto
        const adicionaisProduto = adicionaisData.filter(a => a.produto_id === produto.id);
        const opcoesAdicionais = adicionaisProduto.map(a => ({
          id: a.opcoes_adicionais.id,
          nome: a.opcoes_adicionais.nome,
          quantidade_minima: a.opcoes_adicionais.quantidade_minima || 0,
          quantidade_maxima: a.opcoes_adicionais.quantidade_maxima || 0, // ✅ CAMPO FALTANTE ADICIONADO
          itens: a.opcoes_adicionais.opcoes_adicionais_itens || []
        }));

        return {
          ...produto,
          grupo_nome: grupo?.nome || 'Sem categoria',
          foto_url: fotoPrincipal?.url || null,
          produto_fotos: fotosProduto.map(f => ({
            id: f.id,
            url: f.url,
            principal: f.principal
          })),
          fotos_count: fotosProduto.length,
          opcoes_adicionais: opcoesAdicionais
        };
      }) || [];

      setProdutos(produtosProcessados);



      // ✅ CORREÇÃO: Manter TODOS os campos de ordenação dos grupos
      const gruposUnicos = gruposData.map(grupo => ({
        id: grupo.id,
        nome: grupo.nome,
        ordenacao_cardapio_habilitada: grupo.ordenacao_cardapio_habilitada,
        ordenacao_cardapio_digital: grupo.ordenacao_cardapio_digital,
        exibir_emoji_cardapio: grupo.exibir_emoji_cardapio,
        emoji_selecionado: grupo.emoji_selecionado
      }));

      // Log de grupos únicos removido
      setGrupos(gruposUnicos);

    } catch (error: any) {
      console.error('Erro ao carregar cardápio:', error);
      setError('Erro interno do servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar produtos por grupo e termo de pesquisa
  const produtosFiltrados = produtos.filter(produto => {
    // Filtro por grupo
    const passaFiltroGrupo = grupoSelecionado === 'todos' || produto.grupo_id === grupoSelecionado;

    // Filtro por termo de pesquisa (busca no nome e descrição)
    const passaFiltroPesquisa = termoPesquisa === '' ||
      produto.nome.toLowerCase().includes(termoPesquisa.toLowerCase()) ||
      (produto.descricao && produto.descricao.toLowerCase().includes(termoPesquisa.toLowerCase()));

    return passaFiltroGrupo && passaFiltroPesquisa;
  });

  // Agrupar produtos por categoria com ordenação personalizada
  const produtosAgrupados = () => {
    if (grupoSelecionado !== 'todos') {
      // Se um grupo específico está selecionado, retornar apenas esse grupo
      const grupoAtual = grupos.find(g => g.id === grupoSelecionado);
      if (!grupoAtual) return [];

      // Ordenar produtos do grupo selecionado
      const produtosOrdenados = produtosFiltrados.sort((a, b) => {
        const aTemOrdenacao = a.ordenacao_cardapio_habilitada && a.ordenacao_cardapio_digital;
        const bTemOrdenacao = b.ordenacao_cardapio_habilitada && b.ordenacao_cardapio_digital;

        if (aTemOrdenacao && bTemOrdenacao) {
          return a.ordenacao_cardapio_digital - b.ordenacao_cardapio_digital;
        }
        if (aTemOrdenacao && !bTemOrdenacao) return -1;
        if (!aTemOrdenacao && bTemOrdenacao) return 1;
        // ✅ ALTERAÇÃO: Ordenar por data de criação (mais novos primeiro) ao invés de alfabético
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA; // Mais novos primeiro
      });

      return [{
        grupo: grupoAtual,
        produtos: produtosOrdenados
      }];
    }

    // Se "todos" está selecionado, aplicar lógica de ordenação baseada na configuração

    // Se "Remover nome dos grupos" estiver ATIVADO - ignora ordenação de grupos
    if (config.ocultar_grupos_cardapio) {
      // Coleta todos os produtos de todos os grupos em uma única lista
      const todosProdutos = produtosFiltrados.map(produto => {
        const grupo = grupos.find(g => g.id === produto.grupo_id);
        return { ...produto, grupo };
      });

      // ✅ CORREÇÃO: Ordena produtos com validação correta (grupos ocultos)
      const produtosOrdenados = todosProdutos.sort((a, b) => {
        const aTemOrdenacao = a.ordenacao_cardapio_habilitada &&
                             a.ordenacao_cardapio_digital !== null &&
                             a.ordenacao_cardapio_digital !== undefined;
        const bTemOrdenacao = b.ordenacao_cardapio_habilitada &&
                             b.ordenacao_cardapio_digital !== null &&
                             b.ordenacao_cardapio_digital !== undefined;



        if (aTemOrdenacao && bTemOrdenacao) {
          const posicaoA = Number(a.ordenacao_cardapio_digital);
          const posicaoB = Number(b.ordenacao_cardapio_digital);
          const resultado = posicaoA - posicaoB;
          return resultado;
        }
        if (aTemOrdenacao && !bTemOrdenacao) return -1;
        if (!aTemOrdenacao && bTemOrdenacao) return 1;
        // ✅ ALTERAÇÃO: Ordenar por data de criação (mais novos primeiro) ao invés de alfabético
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA; // Mais novos primeiro
      });

      // Retorna como um único "grupo" virtual
      return [{
        grupo: { id: 'todos', nome: 'Todos os Produtos' },
        produtos: produtosOrdenados
      }];
    }

    // Se "Remover nome dos grupos" estiver DESATIVADO - considera ordenação de grupos
    else {
      // Agrupar produtos por categoria
      const gruposComProdutos = grupos.map(grupo => ({
        grupo,
        produtos: produtosFiltrados.filter(produto => produto.grupo_id === grupo.id)
      })).filter(item => item.produtos.length > 0);

      // Adicionar produtos sem categoria
      const produtosSemCategoria = produtosFiltrados.filter(produto => !produto.grupo_id);
      if (produtosSemCategoria.length > 0) {
        gruposComProdutos.push({
          grupo: { id: 'sem-categoria', nome: 'Sem categoria' },
          produtos: produtosSemCategoria
        });
      }

      // ✅ CORREÇÃO: Ordena grupos com validação correta de ordenação
      const gruposOrdenados = gruposComProdutos.sort((a, b) => {
        // ✅ CORREÇÃO: Verificar se ordenacao_cardapio_digital não é null/undefined
        const aTemOrdenacao = a.grupo.ordenacao_cardapio_habilitada &&
                             a.grupo.ordenacao_cardapio_digital !== null &&
                             a.grupo.ordenacao_cardapio_digital !== undefined;
        const bTemOrdenacao = b.grupo.ordenacao_cardapio_habilitada &&
                             b.grupo.ordenacao_cardapio_digital !== null &&
                             b.grupo.ordenacao_cardapio_digital !== undefined;



        // Se ambos têm ordenação, ordenar por número (MENOR número = PRIMEIRO no topo)
        if (aTemOrdenacao && bTemOrdenacao) {
          const posicaoA = Number(a.grupo.ordenacao_cardapio_digital);
          const posicaoB = Number(b.grupo.ordenacao_cardapio_digital);
          const resultado = posicaoA - posicaoB; // Posição 1 vem antes de posição 2
          return resultado;
        }
        // Se apenas A tem ordenação, A vem primeiro
        if (aTemOrdenacao && !bTemOrdenacao) {
          return -1;
        }
        // Se apenas B tem ordenação, B vem primeiro
        if (!aTemOrdenacao && bTemOrdenacao) {
          return 1;
        }
        // Se nenhum tem ordenação, ordem alfabética
        const resultado = a.grupo.nome.localeCompare(b.grupo.nome);
        return resultado;
      });



      // Ordena produtos dentro de cada grupo
      gruposOrdenados.forEach(item => {
        item.produtos.sort((a, b) => {
          const aTemOrdenacao = a.ordenacao_cardapio_habilitada && a.ordenacao_cardapio_digital;
          const bTemOrdenacao = b.ordenacao_cardapio_habilitada && b.ordenacao_cardapio_digital;

          if (aTemOrdenacao && bTemOrdenacao) {
            return a.ordenacao_cardapio_digital - b.ordenacao_cardapio_digital;
          }
          if (aTemOrdenacao && !bTemOrdenacao) return -1;
          if (!aTemOrdenacao && bTemOrdenacao) return 1;
          // ✅ ALTERAÇÃO: Ordenar por data de criação (mais novos primeiro) ao invés de alfabético
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA; // Mais novos primeiro
        });
      });

      return gruposOrdenados;
    }
  };

  const formatarPreco = (preco: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(preco);
  };

  // Função para formatar quantidade baseada na unidade de medida (similar ao PDV)
  const formatarQuantidade = (quantidade: number, unidadeMedida?: any) => {
    // Se a unidade de medida permite fracionamento, mostrar 3 casas decimais
    if (unidadeMedida?.fracionado) {
      return quantidade.toFixed(3);
    }
    // Se não permite fracionamento, mostrar como número inteiro
    return quantidade.toString();
  };

  // Função para obter a foto principal do produto (similar ao PDV)
  const getFotoPrincipal = (produto: any) => {
    if (!produto?.produto_fotos || produto.produto_fotos.length === 0) {
      return null;
    }

    // Buscar foto marcada como principal
    const fotoPrincipal = produto.produto_fotos.find((foto: any) => foto.principal);

    // Se não encontrar foto principal, retornar a primeira
    return fotoPrincipal || produto.produto_fotos[0];
  };

  // Função para abrir galeria de fotos
  const abrirGaleriaFotos = (produto: Produto, fotoIndex: number = 0) => {
    if (!produto.produto_fotos || produto.produto_fotos.length === 0) return;

    setFotosProdutoSelecionado(produto.produto_fotos);
    setFotoInicialIndex(fotoIndex);
    setGaleriaAberta(true);
  };

  // Funções para controlar adicionais
  const toggleAdicionalOpcao = (produtoId: string, opcaoId: string) => {
    setAdicionaisExpandidos(prev => ({
      ...prev,
      [produtoId]: {
        ...prev[produtoId],
        [opcaoId]: !prev[produtoId]?.[opcaoId]
      }
    }));
  };

  const incrementarAdicional = (produtoId: string, itemId: string) => {
    // ✅ VERIFICAR SE PODE INCREMENTAR (QUANTIDADE MÁXIMA)
    if (!podeIncrementarAdicional(produtoId, itemId)) {
      // Encontrar o nome da opção para mostrar mensagem mais clara
      const produto = produtos.find(p => p.id === produtoId);
      const opcaoDoItem = produto?.opcoes_adicionais?.find(opcao =>
        opcao.itens.some(item => item.id === itemId)
      );

      const nomeOpcao = opcaoDoItem?.nome || 'esta opção';
      const quantidadeMaxima = opcaoDoItem?.quantidade_maxima || 0;

      showMessage('error', `Quantidade máxima de ${quantidadeMaxima} ${quantidadeMaxima === 1 ? 'item' : 'itens'} atingida para ${nomeOpcao}.`);
      return;
    }

    const quantidadeProduto = obterQuantidadeSelecionada(produtoId);
    const quantidadeAtualAdicional = obterQuantidadeAdicional(produtoId, itemId);

    // Se é a primeira vez clicando no adicional, começar com a quantidade do produto
    const novaQuantidade = quantidadeAtualAdicional === 0 ? quantidadeProduto : quantidadeAtualAdicional + 1;

    setAdicionaisSelecionados(prev => ({
      ...prev,
      [produtoId]: {
        ...prev[produtoId],
        [itemId]: novaQuantidade
      }
    }));

    // Efeito visual de chacoalhar o produto quando adicional é adicionado
    setItemChacoalhando(produtoId);
    setTimeout(() => setItemChacoalhando(null), 600);

    // Mover produto para o topo quando adicional é incrementado
    setOrdemAdicaoItens(prev => ({
      ...prev,
      [produtoId]: Date.now() // Atualiza timestamp para mover para topo
    }));

    // Se o carrinho não estiver aberto, abrir automaticamente
    if (!carrinhoAberto) {
      setCarrinhoAberto(true);
      setCarrinhoRecemAberto(true);
      setTimeout(() => setCarrinhoRecemAberto(false), 2000);
    }
  };

  const decrementarAdicional = (produtoId: string, itemId: string) => {
    const quantidadeAtual = obterQuantidadeAdicional(produtoId, itemId);
    const quantidadeProduto = obterQuantidadeSelecionada(produtoId);

    setAdicionaisSelecionados(prev => {
      // Se a quantidade atual for igual à quantidade do produto, remover o adicional
      if (quantidadeAtual <= quantidadeProduto) {
        const novosProdutos = { ...prev };
        if (novosProdutos[produtoId]) {
          delete novosProdutos[produtoId][itemId];
          if (Object.keys(novosProdutos[produtoId]).length === 0) {
            delete novosProdutos[produtoId];
          }
        }
        return novosProdutos;
      }

      // Caso contrário, decrementar normalmente
      return {
        ...prev,
        [produtoId]: {
          ...prev[produtoId],
          [itemId]: quantidadeAtual - 1
        }
      };
    });

    // Efeito visual sutil quando remove adicional
    if (quantidadeAtual > 0) {
      setItemChacoalhando(produtoId);
      setTimeout(() => setItemChacoalhando(null), 400);


    }
  };

  const obterQuantidadeAdicional = (produtoId: string, itemId: string): number => {
    return adicionaisSelecionados[produtoId]?.[itemId] || 0;
  };

  // ✅ FUNÇÃO PARA VERIFICAR SE PODE DECREMENTAR ADICIONAL
  const podeDecrementarAdicional = (produtoId: string, itemId: string): boolean => {
    const quantidadeAdicional = obterQuantidadeAdicional(produtoId, itemId);
    const quantidadeProduto = obterQuantidadeSelecionada(produtoId);

    // Só pode decrementar se a quantidade do adicional for maior que a quantidade do produto
    return quantidadeAdicional > quantidadeProduto;
  };

  // ✅ FUNÇÃO PARA VERIFICAR SE PODE INCREMENTAR ADICIONAL (CONSIDERANDO QUANTIDADE MÁXIMA)
  const podeIncrementarAdicional = (produtoId: string, itemId: string): boolean => {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto?.opcoes_adicionais) return true;

    // Encontrar a opção que contém este item
    const opcaoDoItem = produto.opcoes_adicionais.find(opcao =>
      opcao.itens.some(item => item.id === itemId)
    );

    if (!opcaoDoItem) return true;

    // Se não tem quantidade máxima definida, pode incrementar
    if (!opcaoDoItem.quantidade_maxima || opcaoDoItem.quantidade_maxima <= 0) return true;

    // Verificar se incrementar este item faria a opção exceder o máximo
    const quantidadeAtualOpcao = obterQuantidadeTotalOpcao(produtoId, opcaoDoItem.id);
    return quantidadeAtualOpcao < opcaoDoItem.quantidade_maxima;
  };

  // ✅ FUNÇÃO PARA OBTER ADICIONAIS VÁLIDOS DE UM PRODUTO
  const obterAdicionaisValidosProduto = (produtoId: string) => {
    const produto = produtos.find(p => p.id === produtoId);
    const adicionaisItem = adicionaisSelecionados[produtoId];

    if (!produto || !adicionaisItem) return [];

    const adicionaisValidos = [];

    // Para cada adicional selecionado
    Object.entries(adicionaisItem).forEach(([itemId, quantidade]) => {
      if (quantidade > 0) {
        // Encontrar o adicional nas opções do produto
        produto.opcoes_adicionais?.forEach(opcao => {
          const adicional = opcao.itens?.find(item => item.id === itemId);
          if (adicional) {
            adicionaisValidos.push({
              id: adicional.id,
              nome: adicional.nome,
              preco: obterPrecoAdicional(produtoId, itemId), // ✅ USAR PREÇO DA TABELA
              quantidade: quantidade
            });
          }
        });
      }
    });

    return adicionaisValidos;
  };

  // Função para obter quantidade total selecionada de uma opção
  const obterQuantidadeTotalOpcao = (produtoId: string, opcaoId: string): number => {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto?.opcoes_adicionais) return 0;

    const opcao = produto.opcoes_adicionais.find(o => o.id === opcaoId);
    if (!opcao) return 0;

    return opcao.itens.reduce((total, item) => {
      return total + obterQuantidadeAdicional(produtoId, item.id);
    }, 0);
  };

  // Função para verificar se uma opção atingiu a quantidade mínima
  const opcaoAtingiuMinimo = (produtoId: string, opcaoId: string): boolean => {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto?.opcoes_adicionais) return true;

    const opcao = produto.opcoes_adicionais.find(o => o.id === opcaoId);
    if (!opcao || !opcao.quantidade_minima || opcao.quantidade_minima <= 0) return true;

    const quantidadeTotal = obterQuantidadeTotalOpcao(produtoId, opcaoId);
    return quantidadeTotal >= opcao.quantidade_minima;
  };

  // Função para verificar se uma opção excedeu a quantidade máxima
  const opcaoExcedeuMaximo = (produtoId: string, opcaoId: string): boolean => {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto?.opcoes_adicionais) return false;

    const opcao = produto.opcoes_adicionais.find(o => o.id === opcaoId);
    if (!opcao || !opcao.quantidade_maxima || opcao.quantidade_maxima <= 0) return false;

    const quantidadeTotal = obterQuantidadeTotalOpcao(produtoId, opcaoId);
    return quantidadeTotal > opcao.quantidade_maxima;
  };

  // Função para obter adicionais válidos para o carrinho (apenas os que atingiram quantidade mínima e não excederam máxima)
  const obterAdicionaisValidosParaCarrinho = (produtoId: string): Array<{id: string; nome: string; preco: number; quantidade: number}> => {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto?.opcoes_adicionais) return [];

    const adicionaisValidos: Array<{id: string; nome: string; preco: number; quantidade: number}> = [];

    produto.opcoes_adicionais.forEach(opcao => {
      // Só incluir adicionais de opções que atingiram a quantidade mínima E não excederam a máxima
      if (opcaoAtingiuMinimo(produtoId, opcao.id) && !opcaoExcedeuMaximo(produtoId, opcao.id)) {
        opcao.itens.forEach(item => {
          const quantidade = obterQuantidadeAdicional(produtoId, item.id);
          if (quantidade > 0 && adicionalDeveSerExibido(produtoId, item.id)) { // ✅ VERIFICAR SE DEVE SER EXIBIDO
            adicionaisValidos.push({
              id: item.id,
              nome: item.nome,
              preco: obterPrecoAdicional(produtoId, item.id), // ✅ USAR PREÇO DA TABELA
              quantidade: quantidade
            });
          }
        });
      }
    });

    return adicionaisValidos;
  };

  // Função para atualizar validação de quantidade mínima e máxima
  const atualizarValidacaoQuantidadeMinima = () => {
    const novaValidacaoMinima: {[produtoId: string]: {[opcaoId: string]: boolean}} = {};
    const novaValidacaoMaxima: {[produtoId: string]: {[opcaoId: string]: boolean}} = {};

    produtos.forEach(produto => {
      if (produto.opcoes_adicionais) {
        novaValidacaoMinima[produto.id] = {};
        novaValidacaoMaxima[produto.id] = {};
        produto.opcoes_adicionais.forEach(opcao => {
          novaValidacaoMinima[produto.id][opcao.id] = opcaoAtingiuMinimo(produto.id, opcao.id);
          novaValidacaoMaxima[produto.id][opcao.id] = opcaoExcedeuMaximo(produto.id, opcao.id);
        });
      }
    });

    setValidacaoQuantidadeMinima(novaValidacaoMinima);
    setValidacaoQuantidadeMaxima(novaValidacaoMaxima);
  };

  // Função para obter tabelas de preços com valores válidos para um produto
  const obterTabelasComPrecos = (produtoId: string): Array<{id: string; nome: string; preco: number; quantidade_sabores: number}> => {
    if (!trabalhaComTabelaPrecos || !produtoPrecos[produtoId]) {
      return [];
    }

    const resultado = tabelasPrecos
      .map(tabela => ({
        id: tabela.id,
        nome: tabela.nome,
        preco: produtoPrecos[produtoId][tabela.id] || 0,
        quantidade_sabores: tabela.quantidade_sabores || 1
      }))
      .filter(tabela => tabela.preco > 0); // Apenas tabelas com preço > 0

    return resultado;
  };

  // Função para obter preço do adicional conforme a tabela selecionada
  const obterPrecoAdicional = (produtoId: string, adicionalId: string): number => {
    // Se não trabalha com tabelas de preço, usar preço padrão do adicional
    if (!trabalhaComTabelaPrecos) {
      const produto = produtos.find(p => p.id === produtoId);
      if (produto?.opcoes_adicionais) {
        for (const opcao of produto.opcoes_adicionais) {
          const item = opcao.itens?.find(item => item.id === adicionalId);
          if (item) return item.preco || 0;
        }
      }
      return 0;
    }

    // Se trabalha com tabelas de preço, verificar se há tabela selecionada
    const tabelaSelecionadaId = tabelasSelecionadas[produtoId];
    if (tabelaSelecionadaId && adicionaisPrecos[adicionalId]?.[tabelaSelecionadaId]) {
      return adicionaisPrecos[adicionalId][tabelaSelecionadaId];
    }

    // Fallback: usar preço padrão do adicional
    const produto = produtos.find(p => p.id === produtoId);
    if (produto?.opcoes_adicionais) {
      for (const opcao of produto.opcoes_adicionais) {
        const item = opcao.itens?.find(item => item.id === adicionalId);
        if (item) return item.preco || 0;
      }
    }

    return 0;
  };

  // Função para verificar se adicional deve ser exibido (tem preço na tabela selecionada)
  const adicionalDeveSerExibido = (produtoId: string, adicionalId: string): boolean => {
    // Se não trabalha com tabelas de preço, sempre exibir
    if (!trabalhaComTabelaPrecos) {
      return true;
    }

    // Se trabalha com tabelas de preço, verificar se há tabela selecionada
    const tabelaSelecionadaId = tabelasSelecionadas[produtoId];
    if (!tabelaSelecionadaId) {
      // Se não há tabela selecionada, exibir todos
      return true;
    }

    // Verificar se o adicional tem preço na tabela selecionada
    return adicionaisPrecos[adicionalId]?.[tabelaSelecionadaId] > 0;
  };

  // Funções de localStorage removidas - carrinho não persiste entre reloads









  // Funções para controle de quantidade dos produtos (carrinho)
  const obterQuantidadeProduto = (produtoId: string): number => {
    return quantidadesProdutos[produtoId] || 0;
  };

  // Funções para controle de quantidades selecionadas (antes do carrinho)
  const obterQuantidadeSelecionada = (produtoId: string): number => {
    return quantidadesSelecionadas[produtoId] || 0;
  };

  // Função para calcular valor total incluindo adicionais selecionados
  const calcularValorTotalComAdicionais = (produtoId: string): number => {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return 0;

    const quantidadeSelecionada = obterQuantidadeSelecionada(produtoId);
    if (quantidadeSelecionada === 0) return 0;

    // ✅ USAR PREÇO FINAL DO PRODUTO (considerando tabela de preço + promoções)
    const precoFinal = obterPrecoFinalProduto(produtoId);

    // Valor base do produto (usando preço final com promoções)
    let valorTotal = precoFinal * quantidadeSelecionada;

    // Adicionar valor dos adicionais selecionados (usando preço da tabela selecionada)
    const adicionaisItem = adicionaisSelecionados[produtoId];
    if (adicionaisItem) {
      Object.entries(adicionaisItem).forEach(([itemId, quantidade]) => {
        if (quantidade > 0) {
          // Usar preço do adicional conforme a tabela selecionada
          const precoAdicional = obterPrecoAdicional(produtoId, itemId);
          if (precoAdicional > 0) {
            valorTotal += precoAdicional * quantidade * quantidadeSelecionada;
          }
        }
      });
    }

    return valorTotal;
  };

  const alterarQuantidadeSelecionada = (produtoId: string, novaQuantidade: number) => {
    const quantidadeAnterior = obterQuantidadeSelecionada(produtoId);

    setQuantidadesSelecionadas(prev => {
      if (novaQuantidade <= 0) {
        const nova = { ...prev };
        delete nova[produtoId];

        // ✅ LIMPAR TODOS os estados relacionados ao produto quando quantidade for 0
        limparEstadosProduto(produtoId);

        return nova;
      }
      return {
        ...prev,
        [produtoId]: novaQuantidade
      };
    });

    // ✅ AJUSTAR ADICIONAIS AUTOMATICAMENTE quando quantidade do produto mudar
    if (novaQuantidade > 0 && novaQuantidade !== quantidadeAnterior) {
      setAdicionaisSelecionados(prev => {
        const adicionaisAtuais = prev[produtoId] || {};
        const novosAdicionais = { ...adicionaisAtuais };

        // Para cada adicional existente, ajustar para no mínimo a nova quantidade do produto
        Object.keys(novosAdicionais).forEach(itemId => {
          const quantidadeAtualAdicional = novosAdicionais[itemId];
          // Se a quantidade do adicional for menor que a nova quantidade do produto, ajustar
          if (quantidadeAtualAdicional < novaQuantidade) {
            novosAdicionais[itemId] = novaQuantidade;
          }
        });

        return {
          ...prev,
          [produtoId]: novosAdicionais
        };
      });
    }
  };

  // Função para limpar todos os estados de um produto
  const limparEstadosProduto = (produtoId: string) => {
    // Limpar adicionais selecionados
    setAdicionaisSelecionados(prev => {
      const novo = { ...prev };
      delete novo[produtoId];
      return novo;
    });

    // Limpar observações
    setObservacoesSelecionadas(prev => {
      const novo = { ...prev };
      delete novo[produtoId];
      return novo;
    });

    // Limpar validação mínima de adicionais
    setValidacaoQuantidadeMinima(prev => {
      const novo = { ...prev };
      delete novo[produtoId];
      return novo;
    });

    // Limpar validação máxima de adicionais
    setValidacaoQuantidadeMaxima(prev => {
      const novo = { ...prev };
      delete novo[produtoId];
      return novo;
    });

    // Limpar ordem de adição
    setOrdemAdicaoItens(prev => {
      const novo = { ...prev };
      delete novo[produtoId];
      return novo;
    });

    // localStorage removido - não persiste entre reloads
  };

  const alterarQuantidadeProduto = (produtoId: string, novaQuantidade: number) => {
    if (novaQuantidade < 0) return;

    const quantidadeAnterior = quantidadesProdutos[produtoId] || 0;

    setQuantidadesProdutos(prev => {
      if (novaQuantidade === 0) {
        // Remover completamente o produto do estado quando quantidade for 0
        const nova = { ...prev };
        delete nova[produtoId];
        return nova;
      }
      return {
        ...prev,
        [produtoId]: novaQuantidade
      };
    });

    // Rastrear ordem de adição - SEMPRE que incrementar quantidade (mover para topo)
    if (novaQuantidade > quantidadeAnterior && novaQuantidade > 0) {
      setOrdemAdicaoItens(prev => ({
        ...prev,
        [produtoId]: Date.now() // Timestamp como ordem - sempre atualiza para mover para topo
      }));
    }

    // Remover da ordem e observação quando quantidade chega a zero
    if (novaQuantidade === 0) {
      setOrdemAdicaoItens(prev => {
        const nova = { ...prev };
        delete nova[produtoId];
        return nova;
      });

      // Limpar observação do produto
      setObservacoesProdutos(prev => {
        const nova = { ...prev };
        delete nova[produtoId];
        return nova;
      });
    }
  };

  // Função para verificar estoque em tempo real
  const verificarEstoqueTempoReal = async (produtoId: string, quantidadeSolicitada: number): Promise<{ temEstoque: boolean; estoqueAtual: number }> => {
    try {
      const { data: produtoData, error } = await supabase
        .from('produtos')
        .select('estoque_atual, nome')
        .eq('id', produtoId)
        .single();

      if (error) {
        console.error('Erro ao verificar estoque:', error);
        return { temEstoque: false, estoqueAtual: 0 };
      }

      const estoqueAtual = produtoData?.estoque_atual || 0;
      return {
        temEstoque: estoqueAtual >= quantidadeSolicitada,
        estoqueAtual: estoqueAtual
      };
    } catch (error) {
      console.error('Erro ao verificar estoque:', error);
      return { temEstoque: false, estoqueAtual: 0 };
    }
  };

  // Função para adicionar produto ao carrinho
  const adicionarAoCarrinho = async (produtoId: string) => {
    const produto = produtos.find(p => p.id === produtoId);

    // ✅ VERIFICAR ESTOQUE EM TEMPO REAL SE CONTROLE ESTIVER ATIVO (PRIMEIRA VALIDAÇÃO)
    if (produto && produto.controla_estoque_cardapio) {
      const quantidadeSolicitada = obterQuantidadeSelecionada(produtoId);

      if (quantidadeSolicitada > 0) {
        const { temEstoque, estoqueAtual } = await verificarEstoqueTempoReal(produtoId, quantidadeSolicitada);

        if (!temEstoque) {
          // Abrir modal de estoque insuficiente
          setDadosEstoqueInsuficiente({
            nomeProduto: produto.nome,
            quantidadeSolicitada: quantidadeSolicitada,
            estoqueDisponivel: estoqueAtual
          });
          setModalEstoqueInsuficiente(true);
          return;
        }
      }
    }

    // ✅ VERIFICAR SE É PRODUTO ALCOÓLICO (SEGUNDA VALIDAÇÃO)
    if (produto?.produto_alcoolico) {
      // Abrir modal de conscientização para produtos alcoólicos
      setProdutoAlcoolicoPendente(produtoId);
      setModalProdutoAlcoolico(true);
      return;
    }

    const quantidadeSelecionada = obterQuantidadeSelecionada(produtoId);

    // ✅ VERIFICAR SE PRECISA ABRIR MODAL DE ORGANIZAÇÃO
    const temAdicionais = produto?.opcoes_adicionais && produto.opcoes_adicionais.length > 0;
    const adicionaisValidos = obterAdicionaisValidosProduto(produtoId);

    if (temAdicionais && quantidadeSelecionada > 1 && adicionaisValidos.length > 0) {
      // Abrir modal de organização
      abrirModalOrganizacao(produtoId);
      return;
    }

    if (quantidadeSelecionada > 0) {
      // Gerar ID único para este item no carrinho
      const itemId = `${produtoId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // ✅ CALCULAR PREÇO COM DESCONTO POR QUANTIDADE (considerando tabela de preço + promoções + desconto por quantidade)
      const produto = produtos.find(p => p.id === produtoId);
      const precoProduto = produto ? calcularPrecoComDescontoQuantidade(produto, quantidadeSelecionada) : 0;
      const tabelaSelecionadaId = tabelasSelecionadas[produtoId] || null;

      // Criar item separado no carrinho
      const novoItem = {
        produtoId,
        quantidade: quantidadeSelecionada,
        precoProduto: precoProduto, // ✅ SALVAR PREÇO DA TABELA SELECIONADA
        tabelaPrecoId: tabelaSelecionadaId, // ✅ SALVAR ID DA TABELA PARA REFERÊNCIA
        adicionais: adicionaisSelecionados[produtoId] ? { ...adicionaisSelecionados[produtoId] } : {},
        observacao: observacoesSelecionadas[produtoId],
        ordemAdicao: Date.now()
      };

      // Adicionar ao estado de itens separados
      setItensCarrinhoSeparados(prev => ({
        ...prev,
        [itemId]: novoItem
      }));

      // Manter compatibilidade com sistema antigo (somar quantidades)
      alterarQuantidadeProduto(produtoId, quantidadeSelecionada);

      // Limpar quantidade e observação selecionadas
      alterarQuantidadeSelecionada(produtoId, 0);
      setObservacoesSelecionadas(prev => {
        const nova = { ...prev };
        delete nova[produtoId];
        return nova;
      });

      // Estado de adicionais pendentes removido - não é mais necessário

      // localStorage removido - não persiste entre reloads

      // Ativar efeito de entrada suave no item
      setItemChacoalhando(produtoId);
      setTimeout(() => setItemChacoalhando(null), 800);

      // Abrir carrinho automaticamente quando adicionar primeiro item
      const totalItensCarrinho = Object.keys(itensCarrinhoSeparados).length;
      if (totalItensCarrinho === 0) {
        setCarrinhoAberto(true);
      }


    }
  };

  // Funções específicas para controles do carrinho
  const incrementarQuantidadeCarrinho = (produtoId: string) => {
    const quantidadeAtual = obterQuantidadeProduto(produtoId);

    // Buscar informações do produto para verificar se é fracionado
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;

    let novaQuantidade: number;

    if (produto.unidade_medida?.fracionado) {
      // Para produtos fracionados, incrementar em 0.1
      novaQuantidade = Math.round((quantidadeAtual + 0.1) * 1000) / 1000; // 3 casas decimais
    } else {
      // Para produtos inteiros, incrementar em 1
      novaQuantidade = quantidadeAtual + 1;
    }

    alterarQuantidadeProduto(produtoId, novaQuantidade);
  };

  // Funções para controle de itens individuais do carrinho
  const decrementarQuantidadeItemCarrinho = (itemId: string) => {
    const item = itensCarrinhoSeparados[itemId];
    if (!item) return;

    if (item.quantidade <= 1) {
      // Abrir modal de confirmação para remoção
      setProdutoParaRemover(itemId);
      setModalRemoverItemAberto(true);
    } else {
      // Decrementar normalmente
      const produto = produtos.find(p => p.id === item.produtoId);
      if (!produto) return;

      let novaQuantidade: number;

      if (produto.unidade_medida?.fracionado) {
        // Para produtos fracionados, decrementar em 0.1
        novaQuantidade = Math.round((item.quantidade - 0.1) * 1000) / 1000; // 3 casas decimais
      } else {
        // Para produtos inteiros, decrementar em 1
        novaQuantidade = item.quantidade - 1;
      }

      // Atualizar item no carrinho com novo preço baseado na quantidade
      atualizarPrecoItemCarrinho(itemId, novaQuantidade);

      // Atualizar também o sistema antigo para compatibilidade
      alterarQuantidadeProduto(item.produtoId, obterQuantidadeProduto(item.produtoId) - (item.quantidade - novaQuantidade));
    }
  };

  const incrementarQuantidadeItemCarrinho = (itemId: string) => {
    const item = itensCarrinhoSeparados[itemId];
    if (!item) return;

    const produto = produtos.find(p => p.id === item.produtoId);
    if (!produto) return;

    let novaQuantidade: number;

    if (produto.unidade_medida?.fracionado) {
      // Para produtos fracionados, incrementar em 0.1
      novaQuantidade = Math.round((item.quantidade + 0.1) * 1000) / 1000; // 3 casas decimais
    } else {
      // Para produtos inteiros, incrementar em 1
      novaQuantidade = item.quantidade + 1;
    }

    // Atualizar item no carrinho com novo preço baseado na quantidade
    atualizarPrecoItemCarrinho(itemId, novaQuantidade);

    // Atualizar também o sistema antigo para compatibilidade
    alterarQuantidadeProduto(item.produtoId, obterQuantidadeProduto(item.produtoId) + (novaQuantidade - item.quantidade));
  };

  // Manter funções antigas para compatibilidade
  const decrementarQuantidadeCarrinho = (produtoId: string) => {
    const quantidadeAtual = obterQuantidadeProduto(produtoId);

    if (quantidadeAtual <= 1) {
      // Abrir modal de confirmação para remoção
      setProdutoParaRemover(produtoId);
      setModalRemoverItemAberto(true);
    } else {
      // Decrementar normalmente
      const produto = produtos.find(p => p.id === produtoId);
      if (!produto) return;

      let novaQuantidade: number;

      if (produto.unidade_medida?.fracionado) {
        // Para produtos fracionados, decrementar em 0.1
        novaQuantidade = Math.round((quantidadeAtual - 0.1) * 1000) / 1000; // 3 casas decimais
      } else {
        // Para produtos inteiros, decrementar em 1
        novaQuantidade = quantidadeAtual - 1;
      }

      alterarQuantidadeProduto(produtoId, novaQuantidade);
    }
  };

  const incrementarQuantidade = (produtoId: string) => {
    // Buscar o produto
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;

    // ✅ VERIFICAR SE PRODUTO TEM TABELA DE PREÇO E SE UMA FOI SELECIONADA
    const tabelasComPrecos = obterTabelasComPrecos(produtoId);
    if (tabelasComPrecos.length > 0) {
      // Produto tem tabela de preço, verificar se uma foi selecionada
      const tabelaSelecionada = tabelasSelecionadas[produtoId];



      if (!tabelaSelecionada) {
        // Nenhuma tabela selecionada, mostrar modal de aviso
        setProdutoTabelaPrecoObrigatoria({
          id: produtoId,
          nome: produto.nome
        });
        setModalTabelaPrecoObrigatoria(true);
        return;
      }
    }

    const quantidadeAtual = obterQuantidadeSelecionada(produtoId);
    const isFracionado = produto?.unidade_medida?.fracionado || false;

    let novaQuantidade;
    if (isFracionado) {
      // Para produtos fracionados, incrementar em 0.1 (100g, 100ml, etc.)
      novaQuantidade = Math.round((quantidadeAtual + 0.1) * 1000) / 1000; // 3 casas decimais
    } else {
      // Para produtos inteiros, incrementar em 1
      novaQuantidade = quantidadeAtual + 1;
    }

    // Incrementar a quantidade diretamente - popup de adicionais removido
    alterarQuantidadeSelecionada(produtoId, novaQuantidade);
  };

  const decrementarQuantidade = (produtoId: string) => {
    const quantidadeAtual = obterQuantidadeSelecionada(produtoId);
    if (quantidadeAtual > 0) {
      // Buscar o produto para verificar se é fracionário
      const produto = produtos.find(p => p.id === produtoId);
      const isFracionado = produto?.unidade_medida?.fracionado || false;

      let novaQuantidade;
      if (isFracionado) {
        // Para produtos fracionados, decrementar em 0.1, mínimo 0
        novaQuantidade = Math.max(0, Math.round((quantidadeAtual - 0.1) * 1000) / 1000); // 3 casas decimais
      } else {
        // Para produtos inteiros, decrementar em 1, mínimo 0
        novaQuantidade = Math.max(0, quantidadeAtual - 1);
      }

      alterarQuantidadeSelecionada(produtoId, novaQuantidade);
    } else {
      // ✅ VERIFICAR SE PRODUTO TEM TABELA DE PREÇO E SE UMA FOI SELECIONADA (mesmo quando quantidade é 0)
      const produto = produtos.find(p => p.id === produtoId);
      if (!produto) return;

      const tabelasComPrecos = obterTabelasComPrecos(produtoId);
      if (tabelasComPrecos.length > 0) {
        // Produto tem tabela de preço, verificar se uma foi selecionada
        const tabelaSelecionada = tabelasSelecionadas[produtoId];
        if (!tabelaSelecionada) {
          // Nenhuma tabela selecionada, mostrar modal de aviso
          setProdutoTabelaPrecoObrigatoria({
            id: produtoId,
            nome: produto.nome
          });
          setModalTabelaPrecoObrigatoria(true);
          return;
        }
      }
    }
  };

  // Função para alterar quantidade selecionada via input
  const handleQuantidadeChange = (produtoId: string, valor: string) => {
    // Buscar o produto para verificar se é fracionário
    const produto = produtos.find(p => p.id === produtoId);
    const isFracionado = produto?.unidade_medida?.fracionado || false;

    if (isFracionado) {
      // Para produtos fracionados, permitir números, vírgulas e pontos
      const valorLimpo = valor.replace(/[^\d.,]/g, '');

      if (valorLimpo === '') {
        alterarQuantidadeSelecionada(produtoId, 0);
        return;
      }

      // Converter vírgula para ponto para processamento
      const valorConvertido = valorLimpo.replace(',', '.');

      if (!isNaN(parseFloat(valorConvertido))) {
        let quantidade = parseFloat(valorConvertido);
        // Limitar a 3 casas decimais
        quantidade = Math.round(quantidade * 1000) / 1000;
        alterarQuantidadeSelecionada(produtoId, quantidade >= 0 ? quantidade : 0);
      }
    } else {
      // Para produtos inteiros, permitir apenas números
      const valorLimpo = valor.replace(/[^\d]/g, '');
      const quantidade = valorLimpo === '' ? 0 : parseInt(valorLimpo);

      if (!isNaN(quantidade)) {
        alterarQuantidadeSelecionada(produtoId, quantidade);
      }
    }
  };

  const handleQuantidadeInputChange = (produtoId: string, valor: string) => {
    // Buscar o produto para verificar se é fracionário
    const produto = produtos.find(p => p.id === produtoId);
    const isFracionado = produto?.unidade_medida?.fracionado || false;

    if (isFracionado) {
      // Para produtos fracionados, permitir números, vírgulas e pontos
      const valorLimpo = valor.replace(/[^\d.,]/g, '');

      if (valorLimpo === '') {
        alterarQuantidadeProduto(produtoId, 0);
        return;
      }

      // Converter vírgula para ponto para processamento
      const valorConvertido = valorLimpo.replace(',', '.');

      if (!isNaN(parseFloat(valorConvertido))) {
        let quantidade = parseFloat(valorConvertido);
        // Limitar a 3 casas decimais
        quantidade = Math.round(quantidade * 1000) / 1000;
        alterarQuantidadeProduto(produtoId, quantidade >= 0 ? quantidade : 0);
      }
    } else {
      // Para produtos inteiros, permitir apenas números
      const valorLimpo = valor.replace(/[^\d]/g, '');
      const quantidade = valorLimpo === '' ? 0 : parseInt(valorLimpo);

      if (!isNaN(quantidade)) {
        alterarQuantidadeProduto(produtoId, quantidade);
      }
    }
  };

  // Funções para o carrinho
  const obterItensCarrinho = (): ItemCarrinho[] => {
    return Object.entries(itensCarrinhoSeparados)
      .map(([itemId, item]) => {
        const produto = produtos.find(p => p.id === item.produtoId);
        if (!produto) return null;

        // Converter adicionais do formato {[itemId]: quantidade} para array
        const adicionaisArray: { id: string; nome: string; preco: number; quantidade: number; }[] = [];

        if (item.adicionais) {
          Object.entries(item.adicionais).forEach(([adicionalId, quantidade]) => {
            if (quantidade > 0) {
              // Encontrar o adicional nos dados do produto
              produto.opcoes_adicionais?.forEach(opcao => {
                const adicionalItem = opcao.itens?.find(adicionalItem => adicionalItem.id === adicionalId);
                if (adicionalItem) {
                  adicionaisArray.push({
                    id: adicionalId,
                    nome: adicionalItem.nome,
                    preco: obterPrecoAdicional(item.produtoId, adicionalId), // ✅ USAR PREÇO DA TABELA
                    quantidade
                  });
                }
              });
            }
          });
        }

        return {
          produto,
          quantidade: item.quantidade,
          precoProduto: item.precoProduto, // ✅ INCLUIR PREÇO SALVO DO PRODUTO
          tabelaPrecoId: item.tabelaPrecoId, // ✅ INCLUIR ID DA TABELA
          adicionais: adicionaisArray.length > 0 ? adicionaisArray : undefined,
          observacao: item.observacao,
          ordemAdicao: item.ordemAdicao,
          itemId // Adicionar ID único para identificar o item
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.ordemAdicao - a!.ordemAdicao) // Mais recentes primeiro
      .map(({ produto, quantidade, precoProduto, tabelaPrecoId, adicionais, observacao, itemId }) => ({ produto, quantidade, precoProduto, tabelaPrecoId, adicionais, observacao, itemId })) as (ItemCarrinho & { itemId: string })[];
  };

  const obterTotalCarrinho = () => {
    return obterItensCarrinho().reduce((total, item) => {
      // ✅ USAR PREÇO SALVO NO ITEM (já considera tabela de preço)
      const precoProduto = item.precoProduto || item.produto.preco;

      // Total do produto principal (usando preço salvo)
      let totalItem = precoProduto * item.quantidade;

      // Adicionar total dos adicionais (já usando preços corretos da tabela)
      if (item.adicionais) {
        const totalAdicionais = item.adicionais.reduce((totalAd, adicional) => {
          return totalAd + (adicional.preco * adicional.quantidade * item.quantidade);
        }, 0);
        totalItem += totalAdicionais;
      }

      return total + totalItem;
    }, 0);
  };

  const obterQuantidadeTotalItens = () => {
    // Contar itens separados no carrinho
    return Object.values(itensCarrinhoSeparados).reduce((total, item) => total + item.quantidade, 0);
  };

  const removerItemCarrinho = (produtoId: string) => {
    setQuantidadesProdutos(prev => {
      const novo = { ...prev };
      delete novo[produtoId];
      return novo;
    });
  };

  // Função para limpar itens do carrinho que não existem mais no cardápio
  const limparItensInexistentes = () => {
    setQuantidadesProdutos(prev => {
      const carrinhoLimpo: Record<string, number> = {};
      Object.entries(prev).forEach(([produtoId, quantidade]) => {
        const produtoExiste = produtos.some(p => p.id === produtoId);
        if (produtoExiste) {
          carrinhoLimpo[produtoId] = quantidade;
        }
      });
      return carrinhoLimpo;
    });
  };

  const abrirModalConfirmacao = () => {
    setModalConfirmacaoAberto(true);
  };

  const confirmarLimparCarrinho = () => {
    setQuantidadesProdutos({});
    setOrdemAdicaoItens({});
    setAdicionaisSelecionados({});
    setObservacoesProdutos({});
    setItensCarrinhoSeparados({}); // Limpar itens separados
    setCarrinhoAberto(false);
    setModalConfirmacaoAberto(false);

    // localStorage removido - não persiste entre reloads

    // Mostrar toast de sucesso
    setToastVisivel(true);
    setTimeout(() => setToastVisivel(false), 3000); // Toast desaparece após 3 segundos
  };

  const cancelarLimparCarrinho = () => {
    setModalConfirmacaoAberto(false);
  };

  // Funções para modal de remoção de item
  const confirmarRemoverItem = () => {
    if (produtoParaRemover) {
      // Verificar se é um itemId (novo sistema) ou produtoId (sistema antigo)
      if (itensCarrinhoSeparados[produtoParaRemover]) {
        // Novo sistema - remover item específico
        const item = itensCarrinhoSeparados[produtoParaRemover];

        // Remover do carrinho separado
        setItensCarrinhoSeparados(prev => {
          const novo = { ...prev };
          delete novo[produtoParaRemover];
          return novo;
        });

        // Atualizar sistema antigo para compatibilidade
        const quantidadeAtual = obterQuantidadeProduto(item.produtoId);
        alterarQuantidadeProduto(item.produtoId, Math.max(0, quantidadeAtual - item.quantidade));
      } else {
        // Sistema antigo - remover completamente do carrinho
        alterarQuantidadeProduto(produtoParaRemover, 0);

        // Limpar adicionais e observação deste produto
        setAdicionaisSelecionados(prev => {
          const novosAdicionais = { ...prev };
          delete novosAdicionais[produtoParaRemover];
          return novosAdicionais;
        });

        setObservacoesProdutos(prev => {
          const nova = { ...prev };
          delete nova[produtoParaRemover];
          return nova;
        });
      }

      // Fechar modal e limpar estado
      setModalRemoverItemAberto(false);
      setProdutoParaRemover(null);
    }
  };

  const cancelarRemoverItem = () => {
    setModalRemoverItemAberto(false);
    setProdutoParaRemover(null);
  };

  // ✅ FUNÇÃO PARA ABRIR MODAL DE ORGANIZAÇÃO
  const abrirModalOrganizacao = (produtoId: string) => {
    const produto = produtos.find(p => p.id === produtoId);
    const quantidadeProduto = obterQuantidadeSelecionada(produtoId);
    const adicionaisValidos = obterAdicionaisValidosProduto(produtoId);

    if (!produto) return;

    // Criar itens individuais com adicionais mínimos já distribuídos
    const itensOrganizados = Array.from({ length: quantidadeProduto }, (_, index) => ({
      id: `item_${index + 1}`,
      numero: index + 1,
      nome: produto.nome,
      preco: produto.preco,
      adicionais: []
    }));

    // Distribuir adicionais mínimos automaticamente e agrupar excedentes
    const excedentesDisponiveis = [];
    const excedentesAgrupadosTemp = {};

    adicionaisValidos.forEach(adicional => {
      // Para cada item, adicionar 1 adicional (quantidade mínima)
      itensOrganizados.forEach((item, index) => {
        item.adicionais.push({
          id: `${adicional.id}_minimo_${index}`,
          originalId: adicional.id,
          nome: adicional.nome,
          preco: adicional.preco,
          tipo: 'minimo'
        });
      });

      // Calcular excedentes (quantidade total - quantidade mínima distribuída)
      const quantidadeExcedente = adicional.quantidade - quantidadeProduto;

      if (quantidadeExcedente > 0) {
        // Agrupar excedentes por originalId
        if (!excedentesAgrupadosTemp[adicional.id]) {
          excedentesAgrupadosTemp[adicional.id] = {
            originalId: adicional.id,
            nome: adicional.nome,
            preco: adicional.preco,
            quantidadeTotal: quantidadeExcedente,
            quantidadeSelecionada: 0
          };
        } else {
          excedentesAgrupadosTemp[adicional.id].quantidadeTotal += quantidadeExcedente;
        }
      }
    });

    setProdutoOrganizacao(produto);
    setItensOrganizados(itensOrganizados);
    setExcedentesDisponiveis(excedentesDisponiveis);
    setExcedentesAgrupados(excedentesAgrupadosTemp);
    setQuantidadeExcedenteTemp({});
    setModalOrganizacao(true);
  };

  // ✅ FUNÇÕES PARA CONTROLE DE QUANTIDADE DOS EXCEDENTES AGRUPADOS
  const incrementarQuantidadeExcedente = (originalId: string) => {
    const excedente = excedentesAgrupados[originalId];
    if (!excedente) return;

    const quantidadeAtual = quantidadeExcedenteTemp[originalId] || 0;
    if (quantidadeAtual < excedente.quantidadeTotal) {
      setQuantidadeExcedenteTemp(prev => ({
        ...prev,
        [originalId]: quantidadeAtual + 1
      }));
    }
  };

  const decrementarQuantidadeExcedente = (originalId: string) => {
    const quantidadeAtual = quantidadeExcedenteTemp[originalId] || 0;
    if (quantidadeAtual > 0) {
      setQuantidadeExcedenteTemp(prev => ({
        ...prev,
        [originalId]: quantidadeAtual - 1
      }));
    }
  };

  const obterQuantidadeExcedenteTemp = (originalId: string): number => {
    return quantidadeExcedenteTemp[originalId] || 0;
  };

  // ✅ FUNÇÕES PARA CONTROLAR QUANTIDADE DE ADICIONAIS NOS ITENS
  const obterQuantidadeAdicionalNoItem = (itemId: string, originalId: string): number => {
    const item = itensOrganizados.find(i => i.id === itemId);
    if (!item) return 0;

    return item.adicionais.filter(a => a.originalId === originalId).length;
  };

  const incrementarAdicionalNoItem = (itemId: string, originalId: string) => {
    // Verificar se há excedentes disponíveis
    const excedente = excedentesAgrupados[originalId];
    if (!excedente || excedente.quantidadeTotal <= 0) {
      showMessage('error', 'Não há mais excedentes disponíveis deste adicional');
      return;
    }

    // Adicionar ao item
    setItensOrganizados(prev => prev.map(item => {
      if (item.id === itemId) {
        const novoAdicional = {
          id: `${originalId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          originalId,
          nome: excedente.nome,
          preco: excedente.preco,
          tipo: 'excedente'
        };
        return {
          ...item,
          adicionais: [...item.adicionais, novoAdicional]
        };
      }
      return item;
    }));

    // Reduzir quantidade disponível nos excedentes
    setExcedentesAgrupados(prev => ({
      ...prev,
      [originalId]: {
        ...prev[originalId],
        quantidadeTotal: prev[originalId].quantidadeTotal - 1
      }
    }));
  };

  const decrementarAdicionalNoItem = (itemId: string, originalId: string) => {
    const item = itensOrganizados.find(i => i.id === itemId);
    if (!item) return;

    // Encontrar o último adicional deste tipo no item
    const adicionalParaRemover = item.adicionais
      .filter(a => a.originalId === originalId)
      .pop();

    if (!adicionalParaRemover) return;

    // Remover do item usando a função existente que já cuida da lógica de excedentes
    desvincularExcedente(adicionalParaRemover.id, itemId);
  };

  // ✅ FUNÇÃO PARA VERIFICAR SE TODOS OS EXCEDENTES FORAM DISTRIBUÍDOS
  const todosExcedentesDistribuidos = (): boolean => {
    // Verifica se há excedentes agrupados com quantidade disponível > 0
    const temExcedentesDisponiveis = Object.values(excedentesAgrupados).some(
      excedente => excedente.quantidadeTotal > 0
    );

    return !temExcedentesDisponiveis;
  };

  // ✅ FUNÇÃO PARA ABRIR MODAL DE VINCULAÇÃO DE EXCEDENTE COM QUANTIDADE
  const abrirModalVincularExcedente = (originalId: string) => {
    const quantidadeSelecionada = obterQuantidadeExcedenteTemp(originalId);
    if (quantidadeSelecionada === 0) {
      showMessage('error', 'Selecione uma quantidade para vincular');
      return;
    }

    const excedente = excedentesAgrupados[originalId];
    if (!excedente) return;

    setExcedenteAtual({
      originalId,
      nome: excedente.nome,
      preco: excedente.preco,
      quantidade: quantidadeSelecionada
    });
    setModalVincularExcedente(true);
  };

  // ✅ FUNÇÃO PARA VINCULAR EXCEDENTE A UM ITEM COM QUANTIDADE
  const vincularExcedenteAItem = (itemId: string) => {
    if (!excedenteAtual) return;

    const { originalId, nome, preco, quantidade } = excedenteAtual;

    // Adicionar ao item específico (múltiplas vezes conforme a quantidade)
    setItensOrganizados(prev => prev.map(item => {
      if (item.id === itemId) {
        const novosAdicionais = [];
        for (let i = 0; i < quantidade; i++) {
          novosAdicionais.push({
            id: `${originalId}_excedente_${Date.now()}_${i}`,
            originalId,
            nome,
            preco,
            tipo: 'excedente'
          });
        }
        return {
          ...item,
          adicionais: [...item.adicionais, ...novosAdicionais]
        };
      }
      return item;
    }));

    // Atualizar quantidade disponível nos excedentes agrupados
    setExcedentesAgrupados(prev => ({
      ...prev,
      [originalId]: {
        ...prev[originalId],
        quantidadeTotal: prev[originalId].quantidadeTotal - quantidade
      }
    }));

    // Resetar quantidade temporária
    setQuantidadeExcedenteTemp(prev => ({
      ...prev,
      [originalId]: 0
    }));

    // Fechar modal de vinculação
    setModalVincularExcedente(false);
    setExcedenteAtual(null);
  };

  // ✅ FUNÇÃO PARA DESVINCULAR ADICIONAL (EXCEDENTE OU MÍNIMO)
  const desvincularExcedente = (adicionalId: string, itemId: string) => {
    let adicionalDesvinculado = null;

    // Remover do item (excedentes e mínimos)
    setItensOrganizados(prev => {
      const novosItens = prev.map(item => {
        if (item.id === itemId) {
          const novosAdicionais = item.adicionais.filter(a => {
            if (a.id === adicionalId) {
              adicionalDesvinculado = a;
              return false;
            }
            return true;
          });
          return { ...item, adicionais: novosAdicionais };
        }
        return item;
      });

      // Adicionar de volta aos excedentes agrupados imediatamente após a remoção
      if (adicionalDesvinculado) {
        const { originalId } = adicionalDesvinculado;

        setExcedentesAgrupados(prevExcedentes => {
          console.log('Adicionando de volta aos excedentes:', {
            originalId,
            nome: adicionalDesvinculado.nome,
            excedentesAtuais: prevExcedentes[originalId]?.quantidadeTotal || 0
          });

          if (prevExcedentes[originalId]) {
            // Se já existe, apenas incrementar a quantidade
            return {
              ...prevExcedentes,
              [originalId]: {
                ...prevExcedentes[originalId],
                quantidadeTotal: prevExcedentes[originalId].quantidadeTotal + 1
              }
            };
          } else {
            // Se não existe, criar novo grupo
            return {
              ...prevExcedentes,
              [originalId]: {
                originalId: adicionalDesvinculado.originalId,
                nome: adicionalDesvinculado.nome,
                preco: adicionalDesvinculado.preco,
                quantidadeTotal: 1,
                quantidadeSelecionada: 0
              }
            };
          }
        });
      }

      return novosItens;
    });
  };

  // ✅ FUNÇÃO PARA FINALIZAR ORGANIZAÇÃO
  const finalizarOrganizacao = async () => {
    // Verificar se todos os excedentes foram distribuídos usando a nova lógica
    if (!todosExcedentesDistribuidos()) {
      showMessage('error', 'Todos os excedentes devem ser distribuídos');
      return;
    }

    if (!produtoOrganizacao) return;

    // ✅ VERIFICAR ESTOQUE EM TEMPO REAL SE CONTROLE ESTIVER ATIVO
    if (produtoOrganizacao.controla_estoque_cardapio) {
      const quantidadeTotalSolicitada = itensOrganizados.length;

      const { temEstoque, estoqueAtual } = await verificarEstoqueTempoReal(produtoOrganizacao.id, quantidadeTotalSolicitada);

      if (!temEstoque) {
        // Abrir modal de estoque insuficiente
        setDadosEstoqueInsuficiente({
          nomeProduto: produtoOrganizacao.nome,
          quantidadeSolicitada: quantidadeTotalSolicitada,
          estoqueDisponivel: estoqueAtual
        });
        setModalEstoqueInsuficiente(true);
        return;
      }
    }

    // Adicionar cada item individual ao carrinho exatamente como foi organizado
    itensOrganizados.forEach((item, index) => {
      // Gerar ID único para o carrinho com delay para garantir unicidade
      const itemId = `${produtoOrganizacao.id}_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;

      // Preparar adicionais no formato esperado pelo sistema de carrinho
      const adicionaisFormatados: {[itemId: string]: number} = {};
      item.adicionais.forEach(adicional => {
        // Cada adicional individual tem quantidade 1
        adicionaisFormatados[adicional.originalId] = (adicionaisFormatados[adicional.originalId] || 0) + 1;
      });

      // ✅ ADICIONAR AO SISTEMA NOVO (itensCarrinhoSeparados) - PRINCIPAL
      const novoItemCarrinho = {
        produtoId: produtoOrganizacao.id,
        quantidade: 1,
        adicionais: adicionaisFormatados,
        observacao: undefined,
        ordemAdicao: Date.now() + index
      };

      setItensCarrinhoSeparados(prev => ({
        ...prev,
        [itemId]: novoItemCarrinho
      }));

      // ✅ MANTER COMPATIBILIDADE COM SISTEMA ANTIGO
      setQuantidadesProdutos(prev => ({
        ...prev,
        [itemId]: 1
      }));

      setAdicionaisSelecionados(prev => ({
        ...prev,
        [itemId]: adicionaisFormatados
      }));

      setOrdemAdicaoItens(prev => ({
        ...prev,
        [itemId]: Date.now() + index
      }));


    });

    // Limpar estados do produto original no card
    limparEstadosProduto(produtoOrganizacao.id);

    // Limpar quantidade selecionada do produto no card
    setQuantidadesSelecionadas(prev => {
      const novo = { ...prev };
      delete novo[produtoOrganizacao.id];
      return novo;
    });

    // Limpar adicionais selecionados do produto no card
    setAdicionaisSelecionados(prev => {
      const novo = { ...prev };
      delete novo[produtoOrganizacao.id];
      return novo;
    });

    // Limpar observações selecionadas do produto no card
    setObservacoesSelecionadas(prev => {
      const novo = { ...prev };
      delete novo[produtoOrganizacao.id];
      return novo;
    });

    // Fechar modal e limpar todos os estados do modal
    setModalOrganizacao(false);
    setProdutoOrganizacao(null);
    setItensOrganizados([]);
    setExcedentesDisponiveis([]);
    setExcedentesAgrupados({});
    setQuantidadeExcedenteTemp({});



    // Abrir carrinho automaticamente após adicionar
    setCarrinhoAberto(true);

    // Abrir carrinho
    if (!carrinhoAberto) {
      setCarrinhoAberto(true);
      setCarrinhoRecemAberto(true);
      setTimeout(() => setCarrinhoRecemAberto(false), 2000);
    }

    showMessage('success', 'Itens organizados e adicionados ao carrinho!');
  };

  // Funções para modal de configuração individual (simplificadas)




  // Funções para modal de adicionar ao carrinho
  const confirmarAdicionarAoCarrinho = () => {
    // Adicionar item ao carrinho com configurações atuais
    const produtoId = produtoConfiguracaoIndividual?.id;
    if (produtoId) {
      adicionarAoCarrinho(produtoId);
    }

    setModalAdicionarCarrinho(false);
    setProdutoConfiguracaoIndividual(null);
  };

  const cancelarAdicionarAoCarrinho = () => {
    // Apenas fechar modal sem adicionar
    setModalAdicionarCarrinho(false);
    setProdutoConfiguracaoIndividual(null);
  };

  // ✅ NOVO: Funções para modal de produto alcoólico
  const confirmarProdutoAlcoolico = async () => {
    // Fechar modal de conscientização
    setModalProdutoAlcoolico(false);

    // Prosseguir com a adição normal do produto
    if (produtoAlcoolicoPendente) {
      const produto = produtos.find(p => p.id === produtoAlcoolicoPendente);
      const quantidadeSelecionada = obterQuantidadeSelecionada(produtoAlcoolicoPendente);

      // ✅ VERIFICAR ESTOQUE EM TEMPO REAL SE CONTROLE ESTIVER ATIVO (PARA PRODUTOS ALCOÓLICOS)
      if (produto && produto.controla_estoque_cardapio && quantidadeSelecionada > 0) {
        const { temEstoque, estoqueAtual } = await verificarEstoqueTempoReal(produtoAlcoolicoPendente, quantidadeSelecionada);

        if (!temEstoque) {
          // Abrir modal de estoque insuficiente
          setDadosEstoqueInsuficiente({
            nomeProduto: produto.nome,
            quantidadeSolicitada: quantidadeSelecionada,
            estoqueDisponivel: estoqueAtual
          });
          setModalEstoqueInsuficiente(true);
          setProdutoAlcoolicoPendente(null);
          return;
        }
      }

      if (quantidadeSelecionada > 0) {
        // Gerar ID único para este item no carrinho
        const itemId = `${produtoAlcoolicoPendente}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Criar item separado no carrinho
        const novoItem = {
          produtoId: produtoAlcoolicoPendente,
          quantidade: quantidadeSelecionada,
          adicionais: adicionaisSelecionados[produtoAlcoolicoPendente] ? { ...adicionaisSelecionados[produtoAlcoolicoPendente] } : {},
          observacao: observacoesSelecionadas[produtoAlcoolicoPendente],
          ordemAdicao: Date.now()
        };

        // Adicionar ao estado de itens separados
        setItensCarrinhoSeparados(prev => ({
          ...prev,
          [itemId]: novoItem
        }));

        // Manter compatibilidade com sistema antigo (somar quantidades)
        alterarQuantidadeProduto(produtoAlcoolicoPendente, quantidadeSelecionada);

        // Limpar quantidade e observação selecionadas
        alterarQuantidadeSelecionada(produtoAlcoolicoPendente, 0);
        setObservacoesSelecionadas(prev => {
          const nova = { ...prev };
          delete nova[produtoAlcoolicoPendente];
          return nova;
        });

        // Estado de adicionais pendentes removido - não é mais necessário

        // localStorage removido - não persiste entre reloads

        // Ativar efeito de entrada suave no item
        setItemChacoalhando(produtoAlcoolicoPendente);
        setTimeout(() => setItemChacoalhando(null), 800);

        // Abrir carrinho automaticamente quando adicionar primeiro item
        const totalItensCarrinho = Object.keys(itensCarrinhoSeparados).length;
        if (totalItensCarrinho === 0) {
          const carrinhoEstaviaFechado = !carrinhoAberto;
          setCarrinhoAberto(true);

          // Se o carrinho estava fechado, marcar como recém aberto para animação especial
          if (carrinhoEstaviaFechado) {
            setCarrinhoRecemAberto(true);
            setTimeout(() => setCarrinhoRecemAberto(false), 3000);
          }
        }


      }
    }

    // Limpar estado
    setProdutoAlcoolicoPendente(null);
  };

  const cancelarProdutoAlcoolico = () => {
    // Fechar modal sem adicionar
    setModalProdutoAlcoolico(false);
    setProdutoAlcoolicoPendente(null);
  };

  const fecharModalTabelaPrecoObrigatoria = () => {
    setModalTabelaPrecoObrigatoria(false);
    setProdutoTabelaPrecoObrigatoria(null);
  };

  // Funções auxiliares para o modal de configuração
  const calcularValorAdicionaisConfigurados = (produtoId: string): number => {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return 0;

    let valorTotal = 0;
    const adicionaisItem = adicionaisSelecionados[produtoId];

    if (adicionaisItem) {
      Object.entries(adicionaisItem).forEach(([itemId, quantidade]) => {
        if (quantidade > 0) {
          produto.opcoes_adicionais?.forEach(opcao => {
            const item = opcao.itens?.find(item => item.id === itemId);
            if (item && item.preco) {
              valorTotal += item.preco * quantidade;
            }
          });
        }
      });
    }

    return valorTotal;
  };

  const adicionarItemConfiguradoAoCarrinho = () => {
    if (!produtoConfiguracaoIndividual) return;

    // Gerar ID único para este item no carrinho
    const itemId = `${produtoConfiguracaoIndividual.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // ✅ CALCULAR PREÇO COM DESCONTO POR QUANTIDADE PARA CONFIGURAÇÃO INDIVIDUAL
    const precoProduto = calcularPrecoComDescontoQuantidade(produtoConfiguracaoIndividual, 1);

    // Criar item separado no carrinho
    const novoItem = {
      produtoId: produtoConfiguracaoIndividual.id,
      quantidade: 1, // Sempre 1 para configuração individual
      precoProduto: precoProduto, // ✅ SALVAR PREÇO CALCULADO
      adicionais: adicionaisSelecionados[produtoConfiguracaoIndividual.id] ? { ...adicionaisSelecionados[produtoConfiguracaoIndividual.id] } : {},
      observacao: undefined,
      ordemAdicao: Date.now()
    };

    // Adicionar ao estado de itens separados
    setItensCarrinhoSeparados(prev => ({
      ...prev,
      [itemId]: novoItem
    }));

    // Manter compatibilidade com sistema antigo (somar quantidades)
    alterarQuantidadeProduto(produtoConfiguracaoIndividual.id, 1);

    // Limpar adicionais selecionados para este produto
    setAdicionaisSelecionados(prev => {
      const novo = { ...prev };
      delete novo[produtoConfiguracaoIndividual.id];
      return novo;
    });

    // Incrementar a quantidade selecionada que estava pendente
    const quantidadeAtual = obterQuantidadeSelecionada(produtoConfiguracaoIndividual.id);
    alterarQuantidadeSelecionada(produtoConfiguracaoIndividual.id, quantidadeAtual + 1);

    // Fechar modal
    fecharModalConfiguracao();

    // Abrir carrinho automaticamente
    setCarrinhoAberto(true);


  };

  // Função para obter o primeiro telefone com WhatsApp
  const obterWhatsAppEmpresa = () => {
    // Usar apenas o campo telefones (novo sistema)
    if (empresa?.telefones && Array.isArray(empresa.telefones)) {
      const telefoneWhatsApp = empresa.telefones.find(tel => tel.whatsapp);
      if (telefoneWhatsApp) {
        return telefoneWhatsApp.numero;
      }
    }

    // Retornar null se não houver telefone com WhatsApp configurado
    return null;
  };

  // Função para obter todos os telefones da empresa
  const obterTodosTelefones = () => {
    // Usar apenas o campo telefones (novo sistema)
    if (empresa?.telefones && Array.isArray(empresa.telefones)) {
      return empresa.telefones;
    }

    // Retornar array vazio se não houver telefones configurados
    return [];
  };

  // Função para obter o nome do dia da semana
  const obterNomeDiaSemana = (dia: number) => {
    const dias = [
      'Domingo',
      'Segunda-feira',
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado'
    ];
    return dias[dia] || '';
  };

  // Função para formatar horário
  const formatarHorario = (hora: string) => {
    return hora.substring(0, 5); // Remove os segundos (HH:MM)
  };

  // Função para calcular a próxima abertura da loja
  const calcularProximaAbertura = () => {
    if (!horarios.length || !modoAutomatico) {
      setProximaAbertura(null);
      return;
    }

    const agora = new Date();
    const diaAtual = agora.getDay();
    const horaAtual = agora.getHours() * 60 + agora.getMinutes();

    // Primeiro, verificar se há horário para hoje e se ainda não passou
    const horarioHoje = horarios.find(h => h.dia_semana === diaAtual);
    if (horarioHoje) {
      const [horaAbertura, minutoAbertura] = horarioHoje.hora_abertura.split(':').map(Number);
      const aberturaMinutos = horaAbertura * 60 + minutoAbertura;

      if (horaAtual < aberturaMinutos) {
        // Ainda não chegou a hora de abrir hoje
        const proximaAbertura = new Date();
        proximaAbertura.setHours(horaAbertura, minutoAbertura, 0, 0);
        setProximaAbertura(proximaAbertura);
        return;
      }
    }

    // Procurar o próximo dia com horário de funcionamento
    for (let i = 1; i <= 7; i++) {
      const proximoDia = (diaAtual + i) % 7;
      const horarioProximoDia = horarios.find(h => h.dia_semana === proximoDia);

      if (horarioProximoDia) {
        const [horaAbertura, minutoAbertura] = horarioProximoDia.hora_abertura.split(':').map(Number);
        const proximaAbertura = new Date();
        proximaAbertura.setDate(proximaAbertura.getDate() + i);
        proximaAbertura.setHours(horaAbertura, minutoAbertura, 0, 0);
        setProximaAbertura(proximaAbertura);
        return;
      }
    }

    // Se não encontrou nenhum horário, não há próxima abertura
    setProximaAbertura(null);
  };

  // Função para formatar o contador regressivo
  const formatarContadorRegressivo = () => {
    if (!proximaAbertura) {
      setContadorRegressivo('');
      return;
    }

    const agora = new Date();
    const diferenca = proximaAbertura.getTime() - agora.getTime();

    if (diferenca <= 0) {
      setContadorRegressivo('');
      calcularProximaAbertura(); // Recalcular próxima abertura
      return;
    }

    const dias = Math.floor(diferenca / (1000 * 60 * 60 * 24));
    const horas = Math.floor((diferenca % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutos = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((diferenca % (1000 * 60)) / 1000);

    let contador = '';
    if (dias > 0) {
      contador = `${dias}d ${horas}h ${minutos}m ${segundos}s`;
    } else if (horas > 0) {
      contador = `${horas}h ${minutos}m ${segundos}s`;
    } else if (minutos > 0) {
      contador = `${minutos}m ${segundos}s`;
    } else {
      contador = `${segundos}s`;
    }

    setContadorRegressivo(contador);
  };

  // Função para calcular o próximo fechamento da loja
  const calcularProximoFechamento = () => {
    if (!horarios.length || !modoAutomatico || !lojaAberta) {
      setProximoFechamento(null);
      setMostrarAvisoFechamento(false);
      return;
    }

    const agora = new Date();
    const diaAtual = agora.getDay();
    const horaAtual = agora.getHours() * 60 + agora.getMinutes();

    // Verificar se há horário para hoje
    const horarioHoje = horarios.find(h => h.dia_semana === diaAtual);
    if (horarioHoje) {
      const [horaFechamento, minutoFechamento] = horarioHoje.hora_fechamento.split(':').map(Number);
      const fechamentoMinutos = horaFechamento * 60 + minutoFechamento;

      if (horaAtual < fechamentoMinutos) {
        // Ainda não chegou a hora de fechar hoje
        const proximoFechamento = new Date();
        proximoFechamento.setHours(horaFechamento, minutoFechamento, 0, 0);
        setProximoFechamento(proximoFechamento);

        // Verificar se faltam 5 minutos ou menos para fechar
        const minutosParaFechar = fechamentoMinutos - horaAtual;
        setMostrarAvisoFechamento(minutosParaFechar <= 5 && minutosParaFechar > 0);
        return;
      }
    }

    // Se não há horário para hoje ou já passou, não mostrar aviso
    setProximoFechamento(null);
    setMostrarAvisoFechamento(false);
  };

  // Função para formatar o contador de fechamento
  const formatarContadorFechamento = () => {
    if (!proximoFechamento || !mostrarAvisoFechamento) {
      setContadorFechamento('');
      return;
    }

    const agora = new Date();
    const diferenca = proximoFechamento.getTime() - agora.getTime();

    if (diferenca <= 0) {
      setContadorFechamento('');
      setMostrarAvisoFechamento(false);
      calcularProximoFechamento(); // Recalcular
      return;
    }

    const minutos = Math.floor(diferenca / (1000 * 60));
    const segundos = Math.floor((diferenca % (1000 * 60)) / 1000);

    let contador = '';
    if (minutos > 0) {
      contador = `${minutos}m ${segundos}s`;
    } else {
      contador = `${segundos}s`;
    }

    setContadorFechamento(contador);
  };

  const handlePedirWhatsApp = (produto?: Produto) => {
    // Verificar se a loja está fechada (só bloqueia se explicitamente false)
    if (lojaAberta === false) {
      showMessage('error', 'Loja fechada! Não é possível fazer pedidos no momento.');
      return;
    }

    const whatsappNumero = obterWhatsAppEmpresa();
    if (!whatsappNumero) {
      showMessage('error', 'WhatsApp da empresa não disponível');
      return;
    }

    const whatsapp = whatsappNumero.replace(/\D/g, '');
    let mensagem = 'Olá! Gostaria de fazer um pedido:\n\n';

    if (produto) {
      // Pedido de um produto específico
      const quantidade = obterQuantidadeProduto(produto.id);
      const quantidadeFinal = quantidade > 0 ? quantidade : 1;
      const valorTotal = produto.preco * quantidadeFinal;

      mensagem += `*${produto.nome}*`;
      if (quantidadeFinal > 1) {
        mensagem += `\nQuantidade: ${quantidadeFinal}`;
      }
      if (config.mostrar_precos) {
        mensagem += `\nPreço unitário: ${formatarPreco(produto.preco)}`;
        if (quantidadeFinal > 1) {
          mensagem += `\nTotal: ${formatarPreco(valorTotal)}`;
        }
      }
    } else {
      // Pedido do carrinho completo
      const itensCarrinho = obterItensCarrinho();
      if (itensCarrinho.length === 0) {
        showMessage('error', 'Carrinho vazio!');
        return;
      }

      itensCarrinho.forEach((item, index) => {
        const precoProduto = (item as any).precoProduto || item.produto.preco; // ✅ USAR PREÇO SALVO
        mensagem += `${index + 1}. *${item.produto.nome}*\n`;
        mensagem += `   Quantidade: ${item.quantidade}\n`;
        if (config.mostrar_precos) {
          mensagem += `   Preço unitário: ${formatarPreco(precoProduto)}\n`;
          mensagem += `   Subtotal: ${formatarPreco(precoProduto * item.quantidade)}\n`;
        }
        mensagem += '\n';
      });

      if (config.mostrar_precos) {
        mensagem += `*Total Geral: ${formatarPreco(obterTotalCarrinho())}*`;
      }
    }

    const url = `https://wa.me/55${whatsapp}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  const handlePedirCarrinhoCompleto = () => {
    // Abrir modal de finalização em vez de ir direto para o WhatsApp
    setModalFinalizacaoAberto(true);
  };

  const confirmarFinalizacaoPedido = () => {
    // Fechar modal e ir para o WhatsApp
    setModalFinalizacaoAberto(false);
    handlePedirWhatsApp();

    // Limpar carrinho após finalizar pedido
    setQuantidadesProdutos({});
    setOrdemAdicaoItens({});
    setAdicionaisSelecionados({});
    setObservacoesProdutos({});
    setItensCarrinhoSeparados({});
    setCarrinhoAberto(false);

    // Limpar localStorage
    if (empresaId) {
      localStorage.removeItem(`carrinho_${empresaId}`);
      localStorage.removeItem(`carrinho_ordem_${empresaId}`);
      localStorage.removeItem(`carrinho_adicionais_${empresaId}`);
      localStorage.removeItem(`carrinho_observacoes_${empresaId}`);
      localStorage.removeItem(`carrinho_validacao_minima_${empresaId}`);
    }
  };

  const cancelarFinalizacaoPedido = () => {
    setModalFinalizacaoAberto(false);
  };

  // Funções para controlar adicionais nos itens do carrinho separado
  const incrementarAdicionalItem = (itemId: string, adicionalId: string) => {
    setItensCarrinhoSeparados(prev => {
      const item = prev[itemId];
      if (!item) return prev;

      return {
        ...prev,
        [itemId]: {
          ...item,
          adicionais: {
            ...item.adicionais,
            [adicionalId]: (item.adicionais[adicionalId] || 0) + 1
          }
        }
      };
    });
  };

  const decrementarAdicionalItem = (itemId: string, adicionalId: string) => {
    setItensCarrinhoSeparados(prev => {
      const item = prev[itemId];
      if (!item) return prev;

      const quantidadeAtual = item.adicionais[adicionalId] || 0;

      if (quantidadeAtual <= 1) {
        // Remover o adicional se quantidade for 1 ou menor
        const novosAdicionais = { ...item.adicionais };
        delete novosAdicionais[adicionalId];

        return {
          ...prev,
          [itemId]: {
            ...item,
            adicionais: novosAdicionais
          }
        };
      }

      return {
        ...prev,
        [itemId]: {
          ...item,
          adicionais: {
            ...item.adicionais,
            [adicionalId]: quantidadeAtual - 1
          }
        }
      };
    });
  };

  const obterQuantidadeAdicionalItem = (itemId: string, adicionalId: string): number => {
    const item = itensCarrinhoSeparados[itemId];
    return item?.adicionais[adicionalId] || 0;
  };

  // Função para calcular preço com desconto por quantidade
  const calcularPrecoComDescontoQuantidade = (produto: any, quantidade: number): number => {
    let precoFinal = produto.preco;

    // Primeiro aplicar promoção tradicional se houver
    const temPromocaoTradicional = produto.promocao &&
      produto.exibir_promocao_cardapio &&
      produto.tipo_desconto &&
      produto.valor_desconto !== undefined &&
      produto.valor_desconto > 0;

    if (temPromocaoTradicional) {
      precoFinal = calcularValorFinal(produto.preco, produto.tipo_desconto!, produto.valor_desconto!);
    }

    // Depois aplicar desconto por quantidade se a quantidade mínima for atingida
    const temDescontoQuantidade = produto.desconto_quantidade &&
      produto.quantidade_minima &&
      produto.quantidade_minima > 0 &&
      quantidade >= produto.quantidade_minima &&
      ((produto.tipo_desconto_quantidade === 'percentual' && produto.percentual_desconto_quantidade) ||
       (produto.tipo_desconto_quantidade === 'valor' && produto.valor_desconto_quantidade));

    if (temDescontoQuantidade) {
      if (produto.tipo_desconto_quantidade === 'percentual' && produto.percentual_desconto_quantidade) {
        const valorDesconto = (precoFinal * produto.percentual_desconto_quantidade) / 100;
        precoFinal = precoFinal - valorDesconto;
      } else if (produto.tipo_desconto_quantidade === 'valor' && produto.valor_desconto_quantidade) {
        precoFinal = Math.max(0, precoFinal - produto.valor_desconto_quantidade);
      }
    }

    return precoFinal;
  };

  // Função para atualizar preço do item no carrinho quando quantidade muda
  const atualizarPrecoItemCarrinho = (itemId: string, novaQuantidade: number) => {
    const item = itensCarrinhoSeparados[itemId];
    if (!item) return;

    const produto = produtos.find(p => p.id === item.produtoId);
    if (!produto) return;

    // Calcular novo preço baseado na quantidade
    const novoPreco = calcularPrecoComDescontoQuantidade(produto, novaQuantidade);

    // Atualizar item no carrinho com novo preço
    setItensCarrinhoSeparados(prev => ({
      ...prev,
      [itemId]: {
        ...item,
        quantidade: novaQuantidade,
        precoProduto: novoPreco
      }
    }));
  };

  const handleContatoWhatsApp = () => {
    const whatsappNumero = obterWhatsAppEmpresa();
    if (!whatsappNumero) {
      showMessage('error', 'WhatsApp da empresa não disponível');
      return;
    }

    const whatsapp = whatsappNumero.replace(/\D/g, '');
    const mensagem = `Olá! Gostaria de entrar em contato com vocês.`;
    const url = `https://wa.me/55${whatsapp}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando cardápio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Cardápio não encontrado</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Verifique se o link está correto ou entre em contato com o estabelecimento.
          </p>
        </div>
      </div>
    );
  }



  return (
    <>
      {/* Estilos CSS customizados para animação de entrada suave */}
      <style>{`
        @keyframes itemCaindo {
          0% {
            transform: translateY(-20px) scale(0.8);
            opacity: 0;
          }
          50% {
            transform: translateY(5px) scale(1.05);
            opacity: 0.8;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>

      <div className={`min-h-screen ${config.modo_escuro ? 'bg-gray-900' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
      {/* Área fixa para tarja de aviso de fechamento - sempre presente no DOM */}
      <div
        className={`transition-all duration-500 ease-in-out overflow-hidden ${
          modoAutomatico && mostrarAvisoFechamento && lojaAberta === true
            ? 'max-h-24 opacity-100'
            : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-yellow-600 text-white py-3 px-4 text-center relative overflow-hidden animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 animate-pulse"></div>
          <div className="relative z-10 flex items-center justify-center gap-3">
            <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
            <div className="font-bold text-lg">
              ⚠️ ATENÇÃO - LOJA FECHARÁ EM BREVE
            </div>
            <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
          </div>
          <div className="relative z-10 mt-1">
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <p className="text-sm font-medium">
                A loja fechará em:
              </p>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2">
                <span className="font-mono text-lg font-bold tracking-wider">
                  ⏰ {contadorFechamento}
                </span>
              </div>
            </div>
            <p className="text-xs mt-2 font-medium opacity-90">
              Finalize seu pedido antes do fechamento
            </p>
          </div>
        </div>
      </div>

      {/* Área fixa para tarja de loja fechada - sempre presente no DOM */}
      <div
        className={`transition-all duration-500 ease-in-out overflow-hidden ${
          lojaAberta === false
            ? 'max-h-20 opacity-100'
            : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-red-600 text-white py-3 px-4 text-center relative overflow-hidden animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-red-500 to-red-600 animate-pulse"></div>
          <div className="relative z-10 flex items-center justify-center gap-3">
            <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
            <div className="font-bold text-lg">
              🔒 LOJA FECHADA
            </div>
            <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
          </div>
          <div className="relative z-10 mt-1">
            {modoAutomatico && contadorRegressivo ? (
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <p className="text-sm font-medium">
                  A loja abrirá em:
                </p>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2">
                  <span className="font-mono text-lg font-bold tracking-wider">
                    ⏰ {contadorRegressivo}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm font-medium">
                No momento não é possível fazer pedidos. Tente novamente mais tarde.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Header com gradiente - Oculto quando carrinho está aberto */}
      <div className={`relative ${config.modo_escuro ? 'bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800' : 'bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800'} shadow-xl transition-all duration-300 ${
        carrinhoAberto && obterQuantidadeTotalItens() > 0 ? 'hidden' : ''
      }`}>
        {/* Overlay pattern */}
        <div className="absolute inset-0 bg-black/10 backdrop-blur-sm"></div>

        <div className="relative max-w-6xl mx-auto px-4 py-8 md:py-12">
          <div className="text-center">
            {/* Logo da empresa com efeito */}
            {empresa?.logo_url && (
              <div className="mb-6">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-white/20 rounded-full blur-xl"></div>
                  <img
                    src={empresa.logo_url}
                    alt={`Logo ${empresa.nome_fantasia || empresa.razao_social}`}
                    className="relative w-28 h-28 md:w-32 md:h-32 mx-auto object-contain rounded-2xl bg-white/10 backdrop-blur-sm p-2 border border-white/20 shadow-2xl"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}

            {/* Nome da empresa com efeito */}
            <div className="mb-4">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
                {empresa?.nome_fantasia || empresa?.razao_social}
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-yellow-400 to-orange-500 mx-auto rounded-full"></div>
            </div>

            {/* Informações da empresa */}
            <div className="space-y-2 text-white/90">
              {empresa?.endereco && (
                <div className="flex items-center justify-center gap-2 text-sm md:text-base">
                  <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>
                    {empresa.endereco}
                    {empresa.numero && `, ${empresa.numero}`}
                    {empresa.bairro && ` - ${empresa.bairro}`}
                    {empresa.cidade && `, ${empresa.cidade}`}
                    {empresa.estado && ` - ${empresa.estado}`}
                  </span>
                </div>
              )}
              {obterTodosTelefones().length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {obterTodosTelefones().map((telefone, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        if (telefone.whatsapp) {
                          // Se tem WhatsApp, abrir WhatsApp
                          const whatsapp = telefone.numero.replace(/\D/g, '');
                          const mensagem = `Olá! Gostaria de entrar em contato com vocês.`;
                          const url = `https://wa.me/55${whatsapp}?text=${encodeURIComponent(mensagem)}`;
                          window.open(url, '_blank');
                        } else {
                          // Se não tem WhatsApp, fazer ligação
                          const numeroLimpo = telefone.numero.replace(/\D/g, '');
                          window.open(`tel:+55${numeroLimpo}`, '_self');
                        }
                      }}
                      className={`flex items-center justify-center gap-2 text-sm md:text-base backdrop-blur-sm border rounded-lg px-4 py-2 transition-all duration-300 hover:scale-105 group ${
                        telefone.whatsapp
                          ? 'bg-green-600/20 hover:bg-green-600/30 border-green-400/30'
                          : 'bg-blue-600/20 hover:bg-blue-600/30 border-blue-400/30'
                      }`}
                    >
                      {/* Ícone baseado no tipo e WhatsApp */}
                      {telefone.tipo === 'Celular' && telefone.whatsapp ? (
                        <svg className="w-5 h-5 text-green-400 group-hover:text-green-300 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.515z"/>
                        </svg>
                      ) : (
                        <svg className={`w-5 h-5 transition-colors ${telefone.tipo === 'Celular' ? 'text-blue-400 group-hover:text-blue-300' : 'text-gray-400 group-hover:text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      )}
                      <span className="text-white/90 group-hover:text-white transition-colors font-medium">{telefone.numero}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Seção de Horários de Atendimento */}
              {horarios.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setHorariosExpanded(!horariosExpanded)}
                    className="flex items-center justify-center gap-2 text-sm md:text-base bg-blue-600/20 hover:bg-blue-600/30 backdrop-blur-sm border border-blue-400/30 rounded-lg px-4 py-2 transition-all duration-300 hover:scale-105 group w-full md:w-auto"
                  >
                    <Clock size={18} className="text-blue-400 group-hover:text-blue-300 transition-colors" />
                    <span className="text-white/90 group-hover:text-white transition-colors font-medium">
                      Horários de Atendimento
                    </span>
                    <ChevronDown
                      size={18}
                      className={`text-blue-400 group-hover:text-blue-300 transition-all duration-300 ${horariosExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Lista de horários expandida */}
                  {horariosExpanded && (
                    <div className="mt-3 bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-lg p-4 space-y-2">
                      {horarios.map((horario) => (
                        <div key={horario.id} className="flex justify-between items-center">
                          <span className="text-white/90 font-medium">
                            {obterNomeDiaSemana(horario.dia_semana)}
                          </span>
                          <span className="text-blue-400">
                            {formatarHorario(horario.hora_abertura)} - {formatarHorario(horario.hora_fechamento)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal do Carrinho - ACIMA dos grupos */}
      {carrinhoAberto && obterQuantidadeTotalItens() > 0 && (
        <div className={`${config.modo_escuro ? 'bg-gray-800/95' : 'bg-white/95'} backdrop-blur-sm border-b ${config.modo_escuro ? 'border-gray-700' : 'border-gray-200'} sticky top-0 z-30 transition-all duration-500 ${
          carrinhoRecemAberto
            ? 'animate-pulse shadow-2xl ring-4 ring-purple-500/50 ring-opacity-75'
            : ''
        }`}>
          {/* Seta Indicativa - Aparece quando carrinho é aberto pela primeira vez */}
          {carrinhoRecemAberto && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-40">
              <div className="flex flex-col items-center animate-bounce">
                <ArrowDown size={24} className="text-purple-500 animate-pulse" />
                <span className={`text-xs font-bold mt-1 px-2 py-1 rounded ${
                  config.modo_escuro ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-800'
                }`}>
                  Aqui!
                </span>
              </div>
            </div>
          )}

          <div className={`max-w-6xl mx-auto px-4 py-3 transition-all duration-700 ${
            carrinhoRecemAberto
              ? 'transform translate-y-0 opacity-100 animate-bounce'
              : 'transform translate-y-0 opacity-100'
          }`}>
            {/* Banner de Notificação - Aparece quando carrinho é aberto pela primeira vez */}
            {carrinhoRecemAberto && (
              <div className={`mb-3 p-3 rounded-lg border-2 border-dashed animate-pulse ${
                config.modo_escuro
                  ? 'bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-purple-400 text-purple-200'
                  : 'bg-gradient-to-r from-purple-100 to-blue-100 border-purple-500 text-purple-800'
              }`}>
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping"></div>
                  <span className="text-sm font-semibold">
                    🎉 Item adicionado ao carrinho! Seus pedidos aparecem aqui
                  </span>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping"></div>
                </div>
              </div>
            )}

            {/* Header do Carrinho */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className={config.modo_escuro ? 'text-purple-400' : 'text-purple-600'} />
                <h3 className={`font-semibold text-sm ${config.modo_escuro ? 'text-white' : 'text-gray-800'}`}>
                  ({obterQuantidadeTotalItens()} {obterQuantidadeTotalItens() === 1 ? 'item' : 'itens'})
                </h3>
                {config.mostrar_precos && (
                  <span className={`text-sm font-bold ${config.modo_escuro ? 'text-green-400' : 'text-green-600'}`}>
                    Total: {formatarPreco(obterTotalCarrinho())}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModalTodosItensAberto(true)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    config.modo_escuro
                      ? 'text-blue-400 hover:bg-blue-900/20'
                      : 'text-blue-600 hover:bg-blue-100'
                  }`}
                  title="Ver todos os itens"
                >
                  <List size={16} />
                </button>
                <button
                  onClick={abrirModalConfirmacao}
                  className={`p-1.5 rounded-lg transition-colors ${
                    config.modo_escuro
                      ? 'text-red-400 hover:bg-red-900/20'
                      : 'text-red-600 hover:bg-red-100'
                  }`}
                  title="Limpar carrinho"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={() => setCarrinhoAberto(false)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    config.modo_escuro
                      ? 'text-gray-400 hover:bg-gray-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Lista de Itens do Carrinho */}
            <div className="max-h-28 overflow-y-auto space-y-2 mb-3">
              {obterItensCarrinho().map((item) => {
                const { produto, quantidade, adicionais, observacao, itemId } = item as any;
                return (
                <div
                  key={itemId}
                  className={`p-2 rounded-lg transition-all duration-500 ${
                    config.modo_escuro ? 'bg-gray-700/50' : 'bg-gray-50'
                  } ${
                    itemChacoalhando === produto.id
                      ? 'shadow-lg ring-2 ring-blue-400/50 bg-blue-50 dark:bg-blue-900/20'
                      : ''
                  }`}
                  style={{
                    animation: itemChacoalhando === produto.id
                      ? 'itemCaindo 0.6s ease-out'
                      : undefined
                  }}
                >
                  {/* Layout com foto (quando configuração ativa) */}
                  {config.cardapio_fotos_minimizadas ? (
                    <>
                      {/* Header do Item - Foto + Nome/Preço + Controles */}
                      <div className="flex items-center gap-3 mb-2">
                        {/* Foto do produto */}
                        <div
                          className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0 cursor-pointer"
                          onClick={() => abrirGaleriaFotos(produto, 0)}
                        >
                          {(() => {
                            const fotoItem = getFotoPrincipal(produto);
                            return fotoItem ? (
                              <img
                                src={fotoItem.url}
                                alt={produto.nome}
                                className="w-full h-full object-cover hover:scale-110 transition-transform duration-200"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package size={16} className={config.modo_escuro ? 'text-gray-500' : 'text-gray-400'} />
                              </div>
                            );
                          })()}

                          {/* Contador de fotos */}
                          {produto.fotos_count && produto.fotos_count > 1 && (
                            <div className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                              {produto.fotos_count}
                            </div>
                          )}
                        </div>

                        {/* Área central com Nome e Preço em 2 linhas */}
                        <div className="flex-1 min-w-0">
                          {/* Linha 1: Nome do produto */}
                          <h4 className={`font-medium text-sm truncate ${config.modo_escuro ? 'text-white' : 'text-gray-800'}`}>
                            {produto.nome}
                          </h4>
                          {/* Linha 2: Preço */}
                          {config.mostrar_precos && (
                            <div className={`text-xs ${config.modo_escuro ? 'text-gray-300' : 'text-gray-600'}`}>
                              {(() => {
                                const precoProduto = (item as any).precoProduto || produto.preco; // ✅ USAR PREÇO SALVO
                                return `${formatarPreco(precoProduto)} × ${formatarQuantidade(quantidade, produto.unidade_medida)} = ${formatarPreco(precoProduto * quantidade)}`;
                              })()}
                            </div>
                          )}
                        </div>

                        {/* Controles de Quantidade do Produto Principal */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => decrementarQuantidadeItemCarrinho(itemId)}
                            disabled={lojaAberta === false}
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                              lojaAberta === false
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : config.modo_escuro
                                ? 'bg-gray-600 text-white hover:bg-gray-500'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            <Minus size={12} />
                          </button>

                          {itemEditandoCarrinho === produto.id && lojaAberta !== false ? (
                            <input
                              type="text"
                              value={formatarQuantidade(quantidade, produto.unidade_medida)}
                              onChange={(e) => handleQuantidadeInputChange(produto.id, e.target.value)}
                              onBlur={() => setItemEditandoCarrinho(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  setItemEditandoCarrinho(null);
                                }
                              }}
                              className={`w-8 h-6 text-center text-xs font-semibold rounded border focus:outline-none ${
                                config.modo_escuro
                                  ? 'bg-gray-600 border-gray-500 text-white focus:border-purple-400'
                                  : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                              }`}
                              placeholder={produto.unidade_medida?.fracionado ? "0,000" : "0"}
                              autoFocus
                            />
                          ) : (
                            <button
                              onClick={() => lojaAberta !== false && setItemEditandoCarrinho(produto.id)}
                              disabled={lojaAberta === false}
                              className={`w-8 h-6 text-center text-xs font-semibold rounded transition-colors ${
                                lojaAberta === false
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : config.modo_escuro
                                  ? 'bg-gray-600 text-white hover:bg-gray-500'
                                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                              }`}
                            >
                              {formatarQuantidade(quantidade, produto.unidade_medida)}
                            </button>
                          )}

                          <button
                            onClick={() => incrementarQuantidadeItemCarrinho(itemId)}
                            disabled={lojaAberta === false}
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                              lojaAberta === false
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : config.modo_escuro
                                ? 'bg-blue-600 text-white hover:bg-blue-500'
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Header do Item - Nome + Preço + Controles (sem foto) */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-medium text-sm truncate ${config.modo_escuro ? 'text-white' : 'text-gray-800'}`}>
                              {produto.nome}
                            </h4>
                            {config.mostrar_precos && (
                              <div className={`text-xs ${config.modo_escuro ? 'text-gray-300' : 'text-gray-600'}`}>
                                {(() => {
                                  const precoProduto = (item as any).precoProduto || produto.preco; // ✅ USAR PREÇO SALVO
                                  return `${formatarPreco(precoProduto)} × ${formatarQuantidade(quantidade, produto.unidade_medida)} = ${formatarPreco(precoProduto * quantidade)}`;
                                })()}
                              </div>
                            )}
                          </div>

                          {/* Controles de Quantidade do Produto Principal */}
                          <div className="flex items-center gap-2 ml-3">
                            <button
                              onClick={() => decrementarQuantidadeItemCarrinho(itemId)}
                              disabled={lojaAberta === false}
                              className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                                lojaAberta === false
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : config.modo_escuro
                                  ? 'bg-gray-600 text-white hover:bg-gray-500'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              <Minus size={12} />
                            </button>

                            {itemEditandoCarrinho === produto.id && lojaAberta !== false ? (
                              <input
                                type="text"
                                value={formatarQuantidade(quantidade, produto.unidade_medida)}
                                onChange={(e) => handleQuantidadeInputChange(produto.id, e.target.value)}
                                onBlur={() => setItemEditandoCarrinho(null)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    setItemEditandoCarrinho(null);
                                  }
                                }}
                                className={`w-8 h-6 text-center text-xs font-semibold rounded border focus:outline-none ${
                                  config.modo_escuro
                                    ? 'bg-gray-600 border-gray-500 text-white focus:border-purple-400'
                                    : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                                }`}
                                placeholder={produto.unidade_medida?.fracionado ? "0,000" : "0"}
                                autoFocus
                              />
                            ) : (
                              <button
                                onClick={() => lojaAberta !== false && setItemEditandoCarrinho(produto.id)}
                                disabled={lojaAberta === false}
                                className={`w-8 h-6 text-center text-xs font-semibold rounded transition-colors ${
                                  lojaAberta === false
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : config.modo_escuro
                                    ? 'bg-gray-600 text-white hover:bg-gray-500'
                                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                                }`}
                              >
                                {formatarQuantidade(quantidade, produto.unidade_medida)}
                              </button>
                            )}

                            <button
                              onClick={() => incrementarQuantidadeItemCarrinho(itemId)}
                              disabled={lojaAberta === false}
                              className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                                lojaAberta === false
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : config.modo_escuro
                                  ? 'bg-blue-600 text-white hover:bg-blue-500'
                                  : 'bg-blue-500 text-white hover:bg-blue-600'
                              }`}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Seção de Adicionais - Largura Total */}
                  {adicionais && adicionais.length > 0 && (
                    <div className="mb-2">
                      {/* Divisória */}
                      <div className={`border-t ${config.modo_escuro ? 'border-gray-600' : 'border-gray-300'} mb-2`}></div>

                      {/* Título */}
                      <div className={`text-xs font-medium mb-2 ${config.modo_escuro ? 'text-gray-400' : 'text-gray-500'}`}>
                        Adicionais:
                      </div>

                      {/* Lista de Adicionais com Controles */}
                      <div className="space-y-1">
                        {adicionais.map(adicional => (
                          <div
                            key={adicional.id}
                            className={`flex items-center justify-between p-2 rounded-lg ${
                              config.modo_escuro ? 'bg-gray-800/50' : 'bg-gray-50'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-medium ${config.modo_escuro ? 'text-white' : 'text-gray-800'}`}>
                                  + {adicional.nome}
                                </span>
                                {config.mostrar_precos && (
                                  <span className={`text-xs ${config.modo_escuro ? 'text-gray-300' : 'text-gray-600'}`}>
                                    {formatarPreco(adicional.preco * adicional.quantidade * quantidade)}
                                  </span>
                                )}
                              </div>
                              <div className={`text-xs ${config.modo_escuro ? 'text-gray-400' : 'text-gray-500'}`}>
                                {adicional.preco > 0 ? `${formatarPreco(adicional.preco)} cada` : 'Grátis'}
                              </div>
                            </div>

                            {/* Controles de Quantidade do Adicional */}
                            {obterWhatsAppEmpresa() && lojaAberta !== false && (
                              <div className="flex items-center gap-1 ml-3">
                                <button
                                  onClick={() => decrementarAdicional(produto.id, adicional.id)}
                                  disabled={adicional.quantidade === 0}
                                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                                    adicional.quantidade === 0
                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                      : config.modo_escuro
                                      ? 'bg-gray-600 text-white hover:bg-gray-500'
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  <Minus size={8} />
                                </button>

                                <span className={`w-5 text-center text-xs font-semibold ${
                                  config.modo_escuro ? 'text-white' : 'text-gray-800'
                                }`}>
                                  {adicional.quantidade}
                                </span>

                                <button
                                  onClick={() => incrementarAdicional(produto.id, adicional.id)}
                                  disabled={!podeIncrementarAdicional(produto.id, adicional.id)}
                                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                                    !podeIncrementarAdicional(produto.id, adicional.id)
                                      ? config.modo_escuro
                                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                      : config.modo_escuro
                                      ? 'bg-blue-600 text-white hover:bg-blue-500'
                                      : 'bg-blue-500 text-white hover:bg-blue-600'
                                  }`}
                                >
                                  <Plus size={8} />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Observação do Item */}
                  {observacao && (
                    <div className={`mt-2 p-2 rounded-lg ${
                      config.modo_escuro ? 'bg-gray-800/50' : 'bg-gray-100'
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className={`text-xs font-medium mb-1 ${
                            config.modo_escuro ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            Observação:
                          </div>
                          <p className={`text-xs ${
                            config.modo_escuro ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                            {observacao}
                          </p>
                        </div>
                        <button
                          onClick={() => abrirModalObservacao(produto.id, itemId)}
                          className={`p-1 rounded-full transition-colors flex-shrink-0 ${
                            config.modo_escuro
                              ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                          }`}
                          title="Editar observação"
                        >
                          <Edit size={12} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Total do Item */}
                  {config.mostrar_precos && adicionais && adicionais.length > 0 && (
                    <div className={`text-xs font-semibold pt-2 border-t ${
                      config.modo_escuro ? 'border-gray-600 text-green-400' : 'border-gray-300 text-green-600'
                    }`}>
                      Total do Item: {formatarPreco(
                        (((item as any).precoProduto || produto.preco) * quantidade) + // ✅ USAR PREÇO SALVO
                        adicionais.reduce((total, adicional) => total + (adicional.preco * adicional.quantidade * quantidade), 0)
                      )}
                    </div>
                  )}


                </div>
                );
              })}
            </div>

            {/* Botão Finalizar Pedido */}
            {obterWhatsAppEmpresa() && (
              <button
                onClick={handlePedirCarrinhoCompleto}
                disabled={lojaAberta === false}
                className={`w-full py-2 px-4 rounded-lg font-semibold text-sm transition-all duration-300 ${
                  lojaAberta === false
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white transform hover:scale-[1.02] shadow-lg'
                }`}
              >
                {lojaAberta === false ? 'Loja Fechada' : 'Finalizar Pedido'}
              </button>
            )}
          </div>
        </div>
      )}





      {/* SEÇÃO DE TESTE - Categorias Funcionais */}
      {grupos.length > 0 && (
        <div style={{
          backgroundColor: config.modo_escuro ? '#1F2937' : '#F9FAFB',
          borderBottom: config.modo_escuro ? '1px solid #374151' : '1px solid #E5E7EB',
          padding: '1rem 0'
        }}>
          <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '0 1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Cabeçalho */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '1.25rem' }}>🏷️</div>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: config.modo_escuro ? 'white' : '#1F2937',
                  margin: 0
                }}>
                  Categorias ({grupos.length + 1})
                </h3>
              </div>

              {/* Container de Categorias com Keen Slider */}
              <div style={{ height: '48px', position: 'relative' }}>
                {/* ✅ INDICADOR VISUAL PARA USUÁRIOS LEIGOS */}
                {(() => {
                  const totalCategorias = grupos.length + 1;
                  const slidesPerView = 3.5;
                  const totalPaginas = Math.ceil(totalCategorias / slidesPerView);
                  const isUltimaPagina = currentSlide >= totalPaginas - 1;

                  return totalCategorias > 4 && !hasShownPeekCategoria && !isUltimaPagina && (
                    <div className={`absolute -top-6 right-0 z-10 flex items-center gap-1 text-xs font-medium animate-pulse ${
                      config.modo_escuro ? 'text-blue-300' : 'text-blue-600'
                    }`}>
                      <span>Deslize para ver mais</span>
                      <div className="flex">
                        <div className="w-1 h-1 rounded-full bg-current animate-bounce"></div>
                        <div className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  );
                })()}

                {/* Slider Container */}
                <div ref={sliderRef} className="keen-slider" style={{ height: '100%' }}>
                  {/* Categoria "Todos" */}
                  <div
                    className="keen-slider__slide"
                    style={{ minWidth: '120px', width: '120px' }}
                  >
                    <button
                      onClick={() => setGrupoSelecionado('todos')}
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
                        background: grupoSelecionado === 'todos'
                          ? 'linear-gradient(to right, #7C3AED, #2563EB)'
                          : config.modo_escuro ? '#4B5563' : '#F3F4F6',
                        color: grupoSelecionado === 'todos'
                          ? 'white'
                          : config.modo_escuro ? '#D1D5DB' : '#374151',
                        boxShadow: grupoSelecionado === 'todos' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (grupoSelecionado !== 'todos') {
                          e.currentTarget.style.backgroundColor = config.modo_escuro ? '#6B7280' : '#E5E7EB';
                          e.currentTarget.style.color = config.modo_escuro ? 'white' : '#1F2937';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (grupoSelecionado !== 'todos') {
                          e.currentTarget.style.backgroundColor = config.modo_escuro ? '#4B5563' : '#F3F4F6';
                          e.currentTarget.style.color = config.modo_escuro ? '#D1D5DB' : '#374151';
                        }
                      }}
                    >
                      🍽️ Todos
                    </button>
                  </div>

                  {/* Categorias Reais */}
                  {grupos
                    .sort((a, b) => {
                      // Aplicar a mesma lógica de ordenação dos grupos
                      const aTemOrdenacao = a.ordenacao_cardapio_habilitada &&
                                           a.ordenacao_cardapio_digital !== null &&
                                           a.ordenacao_cardapio_digital !== undefined;
                      const bTemOrdenacao = b.ordenacao_cardapio_habilitada &&
                                           b.ordenacao_cardapio_digital !== null &&
                                           b.ordenacao_cardapio_digital !== undefined;

                      if (aTemOrdenacao && bTemOrdenacao) {
                        const posicaoA = Number(a.ordenacao_cardapio_digital);
                        const posicaoB = Number(b.ordenacao_cardapio_digital);
                        return posicaoA - posicaoB;
                      }

                      if (aTemOrdenacao && !bTemOrdenacao) return -1;
                      if (!aTemOrdenacao && bTemOrdenacao) return 1;

                      const dateA = new Date(a.created_at || 0).getTime();
                      const dateB = new Date(b.created_at || 0).getTime();
                      return dateB - dateA;
                    })
                    .map((grupo) => (
                      <div
                        key={grupo.id}
                        className="keen-slider__slide"
                        style={{ minWidth: '120px', width: '120px' }}
                      >
                        <button
                          onClick={() => setGrupoSelecionado(grupo.id)}
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
                            background: grupoSelecionado === grupo.id
                              ? 'linear-gradient(to right, #7C3AED, #2563EB)'
                              : config.modo_escuro ? '#4B5563' : '#F3F4F6',
                            color: grupoSelecionado === grupo.id
                              ? 'white'
                              : config.modo_escuro ? '#D1D5DB' : '#374151',
                            boxShadow: grupoSelecionado === grupo.id ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
                          }}
                          onMouseEnter={(e) => {
                            if (grupoSelecionado !== grupo.id) {
                              e.currentTarget.style.backgroundColor = config.modo_escuro ? '#6B7280' : '#E5E7EB';
                              e.currentTarget.style.color = config.modo_escuro ? 'white' : '#1F2937';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (grupoSelecionado !== grupo.id) {
                              e.currentTarget.style.backgroundColor = config.modo_escuro ? '#4B5563' : '#F3F4F6';
                              e.currentTarget.style.color = config.modo_escuro ? '#D1D5DB' : '#374151';
                            }
                          }}
                        >
                          {(grupo as any).exibir_emoji_cardapio && (grupo as any).emoji_selecionado && (
                            <span style={{ marginRight: '0.5rem' }}>
                              {(grupo as any).emoji_selecionado}
                            </span>
                          )}
                          {grupo.nome}
                        </button>
                      </div>
                    ))}
                </div>

                {/* ✅ INDICADORES MELHORADOS PARA USUÁRIOS LEIGOS */}
                {loaded && instanceRef.current && (grupos.length + 1) > 4 && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    {/* Contador de páginas */}
                    <span className={`text-xs font-medium ${
                      config.modo_escuro ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {currentSlide + 1} de {(() => {
                        const totalSlides = instanceRef.current?.track?.details?.slides?.length || 0;
                        const slidesPerView = 3.5;
                        return Math.max(1, Math.ceil(totalSlides / slidesPerView));
                      })()}
                    </span>

                    {/* Indicadores de navegação */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {(() => {
                        const totalSlides = instanceRef.current?.track?.details?.slides?.length || 0;
                        const slidesPerView = 3.5;
                        const totalIndicators = Math.max(1, Math.ceil(totalSlides / slidesPerView));

                        return Array.from({ length: totalIndicators }).map((_, idx) => {
                          const isActive = currentSlide === idx;

                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                instanceRef.current?.moveToIdx(idx);
                                setTimeout(() => {
                                  if (instanceRef.current) {
                                    const newIndex = instanceRef.current.track.details.rel;
                                    setCurrentSlide(newIndex);
                                  }
                                }, 100);
                              }}
                              className={`w-2 h-2 rounded-full transition-all duration-300 hover:scale-125 ${
                                isActive
                                  ? config.modo_escuro
                                    ? 'bg-blue-400 shadow-lg shadow-blue-400/50'
                                    : 'bg-blue-600 shadow-lg shadow-blue-600/50'
                                  : config.modo_escuro
                                    ? 'bg-gray-600 hover:bg-gray-500'
                                    : 'bg-gray-300 hover:bg-gray-400'
                              }`}
                            />
                          );
                      });
                    })()}
                    </div>

                    {/* Setas de navegação */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => instanceRef.current?.prev()}
                        disabled={currentSlide === 0}
                        className={`p-1 rounded-full transition-all duration-200 ${
                          currentSlide === 0
                            ? config.modo_escuro ? 'text-gray-600' : 'text-gray-300'
                            : config.modo_escuro
                              ? 'text-blue-400 hover:bg-gray-700 active:scale-95'
                              : 'text-blue-600 hover:bg-blue-50 active:scale-95'
                        }`}
                      >
                        <ChevronDown className="w-4 h-4 rotate-90" />
                      </button>
                      <button
                        onClick={() => instanceRef.current?.next()}
                        disabled={(() => {
                          const totalSlides = instanceRef.current?.track?.details?.slides?.length || 0;
                          const slidesPerView = 3.5;
                          return currentSlide >= Math.ceil(totalSlides / slidesPerView) - 1;
                        })()}
                        className={`p-1 rounded-full transition-all duration-200 ${
                          (() => {
                            const totalSlides = instanceRef.current?.track?.details?.slides?.length || 0;
                            const slidesPerView = 3.5;
                            return currentSlide >= Math.ceil(totalSlides / slidesPerView) - 1;
                          })()
                            ? config.modo_escuro ? 'text-gray-600' : 'text-gray-300'
                            : config.modo_escuro
                              ? 'text-blue-400 hover:bg-gray-700 active:scale-95'
                              : 'text-blue-600 hover:bg-blue-50 active:scale-95'
                        }`}
                      >
                        <ChevronDown className="w-4 h-4 -rotate-90" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campo de Pesquisa */}
      <div className={`${config.modo_escuro ? 'bg-gray-800/30' : 'bg-white/60'} backdrop-blur-sm border-b ${config.modo_escuro ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="relative max-w-md mx-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className={`w-5 h-5 ${config.modo_escuro ? 'text-gray-400' : 'text-gray-500'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Pesquisar produtos..."
              value={termoPesquisa}
              onChange={(e) => setTermoPesquisa(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all duration-300 focus:outline-none focus:ring-2 ${
                config.modo_escuro
                  ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:ring-purple-500/50 focus:border-purple-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-purple-500/50 focus:border-purple-500 shadow-sm'
              }`}
            />
            {termoPesquisa && (
              <button
                onClick={() => setTermoPesquisa('')}
                className={`absolute inset-y-0 right-0 pr-3 flex items-center ${
                  config.modo_escuro ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                } transition-colors duration-200`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Seção de Promoções */}
      {produtosEmPromocaoFiltrados.length > 0 && (
        <div className={`${config.modo_escuro ? 'bg-gray-800/20' : 'bg-gradient-to-r from-red-50 to-pink-50'} border-b ${config.modo_escuro ? 'border-gray-700' : 'border-red-100'}`}>
          <div className="max-w-6xl mx-auto px-4 py-6">
            {/* Cabeçalho da seção */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="text-2xl">🔥</div>
                <h2 className={`text-xl font-bold ${config.modo_escuro ? 'text-white' : 'text-gray-800'}`}>
                  Promoções Especiais
                </h2>
              </div>
              <div className={`text-sm font-medium px-3 py-1 rounded-full ${
                config.modo_escuro
                  ? 'bg-red-900/50 text-red-300 border border-red-700'
                  : 'bg-red-100 text-red-700 border border-red-200'
              }`}>
                {produtosEmPromocaoFiltrados.length} {produtosEmPromocaoFiltrados.length === 1 ? 'item' : 'itens'}
              </div>
            </div>

            {/* Slider de promoções */}
            <PromocoesSlider
              promocoes={produtosEmPromocaoFiltrados}
              config={config}
              formatarPreco={formatarPreco}
              calcularValorFinal={calcularValorFinal}
            />
          </div>
        </div>
      )}

      {/* Lista de Produtos com design moderno */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {produtosFiltrados.length === 0 ? (
          <div className="text-center py-16">
            <div className={`w-24 h-24 mx-auto mb-6 rounded-full ${config.modo_escuro ? 'bg-gray-800' : 'bg-gray-100'} flex items-center justify-center`}>
              <svg className={`w-12 h-12 ${config.modo_escuro ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className={`text-xl font-semibold mb-2 ${config.modo_escuro ? 'text-white' : 'text-gray-800'}`}>
              Nenhum produto encontrado
            </h3>
            <p className={`text-lg ${config.modo_escuro ? 'text-gray-400' : 'text-gray-600'}`}>
              {termoPesquisa
                ? `Não encontramos produtos com "${termoPesquisa}".`
                : 'Não há produtos disponíveis nesta categoria no momento.'
              }
            </p>
            {termoPesquisa && (
              <button
                onClick={() => setTermoPesquisa('')}
                className="mt-4 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300"
              >
                Limpar pesquisa
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-12">
            {produtosAgrupados().map(({ grupo, produtos }) => (
              <div key={grupo.id} className="space-y-6">
                {/* Cabeçalho do Grupo - Oculto se configuração estiver ativa */}
                {!config.ocultar_grupos_cardapio && (
                  <div className="text-left">
                    <h2 className={`text-2xl font-bold mb-2 ${config.modo_escuro ? 'text-white' : 'text-gray-800'}`}>
                      {grupo.nome}
                    </h2>
                    <div className={`w-24 h-1 rounded-full bg-gradient-to-r from-purple-600 to-blue-600`}></div>
                  </div>
                )}

                {/* Grid de Produtos do Grupo */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {produtos.map(produto => {
              const quantidadeSelecionada = obterQuantidadeSelecionada(produto.id);
              const estaSelecionado = quantidadeSelecionada > 0;

              // Verificar estoque do produto (agora individual por produto)
              const semEstoque = produto.controla_estoque_cardapio &&
                                produto.estoque_atual !== undefined &&
                                produto.estoque_atual !== null &&
                                produto.estoque_atual <= 0;

              return (
                <div
                  key={produto.id}
                  className={`group relative overflow-hidden rounded-2xl transition-all duration-300 ${
                    semEstoque ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.02] hover:shadow-2xl cursor-pointer'
                  } ${
                    estaSelecionado
                      ? config.modo_escuro
                        ? 'bg-gradient-to-br from-blue-900/80 to-purple-900/80 border-2 border-blue-500/50 shadow-xl shadow-blue-500/20'
                        : 'bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-400/60 shadow-xl shadow-blue-400/20'
                      : config.modo_escuro
                      ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50'
                      : 'bg-white border border-gray-200 shadow-lg'
                  }`}
                >
                  {/* Todas as tags no canto superior direito */}
                  <div className="absolute top-3 right-3 z-10 flex flex-row gap-1 flex-nowrap items-center">
                    {/* Badge de promoção tradicional */}
                    {produto.promocao && produto.exibir_promocao_cardapio && produto.tipo_desconto && produto.valor_desconto && (
                      <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg whitespace-nowrap">
                        🔥 {produto.tipo_desconto === 'percentual'
                          ? `${produto.valor_desconto}% OFF`
                          : `${formatarPreco(produto.valor_desconto)} OFF`}
                      </div>
                    )}

                    {/* Badge de desconto por quantidade */}
                    {produto.desconto_quantidade && produto.exibir_desconto_qtd_minimo_no_cardapio_digital && produto.quantidade_minima && (
                      <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg whitespace-nowrap">
                        📦 {(() => {
                          if (produto.tipo_desconto_quantidade === 'percentual' && produto.percentual_desconto_quantidade) {
                            return `${produto.percentual_desconto_quantidade}% OFF (mín. ${produto.quantidade_minima})`;
                          } else if (produto.tipo_desconto_quantidade === 'valor' && produto.valor_desconto_quantidade) {
                            return `${formatarPreco(produto.valor_desconto_quantidade)} OFF (mín. ${produto.quantidade_minima})`;
                          } else {
                            return `QTD (mín. ${produto.quantidade_minima})`;
                          }
                        })()}
                      </div>
                    )}

                    {/* Tag de estoque integrada */}
                    {(() => {
                      // Verificar se deve mostrar tag de estoque
                      if (!produto.controla_estoque_cardapio || produto.estoque_atual === undefined || produto.estoque_atual === null) {
                        return null;
                      }

                      const unidadeSigla = produto.unidade_medida?.sigla || 'Un';
                      let estilo = { bg: '', text: '', border: '', icon: '' };
                      let texto = '';

                      if (produto.estoque_atual <= 0) {
                        estilo = {
                          bg: 'bg-red-500/90',
                          text: 'text-white',
                          border: 'border-red-600',
                          icon: '❌'
                        };
                        texto = 'Sem estoque';
                      } else {
                        estilo = {
                          bg: 'bg-green-500/90',
                          text: 'text-white',
                          border: 'border-green-600',
                          icon: '✅'
                        };
                        texto = `Disponível (${produto.estoque_atual} ${unidadeSigla})`;
                      }

                      return (
                        <div className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 shadow-lg whitespace-nowrap ${estilo.bg} ${estilo.text} ${estilo.border}`}>
                          <span>{estilo.icon}</span>
                          <span>{texto}</span>
                        </div>
                      );
                    })()}
                  </div>




                {/* Imagem do produto - Apenas para config.mostrar_fotos (fotos grandes) */}
                {config.mostrar_fotos && !config.cardapio_fotos_minimizadas && (() => {
                  const fotoItem = getFotoPrincipal(produto);
                  return fotoItem ? (
                    <div
                      className="relative h-48 overflow-hidden cursor-pointer"
                      onClick={() => abrirGaleriaFotos(produto, 0)}
                    >
                      <img
                        src={fotoItem.url}
                        alt={produto.nome}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>

                      {/* Contador de fotos */}
                      {produto.fotos_count && produto.fotos_count > 1 && (
                        <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                          {produto.fotos_count}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`h-48 flex items-center justify-center ${config.modo_escuro ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <Package className={`w-16 h-16 ${config.modo_escuro ? 'text-gray-600' : 'text-gray-400'}`} />
                    </div>
                  );
                })()}

                {/* Conteúdo do card */}
                <div className="p-3">
                  {/* Header do Produto */}
                  <div className="mb-3">
                    {/* Layout com foto pequena quando cardapio_fotos_minimizadas ativo */}
                    {config.cardapio_fotos_minimizadas ? (
                      <div className="flex items-center gap-3 mb-2">
                        {/* Foto pequena */}
                        <div
                          className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0 cursor-pointer"
                          onClick={() => abrirGaleriaFotos(produto, 0)}
                        >
                          {(() => {
                            const fotoItem = getFotoPrincipal(produto);
                            return fotoItem ? (
                              <img
                                src={fotoItem.url}
                                alt={produto.nome}
                                className="w-full h-full object-cover hover:scale-110 transition-transform duration-200"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package size={20} className={config.modo_escuro ? 'text-gray-500' : 'text-gray-400'} />
                              </div>
                            );
                          })()}

                          {/* Contador de fotos para foto pequena */}
                          {produto.fotos_count && produto.fotos_count > 1 && (
                            <div className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                              {produto.fotos_count}
                            </div>
                          )}
                        </div>

                        {/* Nome e preço */}
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-lg font-bold leading-tight truncate ${config.modo_escuro ? 'text-white' : 'text-gray-800'} ${(() => {
                            // Verificar se tem alguma tag para adicionar margin-top no nome
                            const temPromocao = produto.promocao && produto.exibir_promocao_cardapio && produto.tipo_desconto && produto.valor_desconto;
                            const temDescontoQtd = produto.desconto_quantidade && produto.exibir_desconto_qtd_minimo_no_cardapio_digital && produto.quantidade_minima;
                            const temEstoque = produto.controla_estoque_cardapio && produto.estoque_atual !== undefined && produto.estoque_atual !== null;

                            const temAlgumTag = temPromocao || temDescontoQtd || temEstoque;
                            return temAlgumTag ? 'mt-8' : '';
                          })()}`}>
                            {produto.nome}
                          </h3>

                          {/* Linha do preço */}
                          <div className="flex items-center mt-1">
                            {config.mostrar_precos && (() => {
                              const tabelasComPrecos = obterTabelasComPrecos(produto.id);
                              const tabelaSelecionadaId = tabelasSelecionadas[produto.id];

                              // Se há tabelas de preços e uma está selecionada, mostrar preço da tabela
                              if (tabelasComPrecos.length > 0 && tabelaSelecionadaId) {
                                const tabelaEscolhida = tabelasComPrecos.find(t => t.id === tabelaSelecionadaId);
                                if (tabelaEscolhida) {
                                  // ✅ VERIFICAR SE PRODUTO TEM PROMOÇÃO PARA APLICAR SOBRE PREÇO DA TABELA
                                  const temPromocao = produto.promocao &&
                                    produto.exibir_promocao_cardapio &&
                                    produto.tipo_desconto &&
                                    produto.valor_desconto !== undefined &&
                                    produto.valor_desconto > 0;

                                  if (temPromocao) {
                                    // Calcular valor final aplicando promoção sobre preço da tabela
                                    const valorFinal = calcularValorFinal(tabelaEscolhida.preco, produto.tipo_desconto, produto.valor_desconto);

                                    return (
                                      <div className="flex flex-col">
                                        {/* Preço da tabela original riscado */}
                                        <div className={`text-sm line-through ${config.modo_escuro ? 'text-gray-400' : 'text-gray-500'}`}>
                                          {formatarPreco(tabelaEscolhida.preco)}
                                        </div>
                                        {/* Preço promocional da tabela */}
                                        <div className="text-lg font-bold text-green-500">
                                          {formatarPreco(valorFinal)}
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    // Preço da tabela sem promoção
                                    return (
                                      <div className={`text-lg font-bold ${
                                        config.modo_escuro ? 'text-green-400' : 'text-green-600'
                                      }`}>
                                        {formatarPreco(tabelaEscolhida.preco)}
                                      </div>
                                    );
                                  }
                                }
                              }

                              // Se não há tabelas de preços, mostrar preço normal
                              if (tabelasComPrecos.length === 0) {
                              // Verificar se produto está em promoção
                              const temPromocao = produto.promocao &&
                                                produto.exibir_promocao_cardapio &&
                                                produto.tipo_desconto &&
                                                produto.valor_desconto !== undefined &&
                                                produto.valor_desconto > 0;

                              if (temPromocao) {
                                // Calcular valor final e desconto
                                const valorFinal = calcularValorFinal(produto.preco, produto.tipo_desconto, produto.valor_desconto);
                                const descontoExibicao = produto.tipo_desconto === 'percentual'
                                  ? `${produto.valor_desconto}% OFF`
                                  : `- ${formatarPreco(produto.valor_desconto)}`;

                                return (
                                  <div className="flex flex-col">
                                    {/* Preço original riscado */}
                                    <div className={`text-sm line-through ${config.modo_escuro ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {formatarPreco(produto.preco)}
                                    </div>
                                    {/* Preço promocional */}
                                    <div className="text-lg font-bold text-green-500">
                                      {formatarPreco(valorFinal)}
                                    </div>
                                  </div>
                                );
                              } else {
                                // Preço normal sem promoção
                                return (
                                  <div className="text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
                                    {formatarPreco(produto.preco)}
                                  </div>
                                );
                              }
                              }

                              // Se há tabelas mas nenhuma selecionada, não mostrar preço
                              return null;
                            })()}
                          </div>
                        </div>

                        {/* Controles de quantidade posicionados alinhados com o conteúdo principal */}
                        {/* ✅ OCULTAR CONTROLADOR QUANDO SEM ESTOQUE */}
                        {obterWhatsAppEmpresa() && !semEstoque && (
                          <div className={`absolute right-3 flex items-center gap-1 ${(() => {
                            // Verificar se tem alguma tag para ajustar posicionamento
                            const temPromocao = produto.promocao && produto.exibir_promocao_cardapio && produto.tipo_desconto && produto.valor_desconto;
                            const temDescontoQtd = produto.desconto_quantidade && produto.exibir_desconto_qtd_minimo_no_cardapio_digital && produto.quantidade_minima;
                            const temEstoque = produto.controla_estoque_cardapio && produto.estoque_atual !== undefined && produto.estoque_atual !== null;

                            const temAlgumTag = temPromocao || temDescontoQtd || temEstoque;
                            // Se tem tags, posicionar mais abaixo para não conflitar
                            // Se não tem tags, posicionar mais acima para alinhar com o conteúdo
                            return temAlgumTag ? 'top-12' : 'top-6';
                          })()}`}>
                            {/* Botão Decrementar */}
                            <button
                              onClick={() => decrementarQuantidade(produto.id)}
                              disabled={obterQuantidadeSelecionada(produto.id) === 0 || lojaAberta === false}
                              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                                obterQuantidadeSelecionada(produto.id) === 0 || lojaAberta === false
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : config.modo_escuro
                                  ? 'bg-gray-600 text-white hover:bg-gray-500'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              <Minus size={12} />
                            </button>

                            {/* Campo de Quantidade */}
                            <input
                              type="text"
                              value={formatarQuantidade(obterQuantidadeSelecionada(produto.id), produto.unidade_medida)}
                              onChange={(e) => handleQuantidadeChange(produto.id, e.target.value)}
                              onBlur={() => setItemEditandoQuantidade(null)}
                              onFocus={() => setItemEditandoQuantidade(produto.id)}
                              disabled={lojaAberta === false}
                              className={`w-10 h-7 text-center text-xs font-semibold rounded-lg border-2 transition-all duration-200 ${
                                lojaAberta === false
                                  ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                                  : itemEditandoQuantidade === produto.id
                                  ? config.modo_escuro
                                    ? 'bg-gray-700 border-blue-500 text-white'
                                    : 'bg-white border-blue-500 text-gray-800'
                                  : config.modo_escuro
                                  ? 'bg-gray-700 border-gray-600 text-white hover:border-gray-500'
                                  : 'bg-white border-gray-300 text-gray-800 hover:border-gray-400'
                              }`}
                            />

                            {/* Botão Incrementar */}
                            <button
                              onClick={() => incrementarQuantidade(produto.id)}
                              disabled={lojaAberta === false}
                              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                                lojaAberta === false
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : config.modo_escuro
                                  ? 'bg-blue-600 text-white hover:bg-blue-500'
                                  : 'bg-blue-500 text-white hover:bg-blue-600'
                              }`}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Layout normal sem foto pequena */
                      <>
                        <div>
                          <h3 className={`text-xl font-bold mb-2 truncate ${config.modo_escuro ? 'text-white' : 'text-gray-800'} ${(() => {
                            // Verificar se tem alguma tag para adicionar margin-top no nome
                            const temPromocao = produto.promocao && produto.exibir_promocao_cardapio && produto.tipo_desconto && produto.valor_desconto;
                            const temDescontoQtd = produto.desconto_quantidade && produto.exibir_desconto_qtd_minimo_no_cardapio_digital && produto.quantidade_minima;
                            const temEstoque = produto.controla_estoque_cardapio && produto.estoque_atual !== undefined && produto.estoque_atual !== null;

                            const temAlgumTag = temPromocao || temDescontoQtd || temEstoque;
                            return temAlgumTag ? 'mt-8' : '';
                          })()}`}>
                            {produto.nome}
                          </h3>
                        </div>
                        {/* Preço logo abaixo do nome quando não tem foto */}
                        <div className="flex items-center mb-3">
                          {config.mostrar_precos && (() => {
                            const tabelasComPrecos = obterTabelasComPrecos(produto.id);
                            const tabelaSelecionadaId = tabelasSelecionadas[produto.id];

                            // Se há tabelas de preços e uma está selecionada, mostrar preço da tabela
                            if (tabelasComPrecos.length > 0 && tabelaSelecionadaId) {
                              const tabelaEscolhida = tabelasComPrecos.find(t => t.id === tabelaSelecionadaId);
                              if (tabelaEscolhida) {
                                // ✅ PRIMEIRO APLICAR PROMOÇÃO TRADICIONAL (SE HOUVER)
                                let precoAtual = tabelaEscolhida.preco;

                                // Verificar se produto está em promoção tradicional
                                const temPromocao = produto.promocao &&
                                  produto.exibir_promocao_cardapio &&
                                  produto.tipo_desconto &&
                                  produto.valor_desconto !== undefined &&
                                  produto.valor_desconto > 0;

                                if (temPromocao) {
                                  // Aplicar promoção sobre preço da tabela
                                  precoAtual = calcularValorFinal(tabelaEscolhida.preco, produto.tipo_desconto, produto.valor_desconto);
                                }

                                // ✅ DEPOIS VERIFICAR DESCONTO POR QUANTIDADE (SOBRE VALOR PROMOCIONAL)
                                const quantidadeSelecionada = obterQuantidadeSelecionada(produto.id);
                                const temDescontoQuantidade = produto.desconto_quantidade &&
                                  produto.quantidade_minima &&
                                  quantidadeSelecionada >= produto.quantidade_minima &&
                                  ((produto.tipo_desconto_quantidade === 'percentual' && produto.percentual_desconto_quantidade) ||
                                   (produto.tipo_desconto_quantidade === 'valor' && produto.valor_desconto_quantidade));

                                if (temDescontoQuantidade) {
                                  // Aplicar desconto por quantidade sobre preço atual (com ou sem promoção)
                                  let valorFinal = precoAtual;
                                  if (produto.tipo_desconto_quantidade === 'percentual' && produto.percentual_desconto_quantidade) {
                                    const valorDesconto = (precoAtual * produto.percentual_desconto_quantidade) / 100;
                                    valorFinal = precoAtual - valorDesconto;
                                  } else if (produto.tipo_desconto_quantidade === 'valor' && produto.valor_desconto_quantidade) {
                                    valorFinal = precoAtual - produto.valor_desconto_quantidade;
                                  }

                                  return (
                                    <div className="flex flex-col">
                                      {/* Preço antes do desconto por quantidade riscado */}
                                      <div className={`text-lg line-through ${config.modo_escuro ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {formatarPreco(precoAtual)}
                                      </div>
                                      {/* Preço com desconto por quantidade */}
                                      <div className="text-2xl font-bold text-green-500">
                                        {formatarPreco(valorFinal)}
                                      </div>
                                    </div>
                                  );
                                }

                                // Se não tem desconto por quantidade, mostrar apenas promoção ou preço normal
                                if (!temPromocao) {
                                  // Preço da tabela sem promoção
                                  return (
                                    <div className={`text-lg font-bold ${
                                      config.modo_escuro ? 'text-green-400' : 'text-green-600'
                                    }`}>
                                      {formatarPreco(tabelaEscolhida.preco)}
                                    </div>
                                  );
                                } else {
                                  // Mostrar apenas promoção tradicional (sem desconto por quantidade)
                                  return (
                                    <div className="flex flex-col">
                                      {/* Preço da tabela original riscado */}
                                      <div className={`text-lg line-through ${config.modo_escuro ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {formatarPreco(tabelaEscolhida.preco)}
                                      </div>
                                      {/* Preço promocional da tabela */}
                                      <div className="text-2xl font-bold text-green-500">
                                        {formatarPreco(precoAtual)}
                                      </div>
                                    </div>
                                  );
                                }
                              }
                            }

                            // Se não há tabelas de preços, mostrar preço normal
                            if (tabelasComPrecos.length === 0) {
                            // ✅ PRIMEIRO APLICAR PROMOÇÃO TRADICIONAL (SE HOUVER)
                            let precoAtual = produto.preco;

                            // Verificar se produto está em promoção tradicional
                            const temPromocaoTradicional = produto.promocao &&
                              produto.exibir_promocao_cardapio &&
                              produto.tipo_desconto &&
                              produto.valor_desconto !== undefined &&
                              produto.valor_desconto > 0;

                            if (temPromocaoTradicional) {
                              // Aplicar promoção sobre preço padrão
                              precoAtual = calcularValorFinal(produto.preco, produto.tipo_desconto, produto.valor_desconto);
                            }

                            // ✅ DEPOIS VERIFICAR DESCONTO POR QUANTIDADE (SOBRE VALOR PROMOCIONAL)
                            const quantidadeSelecionada = obterQuantidadeSelecionada(produto.id);
                            const temDescontoQuantidade = produto.desconto_quantidade &&
                              produto.quantidade_minima &&
                              quantidadeSelecionada >= produto.quantidade_minima &&
                              ((produto.tipo_desconto_quantidade === 'percentual' && produto.percentual_desconto_quantidade) ||
                               (produto.tipo_desconto_quantidade === 'valor' && produto.valor_desconto_quantidade));

                            if (temDescontoQuantidade) {
                              // Aplicar desconto por quantidade sobre preço atual (com ou sem promoção)
                              let valorFinal = precoAtual;
                              if (produto.tipo_desconto_quantidade === 'percentual' && produto.percentual_desconto_quantidade) {
                                const valorDesconto = (precoAtual * produto.percentual_desconto_quantidade) / 100;
                                valorFinal = precoAtual - valorDesconto;
                              } else if (produto.tipo_desconto_quantidade === 'valor' && produto.valor_desconto_quantidade) {
                                valorFinal = precoAtual - produto.valor_desconto_quantidade;
                              }

                              return (
                                <div className="flex flex-col">
                                  {/* Preço antes do desconto por quantidade riscado */}
                                  <div className={`text-lg line-through ${config.modo_escuro ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {formatarPreco(precoAtual)}
                                  </div>
                                  {/* Preço com desconto por quantidade */}
                                  <div className="text-2xl font-bold text-green-500">
                                    {formatarPreco(valorFinal)}
                                  </div>
                                </div>
                              );
                            }

                            // Se não tem desconto por quantidade nem promoção, mostrar preço normal
                            if (!temPromocaoTradicional) {
                              // Preço normal sem promoção
                              return (
                                <span className="text-2xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
                                  {formatarPreco(produto.preco)}
                                </span>
                              );
                            } else {
                              // Mostrar apenas promoção tradicional (sem desconto por quantidade)
                              return (
                                <div className="flex flex-col">
                                  {/* Preço original riscado */}
                                  <div className={`text-lg line-through ${config.modo_escuro ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {formatarPreco(produto.preco)}
                                  </div>
                                  {/* Preço promocional */}
                                  <div className="text-2xl font-bold text-green-500">
                                    {formatarPreco(precoAtual)}
                                  </div>
                                </div>
                              );
                            }
                            }

                            // Se há tabelas mas nenhuma selecionada, não mostrar preço
                            return null;
                          })()}
                        </div>

                        {/* Controles de quantidade posicionados alinhados com o conteúdo principal */}
                        {/* ✅ OCULTAR CONTROLADOR QUANDO SEM ESTOQUE */}
                        {obterWhatsAppEmpresa() && !semEstoque && (
                          <div className={`absolute right-3 flex items-center gap-2 ${(() => {
                            // Verificar se tem alguma tag para ajustar posicionamento
                            const temPromocao = produto.promocao && produto.exibir_promocao_cardapio && produto.tipo_desconto && produto.valor_desconto;
                            const temDescontoQtd = produto.desconto_quantidade && produto.exibir_desconto_qtd_minimo_no_cardapio_digital && produto.quantidade_minima;
                            const temEstoque = produto.controla_estoque_cardapio && produto.estoque_atual !== undefined && produto.estoque_atual !== null;

                            const temAlgumTag = temPromocao || temDescontoQtd || temEstoque;
                            // Se tem tags, posicionar mais abaixo para não conflitar
                            // Se não tem tags, posicionar mais acima para alinhar com o conteúdo
                            return temAlgumTag ? 'top-12' : 'top-8';
                          })()}`}>
                            {/* Botão Decrementar */}
                            <button
                              onClick={() => decrementarQuantidade(produto.id)}
                              disabled={obterQuantidadeProduto(produto.id) === 0 || lojaAberta === false}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                                obterQuantidadeProduto(produto.id) === 0 || lojaAberta === false
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : config.modo_escuro
                                  ? 'bg-gray-600 text-white hover:bg-gray-500'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              <Minus size={14} />
                            </button>

                            {/* Campo de Quantidade */}
                            {produtoEditandoQuantidade === produto.id && lojaAberta !== false ? (
                              <input
                                type="text"
                                value={formatarQuantidade(obterQuantidadeProduto(produto.id), produto.unidade_medida)}
                                onChange={(e) => handleQuantidadeChange(produto.id, e.target.value)}
                                onBlur={() => setProdutoEditandoQuantidade(null)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    setProdutoEditandoQuantidade(null);
                                  }
                                }}
                                className={`w-12 h-8 text-center text-sm font-semibold rounded-lg border-2 transition-all duration-200 ${
                                  config.modo_escuro
                                    ? 'bg-gray-700 border-blue-500 text-white'
                                    : 'bg-white border-blue-500 text-gray-800'
                                }`}
                                placeholder={produto.unidade_medida?.fracionado ? "0,000" : "0"}
                                autoFocus
                              />
                            ) : (
                              <button
                                onClick={() => lojaAberta !== false && setProdutoEditandoQuantidade(produto.id)}
                                disabled={lojaAberta === false}
                                className={`w-12 h-8 text-center text-sm font-semibold rounded-lg border-2 transition-all duration-200 ${
                                  lojaAberta === false
                                    ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                                    : config.modo_escuro
                                    ? 'bg-gray-700 border-gray-600 text-white hover:border-gray-500'
                                    : 'bg-white border-gray-300 text-gray-800 hover:border-gray-400'
                                }`}
                              >
                                {formatarQuantidade(obterQuantidadeProduto(produto.id), produto.unidade_medida)}
                              </button>
                            )}

                            {/* Botão Incrementar */}
                            <button
                              onClick={() => incrementarQuantidade(produto.id)}
                              disabled={lojaAberta === false}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                                lojaAberta === false
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : config.modo_escuro
                                  ? 'bg-blue-600 text-white hover:bg-blue-500'
                                  : 'bg-blue-500 text-white hover:bg-blue-600'
                              }`}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Descrição do produto - largura total do card */}
                  {produto.descricao && (
                    <div className="mb-3 w-full">
                      <p className={`text-sm leading-relaxed w-full ${config.modo_escuro ? 'text-gray-300' : 'text-gray-600'}`}>
                        {produto.descricao}
                      </p>
                    </div>
                  )}



                  {/* Adicionais do produto - aparece quando há quantidade selecionada */}
                  {produto.opcoes_adicionais && produto.opcoes_adicionais.length > 0 && obterQuantidadeSelecionada(produto.id) > 0 && (
                    <div className="mb-3 w-full">
                      {/* Divisória acima dos adicionais */}
                      <div className={`border-t ${config.modo_escuro ? 'border-gray-600' : 'border-gray-300'} mb-2`}></div>

                      {/* Título dos adicionais */}
                      <div className={`text-xs font-medium mb-2 ${config.modo_escuro ? 'text-gray-400' : 'text-gray-500'}`}>
                        <span>Adicionais:</span>
                      </div>

                      {/* Lista de opções de adicionais */}
                      <div className="space-y-2 w-full">
                        {produto.opcoes_adicionais.map(opcao => {
                          return (
                          <div key={opcao.id} className="w-full">
                            {/* Botão do grupo de adicional */}
                            <button
                              onClick={() => toggleAdicionalOpcao(produto.id, opcao.id)}
                              className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                                config.modo_escuro
                                  ? 'bg-gray-700/50 hover:bg-gray-700 text-white'
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                              }`}
                            >
                              <div className="flex-1">
                                {/* Primeira linha: Nome do grupo + contador de itens */}
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{opcao.nome}</span>
                                  <span className={`text-xs ${config.modo_escuro ? 'text-gray-400' : 'text-gray-500'}`}>
                                    ({opcao.itens.length} {opcao.itens.length === 1 ? 'item' : 'itens'})
                                  </span>
                                </div>

                                {/* Segunda linha: Indicadores de quantidade mínima e máxima */}
                                {(opcao.quantidade_minima && opcao.quantidade_minima > 0) || (opcao.quantidade_maxima && opcao.quantidade_maxima > 0) ? (
                                  <div className="flex items-center gap-2 mt-1">
                                    {/* Indicador de quantidade mínima */}
                                    {opcao.quantidade_minima && opcao.quantidade_minima > 0 && (
                                      <div className="flex items-center gap-1">
                                        {(() => {
                                          const quantidadeTotal = obterQuantidadeTotalOpcao(produto.id, opcao.id);
                                          const atingiuMinimo = opcaoAtingiuMinimo(produto.id, opcao.id);
                                          return (
                                            <>
                                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                atingiuMinimo
                                                  ? config.modo_escuro
                                                    ? 'bg-green-900/30 text-green-400 border border-green-700'
                                                    : 'bg-green-100 text-green-600 border border-green-300'
                                                  : config.modo_escuro
                                                  ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700'
                                                  : 'bg-yellow-100 text-yellow-600 border border-yellow-300'
                                              }`}>
                                                Mín: {quantidadeTotal}/{opcao.quantidade_minima}
                                              </span>
                                              {atingiuMinimo && (
                                                <CheckCircle size={14} className={config.modo_escuro ? 'text-green-400' : 'text-green-600'} />
                                              )}
                                            </>
                                          );
                                        })()}
                                      </div>
                                    )}

                                    {/* Indicador de quantidade máxima */}
                                    {opcao.quantidade_maxima && opcao.quantidade_maxima > 0 && (
                                      <div className="flex items-center gap-1">
                                        {(() => {
                                          const quantidadeTotal = obterQuantidadeTotalOpcao(produto.id, opcao.id);
                                          const excedeuMaximo = opcaoExcedeuMaximo(produto.id, opcao.id);
                                          return (
                                            <>
                                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                excedeuMaximo
                                                  ? config.modo_escuro
                                                    ? 'bg-red-900/30 text-red-400 border border-red-700'
                                                    : 'bg-red-100 text-red-600 border border-red-300'
                                                  : config.modo_escuro
                                                  ? 'bg-blue-900/30 text-blue-400 border border-blue-700'
                                                  : 'bg-blue-100 text-blue-600 border border-blue-300'
                                              }`}>
                                                Máx: {quantidadeTotal}/{opcao.quantidade_maxima}
                                              </span>
                                              {excedeuMaximo && (
                                                <AlertCircle size={14} className={config.modo_escuro ? 'text-red-400' : 'text-red-600'} />
                                              )}
                                            </>
                                          );
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                ) : null}
                              </div>

                              {/* Ícone de expansão */}
                              <div className="ml-2">
                                {adicionaisExpandidos[produto.id]?.[opcao.id] ? (
                                  <ChevronUp size={16} className={config.modo_escuro ? 'text-gray-400' : 'text-gray-500'} />
                                ) : (
                                  <ChevronDown size={16} className={config.modo_escuro ? 'text-gray-400' : 'text-gray-500'} />
                                )}
                              </div>
                            </button>

                            {/* Itens do adicional (expansível) - FILTRADOS POR TABELA DE PREÇO */}
                            {adicionaisExpandidos[produto.id]?.[opcao.id] && (
                              <div className="mt-2 space-y-2">
                                {opcao.itens
                                  .filter(item => adicionalDeveSerExibido(produto.id, item.id)) // ✅ FILTRAR POR TABELA
                                  .map(item => {
                                  const quantidade = obterQuantidadeAdicional(produto.id, item.id);
                                  const precoAdicional = obterPrecoAdicional(produto.id, item.id); // ✅ PREÇO DA TABELA
                                  return (
                                    <div
                                      key={item.id}
                                      className={`flex items-center justify-between p-2 rounded-lg ${
                                        config.modo_escuro
                                          ? 'bg-gray-800/50'
                                          : 'bg-gray-50'
                                      }`}
                                    >
                                      <div className="flex-1">
                                        <p className={`text-sm font-medium ${config.modo_escuro ? 'text-white' : 'text-gray-800'}`}>
                                          {item.nome}
                                        </p>
                                        <p className={`text-xs ${config.modo_escuro ? 'text-gray-400' : 'text-gray-600'}`}>
                                          {precoAdicional > 0 ? (
                                            quantidade > 1 ? (
                                              <>
                                                {formatarPreco(precoAdicional * quantidade)}
                                                <span className="opacity-70"> ({quantidade}x {formatarPreco(precoAdicional)})</span>
                                              </>
                                            ) : (
                                              `+ ${formatarPreco(precoAdicional)}`
                                            )
                                          ) : 'Grátis'}
                                        </p>
                                      </div>

                                      {/* Controles de quantidade do adicional */}
                                      {obterWhatsAppEmpresa() && lojaAberta !== false && (
                                        <div className="flex items-center gap-1">
                                          {/* Botão Decrementar */}
                                          <button
                                            onClick={() => decrementarAdicional(produto.id, item.id)}
                                            disabled={quantidade === 0 || !podeDecrementarAdicional(produto.id, item.id)}
                                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
                                              quantidade === 0 || !podeDecrementarAdicional(produto.id, item.id)
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                : config.modo_escuro
                                                ? 'bg-gray-600 text-white hover:bg-gray-500'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                          >
                                            <Minus size={10} />
                                          </button>

                                          {/* Quantidade */}
                                          <span className={`w-6 text-center text-xs font-semibold ${
                                            config.modo_escuro ? 'text-white' : 'text-gray-800'
                                          }`}>
                                            {quantidade}
                                          </span>

                                          {/* Botão Incrementar */}
                                          <button
                                            onClick={() => incrementarAdicional(produto.id, item.id)}
                                            disabled={!podeIncrementarAdicional(produto.id, item.id)}
                                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
                                              !podeIncrementarAdicional(produto.id, item.id)
                                                ? config.modo_escuro
                                                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                : config.modo_escuro
                                                ? 'bg-blue-600 text-white hover:bg-blue-500'
                                                : 'bg-blue-500 text-white hover:bg-blue-600'
                                            }`}
                                          >
                                            <Plus size={10} />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Botão Adicionar no Carrinho - Só aparece quando há quantidade selecionada */}
                  {(() => {
                    const quantidadeSelecionada = obterQuantidadeSelecionada(produto.id);
                    const valorTotal = calcularValorTotalComAdicionais(produto.id);
                    const temQuantidade = quantidadeSelecionada > 0;
                    const lojaFechada = lojaAberta === false;

                    // Só mostrar o botão se há quantidade selecionada, loja está aberta e tem estoque
                    if (!temQuantidade || lojaFechada || semEstoque) {
                      return null;
                    }

                    // ✅ VERIFICAR SE TEM DESCONTO POR QUANTIDADE APLICADO
                    const temDescontoQuantidade = produto.desconto_quantidade &&
                      produto.quantidade_minima &&
                      quantidadeSelecionada >= produto.quantidade_minima &&
                      ((produto.tipo_desconto_quantidade === 'percentual' && produto.percentual_desconto_quantidade) ||
                       (produto.tipo_desconto_quantidade === 'valor' && produto.valor_desconto_quantidade));

                    // ✅ CALCULAR PREÇO ORIGINAL SEM DESCONTO PARA COMPARAÇÃO
                    let precoOriginalTotal = 0;
                    let textoDesconto = '';

                    if (temDescontoQuantidade) {
                      // Calcular preço original (sem desconto por quantidade)
                      const produto_encontrado = produtos.find(p => p.id === produto.id);
                      if (produto_encontrado) {
                        let precoBase = produto_encontrado.preco;

                        // Se trabalha com tabelas de preço, usar preço da tabela selecionada
                        if (trabalhaComTabelaPrecos) {
                          const tabelasComPrecos = obterTabelasComPrecos(produto.id);
                          const tabelaSelecionadaId = tabelasSelecionadas[produto.id];

                          if (tabelasComPrecos.length > 0 && tabelaSelecionadaId) {
                            const tabelaEscolhida = tabelasComPrecos.find(t => t.id === tabelaSelecionadaId);
                            if (tabelaEscolhida) {
                              precoBase = tabelaEscolhida.preco;
                            }
                          }
                        }

                        // Aplicar promoção tradicional se houver (mas não desconto por quantidade)
                        const temPromocaoTradicional = produto_encontrado.promocao &&
                          produto_encontrado.exibir_promocao_cardapio &&
                          produto_encontrado.tipo_desconto &&
                          produto_encontrado.valor_desconto !== undefined &&
                          produto_encontrado.valor_desconto > 0;

                        if (temPromocaoTradicional) {
                          precoBase = calcularValorFinal(precoBase, produto_encontrado.tipo_desconto!, produto_encontrado.valor_desconto!);
                        }

                        precoOriginalTotal = precoBase * quantidadeSelecionada;

                        // Adicionar valor dos adicionais
                        const adicionaisItem = adicionaisSelecionados[produto.id];
                        if (adicionaisItem) {
                          Object.entries(adicionaisItem).forEach(([itemId, quantidade]) => {
                            if (quantidade > 0) {
                              const precoAdicional = obterPrecoAdicional(produto.id, itemId);
                              if (precoAdicional > 0) {
                                precoOriginalTotal += precoAdicional * quantidade * quantidadeSelecionada;
                              }
                            }
                          });
                        }
                      }

                      if (produto.tipo_desconto_quantidade === 'percentual' && produto.percentual_desconto_quantidade) {
                        textoDesconto = `(${produto.percentual_desconto_quantidade}% OFF aplicado)`;
                      } else if (produto.tipo_desconto_quantidade === 'valor' && produto.valor_desconto_quantidade) {
                        textoDesconto = `(${formatarPreco(produto.valor_desconto_quantidade)} OFF aplicado)`;
                      }
                    }

                    return (
                      <div className="mt-4 w-full">
                        <button
                          onClick={() => adicionarAoCarrinho(produto.id)}
                          className="w-full py-3 px-4 rounded-xl text-base font-semibold transition-all duration-200 flex flex-col items-center justify-center gap-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
                        >
                          <div className="flex items-center gap-2">
                            <ShoppingBag size={18} />
                            {temDescontoQuantidade && precoOriginalTotal > 0 ? (
                              <div className="flex flex-col items-center">
                                {/* Preço original riscado */}
                                <div className="text-xs line-through opacity-75">
                                  {formatarPreco(precoOriginalTotal)}
                                </div>
                                {/* Preço com desconto */}
                                <div className="text-base font-semibold">
                                  {formatarPreco(valorTotal)} - Adicionar no carrinho
                                </div>
                              </div>
                            ) : (
                              <span>{formatarPreco(valorTotal)} - Adicionar no carrinho</span>
                            )}
                          </div>
                          {textoDesconto && (
                            <div className="text-xs opacity-90 font-medium">
                              {textoDesconto}
                            </div>
                          )}
                        </button>
                      </div>
                    );
                  })()}

                  {/* Seção de Observação - Apenas se produto tiver quantidade selecionada */}
                  {obterQuantidadeSelecionada(produto.id) > 0 && (
                  <div className="mt-3 w-full">
                    {observacoesSelecionadas[produto.id] ? (
                      // Mostrar observação existente com ícone de editar
                      <div className={`p-3 rounded-lg border ${
                        config.modo_escuro
                          ? 'bg-gray-800/50 border-gray-600'
                          : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className={`text-xs font-medium mb-1 ${
                              config.modo_escuro ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              Observação:
                            </div>
                            <p className={`text-sm ${
                              config.modo_escuro ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              {observacoesSelecionadas[produto.id]}
                            </p>
                          </div>
                          <button
                            onClick={() => abrirModalObservacao(produto.id)}
                            className={`p-1.5 rounded-full transition-colors ${
                              config.modo_escuro
                                ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                            }`}
                            title="Editar observação"
                          >
                            <Edit size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Mostrar botão para adicionar observação
                      <button
                        onClick={() => abrirModalObservacao(produto.id)}
                        className={`w-full p-2 rounded-lg border-2 border-dashed transition-colors text-sm ${
                          config.modo_escuro
                            ? 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300 hover:bg-gray-800/30'
                            : 'border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <MessageSquare size={16} />
                          <span>Adicionar observação</span>
                        </div>
                      </button>
                    )}
                  </div>
                  )}

                  {/* Tabelas de Preços - largura total do card - MOVIDO PARA ÚLTIMA POSIÇÃO */}
                  {(() => {
                    const tabelasComPrecos = obterTabelasComPrecos(produto.id);
                    if (tabelasComPrecos.length > 0) {
                      return (
                        <div className="mb-3 w-full">
                          {/* ✅ NOVA ÁREA SEPARADA VISUALMENTE */}
                          <div className={`mt-4 p-3 rounded-lg border-2 border-dashed transition-all duration-300 ${
                            config.modo_escuro
                              ? 'bg-gray-800/30 border-gray-600/50 shadow-lg'
                              : 'bg-blue-50/50 border-blue-200/60 shadow-sm'
                          }`}>
                            {/* Título das tabelas com ícone */}
                            <div className={`flex items-center gap-2 text-sm font-semibold mb-2 ${
                              config.modo_escuro ? 'text-blue-300' : 'text-blue-700'
                            }`}>
                              <div className={`w-2 h-2 rounded-full ${
                                config.modo_escuro ? 'bg-blue-400' : 'bg-blue-500'
                              }`}></div>
                              Opções de Tamanho e Preço
                            </div>

                            {/* Linha dedicada para o indicador "Deslize para ver mais" */}
                            <div className="h-5 mb-2 relative">
                              {tabelasComPrecos.length > 3 && (
                                <div className={`absolute top-0 right-0 flex items-center gap-1 text-xs font-medium animate-pulse ${
                                  config.modo_escuro ? 'text-blue-300' : 'text-blue-600'
                                }`}>
                                  <span>Deslize para ver mais</span>
                                  <div className="flex">
                                    <div className="w-1 h-1 rounded-full bg-current animate-bounce"></div>
                                    <div className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                  </div>
                                </div>
                              )}
                            </div>

                          {/* Slider horizontal das tabelas */}
                          <div className="relative">
                            {tabelasComPrecos.length <= 3 ? (
                              // Se tem 3 ou menos tabelas, mostrar sem slider
                              <div className="flex gap-2 w-full">
                                {tabelasComPrecos.map(tabela => {
                                  const isSelected = tabelasSelecionadas[produto.id] === tabela.id;
                                  return (
                                    <button
                                      key={tabela.id}
                                      onClick={() => {
                                        console.log('🔍 DEBUG - Selecionando tabela:', {
                                          produtoId: produto.id,
                                          produtoNome: produto.nome,
                                          tabelaId: tabela.id,
                                          tabelaNome: tabela.nome
                                        });
                                        setTabelasSelecionadas(prev => {
                                          const novoEstado = {
                                            ...prev,
                                            [produto.id]: tabela.id
                                          };
                                          console.log('🔍 TABELA SELECIONADA:', {
                                            produtoId: produto.id,
                                            tabelaId: tabela.id,
                                            tabelaNome: tabela.nome,
                                            novoEstado
                                          });
                                          return novoEstado;
                                        });
                                      }}
                                      className={`flex-1 p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 text-left ${
                                        isSelected
                                          ? config.modo_escuro
                                            ? 'bg-purple-900/50 border-purple-400 text-white shadow-lg ring-2 ring-purple-400/50'
                                            : 'bg-blue-50 border-blue-500 text-gray-800 shadow-md ring-2 ring-blue-500/50'
                                          : config.modo_escuro
                                            ? 'bg-gray-700 border-gray-500 text-white shadow-md hover:border-purple-400'
                                            : 'bg-white border-gray-300 text-gray-800 shadow-sm hover:border-blue-400 hover:shadow-md'
                                      }`}
                                    >
                                      <div className={`text-xs font-bold truncate mb-1 ${
                                        isSelected
                                          ? config.modo_escuro ? 'text-purple-200' : 'text-blue-700'
                                          : config.modo_escuro ? 'text-gray-200' : 'text-gray-700'
                                      }`}>
                                        {tabela.nome}
                                      </div>
                                      {/* ✅ VERIFICAR SE PRODUTO TEM PROMOÇÃO PARA APLICAR SOBRE PREÇO DA TABELA */}
                                      {(() => {
                                        const temPromocao = produto.promocao &&
                                          produto.exibir_promocao_cardapio &&
                                          produto.tipo_desconto &&
                                          produto.valor_desconto !== undefined &&
                                          produto.valor_desconto > 0;

                                        if (temPromocao) {
                                          // Calcular valor final aplicando promoção sobre preço da tabela
                                          const valorFinal = calcularValorFinal(tabela.preco, produto.tipo_desconto, produto.valor_desconto);

                                          return (
                                            <div className="flex flex-col">
                                              {/* Preço da tabela original riscado */}
                                              <div className={`text-xs line-through ${
                                                config.modo_escuro ? 'text-gray-400' : 'text-gray-500'
                                              }`}>
                                                {formatarPreco(tabela.preco)}
                                              </div>
                                              {/* Preço promocional da tabela */}
                                              <div className={`text-lg font-bold ${
                                                isSelected
                                                  ? config.modo_escuro ? 'text-green-300' : 'text-green-700'
                                                  : config.modo_escuro ? 'text-green-400' : 'text-green-600'
                                              }`}>
                                                {formatarPreco(valorFinal)}
                                              </div>
                                            </div>
                                          );
                                        } else {
                                          // Preço da tabela sem promoção
                                          return (
                                            <div className={`text-lg font-bold ${
                                              isSelected
                                                ? config.modo_escuro ? 'text-green-300' : 'text-green-700'
                                                : config.modo_escuro ? 'text-green-400' : 'text-green-600'
                                            }`}>
                                              {formatarPreco(tabela.preco)}
                                            </div>
                                          );
                                        }
                                      })()}
                                      {/* Tag de quantidade de sabores */}
                                      {tabela.quantidade_sabores > 1 && (
                                        <div className={`inline-block px-1.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                                          isSelected
                                            ? config.modo_escuro
                                              ? 'bg-purple-800/70 text-purple-200 border border-purple-600'
                                              : 'bg-blue-100 text-blue-800 border border-blue-400'
                                            : config.modo_escuro
                                              ? 'bg-purple-900/50 text-purple-300 border border-purple-700'
                                              : 'bg-purple-100 text-purple-700 border border-purple-300'
                                        }`}>
                                          {tabela.quantidade_sabores} sabores
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              // Se tem mais de 3 tabelas, usar Keen Slider
                              <TabelasPrecosSlider
                                tabelas={tabelasComPrecos}
                                config={config}
                                formatarPreco={formatarPreco}
                                tabelaSelecionada={tabelasSelecionadas[produto.id]}
                                onTabelaSelect={(tabelaId) => {
                                  setTabelasSelecionadas(prev => ({
                                    ...prev,
                                    [produto.id]: tabelaId
                                  }));
                                }}
                                produto={produto} // ✅ PASSAR PRODUTO PARA ACESSAR PROMOÇÕES
                                calcularValorFinal={calcularValorFinal} // ✅ PASSAR FUNÇÃO DE CÁLCULO
                              />
                            )}
                          </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                </div>
              </div>
                  );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Botão Flutuante do Carrinho */}
      {!carrinhoAberto && obterQuantidadeTotalItens() > 0 && (
        <button
          onClick={() => setCarrinhoAberto(true)}
          className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 z-30 ${
            config.modo_escuro
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
              : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
          }`}
        >
          <div className="relative flex items-center justify-center">
            <ShoppingCart size={24} />
            <span className={`absolute -top-2 -right-2 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
              config.modo_escuro ? 'bg-red-500 text-white' : 'bg-red-500 text-white'
            }`}>
              {obterQuantidadeTotalItens()}
            </span>
          </div>
        </button>
      )}

      {/* Modal de Confirmação para Limpar Carrinho */}
      {modalConfirmacaoAberto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`max-w-md w-full rounded-2xl shadow-2xl ${
            config.modo_escuro ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            {/* Header do Modal */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <Trash2 size={24} className="text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${config.modo_escuro ? 'text-white' : 'text-gray-900'}`}>
                    Limpar Carrinho
                  </h3>
                  <p className={`text-sm ${config.modo_escuro ? 'text-gray-400' : 'text-gray-600'}`}>
                    Esta ação não pode ser desfeita
                  </p>
                </div>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6">
              <p className={`text-sm leading-relaxed ${config.modo_escuro ? 'text-gray-300' : 'text-gray-700'}`}>
                Tem certeza que deseja remover <strong>todos os {obterQuantidadeTotalItens()} itens</strong> do seu carrinho?
                {config.mostrar_precos && (
                  <span> O valor total de <strong>{formatarPreco(obterTotalCarrinho())}</strong> será perdido.</span>
                )}
              </p>
            </div>

            {/* Botões do Modal */}
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={cancelarLimparCarrinho}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                  config.modo_escuro
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarLimparCarrinho}
                className="flex-1 py-3 px-4 rounded-xl font-medium bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
              >
                Sim, Limpar Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Remover Item */}
      {modalRemoverItemAberto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`max-w-md w-full rounded-2xl shadow-2xl ${
            config.modo_escuro ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            {/* Header do Modal */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Trash2 size={20} className="text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${
                    config.modo_escuro ? 'text-white' : 'text-gray-900'
                  }`}>
                    Remover Item
                  </h3>
                  <p className={`text-sm ${
                    config.modo_escuro ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Esta ação não pode ser desfeita
                  </p>
                </div>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6">
              <p className={`text-center ${
                config.modo_escuro ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Deseja remover este item do carrinho?
              </p>
            </div>

            {/* Botões do Modal */}
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={cancelarRemoverItem}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                  config.modo_escuro
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarRemoverItem}
                className="flex-1 py-3 px-4 rounded-xl font-medium bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
              >
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}





      {/* Modal de Adicionar ao Carrinho */}
      {modalAdicionarCarrinho && produtoConfiguracaoIndividual && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`max-w-md w-full rounded-2xl shadow-2xl ${
            config.modo_escuro ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            {/* Header do Modal */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <ShoppingCart size={20} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${
                    config.modo_escuro ? 'text-white' : 'text-gray-900'
                  }`}>
                    Adicionar ao Carrinho?
                  </h3>
                  <p className={`text-sm ${
                    config.modo_escuro ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {produtoConfiguracaoIndividual.nome}
                  </p>
                </div>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6">
              <p className={`text-center ${
                config.modo_escuro ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Deseja adicionar este item ao carrinho com os complementos configurados?
              </p>
            </div>

            {/* Botões do Modal */}
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={cancelarAdicionarAoCarrinho}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                  config.modo_escuro
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                }`}
              >
                Não
              </button>
              <button
                onClick={confirmarAdicionarAoCarrinho}
                className="flex-1 py-3 px-4 rounded-xl font-medium bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
              >
                Sim, adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização de Todos os Itens */}
      {modalTodosItensAberto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`w-full h-full flex flex-col ${
            config.modo_escuro ? 'bg-gray-800' : 'bg-white'
          }`}>
            {/* Header do Modal */}
            <div className={`p-4 border-b ${config.modo_escuro ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <List size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold ${config.modo_escuro ? 'text-white' : 'text-gray-900'}`}>
                      Todos os Itens do Carrinho
                    </h3>
                    <p className={`text-sm ${config.modo_escuro ? 'text-gray-400' : 'text-gray-600'}`}>
                      {obterQuantidadeTotalItens()} {obterQuantidadeTotalItens() === 1 ? 'item' : 'itens'} • Total: {config.mostrar_precos ? formatarPreco(obterTotalCarrinho()) : 'Preços ocultos'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setModalTodosItensAberto(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    config.modo_escuro
                      ? 'text-gray-400 hover:bg-gray-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Lista de Itens - Scrollável */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-3">
                {obterItensCarrinho().map((item) => {
                  const { produto, quantidade, adicionais, observacao, itemId } = item as any;
                  return (
                    <div
                      key={itemId}
                      className={`p-3 rounded-lg transition-all duration-200 ${
                        config.modo_escuro ? 'bg-gray-700/50' : 'bg-gray-50'
                      }`}
                    >
                      {/* Layout com foto (quando configuração ativa) */}
                      {config.cardapio_fotos_minimizadas ? (
                        <>
                          {/* Header do Item - Foto + Nome/Preço + Controles */}
                          <div className="flex items-center gap-3 mb-2">
                            {/* Foto do produto */}
                            <div
                              className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0 cursor-pointer"
                              onClick={() => abrirGaleriaFotos(produto, 0)}
                            >
                              {(() => {
                                const fotoItem = getFotoPrincipal(produto);
                                return fotoItem ? (
                                  <img
                                    src={fotoItem.url}
                                    alt={produto.nome}
                                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-200"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package size={16} className={config.modo_escuro ? 'text-gray-500' : 'text-gray-400'} />
                                  </div>
                                );
                              })()}

                              {/* Contador de fotos */}
                              {produto.fotos_count && produto.fotos_count > 1 && (
                                <div className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                                  {produto.fotos_count}
                                </div>
                              )}
                            </div>

                            {/* Área central com Nome e Preço em 2 linhas */}
                            <div className="flex-1 min-w-0">
                              {/* Linha 1: Nome do produto */}
                              <h4 className={`font-medium text-sm truncate ${config.modo_escuro ? 'text-white' : 'text-gray-800'}`}>
                                {produto.nome}
                              </h4>
                              {/* Linha 2: Preço */}
                              {config.mostrar_precos && (
                                <div className={`text-xs ${config.modo_escuro ? 'text-gray-300' : 'text-gray-600'}`}>
                                  {(() => {
                                    const precoProduto = (item as any).precoProduto || produto.preco; // ✅ USAR PREÇO SALVO
                                    return `${formatarPreco(precoProduto)} × ${formatarQuantidade(quantidade, produto.unidade_medida)} = ${formatarPreco(precoProduto * quantidade)}`;
                                  })()}
                                </div>
                              )}
                            </div>

                            {/* Controles de Quantidade do Produto Principal */}
                            {/* ✅ OCULTAR CONTROLADOR QUANDO SEM ESTOQUE */}
                            {!semEstoque && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => decrementarQuantidade(produto.id)}
                                  disabled={lojaAberta === false}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                                    lojaAberta === false
                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                      : config.modo_escuro
                                      ? 'bg-gray-600 text-white hover:bg-gray-500'
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  <Minus size={12} />
                                </button>

                                <span className={`w-8 text-center text-xs font-semibold ${
                                  config.modo_escuro ? 'text-white' : 'text-gray-800'
                                }`}>
                                  {formatarQuantidade(quantidade, produto.unidade_medida)}
                                </span>

                                <button
                                  onClick={() => incrementarQuantidade(produto.id)}
                                  disabled={lojaAberta === false}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                                    lojaAberta === false
                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                      : config.modo_escuro
                                      ? 'bg-blue-600 text-white hover:bg-blue-500'
                                      : 'bg-blue-500 text-white hover:bg-blue-600'
                                  }`}
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            )}

                            <button
                              onClick={() => removerItemCarrinho(produto.id)}
                              className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ml-1 ${
                                config.modo_escuro
                                  ? 'bg-red-600 text-white hover:bg-red-500'
                                  : 'bg-red-500 text-white hover:bg-red-600'
                              }`}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Header do Item - Nome + Preço + Controles (sem foto) */}
                          <div className="mb-2">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className={`font-medium text-sm truncate ${config.modo_escuro ? 'text-white' : 'text-gray-800'}`}>
                                  {produto.nome}
                                </h4>
                                {config.mostrar_precos && (
                                  <div className={`text-xs ${config.modo_escuro ? 'text-gray-300' : 'text-gray-600'}`}>
                                    {(() => {
                                      const precoProduto = (item as any).precoProduto || produto.preco; // ✅ USAR PREÇO SALVO
                                      return `${formatarPreco(precoProduto)} × ${formatarQuantidade(quantidade, produto.unidade_medida)} = ${formatarPreco(precoProduto * quantidade)}`;
                                    })()}
                                  </div>
                                )}
                              </div>

                              {/* Controles de Quantidade do Produto Principal */}
                              {/* ✅ OCULTAR CONTROLADOR QUANDO SEM ESTOQUE */}
                              {!semEstoque && (
                                <div className="flex items-center gap-2 ml-3">
                                  <button
                                    onClick={() => decrementarQuantidade(produto.id)}
                                    disabled={lojaAberta === false}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                                      lojaAberta === false
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : config.modo_escuro
                                        ? 'bg-gray-600 text-white hover:bg-gray-500'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                  >
                                    <Minus size={12} />
                                  </button>

                                  <span className={`w-8 text-center text-xs font-semibold ${
                                    config.modo_escuro ? 'text-white' : 'text-gray-800'
                                  }`}>
                                    {formatarQuantidade(quantidade, produto.unidade_medida)}
                                  </span>

                                  <button
                                    onClick={() => incrementarQuantidade(produto.id)}
                                    disabled={lojaAberta === false}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                                      lojaAberta === false
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : config.modo_escuro
                                        ? 'bg-blue-600 text-white hover:bg-blue-500'
                                        : 'bg-blue-500 text-white hover:bg-blue-600'
                                    }`}
                                  >
                                    <Plus size={12} />
                                  </button>

                                  <button
                                    onClick={() => removerItemCarrinho(produto.id)}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ml-1 ${
                                      config.modo_escuro
                                        ? 'bg-red-600 text-white hover:bg-red-500'
                                        : 'bg-red-500 text-white hover:bg-red-600'
                                    }`}
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Seção de Adicionais - Largura Total */}
                      {adicionais && adicionais.length > 0 && (
                        <div className="mb-2">
                          {/* Divisória */}
                          <div className={`border-t ${config.modo_escuro ? 'border-gray-600' : 'border-gray-300'} mb-2`}></div>

                          {/* Título */}
                          <div className={`text-xs font-medium mb-2 ${config.modo_escuro ? 'text-gray-400' : 'text-gray-500'}`}>
                            Adicionais:
                          </div>

                          {/* Lista de Adicionais */}
                          <div className="space-y-1">
                            {adicionais.map(adicional => (
                              <div
                                key={adicional.id}
                                className={`flex items-center justify-between p-2 rounded-lg ${
                                  config.modo_escuro ? 'bg-gray-800/50' : 'bg-gray-50'
                                }`}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <span className={`text-xs font-medium ${config.modo_escuro ? 'text-white' : 'text-gray-800'}`}>
                                        + {adicional.nome}
                                      </span>
                                      <div className={`text-xs ${config.modo_escuro ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {adicional.preco > 0 ? (
                                          adicional.quantidade > 1 ? (
                                            <>
                                              {formatarPreco(adicional.preco * adicional.quantidade)}
                                              <span className="opacity-70"> ({adicional.quantidade}x {formatarPreco(adicional.preco)})</span>
                                            </>
                                          ) : (
                                            `${formatarPreco(adicional.preco)} cada`
                                          )
                                        ) : 'Grátis'}
                                      </div>
                                    </div>
                                    {config.mostrar_precos && (
                                      <span className={`text-xs ${config.modo_escuro ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {formatarPreco(adicional.preco * adicional.quantidade * quantidade)}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Controles de Quantidade do Adicional */}
                                {obterWhatsAppEmpresa() && lojaAberta !== false && (
                                  <div className="flex items-center gap-1 ml-3">
                                    <button
                                      onClick={() => decrementarAdicional(produto.id, adicional.id)}
                                      disabled={adicional.quantidade === 0 || !podeDecrementarAdicional(produto.id, adicional.id)}
                                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                                        adicional.quantidade === 0 || !podeDecrementarAdicional(produto.id, adicional.id)
                                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                          : config.modo_escuro
                                          ? 'bg-gray-600 text-white hover:bg-gray-500'
                                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                      }`}
                                    >
                                      <Minus size={8} />
                                    </button>

                                    <span className={`w-5 text-center text-xs font-semibold ${
                                      config.modo_escuro ? 'text-white' : 'text-gray-800'
                                    }`}>
                                      {adicional.quantidade}
                                    </span>

                                    <button
                                      onClick={() => incrementarAdicional(produto.id, adicional.id)}
                                      disabled={!podeIncrementarAdicional(produto.id, adicional.id)}
                                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                                        !podeIncrementarAdicional(produto.id, adicional.id)
                                          ? config.modo_escuro
                                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                          : config.modo_escuro
                                          ? 'bg-blue-600 text-white hover:bg-blue-500'
                                          : 'bg-blue-500 text-white hover:bg-blue-600'
                                      }`}
                                    >
                                      <Plus size={8} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Observação do Item */}
                      {observacao && (
                        <div className={`mt-3 p-3 rounded-lg ${
                          config.modo_escuro ? 'bg-gray-800/50' : 'bg-gray-100'
                        }`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className={`text-xs font-medium mb-1 ${
                                config.modo_escuro ? 'text-gray-400' : 'text-gray-500'
                              }`}>
                                Observação:
                              </div>
                              <p className={`text-sm ${
                                config.modo_escuro ? 'text-gray-300' : 'text-gray-600'
                              }`}>
                                {observacao}
                              </p>
                            </div>
                            <button
                              onClick={() => abrirModalObservacao(produto.id, itemId)}
                              className={`p-1.5 rounded-full transition-colors flex-shrink-0 ${
                                config.modo_escuro
                                  ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                              }`}
                              title="Editar observação"
                            >
                              <Edit size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer com Botões */}
            <div className={`p-4 border-t ${config.modo_escuro ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex gap-3">
                <button
                  onClick={() => setModalTodosItensAberto(false)}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                    config.modo_escuro
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                  }`}
                >
                  Fechar
                </button>
                {obterWhatsAppEmpresa() && (
                  <button
                    onClick={() => {
                      setModalTodosItensAberto(false);
                      handlePedirCarrinhoCompleto();
                    }}
                    disabled={lojaAberta === false}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                      lojaAberta === false
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-60'
                        : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white transform hover:scale-[1.02] shadow-lg'
                    }`}
                  >
                    {lojaAberta === false ? 'Loja Fechada' : 'Finalizar Pedido'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast de Sucesso */}
      {toastVisivel && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-sm ${
            config.modo_escuro
              ? 'bg-gray-800/95 border border-gray-700 text-white'
              : 'bg-white/95 border border-gray-200 text-gray-900'
          }`}>
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium text-sm">Carrinho limpo com sucesso!</p>
              <p className={`text-xs ${config.modo_escuro ? 'text-gray-400' : 'text-gray-600'}`}>
                Todos os itens foram removidos
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer moderno */}
      <footer className={`mt-16 ${config.modo_escuro ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t`}>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <svg className={`w-6 h-6 ${config.modo_escuro ? 'text-purple-400' : 'text-purple-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className={`font-semibold ${config.modo_escuro ? 'text-white' : 'text-gray-800'}`}>
                Cardápio Digital
              </span>
            </div>
            <p className={`text-sm ${config.modo_escuro ? 'text-gray-400' : 'text-gray-600'}`}>
              Powered by <span className="font-semibold text-purple-600">Nexo Pedidos</span>
            </p>
          </div>
        </div>
      </footer>







      {/* Modal de Organização de Adicionais */}
      {modalOrganizacao && produtoOrganizacao && (
        <div className="fixed inset-0 bg-black/50 z-50">
          <div className={`w-full h-full flex flex-col ${
            config.modo_escuro ? 'bg-gray-800' : 'bg-white'
          }`}>
            {/* Header */}
            <div className={`flex-shrink-0 p-4 sm:p-6 border-b ${
              config.modo_escuro ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-xl font-semibold ${
                    config.modo_escuro ? 'text-white' : 'text-gray-900'
                  }`}>
                    Organizar Adicionais
                  </h3>
                  <p className={`text-sm mt-1 ${
                    config.modo_escuro ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Cada item já vem com adicionais mínimos. Distribua apenas os excedentes.
                  </p>
                </div>
                <button
                  onClick={() => setModalOrganizacao(false)}
                  className={`p-2 rounded-full transition-colors ${
                    config.modo_escuro
                      ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                      : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 h-full">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 h-full">

                  {/* Coluna Esquerda - Itens Individuais */}
                  <div className="flex flex-col h-full min-h-0">
                    <h4 className={`text-lg font-medium mb-4 flex-shrink-0 ${
                      config.modo_escuro ? 'text-white' : 'text-gray-900'
                    }`}>
                      Itens Individuais ({itensOrganizados.length})
                    </h4>

                    <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                      <div className="space-y-4 pb-4">
                      {itensOrganizados.map(item => (
                        <div
                          key={item.id}
                          className={`p-4 rounded-lg border ${
                            config.modo_escuro
                              ? 'bg-gray-700/50 border-gray-600'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          {/* Header do Item */}
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h5 className={`font-medium ${
                                config.modo_escuro ? 'text-white' : 'text-gray-900'
                              }`}>
                                {item.nome} #{item.numero}
                              </h5>
                              <p className={`text-sm ${
                                config.modo_escuro ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {formatarPreco(item.preco)}
                              </p>
                            </div>
                          </div>

                          {/* Adicionais do Item */}
                          {item.adicionais.length > 0 && (
                            <div className="mt-3">
                              <p className={`text-xs font-medium mb-2 ${
                                config.modo_escuro ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                Adicionais:
                              </p>
                              <div className="space-y-2">
                                {/* Agrupar adicionais por originalId para mostrar com controles de quantidade */}
                                {(() => {
                                  const adicionaisAgrupados = {};
                                  item.adicionais.forEach(adicional => {
                                    if (!adicionaisAgrupados[adicional.originalId]) {
                                      adicionaisAgrupados[adicional.originalId] = {
                                        originalId: adicional.originalId,
                                        nome: adicional.nome,
                                        preco: adicional.preco,
                                        tipo: adicional.tipo,
                                        quantidade: 0
                                      };
                                    }
                                    adicionaisAgrupados[adicional.originalId].quantidade += 1;
                                  });

                                  return Object.values(adicionaisAgrupados).map((adicionalAgrupado: any) => (
                                    <div
                                      key={adicionalAgrupado.originalId}
                                      className={`flex items-center justify-between p-3 rounded border ${
                                        adicionalAgrupado.tipo === 'minimo'
                                          ? config.modo_escuro
                                            ? 'bg-green-900/30 border-green-700'
                                            : 'bg-green-50 border-green-200'
                                          : config.modo_escuro
                                          ? 'bg-blue-900/30 border-blue-700'
                                          : 'bg-blue-50 border-blue-200'
                                      }`}
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className={`text-sm font-medium ${
                                            config.modo_escuro ? 'text-white' : 'text-gray-800'
                                          }`}>
                                            + {adicionalAgrupado.nome}
                                          </span>
                                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                                            adicionalAgrupado.tipo === 'minimo'
                                              ? config.modo_escuro
                                                ? 'bg-green-700 text-green-300'
                                                : 'bg-green-200 text-green-700'
                                              : config.modo_escuro
                                              ? 'bg-blue-700 text-blue-300'
                                              : 'bg-blue-200 text-blue-700'
                                          }`}>
                                            {adicionalAgrupado.tipo === 'minimo' ? 'Mínimo' : 'Extra'}
                                          </span>
                                        </div>
                                        <p className={`text-xs ${
                                          config.modo_escuro ? 'text-gray-400' : 'text-gray-600'
                                        }`}>
                                          {formatarPreco(adicionalAgrupado.preco)} cada
                                          {adicionalAgrupado.quantidade > 1 && (
                                            <span className="ml-2 font-medium">
                                              Total: {formatarPreco(adicionalAgrupado.preco * adicionalAgrupado.quantidade)}
                                            </span>
                                          )}
                                        </p>
                                      </div>

                                      {/* Controles de Quantidade */}
                                      <div className="flex items-center gap-2 ml-3">
                                        <button
                                          onClick={() => decrementarAdicionalNoItem(item.id, adicionalAgrupado.originalId)}
                                          disabled={adicionalAgrupado.quantidade <= 0}
                                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                                            adicionalAgrupado.quantidade <= 0
                                              ? config.modo_escuro
                                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                              : config.modo_escuro
                                              ? 'bg-gray-600 text-white hover:bg-gray-500'
                                              : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                                          }`}
                                        >
                                          <Minus size={12} />
                                        </button>

                                        <span className={`w-8 text-center text-sm font-medium ${
                                          config.modo_escuro ? 'text-white' : 'text-gray-900'
                                        }`}>
                                          {adicionalAgrupado.quantidade}
                                        </span>

                                        <button
                                          onClick={() => incrementarAdicionalNoItem(item.id, adicionalAgrupado.originalId)}
                                          disabled={!excedentesAgrupados[adicionalAgrupado.originalId] || excedentesAgrupados[adicionalAgrupado.originalId]?.quantidadeTotal <= 0}
                                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                                            !excedentesAgrupados[adicionalAgrupado.originalId] || excedentesAgrupados[adicionalAgrupado.originalId]?.quantidadeTotal <= 0
                                              ? config.modo_escuro
                                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                              : config.modo_escuro
                                              ? 'bg-gray-600 text-white hover:bg-gray-500'
                                              : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                                          }`}
                                        >
                                          <Plus size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  ));
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      </div>
                    </div>
                  </div>

                  {/* Coluna Direita - Excedentes Agrupados */}
                  <div className="flex flex-col h-full min-h-0">
                    <h4 className={`text-lg font-medium mb-4 flex-shrink-0 ${
                      config.modo_escuro ? 'text-white' : 'text-gray-900'
                    }`}>
                      Excedentes para Distribuir ({Object.values(excedentesAgrupados).reduce((total, excedente) => total + excedente.quantidadeTotal, 0)})
                    </h4>

                    <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                      {Object.keys(excedentesAgrupados).filter(key => excedentesAgrupados[key].quantidadeTotal > 0).length > 0 ? (
                      <div className="space-y-4 pb-4">
                          <p className={`text-sm mb-4 ${
                            config.modo_escuro ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            Selecione a quantidade e clique em "Vincular" para escolher onde adicionar:
                          </p>
                          {Object.entries(excedentesAgrupados)
                            .filter(([_, excedente]) => excedente.quantidadeTotal > 0)
                            .map(([originalId, excedente]) => (
                            <div
                              key={originalId}
                              className={`p-4 rounded-lg border ${
                                config.modo_escuro
                                  ? 'bg-yellow-900/20 border-yellow-700'
                                  : 'bg-yellow-50 border-yellow-200'
                              }`}
                            >
                              {/* Informações do Adicional */}
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <span className={`font-medium ${
                                    config.modo_escuro ? 'text-yellow-400' : 'text-yellow-800'
                                  }`}>
                                    {excedente.nome}
                                  </span>
                                  <p className={`text-sm ${
                                    config.modo_escuro ? 'text-yellow-500' : 'text-yellow-600'
                                  }`}>
                                    {formatarPreco(excedente.preco)} cada
                                  </p>
                                </div>
                                <div className={`text-xs px-2 py-1 rounded-full ${
                                  config.modo_escuro
                                    ? 'bg-yellow-700 text-yellow-300'
                                    : 'bg-yellow-200 text-yellow-700'
                                }`}>
                                  {excedente.quantidadeTotal - obterQuantidadeExcedenteTemp(originalId)} disponível{(excedente.quantidadeTotal - obterQuantidadeExcedenteTemp(originalId)) !== 1 ? 'is' : ''}
                                </div>
                              </div>

                              {/* Controle de Quantidade */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className={`text-sm font-medium ${
                                    config.modo_escuro ? 'text-gray-300' : 'text-gray-700'
                                  }`}>
                                    Quantidade:
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => decrementarQuantidadeExcedente(originalId)}
                                      disabled={obterQuantidadeExcedenteTemp(originalId) <= 0}
                                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                        obterQuantidadeExcedenteTemp(originalId) <= 0
                                          ? config.modo_escuro
                                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                          : config.modo_escuro
                                          ? 'bg-gray-600 text-white hover:bg-gray-500'
                                          : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                                      }`}
                                    >
                                      <Minus size={16} />
                                    </button>
                                    <span className={`w-12 text-center font-medium ${
                                      config.modo_escuro ? 'text-white' : 'text-gray-900'
                                    }`}>
                                      {obterQuantidadeExcedenteTemp(originalId)}
                                    </span>
                                    <button
                                      onClick={() => incrementarQuantidadeExcedente(originalId)}
                                      disabled={obterQuantidadeExcedenteTemp(originalId) >= excedente.quantidadeTotal}
                                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                        obterQuantidadeExcedenteTemp(originalId) >= excedente.quantidadeTotal
                                          ? config.modo_escuro
                                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                          : config.modo_escuro
                                          ? 'bg-gray-600 text-white hover:bg-gray-500'
                                          : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                                      }`}
                                    >
                                      <Plus size={16} />
                                    </button>
                                  </div>
                                </div>

                                {/* Botão Vincular */}
                                <button
                                  onClick={() => abrirModalVincularExcedente(originalId)}
                                  disabled={obterQuantidadeExcedenteTemp(originalId) <= 0}
                                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                    obterQuantidadeExcedenteTemp(originalId) <= 0
                                      ? config.modo_escuro
                                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                      : config.modo_escuro
                                      ? 'bg-yellow-600 text-white hover:bg-yellow-500'
                                      : 'bg-yellow-500 text-white hover:bg-yellow-600'
                                  }`}
                                >
                                  Vincular ({obterQuantidadeExcedenteTemp(originalId)})
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className={`text-center py-8 ${
                          config.modo_escuro ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          <CheckCircle size={48} className="mx-auto mb-3 text-green-500" />
                          <p className="font-medium">Todos os excedentes foram distribuídos!</p>
                          <p className="text-sm">Você pode finalizar a organização.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={`flex-shrink-0 p-4 sm:p-6 border-t ${
              config.modo_escuro ? 'border-gray-700' : 'border-gray-200'
            }`}>
              {/* Mensagem de Status */}
              <div className="mb-4">
                {!todosExcedentesDistribuidos() ? (
                  <div className={`text-center p-3 rounded-lg ${
                    config.modo_escuro
                      ? 'bg-red-900/20 border border-red-700'
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <span className={`text-sm font-medium ${
                      config.modo_escuro ? 'text-red-400' : 'text-red-600'
                    }`}>
                      Faltam {Object.values(excedentesAgrupados).reduce((total, excedente) => total + excedente.quantidadeTotal, 0)} adicional{Object.values(excedentesAgrupados).reduce((total, excedente) => total + excedente.quantidadeTotal, 0) !== 1 ? 'is' : ''} excedente{Object.values(excedentesAgrupados).reduce((total, excedente) => total + excedente.quantidadeTotal, 0) !== 1 ? 's' : ''} a {Object.values(excedentesAgrupados).reduce((total, excedente) => total + excedente.quantidadeTotal, 0) !== 1 ? 'serem distribuídos' : 'ser distribuído'}
                    </span>
                  </div>
                ) : (
                  <div className={`text-center p-3 rounded-lg ${
                    config.modo_escuro
                      ? 'bg-green-900/20 border border-green-700'
                      : 'bg-green-50 border border-green-200'
                  }`}>
                    <span className={`text-sm font-medium ${
                      config.modo_escuro ? 'text-green-400' : 'text-green-600'
                    }`}>
                      ✓ Todos os excedentes foram distribuídos
                    </span>
                  </div>
                )}
              </div>

              {/* Botão Adicionar ao Carrinho - Largura Total */}
              <button
                onClick={finalizarOrganizacao}
                disabled={!todosExcedentesDistribuidos()}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  todosExcedentesDistribuidos()
                    ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Adicionar ao Carrinho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Vinculação de Excedente */}
      {modalVincularExcedente && excedenteAtual && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl ${
            config.modo_escuro ? 'bg-gray-800' : 'bg-white'
          }`}>
            {/* Header */}
            <div className={`p-6 border-b ${
              config.modo_escuro ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-lg font-semibold ${
                    config.modo_escuro ? 'text-white' : 'text-gray-900'
                  }`}>
                    Vincular Excedente
                  </h3>
                  <p className={`text-sm mt-1 ${
                    config.modo_escuro ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Escolha a qual item adicionar: {excedenteAtual.nome}
                  </p>
                </div>
                <button
                  onClick={() => setModalVincularExcedente(false)}
                  className={`p-2 rounded-full transition-colors ${
                    config.modo_escuro
                      ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                      : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-6">
              <div className="space-y-3">
                {itensOrganizados.map(item => (
                  <button
                    key={item.id}
                    onClick={() => vincularExcedenteAItem(item.id)}
                    className={`w-full p-4 rounded-lg border text-left transition-all hover:scale-105 ${
                      config.modo_escuro
                        ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className={`font-medium ${
                          config.modo_escuro ? 'text-white' : 'text-gray-900'
                        }`}>
                          {item.nome} #{item.numero}
                        </h4>
                        <p className={`text-sm ${
                          config.modo_escuro ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {item.adicionais.length} adicional(is) atual(is)
                        </p>
                      </div>
                      <div className={`text-xs px-3 py-1 rounded-full ${
                        config.modo_escuro
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-500 text-white'
                      }`}>
                        Selecionar
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className={`p-6 border-t ${
              config.modo_escuro ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <button
                onClick={() => setModalVincularExcedente(false)}
                className={`w-full py-2 rounded-lg transition-colors ${
                  config.modo_escuro
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Observação */}
      {modalObservacaoAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl ${
            config.modo_escuro ? 'bg-gray-800' : 'bg-white'
          }`}>
            {/* Header */}
            <div className={`p-6 border-b ${
              config.modo_escuro ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-semibold ${
                  config.modo_escuro ? 'text-white' : 'text-gray-900'
                }`}>
                  {(() => {
                    if (produtoObservacaoAtual && itensCarrinhoSeparados[produtoObservacaoAtual]) {
                      // Item do carrinho
                      return itensCarrinhoSeparados[produtoObservacaoAtual].observacao ? 'Editar Observação' : 'Adicionar Observação';
                    } else {
                      // Item de seleção
                      return observacoesSelecionadas[produtoObservacaoAtual || ''] ? 'Editar Observação' : 'Adicionar Observação';
                    }
                  })()}
                </h3>
                <button
                  onClick={fecharModalObservacao}
                  className={`p-2 rounded-full transition-colors ${
                    config.modo_escuro
                      ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${
                  config.modo_escuro ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Observação para o produto
                </label>
                <textarea
                  value={observacaoTemp}
                  onChange={(e) => setObservacaoTemp(e.target.value)}
                  placeholder="Ex: Sem cebola, bem passado, etc..."
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    config.modo_escuro
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  maxLength={200}
                />
                <div className={`text-xs mt-1 text-right ${
                  config.modo_escuro ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {observacaoTemp.length}/200
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={`p-6 border-t ${
              config.modo_escuro ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="flex gap-3">
                <button
                  onClick={fecharModalObservacao}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${
                    config.modo_escuro
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarObservacao}
                  className="flex-1 py-3 px-4 rounded-xl font-medium bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
                >
                  {(() => {
                    if (produtoObservacaoAtual && itensCarrinhoSeparados[produtoObservacaoAtual]) {
                      // Item do carrinho
                      return itensCarrinhoSeparados[produtoObservacaoAtual].observacao ? 'Salvar' : 'Adicionar';
                    } else {
                      // Item de seleção
                      return observacoesSelecionadas[produtoObservacaoAtual || ''] ? 'Salvar' : 'Adicionar';
                    }
                  })()}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Estoque Insuficiente */}
      {modalEstoqueInsuficiente && dadosEstoqueInsuficiente && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`max-w-md w-full rounded-2xl shadow-2xl ${
            config.modo_escuro ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            {/* Header do Modal */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <span className="text-2xl">📦</span>
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${
                    config.modo_escuro ? 'text-white' : 'text-gray-900'
                  }`}>
                    Estoque Insuficiente
                  </h3>
                  <p className={`text-sm ${
                    config.modo_escuro ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Quantidade solicitada não disponível
                  </p>
                </div>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6">
              <div className="text-center space-y-4">
                <div className="text-6xl mb-4">⚠️</div>

                <h4 className={`text-xl font-bold ${
                  config.modo_escuro ? 'text-white' : 'text-gray-900'
                }`}>
                  {dadosEstoqueInsuficiente.nomeProduto}
                </h4>

                <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-2`}>
                  <p className={`text-sm font-medium ${
                    config.modo_escuro ? 'text-red-200' : 'text-red-800'
                  }`}>
                    <span className="block">Quantidade solicitada: <strong>{dadosEstoqueInsuficiente.quantidadeSolicitada}</strong></span>
                    <span className="block">Estoque disponível: <strong>{dadosEstoqueInsuficiente.estoqueDisponivel}</strong></span>
                  </p>
                </div>

                <p className={`text-sm leading-relaxed ${
                  config.modo_escuro ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  A quantidade que você selecionou não está disponível no momento. Por favor, ajuste a quantidade ou tente novamente mais tarde.
                </p>
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={() => {
                  setModalEstoqueInsuficiente(false);
                  setDadosEstoqueInsuficiente(null);
                }}
                className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Conscientização - Produto Alcoólico */}
      {modalProdutoAlcoolico && produtoAlcoolicoPendente && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`max-w-md w-full rounded-2xl shadow-2xl ${
            config.modo_escuro ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            {/* Header do Modal */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${
                    config.modo_escuro ? 'text-white' : 'text-gray-900'
                  }`}>
                    Produto Alcoólico
                  </h3>
                  <p className={`text-sm ${
                    config.modo_escuro ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Conscientização sobre consumo responsável
                  </p>
                </div>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6">
              <div className="text-center space-y-4">
                <div className="text-6xl mb-4">🍷</div>

                <h4 className={`text-xl font-bold ${
                  config.modo_escuro ? 'text-white' : 'text-gray-900'
                }`}>
                  Apenas para maiores de 18 anos
                </h4>

                <p className={`text-sm leading-relaxed ${
                  config.modo_escuro ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Este produto contém álcool e é destinado exclusivamente para pessoas maiores de 18 anos.
                </p>

                <div className={`bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 ${
                  config.modo_escuro ? 'text-yellow-200' : 'text-yellow-800'
                }`}>
                  <p className="text-sm font-medium">
                    ⚠️ Beba com moderação. Venda proibida para menores de 18 anos.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={cancelarProdutoAlcoolico}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${
                  config.modo_escuro
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarProdutoAlcoolico}
                className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Sou maior de 18 anos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Tabela de Preço Obrigatória */}
      {modalTabelaPrecoObrigatoria && produtoTabelaPrecoObrigatoria && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`max-w-md w-full rounded-2xl shadow-2xl ${
            config.modo_escuro ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            {/* Header do Modal */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <span className="text-2xl">📋</span>
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${
                    config.modo_escuro ? 'text-white' : 'text-gray-900'
                  }`}>
                    Selecione uma Opção de Preço
                  </h3>
                  <p className={`text-sm ${
                    config.modo_escuro ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {produtoTabelaPrecoObrigatoria.nome}
                  </p>
                </div>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6">
              <div className={`bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 ${
                config.modo_escuro ? 'text-blue-200' : 'text-blue-800'
              }`}>
                <p className="text-sm font-medium">
                  ℹ️ Este produto possui diferentes opções de tamanho e preço.
                </p>
                <p className="text-sm mt-1">
                  Por favor, selecione primeiro uma das opções disponíveis antes de escolher a quantidade.
                </p>
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={fecharModalTabelaPrecoObrigatoria}
                className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                  config.modo_escuro
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Finalização do Pedido */}
      {modalFinalizacaoAberto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50">
          <div className={`w-full h-full flex flex-col ${
            config.modo_escuro ? 'bg-gray-900' : 'bg-white'
          }`}>
            {/* Header */}
            <div className={`flex-shrink-0 p-4 sm:p-6 border-b ${
              config.modo_escuro ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-xl font-semibold ${
                    config.modo_escuro ? 'text-white' : 'text-gray-900'
                  }`}>
                    Finalizar Pedido
                  </h3>
                  <p className={`text-sm mt-1 ${
                    config.modo_escuro ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {obterQuantidadeTotalItens()} {obterQuantidadeTotalItens() === 1 ? 'item' : 'itens'} • {config.mostrar_precos ? formatarPreco(obterTotalCarrinho()) : 'Preços ocultos'}
                  </p>
                </div>
                <button
                  onClick={cancelarFinalizacaoPedido}
                  className={`p-2 rounded-lg transition-colors ${
                    config.modo_escuro
                      ? 'text-gray-400 hover:bg-gray-800'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Lista de Itens - Scrollável */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-3">
                {obterItensCarrinho().map((item, index) => {
                  const { produto, quantidade, adicionais, observacao, itemId, precoProduto } = item as any;
                  const precoFinal = precoProduto || produto.preco;

                  return (
                    <div
                      key={itemId}
                      className={`p-4 rounded-lg border transition-all duration-200 ${
                        config.modo_escuro
                          ? 'bg-gray-800/50 border-gray-700'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Número do item */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          config.modo_escuro
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-500 text-white'
                        }`}>
                          {index + 1}
                        </div>

                        {/* Conteúdo do item */}
                        <div className="flex-1 min-w-0">
                          {/* Nome e controles de quantidade */}
                          <div className="flex items-center justify-between mb-2">
                            <h4 className={`font-medium truncate ${
                              config.modo_escuro ? 'text-white' : 'text-gray-900'
                            }`}>
                              {produto.nome}
                            </h4>

                            {/* Controles de quantidade do produto */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => decrementarQuantidadeItemCarrinho(itemId)}
                                disabled={lojaAberta === false}
                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                                  lojaAberta === false
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : config.modo_escuro
                                    ? 'bg-gray-600 text-white hover:bg-gray-500'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                              >
                                <Minus size={14} />
                              </button>

                              <span className={`min-w-[2rem] text-center text-sm font-semibold ${
                                config.modo_escuro ? 'text-white' : 'text-gray-900'
                              }`}>
                                {quantidade}
                              </span>

                              <button
                                onClick={() => incrementarQuantidadeItemCarrinho(itemId)}
                                disabled={lojaAberta === false}
                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                                  lojaAberta === false
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : config.modo_escuro
                                    ? 'bg-blue-600 text-white hover:bg-blue-500'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                                }`}
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Preço */}
                          {config.mostrar_precos && (
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-sm ${
                                config.modo_escuro ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                Preço unitário: {formatarPreco(precoFinal)}
                              </span>
                              <span className={`text-sm font-medium ${
                                config.modo_escuro ? 'text-green-400' : 'text-green-600'
                              }`}>
                                Subtotal: {formatarPreco(precoFinal * quantidade)}
                              </span>
                            </div>
                          )}

                          {/* Adicionais com controladores */}
                          {adicionais && adicionais.length > 0 && (
                            <div className="mb-2">
                              <p className={`text-xs font-medium mb-2 ${
                                config.modo_escuro ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                Adicionais:
                              </p>
                              <div className="space-y-2">
                                {adicionais.map((adicional: any, idx: number) => (
                                  <div key={idx} className={`flex items-center justify-between p-2 rounded ${
                                    config.modo_escuro ? 'bg-gray-700/50' : 'bg-gray-100'
                                  }`}>
                                    <div className="flex-1">
                                      <span className={`text-xs font-medium ${
                                        config.modo_escuro ? 'text-gray-300' : 'text-gray-700'
                                      }`}>
                                        {adicional.nome}
                                      </span>
                                      {config.mostrar_precos && (
                                        <div className={`text-xs ${
                                          config.modo_escuro ? 'text-gray-400' : 'text-gray-600'
                                        }`}>
                                          {formatarPreco(adicional.preco)} cada
                                        </div>
                                      )}
                                    </div>

                                    {/* Controles de quantidade do adicional */}
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => decrementarAdicionalItem(itemId, adicional.id)}
                                        disabled={lojaAberta === false}
                                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                                          lojaAberta === false
                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            : config.modo_escuro
                                            ? 'bg-gray-600 text-white hover:bg-gray-500'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                      >
                                        <Minus size={10} />
                                      </button>

                                      <span className={`min-w-[1.5rem] text-center text-xs font-semibold ${
                                        config.modo_escuro ? 'text-white' : 'text-gray-900'
                                      }`}>
                                        {adicional.quantidade}
                                      </span>

                                      <button
                                        onClick={() => incrementarAdicionalItem(itemId, adicional.id)}
                                        disabled={lojaAberta === false}
                                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                                          lojaAberta === false
                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            : config.modo_escuro
                                            ? 'bg-blue-600 text-white hover:bg-blue-500'
                                            : 'bg-blue-500 text-white hover:bg-blue-600'
                                        }`}
                                      >
                                        <Plus size={10} />
                                      </button>
                                    </div>

                                    {config.mostrar_precos && (
                                      <div className={`text-xs font-medium ml-2 ${
                                        config.modo_escuro ? 'text-green-400' : 'text-green-600'
                                      }`}>
                                        {formatarPreco(adicional.preco * adicional.quantidade)}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Observação */}
                          {observacao && (
                            <div className={`text-xs p-2 rounded ${
                              config.modo_escuro
                                ? 'bg-gray-700/50 text-gray-300'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              <span className="font-medium">Obs:</span> {observacao}
                            </div>
                          )}

                          {/* Botão para remover item */}
                          <div className="flex justify-end mt-3">
                            <button
                              onClick={() => {
                                setProdutoParaRemover(itemId);
                                setModalRemoverItemAberto(true);
                              }}
                              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                                config.modo_escuro
                                  ? 'text-red-400 hover:bg-red-900/20 border border-red-800'
                                  : 'text-red-600 hover:bg-red-50 border border-red-200'
                              }`}
                            >
                              Remover item
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Geral */}
              {config.mostrar_precos && (
                <div className={`mt-6 p-4 rounded-lg border-2 ${
                  config.modo_escuro
                    ? 'bg-gray-800/50 border-green-600'
                    : 'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-lg font-semibold ${
                      config.modo_escuro ? 'text-white' : 'text-gray-900'
                    }`}>
                      Total Geral:
                    </span>
                    <span className={`text-xl font-bold ${
                      config.modo_escuro ? 'text-green-400' : 'text-green-600'
                    }`}>
                      {formatarPreco(obterTotalCarrinho())}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 ${
                    config.modo_escuro ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {obterQuantidadeTotalItens()} {obterQuantidadeTotalItens() === 1 ? 'item' : 'itens'}
                  </p>
                </div>
              )}
            </div>

            {/* Footer com Botões */}
            <div className={`flex-shrink-0 p-4 border-t space-y-3 ${
              config.modo_escuro ? 'border-gray-700' : 'border-gray-200'
            }`}>
              {/* Botão Cancelar */}
              <button
                onClick={cancelarFinalizacaoPedido}
                className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                  config.modo_escuro
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                }`}
              >
                Cancelar
              </button>

              {/* Botão Concluir */}
              {obterWhatsAppEmpresa() && (
                <button
                  onClick={confirmarFinalizacaoPedido}
                  disabled={lojaAberta === false}
                  className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                    lojaAberta === false
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-60'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white transform hover:scale-[1.02] shadow-lg'
                  }`}
                >
                  {lojaAberta === false ? 'Loja Fechada' : 'Concluir Pedido'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Galeria de Fotos */}
      <FotoGaleria
        fotos={fotosProdutoSelecionado}
        isOpen={galeriaAberta}
        onClose={() => setGaleriaAberta(false)}
        initialFotoIndex={fotoInicialIndex}
      />

      {/* Modal de Validação de Área de Entrega */}
      {modalAreaEntregaAberto && taxaEntregaConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto ${
            config.modo_escuro ? 'bg-gray-800' : 'bg-white'
          }`}>
            {/* Header */}
            <div className={`p-6 border-b ${
              config.modo_escuro ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h2 className={`text-xl font-bold ${
                config.modo_escuro ? 'text-white' : 'text-gray-900'
              }`}>
                Validar Área de Entrega
              </h2>
              <p className={`text-sm mt-2 ${
                config.modo_escuro ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {taxaEntregaConfig.tipo === 'bairro'
                  ? 'Selecione seu bairro para verificar se atendemos sua região'
                  : 'Informe seu CEP para verificar se atendemos sua região'
                }
              </p>
            </div>

            {/* Content */}
            <div className="p-6">
              {taxaEntregaConfig.tipo === 'distancia' ? (
                // Validação por CEP/Distância
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      config.modo_escuro ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      CEP de Entrega
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={cepCliente}
                        onChange={(e) => setCepCliente(formatarCEP(e.target.value))}
                        placeholder="00000-000"
                        maxLength={9}
                        className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          config.modo_escuro
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                      />
                      <button
                        onClick={() => validarCEP(cepCliente)}
                        disabled={validandoCep || cepCliente.replace(/\D/g, '').length !== 8}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          validandoCep || cepCliente.replace(/\D/g, '').length !== 8
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {validandoCep ? 'Validando...' : 'Validar'}
                      </button>
                    </div>
                  </div>

                  {enderecoEncontrado && (
                    <div className={`p-4 rounded-lg ${
                      config.modo_escuro ? 'bg-gray-700' : 'bg-gray-50'
                    }`}>
                      <h4 className={`font-medium mb-2 ${
                        config.modo_escuro ? 'text-white' : 'text-gray-900'
                      }`}>
                        Endereço Encontrado:
                      </h4>
                      <p className={`text-sm ${
                        config.modo_escuro ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        {enderecoEncontrado.logradouro && `${enderecoEncontrado.logradouro}, `}
                        {enderecoEncontrado.bairro}<br />
                        {enderecoEncontrado.localidade} - {enderecoEncontrado.uf}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // Validação por Bairro
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      config.modo_escuro ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Pesquisar Bairro
                    </label>
                    <input
                      type="text"
                      value={termoPesquisaBairro}
                      onChange={(e) => setTermoPesquisaBairro(e.target.value)}
                      placeholder="Digite o nome do bairro..."
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        config.modo_escuro
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {bairrosFiltrados.length > 0 ? (
                      bairrosFiltrados.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setBairroSelecionado(item.bairro)}
                          className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                            bairroSelecionado === item.bairro
                              ? config.modo_escuro
                                ? 'bg-blue-900/50 border-blue-400 text-white'
                                : 'bg-blue-50 border-blue-500 text-gray-900'
                              : config.modo_escuro
                                ? 'bg-gray-700 border-gray-600 text-white hover:border-blue-400'
                                : 'bg-white border-gray-300 text-gray-900 hover:border-blue-400'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{item.bairro}</span>
                            <div className="text-right">
                              <div className={`text-sm font-bold ${
                                config.modo_escuro ? 'text-green-400' : 'text-green-600'
                              }`}>
                                Taxa: {formatarPreco(item.valor)}
                              </div>
                              {item.tempo_entrega && (
                                <div className={`text-xs ${
                                  config.modo_escuro ? 'text-gray-400' : 'text-gray-500'
                                }`}>
                                  {item.tempo_entrega} min
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className={`text-center py-8 ${
                        config.modo_escuro ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {termoPesquisaBairro
                          ? 'Nenhum bairro encontrado com esse nome'
                          : 'Nenhum bairro disponível para entrega'
                        }
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`p-6 border-t ${
              config.modo_escuro ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <button
                onClick={confirmarAreaEntrega}
                disabled={
                  (taxaEntregaConfig.tipo === 'bairro' && !bairroSelecionado) ||
                  (taxaEntregaConfig.tipo === 'distancia' && (!cepCliente || !enderecoEncontrado))
                }
                className={`w-full py-3 px-4 rounded-xl font-medium transition-all ${
                  (taxaEntregaConfig.tipo === 'bairro' && !bairroSelecionado) ||
                  (taxaEntregaConfig.tipo === 'distancia' && (!cepCliente || !enderecoEncontrado))
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700 transform hover:scale-[1.02]'
                }`}
              >
                Confirmar Área de Entrega
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default CardapioPublicoPage;
