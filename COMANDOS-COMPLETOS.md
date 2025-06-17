# 🚀 Comandos Completos - Sistema Nexo Pedidos

## 🎯 **COMANDOS PRINCIPAIS**

### **🌿 Gerenciamento de Branches**
```bash
branch status          # Ver status de todas as branches
branch dev             # Mudar para desenvolvimento
branch beta            # Mudar para staging/teste  
branch main            # Mudar para produção
branch merge dev beta  # Merge dev → beta
```

### **📦 Git Inteligente**
```bash
push                   # Commit + push automático com data/hora
                      # Detecta branch e usa emoji específico
```

### **🚀 Deploy dos Ambientes**
```bash
nexo-dev              # Desenvolvimento (Vite dev server)
nexo-beta             # Beta/Staging (build otimizado)
nexo                  # Produção (build final)
```

## 🔄 **WORKFLOW COMPLETO**

### **1. Desenvolvimento Diário:**
```bash
branch dev            # Ir para desenvolvimento
nexo-dev             # Iniciar servidor (porta 5173)
# Desenvolver funcionalidades...
push                 # Commit: "🔥 DEV: Atualização em..."
```

### **2. Enviar para Teste:**
```bash
branch beta          # Ir para staging
branch merge dev beta # Merge dev → beta
push                 # Commit: "🧪 BETA: Deploy para testes em..."
nexo-beta           # Deploy para https://nexobeta.emasoftware.app
```

### **3. Enviar para Produção:**
```bash
branch main         # Ir para produção
branch merge beta main # Merge beta → main
push                # Commit: "🛡️ PROD: Release em..."
nexo               # Deploy para https://nexo.emasoftware.app
```

## 🌐 **URLs DOS AMBIENTES**

| Ambiente | URL | Comando | Branch |
|----------|-----|---------|--------|
| **DEV** | http://31.97.166.71:5173 | `nexo-dev` | `dev` |
| **BETA** | https://nexobeta.emasoftware.app | `nexo-beta` | `beta` |
| **PROD** | https://nexo.emasoftware.app | `nexo` | `main` |

## 🎨 **MENSAGENS DE COMMIT AUTOMÁTICAS**

### **Por Branch:**
- **dev**: `🔥 DEV: Atualização em 17/06/2025 20:15:30`
- **beta**: `🧪 BETA: Deploy para testes em 17/06/2025 20:15:30`
- **main**: `🛡️ PROD: Release em 17/06/2025 20:15:30`

## 🔧 **COMANDOS DE MANUTENÇÃO**

### **Verificação de Status:**
```bash
branch status         # Status completo das branches
git status           # Status local
git log --oneline -5 # Últimos 5 commits
```

### **Logs dos Serviços:**
```bash
sudo tail -f /var/log/nginx/nexo-error.log       # Logs produção
sudo tail -f /var/log/nginx/nexo-beta-error.log  # Logs beta
sudo systemctl status nginx php8.3-fpm          # Status serviços
```

### **Rebuild Completo:**
```bash
# Desenvolvimento
nexo-dev

# Beta
nexo-beta

# Produção  
nexo
```

## 🛡️ **COMANDOS DE SEGURANÇA**

### **Backup antes de Mudanças:**
```bash
git stash push -m "Backup antes de mudança importante"
git stash list       # Ver backups
git stash pop        # Restaurar último backup
```

### **Rollback de Emergência:**
```bash
git reset --hard HEAD~1  # Voltar 1 commit
git push --force-with-lease # Push forçado (cuidado!)
```

## 📊 **MONITORAMENTO**

### **Verificar Ambientes:**
```bash
curl -I http://31.97.166.71:5173              # Dev
curl -I https://nexobeta.emasoftware.app      # Beta
curl -I https://nexo.emasoftware.app          # Prod
```

### **Verificar SSL:**
```bash
sudo certbot certificates                     # Ver certificados
sudo certbot renew --dry-run                 # Testar renovação
```

## 🎯 **ATALHOS RÁPIDOS**

### **Desenvolvimento Rápido:**
```bash
alias dev="branch dev && nexo-dev"
alias beta-deploy="branch beta && nexo-beta"
alias prod-deploy="branch main && nexo"
```

### **Status Rápido:**
```bash
alias st="branch status"
alias logs="sudo tail -f /var/log/nginx/nexo-error.log"
```

## 🚨 **COMANDOS DE EMERGÊNCIA**

### **Parar Todos os Serviços:**
```bash
sudo systemctl stop nginx
pkill -f "vite"
pkill -f "node"
```

### **Reiniciar Tudo:**
```bash
sudo systemctl restart nginx php8.3-fpm
nexo-dev  # Se necessário
```

### **Limpar Cache:**
```bash
rm -rf node_modules/.vite
rm -rf dist/ dist-dev/
npm install
```

## ✅ **CHECKLIST DIÁRIO**

### **Antes de Começar:**
- [ ] `branch status` - Ver estado das branches
- [ ] `git pull` - Atualizar branch atual
- [ ] `nexo-dev` - Iniciar desenvolvimento

### **Antes de Enviar para Beta:**
- [ ] Testar funcionalidade localmente
- [ ] `push` - Commit das mudanças
- [ ] `branch beta && branch merge dev beta`
- [ ] `nexo-beta` - Deploy para teste

### **Antes de Enviar para Produção:**
- [ ] Tester aprovou no beta
- [ ] `branch main && branch merge beta main`
- [ ] `nexo` - Deploy para produção
- [ ] Verificar se está funcionando

---

**🎯 Sistema completo de 3 ambientes com branches**  
**🔄 Workflow automatizado e seguro**  
**🚀 Deploy simplificado com um comando**  
**📊 Monitoramento e logs organizados**
