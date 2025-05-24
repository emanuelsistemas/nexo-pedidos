import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Home, Settings, QrCode, MessageSquare, Package2, ChevronDown, ListOrdered, PlusCircle, Bike, MapPin, Users, DollarSign, Ruler, ShoppingBag, ShoppingCart } from 'lucide-react';
import Logo from '../comum/Logo';
import UserProfileFooter from './UserProfileFooter';
import { useSidebarStore } from '../../store/sidebarStore';
import { supabase } from '../../lib/supabase';

const Sidebar: React.FC = () => {
  const { isExpanded, toggle } = useSidebarStore();
  const [expandedSubmenu, setExpandedSubmenu] = useState<string | null>(null);
  const [opcoesAdicionaisHabilitado, setOpcoesAdicionaisHabilitado] = useState(false);
  const location = useLocation();

  // Carregar configuração de opções adicionais
  useEffect(() => {
    const loadOpcoesAdicionaisConfig = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select('empresa_id')
          .eq('id', userData.user.id)
          .single();

        if (!usuarioData?.empresa_id) return;

        const { data: configData } = await supabase
          .from('produtos_config')
          .select('opcoes_adicionais')
          .eq('empresa_id', usuarioData.empresa_id)
          .single();

        if (configData) {
          setOpcoesAdicionaisHabilitado(configData.opcoes_adicionais || false);
        }
      } catch (error) {
        console.error('Erro ao carregar configuração de opções adicionais:', error);
      }
    };

    loadOpcoesAdicionaisConfig();

    // Escutar evento customizado para atualização imediata
    const handleOpcoesAdicionaisChange = (event: CustomEvent) => {
      console.log('Evento opcoesAdicionaisChanged recebido:', event.detail);
      console.log('Atualizando opcoesAdicionaisHabilitado para:', event.detail.opcoesAdicionais);
      setOpcoesAdicionaisHabilitado(event.detail.opcoesAdicionais);
    };

    window.addEventListener('opcoesAdicionaisChanged', handleOpcoesAdicionaisChange as EventListener);

    // Escutar mudanças na tabela produtos_config (backup)
    const subscription = supabase
      .channel('produtos_config_changes')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'produtos_config'
        },
        () => {
          console.log('Mudança detectada na tabela produtos_config');
          loadOpcoesAdicionaisConfig();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('opcoesAdicionaisChanged', handleOpcoesAdicionaisChange as EventListener);
      subscription.unsubscribe();
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

    return [
      { icon: Home, label: 'Dashboard', path: '/dashboard', tooltip: 'Dashboard' },
      {
        icon: Package2,
        label: 'Produtos',
        tooltip: 'Produtos',
        submenu: produtosSubmenu
      },
      { icon: Users, label: 'Clientes', path: '/dashboard/clientes', tooltip: 'Clientes' },
      { icon: ShoppingBag, label: 'Pedidos', path: '/dashboard/pedidos', tooltip: 'Pedidos' },
      { icon: DollarSign, label: 'Faturamento', path: '/dashboard/faturamento', tooltip: 'Faturamento' },
      { icon: ShoppingCart, label: 'PDV', path: '/dashboard/pdv', tooltip: 'Ponto de Venda' },
      // Item "Gestor" ocultado
      // { icon: MessageSquare, label: 'Gestor', path: '/dashboard/gestor', tooltip: 'Gestor de Pedidos' },

      // Item "Conexão" ocultado
      // { icon: QrCode, label: 'Conexão', path: '/dashboard/conexao', tooltip: 'Conexão WhatsApp' },

      // Item "Entregadores" ocultado
      // {
      //   icon: Bike,
      //   label: 'Entregadores',
      //   tooltip: 'Entregadores',
      //   submenu: [
      //     { icon: Bike, label: 'Motoboy', path: '/dashboard/entregador', tooltip: 'Motoboys' },
      //     { icon: MapPin, label: 'Taxa de Entrega', path: '/dashboard/entregador/taxa', tooltip: 'Taxa de Entrega' }
      //   ]
      // },

      { icon: Settings, label: 'Configurações', path: '/dashboard/configuracoes', tooltip: 'Configurações' },
    ];
  };

  const menuItems = getMenuItems();

  // Log para debug - mostrar quando o estado muda
  useEffect(() => {
    console.log('Estado opcoesAdicionaisHabilitado mudou para:', opcoesAdicionaisHabilitado);
  }, [opcoesAdicionaisHabilitado]);

  const toggleSubmenu = (label: string) => {
    setExpandedSubmenu(expandedSubmenu === label ? null : label);
  };

  const renderMenuItem = (item: any) => {
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
      <div className="flex-1">
        <div className="h-16 flex items-center px-4 border-b border-gray-800 relative">
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

        <nav className="flex-1 py-4 px-2 overflow-y-auto custom-scrollbar">
          {menuItems.map(renderMenuItem)}
        </nav>
      </div>

      <UserProfileFooter />
    </motion.div>
  );
};

export default Sidebar;