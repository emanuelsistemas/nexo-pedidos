import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FileX, Calendar, Hash, AlertTriangle, X, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';

interface Inutilizacao {
  id: string;
  modelo_documento: number;
  serie: number;
  numero_inicial: number;
  numero_final: number;
  justificativa: string;
  protocolo: string;
  ambiente: number;
  data_inutilizacao: string;
  created_at: string;
}

const InutilizacaoPage: React.FC = () => {
  const [inutilizacoes, setInutilizacoes] = useState<Inutilizacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [processando, setProcessando] = useState(false);

  // Estados do modal
  const [modeloDocumento, setModeloDocumento] = useState<'55' | '65'>('65');
  const [ambiente, setAmbiente] = useState<'1' | '2'>('2'); // 1=Produção, 2=Homologação
  const [serie, setSerie] = useState('1');
  const [numeroInicial, setNumeroInicial] = useState('');
  const [numeroFinal, setNumeroFinal] = useState('');
  const [justificativa, setJustificativa] = useState('');

  // Carregar inutilizações
  const loadInutilizacoes = async () => {
    try {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      const { data, error } = await supabase
        .from('inutilizacoes')
        .select('*, ambiente')
        .eq('empresa_id', usuarioData.empresa_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setInutilizacoes(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar inutilizações:', error);
      toast.error('Erro ao carregar inutilizações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInutilizacoes();
  }, []);

  // Resetar modal
  const resetModal = () => {
    setModeloDocumento('65');
    setAmbiente('2'); // Padrão: Homologação
    setSerie('1');
    setNumeroInicial('');
    setNumeroFinal('');
    setJustificativa('');
    setShowModal(false);
  };

  // Validações
  const isFormValid = () => {
    return (
      numeroInicial.trim() !== '' &&
      numeroFinal.trim() !== '' &&
      justificativa.trim().length >= 15 &&
      parseInt(numeroInicial) <= parseInt(numeroFinal)
    );
  };

  // Processar inutilização
  const processarInutilizacao = async () => {
    if (!isFormValid()) {
      toast.error('Preencha todos os campos corretamente');
      return;
    }

    try {
      setProcessando(true);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) throw new Error('Empresa não encontrada');

      // Preparar dados para inutilização
      const inutilizacaoData = {
        empresa_id: usuarioData.empresa_id,
        modelo_documento: parseInt(modeloDocumento),
        ambiente: parseInt(ambiente), // Incluir ambiente selecionado
        serie: parseInt(serie),
        numero_inicial: parseInt(numeroInicial),
        numero_final: parseInt(numeroFinal),
        justificativa: justificativa.trim()
      };

      // Chamar endpoint de inutilização
      const response = await fetch('/backend/public/inutilizar-numeracao.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inutilizacaoData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro na inutilização');
      }

      toast.success('Numeração inutilizada com sucesso!');
      resetModal();
      loadInutilizacoes();

    } catch (error: any) {
      console.error('Erro na inutilização:', error);
      toast.error(`Erro na inutilização: ${error.message}`);
    } finally {
      setProcessando(false);
    }
  };

  // Formatação de data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  // Formatação de range
  const formatRange = (inicial: number, final: number) => {
    return inicial === final ? `#${inicial}` : `#${inicial} - #${final}`;
  };

  return (
    <div className="min-h-screen bg-background-dark p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Inutilização de Numeração</h1>
            <p className="text-gray-400">Gerencie a inutilização de faixas de numeração de NFe e NFC-e</p>
          </div>
          
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg transition-colors"
          >
            <Plus size={20} />
            Adicionar Inutilização
          </button>
        </div>

        {/* Lista de Inutilizações */}
        <div className="bg-background-card rounded-lg border border-gray-800">
          <div className="p-6 border-b border-gray-800">
            <h2 className="text-xl font-semibold text-white">Histórico de Inutilizações</h2>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              </div>
            ) : inutilizacoes.length === 0 ? (
              <div className="text-center py-12">
                <FileX size={48} className="mx-auto mb-4 text-gray-500" />
                <p className="text-gray-400 text-lg">Nenhuma inutilização encontrada</p>
                <p className="text-gray-500 text-sm mt-2">Clique em "Adicionar Inutilização" para começar</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Modelo</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Série</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Faixa</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Ambiente</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Justificativa</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Protocolo</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inutilizacoes.map((inutilizacao) => (
                      <tr key={inutilizacao.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="py-4 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            inutilizacao.modelo_documento === 55 
                              ? 'bg-blue-500/20 text-blue-400' 
                              : 'bg-green-500/20 text-green-400'
                          }`}>
                            {inutilizacao.modelo_documento === 55 ? 'NFe (55)' : 'NFC-e (65)'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-white">{inutilizacao.serie}</td>
                        <td className="py-4 px-4 text-white font-mono">
                          {formatRange(inutilizacao.numero_inicial, inutilizacao.numero_final)}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            inutilizacao.ambiente === 1
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          }`}>
                            {inutilizacao.ambiente === 1 ? 'Produção' : 'Homologação'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-300 max-w-xs truncate" title={inutilizacao.justificativa}>
                          {inutilizacao.justificativa}
                        </td>
                        <td className="py-4 px-4 text-gray-300 font-mono">{inutilizacao.protocolo}</td>
                        <td className="py-4 px-4 text-gray-400">{formatDate(inutilizacao.data_inutilizacao)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Inutilização */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => !processando && resetModal()}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background-card rounded-lg border border-gray-800 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-800">
                <h3 className="text-xl font-semibold text-white">Nova Inutilização</h3>
                <button
                  onClick={() => !processando && resetModal()}
                  disabled={processando}
                  className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Conteúdo */}
              <div className="p-6 space-y-4">
                {/* Modelo do Documento */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Modelo do Documento
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setModeloDocumento('65')}
                      disabled={processando}
                      className={`p-3 rounded-lg border transition-colors ${
                        modeloDocumento === '65'
                          ? 'bg-green-500/20 border-green-500 text-green-400'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      NFC-e (65)
                    </button>
                    <button
                      onClick={() => setModeloDocumento('55')}
                      disabled={processando}
                      className={`p-3 rounded-lg border transition-colors ${
                        modeloDocumento === '55'
                          ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      NFe (55)
                    </button>
                  </div>
                </div>

                {/* Ambiente */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Ambiente
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setAmbiente('2')}
                      disabled={processando}
                      className={`p-3 rounded-lg border transition-colors ${
                        ambiente === '2'
                          ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      🧪 Homologação
                    </button>
                    <button
                      onClick={() => setAmbiente('1')}
                      disabled={processando}
                      className={`p-3 rounded-lg border transition-colors ${
                        ambiente === '1'
                          ? 'bg-red-500/20 border-red-500 text-red-400'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      🚀 Produção
                    </button>
                  </div>
                </div>

                {/* Série */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Série
                  </label>
                  <input
                    type="number"
                    value={serie}
                    onChange={(e) => setSerie(e.target.value)}
                    disabled={processando}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500"
                    placeholder="1"
                    min="1"
                  />
                </div>

                {/* Faixa de Numeração */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Número Inicial
                    </label>
                    <input
                      type="number"
                      value={numeroInicial}
                      onChange={(e) => setNumeroInicial(e.target.value)}
                      disabled={processando}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500"
                      placeholder="1"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Número Final
                    </label>
                    <input
                      type="number"
                      value={numeroFinal}
                      onChange={(e) => setNumeroFinal(e.target.value)}
                      disabled={processando}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500"
                      placeholder="1"
                      min="1"
                    />
                  </div>
                </div>

                {/* Justificativa */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Justificativa (mínimo 15 caracteres)
                  </label>
                  <textarea
                    value={justificativa}
                    onChange={(e) => setJustificativa(e.target.value)}
                    disabled={processando}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 resize-none"
                    rows={3}
                    placeholder="Descreva o motivo da inutilização..."
                    maxLength={255}
                  />
                  <div className="flex justify-between mt-1">
                    <span className={`text-xs ${
                      justificativa.length >= 15 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {justificativa.length >= 15 ? '✓' : '✗'} Mínimo 15 caracteres
                    </span>
                    <span className="text-xs text-gray-500">
                      {justificativa.length}/255
                    </span>
                  </div>
                </div>

                {/* Validação de Range */}
                {numeroInicial && numeroFinal && parseInt(numeroInicial) > parseInt(numeroFinal) && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <AlertTriangle size={16} className="text-red-400" />
                    <span className="text-red-400 text-sm">
                      O número inicial deve ser menor ou igual ao final
                    </span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex gap-3 p-6 border-t border-gray-800">
                <button
                  onClick={() => !processando && resetModal()}
                  disabled={processando}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={processarInutilizacao}
                  disabled={!isFormValid() || processando}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {processando ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Inutilizando...
                    </>
                  ) : (
                    <>
                      <FileX size={16} />
                      Inutilizar
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InutilizacaoPage;
