import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Building, DollarSign, Save, Plus, Minus, Trash2, FileText, MapPin, Search, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showMessage } from '../../utils/toast';
import ClienteDropdown from '../../components/comum/ClienteDropdown';
import ProdutoSeletorModal from '../../components/comum/ProdutoSeletorModal';

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

interface DescontoPrazo {
  id: string;
  prazo_dias: number;
  percentual: number;
  tipo: 'desconto' | 'acrescimo';
}

interface DescontoValor {
  id: string;
  valor_minimo: number;
  percentual: number;
  tipo: 'desconto' | 'acrescimo';
}

interface ItemPedido {
  id: string;
  produto: Produto;
  quantidade: number;
  observacao: string;
  valorUnitario: number;
  valorTotal: number;
  valorOriginal?: number;
  temDesconto?: boolean;
  tipoDesconto?: string;
}

const UserNovoPedidoPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string>('');
  const [clienteId, setClienteId] = useState('');
  const [clienteNome, setClienteNome] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [clienteData, setClienteData] = useState<{
    documento?: string;
    tipo_documento?: string;
    endereco?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    complemento?: string;
  }>();
  const [itensPedido, setItensPedido] = useState<ItemPedido[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<string>('');
  const [produtoSelecionadoObj, setProdutoSelecionadoObj] = useState<Produto | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [quantidadeVazia, setQuantidadeVazia] = useState(false);
  const [observacao, setObservacao] = useState('');
  const [valorTotal, setValorTotal] = useState(0);
  const [isProdutoModalOpen, setIsProdutoModalOpen] = useState(false);
  const [descontosPrazo, setDescontosPrazo] = useState<DescontoPrazo[]>([]);
  const [descontosValor, setDescontosValor] = useState<DescontoValor[]>([]);
  const [descontoPrazoSelecionado, setDescontoPrazoSelecionado] = useState<string | null>(null);
  const [descontoValorSelecionado, setDescontoValorSelecionado] = useState<string | null>(null);
  const [valorDesconto, setValorDesconto] = useState(0);
  const [valorAcrescimo, setValorAcrescimo] = useState(0);
  const [descontoPrazoObj, setDescontoPrazoObj] = useState<DescontoPrazo | null>(null);
  const [descontoValorObj, setDescontoValorObj] = useState<DescontoValor | null>(null);

  useEffect(() => {
    loadEmpresas();
  }, []);

  useEffect(() => {
    // Quando as empresas são carregadas, seleciona automaticamente a primeira
    if (empresas.length > 0 && !empresaSelecionada) {
      setEmpresaSelecionada(empresas[0].id);
    }
  }, [empresas]);

  // Não carregamos mais todos os produtos automaticamente
  // Os produtos serão carregados apenas quando o modal for aberto

  useEffect(() => {
    // Calcular o subtotal do pedido (soma dos itens)
    const subtotal = itensPedido.reduce((acc, item) => acc + item.valorTotal, 0);

    // Calcular o valor total considerando descontos e acréscimos
    const total = subtotal + valorAcrescimo - valorDesconto;
    setValorTotal(total > 0 ? total : 0); // Garantir que o total não seja negativo
  }, [itensPedido, valorDesconto, valorAcrescimo]);

  // Efeito para atualizar o objeto de desconto por prazo quando a seleção mudar
  useEffect(() => {
    if (descontoPrazoSelecionado) {
      const desconto = descontosPrazo.find(d => d.id === descontoPrazoSelecionado) || null;
      setDescontoPrazoObj(desconto);
    } else {
      setDescontoPrazoObj(null);
    }
  }, [descontoPrazoSelecionado, descontosPrazo]);

  // Efeito para atualizar o objeto de desconto por valor quando a seleção mudar
  useEffect(() => {
    if (descontoValorSelecionado) {
      const desconto = descontosValor.find(d => d.id === descontoValorSelecionado) || null;
      setDescontoValorObj(desconto);
    } else {
      setDescontoValorObj(null);
    }
  }, [descontoValorSelecionado, descontosValor]);

  // Efeito para calcular os valores de desconto e acréscimo
  useEffect(() => {
    // Calcular o subtotal (sem descontos/acréscimos)
    const subtotal = itensPedido.reduce((acc, item) => acc + item.valorTotal, 0);
    let novoValorDesconto = 0;
    let novoValorAcrescimo = 0;

    // Calcular desconto/acréscimo por prazo
    if (descontoPrazoObj) {
      const valor = subtotal * (descontoPrazoObj.percentual / 100);
      if (descontoPrazoObj.tipo === 'desconto') {
        novoValorDesconto += valor;
      } else {
        novoValorAcrescimo += valor;
      }
    }

    // Calcular desconto/acréscimo por valor
    if (descontoValorObj && subtotal >= descontoValorObj.valor_minimo) {
      const valor = subtotal * (descontoValorObj.percentual / 100);
      if (descontoValorObj.tipo === 'desconto') {
        novoValorDesconto += valor;
      } else {
        novoValorAcrescimo += valor;
      }
    }

    setValorDesconto(novoValorDesconto);
    setValorAcrescimo(novoValorAcrescimo);
  }, [itensPedido, descontoPrazoObj, descontoValorObj]);

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

  const handleAddItem = async () => {
    if (!produtoSelecionadoObj || quantidade <= 0) return;

    try {
      // Verificar se há estoque suficiente
      const temEstoqueSuficiente = await verificarEstoqueSuficiente(produtoSelecionadoObj.id, quantidade);
      if (!temEstoqueSuficiente) {
        return;
      }

      // Calcular preço considerando promoção e desconto por quantidade
      const { valorUnitario, temDesconto, valorOriginal, tipoDesconto } = calcularPrecoUnitario(produtoSelecionadoObj, quantidade);
      const valorTotal = valorUnitario * quantidade;

      const novoItem: ItemPedido = {
        id: Date.now().toString(), // ID temporário
        produto: produtoSelecionadoObj,
        quantidade,
        observacao,
        valorUnitario,
        valorTotal,
        valorOriginal,
        temDesconto,
        tipoDesconto
      };

      // Mostrar mensagem informativa sobre o desconto aplicado
      if (temDesconto) {
        if (tipoDesconto === 'quantidade') {
          const descontoInfo = produtoSelecionadoObj.tipo_desconto_quantidade === 'percentual'
            ? `${produtoSelecionadoObj.valor_desconto_quantidade}%`
            : formatarPreco(produtoSelecionadoObj.valor_desconto_quantidade || 0);

          showMessage('info', `Desconto por quantidade aplicado! (${descontoInfo}) - De ${formatarPreco(valorOriginal)} para ${formatarPreco(valorUnitario)} por unidade.`);
        } else if (tipoDesconto === 'promocao') {
          showMessage('info', `Produto em promoção! - De ${formatarPreco(valorOriginal)} para ${formatarPreco(valorUnitario)} por unidade.`);
        }
      }

      setItensPedido([...itensPedido, novoItem]);

      // Limpar campos
      setProdutoSelecionado('');
      setProdutoSelecionadoObj(null);
      setQuantidade(1);
      setQuantidadeVazia(false);
      setObservacao('');
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      showMessage('error', 'Erro ao adicionar item ao pedido');
    }
  };

  const handleRemoveItem = (id: string) => {
    setItensPedido(itensPedido.filter(item => item.id !== id));
  };

  const handleUpdateQuantidade = async (id: string, novaQuantidade: number) => {
    if (novaQuantidade <= 0) return;

    try {
      // Encontrar o item que está sendo atualizado
      const itemAtual = itensPedido.find(item => item.id === id);
      if (!itemAtual) return;

      // Se a nova quantidade é maior que a atual, verificar estoque
      if (novaQuantidade > itemAtual.quantidade) {
        // Verificar se há estoque suficiente
        const temEstoqueSuficiente = await verificarEstoqueSuficiente(
          itemAtual.produto.id,
          novaQuantidade,
          itemAtual.quantidade
        );

        if (!temEstoqueSuficiente) {
          return;
        }
      }

      // Atualizar a quantidade do item e recalcular o preço
      setItensPedido(itensPedido.map(item => {
        if (item.id === id) {
          // Recalcular o preço considerando promoção e desconto por quantidade
          const { valorUnitario, temDesconto, valorOriginal, tipoDesconto } = calcularPrecoUnitario(item.produto, novaQuantidade);
          const valorTotal = valorUnitario * novaQuantidade;

          // Verificar se o desconto mudou
          const descontoMudou = (item.temDesconto !== temDesconto) ||
                               (item.valorUnitario !== valorUnitario) ||
                               (item.tipoDesconto !== tipoDesconto);

          // Mostrar mensagem informativa se o desconto mudou
          if (descontoMudou) {
            if (temDesconto) {
              if (tipoDesconto === 'quantidade') {
                const descontoInfo = item.produto.tipo_desconto_quantidade === 'percentual'
                  ? `${item.produto.valor_desconto_quantidade}%`
                  : formatarPreco(item.produto.valor_desconto_quantidade || 0);

                showMessage('info', `Desconto por quantidade aplicado! (${descontoInfo}) - De ${formatarPreco(valorOriginal)} para ${formatarPreco(valorUnitario)} por unidade.`);
              } else if (tipoDesconto === 'promocao') {
                showMessage('info', `Produto em promoção! - De ${formatarPreco(valorOriginal)} para ${formatarPreco(valorUnitario)} por unidade.`);
              }
            } else if (item.temDesconto) {
              showMessage('info', `Desconto removido. Preço unitário: ${formatarPreco(valorUnitario)}`);
            }
          }

          return {
            ...item,
            quantidade: novaQuantidade,
            valorUnitario,
            valorTotal,
            valorOriginal,
            temDesconto,
            tipoDesconto
          };
        }
        return item;
      }));
    } catch (error) {
      console.error('Erro ao atualizar quantidade:', error);
      showMessage('error', 'Erro ao atualizar quantidade do item');
    }
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

  // Função para calcular o preço unitário considerando promoção e desconto por quantidade
  const calcularPrecoUnitario = (produto: Produto, quantidade: number): { valorUnitario: number, temDesconto: boolean, valorOriginal: number, tipoDesconto: string } => {
    let valorUnitario = produto.preco;
    let temDesconto = false;
    let tipoDesconto = '';
    const valorOriginal = produto.preco;

    // Verificar se o produto está em promoção
    if (produto.promocao && produto.valor_desconto) {
      if (produto.tipo_desconto === 'percentual') {
        valorUnitario = produto.preco * (1 - produto.valor_desconto / 100);
      } else {
        valorUnitario = produto.preco - produto.valor_desconto;
      }
      temDesconto = true;
      tipoDesconto = 'promocao';
    }

    // Verificar se a quantidade atinge o mínimo para desconto por quantidade
    if (produto.desconto_quantidade &&
        produto.quantidade_minima &&
        produto.valor_desconto_quantidade &&
        quantidade >= produto.quantidade_minima) {

      // Se já tem desconto de promoção, usar o menor valor entre os dois
      let valorComDescontoQuantidade = produto.preco;

      if (produto.tipo_desconto_quantidade === 'percentual') {
        valorComDescontoQuantidade = produto.preco * (1 - produto.valor_desconto_quantidade / 100);
      } else {
        valorComDescontoQuantidade = produto.preco - produto.valor_desconto_quantidade;
      }

      // Se o desconto por quantidade for maior que o desconto de promoção, usar o desconto por quantidade
      if (!temDesconto || valorComDescontoQuantidade < valorUnitario) {
        valorUnitario = valorComDescontoQuantidade;
        temDesconto = true;
        tipoDesconto = 'quantidade';
      }
    }

    return { valorUnitario, temDesconto, valorOriginal, tipoDesconto };
  };

  const formatarDocumento = (documento?: string, tipo?: 'CNPJ' | 'CPF') => {
    if (!documento) return '';

    if (tipo === 'CNPJ') {
      // Formato XX.XXX.XXX/XXXX-XX
      return documento.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    } else if (tipo === 'CPF') {
      // Formato XXX.XXX.XXX-XX
      return documento.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    }

    return documento;
  };

  const formatarCep = (cep?: string) => {
    if (!cep) return '';

    // Remove caracteres não numéricos
    const cepLimpo = cep.replace(/\D/g, '');

    // Formato XXXXX-XXX
    return cepLimpo.replace(/^(\d{5})(\d{3})$/, '$1-$2');
  };

  // Função para verificar se há estoque suficiente para um produto
  const verificarEstoqueSuficiente = async (produtoId: string, quantidade: number, quantidadeAtual: number = 0): Promise<boolean> => {
    try {
      // Verificar se a empresa controla estoque e se há estoque suficiente
      const { data: configData, error: configError } = await supabase
        .from('tipo_controle_estoque_config')
        .select('tipo_controle, bloqueia_sem_estoque')
        .eq('empresa_id', empresaSelecionada)
        .single();

      if (configError && configError.code !== 'PGRST116') {
        console.error('Erro ao verificar configuração de estoque:', configError);
        showMessage('error', 'Erro ao verificar configuração de estoque');
        return true; // Permitir continuar em caso de erro na verificação
      }

      // Se a empresa não bloqueia pedidos sem estoque suficiente, permitir continuar
      if (!configData?.bloqueia_sem_estoque) {
        return true;
      }

      // Se o tipo de controle for por faturamento, permitir continuar
      if (configData.tipo_controle !== 'pedidos') {
        return true;
      }

      // Buscar movimentações de estoque do produto
      const { data: movimentosData, error: movimentosError } = await supabase
        .from('produto_estoque')
        .select('tipo_movimento, quantidade')
        .eq('produto_id', produtoId)
        .eq('empresa_id', empresaSelecionada);

      if (movimentosError) {
        console.error('Erro ao verificar estoque do produto:', movimentosError);
        showMessage('error', 'Erro ao verificar estoque do produto');
        return true; // Permitir continuar em caso de erro na verificação
      }

      // Calcular o saldo total (entradas - saídas)
      let saldoTotal = 0;
      if (movimentosData) {
        movimentosData.forEach(movimento => {
          if (movimento.tipo_movimento === 'entrada') {
            saldoTotal += parseFloat(movimento.quantidade);
          } else {
            saldoTotal -= parseFloat(movimento.quantidade);
          }
        });
      }

      // Buscar itens de pedidos pendentes para este produto
      const { data: pedidosData, error: pedidosError } = await supabase
        .from('pedidos_itens')
        .select(`
          quantidade,
          pedido:pedido_id (
            status
          )
        `)
        .eq('produto_id', produtoId);

      if (pedidosError) {
        console.error('Erro ao verificar pedidos do produto:', pedidosError);
        showMessage('error', 'Erro ao verificar pedidos do produto');
        return true; // Permitir continuar em caso de erro na verificação
      }

      // Calcular a quantidade total de produtos em pedidos pendentes (não faturados)
      let quantidadeNaoFaturada = 0;

      if (pedidosData && pedidosData.length > 0) {
        pedidosData.forEach((item: any) => {
          // Verificar se o pedido está pendente (não faturado)
          if (item.pedido && item.pedido.status !== 'faturado') {
            quantidadeNaoFaturada += parseFloat(item.quantidade);
          }
        });
      }

      // Subtrair a quantidade atual do item para não contar duas vezes
      quantidadeNaoFaturada -= quantidadeAtual;

      // Verificar se há estoque suficiente
      const estoqueDisponivel = saldoTotal - quantidadeNaoFaturada;

      if (estoqueDisponivel < quantidade) {
        showMessage('error', `Estoque insuficiente. Disponível: ${estoqueDisponivel.toFixed(2)}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao verificar estoque:', error);
      showMessage('error', 'Erro ao verificar estoque do produto');
      return true; // Permitir continuar em caso de erro na verificação
    }
  };

  const handleProdutoSelect = (produto: Produto) => {
    setProdutoSelecionado(produto.id);
    setProdutoSelecionadoObj(produto);
  };

  // Função para carregar os descontos disponíveis para o cliente
  const loadFormasPagamento = async (clienteId: string, empresaId: string) => {
    try {
      setIsLoading(true);

      // Carregar descontos por prazo
      const { data: descontosPrazoData, error: descontosPrazoError } = await supabase
        .from('cliente_descontos_prazo')
        .select('id, prazo_dias, percentual, tipo')
        .eq('cliente_id', clienteId)
        .eq('empresa_id', empresaId)
        .order('prazo_dias');

      if (descontosPrazoError) {
        console.error('Erro ao carregar descontos por prazo:', descontosPrazoError);
      } else if (descontosPrazoData) {
        setDescontosPrazo(descontosPrazoData);

        // Limpar seleção anterior
        setDescontoPrazoSelecionado(null);
      }

      // Carregar descontos por valor
      const { data: descontosValorData, error: descontosValorError } = await supabase
        .from('cliente_descontos_valor')
        .select('id, valor_minimo, percentual, tipo')
        .eq('cliente_id', clienteId)
        .eq('empresa_id', empresaId)
        .order('valor_minimo');

      if (descontosValorError) {
        console.error('Erro ao carregar descontos por valor:', descontosValorError);
      } else if (descontosValorData) {
        setDescontosValor(descontosValorData);

        // Limpar seleção anterior
        setDescontoValorSelecionado(null);
      }
    } catch (error) {
      console.error('Erro ao carregar descontos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verificar se o botão que acionou o submit é o botão de finalizar pedido
    // Isso garante que a validação só ocorra quando o usuário tenta finalizar o pedido
    const target = e.target as HTMLFormElement;
    const submitButton = target.querySelector('button[type="submit"]');

    // Se o evento não foi acionado pelo botão de submit, não validar
    if (document.activeElement !== submitButton && e.type === 'submit') {
      return;
    }

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

      // Calcular o subtotal (soma dos itens sem descontos/acréscimos)
      const subtotal = itensPedido.reduce((acc, item) => acc + item.valorTotal, 0);

      // Criar pedido
      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .insert({
          empresa_id: empresaSelecionada,
          usuario_id: userData.user.id,
          cliente_id: clienteId || null, // Incluir ID do cliente se disponível
          cliente_nome: clienteNome,
          cliente_telefone: clienteTelefone.replace(/\D/g, ''),
          valor_subtotal: subtotal,
          valor_desconto: valorDesconto,
          valor_acrescimo: valorAcrescimo,
          valor_total: valorTotal,
          status: 'pendente',
          numero: numeroPedido,
          desconto_prazo_id: descontoPrazoSelecionado,
          desconto_valor_id: descontoValorSelecionado
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
          onClick={() => {
            // Navegar sem validação
            navigate('/user/pedidos');
          }}
          className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors"
          type="button" // Importante: tipo button para não acionar o submit do formulário
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

          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Cliente <span className="text-red-500">*</span>
            </label>
            <ClienteDropdown
              value={clienteId}
              onChange={(id, nome, telefone, data) => {
                setClienteId(id);
                setClienteNome(nome);
                setClienteTelefone(formatarTelefone(telefone));
                setClienteData(data);

                // Carregar formas de pagamento do cliente quando um cliente for selecionado
                if (id && empresaSelecionada) {
                  loadFormasPagamento(id, empresaSelecionada);
                }
              }}
              empresaId={empresaSelecionada}
              placeholder="Selecione ou busque um cliente"
              required={true}
            />
          </div>

          {/* Dados complementares do cliente (visíveis apenas quando um cliente é selecionado) */}
          {clienteId && clienteTelefone && (
            <div className="mt-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Dados do cliente</h3>
              <div className="space-y-2">
                {/* Telefone */}
                <div className="flex items-start gap-2">
                  <Phone size={16} className="text-gray-500 mt-0.5" />
                  <span className="text-sm text-gray-300">{clienteTelefone}</span>
                </div>

                {/* Documento */}
                {clienteData?.documento && (
                  <div className="flex items-start gap-2">
                    <FileText size={16} className="text-gray-500 mt-0.5" />
                    <span className="text-sm text-gray-300">
                      {clienteData.tipo_documento}: {formatarDocumento(clienteData.documento, clienteData.tipo_documento as 'CNPJ' | 'CPF')}
                    </span>
                  </div>
                )}

                {/* Endereço */}
                {clienteData?.endereco && (
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="text-gray-500 mt-0.5" />
                    <div className="text-sm text-gray-300">
                      <p>{clienteData.endereco}, {clienteData.numero || 'S/N'}{clienteData.complemento ? ` - ${clienteData.complemento}` : ''}</p>
                      {clienteData.bairro && <p>{clienteData.bairro}</p>}
                      {(clienteData.cidade || clienteData.estado) && (
                        <p>
                          {clienteData.cidade}
                          {clienteData.cidade && clienteData.estado ? ' - ' : ''}
                          {clienteData.estado}
                          {clienteData.cep ? ` - CEP: ${formatarCep(clienteData.cep)}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Adicionar itens */}
        <div className="bg-background-card rounded-lg border border-gray-800 p-4 space-y-4">
          <h2 className="text-lg font-medium text-white mb-2">Itens do Pedido</h2>

          {/* Produto */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Produto
            </label>

            {produtoSelecionadoObj ? (
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <h3 className="text-white font-medium">{produtoSelecionadoObj.nome}</h3>
                  <p className="text-sm text-gray-400">
                    {produtoSelecionadoObj.codigo} - {formatarPreco(produtoSelecionadoObj.preco)}
                  </p>
                  {produtoSelecionadoObj.desconto_quantidade && produtoSelecionadoObj.quantidade_minima && (
                    <p className="text-xs text-green-400 mt-1">
                      Desconto para {produtoSelecionadoObj.quantidade_minima}+ unidades:
                      {produtoSelecionadoObj.tipo_desconto_quantidade === 'percentual'
                        ? ` ${produtoSelecionadoObj.valor_desconto_quantidade}%`
                        : ` ${formatarPreco(produtoSelecionadoObj.valor_desconto_quantidade || 0)}`
                      }
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsProdutoModalOpen(true);
                  }}
                  className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
                >
                  <Search size={18} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsProdutoModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 bg-gray-800/50 border border-gray-700 rounded-lg py-3 px-4 text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                <Search size={18} />
                <span>Buscar produto</span>
              </button>
            )}

            {/* Modal de seleção de produto */}
            <ProdutoSeletorModal
              isOpen={isProdutoModalOpen}
              onClose={() => {
                // Fechar o modal sem acionar validações
                setIsProdutoModalOpen(false);
              }}
              onSelect={handleProdutoSelect}
              empresaId={empresaSelecionada}
            />
          </div>

          {/* Quantidade */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Quantidade
            </label>
            <div className="relative">
              <input
                type="text"
                value={quantidade === 0 && quantidadeVazia ? '' : quantidade}
                onChange={(e) => {
                  // Se o campo estiver vazio
                  if (e.target.value === '') {
                    setQuantidadeVazia(true);
                    setQuantidade(0);
                    return;
                  }

                  setQuantidadeVazia(false);

                  // Remover caracteres não numéricos
                  const valorLimpo = e.target.value.replace(/[^\d]/g, '');

                  // Se não for um número válido, não atualiza
                  if (isNaN(parseInt(valorLimpo))) {
                    return;
                  }

                  const valor = parseInt(valorLimpo);
                  setQuantidade(valor > 0 ? valor : 0);
                }}
                onBlur={() => {
                  // Se o campo estiver vazio ao perder o foco, define como 1
                  if (quantidadeVazia || quantidade === 0) {
                    setQuantidadeVazia(false);
                    setQuantidade(1);
                  }
                }}
                className={`w-full bg-gray-800/50 border ${
                  produtoSelecionadoObj?.desconto_quantidade &&
                  produtoSelecionadoObj?.quantidade_minima &&
                  quantidade >= produtoSelecionadoObj.quantidade_minima
                    ? 'border-green-500'
                    : 'border-gray-700'
                } rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20`}
                placeholder="1"
              />
              {produtoSelecionadoObj?.desconto_quantidade && produtoSelecionadoObj?.quantidade_minima && (
                <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-xs ${
                  quantidade >= produtoSelecionadoObj.quantidade_minima
                    ? 'text-green-400'
                    : 'text-gray-500'
                }`}>
                  {quantidade >= produtoSelecionadoObj.quantidade_minima
                    ? 'Desconto aplicado!'
                    : `Mín. ${produtoSelecionadoObj.quantidade_minima} para desconto`
                  }
                </div>
              )}
            </div>
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
            disabled={!produtoSelecionadoObj}
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
                      {item.temDesconto && item.valorOriginal ? (
                        <div>
                          <p className="text-sm">
                            <span className="text-gray-400 line-through">{formatarPreco(item.valorOriginal)}</span>
                            <span className="text-primary-400 ml-2">{formatarPreco(item.valorUnitario)}</span>
                            <span className="text-gray-400"> x {item.quantidade} = {formatarPreco(item.valorTotal)}</span>
                          </p>
                          <p className="text-xs text-green-400">
                            {item.tipoDesconto === 'quantidade' ? (
                              <>
                                Desconto por quantidade:
                                {item.produto.tipo_desconto_quantidade === 'percentual'
                                  ? ` ${item.produto.valor_desconto_quantidade}%`
                                  : ` ${formatarPreco(item.produto.valor_desconto_quantidade || 0)}`
                                }
                              </>
                            ) : (
                              'Produto em promoção'
                            )}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">
                          {formatarPreco(item.valorUnitario)} x {item.quantidade} = {formatarPreco(item.valorTotal)}
                        </p>
                      )}
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

              {/* Área de subtotais */}
              <div className="space-y-3 pt-4 border-t border-gray-700 mt-4">
                {/* Resumo do pedido */}
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <h3 className="text-white font-medium mb-2">Resumo do Pedido</h3>

                  <div className="space-y-2">
                    {/* Quantidade de itens */}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Quantidade de itens:</span>
                      <span className="text-white">{itensPedido.reduce((acc, item) => acc + item.quantidade, 0)}</span>
                    </div>

                    {/* Subtotal (soma dos itens) */}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Subtotal:</span>
                      <span className="text-white">{formatarPreco(itensPedido.reduce((acc, item) => acc + item.valorTotal, 0))}</span>
                    </div>

                    {/* Desconto (se houver) */}
                    {valorDesconto > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-green-400">Desconto:</span>
                        <span className="text-green-400">-{formatarPreco(valorDesconto)}</span>
                      </div>
                    )}

                    {/* Acréscimo (se houver) */}
                    {valorAcrescimo > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-red-400">Acréscimo:</span>
                        <span className="text-red-400">+{formatarPreco(valorAcrescimo)}</span>
                      </div>
                    )}

                    {/* Linha divisória */}
                    <div className="border-t border-gray-700 my-2"></div>

                    {/* Total */}
                    <div className="flex justify-between items-center">
                      <span className="text-white font-medium">Total:</span>
                      <span className="text-xl font-semibold text-primary-400">{formatarPreco(valorTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* Opções de descontos */}
                {clienteId && clienteData && (
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <h3 className="text-white font-medium mb-2">Opções de Faturamento</h3>

                    {/* Descontos por prazo */}
                    {descontosPrazo.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-sm text-gray-400 mb-2">Prazo de Faturamento</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {descontosPrazo.map((desconto) => {
                            const isSelected = descontoPrazoSelecionado === desconto.id;

                            // Definir cores com base no tipo (desconto ou acréscimo)
                            const isDesconto = desconto.tipo === 'desconto';
                            let bgColor = isSelected
                              ? (isDesconto ? 'bg-green-500/20' : 'bg-red-500/20')
                              : 'bg-gray-700/50';
                            let hoverColor = isSelected
                              ? (isDesconto ? 'hover:bg-green-500/30' : 'hover:bg-red-500/30')
                              : 'hover:bg-gray-700/70';
                            let textColor = isSelected
                              ? (isDesconto ? 'text-green-400' : 'text-red-400')
                              : 'text-gray-300';
                            let Icon = isDesconto ? DollarSign : Calendar;

                            return (
                              <button
                                key={desconto.id}
                                type="button"
                                onClick={() => {
                                  // Se já está selecionado, remover da seleção
                                  if (isSelected) {
                                    setDescontoPrazoSelecionado(null);
                                  } else {
                                    // Selecionar este desconto
                                    setDescontoPrazoSelecionado(desconto.id);
                                  }
                                }}
                                className={`flex items-center justify-between gap-2 ${bgColor} ${hoverColor} ${textColor} py-2 px-3 rounded-lg transition-colors text-sm`}
                              >
                                <div className="flex items-center gap-2">
                                  <Icon size={16} />
                                  <span>{desconto.prazo_dias} dias</span>
                                </div>
                                <span className={isDesconto ? 'text-green-400' : 'text-red-400'}>
                                  {isDesconto ? '-' : '+'}{desconto.percentual}%
                                </span>
                                {isSelected && (
                                  <span className="ml-1 bg-primary-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                                    ✓
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Descontos por valor */}
                    {descontosValor.length > 0 && (
                      <div>
                        <h4 className="text-sm text-gray-400 mb-2">Valor Mínimo</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {descontosValor.map((desconto) => {
                            const isSelected = descontoValorSelecionado === desconto.id;

                            // Definir cores com base no tipo (desconto ou acréscimo)
                            const isDesconto = desconto.tipo === 'desconto';
                            let bgColor = isSelected
                              ? (isDesconto ? 'bg-green-500/20' : 'bg-red-500/20')
                              : 'bg-gray-700/50';
                            let hoverColor = isSelected
                              ? (isDesconto ? 'hover:bg-green-500/30' : 'hover:bg-red-500/30')
                              : 'hover:bg-gray-700/70';
                            let textColor = isSelected
                              ? (isDesconto ? 'text-green-400' : 'text-red-400')
                              : 'text-gray-300';

                            return (
                              <button
                                key={desconto.id}
                                type="button"
                                onClick={() => {
                                  // Se já está selecionado, remover da seleção
                                  if (isSelected) {
                                    setDescontoValorSelecionado(null);
                                  } else {
                                    // Selecionar este desconto
                                    setDescontoValorSelecionado(desconto.id);
                                  }
                                }}
                                className={`flex items-center justify-between gap-2 ${bgColor} ${hoverColor} ${textColor} py-2 px-3 rounded-lg transition-colors text-sm`}
                              >
                                <div className="flex items-center gap-2">
                                  <DollarSign size={16} />
                                  <span>Min: {formatarPreco(desconto.valor_minimo)}</span>
                                </div>
                                <span className={isDesconto ? 'text-green-400' : 'text-red-400'}>
                                  {isDesconto ? '-' : '+'}{desconto.percentual}%
                                </span>
                                {isSelected && (
                                  <span className="ml-1 bg-primary-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                                    ✓
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Mensagem quando não há descontos */}
                    {descontosPrazo.length === 0 && descontosValor.length === 0 && (
                      <p className="text-gray-400 text-sm">Nenhuma condição de pagamento disponível para este cliente</p>
                    )}
                  </div>
                )}
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
