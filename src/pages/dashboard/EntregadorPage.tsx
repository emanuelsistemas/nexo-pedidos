import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Trash2, Bike } from 'lucide-react';
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

const EntregadorPage: React.FC = () => {
  const [showSidebar, setShowSidebar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [entregadores, setEntregadores] = useState<any[]>([]);
  const [editingEntregador, setEditingEntregador] = useState<any>(null);
  const [novoEntregador, setNovoEntregador] = useState({ nome: '', comissao: '' });
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
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      const { data: entregadoresData } = await supabase
        .from('entregadores')
        .select('*')
        .eq('empresa_id', usuarioData.empresa_id)
        .order('nome');

      setEntregadores(entregadoresData || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      showMessage('error', 'Erro ao carregar entregadores');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoEntregador.nome.trim() || !novoEntregador.comissao) return;

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

      if (editingEntregador) {
        const { error } = await supabase
          .from('entregadores')
          .update({
            nome: novoEntregador.nome,
            comissao: parseFloat(novoEntregador.comissao)
          })
          .eq('id', editingEntregador.id);

        if (error) throw error;
        showMessage('success', 'Entregador atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('entregadores')
          .insert([{
            nome: novoEntregador.nome,
            comissao: parseFloat(novoEntregador.comissao),
            empresa_id: usuarioData.empresa_id
          }]);

        if (error) throw error;
        showMessage('success', 'Entregador cadastrado com sucesso!');
      }

      setNovoEntregador({ nome: '', comissao: '' });
      setEditingEntregador(null);
      setShowSidebar(false);
      loadData();
    } catch (error: any) {
      showMessage('error', 'Erro ao salvar entregador: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    setDeleteConfirmation({
      isOpen: true,
      id,
      title: 'Excluir Entregador',
      message: `Tem certeza que deseja excluir o entregador "${nome}"? Esta ação não pode ser desfeita.`,
    });
  };

  const handleConfirmDelete = async () => {
    try {
      const { error } = await supabase
        .from('entregadores')
        .delete()
        .eq('id', deleteConfirmation.id);

      if (error) throw error;

      await loadData();
      showMessage('success', 'Entregador excluído com sucesso!');
    } catch (error: any) {
      showMessage('error', 'Erro ao excluir entregador: ' + error.message);
    } finally {
      setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Entregadores</h1>
          <p className="text-gray-400 mt-1">Gerencie seus entregadores</p>
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={() => {
            setEditingEntregador(null);
            setNovoEntregador({ nome: '', comissao: '' });
            setShowSidebar(true);
          }}
        >
          + Adicionar Entregador
        </Button>
      </div>

      <div className="grid gap-6">
        {entregadores.map(entregador => (
          <div
            key={entregador.id}
            className="bg-background-card p-4 rounded-lg border border-gray-800"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-500/10">
                  <Bike size={20} className="text-primary-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium">{entregador.nome}</h3>
                  <p className="text-sm text-primary-400">
                    Comissão: {entregador.comissao}%
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingEntregador(entregador);
                    setNovoEntregador({
                      nome: entregador.nome,
                      comissao: entregador.comissao.toString()
                    });
                    setShowSidebar(true);
                  }}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDelete(entregador.id, entregador.nome)}
                  className="p-2 text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {entregadores.length === 0 && (
          <div className="bg-background-card rounded-lg p-8 text-center">
            <div className="bg-primary-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bike size={24} className="text-primary-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              Nenhum entregador cadastrado
            </h3>
            <p className="text-gray-400 mb-6">
              Cadastre seu primeiro entregador para começar.
            </p>
            <Button
              type="button"
              variant="primary"
              className="mx-auto"
              onClick={() => {
                setEditingEntregador(null);
                setNovoEntregador({ nome: '', comissao: '' });
                setShowSidebar(true);
              }}
            >
              + Adicionar Entregador
            </Button>
          </div>
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
              className="fixed right-0 top-0 h-screen w-full max-w-md bg-background-card border-l border-gray-800 z-50 overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">
                    {editingEntregador ? 'Editar Entregador' : 'Novo Entregador'}
                  </h2>
                  <button
                    onClick={() => setShowSidebar(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Nome do Entregador
                    </label>
                    <input
                      type="text"
                      value={novoEntregador.nome}
                      onChange={(e) => setNovoEntregador({ ...novoEntregador, nome: e.target.value })}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                      placeholder="Digite o nome do entregador"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Comissão (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={novoEntregador.comissao}
                      onChange={(e) => setNovoEntregador({ ...novoEntregador, comissao: e.target.value })}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                      placeholder="0.00"
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
                      {isLoading ? 'Salvando...' : editingEntregador ? 'Salvar' : 'Criar'}
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

export default EntregadorPage;