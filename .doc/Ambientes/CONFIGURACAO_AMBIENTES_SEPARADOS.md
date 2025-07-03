# 🌐 CONFIGURAÇÃO DE AMBIENTES SEPARADOS
**Nexo Pedidos - Isolamento entre Desenvolvimento e Produção**

---

## 📋 **VISÃO GERAL**

Este documento descreve a configuração de ambientes separados para garantir isolamento total entre desenvolvimento e produção, evitando que alterações em desenvolvimento afetem o ambiente de produção.

### **🎯 PROBLEMA RESOLVIDO**
- **ANTES**: Ambos os domínios apontavam para o mesmo diretório (branch `dev`)
- **DEPOIS**: Cada domínio aponta para sua respectiva branch e diretório

---

## 🚨 **TROUBLESHOOTING**

⚠️ **Problema comum**: Se após configurar os ambientes as mudanças não aparecem no desenvolvimento, consulte:
📖 **[TROUBLESHOOTING_NGINX_AMBIENTES.md](./TROUBLESHOOTING_NGINX_AMBIENTES.md)**

---

## 🏗️ **ESTRUTURA DOS AMBIENTES**

### **📁 AMBIENTE DE DESENVOLVIMENTO**
```
📂 Diretório: /root/nexo-pedidos/
🌿 Branch: dev
🌐 Domínio: nexodev.emasoftware.app
🔧 Deploy: nexo-dev
📝 Logs: /var/log/nginx/nexo-dev-*.log
```

### **📁 AMBIENTE DE PRODUÇÃO**
```
📂 Diretório: /var/www/nexo-producao/
🌿 Branch: main
🌐 Domínio: nexo.emasoftware.app
🔒 SSL: HTTPS habilitado
📝 Logs: /var/log/nginx/nexo-*.log
```

---

## ⚙️ **CONFIGURAÇÃO NGINX**

### **📄 Arquivo: `/etc/nginx/sites-available/nexo-pedidos`**

#### **🔧 Desenvolvimento (nexodev.emasoftware.app)**
```nginx
server {
    listen 80;
    server_name nexodev.emasoftware.app;
    root /root/nexo-pedidos/dist;  # ← Branch DEV
    
    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Backend
    location /backend/ {
        root /root/nexo-pedidos;  # ← Branch DEV
        # ... configurações PHP
    }
    
    # Logs específicos
    access_log /var/log/nginx/nexo-dev-access.log;
    error_log /var/log/nginx/nexo-dev-error.log;
}
```

#### **🔒 Produção (nexo.emasoftware.app)**
```nginx
server {
    listen 443 ssl http2;
    server_name nexo.emasoftware.app;
    root /var/www/nexo-producao/dist;  # ← Branch MAIN
    
    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/nexo.emasoftware.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nexo.emasoftware.app/privkey.pem;
    
    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Backend
    location /backend/ {
        root /var/www/nexo-producao;  # ← Branch MAIN
        # ... configurações PHP
    }
    
    # Logs específicos
    access_log /var/log/nginx/nexo-access.log;
    error_log /var/log/nginx/nexo-error.log;
}
```

---

## 🚀 **PROCESSO DE DEPLOY**

### **🔧 DESENVOLVIMENTO**
```bash
# Trabalhar na branch dev
cd /root/nexo-pedidos
git checkout dev

# Fazer alterações e commit
git add .
git commit -m "feat: nova funcionalidade"
git push origin dev

# Deploy automático
nexo-dev
```

### **🔒 PRODUÇÃO**
```bash
# 1. Fazer merge da dev para main (quando pronto)
cd /root/nexo-pedidos
git checkout main
git merge dev
git push origin main

# 2. Atualizar ambiente de produção
cd /var/www/nexo-producao
git pull origin main
npm install
npm run build
sudo systemctl reload nginx
```

---

## 📁 **ESTRUTURA DE DIRETÓRIOS**

```
/root/
├── nexo-pedidos/           # 🔧 DESENVOLVIMENTO
│   ├── .git/              # Branch: dev
│   ├── dist/              # Build do frontend (dev)
│   ├── backend/           # API PHP (dev)
│   └── ...

/var/www/
├── nexo-producao/         # 🔒 PRODUÇÃO
│   ├── .git/              # Branch: main
│   ├── dist/              # Build do frontend (main)
│   ├── backend/           # API PHP (main)
│   └── ...
```

---

## 🔐 **PERMISSÕES E SEGURANÇA**

### **📂 Desenvolvimento**
```bash
# Proprietário: root (para desenvolvimento)
chown -R root:root /root/nexo-pedidos
chmod -R 755 /root/nexo-pedidos
```

### **📂 Produção**
```bash
# Proprietário: www-data (para servidor web)
chown -R www-data:www-data /var/www/nexo-producao
chmod -R 755 /var/www/nexo-producao
```

---

## 🧪 **TESTES E VERIFICAÇÃO**

### **✅ Verificar Ambientes**
```bash
# Testar desenvolvimento
curl -s -o /dev/null -w "%{http_code}" http://nexodev.emasoftware.app
# Resultado esperado: 200

# Testar produção
curl -s -o /dev/null -w "%{http_code}" https://nexo.emasoftware.app
# Resultado esperado: 200
```

### **🔍 Verificar Branches**
```bash
# Desenvolvimento
cd /root/nexo-pedidos && git branch --show-current
# Resultado esperado: dev

# Produção
cd /var/www/nexo-producao && git branch --show-current
# Resultado esperado: main
```

### **📝 Verificar Logs**
```bash
# Logs de desenvolvimento
tail -f /var/log/nginx/nexo-dev-error.log

# Logs de produção
tail -f /var/log/nginx/nexo-error.log
```

---

## 🆘 **TROUBLESHOOTING**

### **❌ Problema: Ambos domínios mostram a mesma versão**
```bash
# Verificar configuração do Nginx
grep -n "root.*nexo" /etc/nginx/sites-available/nexo-pedidos

# Resultado esperado:
# 11:    root /root/nexo-pedidos/dist;        # DEV
# 205:   root /var/www/nexo-producao/dist;    # PROD
```

### **❌ Problema: Erro 404 em produção**
```bash
# Verificar se o build existe
ls -la /var/www/nexo-producao/dist/

# Regenerar build se necessário
cd /var/www/nexo-producao
npm run build
```

### **❌ Problema: Permissões negadas**
```bash
# Corrigir permissões
sudo chown -R www-data:www-data /var/www/nexo-producao
sudo chmod -R 755 /var/www/nexo-producao
```

---

## 📚 **COMANDOS ÚTEIS**

### **🔧 Nginx**
```bash
# Testar configuração
sudo nginx -t

# Recarregar configuração
sudo systemctl reload nginx

# Reiniciar Nginx
sudo systemctl restart nginx
```

### **📊 Monitoramento**
```bash
# Status dos serviços
sudo systemctl status nginx php8.3-fpm

# Verificar processos
ps aux | grep nginx
ps aux | grep php-fpm
```

### **🔄 Git**
```bash
# Ver diferenças entre branches
git log --oneline main..dev

# Verificar status
git status
git branch -a
```

---

## ⚠️ **REGRAS IMPORTANTES**

### **🚫 NUNCA FAÇA:**
- ❌ Deploy direto na branch `main` sem testar na `dev`
- ❌ Alterações manuais nos arquivos de produção
- ❌ Commit direto na branch `main`
- ❌ Usar `nexo-dev` em produção

### **✅ SEMPRE FAÇA:**
- ✅ Desenvolva na branch `dev`
- ✅ Teste no ambiente de desenvolvimento primeiro
- ✅ Faça merge da `dev` para `main` apenas quando estável
- ✅ Mantenha backups antes de atualizações importantes

---

## 📞 **CONTATOS E SUPORTE**

- **Documentação**: `.chat-ia/` (pasta do projeto)
- **Logs**: `/var/log/nginx/nexo-*.log`
- **Configuração**: `/etc/nginx/sites-available/nexo-pedidos`

---

## 🚀 **COMANDOS RÁPIDOS**

### **✅ Verificar Status dos Ambientes**
```bash
/root/nexo-pedidos/scripts/verificar-ambientes.sh
```

### **🔧 Desenvolvimento (Branch DEV)**
```bash
cd /root/nexo-pedidos
git checkout dev
# Fazer alterações...
nexo-dev  # Deploy automático
```

### **🔒 Produção (Branch MAIN)**
```bash
# 1. Sincronizar dev → main
cd /root/nexo-pedidos
git checkout main
git merge dev
git push origin main

# 2. Deploy para produção
cd /var/www/nexo-producao
git pull origin main
npm install
npm run build
sudo systemctl reload nginx
```

### **🆘 Comandos de Emergência**
```bash
# Verificar se ambientes estão funcionando
curl -s -o /dev/null -w "%{http_code}" http://nexodev.emasoftware.app
curl -s -o /dev/null -w "%{http_code}" https://nexo.emasoftware.app

# Reiniciar serviços
sudo systemctl restart nginx php8.3-fpm

# Ver logs em tempo real
tail -f /var/log/nginx/nexo-dev-error.log    # Desenvolvimento
tail -f /var/log/nginx/nexo-error.log        # Produção
```

## 🔗 **DOCUMENTOS RELACIONADOS**

- 📖 **[TROUBLESHOOTING_NGINX_AMBIENTES.md](./TROUBLESHOOTING_NGINX_AMBIENTES.md)** - Solução para problemas de configuração do Nginx
- 🛠️ **[SCRIPTS_MANUTENCAO_AMBIENTES.md](./SCRIPTS_MANUTENCAO_AMBIENTES.md)** - Scripts de manutenção e deploy

---

**📅 Última atualização:** 03/07/2025
**👤 Responsável:** Emanuel Luis
**🔧 Versão:** 1.1
**📁 Scripts:** `/root/nexo-pedidos/scripts/`
