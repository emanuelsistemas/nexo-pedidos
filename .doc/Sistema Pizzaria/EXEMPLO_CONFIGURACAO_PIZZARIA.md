# 🍕 EXEMPLO PRÁTICO - CONFIGURAÇÃO DE PIZZARIA

## 📋 **CENÁRIO: PIZZARIA "BELLA NAPOLI"**

Vamos configurar uma pizzaria completa com:
- 4 tamanhos de pizza
- 8 sabores diferentes
- 3 tipos de borda
- Sistema meio a meio
- Preços diferenciados

## 🗄️ **PASSO 1: DADOS INICIAIS**

### **1.1 Criar Produto Base**
```sql
INSERT INTO produtos (
  empresa_id, 
  nome, 
  codigo, 
  preco, 
  grupo_id, 
  tipo_produto,
  ncm,
  cfop,
  ativo
) VALUES (
  'acd26a4f-7220-405e-9c96-faffb7e6480e', -- empresa_id
  'Pizza',
  'PIZZA-BASE',
  0.00, -- Preço será definido pelas variações
  (SELECT id FROM grupos WHERE nome = 'Pizzas' LIMIT 1),
  'pizza_base',
  '19059090', -- NCM para produtos de padaria
  '5102',
  true
);
```

### **1.2 Criar Opções Adicionais**

#### **Tamanhos:**
```sql
-- Criar opção "Tamanhos"
INSERT INTO opcoes_adicionais (empresa_id, nome) 
VALUES ('acd26a4f-7220-405e-9c96-faffb7e6480e', 'Tamanhos de Pizza');

-- Itens de tamanho
INSERT INTO opcoes_adicionais_itens (empresa_id, opcao_id, nome, preco) VALUES
('acd26a4f-7220-405e-9c96-faffb7e6480e', (SELECT id FROM opcoes_adicionais WHERE nome = 'Tamanhos de Pizza'), 'Pequena (25cm)', 0.00),
('acd26a4f-7220-405e-9c96-faffb7e6480e', (SELECT id FROM opcoes_adicionais WHERE nome = 'Tamanhos de Pizza'), 'Média (30cm)', 0.00),
('acd26a4f-7220-405e-9c96-faffb7e6480e', (SELECT id FROM opcoes_adicionais WHERE nome = 'Tamanhos de Pizza'), 'Grande (35cm)', 0.00),
('acd26a4f-7220-405e-9c96-faffb7e6480e', (SELECT id FROM opcoes_adicionais WHERE nome = 'Tamanhos de Pizza'), 'Família (40cm)', 0.00);
```

#### **Sabores:**
```sql
-- Criar opção "Sabores"
INSERT INTO opcoes_adicionais (empresa_id, nome) 
VALUES ('acd26a4f-7220-405e-9c96-faffb7e6480e', 'Sabores de Pizza');

-- Itens de sabores
INSERT INTO opcoes_adicionais_itens (empresa_id, opcao_id, nome, preco) VALUES
('acd26a4f-7220-405e-9c96-faffb7e6480e', (SELECT id FROM opcoes_adicionais WHERE nome = 'Sabores de Pizza'), 'Margherita', 0.00),
('acd26a4f-7220-405e-9c96-faffb7e6480e', (SELECT id FROM opcoes_adicionais WHERE nome = 'Sabores de Pizza'), 'Calabresa', 0.00),
('acd26a4f-7220-405e-9c96-faffb7e6480e', (SELECT id FROM opcoes_adicionais WHERE nome = 'Sabores de Pizza'), 'Portuguesa', 2.00),
('acd26a4f-7220-405e-9c96-faffb7e6480e', (SELECT id FROM opcoes_adicionais WHERE nome = 'Sabores de Pizza'), 'Frango com Catupiry', 3.00),
('acd26a4f-7220-405e-9c96-faffb7e6480e', (SELECT id FROM opcoes_adicionais WHERE nome = 'Sabores de Pizza'), 'Quatro Queijos', 4.00),
('acd26a4f-7220-405e-9c96-faffb7e6480e', (SELECT id FROM opcoes_adicionais WHERE nome = 'Sabores de Pizza'), 'Pepperoni', 5.00),
('acd26a4f-7220-405e-9c96-faffb7e6480e', (SELECT id FROM opcoes_adicionais WHERE nome = 'Sabores de Pizza'), 'Camarão', 8.00),
('acd26a4f-7220-405e-9c96-faffb7e6480e', (SELECT id FROM opcoes_adicionais WHERE nome = 'Sabores de Pizza'), 'Salmão', 12.00);
```

#### **Bordas:**
```sql
-- Criar opção "Bordas"
INSERT INTO opcoes_adicionais (empresa_id, nome) 
VALUES ('acd26a4f-7220-405e-9c96-faffb7e6480e', 'Bordas de Pizza');

-- Itens de bordas
INSERT INTO opcoes_adicionais_itens (empresa_id, opcao_id, nome, preco) VALUES
('acd26a4f-7220-405e-9c96-faffb7e6480e', (SELECT id FROM opcoes_adicionais WHERE nome = 'Bordas de Pizza'), 'Tradicional', 0.00),
('acd26a4f-7220-405e-9c96-faffb7e6480e', (SELECT id FROM opcoes_adicionais WHERE nome = 'Bordas de Pizza'), 'Catupiry', 5.00),
('acd26a4f-7220-405e-9c96-faffb7e6480e', (SELECT id FROM opcoes_adicionais WHERE nome = 'Bordas de Pizza'), 'Cheddar', 6.00);
```

## 🍕 **PASSO 2: CRIAR VARIAÇÕES DE PIZZA**

### **2.1 Pizza Pequena**
```sql
INSERT INTO produto_variacoes (
  empresa_id,
  produto_base_id,
  nome,
  codigo,
  preco,
  permite_meio_a_meio,
  max_sabores,
  preco_sabor_adicional,
  ncm,
  cfop
) VALUES (
  'acd26a4f-7220-405e-9c96-faffb7e6480e',
  (SELECT id FROM produtos WHERE codigo = 'PIZZA-BASE'),
  'Pizza Pequena (25cm)',
  'PIZZA-P',
  25.00,
  true,
  2, -- Máximo 2 sabores
  3.00, -- R$ 3,00 por sabor adicional
  '19059090',
  '5102'
);
```

### **2.2 Pizza Média**
```sql
INSERT INTO produto_variacoes (
  empresa_id,
  produto_base_id,
  nome,
  codigo,
  preco,
  permite_meio_a_meio,
  max_sabores,
  preco_sabor_adicional,
  ncm,
  cfop
) VALUES (
  'acd26a4f-7220-405e-9c96-faffb7e6480e',
  (SELECT id FROM produtos WHERE codigo = 'PIZZA-BASE'),
  'Pizza Média (30cm)',
  'PIZZA-M',
  35.00,
  true,
  2,
  4.00,
  '19059090',
  '5102'
);
```

### **2.3 Pizza Grande**
```sql
INSERT INTO produto_variacoes (
  empresa_id,
  produto_base_id,
  nome,
  codigo,
  preco,
  permite_meio_a_meio,
  max_sabores,
  preco_sabor_adicional,
  ncm,
  cfop
) VALUES (
  'acd26a4f-7220-405e-9c96-faffb7e6480e',
  (SELECT id FROM produtos WHERE codigo = 'PIZZA-BASE'),
  'Pizza Grande (35cm)',
  'PIZZA-G',
  45.00,
  true,
  3, -- Máximo 3 sabores
  5.00,
  '19059090',
  '5102'
);
```

### **2.4 Pizza Família**
```sql
INSERT INTO produto_variacoes (
  empresa_id,
  produto_base_id,
  nome,
  codigo,
  preco,
  permite_meio_a_meio,
  max_sabores,
  preco_sabor_adicional,
  ncm,
  cfop
) VALUES (
  'acd26a4f-7220-405e-9c96-faffb7e6480e',
  (SELECT id FROM produtos WHERE codigo = 'PIZZA-BASE'),
  'Pizza Família (40cm)',
  'PIZZA-F',
  55.00,
  true,
  4, -- Máximo 4 sabores
  6.00,
  '19059090',
  '5102'
);
```

## 🔗 **PASSO 3: VINCULAR OPÇÕES ÀS VARIAÇÕES**

### **3.1 Configurar Sabores (Obrigatório)**
```sql
-- Para todas as variações, sabor é obrigatório
INSERT INTO produto_variacoes_opcoes (
  empresa_id,
  variacao_id,
  opcao_adicional_id,
  obrigatorio,
  quantidade_minima,
  quantidade_maxima,
  permite_multipla_selecao
)
SELECT 
  'acd26a4f-7220-405e-9c96-faffb7e6480e',
  pv.id,
  (SELECT id FROM opcoes_adicionais WHERE nome = 'Sabores de Pizza'),
  true, -- Obrigatório
  1, -- Mínimo 1 sabor
  pv.max_sabores, -- Máximo conforme variação
  true -- Permite múltipla seleção
FROM produto_variacoes pv 
WHERE pv.produto_base_id = (SELECT id FROM produtos WHERE codigo = 'PIZZA-BASE');
```

### **3.2 Configurar Bordas (Opcional)**
```sql
-- Para todas as variações, borda é opcional
INSERT INTO produto_variacoes_opcoes (
  empresa_id,
  variacao_id,
  opcao_adicional_id,
  obrigatorio,
  quantidade_minima,
  quantidade_maxima,
  permite_multipla_selecao
)
SELECT 
  'acd26a4f-7220-405e-9c96-faffb7e6480e',
  pv.id,
  (SELECT id FROM opcoes_adicionais WHERE nome = 'Bordas de Pizza'),
  false, -- Opcional
  0, -- Mínimo 0
  1, -- Máximo 1 borda
  false -- Não permite múltipla seleção
FROM produto_variacoes pv 
WHERE pv.produto_base_id = (SELECT id FROM produtos WHERE codigo = 'PIZZA-BASE');
```

## 💰 **PASSO 4: EXEMPLOS DE PREÇOS**

### **Cenários de Preços:**

#### **Exemplo 1: Pizza Pequena Calabresa**
- Base: R$ 25,00
- Sabor: Calabresa (R$ 0,00)
- Borda: Tradicional (R$ 0,00)
- **Total: R$ 25,00**

#### **Exemplo 2: Pizza Média Meio a Meio**
- Base: R$ 35,00
- Sabores: 50% Calabresa (R$ 0,00) + 50% Frango c/ Catupiry (R$ 3,00)
- Borda: Catupiry (R$ 5,00)
- **Total: R$ 43,00**

#### **Exemplo 3: Pizza Grande Premium**
- Base: R$ 45,00
- Sabores: 33% Quatro Queijos (R$ 4,00) + 33% Pepperoni (R$ 5,00) + 33% Camarão (R$ 8,00)
- Borda: Cheddar (R$ 6,00)
- Sabor adicional: R$ 5,00 × 2 = R$ 10,00
- **Total: R$ 78,00**

## 📱 **PASSO 5: INTERFACE NO PDV**

### **Fluxo de Seleção:**

```
1. Selecionar "Pizza" no cardápio
   ↓
2. Escolher tamanho:
   [ ] Pequena (R$ 25,00)
   [x] Média (R$ 35,00)
   [ ] Grande (R$ 45,00)
   [ ] Família (R$ 55,00)
   ↓
3. Escolher sabores (máx: 2):
   [x] Calabresa (50%) - R$ 0,00
   [x] Frango c/ Catupiry (50%) - R$ 3,00
   ↓
4. Escolher borda:
   [ ] Tradicional - R$ 0,00
   [x] Catupiry - R$ 5,00
   [ ] Cheddar - R$ 6,00
   ↓
5. Resumo:
   Pizza Média - R$ 35,00
   + Frango c/ Catupiry - R$ 3,00
   + Borda Catupiry - R$ 5,00
   = TOTAL: R$ 43,00
```

## 🎯 **VANTAGENS DESTA CONFIGURAÇÃO**

### **✅ Flexibilidade Total:**
- Suporta qualquer combinação
- Preços dinâmicos por sabor
- Configuração fácil via admin

### **✅ Experiência do Cliente:**
- Interface intuitiva
- Preços transparentes
- Visualização clara das opções

### **✅ Gestão Empresarial:**
- Relatórios detalhados por sabor
- Controle de margem por tamanho
- Facilidade para promoções

### **✅ Compliance Fiscal:**
- NCM/CFOP corretos
- Emissão NFe adequada
- Rastreabilidade completa

Esta configuração permite que a pizzaria opere com total profissionalismo mantendo a simplicidade do sistema!
