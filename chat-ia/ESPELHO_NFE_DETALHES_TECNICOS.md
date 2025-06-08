# 🔧 DETALHES TÉCNICOS: Espelho NFe

## 📋 ESTRUTURA DO PROJETO

### Arquivos Existentes (NÃO MODIFICAR):
```
backend/public/emitir-nfe.php          # ✅ Emissão NFe funcionando
backend/public/cancelar-nfe.php        # ✅ Cancelamento funcionando  
backend/public/gerar-danfe.php         # ✅ PDF oficial funcionando
```

### Arquivos do Espelho (PARA IMPLEMENTAR):
```
backend/public/gerar-espelho-simples.php    # CRIAR: Novo endpoint
backend/storage/espelhos/{empresa_id}/      # USAR: Diretório existente
```

## 🎨 LAYOUT DO PDF ESPELHO

### Estrutura Visual:
```
┌─────────────────────────────────────────────────────────┐
│  ⚠️ ESPELHO - DOCUMENTO NÃO VÁLIDO FISCALMENTE ⚠️      │
├─────────────────────────────────────────────────────────┤
│ DADOS DO EMITENTE                                       │
│ Razão Social: [empresa.razao_social]                    │
│ CNPJ: [empresa.documento]                               │
│ Endereço: [empresa.endereco], [empresa.numero]         │
│ Cidade: [empresa.cidade] - [empresa.uf]                │
├─────────────────────────────────────────────────────────┤
│ IDENTIFICAÇÃO DA NFE                                    │
│ Número: [dados_nfe.numero_documento]                    │
│ Série: [dados_nfe.serie]                               │
│ Natureza: [dados_nfe.natureza_operacao]               │
├─────────────────────────────────────────────────────────┤
│ DADOS DO DESTINATÁRIO                                   │
│ Nome: [destinatario.razao_social]                       │
│ CNPJ: [destinatario.cnpj]                              │
├─────────────────────────────────────────────────────────┤
│ PRODUTOS/SERVIÇOS                                       │
│ ┌─────┬──────────────┬─────┬──────┬──────┬──────────┐   │
│ │Cód  │ Descrição    │ UN  │ Qtd  │ Vlr  │ Total    │   │
│ ├─────┼──────────────┼─────┼──────┼──────┼──────────┤   │
│ │[cod]│ [descricao]  │[un] │[qtd] │[vlr] │[total]   │   │
│ └─────┴──────────────┴─────┴──────┴──────┴──────────┘   │
├─────────────────────────────────────────────────────────┤
│ TOTAIS                                                  │
│ Valor Total dos Produtos: R$ [valor_total]             │
│ Valor Total da Nota: R$ [valor_total]                  │
└─────────────────────────────────────────────────────────┘
```

## 💻 CÓDIGO TCPDF EXEMPLO

### Cabeçalho com Marca D'água:
```php
// Marca d'água vermelha
$pdf->SetTextColor(255, 0, 0);
$pdf->SetFont('helvetica', 'B', 16);
$pdf->Cell(0, 15, '⚠️ ESPELHO - DOCUMENTO NÃO VÁLIDO FISCALMENTE ⚠️', 0, 1, 'C');
$pdf->Ln(5);
```

### Seção Empresa:
```php
$pdf->SetTextColor(0, 0, 0);
$pdf->SetFont('helvetica', 'B', 12);
$pdf->Cell(0, 8, 'DADOS DO EMITENTE', 1, 1, 'C', true);

$pdf->SetFont('helvetica', '', 10);
$pdf->Cell(0, 6, 'Razão Social: ' . $empresa['razao_social'], 0, 1);
$pdf->Cell(0, 6, 'CNPJ: ' . formatarCNPJ($empresa['documento']), 0, 1);
$pdf->Cell(0, 6, 'Endereço: ' . $empresa['endereco'] . ', ' . $empresa['numero'], 0, 1);
$pdf->Cell(0, 6, 'Cidade: ' . $empresa['cidade'] . ' - ' . $empresa['uf'], 0, 1);
```

### Tabela de Produtos:
```php
// Cabeçalho da tabela
$pdf->SetFont('helvetica', 'B', 9);
$pdf->Cell(20, 8, 'Código', 1, 0, 'C');
$pdf->Cell(60, 8, 'Descrição', 1, 0, 'C');
$pdf->Cell(15, 8, 'UN', 1, 0, 'C');
$pdf->Cell(20, 8, 'Qtd', 1, 0, 'C');
$pdf->Cell(25, 8, 'Vlr Unit', 1, 0, 'C');
$pdf->Cell(25, 8, 'Total', 1, 1, 'C');

// Produtos
$pdf->SetFont('helvetica', '', 8);
foreach ($produtos as $produto) {
    $pdf->Cell(20, 6, $produto['codigo'], 1, 0, 'C');
    $pdf->Cell(60, 6, substr($produto['descricao'], 0, 30), 1, 0, 'L');
    $pdf->Cell(15, 6, $produto['unidade'], 1, 0, 'C');
    $pdf->Cell(20, 6, number_format($produto['quantidade'], 2), 1, 0, 'R');
    $pdf->Cell(25, 6, 'R$ ' . number_format($produto['valor_unitario'], 2), 1, 0, 'R');
    $pdf->Cell(25, 6, 'R$ ' . number_format($produto['valor_total'], 2), 1, 1, 'R');
}
```

## 🔧 CONFIGURAÇÃO NGINX

### Adicionar ao nginx.conf:
```nginx
# Servir PDFs do espelho
location /espelhos/ {
    alias /root/nexo/nexo-pedidos/backend/storage/espelhos/;
    
    # Headers para PDF
    add_header Content-Type application/pdf;
    add_header Content-Disposition inline;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    
    # Não fazer fallback
    try_files $uri =404;
}
```

### Recarregar Nginx:
```bash
sudo cp /root/nexo/nexo-pedidos/backend/nginx-working.conf /etc/nginx/sites-available/default
sudo nginx -t
sudo systemctl reload nginx
```

## 📱 FRONTEND INTEGRATION

### Endpoint Call:
```typescript
const response = await fetch('/backend/public/gerar-espelho-simples.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    empresa_id: usuarioData.empresa_id,
    dados_nfe: nfeData
  })
});

const result = await response.json();
if (result.sucesso) {
  window.open(`/espelhos/${usuarioData.empresa_id}/${result.arquivo}`, '_blank');
}
```

## 🔍 VALIDAÇÕES NECESSÁRIAS

### Backend:
```php
// Validar empresa_id
if (!preg_match('/^[0-9a-f-]{36}$/i', $empresaId)) {
    throw new Exception('empresa_id inválido');
}

// Validar dados obrigatórios
if (empty($dadosNfe['numero_documento'])) {
    throw new Exception('Número do documento é obrigatório');
}

// Validar produtos
if (empty($dadosNfe['produtos']) || !is_array($dadosNfe['produtos'])) {
    throw new Exception('Pelo menos um produto é obrigatório');
}
```

## 🗂️ ESTRUTURA DE ARQUIVOS

### Nomenclatura:
```
espelho_nfe_{empresa_id}_{timestamp}.pdf
```

### Exemplo:
```
backend/storage/espelhos/
├── acd26a4f-7220-405e-9c96-faffb7e6480e/
│   ├── espelho_nfe_acd26a4f-7220-405e-9c96-faffb7e6480e_20250608154530.pdf
│   └── espelho_nfe_acd26a4f-7220-405e-9c96-faffb7e6480e_20250608154612.pdf
└── outro-empresa-id/
    └── espelho_nfe_outro-empresa-id_20250608154700.pdf
```

## 🧹 LIMPEZA AUTOMÁTICA

### Script de Limpeza (opcional):
```php
// Remover arquivos de espelho com mais de 24h
$diretorio = "../storage/espelhos/{$empresaId}";
$arquivos = glob("{$diretorio}/espelho_*.pdf");

foreach ($arquivos as $arquivo) {
    if (filemtime($arquivo) < time() - 86400) { // 24h
        unlink($arquivo);
    }
}
```

## 🎯 CHECKLIST FINAL

- [ ] Criar `gerar-espelho-simples.php`
- [ ] Configurar Nginx para servir PDFs
- [ ] Testar geração de PDF
- [ ] Testar abertura em nova aba
- [ ] Validar layout responsivo
- [ ] Verificar marca d'água visível
- [ ] Testar com dados reais
- [ ] Confirmar multi-tenant funcionando

---

**IMPLEMENTAR**: Use TCPDF diretamente, sem bibliotecas NFe complexas.
