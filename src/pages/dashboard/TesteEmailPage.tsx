import React, { useState } from 'react';
import { Mail, Send, Settings, Bug, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const TesteEmailPage: React.FC = () => {
  const [emailDestino, setEmailDestino] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [configuracao, setConfiguracao] = useState<any>(null);

  // Verificar configurações de email
  const verificarConfiguracoes = async () => {
    setIsLoading(true);
    setResultado(null);

    try {
      const response = await fetch('/backend/public/teste-email.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          acao: 'verificar'
        })
      });

      const data = await response.json();
      setConfiguracao(data.data);
      setResultado(data);

    } catch (error) {
      setResultado({
        success: false,
        error: 'Erro ao verificar configurações: ' + error
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Enviar email de teste
  const enviarEmailTeste = async () => {
    if (!emailDestino.trim()) {
      alert('Digite um email de destino');
      return;
    }

    if (!emailDestino.includes('@')) {
      alert('Digite um email válido');
      return;
    }

    setIsLoading(true);
    setResultado(null);

    try {
      const response = await fetch('/backend/public/teste-email.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          acao: 'teste',
          email_destino: emailDestino
        })
      });

      const data = await response.json();
      setResultado(data);

    } catch (error) {
      setResultado({
        success: false,
        error: 'Erro ao enviar email: ' + error
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Enviar email com debug
  const enviarEmailDebug = async () => {
    if (!emailDestino.trim()) {
      alert('Digite um email de destino');
      return;
    }

    setIsLoading(true);
    setResultado(null);

    try {
      const response = await fetch('/backend/public/teste-email.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          acao: 'debug',
          email_destino: emailDestino
        })
      });

      const data = await response.json();
      setResultado(data);

    } catch (error) {
      setResultado({
        success: false,
        error: 'Erro ao enviar email com debug: ' + error
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-primary p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            📧 Teste de Email - Sistema NFe
          </h1>
          <p className="text-gray-400">
            Configure e teste o envio de emails para NFe
          </p>
        </div>

        {/* Card de Configurações */}
        <div className="bg-background-card rounded-lg border border-gray-800 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="text-blue-400" size={24} />
            <h2 className="text-xl font-semibold text-white">Verificar Configurações</h2>
          </div>

          <button
            onClick={verificarConfiguracoes}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {isLoading ? 'Verificando...' : 'Verificar Configurações SMTP'}
          </button>

          {configuracao && (
            <div className="mt-4 p-4 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                {configuracao.configurado ? (
                  <CheckCircle className="text-green-400" size={20} />
                ) : (
                  <XCircle className="text-red-400" size={20} />
                )}
                <span className="text-white font-medium">
                  {configuracao.configurado ? 'Configurações OK' : 'Problemas Encontrados'}
                </span>
              </div>

              {!configuracao.configurado && (
                <div className="mb-3">
                  <p className="text-red-400 font-medium mb-2">Problemas:</p>
                  <ul className="list-disc list-inside text-red-300">
                    {configuracao.problemas.map((problema: string, index: number) => (
                      <li key={index}>{problema}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="text-sm text-gray-300">
                <p><strong>Host:</strong> {configuracao.config.host}</p>
                <p><strong>Porta:</strong> {configuracao.config.port}</p>
                <p><strong>Criptografia:</strong> {configuracao.config.encryption}</p>
                <p><strong>Nome do Remetente:</strong> {configuracao.config.from_name}</p>
              </div>
            </div>
          )}
        </div>

        {/* Card de Teste */}
        <div className="bg-background-card rounded-lg border border-gray-800 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="text-green-400" size={24} />
            <h2 className="text-xl font-semibold text-white">Enviar Email de Teste</h2>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email de Destino
            </label>
            <input
              type="email"
              value={emailDestino}
              onChange={(e) => setEmailDestino(e.target.value)}
              placeholder="seu-email@gmail.com"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={enviarEmailTeste}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Send size={16} />
              {isLoading ? 'Enviando...' : 'Enviar Teste'}
            </button>

            <button
              onClick={enviarEmailDebug}
              disabled={isLoading}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Bug size={16} />
              {isLoading ? 'Enviando...' : 'Teste com Debug'}
            </button>
          </div>
        </div>

        {/* Resultado */}
        {resultado && (
          <div className="bg-background-card rounded-lg border border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              {resultado.success ? (
                <CheckCircle className="text-green-400" size={24} />
              ) : (
                <XCircle className="text-red-400" size={24} />
              )}
              <h2 className="text-xl font-semibold text-white">
                {resultado.success ? 'Sucesso!' : 'Erro'}
              </h2>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto">
                {JSON.stringify(resultado, null, 2)}
              </pre>
            </div>

            {resultado.success && resultado.acao === 'teste' && (
              <div className="mt-4 p-4 bg-green-900/20 border border-green-700 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="text-green-400" size={20} />
                  <span className="text-green-300 font-medium">Email enviado com sucesso!</span>
                </div>
                <p className="text-green-200 text-sm">
                  Verifique a caixa de entrada (e spam) do email: <strong>{emailDestino}</strong>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Instruções */}
        <div className="bg-background-card rounded-lg border border-gray-800 p-6 mt-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="text-yellow-400" size={24} />
            <h2 className="text-xl font-semibold text-white">Instruções</h2>
          </div>

          <div className="space-y-4 text-gray-300">
            <div>
              <h3 className="text-white font-medium mb-2">1. Configure o Gmail:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Ative a autenticação de 2 fatores na sua conta Gmail</li>
                <li>Gere uma "Senha de App" em: myaccount.google.com/security</li>
                <li>Use essa senha de 16 caracteres no arquivo .env</li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-medium mb-2">2. Configure o .env:</h3>
              <div className="bg-gray-800 p-3 rounded text-sm font-mono">
                MAIL_HOST=smtp.gmail.com<br />
                MAIL_PORT=587<br />
                MAIL_USERNAME=seu-email@gmail.com<br />
                MAIL_PASSWORD=sua_senha_de_app_16_caracteres<br />
                MAIL_ENCRYPTION=tls<br />
                MAIL_FROM_ADDRESS=seu-email@gmail.com<br />
                MAIL_FROM_NAME="Sistema Nexo NFe"
              </div>
            </div>

            <div>
              <h3 className="text-white font-medium mb-2">3. Instale as dependências:</h3>
              <div className="bg-gray-800 p-3 rounded text-sm font-mono">
                cd backend && chmod +x install-phpmailer.sh && ./install-phpmailer.sh
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TesteEmailPage;
