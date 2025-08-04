# 🗄️ CONTROLE DE CAIXA - QUERIES SQL

## 📋 **ESTRUTURA DAS TABELAS**

### **Tabela: `pdv_config`**
```sql
CREATE TABLE pdv_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    controla_caixa BOOLEAN DEFAULT false,
    comandas BOOLEAN DEFAULT false,
    mesas BOOLEAN DEFAULT false,
    vendedor BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### **Tabela: `caixa_controle`**
```sql
CREATE TABLE caixa_controle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    usuario_id UUID NOT NULL REFERENCES usuarios(id),
    data_abertura TIMESTAMP NOT NULL DEFAULT NOW(),
    data_fechamento TIMESTAMP NULL,
    valor_abertura DECIMAL(10,2) DEFAULT 0.00,
    valor_fechamento DECIMAL(10,2) NULL,
    status_caixa BOOLEAN NOT NULL DEFAULT true,
    sangria DECIMAL(10,2) DEFAULT 0.00,
    suprimento DECIMAL(10,2) DEFAULT 0.00,
    observacoes_abertura TEXT,
    observacoes_fechamento TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🔍 **QUERIES DE VERIFICAÇÃO**

### **1. Verificar Configuração de Controle**
```sql
-- Verificar se controle de caixa está ativo
SELECT 
    empresa_id,
    controla_caixa,
    created_at
FROM pdv_config 
WHERE empresa_id = 'acd26a4f-7220-405e-9c96-faffb7e6480e';
```

### **2. Verificar Caixa Aberto Hoje**
```sql
-- Verificar se há caixa aberto para usuário hoje
SELECT 
    id,
    empresa_id,
    usuario_id,
    data_abertura,
    valor_abertura,
    status_caixa
FROM caixa_controle 
WHERE empresa_id = 'acd26a4f-7220-405e-9c96-faffb7e6480e'
  AND usuario_id = 'd3b0e631-a0d0-43a1-8c5a-5436d530df8d'
  AND status_caixa = true
  AND data_abertura >= '2025-08-04 00:00:00'
  AND data_abertura <= '2025-08-04 23:59:59';
```

### **3. Listar Todos os Registros de Caixa**
```sql
-- Ver histórico completo de caixas
SELECT 
    id,
    empresa_id,
    usuario_id,
    data_abertura,
    data_fechamento,
    valor_abertura,
    valor_fechamento,
    status_caixa,
    sangria,
    suprimento,
    created_at
FROM caixa_controle 
WHERE empresa_id = 'acd26a4f-7220-405e-9c96-faffb7e6480e'
ORDER BY created_at DESC;
```

## ➕ **QUERIES DE INSERÇÃO**

### **1. Ativar Controle de Caixa**
```sql
-- Ativar controle de caixa para empresa
UPDATE pdv_config 
SET controla_caixa = true,
    updated_at = NOW()
WHERE empresa_id = 'acd26a4f-7220-405e-9c96-faffb7e6480e';
```

### **2. Abrir Caixa**
```sql
-- Inserir registro de abertura de caixa
INSERT INTO caixa_controle (
    empresa_id,
    usuario_id,
    data_abertura,
    valor_abertura,
    status_caixa,
    observacoes_abertura
) VALUES (
    'acd26a4f-7220-405e-9c96-faffb7e6480e',
    'd3b0e631-a0d0-43a1-8c5a-5436d530df8d',
    NOW(),
    100.00,
    true,
    'Abertura de caixa via PDV'
);
```

### **3. Fechar Caixa**
```sql
-- Atualizar registro para fechar caixa
UPDATE caixa_controle 
SET data_fechamento = NOW(),
    valor_fechamento = 250.00,
    status_caixa = false,
    observacoes_fechamento = 'Fechamento de caixa via PDV',
    updated_at = NOW()
WHERE empresa_id = 'acd26a4f-7220-405e-9c96-faffb7e6480e'
  AND usuario_id = 'd3b0e631-a0d0-43a1-8c5a-5436d530df8d'
  AND status_caixa = true
  AND DATE(data_abertura) = CURRENT_DATE;
```

## 🔧 **QUERIES DE MANUTENÇÃO**

### **1. Limpar Registros de Teste**
```sql
-- Remover todos os registros de caixa (CUIDADO!)
DELETE FROM caixa_controle 
WHERE empresa_id = 'acd26a4f-7220-405e-9c96-faffb7e6480e';
```

### **2. Desativar Controle de Caixa**
```sql
-- Desativar controle de caixa temporariamente
UPDATE pdv_config 
SET controla_caixa = false,
    updated_at = NOW()
WHERE empresa_id = 'acd26a4f-7220-405e-9c96-faffb7e6480e';
```

### **3. Forçar Fechamento de Caixas Abertos**
```sql
-- Fechar todos os caixas abertos (emergência)
UPDATE caixa_controle 
SET data_fechamento = NOW(),
    status_caixa = false,
    observacoes_fechamento = 'Fechamento forçado - manutenção',
    updated_at = NOW()
WHERE empresa_id = 'acd26a4f-7220-405e-9c96-faffb7e6480e'
  AND status_caixa = true;
```

## 📊 **QUERIES DE RELATÓRIO**

### **1. Resumo Diário de Caixas**
```sql
-- Relatório de caixas por dia
SELECT 
    DATE(data_abertura) as data,
    COUNT(*) as total_aberturas,
    SUM(valor_abertura) as total_valor_abertura,
    SUM(CASE WHEN status_caixa = false THEN valor_fechamento ELSE 0 END) as total_valor_fechamento,
    COUNT(CASE WHEN status_caixa = true THEN 1 END) as caixas_abertos
FROM caixa_controle 
WHERE empresa_id = 'acd26a4f-7220-405e-9c96-faffb7e6480e'
  AND data_abertura >= '2025-08-01'
GROUP BY DATE(data_abertura)
ORDER BY data DESC;
```

### **2. Caixas Abertos Atualmente**
```sql
-- Ver todos os caixas atualmente abertos
SELECT 
    cc.id,
    u.nome as operador,
    cc.data_abertura,
    cc.valor_abertura,
    EXTRACT(EPOCH FROM (NOW() - cc.data_abertura))/3600 as horas_aberto
FROM caixa_controle cc
JOIN usuarios u ON cc.usuario_id = u.id
WHERE cc.empresa_id = 'acd26a4f-7220-405e-9c96-faffb7e6480e'
  AND cc.status_caixa = true
ORDER BY cc.data_abertura;
```

### **3. Histórico por Usuário**
```sql
-- Histórico de caixas por usuário
SELECT 
    u.nome as operador,
    COUNT(*) as total_operacoes,
    AVG(cc.valor_abertura) as media_abertura,
    AVG(CASE WHEN cc.status_caixa = false THEN cc.valor_fechamento END) as media_fechamento,
    MAX(cc.data_abertura) as ultima_operacao
FROM caixa_controle cc
JOIN usuarios u ON cc.usuario_id = u.id
WHERE cc.empresa_id = 'acd26a4f-7220-405e-9c96-faffb7e6480e'
GROUP BY u.id, u.nome
ORDER BY total_operacoes DESC;
```

## 🎯 **DADOS ATUAIS DO SISTEMA**

### **Empresa ID**
```
acd26a4f-7220-405e-9c96-faffb7e6480e
```

### **Usuário ID**
```
d3b0e631-a0d0-43a1-8c5a-5436d530df8d
```

### **Configuração Atual**
```sql
-- Status atual da configuração
SELECT * FROM pdv_config WHERE empresa_id = 'acd26a4f-7220-405e-9c96-faffb7e6480e';
-- Resultado: controla_caixa = true

-- Status atual dos caixas
SELECT * FROM caixa_controle WHERE empresa_id = 'acd26a4f-7220-405e-9c96-faffb7e6480e';
-- Resultado: [] (vazio)
```

## 🚨 **COMANDOS DE EMERGÊNCIA**

### **1. Liberar PDV Temporariamente**
```sql
-- Desativar controle para liberar PDV
UPDATE pdv_config SET controla_caixa = false 
WHERE empresa_id = 'acd26a4f-7220-405e-9c96-faffb7e6480e';
```

### **2. Criar Caixa de Teste**
```sql
-- Criar caixa aberto para teste
INSERT INTO caixa_controle (empresa_id, usuario_id, valor_abertura, status_caixa)
VALUES ('acd26a4f-7220-405e-9c96-faffb7e6480e', 'd3b0e631-a0d0-43a1-8c5a-5436d530df8d', 0.00, true);
```

### **3. Reset Completo**
```sql
-- Reset completo do sistema de caixa
DELETE FROM caixa_controle WHERE empresa_id = 'acd26a4f-7220-405e-9c96-faffb7e6480e';
UPDATE pdv_config SET controla_caixa = false WHERE empresa_id = 'acd26a4f-7220-405e-9c96-faffb7e6480e';
```
