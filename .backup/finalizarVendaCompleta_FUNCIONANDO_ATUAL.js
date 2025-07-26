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
          const itemData = itensParaInserir[index];

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

      // ✅ CORREÇÃO: Processar opções adicionais com verificação de duplicação
      const itensComAdicionais = carrinho.filter(item => item.adicionais && item.adicionais.length > 0);
      if (itensComAdicionais.length > 0) {
        setEtapaProcessamento('Salvando opções adicionais...');
        console.log('🔍 FRONTEND: Processando adicionais para', itensComAdicionais.length, 'itens');

        for (const [index, item] of itensComAdicionais.entries()) {
          // ✅ CORREÇÃO: Buscar item considerando venda sem produto
          const produtoId = item.vendaSemProduto ? null : item.produto.id;

          let query = supabase
            .from('pdv_itens')
            .select('id')
            .eq('pdv_id', vendaId)
            .eq('codigo_produto', item.produto.codigo);

          // Adicionar filtro de produto_id apenas se não for venda sem produto
          if (!item.vendaSemProduto) {
            query = query.eq('produto_id', produtoId);
          } else {
            query = query.is('produto_id', null);
          }

          const { data: itemInserido } = await query
            .limit(1)
            .maybeSingle();

          if (itemInserido && item.adicionais) {
            console.log(`🔍 FRONTEND: Processando ${item.adicionais.length} adicionais para item: ${item.produto.nome} (ID: ${itemInserido.id})`);

            // ✅ CORREÇÃO: Abordagem simplificada - sempre remover e reinserir adicionais
            if (vendaEmAndamento) {
              // ✅ VENDA EM ANDAMENTO: Remover todos os adicionais antigos e inserir os novos
              console.log(`🔄 FRONTEND: Removendo adicionais antigos e inserindo novos para: ${item.produto.nome}`);

              // 1. Marcar todos os adicionais antigos como deletados
              const { error: deleteError } = await supabase
                .from('pdv_itens_adicionais')
                .update({
                  deletado: true,
                  deletado_em: new Date().toISOString(),
                  deletado_por: userData.user.id
                })
                .eq('pdv_item_id', itemInserido.id)
                .eq('deletado', false);

              if (deleteError) {
                console.error(`❌ Erro ao remover adicionais antigos:`, deleteError);
                throw new Error(`Erro ao remover adicionais antigos: ${deleteError.message}`);
              }

              console.log(`✅ FRONTEND: Adicionais antigos removidos para: ${item.produto.nome}`);

              // 2. Inserir todos os adicionais atuais do carrinho
              if (item.adicionais && item.adicionais.length > 0) {
                const adicionaisParaInserir = item.adicionais.map(adicional => ({
                  empresa_id: usuarioData.empresa_id,
                  usuario_id: userData.user.id,
                  pdv_item_id: itemInserido.id,
                  item_adicional_id: adicional.id,
                  nome_adicional: adicional.nome,
                  quantidade: adicional.quantidade,
                  valor_unitario: adicional.preco,
                  valor_total: adicional.preco * adicional.quantidade,
                  origem_adicional: 'manual'
                }));

                const { error: insertError } = await supabase
                  .from('pdv_itens_adicionais')
                  .insert(adicionaisParaInserir);

                if (insertError) {
                  console.error(`❌ Erro ao inserir novos adicionais:`, insertError);
                  throw new Error(`Erro ao inserir novos adicionais: ${insertError.message}`);
                }

                console.log(`✅ FRONTEND: ${adicionaisParaInserir.length} novos adicionais inseridos para: ${item.produto.nome}`);
              }
            } else {
              // ✅ VENDA NOVA: Inserir todos os adicionais normalmente
              console.log('➕ FRONTEND: Inserindo todos os adicionais (venda nova)...');

              const adicionaisParaInserir = item.adicionais.map(adicional => ({
                empresa_id: usuarioData.empresa_id,
                usuario_id: userData.user.id,
                pdv_item_id: itemInserido.id,
                item_adicional_id: adicional.id,
                nome_adicional: adicional.nome,
                quantidade: adicional.quantidade,
                valor_unitario: adicional.preco,
                valor_total: adicional.preco * adicional.quantidade,
                origem_adicional: 'manual'
              }));

              const { error: adicionaisError } = await supabase
                .from('pdv_itens_adicionais')
                .insert(adicionaisParaInserir);

              if (adicionaisError) {
                console.error('❌ Erro ao inserir adicionais:', adicionaisError);
                throw new Error(`Erro ao inserir adicionais: ${adicionaisError.message}`);
              }

              console.log(`✅ FRONTEND: ${adicionaisParaInserir.length} adicionais inseridos para: ${item.produto.nome}`);
            }
          }
        }

        console.log('✅ FRONTEND: Todos os adicionais processados com sucesso');
      }

      // Atualizar estoque se configurado para PDV
      if (tipoControle === 'pdv') {
        setEtapaProcessamento('Atualizando estoque...');
        // Iniciando baixa de estoque

        for (const item of carrinho) {
          // ✅ EXCEÇÃO: Pular controle de estoque para venda sem produto (código 999999)
          if (item.vendaSemProduto || item.produto.codigo === '999999') {
            // Pulando controle de estoque para venda sem produto
            continue;
          }

          // Baixando estoque do produto

          const { error: estoqueError } = await supabase.rpc('atualizar_estoque_produto', {
            p_produto_id: item.produto.id,
            p_quantidade: -item.quantidade, // Quantidade negativa para baixa
            p_tipo_operacao: 'venda_pdv',
            p_observacao: `Venda PDV #${numeroVenda}`
          });

          if (estoqueError) {
            console.error('❌ FRONTEND: Erro ao atualizar estoque:', estoqueError);
            setEtapaProcessamento('ERRO: Falha na baixa de estoque: ' + estoqueError.message);
            await new Promise(resolve => setTimeout(resolve, 3000));
            setShowProcessandoVenda(false);
            toast.error('ERRO: Falha na baixa de estoque: ' + estoqueError.message);
            return;
          } else {
            // Estoque baixado com sucesso
          }
        }
        // Baixa de estoque concluída

        // Aguardar um pouco para garantir que todas as movimentações foram processadas
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // VERIFICAÇÃO CRÍTICA: Confirmar se tudo foi salvo corretamente
      // ✅ CORREÇÃO: Usar total de itens esperados (incluindo já salvos + novos inseridos)
      const totalItensEsperados = itensJaSalvos.length + itensParaInserir.length;
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

        try {
          const dataFaturamento = new Date().toISOString();

          for (const pedido of pedidosImportados) {
            const { error: pedidoError } = await supabase
              .from('pedidos')
              .update({
                status: 'faturado',
                data_faturamento: dataFaturamento,
                observacao_faturamento: `Faturado via PDV - Venda #${numeroVenda}`
              })
              .eq('id', pedido.id);

            if (pedidoError) {
              console.error(`Erro ao atualizar pedido ${pedido.numero}:`, pedidoError);
              // Não interrompe o processo, apenas loga o erro
            }
          }

          // Disparar eventos do sistema para cada pedido faturado
          for (const pedido of pedidosImportados) {
            // Disparar evento padrão do sistema
            window.dispatchEvent(new CustomEvent(EVENT_TYPES.PEDIDO_FATURADO, {
              detail: {
                pedidoId: pedido.id,
                numero: pedido.numero,
                status: 'faturado',
                empresaId: usuarioData.empresa_id,
                valorTotal: pedido.valor_total || 0,
                clienteNome: pedido.cliente?.nome,
                action: 'invoiced'
              }
            }));
          }

          // Disparar evento customizado adicional
          window.dispatchEvent(new CustomEvent('pedidoStatusChanged', {
            detail: {
              pedidosIds: pedidosImportados.map(p => p.id),
              novoStatus: 'faturado',
              numeroVenda: numeroVenda
            }
          }));

        } catch (error) {
          console.error('Erro ao atualizar status dos pedidos:', error);
          // Não interrompe o processo, pois a venda já foi salva com sucesso
        }
      }

      // VERIFICAR SE É EMISSÃO DE NFC-e
      if (tipoFinalizacao.startsWith('nfce_')) {
        // Iniciando processo de emissão NFC-e

        setEtapaProcessamento('Carregando dados da empresa...');

        // ✅ CORREÇÃO: Buscar dados da empresa (igual à NFe que funciona)
        // Buscando dados da empresa
        const { data: empresaData } = await supabase
          .from('empresas')
          .select('*')
          .eq('id', usuarioData.empresa_id)
          .single();

        if (!empresaData) {
          throw new Error('Dados da empresa não encontrados');
        }
        // Dados da empresa carregados

        // ✅ NOVO: Buscar série da NFC-e do usuário logado
        // Buscando série da NFC-e
        const { data: usuarioSerieData } = await supabase
          .from('usuarios')
          .select('serie_nfce')
          .eq('id', userData.user.id)
          .single();

        const serieUsuario = usuarioSerieData?.serie_nfce || 1; // Fallback para série 1
        // Série da NFC-e obtida

        // Buscar configuração NFe
        // Buscando configuração NFe
        const { data: nfeConfigData, error: nfeConfigError } = await supabase
          .from('nfe_config')
          .select('ambiente')
          .eq('empresa_id', usuarioData.empresa_id)
          .single();

        if (nfeConfigError) {
          console.error('❌ FRONTEND: Erro na consulta nfe_config:', nfeConfigError);
          throw new Error(`Erro ao buscar configuração NFe: ${nfeConfigError.message}`);
        }

        if (!nfeConfigData) {
          throw new Error('Configuração NFe não encontrada');
        }
        // Configuração NFe carregada

        setEtapaProcessamento('Preparando dados para NFC-e...');

        try {
          // ✅ NOVO: Validar se número foi salvo corretamente
          setEtapaProcessamento('Validando numeração da NFC-e...');
          // Validando número NFC-e

          const { data: vendaSalva, error: validacaoError } = await supabase
            .from('pdv')
            .select('numero_documento, modelo_documento')
            .eq('id', vendaId)
            .single();

          if (validacaoError || !vendaSalva) {
            throw new Error('Erro ao validar venda salva');
          }

          if (!vendaSalva.numero_documento) {
            throw new Error('Número da NFC-e não foi reservado corretamente');
          }

          const proximoNumero = vendaSalva.numero_documento;

          const codigoNumerico = Math.floor(10000000 + Math.random() * 90000000).toString();

          // ✅ CORREÇÃO: Calcular codigo_uf a partir do estado
          const getCodigoUF = (estado: string): number => {
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
              cnpj: empresaData.documento, // Campo correto é 'documento'
              nome_fantasia: empresaData.nome_fantasia,
              inscricao_estadual: empresaData.inscricao_estadual,
              regime_tributario: empresaData.regime_tributario || 1,
              uf: empresaData.estado, // Campo correto é 'estado'
              codigo_municipio: parseInt(empresaData.codigo_municipio) || 3524402, // Converter para int
              codigo_uf: getCodigoUF(empresaData.estado), // ✅ CORREÇÃO: Calcular a partir do estado
              endereco: {
                logradouro: empresaData.endereco,
                numero: empresaData.numero,
                bairro: empresaData.bairro,
                cidade: empresaData.cidade,
                cep: empresaData.cep
              },
              // Campos CSC para NFC-e
              csc_homologacao: empresaData.csc_homologacao,
              csc_id_homologacao: empresaData.csc_id_homologacao,
              csc_producao: empresaData.csc_producao,
              csc_id_producao: empresaData.csc_id_producao
            },
            // ✅ CORREÇÃO: Adicionar ambiente (igual à NFe que funciona)
            ambiente: nfeConfigData.ambiente, // 'producao' ou 'homologacao'
            identificacao: {
              numero: proximoNumero,
              serie: serieUsuario, // ✅ NOVO: Série individual do usuário logado
              codigo_numerico: codigoNumerico,
              natureza_operacao: 'Venda de mercadoria'
            },
            // ✅ CORREÇÃO: Usar CPF/CNPJ digitado mesmo se cliente não foi encontrado
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
              codigo: item.produto.codigo, // Código real do produto (SEM FALLBACK)
              descricao: item.produto.nome,
              quantidade: item.quantidade,
              valor_unitario: item.produto.preco,
              // ✅ CORREÇÃO: Para venda sem produto, usar unidade_medida diretamente
              unidade: item.vendaSemProduto ? item.produto.unidade_medida : item.produto.unidade_medida?.sigla,
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



          if (!nfceResponse.ok) {
            console.error('❌ [EMISSÃO NFC-e] Resposta com erro HTTP:', nfceResponse.status);

            // ✅ CORREÇÃO: Capturar e mostrar erro específico do backend
            let errorResponse;
            try {
              errorResponse = await nfceResponse.text();
            } catch (textError) {
              console.error('❌ [EMISSÃO NFC-e] Erro ao ler resposta de erro:', textError);
              throw new Error(`Erro HTTP ${nfceResponse.status}: ${nfceResponse.statusText}`);
            }

            // Tentar fazer parse JSON da resposta de erro
            try {
              const errorJson = JSON.parse(errorResponse);

              // ✅ CORREÇÃO: Mostrar mensagem específica do backend
              const mensagemErro = errorJson.error || errorJson.message || 'Erro desconhecido do backend';
              throw new Error(mensagemErro);
            } catch (jsonError) {
              // ✅ CORREÇÃO: Se jsonError for a mensagem específica, usar ela
              if (jsonError instanceof Error && jsonError.message.includes('Status')) {
                throw jsonError; // Re-lançar o erro específico
              }

              // ✅ CORREÇÃO: Verificar se errorResponse contém mensagem específica
              if (errorResponse.includes('ERRO:') || errorResponse.includes('Status')) {
                throw new Error(errorResponse);
              }

              // Se não conseguir fazer parse, mostrar resposta bruta (limitada)
              const mensagemErro = errorResponse.length > 200
                ? errorResponse.substring(0, 200) + '...'
                : errorResponse;
              throw new Error(`Erro de comunicação: ${mensagemErro}`);
            }
          }

          // Processar resposta de sucesso
          let nfceResult;
          try {
            const responseText = await nfceResponse.text();

            nfceResult = JSON.parse(responseText);
          } catch (parseError) {
            console.error('❌ [EMISSÃO NFC-e] Erro ao parsear resposta de sucesso:', parseError);
            throw new Error('Resposta inválida do servidor de NFC-e');
          }

          if (!nfceResult.success) {
            console.error('❌ [EMISSÃO NFC-e] Backend retornou erro:', nfceResult);
            // ✅ CORREÇÃO: Mostrar mensagem específica do backend sem prefixo genérico
            throw new Error(nfceResult.error || 'Erro desconhecido na emissão da NFC-e');
          }

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
            // Não interrompe o processo, pois a NFC-e já foi emitida
          } else {
            // Venda atualizada com dados da NFC-e
          }

          // Para NFC-e, fechar automaticamente após 2 segundos de sucesso
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (nfceError) {
          setStatusProcessamento('erro');

          // ✅ CORREÇÃO: Usar mensagem específica do erro
          const mensagemErroEspecifica = (nfceError as Error).message;

          // ✅ NOVO: Atualizar venda com status pendente quando há erro na NFC-e
          try {
            const { error: updateError } = await supabase
              .from('pdv')
              .update({
                status_fiscal: 'pendente', // ✅ Marcar como pendente para correção
                erro_fiscal: mensagemErroEspecifica // ✅ Salvar erro para análise
              })
              .eq('id', vendaId);

            if (updateError) {
              // Erro ao atualizar status da venda
            } else {
              // Venda marcada como pendente devido ao erro na NFC-e
            }
          } catch (updateError) {
            // Erro ao atualizar venda com erro
          }

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

      // VERIFICAR SE É FINALIZAÇÃO COM IMPRESSÃO
      if (tipoFinalizacao === 'finalizar_com_impressao') {
        setEtapaProcessamento('Carregando dados da empresa...');

        try {
          // Buscar dados da empresa para impressão
          const { data: empresaData } = await supabase
            .from('empresas')
            .select('*')
            .eq('id', usuarioData.empresa_id)
            .single();

          if (!empresaData) {
            throw new Error('Dados da empresa não encontrados para impressão');
          }

          setEtapaProcessamento('Preparando cupom para impressão...');

          // Preparar dados completos para impressão
          const dadosImpressaoCompletos = {
            venda: {
              id: vendaId,
              numero: numeroVenda,
              data: new Date().toLocaleString('pt-BR'),
              valor_total: valorTotal,
              valor_subtotal: valorSubtotal,
              valor_desconto: valorDesconto,
              valor_desconto_itens: Math.round(calcularDescontoItens() * 100) / 100,
              valor_desconto_total: Math.round(descontoGlobal * 100) / 100,
              observacao_venda: observacaoVenda || null // ✅ CORREÇÃO: Incluir observação da venda
            },
            empresa: {
              razao_social: empresaData.razao_social,
              nome_fantasia: empresaData.nome_fantasia,
              cnpj: empresaData.documento,
              inscricao_estadual: empresaData.inscricao_estadual,
              endereco: `${empresaData.endereco}, ${empresaData.numero}`,
              bairro: empresaData.bairro,
              cidade: empresaData.cidade,
              uf: empresaData.estado,
              cep: empresaData.cep,
              telefone: empresaData.telefone
            },
            cliente: clienteData || {},
            vendedor: vendedorSelecionado || null, // Incluir dados do vendedor principal
            vendedores: (() => {
              // Coletar todos os vendedores únicos do carrinho
              const vendedoresUnicos = new Map();
              carrinho.forEach(item => {
                if (item.vendedor_id && item.vendedor_nome) {
                  vendedoresUnicos.set(item.vendedor_id, item.vendedor_nome);
                }
              });
              return Array.from(vendedoresUnicos.entries()).map(([id, nome]) => ({ id, nome }));
            })(),
            operador: userData || null, // Incluir dados do operador (usuário atual)
            itens: carrinho.map(item => ({
              codigo: item.produto.codigo,
              nome: item.descricaoSabores ?
                `${item.produto.nome}\n${item.descricaoSabores}` :
                item.produto.nome, // ✅ NOVO: Incluir sabores na impressão
              quantidade: item.quantidade,
              valor_unitario: item.produto.preco,
              valor_total: item.subtotal,
              unidade: item.vendaSemProduto ? 'UN' : (item.produto.unidade_medida?.sigla || 'UN'), // ✅ NOVO: Incluir unidade de medida do carrinho
              vendedor_id: item.vendedor_id || null,
              vendedor_nome: item.vendedor_nome || null,
              adicionais: item.adicionais || [], // ✅ NOVO: Incluir adicionais
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

        } catch (impressaoError) {
          console.error('❌ FRONTEND: Erro na preparação da impressão:', impressaoError);
          // Continuar sem impressão
          setEtapaProcessamento('Erro na preparação da impressão, mas venda foi salva com sucesso');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // ✅ NOVO: VERIFICAR SE É NFC-e COM IMPRESSÃO
      if (tipoFinalizacao === 'nfce_com_impressao') {
        console.log('🖨️ FRONTEND: NFC-e emitida com sucesso, preparando dados para impressão');
        setEtapaProcessamento('Carregando dados da empresa para impressão...');

        try {
          // Buscar dados da empresa para impressão
          const { data: empresaData } = await supabase
            .from('empresas')
            .select('*')
            .eq('id', usuarioData.empresa_id)
            .single();

          if (!empresaData) {
            throw new Error('Dados da empresa não encontrados para impressão');
          }

          console.log('🏢 FRONTEND: Dados da empresa carregados para impressão da NFC-e:', empresaData.razao_social);
          setEtapaProcessamento('Preparando cupom da NFC-e para impressão...');

          // Buscar dados atualizados da venda (com chave da NFC-e)
          const { data: vendaAtualizada } = await supabase
            .from('pdv')
            .select('*')
            .eq('id', vendaId)
            .single();

          // Preparar dados completos para impressão da NFC-e
          const dadosImpressaoNfce = {
            venda: {
              id: vendaId,
              numero: numeroVenda,
              data: new Date().toLocaleString('pt-BR'),
              valor_total: valorTotal,
              valor_subtotal: valorSubtotal,
              valor_desconto: valorDesconto,
              valor_desconto_itens: Math.round(calcularDescontoItens() * 100) / 100,
              valor_desconto_total: Math.round(descontoGlobal * 100) / 100,
              chave_nfe: vendaAtualizada?.chave_nfe || null,
              numero_nfe: vendaAtualizada?.numero_documento || null,
              serie_nfe: serieDocumentoReservado, // ✅ CORREÇÃO: Usar série do modal que já está correta
              protocolo_nfe: vendaAtualizada?.protocolo_nfe || null,
              data_emissao: vendaAtualizada?.data_emissao_nfe ? new Date(vendaAtualizada.data_emissao_nfe).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
              hora_emissao: vendaAtualizada?.data_emissao_nfe ? new Date(vendaAtualizada.data_emissao_nfe).toLocaleTimeString('pt-BR') : new Date().toLocaleTimeString('pt-BR'),
              data_autorizacao: vendaAtualizada?.data_emissao_nfe ? new Date(vendaAtualizada.data_emissao_nfe).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
              hora_autorizacao: vendaAtualizada?.data_emissao_nfe ? new Date(vendaAtualizada.data_emissao_nfe).toLocaleTimeString('pt-BR') : new Date().toLocaleTimeString('pt-BR'),
              observacao_venda: observacaoVenda || null // ✅ CORREÇÃO: Incluir observação da venda
            },
            empresa: {
              razao_social: empresaData.razao_social,
              nome_fantasia: empresaData.nome_fantasia,
              cnpj: empresaData.documento,
              inscricao_estadual: empresaData.inscricao_estadual,
              endereco: `${empresaData.endereco}, ${empresaData.numero}`,
              bairro: empresaData.bairro,
              cidade: empresaData.cidade,
              uf: empresaData.estado,
              cep: empresaData.cep,
              telefone: empresaData.telefone
            },
            cliente: {
              ...clienteData,
              documento_cliente: vendaAtualizada?.documento_cliente || clienteData?.documento_cliente || null
            },
            vendedor: vendedorSelecionado || null, // Incluir dados do vendedor principal
            vendedores: (() => {
              // Coletar todos os vendedores únicos do carrinho
              const vendedoresUnicos = new Map();
              carrinho.forEach(item => {
                if (item.vendedor_id && item.vendedor_nome) {
                  vendedoresUnicos.set(item.vendedor_id, item.vendedor_nome);
                }
              });
              return Array.from(vendedoresUnicos.entries()).map(([id, nome]) => ({ id, nome }));
            })(),
            operador: userData || null, // Incluir dados do operador (usuário atual)
            itens: carrinho.map(item => ({
              codigo: item.produto.codigo,
              nome: item.descricaoSabores ?
                `${item.produto.nome}\n${item.descricaoSabores}` :
                item.produto.nome, // ✅ NOVO: Incluir sabores na impressão
              quantidade: item.quantidade,
              valor_unitario: item.produto.preco,
              valor_total: item.subtotal,
              unidade: item.vendaSemProduto ? 'UN' : (item.produto.unidade_medida?.sigla || 'UN'), // ✅ NOVO: Incluir unidade de medida do carrinho
              vendedor_id: item.vendedor_id || null,
              vendedor_nome: item.vendedor_nome || null,
              adicionais: item.adicionais || [], // ✅ NOVO: Incluir adicionais
              sabores: item.sabores || null // ✅ NOVO: Incluir sabores para referência
            })),
            pagamento: pagamentoData,
            timestamp: new Date().toISOString(),
            tipo: 'nfce' // Identificar que é NFC-e
          };

          // Salvar dados de impressão no estado
          setDadosImpressao(dadosImpressaoNfce);

          console.log('🖨️ FRONTEND: Dados da NFC-e preparados, aguardando ação do usuário');
          setEtapaProcessamento('NFC-e emitida com sucesso! Deseja imprimir o cupom fiscal?');
          setStatusProcessamento('aguardando_impressao');

          // NÃO continuar automaticamente - aguardar ação do usuário no modal
          return;

        } catch (impressaoError) {
          console.error('❌ FRONTEND: Erro na preparação da impressão da NFC-e:', impressaoError);
          // Continuar sem impressão
          setEtapaProcessamento('NFC-e emitida com sucesso, mas erro na preparação da impressão');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // SUCESSO CONFIRMADO!
      const mensagemSucesso = (() => {
        if (tipoFinalizacao === 'nfce_com_impressao') {
          return 'Venda finalizada e NFC-e emitida com sucesso!';
        } else if (tipoFinalizacao.startsWith('nfce_')) {
          return 'Venda finalizada e NFC-e emitida com sucesso!';
        } else if (tipoFinalizacao === 'finalizar_com_impressao') {
          return 'Venda finalizada e impressa com sucesso!';
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

      // Recarregar estoque se necessário
      if (pdvConfig?.baixa_estoque_pdv) {
        loadEstoque();
      }

      // Atualizar contador de NFC-e pendentes se foi uma venda com NFC-e
      if (tipoFinalizacao.startsWith('nfce_')) {
        loadContadorNfcePendentes();
      }

    } catch (error) {
      console.error('Erro ao finalizar venda:', error);

      // ✅ CORREÇÃO: Não sobrescrever erros específicos da NFC-e
      const mensagemErro = (error as Error).message;
      console.log('🔍 FRONTEND: Erro capturado no catch externo:', mensagemErro);

      // Se o erro já foi tratado pela NFC-e, não sobrescrever
      if (statusProcessamento === 'erro') {
        console.log('🔍 FRONTEND: Erro já tratado pela NFC-e, não sobrescrevendo');
        return;
      }

      setEtapaProcessamento('ERRO INESPERADO: ' + mensagemErro);
      await new Promise(resolve => setTimeout(resolve, 3000));
      setShowProcessandoVenda(false);
      toast.error('Erro inesperado ao finalizar venda');
    }
  };
