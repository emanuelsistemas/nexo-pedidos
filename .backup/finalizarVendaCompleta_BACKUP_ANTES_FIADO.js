// ✅ BACKUP COMPLETO DA FUNÇÃO finalizarVendaCompleta
// Data: 29/07/2025 - Antes da implementação do controle de FIADO
// Status: Função funcionando perfeitamente com todas as funcionalidades
// Próximo: Implementar controle de fiado (campo fiado na tabela pdv + saldo_devedor na tabela clientes)

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

    // Preparar dados do cliente
    setEtapaProcessamento('Preparando dados do cliente...');
    let clienteData = {};

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

    if (tipoPagamento === 'vista') {
      const formaSelecionada = formasPagamento.find(f => f.id === formaPagamentoSelecionada);
      const numeroParcelas = formaSelecionada?.max_parcelas || 1;
      const valorParcela = numeroParcelas > 1 ? valorTotal / numeroParcelas : null;

      pagamentoData = {
        tipo_pagamento: 'vista',
        forma_pagamento_id: formaPagamentoSelecionada,
        formas_pagamento: [{
          forma_pagamento_id: formaPagamentoSelecionada,
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
        const forma = formasPagamento.find(f => f.id === pagamento.forma_pagamento_id);
        return {
          forma_pagamento_id: pagamento.forma_pagamento_id,
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



    // Buscar configuração de controle de estoque
    setEtapaProcessamento('Verificando configurações...');
    const { data: configEstoque } = await supabase
      .from('pdv_config')
      .select('baixa_estoque_pdv')
      .eq('empresa_id', usuarioData.empresa_id)
      .single();

    // ✅ NOVO: Buscar configuração de venda sem produto
    const { data: configVendaSemProduto } = await supabase
      .from('empresas')
      .select(`
        venda_sem_produto_ativo,
        venda_sem_produto_nome,
        venda_sem_produto_ncm,
        venda_sem_produto_cfop,
        venda_sem_produto_cst_icms,
        venda_sem_produto_csosn,
        venda_sem_produto_aliquota_icms,
        venda_sem_produto_aliquota_pis,
        venda_sem_produto_aliquota_cofins,
        venda_sem_produto_cst_pis,
        venda_sem_produto_cst_cofins
      `)
      .eq('id', usuarioData.empresa_id)
      .single();

    // ✅ NOVO: Reservar número e série do documento se for NFC-e
    let numeroDocumentoReservado = null;
    let serieDocumentoReservado = null;

    if (tipoFinalizacao.startsWith('nfce_')) {
      setEtapaProcessamento('Reservando número da NFC-e...');

      // Buscar série da NFC-e do usuário
      const { data: usuarioSerie } = await supabase
        .from('usuarios')
        .select('serie_nfce')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioSerie?.serie_nfce) {
        setEtapaProcessamento('Erro: Série NFC-e não configurada para o usuário');
        await new Promise(resolve => setTimeout(resolve, 3000));
        setShowProcessandoVenda(false);
        toast.error('Série NFC-e não configurada para o usuário');
        return;
      }

      serieDocumentoReservado = usuarioSerie.serie_nfce;

      // Reservar próximo número da NFC-e
      const numeroReservado = await reservarProximoNumeroNfce(usuarioData.empresa_id, serieDocumentoReservado);
      if (!numeroReservado) {
        setEtapaProcessamento('Erro: Não foi possível reservar número da NFC-e');
        await new Promise(resolve => setTimeout(resolve, 3000));
        setShowProcessandoVenda(false);
        toast.error('Erro ao reservar número da NFC-e');
        return;
      }

      numeroDocumentoReservado = numeroReservado;
      setNumeroDocumentoReservado(numeroReservado);
      setSerieDocumentoReservado(serieDocumentoReservado);
    }

    // Preparar dados da venda
    const vendaData = {
      empresa_id: usuarioData.empresa_id,
      usuario_id: userData.user.id,
      numero_venda: numeroVenda,
      valor_subtotal: valorSubtotal,
      valor_desconto_prazo: valorDescontoPrazo,
      valor_total: valorTotal,
      status_venda: 'finalizada',
      finalizada_em: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      vendedor_id: vendedorSelecionado?.id || null,
      vendedores_ids: vendedorSelecionado ? [vendedorSelecionado.id] : null,
      observacao: observacaoVenda || null,
      // ✅ NOVO: Incluir dados de desconto por prazo
      desconto_prazo_id: descontoPrazoSelecionado?.id || null,
      desconto_prazo_percentual: descontoPrazoSelecionado?.percentual || null,
      desconto_prazo_tipo: descontoPrazoSelecionado?.tipo || null,
      desconto_prazo_dias: descontoPrazoSelecionado?.prazo_dias || null,
      // ✅ NOVO: Incluir dados de delivery local
      comanda: numeroComanda || null,
      mesa: numeroMesa || null,
      nome_cliente_balcao: nomeClienteBalcao || null,
      // ✅ NOVO: Incluir dados de entrega
      cep_entrega: enderecoEntrega?.cep || null,
      logradouro_entrega: enderecoEntrega?.logradouro || null,
      numero_entrega: enderecoEntrega?.numero || null,
      complemento_entrega: enderecoEntrega?.complemento || null,
      bairro_entrega: enderecoEntrega?.bairro || null,
      cidade_entrega: enderecoEntrega?.cidade || null,
      estado_entrega: enderecoEntrega?.estado || null,
      observacao_entrega: observacaoEntrega || null,
      // ✅ NOVO: Incluir dados do documento fiscal
      modelo_documento: tipoFinalizacao.startsWith('nfce_') ? 65 : null,
      numero_documento: numeroDocumentoReservado,
      serie_documento: tipoFinalizacao.startsWith('nfce_') ? serieDocumentoReservado : null,
      // ✅ NOVO: Marcar como delivery local quando tipo de finalização for delivery
      delivery_local: tipoFinalizacao.startsWith('delivery_'),
      ...clienteData,
      ...pagamentoData
    };

    // ✅ CORREÇÃO: UPDATE ou INSERT baseado na venda em andamento
    let vendaInserida;
    let vendaError;

    if (vendaEmAndamento) {
      // ✅ ATUALIZAR venda em andamento existente (sempre que há venda em andamento)
      setEtapaProcessamento('Finalizando venda em andamento...');

      // ✅ CORREÇÃO: Para venda em andamento, não sobrescrever série/número que já estão corretos
      const { serie_documento, numero_documento, ...vendaDataSemSerie } = vendaData;

      const result = await supabase
        .from('pdv')
        .update({
          ...vendaDataSemSerie,
          status_venda: 'finalizada', // ✅ Mudar status para finalizada
          finalizada_em: new Date().toISOString(),
          updated_at: new Date().toISOString()
          // ✅ NÃO incluir serie_documento e numero_documento - manter os que já estão no banco
        })
        .eq('id', vendaEmAndamento.id)
        .select('id, serie_documento, numero_documento, modelo_documento')
        .single();

      vendaInserida = result.data;
      vendaError = result.error;

      // Venda em andamento atualizada
    } else {
      // ✅ CRIAR nova venda (apenas se não há venda em andamento)
      setEtapaProcessamento('Salvando venda no banco de dados...');

      const result = await supabase
        .from('pdv')
        .insert(vendaData)
        .select('id, serie_documento, numero_documento, modelo_documento')
        .single();

      vendaInserida = result.data;
      vendaError = result.error;

      // Nova venda criada
    }

    if (vendaError) {
      setEtapaProcessamento('Erro ao salvar venda: ' + vendaError.message);
      await new Promise(resolve => setTimeout(resolve, 3000));
      setShowProcessandoVenda(false);
      toast.error('Erro ao salvar venda no banco de dados');
      return;
    }

    const vendaId = vendaInserida.id;
    setVendaProcessadaId(vendaId);

    // ✅ NOVO: Usar série e número do banco (para venda em andamento) ou reservados (para venda nova)
    const serieDocumentoFinal = vendaInserida.serie_documento || serieDocumentoReservado;
    const numeroDocumentoFinal = vendaInserida.numero_documento || numeroDocumentoReservado;

    // Preparar itens para inserção
    setEtapaProcessamento('Preparando itens da venda...');

    const itensParaInserir = carrinho.map(item => {
      // ✅ NOVO: Verificar se é venda sem produto
      let dadosFiscais = {};
      if (item.produto.id === 'venda_sem_produto' && configVendaSemProduto?.venda_sem_produto_ativo) {
        // ✅ Dados fiscais da configuração de venda sem produto
        dadosFiscais = {
          ncm: configVendaSemProduto.venda_sem_produto_ncm,
          cfop: configVendaSemProduto.venda_sem_produto_cfop,
          cst_icms: regimeTributario === 1 ? null : configVendaSemProduto.venda_sem_produto_cst_icms,
          csosn: regimeTributario === 1 ? configVendaSemProduto.venda_sem_produto_csosn : null,
          aliquota_icms: configVendaSemProduto.venda_sem_produto_aliquota_icms,
          aliquota_pis: configVendaSemProduto.venda_sem_produto_aliquota_pis,
          aliquota_cofins: configVendaSemProduto.venda_sem_produto_aliquota_cofins,
          cst_pis: configVendaSemProduto.venda_sem_produto_cst_pis,
          cst_cofins: configVendaSemProduto.venda_sem_produto_cst_cofins
        };
      } else {
        // ✅ Dados fiscais do produto normal - todos os campos da tabela pdv_itens
        dadosFiscais = {
          ncm: item.produto.ncm || null,
          cfop: item.produto.cfop || null,
          cst_icms: regimeTributario === 1 ? null : item.produto.cst_icms,
          csosn: regimeTributario === 1 ? item.produto.csosn : null,
          cest: item.produto.cest || null,
          aliquota_icms: item.produto.aliquota_icms || null,
          aliquota_pis: item.produto.aliquota_pis || null,
          aliquota_cofins: item.produto.aliquota_cofins || null,
          cst_pis: item.produto.cst_pis || null,
          cst_cofins: item.produto.cst_cofins || null
        };
      }

      return {
        empresa_id: usuarioData.empresa_id,
        usuario_id: userData.user.id,
        venda_id: vendaId,
        produto_id: item.produto.id,
        nome_produto: item.produto.nome,
        quantidade: item.quantidade,
        preco_unitario: item.preco,
        subtotal: item.subtotal,
        unidade: item.produto.unidade_medida?.sigla || 'UN',
        ean: item.produto.codigo_barras || null,
        vendedor_id: item.vendedor_id || vendedorSelecionado?.id || null,
        observacao: item.observacao || null,
        // ✅ NOVO: Incluir dados de desconto do item
        desconto_percentual: item.desconto?.percentualDesconto || null,
        desconto_valor: item.desconto?.valorDesconto || null,
        preco_original: item.desconto?.precoOriginal || item.preco,
        // ✅ NOVO: Incluir adicionais como JSONB
        adicionais_json: item.adicionais && item.adicionais.length > 0 ? JSON.stringify(item.adicionais) : null,
        // ✅ NOVO: Incluir sabores como JSONB
        sabores_json: item.sabores && item.sabores.length > 0 ? JSON.stringify(item.sabores) : null,
        descricao_sabores: item.descricaoSabores || null,
        // ✅ NOVO: Incluir dados da tabela de preços
        tabela_preco_id: item.tabela_preco_id || null,
        tabela_preco_nome: item.tabela_preco_nome || null,
        // ✅ CORREÇÃO: Incluir dados fiscais
        ...dadosFiscais
      };
    });

    // ✅ CORREÇÃO: Verificar itens existentes e fazer UPDATE/INSERT conforme necessário
    setEtapaProcessamento('Salvando itens da venda...');

    // Buscar itens já salvos na venda
    const { data: itensExistentes } = await supabase
      .from('pdv_itens')
      .select('id, produto_id, quantidade, preco_unitario, subtotal, vendedor_id, observacao')
      .eq('venda_id', vendaId);

    const itensJaSalvos = itensExistentes || [];

    // ✅ CORREÇÃO: Identificar itens que precisam ser inseridos
    const itensNaoSalvos = carrinho.filter(itemCarrinho => {
      return !itensJaSalvos.some(itemSalvo =>
        itemSalvo.produto_id === itemCarrinho.produto.id &&
        itemSalvo.quantidade === itemCarrinho.quantidade &&
        itemSalvo.preco_unitario === itemCarrinho.preco &&
        itemSalvo.subtotal === itemCarrinho.subtotal &&
        itemSalvo.vendedor_id === (itemCarrinho.vendedor_id || vendedorSelecionado?.id) &&
        itemSalvo.observacao === (itemCarrinho.observacao || null)
      );
    });

    // Inserir apenas itens que não foram salvos ainda
    if (itensNaoSalvos.length > 0) {
      const itensParaInserirFiltrados = itensNaoSalvos.map(item => {
        // ✅ NOVO: Verificar se é venda sem produto
        let dadosFiscais = {};
        if (item.produto.id === 'venda_sem_produto' && configVendaSemProduto?.venda_sem_produto_ativo) {
          // ✅ Dados fiscais da configuração de venda sem produto
          dadosFiscais = {
            ncm: configVendaSemProduto.venda_sem_produto_ncm,
            cfop: configVendaSemProduto.venda_sem_produto_cfop,
            cst_icms: regimeTributario === 1 ? null : configVendaSemProduto.venda_sem_produto_cst_icms,
            csosn: regimeTributario === 1 ? configVendaSemProduto.venda_sem_produto_csosn : null,
            aliquota_icms: configVendaSemProduto.venda_sem_produto_aliquota_icms,
            aliquota_pis: configVendaSemProduto.venda_sem_produto_aliquota_pis,
            aliquota_cofins: configVendaSemProduto.venda_sem_produto_aliquota_cofins,
            cst_pis: configVendaSemProduto.venda_sem_produto_cst_pis,
            cst_cofins: configVendaSemProduto.venda_sem_produto_cst_cofins
          };
        } else {
          // ✅ Dados fiscais do produto normal - todos os campos da tabela pdv_itens
          dadosFiscais = {
            ncm: item.produto.ncm || null,
            cfop: item.produto.cfop || null,
            cst_icms: regimeTributario === 1 ? null : item.produto.cst_icms,
            csosn: regimeTributario === 1 ? item.produto.csosn : null,
            cest: item.produto.cest || null,
            aliquota_icms: item.produto.aliquota_icms || null,
            aliquota_pis: item.produto.aliquota_pis || null,
            aliquota_cofins: item.produto.aliquota_cofins || null,
            cst_pis: item.produto.cst_pis || null,
            cst_cofins: item.produto.cst_cofins || null
          };
        }

        return {
          empresa_id: usuarioData.empresa_id,
          usuario_id: userData.user.id,
          venda_id: vendaId,
          produto_id: item.produto.id,
          nome_produto: item.produto.nome,
          quantidade: item.quantidade,
          preco_unitario: item.preco,
          subtotal: item.subtotal,
          unidade: item.produto.unidade_medida?.sigla || 'UN',
          ean: item.produto.codigo_barras || null,
          vendedor_id: item.vendedor_id || vendedorSelecionado?.id || null,
          observacao: item.observacao || null,
          // ✅ NOVO: Incluir dados de desconto do item
          desconto_percentual: item.desconto?.percentualDesconto || null,
          desconto_valor: item.desconto?.valorDesconto || null,
          preco_original: item.desconto?.precoOriginal || item.preco,
          // ✅ NOVO: Incluir adicionais como JSONB
          adicionais_json: item.adicionais && item.adicionais.length > 0 ? JSON.stringify(item.adicionais) : null,
          // ✅ NOVO: Incluir sabores como JSONB
          sabores_json: item.sabores && item.sabores.length > 0 ? JSON.stringify(item.sabores) : null,
          descricao_sabores: item.descricaoSabores || null,
          // ✅ NOVO: Incluir dados da tabela de preços
          tabela_preco_id: item.tabela_preco_id || null,
          tabela_preco_nome: item.tabela_preco_nome || null,
          // ✅ CORREÇÃO: Incluir dados fiscais
          ...dadosFiscais
        };
      });

      const { error: itensError } = await supabase
        .from('pdv_itens')
        .insert(itensParaInserirFiltrados);

      if (itensError) {
        setEtapaProcessamento('Erro ao salvar itens: ' + itensError.message);
        await new Promise(resolve => setTimeout(resolve, 3000));
        setShowProcessandoVenda(false);
        toast.error('Erro ao salvar itens da venda');
        return;
      }
    }

    // ✅ NOVO: Baixa automática de estoque usando campo JSONB
    if (configEstoque?.baixa_estoque_pdv) {
      setEtapaProcessamento('Processando baixa de estoque...');

      try {
        // ✅ CORREÇÃO: Processar baixa para TODOS os itens do carrinho (não apenas os novos)
        for (const item of carrinho) {
          // Pular venda sem produto
          if (item.produto.id === 'venda_sem_produto') continue;

          // ✅ NOVO: Verificar se o produto tem insumos configurados
          const { data: produtoComInsumos } = await supabase
            .from('produtos')
            .select('insumos_json')
            .eq('id', item.produto.id)
            .single();

          if (produtoComInsumos?.insumos_json) {
            try {
              const insumos = JSON.parse(produtoComInsumos.insumos_json);

              // Processar cada insumo
              for (const insumo of insumos) {
                const quantidadeBaixa = insumo.quantidade * item.quantidade;

                // Buscar estoque atual do insumo
                const { data: estoqueAtual } = await supabase
                  .from('estoque')
                  .select('quantidade_atual')
                  .eq('produto_id', insumo.produto_id)
                  .eq('empresa_id', usuarioData.empresa_id)
                  .single();

                if (estoqueAtual) {
                  const novaQuantidade = Math.max(0, estoqueAtual.quantidade_atual - quantidadeBaixa);

                  // Atualizar estoque
                  await supabase
                    .from('estoque')
                    .update({
                      quantidade_atual: novaQuantidade,
                      updated_at: new Date().toISOString()
                    })
                    .eq('produto_id', insumo.produto_id)
                    .eq('empresa_id', usuarioData.empresa_id);

                  // Registrar movimentação
                  await supabase
                    .from('movimentacoes_estoque')
                    .insert({
                      empresa_id: usuarioData.empresa_id,
                      produto_id: insumo.produto_id,
                      tipo_movimentacao: 'saida',
                      quantidade: quantidadeBaixa,
                      motivo: `Baixa automática - Venda #${numeroVenda}`,
                      usuario_id: userData.user.id,
                      venda_id: vendaId,
                      created_at: new Date().toISOString()
                    });
                }
              }
            } catch (parseError) {
              console.error('❌ Erro ao processar insumos do produto:', item.produto.nome, parseError);
            }
          } else {
            // ✅ FALLBACK: Baixa direta do produto se não tem insumos configurados
            const { data: estoqueAtual } = await supabase
              .from('estoque')
              .select('quantidade_atual')
              .eq('produto_id', item.produto.id)
              .eq('empresa_id', usuarioData.empresa_id)
              .single();

            if (estoqueAtual) {
              const novaQuantidade = Math.max(0, estoqueAtual.quantidade_atual - item.quantidade);

              // Atualizar estoque
              await supabase
                .from('estoque')
                .update({
                  quantidade_atual: novaQuantidade,
                  updated_at: new Date().toISOString()
                })
                .eq('produto_id', item.produto.id)
                .eq('empresa_id', usuarioData.empresa_id);

              // Registrar movimentação
              await supabase
                .from('movimentacoes_estoque')
                .insert({
                  empresa_id: usuarioData.empresa_id,
                  produto_id: item.produto.id,
                  tipo_movimentacao: 'saida',
                  quantidade: item.quantidade,
                  motivo: `Baixa automática - Venda #${numeroVenda}`,
                  usuario_id: userData.user.id,
                  venda_id: vendaId,
                  created_at: new Date().toISOString()
                });
            }
          }
        }
      } catch (estoqueError) {
        console.error('❌ Erro na baixa de estoque:', estoqueError);
        // ✅ CORREÇÃO: Não parar a venda por erro de estoque, apenas logar
      }
    }

    // ✅ NOVO: Controle de tipo de finalização
    const tipoControle = vendaEmAndamento ? 'atualizacao' : 'criacao';

    // VERIFICAÇÃO CRÍTICA: Confirmar se tudo foi salvo corretamente
    // ✅ CORREÇÃO: Usar total de itens esperados (incluindo já salvos + novos inseridos)
    const totalItensEsperados = itensJaSalvos.length + itensNaoSalvos.length;
    const vendaVerificada = await verificarVendaNoBanco(vendaId, numeroVenda, totalItensEsperados, tipoControle);

    if (!vendaVerificada) {
      setEtapaProcessamento('ERRO: Venda não foi salva corretamente!');
      await new Promise(resolve => setTimeout(resolve, 3000));
      setShowProcessandoVenda(false);
      toast.error('ERRO: Venda não foi salva corretamente no banco de dados!');
      return;
    }

    // Atualizar status dos pedidos importados para "faturado"
    if (pedidosImportados.length > 0) {
      setEtapaProcessamento('Atualizando status dos pedidos...');

      for (const pedido of pedidosImportados) {
        await supabase
          .from('pedidos')
          .update({
            status: 'faturado',
            numero_venda: numeroVenda,
            venda_id: vendaId,
            updated_at: new Date().toISOString()
          })
          .eq('id', pedido.id);
      }
    }

    // ✅ NOVO: Emitir NFC-e se solicitado
    if (tipoFinalizacao.startsWith('nfce_')) {
      setEtapaProcessamento('Preparando dados para NFC-e...');

      try {
        // ✅ NOVO: Buscar dados completos da empresa para NFC-e
        const { data: empresaData } = await supabase
          .from('empresas')
          .select(`
            razao_social,
            nome_fantasia,
            cnpj,
            inscricao_estadual,
            logradouro,
            numero,
            complemento,
            bairro,
            cidade,
            estado,
            cep,
            telefone,
            email,
            regime_tributario,
            csc_id,
            csc_token
          `)
          .eq('id', usuarioData.empresa_id)
          .single();

        if (!empresaData) {
          throw new Error('Dados da empresa não encontrados');
        }

        // ✅ NOVO: Função para obter código da UF
        const obterCodigoUF = (estado: string): number => {
          const codigosUF: { [key: string]: number } = {
            'AC': 12, 'AL': 17, 'AP': 16, 'AM': 13, 'BA': 29, 'CE': 23, 'DF': 53,
            'ES': 32, 'GO': 52, 'MA': 21, 'MT': 51, 'MS': 50, 'MG': 31, 'PA': 15,
            'PB': 25, 'PR': 41, 'PE': 26, 'PI': 22, 'RJ': 33, 'RN': 24, 'RS': 43,
            'RO': 11, 'RR': 14, 'SC': 42, 'SP': 35, 'SE': 28, 'TO': 27
          };
          return codigosUF[estado] || 35; // Default SP se não encontrar
        };

        const nfceData = {
          // ✅ CORREÇÃO: Adicionar dados da empresa (igual à NFe que funciona)
          empresa: {
            razao_social: empresaData.razao_social,
            nome_fantasia: empresaData.nome_fantasia,
            cnpj: empresaData.cnpj,
            inscricao_estadual: empresaData.inscricao_estadual,
            logradouro: empresaData.logradouro,
            numero: empresaData.numero,
            complemento: empresaData.complemento,
            bairro: empresaData.bairro,
            cidade: empresaData.cidade,
            estado: empresaData.estado,
            cep: empresaData.cep,
            telefone: empresaData.telefone,
            email: empresaData.email,
            codigo_uf: obterCodigoUF(empresaData.estado),
            regime_tributario: empresaData.regime_tributario,
            csc_id: empresaData.csc_id,
            csc_token: empresaData.csc_token
          },
          numero: numeroDocumentoFinal,
          serie: serieDocumentoFinal,
          // ✅ CORREÇÃO: Dados do destinatário condicionais
          destinatario: (() => {
            // Se tem cliente encontrado, usar dados do cliente
            if (clienteData) {
              return {
                documento: clienteData.documento_cliente,
                nome: clienteData.nome_cliente
              };
            }
            // Se tem CPF/CNPJ digitado mas cliente não encontrado, usar o digitado
            if (cpfCnpjNota && cpfCnpjNota.trim()) {
              return {
                documento: cpfCnpjNota.replace(/\D/g, ''), // Apenas números
                nome: 'CONSUMIDOR'
              };
            }
            // Sem documento = consumidor não identificado
            return {};
          })(),
          produtos: carrinho.map(item => ({
            nome: item.produto.nome,
            quantidade: item.quantidade,
            unidade: item.produto.unidade_medida?.sigla || 'UN',
            preco_unitario: item.preco,
            preco_total: item.subtotal,
            ncm: item.produto.ncm, // NCM real do produto (SEM FALLBACK)
            cfop: item.produto.cfop, // CFOP real do produto (SEM FALLBACK)
            codigo_barras: item.produto.codigo_barras, // Código de barras real (SEM FALLBACK)
            adicionais: item.adicionais || [] // ✅ NOVO: Incluir adicionais para NFC-e
          }))
        };

        // Dados NFC-e preparados

        setEtapaProcessamento('Emitindo NFC-e na SEFAZ...');

        // Chamar endpoint de emissão de NFC-e
        const requestData = {
          empresa_id: usuarioData.empresa_id,
          nfce_data: nfceData
        };



        const nfceResponse = await fetch('/backend/public/emitir-nfce.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData)
        });

        const nfceResult = await nfceResponse.json();

        if (!nfceResponse.ok || !nfceResult.success) {
          // ✅ NOVO: Tratamento específico de erros da SEFAZ
          const mensagemErroEspecifica = nfceResult.error || nfceResult.message || 'Erro desconhecido na emissão da NFC-e';

          // ✅ NOVO: Atualizar venda com erro fiscal
          await supabase
            .from('pdv')
            .update({
              status_fiscal: 'erro',
              erro_fiscal: mensagemErroEspecifica,
              updated_at: new Date().toISOString()
            })
            .eq('id', vendaId);

          // ✅ NOVO: Atualizar contador de NFC-e pendentes
          loadContadorNfcePendentes();

          // ✅ NOVO: Mostrar modal de erro e parar aqui
          setErroProcessamento(mensagemErroEspecifica);
          setEtapaProcessamento(`Erro na NFC-e: ${mensagemErroEspecifica}`);
          setStatusProcessamento('erro');

          // ✅ NOVO: Limpar carrinho silenciosamente (sem toast de sucesso)
          setCarrinho([]);
          setClienteSelecionado(null);
          setShowFinalizacaoFinal(false);
          limparPagamentosParciaisSilencioso();
          setCpfCnpjNota('');
          setClienteEncontrado(null);
          setTipoDocumento('cpf');
          setPedidosImportados([]);
          setDescontoPrazoSelecionado(null);

          // ✅ NOVO: Limpar observação da venda
          setObservacaoVenda('');

          clearPDVState();

          // ✅ NOVO: Atualizar contador de NFC-e pendentes
          loadContadorNfcePendentes();

          // ✅ NOVO: Parar aqui - não mostrar mensagem de sucesso
          return;
        }

        // ✅ NFC-e emitida com sucesso
        if (nfceResult.success && nfceResult.data) {
          setStatusProcessamento('sucesso');
          setEtapaProcessamento('NFC-e emitida com sucesso!');

          // Atualizar registro da venda com dados da NFC-e
          const updateData = {
            // ✅ NOVO: Não atualizar numero_documento - já foi salvo no início
            chave_nfe: nfceResult.data.chave,
            protocolo_nfe: nfceResult.data.protocolo,
            status_fiscal: 'autorizada', // ✅ NFC-e autorizada com sucesso
            erro_fiscal: null, // ✅ Limpar qualquer erro anterior
            data_emissao_nfe: nfceResult.data.data_autorizacao
            // ✅ CORREÇÃO: xml_path e pdf_path removidos - arquivos salvos localmente em /root/nexo-pedidos/backend/storage
          };

          const { error: updateError } = await supabase
            .from('pdv')
            .update(updateData)
            .eq('id', vendaId);

          if (updateError) {
            console.error('❌ Erro ao atualizar venda com dados da NFC-e:', updateError);
          }

          // ✅ NOVO: Atualizar contador de NFC-e pendentes
          loadContadorNfcePendentes();

          // ✅ NOVO: Verificar se deve imprimir automaticamente
          if (tipoFinalizacao === 'nfce_com_impressao') {
            setEtapaProcessamento('Preparando impressão da NFC-e...');

            // ✅ NOVO: Preparar dados para impressão da NFC-e
            const dadosImpressaoNfce = {
              venda: {
                id: vendaId,
                numero_venda: numeroVenda,
                valor_total: valorTotal,
                chave_nfe: nfceResult.data.chave,
                protocolo_nfe: nfceResult.data.protocolo,
                data_emissao: nfceResult.data.data_autorizacao,
                numero_documento: numeroDocumentoFinal,
                serie_documento: serieDocumentoFinal
              },
              empresa: empresaData,
              cliente: clienteData,
              itens: carrinho.map(item => ({
                nome: item.produto.nome,
                quantidade: item.quantidade,
                unidade: item.produto.unidade_medida?.sigla || 'UN',
                preco_unitario: item.preco,
                subtotal: item.subtotal,
                observacao: item.observacao,
                adicionais: item.adicionais || [],
                sabores: item.sabores || null // ✅ NOVO: Incluir sabores para referência
              })),
              pagamento: pagamentoData,
              timestamp: new Date().toISOString(),
              tipo: 'nfce' // Identificar que é NFC-e
            };

            // Salvar dados de impressão no estado
            setDadosImpressao(dadosImpressaoNfce);

            console.log('🖨️ FRONTEND: Dados da NFC-e preparados, aguardando ação do usuário');
            setEtapaProcessamento('NFC-e emitida com sucesso! Deseja imprimir?');
            setStatusProcessamento('aguardando_impressao');

            // NÃO continuar automaticamente - aguardar ação do usuário no modal
            return;
          }
        }
      } catch (nfceError) {
        // ✅ NOVO: Tratamento de erro na emissão da NFC-e
        const mensagemErroEspecifica = nfceError.message || 'Erro inesperado na emissão da NFC-e';

        // ✅ NOVO: Atualizar venda com erro fiscal
        await supabase
          .from('pdv')
          .update({
            status_fiscal: 'erro',
            erro_fiscal: mensagemErroEspecifica,
            updated_at: new Date().toISOString()
          })
          .eq('id', vendaId);

        // ✅ NOVO: Atualizar contador de NFC-e pendentes
        loadContadorNfcePendentes();

        // ✅ NOVO: Mostrar modal de erro e parar aqui
        setErroProcessamento(mensagemErroEspecifica);
        setEtapaProcessamento(`Erro na NFC-e: ${mensagemErroEspecifica}`);
        setStatusProcessamento('erro');

        // ✅ NOVO: Limpar carrinho silenciosamente (sem toast de sucesso)
        setCarrinho([]);
        setClienteSelecionado(null);
        setShowFinalizacaoFinal(false);
        limparPagamentosParciaisSilencioso();
        setCpfCnpjNota('');
        setClienteEncontrado(null);
        setTipoDocumento('cpf');
        setPedidosImportados([]);
        setDescontoPrazoSelecionado(null);

        // ✅ NOVO: Limpar observação da venda
        setObservacaoVenda('');

        clearPDVState();

        // ✅ NOVO: Atualizar contador de NFC-e pendentes
        loadContadorNfcePendentes();

        // ✅ NOVO: Parar aqui - não mostrar mensagem de sucesso
        return;
      }
    }

    // ✅ NOVO: Verificar se deve imprimir cupom não fiscal
    if (tipoFinalizacao === 'finalizar_com_impressao') {
      setEtapaProcessamento('Preparando impressão do cupom...');

      // ✅ NOVO: Preparar dados para impressão
      const dadosImpressaoCompletos = {
        venda: {
          id: vendaId,
          numero_venda: numeroVenda,
          valor_total: valorTotal
        },
        empresa: empresaData,
        cliente: clienteData,
        itens: carrinho.map(item => ({
          nome: item.produto.nome,
          quantidade: item.quantidade,
          unidade: item.produto.unidade_medida?.sigla || 'UN',
          preco_unitario: item.preco,
          subtotal: item.subtotal,
          observacao: item.observacao,
          adicionais: item.adicionais || [],
          sabores: item.sabores || null // ✅ NOVO: Incluir sabores para referência
        })),
        pagamento: pagamentoData,
        timestamp: new Date().toISOString(),
        tipo: 'cupom_nao_fiscal' // Identificar tipo
      };

      // Salvar dados de impressão no estado
      setDadosImpressao(dadosImpressaoCompletos);

      console.log('🖨️ FRONTEND: Dados preparados, aguardando ação do usuário');
      setEtapaProcessamento('Venda finalizada com sucesso! Deseja imprimir o cupom?');
      setStatusProcessamento('aguardando_impressao');

      // NÃO continuar automaticamente - aguardar ação do usuário no modal
      return;
    }

    // ✅ SUCESSO: Finalização completa sem impressão
    setStatusProcessamento('sucesso');

    // Determinar mensagem de sucesso baseada no tipo de finalização
    const mensagemSucesso = (() => {
      if (tipoFinalizacao.startsWith('nfce_')) {
        return 'Venda finalizada e NFC-e emitida com sucesso!';
      } else if (tipoFinalizacao.startsWith('delivery_')) {
        return 'Venda de delivery finalizada com sucesso!';
      } else {
        return 'Venda finalizada com sucesso!';
      }
    })();

    setEtapaProcessamento(mensagemSucesso);
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Fechar modal de processamento
    setShowProcessandoVenda(false);

    // Mostrar sucesso
    const toastMessage = (() => {
      if (tipoFinalizacao === 'nfce_com_impressao') {
        return `Venda #${numeroVenda} finalizada e NFC-e emitida com sucesso!`;
      } else if (tipoFinalizacao.startsWith('nfce_')) {
        return `Venda #${numeroVenda} finalizada e NFC-e emitida com sucesso!`;
      } else if (tipoFinalizacao === 'finalizar_com_impressao') {
        return `Venda #${numeroVenda} finalizada e impressa com sucesso!`;
      } else {
        return `Venda #${numeroVenda} finalizada com sucesso!`;
      }
    })();

    toast.success(toastMessage);

    // Disparar evento customizado para atualizar modal de movimentos
    window.dispatchEvent(new CustomEvent('vendaPdvFinalizada', {
      detail: {
        vendaId: vendaId,
        numeroVenda: numeroVenda,
        empresaId: usuarioData.empresa_id,
        valorTotal: valorTotal
      }
    }));

    // ✅ MARCAR PEDIDO DO CARDÁPIO DIGITAL COMO FATURADO
    await marcarPedidoCardapioComoFaturado(vendaId, numeroVenda);

    // ✅ NOVO: Limpar venda em andamento (adaptado do sistema de rascunhos NFe)
    setVendaEmAndamento(null);
    setIsEditingVenda(false);

    // Limpar todos os estados
    setCarrinho([]);
    setClienteSelecionado(null);
    setVendedorSelecionado(null); // ✅ IMPORTANTE: Limpar vendedor selecionado
    setShowFinalizacaoFinal(false);
    limparPagamentosParciaisSilencioso(); // Versão silenciosa para não mostrar toast duplicado
    setCpfCnpjNota('');
    setClienteEncontrado(null);
    setTipoDocumento('cpf');
    setPedidosImportados([]);
    setDescontoPrazoSelecionado(null);

    // ✅ NOVO: Limpar observação da venda
    setObservacaoVenda('');

    clearPDVState();

    // ✅ NOVO: Atualizar contador de NFC-e pendentes
    loadContadorNfcePendentes();

    // Recarregar estoque se necessário
    if (pdvConfig?.baixa_estoque_pdv) {
      loadEstoque();
    }

  } catch (error) {
    // Erro inesperado
    const mensagemErro = error.message || 'Erro inesperado';
    setStatusProcessamento('erro');
    setEtapaProcessamento('ERRO INESPERADO: ' + mensagemErro);
    await new Promise(resolve => setTimeout(resolve, 3000));
    setShowProcessandoVenda(false);
    toast.error('Erro inesperado ao finalizar venda');
  }
};
