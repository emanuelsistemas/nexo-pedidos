# Desafios e Soluções - Nexo Pedidos

## Visão Geral

Durante o desenvolvimento do sistema Nexo Pedidos, enfrentamos diversos desafios técnicos e de implementação. Este documento detalha os principais desafios encontrados e as soluções implementadas, servindo como referência para o desenvolvimento futuro.

## 1. Políticas de Segurança RLS no Supabase

### Desafio

O Supabase utiliza Row Level Security (RLS) para controlar o acesso aos dados. Durante o desenvolvimento, enfrentamos erros como "new row violates row-level security policy" ao tentar inserir registros em tabelas protegidas por RLS.

### Solução

1. **Adição de campo empresa_id**:
   - Adicionamos o campo `empresa_id` em todas as tabelas relevantes, incluindo `produto_fotos`
   - Garantimos que este campo seja preenchido em todas as operações de inserção

2. **Estrutura de inserção consistente**:
   - Criamos um padrão para objetos de inserção, sempre incluindo `empresa_id`
   - Implementamos verificações para garantir que o usuário esteja autenticado antes de operações de escrita

3. **Exemplo de código implementado**:
```typescript
// Exemplo de inserção com campos necessários para RLS
const fotoObj = {
  produto_id: editingProduto.id,
  url: urlData.publicUrl,
  storage_path: filePath,
  principal: isPrincipal,
  empresa_id: usuarioData.empresa_id,
  deletado: false
};

const { data, error } = await supabase
  .from('produto_fotos')
  .insert(fotoObj)
  .select()
  .single();
```

## 2. Estrutura da Tabela produto_fotos

### Desafio

Enfrentamos o erro "Could not find the 'created_by' column of 'produto_fotos' in the schema cache" ao tentar inserir dados na tabela `produto_fotos`. Isso ocorreu porque estávamos tentando incluir campos que não existiam na estrutura da tabela.

### Solução

1. **Remoção de campos inexistentes**:
   - Removemos os campos `created_by` e `created_at` do objeto de inserção
   - Mantivemos apenas os campos que existem na tabela: `produto_id`, `url`, `storage_path`, `principal`, `empresa_id`, `deletado`

2. **Documentação da estrutura**:
   - Documentamos claramente a estrutura da tabela para evitar erros futuros
   - Criamos um padrão para verificar a estrutura das tabelas antes de implementar novas funcionalidades

3. **Exemplo de código corrigido**:
```typescript
// Objeto de inserção com apenas os campos existentes na tabela
const fotoObj = {
  produto_id: editingProduto.id,
  url: urlData.publicUrl,
  storage_path: filePath,
  principal: isPrincipal,
  empresa_id: usuarioData.empresa_id,
  deletado: false
};
```

## 3. Atualização da Interface após Upload de Fotos

### Desafio

A interface não atualizava automaticamente após o upload de fotos, exigindo que o usuário atualizasse manualmente a página para ver as novas fotos ou alterações nas fotos existentes.

### Solução

1. **Atualização imediata da lista de fotos**:
   - Implementamos código para atualizar a lista de fotos após o upload
   - Utilizamos o padrão de atualização de estado do React para refletir as mudanças imediatamente

2. **Atualização da foto principal na listagem**:
   - Criamos lógica para atualizar a lista de fotos principais após o upload ou alteração
   - Implementamos um mecanismo para forçar a renderização dos componentes afetados

3. **Código implementado para atualização automática**:
```typescript
// Atualizar a lista de fotos
setProdutoFotos(prev => [...prev, fotoData]);

// Se for a foto principal, atualizar também a lista de fotos principais
if (isPrincipal && editingProduto) {
  // Atualizar imediatamente a foto principal na lista
  setProdutosFotosPrincipais(prev => ({
    ...prev,
    [editingProduto.id]: fotoData
  }));
  
  // Forçar a atualização da lista de grupos para refletir a nova foto
  const grupoAtual = grupos.find(g => g.id === editingProduto.grupo_id);
  if (grupoAtual) {
    const gruposAtualizados = grupos.map(g => {
      if (g.id === grupoAtual.id) {
        // Atualizar o produto com a nova foto
        const produtosAtualizados = g.produtos.map(p => {
          if (p.id === editingProduto.id) {
            return { ...p }; // Força a atualização do produto
          }
          return p;
        });
        return { ...g, produtos: produtosAtualizados };
      }
      return g;
    });
    
    // Atualizar os grupos para forçar a renderização
    setGrupos([...gruposAtualizados]);
  }
}
```

## 4. Múltiplos Telefones para Clientes

### Desafio

Implementar suporte a múltiplos telefones para clientes, com diferentes tipos (fixo/celular) e indicador de WhatsApp, mantendo uma interface amigável para adicionar, editar e remover telefones.

### Solução

1. **Criação de tabela específica**:
   - Criamos a tabela `cliente_telefones` para armazenar múltiplos telefones
   - Definimos campos para tipo de telefone e indicador de WhatsApp

2. **Interface dinâmica para gerenciamento**:
   - Implementamos uma interface que permite adicionar, editar e remover telefones
   - Criamos máscaras específicas para cada tipo de telefone
   - Adicionamos validação para garantir números corretos

3. **Exemplo de implementação**:
```typescript
// Componente para gerenciar múltiplos telefones
const TelefonesForm = ({ telefones, onChange }) => {
  const addTelefone = () => {
    onChange([...telefones, { numero: '', tipo: 'celular', whatsapp: false }]);
  };

  const removeTelefone = (index) => {
    const novosTelefones = [...telefones];
    novosTelefones.splice(index, 1);
    onChange(novosTelefones);
  };

  const updateTelefone = (index, field, value) => {
    const novosTelefones = [...telefones];
    novosTelefones[index] = { ...novosTelefones[index], [field]: value };
    onChange(novosTelefones);
  };

  return (
    <div>
      {telefones.map((telefone, index) => (
        <div key={index} className="flex gap-2 mb-2">
          <select
            value={telefone.tipo}
            onChange={(e) => updateTelefone(index, 'tipo', e.target.value)}
          >
            <option value="celular">Celular</option>
            <option value="fixo">Fixo</option>
          </select>
          <input
            type="text"
            value={telefone.numero}
            onChange={(e) => updateTelefone(index, 'numero', e.target.value)}
            placeholder={telefone.tipo === 'celular' ? '(00) 00000-0000' : '(00) 0000-0000'}
          />
          {telefone.tipo === 'celular' && (
            <input
              type="checkbox"
              checked={telefone.whatsapp}
              onChange={(e) => updateTelefone(index, 'whatsapp', e.target.checked)}
            />
          )}
          <button type="button" onClick={() => removeTelefone(index)}>
            Remover
          </button>
        </div>
      ))}
      <button type="button" onClick={addTelefone}>
        Adicionar Telefone
      </button>
    </div>
  );
};
```

## 5. Visualização de Fotos em Galeria

### Desafio

Implementar uma visualização em galeria/carrossel para as fotos dos produtos, permitindo que o usuário navegue entre as fotos e visualize-as em tamanho maior.

### Solução

1. **Componente de galeria reutilizável**:
   - Criamos o componente `FotoGaleria` para exibir fotos em tamanho expandido
   - Implementamos navegação com botões e teclado
   - Adicionamos animações suaves para transições

2. **Integração com a listagem de produtos**:
   - Tornamos as fotos na listagem clicáveis para abrir a galeria
   - Implementamos a exibição da foto principal na listagem de produtos

3. **Exemplo do componente implementado**:
```typescript
const FotoGaleria: React.FC<FotoGaleriaProps> = ({
  fotos,
  isOpen,
  onClose,
  initialFotoIndex = 0
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialFotoIndex);
  
  useEffect(() => {
    setCurrentIndex(initialFotoIndex);
  }, [fotos, initialFotoIndex]);
  
  if (!isOpen || fotos.length === 0) return null;
  
  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % fotos.length);
  };
  
  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + fotos.length) % fotos.length);
  };
  
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <button className="absolute top-4 right-4 text-white" onClick={onClose}>
        <X size={24} />
      </button>
      
      <div className="relative w-full max-w-4xl max-h-[80vh]">
        <img
          src={fotos[currentIndex].url}
          alt="Foto do produto"
          className="max-h-[80vh] max-w-full object-contain"
        />
        
        {fotos.length > 1 && (
          <>
            <button className="absolute left-4 text-white" onClick={handlePrev}>
              <ChevronLeft size={24} />
            </button>
            <button className="absolute right-4 text-white" onClick={handleNext}>
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
```

## 6. Diferenciação de Usuários (admin/user)

### Desafio

Implementar diferentes níveis de acesso e interfaces para usuários do tipo 'admin' e 'user', com limitações específicas para usuários 'user'.

### Solução

1. **Verificação de tipo de usuário**:
   - Implementamos verificações para determinar o tipo de usuário após o login
   - Redirecionamos para a interface apropriada com base no tipo

2. **Limitações para usuários 'user'**:
   - Ocultamos o botão 'Adicionar Usuário'
   - Limitamos a visualização de usuários apenas ao próprio usuário
   - Ocultamos o botão 'Editar Dados' na aba Dados da Empresa

3. **Interface mobile específica**:
   - Criamos uma interface mobile-friendly para usuários 'user'
   - Implementamos um menu de navegação no footer
   - Adaptamos todas as funcionalidades para uso em dispositivos móveis

## 7. Animações de Carregamento (Skeleton Screens)

### Desafio

Implementar animações de carregamento que simulem o carregamento progressivo de cards, em vez de animações de loading centralizadas na tela.

### Solução

1. **Skeleton screens**:
   - Criamos componentes de skeleton para cada tipo de card
   - Implementamos animações de pulse para simular o carregamento
   - Mantivemos a consistência visual com os cards reais

2. **Estados de carregamento**:
   - Utilizamos estados para controlar a exibição dos skeletons
   - Implementamos transições suaves entre estados de carregamento e dados reais

3. **Exemplo de implementação**:
```typescript
// Renderizar skeleton loader para os cards de produtos
const renderSkeletonCards = () => {
  return Array(6).fill(0).map((_, index) => (
    <div key={index} className="bg-background-card rounded-lg overflow-hidden border border-gray-800">
      <div className="h-32 bg-gray-800 animate-pulse"></div>
      <div className="p-3 space-y-2">
        <div className="h-5 w-3/4 bg-gray-700 rounded animate-pulse"></div>
        <div className="h-4 w-1/3 bg-gray-700 rounded animate-pulse"></div>
        <div className="h-3 w-2/3 bg-gray-700 rounded animate-pulse"></div>
      </div>
    </div>
  ));
};

// Uso no componente
return (
  <div>
    {isLoading ? (
      <div className="grid grid-cols-2 gap-4">
        {renderSkeletonCards()}
      </div>
    ) : (
      // Renderização dos dados reais
    )}
  </div>
);
```

## Conclusão

Os desafios enfrentados durante o desenvolvimento do Nexo Pedidos foram superados com soluções técnicas eficientes e boas práticas de programação. A documentação dessas soluções serve como referência valiosa para o desenvolvimento futuro, permitindo que novos desenvolvedores compreendam as decisões tomadas e evitem problemas semelhantes.

As principais lições aprendidas incluem:

1. A importância de entender completamente a estrutura do banco de dados antes de implementar novas funcionalidades
2. A necessidade de considerar as políticas de segurança RLS ao trabalhar com o Supabase
3. A eficácia de implementar atualizações automáticas da interface para melhorar a experiência do usuário
4. O valor de componentes reutilizáveis e bem documentados para acelerar o desenvolvimento

Estas soluções não apenas resolveram os problemas imediatos, mas também estabeleceram padrões e práticas que beneficiarão o desenvolvimento contínuo do sistema.
