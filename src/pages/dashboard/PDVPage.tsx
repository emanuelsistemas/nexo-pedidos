import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
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
  Percent,
  ShoppingBag,
  AlertTriangle,
  Menu,
  Table,
  ArrowUpDown,
  BookOpen,
  MessageCircle,
  Bike,
  Pencil,
  Check,
  MessageSquare,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';
import { useAuthSession } from '../../hooks/useAuthSession';
import { formatarPreco } from '../../utils/formatters';
import { EVENT_TYPES, contarPedidosPendentes, PedidoEventData, RecarregarEventData } from '../../utils/eventSystem';
import Sidebar from '../../components/dashboard/Sidebar';
import { useSidebarStore } from '../../store/sidebarStore';
import OpcoesAdicionaisModal from '../../components/pdv/OpcoesAdicionaisModal';
import { useFullscreen } from '../../hooks/useFullscreen';

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
  pedido_origem_id?: string; // ID do pedido de origem (se importado)
  pedido_origem_numero?: string; // Número do pedido de origem (se importado)
  pedidos_origem?: Array<{ // Para itens agrupados de múltiplos pedidos
    id: string;
    numero: string;
    quantidade: number;
  }>;
  desconto?: {
    tipo: 'percentual' | 'valor';
    valor: number;
    valorDesconto: number;
    precoOriginal: number;
    precoComDesconto: number;
    percentualDesconto?: number;
    origemPedido?: boolean; // Indica se o desconto veio de um pedido importado
  };
  adicionais?: Array<{
    id: string;
    nome: string;
    preco: number;
    quantidade: number;
  }>;
  temOpcoesAdicionais?: boolean; // Indica se o produto tem opções adicionais disponíveis
  observacao?: string; // Observação adicional do produto
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
  const navigate = useNavigate();
  const { isExpanded, toggle } = useSidebarStore();

  // Hook para fullscreen
  const { enterFullscreen, exitFullscreen, isFullscreen } = useFullscreen();
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
  const [showPedidosModal, setShowPedidosModal] = useState(false);
  const [showMesasModal, setShowMesasModal] = useState(false);
  const [showComandasModal, setShowComandasModal] = useState(false);
  const [showSangriaModal, setShowSangriaModal] = useState(false);
  const [showSuprimentoModal, setShowSuprimentoModal] = useState(false);
  const [showPagamentosModal, setShowPagamentosModal] = useState(false);
  const [showFiadosModal, setShowFiadosModal] = useState(false);
  const [showMovimentosModal, setShowMovimentosModal] = useState(false);

  // Estados para o modal de movimentos
  const [vendas, setVendas] = useState<any[]>([]);
  const [loadingVendas, setLoadingVendas] = useState(false);

  // Estados para filtros avançados
  const [showFiltrosVendas, setShowFiltrosVendas] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'canceladas' | 'finalizadas' | 'pedidos'>('todas');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroNumeroPedido, setFiltroNumeroPedido] = useState('');
  const [filtroNumeroVenda, setFiltroNumeroVenda] = useState('');

  // Estados para cancelamento de vendas
  const [showCancelamentoModal, setShowCancelamentoModal] = useState(false);
  const [vendaParaCancelar, setVendaParaCancelar] = useState<any>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');

  // Estados para exibir itens da venda
  const [showItensVendaModal, setShowItensVendaModal] = useState(false);
  const [vendaParaExibirItens, setVendaParaExibirItens] = useState<any>(null);
  const [itensVenda, setItensVenda] = useState<any[]>([]);
  const [loadingItensVenda, setLoadingItensVenda] = useState(false);

  // Estado para controlar visibilidade da área de produtos
  const [showAreaProdutos, setShowAreaProdutos] = useState(false);

  // Estados para o modal de Pedidos
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [searchPedidos, setSearchPedidos] = useState('');
  const [pedidosFiltrados, setPedidosFiltrados] = useState<any[]>([]);
  const [contadorPedidosPendentes, setContadorPedidosPendentes] = useState<number>(0);
  const [statusFilterPedidos, setStatusFilterPedidos] = useState<string>('pendente');
  const [showFiltersPedidos, setShowFiltersPedidos] = useState(false);

  // Estados para visualização detalhada do pedido
  const [pedidoDetalhado, setPedidoDetalhado] = useState<any>(null);
  const [showDetalhePedido, setShowDetalhePedido] = useState(false);

  // Estados para os modais do menu PDV (paginação removida)

  // Estados para modal de desconto
  const [showDescontoModal, setShowDescontoModal] = useState(false);
  const [itemParaDesconto, setItemParaDesconto] = useState<string | null>(null);
  const [tipoDesconto, setTipoDesconto] = useState<'percentual' | 'valor'>('percentual');
  const [valorDesconto, setValorDesconto] = useState('');
  const [novoValor, setNovoValor] = useState(0);

  // Chave para localStorage específica do PDV
  const PDV_STORAGE_KEY = 'nexo-pdv-state';

  // Estados para finalização de venda
  const [tipoPagamento, setTipoPagamento] = useState<'vista' | 'parcial'>('vista');
  const [formasPagamento, setFormasPagamento] = useState<any[]>([]);
  const [formaPagamentoSelecionada, setFormaPagamentoSelecionada] = useState<string | null>(null);

  // Estados para pagamentos parciais
  const [valorParcial, setValorParcial] = useState<string>('');
  const [pagamentosParciais, setPagamentosParciais] = useState<Array<{
    id: number;
    forma: string;
    valor: number;
    tipo: 'eletronico' | 'dinheiro';
  }>>([]);
  const [trocoCalculado, setTrocoCalculado] = useState<number>(0);

  // Estados para confirmações de remoção
  const [showConfirmRemoveAll, setShowConfirmRemoveAll] = useState(false);
  const [showConfirmRemoveItem, setShowConfirmRemoveItem] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<number | null>(null);

  // Estados para modal de processamento da venda
  const [showProcessandoVenda, setShowProcessandoVenda] = useState(false);
  const [etapaProcessamento, setEtapaProcessamento] = useState<string>('');
  const [vendaProcessadaId, setVendaProcessadaId] = useState<string | null>(null);
  const [numeroVendaProcessada, setNumeroVendaProcessada] = useState<string>('');

  // Estados para tela de finalização final
  const [showFinalizacaoFinal, setShowFinalizacaoFinal] = useState(false);
  const [showFinalizacaoNaAreaPagamento, setShowFinalizacaoNaAreaPagamento] = useState(false);
  const [cpfCnpjNota, setCpfCnpjNota] = useState('');
  const [clienteEncontrado, setClienteEncontrado] = useState<Cliente | null>(null);
  const [tipoDocumento, setTipoDocumento] = useState<'cpf' | 'cnpj'>('cpf');
  const [erroValidacao, setErroValidacao] = useState<string>('');

  // Estado para confirmação de limpar carrinho
  const [showConfirmLimparCarrinho, setShowConfirmLimparCarrinho] = useState(false);

  // Estado para confirmação de limpeza geral do PDV
  const [showConfirmLimparTudoPDV, setShowConfirmLimparTudoPDV] = useState(false);

  // Estado para modal de produto não encontrado
  const [showProdutoNaoEncontrado, setShowProdutoNaoEncontrado] = useState(false);
  const [produtoNaoEncontradoTermo, setProdutoNaoEncontradoTermo] = useState('');

  // Estado para dados do usuário
  const [userData, setUserData] = useState<{ nome: string } | null>(null);

  // Estado para controlar visibilidade do menu no PDV
  const [showMenuPDV, setShowMenuPDV] = useState(false);

  // Estados para navegação do menu PDV
  const [menuStartIndex, setMenuStartIndex] = useState(0);
  const [visibleMenuItems, setVisibleMenuItems] = useState(9); // Quantos itens são visíveis

  // Estados para pedidos importados (múltiplos)
  const [pedidosImportados, setPedidosImportados] = useState<any[]>([]);
  const [showConfirmRemovePedidoImportado, setShowConfirmRemovePedidoImportado] = useState(false);
  const [pedidoParaRemover, setPedidoParaRemover] = useState<any>(null);
  const [showConfirmImportarPedido, setShowConfirmImportarPedido] = useState(false);
  const [pedidoParaImportar, setPedidoParaImportar] = useState<any>(null);

  // Estados para descontos do cliente
  const [descontosCliente, setDescontosCliente] = useState<{
    prazo: Array<{ id: string; prazo_dias: number; percentual: number; tipo: 'desconto' | 'acrescimo' }>;
    valor: Array<{ valor_minimo: number; percentual: number; tipo: 'desconto' | 'acrescimo' }>;
  }>({ prazo: [], valor: [] });

  // Estado para desconto por prazo selecionado (importado do pedido)
  const [descontoPrazoSelecionado, setDescontoPrazoSelecionado] = useState<string | null>(null);

  // Estados para modal de opções adicionais
  const [showOpcoesAdicionaisModal, setShowOpcoesAdicionaisModal] = useState(false);
  const [produtoParaAdicionais, setProdutoParaAdicionais] = useState<Produto | null>(null);
  const [itemCarrinhoParaAdicionais, setItemCarrinhoParaAdicionais] = useState<string | null>(null);

  // Estados para edição de nome do produto
  const [itemEditandoNome, setItemEditandoNome] = useState<string | null>(null);
  const [nomeEditando, setNomeEditando] = useState<string>('');

  // Estados para observação adicional
  const [showObservacaoModal, setShowObservacaoModal] = useState(false);
  const [itemParaObservacao, setItemParaObservacao] = useState<string | null>(null);
  const [observacaoTexto, setObservacaoTexto] = useState<string>('');
  const [itemEditandoObservacao, setItemEditandoObservacao] = useState<string | null>(null);
  const [observacaoEditando, setObservacaoEditando] = useState<string>('');

  // Funções para localStorage
  const savePDVState = () => {
    try {
      const pdvState = {
        carrinho,
        clienteSelecionado,
        pedidosImportados,
        showFinalizacaoFinal,
        tipoPagamento,
        formaPagamentoSelecionada,
        valorParcial,
        pagamentosParciais,
        trocoCalculado,
        descontoPrazoSelecionado,
        itemEditandoNome,
        nomeEditando,
        itemEditandoObservacao,
        observacaoEditando,
        timestamp: Date.now()
      };
      localStorage.setItem(PDV_STORAGE_KEY, JSON.stringify(pdvState));
    } catch (error) {
      console.error('Erro ao salvar estado do PDV:', error);
    }
  };

  const loadPDVState = () => {
    try {
      const savedState = localStorage.getItem(PDV_STORAGE_KEY);
      if (savedState) {
        const pdvState = JSON.parse(savedState);

        // Verifica se o estado não é muito antigo (24 horas)
        const isStateValid = pdvState.timestamp && (Date.now() - pdvState.timestamp) < 24 * 60 * 60 * 1000;

        if (isStateValid) {
          // Restaura todos os estados
          if (pdvState.carrinho) setCarrinho(pdvState.carrinho);
          if (pdvState.clienteSelecionado) setClienteSelecionado(pdvState.clienteSelecionado);
          if (pdvState.pedidosImportados) setPedidosImportados(pdvState.pedidosImportados);
          // Compatibilidade com versão anterior (pedido único)
          if (pdvState.pedidoImportado && !pdvState.pedidosImportados) {
            setPedidosImportados([pdvState.pedidoImportado]);
          }
          if (pdvState.showFinalizacaoFinal !== undefined) setShowFinalizacaoFinal(pdvState.showFinalizacaoFinal);
          if (pdvState.tipoPagamento) setTipoPagamento(pdvState.tipoPagamento);
          if (pdvState.formaPagamentoSelecionada) setFormaPagamentoSelecionada(pdvState.formaPagamentoSelecionada);
          if (pdvState.valorParcial) setValorParcial(pdvState.valorParcial);

          // Verificar se os pagamentos parciais têm o formato correto (com IDs)
          if (pdvState.pagamentosParciais && Array.isArray(pdvState.pagamentosParciais)) {
            // Filtrar apenas pagamentos que têm IDs válidos (não são strings simples como "Dinheiro")
            const pagamentosValidos = pdvState.pagamentosParciais.filter((p: any) => {
              return p.forma && typeof p.forma === 'string' && p.forma.length > 10; // IDs são longos
            });
            setPagamentosParciais(pagamentosValidos);
          }

          if (pdvState.trocoCalculado) setTrocoCalculado(pdvState.trocoCalculado);
          if (pdvState.descontoPrazoSelecionado) setDescontoPrazoSelecionado(pdvState.descontoPrazoSelecionado);
          if (pdvState.itemEditandoNome) setItemEditandoNome(pdvState.itemEditandoNome);
          if (pdvState.nomeEditando) setNomeEditando(pdvState.nomeEditando);
          if (pdvState.itemEditandoObservacao) setItemEditandoObservacao(pdvState.itemEditandoObservacao);
          if (pdvState.observacaoEditando) setObservacaoEditando(pdvState.observacaoEditando);

        } else {
          // Remove estado antigo
          clearPDVState();
        }
      }
    } catch (error) {
      console.error('Erro ao carregar estado do PDV:', error);
      clearPDVState();
    }
  };

  const clearPDVState = () => {
    try {
      localStorage.removeItem(PDV_STORAGE_KEY);
    } catch (error) {
      console.error('Erro ao limpar estado do PDV:', error);
    }
  };

  // Função para remover pedido importado específico
  const removerPedidoImportado = () => {
    if (!pedidoParaRemover) return;

    // Filtrar itens do carrinho que pertencem a este pedido
    const itensDoCarrinho = carrinho.filter(item => item.pedido_origem_id === pedidoParaRemover.id);
    const itensRestantes = carrinho.filter(item => item.pedido_origem_id !== pedidoParaRemover.id);

    // Contar itens removidos
    const totalItensRemovidos = itensDoCarrinho.reduce((total, item) => total + item.quantidade, 0);
    const totalProdutosRemovidos = itensDoCarrinho.length;

    // Atualizar carrinho removendo apenas itens deste pedido
    setCarrinho(itensRestantes);

    // Remover pedido da lista de importados
    setPedidosImportados(prev => prev.filter(p => p.id !== pedidoParaRemover.id));

    // Se não há mais pedidos importados e configuração desabilitada, remover cliente e desconto
    const pedidosRestantes = pedidosImportados.filter(p => p.id !== pedidoParaRemover.id);
    if (pedidosRestantes.length === 0 && !pdvConfig?.seleciona_clientes) {
      setClienteSelecionado(null);
      setDescontoPrazoSelecionado(null);
    }

    setShowConfirmRemovePedidoImportado(false);
    setPedidoParaRemover(null);

    // Toast informativo sobre o que foi removido
    if (totalProdutosRemovidos > 0) {
      toast.success(`Pedido #${pedidoParaRemover.numero} removido! ${totalProdutosRemovidos} produto(s) e ${totalItensRemovidos} item(s) foram removidos do carrinho.`);
    } else {
      toast.success(`Pedido #${pedidoParaRemover.numero} removido com sucesso!`);
    }
  };

  // Função para limpar tudo do PDV (limpeza geral)
  const limparTudoPDV = () => {
    // Limpar carrinho
    setCarrinho([]);

    // Limpar cliente selecionado
    setClienteSelecionado(null);

    // Limpar pedidos importados
    setPedidosImportados([]);

    // Limpar descontos
    setDescontosCliente({ prazo: [], valor: [] });
    setDescontoPrazoSelecionado(null);

    // Resetar tipo de pagamento
    setTipoPagamento('vista');
    setFormaPagamentoSelecionada(null);

    // Limpar pagamentos parciais
    setValorParcial('');
    setPagamentosParciais([]);
    setTrocoCalculado(0);

    // Fechar telas de finalização
    setShowFinalizacaoFinal(false);

    // Limpar dados da nota fiscal
    setCpfCnpjNota('');
    setClienteEncontrado(null);
    setTipoDocumento('cpf');
    setErroValidacao('');

    // Limpar estados de edição
    setItemEditandoNome(null);
    setNomeEditando('');
    setItemEditandoObservacao(null);
    setObservacaoEditando('');

    // Limpar localStorage
    clearPDVState();

    // Fechar modal de confirmação
    setShowConfirmLimparTudoPDV(false);

    // Toast de confirmação
    toast.success('PDV limpo com sucesso! Todos os dados foram removidos.');
  };

  // Função para carregar dados do usuário
  const loadUserData = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('nome')
        .eq('id', authData.user.id)
        .single();

      if (usuarioData) {
        setUserData({ nome: usuarioData.nome });
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    }
  };

  // Função para carregar descontos do cliente
  const carregarDescontosCliente = async (clienteId: string) => {
    try {
      // Obter dados do usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // Carregar descontos por prazo
      const { data: descontosPrazo, error: errorPrazo } = await supabase
        .from('cliente_descontos_prazo')
        .select('id, prazo_dias, percentual, tipo')
        .eq('cliente_id', clienteId)
        .eq('empresa_id', usuarioData.empresa_id)
        .order('prazo_dias');

      // Carregar descontos por valor
      const { data: descontosValor, error: errorValor } = await supabase
        .from('cliente_descontos_valor')
        .select('valor_minimo, percentual, tipo')
        .eq('cliente_id', clienteId)
        .eq('empresa_id', usuarioData.empresa_id)
        .order('valor_minimo');

      if (errorPrazo) throw errorPrazo;
      if (errorValor) throw errorValor;

      setDescontosCliente({
        prazo: descontosPrazo || [],
        valor: descontosValor || []
      });
    } catch (error) {
      console.error('Erro ao carregar descontos do cliente:', error);
      setDescontosCliente({ prazo: [], valor: [] });
    }
  };

  // Função para calcular desconto por valor do pedido
  const calcularDescontoPorValor = (valorTotal: number) => {
    if (!descontosCliente.valor.length) return null;

    // Encontrar o maior desconto aplicável (valor mínimo menor ou igual ao total)
    const descontoAplicavel = descontosCliente.valor
      .filter(d => d.valor_minimo <= valorTotal)
      .sort((a, b) => b.valor_minimo - a.valor_minimo)[0];

    if (!descontoAplicavel) return null;

    const valorDesconto = (valorTotal * descontoAplicavel.percentual) / 100;

    return {
      tipo: descontoAplicavel.tipo,
      percentual: descontoAplicavel.percentual,
      valor: valorDesconto,
      valorMinimo: descontoAplicavel.valor_minimo
    };
  };

  // Função para obter descontos por prazo disponíveis
  const getDescontosPrazoDisponiveis = () => {
    return descontosCliente.prazo.map(d => ({
      id: d.id,
      prazo_dias: d.prazo_dias,
      percentual: d.percentual,
      tipo: d.tipo,
      valor: (calcularTotal() * d.percentual) / 100
    }));
  };

  // Função para calcular desconto por prazo selecionado
  const calcularDescontoPrazo = () => {
    if (!descontoPrazoSelecionado) return 0;

    const desconto = descontosCliente.prazo.find(d => d.id === descontoPrazoSelecionado);
    if (!desconto) return 0;

    const subtotal = carrinho.reduce((acc, item) => acc + item.subtotal, 0);
    const valorDesconto = (subtotal * desconto.percentual) / 100;

    // Se for desconto, retorna valor positivo para subtrair
    // Se for acréscimo, retorna valor negativo para adicionar
    return desconto.tipo === 'desconto' ? valorDesconto : -valorDesconto;
  };

  // Função para confirmar importação de pedido
  const confirmarImportarPedido = () => {
    if (pedidoParaImportar) {
      // Limpar apenas itens adicionados manualmente (sem pedido_origem_id)
      const itensDeOutrosPedidos = carrinho.filter(item => item.pedido_origem_id);
      setCarrinho(itensDeOutrosPedidos);

      executarImportacaoPedido(pedidoParaImportar);
      setShowConfirmImportarPedido(false);
      setPedidoParaImportar(null);
      setShowPedidosModal(false); // Fechar o modal de pedidos também
    }
  };

  // Funções auxiliares para detalhes do pedido
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return 'text-yellow-400';
      case 'confirmado': return 'text-blue-400';
      case 'preparando': return 'text-orange-400';
      case 'pronto': return 'text-green-400';
      case 'entregue': return 'text-green-500';
      case 'faturado': return 'text-green-600';
      case 'cancelado': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'confirmado': return 'Confirmado';
      case 'preparando': return 'Em Preparação';
      case 'pronto': return 'Pronto';
      case 'entregue': return 'Entregue';
      case 'faturado': return 'Faturado';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  const formatarDataHora = (data: string) => {
    return new Date(data).toLocaleString('pt-BR');
  };

  // Função para carregar detalhes completos do pedido
  const carregarDetalhesPedido = async (pedidoId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // Buscar pedido completo com relacionamentos básicos
      const { data: pedidoCompleto, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          cliente:clientes(
            id,
            nome,
            telefone,
            documento,
            tipo_documento,
            razao_social,
            nome_fantasia
          ),
          usuario:usuarios(nome),
          pedidos_itens(
            id,
            quantidade,
            valor_unitario,
            valor_total,
            observacao,
            produto:produtos(
              id,
              nome,
              codigo,
              codigo_barras,
              descricao,
              preco,
              unidade_medida_id,
              grupo_id,
              produto_fotos(url, principal)
            )
          )
        `)
        .eq('id', pedidoId)
        .eq('empresa_id', usuarioData.empresa_id)
        .single();

      if (error) {
        console.error('Erro ao carregar detalhes do pedido:', error);
        toast.error('Erro ao carregar detalhes do pedido');
        return;
      }

      setPedidoDetalhado(pedidoCompleto);
      setShowDetalhePedido(true);
    } catch (error) {
      console.error('Erro ao carregar detalhes do pedido:', error);
      toast.error('Erro ao carregar detalhes do pedido');
    }
  };

  // useEffect para carregamento inicial - SEM dependências para evitar recarregamentos
  useEffect(() => {
    loadData();
    loadPDVState(); // Carrega o estado salvo do PDV
    loadContadorPedidos(); // Carrega contador inicial
    loadUserData(); // Carrega dados do usuário

    // Adiciona listener para salvar antes de fechar a página
    const handleBeforeUnload = () => {
      savePDVState();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup - sair do fullscreen quando sair da página
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // Sair do fullscreen ao desmontar o componente
      if (isFullscreen) {
        exitFullscreen().catch(error => {
          console.log('PDV: Erro ao sair do fullscreen:', error);
        });
      }
    };
  }, []); // Array vazio para executar apenas uma vez

  // useEffect separado para event listeners - SEM dependências para evitar recarregamentos
  useEffect(() => {
    // Event listeners para sistema de eventos em tempo real
    const handlePedidoCriado = (event: CustomEvent<PedidoEventData>) => {
      const { empresaId } = event.detail;
      // Verificar se é da mesma empresa
      checkEmpresaAndUpdateCounter(empresaId);
      // Recarregar lista de pedidos se o modal estiver aberto
      // Usar uma verificação dinâmica do DOM ao invés de estado
      const modalElement = document.querySelector('[data-modal="pedidos"]');
      if (modalElement) {
        loadPedidos();
      }
    };

    const handlePedidoAtualizado = (event: CustomEvent<PedidoEventData>) => {
      const { empresaId } = event.detail;
      checkEmpresaAndUpdateCounter(empresaId);
      const modalElement = document.querySelector('[data-modal="pedidos"]');
      if (modalElement) {
        loadPedidos();
      }
    };

    const handlePedidoCancelado = (event: CustomEvent<PedidoEventData>) => {
      const { empresaId } = event.detail;
      checkEmpresaAndUpdateCounter(empresaId);
      const modalElement = document.querySelector('[data-modal="pedidos"]');
      if (modalElement) {
        loadPedidos();
      }
    };

    const handlePedidoFaturado = (event: CustomEvent<PedidoEventData>) => {
      const { empresaId } = event.detail;
      checkEmpresaAndUpdateCounter(empresaId);
      const modalElement = document.querySelector('[data-modal="pedidos"]');
      if (modalElement) {
        loadPedidos();
      }
    };

    const handlePedidosRecarregar = (event: CustomEvent<RecarregarEventData>) => {
      const { empresaId } = event.detail;
      checkEmpresaAndUpdateCounter(empresaId);
      const modalElement = document.querySelector('[data-modal="pedidos"]');
      if (modalElement) {
        loadPedidos();
      }
    };

    // Adicionar event listeners
    window.addEventListener(EVENT_TYPES.PEDIDO_CRIADO, handlePedidoCriado as EventListener);
    window.addEventListener(EVENT_TYPES.PEDIDO_ATUALIZADO, handlePedidoAtualizado as EventListener);
    window.addEventListener(EVENT_TYPES.PEDIDO_CANCELADO, handlePedidoCancelado as EventListener);
    window.addEventListener(EVENT_TYPES.PEDIDO_FATURADO, handlePedidoFaturado as EventListener);
    window.addEventListener(EVENT_TYPES.PEDIDOS_RECARREGAR, handlePedidosRecarregar as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener(EVENT_TYPES.PEDIDO_CRIADO, handlePedidoCriado as EventListener);
      window.removeEventListener(EVENT_TYPES.PEDIDO_ATUALIZADO, handlePedidoAtualizado as EventListener);
      window.removeEventListener(EVENT_TYPES.PEDIDO_CANCELADO, handlePedidoCancelado as EventListener);
      window.removeEventListener(EVENT_TYPES.PEDIDO_FATURADO, handlePedidoFaturado as EventListener);
      window.removeEventListener(EVENT_TYPES.PEDIDOS_RECARREGAR, handlePedidosRecarregar as EventListener);
    };
  }, []); // Array vazio para executar apenas uma vez

  // Salva automaticamente sempre que algum estado importante mudar
  useEffect(() => {
    // Só salva se já carregou os dados iniciais (evita salvar estado vazio no primeiro render)
    if (produtos.length > 0) {
      savePDVState();
    }
  }, [
    carrinho,
    clienteSelecionado,
    pedidosImportados,
    showFinalizacaoFinal,
    tipoPagamento,
    formaPagamentoSelecionada,
    valorParcial,
    pagamentosParciais,
    trocoCalculado,
    descontoPrazoSelecionado,
    itemEditandoNome,
    nomeEditando,
    itemEditandoObservacao,
    observacaoEditando,
    produtos.length // Garante que só salva depois de carregar os produtos
  ]);

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



  // Definir todos os itens do menu PDV
  const allMenuPDVItems = [
    {
      id: 'produtos',
      icon: Package,
      label: 'Produtos',
      color: 'primary',
      onClick: async (e?: React.MouseEvent) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }

        if (showAreaProdutos) {
          // Se já está aberto, apenas fechar
          setShowAreaProdutos(false);
        } else {
          // Se está fechado, ativar fullscreen e abrir
          await abrirModalProdutos();
        }
      }
    },
    {
      id: 'pedidos',
      icon: ShoppingBag,
      label: 'Pedidos',
      color: 'primary',
      onClick: async (e?: React.MouseEvent) => {
        // Prevenir qualquer comportamento padrão
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }

        try {
          // Ativar fullscreen antes de abrir o modal
          if (!isFullscreen) {
            await enterFullscreen();
            console.log('Fullscreen ativado para modal de pedidos');
          }
        } catch (error) {
          console.log('Erro ao ativar fullscreen para modal de pedidos:', error);
        }

        // Abrir modal IMEDIATAMENTE sem loading
        setShowPedidosModal(true);
        setSearchPedidos('');

        // Carregar pedidos em background apenas se necessário
        if (pedidos.length === 0) {
          setTimeout(() => {
            loadPedidos();
          }, 100);
        }
      }
    },
    {
      id: 'cardapio-digital',
      icon: BookOpen,
      label: 'Cardápio Digital',
      color: 'primary',
      onClick: (e?: React.MouseEvent) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        // TODO: Implementar funcionalidade do cardápio digital
        toast.info('Funcionalidade do Cardápio Digital em desenvolvimento');
      }
    },
    {
      id: 'whatsapp',
      icon: MessageCircle,
      label: 'WhatsApp',
      color: 'primary',
      onClick: (e?: React.MouseEvent) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        // TODO: Implementar funcionalidade do WhatsApp
        toast.info('Funcionalidade do WhatsApp em desenvolvimento');
      }
    },
    {
      id: 'mesas',
      icon: Table,
      label: 'Mesas',
      color: 'primary',
      onClick: (e?: React.MouseEvent) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        setShowMesasModal(true);
      }
    },
    {
      id: 'comandas',
      icon: FileText,
      label: 'Comandas',
      color: 'primary',
      onClick: (e?: React.MouseEvent) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        setShowComandasModal(true);
      }
    },
    {
      id: 'delivery',
      icon: Bike,
      label: 'Delivery',
      color: 'primary',
      onClick: (e?: React.MouseEvent) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        // TODO: Implementar funcionalidade do Delivery
        toast.info('Funcionalidade do Delivery em desenvolvimento');
      }
    },
    {
      id: 'sangria',
      icon: TrendingDown,
      label: 'Sangria',
      color: 'red',
      onClick: (e?: React.MouseEvent) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        setShowSangriaModal(true);
      }
    },
    {
      id: 'suprimento',
      icon: TrendingUp,
      label: 'Suprimento',
      color: 'green',
      onClick: (e?: React.MouseEvent) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        setShowSuprimentoModal(true);
      }
    },
    {
      id: 'pagamentos',
      icon: CreditCard,
      label: 'Pagamentos',
      color: 'blue',
      onClick: (e?: React.MouseEvent) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        setShowPagamentosModal(true);
      }
    },
    {
      id: 'fiados',
      icon: Clock,
      label: 'Fiados',
      color: 'yellow',
      onClick: (e?: React.MouseEvent) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        setShowFiadosModal(true);
      }
    },
    {
      id: 'movimentos',
      icon: ArrowUpDown,
      label: 'Movimentos',
      color: 'purple',
      onClick: async (e?: React.MouseEvent) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }

        try {
          // Ativar fullscreen antes de abrir o modal
          if (!isFullscreen) {
            await enterFullscreen();
            console.log('Fullscreen ativado para modal de movimentos');
          }
        } catch (error) {
          console.log('Erro ao ativar fullscreen para modal de movimentos:', error);
        }

        setShowMovimentosModal(true);
        // Carregar vendas apenas uma vez quando abrir o modal
        loadVendas();
      }
    }
  ];

  // Função para filtrar itens do menu baseado nas configurações do PDV
  const getFilteredMenuItems = () => {
    return allMenuPDVItems.filter(item => {
      // Se for o item 'comandas', só mostrar se a configuração estiver habilitada
      if (item.id === 'comandas') {
        return pdvConfig?.comandas === true;
      }
      // Se for o item 'mesas', só mostrar se a configuração estiver habilitada
      if (item.id === 'mesas') {
        return pdvConfig?.mesas === true;
      }
      // Se for o item 'delivery', só mostrar se a configuração estiver habilitada
      if (item.id === 'delivery') {
        return pdvConfig?.delivery === true;
      }
      // Se for o item 'cardapio-digital', só mostrar se a configuração estiver habilitada
      if (item.id === 'cardapio-digital') {
        return pdvConfig?.cardapio_digital === true;
      }
      // Se for o item 'whatsapp', só mostrar se a configuração de delivery como chat IA estiver habilitada
      if (item.id === 'whatsapp') {
        return pdvConfig?.delivery_chat_ia === true;
      }
      // Se for o item 'fiados', só mostrar se a configuração estiver habilitada
      if (item.id === 'fiados') {
        return pdvConfig?.fiado === true;
      }
      // Se for um dos itens de controle de caixa, só mostrar se a configuração estiver habilitada
      if (['sangria', 'suprimento', 'pagamentos'].includes(item.id)) {
        return pdvConfig?.controla_caixa === true;
      }
      // Para outros itens, sempre mostrar (pode adicionar outras condições aqui)
      return true;
    });
  };

  // Obter itens do menu filtrados
  const menuPDVItems = getFilteredMenuItems();

  // Função para obter classes de cor
  const getColorClasses = (color: string) => {
    const colorMap = {
      primary: 'hover:text-primary-400 hover:bg-primary-500/10',
      red: 'hover:text-red-400 hover:bg-red-500/10',
      green: 'hover:text-green-400 hover:bg-green-500/10',
      blue: 'hover:text-blue-400 hover:bg-blue-500/10',
      yellow: 'hover:text-yellow-400 hover:bg-yellow-500/10',
      purple: 'hover:text-purple-400 hover:bg-purple-500/10'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.primary;
  };

  // Funções para navegação do menu PDV
  const calcularItensVisiveis = () => {
    if (typeof window === 'undefined') return 9;
    const larguraTela = window.innerWidth;
    const larguraBotaoNavegacao = 40; // Largura dos botões < e >
    const larguraMinimaBotao = 120;

    // Ajustar largura disponível baseado se há itens no carrinho
    // Se há itens no carrinho, a área principal ocupa 67% da tela (2/3)
    const larguraAreaPrincipal = carrinho.length > 0 ? larguraTela * 0.67 : larguraTela;

    // Calcular quantos botões cabem (considerando espaço para botões de navegação se necessário)
    const larguraDisponivel = larguraAreaPrincipal - (menuStartIndex > 0 || menuStartIndex + visibleMenuItems < menuPDVItems.length ? larguraBotaoNavegacao * 2 : 0);
    const itensPossiveis = Math.floor(larguraDisponivel / larguraMinimaBotao);

    return Math.max(1, Math.min(itensPossiveis, menuPDVItems.length));
  };

  const navegarMenuAnterior = () => {
    setMenuStartIndex(Math.max(0, menuStartIndex - 1));
  };

  const navegarMenuProximo = () => {
    const maxIndex = Math.max(0, menuPDVItems.length - visibleMenuItems);
    setMenuStartIndex(Math.min(maxIndex, menuStartIndex + 1));
  };

  // Calcular itens visíveis baseado no tamanho da tela e estado do carrinho
  useEffect(() => {
    const handleResize = () => {
      const novosItensVisiveis = calcularItensVisiveis();
      setVisibleMenuItems(novosItensVisiveis);

      // Ajustar startIndex se necessário
      const maxIndex = Math.max(0, menuPDVItems.length - novosItensVisiveis);
      if (menuStartIndex > maxIndex) {
        setMenuStartIndex(maxIndex);
      }
    };

    handleResize(); // Calcular inicialmente
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [menuStartIndex, menuPDVItems.length, carrinho.length]); // Adicionar carrinho.length como dependência

  // useEffect para aplicar filtros quando os estados mudarem
  useEffect(() => {
    aplicarFiltrosPedidos();
  }, [pedidos, searchPedidos, statusFilterPedidos]);

  // Listener para eventos de mudança na configuração do PDV
  useEffect(() => {
    const handlePdvConfigChange = (event: CustomEvent) => {
      const { field, value, config } = event.detail;

      // Atualizar configuração local
      setPdvConfig(config);

      // Log para debug (pode remover em produção)
      console.log(`Configuração PDV atualizada: ${field} = ${value}`);
    };

    // Listener para mudança de status dos pedidos
    const handlePedidoStatusChange = (event: CustomEvent) => {
      const { pedidosIds, novoStatus, numeroVenda } = event.detail;

      console.log(`Status dos pedidos ${pedidosIds.join(', ')} atualizado para: ${novoStatus} (Venda: ${numeroVenda})`);

      // Aguardar um pouco para garantir que a atualização no banco foi processada
      setTimeout(() => {
        // Recarregar contador de pedidos pendentes
        loadContadorPedidos();

        // Se o modal de pedidos estiver aberto, recarregar a lista
        const modalElement = document.querySelector('[data-modal="pedidos"]');
        if (modalElement) {
          loadPedidos();
        }
      }, 1000); // 1 segundo de delay
    };



    // Listener para venda cancelada
    const handleVendaCancelada = (event: CustomEvent) => {
      const {
        vendaId,
        numeroVenda,
        motivoCancelamento,
        canceladaEm,
        canceladaPorUsuarioId,
        nomeUsuarioCancelamento
      } = event.detail;

      // Atualizar a venda na lista local
      setVendas(prevVendas =>
        prevVendas.map(venda =>
          venda.id === vendaId
            ? {
                ...venda,
                status_venda: 'cancelada',
                cancelada_em: canceladaEm,
                motivo_cancelamento: motivoCancelamento,
                cancelada_por_usuario_id: canceladaPorUsuarioId,
                usuario_cancelamento: { nome: nomeUsuarioCancelamento }
              }
            : venda
        )
      );
    };

    // Adicionar listeners para os eventos customizados
    window.addEventListener('pdvConfigChanged', handlePdvConfigChange as EventListener);
    window.addEventListener('pedidoStatusChanged', handlePedidoStatusChange as EventListener);
    window.addEventListener('vendaCancelada', handleVendaCancelada as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('pdvConfigChanged', handlePdvConfigChange as EventListener);
      window.removeEventListener('pedidoStatusChanged', handlePedidoStatusChange as EventListener);
      window.removeEventListener('vendaCancelada', handleVendaCancelada as EventListener);
    };
  }, []);



  // Atualizar data e hora a cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // useEffect para aplicar filtros automaticamente quando mudarem
  useEffect(() => {
    if (showMovimentosModal) {
      const timeoutId = setTimeout(() => {
        loadVendas();
      }, 300); // Debounce de 300ms para evitar muitas chamadas

      return () => clearTimeout(timeoutId);
    }
  }, [filtroStatus, filtroDataInicio, filtroDataFim, filtroNumeroVenda, filtroNumeroPedido, showMovimentosModal]);

  // Estado para captura automática de código de barras
  const [codigoBarrasBuffer, setCodigoBarrasBuffer] = useState('');
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Listener global para captura de código de barras, F1-F9 e ESC
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Capturar teclas F1-F9 para atalhos do menu PDV
      if (event.key.startsWith('F') && event.key.length <= 3) {
        const fNumber = parseInt(event.key.substring(1));
        if (fNumber >= 1 && fNumber <= 9) {
          event.preventDefault();
          const menuIndex = fNumber - 1;
          if (menuPDVItems[menuIndex]) {
            menuPDVItems[menuIndex].onClick();
          }
          return;
        }
      }

      // Capturar ESC globalmente para fechar modal de produtos
      if (event.key === 'Escape' && showAreaProdutos) {
        event.preventDefault();
        setShowAreaProdutos(false);
        return;
      }

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

    // Sempre adicionar listener para F1-F9, ESC, e condicionalmente para código de barras
    document.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [pdvConfig?.venda_codigo_barras, codigoBarrasBuffer, timeoutId, showAreaProdutos, menuPDVItems]);

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

  // Função para carregar contador de pedidos pendentes
  const loadContadorPedidos = async () => {
    await withSessionCheck(async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select('empresa_id')
          .eq('id', userData.user.id)
          .single();

        if (!usuarioData?.empresa_id) return;

        const contador = await contarPedidosPendentes(usuarioData.empresa_id);
        setContadorPedidosPendentes(contador);
      } catch (error) {
        console.error('Erro ao carregar contador de pedidos:', error);
      }
    });
  };

  // Subscription em tempo real para pedidos + Polling como fallback
  useEffect(() => {
    let subscription: any = null;
    let pollingInterval: NodeJS.Timeout | null = null;

    const setupRealtimeSubscription = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select('empresa_id')
          .eq('id', userData.user.id)
          .single();

        if (!usuarioData?.empresa_id) return;

        // Subscription para mudanças na tabela pedidos
        subscription = supabase
          .channel(`pedidos-realtime-${usuarioData.empresa_id}`)
          .on('postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'pedidos',
              filter: `empresa_id=eq.${usuarioData.empresa_id}`
            },
            (payload) => {
              // Recalcula contador completo para garantir precisão
              loadContadorPedidos();
            }
          )
          .on('postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'pedidos',
              filter: `empresa_id=eq.${usuarioData.empresa_id}`
            },
            (payload) => {
              // Recalcula contador quando status muda
              loadContadorPedidos();
            }
          )
          .on('postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'pedidos',
              filter: `empresa_id=eq.${usuarioData.empresa_id}`
            },
            (payload) => {
              // Recalcula contador quando pedido é deletado
              loadContadorPedidos();
            }
          )
          .subscribe((status) => {
            if (status === 'CHANNEL_ERROR') {
              setupPolling();
            }
          });

      } catch (error) {
        setupPolling();
      }
    };

    // Polling automático como backup (sempre ativo)
    const setupPolling = () => {
      pollingInterval = setInterval(() => {
        loadContadorPedidos();
      }, 8000); // A cada 8 segundos - totalmente automático
    };

    setupRealtimeSubscription();
    // Sempre inicia o polling automático como backup
    setupPolling();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, []);

  // Função para verificar empresa e atualizar contador
  const checkEmpresaAndUpdateCounter = async (empresaId: string) => {
    await withSessionCheck(async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select('empresa_id')
          .eq('id', userData.user.id)
          .single();

        // Só atualiza se for da mesma empresa
        if (usuarioData?.empresa_id === empresaId) {
          const contador = await contarPedidosPendentes(empresaId);
          setContadorPedidosPendentes(contador);
        }
      } catch (error) {
        console.error('Erro ao verificar empresa e atualizar contador:', error);
      }
    });
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
        codigo_barras,
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
        .select('produto_id, quantidade, tipo_movimento')
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

          if (item.tipo_movimento === 'entrada') {
            estoqueProcessado[item.produto_id].total += item.quantidade;
          } else if (item.tipo_movimento === 'saida') {
            estoqueProcessado[item.produto_id].total -= item.quantidade;
          }
        });
      }

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
        venda_codigo_barras: false,
        forca_venda_fiscal_cartao: false,
        observacao_no_item: false,
        desconto_no_item: false,
        editar_nome_produto: false,
        fiado: false,
        ocultar_finalizar_com_impressao: false,
        ocultar_finalizar_sem_impressao: false,
        ocultar_nfce_com_impressao: false,
        ocultar_nfce_sem_impressao: false,
        ocultar_nfce_producao: false,
        ocultar_producao: false
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

  const loadPedidos = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', userData.user.id)
      .single();

    if (!usuarioData?.empresa_id) return;

    // Removido setLoadingPedidos(true) para evitar loading visual desnecessário
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          numero,
          created_at,
          status,
          valor_total,
          empresa_id,
          desconto_prazo_id,
          desconto_valor_id,
          usuario_id,
          cliente:clientes(id, nome, telefone),
          pedidos_itens(
            id,
            quantidade,
            valor_unitario,
            valor_total,
            produto:produtos(
              id,
              nome,
              preco,
              codigo,
              codigo_barras,
              descricao,
              promocao,
              tipo_desconto,
              valor_desconto,
              unidade_medida_id,
              grupo_id,
              produto_fotos(url, principal)
            )
          )
        `)
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('deletado', false)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      let pedidosData = data || [];

      // Buscar nomes dos usuários se houver pedidos com usuario_id
      if (pedidosData.length > 0) {
        const usuarioIds = [...new Set(pedidosData.filter(p => p.usuario_id).map(p => p.usuario_id))];

        if (usuarioIds.length > 0) {
          const { data: usuariosData } = await supabase
            .from('usuarios')
            .select('id, nome')
            .in('id', usuarioIds);

          if (usuariosData) {
            // Criar mapa de ID -> nome
            const usuariosMap = usuariosData.reduce((acc, user) => {
              acc[user.id] = user.nome;
              return acc;
            }, {} as Record<string, string>);

            // Adicionar nome do usuário aos pedidos
            pedidosData = pedidosData.map(pedido => ({
              ...pedido,
              usuario: pedido.usuario_id ? {
                id: pedido.usuario_id,
                nome: usuariosMap[pedido.usuario_id] || 'Usuário não encontrado'
              } : null
            }));
          }
        }
      }

      setPedidos(pedidosData);
      // Aplicar filtros após carregar
      aplicarFiltrosPedidos(pedidosData);
      // Atualizar contador apenas com pedidos pendentes
      const pedidosPendentes = pedidosData.filter(p => p.status === 'pendente');
      setContadorPedidosPendentes(pedidosPendentes.length);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      toast.error('Erro ao carregar pedidos');
    }
    // Removido setLoadingPedidos(false) para manter consistência
  };

  // Função para aplicar filtros nos pedidos
  const aplicarFiltrosPedidos = (pedidosParaFiltrar = pedidos) => {
    let filtered = [...pedidosParaFiltrar];

    // Aplicar filtro de status
    if (statusFilterPedidos !== 'todos') {
      filtered = filtered.filter(pedido => pedido.status === statusFilterPedidos);
    }

    // Aplicar filtro de busca
    if (searchPedidos.trim()) {
      const termoLower = searchPedidos.toLowerCase();
      filtered = filtered.filter(pedido =>
        pedido.numero.toString().includes(termoLower) ||
        pedido.cliente?.nome?.toLowerCase().includes(termoLower) ||
        pedido.cliente?.telefone?.includes(searchPedidos)
      );
    }

    setPedidosFiltrados(filtered);
  };

  // Função para filtrar pedidos por termo de busca
  const filtrarPedidos = (termo: string) => {
    setSearchPedidos(termo);
    aplicarFiltrosPedidos();
  };

  // Função para filtrar pedidos por status
  const filtrarPedidosPorStatus = (status: string) => {
    setStatusFilterPedidos(status);
    aplicarFiltrosPedidos();
  };

  // Função para importar pedido para o carrinho (com confirmação)
  const importarPedidoParaCarrinho = (pedido: any) => {
    if (!pedido.pedidos_itens || pedido.pedidos_itens.length === 0) {
      toast.error('Este pedido não possui itens');
      setShowPedidosModal(false);
      return;
    }

    // Verificar se o pedido já foi importado
    const jaImportado = pedidosImportados.some(p => p.id === pedido.id);
    if (jaImportado) {
      toast.warning(`Pedido #${pedido.numero} já foi importado!`);
      setShowPedidosModal(false);
      return;
    }

    // Verificar se há cliente diferente no carrinho
    const clienteAtual = clienteSelecionado;
    const clienteDoPedido = pedido.cliente;

    if (clienteAtual && clienteDoPedido && clienteAtual.id !== clienteDoPedido.id) {
      toast.error('Não é possível importar pedido de cliente diferente. Limpe o carrinho primeiro.');
      setShowPedidosModal(false);
      return;
    }

    // Se há itens no carrinho de outros pedidos, mostrar modal de confirmação
    const temItensDeOutrosPedidos = carrinho.some(item => !item.pedido_origem_id);
    if (temItensDeOutrosPedidos) {
      setPedidoParaImportar(pedido);
      setShowConfirmImportarPedido(true);
      // Não fechar o modal aqui pois vai abrir o modal de confirmação
    } else {
      // Se não há conflitos, importar diretamente
      executarImportacaoPedido(pedido);
      // O modal será fechado dentro da função executarImportacaoPedido
    }
  };

  // Função para carregar vendas do PDV da empresa
  const loadVendas = async () => {
    try {
      setLoadingVendas(true);

      // Obter usuário autenticado
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error('Usuário não autenticado');
      }

      // Obter empresa do usuário
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (usuarioError || !usuarioData) {
        throw new Error('Dados do usuário não encontrados');
      }

      // Carregar vendas da tabela PDV da empresa
      let query = supabase
        .from('pdv')
        .select(`
          id,
          numero_venda,
          data_venda,
          created_at,
          status_venda,
          valor_total,
          valor_subtotal,
          valor_desconto,
          valor_acrescimo,
          nome_cliente,
          telefone_cliente,
          pedidos_importados,
          cancelada_em,
          motivo_cancelamento,
          cancelada_por_usuario_id,
          empresa_id,
          usuario_id
        `)
        .eq('empresa_id', usuarioData.empresa_id);

      // Aplicar filtros
      // Filtro por status
      if (filtroStatus === 'canceladas') {
        query = query.eq('status_venda', 'cancelada');
      } else if (filtroStatus === 'finalizadas') {
        query = query.eq('status_venda', 'finalizada');
      } else if (filtroStatus === 'pedidos') {
        query = query.not('pedidos_importados', 'is', null);
      }
      // 'todas' não aplica filtro de status

      // Filtro por data e hora
      if (filtroDataInicio) {
        // Para datetime-local, usar diretamente o valor (já inclui hora)
        const dataInicio = new Date(filtroDataInicio);
        query = query.gte('created_at', dataInicio.toISOString());
      }

      if (filtroDataFim) {
        // Para datetime-local, usar diretamente o valor (já inclui hora)
        const dataFim = new Date(filtroDataFim);
        query = query.lte('created_at', dataFim.toISOString());
      }

      // Filtro por número da venda
      if (filtroNumeroVenda) {
        query = query.ilike('numero_venda', `%${filtroNumeroVenda}%`);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        throw error;
      }

      const vendasData = data || [];



      // Buscar informações dos usuários (vendedores e quem cancelou)
      const usuariosIds = [
        ...new Set([
          ...vendasData.map(v => v.usuario_id).filter(Boolean),
          ...vendasData.map(v => v.cancelada_por_usuario_id).filter(Boolean)
        ])
      ];

      let usuariosMap = new Map();
      if (usuariosIds.length > 0) {
        const { data: usuariosData } = await supabase
          .from('usuarios')
          .select('id, nome')
          .in('id', usuariosIds);

        if (usuariosData) {
          usuariosData.forEach(usuario => {
            usuariosMap.set(usuario.id, usuario);
          });
        }
      }

      // Processar dados das vendas do PDV
      const vendasProcessadas = await Promise.all(vendasData.map(async (venda) => {
        // Verificar se a venda tem pedidos importados
        const temPedidosImportados = venda.pedidos_importados &&
          Array.isArray(venda.pedidos_importados) &&
          venda.pedidos_importados.length > 0;

        // Calcular valor final (valor_total - desconto + acréscimo)
        const valorTotal = Number(venda.valor_total) || 0;
        const valorDesconto = Number(venda.valor_desconto) || 0;
        const valorAcrescimo = Number(venda.valor_acrescimo) || 0;
        const valorFinal = valorTotal - valorDesconto + valorAcrescimo;

        // Se tem pedidos importados, buscar os números dos pedidos
        let pedidosOrigem = null;
        if (temPedidosImportados) {
          try {
            const { data: pedidosData, error: pedidosError } = await supabase
              .from('pedidos')
              .select('id, numero')
              .in('id', venda.pedidos_importados);

            if (!pedidosError && pedidosData) {
              pedidosOrigem = pedidosData.map(p => p.numero);
            }
          } catch (error) {
            console.error('Erro ao buscar números dos pedidos:', error);
            // Em caso de erro, usar os IDs como fallback
            pedidosOrigem = venda.pedidos_importados;
          }
        }

        return {
          ...venda,
          numero_venda: venda.numero_venda || venda.id, // Usar numero_venda ou ID como fallback
          created_at: new Date(venda.data_venda || venda.created_at).toLocaleString('pt-BR'),
          data_venda_formatada: new Date(venda.data_venda || venda.created_at).toLocaleString('pt-BR'),
          cancelada_em_formatada: venda.cancelada_em ? new Date(venda.cancelada_em).toLocaleString('pt-BR') : null,
          valor_total: valorTotal,
          valor_final: valorFinal,
          desconto_total: valorDesconto,
          acrescimo_total: valorAcrescimo,
          // Se tem pedidos importados, mostrar números dos pedidos
          pedidos_origem: pedidosOrigem,
          vendas_pdv_itens: [], // Será carregado separadamente se necessário
          vendas_pdv_pagamentos: [], // Será carregado separadamente se necessário
          cliente: venda.nome_cliente ? {
            nome: venda.nome_cliente,
            telefone: venda.telefone_cliente
          } : null,
          // Dados do usuário que fez a venda
          usuario_venda: venda.usuario_id ? usuariosMap.get(venda.usuario_id) : null,
          // Dados do usuário que cancelou (se aplicável)
          usuario_cancelamento: venda.cancelada_por_usuario_id ? usuariosMap.get(venda.cancelada_por_usuario_id) : null,
          status: venda.status_venda || 'finalizada'
        };
      }));

      // Filtro por número de pedido (aplicado após processamento)
      let vendasFiltradas = vendasProcessadas;
      if (filtroNumeroPedido) {
        vendasFiltradas = vendasProcessadas.filter(venda => {
          if (venda.pedidos_origem && Array.isArray(venda.pedidos_origem)) {
            return venda.pedidos_origem.some((numeroPedido: string) =>
              numeroPedido.toString().toLowerCase().includes(filtroNumeroPedido.toLowerCase())
            );
          }
          return false;
        });
      }

      setVendas(vendasFiltradas);

    } catch (error: any) {
      console.error('Erro ao carregar vendas:', error);
      toast.error(`Erro ao carregar vendas: ${error.message}`);
    } finally {
      setLoadingVendas(false);
    }
  };

  // Função para cancelar uma venda
  const cancelarVenda = async () => {
    if (!vendaParaCancelar || !motivoCancelamento.trim()) {
      toast.error('Motivo do cancelamento é obrigatório');
      return;
    }

    try {
      // Obter dados do usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('Usuário não autenticado');
        return;
      }

      // Atualizar a venda no banco de dados
      const { error } = await supabase
        .from('pdv')
        .update({
          status_venda: 'cancelada',
          cancelada_em: new Date().toISOString(),
          motivo_cancelamento: motivoCancelamento.trim(),
          cancelada_por_usuario_id: userData.user.id
        })
        .eq('id', vendaParaCancelar.id);

      if (error) {
        throw error;
      }

      toast.success(`Venda #${vendaParaCancelar.numero_venda} cancelada com sucesso`);

      // Buscar nome do usuário que cancelou
      const { data: usuarioCancelamento } = await supabase
        .from('usuarios')
        .select('nome')
        .eq('id', userData.user.id)
        .single();

      // Disparar evento customizado para atualizar a venda na lista
      const vendaCanceladaEvent = new CustomEvent('vendaCancelada', {
        detail: {
          vendaId: vendaParaCancelar.id,
          numeroVenda: vendaParaCancelar.numero_venda,
          motivoCancelamento: motivoCancelamento.trim(),
          canceladaEm: new Date().toISOString(),
          canceladaPorUsuarioId: userData.user.id,
          nomeUsuarioCancelamento: usuarioCancelamento?.nome || 'Usuário não identificado'
        }
      });
      window.dispatchEvent(vendaCanceladaEvent);

      // Fechar modal e limpar estados
      setShowCancelamentoModal(false);
      setVendaParaCancelar(null);
      setMotivoCancelamento('');

    } catch (error) {
      console.error('Erro ao cancelar venda:', error);
      toast.error('Erro ao cancelar venda');
    }
  };

  // Função para carregar itens da venda
  const carregarItensVenda = async (vendaId: string) => {
    try {
      setLoadingItensVenda(true);

      // Carregar itens da venda com suas opções adicionais
      const { data: itensData, error: itensError } = await supabase
        .from('pdv_itens')
        .select(`
          id,
          produto_id,
          codigo_produto,
          nome_produto,
          descricao_produto,
          quantidade,
          valor_unitario,
          valor_subtotal,
          valor_total_item,
          tem_desconto,
          tipo_desconto,
          percentual_desconto,
          valor_desconto_aplicado,
          origem_item,
          pedido_origem_numero,
          observacao_item,
          pdv_itens_adicionais (
            id,
            nome_adicional,
            quantidade,
            valor_unitario,
            valor_total
          )
        `)
        .eq('pdv_id', vendaId)
        .order('created_at', { ascending: true });

      if (itensError) {
        throw itensError;
      }

      setItensVenda(itensData || []);

    } catch (error) {
      console.error('Erro ao carregar itens da venda:', error);
      toast.error('Erro ao carregar itens da venda');
    } finally {
      setLoadingItensVenda(false);
    }
  };

  // Função para gerar o link público do pedido
  const gerarLinkPedido = async (pedido: any) => {
    try {
      console.log('Pedido recebido:', pedido); // Debug
      console.log('empresa_id:', pedido.empresa_id); // Debug

      // Se não temos empresa_id no pedido, buscar do usuário atual
      let empresaId = pedido.empresa_id;
      if (!empresaId) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('Usuário não autenticado');

        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select('empresa_id')
          .eq('id', userData.user.id)
          .single();

        if (!usuarioData?.empresa_id) throw new Error('Empresa do usuário não encontrada');
        empresaId = usuarioData.empresa_id;
      }

      // Buscar o CNPJ da empresa
      const { data: empresaData, error: empresaError } = await supabase
        .from('empresas')
        .select('documento')
        .eq('id', empresaId)
        .single();

      if (empresaError || !empresaData || !empresaData.documento) {
        throw new Error('Não foi possível obter o CNPJ da empresa');
      }

      // Remover caracteres não numéricos do CNPJ (pontos, traços, barras)
      const cnpjLimpo = empresaData.documento.replace(/[^\d]/g, '');

      // Gerar o código do pedido (CNPJ + número do pedido)
      const codigoPedido = `${cnpjLimpo}${pedido.numero}`;

      // Gerar a URL completa
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/pedido/${codigoPedido}`;

      return url;
    } catch (error: any) {
      console.error('Erro ao gerar link do pedido:', error);
      toast.error(`Erro ao gerar link: ${error.message}`);
      return null;
    }
  };

  // Função que executa a importação do pedido
  const executarImportacaoPedido = (pedido: any) => {
    // Adicionar pedido à lista de importados com informações de desconto
    const novoPedidoImportado = {
      numero: pedido.numero,
      id: pedido.id,
      cliente: pedido.cliente,
      created_at: pedido.created_at,
      valor_total: pedido.valor_total,
      desconto_prazo_id: pedido.desconto_prazo_id,
      desconto_valor_id: pedido.desconto_valor_id,
      usuario: pedido.usuario // Incluir informações do vendedor
    };

    setPedidosImportados(prev => [...prev, novoPedidoImportado]);

    // Importar cliente do pedido se existir e não houver cliente selecionado
    if (pedido.cliente && !clienteSelecionado) {
      setClienteSelecionado({
        id: pedido.cliente.id,
        nome: pedido.cliente.nome,
        telefone: pedido.cliente.telefone
      });

      // Carregar descontos do cliente
      carregarDescontosCliente(pedido.cliente.id);
    } else if (pedido.cliente && clienteSelecionado && clienteSelecionado.id === pedido.cliente.id) {
      // Se é o mesmo cliente, garantir que os descontos estejam carregados
      if (descontosCliente.prazo.length === 0 && descontosCliente.valor.length === 0) {
        carregarDescontosCliente(pedido.cliente.id);
      }
    } else if (pedido.cliente) {
      // Se há cliente no pedido mas é diferente do selecionado, carregar descontos
      carregarDescontosCliente(pedido.cliente.id);
    }

    // Importar desconto por prazo se existir no pedido
    if (pedido.desconto_prazo_id) {
      setDescontoPrazoSelecionado(pedido.desconto_prazo_id);
    }

    // Converter itens do pedido para formato do carrinho
    const novosItens: ItemCarrinho[] = pedido.pedidos_itens.map((item: any) => {
      // Verificar se há desconto no item (valor unitário diferente do preço do produto)
      const temDesconto = item.produto?.preco && item.valor_unitario < item.produto.preco;
      const precoOriginal = item.produto?.preco || item.valor_unitario;

      let descontoInfo = undefined;
      if (temDesconto) {
        const valorDesconto = precoOriginal - item.valor_unitario;
        const percentualDesconto = ((valorDesconto / precoOriginal) * 100);

        descontoInfo = {
          tipo: 'valor' as const,
          valor: valorDesconto,
          valorDesconto: valorDesconto,
          precoOriginal: precoOriginal,
          precoComDesconto: item.valor_unitario,
          percentualDesconto: percentualDesconto,
          origemPedido: true // Marcar que veio de um pedido importado
        };
      }

      return {
        id: `${item.produto.id}-${Date.now()}-${Math.random()}`,
        produto: item.produto,
        quantidade: item.quantidade,
        subtotal: item.quantidade * item.valor_unitario,
        pedido_origem_id: pedido.id, // Marcar de qual pedido veio
        pedido_origem_numero: pedido.numero,
        desconto: descontoInfo // Preservar informações de desconto
      };
    });

    // Verificar configuração de agrupamento
    if (pdvConfig?.agrupa_itens) {
      // Agrupar itens iguais
      const carrinhoAtualizado = [...carrinho];

      novosItens.forEach(novoItem => {
        const itemExistente = carrinhoAtualizado.find(item =>
          item.produto.id === novoItem.produto.id &&
          item.subtotal / item.quantidade === novoItem.subtotal / novoItem.quantidade // Mesmo preço unitário
        );

        if (itemExistente) {
          // Agrupar: somar quantidade e recalcular subtotal
          itemExistente.quantidade += novoItem.quantidade;
          itemExistente.subtotal = itemExistente.quantidade * (itemExistente.subtotal / (itemExistente.quantidade - novoItem.quantidade));
          // Manter referência dos pedidos de origem
          if (!itemExistente.pedidos_origem) {
            itemExistente.pedidos_origem = [];
          }
          itemExistente.pedidos_origem.push({
            id: pedido.id,
            numero: pedido.numero,
            quantidade: novoItem.quantidade
          });
        } else {
          // Adicionar como novo item
          carrinhoAtualizado.push(novoItem);
        }
      });

      setCarrinho(carrinhoAtualizado);
    } else {
      // Não agrupar: adicionar todos os itens separadamente
      setCarrinho(prev => [...prev, ...novosItens]);
    }

    setShowPedidosModal(false);
    toast.success(`Pedido #${pedido.numero} importado com sucesso! ${novosItens.length} produto(s) adicionado(s).`);
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

  // Função para verificar se um produto tem opções adicionais
  const verificarOpcoesAdicionais = async (produtoId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('produtos_opcoes_adicionais')
        .select('id')
        .eq('produto_id', produtoId)
        .eq('deletado', false)
        .limit(1);

      if (error) {
        console.error('Erro ao verificar opções adicionais:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Erro ao verificar opções adicionais:', error);
      return false;
    }
  };

  const adicionarAoCarrinho = async (produto: Produto, quantidadePersonalizada?: number) => {
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

    // Verificar se o produto tem opções adicionais
    const temOpcoesAdicionais = await verificarOpcoesAdicionais(produto.id);

    // Calcular o preço final considerando promoções
    const precoFinal = calcularPrecoFinal(produto);

    // Criar o item do carrinho
    const novoItem: ItemCarrinho = {
      id: `${produto.id}-${Date.now()}-${Math.random()}`, // ID único
      produto,
      quantidade: quantidadeParaAdicionar,
      subtotal: precoFinal * quantidadeParaAdicionar,
      temOpcoesAdicionais
    };

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
                  subtotal: (item.quantidade + quantidadeParaAdicionar) * precoFinal,
                  temOpcoesAdicionais
                }
              : item
          );
        } else {
          return [...prev, novoItem];
        }
      } else {
        // Comportamento novo: sempre adiciona como item separado
        return [...prev, novoItem];
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
              precoComDesconto,
              percentualDesconto: tipoDesconto === 'percentual' ? valor : undefined
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

  // Funções para gerenciar opções adicionais
  const abrirOpcoesAdicionais = (item: ItemCarrinho) => {
    setProdutoParaAdicionais(item.produto);
    setItemCarrinhoParaAdicionais(item.id);
    setShowOpcoesAdicionaisModal(true);
  };

  // Funções para edição de nome do produto
  const iniciarEdicaoNome = (itemId: string, nomeAtual: string) => {
    setItemEditandoNome(itemId);
    setNomeEditando(nomeAtual);
  };

  const finalizarEdicaoNome = (itemId: string) => {
    if (nomeEditando.trim() === '') {
      // Se o nome estiver vazio, cancela a edição
      cancelarEdicaoNome();
      return;
    }

    // Atualizar o nome do produto no carrinho
    setCarrinho(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, produto: { ...item.produto, nome: nomeEditando.trim() } }
        : item
    ));

    // Limpar estados de edição
    setItemEditandoNome(null);
    setNomeEditando('');
  };

  const cancelarEdicaoNome = () => {
    setItemEditandoNome(null);
    setNomeEditando('');
  };

  // Funções para observação adicional
  const abrirModalObservacao = (itemId: string) => {
    const item = carrinho.find(i => i.id === itemId);
    setItemParaObservacao(itemId);
    setObservacaoTexto(item?.observacao || '');
    setShowObservacaoModal(true);
  };

  const salvarObservacao = () => {
    if (!itemParaObservacao) return;

    // Atualizar o item no carrinho com a observação
    setCarrinho(prev => prev.map(item =>
      item.id === itemParaObservacao
        ? { ...item, observacao: observacaoTexto.trim() || undefined }
        : item
    ));

    // Fechar modal e limpar estados
    setShowObservacaoModal(false);
    setItemParaObservacao(null);
    setObservacaoTexto('');

    toast.success('Observação salva com sucesso!');
  };

  const iniciarEdicaoObservacao = (itemId: string, observacaoAtual: string) => {
    setItemEditandoObservacao(itemId);
    setObservacaoEditando(observacaoAtual);
  };

  const finalizarEdicaoObservacao = (itemId: string) => {
    if (observacaoEditando.trim() === '') {
      // Se a observação estiver vazia, remove ela
      setCarrinho(prev => prev.map(item =>
        item.id === itemId
          ? { ...item, observacao: undefined }
          : item
      ));
    } else {
      // Atualizar a observação no carrinho
      setCarrinho(prev => prev.map(item =>
        item.id === itemId
          ? { ...item, observacao: observacaoEditando.trim() }
          : item
      ));
    }

    // Limpar estados de edição
    setItemEditandoObservacao(null);
    setObservacaoEditando('');
  };

  const cancelarEdicaoObservacao = () => {
    setItemEditandoObservacao(null);
    setObservacaoEditando('');
  };

  const confirmarOpcoesAdicionais = (itensSelecionados: Array<{
    item: { id: string; nome: string; preco: number; opcao_id: string };
    quantidade: number;
  }>) => {
    if (!itemCarrinhoParaAdicionais) return;

    // Converter para o formato do carrinho
    const adicionaisFormatados = itensSelecionados.map(itemSelecionado => ({
      id: itemSelecionado.item.id,
      nome: itemSelecionado.item.nome,
      preco: itemSelecionado.item.preco,
      quantidade: itemSelecionado.quantidade
    }));

    // Atualizar o item do carrinho com os adicionais
    setCarrinho(prev =>
      prev.map(item => {
        if (item.id === itemCarrinhoParaAdicionais) {
          // Adicionar aos adicionais existentes ao invés de substituir
          const adicionaisExistentes = item.adicionais || [];
          const todosAdicionais = [...adicionaisExistentes, ...adicionaisFormatados];

          // Calcular valor total dos adicionais (existentes + novos)
          const valorAdicionais = todosAdicionais.reduce((total, adicional) =>
            total + (adicional.preco * adicional.quantidade), 0
          );

          // Calcular novo subtotal (produto + todos os adicionais) * quantidade
          const precoUnitario = item.desconto ? item.desconto.precoComDesconto : calcularPrecoFinal(item.produto);
          const novoSubtotal = (precoUnitario * item.quantidade) + valorAdicionais;

          return {
            ...item,
            adicionais: todosAdicionais,
            subtotal: novoSubtotal
          };
        }
        return item;
      })
    );

    // Mostrar toast de confirmação
    const totalAdicionais = adicionaisFormatados.length;
    if (totalAdicionais > 0) {
      toast.success(`${totalAdicionais} ${totalAdicionais === 1 ? 'adicional selecionado' : 'adicionais selecionados'}!`);
    }

    setShowOpcoesAdicionaisModal(false);
    setProdutoParaAdicionais(null);
    setItemCarrinhoParaAdicionais(null);
  };

  const removerAdicional = (itemId: string, adicionalIndex: number) => {
    setCarrinho(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          const novosAdicionais = item.adicionais?.filter((_, index) => index !== adicionalIndex) || [];

          // Recalcular subtotal sem o adicional removido
          const valorAdicionais = novosAdicionais.reduce((total, adicional) =>
            total + (adicional.preco * adicional.quantidade), 0
          );

          // Usar o preço com desconto se houver, senão usar preço final do produto
          const precoBase = item.desconto ? item.desconto.precoComDesconto : calcularPrecoFinal(item.produto);
          const novoSubtotal = (precoBase * item.quantidade) + valorAdicionais;

          return {
            ...item,
            adicionais: novosAdicionais,
            subtotal: novoSubtotal
          };
        }
        return item;
      })
    );

    toast.success('Adicional removido com sucesso!');
  };

  const alterarQuantidadeAdicional = (itemId: string, adicionalIndex: number, novaQuantidade: number) => {
    if (novaQuantidade <= 0) {
      removerAdicional(itemId, adicionalIndex);
      return;
    }

    setCarrinho(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          const novosAdicionais = item.adicionais?.map((adicional, index) =>
            index === adicionalIndex
              ? { ...adicional, quantidade: novaQuantidade }
              : adicional
          ) || [];

          // Recalcular subtotal com nova quantidade
          const valorAdicionais = novosAdicionais.reduce((total, adicional) =>
            total + (adicional.preco * adicional.quantidade), 0
          );

          // Usar o preço com desconto se houver, senão usar preço final do produto
          const precoBase = item.desconto ? item.desconto.precoComDesconto : calcularPrecoFinal(item.produto);
          const novoSubtotal = (precoBase * item.quantidade) + valorAdicionais;

          return {
            ...item,
            adicionais: novosAdicionais,
            subtotal: novoSubtotal
          };
        }
        return item;
      })
    );
  };

  const calcularTotal = () => {
    return carrinho.reduce((total, item) => total + item.subtotal, 0);
  };

  // Função para calcular total com desconto aplicado (para uso em pagamentos)
  const calcularTotalComDesconto = () => {
    let subtotal = calcularTotal();

    // Aplicar desconto por prazo se selecionado
    if (descontoPrazoSelecionado) {
      const descontoPrazo = descontosCliente.prazo.find(d => d.id === descontoPrazoSelecionado);
      if (descontoPrazo) {
        const valorDescontoPrazo = (subtotal * descontoPrazo.percentual) / 100;
        if (descontoPrazo.tipo === 'desconto') {
          subtotal = subtotal - valorDescontoPrazo;
        } else {
          subtotal = subtotal + valorDescontoPrazo;
        }
      }
    }

    // Aplicar desconto por valor se aplicável
    const descontoValor = calcularDescontoPorValor(subtotal);
    if (!descontoValor) return subtotal;

    return descontoValor.tipo === 'desconto'
      ? subtotal - descontoValor.valor
      : subtotal + descontoValor.valor;
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
    setShowConfirmLimparCarrinho(true);
  };

  const limparCarrinho = () => {
    // Contar itens antes de limpar
    const totalItens = carrinho.reduce((total, item) => total + item.quantidade, 0);
    const totalProdutos = carrinho.length;
    const primeiroProduto = carrinho[0]?.produto.nome; // Salvar antes de limpar

    setCarrinho([]);
    setClienteSelecionado(null);
    setPedidosImportados([]);
    setDescontoPrazoSelecionado(null);
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



  // Funções para pagamentos parciais
  const formatCurrencyInput = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');

    // Converte para centavos
    const amount = parseFloat(numbers) / 100;

    // Formata como moeda brasileira
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const parseCurrencyToNumber = (value: string): number => {
    return parseFloat(value.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
  };

  const calcularTotalPago = (): number => {
    return pagamentosParciais.reduce((total, pagamento) => total + pagamento.valor, 0);
  };

  const calcularRestante = (): number => {
    const restante = calcularTotalComDesconto() - calcularTotalPago();
    // Se há troco (restante negativo), considera como 0 (venda quitada)
    return restante < 0 ? 0 : restante;
  };

  const adicionarPagamentoParcial = (formaId: string, formaNome: string, tipo: 'eletronico' | 'dinheiro') => {
    let valor = parseCurrencyToNumber(valorParcial);
    const totalVenda = calcularTotalComDesconto(); // Usar total com desconto
    const totalPago = calcularTotalPago();
    const restanteReal = totalVenda - totalPago; // Valor real sem limitação

    // Se não há valor digitado, usa o valor restante automaticamente
    if (valor <= 0) {
      valor = restanteReal > 0 ? restanteReal : 0;
      if (valor > 0) {
        toast.info(`Valor automático: ${formatCurrency(valor)}`);
      }
    }

    if (valor <= 0) {
      toast.error('Não há valor restante para pagamento');
      return;
    }

    // Validação para formas eletrônicas
    if (tipo === 'eletronico' && valor > restanteReal) {
      toast.error('O valor parcial não pode ultrapassar o valor restante para formas eletrônicas');
      return;
    }

    // Para dinheiro, pode ultrapassar (gera troco)
    if (tipo === 'dinheiro' && valor > restanteReal) {
      const troco = valor - restanteReal;
      setTrocoCalculado(troco);
      toast.success(`Troco: ${formatCurrency(troco)}`);
    } else {
      setTrocoCalculado(0);
    }

    // Verificar se já existe um pagamento com a mesma forma
    const pagamentoExistente = pagamentosParciais.find(p => p.forma === formaId);

    if (pagamentoExistente) {
      // Agrupar: somar o valor ao pagamento existente
      setPagamentosParciais(prev =>
        prev.map(p =>
          p.forma === formaId
            ? { ...p, valor: p.valor + valor }
            : p
        )
      );
      toast.success(`${formaNome}: ${formatCurrency(valor)} adicionado (Total: ${formatCurrency(pagamentoExistente.valor + valor)})`);
    } else {
      // Criar novo pagamento
      const novoPagamento = {
        id: Date.now(),
        forma: formaId,
        valor: valor,
        tipo: tipo
      };

      setPagamentosParciais(prev => [...prev, novoPagamento]);
      toast.success(`${formaNome}: ${formatCurrency(valor)} adicionado`);
    }

    setValorParcial('');
  };

  const confirmarRemocaoItem = (id: number) => {
    setItemToRemove(id);
    setShowConfirmRemoveItem(true);
  };

  const removerPagamentoParcial = (id: number) => {
    setPagamentosParciais(prev => prev.filter(p => p.id !== id));
    setTrocoCalculado(0);
    setShowConfirmRemoveItem(false);
    setItemToRemove(null);
    toast.success('Pagamento removido');
  };

  const confirmarLimparTodos = () => {
    setShowConfirmRemoveAll(true);
  };

  const limparPagamentosParciais = () => {
    setPagamentosParciais([]);
    setTrocoCalculado(0);
    setValorParcial('');
    setShowConfirmRemoveAll(false);
    toast.success('Todos os pagamentos removidos');
  };

  // Versão silenciosa para usar na finalização da venda
  const limparPagamentosParciaisSilencioso = () => {
    setPagamentosParciais([]);
    setTrocoCalculado(0);
    setValorParcial('');
    setShowConfirmRemoveAll(false);
  };

  // Função para verificar se a venda foi inserida corretamente no banco
  const verificarVendaNoBanco = async (vendaId: string, numeroVenda: string, totalItensEsperados: number): Promise<boolean> => {
    try {
      setEtapaProcessamento('Verificando venda no banco de dados...');

      // Aguardar um pouco para garantir que a inserção foi processada
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verificar se a venda principal existe
      const { data: vendaData, error: vendaError } = await supabase
        .from('pdv')
        .select('id, numero_venda, status_venda, valor_total')
        .eq('id', vendaId)
        .single();

      if (vendaError || !vendaData) {
        console.error('Venda não encontrada no banco:', vendaError);
        return false;
      }

      setEtapaProcessamento('Verificando itens da venda...');

      // Verificar se os itens foram inseridos
      const { data: itensData, error: itensError } = await supabase
        .from('pdv_itens')
        .select('id, produto_id, quantidade')
        .eq('pdv_id', vendaId);

      if (itensError) {
        console.error('Erro ao verificar itens:', itensError);
        return false;
      }

      const totalItensInseridos = itensData?.length || 0;

      if (totalItensInseridos !== totalItensEsperados) {
        console.error(`Número de itens incorreto. Esperado: ${totalItensEsperados}, Inserido: ${totalItensInseridos}`);
        return false;
      }

      // Verificar baixa de estoque se configurado para PDV
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return false;

      const { data: estoqueConfig } = await supabase
        .from('tipo_controle_estoque_config')
        .select('tipo_controle')
        .eq('empresa_id', usuarioData.empresa_id)
        .single();

      const tipoControle = estoqueConfig?.tipo_controle || 'pedidos';

      if (tipoControle === 'pdv') {
        setEtapaProcessamento('Verificando baixa de estoque...');

        // Agrupar itens do carrinho por produto para calcular quantidade total esperada
        const produtosAgrupados = carrinho.reduce((acc, item) => {
          const produtoId = item.produto.id;
          if (!acc[produtoId]) {
            acc[produtoId] = {
              produto: item.produto,
              quantidadeTotal: 0
            };
          }
          acc[produtoId].quantidadeTotal += item.quantidade;
          return acc;
        }, {} as Record<string, { produto: any; quantidadeTotal: number }>);

        // Verificar cada produto único
        for (const [produtoId, dadosProduto] of Object.entries(produtosAgrupados)) {
          // Verificar se existe movimentação de estoque para este produto desta venda
          const { data: movimentacaoEstoque, error: estoqueError } = await supabase
            .from('produto_estoque')
            .select('id, tipo_movimento, quantidade, observacao, data_hora_movimento')
            .eq('produto_id', produtoId)
            .eq('tipo_movimento', 'saida')
            .ilike('observacao', `%Venda PDV #${numeroVenda}%`)
            .order('data_hora_movimento', { ascending: false });

          if (estoqueError) {
            console.error('Erro ao verificar movimentação de estoque:', estoqueError);
            return false;
          }

          if (!movimentacaoEstoque || movimentacaoEstoque.length === 0) {
            console.error(`❌ Movimentação de estoque não encontrada para produto ${dadosProduto.produto.nome} (ID: ${produtoId})`);
            console.error(`   Esperado: Saída de ${dadosProduto.quantidadeTotal} unidades com observação "Venda PDV #${numeroVenda}"`);
            return false;
          }

          // Somar todas as movimentações desta venda para este produto (caso haja múltiplas)
          const quantidadeMovimentada = movimentacaoEstoque.reduce((total, mov) => total + parseFloat(mov.quantidade), 0);

          if (quantidadeMovimentada !== dadosProduto.quantidadeTotal) {
            console.error(`❌ Quantidade incorreta na movimentação de estoque para produto ${dadosProduto.produto.nome}`);
            console.error(`   Esperado: ${dadosProduto.quantidadeTotal}, Encontrado: ${quantidadeMovimentada}`);
            console.error(`   Movimentações encontradas:`, movimentacaoEstoque);
            return false;
          }

          console.log(`✅ Estoque verificado para ${dadosProduto.produto.nome}: ${quantidadeMovimentada} unidades baixadas`);
        }

        console.log('✅ Baixa de estoque verificada com sucesso para todos os itens');
      }

      setEtapaProcessamento('Verificando opções adicionais...');

      // Verificar opções adicionais se existirem
      const itensComAdicionais = carrinho.filter(item => item.adicionais && item.adicionais.length > 0);
      if (itensComAdicionais.length > 0) {
        const { data: adicionaisData, error: adicionaisError } = await supabase
          .from('pdv_itens_adicionais')
          .select('id')
          .in('pdv_item_id', itensData.map(item => item.id));

        if (adicionaisError) {
          console.error('Erro ao verificar adicionais:', adicionaisError);
          return false;
        }

        const totalAdicionaisEsperados = itensComAdicionais.reduce((total, item) =>
          total + (item.adicionais?.length || 0), 0
        );

        const totalAdicionaisInseridos = adicionaisData?.length || 0;

        if (totalAdicionaisInseridos !== totalAdicionaisEsperados) {
          console.error(`Número de adicionais incorreto. Esperado: ${totalAdicionaisEsperados}, Inserido: ${totalAdicionaisInseridos}`);
          return false;
        }
      }

      setEtapaProcessamento('Venda verificada com sucesso!');
      return true;

    } catch (error) {
      console.error('Erro na verificação da venda:', error);
      return false;
    }
  };

  // Funções para CPF/CNPJ e Nota Fiscal Paulista
  const formatCpf = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 14);
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const formatDocumento = (value: string) => {
    if (tipoDocumento === 'cpf') {
      return formatCpf(value);
    } else {
      return formatCnpj(value);
    }
  };

  const validarCpf = (cpf: string): boolean => {
    const numbers = cpf.replace(/\D/g, '');
    if (numbers.length !== 11) return false;

    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(numbers)) return false;

    // Validação do primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(numbers[i]) * (10 - i);
    }
    let digit1 = 11 - (sum % 11);
    if (digit1 >= 10) digit1 = 0;

    // Validação do segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(numbers[i]) * (11 - i);
    }
    let digit2 = 11 - (sum % 11);
    if (digit2 >= 10) digit2 = 0;

    return parseInt(numbers[9]) === digit1 && parseInt(numbers[10]) === digit2;
  };

  const validarCnpj = (cnpj: string): boolean => {
    const numbers = cnpj.replace(/\D/g, '');
    if (numbers.length !== 14) return false;

    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{13}$/.test(numbers)) return false;

    // Validação do primeiro dígito verificador
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(numbers[i]) * weights1[i];
    }
    let digit1 = sum % 11;
    digit1 = digit1 < 2 ? 0 : 11 - digit1;

    // Validação do segundo dígito verificador
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(numbers[i]) * weights2[i];
    }
    let digit2 = sum % 11;
    digit2 = digit2 < 2 ? 0 : 11 - digit2;

    return parseInt(numbers[12]) === digit1 && parseInt(numbers[13]) === digit2;
  };

  const buscarClientePorDocumento = async (documento: string) => {
    const numbers = documento.replace(/\D/g, '');
    if (numbers.length < 11) return;

    try {
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
        .or(`cpf.eq.${numbers},cnpj.eq.${numbers}`)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar cliente:', error);
        return;
      }

      if (data) {
        setClienteEncontrado(data);
      } else {
        setClienteEncontrado(null);
      }
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
    }
  };

  const handleCpfCnpjChange = (value: string) => {
    const formatted = formatDocumento(value);
    setCpfCnpjNota(formatted);

    const numbers = value.replace(/\D/g, '');
    const expectedLength = tipoDocumento === 'cpf' ? 11 : 14;

    if (numbers.length === expectedLength) {
      const isValid = tipoDocumento === 'cpf' ? validarCpf(formatted) : validarCnpj(formatted);
      if (isValid) {
        buscarClientePorDocumento(formatted);
      } else {
        setClienteEncontrado(null);
      }
    } else {
      setClienteEncontrado(null);
    }
  };

  const handleTipoDocumentoChange = (tipo: 'cpf' | 'cnpj') => {
    setTipoDocumento(tipo);
    setCpfCnpjNota('');
    setClienteEncontrado(null);
    setErroValidacao('');
  };

  const validarDocumentoOnBlur = () => {
    if (!cpfCnpjNota.trim()) {
      setErroValidacao('');
      return;
    }

    const numbers = cpfCnpjNota.replace(/\D/g, '');
    const expectedLength = tipoDocumento === 'cpf' ? 11 : 14;

    if (numbers.length !== expectedLength) {
      setErroValidacao(`${tipoDocumento.toUpperCase()} deve ter ${expectedLength} dígitos`);
      return;
    }

    const isValid = tipoDocumento === 'cpf' ? validarCpf(cpfCnpjNota) : validarCnpj(cpfCnpjNota);

    if (!isValid) {
      setErroValidacao(`${tipoDocumento.toUpperCase()} inválido`);
    } else {
      setErroValidacao('');
    }
  };

  // Função para verificar se o documento é inválido (para bloquear botões NFC-e)
  const isDocumentoInvalido = (): boolean => {
    if (!cpfCnpjNota.trim()) return false; // Se vazio, não é inválido (pode ser consumidor final)

    const numbers = cpfCnpjNota.replace(/\D/g, '');
    const expectedLength = tipoDocumento === 'cpf' ? 11 : 14;

    // Se não tem o tamanho correto, é inválido
    if (numbers.length !== expectedLength) return true;

    // Se tem o tamanho correto, valida o documento
    const isValid = tipoDocumento === 'cpf' ? validarCpf(cpfCnpjNota) : validarCnpj(cpfCnpjNota);
    return !isValid;
  };

  // Função para verificar se pelo menos um botão de NFC-e está ativo
  const temBotaoNfceAtivo = (): boolean => {
    return !pdvConfig?.ocultar_nfce_com_impressao ||
           !pdvConfig?.ocultar_nfce_sem_impressao ||
           !pdvConfig?.ocultar_nfce_producao;
  };

  // Função para verificar se há pagamento com cartão
  const temPagamentoCartao = () => {
    if (tipoPagamento === 'vista' && formaPagamentoSelecionada) {
      const forma = formasPagamento.find(f => f.id === formaPagamentoSelecionada);
      return forma && (forma.nome === 'Crédito' || forma.nome === 'Débito');
    }

    if (tipoPagamento === 'parcial') {
      return pagamentosParciais.some(p => {
        const forma = formasPagamento.find(f => f.id === p.forma);
        return forma && (forma.nome === 'Crédito' || forma.nome === 'Débito');
      });
    }

    return false;
  };

  // Função para verificar se deve ocultar botões de finalização simples
  const deveOcultarFinalizacaoSimples = () => {
    return pdvConfig?.forca_venda_fiscal_cartao && temPagamentoCartao();
  };

  // Função para gerar número sequencial da venda
  const gerarNumeroVenda = async (empresaId: string): Promise<string> => {
    try {
      // Buscar o último número de venda da empresa
      const { data, error } = await supabase
        .from('pdv')
        .select('numero_venda')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar último número de venda:', error);
        // Em caso de erro, usar timestamp como fallback
        return `PDV-${Date.now()}`;
      }

      let proximoNumero = 1;
      if (data && data.length > 0 && data[0].numero_venda) {
        // Extrair número da string (formato: PDV-000001)
        const ultimoNumero = data[0].numero_venda.replace('PDV-', '');
        proximoNumero = parseInt(ultimoNumero) + 1;
      }

      // Formatar com zeros à esquerda (6 dígitos)
      return `PDV-${proximoNumero.toString().padStart(6, '0')}`;
    } catch (error) {
      console.error('Erro ao gerar número de venda:', error);
      // Fallback para timestamp
      return `PDV-${Date.now()}`;
    }
  };

  // Função principal para finalizar e salvar a venda
  const finalizarVendaCompleta = async (tipoFinalizacao: string = 'finalizar_sem_impressao') => {
    if (carrinho.length === 0) {
      toast.error('Carrinho vazio! Adicione itens antes de finalizar.');
      return;
    }

    // Abrir modal de processamento
    setShowProcessandoVenda(true);
    setEtapaProcessamento('Iniciando processamento da venda...');
    setVendaProcessadaId(null);
    setNumeroVendaProcessada('');

    try {
      // Obter dados do usuário
      setEtapaProcessamento('Validando usuário...');
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setEtapaProcessamento('Erro: Usuário não autenticado');
        await new Promise(resolve => setTimeout(resolve, 2000));
        setShowProcessandoVenda(false);
        toast.error('Usuário não autenticado');
        return;
      }

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) {
        setEtapaProcessamento('Erro: Empresa não encontrada');
        await new Promise(resolve => setTimeout(resolve, 2000));
        setShowProcessandoVenda(false);
        toast.error('Empresa não encontrada');
        return;
      }

      // Gerar número da venda
      setEtapaProcessamento('Gerando número da venda...');
      const numeroVenda = await gerarNumeroVenda(usuarioData.empresa_id);
      setNumeroVendaProcessada(numeroVenda);

      // Calcular valores
      setEtapaProcessamento('Calculando valores da venda...');
      const valorSubtotal = carrinho.reduce((acc, item) => acc + item.subtotal, 0);
      const valorDescontoPrazo = descontoPrazoSelecionado ? calcularDescontoPrazo() : 0;

      // Calcular valor total considerando desconto por prazo
      // Se valorDescontoPrazo for negativo, significa que é acréscimo
      const valorTotal = valorSubtotal - valorDescontoPrazo;

      // Para salvar no banco, o valor do desconto deve ser sempre positivo
      const valorDesconto = Math.abs(valorDescontoPrazo);

      // Preparar dados do cliente
      setEtapaProcessamento('Preparando dados do cliente...');
      let clienteData = null;
      if (clienteSelecionado) {
        clienteData = {
          cliente_id: clienteSelecionado.id,
          nome_cliente: clienteSelecionado.nome,
          telefone_cliente: clienteSelecionado.telefone,
          documento_cliente: clienteSelecionado.documento,
          tipo_documento_cliente: clienteSelecionado.tipo_documento
        };
      } else if (pedidosImportados.length > 0 && pedidosImportados[0]?.cliente) {
        const cliente = pedidosImportados[0].cliente;
        clienteData = {
          cliente_id: cliente.id,
          nome_cliente: cliente.nome,
          telefone_cliente: cliente.telefone,
          documento_cliente: cliente.documento,
          tipo_documento_cliente: cliente.tipo_documento
        };
      } else if (cpfCnpjNota && clienteEncontrado) {
        clienteData = {
          cliente_id: clienteEncontrado.id,
          nome_cliente: clienteEncontrado.nome,
          telefone_cliente: clienteEncontrado.telefone,
          documento_cliente: clienteEncontrado.documento,
          tipo_documento_cliente: clienteEncontrado.tipo_documento
        };
      }

      // Preparar dados de pagamento
      setEtapaProcessamento('Preparando dados de pagamento...');
      let pagamentoData = {};
      if (tipoPagamento === 'vista' && formaPagamentoSelecionada) {
        pagamentoData = {
          tipo_pagamento: 'vista',
          forma_pagamento_id: formaPagamentoSelecionada,
          valor_pago: valorTotal,
          valor_troco: 0
        };
      } else if (tipoPagamento === 'parcial' && pagamentosParciais.length > 0) {
        const totalPago = calcularTotalPago();
        pagamentoData = {
          tipo_pagamento: 'parcial',
          formas_pagamento: pagamentosParciais,
          valor_pago: totalPago,
          valor_troco: trocoCalculado
        };
      }

      // Preparar dados da venda principal
      setEtapaProcessamento('Preparando dados da venda...');
      const vendaData = {
        empresa_id: usuarioData.empresa_id,
        usuario_id: userData.user.id,
        numero_venda: numeroVenda,
        data_venda: new Date().toISOString(),
        status_venda: 'finalizada',
        valor_subtotal: valorSubtotal,
        valor_desconto: valorDesconto,
        valor_total: valorTotal,
        desconto_prazo_id: descontoPrazoSelecionado,
        pedidos_importados: pedidosImportados.length > 0 ? pedidosImportados.map(p => p.id) : null,
        finalizada_em: new Date().toISOString(),
        ...clienteData,
        ...pagamentoData
      };

      // Inserir venda principal
      setEtapaProcessamento('Salvando venda no banco de dados...');
      const { data: vendaInserida, error: vendaError } = await supabase
        .from('pdv')
        .insert(vendaData)
        .select('id')
        .single();

      if (vendaError) {
        console.error('Erro ao inserir venda:', vendaError);
        setEtapaProcessamento('Erro ao salvar venda: ' + vendaError.message);
        await new Promise(resolve => setTimeout(resolve, 3000));
        setShowProcessandoVenda(false);
        toast.error('Erro ao salvar venda: ' + vendaError.message);
        return;
      }

      const vendaId = vendaInserida.id;
      setVendaProcessadaId(vendaId);

      // Preparar itens para inserção
      setEtapaProcessamento('Preparando itens da venda...');
      const itensParaInserir = carrinho.map(item => {
        const precoUnitario = item.desconto ? item.desconto.precoComDesconto : (item.subtotal / item.quantidade);

        return {
          empresa_id: usuarioData.empresa_id,
          usuario_id: userData.user.id,
          pdv_id: vendaId,
          produto_id: item.produto.id,
          codigo_produto: item.produto.codigo,
          nome_produto: item.produto.nome,
          descricao_produto: item.produto.descricao,
          quantidade: item.quantidade,
          valor_unitario: precoUnitario,
          valor_subtotal: item.subtotal,
          valor_total_item: item.subtotal,
          tem_desconto: !!item.desconto,
          tipo_desconto: item.desconto?.tipo || null,
          percentual_desconto: item.desconto?.percentualDesconto || null,
          valor_desconto_aplicado: item.desconto?.valorDesconto || 0,
          origem_desconto: item.desconto ? 'manual' : null,
          origem_item: item.pedido_origem_numero ? 'pedido_importado' : 'manual',
          pedido_origem_id: item.pedido_origem_id || null,
          pedido_origem_numero: item.pedido_origem_numero || null,
          observacao_item: item.observacao || null
        };
      });

      // Inserir itens
      setEtapaProcessamento('Salvando itens da venda...');
      const { error: itensError } = await supabase
        .from('pdv_itens')
        .insert(itensParaInserir);

      if (itensError) {
        console.error('Erro ao inserir itens:', itensError);
        setEtapaProcessamento('Erro ao salvar itens: ' + itensError.message);
        await new Promise(resolve => setTimeout(resolve, 3000));
        setShowProcessandoVenda(false);
        toast.error('Erro ao salvar itens: ' + itensError.message);
        return;
      }

      // Inserir opções adicionais se existirem
      const itensComAdicionais = carrinho.filter(item => item.adicionais && item.adicionais.length > 0);
      if (itensComAdicionais.length > 0) {
        setEtapaProcessamento('Salvando opções adicionais...');

        for (const item of itensComAdicionais) {
          // Buscar o ID do item inserido
          const { data: itemInserido } = await supabase
            .from('pdv_itens')
            .select('id')
            .eq('pdv_id', vendaId)
            .eq('produto_id', item.produto.id)
            .single();

          if (itemInserido && item.adicionais) {
            const adicionaisParaInserir = item.adicionais.map(adicional => ({
              empresa_id: usuarioData.empresa_id,
              usuario_id: userData.user.id,
              pdv_item_id: itemInserido.id,
              item_adicional_id: adicional.id,
              nome_adicional: adicional.nome,
              quantidade: adicional.quantidade,
              valor_unitario: adicional.preco,
              valor_total: adicional.preco * adicional.quantidade,
              origem_adicional: 'manual'
            }));

            const { error: adicionaisError } = await supabase
              .from('pdv_itens_adicionais')
              .insert(adicionaisParaInserir);

            if (adicionaisError) {
              console.error('Erro ao inserir adicionais:', adicionaisError);
              setEtapaProcessamento('Erro ao salvar adicionais: ' + adicionaisError.message);
              await new Promise(resolve => setTimeout(resolve, 3000));
              setShowProcessandoVenda(false);
              toast.error('Erro ao salvar adicionais: ' + adicionaisError.message);
              return;
            }
          }
        }
      }

      // Atualizar estoque se configurado para PDV
      if (tipoControle === 'pdv') {
        setEtapaProcessamento('Atualizando estoque...');
        for (const item of carrinho) {
          const { error: estoqueError } = await supabase.rpc('atualizar_estoque_produto', {
            p_produto_id: item.produto.id,
            p_quantidade: -item.quantidade, // Quantidade negativa para baixa
            p_tipo_operacao: 'venda_pdv',
            p_observacao: `Venda PDV #${numeroVenda}`
          });

          if (estoqueError) {
            console.error('Erro ao atualizar estoque:', estoqueError);
            setEtapaProcessamento('ERRO: Falha na baixa de estoque: ' + estoqueError.message);
            await new Promise(resolve => setTimeout(resolve, 3000));
            setShowProcessandoVenda(false);
            toast.error('ERRO: Falha na baixa de estoque: ' + estoqueError.message);
            return;
          }
        }

        // Aguardar um pouco para garantir que todas as movimentações foram processadas
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // VERIFICAÇÃO CRÍTICA: Confirmar se tudo foi salvo corretamente
      const vendaVerificada = await verificarVendaNoBanco(vendaId, numeroVenda, carrinho.length);

      if (!vendaVerificada) {
        setEtapaProcessamento('ERRO: Venda não foi salva corretamente!');
        await new Promise(resolve => setTimeout(resolve, 3000));
        setShowProcessandoVenda(false);
        toast.error('ERRO: Venda não foi salva corretamente no banco de dados!');
        return;
      }

      // Atualizar status dos pedidos importados para "faturado"
      if (pedidosImportados.length > 0) {
        setEtapaProcessamento('Atualizando status dos pedidos...');

        try {
          const dataFaturamento = new Date().toISOString();

          for (const pedido of pedidosImportados) {
            const { error: pedidoError } = await supabase
              .from('pedidos')
              .update({
                status: 'faturado',
                data_faturamento: dataFaturamento,
                observacao_faturamento: `Faturado via PDV - Venda #${numeroVenda}`
              })
              .eq('id', pedido.id);

            if (pedidoError) {
              console.error(`Erro ao atualizar pedido ${pedido.numero}:`, pedidoError);
              // Não interrompe o processo, apenas loga o erro
            } else {
              console.log(`✅ Pedido ${pedido.numero} atualizado para 'faturado' com sucesso`);
            }
          }

          // Disparar eventos do sistema para cada pedido faturado
          for (const pedido of pedidosImportados) {
            // Disparar evento padrão do sistema
            window.dispatchEvent(new CustomEvent(EVENT_TYPES.PEDIDO_FATURADO, {
              detail: {
                pedidoId: pedido.id,
                numero: pedido.numero,
                status: 'faturado',
                empresaId: usuarioData.empresa_id,
                valorTotal: pedido.valor_total || 0,
                clienteNome: pedido.cliente?.nome,
                action: 'invoiced'
              }
            }));
          }

          // Disparar evento customizado adicional
          window.dispatchEvent(new CustomEvent('pedidoStatusChanged', {
            detail: {
              pedidosIds: pedidosImportados.map(p => p.id),
              novoStatus: 'faturado',
              numeroVenda: numeroVenda
            }
          }));

        } catch (error) {
          console.error('Erro ao atualizar status dos pedidos:', error);
          // Não interrompe o processo, pois a venda já foi salva com sucesso
        }
      }

      // SUCESSO CONFIRMADO!
      setEtapaProcessamento('Venda finalizada com sucesso!');
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Fechar modal de processamento
      setShowProcessandoVenda(false);

      // Mostrar sucesso
      toast.success(`Venda #${numeroVenda} finalizada com sucesso!`);

      // Disparar evento customizado para atualizar modal de movimentos
      window.dispatchEvent(new CustomEvent('vendaPdvFinalizada', {
        detail: {
          vendaId: vendaId,
          numeroVenda: numeroVenda,
          empresaId: usuarioData.empresa_id,
          valorTotal: valorTotal
        }
      }));

      // Limpar todos os estados
      setCarrinho([]);
      setClienteSelecionado(null);
      setShowFinalizacaoFinal(false);
      limparPagamentosParciaisSilencioso(); // Versão silenciosa para não mostrar toast duplicado
      setCpfCnpjNota('');
      setClienteEncontrado(null);
      setTipoDocumento('cpf');
      setPedidosImportados([]);
      setDescontoPrazoSelecionado(null);
      clearPDVState();

      // Recarregar estoque se necessário
      if (pdvConfig?.baixa_estoque_pdv) {
        loadEstoque();
      }

    } catch (error) {
      console.error('Erro ao finalizar venda:', error);
      setEtapaProcessamento('ERRO INESPERADO: ' + (error as Error).message);
      await new Promise(resolve => setTimeout(resolve, 3000));
      setShowProcessandoVenda(false);
      toast.error('Erro inesperado ao finalizar venda');
    }
  };

  const limparCarrinhoCompleto = () => {
    setCarrinho([]);
    setClienteSelecionado(null);
    setPedidosImportados([]); // Limpar pedidos importados
    setDescontoPrazoSelecionado(null); // Limpar desconto selecionado
    limparPagamentosParciaisSilencioso(); // Versão silenciosa
    clearPDVState();
    setShowConfirmLimparCarrinho(false);
    toast.success('PDV limpo com sucesso!');
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      // Se há produtos filtrados, adicionar o primeiro
      if (produtosFiltrados.length > 0) {
        adicionarAoCarrinho(produtosFiltrados[0]);
        // Limpar o campo de pesquisa após adicionar o produto
        setSearchTerm('');
        // Manter o foco no campo para próxima digitação
        setTimeout(() => {
          const input = e.target as HTMLInputElement;
          input.focus();
        }, 10);
      } else {
        // Produto não encontrado - extrair o termo de busca real
        let termoBusca = searchTerm.trim();
        if (searchTerm.includes('*')) {
          const partes = searchTerm.split('*');
          if (partes.length >= 2) {
            termoBusca = partes.slice(1).join('*').trim(); // Pega tudo após o primeiro *
          }
        }

        // Mostrar modal de produto não encontrado
        mostrarProdutoNaoEncontrado(termoBusca);

        // Limpar o campo e manter o foco
        setSearchTerm('');
        setTimeout(() => {
          const input = e.target as HTMLInputElement;
          input.focus();
        }, 10);
      }
    }
  };

  const abrirModalProdutos = async () => {
    try {
      // Ativar fullscreen antes de abrir o modal
      if (!isFullscreen) {
        await enterFullscreen();
        console.log('Fullscreen ativado para modal de produtos');
      }

      // Abrir o modal de produtos
      setShowAreaProdutos(true);
    } catch (error) {
      console.log('Erro ao ativar fullscreen para modal de produtos:', error);
      // Abrir o modal mesmo se o fullscreen falhar
      setShowAreaProdutos(true);
    }
  };

  const mostrarProdutoNaoEncontrado = (termo: string) => {
    setProdutoNaoEncontradoTermo(termo);
    setShowProdutoNaoEncontrado(true);
  };

  // Realtime para o modal de pedidos - atualiza automaticamente quando modal está aberto
  useEffect(() => {
    if (!showPedidosModal) return;

    let modalSubscription: any = null;

    const setupModalRealtime = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select('empresa_id')
          .eq('id', userData.user.id)
          .single();

        if (!usuarioData?.empresa_id) return;

        modalSubscription = supabase
          .channel(`pedidos-modal-${Date.now()}`)
          .on('postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'pedidos',
              filter: `empresa_id=eq.${usuarioData.empresa_id}`
            },
            (payload) => {
              // Recarregar pedidos automaticamente sem loading visível
              const loadPedidosSilencioso = async () => {
                const { data: userData } = await supabase.auth.getUser();
                if (!userData.user) return;

                const { data: usuarioData } = await supabase
                  .from('usuarios')
                  .select('empresa_id')
                  .eq('id', userData.user.id)
                  .single();

                if (!usuarioData?.empresa_id) return;

                try {
                  const { data, error } = await supabase
                    .from('pedidos')
                    .select(`
                      id,
                      numero,
                      created_at,
                      status,
                      valor_total,
                      desconto_prazo_id,
                      desconto_valor_id,
                      usuario_id,
                      cliente:clientes(id, nome, telefone),
                      pedidos_itens(
                        id,
                        quantidade,
                        valor_unitario,
                        valor_total,
                        produto:produtos(
                          id,
                          nome,
                          preco,
                          codigo,
                          codigo_barras,
                          descricao,
                          promocao,
                          tipo_desconto,
                          valor_desconto,
                          unidade_medida_id,
                          grupo_id,
                          produto_fotos(url, principal)
                        )
                      )
                    `)
                    .eq('empresa_id', usuarioData.empresa_id)
                    .eq('status', 'pendente')
                    .eq('deletado', false)
                    .order('created_at', { ascending: false })
                    .limit(100);

                  if (error) throw error;
                  let pedidosData = data || [];

                  // Buscar nomes dos usuários se houver pedidos com usuario_id
                  if (pedidosData.length > 0) {
                    const usuarioIds = [...new Set(pedidosData.filter(p => p.usuario_id).map(p => p.usuario_id))];

                    if (usuarioIds.length > 0) {
                      const { data: usuariosData } = await supabase
                        .from('usuarios')
                        .select('id, nome')
                        .in('id', usuarioIds);

                      if (usuariosData) {
                        // Criar mapa de ID -> nome
                        const usuariosMap = usuariosData.reduce((acc, user) => {
                          acc[user.id] = user.nome;
                          return acc;
                        }, {} as Record<string, string>);

                        // Adicionar nome do usuário aos pedidos
                        pedidosData = pedidosData.map(pedido => ({
                          ...pedido,
                          usuario: pedido.usuario_id ? {
                            id: pedido.usuario_id,
                            nome: usuariosMap[pedido.usuario_id] || 'Usuário não encontrado'
                          } : null
                        }));
                      }
                    }
                  }

                  setPedidos(pedidosData);
                  setPedidosFiltrados(pedidosData);
                  setContadorPedidosPendentes(pedidosData.length);
                } catch (error) {
                  console.error('Erro ao carregar pedidos silencioso:', error);
                }
              };

              setTimeout(() => loadPedidosSilencioso(), 500);
            }
          )
          .subscribe((status) => {
            console.log(`📋 Status Realtime modal: ${status}`);
            if (status === 'SUBSCRIBED') {
              console.log('✅ Realtime do modal ativo!');
            }
          });

      } catch (error) {
        console.error('Erro ao configurar Realtime do modal:', error);
      }
    };

    // Não carregar pedidos automaticamente quando o modal abre
    // O carregamento será feito apenas quando necessário pelo onClick do botão

    // Configurar realtime com delay para evitar conflitos
    setTimeout(() => {
      setupModalRealtime();
    }, 100);

    return () => {
      if (modalSubscription) {
        modalSubscription.unsubscribe();
      }
    };
  }, [showPedidosModal]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-background-dark overflow-hidden flex" style={{ height: '100vh' }}>
      {/* Sidebar do menu - aparece quando showMenuPDV é true */}
      <AnimatePresence>
        {showMenuPDV && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: isExpanded ? '240px' : '72px', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex-shrink-0 overflow-hidden"
          >
            <div style={{ width: isExpanded ? '240px' : '72px' }}>
              <Sidebar />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conteúdo principal do PDV */}
      <motion.div
        initial={{ marginLeft: 0 }}
        animate={{ marginLeft: 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="flex-1 bg-background-dark overflow-hidden"
        style={{ height: '100vh' }}
      >
      {/* Header - Compacto */}
      <div className="bg-background-card border-b border-gray-800 h-14 flex items-center justify-between pl-2 pr-3">
        {/* Botões do lado esquerdo - Compactos */}
        <div className="flex items-center gap-1.5">
          {/* Botão para mostrar/ocultar menu */}
          <button
            onClick={() => {
              setShowMenuPDV(!showMenuPDV);
              // Forçar o sidebar a ficar retraído quando abrir no PDV
              if (!showMenuPDV && isExpanded) {
                toggle();
              }
            }}
            className="w-9 h-9 bg-gray-600/20 hover:bg-gray-500/30 border border-gray-600/20 hover:border-gray-500/40 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-300 transition-all duration-200 group"
            title={showMenuPDV ? "Ocultar menu" : "Mostrar menu"}
          >
            {showMenuPDV ? (
              <ChevronLeft size={16} className="group-hover:scale-110 transition-transform" />
            ) : (
              <ChevronRight size={16} className="group-hover:scale-110 transition-transform" />
            )}
          </button>

          {/* Botão para alternar fullscreen */}
          <button
            onClick={() => {
              if (isFullscreen) {
                exitFullscreen();
              } else {
                enterFullscreen();
              }
            }}
            className="w-9 h-9 bg-gray-600/20 hover:bg-gray-500/30 border border-gray-600/20 hover:border-gray-500/40 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-300 transition-all duration-200 group"
            title={isFullscreen ? "Sair do modo tela cheia" : "Entrar em tela cheia"}
          >
            {isFullscreen ? (
              <Minimize2 size={16} className="group-hover:scale-110 transition-transform" />
            ) : (
              <Maximize2 size={16} className="group-hover:scale-110 transition-transform" />
            )}
          </button>
        </div>
        <div className="text-4xl font-bold text-primary-400">
          {formatCurrencyWithoutSymbol(calcularTotal())}
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400 flex items-center justify-end gap-1 mb-0.5">
            <User size={12} />
            {userData?.nome || 'Usuário'}
          </div>
          <div className="text-xs text-gray-400 font-mono">
            {formatDateTime(currentDateTime)}
          </div>
        </div>
      </div>

      <div
        className="flex overflow-hidden relative"
        style={{ height: 'calc(100vh - 56px)' }}
      >
        {/* Área dos Itens do Carrinho - mantém largura fixa quando há itens */}
        <div className={`${carrinho.length > 0 ? 'w-2/3' : 'w-full'} p-4 flex flex-col h-full relative overflow-hidden transition-all duration-500`}>
          {/* Overlay para desativar interação quando finalização está aberta */}
          {showFinalizacaoFinal && (
            <div className="absolute inset-0 bg-black/20 z-20 cursor-not-allowed" />
          )}
            <div className="h-full flex flex-col">


              {/* Barra de Busca - Compacta */}
              <div className="mb-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Produto"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearchKeyPress}
                    autoFocus
                    className="w-full bg-gray-800/50 border border-gray-700 rounded py-2 pl-9 pr-12 text-white placeholder-gray-300 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                  />
                  <QrCode size={18} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />

                  {/* Ícone de busca com F1 - clicável - Compacto */}
                  <button
                    onClick={abrirModalProdutos}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 hover:bg-gray-700/50 rounded px-1 py-0.5 transition-colors"
                    title="Abrir lista de produtos (F1)"
                  >
                    <Search size={14} className="text-gray-300 hover:text-gray-200" />
                    <span className="text-xs text-gray-300 bg-gray-700 px-1 py-0.5 rounded">F1</span>
                  </button>

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

              {/* Lista de Itens do Carrinho - Compacta */}
              <div
                className="flex-1 overflow-y-auto custom-scrollbar"
                style={{ paddingBottom: '50px' }}
              >
                {carrinho.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500">
                      <ShoppingCart size={56} className="mx-auto mb-3 opacity-50" />
                      <p className="text-base font-medium mb-2">Carrinho vazio</p>
                      <p className="text-sm">Use o botão "Produtos" para adicionar itens</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {carrinho.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-gray-800/50 rounded p-2.5"
                      >
                        {/* Layout responsivo baseado na largura da tela - Compacto */}
                        <div className="flex gap-2.5">
                          {/* Número sequencial do item - Compacto */}
                          <div className="w-5 h-5 bg-background-card border border-gray-700 rounded-full flex items-center justify-center flex-shrink-0 self-center shadow-lg">
                            <span className="text-xs font-medium text-gray-100">
                              {index + 1}
                            </span>
                          </div>

                          {/* Foto do Produto - Compacta */}
                          <div
                            className="w-12 h-12 lg:w-10 lg:h-10 bg-gray-900 rounded overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity relative self-start"
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
                                <Package size={14} className="text-gray-700" />
                              </div>
                            )}

                            {/* Indicador de múltiplas fotos - Compacto */}
                            {item.produto.produto_fotos && item.produto.produto_fotos.length > 1 && (
                              <div className="absolute top-0.5 left-0.5 bg-black/60 text-white text-xs px-1 py-0.5 rounded">
                                {item.produto.produto_fotos.length}
                              </div>
                            )}
                          </div>

                          {/* Container principal do conteúdo */}
                          <div className="flex-1 min-w-0">
                            {/* Seção superior - Dados do produto com controles */}
                            <div className="lg:grid lg:grid-cols-[1fr_auto_auto] lg:items-center lg:gap-4">
                                <div className="flex justify-between items-start mb-2 lg:mb-0">
                                  <div className="flex-1 min-w-0">
                                    {/* Nome do produto com edição inline */}
                                    <div className="mb-1">
                                      {itemEditandoNome === item.id ? (
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="text"
                                            value={nomeEditando}
                                            onChange={(e) => setNomeEditando(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                finalizarEdicaoNome(item.id);
                                              } else if (e.key === 'Escape') {
                                                cancelarEdicaoNome();
                                              }
                                            }}
                                            onBlur={() => finalizarEdicaoNome(item.id)}
                                            onFocus={(e) => {
                                              // Posicionar cursor no final do texto
                                              const input = e.target as HTMLInputElement;
                                              setTimeout(() => {
                                                input.setSelectionRange(input.value.length, input.value.length);
                                              }, 0);
                                            }}
                                            className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-primary-500"
                                            autoFocus
                                            style={{ minWidth: '0' }}
                                          />
                                          <button
                                            onClick={() => finalizarEdicaoNome(item.id)}
                                            className="text-green-400 hover:text-green-300 transition-colors flex-shrink-0"
                                            title="Confirmar edição"
                                          >
                                            <Check size={14} />
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1">
                                          <h4 className="text-white font-medium text-sm line-clamp-1">{item.produto.nome}</h4>
                                          {pdvConfig?.editar_nome_produto && (
                                            <button
                                              onClick={() => iniciarEdicaoNome(item.id, item.produto.nome)}
                                              className="text-gray-500 hover:text-gray-300 transition-colors opacity-60 hover:opacity-100 flex-shrink-0"
                                              title="Editar nome do produto"
                                            >
                                              <Pencil size={12} />
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                      <span>Código {item.produto.codigo}</span>
                                      {item.produto.codigo_barras && item.produto.codigo_barras.trim() !== '' && (
                                        <div className="flex items-center gap-1">
                                          <QrCode size={10} className="text-gray-500" />
                                          <span>{item.produto.codigo_barras}</span>
                                        </div>
                                      )}
                                      {item.quantidade > 1 && (
                                        <span className="bg-gray-700 px-1.5 py-0.5 rounded text-white font-medium">
                                          {item.quantidade}
                                        </span>
                                      )}
                                    </div>

                                    {/* Informações de origem do pedido */}
                                    {item.pedido_origem_numero && (
                                      <div className="text-xs text-green-400 mt-1 lg:mt-0">
                                        📦 Pedido #{item.pedido_origem_numero}
                                      </div>
                                    )}

                                    {/* Informações de desconto */}
                                    {item.desconto && (
                                      <div className="text-xs text-blue-400 mt-1 lg:mt-0">
                                        💰 {item.desconto.tipo === 'percentual' && item.desconto.percentualDesconto
                                          ? `${Math.round(item.desconto.percentualDesconto)}% OFF`
                                          : `${formatCurrency(item.desconto.valorDesconto)} OFF`}
                                        {item.desconto.origemPedido && ' (do pedido)'}
                                      </div>
                                    )}


                                  </div>

                                  {/* Botão remover - mobile */}
                                  <button
                                    onClick={() => confirmarRemocao(item.id)}
                                    className="text-red-400 hover:text-red-300 transition-colors ml-2 lg:hidden"
                                    title="Remover item"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>

                              {/* Controles de quantidade - desktop - Compactos */}
                              <div className="hidden lg:flex items-center gap-1.5">
                                <button
                                  onClick={() => alterarQuantidade(item.id, item.quantidade - 1)}
                                  className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-white transition-colors"
                                >
                                  <Minus size={10} />
                                </button>
                                <span className="text-white font-medium min-w-[1.2rem] text-center text-xs">
                                  {item.quantidade}
                                </span>
                                <button
                                  onClick={() => alterarQuantidade(item.id, item.quantidade + 1)}
                                  className="w-6 h-6 bg-primary-500/30 hover:bg-primary-500/50 rounded-full flex items-center justify-center text-white transition-colors"
                                >
                                  <Plus size={10} />
                                </button>

                                {/* Botões de desconto - desktop - Compactos */}
                                {pdvConfig?.desconto_no_item && !item.desconto && (
                                  <button
                                    onClick={() => abrirModalDesconto(item.id)}
                                    className="w-6 h-6 bg-yellow-600/20 hover:bg-yellow-600/40 rounded-full flex items-center justify-center text-yellow-200 transition-colors"
                                    title="Aplicar desconto"
                                  >
                                    <Percent size={10} />
                                  </button>
                                )}

                                {pdvConfig?.desconto_no_item && item.desconto && (
                                  <button
                                    onClick={() => removerDesconto(item.id)}
                                    className="w-6 h-6 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white transition-colors"
                                    title="Remover desconto"
                                  >
                                    <X size={10} />
                                  </button>
                                )}

                                {/* Botão para opções adicionais - desktop - Compacto */}
                                {item.temOpcoesAdicionais && (
                                  <button
                                    onClick={() => abrirOpcoesAdicionais(item)}
                                    className="w-6 h-6 bg-purple-600/20 hover:bg-purple-600/40 rounded-full flex items-center justify-center text-purple-200 transition-colors"
                                    title="Opções adicionais"
                                  >
                                    <Plus size={10} />
                                  </button>
                                )}

                                {/* Botão para observação adicional - desktop - Compacto */}
                                {pdvConfig?.observacao_no_item && (
                                  <button
                                    onClick={() => abrirModalObservacao(item.id)}
                                    className="w-6 h-6 bg-blue-600/20 hover:bg-blue-600/40 rounded-full flex items-center justify-center text-blue-200 transition-colors"
                                    title="Adicionar observação"
                                  >
                                    <MessageSquare size={10} />
                                  </button>
                                )}
                              </div>

                              {/* Preço e botão remover - desktop */}
                              <div className="hidden lg:flex items-center gap-3">
                                <div className="text-right">
                                  {item.desconto ? (
                                    <>
                                      <div className="flex items-center gap-2 justify-end mb-1">
                                        <span className="text-gray-400 line-through text-xs">
                                          {formatCurrency(item.desconto.precoOriginal)}
                                        </span>
                                        <span className="text-primary-400 font-bold text-sm">
                                          {formatCurrency(item.desconto.precoComDesconto)}
                                        </span>
                                      </div>
                                      <div className="text-white font-bold">
                                        {formatCurrency(item.subtotal)}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="text-white font-bold">
                                      {formatCurrency(item.subtotal)}
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => confirmarRemocao(item.id)}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                  title="Remover item"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>

                            {/* Seção de Adicionais - Separada */}
                            {item.adicionais && item.adicionais.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-700/50">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full text-sm text-purple-300 font-medium">
                                    <span>Adicionais</span>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  {item.adicionais.map((adicional, index) => (
                                    <div key={index} className="flex items-center justify-between bg-gray-800/30 rounded-lg p-2">
                                      <div className="flex items-center gap-2 flex-1">
                                        <span className="text-gray-300 text-sm font-medium">
                                          {adicional.nome}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {/* Controles de quantidade */}
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() => alterarQuantidadeAdicional(item.id, index, adicional.quantidade - 1)}
                                            className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-white transition-colors"
                                          >
                                            <Minus size={10} />
                                          </button>
                                          <span className="text-white font-medium min-w-[1.5rem] text-center text-sm">
                                            {adicional.quantidade}
                                          </span>
                                          <button
                                            onClick={() => alterarQuantidadeAdicional(item.id, index, adicional.quantidade + 1)}
                                            className="w-6 h-6 bg-purple-500/30 hover:bg-purple-500/50 rounded-full flex items-center justify-center text-white transition-colors"
                                          >
                                            <Plus size={10} />
                                          </button>
                                        </div>
                                        {/* Preço */}
                                        <span className="text-purple-300 text-sm font-medium min-w-[4rem] text-right">
                                          {adicional.preco > 0 ? `+${formatCurrency(adicional.preco * adicional.quantidade)}` : 'Grátis'}
                                        </span>
                                        {/* Botão remover */}
                                        <button
                                          onClick={() => removerAdicional(item.id, index)}
                                          className="w-6 h-6 bg-red-600/20 hover:bg-red-600/40 rounded-full flex items-center justify-center text-red-400 hover:text-red-300 transition-colors"
                                          title="Remover adicional"
                                        >
                                          <X size={10} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Seção de Observação - Aparece por último */}
                            {item.observacao && (
                              <div className={`${item.adicionais && item.adicionais.length > 0 ? 'mt-3' : 'mt-3 pt-3 border-t border-gray-700/50'}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-sm text-blue-300 font-medium">
                                    <span>Observação</span>
                                  </div>
                                </div>
                                <div className="bg-gray-800/30 rounded-lg p-2">
                                  {itemEditandoObservacao === item.id ? (
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={observacaoEditando}
                                        onChange={(e) => setObservacaoEditando(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            finalizarEdicaoObservacao(item.id);
                                          } else if (e.key === 'Escape') {
                                            cancelarEdicaoObservacao();
                                          }
                                        }}
                                        onBlur={() => finalizarEdicaoObservacao(item.id)}
                                        onFocus={(e) => {
                                          const input = e.target as HTMLInputElement;
                                          setTimeout(() => {
                                            input.setSelectionRange(input.value.length, input.value.length);
                                          }, 0);
                                        }}
                                        className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
                                        autoFocus
                                        placeholder="Digite a observação..."
                                      />
                                      <button
                                        onClick={() => finalizarEdicaoObservacao(item.id)}
                                        className="text-green-400 hover:text-green-300 transition-colors flex-shrink-0"
                                        title="Confirmar edição"
                                      >
                                        <Check size={14} />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-300 text-sm italic flex-1">
                                        {item.observacao}
                                      </span>
                                      <button
                                        onClick={() => iniciarEdicaoObservacao(item.id, item.observacao!)}
                                        className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0 ml-2"
                                        title="Editar observação"
                                      >
                                        <Pencil size={12} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Preço - mobile */}
                            <div className="text-sm lg:hidden mt-2">
                              {item.desconto ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400 line-through text-xs">
                                    {formatCurrency(item.desconto.precoOriginal)}
                                  </span>
                                  <span className="text-primary-400 font-bold">
                                    {formatCurrency(item.desconto.precoComDesconto)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-primary-400 font-bold">
                                  {formatCurrency(item.subtotal / item.quantidade)}
                                </span>
                              )}
                            </div>

                            {/* Controles de quantidade - mobile */}
                            <div className="flex justify-between items-center mt-2 lg:hidden">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => alterarQuantidade(item.id, item.quantidade - 1)}
                                  className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-white transition-colors"
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="text-white font-medium min-w-[2rem] text-center">
                                  {item.quantidade}
                                </span>
                                <button
                                  onClick={() => alterarQuantidade(item.id, item.quantidade + 1)}
                                  className="w-8 h-8 bg-primary-500/30 hover:bg-primary-500/50 rounded-full flex items-center justify-center text-white transition-colors"
                                >
                                  <Plus size={14} />
                                </button>

                                {/* Botão para aplicar desconto */}
                                {pdvConfig?.desconto_no_item && !item.desconto && (
                                  <button
                                    onClick={() => abrirModalDesconto(item.id)}
                                    className="w-8 h-8 bg-yellow-600/20 hover:bg-yellow-600/40 rounded-full flex items-center justify-center text-yellow-200 transition-colors"
                                    title="Aplicar desconto"
                                  >
                                    <Percent size={14} />
                                  </button>
                                )}

                                {/* Botão para remover desconto */}
                                {pdvConfig?.desconto_no_item && item.desconto && (
                                  <button
                                    onClick={() => removerDesconto(item.id)}
                                    className="w-8 h-8 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white transition-colors"
                                    title="Remover desconto"
                                  >
                                    <X size={14} />
                                  </button>
                                )}

                                {/* Botão para opções adicionais */}
                                {item.temOpcoesAdicionais && (
                                  <button
                                    onClick={() => abrirOpcoesAdicionais(item)}
                                    className="w-8 h-8 bg-purple-600/20 hover:bg-purple-600/40 rounded-full flex items-center justify-center text-purple-200 transition-colors"
                                    title="Opções adicionais"
                                  >
                                    <Plus size={14} />
                                  </button>
                                )}

                                {/* Botão para observação adicional */}
                                {pdvConfig?.observacao_no_item && (
                                  <button
                                    onClick={() => abrirModalObservacao(item.id)}
                                    className="w-8 h-8 bg-blue-600/20 hover:bg-blue-600/40 rounded-full flex items-center justify-center text-blue-200 transition-colors"
                                    title="Adicionar observação"
                                  >
                                    <MessageSquare size={14} />
                                  </button>
                                )}
                              </div>
                              <div className="text-white font-bold">
                                {formatCurrency(item.subtotal)}
                              </div>
                            </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

            {/* Menu Fixo no Footer da Área de Produtos - Só aparece quando NÃO está na finalização - Compacto */}
            {!showFinalizacaoFinal && (
              <div className="absolute bottom-0 left-0 right-0 bg-background-card border-t border-gray-800 z-40">
                {/* Container sem padding para maximizar espaço - Compacto */}
                <div className="h-12 flex items-center">
                  {/* Botão Anterior - Compacto */}
                  {menuStartIndex > 0 && (
                    <button
                      onClick={navegarMenuAnterior}
                      className="w-9 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors border-r border-gray-800"
                    >
                      <ChevronLeft size={18} />
                    </button>
                  )}

                  {/* Itens do Menu Visíveis - Compactos */}
                  <div className="flex items-center h-full flex-1">
                    {menuPDVItems.slice(menuStartIndex, menuStartIndex + visibleMenuItems).map((item, index) => {
                      const IconComponent = item.icon;
                      const originalIndex = menuStartIndex + index;
                      const teclaAtalho = `F${originalIndex + 1}`;
                      return (
                        <button
                          key={item.id}
                          onClick={(e) => item.onClick(e)}
                          className={`flex flex-col items-center justify-center text-gray-400 ${getColorClasses(item.color)} transition-all duration-200 h-full relative`}
                          style={{ flex: '1 1 100px', minWidth: '100px' }}
                        >
                          {/* Wrapper do ícone com contador - Compacto */}
                          <div className="relative">
                            <IconComponent size={18} />
                            {/* Contador de pedidos pendentes - só aparece no botão Pedidos */}
                            {item.id === 'pedidos' && contadorPedidosPendentes > 0 && (
                              <div className="absolute -top-3 -right-10 bg-red-500 text-white text-sm rounded-full min-w-[22px] h-[22px] flex items-center justify-center font-bold border-2 border-background-card shadow-lg z-[60]">
                                {contadorPedidosPendentes > 99 ? '99+' : contadorPedidosPendentes}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-xs whitespace-nowrap">{item.label}</span>
                            <span className="text-xs bg-gray-700 px-1 py-0.5 rounded text-gray-300 font-mono">
                              {teclaAtalho}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Botão Próximo - Compacto */}
                  {menuStartIndex + visibleMenuItems < menuPDVItems.length && (
                    <button
                      onClick={navegarMenuProximo}
                      className="w-9 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors border-l border-gray-800"
                    >
                      <ChevronRight size={18} />
                    </button>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>

        {/* Área de Finalização de Venda - Só aparece quando há itens */}
        {!showFinalizacaoFinal && carrinho.length > 0 && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{
              type: "tween",
              duration: 0.5,
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
            className="w-1/3 bg-background-card border-l border-gray-800 flex flex-col h-full"
          >




            {/* Conteúdo scrollável - Altura otimizada */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3"
              style={{ maxHeight: 'calc(100vh - 200px)' }}
            >

              {/* Seção de Pagamento quando NÃO há pedidos importados */}
              {pedidosImportados.length === 0 && (
                <div className="space-y-3">
                  {/* Tipo de Pagamento - Compacto */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-1.5">
                      Tipo de Pagamento
                    </label>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          setTipoPagamento('vista');
                          limparPagamentosParciais();
                        }}
                        className={`flex-1 py-1.5 px-2.5 rounded border transition-colors text-sm ${
                          tipoPagamento === 'vista'
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:bg-gray-750'
                        }`}
                      >
                        À Vista
                      </button>
                      <button
                        onClick={() => {
                          setTipoPagamento('parcial');
                          setFormaPagamentoSelecionada(null);
                        }}
                        className={`flex-1 py-1.5 px-2.5 rounded border transition-colors text-sm ${
                          tipoPagamento === 'parcial'
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:bg-gray-750'
                        }`}
                      >
                        Parciais
                      </button>
                    </div>
                  </div>

                  {/* Formas de Pagamento - Compacto */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-1.5">
                      {tipoPagamento === 'vista' ? 'Forma de Pagamento' : 'Formas de Pagamento'}
                    </label>

                    {tipoPagamento === 'vista' ? (
                      // Pagamento à vista - interface compacta
                      <div className="grid grid-cols-2 gap-1.5">
                        {formasPagamento.map((forma) => (
                          <button
                            key={forma.id}
                            onClick={() => setFormaPagamentoSelecionada(forma.id)}
                            className={`p-2 rounded border transition-colors text-sm ${
                              formaPagamentoSelecionada === forma.id
                                ? 'bg-gray-700 border-gray-600 text-white'
                                : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-600 hover:bg-gray-750'
                            }`}
                          >
                            {forma.nome}
                          </button>
                        ))}
                      </div>
                    ) : (
                      // Pagamentos parciais - interface compacta
                      <div className="space-y-3">
                        {/* Campo de valor - Compacto */}
                        <div>
                          <label className="block text-sm font-medium text-white mb-1.5">
                            Valor do Pagamento
                          </label>
                          <input
                            type="text"
                            value={valorParcial}
                            onChange={(e) => setValorParcial(formatCurrencyInput(e.target.value))}
                            placeholder={`R$ 0,00 (vazio = ${formatCurrency(calcularTotalComDesconto() - calcularTotalPago() > 0 ? calcularTotalComDesconto() - calcularTotalPago() : 0)})`}
                            className="w-full bg-gray-800/50 border border-gray-700 rounded py-1.5 px-2.5 text-white text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                          />
                          <div className="text-xs text-gray-500 mt-1">
                            💡 Deixe vazio para usar o valor restante automaticamente
                          </div>
                        </div>

                        {/* Botões das formas de pagamento - Compacto */}
                        <div className="grid grid-cols-2 gap-1.5">
                          {formasPagamento.map((forma) => (
                            <button
                              key={forma.id}
                              onClick={() => adicionarPagamentoParcial(
                                forma.id,
                                forma.nome, // Usar o nome da forma para exibição
                                forma.nome.toLowerCase() === 'dinheiro' ? 'dinheiro' : 'eletronico'
                              )}
                              className="p-2 rounded border border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600 hover:bg-gray-750 transition-colors text-sm"
                            >
                              {forma.nome}
                            </button>
                          ))}
                        </div>

                        {/* Lista de pagamentos adicionados - Compacta */}
                        {pagamentosParciais.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-medium text-gray-400">Pagamentos Adicionados:</span>
                              <button
                                onClick={confirmarLimparTodos}
                                className="text-xs text-red-400 hover:text-red-300"
                              >
                                Limpar Todos
                              </button>
                            </div>

                            {pagamentosParciais.map((pagamento) => {
                              const forma = formasPagamento.find(f => f.id === pagamento.forma);
                              return (
                                <div key={pagamento.id} className="flex justify-between items-center bg-gray-800/30 rounded p-1.5">
                                  <div>
                                    <span className="text-white text-xs">{forma?.nome || pagamento.forma}</span>
                                    <span className="text-primary-400 text-xs ml-2">{formatCurrency(pagamento.valor)}</span>
                                  </div>
                                  <button
                                    onClick={() => confirmarRemocaoItem(pagamento.id)}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              );
                            })}

                            {/* Resumo dos valores - Compacto */}
                            <div className="bg-gray-800/50 rounded p-2 space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Total da Venda:</span>
                                <span className="text-white font-medium">{formatCurrency(calcularTotalComDesconto())}</span>
                              </div>
                              {/* Restante só aparece para pagamentos parciais */}
                              {tipoPagamento === 'parcial' && (
                                <div className="flex justify-between text-xs font-bold">
                                  <span className="text-gray-400">Restante:</span>
                                  <span className={calcularRestante() > 0 ? 'text-yellow-400' : 'text-green-400'}>
                                    {formatCurrency(calcularRestante())}
                                  </span>
                                </div>
                              )}
                              {trocoCalculado > 0 && (
                                <div className="flex justify-between items-center font-bold border-t border-gray-700 pt-1 mt-1">
                                  <span className="text-gray-400 text-xs">Troco:</span>
                                  <span className="text-blue-400 text-sm font-extrabold">{formatCurrency(trocoCalculado)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Cliente Selecionado - Aparece se configuração habilitada OU se há pedidos importados - Compacto */}
              {(pdvConfig?.seleciona_clientes || pedidosImportados.length > 0) && (
                <div className="mb-3 space-y-2">
                  {/* Informações do Cliente - Compacto */}
                  {pdvConfig?.seleciona_clientes ? (
                    clienteSelecionado && (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2.5">
                        {/* Layout em duas colunas */}
                        <div className="flex items-start gap-2">
                          <User size={14} className="text-blue-400 mt-0.5" />
                          <div className="flex-1 flex items-start justify-between gap-3">
                            {/* Coluna Esquerda - Nome e Label */}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-blue-400 font-medium">Cliente</div>
                              <div className="text-white font-medium text-sm truncate">{clienteSelecionado.nome}</div>
                            </div>

                            {/* Coluna Direita - Contato */}
                            <div className="text-right flex-shrink-0">
                              {clienteSelecionado.telefone && (
                                <div className="text-xs text-gray-400">{clienteSelecionado.telefone}</div>
                              )}
                              {clienteSelecionado.email && (
                                <div className="text-xs text-gray-500 truncate max-w-[120px]">{clienteSelecionado.email}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  ) : pedidosImportados.length > 0 && pedidosImportados[0]?.cliente && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2.5">
                      {/* Layout em duas colunas */}
                      <div className="flex items-start gap-2">
                        <User size={14} className="text-blue-400 mt-0.5" />
                        <div className="flex-1 flex items-start justify-between gap-3">
                          {/* Coluna Esquerda - Nome e Label */}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-blue-400 font-medium">Cliente dos Pedidos</div>
                            <div className="text-white font-medium text-sm truncate">{pedidosImportados[0].cliente.nome}</div>
                          </div>

                          {/* Coluna Direita - Contato */}
                          <div className="text-right flex-shrink-0">
                            {pedidosImportados[0].cliente.telefone && (
                              <div className="text-xs text-gray-400">{pedidosImportados[0].cliente.telefone}</div>
                            )}
                            {pedidosImportados[0].cliente.email && (
                              <div className="text-xs text-gray-500 truncate max-w-[120px]">{pedidosImportados[0].cliente.email}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Informações dos Pedidos Importados - Compacto */}
                  {pedidosImportados.map((pedido, index) => (
                    <div key={pedido.id} className="bg-green-500/10 border border-green-500/30 rounded p-2.5 relative">
                      {/* Botão X para remover pedido */}
                      <button
                        onClick={() => {
                          setPedidoParaRemover(pedido);
                          setShowConfirmRemovePedidoImportado(true);
                        }}
                        className="absolute top-1.5 right-1.5 text-red-400 hover:text-red-300 transition-colors"
                        title="Remover pedido importado"
                      >
                        <X size={14} />
                      </button>

                      {/* Layout em duas colunas */}
                      <div className="flex items-start gap-3 mb-2 pr-6">
                        {/* Coluna Esquerda */}
                        <div className="flex items-start gap-2 flex-1">
                          <ShoppingBag size={14} className="text-green-400 mt-0.5" />
                          <div className="flex-1">
                            <div className="text-xs text-green-400 font-medium">Pedido Importado</div>
                            <div className="text-white font-medium text-sm">#{pedido.numero}</div>
                            <div className="text-xs text-gray-400">
                              {new Date(pedido.created_at).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                        </div>

                        {/* Coluna Direita */}
                        <div className="text-right">
                          <div className="text-xs text-gray-400">
                            {new Date(pedido.created_at).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          {/* Informações do Vendedor */}
                          {pedido.usuario && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              {pedido.usuario.nome}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Opções de Faturamento do Pedido Importado - Compacto */}
                      {(pedido.desconto_prazo_id || (descontosCliente.prazo.length > 0 || descontosCliente.valor.length > 0)) && (
                        <div className="border-t border-green-500/20 pt-2">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <div className="w-2.5 h-2.5 bg-green-500 rounded flex items-center justify-center">
                              <span className="text-white text-xs font-bold">%</span>
                            </div>
                            <div className="text-xs text-green-400 font-medium">Opções de Faturamento</div>
                          </div>

                          {/* Descontos por Prazo - Compacto */}
                          {descontosCliente.prazo.length > 0 && (
                            <div className="space-y-1.5">
                              <div className="text-xs text-gray-400 mb-1">Prazo de Faturamento</div>
                              <div className="grid grid-cols-2 gap-1">
                                {descontosCliente.prazo.map((desconto, idx) => {
                                  const isSelected = descontoPrazoSelecionado === desconto.id;
                                  const wasOriginallySelected = pedido.desconto_prazo_id === desconto.id;
                                  return (
                                    <div
                                      key={idx}
                                      className={`p-1 rounded border cursor-pointer transition-colors text-xs ${
                                        isSelected
                                          ? 'bg-blue-500/20 border-blue-500 ring-1 ring-blue-500/50'
                                          : wasOriginallySelected
                                            ? 'bg-green-500/20 border-green-500/50 ring-1 ring-green-500/30'
                                            : desconto.tipo === 'desconto'
                                              ? 'bg-green-500/5 border-green-500/20 hover:bg-green-500/10'
                                              : 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10'
                                      }`}
                                      onClick={() => setDescontoPrazoSelecionado(isSelected ? null : desconto.id)}
                                    >
                                      <div className="relative flex items-center justify-center">
                                        <div className="flex items-center gap-0.5">
                                          <span className="text-white font-medium text-xs">
                                            {desconto.prazo_dias}d
                                          </span>
                                          <span className={`text-xs ${
                                            isSelected
                                              ? 'text-blue-400'
                                              : wasOriginallySelected
                                                ? 'text-green-400'
                                                : desconto.tipo === 'desconto' ? 'text-green-400' : 'text-red-400'
                                          }`}>
                                            {desconto.tipo === 'desconto' ? '+' : '-'}{desconto.percentual}%
                                          </span>
                                        </div>
                                        {isSelected && (
                                          <span className="absolute right-0.5 text-xs text-blue-400">✓</span>
                                        )}
                                        {!isSelected && wasOriginallySelected && (
                                          <span className="absolute right-0.5 text-xs text-green-400">Orig</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Desconto por Valor (se aplicável) - Compacto */}
                          {(() => {
                            const descontoValor = calcularDescontoPorValor(calcularTotal());
                            return descontoValor && (
                              <div className="mt-1.5 pt-1.5 border-t border-green-500/20">
                                <div className="text-xs text-gray-400 mb-1">Desconto por Valor</div>
                                <div className={`p-1 rounded border text-center text-xs ${
                                  descontoValor.tipo === 'desconto'
                                    ? 'bg-green-500/10 border-green-500/30'
                                    : 'bg-red-500/10 border-red-500/30'
                                }`}>
                                  <div className="text-white font-medium text-xs">
                                    A partir de {formatCurrency(descontoValor.valorMinimo)}
                                  </div>
                                  <div className={`text-xs ${
                                    descontoValor.tipo === 'desconto' ? 'text-green-400' : 'text-red-400'
                                  }`}>
                                    {descontoValor.tipo === 'desconto' ? '+' : '-'}{descontoValor.percentual}%
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Opções de Faturamento - Descontos do Cliente (apenas quando não há pedidos importados) */}
                  {pedidosImportados.length === 0 && (descontosCliente.prazo.length > 0 || descontosCliente.valor.length > 0) && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-4 h-4 bg-blue-500 rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">%</span>
                        </div>
                        <div className="text-sm text-blue-400 font-medium">Opções de Faturamento</div>
                      </div>

                      {/* Descontos por Prazo */}
                      {descontosCliente.prazo.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs text-gray-400 mb-2">Prazo de Faturamento</div>
                          <div className="grid grid-cols-2 gap-2">
                            {getDescontosPrazoDisponiveis().map((desconto, idx) => {
                              const isSelected = descontoPrazoSelecionado === desconto.id;
                              return (
                                <div
                                  key={idx}
                                  className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-blue-500/20 border-blue-500 ring-2 ring-blue-500/50'
                                      : desconto.tipo === 'desconto'
                                        ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20'
                                        : 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                                  }`}
                                  onClick={() => setDescontoPrazoSelecionado(isSelected ? null : desconto.id)}
                                >
                                  <div className="relative flex items-center justify-center">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-white font-medium">
                                        {desconto.prazo_dias}d
                                      </span>
                                      <span className={`text-xs ${
                                        isSelected
                                          ? 'text-blue-400'
                                          : desconto.tipo === 'desconto' ? 'text-green-400' : 'text-red-400'
                                      }`}>
                                        {desconto.tipo === 'desconto' ? '+' : '-'}{desconto.percentual}%
                                      </span>
                                    </div>
                                    {isSelected && (
                                      <span className="absolute right-0 text-xs text-blue-400">✓</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Desconto por Valor (se aplicável) */}
                      {(() => {
                        const descontoValor = calcularDescontoPorValor(calcularTotal());
                        return descontoValor && (
                          <div className="mt-3 pt-3 border-t border-gray-700">
                            <div className="text-xs text-gray-400 mb-2">Desconto por Valor</div>
                            <div className={`p-2 rounded-lg border text-center ${
                              descontoValor.tipo === 'desconto'
                                ? 'bg-green-500/10 border-green-500/30'
                                : 'bg-red-500/10 border-red-500/30'
                            }`}>
                              <div className="text-xs text-white font-medium">
                                A partir de {formatCurrency(descontoValor.valorMinimo)}
                              </div>
                              <div className={`text-xs ${
                                descontoValor.tipo === 'desconto' ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {descontoValor.tipo === 'desconto' ? '+' : '-'}{descontoValor.percentual}%
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}





            </div>

            {/* Área fixa de pagamento - sempre visível quando há itens - Compacta */}
            {carrinho.length > 0 && (
              <div className="p-3 bg-background-card flex-shrink-0">
                {/* Seções de pagamento quando HÁ pedidos importados */}
                {pedidosImportados.length > 0 && (
                  <>
                    {/* Tipo de Pagamento - Compacto */}
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-white mb-1.5">
                        Tipo de Pagamento
                      </label>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            setTipoPagamento('vista');
                            limparPagamentosParciais();
                          }}
                          className={`flex-1 py-1.5 px-2.5 rounded border transition-colors text-sm ${
                            tipoPagamento === 'vista'
                              ? 'bg-gray-700 border-gray-600 text-white'
                              : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:bg-gray-750'
                          }`}
                        >
                          À Vista
                        </button>
                        <button
                          onClick={() => {
                            setTipoPagamento('parcial');
                            setFormaPagamentoSelecionada(null);
                          }}
                          className={`flex-1 py-1.5 px-2.5 rounded border transition-colors text-sm ${
                            tipoPagamento === 'parcial'
                              ? 'bg-gray-700 border-gray-600 text-white'
                              : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:bg-gray-750'
                          }`}
                        >
                          Parciais
                        </button>
                      </div>
                    </div>

                    {/* Formas de Pagamento - Compacto */}
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-white mb-1.5">
                        {tipoPagamento === 'vista' ? 'Forma de Pagamento' : 'Formas de Pagamento'}
                      </label>

                      {tipoPagamento === 'vista' ? (
                        // Pagamento à vista - interface compacta
                        <div className="grid grid-cols-2 gap-1.5">
                          {formasPagamento.map((forma) => (
                            <button
                              key={forma.id}
                              onClick={() => setFormaPagamentoSelecionada(forma.id)}
                              className={`p-2 rounded border transition-colors text-sm ${
                                formaPagamentoSelecionada === forma.id
                                  ? 'bg-gray-700 border-gray-600 text-white'
                                  : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-600 hover:bg-gray-750'
                              }`}
                            >
                              {forma.nome}
                            </button>
                          ))}
                        </div>
                      ) : (
                        // Pagamentos parciais - interface compacta
                        <div className="space-y-3">
                          {/* Campo de valor - Compacto */}
                          <div>
                            <label className="block text-sm font-medium text-white mb-1.5">
                              Valor do Pagamento
                            </label>
                            <input
                              type="text"
                              value={valorParcial}
                              onChange={(e) => setValorParcial(formatCurrencyInput(e.target.value))}
                              placeholder={`R$ 0,00 (vazio = ${formatCurrency(calcularTotalComDesconto() - calcularTotalPago() > 0 ? calcularTotalComDesconto() - calcularTotalPago() : 0)})`}
                              className="w-full bg-gray-800/50 border border-gray-700 rounded py-1.5 px-2.5 text-white text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                            />
                            <div className="text-xs text-gray-500 mt-1">
                              💡 Deixe vazio para usar o valor restante automaticamente
                            </div>
                          </div>

                          {/* Botões das formas de pagamento - Compacto */}
                          <div className="grid grid-cols-2 gap-1.5">
                            {formasPagamento.map((forma) => (
                              <button
                                key={forma.id}
                                onClick={() => adicionarPagamentoParcial(
                                  forma.id,
                                  forma.nome, // Usar o nome da forma para exibição
                                  forma.nome.toLowerCase() === 'dinheiro' ? 'dinheiro' : 'eletronico'
                                )}
                                className="p-2 rounded border border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600 hover:bg-gray-750 transition-colors text-sm"
                              >
                                {forma.nome}
                              </button>
                            ))}
                          </div>

                          {/* Lista de pagamentos adicionados - Compacta */}
                          {pagamentosParciais.length > 0 && (
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-medium text-gray-400">Pagamentos Adicionados:</span>
                                <button
                                  onClick={confirmarLimparTodos}
                                  className="text-xs text-red-400 hover:text-red-300"
                                >
                                  Limpar Todos
                                </button>
                              </div>

                              {pagamentosParciais.map((pagamento) => {
                                const forma = formasPagamento.find(f => f.id === pagamento.forma);
                                return (
                                  <div key={pagamento.id} className="flex justify-between items-center bg-gray-800/30 rounded p-1.5">
                                    <div>
                                      <span className="text-white text-xs">{forma?.nome || pagamento.forma}</span>
                                      <span className="text-primary-400 text-xs ml-2">{formatCurrency(pagamento.valor)}</span>
                                    </div>
                                    <button
                                      onClick={() => confirmarRemocaoItem(pagamento.id)}
                                      className="text-red-400 hover:text-red-300"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                );
                              })}

                              {/* Resumo dos valores - Compacto */}
                              <div className="bg-gray-800/50 rounded p-2 space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-400">Total da Venda:</span>
                                  <span className="text-white font-medium">{formatCurrency(calcularTotalComDesconto())}</span>
                                </div>
                                {/* Restante só aparece para pagamentos parciais */}
                                {tipoPagamento === 'parcial' && (
                                  <div className="flex justify-between text-xs font-bold">
                                    <span className="text-gray-400">Restante:</span>
                                    <span className={calcularRestante() > 0 ? 'text-yellow-400' : 'text-green-400'}>
                                      {formatCurrency(calcularRestante())}
                                    </span>
                                  </div>
                                )}
                                {trocoCalculado > 0 && (
                                  <div className="flex justify-between items-center font-bold border-t border-gray-700 pt-1 mt-1">
                                    <span className="text-gray-400 text-xs">Troco:</span>
                                    <span className="text-blue-400 text-sm font-extrabold">{formatCurrency(trocoCalculado)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Resumo da Venda - sempre presente - Compacto */}
                <div className="bg-gray-800/50 rounded p-2.5 mb-1">
                  {(() => {
                    const subtotal = calcularTotal();
                    const totalFinal = calcularTotalComDesconto();

                    // Calcular desconto por prazo se selecionado
                    let descontoPrazo = null;
                    if (descontoPrazoSelecionado) {
                      const desconto = descontosCliente.prazo.find(d => d.id === descontoPrazoSelecionado);
                      if (desconto) {
                        const valorDesconto = (subtotal * desconto.percentual) / 100;
                        descontoPrazo = {
                          tipo: desconto.tipo,
                          percentual: desconto.percentual,
                          valor: valorDesconto,
                          prazo_dias: desconto.prazo_dias
                        };
                      }
                    }

                    // Calcular desconto por valor (aplicado após desconto por prazo)
                    const subtotalComDescontoPrazo = descontoPrazo
                      ? (descontoPrazo.tipo === 'desconto' ? subtotal - descontoPrazo.valor : subtotal + descontoPrazo.valor)
                      : subtotal;
                    const descontoValor = calcularDescontoPorValor(subtotalComDescontoPrazo);

                    return (
                      <>
                        {/* Subtotal - Compacto */}
                        <div className="flex justify-between items-center text-xs mb-1.5">
                          <span className="text-white">Subtotal:</span>
                          <span className="text-white">{formatCurrency(subtotal)}</span>
                        </div>

                        {/* Itens - Compacto */}
                        <div className="flex justify-between items-center text-xs mb-1.5">
                          <span className="text-white">Itens:</span>
                          <span className="text-white">{carrinho.reduce((total, item) => total + item.quantidade, 0)}</span>
                        </div>

                        {/* Desconto por Prazo (se aplicável) - Compacto */}
                        {descontoPrazo && (
                          <div className="flex justify-between items-center text-xs mb-1.5">
                            <span className={`${
                              descontoPrazo.tipo === 'desconto' ? 'text-blue-400' : 'text-orange-400'
                            }`}>
                              {descontoPrazo.tipo === 'desconto' ? 'Desconto' : 'Acréscimo'} Prazo ({descontoPrazo.prazo_dias}d):
                            </span>
                            <span className={`${
                              descontoPrazo.tipo === 'desconto' ? 'text-blue-400' : 'text-orange-400'
                            }`}>
                              {descontoPrazo.tipo === 'desconto' ? '-' : '+'}{formatCurrency(descontoPrazo.valor)}
                            </span>
                          </div>
                        )}

                        {/* Desconto por Valor (se aplicável) - Compacto */}
                        {descontoValor && (
                          <div className="flex justify-between items-center text-xs mb-1.5">
                            <span className={`${
                              descontoValor.tipo === 'desconto' ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {descontoValor.tipo === 'desconto' ? 'Desconto' : 'Acréscimo'} ({descontoValor.percentual}%):
                            </span>
                            <span className={`${
                              descontoValor.tipo === 'desconto' ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {descontoValor.tipo === 'desconto' ? '-' : '+'}{formatCurrency(descontoValor.valor)}
                            </span>
                          </div>
                        )}

                        {/* Total Final - Compacto */}
                        <div className="flex justify-between items-center mb-0 pt-1.5 border-t border-gray-700">
                          <span className="text-white text-sm">Total da Venda:</span>
                          <span className="text-lg font-bold text-primary-400">
                            {formatCurrency(totalFinal)}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Footer fixo com botões de ação - Só aparece quando há itens - Compacto */}
            {carrinho.length > 0 && (
              <div className="px-3 pt-1 pb-2 flex-shrink-0">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowConfirmLimparTudoPDV(true)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white py-2 px-3 rounded transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      // Validação para pagamento à vista
                      if (tipoPagamento === 'vista') {
                        if (!formaPagamentoSelecionada) {
                          toast.error('Selecione uma forma de pagamento');
                          return;
                        }
                        // Avança para a tela de finalização final
                        setShowFinalizacaoFinal(true);
                      } else {
                        // Validação para pagamentos parciais
                        if (pagamentosParciais.length === 0) {
                          toast.error('Adicione pelo menos uma forma de pagamento');
                          return;
                        }

                        const restante = calcularRestante();
                        if (restante > 0) {
                          toast.error(`Ainda falta pagar ${formatCurrency(restante)}`);
                          return;
                        }

                        // Avança para a tela de finalização final
                        setShowFinalizacaoFinal(true);
                      }
                    }}
                    disabled={tipoPagamento === 'parcial' && calcularRestante() > 0}
                    className={`flex-1 py-2 px-3 rounded border transition-colors text-sm ${
                      tipoPagamento === 'parcial' && calcularRestante() > 0
                        ? 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-white'
                    }`}
                  >
                    {tipoPagamento === 'parcial' && calcularRestante() > 0
                      ? `Falta ${formatCurrency(calcularRestante())}`
                      : 'Confirmar'
                    }
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Área de Finalização Final - Sobrepõe a área de pagamento */}
        {showFinalizacaoFinal && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{
              type: "tween",
              duration: 0.5,
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
            className="absolute top-0 right-0 w-1/3 bg-background-card border-l border-gray-800 flex flex-col h-full z-10"
          >
            {/* Header fixo compacto */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
              <h3 className="text-base font-semibold text-white">
                Finalizar Venda
              </h3>
              <button
                onClick={() => setShowFinalizacaoFinal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Conteúdo scrollável compacto */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3"
              style={{ maxHeight: 'calc(100vh - 120px)' }}
            >

            {/* Formas de Pagamento Utilizadas - Compacto */}
            {(tipoPagamento === 'vista' && formaPagamentoSelecionada) || (tipoPagamento === 'parcial' && pagamentosParciais.length > 0) ? (
              <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
                <div className="text-sm font-medium text-white mb-2">Pagamentos:</div>
                <div className="space-y-1">
                  {tipoPagamento === 'vista' && formaPagamentoSelecionada ? (
                    (() => {
                      const forma = formasPagamento.find(f => f.id === formaPagamentoSelecionada);

                      if (!forma) return null;

                      return (
                        <div className="flex items-center justify-between py-1.5 px-2 bg-gray-700/30 rounded text-sm">
                          <span className="font-medium text-white">
                            {forma.nome}
                          </span>
                          <span className="text-white font-medium">
                            {formatCurrency(calcularTotalComDesconto())}
                          </span>
                        </div>
                      );
                    })()
                  ) : (
                    pagamentosParciais.map((pagamento, index) => {
                      const forma = formasPagamento.find(f => f.id === pagamento.forma);

                      if (!forma) return null;

                      return (
                        <div key={index} className="flex items-center justify-between py-1.5 px-2 bg-gray-700/30 rounded text-sm">
                          <span className="font-medium text-white">
                            {forma.nome}
                          </span>
                          <span className="text-white font-medium">
                            {formatCurrency(pagamento.valor)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : null}

            {/* Resumo da Venda - Compacto */}
            <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total:</span>
                  <span className="text-white font-medium">{formatCurrency(calcularTotalComDesconto())}</span>
                </div>
                {/* Restante só aparece para pagamentos parciais */}
                {tipoPagamento === 'parcial' && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Restante:</span>
                    <span className={calcularRestante() > 0 ? 'text-yellow-400' : 'text-green-400'}>
                      {formatCurrency(calcularRestante())}
                    </span>
                  </div>
                )}
                {trocoCalculado > 0 && (
                  <div className="flex justify-between items-center font-bold border-t border-gray-700 pt-1.5 mt-1.5">
                    <span className="text-gray-400">Troco:</span>
                    <span className="text-blue-400 text-lg font-bold">{formatCurrency(trocoCalculado)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Campo CPF/CNPJ - Compacto */}
            {temBotaoNfceAtivo() && (
              <div className="mb-3">
                <div className="space-y-2">
                  {/* Botões CPF/CNPJ */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Nota Fiscal Paulista
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleTipoDocumentoChange('cpf')}
                        className={`flex-1 py-2 px-3 rounded border transition-colors text-sm font-medium ${
                          tipoDocumento === 'cpf'
                            ? 'bg-primary-500 border-primary-500 text-white'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:bg-gray-700'
                        }`}
                      >
                        CPF
                      </button>
                      <button
                        onClick={() => handleTipoDocumentoChange('cnpj')}
                        className={`flex-1 py-2 px-3 rounded border transition-colors text-sm font-medium ${
                          tipoDocumento === 'cnpj'
                            ? 'bg-primary-500 border-primary-500 text-white'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:bg-gray-700'
                        }`}
                      >
                        CNPJ
                      </button>
                    </div>
                  </div>

                  {/* Campo de entrada */}
                  <div>
                    <input
                      type="text"
                      value={cpfCnpjNota}
                      onChange={(e) => {
                        handleCpfCnpjChange(e.target.value);
                        // Limpa erro ao digitar
                        if (erroValidacao) {
                          setErroValidacao('');
                        }
                      }}
                      onBlur={validarDocumentoOnBlur}
                      placeholder={tipoDocumento === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
                      className={`w-full bg-gray-800/50 border rounded py-1.5 px-2 text-sm text-white focus:outline-none focus:ring-1 transition-colors ${
                        erroValidacao
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-gray-700 focus:border-primary-500 focus:ring-primary-500/20'
                      }`}
                    />

                    {/* Mensagem de erro */}
                    {erroValidacao && (
                      <div className="mt-1 text-xs text-red-400 flex items-center gap-1">
                        <span>⚠️</span>
                        <span>{erroValidacao}</span>
                      </div>
                    )}
                  </div>

                  {/* Cliente encontrado - Compacto */}
                  {clienteEncontrado ? (
                    <div className="bg-green-500/20 border border-green-500/30 rounded p-2">
                      <div className="flex items-center gap-1 mb-1">
                        <UserCheck size={14} className="text-green-400" />
                        <span className="text-green-400 text-xs font-medium">Cliente Encontrado</span>
                      </div>
                      <div className="text-white text-sm">{clienteEncontrado.nome}</div>
                      {clienteEncontrado.telefone && (
                        <div className="text-gray-300 text-xs">{clienteEncontrado.telefone}</div>
                      )}
                    </div>
                  ) : cpfCnpjNota && (
                    <div className="bg-gray-600/20 border border-gray-600/30 rounded p-2">
                      <div className="flex items-center gap-1">
                        <User size={14} className="text-gray-400" />
                        <span className="text-gray-400 text-xs">Consumidor Final</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

              {/* Botões de Finalização - Compactos */}
              <div className="space-y-2 pb-3">
                {/* Grupo: Finalização Simples - Oculto quando CPF/CNPJ preenchido OU quando força venda fiscal com cartão */}
                {!cpfCnpjNota && !deveOcultarFinalizacaoSimples() && (
                  <div className="space-y-2">
                    {/* Finalizar com Impressão */}
                    {!pdvConfig?.ocultar_finalizar_com_impressao && (
                      <button
                        onClick={() => finalizarVendaCompleta('finalizar_com_impressao')}
                        className="w-full bg-green-900/20 hover:bg-green-800/30 text-green-300 py-2.5 px-3 rounded transition-colors border border-green-800/30 text-sm font-medium"
                      >
                        Finalizar com Impressão
                      </button>
                    )}

                    {/* Finalizar sem Impressão */}
                    {!pdvConfig?.ocultar_finalizar_sem_impressao && (
                      <button
                        onClick={() => finalizarVendaCompleta('finalizar_sem_impressao')}
                        className="w-full bg-green-800/20 hover:bg-green-700/30 text-green-400 py-2.5 px-3 rounded transition-colors border border-green-700/30 text-sm font-medium"
                      >
                        Finalizar sem Impressão
                      </button>
                    )}
                  </div>
                )}

                {/* Grupo: NFC-e */}
                <div className="space-y-2">
                  {/* NFC-e com Impressão */}
                  {!pdvConfig?.ocultar_nfce_com_impressao && (
                    <button
                      onClick={() => {
                        if (isDocumentoInvalido()) {
                          toast.error('CPF/CNPJ inválido. Corrija o documento para emitir NFC-e.');
                          return;
                        }
                        finalizarVendaCompleta('nfce_com_impressao');
                      }}
                      disabled={isDocumentoInvalido()}
                      className={`w-full py-2.5 px-3 rounded transition-colors border text-sm font-medium ${
                        isDocumentoInvalido()
                          ? 'bg-gray-600/20 border-gray-600/30 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-900/20 hover:bg-blue-800/30 text-blue-300 border-blue-800/30'
                      }`}
                    >
                      <div>NFC-e com Impressão</div>
                      {isDocumentoInvalido() && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          CPF/CNPJ inválido
                        </div>
                      )}
                    </button>
                  )}

                  {/* NFC-e sem Impressão */}
                  {!pdvConfig?.ocultar_nfce_sem_impressao && (
                    <button
                      onClick={() => {
                        if (isDocumentoInvalido()) {
                          toast.error('CPF/CNPJ inválido. Corrija o documento para emitir NFC-e.');
                          return;
                        }
                        finalizarVendaCompleta('nfce_sem_impressao');
                      }}
                      disabled={isDocumentoInvalido()}
                      className={`w-full py-2.5 px-3 rounded transition-colors border text-sm font-medium ${
                        isDocumentoInvalido()
                          ? 'bg-gray-600/20 border-gray-600/30 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-800/20 hover:bg-blue-700/30 text-blue-400 border-blue-700/30'
                      }`}
                    >
                      <div>NFC-e sem Impressão</div>
                      {isDocumentoInvalido() && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          CPF/CNPJ inválido
                        </div>
                      )}
                    </button>
                  )}

                  {/* NFC-e + Produção */}
                  {!pdvConfig?.ocultar_nfce_producao && (
                    <button
                      onClick={() => {
                        if (isDocumentoInvalido()) {
                          toast.error('CPF/CNPJ inválido. Corrija o documento para emitir NFC-e.');
                          return;
                        }
                        finalizarVendaCompleta('nfce_producao');
                      }}
                      disabled={isDocumentoInvalido()}
                      className={`w-full py-2.5 px-3 rounded transition-colors border text-sm font-medium ${
                        isDocumentoInvalido()
                          ? 'bg-gray-600/20 border-gray-600/30 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-700/20 hover:bg-blue-600/30 text-blue-500 border-blue-600/30'
                      }`}
                    >
                      <div>NFC-e + Produção</div>
                      {isDocumentoInvalido() && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          CPF/CNPJ inválido
                        </div>
                      )}
                    </button>
                  )}
                </div>

                {/* Grupo: Produção - Oculto quando CPF/CNPJ preenchido OU quando força venda fiscal com cartão */}
                {!cpfCnpjNota && !deveOcultarFinalizacaoSimples() && (
                  <div className="space-y-2">
                    {/* Produção */}
                    {!pdvConfig?.ocultar_producao && (
                      <button
                        onClick={() => finalizarVendaCompleta('producao')}
                        className="w-full bg-orange-900/20 hover:bg-orange-800/30 text-orange-300 py-2.5 px-3 rounded transition-colors border border-orange-800/30 text-sm font-medium"
                      >
                        Produção
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer fixo com botão Voltar - Compacto */}
            <div className="border-t border-gray-800 px-4 py-3 flex-shrink-0">
              <button
                onClick={() => setShowFinalizacaoFinal(false)}
                className="w-full bg-gray-800/30 hover:bg-gray-700/50 text-gray-300 py-2.5 px-3 rounded transition-colors border border-gray-700/50 text-sm font-medium"
              >
                ← Voltar para Pagamento
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

              <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                <button
                  onClick={() => {
                    setClienteSelecionado(null);
                    setShowClienteModal(false);
                  }}
                  className="w-full text-left p-2.5 rounded bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                >
                  <div className="text-white text-sm">Venda sem cliente</div>
                  <div className="text-xs text-gray-400">Consumidor final</div>
                </button>

                {clientes.map(cliente => (
                  <button
                    key={cliente.id}
                    onClick={() => {
                      setClienteSelecionado(cliente);
                      setShowClienteModal(false);
                    }}
                    className="w-full text-left p-2.5 rounded bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                  >
                    {/* Layout em duas colunas - Compacto */}
                    <div className="flex items-start justify-between gap-3">
                      {/* Coluna Esquerda - Nome */}
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium truncate">{cliente.nome}</div>
                        {cliente.email && (
                          <div className="text-xs text-gray-400 truncate">{cliente.email}</div>
                        )}
                      </div>

                      {/* Coluna Direita - Contato */}
                      <div className="text-right flex-shrink-0">
                        {cliente.telefone && (
                          <div className="text-xs text-gray-400">{cliente.telefone}</div>
                        )}
                        {cliente.cpf && (
                          <div className="text-xs text-gray-500">CPF: {cliente.cpf.slice(-4)}</div>
                        )}
                        {cliente.cnpj && (
                          <div className="text-xs text-gray-500">CNPJ: {cliente.cnpj.slice(-4)}</div>
                        )}
                      </div>
                    </div>
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
                  {clienteSelecionado && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Cliente:</span>
                      <span className="text-white">{clienteSelecionado.nome}</span>
                    </div>
                  )}
                  {pedidosImportados.length > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Pedidos:</span>
                      <span className="text-green-400">
                        {pedidosImportados.map(p => `#${p.numero}`).join(', ')}
                      </span>
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
                    setShowPagamentoModal(false);
                    finalizarVendaCompleta('finalizar_sem_impressao');
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

      {/* Modal de Pedidos */}
      <AnimatePresence>
        {showPedidosModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 flex items-center justify-center ${
              isFullscreen
                ? 'bg-background-dark p-0'
                : 'bg-black/50 p-4'
            }`}
            onClick={() => {
              setShowPedidosModal(false);
              setSearchPedidos('');
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`bg-background-card border border-gray-800 flex flex-col ${
                isFullscreen
                  ? 'w-full h-full rounded-none'
                  : 'rounded-lg w-full max-w-4xl mx-4 max-h-[80vh]'
              }`}
              onClick={(e) => e.stopPropagation()}
              data-modal="pedidos"
            >
              {/* Cabeçalho Fixo */}
              <div className="flex-shrink-0 p-6 border-b border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">
                      {statusFilterPedidos === 'todos' ? 'Todos os Pedidos' :
                       statusFilterPedidos === 'pendente' ? 'Pedidos Pendentes' :
                       statusFilterPedidos === 'faturado' ? 'Pedidos Faturados' :
                       statusFilterPedidos === 'cancelado' ? 'Pedidos Cancelados' :
                       'Pedidos'}
                    </h3>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-400">Atualização automática</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowFiltersPedidos(!showFiltersPedidos)}
                      className="text-gray-400 hover:text-white transition-colors p-1"
                      title="Filtros"
                    >
                      <Filter size={18} />
                    </button>

                    {/* Botão para alternar fullscreen */}
                    <button
                      onClick={() => {
                        if (isFullscreen) {
                          exitFullscreen();
                        } else {
                          enterFullscreen();
                        }
                      }}
                      className="w-8 h-8 bg-gray-600/20 hover:bg-gray-500/30 border border-gray-600/20 hover:border-gray-500/40 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-300 transition-all duration-200 group"
                      title={isFullscreen ? "Sair do modo tela cheia" : "Entrar em tela cheia"}
                    >
                      {isFullscreen ? (
                        <Minimize2 size={16} className="group-hover:scale-110 transition-transform" />
                      ) : (
                        <Maximize2 size={16} className="group-hover:scale-110 transition-transform" />
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setShowPedidosModal(false);
                        setSearchPedidos('');
                        setStatusFilterPedidos('pendente');
                        setShowFiltersPedidos(false);
                      }}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Campo de Pesquisa */}
                <div className="relative mb-4">
                  <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Pesquisar por número do pedido, cliente ou telefone..."
                    value={searchPedidos}
                    onChange={(e) => filtrarPedidos(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                  />
                </div>

                {/* Filtros */}
                <AnimatePresence>
                  {showFiltersPedidos && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mb-4"
                    >
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Status do Pedido
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { value: 'pendente', label: 'Pendentes', count: contadorPedidosPendentes },
                              { value: 'faturado', label: 'Faturados', count: pedidos.filter(p => p.status === 'faturado').length },
                              { value: 'cancelado', label: 'Cancelados', count: pedidos.filter(p => p.status === 'cancelado').length },
                              { value: 'todos', label: 'Todos', count: pedidos.length }
                            ].map((status) => (
                              <button
                                key={status.value}
                                onClick={() => filtrarPedidosPorStatus(status.value)}
                                className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                                  statusFilterPedidos === status.value
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                              >
                                {status.label}
                                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                                  statusFilterPedidos === status.value
                                    ? 'bg-white/20 text-white'
                                    : 'bg-gray-600 text-gray-300'
                                }`}>
                                  {status.count}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Conteúdo Rolável */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="space-y-4">
                {pedidosFiltrados.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingBag size={48} className="mx-auto mb-4 text-gray-500" />
                    <p className="text-gray-400">
                      {searchPedidos ? 'Nenhum pedido encontrado para esta pesquisa' :
                       statusFilterPedidos === 'pendente' ? 'Nenhum pedido pendente encontrado' :
                       statusFilterPedidos === 'faturado' ? 'Nenhum pedido faturado encontrado' :
                       statusFilterPedidos === 'cancelado' ? 'Nenhum pedido cancelado encontrado' :
                       'Nenhum pedido encontrado'}
                    </p>
                    {(searchPedidos || statusFilterPedidos !== 'pendente') && (
                      <button
                        onClick={() => {
                          setSearchPedidos('');
                          setStatusFilterPedidos('pendente');
                          aplicarFiltrosPedidos();
                        }}
                        className="mt-2 text-primary-400 hover:text-primary-300 text-sm"
                      >
                        {searchPedidos ? 'Limpar pesquisa' : 'Ver pedidos pendentes'}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className={`grid gap-4 ${
                    isFullscreen
                      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
                      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                  }`}>
                    {pedidosFiltrados.map((pedido) => (
                      <div
                        key={pedido.id}
                        className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors flex flex-col h-full"
                      >
                        {/* Header do Card */}
                        <div className="flex flex-col gap-2 mb-3">
                          <div className="flex items-center justify-between">
                            <div className="text-white font-medium text-sm">
                              Pedido #{pedido.numero}
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(pedido.status).replace('text-', 'bg-').replace('-400', '-500/20').replace('-500', '-500/20').replace('-600', '-600/20')} ${getStatusColor(pedido.status)}`}>
                              {getStatusText(pedido.status)}
                            </div>
                          </div>
                          <div className="text-primary-400 font-bold text-lg">
                            {formatCurrency(pedido.valor_total)}
                          </div>
                        </div>

                        {/* Informações do Cliente e Data */}
                        <div className="flex-1 space-y-2 mb-3">
                          <div className="text-sm text-gray-400 truncate">
                            Cliente: {pedido.cliente?.nome || 'Consumidor Final'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(pedido.created_at).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          {/* Informações do Vendedor */}
                          {pedido.usuario && (
                            <div className="text-xs text-gray-500 truncate">
                              Vendedor: {pedido.usuario.nome}
                            </div>
                          )}
                        </div>

                        {/* Resumo de Itens */}
                        {pedido.pedidos_itens && pedido.pedidos_itens.length > 0 && (
                          <div className="flex-1 mb-3">
                            <div className="text-xs text-gray-400 font-medium mb-1">
                              Itens ({pedido.pedidos_itens.length}):
                            </div>
                            <div className="space-y-1 max-h-20 overflow-y-auto custom-scrollbar">
                              {pedido.pedidos_itens.slice(0, 2).map((item: any, index: number) => {
                                // Verificar se há desconto no item
                                const temDesconto = item.produto?.preco && item.valor_unitario < item.produto.preco;
                                const temPromocao = item.produto?.promocao;

                                return (
                                  <div key={index} className="text-xs">
                                    <div className="flex justify-between items-start">
                                      <span className="text-gray-500 truncate flex-1 mr-2">
                                        {item.quantidade}x {item.produto?.nome}
                                      </span>
                                      <span className="text-gray-500 flex-shrink-0">
                                        {formatCurrency(item.valor_unitario * item.quantidade)}
                                      </span>
                                    </div>
                                    {(temDesconto || temPromocao) && (
                                      <div className="text-xs mt-0.5">
                                        {temPromocao && (
                                          <span className="text-green-400">🏷️ Promoção</span>
                                        )}
                                        {temDesconto && !temPromocao && (
                                          <span className="text-blue-400">💰 Desconto</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {pedido.pedidos_itens.length > 2 && (
                                <div className="text-xs text-gray-500 italic">
                                  +{pedido.pedidos_itens.length - 2} item(s) a mais...
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Botões de Ação */}
                        <div className="flex flex-col gap-2 mt-auto">
                          {pedido.status === 'pendente' && (
                            <button
                              onClick={() => importarPedidoParaCarrinho(pedido)}
                              className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors font-medium"
                            >
                              Importar para Carrinho
                            </button>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                const url = await gerarLinkPedido(pedido);
                                if (url) {
                                  window.open(url, '_blank');
                                }
                              }}
                              className="flex-1 px-3 py-1.5 bg-blue-500/80 hover:bg-blue-600/90 text-white rounded text-xs transition-colors"
                              title="Abrir nota de pedido em nova página"
                            >
                              Abrir
                            </button>
                            {/* Botão Ver Detalhes temporariamente oculto */}
                            {false && (
                              <button
                                onClick={() => carregarDetalhesPedido(pedido.id)}
                                className="flex-1 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs transition-colors"
                              >
                                Detalhes
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Detalhes do Pedido */}
      <AnimatePresence>
        {showDetalhePedido && pedidoDetalhado && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => {
              setShowDetalhePedido(false);
              setPedidoDetalhado(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background-card rounded-lg border border-gray-800 w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cabeçalho Fixo */}
              <div className="flex-shrink-0 p-6 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText size={24} className="text-primary-400" />
                    <div>
                      <h3 className="text-xl font-semibold text-white">Detalhes do Pedido</h3>
                      <p className="text-sm text-gray-400">Visualização completa</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowDetalhePedido(false);
                      setPedidoDetalhado(null);
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Conteúdo Rolável */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="space-y-6">
                  {/* Informações Gerais do Pedido */}
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                      <Receipt size={18} className="text-primary-400" />
                      Informações Gerais
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm text-gray-400">Número do Pedido</label>
                        <p className="text-white font-medium">#{pedidoDetalhado.numero}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Status</label>
                        <p className={`font-medium ${getStatusColor(pedidoDetalhado.status)}`}>
                          {getStatusText(pedidoDetalhado.status)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Data de Criação</label>
                        <p className="text-white">{formatarDataHora(pedidoDetalhado.created_at)}</p>
                      </div>
                      {pedidoDetalhado.data_faturamento && (
                        <div>
                          <label className="text-sm text-gray-400">Data de Faturamento</label>
                          <p className="text-white">{formatarDataHora(pedidoDetalhado.data_faturamento)}</p>
                        </div>
                      )}
                      {pedidoDetalhado.usuario && (
                        <div>
                          <label className="text-sm text-gray-400">Criado por</label>
                          <p className="text-white">{pedidoDetalhado.usuario.nome}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Informações do Cliente */}
                  {pedidoDetalhado.cliente && (
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <h4 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                        <User size={18} className="text-blue-400" />
                        Informações do Cliente
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-400">Nome</label>
                          <p className="text-white font-medium">{pedidoDetalhado.cliente.nome}</p>
                        </div>
                        {pedidoDetalhado.cliente.telefone && (
                          <div>
                            <label className="text-sm text-gray-400">Telefone</label>
                            <p className="text-white">{pedidoDetalhado.cliente.telefone}</p>
                          </div>
                        )}
                        {pedidoDetalhado.cliente.documento && (
                          <div>
                            <label className="text-sm text-gray-400">
                              {pedidoDetalhado.cliente.tipo_documento === 'CNPJ' ? 'CNPJ' : 'CPF'}
                            </label>
                            <p className="text-white">{pedidoDetalhado.cliente.documento}</p>
                          </div>
                        )}
                        {pedidoDetalhado.cliente.razao_social && (
                          <div>
                            <label className="text-sm text-gray-400">Razão Social</label>
                            <p className="text-white">{pedidoDetalhado.cliente.razao_social}</p>
                          </div>
                        )}
                        {pedidoDetalhado.cliente.nome_fantasia && (
                          <div>
                            <label className="text-sm text-gray-400">Nome Fantasia</label>
                            <p className="text-white">{pedidoDetalhado.cliente.nome_fantasia}</p>
                          </div>
                        )}
                      </div>


                    </div>
                  )}

                  {/* Itens do Pedido */}
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                      <Package size={18} className="text-green-400" />
                      Itens do Pedido ({pedidoDetalhado.pedidos_itens?.length || 0})
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-xs uppercase bg-gray-700/50 text-gray-400">
                          <tr>
                            <th className="px-4 py-3 text-left">Produto</th>
                            <th className="px-4 py-3 text-center">Qtde</th>
                            <th className="px-4 py-3 text-right">Valor Unit.</th>
                            <th className="px-4 py-3 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pedidoDetalhado.pedidos_itens?.map((item: any) => (
                            <tr key={item.id} className="border-b border-gray-700">
                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-medium text-white">{item.produto?.nome}</p>
                                  <p className="text-xs text-gray-400">
                                    Cód: {item.produto?.codigo}
                                    {item.produto?.codigo_barras && ` | Barras: ${item.produto.codigo_barras}`}
                                  </p>
                                  {item.observacao && (
                                    <p className="text-xs text-yellow-400 mt-1">Obs: {item.observacao}</p>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center text-white">
                                {item.quantidade}
                              </td>
                              <td className="px-4 py-3 text-right text-white">
                                {formatCurrency(item.valor_unitario)}
                              </td>
                              <td className="px-4 py-3 text-right text-white font-medium">
                                {formatCurrency(item.valor_total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Resumo Financeiro */}
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                      <DollarSign size={18} className="text-primary-400" />
                      Resumo Financeiro
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Subtotal:</span>
                        <span className="text-white">{formatCurrency(pedidoDetalhado.valor_subtotal || 0)}</span>
                      </div>
                      {pedidoDetalhado.valor_desconto > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Desconto:</span>
                          <span className="text-red-400">-{formatCurrency(pedidoDetalhado.valor_desconto)}</span>
                        </div>
                      )}
                      {pedidoDetalhado.valor_acrescimo > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Acréscimo:</span>
                          <span className="text-green-400">+{formatCurrency(pedidoDetalhado.valor_acrescimo)}</span>
                        </div>
                      )}
                      <div className="border-t border-gray-700 pt-2">
                        <div className="flex justify-between">
                          <span className="text-white font-medium">Total:</span>
                          <span className="text-primary-400 font-bold text-lg">
                            {formatCurrency(pedidoDetalhado.valor_total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>


                </div>
              </div>

              {/* Rodapé com Ações */}
              <div className="flex-shrink-0 p-6 border-t border-gray-800">
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowDetalhePedido(false);
                      setPedidoDetalhado(null);
                    }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={async () => {
                      const url = await gerarLinkPedido(pedidoDetalhado);
                      if (url) {
                        window.open(url, '_blank');
                      }
                    }}
                    className="px-4 py-2 bg-blue-500/80 hover:bg-blue-600/90 text-white rounded-lg transition-colors"
                    title="Abrir nota de pedido em nova página"
                  >
                    Abrir
                  </button>
                  {pedidoDetalhado?.status === 'pendente' && (
                    <button
                      onClick={() => {
                        importarPedidoParaCarrinho(pedidoDetalhado);
                        setShowDetalhePedido(false);
                        setPedidoDetalhado(null);
                      }}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      Importar para Carrinho
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Mesas */}
      <AnimatePresence>
        {showMesasModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowMesasModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background-card rounded-lg border border-gray-800 p-6 w-full max-w-4xl mx-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Controle de Mesas</h3>
                <button
                  onClick={() => setShowMesasModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Grid de Mesas */}
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((numeroMesa) => (
                    <div
                      key={numeroMesa}
                      className="aspect-square bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 hover:border-gray-600 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all group"
                    >
                      <Table size={24} className="text-gray-400 group-hover:text-white mb-1" />
                      <span className="text-sm font-medium text-gray-300 group-hover:text-white">
                        Mesa {numeroMesa}
                      </span>
                      <span className="text-xs text-green-400">Livre</span>
                    </div>
                  ))}
                </div>

                {/* Legenda */}
                <div className="flex items-center justify-center gap-6 pt-4 border-t border-gray-800">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <span className="text-sm text-gray-400">Livre</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <span className="text-sm text-gray-400">Ocupada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <span className="text-sm text-gray-400">Reservada</span>
                  </div>
                </div>
              </div>
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

      {/* Modal de Movimentos */}
      <AnimatePresence>
        {showMovimentosModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 flex items-center justify-center ${
              isFullscreen
                ? 'bg-background-dark p-0'
                : 'bg-black/50 p-4'
            }`}
            onClick={() => setShowMovimentosModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`bg-background-card border border-gray-800 flex flex-col ${
                isFullscreen
                  ? 'w-full h-full rounded-none'
                  : 'rounded-lg w-full max-w-6xl h-[90vh]'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cabeçalho */}
              <div className="flex-shrink-0 p-4 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">Vendas do PDV</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowFiltrosVendas(!showFiltrosVendas)}
                      className={`px-3 py-1 rounded-lg text-xs transition-colors flex items-center gap-1 relative ${
                        showFiltrosVendas
                          ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                      title="Filtros"
                    >
                      <Filter size={14} />
                      Filtros
                      {/* Indicador de filtros ativos */}
                      {(filtroStatus !== 'todas' || filtroDataInicio || filtroDataFim || filtroNumeroVenda || filtroNumeroPedido) && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                      )}
                    </button>
                    <button
                      onClick={loadVendas}
                      className="text-gray-400 hover:text-white transition-colors p-1"
                      title="Atualizar"
                    >
                      <ArrowUpDown size={18} />
                    </button>

                    {/* Botão para alternar fullscreen */}
                    <button
                      onClick={() => {
                        if (isFullscreen) {
                          exitFullscreen();
                        } else {
                          enterFullscreen();
                        }
                      }}
                      className="w-8 h-8 bg-gray-600/20 hover:bg-gray-500/30 border border-gray-600/20 hover:border-gray-500/40 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-300 transition-all duration-200 group"
                      title={isFullscreen ? "Sair do modo tela cheia" : "Entrar em tela cheia"}
                    >
                      {isFullscreen ? (
                        <Minimize2 size={16} className="group-hover:scale-110 transition-transform" />
                      ) : (
                        <Maximize2 size={16} className="group-hover:scale-110 transition-transform" />
                      )}
                    </button>

                    <button
                      onClick={() => setShowMovimentosModal(false)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Painel de Filtros */}
              <AnimatePresence>
                {showFiltrosVendas && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-b border-gray-800 bg-gray-800/30 overflow-hidden"
                  >
                    <div className="p-3 space-y-3">
                      {/* Filtros por Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: 'todas', label: 'Todas', icon: '📋' },
                            { value: 'finalizadas', label: 'Finalizadas', icon: '✅' },
                            { value: 'canceladas', label: 'Canceladas', icon: '❌' },
                            { value: 'pedidos', label: 'Pedidos', icon: '📦' }
                          ].map((status) => (
                            <button
                              key={status.value}
                              onClick={() => {
                                setFiltroStatus(status.value as any);
                                // Aplicar filtro imediatamente
                                setTimeout(() => loadVendas(), 100);
                              }}
                              className={`px-3 py-1 rounded-lg text-xs transition-colors flex items-center gap-1 ${
                                filtroStatus === status.value
                                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                              }`}
                            >
                              <span>{status.icon}</span>
                              {status.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Filtros por Data e Hora */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">Data e Hora Início</label>
                          <input
                            type="datetime-local"
                            value={filtroDataInicio}
                            onChange={(e) => {
                              setFiltroDataInicio(e.target.value);
                              // Aplicar filtro automaticamente após mudança
                              setTimeout(() => loadVendas(), 500);
                            }}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">Data e Hora Fim</label>
                          <input
                            type="datetime-local"
                            value={filtroDataFim}
                            onChange={(e) => {
                              setFiltroDataFim(e.target.value);
                              // Aplicar filtro automaticamente após mudança
                              setTimeout(() => loadVendas(), 500);
                            }}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-primary-500"
                          />
                        </div>
                      </div>

                      {/* Filtros por Número */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">Número da Venda</label>
                          <input
                            type="text"
                            value={filtroNumeroVenda}
                            onChange={(e) => {
                              setFiltroNumeroVenda(e.target.value);
                              // Aplicar filtro automaticamente após mudança (com debounce maior para texto)
                              setTimeout(() => loadVendas(), 800);
                            }}
                            placeholder="Ex: PDV-000123"
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">Número do Pedido</label>
                          <input
                            type="text"
                            value={filtroNumeroPedido}
                            onChange={(e) => {
                              setFiltroNumeroPedido(e.target.value);
                              // Aplicar filtro automaticamente após mudança (com debounce maior para texto)
                              setTimeout(() => loadVendas(), 800);
                            }}
                            placeholder="Ex: 123"
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-primary-500"
                          />
                        </div>
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={loadVendas}
                          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Aplicar Filtros
                        </button>
                        <button
                          onClick={() => {
                            setFiltroStatus('todas');
                            setFiltroDataInicio('');
                            setFiltroDataFim('');
                            setFiltroNumeroPedido('');
                            setFiltroNumeroVenda('');
                            setTimeout(() => loadVendas(), 100);
                          }}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Limpar Filtros
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Conteúdo */}
              <div className="flex-1 overflow-y-auto p-4 min-h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: '#4B5563 #1F2937' }}>
                {loadingVendas ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
                      <p className="text-gray-400">Carregando vendas...</p>
                    </div>
                  </div>
                ) : vendas.length === 0 ? (
                  <div className="text-center py-12">
                    <ArrowUpDown size={48} className="mx-auto mb-4 text-gray-500" />
                    <p className="text-gray-400 text-lg">Nenhuma venda registrada</p>
                    <p className="text-gray-500 text-sm mt-2">
                      As vendas realizadas no PDV aparecerão aqui
                    </p>
                  </div>
                ) : (
                  <div className={`grid gap-4 pb-4 ${
                    isFullscreen
                      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
                      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                  }`}>
                    {vendas.map((venda) => (
                      <div
                        key={venda.id}
                        className="bg-gray-800/50 rounded-lg border border-gray-700 p-4 hover:border-gray-600 transition-colors flex flex-col h-full"
                      >
                        {/* Header do Card */}
                        <div className="flex flex-col gap-2 mb-3">
                          <div className="flex items-center justify-between">
                            <div className="text-white font-medium text-sm">
                              Venda #{venda.numero_venda}
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                              venda.status_venda === 'finalizada'
                                ? 'bg-green-500/20 text-green-400'
                                : venda.status_venda === 'cancelada'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {venda.status_venda === 'finalizada' ? 'Finalizada' :
                               venda.status_venda === 'cancelada' ? 'Cancelada' :
                               venda.status_venda}
                            </div>
                          </div>

                          {/* Tags de Origem */}
                          <div className="flex flex-wrap gap-1">
                            {venda.pedidos_origem && venda.pedidos_origem.length > 0 ? (
                              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                                {venda.pedidos_origem.length === 1
                                  ? `Pedido #${venda.pedidos_origem[0]}`
                                  : `${venda.pedidos_origem.length} Pedidos`
                                }
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                                Venda Direta
                              </span>
                            )}
                          </div>

                          {/* Valor Total */}
                          <div className="text-primary-400 font-bold text-lg">
                            {formatCurrency(venda.valor_final)}
                          </div>
                        </div>

                        {/* Informações do Cliente e Data */}
                        <div className="flex-1 space-y-2 mb-3">
                          {venda.cliente ? (
                            <div className="text-sm text-gray-400 truncate">
                              Cliente: {venda.cliente.nome}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400">
                              Cliente: Consumidor Final
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            {venda.data_venda_formatada ||
                             (venda.created_at ? new Date(venda.created_at).toLocaleString('pt-BR', {
                               day: '2-digit',
                               month: '2-digit',
                               year: '2-digit',
                               hour: '2-digit',
                               minute: '2-digit'
                             }) : 'Data não disponível')}
                          </div>
                          {/* Informações do Operador */}
                          {venda.usuario_venda && (
                            <div className="text-xs text-gray-500 truncate">
                              Operador: {venda.usuario_venda.nome}
                            </div>
                          )}
                        </div>

                        {/* Resumo dos Itens */}
                        {venda.vendas_pdv_itens && venda.vendas_pdv_itens.length > 0 && (
                          <div className="flex-1 mb-3">
                            <div className="text-xs text-gray-400 font-medium mb-1">
                              Itens ({venda.vendas_pdv_itens.length}):
                            </div>
                            <div className="space-y-1 max-h-16 overflow-y-auto custom-scrollbar">
                              {venda.vendas_pdv_itens.slice(0, 2).map((item: any, index: number) => (
                                <div key={index} className="text-xs">
                                  <div className="flex justify-between items-start">
                                    <span className="text-gray-500 truncate flex-1 mr-2">
                                      {item.quantidade}x {item.produto?.nome || 'Produto'}
                                    </span>
                                    <span className="text-gray-500 flex-shrink-0">
                                      {formatCurrency(item.valor_total_item)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                              {venda.vendas_pdv_itens.length > 2 && (
                                <div className="text-xs text-gray-500 italic">
                                  +{venda.vendas_pdv_itens.length - 2} item(s) a mais...
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Resumo de Valores Compacto */}
                        <div className="mb-3">
                          {(venda.desconto_total > 0 || venda.acrescimo_total > 0) && (
                            <div className="space-y-1 text-xs">
                              {venda.desconto_total > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-red-400">💰 Desconto:</span>
                                  <span className="text-red-400">-{formatCurrency(venda.desconto_total)}</span>
                                </div>
                              )}
                              {venda.acrescimo_total > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-yellow-400">📈 Acréscimo:</span>
                                  <span className="text-yellow-400">+{formatCurrency(venda.acrescimo_total)}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Formas de Pagamento Compacto */}
                        {venda.vendas_pdv_pagamentos && venda.vendas_pdv_pagamentos.length > 0 && (
                          <div className="mb-3">
                            <div className="text-xs text-gray-400 font-medium mb-1">
                              Pagamento ({venda.vendas_pdv_pagamentos.length}):
                            </div>
                            <div className="space-y-1 max-h-12 overflow-y-auto custom-scrollbar">
                              {venda.vendas_pdv_pagamentos.slice(0, 2).map((pagamento: any, index: number) => (
                                <div key={index} className="flex justify-between text-xs">
                                  <span className="text-gray-300 truncate flex-1 mr-2">
                                    {pagamento.forma_pagamento}
                                    {pagamento.parcelas > 1 && ` (${pagamento.parcelas}x)`}
                                  </span>
                                  <span className="text-white flex-shrink-0">{formatCurrency(pagamento.valor)}</span>
                                </div>
                              ))}
                              {venda.vendas_pdv_pagamentos.length > 2 && (
                                <div className="text-xs text-gray-500 italic">
                                  +{venda.vendas_pdv_pagamentos.length - 2} forma(s) a mais...
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Informações de Cancelamento Compacto */}
                        {venda.status_venda === 'cancelada' && (
                          <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <div className="text-xs text-red-400 font-medium mb-1">🚫 Cancelada</div>
                            {venda.usuario_cancelamento && (
                              <div className="text-xs text-gray-400 truncate">
                                Por: {venda.usuario_cancelamento.nome}
                              </div>
                            )}
                            {venda.motivo_cancelamento && (
                              <div className="text-xs text-gray-400 truncate">
                                Motivo: {venda.motivo_cancelamento}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Botões de Ação */}
                        <div className="flex flex-col gap-2 mt-auto">
                          <button
                            onClick={() => {
                              setVendaParaExibirItens(venda);
                              setShowItensVendaModal(true);
                              carregarItensVenda(venda.id);
                            }}
                            className="w-full px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded text-xs transition-colors font-medium border border-blue-600/30 hover:border-blue-600/50"
                          >
                            Exibir Itens
                          </button>

                          {venda.status_venda === 'finalizada' && (
                            <button
                              onClick={() => {
                                setVendaParaCancelar(venda);
                                setShowCancelamentoModal(true);
                              }}
                              className="w-full px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-xs transition-colors font-medium border border-red-600/30 hover:border-red-600/50"
                            >
                              Cancelar Venda
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Cancelamento de Venda */}
      <AnimatePresence>
        {showCancelamentoModal && vendaParaCancelar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowCancelamentoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background-card rounded-lg border border-gray-800 p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                  <X size={20} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Cancelar Venda</h3>
                  <p className="text-gray-400 text-sm">Esta ação não pode ser desfeita</p>
                </div>
              </div>

              <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
                <div className="text-white font-medium">Venda #{vendaParaCancelar.numero_venda}</div>
                <div className="text-sm text-gray-400">
                  Valor: {formatCurrency(vendaParaCancelar.valor_total)}
                </div>
                {vendaParaCancelar.nome_cliente && (
                  <div className="text-sm text-gray-400">
                    Cliente: {vendaParaCancelar.nome_cliente}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Motivo do Cancelamento *
                </label>
                <textarea
                  value={motivoCancelamento}
                  onChange={(e) => setMotivoCancelamento(e.target.value)}
                  placeholder="Informe o motivo do cancelamento..."
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCancelamentoModal(false);
                    setVendaParaCancelar(null);
                    setMotivoCancelamento('');
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors"
                >
                  Sair
                </button>
                <button
                  onClick={cancelarVenda}
                  disabled={!motivoCancelamento.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg transition-colors"
                >
                  Confirmar Cancelamento
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Itens da Venda */}
      <AnimatePresence>
        {showItensVendaModal && vendaParaExibirItens && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowItensVendaModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background-card rounded-lg border border-gray-800 w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cabeçalho */}
              <div className="flex-shrink-0 p-6 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Itens da Venda #{vendaParaExibirItens.numero_venda}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {vendaParaExibirItens.created_at} • Total: {formatCurrency(vendaParaExibirItens.valor_final)}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowItensVendaModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {loadingItensVenda ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
                      <p className="text-gray-400">Carregando itens...</p>
                    </div>
                  </div>
                ) : itensVenda.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart size={48} className="mx-auto mb-4 text-gray-500" />
                    <p className="text-gray-400 text-lg">Nenhum item encontrado</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {itensVenda.map((item, index) => (
                      <div
                        key={item.id}
                        className="bg-gray-800/50 rounded-lg border border-gray-700 p-4"
                      >
                        {/* Cabeçalho do Item */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs bg-primary-500/20 text-primary-400 px-2 py-1 rounded-full font-medium">
                                #{index + 1}
                              </span>
                              <h4 className="text-white font-medium">{item.nome_produto}</h4>
                              {item.origem_item === 'pedido_importado' && (
                                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                                  Pedido #{item.pedido_origem_numero}
                                </span>
                              )}
                            </div>
                            {item.codigo_produto && (
                              <p className="text-xs text-gray-400">Código: {item.codigo_produto}</p>
                            )}
                            {item.descricao_produto && (
                              <p className="text-xs text-gray-500 mt-1">{item.descricao_produto}</p>
                            )}
                          </div>
                        </div>

                        {/* Informações do Item */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <span className="text-xs text-gray-400">Quantidade:</span>
                            <p className="text-white font-medium">{item.quantidade}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-400">Valor Unitário:</span>
                            <p className="text-white font-medium">{formatCurrency(item.valor_unitario)}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-400">Subtotal:</span>
                            <p className="text-white font-medium">{formatCurrency(item.valor_subtotal)}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-400">Total:</span>
                            <p className="text-primary-400 font-bold">{formatCurrency(item.valor_total_item)}</p>
                          </div>
                        </div>

                        {/* Desconto no Item */}
                        {item.tem_desconto && (
                          <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <div className="text-xs text-red-400 font-medium mb-1">Desconto Aplicado</div>
                            <div className="text-xs text-gray-300">
                              {item.tipo_desconto === 'percentual'
                                ? `${item.percentual_desconto}% de desconto`
                                : `Desconto de ${formatCurrency(item.valor_desconto_aplicado)}`
                              }
                            </div>
                          </div>
                        )}

                        {/* Observação do Item */}
                        {item.observacao_item && (
                          <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                            <div className="text-xs text-yellow-400 font-medium mb-1">Observação</div>
                            <div className="text-xs text-gray-300 italic">{item.observacao_item}</div>
                          </div>
                        )}

                        {/* Opções Adicionais */}
                        {item.pdv_itens_adicionais && item.pdv_itens_adicionais.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-700">
                            <div className="text-xs text-gray-400 font-medium mb-2">Opções Adicionais:</div>
                            <div className="space-y-2">
                              {item.pdv_itens_adicionais.map((adicional: any) => (
                                <div key={adicional.id} className="flex justify-between items-center bg-gray-700/30 rounded-lg p-2">
                                  <div>
                                    <span className="text-sm text-white">{adicional.nome_adicional}</span>
                                    <span className="text-xs text-gray-400 ml-2">({adicional.quantidade}x)</span>
                                  </div>
                                  <div className="text-sm text-primary-400 font-medium">
                                    {formatCurrency(adicional.valor_total)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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

      {/* Modal de Confirmação - Remover Item */}
      <AnimatePresence>
        {showConfirmRemoveItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-background-card rounded-lg p-6 max-w-md w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                  <X size={20} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Remover Pagamento</h3>
                  <p className="text-gray-400 text-sm">Esta ação não pode ser desfeita</p>
                </div>
              </div>

              <p className="text-gray-300 mb-6">
                Tem certeza que deseja remover este pagamento?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowConfirmRemoveItem(false);
                    setItemToRemove(null);
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => itemToRemove && removerPagamentoParcial(itemToRemove)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Remover
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação - Remover Todos */}
      <AnimatePresence>
        {showConfirmRemoveAll && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-background-card rounded-lg p-6 max-w-md w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                  <Trash2 size={20} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Limpar Todos os Pagamentos</h3>
                  <p className="text-gray-400 text-sm">Esta ação não pode ser desfeita</p>
                </div>
              </div>

              <p className="text-gray-300 mb-6">
                Tem certeza que deseja remover todos os pagamentos adicionados?
                Você perderá {pagamentosParciais.length} pagamento(s) no valor total de {formatCurrency(calcularTotalPago())}.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmRemoveAll(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={limparPagamentosParciais}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Limpar Todos
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação - Limpar Carrinho */}
      <AnimatePresence>
        {showConfirmLimparCarrinho && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-background-card rounded-lg p-6 max-w-md w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                  <Trash2 size={20} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Limpar PDV Completo</h3>
                  <p className="text-gray-400 text-sm">Esta ação não pode ser desfeita</p>
                </div>
              </div>

              <p className="text-gray-300 mb-6">
                Tem certeza que deseja limpar todo o PDV?
                Você perderá {carrinho.length} produto(s) no carrinho{pedidosImportados.length > 0 && `, ${pedidosImportados.length} pedido(s) importado(s)`}, cliente selecionado e pagamentos em andamento.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmLimparCarrinho(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={limparCarrinhoCompleto}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Limpar PDV
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação - Importar Pedido */}
      <AnimatePresence>
        {showConfirmImportarPedido && pedidoParaImportar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-background-card rounded-lg p-6 max-w-md w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <ShoppingCart size={20} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Importar Pedido</h3>
                  <p className="text-gray-400 text-sm">Há itens no carrinho atual</p>
                </div>
              </div>

              <p className="text-gray-300 mb-4">
                Há <span className="text-primary-400 font-medium">{carrinho.filter(item => !item.pedido_origem_id).length} produto(s)</span> adicionados manualmente no carrinho.
              </p>

              <p className="text-gray-300 mb-6">
                Deseja limpar estes itens e importar o pedido?
                <br />
                <span className="text-green-400 font-medium">Pedido #{pedidoParaImportar.numero}</span>
                {pedidoParaImportar.cliente && (
                  <>
                    <br />
                    <span className="text-blue-400">Cliente: {pedidoParaImportar.cliente.nome}</span>
                  </>
                )}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowConfirmImportarPedido(false);
                    setPedidoParaImportar(null);
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarImportarPedido}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Importar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação - Remover Pedido Importado */}
      <AnimatePresence>
        {showConfirmRemovePedidoImportado && pedidoParaRemover && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-background-card rounded-lg p-6 max-w-md w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
                  <ShoppingBag size={20} className="text-orange-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Remover Pedido Importado</h3>
                  <p className="text-gray-400 text-sm">Esta ação não pode ser desfeita</p>
                </div>
              </div>

              <p className="text-gray-300 mb-4">
                Tem certeza que deseja remover as informações do pedido importado?
                <br />
                <span className="text-green-400 font-medium">Pedido #{pedidoParaRemover.numero}</span>
                {pedidoParaRemover.cliente && (
                  <>
                    <br />
                    <span className="text-blue-400">Cliente: {pedidoParaRemover.cliente.nome}</span>
                  </>
                )}
              </p>

              {(() => {
                const itensDoCarrinho = carrinho.filter(item => item.pedido_origem_id === pedidoParaRemover.id);
                const totalItens = itensDoCarrinho.reduce((total, item) => total + item.quantidade, 0);

                return itensDoCarrinho.length > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-6">
                    <p className="text-yellow-400 text-sm font-medium mb-1">⚠️ Atenção!</p>
                    <p className="text-gray-300 text-sm">
                      Os <span className="text-primary-400 font-medium">{itensDoCarrinho.length} produto(s)</span> deste pedido
                      serão removidos do carrinho ({totalItens} item(s) no total).
                    </p>
                    {carrinho.length > itensDoCarrinho.length && (
                      <p className="text-gray-400 text-xs mt-1">
                        Os demais produtos no carrinho serão mantidos.
                      </p>
                    )}
                  </div>
                );
              })()}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmRemovePedidoImportado(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={removerPedidoImportado}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Remover
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Produtos */}
      <AnimatePresence>
        {showAreaProdutos && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 flex items-center justify-center ${
              isFullscreen
                ? 'bg-background-dark p-0'
                : 'bg-black/50 p-4'
            }`}
            onClick={() => setShowAreaProdutos(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`bg-background-card flex flex-col ${
                isFullscreen
                  ? 'w-full h-full rounded-none'
                  : 'rounded-lg w-full max-w-6xl h-[90vh]'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Package size={20} />
                  Produtos
                </h3>

                <div className="flex items-center gap-2">
                  {/* Botão para alternar fullscreen */}
                  <button
                    onClick={() => {
                      if (isFullscreen) {
                        exitFullscreen();
                      } else {
                        enterFullscreen();
                      }
                    }}
                    className="w-8 h-8 bg-gray-600/20 hover:bg-gray-500/30 border border-gray-600/20 hover:border-gray-500/40 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-300 transition-all duration-200 group"
                    title={isFullscreen ? "Sair do modo tela cheia" : "Entrar em tela cheia"}
                  >
                    {isFullscreen ? (
                      <Minimize2 size={16} className="group-hover:scale-110 transition-transform" />
                    ) : (
                      <Maximize2 size={16} className="group-hover:scale-110 transition-transform" />
                    )}
                  </button>

                  {/* Botão para fechar */}
                  <button
                    onClick={() => setShowAreaProdutos(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="flex-1 p-4 flex flex-col overflow-hidden">
                {/* Barra de Busca */}
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Produto"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setShowAreaProdutos(false);
                        } else if (e.key === 'Enter' && searchTerm.trim()) {
                          // Se há produtos filtrados, adicionar o primeiro
                          if (produtosFiltrados.length > 0) {
                            adicionarAoCarrinho(produtosFiltrados[0]);
                            // Limpar o campo de pesquisa após adicionar o produto
                            setSearchTerm('');
                            // Manter o foco no campo para próxima digitação
                            setTimeout(() => {
                              const input = e.target as HTMLInputElement;
                              input.focus();
                            }, 10);
                          } else {
                            // Produto não encontrado - extrair o termo de busca real
                            let termoBusca = searchTerm.trim();
                            if (searchTerm.includes('*')) {
                              const partes = searchTerm.split('*');
                              if (partes.length >= 2) {
                                termoBusca = partes.slice(1).join('*').trim(); // Pega tudo após o primeiro *
                              }
                            }

                            // Mostrar modal de produto não encontrado
                            mostrarProdutoNaoEncontrado(termoBusca);

                            // Limpar o campo e manter o foco
                            setSearchTerm('');
                            setTimeout(() => {
                              const input = e.target as HTMLInputElement;
                              input.focus();
                            }, 10);
                          }
                        }
                      }}
                      autoFocus
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-3 pl-10 pr-12 text-white placeholder-gray-300 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                    />
                    <QrCode size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />

                    {/* Ícone ESC */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <span className="text-xs text-gray-300 bg-gray-700 px-1 py-0.5 rounded">ESC</span>
                    </div>

                    {/* Indicador de quantidade */}
                    {searchTerm.includes('*') && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="bg-primary-500 text-white text-xs px-2 py-1 rounded-full">
                          Qtd: {searchTerm.split('*')[0]}
                        </div>
                      </div>
                    )}
                  </div>
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

                {/* Grid de Produtos - Compacto */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {produtosFiltrados.length === 0 ? (
                    <div className="text-center py-6">
                      <Package size={40} className="mx-auto mb-3 text-gray-500" />
                      <p className="text-gray-400 text-sm">Nenhum produto encontrado</p>
                    </div>
                  ) : (
                    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
                      {produtosFiltrados.map(produto => (
                        <motion.div
                          key={produto.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            adicionarAoCarrinho(produto);
                            setShowAreaProdutos(false);
                          }}
                          className="bg-gray-800 rounded overflow-hidden border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer flex flex-col"
                        >
                          {/* Imagem do produto - Compacta */}
                          <div
                            className="h-20 bg-gray-900 relative cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirGaleria(produto, e);
                            }}
                          >
                            {getFotoPrincipal(produto) ? (
                              <img
                                src={getFotoPrincipal(produto)!.url}
                                alt={produto.nome}
                                className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package size={20} className="text-gray-700" />
                              </div>
                            )}

                            {/* Indicador de múltiplas fotos - Compacto */}
                            {produto.produto_fotos && produto.produto_fotos.length > 1 && (
                              <div className="absolute top-0.5 left-0.5 bg-black/60 text-white text-xs px-1 py-0.5 rounded">
                                {produto.produto_fotos.length}
                              </div>
                            )}

                            {/* Badge de promoção - Compacto */}
                            {produto.promocao && (
                              <div className="absolute top-0.5 right-0.5 bg-red-500 text-white text-xs font-bold px-1 py-0.5 rounded">
                                {produto.tipo_desconto === 'percentual'
                                  ? `-${produto.valor_desconto}%`
                                  : formatCurrency(produto.valor_desconto || 0)}
                              </div>
                            )}
                          </div>

                          {/* Informações do produto - Compactas */}
                          <div className="p-2">
                            <h3 className="text-white text-xs font-medium line-clamp-2 mb-1">{produto.nome}</h3>

                            <div className="mb-1">
                              <p className="text-gray-400 text-xs">Código {produto.codigo}</p>
                            </div>

                            {/* Preço - Compacto */}
                            <div className="mb-1">
                              {produto.promocao ? (
                                <div>
                                  <span className="text-gray-400 line-through text-xs block">
                                    {formatCurrency(produto.preco)}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-primary-400 font-bold text-sm">
                                      {formatCurrency(calcularPrecoFinal(produto))}
                                    </span>
                                    {produto.unidade_medida && (
                                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-700 text-gray-300">
                                        {produto.unidade_medida.sigla}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-primary-400 font-bold text-sm">
                                    {formatCurrency(produto.preco)}
                                  </span>
                                  {produto.unidade_medida && (
                                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-700 text-gray-300">
                                      {produto.unidade_medida.sigla}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Estoque - Compacto */}
                            <div className="text-xs text-gray-300 mb-0.5">
                              Estoque: {
                                produtosEstoque[produto.id]
                                  ? formatarEstoque(produtosEstoque[produto.id].total, produto)
                                  : produto.estoque_inicial
                                    ? formatarEstoque(produto.estoque_inicial, produto)
                                    : '0'
                              }
                            </div>

                            {/* Desconto por quantidade - Compacto */}
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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de confirmação para remover pedido importado */}
      {showConfirmRemovePedidoImportado && pedidoParaRemover && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-card border border-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Remover Pedido Importado</h3>
                <p className="text-sm text-gray-400">Esta ação não pode ser desfeita</p>
              </div>
            </div>

            <p className="text-gray-300 mb-6">
              Tem certeza que deseja remover o pedido <span className="text-white font-medium">#{pedidoParaRemover.numero}</span>?
              <br />
              <br />
              <span className="text-yellow-400">⚠️ Isso irá remover:</span>
              <br />
              • Todos os itens deste pedido do carrinho
              <br />
              • As informações do pedido importado
              <br />
              {pedidosImportados.length === 1 && !pdvConfig?.seleciona_clientes && (
                <>
                  • O cliente importado
                  <br />
                  • Os descontos de faturamento
                  <br />
                </>
              )}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmRemovePedidoImportado(false);
                  setPedidoParaRemover(null);
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={removerPedidoImportado}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação para limpeza geral do PDV */}
      {showConfirmLimparTudoPDV && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-card border border-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Cancelar Venda</h3>
                <p className="text-sm text-gray-400">Esta ação irá limpar todos os dados</p>
              </div>
            </div>

            <p className="text-gray-300 mb-6">
              Tem certeza que deseja cancelar a venda e limpar todos os dados do PDV?
              <br />
              <br />
              <span className="text-yellow-400">⚠️ Isso irá remover:</span>
              <br />
              • Todos os itens do carrinho
              <br />
              • Cliente selecionado
              <br />
              • Pedidos importados
              <br />
              • Formas de pagamento configuradas
              <br />
              • Dados da nota fiscal
              <br />
              • Todos os descontos aplicados
              <br />
              <br />
              <span className="text-red-400 font-medium">Esta ação não pode ser desfeita!</span>
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmLimparTudoPDV(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Manter Dados
              </button>
              <button
                onClick={limparTudoPDV}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Limpar Tudo
              </button>
            </div>
          </div>
        </div>
      )}
      </motion.div>

      {/* Modal de Processamento da Venda */}
      <AnimatePresence>
        {showProcessandoVenda && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background-card border border-gray-800 rounded-lg p-8 max-w-md w-full mx-4"
            >
              <div className="text-center">
                {/* Ícone de loading */}
                <div className="w-16 h-16 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>

                {/* Título */}
                <h3 className="text-xl font-semibold text-white mb-2">
                  Processando Venda
                </h3>

                {/* Número da venda se disponível */}
                {numeroVendaProcessada && (
                  <p className="text-primary-400 font-medium mb-4">
                    #{numeroVendaProcessada}
                  </p>
                )}

                {/* Etapa atual */}
                <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {etapaProcessamento}
                  </p>
                </div>

                {/* Barra de progresso animada */}
                <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
                  <div className="bg-primary-500 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                </div>

                {/* Aviso importante */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-yellow-300 text-xs">
                    ⚠️ Não feche esta janela durante o processamento
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Opções Adicionais */}
      {produtoParaAdicionais && (
        <OpcoesAdicionaisModal
          isOpen={showOpcoesAdicionaisModal}
          onClose={() => {
            setShowOpcoesAdicionaisModal(false);
            setProdutoParaAdicionais(null);
            setItemCarrinhoParaAdicionais(null);
          }}
          produto={produtoParaAdicionais}
          onConfirm={confirmarOpcoesAdicionais}
        />
      )}

      {/* Modal de Observação Adicional */}
      {showObservacaoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-card border border-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                <MessageSquare size={20} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Observação Adicional</h3>
                <p className="text-sm text-gray-400">Adicione uma observação para este produto</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-white mb-2">
                Observação
              </label>
              <textarea
                value={observacaoTexto}
                onChange={(e) => setObservacaoTexto(e.target.value)}
                placeholder="Digite uma observação para este produto..."
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 resize-none"
                rows={3}
                autoFocus
              />
              <p className="text-gray-400 text-xs mt-1">
                Esta observação aparecerá junto com o produto no carrinho
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowObservacaoModal(false);
                  setItemParaObservacao(null);
                  setObservacaoTexto('');
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarObservacao}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Produto Não Encontrado */}
      {showProdutoNaoEncontrado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-card border border-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
                <Package size={20} className="text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Produto Não Encontrado</h3>
                <p className="text-sm text-gray-400">O item digitado não existe no sistema</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-300 mb-3">
                O produto <span className="text-white font-medium bg-gray-800 px-2 py-1 rounded">"{produtoNaoEncontradoTermo}"</span> não foi encontrado.
              </p>
              <p className="text-gray-400 text-sm">
                Verifique se o código ou nome está correto e tente novamente.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowProdutoNaoEncontrado(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  setShowProdutoNaoEncontrado(false);
                  setShowAreaProdutos(true);
                }}
                className="flex-1 bg-primary-500 hover:bg-primary-600 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Ver Produtos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDVPage;
