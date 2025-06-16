# Contexto do Sistema PDV - Nexo Pedidos

## 🏗️ ARQUITETURA GERAL

### Stack Tecnológico
- **Frontend:** React + TypeScript + Tailwind CSS + Framer Motion
- **Backend:** PHP (API REST)
- **Database:** Supabase (PostgreSQL)
- **Build:** Vite + npm
- **Ambiente:** VPS Linux (http://31.97.166.71)

### Estrutura do Projeto
```
/root/nexo-pedidos/
├── src/
│   ├── pages/dashboard/PDVPage.tsx (arquivo principal)
│   ├── components/
│   ├── hooks/
│   └── lib/
├── backend/ (PHP)
├── chat-ia/ (documentações para IA)
└── package.json
```

## 📱 SISTEMA PDV - VISÃO GERAL

### Funcionalidades Principais
1. **Carrinho de Compras:** Adicionar/remover produtos
2. **Área Lateral:** Cliente, descontos, comandas, mesas
3. **Finalização:** Duas telas sequenciais
4. **Pagamentos:** Múltiplas formas, parcial, troco
5. **Fiscal:** NFC-e, NFe, impressão

### Layout Responsivo
- **Desktop:** Layout em colunas lado a lado
- **Mobile:** Layout empilhado
- **Transições:** Animações suaves com Framer Motion

## 🎯 ÁREA LATERAL DO PDV

### Configurações que Controlam Exibição
```typescript
// Área lateral aparece quando pelo menos uma opção está ativa:
pdvConfig?.seleciona_clientes ||
pdvConfig?.vendedor ||
pdvConfig?.comandas ||
pdvConfig?.mesas ||
pdvConfig?.exibe_foto_item ||
pedidosImportados.length > 0
```

### Funcionalidades da Área Lateral
1. **Cliente:** Seleção, troca, remoção
2. **Descontos:** Opções de faturamento do cliente
3. **Comandas/Mesas:** Identificação do pedido
4. **Vendedor:** Seleção do responsável
5. **Pedidos Importados:** Visualização de pedidos externos

### Estado Atual
- ✅ **Funcionando perfeitamente**
- ✅ **Layout responsivo correto**
- ✅ **Integração com primeira tela de finalização**

## 🔄 FLUXO DE FINALIZAÇÃO

### Primeira Tela (Pagamento)
**Localização:** `src/pages/dashboard/PDVPage.tsx` (~linha 7242)
**Estado:** `!showFinalizacaoFinal && carrinho.length > 0`

**Funcionalidades:**
- Seleção de forma de pagamento
- Pagamento parcial/total
- Cálculo de troco
- Desconto na venda
- Botão "Confirmar" → abre segunda tela

### Segunda Tela (Finalização)
**Localização:** `src/pages/dashboard/PDVPage.tsx` (~linha 7735)
**Estado:** `showFinalizacaoFinal && carrinho.length > 0`

**Funcionalidades:**
- Resumo da venda
- CPF/CNPJ para nota fiscal
- Botões de finalização:
  - Finalizar com/sem impressão
  - NFC-e com/sem impressão
- Botão "Voltar" → volta para primeira tela

## 🚨 PROBLEMA ATUAL

### Situação
- **Primeira tela:** ✅ Aparece corretamente ao lado da área lateral
- **Segunda tela:** ❌ Sobrepõe a primeira tela (deveria aparecer ao lado)

### Layout Desejado
```
┌─────────┬─────────┬─────────┬─────────┐
│ Itens   │ Lateral │ 1ª Tela │ 2ª Tela │
│ 25%     │ 192px   │ 25%     │ 25%     │
└─────────┴─────────┴─────────┴─────────┘
```

### Layout Atual (Problema)
```
┌─────────┬─────────┬─────────────────────┐
│ Itens   │ Lateral │    2ª Tela          │
│ 25%     │ 192px   │ (sobrepondo 1ª)     │
└─────────┴─────────┴─────────────────────┘
```

## 🔧 VARIÁVEIS DE ESTADO IMPORTANTES

### Estados do PDV
```typescript
const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
const [showFinalizacaoFinal, setShowFinalizacaoFinal] = useState(false);
const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
const [pedidosImportados, setPedidosImportados] = useState<any[]>([]);
```

### Configurações PDV
```typescript
const [pdvConfig, setPdvConfig] = useState<PDVConfig | null>(null);
// Controla exibição da área lateral
```

### Estados de Pagamento
```typescript
const [tipoPagamento, setTipoPagamento] = useState<'vista' | 'parcial'>('vista');
const [formaPagamentoSelecionada, setFormaPagamentoSelecionada] = useState<number | null>(null);
const [trocoCalculado, setTrocoCalculado] = useState(0);
```

## 📏 SISTEMA DE LARGURAS

### Área de Itens (Dinâmica)
```typescript
// Com área lateral visível:
showFinalizacaoFinal ? 'w-1/4' : 'w-1/2' // 25% ou 50%

// Sem área lateral:
showFinalizacaoFinal ? 'w-1/3' : 'w-2/3' // 33% ou 66%
```

### Área Lateral (Fixa)
```css
w-48 /* 192px fixo */
```

### Container de Finalização
```typescript
// Largura total do container:
showFinalizacaoFinal ? 'w-1/2' : 'w-1/3' // 50% ou 33%

// Primeira tela dentro do container:
showFinalizacaoFinal ? 'w-1/2' : 'w-full' // 25% ou 33%

// Segunda tela dentro do container:
'w-1/2' // 25% quando ativa
```

## 🎨 ANIMAÇÕES E TRANSIÇÕES

### Framer Motion
```jsx
<motion.div
  initial={{ x: '100%', opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  transition={{
    type: "tween",
    duration: 0.5,
    ease: [0.25, 0.46, 0.45, 0.94]
  }}
>
```

### Transições CSS
```css
transition-all duration-300 /* Larguras */
transition-all duration-500 /* Área de itens */
```

## 🛠️ COMANDOS ÚTEIS

### Build e Deploy
```bash
cd /root/nexo-pedidos
npm run build:dev
```

### Teste Local
```
URL: http://31.97.166.71
1. Habilitar "Seleciona clientes" nas configurações
2. Adicionar produtos ao carrinho
3. Testar fluxo de finalização
```

### Debug
```bash
# Verificar logs do build
npm run build:dev 2>&1 | grep -i error

# Limpar cache
Ctrl + Shift + R (no navegador)
```

---

**Arquivo Principal:** `src/pages/dashboard/PDVPage.tsx`
**Linhas Críticas:** 6253-8112 (layout e finalização)
**Status:** Sistema funcionando, exceto layout lado a lado da segunda tela
