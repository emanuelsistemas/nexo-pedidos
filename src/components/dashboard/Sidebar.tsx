import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Home, Settings, QrCode, MessageSquare, Package2, ChevronDown, ListOrdered, PlusCircle, Bike, MapPin, Users, DollarSign, Ruler, ShoppingBag, ShoppingCart, Truck, FileText } from 'lucide-react';
import Logo from '../comum/Logo';
import UserProfileFooter from './UserProfileFooter';
import { useSidebarStore } from '../../store/sidebarStore';
import { supabase } from '../../lib/supabase';
import { useFullscreen } from '../../hooks/useFullscreen';

const Sidebar: React.FC = () => {
  const { isExpanded, toggle } = useSidebarStore();
  const { enterFullscreen } = useFullscreen();
  const navigate = useNavigate();
  const [expandedSubmenu, setExpandedSubmenu] = useState<string | null>(null);
  const [opcoesAdicionaisHabilitado, setOpcoesAdicionaisHabilitado] = useState(false);
  const [taxaEntregaHabilitada, setTaxaEntregaHabilitada] = useState(false);
  const [conexaoHabilitada, setConexaoHabilitada] = useState(false);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const location = useLocation();

  // Carregar configuração de opções adicionais e taxa de entrega
  useEffect(() => {
    const loadConfiguracoes = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select('empresa_id')
          .eq('id', userData.user.id)
          .single();

        if (!usuarioData?.empresa_id) return;

        // Armazenar empresa_id para uso nos eventos
        setEmpresaId(usuarioData.empresa_id);

        // Carregar configuração de opções adicionais
        const { data: configData } = await supabase
          .from('produtos_config')
          .select('opcoes_adicionais')
          .eq('empresa_id', usuarioData.empresa_id)
          .single();

        if (configData) {
          setOpcoesAdicionaisHabilitado(configData.opcoes_adicionais || false);
        }

        // Carregar configuração de taxa de entrega
        const { data: taxaEntregaConfigData } = await supabase
          .from('taxa_entrega_config')
          .select('habilitado')
          .eq('empresa_id', usuarioData.empresa_id)
          .single();

        if (taxaEntregaConfigData) {
          setTaxaEntregaHabilitada(taxaEntregaConfigData.habilitado || false);
        }

        // Carregar configuração de conexão
        const { data: conexaoConfigData } = await supabase
          .from('conexao_config')
          .select('habilita_conexao_whatsapp')
          .eq('empresa_id', usuarioData.empresa_id)
          .single();

        if (conexaoConfigData) {
          setConexaoHabilitada(conexaoConfigData.habilita_conexao_whatsapp || false);
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      }
    };

    loadConfiguracoes();

    // Escutar evento customizado para atualização imediata de opções adicionais
    const handleOpcoesAdicionaisChange = (event: CustomEvent) => {
      console.log('Evento opcoesAdicionaisChanged recebido:', event.detail);
      console.log('Atualizando opcoesAdicionaisHabilitado para:', event.detail.opcoesAdicionais);
      setOpcoesAdicionaisHabilitado(event.detail.opcoesAdicionais);
    };

    // Escutar evento customizado para atualização imediata de taxa de entrega (mesmo padrão das opções adicionais)
    const handleTaxaEntregaChange = (event: CustomEvent) => {
      console.log('🚀 Evento taxaEntregaChanged recebido:', event.detail);
      console.log('🚀 Atualizando taxaEntregaHabilitada para:', event.detail.taxaEntregaHabilitada);
      setTaxaEntregaHabilitada(event.detail.taxaEntregaHabilitada);
    };

    // Escutar evento customizado para atualização imediata de conexão
    const handleConexaoChange = (event: CustomEvent) => {
      console.log('🔗 Evento conexaoChanged recebido:', event.detail);
      console.log('🔗 Atualizando conexaoHabilitada para:', event.detail.conexaoHabilitada);
      setConexaoHabilitada(event.detail.conexaoHabilitada);
    };

    window.addEventListener('opcoesAdicionaisChanged', handleOpcoesAdicionaisChange as EventListener);
    window.addEventListener('taxaEntregaChanged', handleTaxaEntregaChange as EventListener);
    window.addEventListener('conexaoChanged', handleConexaoChange as EventListener);

    // Escutar mudanças nas tabelas (backup)
    const produtosSubscription = supabase
      .channel('produtos_config_changes')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'produtos_config'
        },
        () => {
          console.log('Mudança detectada na tabela produtos_config');
          loadConfiguracoes();
        }
      )
      .subscribe();

    const taxaEntregaSubscription = supabase
      .channel('taxa_entrega_config_changes')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'taxa_entrega_config'
        },
        () => {
          console.log('Mudança detectada na tabela taxa_entrega_config');
          loadConfiguracoes();
        }
      )
      .subscribe();

    const conexaoSubscription = supabase
      .channel('conexao_config_changes')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conexao_config'
        },
        () => {
          console.log('Mudança detectada na tabela conexao_config');
          loadConfiguracoes();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('opcoesAdicionaisChanged', handleOpcoesAdicionaisChange as EventListener);
      window.removeEventListener('taxaEntregaChanged', handleTaxaEntregaChange as EventListener);
      window.removeEventListener('conexaoChanged', handleConexaoChange as EventListener);
      produtosSubscription.unsubscribe();
      taxaEntregaSubscription.unsubscribe();
      conexaoSubscription.unsubscribe();
    };
  }, []);

  // Função para gerar os itens do menu dinamicamente
  const getMenuItems = () => {
    const produtosSubmenu = [
      { icon: ListOrdered, label: 'Itens', path: '/dashboard/produtos', tooltip: 'Lista de Produtos' },
      { icon: Ruler, label: 'Unidade', path: '/dashboard/unidade-medida', tooltip: 'Unidades de Medida' }
    ];

    // Adicionar submenu "Adicionais" se estiver habilitado
    if (opcoesAdicionaisHabilitado) {
      produtosSubmenu.push({
        icon: PlusCircle,
        label: 'Adicionais',
        path: '/dashboard/produtos/adicionais',
        tooltip: 'Opções Adicionais'
      });
    }

    const menuItems = [
      { icon: Home, label: 'Dashboard', path: '/dashboard', tooltip: 'Dashboard' },
      {
        icon: Package2,
        label: 'Produtos',
        tooltip: 'Produtos',
        submenu: produtosSubmenu
      },
      { icon: Users, label: 'Clientes', path: '/dashboard/clientes', tooltip: 'Clientes' },
      { icon: ShoppingBag, label: 'Pedidos', path: '/dashboard/pedidos', tooltip: 'Pedidos' },
      // { icon: DollarSign, label: 'Faturamento', path: '/dashboard/faturamento', tooltip: 'Faturamento' },
      { icon: ShoppingCart, label: 'PDV', path: '/dashboard/pdv', tooltip: 'Ponto de Venda', isPDV: true },
      {
        icon: FileText,
        label: 'Notas Fiscais',
        tooltip: 'Notas Fiscais',
        submenu: [
          { icon: FileText, label: 'NFe', path: '/dashboard/nfe', tooltip: 'Nota Fiscal Eletrônica' },
          { icon: FileText, label: 'Inutilização', path: '/dashboard/inutilizacao', tooltip: 'Inutilização de Numeração' }
        ]
      },
    ];

    // Adicionar "Taxa de Entrega" se estiver habilitado
    if (taxaEntregaHabilitada) {
      menuItems.push({
        icon: Truck,
        label: 'Taxa de Entrega',
        path: '/dashboard/entregador/taxa',
        tooltip: 'Taxa de Entrega'
      });
    }

    // Adicionar "Conexão" se estiver habilitado
    if (conexaoHabilitada) {
      menuItems.push({
        icon: MessageSquare,
        label: 'Conexão',
        path: '/dashboard/conexao',
        tooltip: 'Conexão com WhatsApp'
      });
    }

    // Adicionar configurações sempre por último
    menuItems.push({
      icon: Settings,
      label: 'Configurações',
      path: '/dashboard/configuracoes',
      tooltip: 'Configurações'
    });

    return menuItems;
  };

  const menuItems = getMenuItems();



  const toggleSubmenu = (label: string) => {
    setExpandedSubmenu(expandedSubmenu === label ? null : label);
  };

  // Função para lidar com o clique no PDV
  const handlePDVClick = async () => {
    try {
      // Ativar fullscreen primeiro
      await enterFullscreen();
      console.log('Fullscreen ativado, navegando para PDV...');

      // Navegar para o PDV
      navigate('/dashboard/pdv');
    } catch (error) {
      console.log('Erro ao ativar fullscreen, navegando mesmo assim:', error);
      // Navegar mesmo se o fullscreen falhar
      navigate('/dashboard/pdv');
    }
  };

  const renderMenuItem = (item: any) => {
    // Tratar o item PDV de forma especial
    if (item.isPDV) {
      const isActive = location.pathname === item.path;

      return (
        <button
          key={item.path}
          onClick={handlePDVClick}
          className={`w-full flex items-center px-3 py-2 my-1 rounded-lg transition-colors ${
            isActive
              ? 'bg-primary-500/10 text-primary-400'
              : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
          }`}
          title={!isExpanded ? item.tooltip : undefined}
        >
          <item.icon size={20} />
          {isExpanded && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="ml-3"
            >
              {item.label}
            </motion.span>
          )}
        </button>
      );
    }

    if (item.submenu) {
      const isSubmenuActive = item.submenu.some((subItem: any) => location.pathname === subItem.path);

      return (
        <div key={item.label}>
          <button
            onClick={() => toggleSubmenu(item.label)}
            className={`w-full flex items-center px-3 py-2 my-1 rounded-lg transition-colors ${
              isSubmenuActive ? 'text-primary-400' : 'text-gray-400'
            } hover:bg-gray-800/50 hover:text-white group relative`}
            title={!isExpanded ? item.tooltip : undefined}
          >
            <item.icon size={20} />
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex items-center justify-between ml-3"
              >
                <span>{item.label}</span>
                <ChevronDown
                  size={16}
                  className={`transform transition-transform ${
                    expandedSubmenu === item.label ? 'rotate-180' : ''
                  }`}
                />
              </motion.div>
            )}
          </button>
          {(isExpanded || !isExpanded && expandedSubmenu === item.label) && expandedSubmenu === item.label && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className={`ml-${isExpanded ? '6' : '2'} mr-2 bg-black/40 rounded-lg py-1`}
            >
              {item.submenu.map((subItem: any) => (
                <NavLink
                  key={subItem.path}
                  to={subItem.path}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 my-1 rounded-lg transition-colors ${
                      isActive && location.pathname === subItem.path
                        ? 'bg-primary-500/10 text-primary-400'
                        : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                    }`
                  }
                  title={!isExpanded ? subItem.tooltip : undefined}
                >
                  {!isExpanded ? (
                    <subItem.icon size={20} />
                  ) : (
                    <span className="flex items-center gap-3">
                      <subItem.icon size={20} />
                      {subItem.label}
                    </span>
                  )}
                </NavLink>
              ))}
            </motion.div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={({ isActive }) =>
          `flex items-center px-3 py-2 my-1 rounded-lg transition-colors ${
            isActive && location.pathname === item.path
              ? 'bg-primary-500/10 text-primary-400'
              : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
          }`
        }
        title={!isExpanded ? item.tooltip : undefined}
      >
        <item.icon size={20} />
        {isExpanded && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="ml-3"
          >
            {item.label}
          </motion.span>
        )}
      </NavLink>
    );
  };

  return (
    <motion.div
      initial={{ width: '72px' }}
      animate={{ width: isExpanded ? '240px' : '72px' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="h-screen bg-background-card fixed left-0 top-0 z-50 border-r border-gray-800 flex flex-col"
    >
      {/* Header fixo */}
      <div className="h-16 flex items-center px-4 border-b border-gray-800 relative flex-shrink-0">
        <div className="flex-1 overflow-hidden pl-2">
          {isExpanded ? (
            <Logo size="md" />
          ) : (
            <span className="text-3xl font-logo text-accent-500 font-bold">n</span>
          )}
        </div>
        <button
          onClick={toggle}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-background-card border border-gray-700 rounded-full flex items-center justify-center text-white hover:text-accent-500 hover:border-accent-500 transition-all duration-300 shadow-lg"
        >
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronRight size={16} />
          </motion.div>
        </button>
      </div>

      {/* Área de navegação com scroll */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto custom-scrollbar min-h-0">
        <div className="space-y-1">
          {menuItems.map(renderMenuItem)}
        </div>
      </nav>

      {/* Footer fixo */}
      <div className="flex-shrink-0">
        <UserProfileFooter />
      </div>
    </motion.div>
  );
};

export default Sidebar;