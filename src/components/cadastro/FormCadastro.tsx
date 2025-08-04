import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Input from '../comum/Input';
import Button from '../comum/Button';
import { supabase } from '../../lib/supabase';
import { translateErrorMessage } from '../../utils/toast';

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

    let empresaId: string | null = null;
    let userId: string | null = null;

    try {
      setIsLoading(true);
      setError('');

      // 1. Create auth user first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: senha,
      });

      if (authError) throw authError;
      userId = authData.user?.id || null;

      // 2. Create empresa after auth user is created
      const { data: empresaData, error: empresaError } = await supabase
        .from('empresas')
        .insert([{ nome: nome }])
        .select()
        .single();

      if (empresaError) throw empresaError;
      empresaId = empresaData.id;

      // 3. Get admin tipo_user_config_id
      const { data: adminTipoData, error: adminTipoError } = await supabase
        .from('tipo_user_config')
        .select('id')
        .eq('tipo', 'admin')
        .single();

      if (adminTipoError) {
        console.error('Erro ao buscar tipo admin:', adminTipoError);
        throw new Error('Erro ao buscar tipo de usuário admin');
      }

      // 4. Create usuario record with admin type and active status
      const { error: usuarioError } = await supabase
        .from('usuarios')
        .insert([
          {
            id: authData.user?.id,
            nome,
            email,
            empresa_id: empresaData.id,
            tipo_user_config_id: adminTipoData?.id ? [adminTipoData.id] : [], // Associar ao tipo admin como array
            status: true, // Define o status como ativo por padrão
          },
        ]);

      if (usuarioError) throw usuarioError;

      // 5. Create initial configurations
      const { error: configError } = await supabase
        .from('configuracoes')
        .insert([{
          empresa_id: empresaData.id,
          taxa_modo: 'distancia'
        }]);

      if (configError) throw configError;

      // 6. Create initial PDV configuration with store status
      const { error: pdvConfigError } = await supabase
        .from('pdv_config')
        .insert([{
          empresa_id: empresaData.id,
          cardapio_loja_aberta: false,
          cardapio_abertura_tipo: 'manual',
          controla_caixa: false,
          comandas: false,
          mesas: false,
          vendedor: false
        }]);

      if (pdvConfigError) throw pdvConfigError;

      // 7. Create initial stock control configuration
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

      // 8. Create default config tables records
      try {
        // Criar configuração de produtos padrão
        const { error: produtosConfigError } = await supabase
          .from('produtos_config')
          .insert([{
            empresa_id: empresaData.id,
            opcoes_adicionais: false
          }]);

        if (produtosConfigError) {
          console.error('Erro ao criar configuração de produtos:', produtosConfigError);
        }

        // Criar configuração de taxa de entrega padrão
        const { error: taxaEntregaConfigError } = await supabase
          .from('taxa_entrega_config')
          .insert([{
            empresa_id: empresaData.id,
            habilitado: false,
            tipo: 'distancia'
          }]);

        if (taxaEntregaConfigError) {
          console.error('Erro ao criar configuração de taxa de entrega:', taxaEntregaConfigError);
        }

        // Criar configuração de conexão padrão
        const { error: conexaoConfigError } = await supabase
          .from('conexao_config')
          .insert([{
            empresa_id: empresaData.id,
            habilita_conexao_whatsapp: false
          }]);

        if (conexaoConfigError) {
          console.error('Erro ao criar configuração de conexão:', conexaoConfigError);
        }

        // Criar configuração PDV padrão
        const { error: pdvConfigError } = await supabase
          .from('pdv_config')
          .insert([{
            empresa_id: empresaData.id,
            comandas: false,
            mesas: false,
            vendedor: false,
            exibe_foto_item: false,
            seleciona_clientes: false,
            controla_caixa: false,
            agrupa_itens: false,
            delivery: false,
            cardapio_digital: false,
            delivery_chat_ia: false,
            baixa_estoque_pdv: false,
            venda_codigo_barras: false,
            forca_venda_fiscal_cartao: false,
            observacao_no_item: false,
            desconto_no_item: false,
            editar_nome_produto: false,
            fiado: false,
            solicitar_nome_cliente: false,
            venda_sem_produto: false,
            venda_sem_produto_ncm: '22021000',
            venda_sem_produto_cfop: '5405',
            venda_sem_produto_origem: 0,
            venda_sem_produto_situacao_tributaria: 'st',
            venda_sem_produto_cest: '0300600',
            venda_sem_produto_margem_st: 30,
            venda_sem_produto_aliquota_icms: 18.0,
            venda_sem_produto_aliquota_pis: 1.65,
            venda_sem_produto_aliquota_cofins: 7.6,
            venda_sem_produto_peso_liquido: 0,
            venda_sem_produto_nome_padrao: 'Diversos',
            venda_sem_produto_cst: '60',
            venda_sem_produto_csosn: '500',
            desconto_no_total: false,
            vendas_itens_multiplicacao: false,
            exibir_dados_fiscais_venda: false,
            ocultar_finalizar_com_impressao: false,
            ocultar_finalizar_sem_impressao: false,
            ocultar_nfce_com_impressao: false,
            ocultar_nfce_sem_impressao: false,
            ocultar_nfce_producao: false,
            ocultar_producao: false,
            rodape_personalizado: 'Obrigado pela preferencia volte sempre!',
            mostrar_razao_social_cupom_finalizar: false,
            mostrar_endereco_cupom_finalizar: false,
            mostrar_operador_cupom_finalizar: false,
            tipo_impressao_80mm: true,  // ✅ NOVO: 80mm como padrão
            tipo_impressao_50mm: false  // ✅ NOVO: 50mm desabilitado
          }]);

        if (pdvConfigError) {
          console.error('Erro ao criar configuração PDV:', pdvConfigError);
        }

      } catch (configTablesError) {
        console.error('Erro ao criar tabelas de configuração padrão:', configTablesError);
        // Não bloquear o cadastro se falhar ao criar essas configurações
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

      // Se houve erro e uma empresa foi criada, fazer limpeza
      if (empresaId) {
        console.log('Erro durante cadastro, iniciando limpeza da empresa:', empresaId);
        try {
          // Tentar deletar a empresa completa usando a função do banco
          const { error: deleteError } = await supabase.rpc('deletar_empresa_completa', {
            empresa_uuid: empresaId
          });

          if (deleteError) {
            console.error('Erro ao limpar empresa após falha no cadastro:', deleteError);
          } else {
            console.log('Empresa limpa com sucesso após falha no cadastro');
          }
        } catch (cleanupError) {
          console.error('Erro durante limpeza:', cleanupError);
        }
      }

      // Se houve erro e um usuário foi criado no auth, tentar deletar
      if (userId && !empresaId) {
        console.log('Erro durante cadastro, tentando deletar usuário do auth:', userId);
        try {
          // Fazer logout para limpar a sessão
          await supabase.auth.signOut();
        } catch (authCleanupError) {
          console.error('Erro ao limpar auth após falha no cadastro:', authCleanupError);
        }
      }

      setError(translateErrorMessage(err));
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