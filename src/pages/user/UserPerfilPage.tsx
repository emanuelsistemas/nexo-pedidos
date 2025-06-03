import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showMessage } from '../../utils/toast';

interface UserData {
  id: string;
  nome: string;
  email: string;
}

const UserPerfilPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);


  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);

      // Obter o usuário atual
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      // Obter dados do usuário
      const { data: userData, error } = await supabase
        .from('usuarios')
        .select('id, nome, email')
        .eq('id', authData.user.id)
        .single();

      if (error) throw error;

      setUserData(userData);
      setNome(userData.nome || '');
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar campos
    if (!nome.trim()) {
      showMessage('error', 'O nome é obrigatório');
      return;
    }

    // Validar senhas se fornecidas
    if (senha || confirmarSenha) {
      if (senha !== confirmarSenha) {
        showMessage('error', 'As senhas não coincidem');
        return;
      }

      if (senha.length < 6) {
        showMessage('error', 'A senha deve ter pelo menos 6 caracteres');
        return;
      }
    }

    try {
      setIsSaving(true);

      // Atualizar nome do usuário
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ nome })
        .eq('id', userData?.id);

      if (updateError) throw updateError;

      // Atualizar senha se fornecida
      if (senha) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: senha
        });

        if (passwordError) throw passwordError;
      }

      // Limpar campos de senha
      setSenha('');
      setConfirmarSenha('');

      showMessage('success', 'Perfil atualizado com sucesso!');
    } catch (error: any) {
      showMessage('error', error.message || 'Erro ao atualizar perfil');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-white mb-4">Meu Perfil</h1>

      {isLoading ? (
        <div className="bg-background-card rounded-lg border border-gray-800 p-6 space-y-6">
          {/* Mensagem de erro skeleton */}
          <div className="h-12 w-full bg-gray-800 rounded-lg animate-pulse"></div>

          <div className="space-y-4">
            {/* Nome skeleton */}
            <div>
              <div className="h-4 w-16 bg-gray-800 rounded mb-2 animate-pulse"></div>
              <div className="h-10 w-full bg-gray-800 rounded-lg animate-pulse"></div>
            </div>

            {/* Email skeleton */}
            <div>
              <div className="h-4 w-16 bg-gray-800 rounded mb-2 animate-pulse"></div>
              <div className="h-10 w-full bg-gray-800 rounded-lg animate-pulse"></div>
              <div className="h-3 w-48 bg-gray-800 rounded mt-1 animate-pulse"></div>
            </div>

            {/* Senha skeleton */}
            <div>
              <div className="h-4 w-24 bg-gray-800 rounded mb-2 animate-pulse"></div>
              <div className="h-10 w-full bg-gray-800 rounded-lg animate-pulse"></div>
            </div>

            {/* Confirmar senha skeleton */}
            <div>
              <div className="h-4 w-32 bg-gray-800 rounded mb-2 animate-pulse"></div>
              <div className="h-10 w-full bg-gray-800 rounded-lg animate-pulse"></div>
              <div className="h-3 w-64 bg-gray-800 rounded mt-1 animate-pulse"></div>
            </div>
          </div>

          {/* Botão skeleton */}
          <div className="h-10 w-full bg-gray-800 rounded-lg animate-pulse"></div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-background-card rounded-lg border border-gray-800 p-6"
        >
          <form onSubmit={handleSubmit} className="space-y-6">

            <div className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Nome
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={18} className="text-gray-500" />
                  </div>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                    placeholder="Seu nome completo"
                  />
                </div>
              </div>

              {/* Email (somente leitura) */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={18} className="text-gray-500" />
                  </div>
                  <input
                    type="email"
                    value={userData?.email || ''}
                    readOnly
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-10 pr-3 text-gray-400 focus:outline-none cursor-not-allowed"
                  />
                </div>
                <p className="text-gray-500 text-xs mt-1">O email não pode ser alterado</p>
              </div>

              {/* Senha */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Nova Senha <span className="text-gray-500 text-xs">(opcional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-gray-500" />
                  </div>
                  <input
                    type={mostrarSenha ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-10 pr-10 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                    placeholder="Digite para alterar sua senha"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                  >
                    {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirmar Senha */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-gray-500" />
                  </div>
                  <input
                    type={mostrarConfirmarSenha ? "text" : "password"}
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-10 pr-10 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                    placeholder="Confirme sua nova senha"
                    disabled={!senha}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                    disabled={!senha}
                  >
                    {mostrarConfirmarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-gray-500 text-xs mt-1">Deixe em branco para manter a senha atual</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
};

export default UserPerfilPage;
