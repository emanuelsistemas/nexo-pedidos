# Sistema de Tabelas de Preços - Cardápio Digital

## 📋 **VISÃO GERAL**

Implementação do sistema de tabelas de preços no cardápio digital, permitindo que produtos tenham múltiplos preços organizados em tabelas horizontais com scroll usando Keen Slider. O sistema oculta automaticamente o preço padrão quando há tabelas de preços configuradas.

## 🎯 **FUNCIONALIDADES IMPLEMENTADAS**

### **1. Carregamento Automático de Configurações**
- **Verificação**: Sistema verifica se a empresa trabalha com tabelas de preços
- **Carregamento**: Busca tabelas ativas da empresa automaticamente
- **Preços**: Carrega preços dos produtos para cada tabela (apenas valores > 0)

### **2. Interface Visual com Keen Slider**
- **Layout Responsivo**: Até 3 tabelas = layout fixo, mais de 3 = slider horizontal
- **Scroll Suave**: Implementado com Keen Slider seguindo documentação oficial
- **Indicadores**: Dots de navegação quando necessário
- **Tema Dinâmico**: Suporte a modo claro/escuro

### **3. Lógica de Exibição Inteligente**
- **Filtro por Valor**: Apenas tabelas com preço > 0 são exibidas
- **Ocultação do Preço Padrão**: Preço original é ocultado quando há tabelas
- **Posicionamento**: Tabelas aparecem após descrição e antes dos adicionais

## 🔧 **IMPLEMENTAÇÃO TÉCNICA**

### **Estados Adicionados**
```typescript
// Estados para tabelas de preços
const [trabalhaComTabelaPrecos, setTrabalhaComTabelaPrecos] = useState(false);
const [tabelasPrecos, setTabelasPrecos] = useState<Array<{id: string; nome: string}>>([]);
const [produtoPrecos, setProdutoPrecos] = useState<{[produtoId: string]: {[tabelaId: string]: number}}>({});
```

### **Carregamento de Dados**
```typescript
// 1. Verificar configuração da empresa
const { data: tabelaPrecoConfig } = await supabase
  .from('tabela_preco_config')
  .select('trabalha_com_tabela_precos')
  .eq('empresa_id', empresaId)
  .single();

// 2. Carregar tabelas ativas
const { data: tabelasData } = await supabase
  .from('tabela_de_preco')
  .select('id, nome')
  .eq('empresa_id', empresaId)
  .eq('ativo', true)
  .eq('deletado', false);

// 3. Carregar preços dos produtos
const { data: precosData } = await supabase
  .from('produto_precos')
  .select('produto_id, tabela_preco_id, preco')
  .eq('empresa_id', empresaId)
  .gt('preco', 0); // Apenas preços > 0
```

### **Função de Filtro**
```typescript
const obterTabelasComPrecos = (produtoId: string): Array<{id: string; nome: string; preco: number}> => {
  if (!trabalhaComTabelaPrecos || !produtoPrecos[produtoId]) {
    return [];
  }

  return tabelasPrecos
    .map(tabela => ({
      id: tabela.id,
      nome: tabela.nome,
      preco: produtoPrecos[produtoId][tabela.id] || 0
    }))
    .filter(tabela => tabela.preco > 0); // Apenas tabelas com preço > 0
};
```

## 🎨 **COMPONENTE KEEN SLIDER**

### **TabelasPrecosSlider**
```typescript
const TabelasPrecosSlider: React.FC<TabelasPrecosSliderProps> = ({ tabelas, config, formatarPreco }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);
  
  const [sliderRef, instanceRef] = useKeenSlider({
    initial: 0,
    slides: {
      perView: 3,
      spacing: 8,
    },
    slideChanged(slider) {
      setCurrentSlide(slider.track.details.rel);
    },
    created() {
      setLoaded(true);
    },
  });

  return (
    <div className="relative">
      <div ref={sliderRef} className="keen-slider">
        {tabelas.map((tabela) => (
          <div key={tabela.id} className="keen-slider__slide">
            <div className="p-2 rounded-lg border">
              <div className="text-xs font-medium truncate">{tabela.nome}</div>
              <div className="text-sm font-bold text-green-600">
                {formatarPreco(tabela.preco)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Indicadores */}
      {loaded && instanceRef.current && tabelas.length > 3 && (
        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-1">
          {Array.from({ length: Math.ceil(tabelas.length / 3) }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => instanceRef.current?.moveToIdx(idx)}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                currentSlide === idx ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
```

## 📱 **INTERFACE VISUAL**

### **Layout das Tabelas**
```jsx
{/* Tabelas de Preços - largura total do card */}
{(() => {
  const tabelasComPrecos = obterTabelasComPrecos(produto.id);
  if (tabelasComPrecos.length > 0) {
    return (
      <div className="mb-3 w-full">
        {/* Divisória acima das tabelas */}
        <div className="border-t border-gray-300 mb-2"></div>
        
        {/* Título das tabelas */}
        <div className="text-xs font-medium mb-2 text-gray-500">
          Tabelas de Preços:
        </div>

        {/* Slider horizontal das tabelas */}
        <div className="relative">
          {tabelasComPrecos.length <= 3 ? (
            // Layout fixo para até 3 tabelas
            <div className="flex gap-2 w-full">
              {tabelasComPrecos.map(tabela => (
                <div key={tabela.id} className="flex-1 p-2 rounded-lg border">
                  <div className="text-xs font-medium truncate">{tabela.nome}</div>
                  <div className="text-sm font-bold text-green-600">
                    {formatarPreco(tabela.preco)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Keen Slider para mais de 3 tabelas
            <TabelasPrecosSlider 
              tabelas={tabelasComPrecos}
              config={config}
              formatarPreco={formatarPreco}
            />
          )}
        </div>
      </div>
    );
  }
  return null;
})()}
```

### **Ocultação do Preço Padrão**
```jsx
{/* Preço padrão - só exibe se não há tabelas de preços */}
{config.mostrar_precos && obterTabelasComPrecos(produto.id).length === 0 && (
  <div className="text-2xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
    {formatarPreco(produto.preco)}
  </div>
)}
```

## 🎯 **COMPORTAMENTO DO SISTEMA**

### **Cenários de Exibição**

**1. Empresa NÃO trabalha com tabelas de preços:**
- ✅ Exibe preço padrão normalmente
- ❌ Não carrega tabelas
- ❌ Não exibe seção de tabelas

**2. Empresa trabalha com tabelas, mas produto NÃO tem preços configurados:**
- ✅ Exibe preço padrão normalmente
- ❌ Não exibe seção de tabelas

**3. Empresa trabalha com tabelas e produto TEM preços configurados:**
- ❌ Oculta preço padrão
- ✅ Exibe seção de tabelas de preços
- ✅ Mostra apenas tabelas com valor > 0

### **Layout Responsivo**

**Até 3 tabelas:**
```
[Tabela 1] [Tabela 2] [Tabela 3]
```

**Mais de 3 tabelas:**
```
[Tabela 1] [Tabela 2] [Tabela 3] → ••• (scroll horizontal)
                                    ○●○ (indicadores)
```

## 🚀 **BENEFÍCIOS IMPLEMENTADOS**

### **Para o Cliente**
- 🎯 **Clareza de preços**: Vê diferentes opções de preço claramente
- 📱 **Interface intuitiva**: Scroll horizontal familiar
- 🎨 **Visual limpo**: Tabelas organizadas e bem apresentadas
- 🔄 **Navegação fácil**: Indicadores visuais para orientação

### **Para o Estabelecimento**
- 💰 **Flexibilidade de preços**: Múltiplas tabelas por produto
- 🎯 **Controle total**: Apenas tabelas com preços aparecem
- 📊 **Organização**: Preços organizados por categoria/tipo
- 🔧 **Configuração simples**: Sistema automático baseado na configuração

### **Para o Sistema**
- ⚡ **Performance otimizada**: Carrega apenas dados necessários
- 🛡️ **Dados consistentes**: Filtra apenas preços válidos (> 0)
- 🔄 **Integração perfeita**: Usa mesma estrutura do PDV
- 📱 **Responsivo**: Adapta layout conforme quantidade de tabelas

## 🔮 **PRÓXIMAS MELHORIAS**

- **Seleção de tabela**: Permitir cliente escolher tabela de preço
- **Destaque de promoções**: Destacar tabelas com desconto
- **Ordenação inteligente**: Ordenar por preço ou popularidade
- **Cache de preços**: Otimizar carregamento com cache local
- **Analytics**: Tracking de qual tabela é mais visualizada
