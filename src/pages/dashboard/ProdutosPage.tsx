import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Trash2, Search, ArrowUpDown, AlertCircle, Plus, ChevronDown, ChevronUp, Image, Upload, Star, StarOff, Camera } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Grupo, Produto, OpcaoAdicional, ProdutoOpcao } from '../../types';
import { showMessage } from '../../utils/toast';
import Button from '../../components/comum/Button';
import FotoGaleria from '../../components/comum/FotoGaleria';

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
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGrupoForm, setIsGrupoForm] = useState(true);
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
    promocao: false,
    ativo: true,
    desconto_quantidade: false,
    quantidade_minima: 0,
    tipo_desconto_quantidade: 'percentual',
    valor_desconto_quantidade: 0,
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

  // Estados para a aba de fotos
  const [activeTab, setActiveTab] = useState<'dados' | 'fotos'>('dados');
  const [produtoFotos, setProdutoFotos] = useState<ProdutoFoto[]>([]);
  const [isUploadingFoto, setIsUploadingFoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para a galeria de fotos
  const [isGaleriaOpen, setIsGaleriaOpen] = useState(false);
  const [currentFotoIndex, setCurrentFotoIndex] = useState(0);

  // Estado para unidades de medida
  const [unidadesMedida, setUnidadesMedida] = useState<UnidadeMedida[]>([]);

  // Estado para o valor formatado do desconto
  const [descontoFormatado, setDescontoFormatado] = useState('');

  // Estado para o valor final após o desconto
  const [valorFinalFormatado, setValorFinalFormatado] = useState('');

  // Estado para o valor formatado do desconto por quantidade
  const [descontoQuantidadeFormatado, setDescontoQuantidadeFormatado] = useState('');

  useEffect(() => {
    loadGrupos();
    loadAvailableOpcoes();
    loadUnidadesMedida();
  }, []);

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
    } catch (error: any) {
      console.error('Erro ao carregar unidades de medida:', error);
      showMessage('error', 'Erro ao carregar unidades de medida');
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
    } catch (error: any) {
      console.error('Error loading available options:', error);
    }
  };

  const loadGrupos = async () => {
    try {
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
    } catch (error: any) {
      showMessage('error', 'Erro ao carregar grupos: ' + error.message);
    }
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
    setNovoProduto({
      nome: '',
      preco: 0,
      descricao: '',
      codigo: nextCode,
      promocao: false,
      tipo_desconto: 'percentual',
      valor_desconto: 0,
      ativo: true,
      unidade_medida_id: unidadesMedida.length > 0 ? unidadesMedida[0].id : undefined,
      desconto_quantidade: false,
      quantidade_minima: 5,
      tipo_desconto_quantidade: 'percentual',
      valor_desconto_quantidade: 10,
    });
    // Inicializa o preço formatado
    setPrecoFormatado(formatarPreco(0));

    // Inicializa o valor do desconto formatado
    setDescontoFormatado('0');

    // Inicializa o valor do desconto por quantidade formatado
    setDescontoQuantidadeFormatado('10');
    setShowSidebar(true);
  };

  const handleEditProduto = async (grupo: Grupo, produto: Produto) => {
    console.log('handleEditProduto chamado com:', { grupo, produto });

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
      promocao: produto.promocao || false,
      tipo_desconto: produto.tipo_desconto || 'percentual',
      valor_desconto: produto.valor_desconto || 0,
      ativo: produto.ativo !== false, // Se não estiver definido, assume true
      unidade_medida_id: produto.unidade_medida_id,
      desconto_quantidade: produto.desconto_quantidade || false,
      quantidade_minima: produto.quantidade_minima || 5,
      tipo_desconto_quantidade: produto.tipo_desconto_quantidade || 'percentual',
      valor_desconto_quantidade: produto.valor_desconto_quantidade || 10,
    };

    console.log('Definindo novoProduto com:', produtoState);

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
    if (produto.valor_desconto_quantidade !== undefined) {
      if (produto.tipo_desconto_quantidade === 'percentual') {
        setDescontoQuantidadeFormatado(produto.valor_desconto_quantidade.toString());
      } else {
        setDescontoQuantidadeFormatado(formatarPreco(produto.valor_desconto_quantidade));
      }
    }

    // Abrir o sidebar imediatamente
    console.log('Abrindo sidebar imediatamente');
    setShowSidebar(true);

    try {
      const { data: opcoesData } = await supabase
        .from('produtos_opcoes_adicionais')
        .select('opcao_id')
        .eq('produto_id', produto.id);

      setSelectedOpcoes((opcoesData || []).map(o => o.opcao_id));

      // Carregar fotos do produto
      await loadProdutoFotos(produto.id);
    } catch (error) {
      console.error('Error loading product options:', error);
    }

    console.log('Abrindo sidebar para edição de produto');
    setShowSidebar(true);
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

      // Se for a foto principal, atualizar também a lista de fotos principais
      if (isPrincipal && editingProduto) {
        // Atualizar imediatamente a foto principal na lista
        setProdutosFotosPrincipais(prev => ({
          ...prev,
          [editingProduto.id]: fotoData
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
      }

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

      // Encontrar a foto que foi definida como principal
      const novaPrincipal = produtoFotos.find(foto => foto.id === fotoId);
      if (novaPrincipal) {
        // Criar uma cópia da foto com principal = true
        const fotoPrincipalAtualizada = { ...novaPrincipal, principal: true };

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

        // Verificar se a foto excluída era a principal
        if (eraPrincipal) {
          // Se a foto excluída era a principal, verificar se há outras fotos
          if (produtoFotos.length > 0) {
            // Encontrar a primeira foto que não é a que foi excluída
            const novaFotoPrincipal = produtoFotos.find(f => f.id !== deleteConfirmation.id);
            if (novaFotoPrincipal) {
              // Atualizar a foto principal na lista
              setProdutosFotosPrincipais(prev => ({
                ...prev,
                [editingProduto.id]: novaFotoPrincipal
              }));

              // Se necessário, definir esta foto como principal no banco de dados
              if (!novaFotoPrincipal.principal) {
                await handleSetFotoPrincipal(novaFotoPrincipal.id);
              }
            }
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
      if (!novoProduto.valor_desconto_quantidade || novoProduto.valor_desconto_quantidade <= 0) {
        showMessage('error', 'Para produtos com desconto por quantidade, é necessário informar um valor de desconto maior que zero');
        return;
      }

      if (!novoProduto.quantidade_minima || novoProduto.quantidade_minima <= 0) {
        showMessage('error', 'Para produtos com desconto por quantidade, é necessário informar uma quantidade mínima maior que zero');
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

      // Verificar se o código já está sendo usado por outro produto não deletado
      const { data: existingProducts } = await supabase
        .from('produtos')
        .select('id')
        .eq('codigo', novoProduto.codigo)
        .eq('deletado', false)
        .eq('empresa_id', usuarioData.empresa_id);

      if (existingProducts && existingProducts.length > 0 && (!editingProduto || existingProducts[0].id !== editingProduto.id)) {
        showMessage('error', 'Este código já está sendo utilizado por outro produto');
        return;
      }

      let productId: string;

      if (editingProduto) {
        const { data, error } = await supabase
          .from('produtos')
          .update({
            nome: novoProduto.nome,
            preco: novoProduto.preco,
            descricao: novoProduto.descricao,
            codigo: novoProduto.codigo,
            promocao: novoProduto.promocao,
            tipo_desconto: novoProduto.promocao ? novoProduto.tipo_desconto : null,
            valor_desconto: novoProduto.promocao ? novoProduto.valor_desconto : null,
            ativo: novoProduto.ativo,
            unidade_medida_id: novoProduto.unidade_medida_id,
            desconto_quantidade: novoProduto.desconto_quantidade,
            quantidade_minima: novoProduto.desconto_quantidade ? novoProduto.quantidade_minima : null,
            tipo_desconto_quantidade: novoProduto.desconto_quantidade ? novoProduto.tipo_desconto_quantidade : null,
            valor_desconto_quantidade: novoProduto.desconto_quantidade ? novoProduto.valor_desconto_quantidade : null,
            empresa_id: usuarioData.empresa_id
          })
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
          valor_desconto_quantidade: novoProduto.desconto_quantidade ? novoProduto.valor_desconto_quantidade : null,
          // Garantir que os campos de promoção sejam null quando não habilitados
          tipo_desconto: novoProduto.promocao ? novoProduto.tipo_desconto : null,
          valor_desconto: novoProduto.promocao ? novoProduto.valor_desconto : null,
        };

        const { data, error } = await supabase
          .from('produtos')
          .insert([produtoData])
          .select()
          .single();

        if (error) throw error;
        productId = data.id;
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

      if (editingProduto) {
        showMessage('success', 'Produto atualizado com sucesso!');
        setShowSidebar(false);
      } else {
        // Se for um novo produto, mantém o sidebar aberto e muda para a aba de fotos
        showMessage('success', 'Produto adicionado com sucesso! Agora você pode adicionar fotos.');
        // Atualiza o editingProduto com o produto recém-criado
        setEditingProduto({
          ...novoProduto,
          id: productId,
          grupo_id: selectedGrupo.id,
          empresa_id: usuarioData.empresa_id,
          created_at: new Date().toISOString()
        });
        // Muda para a aba de fotos
        setActiveTab('fotos');
      }
    } catch (error: any) {
      showMessage('error', `Erro ao ${editingProduto ? 'atualizar' : 'criar'} produto: ` + error.message);
    } finally {
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
        produto.codigo.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const comparison = a.nome.localeCompare(b.nome);
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  };

  const renderProdutoOpcoes = (produto: Produto) => {
    if (!produtoOpcoes[produto.id]?.length) return null;

    return (
      <div className="mt-3 border-t border-gray-700 pt-3">
        <p className="text-sm font-medium text-gray-400 mb-2">Adicionais:</p>
        <div className="space-y-2">
          {produtoOpcoes[produto.id].map((opcao) => (
            <div
              key={opcao.id}
              className="bg-gray-700/30 rounded-lg overflow-hidden"
            >
              <div
                className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-700/50 transition-colors"
                onClick={() => toggleOpcao(produto.id, opcao.id)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white">{opcao.nome}</span>
                  <span className="text-xs text-gray-400">
                    ({opcao.itens.length} {opcao.itens.length === 1 ? 'item' : 'itens'})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveAdicional(produto.id, opcao.id);
                    }}
                    className="text-red-400 hover:text-red-300 p-1"
                  >
                    <X size={14} />
                  </button>
                  {expandedOpcoes[`${produto.id}-${opcao.id}`] ? (
                    <ChevronUp size={16} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400" />
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
                    <div className="p-2 space-y-1">
                      {opcao.itens.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between px-2 py-1 rounded bg-gray-700/30"
                        >
                          <span className="text-sm text-gray-300">{item.nome}</span>
                          <span className="text-sm text-primary-400">
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

  // Função para carregar as fotos principais de todos os produtos
  const loadProdutosFotosPrincipais = async (produtos: Produto[]) => {
    const fotosMap: Record<string, ProdutoFoto | null> = {};

    for (const produto of produtos) {
      const foto = await getProdutoFotoPrincipal(produto.id);
      fotosMap[produto.id] = foto;
    }

    setProdutosFotosPrincipais(fotosMap);
  };

  // Carregar fotos principais quando os produtos mudarem
  useEffect(() => {
    const allProdutos = grupos.flatMap(grupo => grupo.produtos);
    if (allProdutos.length > 0) {
      loadProdutosFotosPrincipais(allProdutos);
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

    return (
      <div
        key={produto.id}
        className={`p-3 bg-gray-800/50 rounded-lg ${produto.ativo === false ? 'opacity-60' : ''}`}
      >
        <div className="flex items-start gap-4">
          {/* Foto principal do produto */}
          <div
            className="w-24 h-24 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0 cursor-pointer"
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
                <Image size={24} />
              </div>
            )}
          </div>

          {/* Informações do produto */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <h4 className="text-white font-medium">{produto.nome}</h4>
                <span className="text-sm text-gray-400">#{produto.codigo}</span>
                {produto.promocao && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400 rounded-full">
                    Promoção
                  </span>
                )}
                {produto.desconto_quantidade && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full">
                    Desconto {produto.quantidade_minima}+ unid.
                  </span>
                )}
                {produto.ativo === false && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded-full">
                    Inativo
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                  onClick={() => {
                    console.log('Botão de edição clicado para produto:', produto);
                    handleEditProduto(grupo, produto);
                  }}
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="p-1 text-red-400 hover:text-red-300 transition-colors"
                  onClick={() => handleDeleteProduto(produto.id, grupo.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="flex flex-col mb-1">
              <div className="flex items-center gap-2">
                {produto.promocao && produto.tipo_desconto && produto.valor_desconto !== undefined ? (
                  <>
                    <p className="text-sm text-gray-400 line-through">
                      {produto.preco.toFixed(2)}
                    </p>
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400 rounded-full">
                      {descontoExibicao}
                    </span>
                  </>
                ) : (
                  <p className="text-sm text-primary-400">
                    {produto.preco.toFixed(2)}
                  </p>
                )}
                {unidadeMedida && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-primary-500/10 text-primary-400 rounded-full">
                    {unidadeMedida.sigla} - {unidadeMedida.nome}
                  </span>
                )}
              </div>

              {produto.promocao && produto.tipo_desconto && produto.valor_desconto !== undefined && (
                <p className="text-sm text-green-400 font-medium mt-1">
                  Valor final: {valorFinal.toFixed(2)}
                </p>
              )}
            </div>
            {produto.descricao && (
              <p className="text-sm text-gray-400 mt-1">
                {produto.descricao}
              </p>
            )}
            {renderProdutoOpcoes(produto)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Produtos</h1>
          <p className="text-gray-400 mt-1">Gerencie seus grupos e produtos</p>
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={handleAddGrupo}
        >
          + Adicionar Grupo
        </Button>
      </div>

      <div className="mb-6 flex gap-4">
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
        <div className="space-y-6">
          {filteredAndSortedGrupos.map((grupo) => (
            <div
              key={grupo.id}
              className="bg-background-card rounded-lg border border-gray-800"
            >
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">{grupo.nome}</h3>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="text"
                    onClick={() => handleAddProduto(grupo)}
                  >
                    + Adicionar Produto
                  </Button>
                  <button
                    className="p-1 text-gray-400 hover:text-white transition-colors"
                    onClick={() => handleEditGrupo(grupo)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="p-1 text-red-400 hover:text-red-300 transition-colors"
                    onClick={() => handleDeleteGrupo(grupo.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="p-4">
                <div className="mb-4 flex gap-4">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Buscar produtos por nome ou código..."
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
                  <div className="text-center py-8">
                    <p className="text-gray-400">
                      {productSearchTerms[grupo.id]
                        ? 'Nenhum produto encontrado'
                        : 'Nenhum produto neste grupo'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getFilteredAndSortedProducts(grupo).map((produto) => renderProduto(grupo, produto))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowSidebar(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed right-0 top-0 h-screen w-full max-w-md bg-background-card border-l border-gray-800 z-50 overflow-y-auto"
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
                    onClick={() => setShowSidebar(false)}
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
                    </div>

                    {activeTab === 'dados' ? (
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
                          <select
                            value={novoProduto.unidade_medida_id || ''}
                            onChange={(e) => setNovoProduto({ ...novoProduto, unidade_medida_id: e.target.value })}
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

                        <div className="mb-4">
                          <div className="flex items-center">
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
                        </div>

                        <div className="mb-4">
                          <div className="flex items-center">
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
                                    valor_desconto_quantidade: 10
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
                        </div>

                        {novoProduto.promocao && (
                          <>
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

                            <div className="mb-4">
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
                          </>
                        )}

                        {novoProduto.desconto_quantidade && (
                          <>
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-400 mb-2">
                                Quantidade Mínima <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                value={novoProduto.quantidade_minima || 5}
                                onChange={(e) => {
                                  const valor = parseInt(e.target.value);
                                  setNovoProduto({ ...novoProduto, quantidade_minima: valor > 0 ? valor : 1 });
                                }}
                                min="1"
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
                                      const novoValorDesconto = !novoProduto.tipo_desconto_quantidade || novoProduto.tipo_desconto_quantidade !== 'percentual'
                                        ? 10
                                        : novoProduto.valor_desconto_quantidade;

                                      setNovoProduto({
                                        ...novoProduto,
                                        tipo_desconto_quantidade: 'percentual',
                                        valor_desconto_quantidade: novoValorDesconto || 10
                                      });

                                      // Atualizar o formato do desconto quando mudar o tipo
                                      setDescontoQuantidadeFormatado((novoValorDesconto || 10).toString());
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

                            <div className="mb-4">
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
                                    setNovoProduto({ ...novoProduto, valor_desconto_quantidade: valorNumerico });
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
                                    !novoProduto.valor_desconto_quantidade || novoProduto.valor_desconto_quantidade <= 0
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
                              {(!novoProduto.valor_desconto_quantidade || novoProduto.valor_desconto_quantidade <= 0) && (
                                <p className="text-red-500 text-xs mt-1">
                                  É necessário informar um valor de desconto maior que zero
                                </p>
                              )}
                            </div>
                          </>
                        )}

                        {/* Seção de Opções Adicionais ocultada conforme solicitado */}

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
                            {isLoading ? 'Salvando...' : editingProduto ? 'Salvar' : 'Criar'}
                          </Button>
                        </div>

                        {editingProduto && (
                          <div className="mt-4 pt-4 border-t border-gray-700">
                            <Button
                              type="button"
                              variant="secondary"
                              className="w-full flex items-center justify-center gap-2"
                              onClick={() => setActiveTab('fotos')}
                            >
                              <Camera size={16} />
                              <span>Gerenciar Fotos do Produto</span>
                            </Button>
                          </div>
                        )}
                      </form>
                    ) : (
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
                          <>
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
                                      <>
                                        <div className="w-4 h-4 border-2 border-gray-500 border-t-white rounded-full animate-spin"></div>
                                        <span>Enviando...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Upload size={18} />
                                        <span>Adicionar Foto</span>
                                      </>
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
                                onClick={() => setShowSidebar(false)}
                              >
                                Concluir
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
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
    </div>
  );
};

export default ProdutosPage;