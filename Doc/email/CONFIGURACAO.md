# ⚙️ Configuração do Sistema de Email NFe

## 🎯 Objetivo

Este documento fornece instruções passo a passo para configurar o sistema de email para NFe no Sistema Nexo.

## 📋 Pré-requisitos

- ✅ Sistema Nexo NFe funcionando
- ✅ Conta Gmail com 2FA ativado
- ✅ Acesso ao servidor (SSH)
- ✅ Permissões de administrador

## 🔧 Configuração Passo a Passo

### 1. Configuração do Gmail

#### 1.1 Ativar Autenticação de Dois Fatores

1. Acesse [myaccount.google.com](https://myaccount.google.com)
2. Vá em **Segurança** → **Verificação em duas etapas**
3. Siga as instruções para ativar 2FA

#### 1.2 Gerar Senha de App

1. Em **Segurança** → **Senhas de app**
2. Selecione **App: Email** e **Dispositivo: Outro**
3. Digite "Sistema Nexo NFe"
4. **Copie a senha de 16 caracteres** gerada

### 2. Configuração do Arquivo .env

#### 2.1 Localizar arquivo .env

```bash
cd /root/nexo/nexo-pedidos
ls -la .env
```

#### 2.2 Adicionar configurações de email

```bash
# Editar arquivo .env
nano .env
```

#### 2.3 Adicionar as seguintes linhas:

```env
# ===== CONFIGURAÇÕES DE EMAIL =====
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=seu-email@gmail.com
MAIL_PASSWORD=sua_senha_de_app_16_caracteres
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=seu-email@gmail.com
MAIL_FROM_NAME="Sistema Nexo NFe"
```

**⚠️ IMPORTANTE:** Substitua `seu-email@gmail.com` e `sua_senha_de_app_16_caracteres` pelos valores reais.

### 3. Verificação da Instalação

#### 3.1 Verificar dependências PHP

```bash
cd /root/nexo/nexo-pedidos/backend
composer show | grep phpmailer
```

**Resultado esperado:**
```
phpmailer/phpmailer    v6.x.x    PHPMailer is a full-featured email creation and transfer class for PHP
```

#### 3.2 Verificar arquivos implementados

```bash
# Verificar EmailService
ls -la /root/nexo/nexo-pedidos/backend/src/Services/EmailService.php

# Verificar API de envio
ls -la /root/nexo/nexo-pedidos/backend/public/enviar-nfe-email.php

# Verificar templates
ls -la /root/nexo/nexo-pedidos/backend/templates/email-nfe.*
```

#### 3.3 Verificar permissões

```bash
# Ajustar permissões se necessário
chmod 644 /root/nexo/nexo-pedidos/backend/templates/*.html
chmod 644 /root/nexo/nexo-pedidos/backend/templates/*.txt
chmod 755 /root/nexo/nexo-pedidos/backend/src/Services/
chmod 644 /root/nexo/nexo-pedidos/backend/src/Services/EmailService.php
```

### 4. Teste de Configuração

#### 4.1 Teste via interface web

1. Acesse o sistema: `http://seu-dominio/dashboard/teste-email`
2. Digite um email de teste
3. Clique em "Enviar Teste"
4. Verifique se o email foi recebido

#### 4.2 Teste via linha de comando

```bash
cd /root/nexo/nexo-pedidos/backend

# Criar script de teste
cat > teste-email.php << 'EOF'
<?php
require_once 'vendor/autoload.php';
require_once 'src/Services/EmailService.php';

try {
    $emailService = new \NexoNFe\Services\EmailService();
    
    $resultado = $emailService->enviarEmailTeste('seu-email@teste.com');
    
    if ($resultado['success']) {
        echo "✅ Email enviado com sucesso!\n";
    } else {
        echo "❌ Erro: " . $resultado['error'] . "\n";
    }
} catch (Exception $e) {
    echo "❌ Exceção: " . $e->getMessage() . "\n";
}
EOF

# Executar teste
php teste-email.php
```

### 5. Configuração Avançada

#### 5.1 Configurar logs de email

```bash
# Criar diretório de logs
mkdir -p /root/nexo/nexo-pedidos/backend/logs

# Configurar rotação de logs
cat > /etc/logrotate.d/nexo-email << 'EOF'
/root/nexo/nexo-pedidos/backend/logs/email.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 www-data www-data
}
EOF
```

#### 5.2 Configurar monitoramento

```bash
# Criar script de monitoramento
cat > /root/nexo/nexo-pedidos/backend/monitor-email.sh << 'EOF'
#!/bin/bash

LOG_FILE="/root/nexo/nexo-pedidos/backend/logs/email-monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Verificar se o serviço está respondendo
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://localhost/backend/public/enviar-nfe-email.php \
  -H "Content-Type: application/json" \
  -d '{"test": true}')

if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "500" ]; then
    echo "[$DATE] ✅ Serviço de email respondendo (HTTP $RESPONSE)" >> $LOG_FILE
else
    echo "[$DATE] ❌ Serviço de email não respondendo (HTTP $RESPONSE)" >> $LOG_FILE
fi

# Verificar espaço em disco
DISK_USAGE=$(df /root/nexo/nexo-pedidos/storage | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "[$DATE] ⚠️ Espaço em disco baixo: ${DISK_USAGE}%" >> $LOG_FILE
fi
EOF

chmod +x /root/nexo/nexo-pedidos/backend/monitor-email.sh
```

#### 5.3 Configurar cron para monitoramento

```bash
# Adicionar ao crontab
(crontab -l 2>/dev/null; echo "*/15 * * * * /root/nexo/nexo-pedidos/backend/monitor-email.sh") | crontab -
```

### 6. Configurações de Segurança

#### 6.1 Proteger arquivo .env

```bash
# Ajustar permissões do .env
chmod 600 /root/nexo/nexo-pedidos/.env
chown root:root /root/nexo/nexo-pedidos/.env
```

#### 6.2 Configurar firewall (se necessário)

```bash
# Permitir SMTP saída (porta 587)
ufw allow out 587/tcp
```

### 7. Troubleshooting da Configuração

#### 7.1 Erro: "SMTP connect() failed"

**Possíveis causas:**
- Senha de app incorreta
- 2FA não ativado
- Firewall bloqueando porta 587

**Soluções:**
```bash
# Testar conexão SMTP
telnet smtp.gmail.com 587

# Verificar logs
tail -f /var/log/php_errors.log

# Verificar configurações
php -r "print_r(getenv());" | grep MAIL
```

#### 7.2 Erro: "Template não encontrado"

**Soluções:**
```bash
# Verificar templates
ls -la /root/nexo/nexo-pedidos/backend/templates/

# Recriar templates se necessário
cp /root/nexo/nexo-pedidos/Doc/email/templates/* /root/nexo/nexo-pedidos/backend/templates/
```

#### 7.3 Erro: "Arquivo XML/PDF não encontrado"

**Soluções:**
```bash
# Verificar estrutura de storage
ls -la /root/nexo/nexo-pedidos/storage/xml/empresa_*/

# Verificar permissões
chmod -R 755 /root/nexo/nexo-pedidos/storage/
```

### 8. Validação Final

#### 8.1 Checklist de configuração

- [ ] Gmail configurado com 2FA
- [ ] Senha de app gerada
- [ ] Arquivo .env configurado
- [ ] Dependências PHP instaladas
- [ ] Arquivos de template presentes
- [ ] Permissões corretas
- [ ] Teste de envio funcionando
- [ ] Logs configurados
- [ ] Monitoramento ativo

#### 8.2 Teste completo do sistema

1. **Emitir uma NFe** com email do destinatário
2. **Verificar envio automático** no modal de progresso
3. **Testar reenvio** pelo menu de ações
4. **Verificar recebimento** dos emails com anexos
5. **Validar templates** (HTML e texto)

### 9. Configurações Opcionais

#### 9.1 Personalizar templates

```bash
# Backup dos templates originais
cp /root/nexo/nexo-pedidos/backend/templates/email-nfe.html /root/nexo/nexo-pedidos/backend/templates/email-nfe.html.backup

# Editar template
nano /root/nexo/nexo-pedidos/backend/templates/email-nfe.html
```

#### 9.2 Configurar múltiplas contas de email

```env
# No .env, adicionar configurações alternativas
MAIL_HOST_BACKUP=smtp.outlook.com
MAIL_PORT_BACKUP=587
MAIL_USERNAME_BACKUP=backup@empresa.com
MAIL_PASSWORD_BACKUP=senha_backup
```

#### 9.3 Configurar rate limiting

```php
// Em EmailService.php, adicionar delay entre envios
sleep(1); // 1 segundo entre emails
```

---

## ✅ Conclusão

Após seguir todos os passos desta configuração, o sistema de email estará totalmente funcional e integrado ao Sistema Nexo NFe.

**Próximos passos:**
1. Monitorar logs regularmente
2. Fazer backup das configurações
3. Testar periodicamente o envio
4. Manter templates atualizados

**Suporte:** Consulte o arquivo `README.md` para troubleshooting avançado.
