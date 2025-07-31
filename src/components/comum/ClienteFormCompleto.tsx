import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, Mail, MapPin, FileText, Building, Search } from 'lucide-react';
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

  const buscarCEP = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            endereco: data.logradouro || '',
            bairro: data.bairro || '',
            cidade: data.localidade || '',
            estado: data.uf || ''
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const clienteData = {
        empresa_id: empresaId,
        tipo_documento: formData.tipo_documento,
        documento: formData.documento.replace(/\D/g, '') || null,
        razao_social: formData.razao_social.trim() || null,
        nome_fantasia: formData.nome_fantasia.trim() || null,
        nome: formData.nome.trim(),
        telefones: formData.telefones,
        emails: formData.emails,
        cep: formData.cep.replace(/\D/g, '') || null,
        endereco: formData.endereco.trim() || null,
        numero: formData.numero.trim() || null,
        complemento: formData.complemento.trim() || null,
        bairro: formData.bairro.trim() || null,
        cidade: formData.cidade.trim() || null,
        estado: formData.estado.trim() || null,
        indicador_ie: formData.indicador_ie,
        codigo_municipio: formData.codigo_municipio || null,
        inscricao_estadual: formData.inscricao_estadual.trim() || null,
        is_cliente: formData.is_cliente,
        is_funcionario: formData.is_funcionario,
        is_vendedor: formData.is_vendedor,
        is_fornecedor: formData.is_fornecedor,
        is_transportadora: formData.is_transportadora,
        observacao_nfe: formData.observacao_nfe.trim() || null,
        observacao_interna: formData.observacao_interna.trim() || null
      };

      const { data, error } = await supabase
        .from('clientes')
        .insert([clienteData])
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar cliente:', error);
        toast.error('Erro ao criar cliente. Tente novamente.');
        return;
      }

      toast.success(`${fornecedorMode ? 'Fornecedor' : 'Cliente'} criado com sucesso!`);
      onClienteCreated(data.id);
      onClose();
    } catch (error: any) {
      console.error('Erro ao criar cliente:', error);
      toast.error(error.message || 'Erro ao criar cliente');
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
                    <input
                      type="text"
                      value={formData.documento}
                      onChange={(e) => handleInputChange('documento', formatarDocumento(e.target.value, formData.tipo_documento))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                      placeholder={formData.tipo_documento === 'CNPJ' ? 'XX.XXX.XXX/XXXX-XX' : 'XXX.XXX.XXX-XX'}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      <Search size={16} />
                    </button>
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
                  <input
                    type="text"
                    value={formData.cep}
                    onChange={(e) => {
                      const formatted = formatarCep(e.target.value);
                      handleInputChange('cep', formatted);
                      if (formatted.length === 9) {
                        buscarCEP(formatted);
                      }
                    }}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                    placeholder="00000-000"
                    maxLength={9}
                  />
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
              </div>
            )}

            {/* Conteúdo da aba Descontos */}
            {activeTab === 'descontos' && (
              <div className="space-y-4">
                <div className="text-center py-8 text-gray-400">
                  <FileText className="mx-auto h-12 w-12 mb-2" />
                  <p>Funcionalidade de descontos</p>
                  <p className="text-sm">Em desenvolvimento</p>
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
