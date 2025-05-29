# 🗄️ Estrutura do Banco de Dados para NFe

## 📋 Objetivo
Definir a estrutura completa do banco de dados necessária para suportar a geração de NFe, incluindo alterações em tabelas existentes e criação de novas tabelas.

---

## 📊 Status da Estrutura
- [ ] **Migrations Criadas**
- [ ] **Tabelas Alteradas** 
- [ ] **Novas Tabelas Criadas**
- [ ] **Relacionamentos Definidos**
- [ ] **Índices Criados**
- [ ] **Testes Executados**

---

## 🔄 Alterações em Tabelas Existentes

### 1. Tabela `companies` - Adicionar Campos Fiscais

```sql
-- Migration: add_fiscal_fields_to_companies_table
ALTER TABLE companies ADD COLUMN cnpj VARCHAR(14) UNIQUE AFTER name;
ALTER TABLE companies ADD COLUMN inscricao_estadual VARCHAR(20) AFTER cnpj;
ALTER TABLE companies ADD COLUMN inscricao_municipal VARCHAR(20) NULL AFTER inscricao_estadual;
ALTER TABLE companies ADD COLUMN regime_tributario TINYINT NOT NULL DEFAULT 3 AFTER inscricao_municipal;
ALTER TABLE companies ADD COLUMN cnae_principal VARCHAR(7) NULL AFTER regime_tributario;
ALTER TABLE companies ADD COLUMN nome_fantasia VARCHAR(60) NULL AFTER cnae_principal;
ALTER TABLE companies ADD COLUMN numero_endereco VARCHAR(60) AFTER address;
ALTER TABLE companies ADD COLUMN complemento_endereco VARCHAR(60) NULL AFTER numero_endereco;
ALTER TABLE companies ADD COLUMN bairro VARCHAR(60) AFTER complemento_endereco;
ALTER TABLE companies ADD COLUMN codigo_municipio VARCHAR(7) AFTER city;
ALTER TABLE companies ADD COLUMN codigo_pais VARCHAR(4) DEFAULT '1058' AFTER state;
ALTER TABLE companies ADD COLUMN nome_pais VARCHAR(60) DEFAULT 'BRASIL' AFTER codigo_pais;

-- Índices
CREATE INDEX idx_companies_cnpj ON companies(cnpj);
CREATE INDEX idx_companies_ie ON companies(inscricao_estadual);
```

### 2. Tabela `customers` - Adicionar Campos Fiscais

```sql
-- Migration: add_fiscal_fields_to_customers_table
ALTER TABLE customers ADD COLUMN tipo_documento ENUM('cpf','cnpj') NOT NULL DEFAULT 'cpf' AFTER name;
ALTER TABLE customers ADD COLUMN cpf VARCHAR(11) NULL AFTER tipo_documento;
ALTER TABLE customers ADD COLUMN cnpj VARCHAR(14) NULL AFTER cpf;
ALTER TABLE customers ADD COLUMN inscricao_estadual VARCHAR(20) NULL AFTER cnpj;
ALTER TABLE customers ADD COLUMN indicador_ie TINYINT NOT NULL DEFAULT 9 AFTER inscricao_estadual;
ALTER TABLE customers ADD COLUMN numero_endereco VARCHAR(60) AFTER address;
ALTER TABLE customers ADD COLUMN complemento_endereco VARCHAR(60) NULL AFTER numero_endereco;
ALTER TABLE customers ADD COLUMN bairro VARCHAR(60) AFTER complemento_endereco;
ALTER TABLE customers ADD COLUMN codigo_municipio VARCHAR(7) AFTER city;
ALTER TABLE customers ADD COLUMN codigo_pais VARCHAR(4) DEFAULT '1058' AFTER state;
ALTER TABLE customers ADD COLUMN nome_pais VARCHAR(60) DEFAULT 'BRASIL' AFTER codigo_pais;

-- Índices
CREATE INDEX idx_customers_cpf ON customers(cpf);
CREATE INDEX idx_customers_cnpj ON customers(cnpj);
CREATE INDEX idx_customers_tipo_doc ON customers(tipo_documento);
```

### 3. Tabela `products` - Adicionar Campos Fiscais

```sql
-- Migration: add_fiscal_fields_to_products_table
ALTER TABLE products ADD COLUMN codigo_produto VARCHAR(60) UNIQUE AFTER name;
ALTER TABLE products ADD COLUMN codigo_barras VARCHAR(14) DEFAULT 'SEM GTIN' AFTER codigo_produto;
ALTER TABLE products ADD COLUMN ncm VARCHAR(8) NOT NULL AFTER codigo_barras;
ALTER TABLE products ADD COLUMN cfop VARCHAR(4) NOT NULL DEFAULT '5102' AFTER ncm;
ALTER TABLE products ADD COLUMN unidade_comercial VARCHAR(6) NOT NULL DEFAULT 'UN' AFTER cfop;
ALTER TABLE products ADD COLUMN unidade_tributavel VARCHAR(6) NOT NULL DEFAULT 'UN' AFTER unidade_comercial;
ALTER TABLE products ADD COLUMN cest VARCHAR(7) NULL AFTER unidade_tributavel;
ALTER TABLE products ADD COLUMN origem_produto TINYINT NOT NULL DEFAULT 0 AFTER cest;
ALTER TABLE products ADD COLUMN cst_icms VARCHAR(3) NOT NULL DEFAULT '00' AFTER origem_produto;
ALTER TABLE products ADD COLUMN cst_pis VARCHAR(2) NOT NULL DEFAULT '01' AFTER cst_icms;
ALTER TABLE products ADD COLUMN cst_cofins VARCHAR(2) NOT NULL DEFAULT '01' AFTER cst_pis;
ALTER TABLE products ADD COLUMN aliquota_icms DECIMAL(5,2) DEFAULT 18.00 AFTER cst_cofins;
ALTER TABLE products ADD COLUMN aliquota_pis DECIMAL(5,4) DEFAULT 1.65 AFTER aliquota_icms;
ALTER TABLE products ADD COLUMN aliquota_cofins DECIMAL(5,4) DEFAULT 7.60 AFTER aliquota_pis;
ALTER TABLE products ADD COLUMN ativo BOOLEAN DEFAULT TRUE AFTER aliquota_cofins;

-- Índices
CREATE INDEX idx_products_codigo ON products(codigo_produto);
CREATE INDEX idx_products_ncm ON products(ncm);
CREATE INDEX idx_products_cfop ON products(cfop);
```

### 4. Tabela `orders` - Adicionar Campos NFe

```sql
-- Migration: add_nfe_fields_to_orders_table
ALTER TABLE orders ADD COLUMN numero_nfe BIGINT NULL AFTER total_amount;
ALTER TABLE orders ADD COLUMN serie_nfe TINYINT DEFAULT 1 AFTER numero_nfe;
ALTER TABLE orders ADD COLUMN chave_nfe VARCHAR(44) NULL AFTER serie_nfe;
ALTER TABLE orders ADD COLUMN status_nfe ENUM('pendente','processando','autorizada','rejeitada','cancelada') DEFAULT 'pendente' AFTER chave_nfe;
ALTER TABLE orders ADD COLUMN natureza_operacao VARCHAR(60) DEFAULT 'VENDA' AFTER status_nfe;
ALTER TABLE orders ADD COLUMN tipo_operacao TINYINT DEFAULT 1 AFTER natureza_operacao;
ALTER TABLE orders ADD COLUMN consumidor_final TINYINT DEFAULT 1 AFTER tipo_operacao;
ALTER TABLE orders ADD COLUMN presenca_comprador TINYINT DEFAULT 1 AFTER consumidor_final;
ALTER TABLE orders ADD COLUMN data_emissao_nfe TIMESTAMP NULL AFTER presenca_comprador;
ALTER TABLE orders ADD COLUMN data_saida_entrada TIMESTAMP NULL AFTER data_emissao_nfe;
ALTER TABLE orders ADD COLUMN protocolo_autorizacao VARCHAR(20) NULL AFTER data_saida_entrada;
ALTER TABLE orders ADD COLUMN ambiente_nfe TINYINT DEFAULT 2 AFTER protocolo_autorizacao;

-- Índices
CREATE UNIQUE INDEX idx_orders_numero_nfe ON orders(numero_nfe, serie_nfe);
CREATE UNIQUE INDEX idx_orders_chave_nfe ON orders(chave_nfe);
CREATE INDEX idx_orders_status_nfe ON orders(status_nfe);
```

### 5. Tabela `order_items` - Adicionar Campos NFe

```sql
-- Migration: add_nfe_fields_to_order_items_table
ALTER TABLE order_items ADD COLUMN numero_item TINYINT AFTER product_id;
ALTER TABLE order_items ADD COLUMN cfop_item VARCHAR(4) AFTER numero_item;
ALTER TABLE order_items ADD COLUMN valor_frete DECIMAL(13,2) DEFAULT 0.00 AFTER total_price;
ALTER TABLE order_items ADD COLUMN valor_seguro DECIMAL(13,2) DEFAULT 0.00 AFTER valor_frete;
ALTER TABLE order_items ADD COLUMN valor_desconto DECIMAL(13,2) DEFAULT 0.00 AFTER valor_seguro;
ALTER TABLE order_items ADD COLUMN valor_outras_despesas DECIMAL(13,2) DEFAULT 0.00 AFTER valor_desconto;
ALTER TABLE order_items ADD COLUMN compoe_total_nfe TINYINT DEFAULT 1 AFTER valor_outras_despesas;
ALTER TABLE order_items ADD COLUMN informacoes_adicionais TEXT NULL AFTER compoe_total_nfe;

-- Índices
CREATE INDEX idx_order_items_numero ON order_items(order_id, numero_item);
CREATE INDEX idx_order_items_cfop ON order_items(cfop_item);
```

---

## 🆕 Novas Tabelas Específicas para NFe

### 1. Tabela `nfe_configurations` - Configurações NFe

```sql
-- Migration: create_nfe_configurations_table
CREATE TABLE nfe_configurations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NOT NULL,
    ambiente TINYINT NOT NULL DEFAULT 2, -- 1=Produção, 2=Homologação
    serie_nfe TINYINT NOT NULL DEFAULT 1,
    proximo_numero_nfe BIGINT NOT NULL DEFAULT 1,
    certificado_digital_path VARCHAR(255) NULL,
    certificado_digital_password VARCHAR(255) NULL,
    certificado_digital_validade DATE NULL,
    uf_emissao VARCHAR(2) NOT NULL,
    codigo_csc VARCHAR(36) NULL, -- Para NFCe
    id_token_csc TINYINT NULL, -- Para NFCe
    email_contador VARCHAR(255) NULL,
    observacoes_padrao TEXT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    UNIQUE KEY unique_company_serie (company_id, serie_nfe)
);

-- Índices
CREATE INDEX idx_nfe_config_company ON nfe_configurations(company_id);
CREATE INDEX idx_nfe_config_ambiente ON nfe_configurations(ambiente);
```

### 2. Tabela `nfe_documents` - Documentos NFe Gerados

```sql
-- Migration: create_nfe_documents_table
CREATE TABLE nfe_documents (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NOT NULL,
    order_id BIGINT UNSIGNED NOT NULL,
    numero_nfe BIGINT NOT NULL,
    serie_nfe TINYINT NOT NULL,
    chave_acesso VARCHAR(44) UNIQUE NOT NULL,
    modelo TINYINT NOT NULL DEFAULT 55, -- 55=NFe, 65=NFCe
    status ENUM('pendente','processando','autorizada','rejeitada','cancelada','inutilizada') DEFAULT 'pendente',
    ambiente TINYINT NOT NULL, -- 1=Produção, 2=Homologação
    data_emissao TIMESTAMP NOT NULL,
    data_autorizacao TIMESTAMP NULL,
    protocolo_autorizacao VARCHAR(20) NULL,
    xml_original LONGTEXT NULL,
    xml_assinado LONGTEXT NULL,
    xml_autorizado LONGTEXT NULL,
    xml_cancelamento LONGTEXT NULL,
    motivo_rejeicao TEXT NULL,
    codigo_status VARCHAR(10) NULL,
    descricao_status TEXT NULL,
    valor_total DECIMAL(15,2) NOT NULL,
    valor_tributos DECIMAL(15,2) DEFAULT 0.00,
    qr_code TEXT NULL, -- Para NFCe
    url_consulta VARCHAR(255) NULL,
    tentativas_envio TINYINT DEFAULT 0,
    ultima_tentativa TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    UNIQUE KEY unique_numero_serie (company_id, numero_nfe, serie_nfe, modelo)
);

-- Índices
CREATE INDEX idx_nfe_docs_company ON nfe_documents(company_id);
CREATE INDEX idx_nfe_docs_order ON nfe_documents(order_id);
CREATE INDEX idx_nfe_docs_status ON nfe_documents(status);
CREATE INDEX idx_nfe_docs_chave ON nfe_documents(chave_acesso);
CREATE INDEX idx_nfe_docs_data ON nfe_documents(data_emissao);
```

### 3. Tabela `nfe_items` - Itens das NFe

```sql
-- Migration: create_nfe_items_table
CREATE TABLE nfe_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nfe_document_id BIGINT UNSIGNED NOT NULL,
    order_item_id BIGINT UNSIGNED NOT NULL,
    numero_item TINYINT NOT NULL,
    codigo_produto VARCHAR(60) NOT NULL,
    codigo_barras VARCHAR(14) DEFAULT 'SEM GTIN',
    descricao_produto VARCHAR(120) NOT NULL,
    ncm VARCHAR(8) NOT NULL,
    cfop VARCHAR(4) NOT NULL,
    unidade_comercial VARCHAR(6) NOT NULL,
    quantidade_comercial DECIMAL(11,4) NOT NULL,
    valor_unitario_comercial DECIMAL(11,10) NOT NULL,
    unidade_tributavel VARCHAR(6) NOT NULL,
    quantidade_tributavel DECIMAL(11,4) NOT NULL,
    valor_unitario_tributavel DECIMAL(11,10) NOT NULL,
    valor_total_produto DECIMAL(13,2) NOT NULL,
    valor_frete DECIMAL(13,2) DEFAULT 0.00,
    valor_seguro DECIMAL(13,2) DEFAULT 0.00,
    valor_desconto DECIMAL(13,2) DEFAULT 0.00,
    valor_outras_despesas DECIMAL(13,2) DEFAULT 0.00,
    compoe_total_nfe TINYINT DEFAULT 1,
    informacoes_adicionais TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (nfe_document_id) REFERENCES nfe_documents(id) ON DELETE CASCADE,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
    UNIQUE KEY unique_nfe_item (nfe_document_id, numero_item)
);

-- Índices
CREATE INDEX idx_nfe_items_document ON nfe_items(nfe_document_id);
CREATE INDEX idx_nfe_items_order_item ON nfe_items(order_item_id);
CREATE INDEX idx_nfe_items_produto ON nfe_items(codigo_produto);
```

### 4. Tabela `nfe_taxes` - Impostos Calculados

```sql
-- Migration: create_nfe_taxes_table
CREATE TABLE nfe_taxes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nfe_item_id BIGINT UNSIGNED NOT NULL,
    tipo_imposto ENUM('icms','ipi','pis','cofins','issqn','ii') NOT NULL,
    origem_produto TINYINT NULL,
    cst VARCHAR(3) NULL,
    csosn VARCHAR(3) NULL,
    modalidade_bc TINYINT NULL,
    base_calculo DECIMAL(13,2) DEFAULT 0.00,
    aliquota DECIMAL(5,4) DEFAULT 0.00,
    valor_imposto DECIMAL(13,2) DEFAULT 0.00,
    base_calculo_st DECIMAL(13,2) DEFAULT 0.00,
    aliquota_st DECIMAL(5,4) DEFAULT 0.00,
    valor_imposto_st DECIMAL(13,2) DEFAULT 0.00,
    valor_ipi_devolvido DECIMAL(13,2) DEFAULT 0.00,
    observacoes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (nfe_item_id) REFERENCES nfe_items(id) ON DELETE CASCADE,
    UNIQUE KEY unique_item_tax (nfe_item_id, tipo_imposto)
);

-- Índices
CREATE INDEX idx_nfe_taxes_item ON nfe_taxes(nfe_item_id);
CREATE INDEX idx_nfe_taxes_tipo ON nfe_taxes(tipo_imposto);
```

### 5. Tabela `nfe_events` - Eventos da NFe

```sql
-- Migration: create_nfe_events_table
CREATE TABLE nfe_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nfe_document_id BIGINT UNSIGNED NOT NULL,
    tipo_evento ENUM('cancelamento','carta_correcao','manifestacao','ciencia') NOT NULL,
    sequencia_evento TINYINT NOT NULL DEFAULT 1,
    codigo_evento VARCHAR(6) NOT NULL,
    descricao_evento VARCHAR(255) NOT NULL,
    justificativa TEXT NULL,
    data_evento TIMESTAMP NOT NULL,
    protocolo_evento VARCHAR(20) NULL,
    xml_evento LONGTEXT NULL,
    xml_retorno LONGTEXT NULL,
    status_evento ENUM('pendente','processando','autorizado','rejeitado') DEFAULT 'pendente',
    codigo_status VARCHAR(10) NULL,
    motivo_rejeicao TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (nfe_document_id) REFERENCES nfe_documents(id) ON DELETE CASCADE,
    UNIQUE KEY unique_nfe_event (nfe_document_id, tipo_evento, sequencia_evento)
);

-- Índices
CREATE INDEX idx_nfe_events_document ON nfe_events(nfe_document_id);
CREATE INDEX idx_nfe_events_tipo ON nfe_events(tipo_evento);
CREATE INDEX idx_nfe_events_data ON nfe_events(data_evento);
```

---

## 🔗 Relacionamentos Entre Tabelas

```
companies (1) ←→ (N) nfe_configurations
companies (1) ←→ (N) nfe_documents
customers (1) ←→ (N) orders
orders (1) ←→ (N) order_items
orders (1) ←→ (1) nfe_documents
order_items (1) ←→ (1) nfe_items
nfe_documents (1) ←→ (N) nfe_items
nfe_documents (1) ←→ (N) nfe_events
nfe_items (1) ←→ (N) nfe_taxes
products (1) ←→ (N) order_items
```

---

## 📋 Checklist de Implementação

### ✅ Migrations a Criar
- [ ] `add_fiscal_fields_to_companies_table`
- [ ] `add_fiscal_fields_to_customers_table`
- [ ] `add_fiscal_fields_to_products_table`
- [ ] `add_nfe_fields_to_orders_table`
- [ ] `add_nfe_fields_to_order_items_table`
- [ ] `create_nfe_configurations_table`
- [ ] `create_nfe_documents_table`
- [ ] `create_nfe_items_table`
- [ ] `create_nfe_taxes_table`
- [ ] `create_nfe_events_table`

### ✅ Validações a Implementar
- [ ] CNPJ válido para companies
- [ ] CPF/CNPJ válido para customers
- [ ] NCM válido para products
- [ ] Códigos tributários válidos
- [ ] Chave NFe única
- [ ] Numeração sequencial NFe

### ✅ Seeders a Criar
- [ ] Configurações padrão NFe
- [ ] Códigos CFOP comuns
- [ ] Códigos NCM básicos
- [ ] CST padrão por tipo de produto

---

**Status:** 🔄 Planejamento Concluído
**Próxima Etapa:** Criar migrations (Fase 3.6-3.15)
**Responsável:** Desenvolvimento
**Data:** {{ date('Y-m-d') }}
