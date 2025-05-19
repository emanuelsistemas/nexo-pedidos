import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, AlertCircle, Image, Tag, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import FotoGaleria from '../../components/comum/FotoGaleria';

interface Grupo {
  id: string;
  nome: string;
  produtos: Produto[];
}

interface Produto {
  id: string;
  nome: string;
  preco: number;
  descricao?: string;
  codigo: string;
  ativo: boolean;
  grupo_id: string;
}

interface ProdutoFoto {
  id: string;
  url: string;
  storage_path: string;
  principal: boolean;
  empresa_id?: string;
}

const UserProdutosPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeGrupo, setActiveGrupo] = useState<string | null>(null);
  const [produtosFotos, setProdutosFotos] = useState<Record<string, ProdutoFoto | null>>({});
  
  // Estados para a galeria de fotos
  const [produtoFotos, setProdutoFotos] = useState<ProdutoFoto[]>([]);
  const [isGaleriaOpen, setIsGaleriaOpen] = useState(false);
  const [currentFotoIndex, setCurrentFotoIndex] = useState(0);

  useEffect(() => {
    loadGrupos();
  }, []);

  const loadGrupos = async () => {
    try {
      setIsLoading(true);
      
      // Obter o usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      
      // Obter a empresa do usuário
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();
        
      if (!usuarioData?.empresa_id) return;
      
      // Obter grupos da empresa
      const { data: gruposData } = await supabase
        .from('grupos')
        .select('*')
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('deletado', false)
        .order('nome');
        
      if (!gruposData) {
        setIsLoading(false);
        return;
      }
      
      // Obter produtos de cada grupo
      const { data: produtosData } = await supabase
        .from('produtos')
        .select('*')
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('deletado', false)
        .eq('ativo', true)
        .order('nome');
        
      if (!produtosData) {
        setIsLoading(false);
        return;
      }
      
      // Organizar produtos por grupo
      const gruposComProdutos = gruposData.map(grupo => ({
        ...grupo,
        produtos: produtosData.filter(produto => produto.grupo_id === grupo.id)
      })).filter(grupo => grupo.produtos.length > 0); // Filtrar apenas grupos com produtos
      
      setGrupos(gruposComProdutos);
      
      // Se houver grupos, definir o primeiro como ativo
      if (gruposComProdutos.length > 0) {
        setActiveGrupo(gruposComProdutos[0].id);
      }
      
      // Carregar fotos principais dos produtos
      await loadProdutosFotos(produtosData);
      
    } catch (error) {
      console.error('Erro ao carregar grupos e produtos:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadProdutosFotos = async (produtos: Produto[]) => {
    try {
      // Obter o usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      
      // Obter a empresa do usuário
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();
        
      if (!usuarioData?.empresa_id) return;
      
      // Obter fotos principais de todos os produtos
      const { data: fotosData } = await supabase
        .from('produto_fotos')
        .select('*')
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('principal', true);
        
      if (!fotosData) return;
      
      // Mapear fotos por produto_id
      const fotosMap: Record<string, ProdutoFoto | null> = {};
      produtos.forEach(produto => {
        const foto = fotosData.find(f => f.produto_id === produto.id);
        fotosMap[produto.id] = foto || null;
      });
      
      setProdutosFotos(fotosMap);
    } catch (error) {
      console.error('Erro ao carregar fotos dos produtos:', error);
    }
  };
  
  const loadProdutoFotos = async (produtoId: string) => {
    try {
      // Obter o usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      
      // Obter a empresa do usuário
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();
        
      if (!usuarioData?.empresa_id) return;
      
      // Obter todas as fotos do produto
      const { data: fotosData } = await supabase
        .from('produto_fotos')
        .select('*')
        .eq('produto_id', produtoId)
        .eq('empresa_id', usuarioData.empresa_id)
        .order('principal', { ascending: false });
        
      if (!fotosData || fotosData.length === 0) {
        return;
      }
      
      setProdutoFotos(fotosData);
      setCurrentFotoIndex(0);
      setIsGaleriaOpen(true);
    } catch (error) {
      console.error('Erro ao carregar fotos do produto:', error);
    }
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };
  
  const filteredGrupos = searchTerm
    ? grupos.map(grupo => ({
        ...grupo,
        produtos: grupo.produtos.filter(produto =>
          produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          produto.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          produto.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter(grupo => grupo.produtos.length > 0)
    : grupos;
  
  // Renderizar skeleton loader para os cards de produtos
  const renderSkeletonCards = () => {
    return Array(6).fill(0).map((_, index) => (
      <div key={index} className="bg-background-card rounded-lg overflow-hidden border border-gray-800">
        <div className="h-32 bg-gray-800 animate-pulse"></div>
        <div className="p-3 space-y-2">
          <div className="h-5 w-3/4 bg-gray-700 rounded animate-pulse"></div>
          <div className="h-4 w-1/3 bg-gray-700 rounded animate-pulse"></div>
          <div className="h-3 w-2/3 bg-gray-700 rounded animate-pulse"></div>
        </div>
      </div>
    ));
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-white mb-4">Produtos</h1>
      
      {/* Barra de busca */}
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar produtos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
        />
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      </div>
      
      {isLoading ? (
        <>
          {/* Skeleton para abas de grupos */}
          <div className="flex overflow-x-auto pb-2 hide-scrollbar">
            {Array(4).fill(0).map((_, index) => (
              <div key={index} className="h-8 w-24 bg-gray-700 rounded-full mr-2 flex-shrink-0 animate-pulse"></div>
            ))}
          </div>
          
          {/* Skeleton para cards de produtos */}
          <div className="grid grid-cols-2 gap-4">
            {renderSkeletonCards()}
          </div>
        </>
      ) : (
        <>
          {filteredGrupos.length === 0 ? (
            <div className="bg-background-card rounded-lg p-8 text-center">
              <AlertCircle size={32} className="mx-auto text-gray-500 mb-2" />
              <h3 className="text-lg font-medium text-white mb-2">
                {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto disponível'}
              </h3>
              <p className="text-gray-400">
                {searchTerm
                  ? 'Tente buscar com outros termos'
                  : 'Não há produtos disponíveis no momento.'}
              </p>
            </div>
          ) : (
            <>
              {/* Abas de grupos */}
              <div className="flex overflow-x-auto pb-2 hide-scrollbar">
                {filteredGrupos.map((grupo) => (
                  <button
                    key={grupo.id}
                    className={`px-4 py-1 rounded-full mr-2 flex-shrink-0 transition-colors ${
                      activeGrupo === grupo.id
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                    onClick={() => setActiveGrupo(grupo.id)}
                  >
                    {grupo.nome}
                  </button>
                ))}
              </div>
              
              {/* Cards de produtos */}
              <div className="grid grid-cols-2 gap-4">
                {filteredGrupos
                  .filter(grupo => !activeGrupo || grupo.id === activeGrupo)
                  .flatMap(grupo => grupo.produtos)
                  .map((produto, index) => (
                    <motion.div
                      key={produto.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-background-card rounded-lg overflow-hidden border border-gray-800"
                    >
                      {/* Foto do produto */}
                      <div 
                        className="h-32 bg-gray-800 relative cursor-pointer"
                        onClick={() => loadProdutoFotos(produto.id)}
                      >
                        {produtosFotos[produto.id] ? (
                          <img 
                            src={produtosFotos[produto.id]?.url} 
                            alt={produto.nome}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600">
                            <Package size={32} />
                          </div>
                        )}
                        <div className="absolute bottom-0 right-0 bg-background-dark/80 px-2 py-1 text-primary-400 text-sm font-medium">
                          {formatCurrency(produto.preco)}
                        </div>
                      </div>
                      
                      {/* Informações do produto */}
                      <div className="p-3">
                        <h3 className="text-white font-medium line-clamp-1">{produto.nome}</h3>
                        <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
                          <Tag size={12} />
                          <span>#{produto.codigo}</span>
                        </div>
                        {produto.descricao && (
                          <p className="text-gray-400 text-xs mt-2 line-clamp-2">
                            {produto.descricao}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
              </div>
            </>
          )}
        </>
      )}
      
      {/* Galeria de fotos */}
      <FotoGaleria
        fotos={produtoFotos}
        isOpen={isGaleriaOpen}
        onClose={() => setIsGaleriaOpen(false)}
        initialFotoIndex={currentFotoIndex}
      />
    </div>
  );
};

export default UserProdutosPage;
