import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Input from '../comum/Input';
import Button from '../comum/Button';
import { supabase } from '../../lib/supabase';
import { translateErrorMessage } from '../../utils/toast';

const FormEntrar: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (signInError) throw signInError;

      // Verificar o tipo e status do usuário
      const { data: userData } = await supabase
        .from('usuarios')
        .select(`
          status,
          tipo_user_config_id
        `)
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      // Verificar se o usuário está bloqueado
      if (userData?.status === false) {
        // Fazer logout para limpar a sessão
        await supabase.auth.signOut();
        throw new Error('Sua conta está bloqueada. Entre em contato com o administrador do sistema.');
      }

      // Verificar se é usuário do tipo "user" apenas
      let isUserOnly = false;
      if (userData?.tipo_user_config_id && Array.isArray(userData.tipo_user_config_id) && userData.tipo_user_config_id.length > 0) {
        const { data: tiposData } = await supabase
          .from('tipo_user_config')
          .select('tipo')
          .in('id', userData.tipo_user_config_id);

        // Se só tem tipo "user" e nenhum outro tipo, é user only
        isUserOnly = tiposData?.length === 1 && tiposData[0].tipo === 'user';
      }

      // Se for usuário do tipo "user" apenas, redirecionar para o dashboard mobile
      // Caso contrário, redirecionar para o dashboard normal
      if (isUserOnly) {
        navigate('/user/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(translateErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        id="email"
        type="email"
        label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />

      <Input
        id="senha"
        type="password"
        label="Senha"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        required
        autoComplete="current-password"
      />

      {/* Opção de recuperação de senha removida */}

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      <Button
        type="submit"
        variant="primary"
        fullWidth
        disabled={isLoading}
      >
        {isLoading ? 'Entrando...' : 'Entrar'}
      </Button>

      {/* Opção de criar conta removida */}
    </form>
  );
};

export default FormEntrar;