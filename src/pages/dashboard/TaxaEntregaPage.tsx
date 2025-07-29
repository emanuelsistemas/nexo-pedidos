import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Trash2, Search, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Button from '../../components/comum/Button';
import { showMessage } from '../../utils/toast';

interface DeleteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-background-card p-6 rounded-lg shadow-xl max-w-sm mx-4 w-full"
      >
        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
        <p className="text-gray-400 mb-6">{message}</p>
        <div className="flex gap-4">
          <Button
            type="button"
            variant="text"
            className="flex-1"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            className="flex-1 !bg-red-500 hover:!bg-red-600"
            onClick={onConfirm}
          >
            Excluir
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const TaxaEntregaPage: React.FC = () => {
  const [showSidebar, setShowSidebar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const [taxas, setTaxas] = useState<any[]>([]);
  const [editingTaxa, setEditingTaxa] = useState<any>(null);
  const [taxaMode, setTaxaMode] = useState<'bairro' | 'distancia'>('bairro');
  const [taxaConfigHabilitada, setTaxaConfigHabilitada] = useState(false);
  const [formData, setFormData] = useState({
    cep: '',
    bairro: '',
    valor: '',
    km: '',
    tempo_entrega: '',
  });

  // ✅ NOVO: Estado para controlar loading do botão de edição
  const [loadingEditTaxa, setLoadingEditTaxa] = useState<string | null>(null);

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    id: string;
    title: string;
    message: string;
  }>({
    isOpen: false,
    id: '',
    title: '',
    message: '',
  });

  useEffect(() => {
    loadTaxaConfig();
  }, []);

  // Recarregar taxas quando o modo mudar
  useEffect(() => {
    if (taxaMode) {
      loadTaxas();
    }
  }, [taxaMode]);

  const loadTaxaConfig = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // Buscar configuração da taxa de entrega na tabela taxa_entrega_config
      const { data: configData, error } = await supabase
        .from('taxa_entrega_config')
        .select('habilitado, tipo')
        .eq('empresa_id', usuarioData.empresa_id)
        .single();

      console.log('Taxa entrega config:', configData);
      console.log('Taxa entrega error:', error);

      if (configData) {
        setTaxaMode(configData.tipo || 'bairro');
        setTaxaConfigHabilitada(configData.habilitado || false);
      } else {
        // Se não existe configuração, usar valores padrão
        setTaxaMode('bairro');
        setTaxaConfigHabilitada(false);
      }
    } catch (error) {
      console.error('Error loading taxa config:', error);
      showMessage('error', 'Erro ao carregar configurações de taxa');
    }
  };

  const loadTaxas = async () => {
    try {
      // Simular um delay mínimo para mostrar o skeleton
      await new Promise(resolve => setTimeout(resolve, 800));

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // Filtrar taxas baseado no tipo configurado
      let query = supabase
        .from('taxa_entrega')
        .select('*')
        .eq('empresa_id', usuarioData.empresa_id);

      // Aplicar filtro baseado no modo de taxa
      if (taxaMode === 'bairro') {
        query = query.not('bairro', 'is', null);
      } else if (taxaMode === 'distancia') {
        query = query.not('km', 'is', null);
      }

      const { data: taxasData } = await query.order('created_at', { ascending: false });

      setTaxas(taxasData || []);
    } catch (error: any) {
      console.error('Error loading taxas:', error);
      showMessage('error', 'Erro ao carregar taxas');
    } finally {
      setIsDataReady(true);
    }
  };

  const formatCEP = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d{3})(\d{3})$/, '$1.$2-$3')
      .substring(0, 10);
  };

  const handleCEPChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const cep = e.target.value;
    setFormData(prev => ({ ...prev, cep: formatCEP(cep) }));

    if (cep.replace(/\D/g, '').length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep.replace(/\D/g, '')}/json/`);
        const data = await response.json();

        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            bairro: data.bairro,
          }));
        }
      } catch (error) {
        console.error('Error fetching CEP:', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (taxaMode === 'bairro' && (!formData.cep.trim() || !formData.valor || !formData.tempo_entrega)) return;
    if (taxaMode === 'distancia' && (!formData.km.trim() || !formData.valor || !formData.tempo_entrega)) return;

    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) throw new Error('Empresa não encontrada');

      if (editingTaxa) {
        const { error } = await supabase
          .from('taxa_entrega')
          .update({
            cep: taxaMode === 'bairro' ? formData.cep : null,
            bairro: taxaMode === 'bairro' ? formData.bairro : null,
            km: taxaMode === 'distancia' ? parseFloat(formData.km) : null,
            valor: parseFloat(formData.valor),
            tempo_entrega: parseInt(formData.tempo_entrega)
          })
          .eq('id', editingTaxa.id);

        if (error) throw error;
        showMessage('success', 'Taxa atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('taxa_entrega')
          .insert([{
            cep: taxaMode === 'bairro' ? formData.cep : null,
            bairro: taxaMode === 'bairro' ? formData.bairro : null,
            km: taxaMode === 'distancia' ? parseFloat(formData.km) : null,
            valor: parseFloat(formData.valor),
            tempo_entrega: parseInt(formData.tempo_entrega),
            empresa_id: usuarioData.empresa_id
          }]);

        if (error) throw error;
        showMessage('success', 'Taxa cadastrada com sucesso!');
      }

      setFormData({ cep: '', bairro: '', valor: '', km: '', tempo_entrega: '' });
      setEditingTaxa(null);
      setShowSidebar(false);
      loadTaxas();
    } catch (error: any) {
      showMessage('error', 'Erro ao salvar taxa: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ NOVA FUNÇÃO: Editar taxa com loading
  const handleEditTaxa = async (taxa: any) => {
    try {
      // ✅ NOVO: Ativar loading para esta taxa específica
      setLoadingEditTaxa(taxa.id);

      setEditingTaxa(taxa);
      setFormData({
        cep: taxa.cep || '',
        bairro: taxa.bairro || '',
        valor: taxa.valor.toString(),
        km: taxa.km?.toString() || '',
        tempo_entrega: taxa.tempo_entrega?.toString() || '',
      });
      setShowSidebar(true);
    } catch (error) {
      console.error('Erro ao abrir taxa para edição:', error);
      showMessage('error', 'Erro ao carregar dados da taxa');
    } finally {
      // ✅ NOVO: Remover loading independente do resultado
      setLoadingEditTaxa(null);
    }
  };

  const handleDelete = async (id: string, identifier: string) => {
    setDeleteConfirmation({
      isOpen: true,
      id,
      title: 'Excluir Taxa',
      message: `Tem certeza que deseja excluir a taxa para ${identifier}? Esta ação não pode ser desfeita.`,
    });
  };

  const handleConfirmDelete = async () => {
    try {
      const { error } = await supabase
        .from('taxa_entrega')
        .delete()
        .eq('id', deleteConfirmation.id);

      if (error) throw error;

      await loadTaxas();
      showMessage('success', 'Taxa excluída com sucesso!');
    } catch (error: any) {
      showMessage('error', 'Erro ao excluir taxa: ' + error.message);
    } finally {
      setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
    }
  };

  // Renderizar skeleton loader para as taxas de entrega
  const renderSkeletonCards = () => {
    return Array(3).fill(0).map((_, index) => (
      <div
        key={index}
        className="bg-background-card p-4 rounded-lg border border-gray-800"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-700 animate-pulse">
              <div className="w-5 h-5 bg-gray-600 rounded"></div>
            </div>
            <div>
              <div className={`h-5 bg-gray-700 rounded animate-pulse mb-1 ${
                index % 3 === 0 ? 'w-24' : index % 3 === 1 ? 'w-32' : 'w-20'
              }`}></div>
              <div className={`h-4 bg-gray-600 rounded animate-pulse mb-2 ${
                index % 3 === 0 ? 'w-20' : index % 3 === 1 ? 'w-28' : 'w-16'
              }`}></div>
              <div className="h-4 w-16 bg-gray-600 rounded animate-pulse mb-1"></div>
              <div className="h-3 w-20 bg-gray-600 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="w-9 h-9 bg-gray-700 rounded-lg animate-pulse"></div>
            <div className="w-9 h-9 bg-gray-700 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>
    ));
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-semibold text-white">Taxa de Entrega</h1>
            {taxaConfigHabilitada && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                taxaMode === 'bairro'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-green-500/20 text-green-400 border border-green-500/30'
              }`}>
                {taxaMode === 'bairro' ? 'Por Bairro' : 'Por Distância'}
              </span>
            )}
            {!taxaConfigHabilitada && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
                Desabilitada
              </span>
            )}
          </div>
          <p className="text-gray-400">
            {taxaConfigHabilitada
              ? `Gerencie suas taxas de entrega ${taxaMode === 'bairro' ? 'por bairro' : 'por distância'}`
              : 'Configure a taxa de entrega nas configurações para começar'
            }
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          disabled={!taxaConfigHabilitada}
          onClick={() => {
            setEditingTaxa(null);
            setFormData({ cep: '', bairro: '', valor: '', km: '', tempo_entrega: '' });
            setShowSidebar(true);
          }}
        >
          + Adicionar Taxa
        </Button>
      </div>

      <div className="grid gap-6">
        {!isDataReady ? (
          renderSkeletonCards()
        ) : (
          <>
            {taxas.map(taxa => (
              <div
                key={taxa.id}
                className="bg-background-card p-4 rounded-lg border border-gray-800"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary-500/10">
                      <MapPin size={20} className="text-primary-400" />
                    </div>
                    <div>
                      {taxaMode === 'bairro' ? (
                        <>
                          <h3 className="text-white font-medium">{taxa.bairro}</h3>
                          <p className="text-sm text-gray-400">CEP: {taxa.cep}</p>
                        </>
                      ) : (
                        <h3 className="text-white font-medium">Até {taxa.km ? parseFloat(taxa.km).toFixed(0) : '0'}km</h3>
                      )}
                      <div>
                        <p className="text-sm text-primary-400">
                          R$ {taxa.valor.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-400">
                          Tempo: {taxa.tempo_entrega} min
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (loadingEditTaxa === taxa.id) return; // Evitar cliques múltiplos
                        handleEditTaxa(taxa);
                      }}
                      className={`p-2 transition-colors ${
                        loadingEditTaxa === taxa.id
                          ? 'text-primary-400 cursor-wait'
                          : 'text-gray-400 hover:text-white'
                      }`}
                      title={loadingEditTaxa === taxa.id ? "Carregando..." : "Editar taxa"}
                      disabled={loadingEditTaxa === taxa.id}
                    >
                      {loadingEditTaxa === taxa.id ? (
                        <div className="w-4 h-4 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin"></div>
                      ) : (
                        <Pencil size={16} />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(taxa.id, taxaMode === 'bairro' ? taxa.bairro : `${taxa.km ? parseFloat(taxa.km).toFixed(0) : '0'}km`)}
                      className="p-2 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {taxas.length === 0 && (
              <div className="bg-background-card rounded-lg p-8 text-center">
                <div className="bg-primary-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin size={24} className="text-primary-400" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">
                  {taxaConfigHabilitada
                    ? `Nenhuma taxa ${taxaMode === 'bairro' ? 'de bairro' : 'de distância'} cadastrada`
                    : 'Taxa de entrega desabilitada'
                  }
                </h3>
                <p className="text-gray-400 mb-6">
                  {taxaConfigHabilitada
                    ? `Cadastre sua primeira taxa ${taxaMode === 'bairro' ? 'por bairro' : 'por distância'} para começar.`
                    : 'Habilite a taxa de entrega nas configurações para começar a cadastrar taxas.'
                  }
                </p>
                {taxaConfigHabilitada && (
                  <Button
                    type="button"
                    variant="primary"
                    className="mx-auto"
                    onClick={() => {
                      setEditingTaxa(null);
                      setFormData({ cep: '', bairro: '', valor: '', km: '', tempo_entrega: '' });
                      setShowSidebar(true);
                    }}
                  >
                    + Adicionar Taxa
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>

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
              className="fixed right-0 top-0 h-screen w-full max-w-md bg-background-card border-l border-gray-800 z-50 overflow-y-auto custom-scrollbar"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">
                    {editingTaxa ? 'Editar Taxa' : 'Nova Taxa'}
                  </h2>
                  <button
                    onClick={() => setShowSidebar(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {taxaMode === 'bairro' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          CEP
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formData.cep}
                            onChange={handleCEPChange}
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-3 pr-10 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                            placeholder="00.000-000"
                          />
                          <button
                            type="button"
                            onClick={() => handleCEPChange({ target: { value: formData.cep } } as any)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                          >
                            <Search size={18} />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Bairro
                        </label>
                        <input
                          type="text"
                          value={formData.bairro}
                          readOnly
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                          placeholder="Digite o bairro"
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Distância (KM)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.km}
                        onChange={(e) => setFormData(prev => ({ ...prev, km: e.target.value }))}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        placeholder="Digite a distância"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Valor
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.valor}
                      onChange={(e) => setFormData(prev => ({ ...prev, valor: e.target.value }))}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Tempo de Entrega (minutos)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.tempo_entrega}
                      onChange={(e) => setFormData(prev => ({ ...prev, tempo_entrega: e.target.value }))}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                      placeholder="30"
                      required
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button
                      type="button"
                      variant="text"
                      className="flex-1"
                      onClick={() => setShowSidebar(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      className="flex-1"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Salvando...' : editingTaxa ? 'Salvar' : 'Criar'}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <DeleteConfirmation
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmDelete}
        title={deleteConfirmation.title}
        message={deleteConfirmation.message}
      />
    </div>
  );
};

export default TaxaEntregaPage;