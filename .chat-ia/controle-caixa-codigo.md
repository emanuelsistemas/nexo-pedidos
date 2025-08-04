# 💻 CONTROLE DE CAIXA - CÓDIGO REACT

## 🎯 **ESTADOS NECESSÁRIOS**

```javascript
// Estados para controle de caixa
const [showAberturaCaixaModal, setShowAberturaCaixaModal] = useState(false);
const [valorAberturaCaixa, setValorAberturaCaixa] = useState('');
const [caixaAberto, setCaixaAberto] = useState(false);
const [loadingCaixa, setLoadingCaixa] = useState(false);
```

## 🔧 **FUNÇÃO DE VERIFICAÇÃO**

```javascript
const verificarStatusCaixa = async () => {
  try {
    console.log('🔍 Verificando status do caixa...');
    console.log('📋 pdvConfig:', pdvConfig);
    console.log('🔧 controla_caixa:', pdvConfig?.controla_caixa);
    
    setLoadingCaixa(true);
    
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      console.log('❌ Usuário não autenticado');
      return;
    }

    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', authData.user.id)
      .single();

    if (!usuarioData?.empresa_id) {
      console.log('❌ Empresa não encontrada');
      return;
    }

    console.log('🏢 Empresa ID:', usuarioData.empresa_id);
    console.log('👤 Usuário ID:', authData.user.id);

    // Verificar se há caixa aberto para este usuário hoje
    const hoje = new Date().toISOString().split('T')[0];
    console.log('📅 Data hoje:', hoje);
    
    const { data: caixaData, error } = await supabase
      .from('caixa_controle')
      .select('*')
      .eq('empresa_id', usuarioData.empresa_id)
      .eq('usuario_id', authData.user.id)
      .eq('status_caixa', true)
      .gte('data_abertura', `${hoje}T00:00:00`)
      .lte('data_abertura', `${hoje}T23:59:59`)
      .single();

    console.log('💰 Dados do caixa encontrados:', caixaData);
    console.log('❌ Erro na consulta:', error);

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao verificar status do caixa:', error);
      return;
    }

    // Se encontrou caixa aberto, definir como aberto
    if (caixaData) {
      console.log('✅ Caixa encontrado - definindo como aberto');
      setCaixaAberto(true);
    } else {
      console.log('❌ Nenhum caixa aberto encontrado');
      // Se não encontrou caixa aberto e controle de caixa está habilitado, mostrar modal
      if (pdvConfig?.controla_caixa === true) {
        console.log('🔒 Controle de caixa habilitado - bloqueando PDV');
        setCaixaAberto(false);
        setShowAberturaCaixaModal(true);
      } else {
        console.log('🔓 Controle de caixa desabilitado - permitindo operação');
        setCaixaAberto(true); // Se não controla caixa, permitir operação
      }
    }
  } catch (error) {
    console.error('Erro ao verificar status do caixa:', error);
  } finally {
    setLoadingCaixa(false);
  }
};
```

## 🎭 **useEFFECTS NECESSÁRIOS**

```javascript
// useEffect para verificar status do caixa quando pdvConfig for carregado
useEffect(() => {
  console.log('🔄 useEffect pdvConfig disparado:', { pdvConfig, loadingCaixa, isLoading });
  
  if (pdvConfig !== null && !isLoading) {
    console.log('🔧 pdvConfig carregado, verificando status do caixa...');
    console.log('📋 Configuração controla_caixa:', pdvConfig?.controla_caixa);
    verificarStatusCaixa();
  } else {
    console.log('⏳ Aguardando carregamento completo...', { 
      pdvConfigNull: pdvConfig === null, 
      isLoading,
      loadingCaixa 
    });
  }
}, [pdvConfig, isLoading]);

// Timeout de segurança para evitar travamento
useEffect(() => {
  const timeout = setTimeout(() => {
    if (loadingCaixa) {
      console.log('⚠️ Timeout de segurança - forçando liberação do caixa');
      setLoadingCaixa(false);
      setCaixaAberto(true);
    }
  }, 10000); // 10 segundos

  return () => clearTimeout(timeout);
}, [loadingCaixa]);

// Monitor do estado do modal
useEffect(() => {
  console.log('🎭 Estado do modal mudou:', { showAberturaCaixaModal });
}, [showAberturaCaixaModal]);
```

## 💰 **FUNÇÃO DE ABERTURA DE CAIXA**

```javascript
const abrirCaixa = async () => {
  try {
    setLoadingCaixa(true);
    
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      toast.error('Usuário não autenticado');
      return;
    }

    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', authData.user.id)
      .single();

    if (!usuarioData?.empresa_id) {
      toast.error('Empresa não encontrada');
      return;
    }

    // Converter valor para decimal
    const valorDecimal = parseFloat(valorAberturaCaixa.replace(',', '.')) || 0;

    // Inserir registro de abertura
    const { error } = await supabase
      .from('caixa_controle')
      .insert({
        empresa_id: usuarioData.empresa_id,
        usuario_id: authData.user.id,
        data_abertura: new Date().toISOString(),
        valor_abertura: valorDecimal,
        status_caixa: true,
        observacoes_abertura: 'Abertura via PDV'
      });

    if (error) {
      console.error('Erro ao abrir caixa:', error);
      toast.error('Erro ao abrir caixa');
      return;
    }

    // Atualizar estados
    setCaixaAberto(true);
    setShowAberturaCaixaModal(false);
    setValorAberturaCaixa('');
    
    toast.success('Caixa aberto com sucesso!');
    
  } catch (error) {
    console.error('Erro ao abrir caixa:', error);
    toast.error('Erro ao abrir caixa');
  } finally {
    setLoadingCaixa(false);
  }
};
```

## 🔒 **FUNÇÃO DE FECHAMENTO DE CAIXA**

```javascript
const fecharCaixa = async (valorFechamento, observacoes = '') => {
  try {
    setLoadingCaixa(true);
    
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      toast.error('Usuário não autenticado');
      return;
    }

    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', authData.user.id)
      .single();

    if (!usuarioData?.empresa_id) {
      toast.error('Empresa não encontrada');
      return;
    }

    const hoje = new Date().toISOString().split('T')[0];
    const valorDecimal = parseFloat(valorFechamento.replace(',', '.')) || 0;

    // Atualizar registro para fechar caixa
    const { error } = await supabase
      .from('caixa_controle')
      .update({
        data_fechamento: new Date().toISOString(),
        valor_fechamento: valorDecimal,
        status_caixa: false,
        observacoes_fechamento: observacoes || 'Fechamento via PDV',
        updated_at: new Date().toISOString()
      })
      .eq('empresa_id', usuarioData.empresa_id)
      .eq('usuario_id', authData.user.id)
      .eq('status_caixa', true)
      .gte('data_abertura', `${hoje}T00:00:00`)
      .lte('data_abertura', `${hoje}T23:59:59`);

    if (error) {
      console.error('Erro ao fechar caixa:', error);
      toast.error('Erro ao fechar caixa');
      return;
    }

    // Atualizar estados
    setCaixaAberto(false);
    toast.success('Caixa fechado com sucesso!');
    
  } catch (error) {
    console.error('Erro ao fechar caixa:', error);
    toast.error('Erro ao fechar caixa');
  } finally {
    setLoadingCaixa(false);
  }
};
```

## 🎨 **TELA DE BLOQUEIO**

```javascript
// Tela quando caixa está fechado
{!caixaAberto && pdvConfig?.controla_caixa && (
  <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
    <div className="text-center p-8 max-w-md">
      <div className="mb-6">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <X className="w-10 h-10 text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Caixa Fechado</h2>
        <p className="text-gray-400">
          O controle de caixa está habilitado. É necessário abrir o caixa antes de operar o PDV.
        </p>
      </div>
      
      <button
        onClick={() => {
          console.log('🔘 Botão "Abrir Caixa" clicado');
          console.log('📊 Estado antes:', { showAberturaCaixaModal });
          setShowAberturaCaixaModal(true);
          console.log('📊 setShowAberturaCaixaModal(true) executado');
        }}
        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
      >
        Abrir Caixa
      </button>
    </div>
  </div>
)}
```

## 🎭 **MODAL DE ABERTURA**

```javascript
// Modal de abertura de caixa (VERSÃO SIMPLES)
{showAberturaCaixaModal && (
  <div 
    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4"
    style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}
  >
    <div className="bg-gray-900 rounded-xl border border-green-500/30 p-6 max-w-md w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-green-500/20 rounded-lg">
          <DollarSign className="w-8 h-8 text-green-400" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-white">Abertura de Caixa</h3>
          <p className="text-sm text-gray-400">Registre a abertura do caixa para iniciar as operações</p>
        </div>
      </div>

      {/* Informações do usuário */}
      <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User size={16} className="text-blue-400" />
            <div>
              <span className="text-sm text-gray-400">Operador:</span>
              <span className="text-white font-medium ml-2">
                {userData?.nome || 'Usuário'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-blue-400" />
            <div>
              <span className="text-sm text-gray-400">Data/Hora:</span>
              <span className="text-white font-medium ml-2">
                {formatDateTime(currentDateTime)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Campo de valor */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Valor de Abertura
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium">
            R$
          </span>
          <input
            type="text"
            value={valorAberturaCaixa}
            onChange={(e) => setValorAberturaCaixa(formatarValorMonetario(e.target.value))}
            placeholder="0,00"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-12 pr-4 py-3 text-white text-lg font-medium focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/20"
            autoFocus
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Informe o valor inicial em dinheiro no caixa (opcional)
        </p>
      </div>

      {/* Botões */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            setShowAberturaCaixaModal(false);
            setValorAberturaCaixa('');
          }}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors font-medium"
        >
          Cancelar
        </button>
        <button
          onClick={abrirCaixa}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg transition-colors font-medium"
        >
          Abrir Caixa
        </button>
      </div>
    </div>
  </div>
)}
```

## 🛠️ **FUNÇÃO UTILITÁRIA**

```javascript
// Formatar valor monetário
const formatarValorMonetario = (valor) => {
  // Remove tudo que não é dígito
  const apenasNumeros = valor.replace(/\D/g, '');
  
  // Se vazio, retorna vazio
  if (!apenasNumeros) return '';
  
  // Converte para número e divide por 100 para ter centavos
  const numero = parseInt(apenasNumeros) / 100;
  
  // Formata como moeda brasileira
  return numero.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};
```

## 🚨 **PROBLEMA ATUAL**

O modal não está aparecendo mesmo com o estado `showAberturaCaixaModal = true`. 

**Possíveis soluções:**
1. Renderizar modal fora do container principal
2. Usar portal do React
3. Simplificar sem AnimatePresence
4. Verificar conflitos de CSS/z-index
