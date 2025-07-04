import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronDown, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showMessage } from '../../utils/toast';

interface Produto {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  foto_url?: string;
  grupo_id: string;
  grupo_nome?: string;
  ativo: boolean;
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

  const carregarDadosCardapio = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Buscar configuração PDV pelo slug personalizado
      console.log('🔍 Buscando configuração PDV para slug:', slug);
      const { data: pdvConfigData, error: configError } = await supabase
        .from('pdv_config')
        .select('empresa_id, cardapio_url_personalizada, modo_escuro_cardapio, exibir_fotos_itens_cardapio, logo_url, cardapio_digital')
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
        mostrar_fotos: pdvConfigData.exibir_fotos_itens_cardapio !== false // Default true se não definido
      }));

      // 3. Buscar produtos ativos da empresa
      const { data: produtosData, error: produtosError } = await supabase
        .from('produtos')
        .select('id, nome, descricao, preco, grupo_id, ativo')
        .eq('empresa_id', pdvConfigData.empresa_id)
        .eq('ativo', true)
        .order('nome');

      if (produtosError) {
        console.error('Erro ao carregar produtos:', produtosError);
        setError('Erro ao carregar produtos do cardápio.');
        return;
      }

      // 4. Buscar fotos dos produtos
      const produtosIds = produtosData?.map(p => p.id) || [];
      let fotosData: any[] = [];

      if (produtosIds.length > 0) {
        const { data: fotosResult, error: fotosError } = await supabase
          .from('produto_fotos')
          .select('produto_id, url, principal')
          .in('produto_id', produtosIds)
          .eq('principal', true); // Buscar apenas a foto principal

        if (!fotosError && fotosResult) {
          fotosData = fotosResult;
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

      // Processar produtos com nome do grupo e foto
      const produtosProcessados = produtosData?.map(produto => {
        const grupo = gruposData.find(g => g.id === produto.grupo_id);
        const foto = fotosData.find(f => f.produto_id === produto.id);
        return {
          ...produto,
          grupo_nome: grupo?.nome || 'Sem categoria',
          foto_url: foto?.url || null
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

  const handlePedirWhatsApp = (produto: Produto) => {
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
    const mensagem = `Olá! Gostaria de fazer um pedido:\n\n*${produto.nome}*\n${config.mostrar_precos ? `Preço: ${formatarPreco(produto.preco)}` : ''}`;
    const url = `https://wa.me/55${whatsapp}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
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

      {/* Header com gradiente */}
      <div className={`relative ${config.modo_escuro ? 'bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800' : 'bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800'} shadow-xl`}>
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
                  className={`w-10 h-full flex items-center justify-center transition-all duration-200 border-r ${
                    isAnimating
                      ? 'opacity-50 cursor-not-allowed'
                      : config.modo_escuro
                      ? 'text-gray-400 hover:text-white hover:bg-gray-700/50 border-gray-600 hover:scale-110'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50 border-gray-300 hover:scale-110'
                  }`}
                >
                  <ChevronLeft size={20} />
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
                  <ChevronRight size={20} />
                  {/* Indicador de mais itens */}
                  <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse ${
                    config.modo_escuro ? 'bg-purple-400' : 'bg-purple-600'
                  }`}></div>
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
            {produtosFiltrados.map(produto => (
              <div
                key={produto.id}
                className={`group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
                  config.modo_escuro
                    ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50'
                    : 'bg-white border border-gray-200 shadow-lg'
                }`}
              >
                {/* Imagem do produto - Condicional baseada na configuração */}
                {config.mostrar_fotos && (
                  produto.foto_url ? (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={produto.foto_url}
                        alt={produto.nome}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                    </div>
                  ) : (
                    <div className={`h-48 flex items-center justify-center ${config.modo_escuro ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <svg className={`w-16 h-16 ${config.modo_escuro ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )
                )}

                {/* Conteúdo do card */}
                <div className="p-6">
                  <div className="mb-4">
                    <h3 className={`text-xl font-bold mb-2 ${config.modo_escuro ? 'text-white' : 'text-gray-800'}`}>
                      {produto.nome}
                    </h3>
                    {produto.descricao && (
                      <p className={`text-sm leading-relaxed ${config.modo_escuro ? 'text-gray-300' : 'text-gray-600'}`}>
                        {produto.descricao}
                      </p>
                    )}
                  </div>

                  {/* Preço e botão */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
                        {formatarPreco(produto.preco)}
                      </span>
                    </div>

                    {obterWhatsAppEmpresa() && (
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
    </div>
  );
};

export default CardapioPublicoPage;
