# 📊 Venda sem Produto - Estrutura de Dados Completa

## 🗄️ Tabelas Envolvidas

### **1. Tabela: pdv_config**
```sql
-- Campos existentes para venda sem produto
venda_sem_produto BOOLEAN DEFAULT FALSE
venda_sem_produto_nome_padrao VARCHAR(255) DEFAULT 'Diversos'

-- Campos fiscais adicionados
venda_sem_produto_ncm VARCHAR(8) DEFAULT '22021000'
venda_sem_produto_cfop VARCHAR(4) DEFAULT '5102'
venda_sem_produto_origem INTEGER DEFAULT 0
venda_sem_produto_situacao_tributaria VARCHAR(50) DEFAULT 'tributado_integral'
venda_sem_produto_cest VARCHAR(7) DEFAULT ''
venda_sem_produto_margem_st NUMERIC DEFAULT NULL
venda_sem_produto_aliquota_icms NUMERIC DEFAULT 18.0
venda_sem_produto_aliquota_pis NUMERIC DEFAULT 1.65
venda_sem_produto_aliquota_cofins NUMERIC DEFAULT 7.6
venda_sem_produto_peso_liquido NUMERIC DEFAULT 0
```

### **2. Tabela: pdv (vendas finalizadas)**
```sql
-- Campos que recebem dados de venda sem produto
id UUID PRIMARY KEY
empresa_id UUID
cliente_id UUID
vendedor_id UUID
vendedor_nome VARCHAR(255)
total NUMERIC
desconto_total NUMERIC
-- ... outros campos padrão
```

### **3. Tabela: pdv_itens (itens das vendas)**
```sql
-- Estrutura para itens de venda sem produto
id UUID PRIMARY KEY
pdv_id UUID
produto_codigo VARCHAR(255) -- Recebe '999999'
produto_nome VARCHAR(255) -- Recebe nome personalizado
quantidade NUMERIC
preco_unitario NUMERIC
subtotal NUMERIC
vendedor_id UUID
vendedor_nome VARCHAR(255)
-- ... outros campos fiscais aplicados automaticamente
```

### **4. Tabela: produtos (validação)**
```sql
-- Validação para bloquear código 999999
codigo VARCHAR(255) UNIQUE -- Não pode ser '999999'
nome VARCHAR(255)
empresa_id UUID
-- ... outros campos
```

## 🔄 Fluxo de Dados

### **1. Configuração (pdv_config)**
```json
{
  "empresa_id": "uuid-empresa",
  "venda_sem_produto": true,
  "venda_sem_produto_nome_padrao": "Diversos",
  "venda_sem_produto_ncm": "22021000",
  "venda_sem_produto_cfop": "5102",
  "venda_sem_produto_origem": 0,
  "venda_sem_produto_situacao_tributaria": "tributado_integral",
  "venda_sem_produto_aliquota_icms": 18.0,
  "venda_sem_produto_aliquota_pis": 1.65,
  "venda_sem_produto_aliquota_cofins": 7.6
}
```

### **2. Item no Carrinho (Frontend)**
```typescript
interface ItemCarrinho {
  id: string; // "venda-sem-produto-1735689847123"
  produto: {
    id: "venda-sem-produto-1735689847123",
    nome: "charles volnei", // Nome digitado pelo usuário
    preco: 15.50,
    codigo: "999999", // Código fixo reservado
    grupo_id: "",
    promocao: false
  },
  quantidade: 1,
  subtotal: 15.50,
  vendaSemProduto: true, // Flag identificadora
  nome: "charles volnei", // Nome personalizado
  vendedor_id: "uuid-vendedor",
  vendedor_nome: "Nome do Vendedor"
}
```

### **3. Venda Finalizada (pdv)**
```json
{
  "id": "uuid-venda",
  "empresa_id": "uuid-empresa",
  "cliente_id": "uuid-cliente",
  "vendedor_id": "uuid-vendedor",
  "vendedor_nome": "Nome do Vendedor",
  "total": 15.50,
  "desconto_total": 0,
  "forma_pagamento": "dinheiro",
  "status": "finalizada"
}
```

### **4. Item Finalizado (pdv_itens)**
```json
{
  "id": "uuid-item",
  "pdv_id": "uuid-venda",
  "produto_codigo": "999999", // Código identificador
  "produto_nome": "charles volnei", // Nome personalizado
  "quantidade": 1,
  "preco_unitario": 15.50,
  "subtotal": 15.50,
  "vendedor_id": "uuid-vendedor",
  "vendedor_nome": "Nome do Vendedor"
}
```

### **5. Dados Fiscais Aplicados (NFC-e)**
```json
{
  "codigo": "999999",
  "nome": "charles volnei",
  "ncm": "22021000", // Das configurações PDV
  "cfop": "5102", // Das configurações PDV
  "origem_produto": 0, // Das configurações PDV
  "cst_icms": "00", // Mapeado por regime tributário
  "csosn_icms": "102", // Mapeado por regime tributário
  "aliquota_icms": 18.0, // Das configurações PDV
  "cst_pis": "01",
  "aliquota_pis": 1.65, // Das configurações PDV
  "cst_cofins": "01",
  "aliquota_cofins": 7.6, // Das configurações PDV
  "cest": "", // Das configurações PDV
  "margem_st": null // Das configurações PDV
}
```

## 🔄 Mapeamento Situação Tributária

### **Configuração → CST/CSOSN**
```php
// Mapeamento automático baseado no regime tributário
switch ($situacaoTributaria) {
    case 'tributado_integral':
        $dadosFiscais['cst_icms'] = '00';      // Regime Normal
        $dadosFiscais['csosn_icms'] = '102';   // Simples Nacional
        break;
        
    case 'tributado_st':
        $dadosFiscais['cst_icms'] = '60';      // Regime Normal - ST
        $dadosFiscais['csosn_icms'] = '500';   // Simples Nacional - ST
        break;
        
    case 'isento':
        $dadosFiscais['cst_icms'] = '40';      // Regime Normal - Isenta
        $dadosFiscais['csosn_icms'] = '300';   // Simples Nacional - Imune
        break;
        
    case 'nao_tributado':
        $dadosFiscais['cst_icms'] = '41';      // Regime Normal - Não tributada
        $dadosFiscais['csosn_icms'] = '400';   // Simples Nacional - Não tributada
        break;
        
    default:
        $dadosFiscais['cst_icms'] = '00';      // Fallback seguro
        $dadosFiscais['csosn_icms'] = '102';   // Fallback seguro
}
```

## 📋 Campos Obrigatórios NFC-e

### **Produto (det)**
```xml
<det nItem="1">
    <prod>
        <cProd>999999</cProd> <!-- Código fixo -->
        <cEAN>SEM GTIN</cEAN> <!-- Sem código de barras -->
        <xProd>charles volnei</xProd> <!-- Nome personalizado -->
        <NCM>22021000</NCM> <!-- Das configurações PDV -->
        <CFOP>5102</CFOP> <!-- Das configurações PDV -->
        <uCom>UN</uCom> <!-- ❓ Unidade pode estar ausente -->
        <qCom>1.0000</qCom> <!-- Quantidade -->
        <vUnCom>15.50</vUnCom> <!-- Valor unitário -->
        <vProd>15.50</vProd> <!-- Valor total -->
        <cEANTrib>SEM GTIN</cEANTrib>
        <uTrib>UN</uTrib> <!-- ❓ Unidade pode estar ausente -->
        <qTrib>1.0000</qTrib>
        <vUnTrib>15.50</vUnTrib>
    </prod>
    <imposto>
        <ICMS>
            <ICMS00> <!-- Ou ICMSSN102 para Simples -->
                <orig>0</orig> <!-- Das configurações PDV -->
                <CST>00</CST> <!-- Mapeado automaticamente -->
                <modBC>3</modBC>
                <vBC>15.50</vBC>
                <pICMS>18.00</pICMS> <!-- Das configurações PDV -->
                <vICMS>2.79</vICMS>
            </ICMS00>
        </ICMS>
        <PIS>
            <PISAliq>
                <CST>01</CST>
                <vBC>15.50</vBC>
                <pPIS>1.65</pPIS> <!-- Das configurações PDV -->
                <vPIS>0.26</vPIS>
            </PISAliq>
        </PIS>
        <COFINS>
            <COFINSAliq>
                <CST>01</CST>
                <vBC>15.50</vBC>
                <pCOFINS>7.60</pCOFINS> <!-- Das configurações PDV -->
                <vCOFINS>1.18</vCOFINS>
            </COFINSAliq>
        </COFINS>
    </imposto>
</det>
```

## ⚠️ Pontos de Atenção

### **1. Unidade de Medida**
```php
// Produto fictício pode não ter unidade de medida
// Verificar se precisa buscar unidade padrão da empresa
$unidadePadrao = 'UN'; // Ou buscar da configuração
```

### **2. Código de Barras**
```php
// Produtos de venda sem produto não têm GTIN
$gtin = 'SEM GTIN'; // Conforme documentação SEFAZ
```

### **3. Peso Líquido**
```php
// Pode ser obrigatório para alguns NCMs
$pesoLiquido = $config['venda_sem_produto_peso_liquido'] ?? 0;
```

### **4. Validações SEFAZ**
- NCM deve ser válido (8 dígitos)
- CFOP deve ser válido (4 dígitos)
- Alíquotas devem estar no formato correto
- CST/CSOSN devem ser válidos para o regime tributário

## 🔍 Queries de Debug

### **1. Verificar Configurações**
```sql
SELECT * FROM pdv_config 
WHERE empresa_id = 'uuid-empresa' 
AND venda_sem_produto = true;
```

### **2. Verificar Vendas com Código 999999**
```sql
SELECT p.*, pi.produto_codigo, pi.produto_nome 
FROM pdv p
JOIN pdv_itens pi ON p.id = pi.pdv_id
WHERE pi.produto_codigo = '999999'
ORDER BY p.created_at DESC;
```

### **3. Verificar Produtos com Código Bloqueado**
```sql
SELECT * FROM produtos 
WHERE codigo = '999999'; -- Deve retornar vazio
```

## 📝 Resumo da Estrutura

1. **Configuração**: `pdv_config` com campos fiscais específicos
2. **Identificação**: Código fixo `999999` para detecção automática
3. **Proteção**: Validação frontend/backend para bloquear uso em produtos
4. **Mapeamento**: Conversão automática situação → CST/CSOSN
5. **Aplicação**: Dados fiscais aplicados automaticamente na NFC-e

**Toda a estrutura está implementada e funcionando, exceto o erro específico na emissão NFC-e que precisa ser investigado.**
