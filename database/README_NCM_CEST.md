# 📋 Tabela NCM-CEST - Sistema Nexo Pedidos

## 🎯 Objetivo

A tabela `ncm` foi criada para implementar a correspondência entre códigos NCM e CEST no sistema NFe, conforme exigido pela legislação de substituição tributária (Convênio ICMS 92/15).

## 📊 Estrutura da Tabela

### Campos Principais

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `codigo_ncm` | VARCHAR(8) | Código NCM com 8 dígitos (ex: 22021000) |
| `descricao_ncm` | TEXT | Descrição completa do NCM |
| `codigo_cest` | VARCHAR(7) | Código CEST com 7 dígitos (ex: 0300100) |
| `descricao_cest` | TEXT | Descrição específica do CEST |
| `especificacao_cest` | TEXT | Especificações adicionais (embalagem, capacidade) |
| `tem_substituicao_tributaria` | BOOLEAN | Se o produto tem ST |
| `categoria_st` | VARCHAR(100) | Categoria de ST (BEBIDAS, AUTOPEÇAS, etc.) |

### Campos de Organização

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `segmento_cest` | VARCHAR(2) | Primeiros 2 dígitos do CEST |
| `item_cest` | VARCHAR(3) | Dígitos 3-5 do CEST |
| `especificacao_item` | VARCHAR(2) | Últimos 2 dígitos do CEST |
| `unidade_medida` | VARCHAR(10) | Unidade padrão (UN, KG, L) |

## 🚀 Como Usar

### 1. Instalação

```sql
-- 1. Criar a tabela
\i database/migrations/create_ncm_table.sql

-- 2. Criar funções auxiliares
\i database/functions/ncm_functions.sql

-- 3. Inserir dados de exemplo
\i database/seeds/ncm_cest_data.sql
```

### 2. Consultas Básicas

#### Buscar CEST por NCM
```sql
SELECT * FROM buscar_cest_por_ncm('22021000');
```

#### Verificar se NCM tem ST
```sql
SELECT ncm_tem_substituicao_tributaria('22021000');
```

#### Validar NCM-CEST
```sql
SELECT validar_ncm_cest('22021000', '03.001.00');
```

## 🔧 Implementação no Frontend

### 1. Dropdown de NCM

```typescript
// Buscar NCM com indicação de ST
const { data: ncmList } = await supabase
  .from('ncm')
  .select('codigo_ncm, descricao_ncm, tem_substituicao_tributaria')
  .eq('ativo', true)
  .order('codigo_ncm');
```

### 2. Dropdown de CEST (baseado no NCM)

```typescript
// Buscar CEST para NCM selecionado
const { data: cestList } = await supabase
  .from('ncm')
  .select('codigo_cest, descricao_cest, especificacao_cest')
  .eq('codigo_ncm', ncmSelecionado)
  .not('codigo_cest', 'is', null)
  .eq('ativo', true)
  .order('codigo_cest');
```

### 3. Validação na Emissão NFe

```typescript
// Verificar se CEST é obrigatório
const { data } = await supabase.rpc('ncm_tem_substituicao_tributaria', {
  p_codigo_ncm: produto.ncm
});

if (data && !produto.cest) {
  throw new Error('CEST obrigatório para produtos com substituição tributária');
}

// Validar correspondência NCM-CEST
const { data: valido } = await supabase.rpc('validar_ncm_cest', {
  p_codigo_ncm: produto.ncm,
  p_codigo_cest: produto.cest
});

if (!valido) {
  throw new Error('CEST incompatível com o NCM informado');
}
```

## 📝 Exemplos Práticos

### Água Mineral (NCM 22021000)

```sql
-- Buscar todas as opções de CEST para água mineral
SELECT 
    codigo_cest,
    descricao_cest,
    especificacao_cest
FROM ncm 
WHERE codigo_ncm = '22021000'
  AND codigo_cest IS NOT NULL;

-- Resultado: 7 opções diferentes baseadas na embalagem
-- 03.001.00 - Garrafa de vidro até 500ml
-- 03.002.00 - Embalagem >= 5.000ml
-- 03.003.00 - Vidro não retornável até 300ml
-- etc.
```

### Produto sem ST

```sql
-- Verificar produto sem substituição tributária
SELECT * FROM ncm WHERE codigo_ncm = '20089900';

-- tem_substituicao_tributaria = FALSE
-- codigo_cest = NULL
```

## ⚠️ Regras Importantes

### 1. Obrigatoriedade do CEST
- **CEST é obrigatório** apenas para produtos com `tem_substituicao_tributaria = TRUE`
- **CEST deve ser NULL** para produtos sem substituição tributária

### 2. Validação SEFAZ
- A SEFAZ valida se o CEST informado é compatível com o NCM
- Use a função `validar_ncm_cest()` antes da emissão

### 3. Seleção do CEST Correto
- Um NCM pode ter múltiplos CEST
- Selecione baseado nas características específicas do produto:
  - Tipo de embalagem (vidro, plástico)
  - Capacidade (300ml, 500ml, 1.500ml)
  - Características especiais (retornável, gaseificado)

## 🔄 Manutenção

### Adicionar Novos NCM-CEST

```sql
INSERT INTO ncm (
    codigo_ncm, descricao_ncm, codigo_cest, descricao_cest,
    especificacao_cest, segmento_cest, item_cest, especificacao_item,
    tem_substituicao_tributaria, categoria_st, unidade_medida
) VALUES (
    '12345678', 'Descrição do produto',
    '01.001.00', 'Descrição do CEST',
    'Especificação adicional',
    '01', '001', '00',
    TRUE, 'CATEGORIA', 'UN'
);
```

### Atualizar Dados Existentes

```sql
UPDATE ncm 
SET descricao_cest = 'Nova descrição',
    updated_at = NOW()
WHERE codigo_ncm = '22021000' 
  AND codigo_cest = '03.001.00';
```

### Desativar Registros

```sql
UPDATE ncm 
SET ativo = FALSE,
    updated_at = NOW()
WHERE codigo_ncm = '12345678';
```

## 📚 Fontes Oficiais

- **Convênio ICMS 92/15** - Institui o CEST
- **Convênio ICMS 52/2017** - Atualizações da tabela
- **Manual NFe** - https://www.mjailton.com.br/manualnfe/
- **Documentação sped-nfe** - https://github.com/nfephp-org/sped-nfe

## 🎯 Benefícios

1. **Consulta Rápida** - Busca eficiente por NCM
2. **Validação Automática** - Verifica correspondência NCM-CEST
3. **Interface Amigável** - Dropdown com opções filtradas
4. **Conformidade Legal** - Baseado na legislação oficial
5. **Manutenção Fácil** - Estrutura organizada e documentada

## 🔍 Troubleshooting

### Problema: NCM não encontrado
```sql
-- Verificar se NCM existe na tabela
SELECT * FROM ncm WHERE codigo_ncm = 'SEU_NCM';
```

### Problema: CEST inválido para NCM
```sql
-- Verificar correspondência
SELECT validar_ncm_cest('SEU_NCM', 'SEU_CEST');
```

### Problema: Performance lenta
```sql
-- Verificar índices
\d+ ncm
```

---

**📞 Suporte**: Para dúvidas sobre implementação, consulte os exemplos em `database/examples/ncm_usage_examples.sql`
