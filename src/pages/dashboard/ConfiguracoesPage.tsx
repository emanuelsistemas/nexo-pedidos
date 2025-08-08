import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Trash2, Users, Shield, Settings, CreditCard, Search, Store, Bike, Clock, Eye, EyeOff, Lock, Unlock, Copy, Check, ShoppingCart, Truck, MessageSquare, Receipt, DollarSign, ChevronDown, FileText, Phone, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Button from '../../components/comum/Button';
import SearchableSelect from '../../components/comum/SearchableSelect';
import MultiSelect from '../../components/comum/MultiSelect';
import { showMessage, translateErrorMessage } from '../../utils/toast';
import { TipoUserConfig } from '../../types';
import { useAuthSession } from '../../hooks/useAuthSession';
import QRCode from 'qrcode';
import { extractCertificateInfo, checkCertificateExpiry, checkCertificateStatus } from '../../api/certificateApi';
import { useCertificateUpload } from '../../hooks/useCertificateUpload';
import NFeValidationModal from '../../components/comum/NFeValidationModal';
import {
  validarRazaoSocialEmpresa,
  validarNomeFantasiaEmpresa,
  validarNomeProprietario,
  validarEndereco,
  validarBairro,
  validarCidade,
  validarComplemento,
  ValidationResult
} from '../../utils/nfeValidation';

// Componente de Skeleton Loading para Configurações
const ConfigSkeletonLoader = () => (
  <div className="space-y-6 animate-pulse">
    {/* Header Skeleton */}
    <div className="space-y-3">
      <div className="h-8 bg-gray-700 rounded-lg w-1/3"></div>
      <div className="h-4 bg-gray-700 rounded w-2/3"></div>
    </div>

    {/* Form Fields Skeleton */}
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="h-4 bg-gray-700 rounded w-1/4"></div>
        <div className="h-10 bg-gray-700 rounded-lg"></div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-700 rounded w-1/4"></div>
        <div className="h-10 bg-gray-700 rounded-lg"></div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-700 rounded w-1/4"></div>
        <div className="h-10 bg-gray-700 rounded-lg"></div>
      </div>
    </div>

    {/* Cards Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="h-32 bg-gray-700 rounded-lg"></div>
      <div className="h-32 bg-gray-700 rounded-lg"></div>
      <div className="h-32 bg-gray-700 rounded-lg"></div>
      <div className="h-32 bg-gray-700 rounded-lg"></div>
    </div>

    {/* Button Skeleton */}
    <div className="flex gap-3">
      <div className="h-10 bg-gray-700 rounded-lg w-24"></div>
      <div className="h-10 bg-gray-700 rounded-lg w-20"></div>
    </div>
  </div>
);

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

  // Verificar se é uma ação de bloquear/desbloquear para ajustar o texto do botão
  const isToggleStatus = title.includes('Bloquear') || title.includes('Desbloquear');
  const buttonText = isToggleStatus ? 'Confirmar' : 'Excluir';
  const buttonClass = isToggleStatus
    ? 'flex-1 !bg-blue-500 hover:!bg-blue-600'
    : 'flex-1 !bg-red-500 hover:!bg-red-600';

  return (
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
            className={buttonClass}
            onClick={onConfirm}
          >
            {buttonText}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const segmentos = [
  'Bar',
  'Restaurante',
  'Pizzaria',
  'Padaria',
  'Lanchonete',
  'Hamburgueria',
  'Cafeteria',
  'Sorveteria',
  'Doceria',
  'Açaí',
  'Pastelaria',
  'Marmitaria',
  'Churrascaria',
  'Sushi',
  'Outros'
];

const tiposPagamento = [
  { value: 'Dinheiro', label: 'Dinheiro' },
  { value: 'Debito', label: 'Débito' },
  { value: 'Credito', label: 'Crédito' },
  { value: 'PIX', label: 'PIX' },
  { value: 'Vale Alimentacao', label: 'Vale Alimentação' },
];

const ConfiguracoesPage: React.FC = () => {
  const { withSessionCheck } = useAuthSession();
  const { uploadCertificateLocal, removeCertificateLocal, isUploading: isUploadingLocal } = useCertificateUpload();
  const [showSidebar, setShowSidebar] = useState(false);
  const [activeSection, setActiveSection] = useState<'usuarios' | 'perfis' | 'geral' | 'pagamentos' | 'status' | 'taxa' | 'horarios' | 'estoque' | 'pedidos' | 'produtos' | 'conta' | 'pdv' | 'taxaentrega' | 'tabelaprecos' | 'conexao' | 'certificado'>('geral');
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [perfis, setPerfis] = useState<any[]>([]);
  const [empresa, setEmpresa] = useState<any>(null);
  const [formasPagamento, setFormasPagamento] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCnpjLoading, setIsCnpjLoading] = useState(false);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [usuarioLogado, setUsuarioLogado] = useState<{id: string, tipo: string} | null>(null);
  const [copiedFields, setCopiedFields] = useState<{[key: string]: boolean}>({});
  const [selectedTipo, setSelectedTipo] = useState('');
  const [storeStatus, setStoreStatus] = useState<{
    modo_operacao: 'manual' | 'automatico';
  }>({ modo_operacao: 'manual' });

  // Estado para o formulário de usuário
  const [usuarioForm, setUsuarioForm] = useState({
    id: '',
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    tipo_user_config_id: [] as string[], // Agora é um array
    serie_nfce: 1, // ✅ NOVO: Série da NFC-e para o usuário
    // Campos de comissão para vendedores
    tipo_comissao: 'total_venda', // 'total_venda' ou 'grupos'
    percentual_comissao: 0,
    grupos_comissao: [] as string[] // IDs dos grupos selecionados
  });

  // Estado para tipos de usuário
  const [tiposUsuario, setTiposUsuario] = useState<TipoUserConfig[]>([]);

  // Estado para grupos de produtos (para comissão de vendedores)
  const [grupos, setGrupos] = useState<any[]>([]);

  // Estado para controlar a visibilidade da senha
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);

  // Estado para erros de validação
  const [formErrors, setFormErrors] = useState({
    senha: '',
    email: '',
    serie_nfce: '' // ✅ NOVO: Erro para série da NFC-e
  });

  // Estado para controlar o modo de edição
  const [isEditingUsuario, setIsEditingUsuario] = useState(false);
  const [taxaMode, setTaxaMode] = useState<'bairro' | 'distancia'>('bairro');
  const [horarios, setHorarios] = useState<any[]>([]);
  const [tipoControleEstoque, setTipoControleEstoque] = useState<'faturamento' | 'pedidos' | 'pdv'>('pedidos');
  const [bloqueiaSemEstoque, setBloqueiaSemEstoque] = useState<boolean>(false);
  const [agruparItens, setAgruparItens] = useState<boolean>(false);
  const [opcoesAdicionais, setOpcoesAdicionais] = useState<boolean>(false);
  const [taxaEntregaHabilitada, setTaxaEntregaHabilitada] = useState<boolean>(false);
  const [tipoTaxaEntrega, setTipoTaxaEntrega] = useState<'bairro' | 'distancia'>('distancia');

  // Estados para Tabela de Preços
  const [trabalhaComTabelaPrecos, setTrabalhaComTabelaPrecos] = useState<boolean>(false);
  const [trabalhaComSabores, setTrabalhaComSabores] = useState<boolean>(false);
  const [tipoPrecoPizza, setTipoPrecoPizza] = useState<'sabor_mais_caro' | 'media_sabores'>('sabor_mais_caro');
  const [tabelasPrecos, setTabelasPrecos] = useState<any[]>([]);
  const [showModalTabelaPrecos, setShowModalTabelaPrecos] = useState<boolean>(false);
  const [tabelaPrecosSelecionada, setTabelaPrecosSelecionada] = useState<any>(null);
  const [nomeNovaTabela, setNomeNovaTabela] = useState<string>('');
  const [quantidadeSabores, setQuantidadeSabores] = useState<number>(2);

  // Estados para Conexão
  const [conexaoConfig, setConexaoConfig] = useState({
    habilita_conexao_whatsapp: false
  });

  // Estados para configurações do PDV
  const [pdvConfig, setPdvConfig] = useState({
    comandas: false,
    mesas: false,
    vendedor: false,
    exibe_foto_item: false,
    seleciona_clientes: false,
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
    desconto_no_total: false,
    vendas_itens_multiplicacao: false,
    exibir_dados_fiscais_venda: false,
    solicitar_nome_cliente: false,
    ocultar_finalizar_com_impressao: false,
    ocultar_finalizar_sem_impressao: false,
    ocultar_nfce_com_impressao: false,
    ocultar_nfce_sem_impressao: false,
    ocultar_nfce_producao: false,
    ocultar_producao: false,
    rodape_personalizado: 'Obrigado pela preferencia volte sempre!',
    mostrar_razao_social_cupom_finalizar: false,
    mostrar_endereco_cupom_finalizar: false,
    mostrar_operador_cupom_finalizar: false,
    tipo_impressao_80mm: true,  // ✅ NOVO: 80mm como padrão
    tipo_impressao_50mm: false,  // ✅ NOVO: 50mm desabilitado
    venda_sem_produto: false,
    venda_sem_produto_ncm: '22021000',
    venda_sem_produto_cfop: '5405',
    venda_sem_produto_origem: 0,
    venda_sem_produto_situacao_tributaria: 'st',
    venda_sem_produto_cest: '0300600',
    venda_sem_produto_margem_st: 30,
    venda_sem_produto_aliquota_icms: 18.0,
    venda_sem_produto_aliquota_pis: 1.65,
    venda_sem_produto_aliquota_cofins: 7.6,
    venda_sem_produto_peso_liquido: 0,
    venda_sem_produto_nome_padrao: 'Diversos',
    venda_sem_produto_cst: '60',
    venda_sem_produto_csosn: '500',
    modo_escuro_cardapio: false,
    exibir_fotos_itens_cardapio: false,
    cardapio_fotos_minimizadas: false,
    cardapio_abertura_tipo: 'automatico',
    cardapio_loja_aberta: true,
    trabalha_com_pizzas: false,
    ocultar_grupos_cardapio: false,
    retirada_balcao_cardapio: false,
    consumo_interno: false
  });

  // Estados para controle de ranges de mesas e comandas
  const [rangeConfig, setRangeConfig] = useState({
    mesas: {
      inicio: 1,
      fim: 50,
      configurado: false
    },
    comandas: {
      inicio: 1,
      fim: 100,
      configurado: false
    }
  });

  // Estado para controlar as abas do PDV
  const [pdvActiveTab, setPdvActiveTab] = useState<'geral' | 'botoes' | 'impressoes' | 'venda-sem-produto' | 'cardapio-digital' | 'formas-pagamento' | 'tipos-pagamentos'>('geral');

  // Estado para controlar as sub-abas do cardápio digital
  const [cardapioDigitalActiveTab, setCardapioDigitalActiveTab] = useState<'geral' | 'cupom-desconto'>('geral');

  // Estados para cupons de desconto
  const [cuponsDesconto, setCuponsDesconto] = useState<any[]>([]);
  const [showCupomModal, setShowCupomModal] = useState(false);
  const [editingCupom, setEditingCupom] = useState<any>(null);
  const [cupomForm, setCupomForm] = useState({
    codigo: '',
    descricao: '',
    tipo_desconto: 'percentual', // 'percentual' ou 'valor_fixo'
    valor_desconto: 0,
    valor_minimo_pedido: 0,
    data_inicio: '',
    data_fim: '',
    limite_uso: 0,
    ativo: true
  });

  // Estado para rodapé personalizado das impressões
  const [rodapePersonalizado, setRodapePersonalizado] = useState('Obrigado pela preferencia volte sempre!');

  // Estado para URL personalizada do cardápio digital
  const [cardapioUrlPersonalizada, setCardapioUrlPersonalizada] = useState('');

  // Estados para formas de pagamento
  const [formasPagamentoOpcoes, setFormasPagamentoOpcoes] = useState<any[]>([]);
  const [formasPagamentoEmpresa, setFormasPagamentoEmpresa] = useState<any[]>([]);
  const [showModalFormaPagamento, setShowModalFormaPagamento] = useState(false);
  const [editingFormaPagamento, setEditingFormaPagamento] = useState<any>(null);
  const [novaFormaPagamento, setNovaFormaPagamento] = useState({
    forma_pagamento_opcao_id: '',
    cardapio_digital: false,
    max_parcelas: 1,
    juros_por_parcela: 0,
    utilizar_chave_pix: false,
    tipo_chave_pix: '',
    chave_pix: ''
  });

  // Estados para tipos de pagamentos
  const [tiposPagamentosOpcoes, setTiposPagamentosOpcoes] = useState<any[]>([]);
  const [showModalTipoPagamento, setShowModalTipoPagamento] = useState(false);
  const [editingTipoPagamento, setEditingTipoPagamento] = useState<any>(null);
  const [novoTipoPagamento, setNovoTipoPagamento] = useState({
    descricao: ''
  });

  // Estado para o QR Code do cardápio
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  // Estado para verificação de disponibilidade da URL
  const [urlDisponivel, setUrlDisponivel] = useState<boolean | null>(null);
  const [verificandoUrl, setVerificandoUrl] = useState(false);

  // Estados para upload de logo
  const [logoUrl, setLogoUrl] = useState('');
  const [logoStoragePath, setLogoStoragePath] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Função para gerar QR Code
  const generateQRCode = async (url: string) => {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeDataUrl(qrCodeDataUrl);
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
    }
  };

  // Função para carregar cupons de desconto
  const loadCuponsDesconto = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      const { data: cuponsData, error } = await supabase
        .from('cupons_desconto')
        .select('*')
        .eq('empresa_id', usuarioData.empresa_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar cupons:', error);
        showMessage('error', 'Erro ao carregar cupons de desconto');
        return;
      }

      setCuponsDesconto(cuponsData || []);
    } catch (error) {
      console.error('Erro ao carregar cupons:', error);
      showMessage('error', 'Erro ao carregar cupons de desconto');
    }
  };

  // Função para salvar cupom de desconto
  const handleSalvarCupom = async () => {
    if (!cupomForm.codigo || !cupomForm.descricao || cupomForm.valor_desconto <= 0) {
      showMessage('error', 'Preencha todos os campos obrigatórios');
      return;
    }

    // Validação de percentual
    if (cupomForm.tipo_desconto === 'percentual' && cupomForm.valor_desconto > 100) {
      showMessage('error', 'Percentual de desconto não pode ser maior que 100%');
      return;
    }

    // Validação de datas
    if (cupomForm.data_inicio && cupomForm.data_fim && cupomForm.data_inicio > cupomForm.data_fim) {
      showMessage('error', 'Data de início não pode ser posterior à data de fim');
      return;
    }

    try {
      setIsLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) throw new Error('Empresa não encontrada');

      const cupomData = {
        empresa_id: usuarioData.empresa_id,
        codigo: cupomForm.codigo.trim().toUpperCase(),
        descricao: cupomForm.descricao.trim(),
        tipo_desconto: cupomForm.tipo_desconto,
        valor_desconto: cupomForm.valor_desconto,
        valor_minimo_pedido: cupomForm.valor_minimo_pedido,
        data_inicio: cupomForm.data_inicio || null,
        data_fim: cupomForm.data_fim || null,
        limite_uso: cupomForm.limite_uso,
        ativo: cupomForm.ativo
      };

      if (editingCupom) {
        // Atualizar cupom existente
        const { error } = await supabase
          .from('cupons_desconto')
          .update(cupomData)
          .eq('id', editingCupom.id);

        if (error) throw error;
        showMessage('success', 'Cupom atualizado com sucesso!');
      } else {
        // Criar novo cupom
        const { error } = await supabase
          .from('cupons_desconto')
          .insert([cupomData]);

        if (error) {
          if (error.code === '23505') { // Unique constraint violation
            showMessage('error', 'Já existe um cupom com este código. Escolha outro código.');
            return;
          }
          throw error;
        }
        showMessage('success', 'Cupom criado com sucesso!');
      }

      // Recarregar lista de cupons
      await loadCuponsDesconto();
      setShowCupomModal(false);
      setEditingCupom(null);

    } catch (error: any) {
      console.error('Erro ao salvar cupom:', error);
      showMessage('error', 'Erro ao salvar cupom: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para excluir cupom de desconto
  const handleExcluirCupom = async (cupomId: string) => {
    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('cupons_desconto')
        .delete()
        .eq('id', cupomId);

      if (error) throw error;

      showMessage('success', 'Cupom excluído com sucesso!');
      await loadCuponsDesconto();

    } catch (error: any) {
      console.error('Erro ao excluir cupom:', error);
      showMessage('error', 'Erro ao excluir cupom: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para verificar disponibilidade da URL
  const verificarDisponibilidadeUrl = async (url: string) => {
    if (!url.trim()) {
      setUrlDisponivel(null);
      return;
    }

    try {
      setVerificandoUrl(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obter empresa_id do usuário
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // Verificar se já existe outra empresa usando essa URL
      const { data: urlExistente, error: urlError } = await supabase
        .from('pdv_config')
        .select('empresa_id')
        .eq('cardapio_url_personalizada', url.trim())
        .neq('empresa_id', usuarioData.empresa_id);

      if (urlError && urlError.code !== 'PGRST116') {
        console.error('Erro ao verificar URL:', urlError);
        setUrlDisponivel(null);
        return;
      }

      setUrlDisponivel(!urlExistente || urlExistente.length === 0);
    } catch (error) {
      console.error('Erro ao verificar disponibilidade:', error);
      setUrlDisponivel(null);
    } finally {
      setVerificandoUrl(false);
    }
  };

  // Gerar QR Code quando a URL personalizada mudar
  useEffect(() => {
    if (cardapioUrlPersonalizada.trim()) {
      const url = `https://nexo.emasoftware.app/cardapio/${cardapioUrlPersonalizada}`;
      generateQRCode(url);
    }
  }, [cardapioUrlPersonalizada]);

  // Verificar disponibilidade da URL com debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (cardapioUrlPersonalizada.trim()) {
        verificarDisponibilidadeUrl(cardapioUrlPersonalizada);
      }
    }, 500); // Aguarda 500ms após parar de digitar

    return () => clearTimeout(timeoutId);
  }, [cardapioUrlPersonalizada]);
  const [horarioForm, setHorarioForm] = useState({
    id: '',
    dia_semana: '0',
    hora_abertura: '08:00',
    hora_fechamento: '18:00'
  });
  const [isEditingHorario, setIsEditingHorario] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    itemId: string;
    itemType: 'usuario' | 'perfil' | 'pagamento' | 'horario' | 'toggle_status';
    title: string;
    message: string;
  }>({
    isOpen: false,
    itemId: '',
    itemType: 'usuario',
    title: '',
    message: '',
  });
  const [empresaForm, setEmpresaForm] = useState({
    segmento: '',
    tipo_documento: 'CNPJ',
    documento: '',
    razao_social: '',
    nome_fantasia: '',
    nome_proprietario: '',
    whatsapp: '',
    telefones: [],
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    inscricao_estadual: '',
    regime_tributario: 4, // Padrão MEI
    codigo_municipio: '',
    email: ''
  });

  // Estados para múltiplos telefones da empresa
  const [novoTelefoneEmpresa, setNovoTelefoneEmpresa] = useState({
    numero: '',
    tipo: 'Celular',
    whatsapp: false
  });

  // Estados para deletar conta
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [devPassword, setDevPassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Estados para certificado digital
  const [certificadoFile, setCertificadoFile] = useState<File | null>(null);
  const [certificadoSenha, setCertificadoSenha] = useState('');
  const [certificadoValidade, setCertificadoValidade] = useState('');
  const [certificadoInfo, setCertificadoInfo] = useState<any>(null);
  const [isUploadingCertificado, setIsUploadingCertificado] = useState(false);
  const [showRemoveCertificadoModal, setShowRemoveCertificadoModal] = useState(false);
  const [ambienteNFe, setAmbienteNFe] = useState<'1' | '2'>('2'); // 1=Produção, 2=Homologação
  const [mostrarSenhaCertificado, setMostrarSenhaCertificado] = useState(false);

  // Estados para CSC NFCe
  const [cscHomologacao, setCscHomologacao] = useState('');
  const [cscIdHomologacao, setCscIdHomologacao] = useState('');
  const [cscProducao, setCscProducao] = useState('');
  const [cscIdProducao, setCscIdProducao] = useState('');
  const [isSavingCsc, setIsSavingCsc] = useState(false);

  // Estados para validação NFe
  const [nfeValidationModal, setNfeValidationModal] = useState<{
    isOpen: boolean;
    campo: string;
    valor: string;
    validationResult: ValidationResult;
  }>({
    isOpen: false,
    campo: '',
    valor: '',
    validationResult: { isValid: true, errors: [] }
  });

  // Estados para venda sem produto - validação NCM
  const [vendaSemProdutoNcmValidacao, setVendaSemProdutoNcmValidacao] = useState<{
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

  // Estados para dropdown CFOP
  const [vendaSemProdutoCfopDropdownOpen, setVendaSemProdutoCfopDropdownOpen] = useState(false);
  const [vendaSemProdutoCfopSearchTerm, setVendaSemProdutoCfopSearchTerm] = useState('');

  // Estados para controle de alterações nas configurações fiscais
  const [configFiscalAlterada, setConfigFiscalAlterada] = useState(false);
  const [salvandoConfigFiscal, setSalvandoConfigFiscal] = useState(false);

  // Estados para validação de campos obrigatórios ST
  const [errosValidacaoST, setErrosValidacaoST] = useState({
    cest: '',
    margem_st: ''
  });

  // Estado local para descrição padrão (não salva em tempo real)
  const [nomePadraoLocal, setNomePadraoLocal] = useState('Diversos');

  // Estado local para configurações fiscais (não salvas ainda)
  const [configFiscalLocal, setConfigFiscalLocal] = useState({
    venda_sem_produto_ncm: '22021000',
    venda_sem_produto_cfop: '5405',
    venda_sem_produto_origem: 0,
    venda_sem_produto_situacao_tributaria: 'st',
    venda_sem_produto_cest: '0300600',
    venda_sem_produto_margem_st: 30,
    venda_sem_produto_aliquota_icms: 18.0,
    venda_sem_produto_aliquota_pis: 1.65,
    venda_sem_produto_aliquota_cofins: 7.6,
    venda_sem_produto_peso_liquido: 0,
    venda_sem_produto_cst: '60',
    venda_sem_produto_csosn: '500'
  });

  useEffect(() => {
    const loadDataWithLoading = async () => {
      await loadData();
      // Carregar ranges de mesas e comandas
      await carregarRanges();
      // Desativa o loading após carregar os dados
      setSectionLoading(false);
      // Marca que não é mais o primeiro carregamento
      if (isFirstLoad) {
        setIsFirstLoad(false);
      }
    };

    loadDataWithLoading();
  }, [activeSection]);

  // Configurar realtime para atualizações do status da loja
  useEffect(() => {
    if (!empresa?.id) return;

    const channel = supabase
      .channel('pdv_config_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pdv_config',
          filter: `empresa_id=eq.${empresa.id}`
        },
        (payload) => {
          console.log('Atualização realtime recebida:', payload);

          // Atualizar apenas os campos relacionados ao cardápio
          if (payload.new && (
            payload.new.cardapio_loja_aberta !== undefined ||
            payload.new.cardapio_abertura_tipo !== undefined
          )) {
            setPdvConfig(prev => ({
              ...prev,
              cardapio_loja_aberta: payload.new.cardapio_loja_aberta !== undefined
                ? payload.new.cardapio_loja_aberta
                : prev.cardapio_loja_aberta,
              cardapio_abertura_tipo: payload.new.cardapio_abertura_tipo || prev.cardapio_abertura_tipo
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [empresa?.id]);

  // useEffect para sincronizar configurações fiscais locais com dados carregados
  useEffect(() => {
    if (pdvConfig) {
      setConfigFiscalLocal({
        venda_sem_produto_ncm: pdvConfig.venda_sem_produto_ncm || '22021000',
        venda_sem_produto_cfop: pdvConfig.venda_sem_produto_cfop || '5102',
        venda_sem_produto_origem: pdvConfig.venda_sem_produto_origem !== undefined ? pdvConfig.venda_sem_produto_origem : 0,
        venda_sem_produto_situacao_tributaria: pdvConfig.venda_sem_produto_situacao_tributaria || 'tributado_integral',
        venda_sem_produto_cest: pdvConfig.venda_sem_produto_cest || '',
        venda_sem_produto_margem_st: pdvConfig.venda_sem_produto_margem_st || null,
        venda_sem_produto_aliquota_icms: pdvConfig.venda_sem_produto_aliquota_icms !== undefined ? pdvConfig.venda_sem_produto_aliquota_icms : 18.0,
        venda_sem_produto_aliquota_pis: pdvConfig.venda_sem_produto_aliquota_pis !== undefined ? pdvConfig.venda_sem_produto_aliquota_pis : 1.65,
        venda_sem_produto_aliquota_cofins: pdvConfig.venda_sem_produto_aliquota_cofins !== undefined ? pdvConfig.venda_sem_produto_aliquota_cofins : 7.6,
        venda_sem_produto_peso_liquido: pdvConfig.venda_sem_produto_peso_liquido !== undefined ? pdvConfig.venda_sem_produto_peso_liquido : 0,
        venda_sem_produto_cst: pdvConfig.venda_sem_produto_cst || '',
        venda_sem_produto_csosn: pdvConfig.venda_sem_produto_csosn || ''
      });
      // Reset do estado de alteração quando dados são carregados
      setConfigFiscalAlterada(false);
      // Reset dos erros de validação
      setErrosValidacaoST({ cest: '', margem_st: '' });
    }
  }, [pdvConfig]);

  // useEffect para validar campos ST quando situação tributária mudar
  useEffect(() => {
    if (configFiscalLocal.venda_sem_produto_situacao_tributaria) {
      validarCamposST();
    }
  }, [configFiscalLocal.venda_sem_produto_situacao_tributaria, configFiscalLocal.venda_sem_produto_cest, configFiscalLocal.venda_sem_produto_margem_st]);

  // useEffect para sincronizar nome padrão local com dados carregados
  useEffect(() => {
    if (pdvConfig?.venda_sem_produto_nome_padrao) {
      setNomePadraoLocal(pdvConfig.venda_sem_produto_nome_padrao);
    }
  }, [pdvConfig?.venda_sem_produto_nome_padrao]);

  const loadData = async () => {
    await withSessionCheck(async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Obter dados do usuário logado, incluindo o tipo
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select(`
          id,
          empresa_id,
          tipo_user_config_id
        `)
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // Buscar tipos do usuário logado
      let tipoUsuarioLogado = 'user'; // Valor padrão
      if (usuarioData.tipo_user_config_id && Array.isArray(usuarioData.tipo_user_config_id) && usuarioData.tipo_user_config_id.length > 0) {
        // Buscar os tipos de usuário
        const { data: tiposData } = await supabase
          .from('tipo_user_config')
          .select('tipo')
          .in('id', usuarioData.tipo_user_config_id);

        // Se tem tipo admin, usar admin como principal
        if (tiposData?.some(t => t.tipo === 'admin')) {
          tipoUsuarioLogado = 'admin';
        } else if (tiposData?.length > 0) {
          tipoUsuarioLogado = tiposData[0].tipo;
        }
      }

      // Armazenar o tipo do usuário logado
      setUsuarioLogado({
        id: usuarioData.id,
        tipo: tipoUsuarioLogado
      });

      if (activeSection === 'usuarios') {
        // Carregar tipos de usuário
        const { data: tiposData, error: tiposError } = await supabase
          .from('tipo_user_config')
          .select('*')
          .eq('ativo', true)
          .order('tipo');

        if (tiposError) {
          console.error('Erro ao carregar tipos de usuário:', tiposError);
          showMessage('error', 'Erro ao carregar tipos de usuário');
        } else {
          setTiposUsuario(tiposData || []);
        }

        // Carregar grupos de produtos para comissão de vendedores
        const { data: gruposData, error: gruposError } = await supabase
          .from('grupos')
          .select('id, nome, comissao_percentual')
          .eq('empresa_id', usuarioData.empresa_id)
          .or('deletado.is.null,deletado.eq.false')
          .order('nome');

        if (gruposError) {
          console.error('Erro ao carregar grupos:', gruposError);
        } else {
          setGrupos(gruposData || []);
        }

        // Se o usuário for do tipo 'user', mostrar apenas o próprio usuário
        // Se for 'admin', mostrar todos os usuários da empresa
        let query = supabase
          .from('usuarios')
          .select(`
            *,
            perfil:perfis_acesso(nome)
          `)
          .eq('empresa_id', usuarioData.empresa_id)
          .order('nome'); // Ordenar por nome para melhor visualização

        // Filtrar apenas o próprio usuário se for do tipo 'user'
        if (tipoUsuarioLogado === 'user') {
          query = query.eq('id', usuarioData.id);
        }

        const { data: usuariosData, error: usuariosError } = await query;

        if (usuariosError) {
          console.error('Erro ao carregar usuários:', usuariosError);
          showMessage('error', 'Erro ao carregar lista de usuários');
          return;
        }

        console.log(`Carregados ${usuariosData?.length || 0} usuários. Usuário logado é ${tipoUsuarioLogado}`);
        setUsuarios(usuariosData || []);
      }

      if (activeSection === 'perfis') {
        const { data: perfisData } = await supabase
          .from('perfis_acesso')
          .select('*')
          .eq('empresa_id', usuarioData.empresa_id);
        setPerfis(perfisData || []);
      }

      if (activeSection === 'geral') {
        const { data: empresaData } = await supabase
          .from('empresas')
          .select('*')
          .eq('id', usuarioData.empresa_id)
          .single();
        setEmpresa(empresaData);
        if (empresaData) {
          // Garantir que telefones seja um array
          const telefones = Array.isArray(empresaData.telefones) ? empresaData.telefones : [];
          setEmpresaForm({
            ...empresaData,
            telefones: telefones
          });
        }
      }

      if (activeSection === 'pagamentos') {
        const { data: pagamentosData } = await supabase
          .from('formas_pagamento')
          .select('*')
          .eq('empresa_id', usuarioData.empresa_id);
        setFormasPagamento(pagamentosData || []);
      }

      if (activeSection === 'status') {
        const { data: statusData } = await supabase
          .from('pdv_config')
          .select('cardapio_loja_aberta, cardapio_abertura_tipo')
          .eq('empresa_id', usuarioData.empresa_id)
          .single();

        if (statusData) {
          setStoreStatus({
            aberto: statusData.cardapio_loja_aberta !== false,
            modo_operacao: statusData.cardapio_abertura_tipo || 'manual'
          });
        }
      }

      if (activeSection === 'taxa') {
        // Carregar configuração de taxa de entrega
        const { data: configData, error: configError } = await supabase
          .from('configuracoes')
          .select('taxa_modo')
          .eq('empresa_id', usuarioData.empresa_id)
          .single();

        console.log('Taxa config data:', configData);

        if (configData && configData.taxa_modo) {
          setTaxaMode(configData.taxa_modo);
        }
      }

      if (activeSection === 'horarios') {
        const { data: horariosData, error: horariosError } = await supabase
          .from('horario_atendimento')
          .select('*')
          .eq('empresa_id', usuarioData.empresa_id)
          .order('dia_semana');

        if (horariosError) {
          console.error('Erro ao carregar horários:', horariosError);
          showMessage('error', 'Erro ao carregar horários de atendimento');
        } else {
          setHorarios(horariosData || []);
        }
      }

      if (activeSection === 'estoque') {
        try {
          // Carregar configuração de controle de estoque
          const { data: estoqueConfigData, error: estoqueConfigError } = await supabase
            .from('tipo_controle_estoque_config')
            .select('*')
            .eq('empresa_id', usuarioData.empresa_id)
            .single();

          if (estoqueConfigError) {
            // Se não encontrou configuração, criar uma nova com valores padrão
            if (estoqueConfigError.code === 'PGRST116') {
              console.log('Configuração de estoque não encontrada, criando uma nova...');

              const { error: insertError, data: insertData } = await supabase
                .from('tipo_controle_estoque_config')
                .insert({
                  empresa_id: usuarioData.empresa_id,
                  tipo_controle: 'pedidos',
                  bloqueia_sem_estoque: false
                })
                .select();

              console.log('Nova configuração criada:', insertData);

              if (insertError) {
                throw insertError;
              }

              // Definir valores padrão nos estados
              setTipoControleEstoque('pedidos');
              setBloqueiaSemEstoque(false);
            } else {
              // Se for outro erro, mostrar mensagem
              console.error('Erro ao carregar configuração de estoque:', estoqueConfigError);
              showMessage('error', 'Erro ao carregar configuração de controle de estoque');
            }
          } else if (estoqueConfigData) {
            // Se encontrou configuração, atualizar os estados
            console.log('Configuração de estoque encontrada:', estoqueConfigData);

            // Definir tipo de controle (pedidos, faturamento ou pdv)
            if (estoqueConfigData.tipo_controle) {
              setTipoControleEstoque(estoqueConfigData.tipo_controle as 'faturamento' | 'pedidos' | 'pdv');
            } else {
              console.log('tipo_controle não definido, usando padrão "pedidos"');
              setTipoControleEstoque('pedidos');

              // Atualizar no banco de dados
              await supabase
                .from('tipo_controle_estoque_config')
                .update({ tipo_controle: 'pedidos' })
                .eq('id', estoqueConfigData.id);
            }

            // Garantir que bloqueia_sem_estoque seja um booleano
            // Se o campo não existir ou for null, definir como false
            const bloqueiaEstoque = estoqueConfigData.bloqueia_sem_estoque === true;
            console.log('Valor de bloqueia_sem_estoque:', bloqueiaEstoque);
            setBloqueiaSemEstoque(bloqueiaEstoque);
          }
        } catch (error) {
          console.error('Erro ao processar configuração de estoque:', error);
          showMessage('error', 'Erro ao processar configuração de controle de estoque');
        }
      }

      if (activeSection === 'taxaentrega') {
        try {
          // Carregar configuração de taxa de entrega
          const { data: taxaEntregaConfigData, error: taxaEntregaConfigError } = await supabase
            .from('taxa_entrega_config')
            .select('*')
            .eq('empresa_id', usuarioData.empresa_id)
            .single();

          if (taxaEntregaConfigError) {
            // Se não encontrou configuração, criar uma nova com valores padrão
            if (taxaEntregaConfigError.code === 'PGRST116') {
              console.log('Configuração de taxa de entrega não encontrada, criando uma nova...');

              const { error: insertError, data: insertData } = await supabase
                .from('taxa_entrega_config')
                .insert({
                  empresa_id: usuarioData.empresa_id,
                  habilitado: false,
                  tipo: 'distancia'
                })
                .select();

              console.log('Nova configuração de taxa de entrega criada:', insertData);

              if (insertError) {
                throw insertError;
              }

              // Definir valores padrão nos estados
              setTaxaEntregaHabilitada(false);
              setTipoTaxaEntrega('distancia');
            } else {
              // Se for outro erro, mostrar mensagem
              console.error('Erro ao carregar configuração de taxa de entrega:', taxaEntregaConfigError);
              showMessage('error', 'Erro ao carregar configuração de taxa de entrega');
            }
          } else if (taxaEntregaConfigData) {
            // Se encontrou configuração, atualizar os estados
            console.log('Configuração de taxa de entrega encontrada:', taxaEntregaConfigData);
            setTaxaEntregaHabilitada(taxaEntregaConfigData.habilitado || false);
            setTipoTaxaEntrega(taxaEntregaConfigData.tipo || 'distancia');
          }
        } catch (error) {
          console.error('Erro ao processar configuração de taxa de entrega:', error);
          showMessage('error', 'Erro ao processar configuração de taxa de entrega');
        }
      }

      if (activeSection === 'tabelaprecos') {
        try {
          // Carregar configuração de tabela de preços
          const { data: tabelaPrecoConfigData, error: tabelaPrecoConfigError } = await supabase
            .from('tabela_preco_config')
            .select('*')
            .eq('empresa_id', usuarioData.empresa_id)
            .single();

          if (tabelaPrecoConfigError) {
            // Se não encontrou configuração, algo está errado (deveria existir devido ao trigger)
            console.error('Erro ao carregar configuração de tabela de preços:', tabelaPrecoConfigError);
            showMessage('error', 'Erro ao carregar configuração de tabela de preços');

            // Definir valores padrão nos estados como fallback
            setTrabalhaComTabelaPrecos(false);
            setTrabalhaComSabores(false);
          } else if (tabelaPrecoConfigData) {
            // Se encontrou configuração, atualizar os estados
            console.log('Configuração de tabela de preços encontrada:', tabelaPrecoConfigData);
            setTrabalhaComTabelaPrecos(tabelaPrecoConfigData.trabalha_com_tabela_precos || false);
            setTrabalhaComSabores(tabelaPrecoConfigData.trabalha_com_sabores || false);
            setTipoPrecoPizza(tabelaPrecoConfigData.tipo_preco_pizza || 'sabor_mais_caro');
          }

          // Carregar tabelas de preços existentes
          const { data: tabelasData, error: tabelasError } = await supabase
            .from('tabela_de_preco')
            .select('*')
            .eq('empresa_id', usuarioData.empresa_id)
            .eq('deletado', false)
            .order('created_at', { ascending: true });

          if (tabelasError) {
            console.error('Erro ao carregar tabelas de preços:', tabelasError);
            showMessage('error', 'Erro ao carregar tabelas de preços');
          } else {

            setTabelasPrecos(tabelasData || []);
          }

        } catch (error) {
          console.error('Erro ao processar configuração de tabela de preços:', error);
          showMessage('error', 'Erro ao processar configuração de tabela de preços');
        }
      }

      if (activeSection === 'pedidos') {
        try {
          // Carregar configuração de pedidos
          const { data: pedidosConfigData, error: pedidosConfigError } = await supabase
            .from('pedidos_config')
            .select('*')
            .eq('empresa_id', usuarioData.empresa_id)
            .single();

          if (pedidosConfigError) {
            // Se não encontrou configuração, criar uma nova com valores padrão
            if (pedidosConfigError.code === 'PGRST116') {
              console.log('Configuração de pedidos não encontrada, criando uma nova...');

              const { error: insertError, data: insertData } = await supabase
                .from('pedidos_config')
                .insert({
                  empresa_id: usuarioData.empresa_id,
                  agrupar_itens: false
                })
                .select();

              console.log('Nova configuração de pedidos criada:', insertData);

              if (insertError) {
                throw insertError;
              }

              // Definir valores padrão nos estados
              setAgruparItens(false);
            } else {
              // Se for outro erro, mostrar mensagem
              console.error('Erro ao carregar configuração de pedidos:', pedidosConfigError);
              showMessage('error', 'Erro ao carregar configuração de pedidos');
            }
          } else if (pedidosConfigData) {
            // Se encontrou configuração, atualizar os estados
            // Garantir que agrupar_itens seja um booleano
            // Se o campo não existir ou for null, definir como false
            const agruparItensValue = pedidosConfigData.agrupar_itens === true;
            setAgruparItens(agruparItensValue);
          }
        } catch (error) {
          console.error('Erro ao processar configuração de pedidos:', error);
          showMessage('error', 'Erro ao processar configuração de pedidos');
        }
      }

      if (activeSection === 'produtos') {
        try {
          // Carregar configuração de produtos
          const { data: produtosConfigData, error: produtosConfigError } = await supabase
            .from('produtos_config')
            .select('*')
            .eq('empresa_id', usuarioData.empresa_id)
            .single();

          if (produtosConfigError) {
            // Se não encontrou configuração, criar uma nova com valores padrão
            if (produtosConfigError.code === 'PGRST116') {
              console.log('Configuração de produtos não encontrada, criando uma nova...');

              const { error: insertError, data: insertData } = await supabase
                .from('produtos_config')
                .insert({
                  empresa_id: usuarioData.empresa_id,
                  opcoes_adicionais: false
                })
                .select();

              console.log('Nova configuração de produtos criada:', insertData);

              if (insertError) {
                throw insertError;
              }

              // Definir valores padrão nos estados
              setOpcoesAdicionais(false);
            } else {
              // Se for outro erro, mostrar mensagem
              console.error('Erro ao carregar configuração de produtos:', produtosConfigError);
              showMessage('error', 'Erro ao carregar configuração de produtos');
            }
          } else if (produtosConfigData) {
            // Se encontrou configuração, atualizar os estados
            console.log('Configuração de produtos encontrada:', produtosConfigData);

            // Garantir que opcoes_adicionais seja um booleano
            // Se o campo não existir ou for null, definir como false
            const opcoesAdicionaisValue = produtosConfigData.opcoes_adicionais === true;
            console.log('Valor de opcoes_adicionais:', opcoesAdicionaisValue);
            setOpcoesAdicionais(opcoesAdicionaisValue);
          }
        } catch (error) {
          console.error('Erro ao processar configuração de produtos:', error);
          showMessage('error', 'Erro ao processar configuração de produtos');
        }
      }

      if (activeSection === 'conexao') {
        try {
          // Carregar configuração de conexão
          const { data: conexaoConfigData, error: conexaoConfigError } = await supabase
            .from('conexao_config')
            .select('*')
            .eq('empresa_id', usuarioData.empresa_id)
            .single();

          if (conexaoConfigError) {
            // Se não encontrou configuração, criar uma nova com valores padrão
            if (conexaoConfigError.code === 'PGRST116') {
              console.log('Configuração de conexão não encontrada, criando uma nova...');

              const { error: insertError, data: insertData } = await supabase
                .from('conexao_config')
                .insert({
                  empresa_id: usuarioData.empresa_id,
                  habilita_conexao_whatsapp: false
                })
                .select();

              console.log('Nova configuração de conexão criada:', insertData);

              if (insertError) {
                throw insertError;
              }

              // Definir valores padrão nos estados
              setConexaoConfig({
                habilita_conexao_whatsapp: false
              });
            } else {
              // Se for outro erro, mostrar mensagem
              console.error('Erro ao carregar configuração de conexão:', conexaoConfigError);
              showMessage('error', 'Erro ao carregar configuração de conexão');
            }
          } else if (conexaoConfigData) {
            // Se encontrou configuração, atualizar os estados
            console.log('Configuração de conexão encontrada:', conexaoConfigData);
            setConexaoConfig({
              habilita_conexao_whatsapp: conexaoConfigData.habilita_conexao_whatsapp || false
            });
          }
        } catch (error) {
          console.error('Erro ao processar configuração de conexão:', error);
          showMessage('error', 'Erro ao processar configuração de conexão');
        }
      }

      if (activeSection === 'pdv') {
        carregarConfiguracoesPdv();
        await loadFormasPagamentoOpcoes();
        await loadFormasPagamentoEmpresa();
        await loadTiposPagamentosOpcoes();
        await loadCuponsDesconto();
      }

      if (activeSection === 'certificado') {
        // Carregar dados do certificado digital do backend local
        try {
          const certificadoStatus = await checkCertificateStatus(usuarioData.empresa_id);

          if (certificadoStatus.success && certificadoStatus.data) {
            // Converter dados do backend para o formato esperado pela interface
            setCertificadoInfo({
              certificado_digital_path: certificadoStatus.data.path || 'local_storage',
              certificado_digital_senha: '', // Não retornar senha por segurança
              certificado_digital_validade: certificadoStatus.data.validade,
              certificado_digital_status: certificadoStatus.data.status || 'ativo',
              certificado_digital_nome: certificadoStatus.data.nome_certificado,
              certificado_digital_uploaded_at: certificadoStatus.data.uploaded_at
            });
          } else {
            // Certificado não encontrado - limpar dados
            setCertificadoInfo(null);
          }
        } catch (error) {
          console.error('Erro ao carregar status do certificado:', error);
          setCertificadoInfo(null);
        }

        // Carregar configuração NFe da nova tabela
        const { data: nfeConfigData } = await supabase
          .from('nfe_config')
          .select('ambiente')
          .eq('empresa_id', usuarioData.empresa_id)
          .single();

        if (nfeConfigData) {
          // Converter de 'homologacao'/'producao' para '2'/'1'
          setAmbienteNFe(nfeConfigData.ambiente === 'producao' ? '1' : '2');
        } else {
          // Se não encontrou configuração, criar uma nova com padrão homologação
          const { error: insertError } = await supabase
            .from('nfe_config')
            .insert({
              empresa_id: usuarioData.empresa_id,
              ambiente: 'homologacao'
            });

          if (!insertError) {
            setAmbienteNFe('2'); // Homologação
          }
        }

        // Carregar configuração CSC NFCe da tabela empresas
        const { data: empresaData } = await supabase
          .from('empresas')
          .select('csc_homologacao, csc_id_homologacao, csc_producao, csc_id_producao')
          .eq('id', usuarioData.empresa_id)
          .single();

        if (empresaData) {
          setCscHomologacao(empresaData.csc_homologacao || '');
          setCscIdHomologacao(empresaData.csc_id_homologacao?.toString() || '');
          setCscProducao(empresaData.csc_producao || '');
          setCscIdProducao(empresaData.csc_id_producao?.toString() || '');
        } else {
          // Limpar estados se não houver dados
          setCscHomologacao('');
          setCscIdHomologacao('');
          setCscProducao('');
          setCscIdProducao('');
        }
      }
    });
  };

  // Função para trocar de seção com loading inteligente
  const handleSectionChange = async (section: string) => {
    // Se já está na mesma seção, não faz nada
    if (activeSection === section) return;

    // Ativa o loading apenas se não for o primeiro carregamento
    if (!isFirstLoad) {
      setSectionLoading(true);
    }

    setActiveSection(section as any);

    // O loading será desativado automaticamente pelo useEffect quando loadData terminar
  };

  const handleSubmitPagamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTipo) return;

    setIsLoading(true);
    await withSessionCheck(async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) throw new Error('Empresa não encontrada');

      const { error } = await supabase
        .from('formas_pagamento')
        .insert([{
          tipo: selectedTipo,
          empresa_id: usuarioData.empresa_id
        }]);

      if (error) throw error;

      setSelectedTipo('');
      setShowSidebar(false);
      loadData();
      showMessage('success', 'Forma de pagamento adicionada com sucesso!');
    });
    setIsLoading(false);
  };

  const handleSubmitEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();

    // 🛡️ VALIDAÇÃO NFe - PREVENÇÃO NA ORIGEM
    // Validar razão social da empresa (CRÍTICO - aparece como emitente na NFe)
    if (empresaForm.razao_social && empresaForm.razao_social.trim() !== '') {
      const razaoValidation = validarRazaoSocialEmpresa(empresaForm.razao_social);
      if (!razaoValidation.isValid) {
        setNfeValidationModal({
          isOpen: true,
          campo: 'Razão Social da Empresa',
          valor: empresaForm.razao_social,
          validationResult: razaoValidation
        });
        return;
      }
    }

    // Validar nome fantasia da empresa (aparece na NFe se preenchido)
    if (empresaForm.nome_fantasia && empresaForm.nome_fantasia.trim() !== '') {
      const fantasiaValidation = validarNomeFantasiaEmpresa(empresaForm.nome_fantasia);
      if (!fantasiaValidation.isValid) {
        setNfeValidationModal({
          isOpen: true,
          campo: 'Nome Fantasia da Empresa',
          valor: empresaForm.nome_fantasia,
          validationResult: fantasiaValidation
        });
        return;
      }
    }

    // Validar nome do proprietário (se preenchido)
    if (empresaForm.nome_proprietario && empresaForm.nome_proprietario.trim() !== '') {
      const proprietarioValidation = validarNomeProprietario(empresaForm.nome_proprietario);
      if (!proprietarioValidation.isValid) {
        setNfeValidationModal({
          isOpen: true,
          campo: 'Nome do Proprietário',
          valor: empresaForm.nome_proprietario,
          validationResult: proprietarioValidation
        });
        return;
      }
    }

    // Validar campos de endereço da empresa (CRÍTICO - aparece na NFe)
    if (empresaForm.endereco && empresaForm.endereco.trim() !== '') {
      const enderecoValidation = validarEndereco(empresaForm.endereco, 'Endereço da Empresa');
      if (!enderecoValidation.isValid) {
        setNfeValidationModal({
          isOpen: true,
          campo: 'Endereço da Empresa',
          valor: empresaForm.endereco,
          validationResult: enderecoValidation
        });
        return;
      }
    }

    if (empresaForm.bairro && empresaForm.bairro.trim() !== '') {
      const bairroValidation = validarBairro(empresaForm.bairro);
      if (!bairroValidation.isValid) {
        setNfeValidationModal({
          isOpen: true,
          campo: 'Bairro da Empresa',
          valor: empresaForm.bairro,
          validationResult: bairroValidation
        });
        return;
      }
    }

    if (empresaForm.cidade && empresaForm.cidade.trim() !== '') {
      const cidadeValidation = validarCidade(empresaForm.cidade);
      if (!cidadeValidation.isValid) {
        setNfeValidationModal({
          isOpen: true,
          campo: 'Cidade da Empresa',
          valor: empresaForm.cidade,
          validationResult: cidadeValidation
        });
        return;
      }
    }

    if (empresaForm.complemento && empresaForm.complemento.trim() !== '') {
      const complementoValidation = validarComplemento(empresaForm.complemento);
      if (!complementoValidation.isValid) {
        setNfeValidationModal({
          isOpen: true,
          campo: 'Complemento da Empresa',
          valor: empresaForm.complemento,
          validationResult: complementoValidation
        });
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

      const { error } = await supabase
        .from('empresas')
        .update(empresaForm)
        .eq('id', usuarioData.empresa_id);

      if (error) throw error;

      showMessage('success', 'Dados da empresa atualizados com sucesso!');
      setShowSidebar(false);
      loadData();
    } catch (error: any) {
      showMessage('error', 'Erro ao atualizar dados: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Funções para gerenciar telefones da empresa
  const adicionarTelefoneEmpresa = () => {
    if (!novoTelefoneEmpresa.numero) {
      showMessage('error', 'Digite um número de telefone');
      return;
    }

    // Validar o número de telefone
    const numeroLimpo = novoTelefoneEmpresa.numero.replace(/\D/g, '');
    if ((novoTelefoneEmpresa.tipo === 'Fixo' && numeroLimpo.length !== 10) ||
        (novoTelefoneEmpresa.tipo === 'Celular' && numeroLimpo.length !== 11)) {
      showMessage('error', `Número de ${novoTelefoneEmpresa.tipo.toLowerCase()} inválido`);
      return;
    }

    // Adicionar à lista de telefones
    setEmpresaForm(prev => ({
      ...prev,
      telefones: [...prev.telefones, { ...novoTelefoneEmpresa }]
    }));

    // Limpar o campo para adicionar outro telefone
    setNovoTelefoneEmpresa({
      numero: '',
      tipo: 'Celular',
      whatsapp: false
    });
  };

  const removerTelefoneEmpresa = (index: number) => {
    setEmpresaForm(prev => ({
      ...prev,
      telefones: prev.telefones.filter((_, i) => i !== index)
    }));
  };

  const handleNovoTelefoneEmpresaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    let numeroFormatado = value;

    // Aplicar máscara baseada no tipo
    if (novoTelefoneEmpresa.tipo === 'Celular') {
      numeroFormatado = value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
    } else {
      numeroFormatado = value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
    }

    setNovoTelefoneEmpresa(prev => ({ ...prev, numero: numeroFormatado }));
  };

  // Função para deletar a empresa inteira
  const handleDeleteAccount = async () => {
    // Verificar senha de desenvolvedor
    const correctPassword = import.meta.env.VITE_DEV_PASSWORD;
    if (!correctPassword) {
      showMessage('error', 'Senha de desenvolvedor não configurada');
      return;
    }

    if (devPassword !== correctPassword) {
      showMessage('error', 'Senha de desenvolvedor incorreta');
      return;
    }

    setIsDeletingAccount(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) throw new Error('Empresa não encontrada');

      const empresaId = usuarioData.empresa_id;

      // 1. PRIMEIRO: Remover certificado digital se existir
      try {
        console.log('🗑️ Removendo certificado digital da empresa...');
        const success = await removeCertificateLocal(empresaId);
        if (success) {
          console.log('✅ Certificado removido com sucesso');
        } else {
          console.log('⚠️ Certificado não encontrado ou já removido');
        }
      } catch (certError: any) {
        console.warn('⚠️ Erro ao remover certificado (continuando com deleção):', certError);
        // Se o erro for "certificado não encontrado", não é um problema
        if (!certError.message?.includes('não encontrado')) {
          console.error('❌ Erro inesperado ao remover certificado:', certError);
        }
        // Não interromper o processo se falhar ao remover certificado
      }

      // 2. SEGUNDO: Executar o script de exclusão completa da empresa
      console.log('🗑️ Deletando empresa completa...');
      const { error } = await supabase.rpc('deletar_empresa_simples', {
        empresa_uuid: empresaId
      });

      if (error) {
        console.error('Erro ao deletar empresa:', error);
        throw new Error('Erro ao deletar empresa: ' + error.message);
      }

      showMessage('success', 'Empresa e certificado deletados com sucesso!');

      // Fazer logout e redirecionar
      await supabase.auth.signOut();
      window.location.href = '/entrar';

    } catch (error: any) {
      console.error('Erro ao deletar empresa:', error);
      showMessage('error', error.message || 'Erro ao deletar empresa');
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteAccountModal(false);
      setDevPassword('');
    }
  };

  const handleDelete = async (id: string, type: 'usuario' | 'perfil' | 'pagamento' | 'horario', nome: string) => {
    let title, message;

    if (type === 'usuario') {
      title = 'Excluir Usuário';
      message = `Tem certeza que deseja excluir o usuário "${nome}"? Esta ação não pode ser desfeita.`;
    } else if (type === 'perfil') {
      title = 'Excluir Perfil';
      message = `Tem certeza que deseja excluir o perfil "${nome}"? Esta ação não pode ser desfeita.`;
    } else if (type === 'pagamento') {
      title = 'Excluir Forma de Pagamento';
      message = `Tem certeza que deseja excluir a forma de pagamento "${nome}"? Esta ação não pode ser desfeita.`;
    } else if (type === 'horario') {
      title = 'Excluir Horário de Atendimento';
      message = `Tem certeza que deseja excluir o horário de atendimento para ${nome}? Esta ação não pode ser desfeita.`;
    }

    setDeleteConfirmation({
      isOpen: true,
      itemId: id,
      itemType: type,
      title,
      message,
    });
  };

  const handleConfirmDelete = async () => {
    try {
      const { itemId, itemType } = deleteConfirmation;
      let table;

      if (itemType === 'usuario') {
        table = 'usuarios';
      } else if (itemType === 'perfil') {
        table = 'perfis_acesso';
      } else if (itemType === 'pagamento') {
        table = 'formas_pagamento';
      } else if (itemType === 'horario') {
        table = 'horario_atendimento';
      }

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      await loadData();

      let successMessage;
      if (itemType === 'usuario') {
        successMessage = 'Usuário excluído com sucesso!';
      } else if (itemType === 'perfil') {
        successMessage = 'Perfil excluído com sucesso!';
      } else if (itemType === 'pagamento') {
        successMessage = 'Forma de pagamento excluída com sucesso!';
      } else if (itemType === 'horario') {
        successMessage = 'Horário de atendimento excluído com sucesso!';
      }

      showMessage('success', successMessage);
    } catch (error: any) {
      showMessage('error', 'Erro ao excluir item: ' + error.message);
    } finally {
      setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
    }
  };

  // Função para alternar o status do usuário (bloquear/desbloquear)
  const handleToggleUserStatus = async (userId: string, userName: string, currentStatus: boolean) => {
    // Definir a mensagem de confirmação com base no status atual
    const action = currentStatus ? 'bloquear' : 'desbloquear';
    const title = `${action.charAt(0).toUpperCase() + action.slice(1)} Usuário`;
    const message = `Tem certeza que deseja ${action} o usuário "${userName}"?`;

    // Mostrar diálogo de confirmação
    setDeleteConfirmation({
      isOpen: true,
      itemId: userId,
      itemType: 'toggle_status',
      title,
      message,
    });
  };

  // Função para confirmar a alteração de status do usuário
  const handleConfirmToggleStatus = async () => {
    try {
      const userId = deleteConfirmation.itemId;

      // Obter o status atual do usuário
      const { data: userData, error: fetchError } = await supabase
        .from('usuarios')
        .select('status')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      // Alternar o status (true -> false ou false -> true)
      const newStatus = !(userData?.status);

      // Atualizar o status no banco de dados
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ status: newStatus })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Recarregar os dados
      await loadData();

      // Mostrar mensagem de sucesso
      const actionDone = newStatus ? 'desbloqueado' : 'bloqueado';
      showMessage('success', `Usuário ${actionDone} com sucesso!`);
    } catch (error: any) {
      showMessage('error', `Erro ao alterar status do usuário: ${error.message}`);
    } finally {
      setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleEditHorario = (horario: any) => {
    setHorarioForm({
      id: horario.id,
      dia_semana: horario.dia_semana.toString(),
      hora_abertura: horario.hora_abertura.substring(0, 5),
      hora_fechamento: horario.hora_fechamento.substring(0, 5)
    });
    setIsEditingHorario(true);
    setShowSidebar(true);
  };

  // Função para carregar os dados do usuário para edição
  const handleEditUsuario = async (usuario: any) => {
    // Limpar erros anteriores
    setFormErrors({
      senha: '',
      email: '',
      serie_nfce: ''
    });

    // Carregar configurações de comissão se for vendedor
    const tiposUsuarioIds = Array.isArray(usuario.tipo_user_config_id)
      ? usuario.tipo_user_config_id
      : [usuario.tipo_user_config_id];

    const temTipoVendedor = tiposUsuarioIds.some(tipoId => {
      const tipo = tiposUsuario.find(t => t.id === tipoId);
      return tipo?.tipo === 'vendedor';
    });

    let comissaoData = {
      tipo_comissao: 'total_venda',
      percentual_comissao: 0,
      grupos_comissao: []
    };

    if (temTipoVendedor) {
      comissaoData = await carregarComissaoVendedor(usuario.id);
    }

    // Carregar os dados do usuário no formulário
    setUsuarioForm({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      senha: '', // Campos de senha vazios na edição
      confirmarSenha: '',
      tipo_user_config_id: Array.isArray(usuario.tipo_user_config_id)
        ? usuario.tipo_user_config_id
        : usuario.tipo_user_config_id ? [usuario.tipo_user_config_id] : [],
      serie_nfce: usuario.serie_nfce || 1, // ✅ NOVO: Carregar série da NFC-e
      // Campos de comissão para vendedores
      tipo_comissao: comissaoData.tipo_comissao,
      percentual_comissao: comissaoData.percentual_comissao,
      grupos_comissao: comissaoData.grupos_comissao
    });

    // Ativar o modo de edição
    setIsEditingUsuario(true);

    // Abrir o sidebar
    setActiveSection('usuarios');
    setShowSidebar(true);
  };

  const handleSubmitHorario = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar se o horário de fechamento é maior que o horário de abertura
    const abertura = new Date(`2000-01-01T${horarioForm.hora_abertura}`);
    const fechamento = new Date(`2000-01-01T${horarioForm.hora_fechamento}`);

    if (fechamento <= abertura) {
      showMessage('error', 'O horário de fechamento deve ser maior que o horário de abertura.');
      return;
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

      // Se estiver editando um horário existente
      if (isEditingHorario) {
        const { error } = await supabase
          .from('horario_atendimento')
          .update({
            hora_abertura: horarioForm.hora_abertura,
            hora_fechamento: horarioForm.hora_fechamento
          })
          .eq('id', horarioForm.id);

        if (error) throw error;

        setIsEditingHorario(false);
        setShowSidebar(false);
        loadData();
        showMessage('success', 'Horário de atendimento atualizado com sucesso!');
      }
      // Se estiver adicionando um novo horário
      else {
        // Verificar se já existe um horário para este dia da semana
        const { data: existingHorario } = await supabase
          .from('horario_atendimento')
          .select('id')
          .eq('empresa_id', usuarioData.empresa_id)
          .eq('dia_semana', parseInt(horarioForm.dia_semana))
          .maybeSingle();

        if (existingHorario) {
          showMessage('error', 'Já existe um horário cadastrado para este dia da semana. Edite-o ou remova-o primeiro para adicionar um novo.');
          setIsLoading(false);
          return;
        }

        const { error } = await supabase
          .from('horario_atendimento')
          .insert([{
            empresa_id: usuarioData.empresa_id,
            dia_semana: parseInt(horarioForm.dia_semana),
            hora_abertura: horarioForm.hora_abertura,
            hora_fechamento: horarioForm.hora_fechamento
          }]);

        if (error) throw error;

        // Resetar o formulário para o próximo dia da semana
        const nextDay = (parseInt(horarioForm.dia_semana) + 1) % 7;
        setHorarioForm({
          id: '',
          dia_semana: nextDay.toString(),
          hora_abertura: '08:00',
          hora_fechamento: '18:00'
        });

        setShowSidebar(false);
        loadData();
        showMessage('success', 'Horário de atendimento adicionado com sucesso!');
      }
    } catch (error: any) {
      showMessage('error', `Erro ao ${isEditingHorario ? 'atualizar' : 'adicionar'} horário de atendimento: ` + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOperationModeChange = async (mode: 'manual' | 'automatico') => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      const { error } = await supabase
        .from('pdv_config')
        .update({ cardapio_abertura_tipo: mode })
        .eq('empresa_id', usuarioData.empresa_id);

      if (error) throw error;

      setStoreStatus(prev => ({ ...prev, modo_operacao: mode }));
      showMessage('success', 'Modo de operação atualizado com sucesso!');
    } catch (error: any) {
      showMessage('error', 'Erro ao atualizar modo de operação');
    }
  };

  const handleTaxaModeChange = async (mode: 'bairro' | 'distancia') => {
    try {
      // Obter usuário autenticado e empresa_id
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        showMessage('error', 'Usuário não autenticado');
        return;
      }

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) {
        showMessage('error', 'Empresa não encontrada');
        return;
      }

      // Verificar se existem taxas cadastradas no sistema atual
      const { data: taxasData, error: taxasError } = await supabase
        .from('taxa_entrega')
        .select('id')
        .eq('empresa_id', usuarioData.empresa_id);

      if (taxasError) throw taxasError;

      // Se existirem taxas, não permitir a alteração do modo
      if (taxasData && taxasData.length > 0) {
        showMessage('error',
          `Não é possível alterar o modo de taxa de entrega porque existem ${taxasData.length} taxa(s) cadastrada(s). ` +
          `Remova todas as taxas de entrega existentes antes de alterar o modo.`);

        // Não atualiza o estado local, já que a alteração não será permitida
        return;
      }

      // Atualiza o estado local somente após confirmar que não há taxas cadastradas
      setTaxaMode(mode);

      // Verificar se já existe configuração para esta empresa
      const { data: configData } = await supabase
        .from('configuracoes')
        .select('id, taxa_modo')
        .eq('empresa_id', usuarioData.empresa_id)
        .single();

      let error;

      // Atualizar ou inserir configuração
      if (configData) {
        // Se o modo atual for igual ao solicitado, não faz nada
        if (configData.taxa_modo === mode) {
          console.log(`Modo de taxa já está configurado como ${mode}`);
          return;
        }

        // Atualizar configuração existente
        ({ error } = await supabase
          .from('configuracoes')
          .update({ taxa_modo: mode })
          .eq('id', configData.id));
      } else {
        // Inserir nova configuração
        ({ error } = await supabase
          .from('configuracoes')
          .insert([{
            empresa_id: usuarioData.empresa_id,
            taxa_modo: mode
          }]));
      }

      if (error) throw error;

      console.log(`Modo de taxa de entrega atualizado para: ${mode}`);
      showMessage('success', 'Modo de taxa de entrega atualizado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao atualizar modo de taxa:', error);
      showMessage('error', `Erro ao atualizar modo de taxa de entrega: ${error.message}`);
    }
  };

  const handleTipoControleEstoqueChange = async (tipo: 'faturamento' | 'pedidos' | 'pdv') => {
    console.log('Alterando tipo de controle de estoque para:', tipo);
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

      console.log('Empresa ID:', usuarioData.empresa_id);

      // Verificar se já existe uma configuração
      const { data: existingConfig } = await supabase
        .from('tipo_controle_estoque_config')
        .select('id')
        .eq('empresa_id', usuarioData.empresa_id)
        .single();

      let error;

      if (existingConfig) {
        // Atualizar configuração existente
        const { error: updateError } = await supabase
          .from('tipo_controle_estoque_config')
          .update({
            tipo_controle: tipo,
            // Manter o valor atual de bloqueia_sem_estoque
            bloqueia_sem_estoque: bloqueiaSemEstoque
          })
          .eq('id', existingConfig.id);

        error = updateError;
      } else {
        // Criar nova configuração
        const { error: insertError } = await supabase
          .from('tipo_controle_estoque_config')
          .insert({
            empresa_id: usuarioData.empresa_id,
            tipo_controle: tipo,
            bloqueia_sem_estoque: bloqueiaSemEstoque
          });

        error = insertError;
      }

      if (error) throw error;

      setTipoControleEstoque(tipo);
      showMessage('success', 'Configuração de controle de estoque atualizada com sucesso!');
    } catch (error: any) {
      showMessage('error', 'Erro ao atualizar configuração de estoque: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBloqueiaSemEstoqueChange = async (bloqueia: boolean) => {
    console.log('Alterando configuração de bloqueio de estoque para:', bloqueia);
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

      console.log('Empresa ID:', usuarioData.empresa_id);

      // Verificar se já existe uma configuração
      const { data: existingConfig } = await supabase
        .from('tipo_controle_estoque_config')
        .select('id')
        .eq('empresa_id', usuarioData.empresa_id)
        .single();

      let error;

      if (existingConfig) {
        console.log('Atualizando configuração existente:', existingConfig.id);
        // Atualizar configuração existente
        const { error: updateError, data: updateData } = await supabase
          .from('tipo_controle_estoque_config')
          .update({
            bloqueia_sem_estoque: bloqueia,
            // Manter o valor atual de tipo_controle
            tipo_controle: tipoControleEstoque
          })
          .eq('id', existingConfig.id)
          .select();

        console.log('Resultado da atualização:', updateData);
        error = updateError;
      } else {
        console.log('Criando nova configuração para empresa:', usuarioData.empresa_id);
        // Criar nova configuração
        const { error: insertError, data: insertData } = await supabase
          .from('tipo_controle_estoque_config')
          .insert({
            empresa_id: usuarioData.empresa_id,
            tipo_controle: tipoControleEstoque,
            bloqueia_sem_estoque: bloqueia
          })
          .select();

        console.log('Resultado da inserção:', insertData);
        error = insertError;
      }

      if (error) {
        console.error('Erro ao salvar configuração:', error);
        throw error;
      }

      setBloqueiaSemEstoque(bloqueia);
      showMessage('success', 'Configuração de bloqueio de estoque atualizada com sucesso!');
    } catch (error: any) {
      console.error('Exceção ao atualizar configuração de bloqueio de estoque:', error);
      showMessage('error', 'Erro ao atualizar configuração de bloqueio de estoque: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAgruparItensChange = async (agrupar: boolean) => {
    console.log('Alterando configuração de agrupar itens para:', agrupar);
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

      console.log('Empresa ID:', usuarioData.empresa_id);

      // Verificar se já existe uma configuração
      const { data: existingConfig } = await supabase
        .from('pedidos_config')
        .select('id')
        .eq('empresa_id', usuarioData.empresa_id)
        .single();

      let error;

      if (existingConfig) {
        console.log('Atualizando configuração existente:', existingConfig.id);
        // Atualizar configuração existente
        const { error: updateError, data: updateData } = await supabase
          .from('pedidos_config')
          .update({
            agrupar_itens: agrupar
          })
          .eq('id', existingConfig.id)
          .select();

        console.log('Resultado da atualização:', updateData);
        error = updateError;
      } else {
        console.log('Criando nova configuração para empresa:', usuarioData.empresa_id);
        // Criar nova configuração
        const { error: insertError, data: insertData } = await supabase
          .from('pedidos_config')
          .insert({
            empresa_id: usuarioData.empresa_id,
            agrupar_itens: agrupar
          })
          .select();

        console.log('Resultado da inserção:', insertData);
        error = insertError;
      }

      if (error) {
        console.error('Erro ao salvar configuração:', error);
        throw error;
      }

      setAgruparItens(agrupar);
      showMessage('success', 'Configuração de agrupar itens atualizada com sucesso!');
    } catch (error: any) {
      console.error('Exceção ao atualizar configuração de agrupar itens:', error);
      showMessage('error', 'Erro ao atualizar configuração de agrupar itens: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCNPJ = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18);
  };

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .substring(0, 14);
  };

  const formatCEP = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{5})(\d)/, '$1-$2')
      .substring(0, 9);
  };

  const formatWhatsapp = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .substring(0, 15);
  };

  // Função para salvar configurações de comissão do vendedor
  const salvarComissaoVendedor = async (usuarioId: string, empresaId: string) => {
    try {
      // Primeiro, desativar configurações existentes
      await supabase
        .from('vendedor_comissao')
        .update({ ativo: false })
        .eq('usuario_id', usuarioId);

      let gruposDetalhados = [];

      // Se for tipo grupos, buscar detalhes dos grupos selecionados
      if (usuarioForm.tipo_comissao === 'grupos' && usuarioForm.grupos_comissao.length > 0) {
        const { data: gruposData, error: gruposError } = await supabase
          .from('grupos')
          .select('id, nome, comissao_percentual')
          .in('id', usuarioForm.grupos_comissao);

        if (gruposError) throw gruposError;

        gruposDetalhados = gruposData.map(grupo => ({
          grupo_id: grupo.id,
          grupo_nome: grupo.nome,
          percentual_vigente: grupo.comissao_percentual || 0,
          data_configuracao: new Date().toISOString()
        }));
      }

      // Criar nova configuração ativa
      const { error } = await supabase
        .from('vendedor_comissao')
        .insert({
          usuario_id: usuarioId,
          empresa_id: empresaId,
          tipo_comissao: usuarioForm.tipo_comissao,
          percentual_comissao: usuarioForm.tipo_comissao === 'total_venda' ? usuarioForm.percentual_comissao : 0,
          grupos_selecionados: gruposDetalhados,
          ativo: true
        });

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao salvar comissão do vendedor:', error);
      throw error;
    }
  };

  // Função para desativar configurações de comissão do vendedor
  const desativarComissaoVendedor = async (usuarioId: string) => {
    try {
      await supabase
        .from('vendedor_comissao')
        .update({ ativo: false })
        .eq('usuario_id', usuarioId);
    } catch (error) {
      console.error('Erro ao desativar comissão do vendedor:', error);
      // Não lançar erro aqui para não interromper o fluxo principal
    }
  };

  // Função para carregar configurações de comissão do vendedor
  const carregarComissaoVendedor = async (usuarioId: string) => {
    try {
      const { data, error } = await supabase
        .from('vendedor_comissao')
        .select('*')
        .eq('usuario_id', usuarioId)
        .eq('ativo', true)
        .maybeSingle(); // Usar maybeSingle() em vez de single()

      if (error) {
        console.error('Erro ao carregar comissão do vendedor:', error);
        throw error;
      }

      if (data) {
        // Extrair apenas os IDs dos grupos para compatibilidade com o formulário
        const gruposIds = Array.isArray(data.grupos_selecionados)
          ? data.grupos_selecionados.map((grupo: any) =>
              typeof grupo === 'string' ? grupo : grupo.grupo_id
            )
          : [];

        return {
          tipo_comissao: data.tipo_comissao,
          percentual_comissao: data.percentual_comissao || 0,
          grupos_comissao: gruposIds
        };
      }

      return {
        tipo_comissao: 'total_venda',
        percentual_comissao: 0,
        grupos_comissao: []
      };
    } catch (error) {
      console.error('Erro ao carregar comissão do vendedor:', error);
      return {
        tipo_comissao: 'total_venda',
        percentual_comissao: 0,
        grupos_comissao: []
      };
    }
  };

  // Função para lidar com o envio do formulário de usuário
  const handleSubmitUsuario = async (e: React.FormEvent) => {
    e.preventDefault();

    // Limpar erros anteriores
    setFormErrors({
      senha: '',
      email: ''
    });

    // Validar os campos obrigatórios
    // No modo de edição, apenas o nome é obrigatório
    // No modo de criação, todos os campos são obrigatórios
    if (!usuarioForm.nome) {
      showMessage('error', 'O nome é obrigatório');
      return;
    }

    if (!isEditingUsuario && !usuarioForm.email) {
      showMessage('error', 'O email é obrigatório');
      return;
    }

    if (!isEditingUsuario && (!usuarioForm.senha || !usuarioForm.confirmarSenha)) {
      showMessage('error', 'A senha e a confirmação são obrigatórias para novos usuários');
      return;
    }

    if (!usuarioForm.tipo_user_config_id) {
      showMessage('error', 'O tipo de usuário é obrigatório');
      return;
    }

    // Validar se as senhas coincidem (apenas se uma senha foi fornecida)
    if (usuarioForm.senha && usuarioForm.senha !== usuarioForm.confirmarSenha) {
      setFormErrors(prev => ({ ...prev, senha: 'As senhas não coincidem' }));
      return;
    }

    // Validar tamanho mínimo da senha (apenas se uma senha foi fornecida)
    if (usuarioForm.senha && usuarioForm.senha.length < 6) {
      setFormErrors(prev => ({ ...prev, senha: 'A senha deve ter pelo menos 6 caracteres' }));
      return;
    }

    // Validar formato de email (apenas no modo de criação)
    if (!isEditingUsuario) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(usuarioForm.email)) {
        setFormErrors(prev => ({ ...prev, email: 'Email inválido' }));
        return;
      }
    }

    setIsLoading(true);

    try {
      // Obter o ID da empresa do usuário logado
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) throw new Error('Empresa não encontrada');

      // ✅ VALIDAÇÃO: Verificar se a série já existe na empresa
      const { data: serieExistente } = await supabase
        .from('usuarios')
        .select('id')
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('serie_nfce', usuarioForm.serie_nfce)
        .neq('id', usuarioForm.id || '') // Excluir o próprio usuário na edição
        .maybeSingle();

      if (serieExistente) {
        setFormErrors(prev => ({ ...prev, serie_nfce: `A série ${usuarioForm.serie_nfce} já está sendo usada por outro usuário desta empresa` }));
        setIsLoading(false);
        return;
      }

      // Modo de edição
      if (isEditingUsuario) {
        // 1. Atualizar o nome, tipo e série do usuário na tabela usuarios
        const { error: updateError } = await supabase
          .from('usuarios')
          .update({
            nome: usuarioForm.nome,
            tipo_user_config_id: usuarioForm.tipo_user_config_id,
            serie_nfce: usuarioForm.serie_nfce // ✅ NOVO: Atualizar série da NFC-e
          })
          .eq('id', usuarioForm.id);

        if (updateError) throw updateError;

        // 2. Se uma nova senha foi fornecida, atualizar a senha na autenticação
        if (usuarioForm.senha) {
          const { error: passwordError } = await supabase.auth.updateUser({
            password: usuarioForm.senha
          });

          if (passwordError) throw passwordError;
        }

        // 3. Se for vendedor, salvar/atualizar configurações de comissão
        const temTipoVendedor = usuarioForm.tipo_user_config_id.some(tipoId => {
          const tipo = tiposUsuario.find(t => t.id === tipoId);
          return tipo?.tipo === 'vendedor';
        });

        if (temTipoVendedor) {
          await salvarComissaoVendedor(usuarioForm.id, usuarioData.empresa_id);
        } else {
          // Se não for mais vendedor, desativar configurações de comissão existentes
          await desativarComissaoVendedor(usuarioForm.id);
        }

        showMessage('success', 'Usuário atualizado com sucesso!');
      }
      // Modo de criação
      else {
        // Verificar se o email já está cadastrado na empresa
        const { data: emailExistente } = await supabase
          .from('usuarios')
          .select('id')
          .eq('email', usuarioForm.email)
          .eq('empresa_id', usuarioData.empresa_id)
          .maybeSingle();

        if (emailExistente) {
          setFormErrors(prev => ({ ...prev, email: 'Este email já está cadastrado nesta empresa' }));
          setIsLoading(false);
          return;
        }

        // IMPORTANTE: Quando criamos um novo usuário com supabase.auth.signUp(),
        // o Supabase automaticamente tenta fazer login com esse novo usuário.
        // Para evitar que o admin seja deslogado, salvamos a sessão atual e a restauramos após criar o novo usuário.

        // 1. Salvar os dados do usuário atual antes de criar o novo usuário
        const { data: currentSession } = await supabase.auth.getSession();

        if (!currentSession?.session) {
          throw new Error('Sessão atual não encontrada');
        }

        // 2. Criar o usuário na autenticação do Supabase
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: usuarioForm.email,
          password: usuarioForm.senha,
          options: {
            emailRedirectTo: window.location.origin
          }
        });

        if (authError) {
          // Verificar se o erro é de email já existente
          if (authError.message.includes('email already registered')) {
            setFormErrors(prev => ({ ...prev, email: 'Este email já está cadastrado no sistema' }));
            setIsLoading(false);
            return;
          }
          throw authError;
        }

        if (!authData.user) throw new Error('Erro ao criar usuário');

        // 3. Restaurar a sessão do usuário admin
        await supabase.auth.setSession({
          access_token: currentSession.session.access_token,
          refresh_token: currentSession.session.refresh_token
        });

        // 4. Inserir o usuário na tabela usuarios com status ativo
        const { error: insertError } = await supabase
          .from('usuarios')
          .insert([{
            id: authData.user.id,
            nome: usuarioForm.nome,
            email: usuarioForm.email,
            empresa_id: usuarioData.empresa_id,
            tipo_user_config_id: usuarioForm.tipo_user_config_id,
            serie_nfce: usuarioForm.serie_nfce, // ✅ NOVO: Incluir série da NFC-e
            status: true // Definir o status como ativo por padrão
          }]);

        if (insertError) throw insertError;

        // 5. Se for vendedor, salvar configurações de comissão
        const temTipoVendedor = usuarioForm.tipo_user_config_id.some(tipoId => {
          const tipo = tiposUsuario.find(t => t.id === tipoId);
          return tipo?.tipo === 'vendedor';
        });

        if (temTipoVendedor) {
          await salvarComissaoVendedor(authData.user.id, usuarioData.empresa_id);
        }

        showMessage('success', 'Usuário adicionado com sucesso!');
      }

      // Limpar o formulário e resetar o modo de edição
      setUsuarioForm({
        id: '',
        nome: '',
        email: '',
        senha: '',
        confirmarSenha: '',
        tipo_user_config_id: [],
        serie_nfce: 1,
        tipo_comissao: 'total_venda',
        percentual_comissao: 0,
        grupos_comissao: []
      });
      setIsEditingUsuario(false);

      setShowSidebar(false);
      loadData();
    } catch (error: any) {
      showMessage('error', `Erro ao ${isEditingUsuario ? 'atualizar' : 'adicionar'} usuário: ${translateErrorMessage(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formattedValue = empresaForm.tipo_documento === 'CNPJ'
      ? formatCNPJ(value)
      : formatCPF(value);

    setEmpresaForm(prev => ({
      ...prev,
      documento: formattedValue
    }));
  };

  // Função para formatar Inscrição Estadual (apenas números, máximo 12 dígitos)
  const formatInscricaoEstadual = (value: string): string => {
    // Remove tudo que não for número
    const numbersOnly = value.replace(/\D/g, '');

    // Limita a 12 dígitos
    return numbersOnly.slice(0, 12);
  };

  const handleInscricaoEstadualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formattedValue = formatInscricaoEstadual(value);

    setEmpresaForm(prev => ({
      ...prev,
      inscricao_estadual: formattedValue
    }));
  };

  const buscarCNPJ = async () => {
    const cnpj = empresaForm.documento.replace(/\D/g, '');
    if (cnpj.length !== 14) {
      showMessage('error', 'CNPJ inválido. O CNPJ deve conter 14 dígitos.');
      return;
    }

    try {
      // Usar o estado específico para o loading do CNPJ
      setIsCnpjLoading(true);
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      const data = await response.json();

      if (response.ok) {
        // Buscar código IBGE do município
        const codigoIBGE = await buscarCodigoIBGE(data.municipio, data.uf);

        setEmpresaForm(prev => ({
          ...prev,
          razao_social: data.razao_social || '',
          nome_fantasia: data.nome_fantasia || '',
          cep: formatCEP(data.cep || ''),
          endereco: data.logradouro || '',
          numero: data.numero || '',
          complemento: data.complemento || '',
          bairro: data.bairro || '',
          cidade: data.municipio || '',
          estado: data.uf || '',
          codigo_municipio: codigoIBGE || ''
        }));

        if (codigoIBGE) {
          showMessage('success', 'Dados do CNPJ e código IBGE carregados com sucesso!');
        } else {
          showMessage('success', 'Dados do CNPJ carregados! Código IBGE não encontrado automaticamente.');
        }
      } else {
        showMessage('error', data.message || 'CNPJ não encontrado');
      }
    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error);
      showMessage('error', 'Erro ao buscar CNPJ. Tente novamente.');
    } finally {
      // Desativar o loading específico do CNPJ
      setIsCnpjLoading(false);
    }
  };

  // Função para buscar código IBGE do município
  const buscarCodigoIBGE = async (cidade: string, estado: string) => {
    try {
      if (!cidade || !estado) return null;

      const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado}/municipios`);
      const municipios = await response.json();

      const municipio = municipios.find((m: any) =>
        m.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') ===
        cidade.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      );

      return municipio ? municipio.id.toString() : null;
    } catch (error) {
      console.error('Erro ao buscar código IBGE:', error);
      return null;
    }
  };

  // Função para extrair informações do certificado digital
  const extrairInfoCertificado = async (file: File, senha: string) => {
    try {
      // Usar o utilitário de extração de certificado
      const info = await extractCertificateInfo(file, senha);

      return {
        nome: info.nome,
        validade: info.validade,
        status: info.status,
        cnpj: info.cnpj
      };
    } catch (error) {
      console.error('❌ Erro ao extrair informações do certificado:', error);
      throw new Error('Erro ao processar certificado digital. Verifique se o arquivo e a senha estão corretos.');
    }
  };

  // Função para fazer upload do certificado digital (NOVO - Storage Local)
  const handleUploadCertificado = async () => {
    if (!certificadoFile || !certificadoSenha.trim()) {
      showMessage('error', 'Selecione um arquivo de certificado e informe a senha');
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) throw new Error('Empresa não encontrada');

      // Buscar dados da empresa atual para validar CNPJ
      const { data: empresaData } = await supabase
        .from('empresas')
        .select('documento')
        .eq('id', usuarioData.empresa_id)
        .single();

      if (!empresaData) throw new Error('Dados da empresa não encontrados');

      // Extrair informações do certificado para validar CNPJ
      const infoCertificado = await extrairInfoCertificado(certificadoFile, certificadoSenha);

      if (infoCertificado.cnpj) {
        // Limpar formatação do CNPJ da empresa
        const cnpjEmpresa = empresaData.documento.replace(/\D/g, '');
        const cnpjCertificado = infoCertificado.cnpj.replace(/\D/g, '');

        if (cnpjEmpresa !== cnpjCertificado) {
          showMessage('error', `CNPJ do certificado (${cnpjCertificado}) não confere com o CNPJ da empresa (${cnpjEmpresa}). Verifique se está usando o certificado correto para esta empresa.`);
          limparCamposCertificado();
          return;
        }
      }

      // Upload para storage local usando o novo hook
      const result = await uploadCertificateLocal(
        certificadoFile,
        certificadoSenha,
        usuarioData.empresa_id
      );

      if (result.success) {
        // Limpar formulário
        setCertificadoFile(null);
        setCertificadoSenha('');

        // Recarregar dados
        loadData();
      }

    } catch (error: any) {
      // Limpar campos em caso de erro
      limparCamposCertificado();
      console.error('❌ Erro no upload:', error);
    }
  };

  // Função auxiliar para limpar campos do certificado
  const limparCamposCertificado = () => {
    setCertificadoFile(null);
    setCertificadoSenha('');
    setCertificadoInfo(null);

    // Limpar o input file (forçar reset do campo)
    const fileInput = document.querySelector('input[type="file"][accept=".p12,.pfx"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Função para remover certificado digital (NOVO - Storage Local)
  const handleRemoverCertificado = async () => {
    if (!certificadoInfo?.certificado_digital_path) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) throw new Error('Empresa não encontrada');

      // Usar a função do hook para remover do storage local
      const success = await removeCertificateLocal(usuarioData.empresa_id);

      if (success) {
        // Limpar todos os campos do formulário de certificado
        limparCamposCertificado();
        setShowRemoveCertificadoModal(false);

        // Recarregar dados
        loadData();
      }

    } catch (error: any) {
      console.error('❌ Erro ao remover certificado:', error);
      showMessage('error', 'Erro ao remover certificado: ' + error.message);
      setShowRemoveCertificadoModal(false);
    }
  };

  // Função para salvar ambiente NFe
  const handleSalvarAmbienteNFe = async (novoAmbiente: '1' | '2') => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // Converter de '1'/'2' para 'producao'/'homologacao'
      const ambienteTexto = novoAmbiente === '1' ? 'producao' : 'homologacao';

      // Verificar se já existe configuração
      const { data: existingConfig } = await supabase
        .from('nfe_config')
        .select('id')
        .eq('empresa_id', usuarioData.empresa_id)
        .single();

      if (existingConfig) {
        // Atualizar configuração existente
        const { error } = await supabase
          .from('nfe_config')
          .update({ ambiente: ambienteTexto })
          .eq('empresa_id', usuarioData.empresa_id);

        if (error) throw error;
      } else {
        // Criar nova configuração
        const { error } = await supabase
          .from('nfe_config')
          .insert({
            empresa_id: usuarioData.empresa_id,
            ambiente: ambienteTexto
          });

        if (error) throw error;
      }

      setAmbienteNFe(novoAmbiente);
      showMessage('success', `Ambiente alterado para ${novoAmbiente === '1' ? 'Produção' : 'Homologação'}`);

    } catch (error) {
      console.error('Erro ao salvar ambiente NFe:', error);
      showMessage('error', 'Erro ao salvar ambiente NFe');
    }
  };

  // Função para salvar configuração CSC NFCe
  const handleSalvarCscNfce = async () => {
    try {
      setIsSavingCsc(true);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // Validações
      if (cscHomologacao && !cscIdHomologacao) {
        showMessage('error', 'CSC ID de homologação é obrigatório quando CSC de homologação for informado');
        return;
      }

      if (cscProducao && !cscIdProducao) {
        showMessage('error', 'CSC ID de produção é obrigatório quando CSC de produção for informado');
        return;
      }

      // Preparar dados para salvar na tabela empresas
      const cscData = {
        csc_homologacao: cscHomologacao || null,
        csc_id_homologacao: cscIdHomologacao ? parseInt(cscIdHomologacao) : null,
        csc_producao: cscProducao || null,
        csc_id_producao: cscIdProducao ? parseInt(cscIdProducao) : null
      };

      // Atualizar dados CSC na tabela empresas
      const { error } = await supabase
        .from('empresas')
        .update(cscData)
        .eq('id', usuarioData.empresa_id);

      if (error) throw error;

      showMessage('success', 'Configuração CSC para NFCe salva com sucesso!');

    } catch (error) {
      console.error('Erro ao salvar CSC NFCe:', error);
      showMessage('error', 'Erro ao salvar configuração CSC');
    } finally {
      setIsSavingCsc(false);
    }
  };

  const buscarCEP = async () => {
    const cep = empresaForm.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;

    try {
      setIsCepLoading(true);
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        // Buscar código IBGE do município
        const codigoIBGE = await buscarCodigoIBGE(data.localidade, data.uf);

        setEmpresaForm(prev => ({
          ...prev,
          endereco: data.logradouro,
          bairro: data.bairro,
          cidade: data.localidade,
          estado: data.uf,
          codigo_municipio: codigoIBGE || ''
        }));

        if (codigoIBGE) {
          showMessage('success', 'Endereço e código IBGE carregados com sucesso!');
        } else {
          showMessage('success', 'Endereço carregado! Código IBGE não encontrado automaticamente.');
        }
      } else {
        showMessage('error', 'CEP não encontrado');
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      showMessage('error', 'Erro ao buscar CEP. Tente novamente.');
    } finally {
      setIsCepLoading(false);
    }
  };

  const handleCopyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Marcar o campo como copiado
      setCopiedFields(prev => ({...prev, [fieldId]: true}));

      // Após 2 segundos, remover a marca de copiado
      setTimeout(() => {
        setCopiedFields(prev => ({...prev, [fieldId]: false}));
      }, 2000);

      showMessage('success', 'Texto copiado!');
    }).catch(err => {
      console.error('Erro ao copiar texto: ', err);
      showMessage('error', 'Erro ao copiar texto');
    });
  };

  const carregarConfiguracoesPdv = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obter empresa_id do usuário da tabela usuarios
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      const { data: config } = await supabase
        .from('pdv_config')
        .select('*')
        .eq('empresa_id', usuarioData.empresa_id)
        .single();

      if (config) {
        setPdvConfig({
          comandas: config.comandas || false,
          mesas: config.mesas || false,
          vendedor: config.vendedor || false,
          exibe_foto_item: config.exibe_foto_item || false,
          seleciona_clientes: config.seleciona_clientes || false,
          controla_caixa: config.controla_caixa || false,
          agrupa_itens: config.agrupa_itens || false,
          delivery: config.delivery || false,
          cardapio_digital: config.cardapio_digital || false,
          delivery_chat_ia: config.delivery_chat_ia || false,
          baixa_estoque_pdv: config.baixa_estoque_pdv || false,
          venda_codigo_barras: config.venda_codigo_barras || false,
          forca_venda_fiscal_cartao: config.forca_venda_fiscal_cartao || false,
          observacao_no_item: config.observacao_no_item || false,
          desconto_no_item: config.desconto_no_item || false,
          editar_nome_produto: config.editar_nome_produto || false,
          fiado: config.fiado || false,
          vendas_itens_multiplicacao: config.vendas_itens_multiplicacao || false,
          exibir_dados_fiscais_venda: config.exibir_dados_fiscais_venda || false,
          solicitar_nome_cliente: config.solicitar_nome_cliente || false,
          ocultar_finalizar_com_impressao: config.ocultar_finalizar_com_impressao || false,
          ocultar_finalizar_sem_impressao: config.ocultar_finalizar_sem_impressao || false,
          ocultar_nfce_com_impressao: config.ocultar_nfce_com_impressao || false,
          ocultar_nfce_sem_impressao: config.ocultar_nfce_sem_impressao || false,
          ocultar_nfce_producao: config.ocultar_nfce_producao || false,
          ocultar_producao: config.ocultar_producao || false,
          rodape_personalizado: config.rodape_personalizado || 'Obrigado pela preferencia volte sempre!',
          mostrar_razao_social_cupom_finalizar: config.mostrar_razao_social_cupom_finalizar || false,
          mostrar_endereco_cupom_finalizar: config.mostrar_endereco_cupom_finalizar || false,
          mostrar_operador_cupom_finalizar: config.mostrar_operador_cupom_finalizar || false,
          tipo_impressao_80mm: config.tipo_impressao_80mm !== undefined ? config.tipo_impressao_80mm : true,  // ✅ NOVO
          tipo_impressao_50mm: config.tipo_impressao_50mm !== undefined ? config.tipo_impressao_50mm : false,  // ✅ NOVO
          venda_sem_produto: config.venda_sem_produto || false,
          venda_sem_produto_ncm: config.venda_sem_produto_ncm || '22021000',
          venda_sem_produto_cfop: config.venda_sem_produto_cfop || '5102',
          venda_sem_produto_origem: config.venda_sem_produto_origem !== undefined ? config.venda_sem_produto_origem : 0,
          venda_sem_produto_situacao_tributaria: config.venda_sem_produto_situacao_tributaria || 'tributado_integral',
          venda_sem_produto_cest: config.venda_sem_produto_cest || '',
          venda_sem_produto_margem_st: config.venda_sem_produto_margem_st || null,
          venda_sem_produto_aliquota_icms: config.venda_sem_produto_aliquota_icms !== undefined ? config.venda_sem_produto_aliquota_icms : 18.0,
          venda_sem_produto_aliquota_pis: config.venda_sem_produto_aliquota_pis !== undefined ? config.venda_sem_produto_aliquota_pis : 1.65,
          venda_sem_produto_aliquota_cofins: config.venda_sem_produto_aliquota_cofins !== undefined ? config.venda_sem_produto_aliquota_cofins : 7.6,
          venda_sem_produto_peso_liquido: config.venda_sem_produto_peso_liquido !== undefined ? config.venda_sem_produto_peso_liquido : 0,
          modo_escuro_cardapio: config.modo_escuro_cardapio || false,
          exibir_fotos_itens_cardapio: config.exibir_fotos_itens_cardapio || false,
          cardapio_fotos_minimizadas: config.cardapio_fotos_minimizadas || false,
          cardapio_abertura_tipo: config.cardapio_abertura_tipo || 'automatico',
          cardapio_loja_aberta: config.cardapio_loja_aberta !== undefined ? config.cardapio_loja_aberta : true,
          trabalha_com_pizzas: config.trabalha_com_pizzas || false,
          ocultar_grupos_cardapio: config.ocultar_grupos_cardapio || false,
          retirada_balcao_cardapio: config.retirada_balcao_cardapio || false,
          consumo_interno: config.consumo_interno || false
        });

        // Atualizar também o estado separado do rodapé
        setRodapePersonalizado(config.rodape_personalizado || 'Obrigado pela preferencia volte sempre!');

        // Atualizar também o estado separado da URL do cardápio
        setCardapioUrlPersonalizada(config.cardapio_url_personalizada || '');

        // Atualizar estados do logo
        setLogoUrl(config.logo_url || '');
        setLogoStoragePath(config.logo_storage_path || '');
      } else {
        // Se não encontrou configuração, definir valores padrão
        setPdvConfig({
          comandas: false,
          mesas: false,
          vendedor: false,
          exibe_foto_item: false,
          seleciona_clientes: false,
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
          desconto_no_total: false,
          vendas_itens_multiplicacao: false,
          exibir_dados_fiscais_venda: false,
          solicitar_nome_cliente: false,
          ocultar_finalizar_com_impressao: false,
          ocultar_finalizar_sem_impressao: false,
          ocultar_nfce_com_impressao: false,
          ocultar_nfce_sem_impressao: false,
          ocultar_nfce_producao: false,
          ocultar_producao: false,
          rodape_personalizado: 'Obrigado pela preferencia volte sempre!',
          mostrar_razao_social_cupom_finalizar: false,
          mostrar_endereco_cupom_finalizar: false,
          mostrar_operador_cupom_finalizar: false,
          tipo_impressao_80mm: true,  // ✅ NOVO: 80mm como padrão
          tipo_impressao_50mm: false,  // ✅ NOVO: 50mm desabilitado
          venda_sem_produto: false,
          venda_sem_produto_ncm: '22021000',
          venda_sem_produto_cfop: '5405',
          venda_sem_produto_origem: 0,
          venda_sem_produto_situacao_tributaria: 'st',
          venda_sem_produto_cest: '0300600',
          venda_sem_produto_margem_st: 30,
          venda_sem_produto_aliquota_icms: 18.0,
          venda_sem_produto_aliquota_pis: 1.65,
          venda_sem_produto_aliquota_cofins: 7.6,
          venda_sem_produto_peso_liquido: 0,
          venda_sem_produto_nome_padrao: 'Diversos',
          venda_sem_produto_cst: '60',
          venda_sem_produto_csosn: '500',
          modo_escuro_cardapio: false,
          exibir_fotos_itens_cardapio: false,
          cardapio_fotos_minimizadas: false,
          trabalha_com_pizzas: false,
          ocultar_grupos_cardapio: false,
          consumo_interno: false
        });

        // Atualizar também o estado separado do rodapé
        setRodapePersonalizado('Obrigado pela preferencia volte sempre!');
      }
    } catch (error) {
      console.error('Erro ao carregar configurações do PDV:', error);
      // Em caso de erro, definir valores padrão
      setPdvConfig({
        comandas: false,
        mesas: false,
        vendedor: false,
        exibe_foto_item: false,
        seleciona_clientes: false,
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
        exibir_dados_fiscais_venda: false,
        solicitar_nome_cliente: false,
        ocultar_finalizar_com_impressao: false,
        ocultar_finalizar_sem_impressao: false,
        ocultar_nfce_com_impressao: false,
        ocultar_nfce_sem_impressao: false,
        ocultar_nfce_producao: false,
        ocultar_producao: false,
        rodape_personalizado: 'Obrigado pela preferencia volte sempre!',
        mostrar_razao_social_cupom_finalizar: false,
        mostrar_endereco_cupom_finalizar: false,
        mostrar_operador_cupom_finalizar: false,
        tipo_impressao_80mm: true,  // ✅ NOVO: 80mm como padrão
        tipo_impressao_50mm: false,  // ✅ NOVO: 50mm desabilitado
        venda_sem_produto: false,
        venda_sem_produto_ncm: '22021000',
        venda_sem_produto_cfop: '5405',
        venda_sem_produto_origem: 0,
        venda_sem_produto_situacao_tributaria: 'st',
        venda_sem_produto_cest: '0300600',
        venda_sem_produto_margem_st: 30,
        venda_sem_produto_aliquota_icms: 18.0,
        venda_sem_produto_aliquota_pis: 1.65,
        venda_sem_produto_aliquota_cofins: 7.6,
        venda_sem_produto_peso_liquido: 0,
        venda_sem_produto_nome_padrao: 'Diversos',
        venda_sem_produto_cst: '60',
        venda_sem_produto_csosn: '500',
        modo_escuro_cardapio: false,
        exibir_fotos_itens_cardapio: false,
        cardapio_fotos_minimizadas: false,
        cardapio_abertura_tipo: 'automatico',
        cardapio_loja_aberta: true,
        trabalha_com_pizzas: false,
        ocultar_grupos_cardapio: false,
        retirada_balcao_cardapio: false,
        consumo_interno: false
      });

      // Atualizar também o estado separado do rodapé
      setRodapePersonalizado('Obrigado pela preferencia volte sempre!');
    }
  };

  // Funções para formatação de chave PIX
  const formatarChavePix = (valor: string, tipo: string): string => {
    // Remove tudo que não é número ou letra
    const apenasNumeros = valor.replace(/\D/g, '');
    const apenasCaracteres = valor.replace(/[^a-zA-Z0-9@.-]/g, '');

    switch (tipo) {
      case 'telefone':
        // Formato: (11) 99999-9999 - apenas os dígitos brasileiros
        if (apenasNumeros.length <= 11) {
          return apenasNumeros
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{4,5})(\d{4})$/, '$1-$2');
        }
        return valor.slice(0, 15); // Limita o tamanho

      case 'cpf':
        // Formato: 999.999.999-99
        return apenasNumeros
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
          .slice(0, 14);

      case 'cnpj':
        // Formato: 99.999.999/9999-99
        return apenasNumeros
          .replace(/(\d{2})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1/$2')
          .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
          .slice(0, 18);

      case 'email':
        // Sem formatação especial, apenas validação básica
        return apenasCaracteres.toLowerCase().slice(0, 100);

      case 'chave_aleatoria':
        // Formato UUID: 8-4-4-4-12 caracteres
        return valor.replace(/[^a-fA-F0-9-]/g, '').slice(0, 36);

      default:
        return valor;
    }
  };

  const removerMascaraChavePix = (valor: string, tipo: string): string => {
    switch (tipo) {
      case 'telefone':
        // Para telefone PIX, salvar apenas os 11 dígitos sem +55
        // O formato internacional será aplicado apenas na geração do QR Code
        let numeroLimpo = valor.replace(/\D/g, '');

        // Se tem +55 no início, remover
        if (numeroLimpo.startsWith('55') && numeroLimpo.length > 11) {
          numeroLimpo = numeroLimpo.substring(2);
        }

        return numeroLimpo;
      case 'cpf':
      case 'cnpj':
        return valor.replace(/\D/g, '');
      case 'email':
      case 'chave_aleatoria':
        return valor;
      default:
        return valor;
    }
  };

  const validarChavePix = (valor: string, tipo: string): boolean => {
    const valorLimpo = removerMascaraChavePix(valor, tipo);

    switch (tipo) {
      case 'telefone':
        // Validar 10 ou 11 dígitos (formato brasileiro)
        return valorLimpo.length >= 10 && valorLimpo.length <= 11;
      case 'cpf':
        return valorLimpo.length === 11;
      case 'cnpj':
        return valorLimpo.length === 14;
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
      case 'chave_aleatoria':
        return valor.length >= 32;
      default:
        return false;
    }
  };

  const getPlaceholderChavePix = (tipo: string): string => {
    switch (tipo) {
      case 'telefone':
        return '(11) 99999-9999';
      case 'cpf':
        return '999.999.999-99';
      case 'cnpj':
        return '99.999.999/9999-99';
      case 'email':
        return 'exemplo@email.com';
      case 'chave_aleatoria':
        return 'Cole aqui sua chave PIX aleatória';
      default:
        return '';
    }
  };

  // Função para carregar opções de formas de pagamento
  const loadFormasPagamentoOpcoes = async () => {
    try {
      const { data, error } = await supabase
        .from('forma_pagamento_opcoes')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setFormasPagamentoOpcoes(data || []);
    } catch (error) {
      console.error('Erro ao carregar opções de formas de pagamento:', error);
    }
  };

  // Função para carregar formas de pagamento da empresa
  const loadFormasPagamentoEmpresa = async () => {
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
        .from('formas_pagamento_empresa')
        .select(`
          *,
          forma_pagamento_opcoes:forma_pagamento_opcao_id (
            id,
            nome,
            tipo
          )
        `)
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('ativo', true)
        .order('created_at');

      if (error) throw error;
      setFormasPagamentoEmpresa(data || []);
    } catch (error) {
      console.error('Erro ao carregar formas de pagamento da empresa:', error);
    }
  };

  // Função para salvar/editar forma de pagamento
  const handleSalvarFormaPagamento = async () => {
    try {
      setIsLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // Preparar dados PIX (remover máscara se necessário)
      const chavePix = novaFormaPagamento.utilizar_chave_pix && novaFormaPagamento.chave_pix
        ? removerMascaraChavePix(novaFormaPagamento.chave_pix, novaFormaPagamento.tipo_chave_pix)
        : null;

      if (editingFormaPagamento) {
        // Editar forma de pagamento existente
        const { error } = await supabase
          .from('formas_pagamento_empresa')
          .update({
            cardapio_digital: novaFormaPagamento.cardapio_digital,
            max_parcelas: novaFormaPagamento.max_parcelas,
            juros_por_parcela: novaFormaPagamento.juros_por_parcela,
            utilizar_chave_pix: novaFormaPagamento.utilizar_chave_pix,
            tipo_chave_pix: novaFormaPagamento.utilizar_chave_pix ? novaFormaPagamento.tipo_chave_pix : null,
            chave_pix: chavePix
          })
          .eq('id', editingFormaPagamento.id);

        if (error) throw error;
        showMessage('success', 'Forma de pagamento atualizada com sucesso!');
      } else {
        // Criar nova forma de pagamento
        const { error } = await supabase
          .from('formas_pagamento_empresa')
          .insert({
            empresa_id: usuarioData.empresa_id,
            forma_pagamento_opcao_id: novaFormaPagamento.forma_pagamento_opcao_id,
            cardapio_digital: novaFormaPagamento.cardapio_digital,
            max_parcelas: novaFormaPagamento.max_parcelas,
            juros_por_parcela: novaFormaPagamento.juros_por_parcela,
            utilizar_chave_pix: novaFormaPagamento.utilizar_chave_pix,
            tipo_chave_pix: novaFormaPagamento.utilizar_chave_pix ? novaFormaPagamento.tipo_chave_pix : null,
            chave_pix: chavePix
          });

        if (error) throw error;
        showMessage('success', 'Forma de pagamento adicionada com sucesso!');
      }

      setShowModalFormaPagamento(false);
      setEditingFormaPagamento(null);
      setNovaFormaPagamento({
        forma_pagamento_opcao_id: '',
        cardapio_digital: false,
        max_parcelas: 1,
        juros_por_parcela: 0,
        utilizar_chave_pix: false,
        tipo_chave_pix: '',
        chave_pix: ''
      });
      await loadFormasPagamentoEmpresa();
    } catch (error) {
      console.error('Erro ao salvar forma de pagamento:', error);
      showMessage('error', 'Erro ao salvar forma de pagamento');
    } finally {
      setIsLoading(false);
    }
  };

  // Função para abrir modal de edição
  const handleEditarFormaPagamento = (forma: any) => {
    setEditingFormaPagamento(forma);
    setNovaFormaPagamento({
      forma_pagamento_opcao_id: forma.forma_pagamento_opcao_id,
      cardapio_digital: forma.cardapio_digital,
      max_parcelas: forma.max_parcelas,
      juros_por_parcela: forma.juros_por_parcela,
      utilizar_chave_pix: forma.utilizar_chave_pix || false,
      tipo_chave_pix: forma.tipo_chave_pix || '',
      chave_pix: forma.chave_pix ? formatarChavePix(forma.chave_pix, forma.tipo_chave_pix) : ''
    });
    setShowModalFormaPagamento(true);
  };

  // Função para deletar forma de pagamento
  const handleDeletarFormaPagamento = async (id: string) => {
    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('formas_pagamento_empresa')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showMessage('success', 'Forma de pagamento removida com sucesso!');
      await loadFormasPagamentoEmpresa();
    } catch (error) {
      console.error('Erro ao deletar forma de pagamento:', error);
      showMessage('error', 'Erro ao remover forma de pagamento');
    } finally {
      setIsLoading(false);
    }
  };

  // =====================================================
  // FUNÇÕES PARA TIPOS DE PAGAMENTOS
  // =====================================================

  // Função para carregar tipos de pagamentos da empresa
  const loadTiposPagamentosOpcoes = async () => {
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
        .from('tipo_pagamentos_opcoes')
        .select('*')
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('deletado', false)
        .order('descricao');

      if (error) throw error;

      setTiposPagamentosOpcoes(data || []);
    } catch (error) {
      console.error('Erro ao carregar tipos de pagamentos:', error);
    }
  };

  // Função para salvar tipo de pagamento
  const handleSalvarTipoPagamento = async () => {
    if (!novoTipoPagamento.descricao.trim()) {
      showMessage('error', 'Descrição é obrigatória');
      return;
    }

    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      if (editingTipoPagamento) {
        // Atualizar tipo existente
        const { error } = await supabase
          .from('tipo_pagamentos_opcoes')
          .update({
            descricao: novoTipoPagamento.descricao.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTipoPagamento.id);

        if (error) throw error;
        showMessage('success', 'Tipo de pagamento atualizado com sucesso!');
      } else {
        // Criar novo tipo
        const { error } = await supabase
          .from('tipo_pagamentos_opcoes')
          .insert({
            empresa_id: usuarioData.empresa_id,
            descricao: novoTipoPagamento.descricao.trim()
          });

        if (error) throw error;
        showMessage('success', 'Tipo de pagamento adicionado com sucesso!');
      }

      setShowModalTipoPagamento(false);
      setEditingTipoPagamento(null);
      setNovoTipoPagamento({ descricao: '' });
      await loadTiposPagamentosOpcoes();
    } catch (error) {
      console.error('Erro ao salvar tipo de pagamento:', error);
      showMessage('error', 'Erro ao salvar tipo de pagamento');
    } finally {
      setIsLoading(false);
    }
  };

  // Função para abrir modal de edição de tipo
  const handleEditarTipoPagamento = (tipo: any) => {
    setEditingTipoPagamento(tipo);
    setNovoTipoPagamento({
      descricao: tipo.descricao
    });
    setShowModalTipoPagamento(true);
  };

  // Função para deletar tipo de pagamento
  const handleDeletarTipoPagamento = async (id: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('tipo_pagamentos_opcoes')
        .update({
          deletado: true,
          deletado_em: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      showMessage('success', 'Tipo de pagamento removido com sucesso!');
      await loadTiposPagamentosOpcoes();
    } catch (error) {
      console.error('Erro ao deletar tipo de pagamento:', error);
      showMessage('error', 'Erro ao remover tipo de pagamento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpcoesAdicionaisChange = async (value: boolean) => {
    try {
      // Atualizar o estado local primeiro
      setOpcoesAdicionais(value);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // Verificar se já existe uma configuração
      const { data: existingConfig } = await supabase
        .from('produtos_config')
        .select('id')
        .eq('empresa_id', usuarioData.empresa_id)
        .single();

      const configData = {
        empresa_id: usuarioData.empresa_id,
        opcoes_adicionais: value
      };

      if (existingConfig) {
        const { error } = await supabase
          .from('produtos_config')
          .update(configData)
          .eq('empresa_id', usuarioData.empresa_id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('produtos_config')
          .insert([configData]);

        if (error) throw error;
      }

      // Disparar evento customizado para notificar o Sidebar imediatamente
      console.log('Disparando evento opcoesAdicionaisChanged com valor:', value);
      window.dispatchEvent(new CustomEvent('opcoesAdicionaisChanged', {
        detail: { opcoesAdicionais: value }
      }));

      // Mostrar mensagem de sucesso
      const status = value ? 'habilitadas' : 'desabilitadas';
      showMessage('success', `Opções Adicionais ${status} com sucesso!`);

    } catch (error: any) {
      // Reverter o estado local em caso de erro
      setOpcoesAdicionais(!value);
      console.error('Erro ao salvar configuração de produtos:', error);
      showMessage('error', 'Erro ao salvar configuração: ' + error.message);
    }
  };

  const handleSalvarTaxaEntrega = async () => {
    try {
      setIsLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // Primeiro, verificar se já existe uma configuração
      const { data: existingConfig } = await supabase
        .from('taxa_entrega_config')
        .select('id')
        .eq('empresa_id', usuarioData.empresa_id)
        .single();

      if (existingConfig) {
        // Se existe, atualizar
        const { error } = await supabase
          .from('taxa_entrega_config')
          .update({
            habilitado: taxaEntregaHabilitada,
            tipo: tipoTaxaEntrega
          })
          .eq('empresa_id', usuarioData.empresa_id);

        if (error) throw error;
      } else {
        // Se não existe, criar nova configuração
        const { error } = await supabase
          .from('taxa_entrega_config')
          .insert({
            empresa_id: usuarioData.empresa_id,
            habilitado: taxaEntregaHabilitada,
            tipo: tipoTaxaEntrega
          });

        if (error) throw error;
      }

      // Disparar evento customizado para notificar o Sidebar imediatamente (mesmo padrão das Opções Adicionais)
      console.log('📡 Disparando evento taxaEntregaChanged com valor:', taxaEntregaHabilitada);
      window.dispatchEvent(new CustomEvent('taxaEntregaChanged', {
        detail: {
          taxaEntregaHabilitada: taxaEntregaHabilitada,
          tipo: tipoTaxaEntrega
        }
      }));

      showMessage('success', 'Configuração de taxa de entrega salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configuração de taxa de entrega:', error);
      showMessage('error', 'Erro ao salvar configuração de taxa de entrega');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrabalhaComTabelaPrecosChange = async (value: boolean) => {
    try {
      // Atualizar estado local primeiro
      setTrabalhaComTabelaPrecos(value);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // Atualizar no banco de dados
      const { error } = await supabase
        .from('tabela_preco_config')
        .update({
          trabalha_com_tabela_precos: value
        })
        .eq('empresa_id', usuarioData.empresa_id);

      if (error) throw error;

      const status = value ? 'habilitado' : 'desabilitado';
      showMessage('success', `Sistema de Tabela de Preços ${status} com sucesso!`);

      // Se desabilitou, também desabilitar sabores
      if (!value && trabalhaComSabores) {
        await handleTrabalhaComSaboresChange(false);
      }

    } catch (error) {
      // Reverter estado local em caso de erro
      setTrabalhaComTabelaPrecos(!value);
      console.error('Erro ao alterar configuração de tabela de preços:', error);
      showMessage('error', 'Erro ao alterar configuração de tabela de preços');
    }
  };

  const handleTrabalhaComSaboresChange = async (value: boolean) => {
    try {
      // Atualizar estado local primeiro
      setTrabalhaComSabores(value);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // Atualizar no banco de dados
      const { error } = await supabase
        .from('tabela_preco_config')
        .update({
          trabalha_com_sabores: value
        })
        .eq('empresa_id', usuarioData.empresa_id);

      if (error) throw error;

      const status = value ? 'habilitado' : 'desabilitado';
      showMessage('success', `Sistema de Sabores ${status} com sucesso!`);

    } catch (error) {
      // Reverter estado local em caso de erro
      setTrabalhaComSabores(!value);
      console.error('Erro ao alterar configuração de sabores:', error);
      showMessage('error', 'Erro ao alterar configuração de sabores');
    }
  };

  const handleTipoPrecoPizzaChange = async (value: 'sabor_mais_caro' | 'media_sabores') => {
    try {
      // Atualizar estado local primeiro
      setTipoPrecoPizza(value);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // Atualizar no banco de dados
      const { error } = await supabase
        .from('tabela_preco_config')
        .update({
          tipo_preco_pizza: value
        })
        .eq('empresa_id', usuarioData.empresa_id);

      if (error) throw error;

      const descricao = value === 'sabor_mais_caro' ? 'Preço do sabor mais caro' : 'Média dos preços dos sabores';
      showMessage('success', `Tipo de preço alterado para: ${descricao}`);

    } catch (error) {
      // Reverter estado local em caso de erro
      setTipoPrecoPizza(value === 'sabor_mais_caro' ? 'media_sabores' : 'sabor_mais_caro');
      console.error('Erro ao alterar tipo de preço da pizza:', error);
      showMessage('error', 'Erro ao alterar tipo de preço da pizza');
    }
  };

  const handleSalvarTabelaPrecos = async () => {
    try {
      setIsLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // Atualizar configurações (caso tenham sido alteradas localmente)
      const { error } = await supabase
        .from('tabela_preco_config')
        .update({
          trabalha_com_tabela_precos: trabalhaComTabelaPrecos,
          trabalha_com_sabores: trabalhaComSabores,
          tipo_preco_pizza: tipoPrecoPizza
        })
        .eq('empresa_id', usuarioData.empresa_id);

      if (error) throw error;

      showMessage('success', 'Configurações de tabela de preços salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configuração de tabela de preços:', error);
      showMessage('error', 'Erro ao salvar configuração de tabela de preços');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSalvarNovaTabela = async (nome: string, quantidadeSabores: number) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      const novaTabela = {
        empresa_id: usuarioData.empresa_id,
        nome: nome.trim(),
        quantidade_sabores: trabalhaComSabores ? quantidadeSabores : 1,
        permite_meio_a_meio: trabalhaComSabores && quantidadeSabores > 1,
        ativo: true
      };

      const { data, error } = await supabase
        .from('tabela_de_preco')
        .insert(novaTabela)
        .select()
        .single();

      if (error) throw error;

      // Atualizar lista local
      setTabelasPrecos(prev => [...prev, data]);

      return data;
    } catch (error) {
      console.error('Erro ao salvar nova tabela:', error);
      throw error;
    }
  };

  const handleEditarTabela = async (id: string, nome: string, quantidadeSabores: number) => {
    try {
      console.log('🔧 handleEditarTabela chamada:', { id, nome, quantidadeSabores });

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      const dadosAtualizados = {
        nome: nome.trim(),
        quantidade_sabores: trabalhaComSabores ? quantidadeSabores : 1,
        permite_meio_a_meio: trabalhaComSabores && quantidadeSabores > 1
      };

      console.log('📝 Dados para atualização:', dadosAtualizados);
      console.log('🎯 Filtros:', { id, empresa_id: usuarioData.empresa_id });

      const { data, error } = await supabase
        .from('tabela_de_preco')
        .update(dadosAtualizados)
        .eq('id', id)
        .eq('empresa_id', usuarioData.empresa_id)
        .select()
        .single();

      if (error) throw error;

      // Atualizar lista local
      setTabelasPrecos(prev =>
        prev.map(t => t.id === id ? data : t)
      );

      return data;
    } catch (error) {
      console.error('Erro ao editar tabela:', error);
      throw error;
    }
  };

  const handleExcluirTabela = async (id: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      const { error } = await supabase
        .from('tabela_de_preco')
        .update({
          deletado: true,
          deletado_em: new Date().toISOString(),
          deletado_por: userData.user.id
        })
        .eq('id', id)
        .eq('empresa_id', usuarioData.empresa_id);

      if (error) throw error;

      // Remover da lista local
      setTabelasPrecos(prev => prev.filter(t => t.id !== id));

      showMessage('success', 'Tabela excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir tabela:', error);
      showMessage('error', 'Erro ao excluir tabela');
    }
  };

  // ⚠️ FUNÇÃO DESABILITADA: Conexão em desenvolvimento - VERSÃO 2.0
  const handleConexaoConfigChange = async (field: string, value: boolean) => {
    // 🚧 FUNCIONALIDADE COMPLETAMENTE BLOQUEADA - EM DESENVOLVIMENTO
    console.log('🚫 BLOQUEADO: Tentativa de alterar configuração de conexão - funcionalidade em desenvolvimento');
    showMessage('warning', '🚧 Funcionalidade em desenvolvimento - não disponível no momento');
    alert('⚠️ ATENÇÃO: Esta funcionalidade está em desenvolvimento e não pode ser habilitada!');
    return;

    /* CÓDIGO ORIGINAL COMENTADO PARA BLOQUEAR FUNCIONALIDADE
    try {
      // Atualizar o estado local primeiro
      setConexaoConfig(prev => ({ ...prev, [field]: value }));

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // Verificar se já existe uma configuração
      const { data: existingConfig } = await supabase
        .from('conexao_config')
        .select('id')
        .eq('empresa_id', usuarioData.empresa_id)
        .single();

      const configData = {
        empresa_id: usuarioData.empresa_id,
        habilita_conexao_whatsapp: field === 'habilita_conexao_whatsapp' ? value : conexaoConfig.habilita_conexao_whatsapp
      };

      if (existingConfig) {
        const { error } = await supabase
          .from('conexao_config')
          .update(configData)
          .eq('empresa_id', usuarioData.empresa_id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('conexao_config')
          .insert([configData]);

        if (error) throw error;
      }

      // Disparar evento customizado para notificar o Sidebar imediatamente
      window.dispatchEvent(new CustomEvent('conexaoChanged', {
        detail: { conexaoHabilitada: value }
      }));

      // Se for o campo trabalha_com_pizzas, disparar evento específico
      if (field === 'trabalha_com_pizzas') {
        window.dispatchEvent(new CustomEvent('pizzasChanged', {
          detail: { trabalhaComPizzas: value }
        }));
      }

      // Mostrar mensagem de sucesso
      const status = value ? 'habilitada' : 'desabilitada';
      showMessage('success', `Conexão com WhatsApp ${status} com sucesso!`);

    } catch (error: any) {
      // Reverter o estado local em caso de erro
      setConexaoConfig(prev => ({ ...prev, [field]: !value }));
      console.error('Erro ao salvar configuração de conexão:', error);
      showMessage('error', 'Erro ao salvar configuração: ' + error.message);
    }
    */
  };

  // ✅ NOVA: Função para verificar vendas salvas antes de desabilitar comandas/mesas
  const verificarVendasSalvas = async (tipo: 'comandas' | 'mesas', empresaId: string): Promise<{ temVendas: boolean; vendas: any[] }> => {
    try {
      const campo = tipo === 'comandas' ? 'comanda_numero' : 'mesa_numero';

      const { data: vendas, error } = await supabase
        .from('pdv')
        .select(`id, numero_venda, ${campo}, nome_cliente`)
        .eq('empresa_id', empresaId)
        .eq('status_venda', 'salva')
        .not(campo, 'is', null);

      if (error && error.code !== 'PGRST116') {
        console.error(`Erro ao verificar vendas salvas de ${tipo}:`, error);
        return { temVendas: false, vendas: [] };
      }

      return { temVendas: (vendas?.length || 0) > 0, vendas: vendas || [] };
    } catch (error) {
      console.error(`Erro ao verificar vendas salvas de ${tipo}:`, error);
      return { temVendas: false, vendas: [] };
    }
  };

  const handlePdvConfigChange = async (field: string, value: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obter empresa_id do usuário
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (!usuarioData?.empresa_id) {
        throw new Error('Empresa não encontrada');
      }

      // Validação específica para controle de caixa
      if (field === 'controla_caixa' && value === false) {
        // Verificar se existem caixas abertos
        const { data: caixasAbertos, error: caixaError } = await supabase
          .from('caixa_controle')
          .select('id, usuario_id, data_abertura')
          .eq('empresa_id', usuarioData.empresa_id)
          .eq('status_caixa', true);

        if (caixaError) {
          console.error('Erro ao verificar caixas abertos:', caixaError);
          throw new Error('Erro ao verificar status dos caixas');
        }

        if (caixasAbertos && caixasAbertos.length > 0) {
          const quantidadeCaixas = caixasAbertos.length;
          const mensagem = quantidadeCaixas === 1
            ? 'Existe 1 caixa aberto. É necessário fechar o caixa antes de desabilitar o controle de caixa.'
            : `Existem ${quantidadeCaixas} caixas abertos. É necessário fechar todos os caixas antes de desabilitar o controle de caixa.`;

          showMessage('error', mensagem);
          return; // Não prosseguir com a desabilitação
        }
      }

      // Validação específica para comandas
      if (field === 'comandas' && value === false) {
        // Verificar se existem comandas abertas
        const { data: comandasAbertas, error: comandaError } = await supabase
          .from('pdv')
          .select('id, numero_venda, comanda_numero')
          .eq('empresa_id', usuarioData.empresa_id)
          .in('status_venda', ['salva', 'aberta'])
          .not('comanda_numero', 'is', null);

        if (comandaError) {
          console.error('Erro ao verificar comandas abertas:', comandaError);
          throw new Error('Erro ao verificar status das comandas');
        }

        if (comandasAbertas && comandasAbertas.length > 0) {
          const quantidadeComandas = comandasAbertas.length;
          const numerosComandas = comandasAbertas.map(v => v.comanda_numero).join(', ');
          const mensagem = quantidadeComandas === 1
            ? `Existe 1 comanda aberta (nº ${numerosComandas}). É necessário finalizar a comanda antes de desabilitar esta funcionalidade.`
            : `Existem ${quantidadeComandas} comandas abertas (nº ${numerosComandas}). É necessário finalizar todas as comandas antes de desabilitar esta funcionalidade.`;

          showMessage('error', mensagem);
          return; // Não prosseguir com a desabilitação
        }
      }

      // Validação específica para mesas
      if (field === 'mesas' && value === false) {
        // Verificar se existem mesas abertas
        const { data: mesasAbertas, error: mesaError } = await supabase
          .from('pdv')
          .select('id, numero_venda, mesa_numero')
          .eq('empresa_id', usuarioData.empresa_id)
          .in('status_venda', ['salva', 'aberta'])
          .not('mesa_numero', 'is', null);

        if (mesaError) {
          console.error('Erro ao verificar mesas abertas:', mesaError);
          throw new Error('Erro ao verificar status das mesas');
        }

        if (mesasAbertas && mesasAbertas.length > 0) {
          const quantidadeMesas = mesasAbertas.length;
          const numerosMesas = mesasAbertas.map(v => v.mesa_numero).join(', ');
          const mensagem = quantidadeMesas === 1
            ? `Existe 1 mesa aberta (nº ${numerosMesas}). É necessário finalizar a mesa antes de desabilitar esta funcionalidade.`
            : `Existem ${quantidadeMesas} mesas abertas (nº ${numerosMesas}). É necessário finalizar todas as mesas antes de desabilitar esta funcionalidade.`;

          showMessage('error', mensagem);
          return; // Não prosseguir com a desabilitação
        }
      }

      // ✅ NOVA: Verificar vendas salvas antes de desabilitar comandas ou mesas
      if (!value && (field === 'comandas' || field === 'mesas')) {
        const { temVendas, vendas } = await verificarVendasSalvas(field, usuarioData.empresa_id);

        if (temVendas) {
          const tipo = field === 'comandas' ? 'comandas' : 'mesas';
          const tipoSingular = field === 'comandas' ? 'comanda' : 'mesa';

          // Criar lista das vendas pendentes
          const listaVendas = vendas.map(venda => {
            const numero = field === 'comandas' ? venda.comanda_numero : venda.mesa_numero;
            const cliente = venda.nome_cliente ? ` (${venda.nome_cliente})` : '';
            return `• ${tipoSingular.charAt(0).toUpperCase() + tipoSingular.slice(1)} ${numero} - Venda ${venda.numero_venda}${cliente}`;
          }).join('\n');

          // Mostrar modal de erro
          const mensagem = `❌ Não é possível desabilitar ${tipo} pois existem vendas salvas pendentes:\n\n${listaVendas}\n\nFinalize ou cancele essas vendas antes de desabilitar ${tipo}.`;

          showMessage('error', mensagem);
          return; // Não prosseguir com a desabilitação
        }
      }

      // ✅ NOVO: Validação especial para desabilitar fiado
      if (!value && field === 'fiado') {
        console.log('🔍 Verificando clientes inadimplentes antes de desabilitar fiado...');

        // Verificar se há clientes com saldo devedor > 0
        const { data: clientesInadimplentes, error: clientesError } = await supabase
          .from('clientes')
          .select('id, nome, saldo_devedor')
          .eq('empresa_id', usuarioData.empresa_id)
          .gt('saldo_devedor', 0)
          .eq('deletado', false);

        if (clientesError) {
          console.error('❌ Erro ao verificar clientes inadimplentes:', clientesError);
          showMessage('error', 'Erro ao verificar clientes inadimplentes. Tente novamente.');
          return;
        }

        if (clientesInadimplentes && clientesInadimplentes.length > 0) {
          console.log('⚠️ Clientes inadimplentes encontrados:', clientesInadimplentes);

          // Calcular total em aberto
          const totalEmAberto = clientesInadimplentes.reduce((total, cliente) =>
            total + (parseFloat(cliente.saldo_devedor.toString()) || 0), 0
          );

          // Criar lista dos clientes inadimplentes
          const listaClientes = clientesInadimplentes.map((cliente: any, index: number) =>
            `${index + 1}. ${cliente.nome} - ${formatCurrency(parseFloat(cliente.saldo_devedor.toString()) || 0)}`
          ).join('\n');

          // Mostrar mensagem de erro
          const mensagem = `❌ Não é possível desabilitar o FIADO pois existem clientes inadimplentes:\n\n${listaClientes}\n\nTotal em aberto: ${formatCurrency(totalEmAberto)}\n\nQuite todos os débitos antes de desabilitar esta funcionalidade.`;

          showMessage('error', mensagem);
          return; // Não prosseguir com a desabilitação
        }

        console.log('✅ Nenhum cliente inadimplente encontrado. Fiado pode ser desabilitado.');
      }

      // Atualizar o estado local primeiro
      setPdvConfig(prev => ({ ...prev, [field]: value }));

      // Verificar se já existe uma configuração
      const { data: existingConfig } = await supabase
        .from('pdv_config')
        .select('id')
        .eq('empresa_id', usuarioData.empresa_id)
        .single();

      // Para evitar sobrescrever campos importantes, fazer UPDATE apenas do campo específico
      const updateData: any = {};
      updateData[field] = value;

      if (existingConfig) {
        const { error } = await supabase
          .from('pdv_config')
          .update(updateData)
          .eq('empresa_id', usuarioData.empresa_id);

        if (error) throw error;
      } else {
        // Se não existe configuração, criar com todos os campos necessários
        const configData = {
          empresa_id: usuarioData.empresa_id,
          comandas: field === 'comandas' ? value : false,
          mesas: field === 'mesas' ? value : false,
          vendedor: field === 'vendedor' ? value : false,
          exibe_foto_item: field === 'exibe_foto_item' ? value : false,
          seleciona_clientes: field === 'seleciona_clientes' ? value : false,
          controla_caixa: field === 'controla_caixa' ? value : false,
          agrupa_itens: field === 'agrupa_itens' ? value : false,
          delivery: field === 'delivery' ? value : false,
          cardapio_digital: field === 'cardapio_digital' ? value : false,
          delivery_chat_ia: field === 'delivery_chat_ia' ? value : false,
          baixa_estoque_pdv: field === 'baixa_estoque_pdv' ? value : false,
          venda_codigo_barras: field === 'venda_codigo_barras' ? value : false,
          forca_venda_fiscal_cartao: field === 'forca_venda_fiscal_cartao' ? value : false,
          observacao_no_item: field === 'observacao_no_item' ? value : false,
          desconto_no_item: field === 'desconto_no_item' ? value : false,
          desconto_no_total: field === 'desconto_no_total' ? value : false,
          editar_nome_produto: field === 'editar_nome_produto' ? value : false,
          fiado: field === 'fiado' ? value : false,
          venda_sem_produto: field === 'venda_sem_produto' ? value : false,
          vendas_itens_multiplicacao: field === 'vendas_itens_multiplicacao' ? value : false,
          exibir_dados_fiscais_venda: field === 'exibir_dados_fiscais_venda' ? value : false,
          modo_escuro_cardapio: field === 'modo_escuro_cardapio' ? value : false,
          exibir_fotos_itens_cardapio: field === 'exibir_fotos_itens_cardapio' ? value : false,
          cardapio_abertura_tipo: field === 'cardapio_abertura_tipo' ? value : 'automatico',
          cardapio_loja_aberta: field === 'cardapio_loja_aberta' ? value : true,
          trabalha_com_pizzas: field === 'trabalha_com_pizzas' ? value : false,
          ocultar_grupos_cardapio: field === 'ocultar_grupos_cardapio' ? value : false,
          retirada_balcao_cardapio: field === 'retirada_balcao_cardapio' ? value : false,
          consumo_interno: field === 'consumo_interno' ? value : false,
          ocultar_finalizar_com_impressao: field === 'ocultar_finalizar_com_impressao' ? value : false,
          ocultar_finalizar_sem_impressao: field === 'ocultar_finalizar_sem_impressao' ? value : false,
          ocultar_nfce_com_impressao: field === 'ocultar_nfce_com_impressao' ? value : false,
          ocultar_nfce_sem_impressao: field === 'ocultar_nfce_sem_impressao' ? value : false,
          ocultar_nfce_producao: field === 'ocultar_nfce_producao' ? value : false,
          ocultar_producao: field === 'ocultar_producao' ? value : false,
          mostrar_razao_social_cupom_finalizar: field === 'mostrar_razao_social_cupom_finalizar' ? value : false,
          mostrar_endereco_cupom_finalizar: field === 'mostrar_endereco_cupom_finalizar' ? value : false,
          mostrar_operador_cupom_finalizar: field === 'mostrar_operador_cupom_finalizar' ? value : false,
          tipo_impressao_80mm: field === 'tipo_impressao_80mm' ? value : false,
          tipo_impressao_50mm: field === 'tipo_impressao_50mm' ? value : false
        };

        const { error } = await supabase
          .from('pdv_config')
          .insert([configData]);

        if (error) throw error;
      }

      // Disparar evento customizado para notificar mudanças na configuração do PDV
      const pdvConfigEvent = new CustomEvent('pdvConfigChanged', {
        detail: {
          field,
          value,
          config: updateData
        }
      });
      window.dispatchEvent(pdvConfigEvent);

      // Disparar evento específico para mudanças no status da loja
      if (field === 'cardapio_loja_aberta') {
        const lojaStatusEvent = new CustomEvent('lojaStatusChanged', {
          detail: {
            lojaAberta: value,
            empresaId: usuarioData.empresa_id,
            timestamp: Date.now()
          }
        });
        window.dispatchEvent(lojaStatusEvent);
        console.log('🚀 Evento lojaStatusChanged disparado:', { lojaAberta: value, empresaId: usuarioData.empresa_id });
      }

      // Disparar evento específico para mudanças no cardápio digital
      if (field === 'cardapio_digital') {
        const cardapioDigitalEvent = new CustomEvent('cardapioDigitalChanged', {
          detail: {
            cardapioDigital: value,
            empresaId: usuarioData.empresa_id,
            timestamp: Date.now()
          }
        });
        window.dispatchEvent(cardapioDigitalEvent);
        console.log('📱 Evento cardapioDigitalChanged disparado:', { cardapioDigital: value, empresaId: usuarioData.empresa_id });
      }

      // Mostrar mensagem de sucesso
      const fieldNames: { [key: string]: string } = {
        comandas: 'Comandas',
        mesas: 'Mesas',
        vendedor: 'Vendedor',
        exibe_foto_item: 'Exibe foto no item lançado',
        seleciona_clientes: 'Seleciona clientes',
        controla_caixa: 'Controla caixa',
        agrupa_itens: 'Agrupa itens',
        delivery: 'Delivery Local',
        cardapio_digital: 'Cardápio digital',
        delivery_chat_ia: 'Delivery como chat IA',
        baixa_estoque_pdv: 'Baixa estoque na venda do PDV',
        venda_codigo_barras: 'Venda de produtos por Código de barras',
        forca_venda_fiscal_cartao: 'Força venda fiscal nos cartões',
        observacao_no_item: 'Observação no Item',
        desconto_no_item: 'Desconto no Item',
        editar_nome_produto: 'Editar nome do produto na venda',
        fiado: 'Fiado',
        venda_sem_produto: 'Venda sem produto',
        venda_sem_produto_ncm: 'NCM para Venda sem produto',
        venda_sem_produto_cfop: 'CFOP para Venda sem produto',
        venda_sem_produto_origem: 'Origem para Venda sem produto',
        venda_sem_produto_situacao_tributaria: 'Situação Tributária para Venda sem produto',
        venda_sem_produto_cest: 'CEST para Venda sem produto',
        venda_sem_produto_margem_st: 'Margem ST para Venda sem produto',
        venda_sem_produto_aliquota_icms: 'Alíquota ICMS para Venda sem produto',
        venda_sem_produto_aliquota_pis: 'Alíquota PIS para Venda sem produto',
        venda_sem_produto_aliquota_cofins: 'Alíquota COFINS para Venda sem produto',
        venda_sem_produto_peso_liquido: 'Peso Líquido para Venda sem produto',
        desconto_no_total: 'Desconto no Total da Venda',
        vendas_itens_multiplicacao: 'Vendas de Itens por Multiplicação',
        ocultar_finalizar_com_impressao: 'Ocultar "Finalizar com Impressão"',
        ocultar_finalizar_sem_impressao: 'Ocultar "Finalizar sem Impressão"',
        ocultar_nfce_com_impressao: 'Ocultar "NFC-e com Impressão"',
        ocultar_nfce_sem_impressao: 'Ocultar "NFC-e sem Impressão"',
        ocultar_nfce_producao: 'Ocultar "NFC-e + Produção"',
        ocultar_producao: 'Ocultar "Produção"',
        modo_escuro_cardapio: 'Modo Escuro do Cardápio',
        exibir_fotos_itens_cardapio: 'Exibir Fotos nos Itens Principal',
        trabalha_com_pizzas: 'Trabalha com Pizzas',
        retirada_balcao_cardapio: 'Retirada no Balcão',
        consumo_interno: 'Consumo Interno'
      };

      const fieldName = fieldNames[field] || field;
      const status = value ? 'habilitada' : 'desabilitada';
      showMessage('success', `${fieldName} ${status} com sucesso!`);

    } catch (error: any) {
      // Reverter o estado local em caso de erro
      setPdvConfig(prev => ({ ...prev, [field]: !value }));
      showMessage('Erro ao salvar configuração: ' + error.message, 'error');
    }
  };

  // ✅ NOVA: Função para salvar range de mesas
  const salvarRangeMesas = async (inicio: number, fim: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (!usuarioData) return;

      // Desativar range anterior (se existir)
      await supabase
        .from('mesas')
        .update({ ativo: false })
        .eq('empresa_id', usuarioData.empresa_id);

      // Inserir novo range
      const { error } = await supabase
        .from('mesas')
        .insert({
          empresa_id: usuarioData.empresa_id,
          numero_inicio: inicio,
          numero_fim: fim,
          ativo: true
        });

      if (error) throw error;

      // Atualizar estado local
      setRangeConfig(prev => ({
        ...prev,
        mesas: { inicio, fim, configurado: true }
      }));

      showMessage('success', `Range de mesas configurado: ${inicio} a ${fim}`);
    } catch (error: any) {
      showMessage('error', 'Erro ao salvar range de mesas: ' + error.message);
    }
  };

  // ✅ NOVA: Função para salvar range de comandas
  const salvarRangeComandas = async (inicio: number, fim: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (!usuarioData) return;

      // Desativar range anterior (se existir)
      await supabase
        .from('comandas')
        .update({ ativo: false })
        .eq('empresa_id', usuarioData.empresa_id);

      // Inserir novo range
      const { error } = await supabase
        .from('comandas')
        .insert({
          empresa_id: usuarioData.empresa_id,
          numero_inicio: inicio,
          numero_fim: fim,
          ativo: true
        });

      if (error) throw error;

      // Atualizar estado local
      setRangeConfig(prev => ({
        ...prev,
        comandas: { inicio, fim, configurado: true }
      }));

      showMessage('success', `Range de comandas configurado: ${inicio} a ${fim}`);
    } catch (error: any) {
      showMessage('error', 'Erro ao salvar range de comandas: ' + error.message);
    }
  };

  // ✅ NOVA: Função para carregar ranges existentes
  const carregarRanges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (!usuarioData) return;

      // Carregar range de mesas
      const { data: mesasData } = await supabase
        .from('mesas')
        .select('numero_inicio, numero_fim')
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('ativo', true)
        .single();

      // Carregar range de comandas
      const { data: comandasData } = await supabase
        .from('comandas')
        .select('numero_inicio, numero_fim')
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('ativo', true)
        .single();

      // Atualizar estado local
      setRangeConfig(prev => ({
        mesas: {
          inicio: mesasData?.numero_inicio || 1,
          fim: mesasData?.numero_fim || 50,
          configurado: !!mesasData
        },
        comandas: {
          inicio: comandasData?.numero_inicio || 1,
          fim: comandasData?.numero_fim || 100,
          configurado: !!comandasData
        }
      }));

    } catch (error: any) {
      console.error('Erro ao carregar ranges:', error);
    }
  };

  // ✅ NOVA: Função para lidar com tipos de impressão (apenas um pode estar ativo)
  const handleTipoImpressaoChange = async (tipo: 'tipo_impressao_80mm' | 'tipo_impressao_50mm', value: boolean) => {
    if (!value) return; // Não permitir desativar sem ativar outro

    try {
      // Atualizar o estado local primeiro - apenas um tipo pode estar ativo
      const novoConfig = {
        ...pdvConfig,
        tipo_impressao_80mm: tipo === 'tipo_impressao_80mm' ? true : false,
        tipo_impressao_50mm: tipo === 'tipo_impressao_50mm' ? true : false
      };

      setPdvConfig(novoConfig);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obter empresa_id do usuário
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (!usuarioData?.empresa_id) {
        throw new Error('Empresa não encontrada');
      }

      // Verificar se já existe uma configuração
      const { data: existingConfig } = await supabase
        .from('pdv_config')
        .select('id')
        .eq('empresa_id', usuarioData.empresa_id)
        .single();

      const configData = {
        empresa_id: usuarioData.empresa_id,
        ...novoConfig
      };

      if (existingConfig) {
        const { error } = await supabase
          .from('pdv_config')
          .update({
            tipo_impressao_80mm: novoConfig.tipo_impressao_80mm,
            tipo_impressao_50mm: novoConfig.tipo_impressao_50mm
          })
          .eq('empresa_id', usuarioData.empresa_id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pdv_config')
          .insert([configData]);

        if (error) throw error;
      }

      showMessage('success', `Tipo de impressão ${tipo === 'tipo_impressao_80mm' ? '80mm' : '50mm'} ativado com sucesso!`);

    } catch (error: any) {
      console.error('Erro ao salvar tipo de impressão:', error);
      showMessage('error', 'Erro ao salvar tipo de impressão: ' + error.message);
      // Reverter o estado em caso de erro
      setPdvConfig(prev => ({
        ...prev,
        tipo_impressao_80mm: tipo === 'tipo_impressao_80mm' ? false : prev.tipo_impressao_80mm,
        tipo_impressao_50mm: tipo === 'tipo_impressao_50mm' ? false : prev.tipo_impressao_50mm
      }));
    }
  };

  // Função para salvar o rodapé personalizado
  const handleSalvarRodapePersonalizado = async () => {
    try {
      setIsLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obter empresa_id do usuário
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (!usuarioData?.empresa_id) {
        throw new Error('Empresa não encontrada');
      }

      // Verificar se já existe uma configuração
      const { data: existingConfig } = await supabase
        .from('pdv_config')
        .select('id')
        .eq('empresa_id', usuarioData.empresa_id)
        .single();

      const configData = {
        empresa_id: usuarioData.empresa_id,
        ...pdvConfig,
        rodape_personalizado: rodapePersonalizado
      };

      if (existingConfig) {
        const { error } = await supabase
          .from('pdv_config')
          .update({ rodape_personalizado: rodapePersonalizado })
          .eq('empresa_id', usuarioData.empresa_id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pdv_config')
          .insert([configData]);

        if (error) throw error;
      }

      // Atualizar o estado local
      setPdvConfig(prev => ({ ...prev, rodape_personalizado: rodapePersonalizado }));

      showMessage('success', 'Rodapé personalizado salvo com sucesso!');

    } catch (error: any) {
      console.error('Erro ao salvar rodapé personalizado:', error);
      showMessage('error', 'Erro ao salvar rodapé personalizado: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para salvar a URL personalizada do cardápio
  const handleSalvarCardapioUrl = async () => {
    try {
      setIsLoading(true);

      // Validar se o campo não está vazio
      if (!cardapioUrlPersonalizada.trim()) {
        showMessage('error', 'Digite um nome para a URL do cardápio');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obter empresa_id do usuário
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (!usuarioData?.empresa_id) {
        throw new Error('Empresa não encontrada');
      }

      // Verificar se já existe outra empresa usando essa URL personalizada
      const { data: urlExistente, error: urlError } = await supabase
        .from('pdv_config')
        .select('empresa_id, cardapio_url_personalizada')
        .eq('cardapio_url_personalizada', cardapioUrlPersonalizada.trim())
        .neq('empresa_id', usuarioData.empresa_id); // Excluir a própria empresa

      if (urlError) {
        console.error('Erro ao verificar URL:', urlError);
        throw new Error('Erro ao verificar disponibilidade da URL');
      }

      if (urlExistente && urlExistente.length > 0) {
        showMessage('error', `O nome "${cardapioUrlPersonalizada}" já está sendo usado por outra empresa. Escolha um nome diferente.`);
        return;
      }

      // Verificar se já existe uma configuração para esta empresa
      const { data: existingConfig } = await supabase
        .from('pdv_config')
        .select('id')
        .eq('empresa_id', usuarioData.empresa_id)
        .single();

      const configData = {
        empresa_id: usuarioData.empresa_id,
        ...pdvConfig,
        cardapio_url_personalizada: cardapioUrlPersonalizada.trim()
      };

      if (existingConfig) {
        const { error } = await supabase
          .from('pdv_config')
          .update({ cardapio_url_personalizada: cardapioUrlPersonalizada.trim() })
          .eq('empresa_id', usuarioData.empresa_id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pdv_config')
          .insert([configData]);

        if (error) throw error;
      }

      // Atualizar o estado local
      setPdvConfig(prev => ({ ...prev, cardapio_url_personalizada: cardapioUrlPersonalizada.trim() }));

      // Gerar QR Code com a nova URL
      const url = `https://nexo.emasoftware.app/cardapio/${cardapioUrlPersonalizada.trim()}`;
      await generateQRCode(url);

      showMessage('success', 'URL do cardápio salva com sucesso!');

    } catch (error: any) {
      console.error('Erro ao salvar URL do cardápio:', error);
      showMessage('error', 'Erro ao salvar URL do cardápio: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para upload do logo
  const handleLogoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
      setIsUploadingLogo(true);

      const file = files[0];

      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        showMessage('error', 'Por favor, selecione apenas arquivos de imagem');
        return;
      }

      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showMessage('error', 'A imagem deve ter no máximo 5MB');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Obter empresa_id do usuário
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (usuarioError) throw usuarioError;
      if (!usuarioData?.empresa_id) throw new Error('Empresa não encontrada');

      // Remover logo anterior se existir
      if (logoStoragePath) {
        await supabase.storage
          .from('logo')
          .remove([logoStoragePath]);
      }

      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `empresa_${usuarioData.empresa_id}/${fileName}`;

      // Upload para o storage
      const { error: uploadError } = await supabase.storage
        .from('logo')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('logo')
        .getPublicUrl(filePath);

      // Atualizar configuração no banco
      const { error: updateError } = await supabase
        .from('pdv_config')
        .update({
          logo_url: urlData.publicUrl,
          logo_storage_path: filePath
        })
        .eq('empresa_id', usuarioData.empresa_id);

      if (updateError) throw updateError;

      // Atualizar estados locais
      setLogoUrl(urlData.publicUrl);
      setLogoStoragePath(filePath);

      showMessage('success', 'Logo enviado com sucesso!');

    } catch (error: any) {
      console.error('Erro ao fazer upload do logo:', error);
      showMessage('error', `Erro ao enviar logo: ${error.message}`);
    } finally {
      setIsUploadingLogo(false);
      // Limpar o input de arquivo
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
    }
  };

  // Função para remover o logo
  const handleRemoverLogo = async () => {
    try {
      setIsUploadingLogo(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Obter empresa_id do usuário
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (usuarioError) throw usuarioError;
      if (!usuarioData?.empresa_id) throw new Error('Empresa não encontrada');

      // Remover arquivo do storage se existir
      if (logoStoragePath) {
        await supabase.storage
          .from('logo')
          .remove([logoStoragePath]);
      }

      // Atualizar configuração no banco
      const { error: updateError } = await supabase
        .from('pdv_config')
        .update({
          logo_url: '',
          logo_storage_path: ''
        })
        .eq('empresa_id', usuarioData.empresa_id);

      if (updateError) throw updateError;

      // Atualizar estados locais
      setLogoUrl('');
      setLogoStoragePath('');

      showMessage('success', 'Logo removido com sucesso!');

    } catch (error: any) {
      console.error('Erro ao remover logo:', error);
      showMessage('error', `Erro ao remover logo: ${error.message}`);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Função para aplicar máscara no NCM (0000.00.00)
  const aplicarMascaraNCMVendaSemProduto = (valor: string) => {
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

  // Função para validar NCM para venda sem produto
  const validarNCMVendaSemProduto = async (codigo: string) => {
    if (!codigo || codigo.length !== 8) {
      setVendaSemProdutoNcmValidacao({
        validando: false,
        valido: null,
        descricao: '',
        erro: ''
      });
      return;
    }

    setVendaSemProdutoNcmValidacao(prev => ({ ...prev, validando: true }));

    try {
      // Primeiro, buscar na tabela local
      const { data: ncmLocal, error: errorLocal } = await supabase
        .from('ncm')
        .select('codigo_ncm, descricao_ncm')
        .eq('codigo_ncm', codigo)
        .limit(1);

      if (!errorLocal && ncmLocal && ncmLocal.length > 0) {
        const ncmInfo = ncmLocal[0];
        setVendaSemProdutoNcmValidacao({
          validando: false,
          valido: true,
          descricao: ncmInfo.descricao_ncm || '',
          erro: ''
        });
        return;
      }

      // Se não encontrou na tabela local, buscar na BrasilAPI
      const response = await fetch(`https://brasilapi.com.br/api/ncm/v1/${codigo}`);

      if (response.ok) {
        const data = await response.json();
        setVendaSemProdutoNcmValidacao({
          validando: false,
          valido: true,
          descricao: data.descricao || '',
          erro: ''
        });
      } else {
        setVendaSemProdutoNcmValidacao({
          validando: false,
          valido: false,
          descricao: '',
          erro: 'NCM não encontrado na base de dados'
        });
      }
    } catch (error) {
      setVendaSemProdutoNcmValidacao({
        validando: false,
        valido: false,
        descricao: '',
        erro: 'Erro ao validar NCM. Verifique sua conexão.'
      });
    }
  };

  // Lista de CFOPs disponíveis
  const cfopsDisponiveis = [
    { codigo: '5102', descricao: 'Venda de mercadoria adquirida ou recebida de terceiros' },
    { codigo: '5101', descricao: 'Venda de produção do estabelecimento' },
    { codigo: '5405', descricao: 'Venda de mercadoria adquirida ou recebida de terceiros (ST)' },
    { codigo: '5401', descricao: 'Venda de produção do estabelecimento (ST)' },
    { codigo: '5403', descricao: 'Venda com substituição tributária' },
    { codigo: '5103', descricao: 'Venda de produção do estabelecimento, quando não especificado nos códigos anteriores' },
    { codigo: '5104', descricao: 'Venda de mercadoria adquirida ou recebida de terceiros, quando não especificado nos códigos anteriores' }
  ];

  // Função para filtrar CFOPs baseada na pesquisa
  const filtrarCfopsVendaSemProduto = () => {
    if (!vendaSemProdutoCfopSearchTerm.trim()) {
      return cfopsDisponiveis;
    }

    const termo = vendaSemProdutoCfopSearchTerm.toLowerCase();
    return cfopsDisponiveis.filter(cfop =>
      cfop.codigo.includes(termo) ||
      cfop.descricao.toLowerCase().includes(termo)
    );
  };

  // Função para selecionar um CFOP
  const selecionarCfopVendaSemProduto = (cfop: { codigo: string; descricao: string }) => {
    handlePdvConfigChangeFiscal('venda_sem_produto_cfop', cfop.codigo);
    setVendaSemProdutoCfopDropdownOpen(false);
    setVendaSemProdutoCfopSearchTerm('');

    // ✅ REATIVADO: Atualizar situação tributária automaticamente baseada no CFOP
    atualizarSituacaoTributariaVendaSemProduto(cfop.codigo);
  };

  // Função para detectar se a empresa é Simples Nacional
  const isEmpresaSimplesNacional = () => {
    return empresa?.regime_tributario === 1; // 1 = Simples Nacional
  };

  // Função para atualizar situação tributária baseada no CFOP
  const atualizarSituacaoTributariaVendaSemProduto = (cfop: string) => {
    if (cfop === '5405' || cfop === '5401') {
      // CFOPs de Substituição Tributária
      handlePdvConfigChangeFiscal('venda_sem_produto_situacao_tributaria', 'st'); // ST (CSOSN 500 ou CST 60)
    } else if (cfop === '5102' || cfop === '5101') {
      // CFOPs normais
      handlePdvConfigChangeFiscal('venda_sem_produto_situacao_tributaria', 'tributado_integral'); // Tributado integral (CSOSN 102 ou CST 00)
    } else {
      // Outros CFOPs - manter tributado integral como padrão
      handlePdvConfigChangeFiscal('venda_sem_produto_situacao_tributaria', 'tributado_integral');
    }
  };

  // Função para obter as opções de situação tributária baseada no regime
  const getOpcoesSituacaoTributariaVendaSemProduto = () => {
    const isSimples = isEmpresaSimplesNacional();

    if (isSimples) {
      // Opções CSOSN para Simples Nacional
      return [
        { value: 'tributado_integral', label: '102 - Tributada sem permissão de crédito', codigo: '102' },
        { value: 'st', label: '500 - ICMS por substituição tributária', codigo: '500' },
        { value: 'isenta', label: '300 - Imune', codigo: '300' },
        { value: 'nao_tributada', label: '400 - Não tributada pelo Simples Nacional', codigo: '400' }
      ];
    } else {
      // Opções CST para Regime Normal
      return [
        { value: 'tributado_integral', label: '00 - Tributada integralmente', codigo: '00' },
        { value: 'st', label: '60 - ICMS cobrado por substituição tributária', codigo: '60' },
        { value: 'isenta', label: '40 - Isenta', codigo: '40' },
        { value: 'nao_tributada', label: '41 - Não tributada', codigo: '41' }
      ];
    }
  };

  // Função para verificar se deve mostrar campos ST (CEST e Margem)
  const deveMostrarCamposST = () => {
    return configFiscalLocal.venda_sem_produto_situacao_tributaria === 'st';
  };

  // Função para validar campos obrigatórios ST
  const validarCamposST = () => {
    const erros = { cest: '', margem_st: '' };
    let temErros = false;

    if (deveMostrarCamposST()) {
      // Validar CEST
      const cest = configFiscalLocal.venda_sem_produto_cest?.trim();
      if (!cest || cest.length < 7) {
        erros.cest = 'CEST é obrigatório para ST (7 dígitos)';
        temErros = true;
      }

      // Validar Margem ST
      const margemST = configFiscalLocal.venda_sem_produto_margem_st;
      if (!margemST || margemST <= 0) {
        erros.margem_st = 'Margem ST é obrigatória e deve ser maior que 0';
        temErros = true;
      }
    }

    setErrosValidacaoST(erros);
    return !temErros;
  };

  // Função para detectar alterações nos campos fiscais (apenas local, não salva)
  const handlePdvConfigChangeFiscal = (field: string, value: any) => {
    // Lista de campos fiscais
    const camposFiscais = [
      'venda_sem_produto_ncm',
      'venda_sem_produto_cfop',
      'venda_sem_produto_origem',
      'venda_sem_produto_situacao_tributaria',
      'venda_sem_produto_cest',
      'venda_sem_produto_margem_st',
      'venda_sem_produto_aliquota_icms',
      'venda_sem_produto_aliquota_pis',
      'venda_sem_produto_aliquota_cofins',
      'venda_sem_produto_peso_liquido',
      'venda_sem_produto_cst',
      'venda_sem_produto_csosn'
    ];

    // Se for um campo fiscal, atualizar apenas o estado local
    if (camposFiscais.includes(field)) {
      // ✅ NOVO: Se for mudança na situação tributária, preencher automaticamente CST/CSOSN
      if (field === 'venda_sem_produto_situacao_tributaria') {
        const isSimples = isEmpresaSimplesNacional();
        const opcoes = getOpcoesSituacaoTributariaVendaSemProduto();
        const opcaoSelecionada = opcoes.find(opcao => opcao.value === value);

        if (opcaoSelecionada) {
          if (isSimples) {
            // Para Simples Nacional - preencher CSOSN automaticamente
            setConfigFiscalLocal(prev => ({
              ...prev,
              [field]: value,
              venda_sem_produto_csosn: opcaoSelecionada.codigo,
              venda_sem_produto_cst: '' // Limpar CST
            }));
          } else {
            // Para Regime Normal - preencher CST automaticamente
            setConfigFiscalLocal(prev => ({
              ...prev,
              [field]: value,
              venda_sem_produto_cst: opcaoSelecionada.codigo,
              venda_sem_produto_csosn: '' // Limpar CSOSN
            }));
          }
        } else {
          // Fallback se não encontrar a opção
          setConfigFiscalLocal(prev => ({
            ...prev,
            [field]: value
          }));
        }
      } else {
        // Para outros campos, comportamento normal
        setConfigFiscalLocal(prev => ({
          ...prev,
          [field]: value
        }));
      }

      setConfigFiscalAlterada(true);

      // Validar campos ST em tempo real se for alteração relevante
      if (field === 'venda_sem_produto_situacao_tributaria' ||
          field === 'venda_sem_produto_cest' ||
          field === 'venda_sem_produto_margem_st') {
        // Usar setTimeout para validar após o estado ser atualizado
        setTimeout(() => {
          validarCamposST();
        }, 0);
      }
    } else {
      // Se não for campo fiscal, usar a função normal
      handlePdvConfigChange(field, value);
    }
  };

  // Função para salvar configurações fiscais
  const salvarConfigFiscal = async () => {
    try {
      // Validar campos obrigatórios antes de salvar
      if (!validarCamposST()) {
        showMessage('error', 'Preencha todos os campos obrigatórios para Substituição Tributária');
        return;
      }

      setSalvandoConfigFiscal(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obter empresa_id do usuário
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (!usuarioData?.empresa_id) {
        throw new Error('Empresa não encontrada');
      }

      // Verificar se já existe uma configuração
      const { data: existingConfig } = await supabase
        .from('pdv_config')
        .select('id')
        .eq('empresa_id', usuarioData.empresa_id)
        .single();

      // Usar dados do estado local (não salvos ainda)
      const configFiscalData = {
        venda_sem_produto_ncm: configFiscalLocal.venda_sem_produto_ncm,
        venda_sem_produto_cfop: configFiscalLocal.venda_sem_produto_cfop,
        venda_sem_produto_origem: configFiscalLocal.venda_sem_produto_origem,
        venda_sem_produto_situacao_tributaria: configFiscalLocal.venda_sem_produto_situacao_tributaria,
        venda_sem_produto_cest: configFiscalLocal.venda_sem_produto_cest,
        venda_sem_produto_margem_st: configFiscalLocal.venda_sem_produto_margem_st,
        venda_sem_produto_aliquota_icms: configFiscalLocal.venda_sem_produto_aliquota_icms,
        venda_sem_produto_aliquota_pis: configFiscalLocal.venda_sem_produto_aliquota_pis,
        venda_sem_produto_aliquota_cofins: configFiscalLocal.venda_sem_produto_aliquota_cofins,
        venda_sem_produto_peso_liquido: configFiscalLocal.venda_sem_produto_peso_liquido,
        venda_sem_produto_cst: configFiscalLocal.venda_sem_produto_cst,
        venda_sem_produto_csosn: configFiscalLocal.venda_sem_produto_csosn
      };

      if (existingConfig) {
        const { error } = await supabase
          .from('pdv_config')
          .update(configFiscalData)
          .eq('empresa_id', usuarioData.empresa_id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pdv_config')
          .insert([{
            empresa_id: usuarioData.empresa_id,
            ...pdvConfig,
            ...configFiscalData
          }]);

        if (error) throw error;
      }

      // Sincronizar estado principal com dados salvos
      setPdvConfig(prev => ({
        ...prev,
        ...configFiscalData
      }));

      setConfigFiscalAlterada(false);
      showMessage('success', 'Configurações fiscais salvas com sucesso!');

    } catch (error) {
      console.error('Erro ao salvar configurações fiscais:', error);
      showMessage('error', 'Erro ao salvar configurações fiscais');
    } finally {
      setSalvandoConfigFiscal(false);
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'pagamentos':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Formas de Pagamento</h2>
              <Button
                type="button"
                variant="primary"
                onClick={() => setShowSidebar(true)}
              >
                + Adicionar Forma de Pagamento
              </Button>
            </div>

            <div className="space-y-4">
              {formasPagamento.map(forma => (
                <div
                  key={forma.id}
                  className="bg-background-card p-4 rounded-lg border border-gray-800"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="text-primary-400" size={20} />
                      <h3 className="text-white font-medium">{forma.tipo}</h3>
                    </div>
                    <button
                      onClick={() => handleDelete(forma.id, 'pagamento', forma.tipo)}
                      className="p-2 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {formasPagamento.length === 0 && (
                <div className="text-center py-8 bg-background-card rounded-lg border border-gray-800">
                  <p className="text-gray-400">Nenhuma forma de pagamento cadastrada</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'usuarios':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white">Usuários</h2>
                {usuarioLogado?.tipo === 'admin' && (
                  <p className="text-gray-400 text-sm mt-1">Listando todos os usuários da empresa</p>
                )}
              </div>
              {/* Mostrar o botão apenas se o usuário for admin */}
              {usuarioLogado?.tipo === 'admin' && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setShowSidebar(true)}
                >
                  + Adicionar Usuário
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {usuarios.length > 0 ? (
                usuarios.map(usuario => (
                  <div
                    key={usuario.id}
                    className="bg-background-card p-4 rounded-lg border border-gray-800"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-medium">{usuario.nome}</h3>
                          {usuario.tipo !== 'admin' && (
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              usuario.status ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {usuario.status ? 'Ativo' : 'Bloqueado'}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm">{usuario.email}</p>
                        {/* ✅ NOVO: Exibir série da NFC-e */}
                        <p className="text-blue-400 text-sm">
                          <span className="font-medium">Série NFC-e:</span> #{usuario.serie_nfce || 1}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {Array.isArray(usuario.tipo_user_config_id) && usuario.tipo_user_config_id.length > 0 ? (
                            usuario.tipo_user_config_id.map((tipoId: string) => {
                              const tipo = tiposUsuario.find(t => t.id === tipoId);
                              return tipo ? (
                                <span key={tipoId} className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
                                  {tipo.tipo.charAt(0).toUpperCase() + tipo.tipo.slice(1)}
                                </span>
                              ) : null;
                            })
                          ) : usuario.tipo_user_config ? (
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
                              {usuario.tipo_user_config.tipo.charAt(0).toUpperCase() + usuario.tipo_user_config.tipo.slice(1)}
                            </span>
                          ) : null}
                          {usuario.perfil && (
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-primary-500/10 text-primary-400">
                              {usuario.perfil.nome}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Botão de edição - visível para admin (todos os usuários) ou para o próprio usuário */}
                        {(usuarioLogado?.tipo === 'admin' || usuarioLogado?.id === usuario.id) && (
                          <button
                            onClick={() => handleEditUsuario(usuario)}
                            className="p-2 text-gray-400 hover:text-white transition-colors"
                            title="Editar usuário"
                          >
                            <Pencil size={16} />
                          </button>
                        )}

                        {/* Botão de bloquear/desbloquear - visível apenas para admin e apenas para usuários não-admin */}
                        {usuarioLogado?.tipo === 'admin' && !Array.isArray(usuario.tipo_user_config_id) ? false : !usuario.tipo_user_config_id?.some((tipoId: string) => {
                          const tipo = tiposUsuario.find(t => t.id === tipoId);
                          return tipo?.tipo === 'admin';
                        }) && usuarioLogado?.tipo === 'admin' && (
                          <button
                            onClick={() => handleToggleUserStatus(usuario.id, usuario.nome, usuario.status)}
                            className={`p-2 ${usuario.status ? 'text-green-400 hover:text-green-300' : 'text-red-400 hover:text-red-300'} transition-colors`}
                            title={usuario.status ? 'Bloquear usuário' : 'Desbloquear usuário'}
                          >
                            {usuario.status ? <Lock size={16} /> : <Unlock size={16} />}
                          </button>
                        )}

                        {/* Botão de exclusão - visível apenas para admin */}
                        {usuarioLogado?.tipo === 'admin' && (
                          <button
                            onClick={() => handleDelete(usuario.id, 'usuario', usuario.nome)}
                            className="p-2 text-red-400 hover:text-red-300 transition-colors"
                            title="Excluir usuário"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 bg-background-card rounded-lg border border-gray-800">
                  <p className="text-gray-400">Nenhum usuário encontrado</p>
                  {usuarioLogado?.tipo === 'admin' && (
                    <p className="text-gray-500 text-sm mt-2">Clique em "Adicionar Usuário" para cadastrar um novo usuário</p>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 'perfis':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Perfis de Acesso</h2>
              <Button
                type="button"
                variant="primary"
                onClick={() => setShowSidebar(true)}
              >
                + Adicionar Perfil
              </Button>
            </div>

            <div className="space-y-4">
              {perfis.map(perfil => (
                <div
                  key={perfil.id}
                  className="bg-background-card p-4 rounded-lg border border-gray-800"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">{perfil.nome}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {}}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(perfil.id, 'perfil', perfil.nome)}
                        className="p-2 text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'status':
        return (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Status da Loja</h2>
            </div>

            <div className="bg-background-card p-6 rounded-lg border border-gray-800">
              <h3 className="text-lg font-medium text-white mb-4">Modo de Operação</h3>

              <div className="space-y-4">
                <label className="flex items-center p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                  <input
                    type="radio"
                    name="operation_mode"
                    checked={storeStatus.modo_operacao === 'manual'}
                    onChange={() => handleOperationModeChange('manual')}
                    className="mr-3"
                  />
                  <div>
                    <h4 className="text-white font-medium">Manual</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      Você controla manualmente quando a loja está aberta ou fechada.
                    </p>
                  </div>
                </label>

                <label className="flex items-center p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                  <input
                    type="radio"
                    name="operation_mode"
                    checked={storeStatus.modo_operacao === 'automatico'}
                    onChange={() => handleOperationModeChange('automatico')}
                    className="mr-3"
                  />
                  <div>
                    <h4 className="text-white font-medium">Automático</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      A loja abre e fecha automaticamente de acordo com os horários de funcionamento configurados.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        );

      case 'taxa':
        return (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Taxa de Entrega</h2>
            </div>

            <div className="bg-background-card p-6 rounded-lg border border-gray-800">
              <h3 className="text-lg font-medium text-white mb-4">Modo de Cálculo</h3>

              <div className="space-y-4">
                <label className="flex items-center p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                  <input
                    type="radio"
                    name="taxa_mode"
                    checked={taxaMode === 'distancia'}
                    onChange={() => handleTaxaModeChange('distancia')}
                    className="mr-3"
                  />
                  <div>
                    <h4 className="text-white font-medium">Por Distância (KM)</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      Calcular a taxa de entrega com base na distância em quilômetros.
                    </p>
                  </div>
                </label>

                <label className="flex items-center p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                  <input
                    type="radio"
                    name="taxa_mode"
                    checked={taxaMode === 'bairro'}
                    onChange={() => handleTaxaModeChange('bairro')}
                    className="mr-3"
                  />
                  <div>
                    <h4 className="text-white font-medium">Por Bairro</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      Definir taxas fixas para cada bairro de entrega.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        );

      case 'horarios':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white">Horários de Atendimento</h2>
                <p className="text-gray-400 mt-1">Defina os horários de funcionamento para cada dia da semana</p>
              </div>
              <Button
                type="button"
                variant="primary"
                onClick={() => setShowSidebar(true)}
              >
                + Adicionar Horário
              </Button>
            </div>

            {horarios.length === 0 ? (
              <div className="bg-background-card p-6 rounded-lg border border-gray-800 text-center">
                <p className="text-gray-400">Nenhum horário de atendimento cadastrado.</p>
                <p className="text-gray-500 text-sm mt-2">Adicione horários para cada dia da semana em que sua loja estará aberta.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {horarios.map(horario => {
                  const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
                  const diaNome = diasSemana[horario.dia_semana];
                  const horaAbertura = horario.hora_abertura.substring(0, 5);
                  const horaFechamento = horario.hora_fechamento.substring(0, 5);

                  // Verificar se é o dia de hoje
                  const hoje = new Date().getDay();
                  const isHoje = horario.dia_semana === hoje;

                  return (
                    <div
                      key={horario.id}
                      className="bg-background-card p-4 rounded-lg border border-gray-800"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-white font-medium">{diaNome}</h3>
                            {isHoje && (
                              <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full border border-green-500/30 font-medium">
                                Hoje
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 mt-1">
                            {horaAbertura} às {horaFechamento}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {isHoje && (
                            <span className="text-green-400 mr-1" title="Dia atual">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                              </svg>
                            </span>
                          )}
                          <button
                            onClick={() => handleEditHorario(horario)}
                            className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                            title="Editar horário"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(horario.id, 'horario', diaNome)}
                            className="p-2 text-red-400 hover:text-red-300 transition-colors"
                            title="Remover horário"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {storeStatus.modo_operacao === 'automatico' && (
              <div className="bg-yellow-900/20 border border-yellow-900/30 rounded-lg p-4 mt-6">
                <p className="text-yellow-400 text-sm">
                  <strong>Nota:</strong> Sua loja está configurada para abrir e fechar automaticamente de acordo com estes horários.
                  Você pode alterar este comportamento na seção "Status Loja".
                </p>
              </div>
            )}
          </div>
        );

      case 'geral':
        return (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Dados da Empresa</h2>
              {/* Mostrar o botão apenas se o usuário for admin */}
              {usuarioLogado?.tipo === 'admin' && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    const empresaData = empresa || {
                      segmento: '',
                      tipo_documento: 'CNPJ',
                      documento: '',
                      razao_social: '',
                      nome_fantasia: '',
                      nome_proprietario: '',
                      whatsapp: '',
                      telefones: [],
                      cep: '',
                      endereco: '',
                      numero: '',
                      complemento: '',
                      bairro: '',
                      cidade: '',
                      estado: '',
                      inscricao_estadual: '',
                      regime_tributario: 4, // Padrão MEI
                      codigo_municipio: '',
                      email: ''
                    };

                    // Garantir que telefones seja um array
                    const telefones = Array.isArray(empresaData.telefones) ? empresaData.telefones : [];
                    setEmpresaForm({
                      ...empresaData,
                      telefones: telefones
                    });
                    setShowSidebar(true);
                  }}
                >
                  Editar Dados
                </Button>
              )}
            </div>

            {empresa && (
              <div className="bg-background-card p-6 rounded-lg border border-gray-800">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">Dados Gerais</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          ID da Empresa
                        </label>
                        <div className="flex items-center">
                          <p className="text-white">{empresa.id}</p>
                          <button
                            onClick={() => handleCopyToClipboard(empresa.id, 'empresa_id')}
                            className="ml-2 p-1 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white"
                            title="Copiar ID da empresa"
                          >
                            {copiedFields['empresa_id'] ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Segmento
                        </label>
                        <p className="text-white">{empresa.segmento || '-'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">
                            {empresa.tipo_documento}
                          </label>
                          <p className="text-white">{empresa.documento || '-'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">
                            Inscrição Estadual
                          </label>
                          <p className="text-white">{empresa.inscricao_estadual || '-'}</p>
                        </div>
                      </div>
                      {empresa.tipo_documento === 'CNPJ' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">
                            Razão Social
                          </label>
                          <p className="text-white">{empresa.razao_social || '-'}</p>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Nome Fantasia
                        </label>
                        <p className="text-white">{empresa.nome_fantasia || '-'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Nome do Proprietário
                        </label>
                        <p className="text-white">{empresa.nome_proprietario || '-'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          WhatsApp
                        </label>
                        <p className="text-white">{empresa.whatsapp || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">Endereço</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          CEP
                        </label>
                        <p className="text-white">{empresa.cep || '-'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Endereço
                        </label>
                        <p className="text-white">
                          {empresa.endereco}
                          {empresa.numero && `, ${empresa.numero}`}
                          {empresa.complemento && ` - ${empresa.complemento}`}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Bairro
                        </label>
                        <p className="text-white">{empresa.bairro || '-'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Cidade/Estado
                        </label>
                        <p className="text-white">
                          {empresa.cidade}
                          {empresa.estado && `/${empresa.estado}`}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Código do Município (IBGE)
                        </label>
                        <p className="text-white">{empresa.codigo_municipio || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">Dados Fiscais</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Email da Empresa
                        </label>
                        <p className="text-white">{empresa.email || '-'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Regime Tributário
                        </label>
                        <p className="text-white">
                          {empresa.regime_tributario === 1 && '1 - Simples Nacional'}
                          {empresa.regime_tributario === 2 && '2 - Simples Nacional - Excesso'}
                          {empresa.regime_tributario === 3 && '3 - Regime Normal'}
                          {empresa.regime_tributario === 4 && '4 - MEI - Microempreendedor Individual'}
                          {!empresa.regime_tributario && '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'estoque':
        return (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Configurações de Estoque</h2>
            </div>

            <div className="bg-background-card p-6 rounded-lg border border-gray-800">
              <h3 className="text-lg font-medium text-white mb-4">Tipo de Controle de Estoque</h3>

              <div className="space-y-4">
                <label className="flex items-center p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                  <input
                    type="radio"
                    name="tipo_controle_estoque"
                    checked={tipoControleEstoque === 'pedidos'}
                    onChange={() => handleTipoControleEstoqueChange('pedidos')}
                    className="mr-3"
                  />
                  <div>
                    <h4 className="text-white font-medium">Controle por Pedidos</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      O estoque é atualizado quando um pedido é criado, permitindo reservar produtos antes do faturamento.
                    </p>
                  </div>
                </label>

                <label className="flex items-center p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                  <input
                    type="radio"
                    name="tipo_controle_estoque"
                    checked={tipoControleEstoque === 'pdv'}
                    onChange={() => handleTipoControleEstoqueChange('pdv')}
                    className="mr-3"
                  />
                  <div>
                    <h4 className="text-white font-medium">Controle de baixa por venda no PDV</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      O estoque é atualizado automaticamente quando uma venda é finalizada no PDV, ideal para controle em tempo real.
                    </p>
                  </div>
                </label>

                {/* <label className="flex items-center p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                  <input
                    type="radio"
                    name="tipo_controle_estoque"
                    checked={tipoControleEstoque === 'faturamento'}
                    onChange={() => handleTipoControleEstoqueChange('faturamento')}
                    className="mr-3"
                  />
                  <div>
                    <h4 className="text-white font-medium">Controle por Faturamento</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      O estoque é atualizado apenas quando um pedido é faturado, mantendo o estoque disponível até a confirmação final.
                    </p>
                  </div>
                </label> */}
              </div>

              <div className="mt-6 border-t border-gray-800 pt-6">
                <h3 className="text-lg font-medium text-white mb-4">Controle de Estoque</h3>

                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <div className="flex items-center">
                    <input
                      id="bloqueia_sem_estoque"
                      type="checkbox"
                      checked={bloqueiaSemEstoque}
                      onChange={(e) => handleBloqueiaSemEstoqueChange(e.target.checked)}
                      className="w-5 h-5 text-primary-500 border-gray-600 rounded focus:ring-primary-500 focus:ring-opacity-25 bg-gray-700"
                    />
                    <label htmlFor="bloqueia_sem_estoque" className="ml-3 cursor-pointer">
                      <h4 className="text-white font-medium">Bloquear pedidos sem estoque suficiente</h4>
                      <p className="text-sm text-gray-400 mt-1">
                        Quando ativado, não permite que sejam feitos pedidos de produtos sem estoque suficiente disponível.
                      </p>
                    </label>
                  </div>
                  <div className="mt-3 text-xs text-gray-400 flex items-center">
                    <span className="inline-block w-3 h-3 rounded-full bg-gray-600 mr-2"></span>
                    <span>Status atual: {bloqueiaSemEstoque ? 'Ativado' : 'Desativado'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800/30 rounded-lg">
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 mr-3 mt-0.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 16v-4"></path>
                    <path d="M12 8h.01"></path>
                  </svg>
                  <div>
                    <h4 className="text-blue-300 font-medium">Informação</h4>
                    <p className="text-sm text-blue-200/70 mt-1">
                      Esta configuração afeta como o estoque é gerenciado em todo o sistema. "Controle por Pedidos" reserva estoque ao criar pedidos,
                      "Controle de baixa por venda no PDV" atualiza estoque automaticamente nas vendas do PDV em tempo real.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'pedidos':
        return (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Configurações de Pedidos</h2>
            </div>

            <div className="bg-background-card p-6 rounded-lg border border-gray-800">
              <h3 className="text-lg font-medium text-white mb-4">Opções de Pedidos</h3>

              <div className="p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center">
                  <input
                    id="agrupar_itens"
                    type="checkbox"
                    checked={agruparItens}
                    onChange={(e) => handleAgruparItensChange(e.target.checked)}
                    className="w-5 h-5 text-primary-500 border-gray-600 rounded focus:ring-primary-500 focus:ring-opacity-25 bg-gray-700"
                  />
                  <label htmlFor="agrupar_itens" className="ml-3 cursor-pointer">
                    <h4 className="text-white font-medium">Agrupar itens</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      Quando ativado, ao adicionar um produto que já existe no pedido, a quantidade será somada ao item existente em vez de criar um novo item.
                    </p>
                  </label>
                </div>
                <div className="mt-3 text-xs text-gray-400 flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full bg-gray-600 mr-2"></span>
                  <span>Status atual: {agruparItens ? 'Ativado' : 'Desativado'}</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800/30 rounded-lg">
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 mr-3 mt-0.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 16v-4"></path>
                    <path d="M12 8h.01"></path>
                  </svg>
                  <div>
                    <h4 className="text-blue-300 font-medium">Informação</h4>
                    <p className="text-sm text-blue-200/70 mt-1">
                      Esta configuração afeta como os itens são adicionados aos pedidos. Quando ativada, produtos idênticos serão agrupados automaticamente,
                      facilitando a visualização e o gerenciamento dos pedidos. Esta opção se aplica tanto à versão web quanto à versão mobile.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'produtos':
        return (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Configurações de Produtos</h2>
            </div>

            <div className="bg-background-card p-6 rounded-lg border border-gray-800">
              <h3 className="text-lg font-medium text-white mb-4">Opções de Produtos</h3>

              <div className="p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center">
                  <input
                    id="opcoes_adicionais"
                    type="checkbox"
                    checked={opcoesAdicionais}
                    onChange={(e) => handleOpcoesAdicionaisChange(e.target.checked)}
                    className="w-5 h-5 text-primary-500 border-gray-600 rounded focus:ring-primary-500 focus:ring-opacity-25 bg-gray-700"
                  />
                  <label htmlFor="opcoes_adicionais" className="ml-3 cursor-pointer">
                    <h4 className="text-white font-medium">Opções Adicionais</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      Quando ativado, permite adicionar opções adicionais aos produtos durante a criação de pedidos, como ingredientes extras, tamanhos, sabores, etc.
                    </p>
                  </label>
                </div>
                <div className="mt-3 text-xs text-gray-400 flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full bg-gray-600 mr-2"></span>
                  <span>Status atual: {opcoesAdicionais ? 'Ativado' : 'Desativado'}</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800/30 rounded-lg">
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 mr-3 mt-0.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 16v-4"></path>
                    <path d="M12 8h.01"></path>
                  </svg>
                  <div>
                    <h4 className="text-blue-300 font-medium">Informação</h4>
                    <p className="text-sm text-blue-200/70 mt-1">
                      Esta configuração permite que os produtos tenham opções adicionais configuráveis. Quando ativada, durante a criação de pedidos,
                      será possível selecionar opções extras para cada produto, como ingredientes adicionais, tamanhos diferentes, sabores, etc.
                      As opções adicionais devem ser configuradas na página "Adicionais" do menu principal.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'pdv':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white">Configurações do PDV</h2>
                <p className="text-gray-400 mt-1">Configure as funcionalidades do Ponto de Venda</p>
              </div>
            </div>

            {/* Navegação das Abas */}
            <div className="bg-background-card rounded-lg border border-gray-800">
              <div className="border-b border-gray-800">
                <nav className="flex space-x-8 px-6 py-4">
                  <button
                    onClick={() => setPdvActiveTab('geral')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      pdvActiveTab === 'geral'
                        ? 'border-primary-500 text-primary-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                    }`}
                  >
                    Geral
                  </button>
                  <button
                    onClick={() => setPdvActiveTab('botoes')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      pdvActiveTab === 'botoes'
                        ? 'border-primary-500 text-primary-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                    }`}
                  >
                    Botões de Finalização
                  </button>
                  <button
                    onClick={() => setPdvActiveTab('impressoes')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      pdvActiveTab === 'impressoes'
                        ? 'border-primary-500 text-primary-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                    }`}
                  >
                    Impressões
                  </button>
                  <button
                    onClick={() => setPdvActiveTab('venda-sem-produto')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      pdvActiveTab === 'venda-sem-produto'
                        ? 'border-primary-500 text-primary-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                    }`}
                  >
                    Venda sem Produto
                  </button>
                  <button
                    onClick={() => setPdvActiveTab('formas-pagamento')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      pdvActiveTab === 'formas-pagamento'
                        ? 'border-primary-500 text-primary-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                    }`}
                  >
                    Formas de Pagamentos
                  </button>
                  <button
                    onClick={() => setPdvActiveTab('tipos-pagamentos')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      pdvActiveTab === 'tipos-pagamentos'
                        ? 'border-primary-500 text-primary-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                    }`}
                  >
                    Tipos de Pagamentos
                  </button>
                  {/* Aba Cardápio Digital - só aparece quando a opção estiver ativa */}
                  {pdvConfig.cardapio_digital && (
                    <button
                      onClick={() => setPdvActiveTab('cardapio-digital')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                        pdvActiveTab === 'cardapio-digital'
                          ? 'border-primary-500 text-primary-400'
                          : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                      }`}
                    >
                      Cardápio Digital
                    </button>
                  )}
                </nav>
              </div>

              {/* Conteúdo das Abas */}
              <div className="p-6">
                {pdvActiveTab === 'geral' && (
                  <div className="space-y-6">
                    {/* Comandas e Mesas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                        <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                          <input
                            type="checkbox"
                            checked={pdvConfig.comandas}
                            onChange={(e) => handlePdvConfigChange('comandas', e.target.checked)}
                            className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                            style={{ borderRadius: '50%' }}
                          />
                          <div className="flex-1">
                            <h4 className="text-white font-medium">Comandas</h4>
                            <p className="text-sm text-gray-400 mt-1">
                              Permite controlar vendas por comandas numeradas para organização de pedidos.
                            </p>

                            {/* Campos de range quando comandas estiver habilitada */}
                            {pdvConfig.comandas && (
                              <div className="mt-4 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                                <h5 className="text-sm font-medium text-white mb-3">📋 Configurar Range de Comandas</h5>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs text-gray-400 mb-1">Número Inicial</label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={rangeConfig.comandas.inicio}
                                      onChange={(e) => setRangeConfig(prev => ({
                                        ...prev,
                                        comandas: { ...prev.comandas, inicio: parseInt(e.target.value) || 1 }
                                      }))}
                                      className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-primary-500"
                                      placeholder="1"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-400 mb-1">Número Final</label>
                                    <input
                                      type="number"
                                      min={rangeConfig.comandas.inicio}
                                      value={rangeConfig.comandas.fim}
                                      onChange={(e) => setRangeConfig(prev => ({
                                        ...prev,
                                        comandas: { ...prev.comandas, fim: parseInt(e.target.value) || 100 }
                                      }))}
                                      className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-primary-500"
                                      placeholder="100"
                                    />
                                  </div>
                                </div>
                                <button
                                  onClick={() => salvarRangeComandas(rangeConfig.comandas.inicio, rangeConfig.comandas.fim)}
                                  className="mt-3 px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white text-xs rounded transition-colors"
                                >
                                  {rangeConfig.comandas.configurado ? 'Atualizar Range' : 'Salvar Range'}
                                </button>
                                {rangeConfig.comandas.configurado && (
                                  <p className="text-xs text-green-400 mt-2">
                                    ✅ Range configurado: {rangeConfig.comandas.inicio} a {rangeConfig.comandas.fim}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </label>
                      </div>

                      <div className="relative">
                        <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                          <input
                            type="checkbox"
                            checked={pdvConfig.mesas}
                            onChange={(e) => handlePdvConfigChange('mesas', e.target.checked)}
                            className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                            style={{ borderRadius: '50%' }}
                          />
                          <div className="flex-1">
                            <h4 className="text-white font-medium">Mesas</h4>
                            <p className="text-sm text-gray-400 mt-1">
                              Habilita o controle de mesas para restaurantes e estabelecimentos com atendimento no local.
                            </p>

                            {/* Campos de range quando mesas estiver habilitada */}
                            {pdvConfig.mesas && (
                              <div className="mt-4 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                                <h5 className="text-sm font-medium text-white mb-3">🏢 Configurar Range de Mesas</h5>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs text-gray-400 mb-1">Número Inicial</label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={rangeConfig.mesas.inicio}
                                      onChange={(e) => setRangeConfig(prev => ({
                                        ...prev,
                                        mesas: { ...prev.mesas, inicio: parseInt(e.target.value) || 1 }
                                      }))}
                                      className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-primary-500"
                                      placeholder="1"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-400 mb-1">Número Final</label>
                                    <input
                                      type="number"
                                      min={rangeConfig.mesas.inicio}
                                      value={rangeConfig.mesas.fim}
                                      onChange={(e) => setRangeConfig(prev => ({
                                        ...prev,
                                        mesas: { ...prev.mesas, fim: parseInt(e.target.value) || 50 }
                                      }))}
                                      className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-primary-500"
                                      placeholder="50"
                                    />
                                  </div>
                                </div>
                                <button
                                  onClick={() => salvarRangeMesas(rangeConfig.mesas.inicio, rangeConfig.mesas.fim)}
                                  className="mt-3 px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white text-xs rounded transition-colors"
                                >
                                  {rangeConfig.mesas.configurado ? 'Atualizar Range' : 'Salvar Range'}
                                </button>
                                {rangeConfig.mesas.configurado && (
                                  <p className="text-xs text-green-400 mt-2">
                                    ✅ Range configurado: {rangeConfig.mesas.inicio} a {rangeConfig.mesas.fim}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Outras configurações */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                        <input
                          type="checkbox"
                          checked={pdvConfig.vendedor}
                          onChange={(e) => handlePdvConfigChange('vendedor', e.target.checked)}
                          className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                          style={{ borderRadius: '50%' }}
                        />
                        <div>
                          <h4 className="text-white font-medium">Vendedor</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Permite associar vendedores às vendas para controle de comissões e relatórios.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                        <input
                          type="checkbox"
                          checked={pdvConfig.exibe_foto_item}
                          onChange={(e) => handlePdvConfigChange('exibe_foto_item', e.target.checked)}
                          className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                          style={{ borderRadius: '50%' }}
                        />
                        <div>
                          <h4 className="text-white font-medium">Exibe foto no item lançado</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Mostra a foto do produto no carrinho para facilitar a identificação visual.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                        <input
                          type="checkbox"
                          checked={pdvConfig.seleciona_clientes}
                          onChange={(e) => handlePdvConfigChange('seleciona_clientes', e.target.checked)}
                          className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                          style={{ borderRadius: '50%' }}
                        />
                        <div>
                          <h4 className="text-white font-medium">Seleciona clientes</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Permite vincular clientes às vendas para histórico e fidelização.
                          </p>
                        </div>
                      </label>

                      <div className="relative">
                        <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                          <input
                            type="checkbox"
                            checked={pdvConfig.controla_caixa}
                            onChange={(e) => handlePdvConfigChange('controla_caixa', e.target.checked)}
                            className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                            style={{ borderRadius: '50%' }}
                          />
                          <div>
                            <h4 className="text-white font-medium">Controla Caixa</h4>
                            <p className="text-sm text-gray-400 mt-1">
                              Habilita controle de abertura e fechamento de caixa com relatórios financeiros.
                            </p>
                          </div>
                        </label>
                      </div>

                      <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                        <input
                          type="checkbox"
                          checked={pdvConfig.agrupa_itens}
                          onChange={(e) => handlePdvConfigChange('agrupa_itens', e.target.checked)}
                          className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                          style={{ borderRadius: '50%' }}
                        />
                        <div>
                          <h4 className="text-white font-medium">Agrupa Itens</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Agrupa automaticamente itens idênticos no carrinho para melhor organização.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                        <input
                          type="checkbox"
                          checked={pdvConfig.delivery}
                          onChange={(e) => handlePdvConfigChange('delivery', e.target.checked)}
                          className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                          style={{ borderRadius: '50%' }}
                        />
                        <div>
                          <h4 className="text-white font-medium">Delivery Local</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Habilita funcionalidades de entrega com controle de endereços e taxas.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                        <input
                          type="checkbox"
                          checked={pdvConfig.cardapio_digital}
                          onChange={(e) => handlePdvConfigChange('cardapio_digital', e.target.checked)}
                          className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                          style={{ borderRadius: '50%' }}
                        />
                        <div>
                          <h4 className="text-white font-medium">Cardápio Digital</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Disponibiliza cardápio digital para clientes fazerem pedidos via QR Code.
                          </p>
                        </div>
                      </label>

                      <div className="relative">
                        <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-not-allowed opacity-60 transition-colors">
                          <input
                            type="checkbox"
                            checked={false}
                            disabled={true}
                            className="w-5 h-5 text-gray-500 bg-gray-700 border-gray-600 rounded-full cursor-not-allowed mt-0.5 mr-3"
                            style={{ borderRadius: '50%' }}
                          />
                          <div>
                            <h4 className="text-gray-400 font-medium">Delivery como chat IA</h4>
                            <p className="text-sm text-gray-500 mt-1">
                              Integra inteligência artificial para atendimento automatizado via chat.
                            </p>
                            <div className="mt-2 text-xs text-yellow-400 flex items-center">
                              🚧 Em desenvolvimento - Funcionalidade temporariamente desabilitada
                            </div>
                          </div>
                        </label>
                      </div>

                      <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                        <input
                          type="checkbox"
                          checked={pdvConfig.venda_codigo_barras}
                          onChange={(e) => handlePdvConfigChange('venda_codigo_barras', e.target.checked)}
                          className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                          style={{ borderRadius: '50%' }}
                        />
                        <div>
                          <h4 className="text-white font-medium">Venda de produtos por Código de barras</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Permite adicionar produtos ao carrinho digitando números mesmo sem focar no campo de busca.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                        <input
                          type="checkbox"
                          checked={pdvConfig.consumo_interno}
                          onChange={(e) => handlePdvConfigChange('consumo_interno', e.target.checked)}
                          className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                          style={{ borderRadius: '50%' }}
                        />
                        <div>
                          <h4 className="text-white font-medium">Consumo Interno</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Permite dar baixa no estoque de produtos para consumo interno da empresa.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                        <input
                          type="checkbox"
                          checked={pdvConfig.forca_venda_fiscal_cartao}
                          onChange={(e) => handlePdvConfigChange('forca_venda_fiscal_cartao', e.target.checked)}
                          className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                          style={{ borderRadius: '50%' }}
                        />
                        <div>
                          <h4 className="text-white font-medium">Força venda fiscal nos cartões</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Quando habilitado, vendas com cartão só podem ser finalizadas com NFC-e, desabilitando as opções de finalização simples e produção.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                        <input
                          type="checkbox"
                          checked={pdvConfig.observacao_no_item}
                          onChange={(e) => handlePdvConfigChange('observacao_no_item', e.target.checked)}
                          className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                          style={{ borderRadius: '50%' }}
                        />
                        <div>
                          <h4 className="text-white font-medium">Observação no Item</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Permite adicionar observações personalizadas aos itens durante a venda no PDV.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                        <input
                          type="checkbox"
                          checked={pdvConfig.desconto_no_item}
                          onChange={(e) => handlePdvConfigChange('desconto_no_item', e.target.checked)}
                          className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                          style={{ borderRadius: '50%' }}
                        />
                        <div>
                          <h4 className="text-white font-medium">Desconto no Item</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Permite aplicar desconto individual em cada item durante a venda no PDV.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                        <input
                          type="checkbox"
                          checked={pdvConfig.desconto_no_total}
                          onChange={(e) => handlePdvConfigChange('desconto_no_total', e.target.checked)}
                          className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                          style={{ borderRadius: '50%' }}
                        />
                        <div>
                          <h4 className="text-white font-medium">Desconto no Total da Venda</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Habilita botão para aplicar desconto no valor total da venda no PDV.
                          </p>
                        </div>
                      </label>

                      <div className="relative">
                        <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                          <input
                            type="checkbox"
                            checked={pdvConfig.fiado}
                            onChange={(e) => handlePdvConfigChange('fiado', e.target.checked)}
                            className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                            style={{ borderRadius: '50%' }}
                          />
                          <div>
                            <h4 className="text-white font-medium">Fiado</h4>
                            <p className="text-sm text-gray-400 mt-1">
                              Habilita a opção de venda fiado no PDV.
                            </p>
                          </div>
                        </label>
                      </div>

                      <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                        <input
                          type="checkbox"
                          checked={pdvConfig.editar_nome_produto}
                          onChange={(e) => handlePdvConfigChange('editar_nome_produto', e.target.checked)}
                          className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                          style={{ borderRadius: '50%' }}
                        />
                        <div>
                          <h4 className="text-white font-medium">Editar nome do produto na venda</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Permite editar o nome do produto durante a venda no PDV para personalização.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                        <input
                          type="checkbox"
                          checked={pdvConfig.vendas_itens_multiplicacao}
                          onChange={(e) => handlePdvConfigChange('vendas_itens_multiplicacao', e.target.checked)}
                          className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                          style={{ borderRadius: '50%' }}
                        />
                        <div>
                          <h4 className="text-white font-medium">Vendas de Itens por Multiplicação</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Habilita a funcionalidade de venda de produtos usando multiplicação de quantidade no PDV.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                        <input
                          type="checkbox"
                          checked={pdvConfig.exibir_dados_fiscais_venda}
                          onChange={(e) => handlePdvConfigChange('exibir_dados_fiscais_venda', e.target.checked)}
                          className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                          style={{ borderRadius: '50%' }}
                        />
                        <div>
                          <h4 className="text-white font-medium">Exibir dados Fiscais na Venda</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Mostra informações fiscais detalhadas (NCM, CFOP, CST/CSOSN, CEST, etc.) abaixo de cada item no carrinho do PDV para debug e conferência.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                        <input
                          type="checkbox"
                          checked={pdvConfig.solicitar_nome_cliente}
                          onChange={(e) => handlePdvConfigChange('solicitar_nome_cliente', e.target.checked)}
                          className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                          style={{ borderRadius: '50%' }}
                        />
                        <div>
                          <h4 className="text-white font-medium">Solicitar Nome do Cliente</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Torna obrigatório informar o nome do cliente antes de finalizar qualquer venda no PDV.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {pdvActiveTab === 'botoes' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                        <Receipt size={18} className="text-blue-400" />
                        Controle de Botões de Finalização
                      </h3>
                      <p className="text-sm text-gray-400 mb-6">
                        Configure quais botões de finalização devem ser <strong>ocultados</strong> no PDV.
                        Marque as opções que você <strong>NÃO</strong> quer exibir na tela de finalização.
                      </p>
                    </div>

                    {/* Finalização Simples */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                        <input
                          type="checkbox"
                          checked={pdvConfig.ocultar_finalizar_com_impressao}
                          onChange={(e) => handlePdvConfigChange('ocultar_finalizar_com_impressao', e.target.checked)}
                          className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                          style={{ borderRadius: '50%' }}
                        />
                        <div>
                          <h4 className="text-white font-medium">Ocultar "Finalizar com Impressão"</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Remove o botão de finalização simples com impressão da tela de finalização.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                        <input
                          type="checkbox"
                          checked={pdvConfig.ocultar_finalizar_sem_impressao}
                          onChange={(e) => handlePdvConfigChange('ocultar_finalizar_sem_impressao', e.target.checked)}
                          className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                          style={{ borderRadius: '50%' }}
                        />
                        <div>
                          <h4 className="text-white font-medium">Ocultar "Finalizar sem Impressão"</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Remove o botão de finalização simples sem impressão da tela de finalização.
                          </p>
                        </div>
                      </label>
                    </div>

                    {/* NFC-e */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                        <input
                          type="checkbox"
                          checked={pdvConfig.ocultar_nfce_com_impressao}
                          onChange={(e) => handlePdvConfigChange('ocultar_nfce_com_impressao', e.target.checked)}
                          className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                          style={{ borderRadius: '50%' }}
                        />
                        <div>
                          <h4 className="text-white font-medium">Ocultar "NFC-e com Impressão"</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Remove o botão de emissão de NFC-e com impressão da tela de finalização.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                        <input
                          type="checkbox"
                          checked={pdvConfig.ocultar_nfce_sem_impressao}
                          onChange={(e) => handlePdvConfigChange('ocultar_nfce_sem_impressao', e.target.checked)}
                          className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                          style={{ borderRadius: '50%' }}
                        />
                        <div>
                          <h4 className="text-white font-medium">Ocultar "NFC-e sem Impressão"</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Remove o botão de emissão de NFC-e sem impressão da tela de finalização.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {pdvActiveTab === 'impressoes' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                        <Receipt size={18} className="text-green-400" />
                        Configurações de Impressão
                      </h3>
                      <p className="text-sm text-gray-400 mb-6">
                        Configure as opções de impressão para recibos e documentos fiscais.
                      </p>
                    </div>

                    {/* ✅ NOVO: Tipos de Impressão */}
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-lg font-medium text-white mb-4">
                          Tipos de Impressão
                        </h4>
                        <p className="text-sm text-gray-400 mb-4">
                          Selecione o tipo de impressão padrão para cupons e documentos fiscais.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Impressão 80mm */}
                          <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors border-2 border-transparent data-[checked=true]:border-primary-500">
                            <input
                              type="radio"
                              name="tipo_impressao"
                              checked={pdvConfig.tipo_impressao_80mm}
                              onChange={(e) => handleTipoImpressaoChange('tipo_impressao_80mm', e.target.checked)}
                              className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                            />
                            <div>
                              <h5 className="text-white font-medium flex items-center gap-2">
                                <Receipt size={16} className="text-green-400" />
                                Impressão 80mm (Padrão)
                              </h5>
                              <p className="text-sm text-gray-400 mt-1">
                                Formato padrão para impressoras térmicas de 80mm. Ideal para a maioria dos estabelecimentos.
                              </p>
                            </div>
                          </label>

                          {/* Impressão 50mm */}
                          <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors border-2 border-transparent data-[checked=true]:border-primary-500">
                            <input
                              type="radio"
                              name="tipo_impressao"
                              checked={pdvConfig.tipo_impressao_50mm}
                              onChange={(e) => handleTipoImpressaoChange('tipo_impressao_50mm', e.target.checked)}
                              className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                            />
                            <div>
                              <h5 className="text-white font-medium flex items-center gap-2">
                                <Receipt size={16} className="text-blue-400" />
                                Impressão 50mm (Compacta)
                              </h5>
                              <p className="text-sm text-gray-400 mt-1">
                                Formato compacto para impressoras menores. Ideal para espaços reduzidos.
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Configurações do Cupom "Finalizar com Impressão" */}
                      <div>
                        <h4 className="text-lg font-medium text-white mb-4">
                          Configurações do Cupom "Finalizar com Impressão"
                        </h4>
                        <p className="text-sm text-gray-400 mb-4">
                          Configure quais informações aparecerão no cupom não fiscal (apenas para "Finalizar com Impressão").
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Mostrar Razão Social */}
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              id="mostrar_razao_social_cupom_finalizar"
                              checked={pdvConfig.mostrar_razao_social_cupom_finalizar}
                              onChange={(e) => handlePdvConfigChange('mostrar_razao_social_cupom_finalizar', e.target.checked)}
                              className="w-4 h-4 text-primary-600 bg-gray-800 border-gray-600 rounded focus:ring-primary-500 focus:ring-2"
                            />
                            <label htmlFor="mostrar_razao_social_cupom_finalizar" className="text-sm text-white">
                              Mostrar Razão Social
                            </label>
                          </div>

                          {/* Mostrar Endereço */}
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              id="mostrar_endereco_cupom_finalizar"
                              checked={pdvConfig.mostrar_endereco_cupom_finalizar}
                              onChange={(e) => handlePdvConfigChange('mostrar_endereco_cupom_finalizar', e.target.checked)}
                              className="w-4 h-4 text-primary-600 bg-gray-800 border-gray-600 rounded focus:ring-primary-500 focus:ring-2"
                            />
                            <label htmlFor="mostrar_endereco_cupom_finalizar" className="text-sm text-white">
                              Mostrar Endereço
                            </label>
                          </div>

                          {/* Mostrar Operador */}
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              id="mostrar_operador_cupom_finalizar"
                              checked={pdvConfig.mostrar_operador_cupom_finalizar}
                              onChange={(e) => handlePdvConfigChange('mostrar_operador_cupom_finalizar', e.target.checked)}
                              className="w-4 h-4 text-primary-600 bg-gray-800 border-gray-600 rounded focus:ring-primary-500 focus:ring-2"
                            />
                            <label htmlFor="mostrar_operador_cupom_finalizar" className="text-sm text-white">
                              Mostrar Operador (Caixa)
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Rodapé Personalizado */}
                      <div>
                        <label htmlFor="rodape_personalizado" className="block text-sm font-medium text-white mb-2">
                          Rodapé Personalizado dos Recibos
                        </label>
                        <textarea
                          id="rodape_personalizado"
                          value={rodapePersonalizado}
                          onChange={(e) => setRodapePersonalizado(e.target.value)}
                          placeholder="Digite a mensagem que aparecerá no rodapé dos recibos..."
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                          rows={3}
                          maxLength={200}
                        />
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-xs text-gray-400">
                            Esta mensagem substituirá o texto padrão "Obrigado pela preferencia volte sempre!" nos recibos.
                          </p>
                          <span className="text-xs text-gray-400">
                            {rodapePersonalizado.length}/200
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Botão para salvar configurações de impressão */}
                    <div className="flex justify-end pt-4 border-t border-gray-700">
                      <Button
                        type="button"
                        variant="primary"
                        onClick={handleSalvarRodapePersonalizado}
                        disabled={isLoading}
                        className="min-w-[120px]"
                      >
                        {isLoading ? 'Salvando...' : 'Salvar'}
                      </Button>
                    </div>
                  </div>
                )}

                {pdvActiveTab === 'venda-sem-produto' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                        <DollarSign size={18} className="text-green-400" />
                        Configurações de Venda sem Produto
                      </h3>
                      <p className="text-sm text-gray-400 mb-6">
                        Configure as opções para vendas sem produtos específicos, permitindo lançamento de valores diretos no PDV.
                      </p>
                    </div>

                    {/* Opção principal de habilitar/desabilitar */}
                    <div className="grid grid-cols-1 gap-4">
                      <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                        <input
                          type="checkbox"
                          checked={pdvConfig.venda_sem_produto}
                          onChange={(e) => handlePdvConfigChange('venda_sem_produto', e.target.checked)}
                          className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                          style={{ borderRadius: '50%' }}
                        />
                        <div>
                          <h4 className="text-white font-medium">Habilitar Venda sem Produto</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Quando ativado, exibe o botão "Venda sem Produto" (F0) no PDV, permitindo adicionar itens sem produtos específicos ao carrinho.
                          </p>
                        </div>
                      </label>
                    </div>

                    {/* Status atual */}
                    <div className={`border rounded-lg p-4 ${
                      pdvConfig.venda_sem_produto
                        ? 'bg-green-500/10 border-green-500/20'
                        : 'bg-gray-500/10 border-gray-500/20'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {pdvConfig.venda_sem_produto ? (
                          <>
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-green-400 font-medium">Funcionalidade Ativa</span>
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            <span className="text-gray-400 font-medium">Funcionalidade Desativada</span>
                          </>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">
                        {pdvConfig.venda_sem_produto
                          ? 'O botão "Venda sem Produto" está visível no PDV e pode ser acessado via tecla F0.'
                          : 'O botão "Venda sem Produto" está oculto no PDV. Ative a opção acima para habilitá-lo.'
                        }
                      </p>
                    </div>

                    {/* Descrição padrão do produto */}
                    {pdvConfig.venda_sem_produto && (
                      <div className="border border-gray-700 rounded-lg p-4">
                        <div className="mb-4">
                          <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                            <FileText size={16} className="text-blue-400" />
                            Descrição padrão do Produto
                          </h4>
                          <p className="text-sm text-gray-400">
                            Nome que aparecerá como placeholder no campo de descrição do modal "Venda sem Produto".
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={nomePadraoLocal}
                              onChange={(e) => setNomePadraoLocal(e.target.value)}
                              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                              placeholder="Ex: Diversos, Serviços, Produtos..."
                            />
                          </div>
                          <button
                            onClick={() => {
                              // Salvar apenas este campo específico
                              const salvarNomePadrao = async () => {
                                try {
                                  // Obter dados do usuário autenticado
                                  const { data: userData } = await supabase.auth.getUser();
                                  if (!userData.user) throw new Error('Usuário não autenticado');

                                  const { data: usuarioData } = await supabase
                                    .from('usuarios')
                                    .select('empresa_id')
                                    .eq('id', userData.user.id)
                                    .single();

                                  if (!usuarioData?.empresa_id) throw new Error('Empresa não encontrada');

                                  const { error } = await supabase
                                    .from('pdv_config')
                                    .update({
                                      venda_sem_produto_nome_padrao: nomePadraoLocal || 'Diversos'
                                    })
                                    .eq('empresa_id', usuarioData.empresa_id);

                                  if (error) throw error;

                                  // Atualizar o estado principal após salvar
                                  setPdvConfig(prev => ({
                                    ...prev,
                                    venda_sem_produto_nome_padrao: nomePadraoLocal || 'Diversos'
                                  }));

                                  showMessage('success', 'Descrição padrão salva com sucesso!');
                                } catch (error) {
                                  console.error('Erro ao salvar descrição padrão:', error);
                                  showMessage('error', 'Erro ao salvar descrição padrão');
                                }
                              };
                              salvarNomePadrao();
                            }}
                            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Salvar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Seção de Impostos */}
                    {pdvConfig.venda_sem_produto && (
                      <div className="border-t border-gray-800 pt-6">
                        <div className="mb-6">
                          <h4 className="text-lg font-medium text-white mb-2 flex items-center gap-2">
                            <Receipt size={18} className="text-blue-400" />
                            Configurações Fiscais
                          </h4>
                          <p className="text-sm text-gray-400">
                            Configure os dados fiscais que serão aplicados automaticamente aos itens de venda sem produto.
                          </p>
                        </div>

                        <div className="space-y-6">
                          {/* NCM */}
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                              NCM (Nomenclatura Comum do Mercosul) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={aplicarMascaraNCMVendaSemProduto(configFiscalLocal.venda_sem_produto_ncm || '')}
                                onChange={(e) => {
                                  // Remover máscara e permitir apenas números, limitando a 8 dígitos
                                  const apenasNumeros = e.target.value.replace(/\D/g, '').slice(0, 8);
                                  handlePdvConfigChangeFiscal('venda_sem_produto_ncm', apenasNumeros);

                                  // Validar NCM se tiver 8 dígitos
                                  if (apenasNumeros.length === 8) {
                                    validarNCMVendaSemProduto(apenasNumeros);
                                  } else {
                                    setVendaSemProdutoNcmValidacao({
                                      validando: false,
                                      valido: null,
                                      descricao: '',
                                      erro: ''
                                    });
                                  }
                                }}
                                className={`w-full bg-gray-800/50 border rounded-lg py-2 px-3 pr-10 text-white focus:outline-none focus:ring-1 focus:ring-primary-500/20 ${
                                  vendaSemProdutoNcmValidacao.valido === true
                                    ? 'border-green-500 focus:border-green-500'
                                    : vendaSemProdutoNcmValidacao.valido === false
                                    ? 'border-red-500 focus:border-red-500'
                                    : 'border-gray-700 focus:border-primary-500'
                                }`}
                                placeholder="0000.00.00"
                                maxLength={10} // Considerando a máscara
                              />

                              {/* Ícone de status */}
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                {vendaSemProdutoNcmValidacao.valido === true ? (
                                  <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                    <Check size={10} className="text-white" />
                                  </div>
                                ) : vendaSemProdutoNcmValidacao.valido === false ? (
                                  <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                    <X size={10} className="text-white" />
                                  </div>
                                ) : null}
                              </div>

                              {/* Mensagem de carregamento NCM */}
                              {vendaSemProdutoNcmValidacao.validando && (
                                <div className="absolute inset-x-0 -bottom-8 bg-blue-900/20 border border-blue-700/50 rounded-lg px-3 py-2 z-10">
                                  <div className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500/30 border-t-blue-500"></div>
                                    <span className="text-xs text-blue-300 font-medium">Aguarde Consultando NCM</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Feedback de validação */}
                            {vendaSemProdutoNcmValidacao.valido === true && vendaSemProdutoNcmValidacao.descricao && (
                              <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded text-sm text-green-400">
                                ✅ <strong>NCM válido:</strong> {vendaSemProdutoNcmValidacao.descricao}
                              </div>
                            )}

                            {vendaSemProdutoNcmValidacao.valido === false && vendaSemProdutoNcmValidacao.erro && (
                              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
                                ❌ <strong>Erro:</strong> {vendaSemProdutoNcmValidacao.erro}
                              </div>
                            )}

                            <p className="text-xs text-gray-500 mt-1">
                              Padrão: 22021000 (Bebidas alcoólicas). Digite 8 dígitos para validação automática.
                            </p>
                          </div>

                          {/* CFOP */}
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                              CFOP (Código Fiscal de Operações e Prestações) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative cfop-dropdown">
                              {/* Campo de exibição do CFOP selecionado */}
                              <div
                                onClick={() => setVendaSemProdutoCfopDropdownOpen(!vendaSemProdutoCfopDropdownOpen)}
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white cursor-pointer focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 flex items-center justify-between"
                              >
                                <span className="truncate">
                                  {configFiscalLocal.venda_sem_produto_cfop ? (
                                    <>
                                      {configFiscalLocal.venda_sem_produto_cfop} - {cfopsDisponiveis.find(c => c.codigo === configFiscalLocal.venda_sem_produto_cfop)?.descricao || 'CFOP selecionado'}
                                    </>
                                  ) : (
                                    'Selecione um CFOP'
                                  )}
                                </span>
                                <ChevronDown
                                  size={16}
                                  className={`transition-transform ${vendaSemProdutoCfopDropdownOpen ? 'rotate-180' : ''}`}
                                />
                              </div>

                              {/* Dropdown de CFOPs */}
                              {vendaSemProdutoCfopDropdownOpen && (
                                <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                  {/* Campo de pesquisa */}
                                  <div className="p-2 border-b border-gray-700">
                                    <input
                                      type="text"
                                      placeholder="Pesquisar CFOP..."
                                      value={vendaSemProdutoCfopSearchTerm}
                                      onChange={(e) => setVendaSemProdutoCfopSearchTerm(e.target.value)}
                                      className="w-full bg-gray-700 border border-gray-600 rounded py-1 px-2 text-white text-sm focus:outline-none focus:border-primary-500"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>

                                  {/* Lista de CFOPs */}
                                  <div className="max-h-48 overflow-y-auto">
                                    {filtrarCfopsVendaSemProduto().map((cfop) => (
                                      <div
                                        key={cfop.codigo}
                                        onClick={() => selecionarCfopVendaSemProduto(cfop)}
                                        className="p-2 hover:bg-gray-700 cursor-pointer text-sm border-b border-gray-700/50 last:border-b-0"
                                      >
                                        <div className="font-medium text-white">{cfop.codigo}</div>
                                        <div className="text-gray-400 text-xs truncate">{cfop.descricao}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Padrão: 5102 (Venda de mercadoria adquirida ou recebida de terceiros)
                            </p>
                          </div>

                          {/* Origem */}
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                              Origem do Produto <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={configFiscalLocal.venda_sem_produto_origem || 0}
                              onChange={(e) => handlePdvConfigChangeFiscal('venda_sem_produto_origem', parseInt(e.target.value))}
                              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
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
                              value={configFiscalLocal.venda_sem_produto_situacao_tributaria || 'tributado_integral'}
                              onChange={(e) => handlePdvConfigChangeFiscal('venda_sem_produto_situacao_tributaria', e.target.value)}
                              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                            >
                              {getOpcoesSituacaoTributariaVendaSemProduto().map((opcao) => (
                                <option key={opcao.value} value={opcao.value}>
                                  {opcao.label}
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                              {isEmpresaSimplesNacional()
                                ? 'Códigos CSOSN para Simples Nacional/MEI'
                                : 'Códigos CST para Regime Normal'
                              }. Sugerido automaticamente pelo CFOP.
                            </p>
                          </div>

                          {/* ✅ CAMPOS CST/CSOSN OCULTOS - Preenchidos automaticamente pela Situação Tributária */}
                          {/*
                          Campos CST/CSOSN agora são preenchidos automaticamente baseados na Situação Tributária selecionada.
                          Não há necessidade de exibir estes campos para o usuário.
                          */}

                          {/* CEST - Só aparece para ST */}
                          {deveMostrarCamposST() && (
                            <div>
                              <label className="block text-sm font-medium text-gray-400 mb-2">
                                CEST (Código Especificador ST) <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={(() => {
                                  // Aplicar máscara para exibição
                                  const valor = configFiscalLocal.venda_sem_produto_cest || '';
                                  if (valor.length <= 2) return valor;
                                  if (valor.length <= 5) return valor.slice(0, 2) + '.' + valor.slice(2);
                                  return valor.slice(0, 2) + '.' + valor.slice(2, 5) + '.' + valor.slice(5);
                                })()}
                                onChange={(e) => {
                                  // Aplicar máscara CEST (00.000.00) apenas para exibição
                                  let valorNumerico = e.target.value.replace(/\D/g, '').slice(0, 7);
                                  let valorComMascara = valorNumerico;

                                  // Aplicar máscara visual
                                  if (valorNumerico.length > 2) {
                                    valorComMascara = valorNumerico.slice(0, 2) + '.' + valorNumerico.slice(2);
                                  }
                                  if (valorNumerico.length > 5) {
                                    valorComMascara = valorComMascara.slice(0, 6) + '.' + valorComMascara.slice(6);
                                  }

                                  // Salvar apenas números (sem máscara)
                                  handlePdvConfigChangeFiscal('venda_sem_produto_cest', valorNumerico);

                                  // Atualizar o campo visual com máscara
                                  e.target.value = valorComMascara;
                                }}
                                className={`w-full bg-gray-800/50 border rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-1 ${
                                  errosValidacaoST.cest
                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                                    : 'border-gray-700 focus:border-primary-500 focus:ring-primary-500/20'
                                }`}
                                placeholder="00.000.00"
                                maxLength={9} // Considerando a máscara
                              />

                              {/* Mensagem de erro */}
                              {errosValidacaoST.cest && (
                                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  {errosValidacaoST.cest}
                                </p>
                              )}

                              <p className="text-xs text-gray-500 mt-1">
                                Obrigatório para situação tributária com Substituição Tributária. Ex: 12.345.67
                              </p>
                            </div>
                          )}

                          {/* Margem ST - Só aparece para ST */}
                          {deveMostrarCamposST() && (
                            <div>
                              <label className="block text-sm font-medium text-gray-400 mb-2">
                                Margem ST (%) <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={configFiscalLocal.venda_sem_produto_margem_st || ''}
                                onChange={(e) => {
                                  const valor = e.target.value ? parseFloat(e.target.value) : null;
                                  handlePdvConfigChangeFiscal('venda_sem_produto_margem_st', valor);
                                }}
                                className={`w-full bg-gray-800/50 border rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-1 ${
                                  errosValidacaoST.margem_st
                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                                    : 'border-gray-700 focus:border-primary-500 focus:ring-primary-500/20'
                                }`}
                                placeholder="Ex: 30.0"
                              />

                              {/* Mensagem de erro */}
                              {errosValidacaoST.margem_st && (
                                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  {errosValidacaoST.margem_st}
                                </p>
                              )}

                              <p className="text-xs text-gray-500 mt-1">
                                Margem de Valor Agregado para ST. Consulte seu contador para o valor correto.
                              </p>
                            </div>
                          )}

                          {/* Alíquotas */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Alíquota ICMS */}
                            <div>
                              <label className="block text-sm font-medium text-gray-400 mb-2">
                                Alíquota ICMS (%)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={configFiscalLocal.venda_sem_produto_aliquota_icms || ''}
                                onChange={(e) => {
                                  const valor = e.target.value ? parseFloat(e.target.value) : 18.0;
                                  handlePdvConfigChangeFiscal('venda_sem_produto_aliquota_icms', valor);
                                }}
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                                placeholder="18.0"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                {configFiscalLocal.venda_sem_produto_cfop === '5102' && (
                                  <span className="text-yellow-400">💡 CFOP 5102 sugere alíquota ICMS de 18% (pode variar por estado - ajuste conforme necessário)</span>
                                )}
                              </p>
                            </div>

                            {/* Alíquota PIS */}
                            <div>
                              <label className="block text-sm font-medium text-gray-400 mb-2">
                                Alíquota PIS (%)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={configFiscalLocal.venda_sem_produto_aliquota_pis || ''}
                                onChange={(e) => {
                                  const valor = e.target.value ? parseFloat(e.target.value) : 1.65;
                                  handlePdvConfigChangeFiscal('venda_sem_produto_aliquota_pis', valor);
                                }}
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                                placeholder="1.65"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Padrão: 1,65% (Regime Normal)
                              </p>
                            </div>

                            {/* Alíquota COFINS */}
                            <div>
                              <label className="block text-sm font-medium text-gray-400 mb-2">
                                Alíquota COFINS (%)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={configFiscalLocal.venda_sem_produto_aliquota_cofins || ''}
                                onChange={(e) => {
                                  const valor = e.target.value ? parseFloat(e.target.value) : 7.6;
                                  handlePdvConfigChangeFiscal('venda_sem_produto_aliquota_cofins', valor);
                                }}
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                                placeholder="7.6"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Padrão: 7,6% (Regime Normal)
                              </p>
                            </div>
                          </div>

                          {/* Peso Líquido */}
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                              Peso Líquido (kg)
                            </label>
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              value={configFiscalLocal.venda_sem_produto_peso_liquido || ''}
                              onChange={(e) => {
                                const valor = e.target.value ? parseFloat(e.target.value) : 0;
                                handlePdvConfigChangeFiscal('venda_sem_produto_peso_liquido', valor);
                              }}
                              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                              placeholder="0"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Peso líquido do produto em quilogramas. Padrão: 0 (para serviços ou produtos sem peso específico)
                            </p>
                          </div>

                          {/* Botão Salvar Configurações Fiscais */}
                          <div className="flex justify-end pt-4 border-t border-gray-800">
                            <button
                              onClick={salvarConfigFiscal}
                              disabled={!configFiscalAlterada || salvandoConfigFiscal || (errosValidacaoST.cest || errosValidacaoST.margem_st)}
                              className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                                configFiscalAlterada && !salvandoConfigFiscal && !errosValidacaoST.cest && !errosValidacaoST.margem_st
                                  ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg hover:shadow-xl'
                                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              {salvandoConfigFiscal ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                  Salvando...
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  {configFiscalAlterada ? 'Salvar Configurações' : 'Configurações Salvas'}
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Nova aba: Cardápio Digital */}
                {pdvActiveTab === 'cardapio-digital' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Configurações do Cardápio Digital
                      </h3>
                      <p className="text-sm text-gray-400 mb-6">
                        Configure as opções do cardápio digital para permitir que clientes façam pedidos via QR Code.
                      </p>
                    </div>

                    {/* Sub-navegação do Cardápio Digital */}
                    <div className="bg-gray-800/30 rounded-lg border border-gray-700">
                      <div className="border-b border-gray-700">
                        <nav className="flex space-x-6 px-4 py-3">
                          <button
                            onClick={() => setCardapioDigitalActiveTab('geral')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                              cardapioDigitalActiveTab === 'geral'
                                ? 'border-purple-500 text-purple-400'
                                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                            }`}
                          >
                            Geral
                          </button>
                          <button
                            onClick={() => setCardapioDigitalActiveTab('cupom-desconto')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                              cardapioDigitalActiveTab === 'cupom-desconto'
                                ? 'border-purple-500 text-purple-400'
                                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                            }`}
                          >
                            Cupom Desconto
                          </button>
                        </nav>
                      </div>

                      {/* Conteúdo das Sub-abas */}
                      <div className="p-6">
                        {/* Sub-aba Geral */}
                        {cardapioDigitalActiveTab === 'geral' && (
                          <div className="space-y-6">
                            {/* Status da funcionalidade */}
                            <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-4">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                                <span className="text-purple-400 font-medium">Funcionalidade Ativa</span>
                              </div>
                              <p className="text-sm text-gray-400">
                                O cardápio digital está habilitado e disponível para seus clientes. Configure as opções abaixo para personalizar a experiência.
                              </p>
                            </div>

                            {/* Configurações do cardápio */}
                            <div className="space-y-4">
                              {/* Configuração de Abertura da Loja - Primeira seção */}
                              <div className="space-y-4">
                                <h4 className="text-white font-medium">Abertura da Loja</h4>

                                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                                  {/* Tag de Status em Tempo Real */}
                                  <div className="flex items-center justify-between mb-4">
                                    <p className="text-sm text-gray-400">
                                      Configure como a loja será aberta no cardápio digital.
                                    </p>
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                                      pdvConfig.cardapio_loja_aberta
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    }`}>
                                      <div className={`w-2 h-2 rounded-full ${
                                        pdvConfig.cardapio_loja_aberta ? 'bg-green-400' : 'bg-red-400'
                                      }`}></div>
                                      <span>
                                        {pdvConfig.cardapio_loja_aberta ? 'Loja Aberta' : 'Loja Fechada'}
                                      </span>
                                    </div>
                                  </div>

                          <div className="space-y-3">
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                name="cardapio_abertura_tipo"
                                value="automatico"
                                checked={pdvConfig.cardapio_abertura_tipo === 'automatico'}
                                onChange={(e) => handlePdvConfigChange('cardapio_abertura_tipo', e.target.value)}
                                className="w-4 h-4 text-primary-500 bg-gray-800 border-gray-600 focus:ring-primary-500 focus:ring-2 mr-3"
                              />
                              <div>
                                <span className="text-white font-medium">Automático</span>
                                <p className="text-sm text-gray-400">
                                  A loja abre/fecha automaticamente baseado nos horários de atendimento cadastrados.
                                </p>
                              </div>
                            </label>

                            <label className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                name="cardapio_abertura_tipo"
                                value="manual"
                                checked={pdvConfig.cardapio_abertura_tipo === 'manual'}
                                onChange={(e) => handlePdvConfigChange('cardapio_abertura_tipo', e.target.value)}
                                className="w-4 h-4 text-primary-500 bg-gray-800 border-gray-600 focus:ring-primary-500 focus:ring-2 mr-3"
                              />
                              <div>
                                <span className="text-white font-medium">Manual</span>
                                <p className="text-sm text-gray-400">
                                  Você controla manualmente quando a loja está aberta ou fechada no cardápio.
                                </p>
                              </div>
                            </label>
                          </div>

                          {/* Controle manual da loja - só aparece quando modo manual está selecionado */}
                          {pdvConfig.cardapio_abertura_tipo === 'manual' && (
                            <div className="mt-4 pt-4 border-t border-gray-700">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                  <h6 className="text-white font-medium">Controle da Loja</h6>
                                  <p className="text-sm text-gray-400">
                                    Status atual: {pdvConfig.cardapio_loja_aberta ? 'Aberta' : 'Fechada'}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handlePdvConfigChange('cardapio_loja_aberta', !pdvConfig.cardapio_loja_aberta)}
                                  className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                                    pdvConfig.cardapio_loja_aberta
                                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-500/25'
                                      : 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-green-500/25'
                                  }`}
                                >
                                  <div className={`w-2 h-2 rounded-full ${
                                    pdvConfig.cardapio_loja_aberta ? 'bg-red-200' : 'bg-green-200'
                                  }`}></div>
                                  {pdvConfig.cardapio_loja_aberta ? 'Fechar Loja' : 'Abrir Loja'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <h4 className="text-white font-medium">Configurações Gerais</h4>

                      <div className="grid grid-cols-1 gap-4">
                        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-white font-medium">URL do Cardápio</h5>
                            <button
                              onClick={() => {
                                const url = `https://nexo.emasoftware.app/cardapio/${cardapioUrlPersonalizada || 'sua-loja'}`;
                                navigator.clipboard.writeText(url);
                                showMessage('success', 'Link copiado para a área de transferência!');
                              }}
                              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg transition-colors"
                            >
                              Copiar Link
                            </button>
                          </div>

                          <div className="space-y-3">
                            <div className="bg-gray-900/50 p-3 rounded border border-gray-600">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-gray-400">https://nexo.emasoftware.app/cardapio/</span>
                                <input
                                  type="text"
                                  value={cardapioUrlPersonalizada}
                                  onChange={(e) => setCardapioUrlPersonalizada(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                  placeholder="nome-da-sua-loja"
                                  className="flex-1 bg-transparent text-purple-300 border-none outline-none placeholder-gray-500"
                                  maxLength={50}
                                />
                                {verificandoUrl && (
                                  <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin"></div>
                                )}
                                {!verificandoUrl && urlDisponivel === true && cardapioUrlPersonalizada.trim() && (
                                  <div className="flex items-center gap-1 text-green-500">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-xs">Disponível</span>
                                  </div>
                                )}
                                {!verificandoUrl && urlDisponivel === false && cardapioUrlPersonalizada.trim() && (
                                  <div className="flex items-center gap-1 text-red-500">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span className="text-xs">Indisponível</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={handleSalvarCardapioUrl}
                                disabled={isLoading || !cardapioUrlPersonalizada.trim() || urlDisponivel === false || verificandoUrl}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                              >
                                {isLoading ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Salvando...
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Salvar URL
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => {
                                  const url = `https://nexo.emasoftware.app/cardapio/${cardapioUrlPersonalizada || 'sua-loja'}`;
                                  window.open(url, '_blank');
                                }}
                                disabled={!cardapioUrlPersonalizada.trim()}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
                              >
                                Visualizar
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-gray-500 mt-3">
                            Digite o nome da sua loja (apenas letras, números e hífens). Este será o link do seu cardápio digital.
                            {urlDisponivel === false && (
                              <span className="block text-red-400 mt-1">
                                ⚠️ Este nome já está sendo usado por outra empresa. Escolha um nome diferente.
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                          <h5 className="text-white font-medium mb-3">QR Code do Cardápio</h5>
                          <div className="flex items-center gap-4">
                            <div className="w-32 h-32 bg-white rounded-lg flex items-center justify-center p-2">
                              {qrCodeDataUrl ? (
                                <img
                                  src={qrCodeDataUrl}
                                  alt="QR Code do Cardápio"
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                                  <span className="text-gray-500 text-xs text-center">
                                    Salve a URL<br/>para gerar<br/>QR Code
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-gray-400 mb-3">
                                Use este QR Code em seu estabelecimento para que clientes acessem o cardápio digital.
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    if (qrCodeDataUrl) {
                                      const link = document.createElement('a');
                                      link.download = `qrcode-cardapio-${cardapioUrlPersonalizada || 'loja'}.png`;
                                      link.href = qrCodeDataUrl;
                                      link.click();
                                    }
                                  }}
                                  disabled={!qrCodeDataUrl}
                                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
                                >
                                  Baixar QR Code
                                </button>
                                <button
                                  onClick={() => {
                                    if (qrCodeDataUrl) {
                                      const printWindow = window.open('', '_blank');
                                      if (printWindow) {
                                        printWindow.document.write(`
                                          <html>
                                            <head><title>QR Code - Cardápio Digital</title></head>
                                            <body style="margin: 0; padding: 20px; text-align: center;">
                                              <h2>Cardápio Digital</h2>
                                              <p>Escaneie o QR Code para acessar nosso cardápio</p>
                                              <img src="${qrCodeDataUrl}" style="max-width: 300px; margin: 20px 0;" />
                                              <p style="font-size: 12px; color: #666;">
                                                https://nexo.emasoftware.app/cardapio/${cardapioUrlPersonalizada || 'sua-loja'}
                                              </p>
                                            </body>
                                          </html>
                                        `);
                                        printWindow.document.close();
                                        printWindow.print();
                                      }
                                    }
                                  }}
                                  disabled={!qrCodeDataUrl}
                                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
                                >
                                  Imprimir
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Configurações avançadas */}
                    <div className="space-y-4">
                      <h4 className="text-white font-medium">Configurações Avançadas</h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                          <input
                            type="checkbox"
                            checked={pdvConfig.modo_escuro_cardapio}
                            onChange={(e) => handlePdvConfigChange('modo_escuro_cardapio', e.target.checked)}
                            className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                            style={{ borderRadius: '50%' }}
                          />
                          <div>
                            <h5 className="text-white font-medium">Modo Escuro</h5>
                            <p className="text-sm text-gray-400 mt-1">
                              Aplica tema escuro no cardápio digital.
                            </p>
                          </div>
                        </label>

                        {/* Opção "Exibir Fotos nos Itens Principal" ocultada conforme solicitado */}
                        {false && (
                          <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                            <input
                              type="checkbox"
                              checked={pdvConfig.exibir_fotos_itens_cardapio}
                              onChange={(e) => handlePdvConfigChange('exibir_fotos_itens_cardapio', e.target.checked)}
                              className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                              style={{ borderRadius: '50%' }}
                            />
                            <div>
                              <h5 className="text-white font-medium">Exibir Fotos nos Itens Principal</h5>
                              <p className="text-sm text-gray-400 mt-1">
                                Mostra as fotos dos produtos na página principal do cardápio digital.
                              </p>
                            </div>
                          </label>
                        )}

                        <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                          <input
                            type="checkbox"
                            checked={pdvConfig.cardapio_fotos_minimizadas}
                            onChange={(e) => handlePdvConfigChange('cardapio_fotos_minimizadas', e.target.checked)}
                            className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                            style={{ borderRadius: '50%' }}
                          />
                          <div>
                            <h5 className="text-white font-medium">Exibir fotos dos produtos nos itens</h5>
                            <p className="text-sm text-gray-400 mt-1">
                              Mostra fotos pequenas ao lado dos itens no carrinho do cardápio digital, similar ao PDV.
                            </p>
                          </div>
                        </label>

                        <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                          <input
                            type="checkbox"
                            checked={pdvConfig.trabalha_com_pizzas}
                            onChange={(e) => handlePdvConfigChange('trabalha_com_pizzas', e.target.checked)}
                            className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                            style={{ borderRadius: '50%' }}
                          />
                          <div>
                            <h5 className="text-white font-medium">Trabalha com Pizzas</h5>
                            <p className="text-sm text-gray-400 mt-1">
                              Habilita funcionalidades específicas para pizzarias no cardápio digital.
                            </p>
                          </div>
                        </label>

                        <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                          <input
                            type="checkbox"
                            checked={pdvConfig.retirada_balcao_cardapio}
                            onChange={(e) => handlePdvConfigChange('retirada_balcao_cardapio', e.target.checked)}
                            className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                            style={{ borderRadius: '50%' }}
                          />
                          <div>
                            <h5 className="text-white font-medium">Retirada no Balcão</h5>
                            <p className="text-sm text-gray-400 mt-1">
                              Habilita opção de retirada no balcão para clientes no cardápio digital.
                            </p>
                          </div>
                        </label>



                        {/* OPÇÃO OCULTA: Remover nome dos grupos no cardápio */}
                        {/*
                        <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                          <input
                            type="checkbox"
                            checked={pdvConfig.ocultar_grupos_cardapio}
                            onChange={(e) => handlePdvConfigChange('ocultar_grupos_cardapio', e.target.checked)}
                            className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                            style={{ borderRadius: '50%' }}
                          />
                          <div>
                            <h5 className="text-white font-medium">Remover nome dos grupos no cardápio</h5>
                            <p className="text-sm text-gray-400 mt-1">
                              Oculta os nomes dos grupos/categorias no cardápio digital, mostrando apenas os produtos.
                            </p>
                          </div>
                        </label>
                        */}

                      </div>
                    </div>

                    {/* Upload do Logo */}
                    <div className="space-y-4">
                      <h4 className="text-white font-medium">Logo da Empresa</h4>

                      <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                        <div className="flex items-start gap-4">
                          {/* Preview do logo */}
                          <div className="flex-shrink-0">
                            <div className="w-24 h-24 bg-gray-900 rounded-lg border border-gray-600 flex items-center justify-center overflow-hidden">
                              {logoUrl ? (
                                <img
                                  src={logoUrl}
                                  alt="Logo da empresa"
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <div className="text-center">
                                  <svg className="w-8 h-8 text-gray-600 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span className="text-xs text-gray-500">Sem logo</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Controles de upload */}
                          <div className="flex-1">
                            <div className="mb-3">
                              <h5 className="text-white font-medium mb-1">Logo do Cardápio Digital</h5>
                              <p className="text-sm text-gray-400">
                                Adicione o logo da sua empresa que aparecerá no cardápio digital.
                                Recomendamos imagens quadradas com boa qualidade.
                              </p>
                            </div>

                            <div className="flex gap-2">
                              {/* Input de arquivo oculto */}
                              <input
                                ref={logoInputRef}
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleLogoUpload(e.target.files)}
                                className="hidden"
                              />

                              {/* Botão de upload */}
                              <button
                                onClick={() => logoInputRef.current?.click()}
                                disabled={isUploadingLogo}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                              >
                                {isUploadingLogo ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Enviando...
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    {logoUrl ? 'Alterar Logo' : 'Enviar Logo'}
                                  </>
                                )}
                              </button>

                              {/* Botão de remover (só aparece se tem logo) */}
                              {logoUrl && (
                                <button
                                  onClick={handleRemoverLogo}
                                  disabled={isUploadingLogo}
                                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Remover
                                </button>
                              )}
                            </div>

                            <div className="mt-3 text-xs text-gray-500">
                              Formatos aceitos: JPG, PNG, GIF • Tamanho máximo: 5MB
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Informações adicionais */}
                    <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <h5 className="text-blue-400 font-medium mb-1">Como funciona</h5>
                          <p className="text-sm text-blue-300/80">
                            O cardápio digital sincroniza automaticamente com seus produtos cadastrados.
                            Clientes podem visualizar produtos, fazer pedidos e entrar em contato diretamente pelo WhatsApp.
                          </p>
                        </div>
                      </div>
                    </div>
                          </div>
                        )}

                        {/* Sub-aba Cupom Desconto */}
                        {cardapioDigitalActiveTab === 'cupom-desconto' && (
                          <div className="space-y-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-white font-medium">Cupons de Desconto</h4>
                                <p className="text-sm text-gray-400 mt-1">
                                  Crie cupons de desconto para seus clientes utilizarem no cardápio digital.
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  setEditingCupom(null);
                                  setCupomForm({
                                    codigo: '',
                                    descricao: '',
                                    tipo_desconto: 'percentual',
                                    valor_desconto: 0,
                                    valor_minimo_pedido: 0,
                                    data_inicio: '',
                                    data_fim: '',
                                    limite_uso: 0,
                                    ativo: true
                                  });
                                  setShowCupomModal(true);
                                }}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Novo Cupom
                              </button>
                            </div>

                            {/* Lista de cupons */}
                            <div className="bg-gray-800/50 rounded-lg border border-gray-700">
                              <div className="p-4 border-b border-gray-700">
                                <h5 className="text-white font-medium">Cupons Cadastrados</h5>
                              </div>
                              <div className="p-4">
                                {cuponsDesconto.length === 0 ? (
                                  <div className="text-center py-8">
                                    <svg className="w-12 h-12 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                    <p className="text-gray-400 mb-2">Nenhum cupom cadastrado</p>
                                    <p className="text-sm text-gray-500">
                                      Clique em "Novo Cupom" para criar seu primeiro cupom de desconto.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {cuponsDesconto.map((cupom) => (
                                      <div key={cupom.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-3 mb-1">
                                            <span className="font-mono text-purple-400 font-medium">{cupom.codigo}</span>
                                            <span className={`px-2 py-1 text-xs rounded-full ${
                                              cupom.ativo
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-red-500/20 text-red-400'
                                            }`}>
                                              {cupom.ativo ? 'Ativo' : 'Inativo'}
                                            </span>
                                          </div>
                                          <p className="text-sm text-gray-400">{cupom.descricao}</p>
                                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                            <span>
                                              {cupom.tipo_desconto === 'percentual'
                                                ? `${cupom.valor_desconto}% de desconto`
                                                : `R$ ${cupom.valor_desconto.toFixed(2)} de desconto`
                                              }
                                            </span>
                                            {cupom.valor_minimo_pedido > 0 && (
                                              <span>Mín: R$ {cupom.valor_minimo_pedido.toFixed(2)}</span>
                                            )}
                                            {cupom.limite_uso > 0 && (
                                              <span>Limite: {cupom.limite_uso} usos</span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => {
                                              setEditingCupom(cupom);
                                              setCupomForm(cupom);
                                              setShowCupomModal(true);
                                            }}
                                            className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                                            title="Editar cupom"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={() => {
                                              if (window.confirm('Tem certeza que deseja excluir este cupom?')) {
                                                handleExcluirCupom(cupom.id);
                                              }
                                            }}
                                            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                                            title="Excluir cupom"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Nova aba: Formas de Pagamentos */}
                {pdvActiveTab === 'formas-pagamento' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        Formas de Pagamentos
                      </h3>
                      <p className="text-sm text-gray-400 mb-6">
                        Configure as formas de pagamento que sua empresa aceita no PDV e cardápio digital.
                      </p>
                    </div>

                    {/* Botão Adicionar */}
                    <div className="flex justify-end mb-4">
                      <button
                        onClick={() => setShowModalFormaPagamento(true)}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Adicionar Forma de Pagamento
                      </button>
                    </div>

                    {/* Lista de Formas de Pagamento */}
                    <div className="space-y-4">
                      {formasPagamentoEmpresa.map(forma => (
                        <div
                          key={forma.id}
                          className="bg-gray-800/50 p-4 rounded-lg border border-gray-700"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                              </svg>
                              <div>
                                <h4 className="text-white font-medium">{forma.forma_pagamento_opcoes?.nome}</h4>
                                <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                                  <span>Tipo: {forma.forma_pagamento_opcoes?.tipo}</span>
                                  {forma.cardapio_digital && (
                                    <span className="text-green-400">• Cardápio Digital</span>
                                  )}
                                  {forma.forma_pagamento_opcoes?.tipo === 'cartao_credito' && (
                                    <>
                                      <span>• Max. {forma.max_parcelas}x</span>
                                      {forma.juros_por_parcela > 0 && (
                                        <span>• Juros: {forma.juros_por_parcela}%</span>
                                      )}
                                    </>
                                  )}
                                  {forma.forma_pagamento_opcoes?.tipo === 'pix' && forma.utilizar_chave_pix && (
                                    <span className="text-blue-400">• PIX: {forma.tipo_chave_pix?.replace('_', ' ')}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditarFormaPagamento(forma)}
                                className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                                title="Editar forma de pagamento"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeletarFormaPagamento(forma.id)}
                                className="p-2 text-red-400 hover:text-red-300 transition-colors"
                                title="Remover forma de pagamento"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {formasPagamentoEmpresa.length === 0 && (
                        <div className="text-center py-8 bg-gray-800/30 rounded-lg border border-gray-700">
                          <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          <p className="text-gray-400">Nenhuma forma de pagamento configurada</p>
                          <p className="text-sm text-gray-500 mt-1">Clique em "Adicionar Forma de Pagamento" para começar</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Nova aba: Tipos de Pagamentos */}
                {pdvActiveTab === 'tipos-pagamentos' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Tipos de Pagamentos
                      </h3>
                      <p className="text-sm text-gray-400 mb-6">
                        Gerencie os tipos de pagamentos personalizados da sua empresa.
                      </p>
                    </div>

                    {/* Botão Adicionar */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          setEditingTipoPagamento(null);
                          setNovoTipoPagamento({ descricao: '' });
                          setShowModalTipoPagamento(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Adicionar Tipo de Pagamento
                      </button>
                    </div>

                    {/* Lista de Tipos de Pagamentos */}
                    <div className="space-y-4">
                      {tiposPagamentosOpcoes.map(tipo => (
                        <div
                          key={tipo.id}
                          className="bg-gray-800/50 p-4 rounded-lg border border-gray-700"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <div>
                                <h4 className="text-white font-medium">{tipo.descricao}</h4>
                                <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                                  <span>Status: {tipo.ativo ? 'Ativo' : 'Inativo'}</span>
                                  <span>Criado em: {new Date(tipo.created_at).toLocaleDateString('pt-BR')}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditarTipoPagamento(tipo)}
                                className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                                title="Editar tipo de pagamento"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeletarTipoPagamento(tipo.id)}
                                className="p-2 text-red-400 hover:text-red-300 transition-colors"
                                title="Remover tipo de pagamento"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {tiposPagamentosOpcoes.length === 0 && (
                        <div className="text-center py-8 bg-gray-800/30 rounded-lg border border-gray-700">
                          <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-gray-400">Nenhum tipo de pagamento configurado</p>
                          <p className="text-sm text-gray-500 mt-1">Clique em "Adicionar Tipo de Pagamento" para começar</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'taxaentrega':
        return (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Configurações de Taxa de Entrega</h2>
            </div>

            <div className="bg-background-card p-6 rounded-lg border border-gray-800">
              <h3 className="text-lg font-medium text-white mb-4">Taxa de Entrega</h3>

              <div className="p-4 bg-gray-800/50 rounded-lg mb-6">
                <div className="flex items-center">
                  <input
                    id="habilitar_taxa_entrega"
                    type="checkbox"
                    checked={taxaEntregaHabilitada}
                    onChange={(e) => setTaxaEntregaHabilitada(e.target.checked)}
                    className="w-5 h-5 text-primary-500 border-gray-600 rounded focus:ring-primary-500 focus:ring-opacity-25 bg-gray-700"
                  />
                  <label htmlFor="habilitar_taxa_entrega" className="ml-3 cursor-pointer">
                    <h4 className="text-white font-medium">Habilitar Taxa de Entrega</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      Quando ativado, permite configurar e cobrar taxas de entrega nos pedidos.
                    </p>
                  </label>
                </div>
              </div>



              {taxaEntregaHabilitada && (
                <div className="border-t border-gray-800 pt-6 mb-6">
                  <h3 className="text-lg font-medium text-white mb-4">Tipo de Taxa</h3>

                  <div className="space-y-4">
                    <label className="flex items-center p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                      <input
                        type="radio"
                        name="tipo_taxa_entrega"
                        checked={tipoTaxaEntrega === 'distancia'}
                        onChange={() => setTipoTaxaEntrega('distancia')}
                        className="mr-3"
                      />
                      <div>
                        <h4 className="text-white font-medium">Por Distância (KM)</h4>
                        <p className="text-sm text-gray-400 mt-1">
                          A taxa de entrega é calculada com base na distância em quilômetros do estabelecimento até o destino.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                      <input
                        type="radio"
                        name="tipo_taxa_entrega"
                        checked={tipoTaxaEntrega === 'bairro'}
                        onChange={() => setTipoTaxaEntrega('bairro')}
                        className="mr-3"
                      />
                      <div>
                        <h4 className="text-white font-medium">Por Bairro</h4>
                        <p className="text-sm text-gray-400 mt-1">
                          A taxa de entrega é calculada com base no bairro de destino do pedido.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSalvarTaxaEntrega}
                  disabled={isLoading}
                  className="min-w-[120px]"
                >
                  {isLoading ? 'Salvando...' : 'Gravar'}
                </Button>
              </div>
            </div>
          </div>
        );

      case 'tabelaprecos':
        return (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Tabela de Preços</h2>
            </div>

            <div className="bg-background-card p-6 rounded-lg border border-gray-800">
              <h3 className="text-lg font-medium text-white mb-4">Configurações de Tabela de Preços</h3>

              {/* Checkbox principal - Trabalha com Tabela de Preços */}
              <div className="p-4 bg-gray-800/50 rounded-lg mb-6">
                <div className="flex items-center">
                  <input
                    id="trabalha_com_tabela_precos"
                    type="checkbox"
                    checked={trabalhaComTabelaPrecos}
                    onChange={(e) => handleTrabalhaComTabelaPrecosChange(e.target.checked)}
                    className="w-5 h-5 text-primary-500 border-gray-600 rounded focus:ring-primary-500 focus:ring-opacity-25 bg-gray-700"
                  />
                  <label htmlFor="trabalha_com_tabela_precos" className="ml-3 cursor-pointer">
                    <h4 className="text-white font-medium">Trabalha com Tabela de Preços</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      Permite criar diferentes variações de preços para os produtos (ex: Atacado/Varejo, Tamanhos de Pizza).
                    </p>
                  </label>
                </div>
              </div>

              {/* Exemplos de uso */}
              <div className="p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg mb-6">
                <h4 className="text-blue-400 font-medium mb-3">💡 Exemplos de Uso:</h4>
                <div className="space-y-2 text-sm text-blue-300/80">
                  <div><strong>🍕 Pizzaria:</strong> Pizza Pequena (R$ 25), Pizza Média (R$ 35), Pizza Grande (R$ 45)</div>
                  <div><strong>📦 Distribuidora:</strong> Produto Varejo (R$ 10), Produto Atacado 10un (R$ 85)</div>
                  <div><strong>🍽️ Restaurante:</strong> Prato Almoço (R$ 25), Prato Jantar (R$ 30), Happy Hour (R$ 20)</div>
                </div>
              </div>

              {/* Checkbox para sabores (específico para pizzarias) */}
              {trabalhaComTabelaPrecos && (
                <div className="border-t border-gray-800 pt-6 mb-6">
                  <div className="p-4 bg-gray-800/50 rounded-lg mb-4">
                    <div className="flex items-center">
                      <input
                        id="trabalha_com_sabores"
                        type="checkbox"
                        checked={trabalhaComSabores}
                        onChange={(e) => handleTrabalhaComSaboresChange(e.target.checked)}
                        disabled={!trabalhaComTabelaPrecos}
                        className="w-5 h-5 text-primary-500 border-gray-600 rounded focus:ring-primary-500 focus:ring-opacity-25 bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <label htmlFor="trabalha_com_sabores" className={`ml-3 cursor-pointer ${!trabalhaComTabelaPrecos ? 'opacity-50' : ''}`}>
                        <h4 className="text-white font-medium">Trabalha com Sabores</h4>
                        <p className="text-sm text-gray-400 mt-1">
                          Específico para pizzarias - permite configurar múltiplos sabores por pizza (meio a meio, 1/3, etc).
                          {!trabalhaComTabelaPrecos && (
                            <span className="text-yellow-400 block mt-1">
                              ⚠️ Habilite "Trabalha com Tabela de Preços" primeiro
                            </span>
                          )}
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* Opções de tipo de preço da pizza (só aparece se trabalha com sabores) */}
                  {trabalhaComSabores && (
                    <div className="mt-4 p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                      <h5 className="text-white font-medium mb-3">Pizza preço</h5>
                      <div className="space-y-3">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="tipo_preco_pizza"
                            checked={tipoPrecoPizza === 'sabor_mais_caro'}
                            onChange={() => handleTipoPrecoPizzaChange('sabor_mais_caro')}
                            className="w-4 h-4 text-primary-500 border-gray-600 focus:ring-primary-500 focus:ring-opacity-25 bg-gray-700"
                          />
                          <span className="ml-3 text-white text-sm">
                            Preço da pizza é o preço do sabor mais caro
                          </span>
                        </label>

                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="tipo_preco_pizza"
                            checked={tipoPrecoPizza === 'media_sabores'}
                            onChange={() => handleTipoPrecoPizzaChange('media_sabores')}
                            className="w-4 h-4 text-primary-500 border-gray-600 focus:ring-primary-500 focus:ring-opacity-25 bg-gray-700"
                          />
                          <span className="ml-3 text-white text-sm">
                            Preço da pizza é a média do preço dos sabores
                          </span>
                        </label>
                      </div>

                      {/* Exemplo visual */}
                      <div className="mt-3 p-3 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                        <h6 className="text-blue-400 font-medium text-xs mb-2">💡 Exemplo:</h6>
                        <div className="text-blue-300/80 text-xs">
                          {tipoPrecoPizza === 'sabor_mais_caro' ? (
                            <>
                              <div>Pizza meio a meio: Calabresa (R$ 25) + Portuguesa (R$ 35)</div>
                              <div className="font-medium">→ Preço final: R$ 35,00 (sabor mais caro)</div>
                            </>
                          ) : (
                            <>
                              <div>Pizza meio a meio: Calabresa (R$ 25) + Portuguesa (R$ 35)</div>
                              <div className="font-medium">→ Preço final: R$ 30,00 (média: 25+35÷2)</div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Área de gestão das tabelas */}
              {trabalhaComTabelaPrecos && (
                <div className="border-t border-gray-800 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-white">Gerenciar Tabelas de Preços</h4>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => {
                        setTabelaPrecosSelecionada(null);
                        setNomeNovaTabela('');
                        setQuantidadeSabores(2);
                        setShowModalTabelaPrecos(true);
                      }}
                      className="flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14"></path>
                      </svg>
                      Nova Tabela
                    </Button>
                  </div>

                  {/* Grid de tabelas existentes */}
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    {tabelasPrecos.length === 0 ? (
                      <div className="text-center py-8">
                        <DollarSign className="mx-auto text-gray-500 mb-3" size={48} />
                        <p className="text-gray-400">Nenhuma tabela de preços criada ainda.</p>
                        <p className="text-sm text-gray-500 mt-1">Clique em "Nova Tabela" para começar.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {tabelasPrecos.map((tabela) => (
                          <div key={tabela.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                            <div>
                              <h5 className="text-white font-medium">{tabela.nome}</h5>
                              <p className="text-sm text-gray-400">
                                {trabalhaComSabores && tabela.quantidade_sabores ?
                                  `${tabela.quantidade_sabores} sabores máximo` :
                                  'Tabela de preços padrão'
                                }
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setTabelaPrecosSelecionada(tabela);
                                  setNomeNovaTabela(tabela.nome);
                                  setQuantidadeSabores(tabela.quantidade_sabores || 2);
                                  setShowModalTabelaPrecos(true);
                                }}
                              >
                                <Pencil size={14} />
                              </Button>
                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                onClick={() => {
                                  if (confirm(`Tem certeza que deseja excluir a tabela "${tabela.nome}"?`)) {
                                    handleExcluirTabela(tabela.id);
                                  }
                                }}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSalvarTabelaPrecos}
                  disabled={isLoading}
                  className="min-w-[120px]"
                >
                  {isLoading ? 'Salvando...' : 'Gravar'}
                </Button>
              </div>
            </div>
          </div>
        );

      case 'conexao':
        // 🔍 DEBUG: Verificar se código está sendo executado
        console.log('🔍 CONEXÃO PAGE RENDERIZADA - VERSÃO BLOQUEADA:', new Date().toISOString());

        return (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Conexão</h2>
            </div>

            <div className="bg-background-card p-6 rounded-lg border border-gray-800">
              <h3 className="text-lg font-medium text-white mb-4">Configurações de Conexão</h3>

              <div className="space-y-4">
                {/* ⚠️ AVISO: Funcionalidade em desenvolvimento */}
                <div className="p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-black text-sm font-bold">!</span>
                    </div>
                    <div>
                      <h4 className="text-yellow-400 font-medium">🚧 Funcionalidade em Desenvolvimento - v2.0</h4>
                      <p className="text-sm text-yellow-300/80 mt-1">
                        A integração com WhatsApp está sendo desenvolvida e não está disponível no momento.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg opacity-60">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="text-gray-500" size={20} />
                    <div>
                      <h4 className="text-gray-400 font-medium">Habilita Conexão com WhatsApp</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        Permite integração com WhatsApp para comunicação com clientes.
                      </p>
                      <p className="text-xs text-yellow-400 mt-2 font-medium">
                        🚧 Em desenvolvimento - Funcionalidade temporariamente desabilitada
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-not-allowed">
                    <input
                      type="checkbox"
                      checked={false}
                      disabled={true}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 rounded-full relative">
                      <div className="absolute top-[2px] left-[2px] bg-gray-500 rounded-full h-5 w-5 transition-all"></div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'certificado':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Certificado Digital</h2>
            </div>



            <div className="bg-background-card p-6 rounded-lg border border-gray-800">
              <div className="space-y-6">
                {/* Status do Certificado */}
                {certificadoInfo?.certificado_digital_path ? (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                          <path d="M9 12l2 2 4-4"></path>
                          <circle cx="12" cy="12" r="10"></circle>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-green-400 font-medium mb-3">Certificado Digital Configurado</h3>

                        {/* Destaque da Validade */}
                        {certificadoInfo.certificado_digital_validade ? (() => {
                          const expiryCheck = checkCertificateExpiry(certificadoInfo.certificado_digital_validade);
                          const colorClasses = {
                            red: 'bg-red-500/10 border-red-500/20 text-red-400',
                            yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
                            green: 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                          };

                          return (
                            <div className={`${colorClasses[expiryCheck.color]} rounded-lg p-3 mb-3`}>
                              <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-${expiryCheck.color}-400`}>
                                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                  <line x1="16" y1="2" x2="16" y2="6"></line>
                                  <line x1="8" y1="2" x2="8" y2="6"></line>
                                  <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                <span className={`text-${expiryCheck.color}-400 font-medium`}>Válido até:</span>
                                <span className="text-white font-bold text-lg">
                                  {new Date(certificadoInfo.certificado_digital_validade).toLocaleDateString('pt-BR')}
                                </span>
                                <span className={`text-${expiryCheck.color}-400 font-medium ml-2`}>
                                  {expiryCheck.status === 'expired' && '⚠️ '}
                                  {expiryCheck.status === 'expiring' && '⚠️ '}
                                  {expiryCheck.status === 'valid' && '✅ '}
                                  {expiryCheck.message}
                                </span>
                              </div>
                              {expiryCheck.status === 'expired' && (
                                <p className="text-sm text-red-300 mt-1 font-medium">
                                  🚨 CERTIFICADO VENCIDO! Renove imediatamente para continuar emitindo NFe.
                                </p>
                              )}
                              {expiryCheck.status === 'expiring' && (
                                <p className="text-sm text-yellow-300 mt-1 font-medium">
                                  ⚠️ Certificado próximo do vencimento! Providencie a renovação.
                                </p>
                              )}
                            </div>
                          );
                        })() : (
                          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-3">
                            <div className="flex items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                <line x1="12" y1="9" x2="12" y2="13"></line>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                              </svg>
                              <span className="text-red-400 font-medium">⚠️ ATENÇÃO: Data de validade não extraída</span>
                            </div>
                            <p className="text-sm text-red-300 mt-1 font-medium">
                              🚨 CRÍTICO: Sem a data de validade, não podemos alertar sobre vencimento!
                              Verifique manualmente e considere reenviar o certificado.
                            </p>
                          </div>
                        )}

                        <div className="space-y-1 text-sm text-gray-300">
                          <p><strong>Nome:</strong> {certificadoInfo.certificado_digital_nome}</p>
                          <p><strong>Status:</strong> {certificadoInfo.certificado_digital_status === 'ativo' ? 'Ativo' : 'Inativo'}</p>
                          {certificadoInfo.certificado_digital_uploaded_at && (
                            <p><strong>Enviado em:</strong> {new Date(certificadoInfo.certificado_digital_uploaded_at).toLocaleDateString('pt-BR')}</p>
                          )}

                        </div>
                        <div className="mt-3">
                          <Button
                            type="button"
                            variant="primary"
                            onClick={() => setShowRemoveCertificadoModal(true)}
                            className="!bg-red-500 hover:!bg-red-600 !border-red-500 text-sm"
                          >
                            🗑️ Remover Certificado
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                          <line x1="12" y1="9" x2="12" y2="13"></line>
                          <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-yellow-400 font-medium mb-1">Certificado Digital Não Configurado</h3>
                        <p className="text-gray-300 text-sm">
                          Para emitir NFe, é necessário configurar um certificado digital válido.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Formulário de Upload */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">
                    {certificadoInfo?.certificado_digital_path ? 'Substituir Certificado Digital' : 'Configurar Certificado Digital'}
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Arquivo do Certificado (.p12 ou .pfx)
                      </label>
                      <input
                        type="file"
                        accept=".p12,.pfx"
                        onChange={(e) => setCertificadoFile(e.target.files?.[0] || null)}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Selecione o arquivo do certificado digital (.p12 ou .pfx)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Senha do Certificado
                      </label>
                      <div className="relative">
                        <input
                          type={mostrarSenhaCertificado ? "text" : "password"}
                          value={certificadoSenha}
                          onChange={(e) => setCertificadoSenha(e.target.value)}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-3 pr-10 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                          placeholder="Digite a senha do certificado"
                        />
                        <button
                          type="button"
                          onClick={() => setMostrarSenhaCertificado(!mostrarSenhaCertificado)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        >
                          {mostrarSenhaCertificado ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Senha utilizada para proteger o certificado digital
                      </p>
                    </div>

                    <div className="pt-2">
                      <Button
                        type="button"
                        variant="primary"
                        onClick={handleUploadCertificado}
                        disabled={isUploadingLocal || !certificadoFile || !certificadoSenha.trim()}
                        className="w-full"
                      >
                        {isUploadingLocal ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                            Enviando...
                          </>
                        ) : (
                          <>
                            📤 {certificadoInfo?.certificado_digital_path ? 'Substituir' : 'Enviar'} Certificado
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                      <h4 className="text-blue-400 font-medium mb-2">ℹ️ Informações Importantes</h4>
                      <ul className="text-sm text-gray-300 space-y-1">
                        <li>• O certificado deve estar válido e dentro do prazo de validade</li>
                        <li>• Formatos aceitos: .p12 ou .pfx</li>
                        <li>• A senha será criptografada e armazenada com segurança</li>
                        <li>• O sistema extrairá automaticamente a data de validade</li>
                        <li>• Você será notificado quando o certificado estiver próximo do vencimento</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Configuração CSC para NFCe */}
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-white mb-4">CSC para NFCe</h3>

                  <div className="bg-background-card rounded-lg border border-gray-800 p-4">
                    <div className="space-y-6">
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <h4 className="text-blue-400 font-medium mb-2">ℹ️ Sobre o CSC (Código de Segurança do Contribuinte)</h4>
                        <ul className="text-sm text-gray-300 space-y-1">
                          <li>• O CSC é <strong>obrigatório</strong> para emissão de NFCe (modelo 65)</li>
                          <li>• Deve ser solicitado na SEFAZ do seu estado</li>
                          <li>• Códigos diferentes para homologação e produção</li>
                          <li>• Usado para gerar o QR Code da NFCe automaticamente</li>
                          <li>• Formato: até 36 caracteres alfanuméricos</li>
                        </ul>
                      </div>

                      {/* CSC Homologação */}
                      <div>
                        <h4 className="text-orange-400 font-medium mb-3">🧪 CSC para Homologação</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                              CSC Homologação
                            </label>
                            <input
                              type="text"
                              value={cscHomologacao}
                              onChange={(e) => setCscHomologacao(e.target.value.slice(0, 36))}
                              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                              placeholder="Digite o CSC de homologação"
                              maxLength={36}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Máximo 36 caracteres ({cscHomologacao.length}/36)
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                              CSC ID Homologação
                            </label>
                            <input
                              type="number"
                              value={cscIdHomologacao}
                              onChange={(e) => setCscIdHomologacao(e.target.value)}
                              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                              placeholder="Ex: 1"
                              min="1"
                              max="999"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Identificador numérico (1-999)
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* CSC Produção */}
                      <div>
                        <h4 className="text-green-400 font-medium mb-3">🚀 CSC para Produção</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                              CSC Produção
                            </label>
                            <input
                              type="text"
                              value={cscProducao}
                              onChange={(e) => setCscProducao(e.target.value.slice(0, 36))}
                              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                              placeholder="Digite o CSC de produção"
                              maxLength={36}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Máximo 36 caracteres ({cscProducao.length}/36)
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                              CSC ID Produção
                            </label>
                            <input
                              type="number"
                              value={cscIdProducao}
                              onChange={(e) => setCscIdProducao(e.target.value)}
                              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                              placeholder="Ex: 1"
                              min="1"
                              max="999"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Identificador numérico (1-999)
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Botão Salvar */}
                      <div className="pt-2">
                        <Button
                          type="button"
                          variant="primary"
                          onClick={handleSalvarCscNfce}
                          disabled={isSavingCsc}
                          className="w-full md:w-auto"
                        >
                          {isSavingCsc ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                              Salvando...
                            </>
                          ) : (
                            <>
                              💾 Salvar Configuração CSC
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                        <h4 className="text-yellow-400 font-medium mb-2">⚠️ Importante</h4>
                        <ul className="text-sm text-gray-300 space-y-1">
                          <li>• Configure primeiro o CSC de <strong>homologação</strong> para testes</li>
                          <li>• Só configure o CSC de <strong>produção</strong> quando estiver pronto para emitir NFCe oficiais</li>
                          <li>• Mantenha esses códigos em segurança - são únicos da sua empresa</li>
                          <li>• Em caso de dúvidas, consulte a SEFAZ do seu estado</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Configuração de Ambiente NFe */}
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-white mb-4">Ambiente NFe</h3>

                  <div className="bg-background-card rounded-lg border border-gray-800 p-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                          Selecione o ambiente para emissão de NFe
                        </label>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Homologação */}
                          <div
                            onClick={() => handleSalvarAmbienteNFe('2')}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              ambienteNFe === '2'
                                ? 'border-orange-500 bg-orange-500/10'
                                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className={`font-medium ${ambienteNFe === '2' ? 'text-orange-400' : 'text-white'}`}>
                                🧪 Homologação
                              </h4>
                              {ambienteNFe === '2' && (
                                <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-gray-400">
                              Para testes e desenvolvimento. NFe emitidas não têm valor fiscal.
                            </p>
                            <div className="mt-2 text-xs text-orange-400 font-medium">
                              Recomendado para testes
                            </div>
                          </div>

                          {/* Produção */}
                          <div
                            onClick={() => handleSalvarAmbienteNFe('1')}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              ambienteNFe === '1'
                                ? 'border-green-500 bg-green-500/10'
                                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className={`font-medium ${ambienteNFe === '1' ? 'text-green-400' : 'text-white'}`}>
                                🚀 Produção
                              </h4>
                              {ambienteNFe === '1' && (
                                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-gray-400">
                              Para emissão oficial. NFe têm valor fiscal e são enviadas à SEFAZ.
                            </p>
                            <div className="mt-2 text-xs text-green-400 font-medium">
                              Ambiente oficial
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                        <h4 className="text-yellow-400 font-medium mb-2">⚠️ Importante</h4>
                        <ul className="text-sm text-gray-300 space-y-1">
                          <li>• <strong>Homologação:</strong> Use para testes. NFe não têm valor fiscal</li>
                          <li>• <strong>Produção:</strong> Use apenas quando tudo estiver funcionando perfeitamente</li>
                          <li>• Você pode alternar entre os ambientes a qualquer momento</li>
                          <li>• O certificado digital deve ser válido para ambos os ambientes</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'conta':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Gerenciar Conta</h2>
            </div>

            <div className="bg-background-card p-6 rounded-lg border border-gray-800">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">Zona de Perigo</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Esta ação irá deletar permanentemente toda a empresa, incluindo todos os dados, usuários, pedidos, produtos e configurações. Esta ação não pode ser desfeita.
                  </p>

                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setShowDeleteAccountModal(true)}
                    className="!bg-red-500 hover:!bg-red-600 !border-red-500"
                  >
                    🗑️ Deletar Empresa Completa
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-120px)] gap-6">
      {/* Sidebar de Configurações */}
      <div className="w-80 bg-background-card rounded-lg border border-gray-800 p-4 flex flex-col overflow-hidden h-full">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">Configurações</h2>
          <p className="text-gray-400 text-sm">Gerencie as configurações do seu sistema</p>
        </div>

        <nav className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
          {/* Seção Empresa */}
          <div className="mb-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Empresa</h3>
            <button
              onClick={() => handleSectionChange('geral')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                activeSection === 'geral'
                  ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Settings size={18} />
              <span className="text-sm">Dados da Empresa</span>
            </button>
            <button
              onClick={() => handleSectionChange('usuarios')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                activeSection === 'usuarios'
                  ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Users size={18} />
              <span className="text-sm">Usuários</span>
            </button>
            <button
              onClick={() => handleSectionChange('horarios')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                activeSection === 'horarios'
                  ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Clock size={18} />
              <span className="text-sm">Horário de Funcionamento</span>
            </button>
            <button
              onClick={() => handleSectionChange('conexao')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                activeSection === 'conexao'
                  ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <MessageSquare size={18} />
              <span className="text-sm">Conexão</span>
            </button>
            <button
              onClick={() => handleSectionChange('certificado')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                activeSection === 'certificado'
                  ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="14" height="20" x="5" y="2" rx="2" ry="2"></rect>
                <path d="M9 22v-4h6v4"></path>
                <path d="M8 6h.01"></path>
                <path d="M16 6h.01"></path>
                <path d="M12 6h.01"></path>
                <path d="M12 10h.01"></path>
                <path d="M12 14h.01"></path>
                <path d="M16 10h.01"></path>
                <path d="M16 14h.01"></path>
                <path d="M8 10h.01"></path>
                <path d="M8 14h.01"></path>
              </svg>
              <span className="text-sm">Certificado Digital</span>
            </button>
          </div>

          {/* Seção Operações */}
          <div className="mb-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Operações</h3>
            <button
              onClick={() => handleSectionChange('estoque')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                activeSection === 'estoque'
                  ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 20h20"></path>
                <path d="M5 20V7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v13"></path>
                <path d="M13 20V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v17"></path>
              </svg>
              <span className="text-sm">Estoque</span>
            </button>
            <button
              onClick={() => handleSectionChange('pedidos')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                activeSection === 'pedidos'
                  ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                <path d="M9 12h6"></path>
                <path d="M9 16h6"></path>
              </svg>
              <span className="text-sm">Pedidos</span>
            </button>
            <button
              onClick={() => handleSectionChange('pdv')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                activeSection === 'pdv'
                  ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <ShoppingCart size={18} />
              <span className="text-sm">PDV</span>
            </button>
            <button
              onClick={() => handleSectionChange('produtos')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                activeSection === 'produtos'
                  ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3h18v18H3zM9 9h6v6H9z"></path>
              </svg>
              <span className="text-sm">Produtos</span>
            </button>
            <button
              onClick={() => handleSectionChange('taxaentrega')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                activeSection === 'taxaentrega'
                  ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Truck size={18} />
              <span className="text-sm">Taxa de Entrega</span>
            </button>
            <button
              onClick={() => handleSectionChange('tabelaprecos')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                activeSection === 'tabelaprecos'
                  ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <DollarSign size={18} />
              <span className="text-sm">Tabela de Preços</span>
            </button>
          </div>

          {/* Seção Sistema */}
          <div>
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Sistema</h3>
            <button
              onClick={() => handleSectionChange('conta')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                activeSection === 'conta'
                  ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span className="text-sm">Conta</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Área de Conteúdo */}
      <div className="flex-1 bg-background-card rounded-lg border border-gray-800 overflow-hidden">
        <div className="h-full overflow-y-auto custom-scrollbar">
          <div className="p-6">
            {sectionLoading ? <ConfigSkeletonLoader /> : renderContent()}
          </div>
        </div>
      </div>

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
                    {activeSection === 'pagamentos' && 'Nova Forma de Pagamento'}
                    {activeSection === 'usuarios'  && (isEditingUsuario ? 'Editar Usuário' : 'Novo Usuário')}
                    {activeSection === 'perfis' && 'Novo Perfil'}
                    {activeSection === 'geral' && 'Editar Dados da Empresa'}
                    {activeSection === 'horarios' && (isEditingHorario ? 'Editar Horário de Atendimento' : 'Novo Horário de Atendimento')}
                  </h2>
                  <button
                    onClick={() => {
                      setShowSidebar(false);
                      if (activeSection === 'horarios' && isEditingHorario) {
                        setIsEditingHorario(false);
                        setHorarioForm({
                          id: '',
                          dia_semana: '0',
                          hora_abertura: '08:00',
                          hora_fechamento: '18:00'
                        });
                      }
                      // Limpar erros e formulário de usuário quando fechar o sidebar
                      if (activeSection === 'usuarios') {
                        setFormErrors({
                          senha: '',
                          email: '',
                          serie_nfce: ''
                        });
                        setUsuarioForm({
                          id: '',
                          nome: '',
                          email: '',
                          senha: '',
                          confirmarSenha: '',
                          tipo_user_config_id: '',
                          serie_nfce: 1
                        });
                        setIsEditingUsuario(false); // Resetar o modo de edição
                      }
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                {activeSection === 'pagamentos' && (
                  <form onSubmit={handleSubmitPagamento} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Tipo de Pagamento
                      </label>
                      <select
                        value={selectedTipo}
                        onChange={(e) => setSelectedTipo(e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                      >
                        <option value="">Selecione um tipo</option>
                        {tiposPagamento.map(tipo => (
                          <option key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </option>
                        ))}
                      </select>
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
                        disabled={isLoading || !selectedTipo}
                      >
                        {isLoading ? 'Salvando...' : 'Salvar'}
                      </Button>
                    </div>
                  </form>
                )}

                {activeSection === 'usuarios' && (
                  <form onSubmit={handleSubmitUsuario} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Nome
                      </label>
                      <input
                        type="text"
                        value={usuarioForm.nome}
                        onChange={(e) => setUsuarioForm(prev => ({ ...prev, nome: e.target.value }))}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        placeholder="Digite o nome completo"
                        required
                      />
                    </div>

                    <div>
                      <MultiSelect
                        label="Tipos de Usuário"
                        options={tiposUsuario.map(tipo => ({
                          value: tipo.id,
                          label: `${tipo.tipo.charAt(0).toUpperCase() + tipo.tipo.slice(1)} - ${tipo.descricao || ''}`
                        }))}
                        value={usuarioForm.tipo_user_config_id}
                        onChange={(value) => setUsuarioForm(prev => ({ ...prev, tipo_user_config_id: value }))}
                        placeholder="Selecione os tipos de usuário"
                        required
                      />
                    </div>

                    {/* Campos de comissão para vendedores */}
                    {(() => {
                      return usuarioForm.tipo_user_config_id.some(tipoId => {
                        const tipo = tiposUsuario.find(t => t.id === tipoId);
                        return tipo?.tipo === 'vendedor';
                      });
                    })() && (
                      <div className="space-y-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                        <h4 className="text-sm font-medium text-gray-300">Configurações de Comissão</h4>

                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Tipo de Comissão
                          </label>
                          <div className="space-y-2">
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="tipo_comissao"
                                value="total_venda"
                                checked={usuarioForm.tipo_comissao === 'total_venda'}
                                onChange={(e) => setUsuarioForm(prev => ({ ...prev, tipo_comissao: e.target.value }))}
                                className="mr-2 text-primary-500 focus:ring-primary-500"
                              />
                              <span className="text-gray-300">Total da Venda</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="tipo_comissao"
                                value="grupos"
                                checked={usuarioForm.tipo_comissao === 'grupos'}
                                onChange={(e) => setUsuarioForm(prev => ({ ...prev, tipo_comissao: e.target.value }))}
                                className="mr-2 text-primary-500 focus:ring-primary-500"
                              />
                              <span className="text-gray-300">Grupos</span>
                            </label>
                          </div>
                        </div>

                        {usuarioForm.tipo_comissao === 'total_venda' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                              Percentual de Comissão (%)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={usuarioForm.percentual_comissao}
                              onChange={(e) => setUsuarioForm(prev => ({ ...prev, percentual_comissao: parseFloat(e.target.value) || 0 }))}
                              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                              placeholder="Ex: 5.00"
                            />
                          </div>
                        )}

                        {usuarioForm.tipo_comissao === 'grupos' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                              Grupos de Produtos com Comissão
                            </label>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {grupos
                                .filter(grupo => grupo.comissao_percentual > 0) // Filtrar apenas grupos com comissão
                                .map(grupo => (
                                <label key={grupo.id} className="flex items-center justify-between p-2 bg-gray-800/20 rounded">
                                  <div className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={usuarioForm.grupos_comissao.includes(grupo.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setUsuarioForm(prev => ({
                                            ...prev,
                                            grupos_comissao: [...prev.grupos_comissao, grupo.id]
                                          }));
                                        } else {
                                          setUsuarioForm(prev => ({
                                            ...prev,
                                            grupos_comissao: prev.grupos_comissao.filter(id => id !== grupo.id)
                                          }));
                                        }
                                      }}
                                      className="mr-2 text-primary-500 focus:ring-primary-500"
                                    />
                                    <span className="text-gray-300">{grupo.nome}</span>
                                  </div>
                                  <span className="text-sm text-green-400">
                                    {grupo.comissao_percentual}%
                                  </span>
                                </label>
                              ))}
                              {grupos.filter(grupo => grupo.comissao_percentual > 0).length === 0 && (
                                <div className="text-center py-4">
                                  <p className="text-gray-500 text-sm mb-2">Nenhum grupo com comissão configurada</p>
                                  <p className="text-gray-400 text-xs">
                                    Configure comissão nos grupos em: Produtos → Grupos
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={usuarioForm.email}
                        onChange={(e) => {
                          setUsuarioForm(prev => ({ ...prev, email: e.target.value }));
                          // Limpar erro de email quando o usuário digita
                          if (formErrors.email) {
                            setFormErrors(prev => ({ ...prev, email: '' }));
                          }
                        }}
                        className={`w-full bg-gray-800/50 border ${formErrors.email ? 'border-red-500' : 'border-gray-700'} rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20`}
                        placeholder="Digite o email"
                        required={!isEditingUsuario}
                        disabled={isEditingUsuario} // Desabilitar o campo de email no modo de edição
                        readOnly={isEditingUsuario} // Somente leitura no modo de edição
                      />
                      {formErrors.email && (
                        <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
                      )}
                      {isEditingUsuario && (
                        <p className="text-blue-400 text-xs mt-1">O email não pode ser alterado</p>
                      )}
                    </div>

                    {/* ✅ NOVO: Campo Série NFC-e */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Série NFC-e
                      </label>
                      <input
                        type="number"
                        value={usuarioForm.serie_nfce}
                        onChange={(e) => {
                          const valor = parseInt(e.target.value) || 1;
                          setUsuarioForm(prev => ({ ...prev, serie_nfce: valor }));
                          // Limpar erro de série quando o usuário digita
                          if (formErrors.serie_nfce) {
                            setFormErrors(prev => ({ ...prev, serie_nfce: '' }));
                          }
                        }}
                        className={`w-full bg-gray-800/50 border ${formErrors.serie_nfce ? 'border-red-500' : 'border-gray-700'} rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20`}
                        placeholder="Digite a série da NFC-e"
                        min="1"
                        max="999"
                        required
                      />
                      {formErrors.serie_nfce && (
                        <p className="text-red-500 text-sm mt-1">{formErrors.serie_nfce}</p>
                      )}
                      <p className="text-blue-400 text-xs mt-1">
                        Cada usuário deve ter uma série única para evitar conflitos na numeração das NFC-e
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Senha {isEditingUsuario && <span className="text-gray-500 text-xs">(opcional)</span>}
                      </label>
                      <div className="relative">
                        <input
                          type={mostrarSenha ? "text" : "password"}
                          value={usuarioForm.senha}
                          onChange={(e) => {
                            setUsuarioForm(prev => ({ ...prev, senha: e.target.value }));
                            // Limpar erro de senha quando o usuário digita
                            if (formErrors.senha) {
                              setFormErrors(prev => ({ ...prev, senha: '' }));
                            }
                          }}
                          className={`w-full bg-gray-800/50 border ${formErrors.senha ? 'border-red-500' : 'border-gray-700'} rounded-lg py-2 pl-3 pr-10 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20`}
                          placeholder={isEditingUsuario ? "Digite para alterar a senha" : "Digite a senha"}
                          required={!isEditingUsuario}
                        />
                        <button
                          type="button"
                          onClick={() => setMostrarSenha(!mostrarSenha)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {isEditingUsuario && (
                        <p className="text-blue-400 text-xs mt-1">Deixe em branco para manter a senha atual</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Confirmar Senha {isEditingUsuario && <span className="text-gray-500 text-xs">(opcional)</span>}
                      </label>
                      <div className="relative">
                        <input
                          type={mostrarConfirmarSenha ? "text" : "password"}
                          value={usuarioForm.confirmarSenha}
                          onChange={(e) => {
                            setUsuarioForm(prev => ({ ...prev, confirmarSenha: e.target.value }));
                            // Limpar erro de senha quando o usuário digita
                            if (formErrors.senha) {
                              setFormErrors(prev => ({ ...prev, senha: '' }));
                            }
                          }}
                          className={`w-full bg-gray-800/50 border ${formErrors.senha ? 'border-red-500' : 'border-gray-700'} rounded-lg py-2 pl-3 pr-10 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20`}
                          placeholder={isEditingUsuario ? "Confirme a nova senha" : "Confirme a senha"}
                          required={!isEditingUsuario}
                          disabled={isEditingUsuario && !usuarioForm.senha} // Desabilitar se estiver editando e não tiver senha
                        />
                        <button
                          type="button"
                          onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          {mostrarConfirmarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {formErrors.senha && (
                        <p className="text-red-500 text-sm mt-1">{formErrors.senha}</p>
                      )}
                    </div>

                    <div className="flex gap-4 pt-4">
                      <Button
                        type="button"
                        variant="text"
                        className="flex-1"
                        onClick={() => {
                          setShowSidebar(false);
                          // Limpar erros e formulário
                          setFormErrors({
                            senha: '',
                            email: '',
                            serie_nfce: ''
                          });
                          setUsuarioForm({
                            id: '',
                            nome: '',
                            email: '',
                            senha: '',
                            confirmarSenha: '',
                            tipo_user_config_id: '',
                            serie_nfce: 1,
                            tipo_comissao: 'total_venda',
                            percentual_comissao: 0,
                            grupos_comissao: []
                          });
                          setIsEditingUsuario(false); // Resetar o modo de edição
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
                        {isLoading
                          ? (isEditingUsuario ? 'Salvando...' : 'Criando...')
                          : (isEditingUsuario ? 'Salvar Alterações' : 'Criar Usuário')
                        }
                      </Button>
                    </div>
                  </form>
                )}

                {activeSection === 'horarios' && (
                  <form onSubmit={handleSubmitHorario} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Dia da Semana
                      </label>
                      <select
                        value={horarioForm.dia_semana}
                        onChange={(e) => setHorarioForm(prev => ({ ...prev, dia_semana: e.target.value }))}
                        className={`w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 ${isEditingHorario ? 'opacity-60' : ''}`}
                        disabled={isEditingHorario}
                        required
                      >
                        <option value="0">Domingo</option>
                        <option value="1">Segunda-feira</option>
                        <option value="2">Terça-feira</option>
                        <option value="3">Quarta-feira</option>
                        <option value="4">Quinta-feira</option>
                        <option value="5">Sexta-feira</option>
                        <option value="6">Sábado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Horário de Abertura
                      </label>
                      <input
                        type="time"
                        value={horarioForm.hora_abertura}
                        onChange={(e) => setHorarioForm(prev => ({ ...prev, hora_abertura: e.target.value }))}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Horário de Fechamento
                      </label>
                      <input
                        type="time"
                        value={horarioForm.hora_fechamento}
                        onChange={(e) => setHorarioForm(prev => ({ ...prev, hora_fechamento: e.target.value }))}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        required
                      />
                    </div>

                    <div className="bg-gray-800/50 p-4 rounded-lg mt-2">
                      <p className="text-sm text-yellow-400">
                        <strong>Importante:</strong> O horário de fechamento deve ser maior que o horário de abertura. Caso contrário, não será possível salvar.
                      </p>
                      {isEditingHorario && (
                        <p className="text-sm text-blue-400 mt-2">
                          <strong>Modo de edição:</strong> Você está editando o horário para {['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][parseInt(horarioForm.dia_semana)]}.
                        </p>
                      )}
                    </div>

                    <div className="flex gap-4 pt-4">
                      <Button
                        type="button"
                        variant="text"
                        className="flex-1"
                        onClick={() => {
                          setShowSidebar(false);
                          if (isEditingHorario) {
                            setIsEditingHorario(false);
                            setHorarioForm({
                              id: '',
                              dia_semana: '0',
                              hora_abertura: '08:00',
                              hora_fechamento: '18:00'
                            });
                          }
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
                        {isLoading ? 'Salvando...' : 'Salvar'}
                      </Button>
                    </div>
                  </form>
                )}

                {activeSection === 'geral' && (
                  <form onSubmit={handleSubmitEmpresa} className="space-y-6">
                    <div>
                      <SearchableSelect
                        label="Segmento"
                        value={empresaForm.segmento}
                        onChange={(value) => setEmpresaForm(prev => ({ ...prev, segmento: value }))}
                        options={segmentos.map(segmento => ({ value: segmento, label: segmento }))}
                        placeholder="Selecione um segmento"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Tipo de Documento
                      </label>
                      <div className="flex gap-4 mb-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={empresaForm.tipo_documento === 'CNPJ'}
                            onChange={() => setEmpresaForm(prev => ({ ...prev, tipo_documento: 'CNPJ', documento: '' }))}
                            className="mr-2"
                          />
                          CNPJ
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={empresaForm.tipo_documento === 'CPF'}
                            onChange={() => setEmpresaForm(prev => ({ ...prev, tipo_documento: 'CPF', documento: '' }))}
                            className="mr-2"
                          />
                          CPF
                        </label>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={empresaForm.documento}
                          onChange={handleDocumentoChange}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-3 pr-10 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                          placeholder={`Digite o ${empresaForm.tipo_documento}`}
                        />
                        {empresaForm.tipo_documento === 'CNPJ' && (
                          <button
                            type="button"
                            onClick={buscarCNPJ}
                            disabled={isCnpjLoading}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white disabled:opacity-50"
                          >
                            {isCnpjLoading ? (
                              <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin"></div>
                            ) : (
                              <Search size={18} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {empresaForm.tipo_documento === 'CNPJ' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Razão Social
                        </label>
                        <input
                          type="text"
                          value={empresaForm.razao_social}
                          onChange={(e) => setEmpresaForm(prev => ({ ...prev, razao_social: e.target.value }))}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                          placeholder="Digite a razão social"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Nome Fantasia
                      </label>
                      <input
                        type="text"
                        value={empresaForm.nome_fantasia}
                        onChange={(e) => setEmpresaForm(prev => ({ ...prev, nome_fantasia: e.target.value }))}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        placeholder="Digite o nome fantasia"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Nome do Proprietário
                      </label>
                      <input
                        type="text"
                        value={empresaForm.nome_proprietario}
                        onChange={(e) => setEmpresaForm(prev => ({ ...prev, nome_proprietario: e.target.value }))}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        placeholder="Digite o nome do proprietário"
                      />
                    </div>

                    {/* Sistema de múltiplos telefones */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Telefones *
                      </label>

                      {/* Lista de telefones adicionados */}
                      {empresaForm.telefones.length > 0 && (
                        <div className="mb-3 space-y-2">
                          {empresaForm.telefones.map((tel, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between bg-gray-800/70 rounded-lg p-2 border border-gray-700"
                            >
                              <div className="flex items-center gap-2">
                                {/* Ícone baseado no tipo e WhatsApp */}
                                {tel.tipo === 'Celular' && tel.whatsapp ? (
                                  <svg className="w-[18px] h-[18px] text-green-500" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.515z"/>
                                  </svg>
                                ) : (
                                  <Phone size={18} className={tel.tipo === 'Celular' ? "text-blue-500" : "text-gray-500"} />
                                )}
                                <div>
                                  <p className="text-white">{tel.numero}</p>
                                  <p className="text-xs text-gray-400">
                                    {tel.tipo}{tel.whatsapp ? " - WhatsApp" : ""}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removerTelefoneEmpresa(index)}
                                className="text-red-400 hover:text-red-300 p-1"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Formulário para adicionar novo telefone */}
                      <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700">
                        <h4 className="text-sm font-medium text-gray-300 mb-3">Adicionar telefone</h4>

                        {/* Tipo de telefone */}
                        <div className="flex gap-4 mb-3">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              checked={novoTelefoneEmpresa.tipo === 'Celular'}
                              onChange={() => setNovoTelefoneEmpresa(prev => ({ ...prev, tipo: 'Celular', numero: '' }))}
                              className="mr-2 text-primary-500"
                            />
                            <span className="text-white text-sm">Celular</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              checked={novoTelefoneEmpresa.tipo === 'Fixo'}
                              onChange={() => setNovoTelefoneEmpresa(prev => ({ ...prev, tipo: 'Fixo', numero: '' }))}
                              className="mr-2 text-primary-500"
                            />
                            <span className="text-white text-sm">Fixo</span>
                          </label>
                        </div>

                        {/* Checkbox WhatsApp */}
                        <div className="mb-3">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={novoTelefoneEmpresa.whatsapp}
                              onChange={(e) => setNovoTelefoneEmpresa(prev => ({ ...prev, whatsapp: e.target.checked }))}
                              className="mr-2 text-primary-500"
                            />
                            <span className="text-white text-sm">Este número tem WhatsApp</span>
                          </label>
                        </div>

                        {/* Campo de telefone */}
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Phone size={18} className="text-gray-500" />
                            </div>
                            <input
                              type="text"
                              value={novoTelefoneEmpresa.numero}
                              onChange={handleNovoTelefoneEmpresaChange}
                              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                              placeholder={novoTelefoneEmpresa.tipo === 'Celular' ? "(00) 0 0000-0000" : "(00) 0000-0000"}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={adicionarTelefoneEmpresa}
                            className="bg-primary-500 hover:bg-primary-600 text-white px-3 py-2 rounded-lg transition-colors"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        CEP
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={empresaForm.cep}
                          onChange={(e) => setEmpresaForm(prev => ({ ...prev, cep: formatCEP(e.target.value) }))}
                          onBlur={buscarCEP}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-3 pr-10 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                          placeholder="00000-000"
                        />
                        <button
                          type="button"
                          onClick={buscarCEP}
                          disabled={isCepLoading}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white disabled:opacity-50"
                        >
                          {isCepLoading ? (
                            <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin"></div>
                          ) : (
                            <Search size={18} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Endereço
                      </label>
                      <input
                        type="text"
                        value={empresaForm.endereco}
                        onChange={(e) => setEmpresaForm(prev => ({ ...prev, endereco: e.target.value }))}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        placeholder="Digite o endereço"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Número
                        </label>
                        <input
                          type="text"
                          value={empresaForm.numero}
                          onChange={(e) => setEmpresaForm(prev => ({ ...prev, numero: e.target.value }))}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                          placeholder="Nº"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Complemento
                        </label>
                        <input
                          type="text"
                          value={empresaForm.complemento}
                          onChange={(e) => setEmpresaForm(prev => ({ ...prev, complemento: e.target.value }))}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                          placeholder="Complemento"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Bairro
                      </label>
                      <input
                        type="text"
                        value={empresaForm.bairro}
                        onChange={(e) => setEmpresaForm(prev => ({ ...prev, bairro: e.target.value }))}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        placeholder="Digite o bairro"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Cidade
                        </label>
                        <input
                          type="text"
                          value={empresaForm.cidade}
                          onChange={(e) => setEmpresaForm(prev => ({ ...prev, cidade: e.target.value }))}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                          placeholder="Digite a cidade"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Estado
                        </label>
                        <input
                          type="text"
                          value={empresaForm.estado}
                          onChange={(e) => setEmpresaForm(prev => ({ ...prev, estado: e.target.value }))}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                          placeholder="UF"
                          maxLength={2}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Código do Município (IBGE) *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={empresaForm.codigo_municipio}
                          onChange={(e) => setEmpresaForm(prev => ({ ...prev, codigo_municipio: e.target.value }))}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-3 pr-10 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                          placeholder="3525904 (7 dígitos)"
                          maxLength={7}
                          pattern="[0-9]{7}"
                          required
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            if (empresaForm.cidade && empresaForm.estado) {
                              const codigoIBGE = await buscarCodigoIBGE(empresaForm.cidade, empresaForm.estado);
                              if (codigoIBGE) {
                                setEmpresaForm(prev => ({ ...prev, codigo_municipio: codigoIBGE }));
                                showMessage('success', 'Código IBGE encontrado!');
                              } else {
                                showMessage('error', 'Código IBGE não encontrado para esta cidade/estado.');
                              }
                            } else {
                              showMessage('error', 'Preencha cidade e estado primeiro.');
                            }
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                          title="Buscar código IBGE automaticamente"
                        >
                          <Search size={18} />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Código IBGE de 7 dígitos do município (obrigatório para NFe). Preenchido automaticamente ao buscar por CNPJ ou CEP.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Email da Empresa *
                        </label>
                        <input
                          type="email"
                          value={empresaForm.email}
                          onChange={(e) => setEmpresaForm(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                          placeholder="contato@empresa.com.br"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Inscrição Estadual *
                        </label>
                        <input
                          type="text"
                          value={empresaForm.inscricao_estadual}
                          onChange={handleInscricaoEstadualChange}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                          placeholder="123456789012 (12 dígitos)"
                          maxLength={12}
                          pattern="[0-9]{12}"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Apenas números, exatamente 12 dígitos
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Regime Tributário *
                      </label>
                      <select
                        value={empresaForm.regime_tributario}
                        onChange={(e) => setEmpresaForm(prev => ({ ...prev, regime_tributario: parseInt(e.target.value) }))}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        required
                      >
                        <option value={1}>1 - Simples Nacional</option>
                        <option value={2}>2 - Simples Nacional - Excesso</option>
                        <option value={3}>3 - Regime Normal</option>
                        <option value={4}>4 - MEI - Microempreendedor Individual</option>
                      </select>
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
                        {isLoading ? 'Salvando...' : 'Salvar'}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <DeleteConfirmation
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}
        onConfirm={deleteConfirmation.itemType === 'toggle_status' ? handleConfirmToggleStatus : handleConfirmDelete}
        title={deleteConfirmation.title}
        message={deleteConfirmation.message}
      />

      {/* Modal de confirmação para deletar conta */}
      <AnimatePresence>
        {showDeleteAccountModal && (
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
              className="bg-background-card p-6 rounded-lg shadow-xl max-w-md mx-4 w-full border border-red-500/20"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">⚠️ DELETAR EMPRESA COMPLETA</h3>
                <p className="text-gray-400 text-sm">
                  Esta ação irá deletar <strong>PERMANENTEMENTE</strong> toda a empresa e todos os dados associados:
                </p>
                <ul className="text-left text-gray-400 text-sm mt-3 space-y-1">
                  <li>• Todos os usuários e contas</li>
                  <li>• Todos os pedidos e histórico</li>
                  <li>• Todos os produtos e estoque</li>
                  <li>• Todos os clientes</li>
                  <li>• Todas as configurações</li>
                </ul>
                <p className="text-red-400 text-sm mt-3 font-medium">
                  Esta ação NÃO PODE ser desfeita!
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Senha de Desenvolvedor
                  </label>
                  <input
                    type="password"
                    value={devPassword}
                    onChange={(e) => setDevPassword(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                    placeholder="Digite a senha de desenvolvedor"
                    autoFocus
                  />
                  <p className="text-gray-500 text-xs mt-1">
                    Esta senha é necessária para confirmar a exclusão da empresa.
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="text"
                    className="flex-1"
                    onClick={() => {
                      setShowDeleteAccountModal(false);
                      setDevPassword('');
                    }}
                    disabled={isDeletingAccount}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    className="flex-1 !bg-red-500 hover:!bg-red-600 !border-red-500"
                    onClick={handleDeleteAccount}
                    disabled={isDeletingAccount || !devPassword.trim()}
                  >
                    {isDeletingAccount ? 'Deletando...' : 'DELETAR EMPRESA'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação para Remover Certificado */}
      <AnimatePresence>
        {showRemoveCertificadoModal && (
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
              className="bg-background-card p-6 rounded-lg shadow-xl max-w-md mx-4 w-full border border-red-500/20"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                    <rect width="14" height="20" x="5" y="2" rx="2" ry="2"></rect>
                    <path d="M9 22v-4h6v4"></path>
                    <path d="M8 6h.01"></path>
                    <path d="M16 6h.01"></path>
                    <path d="M12 6h.01"></path>
                    <path d="M12 10h.01"></path>
                    <path d="M12 14h.01"></path>
                    <path d="M16 10h.01"></path>
                    <path d="M16 14h.01"></path>
                    <path d="M8 10h.01"></path>
                    <path d="M8 14h.01"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Remover Certificado Digital</h3>
                <p className="text-gray-400 mb-4">
                  Tem certeza que deseja remover o certificado digital? Esta ação irá impedir a emissão de NFe até que um novo certificado seja configurado.
                </p>

                {certificadoInfo?.certificado_digital_nome && (
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 mb-4">
                    <p className="text-sm text-gray-300">
                      <strong>Certificado:</strong> {certificadoInfo.certificado_digital_nome}
                    </p>
                    {certificadoInfo.certificado_digital_validade && (
                      <p className="text-sm text-gray-300">
                        <strong>Validade:</strong> {new Date(certificadoInfo.certificado_digital_validade).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="text"
                  className="flex-1"
                  onClick={() => setShowRemoveCertificadoModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  className="flex-1 !bg-red-500 hover:!bg-red-600 !border-red-500"
                  onClick={handleRemoverCertificado}
                >
                  🗑️ Remover Certificado
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Validação NFe */}
      <NFeValidationModal
        isOpen={nfeValidationModal.isOpen}
        onClose={() => setNfeValidationModal(prev => ({ ...prev, isOpen: false }))}
        campo={nfeValidationModal.campo}
        valor={nfeValidationModal.valor}
        validationResult={nfeValidationModal.validationResult}
        onCorrect={(newValue) => {
          // Aplicar correção baseada no campo
          if (nfeValidationModal.campo === 'Razão Social da Empresa') {
            setEmpresaForm(prev => ({ ...prev, razao_social: newValue }));
          } else if (nfeValidationModal.campo === 'Nome Fantasia da Empresa') {
            setEmpresaForm(prev => ({ ...prev, nome_fantasia: newValue }));
          } else if (nfeValidationModal.campo === 'Nome do Proprietário') {
            setEmpresaForm(prev => ({ ...prev, nome_proprietario: newValue }));
          } else if (nfeValidationModal.campo === 'Endereço da Empresa') {
            setEmpresaForm(prev => ({ ...prev, endereco: newValue }));
          } else if (nfeValidationModal.campo === 'Bairro da Empresa') {
            setEmpresaForm(prev => ({ ...prev, bairro: newValue }));
          } else if (nfeValidationModal.campo === 'Cidade da Empresa') {
            setEmpresaForm(prev => ({ ...prev, cidade: newValue }));
          } else if (nfeValidationModal.campo === 'Complemento da Empresa') {
            setEmpresaForm(prev => ({ ...prev, complemento: newValue }));
          }
          setNfeValidationModal(prev => ({ ...prev, isOpen: false }));
        }}
      />

      {/* Modal para Criar/Editar Tabela de Preços */}
      <AnimatePresence>
        {showModalTabelaPrecos && (
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
              className="bg-background-card p-6 rounded-lg shadow-xl max-w-md mx-4 w-full border border-gray-800"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">
                  {tabelaPrecosSelecionada ? 'Editar Tabela' : 'Nova Tabela de Preços'}
                </h3>
                <button
                  onClick={() => setShowModalTabelaPrecos(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Nome da Tabela */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nome da Tabela *
                  </label>
                  <input
                    type="text"
                    value={nomeNovaTabela}
                    onChange={(e) => setNomeNovaTabela(e.target.value)}
                    placeholder="Ex: Pizza Pequena, Atacado 10un, Prato Executivo"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Quantidade de Sabores (só aparece se "Trabalha com Sabores" estiver ativo) */}
                {trabalhaComSabores && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Quantidade Máxima de Sabores
                    </label>
                    <select
                      value={quantidadeSabores}
                      onChange={(e) => setQuantidadeSabores(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value={1}>1 sabor</option>
                      <option value={2}>2 sabores (meio a meio)</option>
                      <option value={3}>3 sabores</option>
                      <option value={4}>4 sabores</option>
                      <option value={5}>5 sabores</option>
                      <option value={6}>6 sabores</option>
                    </select>
                    <p className="text-sm text-gray-400 mt-1">
                      Define quantos sabores diferentes o cliente pode escolher nesta tabela.
                    </p>
                  </div>
                )}

                {/* Exemplo visual */}
                <div className="p-3 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                  <h4 className="text-blue-400 font-medium text-sm mb-2">💡 Exemplo:</h4>
                  <p className="text-blue-300/80 text-sm">
                    {nomeNovaTabela || 'Nome da Tabela'}
                    {trabalhaComSabores && ` - até ${quantidadeSabores} sabor${quantidadeSabores > 1 ? 'es' : ''}`}
                  </p>
                  {trabalhaComSabores && quantidadeSabores > 1 && (
                    <p className="text-blue-300/60 text-xs mt-1">
                      No cardápio aparecerá: "Escolha até {quantidadeSabores} sabores"
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowModalTabelaPrecos(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={async () => {
                    if (!nomeNovaTabela.trim()) {
                      showMessage('error', 'Por favor, informe o nome da tabela');
                      return;
                    }

                    try {
                      console.log('🔍 Debug Modal:', {
                        tabelaPrecosSelecionada,
                        nomeNovaTabela,
                        quantidadeSabores,
                        isEditing: !!tabelaPrecosSelecionada
                      });

                      if (tabelaPrecosSelecionada) {
                        // Editar tabela existente
                        console.log('✏️ Editando tabela:', tabelaPrecosSelecionada.id);
                        await handleEditarTabela(tabelaPrecosSelecionada.id, nomeNovaTabela, quantidadeSabores);
                        showMessage('success', 'Tabela atualizada com sucesso!');
                      } else {
                        // Criar nova tabela
                        console.log('➕ Criando nova tabela');
                        await handleSalvarNovaTabela(nomeNovaTabela, quantidadeSabores);
                        showMessage('success', 'Tabela criada com sucesso!');
                      }

                      setShowModalTabelaPrecos(false);
                    } catch (error: any) {
                      if (error.code === '23505') {
                        showMessage('error', 'Já existe uma tabela com este nome');
                      } else {
                        showMessage('error', `Erro ao ${tabelaPrecosSelecionada ? 'atualizar' : 'criar'} tabela`);
                      }
                    }
                  }}
                  disabled={!nomeNovaTabela.trim()}
                  className="flex-1"
                >
                  {tabelaPrecosSelecionada ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal para Adicionar Forma de Pagamento */}
      <AnimatePresence>
        {showModalFormaPagamento && (
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
              className="bg-background-card p-6 rounded-lg shadow-xl max-w-md mx-4 w-full border border-gray-800"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">
                  {editingFormaPagamento ? 'Editar Forma de Pagamento' : 'Adicionar Forma de Pagamento'}
                </h3>
                <button
                  onClick={() => {
                    setShowModalFormaPagamento(false);
                    setEditingFormaPagamento(null);
                    setNovaFormaPagamento({
                      forma_pagamento_opcao_id: '',
                      cardapio_digital: false,
                      max_parcelas: 1,
                      juros_por_parcela: 0
                    });
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Dropdown Forma de Pagamento */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Forma de Pagamento *
                  </label>
                  <select
                    value={novaFormaPagamento.forma_pagamento_opcao_id}
                    onChange={(e) => {
                      const opcaoSelecionada = formasPagamentoOpcoes.find(op => op.id === e.target.value);
                      setNovaFormaPagamento(prev => ({
                        ...prev,
                        forma_pagamento_opcao_id: e.target.value,
                        max_parcelas: opcaoSelecionada?.tipo === 'cartao_credito' ? opcaoSelecionada.max_parcelas || 12 : 1
                      }));
                    }}
                    disabled={editingFormaPagamento}
                    className={`w-full px-3 py-2 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      editingFormaPagamento ? 'bg-gray-600 cursor-not-allowed' : 'bg-gray-700'
                    }`}
                  >
                    <option value="">Selecione uma forma de pagamento</option>
                    {formasPagamentoOpcoes
                      .filter(opcao => !formasPagamentoEmpresa.some(emp => emp.forma_pagamento_opcao_id === opcao.id))
                      .map(opcao => (
                        <option key={opcao.id} value={opcao.id}>
                          {opcao.nome}
                        </option>
                      ))
                    }
                  </select>
                </div>

                {/* Checkbox Cardápio Digital */}
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={novaFormaPagamento.cardapio_digital}
                      onChange={(e) => setNovaFormaPagamento(prev => ({
                        ...prev,
                        cardapio_digital: e.target.checked
                      }))}
                      className="w-4 h-4 text-primary-500 bg-gray-700 border-gray-600 rounded focus:ring-primary-500 focus:ring-2"
                    />
                    <span className="text-white">Disponível no Cardápio Digital</span>
                  </label>
                  <p className="text-sm text-gray-400 mt-1 ml-7">
                    Quando marcado, esta forma de pagamento aparecerá como opção no cardápio digital.
                  </p>
                </div>

                {/* Campos específicos para Cartão de Crédito */}
                {(() => {
                  const opcaoSelecionada = formasPagamentoOpcoes.find(op => op.id === novaFormaPagamento.forma_pagamento_opcao_id);
                  return opcaoSelecionada?.tipo === 'cartao_credito' && (
                    <>
                      {/* Máximo de Parcelas */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Máximo de Parcelas
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="24"
                          value={novaFormaPagamento.max_parcelas}
                          onChange={(e) => setNovaFormaPagamento(prev => ({
                            ...prev,
                            max_parcelas: parseInt(e.target.value) || 1
                          }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="12"
                        />
                      </div>

                      {/* Juros por Parcela */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Juros por Parcela (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={novaFormaPagamento.juros_por_parcela}
                          onChange={(e) => setNovaFormaPagamento(prev => ({
                            ...prev,
                            juros_por_parcela: parseFloat(e.target.value) || 0
                          }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="0.00"
                        />
                        <p className="text-sm text-gray-400 mt-1">
                          Percentual de juros aplicado por parcela. Deixe 0 para sem juros.
                        </p>
                      </div>
                    </>
                  );
                })()}

                {/* Campos específicos para PIX */}
                {(() => {
                  const opcaoSelecionada = formasPagamentoOpcoes.find(op => op.id === novaFormaPagamento.forma_pagamento_opcao_id);
                  return opcaoSelecionada?.tipo === 'pix' && (
                    <>
                      {/* Checkbox Utilizar Chave PIX */}
                      <div>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={novaFormaPagamento.utilizar_chave_pix}
                            onChange={(e) => {
                              setNovaFormaPagamento(prev => ({
                                ...prev,
                                utilizar_chave_pix: e.target.checked,
                                tipo_chave_pix: e.target.checked ? prev.tipo_chave_pix : '',
                                chave_pix: e.target.checked ? prev.chave_pix : ''
                              }));
                            }}
                            className="w-4 h-4 text-primary-500 bg-gray-700 border-gray-600 rounded focus:ring-primary-500 focus:ring-2"
                          />
                          <span className="text-white">Utilizar chave PIX</span>
                        </label>
                        <p className="text-sm text-gray-400 mt-1 ml-7">
                          Configure uma chave PIX para facilitar os pagamentos dos clientes.
                        </p>
                      </div>

                      {/* Dropdown Tipo de Chave PIX */}
                      {novaFormaPagamento.utilizar_chave_pix && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Tipo de Chave PIX *
                            </label>
                            <select
                              value={novaFormaPagamento.tipo_chave_pix}
                              onChange={(e) => {
                                setNovaFormaPagamento(prev => ({
                                  ...prev,
                                  tipo_chave_pix: e.target.value,
                                  chave_pix: '' // Limpa o campo quando muda o tipo
                                }));
                              }}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                              <option value="">Selecione o tipo de chave</option>
                              <option value="telefone">Telefone</option>
                              <option value="email">Email</option>
                              <option value="cpf">CPF</option>
                              <option value="cnpj">CNPJ</option>
                              <option value="chave_aleatoria">Chave Aleatória</option>
                            </select>
                          </div>

                          {/* Campo Chave PIX */}
                          {novaFormaPagamento.tipo_chave_pix && (
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Chave PIX *
                              </label>
                              <input
                                type="text"
                                value={novaFormaPagamento.chave_pix}
                                onChange={(e) => {
                                  const valorFormatado = formatarChavePix(e.target.value, novaFormaPagamento.tipo_chave_pix);
                                  setNovaFormaPagamento(prev => ({
                                    ...prev,
                                    chave_pix: valorFormatado
                                  }));
                                }}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                placeholder={getPlaceholderChavePix(novaFormaPagamento.tipo_chave_pix)}
                              />
                              <p className="text-sm text-gray-400 mt-1">
                                {novaFormaPagamento.tipo_chave_pix === 'chave_aleatoria'
                                  ? 'Cole aqui a chave PIX aleatória gerada pelo seu banco.'
                                  : `Digite ${novaFormaPagamento.tipo_chave_pix === 'telefone' ? 'o telefone' :
                                      novaFormaPagamento.tipo_chave_pix === 'email' ? 'o email' :
                                      novaFormaPagamento.tipo_chave_pix === 'cpf' ? 'o CPF' : 'o CNPJ'}
                                    cadastrado como chave PIX.`
                                }
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowModalFormaPagamento(false);
                    setEditingFormaPagamento(null);
                    setNovaFormaPagamento({
                      forma_pagamento_opcao_id: '',
                      cardapio_digital: false,
                      max_parcelas: 1,
                      juros_por_parcela: 0,
                      utilizar_chave_pix: false,
                      tipo_chave_pix: '',
                      chave_pix: ''
                    });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvarFormaPagamento}
                  disabled={
                    !novaFormaPagamento.forma_pagamento_opcao_id ||
                    isLoading ||
                    (novaFormaPagamento.utilizar_chave_pix && (
                      !novaFormaPagamento.tipo_chave_pix ||
                      !novaFormaPagamento.chave_pix ||
                      !validarChavePix(novaFormaPagamento.chave_pix, novaFormaPagamento.tipo_chave_pix)
                    ))
                  }
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {isLoading ? 'Salvando...' : (editingFormaPagamento ? 'Salvar' : 'Adicionar')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal para Adicionar/Editar Tipo de Pagamento */}
      <AnimatePresence>
        {showModalTipoPagamento && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowModalTipoPagamento(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background-card p-6 rounded-lg border border-gray-800 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">
                  {editingTipoPagamento ? 'Editar Tipo de Pagamento' : 'Adicionar Tipo de Pagamento'}
                </h3>
                <button
                  onClick={() => {
                    setShowModalTipoPagamento(false);
                    setEditingTipoPagamento(null);
                    setNovoTipoPagamento({ descricao: '' });
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Descrição */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Descrição *
                  </label>
                  <input
                    type="text"
                    value={novoTipoPagamento.descricao}
                    onChange={(e) => setNovoTipoPagamento(prev => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Ex: PIX, Cartão de Crédito, Dinheiro..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowModalTipoPagamento(false);
                    setEditingTipoPagamento(null);
                    setNovoTipoPagamento({ descricao: '' });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvarTipoPagamento}
                  disabled={isLoading || !novoTipoPagamento.descricao.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {isLoading ? 'Salvando...' : (editingTipoPagamento ? 'Salvar' : 'Adicionar')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Cupom de Desconto */}
      <AnimatePresence>
        {showCupomModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background-card rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white">
                    {editingCupom ? 'Editar Cupom de Desconto' : 'Novo Cupom de Desconto'}
                  </h3>
                  <button
                    onClick={() => setShowCupomModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form className="space-y-4">
                  {/* Código do cupom */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Código do Cupom *
                    </label>
                    <input
                      type="text"
                      value={cupomForm.codigo}
                      onChange={(e) => setCupomForm(prev => ({ ...prev, codigo: e.target.value.toUpperCase() }))}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                      placeholder="Ex: DESCONTO10"
                      maxLength={20}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Código que o cliente digitará para aplicar o desconto (máx. 20 caracteres)
                    </p>
                  </div>

                  {/* Descrição */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Descrição *
                    </label>
                    <input
                      type="text"
                      value={cupomForm.descricao}
                      onChange={(e) => setCupomForm(prev => ({ ...prev, descricao: e.target.value }))}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                      placeholder="Ex: 10% de desconto em todos os produtos"
                      maxLength={100}
                    />
                  </div>

                  {/* Tipo e valor do desconto */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Tipo de Desconto *
                      </label>
                      <select
                        value={cupomForm.tipo_desconto}
                        onChange={(e) => setCupomForm(prev => ({ ...prev, tipo_desconto: e.target.value }))}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                      >
                        <option value="percentual">Percentual (%)</option>
                        <option value="valor_fixo">Valor Fixo (R$)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Valor do Desconto *
                      </label>
                      <input
                        type="number"
                        value={cupomForm.valor_desconto}
                        onChange={(e) => setCupomForm(prev => ({ ...prev, valor_desconto: parseFloat(e.target.value) || 0 }))}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                        placeholder={cupomForm.tipo_desconto === 'percentual' ? '10' : '5.00'}
                        min="0"
                        max={cupomForm.tipo_desconto === 'percentual' ? '100' : undefined}
                        step={cupomForm.tipo_desconto === 'percentual' ? '1' : '0.01'}
                      />
                    </div>
                  </div>

                  {/* Valor mínimo do pedido */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Valor Mínimo do Pedido (R$)
                    </label>
                    <input
                      type="number"
                      value={cupomForm.valor_minimo_pedido}
                      onChange={(e) => setCupomForm(prev => ({ ...prev, valor_minimo_pedido: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Deixe 0 para não ter valor mínimo
                    </p>
                  </div>

                  {/* Datas de validade */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Data de Início
                      </label>
                      <input
                        type="date"
                        value={cupomForm.data_inicio}
                        onChange={(e) => setCupomForm(prev => ({ ...prev, data_inicio: e.target.value }))}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Data de Fim
                      </label>
                      <input
                        type="date"
                        value={cupomForm.data_fim}
                        onChange={(e) => setCupomForm(prev => ({ ...prev, data_fim: e.target.value }))}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                      />
                    </div>
                  </div>

                  {/* Limite de uso */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Limite de Uso
                    </label>
                    <input
                      type="number"
                      value={cupomForm.limite_uso}
                      onChange={(e) => setCupomForm(prev => ({ ...prev, limite_uso: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                      placeholder="0"
                      min="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Deixe 0 para uso ilimitado
                    </p>
                  </div>

                  {/* Status ativo */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="cupom-ativo"
                      checked={cupomForm.ativo}
                      onChange={(e) => setCupomForm(prev => ({ ...prev, ativo: e.target.checked }))}
                      className="w-4 h-4 text-purple-500 bg-gray-800 border-gray-600 rounded focus:ring-purple-500 focus:ring-2"
                    />
                    <label htmlFor="cupom-ativo" className="ml-2 text-sm text-gray-400">
                      Cupom ativo (disponível para uso)
                    </label>
                  </div>
                </form>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowCupomModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSalvarCupom}
                    disabled={!cupomForm.codigo || !cupomForm.descricao || cupomForm.valor_desconto <= 0 || isLoading}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    {isLoading ? 'Salvando...' : (editingCupom ? 'Salvar' : 'Criar Cupom')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConfiguracoesPage;