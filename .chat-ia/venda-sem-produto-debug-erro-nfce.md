# 🚨 Venda sem Produto - Debug Erro NFC-e

## 📋 Status Atual

- ✅ **Frontend**: Implementado e funcionando
- ✅ **Código 999999**: Reservado e protegido
- ✅ **Configurações PDV**: Interface criada
- ❌ **Emissão NFC-e**: Erro identificado durante teste

## 🔍 Erro Identificado

**Situação**: Erro ao emitir NFC-e com produto de venda sem produto (código 999999)

**Localização**: Backend - `emitir-nfce.php`

## 🎯 Pontos de Investigação

### **1. Verificar Logs Backend**
```bash
# Logs gerais
tail -f /var/log/nexo-dev.log

# Logs específicos de venda sem produto
grep "VENDA_SEM_PRODUTO" /var/log/nginx/nexo-dev-error.log

# Logs de erro NFC-e
grep "999999" /var/log/nginx/nexo-dev-error.log
```

### **2. Endpoints de Debug**
- **Status NFC-e**: http://nexodev.emasoftware.app/backend/public/status-nfe.php
- **Logs Sistema**: http://nexodev.emasoftware.app/backend/public/logs.php

### **3. Verificar Configurações PDV**
```sql
-- Verificar se empresa tem configurações de venda sem produto
SELECT 
  empresa_id,
  venda_sem_produto,
  venda_sem_produto_nome_padrao,
  venda_sem_produto_ncm,
  venda_sem_produto_cfop,
  venda_sem_produto_origem,
  venda_sem_produto_situacao_tributaria,
  venda_sem_produto_aliquota_icms,
  venda_sem_produto_aliquota_pis,
  venda_sem_produto_aliquota_cofins
FROM pdv_config 
WHERE empresa_id = 'ID_DA_EMPRESA';
```

## 🔧 Possíveis Causas do Erro

### **1. Configurações Fiscais Ausentes**
```php
// Verificar se função retorna dados
$dadosFiscais = buscarConfiguracoesFiscaisVendaSemProduto($empresaId);
if (!$dadosFiscais) {
    // Configurações não encontradas
}
```

### **2. Campos Obrigatórios NFC-e**
Verificar se todos os campos obrigatórios estão sendo preenchidos:
- **cProd**: ✅ 999999
- **xProd**: ✅ Nome do item
- **NCM**: ❓ Verificar se está vindo das configurações
- **CFOP**: ❓ Verificar se está vindo das configurações
- **uCom**: ❓ Unidade de medida pode estar ausente
- **qCom**: ✅ Quantidade
- **vUnCom**: ✅ Valor unitário

### **3. Unidade de Medida**
```php
// Produto fictício pode não ter unidade de medida
// Verificar se precisa buscar unidade padrão
$unidadePadrao = buscarUnidadeMedidaPadrao($empresaId);
```

### **4. Dados do Produto**
```php
// Verificar estrutura do produto fictício
$produtoFicticio = [
    'codigo' => '999999',
    'nome' => $nomeItem,
    'preco' => $valor,
    'unidade_medida_id' => $unidadePadrao, // ❓ Pode estar ausente
    'ncm' => $configPDV['venda_sem_produto_ncm'],
    'cfop' => $configPDV['venda_sem_produto_cfop'],
    // ... outros campos fiscais
];
```

## 🛠️ Ações de Debug Recomendadas

### **1. Adicionar Logs Detalhados**
```php
// Em buscarConfiguracoesFiscaisVendaSemProduto
logDetalhado('VENDA_SEM_PRODUTO_CONFIG', "Configurações encontradas", [
    'empresa_id' => $empresaId,
    'config' => $config,
    'dados_fiscais' => $dadosFiscais
]);
```

### **2. Verificar Estrutura do Item**
```php
// Antes de processar item para NFC-e
logDetalhado('VENDA_SEM_PRODUTO_ITEM', "Estrutura do item", [
    'codigo' => $item['codigo'],
    'nome' => $item['nome'],
    'dados_fiscais' => $dadosFiscais
]);
```

### **3. Validar Campos Obrigatórios**
```php
// Verificar se todos os campos estão preenchidos
$camposObrigatorios = ['ncm', 'cfop', 'origem_produto', 'cst_icms'];
foreach ($camposObrigatorios as $campo) {
    if (empty($dadosFiscais[$campo])) {
        logDetalhado('VENDA_SEM_PRODUTO_ERROR', "Campo obrigatório ausente: {$campo}");
    }
}
```

## 🔍 Checklist de Verificação

### **Frontend**
- [ ] Modal abre corretamente com F0
- [ ] Nome é digitado e salvo no item
- [ ] Item aparece no carrinho com nome correto
- [ ] Código 999999 é aplicado ao produto fictício

### **Backend**
- [ ] Função `buscarDadosFiscaisProduto` detecta código 999999
- [ ] Função `buscarConfiguracoesFiscaisVendaSemProduto` é chamada
- [ ] Configurações PDV são encontradas no banco
- [ ] Dados fiscais são mapeados corretamente
- [ ] CST/CSOSN são definidos baseado no regime tributário

### **Banco de Dados**
- [ ] Tabela `pdv_config` tem campos de venda sem produto
- [ ] Empresa tem configurações preenchidas
- [ ] Valores padrão estão corretos

### **NFC-e**
- [ ] Todos os campos obrigatórios estão preenchidos
- [ ] Unidade de medida está definida
- [ ] Valores fiscais estão corretos
- [ ] XML é gerado sem erros

## 🚀 Próximos Passos Imediatos

### **1. Reproduzir o Erro**
1. Acessar PDV
2. Pressionar F0
3. Digitar nome e valor
4. Adicionar ao carrinho
5. Tentar emitir NFC-e
6. Capturar erro específico

### **2. Analisar Logs**
1. Verificar logs durante emissão
2. Identificar onde o erro ocorre
3. Verificar se configurações são encontradas
4. Validar dados fiscais aplicados

### **3. Corrigir Problema**
1. Identificar campo/validação que está falhando
2. Implementar correção específica
3. Testar novamente
4. Validar emissão completa

## 📝 Informações para Próxima IA

### **Contexto Completo**
- Sistema de venda sem produto implementado
- Código 999999 reservado e funcionando
- Frontend operacional
- Backend com detecção automática
- Erro específico na emissão NFC-e

### **Arquivos Principais**
- `src/pages/dashboard/PDVPage.tsx` - Interface PDV
- `backend/public/emitir-nfce.php` - Emissão NFC-e
- `pdv_config` - Configurações fiscais

### **Foco da Investigação**
- Identificar erro específico na emissão
- Verificar campos obrigatórios NFC-e
- Validar configurações fiscais
- Corrigir problema pontual

### **Não Refazer**
- ✅ Interface PDV está funcionando
- ✅ Código 999999 está protegido
- ✅ Configurações PDV estão criadas
- ✅ Detecção backend está implementada

**Foco apenas na correção do erro de emissão NFC-e!**
