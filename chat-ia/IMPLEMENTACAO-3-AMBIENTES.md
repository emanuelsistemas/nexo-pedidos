# 🏗️ Implementação de 3 Ambientes - Sistema Nexo Pedidos

## 📋 **VISÃO GERAL**

Este documento detalha a implementação completa de **3 ambientes separados** para desenvolvimento, teste e produção do sistema Nexo Pedidos, proporcionando um workflow profissional e seguro.

## 🎯 **ARQUITETURA DOS AMBIENTES**

### **🔥 1. DESENVOLVIMENTO (DEV)**
- **URL**: http://nexodev.emasoftware.app
- **Comando**: `nexo-dev`
- **Servidor**: Nginx
- **Características**:
  - Build estático otimizado
  - Mesmo comportamento que beta/produção
  - Ambiente isolado para desenvolvimento
  - Logs separados para debugging
  - HTTP (sem SSL para simplicidade)
  - Verificação automática de branch dev

### **🧪 2. BETA/STAGING (TESTE)**
- **URL**: https://nexobeta.emasoftware.app
- **Comando**: `nexo-beta`
- **Servidor**: Nginx
- **Características**:
  - Build otimizado para desenvolvimento
  - Sem minificação (build rápido)
  - Diretório: `/var/www/nexo-beta/`
  - SSL via Let's Encrypt
  - Logs separados

### **🛡️ 3. PRODUÇÃO (PROD)**
- **URL**: https://nexo.emasoftware.app
- **Comando**: `nexo`
- **Servidor**: Nginx
- **Características**:
  - Build totalmente otimizado
  - Minificação completa
  - Code splitting
  - Cache otimizado
  - SSL via Let's Encrypt

## 🔧 **CONFIGURAÇÕES TÉCNICAS**

### **Estratégia de Build Unificada**
Todos os ambientes agora utilizam **build estático** para garantir consistência e evitar problemas específicos do Vite dev server:

- **Desenvolvimento**: Build estático servido via Nginx
- **Beta**: Build estático servido via Nginx
- **Produção**: Build estático servido via Nginx

### **Package.json Scripts**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

### **Vantagens do Build Estático Unificado**
- ✅ **Consistência**: Mesmo comportamento em todos os ambientes
- ✅ **Debugging**: Problemas reproduzíveis entre ambientes
- ✅ **Performance**: Otimizações aplicadas uniformemente
- ✅ **APIs**: Funcionamento correto de todas as integrações

## 🚀 **SCRIPTS DE AUTOMAÇÃO**

### **1. nexo-dev (Desenvolvimento)**
```bash
#!/bin/bash
PROJECT_DIR="/root/nexo-pedidos"
cd "$PROJECT_DIR"

# Verificação automática de branch dev
# Verificações de dependências e .env
# Build completo para desenvolvimento
npm run build

# Configurações de servidor e permissões
# Verificações de serviços (Nginx, PHP-FPM)
# Deploy para /root/nexo-pedidos/dist
# Logs específicos: /var/log/nexo-dev.log
```

### **2. nexo-beta (Beta/Staging)**
```bash
#!/bin/bash
PROJECT_DIR="/root/nexo-pedidos"
cd "$PROJECT_DIR"

# Build otimizado
npm run build

# Deploy para diretório beta
sudo rm -rf /var/www/nexo-beta/*
sudo cp -r dist/* /var/www/nexo-beta/

# Configuração de permissões
sudo chown -R www-data:www-data /var/www/nexo-beta/
sudo chmod -R 755 /var/www/nexo-beta/
```

### **3. nexo (Produção)**
```bash
#!/bin/bash
PROJECT_DIR="/root/nexo-pedidos"
cd "$PROJECT_DIR"

# Build completo de produção
# Configurações de servidor e permissões
# Verificações de serviços (Nginx, PHP-FPM)
# Deploy para /root/nexo-pedidos/dist
```

### **Comandos Separados por Ambiente**
Cada ambiente possui seu comando específico, garantindo isolamento e configurações adequadas para cada contexto de uso.

### **Características Específicas do nexo-dev:**
- ✅ **Verificação de Branch**: Alerta se não estiver na branch `dev`
- ✅ **Logs Dedicados**: `/var/log/nexo-dev.log` para debugging
- ✅ **Testes Automáticos**: Verifica se endpoints estão funcionando
- ✅ **Domínio Próprio**: `nexodev.emasoftware.app` isolado
- ✅ **Build Consistente**: Mesmo processo que produção
- ✅ **Permissões Automáticas**: Configuração automática de permissões

## 🌐 **CONFIGURAÇÃO NGINX**

### **Desenvolvimento (Domínio Dedicado)**
```nginx
server {
    listen 80;
    server_name nexodev.emasoftware.app;
    root /root/nexo-pedidos/dist;

    # Configurações básicas para desenvolvimento
    # Logs específicos: /var/log/nginx/nexo-dev-*.log
    # HTTP apenas (sem SSL para simplicidade)
}

server {
    listen 80;
    server_name 31.97.166.71 localhost _;
    root /root/nexo-pedidos/dist;
    # Acesso direto por IP mantido para compatibilidade
}
```

### **Beta (Subdomínio)**
```nginx
server {
    listen 443 ssl http2;
    server_name nexobeta.emasoftware.app;
    root /var/www/nexo-beta;
    
    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/nexobeta.emasoftware.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nexobeta.emasoftware.app/privkey.pem;
    
    # Logs específicos
    access_log /var/log/nginx/nexo-beta-access.log;
    error_log /var/log/nginx/nexo-beta-error.log;
}
```

### **Produção (Domínio Principal)**
```nginx
server {
    listen 443 ssl http2;
    server_name nexo.emasoftware.app;
    root /root/nexo-pedidos/dist;
    
    # Configurações SSL e otimizações completas
}
```

## 🔄 **WORKFLOW DE DESENVOLVIMENTO**

### **Fluxo Diário Recomendado:**

```bash
# 1. Desenvolvimento (Programador)
branch dev             # Mudar para branch de desenvolvimento
nexo-dev              # Build e deploy para desenvolvimento
# - Desenvolver funcionalidades
# - Testar em: http://nexodev.emasoftware.app
push                  # Commit automático: "🔥 DEV: Atualização em..."

# 2. Funcionalidade Pronta → Beta (Tester)
branch beta           # Mudar para branch de teste
branch merge dev beta # Fazer merge dev → beta
nexo-beta            # Deploy para ambiente beta
# - Tester analisa funcionalidades
# - Acesso: https://nexobeta.emasoftware.app

# 3. Tester Aprovou → Produção (Usuários)
branch main          # Mudar para branch principal
branch merge beta main # Fazer merge beta → main
nexo                 # Deploy para produção
# - Usuários finais acessam
# - Acesso: https://nexo.emasoftware.app
```

## 🔒 **CONFIGURAÇÃO SSL**

### **Script Automatizado (setup-ssl-beta.sh)**
```bash
#!/bin/bash
# Instalação do Certbot
sudo apt install -y certbot python3-certbot-nginx

# Verificação de DNS
DOMAIN_IP=$(dig +short nexobeta.emasoftware.app)
SERVER_IP=$(curl -s ifconfig.me)

# Obtenção do certificado
sudo certbot --nginx -d nexobeta.emasoftware.app \
  --non-interactive --agree-tos --email admin@emasoftware.app
```

## 📊 **ESTRUTURA DE DIRETÓRIOS**

```
/root/nexo-pedidos/
├── src/                           # Código fonte
├── dist/                          # Build unificado (dev/prod)
├── backend/                       # API PHP
├── nginx-beta.conf               # Config Nginx beta
├── beta.sh                       # Script deploy beta
├── setup-ssl-beta.sh             # Script SSL beta
└── IMPLEMENTACAO-3-AMBIENTES.md  # Documentação

/var/www/nexo-beta/               # Deploy beta
├── index.html
├── assets/
└── ...

/etc/nginx/sites-available/
├── nexo-pedidos                  # Config unificado (dev/prod/beta)
└── nexo-beta                     # Config beta (se separado)

/usr/local/bin/
├── nexo-dev                      # Comando desenvolvimento
├── nexo-beta                     # Comando beta
└── nexo                          # Comando produção

/var/log/
├── nexo-dev.log                  # Logs desenvolvimento
├── nexo-beta-*.log               # Logs beta
└── nexo-*.log                    # Logs produção
```

## 🎯 **VANTAGENS DA IMPLEMENTAÇÃO**

### **✅ Isolamento Completo**
- Cada ambiente é independente
- Falhas em um não afetam outros
- Configurações específicas por ambiente

### **✅ Workflow Profissional**
- Desenvolvimento → Beta → Produção
- Testes isolados antes da produção
- Rollback fácil em qualquer etapa

### **✅ Performance Otimizada**
- Dev: Build estático consistente
- Beta: Build otimizado para testes
- Prod: Build otimizado para usuários

### **✅ Segurança**
- SSL em todos os ambientes públicos
- Logs separados por ambiente
- Permissões adequadas

## 🔧 **COMANDOS DE MANUTENÇÃO**

### **Verificação de Status**
```bash
# Verificar serviços
sudo systemctl status nginx php8.3-fpm

# Verificar logs
sudo tail -f /var/log/nginx/nexo-beta-error.log
sudo tail -f /var/log/nginx/nexo-error.log

# Verificar certificados SSL
sudo certbot certificates

# Testar configurações Nginx
sudo nginx -t
```

### **Rebuild de Ambientes**
```bash
# Rebuild desenvolvimento
nexo-dev

# Rebuild beta
nexo-beta

# Rebuild produção
nexo
```

## 📋 **CHECKLIST DE IMPLEMENTAÇÃO**

### **✅ Configurações Concluídas:**
- [x] Build estático unificado para todos os ambientes
- [x] Scripts automatizados (nexo, nexo-beta)
- [x] Configuração Nginx para dev/beta/prod
- [x] Domínio nexodev.emasoftware.app configurado
- [x] Estrutura de diretórios otimizada
- [x] Comandos globais simplificados
- [x] Script de SSL automatizado

### **✅ Implementação Completa:**
- [x] DNS nexodev.emasoftware.app → 31.97.166.71
- [x] DNS nexobeta.emasoftware.app → 31.97.166.71
- [x] Certificado SSL para beta
- [x] Teste completo dos 3 ambientes
- [x] Consistência entre ambientes garantida

## 🌿 **SISTEMA DE BRANCHES IMPLEMENTADO**

### **Estrutura de Branches:**
```bash
main (produção)     ← nexo (https://nexo.emasoftware.app)
├── beta (staging)  ← nexo-beta (https://nexobeta.emasoftware.app)
└── dev (desenvolvimento) ← nexo-dev (http://nexodev.emasoftware.app)
```

### **Comandos de Branch:**
```bash
# Gerenciamento de branches
branch status          # Ver status de todas as branches
branch dev             # Mudar para desenvolvimento
branch beta            # Mudar para staging/teste
branch main            # Mudar para produção
branch merge dev beta  # Merge dev → beta
```

### **Push Inteligente:**
```bash
push  # Detecta a branch e faz commit/push automático
```

**Mensagens automáticas por branch:**
- **dev**: `🔥 DEV: Atualização em DD/MM/YYYY HH:MM:SS`
- **beta**: `🧪 BETA: Deploy para testes em DD/MM/YYYY HH:MM:SS`
- **main**: `🛡️ PROD: Release em DD/MM/YYYY HH:MM:SS`

## 🚀 **PRÓXIMAS MELHORIAS SUGERIDAS**

### **1. CI/CD Automatizado**
- Deploy automático por branch
- Testes automatizados
- Notificações de deploy

### **2. Monitoramento**
- Health checks automáticos
- Alertas de erro
- Métricas de performance

## 🔄 **MUDANÇA ARQUITETURAL IMPORTANTE**

### **Migração do Vite Dev Server para Build Estático**

**Problema Identificado:**
- O ambiente de desenvolvimento usando Vite dev server apresentava comportamentos inconsistentes
- APIs funcionavam diferente entre dev (Vite) e produção (Nginx)
- Problemas específicos com carregamento de dados da empresa e certificados digitais
- Debugging dificultado pela diferença de ambientes

**Solução Implementada:**
- **Unificação**: Todos os ambientes agora usam build estático servido via Nginx
- **Consistência**: Comportamento idêntico entre dev, beta e produção
- **Confiabilidade**: Problemas reproduzíveis em qualquer ambiente
- **Simplicidade**: Um único comando `nexo` para dev e produção

**Benefícios Alcançados:**
- ✅ **Certificados digitais**: Funcionam corretamente em todos os ambientes
- ✅ **APIs**: Comportamento consistente entre ambientes
- ✅ **Debugging**: Problemas identificados em dev são reais
- ✅ **Deploy**: Processo unificado e confiável

## 📝 **OBSERVAÇÕES IMPORTANTES**

### **Compatibilidade Multi-tenant**
- Todos os ambientes respeitam o sistema multi-tenant
- Isolamento de dados por empresa_id
- Certificados separados por empresa

### **Integração com NFe**
- Backend PHP compartilhado entre ambientes
- Configurações SEFAZ por ambiente
- Logs separados para debugging

### **Manutenibilidade**
- Scripts documentados e comentados
- Configurações padronizadas
- Rollback simples e rápido

---

**🎯 Implementação completa de 3 ambientes profissionais**  
**🔒 Segurança e isolamento garantidos**  
**🚀 Workflow otimizado para desenvolvimento**  
**📊 Monitoramento e logs separados**
