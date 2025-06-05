# 🔧 CORREÇÃO: Remoção de Fallbacks Fixos - Sistema SaaS Multi-tenant

**Data:** 03/06/2025  
**Problema Identificado:** Sistema usando fallbacks fixos em vez de dados reais da empresa  
**Status:** ✅ CORRIGIDO

## 🚨 **PROBLEMA IDENTIFICADO**

O usuário estava correto ao questionar os valores fixos no `.env`:

```env
# ❌ PROBLEMA: Valores fixos no .env
NFE_AMBIENTE=homologacao
NFE_UF=SP
NFE_CODIGO_MUNICIPIO=3550308
```

### **❌ Fallbacks Fixos Encontrados no Backend:**

1. **UF fixa**: `$uf = $empresa['uf'] ?? 'SP'`
2. **Código UF fixo**: `$std->cUF = $codigosUF[$uf] ?? 35` (SP)
3. **Código município fixo**: `$std->cMunFG = (int)($empresa['codigo_municipio'] ?? 3550308)` (São Paulo)
4. **Ambiente fixo**: `$ambiente = ($nfeData['ambiente'] ?? 'homologacao')`
5. **Endereço destinatário fixo**: Vários fallbacks para São Paulo
6. **Dados produto fixos**: NCM e CFOP com valores padrão

## ✅ **CORREÇÕES IMPLEMENTADAS**

### **1. Remoção de Fallbacks de UF e Município**

**Antes:**
```php
$uf = $empresa['uf'] ?? 'SP';
$std->cUF = $codigosUF[$uf] ?? 35;
$std->cMunFG = (int)($empresa['codigo_municipio'] ?? 3550308);
```

**Depois:**
```php
// Validar UF obrigatória (SEM FALLBACK)
if (empty($empresa['uf'])) {
    throw new Exception('UF da empresa é obrigatória');
}
$uf = $empresa['uf'];

// Validar se UF existe na tabela de códigos
if (!isset($codigosUF[$uf])) {
    throw new Exception("UF '{$uf}' não é válida");
}

$std->cUF = $codigosUF[$uf]; // Usar código real da UF da empresa

// Validar código do município obrigatório (SEM FALLBACK)
if (empty($empresa['codigo_municipio'])) {
    throw new Exception('Código do município da empresa é obrigatório');
}
$std->cMunFG = (int)$empresa['codigo_municipio'];
```

### **2. Remoção de Fallback de Ambiente**

**Antes:**
```php
$ambiente = ($nfeData['ambiente'] ?? 'homologacao') === 'producao' ? 1 : 2;
```

**Depois:**
```php
// Validar ambiente obrigatório (SEM FALLBACK - deve vir da tabela nfe_config)
if (empty($nfeData['ambiente'])) {
    throw new Exception('Ambiente NFe é obrigatório (deve vir da configuração da empresa)');
}
$ambiente = $nfeData['ambiente'] === 'producao' ? 1 : 2;
```

### **3. Remoção de Fallbacks do Endereço Destinatário**

**Antes:**
```php
$std->xLgr = $enderecoDestinatario['logradouro'] ?? 'RUA NAO INFORMADA';
$std->nro = $enderecoDestinatario['numero'] ?? 'S/N';
$std->xBairro = $enderecoDestinatario['bairro'] ?? 'CENTRO';
$std->cMun = (int)($enderecoDestinatario['codigo_municipio'] ?? 3550308);
$std->xMun = $enderecoDestinatario['cidade'] ?? 'SAO PAULO';
$std->UF = $enderecoDestinatario['uf'] ?? 'SP';
$std->CEP = preg_replace('/[^0-9]/', '', $enderecoDestinatario['cep'] ?? '01000000');
```

**Depois:**
```php
// Validar dados obrigatórios do endereço do destinatário (SEM FALLBACKS)
if (empty($enderecoDestinatario['logradouro'])) {
    throw new Exception('Logradouro do destinatário é obrigatório');
}
if (empty($enderecoDestinatario['numero'])) {
    throw new Exception('Número do endereço do destinatário é obrigatório');
}
// ... validações para todos os campos

$std->xLgr = $enderecoDestinatario['logradouro'];
$std->nro = $enderecoDestinatario['numero'];
$std->xBairro = $enderecoDestinatario['bairro'];
$std->cMun = (int)$enderecoDestinatario['codigo_municipio'];
$std->xMun = $enderecoDestinatario['cidade'];
$std->UF = $enderecoDestinatario['uf'];
$std->CEP = preg_replace('/[^0-9]/', '', $enderecoDestinatario['cep']);
```

### **4. Remoção de Fallbacks dos Produtos**

**Antes:**
```php
$nomeProduto = 'PRODUTO SEM NOME';
$std->NCM = $produto['ncm'] ?? '99999999';
$std->CFOP = $produto['cfop'] ?? '5102';
```

**Depois:**
```php
if (empty($nomeProduto)) {
    throw new Exception("Nome/descrição do produto {$item} é obrigatório");
}

// Validar dados fiscais obrigatórios do produto (SEM FALLBACKS)
if (empty($produto['ncm'])) {
    throw new Exception("NCM do produto {$item} ({$nomeProduto}) é obrigatório");
}
if (empty($produto['cfop'])) {
    throw new Exception("CFOP do produto {$item} ({$nomeProduto}) é obrigatório");
}

$std->NCM = $produto['ncm']; // NCM real obrigatório
$std->CFOP = $produto['cfop']; // CFOP real obrigatório
```

## 🎯 **NOVO ENDPOINT DE CONFIGURAÇÃO**

Criado `backend/public/get-empresa-config.php` para:

1. **Buscar dados reais da empresa** do Supabase
2. **Validar completude** dos dados fiscais
3. **Retornar configuração completa** incluindo ambiente NFe
4. **Garantir isolamento multi-tenant** por empresa_id

### **Uso:**
```
GET /backend/public/get-empresa-config.php?empresa_id=UUID
```

### **Resposta:**
```json
{
  "success": true,
  "data": {
    "empresa": {
      "uf": "RJ",
      "codigo_municipio": "3304557",
      "razao_social": "EMPRESA REAL LTDA",
      // ... outros dados reais
    },
    "nfe_config": {
      "ambiente": "homologacao",
      "ambiente_codigo": 2
    }
  }
}
```

## 📊 **ESTRUTURA DE DADOS CORRETA**

### **Tabela `empresas`:**
- ✅ `estado` (UF) - usado como `uf`
- ✅ `codigo_municipio` (7 dígitos IBGE)
- ✅ `regime_tributario`
- ✅ `inscricao_estadual`
- ✅ Endereço completo

### **Tabela `nfe_config`:**
- ✅ `ambiente` ('homologacao' ou 'producao')
- ✅ `empresa_id` (isolamento multi-tenant)

## 🚀 **BENEFÍCIOS DA CORREÇÃO**

1. **✅ SaaS Real**: Cada empresa usa seus próprios dados
2. **✅ Sem Dados Fictícios**: Todos os dados são reais e validados
3. **✅ Compliance Fiscal**: NFe com dados corretos da empresa
4. **✅ Multi-tenant Verdadeiro**: Isolamento completo por empresa
5. **✅ Validação Robusta**: Erros claros quando dados estão faltando

## ⚠️ **IMPACTO PARA USUÁRIOS**

Agora o sistema **exigirá** que todas as empresas tenham:

1. **Cadastro completo** na tabela `empresas`
2. **Configuração NFe** na tabela `nfe_config`
3. **Dados fiscais válidos** em todos os produtos
4. **Endereços completos** para destinatários

## 🎉 **RESULTADO FINAL**

O sistema agora é um **SaaS multi-tenant verdadeiro** onde:

- ❌ **Não há mais** valores fixos ou fallbacks
- ✅ **Cada empresa** usa seus próprios dados fiscais
- ✅ **Ambiente NFe** vem da configuração da empresa
- ✅ **UF e município** vêm do cadastro da empresa
- ✅ **Validação rigorosa** garante dados completos

**Sistema 100% compatível com SaaS multi-tenant!** 🎯
