import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, ShoppingBag, Tag, Check, ChevronLeft, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Produto {
  id: string;
  nome: string;
  preco: number;
  codigo: string;
  descricao?: string;
  grupo_id?: string;
  promocao?: boolean;
  tipo_desconto?: string;
  valor_desconto?: number;
  fotos?: ProdutoFoto[];
}

interface ProdutoFoto {
  id: string;
  url: string;
  principal: boolean;
}

interface Grupo {
  id: string;
  nome: string;
}

interface ProdutoSeletorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (produto: Produto) => void;
  empresaId: string;
}

const ProdutoSeletorModal: React.FC<ProdutoSeletorModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  empresaId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [filteredProdutos, setFilteredProdutos] = useState<Produto[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [selectedGrupo, setSelectedGrupo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);
  const [produtoEmVisualizacao, setProdutoEmVisualizacao] = useState<Produto | null>(null);
  const [fotoAtualIndex, setFotoAtualIndex] = useState(0);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Carregar produtos e grupos quando o modal abrir
  useEffect(() => {
    if (isOpen && empresaId) {
      loadGrupos();
      loadProdutos();
      
      // Focar no campo de busca quando o modal abrir
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, empresaId]);

  // Filtrar produtos quando o termo de busca ou grupo selecionado mudar
  useEffect(() => {
    if (!produtos.length) return;
    
    let filtered = [...produtos];
    
    // Filtrar por termo de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(produto => 
        produto.nome.toLowerCase().includes(term) || 
        produto.codigo.toLowerCase().includes(term) ||
        (produto.descricao && produto.descricao.toLowerCase().includes(term))
      );
    }
    
    // Filtrar por grupo
    if (selectedGrupo) {
      filtered = filtered.filter(produto => produto.grupo_id === selectedGrupo);
    }
    
    setFilteredProdutos(filtered);
  }, [searchTerm, selectedGrupo, produtos]);

  // Fechar o modal ao pressionar ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (fotoAmpliada) {
          setFotoAmpliada(null);
        } else if (produtoEmVisualizacao) {
          setProdutoEmVisualizacao(null);
          setFotoAtualIndex(0);
        } else {
          onClose();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, fotoAmpliada, produtoEmVisualizacao]);

  const loadGrupos = async () => {
    try {
      const { data, error } = await supabase
        .from('grupos')
        .select('id, nome')
        .eq('empresa_id', empresaId)
        .eq('deletado', false)
        .order('nome');
        
      if (error) throw error;
      setGrupos(data || []);
    } catch (error) {
      console.error('Erro ao carregar grupos:', error);
    }
  };

  const loadProdutos = async () => {
    try {
      setIsLoading(true);
      
      // Buscar produtos
      const { data: produtosData, error: produtosError } = await supabase
        .from('produtos')
        .select(`
          id, 
          nome, 
          preco, 
          codigo, 
          descricao, 
          grupo_id,
          promocao,
          tipo_desconto,
          valor_desconto
        `)
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .eq('deletado', false)
        .order('nome');
        
      if (produtosError) throw produtosError;
      
      // Buscar fotos dos produtos
      const { data: fotosData, error: fotosError } = await supabase
        .from('produto_fotos')
        .select('id, produto_id, url, principal')
        .eq('empresa_id', empresaId);
        
      if (fotosError) throw fotosError;
      
      // Associar fotos aos produtos
      const produtosComFotos = produtosData?.map(produto => {
        const fotosDoProduto = fotosData?.filter(foto => foto.produto_id === produto.id) || [];
        return {
          ...produto,
          fotos: fotosDoProduto
        };
      }) || [];
      
      setProdutos(produtosComFotos);
      setFilteredProdutos(produtosComFotos);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProduto = (produto: Produto) => {
    onSelect(produto);
    onClose();
  };

  const handleGrupoClick = (grupoId: string) => {
    setSelectedGrupo(selectedGrupo === grupoId ? null : grupoId);
  };

  const handleProdutoClick = (produto: Produto) => {
    setProdutoEmVisualizacao(produto);
    setFotoAtualIndex(0);
  };

  const handleNextFoto = () => {
    if (!produtoEmVisualizacao?.fotos?.length) return;
    setFotoAtualIndex((prev) => (prev + 1) % produtoEmVisualizacao.fotos!.length);
  };

  const handlePrevFoto = () => {
    if (!produtoEmVisualizacao?.fotos?.length) return;
    setFotoAtualIndex((prev) => (prev - 1 + produtoEmVisualizacao.fotos!.length) % produtoEmVisualizacao.fotos!.length);
  };

  const getFotoPrincipal = (produto: Produto) => {
    if (!produto.fotos || produto.fotos.length === 0) return null;
    
    const fotoPrincipal = produto.fotos.find(foto => foto.principal);
    return fotoPrincipal || produto.fotos[0];
  };

  const calcularPrecoFinal = (produto: Produto) => {
    if (!produto.promocao || !produto.valor_desconto) return produto.preco;
    
    if (produto.tipo_desconto === 'percentual') {
      return produto.preco * (1 - produto.valor_desconto / 100);
    } else {
      return produto.preco - produto.valor_desconto;
    }
  };

  const formatarPreco = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div 
        ref={modalRef}
        className="w-full h-full bg-gray-900 flex flex-col"
      >
        {/* Cabeçalho */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose}
              className="p-2 rounded-full bg-gray-800 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-semibold text-white">Selecionar Produto</h2>
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Campo de busca */}
          <div className="p-4 border-b border-gray-800">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-500" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                placeholder="Buscar produto por nome ou código..."
              />
            </div>
          </div>

          {/* Tags de grupos */}
          {grupos.length > 0 && (
            <div className="p-4 border-b border-gray-800 overflow-x-auto">
              <div className="flex gap-2">
                {grupos.map(grupo => (
                  <button
                    key={grupo.id}
                    onClick={() => handleGrupoClick(grupo.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                      selectedGrupo === grupo.id
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Tag size={14} />
                      <span>{grupo.nome}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lista de produtos */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
                <span className="ml-2 text-gray-400">Carregando produtos...</span>
              </div>
            ) : filteredProdutos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <ShoppingBag size={48} className="mb-2 opacity-50" />
                <p>Nenhum produto encontrado</p>
                {searchTerm && <p className="text-sm mt-1">Tente outro termo de busca</p>}
                {selectedGrupo && <p className="text-sm mt-1">Ou selecione outro grupo</p>}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredProdutos.map(produto => (
                  <div
                    key={produto.id}
                    onClick={() => handleProdutoClick(produto)}
                    className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
                  >
                    {/* Imagem do produto */}
                    <div className="aspect-square bg-gray-900 relative">
                      {getFotoPrincipal(produto) ? (
                        <img
                          src={getFotoPrincipal(produto)!.url}
                          alt={produto.nome}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon size={48} className="text-gray-700" />
                        </div>
                      )}
                      
                      {/* Badge de promoção */}
                      {produto.promocao && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                          {produto.tipo_desconto === 'percentual' 
                            ? `-${produto.valor_desconto}%` 
                            : formatarPreco(produto.valor_desconto || 0)}
                        </div>
                      )}
                    </div>
                    
                    {/* Informações do produto */}
                    <div className="p-3">
                      <h3 className="text-white font-medium line-clamp-2">{produto.nome}</h3>
                      <p className="text-gray-400 text-sm mt-1">{produto.codigo}</p>
                      
                      {/* Preço */}
                      <div className="mt-2">
                        {produto.promocao ? (
                          <div>
                            <span className="text-gray-400 line-through text-sm">
                              {formatarPreco(produto.preco)}
                            </span>
                            <span className="text-primary-400 font-bold ml-2">
                              {formatarPreco(calcularPrecoFinal(produto))}
                            </span>
                          </div>
                        ) : (
                          <span className="text-primary-400 font-bold">
                            {formatarPreco(produto.preco)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de visualização do produto */}
      <AnimatePresence>
        {produtoEmVisualizacao && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          >
            {/* Cabeçalho */}
            <div className="p-4 flex items-center justify-between">
              <button 
                onClick={() => setProdutoEmVisualizacao(null)}
                className="p-2 rounded-full bg-gray-800 text-gray-400 hover:text-white"
              >
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-xl font-semibold text-white">{produtoEmVisualizacao.nome}</h2>
              <div className="w-10"></div> {/* Espaçador para centralizar o título */}
            </div>

            {/* Conteúdo */}
            <div className="flex-1 flex flex-col">
              {/* Galeria de fotos */}
              <div className="relative flex-1 flex items-center justify-center">
                {produtoEmVisualizacao.fotos && produtoEmVisualizacao.fotos.length > 0 ? (
                  <>
                    <div 
                      className="w-full h-full flex items-center justify-center"
                      onClick={() => setFotoAmpliada(produtoEmVisualizacao.fotos![fotoAtualIndex].url)}
                    >
                      <img
                        src={produtoEmVisualizacao.fotos[fotoAtualIndex].url}
                        alt={produtoEmVisualizacao.nome}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    
                    {/* Controles de navegação */}
                    {produtoEmVisualizacao.fotos.length > 1 && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePrevFoto(); }}
                          className="absolute left-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
                        >
                          <ChevronLeft size={24} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleNextFoto(); }}
                          className="absolute right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
                        >
                          <ChevronLeft size={24} className="transform rotate-180" />
                        </button>
                      </>
                    )}
                    
                    {/* Indicadores de fotos */}
                    {produtoEmVisualizacao.fotos.length > 1 && (
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                        {produtoEmVisualizacao.fotos.map((_, index) => (
                          <button
                            key={index}
                            onClick={(e) => { e.stopPropagation(); setFotoAtualIndex(index); }}
                            className={`w-2 h-2 rounded-full ${
                              index === fotoAtualIndex ? 'bg-white' : 'bg-white/30'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <ImageIcon size={64} className="text-gray-700 mx-auto mb-4" />
                      <p className="text-gray-400">Sem imagens disponíveis</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Informações e botão de seleção */}
              <div className="p-4 bg-gray-900 border-t border-gray-800">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-gray-400 text-sm">Código: {produtoEmVisualizacao.codigo}</p>
                    {produtoEmVisualizacao.descricao && (
                      <p className="text-gray-300 mt-2">{produtoEmVisualizacao.descricao}</p>
                    )}
                  </div>
                  <div className="text-right">
                    {produtoEmVisualizacao.promocao ? (
                      <>
                        <p className="text-gray-400 line-through">
                          {formatarPreco(produtoEmVisualizacao.preco)}
                        </p>
                        <p className="text-primary-400 text-xl font-bold">
                          {formatarPreco(calcularPrecoFinal(produtoEmVisualizacao))}
                        </p>
                      </>
                    ) : (
                      <p className="text-primary-400 text-xl font-bold">
                        {formatarPreco(produtoEmVisualizacao.preco)}
                      </p>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => handleSelectProduto(produtoEmVisualizacao)}
                  className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <Check size={20} />
                  <span>Selecionar Produto</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de foto ampliada */}
      <AnimatePresence>
        {fotoAmpliada && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={() => setFotoAmpliada(null)}
          >
            <button 
              onClick={() => setFotoAmpliada(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
            >
              <X size={24} />
            </button>
            <img
              src={fotoAmpliada}
              alt="Foto ampliada"
              className="max-w-full max-h-full object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProdutoSeletorModal;
