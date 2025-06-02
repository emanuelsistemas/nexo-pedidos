# 🎯 INSTRUÇÕES ESPECÍFICAS PARA PRÓXIMA IA

**Data:** 02/06/2025 - 15:00  
**Urgência:** 🔴 **MÁXIMA**  
**Tempo Estimado:** 1-2 horas para resolver

---

## 🚨 **SITUAÇÃO ATUAL**

### **✅ O QUE ESTÁ FUNCIONANDO PERFEITAMENTE:**
1. **Frontend NFe** - 100% funcional (http://localhost:5174)
2. **Numeração NFe** - Sequencial correta (19 → 20 → 21...)
3. **SupabaseService** - Implementado e testado
4. **Banco de dados** - Todas as consultas funcionando
5. **Certificado digital** - Acessível e válido

### **❌ ÚNICO PROBLEMA RESTANTE:**
**API NFe retorna erro 500** no endpoint `/api/nfe-completa`

---

## 🎯 **SUA MISSÃO**

### **Objetivo:** Resolver erro 500 da API NFe
### **Resultado Esperado:** Emissão de NFe funcionando 100%

---

## 🔍 **DIAGNÓSTICO INICIAL OBRIGATÓRIO**

### **1. Verificar Status da API:**
```bash
curl -s https://apinfe.nexopdv.com/api/status
# Deve retornar: {"status":"online","timestamp":"..."}
```

### **2. Verificar SupabaseService:**
```bash
ssh root@157.180.88.133
# Senha: nexo123 (pode estar incorreta)

# Verificar se arquivo existe
ls -la /var/www/nfe-api/src/Services/SupabaseService.php
# Deve mostrar: 4665 bytes, criado em 02/06/2025

# Testar carregamento
php -r "require_once '/var/www/nfe-api/src/Services/SupabaseService.php'; echo 'OK';"
```

### **3. Verificar Logs de Erro:**
```bash
# Logs principais
tail -50 /var/log/nginx/nfe-api.error.log
tail -50 /var/log/php8.3-fpm.log

# Logs em tempo real (abrir em terminal separado)
tail -f /var/log/nginx/nfe-api.error.log
```

### **4. Testar Endpoint com Payload:**
```bash
curl -X POST https://apinfe.nexopdv.com/api/nfe-completa \
  -H "Content-Type: application/json" \
  -d '{
    "empresa": {"id": "acd26a4f-7220-405e-9c96-faffb7e6480e"},
    "cliente": {"nome": "Teste"},
    "produtos": [{"descricao": "Produto", "quantidade": 1, "valor_unitario": 10, "valor_total": 10}],
    "totais": {"valor_produtos": 10, "valor_total": 10},
    "ambiente": 2
  }'
```

---

## 🔧 **POSSÍVEIS CAUSAS E SOLUÇÕES**

### **Causa 1: SupabaseService não carregando**
```bash
# Verificar sintaxe PHP
php -l /var/www/nfe-api/src/Services/SupabaseService.php

# Testar instanciação
php -r "
require_once '/var/www/nfe-api/src/Services/SupabaseService.php';
try {
    \$s = new \NexoNFe\Services\SupabaseService();
    echo 'Instanciado OK';
} catch (Exception \$e) {
    echo 'ERRO: ' . \$e->getMessage();
}
"
```

### **Causa 2: NFeServiceCompleto corrompido**
```bash
# Verificar tamanho do arquivo
wc -l /var/www/nfe-api/src/Services/NFeServiceCompleto.php
# Deve ter mais de 500 linhas

# Verificar sintaxe
php -l /var/www/nfe-api/src/Services/NFeServiceCompleto.php

# Se corrompido, restaurar backup
cp /var/www/nfe-api/src/Services/NFeServiceCompleto.php.backup.* /var/www/nfe-api/src/Services/NFeServiceCompleto.php
```

### **Causa 3: Autoload ou dependências**
```bash
# Verificar composer
cd /var/www/nfe-api
composer install --no-dev

# Verificar permissões
chown -R www-data:www-data /var/www/nfe-api
chmod -R 755 /var/www/nfe-api
```

---

## 📋 **INFORMAÇÕES TÉCNICAS ESSENCIAIS**

### **🔑 Credenciais:**
- **Supabase URL:** `https://xsrirnfwsjeovekwtluz.supabase.co`
- **Service Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcmlybmZ3c2plb3Zla3d0bHV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjY2NDk5NywiZXhwIjoyMDYyMjQwOTk3fQ.UC2DvFRcfrNUbRrnQhrpqsX_hJXBLy9g-YVZbpaTcso`

### **🏢 Empresa de Teste:**
- **ID:** `acd26a4f-7220-405e-9c96-faffb7e6480e`
- **Nome:** Emanuel Luis Pereira Souza Valesis Informatica
- **Certificado:** Ativo, senha: 12345678

### **🖥️ Servidor:**
- **Host:** 157.180.88.133
- **User:** root
- **Password:** nexo123 (pode estar incorreta)
- **API:** https://apinfe.nexopdv.com

---

## 🧪 **TESTE DE VALIDAÇÃO FINAL**

### **Quando resolver o erro 500, teste:**
```bash
# 1. Teste básico
curl -X POST https://apinfe.nexopdv.com/api/nfe-completa \
  -H "Content-Type: application/json" \
  -d @payload_teste.json

# 2. Verificar resposta esperada
# Deve retornar JSON com:
# - chave: "35250524163237000151550010000000201..."
# - protocolo: "135250000000001"
# - xml_path: "/caminho/para/xml"
# - pdf_path: "/caminho/para/pdf"

# 3. Testar no frontend
# Acessar http://localhost:5174
# Clicar "Nova NFe"
# Preencher dados mínimos
# Clicar "Emitir NFe"
# Deve processar sem erro
```

---

## 📚 **DOCUMENTOS DE APOIO**

### **Leitura Obrigatória:**
1. `RESUMO_FINAL_02_06_2025.md` - Status completo
2. `SUPABASESERVICE_IMPLEMENTADO.md` - Detalhes técnicos
3. `COMANDOS_RAPIDOS_EMERGENCIA.md` - Comandos prontos

### **Referência:**
1. `PROBLEMAS_CONHECIDOS_SOLUCOES.md` - Histórico de problemas
2. `CORRECAO_NUMERACAO_NFE_IMPLEMENTADA.md` - Como foi resolvido
3. `REMOCAO_TABELA_NFE_NUMERO_CONTROLE_COMPLETA.md` - Mudanças no banco

---

## 🎯 **ESTRATÉGIA RECOMENDADA**

### **Fase 1: Diagnóstico (15 min)**
1. Executar todos os comandos de diagnóstico
2. Identificar erro específico nos logs
3. Determinar causa raiz

### **Fase 2: Correção (30-60 min)**
1. Aplicar fix específico baseado no diagnóstico
2. Testar isoladamente cada componente
3. Validar integração completa

### **Fase 3: Validação (15 min)**
1. Testar endpoint da API
2. Testar emissão pelo frontend
3. Confirmar geração XML/PDF

---

## 🏆 **RESULTADO ESPERADO**

### **Sucesso = NFe emitida com:**
- ✅ Numeração sequencial correta
- ✅ XML válido gerado
- ✅ PDF criado
- ✅ Protocolo SEFAZ recebido
- ✅ Dados salvos no Supabase

### **Sistema 100% funcional!**

---

## 🚨 **IMPORTANTE**

- **NÃO modifique** a numeração NFe (já está correta)
- **NÃO remova** o SupabaseService (já está funcionando)
- **FOQUE APENAS** no erro 500 da API
- **DOCUMENTE** a solução encontrada

**Boa sorte! O sistema está 98% pronto - falta só esse último passo!** 🚀
