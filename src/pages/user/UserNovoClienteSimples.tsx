import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, Building, Save, AlertCircle, X, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showMessage } from '../../utils/toast';



interface Telefone {
  numero: string;
  tipo: 'Fixo' | 'Celular';
  whatsapp: boolean;
}

const UserNovoClienteSimples: React.FC = () => {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [nome, setNome] = useState('');
  const [telefones, setTelefones] = useState<Telefone[]>([]);
  const [novoTelefone, setNovoTelefone] = useState({
    numero: '',
    tipo: 'Celular' as 'Fixo' | 'Celular',
    whatsapp: false
  });
  const [emails, setEmails] = useState<string[]>([]);
  const [novoEmail, setNovoEmail] = useState('');

  // Observações
  const [observacaoNfe, setObservacaoNfe] = useState('');
  const [observacaoInterna, setObservacaoInterna] = useState('');




  const formatarTelefone = (telefone: string, tipo?: 'Fixo' | 'Celular') => {
    if (!telefone) return '';

    // Remove todos os caracteres não numéricos
    const numeroLimpo = telefone.replace(/\D/g, '');

    // Se o tipo for especificado, usa o formato correspondente
    if (tipo === 'Fixo') {
      // Formato (XX) XXXX-XXXX para telefones fixos
      return numeroLimpo.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, ddd, parte1, parte2) => {
        let resultado = '';
        if (ddd) resultado += `(${ddd}`;
        if (ddd && (parte1 || parte2)) resultado += ') ';
        if (parte1) resultado += parte1;
        if (parte1 && parte2) resultado += '-';
        if (parte2) resultado += parte2;
        return resultado;
      });
    } else if (tipo === 'Celular') {
      // Formato (XX) X XXXX-XXXX para celulares
      return numeroLimpo.replace(/^(\d{0,2})(\d{0,1})(\d{0,4})(\d{0,4}).*/, (_, ddd, digito9, parte1, parte2) => {
        let resultado = '';
        if (ddd) resultado += `(${ddd}`;
        if (ddd && (digito9 || parte1 || parte2)) resultado += ') ';
        if (digito9) resultado += `${digito9} `;
        if (parte1) resultado += parte1;
        if (parte1 && parte2) resultado += '-';
        if (parte2) resultado += parte2;
        return resultado;
      });
    } else {
      // Se o tipo não for especificado, determina pelo tamanho
      if (numeroLimpo.length <= 10) {
        // Formato (XX) XXXX-XXXX para telefones fixos
        return numeroLimpo.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
      } else {
        // Formato (XX) X XXXX-XXXX para celulares
        return numeroLimpo.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, '($1) $2 $3-$4');
      }
    }
  };

  const handleNovoTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setNovoTelefone({
      ...novoTelefone,
      numero: formatarTelefone(valor, novoTelefone.tipo)
    });
  };

  const handleTipoTelefoneChange = (tipo: 'Fixo' | 'Celular') => {
    setNovoTelefone({
      ...novoTelefone,
      tipo,
      numero: novoTelefone.numero ? formatarTelefone(novoTelefone.numero.replace(/\D/g, ''), tipo) : ''
    });
  };

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNovoTelefone({
      ...novoTelefone,
      whatsapp: e.target.checked
    });
  };

  const adicionarTelefone = () => {
    if (!novoTelefone.numero) {
      showMessage('error', 'Digite um número de telefone');
      return;
    }

    // Validar o número de telefone
    const numeroLimpo = novoTelefone.numero.replace(/\D/g, '');
    if ((novoTelefone.tipo === 'Fixo' && numeroLimpo.length !== 10) ||
        (novoTelefone.tipo === 'Celular' && numeroLimpo.length !== 11)) {
      showMessage('error', `Número de ${novoTelefone.tipo.toLowerCase()} inválido`);
      return;
    }

    // Adicionar à lista de telefones
    setTelefones([...telefones, { ...novoTelefone }]);

    // Limpar o campo para adicionar outro telefone
    setNovoTelefone({
      numero: '',
      tipo: 'Celular',
      whatsapp: false
    });
  };

  const removerTelefone = (index: number) => {
    const novosTelefones = [...telefones];
    novosTelefones.splice(index, 1);
    setTelefones(novosTelefones);
  };

  const validarEmail = (email: string) => {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    return emailRegex.test(email);
  };

  const adicionarEmail = () => {
    if (!novoEmail.trim()) {
      showMessage('error', 'Digite um email');
      return;
    }

    if (!validarEmail(novoEmail)) {
      showMessage('error', 'Email inválido');
      return;
    }

    // Verificar se o email já existe na lista
    if (emails.includes(novoEmail.toLowerCase())) {
      showMessage('error', 'Este email já foi adicionado');
      return;
    }

    // Adicionar à lista de emails
    setEmails([...emails, novoEmail.toLowerCase()]);

    // Limpar o campo para adicionar outro email
    setNovoEmail('');
  };

  const removerEmail = (index: number) => {
    const novosEmails = [...emails];
    novosEmails.splice(index, 1);
    setEmails(novosEmails);
  };

  const validateEmails = () => {
    if (emails.length === 0) return true; // Emails são opcionais
    return emails.every(email => validarEmail(email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!nome.trim()) {
      showMessage('error', 'O nome do cliente é obrigatório');
      return;
    }

    if (telefones.length === 0) {
      showMessage('error', 'Adicione pelo menos um telefone');
      return;
    }

    if (!validateEmails()) {
      showMessage('error', 'Um ou mais emails são inválidos');
      return;
    }

    try {
      setIsSaving(true);

      // Obter o usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      // Obter a empresa do usuário
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) throw new Error('Empresa não encontrada');

      // Preparar os telefones para salvar (remover formatação)
      const telefonesParaSalvar = telefones.map(tel => ({
        ...tel,
        numero: tel.numero.replace(/\D/g, '')
      }));

      // Manter compatibilidade com o campo telefone antigo
      // Usar o primeiro telefone da lista como telefone principal
      const telefonePrincipal = telefonesParaSalvar.length > 0 ? telefonesParaSalvar[0].numero : '';

      // Criar cliente
      const { data: cliente, error: clienteError } = await supabase
        .from('clientes')
        .insert({
          nome,
          telefone: telefonePrincipal,
          telefones: telefonesParaSalvar,
          emails: emails.length > 0 ? emails : [],
          // Observações
          observacao_nfe: observacaoNfe || null,
          observacao_interna: observacaoInterna || null,
          empresa_id: usuarioData.empresa_id,
          usuario_id: userData.user.id
        })
        .select()
        .single();

      if (clienteError) throw clienteError;

      showMessage('success', 'Cliente cadastrado com sucesso!');
      navigate('/user/clientes');
    } catch (error: any) {
      console.error('Erro ao cadastrar cliente:', error);
      showMessage('error', error.message || 'Erro ao cadastrar cliente');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/user/clientes')}
          className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-semibold text-white">Novo Cliente</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        <div className="bg-background-card rounded-lg border border-gray-800 p-4 space-y-4">
          <h2 className="text-lg font-medium text-white mb-2">Dados do Cliente</h2>

          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Nome <span className="text-red-500">*</span>
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
                placeholder="Nome completo"
                required
              />
            </div>
          </div>

          {/* Telefones */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Telefones <span className="text-red-500">*</span>
            </label>

            {/* Lista de telefones adicionados */}
            {telefones.length > 0 && (
              <div className="mb-3 space-y-2">
                {telefones.map((tel, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-800/70 rounded-lg p-2 border border-gray-700"
                  >
                    <div className="flex items-center gap-2">
                      <Phone size={18} className={tel.whatsapp ? "text-green-500" : "text-gray-500"} />
                      <div>
                        <p className="text-white">{tel.numero}</p>
                        <p className="text-xs text-gray-400">
                          {tel.tipo}{tel.whatsapp ? " - WhatsApp" : ""}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removerTelefone(index)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Formulário para adicionar novo telefone */}
            <div className="space-y-3 bg-gray-800/30 p-3 rounded-lg border border-gray-700">
              <h4 className="text-sm font-medium text-gray-300">Adicionar telefone</h4>

              {/* Tipo de telefone */}
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={novoTelefone.tipo === 'Celular'}
                    onChange={() => handleTipoTelefoneChange('Celular')}
                    className="mr-2 text-primary-500 focus:ring-primary-500/20"
                  />
                  <span className="text-white">Celular</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={novoTelefone.tipo === 'Fixo'}
                    onChange={() => handleTipoTelefoneChange('Fixo')}
                    className="mr-2 text-primary-500 focus:ring-primary-500/20"
                  />
                  <span className="text-white">Fixo</span>
                </label>
              </div>

              {/* WhatsApp (apenas para celular) */}
              {novoTelefone.tipo === 'Celular' && (
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={novoTelefone.whatsapp}
                    onChange={handleWhatsappChange}
                    className="mr-2 text-primary-500 focus:ring-primary-500/20"
                  />
                  <span className="text-white">Este número tem WhatsApp</span>
                </label>
              )}

              {/* Campo de telefone */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone size={18} className="text-gray-500" />
                  </div>
                  <input
                    type="text"
                    value={novoTelefone.numero}
                    onChange={handleNovoTelefoneChange}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                    placeholder={novoTelefone.tipo === 'Celular' ? "(00) 0 0000-0000" : "(00) 0000-0000"}
                  />
                </div>
                <button
                  type="button"
                  onClick={adicionarTelefone}
                  className="bg-primary-500 hover:bg-primary-600 text-white px-3 py-2 rounded-lg transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Emails */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Emails <span className="text-gray-500 text-xs">(opcional)</span>
            </label>

            {/* Lista de emails adicionados */}
            {emails.length > 0 && (
              <div className="mb-3 space-y-2">
                {emails.map((email, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-800/70 rounded-lg p-2 border border-gray-700"
                  >
                    <div className="flex items-center gap-2">
                      <Mail size={18} className="text-gray-500" />
                      <div>
                        <p className="text-white">{email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removerEmail(index)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Formulário para adicionar novo email */}
            <div className="space-y-3 bg-gray-800/30 p-3 rounded-lg border border-gray-700">
              <h4 className="text-sm font-medium text-gray-300">Adicionar email</h4>

              {/* Campo de email */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={18} className="text-gray-500" />
                  </div>
                  <input
                    type="email"
                    value={novoEmail}
                    onChange={(e) => setNovoEmail(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                    placeholder="email@exemplo.com"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        adicionarEmail();
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={adicionarEmail}
                  className="bg-primary-500 hover:bg-primary-600 text-white px-3 py-2 rounded-lg transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>


        </div>

        {/* Observações */}
        <div className="bg-background-card rounded-lg border border-gray-800 p-4 space-y-4">
          <h2 className="text-lg font-medium text-white mb-2">Observações</h2>

          {/* Observação NFe */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Observação NFe
            </label>
            <textarea
              value={observacaoNfe}
              onChange={(e) => setObservacaoNfe(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 resize-none"
              placeholder="Observações que aparecerão na NFe..."
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              Esta observação será incluída na NFe quando emitida para este cliente.
            </p>
          </div>

          {/* Observação Interna */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Observação Interna
            </label>
            <textarea
              value={observacaoInterna}
              onChange={(e) => setObservacaoInterna(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 resize-none"
              placeholder="Observações internas sobre o cliente..."
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              Esta observação é apenas para uso interno e não aparecerá em documentos.
            </p>
          </div>
        </div>

        {/* Botão salvar */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white py-3 px-4 rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Salvando...</span>
            </>
          ) : (
            <>
              <Save size={18} />
              <span>Cadastrar Cliente</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default UserNovoClienteSimples;
