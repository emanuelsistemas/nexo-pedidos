# 🚀 COMANDOS DE BUILD E DEPLOY - NEXO PEDIDOS

## 🎯 **VISÃO GERAL**

Este documento detalha os comandos corretos para build e deploy do sistema Nexo Pedidos, incluindo as diferenças entre desenvolvimento e produção.

---

## 🔧 **COMANDOS DE BUILD**

### **📍 DESENVOLVIMENTO (RÁPIDO)**
```bash
cd /root/nexo-pedidos

# Opção 1: NPM Script
npm run build:dev

# Opção 2: Script Shell
./build-dev.sh
```

**Características:**
- ✅ **Build rápido** para desenvolvimento
- ✅ **Gera**: `/root/nexo-pedidos/dist-dev/`
- ✅ **Usado para**: `http://31.97.166.71`
- ✅ **Modo**: Development
- ✅ **Otimização**: Mínima (mais rápido)

### **📍 PRODUÇÃO (OTIMIZADO)**
```bash
cd /root/nexo-pedidos

# Opção 1: NPM Script específico
npm run build:prod

# Opção 2: NPM Script padrão
npm run build
```

**Características:**
- ✅ **Build otimizado** para produção
- ✅ **Gera**: `/root/nexo-pedidos/dist/`
- ✅ **Usado para**: `https://nexo.emasoftware.app`
- ✅ **Modo**: Production
- ✅ **Otimização**: Máxima (minificação, tree-shaking)

---

## 🌐 **CONFIGURAÇÃO NGINX**

### **Desenvolvimento:**
```nginx
# /root/nexo-pedidos/nginx.conf
server {
    listen 80;
    server_name 31.97.166.71 localhost _;
    root /root/nexo-pedidos/dist-dev;  # ← Aponta para build de desenvolvimento
    index index.html;
}
```

### **Produção:**
```nginx
# /root/nexo-pedidos/nginx.conf
server {
    listen 443 ssl http2;
    server_name nexo.emasoftware.app;
    root /root/nexo-pedidos/dist;  # ← Aponta para build de produção
    index index.html;
}
```

---

## 📋 **FLUXO COMPLETO DE DEPLOY**

### **🔧 DESENVOLVIMENTO:**
```bash
# 1. Navegar para o diretório
cd /root/nexo-pedidos

# 2. Build de desenvolvimento
npm run build:dev

# 3. Recarregar nginx
sudo systemctl reload nginx

# 4. Testar
# Acessar: http://31.97.166.71
```

### **🚀 PRODUÇÃO:**
```bash
# 1. Navegar para o diretório
cd /root/nexo-pedidos

# 2. Build de produção
npm run build:prod

# 3. Recarregar nginx
sudo systemctl reload nginx

# 4. Testar
# Acessar: https://nexo.emasoftware.app
```

---

## ⚠️ **IMPORTANTE - PROBLEMAS COMUNS**

### **🚨 Mudanças não aparecem:**
```bash
# 1. Verificar se usou o build correto
# Para desenvolvimento: npm run build:dev
# Para produção: npm run build:prod

# 2. Verificar se nginx foi recarregado
sudo systemctl reload nginx

# 3. Limpar cache do navegador
# Ctrl+F5 ou Ctrl+Shift+R

# 4. Verificar se arquivo foi gerado
ls -la /root/nexo-pedidos/dist-dev/  # Para desenvolvimento
ls -la /root/nexo-pedidos/dist/      # Para produção
```

### **🔍 Debug de Build:**
```bash
# Verificar se build foi bem-sucedido
echo $?  # Deve retornar 0

# Verificar arquivos gerados
ls -la /root/nexo-pedidos/dist-dev/assets/
ls -la /root/nexo-pedidos/dist/assets/

# Verificar configuração nginx
nginx -t

# Verificar status nginx
sudo systemctl status nginx
```

---

## 📊 **DIFERENÇAS ENTRE BUILDS**

| Aspecto | Desenvolvimento | Produção |
|---------|----------------|----------|
| **Comando** | `npm run build:dev` | `npm run build:prod` |
| **Diretório** | `dist-dev/` | `dist/` |
| **URL** | `http://31.97.166.71` | `https://nexo.emasoftware.app` |
| **Velocidade** | ⚡ Rápido | 🐌 Lento |
| **Otimização** | ❌ Mínima | ✅ Máxima |
| **Tamanho** | 📦 Maior | 📦 Menor |
| **Debug** | ✅ Facilitado | ❌ Dificultado |
| **SSL** | ❌ HTTP | ✅ HTTPS |

---

## 🎯 **QUANDO USAR CADA BUILD**

### **📍 Use BUILD DE DESENVOLVIMENTO quando:**
- ✅ Testando mudanças rapidamente
- ✅ Debugando problemas
- ✅ Desenvolvimento ativo
- ✅ Precisa de build rápido
- ✅ Acessando via IP (31.97.166.71)

### **📍 Use BUILD DE PRODUÇÃO quando:**
- ✅ Deploy final
- ✅ Teste de performance
- ✅ Validação antes de release
- ✅ Acessando via domínio (nexo.emasoftware.app)
- ✅ Demonstração para cliente

---

## 🔄 **SCRIPTS DISPONÍVEIS**

### **package.json:**
```json
{
  "scripts": {
    "build": "tsc && vite build",
    "build:prod": "tsc && vite build",
    "build:dev": "tsc && vite build --outDir dist-dev --mode development"
  }
}
```

### **Scripts Shell:**
```bash
# build-dev.sh
#!/bin/bash
npm run build:dev
sudo systemctl reload nginx
echo "✅ Build de desenvolvimento concluído!"
```

---

## 📝 **CHECKLIST DE DEPLOY**

### **Antes do Deploy:**
- [ ] Código commitado e testado
- [ ] Escolher build correto (dev/prod)
- [ ] Verificar se há erros no código

### **Durante o Deploy:**
- [ ] Executar comando de build correto
- [ ] Verificar se build foi bem-sucedido
- [ ] Recarregar nginx
- [ ] Verificar se nginx não tem erros

### **Após o Deploy:**
- [ ] Acessar URL correspondente
- [ ] Testar funcionalidades principais
- [ ] Verificar console do navegador
- [ ] Limpar cache se necessário

---

## 🆘 **TROUBLESHOOTING**

### **Build falha:**
```bash
# Limpar node_modules e reinstalar
rm -rf node_modules package-lock.json
npm install

# Verificar versão do Node
node --version
npm --version
```

### **Nginx não carrega:**
```bash
# Verificar configuração
nginx -t

# Reiniciar nginx
sudo systemctl restart nginx

# Verificar logs
sudo tail -f /var/log/nginx/error.log
```

### **Mudanças não aparecem:**
```bash
# Verificar timestamp dos arquivos
ls -la /root/nexo-pedidos/dist-dev/assets/
ls -la /root/nexo-pedidos/dist/assets/

# Forçar rebuild
rm -rf dist-dev/ dist/
npm run build:dev
```

---

## 🎯 **RESUMO PARA CHAT IA**

**Para desenvolvimento E produção (RECOMENDADO):**
```bash
nexo
```

**Para desenvolvimento rápido:**
```bash
./build-dev-fix.sh
```

**Para produção:**
```bash
npm run build:prod && sudo systemctl reload nginx
```

**URLs de teste:**
- **Desenvolvimento**: `http://31.97.166.71`
- **Produção**: `https://nexo.emasoftware.app`
