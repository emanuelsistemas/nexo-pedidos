# 🔧 Guia de Implementação - Lógica Fiscal NFC-e Devolução

## 🎯 **OBJETIVO**

Implementar a lógica de emissão de NFC-e de devolução quando o usuário clicar no botão "Confirmar Devolução NFC-e".

## 📍 **LOCALIZAÇÃO DO CÓDIGO**

### **Arquivo Principal**
```
src/components/devolucao/NovaDevolucaoModal.tsx
```

### **Função a Implementar**
```typescript
// Linha ~1180 - Dentro do FinalizarDevolucaoModal
const handleConfirmarDevolucao = async (tipoConfirmacao: 'manual' | 'nfce') => {
  // ... código existente para validação manual ...
  
  // IMPLEMENTAR AQUI: Lógica para tipoConfirmacao === 'nfce'
  await handleConfirm(tipoConfirmacao);
};
```

## 🔄 **FLUXO DE IMPLEMENTAÇÃO**

### **1. Validação de Dados Fiscais**
```typescript
const validarDadosFiscais = (itens: ItemVenda[]) => {
  const erros: string[] = [];
  
  itens.forEach(item => {
    if (!item.dadosFiscais) {
      erros.push(`Produto ${item.nome_produto}: Dados fiscais não encontrados`);
      return;
    }
    
    const { ncm, cfop, csosn_icms, unidade_medida } = item.dadosFiscais;
    
    if (!ncm) erros.push(`Produto ${item.nome_produto}: NCM obrigatório`);
    if (!cfop) erros.push(`Produto ${item.nome_produto}: CFOP obrigatório`);
    if (!csosn_icms) erros.push(`Produto ${item.nome_produto}: CSOSN obrigatório`);
    if (!unidade_medida?.sigla) erros.push(`Produto ${item.nome_produto}: Unidade de medida obrigatória`);
  });
  
  return erros;
};
```

### **2. Preparação dos Dados para API**
```typescript
const prepararDadosNFCe = (itens: ItemVenda[], vendaOrigem: any) => {
  return {
    chave_nfe_original: vendaOrigem.chave_nfe,
    modelo_documento: 65, // NFC-e
    cfop_devolucao: '5202',
    ambiente: ambienteNFe,
    itens: itens.map(item => ({
      produto_id: item.produto_id,
      codigo_produto: item.dadosFiscais.codigo,
      nome_produto: item.nome_produto,
      ncm: item.dadosFiscais.ncm,
      cfop: '5202', // CFOP específico para devolução
      csosn: item.dadosFiscais.csosn_icms,
      unidade_medida: item.dadosFiscais.unidade_medida.sigla,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
      valor_total: item.valor_total_item,
      aliquota_icms: item.dadosFiscais.aliquota_icms || 0,
      aliquota_pis: item.dadosFiscais.aliquota_pis || 0,
      aliquota_cofins: item.dadosFiscais.aliquota_cofins || 0
    }))
  };
};
```

### **3. Chamada para API Fiscal**
```typescript
const emitirNFCeDevolucao = async (dadosNFCe: any) => {
  try {
    // Endpoint da API fiscal (a ser definido)
    const response = await fetch('/backend/public/nfce-devolucao.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        empresa_id: empresaId,
        ...dadosNFCe
      })
    });
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    const resultado = await response.json();
    
    if (resultado.erro) {
      throw new Error(resultado.mensagem || 'Erro na emissão da NFC-e');
    }
    
    return resultado;
  } catch (error) {
    console.error('Erro ao emitir NFC-e:', error);
    throw error;
  }
};
```

### **4. Implementação Completa**
```typescript
const handleConfirmarDevolucao = async (tipoConfirmacao: 'manual' | 'nfce') => {
  if (isLoading) return;

  // Validação para devolução manual de NFC-e (já implementado)
  if (tipoConfirmacao === 'manual') {
    const vendaOrigem = getVendaOrigemInfo();
    if (vendaOrigem?.modelo_documento === 65) {
      setShowConfirmacaoManualModal(true);
      return;
    }
  }

  // NOVA IMPLEMENTAÇÃO: Lógica para NFC-e
  if (tipoConfirmacao === 'nfce') {
    try {
      setIsLoading(true);
      
      // 1. Obter dados da venda origem
      const vendaOrigem = getVendaOrigemInfo();
      if (!vendaOrigem) {
        throw new Error('Venda de origem não encontrada');
      }
      
      if (vendaOrigem.modelo_documento !== 65) {
        throw new Error('Devolução NFC-e só é possível para vendas que foram emitidas com NFC-e');
      }
      
      if (!vendaOrigem.chave_nfe) {
        throw new Error('Chave da NFC-e original não encontrada');
      }
      
      // 2. Validar dados fiscais
      const erros = validarDadosFiscais(itensComDadosFiscais);
      if (erros.length > 0) {
        throw new Error(`Dados fiscais incompletos:\n${erros.join('\n')}`);
      }
      
      // 3. Preparar dados para API
      const dadosNFCe = prepararDadosNFCe(itensComDadosFiscais, vendaOrigem);
      
      // 4. Emitir NFC-e de devolução
      const resultadoNFCe = await emitirNFCeDevolucao(dadosNFCe);
      
      // 5. Processar resultado
      if (resultadoNFCe.sucesso) {
        // Salvar dados da NFC-e emitida
        await salvarDevolucaoNFCe(resultadoNFCe);
        
        // Proceder com a criação da devolução
        await handleConfirm(tipoConfirmacao, {
          chave_nfce_devolucao: resultadoNFCe.chave,
          numero_nfce: resultadoNFCe.numero,
          protocolo: resultadoNFCe.protocolo
        });
      } else {
        throw new Error(resultadoNFCe.mensagem || 'Erro na emissão da NFC-e');
      }
      
    } catch (error) {
      console.error('Erro ao processar devolução NFC-e:', error);
      
      // Mostrar erro para o usuário
      alert(`Erro ao emitir NFC-e de devolução:\n${error.message}`);
      
      // Opcionalmente, oferecer fallback para devolução manual
      const confirmarManual = confirm(
        'Deseja prosseguir com devolução manual?\n' +
        'ATENÇÃO: Não será emitida devolução fiscal.'
      );
      
      if (confirmarManual) {
        await handleConfirm('manual');
      }
    } finally {
      setIsLoading(false);
    }
    
    return;
  }

  // Proceder com devolução manual normal
  await handleConfirm(tipoConfirmacao);
};
```

## 🗄️ **ESTRUTURA DE DADOS ESPERADA**

### **Request para API**
```json
{
  "empresa_id": "uuid",
  "chave_nfe_original": "35250824163237000151650040000002911319909367",
  "modelo_documento": 65,
  "cfop_devolucao": "5202",
  "ambiente": "homologacao",
  "itens": [
    {
      "produto_id": "uuid",
      "codigo_produto": "123456",
      "nome_produto": "Açaí 300 ml",
      "ncm": "21069090",
      "cfop": "5202",
      "csosn": "102",
      "unidade_medida": "UN",
      "quantidade": 1,
      "valor_unitario": 5.50,
      "valor_total": 5.50,
      "aliquota_icms": 18,
      "aliquota_pis": 1.65,
      "aliquota_cofins": 7.6
    }
  ]
}
```

### **Response da API**
```json
{
  "sucesso": true,
  "chave": "35250824163237000151650040000002921319909368",
  "numero": "292",
  "protocolo": "135250000000001",
  "xml": "<?xml version='1.0'...",
  "pdf_url": "https://...",
  "mensagem": "NFC-e emitida com sucesso"
}
```

## ⚠️ **TRATAMENTO DE ERROS**

### **Erros Comuns**
1. **Dados fiscais incompletos** - Validar antes de enviar
2. **Conectividade SEFAZ** - Retry automático
3. **Rejeição fiscal** - Mostrar código e descrição
4. **Chave NFC-e inválida** - Validar formato
5. **Ambiente incorreto** - Verificar configuração

### **Fallback para Devolução Manual**
```typescript
const oferecerFallbackManual = async (erro: Error) => {
  const confirmar = confirm(
    `Erro na emissão da NFC-e: ${erro.message}\n\n` +
    'Deseja prosseguir com devolução manual?\n' +
    'ATENÇÃO: Não será emitida devolução fiscal.'
  );
  
  if (confirmar) {
    await handleConfirm('manual');
  }
};
```

## 🔗 **INTEGRAÇÃO COM BACKEND**

### **Endpoint Necessário**
```php
// /backend/public/nfce-devolucao.php
<?php
// 1. Validar dados recebidos
// 2. Montar XML da NFC-e
// 3. Assinar digitalmente
// 4. Enviar para SEFAZ
// 5. Processar retorno
// 6. Salvar na base
// 7. Retornar resultado
?>
```

### **Tabelas de Banco**
```sql
-- Salvar dados da NFC-e emitida
CREATE TABLE nfce_devolucao (
  id UUID PRIMARY KEY,
  empresa_id UUID REFERENCES empresas(id),
  devolucao_id UUID REFERENCES devolucoes(id),
  chave_nfe VARCHAR(44),
  numero_nfce INTEGER,
  protocolo VARCHAR(50),
  xml_nfce TEXT,
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🧪 **TESTES RECOMENDADOS**

### **1. Ambiente Homologação**
- Emissão com dados válidos
- Validação de campos obrigatórios
- Tratamento de rejeições SEFAZ

### **2. Cenários de Erro**
- Conectividade indisponível
- Dados fiscais incompletos
- Chave NFC-e inválida

### **3. Integração Completa**
- Fluxo completo: seleção → emissão → salvamento
- Verificação de dados salvos
- Geração de relatórios

## 🎯 **CHECKLIST DE IMPLEMENTAÇÃO**

- [ ] Implementar validação de dados fiscais
- [ ] Criar função de preparação de dados
- [ ] Implementar chamada para API fiscal
- [ ] Adicionar tratamento de erros
- [ ] Criar endpoint backend
- [ ] Configurar tabelas de banco
- [ ] Testar em homologação
- [ ] Validar integração completa
- [ ] Documentar logs e auditoria
- [ ] Testar cenários de erro

**🎯 Foco: Implementar a lógica dentro da função `handleConfirmarDevolucao` quando `tipoConfirmacao === 'nfce'`**
