import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronDown, Clock, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Minus, Plus, ShoppingCart, X, Trash2, CheckCircle, ArrowDown, List, Package, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showMessage } from '../../utils/toast';
import FotoGaleria from '../../components/comum/FotoGaleria';

interface Produto {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  foto_url?: string;
  grupo_id: string;
  grupo_nome?: string;
  ativo: boolean;
  produto_fotos?: Array<{
    id: string;
    url: string;
    principal: boolean;
  }>;
  fotos_count?: number;
  unidade_medida?: {
    id: string;
    sigla: string;
    nome: string;
    fracionado: boolean;
  };
  opcoes_adicionais?: Array<{
    id: string;
    nome: string;
    itens: Array<{
      id: string;
      nome: string;
      preco: number;
    }>;
  }>;
}

interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
  adicionais?: Array<{
    id: string;
    nome: string;
    preco: number;
    quantidade: number;
  }>;
}

interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia: string;
  whatsapp?: string;
  telefones?: Array<{
    numero: string;
    tipo: string;
    whatsapp: boolean;
  }>;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  logo_url?: string;
}

interface HorarioAtendimento {
  id: string;
  dia_semana: number;
  hora_abertura: string;
  hora_fechamento: string;
}

interface CardapioConfig {
  mostrar_precos: boolean;
  permitir_pedidos: boolean;
  modo_escuro: boolean;
  mostrar_fotos: boolean;
  cardapio_fotos_minimizadas?: boolean;
}

const CardapioPublicoPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [horarios, setHorarios] = useState<HorarioAtendimento[]>([]);
  const [horariosExpanded, setHorariosExpanded] = useState(false);
  const [proximaAbertura, setProximaAbertura] = useState<Date | null>(null);
  const [contadorRegressivo, setContadorRegressivo] = useState<string>('');
  const [modoAutomatico, setModoAutomatico] = useState<boolean>(false);
  const [proximoFechamento, setProximoFechamento] = useState<Date | null>(null);
  const [contadorFechamento, setContadorFechamento] = useState<string>('');
  const [mostrarAvisoFechamento, setMostrarAvisoFechamento] = useState<boolean>(false);
  const [lojaAberta, setLojaAberta] = useState<boolean | null>(null);
  const [config, setConfig] = useState<CardapioConfig>({
    mostrar_precos: true,
    permitir_pedidos: true,
    modo_escuro: false,
    mostrar_fotos: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [grupoSelecionado, setGrupoSelecionado] = useState<string>('todos');
  const [termoPesquisa, setTermoPesquisa] = useState<string>('');
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  // Estados para navegação horizontal das categorias
  const [categoriaStartIndex, setCategoriaStartIndex] = useState(0);
  const [visibleCategoriaItems, setVisibleCategoriaItems] = useState(4);
  const [isAnimating, setIsAnimating] = useState(false);

  // Estados para suporte a arrastar no mobile
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);

  // Estados para controle de quantidade dos produtos
  const [quantidadesProdutos, setQuantidadesProdutos] = useState<Record<string, number>>({});
  const [produtoEditandoQuantidade, setProdutoEditandoQuantidade] = useState<string | null>(null);

  // Estados para o modal do carrinho
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
  const [carrinhoRecemAberto, setCarrinhoRecemAberto] = useState(false);
  const [itemEditandoCarrinho, setItemEditandoCarrinho] = useState<string | null>(null);
  const [modalConfirmacaoAberto, setModalConfirmacaoAberto] = useState(false);
  const [modalTodosItensAberto, setModalTodosItensAberto] = useState(false);
  const [toastVisivel, setToastVisivel] = useState(false);
  const [ordemAdicaoItens, setOrdemAdicaoItens] = useState<Record<string, number>>({});
  const [itemChacoalhando, setItemChacoalhando] = useState<string | null>(null);
  const [itemEditandoQuantidade, setItemEditandoQuantidade] = useState<string | null>(null);

  // Estados para galeria de fotos
  const [galeriaAberta, setGaleriaAberta] = useState(false);
  const [fotosProdutoSelecionado, setFotosProdutoSelecionado] = useState<Array<{id: string; url: string; principal?: boolean}>>([]);
  const [fotoInicialIndex, setFotoInicialIndex] = useState(0);

  // Estados para adicionais
  const [adicionaisExpandidos, setAdicionaisExpandidos] = useState<{[produtoId: string]: {[opcaoId: string]: boolean}}>({});
  const [adicionaisSelecionados, setAdicionaisSelecionados] = useState<{[produtoId: string]: {[itemId: string]: number}}>({});

  // Atualizar meta tags para preview do WhatsApp quando empresa for carregada
  useEffect(() => {
    if (empresa && slug) {
      const nomeEmpresa = empresa.nome_fantasia || empresa.razao_social;
      const logoUrl = empresa.logo_url || '';
      const cardapioUrl = `https://nexo.emasoftware.app/cardapio/${slug}`;

      // Atualizar título da página
      document.title = `${nomeEmpresa} - Cardápio Digital`;

      // Função para atualizar ou criar meta tag
      const updateMetaTag = (property: string, content: string) => {
        let metaTag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
        if (!metaTag) {
          metaTag = document.createElement('meta');
          metaTag.setAttribute('property', property);
          document.head.appendChild(metaTag);
        }
        metaTag.setAttribute('content', content);
      };

      // Atualizar meta tags Open Graph para WhatsApp
      updateMetaTag('og:title', nomeEmpresa);
      updateMetaTag('og:description', 'Consulte o cardápio e faça seu pedido');
      updateMetaTag('og:url', cardapioUrl);
      updateMetaTag('og:type', 'website');
      updateMetaTag('og:site_name', 'Nexo Pedidos');

      if (logoUrl) {
        updateMetaTag('og:image', logoUrl);
        updateMetaTag('og:image:width', '400');
        updateMetaTag('og:image:height', '400');
        updateMetaTag('og:image:alt', `Logo ${nomeEmpresa}`);
      }

      // Meta tags para Twitter
      updateMetaTag('twitter:card', 'summary_large_image');
      updateMetaTag('twitter:title', nomeEmpresa);
      updateMetaTag('twitter:description', 'Consulte o cardápio e faça seu pedido');
      if (logoUrl) {
        updateMetaTag('twitter:image', logoUrl);
      }

      console.log('🔗 Meta tags atualizadas para:', nomeEmpresa);
    }
  }, [empresa, slug]);

  useEffect(() => {
    if (slug) {
      carregarDadosCardapio();
    }
  }, [slug]);

  // Configurar realtime para monitorar mudanças no status da loja
  useEffect(() => {
    if (!empresaId) return;

    console.log('🔔 Configurando realtime para empresa:', empresaId);

    // Criar canal único para esta empresa
    const channelName = `cardapio_loja_status_${empresaId}`;

    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true },
          presence: { key: empresaId }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pdv_config',
          filter: `empresa_id=eq.${empresaId}`
        },
        (payload) => {
          console.log('🔄 Cardápio: Atualização realtime recebida:', payload);
          console.log('🔄 Payload completo:', JSON.stringify(payload, null, 2));

          if (payload.new && payload.new.cardapio_loja_aberta !== undefined) {
            const novoStatus = payload.new.cardapio_loja_aberta;
            console.log('✅ Atualizando status da loja de', lojaAberta, 'para', novoStatus);
            setLojaAberta(novoStatus);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Status da subscrição realtime:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime conectado com sucesso para empresa:', empresaId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Erro na conexão realtime');
        }
      });

    return () => {
      console.log('🔔 Removendo canal realtime');
      supabase.removeChannel(channel);
    };
  }, [empresaId]);

  // Polling como backup para garantir sincronização
  useEffect(() => {
    if (!empresaId) return;

    console.log('⏰ Configurando polling de backup para empresa:', empresaId);

    const interval = setInterval(async () => {
      try {
        const { data: statusData, error } = await supabase
          .from('pdv_config')
          .select('cardapio_loja_aberta')
          .eq('empresa_id', empresaId)
          .single();

        if (!error && statusData && statusData.cardapio_loja_aberta !== lojaAberta) {
          console.log('🔄 Polling: Status diferente detectado, atualizando de', lojaAberta, 'para', statusData.cardapio_loja_aberta);
          setLojaAberta(statusData.cardapio_loja_aberta);
        }
      } catch (error) {
        console.error('❌ Erro no polling:', error);
      }
    }, 3000); // Verificar a cada 3 segundos

    return () => {
      console.log('⏰ Removendo polling de backup');
      clearInterval(interval);
    };
  }, [empresaId, lojaAberta]);

  // Monitor para mudanças no estado lojaAberta
  useEffect(() => {
    console.log('🔄 Estado lojaAberta mudou para:', lojaAberta);
    if (lojaAberta === false) {
      console.log('🔴 Tarja deve aparecer agora');
    } else if (lojaAberta === true) {
      console.log('🟢 Tarja deve desaparecer agora');
    } else {
      console.log('⚪ Status ainda carregando');
    }
  }, [lojaAberta]);

  // Monitor para mudanças no estado da empresa
  useEffect(() => {
    console.log('🏢 Estado da empresa mudou:', empresa);
    if (empresa) {
      console.log('🏢 Nome da empresa:', empresa.nome_fantasia || empresa.razao_social);
    } else {
      console.log('❌ Empresa está null/undefined');
    }
  }, [empresa]);

  // Teste simples de realtime para horários de atendimento
  useEffect(() => {
    if (!empresaId) return;

    console.log('🧪 TESTE: Configurando realtime para horários - empresa:', empresaId);

    const channel = supabase
      .channel(`teste_horarios_${empresaId}_${Date.now()}`, {
        config: {
          broadcast: { self: true }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'horario_atendimento',
          filter: `empresa_id=eq.${empresaId}`
        },
        (payload) => {
          console.log('🧪 TESTE: REALTIME FUNCIONOU! Mudança detectada:', payload);
          console.log('🧪 TESTE: Tipo de evento:', payload.eventType);
          console.log('🧪 TESTE: Dados novos:', payload.new);
          console.log('🧪 TESTE: Dados antigos:', payload.old);

          // Forçar atualização do status da loja para testar
          console.log('🧪 TESTE: Forçando verificação de status...');
          setTimeout(async () => {
            try {
              // Buscar configuração atual
              const { data: config } = await supabase
                .from('pdv_config')
                .select('cardapio_abertura_tipo, cardapio_loja_aberta')
                .eq('empresa_id', empresaId)
                .single();

              console.log('🧪 TESTE: Configuração atual:', config);

              if (config?.cardapio_abertura_tipo === 'automatico') {
                console.log('🧪 TESTE: Modo automático - verificando horários...');

                const now = new Date();
                const currentDay = now.getDay();
                const currentTime = now.getHours() * 60 + now.getMinutes();

                const { data: horario } = await supabase
                  .from('horario_atendimento')
                  .select('*')
                  .eq('empresa_id', empresaId)
                  .eq('dia_semana', currentDay)
                  .single();

                console.log('🧪 TESTE: Horário para hoje:', horario);

                if (horario) {
                  const [horaAbertura, minutoAbertura] = horario.hora_abertura.split(':').map(Number);
                  const [horaFechamento, minutoFechamento] = horario.hora_fechamento.split(':').map(Number);
                  const aberturaMinutos = horaAbertura * 60 + minutoAbertura;
                  const fechamentoMinutos = horaFechamento * 60 + minutoFechamento;
                  const shouldBeOpen = currentTime >= aberturaMinutos && currentTime <= fechamentoMinutos;

                  console.log('🧪 TESTE: Análise:', {
                    horaAtual: currentTime,
                    abertura: aberturaMinutos,
                    fechamento: fechamentoMinutos,
                    deveEstarAberto: shouldBeOpen,
                    statusAtual: lojaAberta
                  });

                  if (shouldBeOpen !== lojaAberta) {
                    console.log('🧪 TESTE: Mudando status da loja para:', shouldBeOpen);
                    setLojaAberta(shouldBeOpen);
                  } else {
                    console.log('🧪 TESTE: Status já está correto');
                  }
                } else {
                  console.log('🧪 TESTE: Sem horário para hoje, fechando loja');
                  if (lojaAberta) {
                    setLojaAberta(false);
                  }
                }
              } else {
                console.log('🧪 TESTE: Modo manual - ignorando mudança');
              }
            } catch (error) {
              console.error('🧪 TESTE: Erro:', error);
            }
          }, 1000);
        }
      )
      .subscribe((status) => {
        console.log('🧪 TESTE: Status da subscrição:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ TESTE: Realtime conectado com sucesso!');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ TESTE: Erro na conexão realtime');
        }
      });

    return () => {
      console.log('🧪 TESTE: Removendo canal realtime');
      supabase.removeChannel(channel);
    };
  }, [empresaId]);

  // Carregar modo automático e calcular próxima abertura
  useEffect(() => {
    const carregarModoAutomatico = async () => {
      if (!empresaId) return;

      try {
        const { data: configData } = await supabase
          .from('pdv_config')
          .select('cardapio_abertura_tipo')
          .eq('empresa_id', empresaId)
          .single();

        const isAutomatico = configData?.cardapio_abertura_tipo === 'automatico';
        setModoAutomatico(isAutomatico);

        if (isAutomatico && lojaAberta === false) {
          calcularProximaAbertura();
        }
      } catch (error) {
        console.error('Erro ao carregar modo automático:', error);
      }
    };

    carregarModoAutomatico();
  }, [empresaId, lojaAberta, horarios]);

  // Atualizar contagem regressiva a cada segundo
  useEffect(() => {
    if (!modoAutomatico || lojaAberta !== false || !proximaAbertura) {
      return;
    }

    const interval = setInterval(() => {
      formatarContadorRegressivo();
    }, 1000);

    // Executar imediatamente
    formatarContadorRegressivo();

    return () => clearInterval(interval);
  }, [modoAutomatico, lojaAberta, proximaAbertura]);

  // Recalcular próxima abertura quando horários mudarem
  useEffect(() => {
    if (modoAutomatico && lojaAberta === false) {
      calcularProximaAbertura();
    }
  }, [horarios, modoAutomatico, lojaAberta]);

  // Calcular próximo fechamento quando necessário
  useEffect(() => {
    if (modoAutomatico && lojaAberta === true) {
      calcularProximoFechamento();
    }
  }, [horarios, modoAutomatico, lojaAberta]);

  // Atualizar contagem regressiva de fechamento a cada segundo
  useEffect(() => {
    if (!modoAutomatico || !mostrarAvisoFechamento || !proximoFechamento) {
      return;
    }

    const interval = setInterval(() => {
      formatarContadorFechamento();
    }, 1000);

    // Executar imediatamente
    formatarContadorFechamento();

    return () => clearInterval(interval);
  }, [modoAutomatico, mostrarAvisoFechamento, proximoFechamento]);

  // Recalcular fechamento quando horários mudarem
  useEffect(() => {
    if (modoAutomatico && lojaAberta === true) {
      calcularProximoFechamento();
    }
  }, [horarios, modoAutomatico, lojaAberta]);

  // Calcular categorias visíveis baseado no tamanho da tela
  useEffect(() => {
    const handleResize = () => {
      const novasCategoriasVisiveis = calcularCategoriasVisiveis();
      setVisibleCategoriaItems(novasCategoriasVisiveis);

      // Ajustar startIndex se necessário
      const totalItens = grupos.length + 1; // +1 para incluir "Todos"
      const maxIndex = Math.max(0, totalItens - novasCategoriasVisiveis);
      if (categoriaStartIndex > maxIndex) {
        setCategoriaStartIndex(maxIndex);
      }
    };

    handleResize(); // Calcular inicialmente
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [categoriaStartIndex, grupos.length]);

  // Resetar categoriaStartIndex quando grupos mudarem
  useEffect(() => {
    setCategoriaStartIndex(0);
  }, [grupos.length]);

  // Fechar carrinho automaticamente quando não há itens
  useEffect(() => {
    const totalItens = obterQuantidadeTotalItens();
    if (totalItens === 0 && carrinhoAberto) {
      setCarrinhoAberto(false);
    }
  }, [quantidadesProdutos, carrinhoAberto]);

  // Carregar carrinho do localStorage quando empresa está disponível
  useEffect(() => {
    if (empresaId) {
      console.log('🛒 Carregando carrinho do localStorage para empresa:', empresaId);
      const { quantidades, ordem, adicionais } = carregarCarrinhoLocalStorage();
      console.log('🛒 Carrinho salvo encontrado:', quantidades);
      console.log('🛒 Ordem salva encontrada:', ordem);
      console.log('🛒 Adicionais salvos encontrados:', adicionais);

      if (Object.keys(quantidades).length > 0) {
        setQuantidadesProdutos(quantidades);
        setOrdemAdicaoItens(ordem);
        setAdicionaisSelecionados(adicionais);
        setCarrinhoAberto(true);
        console.log('🛒 Carrinho carregado e aberto');
      }
    }
  }, [empresaId]);

  // Validar e filtrar carrinho quando produtos estão disponíveis
  useEffect(() => {
    if (produtos.length > 0 && Object.keys(quantidadesProdutos).length > 0) {
      console.log('🛒 Validando itens do carrinho com produtos disponíveis');

      const carrinhoFiltrado: Record<string, number> = {};
      Object.entries(quantidadesProdutos).forEach(([produtoId, quantidade]) => {
        const produtoExiste = produtos.some(p => p.id === produtoId);
        if (produtoExiste && quantidade > 0) {
          carrinhoFiltrado[produtoId] = quantidade;
        } else {
          console.log('🛒 Removendo produto inexistente do carrinho:', produtoId);
        }
      });

      // Só atualizar se houve mudanças
      if (JSON.stringify(carrinhoFiltrado) !== JSON.stringify(quantidadesProdutos)) {
        setQuantidadesProdutos(carrinhoFiltrado);
        console.log('🛒 Carrinho filtrado e atualizado');
      }
    }
  }, [produtos]);

  // Salvar carrinho no localStorage sempre que quantidades, ordem ou adicionais mudarem
  useEffect(() => {
    if (empresaId) {
      console.log('🛒 Salvando carrinho devido a mudança nas quantidades:', quantidadesProdutos);
      console.log('🛒 Salvando ordem devido a mudança:', ordemAdicaoItens);
      console.log('🛒 Salvando adicionais devido a mudança:', adicionaisSelecionados);
      salvarCarrinhoLocalStorage(quantidadesProdutos);
    }
  }, [quantidadesProdutos, ordemAdicaoItens, adicionaisSelecionados, empresaId]);



  const carregarDadosCardapio = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Buscar configuração PDV pelo slug personalizado
      console.log('🔍 Buscando configuração PDV para slug:', slug);
      const { data: pdvConfigData, error: configError } = await supabase
        .from('pdv_config')
        .select('empresa_id, cardapio_url_personalizada, modo_escuro_cardapio, exibir_fotos_itens_cardapio, cardapio_fotos_minimizadas, logo_url, cardapio_digital')
        .eq('cardapio_url_personalizada', slug)
        .single();

      console.log('🔍 Resultado da consulta PDV config:', { pdvConfigData, configError });

      if (configError || !pdvConfigData) {
        console.error('❌ Erro ao buscar configuração PDV:', configError);
        setError('Cardápio não encontrado ou não está disponível.');
        return;
      }

      // 2. Buscar dados da empresa
      console.log('🏢 Buscando dados da empresa ID:', pdvConfigData.empresa_id);
      const { data: empresaData, error: empresaError } = await supabase
        .from('empresas')
        .select('id, razao_social, nome_fantasia, whatsapp, telefones, endereco, numero, bairro, cidade, estado')
        .eq('id', pdvConfigData.empresa_id)
        .single();

      console.log('🏢 Dados da empresa carregados:', empresaData);
      console.log('🏢 Nome fantasia:', empresaData?.nome_fantasia);
      console.log('🏢 Razão social:', empresaData?.razao_social);

      if (empresaError || !empresaData) {
        console.error('❌ Erro ao buscar empresa:', empresaError);
        setError('Dados da empresa não encontrados.');
        return;
      }

      // Adicionar logo_url da configuração PDV aos dados da empresa
      const empresaComLogo = {
        ...empresaData,
        logo_url: pdvConfigData.logo_url || ''
      };

      console.log('🏢 Definindo empresa no estado:', empresaComLogo);
      console.log('🏢 Nome que será exibido:', empresaComLogo.nome_fantasia || empresaComLogo.razao_social);
      setEmpresa(empresaComLogo);

      // Definir o ID da empresa para o realtime
      setEmpresaId(empresaComLogo.id);

      // Configurar tema e exibição de fotos baseado na configuração da empresa
      setConfig(prev => ({
        ...prev,
        modo_escuro: pdvConfigData.modo_escuro_cardapio || false,
        mostrar_fotos: pdvConfigData.exibir_fotos_itens_cardapio !== false, // Default true se não definido
        cardapio_fotos_minimizadas: pdvConfigData.cardapio_fotos_minimizadas || false
      }));

      // 3. Buscar produtos ativos da empresa com unidades de medida
      const { data: produtosData, error: produtosError } = await supabase
        .from('produtos')
        .select(`
          id,
          nome,
          descricao,
          preco,
          grupo_id,
          ativo,
          unidade_medida_id,
          unidade_medida:unidade_medida_id (
            id,
            sigla,
            nome,
            fracionado
          ),
          produto_fotos (
            id,
            url,
            principal
          )
        `)
        .eq('empresa_id', pdvConfigData.empresa_id)
        .eq('ativo', true)
        .order('nome');

      if (produtosError) {
        console.error('Erro ao carregar produtos:', produtosError);
        setError('Erro ao carregar produtos do cardápio.');
        return;
      }

      // 4. Buscar todas as fotos dos produtos
      const produtosIds = produtosData?.map(p => p.id) || [];
      let todasFotosData: any[] = [];

      if (produtosIds.length > 0) {
        const { data: fotosResult, error: fotosError } = await supabase
          .from('produto_fotos')
          .select('id, produto_id, url, principal')
          .in('produto_id', produtosIds)
          .order('principal', { ascending: false }); // Principal primeiro

        if (!fotosError && fotosResult) {
          todasFotosData = fotosResult;
        }
      }

      // 5. Buscar adicionais dos produtos
      let adicionaisData: any[] = [];
      if (produtosIds.length > 0) {
        const { data: adicionaisResult, error: adicionaisError } = await supabase
          .from('produtos_opcoes_adicionais')
          .select(`
            produto_id,
            opcoes_adicionais!inner (
              id,
              nome,
              opcoes_adicionais_itens (
                id,
                nome,
                preco
              )
            )
          `)
          .in('produto_id', produtosIds)
          .eq('deletado', false);

        if (!adicionaisError && adicionaisResult) {
          adicionaisData = adicionaisResult;
        }
      }

      // 5. Buscar grupos dos produtos
      const gruposIds = [...new Set(produtosData?.map(p => p.grupo_id).filter(Boolean))];
      let gruposData: any[] = [];

      if (gruposIds.length > 0) {
        const { data: gruposResult, error: gruposError } = await supabase
          .from('grupos')
          .select('id, nome')
          .in('id', gruposIds);

        if (!gruposError && gruposResult) {
          gruposData = gruposResult;
        }
      }

      // 6. Buscar horários de atendimento
      const { data: horariosData, error: horariosError } = await supabase
        .from('horario_atendimento')
        .select('id, dia_semana, hora_abertura, hora_fechamento')
        .eq('empresa_id', empresaComLogo.id)
        .order('dia_semana');

      if (!horariosError && horariosData) {
        setHorarios(horariosData);
      }

      // 7. Buscar status da loja (configuração PDV)
      const { data: statusLojaData, error: statusLojaError } = await supabase
        .from('pdv_config')
        .select('cardapio_loja_aberta, cardapio_abertura_tipo')
        .eq('empresa_id', empresaComLogo.id)
        .single();

      if (!statusLojaError && statusLojaData) {
        // Usar exatamente o valor do banco, sem fallbacks
        const statusInicial = statusLojaData.cardapio_loja_aberta;
        console.log('🏪 Status inicial da loja carregado:', statusInicial);
        setLojaAberta(statusInicial);
      } else {
        console.error('❌ Erro ao carregar status da loja:', statusLojaError);
        // Se não conseguir carregar, não assumir nenhum valor padrão
        setLojaAberta(null);
      }

      // Processar produtos com nome do grupo, fotos e adicionais
      const produtosProcessados = produtosData?.map(produto => {
        const grupo = gruposData.find(g => g.id === produto.grupo_id);
        const fotosProduto = todasFotosData.filter(f => f.produto_id === produto.id);
        const fotoPrincipal = fotosProduto.find(f => f.principal) || fotosProduto[0];

        // Buscar adicionais do produto
        const adicionaisProduto = adicionaisData.filter(a => a.produto_id === produto.id);
        const opcoesAdicionais = adicionaisProduto.map(a => ({
          id: a.opcoes_adicionais.id,
          nome: a.opcoes_adicionais.nome,
          itens: a.opcoes_adicionais.opcoes_adicionais_itens || []
        }));

        return {
          ...produto,
          grupo_nome: grupo?.nome || 'Sem categoria',
          foto_url: fotoPrincipal?.url || null,
          produto_fotos: fotosProduto.map(f => ({
            id: f.id,
            url: f.url,
            principal: f.principal
          })),
          fotos_count: fotosProduto.length,
          opcoes_adicionais: opcoesAdicionais
        };
      }) || [];

      setProdutos(produtosProcessados);

      // 6. Definir grupos únicos
      const gruposUnicos = gruposData.map(grupo => ({
        id: grupo.id,
        nome: grupo.nome
      }));

      setGrupos(gruposUnicos);

    } catch (error: any) {
      console.error('Erro ao carregar cardápio:', error);
      setError('Erro interno do servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar produtos por grupo e termo de pesquisa
  const produtosFiltrados = produtos.filter(produto => {
    // Filtro por grupo
    const passaFiltroGrupo = grupoSelecionado === 'todos' || produto.grupo_id === grupoSelecionado;

    // Filtro por termo de pesquisa (busca no nome e descrição)
    const passaFiltroPesquisa = termoPesquisa === '' ||
      produto.nome.toLowerCase().includes(termoPesquisa.toLowerCase()) ||
      (produto.descricao && produto.descricao.toLowerCase().includes(termoPesquisa.toLowerCase()));

    return passaFiltroGrupo && passaFiltroPesquisa;
  });

  const formatarPreco = (preco: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(preco);
  };

  // Função para formatar quantidade baseada na unidade de medida (similar ao PDV)
  const formatarQuantidade = (quantidade: number, unidadeMedida?: any) => {
    // Se a unidade de medida permite fracionamento, mostrar 3 casas decimais
    if (unidadeMedida?.fracionado) {
      return quantidade.toFixed(3);
    }
    // Se não permite fracionamento, mostrar como número inteiro
    return quantidade.toString();
  };

  // Função para obter a foto principal do produto (similar ao PDV)
  const getFotoPrincipal = (produto: any) => {
    if (!produto?.produto_fotos || produto.produto_fotos.length === 0) {
      return null;
    }

    // Buscar foto marcada como principal
    const fotoPrincipal = produto.produto_fotos.find((foto: any) => foto.principal);

    // Se não encontrar foto principal, retornar a primeira
    return fotoPrincipal || produto.produto_fotos[0];
  };

  // Função para abrir galeria de fotos
  const abrirGaleriaFotos = (produto: Produto, fotoIndex: number = 0) => {
    if (!produto.produto_fotos || produto.produto_fotos.length === 0) return;

    setFotosProdutoSelecionado(produto.produto_fotos);
    setFotoInicialIndex(fotoIndex);
    setGaleriaAberta(true);
  };

  // Funções para controlar adicionais
  const toggleAdicionalOpcao = (produtoId: string, opcaoId: string) => {
    setAdicionaisExpandidos(prev => ({
      ...prev,
      [produtoId]: {
        ...prev[produtoId],
        [opcaoId]: !prev[produtoId]?.[opcaoId]
      }
    }));
  };

  const incrementarAdicional = (produtoId: string, itemId: string) => {
    setAdicionaisSelecionados(prev => ({
      ...prev,
      [produtoId]: {
        ...prev[produtoId],
        [itemId]: (prev[produtoId]?.[itemId] || 0) + 1
      }
    }));

    // Efeito visual de chacoalhar o produto quando adicional é adicionado
    setItemChacoalhando(produtoId);
    setTimeout(() => setItemChacoalhando(null), 600);

    // Se o carrinho não estiver aberto, abrir automaticamente
    if (!carrinhoAberto) {
      setCarrinhoAberto(true);
      setCarrinhoRecemAberto(true);
      setTimeout(() => setCarrinhoRecemAberto(false), 2000);
    }
  };

  const decrementarAdicional = (produtoId: string, itemId: string) => {
    const quantidadeAtual = obterQuantidadeAdicional(produtoId, itemId);

    setAdicionaisSelecionados(prev => {
      if (quantidadeAtual <= 1) {
        const novosProdutos = { ...prev };
        if (novosProdutos[produtoId]) {
          delete novosProdutos[produtoId][itemId];
          if (Object.keys(novosProdutos[produtoId]).length === 0) {
            delete novosProdutos[produtoId];
          }
        }
        return novosProdutos;
      }

      return {
        ...prev,
        [produtoId]: {
          ...prev[produtoId],
          [itemId]: quantidadeAtual - 1
        }
      };
    });

    // Efeito visual sutil quando remove adicional
    if (quantidadeAtual > 0) {
      setItemChacoalhando(produtoId);
      setTimeout(() => setItemChacoalhando(null), 400);
    }
  };

  const obterQuantidadeAdicional = (produtoId: string, itemId: string): number => {
    return adicionaisSelecionados[produtoId]?.[itemId] || 0;
  };

  // Funções para localStorage do carrinho
  const salvarCarrinhoLocalStorage = (quantidades: Record<string, number>) => {
    if (!empresaId) {
      console.log('🛒 Não salvando carrinho: empresaId não disponível');
      return;
    }

    try {
      const chaveCarrinho = `carrinho_${empresaId}`;
      const chaveOrdem = `carrinho_ordem_${empresaId}`;
      const chaveAdicionais = `carrinho_adicionais_${empresaId}`;

      localStorage.setItem(chaveCarrinho, JSON.stringify(quantidades));
      localStorage.setItem(chaveOrdem, JSON.stringify(ordemAdicaoItens));
      localStorage.setItem(chaveAdicionais, JSON.stringify(adicionaisSelecionados));

      console.log('🛒 Carrinho salvo no localStorage:', chaveCarrinho, quantidades);
      console.log('🛒 Ordem salva no localStorage:', chaveOrdem, ordemAdicaoItens);
      console.log('🛒 Adicionais salvos no localStorage:', chaveAdicionais, adicionaisSelecionados);
    } catch (error) {
      console.error('Erro ao salvar carrinho no localStorage:', error);
    }
  };

  const carregarCarrinhoLocalStorage = (): {
    quantidades: Record<string, number>,
    ordem: Record<string, number>,
    adicionais: {[produtoId: string]: {[itemId: string]: number}}
  } => {
    if (!empresaId) {
      console.log('🛒 Não carregando carrinho: empresaId não disponível');
      return { quantidades: {}, ordem: {}, adicionais: {} };
    }

    try {
      const chaveCarrinho = `carrinho_${empresaId}`;
      const chaveOrdem = `carrinho_ordem_${empresaId}`;
      const chaveAdicionais = `carrinho_adicionais_${empresaId}`;

      const carrinhoSalvo = localStorage.getItem(chaveCarrinho);
      const ordemSalva = localStorage.getItem(chaveOrdem);
      const adicionaisSalvos = localStorage.getItem(chaveAdicionais);

      const quantidades = carrinhoSalvo ? JSON.parse(carrinhoSalvo) : {};
      const ordem = ordemSalva ? JSON.parse(ordemSalva) : {};
      const adicionais = adicionaisSalvos ? JSON.parse(adicionaisSalvos) : {};

      console.log('🛒 Carrinho carregado do localStorage:', chaveCarrinho, quantidades);
      console.log('🛒 Ordem carregada do localStorage:', chaveOrdem, ordem);
      console.log('🛒 Adicionais carregados do localStorage:', chaveAdicionais, adicionais);

      return { quantidades, ordem, adicionais };
    } catch (error) {
      console.error('Erro ao carregar carrinho do localStorage:', error);
      return { quantidades: {}, ordem: {}, adicionais: {} };
    }
  };

  const limparCarrinhoLocalStorage = () => {
    if (!empresaId) return;

    try {
      const chaveCarrinho = `carrinho_${empresaId}`;
      const chaveOrdem = `carrinho_ordem_${empresaId}`;
      const chaveAdicionais = `carrinho_adicionais_${empresaId}`;

      localStorage.removeItem(chaveCarrinho);
      localStorage.removeItem(chaveOrdem);
      localStorage.removeItem(chaveAdicionais);

      console.log('🛒 Carrinho, ordem e adicionais limpos do localStorage');
    } catch (error) {
      console.error('Erro ao limpar carrinho do localStorage:', error);
    }
  };

  // Função para calcular quantas categorias cabem na tela
  const calcularCategoriasVisiveis = () => {
    const larguraTela = window.innerWidth;
    const larguraBotaoCategoria = 120; // Largura fixa de cada botão de categoria
    const espacoBotoes = 80; // Espaço para botões de navegação (se necessário)
    const padding = 32; // Padding lateral do container

    const totalCategorias = grupos.length + 1; // +1 para incluir "Todos"
    const temNavegacao = totalCategorias > 1;

    const larguraDisponivel = larguraTela - padding - (temNavegacao ? espacoBotoes : 0);
    const itensPossiveis = Math.floor(larguraDisponivel / larguraBotaoCategoria);

    return Math.max(1, Math.min(itensPossiveis, totalCategorias));
  };

  const navegarCategoriaAnterior = () => {
    if (isAnimating) return; // Previne múltiplos cliques durante animação

    setIsAnimating(true);
    setCategoriaStartIndex(Math.max(0, categoriaStartIndex - 1));

    // Reset da animação após a transição
    setTimeout(() => setIsAnimating(false), 300);
  };

  const navegarCategoriaProxima = () => {
    if (isAnimating) return; // Previne múltiplos cliques durante animação

    const totalItens = grupos.length + 1; // +1 para incluir "Todos"
    const maxIndex = Math.max(0, totalItens - visibleCategoriaItems);

    setIsAnimating(true);
    setCategoriaStartIndex(Math.min(maxIndex, categoriaStartIndex + 1));

    // Reset da animação após a transição
    setTimeout(() => setIsAnimating(false), 300);
  };

  // Funções para suporte a arrastar no mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX || isAnimating) return;

    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      navegarCategoriaProxima();
    }
    if (isRightSwipe) {
      navegarCategoriaAnterior();
    }

    // Reset dos valores de touch
    setTouchStartX(0);
    setTouchEndX(0);
  };

  // Funções para controle de quantidade dos produtos
  const obterQuantidadeProduto = (produtoId: string): number => {
    return quantidadesProdutos[produtoId] || 0;
  };

  const alterarQuantidadeProduto = (produtoId: string, novaQuantidade: number) => {
    if (novaQuantidade < 0) return;

    const quantidadeAnterior = quantidadesProdutos[produtoId] || 0;

    setQuantidadesProdutos(prev => ({
      ...prev,
      [produtoId]: novaQuantidade
    }));

    // Rastrear ordem de adição - quando item é adicionado pela primeira vez
    if (quantidadeAnterior === 0 && novaQuantidade > 0) {
      setOrdemAdicaoItens(prev => ({
        ...prev,
        [produtoId]: Date.now() // Timestamp como ordem
      }));
    }

    // Remover da ordem quando quantidade chega a zero
    if (novaQuantidade === 0) {
      setOrdemAdicaoItens(prev => {
        const nova = { ...prev };
        delete nova[produtoId];
        return nova;
      });
    }
  };

  const incrementarQuantidade = (produtoId: string) => {
    const quantidadeAtual = obterQuantidadeProduto(produtoId);

    // Buscar o produto para verificar se é fracionário
    const produto = produtos.find(p => p.id === produtoId);
    const isFracionado = produto?.unidade_medida?.fracionado || false;

    let novaQuantidade;
    if (isFracionado) {
      // Para produtos fracionados, incrementar em 0.1 (100g, 100ml, etc.)
      novaQuantidade = Math.round((quantidadeAtual + 0.1) * 1000) / 1000; // 3 casas decimais
    } else {
      // Para produtos inteiros, incrementar em 1
      novaQuantidade = quantidadeAtual + 1;
    }

    alterarQuantidadeProduto(produtoId, novaQuantidade);

    // Ativar efeito de entrada suave no item
    setItemChacoalhando(produtoId);
    setTimeout(() => setItemChacoalhando(null), 800);

    // Abrir carrinho automaticamente quando adicionar primeiro item
    if (quantidadeAtual === 0) {
      const carrinhoEstaviaFechado = !carrinhoAberto;
      setCarrinhoAberto(true);

      // Se o carrinho estava fechado, marcar como recém aberto para animação especial
      if (carrinhoEstaviaFechado) {
        setCarrinhoRecemAberto(true);
        // Remover o estado após a animação
        setTimeout(() => setCarrinhoRecemAberto(false), 2000);
      }
    }
  };

  const decrementarQuantidade = (produtoId: string) => {
    const quantidadeAtual = obterQuantidadeProduto(produtoId);
    if (quantidadeAtual > 0) {
      // Buscar o produto para verificar se é fracionário
      const produto = produtos.find(p => p.id === produtoId);
      const isFracionado = produto?.unidade_medida?.fracionado || false;

      let novaQuantidade;
      if (isFracionado) {
        // Para produtos fracionados, decrementar em 0.1, mínimo 0
        novaQuantidade = Math.max(0, Math.round((quantidadeAtual - 0.1) * 1000) / 1000); // 3 casas decimais
      } else {
        // Para produtos inteiros, decrementar em 1, mínimo 0
        novaQuantidade = Math.max(0, quantidadeAtual - 1);
      }

      // Se a quantidade chegou a 0, limpar os adicionais deste produto
      if (novaQuantidade === 0) {
        setAdicionaisSelecionados(prev => {
          const novosAdicionais = { ...prev };
          delete novosAdicionais[produtoId];
          return novosAdicionais;
        });
      }

      alterarQuantidadeProduto(produtoId, novaQuantidade);
    }
  };

  const handleQuantidadeInputChange = (produtoId: string, valor: string) => {
    // Buscar o produto para verificar se é fracionário
    const produto = produtos.find(p => p.id === produtoId);
    const isFracionado = produto?.unidade_medida?.fracionado || false;

    if (isFracionado) {
      // Para produtos fracionados, permitir números, vírgulas e pontos
      const valorLimpo = valor.replace(/[^\d.,]/g, '');

      if (valorLimpo === '') {
        alterarQuantidadeProduto(produtoId, 0);
        return;
      }

      // Converter vírgula para ponto para processamento
      const valorConvertido = valorLimpo.replace(',', '.');

      if (!isNaN(parseFloat(valorConvertido))) {
        let quantidade = parseFloat(valorConvertido);
        // Limitar a 3 casas decimais
        quantidade = Math.round(quantidade * 1000) / 1000;
        alterarQuantidadeProduto(produtoId, quantidade >= 0 ? quantidade : 0);
      }
    } else {
      // Para produtos inteiros, permitir apenas números
      const valorLimpo = valor.replace(/[^\d]/g, '');
      const quantidade = valorLimpo === '' ? 0 : parseInt(valorLimpo);

      if (!isNaN(quantidade)) {
        alterarQuantidadeProduto(produtoId, quantidade);
      }
    }
  };

  // Funções para o carrinho
  const obterItensCarrinho = (): ItemCarrinho[] => {
    return Object.entries(quantidadesProdutos)
      .filter(([_, quantidade]) => quantidade > 0)
      .map(([produtoId, quantidade]) => {
        const produto = produtos.find(p => p.id === produtoId);
        if (!produto) return null;

        // Coletar adicionais selecionados para este produto
        const adicionaisItem: Array<{id: string; nome: string; preco: number; quantidade: number}> = [];
        const adicionaisProduto = adicionaisSelecionados[produtoId];

        if (adicionaisProduto && produto.opcoes_adicionais) {
          produto.opcoes_adicionais.forEach(opcao => {
            opcao.itens.forEach(item => {
              const quantidadeAdicional = adicionaisProduto[item.id];
              if (quantidadeAdicional && quantidadeAdicional > 0) {
                adicionaisItem.push({
                  id: item.id,
                  nome: item.nome,
                  preco: item.preco,
                  quantidade: quantidadeAdicional
                });
              }
            });
          });
        }

        return {
          produto,
          quantidade,
          adicionais: adicionaisItem.length > 0 ? adicionaisItem : undefined,
          ordemAdicao: ordemAdicaoItens[produtoId] || 0
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.ordemAdicao - a!.ordemAdicao) // Mais recentes primeiro
      .map(({ produto, quantidade, adicionais }) => ({ produto, quantidade, adicionais })) as ItemCarrinho[];
  };

  const obterTotalCarrinho = () => {
    return obterItensCarrinho().reduce((total, item) => {
      // Total do produto principal
      let totalItem = item.produto.preco * item.quantidade;

      // Adicionar total dos adicionais
      if (item.adicionais) {
        const totalAdicionais = item.adicionais.reduce((totalAd, adicional) => {
          return totalAd + (adicional.preco * adicional.quantidade * item.quantidade);
        }, 0);
        totalItem += totalAdicionais;
      }

      return total + totalItem;
    }, 0);
  };

  const obterQuantidadeTotalItens = () => {
    return Object.values(quantidadesProdutos).reduce((total, quantidade) => total + quantidade, 0);
  };

  const removerItemCarrinho = (produtoId: string) => {
    setQuantidadesProdutos(prev => {
      const novo = { ...prev };
      delete novo[produtoId];
      return novo;
    });
  };

  // Função para limpar itens do carrinho que não existem mais no cardápio
  const limparItensInexistentes = () => {
    setQuantidadesProdutos(prev => {
      const carrinhoLimpo: Record<string, number> = {};
      Object.entries(prev).forEach(([produtoId, quantidade]) => {
        const produtoExiste = produtos.some(p => p.id === produtoId);
        if (produtoExiste) {
          carrinhoLimpo[produtoId] = quantidade;
        }
      });
      return carrinhoLimpo;
    });
  };

  const abrirModalConfirmacao = () => {
    setModalConfirmacaoAberto(true);
  };

  const confirmarLimparCarrinho = () => {
    setQuantidadesProdutos({});
    setOrdemAdicaoItens({});
    setAdicionaisSelecionados({});
    setCarrinhoAberto(false);
    setModalConfirmacaoAberto(false);

    // Limpar localStorage
    limparCarrinhoLocalStorage();

    // Mostrar toast de sucesso
    setToastVisivel(true);
    setTimeout(() => setToastVisivel(false), 3000); // Toast desaparece após 3 segundos
  };

  const cancelarLimparCarrinho = () => {
    setModalConfirmacaoAberto(false);
  };

  // Função para obter o primeiro telefone com WhatsApp
  const obterWhatsAppEmpresa = () => {
    // Usar apenas o campo telefones (novo sistema)
    if (empresa?.telefones && Array.isArray(empresa.telefones)) {
      const telefoneWhatsApp = empresa.telefones.find(tel => tel.whatsapp);
      if (telefoneWhatsApp) {
        return telefoneWhatsApp.numero;
      }
    }

    // Retornar null se não houver telefone com WhatsApp configurado
    return null;
  };

  // Função para obter todos os telefones da empresa
  const obterTodosTelefones = () => {
    // Usar apenas o campo telefones (novo sistema)
    if (empresa?.telefones && Array.isArray(empresa.telefones)) {
      return empresa.telefones;
    }

    // Retornar array vazio se não houver telefones configurados
    return [];
  };

  // Função para obter o nome do dia da semana
  const obterNomeDiaSemana = (dia: number) => {
    const dias = [
      'Domingo',
      'Segunda-feira',
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado'
    ];
    return dias[dia] || '';
  };

  // Função para formatar horário
  const formatarHorario = (hora: string) => {
    return hora.substring(0, 5); // Remove os segundos (HH:MM)
  };

  // Função para calcular a próxima abertura da loja
  const calcularProximaAbertura = () => {
    if (!horarios.length || !modoAutomatico) {
      setProximaAbertura(null);
      return;
    }

    const agora = new Date();
    const diaAtual = agora.getDay();
    const horaAtual = agora.getHours() * 60 + agora.getMinutes();

    // Primeiro, verificar se há horário para hoje e se ainda não passou
    const horarioHoje = horarios.find(h => h.dia_semana === diaAtual);
    if (horarioHoje) {
      const [horaAbertura, minutoAbertura] = horarioHoje.hora_abertura.split(':').map(Number);
      const aberturaMinutos = horaAbertura * 60 + minutoAbertura;

      if (horaAtual < aberturaMinutos) {
        // Ainda não chegou a hora de abrir hoje
        const proximaAbertura = new Date();
        proximaAbertura.setHours(horaAbertura, minutoAbertura, 0, 0);
        setProximaAbertura(proximaAbertura);
        return;
      }
    }

    // Procurar o próximo dia com horário de funcionamento
    for (let i = 1; i <= 7; i++) {
      const proximoDia = (diaAtual + i) % 7;
      const horarioProximoDia = horarios.find(h => h.dia_semana === proximoDia);

      if (horarioProximoDia) {
        const [horaAbertura, minutoAbertura] = horarioProximoDia.hora_abertura.split(':').map(Number);
        const proximaAbertura = new Date();
        proximaAbertura.setDate(proximaAbertura.getDate() + i);
        proximaAbertura.setHours(horaAbertura, minutoAbertura, 0, 0);
        setProximaAbertura(proximaAbertura);
        return;
      }
    }

    // Se não encontrou nenhum horário, não há próxima abertura
    setProximaAbertura(null);
  };

  // Função para formatar o contador regressivo
  const formatarContadorRegressivo = () => {
    if (!proximaAbertura) {
      setContadorRegressivo('');
      return;
    }

    const agora = new Date();
    const diferenca = proximaAbertura.getTime() - agora.getTime();

    if (diferenca <= 0) {
      setContadorRegressivo('');
      calcularProximaAbertura(); // Recalcular próxima abertura
      return;
    }

    const dias = Math.floor(diferenca / (1000 * 60 * 60 * 24));
    const horas = Math.floor((diferenca % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutos = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((diferenca % (1000 * 60)) / 1000);

    let contador = '';
    if (dias > 0) {
      contador = `${dias}d ${horas}h ${minutos}m ${segundos}s`;
    } else if (horas > 0) {
      contador = `${horas}h ${minutos}m ${segundos}s`;
    } else if (minutos > 0) {
      contador = `${minutos}m ${segundos}s`;
    } else {
      contador = `${segundos}s`;
    }

    setContadorRegressivo(contador);
  };

  // Função para calcular o próximo fechamento da loja
  const calcularProximoFechamento = () => {
    if (!horarios.length || !modoAutomatico || !lojaAberta) {
      setProximoFechamento(null);
      setMostrarAvisoFechamento(false);
      return;
    }

    const agora = new Date();
    const diaAtual = agora.getDay();
    const horaAtual = agora.getHours() * 60 + agora.getMinutes();

    // Verificar se há horário para hoje
    const horarioHoje = horarios.find(h => h.dia_semana === diaAtual);
    if (horarioHoje) {
      const [horaFechamento, minutoFechamento] = horarioHoje.hora_fechamento.split(':').map(Number);
      const fechamentoMinutos = horaFechamento * 60 + minutoFechamento;

      if (horaAtual < fechamentoMinutos) {
        // Ainda não chegou a hora de fechar hoje
        const proximoFechamento = new Date();
        proximoFechamento.setHours(horaFechamento, minutoFechamento, 0, 0);
        setProximoFechamento(proximoFechamento);

        // Verificar se faltam 5 minutos ou menos para fechar
        const minutosParaFechar = fechamentoMinutos - horaAtual;
        setMostrarAvisoFechamento(minutosParaFechar <= 5 && minutosParaFechar > 0);
        return;
      }
    }

    // Se não há horário para hoje ou já passou, não mostrar aviso
    setProximoFechamento(null);
    setMostrarAvisoFechamento(false);
  };

  // Função para formatar o contador de fechamento
  const formatarContadorFechamento = () => {
    if (!proximoFechamento || !mostrarAvisoFechamento) {
      setContadorFechamento('');
      return;
    }

    const agora = new Date();
    const diferenca = proximoFechamento.getTime() - agora.getTime();

    if (diferenca <= 0) {
      setContadorFechamento('');
      setMostrarAvisoFechamento(false);
      calcularProximoFechamento(); // Recalcular
      return;
    }

    const minutos = Math.floor(diferenca / (1000 * 60));
    const segundos = Math.floor((diferenca % (1000 * 60)) / 1000);

    let contador = '';
    if (minutos > 0) {
      contador = `${minutos}m ${segundos}s`;
    } else {
      contador = `${segundos}s`;
    }

    setContadorFechamento(contador);
  };

  const handlePedirWhatsApp = (produto?: Produto) => {
    // Verificar se a loja está fechada (só bloqueia se explicitamente false)
    if (lojaAberta === false) {
      showMessage('error', 'Loja fechada! Não é possível fazer pedidos no momento.');
      return;
    }

    const whatsappNumero = obterWhatsAppEmpresa();
    if (!whatsappNumero) {
      showMessage('error', 'WhatsApp da empresa não disponível');
      return;
    }

    const whatsapp = whatsappNumero.replace(/\D/g, '');
    let mensagem = 'Olá! Gostaria de fazer um pedido:\n\n';

    if (produto) {
      // Pedido de um produto específico
      const quantidade = obterQuantidadeProduto(produto.id);
      const quantidadeFinal = quantidade > 0 ? quantidade : 1;
      const valorTotal = produto.preco * quantidadeFinal;

      mensagem += `*${produto.nome}*`;
      if (quantidadeFinal > 1) {
        mensagem += `\nQuantidade: ${quantidadeFinal}`;
      }
      if (config.mostrar_precos) {
        mensagem += `\nPreço unitário: ${formatarPreco(produto.preco)}`;
        if (quantidadeFinal > 1) {
          mensagem += `\nTotal: ${formatarPreco(valorTotal)}`;
        }
      }
    } else {
      // Pedido do carrinho completo
      const itensCarrinho = obterItensCarrinho();
      if (itensCarrinho.length === 0) {
        showMessage('error', 'Carrinho vazio!');
        return;
      }

      itensCarrinho.forEach((item, index) => {
        mensagem += `${index + 1}. *${item.produto.nome}*\n`;
        mensagem += `   Quantidade: ${item.quantidade}\n`;
        if (config.mostrar_precos) {
          mensagem += `   Preço unitário: ${formatarPreco(item.produto.preco)}\n`;
          mensagem += `   Subtotal: ${formatarPreco(item.produto.preco * item.quantidade)}\n`;
        }
        mensagem += '\n';
      });

      if (config.mostrar_precos) {
        mensagem += `*Total Geral: ${formatarPreco(obterTotalCarrinho())}*`;
      }
    }

    const url = `https://wa.me/55${whatsapp}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  const handlePedirCarrinhoCompleto = () => {
    handlePedirWhatsApp();
  };

  const handleContatoWhatsApp = () => {
    const whatsappNumero = obterWhatsAppEmpresa();
    if (!whatsappNumero) {
      showMessage('error', 'WhatsApp da empresa não disponível');
      return;
    }

    const whatsapp = whatsappNumero.replace(/\D/g, '');
    const mensagem = `Olá! Gostaria de entrar em contato com vocês.`;
    const url = `https://wa.me/55${whatsapp}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando cardápio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Cardápio não encontrado</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Verifique se o link está correto ou entre em contato com o estabelecimento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Estilos CSS customizados para animação de entrada suave */}
      <style>{`
        @keyframes itemCaindo {
          0% {
            transform: translateY(-20px) scale(0.8);
            opacity: 0;
          }
          50% {
            transform: translateY(5px) scale(1.05);
            opacity: 0.8;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>

      <div className={`min-h-screen ${config.modo_escuro ? 'bg-gray-900' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
      {/* Área fixa para tarja de aviso de fechamento - sempre presente no DOM */}
      <div
        className={`transition-all duration-500 ease-in-out overflow-hidden ${
          modoAutomatico && mostrarAvisoFechamento && lojaAberta === true
            ? 'max-h-24 opacity-100'
            : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-yellow-600 text-white py-3 px-4 text-center relative overflow-hidden animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 animate-pulse"></div>
          <div className="relative z-10 flex items-center justify-center gap-3">
            <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
            <div className="font-bold text-lg">
              ⚠️ ATENÇÃO - LOJA FECHARÁ EM BREVE
            </div>
            <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
          </div>
          <div className="relative z-10 mt-1">
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <p className="text-sm font-medium">
                A loja fechará em:
              </p>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2">
                <span className="font-mono text-lg font-bold tracking-wider">
                  ⏰ {contadorFechamento}
                </span>
              </div>
            </div>
            <p className="text-xs mt-2 font-medium opacity-90">
              Finalize seu pedido antes do fechamento
            </p>
          </div>
        </div>
      </div>

      {/* Área fixa para tarja de loja fechada - sempre presente no DOM */}
      <div
        className={`transition-all duration-500 ease-in-out overflow-hidden ${
          lojaAberta === false
            ? 'max-h-20 opacity-100'
            : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-red-600 text-white py-3 px-4 text-center relative overflow-hidden animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-red-500 to-red-600 animate-pulse"></div>
          <div className="relative z-10 flex items-center justify-center gap-3">
            <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
            <div className="font-bold text-lg">
              🔒 LOJA FECHADA
            </div>
            <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
          </div>
          <div className="relative z-10 mt-1">
            {modoAutomatico && contadorRegressivo ? (
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <p className="text-sm font-medium">
                  A loja abrirá em:
                </p>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2">
                  <span className="font-mono text-lg font-bold tracking-wider">
                    ⏰ {contadorRegressivo}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm font-medium">
                No momento não é possível fazer pedidos. Tente novamente mais tarde.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Header com gradiente - Oculto quando carrinho está aberto */}
      <div className={`relative ${config.modo_escuro ? 'bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800' : 'bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800'} shadow-xl transition-all duration-300 ${
        carrinhoAberto && obterQuantidadeTotalItens() > 0 ? 'hidden' : ''
      }`}>
        {/* Overlay pattern */}
        <div className="absolute inset-0 bg-black/10 backdrop-blur-sm"></div>

        <div className="relative max-w-6xl mx-auto px-4 py-8 md:py-12">
          <div className="text-center">
            {/* Logo da empresa com efeito */}
            {empresa?.logo_url && (
              <div className="mb-6">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-white/20 rounded-full blur-xl"></div>
                  <img
                    src={empresa.logo_url}
                    alt={`Logo ${empresa.nome_fantasia || empresa.razao_social}`}
                    className="relative w-28 h-28 md:w-32 md:h-32 mx-auto object-contain rounded-2xl bg-white/10 backdrop-blur-sm p-2 border border-white/20 shadow-2xl"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}

            {/* Nome da empresa com efeito */}
            <div className="mb-4">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
                {empresa?.nome_fantasia || empresa?.razao_social}
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-yellow-400 to-orange-500 mx-auto rounded-full"></div>
            </div>

            {/* Informações da empresa */}
            <div className="space-y-2 text-white/90">
              {empresa?.endereco && (
                <div className="flex items-center justify-center gap-2 text-sm md:text-base">
                  <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>
                    {empresa.endereco}
                    {empresa.numero && `, ${empresa.numero}`}
                    {empresa.bairro && ` - ${empresa.bairro}`}
                    {empresa.cidade && `, ${empresa.cidade}`}
                    {empresa.estado && ` - ${empresa.estado}`}
                  </span>
                </div>
              )}
              {obterTodosTelefones().length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {obterTodosTelefones().map((telefone, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        if (telefone.whatsapp) {
                          // Se tem WhatsApp, abrir WhatsApp
                          const whatsapp = telefone.numero.replace(/\D/g, '');
                          const mensagem = `Olá! Gostaria de entrar em contato com vocês.`;
                          const url = `https://wa.me/55${whatsapp}?text=${encodeURIComponent(mensagem)}`;
                          window.open(url, '_blank');
                        } else {
                          // Se não tem WhatsApp, fazer ligação
                          const numeroLimpo = telefone.numero.replace(/\D/g, '');
                          window.open(`tel:+55${numeroLimpo}`, '_self');
                        }
                      }}
                      className={`flex items-center justify-center gap-2 text-sm md:text-base backdrop-blur-sm border rounded-lg px-4 py-2 transition-all duration-300 hover:scale-105 group ${
                        telefone.whatsapp
                          ? 'bg-green-600/20 hover:bg-green-600/30 border-green-400/30'
                          : 'bg-blue-600/20 hover:bg-blue-600/30 border-blue-400/30'
                      }`}
                    >
                      {/* Ícone baseado no tipo e WhatsApp */}
                      {telefone.tipo === 'Celular' && telefone.whatsapp ? (
                        <svg className="w-5 h-5 text-green-400 group-hover:text-green-300 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.515z"/>
                        </svg>
                      ) : (
                        <svg className={`w-5 h-5 transition-colors ${telefone.tipo === 'Celular' ? 'text-blue-400 group-hover:text-blue-300' : 'text-gray-400 group-hover:text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      )}
                      <span className="text-white/90 group-hover:text-white transition-colors font-medium">{telefone.numero}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Seção de Horários de Atendimento */}
              {horarios.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setHorariosExpanded(!horariosExpanded)}
                    className="flex items-center justify-center gap-2 text-sm md:text-base bg-blue-600/20 hover:bg-blue-600/30 backdrop-blur-sm border border-blue-400/30 rounded-lg px-4 py-2 transition-all duration-300 hover:scale-105 group w-full md:w-auto"
                  >
                    <Clock size={18} className="text-blue-400 group-hover:text-blue-300 transition-colors" />
                    <span className="text-white/90 group-hover:text-white transition-colors font-medium">
                      Horários de Atendimento
                    </span>
                    <ChevronDown
                      size={18}
                      className={`text-blue-400 group-hover:text-blue-300 transition-all duration-300 ${horariosExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Lista de horários expandida */}
                  {horariosExpanded && (
                    <div className="mt-3 bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-lg p-4 space-y-2">
                      {horarios.map((horario) => (
                        <div key={horario.id} className="flex justify-between items-center">
                          <span className="text-white/90 font-medium">
                            {obterNomeDiaSemana(horario.dia_semana)}
                          </span>
                          <span className="text-blue-400">
                            {formatarHorario(horario.hora_abertura)} - {formatarHorario(horario.hora_fechamento)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal do Carrinho - ACIMA dos grupos */}
      {carrinhoAberto && obterQuantidadeTotalItens() > 0 && (
        <div className={`${config.modo_escuro ? 'bg-gray-800/95' : 'bg-white/95'} backdrop-blur-sm border-b ${config.modo_escuro ? 'border-gray-700' : 'border-gray-200'} sticky top-0 z-30 transition-all duration-500 ${
          carrinhoRecemAberto
            ? 'animate-pulse shadow-2xl ring-4 ring-purple-500/50 ring-opacity-75'
            : ''
        }`}>
          {/* Seta Indicativa - Aparece quando carrinho é aberto pela primeira vez */}
          {carrinhoRecemAberto && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-40">
              <div className="flex flex-col items-center animate-bounce">
                <ArrowDown size={24} className="text-purple-500 animate-pulse" />
                <span className={`text-xs font-bold mt-1 px-2 py-1 rounded ${
                  config.modo_escuro ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-800'
                }`}>
                  Aqui!
                </span>
              </div>
            </div>
          )}

          <div className={`max-w-6xl mx-auto px-4 py-3 transition-all duration-700 ${
            carrinhoRecemAberto
              ? 'transform translate-y-0 opacity-100 animate-bounce'
              : 'transform translate-y-0 opacity-100'
          }`}>
            {/* Banner de Notificação - Aparece quando carrinho é aberto pela primeira vez */}
            {carrinhoRecemAberto && (
              <div className={`mb-3 p-3 rounded-lg border-2 border-dashed animate-pulse ${
                config.modo_escuro
                  ? 'bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-purple-400 text-purple-200'
                  : 'bg-gradient-to-r from-purple-100 to-blue-100 border-purple-500 text-purple-800'
              }`}>
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping"></div>
                  <span className="text-sm font-semibold">
                    🎉 Item adicionado ao carrinho! Seus pedidos aparecem aqui
                  </span>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping"></div>
                </div>
              </div>
            )}

            {/* Header do Carrinho */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className={config.modo_escuro ? 'text-purple-400' : 'text-purple-600'} />
                <h3 className={`font-semibold text-sm ${config.modo_escuro ? 'text-white' : 'text-gray-800'}`}>
                  ({obterQuantidadeTotalItens()} {obterQuantidadeTotalItens() === 1 ? 'item' : 'itens'})
                </h3>
                {config.mostrar_precos && (
                  <span className={`text-sm font-bold ${config.modo_escuro ? 'text-green-400' : 'text-green-600'}`}>
                    Total: {formatarPreco(obterTotalCarrinho())}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModalTodosItensAberto(true)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    config.modo_escuro
                      ? 'text-blue-400 hover:bg-blue-900/20'
                      : 'text-blue-600 hover:bg-blue-100'
                  }`}
                  title="Ver todos os itens"
                >
                  <List size={16} />
                </button>
                <button
                  onClick={abrirModalConfirmacao}
                  className={`p-1.5 rounded-lg transition-colors ${
                    config.modo_escuro
                      ? 'text-red-400 hover:bg-red-900/20'
                      : 'text-red-600 hover:bg-red-100'
                  }`}
                  title="Limpar carrinho"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={() => setCarrinhoAberto(false)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    config.modo_escuro
                      ? 'text-gray-400 hover:bg-gray-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Lista de Itens do Carrinho */}
            <div className="max-h-28 overflow-y-auto space-y-2 mb-3">
              {obterItensCarrinho().map((item) => {
                const { produto, quantidade, adicionais } = item;
                return (
                <div
                  key={produto.id}
                  className={`p-2 rounded-lg transition-all duration-500 ${
                    config.modo_escuro ? 'bg-gray-700/50' : 'bg-gray-50'
                  } ${
                    itemChacoalhando === produto.id
                      ? 'shadow-lg ring-2 ring-blue-400/50 bg-blue-50 dark:bg-blue-900/20'
                      : ''
                  }`}
                  style={{
                    animation: itemChacoalhando === produto.id
                      ? 'itemCaindo 0.6s ease-out'
                      : undefined
                  }}
                >
                  {/* Layout com foto (quando configuração ativa) */}
                  {config.cardapio_fotos_minimizadas ? (
                    <>
                      {/* Header do Item - Foto + Nome/Preço + Controles */}
                      <div className="flex items-center gap-3 mb-2">
                        {/* Foto do produto */}
                        <div
                          className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0 cursor-pointer"
                          onClick={() => abrirGaleriaFotos(produto, 0)}
                        >
                          {(() => {
                            const fotoItem = getFotoPrincipal(produto);
                            return fotoItem ? (
                              <img
                                src={fotoItem.url}
                                alt={produto.nome}
                                className="w-full h-full object-cover hover:scale-110 transition-transform duration-200"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package size={16} className={config.modo_escuro ? 'text-gray-500' : 'text-gray-400'} />
                              </div>
                            );
                          })()}

                          {/* Contador de fotos */}
                          {produto.fotos_count && produto.fotos_count > 1 && (
                            <div className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                              {produto.fotos_count}
                            </div>
                          )}
                        </div>

                        {/* Área central com Nome e Preço em 2 linhas */}
                        <div className="flex-1 min-w-0">
                          {/* Linha 1: Nome do produto */}
                          <h4 className={`font-medium text-sm truncate ${config.modo_escuro ? 'text-white' : 'text-gray-800'}`}>
                            {produto.nome}
                          </h4>
                          {/* Linha 2: Preço */}
                          {config.mostrar_precos && (
                            <div className={`text-xs ${config.modo_escuro ? 'text-gray-300' : 'text-gray-600'}`}>
                              {formatarPreco(produto.preco)} × {formatarQuantidade(quantidade, produto.unidade_medida)} = {formatarPreco(produto.preco * quantidade)}
                            </div>
                          )}
                        </div>

                        {/* Controles de Quantidade do Produto Principal */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => decrementarQuantidade(produto.id)}
                            disabled={lojaAberta === false}
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                              lojaAberta === false
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : config.modo_escuro
                                ? 'bg-gray-600 text-white hover:bg-gray-500'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            <Minus size={12} />
                          </button>

                          {itemEditandoCarrinho === produto.id && lojaAberta !== false ? (
                            <input
                              type="text"
                              value={formatarQuantidade(quantidade, produto.unidade_medida)}
                              onChange={(e) => handleQuantidadeInputChange(produto.id, e.target.value)}
                              onBlur={() => setItemEditandoCarrinho(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  setItemEditandoCarrinho(null);
                                }
                              }}
                              className={`w-8 h-6 text-center text-xs font-semibold rounded border focus:outline-none ${
                                config.modo_escuro
                                  ? 'bg-gray-600 border-gray-500 text-white focus:border-purple-400'
                                  : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                              }`}
                              placeholder={produto.unidade_medida?.fracionado ? "0,000" : "0"}
                              autoFocus
                            />
                          ) : (
                            <button
                              onClick={() => lojaAberta !== false && setItemEditandoCarrinho(produto.id)}
                              disabled={lojaAberta === false}
                              className={`w-8 h-6 text-center text-xs font-semibold rounded transition-colors ${
                                lojaAberta === false
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : config.modo_escuro
                                  ? 'bg-gray-600 text-white hover:bg-gray-500'
                                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                              }`}
                            >
                              {formatarQuantidade(quantidade, produto.unidade_medida)}
                            </button>
                          )}

                          <button
                            onClick={() => incrementarQuantidade(produto.id)}
                            disabled={lojaAberta === false}
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                              lojaAberta === false
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : config.modo_escuro
                                ? 'bg-blue-600 text-white hover:bg-blue-500'
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Header do Item - Nome + Preço + Controles (sem foto) */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-medium text-sm truncate ${config.modo_escuro ? 'text-white' : 'text-gray-800'}`}>
                              {produto.nome}
                            </h4>
                            {config.mostrar_precos && (
                              <div className={`text-xs ${config.modo_escuro ? 'text-gray-300' : 'text-gray-600'}`}>
                                {formatarPreco(produto.preco)} × {formatarQuantidade(quantidade, produto.unidade_medida)} = {formatarPreco(produto.preco * quantidade)}
                              </div>
                            )}
                          </div>

                          {/* Controles de Quantidade do Produto Principal */}
                          <div className="flex items-center gap-2 ml-3">
                            <button
                              onClick={() => decrementarQuantidade(produto.id)}
                              disabled={lojaAberta === false}
                              className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                                lojaAberta === false
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : config.modo_escuro
                                  ? 'bg-gray-600 text-white hover:bg-gray-500'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              <Minus size={12} />
                            </button>

                            {itemEditandoCarrinho === produto.id && lojaAberta !== false ? (
                              <input
                                type="text"
                                value={formatarQuantidade(quantidade, produto.unidade_medida)}
                                onChange={(e) => handleQuantidadeInputChange(produto.id, e.target.value)}
                                onBlur={() => setItemEditandoCarrinho(null)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    setItemEditandoCarrinho(null);
                                  }
                                }}
                                className={`w-8 h-6 text-center text-xs font-semibold rounded border focus:outline-none ${
                                  config.modo_escuro
                                    ? 'bg-gray-600 border-gray-500 text-white focus:border-purple-400'
                                    : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                                }`}
                                placeholder={produto.unidade_medida?.fracionado ? "0,000" : "0"}
                                autoFocus
                              />
                            ) : (
                              <button
                                onClick={() => lojaAberta !== false && setItemEditandoCarrinho(produto.id)}
                                disabled={lojaAberta === false}
                                className={`w-8 h-6 text-center text-xs font-semibold rounded transition-colors ${
                                  lojaAberta === false
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : config.modo_escuro
                                    ? 'bg-gray-600 text-white hover:bg-gray-500'
                                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                                }`}
                              >
                                {formatarQuantidade(quantidade, produto.unidade_medida)}
                              </button>
                            )}

                            <button
                              onClick={() => incrementarQuantidade(produto.id)}
                              disabled={lojaAberta === false}
                              className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                                lojaAberta === false
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : config.modo_escuro
                                  ? 'bg-blue-600 text-white hover:bg-blue-500'
                                  : 'bg-blue-500 text-white hover:bg-blue-600'
                              }`}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Seção de Adicionais - Largura Total */}
                  {adicionais && adicionais.length > 0 && (
                    <div className="mb-2">
                      {/* Divisória */}
                      <div className={`border-t ${config.modo_escuro ? 'border-gray-600' : 'border-gray-300'} mb-2`}></div>

                      {/* Título */}
                      <div className={`text-xs font-medium mb-2 ${config.modo_escuro ? 'text-gray-400' : 'text-gray-500'}`}>
                        Adicionais:
                      </div>

                      {/* Lista de Adicionais com Controles */}
                      <div className="space-y-1">
                        {adicionais.map(adicional => (
                          <div
                            key={adicional.id}
                            className={`flex items-center justify-between p-2 rounded-lg ${
                              config.modo_escuro ? 'bg-gray-800/50' : 'bg-gray-50'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-medium ${config.modo_escuro ? 'text-white' : 'text-gray-800'}`}>
                                  + {adicional.nome}
                                </span>
                                {config.mostrar_precos && (
                                  <span className={`text-xs ${config.modo_escuro ? 'text-gray-300' : 'text-gray-600'}`}>
                                    {formatarPreco(adicional.preco * adicional.quantidade * quantidade)}
                                  </span>
                                )}
                              </div>
                              <div className={`text-xs ${config.modo_escuro ? 'text-gray-400' : 'text-gray-500'}`}>
                                {adicional.preco > 0 ? `${formatarPreco(adicional.preco)} cada` : 'Grátis'}
                              </div>
                            </div>

                            {/* Controles de Quantidade do Adicional */}
                            {obterWhatsAppEmpresa() && lojaAberta !== false && (
                              <div className="flex items-center gap-1 ml-3">
                                <button
                                  onClick={() => decrementarAdicional(produto.id, adicional.id)}
                                  disabled={adicional.quantidade === 0}
                                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                                    adicional.quantidade === 0
                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                      : config.modo_escuro
                                      ? 'bg-gray-600 text-white hover:bg-gray-500'
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  <Minus size={8} />
                                </button>

                                <span className={`w-5 text-center text-xs font-semibold ${
                                  config.modo_escuro ? 'text-white' : 'text-gray-800'
                                }`}>
                                  {adicional.quantidade}
                                </span>

                                <button
                                  onClick={() => incrementarAdicional(produto.id, adicional.id)}
                                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                                    config.modo_escuro
                                      ? 'bg-blue-600 text-white hover:bg-blue-500'
                                      : 'bg-blue-500 text-white hover:bg-blue-600'
                                  }`}
                                >
                                  <Plus size={8} />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Total do Item */}
                  {config.mostrar_precos && adicionais && adicionais.length > 0 && (
                    <div className={`text-xs font-semibold pt-2 border-t ${
                      config.modo_escuro ? 'border-gray-600 text-green-400' : 'border-gray-300 text-green-600'
                    }`}>
                      Total do Item: {formatarPreco(
                        (produto.preco * quantidade) +
                        adicionais.reduce((total, adicional) => total + (adicional.preco * adicional.quantidade * quantidade), 0)
                      )}
                    </div>
                  )}


                </div>
                );
              })}
            </div>

            {/* Botão Finalizar Pedido */}
            {obterWhatsAppEmpresa() && (
              <button
                onClick={handlePedirCarrinhoCompleto}
                disabled={lojaAberta === false}
                className={`w-full py-2 px-4 rounded-lg font-semibold text-sm transition-all duration-300 ${
                  lojaAberta === false
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white transform hover:scale-[1.02] shadow-lg'
                }`}
              >
                {lojaAberta === false ? 'Loja Fechada' : 'Finalizar Pedido'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filtros de Categoria com navegação horizontal */}
      {grupos.length > 0 && (
        <div className={`${config.modo_escuro ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm border-b ${config.modo_escuro ? 'border-gray-700' : 'border-gray-200'} sticky top-0 z-10`}>
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="h-14 flex items-center">
              {/* Botão Anterior */}
              {categoriaStartIndex > 0 && (
                <button
                  onClick={navegarCategoriaAnterior}
                  disabled={isAnimating}
                  className={`w-10 h-full flex items-center justify-center transition-all duration-200 border-r relative ${
                    isAnimating
                      ? 'opacity-50 cursor-not-allowed'
                      : config.modo_escuro
                      ? 'text-gray-400 hover:text-white hover:bg-gray-700/50 border-gray-600 hover:scale-110'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50 border-gray-300 hover:scale-110'
                  }`}
                >
                  {/* Efeito de pulsação suave de dentro para fora */}
                  <div className="relative">
                    <ChevronsLeft size={20} className="relative z-10" />
                    {/* Onda de pulsação 1 - mais interna */}
                    <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${
                      config.modo_escuro ? 'bg-purple-400' : 'bg-purple-600'
                    }`} style={{ animationDuration: '2s', animationDelay: '0s' }}></div>
                    {/* Onda de pulsação 2 - média */}
                    <div className={`absolute inset-0 rounded-full animate-ping opacity-15 scale-110 ${
                      config.modo_escuro ? 'bg-blue-400' : 'bg-blue-600'
                    }`} style={{ animationDuration: '2s', animationDelay: '0.3s' }}></div>
                    {/* Onda de pulsação 3 - mais externa */}
                    <div className={`absolute inset-0 rounded-full animate-ping opacity-10 scale-125 ${
                      config.modo_escuro ? 'bg-purple-300' : 'bg-purple-500'
                    }`} style={{ animationDuration: '2s', animationDelay: '0.6s' }}></div>
                  </div>
                </button>
              )}

              {/* Container de Categorias com Slide Suave */}
              <div
                className="flex items-center h-full flex-1 overflow-hidden"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div
                  className="flex items-center h-full transition-transform duration-300 ease-in-out"
                  style={{
                    transform: `translateX(-${categoriaStartIndex * 120}px)`,
                    width: `${(grupos.length + 1) * 120}px` // +1 para incluir "Todos"
                  }}
                >
                  {(() => {
                    const todasCategorias = [
                      { id: 'todos', nome: '🍽️ Todos' },
                      ...grupos
                    ];

                    return todasCategorias.map((categoria, index) => (
                      <button
                        key={categoria.id}
                        onClick={() => setGrupoSelecionado(categoria.id)}
                        className={`flex items-center justify-center transition-all duration-200 h-full px-4 font-medium text-sm whitespace-nowrap ${
                          grupoSelecionado === categoria.id
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                            : config.modo_escuro
                            ? 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                            : 'text-gray-700 hover:bg-gray-100/50 hover:text-gray-900'
                        }`}
                        style={{
                          width: '120px',
                          minWidth: '120px',
                          flexShrink: 0
                        }}
                      >
                        {categoria.nome}
                      </button>
                    ));
                  })()}
                </div>
              </div>

              {/* Botão Próximo */}
              {categoriaStartIndex + visibleCategoriaItems < (grupos.length + 1) && (
                <button
                  onClick={navegarCategoriaProxima}
                  disabled={isAnimating}
                  className={`w-10 h-full flex items-center justify-center transition-all duration-200 border-l relative ${
                    isAnimating
                      ? 'opacity-50 cursor-not-allowed'
                      : config.modo_escuro
                      ? 'text-gray-400 hover:text-white hover:bg-gray-700/50 border-gray-600 hover:scale-110'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50 border-gray-300 hover:scale-110'
                  }`}
                >
                  {/* Efeito de pulsação suave de dentro para fora */}
                  <div className="relative">
                    <ChevronsRight size={20} className="relative z-10" />
                    {/* Onda de pulsação 1 - mais interna */}
                    <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${
                      config.modo_escuro ? 'bg-purple-400' : 'bg-purple-600'
                    }`} style={{ animationDuration: '2s', animationDelay: '0s' }}></div>
                    {/* Onda de pulsação 2 - média */}
                    <div className={`absolute inset-0 rounded-full animate-ping opacity-15 scale-110 ${
                      config.modo_escuro ? 'bg-blue-400' : 'bg-blue-600'
                    }`} style={{ animationDuration: '2s', animationDelay: '0.3s' }}></div>
                    {/* Onda de pulsação 3 - mais externa */}
                    <div className={`absolute inset-0 rounded-full animate-ping opacity-10 scale-125 ${
                      config.modo_escuro ? 'bg-purple-300' : 'bg-purple-500'
                    }`} style={{ animationDuration: '2s', animationDelay: '0.6s' }}></div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Campo de Pesquisa */}
      <div className={`${config.modo_escuro ? 'bg-gray-800/30' : 'bg-white/60'} backdrop-blur-sm border-b ${config.modo_escuro ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="relative max-w-md mx-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className={`w-5 h-5 ${config.modo_escuro ? 'text-gray-400' : 'text-gray-500'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Pesquisar produtos..."
              value={termoPesquisa}
              onChange={(e) => setTermoPesquisa(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all duration-300 focus:outline-none focus:ring-2 ${
                config.modo_escuro
                  ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:ring-purple-500/50 focus:border-purple-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-purple-500/50 focus:border-purple-500 shadow-sm'
              }`}
            />
            {termoPesquisa && (
              <button
                onClick={() => setTermoPesquisa('')}
                className={`absolute inset-y-0 right-0 pr-3 flex items-center ${
                  config.modo_escuro ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                } transition-colors duration-200`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lista de Produtos com design moderno */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {produtosFiltrados.length === 0 ? (
          <div className="text-center py-16">
            <div className={`w-24 h-24 mx-auto mb-6 rounded-full ${config.modo_escuro ? 'bg-gray-800' : 'bg-gray-100'} flex items-center justify-center`}>
              <svg className={`w-12 h-12 ${config.modo_escuro ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className={`text-xl font-semibold mb-2 ${config.modo_escuro ? 'text-white' : 'text-gray-800'}`}>
              Nenhum produto encontrado
            </h3>
            <p className={`text-lg ${config.modo_escuro ? 'text-gray-400' : 'text-gray-600'}`}>
              {termoPesquisa
                ? `Não encontramos produtos com "${termoPesquisa}".`
                : 'Não há produtos disponíveis nesta categoria no momento.'
              }
            </p>
            {termoPesquisa && (
              <button
                onClick={() => setTermoPesquisa('')}
                className="mt-4 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300"
              >
                Limpar pesquisa
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {produtosFiltrados.map(produto => {
              const quantidadeSelecionada = obterQuantidadeProduto(produto.id);
              const estaSelecionado = quantidadeSelecionada > 0;

              return (
                <div
                  key={produto.id}
                  className={`group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
                    estaSelecionado
                      ? config.modo_escuro
                        ? 'bg-gradient-to-br from-blue-900/80 to-purple-900/80 border-2 border-blue-500/50 shadow-xl shadow-blue-500/20'
                        : 'bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-400/60 shadow-xl shadow-blue-400/20'
                      : config.modo_escuro
                      ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50'
                      : 'bg-white border border-gray-200 shadow-lg'
                  }`}
                >


                {/* Imagem do produto - Apenas para config.mostrar_fotos (fotos grandes) */}
                {config.mostrar_fotos && !config.cardapio_fotos_minimizadas && (() => {
                  const fotoItem = getFotoPrincipal(produto);
                  return fotoItem ? (
                    <div
                      className="relative h-48 overflow-hidden cursor-pointer"
                      onClick={() => abrirGaleriaFotos(produto, 0)}
                    >
                      <img
                        src={fotoItem.url}
                        alt={produto.nome}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>

                      {/* Contador de fotos */}
                      {produto.fotos_count && produto.fotos_count > 1 && (
                        <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                          {produto.fotos_count}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`h-48 flex items-center justify-center ${config.modo_escuro ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <Package className={`w-16 h-16 ${config.modo_escuro ? 'text-gray-600' : 'text-gray-400'}`} />
                    </div>
                  );
                })()}

                {/* Conteúdo do card */}
                <div className="p-3">
                  {/* Header do Produto */}
                  <div className="mb-3">
                    {/* Layout com foto pequena quando cardapio_fotos_minimizadas ativo */}
                    {config.cardapio_fotos_minimizadas ? (
                      <div className="flex items-start gap-3 mb-2">
                        {/* Foto pequena */}
                        <div
                          className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0 cursor-pointer"
                          onClick={() => abrirGaleriaFotos(produto, 0)}
                        >
                          {(() => {
                            const fotoItem = getFotoPrincipal(produto);
                            return fotoItem ? (
                              <img
                                src={fotoItem.url}
                                alt={produto.nome}
                                className="w-full h-full object-cover hover:scale-110 transition-transform duration-200"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package size={20} className={config.modo_escuro ? 'text-gray-500' : 'text-gray-400'} />
                              </div>
                            );
                          })()}

                          {/* Contador de fotos para foto pequena */}
                          {produto.fotos_count && produto.fotos_count > 1 && (
                            <div className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                              {produto.fotos_count}
                            </div>
                          )}
                        </div>

                        {/* Nome e preço/controles */}
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-lg font-bold leading-tight truncate ${config.modo_escuro ? 'text-white' : 'text-gray-800'}`}>
                            {produto.nome}
                          </h3>

                          {/* Linha do preço com controles de quantidade */}
                          <div className="flex items-center justify-between mt-1">
                            {config.mostrar_precos && (
                              <div className="text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
                                {formatarPreco(produto.preco)}
                              </div>
                            )}

                            {/* Controles de quantidade na mesma linha do preço */}
                            {obterWhatsAppEmpresa() && (
                              <div className="flex items-center gap-1">
                                {/* Botão Decrementar */}
                                <button
                                  onClick={() => decrementarQuantidade(produto.id)}
                                  disabled={obterQuantidadeProduto(produto.id) === 0 || lojaAberta === false}
                                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                                    obterQuantidadeProduto(produto.id) === 0 || lojaAberta === false
                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                      : config.modo_escuro
                                      ? 'bg-gray-600 text-white hover:bg-gray-500'
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  <Minus size={12} />
                                </button>

                                {/* Campo de Quantidade */}
                                <input
                                  type="text"
                                  value={formatarQuantidade(obterQuantidadeProduto(produto.id), produto.unidade_medida)}
                                  onChange={(e) => handleQuantidadeChange(produto.id, e.target.value)}
                                  onBlur={() => setItemEditandoQuantidade(null)}
                                  onFocus={() => setItemEditandoQuantidade(produto.id)}
                                  disabled={lojaAberta === false}
                                  className={`w-10 h-7 text-center text-xs font-semibold rounded-lg border-2 transition-all duration-200 ${
                                    lojaAberta === false
                                      ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                                      : itemEditandoQuantidade === produto.id
                                      ? config.modo_escuro
                                        ? 'bg-gray-700 border-blue-500 text-white'
                                        : 'bg-white border-blue-500 text-gray-800'
                                      : config.modo_escuro
                                      ? 'bg-gray-700 border-gray-600 text-white hover:border-gray-500'
                                      : 'bg-white border-gray-300 text-gray-800 hover:border-gray-400'
                                  }`}
                                />

                                {/* Botão Incrementar */}
                                <button
                                  onClick={() => incrementarQuantidade(produto.id)}
                                  disabled={lojaAberta === false}
                                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                                    lojaAberta === false
                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                      : config.modo_escuro
                                      ? 'bg-blue-600 text-white hover:bg-blue-500'
                                      : 'bg-blue-500 text-white hover:bg-blue-600'
                                  }`}
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            )}
                          </div>

                        </div>
                      </div>
                    ) : (
                      /* Layout normal sem foto pequena */
                      <>
                        <h3 className={`text-xl font-bold mb-2 ${config.modo_escuro ? 'text-white' : 'text-gray-800'}`}>
                          {produto.nome}
                        </h3>
                      </>
                    )}
                  </div>

                  {/* Descrição do produto - largura total do card */}
                  {produto.descricao && (
                    <div className="mb-3 w-full">
                      <p className={`text-sm leading-relaxed w-full ${config.modo_escuro ? 'text-gray-300' : 'text-gray-600'}`}>
                        {produto.descricao}
                      </p>
                    </div>
                  )}

                  {/* Adicionais do produto - largura total do card */}
                  {produto.opcoes_adicionais && produto.opcoes_adicionais.length > 0 && (
                    <div className="mb-3 w-full">
                      {/* Divisória acima dos adicionais */}
                      <div className={`border-t ${config.modo_escuro ? 'border-gray-600' : 'border-gray-300'} mb-2`}></div>

                      {/* Título dos adicionais */}
                      <div className={`text-xs font-medium mb-2 flex items-center gap-2 ${config.modo_escuro ? 'text-gray-400' : 'text-gray-500'}`}>
                        <span>Adicionais:</span>
                        {obterQuantidadeProduto(produto.id) === 0 && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            config.modo_escuro
                              ? 'bg-orange-900/30 text-orange-400 border border-orange-700'
                              : 'bg-orange-100 text-orange-600 border border-orange-300'
                          }`}>
                            Adicione o produto primeiro
                          </span>
                        )}
                      </div>

                      {/* Lista de opções de adicionais */}
                      <div className={`space-y-2 w-full transition-opacity duration-200 ${
                        obterQuantidadeProduto(produto.id) === 0 ? 'opacity-50' : 'opacity-100'
                      }`}>
                        {produto.opcoes_adicionais.map(opcao => {
                          const adicionaisDesabilitados = obterQuantidadeProduto(produto.id) === 0;
                          return (
                          <div key={opcao.id} className="w-full">
                            {/* Botão do grupo de adicional */}
                            <button
                              onClick={() => !adicionaisDesabilitados && toggleAdicionalOpcao(produto.id, opcao.id)}
                              disabled={adicionaisDesabilitados}
                              className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                                adicionaisDesabilitados
                                  ? 'cursor-not-allowed'
                                  : config.modo_escuro
                                  ? 'bg-gray-700/50 hover:bg-gray-700 text-white'
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                              } ${
                                config.modo_escuro ? 'text-white' : 'text-gray-800'
                              }`}
                              title={adicionaisDesabilitados ? 'Adicione o produto principal primeiro' : ''}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{opcao.nome}</span>
                                <span className={`text-xs ${config.modo_escuro ? 'text-gray-400' : 'text-gray-500'}`}>
                                  ({opcao.itens.length} {opcao.itens.length === 1 ? 'item' : 'itens'})
                                </span>
                              </div>
                              {adicionaisExpandidos[produto.id]?.[opcao.id] ? (
                                <ChevronUp size={16} className={config.modo_escuro ? 'text-gray-400' : 'text-gray-500'} />
                              ) : (
                                <ChevronDown size={16} className={config.modo_escuro ? 'text-gray-400' : 'text-gray-500'} />
                              )}
                            </button>

                            {/* Itens do adicional (expansível) */}
                            {adicionaisExpandidos[produto.id]?.[opcao.id] && (
                              <div className="mt-2 space-y-2">
                                {opcao.itens.map(item => {
                                  const quantidade = obterQuantidadeAdicional(produto.id, item.id);
                                  return (
                                    <div
                                      key={item.id}
                                      className={`flex items-center justify-between p-2 rounded-lg ${
                                        config.modo_escuro
                                          ? 'bg-gray-800/50'
                                          : 'bg-gray-50'
                                      }`}
                                    >
                                      <div className="flex-1">
                                        <p className={`text-sm font-medium ${config.modo_escuro ? 'text-white' : 'text-gray-800'}`}>
                                          {item.nome}
                                        </p>
                                        <p className={`text-xs ${config.modo_escuro ? 'text-gray-400' : 'text-gray-600'}`}>
                                          {item.preco > 0 ? `+ ${formatarPreco(item.preco)}` : 'Grátis'}
                                        </p>
                                      </div>

                                      {/* Controles de quantidade do adicional */}
                                      {obterWhatsAppEmpresa() && lojaAberta !== false && (
                                        <div className="flex items-center gap-1">
                                          {(() => {
                                            const quantidadeProdutoPrincipal = obterQuantidadeProduto(produto.id);
                                            const adicionaisDesabilitados = quantidadeProdutoPrincipal === 0;

                                            return (
                                              <>
                                                {/* Botão Decrementar */}
                                                <button
                                                  onClick={() => decrementarAdicional(produto.id, item.id)}
                                                  disabled={quantidade === 0 || adicionaisDesabilitados}
                                                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
                                                    quantidade === 0 || adicionaisDesabilitados
                                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                      : config.modo_escuro
                                                      ? 'bg-gray-600 text-white hover:bg-gray-500'
                                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                  }`}
                                                  title={adicionaisDesabilitados ? 'Adicione o produto principal primeiro' : ''}
                                                >
                                                  <Minus size={10} />
                                                </button>

                                                {/* Quantidade */}
                                                <span className={`w-6 text-center text-xs font-semibold ${
                                                  adicionaisDesabilitados
                                                    ? 'text-gray-400'
                                                    : config.modo_escuro ? 'text-white' : 'text-gray-800'
                                                }`}>
                                                  {quantidade}
                                                </span>

                                                {/* Botão Incrementar */}
                                                <button
                                                  onClick={() => incrementarAdicional(produto.id, item.id)}
                                                  disabled={adicionaisDesabilitados}
                                                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
                                                    adicionaisDesabilitados
                                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                      : config.modo_escuro
                                                      ? 'bg-blue-600 text-white hover:bg-blue-500'
                                                      : 'bg-blue-500 text-white hover:bg-blue-600'
                                                  }`}
                                                  title={adicionaisDesabilitados ? 'Adicione o produto principal primeiro' : ''}
                                                >
                                                  <Plus size={10} />
                                                </button>
                                              </>
                                            );
                                          })()}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Preço e controles - Só mostra quando NÃO estiver usando fotos minimizadas */}
                  {!config.cardapio_fotos_minimizadas && (
                    <div className="flex items-center justify-between">
                      {config.mostrar_precos && (
                        <div className="flex flex-col">
                          <span className="text-2xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
                            {formatarPreco(produto.preco)}
                          </span>
                        </div>
                      )}

                      {obterWhatsAppEmpresa() && (
                        <div className="flex items-center gap-3">
                        {/* Controles de Quantidade */}
                        <div className="flex items-center gap-2">
                          {/* Botão Decrementar */}
                          <button
                            onClick={() => decrementarQuantidade(produto.id)}
                            disabled={obterQuantidadeProduto(produto.id) === 0 || lojaAberta === false}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                              obterQuantidadeProduto(produto.id) === 0 || lojaAberta === false
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : config.modo_escuro
                                ? 'bg-gray-600 text-white hover:bg-gray-500'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            <Minus size={14} />
                          </button>

                          {/* Campo de Quantidade */}
                          {produtoEditandoQuantidade === produto.id && lojaAberta !== false ? (
                            <input
                              type="text"
                              value={formatarQuantidade(obterQuantidadeProduto(produto.id), produto.unidade_medida)}
                              onChange={(e) => handleQuantidadeInputChange(produto.id, e.target.value)}
                              onBlur={() => setProdutoEditandoQuantidade(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  setProdutoEditandoQuantidade(null);
                                }
                              }}
                              className={`w-12 h-8 text-center text-sm font-semibold rounded border-2 focus:outline-none ${
                                config.modo_escuro
                                  ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500'
                                  : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                              }`}
                              placeholder={produto.unidade_medida?.fracionado ? "0,000" : "0"}
                              autoFocus
                            />
                          ) : (
                            <button
                              onClick={() => lojaAberta !== false && setProdutoEditandoQuantidade(produto.id)}
                              disabled={lojaAberta === false}
                              className={`w-12 h-8 text-center text-sm font-semibold rounded transition-colors ${
                                lojaAberta === false
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : config.modo_escuro
                                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                              }`}
                            >
                              {formatarQuantidade(obterQuantidadeProduto(produto.id), produto.unidade_medida)}
                            </button>
                          )}

                          {/* Botão Incrementar */}
                          <button
                            onClick={() => incrementarQuantidade(produto.id)}
                            disabled={lojaAberta === false}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                              lojaAberta === false
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : config.modo_escuro
                                ? 'bg-blue-600 text-white hover:bg-blue-500'
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        {/* Botão Pedir - OCULTO */}
                        {false && (
                          <button
                            onClick={() => handlePedirWhatsApp(produto)}
                            disabled={lojaAberta === false}
                            className={`group/btn relative overflow-hidden px-6 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg ${
                              lojaAberta === false
                                ? 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-60'
                                : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white transform hover:scale-105 hover:shadow-xl cursor-pointer'
                            }`}
                          >
                            <span>{lojaAberta === false ? 'Loja Fechada' : 'Pedir'}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Botão Flutuante do Carrinho */}
      {!carrinhoAberto && obterQuantidadeTotalItens() > 0 && (
        <button
          onClick={() => setCarrinhoAberto(true)}
          className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 z-30 ${
            config.modo_escuro
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
              : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
          }`}
        >
          <div className="relative flex items-center justify-center">
            <ShoppingCart size={24} />
            <span className={`absolute -top-2 -right-2 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
              config.modo_escuro ? 'bg-red-500 text-white' : 'bg-red-500 text-white'
            }`}>
              {obterQuantidadeTotalItens()}
            </span>
          </div>
        </button>
      )}

      {/* Modal de Confirmação para Limpar Carrinho */}
      {modalConfirmacaoAberto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`max-w-md w-full rounded-2xl shadow-2xl ${
            config.modo_escuro ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            {/* Header do Modal */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <Trash2 size={24} className="text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${config.modo_escuro ? 'text-white' : 'text-gray-900'}`}>
                    Limpar Carrinho
                  </h3>
                  <p className={`text-sm ${config.modo_escuro ? 'text-gray-400' : 'text-gray-600'}`}>
                    Esta ação não pode ser desfeita
                  </p>
                </div>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6">
              <p className={`text-sm leading-relaxed ${config.modo_escuro ? 'text-gray-300' : 'text-gray-700'}`}>
                Tem certeza que deseja remover <strong>todos os {obterQuantidadeTotalItens()} itens</strong> do seu carrinho?
                {config.mostrar_precos && (
                  <span> O valor total de <strong>{formatarPreco(obterTotalCarrinho())}</strong> será perdido.</span>
                )}
              </p>
            </div>

            {/* Botões do Modal */}
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={cancelarLimparCarrinho}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                  config.modo_escuro
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarLimparCarrinho}
                className="flex-1 py-3 px-4 rounded-xl font-medium bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
              >
                Sim, Limpar Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização de Todos os Itens */}
      {modalTodosItensAberto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`max-w-2xl w-full max-h-[80vh] rounded-2xl shadow-2xl ${
            config.modo_escuro ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            {/* Header do Modal */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <List size={24} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold ${config.modo_escuro ? 'text-white' : 'text-gray-900'}`}>
                      Todos os Itens do Carrinho
                    </h3>
                    <p className={`text-sm ${config.modo_escuro ? 'text-gray-400' : 'text-gray-600'}`}>
                      {obterQuantidadeTotalItens()} {obterQuantidadeTotalItens() === 1 ? 'item' : 'itens'} • Total: {config.mostrar_precos ? formatarPreco(obterTotalCarrinho()) : 'Preços ocultos'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setModalTodosItensAberto(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    config.modo_escuro
                      ? 'text-gray-400 hover:bg-gray-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Lista de Itens - Scrollável */}
            <div className="p-6 max-h-96 overflow-y-auto">
              <div className="space-y-4">
                {obterItensCarrinho().map((produto, index) => {
                  const quantidade = obterQuantidadeProduto(produto.id);
                  return (
                    <div
                      key={produto.id}
                      className={`p-4 rounded-xl border transition-all duration-200 ${
                        config.modo_escuro
                          ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            {/* Número do item */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              config.modo_escuro
                                ? 'bg-blue-600 text-white'
                                : 'bg-blue-500 text-white'
                            }`}>
                              {index + 1}
                            </div>

                            {/* Foto do produto (quando configuração ativa) */}
                            {config.cardapio_fotos_minimizadas && (
                              <div
                                className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0 cursor-pointer"
                                onClick={() => abrirGaleriaFotos(produto, 0)}
                              >
                                {(() => {
                                  const fotoItem = getFotoPrincipal(produto);
                                  return fotoItem ? (
                                    <img
                                      src={fotoItem.url}
                                      alt={produto.nome}
                                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-200"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Package size={20} className={config.modo_escuro ? 'text-gray-500' : 'text-gray-400'} />
                                    </div>
                                  );
                                })()}

                                {/* Contador de fotos para carrinho */}
                                {produto.fotos_count && produto.fotos_count > 1 && (
                                  <div className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                                    {produto.fotos_count}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex-1">
                              <h4 className={`font-semibold text-sm ${config.modo_escuro ? 'text-white' : 'text-gray-800'}`}>
                                {produto.nome}
                              </h4>
                              {produto.descricao && (
                                <p className={`text-xs mt-1 ${config.modo_escuro ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {produto.descricao}
                                </p>
                              )}
                              {config.mostrar_precos && (
                                <div className={`text-xs mt-1 ${config.modo_escuro ? 'text-gray-300' : 'text-gray-600'}`}>
                                  {formatarPreco(produto.preco)} × {formatarQuantidade(quantidade, produto.unidade_medida)} = {formatarPreco(produto.preco * quantidade)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quantidade e Controles */}
                        <div className="flex items-center gap-3 ml-4">
                          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            config.modo_escuro
                              ? 'bg-gray-600 text-white'
                              : 'bg-gray-200 text-gray-800'
                          }`}>
                            {formatarQuantidade(quantidade, produto.unidade_medida)}
                            {produto.unidade_medida && (
                              <span className="ml-1 text-xs opacity-75">
                                {produto.unidade_medida.sigla}
                              </span>
                            )}
                          </div>

                          {/* Controles de Quantidade */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => decrementarQuantidade(produto.id)}
                              disabled={lojaAberta === false}
                              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                                lojaAberta === false
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : config.modo_escuro
                                  ? 'bg-gray-600 text-white hover:bg-gray-500'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              <Minus size={12} />
                            </button>

                            <button
                              onClick={() => incrementarQuantidade(produto.id)}
                              disabled={lojaAberta === false}
                              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                                lojaAberta === false
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : config.modo_escuro
                                  ? 'bg-blue-600 text-white hover:bg-blue-500'
                                  : 'bg-blue-500 text-white hover:bg-blue-600'
                              }`}
                            >
                              <Plus size={12} />
                            </button>

                            <button
                              onClick={() => removerItemCarrinho(produto.id)}
                              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ml-1 ${
                                config.modo_escuro
                                  ? 'bg-red-600 text-white hover:bg-red-500'
                                  : 'bg-red-500 text-white hover:bg-red-600'
                              }`}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer com Botões */}
            <div className="p-6 pt-0 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-3">
                <button
                  onClick={() => setModalTodosItensAberto(false)}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                    config.modo_escuro
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                  }`}
                >
                  Fechar
                </button>
                {obterWhatsAppEmpresa() && (
                  <button
                    onClick={() => {
                      setModalTodosItensAberto(false);
                      handleFinalizarPedido();
                    }}
                    disabled={lojaAberta === false}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                      lojaAberta === false
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-60'
                        : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white transform hover:scale-[1.02] shadow-lg'
                    }`}
                  >
                    {lojaAberta === false ? 'Loja Fechada' : 'Finalizar Pedido'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast de Sucesso */}
      {toastVisivel && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-sm ${
            config.modo_escuro
              ? 'bg-gray-800/95 border border-gray-700 text-white'
              : 'bg-white/95 border border-gray-200 text-gray-900'
          }`}>
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium text-sm">Carrinho limpo com sucesso!</p>
              <p className={`text-xs ${config.modo_escuro ? 'text-gray-400' : 'text-gray-600'}`}>
                Todos os itens foram removidos
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer moderno */}
      <footer className={`mt-16 ${config.modo_escuro ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t`}>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <svg className={`w-6 h-6 ${config.modo_escuro ? 'text-purple-400' : 'text-purple-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className={`font-semibold ${config.modo_escuro ? 'text-white' : 'text-gray-800'}`}>
                Cardápio Digital
              </span>
            </div>
            <p className={`text-sm ${config.modo_escuro ? 'text-gray-400' : 'text-gray-600'}`}>
              Powered by <span className="font-semibold text-purple-600">Nexo Pedidos</span>
            </p>
          </div>
        </div>
      </footer>

      {/* Modal de Galeria de Fotos */}
      <FotoGaleria
        fotos={fotosProdutoSelecionado}
        isOpen={galeriaAberta}
        onClose={() => setGaleriaAberta(false)}
        initialFotoIndex={fotoInicialIndex}
      />
    </div>
    </>
  );
};

export default CardapioPublicoPage;
