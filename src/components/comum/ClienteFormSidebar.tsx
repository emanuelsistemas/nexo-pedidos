import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, Mail, MapPin, FileText, Building } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';

interface ClienteFormSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  empresaId: string;
  onClienteCreated: (clienteId: string) => void;
}

const ClienteFormSidebar: React.FC<ClienteFormSidebarProps> = ({
  isOpen,
  onClose,
  empresaId,
  onClienteCreated
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    tipo_documento: 'CPF',
    documento: '',
    razao_social: '',
    nome_fantasia: '',
    nome: '',
    telefone: '',
    email: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    observacao_interna: ''
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        tipo_documento: 'CPF',
        documento: '',
        razao_social: '',
        nome_fantasia: '',
        nome: '',
        telefone: '',
        email: '',
        cep: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        observacao_interna: ''
      });
    }
  }, [isOpen]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTipoDocumentoChange = (tipo: 'CPF' | 'CNPJ') => {
    setFormData(prev => ({
      ...prev,
      tipo_documento: tipo,
      documento: '',
      razao_social: '',
      nome_fantasia: ''
    }));
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
        documento: formData.documento.trim() || null,
        razao_social: formData.razao_social.trim() || null,
        nome_fantasia: formData.nome_fantasia.trim() || null,
        nome: formData.nome.trim(),
        telefone: formData.telefone.trim() || null,
        email: formData.email.trim() || null,
        cep: formData.cep.trim() || null,
        endereco: formData.endereco.trim() || null,
        numero: formData.numero.trim() || null,
        complemento: formData.complemento.trim() || null,
        bairro: formData.bairro.trim() || null,
        cidade: formData.cidade.trim() || null,
        estado: formData.estado.trim() || null,
        observacao_interna: formData.observacao_interna.trim() || null,
        is_cliente: true,
        is_funcionario: false,
        is_vendedor: false,
        is_fornecedor: false,
        is_transportadora: false,
        origem: 'delivery_local'
      };

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

      toast.success('Cliente cadastrado com sucesso!');
      onClienteCreated(data.id);
      onClose();
      
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      toast.error('Erro ao criar cliente. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          
          {/* Sidebar */}
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
                  Novo Cliente
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Tipo de Documento */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Tipo de Documento
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={formData.tipo_documento === 'CPF'}
                        onChange={() => handleTipoDocumentoChange('CPF')}
                        className="mr-2 text-primary-500 focus:ring-primary-500/20"
                      />
                      <span className="text-white">CPF</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={formData.tipo_documento === 'CNPJ'}
                        onChange={() => handleTipoDocumentoChange('CNPJ')}
                        className="mr-2 text-primary-500 focus:ring-primary-500/20"
                      />
                      <span className="text-white">CNPJ</span>
                    </label>
                  </div>
                </div>

                {/* Documento */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {formData.tipo_documento}
                  </label>
                  <input
                    type="text"
                    value={formData.documento}
                    onChange={(e) => handleInputChange('documento', e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    placeholder={formData.tipo_documento === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'}
                  />
                </div>

                {/* Razão Social (apenas para CNPJ) */}
                {formData.tipo_documento === 'CNPJ' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Razão Social
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.razao_social}
                        onChange={(e) => handleInputChange('razao_social', e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2.5 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        placeholder="Razão social da empresa"
                      />
                      <Building size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                )}

                {/* Nome Fantasia (apenas para CNPJ) */}
                {formData.tipo_documento === 'CNPJ' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Nome Fantasia
                    </label>
                    <input
                      type="text"
                      value={formData.nome_fantasia}
                      onChange={(e) => handleInputChange('nome_fantasia', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                      placeholder="Nome fantasia"
                    />
                  </div>
                )}

                {/* Nome */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {formData.tipo_documento === 'CPF' ? 'Nome Completo' : 'Nome de Contato'} *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={(e) => handleInputChange('nome', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2.5 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                      placeholder="Nome completo"
                      required
                    />
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Telefone
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={formData.telefone}
                      onChange={(e) => handleInputChange('telefone', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2.5 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                      placeholder="(11) 99999-9999"
                    />
                    <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2.5 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                      placeholder="cliente@email.com"
                    />
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {/* CEP */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    CEP
                  </label>
                  <input
                    type="text"
                    value={formData.cep}
                    onChange={(e) => handleInputChange('cep', e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    placeholder="00000-000"
                  />
                </div>

                {/* Endereço */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Endereço
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.endereco}
                      onChange={(e) => handleInputChange('endereco', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2.5 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                      placeholder="Rua, avenida, etc."
                    />
                    <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {/* Número e Complemento */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Número
                    </label>
                    <input
                      type="text"
                      value={formData.numero}
                      onChange={(e) => handleInputChange('numero', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                      placeholder="123"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Complemento
                    </label>
                    <input
                      type="text"
                      value={formData.complemento}
                      onChange={(e) => handleInputChange('complemento', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                      placeholder="Apto, sala, etc."
                    />
                  </div>
                </div>

                {/* Bairro e Cidade */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Bairro
                    </label>
                    <input
                      type="text"
                      value={formData.bairro}
                      onChange={(e) => handleInputChange('bairro', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                      placeholder="Bairro"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Cidade
                    </label>
                    <input
                      type="text"
                      value={formData.cidade}
                      onChange={(e) => handleInputChange('cidade', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                      placeholder="Cidade"
                    />
                  </div>
                </div>

                {/* Estado */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Estado
                  </label>
                  <input
                    type="text"
                    value={formData.estado}
                    onChange={(e) => handleInputChange('estado', e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>

                {/* Observações */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Observações
                  </label>
                  <div className="relative">
                    <textarea
                      value={formData.observacao_interna}
                      onChange={(e) => handleInputChange('observacao_interna', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2.5 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-none"
                      placeholder="Observações internas"
                      rows={3}
                    />
                    <FileText size={18} className="absolute left-3 top-3 text-gray-400" />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 px-4 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !formData.nome.trim()}
                    className="flex-1 py-2.5 px-4 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                  >
                    {isSubmitting ? 'Salvando...' : 'Salvar Cliente'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ClienteFormSidebar;
