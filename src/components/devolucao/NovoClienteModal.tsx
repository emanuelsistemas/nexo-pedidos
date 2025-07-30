import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, User, Phone, MapPin, Mail, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface NovoClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresaId: string;
  onClienteCreated: (clienteId: string) => void;
}

const NovoClienteModal: React.FC<NovoClienteModalProps> = ({
  isOpen,
  onClose,
  empresaId,
  onClienteCreated
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    endereco: '',
    bairro: '',
    cidade: '',
    cep: '',
    observacoes: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      alert('Nome é obrigatório');
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('clientes')
        .insert({
          empresa_id: empresaId,
          nome: formData.nome.trim(),
          telefone: formData.telefone.trim(),
          email: formData.email.trim() || null,
          endereco: formData.endereco.trim() || null,
          bairro: formData.bairro.trim() || null,
          cidade: formData.cidade.trim() || null,
          cep: formData.cep.trim() || null,
          observacoes: formData.observacoes.trim() || null
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar cliente:', error);
        alert('Erro ao criar cliente. Tente novamente.');
        return;
      }

      // Limpar formulário
      setFormData({
        nome: '',
        telefone: '',
        email: '',
        endereco: '',
        bairro: '',
        cidade: '',
        cep: '',
        observacoes: ''
      });

      // Notificar criação e fechar modal
      onClienteCreated(data.id);
      onClose();
      
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      alert('Erro ao criar cliente. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        className="w-full max-w-md bg-background-card rounded-lg border border-gray-800 flex flex-col shadow-2xl max-h-[90vh]"
      >
        {/* Cabeçalho */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            Novo Cliente
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Nome */}
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
                placeholder="Nome completo do cliente"
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
                placeholder="cliente@email.com"
              />
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
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
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                placeholder="Rua, número, complemento"
              />
              <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Observações
            </label>
            <div className="relative">
              <textarea
                value={formData.observacoes}
                onChange={(e) => handleInputChange('observacoes', e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-none"
                placeholder="Observações adicionais"
                rows={3}
              />
              <FileText size={18} className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>
        </form>

        {/* Rodapé */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !formData.nome.trim()}
            className="px-6 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
          >
            {isLoading ? 'Salvando...' : 'Salvar Cliente'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default NovoClienteModal;
