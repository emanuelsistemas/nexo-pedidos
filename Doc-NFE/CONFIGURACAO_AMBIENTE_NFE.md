# 🔧 Configuração de Ambiente NFe - Tabela Dedicada

## ✅ IMPLEMENTAÇÃO CONCLUÍDA

Esta documentação registra a implementação da **tabela dedicada `nfe_config`** para gerenciar as configurações de ambiente NFe (Homologação/Produção) por empresa.

---

## 🎯 OBJETIVO

**Problema:** As configurações de ambiente NFe estavam misturadas na tabela `empresas`, dificultando a organização e expansão futura.

**Solução:** Criar uma tabela dedicada `nfe_config` que:
- ✅ Individualiza configurações por empresa (`empresa_id`)
- ✅ Armazena ambiente: `homologacao` ou `producao`
- ✅ Permite expansão futura para outras configurações NFe
- ✅ Mantém histórico de alterações (`created_at`, `updated_at`)

---

## 🗄️ ESTRUTURA DA TABELA

### Tabela: `nfe_config`

```sql
CREATE TABLE nfe_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    ambiente VARCHAR(20) NOT NULL DEFAULT 'homologacao' 
        CHECK (ambiente IN ('homologacao', 'producao')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Garantir que cada empresa tenha apenas uma configuração
    UNIQUE(empresa_id)
);
```

### Características:
- **`empresa_id`**: Chave estrangeira para `empresas(id)` com CASCADE DELETE
- **`ambiente`**: Enum com valores `'homologacao'` ou `'producao'`
- **Constraint UNIQUE**: Cada empresa tem apenas uma configuração
- **Trigger automático**: Atualiza `updated_at` em modificações
- **Índice**: Otimização para consultas por `empresa_id`

---

## 🔄 MIGRAÇÃO IMPLEMENTADA

### Arquivo: `supabase/migrations/20250127000002_create_nfe_config.sql`

#### Funcionalidades da Migração:
1. **Criação da tabela** com todas as constraints
2. **Índice de performance** em `empresa_id`
3. **Trigger automático** para `updated_at`
4. **Migração de dados**: Empresas existentes recebem configuração padrão `'homologacao'`
5. **Comentários de documentação** para cada campo

#### Comando Executado:
```sql
-- Inserir configuração padrão para empresas existentes
INSERT INTO nfe_config (empresa_id, ambiente)
SELECT id, 'homologacao'
FROM empresas
WHERE id NOT IN (SELECT empresa_id FROM nfe_config);
```

---

## 💻 ALTERAÇÕES NO CÓDIGO

### 1. Carregamento de Dados (`loadData`)

**ANTES:**
```typescript
const { data: empresaData } = await supabase
  .from('empresas')
  .select('..., ambiente_nfe')
  .eq('id', usuarioData.empresa_id)
  .single();

setAmbienteNFe(empresaData.ambiente_nfe || '2');
```

**DEPOIS:**
```typescript
// Carregar configuração NFe da nova tabela
const { data: nfeConfigData } = await supabase
  .from('nfe_config')
  .select('ambiente')
  .eq('empresa_id', usuarioData.empresa_id)
  .single();

if (nfeConfigData) {
  // Converter de 'homologacao'/'producao' para '2'/'1'
  setAmbienteNFe(nfeConfigData.ambiente === 'producao' ? '1' : '2');
} else {
  // Criar configuração padrão se não existir
  await supabase.from('nfe_config').insert({
    empresa_id: usuarioData.empresa_id,
    ambiente: 'homologacao'
  });
  setAmbienteNFe('2');
}
```

### 2. Salvamento de Configurações (`handleSalvarAmbienteNFe`)

**ANTES:**
```typescript
const { error } = await supabase
  .from('empresas')
  .update({ ambiente_nfe: novoAmbiente })
  .eq('id', usuarioData.empresa_id);
```

**DEPOIS:**
```typescript
// Converter de '1'/'2' para 'producao'/'homologacao'
const ambienteTexto = novoAmbiente === '1' ? 'producao' : 'homologacao';

// Verificar se já existe configuração
const { data: existingConfig } = await supabase
  .from('nfe_config')
  .select('id')
  .eq('empresa_id', usuarioData.empresa_id)
  .single();

if (existingConfig) {
  // Atualizar configuração existente
  await supabase
    .from('nfe_config')
    .update({ ambiente: ambienteTexto })
    .eq('empresa_id', usuarioData.empresa_id);
} else {
  // Criar nova configuração
  await supabase
    .from('nfe_config')
    .insert({
      empresa_id: usuarioData.empresa_id,
      ambiente: ambienteTexto
    });
}
```

---

## 🎨 INTERFACE DO USUÁRIO

### Localização: Configurações > Certificado Digital

A interface permanece **exatamente igual** para o usuário:
- 🧪 **Homologação**: Ambiente de testes
- 🚀 **Produção**: Ambiente oficial

### Funcionalidades Mantidas:
- ✅ Seleção visual com cards clicáveis
- ✅ Indicação visual do ambiente ativo
- ✅ Mensagens de confirmação
- ✅ Salvamento automático
- ✅ Responsividade

---

## 🔍 VANTAGENS DA IMPLEMENTAÇÃO

### 1. **Organização**
- Configurações NFe separadas da tabela principal `empresas`
- Estrutura dedicada permite expansão futura

### 2. **Performance**
- Índice otimizado para consultas por empresa
- Consultas mais rápidas e eficientes

### 3. **Integridade**
- Constraint UNIQUE garante uma configuração por empresa
- Foreign Key com CASCADE DELETE mantém consistência

### 4. **Auditoria**
- Campos `created_at` e `updated_at` para rastreamento
- Histórico de quando configurações foram alteradas

### 5. **Escalabilidade**
- Fácil adição de novos campos de configuração NFe
- Estrutura preparada para funcionalidades futuras

---

## 🧪 TESTES REALIZADOS

### ✅ Cenários Testados:
1. **Migração**: Empresas existentes receberam configuração padrão
2. **Carregamento**: Interface carrega ambiente correto da nova tabela
3. **Salvamento**: Alterações são salvas na tabela `nfe_config`
4. **Criação automática**: Novas empresas recebem configuração padrão
5. **Hot Reload**: Vite detecta mudanças e atualiza automaticamente

### ✅ Validações:
- Constraint UNIQUE funciona corretamente
- Trigger de `updated_at` atualiza automaticamente
- Foreign Key CASCADE DELETE remove configurações órfãs
- Interface mantém funcionalidade idêntica

---

## 📋 PRÓXIMOS PASSOS

### Possíveis Expansões Futuras:
1. **Configurações adicionais**:
   - Série de numeração NFe/NFC-e
   - Configurações de impostos por estado
   - Configurações de contingência

2. **Auditoria avançada**:
   - Log de alterações de ambiente
   - Notificações de mudanças críticas

3. **Validações**:
   - Verificar certificado antes de permitir produção
   - Validar configurações obrigatórias

---

## 📁 ARQUIVOS MODIFICADOS

- ✅ `supabase/migrations/20250127000002_create_nfe_config.sql` - Nova migração
- ✅ `src/pages/dashboard/ConfiguracoesPage.tsx` - Lógica atualizada
- ✅ `Doc-NFE/CONFIGURACAO_AMBIENTE_NFE.md` - Esta documentação

---

**Data de Implementação**: 27/01/2025  
**Status**: ✅ CONCLUÍDO E TESTADO  
**Compatibilidade**: Mantém interface idêntica para o usuário
