import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  DollarSign,
  Calculator,
  Receipt,
  User,
  Package,
  Grid3X3,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  TrendingDown,
  TrendingUp,
  Clock,
  UserCheck,
  QrCode,
  Percent
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';
import { useAuthSession } from '../../hooks/useAuthSession';
import { formatarPreco } from '../../utils/formatters';

interface Produto {
  id: string;
  nome: string;
  preco: number;
  codigo: string;
  codigo_barras?: string;
  descricao?: string;
  promocao: boolean;
  tipo_desconto?: string;
  valor_desconto?: number;
  desconto_quantidade: boolean;
  quantidade_minima?: number;
  tipo_desconto_quantidade?: string;
  valor_desconto_quantidade?: number;
  percentual_desconto_quantidade?: number;
  unidade_medida_id?: string;
  grupo_id: string;
  estoque_inicial?: number;
  grupo?: {
    nome: string;
  };
  unidade_medida?: {
    id: string;
    sigla: string;
    nome: string;
  };
  produto_fotos?: {
    url: string;
    principal: boolean;
  }[];
}

interface Grupo {
  id: string;
  nome: string;
}

interface ItemCarrinho {
  id: string; // Identificador único para cada item
  produto: Produto;
  quantidade: number;
  subtotal: number;
  desconto?: {
    tipo: 'percentual' | 'valor';
    valor: number;
    valorDesconto: number;
    precoOriginal: number;
    precoComDesconto: number;
  };
}

interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
}

interface EstoqueProduto {
  total: number;
  naoFaturado: number;
}

const PDVPage: React.FC = () => {
  const { withSessionCheck } = useAuthSession();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [grupoSelecionado, setGrupoSelecionado] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemParaRemover, setItemParaRemover] = useState<string | null>(null);
  const [showLimparCarrinhoModal, setShowLimparCarrinhoModal] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [showGaleriaModal, setShowGaleriaModal] = useState(false);
  const [produtoSelecionadoGaleria, setProdutoSelecionadoGaleria] = useState<Produto | null>(null);
  const [fotoAtualIndex, setFotoAtualIndex] = useState(0);
  const [produtosEstoque, setProdutosEstoque] = useState<Record<string, EstoqueProduto>>({});
  const [pdvConfig, setPdvConfig] = useState<any>(null);

  // Estados para os modais do menu PDV
  const [showComandasModal, setShowComandasModal] = useState(false);
  const [showSangriaModal, setShowSangriaModal] = useState(false);
  const [showSuprimentoModal, setShowSuprimentoModal] = useState(false);
  const [showPagamentosModal, setShowPagamentosModal] = useState(false);
  const [showFiadosModal, setShowFiadosModal] = useState(false);

  // Estados para os modais do menu PDV (paginação removida)

  // Estados para modal de desconto
  const [showDescontoModal, setShowDescontoModal] = useState(false);
  const [itemParaDesconto, setItemParaDesconto] = useState<string | null>(null);
  const [tipoDesconto, setTipoDesconto] = useState<'percentual' | 'valor'>('percentual');
  const [valorDesconto, setValorDesconto] = useState('');
  const [novoValor, setNovoValor] = useState(0);

  // Estados para finalização de venda
  const [showFinalizacaoVenda, setShowFinalizacaoVenda] = useState(false);
  const [tipoPagamento, setTipoPagamento] = useState<'vista' | 'parcial'>('vista');
  const [formasPagamento, setFormasPagamento] = useState<any[]>([]);
  const [formaPagamentoSelecionada, setFormaPagamentoSelecionada] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Calcular novo valor em tempo real no modal de desconto
  useEffect(() => {
    if (itemParaDesconto && valorDesconto) {
      const item = carrinho.find(i => i.id === itemParaDesconto);
      if (item) {
        const valor = parseFloat(valorDesconto.replace(',', '.'));
        if (!isNaN(valor) && valor >= 0) {
          const novoPreco = calcularNovoValor(item, tipoDesconto, valor);
          setNovoValor(novoPreco);
        }
      }
    } else {
      setNovoValor(0);
    }
  }, [itemParaDesconto, valorDesconto, tipoDesconto, carrinho]);



  // Definir itens do menu PDV
  const menuPDVItems = [
    {
      id: 'comandas',
      icon: FileText,
      label: 'Comandas',
      color: 'primary',
      onClick: () => setShowComandasModal(true)
    },
    {
      id: 'sangria',
      icon: TrendingDown,
      label: 'Sangria',
      color: 'red',
      onClick: () => setShowSangriaModal(true)
    },
    {
      id: 'suprimento',
      icon: TrendingUp,
      label: 'Suprimento',
      color: 'green',
      onClick: () => setShowSuprimentoModal(true)
    },
    {
      id: 'pagamentos',
      icon: CreditCard,
      label: 'Pagamentos',
      color: 'blue',
      onClick: () => setShowPagamentosModal(true)
    },
    {
      id: 'fiados',
      icon: Clock,
      label: 'Fiados',
      color: 'yellow',
      onClick: () => setShowFiadosModal(true)
    }
  ];



  // Função para obter classes de cor
  const getColorClasses = (color: string) => {
    const colorMap = {
      primary: 'hover:text-primary-400 hover:bg-primary-500/10',
      red: 'hover:text-red-400 hover:bg-red-500/10',
      green: 'hover:text-green-400 hover:bg-green-500/10',
      blue: 'hover:text-blue-400 hover:bg-blue-500/10',
      yellow: 'hover:text-yellow-400 hover:bg-yellow-500/10'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.primary;
  };

  // Atualizar data e hora a cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Estado para captura automática de código de barras
  const [codigoBarrasBuffer, setCodigoBarrasBuffer] = useState('');
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Listener global para captura de código de barras
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Só funciona se a configuração estiver habilitada
      if (!pdvConfig?.venda_codigo_barras) return;

      // Ignorar se estiver digitando em um input, textarea ou elemento editável
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true' ||
        target.closest('[contenteditable="true"]')
      ) {
        return;
      }

      // Só capturar números
      if (!/^\d$/.test(event.key)) {
        // Se pressionar Enter e tiver código no buffer, processar
        if (event.key === 'Enter' && codigoBarrasBuffer.length > 0) {
          processarCodigoBarras(codigoBarrasBuffer);
          setCodigoBarrasBuffer('');
          if (timeoutId) {
            clearTimeout(timeoutId);
            setTimeoutId(null);
          }
        }
        return;
      }

      // Adicionar número ao buffer
      const novoBuffer = codigoBarrasBuffer + event.key;
      setCodigoBarrasBuffer(novoBuffer);

      // Limpar timeout anterior
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Definir novo timeout para limpar o buffer após 2 segundos
      const novoTimeoutId = setTimeout(() => {
        setCodigoBarrasBuffer('');
        setTimeoutId(null);
      }, 2000);

      setTimeoutId(novoTimeoutId);

      // Prevenir comportamento padrão
      event.preventDefault();
    };

    // Adicionar listener apenas se a configuração estiver habilitada
    if (pdvConfig?.venda_codigo_barras) {
      document.addEventListener('keydown', handleKeyPress);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [pdvConfig?.venda_codigo_barras, codigoBarrasBuffer, timeoutId]);

  // Função para processar código de barras capturado
  const processarCodigoBarras = (codigo: string) => {
    // Buscar produto pelo código de barras
    const produto = produtos.find(p => p.codigo_barras === codigo);

    if (produto) {
      adicionarAoCarrinho(produto);
      toast.success(`${produto.nome} adicionado ao carrinho!`);
    } else {
      // Se não encontrou por código de barras, tentar por código normal
      const produtoPorCodigo = produtos.find(p => p.codigo === codigo);
      if (produtoPorCodigo) {
        adicionarAoCarrinho(produtoPorCodigo);
        toast.success(`${produtoPorCodigo.nome} adicionado ao carrinho!`);
      } else {
        toast.error(`Produto não encontrado para o código: ${codigo}`);
      }
    }
  };

  const loadData = async () => {
    await withSessionCheck(async () => {
      try {
        setIsLoading(true);
        await Promise.all([
          loadProdutos(),
          loadGrupos(),
          loadClientes(),
          loadEstoque(),
          loadPdvConfig(),
          loadFormasPagamento()
        ]);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar dados do PDV');
      } finally {
        setIsLoading(false);
      }
    });
  };

  const loadProdutos = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', userData.user.id)
      .single();

    if (!usuarioData?.empresa_id) return;

    const { data, error } = await supabase
      .from('produtos')
      .select(`
        id,
        nome,
        preco,
        codigo,
        descricao,
        promocao,
        tipo_desconto,
        valor_desconto,
        desconto_quantidade,
        quantidade_minima,
        tipo_desconto_quantidade,
        valor_desconto_quantidade,
        percentual_desconto_quantidade,
        unidade_medida_id,
        grupo_id,
        estoque_inicial,
        grupo:grupos(nome),
        unidade_medida:unidade_medida_id (
          id,
          sigla,
          nome
        ),
        produto_fotos(url, principal)
      `)
      .eq('empresa_id', usuarioData.empresa_id)
      .eq('ativo', true)
      .eq('deletado', false)
      .order('nome');

    if (error) throw error;
    setProdutos(data || []);
  };

  const loadGrupos = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', userData.user.id)
      .single();

    if (!usuarioData?.empresa_id) return;

    const { data, error } = await supabase
      .from('grupos')
      .select('*')
      .eq('empresa_id', usuarioData.empresa_id)
      .order('nome');

    if (error) throw error;
    setGrupos(data || []);
  };

  const loadClientes = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', userData.user.id)
      .single();

    if (!usuarioData?.empresa_id) return;

    const { data, error } = await supabase
      .from('clientes')
      .select('id, nome, telefone')
      .eq('empresa_id', usuarioData.empresa_id)
      .order('nome')
      .limit(50);

    if (error) throw error;
    setClientes(data || []);
  };

  const loadEstoque = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', userData.user.id)
      .single();

    if (!usuarioData?.empresa_id) return;

    try {
      // Buscar estoque dos produtos
      const { data: estoqueData, error } = await supabase
        .from('produto_estoque')
        .select('produto_id, quantidade, tipo')
        .eq('empresa_id', usuarioData.empresa_id);

      if (error) {
        console.error('Erro ao carregar estoque:', error);
        return;
      }

      // Processar dados de estoque
      const estoqueProcessado: Record<string, EstoqueProduto> = {};

      if (estoqueData) {
        estoqueData.forEach((item: any) => {
          if (!estoqueProcessado[item.produto_id]) {
            estoqueProcessado[item.produto_id] = { total: 0, naoFaturado: 0 };
          }

          if (item.tipo === 'entrada') {
            estoqueProcessado[item.produto_id].total += item.quantidade;
          } else if (item.tipo === 'saida') {
            estoqueProcessado[item.produto_id].total -= item.quantidade;
          }
        });
      }

      console.log('Estoque carregado:', estoqueProcessado);
      setProdutosEstoque(estoqueProcessado);
    } catch (error) {
      console.error('Erro ao processar estoque:', error);
    }
  };

  const loadPdvConfig = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', userData.user.id)
      .single();

    if (!usuarioData?.empresa_id) return;

    const { data, error } = await supabase
      .from('pdv_config')
      .select('*')
      .eq('empresa_id', usuarioData.empresa_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao carregar configurações do PDV:', error);
      return;
    }

    // Se não encontrou configuração, usar valores padrão
    if (!data) {
      setPdvConfig({
        seleciona_clientes: false,
        comandas: false,
        mesas: false,
        vendedor: false,
        exibe_foto_item: false,
        controla_caixa: false,
        agrupa_itens: false,
        delivery: false,
        cardapio_digital: false,
        delivery_chat_ia: false,
        baixa_estoque_pdv: false,
        venda_codigo_barras: false
      });
    } else {
      setPdvConfig(data);
    }
  };

  const loadFormasPagamento = async () => {
    try {
      const { data, error } = await supabase
        .from('formas_pag_pdv')
        .select('*')
        .eq('ativo', true)
        .order('ordem');

      if (error) throw error;
      setFormasPagamento(data || []);

      // Selecionar a primeira forma de pagamento como padrão
      if (data && data.length > 0) {
        setFormaPagamentoSelecionada(data[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar formas de pagamento:', error);
    }
  };

  const produtosFiltrados = produtos.filter(produto => {
    // Extrair o termo de busca (removendo a quantidade se houver)
    let termoBusca = searchTerm;
    if (searchTerm.includes('*')) {
      const partes = searchTerm.split('*');
      if (partes.length >= 2) {
        termoBusca = partes.slice(1).join('*').trim(); // Pega tudo após o primeiro *
      }
    }

    const matchesSearch = produto.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
                         produto.codigo.toLowerCase().includes(termoBusca.toLowerCase()) ||
                         (produto.codigo_barras && produto.codigo_barras.toLowerCase().includes(termoBusca.toLowerCase()));
    const matchesGrupo = grupoSelecionado === 'todos' || produto.grupo_id === grupoSelecionado;
    return matchesSearch && matchesGrupo;
  });

  const adicionarAoCarrinho = (produto: Produto, quantidadePersonalizada?: number) => {
    // Verificar se há quantidade especificada na busca (formato: quantidade*termo)
    let quantidadeParaAdicionar = quantidadePersonalizada || 1;

    if (!quantidadePersonalizada && searchTerm.includes('*')) {
      const [qtdStr] = searchTerm.split('*');
      const qtdParsed = parseInt(qtdStr.trim());
      if (!isNaN(qtdParsed) && qtdParsed > 0) {
        quantidadeParaAdicionar = qtdParsed;
        // Limpar o campo de busca após adicionar
        setSearchTerm('');
      }
    }

    // Calcular o preço final considerando promoções
    const precoFinal = calcularPrecoFinal(produto);

    setCarrinho(prev => {
      // Verificar se deve agrupar itens baseado na configuração
      const deveAgrupar = pdvConfig?.agrupa_itens === true;

      if (deveAgrupar) {
        // Comportamento original: agrupa itens idênticos
        const itemExistente = prev.find(item => item.produto.id === produto.id);

        if (itemExistente) {
          return prev.map(item =>
            item.produto.id === produto.id
              ? {
                  ...item,
                  quantidade: item.quantidade + quantidadeParaAdicionar,
                  subtotal: (item.quantidade + quantidadeParaAdicionar) * precoFinal
                }
              : item
          );
        } else {
          return [...prev, {
            id: `${produto.id}-${Date.now()}`, // ID único
            produto,
            quantidade: quantidadeParaAdicionar,
            subtotal: precoFinal * quantidadeParaAdicionar
          }];
        }
      } else {
        // Comportamento novo: sempre adiciona como item separado
        return [...prev, {
          id: `${produto.id}-${Date.now()}-${Math.random()}`, // ID único
          produto,
          quantidade: quantidadeParaAdicionar,
          subtotal: precoFinal * quantidadeParaAdicionar
        }];
      }
    });
  };

  const confirmarRemocao = (itemId: string) => {
    setItemParaRemover(itemId);
    setShowConfirmModal(true);
  };

  const cancelarRemocao = () => {
    setShowConfirmModal(false);
    setItemParaRemover(null);
  };

  const removerDoCarrinho = (itemId: string) => {
    // Encontrar o item antes de remover para mostrar no toast
    const itemRemovido = carrinho.find(item => item.id === itemId);

    setCarrinho(prev => prev.filter(item => item.id !== itemId));
    setShowConfirmModal(false);
    setItemParaRemover(null);

    // Exibir toast de confirmação
    if (itemRemovido) {
      toast.success(`${itemRemovido.produto.nome} removido com sucesso!`);
    }
  };

  const alterarQuantidade = (itemId: string, novaQuantidade: number) => {
    if (novaQuantidade <= 0) {
      confirmarRemocao(itemId);
      return;
    }

    setCarrinho(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          // Usar o preço com desconto aplicado pelo usuário, ou o preço final do produto (considerando promoções)
          const precoUnitario = item.desconto ? item.desconto.precoComDesconto : calcularPrecoFinal(item.produto);
          return {
            ...item,
            quantidade: novaQuantidade,
            subtotal: novaQuantidade * precoUnitario
          };
        }
        return item;
      })
    );
  };

  // Funções para gerenciar desconto
  const abrirModalDesconto = (itemId: string) => {
    setItemParaDesconto(itemId);
    setTipoDesconto('percentual');
    setValorDesconto('');
    setNovoValor(0);
    setShowDescontoModal(true);
  };

  const calcularNovoValor = (item: ItemCarrinho, tipo: 'percentual' | 'valor', valor: number) => {
    // Usar o preço final do produto (considerando promoções) como base para o desconto
    const precoBase = calcularPrecoFinal(item.produto);

    if (tipo === 'percentual') {
      const desconto = (precoBase * valor) / 100;
      return Math.max(0, precoBase - desconto);
    } else {
      return Math.max(0, precoBase - valor);
    }
  };

  const aplicarDesconto = () => {
    if (!itemParaDesconto || !valorDesconto) return;

    const valor = parseFloat(valorDesconto.replace(',', '.'));
    if (isNaN(valor) || valor < 0) {
      toast.error('Valor de desconto inválido');
      return;
    }

    setCarrinho(prev =>
      prev.map(item => {
        if (item.id === itemParaDesconto) {
          // Usar o preço final do produto (considerando promoções) como base
          const precoBase = calcularPrecoFinal(item.produto);
          const precoComDesconto = calcularNovoValor(item, tipoDesconto, valor);

          if (tipoDesconto === 'percentual' && valor > 100) {
            toast.error('Desconto não pode ser maior que 100%');
            return item;
          }

          if (tipoDesconto === 'valor' && valor > precoBase) {
            toast.error('Desconto não pode ser maior que o preço do produto');
            return item;
          }

          const valorDesconto = precoBase - precoComDesconto;

          return {
            ...item,
            desconto: {
              tipo: tipoDesconto,
              valor,
              valorDesconto,
              precoOriginal: precoBase, // Usar o preço final como "original" para o desconto
              precoComDesconto
            },
            subtotal: item.quantidade * precoComDesconto
          };
        }
        return item;
      })
    );

    setShowDescontoModal(false);
    setItemParaDesconto(null);
    setValorDesconto('');
    toast.success('Desconto aplicado com sucesso!');
  };

  const removerDesconto = (itemId: string) => {
    setCarrinho(prev =>
      prev.map(item => {
        if (item.id === itemId && item.desconto) {
          // Voltar ao preço final do produto (considerando promoções)
          const precoFinal = calcularPrecoFinal(item.produto);
          return {
            ...item,
            desconto: undefined,
            subtotal: item.quantidade * precoFinal
          };
        }
        return item;
      })
    );
    toast.success('Desconto removido com sucesso!');
  };

  const calcularTotal = () => {
    return carrinho.reduce((total, item) => total + item.subtotal, 0);
  };

  const formatCurrency = (value: number) => {
    return formatarPreco(value);
  };

  const formatCurrencyWithoutSymbol = (value: number) => {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDateTime = (date: Date) => {
    const diasSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    const diaSemana = diasSemana[date.getDay()];

    const dia = date.getDate().toString().padStart(2, '0');
    const mes = (date.getMonth() + 1).toString().padStart(2, '0');
    const ano = date.getFullYear().toString().slice(-2);

    const horas = date.getHours().toString().padStart(2, '0');
    const minutos = date.getMinutes().toString().padStart(2, '0');
    const segundos = date.getSeconds().toString().padStart(2, '0');

    return `${diaSemana}, ${dia}/${mes}/${ano} ${horas}:${minutos}:${segundos}`;
  };

  const formatarEstoque = (quantidade: number, produto: Produto) => {
    if (produto.unidade_medida?.sigla === 'KG') {
      return quantidade.toFixed(3).replace('.', ',');
    }
    return quantidade.toString();
  };

  const calcularPrecoFinal = (produto: Produto) => {
    if (!produto.promocao || !produto.valor_desconto) return produto.preco;

    if (produto.tipo_desconto === 'percentual') {
      return produto.preco * (1 - produto.valor_desconto / 100);
    } else {
      return produto.preco - produto.valor_desconto;
    }
  };

  const getFotoPrincipal = (produto: Produto) => {
    if (!produto.produto_fotos || produto.produto_fotos.length === 0) return null;
    const fotoPrincipal = produto.produto_fotos.find(foto => foto.principal);
    return fotoPrincipal || produto.produto_fotos[0];
  };

  const abrirGaleria = (produto: Produto, event: React.MouseEvent) => {
    event.stopPropagation(); // Impede que o produto seja adicionado ao carrinho
    if (produto.produto_fotos && produto.produto_fotos.length > 0) {
      // Encontrar o índice da foto principal
      const fotoPrincipalIndex = produto.produto_fotos.findIndex(foto => foto.principal);
      const indexInicial = fotoPrincipalIndex !== -1 ? fotoPrincipalIndex : 0;

      setProdutoSelecionadoGaleria(produto);
      setFotoAtualIndex(indexInicial);
      setShowGaleriaModal(true);
    }
  };

  const proximaFoto = () => {
    if (produtoSelecionadoGaleria?.produto_fotos) {
      setFotoAtualIndex(prev =>
        prev < produtoSelecionadoGaleria.produto_fotos.length - 1 ? prev + 1 : 0
      );
    }
  };

  const fotoAnterior = () => {
    if (produtoSelecionadoGaleria?.produto_fotos) {
      setFotoAtualIndex(prev =>
        prev > 0 ? prev - 1 : produtoSelecionadoGaleria.produto_fotos.length - 1
      );
    }
  };

  const fecharGaleria = () => {
    setShowGaleriaModal(false);
    setProdutoSelecionadoGaleria(null);
    setFotoAtualIndex(0);
  };

  const confirmarLimparCarrinho = () => {
    if (carrinho.length === 0) {
      return;
    }
    setShowLimparCarrinhoModal(true);
  };

  const limparCarrinho = () => {
    // Contar itens antes de limpar
    const totalItens = carrinho.reduce((total, item) => total + item.quantidade, 0);
    const totalProdutos = carrinho.length;
    const primeiroProduto = carrinho[0]?.produto.nome; // Salvar antes de limpar

    setCarrinho([]);
    setClienteSelecionado(null);
    setShowLimparCarrinhoModal(false);

    // Exibir toast de confirmação
    if (totalProdutos > 0) {
      if (totalProdutos === 1) {
        toast.success(`${primeiroProduto} removido com sucesso!`);
      } else {
        toast.success(`${totalProdutos} produtos removidos com sucesso! (${totalItens} itens)`);
      }
    }
  };

  const finalizarVenda = () => {
    if (carrinho.length === 0) {
      toast.warning('Adicione produtos ao carrinho antes de finalizar a venda');
      return;
    }
    setShowFinalizacaoVenda(true);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      // Se há produtos filtrados, adicionar o primeiro
      if (produtosFiltrados.length > 0) {
        adicionarAoCarrinho(produtosFiltrados[0]);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div
      className={`${showFinalizacaoVenda ? 'bg-background-card' : 'bg-background-dark'} overflow-hidden`}
      style={{ margin: '-24px', height: 'calc(100vh + 48px)' }}
    >
      {/* Header */}
      <div className="bg-background-card border-b border-gray-800 h-16 flex items-center justify-between px-4">
        <div></div> {/* Espaço vazio à esquerda */}
        <div className="text-5xl font-bold text-primary-400">
          {formatCurrencyWithoutSymbol(calcularTotal())}
        </div>
        <div className="text-sm text-gray-400 font-mono">
          {formatDateTime(currentDateTime)}
        </div>
      </div>

      <div
        className={`flex overflow-hidden ${showFinalizacaoVenda ? 'bg-background-card' : ''}`}
        style={{ height: 'calc(100vh - 64px)' }}
      >
        {/* Área Principal - Produtos */}
        <motion.div
          initial={false}
          animate={{
            width: showFinalizacaoVenda ? 0 : 'auto',
            opacity: showFinalizacaoVenda ? 0 : 1,
            x: showFinalizacaoVenda ? -100 : 0
          }}
          transition={{
            duration: showFinalizacaoVenda ? 0.6 : 0.4,
            ease: [0.25, 0.46, 0.45, 0.94],
            width: {
              duration: showFinalizacaoVenda ? 0.6 : 0.4,
              ease: [0.25, 0.46, 0.45, 0.94]
            },
            opacity: {
              duration: showFinalizacaoVenda ? 0.4 : 0.3,
              delay: showFinalizacaoVenda ? 0 : 0.1,
              ease: [0.25, 0.46, 0.45, 0.94]
            },
            x: {
              duration: showFinalizacaoVenda ? 0.6 : 0.4,
              ease: [0.25, 0.46, 0.45, 0.94]
            }
          }}
          className={`p-4 flex flex-col h-full relative overflow-hidden ${
            showFinalizacaoVenda ? 'pointer-events-none' : 'flex-1'
          }`}
          style={{
            minWidth: showFinalizacaoVenda ? 0 : 'auto'
          }}
        >
          <motion.div
            initial={false}
            animate={{
              opacity: showFinalizacaoVenda ? 0 : 1,
              scale: showFinalizacaoVenda ? 0.95 : 1
            }}
            transition={{
              duration: 0.5,
              ease: [0.25, 0.46, 0.45, 0.94],
              opacity: {
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94]
              },
              scale: {
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94]
              }
            }}
            className="h-full flex flex-col"
          >
            {/* Barra de Busca */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Produto"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchKeyPress}
                  autoFocus
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                />
                <QrCode size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

                {/* Indicador de quantidade */}
                {searchTerm.includes('*') && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="bg-primary-500 text-white text-xs px-2 py-1 rounded-full">
                      Qtd: {searchTerm.split('*')[0]}
                    </div>
                  </div>
                )}

                {/* Indicador de código de barras buffer */}
                {pdvConfig?.venda_codigo_barras && codigoBarrasBuffer && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                      Código: {codigoBarrasBuffer}
                    </div>
                  </div>
                )}
              </div>

              {/* Indicador de captura automática ativa */}
              {pdvConfig?.venda_codigo_barras && (
                <div className="mt-2 flex items-center gap-2 text-xs text-green-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  Captura automática de código de barras ativa - Digite números para adicionar produtos
                </div>
              )}
            </div>

            {/* Filtros por Categoria */}
            {grupos.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setGrupoSelecionado('todos')}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      grupoSelecionado === 'todos'
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                    }`}
                  >
                    Todos
                  </button>
                  {grupos.map(grupo => (
                    <button
                      key={grupo.id}
                      onClick={() => setGrupoSelecionado(grupo.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        grupoSelecionado === grupo.id
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                      }`}
                    >
                      {grupo.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Grid de Produtos */}
            <div
              className="flex-1 overflow-y-auto custom-scrollbar"
              style={{ paddingBottom: showFinalizacaoVenda ? '0px' : '60px' }}
            >
              {produtosFiltrados.length === 0 ? (
                <div className="text-center py-8">
                  <Package size={48} className="mx-auto mb-4 text-gray-500" />
                  <p className="text-gray-400">Nenhum produto encontrado</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {produtosFiltrados.map(produto => (
                    <motion.div
                      key={produto.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => adicionarAoCarrinho(produto)}
                      className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer flex flex-col"
                    >
                      {/* Imagem do produto */}
                      <div
                        className="h-32 bg-gray-900 relative cursor-pointer"
                        onClick={(e) => abrirGaleria(produto, e)}
                      >
                        {getFotoPrincipal(produto) ? (
                          <img
                            src={getFotoPrincipal(produto)!.url}
                            alt={produto.nome}
                            className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package size={24} className="text-gray-700" />
                          </div>
                        )}

                        {/* Indicador de múltiplas fotos */}
                        {produto.produto_fotos && produto.produto_fotos.length > 1 && (
                          <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                            {produto.produto_fotos.length} fotos
                          </div>
                        )}

                        {/* Badge de promoção */}
                        {produto.promocao && (
                          <div className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold px-1 py-0.5 rounded">
                            {produto.tipo_desconto === 'percentual'
                              ? `-${produto.valor_desconto}%`
                              : formatCurrency(produto.valor_desconto || 0)}
                          </div>
                        )}
                      </div>

                      {/* Informações do produto */}
                      <div className="p-3">
                        <h3 className="text-white text-sm font-medium line-clamp-2 mb-2">{produto.nome}</h3>

                        <div className="mb-2">
                          <p className="text-gray-400 text-xs">Código {produto.codigo}</p>
                        </div>

                        {/* Preço */}
                        <div className="mb-2">
                          {produto.promocao ? (
                            <div>
                              <span className="text-gray-400 line-through text-xs block">
                                {formatCurrency(produto.preco)}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-primary-400 font-bold text-lg">
                                  {formatCurrency(calcularPrecoFinal(produto))}
                                </span>
                                {produto.unidade_medida && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
                                    {produto.unidade_medida.sigla}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-primary-400 font-bold text-lg">
                                {formatCurrency(produto.preco)}
                              </span>
                              {produto.unidade_medida && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
                                  {produto.unidade_medida.sigla}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Estoque */}
                        <div className="text-xs text-gray-300 mb-1">
                          Estoque: {
                            produtosEstoque[produto.id]
                              ? formatarEstoque(produtosEstoque[produto.id].total, produto)
                              : produto.estoque_inicial
                                ? formatarEstoque(produto.estoque_inicial, produto)
                                : '0'
                          }
                        </div>

                        {/* Desconto por quantidade */}
                        {produto.desconto_quantidade && produto.quantidade_minima &&
                         ((produto.tipo_desconto_quantidade === 'percentual' && produto.percentual_desconto_quantidade) ||
                          (produto.tipo_desconto_quantidade === 'valor' && produto.valor_desconto_quantidade)) && (
                          <div className="text-xs text-green-400">
                            {produto.quantidade_minima}+ unid:
                            {produto.tipo_desconto_quantidade === 'percentual'
                              ? ` -${produto.percentual_desconto_quantidade}%`
                              : ` -${formatCurrency(produto.valor_desconto_quantidade || 0)}`}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Menu Fixo no Footer da Área de Produtos - Só aparece quando NÃO está na finalização */}
            {!showFinalizacaoVenda && (
              <div className="absolute bottom-0 left-0 right-0 bg-background-card border-t border-gray-800 z-40">
                <div className="h-14 px-4 py-2 overflow-hidden">
                  {/* Itens do Menu com Scroll Horizontal */}
                  <div className="flex items-center h-full overflow-x-auto overflow-y-hidden custom-scrollbar gap-2 justify-around min-w-0">
                    {menuPDVItems.map((item) => {
                      const IconComponent = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={item.onClick}
                          className={`flex flex-col items-center justify-center text-gray-400 ${getColorClasses(item.color)} rounded-lg p-1 transition-all duration-200 min-w-[70px] flex-shrink-0`}
                        >
                          <IconComponent size={18} />
                          <span className="text-xs mt-0.5 whitespace-nowrap">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* Carrinho de Compras */}
        <motion.div
          initial={false}
          animate={{
            width: showFinalizacaoVenda ? 'auto' : 384,
            flex: showFinalizacaoVenda ? 1 : 'none'
          }}
          transition={{
            duration: showFinalizacaoVenda ? 0.6 : 0.4,
            ease: [0.25, 0.46, 0.45, 0.94],
            width: {
              duration: showFinalizacaoVenda ? 0.6 : 0.4,
              ease: [0.25, 0.46, 0.45, 0.94]
            },
            flex: {
              duration: showFinalizacaoVenda ? 0.6 : 0.4,
              ease: [0.25, 0.46, 0.45, 0.94]
            }
          }}
          className={`bg-background-card p-4 flex flex-col h-full ${
            showFinalizacaoVenda ? 'border-0' : 'border-l border-gray-800'
          }`}
        >
          <motion.div
            initial={false}
            animate={{
              x: showFinalizacaoVenda ? -20 : 0,
              scale: showFinalizacaoVenda ? 1.02 : 1
            }}
            transition={{
              duration: 0.6,
              ease: [0.25, 0.46, 0.45, 0.94],
              x: {
                duration: 0.6,
                ease: [0.25, 0.46, 0.45, 0.94]
              },
              scale: {
                duration: 0.6,
                ease: [0.25, 0.46, 0.45, 0.94]
              }
            }}
            className="h-full flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <ShoppingCart size={20} />
                Carrinho ({carrinho.reduce((total, item) => total + item.quantidade, 0)})
              </h3>
              {carrinho.length > 0 && (
                <button
                  onClick={confirmarLimparCarrinho}
                  className="text-red-400 hover:text-red-300 transition-colors"
                  title="Limpar carrinho"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            {/* Cliente Selecionado - Só aparece se a configuração estiver habilitada */}
            {pdvConfig?.seleciona_clientes && (
              <div className="mb-4">
                <button
                  onClick={() => setShowClienteModal(true)}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-left hover:border-primary-500/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-400">Cliente</div>
                      <div className="text-white">
                        {clienteSelecionado ? clienteSelecionado.nome : 'Selecionar cliente'}
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* Lista de Itens do Carrinho */}
            <div
              className="flex-1 overflow-y-auto custom-scrollbar mb-4"
              style={{
                maxHeight: showFinalizacaoVenda ? 'calc(100vh - 200px)' : 'calc(100vh - 280px)'
              }}
            >
              {carrinho.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <ShoppingCart size={48} className="mx-auto mb-2 opacity-50" />
                  <p>Carrinho vazio</p>
                  <p className="text-sm">Clique nos produtos para adicionar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {carrinho.map(item => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="bg-gray-800/50 rounded-lg p-3"
                    >
                      <div className="flex gap-3">
                        {/* Foto do Produto */}
                        <div
                          className="w-16 h-16 bg-gray-900 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity relative"
                          onClick={(e) => abrirGaleria(item.produto, e)}
                        >
                          {getFotoPrincipal(item.produto) ? (
                            <img
                              src={getFotoPrincipal(item.produto)!.url}
                              alt={item.produto.nome}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package size={20} className="text-gray-700" />
                            </div>
                          )}

                          {/* Indicador de múltiplas fotos */}
                          {item.produto.produto_fotos && item.produto.produto_fotos.length > 1 && (
                            <div className="absolute bottom-1 right-1">
                              <div className="bg-black/60 text-white text-xs px-1 py-0.5 rounded text-[10px]">
                                {item.produto.produto_fotos.length}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Conteúdo do Item */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white text-sm font-medium line-clamp-2">
                                {item.produto.nome}
                              </h4>
                              <div className="text-primary-400 text-sm flex items-center gap-1">
                                {item.desconto ? (
                                  <div className="flex items-center gap-2">
                                    <span className="line-through text-gray-500">
                                      {formatCurrency(item.desconto.precoOriginal)}
                                    </span>
                                    <span className="text-green-400 font-medium">
                                      {formatCurrency(item.desconto.precoComDesconto)}
                                    </span>
                                  </div>
                                ) : (
                                  // Mostrar preço com promoção se houver, senão preço normal
                                  item.produto.promocao && item.produto.valor_desconto ? (
                                    <div className="flex items-center gap-2">
                                      <span className="line-through text-gray-500">
                                        {formatCurrency(item.produto.preco)}
                                      </span>
                                      <span className="text-green-400 font-medium">
                                        {formatCurrency(calcularPrecoFinal(item.produto))}
                                      </span>
                                    </div>
                                  ) : (
                                    formatCurrency(item.produto.preco)
                                  )
                                )}
                                {item.produto.unidade_medida && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">
                                    {item.produto.unidade_medida.sigla}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => confirmarRemocao(item.id)}
                              className="text-red-400 hover:text-red-300 transition-colors ml-2 flex-shrink-0"
                            >
                              <X size={16} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => alterarQuantidade(item.id, item.quantidade - 1)}
                                className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-white hover:bg-gray-600 transition-colors"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="text-white font-medium w-8 text-center">
                                {item.quantidade}
                              </span>
                              <button
                                onClick={() => alterarQuantidade(item.id, item.quantidade + 1)}
                                className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-white hover:bg-gray-600 transition-colors"
                              >
                                <Plus size={14} />
                              </button>

                              {/* Botão de Desconto */}
                              <button
                                onClick={() => abrirModalDesconto(item.id)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                  item.desconto
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                }`}
                                title={item.desconto ? 'Editar desconto' : 'Aplicar desconto'}
                              >
                                <Percent size={14} />
                              </button>

                              {/* Botão para remover desconto */}
                              {item.desconto && (
                                <button
                                  onClick={() => removerDesconto(item.id)}
                                  className="w-8 h-8 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white transition-colors"
                                  title="Remover desconto"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                            <div className="text-white font-bold">
                              {formatCurrency(item.subtotal)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Resumo e Finalização - Só aparece quando NÃO está na finalização */}
            {carrinho.length > 0 && !showFinalizacaoVenda && (
              <div className="border-t border-gray-800 pt-4">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-gray-400">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(calcularTotal())}</span>
                  </div>
                  <div className="flex justify-between text-white font-bold text-lg">
                    <span>Total:</span>
                    <span>{formatCurrency(calcularTotal())}</span>
                  </div>
                </div>

                <button
                  onClick={finalizarVenda}
                  className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <CreditCard size={20} />
                  Finalizar Venda
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* Área de Finalização de Venda */}
        {showFinalizacaoVenda && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{
              type: "tween",
              duration: 0.5,
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
            className="w-96 bg-background-card border-l border-gray-800 p-4 flex flex-col h-full"
          >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <CreditCard size={20} />
                  Finalizar Venda
                </h3>
                <button
                  onClick={() => setShowFinalizacaoVenda(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Resumo da Venda */}
              <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Total da Venda:</span>
                  <span className="text-2xl font-bold text-primary-400">
                    {formatCurrency(calcularTotal())}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Itens:</span>
                  <span className="text-white">
                    {carrinho.reduce((total, item) => total + item.quantidade, 0)}
                  </span>
                </div>
                {pdvConfig?.seleciona_clientes && clienteSelecionado && (
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className="text-gray-400">Cliente:</span>
                    <span className="text-white">{clienteSelecionado.nome}</span>
                  </div>
                )}
              </div>

              {/* Tipo de Pagamento */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Tipo de Pagamento
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTipoPagamento('vista')}
                    className={`flex-1 py-2 px-3 rounded-lg border transition-colors ${
                      tipoPagamento === 'vista'
                        ? 'bg-primary-500 border-primary-500 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    À Vista
                  </button>
                  <button
                    onClick={() => setTipoPagamento('parcial')}
                    className={`flex-1 py-2 px-3 rounded-lg border transition-colors ${
                      tipoPagamento === 'parcial'
                        ? 'bg-primary-500 border-primary-500 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    Parciais
                  </button>
                </div>
              </div>

              {/* Formas de Pagamento */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Forma de Pagamento
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {formasPagamento.map((forma) => (
                    <button
                      key={forma.id}
                      onClick={() => setFormaPagamentoSelecionada(forma.id)}
                      className={`p-3 rounded-lg border transition-colors text-sm ${
                        formaPagamentoSelecionada === forma.id
                          ? 'bg-primary-500 border-primary-500 text-white'
                          : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      {forma.nome}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowFinalizacaoVenda(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    toast.success('Venda finalizada com sucesso!');
                    setCarrinho([]);
                    setClienteSelecionado(null);
                    setShowFinalizacaoVenda(false);
                  }}
                  className="flex-1 bg-primary-500 hover:bg-primary-600 text-white py-3 px-4 rounded-lg transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          )}
      </div>

      {/* Modal de Seleção de Cliente */}
      <AnimatePresence>
        {showClienteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowClienteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background-card rounded-lg border border-gray-800 p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Selecionar Cliente</h3>
                <button
                  onClick={() => setShowClienteModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                <button
                  onClick={() => {
                    setClienteSelecionado(null);
                    setShowClienteModal(false);
                  }}
                  className="w-full text-left p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                >
                  <div className="text-white">Venda sem cliente</div>
                  <div className="text-sm text-gray-400">Consumidor final</div>
                </button>

                {clientes.map(cliente => (
                  <button
                    key={cliente.id}
                    onClick={() => {
                      setClienteSelecionado(cliente);
                      setShowClienteModal(false);
                    }}
                    className="w-full text-left p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="text-white">{cliente.nome}</div>
                    {cliente.telefone && (
                      <div className="text-sm text-gray-400">{cliente.telefone}</div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Pagamento */}
      <AnimatePresence>
        {showPagamentoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowPagamentoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background-card rounded-lg border border-gray-800 p-6 w-full max-w-lg mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Finalizar Pagamento</h3>
                <button
                  onClick={() => setShowPagamentoModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-6">
                <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400">Total da Venda:</span>
                    <span className="text-2xl font-bold text-primary-400">
                      {formatCurrency(calcularTotal())}
                    </span>
                  </div>
                  {pdvConfig?.seleciona_clientes && clienteSelecionado && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Cliente:</span>
                      <span className="text-white">{clienteSelecionado.nome}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button className="bg-green-500/20 border border-green-500/30 text-green-400 p-4 rounded-lg hover:bg-green-500/30 transition-colors flex flex-col items-center gap-2">
                    <DollarSign size={24} />
                    <span className="font-medium">Dinheiro</span>
                  </button>
                  <button className="bg-blue-500/20 border border-blue-500/30 text-blue-400 p-4 rounded-lg hover:bg-blue-500/30 transition-colors flex flex-col items-center gap-2">
                    <CreditCard size={24} />
                    <span className="font-medium">Cartão</span>
                  </button>
                  <button className="bg-purple-500/20 border border-purple-500/30 text-purple-400 p-4 rounded-lg hover:bg-purple-500/30 transition-colors flex flex-col items-center gap-2">
                    <Calculator size={24} />
                    <span className="font-medium">PIX</span>
                  </button>
                  <button className="bg-orange-500/20 border border-orange-500/30 text-orange-400 p-4 rounded-lg hover:bg-orange-500/30 transition-colors flex flex-col items-center gap-2">
                    <Receipt size={24} />
                    <span className="font-medium">Fiado</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPagamentoModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    toast.success('Venda finalizada com sucesso!');
                    limparCarrinho();
                    setShowPagamentoModal(false);
                  }}
                  className="flex-1 bg-primary-500 hover:bg-primary-600 text-white py-3 px-4 rounded-lg transition-colors"
                >
                  Confirmar Venda
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação de Remoção */}
      <AnimatePresence>
        {showConfirmModal && itemParaRemover && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={cancelarRemocao}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background-card rounded-lg border border-gray-800 p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Confirmar Remoção</h3>
                <button
                  onClick={cancelarRemocao}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-300">
                  Tem certeza que deseja remover este item do carrinho?
                </p>
                {(() => {
                  const item = carrinho.find(item => item.id === itemParaRemover);
                  return item ? (
                    <div className="mt-3 p-3 bg-gray-800/50 rounded-lg">
                      <div className="text-white font-medium">{item.produto.nome}</div>
                      <div className="text-sm text-gray-400">
                        Quantidade: {item.quantidade} | Total: {formatCurrency(item.subtotal)}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelarRemocao}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => itemParaRemover && removerDoCarrinho(itemParaRemover)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg transition-colors"
                >
                  Remover
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação para Limpar Carrinho */}
      <AnimatePresence>
        {showLimparCarrinhoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowLimparCarrinhoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background-card rounded-lg border border-gray-800 p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Limpar Carrinho</h3>
                <button
                  onClick={() => setShowLimparCarrinhoModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-300 mb-4">
                  Tem certeza que deseja remover todos os itens do carrinho?
                </p>

                <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-white font-medium">Total de itens:</span>
                    <span className="text-primary-400 font-bold">
                      {carrinho.reduce((total, item) => total + item.quantidade, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">Valor total:</span>
                    <span className="text-primary-400 font-bold text-lg">
                      {formatCurrency(calcularTotal())}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  <div className="text-sm text-gray-400 mb-2">Itens que serão removidos:</div>
                  {carrinho.map((item, index) => (
                    <div key={item.id} className="bg-gray-800/30 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="text-white font-medium text-sm">{item.produto.nome}</div>
                          <div className="text-xs text-gray-400">
                            Qtd: {item.quantidade} × {formatCurrency(item.produto.preco)}
                          </div>
                        </div>
                        <div className="text-primary-400 font-bold text-sm">
                          {formatCurrency(item.subtotal)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowLimparCarrinhoModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={limparCarrinho}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg transition-colors"
                >
                  Limpar Carrinho
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Galeria de Fotos */}
      <AnimatePresence>
        {showGaleriaModal && produtoSelecionadoGaleria && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
            onClick={fecharGaleria}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full h-full flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Botão Fechar */}
              <button
                onClick={fecharGaleria}
                className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
              >
                <X size={24} />
              </button>

              {/* Informações do Produto */}
              <div className="absolute top-4 left-4 z-10 bg-black/50 text-white p-3 rounded-lg">
                <h3 className="font-bold text-lg">{produtoSelecionadoGaleria.nome}</h3>
                <p className="text-sm text-gray-300">
                  Foto {fotoAtualIndex + 1} de {produtoSelecionadoGaleria.produto_fotos?.length || 0}
                </p>
              </div>

              {/* Navegação - Foto Anterior */}
              {produtoSelecionadoGaleria.produto_fotos && produtoSelecionadoGaleria.produto_fotos.length > 1 && (
                <button
                  onClick={fotoAnterior}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              {/* Imagem Principal */}
              <div className="max-w-4xl max-h-full flex items-center justify-center">
                {produtoSelecionadoGaleria.produto_fotos && produtoSelecionadoGaleria.produto_fotos[fotoAtualIndex] ? (
                  <img
                    src={produtoSelecionadoGaleria.produto_fotos[fotoAtualIndex].url}
                    alt={`${produtoSelecionadoGaleria.nome} - Foto ${fotoAtualIndex + 1}`}
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-96 h-96 bg-gray-800 rounded-lg flex items-center justify-center">
                    <Package size={48} className="text-gray-600" />
                  </div>
                )}
              </div>

              {/* Navegação - Próxima Foto */}
              {produtoSelecionadoGaleria.produto_fotos && produtoSelecionadoGaleria.produto_fotos.length > 1 && (
                <button
                  onClick={proximaFoto}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white p-3 rounded-full hover:bg-black/70 transition-colors"
                >
                  <ChevronRight size={24} />
                </button>
              )}

              {/* Miniaturas */}
              {produtoSelecionadoGaleria.produto_fotos && produtoSelecionadoGaleria.produto_fotos.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                  <div className="flex gap-2 bg-black/50 p-2 rounded-lg">
                    {produtoSelecionadoGaleria.produto_fotos.map((foto, index) => (
                      <button
                        key={index}
                        onClick={() => setFotoAtualIndex(index)}
                        className={`w-12 h-12 rounded border-2 overflow-hidden transition-all ${
                          index === fotoAtualIndex
                            ? 'border-primary-400 scale-110'
                            : 'border-gray-600 hover:border-gray-400'
                        }`}
                      >
                        <img
                          src={foto.url}
                          alt={`Miniatura ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Comandas/Mesas */}
      <AnimatePresence>
        {showComandasModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowComandasModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background-card rounded-lg border border-gray-800 p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Comandas/Mesas Abertas</h3>
                <button
                  onClick={() => setShowComandasModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="text-center py-8">
                  <FileText size={48} className="mx-auto mb-4 text-gray-500" />
                  <p className="text-gray-400">Nenhuma comanda ou mesa aberta no momento</p>
                  <button className="mt-4 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors">
                    Nova Comanda
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Sangria */}
      <AnimatePresence>
        {showSangriaModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowSangriaModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background-card rounded-lg border border-gray-800 p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Sangria</h3>
                <button
                  onClick={() => setShowSangriaModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Valor da Sangria
                  </label>
                  <input
                    type="text"
                    placeholder="R$ 0,00"
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Motivo
                  </label>
                  <textarea
                    placeholder="Descreva o motivo da sangria..."
                    rows={3}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSangriaModal(false)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      toast.success('Sangria registrada com sucesso!');
                      setShowSangriaModal(false);
                    }}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg transition-colors"
                  >
                    Registrar Sangria
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Suprimento */}
      <AnimatePresence>
        {showSuprimentoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowSuprimentoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background-card rounded-lg border border-gray-800 p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Suprimento</h3>
                <button
                  onClick={() => setShowSuprimentoModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Valor do Suprimento
                  </label>
                  <input
                    type="text"
                    placeholder="R$ 0,00"
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Motivo
                  </label>
                  <textarea
                    placeholder="Descreva o motivo do suprimento..."
                    rows={3}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/20"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSuprimentoModal(false)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      toast.success('Suprimento registrado com sucesso!');
                      setShowSuprimentoModal(false);
                    }}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg transition-colors"
                  >
                    Registrar Suprimento
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Pagamentos */}
      <AnimatePresence>
        {showPagamentosModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowPagamentosModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background-card rounded-lg border border-gray-800 p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Relatório de Pagamentos</h3>
                <button
                  onClick={() => setShowPagamentosModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <div className="text-sm text-gray-400">Dinheiro</div>
                    <div className="text-xl font-bold text-green-400">R$ 0,00</div>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <div className="text-sm text-gray-400">Cartão</div>
                    <div className="text-xl font-bold text-blue-400">R$ 0,00</div>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <div className="text-sm text-gray-400">PIX</div>
                    <div className="text-xl font-bold text-purple-400">R$ 0,00</div>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <div className="text-sm text-gray-400">Total</div>
                    <div className="text-xl font-bold text-primary-400">R$ 0,00</div>
                  </div>
                </div>

                <div className="text-center py-8">
                  <CreditCard size={48} className="mx-auto mb-4 text-gray-500" />
                  <p className="text-gray-400">Nenhuma venda registrada hoje</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Fiados */}
      <AnimatePresence>
        {showFiadosModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowFiadosModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background-card rounded-lg border border-gray-800 p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Vendas Fiadas</h3>
                <button
                  onClick={() => setShowFiadosModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <div className="text-sm text-gray-400">Total em Fiados</div>
                  <div className="text-2xl font-bold text-yellow-400">R$ 0,00</div>
                </div>

                <div className="text-center py-8">
                  <Clock size={48} className="mx-auto mb-4 text-gray-500" />
                  <p className="text-gray-400">Nenhuma venda fiada registrada</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Desconto */}
      <AnimatePresence>
        {showDescontoModal && itemParaDesconto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowDescontoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background-card rounded-lg border border-gray-800 p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const item = carrinho.find(i => i.id === itemParaDesconto);
                if (!item) return null;

                return (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Aplicar Desconto</h3>
                      <button
                        onClick={() => setShowDescontoModal(false)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
                      <div className="text-white font-medium">{item.produto.nome}</div>
                      <div className="text-sm text-gray-400">
                        Preço atual: {formatCurrency(calcularPrecoFinal(item.produto))}
                        {item.produto.promocao && item.produto.valor_desconto && (
                          <div className="text-xs text-green-400 mt-1">
                            (Preço original: {formatCurrency(item.produto.preco)} - Em promoção)
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Tipo de Desconto */}
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Tipo de Desconto
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setTipoDesconto('percentual')}
                            className={`flex-1 py-2 px-3 rounded-lg border transition-colors ${
                              tipoDesconto === 'percentual'
                                ? 'bg-primary-500 border-primary-500 text-white'
                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                            }`}
                          >
                            Percentual (%)
                          </button>
                          <button
                            onClick={() => setTipoDesconto('valor')}
                            className={`flex-1 py-2 px-3 rounded-lg border transition-colors ${
                              tipoDesconto === 'valor'
                                ? 'bg-primary-500 border-primary-500 text-white'
                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                            }`}
                          >
                            Valor (R$)
                          </button>
                        </div>
                      </div>

                      {/* Valor do Desconto */}
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          {tipoDesconto === 'percentual' ? 'Percentual de Desconto' : 'Valor do Desconto'}
                        </label>
                        <input
                          type="text"
                          value={valorDesconto}
                          onChange={(e) => setValorDesconto(e.target.value)}
                          placeholder={tipoDesconto === 'percentual' ? 'Ex: 10' : 'Ex: 5,00'}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        />
                      </div>

                      {/* Novo Valor */}
                      {valorDesconto && (
                        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                          <div className="text-sm text-gray-400 mb-1">Novo preço:</div>
                          <div className="text-lg font-bold text-green-400">
                            {formatCurrency(novoValor)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Desconto: {formatCurrency(calcularPrecoFinal(item.produto) - novoValor)}
                          </div>
                        </div>
                      )}

                      {/* Botões */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowDescontoModal(false)}
                          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={aplicarDesconto}
                          disabled={!valorDesconto}
                          className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg transition-colors"
                        >
                          Aplicar Desconto
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default PDVPage;
