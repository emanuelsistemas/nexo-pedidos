# 📋 DOCUMENTAÇÃO: Implementação do Espelho NFe

## 🎯 OBJETIVO
Implementar funcionalidade de **"Espelho"** da NFe que permite visualizar como ficará a DANFE antes da emissão oficial, para conferência e aprovação.

## 📊 STATUS ATUAL
- ❌ **TENTATIVA 1**: HTML simples - Nginx não serviu corretamente
- ❌ **TENTATIVA 2**: Biblioteca sped-da - Travou por precisar de certificados
- 🔄 **PRÓXIMO PASSO**: Implementação simplificada funcional

## 🔍 ANÁLISE DO PROBLEMA

### ❌ Problemas Encontrados:
1. **Nginx Configuration**: Não conseguiu servir arquivos HTML do espelho
2. **Biblioteca sped-da**: Requer certificados digitais mesmo para espelho
3. **Complexidade Desnecessária**: Tentativas muito elaboradas

### ✅ Solução Recomendada:
**Gerar PDF simples usando TCPDF diretamente** (sem bibliotecas NFe)

## 📁 ESTRUTURA ATUAL

### Arquivos Criados:
```
backend/public/gerar-espelho-nfe.php     # HTML simples (não funcionou)
backend/public/gerar-espelho-danfe.php   # sped-da (travou)
backend/storage/espelhos/                # Diretório para arquivos
```

### Frontend Atualizado:
```typescript
// src/pages/dashboard/NfePage.tsx
const handleGerarEspelho = async () => {
  // Chama endpoint /backend/public/gerar-espelho-danfe.php
  // Abre PDF em nova aba
}
```

## 🎨 INTERFACE ATUAL
- ✅ **Botão "Espelho"** já implementado na interface NFe
- ✅ **Coleta dados do formulário** automaticamente
- ✅ **Abre em nova aba** quando PDF é gerado
- ✅ **Mensagens de feedback** para usuário

## 🔧 IMPLEMENTAÇÃO TÉCNICA

### Dados Coletados:
```json
{
  "empresa_id": "uuid",
  "dados_nfe": {
    "numero_documento": "999999999",
    "serie": "1", 
    "natureza_operacao": "Venda de Mercadoria",
    "destinatario": {
      "cnpj": "12345678000123",
      "razao_social": "Cliente Teste"
    },
    "produtos": [
      {
        "codigo": "001",
        "descricao": "Produto Teste", 
        "quantidade": 1,
        "valor_unitario": 100.00,
        "valor_total": 100.00,
        "ncm": "12345678",
        "cfop": "5102",
        "unidade": "UN"
      }
    ]
  }
}
```

### Fluxo Esperado:
1. **Usuário clica "Espelho"**
2. **Sistema coleta dados do formulário**
3. **Backend gera PDF simples**
4. **PDF é salvo em `/storage/espelhos/{empresa_id}/`**
5. **Frontend abre PDF em nova aba**

## 🚀 PRÓXIMOS PASSOS PARA CONCLUSÃO

### 1. Criar Gerador PDF Simples
```php
// backend/public/gerar-espelho-simples.php
<?php
require_once '../vendor/autoload.php';

// Usar TCPDF diretamente (sem bibliotecas NFe)
$pdf = new TCPDF();
$pdf->AddPage();

// Cabeçalho com marca d'água
$pdf->SetFont('helvetica', 'B', 16);
$pdf->SetTextColor(255, 0, 0);
$pdf->Cell(0, 10, '⚠️ ESPELHO - NÃO VÁLIDO FISCALMENTE ⚠️', 0, 1, 'C');

// Dados da empresa
$pdf->SetTextColor(0, 0, 0);
$pdf->SetFont('helvetica', 'B', 12);
$pdf->Cell(0, 10, 'DADOS DO EMITENTE', 0, 1);
// ... adicionar dados

// Dados do destinatário  
$pdf->Cell(0, 10, 'DADOS DO DESTINATÁRIO', 0, 1);
// ... adicionar dados

// Tabela de produtos
$pdf->Cell(0, 10, 'PRODUTOS/SERVIÇOS', 0, 1);
// ... tabela com produtos

// Totais
$pdf->Cell(0, 10, 'TOTAIS', 0, 1);
// ... valores totais

// Salvar PDF
$pdfContent = $pdf->Output('', 'S');
file_put_contents($caminhoArquivo, $pdfContent);
?>
```

### 2. Configurar Nginx para Servir PDFs
```nginx
# Adicionar ao nginx.conf
location /espelhos/ {
    alias /root/nexo/nexo-pedidos/backend/storage/espelhos/;
    add_header Content-Type application/pdf;
    try_files $uri =404;
}
```

### 3. Testar Funcionalidade
- Preencher formulário NFe
- Clicar botão "Espelho"
- Verificar se PDF abre corretamente
- Validar layout e informações

## 🔒 CONFORMIDADE COM AS 4 LEIS NFE

### ✅ LEI DOS DADOS REAIS
- Usar apenas dados reais do formulário
- Não usar fallbacks ou dados fictícios

### ✅ LEI DA BIBLIOTECA SAGRADA  
- Não modificar sped-nfe
- Usar TCPDF independente para espelho

### ✅ LEI DA AUTENTICIDADE
- Marcar claramente como "ESPELHO"
- Não simular NFe real

### ✅ LEI DA EXCELÊNCIA
- Implementação correta e simples
- Não usar workarounds

## 📝 OBSERVAÇÕES IMPORTANTES

1. **Multi-tenant**: Arquivos organizados por `empresa_id`
2. **Segurança**: Validar `empresa_id` do usuário logado
3. **Performance**: Limpar arquivos antigos periodicamente
4. **UX**: Feedback claro durante geração
5. **Responsivo**: PDF deve ser visualizável em mobile

## 🎯 RESULTADO ESPERADO
- PDF limpo e organizado
- Marca d'água clara de que é espelho
- Todas as informações do formulário
- Abertura automática em nova aba
- Funcionalidade estável e rápida

---

**PRÓXIMA IA**: Implemente a solução usando TCPDF diretamente, seguindo as especificações acima.
