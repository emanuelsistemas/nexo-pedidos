# 📡 API Reference - Sistema de Email NFe

## 🎯 Visão Geral

Este documento descreve as APIs e métodos disponíveis no sistema de email para NFe.

## 📋 Endpoints Disponíveis

### 1. Envio de NFe por Email

#### `POST /backend/public/enviar-nfe-email.php`

Envia NFe por email com XML e PDF anexados.

**Request:**
```json
{
  "empresa_id": "1",
  "chave_nfe": "35241214200166000187550010000001231234567890",
  "emails": ["cliente@exemplo.com", "contato@empresa.com"],
  "nfe_data": {
    "numero": "123",
    "serie": "1",
    "valor_total": 1234.56,
    "cliente_nome": "João Silva",
    "empresa_nome": "Minha Empresa Ltda"
  }
}
```

**Response (Sucesso):**
```json
{
  "success": true,
  "message": "Email enviado com sucesso para 2 destinatário(s)",
  "estatisticas": {
    "total_emails": 2,
    "sucessos": 2,
    "falhas": 0
  },
  "detalhes": [
    {
      "success": true,
      "message": "NFe enviada por email com sucesso!",
      "destinatario": "cliente@exemplo.com",
      "anexos": ["NFe-123-1.xml", "DANFE-123-1.pdf"]
    }
  ],
  "arquivos": {
    "xml_path": "/root/nexo/nexo-pedidos/storage/xml/empresa_1/homologacao/55/2024/12/Autorizados/35241214200166000187550010000001231234567890-nfe.xml",
    "pdf_path": "/root/nexo/nexo-pedidos/storage/pdf/empresa_1/homologacao/55/2024/12/Autorizados/35241214200166000187550010000001231234567890-danfe.pdf",
    "xml_existe": true,
    "pdf_existe": true
  },
  "nfe_info": {
    "chave": "35241214200166000187550010000001231234567890",
    "ambiente": "homologacao",
    "modelo": "55",
    "ano": "2024",
    "mes": "12"
  },
  "timestamp": "2024-12-15 14:30:25"
}
```

**Response (Erro):**
```json
{
  "success": false,
  "error": "Arquivo XML não encontrado: /path/to/xml",
  "timestamp": "2024-12-15 14:30:25"
}
```

**Códigos de Status:**
- `200` - Sucesso
- `400` - Dados inválidos
- `500` - Erro interno

---

## 🔧 Classes PHP

### EmailService

#### Localização: `backend/src/Services/EmailService.php`

#### Métodos Principais:

##### `enviarNFe($destinatario, $nfeData, $xmlPath = null, $pdfPath = null)`

Envia NFe por email com localização automática de arquivos.

**Parâmetros:**
- `$destinatario` (string) - Email do destinatário
- `$nfeData` (array) - Dados da NFe
- `$xmlPath` (string, opcional) - Caminho do XML
- `$pdfPath` (string, opcional) - Caminho do PDF

**Retorno:**
```php
[
    'success' => true|false,
    'message' => 'Mensagem de resultado',
    'destinatario' => 'email@exemplo.com',
    'anexos' => ['arquivo1.xml', 'arquivo2.pdf'],
    'arquivos_localizados' => [
        'xml' => '/path/to/xml',
        'pdf' => '/path/to/pdf'
    ]
]
```

**Exemplo de uso:**
```php
$emailService = new \NexoNFe\Services\EmailService();

$nfeData = [
    'chave' => '35241214200166000187550010000001231234567890',
    'empresa_id' => '1',
    'numero' => '123',
    'serie' => '1',
    'valor_total' => 1234.56,
    'cliente_nome' => 'João Silva',
    'empresa_nome' => 'Minha Empresa'
];

$resultado = $emailService->enviarNFe('cliente@exemplo.com', $nfeData);

if ($resultado['success']) {
    echo "Email enviado com sucesso!";
} else {
    echo "Erro: " . $resultado['error'];
}
```

##### `enviarEmailTeste($destinatario, $assunto = 'Teste do Sistema Nexo NFe')`

Envia email de teste para verificar configuração.

**Parâmetros:**
- `$destinatario` (string) - Email do destinatário
- `$assunto` (string, opcional) - Assunto do email

**Retorno:**
```php
[
    'success' => true|false,
    'message' => 'Mensagem de resultado',
    'destinatario' => 'email@exemplo.com'
]
```

##### `verificarConfiguracao()`

Verifica se as configurações de email estão corretas.

**Retorno:**
```php
[
    'configurado' => true|false,
    'problemas' => ['lista', 'de', 'problemas'],
    'config' => [
        'host' => 'smtp.gmail.com',
        'port' => 587,
        'encryption' => 'tls',
        'from_name' => 'Sistema Nexo NFe'
    ]
]
```

#### Métodos Privados:

##### `localizarArquivosNFe($nfeData)`

Localiza automaticamente arquivos XML e PDF baseado na chave NFe.

**Lógica de localização:**
```php
// Extrair informações da chave NFe (44 caracteres)
$ambiente = substr($chave, 20, 1) === '1' ? 'producao' : 'homologacao';
$modelo = substr($chave, 21, 2) === '65' ? '65' : '55';
$ano = '20' . substr($chave, 2, 2);
$mes = substr($chave, 4, 2);

// Construir caminhos
$xml_path = "{$base_path}/xml/empresa_{$empresaId}/{$ambiente}/{$modelo}/{$ano}/{$mes}/Autorizados/{$chave}-nfe.xml";
$pdf_path = "{$base_path}/pdf/empresa_{$empresaId}/{$ambiente}/{$modelo}/{$ano}/{$mes}/Autorizados/{$chave}-danfe.pdf";
```

##### `carregarTemplateHtml($nfeData)` / `carregarTemplateTexto($nfeData)`

Carrega e processa templates de email.

**Templates suportados:**
- `backend/templates/email-nfe.html` - Template HTML
- `backend/templates/email-nfe.txt` - Template texto

##### `substituirVariaveisTemplate($template, $nfeData)`

Substitui variáveis no template.

**Variáveis disponíveis:**
```php
$variaveis = [
    '{{cliente_nome}}' => $nfeData['cliente_nome'],
    '{{numero_nfe}}' => $nfeData['numero'],
    '{{serie_nfe}}' => $nfeData['serie'],
    '{{data_emissao}}' => date('d/m/Y'),
    '{{valor_total}}' => number_format($nfeData['valor_total'], 2, ',', '.'),
    '{{chave_nfe}}' => $nfeData['chave'],
    '{{empresa_nome}}' => $nfeData['empresa_nome'],
    '{{empresa_endereco}}' => $nfeData['empresa_endereco'],
    '{{empresa_cnpj}}' => $nfeData['empresa_cnpj'],
    '{{empresa_telefone}}' => $nfeData['empresa_telefone'],
    '{{empresa_email}}' => $nfeData['empresa_email'],
    '{{empresa_website}}' => $nfeData['empresa_website']
];
```

---

## 🎨 Templates

### Estrutura dos Templates

#### Template HTML (`email-nfe.html`)

**Seções principais:**
1. **Header** - Título e subtítulo
2. **Saudação** - Cumprimento personalizado
3. **Informações da NFe** - Grid com dados
4. **Anexos** - Lista de arquivos
5. **Aviso importante** - Orientações
6. **Footer** - Dados da empresa

#### Template Texto (`email-nfe.txt`)

**Formato ASCII** com seções delimitadas por linhas.

### Personalização de Templates

#### Modificar cores:
```css
/* No template HTML */
.header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

#### Adicionar nova variável:
```php
// Em EmailService.php, método substituirVariaveisTemplate()
$variaveis['{{nova_variavel}}'] = $nfeData['novo_campo'];
```

#### Modificar layout:
```html
<!-- Adicionar nova seção no template HTML -->
<div class="nova-secao">
    <h4>Nova Seção</h4>
    <p>{{nova_variavel}}</p>
</div>
```

---

## 🔗 Integração Frontend

### React/TypeScript

#### Envio automático na emissão:
```typescript
// Em NfePage.tsx
const emailsDestinatario = nfeData.destinatario.emails || [];
if (emailsDestinatario.length > 0) {
    const emailResponse = await fetch('/backend/public/enviar-nfe-email.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            empresa_id: usuarioData.empresa_id,
            chave_nfe: result.data.chave,
            emails: emailsDestinatario,
            nfe_data: {
                numero: result.data.numero_nfe,
                serie: nfeData.identificacao.serie,
                valor_total: nfeData.totais.valor_total,
                cliente_nome: nfeData.destinatario.nome
            }
        })
    });
}
```

#### Reenvio manual:
```typescript
const handleReenviarEmail = async (nfe: NFe) => {
    // Buscar emails do cliente
    const { data: clienteData } = await supabase
        .from('clientes')
        .select('emails')
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('documento', documentoCliente)
        .single();

    // Enviar email
    const response = await fetch('/backend/public/enviar-nfe-email.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            empresa_id: usuarioData.empresa_id,
            chave_nfe: nfe.chave_nfe,
            emails: clienteData.emails,
            nfe_data: { /* dados da NFe */ }
        })
    });
};
```

---

## 🔍 Logs e Debug

### Habilitar debug SMTP:
```php
$emailService = new \NexoNFe\Services\EmailService();
$emailService->enableDebug();
```

### Logs importantes:
- `/var/log/php_errors.log` - Erros PHP
- `/var/log/nginx/error.log` - Erros Nginx
- Console do navegador - Erros frontend

### Exemplo de log de sucesso:
```
[2024-12-15 14:30:25] Email enviado com sucesso para cliente@exemplo.com
[2024-12-15 14:30:25] Anexos: NFe-123-1.xml, DANFE-123-1.pdf
[2024-12-15 14:30:25] Template: email-nfe.html carregado
```

### Exemplo de log de erro:
```
[2024-12-15 14:30:25] Erro ao enviar email: SMTP connect() failed
[2024-12-15 14:30:25] Arquivo XML não encontrado: /path/to/xml
[2024-12-15 14:30:25] Template não encontrado: /path/to/template
```

---

## 📊 Monitoramento

### Métricas importantes:
- Taxa de entrega de emails
- Tempo de resposta da API
- Erros de localização de arquivos
- Falhas de template

### Script de monitoramento:
```bash
#!/bin/bash
# Verificar status da API
curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://localhost/backend/public/enviar-nfe-email.php \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

**Última atualização:** Dezembro 2024  
**Versão:** 1.0.0
