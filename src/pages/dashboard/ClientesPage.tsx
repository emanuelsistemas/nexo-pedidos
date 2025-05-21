import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Phone, Mail, MapPin, AlertCircle, X, Building, Plus, Edit, Trash2, Check, User, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';

interface Telefone {
  numero: string;
  tipo: 'Fixo' | 'Celular';
  whatsapp: boolean;
}

interface Cliente {
  id: string;
  tipo_documento?: string;
  documento?: string;
  razao_social?: string;
  nome_fantasia?: string;
  nome: string;
  telefone: string;
  telefones?: Telefone[];
  email?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  empresa_id: string;
  empresa_nome?: string;
  created_at: string;
}

interface Empresa {
  id: string;
  nome: string;
}

const ClientesPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [empresaFilter, setEmpresaFilter] = useState<string>('todas');
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [isCnpjLoading, setIsCnpjLoading] = useState(false);

  const [formData, setFormData] = useState({
    tipo_documento: 'CNPJ',
    documento: '',
    razao_social: '',
    nome_fantasia: '',
    nome: '',
    telefones: [] as Telefone[],
    email: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    empresa_id: ''
  });

  // Estado para controlar a aba ativa no formulário
  const [activeTab, setActiveTab] = useState<'dados-gerais' | 'descontos'>('dados-gerais');

  // Estado para os descontos por prazo
  const [descontosPrazo, setDescontosPrazo] = useState<Array<{
    id?: string;
    prazo_dias: number;
    percentual: number;
    tipo: 'desconto' | 'acrescimo';
  }>>([]);

  // Estado para os descontos por valor
  const [descontosValor, setDescontosValor] = useState<Array<{
    id?: string;
    valor_minimo: number;
    percentual: number;
    tipo: 'desconto' | 'acrescimo';
  }>>([]);

  // Estado para novo desconto por prazo
  const [novoDescontoPrazo, setNovoDescontoPrazo] = useState({
    prazo_dias: 30,
    percentual: 0,
    tipo: 'desconto' as 'desconto' | 'acrescimo'
  });
  // Estado para armazenar os valores dos campos como string para permitir campo vazio
  const [prazoPercentualInput, setPrazoPercentualInput] = useState('0');
  const [prazoDiasInput, setPrazoDiasInput] = useState('30');

  // Estado para novo desconto por valor
  const [novoDescontoValor, setNovoDescontoValor] = useState({
    valor_minimo: 0,
    percentual: 0,
    tipo: 'desconto' as 'desconto' | 'acrescimo'
  });
  // Estado para armazenar os valores dos campos como string para permitir campo vazio
  const [valorPercentualInput, setValorPercentualInput] = useState('0');
  const [valorMinimoInput, setValorMinimoInput] = useState('0');

  const [novoTelefone, setNovoTelefone] = useState({
    numero: '',
    tipo: 'Celular' as 'Fixo' | 'Celular',
    whatsapp: false
  });
  const [formErrors, setFormErrors] = useState({
    nome: '',
    telefone: '',
    email: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadClientes();
    loadEmpresas();
  }, []);

  // Selecionar automaticamente a primeira empresa quando elas forem carregadas
  useEffect(() => {
    if (empresas.length > 0 && !formData.empresa_id) {
      setFormData(prev => ({
        ...prev,
        empresa_id: empresas[0].id
      }));
    }
  }, [empresas]);

  useEffect(() => {
    applyFilters();
  }, [clientes, searchTerm, empresaFilter]);

  const loadEmpresas = async () => {
    try {
      const { data: empresasData } = await supabase
        .from('empresas')
        .select('id, nome')
        .order('nome');

      if (empresasData) {
        setEmpresas(empresasData);
      }
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  const loadClientes = async () => {
    try {
      setIsLoading(true);

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

      // Buscar apenas os clientes da empresa do usuário
      const { data: clientesData, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('empresa_id', usuarioData.empresa_id)
        .or('deletado.is.null,deletado.eq.false')
        .order('nome');

      console.log('Clientes encontrados:', clientesData?.length);

      if (error) throw error;

      if (clientesData && clientesData.length > 0) {
        // Buscar todas as empresas para associar aos clientes
        const { data: empresasData } = await supabase
          .from('empresas')
          .select('id, nome');

        // Criar um mapa de empresas para facilitar a busca
        const empresasMap = new Map();
        if (empresasData) {
          empresasData.forEach(empresa => {
            empresasMap.set(empresa.id, empresa.nome);
          });
        }

        // Formatar dados dos clientes com os nomes das empresas
        const formattedClientes = clientesData.map(cliente => ({
          ...cliente,
          empresa_nome: empresasMap.get(cliente.empresa_id) || 'Empresa não encontrada'
        }));

        setClientes(formattedClientes);
        setFilteredClientes(formattedClientes);
      } else {
        setClientes([]);
        setFilteredClientes([]);
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...clientes];

    // Aplicar filtro de busca
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        cliente =>
          cliente.nome?.toLowerCase().includes(searchLower) ||
          cliente.telefone?.toLowerCase().includes(searchLower) ||
          cliente.email?.toLowerCase().includes(searchLower) ||
          cliente.endereco?.toLowerCase().includes(searchLower)
      );
    }

    // Aplicar filtro de empresa
    if (empresaFilter !== 'todas') {
      filtered = filtered.filter(cliente => cliente.empresa_id === empresaFilter);
    }

    setFilteredClientes(filtered);
  };

  const formatarTelefone = (telefone: string, tipo?: 'Fixo' | 'Celular') => {
    if (!telefone) return '';

    // Remove todos os caracteres não numéricos
    const numeroLimpo = telefone.replace(/\D/g, '');

    // Se o tipo for especificado, usa o formato correspondente
    if (tipo === 'Fixo') {
      // Formato (XX) XXXX-XXXX para telefones fixos
      return numeroLimpo.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, ddd, parte1, parte2) => {
        let resultado = '';
        if (ddd) resultado += `(${ddd}`;
        if (ddd && (parte1 || parte2)) resultado += ') ';
        if (parte1) resultado += parte1;
        if (parte1 && parte2) resultado += '-';
        if (parte2) resultado += parte2;
        return resultado;
      });
    } else if (tipo === 'Celular') {
      // Formato (XX) X XXXX-XXXX para celulares
      return numeroLimpo.replace(/^(\d{0,2})(\d{0,1})(\d{0,4})(\d{0,4}).*/, (_, ddd, digito9, parte1, parte2) => {
        let resultado = '';
        if (ddd) resultado += `(${ddd}`;
        if (ddd && (digito9 || parte1 || parte2)) resultado += ') ';
        if (digito9) resultado += `${digito9} `;
        if (parte1) resultado += parte1;
        if (parte1 && parte2) resultado += '-';
        if (parte2) resultado += parte2;
        return resultado;
      });
    } else {
      // Se o tipo não for especificado, determina pelo tamanho
      if (numeroLimpo.length <= 10) {
        // Formato (XX) XXXX-XXXX para telefones fixos
        return numeroLimpo.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
      } else {
        // Formato (XX) X XXXX-XXXX para celulares
        return numeroLimpo.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, '($1) $2 $3-$4');
      }
    }
  };

  const handleNovoTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setNovoTelefone({
      ...novoTelefone,
      numero: formatarTelefone(valor, novoTelefone.tipo)
    });
  };

  const handleTipoTelefoneChange = (tipo: 'Fixo' | 'Celular') => {
    // Se mudar o tipo, reformata o número de acordo com o novo tipo
    setNovoTelefone({
      ...novoTelefone,
      tipo,
      numero: novoTelefone.numero ? formatarTelefone(novoTelefone.numero.replace(/\D/g, ''), tipo) : ''
    });
  };

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNovoTelefone({
      ...novoTelefone,
      whatsapp: e.target.checked
    });
  };

  const adicionarTelefone = () => {
    if (!novoTelefone.numero) {
      toast.error('Digite um número de telefone');
      return;
    }

    // Validar o número de telefone
    const numeroLimpo = novoTelefone.numero.replace(/\D/g, '');
    if ((novoTelefone.tipo === 'Fixo' && numeroLimpo.length !== 10) ||
        (novoTelefone.tipo === 'Celular' && numeroLimpo.length !== 11)) {
      toast.error(`Número de ${novoTelefone.tipo.toLowerCase()} inválido`);
      return;
    }

    // Adicionar à lista de telefones
    setFormData({
      ...formData,
      telefones: [...formData.telefones, { ...novoTelefone }]
    });

    // Limpar o campo para adicionar outro telefone
    setNovoTelefone({
      numero: '',
      tipo: 'Celular',
      whatsapp: false
    });
  };

  const removerTelefone = (index: number) => {
    const novosTelefones = [...formData.telefones];
    novosTelefones.splice(index, 1);
    setFormData({
      ...formData,
      telefones: novosTelefones
    });
  };

  const formatarCNPJ = (cnpj: string) => {
    if (!cnpj) return '';

    // Remove todos os caracteres não numéricos
    const numeroLimpo = cnpj.replace(/\D/g, '');

    // Aplica a máscara de CNPJ (XX.XXX.XXX/XXXX-XX)
    return numeroLimpo
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18);
  };

  const formatarCPF = (cpf: string) => {
    if (!cpf) return '';

    // Remove todos os caracteres não numéricos
    const numeroLimpo = cpf.replace(/\D/g, '');

    // Aplica a máscara de CPF (XXX.XXX.XXX-XX)
    return numeroLimpo
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .substring(0, 14);
  };

  const handleDocumentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    const formatado = formData.tipo_documento === 'CNPJ'
      ? formatarCNPJ(valor)
      : formatarCPF(valor);

    setFormData({
      ...formData,
      documento: formatado
    });
  };

  const validarCNPJ = (cnpj: string) => {
    cnpj = cnpj.replace(/[^\d]+/g, '');

    if (cnpj === '') return false;
    if (cnpj.length !== 14) return false;

    // Elimina CNPJs inválidos conhecidos
    if (
      cnpj === '00000000000000' ||
      cnpj === '11111111111111' ||
      cnpj === '22222222222222' ||
      cnpj === '33333333333333' ||
      cnpj === '44444444444444' ||
      cnpj === '55555555555555' ||
      cnpj === '66666666666666' ||
      cnpj === '77777777777777' ||
      cnpj === '88888888888888' ||
      cnpj === '99999999999999'
    ) {
      return false;
    }

    // Valida DVs
    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    const digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(0))) return false;

    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(1))) return false;

    return true;
  };

  const validarCPF = (cpf: string) => {
    cpf = cpf.replace(/[^\d]+/g, '');

    if (cpf === '') return false;
    if (cpf.length !== 11) return false;

    // Elimina CPFs inválidos conhecidos
    if (
      cpf === '00000000000' ||
      cpf === '11111111111' ||
      cpf === '22222222222' ||
      cpf === '33333333333' ||
      cpf === '44444444444' ||
      cpf === '55555555555' ||
      cpf === '66666666666' ||
      cpf === '77777777777' ||
      cpf === '88888888888' ||
      cpf === '99999999999'
    ) {
      return false;
    }

    // Valida 1o dígito
    let add = 0;
    for (let i = 0; i < 9; i++) {
      add += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(9))) return false;

    // Valida 2o dígito
    add = 0;
    for (let i = 0; i < 10; i++) {
      add += parseInt(cpf.charAt(i)) * (11 - i);
    }
    rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(10))) return false;

    return true;
  };

  const buscarCNPJ = async () => {
    try {
      // Remove caracteres não numéricos para a busca
      const cnpjLimpo = formData.documento.replace(/\D/g, '');

      if (cnpjLimpo.length !== 14) {
        toast.error('CNPJ inválido. O CNPJ deve conter 14 dígitos.');
        return;
      }

      if (!validarCNPJ(cnpjLimpo)) {
        toast.error('CNPJ inválido. Verifique os dígitos informados.');
        return;
      }

      // Ativar o indicador de loading
      setIsCnpjLoading(true);

      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      const data = await response.json();

      if (response.ok) {
        setFormData({
          ...formData,
          razao_social: data.razao_social || '',
          nome_fantasia: data.nome_fantasia || '',
          nome: data.nome_fantasia || data.razao_social || '',
          cep: data.cep ? data.cep.replace(/(\d{5})(\d{3})/, '$1-$2') : '',
          endereco: data.logradouro || '',
          numero: data.numero || '',
          complemento: data.complemento || '',
          bairro: data.bairro || '',
          cidade: data.municipio || '',
          estado: data.uf || ''
        });

        toast.success('Dados do CNPJ carregados com sucesso!');
      } else {
        toast.error(data.message || 'CNPJ não encontrado');
      }
    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error);
      toast.error('Erro ao buscar CNPJ. Tente novamente.');
    } finally {
      // Desativar o indicador de loading
      setIsCnpjLoading(false);
    }
  };

  const formatarCep = (cep: string) => {
    // Remove todos os caracteres não numéricos
    const numeroLimpo = cep.replace(/\D/g, '');

    // Aplica a máscara de CEP (XX.XXX-XXX)
    return numeroLimpo.replace(/^(\d{2})(\d{3})(\d{3})$/, '$1.$2-$3');
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setFormData({
      ...formData,
      cep: formatarCep(valor)
    });
  };

  const buscarCep = async () => {
    try {
      // Remove caracteres não numéricos para a busca
      const cepLimpo = formData.cep.replace(/\D/g, '');

      if (cepLimpo.length !== 8) {
        toast.error('CEP inválido. O CEP deve conter 8 dígitos.');
        return;
      }

      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error('CEP não encontrado.');
        return;
      }

      setFormData({
        ...formData,
        endereco: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        estado: data.uf || ''
      });

      toast.success('Endereço encontrado com sucesso!');
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast.error('Erro ao buscar CEP. Tente novamente.');
    }
  };

  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  const validateForm = () => {
    let valid = true;
    const errors = {
      nome: '',
      telefone: '',
      email: ''
    };

    if (!formData.nome.trim()) {
      errors.nome = 'Nome é obrigatório';
      valid = false;
    }

    if (formData.telefones.length === 0) {
      errors.telefone = 'Adicione pelo menos um telefone';
      valid = false;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email inválido';
      valid = false;
    }

    // Não validamos mais a empresa_id, pois será selecionada automaticamente

    setFormErrors(errors);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Validar documento se preenchido
      if (formData.documento) {
        const documentoLimpo = formData.documento.replace(/\D/g, '');

        if (formData.tipo_documento === 'CNPJ') {
          if (!validarCNPJ(documentoLimpo)) {
            toast.error('CNPJ inválido. Verifique os dígitos informados.');
            setIsSubmitting(false);
            return;
          }
        } else {
          if (!validarCPF(documentoLimpo)) {
            toast.error('CPF inválido. Verifique os dígitos informados.');
            setIsSubmitting(false);
            return;
          }
        }
      }

      // Preparar os telefones para salvar (remover formatação)
      const telefonesParaSalvar = formData.telefones.map(tel => ({
        ...tel,
        numero: tel.numero.replace(/\D/g, '')
      }));

      // Manter compatibilidade com o campo telefone antigo
      // Usar o primeiro telefone da lista como telefone principal
      const telefonePrincipal = telefonesParaSalvar.length > 0 ? telefonesParaSalvar[0].numero : '';

      const clienteData = {
        tipo_documento: formData.tipo_documento,
        documento: formData.documento ? formData.documento.replace(/\D/g, '') : null,
        razao_social: formData.tipo_documento === 'CNPJ' ? formData.razao_social || null : null,
        nome_fantasia: formData.nome_fantasia || null,
        nome: formData.nome,
        telefone: telefonePrincipal,
        telefones: telefonesParaSalvar,
        email: formData.email || null,
        // Salvar cada campo de endereço separadamente
        endereco: formData.endereco || null,
        numero: formData.numero || null,
        complemento: formData.complemento || null,
        bairro: formData.bairro || null,
        cidade: formData.cidade || null,
        estado: formData.estado || null,
        cep: formData.cep ? formData.cep.replace(/\D/g, '') : null,
        empresa_id: formData.empresa_id,
        usuario_id: (await supabase.auth.getUser()).data.user?.id
      };

      let clienteId: string;

      if (editingCliente) {
        // Atualizar cliente existente
        const { error } = await supabase
          .from('clientes')
          .update(clienteData)
          .eq('id', editingCliente.id);

        if (error) throw error;
        clienteId = editingCliente.id;

        // Excluir descontos existentes para recriar
        const { error: deleteDescontosPrazoError } = await supabase
          .from('cliente_descontos_prazo')
          .delete()
          .eq('cliente_id', clienteId);

        if (deleteDescontosPrazoError) throw deleteDescontosPrazoError;

        const { error: deleteDescontosValorError } = await supabase
          .from('cliente_descontos_valor')
          .delete()
          .eq('cliente_id', clienteId);

        if (deleteDescontosValorError) throw deleteDescontosValorError;

        toast.success('Cliente atualizado com sucesso!');
      } else {
        // Criar novo cliente
        const { data: novoCliente, error } = await supabase
          .from('clientes')
          .insert(clienteData)
          .select('id')
          .single();

        if (error) throw error;
        if (!novoCliente) throw new Error('Erro ao obter ID do cliente criado');

        clienteId = novoCliente.id;
        toast.success('Cliente cadastrado com sucesso!');
      }

      // Salvar descontos por prazo
      if (descontosPrazo.length > 0) {
        const descontosPrazoData = descontosPrazo.map(desconto => ({
          cliente_id: clienteId,
          empresa_id: formData.empresa_id,
          prazo_dias: desconto.prazo_dias,
          percentual: desconto.percentual,
          tipo: desconto.tipo
        }));

        const { error: descontosPrazoError } = await supabase
          .from('cliente_descontos_prazo')
          .insert(descontosPrazoData);

        if (descontosPrazoError) throw descontosPrazoError;
      }

      // Salvar descontos por valor
      if (descontosValor.length > 0) {
        const descontosValorData = descontosValor.map(desconto => ({
          cliente_id: clienteId,
          empresa_id: formData.empresa_id,
          valor_minimo: desconto.valor_minimo,
          percentual: desconto.percentual,
          tipo: desconto.tipo
        }));

        const { error: descontosValorError } = await supabase
          .from('cliente_descontos_valor')
          .insert(descontosValorData);

        if (descontosValorError) throw descontosValorError;
      }

      // Recarregar a lista e fechar o sidebar
      loadClientes();
      setShowSidebar(false);
      resetForm();
    } catch (error: any) {
      console.error('Erro ao salvar cliente:', error);
      toast.error(`Erro ao salvar cliente: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (cliente: Cliente) => {
    // Usar diretamente os campos individuais de endereço
    console.log('Editando cliente:', cliente);

    // Formatar CEP se existir
    let cep = cliente.cep || '';
    if (cep && /^\d+$/.test(cep)) {
      cep = formatarCep(cep);
    }

    // Usar os campos individuais diretamente
    let endereco = cliente.endereco || '';
    let numero = cliente.numero || '';
    let complemento = cliente.complemento || '';
    let bairro = cliente.bairro || '';
    let cidade = cliente.cidade || '';
    let estado = cliente.estado || '';

    // Determinar o tipo de documento com base no formato
    let tipoDocumento = 'CNPJ';
    let documento = cliente.documento || '';
    let razaoSocial = cliente.razao_social || '';
    let nomeFantasia = cliente.nome_fantasia || '';

    // Se o documento tiver 11 dígitos (sem formatação), é um CPF
    if (documento.replace(/\D/g, '').length === 11) {
      tipoDocumento = 'CPF';
      documento = formatarCPF(documento);
    } else if (documento) {
      // Se não for CPF e tiver documento, formata como CNPJ
      documento = formatarCNPJ(documento);
    }

    setEditingCliente(cliente);
    // Converter o telefone antigo para o novo formato de lista, se necessário
    let telefones: Telefone[] = [];

    if (cliente.telefones && cliente.telefones.length > 0) {
      // Se já tiver a lista de telefones, usa ela
      telefones = cliente.telefones.map(tel => ({
        ...tel,
        numero: formatarTelefone(tel.numero, tel.tipo)
      }));
    } else if (cliente.telefone) {
      // Se tiver apenas o telefone antigo, converte para o novo formato
      const ehCelular = cliente.telefone.replace(/\D/g, '').length === 11;
      telefones = [{
        numero: formatarTelefone(cliente.telefone, ehCelular ? 'Celular' : 'Fixo'),
        tipo: ehCelular ? 'Celular' : 'Fixo',
        whatsapp: ehCelular // Assume que celulares têm WhatsApp por padrão
      }];
    }

    setFormData({
      tipo_documento: tipoDocumento,
      documento,
      razao_social: razaoSocial,
      nome_fantasia: nomeFantasia,
      nome: cliente.nome,
      telefones,
      email: cliente.email || '',
      cep,
      endereco,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      empresa_id: cliente.empresa_id
    });

    // Carregar os descontos do cliente
    await loadDescontos(cliente.id);

    setShowSidebar(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este cliente?')) return;

    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Cliente excluído com sucesso!');
      loadClientes();
    } catch (error: any) {
      console.error('Erro ao excluir cliente:', error);
      toast.error(`Erro ao excluir cliente: ${error.message}`);
    }
  };

  const resetForm = () => {
    // Manter a empresa_id atual ao resetar o formulário
    const currentEmpresaId = formData.empresa_id || (empresas.length > 0 ? empresas[0].id : '');

    setFormData({
      tipo_documento: 'CNPJ',
      documento: '',
      razao_social: '',
      nome_fantasia: '',
      nome: '',
      telefones: [],
      email: '',
      cep: '',
      endereco: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      empresa_id: currentEmpresaId
    });

    setNovoTelefone({
      numero: '',
      tipo: 'Celular',
      whatsapp: false
    });
    setFormErrors({
      nome: '',
      telefone: '',
      email: ''
    });

    // Resetar os descontos
    setDescontosPrazo([]);
    setDescontosValor([]);
    setNovoDescontoPrazo({
      prazo_dias: 30,
      percentual: 0,
      tipo: 'desconto'
    });
    setNovoDescontoValor({
      valor_minimo: 0,
      percentual: 0,
      tipo: 'desconto'
    });

    // Resetar os inputs de texto
    setPrazoPercentualInput('0');
    setPrazoDiasInput('30');
    setValorPercentualInput('0');
    setValorMinimoInput('0');

    // Resetar a aba ativa
    setActiveTab('dados-gerais');

    setEditingCliente(null);
  };

  // Função para carregar os descontos do cliente
  const loadDescontos = async (clienteId: string) => {
    try {
      // Carregar descontos por prazo
      const { data: descontosPrazoData, error: descontosPrazoError } = await supabase
        .from('cliente_descontos_prazo')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('prazo_dias');

      if (descontosPrazoError) throw descontosPrazoError;
      setDescontosPrazo(descontosPrazoData || []);

      // Carregar descontos por valor
      const { data: descontosValorData, error: descontosValorError } = await supabase
        .from('cliente_descontos_valor')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('valor_minimo');

      if (descontosValorError) throw descontosValorError;
      setDescontosValor(descontosValorData || []);

      // Resetar os inputs para os valores padrão
      setPrazoPercentualInput('0');
      setPrazoDiasInput('30');
      setValorPercentualInput('0');
      setValorMinimoInput('0');
    } catch (error) {
      console.error('Erro ao carregar descontos:', error);
      toast.error('Erro ao carregar descontos do cliente');
    }
  };

  // Função para adicionar desconto por prazo
  const adicionarDescontoPrazo = () => {
    if (novoDescontoPrazo.prazo_dias <= 0) {
      toast.error('O prazo deve ser maior que zero');
      return;
    }

    if (novoDescontoPrazo.percentual <= 0) {
      toast.error('O percentual deve ser maior que zero');
      return;
    }

    // Verificar se já existe um desconto para este prazo
    const existente = descontosPrazo.find(d => d.prazo_dias === novoDescontoPrazo.prazo_dias);
    if (existente) {
      toast.error(`Já existe um ${existente.tipo} para o prazo de ${existente.prazo_dias} dias`);
      return;
    }

    setDescontosPrazo([...descontosPrazo, { ...novoDescontoPrazo }]);

    // Resetar o formulário de novo desconto
    setNovoDescontoPrazo({
      prazo_dias: 30,
      percentual: 0,
      tipo: 'desconto'
    });

    // Resetar os inputs de texto
    setPrazoPercentualInput('0');
    setPrazoDiasInput('30');
  };

  // Função para remover desconto por prazo
  const removerDescontoPrazo = (index: number) => {
    const novosDescontos = [...descontosPrazo];
    novosDescontos.splice(index, 1);
    setDescontosPrazo(novosDescontos);
  };

  // Função para adicionar desconto por valor
  const adicionarDescontoValor = () => {
    if (novoDescontoValor.valor_minimo <= 0) {
      toast.error('O valor mínimo deve ser maior que zero');
      return;
    }

    if (novoDescontoValor.percentual <= 0) {
      toast.error('O percentual deve ser maior que zero');
      return;
    }

    // Verificar se já existe um desconto para este valor
    const existente = descontosValor.find(d => d.valor_minimo === novoDescontoValor.valor_minimo);
    if (existente) {
      toast.error(`Já existe um ${existente.tipo} para o valor mínimo de ${formatarPreco(existente.valor_minimo)}`);
      return;
    }

    setDescontosValor([...descontosValor, { ...novoDescontoValor }]);

    // Resetar o formulário de novo desconto
    setNovoDescontoValor({
      valor_minimo: 0,
      percentual: 0,
      tipo: 'desconto'
    });

    // Resetar os inputs de texto
    setValorPercentualInput('0');
    setValorMinimoInput('0');
  };

  // Função para remover desconto por valor
  const removerDescontoValor = (index: number) => {
    const novosDescontos = [...descontosValor];
    novosDescontos.splice(index, 1);
    setDescontosValor(novosDescontos);
  };

  // Função para formatar preço
  const formatarPreco = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const handleAddNew = () => {
    resetForm();
    setShowSidebar(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-white">Clientes</h1>
        <button
          onClick={handleAddNew}
          className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={18} />
          <span>Novo Cliente</span>
        </button>
      </div>

      <div className="bg-background-card rounded-lg border border-gray-800 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          {/* Barra de busca */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar por nome, telefone ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
            />
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <Filter size={18} />
            <span>Filtros</span>
          </button>
        </div>

        {/* Filtros */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Empresa
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setEmpresaFilter('todas')}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        empresaFilter === 'todas'
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Todas
                    </button>
                    {empresas.map((empresa) => (
                      <button
                        key={empresa.id}
                        onClick={() => setEmpresaFilter(empresa.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          empresaFilter === empresa.id
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {empresa.nome}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Lista de clientes */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="p-4 bg-background-card rounded-lg border border-gray-800">
              <div className="flex justify-between items-start">
                <div className="space-y-2 w-2/3">
                  <div className="h-5 w-32 bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-40 bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-36 bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-48 bg-gray-700 rounded animate-pulse"></div>
                </div>
                <div className="space-y-2 w-1/3 flex flex-col items-end">
                  <div className="h-4 w-24 bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-8 w-20 bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredClientes.length === 0 ? (
        <div className="bg-background-card rounded-lg border border-gray-800 p-8 text-center">
          <AlertCircle size={32} className="text-gray-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-2">
            Nenhum cliente encontrado
          </h3>
          <p className="text-gray-400 mb-4">
            {searchTerm || empresaFilter !== 'todas'
              ? 'Tente ajustar os filtros de busca'
              : 'Você ainda não possui clientes cadastrados'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredClientes.map((cliente) => (
            <motion.div
              key={cliente.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-background-card rounded-lg border border-gray-800 flex flex-col h-full"
            >
              <div className="flex-1">
                <h3 className="text-white font-medium text-lg">{cliente.nome}</h3>

                {/* Telefones */}
                <div className="space-y-1 mt-2">
                  {cliente.telefones && cliente.telefones.length > 0 ? (
                    cliente.telefones.map((tel, index) => (
                      <div key={index} className="flex items-center gap-1 text-gray-400 text-sm">
                        <Phone size={14} className={tel.whatsapp ? "text-green-500" : ""} />
                        <span>
                          {formatarTelefone(tel.numero, tel.tipo)}
                          <span className="text-xs ml-1">
                            ({tel.tipo}{tel.whatsapp ? " - WhatsApp" : ""})
                          </span>
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <Phone size={14} />
                      <span>{formatarTelefone(cliente.telefone)}</span>
                    </div>
                  )}
                </div>

                {cliente.email && (
                  <div className="flex items-center gap-1 text-gray-400 text-sm mt-2">
                    <Mail size={14} />
                    <span className="truncate">{cliente.email}</span>
                  </div>
                )}

                {(cliente.endereco || cliente.bairro || cliente.cidade) && (
                  <div className="flex items-center gap-1 text-gray-400 text-sm mt-2">
                    <MapPin size={14} />
                    <span className="truncate">
                      {cliente.endereco && `${cliente.endereco}${cliente.numero ? `, ${cliente.numero}` : ''}`}
                      {cliente.bairro && (cliente.endereco ? `, ${cliente.bairro}` : cliente.bairro)}
                      {cliente.cidade && (cliente.endereco || cliente.bairro ? `, ${cliente.cidade}` : cliente.cidade)}
                      {cliente.estado && `/${cliente.estado}`}
                    </span>
                  </div>
                )}

                {cliente.empresa_nome && (
                  <div className="flex items-center gap-1 text-gray-500 text-xs mt-3">
                    <Building size={12} />
                    <span>{cliente.empresa_nome}</span>
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-3">
                  Cadastrado em: {formatarData(cliente.created_at)}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-800">
                <button
                  onClick={() => handleEdit(cliente)}
                  className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                  title="Editar"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(cliente.id)}
                  className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Sidebar de cadastro/edição */}
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
                    {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
                  </h2>
                  <button
                    onClick={() => setShowSidebar(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Abas */}
                  <div className="flex border-b border-gray-700 mb-4">
                    <button
                      type="button"
                      onClick={() => setActiveTab('dados-gerais')}
                      className={`py-2 px-4 font-medium text-sm border-b-2 ${
                        activeTab === 'dados-gerais'
                          ? 'border-primary-500 text-primary-500'
                          : 'border-transparent text-gray-400 hover:text-white'
                      } transition-colors`}
                    >
                      Dados Gerais
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('descontos')}
                      className={`py-2 px-4 font-medium text-sm border-b-2 ${
                        activeTab === 'descontos'
                          ? 'border-primary-500 text-primary-500'
                          : 'border-transparent text-gray-400 hover:text-white'
                      } transition-colors`}
                    >
                      Descontos / Acréscimos
                    </button>
                  </div>

                  {/* Conteúdo da aba Dados Gerais */}
                  {activeTab === 'dados-gerais' ? (
                    <div className="space-y-4">
                      {/* Tipo de Documento */}
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Tipo de Documento
                        </label>
                        <div className="flex gap-4 mb-2">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              checked={formData.tipo_documento === 'CNPJ'}
                              onChange={() => setFormData({ ...formData, tipo_documento: 'CNPJ', documento: '' })}
                              className="mr-2 text-primary-500 focus:ring-primary-500/20"
                            />
                            <span className="text-white">CNPJ</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              checked={formData.tipo_documento === 'CPF'}
                              onChange={() => setFormData({ ...formData, tipo_documento: 'CPF', documento: '', razao_social: '' })}
                              className="mr-2 text-primary-500 focus:ring-primary-500/20"
                            />
                            <span className="text-white">CPF</span>
                          </label>
                        </div>
                      </div>

                  {/* Documento (CNPJ ou CPF) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      {formData.tipo_documento}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FileText size={18} className="text-gray-500" />
                      </div>
                      <input
                        type="text"
                        value={formData.documento}
                        onChange={handleDocumentoChange}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-10 pr-10 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        placeholder={formData.tipo_documento === 'CNPJ' ? 'XX.XXX.XXX/XXXX-XX' : 'XXX.XXX.XXX-XX'}
                      />
                      {formData.tipo_documento === 'CNPJ' && (
                        <button
                          type="button"
                          onClick={buscarCNPJ}
                          disabled={isCnpjLoading}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
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

                  {/* Razão Social (apenas para CNPJ) */}
                  {formData.tipo_documento === 'CNPJ' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Razão Social
                      </label>
                      <input
                        type="text"
                        value={formData.razao_social}
                        onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        placeholder="Razão Social"
                      />
                    </div>
                  )}

                  {/* Nome Fantasia */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Nome Fantasia
                    </label>
                    <input
                      type="text"
                      value={formData.nome_fantasia}
                      onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                      placeholder="Nome Fantasia"
                    />
                  </div>

                  {/* Nome */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Nome <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User size={18} className="text-gray-500" />
                      </div>
                      <input
                        type="text"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        className={`w-full bg-gray-800/50 border ${
                          formErrors.nome ? 'border-red-500' : 'border-gray-700'
                        } rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20`}
                        placeholder="Nome completo"
                      />
                    </div>
                    {formErrors.nome && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.nome}</p>
                    )}
                  </div>

                  {/* Telefones */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Telefones <span className="text-red-500">*</span>
                    </label>

                    {/* Lista de telefones adicionados */}
                    {formData.telefones.length > 0 && (
                      <div className="mb-3 space-y-2">
                        {formData.telefones.map((tel, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-gray-800/70 rounded-lg p-2 border border-gray-700"
                          >
                            <div className="flex items-center gap-2">
                              <Phone size={18} className={tel.whatsapp ? "text-green-500" : "text-gray-500"} />
                              <div>
                                <p className="text-white">{tel.numero}</p>
                                <p className="text-xs text-gray-400">
                                  {tel.tipo}{tel.whatsapp ? " - WhatsApp" : ""}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removerTelefone(index)}
                              className="text-red-400 hover:text-red-300 p-1"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Formulário para adicionar novo telefone */}
                    <div className="space-y-3 bg-gray-800/30 p-3 rounded-lg border border-gray-700">
                      <h4 className="text-sm font-medium text-gray-300">Adicionar telefone</h4>

                      {/* Tipo de telefone */}
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={novoTelefone.tipo === 'Celular'}
                            onChange={() => handleTipoTelefoneChange('Celular')}
                            className="mr-2 text-primary-500 focus:ring-primary-500/20"
                          />
                          <span className="text-white">Celular</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={novoTelefone.tipo === 'Fixo'}
                            onChange={() => handleTipoTelefoneChange('Fixo')}
                            className="mr-2 text-primary-500 focus:ring-primary-500/20"
                          />
                          <span className="text-white">Fixo</span>
                        </label>
                      </div>

                      {/* WhatsApp (apenas para celular) */}
                      {novoTelefone.tipo === 'Celular' && (
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={novoTelefone.whatsapp}
                            onChange={handleWhatsappChange}
                            className="mr-2 text-primary-500 focus:ring-primary-500/20"
                          />
                          <span className="text-white">Este número tem WhatsApp</span>
                        </label>
                      )}

                      {/* Campo de telefone */}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Phone size={18} className="text-gray-500" />
                          </div>
                          <input
                            type="text"
                            value={novoTelefone.numero}
                            onChange={handleNovoTelefoneChange}
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                            placeholder={novoTelefone.tipo === 'Celular' ? "(00) 0 0000-0000" : "(00) 0000-0000"}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={adicionarTelefone}
                          className="bg-primary-500 hover:bg-primary-600 text-white px-3 py-2 rounded-lg transition-colors"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>

                    {formErrors.telefone && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.telefone}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Email <span className="text-gray-500 text-xs">(opcional)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail size={18} className="text-gray-500" />
                      </div>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={`w-full bg-gray-800/50 border ${
                          formErrors.email ? 'border-red-500' : 'border-gray-700'
                        } rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20`}
                        placeholder="email@exemplo.com"
                      />
                    </div>
                    {formErrors.email && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
                    )}
                  </div>

                  {/* CEP */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      CEP <span className="text-gray-500 text-xs">(opcional)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapPin size={18} className="text-gray-500" />
                      </div>
                      <input
                        type="text"
                        value={formData.cep}
                        onChange={handleCepChange}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-10 pr-10 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        placeholder="XX.XXX-XXX"
                      />
                      <button
                        type="button"
                        onClick={buscarCep}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                      >
                        <Search size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Endereço */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Endereço <span className="text-gray-500 text-xs">(opcional)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapPin size={18} className="text-gray-500" />
                      </div>
                      <input
                        type="text"
                        value={formData.endereco}
                        onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        placeholder="Avenida, rua"
                      />
                    </div>
                  </div>

                  {/* Número e Complemento */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Número <span className="text-gray-500 text-xs">(opcional)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.numero}
                        onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        placeholder="Número"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Complemento <span className="text-gray-500 text-xs">(opcional)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.complemento}
                        onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        placeholder="Apto, sala, etc."
                      />
                    </div>
                  </div>

                  {/* Bairro */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Bairro <span className="text-gray-500 text-xs">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.bairro}
                      onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                      placeholder="Bairro"
                    />
                  </div>

                  {/* Cidade e Estado */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Cidade <span className="text-gray-500 text-xs">(opcional)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.cidade}
                        onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        placeholder="Cidade"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Estado <span className="text-gray-500 text-xs">(opcional)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.estado}
                        onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        placeholder="UF"
                        maxLength={2}
                      />
                    </div>
                  </div>

                  {/* Campo oculto para empresa - selecionada automaticamente */}
                  <input type="hidden" value={formData.empresa_id} />

                    </div>
                  ) : null}

                  {/* Conteúdo da aba Descontos */}
                  {activeTab === 'descontos' && (
                    <div className="space-y-6">
                      {/* Descontos por Prazo de Faturamento */}
                      <div className="space-y-4">
                        <h3 className="text-white font-medium">Descontos por Prazo de Faturamento</h3>
                        <p className="text-sm text-gray-400">
                          Configure descontos ou acréscimos de acordo com o prazo de faturamento.
                        </p>

                        {/* Lista de descontos por prazo */}
                        {descontosPrazo.length > 0 && (
                          <div className="space-y-2 mb-4">
                            {descontosPrazo.map((desconto, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between bg-gray-800/70 rounded-lg p-3 border border-gray-700"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-white font-medium">{desconto.prazo_dias} dias</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                      desconto.tipo === 'desconto'
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-red-500/20 text-red-400'
                                    }`}>
                                      {desconto.tipo === 'desconto' ? 'Desconto' : 'Acréscimo'}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-400">
                                    {desconto.percentual}% de {desconto.tipo}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removerDescontoPrazo(index)}
                                  className="text-red-400 hover:text-red-300 p-1"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Formulário para adicionar novo desconto por prazo */}
                        <div className="space-y-3 bg-gray-800/30 p-4 rounded-lg border border-gray-700">
                          <h4 className="text-sm font-medium text-gray-300">Adicionar desconto por prazo</h4>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-400 mb-1">
                                Prazo (dias)
                              </label>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={prazoDiasInput}
                                onChange={(e) => {
                                  // Permitir campo vazio ou valores válidos
                                  const value = e.target.value;
                                  // Aceitar apenas números inteiros
                                  if (value === '' || /^[0-9]*$/.test(value)) {
                                    setPrazoDiasInput(value);
                                    // Atualizar o estado real apenas se houver um valor
                                    const numValue = value === '' ? 0 : parseInt(value);
                                    setNovoDescontoPrazo({
                                      ...novoDescontoPrazo,
                                      prazo_dias: numValue
                                    });
                                  }
                                }}
                                placeholder="30"
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-400 mb-1">
                                Percentual (%)
                              </label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={prazoPercentualInput}
                                onChange={(e) => {
                                  // Permitir campo vazio ou valores válidos
                                  const value = e.target.value;
                                  // Aceitar apenas números e ponto decimal
                                  if (value === '' || /^[0-9]*[.]?[0-9]*$/.test(value)) {
                                    setPrazoPercentualInput(value);
                                    // Atualizar o estado real apenas se houver um valor
                                    const numValue = value === '' ? 0 : parseFloat(value);
                                    setNovoDescontoPrazo({
                                      ...novoDescontoPrazo,
                                      percentual: numValue
                                    });
                                  }
                                }}
                                placeholder="0,00"
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">
                              Tipo
                            </label>
                            <div className="flex gap-4">
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  checked={novoDescontoPrazo.tipo === 'desconto'}
                                  onChange={() => setNovoDescontoPrazo({
                                    ...novoDescontoPrazo,
                                    tipo: 'desconto'
                                  })}
                                  className="mr-2 text-primary-500 focus:ring-primary-500/20"
                                />
                                <span className="text-white">Desconto</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  checked={novoDescontoPrazo.tipo === 'acrescimo'}
                                  onChange={() => setNovoDescontoPrazo({
                                    ...novoDescontoPrazo,
                                    tipo: 'acrescimo'
                                  })}
                                  className="mr-2 text-primary-500 focus:ring-primary-500/20"
                                />
                                <span className="text-white">Acréscimo</span>
                              </label>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={adicionarDescontoPrazo}
                            className="w-full mt-2 bg-primary-500 hover:bg-primary-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                            <Plus size={16} />
                            <span>Adicionar</span>
                          </button>
                        </div>
                      </div>

                      {/* Descontos por Valor do Pedido */}
                      <div className="space-y-4 mt-8">
                        <h3 className="text-white font-medium">Descontos por Valor do Pedido</h3>
                        <p className="text-sm text-gray-400">
                          Configure descontos ou acréscimos de acordo com o valor total do pedido.
                        </p>

                        {/* Lista de descontos por valor */}
                        {descontosValor.length > 0 && (
                          <div className="space-y-2 mb-4">
                            {descontosValor.map((desconto, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between bg-gray-800/70 rounded-lg p-3 border border-gray-700"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-white font-medium">A partir de {formatarPreco(desconto.valor_minimo)}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                      desconto.tipo === 'desconto'
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-red-500/20 text-red-400'
                                    }`}>
                                      {desconto.tipo === 'desconto' ? 'Desconto' : 'Acréscimo'}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-400">
                                    {desconto.percentual}% de {desconto.tipo}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removerDescontoValor(index)}
                                  className="text-red-400 hover:text-red-300 p-1"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Formulário para adicionar novo desconto por valor */}
                        <div className="space-y-3 bg-gray-800/30 p-4 rounded-lg border border-gray-700">
                          <h4 className="text-sm font-medium text-gray-300">Adicionar desconto por valor</h4>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-400 mb-1">
                                Valor Mínimo (R$)
                              </label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={valorMinimoInput}
                                onChange={(e) => {
                                  // Permitir campo vazio ou valores válidos
                                  const value = e.target.value;
                                  // Aceitar apenas números e ponto decimal
                                  if (value === '' || /^[0-9]*[.]?[0-9]*$/.test(value)) {
                                    setValorMinimoInput(value);
                                    // Atualizar o estado real apenas se houver um valor
                                    const numValue = value === '' ? 0 : parseFloat(value);
                                    setNovoDescontoValor({
                                      ...novoDescontoValor,
                                      valor_minimo: numValue
                                    });
                                  }
                                }}
                                placeholder="0,00"
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-400 mb-1">
                                Percentual (%)
                              </label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={valorPercentualInput}
                                onChange={(e) => {
                                  // Permitir campo vazio ou valores válidos
                                  const value = e.target.value;
                                  // Aceitar apenas números e ponto decimal
                                  if (value === '' || /^[0-9]*[.]?[0-9]*$/.test(value)) {
                                    setValorPercentualInput(value);
                                    // Atualizar o estado real apenas se houver um valor
                                    const numValue = value === '' ? 0 : parseFloat(value);
                                    setNovoDescontoValor({
                                      ...novoDescontoValor,
                                      percentual: numValue
                                    });
                                  }
                                }}
                                placeholder="0,00"
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">
                              Tipo
                            </label>
                            <div className="flex gap-4">
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  checked={novoDescontoValor.tipo === 'desconto'}
                                  onChange={() => setNovoDescontoValor({
                                    ...novoDescontoValor,
                                    tipo: 'desconto'
                                  })}
                                  className="mr-2 text-primary-500 focus:ring-primary-500/20"
                                />
                                <span className="text-white">Desconto</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  checked={novoDescontoValor.tipo === 'acrescimo'}
                                  onChange={() => setNovoDescontoValor({
                                    ...novoDescontoValor,
                                    tipo: 'acrescimo'
                                  })}
                                  className="mr-2 text-primary-500 focus:ring-primary-500/20"
                                />
                                <span className="text-white">Acréscimo</span>
                              </label>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={adicionarDescontoValor}
                            className="w-full mt-2 bg-primary-500 hover:bg-primary-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                            <Plus size={16} />
                            <span>Adicionar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowSidebar(false)}
                      className="flex-1 px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Salvando...</span>
                        </>
                      ) : (
                        <>
                          <Check size={18} />
                          <span>Salvar</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClientesPage;
