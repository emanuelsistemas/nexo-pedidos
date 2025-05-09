import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Input from '../comum/Input';
import Button from '../comum/Button';
import { supabase } from '../../lib/supabase';
import VerificacaoHumano from '../comum/VerificacaoHumano';

const FormEntrar: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mostrarVerificacao, setMostrarVerificacao] = useState(false);
  const [humanoVerificado, setHumanoVerificado] = useState(false);
  
  // Mostra a verificação após um curto delay quando a página carrega
  useEffect(() => {
    const timer = setTimeout(() => {
      setMostrarVerificacao(true);
    }, 800);
    
    return () => clearTimeout(timer);
  }, []);

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

      if (humanoVerificado) {
        // Em vez de tentar fechar a janela, vamos substituir o conteúdo da janela atual
        // com um iframe que carrega o dashboard em tela cheia
        
        // Limpa todo o conteúdo do body
        document.body.innerHTML = '';
        document.body.style.margin = '0';
        document.body.style.padding = '0';
        document.body.style.overflow = 'hidden';
        
        // Cria um iframe que ocupa toda a tela
        const iframe = document.createElement('iframe');
        iframe.src = '/dashboard';
        iframe.style.position = 'fixed';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.margin = '0';
        iframe.style.padding = '0';
        iframe.style.overflow = 'hidden';
        
        // Configura modo de tela cheia
        iframe.setAttribute('allowfullscreen', 'true');
        iframe.onload = () => {
          // Tenta ativar modo de tela cheia
          try {
            const requestFullscreen = iframe.requestFullscreen || 
                                      (iframe as any).mozRequestFullScreen || 
                                      (iframe as any).webkitRequestFullscreen || 
                                      (iframe as any).msRequestFullscreen;
            if (requestFullscreen) {
              requestFullscreen.call(iframe);
            }
          } catch (e) {
            console.error('Erro ao tentar ativar modo tela cheia:', e);
          }
        };
        
        // Adiciona o iframe ao body
        document.body.appendChild(iframe);
      } else {
        // Se o usuário não verificou que é humano, usamos o método normal
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  // Função chamada quando o usuário completa a verificação
  const handleVerificacaoConcluida = () => {
    setHumanoVerificado(true);
    setMostrarVerificacao(false);
  };

  return (
    <>
      {mostrarVerificacao && (
        <VerificacaoHumano onVerify={handleVerificacaoConcluida} />
      )}
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
    </>
  );
};

export default FormEntrar;