# ⚡ COMANDOS RÁPIDOS DE EMERGÊNCIA

## 🚨 **PARA SITUAÇÕES CRÍTICAS**

Este documento contém comandos prontos para resolver problemas rapidamente.

---

## 🔥 **EMERGÊNCIA 1: API NFe Não Responde**

### **Verificar Status:**
```bash
curl https://apinfe.nexopdv.com/api/status
```

### **Se não responder, acessar VPS:**
```bash
# SSH direto
ssh root@157.180.88.133
# Senha: Gbu2yD76U38bUU

# Verificar serviços
systemctl status nginx php8.3-fpm

# Reiniciar se necessário
systemctl restart nginx php8.3-fpm

# Ver logs
tail -20 /var/log/nginx/nfe-api.error.log
```

---

## 🔥 **EMERGÊNCIA 2: HTTP 500 na Emissão NFe**

### **Debug Rápido via SSH Manager:**
```bash
# 1. Iniciar SSH Manager
cd C:\Users\Usuario\Desktop\projetos\nexo-pedidos\ssh
start.bat

# 2. Verificar logs (em outro terminal)
curl http://localhost:5000/api/logs/nginx?lines=10
curl http://localhost:5000/api/logs/php?lines=10

# 3. Debug completo
curl http://localhost:5000/api/nfe/debug
```

### **Soluções Comuns:**
```bash
# Verificar certificados
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "ls -la /var/www/nfe-api/storage/certificados/"}'

# Verificar permissões
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "chown -R www-data:www-data /var/www/nfe-api"}'

# Testar API localmente
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "curl -X POST localhost/api/nfe-completa -H \"Content-Type: application/json\" -d \"{}\""}'
```

---

## 🔥 **EMERGÊNCIA 3: Frontend Não Carrega**

### **Verificar e Reiniciar:**
```bash
# Navegar para projeto
cd "C:\Users\Usuario\Desktop\projetos\nexo-pedidos"

# Matar porta se travada
npx kill-port 5173

# Limpar cache
rm -rf node_modules
rm package-lock.json
npm install

# Iniciar desenvolvimento
npm run dev
```

### **Verificar Erros:**
```bash
# Verificar TypeScript
npx tsc --noEmit

# Verificar build
npm run build
```

---

## 🔥 **EMERGÊNCIA 4: SSH Manager Não Conecta**

### **Reinstalar Completamente:**
```bash
cd C:\Users\Usuario\Desktop\projetos\nexo-pedidos\ssh

# Remover ambiente virtual
rmdir /s venv

# Recriar
setup.bat

# Verificar .env
type .env

# Iniciar
start.bat
```

### **Testar Conexão:**
```bash
# Ativar ambiente
venv\Scripts\activate.bat

# Executar testes
python test_connection.py
```

---

## 🔥 **EMERGÊNCIA 5: Supabase Não Responde**

### **Verificar Conexão:**
```typescript
// No console do navegador (F12)
const { data, error } = await supabase
  .from('empresas')
  .select('id')
  .limit(1);
console.log({ data, error });
```

### **Verificar Configuração:**
```bash
# Verificar arquivo de config
cat src/lib/supabase.ts
```

### **URLs de Emergência:**
- **Dashboard:** https://supabase.com/dashboard/project/xsrirnfwsjeovekwtluz
- **API URL:** https://xsrirnfwsjeovekwtluz.supabase.co

---

## 🔥 **EMERGÊNCIA 6: Certificado Digital Inválido**

### **Verificar Status:**
```sql
-- No Supabase SQL Editor
SELECT 
  id, 
  name, 
  certificado_digital_path, 
  certificado_digital_status 
FROM empresas 
WHERE id = 'uuid-da-empresa';
```

### **Verificar Arquivo:**
```bash
# Via SSH Manager
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "ls -la /var/www/nfe-api/storage/certificados/"}'
```

### **Testar Certificado:**
```bash
# Na VPS
openssl pkcs12 -in certificado.pfx -nokeys -passin pass:senha | openssl x509 -noout -dates
```

---

## 🔥 **EMERGÊNCIA 7: Numeração NFe Duplicada**

### **Limpar Controle:**
```sql
-- No Supabase SQL Editor
DELETE FROM nfe_numero_controle 
WHERE status = 'reservado' 
AND created_at < NOW() - INTERVAL '1 hour';
```

### **Verificar Último Número:**
```sql
SELECT MAX(numero_documento) 
FROM pdv 
WHERE empresa_id = 'uuid-empresa' 
AND modelo_documento = 55;
```

### **Regenerar Código:**
```typescript
// No frontend - console do navegador
const novocodigo = await gerarCodigoNumericoUnico(
  'uuid-empresa',
  1, // numero
  1, // serie
  2, // ambiente (homologacao)
  55 // modelo NFe
);
```

---

## 🔥 **EMERGÊNCIA 8: VPS Sem Espaço/Memória**

### **Verificar Recursos:**
```bash
# Via SSH Manager
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "df -h && free -h"}'
```

### **Limpar Logs:**
```bash
# Limpar logs antigos
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "find /var/log -name \"*.log\" -mtime +7 -delete"}'
```

### **Verificar Processos:**
```bash
curl -X POST http://localhost:5000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "ps aux --sort=-%mem | head -10"}'
```

---

## 🔥 **EMERGÊNCIA 9: Deploy Netlify Falha**

### **Verificar Build Local:**
```bash
cd "C:\Users\Usuario\Desktop\projetos\nexo-pedidos"
npm run build
```

### **Verificar Variáveis de Ambiente:**
```bash
# No Netlify Dashboard
VITE_SUPABASE_URL=https://xsrirnfwsjeovekwtluz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **Logs do Netlify:**
- Acessar: https://app.netlify.com/sites/seu-site/deploys
- Verificar logs de build

---

## 🔥 **EMERGÊNCIA 10: Tudo Parou de Funcionar**

### **Checklist Completo:**

#### **1. Verificar APIs:**
```bash
# Status API NFe
curl https://apinfe.nexopdv.com/api/status

# Status Supabase
curl https://xsrirnfwsjeovekwtluz.supabase.co/rest/v1/
```

#### **2. Verificar VPS:**
```bash
# SSH direto
ssh root@157.180.88.133

# Status geral
systemctl status nginx php8.3-fpm
df -h
free -h
```

#### **3. Verificar Frontend:**
```bash
cd "C:\Users\Usuario\Desktop\projetos\nexo-pedidos"
npm run dev
```

#### **4. Verificar SSH Manager:**
```bash
cd ssh
start.bat
curl http://localhost:5000/api/status
```

#### **5. Verificar Logs:**
```bash
# Logs da API
curl http://localhost:5000/api/logs/nginx?lines=20

# Logs do sistema
tail -20 /var/log/syslog
```

---

## 📞 **CONTATOS DE EMERGÊNCIA**

### **URLs Críticas:**
- **API NFe:** https://apinfe.nexopdv.com/api/status
- **Documentação:** https://nexodocapi.netlify.app/
- **Supabase:** https://supabase.com/dashboard/project/xsrirnfwsjeovekwtluz
- **SSH Manager:** http://localhost:5000/api/status

### **Credenciais VPS:**
```
IP: 157.180.88.133
User: root
Password: Gbu2yD76U38bUU
```

### **Arquivos Críticos:**
```
Frontend: src/pages/dashboard/NfePage.tsx
API: /var/www/nfe-api/public/index.php
Logs: /var/log/nginx/nfe-api.error.log
SSH: C:\Users\Usuario\Desktop\projetos\nexo-pedidos\ssh\
```

---

## 🚨 **COMANDOS DE ÚLTIMO RECURSO**

### **Reiniciar Tudo na VPS:**
```bash
systemctl restart nginx php8.3-fpm mysql
reboot
```

### **Backup de Emergência:**
```bash
# Backup do banco
pg_dump -h xsrirnfwsjeovekwtluz.supabase.co -U postgres > backup.sql

# Backup da API
tar -czf api-backup.tar.gz /var/www/nfe-api/
```

### **Restaurar do Zero:**
```bash
# Frontend
cd "C:\Users\Usuario\Desktop\projetos\nexo-pedidos"
git pull origin main
npm install
npm run dev

# SSH Manager
cd ssh
setup.bat
start.bat
```

---

**⚡ MANTENHA ESTE DOCUMENTO SEMPRE ACESSÍVEL!**

**🚨 Em caso de emergência crítica:**
1. **Verificar status das APIs**
2. **Acessar VPS via SSH**
3. **Verificar logs em tempo real**
4. **Reiniciar serviços se necessário**
5. **Documentar o problema e solução**

**📅 Criado:** 01/06/2025
**🔧 Versão:** 1.0
**👨‍💻 Responsável:** IA Assistant + Emanuel Luis
