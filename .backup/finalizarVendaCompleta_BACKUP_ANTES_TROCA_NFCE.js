// ✅ BACKUP DA FUNÇÃO finalizarVendaCompleta ANTES DA IMPLEMENTAÇÃO DE TROCA COM NFC-E
// Data: 2025-01-31
// Motivo: Backup de segurança antes de implementar NFC-e para vendas com valor zero (trocas)
// 
// Esta função estava funcionando corretamente para:
// - Vendas normais com NFC-e
// - Vendas com valor zero (trocas) SEM NFC-e
// - Todas as validações e fluxos existentes
//
// IMPORTANTE: Esta é a versão funcional que deve ser restaurada em caso de problemas

// Função principal para finalizar e salvar a venda
// ✅ FUNÇÃO FUNCIONAL RESTAURADA (backup do commit funcionando)
const finalizarVendaCompleta = async (tipoFinalizacao: string = 'finalizar_sem_impressao') => {
  if (carrinho.length === 0) {
    toast.error('Carrinho vazio! Adicione itens antes de finalizar.');
    return;
  }

  // Abrir modal de processamento
  setShowProcessandoVenda(true);
  setEtapaProcessamento('Iniciando processamento da venda...');
  setVendaProcessadaId(null);
  setNumeroVendaProcessada('');
  setStatusProcessamento('processando');
  setErroProcessamento('');
  setNumeroDocumentoReservado(null); // ✅ Limpar número reservado
  setSerieDocumentoReservado(null); // ✅ NOVO: Limpar série reservada
  setTipoFinalizacaoAtual(tipoFinalizacao); // ✅ Salvar tipo de finalização
  setDadosImpressao(null); // ✅ Limpar dados de impressão

  try {
    // Obter dados do usuário
    setEtapaProcessamento('Validando usuário...');
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setEtapaProcessamento('Erro: Usuário não autenticado');
      await new Promise(resolve => setTimeout(resolve, 2000));
      setShowProcessandoVenda(false);
      toast.error('Usuário não autenticado');
      return;
    }

    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', userData.user.id)
      .single();

    if (!usuarioData?.empresa_id) {
      setEtapaProcessamento('Erro: Empresa não encontrada');
      await new Promise(resolve => setTimeout(resolve, 2000));
      setShowProcessandoVenda(false);
      toast.error('Empresa não encontrada');
      return;
    }

    // ✅ CORREÇÃO: Buscar regime tributário da empresa
    setEtapaProcessamento('Buscando dados da empresa...');
    const { data: empresaData } = await supabase
      .from('empresas')
      .select('regime_tributario')
      .eq('id', usuarioData.empresa_id)
      .single();

    const regimeTributario = empresaData?.regime_tributario || 1; // Default: Simples Nacional

    // Gerar número da venda
    setEtapaProcessamento('Gerando número da venda...');
    const numeroVenda = await gerarNumeroVenda(usuarioData.empresa_id);
    setNumeroVendaProcessada(numeroVenda);

    // Calcular valores
    setEtapaProcessamento('Calculando valores da venda...');
    const valorSubtotal = carrinho.reduce((acc, item) => acc + item.subtotal, 0);
    const valorDescontoPrazo = descontoPrazoSelecionado ? calcularDescontoPrazo() : 0;

    // Calcular valor total considerando desconto por prazo
    // Se valorDescontoPrazo for negativo, significa que é acréscimo
    const valorTotal = valorSubtotal - valorDescontoPrazo;

    // Para salvar no banco, o valor do desconto deve ser sempre positivo
    const valorDesconto = Math.abs(valorDescontoPrazo);

    // Preparar dados do cliente
    setEtapaProcessamento('Preparando dados do cliente...');
    let clienteData = null;
    if (clienteSelecionado) {
      clienteData = {
        cliente_id: clienteSelecionado.id, // ✅ SEMPRE SALVAR ID DO CLIENTE REAL
        nome_cliente: clienteSelecionado.nome,
        telefone_cliente: clienteSelecionado.telefone,
        documento_cliente: clienteSelecionado.documento,
        tipo_documento_cliente: clienteSelecionado.tipo_documento
      };


    } else if (pedidosImportados.length > 0 && pedidosImportados[0]?.cliente) {
      const cliente = pedidosImportados[0].cliente;
      clienteData = {
        cliente_id: cliente.id,
        nome_cliente: cliente.nome,
        telefone_cliente: cliente.telefone,
        documento_cliente: cliente.documento,
        tipo_documento_cliente: cliente.tipo_documento
      };
    } else if (cpfCnpjNota && clienteEncontrado) {
      clienteData = {
        cliente_id: clienteEncontrado.id,
        nome_cliente: clienteEncontrado.nome,
        telefone_cliente: clienteEncontrado.telefone,
        documento_cliente: clienteEncontrado.documento,
        tipo_documento_cliente: clienteEncontrado.tipo_documento
      };
    } else if (cpfCnpjNota && cpfCnpjNota.trim()) {
      // ✅ NOVO: Salvar documento mesmo quando cliente não foi encontrado
      clienteData = {
        documento_cliente: cpfCnpjNota.replace(/\D/g, ''), // Apenas números
        tipo_documento_cliente: tipoDocumento
      };
    }

    // Preparar dados de pagamento
    setEtapaProcessamento('Preparando dados de pagamento...');
    let pagamentoData = {};
    if (tipoPagamento === 'vista' && formaPagamentoSelecionada) {
      // Buscar informações da forma de pagamento selecionada
      const formaSelecionada = formasPagamento.find(f => f.id === formaPagamentoSelecionada);
      const numeroParcelas = parcelasFormaPagamento[formaPagamentoSelecionada] || 1;
      const valorParcela = numeroParcelas > 1 ? valorTotal / numeroParcelas : null;

      // ✅ CORREÇÃO: Tratar fiado de forma especial (não salvar ID customizado)
      const isFiadoSelecionado = formaSelecionada?.nome?.toLowerCase() === 'fiado';

      pagamentoData = {
        tipo_pagamento: 'vista',
        forma_pagamento_id: isFiadoSelecionado ? null : formaPagamentoSelecionada, // ✅ NULL para fiado
        valor_pago: valorTotal,
        valor_troco: 0,
        parcelas: numeroParcelas,
        // ✅ NOVO: Estrutura expandida para formas_pagamento
        formas_pagamento: [{
          forma_id: isFiadoSelecionado ? null : formaPagamentoSelecionada, // ✅ NULL para fiado
          forma_nome: formaSelecionada?.nome || 'Forma de Pagamento',
          valor: valorTotal,
          tipo: formaSelecionada?.nome?.toLowerCase() === 'dinheiro' ? 'dinheiro' : 'eletronico',
          parcelas: numeroParcelas,
          valor_parcela: valorParcela
        }]
      };
    } else if (tipoPagamento === 'parcial' && pagamentosParciais.length > 0) {
      const totalPago = calcularTotalPago();

      // ✅ NOVO: Expandir dados dos pagamentos parciais com informações de parcelamento
      const formasExpandidas = pagamentosParciais.map(pagamento => {
        const forma = formasPagamento.find(f => f.id === pagamento.forma);
        // ✅ CORREÇÃO: Tratar fiado de forma especial nos pagamentos parciais
        const isFiadoParcial = forma?.nome?.toLowerCase() === 'fiado';

        return {
          forma_id: isFiadoParcial ? null : pagamento.forma, // ✅ NULL para fiado
          forma_nome: forma?.nome || 'Forma de Pagamento',
          valor: pagamento.valor,
          tipo: pagamento.tipo,
          parcelas: pagamento.parcelas || 1,
          valor_parcela: pagamento.valorParcela || null
        };
      });

      pagamentoData = {
        tipo_pagamento: 'parcial',
        formas_pagamento: formasExpandidas,
        valor_pago: totalPago,
        valor_troco: trocoCalculado
      };
    }

    // ✅ NOVO: CONTROLE DE FIADO - Detectar se a venda é fiado
    setEtapaProcessamento('Verificando se é venda fiado...');
    let isVendaFiado = false;
    let valorFiado = 0;

    if (tipoPagamento === 'vista' && formaPagamentoSelecionada) {
      const formaSelecionada = formasPagamento.find(f => f.id === formaPagamentoSelecionada);

      if (formaSelecionada?.nome?.toLowerCase() === 'fiado') {
        isVendaFiado = true;
        valorFiado = valorTotal;
      }
    } else if (tipoPagamento === 'parcial' && pagamentosParciais.length > 0) {
      // Verificar se algum pagamento parcial é fiado
      for (const pagamento of pagamentosParciais) {
        const forma = formasPagamento.find(f => f.id === pagamento.forma);

        if (forma?.nome?.toLowerCase() === 'fiado') {
          isVendaFiado = true;
          valorFiado += pagamento.valor;
        }
      }
    }

    // ✅ VALIDAÇÃO CRÍTICA: Se é fiado, deve ter cliente
    if (isVendaFiado && !clienteData.cliente_id) {
      setEtapaProcessamento('ERRO: Venda fiado sem cliente identificado!');
      await new Promise(resolve => setTimeout(resolve, 3000));
      setShowProcessandoVenda(false);
      toast.error('ERRO: Vendas fiado devem ter um cliente identificado!');
      return;
    }

    // Buscar configuração de controle de estoque
    setEtapaProcessamento('Verificando configuração de estoque...');
    const { data: estoqueConfig } = await supabase
      .from('tipo_controle_estoque_config')
      .select('tipo_controle')
      .eq('empresa_id', usuarioData.empresa_id)
      .single();

    const tipoControle = estoqueConfig?.tipo_controle || 'pedidos';

    // Preparar dados da venda principal
    setEtapaProcessamento('Preparando dados da venda...');

    // ✅ NOVO: Gerar número da NFC-e ANTES de salvar (se for NFC-e)
    let numeroDocumentoNfce = null;
    if (tipoFinalizacao.startsWith('nfce_')) {
      setEtapaProcessamento('Reservando número da NFC-e...');
      numeroDocumentoNfce = await gerarProximoNumeroNFCe(usuarioData.empresa_id);
      setNumeroDocumentoReservado(numeroDocumentoNfce);

      // ✅ CORREÇÃO: Buscar série do usuário (SEM FALLBACK - Lei Fundamental #2)
      const { data: usuarioSerieData, error: serieError } = await supabase
        .from('usuarios')
        .select('serie_nfce')
        .eq('id', userData.user.id)
        .single();

      if (serieError) {
        console.error('❌ ERRO ao buscar série do usuário:', serieError);
        throw new Error('Erro ao buscar série do usuário');
      }

      if (!usuarioSerieData?.serie_nfce) {
        console.error('❌ ERRO: Usuário não tem série NFC-e configurada');
        throw new Error('Usuário não tem série NFC-e configurada. Configure nas Configurações > Usuários');
      }

      const serieUsuario = usuarioSerieData.serie_nfce; // ✅ SEM FALLBACK
      setSerieDocumentoReservado(serieUsuario);
    }

    // ✅ NOVO: Coletar todos os vendedores únicos do carrinho
    setEtapaProcessamento('Coletando vendedores da venda...');
    const vendedoresUnicos = new Map();

    // Adicionar vendedor principal se existir
    if (vendedorSelecionado) {
      vendedoresUnicos.set(vendedorSelecionado.id, {
        id: vendedorSelecionado.id,
        nome: vendedorSelecionado.nome
      });
    }

    // Adicionar vendedores dos itens do carrinho
    carrinho.forEach(item => {
      if (item.vendedor_id && item.vendedor_nome) {
        vendedoresUnicos.set(item.vendedor_id, {
          id: item.vendedor_id,
          nome: item.vendedor_nome
        });
      }
    });

    // Converter para array de IDs
    const vendedoresIds = Array.from(vendedoresUnicos.keys());

    // ✅ NOVO: Calcular valores de desconto detalhados (com arredondamento para 2 casas decimais)
    const valorDescontoItens = Math.round(calcularDescontoItens() * 100) / 100;
    const valorDescontoTotal = Math.round(descontoGlobal * 100) / 100;

    // ✅ NOVO: Preparar observação da venda incluindo informações de troca
    let observacaoFinal = observacaoVenda || '';
    
    // Se for venda com troca (valor zero), adicionar observação específica
    if (isVendaComTroca && devolucaoAplicada && Math.abs(valorTotal) < 0.01) {
      const observacaoTroca = `TROCA - Devolução #${devolucaoAplicada.numero}${devolucaoAplicada.codigo_troca ? ` (${devolucaoAplicada.codigo_troca})` : ''}`;
      observacaoFinal = observacaoFinal ? `${observacaoFinal} | ${observacaoTroca}` : observacaoTroca;
    }

    const vendaData = {
      empresa_id: usuarioData.empresa_id,
      usuario_id: userData.user.id,
      vendedores_ids: vendedoresIds.length > 0 ? vendedoresIds : null, // ✅ NOVO: Salvar lista de vendedores
      numero_venda: numeroVenda,
      data_venda: new Date().toISOString(),
      status_venda: 'finalizada',
      valor_subtotal: valorSubtotal,
      valor_desconto: valorDesconto,
      valor_desconto_itens: valorDescontoItens, // ✅ NOVO: Desconto nos itens
      valor_desconto_total: valorDescontoTotal, // ✅ NOVO: Desconto no total
      valor_total: valorTotal,
      desconto_prazo_id: descontoPrazoSelecionado,
      pedidos_importados: pedidosImportados.length > 0 ? pedidosImportados.map(p => p.id) : null,
      observacao_venda: observacaoFinal || null, // ✅ NOVO: Incluir observação da venda com informações de troca
      // ✅ NOVO: Incluir informações de nome do cliente, mesa e comanda
      nome_cliente: nomeCliente || null,
      mesa_numero: mesaNumero || null,
      comanda_numero: comandaNumero || null,
      finalizada_em: new Date().toISOString(),
      // ✅ NOVO: Marcar tentativa de NFC-e e salvar número reservado
      tentativa_nfce: tipoFinalizacao.startsWith('nfce_'),
      status_fiscal: tipoFinalizacao.startsWith('nfce_') ? 'processando' : 'nao_fiscal',
      // ✅ CORREÇÃO: Salvar dados fiscais já no início (COM LOGS)
      modelo_documento: tipoFinalizacao.startsWith('nfce_') ? 65 : null,
      numero_documento: numeroDocumentoNfce,
      serie_documento: tipoFinalizacao.startsWith('nfce_') ? serieDocumentoReservado : null,
      // ✅ NOVO: Marcar como delivery local quando tipo de finalização for delivery
      delivery_local: tipoFinalizacao.startsWith('delivery_'),
      // ✅ NOVO: CONTROLE DE FIADO - Marcar se a venda é fiado
      fiado: isVendaFiado,
      ...clienteData,
      ...pagamentoData
    };

    // ... [RESTO DA FUNÇÃO CONTINUA NO PRÓXIMO ARQUIVO] ...
  } catch (error) {
    console.error('Erro ao finalizar venda:', error);
    
    // ✅ CORREÇÃO: Não sobrescrever erros específicos da NFC-e
    const mensagemErro = (error as Error).message;
    
    // Se o erro já foi tratado pela NFC-e, não sobrescrever
    if (statusProcessamento === 'erro') {
      return;
    }
    
    setEtapaProcessamento('ERRO INESPERADO: ' + mensagemErro);
    await new Promise(resolve => setTimeout(resolve, 3000));
    setShowProcessandoVenda(false);
    toast.error('Erro inesperado ao finalizar venda');
  }
};
