import React, { useState, useEffect, useRef } from 'react';
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
  Minimize2,
  Camera
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
  vendedor_id?: string; // ID do vendedor responsável por este item
  vendedor_nome?: string; // Nome do vendedor responsável por este item
  vendaSemProduto?: boolean; // ✅ Indica se é um item de venda sem produto
  nome?: string; // ✅ Nome personalizado para venda sem produto
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
  const [showVendaSemProdutoModal, setShowVendaSemProdutoModal] = useState(false);
  const [valorVendaSemProduto, setValorVendaSemProduto] = useState('');
  const [descricaoVendaSemProduto, setDescricaoVendaSemProduto] = useState('');
  const valorVendaSemProdutoRef = useRef<HTMLInputElement>(null);
  const [showMovimentosModal, setShowMovimentosModal] = useState(false);
  const [showDescontoTotalModal, setShowDescontoTotalModal] = useState(false);
  const [descontoTotal, setDescontoTotal] = useState(0);
  const [tipoDescontoTotal, setTipoDescontoTotal] = useState<'percentual' | 'valor'>('percentual');
  const [descontoGlobal, setDescontoGlobal] = useState(0);

  // Função para aplicar desconto no total
  const aplicarDescontoTotal = () => {
    if (descontoTotal <= 0) {
      toast.error('Digite um valor de desconto válido');
      return;
    }

    const totalAtual = carrinho.reduce((total, item) => total + item.subtotal, 0);

    if (tipoDescontoTotal === 'percentual') {
      if (descontoTotal > 100) {
        toast.error('Desconto percentual não pode ser maior que 100%');
        return;
      }
      const valorDesconto = (totalAtual * descontoTotal) / 100;
      setDescontoGlobal(valorDesconto);
      toast.success(`Desconto de ${descontoTotal}% aplicado (${formatCurrency(valorDesconto)})`);
    } else {
      if (descontoTotal >= totalAtual) {
        toast.error('Desconto em valor não pode ser maior ou igual ao total da venda');
        return;
      }
      setDescontoGlobal(descontoTotal);
      toast.success(`Desconto de ${formatCurrency(descontoTotal)} aplicado`);
    }

    setShowDescontoTotalModal(false);
    setDescontoTotal(0);
  };

  // Função para remover desconto global
  const removerDescontoGlobal = () => {
    setDescontoGlobal(0);
    toast.info('Desconto no total removido');
  };

  // Estados para o modal de movimentos
  const [vendas, setVendas] = useState<any[]>([]);
  const [loadingVendas, setLoadingVendas] = useState(false);

  // ✅ NOVO: Estados para modal de edição NFC-e
  const [showEditarNfceModal, setShowEditarNfceModal] = useState(false);
  const [vendaParaEditarNfce, setVendaParaEditarNfce] = useState<any>(null);
  const [itensNfceEdicao, setItensNfceEdicao] = useState<any[]>([]);
  const [loadingItensNfce, setLoadingItensNfce] = useState(false);
  const [reprocessandoNfce, setReprocessandoNfce] = useState(false);
  const [editandoNumeroNfce, setEditandoNumeroNfce] = useState(false);
  const [numeroNfceEditavel, setNumeroNfceEditavel] = useState<string>('');
  const [serieNfce, setSerieNfce] = useState<number>(1); // ✅ NOVO: Estado para série da NFC-e

  // ✅ NOVO: Estados para emissão de NFC-e no modal de itens
  const [cpfCnpjModalItens, setCpfCnpjModalItens] = useState('');
  const [tipoDocumentoModalItens, setTipoDocumentoModalItens] = useState<'cpf' | 'cnpj'>('cpf');
  const [erroValidacaoModalItens, setErroValidacaoModalItens] = useState('');
  const [emitindoNfceModalItens, setEmitindoNfceModalItens] = useState(false);
  const [numeroNfceModalItens, setNumeroNfceModalItens] = useState<string>('');
  const [loadingProximoNumero, setLoadingProximoNumero] = useState(false);

  // ✅ NOVO: Estados para seletor de unidade de medida
  const [showSeletorUnidadeModal, setShowSeletorUnidadeModal] = useState(false);
  const [itemParaEditarUnidade, setItemParaEditarUnidade] = useState<any>(null);
  const [unidadesMedida, setUnidadesMedida] = useState<any[]>([]);
  const [loadingUnidades, setLoadingUnidades] = useState(false);

  // Estados para filtros avançados
  const [showFiltrosVendas, setShowFiltrosVendas] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'canceladas' | 'finalizadas' | 'pedidos'>('todas');
  const [filtroNfce, setFiltroNfce] = useState<'todas' | 'pendentes' | 'autorizadas' | 'canceladas'>('todas'); // ✅ NOVO: Filtro específico para NFC-e
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
  const [contadorNfcePendentes, setContadorNfcePendentes] = useState<number>(0);
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

  // Estados específicos para modal de NFC-e
  const [statusProcessamento, setStatusProcessamento] = useState<'processando' | 'sucesso' | 'erro' | 'aguardando_impressao'>('processando');

  // Estados específicos para impressão
  const [dadosImpressao, setDadosImpressao] = useState<any>(null);
  const [tipoFinalizacaoAtual, setTipoFinalizacaoAtual] = useState<string>('');
  const [erroProcessamento, setErroProcessamento] = useState<string>('');
  const [numeroDocumentoReservado, setNumeroDocumentoReservado] = useState<number | null>(null);
  const [serieDocumentoReservado, setSerieDocumentoReservado] = useState<number | null>(null); // ✅ NOVO: Série reservada

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

  // ✅ ADICIONADO: Estados que estavam faltando para adicionais
  const [showAdicionaisModal, setShowAdicionaisModal] = useState(false);
  const [itemParaAdicionais, setItemParaAdicionais] = useState<ItemCarrinho | null>(null);

  // Estados para edição de nome do produto
  const [itemEditandoNome, setItemEditandoNome] = useState<string | null>(null);
  const [nomeEditando, setNomeEditando] = useState<string>('');

  // Estados para observação adicional
  const [showObservacaoModal, setShowObservacaoModal] = useState(false);
  const [itemParaObservacao, setItemParaObservacao] = useState<string | null>(null);
  const [observacaoTexto, setObservacaoTexto] = useState<string>('');
  const [itemEditandoObservacao, setItemEditandoObservacao] = useState<string | null>(null);
  const [observacaoEditando, setObservacaoEditando] = useState<string>('');

  // Estados para seleção de vendedor
  const [showVendedorModal, setShowVendedorModal] = useState(false);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [vendedorSelecionado, setVendedorSelecionado] = useState<any>(null);
  const [aguardandoSelecaoVendedor, setAguardandoSelecaoVendedor] = useState(false);
  const [produtoAguardandoVendedor, setProdutoAguardandoVendedor] = useState<Produto | null>(null);
  const [quantidadeAguardandoVendedor, setQuantidadeAguardandoVendedor] = useState<number>(1); // ✅ NOVO: Para armazenar quantidade do modal

  // Estados para venda sem produto aguardando vendedor/quantidade
  const [vendaSemProdutoAguardando, setVendaSemProdutoAguardando] = useState<{nome: string, preco: number} | null>(null);

  // Estados para modal de quantidade (vendas_itens_multiplicacao)
  const [showQuantidadeModal, setShowQuantidadeModal] = useState(false);
  const [produtoParaQuantidade, setProdutoParaQuantidade] = useState<Produto | null>(null);
  const [quantidadeModal, setQuantidadeModal] = useState(1);

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

    // Se não há mais pedidos importados, sempre limpar cliente e descontos
    const pedidosRestantes = pedidosImportados.filter(p => p.id !== pedidoParaRemover.id);
    if (pedidosRestantes.length === 0) {
      setClienteSelecionado(null);
      setDescontoPrazoSelecionado(null);
      setDescontosCliente({ prazo: [], valor: [] });
      // Limpar também dados da nota fiscal
      setCpfCnpjNota('');
      setClienteEncontrado(null);
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
    setDescontoGlobal(0);

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
              unidade_medida:unidade_medida_id (
                id,
                sigla,
                nome
              ),
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
    loadContadorNfcePendentes(); // Carrega contador de NFC-e pendentes
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
      id: 'venda-sem-produto',
      icon: DollarSign,
      label: 'Venda sem Produto',
      color: 'green',
      onClick: (e?: React.MouseEvent) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        // Preencher o campo com o valor padrão configurado
        setDescricaoVendaSemProduto(pdvConfig?.venda_sem_produto_nome_padrao || 'Diversos');
        setValorVendaSemProduto(''); // Limpar o valor para nova entrada
        setShowVendaSemProdutoModal(true);
      }
    },
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
      id: 'desconto-total',
      icon: Percent,
      label: 'Desconto no Total',
      color: 'orange',
      onClick: (e?: React.MouseEvent) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        setShowDescontoTotalModal(true);
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
        // Atualizar contador de NFC-e pendentes
        loadContadorNfcePendentes();
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
        return pdvConfig?.fiado === true; // ✅ CORRIGIDO: Usar configuração PDV
      }
      // Se for o item 'venda-sem-produto', só mostrar se a configuração estiver habilitada
      if (item.id === 'venda-sem-produto') {
        return pdvConfig?.venda_sem_produto === true;
      }
      // Se for o item 'desconto-total', só mostrar se a configuração estiver habilitada E houver itens no carrinho
      if (item.id === 'desconto-total') {
        return pdvConfig?.desconto_no_total === true && carrinho.length > 0;
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

  // ✅ NOVO: Recarregar formas de pagamento quando configuração PDV mudar
  useEffect(() => {
    if (pdvConfig !== null) { // Só executa depois que pdvConfig foi carregado
      loadFormasPagamento();
    }
  }, [pdvConfig?.fiado]); // Recarrega quando a configuração de fiado mudar

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
  }, [filtroStatus, filtroNfce, filtroDataInicio, filtroDataFim, filtroNumeroVenda, filtroNumeroPedido, showMovimentosModal]); // ✅ NOVO: Incluir filtroNfce

  // Estado para captura automática de código de barras
  const [codigoBarrasBuffer, setCodigoBarrasBuffer] = useState('');
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Listener global para captura de código de barras, F1-F9 e ESC
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Capturar teclas F0-F9 para atalhos do menu PDV
      if (event.key.startsWith('F') && event.key.length <= 3) {
        const fNumber = parseInt(event.key.substring(1));
        if (fNumber >= 0 && fNumber <= 9) {
          event.preventDefault();
          let menuIndex;
          if (fNumber === 0) {
            // F0 = primeiro item (índice 0)
            menuIndex = 0;
          } else {
            // F1-F9 = índices 1-9
            menuIndex = fNumber;
          }
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

  // Função para carregar contador de NFC-e pendentes
  const loadContadorNfcePendentes = async () => {
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

        // Contar vendas com status_fiscal = 'pendente' e tentativa_nfce = true
        const { count, error } = await supabase
          .from('pdv')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_id', usuarioData.empresa_id)
          .eq('status_fiscal', 'pendente')
          .eq('tentativa_nfce', true);

        if (error) {
          console.error('Erro ao contar NFC-e pendentes:', error);
          return;
        }

        setContadorNfcePendentes(count || 0);
      } catch (error) {
        console.error('Erro ao carregar contador de NFC-e pendentes:', error);
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
        loadContadorNfcePendentes();
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
          loadFormasPagamento(),
          loadVendedores()
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
        ncm,
        cfop,
        cst_icms,
        cst_pis,
        cst_cofins,
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
      .select('id, nome, telefone, documento') // ✅ CORREÇÃO: Incluir campo documento para preenchimento automático da Nota Fiscal Paulista
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
        vendas_itens_multiplicacao: false,
        ocultar_finalizar_com_impressao: false,
        ocultar_finalizar_sem_impressao: false,
        ocultar_nfce_com_impressao: false,
        ocultar_nfce_sem_impressao: false,
        ocultar_nfce_producao: false,
        ocultar_producao: false,
        rodape_personalizado: 'Obrigado pela preferencia volte sempre!'
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

      // ✅ NOVO: Filtrar "Fiado" baseado na configuração PDV
      let formasFiltradas = data || [];
      if (!pdvConfig?.fiado) {
        formasFiltradas = formasFiltradas.filter(forma =>
          forma.nome?.toLowerCase() !== 'fiado'
        );
      }

      setFormasPagamento(formasFiltradas);

      // Selecionar a primeira forma de pagamento como padrão
      if (formasFiltradas && formasFiltradas.length > 0) {
        setFormaPagamentoSelecionada(formasFiltradas[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar formas de pagamento:', error);
    }
  };

  const loadVendedores = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // Buscar usuários que são vendedores na empresa
      const { data: tiposUsuario } = await supabase
        .from('tipo_user_config')
        .select('id')
        .eq('tipo', 'vendedor');

      if (!tiposUsuario || tiposUsuario.length === 0) {
        setVendedores([]);
        return;
      }

      const tipoVendedorIds = tiposUsuario.map(tipo => tipo.id);

      // Buscar usuários que têm o tipo vendedor em seu array de tipos
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, email, tipo_user_config_id')
        .eq('empresa_id', usuarioData.empresa_id)
        .order('nome');

      if (error) throw error;

      // Filtrar usuários que têm tipo vendedor
      const vendedoresFiltrados = (data || []).filter(usuario => {
        if (Array.isArray(usuario.tipo_user_config_id)) {
          return usuario.tipo_user_config_id.some((tipoId: string) =>
            tipoVendedorIds.includes(tipoId)
          );
        } else {
          // Compatibilidade com formato antigo
          return tipoVendedorIds.includes(usuario.tipo_user_config_id);
        }
      });

      setVendedores(vendedoresFiltrados);
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
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
          cliente:clientes(id, nome, telefone, documento),
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
              ncm,
              cfop,
              cst_icms,
              cst_pis,
              cst_cofins,
              unidade_medida:unidade_medida_id (
                id,
                sigla,
                nome
              ),
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
      // ✅ FILTRO: Não mostrar NFe (modelo 55) - apenas vendas do PDV e NFC-e
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
          valor_desconto_itens,
          valor_desconto_total,
          valor_acrescimo,
          nome_cliente,
          documento_cliente,
          telefone_cliente,
          pedidos_importados,
          cancelada_em,
          motivo_cancelamento,
          cancelada_por_usuario_id,
          protocolo_cancelamento,
          empresa_id,
          usuario_id,
          vendedores_ids,
          tentativa_nfce,
          status_fiscal,
          erro_fiscal,
          modelo_documento,
          numero_documento,
          chave_nfe,
          protocolo_nfe,
          tipo_pagamento,
          forma_pagamento_id,
          formas_pagamento,
          valor_pago,
          valor_troco,
          parcelas
        `)
        .eq('empresa_id', usuarioData.empresa_id)
        .or('modelo_documento.is.null,modelo_documento.eq.65'); // ✅ Mostrar apenas vendas PDV (null) e NFC-e (65) - excluir NFe (55)

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

      // ✅ NOVO: Filtro específico para NFC-e
      if (filtroNfce === 'pendentes') {
        query = query.eq('modelo_documento', 65).eq('status_fiscal', 'pendente');
      } else if (filtroNfce === 'autorizadas') {
        query = query.eq('modelo_documento', 65).eq('status_fiscal', 'autorizada');
      } else if (filtroNfce === 'canceladas') {
        query = query.eq('modelo_documento', 65).eq('status_fiscal', 'cancelada');
      }
      // 'todas' não aplica filtro de NFC-e

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



      // Buscar informações dos usuários (operadores, vendedores e quem cancelou)
      const usuariosIds = [
        ...new Set([
          ...vendasData.map(v => v.usuario_id).filter(Boolean),
          ...vendasData.map(v => v.cancelada_por_usuario_id).filter(Boolean),
          // Adicionar vendedores das vendas
          ...vendasData.flatMap(v => v.vendedores_ids || []).filter(Boolean)
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

        // Processar vendedores da venda
        const vendedoresVenda = venda.vendedores_ids && Array.isArray(venda.vendedores_ids)
          ? venda.vendedores_ids.map(vendedorId => usuariosMap.get(vendedorId)).filter(Boolean)
          : [];

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
            documento: venda.documento_cliente,
            telefone: venda.telefone_cliente
          } : null,
          // Dados do usuário que fez a venda (operador)
          usuario_venda: venda.usuario_id ? usuariosMap.get(venda.usuario_id) : null,
          // Dados dos vendedores da venda
          vendedores_venda: vendedoresVenda,
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
    if (!vendaParaCancelar) {
      toast.error('Venda não selecionada');
      return;
    }

    // ✅ VALIDAÇÃO: Motivo obrigatório com mínimo de 15 caracteres
    if (motivoCancelamento.trim().length < 15) {
      toast.error('Motivo do cancelamento deve ter pelo menos 15 caracteres');
      return;
    }

    // ✅ NOVO: Verificar se é NFC-e autorizada para cancelamento fiscal
    const isNFCeAutorizada = vendaParaCancelar.modelo_documento === 65 &&
                             vendaParaCancelar.status_fiscal === 'autorizada' &&
                             vendaParaCancelar.chave_nfe &&
                             vendaParaCancelar.protocolo_nfe;

    try {
      // Obter dados do usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('Usuário não autenticado');
        return;
      }

      // ✅ NOVO: Verificar se é NFC-e autorizada para cancelamento fiscal
      const isNFCeAutorizada = vendaParaCancelar.modelo_documento === 65 &&
                               vendaParaCancelar.status_fiscal === 'autorizada' &&
                               vendaParaCancelar.chave_nfe &&
                               vendaParaCancelar.protocolo_nfe;

      if (isNFCeAutorizada) {
        console.log('🚫 FRONTEND: Iniciando cancelamento fiscal da NFC-e');

        // Validar prazo de 15 minutos para NFC-e
        const dataEmissao = new Date(vendaParaCancelar.data_emissao_nfe || vendaParaCancelar.finalizada_em);
        const agora = new Date();
        const diferencaMinutos = (agora.getTime() - dataEmissao.getTime()) / (1000 * 60);

        if (diferencaMinutos > 15) {
          toast.error('NFC-e não pode ser cancelada fiscalmente. Prazo de 15 minutos expirado.');
          return;
        }

        // ✅ CORREÇÃO: Backend busca empresa pela chave da NFC-e
        const cancelamentoData = {
          chave_nfe: vendaParaCancelar.chave_nfe,
          motivo: motivoCancelamento.trim(),
          protocolo_nfe: vendaParaCancelar.protocolo_nfe
        };

        console.log('📡 FRONTEND: Enviando cancelamento fiscal:', cancelamentoData);

        const cancelamentoResponse = await fetch('http://31.97.166.71/backend/public/cancelar-nfce.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(cancelamentoData)
        });

        if (!cancelamentoResponse.ok) {
          const errorText = await cancelamentoResponse.text();
          console.error('❌ FRONTEND: Erro no cancelamento fiscal:', errorText);
          throw new Error('Erro no cancelamento fiscal da NFC-e');
        }

        const cancelamentoResult = await cancelamentoResponse.json();

        if (!cancelamentoResult.success) {
          throw new Error(cancelamentoResult.error || 'Erro no cancelamento fiscal');
        }

        console.log('✅ FRONTEND: NFC-e cancelada fiscalmente com sucesso');
        toast.success('NFC-e cancelada fiscalmente com sucesso!');
      } else {
        // Cancelamento apenas no sistema (sem fiscal)
        console.log('📋 FRONTEND: Cancelamento apenas no sistema (não fiscal)');

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
      }

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
      toast.error(`Erro ao cancelar venda: ${error.message}`);
    }
  };

  // Função para carregar itens da venda
  const carregarItensVenda = async (vendaId: string) => {
    try {
      setLoadingItensVenda(true);

      // ✅ NOVO: Buscar regime tributário da empresa para exibição correta dos campos
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) throw new Error('Empresa não encontrada');

      const { data: empresaData } = await supabase
        .from('empresas')
        .select('regime_tributario')
        .eq('id', usuarioData.empresa_id)
        .single();

      const regimeTributario = empresaData?.regime_tributario || 1;

      // Carregar itens da venda com dados fiscais completos
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
          vendedor_id,
          vendedor_nome,
          cfop,
          cst_icms,
          csosn_icms,
          unidade,
          produto:produtos(
            id,
            codigo,
            codigo_barras,
            nome,
            ncm,
            cest,
            margem_st,
            aliquota_icms,
            unidade_medida_id,
            unidade_medida:unidade_medida(
              id,
              nome,
              sigla
            )
          ),
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

      // ✅ NOVO: Processar itens com campos editáveis para NFC-e
      const itensProcessados = (itensData || []).map((item, index) => ({
        ...item,
        sequencia: index + 1,
        cfop_editavel: item.cfop || '5102',
        cst_editavel: item.cst_icms || '00',
        csosn_editavel: item.csosn_icms || '102',
        ncm_editavel: item.produto?.ncm || '00000000',
        cest_editavel: item.produto?.cest || '',
        margem_st_editavel: item.produto?.margem_st || '',
        aliquota_icms_editavel: item.produto?.aliquota_icms || '',
        regime_tributario: regimeTributario,
        editando_cfop: false,
        editando_cst: false,
        editando_csosn: false,
        editando_ncm: false,
        editando_cest: false,
        editando_margem_st: false,
        editando_aliquota_icms: false
      }));

      setItensVenda(itensProcessados);

    } catch (error) {
      console.error('Erro ao carregar itens da venda:', error);
      toast.error('Erro ao carregar itens da venda');
    } finally {
      setLoadingItensVenda(false);
    }
  };

  // ✅ NOVA: Função para carregar itens para edição da NFC-e
  const carregarItensParaEdicaoNfce = async (vendaId: string) => {
    try {
      setLoadingItensNfce(true);

      // ✅ NOVO: Buscar regime tributário da empresa
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) throw new Error('Empresa não encontrada');

      const { data: empresaData } = await supabase
        .from('empresas')
        .select('regime_tributario')
        .eq('id', usuarioData.empresa_id)
        .single();

      const regimeTributario = empresaData?.regime_tributario || 3; // Default: Simples Nacional

      // Carregar itens da venda com dados básicos dos produtos
      const { data: itensData, error: itensError } = await supabase
        .from('pdv_itens')
        .select(`
          id,
          produto_id,
          codigo_produto,
          nome_produto,
          quantidade,
          valor_unitario,
          valor_total_item,
          cfop,
          cst_icms,
          csosn_icms,
          produto:produtos(
            id,
            codigo,
            codigo_barras,
            nome,
            ncm,
            cest,
            margem_st,
            aliquota_icms,
            unidade_medida_id
          )
        `)
        .eq('pdv_id', vendaId)
        .order('created_at', { ascending: true });

      if (itensError) {
        console.error('Erro na query Supabase:', itensError);
        throw itensError;
      }

      // Processar itens para edição com campos editáveis
      const itensProcessados = (itensData || []).map((item, index) => ({
        ...item,
        sequencia: index + 1,
        cfop_editavel: item.cfop || '5102', // CFOP da venda ou padrão
        cst_editavel: item.cst_icms || '00', // CST da venda ou padrão
        csosn_editavel: item.csosn_icms || '102', // CSOSN da venda ou padrão
        ncm_editavel: item.produto?.ncm || '00000000', // ✅ NOVO: NCM editável
        cest_editavel: item.produto?.cest || '', // ✅ NOVO: CEST editável
        margem_st_editavel: item.produto?.margem_st || '0', // ✅ NOVO: Margem ST editável
        aliquota_icms_editavel: item.produto?.aliquota_icms || '0', // ✅ NOVO: Alíquota ICMS editável
        regime_tributario: regimeTributario, // ✅ NOVO: Regime real da empresa
        editando_cfop: false,
        editando_cst: false,
        editando_csosn: false,
        editando_ncm: false, // ✅ NOVO: Estado de edição do NCM
        editando_cest: false, // ✅ NOVO: Estado de edição do CEST
        editando_margem_st: false, // ✅ NOVO: Estado de edição da Margem ST
        editando_aliquota_icms: false // ✅ NOVO: Estado de edição da Alíquota ICMS
      }));

      console.log('✅ Itens carregados para edição NFC-e:', itensProcessados);
      console.log('✅ Regime tributário da empresa:', regimeTributario);
      setItensNfceEdicao(itensProcessados);

    } catch (error: any) {
      console.error('Erro ao carregar itens para edição NFC-e:', error);
      toast.error(`Erro ao carregar itens: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoadingItensNfce(false);
    }
  };

  // ✅ NOVAS: Funções para editar campos fiscais (NFC-e)
  const habilitarEdicaoCampo = (itemIndex: number, campo: 'cfop' | 'cst' | 'csosn' | 'ncm' | 'cest' | 'margem_st' | 'aliquota_icms') => {
    setItensNfceEdicao(prev => prev.map((item, index) =>
      index === itemIndex
        ? { ...item, [`editando_${campo}`]: true }
        : item
    ));
  };

  const salvarEdicaoCampo = (itemIndex: number, campo: 'cfop' | 'cst' | 'csosn' | 'ncm' | 'cest' | 'margem_st' | 'aliquota_icms', novoValor: string) => {
    setItensNfceEdicao(prev => prev.map((item, index) =>
      index === itemIndex
        ? {
            ...item,
            [`${campo}_editavel`]: novoValor,
            [`editando_${campo}`]: false
          }
        : item
    ));
  };

  const cancelarEdicaoCampo = (itemIndex: number, campo: 'cfop' | 'cst' | 'csosn' | 'ncm' | 'cest' | 'margem_st' | 'aliquota_icms') => {
    setItensNfceEdicao(prev => prev.map((item, index) =>
      index === itemIndex
        ? { ...item, [`editando_${campo}`]: false }
        : item
    ));
  };

  // ✅ NOVO: Funções para editar campos fiscais no modal de itens
  const habilitarEdicaoCampoModalItens = (itemIndex: number, campo: 'cfop' | 'cst' | 'csosn' | 'ncm' | 'cest' | 'margem_st' | 'aliquota_icms') => {
    setItensVenda(prev => prev.map((item, index) =>
      index === itemIndex
        ? { ...item, [`editando_${campo}`]: true }
        : item
    ));
  };

  const salvarEdicaoCampoModalItens = (itemIndex: number, campo: 'cfop' | 'cst' | 'csosn' | 'ncm' | 'cest' | 'margem_st' | 'aliquota_icms', novoValor: string) => {
    setItensVenda(prev => prev.map((item, index) =>
      index === itemIndex
        ? {
            ...item,
            [`${campo}_editavel`]: novoValor,
            [`editando_${campo}`]: false
          }
        : item
    ));
  };

  const cancelarEdicaoCampoModalItens = (itemIndex: number, campo: 'cfop' | 'cst' | 'csosn' | 'ncm' | 'cest' | 'margem_st' | 'aliquota_icms') => {
    setItensVenda(prev => prev.map((item, index) =>
      index === itemIndex
        ? { ...item, [`editando_${campo}`]: false }
        : item
    ));
  };

  // ✅ NOVO: Função para atualizar dados fiscais dos produtos da NFC-e com informações do cadastro
  const handleAtualizarDadosProdutosNfce = async () => {
    if (itensVenda.length === 0) {
      toast.warning('Nenhum produto para atualizar');
      return;
    }

    try {
      toast.info('Atualizando dados dos produtos...');

      // Obter dados do usuário
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) throw new Error('Empresa não encontrada');

      // Buscar dados atualizados dos produtos no cadastro
      const produtoIds = itensVenda
        .filter(item => item.produto_id) // Apenas produtos que têm ID (vieram do cadastro)
        .map(item => item.produto_id);

      if (produtoIds.length === 0) {
        toast.warning('Nenhum produto vinculado ao cadastro para atualizar');
        return;
      }

      const { data: produtosCadastro, error } = await supabase
        .from('produtos')
        .select(`
          id,
          codigo,
          codigo_barras,
          nome,
          preco,
          ncm,
          cfop,
          origem_produto,
          situacao_tributaria,
          cst_icms,
          csosn_icms,
          cst_pis,
          cst_cofins,
          cst_ipi,
          aliquota_icms,
          aliquota_pis,
          aliquota_cofins,
          aliquota_ipi,
          cest,
          margem_st,
          peso_liquido,
          unidade_medida:unidade_medida_id (
            id,
            sigla,
            nome
          )
        `)
        .in('id', produtoIds)
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('ativo', true)
        .eq('deletado', false);

      if (error) throw error;

      if (!produtosCadastro || produtosCadastro.length === 0) {
        toast.warning('Nenhum produto encontrado no cadastro');
        return;
      }

      // Atualizar itens com dados do cadastro
      const itensAtualizados = itensVenda.map(item => {
        const produtoCadastro = produtosCadastro.find(p => p.id === item.produto_id);

        if (produtoCadastro) {
          return {
            ...item,
            // ✅ ATUALIZAR TODOS OS DADOS FISCAIS DO CADASTRO:
            ncm_editavel: produtoCadastro.ncm || item.ncm_editavel,
            cfop_editavel: produtoCadastro.cfop || item.cfop_editavel,
            cest_editavel: produtoCadastro.cest || item.cest_editavel,
            margem_st_editavel: produtoCadastro.margem_st || item.margem_st_editavel,
            aliquota_icms_editavel: produtoCadastro.aliquota_icms || item.aliquota_icms_editavel,

            // ICMS
            cst_editavel: produtoCadastro.cst_icms || item.cst_editavel,
            csosn_editavel: produtoCadastro.csosn_icms || item.csosn_editavel,

            // Atualizar também preço se necessário
            valor_unitario: produtoCadastro.preco || item.valor_unitario,
            valor_total_item: (produtoCadastro.preco || item.valor_unitario) * item.quantidade
          };
        }

        return item; // Manter item inalterado se não encontrado no cadastro
      });

      // Aplicar atualizações
      setItensVenda(itensAtualizados);

      const produtosAtualizadosCount = produtosCadastro.length;
      toast.success(`${produtosAtualizadosCount} produto(s) atualizado(s) com dados do cadastro`);

      console.log('✅ Produtos NFC-e atualizados:', {
        total: itensVenda.length,
        atualizados: produtosAtualizadosCount,
        produtosCadastro
      });

    } catch (error: any) {
      console.error('Erro ao atualizar dados dos produtos NFC-e:', error);
      toast.error(`Erro ao atualizar produtos: ${error.message}`);
    }
  };

  // Função para atualizar dados fiscais dos produtos com informações do cadastro
  const handleAtualizarDadosProdutos = async () => {
    if (itensNfceEdicao.length === 0) {
      toast.warning('Nenhum produto para atualizar');
      return;
    }

    try {
      toast.info('Atualizando dados dos produtos...');

      // Obter dados do usuário
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) throw new Error('Empresa não encontrada');

      // Buscar dados atualizados dos produtos no cadastro
      const produtoIds = itensNfceEdicao
        .filter(item => item.produto_id) // Apenas produtos que têm ID (vieram do cadastro)
        .map(item => item.produto_id);

      if (produtoIds.length === 0) {
        toast.warning('Nenhum produto vinculado ao cadastro para atualizar');
        return;
      }

      const { data: produtosCadastro, error } = await supabase
        .from('produtos')
        .select(`
          id,
          codigo,
          codigo_barras,
          nome,
          preco,
          ncm,
          cfop,
          origem_produto,
          situacao_tributaria,
          cst_icms,
          csosn_icms,
          cst_pis,
          cst_cofins,
          cst_ipi,
          aliquota_icms,
          aliquota_pis,
          aliquota_cofins,
          aliquota_ipi,
          cest,
          margem_st,
          peso_liquido,
          unidade_medida_id,
          unidade_medida:unidade_medida_id (
            id,
            sigla,
            nome
          )
        `)
        .in('id', produtoIds)
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('ativo', true)
        .eq('deletado', false);

      if (error) throw error;

      if (!produtosCadastro || produtosCadastro.length === 0) {
        toast.warning('Nenhum produto encontrado no cadastro');
        return;
      }

      // Atualizar itens com dados do cadastro
      const itensAtualizados = itensNfceEdicao.map(item => {
        const produtoCadastro = produtosCadastro.find(p => p.id === item.produto_id);

        if (produtoCadastro) {
          return {
            ...item,
            // ✅ ATUALIZAR TODOS OS DADOS FISCAIS DO CADASTRO:
            ncm_editavel: produtoCadastro.ncm || item.ncm_editavel,
            cfop_editavel: produtoCadastro.cfop || item.cfop_editavel,
            cest_editavel: produtoCadastro.cest || item.cest_editavel,
            margem_st_editavel: produtoCadastro.margem_st ?? item.margem_st_editavel,
            aliquota_icms_editavel: produtoCadastro.aliquota_icms ?? item.aliquota_icms_editavel,
            cst_editavel: produtoCadastro.cst_icms || item.cst_editavel,
            csosn_editavel: produtoCadastro.csosn_icms || item.csosn_editavel,
            origem_produto_editavel: produtoCadastro.origem_produto ?? item.origem_produto_editavel,

            // Atualizar dados do produto também
            produto: {
              ...item.produto,
              ncm: produtoCadastro.ncm || item.produto?.ncm,
              cfop: produtoCadastro.cfop || item.produto?.cfop,
              codigo_barras: produtoCadastro.codigo_barras || item.produto?.codigo_barras,
              unidade_medida_id: produtoCadastro.unidade_medida_id || item.produto?.unidade_medida_id,
              unidade_medida: produtoCadastro.unidade_medida || item.produto?.unidade_medida,
              origem_produto: produtoCadastro.origem_produto ?? item.produto?.origem_produto,
              situacao_tributaria: produtoCadastro.situacao_tributaria || item.produto?.situacao_tributaria,
              cst_icms: produtoCadastro.cst_icms || item.produto?.cst_icms,
              csosn_icms: produtoCadastro.csosn_icms || item.produto?.csosn_icms,
              aliquota_icms: produtoCadastro.aliquota_icms ?? item.produto?.aliquota_icms,
              cst_pis: produtoCadastro.cst_pis || item.produto?.cst_pis,
              cst_cofins: produtoCadastro.cst_cofins || item.produto?.cst_cofins,
              aliquota_pis: produtoCadastro.aliquota_pis ?? item.produto?.aliquota_pis,
              aliquota_cofins: produtoCadastro.aliquota_cofins ?? item.produto?.aliquota_cofins,
              cest: produtoCadastro.cest || item.produto?.cest,
              margem_st: produtoCadastro.margem_st ?? item.produto?.margem_st
            }
          };
        }

        return item; // Manter item inalterado se não encontrado no cadastro
      });

      // Aplicar atualizações
      setItensNfceEdicao(itensAtualizados);

      const produtosAtualizadosCount = produtosCadastro.length;
      toast.success(`${produtosAtualizadosCount} produto(s) atualizado(s) com dados do cadastro`);

      console.log('✅ Produtos atualizados:', {
        total: itensNfceEdicao.length,
        atualizados: produtosAtualizadosCount,
        produtosCadastro
      });

    } catch (error: any) {
      console.error('Erro ao atualizar dados dos produtos:', error);
      toast.error(`Erro ao atualizar produtos: ${error.message}`);
    }
  };

  // ✅ NOVA: Função para reprocessar NFC-e
  const reprocessarNfce = async () => {
    if (!vendaParaEditarNfce) return;

    try {
      setReprocessandoNfce(true);

      // ✅ NOVO: Salvar modificações nos itens antes de retransmitir
      console.log('💾 FRONTEND: Salvando modificações dos itens...');
      console.log('📋 FRONTEND: Itens para salvar:', itensNfceEdicao.map(item => ({
        id: item.id,
        produto: item.nome_produto,
        cfop: item.cfop_editavel,
        cst: item.cst_editavel,
        csosn: item.csosn_editavel
      })));

      for (const item of itensNfceEdicao) {
        const { error: updateError } = await supabase
          .from('pdv_itens')
          .update({
            cfop: item.cfop_editavel,
            cst_icms: item.regime_tributario === 1 ? null : item.cst_editavel, // ✅ CORREÇÃO: 1 = Simples Nacional (CSOSN)
            csosn_icms: item.regime_tributario === 1 ? item.csosn_editavel : null // ✅ CORREÇÃO: 1 = Simples Nacional (CSOSN)
          })
          .eq('id', item.id);

        if (updateError) {
          console.error('Erro ao atualizar item:', updateError);
          throw new Error(`Erro ao salvar modificações do item ${item.nome_produto}`);
        }
      }

      // ✅ NOVO: Salvar número da NFC-e se foi editado
      if (vendaParaEditarNfce.numero_documento) {
        console.log('💾 FRONTEND: Salvando número da NFC-e editado...');
        const { error: updateNumeroError } = await supabase
          .from('pdv')
          .update({
            numero_documento: vendaParaEditarNfce.numero_documento
          })
          .eq('id', vendaParaEditarNfce.id);

        if (updateNumeroError) {
          console.error('Erro ao atualizar número da NFC-e:', updateNumeroError);
          throw new Error('Erro ao salvar número da NFC-e editado');
        }
      }

      console.log('✅ FRONTEND: Modificações salvas, iniciando retransmissão...');
      toast.success('Modificações salvas! Iniciando retransmissão...');

      // Preparar dados atualizados dos itens
      const itensAtualizados = itensNfceEdicao.map(item => {
        const unidadeCalculada = item.produto?.unidade_medida?.sigla || item.unidade || 'UN';

        console.log(`🔍 REPROCESSAMENTO - Item ${item.nome_produto}:`, {
          produto_unidade_medida: item.produto?.unidade_medida,
          produto_unidade_medida_id: item.produto?.unidade_medida_id,
          produto_unidade_medida_sigla: item.produto?.unidade_medida?.sigla,
          item_unidade: item.unidade,
          unidade_final_sigla: unidadeCalculada,
          unidade_id_enviado: item.produto?.unidade_medida_id
        });

        return {
          codigo: item.produto?.codigo || item.codigo_produto,
          descricao: item.nome_produto,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          unidade: item.produto?.unidade_medida?.sigla, // ✅ CORREÇÃO: Usar sigla como string (igual venda normal)
          ncm: item.ncm_editavel || '00000000', // ✅ CORREÇÃO: Usar NCM editável
          cfop: item.cfop_editavel,
          cst_icms: item.regime_tributario === 1 ? undefined : item.cst_editavel, // ✅ CORREÇÃO: 1 = Simples Nacional (CSOSN)
          csosn_icms: item.regime_tributario === 1 ? item.csosn_editavel : undefined, // ✅ CORREÇÃO: 1 = Simples Nacional (CSOSN)
          codigo_barras: item.produto?.codigo_barras
        };
      });

      console.log('📋 REPROCESSAMENTO - Itens preparados:', itensAtualizados);
      console.log('📋 REPROCESSAMENTO - Primeiro item detalhado:', JSON.stringify(itensAtualizados[0], null, 2));

      // Buscar dados da empresa e ambiente
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id, serie_nfce')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) throw new Error('Empresa não encontrada');

      // ✅ NOVO: Obter série do usuário logado
      const serieUsuario = usuarioData.serie_nfce || 1;

      const { data: empresaData } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', usuarioData.empresa_id)
        .single();

      const { data: nfeConfigData } = await supabase
        .from('nfe_config')
        .select('ambiente')
        .eq('empresa_id', usuarioData.empresa_id)
        .single();

      if (!empresaData || !nfeConfigData) {
        throw new Error('Dados da empresa ou configuração NFe não encontrados');
      }

      // Preparar payload para reprocessamento
      const nfceData = {
        empresa: {
          razao_social: empresaData.razao_social,
          cnpj: empresaData.documento,
          nome_fantasia: empresaData.nome_fantasia,
          inscricao_estadual: empresaData.inscricao_estadual,
          regime_tributario: empresaData.regime_tributario || 1,
          uf: empresaData.estado,
          codigo_municipio: parseInt(empresaData.codigo_municipio) || 3524402,
          codigo_uf: getCodigoUF(empresaData.estado),
          endereco: {
            logradouro: empresaData.endereco,
            numero: empresaData.numero,
            bairro: empresaData.bairro,
            cidade: empresaData.cidade,
            cep: empresaData.cep
          },
          csc_homologacao: empresaData.csc_homologacao,
          csc_id_homologacao: empresaData.csc_id_homologacao,
          csc_producao: empresaData.csc_producao,
          csc_id_producao: empresaData.csc_id_producao
        },
        ambiente: nfeConfigData.ambiente,
        identificacao: {
          numero: vendaParaEditarNfce.numero_documento || await gerarProximoNumeroNFCe(usuarioData.empresa_id), // ✅ Usa número editado
          serie: serieUsuario, // ✅ NOVO: Série individual do usuário logado
          codigo_numerico: Math.floor(Math.random() * 99999999).toString().padStart(8, '0'),
          natureza_operacao: 'Venda de mercadoria'
        },
        // ✅ CORREÇÃO: Incluir documento mesmo se nome não estiver preenchido
        destinatario: (() => {
          if (vendaParaEditarNfce.documento_cliente && vendaParaEditarNfce.nome_cliente) {
            return {
              documento: vendaParaEditarNfce.documento_cliente,
              nome: vendaParaEditarNfce.nome_cliente
            };
          }
          if (vendaParaEditarNfce.documento_cliente) {
            return {
              documento: vendaParaEditarNfce.documento_cliente,
              nome: 'CONSUMIDOR'
            };
          }
          return {};
        })(),
        produtos: itensAtualizados
      };

      // Enviar para reprocessamento
      const response = await fetch('/backend/public/emitir-nfce.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          empresa_id: usuarioData.empresa_id,
          nfce_data: nfceData
        })
      });

      if (!response.ok) {
        const errorResponse = await response.text();
        try {
          const errorJson = JSON.parse(errorResponse);
          throw new Error(errorJson.error || 'Erro no reprocessamento');
        } catch {
          throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro no reprocessamento');
      }

      // ✅ Número já foi salvo no início da função

      // Atualizar venda com sucesso
      const { error: updateError } = await supabase
        .from('pdv')
        .update({
          modelo_documento: 65,
          numero_documento: result.data.numero, // ✅ Confirmar número retornado pelo SEFAZ
          serie_documento: result.data.serie,
          chave_nfe: result.data.chave,
          protocolo_nfe: result.data.protocolo,
          status_fiscal: 'autorizada',
          erro_fiscal: null,
          data_emissao_nfe: result.data.data_autorizacao
        })
        .eq('id', vendaParaEditarNfce.id);

      if (updateError) {
        console.error('Erro ao atualizar venda:', updateError);
      }

      toast.success('NFC-e reprocessada e autorizada com sucesso!');
      setShowEditarNfceModal(false);
      loadVendas(); // Recarregar lista de vendas
      loadContadorNfcePendentes(); // Atualizar contador

    } catch (error: any) {
      console.error('Erro no reprocessamento:', error);

      // ✅ CORREÇÃO: Atualizar erro fiscal no banco quando reprocessamento falha
      try {
        const { error: updateError } = await supabase
          .from('pdv')
          .update({
            status_fiscal: 'pendente',
            erro_fiscal: error.message // ✅ Atualizar com o novo erro
          })
          .eq('id', vendaParaEditarNfce.id);

        if (updateError) {
          console.error('Erro ao atualizar erro fiscal:', updateError);
        } else {
          console.log('✅ FRONTEND: Erro fiscal atualizado no banco');

          // ✅ CORREÇÃO: Atualizar o erro no estado local para refletir no modal
          setVendaParaEditarNfce(prev => ({
            ...prev,
            erro_fiscal: error.message
          }));
        }
      } catch (updateError) {
        console.error('Erro ao salvar erro fiscal:', updateError);
      }

      toast.error(`Erro no reprocessamento: ${error.message}`);
    } finally {
      setReprocessandoNfce(false);
    }
  };

  // Função auxiliar para calcular código UF
  const getCodigoUF = (estado: string): number => {
    const codigosUF: { [key: string]: number } = {
      'AC': 12, 'AL': 17, 'AP': 16, 'AM': 13, 'BA': 29, 'CE': 23, 'DF': 53,
      'ES': 32, 'GO': 52, 'MA': 21, 'MT': 51, 'MS': 50, 'MG': 31, 'PA': 15,
      'PB': 25, 'PR': 41, 'PE': 26, 'PI': 22, 'RJ': 33, 'RN': 24, 'RS': 43,
      'RO': 11, 'RR': 14, 'SC': 42, 'SP': 35, 'SE': 28, 'TO': 27
    };
    return codigosUF[estado] || 35;
  };

  // ✅ NOVA: Função para carregar unidades de medida da empresa
  const loadUnidadesMedida = async () => {
    try {
      setLoadingUnidades(true);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      const { data: unidades, error } = await supabase
        .from('unidade_medida')
        .select('*')
        .eq('empresa_id', usuarioData.empresa_id)
        .order('nome');

      if (error) {
        console.error('Erro ao carregar unidades de medida:', error);
        toast.error('Erro ao carregar unidades de medida');
        return;
      }

      setUnidadesMedida(unidades || []);
    } catch (error) {
      console.error('Erro ao carregar unidades de medida:', error);
      toast.error('Erro ao carregar unidades de medida');
    } finally {
      setLoadingUnidades(false);
    }
  };

  // ✅ NOVA: Função para atualizar unidade de medida do produto
  const atualizarUnidadeProduto = async (unidadeSelecionada: any) => {
    if (!itemParaEditarUnidade) return;

    try {
      // Atualizar produto na base de dados
      const { error: updateError } = await supabase
        .from('produtos')
        .update({ unidade_medida_id: unidadeSelecionada.id })
        .eq('id', itemParaEditarUnidade.produto_id);

      if (updateError) {
        console.error('Erro ao atualizar unidade do produto:', updateError);
        toast.error('Erro ao atualizar unidade do produto');
        return;
      }

      // Atualizar item na lista local
      setItensNfceEdicao(prev => prev.map(item =>
        item.id === itemParaEditarUnidade.id
          ? {
              ...item,
              produto: {
                ...item.produto,
                unidade_medida_id: unidadeSelecionada.id,
                unidade_medida: {
                  id: unidadeSelecionada.id,
                  sigla: unidadeSelecionada.sigla,
                  nome: unidadeSelecionada.nome
                }
              }
            }
          : item
      ));

      toast.success(`Unidade atualizada para "${unidadeSelecionada.sigla}" com sucesso!`);
      setShowSeletorUnidadeModal(false);
      setItemParaEditarUnidade(null);

    } catch (error) {
      console.error('Erro ao atualizar unidade do produto:', error);
      toast.error('Erro ao atualizar unidade do produto');
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

    // Importar vendedor do pedido se existir e configuração estiver habilitada
    if (pdvConfig?.vendedor && pedido.usuario && !vendedorSelecionado) {
      setVendedorSelecionado({
        id: pedido.usuario.id,
        nome: pedido.usuario.nome,
        email: pedido.usuario.email
      });
    }

    // Importar cliente do pedido se existir e não houver cliente selecionado
    if (pedido.cliente && !clienteSelecionado) {
      const clienteImportado = {
        id: pedido.cliente.id,
        nome: pedido.cliente.nome,
        telefone: pedido.cliente.telefone,
        documento: pedido.cliente.documento // ✅ NOVO: Incluir documento para preenchimento automático
      };

      setClienteSelecionado(clienteImportado);

      // Carregar descontos do cliente
      carregarDescontosCliente(pedido.cliente.id);

      // ✅ NOVO: Preencher automaticamente CPF/CNPJ na Nota Fiscal Paulista
      if (pedido.cliente.documento && pedido.cliente.documento.trim()) {
        const documentoLimpo = pedido.cliente.documento.replace(/\D/g, '');
        if (documentoLimpo.length === 11) {
          // CPF
          setTipoDocumento('cpf');
          setCpfCnpjNota(formatCpf(documentoLimpo));
          setClienteEncontrado(clienteImportado);
          console.log('🎯 PDV: CPF do cliente importado preenchido automaticamente na Nota Fiscal Paulista:', formatCpf(documentoLimpo));
        } else if (documentoLimpo.length === 14) {
          // CNPJ
          setTipoDocumento('cnpj');
          setCpfCnpjNota(formatCnpj(documentoLimpo));
          setClienteEncontrado(clienteImportado);
          console.log('🎯 PDV: CNPJ do cliente importado preenchido automaticamente na Nota Fiscal Paulista:', formatCnpj(documentoLimpo));
        }
        setErroValidacao(''); // Limpar qualquer erro anterior
      }
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
        desconto: descontoInfo, // Preservar informações de desconto
        vendedor_id: pedido.usuario?.id, // Vendedor do pedido importado
        vendedor_nome: pedido.usuario?.nome // Nome do vendedor do pedido importado
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
    // ✅ FLUXO SEQUENCIAL: Verificar se precisa selecionar vendedor primeiro
    if (pdvConfig?.vendedor && !vendedorSelecionado && !aguardandoSelecaoVendedor) {
      setProdutoAguardandoVendedor(produto);
      setAguardandoSelecaoVendedor(true);
      setShowVendedorModal(true);
      // ✅ NOVO: Se também tem multiplicação ativa, salvar para usar no fluxo sequencial
      if (pdvConfig?.vendas_itens_multiplicacao && !quantidadePersonalizada && !searchTerm.includes('*')) {
        setQuantidadeAguardandoVendedor(0); // 0 indica que deve abrir modal de quantidade depois
      }
      return;
    }

    // ✅ VERIFICAR: Modal de quantidade (apenas se não veio do fluxo do vendedor)
    if (pdvConfig?.vendas_itens_multiplicacao && !quantidadePersonalizada && !searchTerm.includes('*')) {
      setProdutoParaQuantidade(produto);
      setQuantidadeModal(1);
      setShowQuantidadeModal(true);
      return;
    }

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

    // ✅ CORRIGIDO: Calcular o preço final considerando promoções E desconto por quantidade
    const precoFinal = calcularPrecoModalQuantidade(produto, quantidadeParaAdicionar);

    // Criar o item do carrinho
    const novoItem: ItemCarrinho = {
      id: `${produto.id}-${Date.now()}-${Math.random()}`, // ID único
      produto,
      quantidade: quantidadeParaAdicionar,
      subtotal: precoFinal * quantidadeParaAdicionar,
      temOpcoesAdicionais,
      vendedor_id: vendedorSelecionado?.id,
      vendedor_nome: vendedorSelecionado?.nome
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

  // Funções para seleção de vendedor
  const selecionarVendedor = (vendedor: any) => {
    setVendedorSelecionado(vendedor);
    setShowVendedorModal(false);

    // Se há um produto aguardando, verificar o fluxo
    if (produtoAguardandoVendedor) {
      setAguardandoSelecaoVendedor(false);

      // ✅ FLUXO SEQUENCIAL: Se quantidade = 0, significa que deve abrir modal de quantidade
      if (quantidadeAguardandoVendedor === 0 && pdvConfig?.vendas_itens_multiplicacao) {
        // Abrir modal de quantidade após selecionar vendedor
        setProdutoParaQuantidade(produtoAguardandoVendedor);
        setQuantidadeModal(1);
        setShowQuantidadeModal(true);
        // Limpar produto aguardando vendedor mas manter vendedor selecionado
        setProdutoAguardandoVendedor(null);
        setQuantidadeAguardandoVendedor(1);
      } else {
        // Fluxo normal: adicionar produto com vendedor e quantidade definida
        adicionarProdutoComVendedor(produtoAguardandoVendedor, vendedor, quantidadeAguardandoVendedor > 0 ? quantidadeAguardandoVendedor : 1);
        setProdutoAguardandoVendedor(null);
        setQuantidadeAguardandoVendedor(1);

        // ✅ NOVO: Fechar também o modal de produtos se estiver aberto
        if (showAreaProdutos) {
          setShowAreaProdutos(false);
        }
      }
    }

    // Se há uma venda sem produto aguardando, verificar o fluxo
    if (vendaSemProdutoAguardando) {
      setAguardandoSelecaoVendedor(false);

      // ✅ FLUXO SEQUENCIAL: Se quantidade = 0, significa que deve abrir modal de quantidade
      if (quantidadeAguardandoVendedor === 0 && pdvConfig?.vendas_itens_multiplicacao) {
        // Abrir modal de quantidade após selecionar vendedor
        setQuantidadeModal(1);
        setShowQuantidadeModal(true);
        // Não limpar vendaSemProdutoAguardando ainda, será usado no modal de quantidade
      } else {
        // Adicionar venda sem produto diretamente com vendedor selecionado
        adicionarVendaSemProdutoFinal(vendaSemProdutoAguardando.nome, vendaSemProdutoAguardando.preco, quantidadeAguardandoVendedor > 0 ? quantidadeAguardandoVendedor : 1);
        setVendaSemProdutoAguardando(null);
        setQuantidadeAguardandoVendedor(1);
      }
    }
  };

  const cancelarSelecaoVendedor = () => {
    setShowVendedorModal(false);
    setAguardandoSelecaoVendedor(false);
    setProdutoAguardandoVendedor(null);
    setQuantidadeAguardandoVendedor(1); // ✅ NOVO: Limpar também a quantidade salva
    setVendaSemProdutoAguardando(null); // Limpar venda sem produto aguardando
  };

  // ✅ NOVO: Funções para modal de quantidade
  const confirmarQuantidade = () => {
    // Verificar se é venda sem produto ou produto normal
    if (vendaSemProdutoAguardando) {
      if (quantidadeModal <= 0) return;

      // Adicionar venda sem produto com quantidade definida
      adicionarVendaSemProdutoFinal(vendaSemProdutoAguardando.nome, vendaSemProdutoAguardando.preco, quantidadeModal);
      setVendaSemProdutoAguardando(null);
    } else {
      if (!produtoParaQuantidade || quantidadeModal <= 0) return;

      // ✅ FLUXO SEQUENCIAL: Se chegou aqui, o vendedor já foi selecionado (se necessário)
      // Adicionar produto com vendedor (se houver) e quantidade definida
      if (vendedorSelecionado) {
        adicionarProdutoComVendedor(produtoParaQuantidade, vendedorSelecionado, quantidadeModal);
      } else {
        adicionarAoCarrinho(produtoParaQuantidade, quantidadeModal);
      }
    }

    // Fechar modal de quantidade e limpar estados
    setShowQuantidadeModal(false);
    setProdutoParaQuantidade(null);
    setQuantidadeModal(1);

    // ✅ NOVO: Fechar também o modal de produtos se estiver aberto
    if (showAreaProdutos) {
      setShowAreaProdutos(false);
    }
  };

  const cancelarQuantidade = () => {
    setShowQuantidadeModal(false);
    setProdutoParaQuantidade(null);
    setQuantidadeModal(1);
    setVendaSemProdutoAguardando(null); // Limpar venda sem produto aguardando
  };

  // Função para adicionar venda sem produto com verificações de vendedor e quantidade
  const adicionarVendaSemProdutoComVerificacoes = (nome: string, preco: number) => {
    // ✅ VERIFICAR: Se é o primeiro item no carrinho e precisa selecionar vendedor
    if (carrinho.length === 0 && pdvConfig?.vendedor && !vendedorSelecionado && !aguardandoSelecaoVendedor) {
      setVendaSemProdutoAguardando({ nome, preco });
      setAguardandoSelecaoVendedor(true);
      setShowVendedorModal(true);
      // Se também tem multiplicação ativa, salvar para usar no fluxo sequencial
      if (pdvConfig?.vendas_itens_multiplicacao) {
        setQuantidadeAguardandoVendedor(0); // 0 indica que deve abrir modal de quantidade depois
      }
      return;
    }

    // ✅ VERIFICAR: Se é o primeiro item e precisa selecionar quantidade
    if (carrinho.length === 0 && pdvConfig?.vendas_itens_multiplicacao) {
      setVendaSemProdutoAguardando({ nome, preco });
      setQuantidadeModal(1);
      setShowQuantidadeModal(true);
      return;
    }

    // Se chegou aqui, pode adicionar diretamente
    adicionarVendaSemProdutoFinal(nome, preco, 1);
  };

  // Função final para adicionar venda sem produto ao carrinho
  const adicionarVendaSemProdutoFinal = (nome: string, preco: number, quantidade: number = 1) => {
    // Criar um produto fictício para manter compatibilidade com o sistema
    const produtoFicticio = {
      id: `venda-sem-produto-${Date.now()}`,
      nome: nome.trim(),
      preco: preco,
      codigo: '999999', // ✅ CÓDIGO FIXO RESERVADO para venda sem produto (6 chars < 60 limite SEFAZ)
      grupo_id: '',
      promocao: false,
      unidade_medida: 'UN', // ✅ UNIDADE FIXA para NFC-e (obrigatória)
      // ✅ DADOS FISCAIS das configurações PDV para NFC-e (igual venda normal)
      ncm: pdvConfig?.venda_sem_produto_ncm || '22021000', // NCM padrão para bebidas
      cfop: pdvConfig?.venda_sem_produto_cfop === '5405' ? '5102' : (pdvConfig?.venda_sem_produto_cfop || '5102'), // ✅ CORREÇÃO: 5405 não é válido para Simples Nacional
      codigo_barras: null // Venda sem produto não tem código de barras
    };

    const novoItem: ItemCarrinho = {
      id: `${produtoFicticio.id}-${Date.now()}-${Math.random()}`,
      produto: produtoFicticio,
      quantidade: quantidade,
      subtotal: preco * quantidade,
      temOpcoesAdicionais: false,
      vendaSemProduto: true,
      nome: nome.trim(), // ✅ Nome personalizado para venda sem produto
      vendedor_id: vendedorSelecionado?.id,
      vendedor_nome: vendedorSelecionado?.nome
    };

    setCarrinho(prev => [...prev, novoItem]);
    toast.success('Item adicionado ao carrinho!');
  };

  const aumentarQuantidade = () => {
    setQuantidadeModal(prev => prev + 1);
  };

  const diminuirQuantidade = () => {
    setQuantidadeModal(prev => Math.max(1, prev - 1));
  };

  // ✅ NOVO: Função para calcular preço considerando desconto por quantidade no modal
  const calcularPrecoModalQuantidade = (produto: Produto, quantidade: number) => {
    let precoUnitario = calcularPrecoFinal(produto); // Já considera promoção

    // Verificar se a quantidade atinge o mínimo para desconto por quantidade
    if (produto.desconto_quantidade &&
        produto.quantidade_minima &&
        quantidade >= produto.quantidade_minima) {

      // Calcular preço com desconto por quantidade
      let precoComDescontoQuantidade = produto.preco;

      if (produto.tipo_desconto_quantidade === 'percentual' && produto.percentual_desconto_quantidade) {
        precoComDescontoQuantidade = produto.preco * (1 - produto.percentual_desconto_quantidade / 100);
      } else if (produto.tipo_desconto_quantidade === 'valor' && produto.valor_desconto_quantidade) {
        precoComDescontoQuantidade = produto.preco - produto.valor_desconto_quantidade;
      }

      // Usar o menor preço entre promoção e desconto por quantidade
      precoUnitario = Math.min(precoUnitario, precoComDescontoQuantidade);
    }

    return Math.max(precoUnitario, 0);
  };

  // Função para adicionar produto com vendedor específico
  const adicionarProdutoComVendedor = async (produto: Produto, vendedor: any, quantidadePersonalizada?: number) => {
    // ✅ FLUXO SEQUENCIAL: Esta função só é chamada quando vendedor já foi selecionado
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

    // ✅ CORRIGIDO: Calcular o preço final considerando promoções E desconto por quantidade
    const precoFinal = calcularPrecoModalQuantidade(produto, quantidadeParaAdicionar);

    // Criar o item do carrinho com o vendedor específico
    const novoItem: ItemCarrinho = {
      id: `${produto.id}-${Date.now()}-${Math.random()}`, // ID único
      produto,
      quantidade: quantidadeParaAdicionar,
      subtotal: precoFinal * quantidadeParaAdicionar,
      temOpcoesAdicionais,
      vendedor_id: vendedor?.id,
      vendedor_nome: vendedor?.nome
    };

    // Se o produto tem opções adicionais, abrir modal
    if (temOpcoesAdicionais) {
      setItemParaAdicionais(novoItem);
      setShowAdicionaisModal(true);
    } else {
      // Adicionar diretamente ao carrinho
      setCarrinho(prev => [...prev, novoItem]);

      // Tocar som de sucesso se habilitado
      if (pdvConfig?.som_adicionar_produto) {
        playSuccessSound();
      }

      // Limpar busca se foi usado
      if (searchTerm && !searchTerm.includes('*')) {
        setSearchTerm('');
      }

      // Salvar estado do PDV
      savePDVState();
    }
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

    // Atualizar carrinho removendo o item
    const novoCarrinho = carrinho.filter(item => item.id !== itemId);
    setCarrinho(novoCarrinho);

    // Se o carrinho ficou vazio, limpar área lateral
    if (novoCarrinho.length === 0) {
      // Limpar área lateral
      setClienteSelecionado(null);
      setPedidosImportados([]);
      setDescontoPrazoSelecionado(null);
      setDescontosCliente({ prazo: [], valor: [] });

      // Limpar dados de finalização
      setCpfCnpjNota('');
      setClienteEncontrado(null);
      setTipoDocumento('cpf');
      setErroValidacao('');
      limparPagamentosParciaisSilencioso();
    }

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
          // ✅ CORRIGIDO: Usar o preço com desconto aplicado pelo usuário, ou recalcular considerando promoções E desconto por quantidade
          const precoUnitario = item.desconto ? item.desconto.precoComDesconto : calcularPrecoModalQuantidade(item.produto, novaQuantidade);
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
        ? item.vendaSemProduto
          ? { ...item, nome: nomeEditando.trim() }
          : { ...item, produto: { ...item.produto, nome: nomeEditando.trim() } }
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

  // Função para calcular subtotal SEM descontos (preço original)
  const calcularSubtotalSemDescontos = () => {
    return carrinho.reduce((total, item) => {
      const precoOriginal = item.produto.preco * item.quantidade;
      return total + precoOriginal;
    }, 0);
  };

  // Função para calcular total de descontos nos itens
  const calcularDescontoItens = () => {
    const total = carrinho.reduce((totalDesconto, item) => {
      // Calcular o preço original total (sem nenhum desconto)
      const precoOriginalUnitario = item.produto.preco;
      const totalOriginal = precoOriginalUnitario * item.quantidade;

      // O subtotal já considera todos os descontos aplicados
      const totalComDesconto = item.subtotal;

      // A diferença é o desconto total aplicado no item
      const descontoItem = totalOriginal - totalComDesconto;

      return totalDesconto + Math.max(0, descontoItem); // Garantir que não seja negativo
    }, 0);

    // Arredondar para 2 casas decimais para evitar problemas de precisão
    return Math.round(total * 100) / 100;
  };

  // Função para calcular total com desconto aplicado (para uso em pagamentos)
  const calcularTotalComDesconto = () => {
    let subtotal = calcularTotal();

    // Aplicar desconto global (desconto no total) primeiro
    if (descontoGlobal > 0) {
      subtotal = subtotal - descontoGlobal;
    }

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

    // Limpar carrinho
    setCarrinho([]);

    // Limpar área lateral
    setClienteSelecionado(null);
    setPedidosImportados([]);
    setDescontoPrazoSelecionado(null);
    setDescontosCliente({ prazo: [], valor: [] });

    // Limpar dados de finalização
    setCpfCnpjNota('');
    setClienteEncontrado(null);
    setTipoDocumento('cpf');
    setErroValidacao('');
    limparPagamentosParciaisSilencioso();

    // Fechar modal
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
  const verificarVendaNoBanco = async (vendaId: string, numeroVenda: string, totalItensEsperados: number, tipoControle: string): Promise<boolean> => {
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

      if (tipoControle === 'pdv') {
        setEtapaProcessamento('Verificando baixa de estoque...');

        // Agrupar itens do carrinho por produto para calcular quantidade total esperada
        // ✅ EXCEÇÃO: Filtrar produtos de venda sem produto (código 999999)
        const produtosAgrupados = carrinho.reduce((acc, item) => {
          // Pular produtos de venda sem produto
          if (item.vendaSemProduto || item.produto.codigo === '999999') {
            console.log(`⏭️ FRONTEND: Pulando verificação de estoque - Venda sem produto: ${item.produto.nome}`);
            return acc;
          }

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
          console.log(`🔍 FRONTEND: Verificando movimentações de estoque para produto ${produtoId}, venda ${numeroVenda}`);

          // Filtrar movimentações dos últimos 5 minutos para evitar dados históricos corrompidos
          const cincoMinutosAtras = new Date(Date.now() - 5 * 60 * 1000).toISOString();
          console.log(`⏰ FRONTEND: Filtrando movimentações após: ${cincoMinutosAtras}`);

          const { data: movimentacaoEstoque, error: estoqueError } = await supabase
            .from('produto_estoque')
            .select('id, tipo_movimento, quantidade, observacao, data_hora_movimento')
            .eq('produto_id', produtoId)
            .eq('tipo_movimento', 'saida')
            .ilike('observacao', `%Venda PDV #${numeroVenda}%`)
            .gte('data_hora_movimento', cincoMinutosAtras)
            .order('data_hora_movimento', { ascending: false });

          console.log(`📊 FRONTEND: Query executada - Produto: ${produtoId}, Venda: ${numeroVenda}`);
          console.log(`📊 FRONTEND: Movimentações encontradas (${movimentacaoEstoque?.length || 0}):`, movimentacaoEstoque);

          // Log detalhado de cada movimentação
          if (movimentacaoEstoque && movimentacaoEstoque.length > 0) {
            movimentacaoEstoque.forEach((mov, index) => {
              console.log(`📋 FRONTEND: Movimentação ${index + 1}:`, {
                id: mov.id,
                quantidade: mov.quantidade,
                observacao: mov.observacao,
                data_hora: mov.data_hora_movimento
              });
            });
          }

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
      if (itensComAdicionais.length > 0 && itensData && itensData.length > 0) {
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

  // ✅ NOVO: Funções para o modal de itens
  const handleCpfCnpjModalItensChange = (value: string) => {
    const formatted = formatDocumento(value);
    setCpfCnpjModalItens(formatted);

    const numbers = value.replace(/\D/g, '');
    const expectedLength = tipoDocumentoModalItens === 'cpf' ? 11 : 14;

    if (numbers.length === expectedLength) {
      const isValid = tipoDocumentoModalItens === 'cpf' ? validarCpf(formatted) : validarCnpj(formatted);
      if (!isValid) {
        setErroValidacaoModalItens(`${tipoDocumentoModalItens.toUpperCase()} inválido`);
      } else {
        setErroValidacaoModalItens('');
      }
    } else {
      setErroValidacaoModalItens('');
    }
  };

  const validarDocumentoModalItensOnBlur = () => {
    if (!cpfCnpjModalItens.trim()) {
      setErroValidacaoModalItens('');
      return;
    }

    const numbers = cpfCnpjModalItens.replace(/\D/g, '');
    const expectedLength = tipoDocumentoModalItens === 'cpf' ? 11 : 14;

    if (numbers.length !== expectedLength) {
      setErroValidacaoModalItens(`${tipoDocumentoModalItens.toUpperCase()} deve ter ${expectedLength} dígitos`);
      return;
    }

    const isValid = tipoDocumentoModalItens === 'cpf' ? validarCpf(cpfCnpjModalItens) : validarCnpj(cpfCnpjModalItens);

    if (!isValid) {
      setErroValidacaoModalItens(`${tipoDocumentoModalItens.toUpperCase()} inválido`);
    } else {
      setErroValidacaoModalItens('');
    }
  };

  const isDocumentoModalItensInvalido = (): boolean => {
    if (!cpfCnpjModalItens.trim()) return false;

    const numbers = cpfCnpjModalItens.replace(/\D/g, '');
    const expectedLength = tipoDocumentoModalItens === 'cpf' ? 11 : 14;

    if (numbers.length !== expectedLength) return true;

    const isValid = tipoDocumentoModalItens === 'cpf' ? validarCpf(cpfCnpjModalItens) : validarCnpj(cpfCnpjModalItens);
    return !isValid;
  };

  // ✅ NOVO: Função para emitir NFC-e a partir do modal de itens
  const emitirNfceModalItens = async () => {
    if (!vendaParaExibirItens) return;

    // Validar documento se informado
    if (cpfCnpjModalItens.trim() && isDocumentoModalItensInvalido()) {
      toast.error('CPF/CNPJ inválido');
      return;
    }

    try {
      setEmitindoNfceModalItens(true);

      // Obter dados do usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('Usuário não autenticado');
        return;
      }

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id, serie_nfce')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) {
        toast.error('Empresa não encontrada');
        return;
      }

      // Buscar dados da empresa
      const { data: empresaData } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', usuarioData.empresa_id)
        .single();

      if (!empresaData) {
        toast.error('Dados da empresa não encontrados');
        return;
      }

      // Buscar configuração NFe
      const { data: nfeConfigData } = await supabase
        .from('nfe_config')
        .select('ambiente')
        .eq('empresa_id', usuarioData.empresa_id)
        .single();

      if (!nfeConfigData) {
        toast.error('Configuração NFe não encontrada');
        return;
      }

      // ✅ Verificar se os itens já foram carregados com dados fiscais
      if (!itensVenda || itensVenda.length === 0) {
        throw new Error('Nenhum item encontrado na venda. Reabra o modal.');
      }

      console.log('✅ Usando itens já carregados com dados fiscais:', itensVenda);

      // ✅ NOVO: Usar número editável do modal ou gerar próximo número
      let proximoNumero: number;
      if (numeroNfceModalItens && parseInt(numeroNfceModalItens) > 0) {
        proximoNumero = parseInt(numeroNfceModalItens);
        console.log('🔢 MODAL: Usando número editado pelo usuário:', proximoNumero);
      } else {
        // Buscar dados do usuário para gerar próximo número
        const { data: userDataLocal } = await supabase.auth.getUser();
        if (!userDataLocal.user) throw new Error('Usuário não autenticado');

        const { data: usuarioDataLocal } = await supabase
          .from('usuarios')
          .select('empresa_id')
          .eq('id', userDataLocal.user.id)
          .single();

        if (!usuarioDataLocal?.empresa_id) throw new Error('Empresa não encontrada');

        proximoNumero = await gerarProximoNumeroNFCe(usuarioDataLocal.empresa_id);
        console.log('🔢 MODAL: Usando próximo número automático:', proximoNumero);
      }

      // Buscar série do usuário
      const { data: usuarioDataSerie } = await supabase
        .from('usuarios')
        .select('serie_nfce')
        .eq('id', userData.user.id)
        .single();

      const serieUsuario = usuarioDataSerie?.serie_nfce || 1;

      // Preparar dados da NFC-e
      const getCodigoUF = (estado: string): number => {
        const codigosUF: { [key: string]: number } = {
          'AC': 12, 'AL': 17, 'AP': 16, 'AM': 13, 'BA': 29, 'CE': 23, 'DF': 53,
          'ES': 32, 'GO': 52, 'MA': 21, 'MT': 51, 'MS': 50, 'MG': 31, 'PA': 15,
          'PB': 25, 'PR': 41, 'PE': 26, 'PI': 22, 'RJ': 33, 'RN': 24, 'RS': 43,
          'RO': 11, 'RR': 14, 'SC': 42, 'SP': 35, 'SE': 28, 'TO': 27
        };
        return codigosUF[estado] || 35;
      };

      const nfceData = {
        empresa: {
          razao_social: empresaData.razao_social,
          cnpj: empresaData.documento,
          nome_fantasia: empresaData.nome_fantasia,
          inscricao_estadual: empresaData.inscricao_estadual,
          regime_tributario: empresaData.regime_tributario || 1,
          uf: empresaData.estado,
          codigo_municipio: parseInt(empresaData.codigo_municipio) || 3524402,
          codigo_uf: getCodigoUF(empresaData.estado),
          endereco: {
            logradouro: empresaData.endereco,
            numero: empresaData.numero,
            bairro: empresaData.bairro,
            cidade: empresaData.cidade,
            cep: empresaData.cep
          },
          csc_homologacao: empresaData.csc_homologacao,
          csc_id_homologacao: empresaData.csc_id_homologacao,
          csc_producao: empresaData.csc_producao,
          csc_id_producao: empresaData.csc_id_producao
        },
        ambiente: nfeConfigData.ambiente,
        identificacao: {
          numero: proximoNumero,
          serie: serieUsuario,
          codigo_numerico: Math.floor(10000000 + Math.random() * 90000000).toString(),
          natureza_operacao: 'Venda de mercadoria'
        },
        destinatario: cpfCnpjModalItens.trim() ? {
          documento: cpfCnpjModalItens.replace(/\D/g, ''),
          nome: 'CONSUMIDOR'
        } : {},
        produtos: itensVenda.map(item => ({
          codigo: item.produto?.codigo || item.codigo_produto,
          descricao: item.nome_produto,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          unidade: item.produto?.unidade_medida?.sigla, // ❌ SEM FALLBACK: Deve dar erro se não tiver unidade configurada
          ncm: item.ncm_editavel || item.produto?.ncm || '00000000',
          cfop: item.cfop_editavel || item.cfop || '5102',
          cst_icms: empresaData.regime_tributario === 1 ? undefined : (item.cst_editavel || item.cst_icms || '00'),
          csosn_icms: empresaData.regime_tributario === 1 ? (item.csosn_editavel || item.csosn_icms || '102') : undefined,
          codigo_barras: item.produto?.codigo_barras
        }))
      };

      // Emitir NFC-e
      const response = await fetch('/backend/public/emitir-nfce.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          empresa_id: usuarioData.empresa_id,
          nfce_data: nfceData
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro na emissão da NFC-e');
      }

      // Atualizar venda no banco
      const updateData: any = {
        modelo_documento: 65,
        numero_documento: proximoNumero,
        serie_documento: serieDocumentoReservado,
        chave_nfe: result.data.chave,
        protocolo_nfe: result.data.protocolo,
        status_fiscal: 'autorizada',
        erro_fiscal: null,
        data_emissao_nfe: result.data.data_autorizacao,
        tentativa_nfce: true
      };

      // Incluir documento do cliente se informado
      if (cpfCnpjModalItens.trim()) {
        updateData.documento_cliente = cpfCnpjModalItens.replace(/\D/g, '');
        updateData.tipo_documento_cliente = tipoDocumentoModalItens;
      }

      const { error: updateError } = await supabase
        .from('pdv')
        .update(updateData)
        .eq('id', vendaParaExibirItens.id);

      if (updateError) {
        console.error('Erro ao atualizar venda:', updateError);
      }

      toast.success('NFC-e emitida com sucesso!');

      // Fechar modal, limpar campos e recarregar vendas
      fecharModalItens();
      loadVendas();

    } catch (error: any) {
      console.error('Erro ao emitir NFC-e:', error);
      toast.error(`Erro ao emitir NFC-e: ${error.message}`);
    } finally {
      setEmitindoNfceModalItens(false);
    }
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

  // ✅ NOVO: Função para obter o texto do tipo de impressão configurado
  const obterTextoTipoImpressao = (): string => {
    const usarImpressao50mm = pdvConfig?.tipo_impressao_50mm === true && pdvConfig?.tipo_impressao_80mm === false;
    return usarImpressao50mm ? '50mm' : '80mm';
  };

  // Função para gerar número sequencial da venda
  const gerarNumeroVenda = async (empresaId: string): Promise<string> => {
    try {
      console.log('🔢 FRONTEND: Gerando número de venda para empresa:', empresaId);

      // Buscar o maior número de venda da empresa (não o mais recente por data)
      const { data, error } = await supabase
        .from('pdv')
        .select('numero_venda')
        .eq('empresa_id', empresaId)
        .not('numero_venda', 'is', null)
        .order('numero_venda', { ascending: false })
        .limit(1);

      if (error && error.code !== 'PGRST116') {
        console.error('❌ FRONTEND: Erro ao buscar último número de venda:', error);
        // Em caso de erro, usar timestamp como fallback
        const fallbackNumero = `PDV-${Date.now()}`;
        console.log('🔄 FRONTEND: Usando fallback:', fallbackNumero);
        return fallbackNumero;
      }

      console.log('📊 FRONTEND: Dados encontrados:', data);
      console.log('📊 FRONTEND: Quantidade de registros:', data?.length || 0);

      let proximoNumero = 1;
      if (data && data.length > 0 && data[0].numero_venda) {
        // Extrair número da string (formato: PDV-000001)
        const ultimoNumero = data[0].numero_venda.replace('PDV-', '');
        proximoNumero = parseInt(ultimoNumero) + 1;
        console.log(`📊 FRONTEND: Último número encontrado: ${data[0].numero_venda}`);
        console.log(`➕ FRONTEND: Incrementando para: ${proximoNumero}`);
      } else {
        console.log('📊 FRONTEND: Nenhum registro encontrado, iniciando do número 1');
      }

      // Formatar com zeros à esquerda (6 dígitos)
      const novoNumero = `PDV-${proximoNumero.toString().padStart(6, '0')}`;
      console.log(`🎯 FRONTEND: Novo número de venda gerado: ${novoNumero}`);
      return novoNumero;
    } catch (error) {
      console.error('❌ FRONTEND: Erro ao gerar número de venda:', error);
      // Fallback para timestamp
      const fallbackNumero = `PDV-${Date.now()}`;
      console.log('🔄 FRONTEND: Usando fallback por erro:', fallbackNumero);
      return fallbackNumero;
    }
  };

  // ✅ NOVO: Função para limpar campos do modal de itens
  const limparCamposModalItens = () => {
    setCpfCnpjModalItens('');
    setTipoDocumentoModalItens('cpf');
    setErroValidacaoModalItens('');
    setNumeroNfceModalItens('');
    setEmitindoNfceModalItens(false);
  };

  // ✅ NOVO: Função para fechar modal de itens
  const fecharModalItens = () => {
    setShowItensVendaModal(false);
    limparCamposModalItens();
  };

  // ✅ NOVO: Função para carregar próximo número da NFC-e no modal de itens
  const carregarProximoNumeroNfceModal = async () => {
    console.log('🔢 MODAL: Iniciando carregamento do próximo número...');

    try {
      setLoadingProximoNumero(true);

      // Buscar dados do usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        console.log('❌ MODAL: Usuário não autenticado');
        return;
      }

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) {
        console.log('❌ MODAL: Empresa ID não encontrado');
        return;
      }

      console.log('🔢 MODAL: Carregando próximo número NFC-e para empresa:', usuarioData.empresa_id);

      const proximoNumero = await gerarProximoNumeroNFCe(usuarioData.empresa_id);
      setNumeroNfceModalItens(proximoNumero.toString());
      console.log('✅ MODAL: Próximo número carregado e definido:', proximoNumero);
    } catch (error) {
      console.error('❌ MODAL: Erro ao carregar próximo número:', error);
      setNumeroNfceModalItens('1'); // Fallback
      console.log('🔄 MODAL: Usando fallback número 1');
    } finally {
      setLoadingProximoNumero(false);
      console.log('🔢 MODAL: Loading finalizado');
    }
  };

  // Função para gerar próximo número de NFC-e (modelo 65)
  const gerarProximoNumeroNFCe = async (empresaId: string): Promise<number> => {
    try {
      console.log('🔢 FRONTEND: Gerando próximo número NFC-e para empresa:', empresaId);

      // ✅ CORREÇÃO: Buscar o último número de NFC-e da empresa (modelo 65) incluindo pendentes
      console.log('🔍 FRONTEND: Consultando último número NFC-e no banco (incluindo pendentes)...');
      const { data, error } = await supabase
        .from('pdv')
        .select('numero_documento, status_fiscal')
        .eq('empresa_id', empresaId)
        .eq('modelo_documento', 65) // NFC-e modelo 65
        .not('numero_documento', 'is', null)
        .order('numero_documento', { ascending: false })
        .limit(1);

      if (error) {
        console.error('❌ FRONTEND: Erro ao buscar último número NFC-e:', error);
        console.error('❌ FRONTEND: Detalhes do erro:', error.message, error.details);
        console.log('🔄 FRONTEND: Usando fallback - número 1');
        return 1; // Começar do 1 em caso de erro
      }

      console.log('📋 FRONTEND: Dados encontrados na tabela PDV para NFC-e:', data);
      console.log('📊 FRONTEND: Quantidade de registros encontrados:', data?.length || 0);

      // Se não encontrou nenhum registro, começar do 1
      let proximoNumero = 1;
      if (data && data.length > 0 && data[0].numero_documento) {
        proximoNumero = data[0].numero_documento + 1;
        console.log(`📊 FRONTEND: Último número NFC-e encontrado: ${data[0].numero_documento} (status: ${data[0].status_fiscal})`);
        console.log(`➕ FRONTEND: Incrementando para: ${proximoNumero}`);
      } else {
        console.log('📊 FRONTEND: Nenhum registro NFC-e encontrado, iniciando do número 1');
      }

      console.log(`🎯 FRONTEND: Próximo número NFC-e definido: ${proximoNumero}`);
      return proximoNumero;

    } catch (error) {
      console.error('❌ FRONTEND: Erro geral ao buscar próximo número NFC-e:', error);
      console.error('❌ FRONTEND: Stack trace:', (error as Error).stack);
      console.log('🔄 FRONTEND: Usando fallback - número 1');
      return 1; // Fallback para 1
    }
  };

  // Função principal para finalizar e salvar a venda
  const finalizarVendaCompleta = async (tipoFinalizacao: string = 'finalizar_sem_impressao') => {
    const executionId = Date.now(); // ID único para esta execução
    console.log(`🚀 FRONTEND: INICIANDO finalizarVendaCompleta - ID: ${executionId}, Tipo: ${tipoFinalizacao}`);
    console.log(`🚀 FRONTEND: showProcessandoVenda atual: ${showProcessandoVenda}`);

    if (carrinho.length === 0) {
      console.log(`❌ FRONTEND: Carrinho vazio - ID: ${executionId}`);
      toast.error('Carrinho vazio! Adicione itens antes de finalizar.');
      return;
    }

    // Abrir modal de processamento
    console.log(`📋 FRONTEND: Abrindo modal de processamento - ID: ${executionId}`);
    setShowProcessandoVenda(true);
    setEtapaProcessamento('Iniciando processamento da venda...');
    setVendaProcessadaId(null);
    setNumeroVendaProcessada('');
    setStatusProcessamento('processando');
    setErroProcessamento('');
    setNumeroDocumentoReservado(null); // ✅ Limpar número reservado
    setSerieDocumentoReservado(null); // ✅ NOVO: Limpar série reservada
    setTipoFinalizacaoAtual(tipoFinalizacao); // ✅ Salvar tipo de finalização
    setDadosImpressao(null); // ✅ Limpar dados de impressão

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
      } else if (cpfCnpjNota && cpfCnpjNota.trim()) {
        // ✅ NOVO: Salvar documento mesmo quando cliente não foi encontrado
        clienteData = {
          documento_cliente: cpfCnpjNota.replace(/\D/g, ''), // Apenas números
          tipo_documento_cliente: tipoDocumento
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

      // Buscar configuração de controle de estoque
      setEtapaProcessamento('Verificando configuração de estoque...');
      const { data: estoqueConfig } = await supabase
        .from('tipo_controle_estoque_config')
        .select('tipo_controle')
        .eq('empresa_id', usuarioData.empresa_id)
        .single();

      const tipoControle = estoqueConfig?.tipo_controle || 'pedidos';

      // Preparar dados da venda principal
      setEtapaProcessamento('Preparando dados da venda...');

      // ✅ NOVO: Gerar número da NFC-e ANTES de salvar (se for NFC-e)
      let numeroDocumentoNfce = null;
      if (tipoFinalizacao.startsWith('nfce_')) {
        setEtapaProcessamento('Reservando número da NFC-e...');
        numeroDocumentoNfce = await gerarProximoNumeroNFCe(usuarioData.empresa_id);
        console.log('🔢 FRONTEND: Número NFC-e reservado:', numeroDocumentoNfce);
        setNumeroDocumentoReservado(numeroDocumentoNfce); // ✅ Salvar no estado para mostrar no modal

        // ✅ NOVO: Buscar série do usuário para mostrar no modal
        const { data: usuarioSerieData } = await supabase
          .from('usuarios')
          .select('serie_nfce')
          .eq('id', userData.user.id)
          .single();

        const serieUsuario = usuarioSerieData?.serie_nfce || 1;
        setSerieDocumentoReservado(serieUsuario); // ✅ Salvar série no estado para mostrar no modal
        console.log('🔢 FRONTEND: Série NFC-e do usuário:', serieUsuario);
      }

      // ✅ NOVO: Coletar todos os vendedores únicos do carrinho
      setEtapaProcessamento('Coletando vendedores da venda...');
      const vendedoresUnicos = new Map();

      // Adicionar vendedor principal se existir
      if (vendedorSelecionado) {
        vendedoresUnicos.set(vendedorSelecionado.id, {
          id: vendedorSelecionado.id,
          nome: vendedorSelecionado.nome
        });
      }

      // Adicionar vendedores dos itens do carrinho
      carrinho.forEach(item => {
        if (item.vendedor_id && item.vendedor_nome) {
          vendedoresUnicos.set(item.vendedor_id, {
            id: item.vendedor_id,
            nome: item.vendedor_nome
          });
        }
      });

      // Converter para array de IDs
      const vendedoresIds = Array.from(vendedoresUnicos.keys());
      console.log('🧑‍💼 FRONTEND: Vendedores coletados:', Array.from(vendedoresUnicos.values()));

      // ✅ NOVO: Calcular valores de desconto detalhados (com arredondamento para 2 casas decimais)
      const valorDescontoItens = Math.round(calcularDescontoItens() * 100) / 100;
      const valorDescontoTotal = Math.round(descontoGlobal * 100) / 100;

      const vendaData = {
        empresa_id: usuarioData.empresa_id,
        usuario_id: userData.user.id,
        vendedores_ids: vendedoresIds.length > 0 ? vendedoresIds : null, // ✅ NOVO: Salvar lista de vendedores
        numero_venda: numeroVenda,
        data_venda: new Date().toISOString(),
        status_venda: 'finalizada',
        valor_subtotal: valorSubtotal,
        valor_desconto: valorDesconto,
        valor_desconto_itens: valorDescontoItens, // ✅ NOVO: Desconto nos itens
        valor_desconto_total: valorDescontoTotal, // ✅ NOVO: Desconto no total
        valor_total: valorTotal,
        desconto_prazo_id: descontoPrazoSelecionado,
        pedidos_importados: pedidosImportados.length > 0 ? pedidosImportados.map(p => p.id) : null,
        finalizada_em: new Date().toISOString(),
        // ✅ NOVO: Marcar tentativa de NFC-e e salvar número reservado
        tentativa_nfce: tipoFinalizacao.startsWith('nfce_'),
        status_fiscal: tipoFinalizacao.startsWith('nfce_') ? 'processando' : 'nao_fiscal',
        // ✅ NOVO: Salvar dados fiscais já no início
        modelo_documento: tipoFinalizacao.startsWith('nfce_') ? 65 : null,
        numero_documento: numeroDocumentoNfce,
        serie_documento: tipoFinalizacao.startsWith('nfce_') ? serieDocumentoReservado : null,
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

        // ✅ CORREÇÃO: Para venda sem produto, produto_id deve ser null
        const produtoId = item.vendaSemProduto ? null : item.produto.id;

        return {
          empresa_id: usuarioData.empresa_id,
          usuario_id: userData.user.id,
          pdv_id: vendaId,
          produto_id: produtoId,
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
          // ✅ NOVO: Incluir dados do vendedor do item
          vendedor_id: item.vendedor_id || null,
          vendedor_nome: item.vendedor_nome || null,
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

        for (const [index, item] of itensComAdicionais.entries()) {
          // ✅ CORREÇÃO: Buscar item considerando venda sem produto
          const produtoId = item.vendaSemProduto ? null : item.produto.id;

          let query = supabase
            .from('pdv_itens')
            .select('id')
            .eq('pdv_id', vendaId)
            .eq('codigo_produto', item.produto.codigo);

          // Adicionar filtro de produto_id apenas se não for venda sem produto
          if (!item.vendaSemProduto) {
            query = query.eq('produto_id', produtoId);
          } else {
            query = query.is('produto_id', null);
          }

          const { data: itemInserido } = await query
            .limit(1)
            .maybeSingle();

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
        console.log('🔄 FRONTEND: Iniciando baixa de estoque para venda:', numeroVenda);
        console.log('🔄 FRONTEND: Tipo de controle:', tipoControle);
        console.log('🔄 FRONTEND: Itens do carrinho:', carrinho.length);

        for (const item of carrinho) {
          // ✅ EXCEÇÃO: Pular controle de estoque para venda sem produto (código 999999)
          if (item.vendaSemProduto || item.produto.codigo === '999999') {
            console.log(`⏭️ FRONTEND: Pulando controle de estoque - Venda sem produto: ${item.produto.nome}`);
            continue;
          }

          console.log(`🔄 FRONTEND: Baixando estoque - Produto: ${item.produto.nome}, Quantidade: ${item.quantidade}`);

          const { error: estoqueError } = await supabase.rpc('atualizar_estoque_produto', {
            p_produto_id: item.produto.id,
            p_quantidade: -item.quantidade, // Quantidade negativa para baixa
            p_tipo_operacao: 'venda_pdv',
            p_observacao: `Venda PDV #${numeroVenda}`
          });

          if (estoqueError) {
            console.error('❌ FRONTEND: Erro ao atualizar estoque:', estoqueError);
            setEtapaProcessamento('ERRO: Falha na baixa de estoque: ' + estoqueError.message);
            await new Promise(resolve => setTimeout(resolve, 3000));
            setShowProcessandoVenda(false);
            toast.error('ERRO: Falha na baixa de estoque: ' + estoqueError.message);
            return;
          } else {
            console.log(`✅ FRONTEND: Estoque baixado com sucesso - Produto: ${item.produto.nome}`);
          }
        }
        console.log('✅ FRONTEND: Baixa de estoque concluída para todos os itens');

        // Aguardar um pouco para garantir que todas as movimentações foram processadas
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // VERIFICAÇÃO CRÍTICA: Confirmar se tudo foi salvo corretamente
      const vendaVerificada = await verificarVendaNoBanco(vendaId, numeroVenda, carrinho.length, tipoControle);

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

      // VERIFICAR SE É EMISSÃO DE NFC-e
      if (tipoFinalizacao.startsWith('nfce_')) {
        console.log('🚀 FRONTEND: Iniciando processo de emissão NFC-e');
        console.log('📋 FRONTEND: Tipo finalização:', tipoFinalizacao);
        console.log('👤 FRONTEND: Empresa ID:', usuarioData.empresa_id);

        setEtapaProcessamento('Carregando dados da empresa...');

        // ✅ CORREÇÃO: Buscar dados da empresa (igual à NFe que funciona)
        console.log('🏢 FRONTEND: Buscando dados da empresa...');
        const { data: empresaData } = await supabase
          .from('empresas')
          .select('*')
          .eq('id', usuarioData.empresa_id)
          .single();

        if (!empresaData) {
          throw new Error('Dados da empresa não encontrados');
        }
        console.log('✅ FRONTEND: Dados da empresa carregados:', empresaData.razao_social);

        // ✅ NOVO: Buscar série da NFC-e do usuário logado
        console.log('🔢 FRONTEND: Buscando série da NFC-e do usuário...');
        const { data: usuarioSerieData } = await supabase
          .from('usuarios')
          .select('serie_nfce')
          .eq('id', userData.user.id)
          .single();

        const serieUsuario = usuarioSerieData?.serie_nfce || 1; // Fallback para série 1
        console.log('✅ FRONTEND: Série da NFC-e do usuário:', serieUsuario);

        // Buscar configuração NFe
        console.log('⚙️ FRONTEND: Buscando configuração NFe...');
        const { data: nfeConfigData, error: nfeConfigError } = await supabase
          .from('nfe_config')
          .select('ambiente')
          .eq('empresa_id', usuarioData.empresa_id)
          .single();

        if (nfeConfigError) {
          console.error('❌ FRONTEND: Erro na consulta nfe_config:', nfeConfigError);
          throw new Error(`Erro ao buscar configuração NFe: ${nfeConfigError.message}`);
        }

        if (!nfeConfigData) {
          throw new Error('Configuração NFe não encontrada');
        }
        console.log('✅ FRONTEND: Configuração NFe carregada:', nfeConfigData.ambiente);

        setEtapaProcessamento('Preparando dados para NFC-e...');

        try {
          // ✅ NOVO: Validar se número foi salvo corretamente
          setEtapaProcessamento('Validando numeração da NFC-e...');
          console.log('🔍 FRONTEND: Validando número NFC-e salvo para venda:', vendaId);

          const { data: vendaSalva, error: validacaoError } = await supabase
            .from('pdv')
            .select('numero_documento, modelo_documento')
            .eq('id', vendaId)
            .single();

          if (validacaoError || !vendaSalva) {
            throw new Error('Erro ao validar venda salva');
          }

          if (!vendaSalva.numero_documento) {
            throw new Error('Número da NFC-e não foi reservado corretamente');
          }

          console.log('✅ FRONTEND: Número NFC-e validado:', vendaSalva.numero_documento);
          const proximoNumero = vendaSalva.numero_documento;

          const codigoNumerico = Math.floor(10000000 + Math.random() * 90000000).toString();
          console.log('🔢 FRONTEND: Código numérico gerado:', codigoNumerico);

          // ✅ CORREÇÃO: Calcular codigo_uf a partir do estado
          const getCodigoUF = (estado: string): number => {
            const codigosUF: { [key: string]: number } = {
              'AC': 12, 'AL': 17, 'AP': 16, 'AM': 13, 'BA': 29, 'CE': 23, 'DF': 53,
              'ES': 32, 'GO': 52, 'MA': 21, 'MT': 51, 'MS': 50, 'MG': 31, 'PA': 15,
              'PB': 25, 'PR': 41, 'PE': 26, 'PI': 22, 'RJ': 33, 'RN': 24, 'RS': 43,
              'RO': 11, 'RR': 14, 'SC': 42, 'SP': 35, 'SE': 28, 'TO': 27
            };
            return codigosUF[estado] || 35; // Default SP se não encontrar
          };

          const nfceData = {
            // ✅ CORREÇÃO: Adicionar dados da empresa (igual à NFe que funciona)
            empresa: {
              razao_social: empresaData.razao_social,
              cnpj: empresaData.documento, // Campo correto é 'documento'
              nome_fantasia: empresaData.nome_fantasia,
              inscricao_estadual: empresaData.inscricao_estadual,
              regime_tributario: empresaData.regime_tributario || 1,
              uf: empresaData.estado, // Campo correto é 'estado'
              codigo_municipio: parseInt(empresaData.codigo_municipio) || 3524402, // Converter para int
              codigo_uf: getCodigoUF(empresaData.estado), // ✅ CORREÇÃO: Calcular a partir do estado
              endereco: {
                logradouro: empresaData.endereco,
                numero: empresaData.numero,
                bairro: empresaData.bairro,
                cidade: empresaData.cidade,
                cep: empresaData.cep
              },
              // Campos CSC para NFC-e
              csc_homologacao: empresaData.csc_homologacao,
              csc_id_homologacao: empresaData.csc_id_homologacao,
              csc_producao: empresaData.csc_producao,
              csc_id_producao: empresaData.csc_id_producao
            },
            // ✅ CORREÇÃO: Adicionar ambiente (igual à NFe que funciona)
            ambiente: nfeConfigData.ambiente, // 'producao' ou 'homologacao'
            identificacao: {
              numero: proximoNumero,
              serie: serieUsuario, // ✅ NOVO: Série individual do usuário logado
              codigo_numerico: codigoNumerico,
              natureza_operacao: 'Venda de mercadoria'
            },
            // ✅ CORREÇÃO: Usar CPF/CNPJ digitado mesmo se cliente não foi encontrado
            destinatario: (() => {
              // Se tem cliente encontrado, usar dados do cliente
              if (clienteData) {
                return {
                  documento: clienteData.documento_cliente,
                  nome: clienteData.nome_cliente
                };
              }
              // Se tem CPF/CNPJ digitado mas cliente não encontrado, usar o digitado
              if (cpfCnpjNota && cpfCnpjNota.trim()) {
                return {
                  documento: cpfCnpjNota.replace(/\D/g, ''), // Apenas números
                  nome: 'CONSUMIDOR'
                };
              }
              // Sem documento = consumidor não identificado
              return {};
            })(),
            produtos: carrinho.map(item => ({
              codigo: item.produto.codigo, // Código real do produto (SEM FALLBACK)
              descricao: item.produto.nome,
              quantidade: item.quantidade,
              valor_unitario: item.produto.preco,
              // ✅ CORREÇÃO: Para venda sem produto, usar unidade_medida diretamente
              unidade: item.vendaSemProduto ? item.produto.unidade_medida : item.produto.unidade_medida?.sigla,
              ncm: item.produto.ncm, // NCM real do produto (SEM FALLBACK)
              cfop: item.produto.cfop, // CFOP real do produto (SEM FALLBACK)
              codigo_barras: item.produto.codigo_barras, // Código de barras real (SEM FALLBACK)
              adicionais: item.adicionais || [] // ✅ NOVO: Incluir adicionais para NFC-e
            }))
          };

          console.log('📋 FRONTEND: Dados NFC-e preparados:', nfceData);
          console.log('📦 FRONTEND: Total de produtos:', nfceData.produtos.length);
          console.log('👤 FRONTEND: Destinatário:', nfceData.destinatario);

          // ✅ DEBUG: Verificar unidade de medida de cada produto
          nfceData.produtos.forEach((produto, index) => {
            console.log(`🔍 PRODUTO ${index + 1}:`, {
              codigo: produto.codigo,
              descricao: produto.descricao,
              unidade: produto.unidade,
              unidade_medida_original: carrinho[index]?.produto?.unidade_medida
            });
          });

          setEtapaProcessamento('Emitindo NFC-e na SEFAZ...');

          // Chamar endpoint de emissão de NFC-e
          console.log('📡 FRONTEND: Enviando dados para backend...');
          const requestData = {
            empresa_id: usuarioData.empresa_id,
            nfce_data: nfceData
          };
          console.log('📡 FRONTEND: Dados da requisição:', requestData);

          const nfceResponse = await fetch('/backend/public/emitir-nfce.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
          });

          console.log('📡 FRONTEND: Resposta recebida - Status:', nfceResponse.status);

          if (!nfceResponse.ok) {
            console.error('❌ FRONTEND: Erro HTTP:', nfceResponse.status, nfceResponse.statusText);

            // ✅ CORREÇÃO: Capturar e mostrar erro específico do backend
            let errorResponse;
            try {
              errorResponse = await nfceResponse.text();
              console.error('📋 FRONTEND: Resposta de erro do backend:', errorResponse);
              console.error('🔍 FRONTEND: Status HTTP recebido:', nfceResponse.status);
              console.error('🔍 FRONTEND: Headers da resposta:', Object.fromEntries(nfceResponse.headers.entries()));
            } catch (textError) {
              console.error('❌ FRONTEND: Erro ao capturar resposta de erro:', textError);
              throw new Error(`Erro HTTP ${nfceResponse.status}: ${nfceResponse.statusText}`);
            }

            // Tentar fazer parse JSON da resposta de erro
            try {
              const errorJson = JSON.parse(errorResponse);
              console.error('📋 FRONTEND: Erro JSON do backend:', errorJson);
              console.error('🔍 FRONTEND: Campos do erro JSON:', Object.keys(errorJson));

              // ✅ CORREÇÃO: Mostrar mensagem específica do backend
              const mensagemErro = errorJson.error || errorJson.message || 'Erro desconhecido do backend';
              console.error('🔍 FRONTEND: Mensagem de erro extraída:', mensagemErro);
              throw new Error(mensagemErro);
            } catch (jsonError) {
              console.error('❌ FRONTEND: Erro ao fazer parse do JSON de erro:', jsonError);
              console.error('🔍 FRONTEND: Tipo do erro JSON:', typeof jsonError);
              console.error('🔍 FRONTEND: Conteúdo do jsonError:', jsonError);

              // ✅ CORREÇÃO: Se jsonError for a mensagem específica, usar ela
              if (jsonError instanceof Error && jsonError.message.includes('Status')) {
                console.error('🔍 FRONTEND: Re-lançando erro específico da SEFAZ');
                throw jsonError; // Re-lançar o erro específico
              }

              // ✅ CORREÇÃO: Verificar se errorResponse contém mensagem específica
              if (errorResponse.includes('ERRO:') || errorResponse.includes('Status')) {
                console.error('🔍 FRONTEND: Resposta contém erro específico, usando resposta bruta');
                throw new Error(errorResponse);
              }

              // Se não conseguir fazer parse, mostrar resposta bruta (limitada)
              const mensagemErro = errorResponse.length > 200
                ? errorResponse.substring(0, 200) + '...'
                : errorResponse;
              throw new Error(`Erro de comunicação: ${mensagemErro}`);
            }
          }

          const nfceResult = await nfceResponse.json();
          console.log('📋 FRONTEND: Resultado da emissão:', nfceResult);

          if (!nfceResult.success) {
            console.error('❌ FRONTEND: Erro na emissão:', nfceResult.error);
            // ✅ CORREÇÃO: Mostrar mensagem específica do backend sem prefixo genérico
            throw new Error(nfceResult.error || 'Erro desconhecido na emissão da NFC-e');
          }

          console.log('✅ FRONTEND: NFC-e emitida com sucesso!');
          console.log('🔑 FRONTEND: Chave:', nfceResult.data.chave);
          console.log('📋 FRONTEND: Protocolo:', nfceResult.data.protocolo);

          setStatusProcessamento('sucesso');
          setEtapaProcessamento('NFC-e emitida com sucesso!');

          // Atualizar registro da venda com dados da NFC-e
          console.log('💾 FRONTEND: Atualizando registro da venda...');
          const updateData = {
            // ✅ NOVO: Não atualizar numero_documento - já foi salvo no início
            chave_nfe: nfceResult.data.chave,
            protocolo_nfe: nfceResult.data.protocolo,
            status_fiscal: 'autorizada', // ✅ NFC-e autorizada com sucesso
            erro_fiscal: null, // ✅ Limpar qualquer erro anterior
            data_emissao_nfe: nfceResult.data.data_autorizacao
            // ✅ CORREÇÃO: xml_path e pdf_path removidos - arquivos salvos localmente em /root/nexo-pedidos/backend/storage
          };
          console.log('💾 FRONTEND: Dados para atualização:', updateData);

          const { error: updateError } = await supabase
            .from('pdv')
            .update(updateData)
            .eq('id', vendaId);

          if (updateError) {
            console.error('❌ FRONTEND: Erro ao atualizar venda:', updateError);
            // Não interrompe o processo, pois a NFC-e já foi emitida
          } else {
            console.log('✅ FRONTEND: Venda atualizada com dados da NFC-e');
          }

          // Para NFC-e, fechar automaticamente após 2 segundos de sucesso
          console.log('⏱️ FRONTEND: Aguardando 2 segundos antes de fechar...');
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (nfceError) {
          console.error('❌ FRONTEND: Erro na emissão da NFC-e:', nfceError);
          console.error('❌ FRONTEND: Stack trace:', (nfceError as Error).stack);
          setStatusProcessamento('erro');

          // ✅ CORREÇÃO: Usar mensagem específica do erro
          const mensagemErroEspecifica = (nfceError as Error).message;
          console.log('🔍 FRONTEND: Mensagem de erro capturada:', mensagemErroEspecifica);

          // ✅ NOVO: Atualizar venda com status pendente quando há erro na NFC-e
          try {
            const { error: updateError } = await supabase
              .from('pdv')
              .update({
                status_fiscal: 'pendente', // ✅ Marcar como pendente para correção
                erro_fiscal: mensagemErroEspecifica // ✅ Salvar erro para análise
              })
              .eq('id', vendaId);

            if (updateError) {
              console.error('❌ FRONTEND: Erro ao atualizar status da venda:', updateError);
            } else {
              console.log('✅ FRONTEND: Venda marcada como pendente devido ao erro na NFC-e');
            }
          } catch (updateError) {
            console.error('❌ FRONTEND: Erro ao atualizar venda com erro:', updateError);
          }

          // ✅ NOVO: Mostrar modal de erro e parar aqui
          setErroProcessamento(mensagemErroEspecifica);
          setEtapaProcessamento(`Erro na NFC-e: ${mensagemErroEspecifica}`);
          setStatusProcessamento('erro');
          console.log('🛑 FRONTEND: Erro na NFC-e - mostrando modal de erro e limpando carrinho silenciosamente');

          // ✅ NOVO: Limpar carrinho silenciosamente (sem toast de sucesso)
          setCarrinho([]);
          setClienteSelecionado(null);
          setShowFinalizacaoFinal(false);
          limparPagamentosParciaisSilencioso();
          setCpfCnpjNota('');
          setClienteEncontrado(null);
          setTipoDocumento('cpf');
          setPedidosImportados([]);
          setDescontoPrazoSelecionado(null);
          clearPDVState();

          // ✅ NOVO: Atualizar contador de NFC-e pendentes
          loadContadorNfcePendentes();

          // ✅ NOVO: Parar aqui - não mostrar mensagem de sucesso
          return;
        }
      }

      // VERIFICAR SE É FINALIZAÇÃO COM IMPRESSÃO
      if (tipoFinalizacao === 'finalizar_com_impressao') {
        console.log('🖨️ FRONTEND: Preparando dados para impressão');
        setEtapaProcessamento('Carregando dados da empresa...');

        try {
          // Buscar dados da empresa para impressão
          const { data: empresaData } = await supabase
            .from('empresas')
            .select('*')
            .eq('id', usuarioData.empresa_id)
            .single();

          if (!empresaData) {
            throw new Error('Dados da empresa não encontrados para impressão');
          }

          console.log('🏢 FRONTEND: Dados da empresa carregados para impressão:', empresaData.razao_social);
          setEtapaProcessamento('Preparando cupom para impressão...');

          // Preparar dados completos para impressão
          const dadosImpressaoCompletos = {
            venda: {
              id: vendaId,
              numero: numeroVenda,
              data: new Date().toLocaleString('pt-BR'),
              valor_total: valorTotal,
              valor_subtotal: valorSubtotal,
              valor_desconto: valorDesconto,
              valor_desconto_itens: Math.round(calcularDescontoItens() * 100) / 100,
              valor_desconto_total: Math.round(descontoGlobal * 100) / 100
            },
            empresa: {
              razao_social: empresaData.razao_social,
              nome_fantasia: empresaData.nome_fantasia,
              cnpj: empresaData.documento,
              inscricao_estadual: empresaData.inscricao_estadual,
              endereco: `${empresaData.endereco}, ${empresaData.numero}`,
              bairro: empresaData.bairro,
              cidade: empresaData.cidade,
              uf: empresaData.estado,
              cep: empresaData.cep,
              telefone: empresaData.telefone
            },
            cliente: clienteData || {},
            vendedor: vendedorSelecionado || null, // Incluir dados do vendedor principal
            vendedores: (() => {
              // Coletar todos os vendedores únicos do carrinho
              const vendedoresUnicos = new Map();
              carrinho.forEach(item => {
                if (item.vendedor_id && item.vendedor_nome) {
                  vendedoresUnicos.set(item.vendedor_id, item.vendedor_nome);
                }
              });
              return Array.from(vendedoresUnicos.entries()).map(([id, nome]) => ({ id, nome }));
            })(),
            operador: userData || null, // Incluir dados do operador (usuário atual)
            itens: carrinho.map(item => ({
              codigo: item.produto.codigo,
              nome: item.produto.nome,
              quantidade: item.quantidade,
              valor_unitario: item.produto.preco,
              valor_total: item.subtotal,
              vendedor_id: item.vendedor_id || null,
              vendedor_nome: item.vendedor_nome || null,
              adicionais: item.adicionais || [] // ✅ NOVO: Incluir adicionais
            })),
            pagamento: pagamentoData,
            timestamp: new Date().toISOString(),
            tipo: 'cupom_nao_fiscal' // Identificar tipo
          };

          // Salvar dados de impressão no estado
          setDadosImpressao(dadosImpressaoCompletos);

          console.log('🖨️ FRONTEND: Dados preparados, aguardando ação do usuário');
          setEtapaProcessamento('Venda finalizada com sucesso! Deseja imprimir o cupom?');
          setStatusProcessamento('aguardando_impressao');

          // NÃO continuar automaticamente - aguardar ação do usuário no modal
          return;

        } catch (impressaoError) {
          console.error('❌ FRONTEND: Erro na preparação da impressão:', impressaoError);
          // Continuar sem impressão
          setEtapaProcessamento('Erro na preparação da impressão, mas venda foi salva com sucesso');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // ✅ NOVO: VERIFICAR SE É NFC-e COM IMPRESSÃO
      if (tipoFinalizacao === 'nfce_com_impressao') {
        console.log('🖨️ FRONTEND: NFC-e emitida com sucesso, preparando dados para impressão');
        setEtapaProcessamento('Carregando dados da empresa para impressão...');

        try {
          // Buscar dados da empresa para impressão
          const { data: empresaData } = await supabase
            .from('empresas')
            .select('*')
            .eq('id', usuarioData.empresa_id)
            .single();

          if (!empresaData) {
            throw new Error('Dados da empresa não encontrados para impressão');
          }

          console.log('🏢 FRONTEND: Dados da empresa carregados para impressão da NFC-e:', empresaData.razao_social);
          setEtapaProcessamento('Preparando cupom da NFC-e para impressão...');

          // Buscar dados atualizados da venda (com chave da NFC-e)
          const { data: vendaAtualizada } = await supabase
            .from('pdv')
            .select('*')
            .eq('id', vendaId)
            .single();

          // Preparar dados completos para impressão da NFC-e
          const dadosImpressaoNfce = {
            venda: {
              id: vendaId,
              numero: numeroVenda,
              data: new Date().toLocaleString('pt-BR'),
              valor_total: valorTotal,
              valor_subtotal: valorSubtotal,
              valor_desconto: valorDesconto,
              valor_desconto_itens: Math.round(calcularDescontoItens() * 100) / 100,
              valor_desconto_total: Math.round(descontoGlobal * 100) / 100,
              chave_nfe: vendaAtualizada?.chave_nfe || null,
              numero_nfe: vendaAtualizada?.numero_documento || null,
              serie_nfe: vendaAtualizada?.serie_documento || serieDocumentoReservado,
              protocolo_nfe: vendaAtualizada?.protocolo_nfe || null,
              data_emissao: vendaAtualizada?.data_emissao_nfe ? new Date(vendaAtualizada.data_emissao_nfe).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
              hora_emissao: vendaAtualizada?.data_emissao_nfe ? new Date(vendaAtualizada.data_emissao_nfe).toLocaleTimeString('pt-BR') : new Date().toLocaleTimeString('pt-BR'),
              data_autorizacao: vendaAtualizada?.data_emissao_nfe ? new Date(vendaAtualizada.data_emissao_nfe).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
              hora_autorizacao: vendaAtualizada?.data_emissao_nfe ? new Date(vendaAtualizada.data_emissao_nfe).toLocaleTimeString('pt-BR') : new Date().toLocaleTimeString('pt-BR')
            },
            empresa: {
              razao_social: empresaData.razao_social,
              nome_fantasia: empresaData.nome_fantasia,
              cnpj: empresaData.documento,
              inscricao_estadual: empresaData.inscricao_estadual,
              endereco: `${empresaData.endereco}, ${empresaData.numero}`,
              bairro: empresaData.bairro,
              cidade: empresaData.cidade,
              uf: empresaData.estado,
              cep: empresaData.cep,
              telefone: empresaData.telefone
            },
            cliente: {
              ...clienteData,
              documento_cliente: vendaAtualizada?.documento_cliente || clienteData?.documento_cliente || null
            },
            vendedor: vendedorSelecionado || null, // Incluir dados do vendedor principal
            vendedores: (() => {
              // Coletar todos os vendedores únicos do carrinho
              const vendedoresUnicos = new Map();
              carrinho.forEach(item => {
                if (item.vendedor_id && item.vendedor_nome) {
                  vendedoresUnicos.set(item.vendedor_id, item.vendedor_nome);
                }
              });
              return Array.from(vendedoresUnicos.entries()).map(([id, nome]) => ({ id, nome }));
            })(),
            operador: userData || null, // Incluir dados do operador (usuário atual)
            itens: carrinho.map(item => ({
              codigo: item.produto.codigo,
              nome: item.produto.nome,
              quantidade: item.quantidade,
              valor_unitario: item.produto.preco,
              valor_total: item.subtotal,
              vendedor_id: item.vendedor_id || null,
              vendedor_nome: item.vendedor_nome || null,
              adicionais: item.adicionais || [] // ✅ NOVO: Incluir adicionais
            })),
            pagamento: pagamentoData,
            timestamp: new Date().toISOString(),
            tipo: 'nfce' // Identificar que é NFC-e
          };

          // Salvar dados de impressão no estado
          setDadosImpressao(dadosImpressaoNfce);

          console.log('🖨️ FRONTEND: Dados da NFC-e preparados, aguardando ação do usuário');
          setEtapaProcessamento('NFC-e emitida com sucesso! Deseja imprimir o cupom fiscal?');
          setStatusProcessamento('aguardando_impressao');

          // NÃO continuar automaticamente - aguardar ação do usuário no modal
          return;

        } catch (impressaoError) {
          console.error('❌ FRONTEND: Erro na preparação da impressão da NFC-e:', impressaoError);
          // Continuar sem impressão
          setEtapaProcessamento('NFC-e emitida com sucesso, mas erro na preparação da impressão');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // SUCESSO CONFIRMADO!
      const mensagemSucesso = (() => {
        if (tipoFinalizacao === 'nfce_com_impressao') {
          return 'Venda finalizada e NFC-e emitida com sucesso!';
        } else if (tipoFinalizacao.startsWith('nfce_')) {
          return 'Venda finalizada e NFC-e emitida com sucesso!';
        } else if (tipoFinalizacao === 'finalizar_com_impressao') {
          return 'Venda finalizada e impressa com sucesso!';
        } else {
          return 'Venda finalizada com sucesso!';
        }
      })();

      setEtapaProcessamento(mensagemSucesso);
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Fechar modal de processamento
      setShowProcessandoVenda(false);

      // Mostrar sucesso
      const toastMessage = (() => {
        if (tipoFinalizacao === 'nfce_com_impressao') {
          return `Venda #${numeroVenda} finalizada e NFC-e emitida com sucesso!`;
        } else if (tipoFinalizacao.startsWith('nfce_')) {
          return `Venda #${numeroVenda} finalizada e NFC-e emitida com sucesso!`;
        } else if (tipoFinalizacao === 'finalizar_com_impressao') {
          return `Venda #${numeroVenda} finalizada e impressa com sucesso!`;
        } else {
          return `Venda #${numeroVenda} finalizada com sucesso!`;
        }
      })();

      toast.success(toastMessage);

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
      setVendedorSelecionado(null); // ✅ IMPORTANTE: Limpar vendedor selecionado
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

      // Atualizar contador de NFC-e pendentes se foi uma venda com NFC-e
      if (tipoFinalizacao.startsWith('nfce_')) {
        loadContadorNfcePendentes();
      }

    } catch (error) {
      console.error('Erro ao finalizar venda:', error);

      // ✅ CORREÇÃO: Não sobrescrever erros específicos da NFC-e
      const mensagemErro = (error as Error).message;
      console.log('🔍 FRONTEND: Erro capturado no catch externo:', mensagemErro);

      // Se o erro já foi tratado pela NFC-e, não sobrescrever
      if (statusProcessamento === 'erro') {
        console.log('🔍 FRONTEND: Erro já tratado pela NFC-e, não sobrescrevendo');
        return;
      }

      setEtapaProcessamento('ERRO INESPERADO: ' + mensagemErro);
      await new Promise(resolve => setTimeout(resolve, 3000));
      setShowProcessandoVenda(false);
      toast.error('Erro inesperado ao finalizar venda');
    }
  };

  // Função para executar impressão
  const executarImpressao = async () => {
    if (!dadosImpressao) {
      console.error('❌ FRONTEND: Dados de impressão não encontrados');
      return;
    }

    try {
      console.log('🖨️ FRONTEND: Iniciando impressão...');
      console.log('🖨️ FRONTEND: Tipo de impressão:', dadosImpressao.tipo);
      setEtapaProcessamento('Enviando para impressão...');
      setStatusProcessamento('processando');

      // Verificar tipo de impressão e usar função apropriada
      if (dadosImpressao.tipo === 'nfce') {
        console.log('📄 FRONTEND: Imprimindo cupom da NFC-e');
        await gerarEImprimirCupomNfce(dadosImpressao);
      } else {
        console.log('🧾 FRONTEND: Imprimindo cupom não fiscal');
        await gerarEImprimirCupom(dadosImpressao);
      }

      // Aguardar um pouco para a impressão ser processada
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('✅ FRONTEND: Impressão concluída com sucesso');
      finalizarProcessamento();

    } catch (impressaoError) {
      console.error('❌ FRONTEND: Erro na impressão:', impressaoError);
      setEtapaProcessamento('Erro na impressão: ' + impressaoError.message);
      await new Promise(resolve => setTimeout(resolve, 2000));
      finalizarProcessamento();
    }
  };

  // Função para finalizar sem impressão
  const finalizarSemImpressao = () => {
    console.log('✅ FRONTEND: Finalizando sem impressão');
    finalizarProcessamento();
  };

  // ✅ NOVA: Função para reimprimir cupom
  const reimprimirCupom = async (venda: any) => {
    try {
      console.log('🖨️ FRONTEND: Iniciando reimpressão de cupom para venda:', venda.numero_venda);

      // Buscar dados do usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('Usuário não autenticado');
      }

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData) {
        throw new Error('Dados do usuário não encontrados');
      }

      // Verificar se é uma venda com NFC-e autorizada
      if (venda.tentativa_nfce && venda.status_fiscal === 'autorizada' && venda.chave_nfe) {
        console.log('📄 FRONTEND: Venda com NFC-e autorizada - buscando PDF');
        await reimprimirNfcePdf(venda, usuarioData);
      } else {
        console.log('🧾 FRONTEND: Venda sem NFC-e - gerando cupom não fiscal');
        await reimprimirCupomNaoFiscal(venda, usuarioData);
      }

    } catch (error) {
      console.error('❌ FRONTEND: Erro na reimpressão:', error);
      toast.error('Erro ao reimprimir cupom: ' + error.message);
    }
  };

  // Função para reimprimir NFC-e (como cupom fiscal)
  const reimprimirNfcePdf = async (venda: any, usuarioData: any) => {
    try {
      console.log('📄 FRONTEND: Gerando cupom NFC-e para venda:', venda.numero_venda);

      toast.info('Preparando NFC-e para impressão...');

      // Buscar dados da empresa
      const { data: empresaData } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', usuarioData.empresa_id)
        .single();

      if (!empresaData) {
        throw new Error('Dados da empresa não encontrados');
      }

      // Buscar itens da venda
      const { data: itensData, error: itensError } = await supabase
        .from('pdv_itens')
        .select('*')
        .eq('pdv_id', venda.id)
        .eq('empresa_id', usuarioData.empresa_id);

      if (itensError) {
        throw new Error('Erro ao carregar itens da venda');
      }

      if (!itensData || itensData.length === 0) {
        throw new Error('Nenhum item encontrado para esta venda');
      }

      console.log('📦 FRONTEND: Itens carregados:', itensData.length);

      // Buscar dados do vendedor principal se existir
      let vendedorData = null;
      if (venda.usuario_id) {
        const { data: vendedorInfo } = await supabase
          .from('usuarios')
          .select('id, nome')
          .eq('id', venda.usuario_id)
          .single();

        if (vendedorInfo) {
          vendedorData = {
            id: vendedorInfo.id,
            nome: vendedorInfo.nome
          };
        }
      }

      // ✅ NOVO: Buscar todos os vendedores da venda (do campo vendedores_ids)
      let vendedoresData = [];
      if (venda.vendedores_ids && Array.isArray(venda.vendedores_ids) && venda.vendedores_ids.length > 0) {
        const { data: vendedoresInfo } = await supabase
          .from('usuarios')
          .select('id, nome')
          .in('id', venda.vendedores_ids);

        if (vendedoresInfo && vendedoresInfo.length > 0) {
          vendedoresData = vendedoresInfo.map(v => ({
            id: v.id,
            nome: v.nome
          }));
        }
      }

      // ✅ NOVO: Buscar vendedores dos itens individuais
      const vendedoresItens = new Map();
      for (const item of itensData) {
        if (item.vendedor_id) {
          if (!vendedoresItens.has(item.vendedor_id)) {
            const { data: vendedorItem } = await supabase
              .from('usuarios')
              .select('id, nome')
              .eq('id', item.vendedor_id)
              .single();

            if (vendedorItem) {
              vendedoresItens.set(item.vendedor_id, vendedorItem.nome);
            }
          }
        }
      }

      // ✅ NOVO: Usar dados de pagamento da própria venda (salvos na tabela pdv)
      console.log('💳 FRONTEND: Dados de pagamento da venda:', {
        tipo_pagamento: venda.tipo_pagamento,
        forma_pagamento_id: venda.forma_pagamento_id,
        formas_pagamento: venda.formas_pagamento,
        valor_pago: venda.valor_pago,
        valor_troco: venda.valor_troco
      });

      let dadosPagamento = null;

      // Os dados de pagamento estão salvos diretamente na tabela pdv
      if (venda.tipo_pagamento) {
        if (venda.tipo_pagamento === 'vista' && venda.forma_pagamento_id) {
          // Pagamento à vista
          dadosPagamento = {
            tipo_pagamento: 'vista',
            forma_pagamento_id: venda.forma_pagamento_id,
            valor_pago: venda.valor_pago || venda.valor_total,
            valor_troco: venda.valor_troco || 0
          };
        } else if (venda.tipo_pagamento === 'parcial' && venda.formas_pagamento) {
          // Pagamento parcial (múltiplas formas)
          dadosPagamento = {
            tipo_pagamento: 'parcial',
            formas_pagamento: venda.formas_pagamento,
            valor_pago: venda.valor_pago || venda.valor_total,
            valor_troco: venda.valor_troco || 0
          };
        }
        console.log('💳 FRONTEND: Dados de pagamento preparados:', dadosPagamento);
      } else {
        console.log('⚠️ FRONTEND: Nenhum pagamento encontrado para a venda');
      }

      // Preparar dados para impressão da NFC-e
      const dadosImpressaoNfce = {
        venda: {
          id: venda.id,
          numero: venda.numero_venda,
          data: venda.data_venda ? new Date(venda.data_venda).toLocaleString('pt-BR') :
                venda.created_at ? new Date(venda.created_at).toLocaleString('pt-BR') :
                new Date().toLocaleString('pt-BR'),
          valor_total: venda.valor_total,
          valor_subtotal: venda.valor_subtotal || venda.valor_total,
          valor_desconto: venda.valor_desconto || 0,
          valor_desconto_itens: venda.valor_desconto_itens || 0,
          valor_desconto_total: venda.valor_desconto_total || 0,
          chave_nfe: venda.chave_nfe,
          numero_nfe: venda.numero_documento || null,
          serie_nfe: venda.serie_documento || '001', // ✅ CORREÇÃO: Manter fallback aqui pois não temos acesso ao usuário
          protocolo_nfe: venda.protocolo_nfe || null,
          data_emissao: venda.data_emissao_nfe ? new Date(venda.data_emissao_nfe).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
          hora_emissao: venda.data_emissao_nfe ? new Date(venda.data_emissao_nfe).toLocaleTimeString('pt-BR') : new Date().toLocaleTimeString('pt-BR'),
          data_autorizacao: venda.data_emissao_nfe ? new Date(venda.data_emissao_nfe).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
          hora_autorizacao: venda.data_emissao_nfe ? new Date(venda.data_emissao_nfe).toLocaleTimeString('pt-BR') : new Date().toLocaleTimeString('pt-BR')
        },
        empresa: {
          razao_social: empresaData.razao_social,
          nome_fantasia: empresaData.nome_fantasia,
          cnpj: empresaData.documento,
          inscricao_estadual: empresaData.inscricao_estadual,
          endereco: `${empresaData.endereco}, ${empresaData.numero}`,
          bairro: empresaData.bairro,
          cidade: empresaData.cidade,
          uf: empresaData.estado,
          cep: empresaData.cep,
          telefone: empresaData.telefone
        },
        cliente: {
          nome_cliente: venda.nome_cliente,
          documento_cliente: venda.documento_cliente
        },
        vendedor: vendedorData, // Incluir dados do vendedor principal
        vendedores: vendedoresData, // ✅ NOVO: Incluir todos os vendedores da venda
        itens: itensData.map(item => ({
          codigo: item.codigo_produto || 'N/A',
          nome: item.nome_produto,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          valor_total: item.valor_total_item || item.valor_total || (item.quantidade * item.valor_unitario),
          vendedor_id: item.vendedor_id || null, // ✅ NOVO: ID do vendedor do item
          vendedor_nome: vendedoresItens.get(item.vendedor_id) || null // ✅ NOVO: Nome do vendedor do item
        })),
        pagamento: dadosPagamento, // ✅ NOVO: Incluir dados de pagamento
        timestamp: new Date().toISOString(),
        tipo: 'nfce' // Identificar que é NFC-e
      };

      console.log('🖨️ FRONTEND: Dados preparados para reimpressão da NFC-e');
      console.log('🧑‍💼 DEBUG VENDEDORES NFC-e:', {
        vendedor_principal: vendedorData,
        vendedores_array: vendedoresData,
        vendedores_ids_venda: venda.vendedores_ids,
        vendedores_itens_map: Array.from(vendedoresItens.entries()),
        primeiro_item: dadosImpressaoNfce.itens[0]
      });

      // Gerar e imprimir cupom da NFC-e
      await gerarEImprimirCupomNfce(dadosImpressaoNfce);

    } catch (error) {
      console.error('❌ FRONTEND: Erro ao gerar cupom da NFC-e:', error);
      throw error;
    }
  };

  // Função para reimprimir cupom não fiscal
  const reimprimirCupomNaoFiscal = async (venda: any, usuarioData: any) => {
    try {
      console.log('🧾 FRONTEND: Gerando cupom não fiscal para venda:', venda.numero_venda);

      // Buscar dados da empresa
      const { data: empresaData } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', usuarioData.empresa_id)
        .single();

      if (!empresaData) {
        throw new Error('Dados da empresa não encontrados');
      }

      // Buscar itens da venda
      const { data: itensData, error: itensError } = await supabase
        .from('pdv_itens')
        .select('*')
        .eq('pdv_id', venda.id)
        .eq('empresa_id', usuarioData.empresa_id);

      if (itensError) {
        throw new Error('Erro ao carregar itens da venda');
      }

      if (!itensData || itensData.length === 0) {
        throw new Error('Nenhum item encontrado para esta venda');
      }

      console.log('📦 FRONTEND: Itens carregados:', itensData.length);

      // Buscar dados do vendedor principal se existir
      let vendedorData = null;
      if (venda.usuario_id) {
        const { data: vendedorInfo } = await supabase
          .from('usuarios')
          .select('id, nome')
          .eq('id', venda.usuario_id)
          .single();

        if (vendedorInfo) {
          vendedorData = {
            id: vendedorInfo.id,
            nome: vendedorInfo.nome
          };
        }
      }

      // ✅ NOVO: Buscar todos os vendedores da venda (do campo vendedores_ids)
      let vendedoresDataCupom = [];
      if (venda.vendedores_ids && Array.isArray(venda.vendedores_ids) && venda.vendedores_ids.length > 0) {
        const { data: vendedoresInfo } = await supabase
          .from('usuarios')
          .select('id, nome')
          .in('id', venda.vendedores_ids);

        if (vendedoresInfo && vendedoresInfo.length > 0) {
          vendedoresDataCupom = vendedoresInfo.map(v => ({
            id: v.id,
            nome: v.nome
          }));
        }
      }

      // ✅ NOVO: Buscar vendedores dos itens individuais
      const vendedoresItensCupom = new Map();
      for (const item of itensData) {
        if (item.vendedor_id) {
          if (!vendedoresItensCupom.has(item.vendedor_id)) {
            const { data: vendedorItem } = await supabase
              .from('usuarios')
              .select('id, nome')
              .eq('id', item.vendedor_id)
              .single();

            if (vendedorItem) {
              vendedoresItensCupom.set(item.vendedor_id, vendedorItem.nome);
            }
          }
        }
      }

      // ✅ NOVO: Usar dados de pagamento da própria venda (salvos na tabela pdv)
      console.log('💳 FRONTEND: Dados de pagamento para cupom não fiscal:', {
        tipo_pagamento: venda.tipo_pagamento,
        forma_pagamento_id: venda.forma_pagamento_id,
        formas_pagamento: venda.formas_pagamento,
        valor_pago: venda.valor_pago,
        valor_troco: venda.valor_troco
      });

      let dadosPagamentoCupom = null;

      // Os dados de pagamento estão salvos diretamente na tabela pdv
      if (venda.tipo_pagamento) {
        if (venda.tipo_pagamento === 'vista' && venda.forma_pagamento_id) {
          // Pagamento à vista
          dadosPagamentoCupom = {
            tipo_pagamento: 'vista',
            forma_pagamento_id: venda.forma_pagamento_id,
            valor_pago: venda.valor_pago || venda.valor_total,
            valor_troco: venda.valor_troco || 0
          };
        } else if (venda.tipo_pagamento === 'parcial' && venda.formas_pagamento) {
          // Pagamento parcial (múltiplas formas)
          dadosPagamentoCupom = {
            tipo_pagamento: 'parcial',
            formas_pagamento: venda.formas_pagamento,
            valor_pago: venda.valor_pago || venda.valor_total,
            valor_troco: venda.valor_troco || 0
          };
        }
        console.log('💳 FRONTEND: Dados de pagamento preparados para cupom:', dadosPagamentoCupom);
      } else {
        console.log('⚠️ FRONTEND: Nenhum pagamento encontrado para o cupom não fiscal');
      }

      // Preparar dados para impressão
      const dadosImpressao = {
        venda: {
          id: venda.id,
          numero: venda.numero_venda,
          data: venda.data_venda ? new Date(venda.data_venda).toLocaleString('pt-BR') :
                venda.created_at ? new Date(venda.created_at).toLocaleString('pt-BR') :
                new Date().toLocaleString('pt-BR'),
          valor_total: venda.valor_total,
          valor_subtotal: venda.valor_subtotal || venda.valor_total,
          valor_desconto: venda.valor_desconto || 0,
          valor_desconto_itens: venda.valor_desconto_itens || 0,
          valor_desconto_total: venda.valor_desconto_total || 0
        },
        empresa: {
          razao_social: empresaData.razao_social,
          nome_fantasia: empresaData.nome_fantasia,
          cnpj: empresaData.documento,
          inscricao_estadual: empresaData.inscricao_estadual,
          endereco: `${empresaData.endereco}, ${empresaData.numero}`,
          bairro: empresaData.bairro,
          cidade: empresaData.cidade,
          uf: empresaData.estado,
          cep: empresaData.cep,
          telefone: empresaData.telefone
        },
        cliente: {
          nome_cliente: venda.nome_cliente,
          documento_cliente: venda.documento_cliente
        },
        vendedor: vendedorData, // Incluir dados do vendedor principal
        vendedores: vendedoresDataCupom, // ✅ NOVO: Incluir todos os vendedores da venda
        itens: itensData.map(item => ({
          codigo: item.codigo_produto || 'N/A',
          nome: item.nome_produto,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          valor_total: item.valor_total_item || item.valor_total || (item.quantidade * item.valor_unitario),
          vendedor_id: item.vendedor_id || null, // ✅ NOVO: ID do vendedor do item
          vendedor_nome: vendedoresItensCupom.get(item.vendedor_id) || null // ✅ NOVO: Nome do vendedor do item
        })),
        pagamento: dadosPagamentoCupom, // ✅ NOVO: Incluir dados de pagamento
        timestamp: new Date().toISOString()
      };

      console.log('🖨️ FRONTEND: Dados preparados para reimpressão');

      // Gerar e imprimir cupom
      await gerarEImprimirCupom(dadosImpressao);

    } catch (error) {
      console.error('❌ FRONTEND: Erro ao gerar cupom não fiscal:', error);
      throw error;
    }
  };

  // Função auxiliar para gerar e imprimir cupom da NFC-e
  const gerarEImprimirCupomNfce = async (dadosImpressao: any) => {
    try {
      // ✅ NOVO: Detectar tipo de impressão configurado
      const tipoImpressao80mm = pdvConfig?.tipo_impressao_80mm ?? true;
      const tipoImpressao50mm = pdvConfig?.tipo_impressao_50mm ?? false;

      console.log('🖨️ Tipo de impressão detectado:', {
        '80mm': tipoImpressao80mm,
        '50mm': tipoImpressao50mm
      });

      // ✅ DEBUG: Verificar dados de impressão
      console.log('📋 Dados de impressão NFC-e:', {
        vendedor: dadosImpressao.vendedor,
        vendedores: dadosImpressao.vendedores,
        operador: dadosImpressao.operador,
        pagamento: dadosImpressao.pagamento,
        cliente: dadosImpressao.cliente
      });

      // ✅ DEBUG ESPECÍFICO: Verificar dados de pagamento
      console.log('💳 DEBUG PAGAMENTO NFC-e:', {
        'dadosImpressao.pagamento existe?': !!dadosImpressao.pagamento,
        'dadosImpressao.pagamento': dadosImpressao.pagamento,
        'tipo_pagamento': dadosImpressao.pagamento?.tipo_pagamento,
        'forma_pagamento_id': dadosImpressao.pagamento?.forma_pagamento_id,
        'formas_pagamento': dadosImpressao.pagamento?.formas_pagamento,
        'formasPagamento array': formasPagamento
      });

      // Função para formatar moeda
      const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(value);
      };

      // Função para formatar chave NFe
      const formatarChaveNfe = (chave: string) => {
        if (!chave || chave.length !== 44) return chave;
        return chave.replace(/(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})/,
          '$1 $2 $3 $4 $5 $6 $7 $8 $9 $10 $11');
      };

      // ✅ CORREÇÃO: Determinar tipo de impressão baseado na configuração
      const usarImpressao50mm = pdvConfig?.tipo_impressao_50mm === true && pdvConfig?.tipo_impressao_80mm === false;

      console.log('🖨️ Configuração de impressão NFC-e:', {
        'config_50mm': pdvConfig?.tipo_impressao_50mm,
        'config_80mm': pdvConfig?.tipo_impressao_80mm,
        'usar_50mm': usarImpressao50mm,
        'pdvConfig_completo': pdvConfig
      });

      console.log('🖨️ TIPO DE IMPRESSÃO DETECTADO:', usarImpressao50mm ? '50MM' : '80MM');

      // ✅ NOVO: Gerar CSS responsivo baseado no tipo de impressão
      const gerarCSSImpressao = () => {
        if (usarImpressao50mm) {
          // CSS otimizado para impressão 50mm (compacta)
          return `
            @media print {
              @page { margin: 0; size: 50mm auto; }
              body { margin: 0; }
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 10px; /* Aumentada de 9px para 10px para melhor legibilidade */
              font-weight: 600; /* Aumentado de 500 para 600 para impressão mais forte */
              color: #000000;
              text-shadow: 0.5px 0 0 currentColor, 0 0.5px 0 currentColor; /* Text-shadow mais forte */
              line-height: 1.1;
              letter-spacing: 0.1px;
              margin: 3px;
              max-width: 42mm;
              -webkit-print-color-adjust: exact; /* Força cores na impressão */
              print-color-adjust: exact;
            }
            .center { text-align: center; }
            .bold { font-weight: 900; font-size: 11px; } /* Aumentado para melhor destaque */
            .linha { border-top: 2px dashed #000; margin: 3px 0; } /* Linha mais grossa para 50mm */
            .item { margin: 1px 0; }
            .item-linha {
              display: flex;
              justify-content: space-between;
              font-size: 9px; /* Aumentado de 8px para 9px */
              font-weight: 600; /* Peso maior para melhor impressão */
              word-wrap: break-word;
            }
            .chave {
              font-size: 8px; /* Aumentado de 7px para 8px */
              font-weight: 600;
              word-break: break-all;
              line-height: 1.1;
            }
            .empresa-info {
              font-size: 9px; /* Aumentado de 8px para 9px */
              font-weight: 600;
              line-height: 1.1;
            }
            .qr-code { width: 80px !important; height: 80px !important; }
            .total-section { font-size: 11px; font-weight: 900; } /* Aumentado para destaque */
            .valor-monetario { white-space: nowrap; font-weight: 700; } /* Peso maior para valores */
          `;
        } else {
          // CSS para impressão 80mm - PREVINE SCALING DO NAVEGADOR
          return `
            @media print {
              @page {
                margin: 0;
                size: 3.15in auto; /* 80mm = 3.15 polegadas - mais compatível */
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              html {
                width: 3.15in !important; /* 80mm em polegadas */
                margin: 0 !important;
                padding: 0 !important;
                font-size: 12pt !important; /* Tamanho em pontos para impressão */
              }
              body {
                margin: 0 !important;
                padding: 0.1in !important; /* Padding em polegadas */
                width: 3.15in !important;
                min-width: 3.15in !important;
                max-width: 3.15in !important;
                transform: scale(1) !important;
                transform-origin: top left !important;
                zoom: 1 !important;
                -webkit-transform: scale(1) !important;
                -moz-transform: scale(1) !important;
                -ms-transform: scale(1) !important;
                -o-transform: scale(1) !important;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
                box-sizing: border-box !important;
                max-width: none !important; /* Previne redimensionamento automático */
                overflow: visible !important;
              }
            }
            @media screen {
              body {
                width: 3.15in !important; /* 80mm em polegadas para tela */
                min-width: 3.15in !important;
                max-width: 3.15in !important;
              }
            }
            html, body {
              width: 3.15in !important; /* 80mm = 3.15 polegadas */
              max-width: 3.15in !important;
              min-width: 3.15in !important;
              margin: 0 !important;
              padding: 0 !important;
              box-sizing: border-box !important;
              zoom: 1 !important;
              transform: none !important;
              -webkit-text-size-adjust: 100% !important; /* Previne ajuste automático */
              -ms-text-size-adjust: 100% !important;
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px; /* Fonte original */
              font-weight: 600; /* Aumentado de 500 para 600 para melhor impressão */
              color: #000000;
              text-shadow: 0.4px 0 0 currentColor; /* Aumentado de 0.3px para 0.4px */
              line-height: 1.2;
              letter-spacing: 0.2px; /* Espaçamento original */
              padding: 0.1in !important; /* Padding em polegadas - MANTÉM */
              width: 3.15in !important;
              max-width: 3.15in !important;
              min-width: 3.15in !important;
              box-sizing: border-box !important;
              overflow-x: hidden !important;
              background: white !important;
              word-wrap: break-word !important;
              -webkit-text-size-adjust: none !important; /* Força tamanho fixo - MANTÉM */
              -moz-text-size-adjust: none !important;
              -ms-text-size-adjust: none !important;
            }
            .center {
              text-align: center;
            }
            .bold {
              font-weight: 900; /* Peso original */
            }
            .linha {
              border-top: 1px dashed #000; /* Linha original */
              margin: 5px 0; /* Margem original */
            }
            .item {
              margin: 2px 0; /* Margem original */
            }
            .item-linha {
              display: flex;
              justify-content: space-between;
            }
            .chave {
              font-size: 10px; /* Tamanho original */
              word-break: break-all;
            }
            .empresa-info {
              font-size: 12px; /* Tamanho original */
            }
            .qr-code {
              width: 120px !important; /* QR Code original */
              height: 120px !important;
            }
            .total-section {
              font-size: 14px; /* Tamanho original */
            }
            .valor-monetario {
              white-space: nowrap;
              font-weight: 700; /* Peso original */
            }
          `;
        }
      };

      // Criar HTML formatado para impressão da NFC-e
      const htmlCupomNfce = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>NFC-e - ${dadosImpressao.venda.numero}</title>
          <style>
            ${gerarCSSImpressao()}
          </style>
        </head>
        <body>
          <div class="center empresa-info">
            <div class="bold">${dadosImpressao.empresa.razao_social}</div>
            ${dadosImpressao.empresa.nome_fantasia ? `<div>${dadosImpressao.empresa.nome_fantasia}</div>` : ''}
            <div>CNPJ: ${dadosImpressao.empresa.cnpj}</div>
            ${dadosImpressao.empresa.inscricao_estadual ? `<div>IE: ${dadosImpressao.empresa.inscricao_estadual}</div>` : ''}
            <div>${dadosImpressao.empresa.endereco}</div>
            <div>${dadosImpressao.empresa.bairro} - ${dadosImpressao.empresa.cidade}/${dadosImpressao.empresa.uf}</div>
            <div>CEP: ${dadosImpressao.empresa.cep}</div>
            ${dadosImpressao.empresa.telefone ? `<div>Tel: ${dadosImpressao.empresa.telefone}</div>` : ''}
          </div>

          <div class="linha"></div>

          <div class="center bold">NOTA FISCAL DE CONSUMIDOR ELETRÔNICA</div>
          <div class="center bold">NFC-e</div>
          <div class="center">Venda: ${dadosImpressao.venda.numero}</div>
          <div class="center">${dadosImpressao.venda.data}</div>

          ${dadosImpressao.cliente?.nome_cliente || dadosImpressao.vendedor?.nome ? `
            <div class="linha"></div>
            ${dadosImpressao.cliente?.nome_cliente ? `
              <div class="center">
                <div class="bold">CLIENTE: ${dadosImpressao.cliente.nome_cliente}</div>
                ${dadosImpressao.cliente.documento_cliente ? `<div>Doc: ${dadosImpressao.cliente.documento_cliente}</div>` : ''}
              </div>
            ` : ''}
            ${(() => {
              // Se há múltiplos vendedores, mostrar todos separados por /
              if (dadosImpressao.vendedores && dadosImpressao.vendedores.length > 1) {
                const nomesVendedores = dadosImpressao.vendedores.map(v => v.nome).join(' / ');
                return `
                  <div class="center">
                    <div class="bold">VENDEDORES: ${nomesVendedores}</div>
                  </div>
                `;
              }
              // Se há apenas um vendedor, mostrar normalmente
              else if (dadosImpressao.vendedor?.nome) {
                return `
                  <div class="center">
                    <div class="bold">VENDEDOR: ${dadosImpressao.vendedor.nome}</div>
                  </div>
                `;
              }
              return '';
            })()}
          ` : ''}

          <div class="linha"></div>

          ${dadosImpressao.itens.map(item => `
            <div class="item">
              <div>${item.nome}</div>
              <div class="item-linha">
                <span>${item.quantidade} x ${formatCurrency(item.valor_unitario)}</span>
                <span class="valor-monetario">${formatCurrency(item.valor_total)}</span>
              </div>
              ${(() => {
                // ✅ NOVO: Mostrar adicionais identados abaixo do produto principal
                let adicionaisHtml = '';
                if (item.adicionais && item.adicionais.length > 0) {
                  adicionaisHtml = item.adicionais.map(adicional => `
                    <div style="margin-left: 15px; font-size: 10px; color: #666; margin-top: 1px; font-weight: bold;">
                      + ${adicional.quantidade}x ${adicional.nome} - ${formatCurrency(adicional.preco * adicional.quantidade)}
                    </div>
                  `).join('');
                }

                // Mostrar vendedor do item apenas se há múltiplos vendedores na venda
                let vendedorHtml = '';
                if (dadosImpressao.vendedores && dadosImpressao.vendedores.length > 1 && item.vendedor_nome) {
                  vendedorHtml = `<div style="font-size: 10px; color: #000; margin-top: 2px; font-weight: 900;"><strong>Vendedor: ${item.vendedor_nome}</strong></div>`;
                }

                return adicionaisHtml + vendedorHtml;
              })()}
            </div>
          `).join('')}

          <div class="linha"></div>

          ${dadosImpressao.venda.valor_desconto > 0 ? `
            <div class="item-linha">
              <span>Subtotal:</span>
              <span>${formatCurrency(dadosImpressao.venda.valor_subtotal)}</span>
            </div>
            <div class="item-linha">
              <span>Desconto:</span>
              <span>-${formatCurrency(dadosImpressao.venda.valor_desconto)}</span>
            </div>
          ` : ''}

          <div class="item-linha bold total-section" style="margin: 5px 0;">
            <span>TOTAL:</span>
            <span class="valor-monetario">${formatCurrency(dadosImpressao.venda.valor_total)}</span>
          </div>

          ${dadosImpressao.pagamento && dadosImpressao.pagamento.tipo_pagamento ? `
            ${dadosImpressao.pagamento.tipo_pagamento === 'vista' && dadosImpressao.pagamento.forma_pagamento_id ? `
              ${(() => {
                const forma = formasPagamento.find(f => f.id === dadosImpressao.pagamento.forma_pagamento_id);
                return forma ? `
                  <div class="item-linha">
                    <span>${forma.nome}:</span>
                    <span>${formatCurrency(dadosImpressao.pagamento.valor_pago)}</span>
                  </div>
                ` : '';
              })()}
            ` : ''}
            ${dadosImpressao.pagamento.tipo_pagamento === 'parcial' && dadosImpressao.pagamento.formas_pagamento ? `
              ${dadosImpressao.pagamento.formas_pagamento.map(pag => {
                const forma = formasPagamento.find(f => f.id === pag.forma);
                return forma ? `
                  <div class="item-linha">
                    <span>${forma.nome}:</span>
                    <span>${formatCurrency(pag.valor)}</span>
                  </div>
                ` : '';
              }).join('')}
            ` : ''}
            ${dadosImpressao.pagamento.valor_troco && dadosImpressao.pagamento.valor_troco > 0 ? `
              <div class="item-linha bold" style="margin-top: 3px;">
                <span>TROCO:</span>
                <span>${formatCurrency(dadosImpressao.pagamento.valor_troco)}</span>
              </div>
            ` : ''}
          ` : ''}

          ${(() => {
            // ✅ EXIBIR DESCONTOS DETALHADOS APÓS FORMAS DE PAGAMENTO
            const descontoItens = dadosImpressao.venda.valor_desconto_itens || 0;
            const descontoTotal = dadosImpressao.venda.valor_desconto_total || 0;

            if (descontoItens > 0 || descontoTotal > 0) {
              return `
                <div class="linha"></div>
                <div class="center bold" style="font-size: 12px; margin: 5px 0;">DETALHAMENTO DOS DESCONTOS</div>
                ${descontoItens > 0 ? `
                  <div class="item-linha" style="font-size: 11px;">
                    <span>Desconto nos Itens:</span>
                    <span class="bold">-${formatCurrency(descontoItens)}</span>
                  </div>
                ` : ''}
                ${descontoTotal > 0 ? `
                  <div class="item-linha" style="font-size: 11px;">
                    <span>Desconto no Total:</span>
                    <span class="bold">-${formatCurrency(descontoTotal)}</span>
                  </div>
                ` : ''}
              `;
            }
            return '';
          })()}

          <div class="linha"></div>

          <div class="center">
            <div class="bold">INFORMAÇÕES FISCAIS</div>
            <div>Documento autorizado pela SEFAZ</div>
            ${dadosImpressao.venda.chave_nfe ? `
              <div class="chave">
                <div>Chave de Acesso:</div>
                <div>${formatarChaveNfe(dadosImpressao.venda.chave_nfe)}</div>
              </div>
            ` : ''}

            ${dadosImpressao.venda.chave_nfe ? `
              <div style="margin: 10px 0;">
                <div>Consulte pela Chave de Acesso em:</div>
                <div style="font-size: 10px;">https://www.homologacao.nfce.fazenda.sp.gov.br/NFCeConsultaPublica</div>

                ${dadosImpressao.cliente?.documento_cliente ? `
                  <div style="margin: 5px 0;">
                    <div class="bold">CONSUMIDOR - ${dadosImpressao.cliente.documento_cliente.length === 11 ? 'CPF' : 'CNPJ'} ${dadosImpressao.cliente.documento_cliente.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}</div>
                    <div>NFC-e n. ${dadosImpressao.venda.numero_nfe || 'N/A'} Série ${String(dadosImpressao.venda.serie_nfe || '001').padStart(3, '0')} ${dadosImpressao.venda.data_emissao || new Date().toLocaleDateString('pt-BR')} ${dadosImpressao.venda.hora_emissao || new Date().toLocaleTimeString('pt-BR')}</div>
                  </div>
                ` : `
                  <div style="margin: 5px 0;">
                    <div>NFC-e n. ${dadosImpressao.venda.numero_nfe || 'N/A'} Série ${String(dadosImpressao.venda.serie_nfe || '001').padStart(3, '0')} ${dadosImpressao.venda.data_emissao || new Date().toLocaleDateString('pt-BR')} ${dadosImpressao.venda.hora_emissao || new Date().toLocaleTimeString('pt-BR')}</div>
                  </div>
                `}

                ${dadosImpressao.venda.protocolo_nfe ? `
                  <div style="margin: 5px 0;">
                    <div>Protocolo de Autorização: ${dadosImpressao.venda.protocolo_nfe}</div>
                    <div>Data de Autorização: ${dadosImpressao.venda.data_autorizacao || new Date().toLocaleDateString('pt-BR')} ${dadosImpressao.venda.hora_autorizacao || new Date().toLocaleTimeString('pt-BR')}</div>
                  </div>
                ` : ''}

                <div style="margin: 5px 0;">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=${usarImpressao50mm ? '80x80' : '120x120'}&data=${encodeURIComponent(dadosImpressao.venda.chave_nfe)}"
                       alt="QR Code NFC-e"
                       class="qr-code"
                       style="margin: 5px auto; display: block;">
                </div>

                <div style="font-size: 10px;">Tributos Totais Incidentes (Lei Federal 12.741/2012): R$ ----</div>
                <div style="font-size: 10px;">NFC-e emitida pelo Sistema Nexo PDV</div>
              </div>
            ` : ''}
          </div>

          <div class="linha"></div>

          <div class="center">
            <div>${pdvConfig?.rodape_personalizado || 'Obrigado pela preferencia volte sempre!'}</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 1000);
            };
          </script>
        </body>
        </html>
      `;

      // Abrir janela de impressão
      const janelaImpressao = window.open('', '_blank', 'width=400,height=600');
      if (janelaImpressao) {
        janelaImpressao.document.write(htmlCupomNfce);
        janelaImpressao.document.close();
        console.log('✅ FRONTEND: Janela de impressão da NFC-e aberta');
        toast.success('NFC-e enviada para impressão!');
      } else {
        throw new Error('Não foi possível abrir janela de impressão. Verifique se pop-ups estão bloqueados.');
      }

    } catch (error) {
      console.error('❌ FRONTEND: Erro ao gerar cupom da NFC-e:', error);
      throw error;
    }
  };

  // Função auxiliar para gerar e imprimir cupom (reutilizada)
  const gerarEImprimirCupom = async (dadosImpressao: any) => {
    try {
      // ✅ CORREÇÃO: Determinar tipo de impressão baseado na configuração
      const usarImpressao50mm = pdvConfig?.tipo_impressao_50mm === true && pdvConfig?.tipo_impressao_80mm === false;

      console.log('🖨️ Cupom não fiscal - Configuração de impressão:', {
        'config_50mm': pdvConfig?.tipo_impressao_50mm,
        'config_80mm': pdvConfig?.tipo_impressao_80mm,
        'usar_50mm': usarImpressao50mm,
        'pdvConfig_completo': pdvConfig
      });

      console.log('🖨️ CUPOM NÃO FISCAL - TIPO DE IMPRESSÃO DETECTADO:', usarImpressao50mm ? '50MM' : '80MM');

      // ✅ DEBUG: Verificar dados de impressão cupom
      console.log('📋 Dados de impressão cupom:', {
        vendedor: dadosImpressao.vendedor,
        vendedores: dadosImpressao.vendedores,
        operador: dadosImpressao.operador,
        pagamento: dadosImpressao.pagamento,
        cliente: dadosImpressao.cliente
      });

      // ✅ DEBUG ESPECÍFICO: Verificar dados de pagamento
      console.log('💳 DEBUG PAGAMENTO CUPOM:', {
        'dadosImpressao.pagamento existe?': !!dadosImpressao.pagamento,
        'dadosImpressao.pagamento': dadosImpressao.pagamento,
        'tipo_pagamento': dadosImpressao.pagamento?.tipo_pagamento,
        'forma_pagamento_id': dadosImpressao.pagamento?.forma_pagamento_id,
        'formas_pagamento': dadosImpressao.pagamento?.formas_pagamento,
        'formasPagamento array': formasPagamento
      });

      // Função para formatar moeda
      const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(value);
      };

      // ✅ NOVO: Gerar CSS responsivo baseado no tipo de impressão (reutilizando a mesma função)
      const gerarCSSImpressaoCupom = () => {
        if (usarImpressao50mm) {
          // CSS otimizado para impressão 50mm (compacta)
          return `
            @media print {
              @page { margin: 0; size: 50mm auto; }
              body { margin: 0; }
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 10px; /* Aumentada de 9px para 10px para melhor legibilidade */
              font-weight: 600; /* Aumentado de 500 para 600 para impressão mais forte */
              color: #000000;
              text-shadow: 0.5px 0 0 currentColor, 0 0.5px 0 currentColor; /* Text-shadow mais forte */
              line-height: 1.1;
              letter-spacing: 0.1px;
              margin: 3px;
              max-width: 42mm;
              -webkit-print-color-adjust: exact; /* Força cores na impressão */
              print-color-adjust: exact;
            }
            .center { text-align: center; }
            .bold { font-weight: 900; font-size: 11px; } /* Aumentado para melhor destaque */
            .linha { border-top: 2px dashed #000; margin: 3px 0; } /* Linha mais grossa para 50mm */
            .item { margin: 1px 0; }
            .item-linha {
              display: flex;
              justify-content: space-between;
              font-size: 9px; /* Aumentado de 8px para 9px */
              font-weight: 600; /* Peso maior para melhor impressão */
              word-wrap: break-word;
            }
            .empresa-info {
              font-size: 9px; /* Aumentado de 8px para 9px */
              font-weight: 600;
              line-height: 1.1;
            }
            .total-section { font-size: 11px; font-weight: 900; } /* Aumentado para destaque */
            .valor-monetario { white-space: nowrap; font-weight: 700; } /* Peso maior para valores */
          `;
        } else {
          // CSS para impressão 80mm - PREVINE SCALING DO NAVEGADOR
          return `
            @media print {
              @page {
                margin: 0;
                size: 3.15in auto; /* 80mm = 3.15 polegadas - mais compatível */
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              html {
                width: 3.15in !important; /* 80mm em polegadas */
                margin: 0 !important;
                padding: 0 !important;
                font-size: 12pt !important; /* Tamanho em pontos para impressão */
              }
              body {
                margin: 0 !important;
                padding: 0.1in !important; /* Padding em polegadas */
                width: 3.15in !important;
                min-width: 3.15in !important;
                max-width: 3.15in !important;
                transform: scale(1) !important;
                transform-origin: top left !important;
                zoom: 1 !important;
                -webkit-transform: scale(1) !important;
                -moz-transform: scale(1) !important;
                -ms-transform: scale(1) !important;
                -o-transform: scale(1) !important;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
                box-sizing: border-box !important;
                max-width: none !important; /* Previne redimensionamento automático */
                overflow: visible !important;
              }
            }
            @media screen {
              body {
                width: 3.15in !important; /* 80mm em polegadas para tela */
                min-width: 3.15in !important;
                max-width: 3.15in !important;
              }
            }
            html, body {
              width: 3.15in !important; /* 80mm = 3.15 polegadas */
              max-width: 3.15in !important;
              min-width: 3.15in !important;
              margin: 0 !important;
              padding: 0 !important;
              box-sizing: border-box !important;
              zoom: 1 !important;
              transform: none !important;
              -webkit-text-size-adjust: 100% !important; /* Previne ajuste automático */
              -ms-text-size-adjust: 100% !important;
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px; /* Fonte original */
              font-weight: 600; /* Aumentado de 500 para 600 para melhor impressão */
              color: #000000;
              text-shadow: 0.4px 0 0 currentColor; /* Aumentado de 0.3px para 0.4px */
              line-height: 1.2;
              letter-spacing: 0.2px; /* Espaçamento original */
              padding: 0.1in !important; /* Padding em polegadas - MANTÉM */
              width: 3.15in !important;
              max-width: 3.15in !important;
              min-width: 3.15in !important;
              box-sizing: border-box !important;
              overflow-x: hidden !important;
              background: white !important;
              word-wrap: break-word !important;
              -webkit-text-size-adjust: none !important; /* Força tamanho fixo - MANTÉM */
              -moz-text-size-adjust: none !important;
              -ms-text-size-adjust: none !important;
            }
            .center {
              text-align: center;
            }
            .bold {
              font-weight: 900; /* Peso original */
            }
            .linha {
              border-top: 1px dashed #000; /* Linha original */
              margin: 5px 0; /* Margem original */
            }
            .item {
              margin: 2px 0; /* Margem original */
            }
            .item-linha {
              display: flex;
              justify-content: space-between;
            }
            .empresa-info {
              font-size: 12px; /* Tamanho original */
              font-weight: 600; /* Adicionado peso para melhor impressão */
            }
            .total-section {
              font-size: 14px; /* Tamanho original */
            }
            .valor-monetario {
              white-space: nowrap;
              font-weight: 700; /* Peso original */
            }
          `;
        }
      };

      // Criar HTML formatado para impressão
      const htmlCupom = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Cupom - Venda ${dadosImpressao.venda.numero}</title>
          <style>
            ${gerarCSSImpressaoCupom()}
          </style>
        </head>
        <body>
          <div class="center empresa-info">
            ${pdvConfig?.mostrar_razao_social_cupom_finalizar ? `<div class="bold">${dadosImpressao.empresa.razao_social}</div>` : ''}
            ${dadosImpressao.empresa.nome_fantasia ? `<div class="bold">${dadosImpressao.empresa.nome_fantasia}</div>` : ''}
            <div>CNPJ: ${dadosImpressao.empresa.cnpj}</div>
            ${pdvConfig?.mostrar_endereco_cupom_finalizar ? `
              <div>${dadosImpressao.empresa.endereco}</div>
              <div>${dadosImpressao.empresa.bairro} - ${dadosImpressao.empresa.cidade}/${dadosImpressao.empresa.uf}</div>
              <div>CEP: ${dadosImpressao.empresa.cep}</div>
            ` : ''}
            ${dadosImpressao.empresa.telefone ? `<div>Tel: ${dadosImpressao.empresa.telefone}</div>` : ''}
          </div>

          <div class="linha"></div>

          <div class="center bold">CUPOM NÃO FISCAL</div>
          <div class="center">Venda: ${dadosImpressao.venda.numero}</div>
          <div class="center">${dadosImpressao.venda.data}</div>

          ${(dadosImpressao.cliente?.nome_cliente && pdvConfig?.seleciona_clientes) ||
            (dadosImpressao.vendedor?.nome && pdvConfig?.vendedor) ||
            (dadosImpressao.operador?.nome && pdvConfig?.mostrar_operador_cupom_finalizar) ? `
            <div class="linha"></div>
          ` : ''}

          ${dadosImpressao.cliente?.nome_cliente && pdvConfig?.seleciona_clientes ? `
            <div class="center">
              <div class="bold">CLIENTE: ${dadosImpressao.cliente.nome_cliente}</div>
              ${dadosImpressao.cliente.documento_cliente ? `<div>Doc: ${dadosImpressao.cliente.documento_cliente}</div>` : ''}
            </div>
          ` : ''}

          ${pdvConfig?.vendedor ? `
            ${(() => {
              // Se há múltiplos vendedores, mostrar todos separados por /
              if (dadosImpressao.vendedores && dadosImpressao.vendedores.length > 1) {
                const nomesVendedores = dadosImpressao.vendedores.map(v => v.nome).join(' / ');
                return `
                  <div class="center">
                    <div class="bold">VENDEDORES: ${nomesVendedores}</div>
                  </div>
                `;
              }
              // Se há apenas um vendedor, mostrar normalmente
              else if (dadosImpressao.vendedor?.nome) {
                return `
                  <div class="center">
                    <div class="bold">VENDEDOR: ${dadosImpressao.vendedor.nome}</div>
                  </div>
                `;
              }
              return '';
            })()}
          ` : ''}

          ${dadosImpressao.operador?.nome && pdvConfig?.mostrar_operador_cupom_finalizar ? `
            <div class="center">
              <div class="bold">OPERADOR: ${dadosImpressao.operador.nome}</div>
            </div>
          ` : ''}

          <div class="linha"></div>

          ${dadosImpressao.itens.map(item => `
            <div class="item">
              <div>${item.nome}</div>
              <div class="item-linha">
                <span>${item.quantidade} x ${formatCurrency(item.valor_unitario)}</span>
                <span class="valor-monetario">${formatCurrency(item.valor_total)}</span>
              </div>
              ${(() => {
                // ✅ NOVO: Mostrar adicionais identados abaixo do produto principal
                let adicionaisHtml = '';
                if (item.adicionais && item.adicionais.length > 0) {
                  adicionaisHtml = item.adicionais.map(adicional => `
                    <div style="margin-left: 15px; font-size: 10px; color: #666; margin-top: 1px; font-weight: bold;">
                      + ${adicional.quantidade}x ${adicional.nome} - ${formatCurrency(adicional.preco * adicional.quantidade)}
                    </div>
                  `).join('');
                }

                // Mostrar vendedor do item apenas se há múltiplos vendedores na venda
                let vendedorHtml = '';
                if (dadosImpressao.vendedores && dadosImpressao.vendedores.length > 1 && item.vendedor_nome) {
                  vendedorHtml = `<div style="font-size: 10px; color: #000; margin-top: 2px; font-weight: 900;"><strong>Vendedor: ${item.vendedor_nome}</strong></div>`;
                }

                return adicionaisHtml + vendedorHtml;
              })()}
            </div>
          `).join('')}

          <div class="linha"></div>

          ${dadosImpressao.venda.valor_desconto > 0 ? `
            <div class="item-linha">
              <span>Subtotal:</span>
              <span>${formatCurrency(dadosImpressao.venda.valor_subtotal)}</span>
            </div>
            <div class="item-linha">
              <span>Desconto:</span>
              <span>-${formatCurrency(dadosImpressao.venda.valor_desconto)}</span>
            </div>
          ` : ''}

          <div class="item-linha bold total-section" style="margin: 5px 0;">
            <span>TOTAL:</span>
            <span class="valor-monetario">${formatCurrency(dadosImpressao.venda.valor_total)}</span>
          </div>

          ${dadosImpressao.pagamento && dadosImpressao.pagamento.tipo_pagamento ? `
            ${dadosImpressao.pagamento.tipo_pagamento === 'vista' && dadosImpressao.pagamento.forma_pagamento_id ? `
              ${(() => {
                const forma = formasPagamento.find(f => f.id === dadosImpressao.pagamento.forma_pagamento_id);
                return forma ? `
                  <div class="item-linha">
                    <span>${forma.nome}:</span>
                    <span>${formatCurrency(dadosImpressao.pagamento.valor_pago)}</span>
                  </div>
                ` : '';
              })()}
            ` : ''}
            ${dadosImpressao.pagamento.tipo_pagamento === 'parcial' && dadosImpressao.pagamento.formas_pagamento ? `
              ${dadosImpressao.pagamento.formas_pagamento.map(pag => {
                const forma = formasPagamento.find(f => f.id === pag.forma);
                return forma ? `
                  <div class="item-linha">
                    <span>${forma.nome}:</span>
                    <span>${formatCurrency(pag.valor)}</span>
                  </div>
                ` : '';
              }).join('')}
            ` : ''}
            ${dadosImpressao.pagamento.valor_troco && dadosImpressao.pagamento.valor_troco > 0 ? `
              <div class="item-linha bold" style="margin-top: 3px;">
                <span>TROCO:</span>
                <span>${formatCurrency(dadosImpressao.pagamento.valor_troco)}</span>
              </div>
            ` : ''}
          ` : ''}

          ${(() => {
            // ✅ EXIBIR DESCONTOS DETALHADOS APÓS FORMAS DE PAGAMENTO
            const descontoItens = dadosImpressao.venda.valor_desconto_itens || 0;
            const descontoTotal = dadosImpressao.venda.valor_desconto_total || 0;

            if (descontoItens > 0 || descontoTotal > 0) {
              return `
                <div class="linha"></div>
                <div class="center bold" style="font-size: 12px; margin: 5px 0;">DETALHAMENTO DOS DESCONTOS</div>
                ${descontoItens > 0 ? `
                  <div class="item-linha" style="font-size: 11px;">
                    <span>Desconto nos Itens:</span>
                    <span class="bold">-${formatCurrency(descontoItens)}</span>
                  </div>
                ` : ''}
                ${descontoTotal > 0 ? `
                  <div class="item-linha" style="font-size: 11px;">
                    <span>Desconto no Total:</span>
                    <span class="bold">-${formatCurrency(descontoTotal)}</span>
                  </div>
                ` : ''}
              `;
            }
            return '';
          })()}

          <div class="linha"></div>

          <div class="center">
            <div>${pdvConfig?.rodape_personalizado || 'Obrigado pela preferencia volte sempre!'}</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 1000);
            };
          </script>
        </body>
        </html>
      `;

      // Abrir janela de impressão
      const janelaImpressao = window.open('', '_blank', 'width=400,height=600');
      if (janelaImpressao) {
        janelaImpressao.document.write(htmlCupom);
        janelaImpressao.document.close();
        console.log('✅ FRONTEND: Janela de impressão aberta');
        toast.success('Cupom enviado para impressão!');
      } else {
        throw new Error('Não foi possível abrir janela de impressão. Verifique se pop-ups estão bloqueados.');
      }

    } catch (error) {
      console.error('❌ FRONTEND: Erro ao gerar cupom:', error);
      throw error;
    }
  };

  // Função para finalizar o processamento
  const finalizarProcessamento = () => {
    const mensagemSucesso = tipoFinalizacaoAtual === 'finalizar_com_impressao'
      ? 'Venda finalizada e impressa com sucesso!'
      : 'Venda finalizada com sucesso!';

    setEtapaProcessamento(mensagemSucesso);
    setStatusProcessamento('sucesso');

    setTimeout(() => {
      // Fechar modal de processamento
      setShowProcessandoVenda(false);

      // Mostrar toast de sucesso
      const toastMessage = tipoFinalizacaoAtual === 'finalizar_com_impressao'
        ? `Venda #${numeroVendaProcessada} finalizada e impressa com sucesso!`
        : `Venda #${numeroVendaProcessada} finalizada com sucesso!`;

      toast.success(toastMessage);

      // ✅ CORREÇÃO: Limpar TODOS os estados (igual ao "Finalizar sem Impressão")
      setCarrinho([]);
      setClienteSelecionado(null);
      setVendedorSelecionado(null); // ✅ IMPORTANTE: Limpar vendedor selecionado
      setShowFinalizacaoFinal(false); // ✅ IMPORTANTE: Fechar modal de finalização
      limparPagamentosParciaisSilencioso(); // ✅ IMPORTANTE: Limpar pagamentos
      setCpfCnpjNota('');
      setClienteEncontrado(null);
      setTipoDocumento('cpf');
      setPedidosImportados([]);
      setDescontoPrazoSelecionado(null);
      clearPDVState(); // ✅ IMPORTANTE: Limpar localStorage

      // Reset estados específicos da impressão
      setStatusProcessamento('processando');
      setDadosImpressao(null);
      setTipoFinalizacaoAtual('');

      // Recarregar estoque se necessário
      if (pdvConfig?.baixa_estoque_pdv) {
        loadEstoque();
      }
    }, 1500);
  };

  const limparCarrinhoCompleto = () => {
    // Limpar carrinho
    setCarrinho([]);

    // Limpar área lateral
    setClienteSelecionado(null);
    setVendedorSelecionado(null); // ✅ IMPORTANTE: Limpar vendedor selecionado
    setPedidosImportados([]);
    setDescontoPrazoSelecionado(null);
    setDescontosCliente({ prazo: [], valor: [] });

    // Limpar dados de finalização
    setCpfCnpjNota('');
    setClienteEncontrado(null);
    setTipoDocumento('cpf');
    setErroValidacao('');
    limparPagamentosParciaisSilencioso();

    // Limpar localStorage e fechar modal
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
                          unidade_medida:unidade_medida_id (
                            id,
                            sigla,
                            nome
                          ),
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

  // ✅ NOVO: useEffect para carregar unidades de medida quando modal abrir
  useEffect(() => {
    if (showSeletorUnidadeModal) {
      loadUnidadesMedida();
    }
  }, [showSeletorUnidadeModal]);

  // useEffect para focar no campo valor quando modal de venda sem produto abrir
  useEffect(() => {
    if (showVendaSemProdutoModal && valorVendaSemProdutoRef.current) {
      // Usar setTimeout para garantir que o modal esteja renderizado
      setTimeout(() => {
        valorVendaSemProdutoRef.current?.focus();
      }, 100);
    }
  }, [showVendaSemProdutoModal]);

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

        {/* Área dos Itens do Carrinho - ocupa toda largura quando vazio, 65% quando há itens */}
        <div className={`${carrinho.length > 0 ? 'w-[65%]' : 'w-full'} p-4 flex flex-col h-full relative overflow-hidden transition-all duration-500`}>
          {/* Overlay removido - estava causando problemas no layout lado a lado */}
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

                  {/* ✅ CORRIGIDO: Indicadores com posicionamento inteligente */}
                  {/* Indicador de quantidade - posição dinâmica */}
                  {searchTerm.includes('*') && (
                    <div className={`absolute top-1/2 -translate-y-1/2 ${
                      pdvConfig?.venda_codigo_barras && codigoBarrasBuffer
                        ? 'right-20' // Mais à esquerda quando há código de barras
                        : 'right-3'  // Posição normal quando não há código de barras
                    }`}>
                      <div className="bg-primary-500 text-white text-xs px-2 py-1 rounded-full">
                        Qtd: {searchTerm.split('*')[0]}
                      </div>
                    </div>
                  )}

                  {/* Indicador de código de barras buffer - sempre à direita */}
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
                            className={`w-12 h-12 lg:w-10 lg:h-10 bg-gray-900 rounded overflow-hidden flex-shrink-0 relative self-start ${
                              !item.vendaSemProduto ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
                            }`}
                            onClick={!item.vendaSemProduto ? (e) => abrirGaleria(item.produto, e) : undefined}
                          >
                            {!item.vendaSemProduto && getFotoPrincipal(item.produto) ? (
                              <img
                                src={getFotoPrincipal(item.produto)!.url}
                                alt={item.produto.nome}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                {item.vendaSemProduto ? (
                                  <DollarSign size={14} className="text-green-400" />
                                ) : (
                                  <Package size={14} className="text-gray-700" />
                                )}
                              </div>
                            )}

                            {/* Indicador de múltiplas fotos - Compacto */}
                            {!item.vendaSemProduto && item.produto.produto_fotos && item.produto.produto_fotos.length > 1 && (
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
                                          <h4 className="text-white font-medium text-sm line-clamp-1">{item.vendaSemProduto ? item.nome : item.produto.nome}</h4>
                                          {pdvConfig?.editar_nome_produto && (
                                            <button
                                              onClick={() => iniciarEdicaoNome(item.id, item.vendaSemProduto ? item.nome : item.produto.nome)}
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
                                      {!item.vendaSemProduto && (
                                        <>
                                          <span>Código {item.produto.codigo}</span>
                                          {item.produto.codigo_barras && item.produto.codigo_barras.trim() !== '' && (
                                            <div className="flex items-center gap-1">
                                              <QrCode size={10} className="text-gray-500" />
                                              <span>{item.produto.codigo_barras}</span>
                                            </div>
                                          )}
                                        </>
                                      )}
                                      {item.vendaSemProduto && (
                                        <span className="text-green-400">Venda sem produto</span>
                                      )}
                                      {/* ✅ NOVO: Mostrar valor unitário quando tem adicionais */}
                                      {!item.vendaSemProduto && item.adicionais && item.adicionais.length > 0 && (
                                        <div className="flex items-center gap-1 text-primary-400">
                                          <span>•</span>
                                          <span>{formatCurrency(item.produto.preco)} x {item.quantidade}</span>
                                          <span>•</span>
                                          <span>{item.produto.unidade_medida?.sigla || 'UN'}</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* ✅ NOVO: Exibir informações de desconto como no sistema de pedidos */}
                                    {!item.vendaSemProduto && (item.produto.promocao || (item.produto.desconto_quantidade && item.quantidade >= (item.produto.quantidade_minima || 0))) && (
                                      <div className="mt-1">
                                        {/* Preço com desconto no formato: preço_original x quantidade = subtotal */}
                                        <p className="text-sm">
                                          <span className="text-gray-400 line-through">{formatCurrency(item.produto.preco)}</span>
                                          <span className="text-primary-400 ml-2">{formatCurrency(calcularPrecoModalQuantidade(item.produto, item.quantidade))}</span>
                                          <span className="text-gray-400"> x {item.quantidade} = {formatCurrency(item.subtotal)}</span>
                                          <span className="text-primary-400"> • {item.produto.unidade_medida?.sigla || 'UN'}</span>
                                        </p>
                                        {/* Texto explicativo do desconto */}
                                        <p className="text-xs text-green-400">
                                          {item.produto.desconto_quantidade && item.quantidade >= (item.produto.quantidade_minima || 0) ? (
                                            <>
                                              Desconto por quantidade:
                                              {item.produto.tipo_desconto_quantidade === 'percentual'
                                                ? ` ${item.produto.percentual_desconto_quantidade}%`
                                                : ` ${formatCurrency(item.produto.valor_desconto_quantidade || 0)}`
                                              }
                                            </>
                                          ) : (
                                            'Produto em promoção'
                                          )}
                                        </p>
                                      </div>
                                    )}

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

                                    {/* Informações do vendedor */}
                                    {pdvConfig?.vendedor && item.vendedor_nome && (
                                      <div className="text-xs text-green-400 mt-1 lg:mt-0">
                                        👤 {item.vendedor_nome}
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
                                {!item.vendaSemProduto && pdvConfig?.desconto_no_item && !item.desconto && (
                                  <button
                                    onClick={() => abrirModalDesconto(item.id)}
                                    className="w-6 h-6 bg-yellow-600/20 hover:bg-yellow-600/40 rounded-full flex items-center justify-center text-yellow-200 transition-colors"
                                    title="Aplicar desconto"
                                  >
                                    <Percent size={10} />
                                  </button>
                                )}

                                {!item.vendaSemProduto && pdvConfig?.desconto_no_item && item.desconto && (
                                  <button
                                    onClick={() => removerDesconto(item.id)}
                                    className="w-6 h-6 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white transition-colors"
                                    title="Remover desconto"
                                  >
                                    <X size={10} />
                                  </button>
                                )}

                                {/* Botão para opções adicionais - desktop - Compacto */}
                                {!item.vendaSemProduto && item.temOpcoesAdicionais && (
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
                      const teclaAtalho = originalIndex === 0 ? 'F0' : `F${originalIndex}`;

                      // ✅ NOVO: Ocultar botões "Pedidos" e "Movimentos" quando há itens no carrinho
                      if (carrinho.length > 0 && (item.id === 'pedidos' || item.id === 'movimentos')) {
                        return null;
                      }

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
                            {/* Contador de NFC-e pendentes - só aparece no botão Movimentos */}
                            {item.id === 'movimentos' && contadorNfcePendentes > 0 && (
                              <div className="absolute -top-3 -right-10 bg-yellow-500 text-white text-sm rounded-full min-w-[22px] h-[22px] flex items-center justify-center font-bold border-2 border-background-card shadow-lg z-[60]">
                                {contadorNfcePendentes > 99 ? '99+' : contadorNfcePendentes}
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

        {/* Área Lateral de Informações - Aparece quando há configurações habilitadas OU pedidos importados */}
        {carrinho.length > 0 && (
          pedidosImportados.length > 0 ||
          (pdvConfig?.seleciona_clientes ||
           pdvConfig?.vendedor ||
           pdvConfig?.comandas ||
           pdvConfig?.mesas ||
           pdvConfig?.exibe_foto_item)
        ) && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{
              type: "tween",
              duration: 0.3,
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
            className={`w-48 bg-background-card border-l border-gray-800 flex flex-col h-full ${
              showFinalizacaoFinal ? 'z-20' : ''
            }`}
          >
            {/* Conteúdo scrollável da área lateral */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">

              {/* Cliente - Aparece se configuração habilitada OU se há pedidos importados */}
              {(pdvConfig?.seleciona_clientes || pedidosImportados.length > 0) && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2">
                  {/* Cliente selecionado manualmente */}
                  {pdvConfig?.seleciona_clientes ? (
                    clienteSelecionado ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <User size={12} className="text-blue-400" />
                          <div className="text-xs text-blue-400 font-medium">Cliente</div>
                        </div>
                        <div className="text-white text-xs font-medium truncate">{clienteSelecionado.nome}</div>
                        {clienteSelecionado.telefone && (
                          <div className="text-xs text-gray-400">{clienteSelecionado.telefone}</div>
                        )}
                        {/* Botões só aparecem quando NÃO há pedidos importados */}
                        {pedidosImportados.length === 0 && (
                          <div className="flex gap-2 mt-1">
                            <button
                              onClick={() => setShowClienteModal(true)}
                              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              Trocar
                            </button>
                            <button
                              onClick={() => {
                                setClienteSelecionado(null);
                                // Limpar também o CPF/CNPJ se estiver preenchido
                                setCpfCnpjNota('');
                                setClienteEncontrado(null);
                                // Limpar opções de faturamento do cliente removido
                                setDescontosCliente({ prazo: [], valor: [] });
                                setDescontoPrazoSelecionado(null);
                              }}
                              className="text-xs text-red-400 hover:text-red-300 transition-colors"
                            >
                              Remover
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowClienteModal(true)}
                        className="w-full text-left space-y-1 hover:bg-blue-500/20 transition-colors rounded p-1"
                      >
                        <div className="flex items-center gap-1">
                          <User size={12} className="text-blue-400" />
                          <div className="text-xs text-blue-400 font-medium">Cliente</div>
                        </div>
                        <div className="text-white text-xs">Selecionar</div>
                      </button>
                    )
                  ) : (
                    /* Cliente dos pedidos importados */
                    pedidosImportados.length > 0 && pedidosImportados[0]?.cliente && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <User size={12} className="text-blue-400" />
                          <div className="text-xs text-blue-400 font-medium">Cliente dos Pedidos</div>
                        </div>
                        <div className="text-white text-xs font-medium truncate">{pedidosImportados[0].cliente.nome}</div>
                        {pedidosImportados[0].cliente.telefone && (
                          <div className="text-xs text-gray-400">{pedidosImportados[0].cliente.telefone}</div>
                        )}
                        {pedidosImportados[0].cliente.email && (
                          <div className="text-xs text-gray-500 truncate">{pedidosImportados[0].cliente.email}</div>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Vendedor - Aparece se configuração habilitada */}
              {pdvConfig?.vendedor && (
                <div className="bg-green-500/10 border border-green-500/30 rounded p-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <UserCheck size={12} className="text-green-400" />
                      <div className="text-xs text-green-400 font-medium">Vendedor</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-white text-xs font-medium">
                        {vendedorSelecionado ? vendedorSelecionado.nome : 'Nenhum selecionado'}
                      </div>
                      <button
                        onClick={() => setShowVendedorModal(true)}
                        className="text-xs text-green-400 hover:text-green-300 transition-colors"
                      >
                        {vendedorSelecionado ? 'Trocar' : 'Selecionar'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Comanda - Aparece se configuração habilitada */}
              {pdvConfig?.comandas && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <FileText size={12} className="text-yellow-400" />
                      <div className="text-xs text-yellow-400 font-medium">Comanda</div>
                    </div>
                    <div className="text-white text-xs font-medium">Em desenvolvimento</div>
                  </div>
                </div>
              )}

              {/* Mesa - Aparece se configuração habilitada */}
              {pdvConfig?.mesas && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded p-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Grid3X3 size={12} className="text-purple-400" />
                      <div className="text-xs text-purple-400 font-medium">Mesa</div>
                    </div>
                    <div className="text-white text-xs font-medium">Em desenvolvimento</div>
                  </div>
                </div>
              )}

              {/* Foto do Item - Aparece se configuração habilitada */}
              {pdvConfig?.exibe_foto_item && carrinho.length > 0 && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded p-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Camera size={12} className="text-orange-400" />
                      <div className="text-xs text-orange-400 font-medium">Foto do Item</div>
                    </div>
                    {/* Foto do último item adicionado */}
                    {(() => {
                      const ultimoItem = carrinho[carrinho.length - 1];
                      const fotoItem = getFotoPrincipal(ultimoItem?.produto);
                      return (
                        <div className="space-y-1">
                          <div className="text-white text-xs font-medium truncate">
                            {ultimoItem?.produto.nome}
                          </div>
                          <div className="w-full h-20 bg-gray-900 rounded overflow-hidden">
                            {fotoItem ? (
                              <img
                                src={fotoItem.url}
                                alt={ultimoItem?.produto.nome}
                                className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={(e) => abrirGaleria(ultimoItem?.produto, e)}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package size={16} className="text-gray-700" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Opções de Faturamento - Descontos do Cliente */}
              {pedidosImportados.length === 0 && (descontosCliente.prazo.length > 0 || descontosCliente.valor.length > 0) && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Percent size={12} className="text-blue-400" />
                      <div className="text-xs text-blue-400 font-medium">Opções de Faturamento</div>
                    </div>

                    {/* Descontos por Prazo */}
                    {descontosCliente.prazo.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-400">Prazo de Faturamento</div>
                        <div className="grid grid-cols-2 gap-1">
                          {getDescontosPrazoDisponiveis().map((desconto, idx) => {
                            const isSelected = descontoPrazoSelecionado === desconto.id;
                            return (
                              <div
                                key={idx}
                                className={`p-1 rounded border cursor-pointer transition-colors text-xs ${
                                  isSelected
                                    ? 'bg-blue-500/20 border-blue-500 ring-1 ring-blue-500/50'
                                    : desconto.tipo === 'desconto'
                                      ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20'
                                      : 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
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
                                        : desconto.tipo === 'desconto' ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                      {desconto.tipo === 'desconto' ? '+' : '-'}{desconto.percentual}%
                                    </span>
                                  </div>
                                  {isSelected && (
                                    <span className="absolute right-0.5 text-xs text-blue-400">✓</span>
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
                        <div className="mt-1 pt-1 border-t border-blue-500/20">
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
                </div>
              )}

              {/* Pedidos Importados - Aparece quando há pedidos importados */}
              {pedidosImportados.length > 0 && (
                <div className="space-y-2">
                  {pedidosImportados.map((pedido, index) => (
                    <div key={pedido.id} className="bg-green-500/10 border border-green-500/30 rounded p-2">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <ShoppingBag size={12} className="text-green-400" />
                            <div className="text-xs text-green-400 font-medium">Pedido Importado</div>
                          </div>
                          <button
                            onClick={() => {
                              setPedidoParaRemover(pedido);
                              setShowConfirmRemovePedidoImportado(true);
                            }}
                            className="text-red-400 hover:text-red-300 transition-colors"
                            title="Remover pedido importado"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        <div className="text-white text-xs font-medium">#{pedido.numero}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(pedido.created_at).toLocaleDateString('pt-BR')} - {new Date(pedido.created_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        {pedido.usuario && (
                          <div className="text-xs text-gray-500">{pedido.usuario.nome}</div>
                        )}

                        {/* Opções de Faturamento do Pedido Importado */}
                        {(pedido.desconto_prazo_id || (descontosCliente.prazo.length > 0 || descontosCliente.valor.length > 0)) && (
                          <div className="border-t border-green-500/20 pt-1 mt-1">
                            <div className="flex items-center gap-1 mb-1">
                              <Percent size={10} className="text-green-400" />
                              <div className="text-xs text-green-400 font-medium">Opções de Faturamento</div>
                            </div>

                            {/* Descontos por Prazo */}
                            {descontosCliente.prazo.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-xs text-gray-400">Prazo de Faturamento</div>
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
                                              {desconto.tipo === 'desconto' ? '-' : '+'}%{desconto.percentual}
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

                            {/* Desconto por Valor (se aplicável) */}
                            {(() => {
                              const descontoValor = calcularDescontoPorValor(calcularTotal());
                              return descontoValor && (
                                <div className="mt-1 pt-1 border-t border-green-500/20">
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
                                      {descontoValor.tipo === 'desconto' ? '-' : '+'}%{descontoValor.percentual}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </motion.div>
        )}



        {/* Container das Áreas de Finalização - Agrupa primeira e segunda tela */}
        {carrinho.length > 0 && (
          <div
            className={`flex-1 transition-all duration-300`}
            style={{
              display: 'flex',
              position: 'relative',
              height: '100%',
              flexShrink: 0
            }}
          >

            {/* Área de Finalização de Venda - Primeira tela - Oculta quando segunda tela está ativa */}
            {!showFinalizacaoFinal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="w-full bg-background-card border-l border-gray-800 flex flex-col h-full transition-all duration-300"
                style={{
                  position: 'relative',
                  flexShrink: 0
                }}
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
              {/* Seção de Pagamento quando HÁ pedidos importados */}
              {pedidosImportados.length > 0 && (
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







            </div>

            {/* Área fixa de pagamento - sempre visível quando há itens - Compacta */}
            {carrinho.length > 0 && (
              <div className="p-3 bg-background-card flex-shrink-0">


                {/* Resumo da Venda - sempre presente - Compacto */}
                <div className="bg-gray-800/50 rounded p-2.5 mb-1">
                  {(() => {
                    const subtotalSemDescontos = calcularSubtotalSemDescontos(); // Subtotal sem descontos
                    const subtotal = calcularTotal(); // Total com descontos nos itens
                    const totalFinal = calcularTotalComDesconto();

                    // Calcular desconto por prazo se selecionado (baseado no subtotal com descontos nos itens)
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
                        {/* Itens - Primeiro */}
                        <div className="flex justify-between items-center text-xs mb-1.5">
                          <span className="text-white">Itens:</span>
                          <span className="text-white">{carrinho.reduce((total, item) => total + item.quantidade, 0)}</span>
                        </div>

                        {/* Subtotal - Segundo (sem descontos) */}
                        <div className="flex justify-between items-center text-xs mb-1.5">
                          <span className="text-white">Subtotal:</span>
                          <span className="text-white">{formatCurrency(subtotalSemDescontos)}</span>
                        </div>

                        {/* Área de Descontos - Só aparece se alguma configuração estiver habilitada */}
                        {(pdvConfig?.desconto_no_item || pdvConfig?.desconto_no_total) && (
                          <>
                            {/* Desconto no Item - Só aparece se configuração estiver habilitada */}
                            {pdvConfig?.desconto_no_item && (
                              <div className="flex justify-between items-center text-xs mb-1.5">
                                <span className="text-orange-400">Desconto no Item:</span>
                                <span className="text-orange-400">-{formatCurrency(calcularDescontoItens())}</span>
                              </div>
                            )}

                            {/* Desconto no Total - Só aparece se configuração estiver habilitada E desconto aplicado */}
                            {pdvConfig?.desconto_no_total && descontoGlobal > 0 && (
                              <div className="flex justify-between items-center text-xs mb-1.5">
                                <span className="text-red-400">Desconto no Total:</span>
                                <span className="text-red-400">-{formatCurrency(descontoGlobal)}</span>
                              </div>
                            )}
                          </>
                        )}

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

            {/* Área de Finalização Final - Segunda tela ocupa todo o espaço */}
            {showFinalizacaoFinal && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="w-full bg-background-card border-l border-gray-800 flex flex-col h-full"
                style={{
                  position: 'relative',
                  flexShrink: 0
                }}
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
                        onClick={() => {
                          // Proteção contra duplo clique
                          if (showProcessandoVenda) {
                            console.log('🛑 FRONTEND: Bloqueando duplo clique - venda já está sendo processada');
                            return;
                          }
                          finalizarVendaCompleta('finalizar_com_impressao');
                        }}
                        disabled={showProcessandoVenda}
                        className={`w-full py-2.5 px-3 rounded transition-colors border text-sm font-medium ${
                          showProcessandoVenda
                            ? 'bg-gray-600/20 border-gray-600/30 text-gray-500 cursor-not-allowed'
                            : 'bg-green-900/20 hover:bg-green-800/30 text-green-300 border-green-800/30'
                        }`}
                      >
                        Finalizar com Impressão ({obterTextoTipoImpressao()})
                      </button>
                    )}

                    {/* Finalizar sem Impressão */}
                    {!pdvConfig?.ocultar_finalizar_sem_impressao && (
                      <button
                        onClick={() => {
                          // Proteção contra duplo clique
                          if (showProcessandoVenda) {
                            console.log('🛑 FRONTEND: Bloqueando duplo clique - venda já está sendo processada');
                            return;
                          }
                          finalizarVendaCompleta('finalizar_sem_impressao');
                        }}
                        disabled={showProcessandoVenda}
                        className={`w-full py-2.5 px-3 rounded transition-colors border text-sm font-medium ${
                          showProcessandoVenda
                            ? 'bg-gray-600/20 border-gray-600/30 text-gray-500 cursor-not-allowed'
                            : 'bg-green-800/20 hover:bg-green-700/30 text-green-400 border-green-700/30'
                        }`}
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
                        // Proteção contra duplo clique
                        if (showProcessandoVenda) {
                          console.log('🛑 FRONTEND: Bloqueando duplo clique - venda já está sendo processada');
                          return;
                        }
                        finalizarVendaCompleta('nfce_com_impressao');
                      }}
                      disabled={isDocumentoInvalido() || showProcessandoVenda}
                      className={`w-full py-2.5 px-3 rounded transition-colors border text-sm font-medium ${
                        isDocumentoInvalido() || showProcessandoVenda
                          ? 'bg-gray-600/20 border-gray-600/30 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-900/20 hover:bg-blue-800/30 text-blue-300 border-blue-800/30'
                      }`}
                    >
                      <div>NFC-e com Impressão ({obterTextoTipoImpressao()})</div>
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
                        // Proteção contra duplo clique
                        if (showProcessandoVenda) {
                          console.log('🛑 FRONTEND: Bloqueando duplo clique - venda já está sendo processada');
                          return;
                        }
                        finalizarVendaCompleta('nfce_sem_impressao');
                      }}
                      disabled={isDocumentoInvalido() || showProcessandoVenda}
                      className={`w-full py-2.5 px-3 rounded transition-colors border text-sm font-medium ${
                        isDocumentoInvalido() || showProcessandoVenda
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

                  {/* NFC-e + Produção - OCULTO POR PADRÃO */}
                  {false && !pdvConfig?.ocultar_nfce_producao && (
                    <button
                      onClick={() => {
                        if (isDocumentoInvalido()) {
                          toast.error('CPF/CNPJ inválido. Corrija o documento para emitir NFC-e.');
                          return;
                        }
                        // Proteção contra duplo clique
                        if (showProcessandoVenda) {
                          console.log('🛑 FRONTEND: Bloqueando duplo clique - venda já está sendo processada');
                          return;
                        }
                        finalizarVendaCompleta('nfce_producao');
                      }}
                      disabled={isDocumentoInvalido() || showProcessandoVenda}
                      className={`w-full py-2.5 px-3 rounded transition-colors border text-sm font-medium ${
                        isDocumentoInvalido() || showProcessandoVenda
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
                    {/* Produção - OCULTO POR PADRÃO */}
                    {false && !pdvConfig?.ocultar_producao && (
                      <button
                        onClick={() => {
                          // Proteção contra duplo clique
                          if (showProcessandoVenda) {
                            console.log('🛑 FRONTEND: Bloqueando duplo clique - venda já está sendo processada');
                            return;
                          }
                          finalizarVendaCompleta('producao');
                        }}
                        disabled={showProcessandoVenda}
                        className={`w-full py-2.5 px-3 rounded transition-colors border text-sm font-medium ${
                          showProcessandoVenda
                            ? 'bg-gray-600/20 border-gray-600/30 text-gray-500 cursor-not-allowed'
                            : 'bg-orange-900/20 hover:bg-orange-800/30 text-orange-300 border-orange-800/30'
                        }`}
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
                      // Carregar descontos do cliente selecionado
                      carregarDescontosCliente(cliente.id);

                      // ✅ NOVO: Preencher automaticamente CPF/CNPJ na Nota Fiscal Paulista
                      if (cliente.documento && cliente.documento.trim()) {
                        const documentoLimpo = cliente.documento.replace(/\D/g, '');
                        if (documentoLimpo.length === 11) {
                          // CPF
                          setTipoDocumento('cpf');
                          setCpfCnpjNota(formatCpf(documentoLimpo));
                          setClienteEncontrado(cliente);
                          console.log('🎯 PDV: CPF do cliente preenchido automaticamente na Nota Fiscal Paulista:', formatCpf(documentoLimpo));
                        } else if (documentoLimpo.length === 14) {
                          // CNPJ
                          setTipoDocumento('cnpj');
                          setCpfCnpjNota(formatCnpj(documentoLimpo));
                          setClienteEncontrado(cliente);
                          console.log('🎯 PDV: CNPJ do cliente preenchido automaticamente na Nota Fiscal Paulista:', formatCnpj(documentoLimpo));
                        }
                        setErroValidacao(''); // Limpar qualquer erro anterior
                      }
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

                <div className={`grid gap-3 ${pdvConfig?.fiado ? 'grid-cols-2' : 'grid-cols-3'}`}>
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
                  {/* ✅ NOVO: Botão Fiado controlado pela configuração PDV */}
                  {pdvConfig?.fiado && (
                    <button className="bg-orange-500/20 border border-orange-500/30 text-orange-400 p-4 rounded-lg hover:bg-orange-500/30 transition-colors flex flex-col items-center gap-2">
                      <Receipt size={24} />
                      <span className="font-medium">Fiado</span>
                    </button>
                  )}
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
                    // Proteção contra duplo clique
                    if (showProcessandoVenda) {
                      console.log('🛑 FRONTEND: Bloqueando duplo clique - venda já está sendo processada');
                      return;
                    }
                    setShowPagamentoModal(false);
                    finalizarVendaCompleta('finalizar_sem_impressao');
                  }}
                  disabled={showProcessandoVenda}
                  className={`flex-1 py-3 px-4 rounded-lg transition-colors ${
                    showProcessandoVenda
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-primary-500 hover:bg-primary-600 text-white'
                  }`}
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

      {/* Modal de Venda sem Produto */}
      <AnimatePresence>
        {showVendaSemProdutoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowVendaSemProdutoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background-card border border-gray-800 rounded-lg p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Venda sem Produto</h3>
                <button
                  onClick={() => setShowVendaSemProdutoModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Descrição
                  </label>
                  <input
                    type="text"
                    value={descricaoVendaSemProduto}
                    onChange={(e) => setDescricaoVendaSemProduto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        // Focar no campo valor quando pressionar Enter na descrição
                        valorVendaSemProdutoRef.current?.focus();
                      }
                    }}
                    placeholder="Digite a descrição do produto..."
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Valor (R$)
                  </label>
                  <input
                    ref={valorVendaSemProdutoRef}
                    type="number"
                    step="0.01"
                    min="0"
                    value={valorVendaSemProduto}
                    onChange={(e) => setValorVendaSemProduto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        // Verificar se os campos estão preenchidos antes de adicionar
                        if (descricaoVendaSemProduto.trim() && valorVendaSemProduto && parseFloat(valorVendaSemProduto) > 0) {
                          // Usar a nova função que verifica vendedor e quantidade
                          adicionarVendaSemProdutoComVerificacoes(descricaoVendaSemProduto.trim(), parseFloat(valorVendaSemProduto));
                          setDescricaoVendaSemProduto('');
                          setValorVendaSemProduto('');
                          setShowVendaSemProdutoModal(false);
                        } else {
                          toast.error('Preencha todos os campos corretamente');
                        }
                      }
                    }}
                    placeholder="0,00"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowVendaSemProdutoModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (descricaoVendaSemProduto.trim() && valorVendaSemProduto && parseFloat(valorVendaSemProduto) > 0) {
                        // Usar a nova função que verifica vendedor e quantidade
                        adicionarVendaSemProdutoComVerificacoes(descricaoVendaSemProduto.trim(), parseFloat(valorVendaSemProduto));
                        setDescricaoVendaSemProduto('');
                        setValorVendaSemProduto('');
                        setShowVendaSemProdutoModal(false);
                      } else {
                        toast.error('Preencha todos os campos corretamente');
                      }
                    }}
                    disabled={!descricaoVendaSemProduto.trim() || !valorVendaSemProduto || parseFloat(valorVendaSemProduto) <= 0}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    Adicionar
                  </button>
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
                      {(filtroStatus !== 'todas' || filtroNfce !== 'todas' || filtroDataInicio || filtroDataFim || filtroNumeroVenda || filtroNumeroPedido) && (
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

                      {/* ✅ NOVO: Filtros por NFC-e */}
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">NFC-e</label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: 'todas', label: 'Todas as vendas', icon: '📋' },
                            { value: 'pendentes', label: 'NFC-e Pendentes', icon: '⏳' },
                            { value: 'autorizadas', label: 'NFC-e Autorizadas', icon: '✅' },
                            { value: 'canceladas', label: 'NFC-e Canceladas', icon: '❌' }
                          ].map((nfce) => (
                            <button
                              key={nfce.value}
                              onClick={() => {
                                setFiltroNfce(nfce.value as any);
                                // Aplicar filtro imediatamente
                                setTimeout(() => loadVendas(), 100);
                              }}
                              className={`px-3 py-1 rounded-lg text-xs transition-colors flex items-center gap-1 ${
                                filtroNfce === nfce.value
                                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                              }`}
                            >
                              <span>{nfce.icon}</span>
                              {nfce.label}
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
                            setFiltroNfce('todas'); // ✅ NOVO: Limpar filtro de NFC-e
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

                          {/* Tags de Origem e Status Fiscal */}
                          <div className="flex flex-wrap gap-1">
                            {/* Tag de Origem */}
                            {venda.pedidos_origem && venda.pedidos_origem.length > 0 ? (
                              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full border border-blue-500/30">
                                {venda.pedidos_origem.length === 1
                                  ? `Pedido #${venda.pedidos_origem[0]}`
                                  : `${venda.pedidos_origem.length} Pedidos`
                                }
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full border border-green-500/30">
                                Venda Direta
                              </span>
                            )}

                            {/* ✅ Tag NFC-e - Quando tentou emitir NFC-e */}
                            {venda.tentativa_nfce && (
                              <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs font-medium rounded-full border border-purple-500/30">
                                {venda.numero_documento ? `NFC-e #${venda.numero_documento}` : 'NFC-e'}
                              </span>
                            )}

                            {/* ✅ Tag Pendente - Quando há erro fiscal */}
                            {venda.status_fiscal === 'pendente' && (
                              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full border border-yellow-500/30 animate-pulse">
                                Pendente
                              </span>
                            )}

                            {/* ✅ Tag Autorizada - Quando NFC-e foi autorizada */}
                            {venda.status_fiscal === 'autorizada' && (
                              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full border border-green-500/30">
                                Autorizada
                              </span>
                            )}

                            {/* ✅ NOVO: Tag Cancelada Fiscalmente - Quando NFC-e foi cancelada na SEFAZ */}
                            {venda.status_fiscal === 'cancelada' && venda.modelo_documento === 65 && (
                              <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded-full border border-red-500/30">
                                NFC-e Cancelada
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
                            <div className="space-y-1">
                              {/* ✅ NOVO: Mostrar documento quando disponível */}
                              {venda.cliente.documento && (
                                <div className="text-xs text-gray-500 truncate">
                                  {venda.cliente.documento.length === 11 ? 'CPF' : 'CNPJ'}: {venda.cliente.documento}
                                </div>
                              )}
                              <div className="text-sm text-gray-400 truncate">
                                Cliente: {venda.cliente.nome}
                              </div>
                            </div>
                          ) : venda.documento_cliente ? (
                            <div className="space-y-1">
                              {/* ✅ NOVO: Mostrar documento mesmo sem nome do cliente */}
                              <div className="text-xs text-gray-500 truncate">
                                {venda.documento_cliente.length === 11 ? 'CPF' : 'CNPJ'}: {venda.documento_cliente}
                              </div>
                              <div className="text-sm text-gray-400">
                                Cliente: Consumidor Final
                              </div>
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
                          {/* Informações dos Vendedores */}
                          {venda.vendedores_venda && venda.vendedores_venda.length > 0 && (
                            <div className="text-xs text-gray-500 truncate">
                              Vendedor{venda.vendedores_venda.length > 1 ? 'es' : ''}: {
                                venda.vendedores_venda.map(v => v.nome).join(', ')
                              }
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
                                    {pagamento.parcelas && pagamento.parcelas > 1 && ` (${pagamento.parcelas}x)`}
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
                        {(venda.status_venda === 'cancelada' || venda.status_fiscal === 'cancelada') && (
                          <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <div className="text-xs text-red-400 font-medium mb-1">
                              🚫 {venda.status_fiscal === 'cancelada' && venda.modelo_documento === 65 ? 'NFC-e Cancelada' : 'Cancelada'}
                            </div>
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
                            {/* ✅ NOVO: Informações específicas do cancelamento fiscal */}
                            {venda.status_fiscal === 'cancelada' && venda.modelo_documento === 65 && venda.protocolo_cancelamento && (
                              <div className="text-xs text-gray-400 truncate">
                                Protocolo: {venda.protocolo_cancelamento}
                              </div>
                            )}
                            {venda.status_fiscal === 'cancelada' && venda.modelo_documento === 65 && venda.cancelada_em && (
                              <div className="text-xs text-gray-400 truncate">
                                Data: {new Date(venda.cancelada_em).toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Botões de Ação */}
                        <div className="flex flex-col gap-2 mt-auto">
                          <button
                            onClick={async () => {
                              setVendaParaExibirItens(venda);
                              setShowItensVendaModal(true);
                              carregarItensVenda(venda.id);
                              // ✅ NOVO: Carregar próximo número da NFC-e se for venda sem NFC-e
                              if (!venda.tentativa_nfce && venda.status_venda === 'finalizada') {
                                // Aguardar um pouco para garantir que o modal abriu
                                setTimeout(() => {
                                  carregarProximoNumeroNfceModal();
                                }, 100);
                              }
                            }}
                            className="w-full px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded text-xs transition-colors font-medium border border-blue-600/30 hover:border-blue-600/50"
                          >
                            Exibir Itens
                          </button>

                          {/* ✅ NOVO: Botão Editar NFC-e para vendas pendentes */}
                          {venda.status_fiscal === 'pendente' && venda.tentativa_nfce && (
                            <button
                              onClick={async () => {
                                setVendaParaEditarNfce(venda);
                                setShowEditarNfceModal(true);
                                carregarItensParaEdicaoNfce(venda.id);

                                // ✅ NOVO: Carregar série da NFC-e do usuário logado
                                try {
                                  const { data: userData } = await supabase.auth.getUser();
                                  if (userData.user) {
                                    const { data: usuarioData } = await supabase
                                      .from('usuarios')
                                      .select('serie_nfce')
                                      .eq('id', userData.user.id)
                                      .single();

                                    if (usuarioData?.serie_nfce) {
                                      setSerieNfce(usuarioData.serie_nfce);
                                    } else {
                                      setSerieNfce(1); // Fallback para série 1
                                    }
                                  }
                                } catch (error) {
                                  console.error('Erro ao carregar série NFC-e do usuário:', error);
                                  setSerieNfce(1); // Fallback para série 1
                                }
                              }}
                              className="w-full px-3 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 rounded text-xs transition-colors font-medium border border-yellow-600/30 hover:border-yellow-600/50"
                            >
                              Editar NFC-e
                            </button>
                          )}

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

                          {/* ✅ NOVO: Botão Reimprimir Cupom */}
                          {venda.status_venda === 'finalizada' && (
                            <button
                              onClick={() => reimprimirCupom(venda)}
                              className="w-full px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded text-xs transition-colors font-medium border border-purple-600/30 hover:border-purple-600/50 flex items-center justify-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                              Reimprimir Cupom ({obterTextoTipoImpressao()})
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

                {/* ✅ NOVO: Informações específicas para NFC-e */}
                {vendaParaCancelar.modelo_documento === 65 && vendaParaCancelar.status_fiscal === 'autorizada' && (
                  <div className="mt-3 p-2 bg-yellow-900/30 border border-yellow-600/30 rounded">
                    <div className="text-yellow-400 text-xs font-medium mb-1">⚠️ CANCELAMENTO FISCAL NFC-e</div>
                    <div className="text-xs text-yellow-300">
                      • Prazo: 15 minutos da emissão<br/>
                      • Será cancelada na SEFAZ<br/>
                      • Chave: {vendaParaCancelar.chave_nfe?.substring(0, 20)}...
                    </div>
                  </div>
                )}

                {vendaParaCancelar.modelo_documento === 65 && vendaParaCancelar.status_fiscal !== 'autorizada' && (
                  <div className="mt-3 p-2 bg-blue-900/30 border border-blue-600/30 rounded">
                    <div className="text-blue-400 text-xs font-medium mb-1">ℹ️ CANCELAMENTO APENAS NO SISTEMA</div>
                    <div className="text-xs text-blue-300">
                      NFC-e não autorizada - cancelamento apenas local
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Motivo do Cancelamento *
                </label>
                <div className="relative">
                  <textarea
                    value={motivoCancelamento}
                    onChange={(e) => setMotivoCancelamento(e.target.value)}
                    placeholder="Informe o motivo do cancelamento (mínimo 15 caracteres)..."
                    className={`w-full bg-gray-800/50 border rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-1 resize-none pr-16 ${
                      motivoCancelamento.length >= 15
                        ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                        : 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                    }`}
                    rows={3}
                    maxLength={255}
                  />

                  {/* Contador de caracteres */}
                  <div className="absolute bottom-2 right-2 text-xs font-medium pointer-events-none">
                    <span className={`${
                      motivoCancelamento.length >= 15
                        ? 'text-green-400'
                        : 'text-red-400'
                    }`}>
                      {motivoCancelamento.length}
                    </span>
                    <span className="text-gray-500">/15</span>
                  </div>
                </div>

                {/* Indicador visual do status */}
                <div className="mt-2 flex items-center text-xs">
                  {motivoCancelamento.length >= 15 ? (
                    <div className="flex items-center text-green-400">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Motivo válido para cancelamento
                    </div>
                  ) : (
                    <div className="flex items-center text-red-400">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Mínimo de 15 caracteres obrigatório (faltam {15 - motivoCancelamento.length})
                    </div>
                  )}
                </div>
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
                  disabled={motivoCancelamento.length < 15}
                  className={`flex-1 py-3 px-4 rounded-lg transition-colors font-medium ${
                    motivoCancelamento.length >= 15
                      ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {motivoCancelamento.length >= 15 ? 'Confirmar Cancelamento' : `Faltam ${15 - motivoCancelamento.length} caracteres`}
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
            onClick={fecharModalItens}
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
                    onClick={fecharModalItens}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* ✅ NOVO: Seção para emitir NFC-e (apenas para vendas que não são NFC-e) */}
                {!vendaParaExibirItens.tentativa_nfce && vendaParaExibirItens.status_venda === 'finalizada' && (
                  <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h4 className="text-green-400 font-medium">Emitir NFC-e</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      {/* Tipo de Documento */}
                      <div>
                        <label className="block text-green-300 text-xs font-medium mb-2">
                          Tipo de Documento (Opcional)
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setTipoDocumentoModalItens('cpf');
                              setCpfCnpjModalItens('');
                              setErroValidacaoModalItens('');
                            }}
                            className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors ${
                              tipoDocumentoModalItens === 'cpf'
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            CPF
                          </button>
                          <button
                            onClick={() => {
                              setTipoDocumentoModalItens('cnpj');
                              setCpfCnpjModalItens('');
                              setErroValidacaoModalItens('');
                            }}
                            className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors ${
                              tipoDocumentoModalItens === 'cnpj'
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            CNPJ
                          </button>
                        </div>
                      </div>

                      {/* Campo CPF/CNPJ */}
                      <div>
                        <label className="block text-green-300 text-xs font-medium mb-2">
                          {tipoDocumentoModalItens === 'cpf' ? 'CPF' : 'CNPJ'} (Opcional)
                        </label>
                        <input
                          type="text"
                          value={cpfCnpjModalItens}
                          onChange={(e) => {
                            handleCpfCnpjModalItensChange(e.target.value);
                            if (erroValidacaoModalItens) {
                              setErroValidacaoModalItens('');
                            }
                          }}
                          onBlur={validarDocumentoModalItensOnBlur}
                          placeholder={tipoDocumentoModalItens === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
                          className={`w-full bg-gray-800/50 border rounded py-1.5 px-2 text-sm text-white focus:outline-none focus:ring-1 transition-colors ${
                            erroValidacaoModalItens
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                              : 'border-gray-700 focus:border-green-500 focus:ring-green-500/20'
                          }`}
                        />
                        {erroValidacaoModalItens && (
                          <div className="mt-1 text-xs text-red-400 flex items-center gap-1">
                            <span>⚠️</span>
                            <span>{erroValidacaoModalItens}</span>
                          </div>
                        )}
                      </div>

                      {/* ✅ NOVO: Campo Número da NFC-e */}
                      <div>
                        <label className="block text-green-300 text-xs font-medium mb-1">
                          Número da NFC-e
                        </label>
                        <div className="text-xs text-gray-400 mb-1">
                          Será usado na emissão da NFC-e
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={numeroNfceModalItens}
                            onChange={(e) => setNumeroNfceModalItens(e.target.value)}
                            placeholder="Próximo número"
                            min="1"
                            className="flex-1 bg-gray-800/50 border border-gray-700 rounded py-1.5 px-2 text-sm text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/20 transition-colors"
                          />
                          {loadingProximoNumero && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-400"></div>
                          )}
                        </div>
                      </div>

                      {/* Botão Emitir */}
                      <div>
                        <button
                          onClick={emitirNfceModalItens}
                          disabled={emitindoNfceModalItens || isDocumentoModalItensInvalido()}
                          className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                            emitindoNfceModalItens || isDocumentoModalItensInvalido()
                              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {emitindoNfceModalItens ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Emitindo...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Emitir NFC-e
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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
                    {/* ✅ NOVO: Tabela de itens com dados fiscais editáveis (apenas para vendas sem NFC-e) */}
                    {!vendaParaExibirItens.tentativa_nfce && vendaParaExibirItens.status_venda === 'finalizada' && (
                      <div className="bg-gray-800/30 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-lg font-medium text-white flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Dados Fiscais (Editáveis para NFC-e)
                          </h4>
                          {itensVenda.length > 0 && (
                            <button
                              onClick={handleAtualizarDadosProdutosNfce}
                              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                              title="Atualizar dados fiscais dos produtos com informações do cadastro"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                                <path d="M21 3v5h-5"/>
                                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                                <path d="M3 21v-5h5"/>
                              </svg>
                              Atualizar dados dos produtos
                            </button>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm mb-4">
                          Revise e corrija os dados fiscais dos produtos. Clique no ícone de lápis para editar os campos CFOP, NCM, CEST, Margem, Aliquota, CST ou CSOSN.
                        </p>

                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-700">
                                <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">Item</th>
                                <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">Código</th>
                                <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">Nome</th>
                                <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">Qtd</th>
                                <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">Preço</th>
                                <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">NCM</th>
                                <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">CFOP</th>
                                <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">CEST</th>
                                <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">Margem</th>
                                <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">Aliquota</th>
                                <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">
                                  {itensVenda[0]?.regime_tributario === 1 ? 'CSOSN' : 'CST'}
                                </th>
                                <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">Unidade</th>
                                <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">Vendedor</th>
                              </tr>
                            </thead>
                            <tbody>
                              {itensVenda.map((item, index) => (
                                <tr key={item.id} className="border-b border-gray-800/50">
                                  <td className="py-3 px-2 text-white font-medium">{index + 1}</td>
                                  <td className="py-3 px-2 text-gray-300">{item.produto?.codigo || item.codigo_produto}</td>
                                  <td className="py-3 px-2 text-white">{item.nome_produto}</td>
                                  <td className="py-3 px-2 text-gray-300">{item.quantidade}</td>
                                  <td className="py-3 px-2 text-white">{formatCurrency(item.valor_unitario)}</td>

                                  {/* NCM */}
                                  <td className="py-3 px-2">
                                    <div className="flex items-center gap-2">
                                      {item.editando_ncm ? (
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="text"
                                            value={item.ncm_editavel}
                                            onChange={(e) => {
                                              const novoValor = e.target.value.replace(/\D/g, ''); // Só números
                                              setItensVenda(prev => prev.map((it, idx) =>
                                                idx === index ? { ...it, ncm_editavel: novoValor } : it
                                              ));
                                            }}
                                            className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                                            maxLength={8}
                                            placeholder="00000000"
                                          />
                                          <button
                                            onClick={() => salvarEdicaoCampoModalItens(index, 'ncm', item.ncm_editavel)}
                                            className="text-green-400 hover:text-green-300"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={() => cancelarEdicaoCampoModalItens(index, 'ncm')}
                                            className="text-red-400 hover:text-red-300"
                                          >
                                            <X size={16} />
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <span className="text-white font-mono text-sm">{item.ncm_editavel || '00000000'}</span>
                                          <button
                                            onClick={() => habilitarEdicaoCampoModalItens(index, 'ncm')}
                                            className="text-gray-400 hover:text-white"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </td>

                                  {/* CFOP */}
                                  <td className="py-3 px-2">
                                    <div className="flex items-center gap-2">
                                      {item.editando_cfop ? (
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="text"
                                            value={item.cfop_editavel}
                                            onChange={(e) => {
                                              const novoValor = e.target.value;
                                              setItensVenda(prev => prev.map((it, idx) =>
                                                idx === index ? { ...it, cfop_editavel: novoValor } : it
                                              ));
                                            }}
                                            className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                                            maxLength={4}
                                          />
                                          <button
                                            onClick={() => salvarEdicaoCampoModalItens(index, 'cfop', item.cfop_editavel)}
                                            className="text-green-400 hover:text-green-300"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={() => cancelarEdicaoCampoModalItens(index, 'cfop')}
                                            className="text-red-400 hover:text-red-300"
                                          >
                                            <X size={16} />
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <span className="text-white">{item.cfop_editavel || '-'}</span>
                                          <button
                                            onClick={() => habilitarEdicaoCampoModalItens(index, 'cfop')}
                                            className="text-gray-400 hover:text-white"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </td>

                                  {/* CEST */}
                                  <td className="py-3 px-2">
                                    <div className="flex items-center gap-2">
                                      {item.editando_cest ? (
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="text"
                                            value={item.cest_editavel}
                                            onChange={(e) => {
                                              const novoValor = e.target.value.replace(/\D/g, ''); // Só números
                                              setItensVenda(prev => prev.map((it, idx) =>
                                                idx === index ? { ...it, cest_editavel: novoValor } : it
                                              ));
                                            }}
                                            className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                                            maxLength={7}
                                            placeholder="0000000"
                                          />
                                          <button
                                            onClick={() => salvarEdicaoCampoModalItens(index, 'cest', item.cest_editavel)}
                                            className="text-green-400 hover:text-green-300"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={() => cancelarEdicaoCampoModalItens(index, 'cest')}
                                            className="text-red-400 hover:text-red-300"
                                          >
                                            <X size={16} />
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <span className="text-white font-mono text-sm">{item.cest_editavel || '-'}</span>
                                          <button
                                            onClick={() => habilitarEdicaoCampoModalItens(index, 'cest')}
                                            className="text-gray-400 hover:text-white"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </td>

                                  {/* Margem ST */}
                                  <td className="py-3 px-2">
                                    <div className="flex items-center gap-2">
                                      {item.editando_margem_st ? (
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="number"
                                            value={item.margem_st_editavel}
                                            onChange={(e) => {
                                              const novoValor = e.target.value;
                                              setItensVenda(prev => prev.map((it, idx) =>
                                                idx === index ? { ...it, margem_st_editavel: novoValor } : it
                                              ));
                                            }}
                                            className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            placeholder="0.00"
                                          />
                                          <span className="text-gray-400 text-xs">%</span>
                                          <button
                                            onClick={() => salvarEdicaoCampoModalItens(index, 'margem_st', item.margem_st_editavel)}
                                            className="text-green-400 hover:text-green-300"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={() => cancelarEdicaoCampoModalItens(index, 'margem_st')}
                                            className="text-red-400 hover:text-red-300"
                                          >
                                            <X size={16} />
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <span className="text-white">{item.margem_st_editavel ? `${item.margem_st_editavel}%` : '-'}</span>
                                          <button
                                            onClick={() => habilitarEdicaoCampoModalItens(index, 'margem_st')}
                                            className="text-gray-400 hover:text-white"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </td>

                                  {/* Aliquota ICMS */}
                                  <td className="py-3 px-2">
                                    <div className="flex items-center gap-2">
                                      {item.editando_aliquota_icms ? (
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="number"
                                            value={item.aliquota_icms_editavel}
                                            onChange={(e) => {
                                              const novoValor = e.target.value;
                                              setItensVenda(prev => prev.map((it, idx) =>
                                                idx === index ? { ...it, aliquota_icms_editavel: novoValor } : it
                                              ));
                                            }}
                                            className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            placeholder="0.00"
                                          />
                                          <span className="text-gray-400 text-xs">%</span>
                                          <button
                                            onClick={() => salvarEdicaoCampoModalItens(index, 'aliquota_icms', item.aliquota_icms_editavel)}
                                            className="text-green-400 hover:text-green-300"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={() => cancelarEdicaoCampoModalItens(index, 'aliquota_icms')}
                                            className="text-red-400 hover:text-red-300"
                                          >
                                            <X size={16} />
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <span className="text-white">{item.aliquota_icms_editavel ? `${item.aliquota_icms_editavel}%` : '-'}</span>
                                          <button
                                            onClick={() => habilitarEdicaoCampoModalItens(index, 'aliquota_icms')}
                                            className="text-gray-400 hover:text-white"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </td>

                                  {/* CST/CSOSN */}
                                  <td className="py-3 px-2">
                                    <div className="flex items-center gap-2">
                                      {item.regime_tributario === 1 ? (
                                        // CSOSN para Simples Nacional
                                        item.editando_csosn ? (
                                          <div className="flex items-center gap-1">
                                            <input
                                              type="text"
                                              value={item.csosn_editavel}
                                              onChange={(e) => {
                                                const novoValor = e.target.value;
                                                setItensVenda(prev => prev.map((it, idx) =>
                                                  idx === index ? { ...it, csosn_editavel: novoValor } : it
                                                ));
                                              }}
                                              className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                                              maxLength={3}
                                            />
                                            <button
                                              onClick={() => salvarEdicaoCampoModalItens(index, 'csosn', item.csosn_editavel)}
                                              className="text-green-400 hover:text-green-300"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                              </svg>
                                            </button>
                                            <button
                                              onClick={() => cancelarEdicaoCampoModalItens(index, 'csosn')}
                                              className="text-red-400 hover:text-red-300"
                                            >
                                              <X size={16} />
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2">
                                            <span className="text-white">{item.csosn_editavel || '-'}</span>
                                            <button
                                              onClick={() => habilitarEdicaoCampoModalItens(index, 'csosn')}
                                              className="text-gray-400 hover:text-white"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                              </svg>
                                            </button>
                                          </div>
                                        )
                                      ) : (
                                        // CST para Lucro Real/Presumido
                                        item.editando_cst ? (
                                          <div className="flex items-center gap-1">
                                            <input
                                              type="text"
                                              value={item.cst_editavel}
                                              onChange={(e) => {
                                                const novoValor = e.target.value;
                                                setItensVenda(prev => prev.map((it, idx) =>
                                                  idx === index ? { ...it, cst_editavel: novoValor } : it
                                                ));
                                              }}
                                              className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                                              maxLength={3}
                                            />
                                            <button
                                              onClick={() => salvarEdicaoCampoModalItens(index, 'cst', item.cst_editavel)}
                                              className="text-green-400 hover:text-green-300"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                              </svg>
                                            </button>
                                            <button
                                              onClick={() => cancelarEdicaoCampoModalItens(index, 'cst')}
                                              className="text-red-400 hover:text-red-300"
                                            >
                                              <X size={16} />
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2">
                                            <span className="text-white">{item.cst_editavel || '-'}</span>
                                            <button
                                              onClick={() => habilitarEdicaoCampoModalItens(index, 'cst')}
                                              className="text-gray-400 hover:text-white"
                                            >
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                              </svg>
                                            </button>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </td>

                                  {/* Unidade */}
                                  <td className="py-3 px-2 text-gray-300">{item.produto?.unidade_medida?.sigla || 'UN'}</td>

                                  {/* Vendedor */}
                                  <td className="py-3 px-2 text-gray-300">
                                    {item.vendedor_nome || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* ✅ Listagem tradicional para vendas que já têm NFC-e ou não são finalizadas */}
                    {(vendaParaExibirItens.tentativa_nfce || vendaParaExibirItens.status_venda !== 'finalizada') && itensVenda.map((item, index) => (
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
                            {item.vendedor_nome && (
                              <p className="text-xs text-green-400">Vendedor: {item.vendedor_nome}</p>
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

                {/* ✅ NOVO: Seção de Vendedores da Venda */}
                {!loadingItensVenda && itensVenda.length > 0 && (() => {
                  // Buscar vendedores únicos dos itens
                  const vendedoresUnicos = new Map();

                  itensVenda.forEach(item => {
                    if (item.vendedor_id && item.vendedor_nome) {
                      vendedoresUnicos.set(item.vendedor_id, item.vendedor_nome);
                    }
                  });

                  const vendedoresArray = Array.from(vendedoresUnicos.values());

                  if (vendedoresArray.length > 0) {
                    return (
                      <div className="mt-6 p-4 bg-gray-800/30 rounded-lg">
                        <h4 className="text-lg font-medium text-white mb-4">
                          Vendedor{vendedoresArray.length > 1 ? 'es' : ''} da Venda
                        </h4>
                        <div className="text-white">
                          {vendedoresArray.join(', ')}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* ✅ NOVO: Seção de Totais da Venda */}
                {!loadingItensVenda && itensVenda.length > 0 && (
                  <div className="mt-6 p-4 bg-gray-800/30 rounded-lg">
                    <h4 className="text-lg font-medium text-white mb-4">Resumo da Venda</h4>

                    {(() => {
                      // Calcular subtotal sem descontos (preço original * quantidade)
                      const subtotalSemDescontos = itensVenda.reduce((total, item) => {
                        // ✅ CORRIGIDO: Usar valor_unitario * quantidade para garantir o valor original
                        const valorOriginal = item.valor_unitario * item.quantidade;
                        return total + valorOriginal;
                      }, 0);

                      // Calcular total com descontos aplicados nos itens
                      const totalComDescontosItens = itensVenda.reduce((total, item) => {
                        return total + (item.valor_total_item || 0);
                      }, 0);

                      // Usar os valores de desconto que já vêm da venda, ou calcular dinamicamente
                      let descontoItens = vendaParaExibirItens.valor_desconto_itens || 0;
                      let descontoTotal = vendaParaExibirItens.valor_desconto_total || 0;
                      const descontoPrazo = vendaParaExibirItens.valor_desconto || 0;

                      // ✅ NOVO: Para vendas antigas, calcular descontos dinamicamente
                      if (descontoItens === 0 && descontoTotal === 0) {
                        // Calcular desconto nos itens (diferença entre subtotal original e total com desconto)
                        descontoItens = Math.max(0, subtotalSemDescontos - totalComDescontosItens);

                        // Calcular desconto no total (diferença entre total dos itens e valor final da venda)
                        const valorFinalVenda = vendaParaExibirItens.valor_total || vendaParaExibirItens.valor_final || 0;
                        const totalAposDescontoItens = totalComDescontosItens - descontoPrazo; // Remover desconto por prazo
                        descontoTotal = Math.max(0, totalAposDescontoItens - valorFinalVenda);
                      }

                      return (
                        <div className="space-y-2">
                          {/* Itens */}
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-white">Itens:</span>
                            <span className="text-white">{itensVenda.reduce((total, item) => total + item.quantidade, 0)}</span>
                          </div>

                          {/* Subtotal */}
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-white">Subtotal:</span>
                            <span className="text-white">{formatCurrency(subtotalSemDescontos)}</span>
                          </div>

                          {/* Área de Descontos */}
                          {(descontoItens > 0 || descontoTotal > 0 || descontoPrazo > 0) && (
                            <>
                              {/* Desconto no Item */}
                              {descontoItens > 0 && (
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-orange-400">Desconto no Item:</span>
                                  <span className="text-orange-400">-{formatCurrency(descontoItens)}</span>
                                </div>
                              )}

                              {/* Desconto no Total */}
                              {descontoTotal > 0 && (
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-red-400">Desconto no Total:</span>
                                  <span className="text-red-400">-{formatCurrency(descontoTotal)}</span>
                                </div>
                              )}

                              {/* Desconto por Prazo/Valor */}
                              {descontoPrazo > 0 && (
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-yellow-400">Desconto por Prazo:</span>
                                  <span className="text-yellow-400">-{formatCurrency(descontoPrazo)}</span>
                                </div>
                              )}
                            </>
                          )}

                          {/* Linha separadora */}
                          <div className="border-t border-gray-700 my-3"></div>

                          {/* Total da Venda */}
                          <div className="flex justify-between items-center text-lg font-bold">
                            <span className="text-white">Total da Venda:</span>
                            <span className="text-primary-400">{formatCurrency(vendaParaExibirItens.valor_total || vendaParaExibirItens.valor_final)}</span>
                          </div>

                          {/* ✅ NOVO: Formas de Pagamento */}
                          {(vendaParaExibirItens.tipo_pagamento || vendaParaExibirItens.forma_pagamento_id || vendaParaExibirItens.formas_pagamento) && (
                            <>
                              {/* Linha separadora */}
                              <div className="border-t border-gray-700 my-3"></div>

                              <div className="text-sm font-medium text-gray-300 mb-2">Formas de Pagamento:</div>

                              {/* Pagamento à vista */}
                              {vendaParaExibirItens.tipo_pagamento === 'vista' && vendaParaExibirItens.forma_pagamento_id && (
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-gray-300">
                                    {(() => {
                                      const forma = formasPagamento.find(f => f.id === vendaParaExibirItens.forma_pagamento_id);
                                      return forma ? forma.nome : 'Forma de Pagamento';
                                    })()}:
                                  </span>
                                  <span className="text-white">{formatCurrency(vendaParaExibirItens.valor_pago || vendaParaExibirItens.valor_total)}</span>
                                </div>
                              )}

                              {/* Pagamento parcial */}
                              {vendaParaExibirItens.tipo_pagamento === 'parcial' && vendaParaExibirItens.formas_pagamento && (
                                <>
                                  {vendaParaExibirItens.formas_pagamento.map((pag: any, index: number) => {
                                    const forma = formasPagamento.find(f => f.id === pag.forma);
                                    return (
                                      <div key={index} className="flex justify-between items-center text-sm">
                                        <span className="text-gray-300">{forma ? forma.nome : 'Forma de Pagamento'}:</span>
                                        <span className="text-white">{formatCurrency(pag.valor)}</span>
                                      </div>
                                    );
                                  })}
                                </>
                              )}

                              {/* Troco */}
                              {vendaParaExibirItens.valor_troco && vendaParaExibirItens.valor_troco > 0 && (
                                <div className="flex justify-between items-center text-sm font-medium">
                                  <span className="text-green-400">TROCO:</span>
                                  <span className="text-green-400">{formatCurrency(vendaParaExibirItens.valor_troco)}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })()}
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
                            // ✅ NOVO: Só fechar o modal se não abrir o modal de quantidade
                            if (!pdvConfig?.vendas_itens_multiplicacao) {
                              // Manter o foco no campo para próxima digitação
                              setTimeout(() => {
                                const input = e.target as HTMLInputElement;
                                input.focus();
                              }, 10);
                            }
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

                    {/* ✅ CORRIGIDO: Posicionamento inteligente dos indicadores */}
                    {/* Indicador de quantidade - posição dinâmica */}
                    {searchTerm.includes('*') ? (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="bg-primary-500 text-white text-xs px-2 py-1 rounded-full">
                          Qtd: {searchTerm.split('*')[0]}
                        </div>
                      </div>
                    ) : (
                      /* Ícone ESC - só aparece quando não há indicador de quantidade */
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <span className="text-xs text-gray-300 bg-gray-700 px-1 py-0.5 rounded">ESC</span>
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
                            // ✅ NOVO: Só fechar o modal se não abrir o modal de quantidade
                            if (!pdvConfig?.vendas_itens_multiplicacao) {
                              setShowAreaProdutos(false);
                            }
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
                {/* Ícone baseado no status */}
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${
                  statusProcessamento === 'sucesso'
                    ? 'bg-green-500/20'
                    : statusProcessamento === 'erro'
                    ? 'bg-red-500/20'
                    : statusProcessamento === 'aguardando_impressao'
                    ? 'bg-blue-500/20'
                    : 'bg-primary-500/20'
                }`}>
                  {statusProcessamento === 'sucesso' ? (
                    <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : statusProcessamento === 'erro' ? (
                    <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : statusProcessamento === 'aguardando_impressao' ? (
                    <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  ) : (
                    <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>

                {/* Título */}
                <h3 className={`text-xl font-semibold mb-2 ${
                  statusProcessamento === 'sucesso'
                    ? 'text-green-400'
                    : statusProcessamento === 'erro'
                    ? 'text-red-400'
                    : statusProcessamento === 'aguardando_impressao'
                    ? 'text-blue-400'
                    : 'text-white'
                }`}>
                  {statusProcessamento === 'sucesso'
                    ? 'Sucesso!'
                    : statusProcessamento === 'erro'
                    ? 'Erro na Emissão'
                    : statusProcessamento === 'aguardando_impressao'
                    ? 'Venda Finalizada!'
                    : 'Processando Venda'}
                </h3>

                {/* Número da venda se disponível */}
                {numeroVendaProcessada && (
                  <p className="text-primary-400 font-medium mb-4">
                    #{numeroVendaProcessada}
                  </p>
                )}

                {/* ✅ NOVO: Mostrar número e série da NFC-e quando disponível */}
                {statusProcessamento === 'processando' && (numeroDocumentoReservado || serieDocumentoReservado) && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 mb-4">
                    <p className="text-purple-400 text-sm font-medium mb-1">
                      🧾 NFC-e reservada:
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-purple-300">Número:</span>
                        <span className="text-white font-medium ml-2">#{numeroDocumentoReservado || 'Carregando...'}</span>
                      </div>
                      <div>
                        <span className="text-purple-300">Série:</span>
                        <span className="text-white font-medium ml-2">#{serieDocumentoReservado || 'Carregando...'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Etapa atual */}
                <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {etapaProcessamento}
                  </p>
                </div>

                {/* ✅ NOVO: Instrução específica para erro na NFC-e */}
                {statusProcessamento === 'erro' && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <h4 className="text-blue-400 font-medium text-sm mb-2">Situação da Venda:</h4>
                        <div className="space-y-2 text-xs text-blue-300">
                          <p>✅ <strong>Venda local finalizada com sucesso</strong></p>
                          <p>❌ <strong>Emissão fiscal (NFC-e) falhou</strong></p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-blue-500/20">
                          <p className="text-xs text-blue-300 leading-relaxed">
                            <strong>Próximos passos:</strong> Acesse a listagem de <strong>Movimentos</strong>,
                            localize esta venda (marcada como "Pendente"), clique em <strong>"Editar NFC-e"</strong>
                            para analisar e corrigir o problema fiscal, depois retransmita para o SEFAZ.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Barra de progresso animada - apenas durante processamento */}
                {statusProcessamento === 'processando' && (
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
                    <div className="bg-primary-500 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                  </div>
                )}

                {/* Botões para impressão */}
                {statusProcessamento === 'aguardando_impressao' && (
                  <div className="mt-6 space-y-3">
                    {/* Botão Imprimir */}
                    <button
                      onClick={executarImpressao}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Imprimir Cupom ({obterTextoTipoImpressao()})
                    </button>

                    {/* Botão Finalizar sem Impressão */}
                    <button
                      onClick={finalizarSemImpressao}
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg transition-colors font-medium"
                    >
                      Finalizar sem Impressão
                    </button>
                  </div>
                )}

                {/* Botões para erro */}
                {statusProcessamento === 'erro' && (
                  <div className="mt-6 space-y-3">


                    {/* Botão Fechar */}
                    <button
                      onClick={() => {
                        setShowProcessandoVenda(false);
                        setStatusProcessamento('processando');
                        setErroProcessamento('');
                      }}
                      className="w-full bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg transition-colors font-medium"
                    >
                      Fechar
                    </button>
                  </div>
                )}

                {/* Aviso importante - apenas durante processamento */}
                {statusProcessamento === 'processando' && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                    <p className="text-yellow-300 text-xs">
                      ⚠️ Não feche esta janela durante o processamento
                    </p>
                  </div>
                )}

                {/* Aviso para impressão */}
                {statusProcessamento === 'aguardando_impressao' && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                    <p className="text-blue-300 text-xs">
                      🖨️ Escolha se deseja imprimir o cupom ou finalizar sem impressão
                    </p>
                  </div>
                )}
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

      {/* ✅ ADICIONADO: Modal de Adicionais para Produtos Novos */}
      {itemParaAdicionais && (
        <OpcoesAdicionaisModal
          isOpen={showAdicionaisModal}
          onClose={() => {
            setShowAdicionaisModal(false);
            setItemParaAdicionais(null);
          }}
          produto={itemParaAdicionais.produto}
          onConfirm={(adicionaisSelecionados) => {
            // Converter adicionais para o formato do carrinho
            const adicionaisFormatados = adicionaisSelecionados.map(item => ({
              id: item.item.id,
              nome: item.item.nome,
              preco: item.item.preco,
              quantidade: item.quantidade
            }));

            // Calcular valor total dos adicionais
            const valorAdicionais = adicionaisFormatados.reduce((total, adicional) =>
              total + (adicional.preco * adicional.quantidade), 0
            );

            // Calcular novo subtotal (produto + adicionais) * quantidade
            const precoUnitario = calcularPrecoFinal(itemParaAdicionais.produto);
            const novoSubtotal = (precoUnitario * itemParaAdicionais.quantidade) + valorAdicionais;

            // Adicionar produto ao carrinho com adicionais e subtotal correto
            const itemComAdicionais = {
              ...itemParaAdicionais,
              adicionais: adicionaisFormatados,
              subtotal: novoSubtotal
            };

            setCarrinho(prev => [...prev, itemComAdicionais]);
            setShowAdicionaisModal(false);
            setItemParaAdicionais(null);

            // Tocar som de sucesso se habilitado
            if (pdvConfig?.som_adicionar_produto) {
              playSuccessSound();
            }

            // Toast de confirmação
            const totalAdicionais = adicionaisSelecionados.length;
            if (totalAdicionais > 0) {
              toast.success(`Produto adicionado com ${totalAdicionais} ${totalAdicionais === 1 ? 'adicional' : 'adicionais'}!`);
            } else {
              toast.success('Produto adicionado ao carrinho!');
            }
          }}
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

      {/* ✅ NOVO: Modal de Edição da NFC-e */}
      <AnimatePresence>
        {showEditarNfceModal && vendaParaEditarNfce && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowEditarNfceModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background-card rounded-lg border border-gray-800 w-full max-w-6xl mx-4 max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cabeçalho */}
              <div className="flex-shrink-0 p-6 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      Editar NFC-e - Venda #{vendaParaEditarNfce.numero_venda}
                    </h3>

                    {/* ✅ NOVO: Campos para editar número e série da NFC-e */}
                    <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <p className="text-blue-400 text-sm font-medium mb-2">Dados da NFC-e:</p>
                      <div className="grid grid-cols-2 gap-4">
                        {/* Campo Número */}
                        <div>
                          <label className="block text-blue-300 text-xs font-medium mb-1">Número:</label>
                          <div className="flex items-center gap-2">
                            {editandoNumeroNfce ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={numeroNfceEditavel}
                                  onChange={(e) => setNumeroNfceEditavel(e.target.value)}
                                  className="w-24 bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white text-sm"
                                  placeholder="Número"
                                  min="1"
                                />
                                <button
                                  onClick={() => {
                                    const novoNumero = parseInt(numeroNfceEditavel) || vendaParaEditarNfce.numero_documento;

                                    // Salvar o número editado no estado do modal
                                    setVendaParaEditarNfce(prev => ({
                                      ...prev,
                                      numero_documento: novoNumero
                                    }));

                                    // ✅ NOVO: Atualizar também o estado da lista de vendas em tempo real
                                    setVendas(prev => prev.map(venda =>
                                      venda.id === vendaParaEditarNfce.id
                                        ? { ...venda, numero_documento: novoNumero }
                                        : venda
                                    ));

                                    setEditandoNumeroNfce(false);

                                    // Mostrar feedback visual
                                    toast.success(`Número da NFC-e alterado para #${novoNumero}`);
                                  }}
                                  className="text-green-400 hover:text-green-300 p-1"
                                  title="Salvar"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => {
                                    setEditandoNumeroNfce(false);
                                    setNumeroNfceEditavel(vendaParaEditarNfce.numero_documento?.toString() || '');
                                  }}
                                  className="text-red-400 hover:text-red-300 p-1"
                                  title="Cancelar"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-blue-300 font-medium">
                                  #{vendaParaEditarNfce.numero_documento || 'Não definido'}
                                </span>
                                <button
                                  onClick={() => {
                                    setEditandoNumeroNfce(true);
                                    setNumeroNfceEditavel(vendaParaEditarNfce.numero_documento?.toString() || '');
                                  }}
                                  className="text-gray-400 hover:text-white p-1"
                                  title="Editar número"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Campo Série */}
                        <div>
                          <label className="block text-blue-300 text-xs font-medium mb-1">Série:</label>
                          <div className="flex items-center gap-2">
                            <span className="text-blue-300 font-medium">
                              #{serieNfce}
                            </span>
                            <span className="text-gray-400 text-xs">(série do usuário)</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-blue-300 text-xs mt-2">
                        ⚠️ Altere o número apenas em caso de duplicação ou conflito de numeração
                      </p>
                    </div>

                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-red-400 text-sm font-medium">Erro Fiscal:</p>
                      <p className="text-red-300 text-sm mt-1">{vendaParaEditarNfce.erro_fiscal}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {loadingItensNfce ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-400">Carregando itens...</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gray-800/30 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-medium text-white">Itens da Venda</h4>
                        <button
                          onClick={handleAtualizarDadosProdutos}
                          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                          title="Atualizar dados fiscais dos produtos com informações do cadastro"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                            <path d="M21 3v5h-5"/>
                            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                            <path d="M3 21v-5h5"/>
                          </svg>
                          Atualizar dados dos produtos
                        </button>
                      </div>
                      <p className="text-gray-400 text-sm mb-4">
                        Revise e corrija os dados fiscais dos produtos. Clique no ícone de lápis para editar os campos CFOP, NCM, CEST, Margem ST, Alíquota, CST ou CSOSN.
                      </p>

                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-700">
                              <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">Item</th>
                              <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">Código</th>
                              <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">Cód. Barras</th>
                              <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">Nome</th>
                              <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">Unidade</th>
                              <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">Preço</th>
                              <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">NCM</th>
                              <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">CEST</th>
                              <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">Margem</th>
                              <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">Alíquota</th>
                              <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">CFOP</th>
                              <th className="text-left py-3 px-2 text-gray-400 font-medium text-sm">
                                {itensNfceEdicao[0]?.regime_tributario === 1 ? 'CSOSN' : 'CST'}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {itensNfceEdicao.map((item, index) => (
                              <tr key={item.id} className="border-b border-gray-800/50">
                                <td className="py-3 px-2 text-white font-medium">{item.sequencia}</td>
                                <td className="py-3 px-2 text-gray-300">{item.produto?.codigo || item.codigo_produto}</td>
                                <td className="py-3 px-2 text-gray-300">{item.produto?.codigo_barras || '-'}</td>
                                <td className="py-3 px-2 text-white">{item.nome_produto}</td>
                                <td className="py-3 px-2 text-gray-300">
                                  <div className="flex items-center gap-2">
                                    <span>
                                      {item.produto?.unidade_medida?.sigla || item.unidade || (
                                        <span className="text-red-400 font-medium">SEM UNIDADE</span>
                                      )}
                                    </span>
                                    <button
                                      onClick={() => {
                                        setItemParaEditarUnidade(item);
                                        setShowSeletorUnidadeModal(true);
                                      }}
                                      className="text-blue-400 hover:text-blue-300 transition-colors"
                                      title="Selecionar unidade de medida"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                                <td className="py-3 px-2 text-white">{formatCurrency(item.valor_unitario)}</td>

                                {/* NCM */}
                                <td className="py-3 px-2">
                                  <div className="flex items-center gap-2">
                                    {item.editando_ncm ? (
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="text"
                                          value={item.ncm_editavel}
                                          onChange={(e) => {
                                            const novoValor = e.target.value.replace(/\D/g, ''); // Só números
                                            setItensNfceEdicao(prev => prev.map((it, idx) =>
                                              idx === index ? { ...it, ncm_editavel: novoValor } : it
                                            ));
                                          }}
                                          className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                                          maxLength={8}
                                          placeholder="00000000"
                                        />
                                        <button
                                          onClick={() => salvarEdicaoCampo(index, 'ncm', item.ncm_editavel)}
                                          className="text-green-400 hover:text-green-300"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={() => cancelarEdicaoCampo(index, 'ncm')}
                                          className="text-red-400 hover:text-red-300"
                                        >
                                          <X size={16} />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <span className="text-white font-mono text-sm">{item.ncm_editavel || '00000000'}</span>
                                        <button
                                          onClick={() => habilitarEdicaoCampo(index, 'ncm')}
                                          className="text-gray-400 hover:text-white"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                          </svg>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>

                                {/* CEST */}
                                <td className="py-3 px-2">
                                  <div className="flex items-center gap-2">
                                    {item.editando_cest ? (
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="text"
                                          value={item.cest_editavel}
                                          onChange={(e) => {
                                            const novoValor = e.target.value.replace(/\D/g, ''); // Só números
                                            setItensNfceEdicao(prev => prev.map((it, idx) =>
                                              idx === index ? { ...it, cest_editavel: novoValor } : it
                                            ));
                                          }}
                                          className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                                          maxLength={7}
                                          placeholder="0000000"
                                        />
                                        <button
                                          onClick={() => salvarEdicaoCampo(index, 'cest', item.cest_editavel)}
                                          className="text-green-400 hover:text-green-300"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={() => cancelarEdicaoCampo(index, 'cest')}
                                          className="text-red-400 hover:text-red-300"
                                        >
                                          <X size={16} />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <span className="text-white font-mono text-sm">{item.cest_editavel || '-'}</span>
                                        <button
                                          onClick={() => habilitarEdicaoCampo(index, 'cest')}
                                          className="text-gray-400 hover:text-white"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                          </svg>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>

                                {/* Margem ST */}
                                <td className="py-3 px-2">
                                  <div className="flex items-center gap-2">
                                    {item.editando_margem_st ? (
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="text"
                                          value={item.margem_st_editavel}
                                          onChange={(e) => {
                                            const novoValor = e.target.value.replace(/[^\d,]/g, ''); // Só números e vírgula
                                            setItensNfceEdicao(prev => prev.map((it, idx) =>
                                              idx === index ? { ...it, margem_st_editavel: novoValor } : it
                                            ));
                                          }}
                                          className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                                          maxLength={5}
                                          placeholder="0"
                                        />
                                        <span className="text-gray-400 text-sm">%</span>
                                        <button
                                          onClick={() => salvarEdicaoCampo(index, 'margem_st', item.margem_st_editavel)}
                                          className="text-green-400 hover:text-green-300"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={() => cancelarEdicaoCampo(index, 'margem_st')}
                                          className="text-red-400 hover:text-red-300"
                                        >
                                          <X size={16} />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <span className="text-white text-sm">{item.margem_st_editavel || '0'}%</span>
                                        <button
                                          onClick={() => habilitarEdicaoCampo(index, 'margem_st')}
                                          className="text-gray-400 hover:text-white"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                          </svg>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>

                                {/* Alíquota ICMS */}
                                <td className="py-3 px-2">
                                  <div className="flex items-center gap-2">
                                    {item.editando_aliquota_icms ? (
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="text"
                                          value={item.aliquota_icms_editavel}
                                          onChange={(e) => {
                                            const novoValor = e.target.value.replace(/[^\d,]/g, ''); // Só números e vírgula
                                            setItensNfceEdicao(prev => prev.map((it, idx) =>
                                              idx === index ? { ...it, aliquota_icms_editavel: novoValor } : it
                                            ));
                                          }}
                                          className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                                          maxLength={5}
                                          placeholder="0"
                                        />
                                        <span className="text-gray-400 text-sm">%</span>
                                        <button
                                          onClick={() => salvarEdicaoCampo(index, 'aliquota_icms', item.aliquota_icms_editavel)}
                                          className="text-green-400 hover:text-green-300"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={() => cancelarEdicaoCampo(index, 'aliquota_icms')}
                                          className="text-red-400 hover:text-red-300"
                                        >
                                          <X size={16} />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <span className="text-white text-sm">{item.aliquota_icms_editavel || '0'}%</span>
                                        <button
                                          onClick={() => habilitarEdicaoCampo(index, 'aliquota_icms')}
                                          className="text-gray-400 hover:text-white"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                          </svg>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>

                                {/* CFOP */}
                                <td className="py-3 px-2">
                                  <div className="flex items-center gap-2">
                                    {item.editando_cfop ? (
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="text"
                                          value={item.cfop_editavel}
                                          onChange={(e) => {
                                            const novoValor = e.target.value;
                                            setItensNfceEdicao(prev => prev.map((it, idx) =>
                                              idx === index ? { ...it, cfop_editavel: novoValor } : it
                                            ));
                                          }}
                                          className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                                          maxLength={4}
                                        />
                                        <button
                                          onClick={() => salvarEdicaoCampo(index, 'cfop', item.cfop_editavel)}
                                          className="text-green-400 hover:text-green-300"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={() => cancelarEdicaoCampo(index, 'cfop')}
                                          className="text-red-400 hover:text-red-300"
                                        >
                                          <X size={16} />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <span className="text-white">{item.cfop_editavel || '-'}</span>
                                        <button
                                          onClick={() => habilitarEdicaoCampo(index, 'cfop')}
                                          className="text-gray-400 hover:text-white"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                          </svg>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>

                                {/* CST/CSOSN */}
                                <td className="py-3 px-2">
                                  <div className="flex items-center gap-2">
                                    {item.regime_tributario === 1 ? (
                                      // CSOSN para Simples Nacional
                                      item.editando_csosn ? (
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="text"
                                            value={item.csosn_editavel}
                                            onChange={(e) => {
                                              const novoValor = e.target.value;
                                              setItensNfceEdicao(prev => prev.map((it, idx) =>
                                                idx === index ? { ...it, csosn_editavel: novoValor } : it
                                              ));
                                            }}
                                            className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                                            maxLength={3}
                                          />
                                          <button
                                            onClick={() => salvarEdicaoCampo(index, 'csosn', item.csosn_editavel)}
                                            className="text-green-400 hover:text-green-300"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={() => cancelarEdicaoCampo(index, 'csosn')}
                                            className="text-red-400 hover:text-red-300"
                                          >
                                            <X size={16} />
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <span className="text-white">{item.csosn_editavel || '-'}</span>
                                          <button
                                            onClick={() => habilitarEdicaoCampo(index, 'csosn')}
                                            className="text-gray-400 hover:text-white"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                          </button>
                                        </div>
                                      )
                                    ) : (
                                      // CST para Lucro Real/Presumido
                                      item.editando_cst ? (
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="text"
                                            value={item.cst_editavel}
                                            onChange={(e) => {
                                              const novoValor = e.target.value;
                                              setItensNfceEdicao(prev => prev.map((it, idx) =>
                                                idx === index ? { ...it, cst_editavel: novoValor } : it
                                              ));
                                            }}
                                            className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                                            maxLength={3}
                                          />
                                          <button
                                            onClick={() => salvarEdicaoCampo(index, 'cst', item.cst_editavel)}
                                            className="text-green-400 hover:text-green-300"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={() => cancelarEdicaoCampo(index, 'cst')}
                                            className="text-red-400 hover:text-red-300"
                                          >
                                            <X size={16} />
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <span className="text-white">{item.cst_editavel || '-'}</span>
                                          <button
                                            onClick={() => habilitarEdicaoCampo(index, 'cst')}
                                            className="text-gray-400 hover:text-white"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                          </button>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 p-6 border-t border-gray-800">
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowEditarNfceModal(false)}
                    className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={reprocessarNfce}
                    disabled={reprocessandoNfce || loadingItensNfce}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    {reprocessandoNfce ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Reprocessando...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reprocessar Envio
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Seleção de Unidade de Medida */}
      <AnimatePresence>
        {showSeletorUnidadeModal && itemParaEditarUnidade && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowSeletorUnidadeModal(false);
              setItemParaEditarUnidade(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-background-card rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Selecionar Unidade de Medida</h3>
                  <p className="text-gray-400 text-sm">
                    Produto: {itemParaEditarUnidade.nome_produto}
                  </p>
                </div>
              </div>

              {loadingUnidades ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2 text-gray-400">Carregando unidades...</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {unidadesMedida.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">
                      Nenhuma unidade de medida cadastrada
                    </p>
                  ) : (
                    unidadesMedida.map((unidade) => (
                      <button
                        key={unidade.id}
                        onClick={() => atualizarUnidadeProduto(unidade)}
                        className="w-full text-left p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors border border-gray-600/50 hover:border-blue-500/50"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-white font-medium">{unidade.sigla}</span>
                            <span className="text-gray-400 ml-2">- {unidade.nome}</span>
                          </div>
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowSeletorUnidadeModal(false);
                    setItemParaEditarUnidade(null);
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Seleção de Vendedor */}
      <AnimatePresence>
        {showVendedorModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background-card border border-gray-800 rounded-lg p-6 max-w-md w-full mx-4"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  <UserCheck size={20} className="text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Selecionar Vendedor</h3>
                  <p className="text-sm text-gray-400">Escolha o vendedor responsável por este item</p>
                </div>
              </div>

              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                {vendedores.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-400 text-sm mb-2">Nenhum vendedor encontrado</p>
                    <p className="text-gray-500 text-xs">
                      Configure vendedores em: Configurações → Usuários
                    </p>
                  </div>
                ) : (
                  vendedores.map(vendedor => (
                    <button
                      key={vendedor.id}
                      onClick={() => selecionarVendedor(vendedor)}
                      className={`w-full p-3 rounded-lg border transition-colors text-left ${
                        vendedorSelecionado?.id === vendedor.id
                          ? 'bg-green-500/20 border-green-500/50 text-green-300'
                          : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700/50 hover:border-gray-600'
                      }`}
                    >
                      <div className="font-medium">{vendedor.nome}</div>
                      {vendedor.email && (
                        <div className="text-sm text-gray-400 mt-1">{vendedor.email}</div>
                      )}
                    </button>
                  ))
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelarSelecaoVendedor}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                {vendedorSelecionado && (
                  <button
                    onClick={() => selecionarVendedor(vendedorSelecionado)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    Confirmar
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✅ NOVO: Modal de Quantidade */}
      <AnimatePresence>
        {showQuantidadeModal && (produtoParaQuantidade || vendaSemProdutoAguardando) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background-card border border-gray-800 rounded-lg p-6 max-w-md w-full mx-4"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Package size={20} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Definir Quantidade</h3>
                  <p className="text-sm text-gray-400">Informe a quantidade do produto</p>
                </div>
              </div>

              {/* Informações do produto */}
              <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
                <h4 className="text-white font-medium mb-2">
                  {vendaSemProdutoAguardando ? vendaSemProdutoAguardando.nome : produtoParaQuantidade?.nome}
                </h4>
                <div className="text-sm text-gray-400 space-y-1">
                  {vendaSemProdutoAguardando ? (
                    <p>Venda sem produto</p>
                  ) : (
                    <p>Código: {produtoParaQuantidade?.codigo}</p>
                  )}

                  {/* ✅ NOVO: Exibir informações de preço com desconto */}
                  {vendaSemProdutoAguardando ? (
                    <p>Preço: {formatCurrency(vendaSemProdutoAguardando.preco)}</p>
                  ) : produtoParaQuantidade?.promocao ? (
                    <div>
                      <p>
                        <span className="line-through">{formatCurrency(produtoParaQuantidade.preco)}</span>
                        <span className="text-primary-400 ml-2 font-medium">{formatCurrency(calcularPrecoFinal(produtoParaQuantidade))}</span>
                      </p>
                      <p className="text-xs text-green-400">Produto em promoção</p>
                    </div>
                  ) : (
                    <p>Preço: {formatCurrency(calcularPrecoFinal(produtoParaQuantidade!))}</p>
                  )}

                  {/* ✅ NOVO: Informações de desconto por quantidade */}
                  {!vendaSemProdutoAguardando && produtoParaQuantidade?.desconto_quantidade && produtoParaQuantidade?.quantidade_minima && (
                    <div className="text-xs text-green-400 mt-2">
                      Desconto para {produtoParaQuantidade.quantidade_minima}+ unidades:
                      {produtoParaQuantidade.tipo_desconto_quantidade === 'percentual'
                        ? ` ${produtoParaQuantidade.percentual_desconto_quantidade}%`
                        : ` ${formatCurrency(produtoParaQuantidade.valor_desconto_quantidade || 0)}`
                      }
                    </div>
                  )}
                </div>
              </div>

              {/* Campo de quantidade com botões + e - */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-white">
                    Quantidade
                  </label>
                  {/* ✅ NOVO: Indicação de quantidade mínima para desconto */}
                  {!vendaSemProdutoAguardando && produtoParaQuantidade?.desconto_quantidade && produtoParaQuantidade?.quantidade_minima && (
                    <span className="text-xs text-gray-400">
                      Mín. {produtoParaQuantidade.quantidade_minima} para desconto
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={diminuirQuantidade}
                    className="w-10 h-10 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center justify-center transition-colors"
                  >
                    <Minus size={16} />
                  </button>

                  <div className="flex-1 relative">
                    <input
                      type="number"
                      value={quantidadeModal}
                      onChange={(e) => {
                        const valor = parseInt(e.target.value);
                        if (!isNaN(valor) && valor > 0) {
                          setQuantidadeModal(valor);
                        }
                      }}
                      min="1"
                      className={`w-full bg-gray-800/50 border rounded-lg py-2 px-3 text-white text-center focus:outline-none focus:ring-1 focus:ring-primary-500/20 ${
                        !vendaSemProdutoAguardando &&
                        produtoParaQuantidade?.desconto_quantidade &&
                        produtoParaQuantidade?.quantidade_minima &&
                        quantidadeModal >= produtoParaQuantidade?.quantidade_minima
                          ? 'border-green-500 focus:border-green-500'
                          : 'border-gray-700 focus:border-primary-500'
                      }`}
                    />
                    {/* ✅ NOVO: Indicador de desconto aplicado */}
                    {!vendaSemProdutoAguardando &&
                     produtoParaQuantidade?.desconto_quantidade &&
                     produtoParaQuantidade?.quantidade_minima &&
                     quantidadeModal >= produtoParaQuantidade?.quantidade_minima && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <span className="text-xs text-green-400 font-medium">
                          Desconto aplicado!
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={aumentarQuantidade}
                    className="w-10 h-10 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center justify-center transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Total */}
              <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-3 mb-6">
                {/* ✅ NOVO: Mostrar cálculo detalhado quando há desconto */}
                {vendaSemProdutoAguardando ? (
                  <div className="flex justify-between items-center">
                    <span className="text-primary-300 font-medium">Total:</span>
                    <span className="text-primary-300 font-bold text-lg">
                      {formatCurrency(vendaSemProdutoAguardando.preco * quantidadeModal)}
                    </span>
                  </div>
                ) : (produtoParaQuantidade?.promocao ||
                  (produtoParaQuantidade?.desconto_quantidade &&
                   produtoParaQuantidade?.quantidade_minima &&
                   quantidadeModal >= produtoParaQuantidade?.quantidade_minima)) ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Preço original:</span>
                      <span className="text-gray-400 line-through">
                        {formatCurrency(produtoParaQuantidade!.preco)} x {quantidadeModal}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-green-400">Preço com desconto:</span>
                      <span className="text-green-400">
                        {formatCurrency(calcularPrecoModalQuantidade(produtoParaQuantidade!, quantidadeModal))} x {quantidadeModal}
                      </span>
                    </div>
                    <div className="border-t border-primary-500/30 pt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-primary-300 font-medium">Total:</span>
                        <span className="text-primary-300 font-bold text-lg">
                          {formatCurrency(calcularPrecoModalQuantidade(produtoParaQuantidade!, quantidadeModal) * quantidadeModal)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-primary-300 font-medium">Total:</span>
                    <span className="text-primary-300 font-bold text-lg">
                      {formatCurrency(calcularPrecoModalQuantidade(produtoParaQuantidade!, quantidadeModal) * quantidadeModal)}
                    </span>
                  </div>
                )}
              </div>

              {/* Botões */}
              <div className="flex gap-3">
                <button
                  onClick={cancelarQuantidade}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarQuantidade}
                  className="flex-1 bg-primary-500 hover:bg-primary-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Adicionar ao Carrinho
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Desconto no Total */}
      <AnimatePresence>
        {showDescontoTotalModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background-card rounded-lg p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Percent size={24} className="text-orange-400" />
                  Desconto no Total
                </h3>
                <button
                  onClick={() => setShowDescontoTotalModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Tipo de desconto */}
                <div>
                  <label className="text-sm font-medium text-white mb-2 block">
                    Tipo de Desconto
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setTipoDescontoTotal('percentual')}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        tipoDescontoTotal === 'percentual'
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Percentual (%)
                    </button>
                    <button
                      onClick={() => setTipoDescontoTotal('valor')}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        tipoDescontoTotal === 'valor'
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Valor (R$)
                    </button>
                  </div>
                </div>

                {/* Valor do desconto */}
                <div>
                  <label className="text-sm font-medium text-white mb-2 block">
                    {tipoDescontoTotal === 'percentual' ? 'Percentual de Desconto' : 'Valor do Desconto'}
                  </label>
                  <input
                    type="number"
                    value={descontoTotal}
                    onChange={(e) => setDescontoTotal(parseFloat(e.target.value) || 0)}
                    placeholder={tipoDescontoTotal === 'percentual' ? 'Ex: 10' : 'Ex: 50.00'}
                    min="0"
                    max={tipoDescontoTotal === 'percentual' ? '100' : undefined}
                    step={tipoDescontoTotal === 'percentual' ? '1' : '0.01'}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-orange-500/20 focus:border-orange-500"
                    autoFocus
                  />
                  {tipoDescontoTotal === 'percentual' && (
                    <p className="text-xs text-gray-400 mt-1">
                      Máximo: 100%
                    </p>
                  )}
                </div>

                {/* Informações do total */}
                <div className="bg-gray-800/30 rounded-lg p-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Total atual:</span>
                    <span className="text-white font-medium">
                      {formatCurrency(carrinho.reduce((total, item) => total + item.subtotal, 0))}
                    </span>
                  </div>
                  {descontoTotal > 0 && (
                    <>
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-orange-400">Desconto:</span>
                        <span className="text-orange-400">
                          -{formatCurrency(
                            tipoDescontoTotal === 'percentual'
                              ? (carrinho.reduce((total, item) => total + item.subtotal, 0) * descontoTotal) / 100
                              : descontoTotal
                          )}
                        </span>
                      </div>
                      <div className="border-t border-gray-700 mt-2 pt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-white font-medium">Total com desconto:</span>
                          <span className="text-green-400 font-bold">
                            {formatCurrency(
                              carrinho.reduce((total, item) => total + item.subtotal, 0) -
                              (tipoDescontoTotal === 'percentual'
                                ? (carrinho.reduce((total, item) => total + item.subtotal, 0) * descontoTotal) / 100
                                : descontoTotal)
                            )}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowDescontoTotalModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={aplicarDescontoTotal}
                  disabled={descontoTotal <= 0}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Aplicar Desconto
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PDVPage;
