import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, MapPin, Building, Save, AlertCircle, Search, FileText, X, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showMessage } from '../../utils/toast';



interface Telefone {
  numero: string;
  tipo: 'Fixo' | 'Celular';
  whatsapp: boolean;
}

const UserNovoClienteCompleto: React.FC = () => {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCnpjLoading, setIsCnpjLoading] = useState(false);
  const [tipoDocumento, setTipoDocumento] = useState<'CNPJ' | 'CPF'>('CNPJ');
  const [documento, setDocumento] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [nome, setNome] = useState('');
  const [telefones, setTelefones] = useState<Telefone[]>([]);
  const [novoTelefone, setNovoTelefone] = useState({
    numero: '',
    tipo: 'Celular' as 'Fixo' | 'Celular',
    whatsapp: false
  });
  const [email, setEmail] = useState('');
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');

  // Tipos de cliente
  const [isCliente, setIsCliente] = useState(true);
  const [isFuncionario, setIsFuncionario] = useState(false);
  const [isVendedor, setIsVendedor] = useState(false);
  const [isFornecedor, setIsFornecedor] = useState(false);
  const [isTransportadora, setIsTransportadora] = useState(false);






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
    // Se mudar o tipo, reformata o número de acordo com o novo tipo
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

  const formatarCNPJ = (cnpj: string) => {
    if (!cnpj) return '';

    // Remove todos os caracteres não numéricos
    const numeroLimpo = cnpj.replace(/\D/g, '');

    // Aplica a máscara de CNPJ (XX.XXX.XXX/XXXX-XX)
    return numeroLimpo
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18);
  };

  const formatarCPF = (cpf: string) => {
    if (!cpf) return '';

    // Remove todos os caracteres não numéricos
    const numeroLimpo = cpf.replace(/\D/g, '');

    // Aplica a máscara de CPF (XXX.XXX.XXX-XX)
    return numeroLimpo
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .substring(0, 14);
  };

  const handleDocumentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    const formatado = tipoDocumento === 'CNPJ'
      ? formatarCNPJ(valor)
      : formatarCPF(valor);

    setDocumento(formatado);
  };

  const validarCNPJ = (cnpj: string) => {
    cnpj = cnpj.replace(/[^\d]+/g, '');

    if (cnpj === '') return false;
    if (cnpj.length !== 14) return false;

    // Elimina CNPJs inválidos conhecidos
    if (
      cnpj === '00000000000000' ||
      cnpj === '11111111111111' ||
      cnpj === '22222222222222' ||
      cnpj === '33333333333333' ||
      cnpj === '44444444444444' ||
      cnpj === '55555555555555' ||
      cnpj === '66666666666666' ||
      cnpj === '77777777777777' ||
      cnpj === '88888888888888' ||
      cnpj === '99999999999999'
    ) {
      return false;
    }

    // Valida DVs
    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    const digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(0))) return false;

    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(1))) return false;

    return true;
  };

  const validarCPF = (cpf: string) => {
    cpf = cpf.replace(/[^\d]+/g, '');

    if (cpf === '') return false;
    if (cpf.length !== 11) return false;

    // Elimina CPFs inválidos conhecidos
    if (
      cpf === '00000000000' ||
      cpf === '11111111111' ||
      cpf === '22222222222' ||
      cpf === '33333333333' ||
      cpf === '44444444444' ||
      cpf === '55555555555' ||
      cpf === '66666666666' ||
      cpf === '77777777777' ||
      cpf === '88888888888' ||
      cpf === '99999999999'
    ) {
      return false;
    }

    // Valida 1o dígito
    let add = 0;
    for (let i = 0; i < 9; i++) {
      add += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(9))) return false;

    // Valida 2o dígito
    add = 0;
    for (let i = 0; i < 10; i++) {
      add += parseInt(cpf.charAt(i)) * (11 - i);
    }
    rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(10))) return false;

    return true;
  };

  const buscarCNPJ = async () => {
    try {
      // Remove caracteres não numéricos para a busca
      const cnpjLimpo = documento.replace(/\D/g, '');

      if (cnpjLimpo.length !== 14) {
        showMessage('error', 'CNPJ inválido. O CNPJ deve conter 14 dígitos.');
        return;
      }

      if (!validarCNPJ(cnpjLimpo)) {
        showMessage('error', 'CNPJ inválido. Verifique os dígitos informados.');
        return;
      }

      // Ativar o indicador de loading
      setIsCnpjLoading(true);

      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      const data = await response.json();

      if (response.ok) {
        setRazaoSocial(data.razao_social || '');
        setNomeFantasia(data.nome_fantasia || '');
        setNome(data.nome_fantasia || data.razao_social || '');
        setCep(data.cep ? data.cep.replace(/(\d{5})(\d{3})/, '$1-$2') : '');
        setEndereco(data.logradouro || '');
        setNumero(data.numero || '');
        setComplemento(data.complemento || '');
        setBairro(data.bairro || '');
        setCidade(data.municipio || '');
        setEstado(data.uf || '');

        showMessage('success', 'Dados do CNPJ carregados com sucesso!');
      } else {
        showMessage('error', data.message || 'CNPJ não encontrado');
      }
    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error);
      showMessage('error', 'Erro ao buscar CNPJ. Tente novamente.');
    } finally {
      // Desativar o indicador de loading
      setIsCnpjLoading(false);
    }
  };

  const formatarCep = (cep: string) => {
    // Remove todos os caracteres não numéricos
    const numeroLimpo = cep.replace(/\D/g, '');

    // Aplica a máscara de CEP (XXXXX-XXX)
    return numeroLimpo.replace(/^(\d{5})(\d{3})$/, '$1-$2');
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setCep(formatarCep(valor));
  };

  const buscarCep = async () => {
    try {
      // Remove caracteres não numéricos para a busca
      const cepLimpo = cep.replace(/\D/g, '');

      if (cepLimpo.length !== 8) {
        showMessage('error', 'CEP inválido. O CEP deve conter 8 dígitos.');
        return;
      }

      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (data.erro) {
        showMessage('error', 'CEP não encontrado.');
        return;
      }

      setEndereco(data.logradouro || '');
      setBairro(data.bairro || '');
      setCidade(data.localidade || '');
      setEstado(data.uf || '');

      showMessage('success', 'Endereço encontrado com sucesso!');
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      showMessage('error', 'Erro ao buscar CEP. Tente novamente.');
    }
  };

  const validateEmail = (email: string) => {
    if (!email) return true; // Email é opcional
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
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

    if (email && !validateEmail(email)) {
      showMessage('error', 'O email informado é inválido');
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
          tipo_documento: tipoDocumento,
          documento: documento ? documento.replace(/\D/g, '') : null,
          razao_social: razaoSocial || null,
          nome_fantasia: nomeFantasia || null,
          nome,
          telefone: telefonePrincipal,
          telefones: telefonesParaSalvar,
          email: email || null,
          cep: cep ? cep.replace(/\D/g, '') : null,
          endereco: endereco || null,
          numero: numero || null,
          complemento: complemento || null,
          bairro: bairro || null,
          cidade: cidade || null,
          estado: estado || null,
          // Tipos de cliente
          is_cliente: isCliente,
          is_funcionario: isFuncionario,
          is_vendedor: isVendedor,
          is_fornecedor: isFornecedor,
          is_transportadora: isTransportadora,
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

        {/* Documento */}
        <div className="bg-background-card rounded-lg border border-gray-800 p-4 space-y-4">
          <h2 className="text-lg font-medium text-white mb-2">Documento</h2>

          {/* Tipo de documento */}
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                checked={tipoDocumento === 'CNPJ'}
                onChange={() => setTipoDocumento('CNPJ')}
                className="mr-2 text-primary-500 focus:ring-primary-500/20"
              />
              <span className="text-white">CNPJ</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={tipoDocumento === 'CPF'}
                onChange={() => setTipoDocumento('CPF')}
                className="mr-2 text-primary-500 focus:ring-primary-500/20"
              />
              <span className="text-white">CPF</span>
            </label>
          </div>

          {/* Número do documento */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              {tipoDocumento} <span className="text-gray-500 text-xs">(opcional)</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FileText size={18} className="text-gray-500" />
                </div>
                <input
                  type="text"
                  value={documento}
                  onChange={handleDocumentoChange}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                  placeholder={tipoDocumento === 'CNPJ' ? "00.000.000/0000-00" : "000.000.000-00"}
                />
              </div>
              {tipoDocumento === 'CNPJ' && (
                <button
                  type="button"
                  onClick={buscarCNPJ}
                  disabled={isCnpjLoading}
                  className="bg-primary-500 hover:bg-primary-600 text-white px-3 py-2 rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isCnpjLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Search size={18} />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Razão Social (apenas para CNPJ) */}
          {tipoDocumento === 'CNPJ' && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Razão Social <span className="text-gray-500 text-xs">(opcional)</span>
              </label>
              <input
                type="text"
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                placeholder="Razão Social"
              />
            </div>
          )}

          {/* Nome Fantasia (apenas para CNPJ) */}
          {tipoDocumento === 'CNPJ' && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Nome Fantasia <span className="text-gray-500 text-xs">(opcional)</span>
              </label>
              <input
                type="text"
                value={nomeFantasia}
                onChange={(e) => setNomeFantasia(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                placeholder="Nome Fantasia"
              />
            </div>
          )}
        </div>

        {/* Dados do Cliente */}
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

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Email <span className="text-gray-500 text-xs">(opcional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={18} className="text-gray-500" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                placeholder="email@exemplo.com"
              />
            </div>
          </div>


        </div>

        {/* Endereço */}
        <div className="bg-background-card rounded-lg border border-gray-800 p-4 space-y-4">
          <h2 className="text-lg font-medium text-white mb-2">Endereço</h2>

          {/* CEP */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              CEP <span className="text-gray-500 text-xs">(opcional)</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin size={18} className="text-gray-500" />
                </div>
                <input
                  type="text"
                  value={cep}
                  onChange={handleCepChange}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-10 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                  placeholder="00000-000"
                />
              </div>
              <button
                type="button"
                onClick={buscarCep}
                className="bg-primary-500 hover:bg-primary-600 text-white px-3 py-2 rounded-lg transition-colors"
              >
                <Search size={18} />
              </button>
            </div>
          </div>

          {/* Endereço */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Endereço <span className="text-gray-500 text-xs">(opcional)</span>
            </label>
            <input
              type="text"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
              placeholder="Rua, Avenida, etc."
            />
          </div>

          {/* Número e Complemento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Número <span className="text-gray-500 text-xs">(opcional)</span>
              </label>
              <input
                type="text"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                placeholder="Número"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Complemento <span className="text-gray-500 text-xs">(opcional)</span>
              </label>
              <input
                type="text"
                value={complemento}
                onChange={(e) => setComplemento(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                placeholder="Apto, Sala, etc."
              />
            </div>
          </div>

          {/* Bairro */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Bairro <span className="text-gray-500 text-xs">(opcional)</span>
            </label>
            <input
              type="text"
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
              placeholder="Bairro"
            />
          </div>

          {/* Cidade e Estado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Cidade <span className="text-gray-500 text-xs">(opcional)</span>
              </label>
              <input
                type="text"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                placeholder="Cidade"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Estado <span className="text-gray-500 text-xs">(opcional)</span>
              </label>
              <input
                type="text"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                placeholder="UF"
                maxLength={2}
              />
            </div>
          </div>
        </div>

        {/* Tipos de Cliente */}
        <div className="bg-background-card rounded-lg border border-gray-800 p-4 space-y-4">
          <h2 className="text-lg font-medium text-white mb-2">Tipos de Cliente</h2>
          <p className="text-sm text-gray-400 mb-4">
            Selecione os tipos que se aplicam a este cliente. Você pode marcar múltiplas opções.
          </p>

          <div className="space-y-3">
            {/* Cliente */}
            <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3 border border-gray-700 min-h-[60px]">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User size={16} className="text-blue-400" />
                </div>
                <span className="text-white font-medium whitespace-nowrap">Cliente</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-3">
                <input
                  type="checkbox"
                  checked={isCliente}
                  onChange={(e) => setIsCliente(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>

            {/* Funcionário */}
            <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3 border border-gray-700 min-h-[60px]">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User size={16} className="text-green-400" />
                </div>
                <span className="text-white font-medium whitespace-nowrap">Funcionário</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-3">
                <input
                  type="checkbox"
                  checked={isFuncionario}
                  onChange={(e) => setIsFuncionario(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>

            {/* Vendedor */}
            <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3 border border-gray-700 min-h-[60px]">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User size={16} className="text-purple-400" />
                </div>
                <span className="text-white font-medium whitespace-nowrap">Vendedor</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-3">
                <input
                  type="checkbox"
                  checked={isVendedor}
                  onChange={(e) => setIsVendedor(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>

            {/* Fornecedor */}
            <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3 border border-gray-700 min-h-[60px]">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User size={16} className="text-orange-400" />
                </div>
                <span className="text-white font-medium whitespace-nowrap">Fornecedor</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-3">
                <input
                  type="checkbox"
                  checked={isFornecedor}
                  onChange={(e) => setIsFornecedor(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>

            {/* Transportadora */}
            <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3 border border-gray-700 min-h-[60px]">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User size={16} className="text-red-400" />
                </div>
                <span className="text-white font-medium whitespace-nowrap">Transportadora</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-3">
                <input
                  type="checkbox"
                  checked={isTransportadora}
                  onChange={(e) => setIsTransportadora(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>
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

export default UserNovoClienteCompleto;