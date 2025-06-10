# 📧 Sistema de Email para NFe - Documentação Completa

## 🎯 Visão Geral

Este documento descreve a implementação completa do sistema de envio automático de NFe por email no Sistema Nexo. A implementação inclui templates profissionais, localização automática de arquivos, envio durante a emissão e funcionalidade de reenvio.

## 📋 Índice

1. [Arquitetura do Sistema](#arquitetura)
2. [Arquivos Implementados](#arquivos)
3. [Configuração](#configuracao)
4. [Funcionalidades](#funcionalidades)
5. [Templates de Email](#templates)
6. [Troubleshooting](#troubleshooting)
7. [Manutenção](#manutencao)

## 🏗️ Arquitetura do Sistema {#arquitetura}

### Componentes Principais

```
Sistema de Email NFe
├── EmailService.php          # Serviço principal de email
├── enviar-nfe-email.php     # API para envio de NFe
├── Templates/               # Templates HTML e texto
├── Frontend Integration     # Integração com React
└── Storage Integration      # Localização automática de arquivos
```

### Fluxo de Funcionamento

1. **Emissão da NFe** → Sistema verifica emails do destinatário
2. **Localização de Arquivos** → XML e PDF encontrados automaticamente
3. **Carregamento de Templates** → HTML e texto personalizados
4. **Envio de Email** → SMTP com anexos
5. **Log de Resultados** → Feedback detalhado

## 📁 Arquivos Implementados {#arquivos}

### Backend - Serviços

#### `backend/src/Services/EmailService.php`
- **Função:** Classe principal para gerenciamento de emails
- **Recursos:**
  - Configuração SMTP automática
  - Localização automática de arquivos NFe
  - Carregamento de templates
  - Substituição de variáveis
  - Envio com anexos

#### `backend/public/enviar-nfe-email.php`
- **Função:** API REST para envio de NFe por email
- **Endpoints:** POST /backend/public/enviar-nfe-email.php
- **Recursos:**
  - Validação de dados
  - Busca de informações da empresa
  - Integração com EmailService
  - Relatório de envio

### Templates

#### `backend/templates/email-nfe.html`
- **Função:** Template HTML profissional
- **Características:**
  - Design responsivo
  - Gradientes e ícones
  - Seções organizadas
  - Variáveis dinâmicas

#### `backend/templates/email-nfe.txt`
- **Função:** Template texto simples
- **Características:**
  - Compatibilidade total
  - Formatação ASCII
  - Informações essenciais

### Frontend - Integração

#### `src/pages/dashboard/NfePage.tsx`
- **Modificações:**
  - Envio automático na emissão (linhas 3070-3120)
  - Função de reenvio melhorada (linhas 281-350)
  - Exibição de emails no modal de progresso
  - Tratamento de erros

## ⚙️ Configuração {#configuracao}

### Variáveis de Ambiente (.env)

```env
# Configurações de Email SMTP
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=seu-email@gmail.com
MAIL_PASSWORD=sua_senha_de_app_16_caracteres
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=seu-email@gmail.com
MAIL_FROM_NAME="Sistema Nexo NFe"
```

### Dependências PHP

```bash
# PHPMailer (já instalado via Composer)
composer require phpmailer/phpmailer
```

### Configuração do Gmail

1. **Ativar 2FA** na conta Google
2. **Gerar senha de app** (16 caracteres)
3. **Configurar .env** com as credenciais
4. **Testar conexão** via `/dashboard/teste-email`

## 🚀 Funcionalidades {#funcionalidades}

### 1. Envio Automático na Emissão

**Localização:** `NfePage.tsx` linhas 3070-3120

```typescript
// ETAPA 5: ENVIO POR EMAIL
updateStep('email', 'loading');
addLog('📧 Iniciando envio por email...');

const emailsDestinatario = nfeData.destinatario.emails || [];
if (emailsDestinatario.length > 0) {
  // Enviar email com XML e PDF
  const emailResponse = await fetch('/backend/public/enviar-nfe-email.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      empresa_id: usuarioData.empresa_id,
      chave_nfe: result.data.chave,
      emails: emailsDestinatario,
      nfe_data: { /* dados da NFe */ }
    })
  });
}
```

### 2. Reenvio Manual

**Localização:** `NfePage.tsx` linhas 281-350

```typescript
const handleReenviarEmail = async (nfe: NFe) => {
  // Buscar emails do cliente
  const { data: clienteData } = await supabase
    .from('clientes')
    .select('emails')
    .eq('empresa_id', usuarioData.empresa_id)
    .eq('documento', documentoCliente)
    .single();

  // Enviar para todos os emails
  const response = await fetch('/backend/public/enviar-nfe-email.php', {
    method: 'POST',
    body: JSON.stringify({ /* dados */ })
  });
};
```

### 3. Localização Automática de Arquivos

**Localização:** `EmailService.php` método `localizarArquivosNFe()`

```php
private function localizarArquivosNFe($nfeData)
{
    $chave = $nfeData['chave'] ?? '';
    
    // Determinar ambiente e modelo pela chave NFe
    $ambiente = substr($chave, 20, 1) === '1' ? 'producao' : 'homologacao';
    $modelo = substr($chave, 21, 2) === '65' ? '65' : '55';
    
    // Extrair ano e mês
    $ano = '20' . substr($chave, 2, 2);
    $mes = substr($chave, 4, 2);
    
    // Construir caminhos
    $xml_path = "{$base_path}/xml/empresa_{$empresaId}/{$ambiente}/{$modelo}/{$ano}/{$mes}/Autorizados/{$chave}-nfe.xml";
    $pdf_path = "{$base_path}/pdf/empresa_{$empresaId}/{$ambiente}/{$modelo}/{$ano}/{$mes}/Autorizados/{$chave}-danfe.pdf";
    
    return ['xml' => $xml_path, 'pdf' => $pdf_path];
}
```

## 📧 Templates de Email {#templates}

### Variáveis Disponíveis

```php
$variaveis = [
    '{{cliente_nome}}' => 'Nome do cliente',
    '{{numero_nfe}}' => 'Número da NFe',
    '{{serie_nfe}}' => 'Série da NFe',
    '{{data_emissao}}' => 'Data de emissão',
    '{{valor_total}}' => 'Valor formatado',
    '{{chave_nfe}}' => 'Chave de acesso',
    '{{empresa_nome}}' => 'Nome da empresa',
    '{{empresa_endereco}}' => 'Endereço da empresa',
    '{{empresa_cnpj}}' => 'CNPJ da empresa',
    '{{empresa_telefone}}' => 'Telefone da empresa',
    '{{empresa_email}}' => 'Email da empresa',
    '{{empresa_website}}' => 'Website da empresa'
];
```

### Estrutura do Template HTML

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>NFe - {{numero_nfe}}</title>
    <style>/* CSS responsivo */</style>
</head>
<body>
    <div class="container">
        <!-- Header com gradiente -->
        <div class="header">
            <h1>📄 Nota Fiscal Eletrônica</h1>
        </div>
        
        <!-- Conteúdo principal -->
        <div class="content">
            <div class="greeting">Olá, <strong>{{cliente_nome}}</strong>!</div>
            
            <!-- Informações da NFe -->
            <div class="nfe-info">
                <h3>📋 Informações da NFe</h3>
                <!-- Grid com dados -->
            </div>
            
            <!-- Anexos -->
            <div class="attachments">
                <h4>📎 Arquivos em Anexo</h4>
                <!-- Lista de anexos -->
            </div>
            
            <!-- Aviso importante -->
            <div class="important-note">
                <h4>⚠️ Importante</h4>
                <!-- Orientações -->
            </div>
        </div>
        
        <!-- Footer com dados da empresa -->
        <div class="footer">
            <h4>{{empresa_nome}}</h4>
            <!-- Dados de contato -->
        </div>
    </div>
</body>
</html>
```

## 🔧 Troubleshooting {#troubleshooting}

### Problemas Comuns

#### 1. Email não enviado

**Sintomas:**
- Erro "SMTP connect() failed"
- Timeout na conexão

**Soluções:**
```bash
# Verificar configurações
php -r "print_r(getenv());" | grep MAIL

# Testar conexão SMTP
telnet smtp.gmail.com 587

# Verificar logs
tail -f /var/log/php_errors.log
```

#### 2. Arquivos não encontrados

**Sintomas:**
- "Arquivo XML não encontrado"
- "Arquivo PDF não encontrado"

**Soluções:**
```bash
# Verificar estrutura de storage
ls -la /root/nexo/nexo-pedidos/storage/xml/empresa_*/

# Verificar permissões
chmod -R 755 /root/nexo/nexo-pedidos/storage/

# Verificar chave NFe
echo "Chave: 35241214200166000187550010000001231234567890"
echo "Ambiente: $(echo '35241214200166000187550010000001231234567890' | cut -c21)"
echo "Modelo: $(echo '35241214200166000187550010000001231234567890' | cut -c21-22)"
```

#### 3. Template não carregado

**Sintomas:**
- Email com template básico
- Variáveis não substituídas

**Soluções:**
```bash
# Verificar templates
ls -la /root/nexo/nexo-pedidos/backend/templates/

# Verificar permissões
chmod 644 /root/nexo/nexo-pedidos/backend/templates/*.html
chmod 644 /root/nexo/nexo-pedidos/backend/templates/*.txt

# Testar carregamento
php -r "echo file_get_contents('/root/nexo/nexo-pedidos/backend/templates/email-nfe.html');"
```

### Logs de Debug

#### Habilitar debug SMTP

```php
// Em EmailService.php
public function enableDebug()
{
    $this->mailer->SMTPDebug = SMTP::DEBUG_SERVER;
    $this->mailer->Debugoutput = 'error_log';
}
```

#### Verificar logs do sistema

```bash
# Logs do PHP
tail -f /var/log/php_errors.log

# Logs do Nginx
tail -f /var/log/nginx/error.log

# Logs personalizados
tail -f /root/nexo/nexo-pedidos/backend/logs/email.log
```

## 🔄 Manutenção {#manutencao}

### Atualizações de Template

1. **Editar arquivo:** `/root/nexo/nexo-pedidos/backend/templates/email-nfe.html`
2. **Testar mudanças:** Usar página de teste de email
3. **Validar responsividade:** Testar em diferentes dispositivos
4. **Backup:** Manter versão anterior

### Monitoramento

#### Métricas importantes:
- Taxa de entrega de emails
- Tempo de resposta SMTP
- Erros de localização de arquivos
- Falhas de template

#### Scripts de monitoramento:

```bash
# Verificar status do serviço
curl -X POST http://localhost/backend/public/enviar-nfe-email.php \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Verificar storage
find /root/nexo/nexo-pedidos/storage -name "*.xml" -mtime -1 | wc -l
find /root/nexo/nexo-pedidos/storage -name "*.pdf" -mtime -1 | wc -l
```

### Backup e Recuperação

#### Arquivos críticos para backup:
- `/root/nexo/nexo-pedidos/backend/src/Services/EmailService.php`
- `/root/nexo/nexo-pedidos/backend/public/enviar-nfe-email.php`
- `/root/nexo/nexo-pedidos/backend/templates/`
- Configurações `.env`

#### Script de backup:

```bash
#!/bin/bash
BACKUP_DIR="/backup/email-system-$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

cp -r /root/nexo/nexo-pedidos/backend/src/Services/EmailService.php $BACKUP_DIR/
cp -r /root/nexo/nexo-pedidos/backend/public/enviar-nfe-email.php $BACKUP_DIR/
cp -r /root/nexo/nexo-pedidos/backend/templates/ $BACKUP_DIR/
cp /root/nexo/nexo-pedidos/.env $BACKUP_DIR/env.backup

echo "Backup criado em: $BACKUP_DIR"
```

---

## 📞 Suporte

Para problemas não cobertos nesta documentação:

1. **Verificar logs** conforme seção Troubleshooting
2. **Consultar documentação** das dependências (PHPMailer)
3. **Testar componentes** individualmente
4. **Criar issue** com logs detalhados

**Última atualização:** Dezembro 2024  
**Versão:** 1.0.0  
**Autor:** Sistema Nexo NFe
