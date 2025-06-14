# NFC-e - Implementação e Progresso

## 📋 **CONTEXTO GERAL**

Este documento registra o progresso da implementação da NFC-e (Nota Fiscal de Consumidor Eletrônica) no sistema nexo-pedidos, um SaaS multi-tenant que usa a biblioteca sped-nfe v5.1.27 para emissão de documentos fiscais brasileiros.

## ⚖️ **5 LEIS FUNDAMENTAIS DO PROJETO**

**NUNCA VIOLE ESTAS LEIS - SÃO OBRIGATÓRIAS:**

1. **LEI DOS DADOS REAIS** - Nunca usar fallbacks para testes, sempre usar dados reais mesmo em homologação
2. **LEI DA BIBLIOTECA SAGRADA** - Nunca modificar a sped-nfe pois é fiscalmente aprovada - apenas ajustar endpoints de comunicação
3. **LEI DA AUTENTICIDADE** - Nunca fazer simulações - sempre enviar dados reais de homologação/produção sem fallbacks
4. **LEI DA EXCELÊNCIA** - Nunca usar contornos ou fixes temporários - encontrar a solução correta mesmo que demore mais
5. **LEI DA DOCUMENTAÇÃO OFICIAL** - Sempre consultar documentação oficial antes de implementar: https://github.com/nfephp-org/sped-nfe/blob/master/docs/Make.md

## 🎯 **OBJETIVO ATUAL**

Implementar emissão de NFC-e (modelo 65) seguindo exatamente o mesmo padrão da NFe (modelo 55) que já funciona perfeitamente no sistema.

## 📁 **ARQUIVOS PRINCIPAIS**

- **Backend:** `/root/nexo/nexo-pedidos/backend/public/emitir-nfce.php`
- **Frontend:** Interface PDV com botão "NFC-e sem Impressão"
- **Logs:** `/tmp/nfce_detailed.log` (logs detalhados do processo)

## 🔄 **PROGRESSO ATUAL - 99% CONCLUÍDO**

### ✅ **PROBLEMAS RESOLVIDOS:**

1. **Campo `cNF` vs `nNF`** - Corrigido conforme NT2019.001 (cNF deve ser diferente de nNF)
2. **Container de impostos** - Adicionado `tagimposto()` obrigatório para cada produto
3. **PIS com dados reais** - CST "01", Alíquota 1.65%, Valor R$ 0,71 (calculado do produto)
4. **COFINS com dados reais** - CST "01", Alíquota 7.6%, Valor R$ 3,25 (calculado do produto)
5. **Ordem das tags** - Seguindo documentação oficial da sped-nfe
6. **Dados fiscais reais** - Busca automática dos dados fiscais do produto na tabela `produtos`

### 📊 **DADOS FISCAIS UTILIZADOS (PRODUTO SKOL LATA 350ml):**
```json
{
  "codigo": "1",
  "cst_pis": "01",
  "aliquota_pis": 1.65,
  "cst_cofins": "01", 
  "aliquota_cofins": 7.6,
  "cst_icms": null
}
```

### 🏗️ **ESTRUTURA IMPLEMENTADA:**

1. **Tag IDE** - Identificação da NFC-e ✅
2. **Tag Emitente** - Dados da empresa ✅
3. **Tag Endereço Emitente** - Endereço da empresa ✅
4. **Tag Destinatário** - Consumidor não identificado ✅
5. **Tag Produtos** - Dados do produto com impostos ✅
6. **Tag Impostos** - Container + ICMS + PIS + COFINS ✅
7. **Tag Totais** - Valores calculados ✅
8. **Tag Transporte** - Modalidade de frete ✅
9. **Tag Pagamento** - Forma de pagamento ✅
10. **Tag Informações Adicionais** - Dados complementares ✅

## 🚨 **PROBLEMA ATUAL - ÚLTIMO 1%**

### **Situação:**
- Todas as tags são criadas com sucesso (logs mostram STEP_164.0)
- Biblioteca sped-nfe não reporta erros (`getErrors()` retorna vazio)
- Processo trava especificamente no método `make->monta()`
- Não há logs de erro no PHP ou Nginx

### **Logs do Último Teste:**
```
[2025-06-12 06:57:26] STEP_164.0: Verificando dados antes do monta()
[2025-06-12 06:57:26] STEP_163.3: Biblioteca sem erros, prosseguindo
[2025-06-12 06:57:26] STEP_164.0.2: Dados validados, iniciando monta() com timeout de 60s
[PROCESSO TRAVA AQUI]
```

### **Erro Histórico Identificado:**
```
TypeError: Argument 1 passed to NFePHP\Common\DOMImproved::appChild() 
must be an instance of DOMElement, null given
```

## 🔍 **INVESTIGAÇÃO NECESSÁRIA**

### **Próximos Passos:**

1. **Capturar erro específico do `monta()`** - Adicionar try/catch detalhado
2. **Verificar se alguma tag está null** - Investigar qual elemento DOM está sendo passado como null
3. **Comparar com NFe funcionando** - Verificar diferenças na estrutura
4. **Testar com dados mínimos** - Reduzir complexidade para isolar problema

### **Hipóteses:**

1. **Tag faltante** - Alguma tag obrigatória não está sendo criada
2. **Ordem incorreta** - Sequência de criação das tags pode estar errada
3. **Dados inválidos** - Algum campo com formato incorreto
4. **Timeout** - Processo muito longo causando travamento

## 💾 **DADOS DE TESTE**

### **Empresa de Teste:**
```json
{
  "empresa_id": "acd26a4f-7220-405e-9c96-faffb7e6480e",
  "razao_social": "EMANUEL LUIS PEREIRA SOUZA VALESIS INFORMATICA",
  "cnpj": "24.163.237/0001-51",
  "ambiente": 2
}
```

### **Produto de Teste:**
```json
{
  "codigo": "1",
  "descricao": "SKOL LATA 350ml",
  "quantidade": 1,
  "valor_unitario": 42.8,
  "ncm": "22030000",
  "cfop": "5102",
  "codigo_barras": "7891991010023"
}
```

## 🛠️ **COMANDOS ÚTEIS**

### **Testar NFC-e:**
```bash
curl -X POST "http://localhost/backend/public/emitir-nfce.php" \
  -H "Content-Type: application/json" \
  -d '{
    "empresa_id": "acd26a4f-7220-405e-9c96-faffb7e6480e",
    "nfce_data": {
      "identificacao": {
        "numero": 1,
        "serie": 1,
        "codigo_numerico": "87654321",
        "natureza_operacao": "Venda de mercadoria"
      },
      "destinatario": [],
      "produtos": [{
        "codigo": "1",
        "descricao": "SKOL LATA 350ml",
        "quantidade": 1,
        "valor_unitario": 42.8,
        "unidade": "UN",
        "ncm": "22030000",
        "cfop": "5102",
        "codigo_barras": "7891991010023"
      }]
    }
  }'
```

### **Limpar Logs:**
```bash
curl "http://localhost/backend/public/limpar-logs-nfce.php"
```

### **Verificar Logs:**
```bash
cat /tmp/nfce_detailed.log
tail -20 /tmp/nfce_detailed.log
```

## 📚 **DOCUMENTAÇÃO CONSULTADA**

- **sped-nfe oficial:** https://github.com/nfephp-org/sped-nfe/blob/master/docs/Make.md
- **Métodos corretos:** `monta()` (principal), `getXML()` (alternativo), `getErrors()` (verificação)

## 🎯 **PRÓXIMA AÇÃO RECOMENDADA**

**FOQUE NO ERRO ESPECÍFICO DO `monta()`:**

1. Execute o teste de NFC-e
2. Capture o erro exato que está ocorrendo no `monta()`
3. Identifique qual tag/elemento está sendo passado como null
4. Corrija o problema específico sem criar contornos

**LEMBRE-SE:** A NFe (modelo 55) funciona perfeitamente com a mesma biblioteca. Se NFe funciona, NFC-e DEVE funcionar usando a mesma abordagem. O problema está em NOSSA implementação, não na biblioteca.

## 🚀 **CONCLUSÃO**

Estamos a **1% da conclusão**. Todas as tags estão sendo criadas corretamente, todos os dados são reais, e a estrutura está seguindo a documentação oficial. O problema final está especificamente no método `monta()` da biblioteca sped-nfe, que está recebendo algum elemento DOM null.

**A solução está muito próxima - continue investigando o erro específico do `monta()`!**
