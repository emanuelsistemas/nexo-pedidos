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

      // Open dashboard in a new window with kiosk mode
      const features = [
        'fullscreen=yes',
        'kiosk=yes',
        'width=' + window.screen.width,
        'height=' + window.screen.height,
        'top=0',
        'left=0'
      ].join(',');

      const dashboardWindow = window.open('/dashboard', '_blank', features);
      
      if (dashboardWindow) {
        // Focus the new window
        dashboardWindow.focus();
        // Close the current window after successful login
        window.close();
      } else {
        // Fallback if popup is blocked
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
      
      <div className="text-right mb-6">
        <a href="#" className="text-sm text-primary-400 hover:text-primary-300 transition-colors">
          Esqueceu a senha?
        </a>
      </div>
      
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
      
      <div className="mt-6 text-center">
        <p className="text-gray-400">
          Não tem uma conta?{' '}
          <Link 
            to="/cadastrar" 
            className="text-primary-400 hover:text-primary-300 inline-flex items-center gap-1 transition-colors"
          >
            Criar conta
            <ArrowRight size={16} />
          </Link>
        </p>
      </div>
    </form>
  );
};

export default FormEntrar;