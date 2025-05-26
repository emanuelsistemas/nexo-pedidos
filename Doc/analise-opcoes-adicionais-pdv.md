# 📊 Análise: Opções Adicionais no PDV

## 🔍 **Estrutura Atual das Opções Adicionais**

### **Hierarquia Identificada:**

```
grupos
└── produtos
    └── produtos_opcoes_adicionais (relaciona produto com opção)
        └── opcoes_adicionais (ex: "Tamanho", "Sabor", "Extras")
            └── opcoes_adicionais_itens (ex: "Grande", "Médio", "Pequeno")
                └── produtos_opcoes_adicionais_itens (relaciona produto com item específico)
```

### **📋 Tabelas Analisadas:**

#### **1. opcoes_adicionais** (Categorias de Opções)
- `id`, `nome`, `empresa_id`, `quantidade_minima`
- **Exemplo:** "Tamanho", "Sabor", "Extras"

#### **2. opcoes_adicionais_itens** (Itens das Opções)
- `id`, `nome`, `preco`, `opcao_id`
- **Exemplo:** "Grande (R$ 5,00)", "Médio (R$ 3,00)", "Pequeno (R$ 0,00)"

#### **3. produtos_opcoes_adicionais** (Produto → Opção)
- `id`, `produto_id`, `opcao_id`
- **Relaciona:** Pizza → Tamanho

#### **4. produtos_opcoes_adicionais_itens** (Produto → Item Específico)
- `id`, `produto_id`, `item_id`
- **Relaciona:** Pizza → Grande, Pizza → Médio

#### **5. pedidos_itens_adicionais** (Padrão Atual nos Pedidos)
- `id`, `pedido_item_id`, `item_adicional_id`, `quantidade`, `valor_unitario`

## 🎯 **Cenários de Uso no PDV**

### **Exemplo Prático:**
```
Produto: Pizza Margherita (R$ 25,00)
├── Tamanho (obrigatório)
│   ├── Pequena (R$ 0,00)
│   ├── Média (R$ 5,00)
│   └── Grande (R$ 10,00)
├── Extras (opcional)
│   ├── Queijo Extra (R$ 3,00)
│   ├── Azeitona (R$ 2,00)
│   └── Bacon (R$ 4,00)
└── Borda (opcional)
    ├── Catupiry (R$ 6,00)
    └── Cheddar (R$ 5,00)
```

**Venda no PDV:**
- Pizza Margherita Grande + Queijo Extra + Borda Catupiry
- **Cálculo:** R$ 25,00 + R$ 10,00 + R$ 3,00 + R$ 6,00 = **R$ 44,00**

## 🤔 **Opções de Implementação no PDV**

### **Opção 1: Tabelas Separadas (RECOMENDADA)**

#### **Vantagens:**
- ✅ **Consistência:** Segue o mesmo padrão dos pedidos
- ✅ **Normalização:** Estrutura bem organizada
- ✅ **Flexibilidade:** Fácil manutenção e consultas
- ✅ **Rastreabilidade:** Cada adicional é rastreável
- ✅ **Relatórios:** Relatórios detalhados por adicional
- ✅ **Performance:** Consultas otimizadas com índices

#### **Estrutura Proposta:**
```sql
-- Tabela para itens adicionais do PDV
CREATE TABLE pdv_itens_adicionais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  usuario_id UUID NOT NULL,
  pdv_item_id UUID NOT NULL, -- FK para pdv_itens

  -- Referência ao adicional
  item_adicional_id UUID NOT NULL, -- FK para opcoes_adicionais_itens
  nome_adicional TEXT NOT NULL, -- Cache do nome

  -- Valores
  quantidade NUMERIC(10,3) NOT NULL DEFAULT 1,
  valor_unitario NUMERIC(10,2) NOT NULL,
  valor_total NUMERIC(10,2) NOT NULL,

  -- Origem (para rastreabilidade)
  origem_adicional TEXT DEFAULT 'manual', -- 'manual', 'pedido_importado'
  pedido_item_adicional_origem_id UUID, -- Se veio de pedido

  -- Controle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Opção 2: Campo JSONB (NÃO RECOMENDADA)**

#### **Desvantagens:**
- ❌ **Consultas Complexas:** Difícil fazer relatórios
- ❌ **Performance:** Consultas em JSONB são mais lentas
- ❌ **Integridade:** Sem validação de FK
- ❌ **Manutenção:** Difícil de manter e debugar

## 🏗️ **Implementação Recomendada**

### **1. Criar Tabela PDV_ITENS_ADICIONAIS**

```sql
CREATE TABLE pdv_itens_adicionais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  pdv_item_id UUID NOT NULL REFERENCES pdv_itens(id) ON DELETE CASCADE,

  -- Adicional
  item_adicional_id UUID NOT NULL REFERENCES opcoes_adicionais_itens(id),
  nome_adicional TEXT NOT NULL,

  -- Valores
  quantidade NUMERIC(10,3) NOT NULL DEFAULT 1,
  valor_unitario NUMERIC(10,2) NOT NULL,
  valor_total NUMERIC(10,2) NOT NULL,

  -- Origem
  origem_adicional TEXT DEFAULT 'manual',
  pedido_item_adicional_origem_id UUID REFERENCES pedidos_itens_adicionais(id),

  -- Controle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **2. Índices para Performance**

```sql
CREATE INDEX idx_pdv_itens_adicionais_empresa_id ON pdv_itens_adicionais(empresa_id);
CREATE INDEX idx_pdv_itens_adicionais_pdv_item_id ON pdv_itens_adicionais(pdv_item_id);
CREATE INDEX idx_pdv_itens_adicionais_item_adicional_id ON pdv_itens_adicionais(item_adicional_id);
CREATE INDEX idx_pdv_itens_adicionais_origem ON pdv_itens_adicionais(origem_adicional);
```

### **3. Constraints de Validação**

```sql
ALTER TABLE pdv_itens_adicionais ADD CONSTRAINT chk_pdv_itens_adicionais_origem
CHECK (origem_adicional IN ('manual', 'pedido_importado'));

ALTER TABLE pdv_itens_adicionais ADD CONSTRAINT chk_pdv_itens_adicionais_quantidade_positiva
CHECK (quantidade > 0);

ALTER TABLE pdv_itens_adicionais ADD CONSTRAINT chk_pdv_itens_adicionais_valor_positivo
CHECK (valor_unitario >= 0);
```

## 📊 **Benefícios da Implementação**

### **1. Rastreabilidade Completa**
- Cada adicional pode ser rastreado até sua origem
- Relatórios detalhados de vendas por adicional
- Controle de estoque de adicionais (se necessário)

### **2. Importação de Pedidos**
- Adicionais dos pedidos são preservados
- Relacionamento mantido com pedido original
- Possibilidade de editar adicionais no PDV

### **3. Relatórios Avançados**
```sql
-- Relatório: Adicionais mais vendidos
SELECT
  nome_adicional,
  SUM(quantidade) as quantidade_total,
  SUM(valor_total) as valor_total
FROM pdv_itens_adicionais
WHERE empresa_id = 'empresa-uuid'
GROUP BY nome_adicional
ORDER BY quantidade_total DESC;
```

### **4. Cálculo de Totais**
```sql
-- Total do item com adicionais
SELECT
  pi.nome_produto,
  pi.valor_total_item as valor_produto,
  COALESCE(SUM(pia.valor_total), 0) as valor_adicionais,
  pi.valor_total_item + COALESCE(SUM(pia.valor_total), 0) as valor_final
FROM pdv_itens pi
LEFT JOIN pdv_itens_adicionais pia ON pi.id = pia.pdv_item_id
WHERE pi.pdv_id = 'pdv-uuid'
GROUP BY pi.id, pi.nome_produto, pi.valor_total_item;
```

## 🚀 **Próximos Passos**

1. **Criar tabela pdv_itens_adicionais**
2. **Implementar relacionamentos e índices**
3. **Atualizar frontend do PDV** para suportar adicionais
4. **Implementar importação** de adicionais dos pedidos
5. **Criar relatórios** específicos para adicionais
6. **Testar integração** completa

## 💡 **Considerações Importantes**

### **Performance:**
- Índices otimizados para consultas frequentes
- Desnormalização controlada (cache do nome)

### **Integridade:**
- FKs garantem consistência
- Constraints validam dados

### **Flexibilidade:**
- Estrutura permite futuras expansões
- Compatível com sistema de pedidos existente

---

## ✅ **IMPLEMENTAÇÃO CONCLUÍDA**

**Data:** 30/01/2025
**Status:** ✅ Tabela `pdv_itens_adicionais` Criada com Sucesso
**Migração:** `20250130000001_add_pdv_itens_adicionais.sql`

### **📋 Estrutura Implementada:**
- ✅ **Tabela:** pdv_itens_adicionais criada
- ✅ **Campos:** Todos os campos necessários implementados
- ✅ **Relacionamentos:** FKs para pdv_itens, opcoes_adicionais_itens, pedidos_itens_adicionais
- ✅ **Índices:** 8 índices criados para performance otimizada
- ✅ **Constraints:** 5 constraints de validação implementadas
- ✅ **Triggers:** Trigger para updated_at automático
- ✅ **Funções:** Função para calcular valor total com adicionais
- ✅ **Documentação:** Comentários em tabela e campos principais
- ✅ **Soft Delete:** Suporte completo a exclusão lógica

### **🔗 Relacionamentos Criados:**
- ✅ pdv_itens_adicionais → empresas (empresa_id)
- ✅ pdv_itens_adicionais → usuarios (usuario_id)
- ✅ pdv_itens_adicionais → pdv_itens (pdv_item_id) ON DELETE CASCADE
- ✅ pdv_itens_adicionais → opcoes_adicionais_itens (item_adicional_id)
- ✅ pdv_itens_adicionais → pedidos_itens_adicionais (origem)
- ✅ pdv_itens_adicionais → usuarios (deletado_por)

### **📊 Funcionalidades Disponíveis:**
- ✅ **Rastreabilidade:** Origem manual ou importada de pedidos
- ✅ **Cálculo Automático:** Função `calcular_valor_total_item_pdv()`
- ✅ **Performance:** Índices otimizados para consultas frequentes
- ✅ **Integridade:** Constraints garantem dados válidos
- ✅ **Auditoria:** Controle completo de criação, edição e exclusão

### **💡 Exemplo Prático de Uso:**

```sql
-- 1. Inserir item principal no PDV
INSERT INTO pdv_itens (
  empresa_id, usuario_id, pdv_id, produto_id,
  nome_produto, quantidade, valor_unitario, valor_total_item
) VALUES (
  'empresa-uuid', 'usuario-uuid', 'pdv-uuid', 'pizza-uuid',
  'Pizza Margherita', 1, 25.00, 25.00
) RETURNING id as pdv_item_id;

-- 2. Adicionar opções adicionais
INSERT INTO pdv_itens_adicionais (
  empresa_id, usuario_id, pdv_item_id, item_adicional_id,
  nome_adicional, quantidade, valor_unitario, valor_total
) VALUES
  ('empresa-uuid', 'usuario-uuid', 'pdv-item-uuid', 'tamanho-grande-uuid',
   'Tamanho Grande', 1, 10.00, 10.00),
  ('empresa-uuid', 'usuario-uuid', 'pdv-item-uuid', 'queijo-extra-uuid',
   'Queijo Extra', 1, 3.00, 3.00),
  ('empresa-uuid', 'usuario-uuid', 'pdv-item-uuid', 'borda-catupiry-uuid',
   'Borda Catupiry', 1, 6.00, 6.00);

-- 3. Calcular valor total do item (produto + adicionais)
SELECT calcular_valor_total_item_pdv('pdv-item-uuid'); -- Retorna: 44.00
```

### **📊 Consultas Úteis:**

```sql
-- Listar item com seus adicionais
SELECT
  pi.nome_produto,
  pi.valor_total_item as valor_produto,
  pia.nome_adicional,
  pia.valor_total as valor_adicional
FROM pdv_itens pi
LEFT JOIN pdv_itens_adicionais pia ON pi.id = pia.pdv_item_id
WHERE pi.pdv_id = 'pdv-uuid' AND pia.deletado = FALSE;

-- Relatório de adicionais mais vendidos
SELECT
  nome_adicional,
  COUNT(*) as vezes_vendido,
  SUM(quantidade) as quantidade_total,
  SUM(valor_total) as receita_total
FROM pdv_itens_adicionais
WHERE empresa_id = 'empresa-uuid'
  AND deletado = FALSE
  AND created_at >= '2025-01-01'
GROUP BY nome_adicional
ORDER BY receita_total DESC;
```

### **🚀 Próximos Passos:**
1. **Atualizar Frontend PDV** para suportar adicionais
2. **Implementar Importação** de adicionais dos pedidos
3. **Criar Relatórios** específicos para adicionais
4. **Testar Integração** completa

**Recomendação Final:** ✅ **IMPLEMENTADO - Tabela separada `pdv_itens_adicionais`**
**Motivo:** Consistência, performance e flexibilidade superiores ✅ **CONFIRMADO**
