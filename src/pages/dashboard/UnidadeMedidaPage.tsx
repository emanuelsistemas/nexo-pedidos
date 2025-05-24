import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Trash2, Ruler } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Button from '../../components/comum/Button';
import { showMessage } from '../../utils/toast';

interface UnidadeMedida {
  id: string;
  sigla: string;
  nome: string;
  empresa_id: string;
  created_at?: string;
}

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-background-card p-6 rounded-lg shadow-lg max-w-md w-full"
      >
        <h2 className="text-xl font-semibold text-white mb-2">{title}</h2>
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
            variant="danger"
            className="flex-1"
            onClick={onConfirm}
          >
            Excluir
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

const UnidadeMedidaPage: React.FC = () => {
  const [showSidebar, setShowSidebar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [unidades, setUnidades] = useState<UnidadeMedida[]>([]);
  const [editingUnidade, setEditingUnidade] = useState<UnidadeMedida | null>(null);
  const [formData, setFormData] = useState({
    sigla: '',
    nome: '',
  });
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
    loadUnidades();
  }, []);

  const loadUnidades = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      const { data, error } = await supabase
        .from('unidade_medida')
        .select('*')
        .eq('empresa_id', usuarioData.empresa_id)
        .order('sigla', { ascending: true });

      if (error) throw error;
      setUnidades(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar unidades de medida:', error);
      showMessage('error', 'Erro ao carregar unidades de medida');
    }
  };

  const handleEditUnidade = (unidade: UnidadeMedida) => {
    setEditingUnidade(unidade);
    setFormData({
      sigla: unidade.sigla,
      nome: unidade.nome,
    });
    setShowSidebar(true);
  };

  const handleDeleteClick = (unidade: UnidadeMedida) => {
    setDeleteConfirmation({
      isOpen: true,
      id: unidade.id,
      title: 'Excluir Unidade de Medida',
      message: `Tem certeza que deseja excluir a unidade "${unidade.sigla} - ${unidade.nome}"? Esta ação não pode ser desfeita.`,
    });
  };

  const handleConfirmDelete = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('unidade_medida')
        .delete()
        .eq('id', deleteConfirmation.id);

      if (error) throw error;

      setUnidades(unidades.filter(u => u.id !== deleteConfirmation.id));
      showMessage('success', 'Unidade de medida excluída com sucesso');
    } catch (error: any) {
      console.error('Erro ao excluir unidade de medida:', error);
      showMessage('error', 'Erro ao excluir unidade de medida');
    } finally {
      setIsLoading(false);
      setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.sigla || !formData.nome) {
      showMessage('error', 'Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setIsLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) throw new Error('Empresa não encontrada');

      if (editingUnidade) {
        const { error } = await supabase
          .from('unidade_medida')
          .update({
            sigla: formData.sigla,
            nome: formData.nome,
          })
          .eq('id', editingUnidade.id);

        if (error) throw error;

        setUnidades(unidades.map(u =>
          u.id === editingUnidade.id
            ? { ...u, sigla: formData.sigla, nome: formData.nome }
            : u
        ));

        showMessage('success', 'Unidade de medida atualizada com sucesso');
      } else {
        const { data, error } = await supabase
          .from('unidade_medida')
          .insert({
            sigla: formData.sigla,
            nome: formData.nome,
            empresa_id: usuarioData.empresa_id,
          })
          .select();

        if (error) throw error;

        if (data && data.length > 0) {
          setUnidades([...unidades, data[0]]);
        }

        showMessage('success', 'Unidade de medida criada com sucesso');
      }

      setShowSidebar(false);
      setFormData({ sigla: '', nome: '' });
      setEditingUnidade(null);
    } catch (error: any) {
      console.error('Erro ao salvar unidade de medida:', error);
      showMessage('error', 'Erro ao salvar unidade de medida');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Unidades de Medida</h1>
          <p className="text-gray-400 mt-1">Gerencie as unidades de medida para seus produtos</p>
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={() => {
            setEditingUnidade(null);
            setFormData({ sigla: '', nome: '' });
            setShowSidebar(true);
          }}
        >
          + Adicionar Unidade
        </Button>
      </div>

      <div className="grid gap-6">
        {unidades.map(unidade => (
          <div
            key={unidade.id}
            className="bg-background-card p-4 rounded-lg border border-gray-800"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-500/10">
                  <Ruler size={20} className="text-primary-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium">{unidade.sigla}</h3>
                  <p className="text-sm text-gray-400">{unidade.nome}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditUnidade(unidade)}
                  className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => handleDeleteClick(unidade)}
                  className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {unidades.length === 0 && (
          <div className="bg-background-card rounded-lg p-8 text-center">
            <div className="bg-primary-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ruler size={24} className="text-primary-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              Nenhuma unidade de medida cadastrada
            </h3>
            <p className="text-gray-400 mb-6">
              Cadastre sua primeira unidade de medida para começar.
            </p>
            <Button
              type="button"
              variant="primary"
              className="mx-auto"
              onClick={() => {
                setEditingUnidade(null);
                setFormData({ sigla: '', nome: '' });
                setShowSidebar(true);
              }}
            >
              + Adicionar Unidade
            </Button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showSidebar && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowSidebar(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-background-card border-l border-gray-800 z-50 overflow-y-auto custom-scrollbar"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">
                    {editingUnidade ? 'Editar Unidade' : 'Nova Unidade'}
                  </h2>
                  <button
                    onClick={() => setShowSidebar(false)}
                    className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Sigla <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.sigla}
                        onChange={(e) => setFormData({ ...formData, sigla: e.target.value })}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        placeholder="Ex: KG, UN, CX"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Nome <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        placeholder="Ex: Quilograma, Unidade, Caixa"
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
                        {isLoading ? 'Salvando...' : editingUnidade ? 'Salvar' : 'Criar'}
                      </Button>
                    </div>
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

export default UnidadeMedidaPage;
