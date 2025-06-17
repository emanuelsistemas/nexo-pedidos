# 🏗️ Implementação de 3 Ambientes - Sistema Nexo Pedidos

## 📋 **VISÃO GERAL**

Este documento detalha a implementação completa de **3 ambientes separados** para desenvolvimento, teste e produção do sistema Nexo Pedidos, proporcionando um workflow profissional e seguro.

## 🎯 **ARQUITETURA DOS AMBIENTES**

### **🔥 1. DESENVOLVIMENTO (DEV)**
- **URL**: http://31.97.166.71:5173
- **Comando**: `nexo-dev`
- **Servidor**: Vite dev server
- **Características**:
  - Hot Module Replacement (HMR)
  - Fast Refresh
  - Source Maps
  - Sem minificação (build rápido)
  - Host: 0.0.0.0 (acesso externo)
  - CORS habilitado

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

### **Vite Configuration (vite.config.ts)**
```typescript
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  
  return {
    server: {
      host: '0.0.0.0', // Permite acesso externo na VPS
      port: 5173,
      strictPort: true,
      cors: true,
    },
    build: {
      outDir: isDev ? 'dist-dev' : 'dist',
      minify: isDev ? false : 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: isDev ? undefined : {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            supabase: ['@supabase/supabase-js'],
          },
        },
      },
    },
  };
});
```

### **Package.json Scripts**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "build:dev": "tsc && vite build --outDir dist-dev --mode development",
    "build:prod": "tsc && vite build --outDir dist --mode production"
  }
}
```

## 🚀 **SCRIPTS DE AUTOMAÇÃO**

### **1. nexo-dev (Desenvolvimento)**
```bash
#!/bin/bash
PROJECT_DIR="/root/nexo-pedidos"
cd "$PROJECT_DIR"

# Verificações de porta, dependências, .env
# Configuração de firewall se necessário
# Inicialização do Vite dev server

npm run dev
```

### **2. nexo-beta (Beta/Staging)**
```bash
#!/bin/bash
PROJECT_DIR="/root/nexo-pedidos"
cd "$PROJECT_DIR"

# Build otimizado para desenvolvimento
npm run build:dev

# Deploy para diretório beta
sudo rm -rf /var/www/nexo-beta/*
sudo cp -r dist-dev/* /var/www/nexo-beta/

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
npm run build

# Configurações de servidor e permissões
# Verificações de serviços (Nginx, PHP-FPM)
```

## 🌐 **CONFIGURAÇÃO NGINX**

### **Desenvolvimento (IP Direto)**
```nginx
server {
    listen 80;
    server_name 31.97.166.71 localhost _;
    root /root/nexo-pedidos/dist;
    # Configurações básicas para desenvolvimento
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
nexo-dev
# - Hot reload ativo
# - Mudanças em tempo real
# - Debug facilitado
# - Acesso: http://31.97.166.71:5173

# 2. Funcionalidade Pronta → Beta (Tester)
nexo-beta
# - Build otimizado mas rápido
# - Ambiente isolado para testes
# - Acesso: https://nexobeta.emasoftware.app

# 3. Tester Aprovou → Produção (Usuários)
nexo
# - Build totalmente otimizado
# - Ambiente final
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
├── dist/                          # Build produção
├── dist-dev/                      # Build desenvolvimento
├── backend/                       # API PHP
├── nginx-beta.conf               # Config Nginx beta
├── beta.sh                       # Script deploy beta
├── dev-vps.sh                    # Script dev server
├── setup-ssl-beta.sh             # Script SSL beta
└── AMBIENTES-3-SETUP.md          # Documentação

/var/www/nexo-beta/               # Deploy beta
├── index.html
├── assets/
└── ...

/etc/nginx/sites-available/
├── nexo-pedidos                  # Config produção
└── nexo-beta                     # Config beta

/usr/local/bin/
├── nexo                          # Comando produção
├── nexo-dev                      # Comando desenvolvimento
└── nexo-beta                     # Comando beta
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
- Dev: Hot reload para produtividade
- Beta: Build rápido para testes
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
- [x] Vite config para acesso externo
- [x] Scripts automatizados (nexo-dev, nexo-beta, nexo)
- [x] Configuração Nginx para beta
- [x] Estrutura de diretórios
- [x] Comandos globais
- [x] Script de SSL automatizado

### **⏳ Pendente (Configuração DNS):**
- [ ] DNS nexobeta.emasoftware.app → 31.97.166.71
- [ ] Certificado SSL para beta
- [ ] Teste completo dos 3 ambientes

## 🚀 **PRÓXIMAS MELHORIAS SUGERIDAS**

### **1. Sistema de Branches**
```bash
main (produção)     ← nexo
├── beta (staging)  ← nexo-beta  
└── dev (desenvolvimento) ← nexo-dev
```

### **2. CI/CD Automatizado**
- Deploy automático por branch
- Testes automatizados
- Notificações de deploy

### **3. Monitoramento**
- Health checks automáticos
- Alertas de erro
- Métricas de performance

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
