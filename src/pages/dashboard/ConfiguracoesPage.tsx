import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Trash2, Users, Shield, Settings, CreditCard, Search, Store, Bike, Clock, Eye, EyeOff, Lock, Unlock, Copy, Check, ShoppingCart, Truck, MessageSquare, Receipt, DollarSign, ChevronDown, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Button from '../../components/comum/Button';
import SearchableSelect from '../../components/comum/SearchableSelect';
import MultiSelect from '../../components/comum/MultiSelect';
import { showMessage, translateErrorMessage } from '../../utils/toast';
import { TipoUserConfig } from '../../types';
import { useAuthSession } from '../../hooks/useAuthSession';
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
  const [activeSection, setActiveSection] = useState<'usuarios' | 'perfis' | 'geral' | 'pagamentos' | 'status' | 'taxa' | 'horarios' | 'estoque' | 'pedidos' | 'produtos' | 'conta' | 'pdv' | 'taxaentrega' | 'conexao' | 'certificado'>('geral');
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
    venda_sem_produto_csosn: '500'
  });

  // Estado para controlar as abas do PDV
  const [pdvActiveTab, setPdvActiveTab] = useState<'geral' | 'botoes' | 'impressoes' | 'venda-sem-produto'>('geral');

  // Estado para rodapé personalizado das impressões
  const [rodapePersonalizado, setRodapePersonalizado] = useState('Obrigado pela preferencia volte sempre!');
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
      // Desativa o loading após carregar os dados
      setSectionLoading(false);
      // Marca que não é mais o primeiro carregamento
      if (isFirstLoad) {
        setIsFirstLoad(false);
      }
    };

    loadDataWithLoading();
  }, [activeSection]);

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
          setEmpresaForm(empresaData);
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
          .from('status_loja')
          .select('*')
          .eq('empresa_id', usuarioData.empresa_id)
          .single();

        if (statusData) {
          setStoreStatus(statusData);
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
            console.log('Configuração de pedidos encontrada:', pedidosConfigData);

            // Garantir que agrupar_itens seja um booleano
            // Se o campo não existir ou for null, definir como false
            const agruparItensValue = pedidosConfigData.agrupar_itens === true;
            console.log('Valor de agrupar_itens:', agruparItensValue);
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
      } catch (certError) {
        console.warn('⚠️ Erro ao remover certificado (continuando com deleção):', certError);
        // Não interromper o processo se falhar ao remover certificado
      }

      // 2. SEGUNDO: Executar o script de exclusão completa da empresa
      console.log('🗑️ Deletando empresa completa...');
      const { error } = await supabase.rpc('deletar_empresa_completa', {
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
        .from('status_loja')
        .update({ modo_operacao: mode })
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
        status: info.status
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
          venda_sem_produto_peso_liquido: config.venda_sem_produto_peso_liquido !== undefined ? config.venda_sem_produto_peso_liquido : 0
        });

        // Atualizar também o estado separado do rodapé
        setRodapePersonalizado(config.rodape_personalizado || 'Obrigado pela preferencia volte sempre!');
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
          venda_sem_produto_csosn: '500'
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
        venda_sem_produto_csosn: '500'
      });

      // Atualizar também o estado separado do rodapé
      setRodapePersonalizado('Obrigado pela preferencia volte sempre!');
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

  const handlePdvConfigChange = async (field: string, value: boolean) => {
    try {
      // Atualizar o estado local primeiro
      setPdvConfig(prev => ({ ...prev, [field]: value }));

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
        comandas: field === 'comandas' ? value : pdvConfig.comandas,
        mesas: field === 'mesas' ? value : pdvConfig.mesas,
        vendedor: field === 'vendedor' ? value : pdvConfig.vendedor,
        exibe_foto_item: field === 'exibe_foto_item' ? value : pdvConfig.exibe_foto_item,
        seleciona_clientes: field === 'seleciona_clientes' ? value : pdvConfig.seleciona_clientes,
        controla_caixa: field === 'controla_caixa' ? value : pdvConfig.controla_caixa,
        agrupa_itens: field === 'agrupa_itens' ? value : pdvConfig.agrupa_itens,
        delivery: field === 'delivery' ? value : pdvConfig.delivery,
        cardapio_digital: field === 'cardapio_digital' ? value : pdvConfig.cardapio_digital,
        delivery_chat_ia: field === 'delivery_chat_ia' ? value : pdvConfig.delivery_chat_ia,
        baixa_estoque_pdv: field === 'baixa_estoque_pdv' ? value : pdvConfig.baixa_estoque_pdv,
        venda_codigo_barras: field === 'venda_codigo_barras' ? value : pdvConfig.venda_codigo_barras,
        forca_venda_fiscal_cartao: field === 'forca_venda_fiscal_cartao' ? value : pdvConfig.forca_venda_fiscal_cartao,
        observacao_no_item: field === 'observacao_no_item' ? value : pdvConfig.observacao_no_item,
        desconto_no_item: field === 'desconto_no_item' ? value : pdvConfig.desconto_no_item,
        desconto_no_total: field === 'desconto_no_total' ? value : pdvConfig.desconto_no_total,
        editar_nome_produto: field === 'editar_nome_produto' ? value : pdvConfig.editar_nome_produto,
        fiado: field === 'fiado' ? value : pdvConfig.fiado,
        venda_sem_produto: field === 'venda_sem_produto' ? value : pdvConfig.venda_sem_produto,
        venda_sem_produto_ncm: field === 'venda_sem_produto_ncm' ? value : pdvConfig.venda_sem_produto_ncm,
        venda_sem_produto_cfop: field === 'venda_sem_produto_cfop' ? value : pdvConfig.venda_sem_produto_cfop,
        venda_sem_produto_origem: field === 'venda_sem_produto_origem' ? value : pdvConfig.venda_sem_produto_origem,
        venda_sem_produto_situacao_tributaria: field === 'venda_sem_produto_situacao_tributaria' ? value : pdvConfig.venda_sem_produto_situacao_tributaria,
        venda_sem_produto_cest: field === 'venda_sem_produto_cest' ? value : pdvConfig.venda_sem_produto_cest,
        venda_sem_produto_margem_st: field === 'venda_sem_produto_margem_st' ? value : pdvConfig.venda_sem_produto_margem_st,
        venda_sem_produto_aliquota_icms: field === 'venda_sem_produto_aliquota_icms' ? value : pdvConfig.venda_sem_produto_aliquota_icms,
        venda_sem_produto_aliquota_pis: field === 'venda_sem_produto_aliquota_pis' ? value : pdvConfig.venda_sem_produto_aliquota_pis,
        venda_sem_produto_aliquota_cofins: field === 'venda_sem_produto_aliquota_cofins' ? value : pdvConfig.venda_sem_produto_aliquota_cofins,
        venda_sem_produto_peso_liquido: field === 'venda_sem_produto_peso_liquido' ? value : pdvConfig.venda_sem_produto_peso_liquido,
        vendas_itens_multiplicacao: field === 'vendas_itens_multiplicacao' ? value : pdvConfig.vendas_itens_multiplicacao,
        ocultar_finalizar_com_impressao: field === 'ocultar_finalizar_com_impressao' ? value : pdvConfig.ocultar_finalizar_com_impressao,
        ocultar_finalizar_sem_impressao: field === 'ocultar_finalizar_sem_impressao' ? value : pdvConfig.ocultar_finalizar_sem_impressao,
        ocultar_nfce_com_impressao: field === 'ocultar_nfce_com_impressao' ? value : pdvConfig.ocultar_nfce_com_impressao,
        ocultar_nfce_sem_impressao: field === 'ocultar_nfce_sem_impressao' ? value : pdvConfig.ocultar_nfce_sem_impressao,
        ocultar_nfce_producao: field === 'ocultar_nfce_producao' ? value : pdvConfig.ocultar_nfce_producao,
        ocultar_producao: field === 'ocultar_producao' ? value : pdvConfig.ocultar_producao,
        rodape_personalizado: pdvConfig.rodape_personalizado,
        mostrar_razao_social_cupom_finalizar: field === 'mostrar_razao_social_cupom_finalizar' ? value : pdvConfig.mostrar_razao_social_cupom_finalizar,
        mostrar_endereco_cupom_finalizar: field === 'mostrar_endereco_cupom_finalizar' ? value : pdvConfig.mostrar_endereco_cupom_finalizar,
        mostrar_operador_cupom_finalizar: field === 'mostrar_operador_cupom_finalizar' ? value : pdvConfig.mostrar_operador_cupom_finalizar,
        tipo_impressao_80mm: field === 'tipo_impressao_80mm' ? value : pdvConfig.tipo_impressao_80mm,  // ✅ NOVO
        tipo_impressao_50mm: field === 'tipo_impressao_50mm' ? value : pdvConfig.tipo_impressao_50mm   // ✅ NOVO
      };

      if (existingConfig) {
        const { error } = await supabase
          .from('pdv_config')
          .update(configData)
          .eq('empresa_id', usuarioData.empresa_id);

        if (error) throw error;
      } else {
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
          config: configData
        }
      });
      window.dispatchEvent(pdvConfigEvent);

      // Mostrar mensagem de sucesso
      const fieldNames: { [key: string]: string } = {
        comandas: 'Comandas',
        mesas: 'Mesas',
        vendedor: 'Vendedor',
        exibe_foto_item: 'Exibe foto no item lançado',
        seleciona_clientes: 'Seleciona clientes',
        controla_caixa: 'Controla caixa',
        agrupa_itens: 'Agrupa itens',
        delivery: 'Delivery',
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
        ocultar_producao: 'Ocultar "Produção"'
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

    // Atualizar situação tributária baseada no CFOP
    atualizarSituacaoTributariaVendaSemProduto(cfop.codigo);
  };

  // Função para detectar se a empresa é Simples Nacional
  const isEmpresaSimplesNacional = () => {
    return empresa?.regime_tributario === 1; // 1 = Simples Nacional
  };

  // Função para atualizar situação tributária baseada no CFOP
  const atualizarSituacaoTributariaVendaSemProduto = (cfop: string) => {
    const isSimples = isEmpresaSimplesNacional();

    if (cfop === '5405' || cfop === '5401') {
      // CFOPs de Substituição Tributária
      if (isSimples) {
        handlePdvConfigChangeFiscal('venda_sem_produto_situacao_tributaria', 'st'); // CSOSN 500
      } else {
        handlePdvConfigChangeFiscal('venda_sem_produto_situacao_tributaria', 'st'); // CST 60
      }
    } else if (cfop === '5102' || cfop === '5101') {
      // CFOPs normais
      if (isSimples) {
        handlePdvConfigChangeFiscal('venda_sem_produto_situacao_tributaria', 'tributado_integral'); // CSOSN 102
      } else {
        handlePdvConfigChangeFiscal('venda_sem_produto_situacao_tributaria', 'tributado_integral'); // CST 00
      }
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
      setConfigFiscalLocal(prev => ({
        ...prev,
        [field]: value
      }));
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

                  return (
                    <div
                      key={horario.id}
                      className="bg-background-card p-4 rounded-lg border border-gray-800"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-white font-medium">{diaNome}</h3>
                          <p className="text-sm text-gray-400 mt-1">
                            {horaAbertura} às {horaFechamento}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
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
                    setEmpresaForm(empresa || {
                      segmento: '',
                      tipo_documento: 'CNPJ',
                      documento: '',
                      razao_social: '',
                      nome_fantasia: '',
                      nome_proprietario: '',
                      whatsapp: '',
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
                </nav>
              </div>

              {/* Conteúdo das Abas */}
              <div className="p-6">
                {pdvActiveTab === 'geral' && (
                  <div className="space-y-6">
                    {/* Comandas e Mesas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <h4 className="text-gray-400 font-medium">Comandas</h4>
                            <p className="text-sm text-gray-500 mt-1">
                              Permite controlar vendas por comandas numeradas para organização de pedidos.
                            </p>
                            <div className="mt-2 text-xs text-yellow-400 flex items-center">
                              🚧 Em desenvolvimento - Funcionalidade temporariamente desabilitada
                            </div>
                          </div>
                        </label>
                      </div>

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
                            <h4 className="text-gray-400 font-medium">Mesas</h4>
                            <p className="text-sm text-gray-500 mt-1">
                              Habilita o controle de mesas para restaurantes e estabelecimentos com atendimento no local.
                            </p>
                            <div className="mt-2 text-xs text-yellow-400 flex items-center">
                              🚧 Em desenvolvimento - Funcionalidade temporariamente desabilitada
                            </div>
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
                        <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-not-allowed opacity-60 transition-colors">
                          <input
                            type="checkbox"
                            checked={false}
                            disabled={true}
                            className="w-5 h-5 text-gray-500 bg-gray-700 border-gray-600 rounded-full cursor-not-allowed mt-0.5 mr-3"
                            style={{ borderRadius: '50%' }}
                          />
                          <div>
                            <h4 className="text-gray-400 font-medium">Controla Caixa</h4>
                            <p className="text-sm text-gray-500 mt-1">
                              Habilita controle de abertura e fechamento de caixa com relatórios financeiros.
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
                          <h4 className="text-white font-medium">Delivery</h4>
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
                        <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-not-allowed opacity-60 transition-colors">
                          <input
                            type="checkbox"
                            checked={false}
                            disabled={true}
                            className="w-5 h-5 text-gray-500 bg-gray-700 border-gray-600 rounded-full cursor-not-allowed mt-0.5 mr-3"
                            style={{ borderRadius: '50%' }}
                          />
                          <div>
                            <h4 className="text-gray-400 font-medium">Fiado</h4>
                            <p className="text-sm text-gray-500 mt-1">
                              Habilita a opção de venda fiado no PDV.
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
                                {vendaSemProdutoNcmValidacao.validando ? (
                                  <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
                                ) : vendaSemProdutoNcmValidacao.valido === true ? (
                                  <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                    <Check size={10} className="text-white" />
                                  </div>
                                ) : vendaSemProdutoNcmValidacao.valido === false ? (
                                  <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                    <X size={10} className="text-white" />
                                  </div>
                                ) : null}
                              </div>
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

                          {/* CST/CSOSN Diretos */}
                          {isEmpresaSimplesNacional() ? (
                            <div>
                              <label className="block text-sm font-medium text-gray-400 mb-2">
                                CSOSN (Código de Situação da Operação - Simples Nacional) <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={configFiscalLocal.venda_sem_produto_csosn || ''}
                                onChange={(e) => {
                                  const valor = e.target.value.replace(/\D/g, '').slice(0, 3);
                                  handlePdvConfigChangeFiscal('venda_sem_produto_csosn', valor);
                                }}
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                                placeholder="Ex: 102, 500"
                                maxLength={3}
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Código CSOSN específico para venda sem produto. Ex: 102 (Tributada sem permissão), 500 (ICMS cobrado por ST).
                              </p>
                            </div>
                          ) : (
                            <div>
                              <label className="block text-sm font-medium text-gray-400 mb-2">
                                CST (Código de Situação Tributária - Regime Normal) <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={configFiscalLocal.venda_sem_produto_cst || ''}
                                onChange={(e) => {
                                  const valor = e.target.value.replace(/\D/g, '').slice(0, 2);
                                  handlePdvConfigChangeFiscal('venda_sem_produto_cst', valor);
                                }}
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                                placeholder="Ex: 00, 60"
                                maxLength={2}
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Código CST específico para venda sem produto. Ex: 00 (Tributada integralmente), 60 (ICMS cobrado por ST).
                              </p>
                            </div>
                          )}

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

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        WhatsApp
                      </label>
                      <input
                        type="text"
                        value={empresaForm.whatsapp}
                        onChange={(e) => setEmpresaForm(prev => ({ ...prev, whatsapp: formatWhatsapp(e.target.value) }))}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        placeholder="(00) 0 0000-0000"
                      />
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
    </div>
  );
};

export default ConfiguracoesPage;