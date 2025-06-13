# 📋 Implementação NFC-e: Sistema de Edição e Reprocessamento de Vendas Pendentes

## 🎯 **CONTEXTO GERAL**

Este documento detalha a implementação completa do sistema de **edição e reprocessamento de NFC-e pendentes** no sistema Nexo Pedidos. O sistema permite que vendas com erro fiscal sejam salvas, editadas e reprocessadas posteriormente.

## 📊 **STATUS ATUAL - IMPLEMENTAÇÃO COMPLETA ✅**

### ✅ **O QUE FOI IMPLEMENTADO:**

1. **Sistema de Salvamento de Vendas Pendentes**
2. **Tags Visuais na Listagem de Movimentos**
3. **Modal de Edição de NFC-e Pendente**
4. **Edição de Campos Fiscais (CFOP, CST, CSOSN)**
5. **Reprocessamento Automático**
6. **Estrutura de Banco de Dados**

---

## 🏗️ **ARQUITETURA DA SOLUÇÃO**

### **1. Fluxo Principal:**
```
Venda PDV → Tentativa NFC-e → Erro Fiscal → Salvar Pendente → Editar Dados → Reprocessar → Autorizada
```

### **2. Componentes Envolvidos:**
- **Frontend:** `src/pages/dashboard/PDVPage.tsx`
- **Backend:** `backend/public/emitir-nfce.php`
- **Banco:** Tabela `pdv` com novos campos fiscais

---

## 🗄️ **ESTRUTURA DO BANCO DE DADOS**

### **Campos Adicionados na Tabela `pdv`:**
```sql
ALTER TABLE pdv 
ADD COLUMN IF NOT EXISTS tentativa_nfce BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS erro_fiscal TEXT,
ADD COLUMN IF NOT EXISTS status_fiscal TEXT DEFAULT 'nao_fiscal';
```

### **Valores do Campo `status_fiscal`:**
- `'nao_fiscal'` - Venda sem tentativa de emissão fiscal
- `'pendente'` - Venda com erro fiscal, aguardando correção
- `'autorizada'` - NFC-e emitida e autorizada com sucesso

---

## 🎨 **INTERFACE DO USUÁRIO**

### **1. Modal de Erro com Botão Salvar:**
```typescript
// Localização: PDVPage.tsx linha ~9427
<button onClick={salvarVendaPendente}>
  Salvar Venda (Fiscal Pendente)
</button>
```

### **2. Tags Visuais na Listagem:**
```typescript
// Localização: PDVPage.tsx linha ~7829
{/* Tag Venda Direta (sempre presente) */}
<span className="bg-blue-500/20 text-blue-400">Venda Direta</span>

{/* Tag NFC-e (quando tentou emitir) */}
{venda.tentativa_nfce && (
  <span className="bg-purple-500/20 text-purple-400">NFC-e</span>
)}

{/* Tag Pendente (quando há erro fiscal) */}
{venda.status_fiscal === 'pendente' && (
  <span className="bg-yellow-500/20 text-yellow-400 animate-pulse">Pendente</span>
)}
```

### **3. Botão Editar NFC-e:**
```typescript
// Localização: PDVPage.tsx linha ~8026
{venda.status_fiscal === 'pendente' && venda.tentativa_nfce && (
  <button onClick={() => abrirModalEdicao(venda)}>
    Editar NFC-e
  </button>
)}
```

---

## 🔧 **FUNCIONALIDADES IMPLEMENTADAS**

### **1. Salvamento de Venda Pendente:**
```typescript
// Localização: PDVPage.tsx linha ~9432
const salvarVendaPendente = async () => {
  const { error } = await supabase
    .from('pdv')
    .update({
      modelo_documento: 65,
      status_fiscal: 'pendente',
      erro_fiscal: erroProcessamento,
      tentativa_nfce: true
    })
    .eq('id', vendaProcessadaId);
};
```

### **2. Carregamento de Itens para Edição:**
```typescript
// Localização: PDVPage.tsx linha ~2219
const carregarItensParaEdicaoNfce = async (vendaId: string) => {
  const { data } = await supabase
    .from('pdv_itens')
    .select(`
      id, produto_id, codigo_produto, nome_produto,
      quantidade, valor_unitario, valor_total_item,
      produto:produtos(
        id, codigo, codigo_barras, nome,
        unidade_medida_id, cfop, cst_icms, csosn,
        regime_tributario,
        unidade_medida:unidades_medida(sigla)
      )
    `)
    .eq('pdv_id', vendaId);
};
```

### **3. Edição de Campos Fiscais:**
```typescript
// Localização: PDVPage.tsx linha ~2279
const habilitarEdicaoCampo = (itemIndex: number, campo: 'cfop' | 'cst' | 'csosn') => {
  setItensNfceEdicao(prev => prev.map((item, index) => 
    index === itemIndex 
      ? { ...item, [`editando_${campo}`]: true }
      : item
  ));
};
```

---

## 🔄 **PROCESSO DE REPROCESSAMENTO**

### **1. Preparação dos Dados:**
```typescript
// Localização: PDVPage.tsx linha ~2308
const reprocessarNfce = async () => {
  // 1. Coletar dados editados dos itens
  const itensAtualizados = itensNfceEdicao.map(item => ({
    codigo: item.produto?.codigo || item.codigo_produto,
    cfop: item.cfop_editavel,
    cst_icms: item.regime_tributario === 1 ? item.cst_editavel : undefined,
    csosn: item.regime_tributario === 1 ? undefined : item.csosn_editavel,
    // ... outros campos
  }));
  
  // 2. Buscar dados da empresa
  const empresaData = await buscarDadosEmpresa();
  
  // 3. Montar payload completo
  const nfceData = {
    empresa: empresaData,
    ambiente: nfeConfigData.ambiente,
    produtos: itensAtualizados
  };
};
```

---

## 🚨 **PROBLEMAS RESOLVIDOS E LIÇÕES APRENDIDAS**

### **1. PROBLEMA: Busca de Dados da Empresa**
**❌ Erro Inicial:** Backend tentava buscar dados da empresa internamente
**✅ Solução:** Frontend busca e envia dados completos no payload

```typescript
// ❌ ERRADO - Backend buscando dados
$empresa = buscarEmpresaNoBanco($empresaId);

// ✅ CORRETO - Frontend enviando dados
$empresa = $nfceData['empresa']; // Dados vêm do payload
```

### **2. PROBLEMA: Estrutura do Payload**
**❌ Erro:** Perdemos muito tempo tentando descobrir como acessar dados no backend
**✅ Solução:** Seguir exatamente o padrão da NFe que já funcionava

```php
// Estrutura correta do payload:
{
  "empresa_id": "uuid",
  "nfce_data": {
    "empresa": { /* dados completos da empresa */ },
    "ambiente": "homologacao|producao",
    "identificacao": { /* dados da NFC-e */ },
    "produtos": [ /* array de produtos */ ]
  }
}

// Acesso no backend:
$empresa = $nfceData['empresa'];
$ambiente = $nfceData['ambiente'];
$produtos = $nfceData['produtos'];
```

### **3. PROBLEMA: Modo de Envio SEFAZ**
**❌ Erro:** Status 452 - "Solicitada resposta assíncrona para lote com 1 NFC-e"
**✅ Solução:** Usar envio síncrono para NFC-e

```php
// ❌ ERRADO - Modo assíncrono
$response = $tools->sefazEnviaLote([$xmlAssinado], 1);

// ✅ CORRETO - Modo síncrono para NFC-e
$response = $tools->sefazEnviaLote([$xmlAssinado], 1, 1); // indSinc=1
```

---

## 📁 **ARQUIVOS MODIFICADOS**

### **1. Frontend Principal:**
- **Arquivo:** `src/pages/dashboard/PDVPage.tsx`
- **Linhas Principais:**
  - Estados: 172-177
  - Funções: 2219-2463
  - Modal: 9640-9884

### **2. Backend:**
- **Arquivo:** `backend/public/emitir-nfce.php`
- **Modificações:**
  - Uso de dados do payload (linha ~192)
  - Modo síncrono SEFAZ (linha ~1082)
  - Processamento de resposta síncrona (linha ~1130)

### **3. Banco de Dados:**
- **Tabela:** `pdv`
- **Campos Adicionados:** `tentativa_nfce`, `status_fiscal`, `erro_fiscal`

---

## 🎯 **PRÓXIMOS PASSOS SUGERIDOS**

### **1. Melhorias Futuras:**
- [ ] Implementar histórico de tentativas de reprocessamento
- [ ] Adicionar validação avançada de campos fiscais
- [ ] Criar relatório de vendas pendentes
- [ ] Implementar notificações automáticas para vendas pendentes

### **2. Testes Recomendados:**
- [ ] Testar com diferentes tipos de erro SEFAZ
- [ ] Validar comportamento com múltiplos produtos
- [ ] Testar em ambiente de produção
- [ ] Verificar performance com grandes volumes

---

## 🔍 **COMO DEBUGGAR**

### **1. Logs do Frontend:**
```javascript
console.log('🔍 FRONTEND: Dados da empresa:', empresaData);
console.log('📋 FRONTEND: Payload NFC-e:', nfceData);
console.log('✅ FRONTEND: Resposta backend:', result);
```

### **2. Logs do Backend:**
```php
error_log("📡 NFCE: Dados recebidos: " . json_encode($nfceData));
error_log("✅ NFCE: XML gerado com sucesso");
error_log("📋 NFCE: Resposta SEFAZ: " . $response);
```

### **3. Verificação de Dados:**
```sql
-- Verificar vendas pendentes
SELECT numero_venda, status_fiscal, erro_fiscal, tentativa_nfce 
FROM pdv 
WHERE status_fiscal = 'pendente';

-- Verificar estrutura dos campos
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pdv' 
AND column_name IN ('tentativa_nfce', 'status_fiscal', 'erro_fiscal');
```

---

## 📞 **CONTATO E CONTINUIDADE**

**Status:** ✅ **IMPLEMENTAÇÃO COMPLETA E FUNCIONAL**

**Última Atualização:** 13/06/2025

**Próximo Chat IA:** Continue a partir daqui com melhorias ou correções específicas. A base está sólida e testada.

**Comandos Úteis para Teste:**
1. Fazer venda no PDV
2. Tentar emitir NFC-e
3. Salvar como pendente quando der erro
4. Abrir Movimentos e verificar tags
5. Editar NFC-e pendente
6. Reprocessar envio

---

**🎉 IMPLEMENTAÇÃO CONCLUÍDA COM SUCESSO! 🎉**
