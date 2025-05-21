import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, User, Phone, Building, DollarSign, Save, Plus, Minus, Trash2, FileText, MapPin, Search, Calendar, Edit, CheckCircle, XCircle, Copy, Check, Share2, Link } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';
import ProdutoSeletorModal from '../../components/comum/ProdutoSeletorModal';
import { verificarTipoControleEstoque, atualizarEstoquePorPedido } from '../../utils/estoqueUtils';

interface Produto {
  id: string;
  nome: string;
  preco: number;
  codigo: string;
  descricao?: string;
  promocao?: boolean;
  tipo_desconto?: string;
  valor_desconto?: number;
  desconto_quantidade?: boolean;
  quantidade_minima?: number;
  tipo_desconto_quantidade?: 'percentual' | 'valor';
  valor_desconto_quantidade?: number;
  percentual_desconto_quantidade?: number;
  unidade_medida_id?: string;
  unidade_medida?: {
    id: string;
    sigla: string;
    nome: string;
  };
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

interface FormaPagamento {
  id: string;
  nome: string;
  tipo: string;
}

const EditarPedidoPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pedido, setPedido] = useState<any>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [empresaId, setEmpresaId] = useState<string>('');
  const [clienteId, setClienteId] = useState('');
  const [clienteData, setClienteData] = useState<any>(null);
  const [itensPedido, setItensPedido] = useState<ItemPedido[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<string>('');
  const [produtoSelecionadoObj, setProdutoSelecionadoObj] = useState<Produto | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [quantidadeVazia, setQuantidadeVazia] = useState(false);
  const [observacao, setObservacao] = useState('');
  const [valorTotal, setValorTotal] = useState(0);
  const [valorSubtotal, setValorSubtotal] = useState(0);
  const [valorDesconto, setValorDesconto] = useState(0);
  const [valorAcrescimo, setValorAcrescimo] = useState(0);
  const [isProdutoModalOpen, setIsProdutoModalOpen] = useState(false);
  const [descontosPrazo, setDescontosPrazo] = useState<DescontoPrazo[]>([]);
  const [descontosValor, setDescontosValor] = useState<DescontoValor[]>([]);
  const [descontoPrazoSelecionado, setDescontoPrazoSelecionado] = useState<string | null>(null);
  const [descontoValorSelecionado, setDescontoValorSelecionado] = useState<string | null>(null);
  const [descontoPrazoObj, setDescontoPrazoObj] = useState<DescontoPrazo | null>(null);
  const [descontoValorObj, setDescontoValorObj] = useState<DescontoValor | null>(null);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [formaPagamentoSelecionada, setFormaPagamentoSelecionada] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('pendente');
  const [dataFaturamento, setDataFaturamento] = useState<string | null>(null);
  const [copiedFields, setCopiedFields] = useState<{[key: string]: boolean}>({});
  const [showReverterModal, setShowReverterModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadPedido(id);
    }
  }, [id]);

  useEffect(() => {
    // Calcular o subtotal do pedido (soma dos itens)
    const subtotal = itensPedido.reduce((acc, item) => acc + item.valorTotal, 0);
    setValorSubtotal(subtotal);

    // Calcular o valor total considerando descontos e acréscimos
    const total = subtotal + valorAcrescimo - valorDesconto;
    setValorTotal(total > 0 ? total : 0); // Garantir que o total não seja negativo
  }, [itensPedido, valorDesconto, valorAcrescimo]);

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

  const loadPedido = async (pedidoId: string) => {
    try {
      setIsLoading(true);

      // Carregar dados do pedido
      const { data: pedidoData, error: pedidoError } = await supabase
        .from('pedidos')
        .select(`
          *,
          itens:pedidos_itens(
            *,
            produto:produtos(*)
          )
        `)
        .eq('id', pedidoId)
        .single();

      if (pedidoError) throw pedidoError;
      if (!pedidoData) throw new Error('Pedido não encontrado');

      setPedido(pedidoData);
      setEmpresaId(pedidoData.empresa_id);
      setClienteId(pedidoData.cliente_id || '');
      setStatus(pedidoData.status || 'pendente');
      setDataFaturamento(pedidoData.data_faturamento || null);
      setDescontoPrazoSelecionado(pedidoData.desconto_prazo_id || null);
      setDescontoValorSelecionado(pedidoData.desconto_valor_id || null);
      setFormaPagamentoSelecionada(pedidoData.forma_pagamento_id || null);

      // Formatar itens do pedido
      const itens = pedidoData.itens.map((item: any) => {
        // Verificar se o item tem desconto
        const valorOriginal = item.produto.preco;
        const temDesconto = item.valor_unitario < valorOriginal;

        // Determinar o tipo de desconto
        let tipoDesconto = '';
        if (temDesconto) {
          if (item.produto.desconto_quantidade &&
              item.produto.quantidade_minima &&
              item.quantidade >= item.produto.quantidade_minima) {
            tipoDesconto = 'quantidade';
          } else if (item.produto.promocao) {
            tipoDesconto = 'promocao';
          }
        }

        return {
          id: item.id,
          produto: item.produto,
          quantidade: item.quantidade,
          observacao: item.observacao || '',
          valorUnitario: item.valor_unitario,
          valorTotal: item.valor_total,
          valorOriginal: temDesconto ? valorOriginal : undefined,
          temDesconto,
          tipoDesconto
        };
      });

      setItensPedido(itens);

      // Carregar produtos da empresa
      await loadProdutos(pedidoData.empresa_id);

      // Carregar formas de pagamento
      await loadFormasPagamento(pedidoData.empresa_id);

      // Se tiver cliente_id, carregar descontos e dados do cliente
      if (pedidoData.cliente_id) {
        await loadDescontos(pedidoData.cliente_id, pedidoData.empresa_id);
        await loadClienteData(pedidoData.cliente_id);
      }
    } catch (error: any) {
      console.error('Erro ao carregar pedido:', error);
      toast.error('Erro ao carregar pedido: ' + error.message);
      navigate('/dashboard/faturamento');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProdutos = async (empresaId: string) => {
    try {
      // Obter produtos da empresa com todos os campos necessários
      const { data: produtosData } = await supabase
        .from('produtos')
        .select(`
          id,
          nome,
          preco,
          codigo,
          descricao,
          promocao,
          tipo_desconto,
          valor_desconto,
          desconto_quantidade,
          quantidade_minima,
          tipo_desconto_quantidade,
          valor_desconto_quantidade,
          unidade_medida_id,
          unidade_medida:unidade_medida_id (
            id,
            sigla,
            nome
          )
        `)
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .eq('deletado', false)
        .order('nome');

      if (produtosData) {
        setProdutos(produtosData);
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const loadFormasPagamento = async (empresaId: string) => {
    try {
      console.log('Iniciando carregamento de formas de pagamento...');

      // Consultar a tabela forma_pagamento_opcoes diretamente
      const { data: formasPagamentoData, error } = await supabase
        .from('forma_pagamento_opcoes')
        .select('id, nome, tipo, max_parcelas')
        .eq('ativo', true)
        .order('nome');

      if (error) {
        console.error('Erro ao carregar formas de pagamento:', error);
        toast.error('Erro ao carregar formas de pagamento');
        return;
      }

      if (formasPagamentoData && formasPagamentoData.length > 0) {
        console.log('Formas de pagamento carregadas com sucesso:', formasPagamentoData);
        setFormasPagamento(formasPagamentoData);
      } else {
        console.warn('Nenhuma forma de pagamento encontrada');
        toast.warning('Nenhuma forma de pagamento encontrada');
      }
    } catch (error) {
      console.error('Erro ao carregar formas de pagamento:', error);
      toast.error('Erro ao carregar formas de pagamento');
    }
  };

  const loadClienteData = async (clienteId: string) => {
    try {
      // Carregar dados completos do cliente
      // Os telefones estão armazenados como JSONB na tabela clientes
      // e os endereços estão como campos individuais na mesma tabela
      console.log('Carregando dados do cliente ID:', clienteId);

      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .single();

      if (clienteError) {
        console.error('Erro ao carregar dados do cliente:', clienteError);
        return;
      }

      if (clienteData) {
        console.log('Dados do cliente carregados:', clienteData);
        setClienteData(clienteData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do cliente:', error);
    }
  };

  const loadDescontos = async (clienteId: string, empresaId: string) => {
    try {
      // Carregar descontos por prazo
      const { data: descontosPrazoData } = await supabase
        .from('cliente_descontos_prazo')
        .select('id, prazo_dias, percentual, tipo')
        .eq('cliente_id', clienteId)
        .eq('empresa_id', empresaId)
        .order('prazo_dias');

      if (descontosPrazoData) {
        setDescontosPrazo(descontosPrazoData);

        // Se tiver desconto prazo selecionado, buscar o objeto
        if (descontoPrazoSelecionado) {
          const desconto = descontosPrazoData.find(d => d.id === descontoPrazoSelecionado);
          if (desconto) setDescontoPrazoObj(desconto);
        }
      }

      // Carregar descontos por valor
      const { data: descontosValorData } = await supabase
        .from('cliente_descontos_valor')
        .select('id, valor_minimo, percentual, tipo')
        .eq('cliente_id', clienteId)
        .eq('empresa_id', empresaId)
        .order('valor_minimo');

      if (descontosValorData) {
        setDescontosValor(descontosValorData);

        // Se tiver desconto valor selecionado, buscar o objeto
        if (descontoValorSelecionado) {
          const desconto = descontosValorData.find(d => d.id === descontoValorSelecionado);
          if (desconto) setDescontoValorObj(desconto);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar descontos:', error);
    }
  };

  const verificarEstoqueSuficiente = async (produtoId: string, quantidade: number, quantidadeAtual: number = 0) => {
    try {
      // Verificar configurações de estoque da empresa
      const { data: configData, error: configError } = await supabase
        .from('tipo_controle_estoque_config')
        .select('tipo_controle, bloqueia_sem_estoque')
        .eq('empresa_id', empresaId)
        .single();

      if (configError) {
        console.error('Erro ao verificar configurações de estoque:', configError);
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
        .eq('empresa_id', empresaId);

      if (movimentosError) {
        console.error('Erro ao verificar estoque do produto:', movimentosError);
        toast.error('Erro ao verificar estoque do produto');
        return true; // Permitir continuar em caso de erro na verificação
      }

      // Calcular saldo de estoque
      let saldoTotal = 0;
      if (movimentosData) {
        movimentosData.forEach((movimento: any) => {
          if (movimento.tipo_movimento === 'entrada') {
            saldoTotal += parseFloat(movimento.quantidade);
          } else if (movimento.tipo_movimento === 'saida' || movimento.tipo_movimento === 'faturado') {
            saldoTotal -= parseFloat(movimento.quantidade);
          }
        });
      }

      // Buscar itens de pedidos pendentes que usam este produto
      const { data: pedidosData, error: pedidosError } = await supabase
        .from('pedidos_itens')
        .select(`
          quantidade,
          pedido:pedidos(status)
        `)
        .eq('produto_id', produtoId)
        .eq('empresa_id', empresaId);

      if (pedidosError) {
        console.error('Erro ao verificar pedidos pendentes:', pedidosError);
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
        // Se a opção de bloqueio estiver ativada, impedir a operação
        if (configData?.bloqueia_sem_estoque) {
          toast.error(`Estoque insuficiente. Disponível: ${estoqueDisponivel.toFixed(2)}`);
          return false;
        } else {
          // Se a opção de bloqueio estiver desativada, apenas mostrar um aviso
          toast.warning(`Estoque insuficiente (${estoqueDisponivel.toFixed(2)}), mas a operação será permitida. O estoque ficará negativo.`);
          return true;
        }
      }

      return true;
    } catch (error) {
      console.error('Erro ao verificar estoque:', error);
      return true; // Permitir continuar em caso de erro na verificação
    }
  };

  const calcularPrecoUnitario = (produto: Produto, quantidade: number) => {
    // Valor padrão
    let valorUnitario = produto.preco;
    let temDesconto = false;
    let valorOriginal = produto.preco;
    let tipoDesconto = '';

    // Verificar se o produto tem desconto por quantidade
    if (produto.desconto_quantidade && produto.quantidade_minima && quantidade >= produto.quantidade_minima) {
      temDesconto = true;
      tipoDesconto = produto.tipo_desconto_quantidade || '';

      if (produto.tipo_desconto_quantidade === 'percentual' && produto.percentual_desconto_quantidade) {
        // Desconto percentual
        valorUnitario = valorOriginal * (1 - produto.percentual_desconto_quantidade / 100);
      } else if (produto.tipo_desconto_quantidade === 'valor' && produto.valor_desconto_quantidade) {
        // Desconto em valor fixo
        valorUnitario = valorOriginal - produto.valor_desconto_quantidade;
      }
    }
    // Verificar se o produto está em promoção
    else if (produto.promocao) {
      temDesconto = true;
      tipoDesconto = produto.tipo_desconto || '';

      if (produto.tipo_desconto === 'percentual' && produto.valor_desconto) {
        // Desconto percentual
        valorUnitario = valorOriginal * (1 - produto.valor_desconto / 100);
      } else if (produto.tipo_desconto === 'valor' && produto.valor_desconto) {
        // Desconto em valor fixo
        valorUnitario = valorOriginal - produto.valor_desconto;
      }
    }

    return {
      valorUnitario: Math.max(valorUnitario, 0), // Garantir que o valor não seja negativo
      temDesconto,
      valorOriginal,
      tipoDesconto
    };
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

      setItensPedido([...itensPedido, novoItem]);

      // Limpar campos
      setProdutoSelecionado('');
      setProdutoSelecionadoObj(null);
      setQuantidade(1);
      setQuantidadeVazia(false);
      setObservacao('');
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      toast.error('Erro ao adicionar item ao pedido');
    }
  };

  const handleRemoveItem = (id: string) => {
    setItensPedido(itensPedido.filter(item => item.id !== id));
  };

  const formatarPreco = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
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

      // Atualizar a quantidade e recalcular o valor total
      setItensPedido(itensPedido.map(item => {
        if (item.id === id) {
          // Calcular preço considerando promoção e desconto por quantidade
          const { valorUnitario, temDesconto, valorOriginal, tipoDesconto } = calcularPrecoUnitario(item.produto, novaQuantidade);
          const valorTotal = valorUnitario * novaQuantidade;

          // Mostrar mensagem se o preço unitário mudou devido a desconto por quantidade
          if (item.valorUnitario !== valorUnitario) {
            if (valorUnitario < item.valorUnitario) {
              toast.info(`Desconto aplicado! Preço unitário: ${formatarPreco(valorUnitario)}`);
            } else if (item.temDesconto) {
              toast.info(`Desconto removido. Preço unitário: ${formatarPreco(valorUnitario)}`);
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
      toast.error('Erro ao atualizar quantidade do item');
    }
  };

  const handleSalvarPedido = async () => {
    if (itensPedido.length === 0) {
      toast.error('Adicione pelo menos um item ao pedido');
      return;
    }

    try {
      setIsSaving(true);

      // Calcular o subtotal (soma dos itens sem descontos/acréscimos)
      const subtotal = itensPedido.reduce((acc, item) => acc + item.valorTotal, 0);

      // Atualizar o pedido (mantendo o status atual e usando apenas cliente_id)
      const { error: pedidoError } = await supabase
        .from('pedidos')
        .update({
          // Mantemos apenas o cliente_id, não mais os campos cliente_nome e cliente_telefone
          valor_subtotal: subtotal,
          valor_desconto: valorDesconto,
          valor_acrescimo: valorAcrescimo,
          valor_total: valorTotal,
          status: status, // Manter o status atual
          desconto_prazo_id: descontoPrazoSelecionado,
          desconto_valor_id: descontoValorSelecionado,
          forma_pagamento_id: formaPagamentoSelecionada
        })
        .eq('id', id);

      if (pedidoError) throw pedidoError;

      // Remover todos os itens existentes
      const { error: deleteError } = await supabase
        .from('pedidos_itens')
        .delete()
        .eq('pedido_id', id);

      if (deleteError) throw deleteError;

      // Inserir os novos itens
      const itensPedidoData = itensPedido.map(item => ({
        pedido_id: id,
        produto_id: item.produto.id,
        quantidade: item.quantidade,
        valor_unitario: item.valorUnitario,
        valor_total: item.valorTotal,
        observacao: item.observacao,
        empresa_id: empresaId
      }));

      const { error: itensError } = await supabase
        .from('pedidos_itens')
        .insert(itensPedidoData);

      if (itensError) throw itensError;

      toast.success('Pedido atualizado com sucesso!');
      navigate('/dashboard/faturamento');
    } catch (error: any) {
      console.error('Erro ao atualizar pedido:', error);
      toast.error('Erro ao atualizar pedido: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFaturarPedido = async () => {
    if (itensPedido.length === 0) {
      toast.error('Adicione pelo menos um item ao pedido');
      return;
    }

    try {
      setIsSaving(true);

      // Calcular o subtotal (soma dos itens sem descontos/acréscimos)
      const subtotal = itensPedido.reduce((acc, item) => acc + item.valorTotal, 0);
      const dataFaturamento = new Date().toISOString();

      // Atualizar o pedido para status 'faturado' e adicionar data de faturamento
      const { error: pedidoError } = await supabase
        .from('pedidos')
        .update({
          valor_subtotal: subtotal,
          valor_desconto: valorDesconto,
          valor_acrescimo: valorAcrescimo,
          valor_total: valorTotal,
          status: 'faturado',
          data_faturamento: dataFaturamento,
          desconto_prazo_id: descontoPrazoSelecionado,
          desconto_valor_id: descontoValorSelecionado,
          forma_pagamento_id: formaPagamentoSelecionada
        })
        .eq('id', id);

      if (pedidoError) throw pedidoError;

      // Remover todos os itens existentes
      const { error: deleteError } = await supabase
        .from('pedidos_itens')
        .delete()
        .eq('pedido_id', id);

      if (deleteError) throw deleteError;

      // Inserir os novos itens
      const itensPedidoData = itensPedido.map(item => ({
        pedido_id: id,
        produto_id: item.produto.id,
        quantidade: item.quantidade,
        valor_unitario: item.valorUnitario,
        valor_total: item.valorTotal,
        observacao: item.observacao,
        empresa_id: empresaId
      }));

      const { error: itensError } = await supabase
        .from('pedidos_itens')
        .insert(itensPedidoData);

      if (itensError) throw itensError;

      // Obter o usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      // Verificar o tipo de controle de estoque configurado
      const tipoControle = await verificarTipoControleEstoque(supabase, empresaId);

      // Se o tipo de controle for por faturamento, atualizar o estoque agora
      if (tipoControle === 'faturamento') {
        const resultado = await atualizarEstoquePorPedido(
          supabase,
          id,
          empresaId,
          userData.user.id,
          'saida',
          'faturamento'
        );

        if (!resultado.success) {
          console.warn('Aviso ao atualizar estoque:', resultado.message);
          toast.warning(resultado.message);
        }
      }

      toast.success('Pedido faturado com sucesso!');
      navigate('/dashboard/faturamento');
    } catch (error: any) {
      console.error('Erro ao faturar pedido:', error);
      toast.error('Erro ao faturar pedido: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelarPedido = async () => {
    if (!confirm('Tem certeza que deseja cancelar este pedido?')) {
      return;
    }

    try {
      setIsSaving(true);

      // Atualizar o status do pedido para 'cancelado'
      const { error } = await supabase
        .from('pedidos')
        .update({
          status: 'cancelado',
          data_faturamento: null // Remover data de faturamento se existir
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Pedido cancelado com sucesso!');
      navigate('/dashboard/faturamento');
    } catch (error: any) {
      console.error('Erro ao cancelar pedido:', error);
      toast.error('Erro ao cancelar pedido: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReverterParaPendente = () => {
    // Abrir o modal de confirmação
    setShowReverterModal(true);
  };

  const confirmarReverterParaPendente = async () => {
    try {
      setIsSaving(true);

      // Atualizar o status do pedido para 'pendente' e remover data de faturamento
      const { error } = await supabase
        .from('pedidos')
        .update({
          status: 'pendente',
          data_faturamento: null
        })
        .eq('id', id);

      if (error) throw error;

      // Atualizar o estado local
      setStatus('pendente');
      setDataFaturamento(null);

      // Fechar o modal
      setShowReverterModal(false);

      toast.success('Pedido revertido para pendente com sucesso!');
    } catch (error: any) {
      console.error('Erro ao reverter pedido:', error);
      toast.error('Erro ao reverter pedido: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };



  const handleCopyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Marcar o campo como copiado
      setCopiedFields(prev => ({...prev, [fieldId]: true}));

      // Após 2 segundos, remover a marca de copiado
      setTimeout(() => {
        setCopiedFields(prev => ({...prev, [fieldId]: false}));
      }, 2000);

      toast.success('Texto copiado!', {
        position: "top-center",
        autoClose: 1500,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: true,
      });
    }).catch(err => {
      console.error('Erro ao copiar texto: ', err);
      toast.error('Erro ao copiar texto');
    });
  };

  // Função para gerar o link público do pedido
  const gerarLinkPedido = async () => {
    try {
      if (!pedido) return null;

      // Buscar o CNPJ da empresa
      const { data: empresaData, error: empresaError } = await supabase
        .from('empresas')
        .select('documento')
        .eq('id', pedido.empresa_id)
        .single();

      if (empresaError || !empresaData || !empresaData.documento) {
        throw new Error('Não foi possível obter o CNPJ da empresa');
      }

      // Remover caracteres não numéricos do CNPJ (pontos, traços, barras)
      const cnpjLimpo = empresaData.documento.replace(/[^\d]/g, '');

      // Gerar o código do pedido (CNPJ + número do pedido)
      const codigoPedido = `${cnpjLimpo}${pedido.numero}`;

      // Gerar a URL completa
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/pedido/${codigoPedido}`;

      return url;
    } catch (error: any) {
      console.error('Erro ao gerar link do pedido:', error);
      toast.error(`Erro ao gerar link: ${error.message}`);
      return null;
    }
  };

  // Função para copiar o link para a área de transferência
  const copiarLinkPedido = async () => {
    const url = await gerarLinkPedido();

    if (url) {
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link do pedido copiado para a área de transferência!', {
          position: "top-center",
          autoClose: 1500,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: false,
          draggable: true,
        });
      } catch (error) {
        console.error('Erro ao copiar link:', error);
        toast.error('Não foi possível copiar o link');
      }
    }
  };

  const formatarTelefone = (telefone: string, tipo?: string) => {
    if (!telefone) return '';

    // Remover todos os caracteres não numéricos
    const numeroLimpo = telefone.replace(/\D/g, '');

    // Verificar se é celular (9 dígitos) ou fixo (8 dígitos)
    if (numeroLimpo.length === 11 || (tipo && tipo.toLowerCase() === 'celular')) {
      // Formato para celular: (XX) X XXXX-XXXX
      return numeroLimpo.replace(/^(\d{2})(\d)(\d{4})(\d{4})$/, '($1) $2 $3-$4');
    } else if (numeroLimpo.length === 10 || (tipo && tipo.toLowerCase() === 'fixo')) {
      // Formato para telefone fixo: (XX) XXXX-XXXX
      return numeroLimpo.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    }

    // Se não se encaixar em nenhum padrão, retornar como está
    return telefone;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => navigate('/dashboard/faturamento')}
            className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-2xl font-semibold text-white">Carregando pedido...</h1>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="p-4 bg-background-card rounded-lg border border-gray-800">
              <div className="h-6 w-40 bg-gray-700 rounded animate-pulse mb-3"></div>
              <div className="h-4 w-60 bg-gray-700 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-32 bg-gray-700 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard/faturamento')}
            className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-2xl font-semibold text-white">Editar Pedido #{pedido?.numero}</h1>
        </div>
        <div className="flex gap-2">
          {dataFaturamento ? (
            <>
              {/* Botão para reverter para pendente quando estiver faturado */}
              <button
                onClick={handleReverterParaPendente}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <ArrowLeft size={18} />
                <span>Reverter para Pendente</span>
              </button>
            </>
          ) : (
            <>
              {/* Botão de Salvar - apenas visível quando não estiver faturado */}
              <button
                onClick={handleSalvarPedido}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>Salvar Alterações</span>
                  </>
                )}
              </button>

              {/* Botão de Faturar - apenas visível quando não estiver faturado */}
              <button
                onClick={handleFaturarPedido}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <DollarSign size={18} />
                <span>Faturar</span>
              </button>

              {/* Botão de Cancelar - apenas visível quando não estiver faturado */}
              <button
                onClick={handleCancelarPedido}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <XCircle size={18} />
                <span>Cancelar</span>
              </button>
            </>
          )}

          {/* Botão para abrir o pedido em uma nova página - sempre visível */}
          <button
            onClick={async () => {
              const url = await gerarLinkPedido();
              if (url) {
                window.open(url, '_blank');
              }
            }}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            title="Abrir nota de pedido em nova página"
          >
            <FileText size={18} />
            <span>Abrir Nota</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Dados do cliente */}
          <div className="bg-background-card rounded-lg border border-gray-800 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Dados do Cliente</h2>

            {clienteData ? (
              <div className="space-y-4">
                {/* Informações básicas */}
                <div className="bg-gray-800/30 p-4 rounded-lg">
                  <h3 className="text-white font-medium mb-2">Informações Básicas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                    <div>
                      <p className="text-gray-400 text-sm">Nome</p>
                      <div className="flex items-center">
                        <p className="text-white">{clienteData.nome}</p>
                        <button
                          onClick={() => handleCopyToClipboard(clienteData.nome, 'nome')}
                          className="ml-2 p-1 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white"
                          title="Copiar nome"
                        >
                          {copiedFields['nome'] ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    {clienteData.email && (
                      <div>
                        <p className="text-gray-400 text-sm">Email</p>
                        <div className="flex items-center">
                          <p className="text-white">{clienteData.email}</p>
                          <button
                            onClick={() => handleCopyToClipboard(clienteData.email, 'email')}
                            className="ml-2 p-1 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white"
                            title="Copiar email"
                          >
                            {copiedFields['email'] ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                    )}

                    {clienteData.documento && (
                      <div>
                        <p className="text-gray-400 text-sm">
                          {clienteData.tipo_documento === 'CNPJ' ? 'CNPJ' : 'CPF'}
                        </p>
                        <div className="flex items-center">
                          <p className="text-white">
                            {clienteData.tipo_documento === 'CNPJ'
                              ? clienteData.documento.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
                              : clienteData.documento.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')}
                          </p>
                          <button
                            onClick={() => handleCopyToClipboard(
                              clienteData.tipo_documento === 'CNPJ'
                                ? clienteData.documento.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
                                : clienteData.documento.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4'),
                              'documento'
                            )}
                            className="ml-2 p-1 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white"
                            title="Copiar documento"
                          >
                            {copiedFields['documento'] ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                    )}

                    {clienteData.tipo_documento === 'CNPJ' && clienteData.razao_social && (
                      <div>
                        <p className="text-gray-400 text-sm">Razão Social</p>
                        <div className="flex items-center">
                          <p className="text-white">{clienteData.razao_social}</p>
                          <button
                            onClick={() => handleCopyToClipboard(clienteData.razao_social, 'razao_social')}
                            className="ml-2 p-1 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white"
                            title="Copiar razão social"
                          >
                            {copiedFields['razao_social'] ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                    )}

                    {clienteData.nome_fantasia && (
                      <div>
                        <p className="text-gray-400 text-sm">Nome Fantasia</p>
                        <div className="flex items-center">
                          <p className="text-white">{clienteData.nome_fantasia}</p>
                          <button
                            onClick={() => handleCopyToClipboard(clienteData.nome_fantasia, 'nome_fantasia')}
                            className="ml-2 p-1 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white"
                            title="Copiar nome fantasia"
                          >
                            {copiedFields['nome_fantasia'] ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Telefones */}
                <div className="bg-gray-800/30 p-4 rounded-lg">
                  <h3 className="text-white font-medium mb-2">Telefones</h3>
                  {clienteData.telefones && Array.isArray(clienteData.telefones) && clienteData.telefones.length > 0 ? (
                    <div className="space-y-2">
                      {clienteData.telefones.map((telefone: any, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${telefone.whatsapp ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                          <p className="text-white">
                            {formatarTelefone(telefone.numero, telefone.tipo)}
                            <span className="text-gray-400 text-sm ml-2">
                              ({telefone.tipo === 'celular' ? 'Celular' : 'Fixo'}
                              {telefone.whatsapp ? ' - WhatsApp' : ''})
                            </span>
                          </p>
                          <button
                            onClick={() => handleCopyToClipboard(telefone.numero, `telefone_${index}`)}
                            className="ml-2 p-1 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white"
                            title="Copiar telefone"
                          >
                            {copiedFields[`telefone_${index}`] ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : clienteData.telefone ? (
                    <div className="flex items-center">
                      <p className="text-white">{formatarTelefone(clienteData.telefone)}</p>
                      <button
                        onClick={() => handleCopyToClipboard(clienteData.telefone, 'telefone')}
                        className="ml-2 p-1 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white"
                        title="Copiar telefone"
                      >
                        {copiedFields['telefone'] ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-400">Nenhum telefone cadastrado</p>
                  )}
                </div>

                {/* Endereço */}
                <div className="bg-gray-800/30 p-4 rounded-lg">
                  <h3 className="text-white font-medium mb-2">Endereço</h3>
                  {clienteData.endereco ? (
                    <div>
                      <div className="flex items-center">
                        <p className="text-white">
                          {clienteData.endereco}
                          {clienteData.numero ? `, ${clienteData.numero}` : ''}
                          {clienteData.complemento ? `, ${clienteData.complemento}` : ''}
                        </p>
                        <button
                          onClick={() => handleCopyToClipboard(
                            `${clienteData.endereco}${clienteData.numero ? `, ${clienteData.numero}` : ''}${clienteData.complemento ? `, ${clienteData.complemento}` : ''}`,
                            'endereco_completo'
                          )}
                          className="ml-2 p-1 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white"
                          title="Copiar endereço"
                        >
                          {copiedFields['endereco_completo'] ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                      <div className="flex items-center">
                        <p className="text-gray-400 text-sm">
                          {clienteData.bairro ? `${clienteData.bairro} - ` : ''}
                          {clienteData.cidade || ''}
                          {clienteData.estado ? `/${clienteData.estado}` : ''}
                        </p>
                        <button
                          onClick={() => handleCopyToClipboard(
                            `${clienteData.bairro ? `${clienteData.bairro} - ` : ''}${clienteData.cidade || ''}${clienteData.estado ? `/${clienteData.estado}` : ''}`,
                            'bairro_cidade'
                          )}
                          className="ml-2 p-1 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white"
                          title="Copiar bairro/cidade"
                        >
                          {copiedFields['bairro_cidade'] ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                      {clienteData.cep && (
                        <div className="flex items-center">
                          <p className="text-gray-400 text-sm">
                            CEP: {clienteData.cep.replace(/^(\d{5})(\d{3})$/, '$1-$2')}
                          </p>
                          <button
                            onClick={() => handleCopyToClipboard(
                              clienteData.cep.replace(/^(\d{5})(\d{3})$/, '$1-$2'),
                              'cep'
                            )}
                            className="ml-2 p-1 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white"
                            title="Copiar CEP"
                          >
                            {copiedFields['cep'] ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-400">Nenhum endereço cadastrado</p>
                  )}
                </div>


              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-400">Carregando dados do cliente...</p>
              </div>
            )}
          </div>

          {/* Status do pedido */}
          <div className="bg-background-card rounded-lg border border-gray-800 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Status do Pedido</h2>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Status
              </label>
              <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white">
                {status === 'pendente' && 'Pendente'}
                {status === 'confirmado' && 'Confirmado'}
                {status === 'em_preparo' && 'Em Preparo'}
                {status === 'em_entrega' && 'Em Entrega'}
                {status === 'entregue' && 'Entregue'}
                {status === 'cancelado' && 'Cancelado'}
              </div>
            </div>
          </div>

          {/* Itens do pedido */}
          <div className="bg-background-card rounded-lg border border-gray-800 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Itens do Pedido</h2>

            {/* Lista de itens */}
            {itensPedido.length === 0 ? (
              <div className="text-center py-6 bg-gray-800/30 rounded-lg">
                <p className="text-gray-400">Nenhum item no pedido</p>
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                {itensPedido.map((item) => (
                  <div key={item.id} className="p-4 bg-gray-800/30 rounded-lg">
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
                                    ? ` ${item.produto.percentual_desconto_quantidade}%`
                                    : ` ${formatarPreco(item.produto.valor_desconto_quantidade || 0)}`
                                  }
                                </>
                              ) : (
                                'Produto em promoção'
                              )}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-primary-400">
                            {formatarPreco(item.valorUnitario)} x {item.quantidade} = {formatarPreco(item.valorTotal)}
                          </p>
                        )}
                        {item.observacao && (
                          <p className="text-xs text-gray-400 mt-1">Obs: {item.observacao}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        {dataFaturamento ? (
                          <span className="px-3 py-1 bg-gray-800 text-white">{item.quantidade}</span>
                        ) : (
                          <div className="flex items-center">
                            <button
                              onClick={() => handleUpdateQuantidade(item.id, item.quantidade - 1)}
                              className="p-1 rounded-l-lg bg-gray-700 text-gray-300 hover:bg-gray-600"
                            >
                              <Minus size={16} />
                            </button>
                            <span className="px-3 py-1 bg-gray-800 text-white">{item.quantidade}</span>
                            <button
                              onClick={() => handleUpdateQuantidade(item.id, item.quantidade + 1)}
                              className="p-1 rounded-r-lg bg-gray-700 text-gray-300 hover:bg-gray-600"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        )}
                        {!dataFaturamento && (
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-2 ml-6 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
                            title="Remover item"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end mt-2">
                      <p className="text-primary-400 font-medium">{formatarPreco(item.valorTotal)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Adicionar novo item - apenas visível quando não estiver faturado */}
            {!dataFaturamento && (
              <div className="bg-gray-800/30 rounded-lg p-4">
                <h3 className="text-white font-medium mb-3">Adicionar Item</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Produto
                    </label>
                    <button
                      onClick={() => setIsProdutoModalOpen(true)}
                      className="w-full flex items-center justify-between bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                    >
                      <span className={produtoSelecionadoObj ? 'text-white' : 'text-gray-500'}>
                        {produtoSelecionadoObj ? produtoSelecionadoObj.nome : 'Selecione um produto'}
                      </span>
                      <Search size={18} className="text-gray-500" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
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
                      {produtoSelecionadoObj && produtoSelecionadoObj.desconto_quantidade && produtoSelecionadoObj.quantidade_minima && (
                        <div className="mt-1 text-xs text-green-400">
                          {produtoSelecionadoObj.tipo_desconto_quantidade === 'percentual' ? (
                            <span>Desconto para {produtoSelecionadoObj.quantidade_minima}+ unidades: {produtoSelecionadoObj.percentual_desconto_quantidade}%</span>
                          ) : (
                            <span>Desconto para {produtoSelecionadoObj.quantidade_minima}+ unidades: {formatarPreco(produtoSelecionadoObj.valor_desconto_quantidade || 0)}</span>
                          )}
                        </div>
                      )}
                      {produtoSelecionadoObj && produtoSelecionadoObj.quantidade_minima && quantidade < produtoSelecionadoObj.quantidade_minima && (
                        <div className="mt-1 text-xs text-gray-400">
                          Min. {produtoSelecionadoObj.quantidade_minima} para desconto
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Observação
                      </label>
                      <input
                        type="text"
                        value={observacao}
                        onChange={(e) => setObservacao(e.target.value)}
                        placeholder="Opcional"
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleAddItem}
                    disabled={!produtoSelecionadoObj}
                    className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={18} />
                    <span>Adicionar Item</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Resumo do pedido */}
          <div className="bg-background-card rounded-lg border border-gray-800 p-6 sticky top-6">
            <h2 className="text-xl font-semibold text-white mb-4">Resumo do Pedido</h2>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Subtotal:</span>
                <span className="text-white">{formatarPreco(valorSubtotal)}</span>
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

            {/* Formas de pagamento */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Forma de Pagamento
              </label>
              {dataFaturamento ? (
                <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white">
                  {formasPagamento.find(f => f.id === formaPagamentoSelecionada)?.nome || 'Não especificada'}
                </div>
              ) : (
                <select
                  value={formaPagamentoSelecionada || ''}
                  onChange={(e) => setFormaPagamentoSelecionada(e.target.value || null)}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                >
                  <option value="">Selecione</option>
                  {formasPagamento.map(forma => (
                    <option key={forma.id} value={forma.id}>{forma.nome}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Descontos por prazo */}
            {descontosPrazo.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Desconto por Prazo
                </label>
                {dataFaturamento ? (
                  <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white">
                    {descontoPrazoObj ?
                      `${descontoPrazoObj.prazo_dias} dias - ${descontoPrazoObj.percentual}% de ${descontoPrazoObj.tipo === 'desconto' ? 'desconto' : 'acréscimo'}` :
                      'Nenhum'
                    }
                  </div>
                ) : (
                  <select
                    value={descontoPrazoSelecionado || ''}
                    onChange={(e) => {
                      const id = e.target.value || null;
                      setDescontoPrazoSelecionado(id);
                      setDescontoPrazoObj(id ? descontosPrazo.find(d => d.id === id) || null : null);
                    }}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                  >
                    <option value="">Nenhum</option>
                    {descontosPrazo.map(desconto => (
                      <option key={desconto.id} value={desconto.id}>
                        {desconto.prazo_dias} dias - {desconto.percentual}% de {desconto.tipo === 'desconto' ? 'desconto' : 'acréscimo'}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Descontos por valor */}
            {descontosValor.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Desconto por Valor
                </label>
                {dataFaturamento ? (
                  <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white">
                    {descontoValorObj ?
                      `${formatarPreco(descontoValorObj.valor_minimo)} - ${descontoValorObj.percentual}% de ${descontoValorObj.tipo === 'desconto' ? 'desconto' : 'acréscimo'}` :
                      'Nenhum'
                    }
                  </div>
                ) : (
                  <select
                    value={descontoValorSelecionado || ''}
                    onChange={(e) => {
                      const id = e.target.value || null;
                      setDescontoValorSelecionado(id);
                      setDescontoValorObj(id ? descontosValor.find(d => d.id === id) || null : null);
                    }}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                  >
                    <option value="">Nenhum</option>
                    {descontosValor.map(desconto => (
                      <option key={desconto.id} value={desconto.id}>
                        {formatarPreco(desconto.valor_minimo)} - {desconto.percentual}% de {desconto.tipo === 'desconto' ? 'desconto' : 'acréscimo'}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de seleção de produto */}
      {isProdutoModalOpen && (
        <ProdutoSeletorModal
          isOpen={isProdutoModalOpen}
          onClose={() => setIsProdutoModalOpen(false)}
          onSelect={(produto) => {
            setProdutoSelecionado(produto.id);
            setProdutoSelecionadoObj(produto);
            setIsProdutoModalOpen(false);
          }}
          empresaId={empresaId}
        />
      )}

      {/* Modal de confirmação para reverter pedido faturado */}
      {showReverterModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div
            className="bg-background-card rounded-lg p-6 w-full max-w-md border border-gray-700 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center mb-4 text-yellow-500">
              <AlertTriangle size={24} className="mr-2" />
              <h2 className="text-xl font-semibold">Reverter para Pendente</h2>
            </div>

            <div className="mb-6">
              <p className="text-white mb-2">
                Tem certeza que deseja reverter este pedido para pendente?
              </p>
              <p className="text-gray-400 text-sm">
                Esta ação removerá o status de faturado e permitirá a edição do pedido.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowReverterModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarReverterParaPendente}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <ArrowLeft size={18} />
                    <span>Confirmar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditarPedidoPage;
