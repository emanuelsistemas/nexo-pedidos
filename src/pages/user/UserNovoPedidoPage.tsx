import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Building, DollarSign, Save, Plus, Minus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showMessage } from '../../utils/toast';

interface Empresa {
  id: string;
  nome: string;
}

interface Produto {
  id: string;
  nome: string;
  preco: number;
  codigo: string;
  descricao?: string;
}

interface ItemPedido {
  id: string;
  produto: Produto;
  quantidade: number;
  observacao: string;
  valorUnitario: number;
  valorTotal: number;
}

const UserNovoPedidoPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string>('');
  const [clienteNome, setClienteNome] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [itensPedido, setItensPedido] = useState<ItemPedido[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<string>('');
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState('');
  const [valorTotal, setValorTotal] = useState(0);

  useEffect(() => {
    loadEmpresas();
  }, []);

  useEffect(() => {
    // Quando as empresas são carregadas, seleciona automaticamente a primeira
    if (empresas.length > 0 && !empresaSelecionada) {
      setEmpresaSelecionada(empresas[0].id);
    }
  }, [empresas]);

  useEffect(() => {
    if (empresaSelecionada) {
      loadProdutos(empresaSelecionada);
    } else {
      setProdutos([]);
    }
  }, [empresaSelecionada]);

  useEffect(() => {
    // Calcular o valor total do pedido
    const total = itensPedido.reduce((acc, item) => acc + item.valorTotal, 0);
    setValorTotal(total);
  }, [itensPedido]);

  const loadEmpresas = async () => {
    try {
      setIsLoading(true);

      // Obter o usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Obter empresas
      const { data: empresasData } = await supabase
        .from('empresas')
        .select('id, nome')
        .order('nome');

      if (empresasData) {
        setEmpresas(empresasData);
      }
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProdutos = async (empresaId: string) => {
    try {
      setIsLoading(true);

      // Obter produtos da empresa
      const { data: produtosData } = await supabase
        .from('produtos')
        .select('id, nome, preco, codigo, descricao')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .eq('deletado', false)
        .order('nome');

      if (produtosData) {
        setProdutos(produtosData);
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!produtoSelecionado || quantidade <= 0) return;

    const produto = produtos.find(p => p.id === produtoSelecionado);
    if (!produto) return;

    const valorUnitario = produto.preco;
    const valorTotal = valorUnitario * quantidade;

    const novoItem: ItemPedido = {
      id: Date.now().toString(), // ID temporário
      produto,
      quantidade,
      observacao,
      valorUnitario,
      valorTotal
    };

    setItensPedido([...itensPedido, novoItem]);

    // Limpar campos
    setProdutoSelecionado('');
    setQuantidade(1);
    setObservacao('');
  };

  const handleRemoveItem = (id: string) => {
    setItensPedido(itensPedido.filter(item => item.id !== id));
  };

  const handleUpdateQuantidade = (id: string, novaQuantidade: number) => {
    if (novaQuantidade <= 0) return;

    setItensPedido(itensPedido.map(item => {
      if (item.id === id) {
        const valorTotal = item.valorUnitario * novaQuantidade;
        return { ...item, quantidade: novaQuantidade, valorTotal };
      }
      return item;
    }));
  };

  const formatarTelefone = (telefone: string) => {
    // Remove todos os caracteres não numéricos
    const numeroLimpo = telefone.replace(/\D/g, '');

    // Aplica a máscara de telefone
    if (numeroLimpo.length <= 10) {
      // Formato (XX) XXXX-XXXX para telefones fixos
      return numeroLimpo.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
      // Formato (XX) XXXXX-XXXX para celulares
      return numeroLimpo.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setClienteTelefone(formatarTelefone(valor));
  };

  const formatarPreco = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clienteNome || !clienteTelefone || itensPedido.length === 0) {
      showMessage('error', 'Preencha todos os campos obrigatórios e adicione pelo menos um item ao pedido');
      return;
    }

    try {
      setIsSaving(true);

      // Obter o usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      // Gerar número do pedido (formato: ANO+MES+DIA+HORA+MINUTO+SEGUNDO)
      const agora = new Date();
      const numeroPedido = `${agora.getFullYear()}${(agora.getMonth() + 1).toString().padStart(2, '0')}${agora.getDate().toString().padStart(2, '0')}${agora.getHours().toString().padStart(2, '0')}${agora.getMinutes().toString().padStart(2, '0')}${agora.getSeconds().toString().padStart(2, '0')}`;

      // Criar pedido
      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .insert({
          empresa_id: empresaSelecionada,
          usuario_id: userData.user.id,
          cliente_nome: clienteNome,
          cliente_telefone: clienteTelefone.replace(/\D/g, ''),
          valor_total: valorTotal,
          status: 'pendente',
          numero_pedido: numeroPedido
        })
        .select()
        .single();

      if (pedidoError) throw pedidoError;

      // Criar itens do pedido
      const itensPedidoData = itensPedido.map(item => ({
        pedido_id: pedido.id,
        produto_id: item.produto.id,
        quantidade: item.quantidade,
        valor_unitario: item.valorUnitario,
        valor_total: item.valorTotal,
        observacao: item.observacao
      }));

      const { error: itensError } = await supabase
        .from('pedidos_itens')
        .insert(itensPedidoData);

      if (itensError) throw itensError;

      showMessage('success', 'Pedido criado com sucesso!');
      navigate('/user/pedidos');
    } catch (error: any) {
      console.error('Erro ao criar pedido:', error);
      showMessage('error', 'Erro ao criar pedido: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/user/pedidos')}
          className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-semibold text-white">Novo Pedido</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados do cliente e empresa */}
        <div className="bg-background-card rounded-lg border border-gray-800 p-4 space-y-4">
          <h2 className="text-lg font-medium text-white mb-2">Dados do Pedido</h2>

          {/* Empresa - Campo oculto */}
          <input type="hidden" value={empresaSelecionada} />

          {/* Nome do Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Nome do Cliente <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={18} className="text-gray-500" />
              </div>
              <input
                type="text"
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                placeholder="Nome do cliente"
                required
              />
            </div>
          </div>

          {/* Telefone do Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Telefone do Cliente <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone size={18} className="text-gray-500" />
              </div>
              <input
                type="text"
                value={clienteTelefone}
                onChange={handleTelefoneChange}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                placeholder="(00) 00000-0000"
                required
              />
            </div>
          </div>
        </div>

        {/* Adicionar itens */}
        <div className="bg-background-card rounded-lg border border-gray-800 p-4 space-y-4">
          <h2 className="text-lg font-medium text-white mb-2">Itens do Pedido</h2>

          {/* Produto */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Produto
            </label>
            <select
              value={produtoSelecionado}
              onChange={(e) => setProdutoSelecionado(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
            >
              <option value="">Selecione um produto</option>
              {produtos.map(produto => (
                <option key={produto.id} value={produto.id}>
                  {produto.nome} - {formatarPreco(produto.preco)}
                </option>
              ))}
            </select>
          </div>

          {/* Quantidade */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Quantidade
            </label>
            <input
              type="number"
              min="1"
              value={quantidade}
              onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
            />
          </div>

          {/* Observação */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Observação
            </label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
              rows={2}
              placeholder="Observações sobre o item (opcional)"
            />
          </div>

          {/* Botão adicionar */}
          <button
            type="button"
            onClick={handleAddItem}
            disabled={!produtoSelecionado}
            className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={18} />
            <span>Adicionar Item</span>
          </button>
        </div>

        {/* Lista de itens */}
        <div className="bg-background-card rounded-lg border border-gray-800 p-4">
          <h2 className="text-lg font-medium text-white mb-4">Itens Adicionados</h2>

          {itensPedido.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-400">Nenhum item adicionado ao pedido</p>
            </div>
          ) : (
            <div className="space-y-3">
              {itensPedido.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-gray-800/50 rounded-lg"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-white font-medium">{item.produto.nome}</h3>
                      <p className="text-sm text-gray-400">
                        {formatarPreco(item.valorUnitario)} x {item.quantidade} = {formatarPreco(item.valorTotal)}
                      </p>
                      {item.observacao && (
                        <p className="text-xs text-gray-500 mt-1">
                          Obs: {item.observacao}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-gray-700 rounded-lg">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantidade(item.id, item.quantidade - 1)}
                          className="p-1 text-gray-400 hover:text-white"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="px-2 text-white">{item.quantidade}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantidade(item.id, item.quantidade + 1)}
                          className="p-1 text-gray-400 hover:text-white"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}

              <div className="flex justify-between items-center pt-4 border-t border-gray-700 mt-4">
                <span className="text-white font-medium">Total:</span>
                <span className="text-xl font-semibold text-primary-400">{formatarPreco(valorTotal)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Botão salvar */}
        <button
          type="submit"
          disabled={isSaving || itensPedido.length === 0}
          className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white py-3 px-4 rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Salvando...</span>
            </>
          ) : (
            <>
              <Save size={18} />
              <span>Finalizar Pedido</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default UserNovoPedidoPage;
