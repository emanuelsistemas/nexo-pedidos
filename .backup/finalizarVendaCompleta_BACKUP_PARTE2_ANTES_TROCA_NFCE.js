// ✅ BACKUP DA FUNÇÃO finalizarVendaCompleta - PARTE 2
// Data: 2025-01-31
// Continuação do backup da função antes da implementação de NFC-e para trocas

// ... [CONTINUAÇÃO DA FUNÇÃO finalizarVendaCompleta] ...

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

    // ✅ NOVO: CONTROLE DE FIADO - Atualizar saldo devedor do cliente
    if (isVendaFiado && clienteData.cliente_id && valorFiado > 0) {
      setEtapaProcessamento('Atualizando saldo devedor do cliente...');

      try {
        // Buscar saldo atual do cliente
        const { data: clienteAtual, error: clienteError } = await supabase
          .from('clientes')
          .select('saldo_devedor')
          .eq('id', clienteData.cliente_id)
          .single();

        if (clienteError) {
          console.error('❌ Erro ao buscar saldo do cliente:', clienteError);
        } else {
          const saldoAtual = clienteAtual?.saldo_devedor || 0;
          const novoSaldo = saldoAtual + valorFiado;

          // Atualizar saldo devedor do cliente
          const { error: updateSaldoError } = await supabase
            .from('clientes')
            .update({
              saldo_devedor: novoSaldo,
              updated_at: new Date().toISOString()
            })
            .eq('id', clienteData.cliente_id);

          if (updateSaldoError) {
            console.error('❌ Erro ao atualizar saldo devedor:', updateSaldoError);
            // ✅ NÃO parar a venda por erro de saldo - apenas logar
          } else {
            console.log(`✅ Saldo devedor atualizado: ${clienteData.nome_cliente} - R$ ${novoSaldo.toFixed(2)}`);
          }
        }
      } catch (saldoError) {
        console.error('❌ Erro inesperado ao atualizar saldo devedor:', saldoError);
        // ✅ NÃO parar a venda por erro de saldo - apenas logar
      }
    }

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
    const itensNaoSalvos = carrinho.filter(item => !item.pdv_item_id);
    const itensJaSalvos = carrinho.filter(item => item.pdv_item_id);

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

    // ... [CONTINUA NO PRÓXIMO ARQUIVO] ...
