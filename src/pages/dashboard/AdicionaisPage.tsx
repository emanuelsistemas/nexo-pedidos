import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Trash2, Plus, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Button from '../../components/comum/Button';
import { showMessage } from '../../utils/toast';

interface DeleteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-background-card p-6 rounded-lg shadow-xl max-w-sm mx-4 w-full"
      >
        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
        <p className="text-gray-400 mb-6">{message}</p>
        <div className="flex gap-4">
          <Button
            type="button"
            variant="text"
            className="flex-1"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            className="flex-1 !bg-red-500 hover:!bg-red-600"
            onClick={onConfirm}
          >
            Excluir
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const AdicionaisPage: React.FC = () => {
  const [showSidebar, setShowSidebar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const [opcoes, setOpcoes] = useState<any[]>([]);
  const [editingOpcao, setEditingOpcao] = useState<any>(null);
  const [novaOpcao, setNovaOpcao] = useState({ nome: '', quantidade_minima: 0, quantidade_maxima: 0 });
  const [quantidadeMinimaInput, setQuantidadeMinimaInput] = useState('');
  const [quantidadeMaximaInput, setQuantidadeMaximaInput] = useState('');
  const [novoItem, setNovoItem] = useState({ nome: '', preco: '' });
  const [precoFormatado, setPrecoFormatado] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);

  // Estados para sistema de tabelas de preços
  const [trabalhaComTabelaPrecos, setTrabalhaComTabelaPrecos] = useState<boolean>(false);
  const [tabelasPrecos, setTabelasPrecos] = useState<any[]>([]);
  const [abaPrecoAtiva, setAbaPrecoAtiva] = useState<string>('padrao');
  const [precosTabelas, setPrecosTabelas] = useState<{[key: string]: number}>({});
  const [precosTabelasFormatados, setPrecosTabelasFormatados] = useState<{[key: string]: string}>({});

  // Estados para exibição dos preços nos cards
  const [adicionaisPrecos, setAdicionaisPrecos] = useState<{[key: string]: {[key: string]: number}}>({});
  const [dropdownAberto, setDropdownAberto] = useState<{[key: string]: boolean}>({});
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    itemId: string;
    itemType: 'opcao' | 'item';
    title: string;
    message: string;
  }>({
    isOpen: false,
    itemId: '',
    itemType: 'opcao',
    title: '',
    message: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  // Recarregar preços quando as configurações de tabela mudarem
  useEffect(() => {
    if (trabalhaComTabelaPrecos && tabelasPrecos.length > 0 && opcoes.length > 0) {
      carregarTodosPrecosAdicionais();
    }
  }, [trabalhaComTabelaPrecos, tabelasPrecos.length, opcoes.length]);

  // ✅ FUNÇÃO DE FILTRO: Filtrar opções baseado no termo de pesquisa
  const getFilteredOpcoes = () => {
    if (!searchTerm.trim()) {
      return opcoes;
    }

    const termoPesquisa = searchTerm.toLowerCase().trim();

    return opcoes.filter(opcao => {
      // Buscar no nome da opção
      const nomeOpcao = opcao.nome?.toLowerCase() || '';

      // Buscar nos nomes dos itens da opção
      const temItemComTermo = opcao.itens?.some((item: any) =>
        item.nome?.toLowerCase().includes(termoPesquisa)
      ) || false;

      return nomeOpcao.includes(termoPesquisa) || temItemComTermo;
    });
  };

  // Função para formatar valor monetário
  const formatarValorMonetario = (valor: string): string => {
    // Remove todos os caracteres não numéricos
    let valorLimpo = valor.replace(/\D/g, '');

    // Se não houver valor, retorna vazio
    if (!valorLimpo) return '';

    // Converte para número (centavos)
    const valorNumerico = parseInt(valorLimpo) / 100;

    // Formata como moeda brasileira
    return valorNumerico.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  // Função para desformatar valor monetário
  const desformatarValorMonetario = (valorFormatado: string): number => {
    // Remove todos os caracteres não numéricos, exceto vírgula e ponto
    const valorLimpo = valorFormatado.replace(/[^\d,\.]/g, '');

    // Substitui vírgula por ponto para conversão correta
    const valorComPonto = valorLimpo.replace(',', '.');

    // Converte para número
    const valorNumerico = parseFloat(valorComPonto);

    // Retorna 0 se não for um número válido
    return isNaN(valorNumerico) ? 0 : valorNumerico;
  };

  // Função para lidar com mudanças no campo de preço
  const handlePrecoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;

    // Se o campo estiver vazio, limpa tudo
    if (!valor) {
      setPrecoFormatado('');
      setNovoItem({ ...novoItem, preco: '' });
      return;
    }

    // Formata o valor
    const valorFormatado = formatarValorMonetario(valor);
    setPrecoFormatado(valorFormatado);

    // Atualiza o valor numérico no estado
    const valorNumerico = desformatarValorMonetario(valorFormatado);
    setNovoItem({ ...novoItem, preco: valorNumerico.toString() });
  };

  // Função para lidar com mudanças no campo de quantidade mínima
  const handleQuantidadeMinimaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;

    // Atualiza o input visual
    setQuantidadeMinimaInput(valor);

    // Se o campo estiver vazio, define quantidade_minima como 0
    if (valor === '') {
      setNovaOpcao({ ...novaOpcao, quantidade_minima: 0 });
      return;
    }

    // Converte para número, garantindo que seja um inteiro não negativo
    const valorNumerico = parseInt(valor);
    if (!isNaN(valorNumerico) && valorNumerico >= 0) {
      setNovaOpcao({ ...novaOpcao, quantidade_minima: valorNumerico });
    }
  };

  // Função para lidar com mudanças no campo de quantidade máxima
  const handleQuantidadeMaximaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;

    // Atualiza o input visual
    setQuantidadeMaximaInput(valor);

    // Se o campo estiver vazio, define quantidade_maxima como 0
    if (valor === '') {
      setNovaOpcao({ ...novaOpcao, quantidade_maxima: 0 });
      return;
    }

    // Converte para número, garantindo que seja um inteiro não negativo
    const valorNumerico = parseInt(valor);
    if (!isNaN(valorNumerico) && valorNumerico >= 0) {
      setNovaOpcao({ ...novaOpcao, quantidade_maxima: valorNumerico });
    }
  };

  // Função para carregar configurações de tabelas de preços
  const carregarConfiguracoesTabelaPrecos = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // Verificar se a empresa trabalha com tabelas de preços
      const { data: configData, error: configError } = await supabase
        .from('tabela_preco_config')
        .select('trabalha_com_tabela_precos')
        .eq('empresa_id', usuarioData.empresa_id)
        .single();

      if (configError && configError.code !== 'PGRST116') {
        console.error('Erro ao carregar configuração de tabelas:', configError);
        return;
      }

      if (configData?.trabalha_com_tabela_precos) {
        setTrabalhaComTabelaPrecos(true);

        // Carregar tabelas de preços ativas
        const { data: tabelasData, error: tabelasError } = await supabase
          .from('tabela_de_preco')
          .select('id, nome')
          .eq('empresa_id', usuarioData.empresa_id)
          .eq('ativo', true)
          .eq('deletado', false)
          .order('nome');

        if (tabelasError) {
          console.error('Erro ao carregar tabelas de preços:', tabelasError);
          return;
        }

        setTabelasPrecos(tabelasData || []);
      } else {
        setTrabalhaComTabelaPrecos(false);
        setTabelasPrecos([]);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de tabela de preços:', error);
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Simular um delay mínimo para mostrar o skeleton
      await new Promise(resolve => setTimeout(resolve, 300));

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Erro ao obter usuário:', userError);
        showMessage('error', 'Erro de autenticação');
        return;
      }

      if (!userData.user) {
        console.error('Usuário não autenticado');
        showMessage('error', 'Usuário não autenticado');
        return;
      }

      console.log('Usuário logado:', userData.user.id);

      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (usuarioError) {
        console.error('Erro ao buscar dados do usuário:', usuarioError);
        showMessage('error', 'Erro ao buscar dados do usuário');
        return;
      }

      if (!usuarioData?.empresa_id) {
        console.error('Empresa não encontrada para o usuário');
        showMessage('error', 'Empresa não encontrada');
        return;
      }

      console.log('Empresa ID:', usuarioData.empresa_id);

      // Carregar configurações de tabelas de preços PRIMEIRO
      await carregarConfiguracoesTabelaPrecos();

      const { data: opcoesData, error: opcoesError } = await supabase
        .from('opcoes_adicionais')
        .select(`
          *,
          itens:opcoes_adicionais_itens(*)
        `)
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('deletado', false)
        .order('nome');

      if (opcoesError) {
        console.error('Erro ao carregar opções adicionais:', opcoesError);
        showMessage('error', 'Erro ao carregar opções adicionais');
        return;
      }

      console.log('Dados brutos das opções:', opcoesData);

      // Filtrar itens não deletados no lado do cliente
      const opcoesFiltered = opcoesData?.map(opcao => ({
        ...opcao,
        itens: opcao.itens?.filter((item: any) => !item.deletado) || []
      })) || [];

      console.log('Opções filtradas:', opcoesFiltered);
      setOpcoes(opcoesFiltered);

      // Carregar preços dos adicionais para exibição nos cards
      // Aguardar um pouco para garantir que as configurações foram carregadas
      await new Promise(resolve => setTimeout(resolve, 200));
      await carregarTodosPrecosAdicionais();

      if (opcoesFiltered.length === 0) {
        console.log('Nenhuma opção adicional encontrada para esta empresa');
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      showMessage('error', 'Erro ao carregar dados: ' + error.message);
    } finally {
      setIsDataReady(true);
      setIsLoading(false);
    }
  };

  // Função para carregar todos os preços dos adicionais para exibição nos cards
  const carregarTodosPrecosAdicionais = async () => {
    try {
      if (!trabalhaComTabelaPrecos || tabelasPrecos.length === 0) {
        setAdicionaisPrecos({});
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      // Carregar todos os preços dos adicionais
      const { data: precosData, error } = await supabase
        .from('adicionais_precos')
        .select('adicional_item_id, tabela_preco_id, preco')
        .eq('empresa_id', usuarioData.empresa_id)
        .gt('preco', 0); // Apenas preços > 0

      if (error) {
        console.error('Erro ao carregar preços dos adicionais:', error);
        return;
      }

      // Organizar preços por item adicional
      const precosMap: {[key: string]: {[key: string]: number}} = {};
      precosData?.forEach(item => {
        if (!precosMap[item.adicional_item_id]) {
          precosMap[item.adicional_item_id] = {};
        }
        precosMap[item.adicional_item_id][item.tabela_preco_id] = item.preco;
      });

      setAdicionaisPrecos(precosMap);
    } catch (error) {
      console.error('Erro ao carregar preços dos adicionais:', error);
    }
  };

  // Função para carregar preços das tabelas de um item adicional
  const carregarPrecosTabelas = async (itemId: string) => {
    try {
      const { data: precosData, error } = await supabase
        .from('adicionais_precos')
        .select('tabela_preco_id, preco')
        .eq('adicional_item_id', itemId);

      if (error) {
        console.error('Erro ao carregar preços das tabelas:', error);
        return;
      }

      const precosMap: {[key: string]: number} = {};
      const precosFormatadosMap: {[key: string]: string} = {};

      precosData?.forEach(item => {
        precosMap[item.tabela_preco_id] = item.preco;
        // Formatar o preço para exibição (sem símbolo R$)
        precosFormatadosMap[item.tabela_preco_id] = item.preco.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
      });

      setPrecosTabelas(precosMap);
      setPrecosTabelasFormatados(precosFormatadosMap);
    } catch (error) {
      console.error('Erro ao carregar preços das tabelas:', error);
    }
  };

  // Função para salvar preço de uma tabela específica
  const salvarPrecoTabela = async (itemId: string, tabelaId: string, preco: number) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      const { error } = await supabase
        .from('adicionais_precos')
        .upsert({
          empresa_id: usuarioData.empresa_id,
          adicional_item_id: itemId,
          tabela_preco_id: tabelaId,
          preco: preco
        }, {
          onConflict: 'adicional_item_id,tabela_preco_id'
        });

      if (error) throw error;

      // Atualizar estado local
      setPrecosTabelas(prev => ({
        ...prev,
        [tabelaId]: preco
      }));

    } catch (error) {
      console.error('Erro ao salvar preço da tabela:', error);
      showMessage('error', 'Erro ao salvar preço da tabela');
    }
  };

  // Função para salvar todos os preços das tabelas
  const salvarTodosPrecosTabelas = async (itemId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) return;

      const precosParaInserir = [];

      // Para cada tabela de preços
      for (const tabela of tabelasPrecos) {
        const preco = precosTabelas[tabela.id];
        if (preco && preco > 0) {
          precosParaInserir.push({
            empresa_id: usuarioData.empresa_id,
            adicional_item_id: itemId,
            tabela_preco_id: tabela.id,
            preco: preco
          });
        }
      }

      // Se há preços para salvar, fazer upsert em lote
      if (precosParaInserir.length > 0) {
        const { error } = await supabase
          .from('adicionais_precos')
          .upsert(precosParaInserir, {
            onConflict: 'adicional_item_id,tabela_preco_id'
          });

        if (error) throw error;

        console.log(`✅ Salvos ${precosParaInserir.length} preços de tabelas para o item ${itemId}`);
      }

    } catch (error) {
      console.error('Erro ao salvar preços das tabelas:', error);
      showMessage('error', 'Erro ao salvar preços das tabelas');
    }
  };

  // Função para lidar com mudança de preço da tabela
  const handlePrecoTabelaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;

    // Se o campo estiver vazio, limpa tudo
    if (!valor) {
      if (abaPrecoAtiva !== 'padrao') {
        setPrecosTabelasFormatados(prev => ({
          ...prev,
          [abaPrecoAtiva]: ''
        }));
        setPrecosTabelas(prev => ({
          ...prev,
          [abaPrecoAtiva]: 0
        }));
      }
      return;
    }

    // Formata o valor
    const valorFormatado = formatarValorMonetario(valor);

    // Atualiza o valor formatado no estado
    if (abaPrecoAtiva !== 'padrao') {
      setPrecosTabelasFormatados(prev => ({
        ...prev,
        [abaPrecoAtiva]: valorFormatado
      }));

      // Atualiza o valor numérico no estado
      const valorNumerico = desformatarValorMonetario(valorFormatado);
      setPrecosTabelas(prev => ({
        ...prev,
        [abaPrecoAtiva]: valorNumerico
      }));
    }
  };

  // Função removida - salvamento agora é apenas no submit do formulário

  // Função para obter tabelas de preços com valores válidos para um item adicional
  const obterTabelasComPrecos = (itemId: string): Array<{id: string; nome: string; preco: number}> => {
    if (!trabalhaComTabelaPrecos || !adicionaisPrecos[itemId]) {
      return [];
    }

    return tabelasPrecos
      .map(tabela => ({
        id: tabela.id,
        nome: tabela.nome,
        preco: adicionaisPrecos[itemId][tabela.id] || 0
      }))
      .filter(tabela => tabela.preco > 0); // Apenas tabelas com preço > 0
  };

  // Função para formatar preço
  const formatarPreco = (preco: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(preco);
  };

  // Função para alternar dropdown
  const toggleDropdown = (itemId: string) => {
    setDropdownAberto(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Função para obter valor formatado de uma tabela específica
  const obterValorFormatadoTabela = (tabelaId: string): string => {
    // Primeiro verifica se há um valor formatado no estado
    if (precosTabelasFormatados[tabelaId]) {
      return precosTabelasFormatados[tabelaId];
    }

    // Se não há valor formatado, formata o valor numérico
    const valor = precosTabelas[tabelaId] || 0;
    return valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const handleSubmitOpcao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaOpcao.nome.trim()) return;

    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) throw new Error('Empresa não encontrada');

      // ✅ VALIDAÇÃO: Verificar se já existe uma opção com o mesmo nome na empresa
      const nomeNormalizado = novaOpcao.nome.trim().toLowerCase();

      let queryValidacao = supabase
        .from('opcoes_adicionais')
        .select('id, nome')
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('deletado', false)
        .ilike('nome', nomeNormalizado);

      // Se estiver editando, excluir o próprio registro da validação
      if (editingOpcao) {
        queryValidacao = queryValidacao.neq('id', editingOpcao.id);
      }

      const { data: opcoesExistentes, error: validacaoError } = await queryValidacao;

      if (validacaoError) throw validacaoError;

      if (opcoesExistentes && opcoesExistentes.length > 0) {
        showMessage('error', `Já existe uma opção adicional com o nome "${novaOpcao.nome}" nesta empresa.`);
        return;
      }

      if (editingOpcao) {
        const { error } = await supabase
          .from('opcoes_adicionais')
          .update({
            nome: novaOpcao.nome,
            quantidade_minima: novaOpcao.quantidade_minima,
            quantidade_maxima: novaOpcao.quantidade_maxima
          })
          .eq('id', editingOpcao.id);

        if (error) throw error;
        showMessage('success', 'Opção atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('opcoes_adicionais')
          .insert([{
            nome: novaOpcao.nome,
            quantidade_minima: novaOpcao.quantidade_minima,
            quantidade_maxima: novaOpcao.quantidade_maxima,
            empresa_id: usuarioData.empresa_id
          }]);

        if (error) throw error;
        showMessage('success', 'Opção criada com sucesso!');
      }

      setNovaOpcao({ nome: '', quantidade_minima: 0, quantidade_maxima: 0 });
      setQuantidadeMinimaInput('');
      setQuantidadeMaximaInput('');
      setEditingOpcao(null);
      setShowSidebar(false);
      loadData();
    } catch (error: any) {
      showMessage('error', 'Erro ao salvar opção: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoItem.nome.trim()) return;

    // Se o campo de preço estiver vazio, considerar como zero
    // Caso contrário, converter para número
    const preco = novoItem.preco === '' ? 0 : parseFloat(novoItem.preco);
    if (isNaN(preco)) return;

    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();

      if (!usuarioData?.empresa_id) throw new Error('Empresa não encontrada');

      if (editingItem) {
        // Atualizar item existente
        const { error } = await supabase
          .from('opcoes_adicionais_itens')
          .update({
            nome: novoItem.nome,
            preco: preco
          })
          .eq('id', editingItem.id);

        if (error) throw error;

        // Salvar preços das tabelas se trabalha com tabelas de preços
        if (trabalhaComTabelaPrecos && tabelasPrecos.length > 0) {
          await salvarTodosPrecosTabelas(editingItem.id);
        }

        setNovoItem({ nome: '', preco: '' });
        setPrecoFormatado('');
        setPrecosTabelas({});
        setPrecosTabelasFormatados({});
        setAbaPrecoAtiva('padrao');
        setEditingItem(null);
        setIsAddingItem(false);
        setEditingOpcao(null);
        setShowSidebar(false);
        loadData();
        showMessage('success', 'Item atualizado com sucesso!');
      } else {
        // Adicionar novo item
        const { data: novoItemData, error } = await supabase
          .from('opcoes_adicionais_itens')
          .insert([{
            nome: novoItem.nome,
            preco: preco,
            opcao_id: editingOpcao.id,
            empresa_id: usuarioData.empresa_id
          }])
          .select('id')
          .single();

        if (error) throw error;

        // Salvar preços das tabelas se trabalha com tabelas de preços
        if (trabalhaComTabelaPrecos && tabelasPrecos.length > 0 && novoItemData?.id) {
          await salvarTodosPrecosTabelas(novoItemData.id);
        }

        setNovoItem({ nome: '', preco: '' });
        setPrecoFormatado('');
        setPrecosTabelas({});
        setPrecosTabelasFormatados({});
        setAbaPrecoAtiva('padrao');
        setIsAddingItem(false);
        setEditingOpcao(null);
        setShowSidebar(false);
        loadData();
        showMessage('success', 'Item adicionado com sucesso!');
      }
    } catch (error: any) {
      showMessage('error', `Erro ao ${editingItem ? 'atualizar' : 'adicionar'} item: ` + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditItem = async (item: any, opcao: any) => {
    setEditingOpcao(opcao);
    setEditingItem(item);
    setNovoItem({
      nome: item.nome,
      preco: item.preco.toString()
    });
    // Formatar o preço para exibição
    const precoFormatado = (item.preco * 100).toString().padStart(3, '0');
    setPrecoFormatado(formatarValorMonetario(precoFormatado));

    // Carregar preços das tabelas se trabalha com tabelas de preços
    if (trabalhaComTabelaPrecos && tabelasPrecos.length > 0) {
      await carregarPrecosTabelas(item.id);
    }

    setAbaPrecoAtiva('padrao');
    setIsAddingItem(true);
    setShowSidebar(true);
  };

  const handleDelete = async (id: string, type: 'opcao' | 'item', nome: string) => {
    setDeleteConfirmation({
      isOpen: true,
      itemId: id,
      itemType: type,
      title: `Excluir ${type === 'opcao' ? 'Opção' : 'Item'}`,
      message: `Tem certeza que deseja excluir ${type === 'opcao' ? 'a opção' : 'o item'} "${nome}"? Você poderá restaurá-${type === 'opcao' ? 'la' : 'lo'} posteriormente se necessário.`,
    });
  };

  const handleConfirmDelete = async () => {
    try {
      // Obter dados do usuário atual
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const now = new Date().toISOString();
      const { itemId, itemType } = deleteConfirmation;
      const table = itemType === 'opcao' ? 'opcoes_adicionais' : 'opcoes_adicionais_itens';

      const { error } = await supabase
        .from(table)
        .update({
          deletado: true,
          deletado_em: now,
          deletado_por: userData.user.id
        })
        .eq('id', itemId);

      if (error) throw error;

      await loadData();
      showMessage('success', `${itemType === 'opcao' ? 'Opção' : 'Item'} excluído com sucesso!`);
    } catch (error: any) {
      showMessage('error', 'Erro ao excluir item: ' + error.message);
    } finally {
      setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
    }
  };

  // Renderizar skeleton loader para as opções adicionais
  const renderSkeletonCards = () => {
    return Array(3).fill(0).map((_, index) => (
      <div
        key={index}
        className="bg-background-card rounded-lg border border-gray-800"
      >
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <div className={`h-6 bg-gray-700 rounded animate-pulse mb-2 ${
              index % 3 === 0 ? 'w-32' : index % 3 === 1 ? 'w-40' : 'w-28'
            }`}></div>
            <div className="h-4 w-20 bg-gray-600 rounded animate-pulse"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 bg-gray-700 rounded animate-pulse"></div>
            <div className="w-8 h-8 bg-gray-700 rounded animate-pulse"></div>
            <div className="w-8 h-8 bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {Array(2).fill(0).map((_, itemIndex) => (
              <div
                key={itemIndex}
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
              >
                <div className={`h-4 bg-gray-700 rounded animate-pulse ${
                  itemIndex % 2 === 0 ? 'w-24' : 'w-32'
                }`}></div>
                <div className="flex items-center gap-4">
                  <div className="h-4 w-16 bg-gray-700 rounded animate-pulse"></div>
                  <div className="w-8 h-8 bg-gray-700 rounded animate-pulse"></div>
                  <div className="w-8 h-8 bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ));
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Opções Adicionais</h1>
          <p className="text-gray-400 mt-1">Gerencie as opções adicionais dos produtos</p>
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={() => {
            setEditingOpcao(null);
            setNovaOpcao({ nome: '', quantidade_minima: 0, quantidade_maxima: 0 });
            setQuantidadeMinimaInput('');
            setQuantidadeMaximaInput('');
            setIsAddingItem(false);
            setShowSidebar(true);
          }}
        >
          + Adicionar Opção
        </Button>
      </div>

      {/* ✅ CAMPO DE PESQUISA */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar opções adicionais ou itens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 transition-colors"
          />
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* ✅ LAYOUT DE 2 COLUNAS - Similar à página de produtos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {!isDataReady ? (
          renderSkeletonCards()
        ) : (
          <>
            {getFilteredOpcoes().map(opcao => (
              <div
                key={opcao.id}
                className="bg-background-card rounded-lg border border-gray-800"
              >
                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-white">{opcao.nome}</h3>
                    <div className="flex gap-4 mt-1">
                      {opcao.quantidade_minima > 0 && (
                        <p className="text-xs text-primary-400">
                          Mín: {opcao.quantidade_minima} {opcao.quantidade_minima === 1 ? 'item' : 'itens'}
                        </p>
                      )}
                      {opcao.quantidade_maxima > 0 && (
                        <p className="text-xs text-orange-400">
                          Máx: {opcao.quantidade_maxima} {opcao.quantidade_maxima === 1 ? 'item' : 'itens'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingOpcao(opcao);
                        setNovoItem({ nome: '', preco: '' });
                        setPrecoFormatado('');
                        setPrecosTabelas({});
                        setAbaPrecoAtiva('padrao');
                        setIsAddingItem(true);
                        setEditingItem(null);
                        setShowSidebar(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-500/10 rounded-md text-primary-400 hover:text-primary-300 hover:bg-primary-500/20 transition-colors"
                    >
                      <Plus size={14} />
                      Adicionar Item
                    </button>
                    <button
                      onClick={() => {
                        setEditingOpcao(opcao);
                        setNovaOpcao({
                          nome: opcao.nome,
                          quantidade_minima: opcao.quantidade_minima || 0,
                          quantidade_maxima: opcao.quantidade_maxima || 0
                        });
                        setQuantidadeMinimaInput(opcao.quantidade_minima > 0 ? opcao.quantidade_minima.toString() : '');
                        setQuantidadeMaximaInput(opcao.quantidade_maxima > 0 ? opcao.quantidade_maxima.toString() : '');
                        setIsAddingItem(false);
                        setShowSidebar(true);
                      }}
                      className="p-1 text-gray-400 hover:text-white transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(opcao.id, 'opcao', opcao.nome)}
                      className="p-1 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="p-4">
                  {opcao.itens?.length > 0 ? (
                    <div className="space-y-3">
                      {opcao.itens.map((item: any) => {
                        const tabelasComPrecos = obterTabelasComPrecos(item.id);
                        const temTabelasPrecos = tabelasComPrecos.length > 0;
                        const dropdownEstaAberto = dropdownAberto[item.id] || false;

                        return (
                          <div key={item.id} className="bg-gray-800/50 rounded-lg">
                            {/* Linha principal do item - Nome e preço na mesma linha */}
                            <div className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  {/* Nome e preço na mesma linha */}
                                  <div className="flex items-center justify-between">
                                    <span className="text-white font-medium truncate">{item.nome}</span>
                                    <span className="text-primary-400 font-medium ml-2 flex-shrink-0">
                                      R$ {item.preco.toFixed(2)}
                                    </span>
                                  </div>
                                </div>

                                {/* Botões de ação */}
                                <div className="flex items-center gap-2 ml-3">
                                  <button
                                    onClick={() => handleEditItem(item, opcao)}
                                    className="p-1.5 text-gray-400 hover:text-white transition-colors rounded"
                                    title="Editar item"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(item.id, 'item', item.nome)}
                                    className="p-1.5 text-red-400 hover:text-red-300 transition-colors rounded"
                                    title="Excluir item"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>

                              {/* Dropdown de tabelas de preços - Largura completa */}
                              {temTabelasPrecos && (
                                <div className="mt-3">
                                  <button
                                    onClick={() => toggleDropdown(item.id)}
                                    className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
                                  >
                                    <span>Tabelas de Preços</span>
                                    {dropdownEstaAberto ? (
                                      <ChevronUp size={14} />
                                    ) : (
                                      <ChevronDown size={14} />
                                    )}
                                  </button>

                                  {/* Conteúdo do dropdown */}
                                  <AnimatePresence>
                                    {dropdownEstaAberto && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="mt-2 space-y-1 overflow-hidden"
                                      >
                                        {tabelasComPrecos.map((tabela) => (
                                          <div
                                            key={tabela.id}
                                            className="flex items-center justify-between p-2 bg-gray-700/50 rounded text-xs"
                                          >
                                            <span className="text-gray-300">{tabela.nome}</span>
                                            <span className="text-primary-400 font-medium">
                                              {formatarPreco(tabela.preco)}
                                            </span>
                                          </div>
                                        ))}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-gray-400">Nenhum item cadastrado</p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Mensagem quando não há opções ou quando a pesquisa não retorna resultados */}
            {getFilteredOpcoes().length === 0 && (
              <div className="lg:col-span-2 bg-background-card rounded-lg p-8 text-center">
                {opcoes.length === 0 ? (
                  <>
                    <h3 className="text-lg font-medium text-white mb-2">
                      Nenhuma opção cadastrada
                    </h3>
                    <p className="text-gray-400 mb-6">
                      Crie sua primeira opção adicional para começar.
                    </p>
                    <Button
                      type="button"
                      variant="primary"
                      className="mx-auto"
                      onClick={() => {
                        setEditingOpcao(null);
                        setNovaOpcao({ nome: '', quantidade_minima: 0, quantidade_maxima: 0 });
                        setQuantidadeMinimaInput('');
                        setQuantidadeMaximaInput('');
                        setIsAddingItem(false);
                        setShowSidebar(true);
                      }}
                    >
                      + Adicionar Opção
                    </Button>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-medium text-white mb-2">
                      Nenhum resultado encontrado
                    </h3>
                    <p className="text-gray-400 mb-6">
                      Tente ajustar o termo de pesquisa ou{' '}
                      <button
                        onClick={() => setSearchTerm('')}
                        className="text-primary-400 hover:text-primary-300 underline"
                      >
                        limpar filtros
                      </button>
                    </p>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => {
                setShowSidebar(false);
                setIsAddingItem(false);
                setEditingItem(null);
                setPrecoFormatado('');
                setQuantidadeMinimaInput('');
              }}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed right-0 top-0 h-screen w-full max-w-md bg-background-card border-l border-gray-800 z-50 overflow-y-auto custom-scrollbar"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">
                    {editingOpcao
                      ? isAddingItem
                        ? editingItem ? 'Editar Item' : 'Novo Item'
                        : 'Editar Opção'
                      : 'Nova Opção'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowSidebar(false);
                      setIsAddingItem(false);
                      setEditingItem(null);
                      setPrecoFormatado('');
                      setQuantidadeMinimaInput('');
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                {(!editingOpcao || (editingOpcao && !isAddingItem)) && (
                  <form onSubmit={handleSubmitOpcao} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Nome da Opção
                      </label>
                      <input
                        type="text"
                        value={novaOpcao.nome}
                        onChange={(e) => setNovaOpcao({ ...novaOpcao, nome: e.target.value })}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        placeholder="Digite o nome da opção"
                      />

                      {/* Campos de Quantidade em Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Quantidade Mínima
                          </label>
                          <input
                            type="text"
                            value={quantidadeMinimaInput}
                            onChange={handleQuantidadeMinimaChange}
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Quantidade Máxima
                          </label>
                          <input
                            type="text"
                            value={quantidadeMaximaInput}
                            onChange={handleQuantidadeMaximaChange}
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                            placeholder="0 (ilimitado)"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Se maior que 0, o cliente deverá selecionar pelo menos esta quantidade de itens desta opção.
                      </p>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <Button
                        type="button"
                        variant="text"
                        className="flex-1"
                        onClick={() => {
                          setShowSidebar(false);
                          setIsAddingItem(false);
                          setEditingItem(null);
                          setQuantidadeMinimaInput('');
                          setQuantidadeMaximaInput('');
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        className="flex-1"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Salvando...' : editingOpcao ? 'Salvar' : 'Criar'}
                      </Button>
                    </div>
                  </form>
                )}

                {editingOpcao && isAddingItem && (
                  <form onSubmit={handleSubmitItem} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Nome do Item
                      </label>
                      <input
                        type="text"
                        value={novoItem.nome}
                        onChange={(e) => setNovoItem({ ...novoItem, nome: e.target.value })}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                        placeholder="Digite o nome do item"
                      />
                    </div>

                    {/* Seção de Preços com Abas */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Preços
                      </label>

                      {/* Abas de Preços */}
                      {trabalhaComTabelaPrecos && tabelasPrecos.length > 0 ? (
                        <div className="space-y-4">
                          {/* Navegação das Abas */}
                          <div className="flex border-b border-gray-700 overflow-x-auto">
                            {/* Aba Preço Padrão */}
                            <button
                              type="button"
                              onClick={() => setAbaPrecoAtiva('padrao')}
                              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                                abaPrecoAtiva === 'padrao'
                                  ? 'border-primary-500 text-primary-400'
                                  : 'border-transparent text-gray-400 hover:text-gray-300'
                              }`}
                            >
                              Preço
                            </button>

                            {/* Abas das Tabelas de Preços */}
                            {tabelasPrecos.map((tabela) => (
                              <button
                                key={tabela.id}
                                type="button"
                                onClick={() => setAbaPrecoAtiva(tabela.id)}
                                className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                                  abaPrecoAtiva === tabela.id
                                    ? 'border-primary-500 text-primary-400'
                                    : 'border-transparent text-gray-400 hover:text-gray-300'
                                }`}
                              >
                                {tabela.nome}
                              </button>
                            ))}
                          </div>

                          {/* Campo de Preço Dinâmico */}
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                              R$
                            </span>
                            <input
                              type="text"
                              value={abaPrecoAtiva === 'padrao' ? precoFormatado : obterValorFormatadoTabela(abaPrecoAtiva)}
                              onChange={(e) => {
                                if (abaPrecoAtiva === 'padrao') {
                                  handlePrecoChange(e);
                                } else {
                                  handlePrecoTabelaChange(e);
                                }
                              }}
                              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-8 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                              placeholder="0,00"
                            />
                          </div>
                        </div>
                      ) : (
                        /* Preço Simples quando não trabalha com tabelas */
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                            R$
                          </span>
                          <input
                            type="text"
                            value={precoFormatado}
                            onChange={handlePrecoChange}
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg py-2 pl-8 pr-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
                            placeholder="0,00"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex gap-4 pt-4">
                      <Button
                        type="button"
                        variant="text"
                        className="flex-1"
                        onClick={() => {
                          setShowSidebar(false);
                          setIsAddingItem(false);
                          setEditingItem(null);
                          setPrecoFormatado('');
                          setPrecosTabelas({});
                          setAbaPrecoAtiva('padrao');
                          setQuantidadeMinimaInput('');
                          setQuantidadeMaximaInput('');
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        className="flex-1"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Salvando...' : editingItem ? 'Salvar Item' : 'Adicionar Item'}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <DeleteConfirmation
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmDelete}
        title={deleteConfirmation.title}
        message={deleteConfirmation.message}
      />
    </div>
  );
};

export default AdicionaisPage;