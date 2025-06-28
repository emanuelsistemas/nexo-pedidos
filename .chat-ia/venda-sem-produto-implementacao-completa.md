# 🛒 Venda sem Produto - Implementação Completa

## 📋 Resumo da Funcionalidade

Sistema que permite adicionar itens ao PDV sem ter um produto específico cadastrado, usando configurações fiscais centralizadas e código reservado `999999`.

## 🎯 Objetivo

Permitir vendas de itens avulsos (ex: "charles volnei", "diversos", "serviços") com dados fiscais corretos para emissão de NFC-e, sem precisar cadastrar produtos específicos.

## 🏗️ Arquitetura da Solução

### **1. Código Reservado: 999999**
- **Limite SEFAZ**: Campo cProd aceita até 60 caracteres
- **Código usado**: `999999` (6 caracteres) ✅ APROVADO
- **Finalidade**: Identificar produtos de venda sem produto no backend

### **2. Estrutura de Dados**

#### **Tabela: pdv_config**
```sql
-- Campos para venda sem produto (já existentes)
venda_sem_produto BOOLEAN DEFAULT FALSE
venda_sem_produto_nome_padrao VARCHAR(255) DEFAULT 'Diversos'

-- Campos fiscais para venda sem produto
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

#### **Interface Frontend: ItemCarrinho**
```typescript
interface ItemCarrinho {
  id: string;
  produto: Produto;
  quantidade: number;
  subtotal: number;
  // ... outras propriedades
  vendaSemProduto?: boolean; // ✅ Indica se é venda sem produto
  nome?: string; // ✅ Nome personalizado para venda sem produto
  vendedor_id?: string;
  vendedor_nome?: string;
}
```

## 🔧 Implementação Frontend

### **1. Menu PDV (F0)**
```typescript
// src/pages/dashboard/PDVPage.tsx - linha ~950
{
  id: 'venda-sem-produto',
  icon: DollarSign,
  label: 'Venda sem Produto',
  color: 'green',
  hotkey: 'F0',
  onClick: (e?: React.MouseEvent) => {
    // Preencher com nome padrão das configurações
    setDescricaoVendaSemProduto(pdvConfig?.venda_sem_produto_nome_padrao || 'Diversos');
    setValorVendaSemProduto('');
    setShowVendaSemProdutoModal(true);
  }
}
```

### **2. Modal de Entrada**
```typescript
// Estados para o modal
const [showVendaSemProdutoModal, setShowVendaSemProdutoModal] = useState(false);
const [valorVendaSemProduto, setValorVendaSemProduto] = useState('');
const [descricaoVendaSemProduto, setDescricaoVendaSemProduto] = useState('');
```

### **3. Criação do Produto Fictício**
```typescript
// src/pages/dashboard/PDVPage.tsx - função adicionarVendaSemProdutoFinal
const produtoFicticio = {
  id: `venda-sem-produto-${Date.now()}`,
  nome: nome.trim(),
  preco: preco,
  codigo: '999999', // ✅ CÓDIGO FIXO RESERVADO
  grupo_id: '',
  promocao: false
};

const novoItem: ItemCarrinho = {
  id: `${produtoFicticio.id}-${Date.now()}-${Math.random()}`,
  produto: produtoFicticio,
  quantidade: quantidade,
  subtotal: preco * quantidade,
  temOpcoesAdicionais: false,
  vendaSemProduto: true,
  nome: nome.trim(), // ✅ Nome personalizado
  vendedor_id: vendedorSelecionado?.id,
  vendedor_nome: vendedorSelecionado?.nome
};
```

### **4. Validação no Cadastro de Produtos**
```typescript
// src/pages/dashboard/ProdutosPage.tsx
// Bloquear uso do código 999999 em produtos normais
onChange={(e) => {
  const valor = e.target.value;
  if (valor === '999999') {
    showMessage('error', 'Código 999999 é reservado para "Venda sem Produto"');
    return;
  }
  setNovoProduto({ ...novoProduto, codigo: valor });
}}
```

## 🔧 Implementação Backend

### **1. Detecção Automática**
```php
// backend/public/emitir-nfce.php - função buscarDadosFiscaisProduto
function buscarDadosFiscaisProduto($codigoProduto, $empresaId) {
    // ✅ CÓDIGO ESPECIAL: 999999 = Venda sem Produto
    if ($codigoProduto === '999999') {
        logDetalhado('VENDA_SEM_PRODUTO', "Código 999999 detectado");
        return buscarConfiguracoesFiscaisVendaSemProduto($empresaId);
    }
    
    // Buscar produto normal...
}
```

### **2. Busca de Configurações Fiscais**
```php
// Nova função: buscarConfiguracoesFiscaisVendaSemProduto
function buscarConfiguracoesFiscaisVendaSemProduto($empresaId) {
    // Buscar configurações da tabela pdv_config
    $url = "/rest/v1/pdv_config?empresa_id=eq.{$empresaId}&select=venda_sem_produto_*";
    
    // Mapear para formato esperado pelo sistema fiscal
    $dadosFiscais = [
        'codigo' => '999999',
        'origem_produto' => (int)($config['venda_sem_produto_origem'] ?? 0),
        'margem_st' => (float)($config['venda_sem_produto_margem_st'] ?? 0),
        'cest' => $config['venda_sem_produto_cest'] ?? '',
        'aliquota_icms' => (float)($config['venda_sem_produto_aliquota_icms'] ?? 18.0),
        'aliquota_pis' => (float)($config['venda_sem_produto_aliquota_pis'] ?? 1.65),
        'aliquota_cofins' => (float)($config['venda_sem_produto_aliquota_cofins'] ?? 7.6),
        'cst_pis' => '01',
        'cst_cofins' => '01',
    ];
    
    // Mapear situação tributária para CST/CSOSN
    $situacao = $config['venda_sem_produto_situacao_tributaria'] ?? 'tributado_integral';
    switch ($situacao) {
        case 'tributado_integral':
            $dadosFiscais['cst_icms'] = '00';      // Regime Normal
            $dadosFiscais['csosn_icms'] = '102';   // Simples Nacional
            break;
        case 'tributado_st':
            $dadosFiscais['cst_icms'] = '60';      // ST
            $dadosFiscais['csosn_icms'] = '500';   // ST
            break;
        // ... outros casos
    }
    
    return $dadosFiscais;
}
```

## 📊 Mapeamento Fiscal

### **Situação Tributária → CST/CSOSN**
| Situação PDV | CST (Regime Normal) | CSOSN (Simples) | Descrição |
|--------------|-------------------|-----------------|-----------|
| `tributado_integral` | 00 | 102 | Tributação normal |
| `tributado_st` | 60 | 500 | Substituição Tributária |
| `isento` | 40 | 300 | Isento |
| `nao_tributado` | 41 | 400 | Não tributado |

### **Valores Padrão**
- **NCM**: 22021000 (bebidas)
- **CFOP**: 5102 (venda dentro do estado)
- **Origem**: 0 (nacional)
- **ICMS**: 18%
- **PIS**: 1.65%
- **COFINS**: 7.6%

## 🎯 Fluxo Completo

```
1. PDV: F0 → Modal abre com nome padrão
2. Usuário: Digite nome e valor → Enter
3. Frontend: Cria produto fictício com código 999999
4. Carrinho: Exibe item com nome personalizado
5. Finalização: Converte para NFC-e
6. Backend: Detecta código 999999
7. Backend: Busca configurações fiscais do PDV
8. Backend: Aplica dados fiscais automaticamente
9. SEFAZ: Recebe NFC-e com dados corretos
```

## 🔒 Proteções Implementadas

### **Frontend**
- ✅ Validação em tempo real no campo código
- ✅ Validação no salvamento de produtos
- ✅ Mensagens explicativas para o usuário
- ✅ Interface específica para venda sem produto

### **Backend**
- ✅ Detecção automática do código especial
- ✅ Busca configurações específicas da empresa
- ✅ Mapeamento automático CST/CSOSN por regime
- ✅ Logs detalhados para debug
- ✅ Fallbacks seguros se configurações não existirem

## 📁 Arquivos Modificados

### **Frontend**
- `src/pages/dashboard/PDVPage.tsx` - Menu, modal, carrinho
- `src/pages/dashboard/ProdutosPage.tsx` - Validação código 999999
- `src/pages/dashboard/ConfiguracoesPage.tsx` - Interface configurações

### **Backend**
- `backend/public/emitir-nfce.php` - Detecção e aplicação fiscal

### **Banco de Dados**
- `supabase/migrations/20250131000000_add_pdv_config_new_options.sql`
- `supabase/migrations/20250627000000_add_venda_sem_produto_nome_padrao.sql`

## ⚠️ Problemas Conhecidos

### **1. Erro na Emissão NFC-e**
- **Status**: Identificado durante teste
- **Localização**: Emissão de NFC-e com produto código 999999
- **Próximos passos**: Verificar logs do backend e validar dados fiscais

### **2. Possíveis Causas**
- Configurações fiscais não encontradas
- Mapeamento CST/CSOSN incorreto
- Validação de campos obrigatórios
- Dados de unidade de medida ausentes

## 🔍 Debug e Logs

### **Logs Backend**
```bash
# Logs da aplicação
tail -f /var/log/nexo-dev.log

# Logs específicos NFC-e
grep "VENDA_SEM_PRODUTO" /var/log/nginx/nexo-dev-error.log
```

### **Endpoints de Debug**
- Status: http://nexodev.emasoftware.app/backend/public/status-nfe.php
- Logs: http://nexodev.emasoftware.app/backend/public/logs.php

## 🚀 Próximos Passos

1. **Identificar erro específico** na emissão NFC-e
2. **Verificar logs** do backend durante emissão
3. **Validar configurações** fiscais da empresa
4. **Testar mapeamento** CST/CSOSN por regime tributário
5. **Verificar campos obrigatórios** para NFC-e

## 📝 Notas Importantes

- Código 999999 é **RESERVADO** exclusivamente para venda sem produto
- Configurações fiscais são **por empresa** via tabela pdv_config
- Sistema **não usa fallbacks** - sempre busca dados reais
- Mapeamento CST/CSOSN é **automático** baseado no regime tributário
- Logs detalhados estão disponíveis para debug completo
