// ✅ BACKUP COMPLETO DA FUNÇÃO finalizarVendaCompleta
// Data: 26/07/2025 - Antes da implementação da baixa automática de insumos
// Status: Função funcionando após correção do problema com adicionais
// Próximo: Implementar baixa automática de insumos usando campo JSONB

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

      pagamentoData = {
        tipo_pagamento: 'vista',
        forma_pagamento_id: formaPagamentoSelecionada,
        valor_pago: valorTotal,
        valor_troco: 0,
        parcelas: numeroParcelas,
        // ✅ NOVO: Estrutura expandida para formas_pagamento
        formas_pagamento: [{
          forma_id: formaPagamentoSelecionada,
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
        return {
          forma_id: pagamento.forma,
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
      observacao_venda: observacaoVenda || null, // ✅ NOVO: Incluir observação da venda
      finalizada_em: new Date().toISOString(),
      // ✅ NOVO: Marcar tentativa de NFC-e e salvar número reservado
      tentativa_nfce: tipoFinalizacao.startsWith('nfce_'),
      status_fiscal: tipoFinalizacao.startsWith('nfce_') ? 'processando' : 'nao_fiscal',
      // ✅ CORREÇÃO: Salvar dados fiscais já no início (COM LOGS)
      modelo_documento: tipoFinalizacao.startsWith('nfce_') ? 65 : null,
      numero_documento: numeroDocumentoNfce,
      serie_documento: tipoFinalizacao.startsWith('nfce_') ? serieDocumentoReservado : null,
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
      console.error('❌ [FINALIZAÇÃO] Erro ao salvar venda:', vendaError);
      console.error('❌ [FINALIZAÇÃO] Detalhes completos do erro:', {
        message: vendaError.message,
        details: vendaError.details,
        hint: vendaError.hint,
        code: vendaError.code,
        stack: vendaError.stack
      });
      setEtapaProcessamento('Erro ao salvar venda: ' + vendaError.message);
      await new Promise(resolve => setTimeout(resolve, 3000));
      setShowProcessandoVenda(false);
      toast.error('Erro ao salvar venda: ' + vendaError.message);
      return;
    }

    if (!vendaInserida?.id) {
      console.error('❌ [FINALIZAÇÃO] Venda não retornou ID válido');
      console.error('❌ [FINALIZAÇÃO] Dados retornados:', vendaInserida);
      setEtapaProcessamento('Erro: Venda não foi salva corretamente');
      await new Promise(resolve => setTimeout(resolve, 3000));
      setShowProcessandoVenda(false);
      toast.error('Venda não foi salva corretamente no banco de dados!');
      return;
    }

    const vendaId = vendaInserida.id;
    setVendaProcessadaId(vendaId);

    // ✅ CORREÇÃO: Buscar configurações PDV para venda sem produto
    let configVendaSemProduto = null;
    if (carrinho.some(item => item.produto.codigo === '999999')) {
      const { data: pdvConfigData } = await supabase
        .from('pdv_config')
        .select(`
          venda_sem_produto_ncm,
          venda_sem_produto_cfop,
          venda_sem_produto_origem,
          venda_sem_produto_situacao_tributaria,
          venda_sem_produto_cest,
          venda_sem_produto_margem_st,
          venda_sem_produto_aliquota_icms,
          venda_sem_produto_aliquota_pis,
          venda_sem_produto_aliquota_cofins,
          venda_sem_produto_peso_liquido,
          venda_sem_produto_cst,
          venda_sem_produto_csosn
        `)
        .eq('empresa_id', usuarioData.empresa_id)
        .single();

      configVendaSemProduto = pdvConfigData;
    }

    // Preparar itens para inserção
    setEtapaProcessamento('Preparando itens da venda...');

    // ✅ CORREÇÃO: Filtrar apenas itens que ainda não foram salvos (sem pdv_item_id)
    console.log('🔍 [FILTRO DEBUG] ===== ANALISANDO FILTRO DE ITENS =====');
    console.log('🔍 [FILTRO DEBUG] carrinho.length:', carrinho.length);

    carrinho.forEach((item, index) => {
      console.log(`🔍 [FILTRO DEBUG] Item ${index + 1}: ${item.produto.nome} (Código: ${item.produto.codigo})`);
      console.log(`🔍 [FILTRO DEBUG] item.pdv_item_id:`, item.pdv_item_id);
      console.log(`🔍 [FILTRO DEBUG] !item.pdv_item_id:`, !item.pdv_item_id);
      console.log(`🔍 [FILTRO DEBUG] Será incluído em itensNaoSalvos:`, !item.pdv_item_id);
    });

    const itensNaoSalvos = carrinho.filter(item => !item.pdv_item_id);
    const itensJaSalvos = carrinho.filter(item => item.pdv_item_id);

    console.log('🔍 [FILTRO DEBUG] itensNaoSalvos.length:', itensNaoSalvos.length);
    console.log('🔍 [FILTRO DEBUG] itensJaSalvos.length:', itensJaSalvos.length);
    console.log('🔍 [FILTRO DEBUG] itensNaoSalvos:', itensNaoSalvos.map(item => `${item.produto.nome} (${item.produto.codigo})`));
    console.log('🔍 [FILTRO DEBUG] itensJaSalvos:', itensJaSalvos.map(item => `${item.produto.nome} (${item.produto.codigo})`));

    const itensParaInserir = itensNaoSalvos.map(item => {
      const precoUnitario = item.desconto ? item.desconto.precoComDesconto : (item.subtotal / item.quantidade);

      // ✅ CORREÇÃO: Para venda sem produto, produto_id deve ser null
      const produtoId = item.vendaSemProduto ? null : item.produto.id;

      // ✅ CORREÇÃO: Dados fiscais - usar configuração PDV para produto 999999
      let dadosFiscais = {};
      if (item.produto.codigo === '999999' && configVendaSemProduto) {
        // Aplicar dados fiscais da configuração PDV
        const situacaoTributaria = configVendaSemProduto.venda_sem_produto_situacao_tributaria;
        const cstIcms = configVendaSemProduto.venda_sem_produto_cst;
        const csosnIcms = configVendaSemProduto.venda_sem_produto_csosn;

        dadosFiscais = {
          // ✅ SEM FALLBACK: Usar dados diretos da configuração PDV
          ncm: configVendaSemProduto.venda_sem_produto_ncm,
          cfop: configVendaSemProduto.venda_sem_produto_cfop,
          origem_produto: configVendaSemProduto.venda_sem_produto_origem,
          cst_icms: configVendaSemProduto.venda_sem_produto_cst,
          csosn_icms: configVendaSemProduto.venda_sem_produto_csosn,
          cest: configVendaSemProduto.venda_sem_produto_cest,
          margem_st: configVendaSemProduto.venda_sem_produto_margem_st,
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
          origem_produto: item.produto.origem_produto || null,
          cst_icms: item.produto.cst_icms || null,
          csosn_icms: item.produto.csosn_icms || null,
          cest: item.produto.cest || null,
          margem_st: item.produto.margem_st || null,
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
        pdv_id: vendaId,
        produto_id: produtoId,
        codigo_produto: item.produto.codigo,
        nome_produto: item.produto.nome,
        descricao_produto: item.produto.descricao,
        quantidade: item.quantidade,
        valor_unitario: precoUnitario,
        valor_subtotal: item.subtotal,
        valor_total_item: item.subtotal,
        tem_desconto: !!item.desconto,
        tipo_desconto: item.desconto?.tipo || null,
        percentual_desconto: item.desconto?.percentualDesconto || null,
        valor_desconto_aplicado: item.desconto?.valorDesconto || 0,
        origem_desconto: item.desconto ? 'manual' : null,
        origem_item: item.pedido_origem_numero ? 'pedido_importado' : 'manual',
        pedido_origem_id: item.pedido_origem_id || null,
        pedido_origem_numero: item.pedido_origem_numero || null,
        // ✅ NOVO: Incluir dados do vendedor do item
        vendedor_id: item.vendedor_id || null,
        vendedor_nome: item.vendedor_nome || null,
        observacao_item: item.observacao || null,
        // ✅ NOVO: Incluir dados da tabela de preços
        tabela_preco_id: item.tabela_preco_id || null,
        tabela_preco_nome: item.tabela_preco_nome || null,
        // ✅ CORREÇÃO: Incluir dados fiscais
        ...dadosFiscais
      };
    });

    // ✅ CORREÇÃO: Verificar itens existentes e fazer UPDATE/INSERT conforme necessário
    setEtapaProcessamento('Salvando itens da venda...');

    if (vendaEmAndamento) {
      // ✅ VENDA EM ANDAMENTO: Sempre verificar itens existentes para UPDATE/INSERT
      // Verificando itens existentes na venda em andamento

      // Buscar itens já salvos na venda
      const { data: itensExistentes, error: buscarError } = await supabase
        .from('pdv_itens')
        .select('id, codigo_produto, produto_id, quantidade, valor_total_item')
        .eq('pdv_id', vendaEmAndamento.id);

      if (buscarError) {
        console.error('❌ Erro ao buscar itens existentes:', buscarError);
        setEtapaProcessamento('Erro ao verificar itens: ' + buscarError.message);
        await new Promise(resolve => setTimeout(resolve, 3000));
        setShowProcessandoVenda(false);
        toast.error('Erro ao verificar itens: ' + buscarError.message);
        return;
      }

      // Itens encontrados para processamento

      // ✅ CORREÇÃO: Processar cada item do carrinho individualmente
      for (const [index, item] of carrinho.entries()) {
        console.log(`🔍 [ITEMDATA DEBUG] ===== PROCESSANDO ITEM ${index + 1} =====`);
        console.log(`🔍 [ITEMDATA DEBUG] Produto: ${item.produto.nome} (Código: ${item.produto.codigo})`);
        console.log(`🔍 [ITEMDATA DEBUG] itensParaInserir.length:`, itensParaInserir.length);
        console.log(`🔍 [ITEMDATA DEBUG] index atual:`, index);
        console.log(`🔍 [ITEMDATA DEBUG] itensParaInserir[${index}]:`, itensParaInserir[index]);

        const itemData = itensParaInserir[index];

        if (!itemData) {
          console.error(`🚨 [ITEMDATA DEBUG] ❌ ERRO: itemData é undefined para o item ${index + 1}`);
          console.error(`🚨 [ITEMDATA DEBUG] Produto: ${item.produto.nome} (Código: ${item.produto.codigo})`);
          console.error(`🚨 [ITEMDATA DEBUG] itensParaInserir completo:`, itensParaInserir);
          console.error(`🚨 [ITEMDATA DEBUG] Este é o problema que causa o erro 'Cannot read properties of undefined'`);
        } else {
          console.log(`✅ [ITEMDATA DEBUG] itemData encontrado:`, itemData);
        }

        // ✅ CORREÇÃO: Verificar se item já existe no banco de dados
        let itemExistente = null;

        if (item.pdv_item_id) {
          // Item tem pdv_item_id - verificar se ainda existe no banco
          itemExistente = itensExistentes?.find(existente => existente.id === item.pdv_item_id);
          // Item verificado no banco
        } else {
          // Item sem pdv_item_id - verificar se já existe por código/produto_id
          if (item.vendaSemProduto) {
            // Para venda sem produto, verificar por código 999999
            itemExistente = itensExistentes?.find(existente => existente.codigo_produto === '999999');
          } else {
            // Para produto normal, verificar por produto_id
            itemExistente = itensExistentes?.find(existente => existente.produto_id === item.produto.id);
          }
          // Item verificado por produto
        }

        if (itemExistente) {
          // ✅ ITEM EXISTE: Fazer UPDATE apenas se veio de venda recuperada
          // Atualizando item existente

          const { error: updateError } = await supabase
            .from('pdv_itens')
            .update({
              quantidade: itemData.quantidade,
              valor_unitario: itemData.valor_unitario,
              valor_total_item: itemData.valor_total_item,
              tem_desconto: itemData.tem_desconto,
              valor_desconto_aplicado: itemData.valor_desconto_aplicado,
              vendedor_id: itemData.vendedor_id,
              vendedor_nome: itemData.vendedor_nome,
              observacao_item: itemData.observacao_item,
              tabela_preco_id: itemData.tabela_preco_id,
              tabela_preco_nome: itemData.tabela_preco_nome,
              updated_at: new Date().toISOString()
            })
            .eq('id', itemExistente.id);

          if (updateError) {
            console.error(`❌ Erro ao atualizar item ${item.produto.nome}:`, updateError);
            throw new Error(`Erro ao atualizar item: ${updateError.message}`);
          }

          // Item atualizado com sucesso
        } else {
          // ✅ ITEM NÃO EXISTE OU É NOVO: Sempre fazer INSERT
          // Inserindo novo item

          const { error: insertError } = await supabase
            .from('pdv_itens')
            .insert(itemData);

          if (insertError) {
            console.error(`❌ Erro ao inserir item ${item.produto.nome}:`, insertError);
            throw new Error(`Erro ao inserir item: ${insertError.message}`);
          }

          // Item inserido com sucesso
        }
      }

      // Todos os itens processados
    } else {
      // ✅ VENDA NOVA: Inserir apenas itens que ainda não foram salvos
      if (itensParaInserir.length > 0) {
        const { error: itensError } = await supabase
          .from('pdv_itens')
          .insert(itensParaInserir);

        if (itensError) {
          console.error('❌ Erro ao inserir itens:', itensError);
          setEtapaProcessamento('Erro ao salvar itens: ' + itensError.message);
          await new Promise(resolve => setTimeout(resolve, 3000));
          setShowProcessandoVenda(false);
          toast.error('Erro ao salvar itens: ' + itensError.message);
          return;
        }
      }
    }
