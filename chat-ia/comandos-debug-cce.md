# Comandos de Debug para CCe

## 🔍 **Comandos Essenciais para Debug**

### **1. Monitorar Logs em Tempo Real**
```bash
# Monitorar todos os logs de CCe
tail -f /var/log/nginx/error.log | grep -E "CCe|cce_nfe|Salvando na tabela"

# Monitorar logs específicos de erro
tail -f /var/log/nginx/error.log | grep -E "ERRO CCe|❌ CCe"

# Monitorar logs de sucesso
tail -f /var/log/nginx/error.log | grep -E "✅ CCe|💾 CCe"
```

### **2. Verificar Logs Recentes**
```bash
# Ver últimos 50 logs relacionados a CCe
tail -50 /var/log/nginx/error.log | grep -A20 -B5 "CCe.*Sequência\|Salvando na tabela\|DEBUG CCe"

# Ver logs de uma CCe específica
tail -100 /var/log/nginx/error.log | grep -A30 -B5 "CCe INICIADA.*Sequência: X"
```

### **3. Verificar Estado do Banco**
```sql
-- Verificar se a tabela existe
SELECT table_name, table_schema FROM information_schema.tables WHERE table_name = 'cce_nfe';

-- Verificar estrutura da tabela
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'cce_nfe' ORDER BY ordinal_position;

-- Verificar se há CCe gravadas
SELECT COUNT(*) as total FROM cce_nfe;

-- Verificar CCe de uma NFe específica
SELECT * FROM cce_nfe WHERE chave_nfe = '35250624163237000151550010000000201995318594' ORDER BY sequencia;

-- Verificar campo de relação na tabela pdv
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pdv' AND column_name = 'cce_nfe_id';
```

### **4. Testar Inserção Manual**
```sql
-- Teste de inserção simples
INSERT INTO cce_nfe (empresa_id, chave_nfe, numero_nfe, sequencia, correcao, protocolo, status, codigo_status, descricao_status, ambiente, xml_path, xml_nome) 
VALUES ('acd26a4f-7220-405e-9c96-faffb7e6480e', '35250624163237000151550010000000201995318594', '20', 999, 'Teste manual', '123456789', 'aceita', 135, 'Teste', 'homologacao', '/teste', 'teste.xml') 
RETURNING id;

-- Verificar se foi inserido
SELECT * FROM cce_nfe WHERE sequencia = 999;

-- Limpar teste
DELETE FROM cce_nfe WHERE sequencia = 999;
```

### **5. Build do Frontend**
```bash
# Recompilar frontend após alterações
cd /root/nexo/nexo-pedidos && npm run build
```

### **6. Verificar Processos**
```bash
# Verificar se PHP-FPM está rodando
ps aux | grep php-fpm

# Verificar se Nginx está rodando
ps aux | grep nginx

# Verificar logs de erro do PHP
tail -f /var/log/php7.4-fpm.log
```

## 🎯 **Sequência de Debug Recomendada**

### **Passo 1: Preparar Monitoramento**
```bash
# Terminal 1: Monitorar logs
tail -f /var/log/nginx/error.log | grep -E "CCe|cce_nfe"
```

### **Passo 2: Fazer CCe de Teste**
1. Abrir NFe autorizada no frontend
2. Ir para seção "Autorização"
3. Escrever texto de correção (mínimo 15 caracteres)
4. Clicar em "Enviar Carta de Correção"

### **Passo 3: Analisar Logs**
Verificar se aparecem na sequência:
```
📝 CCe INICIADA - Empresa: ..., Chave: ..., Sequência: X
🚀 CCe - Iniciando chamada sefazCCe...
📝 CCe - Resposta SEFAZ recebida: X bytes
✅ CCe - Chamada sefazCCe concluída com sucesso
💾 CCe - Salvando na tabela cce_nfe...
✅ CCe salva na tabela cce_nfe - PDV ID: ...
```

### **Passo 4: Verificar Banco**
```sql
-- Verificar se CCe foi gravada
SELECT COUNT(*) as total, MAX(sequencia) as ultima_sequencia 
FROM cce_nfe 
WHERE chave_nfe = 'CHAVE_DA_NFE_TESTADA';
```

## 🚨 **Logs de Erro Importantes**

### **Erros Conhecidos**
```bash
# Erro de função não definida (RESOLVIDO)
"carregarCCesDaTabela is not defined"

# Erro de PDF (CONHECIDO - não impede CCe)
"POST http://localhost/backend/public/gerar-pdf-cce.php 500"

# Erro de tabela não encontrada
"Cannot POST /rest/v1/cce_nfe"

# Erro de permissão
"permission denied for table cce_nfe"
```

### **Logs de Sucesso Esperados**
```bash
# CCe enviada com sucesso
"CCe enviada com sucesso: {success: true"

# XML salvo
"✅ XML completo de CCe salvo:"

# Banco atualizado
"✅ CCe salva na tabela cce_nfe"
"✅ Relação PDV-CCe criada com sucesso"
```

## 📊 **Status Atual dos Componentes**

### **✅ Funcionando**
- Tabela `cce_nfe` criada e desprotegida
- Campo `cce_nfe_id` na tabela `pdv`
- Frontend sem erros de função
- Envio para SEFAZ funcionando
- XML sendo salvo no sistema

### **❌ Não Funcionando**
- Gravação na tabela `cce_nfe`
- Processo falha silenciosamente após SEFAZ

### **⚠️ Problemas Conhecidos**
- PDF da CCe com erro 500 (não impede funcionamento)
- Logs param na linha "Parâmetros: Chave=..."

## 🔧 **Arquivos Importantes**

### **Backend**
- `backend/public/carta-correcao.php` - Processamento principal da CCe
- `backend/public/gerar-pdf-cce.php` - Geração de PDF (com erro)
- `backend/public/listar-cce.php` - Listagem de CCe (não usado atualmente)

### **Frontend**
- `src/pages/dashboard/NfePage.tsx` - Interface principal de NFe
- `src/components/nfe/AutorizacaoSection.tsx` - Seção de CCe

### **Banco de Dados**
- Tabela `cce_nfe` - Armazenamento das CCe
- Tabela `pdv` - NFe com campo `cce_nfe_id`

## 🎯 **Próximo Debug**

**Execute uma nova CCe e verifique se aparecem os logs:**
1. `🚀 CCe - Iniciando chamada sefazCCe...`
2. `📝 CCe - Resposta SEFAZ recebida: X bytes`
3. `✅ CCe - Chamada sefazCCe concluída com sucesso`

**Se não aparecerem, o problema está na biblioteca sped-nfe.**
**Se aparecerem, o problema está no processamento da resposta.**
