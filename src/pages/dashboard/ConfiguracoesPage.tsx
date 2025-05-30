import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Trash2, Users, Shield, Settings, CreditCard, Search, Store, Bike, Clock, Eye, EyeOff, Lock, Unlock, Copy, Check, ShoppingCart, Truck, MessageSquare, Receipt } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Button from '../../components/comum/Button';
import SearchableSelect from '../../components/comum/SearchableSelect';
import { showMessage, translateErrorMessage } from '../../utils/toast';
import { TipoUserConfig } from '../../types';
import { useAuthSession } from '../../hooks/useAuthSession';
import { extractCertificateInfo, checkCertificateExpiry } from '../../api/certificateApi';

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
    tipo_user_config_id: ''
  });

  // Estado para tipos de usuário
  const [tiposUsuario, setTiposUsuario] = useState<TipoUserConfig[]>([]);

  // Estado para controlar a visibilidade da senha
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);

  // Estado para erros de validação
  const [formErrors, setFormErrors] = useState({
    senha: '',
    email: ''
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
    ocultar_finalizar_com_impressao: false,
    ocultar_finalizar_sem_impressao: false,
    ocultar_nfce_com_impressao: false,
    ocultar_nfce_sem_impressao: false,
    ocultar_nfce_producao: false,
    ocultar_producao: false
  });
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
    regime_tributario: 3,
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
          tipo_user_config:tipo_user_config_id(tipo)
        `)
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // Armazenar o tipo do usuário logado
      setUsuarioLogado({
        id: usuarioData.id,
        tipo: usuarioData.tipo_user_config?.tipo || 'user' // Valor padrão 'user' caso não tenha tipo definido
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

        // Se o usuário for do tipo 'user', mostrar apenas o próprio usuário
        // Se for 'admin', mostrar todos os usuários da empresa
        let query = supabase
          .from('usuarios')
          .select(`
            *,
            perfil:perfis_acesso(nome),
            tipo_user_config:tipo_user_config_id(id, tipo, descricao)
          `)
          .eq('empresa_id', usuarioData.empresa_id)
          .order('nome'); // Ordenar por nome para melhor visualização

        // Filtrar apenas o próprio usuário se for do tipo 'user'
        if (usuarioData.tipo_user_config?.tipo === 'user') {
          query = query.eq('id', usuarioData.id);
        }

        const { data: usuariosData, error: usuariosError } = await query;

        if (usuariosError) {
          console.error('Erro ao carregar usuários:', usuariosError);
          showMessage('error', 'Erro ao carregar lista de usuários');
          return;
        }

        console.log(`Carregados ${usuariosData?.length || 0} usuários. Usuário logado é ${usuarioData.tipo_user_config?.tipo}`);
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
        const { data: empresaData } = await supabase
          .from('empresas')
          .select('certificado_digital_path, certificado_digital_senha, certificado_digital_validade, certificado_digital_status, certificado_digital_nome, certificado_digital_uploaded_at')
          .eq('id', usuarioData.empresa_id)
          .single();

        if (empresaData) {
          setCertificadoInfo(empresaData);
          setCertificadoSenha(empresaData.certificado_digital_senha || '');
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

      // Executar o script de exclusão completa da empresa
      const { error } = await supabase.rpc('deletar_empresa_completa', {
        empresa_uuid: empresaId
      });

      if (error) {
        console.error('Erro ao deletar empresa:', error);
        throw new Error('Erro ao deletar empresa: ' + error.message);
      }

      showMessage('success', 'Empresa deletada com sucesso!');

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
  const handleEditUsuario = (usuario: any) => {
    // Limpar erros anteriores
    setFormErrors({
      senha: '',
      email: ''
    });

    // Carregar os dados do usuário no formulário
    setUsuarioForm({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      senha: '', // Campos de senha vazios na edição
      confirmarSenha: '',
      tipo_user_config_id: usuario.tipo_user_config_id || ''
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

      // Modo de edição
      if (isEditingUsuario) {
        // 1. Atualizar o nome e tipo do usuário na tabela usuarios
        const { error: updateError } = await supabase
          .from('usuarios')
          .update({
            nome: usuarioForm.nome,
            tipo_user_config_id: usuarioForm.tipo_user_config_id
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
            status: true // Definir o status como ativo por padrão
          }]);

        if (insertError) throw insertError;

        showMessage('success', 'Usuário adicionado com sucesso!');
      }

      // Limpar o formulário e resetar o modo de edição
      setUsuarioForm({
        id: '',
        nome: '',
        email: '',
        senha: '',
        confirmarSenha: '',
        tipo_user_config_id: ''
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

  // Função para fazer upload do certificado digital
  const handleUploadCertificado = async () => {
    if (!certificadoFile || !certificadoSenha.trim()) {
      showMessage('error', 'Selecione um arquivo de certificado e informe a senha');
      return;
    }

    setIsUploadingCertificado(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) throw new Error('Empresa não encontrada');

      // Extrair informações do certificado
      const infoCertificado = await extrairInfoCertificado(certificadoFile, certificadoSenha);

      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const fileName = `${usuarioData.empresa_id}_${timestamp}_${certificadoFile.name}`;

      // Upload do arquivo para o bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('certificadodigital')
        .upload(fileName, certificadoFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Atualizar dados na tabela empresas
      const { error: updateError } = await supabase
        .from('empresas')
        .update({
          certificado_digital_path: uploadData.path,
          certificado_digital_senha: certificadoSenha,
          certificado_digital_validade: infoCertificado.validade,
          certificado_digital_status: infoCertificado.status,
          certificado_digital_nome: infoCertificado.nome,
          certificado_digital_uploaded_at: new Date().toISOString()
        })
        .eq('id', usuarioData.empresa_id);

      if (updateError) throw updateError;

      showMessage('success', 'Certificado digital enviado com sucesso!');

      // Limpar formulário
      setCertificadoFile(null);
      setCertificadoSenha('');

      // Recarregar dados
      loadData();

    } catch (error: any) {
      showMessage('error', 'Erro ao enviar certificado: ' + error.message);
    } finally {
      setIsUploadingCertificado(false);
    }
  };

  // Função para remover certificado digital
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

      // Remover arquivo do storage
      const { error: deleteError } = await supabase.storage
        .from('certificadodigital')
        .remove([certificadoInfo.certificado_digital_path]);

      if (deleteError) {
        console.warn('Erro ao remover arquivo do storage:', deleteError);
      }

      // Limpar dados na tabela empresas
      const { error: updateError } = await supabase
        .from('empresas')
        .update({
          certificado_digital_path: null,
          certificado_digital_senha: null,
          certificado_digital_validade: null,
          certificado_digital_status: 'nao_configurado',
          certificado_digital_nome: null,
          certificado_digital_uploaded_at: null
        })
        .eq('id', usuarioData.empresa_id);

      if (updateError) throw updateError;

      showMessage('success', 'Certificado digital removido com sucesso!');
      setShowRemoveCertificadoModal(false);

      // Recarregar dados
      loadData();

    } catch (error: any) {
      showMessage('error', 'Erro ao remover certificado: ' + error.message);
      setShowRemoveCertificadoModal(false);
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
          ocultar_finalizar_com_impressao: config.ocultar_finalizar_com_impressao || false,
          ocultar_finalizar_sem_impressao: config.ocultar_finalizar_sem_impressao || false,
          ocultar_nfce_com_impressao: config.ocultar_nfce_com_impressao || false,
          ocultar_nfce_sem_impressao: config.ocultar_nfce_sem_impressao || false,
          ocultar_nfce_producao: config.ocultar_nfce_producao || false,
          ocultar_producao: config.ocultar_producao || false
        });
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
          ocultar_finalizar_com_impressao: false,
          ocultar_finalizar_sem_impressao: false,
          ocultar_nfce_com_impressao: false,
          ocultar_nfce_sem_impressao: false,
          ocultar_nfce_producao: false,
          ocultar_producao: false
        });
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
        ocultar_finalizar_com_impressao: false,
        ocultar_finalizar_sem_impressao: false,
        ocultar_nfce_com_impressao: false,
        ocultar_nfce_sem_impressao: false,
        ocultar_nfce_producao: false,
        ocultar_producao: false
      });
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

  // Função para salvar configurações de conexão
  const handleConexaoConfigChange = async (field: string, value: boolean) => {
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
        editar_nome_produto: field === 'editar_nome_produto' ? value : pdvConfig.editar_nome_produto,
        ocultar_finalizar_com_impressao: field === 'ocultar_finalizar_com_impressao' ? value : pdvConfig.ocultar_finalizar_com_impressao,
        ocultar_finalizar_sem_impressao: field === 'ocultar_finalizar_sem_impressao' ? value : pdvConfig.ocultar_finalizar_sem_impressao,
        ocultar_nfce_com_impressao: field === 'ocultar_nfce_com_impressao' ? value : pdvConfig.ocultar_nfce_com_impressao,
        ocultar_nfce_sem_impressao: field === 'ocultar_nfce_sem_impressao' ? value : pdvConfig.ocultar_nfce_sem_impressao,
        ocultar_nfce_producao: field === 'ocultar_nfce_producao' ? value : pdvConfig.ocultar_nfce_producao,
        ocultar_producao: field === 'ocultar_producao' ? value : pdvConfig.ocultar_producao
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
                        <div className="flex flex-wrap gap-2 mt-2">
                          {usuario.tipo_user_config && (
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
                              {usuario.tipo_user_config.tipo.charAt(0).toUpperCase() + usuario.tipo_user_config.tipo.slice(1)}
                            </span>
                          )}
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
                        {usuarioLogado?.tipo === 'admin' && usuario.tipo_user_config?.tipo !== 'admin' && (
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
                      regime_tributario: 3,
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
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          {empresa.tipo_documento}
                        </label>
                        <p className="text-white">{empresa.documento || '-'}</p>
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
                          Inscrição Estadual
                        </label>
                        <p className="text-white">{empresa.inscricao_estadual || '-'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Regime Tributário
                        </label>
                        <p className="text-white">
                          {empresa.regime_tributario === 1 && '1 - Simples Nacional'}
                          {empresa.regime_tributario === 2 && '2 - Simples Nacional - Excesso'}
                          {empresa.regime_tributario === 3 && '3 - Regime Normal'}
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

            <div className="bg-background-card p-6 rounded-lg border border-gray-800">
              <div className="space-y-6">
                {/* Comandas e Mesas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                    <input
                      type="checkbox"
                      checked={pdvConfig.comandas}
                      onChange={(e) => handlePdvConfigChange('comandas', e.target.checked)}
                      className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                      style={{ borderRadius: '50%' }}
                    />
                    <div>
                      <h4 className="text-white font-medium">Comandas</h4>
                      <p className="text-sm text-gray-400 mt-1">
                        Permite controlar vendas por comandas numeradas para organização de pedidos.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                    <input
                      type="checkbox"
                      checked={pdvConfig.mesas}
                      onChange={(e) => handlePdvConfigChange('mesas', e.target.checked)}
                      className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                      style={{ borderRadius: '50%' }}
                    />
                    <div>
                      <h4 className="text-white font-medium">Mesas</h4>
                      <p className="text-sm text-gray-400 mt-1">
                        Habilita o controle de mesas para restaurantes e estabelecimentos com atendimento no local.
                      </p>
                    </div>
                  </label>
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

                  <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                    <input
                      type="checkbox"
                      checked={pdvConfig.delivery_chat_ia}
                      onChange={(e) => handlePdvConfigChange('delivery_chat_ia', e.target.checked)}
                      className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                      style={{ borderRadius: '50%' }}
                    />
                    <div>
                      <h4 className="text-white font-medium">Delivery como chat IA</h4>
                      <p className="text-sm text-gray-400 mt-1">
                        Integra inteligência artificial para atendimento automatizado via chat.
                      </p>
                    </div>
                  </label>

                  {/* <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                    <input
                      type="checkbox"
                      checked={pdvConfig.baixa_estoque_pdv}
                      onChange={(e) => handlePdvConfigChange('baixa_estoque_pdv', e.target.checked)}
                      className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                      style={{ borderRadius: '50%' }}
                    />
                    <div>
                      <h4 className="text-white font-medium">Baixa estoque na venda do PDV</h4>
                      <p className="text-sm text-gray-400 mt-1">
                        Automaticamente reduz o estoque dos produtos quando uma venda é finalizada no PDV.
                      </p>
                    </div>
                  </label> */}

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
                </div>

                {/* Seção: Botões de Finalização */}
                <div className="space-y-4">
                  <div className="border-t border-gray-700/50 pt-6">
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

                  {/* NFC-e + Produção e Produção */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                      <input
                        type="checkbox"
                        checked={pdvConfig.ocultar_nfce_producao}
                        onChange={(e) => handlePdvConfigChange('ocultar_nfce_producao', e.target.checked)}
                        className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                        style={{ borderRadius: '50%' }}
                      />
                      <div>
                        <h4 className="text-white font-medium">Ocultar "NFC-e + Produção"</h4>
                        <p className="text-sm text-gray-400 mt-1">
                          Remove o botão de emissão de NFC-e com envio para produção da tela de finalização.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
                      <input
                        type="checkbox"
                        checked={pdvConfig.ocultar_producao}
                        onChange={(e) => handlePdvConfigChange('ocultar_producao', e.target.checked)}
                        className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
                        style={{ borderRadius: '50%' }}
                      />
                      <div>
                        <h4 className="text-white font-medium">Ocultar "Produção"</h4>
                        <p className="text-sm text-gray-400 mt-1">
                          Remove o botão de envio direto para produção da tela de finalização.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
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
        return (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Conexão</h2>
            </div>

            <div className="bg-background-card p-6 rounded-lg border border-gray-800">
              <h3 className="text-lg font-medium text-white mb-4">Configurações de Conexão</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="text-green-400" size={20} />
                    <div>
                      <h4 className="text-white font-medium">Habilita Conexão com WhatsApp</h4>
                      <p className="text-sm text-gray-400 mt-1">
                        Permite integração com WhatsApp para comunicação com clientes.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={conexaoConfig.habilita_conexao_whatsapp}
                      onChange={(e) => handleConexaoConfigChange('habilita_conexao_whatsapp', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
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
                      <input
                        type="password"
                        value={certificadoSenha}
                        onChange={(e) => setCertificadoSenha(e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        placeholder="Digite a senha do certificado"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Senha utilizada para proteger o certificado digital
                      </p>
                    </div>

                    <div className="pt-2">
                      <Button
                        type="button"
                        variant="primary"
                        onClick={handleUploadCertificado}
                        disabled={isUploadingCertificado || !certificadoFile || !certificadoSenha.trim()}
                        className="w-full"
                      >
                        {isUploadingCertificado ? (
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
                          email: ''
                        });
                        setUsuarioForm({
                          id: '',
                          nome: '',
                          email: '',
                          senha: '',
                          confirmarSenha: ''
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
                      <SearchableSelect
                        label="Tipo de Usuário"
                        options={tiposUsuario.map(tipo => ({
                          value: tipo.id,
                          label: `${tipo.tipo.charAt(0).toUpperCase() + tipo.tipo.slice(1)} - ${tipo.descricao || ''}`
                        }))}
                        value={usuarioForm.tipo_user_config_id}
                        onChange={(value) => setUsuarioForm(prev => ({ ...prev, tipo_user_config_id: value }))}
                        placeholder="Selecione o tipo de usuário"
                        required
                      />
                    </div>

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
                            email: ''
                          });
                          setUsuarioForm({
                            id: '',
                            nome: '',
                            email: '',
                            senha: '',
                            confirmarSenha: '',
                            tipo_user_config_id: ''
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
                          onChange={(e) => setEmpresaForm(prev => ({ ...prev, inscricao_estadual: e.target.value }))}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                          placeholder="123456789 ou ISENTO"
                          required
                        />
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
    </div>
  );
};

export default ConfiguracoesPage;