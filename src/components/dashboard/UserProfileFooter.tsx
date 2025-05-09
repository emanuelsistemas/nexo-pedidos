import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CircleUserRound, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSidebarStore } from '../../store/sidebarStore';

const UserProfileFooter: React.FC = () => {
  const navigate = useNavigate();
  const { isExpanded } = useSidebarStore();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  React.useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');
      }
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      
      // Como window.close() não funciona em navegadores modernos por questões de segurança,
      // vamos usar outras abordagens:
      
      // 1. Substituir todo o conteúdo da página e redirecionar para a tela de login
      document.body.innerHTML = '';
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.body.style.background = '#0a0a0c';
      
      // 2. Adicionar uma mensagem temporária
      const messageDiv = document.createElement('div');
      messageDiv.style.position = 'fixed';
      messageDiv.style.top = '50%';
      messageDiv.style.left = '50%';
      messageDiv.style.transform = 'translate(-50%, -50%)';
      messageDiv.style.color = 'white';
      messageDiv.style.fontFamily = 'sans-serif';
      messageDiv.style.textAlign = 'center';
      messageDiv.innerHTML = `
        <h2>Logout realizado com sucesso</h2>
        <p>Redirecionando para a tela de login...</p>
      `;
      document.body.appendChild(messageDiv);
      
      // 3. Redirecionar para a página de login de forma mais robusta
      setTimeout(() => {
        try {
          // Tenta usar o navigate do React Router
          navigate('/entrar', { replace: true });
          
          // Como método alternativo, caso o navigate falhe
          setTimeout(() => {
            // Verifica se ainda estamos na mesma página
            if (document.body.innerHTML.includes('Logout realizado')) {
              // Redirecionamento direto via window.location
              window.location.href = '/';
            }
          }, 500);
        } catch (error) {
          console.error('Erro ao redirecionar:', error);
          // Redirecionamento alternativo caso o navigate falhe
          window.location.href = '/';
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <>
      <div className="mt-auto border-t border-gray-800">
        <div className="flex items-center px-4 py-2 my-1 mx-2 rounded-lg text-gray-400 hover:bg-gray-800/50 hover:text-white transition-colors">
          <CircleUserRound size={20} />
          {isExpanded && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="ml-3 text-sm truncate"
            >
              {userEmail}
            </motion.span>
          )}
        </div>
        <button
          onClick={() => setShowConfirmation(true)}
          className="w-full flex items-center px-4 py-2 my-1 mx-2 rounded-lg text-red-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut size={20} />
          {isExpanded && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="ml-3 text-sm"
            >
              Sair
            </motion.span>
          )}
        </button>
      </div>

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
    </>
  );
};

export default UserProfileFooter;