import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Input from '../comum/Input';
import Button from '../comum/Button';
import { supabase } from '../../lib/supabase';

const FormCadastro: React.FC = () => {
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [senhaError, setSenhaError] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const validateForm = () => {
      if (!nome || !email || !senha || !confirmarSenha) {
        setIsFormValid(false);
        return;
      }

      if (senha !== confirmarSenha) {
        setSenhaError('As senhas não conferem');
        setIsFormValid(false);
        return;
      }

      if (senha.length < 6) {
        setSenhaError('A senha deve ter pelo menos 6 caracteres');
        setIsFormValid(false);
        return;
      }

      setSenhaError('');
      setIsFormValid(true);
    };

    validateForm();
  }, [nome, email, senha, confirmarSenha]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isLoading) return;

    try {
      setIsLoading(true);
      setError('');

      // 1. Create auth user first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: senha,
      });

      if (authError) throw authError;

      // 2. Create empresa after auth user is created
      const { data: empresaData, error: empresaError } = await supabase
        .from('empresas')
        .insert([{ nome: nome }])
        .select()
        .single();

      if (empresaError) throw empresaError;

      // 3. Create usuario record with admin type and active status
      const { error: usuarioError } = await supabase
        .from('usuarios')
        .insert([
          {
            id: authData.user?.id,
            nome,
            email,
            empresa_id: empresaData.id,
            tipo: 'admin', // Define o usuário como administrador
            status: true, // Define o status como ativo por padrão
          },
        ]);

      if (usuarioError) throw usuarioError;

      // 4. Create initial configurations
      const { error: configError } = await supabase
        .from('configuracoes')
        .insert([{
          empresa_id: empresaData.id,
          taxa_modo: 'distancia'
        }]);

      if (configError) throw configError;

      // 5. Create initial store status
      const { error: statusError } = await supabase
        .from('status_loja')
        .insert([{
          empresa_id: empresaData.id,
          aberto: false,
          aberto_manual: true,
          modo_operacao: 'manual'
        }]);

      if (statusError) throw statusError;

      // 6. Create initial stock control configuration
      try {
        const { error: estoqueConfigError } = await supabase
          .from('tipo_controle_estoque_config')
          .insert([{
            empresa_id: empresaData.id,
            tipo_controle: 'pedidos',
            bloqueia_sem_estoque: false
          }]);

        if (estoqueConfigError) {
          console.error('Erro ao criar configuração de estoque:', estoqueConfigError);
        }
      } catch (estoqueError) {
        console.error('Exceção ao criar configuração de estoque:', estoqueError);
        // Não interrompe o fluxo de cadastro se houver erro na configuração de estoque
      }

      // Sign out the user since we want them to confirm their email first
      await supabase.auth.signOut();

      // Redirect to login page
      navigate('/entrar', {
        replace: true,
        state: { message: 'Conta criada com sucesso! Por favor, faça login.' }
      });
    } catch (err: any) {
      console.error('Erro no cadastro:', err);
      setError(err.message || 'Erro ao criar conta. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        id="nome"
        type="text"
        label="Nome completo"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        required
        autoComplete="name"
      />

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
        autoComplete="new-password"
      />

      <Input
        id="confirmarSenha"
        type="password"
        label="Confirmar senha"
        value={confirmarSenha}
        onChange={(e) => setConfirmarSenha(e.target.value)}
        required
        autoComplete="new-password"
      />

      {senhaError && (
        <p className="text-red-500 text-sm mt-2">{senhaError}</p>
      )}

      {error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      )}

      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={!isFormValid || isLoading}
        >
          {isLoading ? 'Criando conta...' : 'Criar conta'}
        </Button>
      </div>

      <div className="mt-6 text-center">
        <p className="text-gray-400">
          Já possui uma conta?{' '}
          <Link
            to="/entrar"
            className="text-primary-400 hover:text-primary-300 inline-flex items-center gap-1 transition-colors"
          >
            <ArrowLeft size={16} />
            Entrar
          </Link>
        </p>
      </div>
    </form>
  );
};

export default FormCadastro;