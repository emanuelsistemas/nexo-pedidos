import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Package, DollarSign, User } from 'lucide-react';
import { Devolucao } from '../../types';
import ClienteDropdown from '../comum/ClienteDropdown';

// Função para formatar moeda
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

interface EditarDevolucaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  devolucao: Devolucao | null;
  onConfirm: (dadosAtualizados: {
    clienteId?: string;
    clienteNome?: string;
    clienteTelefone?: string;
    clienteEmail?: string;
    formaReembolso?: 'dinheiro' | 'credito' | 'troca' | 'estorno_cartao';
    motivoGeral?: string;
    observacoes?: string;
  }) => Promise<void>;
}

const EditarDevolucaoModal: React.FC<EditarDevolucaoModalProps> = ({
  isOpen,
  onClose,
  devolucao,
  onConfirm
}) => {
  const [clienteId, setClienteId] = useState('');
  const [clienteNome, setClienteNome] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [formaReembolso, setFormaReembolso] = useState<'dinheiro' | 'credito' | 'troca' | 'estorno_cartao'>('dinheiro');
  const [motivoGeral, setMotivoGeral] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Preencher campos quando a devolução for carregada
  useEffect(() => {
    if (devolucao) {
      setClienteId(devolucao.cliente_id || '');
      setClienteNome(devolucao.cliente_nome || '');
      setClienteTelefone(devolucao.cliente_telefone || '');
      setClienteEmail(devolucao.cliente_email || '');
      setFormaReembolso(devolucao.forma_reembolso);
      setMotivoGeral(devolucao.motivo_geral || '');
      setObservacoes(devolucao.observacoes || '');
    }
  }, [devolucao]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const dadosAtualizados = {
        clienteId: clienteId || undefined,
        clienteNome: clienteNome || undefined,
        clienteTelefone: clienteTelefone || undefined,
        clienteEmail: clienteEmail || undefined,
        formaReembolso,
        motivoGeral: motivoGeral || undefined,
        observacoes: observacoes || undefined
      };

      await onConfirm(dadosAtualizados);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar devolução:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      onClose();
    }
  };

  if (!isOpen || !devolucao) return null;

  // Só permite editar devoluções pendentes
  if (devolucao.status !== 'pendente') {
    return (
      <div className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-background-card rounded-lg border border-gray-800 p-6 shadow-2xl"
        >
          <div className="text-center">
            <Package size={48} className="text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              Devolução não editável
            </h3>
            <p className="text-gray-400 mb-4">
              Apenas devoluções pendentes podem ser editadas.
            </p>
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
            >
              Entendi
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-background-card rounded-lg border border-gray-800 flex flex-col shadow-2xl max-h-[90vh]"
      >
        {/* Cabeçalho */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            Editar Devolução #{devolucao.numero}
          </h2>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-gray-400" />
              <div>
                <p className="text-sm text-gray-400">Tipo</p>
                <p className="text-white font-medium">
                  {devolucao.tipo_devolucao === 'total' ? 'Devolução Total' : 'Devolução Parcial'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-gray-400" />
              <div>
                <p className="text-sm text-gray-400">Valor Total</p>
                <p className="text-white font-medium text-lg">
                  {formatCurrency(devolucao.valor_total)}
                </p>
              </div>
            </div>
          </div>

          {/* Dados do Cliente */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Dados do Cliente</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Cliente
              </label>
              <ClienteDropdown
                value={clienteId}
                onChange={(id, cliente) => {
                  setClienteId(id);
                  if (cliente) {
                    setClienteNome(cliente.nome);
                    setClienteTelefone(cliente.telefone || '');
                    setClienteEmail(cliente.email || '');
                  }
                }}
                empresaId={devolucao.empresa_id}
                placeholder="Selecione o cliente"
                disabled={isSaving}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Nome do Cliente
                </label>
                <input
                  type="text"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  placeholder="Nome do cliente"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Telefone
                </label>
                <input
                  type="text"
                  value={clienteTelefone}
                  onChange={(e) => setClienteTelefone(e.target.value)}
                  placeholder="Telefone do cliente"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
                  disabled={isSaving}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                E-mail
              </label>
              <input
                type="email"
                value={clienteEmail}
                onChange={(e) => setClienteEmail(e.target.value)}
                placeholder="E-mail do cliente"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Forma de Reembolso */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-3">
              Forma de Reembolso
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: 'dinheiro', label: 'Dinheiro' },
                { value: 'credito', label: 'Crédito' },
                { value: 'troca', label: 'Troca' },
                { value: 'estorno_cartao', label: 'Estorno Cartão' }
              ].map((opcao) => (
                <button
                  key={opcao.value}
                  onClick={() => setFormaReembolso(opcao.value as any)}
                  disabled={isSaving}
                  className={`p-3 rounded-lg border transition-colors text-sm font-medium ${
                    formaReembolso === opcao.value
                      ? 'bg-primary-500 border-primary-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                  } disabled:opacity-50`}
                >
                  {opcao.label}
                </button>
              ))}
            </div>
          </div>

          {/* Motivo Geral */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Motivo da Devolução
            </label>
            <textarea
              value={motivoGeral}
              onChange={(e) => setMotivoGeral(e.target.value)}
              placeholder="Descreva o motivo da devolução..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 resize-none"
              rows={3}
              disabled={isSaving}
            />
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Observações
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações adicionais..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 resize-none"
              rows={3}
              disabled={isSaving}
            />
          </div>

          {/* Lista de Itens (Somente Leitura) */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">
              Itens da Devolução ({devolucao.itens?.length || 0})
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {devolucao.itens?.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700"
                >
                  <div className="flex-1">
                    <div className="text-white font-medium">{item.produto_nome}</div>
                    <div className="text-gray-400 text-sm">
                      Qtd: {item.quantidade} | Unit: {formatCurrency(item.preco_unitario)}
                    </div>
                  </div>
                  <div className="text-white font-semibold">
                    {formatCurrency(item.preco_total)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-800 flex items-center justify-between">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
          >
            <Save size={16} />
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default EditarDevolucaoModal;
