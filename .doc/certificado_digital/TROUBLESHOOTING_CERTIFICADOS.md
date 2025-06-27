# 🔧 TROUBLESHOOTING: Certificados Digitais + OpenSSL 3.0

## 🚨 **PROBLEMAS COMUNS E SOLUÇÕES**

### **1. Erro: "unsupported algorithm RC2-40-CBC"**

#### **Sintomas:**
```
error:0308010C:digital envelope routines::unsupported
PKCS7 Encrypted data: pbeWithSHA1And40BitRC2-CBC, Iteration 1024
```

#### **Diagnóstico:**
```bash
# Verificar versão do OpenSSL
openssl version -a

# Testar certificado diretamente
openssl pkcs12 -info -in certificado.pfx -noout -passin pass:SENHA
```

#### **Solução:**
```bash
# Verificar se provedor legacy está ativo
openssl list -providers

# Se não aparecer "legacy", aplicar a solução:
sudo cp /etc/ssl/openssl.cnf /etc/ssl/openssl.cnf.backup
sudo sed -i 's/^# activate = 1/activate = 1/' /etc/ssl/openssl.cnf
sudo sed -i '/\[provider_sect\]/a legacy = legacy_sect' /etc/ssl/openssl.cnf
echo -e "\n[legacy_sect]\nactivate = 1" | sudo tee -a /etc/ssl/openssl.cnf
sudo systemctl restart php8.3-fpm
```

---

### **2. Erro: "Permission denied" no storage**

#### **Sintomas:**
```
Erro ao salvar certificado
file_put_contents(): failed to open stream: Permission denied
```

#### **Diagnóstico:**
```bash
# Verificar permissões
ls -la backend/storage/certificados/

# Verificar proprietário
stat backend/storage/certificados/
```

#### **Solução:**
```bash
# Corrigir proprietário e permissões
sudo chown -R www-data:www-data backend/storage/
sudo chmod 755 backend/storage/
sudo chmod 700 backend/storage/certificados/
```

---

### **3. Erro: "Column 'certificado_digital_local' not found"**

#### **Sintomas:**
```
Could not find the 'certificado_digital_local' column of 'empresas' in the schema cache
```

#### **Solução SQL:**
```sql
-- Conectar no Supabase e executar:
ALTER TABLE empresas ADD COLUMN certificado_digital_local BOOLEAN DEFAULT FALSE;

-- Verificar se foi criada:
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'empresas' AND column_name = 'certificado_digital_local';
```

---

### **4. Certificado não remove (fica na interface)**

#### **Sintomas:**
- Mensagem "Certificado removido com sucesso"
- Certificado continua aparecendo na interface

#### **Diagnóstico:**
```bash
# Verificar se arquivo ainda existe
ls -la backend/storage/certificados/empresa_*.pfx

# Verificar logs do PHP
sudo tail -f /var/log/php8.3-fpm.log
```

#### **Solução:**
- Verificar se função `removeCertificateLocal` está sendo chamada
- Verificar se empresa_id está correto
- Limpar cache do navegador

---

## 🧪 **COMANDOS DE TESTE**

### **Teste 1: Verificar OpenSSL**
```bash
# Informações do OpenSSL
openssl version -a

# Listar provedores ativos
openssl list -providers

# Deve mostrar:
# Providers:
#   default
#   legacy
```

### **Teste 2: Testar Certificado Manualmente**
```bash
# Testar leitura do certificado
openssl pkcs12 -info -in certificado.pfx -noout -passin pass:SENHA

# Extrair informações do certificado
openssl pkcs12 -in certificado.pfx -passin pass:SENHA -nokeys -clcerts | \
openssl x509 -noout -subject -dates
```

### **Teste 3: Testar Endpoint PHP**
```bash
# Teste básico do OpenSSL no PHP
curl -s "http://SEU_DOMINIO/backend/public/test-openssl.php" | jq .

# Teste com certificado real
curl -X POST "http://SEU_DOMINIO/backend/public/test-certificado-real.php"

# Upload completo
curl -X POST "http://SEU_DOMINIO/backend/public/upload-certificado.php" \
  -F "certificado=@certificado.pfx" \
  -F "senha=SENHA" \
  -F "empresa_id=UUID"
```

### **Teste 4: Verificar Permissões**
```bash
# Testar escrita como www-data
sudo -u www-data touch backend/storage/certificados/teste.txt
sudo -u www-data rm backend/storage/certificados/teste.txt

# Verificar estrutura completa
find backend/storage -type d -exec ls -ld {} \;
```

---

## 📊 **MONITORAMENTO**

### **Logs Importantes:**
```bash
# Logs do PHP-FPM
sudo tail -f /var/log/php8.3-fpm.log

# Logs do Nginx
sudo tail -f /var/log/nginx/nexo-error.log

# Logs do sistema
sudo journalctl -u php8.3-fpm -f
```

### **Verificações de Saúde:**
```bash
# Status dos serviços
sudo systemctl status php8.3-fpm nginx

# Verificar configuração OpenSSL
openssl version -d
cat /etc/ssl/openssl.cnf | grep -A 10 "\[provider_sect\]"

# Verificar storage
ls -la backend/storage/certificados/
du -sh backend/storage/certificados/
```

---

## 🔄 **PROCEDIMENTO DE ROLLBACK**

### **Se algo der errado:**

```bash
# 1. Restaurar configuração OpenSSL original
sudo cp /etc/ssl/openssl.cnf.backup /etc/ssl/openssl.cnf

# 2. Reiniciar serviços
sudo systemctl restart php8.3-fpm nginx

# 3. Verificar se sistema voltou ao normal
openssl list -providers

# 4. Remover certificados problemáticos
sudo rm -f backend/storage/certificados/empresa_*.pfx
sudo rm -f backend/storage/certificados/empresa_*.json
```

---

## 📋 **CHECKLIST DE VERIFICAÇÃO**

### **Antes de implementar:**
- [ ] Fazer backup da configuração OpenSSL
- [ ] Verificar versão do OpenSSL (deve ser 3.x)
- [ ] Confirmar que é um certificado ICP-Brasil
- [ ] Testar senha do certificado

### **Após implementar:**
- [ ] Verificar provedores OpenSSL ativos
- [ ] Testar upload de certificado
- [ ] Testar remoção de certificado
- [ ] Verificar permissões do storage
- [ ] Confirmar que coluna do banco foi criada

### **Validação final:**
- [ ] Upload funciona via interface web
- [ ] Remoção funciona via interface web
- [ ] Certificado aparece corretamente na interface
- [ ] Logs não mostram erros
- [ ] Performance não foi impactada

---

## 🆘 **CONTATOS DE SUPORTE**

### **Documentação Oficial:**
- OpenSSL 3.0: https://wiki.openssl.org/index.php/OpenSSL_3.0
- ICP-Brasil: https://www.iti.gov.br/
- PHP OpenSSL: https://www.php.net/manual/en/ref.openssl.php

### **Comandos de Emergência:**
```bash
# Parar tudo e investigar
sudo systemctl stop php8.3-fpm nginx

# Verificar logs detalhados
sudo journalctl -xe

# Restaurar backup
sudo cp /etc/ssl/openssl.cnf.backup /etc/ssl/openssl.cnf

# Reiniciar tudo
sudo systemctl start php8.3-fpm nginx
```

---

**Última atualização:** 14/06/2025  
**Versão do documento:** 1.0  
**Status:** ✅ TESTADO E VALIDADO
