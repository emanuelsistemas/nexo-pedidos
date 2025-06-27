# Detalhes Técnicos - Sistema de Múltiplos Tipos de Usuário

## 🔧 Implementação Técnica Detalhada

### 1. **Alteração do Schema do Banco**

**Comando SQL Executado:**
```sql
-- Verificar constraints existentes
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'usuarios' 
AND constraint_type = 'FOREIGN KEY';

-- Remover a constraint de foreign key
ALTER TABLE usuarios 
DROP CONSTRAINT IF EXISTS usuarios_tipo_user_config_id_fkey;

-- Alterar o campo para ser um array de UUIDs
ALTER TABLE usuarios 
ALTER COLUMN tipo_user_config_id TYPE uuid[] 
USING ARRAY[tipo_user_config_id];
```

**Resultado:**
- Campo `tipo_user_config_id` mudou de `uuid` para `uuid[]`
- Dados existentes convertidos automaticamente
- Constraint de foreign key removida (necessário para arrays)

### 2. **Componente MultiSelect - Implementação Completa**

**Arquivo:** `src/components/comum/MultiSelect.tsx`

**Props Interface:**
```typescript
interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
}
```

**Funcionalidades Implementadas:**
- ✅ **Dropdown animado** com Framer Motion
- ✅ **Campo de busca** com filtro em tempo real
- ✅ **Chips selecionados** com botão de remoção individual
- ✅ **Botão limpar tudo** para remover todas as seleções
- ✅ **Fechamento automático** ao clicar fora
- ✅ **Foco automático** no campo de busca ao abrir
- ✅ **Indicador visual** de itens selecionados

### 3. **Padrão de Consultas Atualizado**

**Antes (❌ Não funcionava com arrays):**
```typescript
const { data } = await supabase
  .from('usuarios')
  .select(`
    *,
    tipo_user_config:tipo_user_config_id(tipo)
  `)
  .eq('id', userId);

// Uso: data.tipo_user_config.tipo
```

**Depois (✅ Funciona com arrays):**
```typescript
// 1. Buscar usuário com array de IDs
const { data: usuarioData } = await supabase
  .from('usuarios')
  .select('*, tipo_user_config_id')
  .eq('id', userId)
  .single();

// 2. Buscar tipos separadamente se necessário
if (usuarioData?.tipo_user_config_id?.length > 0) {
  const { data: tiposData } = await supabase
    .from('tipo_user_config')
    .select('tipo')
    .in('id', usuarioData.tipo_user_config_id);
  
  // Uso: tiposData.some(t => t.tipo === 'admin')
}
```

### 4. **Lógica de Verificação de Tipos - Padrões**

**Verificar se tem tipo específico:**
```typescript
const temTipoVendedor = (usuario: any) => {
  if (!Array.isArray(usuario.tipo_user_config_id)) return false;
  
  return usuario.tipo_user_config_id.some((tipoId: string) => {
    const tipo = tiposUsuario.find(t => t.id === tipoId);
    return tipo?.tipo === 'vendedor';
  });
};
```

**Determinar tipo principal (para permissões):**
```typescript
const determinarTipoPrincipal = async (usuarioId: string) => {
  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('tipo_user_config_id')
    .eq('id', usuarioId)
    .single();

  if (!usuarioData?.tipo_user_config_id?.length) return 'user';

  const { data: tiposData } = await supabase
    .from('tipo_user_config')
    .select('tipo')
    .in('id', usuarioData.tipo_user_config_id);

  // Hierarquia: admin > outros > user
  if (tiposData?.some(t => t.tipo === 'admin')) return 'admin';
  if (tiposData?.length > 0) return tiposData[0].tipo;
  return 'user';
};
```

### 5. **Compatibilidade com Dados Antigos**

**Função de Compatibilidade:**
```typescript
const normalizarTiposUsuario = (tipos: any) => {
  // Se já é array, retorna como está
  if (Array.isArray(tipos)) return tipos;
  
  // Se é string/uuid único, converte para array
  if (tipos && typeof tipos === 'string') return [tipos];
  
  // Se é null/undefined, retorna array vazio
  return [];
};

// Uso em consultas:
const tiposNormalizados = normalizarTiposUsuario(usuario.tipo_user_config_id);
```

### 6. **Atualização do Sistema de Vendedores**

**Função `loadVendedores` no PDV:**
```typescript
const loadVendedores = async () => {
  // 1. Buscar tipos de usuário "vendedor"
  const { data: tiposUsuario } = await supabase
    .from('tipo_user_config')
    .select('id')
    .eq('tipo', 'vendedor');

  const tipoVendedorIds = tiposUsuario?.map(tipo => tipo.id) || [];

  // 2. Buscar todos os usuários
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome, email, tipo_user_config_id')
    .eq('empresa_id', usuarioData.empresa_id)
    .order('nome');

  // 3. Filtrar usuários que têm tipo vendedor
  const vendedoresFiltrados = (data || []).filter(usuario => {
    const tipos = normalizarTiposUsuario(usuario.tipo_user_config_id);
    return tipos.some((tipoId: string) => tipoVendedorIds.includes(tipoId));
  });

  setVendedores(vendedoresFiltrados);
};
```

### 7. **Sistema de Redirecionamento Inteligente**

**Arquivo:** `src/components/entrar/FormEntrar.tsx`

```typescript
// Verificar se é usuário do tipo "user" apenas
let isUserOnly = false;
if (userData?.tipo_user_config_id?.length > 0) {
  const { data: tiposData } = await supabase
    .from('tipo_user_config')
    .select('tipo')
    .in('id', userData.tipo_user_config_id);

  // Se só tem tipo "user" e nenhum outro tipo, é user only
  isUserOnly = tiposData?.length === 1 && tiposData[0].tipo === 'user';
}

// Redirecionamento baseado nos tipos
if (isUserOnly) {
  navigate('/user/dashboard', { replace: true });
} else {
  navigate('/dashboard', { replace: true });
}
```

### 8. **Interface de Listagem Atualizada**

**Exibição de Múltiplos Tipos:**
```typescript
// Na listagem de usuários
<div className="flex flex-wrap gap-2 mt-2">
  {Array.isArray(usuario.tipo_user_config_id) && usuario.tipo_user_config_id.length > 0 ? (
    usuario.tipo_user_config_id.map((tipoId: string) => {
      const tipo = tiposUsuario.find(t => t.id === tipoId);
      return tipo ? (
        <span key={tipoId} className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
          {tipo.tipo.charAt(0).toUpperCase() + tipo.tipo.slice(1)}
        </span>
      ) : null;
    })
  ) : (
    // Compatibilidade com formato antigo
    usuario.tipo_user_config && (
      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
        {usuario.tipo_user_config.tipo.charAt(0).toUpperCase() + usuario.tipo_user_config.tipo.slice(1)}
      </span>
    )
  )}
</div>
```

### 9. **Validação de Formulário Atualizada**

**Estado do Formulário:**
```typescript
const [usuarioForm, setUsuarioForm] = useState({
  id: '',
  nome: '',
  email: '',
  senha: '',
  confirmarSenha: '',
  tipo_user_config_id: [] as string[], // ✅ Array em vez de string
  serie_nfce: 1,
  // Campos de comissão
  tipo_comissao: 'total_venda',
  percentual_comissao: 0,
  grupos_comissao: [] as string[]
});
```

**Lógica de Comissão:**
```typescript
// Campos de comissão aparecem se tem tipo vendedor
const temTipoVendedor = usuarioForm.tipo_user_config_id.some(tipoId => {
  const tipo = tiposUsuario.find(t => t.id === tipoId);
  return tipo?.tipo === 'vendedor';
});

{temTipoVendedor && (
  <div>
    {/* Campos de configuração de comissão */}
  </div>
)}
```

### 10. **Tratamento de Erros e Logs**

**Logs de Debug:**
```typescript
console.log(`Carregados ${usuariosData?.length || 0} usuários. Usuário logado é ${tipoUsuarioLogado}`);
console.log('Tipos do usuário:', tiposData?.map(t => t.tipo));
```

**Tratamento de Erros:**
```typescript
try {
  // Operações com tipos de usuário
} catch (error) {
  console.error('Erro ao processar tipos de usuário:', error);
  // Fallback para comportamento padrão
  setTipoUsuario('user');
}
```

## 🎯 Pontos Importantes para Continuidade

### 1. **Sempre usar normalizarTiposUsuario()**
Ao trabalhar com tipos de usuário, sempre normalizar para array primeiro.

### 2. **Consultas separadas para tipos**
Nunca tentar fazer JOIN com arrays, sempre buscar tipos separadamente.

### 3. **Hierarquia de tipos**
Admin sempre tem precedência sobre outros tipos para permissões.

### 4. **Compatibilidade**
Manter suporte para dados antigos (string única) durante transição.

### 5. **Performance**
Considerar cache de tipos de usuário para consultas frequentes.

## 🔍 Debugging e Troubleshooting

### **Erro 400 Bad Request:**
- ✅ **Causa:** Tentativa de JOIN com array
- ✅ **Solução:** Usar consultas separadas

### **Tipos não aparecem:**
- ✅ **Verificar:** Se array não está vazio
- ✅ **Verificar:** Se IDs existem na tabela tipo_user_config

### **Permissões incorretas:**
- ✅ **Verificar:** Lógica de determinação do tipo principal
- ✅ **Verificar:** Se está usando hierarquia correta

**🎯 Esta documentação garante que qualquer desenvolvedor possa continuar o trabalho com total compreensão do sistema implementado.**
