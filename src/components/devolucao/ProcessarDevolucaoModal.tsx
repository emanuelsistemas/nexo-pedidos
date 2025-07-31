import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle, XCircle, Package, DollarSign, User, Calendar } from 'lucide-react';
import { Devolucao } from '../../types';

// Função para formatar moeda
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

// Função para formatar data
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

interface ProcessarDevolucaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  devolucao: Devolucao | null;
  onConfirm: (aprovar: boolean, observacoes?: string) => Promise<void>;
}

const ProcessarDevolucaoModal: React.FC<ProcessarDevolucaoModalProps> = ({
  isOpen,
  onClose,
  devolucao,
  onConfirm
}) => {
  const [observacoes, setObservacoes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcessar = async (aprovar: boolean) => {
    try {
      setIsProcessing(true);
      await onConfirm(aprovar, observacoes || undefined);
      onClose();
    } catch (error) {
      console.error('Erro ao processar devolução:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setObservacoes('');
      onClose();
    }
  };

  if (!isOpen || !devolucao) return null;

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
            Processar Devolução #{devolucao.numero}
          </h2>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Informações da Devolução */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User size={16} className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">Cliente</p>
                  <p className="text-white font-medium">
                    {devolucao.cliente_nome || 'Cliente não informado'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">Data da Solicitação</p>
                  <p className="text-white font-medium">
                    {formatDate(devolucao.created_at)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
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
          </div>

          {/* Forma de Reembolso */}
          <div>
            <p className="text-sm text-gray-400 mb-2">Forma de Reembolso</p>
            <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
              <p className="text-white font-medium">
                {devolucao.forma_reembolso === 'dinheiro' && 'Dinheiro'}
                {devolucao.forma_reembolso === 'credito' && 'Crédito na Conta'}
                {devolucao.forma_reembolso === 'troca' && 'Troca de Produto'}
                {devolucao.forma_reembolso === 'estorno_cartao' && 'Estorno no Cartão'}
              </p>
            </div>
          </div>

          {/* Motivo */}
          {devolucao.motivo_geral && (
            <div>
              <p className="text-sm text-gray-400 mb-2">Motivo da Devolução</p>
              <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                <p className="text-white">{devolucao.motivo_geral}</p>
              </div>
            </div>
          )}

          {/* Lista de Itens */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">
              Itens para Devolução ({devolucao.itens?.length || 0})
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
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
                    {item.motivo && (
                      <div className="text-gray-500 text-xs mt-1">
                        Motivo: {item.motivo}
                      </div>
                    )}
                  </div>
                  <div className="text-white font-semibold">
                    {formatCurrency(item.preco_total)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Observações do Processamento */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-3">
              Observações do Processamento (Opcional)
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Adicione observações sobre o processamento desta devolução..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 resize-none"
              rows={3}
              disabled={isProcessing}
            />
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-800 flex items-center justify-between">
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleProcessar(false)}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              <XCircle size={16} />
              {isProcessing ? 'Processando...' : 'Rejeitar'}
            </button>
            
            <button
              onClick={() => handleProcessar(true)}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              <CheckCircle size={16} />
              {isProcessing ? 'Processando...' : 'Aprovar'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProcessarDevolucaoModal;
