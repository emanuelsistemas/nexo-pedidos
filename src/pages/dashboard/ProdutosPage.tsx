import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Trash2, Search, ArrowUpDown, AlertCircle, Plus, ChevronDown, ChevronUp, Image, Upload, Star, StarOff, Camera, QrCode } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Grupo, Produto, OpcaoAdicional, ProdutoOpcao } from '../../types';
import { showMessage } from '../../utils/toast';
import { useAuthSession } from '../../hooks/useAuthSession';
import Button from '../../components/comum/Button';
import FotoGaleria from '../../components/comum/FotoGaleria';

// Função debounce para otimizar chamadas de API
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

interface UnidadeMedida {
  id: string;
  sigla: string;
  nome: string;
  empresa_id: string;
  created_at?: string;
}

interface DeleteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-background-card p-6 rounded-lg shadow-xl max-w-sm mx-4 w-full"
        >
          <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
          <p className="text-gray-400 mb-6">{message}</p>
          <div className="flex gap-4">
            <Button
              type="button"
              variant="text"
              className="flex-1"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              className="flex-1 !bg-red-500 hover:!bg-red-600"
              onClick={onConfirm}
            >
              Excluir
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const WarningModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  message: string;
}> = ({ isOpen, onClose, message }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-background-card p-6 rounded-lg shadow-xl max-w-sm mx-4 w-full"
        >
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="text-yellow-500" size={24} />
            <h3 className="text-xl font-semibold text-white">Atenção</h3>
          </div>
          <p className="text-gray-400 mb-6">{message}</p>
          <Button
            type="button"
            variant="primary"
            className="w-full"
            onClick={onClose}
          >
            Entendi
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

interface ProdutoFoto {
  id: string;
  url: string;
  storage_path: string;
  principal: boolean;
  empresa_id?: string;
}

const ProdutosPage: React.FC = () => {
  const { withSessionCheck } = useAuthSession();
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Iniciar como true
  const [isDataReady, setIsDataReady] = useState(false); // Novo estado para controlar quando os dados estão prontos
  const [isGrupoForm, setIsGrupoForm] = useState(true);

  // Estados para controlar o carregamento de cada parte dos dados
  const [loadingStates, setLoadingStates] = useState({
    grupos: true,
    opcoes: true,
    unidades: true,
    estoqueConfig: true
  });

  // Função para verificar se todos os dados estão carregados
  const checkIfDataReady = () => {
    const allLoaded = !loadingStates.grupos && !loadingStates.opcoes && !loadingStates.unidades && !loadingStates.estoqueConfig;
    if (allLoaded && !isDataReady) {
      setIsDataReady(true);
      setIsLoading(false);
    }
  };

  // Monitorar mudanças nos estados de loading
  useEffect(() => {
    checkIfDataReady();
  }, [loadingStates, isDataReady]);

  const [novoGrupoNome, setNovoGrupoNome] = useState('');
  const [selectedGrupo, setSelectedGrupo] = useState<Grupo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [productSearchTerms, setProductSearchTerms] = useState<Record<string, string>>({});
  const [productSortOrders, setProductSortOrders] = useState<Record<string, 'asc' | 'desc'>>({});
  const [novoProduto, setNovoProduto] = useState<Partial<Produto>>({
    nome: '',
    preco: 0,
    descricao: '',
    codigo: '',
    codigo_barras: '',
    promocao: false,
    ativo: true,
    desconto_quantidade: false,
    quantidade_minima: 0,
    tipo_desconto_quantidade: 'percentual',
    valor_desconto_quantidade: 0,
    estoque_inicial: 0,
    estoque_minimo: 0,
    // Campos fiscais NFe
    ncm: '',
    cfop: '5102',
    origem_produto: 0,
    situacao_tributaria: 'tributado_integral',
    cst_icms: '',
    csosn_icms: '',
    cst_pis: '01',
    cst_cofins: '01',
    aliquota_icms: 0,
    aliquota_pis: 1.65,
    aliquota_cofins: 7.60,
    cest: '',
    peso_liquido: 0,
    estoque_minimo_ativo: false,
  });

  // Estado para controlar o valor formatado do preço
  const [precoFormatado, setPrecoFormatado] = useState('');
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    type: 'grupo' | 'produto' | 'foto';
    id: string;
    grupoId?: string;
    title: string;
    message: string;
    fotoPath?: string;
  }>({
    isOpen: false,
    type: 'grupo',
    id: '',
    title: '',
    message: '',
  });
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [produtoOpcoes, setProdutoOpcoes] = useState<Record<string, OpcaoAdicional[]>>({});
  const [expandedOpcoes, setExpandedOpcoes] = useState<Record<string, boolean>>({});
  const [availableOpcoes, setAvailableOpcoes] = useState<OpcaoAdicional[]>([]);
  const [selectedOpcoes, setSelectedOpcoes] = useState<string[]>([]);
  const [opcoesAdicionaisHabilitado, setOpcoesAdicionaisHabilitado] = useState(false);
  const [expandedOpcoesForm, setExpandedOpcoesForm] = useState<Record<string, boolean>>({});

  // Estados para as abas
  const [activeTab, setActiveTab] = useState<'dados' | 'fotos' | 'estoque' | 'adicionais' | 'impostos'>('dados');
  const [produtoFotos, setProdutoFotos] = useState<ProdutoFoto[]>([]);
  const [isUploadingFoto, setIsUploadingFoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para a galeria de fotos
  const [isGaleriaOpen, setIsGaleriaOpen] = useState(false);
  const [currentFotoIndex, setCurrentFotoIndex] = useState(0);

  // Estado para unidades de medida
  const [unidadesMedida, setUnidadesMedida] = useState<UnidadeMedida[]>([]);

  // Estado para regime tributário da empresa
  const [regimeTributario, setRegimeTributario] = useState<number>(3);

  // Estados para validação de NCM
  const [ncmValidacao, setNcmValidacao] = useState<{
    validando: boolean;
    valido: boolean | null;
    descricao: string;
    erro: string;
  }>({
    validando: false,
    valido: null,
    descricao: '',
    erro: ''
  });

  // Estado para controlar o formulário de unidade de medida
  const [showUnidadeMedidaForm, setShowUnidadeMedidaForm] = useState(false);
  const [novaUnidadeMedida, setNovaUnidadeMedida] = useState<{sigla: string, nome: string}>({
    sigla: '',
    nome: ''
  });
  const [isLoadingUnidadeMedida, setIsLoadingUnidadeMedida] = useState(false);

  // Estado para o valor formatado do desconto
  const [descontoFormatado, setDescontoFormatado] = useState('');

  // Estado para o valor final após o desconto
  const [valorFinalFormatado, setValorFinalFormatado] = useState('');

  // Estado para o valor formatado do desconto por quantidade
  const [descontoQuantidadeFormatado, setDescontoQuantidadeFormatado] = useState('');

  // Estado para controlar quando o campo de estoque inicial está vazio
  const [estoqueInputVazio, setEstoqueInputVazio] = useState(false);

  // Estado para controlar quando o campo de quantidade mínima está vazio
  const [quantidadeMinimaVazia, setQuantidadeMinimaVazia] = useState(false);

  // Estado para controlar quando o campo de estoque mínimo está vazio
  const [estoqueMinimoVazio, setEstoqueMinimoVazio] = useState(false);

  // Estado para controlar quando o formulário foi resetado
  const [formularioResetado, setFormularioResetado] = useState(false);

  // Estados para a aba de Estoque
  const [estoqueMovimentos, setEstoqueMovimentos] = useState<any[]>([]);
  const [estoqueAtual, setEstoqueAtual] = useState<number>(0);
  const [estoqueNaoFaturado, setEstoqueNaoFaturado] = useState<number>(0);
  const [tipoVisualizacaoEstoque, setTipoVisualizacaoEstoque] = useState<'total' | 'nao-faturado'>('total');
  const [tipoControleEstoque, setTipoControleEstoque] = useState<'faturamento' | 'pedidos' | 'pdv'>('pedidos');
  const [produtosEstoque, setProdutosEstoque] = useState<Record<string, { total: number, naoFaturado: number }>>({});
  const [novoMovimento, setNovoMovimento] = useState<{
    tipo: 'entrada' | 'saida';
    quantidade: number;
    observacao: string;
  }>({
    tipo: 'entrada',
    quantidade: 0,
    observacao: ''
  });

  // Estado para controlar quando o campo de quantidade de movimento está vazio
  const [quantidadeMovimentoVazia, setQuantidadeMovimentoVazia] = useState(false);
  const [isLoadingEstoque, setIsLoadingEstoque] = useState(false);

  useEffect(() => {
    loadGrupos();
    loadAvailableOpcoes();
    loadUnidadesMedida();
    loadTipoControleEstoque();
    loadProdutosEstoque();
    loadOpcoesAdicionaisConfig();
    loadRegimeTributario();
  }, []);

  const loadRegimeTributario = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      const { data: empresaData } = await supabase
        .from('empresas')
        .select('regime_tributario')
        .eq('id', usuarioData.empresa_id)
        .single();

      if (empresaData?.regime_tributario) {
        setRegimeTributario(empresaData.regime_tributario);
      }
    } catch (error) {
      console.error('Erro ao carregar regime tributário:', error);
    }
  };

  // Função para validar NCM usando BrasilAPI
  const validarNCM = async (codigo: string) => {
    if (!codigo || codigo.length !== 8) {
      setNcmValidacao({
        validando: false,
        valido: null,
        descricao: '',
        erro: ''
      });
      return;
    }

    setNcmValidacao(prev => ({ ...prev, validando: true }));

    try {
      const response = await fetch(`https://brasilapi.com.br/api/ncm/v1/${codigo}`);

      if (response.ok) {
        const data = await response.json();
        setNcmValidacao({
          validando: false,
          valido: true,
          descricao: data.descricao || '',
          erro: ''
        });
      } else {
        setNcmValidacao({
          validando: false,
          valido: false,
          descricao: '',
          erro: 'NCM não encontrado na base de dados'
        });
      }
    } catch (error) {
      setNcmValidacao({
        validando: false,
        valido: false,
        descricao: '',
        erro: 'Erro ao validar NCM. Verifique sua conexão.'
      });
    }
  };

  // Função para aplicar máscara no NCM (0000.00.00)
  const aplicarMascaraNCM = (valor: string) => {
    // Remove tudo que não é número
    const apenasNumeros = valor.replace(/\D/g, '');

    // Aplica a máscara 0000.00.00
    if (apenasNumeros.length <= 4) {
      return apenasNumeros;
    } else if (apenasNumeros.length <= 6) {
      return `${apenasNumeros.slice(0, 4)}.${apenasNumeros.slice(4)}`;
    } else {
      return `${apenasNumeros.slice(0, 4)}.${apenasNumeros.slice(4, 6)}.${apenasNumeros.slice(6, 8)}`;
    }
  };

  // Debounce para validação de NCM
  const debounceValidarNCM = useCallback(
    debounce((codigo: string) => {
      validarNCM(codigo);
    }, 800),
    []
  );

  // useEffect separado para verificar produto para editar após grupos carregarem
  useEffect(() => {
    if (grupos.length > 0) {
      checkProdutoParaEditar();
    }
  }, [grupos]);

  const checkProdutoParaEditar = () => {
    const produtoParaEditar = localStorage.getItem('produto_para_editar');

    if (produtoParaEditar) {
      try {
        const { produto_id, grupo_id, timestamp, origem, aba_inicial } = JSON.parse(produtoParaEditar);

        // Verificar se o timestamp não é muito antigo (5 minutos)
        const agora = new Date().getTime();
        const tempoLimite = 5 * 60 * 1000; // 5 minutos

        if (agora - timestamp < tempoLimite) {
          // Como os grupos já estão carregados, abrir imediatamente
          abrirProdutoParaEdicao(produto_id, grupo_id, aba_inicial);
        }

        // Limpar o localStorage
        localStorage.removeItem('produto_para_editar');
      } catch (error) {
        console.error('Erro ao processar produto para editar:', error);
        localStorage.removeItem('produto_para_editar');
      }
    }
  };

  const abrirProdutoParaEdicao = (produtoId: string, grupoId: string, abaInicial?: string) => {
    // Encontrar o grupo
    const grupo = grupos.find(g => g.id === grupoId);
    if (!grupo) {
      return;
    }

    // Encontrar o produto
    const produto = grupo.produtos.find(p => p.id === produtoId);
    if (!produto) {
      return;
    }

    // Abrir o produto para edição
    handleEditProduto(grupo, produto);

    // Se foi especificada uma aba inicial, definir após um pequeno delay
    if (abaInicial) {
      setTimeout(() => {
        setActiveTab(abaInicial);
      }, 100);
    }
  };

  // Efeito para monitorar quando o sidebar é fechado
  useEffect(() => {
    // Se o sidebar foi fechado e o formulário foi resetado
    if (!showSidebar && formularioResetado) {
      // Resetar a flag
      setFormularioResetado(false);
    }
  }, [showSidebar, formularioResetado]);

  // Efeito para garantir que o tipo de visualização seja compatível com o tipo de controle
  useEffect(() => {
    // Forçar uma atualização da interface quando o tipo de controle mudar
    document.title = `Nexo - Produtos (${tipoControleEstoque})`;

    // Se o tipo de controle for 'faturamento', forçar a visualização para 'total'
    if (tipoControleEstoque === 'faturamento' && tipoVisualizacaoEstoque !== 'total') {
      setTipoVisualizacaoEstoque('total');
    }
  }, [tipoControleEstoque, tipoVisualizacaoEstoque]);

  // Efeito para atualizar o valor final quando o preço, tipo de desconto ou valor do desconto mudar
  useEffect(() => {
    if (novoProduto.promocao && novoProduto.preco && novoProduto.tipo_desconto && novoProduto.valor_desconto !== undefined) {
      const valorFinal = calcularValorFinal(
        novoProduto.preco,
        novoProduto.tipo_desconto,
        novoProduto.valor_desconto
      );
      setValorFinalFormatado(formatarPreco(valorFinal));
    } else {
      setValorFinalFormatado('');
    }
  }, [novoProduto.preco, novoProduto.promocao, novoProduto.tipo_desconto, novoProduto.valor_desconto]);

  // Efeito para arredondar o estoque inicial quando a unidade de medida mudar
  useEffect(() => {
    if (novoProduto.estoque_inicial !== undefined && novoProduto.unidade_medida_id) {
      // Verificar se a unidade de medida é KG
      const unidadeSelecionada = unidadesMedida.find(u => u.id === novoProduto.unidade_medida_id);
      const isKG = unidadeSelecionada?.sigla === 'KG';

      // Se não for KG e o valor for fracionado, arredondar para número inteiro
      if (!isKG && novoProduto.estoque_inicial % 1 !== 0) {
        setNovoProduto(prev => ({
          ...prev,
          estoque_inicial: Math.floor(prev.estoque_inicial || 0)
        }));
      }
    }
  }, [novoProduto.unidade_medida_id, unidadesMedida]);

  // Efeito para arredondar o estoque mínimo quando a unidade de medida mudar
  useEffect(() => {
    if (novoProduto.estoque_minimo !== undefined && novoProduto.unidade_medida_id) {
      // Verificar se a unidade de medida é KG
      const unidadeSelecionada = unidadesMedida.find(u => u.id === novoProduto.unidade_medida_id);
      const isKG = unidadeSelecionada?.sigla === 'KG';

      // Se não for KG e o valor for fracionado, arredondar para número inteiro
      if (!isKG && novoProduto.estoque_minimo % 1 !== 0) {
        setNovoProduto(prev => ({
          ...prev,
          estoque_minimo: Math.floor(prev.estoque_minimo || 0)
        }));
      }
    }
  }, [novoProduto.unidade_medida_id, unidadesMedida]);

  const loadOpcoesAdicionaisConfig = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      const { data: configData } = await supabase
        .from('produtos_config')
        .select('opcoes_adicionais')
        .eq('empresa_id', usuarioData.empresa_id)
        .single();

      if (configData) {
        setOpcoesAdicionaisHabilitado(configData.opcoes_adicionais || false);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração de opções adicionais:', error);
    }
  };

  const loadUnidadesMedida = async () => {
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
        .from('unidade_medida')
        .select('*')
        .eq('empresa_id', usuarioData.empresa_id)
        .order('sigla', { ascending: true });

      if (error) throw error;
      setUnidadesMedida(data || []);

      // Marcar unidades como carregadas
      setLoadingStates(prev => ({ ...prev, unidades: false }));
    } catch (error: any) {
      console.error('Erro ao carregar unidades de medida:', error);
      showMessage('error', 'Erro ao carregar unidades de medida');
      // Em caso de erro, marcar como carregado para não ficar em loading infinito
      setLoadingStates(prev => ({ ...prev, unidades: false }));
    }
  };

  const handleOpcaoToggle = (opcaoId: string) => {
    setSelectedOpcoes(prev => {
      if (prev.includes(opcaoId)) {
        return prev.filter(id => id !== opcaoId);
      } else {
        return [...prev, opcaoId];
      }
    });
  };

  const toggleOpcaoExpansion = (opcaoId: string) => {
    setExpandedOpcoesForm(prev => ({
      ...prev,
      [opcaoId]: !prev[opcaoId]
    }));
  };

  const handleSubmitUnidadeMedida = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!novaUnidadeMedida.sigla || !novaUnidadeMedida.nome) {
      showMessage('error', 'Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setIsLoadingUnidadeMedida(true);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) throw new Error('Empresa não encontrada');

      const { data, error } = await supabase
        .from('unidade_medida')
        .insert({
          sigla: novaUnidadeMedida.sigla,
          nome: novaUnidadeMedida.nome,
          empresa_id: usuarioData.empresa_id,
        })
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        // Adicionar a nova unidade à lista
        setUnidadesMedida([...unidadesMedida, data[0]]);

        // Selecionar a nova unidade no formulário de produto
        setNovoProduto({ ...novoProduto, unidade_medida_id: data[0].id });

        // Limpar o formulário e fechar
        setNovaUnidadeMedida({ sigla: '', nome: '' });
        setShowUnidadeMedidaForm(false);

        showMessage('success', 'Unidade de medida criada com sucesso');
      }
    } catch (error: any) {
      console.error('Erro ao salvar unidade de medida:', error);
      showMessage('error', 'Erro ao salvar unidade de medida');
    } finally {
      setIsLoadingUnidadeMedida(false);
    }
  };

  const loadTipoControleEstoque = async () => {
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
        .from('tipo_controle_estoque_config')
        .select('*')
        .eq('empresa_id', usuarioData.empresa_id)
        .single();

      if (error) {
        // Se o erro for "não encontrado", usamos o valor padrão 'pedidos'
        if (error.code === 'PGRST116') {
          // Criar uma nova configuração com valor padrão
          const { data: insertData, error: insertError } = await supabase
            .from('tipo_controle_estoque_config')
            .insert({
              empresa_id: usuarioData.empresa_id,
              tipo_controle: 'pedidos',
              bloqueia_sem_estoque: false
            })
            .select()
            .single();

          if (insertError) {
            setTipoControleEstoque('pedidos');
            // Marcar estoque como carregado mesmo em caso de erro
            setLoadingStates(prev => ({ ...prev, estoqueConfig: false }));
            return;
          }

          setTipoControleEstoque('pedidos');

          // Marcar estoque como carregado
          setLoadingStates(prev => ({ ...prev, estoqueConfig: false }));
          return;
        } else {
          setTipoControleEstoque('pedidos');
          // Marcar estoque como carregado mesmo em caso de erro
          setLoadingStates(prev => ({ ...prev, estoqueConfig: false }));
          return;
        }
      }

      if (data) {
        const novoTipoControle = data.tipo_controle as 'faturamento' | 'pedidos' | 'pdv';

        // Definir o tipo de controle correto
        setTipoControleEstoque(novoTipoControle);

        // Se o tipo de controle for 'faturamento', forçar a visualização para 'total'
        if (novoTipoControle === 'faturamento') {
          setTipoVisualizacaoEstoque('total');
        }
      } else {
        setTipoControleEstoque('pedidos');
      }

      // Marcar estoque como carregado
      setLoadingStates(prev => ({ ...prev, estoqueConfig: false }));
    } catch (error: any) {
      setTipoControleEstoque('pedidos');
      // Em caso de erro, marcar como carregado para não ficar em loading infinito
      setLoadingStates(prev => ({ ...prev, estoqueConfig: false }));
    }
  };

  const loadProdutosEstoque = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

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
        .eq('deletado', false);

      if (produtosError) throw produtosError;
      if (!produtosData || produtosData.length === 0) return;

      // Criar um objeto para armazenar as informações de estoque de cada produto
      const estoqueInfo: Record<string, { total: number, naoFaturado: number }> = {};

      // Para cada produto, calcular o estoque baseado nas movimentações (igual ao histórico)
      for (const produto of produtosData) {
        // Buscar todas as movimentações de estoque do produto
        const { data: movimentosData, error: movimentosError } = await supabase
          .from('produto_estoque')
          .select('tipo_movimento, quantidade')
          .eq('produto_id', produto.id)
          .eq('empresa_id', usuarioData.empresa_id)
          .order('data_hora_movimento', { ascending: true });

        if (movimentosError) {
          console.error(`Erro ao carregar movimentos do produto ${produto.id}:`, movimentosError);
          continue;
        }

        // Calcular o estoque atual baseado nas movimentações (igual ao histórico)
        let estoqueCalculado = 0;
        if (movimentosData) {
          movimentosData.forEach(movimento => {
            if (movimento.tipo_movimento === 'entrada') {
              estoqueCalculado += parseFloat(movimento.quantidade);
            } else {
              estoqueCalculado -= parseFloat(movimento.quantidade);
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

        // Armazenar as informações de estoque do produto usando o valor calculado
        estoqueInfo[produto.id] = {
          total: estoqueCalculado, // Agora usa o valor calculado das movimentações
          naoFaturado: quantidadeNaoFaturada
        };
      }

      // Atualizar o estado com as informações de estoque de todos os produtos
      setProdutosEstoque(estoqueInfo);
    } catch (error: any) {
      console.error('Erro ao carregar estoque dos produtos:', error);
    }
  };

  const loadAvailableOpcoes = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      const { data: opcoesData } = await supabase
        .from('opcoes_adicionais')
        .select(`
          *,
          itens:opcoes_adicionais_itens(*)
        `)
        .eq('empresa_id', usuarioData.empresa_id)
        .order('nome');

      // Filtrar apenas opções que têm pelo menos um item
      const opcoesComItens = (opcoesData || []).filter(opcao =>
        opcao.itens && opcao.itens.length > 0
      );

      setAvailableOpcoes(opcoesComItens);

      // Marcar opções como carregadas
      setLoadingStates(prev => ({ ...prev, opcoes: false }));
    } catch (error: any) {
      console.error('Error loading available options:', error);
      // Em caso de erro, marcar como carregado para não ficar em loading infinito
      setLoadingStates(prev => ({ ...prev, opcoes: false }));
    }
  };

  const loadGrupos = async () => {
    await withSessionCheck(async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (usuarioError) throw usuarioError;

      const { data: gruposData, error: gruposError } = await supabase
        .from('grupos')
        .select('*')
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('deletado', false);

      if (gruposError) throw gruposError;

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
        .eq('deletado', false)
        .eq('empresa_id', usuarioData.empresa_id);

      if (produtosError) throw produtosError;

      const { data: produtoOpcoesData, error: produtoOpcoesError } = await supabase
        .from('produtos_opcoes_adicionais')
        .select(`
          produto_id,
          opcao:opcoes_adicionais (
            id,
            nome,
            itens:opcoes_adicionais_itens (*)
          )
        `)
        .eq('deletado', false);

      if (produtoOpcoesError) throw produtoOpcoesError;

      const opcoesMap: Record<string, OpcaoAdicional[]> = {};
      produtoOpcoesData?.forEach((po: any) => {
        if (!opcoesMap[po.produto_id]) {
          opcoesMap[po.produto_id] = [];
        }
        if (po.opcao) {
          opcoesMap[po.produto_id].push(po.opcao);
        }
      });
      setProdutoOpcoes(opcoesMap);

      const gruposWithProdutos = gruposData.map(grupo => ({
        ...grupo,
        produtos: produtosData.filter(produto => produto.grupo_id === grupo.id) || []
      }));

      setGrupos(gruposWithProdutos);

      // Marcar grupos como carregados
      setLoadingStates(prev => ({ ...prev, grupos: false }));
    });
  };

  const getNextAvailableCode = async () => {
    try {
      // Obter a empresa_id do usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (usuarioError) throw usuarioError;

      // Buscar apenas produtos não deletados (deletado = false) da empresa atual
      const { data: produtos } = await supabase
        .from('produtos')
        .select('codigo')
        .eq('deletado', false)
        .eq('empresa_id', usuarioData.empresa_id)
        .order('codigo');

      if (!produtos || produtos.length === 0) return '1';

      // Converter códigos para números e filtrar valores não numéricos
      const codes = produtos.map(p => parseInt(p.codigo)).filter(c => !isNaN(c));

      if (codes.length === 0) return '1';

      // Encontrar o primeiro número disponível na sequência
      let nextCode = 1;
      while (codes.includes(nextCode)) {
        nextCode++;
      }

      return nextCode.toString();
    } catch (error) {
      console.error('Error getting next code:', error);
      return '1';
    }
  };

  // Função para formatar o preço no formato da moeda brasileira (sem o símbolo R$)
  const formatarPreco = (valor: number | null | undefined): string => {
    // Verificar se o valor é nulo ou indefinido
    if (valor === null || valor === undefined) {
      return '0,00';
    }

    // Usando toLocaleString sem o estilo 'currency' para evitar o símbolo R$
    return valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Função para converter o valor formatado para número
  const desformatarPreco = (valorFormatado: string): number => {
    // Remove todos os caracteres não numéricos, exceto a vírgula decimal
    // Primeiro remove qualquer símbolo R$ que possa ter sido digitado manualmente
    const semRS = valorFormatado.replace(/R\$\s?/g, '');
    // Depois remove todos os caracteres não numéricos, exceto a vírgula
    const valorLimpo = semRS.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(valorLimpo) || 0;
  };

  // Função para calcular o valor final com base no tipo de desconto
  const calcularValorFinal = (preco: number, tipoDesconto: 'percentual' | 'valor', valorDesconto: number): number => {
    if (tipoDesconto === 'percentual') {
      // Desconto percentual (ex: 10% de desconto)
      return preco - (preco * (valorDesconto / 100));
    } else {
      // Desconto em valor fixo (ex: R$ 10,00 de desconto)
      return Math.max(0, preco - valorDesconto); // Garante que o valor não seja negativo
    }
  };

  const handleAddGrupo = () => {
    setIsGrupoForm(true);
    setSelectedGrupo(null);
    setNovoGrupoNome('');
    setShowSidebar(true);
  };

  const handleEditGrupo = (grupo: Grupo) => {
    setIsGrupoForm(true);
    setSelectedGrupo(grupo);
    setNovoGrupoNome(grupo.nome);
    setShowSidebar(true);
  };

  const handleAddProduto = async (grupo: Grupo) => {
    setIsGrupoForm(false);
    setSelectedGrupo(grupo);
    setEditingProduto(null);
    setSelectedOpcoes([]);
    const nextCode = await getNextAvailableCode();

    // Verificar se há unidades de medida disponíveis
    // Importante: Não definimos uma unidade padrão aqui para evitar o problema
    const unidadeMedidaId = undefined;

    setNovoProduto({
      nome: '',
      preco: 0,
      descricao: '',
      codigo: nextCode,
      codigo_barras: '',
      promocao: false,
      tipo_desconto: 'percentual',
      valor_desconto: 0,
      ativo: true,
      unidade_medida_id: unidadeMedidaId,
      desconto_quantidade: false,
      quantidade_minima: 5,
      tipo_desconto_quantidade: 'percentual',
      percentual_desconto_quantidade: 10,
      valor_desconto_quantidade: 0,
      estoque_inicial: 0,
      estoque_minimo: 0,
      estoque_minimo_ativo: false,
      // Campos fiscais NFe com valores padrão
      ncm: '',
      cfop: '5102',
      origem_produto: 0,
      situacao_tributaria: 'tributado_integral',
      cst_icms: '',
      csosn_icms: '',
      cst_pis: '01',
      cst_cofins: '01',
      aliquota_icms: 0,
      aliquota_pis: 1.65,
      aliquota_cofins: 7.60,
      cest: '',
      peso_liquido: 0,
    });

    // Inicializa o preço formatado
    setPrecoFormatado(formatarPreco(0));

    // Inicializa o valor do desconto formatado
    setDescontoFormatado('0');

    // Inicializa o valor do desconto por quantidade formatado
    setDescontoQuantidadeFormatado('10');

    // Inicializa o estado do campo de estoque inicial
    setEstoqueInputVazio(false);

    // Resetar a flag de formulário resetado
    setFormularioResetado(false);

    // Resetar validação de NCM
    setNcmValidacao({
      validando: false,
      valido: null,
      descricao: '',
      erro: ''
    });

    setShowSidebar(true);
  };

  // Função para carregar os movimentos de estoque de um produto
  const loadEstoqueMovimentos = async (produtoId: string) => {
    if (!produtoId) return;

    setIsLoadingEstoque(true);
    try {
      // Obter a empresa_id do usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (usuarioError) throw usuarioError;

      // Buscar o estoque atual diretamente da tabela de produtos
      const { data: produtoData, error: produtoError } = await supabase
        .from('produtos')
        .select('estoque_atual')
        .eq('id', produtoId)
        .eq('empresa_id', usuarioData.empresa_id)
        .single();

      if (produtoError) throw produtoError;

      // Buscar todos os movimentos de estoque do produto
      const { data: movimentosData, error: movimentosError } = await supabase
        .from('produto_estoque')
        .select(`
          id,
          tipo_movimento,
          quantidade,
          data_hora_movimento,
          observacao,
          usuario:usuario_id (nome)
        `)
        .eq('produto_id', produtoId)
        .eq('empresa_id', usuarioData.empresa_id)
        .order('data_hora_movimento', { ascending: false });

      if (movimentosError) throw movimentosError;

      // Usar o estoque atual do banco de dados
      const estoqueAtualDB = parseFloat(produtoData.estoque_atual || '0');

      // Calcular o saldo histórico para cada movimento
      // Primeiro, vamos calcular o saldo correto baseado na ordem cronológica
      // Ordenar movimentos por data (mais antigo primeiro) para calcular saldo correto
      const movimentosOrdenados = [...movimentosData].reverse();

      let saldoAcumulado = 0;
      const movimentosComSaldoCorreto = movimentosOrdenados.map((movimento: any) => {
        // Aplicar o movimento ao saldo
        if (movimento.tipo_movimento === 'entrada') {
          saldoAcumulado += parseFloat(movimento.quantidade);
        } else {
          saldoAcumulado -= parseFloat(movimento.quantidade);
        }

        return {
          ...movimento,
          saldo: saldoAcumulado
        };
      });

      // Reverter para ordem original (mais recente primeiro)
      const movimentosComSaldo = movimentosComSaldoCorreto.reverse();

      // Calcular o estoque não faturado (pedidos pendentes)
      // Buscar pedidos pendentes que contêm este produto
      const { data: pedidosData, error: pedidosError } = await supabase
        .from('pedidos_itens')
        .select(`
          quantidade,
          pedido:pedido_id (
            status
          )
        `)
        .eq('produto_id', produtoId)
        .eq('empresa_id', usuarioData.empresa_id);

      if (pedidosError) throw pedidosError;

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

      setEstoqueMovimentos(movimentosComSaldo);
      setEstoqueAtual(estoqueAtualDB);
      setEstoqueNaoFaturado(quantidadeNaoFaturada);
    } catch (error: any) {
      showMessage('error', 'Erro ao carregar movimentos de estoque: ' + error.message);
    } finally {
      setIsLoadingEstoque(false);
    }
  };

  const handleEditProduto = async (grupo: Grupo, produto: Produto) => {
    // Primeiro, definir o estado para o formulário de produto (não de grupo)
    setIsGrupoForm(false);

    // Definir o grupo selecionado
    setSelectedGrupo(grupo);

    // Definir o produto que está sendo editado
    setEditingProduto(produto);

    // Definir o estado do novo produto com os valores do produto existente
    const produtoState = {
      nome: produto.nome,
      preco: produto.preco,
      descricao: produto.descricao,
      codigo: produto.codigo,
      codigo_barras: produto.codigo_barras || '',
      promocao: produto.promocao || false,
      tipo_desconto: produto.tipo_desconto || 'percentual',
      valor_desconto: produto.valor_desconto || 0,
      ativo: produto.ativo !== false, // Se não estiver definido, assume true
      unidade_medida_id: produto.unidade_medida_id,
      desconto_quantidade: produto.desconto_quantidade || false,
      quantidade_minima: produto.quantidade_minima || 5,
      tipo_desconto_quantidade: produto.tipo_desconto_quantidade || 'percentual',
      percentual_desconto_quantidade: produto.percentual_desconto_quantidade || 10,
      valor_desconto_quantidade: produto.valor_desconto_quantidade || 0,
      estoque_inicial: produto.estoque_inicial || 0,
      estoque_minimo: produto.estoque_minimo || 0,
      estoque_minimo_ativo: produto.estoque_minimo_ativo || false,
      // Campos fiscais NFe
      ncm: produto.ncm || '',
      cfop: produto.cfop || '5102',
      origem_produto: produto.origem_produto || 0,
      situacao_tributaria: produto.situacao_tributaria || 'tributado_integral',
      cst_icms: produto.cst_icms || '',
      csosn_icms: produto.csosn_icms || '',
      cst_pis: produto.cst_pis || '01',
      cst_cofins: produto.cst_cofins || '01',
      aliquota_icms: produto.aliquota_icms || 0,
      aliquota_pis: produto.aliquota_pis || 1.65,
      aliquota_cofins: produto.aliquota_cofins || 7.60,
      cest: produto.cest || '',
      peso_liquido: produto.peso_liquido || 0,
    };

    // Definir o estado do novo produto
    setNovoProduto(produtoState);

    // Definir o preço formatado
    setPrecoFormatado(formatarPreco(produto.preco));

    // Definir o desconto formatado
    if (produto.valor_desconto !== undefined) {
      if (produto.tipo_desconto === 'percentual') {
        setDescontoFormatado(produto.valor_desconto.toString());
      } else {
        setDescontoFormatado(formatarPreco(produto.valor_desconto));
      }
    }

    // Definir o desconto por quantidade formatado
    if (produto.tipo_desconto_quantidade === 'percentual' && produto.percentual_desconto_quantidade !== undefined) {
      setDescontoQuantidadeFormatado(produto.percentual_desconto_quantidade.toString());
    } else if (produto.tipo_desconto_quantidade === 'valor' && produto.valor_desconto_quantidade !== undefined) {
      setDescontoQuantidadeFormatado(formatarPreco(produto.valor_desconto_quantidade));
    }

    // Validar NCM se existir
    if (produto.ncm && produto.ncm.length === 8) {
      validarNCM(produto.ncm);
    } else {
      setNcmValidacao({
        validando: false,
        valido: null,
        descricao: '',
        erro: ''
      });
    }

    // Abrir o sidebar imediatamente
    setShowSidebar(true);

    try {
      const { data: opcoesData } = await supabase
        .from('produtos_opcoes_adicionais')
        .select('opcao_id')
        .eq('produto_id', produto.id);

      setSelectedOpcoes((opcoesData || []).map(o => o.opcao_id));

      // Carregar fotos do produto
      await loadProdutoFotos(produto.id);

      // Carregar movimentos de estoque do produto
      await loadEstoqueMovimentos(produto.id);
    } catch (error) {
      console.error('Error loading product options:', error);
    }
  };

  const loadProdutoFotos = async (produtoId: string) => {
    try {
      // Obter a empresa_id do usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (usuarioError) throw usuarioError;

      const { data: fotosData, error } = await supabase
        .from('produto_fotos')
        .select('*')
        .eq('produto_id', produtoId)
        .eq('empresa_id', usuarioData.empresa_id)
        .order('principal', { ascending: false });

      if (error) throw error;

      setProdutoFotos(fotosData || []);
    } catch (error) {
      console.error('Erro ao carregar fotos do produto:', error);
      showMessage('error', 'Erro ao carregar fotos do produto');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !editingProduto) return;

    // Verificar se já tem 3 fotos
    if (produtoFotos.length >= 3) {
      showMessage('error', 'Limite máximo de 3 fotos por produto');
      return;
    }

    setIsUploadingFoto(true);

    try {
      const file = files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `produtos/${editingProduto.id}/${fileName}`;

      // Upload para o storage
      const { error: uploadError } = await supabase.storage
        .from('fotos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('fotos')
        .getPublicUrl(filePath);

      if (!urlData) throw new Error('Erro ao obter URL da imagem');

      // Definir como principal se for a primeira foto
      const isPrincipal = produtoFotos.length === 0;

      // Obter a empresa_id do usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (usuarioError) throw usuarioError;
      if (!usuarioData?.empresa_id) throw new Error('Empresa não encontrada');

      // Salvar na tabela produto_fotos com os campos mínimos necessários
      const fotoObj = {
        produto_id: editingProduto.id,
        url: urlData.publicUrl,
        storage_path: filePath,
        principal: isPrincipal,
        empresa_id: usuarioData.empresa_id
      };

      // Inserir na tabela produto_fotos
      const { data: fotoData, error: fotoError } = await supabase
        .from('produto_fotos')
        .insert(fotoObj)
        .select()
        .single();

      if (fotoError) throw fotoError;

      // Atualizar a lista de fotos
      setProdutoFotos(prev => [...prev, fotoData]);

      // Se for a foto principal ou se é a primeira foto do produto, atualizar a lista de fotos principais
      if ((isPrincipal || produtoFotos.length === 0) && editingProduto) {
        // Atualizar imediatamente a foto principal na lista
        setProdutosFotosPrincipais(prev => ({
          ...prev,
          [editingProduto.id]: fotoData
        }));

        // Atualizar também a contagem de fotos
        setProdutosFotosCount(prev => ({
          ...prev,
          [editingProduto.id]: (prev[editingProduto.id] || 0) + 1
        }));

        // Forçar a atualização da lista de grupos para refletir a nova foto
        const grupoAtual = grupos.find(g => g.id === editingProduto.grupo_id);
        if (grupoAtual) {
          const gruposAtualizados = grupos.map(g => {
            if (g.id === grupoAtual.id) {
              // Atualizar o produto com a nova foto
              const produtosAtualizados = g.produtos.map(p => {
                if (p.id === editingProduto.id) {
                  return { ...p }; // Força a atualização do produto
                }
                return p;
              });
              return { ...g, produtos: produtosAtualizados };
            }
            return g;
          });

          // Atualizar os grupos para forçar a renderização
          setGrupos([...gruposAtualizados]);
        }
      } else if (editingProduto) {
        // Se não for a foto principal, apenas atualizar a contagem
        setProdutosFotosCount(prev => ({
          ...prev,
          [editingProduto.id]: (prev[editingProduto.id] || 0) + 1
        }));
      }

      // Definir um sinalizador no localStorage para notificar a versão mobile
      localStorage.setItem('produto_atualizado', JSON.stringify({
        timestamp: new Date().getTime(),
        produto_id: editingProduto.id,
        acao: 'foto_adicionada'
      }));

      showMessage('success', 'Foto adicionada com sucesso');
    } catch (error: any) {
      console.error('Erro ao fazer upload da foto:', error);
      showMessage('error', `Erro ao fazer upload da foto: ${error.message}`);
    } finally {
      setIsUploadingFoto(false);
      // Limpar o input de arquivo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSetFotoPrincipal = async (fotoId: string) => {
    if (!editingProduto) return;

    try {
      // Obter a empresa_id do usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (usuarioError) throw usuarioError;

      // Primeiro, remove a marcação de principal de todas as fotos
      await supabase
        .from('produto_fotos')
        .update({ principal: false })
        .eq('produto_id', editingProduto.id)
        .eq('empresa_id', usuarioData.empresa_id);

      // Depois, marca a foto selecionada como principal
      const { error } = await supabase
        .from('produto_fotos')
        .update({ principal: true })
        .eq('id', fotoId)
        .eq('empresa_id', usuarioData.empresa_id);

      if (error) throw error;

      // Atualiza a lista de fotos
      await loadProdutoFotos(editingProduto.id);

      // Buscar a foto principal atualizada diretamente do banco
      const fotoPrincipalAtualizada = await getProdutoFotoPrincipal(editingProduto.id);

      if (fotoPrincipalAtualizada) {
        // Atualizar a foto principal na lista de fotos principais
        setProdutosFotosPrincipais(prev => ({
          ...prev,
          [editingProduto.id]: fotoPrincipalAtualizada
        }));

        // Forçar a atualização da lista de grupos para refletir a nova foto principal
        const grupoAtual = grupos.find(g => g.id === editingProduto.grupo_id);
        if (grupoAtual) {
          const gruposAtualizados = grupos.map(g => {
            if (g.id === grupoAtual.id) {
              // Atualizar o produto com a nova foto principal
              const produtosAtualizados = g.produtos.map(p => {
                if (p.id === editingProduto.id) {
                  return { ...p }; // Força a atualização do produto
                }
                return p;
              });
              return { ...g, produtos: produtosAtualizados };
            }
            return g;
          });

          // Atualizar os grupos para forçar a renderização
          setGrupos([...gruposAtualizados]);
        }
      }

      // Definir um sinalizador no localStorage para notificar a versão mobile
      localStorage.setItem('produto_atualizado', JSON.stringify({
        timestamp: new Date().getTime(),
        produto_id: editingProduto.id,
        acao: 'foto_principal_alterada'
      }));

      showMessage('success', 'Foto principal definida com sucesso');
    } catch (error: any) {
      console.error('Erro ao definir foto principal:', error);
      showMessage('error', `Erro ao definir foto principal: ${error.message}`);
    }
  };

  const handleConfirmDeleteFoto = (foto: ProdutoFoto) => {
    setDeleteConfirmation({
      isOpen: true,
      type: 'foto',
      id: foto.id,
      fotoPath: foto.storage_path,
      title: 'Excluir Foto',
      message: 'Tem certeza que deseja excluir esta foto? Esta ação não poderá ser desfeita.',
    });
  };

  const handleOpenGaleria = (index: number) => {
    setCurrentFotoIndex(index);
    setIsGaleriaOpen(true);
  };

  // Função para registrar um novo movimento de estoque
  const handleRegistrarMovimentoEstoque = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingProduto) return;
    if (novoMovimento.quantidade <= 0) {
      showMessage('error', 'A quantidade deve ser maior que zero');
      return;
    }

    try {
      // Obter a empresa_id e o id do usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (usuarioError) throw usuarioError;

      // Verificar se há estoque suficiente para saída
      if (novoMovimento.tipo === 'saida' && novoMovimento.quantidade > estoqueAtual) {
        showMessage('error', 'Estoque insuficiente para esta saída');
        return;
      }

      // Calcular o novo valor de estoque
      const novoEstoque = novoMovimento.tipo === 'entrada'
        ? estoqueAtual + parseFloat(novoMovimento.quantidade.toString())
        : estoqueAtual - parseFloat(novoMovimento.quantidade.toString());

      // Registrar o movimento
      const { error: movimentoError } = await supabase
        .from('produto_estoque')
        .insert([{
          empresa_id: usuarioData.empresa_id,
          usuario_id: userData.user.id,
          produto_id: editingProduto.id,
          tipo_movimento: novoMovimento.tipo,
          quantidade: novoMovimento.quantidade,
          data_hora_movimento: new Date().toISOString(),
          observacao: novoMovimento.observacao || (novoMovimento.tipo === 'entrada' ? 'Entrada de estoque' : 'Saída de estoque')
        }]);

      if (movimentoError) throw movimentoError;

      // Atualizar o estoque atual na tabela de produtos
      const { error: updateError } = await supabase
        .from('produtos')
        .update({ estoque_atual: novoEstoque })
        .eq('id', editingProduto.id)
        .eq('empresa_id', usuarioData.empresa_id);

      if (updateError) throw updateError;

      // Atualizar o estado local do estoque atual imediatamente
      setEstoqueAtual(novoEstoque);

      // Recarregar os movimentos
      await loadEstoqueMovimentos(editingProduto.id);

      // Atualizar o estoque na grid
      await loadProdutosEstoque();

      // Limpar o formulário
      setNovoMovimento({
        tipo: 'entrada',
        quantidade: 0,
        observacao: ''
      });

      // Resetar o estado de campo vazio
      setQuantidadeMovimentoVazia(false);

      showMessage('success', `${novoMovimento.tipo === 'entrada' ? 'Entrada' : 'Saída'} de estoque registrada com sucesso!`);
    } catch (error: any) {
      console.error('Erro ao registrar movimento de estoque:', error);
      showMessage('error', 'Erro ao registrar movimento de estoque: ' + error.message);
    }
  };

  const handleDeleteFoto = async () => {
    if (!deleteConfirmation.id || !deleteConfirmation.fotoPath) return;

    try {
      // Obter a empresa_id do usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (usuarioError) throw usuarioError;

      // Primeiro, exclui o registro do banco de dados
      const { error: dbError } = await supabase
        .from('produto_fotos')
        .delete()
        .eq('id', deleteConfirmation.id)
        .eq('empresa_id', usuarioData.empresa_id);

      if (dbError) throw dbError;

      // Depois, exclui o arquivo do storage
      const { error: storageError } = await supabase.storage
        .from('fotos')
        .remove([deleteConfirmation.fotoPath]);

      if (storageError) throw storageError;

      // Atualiza a lista de fotos
      if (editingProduto) {
        // Guardar referência à foto excluída antes de recarregar
        const fotoDeletada = produtoFotos.find(f => f.id === deleteConfirmation.id);
        const eraPrincipal = fotoDeletada?.principal || false;

        // Recarregar a lista de fotos
        await loadProdutoFotos(editingProduto.id);

        // Atualizar a contagem de fotos
        setProdutosFotosCount(prev => ({
          ...prev,
          [editingProduto.id]: Math.max(0, (prev[editingProduto.id] || 1) - 1)
        }));

        // Verificar se a foto excluída era a principal
        if (eraPrincipal) {
          // Recarregar as fotos após a exclusão para ter a lista atualizada
          await loadProdutoFotos(editingProduto.id);

          // Verificar se ainda há fotos após a exclusão
          const fotosRestantes = produtoFotos.filter(f => f.id !== deleteConfirmation.id);

          if (fotosRestantes.length > 0) {
            // Se há fotos restantes, definir a primeira como principal
            const novaFotoPrincipal = fotosRestantes[0];
            await handleSetFotoPrincipal(novaFotoPrincipal.id);
          } else {
            // Se não houver mais fotos, remover a foto principal
            setProdutosFotosPrincipais(prev => ({
              ...prev,
              [editingProduto.id]: null
            }));
          }
        }

        // Forçar a atualização da lista de grupos para refletir a mudança
        const grupoAtual = grupos.find(g => g.id === editingProduto.grupo_id);
        if (grupoAtual) {
          const gruposAtualizados = grupos.map(g => {
            if (g.id === grupoAtual.id) {
              // Atualizar o produto
              const produtosAtualizados = g.produtos.map(p => {
                if (p.id === editingProduto.id) {
                  return { ...p }; // Força a atualização do produto
                }
                return p;
              });
              return { ...g, produtos: produtosAtualizados };
            }
            return g;
          });

          // Atualizar os grupos para forçar a renderização
          setGrupos([...gruposAtualizados]);
        }
      }

      // Definir um sinalizador no localStorage para notificar a versão mobile
      localStorage.setItem('produto_atualizado', JSON.stringify({
        timestamp: new Date().getTime(),
        produto_id: editingProduto.id,
        acao: 'foto_excluida'
      }));

      showMessage('success', 'Foto excluída com sucesso');
    } catch (error: any) {
      console.error('Erro ao excluir foto:', error);
      showMessage('error', `Erro ao excluir foto: ${error.message}`);
    } finally {
      setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleSubmitGrupo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoGrupoNome.trim()) return;

    setIsLoading(true);
    try {
      const { data: userData } =await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (usuarioError) throw usuarioError;

      if (selectedGrupo) {
        const { data, error } = await supabase
          .from('grupos')
          .update({ nome: novoGrupoNome })
          .eq('id', selectedGrupo.id)
          .select()
          .single();

        if (error) throw error;

        setGrupos(grupos.map(grupo =>
          grupo.id === selectedGrupo.id
            ? { ...data, produtos: grupo.produtos }
            : grupo
        ));
        showMessage('success', 'Grupo atualizado com sucesso!');
      } else {
        const { data, error } = await supabase
          .from('grupos')
          .insert([{
            nome: novoGrupoNome,
            empresa_id: usuarioData.empresa_id
          }])
          .select()
          .single();

        if (error) throw error;

        setGrupos([...grupos, { ...data, produtos: [] }]);
        showMessage('success', 'Grupo criado com sucesso!');
      }

      setShowSidebar(false);
    } catch (error: any) {
      showMessage('error', `Erro ao ${selectedGrupo ? 'atualizar' : 'criar'} grupo: ` + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitProduto = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedGrupo || !novoProduto.nome || !novoProduto.preco || !novoProduto.codigo || !novoProduto.unidade_medida_id) {
      showMessage('error', 'Preencha todos os campos obrigatórios');
      return;
    }

    // Validar se o produto em promoção tem um valor de desconto maior que zero
    if (novoProduto.promocao) {
      if (!novoProduto.valor_desconto || novoProduto.valor_desconto <= 0) {
        showMessage('error', 'Para produtos em promoção, é necessário informar um valor de desconto maior que zero');
        return;
      }
    }

    // Validar se o produto com desconto por quantidade tem um valor de desconto maior que zero
    if (novoProduto.desconto_quantidade) {
      if ((novoProduto.tipo_desconto_quantidade === 'percentual' &&
          (!novoProduto.percentual_desconto_quantidade || novoProduto.percentual_desconto_quantidade <= 0)) ||
          (novoProduto.tipo_desconto_quantidade === 'valor' &&
          (!novoProduto.valor_desconto_quantidade || novoProduto.valor_desconto_quantidade <= 0))) {
        showMessage('error', 'Para produtos com desconto por quantidade, é necessário informar um valor de desconto maior que zero');
        return;
      }

      if (!novoProduto.quantidade_minima || novoProduto.quantidade_minima <= 0) {
        showMessage('error', 'Para produtos com desconto por quantidade, é necessário informar uma quantidade mínima maior que zero');
        return;
      }
    }

    // Validar se o produto com estoque mínimo ativo tem um valor válido
    if (novoProduto.estoque_minimo_ativo) {
      if (!novoProduto.estoque_minimo || novoProduto.estoque_minimo <= 0) {
        showMessage('error', 'Para produtos com controle de estoque mínimo ativo, é necessário informar uma quantidade mínima maior que zero');
        return;
      }
    }



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

      // Validações de duplicatas (apenas para produtos não deletados)
      // Construir query base para verificar duplicatas
      let query = supabase
        .from('produtos')
        .select('id, nome, codigo, codigo_barras')
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('deletado', false); // Apenas produtos não deletados

      // Se estiver editando, excluir o produto atual da verificação
      if (editingProduto) {
        query = query.neq('id', editingProduto.id);
      }

      const { data: produtosExistentes, error: queryError } = await query;

      if (queryError) throw queryError;

      // Verificar duplicatas
      const duplicatas = [];

      // Verificar nome duplicado
      const nomeDuplicado = produtosExistentes?.find(p =>
        p.nome.toLowerCase().trim() === novoProduto.nome?.toLowerCase().trim()
      );
      if (nomeDuplicado) {
        duplicatas.push('Nome do produto');
      }

      // Verificar código duplicado
      const codigoDuplicado = produtosExistentes?.find(p =>
        p.codigo === novoProduto.codigo
      );
      if (codigoDuplicado) {
        duplicatas.push('Código do produto');
      }

      // Verificar código de barras duplicado (apenas se foi informado)
      if (novoProduto.codigo_barras && novoProduto.codigo_barras.trim() !== '') {
        const codigoBarrasDuplicado = produtosExistentes?.find(p =>
          p.codigo_barras && p.codigo_barras === novoProduto.codigo_barras
        );
        if (codigoBarrasDuplicado) {
          duplicatas.push('Código de barras');
        }
      }

      // Se houver duplicatas, mostrar mensagem de erro
      if (duplicatas.length > 0) {
        const mensagem = duplicatas.length === 1
          ? `${duplicatas[0]} já existe em outro produto. Por favor, corrija antes de continuar.`
          : `Os seguintes campos já existem em outros produtos: ${duplicatas.join(', ')}. Por favor, corrija antes de continuar.`;

        showMessage('error', mensagem);
        setIsLoading(false);
        return;
      }

      let productId: string;

      if (editingProduto) {

        const updateData = {
          nome: novoProduto.nome,
          preco: novoProduto.preco,
          descricao: novoProduto.descricao,
          codigo: novoProduto.codigo,
          codigo_barras: novoProduto.codigo_barras,
          promocao: novoProduto.promocao,
          tipo_desconto: novoProduto.promocao ? novoProduto.tipo_desconto : null,
          valor_desconto: novoProduto.promocao ? novoProduto.valor_desconto : null,
          ativo: novoProduto.ativo,
          unidade_medida_id: novoProduto.unidade_medida_id,
          desconto_quantidade: novoProduto.desconto_quantidade,
          quantidade_minima: novoProduto.desconto_quantidade ? novoProduto.quantidade_minima : null,
          tipo_desconto_quantidade: novoProduto.desconto_quantidade ? novoProduto.tipo_desconto_quantidade : null,
          valor_desconto_quantidade: novoProduto.desconto_quantidade && novoProduto.tipo_desconto_quantidade === 'valor' ? novoProduto.valor_desconto_quantidade : null,
          percentual_desconto_quantidade: novoProduto.desconto_quantidade && novoProduto.tipo_desconto_quantidade === 'percentual' ? novoProduto.percentual_desconto_quantidade : null,
          // Incluir os campos de estoque mínimo
          estoque_minimo: novoProduto.estoque_minimo_ativo ? (novoProduto.estoque_minimo || 0) : 0,
          estoque_minimo_ativo: novoProduto.estoque_minimo_ativo || false,
          empresa_id: usuarioData.empresa_id
        };

        const { data, error } = await supabase
          .from('produtos')
          .update(updateData)
          .eq('id', editingProduto.id)
          .select()
          .single();

        if (error) throw error;
        productId = data.id;

        await supabase
          .from('produtos_opcoes_adicionais')
          .delete()
          .eq('produto_id', productId);
      } else {
        // Preparar os dados do produto com os novos campos
        const produtoData = {
          ...novoProduto,
          grupo_id: selectedGrupo.id,
          empresa_id: usuarioData.empresa_id,
          // Garantir que os campos de desconto por quantidade sejam null quando não habilitados
          quantidade_minima: novoProduto.desconto_quantidade ? novoProduto.quantidade_minima : null,
          tipo_desconto_quantidade: novoProduto.desconto_quantidade ? novoProduto.tipo_desconto_quantidade : null,
          valor_desconto_quantidade: novoProduto.desconto_quantidade && novoProduto.tipo_desconto_quantidade === 'valor' ? novoProduto.valor_desconto_quantidade : null,
          percentual_desconto_quantidade: novoProduto.desconto_quantidade && novoProduto.tipo_desconto_quantidade === 'percentual' ? novoProduto.percentual_desconto_quantidade : null,
          // Garantir que os campos de promoção sejam null quando não habilitados
          tipo_desconto: novoProduto.promocao ? novoProduto.tipo_desconto : null,
          valor_desconto: novoProduto.promocao ? novoProduto.valor_desconto : null,
          // Incluir o estoque inicial e definir o estoque atual como 0 (será atualizado pela movimentação)
          estoque_inicial: novoProduto.estoque_inicial || 0,
          estoque_atual: 0,
          // Incluir os campos de estoque mínimo
          estoque_minimo: novoProduto.estoque_minimo_ativo ? (novoProduto.estoque_minimo || 0) : 0,
          estoque_minimo_ativo: novoProduto.estoque_minimo_ativo || false,
        };

        const { data, error } = await supabase
          .from('produtos')
          .insert([produtoData])
          .select()
          .single();

        if (error) throw error;
        productId = data.id;

        // Se tiver estoque inicial, criar um registro na tabela produto_estoque e atualizar o estoque_atual
        if (novoProduto.estoque_inicial && novoProduto.estoque_inicial > 0) {
          const { error: estoqueError } = await supabase
            .from('produto_estoque')
            .insert([{
              empresa_id: usuarioData.empresa_id,
              usuario_id: userData.user.id,
              produto_id: productId,
              tipo_movimento: 'entrada',
              quantidade: novoProduto.estoque_inicial,
              data_hora_movimento: new Date().toISOString(),
              observacao: 'Estoque inicial'
            }]);

          if (estoqueError) {
            console.error('Erro ao registrar estoque inicial:', estoqueError);
            // Não interrompe o fluxo, apenas loga o erro
          } else {
            // Atualizar o estoque_atual do produto com o estoque inicial
            const { error: updateEstoqueError } = await supabase
              .from('produtos')
              .update({ estoque_atual: novoProduto.estoque_inicial })
              .eq('id', productId)
              .eq('empresa_id', usuarioData.empresa_id);

            if (updateEstoqueError) {
              console.error('Erro ao atualizar estoque atual:', updateEstoqueError);
            }
          }
        }
      }

      if (selectedOpcoes.length > 0) {
        const opcoesInsert = selectedOpcoes.map(opcaoId => ({
          produto_id: productId,
          opcao_id: opcaoId,
          empresa_id: usuarioData.empresa_id
        }));

        const { error: opcoesError } = await supabase
          .from('produtos_opcoes_adicionais')
          .insert(opcoesInsert);

        if (opcoesError) throw opcoesError;
      }

      await loadGrupos();

      // Atualizar o estoque na grid imediatamente após criar o produto
      await loadProdutosEstoque();

      // Se for um novo produto com estoque inicial, atualizar o estado local imediatamente
      if (!editingProduto && novoProduto.estoque_inicial && novoProduto.estoque_inicial > 0) {
        setProdutosEstoque(prev => ({
          ...prev,
          [productId]: {
            total: novoProduto.estoque_inicial,
            naoFaturado: 0
          }
        }));
      }

      // Definir um sinalizador no localStorage para notificar a versão mobile
      localStorage.setItem('produto_atualizado', JSON.stringify({
        timestamp: new Date().getTime(),
        produto_id: productId,
        acao: editingProduto ? 'atualizado' : 'criado'
      }));

      console.log(`Produto ${editingProduto ? 'atualizado' : 'criado'} com sucesso! Sinalizador definido para versão mobile.`);

      if (editingProduto) {
        showMessage('success', 'Produto atualizado com sucesso!');
        setShowSidebar(false);
      } else {
        // Se for um novo produto, mantém o sidebar aberto e muda para a aba de fotos
        showMessage('success', 'Produto adicionado com sucesso! Agora você pode adicionar fotos.');

        // Atualiza o editingProduto com o produto recém-criado
        const novoProdutoCriado = {
          ...novoProduto,
          id: productId,
          grupo_id: selectedGrupo.id,
          empresa_id: usuarioData.empresa_id,
          created_at: new Date().toISOString()
        };

        setEditingProduto(novoProdutoCriado);

        // Carrega os movimentos de estoque para o novo produto
        // Isso garante que o estoque inicial seja exibido na aba de estoque
        await loadEstoqueMovimentos(productId);

        // Muda para a aba de fotos
        setActiveTab('fotos');
      }
    } catch (error: any) {
      console.error('=== ERRO NO SUBMIT ===');
      console.error('Erro completo:', error);
      console.error('Mensagem do erro:', error.message);
      console.error('Stack trace:', error.stack);
      showMessage('error', `Erro ao ${editingProduto ? 'atualizar' : 'criar'} produto: ` + error.message);
    } finally {
      console.log('=== FINALIZANDO SUBMIT ===');
      setIsLoading(false);
    }
  };

  const handleDeleteGrupo = async (grupoId: string) => {
    const grupo = grupos.find(g => g.id === grupoId);
    if (!grupo) return;

    if (grupo.produtos.length > 0) {
      setWarningMessage('Não é possível excluir este grupo pois ele contém produtos. Remova todos os produtos primeiro.');
      setShowWarning(true);
      return;
    }

    setDeleteConfirmation({
      isOpen: true,
      type: 'grupo',
      id: grupoId,
      title: 'Excluir Grupo',
      message: 'Tem certeza que deseja excluir este grupo? Você poderá restaurá-lo posteriormente se necessário.',
    });
  };

  const handleDeleteProduto = async (produtoId: string, grupoId: string) => {
    const { data: addons } = await supabase
      .from('produtos_opcoes_adicionais')
      .select('id')
      .eq('produto_id', produtoId);

    if (addons && addons.length > 0) {
      setWarningMessage('Este produto possui opções adicionais vinculadas. Remova todas as opções adicionais primeiro.');
      setShowWarning(true);
      return;
    }

    setDeleteConfirmation({
      isOpen: true,
      type: 'produto',
      id: produtoId,
      grupoId,
      title: 'Excluir Produto',
      message: 'Tem certeza que deseja excluir este produto? Você poderá restaurá-lo posteriormente se necessário.',
    });
  };

  const handleConfirmDelete = async () => {
    try {
      // Obter dados do usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const now = new Date().toISOString();

      if (deleteConfirmation.type === 'grupo') {
        const { error } = await supabase
          .from('grupos')
          .update({
            deletado: true,
            deletado_em: now,
            deletado_por: userData.user.id
          })
          .eq('id', deleteConfirmation.id);

        if (error) throw error;

        setGrupos(grupos.filter(g => g.id !== deleteConfirmation.id));
        showMessage('success', 'Grupo excluído com sucesso!');
      } else if (deleteConfirmation.type === 'produto') {
        const { error } = await supabase
          .from('produtos')
          .update({
            deletado: true,
            deletado_em: now,
            deletado_por: userData.user.id
          })
          .eq('id', deleteConfirmation.id);

        if (error) throw error;

        setGrupos(grupos.map(grupo =>
          grupo.id === deleteConfirmation.grupoId
            ? { ...grupo, produtos: grupo.produtos.filter(p => p.id !== deleteConfirmation.id) }
            : grupo
        ));

        // Definir um sinalizador no localStorage para notificar a versão mobile
        localStorage.setItem('produto_atualizado', JSON.stringify({
          timestamp: new Date().getTime(),
          produto_id: deleteConfirmation.id,
          acao: 'excluido'
        }));

        console.log(`Produto excluído com sucesso! Sinalizador definido para versão mobile.`);

        showMessage('success', 'Produto excluído com sucesso!');
      } else if (deleteConfirmation.type === 'foto') {
        await handleDeleteFoto();
      }
    } catch (error: any) {
      showMessage('error', `Erro ao excluir ${deleteConfirmation.type}: ` + error.message);
    } finally {
      setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleRemoveAdicional = async (produtoId: string, opcaoId: string) => {
    try {
      // Obter dados do usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const now = new Date().toISOString();

      const { error } = await supabase
        .from('produtos_opcoes_adicionais')
        .update({
          deletado: true,
          deletado_em: now,
          deletado_por: userData.user.id
        })
        .eq('produto_id', produtoId)
        .eq('opcao_id', opcaoId);

      if (error) throw error;

      setProdutoOpcoes(prev => ({
        ...prev,
        [produtoId]: prev[produtoId].filter(opcao => opcao.id !== opcaoId)
      }));

      showMessage('success', 'Adicional removido com sucesso!');
    } catch (error: any) {
      showMessage('error', 'Erro ao remover adicional: ' + error.message);
    }
  };

  const toggleOpcao = (produtoId: string, opcaoId: string) => {
    const key = `${produtoId}-${opcaoId}`;
    setExpandedOpcoes(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleProductSearch = (grupoId: string, searchTerm: string) => {
    setProductSearchTerms(prev => ({
      ...prev,
      [grupoId]: searchTerm
    }));
  };

  const toggleProductSortOrder = (grupoId: string) => {
    setProductSortOrders(prev => ({
      ...prev,
      [grupoId]: (prev[grupoId] || 'asc') === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Função para resetar o formulário de produto
  const resetFormularioProduto = () => {
    // Não definimos o estado novoProduto aqui para evitar problemas com a unidade de medida
    // Isso será feito na função handleAddProduto quando o formulário for aberto novamente

    // Resetar outros estados relacionados ao formulário
    setPrecoFormatado(formatarPreco(0));
    setDescontoFormatado('0');
    setDescontoQuantidadeFormatado('10');
    setEstoqueInputVazio(false);
    setQuantidadeMinimaVazia(false);
    setEstoqueMinimoVazio(false);
    setEditingProduto(null);
    setSelectedOpcoes([]);
    setActiveTab('dados');
    setProdutoFotos([]);

    // Resetar validação de NCM
    setNcmValidacao({
      validando: false,
      valido: null,
      descricao: '',
      erro: ''
    });

    // Definir uma flag para indicar que o formulário foi resetado
    setFormularioResetado(true);
  };

  const handleOpcaoChange = (opcaoId: string) => {
    setSelectedOpcoes(prev => {
      if (prev.includes(opcaoId)) {
        return prev.filter(id => id !== opcaoId);
      } else {
        return [...prev, opcaoId];
      }
    });
  };

  const filteredAndSortedGrupos = grupos
    .filter(grupo =>
      grupo.nome.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const comparison = a.nome.localeCompare(b.nome);
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const getFilteredAndSortedProducts = (grupo: Grupo) => {
    const searchTerm = productSearchTerms[grupo.id] || '';
    const sortOrder = productSortOrders[grupo.id] || 'asc';

    return grupo.produtos
      .filter(produto =>
        produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        produto.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (produto.codigo_barras && produto.codigo_barras.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a, b) => {
        const comparison = a.nome.localeCompare(b.nome);
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  };

  const renderProdutoOpcoes = (produto: Produto) => {
    if (!produtoOpcoes[produto.id]?.length) return null;

    return (
      <div className="mt-2 pt-2 border-t border-gray-700/50">
        <p className="text-xs font-medium text-gray-400 mb-1.5">Adicionais:</p>
        <div className="space-y-1.5">
          {produtoOpcoes[produto.id].map((opcao) => (
            <div
              key={opcao.id}
              className="bg-gray-700/30 rounded overflow-hidden"
            >
              <div
                className="flex items-center justify-between p-1.5 cursor-pointer hover:bg-gray-700/50 transition-colors"
                onClick={() => toggleOpcao(produto.id, opcao.id)}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-white font-medium">{opcao.nome}</span>
                  <span className="text-xs text-gray-400">
                    ({opcao.itens.length} {opcao.itens.length === 1 ? 'item' : 'itens'})
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveAdicional(produto.id, opcao.id);
                    }}
                    className="text-red-400 hover:text-red-300 p-0.5"
                  >
                    <X size={12} />
                  </button>
                  {expandedOpcoes[`${produto.id}-${opcao.id}`] ? (
                    <ChevronUp size={14} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={14} className="text-gray-400" />
                  )}
                </div>
              </div>

              <AnimatePresence>
                {expandedOpcoes[`${produto.id}-${opcao.id}`] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-gray-700"
                  >
                    <div className="p-1.5 space-y-0.5">
                      {opcao.itens.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between px-1.5 py-0.5 rounded bg-gray-700/30"
                        >
                          <span className="text-xs text-gray-300">{item.nome}</span>
                          <span className="text-xs text-primary-400 font-medium">
                            {formatarPreco(item.preco)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Função para buscar a foto principal do produto
  const getProdutoFotoPrincipal = async (produtoId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return null;

      const { data: fotosData } = await supabase
        .from('produto_fotos')
        .select('*')
        .eq('produto_id', produtoId)
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('principal', true)
        .limit(1);

      return fotosData && fotosData.length > 0 ? fotosData[0] : null;
    } catch (error) {
      console.error('Erro ao buscar foto principal:', error);
      return null;
    }
  };

  // Estado para armazenar as fotos principais dos produtos
  const [produtosFotosPrincipais, setProdutosFotosPrincipais] = useState<Record<string, ProdutoFoto | null>>({});

  // Estado para armazenar a contagem de fotos por produto
  const [produtosFotosCount, setProdutosFotosCount] = useState<Record<string, number>>({});

  // Função para carregar as fotos principais de todos os produtos
  const loadProdutosFotosPrincipais = async (produtos: Produto[]) => {
    const fotosMap: Record<string, ProdutoFoto | null> = {};

    for (const produto of produtos) {
      const foto = await getProdutoFotoPrincipal(produto.id);
      fotosMap[produto.id] = foto;
    }

    setProdutosFotosPrincipais(fotosMap);
  };

  // Função para carregar a contagem de fotos de cada produto
  const loadProdutosFotosCount = async (produtos: Produto[]) => {
    try {
      // Obter a empresa_id do usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

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

  // Carregar fotos principais quando os produtos mudarem
  useEffect(() => {
    const allProdutos = grupos.flatMap(grupo => grupo.produtos);
    if (allProdutos.length > 0) {
      loadProdutosFotosPrincipais(allProdutos);
      loadProdutosFotosCount(allProdutos);
    }
  }, [grupos]);

  const handleOpenProdutoGaleria = async (produto: Produto) => {
    // Carregar todas as fotos do produto
    await loadProdutoFotos(produto.id);

    // Abrir a galeria com a primeira foto
    if (produtoFotos.length > 0) {
      setCurrentFotoIndex(0);
      setIsGaleriaOpen(true);
    } else {
      showMessage('info', 'Este produto não possui fotos');
    }
  };

  // Função para formatar o estoque baseado na unidade de medida
  const formatarEstoque = (valor: number, produto: Produto) => {
    // Encontrar a unidade de medida do produto
    const unidadeMedida = unidadesMedida.find(u => u.id === produto.unidade_medida_id);

    // Se for KG, mostrar 3 casas decimais, senão mostrar como número inteiro
    if (unidadeMedida?.sigla === 'KG') {
      return valor.toFixed(3);
    } else {
      return Math.floor(valor).toString();
    }
  };

  const renderProduto = (grupo: Grupo, produto: Produto) => {
    const fotoPrincipal = produtosFotosPrincipais[produto.id];
    const unidadeMedida = unidadesMedida.find(u => u.id === produto.unidade_medida_id);

    // Calcular o valor final se o produto estiver em promoção
    let valorFinal = produto.preco;
    let descontoExibicao = '';

    if (produto.promocao && produto.tipo_desconto && produto.valor_desconto !== undefined) {
      valorFinal = calcularValorFinal(
        produto.preco,
        produto.tipo_desconto,
        produto.valor_desconto
      );

      // Formatar o desconto para exibição
      if (produto.tipo_desconto === 'percentual') {
        descontoExibicao = `${produto.valor_desconto}% OFF`;
      } else {
        descontoExibicao = `- R$ ${formatarPreco(produto.valor_desconto)}`;
      }
    }

    // Obter informações de estoque
    const estoqueInfo = produtosEstoque[produto.id] || { total: 0, naoFaturado: 0 };

    return (
      <div
        key={produto.id}
        className={`p-2.5 bg-gray-800/50 rounded ${produto.ativo === false ? 'opacity-60' : ''}`}
      >
        {/* Layout em três colunas - Compacto */}
        <div className="flex items-start gap-3">
          {/* Coluna Esquerda - Foto e Nome */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Foto principal do produto */}
            <div
              className="w-16 h-16 rounded overflow-hidden bg-gray-700 flex-shrink-0 cursor-pointer relative"
              onClick={() => handleOpenProdutoGaleria(produto)}
            >
              {fotoPrincipal ? (
                <img
                  src={fotoPrincipal.url}
                  alt={produto.nome}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  <Image size={16} />
                </div>
              )}

              {/* Contador de fotos */}
              {produtosFotosCount[produto.id] > 0 && (
                <div className="absolute top-0.5 right-0.5 bg-background-dark px-1 py-0.5 rounded-full text-xs font-medium text-white">
                  {produtosFotosCount[produto.id]}
                </div>
              )}
            </div>

            {/* Nome e códigos */}
            <div className="flex-1 min-w-0">
              <h4 className="text-white font-medium text-sm truncate">{produto.nome}</h4>
              <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                <span>Código {produto.codigo}</span>
                {produto.codigo_barras && produto.codigo_barras.trim() !== '' && (
                  <div className="flex items-center gap-1">
                    <QrCode size={10} className="text-gray-500" />
                    <span>{produto.codigo_barras}</span>
                  </div>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1 mt-1">
                {produto.promocao && (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-green-500/20 text-green-400 rounded-full">
                    Promoção
                  </span>
                )}
                {produto.ativo === false && (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded-full">
                    Inativo
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Coluna Central - Preços e Informações */}
          <div className="flex-1 min-w-0">
            {/* Preços */}
            <div className="flex items-center gap-2 mb-0.5">
              {produto.promocao && produto.tipo_desconto && produto.valor_desconto !== undefined ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-gray-400 line-through">
                      R$ {produto.preco.toFixed(2)}
                    </p>
                    {unidadeMedida && (
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-primary-500/10 text-primary-400 rounded-full">
                        {unidadeMedida.sigla}
                      </span>
                    )}
                  </div>
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-green-500/20 text-green-400 rounded-full">
                    {descontoExibicao}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <p className="text-sm text-primary-400 font-medium">
                    R$ {produto.preco.toFixed(2)}
                  </p>
                  {unidadeMedida && (
                    <span className="px-1.5 py-0.5 text-xs font-medium bg-primary-500/10 text-primary-400 rounded-full">
                      {unidadeMedida.sigla}
                    </span>
                  )}
                </div>
              )}
            </div>

            {produto.promocao && produto.tipo_desconto && produto.valor_desconto !== undefined && (
              <div className="flex items-center gap-1 mb-0.5">
                <p className="text-sm text-green-400 font-medium">
                  Valor final: R$ {valorFinal.toFixed(2)}
                </p>
                {unidadeMedida && (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-primary-500/10 text-primary-400 rounded-full">
                    {unidadeMedida.sigla}
                  </span>
                )}
              </div>
            )}

            {/* Badges de desconto */}
            <div className="flex flex-wrap items-center gap-1 mb-0.5">
              {produto.desconto_quantidade && (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full">
                  Desconto {produto.quantidade_minima}+
                </span>
              )}
            </div>

            {/* Estoque */}
            {estoqueInfo && (
              <div className="flex flex-wrap items-center gap-1 mb-0.5">
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-700 text-gray-300">
                  Estoque: {formatarEstoque(estoqueInfo.total, produto)}
                </span>
                {tipoControleEstoque === 'pedidos' && estoqueInfo.naoFaturado > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-900/30 text-yellow-400">
                    Não Faturado: {formatarEstoque(estoqueInfo.naoFaturado, produto)}
                  </span>
                )}
              </div>
            )}

            {/* Descrição */}
            {produto.descricao && (
              <p className="text-xs text-gray-400 truncate">
                {produto.descricao}
              </p>
            )}
          </div>

          {/* Coluna Direita - Ações */}
          <div className="flex items-center gap-1">
            <button
              className="p-1.5 text-gray-400 hover:text-white transition-colors rounded"
              onClick={() => {
                console.log('Botão de edição clicado para produto:', produto);
                handleEditProduto(grupo, produto);
              }}
              title="Editar produto"
            >
              <Pencil size={14} />
            </button>
            <button
              className="p-1.5 text-red-400 hover:text-red-300 transition-colors rounded"
              onClick={() => handleDeleteProduto(produto.id, grupo.id)}
              title="Excluir produto"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Opções do produto - Largura completa */}
        {renderProdutoOpcoes(produto)}
      </div>
    );
  };

  // Renderizar skeleton loader para grupos e produtos
  const renderSkeletonGroups = () => {
    return Array(3).fill(0).map((_, groupIndex) => (
      <div key={groupIndex} className="bg-background-card rounded-lg border border-gray-800">
        {/* Skeleton do cabeçalho do grupo */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="h-6 w-32 bg-gray-700 rounded animate-pulse"></div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-28 bg-gray-700 rounded animate-pulse"></div>
            <div className="h-8 w-8 bg-gray-700 rounded animate-pulse"></div>
            <div className="h-8 w-8 bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>

        <div className="p-4">
          {/* Skeleton da barra de busca */}
          <div className="mb-4 flex gap-4">
            <div className="flex-1 relative">
              <div className="h-10 w-full bg-gray-700 rounded-lg animate-pulse"></div>
            </div>
            <div className="h-10 w-16 bg-gray-700 rounded animate-pulse"></div>
          </div>

          {/* Skeleton dos produtos */}
          <div className="space-y-3">
            {Array(groupIndex === 0 ? 3 : groupIndex === 1 ? 2 : 1).fill(0).map((_, productIndex) => (
              <div key={productIndex} className="p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-start gap-4">
                  {/* Skeleton da foto */}
                  <div className="w-24 h-24 bg-gray-700 rounded-lg animate-pulse flex-shrink-0"></div>

                  {/* Skeleton das informações */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`h-5 bg-gray-700 rounded animate-pulse ${
                          productIndex % 3 === 0 ? 'w-32' : productIndex % 3 === 1 ? 'w-40' : 'w-28'
                        }`}></div>
                        <div className="h-4 w-12 bg-gray-600 rounded animate-pulse"></div>
                        {productIndex % 2 === 0 && (
                          <div className="h-5 w-16 bg-gray-600 rounded-full animate-pulse"></div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-gray-700 rounded animate-pulse"></div>
                        <div className="h-8 w-8 bg-gray-700 rounded animate-pulse"></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-2">
                      <div className="h-6 w-20 bg-gray-600 rounded animate-pulse"></div>
                      <div className="h-4 w-16 bg-gray-600 rounded animate-pulse"></div>
                    </div>

                    <div className="flex gap-2 mb-2">
                      <div className="h-4 w-24 bg-gray-600 rounded-full animate-pulse"></div>
                      {productIndex % 3 === 0 && (
                        <div className="h-4 w-20 bg-gray-600 rounded-full animate-pulse"></div>
                      )}
                    </div>

                    {productIndex % 2 === 0 && (
                      <div className="space-y-1">
                        <div className="h-3 w-full bg-gray-700 rounded animate-pulse"></div>
                        <div className="h-3 w-3/4 bg-gray-700 rounded animate-pulse"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ));
  };

  return (
    <div className="w-full px-4 py-1">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold text-white">Produtos</h1>
        <Button
          type="button"
          variant="primary"
          onClick={handleAddGrupo}
          disabled={!isDataReady}
        >
          + Adicionar Grupo
        </Button>
      </div>

      {!isDataReady ? (
        <div>
          {/* Skeleton da barra de busca */}
          <div className="mb-3 flex gap-4">
            <div className="flex-1 relative">
              <div className="h-10 w-full bg-gray-700 rounded-lg animate-pulse"></div>
            </div>
            <div className="h-10 w-16 bg-gray-700 rounded animate-pulse"></div>
          </div>

          {/* Skeleton dos grupos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {renderSkeletonGroups()}
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-3 flex gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Buscar grupos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
              />
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            <Button
              type="button"
              variant="text"
              className="flex items-center gap-2"
              onClick={toggleSortOrder}
            >
              <ArrowUpDown size={18} />
              {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
            </Button>
          </div>

          {filteredAndSortedGrupos.length === 0 ? (
            <div className="bg-background-card rounded-lg p-8 text-center">
              <h3 className="text-lg font-medium text-white mb-2">
                {searchTerm ? 'Nenhum grupo encontrado' : 'Nenhum grupo cadastrado'}
              </h3>
              <p className="text-gray-400 mb-6">
                {searchTerm
                  ? 'Tente buscar com outros termos'
                  : 'Crie seu primeiro grupo de produtos para começar.'
                }
              </p>
              {!searchTerm && (
                <Button
                  type="button"
                  variant="primary"
                  className="mx-auto"
                  onClick={handleAddGrupo}
                >
                  + Adicionar Grupo
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredAndSortedGrupos.map((grupo) => (
                <div
                  key={grupo.id}
                  className="bg-background-card rounded border border-gray-800"
                >
                  <div className="p-3 border-b border-gray-800 flex items-center justify-between">
                    <h3 className="text-base font-medium text-white">{grupo.nome}</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAddProduto(grupo)}
                        className="flex items-center gap-1 px-2 py-1 text-sm bg-primary-500/10 rounded text-primary-400 hover:text-primary-300 hover:bg-primary-500/20 transition-colors"
                      >
                        <Plus size={12} />
                        Adicionar Produto
                      </button>
                      <button
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                        onClick={() => handleEditGrupo(grupo)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="p-1 text-red-400 hover:text-red-300 transition-colors"
                        onClick={() => handleDeleteGrupo(grupo.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="p-3">
                    <div className="mb-3 flex gap-4">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          placeholder="Buscar produtos por nome, código ou código de barras..."
                          value={productSearchTerms[grupo.id] || ''}
                          onChange={(e) => handleProductSearch(grupo.id, e.target.value)}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        />
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      </div>
                      <Button
                        type="button"
                        variant="text"
                        className="flex items-center gap-2"
                        onClick={() => toggleProductSortOrder(grupo.id)}
                      >
                        <ArrowUpDown size={18} />
                        {(productSortOrders[grupo.id] || 'asc') === 'asc' ? 'A-Z' : 'Z-A'}
                      </Button>
                    </div>

                    {getFilteredAndSortedProducts(grupo).length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-gray-400 text-sm">
                          {productSearchTerms[grupo.id]
                            ? 'Nenhum produto encontrado'
                            : 'Nenhum produto neste grupo'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {getFilteredAndSortedProducts(grupo).map((produto) => renderProduto(grupo, produto))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showSidebar && (
          <div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => {
                resetFormularioProduto();
                setShowSidebar(false);
              }}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed right-0 top-0 h-screen w-full max-w-xl bg-background-card border-l border-gray-800 z-50 overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">
                    {isGrupoForm
                      ? selectedGrupo ? 'Editar Grupo' : 'Novo Grupo'
                      : editingProduto
                        ? `Editar Produto em ${selectedGrupo?.nome}`
                        : `Novo Produto em ${selectedGrupo?.nome}`
                    }
                  </h2>
                  <button
                    onClick={() => {
                      resetFormularioProduto();
                      setShowSidebar(false);
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                {isGrupoForm ? (
                  <form onSubmit={handleSubmitGrupo} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Nome do Grupo
                      </label>
                      <input
                        type="text"
                        value={novoGrupoNome}
                        onChange={(e) => setNovoGrupoNome(e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        placeholder="Digite o nome do grupo"
                      />
                    </div>

                    <div className="flex gap-4 pt-4">
                      <Button
                        type="button"
                        variant="text"
                        className="flex-1"
                        onClick={() => setShowSidebar(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        className="flex-1"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Salvando...' : selectedGrupo ? 'Salvar' : 'Criar'}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div>
                    {/* Abas */}
                    <div className="flex border-b border-gray-700 mb-6">
                      <button
                        className={`px-4 py-2 font-medium text-sm ${
                          activeTab === 'dados'
                            ? 'text-primary-500 border-b-2 border-primary-500'
                            : 'text-gray-400 hover:text-white'
                        }`}
                        onClick={() => setActiveTab('dados')}
                      >
                        Dados Gerais
                      </button>
                      <button
                        className={`px-4 py-2 font-medium text-sm ${
                          activeTab === 'fotos'
                            ? 'text-primary-500 border-b-2 border-primary-500'
                            : editingProduto
                              ? 'text-gray-400 hover:text-white'
                              : 'text-gray-600 cursor-not-allowed'
                        }`}
                        onClick={() => {
                          if (editingProduto) {
                            setActiveTab('fotos');
                          } else {
                            showMessage('info', 'Salve o produto primeiro para adicionar fotos');
                          }
                        }}
                      >
                        Fotos {!editingProduto && <span title="Salve o produto primeiro">🔒</span>}
                      </button>
                      <button
                        className={`px-4 py-2 font-medium text-sm ${
                          activeTab === 'estoque'
                            ? 'text-primary-500 border-b-2 border-primary-500'
                            : editingProduto
                              ? 'text-gray-400 hover:text-white'
                              : 'text-gray-600 cursor-not-allowed'
                        }`}
                        onClick={() => {
                          if (editingProduto) {
                            // Carrega os movimentos de estoque ao mudar para a aba de estoque
                            loadEstoqueMovimentos(editingProduto.id);
                            setActiveTab('estoque');
                          } else {
                            showMessage('info', 'Salve o produto primeiro para gerenciar o estoque');
                          }
                        }}
                      >
                        Estoque {!editingProduto && <span title="Salve o produto primeiro">🔒</span>}
                      </button>
                      {opcoesAdicionaisHabilitado && (
                        <button
                          className={`px-4 py-2 font-medium text-sm ${
                            activeTab === 'adicionais'
                              ? 'text-primary-500 border-b-2 border-primary-500'
                              : 'text-gray-400 hover:text-white'
                          }`}
                          onClick={() => setActiveTab('adicionais')}
                        >
                          Adicionais
                        </button>
                      )}
                      <button
                        className={`px-4 py-2 font-medium text-sm ${
                          activeTab === 'impostos'
                            ? 'text-primary-500 border-b-2 border-primary-500'
                            : 'text-gray-400 hover:text-white'
                        }`}
                        onClick={() => setActiveTab('impostos')}
                      >
                        Impostos
                      </button>
                    </div>

                    {activeTab === 'dados' && (
                      <form onSubmit={handleSubmitProduto} className="space-y-6">
                        <div className="mb-4">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="ativo"
                              checked={novoProduto.ativo}
                              onChange={(e) => setNovoProduto({ ...novoProduto, ativo: e.target.checked })}
                              className="mr-3 rounded border-gray-700 text-primary-500 focus:ring-primary-500/20"
                            />
                            <label htmlFor="ativo" className="text-sm font-medium text-white cursor-pointer">
                              Produto Ativo
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Código do Produto
                          </label>
                          <input
                            type="text"
                            value={novoProduto.codigo}
                            onChange={(e) => setNovoProduto({ ...novoProduto, codigo: e.target.value })}
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                            placeholder="Código do produto"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Código de Barras
                          </label>
                          <input
                            type="text"
                            value={novoProduto.codigo_barras || ''}
                            onChange={(e) => setNovoProduto({ ...novoProduto, codigo_barras: e.target.value })}
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                            placeholder="Código de barras do produto"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Nome do Produto
                          </label>
                          <input
                            type="text"
                            value={novoProduto.nome}
                            onChange={(e) => setNovoProduto({ ...novoProduto, nome: e.target.value })}
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                            placeholder="Digite o nome do produto"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Unidade de Medida <span className="text-red-500">*</span>
                          </label>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <select
                                value={novoProduto.unidade_medida_id || ''}
                                onChange={(e) => {
                                  const novaUnidadeId = e.target.value;
                                  const novaUnidade = unidadesMedida.find(u => u.id === novaUnidadeId);
                                  const isKG = novaUnidade?.sigla === 'KG';

                                  // Se não for KG e o estoque inicial for fracionado, arredondar para inteiro
                                  let novoEstoqueInicial = novoProduto.estoque_inicial || 0;
                                  if (!isKG && novoEstoqueInicial % 1 !== 0) {
                                    novoEstoqueInicial = Math.floor(novoEstoqueInicial);
                                  }

                                  setNovoProduto({
                                    ...novoProduto,
                                    unidade_medida_id: novaUnidadeId,
                                    estoque_inicial: novoEstoqueInicial
                                  });
                                }}
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 dark-select"
                                required
                              >
                                <option value="" disabled>Selecione uma unidade de medida</option>
                                {unidadesMedida.map((unidade) => (
                                  <option key={unidade.id} value={unidade.id}>
                                    {unidade.sigla} - {unidade.nome}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setNovaUnidadeMedida({ sigla: '', nome: '' });
                                setShowUnidadeMedidaForm(true);
                              }}
                              className="bg-primary-500 hover:bg-primary-600 text-white rounded-lg p-2 flex items-center justify-center transition-colors"
                              title="Adicionar nova unidade de medida"
                            >
                              <Plus size={20} />
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Preço
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                              R$
                            </span>
                            <input
                              type="text"
                              value={precoFormatado}
                              onChange={(e) => {
                                setPrecoFormatado(e.target.value);
                                // Atualiza o valor numérico no estado do produto
                                const valorNumerico = desformatarPreco(e.target.value);
                                setNovoProduto({ ...novoProduto, preco: valorNumerico });
                              }}
                              onFocus={() => {
                                // Ao receber o foco, limpa o campo para facilitar a digitação
                                setPrecoFormatado('');
                              }}
                              onBlur={() => {
                                // Ao perder o foco, formata corretamente o valor
                                const valorNumerico = desformatarPreco(precoFormatado);
                                setPrecoFormatado(formatarPreco(valorNumerico));
                              }}
                              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-8 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                              placeholder="0,00"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Descrição Adicional
                          </label>
                          <textarea
                            value={novoProduto.descricao}
                            onChange={(e) => setNovoProduto({ ...novoProduto, descricao: e.target.value })}
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                            rows={4}
                            placeholder="Digite a descrição adicional do produto"
                          />
                        </div>

                        {/* Campo de Estoque Inicial - apenas visível para novos produtos */}
                        {!editingProduto && (
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                              Estoque Inicial
                            </label>
                            <input
                              type="text" // Mudamos para text para permitir campo vazio
                              value={novoProduto.estoque_inicial === 0 && estoqueInputVazio ? '' : novoProduto.estoque_inicial}
                              onChange={(e) => {
                                // Se o campo estiver vazio
                                if (e.target.value === '') {
                                  setEstoqueInputVazio(true);
                                  setNovoProduto({ ...novoProduto, estoque_inicial: 0 });
                                  return;
                                }

                                setEstoqueInputVazio(false);

                                // Remover caracteres não numéricos, exceto ponto e vírgula
                                const valorLimpo = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');

                                // Se não for um número válido, não atualiza
                                if (isNaN(parseFloat(valorLimpo))) {
                                  return;
                                }

                                let valor = parseFloat(valorLimpo);

                                // Verificar se a unidade de medida é KG
                                const unidadeSelecionada = unidadesMedida.find(u => u.id === novoProduto.unidade_medida_id);
                                const isKG = unidadeSelecionada?.sigla === 'KG';

                                // Se não for KG, arredondar para número inteiro
                                if (!isKG) {
                                  valor = Math.floor(valor);
                                }

                                setNovoProduto({ ...novoProduto, estoque_inicial: valor >= 0 ? valor : 0 });
                              }}
                              onBlur={() => {
                                // Se o campo estiver vazio ao perder o foco, define como 0
                                if (estoqueInputVazio) {
                                  setEstoqueInputVazio(false);
                                }
                              }}
                              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                              placeholder="0"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {(() => {
                                // Verificar se a unidade de medida é KG
                                const unidadeSelecionada = unidadesMedida.find(u => u.id === novoProduto.unidade_medida_id);
                                return unidadeSelecionada?.sigla === 'KG'
                                  ? "Valores fracionados permitidos para KG (ex: 0,5)"
                                  : "Apenas valores inteiros permitidos para esta unidade";
                              })()}
                            </p>
                          </div>
                        )}

                        {/* Seção de Produto em Promoção */}
                        <div className="mb-6 border border-gray-700 rounded-lg p-4 bg-gray-800/30">
                          <div className="flex items-center mb-4">
                            <input
                              type="checkbox"
                              id="promocao"
                              checked={novoProduto.promocao}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                // Se estiver habilitando a promoção, inicializa com valores padrão
                                if (isChecked && (!novoProduto.valor_desconto || novoProduto.valor_desconto <= 0)) {
                                  // Valor padrão: 10% de desconto
                                  setNovoProduto({
                                    ...novoProduto,
                                    promocao: isChecked,
                                    tipo_desconto: 'percentual',
                                    valor_desconto: 10
                                  });
                                  setDescontoFormatado('10');
                                } else {
                                  setNovoProduto({ ...novoProduto, promocao: isChecked });
                                }
                              }}
                              className="mr-3 rounded border-gray-700 text-primary-500 focus:ring-primary-500/20"
                            />
                            <label htmlFor="promocao" className="text-sm font-medium text-white cursor-pointer">
                              Produto em Promoção
                            </label>
                          </div>

                          {novoProduto.promocao && (
                            <div className="pl-7 border-l-2 border-primary-500/30 ml-1.5">
                              <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                  Tipo de Desconto <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-4">
                                  <div className="flex items-center">
                                    <input
                                      type="radio"
                                      id="percentual"
                                      name="tipo_desconto"
                                      value="percentual"
                                      checked={novoProduto.tipo_desconto === 'percentual'}
                                      onChange={() => {
                                        // Se não tinha tipo de desconto definido, inicializa com 10%
                                        const novoValorDesconto = !novoProduto.tipo_desconto || novoProduto.tipo_desconto !== 'percentual'
                                          ? 10
                                          : novoProduto.valor_desconto;

                                        setNovoProduto({
                                          ...novoProduto,
                                          tipo_desconto: 'percentual',
                                          valor_desconto: novoValorDesconto || 10
                                        });

                                        // Atualizar o formato do desconto quando mudar o tipo
                                        setDescontoFormatado((novoValorDesconto || 10).toString());
                                      }}
                                      className="mr-2 rounded-full border-gray-700 text-primary-500 focus:ring-primary-500/20"
                                      required
                                    />
                                    <label htmlFor="percentual" className="text-sm text-white cursor-pointer">
                                      Percentual (%)
                                    </label>
                                  </div>
                                  <div className="flex items-center">
                                    <input
                                      type="radio"
                                      id="valor"
                                      name="tipo_desconto"
                                      value="valor"
                                      checked={novoProduto.tipo_desconto === 'valor'}
                                      onChange={() => {
                                        // Se não tinha tipo de desconto definido ou era percentual, inicializa com valor equivalente a 10% do preço
                                        let novoValorDesconto = novoProduto.valor_desconto;

                                        if (!novoProduto.tipo_desconto || novoProduto.tipo_desconto !== 'valor') {
                                          // Calcula 10% do preço como valor padrão
                                          novoValorDesconto = novoProduto.preco * 0.1;
                                        }

                                        setNovoProduto({
                                          ...novoProduto,
                                          tipo_desconto: 'valor',
                                          valor_desconto: novoValorDesconto || (novoProduto.preco * 0.1)
                                        });

                                        // Atualizar o formato do desconto quando mudar o tipo
                                        setDescontoFormatado(formatarPreco(novoValorDesconto || (novoProduto.preco * 0.1)));
                                      }}
                                      className="mr-2 rounded-full border-gray-700 text-primary-500 focus:ring-primary-500/20"
                                      required
                                    />
                                    <label htmlFor="valor" className="text-sm text-white cursor-pointer">
                                      Valor (R$)
                                    </label>
                                  </div>
                                </div>
                              </div>

                              <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                  {novoProduto.tipo_desconto === 'percentual' ? 'Percentual de Desconto (%)' : 'Valor do Desconto (R$)'} <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                  {novoProduto.tipo_desconto === 'valor' && (
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                      R$
                                    </span>
                                  )}
                                  <input
                                    type="text"
                                    value={descontoFormatado}
                                    onChange={(e) => {
                                      setDescontoFormatado(e.target.value);
                                      // Atualiza o valor numérico no estado do produto
                                      const valorNumerico = desformatarPreco(e.target.value);
                                      setNovoProduto({ ...novoProduto, valor_desconto: valorNumerico });
                                    }}
                                    onFocus={() => {
                                      // Ao receber o foco, limpa o campo para facilitar a digitação
                                      setDescontoFormatado('');
                                    }}
                                    onBlur={() => {
                                      // Ao perder o foco, formata corretamente o valor
                                      const valorNumerico = desformatarPreco(descontoFormatado);
                                      if (novoProduto.tipo_desconto === 'percentual') {
                                        // Para percentual, não usamos formatação de moeda
                                        setDescontoFormatado(valorNumerico.toString());
                                      } else {
                                        // Para valor, usamos formatação de moeda
                                        setDescontoFormatado(formatarPreco(valorNumerico));
                                      }
                                    }}
                                    className={`w-full bg-gray-800/50 border ${
                                      !novoProduto.valor_desconto || novoProduto.valor_desconto <= 0
                                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                                        : 'border-gray-700 focus:border-primary-500 focus:ring-primary-500/20'
                                    } rounded-lg py-2 ${novoProduto.tipo_desconto === 'valor' ? 'pl-8' : 'pl-3'} pr-3 text-white focus:outline-none focus:ring-1`}
                                    placeholder={novoProduto.tipo_desconto === 'percentual' ? '10' : '0,00'}
                                    required
                                  />
                                  {novoProduto.tipo_desconto === 'percentual' && (
                                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                                      %
                                    </span>
                                  )}
                                </div>
                                {(!novoProduto.valor_desconto || novoProduto.valor_desconto <= 0) && (
                                  <p className="text-red-500 text-xs mt-1">
                                    É necessário informar um valor de desconto maior que zero
                                  </p>
                                )}
                              </div>

                              <div className="mb-2">
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                  Valor Final
                                </label>
                                <div className="relative">
                                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                    R$
                                  </span>
                                  <input
                                    type="text"
                                    value={valorFinalFormatado}
                                    className="w-full bg-gray-700/50 border border-gray-700 rounded-lg py-2 pl-8 pr-3 text-white focus:outline-none"
                                    readOnly
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Seção de Desconto por Quantidade Mínima */}
                        <div className="mb-6 border border-gray-700 rounded-lg p-4 bg-gray-800/30">
                          <div className="flex items-center mb-4">
                            <input
                              type="checkbox"
                              id="desconto_quantidade"
                              checked={novoProduto.desconto_quantidade}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                // Se estiver habilitando o desconto por quantidade, inicializa com valores padrão
                                if (isChecked && (!novoProduto.valor_desconto_quantidade || novoProduto.valor_desconto_quantidade <= 0)) {
                                  // Valor padrão: 10% de desconto para quantidade mínima de 5
                                  setNovoProduto({
                                    ...novoProduto,
                                    desconto_quantidade: isChecked,
                                    quantidade_minima: 5,
                                    tipo_desconto_quantidade: 'percentual',
                                    percentual_desconto_quantidade: 10,
                                    valor_desconto_quantidade: 0
                                  });
                                  setDescontoQuantidadeFormatado('10');
                                } else {
                                  setNovoProduto({ ...novoProduto, desconto_quantidade: isChecked });
                                }
                              }}
                              className="mr-3 rounded border-gray-700 text-primary-500 focus:ring-primary-500/20"
                            />
                            <label htmlFor="desconto_quantidade" className="text-sm font-medium text-white cursor-pointer">
                              Desconto por Quantidade Mínima
                            </label>
                          </div>

                          {novoProduto.desconto_quantidade && (
                            <div className="pl-7 border-l-2 border-primary-500/30 ml-1.5">
                              <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                  Quantidade Mínima <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={novoProduto.quantidade_minima === 0 && quantidadeMinimaVazia ? '' : novoProduto.quantidade_minima}
                                  onChange={(e) => {
                                    // Se o campo estiver vazio
                                    if (e.target.value === '') {
                                      setQuantidadeMinimaVazia(true);
                                      setNovoProduto({ ...novoProduto, quantidade_minima: 0 });
                                      return;
                                    }

                                    setQuantidadeMinimaVazia(false);

                                    // Remover caracteres não numéricos
                                    const valorLimpo = e.target.value.replace(/[^\d]/g, '');

                                    // Se não for um número válido, não atualiza
                                    if (isNaN(parseInt(valorLimpo))) {
                                      return;
                                    }

                                    const valor = parseInt(valorLimpo);
                                    setNovoProduto({ ...novoProduto, quantidade_minima: valor > 0 ? valor : 0 });
                                  }}
                                  onBlur={() => {
                                    // Se o campo estiver vazio ao perder o foco, mantém vazio
                                    if (!quantidadeMinimaVazia && novoProduto.quantidade_minima === 0) {
                                      setNovoProduto({ ...novoProduto, quantidade_minima: 1 });
                                    }
                                  }}
                                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                                  placeholder="5"
                                  required
                                />
                              </div>

                              <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                  Tipo de Desconto por Quantidade <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-4">
                                  <div className="flex items-center">
                                    <input
                                      type="radio"
                                      id="percentual_quantidade"
                                      name="tipo_desconto_quantidade"
                                      value="percentual"
                                      checked={novoProduto.tipo_desconto_quantidade === 'percentual'}
                                      onChange={() => {
                                        // Se não tinha tipo de desconto definido, inicializa com 10%
                                        const novoPercentualDesconto = !novoProduto.tipo_desconto_quantidade || novoProduto.tipo_desconto_quantidade !== 'percentual'
                                          ? 10
                                          : novoProduto.percentual_desconto_quantidade;

                                        setNovoProduto({
                                          ...novoProduto,
                                          tipo_desconto_quantidade: 'percentual',
                                          percentual_desconto_quantidade: novoPercentualDesconto || 10
                                        });

                                        // Atualizar o formato do desconto quando mudar o tipo
                                        setDescontoQuantidadeFormatado((novoPercentualDesconto || 10).toString());
                                      }}
                                      className="mr-2 rounded-full border-gray-700 text-primary-500 focus:ring-primary-500/20"
                                      required
                                    />
                                    <label htmlFor="percentual_quantidade" className="text-sm text-white cursor-pointer">
                                      Percentual (%)
                                    </label>
                                  </div>
                                  <div className="flex items-center">
                                    <input
                                      type="radio"
                                      id="valor_quantidade"
                                      name="tipo_desconto_quantidade"
                                      value="valor"
                                      checked={novoProduto.tipo_desconto_quantidade === 'valor'}
                                      onChange={() => {
                                        // Se não tinha tipo de desconto definido ou era percentual, inicializa com valor equivalente a 10% do preço
                                        let novoValorDesconto = novoProduto.valor_desconto_quantidade;

                                        if (!novoProduto.tipo_desconto_quantidade || novoProduto.tipo_desconto_quantidade !== 'valor') {
                                          // Calcula 10% do preço como valor padrão
                                          novoValorDesconto = novoProduto.preco * 0.1;
                                        }

                                        setNovoProduto({
                                          ...novoProduto,
                                          tipo_desconto_quantidade: 'valor',
                                          valor_desconto_quantidade: novoValorDesconto || (novoProduto.preco * 0.1)
                                        });

                                        // Atualizar o formato do desconto quando mudar o tipo
                                        setDescontoQuantidadeFormatado(formatarPreco(novoValorDesconto || (novoProduto.preco * 0.1)));
                                      }}
                                      className="mr-2 rounded-full border-gray-700 text-primary-500 focus:ring-primary-500/20"
                                      required
                                    />
                                    <label htmlFor="valor_quantidade" className="text-sm text-white cursor-pointer">
                                      Valor (R$)
                                    </label>
                                  </div>
                                </div>
                              </div>

                              <div className="mb-2">
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                  {novoProduto.tipo_desconto_quantidade === 'percentual' ? 'Percentual de Desconto (%)' : 'Valor do Desconto (R$)'} <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                  {novoProduto.tipo_desconto_quantidade === 'valor' && (
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                      R$
                                    </span>
                                  )}
                                  <input
                                    type="text"
                                    value={descontoQuantidadeFormatado}
                                    onChange={(e) => {
                                      setDescontoQuantidadeFormatado(e.target.value);
                                      // Atualiza o valor numérico no estado do produto
                                      const valorNumerico = desformatarPreco(e.target.value);
                                      if (novoProduto.tipo_desconto_quantidade === 'percentual') {
                                        setNovoProduto({ ...novoProduto, percentual_desconto_quantidade: valorNumerico });
                                      } else {
                                        setNovoProduto({ ...novoProduto, valor_desconto_quantidade: valorNumerico });
                                      }
                                    }}
                                    onFocus={() => {
                                      // Ao receber o foco, limpa o campo para facilitar a digitação
                                      setDescontoQuantidadeFormatado('');
                                    }}
                                    onBlur={() => {
                                      // Ao perder o foco, formata corretamente o valor
                                      const valorNumerico = desformatarPreco(descontoQuantidadeFormatado);
                                      if (novoProduto.tipo_desconto_quantidade === 'percentual') {
                                        // Para percentual, não usamos formatação de moeda
                                        setDescontoQuantidadeFormatado(valorNumerico.toString());
                                      } else {
                                        // Para valor, usamos formatação de moeda
                                        setDescontoQuantidadeFormatado(formatarPreco(valorNumerico));
                                      }
                                    }}
                                    className={`w-full bg-gray-800/50 border ${
                                      (novoProduto.tipo_desconto_quantidade === 'percentual' &&
                                       (!novoProduto.percentual_desconto_quantidade || novoProduto.percentual_desconto_quantidade <= 0)) ||
                                      (novoProduto.tipo_desconto_quantidade === 'valor' &&
                                       (!novoProduto.valor_desconto_quantidade || novoProduto.valor_desconto_quantidade <= 0))
                                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                                        : 'border-gray-700 focus:border-primary-500 focus:ring-primary-500/20'
                                    } rounded-lg py-2 ${novoProduto.tipo_desconto_quantidade === 'valor' ? 'pl-8' : 'pl-3'} pr-3 text-white focus:outline-none focus:ring-1`}
                                    placeholder={novoProduto.tipo_desconto_quantidade === 'percentual' ? '10' : '0,00'}
                                    required
                                  />
                                  {novoProduto.tipo_desconto_quantidade === 'percentual' && (
                                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                                      %
                                    </span>
                                  )}
                                </div>
                                {((novoProduto.tipo_desconto_quantidade === 'percentual' &&
                                   (!novoProduto.percentual_desconto_quantidade || novoProduto.percentual_desconto_quantidade <= 0)) ||
                                  (novoProduto.tipo_desconto_quantidade === 'valor' &&
                                   (!novoProduto.valor_desconto_quantidade || novoProduto.valor_desconto_quantidade <= 0))) && (
                                  <p className="text-red-500 text-xs mt-1">
                                    É necessário informar um valor de desconto maior que zero
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Seção de Opções Adicionais ocultada conforme solicitado */}

                        <div className="flex gap-4 pt-4">
                          <Button
                            type="button"
                            variant="text"
                            className="flex-1"
                            onClick={() => {
                              resetFormularioProduto();
                              setShowSidebar(false);
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="submit"
                            variant="primary"
                            className="flex-1"
                            disabled={isLoading}
                          >
                            {isLoading ? 'Salvando...' : editingProduto ? 'Salvar' : 'Criar'}
                          </Button>
                        </div>


                      </form>
                    )}

                    {activeTab === 'fotos' && (
                      <div className="space-y-6">
                        {!editingProduto ? (
                          <div className="text-center py-8">
                            <AlertCircle size={32} className="mx-auto text-gray-500 mb-2" />
                            <p className="text-gray-400">Salve o produto primeiro para adicionar fotos</p>
                            <button
                              type="button"
                              onClick={() => setActiveTab('dados')}
                              className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                            >
                              Voltar para Dados Gerais
                            </button>
                          </div>
                        ) : (
                          <div>
                            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white font-medium">Fotos do Produto</h3>
                                <div className="text-sm text-gray-400">
                                  {produtoFotos.length}/3 fotos
                                </div>
                              </div>

                              {produtoFotos.length === 0 ? (
                                <div className="text-center py-6">
                                  <Image size={32} className="mx-auto text-gray-500 mb-2" />
                                  <p className="text-gray-400 mb-4">Nenhuma foto adicionada</p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-3 gap-4">
                                  {produtoFotos.map((foto) => (
                                    <div
                                      key={foto.id}
                                      className={`relative rounded-lg overflow-hidden border-2 ${
                                        foto.principal ? 'border-primary-500' : 'border-gray-700'
                                      }`}
                                    >
                                      <img
                                        src={foto.url}
                                        alt="Foto do produto"
                                        className="w-full h-32 object-cover cursor-pointer"
                                        onClick={() => handleOpenGaleria(index)}
                                      />
                                      <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                        {!foto.principal && (
                                          <button
                                            type="button"
                                            onClick={() => handleSetFotoPrincipal(foto.id)}
                                            className="p-1.5 bg-primary-500 rounded-full text-white hover:bg-primary-600 transition-colors"
                                            title="Definir como principal"
                                          >
                                            <Star size={16} />
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleConfirmDeleteFoto(foto)}
                                          className="p-1.5 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                                          title="Excluir foto"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                      {foto.principal && (
                                        <div className="absolute top-1 right-1 bg-primary-500 text-white text-xs px-1.5 py-0.5 rounded">
                                          Principal
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {produtoFotos.length < 3 && (
                                <div className="mt-4">
                                  <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    accept="image/*"
                                    className="hidden"
                                    disabled={isUploadingFoto}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploadingFoto}
                                    className="w-full py-2 px-4 border border-dashed border-gray-600 rounded-lg flex items-center justify-center gap-2 text-gray-400 hover:text-white hover:border-gray-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                                  >
                                    {isUploadingFoto ? (
                                      <div>
                                        <div className="w-4 h-4 border-2 border-gray-500 border-t-white rounded-full animate-spin"></div>
                                        <span>Enviando...</span>
                                      </div>
                                    ) : (
                                      <div>
                                        <Upload size={18} />
                                        <span>Adicionar Foto</span>
                                      </div>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-4 pt-4">
                              <Button
                                type="button"
                                variant="text"
                                className="flex-1"
                                onClick={() => setActiveTab('dados')}
                              >
                                Voltar
                              </Button>
                              <Button
                                type="button"
                                variant="primary"
                                className="flex-1"
                                onClick={async () => {
                                  // Simular o evento de submit do formulário
                                  const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                                  await handleSubmitProduto(fakeEvent);
                                }}
                                disabled={isLoading}
                              >
                                {isLoading ? 'Salvando...' : 'Concluir'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'estoque' && (
                      <div className="space-y-6">
                        {!editingProduto ? (
                          <div className="text-center py-8">
                            <AlertCircle size={32} className="mx-auto text-gray-500 mb-2" />
                            <p className="text-gray-400">Salve o produto primeiro para gerenciar o estoque</p>
                            <button
                              type="button"
                              onClick={() => setActiveTab('dados')}
                              className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                            >
                              Voltar para Dados Gerais
                            </button>
                          </div>
                        ) : (
                          <div>
                            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                              <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
                                <div className="flex flex-col md:flex-row md:items-center gap-3">
                                  {/* Exibição do estoque */}
                                  <div className="text-sm text-gray-400 bg-gray-900/50 border border-gray-800 rounded-lg p-2 px-3">
                                    Estoque Atual: <span className="font-semibold text-white">{editingProduto ? formatarEstoque(estoqueAtual, editingProduto) : estoqueAtual.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Configuração de Estoque Mínimo */}
                              <div className="mb-6 bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                                <h4 className="text-white font-medium mb-4">Configuração de Estoque Mínimo</h4>

                                <div className="space-y-4">
                                  {/* Checkbox para ativar estoque mínimo */}
                                  <div className="flex items-center">
                                    <input
                                      type="checkbox"
                                      id="estoque_minimo_ativo"
                                      checked={novoProduto.estoque_minimo_ativo}
                                      onChange={(e) => setNovoProduto({ ...novoProduto, estoque_minimo_ativo: e.target.checked })}
                                      className="mr-3 rounded border-gray-700 text-primary-500 focus:ring-primary-500/20"
                                    />
                                    <label htmlFor="estoque_minimo_ativo" className="text-sm font-medium text-white cursor-pointer">
                                      Ativar controle de estoque mínimo
                                    </label>
                                  </div>

                                  {/* Campo de estoque mínimo - só aparece quando ativado */}
                                  {novoProduto.estoque_minimo_ativo && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Quantidade Mínima
                                      </label>
                                      {(() => {
                                        // Verificar se a unidade de medida é KG
                                        const unidadeSelecionada = unidadesMedida.find(u => u.id === novoProduto.unidade_medida_id);
                                        const isKG = unidadeSelecionada?.sigla === 'KG';
                                        const placeholder = isKG ? "0,000" : "0";

                                        return (
                                          <input
                                            type="text"
                                            value={novoProduto.estoque_minimo === 0 && estoqueMinimoVazio ? '' : novoProduto.estoque_minimo}
                                            onChange={(e) => {
                                              // Se o campo estiver vazio
                                              if (e.target.value === '') {
                                                setEstoqueMinimoVazio(true);
                                                setNovoProduto({ ...novoProduto, estoque_minimo: 0 });
                                                return;
                                              }

                                              setEstoqueMinimoVazio(false);

                                              // Remover caracteres não numéricos, exceto ponto e vírgula
                                              const valorLimpo = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');

                                              // Se não for um número válido, não atualiza
                                              if (isNaN(parseFloat(valorLimpo))) {
                                                return;
                                              }

                                              const valor = parseFloat(valorLimpo);

                                              // Se não for KG e o valor for fracionado, arredondar para inteiro
                                              const valorFinal = !isKG && valor % 1 !== 0 ? Math.floor(valor) : valor;

                                              setNovoProduto({
                                                ...novoProduto,
                                                estoque_minimo: valorFinal >= 0 ? valorFinal : 0
                                              });
                                            }}
                                            onFocus={() => {
                                              // Ao receber o foco, limpar o campo se for 0
                                              if (novoProduto.estoque_minimo === 0) {
                                                setEstoqueMinimoVazio(true);
                                              }
                                            }}
                                            onBlur={() => {
                                              // Se o campo estiver vazio ao perder o foco, define como 0
                                              if (estoqueMinimoVazio) {
                                                setEstoqueMinimoVazio(false);
                                              } else {
                                                // Se tiver valor, formata para casas decimais adequadas
                                                const casasDecimais = isKG ? 3 : 0;
                                                setNovoProduto({
                                                  ...novoProduto,
                                                  estoque_minimo: parseFloat(novoProduto.estoque_minimo.toFixed(casasDecimais))
                                                });
                                              }
                                            }}
                                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                                            placeholder={placeholder}
                                          />
                                        );
                                      })()}
                                      <p className="text-xs text-gray-500 mt-1">
                                        {(() => {
                                          // Verificar se a unidade de medida é KG
                                          const unidadeSelecionada = unidadesMedida.find(u => u.id === novoProduto.unidade_medida_id);
                                          return unidadeSelecionada?.sigla === 'KG'
                                            ? "Valores fracionados permitidos para KG (ex: 0,5)"
                                            : "Apenas valores inteiros permitidos para esta unidade";
                                        })()}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="mb-6">
                                <form onSubmit={handleRegistrarMovimentoEstoque} className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                                  <h4 className="text-white font-medium mb-4">Registrar Movimentação</h4>

                                  {/* Layout ajustado para evitar sobreposição em telas pequenas */}
                                  <div className="space-y-4">
                                    {/* Tipo de Movimento */}
                                    <div>
                                      <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Tipo de Movimento
                                      </label>
                                      <div className="flex gap-6">
                                        <div className="flex items-center">
                                          <input
                                            type="radio"
                                            id="tipo_entrada"
                                            name="tipo_movimento"
                                            value="entrada"
                                            checked={novoMovimento.tipo === 'entrada'}
                                            onChange={() => setNovoMovimento({...novoMovimento, tipo: 'entrada'})}
                                            className="mr-2 rounded-full border-gray-700 text-primary-500 focus:ring-primary-500/20"
                                          />
                                          <label htmlFor="tipo_entrada" className="text-sm text-white cursor-pointer">
                                            Entrada
                                          </label>
                                        </div>
                                        <div className="flex items-center">
                                          <input
                                            type="radio"
                                            id="tipo_saida"
                                            name="tipo_movimento"
                                            value="saida"
                                            checked={novoMovimento.tipo === 'saida'}
                                            onChange={() => setNovoMovimento({...novoMovimento, tipo: 'saida'})}
                                            className="mr-2 rounded-full border-gray-700 text-primary-500 focus:ring-primary-500/20"
                                          />
                                          <label htmlFor="tipo_saida" className="text-sm text-white cursor-pointer">
                                            Saída
                                          </label>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Quantidade */}
                                    <div>
                                      <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Quantidade
                                      </label>
                                      {/* Verificar se a unidade de medida é KG para definir o placeholder adequado */}
                                      {(() => {
                                        // Verificar se a unidade de medida é KG
                                        const unidadeSelecionada = unidadesMedida.find(u => u.id === editingProduto?.unidade_medida_id);
                                        const isKG = unidadeSelecionada?.sigla === 'KG';
                                        const placeholder = isKG ? "0,000" : "0";

                                        return (
                                          <input
                                            type="text"
                                            value={novoMovimento.quantidade === 0 && quantidadeMovimentoVazia ? '' : novoMovimento.quantidade}
                                            onChange={(e) => {
                                              // Se o campo estiver vazio
                                              if (e.target.value === '') {
                                                setQuantidadeMovimentoVazia(true);
                                                setNovoMovimento({
                                                  ...novoMovimento,
                                                  quantidade: 0
                                                });
                                                return;
                                              }

                                              setQuantidadeMovimentoVazia(false);

                                              // Remover caracteres não numéricos, exceto ponto e vírgula
                                              const valorLimpo = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');

                                              // Se não for um número válido, não atualiza
                                              if (isNaN(parseFloat(valorLimpo))) {
                                                return;
                                              }

                                              const valor = parseFloat(valorLimpo);

                                              // Se não for KG e o valor for fracionado, arredondar para inteiro
                                              const valorFinal = !isKG && valor % 1 !== 0 ? Math.floor(valor) : valor;

                                              setNovoMovimento({
                                                ...novoMovimento,
                                                quantidade: valorFinal >= 0 ? valorFinal : 0
                                              });
                                            }}
                                            onFocus={() => {
                                              // Ao receber o foco, garantir que o campo esteja vazio para facilitar a digitação
                                              if (novoMovimento.quantidade === 0) {
                                                setQuantidadeMovimentoVazia(true);
                                              }
                                            }}
                                            onBlur={() => {
                                              // Se o campo estiver vazio ao perder o foco, mantém vazio
                                              if (!quantidadeMovimentoVazia) {
                                                // Se tiver valor, formata para casas decimais adequadas
                                                const casasDecimais = isKG ? 3 : 0;
                                                setNovoMovimento({
                                                  ...novoMovimento,
                                                  quantidade: parseFloat(novoMovimento.quantidade.toFixed(casasDecimais))
                                                });
                                              }
                                            }}
                                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                                            placeholder={placeholder}
                                            required
                                          />
                                        );
                                      })()}

                                    </div>

                                    {/* Observação */}
                                    <div>
                                      <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Observação
                                      </label>
                                      <input
                                        type="text"
                                        value={novoMovimento.observacao}
                                        onChange={(e) => setNovoMovimento({...novoMovimento, observacao: e.target.value})}
                                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                                        placeholder="Motivo da movimentação"
                                      />
                                    </div>
                                  </div>

                                  <div className="flex justify-end mt-4">
                                    <Button
                                      type="submit"
                                      variant="primary"
                                      disabled={novoMovimento.quantidade <= 0 || isLoadingEstoque}
                                    >
                                      {isLoadingEstoque ? 'Registrando...' : 'Registrar Movimento'}
                                    </Button>
                                  </div>
                                </form>
                              </div>

                              <div>
                                <div className="mb-4">
                                  <h4 className="text-white font-medium">Histórico de Movimentações</h4>
                                </div>

                                {isLoadingEstoque ? (
                                  <div className="text-center py-8">
                                    <div className="w-8 h-8 border-2 border-gray-500 border-t-white rounded-full animate-spin mx-auto mb-2"></div>
                                    <p className="text-gray-400">Carregando movimentações...</p>
                                  </div>
                                ) : estoqueMovimentos.length === 0 ? (
                                  <div className="text-center py-8">
                                    <p className="text-gray-400">Nenhuma movimentação registrada</p>
                                  </div>
                                ) : (
                                  <div className="border border-gray-800 rounded-lg overflow-hidden">
                                    <div className="overflow-y-auto max-h-[300px] custom-scrollbar">
                                      <table className="w-full text-sm text-left text-gray-300">
                                        <thead className="text-xs uppercase bg-gray-900/50 text-gray-400 sticky top-0">
                                          <tr>
                                            <th scope="col" className="px-1 py-2 w-[110px]">Data</th>
                                            <th scope="col" className="px-1 py-2 w-[70px]">Tipo</th>
                                            <th scope="col" className="px-1 py-2 w-[50px] text-center">Qtde</th>
                                            <th scope="col" className="px-1 py-2 w-[60px] text-center">Saldo</th>
                                            <th scope="col" className="px-1 py-2 w-[80px]">Usuário</th>
                                            <th scope="col" className="px-1 py-2">Obs</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {estoqueMovimentos.map((movimento) => (
                                            <tr key={movimento.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                                              <td className="px-1 py-1.5 w-[110px] text-xs">
                                                <div className="flex flex-col leading-none">
                                                  <span className="text-gray-200 text-[11px]">{new Date(movimento.data_hora_movimento).toLocaleDateString('pt-BR')}</span>
                                                  <span className="text-gray-500 text-[9px] mt-0.5">{new Date(movimento.data_hora_movimento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                              </td>
                                              <td className="px-1 py-1.5 w-[70px]">
                                                <span className={`px-1 py-0.5 rounded text-[9px] font-medium ${
                                                  movimento.tipo_movimento === 'entrada'
                                                    ? 'bg-green-900/30 text-green-400'
                                                    : 'bg-red-900/30 text-red-400'
                                                }`}>
                                                  {movimento.tipo_movimento === 'entrada' ? 'Entrada' : 'Saída'}
                                                </span>
                                              </td>
                                              <td className="px-1 py-1.5 w-[50px] font-medium text-center text-xs">
                                                {editingProduto ? formatarEstoque(parseFloat(movimento.quantidade), editingProduto) : parseFloat(movimento.quantidade).toFixed(2)}
                                              </td>
                                              <td className="px-1 py-1.5 font-bold w-[60px] text-white text-center text-xs">
                                                {editingProduto ? formatarEstoque(parseFloat(movimento.saldo), editingProduto) : parseFloat(movimento.saldo).toFixed(2)}
                                              </td>
                                              <td className="px-1 py-1.5 w-[80px] text-gray-300 text-[10px] truncate" title={movimento.usuario?.nome || 'Sistema'}>
                                                {movimento.usuario?.nome || 'Sistema'}
                                              </td>
                                              <td className="px-1 py-1.5 text-gray-300 text-[10px] break-words">
                                                {movimento.observacao || '-'}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                              <Button
                                type="button"
                                variant="text"
                                className="flex-1"
                                onClick={() => setActiveTab('dados')}
                              >
                                Voltar
                              </Button>
                              <Button
                                type="button"
                                variant="primary"
                                className="flex-1"
                                onClick={async () => {
                                  // Simular o evento de submit do formulário
                                  const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                                  await handleSubmitProduto(fakeEvent);
                                }}
                                disabled={isLoading}
                              >
                                {isLoading ? 'Salvando...' : 'Concluir'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'adicionais' && (
                      <div className="space-y-6">
                        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                          <h3 className="text-white font-medium mb-4">Opções Adicionais</h3>
                          <p className="text-sm text-gray-400 mb-4">
                            Selecione as opções adicionais que estarão disponíveis para este produto.
                          </p>

                          {availableOpcoes.length === 0 ? (
                            <div className="text-center py-8">
                              <div className="bg-gray-700/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Plus size={24} className="text-gray-400" />
                              </div>
                              <p className="text-gray-400 mb-4">Nenhuma opção adicional cadastrada</p>
                              <p className="text-sm text-gray-500">
                                Cadastre opções adicionais primeiro para poder vinculá-las aos produtos.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {availableOpcoes.map((opcao) => (
                                <div
                                  key={opcao.id}
                                  className="border border-gray-700 rounded-lg overflow-hidden"
                                >
                                  <div className="flex items-center justify-between p-3 bg-gray-800/30">
                                    <div className="flex items-center gap-3">
                                      <input
                                        type="checkbox"
                                        id={`opcao-${opcao.id}`}
                                        checked={selectedOpcoes.includes(opcao.id)}
                                        onChange={() => handleOpcaoToggle(opcao.id)}
                                        className="w-4 h-4 text-primary-500 border-gray-600 rounded focus:ring-primary-500 focus:ring-opacity-25 bg-gray-700"
                                      />
                                      <label
                                        htmlFor={`opcao-${opcao.id}`}
                                        className="text-white font-medium cursor-pointer"
                                      >
                                        {opcao.nome}
                                      </label>
                                      <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                                        {opcao.itens?.length || 0} {(opcao.itens?.length || 0) === 1 ? 'item' : 'itens'}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => toggleOpcaoExpansion(opcao.id)}
                                      className="p-1 text-gray-400 hover:text-white transition-colors"
                                    >
                                      {expandedOpcoesForm[opcao.id] ? (
                                        <ChevronUp size={16} />
                                      ) : (
                                        <ChevronDown size={16} />
                                      )}
                                    </button>
                                  </div>

                                  {expandedOpcoesForm[opcao.id] && opcao.itens && opcao.itens.length > 0 && (
                                    <div className="p-3 bg-gray-900/30 border-t border-gray-700">
                                      <h4 className="text-sm font-medium text-gray-300 mb-2">Itens disponíveis:</h4>
                                      <div className="grid grid-cols-1 gap-2">
                                        {opcao.itens.map((item) => (
                                          <div
                                            key={item.id}
                                            className="flex items-center justify-between p-2 bg-gray-800/50 rounded"
                                          >
                                            <span className="text-sm text-white">{item.nome}</span>
                                            <span className="text-sm text-primary-400">
                                              {item.preco > 0 ? `+R$ ${item.preco.toFixed(2)}` : 'Grátis'}
                                            </span>
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

                        <div className="flex gap-4 pt-4">
                          <Button
                            type="button"
                            variant="text"
                            className="flex-1"
                            onClick={() => setActiveTab('dados')}
                          >
                            Voltar
                          </Button>
                          <Button
                            type="button"
                            variant="primary"
                            className="flex-1"
                            onClick={async () => {
                              // Simular o evento de submit do formulário
                              const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                              await handleSubmitProduto(fakeEvent);
                            }}
                            disabled={isLoading}
                          >
                            {isLoading ? 'Salvando...' : 'Concluir'}
                          </Button>
                        </div>
                      </div>
                    )}

                    {activeTab === 'impostos' && (
                      <div className="space-y-6">
                        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-400">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14,2 14,8 20,8"></polyline>
                              <line x1="16" y1="13" x2="8" y2="13"></line>
                              <line x1="16" y1="17" x2="8" y2="17"></line>
                              <polyline points="10,9 9,9 8,9"></polyline>
                            </svg>
                            Dados Fiscais (NFe)
                          </h3>
                          <p className="text-sm text-gray-400 mb-6">
                            Configure os dados fiscais necessários para emissão de NFe. Os códigos CST/CSOSN são definidos automaticamente baseados no regime tributário da empresa.
                          </p>

                          <div className="space-y-6">
                            {/* NCM - Obrigatório */}
                            <div>
                              <label className="block text-sm font-medium text-gray-400 mb-2">
                                NCM (Nomenclatura Comum do Mercosul) <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={aplicarMascaraNCM(novoProduto.ncm || '')}
                                  onChange={(e) => {
                                    // Remover máscara e permitir apenas números, limitando a 8 dígitos
                                    const apenasNumeros = e.target.value.replace(/\D/g, '').slice(0, 8);
                                    setNovoProduto({ ...novoProduto, ncm: apenasNumeros });

                                    // Validar NCM se tiver 8 dígitos
                                    if (apenasNumeros.length === 8) {
                                      debounceValidarNCM(apenasNumeros);
                                    } else {
                                      setNcmValidacao({
                                        validando: false,
                                        valido: null,
                                        descricao: '',
                                        erro: ''
                                      });
                                    }
                                  }}
                                  className={`w-full bg-gray-800/50 border rounded-lg py-2 px-3 pr-10 text-white focus:outline-none focus:ring-1 focus:ring-primary-500/20 ${
                                    ncmValidacao.valido === true
                                      ? 'border-green-500 focus:border-green-500'
                                      : ncmValidacao.valido === false
                                      ? 'border-red-500 focus:border-red-500'
                                      : 'border-gray-700 focus:border-primary-500'
                                  }`}
                                  placeholder="0000.00.00"
                                  maxLength={10} // Considerando a máscara
                                  required
                                />

                                {/* Ícone de status */}
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                  {ncmValidacao.validando && (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                  )}
                                  {!ncmValidacao.validando && ncmValidacao.valido === true && (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                                      <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                  )}
                                  {!ncmValidacao.validando && ncmValidacao.valido === false && (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                                      <line x1="18" y1="6" x2="6" y2="18"></line>
                                      <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                  )}
                                </div>
                              </div>

                              {/* Mensagem de status */}
                              {ncmValidacao.valido === true && ncmValidacao.descricao && (
                                <div className="mt-2 p-2 bg-green-900/20 border border-green-700/50 rounded text-xs">
                                  <p className="text-green-300 font-medium">✓ NCM válido</p>
                                  <p className="text-green-200 mt-1 line-clamp-2">
                                    {ncmValidacao.descricao.length > 100
                                      ? `${ncmValidacao.descricao.substring(0, 100)}...`
                                      : ncmValidacao.descricao
                                    }
                                  </p>
                                </div>
                              )}

                              {ncmValidacao.valido === false && ncmValidacao.erro && (
                                <div className="mt-2 p-2 bg-red-900/20 border border-red-700/50 rounded text-xs">
                                  <p className="text-red-300 font-medium">✗ NCM inválido</p>
                                  <p className="text-red-200 mt-1">{ncmValidacao.erro}</p>
                                </div>
                              )}

                              {!ncmValidacao.validando && ncmValidacao.valido === null && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Digite o código NCM de 8 dígitos para validação automática
                                </p>
                              )}
                            </div>

                            {/* CFOP */}
                            <div>
                              <label className="block text-sm font-medium text-gray-400 mb-2">
                                CFOP (Código Fiscal de Operações) <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={novoProduto.cfop || '5102'}
                                onChange={(e) => {
                                  const newCfop = e.target.value;
                                  let newSituacaoTributaria = novoProduto.situacao_tributaria;

                                  // Aplicar regras fiscais obrigatórias baseadas no CFOP
                                  if (newCfop === '5102' || newCfop === '5101') {
                                    // CFOP 5102/5101: CST 00 (Normal) ou CSOSN 102 (Simples)
                                    newSituacaoTributaria = 'tributado_integral';
                                  } else if (newCfop === '5405' || newCfop === '5401' || newCfop === '5403') {
                                    // CFOP 5405/5401/5403: CST 60 (Normal) ou CSOSN 500 (Simples)
                                    newSituacaoTributaria = 'tributado_st';
                                  }

                                  // Se o CFOP não for 5405, limpar o CEST
                                  if (newCfop !== '5405') {
                                    setNovoProduto({
                                      ...novoProduto,
                                      cfop: newCfop,
                                      cest: '',
                                      situacao_tributaria: newSituacaoTributaria
                                    });
                                  } else {
                                    setNovoProduto({
                                      ...novoProduto,
                                      cfop: newCfop,
                                      situacao_tributaria: newSituacaoTributaria
                                    });
                                  }
                                }}
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                                style={{
                                  maxWidth: '100%',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                                required
                                title={`${novoProduto.cfop || '5102'} - ${
                                  novoProduto.cfop === '5102' ? 'Venda de mercadoria adquirida ou recebida de terceiros' :
                                  novoProduto.cfop === '5101' ? 'Venda de produção do estabelecimento' :
                                  novoProduto.cfop === '5405' ? 'Venda de mercadoria adquirida ou recebida de terceiros (ST)' :
                                  novoProduto.cfop === '5401' ? 'Venda de produção do estabelecimento (ST)' :
                                  novoProduto.cfop === '5403' ? 'Venda de mercadoria adquirida ou recebida de terceiros, sujeita ao regime de substituição tributária' :
                                  'Código CFOP selecionado'
                                }`}
                              >
                                <option value="5102" title="5102 - Venda de mercadoria adquirida ou recebida de terceiros">
                                  5102 - Venda de mercadoria de terceiros
                                </option>
                                <option value="5101" title="5101 - Venda de produção do estabelecimento">
                                  5101 - Venda de produção própria
                                </option>
                                <option value="5405" title="5405 - Venda de mercadoria adquirida ou recebida de terceiros (ST)">
                                  5405 - Venda de mercadoria de terceiros (ST)
                                </option>
                                <option value="5401" title="5401 - Venda de produção do estabelecimento (ST)">
                                  5401 - Venda de produção própria (ST)
                                </option>
                                <option value="5403" title="5403 - Venda de mercadoria adquirida ou recebida de terceiros, sujeita ao regime de substituição tributária">
                                  5403 - Venda com substituição tributária
                                </option>
                              </select>
                              <p className="text-xs text-gray-500 mt-1">
                                Passe o mouse sobre as opções para ver a descrição completa
                              </p>
                              {(['5102', '5101', '5405', '5401', '5403'].includes(novoProduto.cfop || '')) && (
                                <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-700/50 rounded text-xs">
                                  <p className="text-yellow-300 font-medium">⚠️ Regra Fiscal Aplicada</p>
                                  <p className="text-yellow-200 mt-1">
                                    {(novoProduto.cfop === '5102' || novoProduto.cfop === '5101') && 'CFOP requer situação tributária "Tributada integralmente" (CST 00/CSOSN 102)'}
                                    {(novoProduto.cfop === '5405' || novoProduto.cfop === '5401' || novoProduto.cfop === '5403') && 'CFOP requer situação tributária "ICMS por substituição tributária" (CST 60/CSOSN 500)'}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Origem do Produto */}
                            <div>
                              <label className="block text-sm font-medium text-gray-400 mb-2">
                                Origem do Produto <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={novoProduto.origem_produto || 0}
                                onChange={(e) => setNovoProduto({ ...novoProduto, origem_produto: parseInt(e.target.value) })}
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                                style={{
                                  maxWidth: '100%',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                                required
                              >
                                <option value={0} title="0 - Nacional, exceto as indicadas nos códigos 3, 4, 5 e 8">
                                  0 - Nacional (padrão)
                                </option>
                                <option value={1} title="1 - Estrangeira - Importação direta, exceto a indicada no código 6">
                                  1 - Estrangeira - Importação direta
                                </option>
                                <option value={2} title="2 - Estrangeira - Adquirida no mercado interno, exceto a indicada no código 7">
                                  2 - Estrangeira - Mercado interno
                                </option>
                                <option value={3} title="3 - Nacional, mercadoria ou bem com Conteúdo de Importação superior a 40% e inferior ou igual a 70%">
                                  3 - Nacional - Conteúdo importação 40-70%
                                </option>
                                <option value={4} title="4 - Nacional, cuja produção tenha sido feita em conformidade com os processos produtivos básicos">
                                  4 - Nacional - Processos produtivos básicos
                                </option>
                                <option value={5} title="5 - Nacional, mercadoria ou bem com Conteúdo de Importação inferior ou igual a 40%">
                                  5 - Nacional - Conteúdo importação ≤40%
                                </option>
                                <option value={6} title="6 - Estrangeira - Importação direta, sem similar nacional, constante em lista da CAMEX e gás natural">
                                  6 - Estrangeira - Sem similar nacional
                                </option>
                                <option value={7} title="7 - Estrangeira - Adquirida no mercado interno, sem similar nacional, constante lista CAMEX e gás natural">
                                  7 - Estrangeira - Mercado interno sem similar
                                </option>
                                <option value={8} title="8 - Nacional, mercadoria ou bem com Conteúdo de Importação superior a 70%">
                                  8 - Nacional - Conteúdo importação &gt;70%
                                </option>
                              </select>
                              <p className="text-xs text-gray-500 mt-1">
                                Passe o mouse sobre as opções para ver a descrição completa
                              </p>
                            </div>

                            {/* Situação Tributária */}
                            <div>
                              <label className="block text-sm font-medium text-gray-400 mb-2">
                                Situação Tributária <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={novoProduto.situacao_tributaria || 'tributado_integral'}
                                onChange={(e) => setNovoProduto({ ...novoProduto, situacao_tributaria: e.target.value })}
                                disabled={['5102', '5101', '5405', '5401', '5403'].includes(novoProduto.cfop || '')}
                                className={`w-full border rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-primary-500/20 ${
                                  ['5102', '5101', '5405', '5401', '5403'].includes(novoProduto.cfop || '')
                                    ? 'bg-gray-700/50 border-gray-600 cursor-not-allowed opacity-75'
                                    : 'bg-gray-800/50 border-gray-700 focus:border-primary-500'
                                }`}
                                style={{
                                  maxWidth: '100%',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                                required
                              >
                                <option
                                  value="tributado_integral"
                                  title={regimeTributario === 1 || regimeTributario === 2
                                    ? '102 - Tributada sem permissão de crédito (Simples Nacional)'
                                    : '00 - Tributada integralmente (Regime Normal)'
                                  }
                                >
                                  {regimeTributario === 1 || regimeTributario === 2
                                    ? '102 - Tributada sem permissão de crédito'
                                    : '00 - Tributada integralmente'
                                  }
                                </option>
                                <option
                                  value="tributado_st"
                                  title={regimeTributario === 1 || regimeTributario === 2
                                    ? '500 - ICMS cobrado por substituição tributária (Simples Nacional)'
                                    : '60 - ICMS cobrado por substituição tributária (Regime Normal)'
                                  }
                                >
                                  {regimeTributario === 1 || regimeTributario === 2
                                    ? '500 - ICMS por substituição tributária'
                                    : '60 - ICMS por substituição tributária'
                                  }
                                </option>
                                <option
                                  value="isento"
                                  title={regimeTributario === 1 || regimeTributario === 2
                                    ? '300 - Imune/Não tributada/Isenta (Simples Nacional)'
                                    : '40 - Isenta/Imune/Não tributada (Regime Normal)'
                                  }
                                >
                                  {regimeTributario === 1 || regimeTributario === 2
                                    ? '300 - Imune/Não tributada/Isenta'
                                    : '40 - Isenta/Imune/Não tributada'
                                  }
                                </option>
                                <option
                                  value="nao_tributado"
                                  title={regimeTributario === 1 || regimeTributario === 2
                                    ? '400 - Não tributada pelo Simples Nacional'
                                    : '41 - Não tributada (Regime Normal)'
                                  }
                                >
                                  {regimeTributario === 1 || regimeTributario === 2
                                    ? '400 - Não tributada pelo Simples'
                                    : '41 - Não tributada'
                                  }
                                </option>
                                <option
                                  value="suspenso"
                                  title={regimeTributario === 1 || regimeTributario === 2
                                    ? '103 - Tributada com permissão de crédito (Simples Nacional)'
                                    : '50 - Suspensão (Regime Normal)'
                                  }
                                >
                                  {regimeTributario === 1 || regimeTributario === 2
                                    ? '103 - Tributada com permissão de crédito'
                                    : '50 - Suspensão'
                                  }
                                </option>
                              </select>
                              <p className="text-xs text-gray-500 mt-1">
                                {['5102', '5101', '5405', '5401', '5403'].includes(novoProduto.cfop || '') ? (
                                  <span className="text-yellow-400">
                                    🔒 Campo bloqueado - Situação tributária definida automaticamente pelo CFOP selecionado
                                  </span>
                                ) : (
                                  regimeTributario === 1 || regimeTributario === 2
                                    ? 'Códigos CSOSN para Simples Nacional. Passe o mouse sobre as opções para ver detalhes.'
                                    : 'Códigos CST para Regime Normal. Passe o mouse sobre as opções para ver detalhes.'
                                )}
                              </p>
                            </div>

                            {/* Alíquotas */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                  Alíquota ICMS (%)
                                </label>
                                <input
                                  type="number"
                                  value={novoProduto.aliquota_icms || 0}
                                  onChange={(e) => setNovoProduto({ ...novoProduto, aliquota_icms: parseFloat(e.target.value) || 0 })}
                                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                                  placeholder="18.00"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                  Alíquota PIS (%)
                                </label>
                                <input
                                  type="number"
                                  value={novoProduto.aliquota_pis || 1.65}
                                  onChange={(e) => setNovoProduto({ ...novoProduto, aliquota_pis: parseFloat(e.target.value) || 0 })}
                                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                                  placeholder="1.65"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                  Alíquota COFINS (%)
                                </label>
                                <input
                                  type="number"
                                  value={novoProduto.aliquota_cofins || 7.60}
                                  onChange={(e) => setNovoProduto({ ...novoProduto, aliquota_cofins: parseFloat(e.target.value) || 0 })}
                                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                                  placeholder="7.60"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                />
                              </div>
                            </div>

                            {/* Campos Opcionais */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* CEST - Mostrar apenas se CFOP for 5405 */}
                              {novoProduto.cfop === '5405' && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-400 mb-2">
                                    CEST (Código Especificador ST) <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={novoProduto.cest || ''}
                                    onChange={(e) => {
                                      // Permitir apenas números e limitar a 7 dígitos
                                      const valor = e.target.value.replace(/\D/g, '').slice(0, 7);
                                      setNovoProduto({ ...novoProduto, cest: valor });
                                    }}
                                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                                    placeholder="1234567 (7 dígitos)"
                                    maxLength={7}
                                    required
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    Obrigatório para CFOP 5405 - Venda de mercadoria sujeita à Substituição Tributária.
                                  </p>
                                </div>
                              )}

                              <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                  Peso Líquido (kg)
                                </label>
                                <input
                                  type="number"
                                  value={novoProduto.peso_liquido || 0}
                                  onChange={(e) => setNovoProduto({ ...novoProduto, peso_liquido: parseFloat(e.target.value) || 0 })}
                                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                                  placeholder="0.000"
                                  step="0.001"
                                  min="0"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Peso líquido do produto em quilogramas.
                                </p>
                              </div>
                            </div>

                            {/* Informação sobre regime tributário */}
                            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                              <div className="flex items-start gap-3">
                                <div className="bg-blue-500/20 rounded-full p-1 mt-0.5">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <path d="l9 12 2 2 4-4"></path>
                                  </svg>
                                </div>
                                <div>
                                  <h4 className="text-blue-300 font-medium text-sm mb-1">Regime Tributário da Empresa</h4>
                                  <p className="text-blue-200 text-xs">
                                    {regimeTributario === 1 && 'Simples Nacional - Utiliza códigos CSOSN (Código de Situação da Operação no Simples Nacional).'}
                                    {regimeTributario === 2 && 'Simples Nacional (Excesso) - Utiliza códigos CSOSN (Código de Situação da Operação no Simples Nacional).'}
                                    {regimeTributario === 3 && 'Regime Normal - Utiliza códigos CST (Código de Situação Tributária).'}
                                  </p>
                                  <p className="text-blue-200 text-xs mt-1">
                                    {regimeTributario === 1 || regimeTributario === 2
                                      ? 'Se a empresa mudar para Regime Normal, os códigos CSOSN serão convertidos automaticamente para CST.'
                                      : 'Se a empresa mudar para Simples Nacional, os códigos CST serão convertidos automaticamente para CSOSN.'
                                    }
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                          <Button
                            type="button"
                            variant="text"
                            className="flex-1"
                            onClick={() => setActiveTab('dados')}
                          >
                            Voltar
                          </Button>
                          <Button
                            type="button"
                            variant="primary"
                            className="flex-1"
                            onClick={async () => {
                              // Validar NCM obrigatório
                              if (!novoProduto.ncm || novoProduto.ncm.length !== 8) {
                                showMessage('error', 'NCM é obrigatório e deve ter 8 dígitos');
                                return;
                              }

                              // Validar se NCM é válido (se foi validado)
                              if (ncmValidacao.valido === false) {
                                showMessage('error', 'NCM inválido. Verifique o código informado.');
                                return;
                              }

                              // Se NCM ainda está sendo validado, aguardar
                              if (ncmValidacao.validando) {
                                showMessage('warning', 'Aguarde a validação do NCM...');
                                return;
                              }

                              // Validar CEST se CFOP for 5405
                              if (novoProduto.cfop === '5405') {
                                if (!novoProduto.cest || novoProduto.cest.length !== 7) {
                                  showMessage('error', 'CEST é obrigatório e deve ter 7 dígitos para CFOP 5405');
                                  return;
                                }
                              }

                              // Simular o evento de submit do formulário
                              const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                              await handleSubmitProduto(fakeEvent);
                            }}
                            disabled={isLoading}
                          >
                            {isLoading ? 'Salvando...' : 'Concluir'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <DeleteConfirmation
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmDelete}
        title={deleteConfirmation.title}
        message={deleteConfirmation.message}
      />

      <WarningModal
        isOpen={showWarning}
        onClose={() => setShowWarning(false)}
        message={warningMessage}
      />

      {/* Galeria de fotos */}
      <FotoGaleria
        fotos={produtoFotos}
        isOpen={isGaleriaOpen}
        onClose={() => setIsGaleriaOpen(false)}
        initialFotoIndex={currentFotoIndex}
      />

      {/* Formulário de Unidade de Medida */}
      <AnimatePresence>
        {showUnidadeMedidaForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-end z-50"
            onClick={() => setShowUnidadeMedidaForm(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-background-dark h-full w-full max-w-md overflow-y-auto custom-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">Nova Unidade de Medida</h2>
                  <button
                    type="button"
                    onClick={() => setShowUnidadeMedidaForm(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmitUnidadeMedida}>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Sigla <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={novaUnidadeMedida.sigla}
                        onChange={(e) => setNovaUnidadeMedida({ ...novaUnidadeMedida, sigla: e.target.value.toUpperCase() })}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        placeholder="Ex: KG, UN, CX"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Nome <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={novaUnidadeMedida.nome}
                        onChange={(e) => setNovaUnidadeMedida({ ...novaUnidadeMedida, nome: e.target.value })}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        placeholder="Ex: Quilograma, Unidade, Caixa"
                        required
                      />
                    </div>
                  </div>

                  <div className="mt-8">
                    <Button
                      type="submit"
                      variant="primary"
                      fullWidth
                      isLoading={isLoadingUnidadeMedida}
                    >
                      Salvar
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProdutosPage;