import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Input from '../comum/Input';
import Button from '../comum/Button';
import { supabase } from '../../lib/supabase';

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
        .select('tipo, status')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      // Verificar se o usuário está bloqueado
      if (userData?.status === false) {
        // Fazer logout para limpar a sessão
        await supabase.auth.signOut();
        throw new Error('Sua conta está bloqueada. Entre em contato com o administrador do sistema.');
      }

      // Se for usuário do tipo "user", redirecionar para o dashboard mobile
      // Caso contrário, redirecionar para o dashboard normal
      if (userData?.tipo === 'user') {
        navigate('/user/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
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