import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, AlertCircle, Image, Tag, Package, RefreshCw } from 'lucide-react';
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
  promocao?: boolean;
  tipo_desconto?: 'percentual' | 'valor';
  valor_desconto?: number;
  desconto_quantidade?: boolean;
  quantidade_minima?: number;
  tipo_desconto_quantidade?: 'percentual' | 'valor';
  valor_desconto_quantidade?: number;
  percentual_desconto_quantidade?: number;
  unidade_medida?: {
    id: string;
    sigla: string;
    nome: string;
  };
  unidade_medida_id?: string;
}

interface ProdutoFoto {
  id: string;
  url: string;
  storage_path: string;
  principal: boolean;
  empresa_id?: string;
}

const UserProdutosPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeGrupo, setActiveGrupo] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'todos' | 'promocao' | 'grupo'>('todos');
  const [produtosFotos, setProdutosFotos] = useState<Record<string, ProdutoFoto | null>>({});
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [produtosEstoque, setProdutosEstoque] = useState<Record<string, { total: number, naoFaturado: number }>>({});

  // Estados para a galeria de fotos
  const [produtoFotos, setProdutoFotos] = useState<ProdutoFoto[]>([]);
  const [isGaleriaOpen, setIsGaleriaOpen] = useState(false);
  const [currentFotoIndex, setCurrentFotoIndex] = useState(0);

  // Estado para armazenar a contagem de fotos por produto
  const [produtosFotosCount, setProdutosFotosCount] = useState<Record<string, number>>({});

  // Verificar se há atualizações no localStorage
  const checkLocalStorageUpdates = () => {
    const produtoAtualizado = localStorage.getItem('produto_atualizado');
    if (produtoAtualizado) {
      try {
        const data = JSON.parse(produtoAtualizado);
        console.log('Atualização detectada via localStorage:', data);

        // Verificar se a atualização é recente (menos de 5 segundos)
        const now = new Date().getTime();
        if (now - data.timestamp < 5000) {
          console.log('Atualização recente, recarregando dados...');

          // Limpar os estados para forçar um recarregamento completo
          setGrupos([]);
          setProdutosFotos({});
          setProdutosFotosCount({});

          // Carregar dados novamente
          loadGrupos();

          // Limpar o sinalizador após processar
          localStorage.removeItem('produto_atualizado');
        }
      } catch (error) {
        console.error('Erro ao processar atualização do localStorage:', error);
        // Limpar o sinalizador em caso de erro
        localStorage.removeItem('produto_atualizado');
      }
    }
  };

  useEffect(() => {
    // Tentar carregar dados do localStorage primeiro
    const loadFromLocalStorage = () => {
      try {
        // Verificar se há dados em cache e se não estão expirados (30 minutos)
        const cachedData = localStorage.getItem('produtos_cache');
        const cachedEstoque = localStorage.getItem('produtos_estoque_cache');
        const cachedTimestamp = localStorage.getItem('produtos_cache_timestamp');

        if (cachedData && cachedTimestamp) {
          const timestamp = parseInt(cachedTimestamp);
          const now = new Date().getTime();
          const thirtyMinutesInMs = 30 * 60 * 1000;

          // Se o cache for válido (menos de 30 minutos)
          if (now - timestamp < thirtyMinutesInMs) {
            console.log('Carregando dados de produtos do cache local');
            setGrupos(JSON.parse(cachedData));

            if (cachedEstoque) {
              setProdutosEstoque(JSON.parse(cachedEstoque));
            }

            // Ainda carregamos os dados do servidor, mas não mostramos o loading
            loadGrupos(false);
            loadProdutosEstoque();
            return true;
          } else {
            console.log('Cache de produtos expirado, carregando do servidor');
            // Limpar cache expirado
            localStorage.removeItem('produtos_cache');
            localStorage.removeItem('produtos_estoque_cache');
            localStorage.removeItem('produtos_cache_timestamp');
          }
        }
        return false;
      } catch (error) {
        console.error('Erro ao carregar dados do localStorage:', error);
        return false;
      }
    };

    // Se não conseguir carregar do localStorage, carregar do servidor com loading
    if (!loadFromLocalStorage()) {
      loadGrupos(true);
      loadProdutosEstoque();
    }

    // Configurar a escuta em tempo real para atualizações
    setupRealtimeSubscription();

    // Verificar atualizações no localStorage
    checkLocalStorageUpdates();

    // Configurar um intervalo para verificar atualizações no localStorage
    const localStorageInterval = setInterval(() => {
      checkLocalStorageUpdates();
    }, 1000);

    // Testar a conexão Realtime após um curto período
    const timer = setTimeout(() => {
      testRealtimeConnection();
    }, 2000);

    // Limpar a inscrição quando o componente for desmontado
    return () => {
      clearTimeout(timer);
      clearInterval(localStorageInterval);
      supabase.removeAllChannels();
    };
  }, []);

  // Função para testar a conexão Realtime
  const testRealtimeConnection = async () => {
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

      // Obter um produto qualquer para testar
      const { data: produtosData } = await supabase
        .from('produtos')
        .select('id')
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('deletado', false)
        .limit(1);

      if (!produtosData || produtosData.length === 0) {
        console.log('Nenhum produto encontrado para testar a conexão Realtime');
        return;
      }

      const produtoId = produtosData[0].id;

      // Fazer uma atualização simples para testar a conexão Realtime
      console.log(`Testando conexão Realtime com produto ${produtoId}...`);

      // Atualizar o produto com o mesmo valor para não alterar dados
      const { data, error } = await supabase
        .from('produtos')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', produtoId)
        .select();

      if (error) {
        console.error('Erro ao testar conexão Realtime:', error);
      } else {
        console.log('Teste de conexão Realtime enviado com sucesso');
      }
    } catch (error) {
      console.error('Erro ao testar conexão Realtime:', error);
    }
  };

  const loadGrupos = async (showLoading = true) => {
    console.log('Iniciando carregamento de grupos e produtos...');
    try {
      // Verificar se é o carregamento inicial ou uma atualização
      const isInitialLoad = grupos.length === 0;

      // Definir o estado de carregamento apropriado
      if (isInitialLoad && showLoading) {
        setIsLoading(true);
      } else if (!isInitialLoad) {
        setIsRefreshing(true);
      }

      // Limpar os estados para garantir que não haja dados antigos
      if (!isInitialLoad) {
        console.log('Limpando estados para garantir dados atualizados...');
      }

      // Obter o usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        console.log('Usuário não autenticado, não é possível carregar dados');
        return;
      }

      // Obter a empresa do usuário
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) {
        console.log('Empresa não encontrada, não é possível carregar dados');
        return;
      }

      console.log(`Carregando dados para empresa_id: ${usuarioData.empresa_id}`);

      // Obter grupos da empresa
      const { data: gruposData, error: gruposError } = await supabase
        .from('grupos')
        .select('*')
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('deletado', false)
        .order('nome');

      if (gruposError) {
        console.error('Erro ao carregar grupos:', gruposError);
        return;
      }

      if (!gruposData || gruposData.length === 0) {
        console.log('Nenhum grupo encontrado');
        setGrupos([]);
        setIsLoading(false);
        return;
      }

      console.log(`${gruposData.length} grupos encontrados`);

      // Obter produtos de cada grupo
      const { data: produtosData, error: produtosError } = await supabase
        .from('produtos')
        .select(`
          *,
          unidade_medida:unidade_medida (
            id,
            sigla,
            nome
          )
        `)
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('deletado', false)
        .eq('ativo', true)
        .order('nome');

      if (produtosError) {
        console.error('Erro ao carregar produtos:', produtosError);
        return;
      }

      if (!produtosData || produtosData.length === 0) {
        console.log('Nenhum produto encontrado');
        setGrupos([]);
        setIsLoading(false);
        return;
      }

      console.log(`${produtosData.length} produtos encontrados`);

      // Organizar produtos por grupo
      const gruposComProdutos = gruposData.map(grupo => ({
        ...grupo,
        produtos: produtosData.filter(produto => produto.grupo_id === grupo.id)
      })).filter(grupo => grupo.produtos.length > 0); // Filtrar apenas grupos com produtos

      console.log(`${gruposComProdutos.length} grupos com produtos`);

      // Atualizar o estado com os novos dados
      setGrupos(gruposComProdutos);

      // Se for o carregamento inicial, definir o filtro e o grupo ativo
      if (isInitialLoad) {
        // Definir o filtro inicial como "todos"
        setActiveFilter('todos');

        // Se houver grupos, armazenar o ID do primeiro grupo para uso posterior
        if (gruposComProdutos.length > 0) {
          setActiveGrupo(gruposComProdutos[0].id);
        }
      }

      // Carregar fotos principais dos produtos
      await loadProdutosFotos(produtosData);

      // Carregar contagem de fotos para cada produto
      await loadProdutosFotosCount(produtosData);

      // Atualizar o timestamp da última atualização
      setLastUpdate(new Date());

      // Salvar dados no localStorage para acesso rápido na próxima vez
      try {
        localStorage.setItem('produtos_cache', JSON.stringify(gruposComProdutos));
        localStorage.setItem('produtos_cache_timestamp', new Date().getTime().toString());
        console.log('Dados de produtos salvos no cache local');
      } catch (cacheError) {
        console.error('Erro ao salvar dados no localStorage:', cacheError);
      }

      console.log('Carregamento de dados concluído com sucesso');

    } catch (error) {
      console.error('Erro ao carregar grupos e produtos:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Função para carregar a contagem de fotos de cada produto
  const loadProdutosEstoque = async () => {
    try {
      console.log('Carregando informações de estoque dos produtos...');

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

      // Buscar todos os produtos da empresa
      const { data: produtosData, error: produtosError } = await supabase
        .from('produtos')
        .select('id')
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('deletado', false)
        .eq('ativo', true);

      if (produtosError) {
        console.error('Erro ao carregar produtos para estoque:', produtosError);
        return;
      }

      if (!produtosData || produtosData.length === 0) {
        console.log('Nenhum produto encontrado para carregar estoque');
        return;
      }

      console.log(`Carregando estoque para ${produtosData.length} produtos...`);

      // Criar um objeto para armazenar as informações de estoque de cada produto
      const estoqueInfo: Record<string, { total: number, naoFaturado: number }> = {};

      // Para cada produto, buscar as movimentações de estoque e calcular o saldo
      for (const produto of produtosData) {
        // Buscar movimentações de estoque
        const { data: movimentosData, error: movimentosError } = await supabase
          .from('produto_estoque')
          .select('tipo_movimento, quantidade')
          .eq('produto_id', produto.id)
          .eq('empresa_id', usuarioData.empresa_id);

        if (movimentosError) {
          console.error(`Erro ao carregar movimentos do produto ${produto.id}:`, movimentosError);
          continue;
        }

        // Calcular o saldo total
        let saldoTotal = 0;
        if (movimentosData && movimentosData.length > 0) {
          movimentosData.forEach((movimento: any) => {
            if (movimento.tipo_movimento === 'entrada') {
              saldoTotal += parseFloat(movimento.quantidade);
            } else {
              saldoTotal -= parseFloat(movimento.quantidade);
            }
          });
        }

        // Buscar pedidos pendentes que contêm este produto
        const { data: pedidosData, error: pedidosError } = await supabase
          .from('pedidos_itens')
          .select(`
            quantidade,
            pedido:pedido_id (
              status
            )
          `)
          .eq('produto_id', produto.id)
          .eq('empresa_id', usuarioData.empresa_id);

        if (pedidosError) {
          console.error(`Erro ao carregar pedidos do produto ${produto.id}:`, pedidosError);
          continue;
        }

        // Calcular a quantidade total de produtos em pedidos pendentes (não faturados)
        let quantidadeNaoFaturada = 0;

        if (pedidosData && pedidosData.length > 0) {
          pedidosData.forEach((item: any) => {
            // Verificar se o pedido está pendente (não faturado)
            if (item.pedido && item.pedido.status !== 'faturado') {
              quantidadeNaoFaturada += parseFloat(item.quantidade);
            }
          });
        }

        // Armazenar as informações de estoque do produto
        estoqueInfo[produto.id] = {
          total: saldoTotal,
          naoFaturado: quantidadeNaoFaturada
        };
      }

      console.log('Informações de estoque carregadas com sucesso');

      // Atualizar o estado com as informações de estoque de todos os produtos
      setProdutosEstoque(estoqueInfo);

      // Salvar dados de estoque no localStorage
      try {
        localStorage.setItem('produtos_estoque_cache', JSON.stringify(estoqueInfo));
        console.log('Dados de estoque salvos no cache local');
      } catch (cacheError) {
        console.error('Erro ao salvar dados de estoque no localStorage:', cacheError);
      }
    } catch (error) {
      console.error('Erro ao carregar estoque dos produtos:', error);
    }
  };

  const loadProdutosFotosCount = async (produtos: Produto[]) => {
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

      // Obter todas as fotos de todos os produtos
      const { data: fotosData } = await supabase
        .from('produto_fotos')
        .select('produto_id')
        .eq('empresa_id', usuarioData.empresa_id);

      if (!fotosData) return;

      // Contar fotos por produto_id
      const fotosCount: Record<string, number> = {};
      produtos.forEach(produto => {
        const count = fotosData.filter(f => f.produto_id === produto.id).length;
        fotosCount[produto.id] = count;
      });

      setProdutosFotosCount(fotosCount);
    } catch (error) {
      console.error('Erro ao carregar contagem de fotos dos produtos:', error);
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

  // Calcular o valor final após aplicar o desconto
  const calcularValorFinal = (preco: number, tipoDesconto?: string, valorDesconto?: number) => {
    if (!tipoDesconto || valorDesconto === undefined) return preco;

    if (tipoDesconto === 'percentual') {
      return preco - (preco * (valorDesconto / 100));
    } else {
      return preco - valorDesconto;
    }
  };

  // Configurar a escuta em tempo real para atualizações de produtos
  const setupRealtimeSubscription = async () => {
    try {
      // Remover todos os canais existentes para evitar duplicação
      supabase.removeAllChannels();

      // Obter o usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        console.log('Usuário não autenticado, não é possível configurar escuta em tempo real');
        return;
      }

      // Obter a empresa do usuário
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) {
        console.log('Empresa não encontrada, não é possível configurar escuta em tempo real');
        return;
      }

      console.log(`Configurando escuta em tempo real para empresa_id: ${usuarioData.empresa_id}`);

      // Gerar um nome de canal único para evitar conflitos
      const channelName = `realtime-mobile-${Date.now()}`;
      console.log(`Criando canal com nome: ${channelName}`);

      // Criar um único canal para todas as alterações
      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: true }
        }
      });

      // Escutar alterações na tabela produtos
      channel.on(
        'postgres_changes',
        {
          event: '*', // Escutar todos os eventos (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'produtos',
          filter: `empresa_id=eq.${usuarioData.empresa_id}`
        },
        (payload) => {
          console.log('Alteração detectada em produtos:', payload);
          console.log('Tipo de evento:', payload.eventType);
          console.log('Dados antigos:', payload.old);
          console.log('Dados novos:', payload.new);

          // Forçar o recarregamento completo dos dados
          // Usamos setTimeout com um atraso maior para garantir que a atualização ocorra após o evento ser processado
          setTimeout(() => {
            console.log('Recarregando dados após alteração em produtos...');
            // Limpar o cache de grupos para forçar um recarregamento completo
            setGrupos([]);
            setProdutosEstoque({});
            loadGrupos();
            loadProdutosEstoque();
          }, 300);
        }
      );

      // Escutar alterações na tabela produto_fotos
      channel.on(
        'postgres_changes',
        {
          event: '*', // Escutar todos os eventos (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'produto_fotos',
          filter: `empresa_id=eq.${usuarioData.empresa_id}`
        },
        (payload) => {
          console.log('Alteração detectada em fotos de produtos:', payload);
          console.log('Tipo de evento:', payload.eventType);
          console.log('Dados antigos:', payload.old);
          console.log('Dados novos:', payload.new);

          // Forçar o recarregamento completo dos dados para garantir consistência
          // Usamos setTimeout com um atraso maior para garantir que a atualização ocorra após o evento ser processado
          setTimeout(() => {
            console.log('Recarregando dados após alteração em fotos de produtos...');
            // Limpar o cache de grupos para forçar um recarregamento completo
            setGrupos([]);
            // Limpar o cache de fotos para forçar um recarregamento completo
            setProdutosFotos({});
            setProdutosFotosCount({});
            setProdutosEstoque({});
            loadGrupos();
            loadProdutosEstoque();
          }, 300);
        }
      );

      // Inscrever-se no canal e verificar o status
      const subscription = channel.subscribe(async (status) => {
        console.log(`Status da inscrição: ${status}`);
        if (status === 'SUBSCRIBED') {
          console.log('Inscrição em tempo real configurada com sucesso');

          // Teste para verificar se a inscrição está funcionando
          console.log('Canais ativos:', await supabase.getChannels());
        }
      });

      console.log('Canal de escuta em tempo real configurado');

    } catch (error) {
      console.error('Erro ao configurar escuta em tempo real:', error);
    }
  };

  // Função para formatar o estoque baseado na unidade de medida
  const formatarEstoque = (valor: number, produto: Produto) => {
    // Se for KG, mostrar 3 casas decimais, senão mostrar como número inteiro
    if (produto.unidade_medida?.sigla === 'KG') {
      return valor.toFixed(3);
    } else {
      return Math.floor(valor).toString();
    }
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
    return Array(4).fill(0).map((_, index) => (
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-white">Produtos</h1>
        <div className="flex items-center gap-2">
          <button
            className={`p-1.5 rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors ${isRefreshing ? 'animate-spin text-primary-400' : ''}`}
            onClick={() => {
              if (!isRefreshing) {
                console.log('Atualizando manualmente...');
                // Limpar todos os estados para forçar um recarregamento completo
                setGrupos([]);
                setProdutosFotos({});
                setProdutosFotosCount({});
                setProdutosEstoque({});

                // Carregar dados novamente
                loadGrupos();
                loadProdutosEstoque();

                // Depois testamos a conexão Realtime
                setTimeout(() => {
                  testRealtimeConnection();
                }, 1000);
              }
            }}
            disabled={isRefreshing}
            title="Atualizar dados"
          >
            <RefreshCw size={16} />
          </button>
          <div className="text-xs text-gray-400">
            Atualizado: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
      </div>

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
          <div className="flex overflow-x-auto pb-2 custom-scrollbar">
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
              {/* Abas de filtros e grupos */}
              <div className="flex overflow-x-auto pb-2 custom-scrollbar">
                {/* Filtro Todos */}
                <button
                  className={`px-4 py-1 rounded-full mr-2 flex-shrink-0 transition-colors ${
                    activeFilter === 'todos'
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                  onClick={() => {
                    setActiveFilter('todos');
                  }}
                >
                  Todos
                </button>

                {/* Filtro Promoção */}
                <button
                  className={`px-4 py-1 rounded-full mr-2 flex-shrink-0 transition-colors ${
                    activeFilter === 'promocao'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                  onClick={() => {
                    setActiveFilter('promocao');
                  }}
                >
                  Promoção
                </button>

                {/* Separador */}
                <div className="h-6 border-l border-gray-700 mx-1 my-auto"></div>

                {/* Abas de grupos */}
                {filteredGrupos.map((grupo) => (
                  <button
                    key={grupo.id}
                    className={`px-4 py-1 rounded-full mr-2 flex-shrink-0 transition-colors ${
                      activeFilter === 'grupo' && activeGrupo === grupo.id
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                    onClick={() => {
                      setActiveFilter('grupo');
                      setActiveGrupo(grupo.id);
                    }}
                  >
                    {grupo.nome}
                  </button>
                ))}
              </div>

              {/* Cards de produtos */}
              <div className="grid grid-cols-2 gap-4">
                {filteredGrupos
                  .flatMap(grupo => {
                    // Se o filtro for por grupo, mostrar apenas produtos do grupo selecionado
                    if (activeFilter === 'grupo') {
                      return grupo.id === activeGrupo ? grupo.produtos : [];
                    }
                    // Se o filtro for por promoção, mostrar apenas produtos em promoção
                    else if (activeFilter === 'promocao') {
                      return grupo.produtos.filter(produto => produto.promocao);
                    }
                    // Se o filtro for "todos", mostrar todos os produtos
                    return grupo.produtos;
                  })
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

                        {/* Contador de fotos */}
                        {produtosFotosCount[produto.id] > 0 && (
                          <div className="absolute top-2 right-2 bg-background-dark px-2 py-1 rounded-full text-xs font-medium text-white">
                            {produtosFotosCount[produto.id]} {produtosFotosCount[produto.id] === 1 ? 'foto' : 'fotos'}
                          </div>
                        )}

                        {/* Badges de status */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          {produto.promocao && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-green-600 text-white rounded-full">
                              Promoção
                            </span>
                          )}
                          {produto.desconto_quantidade && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-blue-600 text-white rounded-full">
                              Desconto {produto.quantidade_minima}+ unid.
                            </span>
                          )}
                        </div>

                        {/* Preço */}
                        <div className="absolute bottom-0 right-0 bg-background-dark px-2 py-1 text-sm font-medium">
                          {produto.promocao && produto.tipo_desconto && produto.valor_desconto !== undefined ? (
                            <div className="flex flex-col items-end">
                              <span className="text-gray-400 line-through text-xs">
                                {formatCurrency(produto.preco)}
                              </span>
                              <span className="text-green-400">
                                {formatCurrency(calcularValorFinal(produto.preco, produto.tipo_desconto, produto.valor_desconto))}
                              </span>
                            </div>
                          ) : (
                            <span className="text-primary-400">
                              {formatCurrency(produto.preco)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Informações do produto */}
                      <div className="p-3">
                        <h3 className="text-white font-medium line-clamp-1">{produto.nome}</h3>

                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          <div className="flex items-center gap-1 text-gray-400 text-xs">
                            <Tag size={12} />
                            <span>#{produto.codigo}</span>
                          </div>

                          {produto.unidade_medida && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-primary-700 text-white rounded-full">
                              {produto.unidade_medida.sigla} - {produto.unidade_medida.nome}
                            </span>
                          )}
                        </div>

                        {/* Informações de desconto */}
                        {produto.promocao && produto.tipo_desconto && produto.valor_desconto !== undefined && (
                          <div className="mt-1 text-xs font-medium px-2 py-0.5 bg-green-600 text-white rounded-full inline-block">
                            {produto.tipo_desconto === 'percentual'
                              ? `${produto.valor_desconto}% OFF`
                              : `- ${formatCurrency(produto.valor_desconto)}`}
                          </div>
                        )}

                        {/* Informações de estoque */}
                        {produtosEstoque[produto.id] && (
                          <div className="flex flex-wrap items-center gap-1 mt-2">
                            <span className="px-2 py-0.5 text-xs font-medium bg-gray-700 text-gray-300 rounded-full">
                              Estoque: {formatarEstoque(produtosEstoque[produto.id].total, produto)}
                            </span>
                            {produtosEstoque[produto.id].naoFaturado > 0 && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-yellow-900/30 text-yellow-400 rounded-full">
                                Não Faturado: {formatarEstoque(produtosEstoque[produto.id].naoFaturado, produto)}
                              </span>
                            )}
                          </div>
                        )}

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
