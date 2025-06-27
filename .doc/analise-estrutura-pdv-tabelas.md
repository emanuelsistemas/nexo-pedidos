# 📊 Análise Completa: Estrutura das Tabelas PDV e PDV_ITENS

## 🔍 **Análise do PDV Atual**

### **Dados Processados no PDV:**

1. **Carrinho de Compras**
   - Produtos selecionados
   - Quantidades
   - Preços unitários e subtotais
   - Descontos aplicados
   - Origem dos itens (manual ou importado de pedidos)

2. **Cliente e Endereço**
   - Cliente selecionado
   - Dados de entrega
   - Descontos específicos do cliente

3. **Pedidos Importados**
   - Múltiplos pedidos podem ser importados
   - Preservação da origem dos itens
   - Descontos originais dos pedidos

4. **Formas de Pagamento**
   - Pagamento à vista ou parcial
   - Múltiplas formas de pagamento
   - Controle de troco

5. **Configurações e Controles**
   - Configurações específicas do PDV
   - Controle de estoque
   - Dados fiscais (CPF/CNPJ)

## 🏗️ **Estrutura Proposta**

### **📋 TABELA: `pdv`** (Cabeçalho da Venda)

```sql
CREATE TABLE pdv (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  usuario_id UUID NOT NULL,

  -- Identificação da Venda
  numero_venda TEXT NOT NULL,
  data_venda TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status_venda TEXT DEFAULT 'aberta', -- 'aberta', 'finalizada', 'cancelada'

  -- Cliente
  cliente_id UUID,
  nome_cliente TEXT,
  telefone_cliente TEXT,
  documento_cliente TEXT,
  tipo_documento_cliente TEXT, -- 'cpf', 'cnpj'

  -- Endereço de Entrega
  cep_entrega TEXT,
  rua_entrega TEXT,
  numero_entrega TEXT,
  complemento_entrega TEXT,
  bairro_entrega TEXT,
  cidade_entrega TEXT,
  estado_entrega TEXT,

  -- Valores
  valor_subtotal NUMERIC(10,2) DEFAULT 0,
  valor_desconto NUMERIC(10,2) DEFAULT 0,
  valor_acrescimo NUMERIC(10,2) DEFAULT 0,
  valor_entrega NUMERIC(10,2) DEFAULT 0,
  valor_total NUMERIC(10,2) NOT NULL,

  -- Descontos Aplicados
  desconto_prazo_id UUID,
  desconto_valor_id UUID,
  percentual_desconto NUMERIC(5,2),

  -- Pagamento
  tipo_pagamento TEXT, -- 'vista', 'parcial'
  forma_pagamento_id UUID,
  formas_pagamento JSONB, -- Para pagamentos parciais
  valor_pago NUMERIC(10,2) DEFAULT 0,
  valor_troco NUMERIC(10,2) DEFAULT 0,
  parcelas INTEGER,

  -- Pedidos Importados
  pedidos_importados JSONB, -- Array com IDs dos pedidos importados

  -- Observações
  observacao_venda TEXT,
  observacao_entrega TEXT,

  -- Controle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finalizada_em TIMESTAMP WITH TIME ZONE,
  cancelada_em TIMESTAMP WITH TIME ZONE,
  motivo_cancelamento TEXT
);
```

### **📦 TABELA: `pdv_itens`** (Itens da Venda)

```sql
CREATE TABLE pdv_itens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  usuario_id UUID NOT NULL,
  pdv_id UUID NOT NULL,

  -- Produto
  produto_id UUID NOT NULL,
  codigo_produto TEXT,
  nome_produto TEXT NOT NULL,
  descricao_produto TEXT,

  -- Quantidades e Valores
  quantidade NUMERIC(10,3) NOT NULL, -- Suporta decimais para KG
  valor_unitario NUMERIC(10,2) NOT NULL,
  valor_subtotal NUMERIC(10,2) NOT NULL,
  valor_desconto_item NUMERIC(10,2) DEFAULT 0,
  valor_total_item NUMERIC(10,2) NOT NULL,

  -- Desconto no Item
  tem_desconto BOOLEAN DEFAULT FALSE,
  tipo_desconto TEXT, -- 'percentual', 'valor'
  percentual_desconto NUMERIC(5,2),
  valor_desconto_aplicado NUMERIC(10,2),
  origem_desconto TEXT, -- 'manual', 'promocao', 'pedido_importado'

  -- Origem do Item
  origem_item TEXT DEFAULT 'manual', -- 'manual', 'pedido_importado'
  pedido_origem_id UUID, -- Se veio de pedido importado
  pedido_origem_numero TEXT,
  pedidos_itens_origem_id UUID, -- ID original do item no pedido

  -- Agrupamento (quando itens iguais são agrupados)
  agrupado_com JSONB, -- Array com informações dos pedidos agrupados

  -- Observações
  observacao_item TEXT,

  -- Controle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔗 **Relacionamentos e Índices**

### **Chaves Estrangeiras:**
```sql
-- PDV
ALTER TABLE pdv ADD CONSTRAINT fk_pdv_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id);
ALTER TABLE pdv ADD CONSTRAINT fk_pdv_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
ALTER TABLE pdv ADD CONSTRAINT fk_pdv_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id);

-- PDV_ITENS
ALTER TABLE pdv_itens ADD CONSTRAINT fk_pdv_itens_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id);
ALTER TABLE pdv_itens ADD CONSTRAINT fk_pdv_itens_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
ALTER TABLE pdv_itens ADD CONSTRAINT fk_pdv_itens_pdv FOREIGN KEY (pdv_id) REFERENCES pdv(id) ON DELETE CASCADE;
ALTER TABLE pdv_itens ADD CONSTRAINT fk_pdv_itens_produto FOREIGN KEY (produto_id) REFERENCES produtos(id);
```

### **Índices para Performance:**
```sql
-- PDV
CREATE INDEX idx_pdv_empresa_id ON pdv(empresa_id);
CREATE INDEX idx_pdv_usuario_id ON pdv(usuario_id);
CREATE INDEX idx_pdv_data_venda ON pdv(data_venda);
CREATE INDEX idx_pdv_status ON pdv(status_venda);
CREATE INDEX idx_pdv_numero ON pdv(numero_venda);

-- PDV_ITENS
CREATE INDEX idx_pdv_itens_empresa_id ON pdv_itens(empresa_id);
CREATE INDEX idx_pdv_itens_pdv_id ON pdv_itens(pdv_id);
CREATE INDEX idx_pdv_itens_produto_id ON pdv_itens(produto_id);
CREATE INDEX idx_pdv_itens_origem ON pdv_itens(origem_item);
```

## 🤔 **Questão: Pedidos Importados**

### **Opção 1: Manter Relacionamento com Pedidos (RECOMENDADA)**
- ✅ **Vantagens:**
  - Rastreabilidade completa
  - Relatórios detalhados de origem
  - Auditoria de vendas vs pedidos
  - Controle de status dos pedidos originais

- ❌ **Desvantagens:**
  - Estrutura um pouco mais complexa
  - Dependência das tabelas de pedidos

### **Opção 2: Migrar Dados Completamente**
- ✅ **Vantagens:**
  - Estrutura mais simples
  - Independência total

- ❌ **Desvantagens:**
  - Perda de rastreabilidade
  - Dificuldade em relatórios de origem
  - Problemas para auditoria

## 🎯 **Recomendação Final**

### **MANTER RELACIONAMENTO COM PEDIDOS** por:

1. **Rastreabilidade:** Saber sempre de onde veio cada item
2. **Relatórios:** Poder gerar relatórios como:
   - "Vendas originadas de pedidos vs vendas diretas"
   - "Performance de conversão de pedidos"
   - "Análise de tempo entre pedido e venda"

3. **Auditoria:** Controle completo do fluxo
4. **Status:** Atualizar status dos pedidos quando vendidos

### **Campos Específicos para Pedidos Importados:**
```sql
-- Na tabela pdv_itens
pedido_origem_id UUID,
pedido_origem_numero TEXT,
pedidos_itens_origem_id UUID,
agrupado_com JSONB -- Para itens de múltiplos pedidos agrupados
```

## 📊 **Benefícios da Estrutura Proposta**

1. **Relatórios Completos:** Todas as informações necessárias
2. **Performance:** Índices otimizados
3. **Flexibilidade:** Suporta todos os cenários do PDV
4. **Rastreabilidade:** Origem de cada item preservada
5. **Escalabilidade:** Estrutura preparada para crescimento
6. **Auditoria:** Controle completo de mudanças

## 🚀 **Próximos Passos**

1. **Criar campos adicionais** nas tabelas existentes
2. **Implementar triggers** para atualização automática
3. **Criar views** para relatórios
4. **Testar migração** de dados existentes
5. **Implementar no frontend** a nova estrutura

## 💡 **Exemplos Práticos**

### **Cenário 1: Venda Direta (sem pedido importado)**
```sql
-- PDV
INSERT INTO pdv (empresa_id, usuario_id, numero_venda, cliente_id, valor_total, tipo_pagamento)
VALUES ('empresa-uuid', 'usuario-uuid', 'PDV-001', 'cliente-uuid', 150.00, 'vista');

-- PDV_ITENS
INSERT INTO pdv_itens (empresa_id, usuario_id, pdv_id, produto_id, nome_produto, quantidade, valor_unitario, valor_total_item, origem_item)
VALUES ('empresa-uuid', 'usuario-uuid', 'pdv-uuid', 'produto-uuid', 'Pizza Margherita', 2, 75.00, 150.00, 'manual');
```

### **Cenário 2: Venda com Pedido Importado**
```sql
-- PDV (com referência ao pedido)
INSERT INTO pdv (empresa_id, usuario_id, numero_venda, cliente_id, valor_total, pedidos_importados)
VALUES ('empresa-uuid', 'usuario-uuid', 'PDV-002', 'cliente-uuid', 200.00, '["pedido-uuid-1", "pedido-uuid-2"]');

-- PDV_ITENS (com origem do pedido)
INSERT INTO pdv_itens (
  empresa_id, usuario_id, pdv_id, produto_id, nome_produto,
  quantidade, valor_unitario, valor_total_item,
  origem_item, pedido_origem_id, pedido_origem_numero, pedidos_itens_origem_id
)
VALUES (
  'empresa-uuid', 'usuario-uuid', 'pdv-uuid', 'produto-uuid', 'Pizza Calabresa',
  1, 80.00, 80.00,
  'pedido_importado', 'pedido-uuid-1', 'PED-123', 'item-original-uuid'
);
```

### **Cenário 3: Item Agrupado de Múltiplos Pedidos**
```sql
-- PDV_ITENS (item agrupado)
INSERT INTO pdv_itens (
  empresa_id, usuario_id, pdv_id, produto_id, nome_produto,
  quantidade, valor_unitario, valor_total_item,
  origem_item, agrupado_com
)
VALUES (
  'empresa-uuid', 'usuario-uuid', 'pdv-uuid', 'produto-uuid', 'Refrigerante 2L',
  3, 8.00, 24.00,
  'pedido_importado',
  '[
    {"pedido_id": "ped-1", "numero": "PED-123", "quantidade": 1},
    {"pedido_id": "ped-2", "numero": "PED-124", "quantidade": 2}
  ]'
);
```

## 📈 **Queries de Relatórios**

### **Relatório: Vendas por Origem**
```sql
SELECT
  origem_item,
  COUNT(*) as total_itens,
  SUM(quantidade) as quantidade_total,
  SUM(valor_total_item) as valor_total
FROM pdv_itens
WHERE empresa_id = 'empresa-uuid'
  AND created_at >= '2024-01-01'
GROUP BY origem_item;
```

### **Relatório: Performance de Conversão de Pedidos**
```sql
SELECT
  p.numero as numero_pedido,
  p.valor_total as valor_pedido,
  COALESCE(SUM(pi.valor_total_item), 0) as valor_vendido,
  CASE
    WHEN SUM(pi.valor_total_item) > 0 THEN 'Convertido'
    ELSE 'Não Convertido'
  END as status_conversao
FROM pedidos p
LEFT JOIN pdv_itens pi ON p.id = pi.pedido_origem_id
WHERE p.empresa_id = 'empresa-uuid'
  AND p.created_at >= '2024-01-01'
GROUP BY p.id, p.numero, p.valor_total;
```

### **Relatório: Vendas Detalhadas**
```sql
SELECT
  pdv.numero_venda,
  pdv.data_venda,
  pdv.nome_cliente,
  pi.nome_produto,
  pi.quantidade,
  pi.valor_unitario,
  pi.valor_total_item,
  pi.origem_item,
  pi.pedido_origem_numero
FROM pdv
JOIN pdv_itens pi ON pdv.id = pi.pdv_id
WHERE pdv.empresa_id = 'empresa-uuid'
  AND pdv.data_venda >= '2024-01-01'
ORDER BY pdv.data_venda DESC, pdv.numero_venda;
```

## 🔧 **Scripts de Implementação**

### **1. Adicionar Campos na Tabela PDV Existente**
```sql
-- Campos de identificação
ALTER TABLE pdv ADD COLUMN numero_venda TEXT;
ALTER TABLE pdv ADD COLUMN data_venda TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE pdv ADD COLUMN status_venda TEXT DEFAULT 'aberta';

-- Campos de cliente
ALTER TABLE pdv ADD COLUMN cliente_id UUID;
ALTER TABLE pdv ADD COLUMN nome_cliente TEXT;
ALTER TABLE pdv ADD COLUMN telefone_cliente TEXT;
ALTER TABLE pdv ADD COLUMN documento_cliente TEXT;
ALTER TABLE pdv ADD COLUMN tipo_documento_cliente TEXT;

-- Campos de endereço
ALTER TABLE pdv ADD COLUMN cep_entrega TEXT;
ALTER TABLE pdv ADD COLUMN rua_entrega TEXT;
ALTER TABLE pdv ADD COLUMN numero_entrega TEXT;
ALTER TABLE pdv ADD COLUMN complemento_entrega TEXT;
ALTER TABLE pdv ADD COLUMN bairro_entrega TEXT;
ALTER TABLE pdv ADD COLUMN cidade_entrega TEXT;
ALTER TABLE pdv ADD COLUMN estado_entrega TEXT;

-- Campos de valores
ALTER TABLE pdv ADD COLUMN valor_subtotal NUMERIC(10,2) DEFAULT 0;
ALTER TABLE pdv ADD COLUMN valor_desconto NUMERIC(10,2) DEFAULT 0;
ALTER TABLE pdv ADD COLUMN valor_acrescimo NUMERIC(10,2) DEFAULT 0;
ALTER TABLE pdv ADD COLUMN valor_entrega NUMERIC(10,2) DEFAULT 0;
ALTER TABLE pdv ADD COLUMN valor_total NUMERIC(10,2);

-- Campos de desconto
ALTER TABLE pdv ADD COLUMN desconto_prazo_id UUID;
ALTER TABLE pdv ADD COLUMN desconto_valor_id UUID;
ALTER TABLE pdv ADD COLUMN percentual_desconto NUMERIC(5,2);

-- Campos de pagamento
ALTER TABLE pdv ADD COLUMN tipo_pagamento TEXT;
ALTER TABLE pdv ADD COLUMN forma_pagamento_id UUID;
ALTER TABLE pdv ADD COLUMN formas_pagamento JSONB;
ALTER TABLE pdv ADD COLUMN valor_pago NUMERIC(10,2) DEFAULT 0;
ALTER TABLE pdv ADD COLUMN valor_troco NUMERIC(10,2) DEFAULT 0;
ALTER TABLE pdv ADD COLUMN parcelas INTEGER;

-- Campos de pedidos importados
ALTER TABLE pdv ADD COLUMN pedidos_importados JSONB;

-- Campos de observação
ALTER TABLE pdv ADD COLUMN observacao_venda TEXT;
ALTER TABLE pdv ADD COLUMN observacao_entrega TEXT;

-- Campos de controle
ALTER TABLE pdv ADD COLUMN finalizada_em TIMESTAMP WITH TIME ZONE;
ALTER TABLE pdv ADD COLUMN cancelada_em TIMESTAMP WITH TIME ZONE;
ALTER TABLE pdv ADD COLUMN motivo_cancelamento TEXT;
```

### **2. Adicionar Campos na Tabela PDV_ITENS Existente**
```sql
-- Campos de produto
ALTER TABLE pdv_itens ADD COLUMN produto_id UUID;
ALTER TABLE pdv_itens ADD COLUMN codigo_produto TEXT;
ALTER TABLE pdv_itens ADD COLUMN nome_produto TEXT;
ALTER TABLE pdv_itens ADD COLUMN descricao_produto TEXT;

-- Campos de quantidade e valores
ALTER TABLE pdv_itens ADD COLUMN quantidade NUMERIC(10,3);
ALTER TABLE pdv_itens ADD COLUMN valor_unitario NUMERIC(10,2);
ALTER TABLE pdv_itens ADD COLUMN valor_subtotal NUMERIC(10,2);
ALTER TABLE pdv_itens ADD COLUMN valor_desconto_item NUMERIC(10,2) DEFAULT 0;
ALTER TABLE pdv_itens ADD COLUMN valor_total_item NUMERIC(10,2);

-- Campos de desconto
ALTER TABLE pdv_itens ADD COLUMN tem_desconto BOOLEAN DEFAULT FALSE;
ALTER TABLE pdv_itens ADD COLUMN tipo_desconto TEXT;
ALTER TABLE pdv_itens ADD COLUMN percentual_desconto NUMERIC(5,2);
ALTER TABLE pdv_itens ADD COLUMN valor_desconto_aplicado NUMERIC(10,2);
ALTER TABLE pdv_itens ADD COLUMN origem_desconto TEXT;

-- Campos de origem
ALTER TABLE pdv_itens ADD COLUMN origem_item TEXT DEFAULT 'manual';
ALTER TABLE pdv_itens ADD COLUMN pedido_origem_id UUID;
ALTER TABLE pdv_itens ADD COLUMN pedido_origem_numero TEXT;
ALTER TABLE pdv_itens ADD COLUMN pedidos_itens_origem_id UUID;
ALTER TABLE pdv_itens ADD COLUMN agrupado_com JSONB;

-- Campos de observação
ALTER TABLE pdv_itens ADD COLUMN observacao_item TEXT;
```

---

## ✅ **IMPLEMENTAÇÃO CONCLUÍDA**

**Data:** 30/01/2025
**Status:** ✅ Estrutura Completa Implementada no Banco de Dados
**Migração:** `20250130000000_update_pdv_structure.sql`

### **📋 Campos Implementados na Tabela PDV:**
- ✅ **Identificação:** numero_venda, data_venda, status_venda
- ✅ **Cliente:** cliente_id, nome_cliente, telefone_cliente, documento_cliente, tipo_documento_cliente
- ✅ **Endereço:** cep_entrega, rua_entrega, numero_entrega, complemento_entrega, bairro_entrega, cidade_entrega, estado_entrega
- ✅ **Valores:** valor_subtotal, valor_desconto, valor_acrescimo, valor_entrega, valor_total
- ✅ **Desconto:** desconto_prazo_id, desconto_valor_id, percentual_desconto
- ✅ **Pagamento:** tipo_pagamento, forma_pagamento_id, formas_pagamento, valor_pago, valor_troco, parcelas
- ✅ **Pedidos:** pedidos_importados (JSONB)
- ✅ **Observações:** observacao_venda, observacao_entrega
- ✅ **Controle:** finalizada_em, cancelada_em, motivo_cancelamento

### **📦 Campos Implementados na Tabela PDV_ITENS:**
- ✅ **Produto:** produto_id, codigo_produto, nome_produto, descricao_produto
- ✅ **Quantidades:** quantidade (NUMERIC 10,3), valor_unitario, valor_subtotal, valor_total_item
- ✅ **Desconto:** tem_desconto, tipo_desconto, percentual_desconto, valor_desconto_aplicado, origem_desconto
- ✅ **Origem:** origem_item, pedido_origem_id, pedido_origem_numero, pedidos_itens_origem_id
- ✅ **Agrupamento:** agrupado_com (JSONB)
- ✅ **Observação:** observacao_item

### **🔗 Relacionamentos Criados:**
- ✅ PDV → Clientes (cliente_id)
- ✅ PDV → Formas Pagamento PDV (forma_pagamento_id)
- ✅ PDV_ITENS → PDV (pdv_id) ON DELETE CASCADE
- ✅ PDV_ITENS → Produtos (produto_id)
- ✅ PDV_ITENS → Pedidos (pedido_origem_id)
- ✅ PDV_ITENS → Pedidos Itens (pedidos_itens_origem_id)

### **📊 Índices Criados:**
- ✅ PDV: empresa_id, usuario_id, data_venda, status_venda, numero_venda, cliente_id
- ✅ PDV_ITENS: empresa_id, pdv_id, produto_id, origem_item, pedido_origem_id

### **✅ Constraints de Validação:**
- ✅ Status venda: 'aberta', 'finalizada', 'cancelada'
- ✅ Tipo documento: 'cpf', 'cnpj'
- ✅ Tipo pagamento: 'vista', 'parcial'
- ✅ Origem item: 'manual', 'pedido_importado'
- ✅ Tipo desconto: 'percentual', 'valor'
- ✅ Origem desconto: 'manual', 'promocao', 'pedido_importado'
- ✅ Quantidade e valores positivos

### **📝 Documentação:**
- ✅ Comentários em todas as tabelas e campos principais
- ✅ Estrutura preparada para rastreabilidade completa
- ✅ Suporte a agrupamento de itens via JSONB
- ✅ Campos em português conforme solicitado

**Recomendação:** Manter relacionamento com pedidos ✅ **IMPLEMENTADO**
**Campos:** Nomes em português ✅ **IMPLEMENTADO**
**Scripts:** ✅ **EXECUTADOS COM SUCESSO**
