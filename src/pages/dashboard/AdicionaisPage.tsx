import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Trash2, Plus } from 'lucide-react';
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

const AdicionaisPage: React.FC = () => {
  const [showSidebar, setShowSidebar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [opcoes, setOpcoes] = useState<any[]>([]);
  const [editingOpcao, setEditingOpcao] = useState<any>(null);
  const [novaOpcao, setNovaOpcao] = useState({ nome: '' });
  const [novoItem, setNovoItem] = useState({ nome: '', preco: '' });
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    itemId: string;
    itemType: 'opcao' | 'item';
    title: string;
    message: string;
  }>({
    isOpen: false,
    itemId: '',
    itemType: 'opcao',
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

      const { data: opcoesData } = await supabase
        .from('opcoes_adicionais')
        .select(`
          *,
          itens:opcoes_adicionais_itens(*)
        `)
        .eq('empresa_id', usuarioData.empresa_id)
        .order('nome');

      setOpcoes(opcoesData || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      showMessage('error', 'Erro ao carregar dados');
    }
  };

  const handleSubmitOpcao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaOpcao.nome.trim()) return;

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

      if (editingOpcao) {
        const { error } = await supabase
          .from('opcoes_adicionais')
          .update({ nome: novaOpcao.nome })
          .eq('id', editingOpcao.id);

        if (error) throw error;
        showMessage('success', 'Opção atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('opcoes_adicionais')
          .insert([{
            nome: novaOpcao.nome,
            empresa_id: usuarioData.empresa_id
          }]);

        if (error) throw error;
        showMessage('success', 'Opção criada com sucesso!');
      }

      setNovaOpcao({ nome: '' });
      setEditingOpcao(null);
      setShowSidebar(false);
      loadData();
    } catch (error: any) {
      showMessage('error', 'Erro ao salvar opção: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoItem.nome.trim() || !novoItem.preco) return;

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

      const { error } = await supabase
        .from('opcoes_adicionais_itens')
        .insert([{
          nome: novoItem.nome,
          preco: parseFloat(novoItem.preco),
          opcao_id: editingOpcao.id,
          empresa_id: usuarioData.empresa_id
        }]);

      if (error) throw error;

      setNovoItem({ nome: '', preco: '' });
      loadData();
      showMessage('success', 'Item adicionado com sucesso!');
    } catch (error: any) {
      showMessage('error', 'Erro ao adicionar item: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, type: 'opcao' | 'item', nome: string) => {
    setDeleteConfirmation({
      isOpen: true,
      itemId: id,
      itemType: type,
      title: `Excluir ${type === 'opcao' ? 'Opção' : 'Item'}`,
      message: `Tem certeza que deseja excluir ${type === 'opcao' ? 'a opção' : 'o item'} "${nome}"? Esta ação não pode ser desfeita.`,
    });
  };

  const handleConfirmDelete = async () => {
    try {
      const { itemId, itemType } = deleteConfirmation;
      const table = itemType === 'opcao' ? 'opcoes_adicionais' : 'opcoes_adicionais_itens';

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      await loadData();
      showMessage('success', `${itemType === 'opcao' ? 'Opção' : 'Item'} excluído com sucesso!`);
    } catch (error: any) {
      showMessage('error', 'Erro ao excluir item: ' + error.message);
    } finally {
      setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Opções Adicionais</h1>
          <p className="text-gray-400 mt-1">Gerencie as opções adicionais dos produtos</p>
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={() => {
            setEditingOpcao(null);
            setNovaOpcao({ nome: '' });
            setShowSidebar(true);
          }}
        >
          + Adicionar Opção
        </Button>
      </div>

      <div className="space-y-6">
        {opcoes.map(opcao => (
          <div
            key={opcao.id}
            className="bg-background-card rounded-lg border border-gray-800"
          >
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">{opcao.nome}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingOpcao(opcao);
                    setNovaOpcao({ nome: opcao.nome });
                    setShowSidebar(true);
                  }}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDelete(opcao.id, 'opcao', opcao.nome)}
                  className="p-1 text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="p-4">
              {opcao.itens?.length > 0 ? (
                <div className="space-y-3">
                  {opcao.itens.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                    >
                      <span className="text-white">{item.nome}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-primary-400">
                          R$ {item.preco.toFixed(2)}
                        </span>
                        <button
                          onClick={() => handleDelete(item.id, 'item', item.nome)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-400">Nenhum item cadastrado</p>
                </div>
              )}

              <button
                onClick={() => {
                  setEditingOpcao(opcao);
                  setNovoItem({ nome: '', preco: '' });
                  setShowSidebar(true);
                }}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
              >
                <Plus size={16} />
                Adicionar Item
              </button>
            </div>
          </div>
        ))}

        {opcoes.length === 0 && (
          <div className="bg-background-card rounded-lg p-8 text-center">
            <h3 className="text-lg font-medium text-white mb-2">
              Nenhuma opção cadastrada
            </h3>
            <p className="text-gray-400 mb-6">
              Crie sua primeira opção adicional para começar.
            </p>
            <Button
              type="button"
              variant="primary"
              className="mx-auto"
              onClick={() => {
                setEditingOpcao(null);
                setNovaOpcao({ nome: '' });
                setShowSidebar(true);
              }}
            >
              + Adicionar Opção
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
                    {editingOpcao
                      ? novoItem.nome || novoItem.preco
                        ? 'Novo Item'
                        : 'Editar Opção'
                      : 'Nova Opção'}
                  </h2>
                  <button
                    onClick={() => setShowSidebar(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                {(!editingOpcao || (editingOpcao && !novoItem.nome && !novoItem.preco)) && (
                  <form onSubmit={handleSubmitOpcao} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Nome da Opção
                      </label>
                      <input
                        type="text"
                        value={novaOpcao.nome}
                        onChange={(e) => setNovaOpcao({ nome: e.target.value })}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        placeholder="Digite o nome da opção"
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
                        {isLoading ? 'Salvando...' : editingOpcao ? 'Salvar' : 'Criar'}
                      </Button>
                    </div>
                  </form>
                )}

                {editingOpcao && (novoItem.nome || novoItem.preco) && (
                  <form onSubmit={handleSubmitItem} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Nome do Item
                      </label>
                      <input
                        type="text"
                        value={novoItem.nome}
                        onChange={(e) => setNovoItem({ ...novoItem, nome: e.target.value })}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        placeholder="Digite o nome do item"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Preço
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={novoItem.preco}
                        onChange={(e) => setNovoItem({ ...novoItem, preco: e.target.value })}
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
                        {isLoading ? 'Salvando...' : 'Adicionar Item'}
                      </Button>
                    </div>
                  </form>
                )}
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

export default AdicionaisPage;