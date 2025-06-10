# 🔧 Troubleshooting - Sistema de Email NFe

## 🎯 Objetivo

Este documento fornece soluções para problemas comuns do sistema de email NFe, com comandos específicos e logs para diagnóstico.

## 📋 Problemas Mais Comuns

### 1. 🚫 Email não está sendo enviado

#### Sintomas:
- Modal de progresso mostra erro na etapa de email
- Log mostra "Erro ao enviar email"
- Nenhum email é recebido

#### Diagnóstico:

```bash
# 1. Verificar configurações do .env
cd /root/nexo/nexo-pedidos
grep MAIL .env

# 2. Testar conexão SMTP
telnet smtp.gmail.com 587

# 3. Verificar logs do PHP
tail -f /var/log/php_errors.log

# 4. Testar EmailService diretamente
cd /root/nexo/nexo-pedidos/backend
php -r "
require_once 'vendor/autoload.php';
require_once 'src/Services/EmailService.php';
try {
    \$service = new \NexoNFe\Services\EmailService();
    \$config = \$service->verificarConfiguracao();
    print_r(\$config);
} catch (Exception \$e) {
    echo 'Erro: ' . \$e->getMessage();
}
"
```

#### Soluções:

**A. Problema de autenticação Gmail:**
```bash
# Verificar se 2FA está ativado
# Gerar nova senha de app
# Atualizar .env com nova senha

# Testar nova configuração
php -r "
require_once 'vendor/autoload.php';
require_once 'src/Services/EmailService.php';
\$service = new \NexoNFe\Services\EmailService();
\$result = \$service->enviarEmailTeste('seu-email@teste.com');
print_r(\$result);
"
```

**B. Problema de firewall:**
```bash
# Verificar se porta 587 está aberta
sudo ufw status
sudo ufw allow out 587/tcp

# Testar conectividade
nc -zv smtp.gmail.com 587
```

**C. Problema de configuração PHP:**
```bash
# Verificar extensões PHP necessárias
php -m | grep -E "(openssl|curl|mbstring)"

# Instalar se necessário
sudo apt-get install php-curl php-mbstring php-openssl
```

### 2. 📁 Arquivos XML/PDF não encontrados

#### Sintomas:
- Erro "Arquivo XML não encontrado"
- Erro "Arquivo PDF não encontrado"
- Email enviado sem anexos

#### Diagnóstico:

```bash
# 1. Verificar estrutura de storage
ls -la /root/nexo/nexo-pedidos/storage/

# 2. Verificar estrutura específica por empresa
ls -la /root/nexo/nexo-pedidos/storage/xml/empresa_*/

# 3. Verificar arquivos recentes
find /root/nexo/nexo-pedidos/storage -name "*.xml" -mtime -1
find /root/nexo/nexo-pedidos/storage -name "*.pdf" -mtime -1

# 4. Testar localização de arquivos
cd /root/nexo/nexo-pedidos/backend
php -r "
require_once 'vendor/autoload.php';
require_once 'src/Services/EmailService.php';

\$service = new \NexoNFe\Services\EmailService();
\$reflection = new ReflectionClass(\$service);
\$method = \$reflection->getMethod('localizarArquivosNFe');
\$method->setAccessible(true);

\$nfeData = [
    'chave' => '35241214200166000187550010000001231234567890',
    'empresa_id' => '1'
];

\$arquivos = \$method->invoke(\$service, \$nfeData);
print_r(\$arquivos);

echo 'XML existe: ' . (file_exists(\$arquivos['xml']) ? 'SIM' : 'NÃO') . \"\n\";
echo 'PDF existe: ' . (file_exists(\$arquivos['pdf']) ? 'SIM' : 'NÃO') . \"\n\";
"
```

#### Soluções:

**A. Estrutura de storage incorreta:**
```bash
# Verificar se a estrutura segue o padrão correto
# storage/xml/empresa_ID/ambiente/modelo/ano/mes/status/

# Exemplo de estrutura correta:
mkdir -p /root/nexo/nexo-pedidos/storage/xml/empresa_1/homologacao/55/2024/12/Autorizados/
mkdir -p /root/nexo/nexo-pedidos/storage/pdf/empresa_1/homologacao/55/2024/12/Autorizados/

# Ajustar permissões
chmod -R 755 /root/nexo/nexo-pedidos/storage/
```

**B. Chave NFe incorreta:**
```bash
# Verificar formato da chave (44 dígitos)
echo "Chave exemplo: 35241214200166000187550010000001231234567890"
echo "Tamanho: $(echo '35241214200166000187550010000001231234567890' | wc -c)"

# Extrair informações da chave
CHAVE="35241214200166000187550010000001231234567890"
echo "UF: $(echo $CHAVE | cut -c1-2)"
echo "Ano/Mês: $(echo $CHAVE | cut -c3-6)"
echo "CNPJ: $(echo $CHAVE | cut -c7-20)"
echo "Ambiente: $(echo $CHAVE | cut -c21)"
echo "Modelo: $(echo $CHAVE | cut -c21-22)"
```

**C. Arquivos não foram gerados:**
```bash
# Verificar se a emissão da NFe gerou os arquivos
# Verificar logs da emissão
tail -f /var/log/nginx/access.log | grep "emitir-nfe"

# Testar geração manual de PDF
curl -X POST http://localhost/backend/public/gerar-danfe.php \
  -H "Content-Type: application/json" \
  -d '{"chave":"35241214200166000187550010000001231234567890","empresa_id":"1"}'
```

### 3. 🎨 Templates não carregados

#### Sintomas:
- Email com layout básico
- Variáveis não substituídas ({{cliente_nome}} aparece literal)
- Formatação incorreta

#### Diagnóstico:

```bash
# 1. Verificar se templates existem
ls -la /root/nexo/nexo-pedidos/backend/templates/

# 2. Verificar conteúdo dos templates
head -20 /root/nexo/nexo-pedidos/backend/templates/email-nfe.html

# 3. Verificar permissões
ls -la /root/nexo/nexo-pedidos/backend/templates/

# 4. Testar carregamento de template
cd /root/nexo/nexo-pedidos/backend
php -r "
\$templatePath = __DIR__ . '/templates/email-nfe.html';
echo 'Template existe: ' . (file_exists(\$templatePath) ? 'SIM' : 'NÃO') . \"\n\";
if (file_exists(\$templatePath)) {
    \$content = file_get_contents(\$templatePath);
    echo 'Tamanho: ' . strlen(\$content) . \" bytes\n\";
    echo 'Primeiros 100 chars: ' . substr(\$content, 0, 100) . \"\n\";
}
"
```

#### Soluções:

**A. Templates não existem:**
```bash
# Recriar templates
mkdir -p /root/nexo/nexo-pedidos/backend/templates/

# Copiar templates da documentação
cp /root/nexo/nexo-pedidos/Doc/email/templates/* /root/nexo/nexo-pedidos/backend/templates/

# Ajustar permissões
chmod 644 /root/nexo/nexo-pedidos/backend/templates/*
```

**B. Problema de encoding:**
```bash
# Verificar encoding dos templates
file /root/nexo/nexo-pedidos/backend/templates/email-nfe.html

# Converter para UTF-8 se necessário
iconv -f ISO-8859-1 -t UTF-8 /root/nexo/nexo-pedidos/backend/templates/email-nfe.html > temp.html
mv temp.html /root/nexo/nexo-pedidos/backend/templates/email-nfe.html
```

### 4. 🔄 Reenvio de email não funciona

#### Sintomas:
- Botão "Reenviar Email" não aparece
- Erro ao clicar em reenviar
- Emails do cliente não encontrados

#### Diagnóstico:

```bash
# 1. Verificar se cliente tem emails cadastrados
cd /root/nexo/nexo-pedidos
# Conectar ao Supabase e verificar tabela clientes

# 2. Verificar logs do frontend
# Abrir DevTools do navegador → Console

# 3. Testar API de reenvio diretamente
curl -X POST http://localhost/backend/public/enviar-nfe-email.php \
  -H "Content-Type: application/json" \
  -d '{
    "empresa_id": "1",
    "chave_nfe": "35241214200166000187550010000001231234567890",
    "emails": ["teste@exemplo.com"],
    "nfe_data": {
      "numero": "123",
      "serie": "1",
      "valor_total": 100.00,
      "cliente_nome": "Teste"
    }
  }'
```

#### Soluções:

**A. Cliente sem emails:**
```sql
-- Verificar emails do cliente
SELECT documento, emails FROM clientes WHERE empresa_id = 1;

-- Adicionar email se necessário
UPDATE clientes SET emails = '["cliente@exemplo.com"]' 
WHERE documento = '12345678901' AND empresa_id = 1;
```

**B. Problema na interface:**
```bash
# Verificar se o componente está atualizado
grep -n "handleReenviarEmail" /root/nexo/nexo-pedidos/src/pages/dashboard/NfePage.tsx

# Verificar se o menu de ações inclui a opção
grep -A 10 -B 10 "Reenviar Email" /root/nexo/nexo-pedidos/src/pages/dashboard/NfePage.tsx
```

### 5. 📊 Performance e Logs

#### Problemas de performance:

```bash
# 1. Verificar uso de memória
ps aux | grep php | grep -v grep

# 2. Verificar logs de erro
tail -f /var/log/php_errors.log | grep -i email

# 3. Verificar tempo de resposta
time curl -X POST http://localhost/backend/public/enviar-nfe-email.php \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# 4. Monitorar conexões SMTP
netstat -an | grep :587
```

#### Otimizações:

```bash
# 1. Configurar cache de templates
mkdir -p /root/nexo/nexo-pedidos/backend/cache/templates/
chmod 755 /root/nexo/nexo-pedidos/backend/cache/templates/

# 2. Configurar pool de conexões PHP-FPM
nano /etc/php/8.1/fpm/pool.d/www.conf
# Ajustar pm.max_children, pm.start_servers, etc.

# 3. Configurar timeout adequado
# Em EmailService.php, ajustar timeout SMTP
```

## 🛠️ Scripts de Diagnóstico

### Script completo de diagnóstico:

```bash
#!/bin/bash
# Salvar como: /root/nexo/nexo-pedidos/backend/diagnostico-email.sh

echo "=== DIAGNÓSTICO DO SISTEMA DE EMAIL NFe ==="
echo "Data: $(date)"
echo ""

echo "1. Verificando configurações..."
cd /root/nexo/nexo-pedidos
if [ -f .env ]; then
    echo "✅ Arquivo .env encontrado"
    grep MAIL .env | sed 's/MAIL_PASSWORD=.*/MAIL_PASSWORD=***OCULTO***/'
else
    echo "❌ Arquivo .env não encontrado"
fi
echo ""

echo "2. Verificando dependências PHP..."
php -m | grep -E "(openssl|curl|mbstring)" | while read ext; do
    echo "✅ $ext"
done
echo ""

echo "3. Verificando arquivos do sistema..."
FILES=(
    "/root/nexo/nexo-pedidos/backend/src/Services/EmailService.php"
    "/root/nexo/nexo-pedidos/backend/public/enviar-nfe-email.php"
    "/root/nexo/nexo-pedidos/backend/templates/email-nfe.html"
    "/root/nexo/nexo-pedidos/backend/templates/email-nfe.txt"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $(basename $file)"
    else
        echo "❌ $(basename $file) - NÃO ENCONTRADO"
    fi
done
echo ""

echo "4. Verificando estrutura de storage..."
if [ -d "/root/nexo/nexo-pedidos/storage" ]; then
    echo "✅ Diretório storage existe"
    echo "Empresas encontradas:"
    ls -1 /root/nexo/nexo-pedidos/storage/xml/ 2>/dev/null | head -5
else
    echo "❌ Diretório storage não encontrado"
fi
echo ""

echo "5. Testando conectividade SMTP..."
if command -v nc >/dev/null 2>&1; then
    if nc -zv smtp.gmail.com 587 2>&1 | grep -q "succeeded"; then
        echo "✅ Conectividade SMTP OK"
    else
        echo "❌ Falha na conectividade SMTP"
    fi
else
    echo "⚠️ netcat não instalado - não foi possível testar"
fi
echo ""

echo "6. Verificando logs recentes..."
if [ -f "/var/log/php_errors.log" ]; then
    echo "Últimos erros relacionados a email:"
    tail -20 /var/log/php_errors.log | grep -i email | tail -3
else
    echo "⚠️ Log do PHP não encontrado"
fi
echo ""

echo "=== FIM DO DIAGNÓSTICO ==="
```

### Tornar o script executável:

```bash
chmod +x /root/nexo/nexo-pedidos/backend/diagnostico-email.sh
```

### Executar diagnóstico:

```bash
/root/nexo/nexo-pedidos/backend/diagnostico-email.sh
```

## 📞 Quando Buscar Ajuda

Se após seguir este guia o problema persistir:

1. **Execute o script de diagnóstico** completo
2. **Colete logs** dos últimos 24h
3. **Documente o erro** com prints/logs
4. **Teste em ambiente isolado** se possível
5. **Consulte a documentação** do PHPMailer

### Informações para suporte:

- Versão do PHP: `php -v`
- Versão do sistema: `cat /etc/os-release`
- Logs de erro: últimas 50 linhas
- Configuração (sem senhas): `grep MAIL .env`
- Resultado do diagnóstico completo

---

**Última atualização:** Dezembro 2024  
**Versão:** 1.0.0
