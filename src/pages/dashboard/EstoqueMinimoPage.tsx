import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  AlertTriangle,
  Package,
  TrendingDown,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Edit,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showMessage } from '../../utils/toast';
import { useAuthSession } from '../../hooks/useAuthSession';
import Button from '../../components/comum/Button';
import { useNavigate } from 'react-router-dom';

interface Produto {
  id: string;
  nome: string;
  codigo: string;
  codigo_barras?: string;
  preco: number;
  estoque_atual: number;
  estoque_minimo: number;
  grupo_id: string;
  unidade_medida?: {
    id: string;
    sigla: string;
    nome: string;
  };
}

interface Grupo {
  id: string;
  nome: string;
  produtos: Produto[];
}

interface ProdutoFoto {
  id: string;
  url: string;
  principal: boolean;
}

const EstoqueMinimoPage: React.FC = () => {
  const { withSessionCheck } = useAuthSession();
  const navigate = useNavigate();
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrupo, setSelectedGrupo] = useState<string>('todos');
  const [produtosFotos, setProdutosFotos] = useState<Record<string, ProdutoFoto>>({});
  const [totalProdutos, setTotalProdutos] = useState(0);
  const [produtosNegativos, setProdutosNegativos] = useState(0);

  useEffect(() => {
    loadProdutosEstoqueMinimo();
  }, []);

  const loadProdutosEstoqueMinimo = async () => {
    await withSessionCheck(async () => {
      setIsLoading(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('Usuário não autenticado');

        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select('empresa_id')
          .eq('id', userData.user.id)
          .single();

        if (!usuarioData?.empresa_id) throw new Error('Empresa não encontrada');

        // Buscar produtos com estoque mínimo ativo que atingiram o limite
        const { data: produtosData, error: produtosError } = await supabase
          .from('produtos')
          .select(`
            id,
            nome,
            codigo,
            codigo_barras,
            preco,
            estoque_atual,
            estoque_minimo,
            grupo_id,
            unidade_medida:unidade_medida_id (
              id,
              sigla,
              nome
            )
          `)
          .eq('empresa_id', usuarioData.empresa_id)
          .eq('estoque_minimo_ativo', true)
          .eq('deletado', false)
          .gt('estoque_minimo', 0);

        if (produtosError) throw produtosError;

        // Filtrar produtos que atingiram o estoque mínimo
        const produtosAbaixoMinimo = (produtosData || []).filter(produto =>
          produto.estoque_atual <= produto.estoque_minimo
        );

        // Buscar grupos
        const { data: gruposData, error: gruposError } = await supabase
          .from('grupos')
          .select('id, nome')
          .eq('empresa_id', usuarioData.empresa_id)
          .eq('deletado', false);

        if (gruposError) throw gruposError;

        // Organizar produtos por grupo
        const gruposComProdutos = (gruposData || []).map(grupo => ({
          ...grupo,
          produtos: produtosAbaixoMinimo.filter(produto => produto.grupo_id === grupo.id)
        })).filter(grupo => grupo.produtos.length > 0);

        setGrupos(gruposComProdutos);
        setTotalProdutos(produtosAbaixoMinimo.length);
        setProdutosNegativos(produtosAbaixoMinimo.filter(p => p.estoque_atual < 0).length);

        // Carregar fotos dos produtos
        await loadProdutosFotos(produtosAbaixoMinimo.map(p => p.id), usuarioData.empresa_id);

      } catch (error: any) {
        console.error('Erro ao carregar produtos com estoque mínimo:', error);
        showMessage('error', 'Erro ao carregar produtos com estoque mínimo');
      } finally {
        setIsLoading(false);
      }
    });
  };

  const loadProdutosFotos = async (produtoIds: string[], empresaId: string) => {
    try {
      const { data: fotosData } = await supabase
        .from('produto_fotos')
        .select('produto_id, url, principal')
        .eq('empresa_id', empresaId)
        .eq('principal', true)
        .in('produto_id', produtoIds);

      const fotosMap: Record<string, ProdutoFoto> = {};
      (fotosData || []).forEach(foto => {
        fotosMap[foto.produto_id] = {
          id: foto.produto_id,
          url: foto.url,
          principal: foto.principal
        };
      });

      setProdutosFotos(fotosMap);
    } catch (error) {
      console.error('Erro ao carregar fotos dos produtos:', error);
    }
  };

  const formatarPreco = (preco: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(preco);
  };

  const formatarEstoque = (valor: number, produto: Produto) => {
    if (produto.unidade_medida?.sigla === 'KG') {
      return valor.toFixed(3);
    } else {
      return Math.floor(valor).toString();
    }
  };

  const calcularDiferenca = (produto: Produto) => {
    const diferenca = produto.estoque_atual - produto.estoque_minimo;
    return diferenca;
  };

  const getStatusProduto = (produto: Produto) => {
    if (produto.estoque_atual < 0) {
      return {
        tipo: 'negativo',
        cor: 'bg-red-600',
        texto: 'Estoque Defasado',
        icone: AlertCircle
      };
    } else if (produto.estoque_atual === 0) {
      return {
        tipo: 'zerado',
        cor: 'bg-orange-600',
        texto: 'Estoque Zerado',
        icone: AlertTriangle
      };
    } else {
      return {
        tipo: 'baixo',
        cor: 'bg-yellow-600',
        texto: 'Estoque Baixo',
        icone: TrendingDown
      };
    }
  };

  const handleEditarProduto = (produto: Produto) => {
    // Armazenar dados do produto no localStorage para a página de produtos
    localStorage.setItem('produto_para_editar', JSON.stringify({
      produto_id: produto.id,
      grupo_id: produto.grupo_id,
      timestamp: new Date().getTime(),
      origem: 'estoque_minimo', // Identificar que veio da página de estoque mínimo
      aba_inicial: 'estoque' // Definir que deve abrir na aba de estoque
    }));

    // Navegar para a página de produtos
    navigate('/dashboard/produtos');
  };

  const filteredGrupos = grupos.filter(grupo => {
    if (selectedGrupo !== 'todos' && grupo.id !== selectedGrupo) return false;

    if (searchTerm) {
      return grupo.produtos.some(produto =>
        produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        produto.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (produto.codigo_barras && produto.codigo_barras.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    return true;
  }).map(grupo => ({
    ...grupo,
    produtos: grupo.produtos.filter(produto =>
      !searchTerm ||
      produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      produto.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (produto.codigo_barras && produto.codigo_barras.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }));

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.history.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Voltar
          </Button>

          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="text-red-500" size={28} />
              Produtos com Estoque Mínimo
            </h1>
            <p className="text-gray-400 mt-1">
              {totalProdutos} {totalProdutos === 1 ? 'produto atingiu' : 'produtos atingiram'} o estoque mínimo
              {produtosNegativos > 0 && (
                <span className="text-red-400 ml-2">
                  • {produtosNegativos} com estoque negativo
                </span>
              )}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadProdutosEstoqueMinimo}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Busca */}
          <div className="flex-1">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, código ou código de barras..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          {/* Filtro por grupo */}
          <div className="md:w-64">
            <select
              value={selectedGrupo}
              onChange={(e) => setSelectedGrupo(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
            >
              <option value="todos">Todos os grupos</option>
              {grupos.map(grupo => (
                <option key={grupo.id} value={grupo.id}>
                  {grupo.nome} ({grupo.produtos.length})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-gray-500 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando produtos...</p>
        </div>
      )}

      {/* Lista de produtos por grupo */}
      {!isLoading && (
        <div className="space-y-8">
          {filteredGrupos.length === 0 ? (
            <div className="text-center py-12">
              <Package size={48} className="mx-auto text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto com estoque mínimo'}
              </h3>
              <p className="text-gray-400">
                {searchTerm
                  ? 'Tente ajustar os filtros de busca'
                  : 'Todos os produtos estão com estoque adequado'
                }
              </p>
            </div>
          ) : (
            filteredGrupos.map((grupo) => (
              <div key={grupo.id} className="space-y-4">
                <h2 className="text-xl font-semibold text-white border-b border-gray-700 pb-2">
                  {grupo.nome} ({grupo.produtos.length} {grupo.produtos.length === 1 ? 'produto' : 'produtos'})
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {grupo.produtos.map((produto, index) => {
                    const status = getStatusProduto(produto);
                    const diferenca = calcularDiferenca(produto);
                    const foto = produtosFotos[produto.id];

                    return (
                      <motion.div
                        key={produto.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          // Animação especial para produtos com estoque negativo
                          ...(produto.estoque_atual < 0 && {
                            boxShadow: [
                              "0 0 0 0 rgba(239, 68, 68, 0.7)",
                              "0 0 0 10px rgba(239, 68, 68, 0)",
                              "0 0 0 0 rgba(239, 68, 68, 0)"
                            ]
                          })
                        }}
                        transition={{
                          delay: index * 0.1,
                          ...(produto.estoque_atual < 0 && {
                            boxShadow: {
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }
                          })
                        }}
                        className={`bg-gray-800/50 border rounded-lg overflow-hidden hover:border-gray-600 transition-colors relative cursor-pointer group ${
                          produto.estoque_atual < 0
                            ? 'border-red-500/50 shadow-red-500/20'
                            : 'border-gray-700'
                        }`}
                        onClick={() => handleEditarProduto(produto)}
                      >
                        {/* Status Badge Piscante */}
                        <div className={`absolute top-2 right-2 z-10 px-2 py-1 rounded-full text-xs font-medium text-white ${status.cor} animate-pulse shadow-lg`}>
                          <status.icone size={12} className="inline mr-1" />
                          {status.texto}
                        </div>

                        {/* Botão de Edição no Hover */}
                        <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <div className="bg-primary-500 hover:bg-primary-600 text-white rounded-full p-2 shadow-lg">
                            <Edit size={14} />
                          </div>
                        </div>

                        {/* Foto do produto */}
                        <div className="h-32 bg-gray-900/50 flex items-center justify-center overflow-hidden">
                          {foto ? (
                            <img
                              src={foto.url}
                              alt={produto.nome}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package size={32} className="text-gray-500" />
                          )}
                        </div>

                        {/* Informações do produto */}
                        <div className="p-4 space-y-3">
                          <div>
                            <h3 className="font-medium text-white text-sm line-clamp-2">
                              {produto.nome}
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">
                              Cód: {produto.codigo}
                              {produto.codigo_barras && ` • ${produto.codigo_barras}`}
                            </p>
                          </div>

                          <div className="text-lg font-bold text-primary-400">
                            {formatarPreco(produto.preco)}
                          </div>

                          {/* Tags de estoque piscantes */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-400">Estoque Atual:</span>
                              <span className={`px-2 py-1 rounded text-xs font-medium animate-pulse ${
                                produto.estoque_atual < 0 ? 'bg-red-600 text-white' :
                                produto.estoque_atual === 0 ? 'bg-orange-600 text-white' :
                                'bg-yellow-600 text-white'
                              }`}>
                                {formatarEstoque(produto.estoque_atual, produto)} {produto.unidade_medida?.sigla}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-400">Estoque Mínimo:</span>
                              <span className="px-2 py-1 bg-gray-600 text-white rounded text-xs font-medium">
                                {formatarEstoque(produto.estoque_minimo, produto)} {produto.unidade_medida?.sigla}
                              </span>
                            </div>

                            {/* Diferença */}
                            <div className="pt-2 border-t border-gray-700">
                              {produto.estoque_atual < 0 ? (
                                <div className="text-center">
                                  <div className="text-xs text-red-400 font-medium animate-pulse">
                                    ⚠️ ESTOQUE DEFASADO
                                  </div>
                                  <div className="text-xs text-red-300 mt-1">
                                    Estoque negativo com controle ativo
                                  </div>
                                </div>
                              ) : diferenca < 0 ? (
                                <div className="text-center">
                                  <div className="text-xs text-orange-400 font-medium">
                                    Faltam {formatarEstoque(Math.abs(diferenca), produto)} {produto.unidade_medida?.sigla}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    para atingir o estoque mínimo
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center">
                                  <div className="text-xs text-yellow-400 font-medium">
                                    No limite mínimo
                                  </div>
                                </div>
                              )}

                              {/* Indicação de clique */}
                              <div className="text-center mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <div className="text-xs text-primary-400 font-medium">
                                  Clique para editar →
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default EstoqueMinimoPage;
