import { toast, ToastPosition } from 'react-toastify';

type MessageType = 'success' | 'error' | 'info' | 'warning';

/**
 * Traduz mensagens de erro comuns do Supabase e outras APIs para português
 */
export const translateErrorMessage = (error: any): string => {
  if (!error) return 'Erro desconhecido';

  const message = typeof error === 'string' ? error : error.message || error.error_description || '';

  // Erros de autenticação
  if (message.includes('Invalid login credentials')) {
    return 'Email ou senha incorretos. Verifique suas credenciais e tente novamente.';
  }

  if (message.includes('email already registered') || message.includes('User already registered')) {
    return 'Este email já está cadastrado no sistema.';
  }

  if (message.includes('Password should be at least')) {
    return 'A senha deve ter pelo menos 6 caracteres.';
  }

  if (message.includes('Invalid email')) {
    return 'O formato do email é inválido.';
  }

  if (message.includes('Email not confirmed')) {
    return 'Email não confirmado. Verifique sua caixa de entrada.';
  }

  if (message.includes('Too many requests')) {
    return 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.';
  }

  // Erros de rede
  if (message.includes('Network error') || message.includes('fetch')) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  }

  if (message.includes('timeout')) {
    return 'A operação demorou muito para responder. Tente novamente.';
  }

  // Erros de banco de dados
  if (message.includes('duplicate key value') || message.includes('already exists')) {
    return 'Este registro já existe no sistema.';
  }

  if (message.includes('foreign key constraint')) {
    return 'Não é possível realizar esta operação devido a dependências no sistema.';
  }

  if (message.includes('not found') || message.includes('No rows')) {
    return 'Registro não encontrado.';
  }

  if (message.includes('permission denied') || message.includes('insufficient_privilege')) {
    return 'Você não tem permissão para realizar esta operação.';
  }

  // Erros de validação
  if (message.includes('required') || message.includes('cannot be null')) {
    return 'Todos os campos obrigatórios devem ser preenchidos.';
  }

  if (message.includes('invalid format')) {
    return 'Formato de dados inválido.';
  }

  // Erros específicos do sistema
  if (message.includes('Sua conta está bloqueada')) {
    return 'Sua conta está bloqueada. Entre em contato com o administrador do sistema.';
  }

  // Erros de conexão específicos
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'Erro de conexão com o servidor. Verifique sua internet e tente novamente.';
  }

  if (message.includes('CORS')) {
    return 'Erro de configuração do servidor. Entre em contato com o suporte técnico.';
  }

  // Erros de validação específicos
  if (message.includes('email') && message.includes('invalid')) {
    return 'O formato do email é inválido. Verifique e tente novamente.';
  }

  if (message.includes('password') && message.includes('weak')) {
    return 'A senha é muito fraca. Use pelo menos 6 caracteres com letras e números.';
  }

  // Erros de sessão
  if (message.includes('session') || message.includes('token')) {
    return 'Sua sessão expirou. Faça login novamente.';
  }

  if (message.includes('unauthorized') || message.includes('Unauthorized')) {
    return 'Acesso não autorizado. Verifique suas credenciais.';
  }

  // Erros de servidor
  if (message.includes('500') || message.includes('Internal Server Error')) {
    return 'Erro interno do servidor. Tente novamente em alguns minutos.';
  }

  if (message.includes('503') || message.includes('Service Unavailable')) {
    return 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.';
  }

  if (message.includes('404') || message.includes('Not Found')) {
    return 'Recurso não encontrado.';
  }

  // Erros de formulário
  if (message.includes('required field') || message.includes('campo obrigatório')) {
    return 'Preencha todos os campos obrigatórios.';
  }

  if (message.includes('invalid format') || message.includes('formato inválido')) {
    return 'Formato de dados inválido. Verifique os campos preenchidos.';
  }

  // Se não encontrou tradução específica, retorna a mensagem original ou uma genérica
  if (message.length > 0) {
    return message;
  }

  return 'Ocorreu um erro inesperado. Tente novamente.';
};

export const showMessage = (type: MessageType, message: string) => {
  const translatedMessage = type === 'error' ? translateErrorMessage(message) : message;

  const options = {
    position: 'top-center' as ToastPosition,
    className: 'bg-background-card text-white',
    progressClassName: 'bg-primary-500',
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  };

  switch (type) {
    case 'success':
      toast.success(translatedMessage, options);
      break;
    case 'error':
      toast.error(translatedMessage, options);
      break;
    case 'info':
      toast.info(translatedMessage, options);
      break;
    case 'warning':
      toast.warning(translatedMessage, options);
      break;
    default:
      toast(translatedMessage, options);
  }
};