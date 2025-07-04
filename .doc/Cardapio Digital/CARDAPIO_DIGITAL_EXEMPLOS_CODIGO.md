# 💻 CARDÁPIO DIGITAL - EXEMPLOS DE CÓDIGO

## 📋 CONSULTAS SUPABASE FUNCIONAIS

### 1. Buscar Empresa por Slug (FUNCIONA)
```typescript
const carregarDadosCardapio = async () => {
  try {
    setLoading(true);
    setError(null);

    // 1. Buscar configuração PDV pelo slug personalizado
    const { data: pdvConfigData, error: configError } = await supabase
      .from('pdv_config')
      .select('empresa_id, cardapio_url_personalizada, modo_escuro_cardapio')
      .eq('cardapio_url_personalizada', slug)
      .eq('cardapio_digital', true)
      .single();

    if (configError || !pdvConfigData) {
      console.error('Erro ao buscar configuração PDV:', configError);
      setError('Cardápio não encontrado ou não está disponível.');
      return;
    }

    // 2. Buscar dados da empresa
    const { data: empresaData, error: empresaError } = await supabase
      .from('empresas')
      .select('id, razao_social, nome_fantasia, whatsapp, endereco, numero, bairro, cidade, estado')
      .eq('id', pdvConfigData.empresa_id)
      .single();

    if (empresaError || !empresaData) {
      console.error('Erro ao buscar empresa:', empresaError);
      setError('Dados da empresa não encontrados.');
      return;
    }

    setEmpresa(empresaData);

    // Configurar tema baseado na configuração da empresa
    setConfig(prev => ({
      ...prev,
      modo_escuro: pdvConfigData.modo_escuro_cardapio || false
    }));

  } catch (error: any) {
    console.error('Erro ao carregar cardápio:', error);
    setError('Erro interno do servidor.');
  } finally {
    setLoading(false);
  }
};
```

### 2. Buscar Produtos com Fotos (FUNCIONA)
```typescript
// 3. Buscar produtos ativos da empresa
const { data: produtosData, error: produtosError } = await supabase
  .from('produtos')
  .select('id, nome, descricao, preco, grupo_id, ativo')
  .eq('empresa_id', pdvConfigData.empresa_id)
  .eq('ativo', true)
  .order('nome');

if (produtosError) {
  console.error('Erro ao carregar produtos:', produtosError);
  setError('Erro ao carregar produtos do cardápio.');
  return;
}

// 4. Buscar fotos dos produtos
const produtosIds = produtosData?.map(p => p.id) || [];
let fotosData: any[] = [];

if (produtosIds.length > 0) {
  const { data: fotosResult, error: fotosError } = await supabase
    .from('produto_fotos')
    .select('produto_id, url, principal')
    .in('produto_id', produtosIds)
    .eq('principal', true); // Buscar apenas a foto principal

  if (!fotosError && fotosResult) {
    fotosData = fotosResult;
  }
}

// 5. Buscar grupos dos produtos
const gruposIds = [...new Set(produtosData?.map(p => p.grupo_id).filter(Boolean))];
let gruposData: any[] = [];

if (gruposIds.length > 0) {
  const { data: gruposResult, error: gruposError } = await supabase
    .from('grupos')
    .select('id, nome')
    .in('id', gruposIds);

  if (!gruposError && gruposResult) {
    gruposData = gruposResult;
  }
}

// 6. Processar produtos com nome do grupo e foto
const produtosProcessados = produtosData?.map(produto => {
  const grupo = gruposData.find(g => g.id === produto.grupo_id);
  const foto = fotosData.find(f => f.produto_id === produto.id);
  return {
    ...produto,
    grupo_nome: grupo?.nome || 'Sem categoria',
    foto_url: foto?.url || null
  };
}) || [];

setProdutos(produtosProcessados);
```

### 3. Validação de URL Única (FUNCIONA)
```typescript
const verificarDisponibilidadeUrl = async (url: string) => {
  if (!url.trim()) {
    setUrlDisponivel(null);
    return;
  }

  try {
    setVerificandoUrl(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Obter empresa_id do usuário
    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', user.id)
      .single();

    if (!usuarioData?.empresa_id) return;

    // Verificar se já existe outra empresa usando essa URL
    const { data: urlExistente, error: urlError } = await supabase
      .from('pdv_config')
      .select('empresa_id')
      .eq('cardapio_url_personalizada', url.trim())
      .neq('empresa_id', usuarioData.empresa_id);

    if (urlError && urlError.code !== 'PGRST116') {
      console.error('Erro ao verificar URL:', urlError);
      setUrlDisponivel(null);
      return;
    }

    setUrlDisponivel(!urlExistente || urlExistente.length === 0);
  } catch (error) {
    console.error('Erro ao verificar disponibilidade:', error);
    setUrlDisponivel(null);
  } finally {
    setVerificandoUrl(false);
  }
};
```

---

## 🎨 COMPONENTES DE INTERFACE

### 1. Estados de Loading e Erro
```typescript
// Loading State
if (loading) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Carregando cardápio...</p>
      </div>
    </div>
  );
}

// Error State
if (error) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Cardápio não encontrado</h1>
        <p className="text-gray-600 mb-4">{error}</p>
        <p className="text-sm text-gray-500">
          Verifique se o link está correto ou entre em contato com o estabelecimento.
        </p>
      </div>
    </div>
  );
}
```

### 2. Header da Empresa
```typescript
<div className={`${config.modo_escuro ? 'bg-gray-800' : 'bg-white'} shadow-sm border-b`}>
  <div className="max-w-4xl mx-auto px-4 py-6">
    <div className="text-center">
      <h1 className="text-3xl font-bold mb-2">
        {empresa?.nome_fantasia || empresa?.razao_social}
      </h1>
      {empresa?.endereco && (
        <p className={`${config.modo_escuro ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
          📍 {empresa.endereco}
          {empresa.numero && `, ${empresa.numero}`}
          {empresa.bairro && ` - ${empresa.bairro}`}
          {empresa.cidade && `, ${empresa.cidade}`}
          {empresa.estado && ` - ${empresa.estado}`}
        </p>
      )}
      {empresa?.whatsapp && (
        <p className={`${config.modo_escuro ? 'text-gray-300' : 'text-gray-600'}`}>
          📞 {empresa.whatsapp}
        </p>
      )}
    </div>
  </div>
</div>
```

### 3. Filtros de Categoria
```typescript
{grupos.length > 1 && (
  <div className="max-w-4xl mx-auto px-4 py-4">
    <div className="flex flex-wrap gap-2 justify-center">
      <button
        onClick={() => setGrupoSelecionado('todos')}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          grupoSelecionado === 'todos'
            ? 'bg-blue-600 text-white'
            : config.modo_escuro
            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        Todos
      </button>
      {grupos.map(grupo => (
        <button
          key={grupo.id}
          onClick={() => setGrupoSelecionado(grupo.id)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            grupoSelecionado === grupo.id
              ? 'bg-blue-600 text-white'
              : config.modo_escuro
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {grupo.nome}
        </button>
      ))}
    </div>
  </div>
)}
```

### 4. Card de Produto
```typescript
<div
  key={produto.id}
  className={`${
    config.modo_escuro ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  } border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow`}
>
  <div className="flex gap-4">
    {config.mostrar_fotos && produto.foto_url && (
      <div className="flex-shrink-0">
        <img
          src={produto.foto_url}
          alt={produto.nome}
          className="w-20 h-20 object-cover rounded-lg"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
    )}
    <div className="flex-1">
      <h3 className="text-lg font-semibold mb-1">{produto.nome}</h3>
      {produto.descricao && (
        <p className={`text-sm mb-2 ${config.modo_escuro ? 'text-gray-400' : 'text-gray-600'}`}>
          {produto.descricao}
        </p>
      )}
      <div className="flex items-center justify-between">
        {config.mostrar_precos && (
          <span className="text-lg font-bold text-green-600">
            {formatarPreco(produto.preco)}
          </span>
        )}
        {config.permitir_pedidos && empresa?.whatsapp && (
          <button
            onClick={() => handlePedirWhatsApp(produto)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <span>💬</span>
            Pedir via WhatsApp
          </button>
        )}
      </div>
    </div>
  </div>
</div>
```

---

## 📱 QR CODE E WHATSAPP

### 1. Geração de QR Code
```typescript
import QRCode from 'qrcode';

const generateQRCode = async (url: string) => {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(url, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    setQrCodeDataUrl(qrCodeDataUrl);
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error);
  }
};

// Uso
useEffect(() => {
  if (cardapioUrlPersonalizada.trim()) {
    const url = `https://nexo.emasoftware.app/cardapio/${cardapioUrlPersonalizada}`;
    generateQRCode(url);
  }
}, [cardapioUrlPersonalizada]);
```

### 2. Interface do QR Code
```typescript
<div className="w-32 h-32 bg-white rounded-lg flex items-center justify-center p-2">
  {qrCodeDataUrl ? (
    <img 
      src={qrCodeDataUrl} 
      alt="QR Code do Cardápio" 
      className="w-full h-full object-contain"
    />
  ) : (
    <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
      <span className="text-gray-500 text-xs text-center">
        Salve a URL<br/>para gerar<br/>QR Code
      </span>
    </div>
  )}
</div>
```

### 3. Botões de Ação do QR Code
```typescript
// Download
<button 
  onClick={() => {
    if (qrCodeDataUrl) {
      const link = document.createElement('a');
      link.download = `qrcode-cardapio-${cardapioUrlPersonalizada || 'loja'}.png`;
      link.href = qrCodeDataUrl;
      link.click();
    }
  }}
  disabled={!qrCodeDataUrl}
  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
>
  Baixar QR Code
</button>

// Impressão
<button 
  onClick={() => {
    if (qrCodeDataUrl) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head><title>QR Code - Cardápio Digital</title></head>
            <body style="margin: 0; padding: 20px; text-align: center;">
              <h2>Cardápio Digital</h2>
              <p>Escaneie o QR Code para acessar nosso cardápio</p>
              <img src="${qrCodeDataUrl}" style="max-width: 300px; margin: 20px 0;" />
              <p style="font-size: 12px; color: #666;">
                https://nexo.emasoftware.app/cardapio/${cardapioUrlPersonalizada || 'sua-loja'}
              </p>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  }}
  disabled={!qrCodeDataUrl}
  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
>
  Imprimir
</button>
```

### 4. Integração WhatsApp
```typescript
const handlePedirWhatsApp = (produto: Produto) => {
  if (!empresa?.whatsapp) {
    showMessage('error', 'WhatsApp da empresa não disponível');
    return;
  }

  const whatsapp = empresa.whatsapp.replace(/\D/g, '');
  const mensagem = `Olá! Gostaria de fazer um pedido:\n\n*${produto.nome}*\n${config.mostrar_precos ? `Preço: ${formatarPreco(produto.preco)}` : ''}`;
  const url = `https://wa.me/55${whatsapp}?text=${encodeURIComponent(mensagem)}`;
  window.open(url, '_blank');
};

const formatarPreco = (preco: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(preco);
};
```

---

## ⚙️ CONFIGURAÇÕES DO PDV

### 1. Campo Modo Escuro (CORRETO)
```typescript
<label className="flex items-start p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors">
  <input
    type="checkbox"
    checked={pdvConfig.modo_escuro_cardapio}
    onChange={(e) => handlePdvConfigChange('modo_escuro_cardapio', e.target.checked)}
    className="w-5 h-5 text-primary-500 bg-gray-800 border-gray-600 rounded-full focus:ring-primary-500 focus:ring-2 mt-0.5 mr-3"
    style={{ borderRadius: '50%' }}
  />
  <div>
    <h5 className="text-white font-medium">Modo Escuro</h5>
    <p className="text-sm text-gray-400 mt-1">
      Aplica tema escuro no cardápio digital.
    </p>
  </div>
</label>
```

### 2. Campo URL Personalizada com Validação
```typescript
<div className="bg-gray-900/50 p-3 rounded border border-gray-600">
  <div className="flex items-center gap-2 text-sm">
    <span className="text-gray-400">https://nexo.emasoftware.app/cardapio/</span>
    <input
      type="text"
      value={cardapioUrlPersonalizada}
      onChange={(e) => setCardapioUrlPersonalizada(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
      placeholder="nome-da-sua-loja"
      className="flex-1 bg-transparent text-purple-300 border-none outline-none placeholder-gray-500"
      maxLength={50}
    />
    {verificandoUrl && (
      <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin"></div>
    )}
    {!verificandoUrl && urlDisponivel === true && cardapioUrlPersonalizada.trim() && (
      <div className="flex items-center gap-1 text-green-500">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-xs">Disponível</span>
      </div>
    )}
    {!verificandoUrl && urlDisponivel === false && cardapioUrlPersonalizada.trim() && (
      <div className="flex items-center gap-1 text-red-500">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        <span className="text-xs">Indisponível</span>
      </div>
    )}
  </div>
</div>
```

### 3. Função de Salvamento com Validação
```typescript
const handleSalvarCardapioUrl = async () => {
  try {
    setIsLoading(true);

    // Validar se o campo não está vazio
    if (!cardapioUrlPersonalizada.trim()) {
      showMessage('error', 'Digite um nome para a URL do cardápio');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Obter empresa_id do usuário
    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', user.id)
      .single();

    if (!usuarioData?.empresa_id) {
      throw new Error('Empresa não encontrada');
    }

    // Verificar se já existe outra empresa usando essa URL personalizada
    const { data: urlExistente, error: urlError } = await supabase
      .from('pdv_config')
      .select('empresa_id, cardapio_url_personalizada')
      .eq('cardapio_url_personalizada', cardapioUrlPersonalizada.trim())
      .neq('empresa_id', usuarioData.empresa_id); // Excluir a própria empresa

    if (urlError && urlError.code !== 'PGRST116') { // PGRST116 = no rows returned (que é o que queremos)
      console.error('Erro ao verificar URL:', urlError);
      throw new Error('Erro ao verificar disponibilidade da URL');
    }

    if (urlExistente && urlExistente.length > 0) {
      showMessage('error', `O nome "${cardapioUrlPersonalizada}" já está sendo usado por outra empresa. Escolha um nome diferente.`);
      return;
    }

    // Verificar se já existe uma configuração para esta empresa
    const { data: existingConfig } = await supabase
      .from('pdv_config')
      .select('id')
      .eq('empresa_id', usuarioData.empresa_id)
      .single();

    if (existingConfig) {
      const { error } = await supabase
        .from('pdv_config')
        .update({ cardapio_url_personalizada: cardapioUrlPersonalizada.trim() })
        .eq('empresa_id', usuarioData.empresa_id);

      if (error) throw error;
    } else {
      const configData = {
        empresa_id: usuarioData.empresa_id,
        ...pdvConfig,
        cardapio_url_personalizada: cardapioUrlPersonalizada.trim()
      };

      const { error } = await supabase
        .from('pdv_config')
        .insert([configData]);

      if (error) throw error;
    }

    // Atualizar o estado local
    setPdvConfig(prev => ({ ...prev, cardapio_url_personalizada: cardapioUrlPersonalizada.trim() }));

    // Gerar QR Code com a nova URL
    const url = `https://nexo.emasoftware.app/cardapio/${cardapioUrlPersonalizada.trim()}`;
    await generateQRCode(url);

    showMessage('success', 'URL do cardápio salva com sucesso!');

  } catch (error: any) {
    console.error('Erro ao salvar URL do cardápio:', error);
    showMessage('error', 'Erro ao salvar URL do cardápio: ' + error.message);
  } finally {
    setIsLoading(false);
  }
};
```

---

## 🔄 HOOKS E EFEITOS

### 1. Debounce para Validação de URL
```typescript
// Verificar disponibilidade da URL com debounce
useEffect(() => {
  const timeoutId = setTimeout(() => {
    if (cardapioUrlPersonalizada.trim()) {
      verificarDisponibilidadeUrl(cardapioUrlPersonalizada);
    }
  }, 500); // Aguarda 500ms após parar de digitar

  return () => clearTimeout(timeoutId);
}, [cardapioUrlPersonalizada]);
```

### 2. Carregamento Inicial
```typescript
useEffect(() => {
  if (slug) {
    carregarDadosCardapio();
  }
}, [slug]);
```

### 3. Geração Automática de QR Code
```typescript
useEffect(() => {
  if (cardapioUrlPersonalizada.trim()) {
    const url = `https://nexo.emasoftware.app/cardapio/${cardapioUrlPersonalizada}`;
    generateQRCode(url);
  }
}, [cardapioUrlPersonalizada]);
```

---

**📅 Última atualização**: 03/07/2025  
**👨‍💻 Exemplos por**: Augment Agent  
**🎯 Objetivo**: Facilitar implementações futuras com código testado e funcional
