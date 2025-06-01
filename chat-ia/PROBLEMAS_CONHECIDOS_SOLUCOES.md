# 🚨 PROBLEMAS CONHECIDOS E SOLUÇÕES

## 📋 **RESUMO**

Este documento lista todos os problemas conhecidos do sistema NFe/NFC-e e suas soluções testadas e aprovadas.

---

## ❌ **PROBLEMA 1: HTTP 500 na API NFe**

### **Sintomas:**
- Erro HTTP 500 ao chamar `/api/nfe-completa`
- Resposta JSON genérica: `{"success": false, "error": "Dados JSON inválidos ou vazios"}`
- Frontend mostra "Erro interno do servidor"

### **Causas Identificadas:**

#### **1.1 UUID Inválido da Empresa**
```
ERRO: invalid input syntax for type uuid: "test-id"
```
**Solução:**
- Verificar se `empresa.id` é um UUID válido do Supabase
- Exemplo correto: `550e8400-e29b-41d4-a716-446655440000`

#### **1.2 Campos Obrigatórios Faltando**
```
ERRO: Undefined array key "inscricao_estadual"
ERRO: Undefined array key "address"
```
**Solução:**
- Incluir `inscricao_estadual` nos dados da empresa
- Usar `endereco` em vez de `address` para cliente

#### **1.3 Erro na Biblioteca NFePHP**
```
ERRO: Call to a member function getElementsByTagName() on null
```
**Solução:**
- Verificar estrutura completa do payload
- Validar todos os campos obrigatórios antes do envio

### **Debug:**
```bash
# Via SSH Manager
curl http://localhost:5000/api/logs/nginx?lines=20

# Via SSH direto
tail -20 /var/log/nginx/nfe-api.error.log
```

### **Payload Correto:**
```json
{
  "ambiente": 2,
  "empresa": {
    "id": "uuid-valido-do-supabase",
    "cnpj": "24.163.237/0001-51",
    "inscricao_estadual": "123456789",
    "name": "EMPRESA TESTE LTDA"
  },
  "cliente": {
    "documento": "12345678901",
    "name": "Cliente Teste",
    "endereco": "Rua Teste, 123"
  }
}
```

---

## 🔐 **PROBLEMA 2: Certificado Digital**

### **Sintomas:**
- Erro: "Certificado digital não configurado"
- Status: `nao_configurado` ou `vencido`
- NFe não é assinada digitalmente

### **Causas e Soluções:**

#### **2.1 Certificado Não Enviado para Supabase**
**Verificar:**
```sql
SELECT certificado_digital_path, certificado_digital_status 
FROM empresas 
WHERE id = 'uuid-da-empresa';
```

**Solução:**
- Upload do certificado .pfx via interface
- Verificar bucket `certificadodigital` no Supabase Storage

#### **2.2 Certificado Vencido**
**Verificar data de validade:**
```bash
openssl pkcs12 -in certificado.pfx -nokeys -passin pass:senha | openssl x509 -noout -dates
```

**Solução:**
- Renovar certificado digital
- Atualizar status na tabela `empresas`

#### **2.3 Senha Incorreta**
**Erro:** `Unable to load certificate`

**Solução:**
- Verificar senha do certificado
- Testar certificado localmente antes do upload

---

## 🔢 **PROBLEMA 3: Numeração NFe**

### **Sintomas:**
- Números duplicados
- Erro: "Número já utilizado"
- Conflitos na tabela `nfe_numero_controle`

### **Soluções:**

#### **3.1 Limpeza da Tabela de Controle**
```sql
-- Verificar registros
SELECT * FROM nfe_numero_controle 
WHERE empresa_id = 'uuid-empresa' 
ORDER BY codigo_numerico DESC;

-- Limpar registros órfãos
DELETE FROM nfe_numero_controle 
WHERE status = 'reservado' 
AND created_at < NOW() - INTERVAL '1 hour';
```

#### **3.2 Regenerar Código Numérico**
```typescript
// No frontend - função gerarCodigoNumericoUnico()
const novocodigo = await gerarCodigoNumericoUnico(
  empresaId,
  numeroNFe,
  serie,
  ambiente,
  modelo
);
```

#### **3.3 Verificar Último Número Usado**
```sql
SELECT MAX(numero_documento) 
FROM pdv 
WHERE empresa_id = 'uuid-empresa' 
AND modelo_documento = 55;
```

---

## 🌐 **PROBLEMA 4: Conectividade SEFAZ**

### **Sintomas:**
- Timeout na conexão com SEFAZ
- Erro: "Serviço indisponível"
- Status diferente de "100" (autorizada)

### **Soluções:**

#### **4.1 Verificar Status SEFAZ**
```bash
# Testar conectividade
curl -s -o /dev/null -w "%{http_code}" https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx
```

#### **4.2 Configurar Timeout**
```php
// No arquivo .env da API
NFE_TIMEOUT=120
```

#### **4.3 Verificar Ambiente**
- **Homologação:** Sempre disponível para testes
- **Produção:** Verificar horários de manutenção SEFAZ

---

## 💾 **PROBLEMA 5: Banco de Dados Supabase**

### **Sintomas:**
- Erro: "Row Level Security"
- Dados não salvos após emissão
- Timeout na conexão

### **Soluções:**

#### **5.1 RLS (Row Level Security)**
```sql
-- Verificar políticas
SELECT * FROM pg_policies WHERE tablename = 'pdv';

-- Criar política se necessário
CREATE POLICY "Users can access own company data" ON pdv
FOR ALL USING (empresa_id IN (
  SELECT empresa_id FROM usuarios WHERE id = auth.uid()
));
```

#### **5.2 Verificar Conexão**
```typescript
// Testar conexão Supabase
const { data, error } = await supabase
  .from('empresas')
  .select('id')
  .limit(1);
```

#### **5.3 Verificar Chaves de API**
```typescript
// src/lib/supabase.ts
const supabaseUrl = 'https://xsrirnfwsjeovekwtluz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

---

## 🔧 **PROBLEMA 6: SSH Manager**

### **Sintomas:**
- Erro: "Connection refused"
- Timeout na conexão SSH
- Servidor não inicia

### **Soluções:**

#### **6.1 Verificar Credenciais**
```env
# ssh/.env
VPS_HOST=157.180.88.133
VPS_USER=root
VPS_PASSWORD=Gbu2yD76U38bUU
```

#### **6.2 Reinstalar Dependências**
```bash
cd ssh
rmdir /s venv
setup.bat
```

#### **6.3 Verificar Porta**
```bash
netstat -an | findstr :5000
```

#### **6.4 Firewall VPS**
```bash
# Na VPS
ufw status
ufw allow 22/tcp
```

---

## 📱 **PROBLEMA 7: Frontend React**

### **Sintomas:**
- Erro de compilação TypeScript
- Componentes não renderizam
- Hooks não funcionam

### **Soluções:**

#### **7.1 Limpar Cache**
```bash
rm -rf node_modules
rm package-lock.json
npm install
```

#### **7.2 Verificar Imports**
```typescript
// Verificar se todos os imports estão corretos
import { useApiLogs } from '../../hooks/useApiLogs';
```

#### **7.3 Verificar Tipos TypeScript**
```bash
npx tsc --noEmit
```

---

## 🚀 **PROBLEMA 8: Deploy e Produção**

### **Sintomas:**
- Build falha no Netlify
- API não responde em produção
- Certificados não funcionam

### **Soluções:**

#### **8.1 Build Netlify**
```bash
# Verificar build local
npm run build

# Verificar variáveis de ambiente
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

#### **8.2 API Produção**
```bash
# Verificar status da VPS
systemctl status nginx php8.3-fpm

# Verificar logs
tail -f /var/log/nginx/nfe-api.error.log
```

#### **8.3 Certificados Produção**
- Usar certificados A1 válidos
- Verificar data de validade
- Testar em homologação primeiro

---

## 📋 **CHECKLIST DE DEBUG**

### **Quando algo não funciona:**

1. **✅ Verificar status da API:**
   ```bash
   curl https://apinfe.nexopdv.com/api/status
   ```

2. **✅ Verificar logs:**
   ```bash
   curl http://localhost:5000/api/logs/nginx?lines=20
   ```

3. **✅ Testar SSH Manager:**
   ```bash
   curl http://localhost:5000/api/status
   ```

4. **✅ Verificar Supabase:**
   ```typescript
   const { data, error } = await supabase.from('empresas').select('*').limit(1);
   ```

5. **✅ Verificar certificado:**
   ```sql
   SELECT certificado_digital_status FROM empresas WHERE id = 'uuid';
   ```

6. **✅ Verificar payload:**
   - UUID válido da empresa
   - Todos os campos obrigatórios
   - Estrutura correta do JSON

---

## 📞 **CONTATOS DE EMERGÊNCIA**

### **Recursos Disponíveis:**
- **SSH Manager:** `http://localhost:5000`
- **Documentação API:** `https://nexodocapi.netlify.app/`
- **Supabase Dashboard:** `https://supabase.com/dashboard`
- **Logs VPS:** `/var/log/nginx/nfe-api.error.log`

### **Comandos de Emergência:**
```bash
# Reiniciar serviços VPS
systemctl restart nginx php8.3-fpm

# Verificar espaço em disco
df -h

# Verificar memória
free -h

# Verificar processos
ps aux | grep -E "(nginx|php)"
```

---

**🎯 MANTENHA ESTE DOCUMENTO ATUALIZADO COM NOVOS PROBLEMAS E SOLUÇÕES!**

**📅 Última atualização:** 01/06/2025
**🔧 Versão:** 1.0
**👨‍💻 Responsável:** IA Assistant + Emanuel Luis
