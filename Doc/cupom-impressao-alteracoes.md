# 📄 Documentação: Alterações no Cupom de Impressão PDV

## 📋 Visão Geral

Este documento explica como fazer alterações no sistema de impressão de cupons não fiscais do PDV, incluindo modificações no layout, conteúdo e rodapé personalizado.

## 🎯 Localização dos Arquivos

### 1. Frontend (TypeScript/React)
- **Arquivo Principal**: `src/pages/dashboard/PDVPage.tsx`
- **Linhas de Interesse**: 
  - Função `finalizarComImpressao()`: ~linha 5970-6080
  - Função `finalizarNfceComImpressao()`: ~linha 5800-5950
  - Função `reimprimirCupomNaoFiscal()`: ~linha 5689-5790

### 2. Backend (PHP)
- **Configuração PDV**: `supabase/migrations/20250618000000_add_rodape_personalizado_pdv_config.sql`
- **Tabela**: `pdv_config` (campo `rodape_personalizado`)

### 3. Configurações Frontend
- **Página de Configurações**: `src/pages/dashboard/ConfiguracoesPage.tsx`
- **Seção**: Aba "Impressões" (~linha 4078-4120)

## 🔧 Como Alterar o Rodapé do Cupom

### Método 1: Via Interface (Recomendado)
1. Acesse **Configurações** → **PDV** → Aba **"Impressões"**
2. Edite o campo **"Rodapé Personalizado dos Recibos"**
3. Clique em **"Salvar"**

### Método 2: Via Código
```typescript
// Em PDVPage.tsx, nas funções de impressão:
<div class="center">
  <div>${pdvConfig?.rodape_personalizado || 'Obrigado pela preferencia volte sempre!'}</div>
</div>
```

## 📝 Estrutura do Cupom HTML

### Template Base
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 10px; }
    .center { text-align: center; }
    .linha { border-top: 1px dashed #000; margin: 5px 0; }
    .bold { font-weight: bold; }
  </style>
</head>
<body>
  <!-- CABEÇALHO DA EMPRESA -->
  <div class="center bold">${empresa.nome_fantasia || empresa.razao_social}</div>
  
  <!-- DADOS DA VENDA -->
  <div class="linha"></div>
  <div>Data: ${dataFormatada}</div>
  <div>Hora: ${horaFormatada}</div>
  
  <!-- ITENS DA VENDA -->
  <div class="linha"></div>
  ${itensHtml}
  
  <!-- TOTAIS -->
  <div class="linha"></div>
  <div>TOTAL: R$ ${valorTotal}</div>
  
  <!-- RODAPÉ PERSONALIZADO -->
  <div class="linha"></div>
  <div class="center">
    <div>${pdvConfig?.rodape_personalizado || 'Obrigado pela preferencia volte sempre!'}</div>
  </div>
</body>
</html>
```

## 🎨 Personalizações Comuns

### 1. Alterar Fonte do Cupom
```css
/* Em PDVPage.tsx, na variável htmlCupom */
body { 
  font-family: 'Arial', sans-serif; /* Trocar Courier New */
  font-size: 14px; /* Aumentar tamanho */
}
```

### 2. Adicionar Logo da Empresa
```html
<!-- Adicionar após o nome da empresa -->
<div class="center">
  <img src="data:image/png;base64,${logoBase64}" style="max-width: 200px;">
</div>
```

### 3. Modificar Layout dos Itens
```javascript
// Localizar a geração de itensHtml em PDVPage.tsx
const itensHtml = itens.map(item => `
  <div style="display: flex; justify-content: space-between;">
    <span>${item.quantidade}x ${item.nome}</span>
    <span>R$ ${item.valor_total.toFixed(2)}</span>
  </div>
`).join('');
```

## 🔄 Fluxo de Impressão

### Botões de Finalização
1. **"Finalizar com Impressão"** → `finalizarComImpressao()`
2. **"NFC-e com Impressão"** → `finalizarNfceComImpressao()`

### Processo de Impressão
1. Gera HTML do cupom
2. Abre nova janela com o conteúdo
3. Chama `window.print()` automaticamente
4. Fecha a janela após impressão

## 📊 Dados Disponíveis no Cupom

### Empresa
- `empresa.nome_fantasia`
- `empresa.razao_social`
- `empresa.endereco`
- `empresa.telefone`
- `empresa.documento` (CNPJ)

### Venda
- `venda.numero`
- `venda.data_venda`
- `venda.valor_total`
- `venda.valor_desconto`
- `venda.valor_acrescimo`

### Cliente (se selecionado)
- `cliente.nome`
- `cliente.telefone`
- `cliente.documento`

### Vendedor (se selecionado)
- `vendedor.nome`

### Itens
- `item.nome`
- `item.quantidade`
- `item.valor_unitario`
- `item.valor_total`

## 🛠️ Exemplos de Modificações

### 1. Adicionar Informações do Cliente
```javascript
// Adicionar após os dados da venda
let clienteHtml = '';
if (clienteSelecionado) {
  clienteHtml = `
    <div class="linha"></div>
    <div class="bold">CLIENTE:</div>
    <div>${clienteSelecionado.nome}</div>
    ${clienteSelecionado.telefone ? `<div>Tel: ${clienteSelecionado.telefone}</div>` : ''}
  `;
}
```

### 2. Adicionar Informações do Vendedor
```javascript
// Adicionar após os dados do cliente
let vendedorHtml = '';
if (vendedorSelecionado) {
  vendedorHtml = `
    <div>Vendedor: ${vendedorSelecionado.nome}</div>
  `;
}
```

### 3. Personalizar Rodapé com Múltiplas Linhas
```javascript
// Modificar o rodapé para aceitar quebras de linha
const rodapeLinhas = (pdvConfig?.rodape_personalizado || 'Obrigado pela preferencia volte sempre!')
  .split('\n')
  .map(linha => `<div>${linha}</div>`)
  .join('');

// No HTML:
<div class="center">
  ${rodapeLinhas}
</div>
```

## 🔍 Debugging e Testes

### 1. Testar Impressão
```javascript
// Adicionar console.log para debug
console.log('HTML do cupom:', htmlCupom);
console.log('Configuração PDV:', pdvConfig);
```

### 2. Visualizar HTML
```javascript
// Comentar window.print() temporariamente para ver o HTML
// janelaImpressao.print();
```

### 3. Verificar Configuração
```sql
-- Verificar rodapé personalizado no banco
SELECT rodape_personalizado FROM pdv_config WHERE empresa_id = 'SEU_ID';
```

## ⚠️ Pontos de Atenção

1. **Sempre testar** as alterações antes de aplicar em produção
2. **Backup** do código antes de modificações grandes
3. **Verificar compatibilidade** com diferentes impressoras
4. **Testar quebras de linha** no rodapé personalizado
5. **Validar caracteres especiais** (acentos, símbolos)

## 📱 Responsividade da Impressão

### CSS para Impressão
```css
@media print {
  body { 
    margin: 0; 
    padding: 5px; 
    font-size: 11px; 
  }
  .no-print { 
    display: none; 
  }
}
```

## 🔄 Versionamento

- **v1.0** - Sistema básico de impressão
- **v1.1** - Adicionado rodapé personalizado
- **v1.2** - Melhorias no layout e dados do cliente/vendedor
- **v1.3** - Configurações específicas para cupom "Finalizar com Impressão"

## 🎯 Localizações Exatas no Código

### PDVPage.tsx - Funções de Impressão

#### 1. Função `finalizarComImpressao()`
- **Linha**: ~5970-6080
- **Responsável**: Impressão de cupom não fiscal
- **Rodapé**: Linha ~6062
```typescript
<div class="center">
  <div>${pdvConfig?.rodape_personalizado || 'Obrigado pela preferencia volte sempre!'}</div>
</div>
```

#### 2. Função `finalizarNfceComImpressao()`
- **Linha**: ~5800-5950
- **Responsável**: Impressão de NFC-e com cupom
- **Rodapé**: Linha ~5927
```typescript
<div class="center">
  <div>${pdvConfig?.rodape_personalizado || 'Obrigado pela preferencia volte sempre!'}</div>
</div>
```

#### 3. Função `reimprimirCupomNaoFiscal()`
- **Linha**: ~5689-5790
- **Responsável**: Reimpressão de cupons
- **Rodapé**: Usa a mesma estrutura das funções acima

### ConfiguracoesPage.tsx - Interface de Configuração

#### Seção de Rodapé Personalizado
- **Linha**: ~4078-4120
- **Componente**: Textarea para edição do rodapé
- **Função de Salvamento**: `handleSalvarRodapePersonalizado()` (linha ~2836)

### Banco de Dados

#### Tabela: `pdv_config`
- **Campo**: `rodape_personalizado` (TEXT)
- **Padrão**: 'Obrigado pela preferencia volte sempre!'
- **Migration**: `20250618000000_add_rodape_personalizado_pdv_config.sql`

## 🔧 Checklist para Alterações

### Antes de Modificar
- [ ] Fazer backup do arquivo `PDVPage.tsx`
- [ ] Testar em ambiente de desenvolvimento
- [ ] Verificar se a configuração PDV está carregada

### Durante a Modificação
- [ ] Localizar a função correta (finalizar/nfce/reimprimir)
- [ ] Identificar a seção do HTML do cupom
- [ ] Modificar apenas o necessário
- [ ] Manter a estrutura CSS existente

### Após a Modificação
- [ ] Testar impressão com dados reais
- [ ] Verificar se o rodapé personalizado funciona
- [ ] Testar em diferentes navegadores
- [ ] Validar com impressora física

## 🚀 Deploy e Atualizações

### Ambiente de Desenvolvimento
```bash
# Aplicar migration (se necessário)
cd supabase
npx supabase db push

# Reiniciar aplicação
npm run dev
```

### Ambiente de Produção
```bash
# Build da aplicação
npm run build

# Deploy (comando específico do projeto)
nexo
```

## 📋 Troubleshooting

### Problema: Rodapé não aparece
**Solução**: Verificar se `pdvConfig` está carregado
```typescript
console.log('PDV Config:', pdvConfig);
```

### Problema: Impressão não funciona
**Solução**: Verificar se `window.print()` está sendo chamado
```typescript
setTimeout(() => {
  janelaImpressao.print();
}, 500);
```

### Problema: Layout quebrado
**Solução**: Verificar CSS e estrutura HTML
```css
body {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  margin: 0;
  padding: 10px;
}
```

---

**📞 Suporte**: Para dúvidas ou problemas, consulte este documento primeiro. Se necessário, contate o desenvolvedor responsável.

## 🆕 Configurações Específicas do Cupom "Finalizar com Impressão"

### Novos Campos de Configuração (v1.3)

A partir da versão 1.3, foram adicionados controles específicos para o cupom "Finalizar com Impressão":

#### Campos na Tabela `pdv_config`:
- `mostrar_razao_social_cupom_finalizar` (BOOLEAN, padrão: false)
- `mostrar_endereco_cupom_finalizar` (BOOLEAN, padrão: false)
- `mostrar_operador_cupom_finalizar` (BOOLEAN, padrão: false)

#### Interface de Configuração:
**Localização**: Configurações → PDV → Aba "Impressões"

**Checkboxes Disponíveis**:
- ☑️ **Mostrar Razão Social** - Controla se a razão social aparece no cabeçalho
- ☑️ **Mostrar Endereço** - Controla se endereço completo aparece no cabeçalho
- ☑️ **Mostrar Operador/Vendedor** - Controla se o vendedor aparece no cupom

#### Comportamento:
- **Padrão**: Todos os campos começam DESABILITADOS (false)
- **Aplicação**: Apenas no cupom "Finalizar com Impressão"
- **NFC-e**: Não é afetada - continua mostrando todos os campos

### Implementação no Código:

#### ConfiguracoesPage.tsx (~linha 4094-4140):
```typescript
// Checkboxes para configuração do cupom
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <div className="flex items-center space-x-3">
    <input
      type="checkbox"
      id="mostrar_razao_social_cupom_finalizar"
      checked={pdvConfig.mostrar_razao_social_cupom_finalizar}
      onChange={(e) => handlePdvConfigChange('mostrar_razao_social_cupom_finalizar', e.target.checked)}
    />
    <label>Mostrar Razão Social</label>
  </div>
  // ... outros checkboxes
</div>
```

#### PDVPage.tsx (~linha 5997-6008):
```typescript
// Cabeçalho condicional baseado nas configurações
<div class="center">
  ${pdvConfig?.mostrar_razao_social_cupom_finalizar ?
    `<div class="bold">${dadosImpressao.empresa.razao_social}</div>` : ''}
  ${dadosImpressao.empresa.nome_fantasia ?
    `<div class="bold">${dadosImpressao.empresa.nome_fantasia}</div>` : ''}
  ${pdvConfig?.mostrar_endereco_cupom_finalizar ? `
    <div>${dadosImpressao.empresa.endereco}</div>
    <div>${dadosImpressao.empresa.bairro} - ${dadosImpressao.empresa.cidade}/${dadosImpressao.empresa.uf}</div>
    <div>CEP: ${dadosImpressao.empresa.cep}</div>
  ` : ''}
</div>
```

#### Operador/Vendedor (~linha 6022-6026):
```typescript
${dadosImpressao.vendedor?.nome && pdvConfig?.mostrar_operador_cupom_finalizar ? `
  <div class="center">
    <div class="bold">OPERADOR: ${dadosImpressao.vendedor.nome}</div>
  </div>
` : ''}
```

**🔄 Última Atualização**: 2025-06-18 - Implementação de configurações específicas do cupom "Finalizar com Impressão"
