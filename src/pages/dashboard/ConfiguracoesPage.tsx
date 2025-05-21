import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Trash2, Users, Shield, Settings, CreditCard, Search, Store, Bike, Clock, Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Button from '../../components/comum/Button';
import SearchableSelect from '../../components/comum/SearchableSelect';
import { showMessage } from '../../utils/toast';

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
  const [showSidebar, setShowSidebar] = useState(false);
  const [activeSection, setActiveSection] = useState<'usuarios' | 'perfis' | 'geral' | 'pagamentos' | 'status' | 'taxa' | 'horarios' | 'estoque'>('geral');
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [perfis, setPerfis] = useState<any[]>([]);
  const [empresa, setEmpresa] = useState<any>(null);
  const [formasPagamento, setFormasPagamento] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCnpjLoading, setIsCnpjLoading] = useState(false);
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [usuarioLogado, setUsuarioLogado] = useState<{id: string, tipo: string} | null>(null);
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
    confirmarSenha: ''
  });

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
  const [tipoControleEstoque, setTipoControleEstoque] = useState<'faturamento' | 'pedidos'>('pedidos');
  const [bloqueiaSemEstoque, setBloqueiaSemEstoque] = useState<boolean>(false);
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
    estado: ''
  });

  useEffect(() => {
    loadData();
  }, [activeSection]);

  const loadData = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Obter dados do usuário logado, incluindo o tipo
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('id, empresa_id, tipo')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // Armazenar o tipo do usuário logado
      setUsuarioLogado({
        id: usuarioData.id,
        tipo: usuarioData.tipo || 'user' // Valor padrão 'user' caso não tenha tipo definido
      });

      if (activeSection === 'usuarios') {
        // Se o usuário for do tipo 'user', mostrar apenas o próprio usuário
        // Se for 'admin', mostrar todos os usuários da empresa
        let query = supabase
          .from('usuarios')
          .select(`
            *,
            perfil:perfis_acesso(nome)
          `)
          .eq('empresa_id', usuarioData.empresa_id);

        // Filtrar apenas o próprio usuário se for do tipo 'user'
        if (usuarioData.tipo === 'user') {
          query = query.eq('id', usuarioData.id);
        }

        const { data: usuariosData } = await query;
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

            // Definir tipo de controle (pedidos ou faturamento)
            if (estoqueConfigData.tipo_controle) {
              setTipoControleEstoque(estoqueConfigData.tipo_controle as 'faturamento' | 'pedidos');
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
    } catch (error: any) {
      console.error('Error loading data:', error);
      showMessage('error', 'Erro ao carregar dados');
    }
  };

  const handleSubmitPagamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTipo) return;

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
    } catch (error: any) {
      showMessage('error', 'Erro ao adicionar forma de pagamento: ' + error.message);
    } finally {
      setIsLoading(false);
    }
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
      confirmarSenha: ''
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

  const handleTipoControleEstoqueChange = async (tipo: 'faturamento' | 'pedidos') => {
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
        // 1. Atualizar o nome do usuário na tabela usuarios
        const { error: updateError } = await supabase
          .from('usuarios')
          .update({ nome: usuarioForm.nome })
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

        // 1. Criar o usuário na autenticação do Supabase
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: usuarioForm.email,
          password: usuarioForm.senha,
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

        // 2. Inserir o usuário na tabela usuarios com tipo 'user' e status ativo
        const { error: insertError } = await supabase
          .from('usuarios')
          .insert([{
            id: authData.user.id,
            nome: usuarioForm.nome,
            email: usuarioForm.email,
            empresa_id: usuarioData.empresa_id,
            tipo: 'user',
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
        confirmarSenha: ''
      });
      setIsEditingUsuario(false);

      setShowSidebar(false);
      loadData();
    } catch (error: any) {
      showMessage('error', `Erro ao ${isEditingUsuario ? 'atualizar' : 'adicionar'} usuário: ${error.message}`);
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
          estado: data.uf || ''
        }));

        showMessage('success', 'Dados do CNPJ carregados com sucesso!');
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

  const buscarCEP = async () => {
    const cep = empresaForm.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;

    try {
      setIsCepLoading(true);
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setEmpresaForm(prev => ({
          ...prev,
          endereco: data.logradouro,
          bairro: data.bairro,
          cidade: data.localidade,
          estado: data.uf
        }));
        showMessage('success', 'Endereço carregado com sucesso!');
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
              <h2 className="text-xl font-semibold text-white">Usuários</h2>
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
              {usuarios.map(usuario => (
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
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400">
                          {usuario.tipo === 'admin' ? 'Administrador' : 'Usuário'}
                        </span>
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
                      {usuarioLogado?.tipo === 'admin' && usuario.tipo !== 'admin' && (
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
              ))}
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
                      estado: ''
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
                </label>
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
                      Esta configuração afeta como o estoque é gerenciado em todo o sistema. No modo "Controle por Pedidos",
                      o estoque é reservado assim que um pedido é criado. No modo "Controle por Faturamento", o estoque só é
                      deduzido quando o pedido é efetivamente faturado.
                    </p>
                  </div>
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
    <div className="w-full">
      <div className="overflow-x-auto">
        <div className="bg-background-card rounded-lg border border-gray-800 p-2 mb-8 min-w-[1024px]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSection('geral')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors min-w-[140px] ${
                activeSection === 'geral'
                  ? 'bg-primary-500/10 text-primary-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Settings size={18} />
              <span className="text-sm whitespace-nowrap">Dados da Empresa</span>
            </button>
            <button
              onClick={() => setActiveSection('usuarios')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors min-w-[140px] ${
                activeSection ===   'usuarios'
                  ? 'bg-primary-500/10 text-primary-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Users size={18} />
              <span className="text-sm whitespace-nowrap">Usuários</span>
            </button>
            <button
              onClick={() => setActiveSection('estoque')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors min-w-[140px] ${
                activeSection === 'estoque'
                  ? 'bg-primary-500/10 text-primary-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 20h20"></path>
                <path d="M5 20V7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v13"></path>
                <path d="M13 20V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v17"></path>
              </svg>
              <span className="text-sm whitespace-nowrap">Estoque</span>
            </button>
            {/* Aba "Perfis" ocultada */}
            {/* Aba "Pagamentos" ocultada */}
            {/* Aba "Status Loja" ocultada */}
            {/* Aba "Taxa Entrega" ocultada */}
            {/* Aba "Horários" ocultada */}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        {renderContent()}
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
                            confirmarSenha: ''
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
    </div>
  );
};

export default ConfiguracoesPage;