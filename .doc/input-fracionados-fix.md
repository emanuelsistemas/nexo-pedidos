# 🔧 Documentação: Fix Input Campos Fracionados

## 📋 Problema Identificado
**Data:** 08/08/2025  
**Contexto:** Campo de quantidade na aba Estoque (Registrar Movimentação) não permitia digitação de números decimais para produtos com unidades fracionadas.

### 🚨 Sintomas
- Campo não aceitava vírgula (`,`) ou ponto (`.`) 
- Usuário não conseguia digitar `0,200`, `2,5`, etc.
- Problema específico em unidades fracionadas (KG, LT)
- Unidades inteiras (UN, CX) funcionavam normalmente

## 🔍 Causa Raiz
O problema estava na lógica do `onChange` do input que fazia `return` quando detectava vírgula no final, mas **não atualizava o valor visual do campo**, causando a impressão de que a digitação estava bloqueada.

```tsx
// ❌ PROBLEMA: Return sem atualizar o valor do input
if (valorDigitado.endsWith(',') || valorDigitado.endsWith('.')) {
  console.log('Usuário ainda digitando - permitindo');
  return; // ← Campo não era atualizado visualmente
}
```

## ✅ Solução Implementada

### 1. **Estado Separado para Texto do Input**
```tsx
// ✅ NOVO: Estado textual para o input
const [quantidadeMovimentoTexto, setQuantidadeMovimentoTexto] = useState<string>('');
```

### 2. **Lógica de onChange Corrigida**
```tsx
onChange={(e) => {
  const valorDigitado = e.target.value;
  
  // ✅ SEMPRE atualizar o texto do input primeiro
  setQuantidadeMovimentoTexto(valorDigitado);

  // Se campo vazio
  if (valorDigitado === '') {
    setQuantidadeMovimentoVazia(true);
    setNovoMovimento({ ...novoMovimento, quantidade: 0 });
    return;
  }

  setQuantidadeMovimentoVazia(false);

  // ✅ Para unidades NÃO fracionadas: remover vírgula/ponto
  if (!isFracionado && (valorDigitado.includes(',') || valorDigitado.includes('.'))) {
    const valorLimpo = valorDigitado.replace(/[^0-9]/g, '');
    setQuantidadeMovimentoTexto(valorLimpo);
    
    if (valorLimpo !== '') {
      const valor = parseInt(valorLimpo);
      setNovoMovimento({ ...novoMovimento, quantidade: valor });
    }
    return;
  }

  // Para unidades fracionadas: aguardar se termina com vírgula/ponto
  if (isFracionado && (valorDigitado.endsWith(',') || valorDigitado.endsWith('.'))) {
    return; // Texto já foi atualizado acima
  }
  
  // Processar valor final
  const valorSanitizado = sanitizeQuantidadeInput(valorDigitado, isFracionado);
  if (valorSanitizado !== '') {
    const valor = parseFloat(valorSanitizado.replace(',', '.'));
    if (!isNaN(valor) && valor >= 0) {
      setNovoMovimento({ ...novoMovimento, quantidade: valor });
    }
  }
}}
```

### 3. **Value do Input Atualizado**
```tsx
// ✅ Priorizar texto em digitação
value={quantidadeMovimentoTexto !== '' ? quantidadeMovimentoTexto : 
       (novoMovimento.quantidade === 0 && quantidadeMovimentoVazia ? '' : 
        String(novoMovimento.quantidade))}
```

### 4. **Função sanitizeQuantidadeInput Melhorada**
```tsx
const sanitizeQuantidadeInput = (valor: string, fracionado: boolean): string => {
  if (!valor) return '';

  if (!fracionado) {
    // ✅ UNITÁRIO: apenas números inteiros - remove qualquer vírgula/ponto
    return valor.replace(/[^0-9]/g, '');
  }

  // Fracionado: permite números, vírgula e ponto
  let v = valor.replace(/[^0-9.,]/g, '');
  v = v.replace(',', '.');
  
  // Permitir apenas um ponto decimal
  const pontos = v.split('.');
  if (pontos.length > 2) {
    v = pontos[0] + '.' + pontos.slice(1).join('');
  }

  // Limitar casas decimais a 3
  const parts = v.split('.');
  if (parts.length === 2 && parts[1].length > 3) {
    parts[1] = parts[1].slice(0, 3);
    v = parts.join('.');
  }

  // Retornar com vírgula para exibição
  return v.replace('.', ',');
};
```

### 5. **Limpeza ao Fechar Modal**
```tsx
// ✅ NOVO: Resetar estados de quantidade no resetFormularioProduto()
setQuantidadeMovimentoVazia(false);
setQuantidadeMovimentoTexto('');
setNovoMovimento({
  tipo: 'entrada',
  quantidade: 0,
  observacao: ''
});
```

## 🎯 Resultado Final

### ✅ Unidades Fracionadas (KG, LT, etc.)
- Aceita: `0,200`, `2,5`, `10,750`
- InputMode: `decimal`
- Placeholder: `0,000`

### ✅ Unidades Inteiras (UN, CX, etc.)
- Aceita: `1`, `5`, `100`
- Remove automaticamente: `4,5` → `45`
- InputMode: `numeric`
- Placeholder: `0`

## 🔧 Padrão para Aplicar em Outros Campos

### 1. **Identificar o Problema**
- Campo não aceita vírgula/ponto
- `return` no onChange sem atualizar valor visual

### 2. **Implementar Estado Textual**
```tsx
const [campoTexto, setCampoTexto] = useState<string>('');
```

### 3. **Corrigir onChange**
```tsx
// SEMPRE atualizar texto primeiro
setCampoTexto(valorDigitado);

// Depois processar lógica
if (condicaoEspecial) {
  return; // Texto já foi atualizado
}
```

### 4. **Atualizar Value**
```tsx
value={campoTexto !== '' ? campoTexto : valorProcessado}
```

### 5. **Limpar ao Resetar**
```tsx
setCampoTexto('');
```

## 📍 Arquivos Modificados
- `src/pages/dashboard/ProdutosPage.tsx`
  - Função `sanitizeQuantidadeInput()` (linha ~480)
  - Campo quantidade movimento estoque (linha ~8600)
  - Função `resetFormularioProduto()` (linha ~5185)

## 🧪 Teste de Validação
1. Produto fracionado → Digite `0,200` → ✅ Aceita
2. Produto inteiro → Digite `4,5` → ✅ Vira `45`
3. Fechar modal → Abrir outro → ✅ Campo limpo

---
**Criado por:** Augment Agent  
**Data:** 08/08/2025  
**Status:** ✅ Resolvido e Testado
