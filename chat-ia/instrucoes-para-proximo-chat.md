# Instruções para Próximo Chat IA

## 🎯 MISSÃO PRINCIPAL

**Objetivo:** Fazer a segunda tela de finalização aparecer **ao lado** da primeira tela, não sobrepondo.

**Status Atual:** ❌ Segunda tela ainda sobrepõe a primeira
**Prioridade:** 🔥 ALTA - Funcionalidade crítica do PDV

## 📋 CONTEXTO RÁPIDO

### O que funciona ✅
- Sistema PDV completo funcionando
- Área lateral (cliente, descontos) funcionando perfeitamente
- Primeira tela de finalização aparece corretamente ao lado da área lateral
- Build sempre bem-sucedido

### O que não funciona ❌
- Segunda tela de finalização sobrepõe a primeira (deveria aparecer ao lado)

### Layout Desejado
```
┌─────────┬─────────┬─────────┬─────────┐
│ Itens   │ Lateral │ 1ª Tela │ 2ª Tela │
│ 25%     │ 192px   │ 25%     │ 25%     │
└─────────┴─────────┴─────────┴─────────┘
```

## 🔍 INVESTIGAÇÃO PRIORITÁRIA

### 1. Overlay da Primeira Tela (SUSPEITO #1)
**Arquivo:** `src/pages/dashboard/PDVPage.tsx`
**Linha:** ~7270

```jsx
{/* ESTE OVERLAY PODE ESTAR CAUSANDO O PROBLEMA */}
{showFinalizacaoFinal && (
  <div className="absolute inset-0 bg-black/20 z-20 cursor-not-allowed" />
)}
```

**Ação:** Comentar temporariamente e testar

### 2. Animações Framer Motion (SUSPEITO #2)
**Linhas:** ~7247, ~7740

```jsx
// ESTAS ANIMAÇÕES PODEM ESTAR FORÇANDO position: absolute
initial={{ x: '100%', opacity: 0 }}
animate={{ x: 0, opacity: 1 }}
```

**Ação:** Substituir por `<div>` simples temporariamente

### 3. Z-index e Contexto de Empilhamento
**Problema:** `motion.div` pode estar criando contextos de empilhamento

## 🛠️ PLANO DE AÇÃO SUGERIDO

### Passo 1: Debug Visual
```jsx
// Adicionar bordas coloridas para visualizar o layout
<div className="w-1/2 flex border-4 border-red-500"> {/* Container */}
  <div className="w-1/2 border-4 border-blue-500"> {/* Primeira */}
  <div className="w-1/2 border-4 border-green-500"> {/* Segunda */}
</div>
```

### Passo 2: Remover Overlay
```jsx
{/* Comentar temporariamente */}
{/* {showFinalizacaoFinal && (
  <div className="absolute inset-0 bg-black/20 z-20 cursor-not-allowed" />
)} */}
```

### Passo 3: Testar Sem Animações
```jsx
// Substituir motion.div por div simples
<div className="w-1/2 bg-background-card border-l border-gray-800 flex flex-col h-full">
  {/* Conteúdo */}
</div>
```

### Passo 4: Verificar DevTools
- Inspecionar estrutura DOM
- Verificar computed styles
- Verificar se classes Tailwind estão aplicadas

## 📂 ARQUIVOS PRINCIPAIS

### Arquivo Crítico
- `src/pages/dashboard/PDVPage.tsx` (linhas 6253-8112)

### Estrutura Atual Implementada
```jsx
{/* Linhas ~7242-7256 */}
{carrinho.length > 0 && (
  <div className={`${showFinalizacaoFinal ? 'w-1/2' : 'w-1/3'} flex`}>
    
    {/* Primeira tela */}
    <motion.div className={`${showFinalizacaoFinal ? 'w-1/2' : 'w-full'}`}>
      {/* Conteúdo primeira tela */}
    </motion.div>

    {/* Segunda tela */}
    {showFinalizacaoFinal && (
      <motion.div className="w-1/2">
        {/* Conteúdo segunda tela */}
      </motion.div>
    )}
  </div>
)}
```

## 🚀 COMANDOS PARA TESTAR

```bash
# Build
cd /root/nexo-pedidos && npm run build:dev

# Teste
# 1. Acessar: http://31.97.166.71
# 2. Habilitar "Seleciona clientes" nas configurações PDV
# 3. Adicionar produtos ao carrinho
# 4. Clicar "Confirmar" na primeira tela
# 5. Verificar se segunda tela aparece ao lado (não sobrepondo)
```

## 🔧 VARIÁVEIS DE ESTADO

### Principal
- `showFinalizacaoFinal`: boolean que controla segunda tela
- `carrinho`: array de itens (controla exibição das telas)

### Configurações
- `pdvConfig?.seleciona_clientes`: controla área lateral

## 📖 DOCUMENTAÇÃO ADICIONAL

### Arquivos de Contexto
- `chat-ia/implementacao-layout-pdv-lado-a-lado.md` - Histórico detalhado
- `chat-ia/contexto-sistema-pdv.md` - Visão geral do sistema

### Memórias do Sistema
- Sistema SaaS multi-tenant
- Usuário prefere soluções frontend-only
- Build system customizado com comando `nexo`
- Ambiente de desenvolvimento: http://31.97.166.71

## ⚡ DICAS IMPORTANTES

1. **Sempre fazer build** após mudanças: `npm run build:dev`
2. **Limpar cache** do navegador: `Ctrl + Shift + R`
3. **Testar com área lateral ativa** (habilitar "Seleciona clientes")
4. **Foco no overlay** da primeira tela - principal suspeito
5. **Usar DevTools** para debug visual do layout

---

**🎯 OBJETIVO:** Segunda tela ao lado da primeira, não sobrepondo
**🔥 PRIORIDADE:** ALTA - Funcionalidade crítica
**📍 FOCO:** Overlay da primeira tela e animações Framer Motion
