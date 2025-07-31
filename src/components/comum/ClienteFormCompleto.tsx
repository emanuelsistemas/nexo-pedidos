import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, Mail, MapPin, FileText, Building, Search, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';

interface Telefone {
  numero: string;
  tipo: 'Celular' | 'Fixo';
  whatsapp: boolean;
}

interface ClienteFormCompletoProps {
  isOpen: boolean;
  onClose: () => void;
  empresaId: string;
  onClienteCreated: (clienteId: string) => void;
  fornecedorMode?: boolean;
}

const ClienteFormCompleto: React.FC<ClienteFormCompletoProps> = ({
  isOpen,
  onClose,
  empresaId,
  onClienteCreated,
  fornecedorMode = false
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCnpjLoading, setIsCnpjLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dados-gerais' | 'descontos' | 'financeiro' | 'observacao'>('dados-gerais');
  
  const [formData, setFormData] = useState({
    tipo_documento: 'CNPJ',
    documento: '',
    razao_social: '',
    nome_fantasia: '',
    nome: '',
    telefones: [] as Telefone[],
    emails: [] as string[],
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    empresa_id: empresaId,
    indicador_ie: 9,
    codigo_municipio: '',
    inscricao_estadual: '',
    // Tipos de cliente
    is_cliente: fornecedorMode ? false : true,
    is_funcionario: false,
    is_vendedor: false,
    is_fornecedor: fornecedorMode ? true : false,
    is_transportadora: false,
    // Observações
    observacao_nfe: '',
    observacao_interna: ''
  });

  const [novoTelefone, setNovoTelefone] = useState({
    numero: '',
    tipo: 'Celular' as 'Celular' | 'Fixo',
    whatsapp: false
  });

  const [novoEmail, setNovoEmail] = useState('');

  // Estados para descontos
  const [descontosPrazo, setDescontosPrazo] = useState<Array<{
    id?: string;
    prazo_dias: number;
    percentual: number;
    tipo: 'desconto' | 'acrescimo';
  }>>([]);

  const [descontosValor, setDescontosValor] = useState<Array<{
    id?: string;
    valor_minimo: number;
    percentual: number;
    tipo: 'desconto' | 'acrescimo';
  }>>([]);

  const [novoDescontoPrazo, setNovoDescontoPrazo] = useState({
    prazo_dias: 30,
    percentual: 0,
    tipo: 'desconto' as 'desconto' | 'acrescimo'
  });

  const [novoDescontoValor, setNovoDescontoValor] = useState({
    valor_minimo: 0,
    percentual: 0,
    tipo: 'desconto' as 'desconto' | 'acrescimo'
  });

  // Estados para inputs de texto (para permitir campos vazios)
  const [prazoPercentualInput, setPrazoPercentualInput] = useState('0');
  const [prazoDiasInput, setPrazoDiasInput] = useState('30');
  const [valorPercentualInput, setValorPercentualInput] = useState('0');
  const [valorMinimoInput, setValorMinimoInput] = useState('0');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        tipo_documento: 'CNPJ',
        documento: '',
        razao_social: '',
        nome_fantasia: '',
        nome: '',
        telefones: [],
        emails: [],
        cep: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        empresa_id: empresaId,
        indicador_ie: 9,
        codigo_municipio: '',
        inscricao_estadual: '',
        // Tipos de cliente
        is_cliente: fornecedorMode ? false : true,
        is_funcionario: false,
        is_vendedor: false,
        is_fornecedor: fornecedorMode ? true : false,
        is_transportadora: false,
        // Observações
        observacao_nfe: '',
        observacao_interna: ''
      });
      setActiveTab('dados-gerais');
      // Reset descontos
      setDescontosPrazo([]);
      setDescontosValor([]);
      setNovoDescontoPrazo({ prazo_dias: 30, percentual: 0, tipo: 'desconto' });
      setNovoDescontoValor({ valor_minimo: 0, percentual: 0, tipo: 'desconto' });
      setPrazoPercentualInput('0');
      setPrazoDiasInput('30');
      setValorPercentualInput('0');
      setValorMinimoInput('0');
    }
  }, [isOpen, empresaId, fornecedorMode]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTipoDocumentoChange = (tipo: 'CNPJ' | 'CPF') => {
    setFormData(prev => ({
      ...prev,
      tipo_documento: tipo,
      documento: '',
      razao_social: '',
      nome_fantasia: '',
      indicador_ie: tipo === 'CPF' ? 9 : 1
    }));
  };

  const adicionarTelefone = () => {
    if (novoTelefone.numero.trim()) {
      setFormData(prev => ({
        ...prev,
        telefones: [...prev.telefones, { ...novoTelefone }]
      }));
      setNovoTelefone({
        numero: '',
        tipo: 'Celular',
        whatsapp: false
      });
    }
  };

  const removerTelefone = (index: number) => {
    setFormData(prev => ({
      ...prev,
      telefones: prev.telefones.filter((_, i) => i !== index)
    }));
  };

  const adicionarEmail = () => {
    if (novoEmail.trim() && !formData.emails.includes(novoEmail.trim())) {
      setFormData(prev => ({
        ...prev,
        emails: [...prev.emails, novoEmail.trim()]
      }));
      setNovoEmail('');
    }
  };

  const removerEmail = (index: number) => {
    setFormData(prev => ({
      ...prev,
      emails: prev.emails.filter((_, i) => i !== index)
    }));
  };

  // Função para validar CNPJ
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

  // Função para validar CPF
  const validarCPF = (cpf: string) => {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

    let add = 0;
    for (let i = 0; i < 9; i++) {
      add += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(9))) return false;

    add = 0;
    for (let i = 0; i < 10; i++) {
      add += parseInt(cpf.charAt(i)) * (11 - i);
    }
    rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(10))) return false;

    return true;
  };

  const buscarCodigoIBGE = async (cidade: string, estado: string): Promise<string> => {
    try {
      if (!cidade || !estado) return '';

      const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado}/municipios`);
      const municipios = await response.json();

      const municipio = municipios.find((m: any) =>
        m.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') ===
        cidade.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      );

      return municipio ? municipio.id.toString() : '';
    } catch (error) {
      console.error('Erro ao buscar código IBGE:', error);
      return '';
    }
  };

  // Função para buscar dados por CNPJ
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
        // Buscar código IBGE do município
        const codigoIBGE = await buscarCodigoIBGE(data.municipio, data.uf);

        setFormData(prev => ({
          ...prev,
          razao_social: data.razao_social || '',
          nome_fantasia: data.nome_fantasia || '',
          nome: data.nome_fantasia || data.razao_social || '',
          cep: data.cep ? data.cep.replace(/(\d{5})(\d{3})/, '$1-$2') : '',
          endereco: data.logradouro || '',
          numero: data.numero || '',
          complemento: data.complemento || '',
          bairro: data.bairro || '',
          cidade: data.municipio || '',
          estado: data.uf || '',
          codigo_municipio: codigoIBGE
        }));

        if (codigoIBGE) {
          toast.success('Dados do CNPJ e código IBGE carregados com sucesso!');
        } else {
          toast.success('Dados do CNPJ carregados! Código IBGE não encontrado automaticamente.');
        }
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

  const buscarCEP = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await response.json();

        if (!data.erro) {
          // Buscar código IBGE do município
          const codigoIBGE = await buscarCodigoIBGE(data.localidade, data.uf);

          setFormData(prev => ({
            ...prev,
            endereco: data.logradouro || '',
            bairro: data.bairro || '',
            cidade: data.localidade || '',
            estado: data.uf || '',
            codigo_municipio: codigoIBGE
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      }
    }
  };

  const formatarCep = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) {
      return numbers;
    }
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  const formatarDocumento = (value: string, tipo: 'CNPJ' | 'CPF') => {
    const numbers = value.replace(/\D/g, '');
    
    if (tipo === 'CPF') {
      if (numbers.length <= 3) return numbers;
      if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
      if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
    } else {
      if (numbers.length <= 2) return numbers;
      if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
      if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
      if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
      return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
    }
  };

  const formatarTelefone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  // Funções para gerenciar descontos por prazo
  const adicionarDescontoPrazo = () => {
    if (novoDescontoPrazo.prazo_dias > 0 && novoDescontoPrazo.percentual >= 0) {
      setDescontosPrazo([...descontosPrazo, { ...novoDescontoPrazo }]);
      setNovoDescontoPrazo({ prazo_dias: 30, percentual: 0, tipo: 'desconto' });
      setPrazoPercentualInput('0');
      setPrazoDiasInput('30');
    }
  };

  const removerDescontoPrazo = (index: number) => {
    const novosDescontos = [...descontosPrazo];
    novosDescontos.splice(index, 1);
    setDescontosPrazo(novosDescontos);
  };

  // Funções para gerenciar descontos por valor
  const adicionarDescontoValor = () => {
    if (novoDescontoValor.valor_minimo >= 0 && novoDescontoValor.percentual >= 0) {
      setDescontosValor([...descontosValor, { ...novoDescontoValor }]);
      setNovoDescontoValor({ valor_minimo: 0, percentual: 0, tipo: 'desconto' });
      setValorPercentualInput('0');
      setValorMinimoInput('0');
    }
  };

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

  const validateForm = () => {
    // Validações básicas
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return false;
    }

    if (formData.telefones.length === 0) {
      toast.error('Adicione pelo menos um telefone');
      return false;
    }

    // Validar documento se preenchido
    if (formData.documento) {
      const documentoLimpo = formData.documento.replace(/\D/g, '');

      if (formData.tipo_documento === 'CNPJ') {
        if (!validarCNPJ(documentoLimpo)) {
          toast.error('CNPJ inválido. Verifique os dígitos informados.');
          return false;
        }
      } else {
        if (!validarCPF(documentoLimpo)) {
          toast.error('CPF inválido. Verifique os dígitos informados.');
          return false;
        }
      }
    }

    // Validar emails se houver algum
    if (formData.emails.length > 0) {
      const emailsInvalidos = formData.emails.filter(email => !validarEmail(email));
      if (emailsInvalidos.length > 0) {
        toast.error('Um ou mais emails são inválidos');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!validateForm()) {
        return;
      }

      // Preparar telefones para salvar (remover formatação)
      const telefonesParaSalvar = formData.telefones.map(tel => ({
        ...tel,
        numero: tel.numero.replace(/\D/g, '')
      }));

      const telefonePrincipal = telefonesParaSalvar.length > 0 ? telefonesParaSalvar[0].numero : '';

      // Obter dados do usuário para empresa_id
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('Usuário não autenticado');
        return;
      }

      const clienteData = {
        tipo_documento: formData.tipo_documento,
        documento: formData.documento ? formData.documento.replace(/\D/g, '') : null,
        razao_social: formData.tipo_documento === 'CNPJ' ? (formData.razao_social || null) : null,
        nome_fantasia: formData.nome_fantasia || null,
        nome: formData.nome,
        telefone: telefonePrincipal,
        telefones: telefonesParaSalvar,
        emails: formData.emails.length > 0 ? formData.emails : [],
        // Salvar cada campo de endereço separadamente
        endereco: formData.endereco || null,
        numero: formData.numero || null,
        complemento: formData.complemento || null,
        bairro: formData.bairro || null,
        cidade: formData.cidade || null,
        estado: formData.estado || null,
        cep: formData.cep ? formData.cep.replace(/\D/g, '') : null,
        // Campos NFe
        indicador_ie: formData.indicador_ie,
        // Tipos de cliente
        is_cliente: formData.is_cliente,
        is_funcionario: formData.is_funcionario,
        is_vendedor: formData.is_vendedor,
        is_fornecedor: formData.is_fornecedor,
        is_transportadora: formData.is_transportadora,
        codigo_municipio: formData.codigo_municipio || null,
        inscricao_estadual: formData.inscricao_estadual || null,
        // Observações
        observacao_nfe: formData.observacao_nfe || null,
        observacao_interna: formData.observacao_interna || null,
        empresa_id: empresaId,
        usuario_id: userData.user.id
      };

      console.log('Dados do cliente a serem salvos:', clienteData);

      const { data, error } = await supabase
        .from('clientes')
        .insert(clienteData)
        .select('id')
        .single();

      if (error) {
        console.error('Erro ao criar cliente:', error);
        toast.error('Erro ao criar cliente. Tente novamente.');
        return;
      }

      if (!data) {
        toast.error('Erro ao obter ID do cliente criado');
        return;
      }

      toast.success(`${fornecedorMode ? 'Fornecedor' : 'Cliente'} criado com sucesso!`);
      onClienteCreated(data.id);
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error(error.message || 'Erro ao salvar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.3 }}
        className="fixed right-0 top-0 h-screen w-full max-w-lg bg-background-card border-l border-gray-800 z-50 overflow-y-auto custom-scrollbar"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">
              {fornecedorMode ? 'Novo Fornecedor' : 'Novo Cliente'}
            </h2>
            <button
              onClick={onClose}
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
                className={`py-2 px-2 font-medium text-xs border-b-2 flex-1 text-center ${
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
                className={`py-2 px-2 font-medium text-xs border-b-2 flex-1 text-center ${
                  activeTab === 'descontos'
                    ? 'border-primary-500 text-primary-500'
                    : 'border-transparent text-gray-400 hover:text-white'
                } transition-colors`}
              >
                Descontos
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('financeiro')}
                className={`py-2 px-2 font-medium text-xs border-b-2 flex-1 text-center ${
                  activeTab === 'financeiro'
                    ? 'border-primary-500 text-primary-500'
                    : 'border-transparent text-gray-400 hover:text-white'
                } transition-colors`}
              >
                Financeiro
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('observacao')}
                className={`py-2 px-2 font-medium text-xs border-b-2 flex-1 text-center ${
                  activeTab === 'observacao'
                    ? 'border-primary-500 text-primary-500'
                    : 'border-transparent text-gray-400 hover:text-white'
                } transition-colors`}
              >
                Observação
              </button>
            </div>

            {/* Conteúdo da aba Dados Gerais */}
            {activeTab === 'dados-gerais' && (
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
                        onChange={() => handleTipoDocumentoChange('CNPJ')}
                        className="mr-2 text-primary-500 focus:ring-primary-500/20"
                      />
                      <span className="text-white">CNPJ</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={formData.tipo_documento === 'CPF'}
                        onChange={() => handleTipoDocumentoChange('CPF')}
                        className="mr-2 text-primary-500 focus:ring-primary-500/20"
                      />
                      <span className="text-white">CPF</span>
                    </label>
                  </div>
                </div>

                {/* Documento */}
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
                      onChange={(e) => handleInputChange('documento', formatarDocumento(e.target.value, formData.tipo_documento))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 pl-10 pr-10 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                      placeholder={formData.tipo_documento === 'CNPJ' ? 'XX.XXX.XXX/XXXX-XX' : 'XXX.XXX.XXX-XX'}
                    />
                    {formData.tipo_documento === 'CNPJ' && (
                      <button
                        type="button"
                        onClick={buscarCNPJ}
                        disabled={isCnpjLoading}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Buscar dados do CNPJ"
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

                {/* Razão Social / Nome Fantasia */}
                {formData.tipo_documento === 'CNPJ' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Razão Social
                      </label>
                      <input
                        type="text"
                        value={formData.razao_social}
                        onChange={(e) => handleInputChange('razao_social', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        placeholder="Razão Social"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Nome Fantasia
                      </label>
                      <input
                        type="text"
                        value={formData.nome_fantasia}
                        onChange={(e) => handleInputChange('nome_fantasia', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        placeholder="Nome Fantasia"
                      />
                    </div>
                  </>
                )}

                {/* Nome */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Nome <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={(e) => handleInputChange('nome', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-3 py-2 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                      placeholder="Nome completo"
                      required
                    />
                  </div>
                </div>

                {/* Telefones */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Telefones <span className="text-red-500">*</span>
                  </label>

                  {/* Lista de telefones */}
                  {formData.telefones.map((telefone, index) => (
                    <div key={index} className="flex items-center gap-2 mb-2 p-2 bg-gray-800/50 rounded-lg">
                      <Phone size={16} className="text-gray-400" />
                      <span className="text-white flex-1">{telefone.numero}</span>
                      <span className="text-gray-400 text-sm">{telefone.tipo}</span>
                      {telefone.whatsapp && <span className="text-green-500 text-sm">WhatsApp</span>}
                      <button
                        type="button"
                        onClick={() => removerTelefone(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}

                  {/* Adicionar telefone */}
                  <div className="space-y-2 p-3 bg-gray-800/30 rounded-lg">
                    <div className="text-sm text-gray-400 mb-2">Adicionar telefone</div>
                    <div className="flex gap-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={novoTelefone.tipo === 'Celular'}
                          onChange={() => setNovoTelefone(prev => ({ ...prev, tipo: 'Celular' }))}
                          className="mr-1 text-primary-500"
                        />
                        <span className="text-white text-sm">Celular</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={novoTelefone.tipo === 'Fixo'}
                          onChange={() => setNovoTelefone(prev => ({ ...prev, tipo: 'Fixo' }))}
                          className="mr-1 text-primary-500"
                        />
                        <span className="text-white text-sm">Fixo</span>
                      </label>
                    </div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={novoTelefone.whatsapp}
                        onChange={(e) => setNovoTelefone(prev => ({ ...prev, whatsapp: e.target.checked }))}
                        className="mr-2 text-primary-500"
                      />
                      <span className="text-white text-sm">Este número tem WhatsApp</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                        <input
                          type="text"
                          value={novoTelefone.numero}
                          onChange={(e) => setNovoTelefone(prev => ({ ...prev, numero: formatarTelefone(e.target.value) }))}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
                          placeholder="(00) 0 0000-0000"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={adicionarTelefone}
                        className="px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Emails */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Emails <span className="text-gray-500">(opcional)</span>
                  </label>

                  {/* Lista de emails */}
                  {formData.emails.map((email, index) => (
                    <div key={index} className="flex items-center gap-2 mb-2 p-2 bg-gray-800/50 rounded-lg">
                      <Mail size={16} className="text-gray-400" />
                      <span className="text-white flex-1">{email}</span>
                      <button
                        type="button"
                        onClick={() => removerEmail(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}

                  {/* Adicionar email */}
                  <div className="space-y-2 p-3 bg-gray-800/30 rounded-lg">
                    <div className="text-sm text-gray-400 mb-2">Adicionar email</div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                        <input
                          type="email"
                          value={novoEmail}
                          onChange={(e) => setNovoEmail(e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
                          placeholder="email@exemplo.com"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={adicionarEmail}
                        className="px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* CEP */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    CEP <span className="text-gray-500">(opcional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin size={18} className="text-gray-500" />
                    </div>
                    <input
                      type="text"
                      value={formData.cep}
                      onChange={(e) => {
                        const formatted = formatarCep(e.target.value);
                        handleInputChange('cep', formatted);
                      }}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 pl-10 pr-10 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                      placeholder="00000-000"
                      maxLength={9}
                    />
                    <button
                      type="button"
                      onClick={() => buscarCEP(formData.cep)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                      title="Buscar endereço pelo CEP"
                    >
                      <Search size={18} />
                    </button>
                  </div>
                </div>

                {/* Endereço */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Endereço
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      value={formData.endereco}
                      onChange={(e) => handleInputChange('endereco', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-3 py-2 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                      placeholder="Rua, avenida, etc."
                    />
                  </div>
                </div>

                {/* Número e Complemento */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Número
                    </label>
                    <input
                      type="text"
                      value={formData.numero}
                      onChange={(e) => handleInputChange('numero', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                      placeholder="123"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Complemento
                    </label>
                    <input
                      type="text"
                      value={formData.complemento}
                      onChange={(e) => handleInputChange('complemento', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                      placeholder="Apto, sala, etc."
                    />
                  </div>
                </div>

                {/* Bairro e Cidade */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Bairro
                    </label>
                    <input
                      type="text"
                      value={formData.bairro}
                      onChange={(e) => handleInputChange('bairro', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                      placeholder="Bairro"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Cidade
                    </label>
                    <input
                      type="text"
                      value={formData.cidade}
                      onChange={(e) => handleInputChange('cidade', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                      placeholder="Cidade"
                    />
                  </div>
                </div>

                {/* Estado */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Estado
                  </label>
                  <select
                    value={formData.estado}
                    onChange={(e) => handleInputChange('estado', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                  >
                    <option value="">Selecione o estado</option>
                    <option value="AC">Acre</option>
                    <option value="AL">Alagoas</option>
                    <option value="AP">Amapá</option>
                    <option value="AM">Amazonas</option>
                    <option value="BA">Bahia</option>
                    <option value="CE">Ceará</option>
                    <option value="DF">Distrito Federal</option>
                    <option value="ES">Espírito Santo</option>
                    <option value="GO">Goiás</option>
                    <option value="MA">Maranhão</option>
                    <option value="MT">Mato Grosso</option>
                    <option value="MS">Mato Grosso do Sul</option>
                    <option value="MG">Minas Gerais</option>
                    <option value="PA">Pará</option>
                    <option value="PB">Paraíba</option>
                    <option value="PR">Paraná</option>
                    <option value="PE">Pernambuco</option>
                    <option value="PI">Piauí</option>
                    <option value="RJ">Rio de Janeiro</option>
                    <option value="RN">Rio Grande do Norte</option>
                    <option value="RS">Rio Grande do Sul</option>
                    <option value="RO">Rondônia</option>
                    <option value="RR">Roraima</option>
                    <option value="SC">Santa Catarina</option>
                    <option value="SP">São Paulo</option>
                    <option value="SE">Sergipe</option>
                    <option value="TO">Tocantins</option>
                  </select>
                </div>

                {/* Código do Município (IBGE) */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Código do Município (IBGE) <span className="text-gray-500">(NFe)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.codigo_municipio}
                      onChange={(e) => handleInputChange('codigo_municipio', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pr-10 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                      placeholder="3525904 (7 dígitos)"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (formData.cidade && formData.estado) {
                          const codigoIBGE = await buscarCodigoIBGE(formData.cidade, formData.estado);
                          if (codigoIBGE) {
                            handleInputChange('codigo_municipio', codigoIBGE);
                            toast.success('Código IBGE encontrado!');
                          } else {
                            toast.error('Código IBGE não encontrado para esta cidade/estado.');
                          }
                        } else {
                          toast.error('Preencha cidade e estado primeiro.');
                        }
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      title="Buscar código IBGE automaticamente"
                    >
                      <Search size={18} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Preenchido automaticamente ao buscar por CNPJ ou CEP</p>
                </div>

                {/* Indicador de Inscrição Estadual */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Indicador de Inscrição Estadual <span className="text-gray-500">(NFe)</span>
                  </label>
                  <select
                    value={formData.indicador_ie}
                    onChange={(e) => handleInputChange('indicador_ie', parseInt(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                  >
                    <option value={1}>1 - Contribuinte ICMS</option>
                    <option value={2}>2 - Contribuinte isento de Inscrição no cadastro de Contribuintes</option>
                    <option value={9}>9 - Não Contribuinte</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Automaticamente definido: CPF = Não contribuinte, CNPJ = Contribuinte</p>
                </div>

                {/* Tipos de Cliente */}
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h3 className="text-white font-medium mb-3">Tipos de Cliente</h3>
                  {fornecedorMode ? (
                    <p className="text-sm text-gray-400 mb-4">
                      Este cadastro será criado como Fornecedor para entrada de mercadoria.
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 mb-4">
                      Este cadastro será criado como Cliente para devoluções e vendas.
                    </p>
                  )}

                  <div className="space-y-3">
                    {/* Modo Fornecedor - Mostrar apenas Fornecedor */}
                    {fornecedorMode ? (
                      <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Building className="text-orange-400" size={20} />
                          <span className="text-white">Fornecedor</span>
                        </div>
                        <div className="relative inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={true}
                            disabled={true}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-orange-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all opacity-75"></div>
                        </div>
                      </div>
                    ) : (
                      /* Modo Cliente - Mostrar apenas Cliente */
                      <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <User className="text-blue-400" size={20} />
                          <span className="text-white">Cliente</span>
                        </div>
                        <div className="relative inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={true}
                            disabled={true}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all opacity-75"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

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
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Formulário para adicionar desconto por prazo */}
                  <div className="bg-gray-800/30 rounded-lg p-4 space-y-4">
                    <h4 className="text-white font-medium">Adicionar Desconto por Prazo</h4>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Prazo (dias)
                        </label>
                        <input
                          type="number"
                          value={prazoDiasInput}
                          onChange={(e) => {
                            setPrazoDiasInput(e.target.value);
                            setNovoDescontoPrazo(prev => ({ ...prev, prazo_dias: parseInt(e.target.value) || 0 }));
                          }}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                          placeholder="30"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Percentual (%)
                        </label>
                        <input
                          type="number"
                          value={prazoPercentualInput}
                          onChange={(e) => {
                            setPrazoPercentualInput(e.target.value);
                            setNovoDescontoPrazo(prev => ({ ...prev, percentual: parseFloat(e.target.value) || 0 }));
                          }}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                          placeholder="0"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Tipo
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={novoDescontoPrazo.tipo === 'desconto'}
                            onChange={() => setNovoDescontoPrazo(prev => ({ ...prev, tipo: 'desconto' }))}
                            className="mr-2 text-green-500"
                          />
                          <span className="text-white">Desconto</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={novoDescontoPrazo.tipo === 'acrescimo'}
                            onChange={() => setNovoDescontoPrazo(prev => ({ ...prev, tipo: 'acrescimo' }))}
                            className="mr-2 text-red-500"
                          />
                          <span className="text-white">Acréscimo</span>
                        </label>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={adicionarDescontoPrazo}
                      className="w-full bg-primary-500 hover:bg-primary-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      <span>Adicionar</span>
                    </button>
                  </div>
                </div>

                {/* Descontos por Valor Mínimo */}
                <div className="space-y-4">
                  <h3 className="text-white font-medium">Descontos por Valor Mínimo</h3>
                  <p className="text-sm text-gray-400">
                    Configure descontos ou acréscimos baseados no valor mínimo do pedido.
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
                              <span className="text-white font-medium">{formatarPreco(desconto.valor_minimo)}</span>
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
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Formulário para adicionar desconto por valor */}
                  <div className="bg-gray-800/30 rounded-lg p-4 space-y-4">
                    <h4 className="text-white font-medium">Adicionar Desconto por Valor</h4>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Valor Mínimo (R$)
                        </label>
                        <input
                          type="number"
                          value={valorMinimoInput}
                          onChange={(e) => {
                            setValorMinimoInput(e.target.value);
                            setNovoDescontoValor(prev => ({ ...prev, valor_minimo: parseFloat(e.target.value) || 0 }));
                          }}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Percentual (%)
                        </label>
                        <input
                          type="number"
                          value={valorPercentualInput}
                          onChange={(e) => {
                            setValorPercentualInput(e.target.value);
                            setNovoDescontoValor(prev => ({ ...prev, percentual: parseFloat(e.target.value) || 0 }));
                          }}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                          placeholder="0"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Tipo
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={novoDescontoValor.tipo === 'desconto'}
                            onChange={() => setNovoDescontoValor(prev => ({ ...prev, tipo: 'desconto' }))}
                            className="mr-2 text-green-500"
                          />
                          <span className="text-white">Desconto</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={novoDescontoValor.tipo === 'acrescimo'}
                            onChange={() => setNovoDescontoValor(prev => ({ ...prev, tipo: 'acrescimo' }))}
                            className="mr-2 text-red-500"
                          />
                          <span className="text-white">Acréscimo</span>
                        </label>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={adicionarDescontoValor}
                      className="w-full bg-primary-500 hover:bg-primary-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      <span>Adicionar</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Conteúdo da aba Financeiro */}
            {activeTab === 'financeiro' && (
              <div className="space-y-4">
                <div className="text-center py-8 text-gray-400">
                  <Building className="mx-auto h-12 w-12 mb-2" />
                  <p>Informações financeiras</p>
                  <p className="text-sm">Em desenvolvimento</p>
                </div>
              </div>
            )}

            {/* Conteúdo da aba Observação */}
            {activeTab === 'observacao' && (
              <div className="space-y-4">
                {/* Observação NFe */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Observação NFe
                  </label>
                  <textarea
                    value={formData.observacao_nfe}
                    onChange={(e) => handleInputChange('observacao_nfe', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                    placeholder="Observação que aparecerá na NFe"
                    rows={3}
                  />
                </div>

                {/* Observação Interna */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Observação Interna
                  </label>
                  <textarea
                    value={formData.observacao_interna}
                    onChange={(e) => handleInputChange('observacao_interna', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                    placeholder="Observação interna (não aparece na NFe)"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-4 pt-6 border-t border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <User size={16} />
                    Salvar {fornecedorMode ? 'Fornecedor' : 'Cliente'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ClienteFormCompleto;
