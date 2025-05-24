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
  const [isDataReady, setIsDataReady] = useState(false);
  const [opcoes, setOpcoes] = useState<any[]>([]);
  const [editingOpcao, setEditingOpcao] = useState<any>(null);
  const [novaOpcao, setNovaOpcao] = useState({ nome: '', quantidade_minima: 0 });
  const [novoItem, setNovoItem] = useState({ nome: '', preco: '' });
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
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

      const { data: opcoesData } = await supabase
        .from('opcoes_adicionais')
        .select(`
          *,
          itens:opcoes_adicionais_itens(deletado.eq.false)
        `)
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('deletado', false)
        .order('nome');

      setOpcoes(opcoesData || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      showMessage('error', 'Erro ao carregar dados');
    } finally {
      setIsDataReady(true);
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
          .update({
            nome: novaOpcao.nome,
            quantidade_minima: novaOpcao.quantidade_minima
          })
          .eq('id', editingOpcao.id);

        if (error) throw error;
        showMessage('success', 'Opção atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('opcoes_adicionais')
          .insert([{
            nome: novaOpcao.nome,
            quantidade_minima: novaOpcao.quantidade_minima,
            empresa_id: usuarioData.empresa_id
          }]);

        if (error) throw error;
        showMessage('success', 'Opção criada com sucesso!');
      }

      setNovaOpcao({ nome: '', quantidade_minima: 0 });
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
    if (!novoItem.nome.trim()) return;

    // Se o campo de preço estiver vazio, considerar como zero
    // Caso contrário, converter para número
    const preco = novoItem.preco === '' ? 0 : parseFloat(novoItem.preco);
    if (isNaN(preco)) return;

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

      if (editingItem) {
        // Atualizar item existente
        const { error } = await supabase
          .from('opcoes_adicionais_itens')
          .update({
            nome: novoItem.nome,
            preco: preco
          })
          .eq('id', editingItem.id);

        if (error) throw error;

        setNovoItem({ nome: '', preco: '' });
        setEditingItem(null);
        setIsAddingItem(false);
        setEditingOpcao(null);
        setShowSidebar(false);
        loadData();
        showMessage('success', 'Item atualizado com sucesso!');
      } else {
        // Adicionar novo item
        const { error } = await supabase
          .from('opcoes_adicionais_itens')
          .insert([{
            nome: novoItem.nome,
            preco: preco,
            opcao_id: editingOpcao.id,
            empresa_id: usuarioData.empresa_id
          }]);

        if (error) throw error;

        setNovoItem({ nome: '', preco: '' });
        setIsAddingItem(false);
        setEditingOpcao(null);
        setShowSidebar(false);
        loadData();
        showMessage('success', 'Item adicionado com sucesso!');
      }
    } catch (error: any) {
      showMessage('error', `Erro ao ${editingItem ? 'atualizar' : 'adicionar'} item: ` + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditItem = (item: any, opcao: any) => {
    setEditingOpcao(opcao);
    setEditingItem(item);
    setNovoItem({
      nome: item.nome,
      preco: item.preco.toString()
    });
    setIsAddingItem(true);
    setShowSidebar(true);
  };

  const handleDelete = async (id: string, type: 'opcao' | 'item', nome: string) => {
    setDeleteConfirmation({
      isOpen: true,
      itemId: id,
      itemType: type,
      title: `Excluir ${type === 'opcao' ? 'Opção' : 'Item'}`,
      message: `Tem certeza que deseja excluir ${type === 'opcao' ? 'a opção' : 'o item'} "${nome}"? Você poderá restaurá-${type === 'opcao' ? 'la' : 'lo'} posteriormente se necessário.`,
    });
  };

  const handleConfirmDelete = async () => {
    try {
      // Obter dados do usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const now = new Date().toISOString();
      const { itemId, itemType } = deleteConfirmation;
      const table = itemType === 'opcao' ? 'opcoes_adicionais' : 'opcoes_adicionais_itens';

      const { error } = await supabase
        .from(table)
        .update({
          deletado: true,
          deletado_em: now,
          deletado_por: userData.user.id
        })
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

  // Renderizar skeleton loader para as opções adicionais
  const renderSkeletonCards = () => {
    return Array(3).fill(0).map((_, index) => (
      <div
        key={index}
        className="bg-background-card rounded-lg border border-gray-800"
      >
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <div className={`h-6 bg-gray-700 rounded animate-pulse mb-2 ${
              index % 3 === 0 ? 'w-32' : index % 3 === 1 ? 'w-40' : 'w-28'
            }`}></div>
            <div className="h-4 w-20 bg-gray-600 rounded animate-pulse"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 bg-gray-700 rounded animate-pulse"></div>
            <div className="w-8 h-8 bg-gray-700 rounded animate-pulse"></div>
            <div className="w-8 h-8 bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {Array(2).fill(0).map((_, itemIndex) => (
              <div
                key={itemIndex}
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
              >
                <div className={`h-4 bg-gray-700 rounded animate-pulse ${
                  itemIndex % 2 === 0 ? 'w-24' : 'w-32'
                }`}></div>
                <div className="flex items-center gap-4">
                  <div className="h-4 w-16 bg-gray-700 rounded animate-pulse"></div>
                  <div className="w-8 h-8 bg-gray-700 rounded animate-pulse"></div>
                  <div className="w-8 h-8 bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ));
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
            setNovaOpcao({ nome: '', quantidade_minima: 0 });
            setIsAddingItem(false);
            setShowSidebar(true);
          }}
        >
          + Adicionar Opção
        </Button>
      </div>

      <div className="space-y-6">
        {!isDataReady ? (
          renderSkeletonCards()
        ) : (
          <>
            {opcoes.map(opcao => (
              <div
                key={opcao.id}
                className="bg-background-card rounded-lg border border-gray-800"
              >
                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-white">{opcao.nome}</h3>
                    {opcao.quantidade_minima > 0 && (
                      <p className="text-xs text-primary-400 mt-1">
                        Mínimo: {opcao.quantidade_minima} {opcao.quantidade_minima === 1 ? 'item' : 'itens'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingOpcao(opcao);
                        setNovoItem({ nome: '', preco: '0' });
                        setIsAddingItem(true);
                        setEditingItem(null);
                        setShowSidebar(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-500/10 rounded-md text-primary-400 hover:text-primary-300 hover:bg-primary-500/20 transition-colors"
                    >
                      <Plus size={14} />
                      Adicionar Item
                    </button>
                    <button
                      onClick={() => {
                        setEditingOpcao(opcao);
                        setNovaOpcao({
                          nome: opcao.nome,
                          quantidade_minima: opcao.quantidade_minima || 0
                        });
                        setIsAddingItem(false);
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
                              onClick={() => handleEditItem(item, opcao)}
                              className="p-1 text-gray-400 hover:text-white transition-colors"
                            >
                              <Pencil size={16} />
                            </button>
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
                    setNovaOpcao({ nome: '', quantidade_minima: 0 });
                    setIsAddingItem(false);
                    setShowSidebar(true);
                  }}
                >
                  + Adicionar Opção
                </Button>
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
              onClick={() => {
                setShowSidebar(false);
                setIsAddingItem(false);
                setEditingItem(null);
              }}
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
                    {editingOpcao
                      ? isAddingItem
                        ? editingItem ? 'Editar Item' : 'Novo Item'
                        : 'Editar Opção'
                      : 'Nova Opção'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowSidebar(false);
                      setIsAddingItem(false);
                      setEditingItem(null);
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                {(!editingOpcao || (editingOpcao && !isAddingItem)) && (
                  <form onSubmit={handleSubmitOpcao} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Nome da Opção
                      </label>
                      <input
                        type="text"
                        value={novaOpcao.nome}
                        onChange={(e) => setNovaOpcao({ ...novaOpcao, nome: e.target.value })}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        placeholder="Digite o nome da opção"
                      />

                      <label className="block text-sm font-medium text-gray-400 mt-4 mb-2">
                        Quantidade Mínima
                      </label>
                      <div className="flex items-center">
                        <input
                          type="number"
                          min="0"
                          value={novaOpcao.quantidade_minima}
                          onChange={(e) => setNovaOpcao({ ...novaOpcao, quantidade_minima: parseInt(e.target.value) || 0 })}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                          placeholder="0"
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Se maior que 0, o cliente deverá selecionar pelo menos esta quantidade de itens desta opção.
                      </p>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <Button
                        type="button"
                        variant="text"
                        className="flex-1"
                        onClick={() => {
                          setShowSidebar(false);
                          setIsAddingItem(false);
                          setEditingItem(null);
                        }}
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

                {editingOpcao && isAddingItem && (
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
                        min="0"
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
                        onClick={() => {
                          setShowSidebar(false);
                          setIsAddingItem(false);
                          setEditingItem(null);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        className="flex-1"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Salvando...' : editingItem ? 'Salvar Item' : 'Adicionar Item'}
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