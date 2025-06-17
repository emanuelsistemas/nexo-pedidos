# Exemplos Práticos - Sistema de Múltiplos Tipos de Usuário

## 🎯 Casos de Uso Reais Implementados

### 1. **Gerente de Loja**
**Tipos:** Admin + Vendedor + Caixa

**Funcionalidades:**
- ✅ Acesso total às configurações (Admin)
- ✅ Aparece na lista de vendedores do PDV (Vendedor)
- ✅ Configuração de comissão habilitada (Vendedor)
- ✅ Pode operar caixa e PDV (Caixa)

**Dados no Banco:**
```json
{
  "tipo_user_config_id": [
    "uuid-admin",
    "uuid-vendedor", 
    "uuid-caixa"
  ]
}
```

### 2. **Supervisor de Vendas**
**Tipos:** Vendedor + Caixa

**Funcionalidades:**
- ✅ Aparece na lista de vendedores (Vendedor)
- ✅ Configuração de comissão (Vendedor)
- ✅ Acesso ao PDV (Caixa)
- ❌ Sem acesso às configurações administrativas

**Dados no Banco:**
```json
{
  "tipo_user_config_id": [
    "uuid-vendedor",
    "uuid-caixa"
  ]
}
```

### 3. **Funcionário Simples**
**Tipos:** User apenas

**Funcionalidades:**
- ✅ Dashboard mobile (/user/dashboard)
- ✅ Acesso limitado às próprias informações
- ❌ Não aparece na lista de vendedores
- ❌ Sem configuração de comissão

**Dados no Banco:**
```json
{
  "tipo_user_config_id": [
    "uuid-user"
  ]
}
```

## 🔧 Exemplos de Código Implementados

### 1. **Verificação de Permissões**

```typescript
// Verificar se usuário pode acessar configurações
const podeAcessarConfiguracoes = async (usuarioId: string) => {
  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('tipo_user_config_id')
    .eq('id', usuarioId)
    .single();

  if (!usuarioData?.tipo_user_config_id?.length) return false;

  const { data: tiposData } = await supabase
    .from('tipo_user_config')
    .select('tipo')
    .in('id', usuarioData.tipo_user_config_id);

  // Se tem tipo admin, pode acessar
  return tiposData?.some(t => t.tipo === 'admin') || false;
};
```

### 2. **Filtrar Vendedores para PDV**

```typescript
// Buscar usuários que podem ser vendedores
const buscarVendedores = async (empresaId: string) => {
  // 1. Buscar ID do tipo vendedor
  const { data: tipoVendedor } = await supabase
    .from('tipo_user_config')
    .select('id')
    .eq('tipo', 'vendedor')
    .single();

  if (!tipoVendedor) return [];

  // 2. Buscar usuários da empresa
  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('id, nome, email, tipo_user_config_id')
    .eq('empresa_id', empresaId);

  // 3. Filtrar quem tem tipo vendedor
  return usuarios?.filter(usuario => {
    if (!Array.isArray(usuario.tipo_user_config_id)) return false;
    return usuario.tipo_user_config_id.includes(tipoVendedor.id);
  }) || [];
};
```

### 3. **Redirecionamento no Login**

```typescript
// Determinar para onde redirecionar após login
const determinarRedirecionamento = async (usuarioId: string) => {
  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('tipo_user_config_id')
    .eq('id', usuarioId)
    .single();

  if (!usuarioData?.tipo_user_config_id?.length) {
    return '/user/dashboard'; // Sem tipos = user básico
  }

  const { data: tiposData } = await supabase
    .from('tipo_user_config')
    .select('tipo')
    .in('id', usuarioData.tipo_user_config_id);

  // Se só tem tipo "user", vai para mobile
  const isUserOnly = tiposData?.length === 1 && tiposData[0].tipo === 'user';
  
  return isUserOnly ? '/user/dashboard' : '/dashboard';
};
```

### 4. **Configuração de Comissão Condicional**

```typescript
// Mostrar campos de comissão apenas se for vendedor
const FormularioUsuario = () => {
  const [usuarioForm, setUsuarioForm] = useState({
    tipo_user_config_id: [] as string[],
    // ... outros campos
  });

  // Verificar se tem tipo vendedor selecionado
  const temTipoVendedor = useMemo(() => {
    return usuarioForm.tipo_user_config_id.some(tipoId => {
      const tipo = tiposUsuario.find(t => t.id === tipoId);
      return tipo?.tipo === 'vendedor';
    });
  }, [usuarioForm.tipo_user_config_id, tiposUsuario]);

  return (
    <div>
      <MultiSelect
        label="Tipos de Usuário"
        value={usuarioForm.tipo_user_config_id}
        onChange={(tipos) => setUsuarioForm(prev => ({ 
          ...prev, 
          tipo_user_config_id: tipos 
        }))}
        options={tiposUsuario.map(tipo => ({
          value: tipo.id,
          label: `${tipo.tipo} - ${tipo.descricao}`
        }))}
      />

      {/* Campos de comissão aparecem apenas se for vendedor */}
      {temTipoVendedor && (
        <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
          <h3>Configuração de Comissão</h3>
          {/* Campos de comissão aqui */}
        </div>
      )}
    </div>
  );
};
```

### 5. **Listagem com Múltiplos Tipos**

```typescript
// Componente para exibir tipos do usuário
const TiposUsuario = ({ usuario, tiposDisponiveis }) => {
  const tipos = Array.isArray(usuario.tipo_user_config_id) 
    ? usuario.tipo_user_config_id 
    : [usuario.tipo_user_config_id].filter(Boolean);

  return (
    <div className="flex flex-wrap gap-2">
      {tipos.map(tipoId => {
        const tipo = tiposDisponiveis.find(t => t.id === tipoId);
        if (!tipo) return null;

        return (
          <span 
            key={tipoId}
            className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400"
          >
            {tipo.tipo.charAt(0).toUpperCase() + tipo.tipo.slice(1)}
          </span>
        );
      })}
    </div>
  );
};
```

## 🎯 Fluxos de Trabalho Implementados

### 1. **Criação de Usuário**

```
1. Admin acessa Configurações → Usuários
2. Clica "Novo Usuário"
3. Preenche dados básicos (nome, email, senha)
4. Seleciona múltiplos tipos no MultiSelect:
   - Admin ✓
   - Vendedor ✓
   - Caixa ✓
5. Se selecionou Vendedor → campos de comissão aparecem
6. Configura comissão (tipo e percentual)
7. Salva usuário
8. Sistema cria registro com array de tipos
```

### 2. **Login e Redirecionamento**

```
1. Usuário faz login
2. Sistema busca tipos do usuário
3. Verifica tipos:
   - Só "user" → /user/dashboard (mobile)
   - Tem outros tipos → /dashboard (desktop)
4. Carrega interface apropriada
5. Aplica permissões baseadas nos tipos
```

### 3. **Seleção de Vendedor no PDV**

```
1. PDV carrega → verifica configuração de vendedor
2. Se habilitado → busca usuários com tipo "vendedor"
3. Filtra array de tipos de cada usuário
4. Monta lista de vendedores disponíveis
5. Usuário seleciona vendedor
6. Itens ficam associados ao vendedor selecionado
```

### 4. **Importação de Pedido com Vendedor**

```
1. Pedido importado no PDV
2. Sistema identifica vendedor do pedido
3. Se configuração de vendedor habilitada:
   - Seleciona vendedor automaticamente
   - Itens importados ficam com vendedor
   - Próximos itens usam mesmo vendedor
4. Usuário pode trocar vendedor se necessário
```

## 🔍 Cenários de Teste Implementados

### 1. **Teste de Múltiplos Tipos**
```
Usuário: João Silva
Tipos: [Admin, Vendedor]
Resultado Esperado:
- ✅ Acessa configurações (Admin)
- ✅ Aparece na lista de vendedores (Vendedor)
- ✅ Tem configuração de comissão (Vendedor)
- ✅ Dashboard desktop (não é user-only)
```

### 2. **Teste de Usuário Simples**
```
Usuário: Maria Santos
Tipos: [User]
Resultado Esperado:
- ❌ Não acessa configurações
- ❌ Não aparece na lista de vendedores
- ❌ Sem configuração de comissão
- ✅ Dashboard mobile (user-only)
```

### 3. **Teste de Compatibilidade**
```
Usuário Antigo: Pedro Costa
Tipos: "uuid-admin" (string única)
Resultado Esperado:
- ✅ Sistema converte para ["uuid-admin"]
- ✅ Funciona normalmente
- ✅ Interface mostra tipo Admin
- ✅ Permissões funcionam
```

## 🎯 Validações Implementadas

### 1. **Validação de Formulário**
- ✅ Pelo menos um tipo deve ser selecionado
- ✅ Se selecionou Vendedor → comissão obrigatória
- ✅ Percentual de comissão > 0 se habilitado

### 2. **Validação de Dados**
- ✅ Array não pode estar vazio
- ✅ IDs devem existir na tabela tipo_user_config
- ✅ Compatibilidade com formato antigo

### 3. **Validação de Permissões**
- ✅ Apenas Admin pode criar/editar usuários
- ✅ User só vê próprios dados
- ✅ Vendedor aparece apenas se tem tipo correto

## 🏆 Resultados Alcançados

### 1. **Flexibilidade Total**
- ✅ Um usuário pode ter múltiplos papéis
- ✅ Combinações livres de tipos
- ✅ Permissões granulares

### 2. **Compatibilidade**
- ✅ Dados antigos funcionam
- ✅ Migração automática
- ✅ Sem quebra de funcionalidades

### 3. **Interface Intuitiva**
- ✅ MultiSelect fácil de usar
- ✅ Chips visuais para tipos
- ✅ Busca e filtros

### 4. **Performance**
- ✅ Consultas otimizadas
- ✅ Sem JOINs desnecessários
- ✅ Cache de tipos quando possível

**🎯 O sistema agora oferece máxima flexibilidade na gestão de usuários, mantendo simplicidade de uso e total compatibilidade com dados existentes.**
