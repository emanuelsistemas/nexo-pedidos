import React from 'react';
import { X, Copy, Package, User, Calendar, DollarSign, FileText } from 'lucide-react';
import { Devolucao } from '../../types';

interface DetalhesDevolucaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  devolucao: Devolucao | null;
}

const DetalhesDevolucaoModal: React.FC<DetalhesDevolucaoModalProps> = ({
  isOpen,
  onClose,
  devolucao
}) => {
  if (!isOpen || !devolucao) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'text-yellow-400 border-yellow-400';
      case 'processada':
        return 'text-green-400 border-green-400';
      case 'cancelada':
        return 'text-red-400 border-red-400';
      default:
        return 'text-gray-400 border-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'Pendente';
      case 'processada':
        return 'Processada';
      case 'cancelada':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const getFormaReembolsoText = (forma: string) => {
    switch (forma) {
      case 'dinheiro':
        return 'Dinheiro';
      case 'credito':
        return 'Crédito';
      case 'troca':
        return 'Troca';
      case 'estorno_cartao':
        return 'Estorno Cartão';
      default:
        return forma;
    }
  };

  const copiarCodigo = () => {
    if (devolucao.codigo_troca) {
      navigator.clipboard.writeText(devolucao.codigo_troca);
      // Toast de confirmação
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity';
      toast.textContent = 'Código copiado!';
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background-card rounded-lg border border-gray-800 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <Package className="text-primary-400" size={24} />
            <div>
              <h2 className="text-xl font-semibold text-white">
                Detalhes da Devolução #{devolucao.numero}
              </h2>
              <p className="text-gray-400 text-sm">
                {formatDate(devolucao.created_at)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Informações Gerais */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <FileText size={20} />
                Informações Gerais
              </h3>
              
              {/* Código de Troca */}
              {devolucao.codigo_troca && (
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Código de Troca
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm px-3 py-2 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30 font-mono">
                      {devolucao.codigo_troca}
                    </span>
                    <button
                      onClick={copiarCodigo}
                      className="text-blue-400 hover:text-blue-300 transition-colors p-2"
                      title="Copiar código"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Status
                </label>
                <span className={`text-sm px-3 py-1 rounded-full ${getStatusColor(devolucao.status)} bg-opacity-20 border`}>
                  {getStatusText(devolucao.status)}
                </span>
              </div>

              {/* Cliente */}
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  <User size={16} className="inline mr-1" />
                  Cliente
                </label>
                <p className="text-white">
                  {devolucao.cliente_nome || 'Sem Cliente'}
                </p>
              </div>

              {/* Venda Origem */}
              {devolucao.venda_origem_numero && (
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Venda Origem
                  </label>
                  <p className="text-white font-mono">
                    #{devolucao.venda_origem_numero}
                  </p>
                </div>
              )}



              {/* Valor Total */}
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  <DollarSign size={16} className="inline mr-1" />
                  Valor Total
                </label>
                <p className="text-green-400 text-xl font-semibold">
                  {formatCurrency(devolucao.valor_total)}
                </p>
              </div>
            </div>

            {/* Itens Devolvidos */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <Package size={20} />
                Itens Devolvidos ({devolucao.itens?.length || 0})
              </h3>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {devolucao.itens?.map((item, index) => (
                  <div key={index} className="bg-gray-800/50 p-4 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="text-white font-medium">
                          {item.produto_nome}
                        </h4>
                        {item.produto_codigo && (
                          <p className="text-gray-400 text-sm">
                            Código: {item.produto_codigo}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                          <span>Qtd: {item.quantidade}</span>
                          <span>Unit: {formatCurrency(item.preco_unitario)}</span>
                        </div>
                        {item.motivo && (
                          <p className="text-gray-400 text-sm mt-1">
                            Motivo: {item.motivo}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold">
                          {formatCurrency(item.preco_total)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Observações */}
          {(devolucao.motivo_geral || devolucao.observacoes) && (
            <div className="mt-6 bg-gray-800/50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-white mb-3">Observações</h3>
              {devolucao.motivo_geral && (
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Motivo Geral
                  </label>
                  <p className="text-white">{devolucao.motivo_geral}</p>
                </div>
              )}
              {devolucao.observacoes && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Observações
                  </label>
                  <p className="text-white">{devolucao.observacoes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetalhesDevolucaoModal;
