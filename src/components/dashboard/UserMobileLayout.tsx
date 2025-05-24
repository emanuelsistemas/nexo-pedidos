import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, ShoppingBag, User, LogOut, Plus, Users, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import LoadingScreen from './LoadingScreen';
import SessionCheck from '../comum/SessionCheck';
import Logo from '../comum/Logo';
import { useResponsiveRedirect } from '../../hooks/useResponsiveRedirect';
import { useAuthSession } from '../../hooks/useAuthSession';

const UserMobileLayout: React.FC = () => {
  const { withSessionCheck } = useAuthSession();
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [userName, setUserName] = useState('');
  const [empresaNomeFantasia, setEmpresaNomeFantasia] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  // Hook para redirecionamento responsivo automático
  useResponsiveRedirect();

  useEffect(() => {
    // Carregar dados do usuário
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userData } = await supabase
            .from('usuarios')
            .select(`
              nome,
              empresa_id
            `)
            .eq('id', user.id)
            .single();

          if (userData) {
            setUserName(userData.nome);

            // Buscar o nome fantasia da empresa
            if (userData.empresa_id) {
              const { data: empresaData } = await supabase
                .from('empresas')
                .select('nome_fantasia')
                .eq('id', userData.empresa_id)
                .single();

              if (empresaData && empresaData.nome_fantasia) {
                setEmpresaNomeFantasia(empresaData.nome_fantasia);
              }
            }
          }
        }

        // Remover o loading assim que os dados forem carregados
        setIsLoading(false);
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        // Mesmo em caso de erro, remover o loading para não bloquear a interface
        setIsLoading(false);
      }
    };

    // Iniciar o carregamento dos dados
    getUser();
  }, []);



  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/entrar', { replace: true });
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Menu items para o footer
  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/user/dashboard' },
    { icon: ShoppingBag, label: 'Pedidos', path: '/user/pedidos' },
    { icon: Package, label: 'Produtos', path: '/user/produtos' },
    { icon: Users, label: 'Clientes', path: '/user/clientes' },
    { icon: User, label: 'Perfil', path: '/user/perfil' },
  ];

  return (
    <SessionCheck fallback={<LoadingScreen />}>
      <div className="min-h-screen bg-background-dark flex flex-col">
      {/* Header com logo, nome fantasia, saudação e botões */}
      <header className="bg-background-card border-b border-gray-800 p-3 flex items-center justify-between">
        <div className="flex items-center gap-1 flex-shrink-0 max-w-[45%]">
          <div className="flex-shrink-0">
            <Logo size="sm" />
          </div>
          {empresaNomeFantasia && (
            <span className="text-white text-xs font-medium ml-1 truncate">
              {empresaNomeFantasia}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-white text-xs truncate max-w-[70px]">
            Olá, <span className="font-medium">{userName}</span>
          </div>



          <button
            className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/10 text-red-400"
            onClick={() => setShowConfirmation(true)}
            title="Sair do sistema"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className={`flex-1 p-4 overflow-auto custom-scrollbar ${
        location.pathname === '/user/pdv' ? 'pb-4' : 'pb-20'
      }`}>
        <Outlet />
      </main>

      {/* Botão flutuante de adicionar pedido (apenas na página de pedidos) */}
      {location.pathname === '/user/pedidos' && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileTap={{ scale: 0.95 }}
          className="fixed right-4 bottom-20 w-14 h-14 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-lg z-20"
          onClick={() => navigate('/user/pedidos/novo')}
        >
          <Plus size={24} />
        </motion.button>
      )}

      {/* Botão flutuante de adicionar cliente (apenas na página de clientes) */}
      {location.pathname === '/user/clientes' && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileTap={{ scale: 0.95 }}
          className="fixed right-4 bottom-20 w-14 h-14 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-lg z-20"
          onClick={() => navigate('/user/clientes/novo')}
        >
          <Plus size={24} />
        </motion.button>
      )}

      {/* Footer com menu de navegação - Oculto no PDV */}
      {location.pathname !== '/user/pdv' && (
        <footer className="fixed bottom-0 left-0 right-0 bg-background-card border-t border-gray-800 z-10">
          <div className="flex justify-around items-center h-16 overflow-x-auto custom-scrollbar">
            {menuItems.map((item) => (
              <button
                key={item.path}
                className={`flex flex-col items-center justify-center w-1/5 h-full ${
                  location.pathname.startsWith(item.path)
                    ? 'text-primary-400'
                    : 'text-gray-400'
                }`}
                onClick={() => navigate(item.path)}
              >
                <item.icon size={18} />
                <span className="text-xs mt-1">{item.label}</span>
              </button>
            ))}
          </div>
        </footer>
      )}

      {/* Modal de confirmação de logout */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background-card p-6 rounded-lg shadow-xl max-w-sm mx-4"
            >
              <h3 className="text-xl font-semibold text-white mb-4">Confirmar saída</h3>
              <p className="text-gray-400 mb-6">
                Tem certeza que deseja sair do sistema?
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  Sair
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </SessionCheck>
  );
};

export default UserMobileLayout;
