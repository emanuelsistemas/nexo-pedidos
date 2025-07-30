import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building, FileText, User, Phone, Mail, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showMessage } from '../../utils/toast';

interface FornecedorSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  empresaId: string;
  onFornecedorCreated: (fornecedorId: string, fornecedorNome: string, fornecedorDocumento?: string) => void;
}

const FornecedorSidebar: React.FC<FornecedorSidebarProps> = ({
  isOpen,
  onClose,
  empresaId,
  onFornecedorCreated
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    tipo_documento: 'CNPJ' as 'CNPJ' | 'CPF',
    documento: '',
    razao_social: '',
    nome_fantasia: '',
    nome: '',
    telefone: '',
    email: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatarDocumento = (value: string, tipo: 'CNPJ' | 'CPF') => {
    const numeros = value.replace(/\D/g, '');
    
    if (tipo === 'CNPJ') {
      return numeros
        .slice(0, 14)
        .replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    } else {
      return numeros
        .slice(0, 11)
        .replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
  };

  const handleDocumentoChange = (value: string) => {
    const formatted = formatarDocumento(value, formData.tipo_documento);
    handleInputChange('documento', formatted);
  };

  const resetForm = () => {
    setFormData({
      tipo_documento: 'CNPJ',
      documento: '',
      razao_social: '',
      nome_fantasia: '',
      nome: '',
      telefone: '',
      email: '',
      endereco: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      showMessage('error', 'Nome é obrigatório');
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('clientes')
        .insert({
          empresa_id: empresaId,
          tipo_documento: formData.tipo_documento,
          documento: formData.documento ? formData.documento.replace(/\D/g, '') : null,
          razao_social: formData.razao_social.trim() || null,
          nome_fantasia: formData.nome_fantasia.trim() || null,
          nome: formData.nome.trim(),
          telefone: formData.telefone.trim() || null,
          email: formData.email.trim() || null,
          endereco: formData.endereco.trim() || null,
          numero: formData.numero.trim() || null,
          complemento: formData.complemento.trim() || null,
          bairro: formData.bairro.trim() || null,
          cidade: formData.cidade.trim() || null,
          estado: formData.estado.trim() || null,
          cep: formData.cep ? formData.cep.replace(/\D/g, '') : null,
          // Marcar apenas como fornecedor
          is_cliente: false,
          is_funcionario: false,
          is_vendedor: false,
          is_fornecedor: true,
          is_transportadora: false
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar fornecedor:', error);
        showMessage('error', 'Erro ao criar fornecedor. Tente novamente.');
        return;
      }

      showMessage('success', 'Fornecedor cadastrado com sucesso!');
      
      // Notificar criação e fechar modal
      onFornecedorCreated(data.id, data.nome, data.documento);
      resetForm();
      onClose();
    } catch (error: any) {
      console.error('Erro ao criar fornecedor:', error);
      showMessage('error', error.message || 'Erro ao criar fornecedor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-40"
        onClick={handleClose}
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 h-full w-full max-w-2xl bg-gray-900 shadow-xl z-50 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <Building size={20} className="text-orange-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Novo Fornecedor</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Tipo de Documento */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Tipo de Documento
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="CNPJ"
                  checked={formData.tipo_documento === 'CNPJ'}
                  onChange={(e) => handleInputChange('tipo_documento', e.target.value)}
                  className="mr-2 text-primary-500"
                />
                <span className="text-white">CNPJ</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="CPF"
                  checked={formData.tipo_documento === 'CPF'}
                  onChange={(e) => handleInputChange('tipo_documento', e.target.value)}
                  className="mr-2 text-primary-500"
                />
                <span className="text-white">CPF</span>
              </label>
            </div>
          </div>

          {/* Documento */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              {formData.tipo_documento}
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.documento}
                onChange={(e) => handleDocumentoChange(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                placeholder={formData.tipo_documento === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00'}
              />
              <FileText size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
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
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  placeholder="Razão social da empresa"
                />
                <Building size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          )}

          {/* Nome Fantasia */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              {formData.tipo_documento === 'CNPJ' ? 'Nome Fantasia' : 'Nome'} *
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.tipo_documento === 'CNPJ' ? formData.nome_fantasia : formData.nome}
                onChange={(e) => handleInputChange(formData.tipo_documento === 'CNPJ' ? 'nome_fantasia' : 'nome', e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                placeholder={formData.tipo_documento === 'CNPJ' ? 'Nome fantasia' : 'Nome completo'}
                required
              />
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {/* Nome (para CNPJ, campo separado) */}
          {formData.tipo_documento === 'CNPJ' && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Nome *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  placeholder="Nome do contato principal"
                  required
                />
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
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
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  placeholder="fornecedor@email.com"
                />
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Tipo de Cadastro - Informativo */}
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
            <h3 className="text-white font-medium mb-2 flex items-center gap-2">
              <Building size={16} className="text-orange-400" />
              Tipo de Cadastro
            </h3>
            <p className="text-sm text-gray-400">
              Este cadastro será marcado automaticamente como <span className="text-orange-400 font-medium">Fornecedor</span>.
            </p>
          </div>

          {/* Botões */}
          <div className="flex gap-4 pt-6 border-t border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Building size={16} />
                  Salvar Fornecedor
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </AnimatePresence>
  );
};

export default FornecedorSidebar;
