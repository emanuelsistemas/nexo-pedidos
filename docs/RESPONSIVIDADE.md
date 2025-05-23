# Sistema de Responsividade Automática

## 📱 Visão Geral

O sistema implementa redirecionamento automático entre as versões **web** (`/dashboard/*`) e **mobile** (`/user/*`) baseado no tamanho da tela.

## ⚙️ Configuração Global

### Arquivo: `src/config/responsive.ts`

```typescript
// Para alterar o breakpoint, modifique apenas este valor:
export const MOBILE_BREAKPOINT = 600; // pixels
```

**Exemplo**: Para ativar mobile em telas menores que 500px:
```typescript
export const MOBILE_BREAKPOINT = 500;
```

## 🔄 Como Funciona

### 1. Detecção Automática
- **Tela ≥ 600px**: Versão web (`/dashboard/*`)
- **Tela < 600px**: Versão mobile (`/user/*`)

### 2. Redirecionamento Inteligente
- **Web → Mobile**: `/dashboard/pedidos` → `/user/pedidos`
- **Mobile → Web**: `/user/pedidos` → `/dashboard/pedidos`
- **Preserva parâmetros**: `/dashboard/pedidos/editar/123` → `/user/pedidos/editar/123`

### 3. Tempo Real
- Redirecionamento instantâneo ao redimensionar a janela
- Sem necessidade de refresh da página

## 🛠️ Implementação

### Hook Principal: `useResponsiveRedirect`

```typescript
import { useResponsiveRedirect } from '../hooks/useResponsiveRedirect';

const MyComponent = () => {
  // Adicione esta linha para ativar o redirecionamento automático
  useResponsiveRedirect();
  
  return <div>Meu componente</div>;
};
```

### Layouts que Usam o Hook

1. **DashboardLayout** - Versão web
2. **UserMobileLayout** - Versão mobile

## 📋 Mapeamento de Rotas

### Web → Mobile
```typescript
'/dashboard' → '/user/dashboard'
'/dashboard/pedidos' → '/user/pedidos'
'/dashboard/pedidos/novo' → '/user/pedidos/novo'
'/dashboard/pedidos/editar/:id' → '/user/pedidos/editar/:id'
'/dashboard/produtos' → '/user/produtos'
'/dashboard/clientes' → '/user/clientes'
'/dashboard/configuracoes' → '/user/configuracoes'
```

### Mobile → Web
```typescript
'/user/dashboard' → '/dashboard'
'/user/pedidos' → '/dashboard/pedidos'
'/user/pedidos/novo' → '/dashboard/pedidos/novo'
'/user/pedidos/editar/:id' → '/dashboard/pedidos/editar/:id'
'/user/produtos' → '/dashboard/produtos'
'/user/clientes' → '/dashboard/clientes'
'/user/configuracoes' → '/dashboard/configuracoes'
```

## 🎯 Funcionalidades Responsivas

### Botão "Novo Pedido"
- **Desktop**: Aparece no cabeçalho da página
- **Mobile**: Removido do cabeçalho (usa botão flutuante)

```typescript
import { isDesktopScreen } from '../config/responsive';

const showAddButton = isWebVersion && isDesktopScreen();
```

### Detecção de Tela
```typescript
import { isMobileScreen, isDesktopScreen } from '../config/responsive';

if (isMobileScreen()) {
  // Lógica para mobile
}

if (isDesktopScreen()) {
  // Lógica para desktop
}
```

## 🔧 Personalização

### Adicionar Nova Rota

1. **Edite**: `src/config/responsive.ts`
2. **Adicione** no `REDIRECT_CONFIG`:

```typescript
WEB_TO_MOBILE_ROUTES: {
  // ... rotas existentes
  '/dashboard/nova-pagina': '/user/nova-pagina',
},

MOBILE_TO_WEB_ROUTES: {
  // ... rotas existentes
  '/user/nova-pagina': '/dashboard/nova-pagina',
}
```

### Alterar Breakpoint

```typescript
// Altere apenas este valor:
export const MOBILE_BREAKPOINT = 768; // Novo breakpoint
```

**Efeitos da mudança**:
- ✅ Redirecionamento automático atualizado
- ✅ Detecção de tela atualizada
- ✅ Botões responsivos atualizados
- ✅ Media queries atualizadas

## 📱 Teste de Responsividade

### 1. Teste Manual
1. Acesse `/dashboard` em tela grande
2. Redimensione para menos de 600px
3. Deve redirecionar automaticamente para `/user/dashboard`
4. Redimensione para mais de 600px
5. Deve redirecionar de volta para `/dashboard`

### 2. Teste de Rotas
- Acesse `/dashboard/pedidos` em mobile → vai para `/user/pedidos`
- Acesse `/user/pedidos` em desktop → vai para `/dashboard/pedidos`

### 3. Console de Debug
O sistema exibe logs no console:
```
Redirecionando para mobile: /dashboard/pedidos -> /user/pedidos
Redirecionando para web: /user/pedidos -> /dashboard/pedidos
```

## ⚠️ Considerações

### Performance
- ✅ Listeners otimizados com cleanup automático
- ✅ Redirecionamento apenas quando necessário
- ✅ Sem loops infinitos de redirecionamento

### Compatibilidade
- ✅ Funciona em todos os navegadores modernos
- ✅ Suporte a touch devices
- ✅ Compatível com React Router

### Manutenção
- ✅ Configuração centralizada
- ✅ Fácil de modificar breakpoints
- ✅ Código reutilizável

## 🚀 Vantagens

1. **Configuração única**: Altere o breakpoint em um lugar só
2. **Automático**: Sem necessidade de intervenção manual
3. **Inteligente**: Preserva estado e parâmetros das rotas
4. **Performático**: Otimizado para não impactar a performance
5. **Flexível**: Fácil de personalizar e estender

---

**Resultado**: Sistema completamente responsivo que aproveita as versões web e mobile existentes! 🎉
