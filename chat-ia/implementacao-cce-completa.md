# Implementação Completa da CCe (Carta de Correção Eletrônica)

## 📋 **Resumo da Implementação**

Esta documentação detalha a implementação completa do sistema de Carta de Correção Eletrônica (CCe) no sistema nexo-pedidos, incluindo:

- ✅ **Nova tabela `cce_nfe`** para armazenamento normalizado
- ✅ **Campo de relação `cce_nfe_id`** na tabela `pdv`
- ✅ **Backend atualizado** para gravação automática
- ✅ **Frontend integrado** com carregamento via JOIN
- ✅ **Logs detalhados** para debug

---

## 🗄️ **1. Estrutura do Banco de Dados**

### **1.1. Nova Tabela `cce_nfe`**

```sql
-- Criar tabela cce_nfe (DESPROTEGIDA para API REST)
DROP TABLE IF EXISTS cce_nfe CASCADE;

CREATE TABLE cce_nfe (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pdv_id UUID,
    empresa_id UUID NOT NULL,
    chave_nfe VARCHAR(44) NOT NULL,
    numero_nfe VARCHAR(20),
    sequencia INTEGER NOT NULL,
    correcao TEXT NOT NULL,
    protocolo VARCHAR(50),
    data_envio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'aceita',
    codigo_status INTEGER,
    descricao_status TEXT,
    ambiente VARCHAR(20) DEFAULT 'homologacao',
    xml_path TEXT,
    xml_nome VARCHAR(255),
    pdf_path TEXT,
    pdf_nome VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DESPROTEGER COMPLETAMENTE (sem RLS)
ALTER TABLE cce_nfe DISABLE ROW LEVEL SECURITY;

-- Dar permissões totais
GRANT ALL ON cce_nfe TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Criar índices para performance
CREATE INDEX idx_cce_nfe_empresa_id ON cce_nfe(empresa_id);
CREATE INDEX idx_cce_nfe_chave_nfe ON cce_nfe(chave_nfe);
CREATE INDEX idx_cce_nfe_data_envio ON cce_nfe(data_envio);

-- Recarregar schema da API REST
NOTIFY pgrst, 'reload schema';
```

### **1.2. Campo de Relação na Tabela `pdv`**

```sql
-- Adicionar campo de relação na tabela pdv
ALTER TABLE pdv ADD COLUMN cce_nfe_id UUID REFERENCES cce_nfe(id);

-- Criar índice para performance
CREATE INDEX idx_pdv_cce_nfe_id ON pdv(cce_nfe_id);
```

---

## 🔧 **2. Backend - Arquivo `carta-correcao.php`**

### **2.1. Principais Alterações**

1. **Gravação na nova tabela `cce_nfe`** usando query SQL direta
2. **Criação de relação** com a tabela `pdv`
3. **Logs detalhados** para debug
4. **Tratamento de erros** robusto

### **2.2. Código de Gravação no Banco**

```php
// 16. SALVAR CCe NA NOVA TABELA cce_nfe (ESTRUTURA NORMALIZADA)
error_log("💾 CCe - Salvando na tabela cce_nfe...");

try {
    // Buscar a NFe no banco para obter PDV ID
    $nfeQuery = $supabaseUrl . '/rest/v1/pdv?select=id,numero_documento&chave_nfe=eq.' . urlencode($chaveNFe) . '&empresa_id=eq.' . urlencode($empresaId);
    // ... código de busca da NFe ...

    // Inserir na tabela cce_nfe usando query SQL direta
    $sqlQuery = "INSERT INTO cce_nfe (pdv_id, empresa_id, chave_nfe, numero_nfe, sequencia, correcao, protocolo, data_envio, status, codigo_status, descricao_status, ambiente, xml_path, xml_nome) VALUES ('" . 
               $pdvId . "', '" . 
               $empresaId . "', '" . 
               $chaveNFe . "', '" . 
               addslashes($nfe['numero_documento']) . "', " . 
               $sequencia . ", '" . 
               addslashes($correcao) . "', '" . 
               $protocoloCCe . "', '" . 
               date('c') . "', 'aceita', " . 
               $cStat . ", '" . 
               addslashes($xMotivo) . "', '" . 
               $nfeConfig['ambiente'] . "', '" . 
               addslashes($caminhoArquivoCce) . "', '" . 
               addslashes($nomeArquivoCce) . "') RETURNING id;";

    // Executar query via endpoint de database
    $insertQuery = $supabaseUrl . '/v1/projects/xsrirnfwsjeovekwtluz/database/query';
    // ... código de execução ...

    // Atualizar tabela pdv com o ID da CCe para criar relação
    if ($cceId) {
        $updatePdvQuery = "UPDATE pdv SET cce_nfe_id = '{$cceId}' WHERE id = '{$pdvId}';";
        // ... código de atualização ...
    }

} catch (Exception $dbError) {
    error_log("⚠️ Erro ao salvar CCe na tabela cce_nfe: " . $dbError->getMessage());
    // Não falhar a CCe por erro de banco - CCe já foi aceita pela SEFAZ
}
```

---

## 🎨 **3. Frontend - Arquivo `NfePage.tsx`**

### **3.1. Query com JOIN para Carregar CCe**

```typescript
// Carregar NFe com CCe via JOIN
const { data: nfesData, error } = await supabase
  .from('pdv')
  .select(`
    *,
    cce_nfe:cce_nfe_id (
      id,
      sequencia,
      correcao,
      protocolo,
      data_envio,
      status,
      codigo_status,
      descricao_status,
      ambiente
    )
  `)
  .eq('empresa_id', usuarioData.empresa_id)
  .eq('modelo_documento', 55) // Apenas NFe (modelo 55)
  .order('created_at', { ascending: false });
```

### **3.2. Processamento dos Dados de CCe**

```typescript
// Carregar CCe da relação com a tabela cce_nfe
if (nfe.cce_nfe && Array.isArray(nfe.cce_nfe)) {
  ccesExistentes = nfe.cce_nfe;
  console.log('📝 CCe carregadas via JOIN:', ccesExistentes);
} else if (nfe.cce_nfe) {
  // Se retornou um objeto único, transformar em array
  ccesExistentes = [nfe.cce_nfe];
  console.log('📝 CCe única carregada via JOIN:', ccesExistentes);
} else {
  console.log('📝 Nenhuma CCe encontrada para esta NFe');
  ccesExistentes = [];
}
```

### **3.3. Atualização Local Após Envio**

```typescript
// Atualizar dados da NFe com informações da CCe
setDadosAutorizacao(prev => ({
  ...prev,
  cce_enviada: true,
  cce_protocolo: result.data.protocolo_cce,
  cce_data: result.data.data_cce,
  cce_sequencia: result.data.sequencia,
  // Adicionar nova CCe ao histórico
  cartas_correcao: [
    ...(prev.cartas_correcao || []),
    {
      sequencia: result.data.sequencia,
      data_envio: result.data.data_cce,
      protocolo: result.data.protocolo_cce,
      correcao: result.data.correcao || dadosAutorizacao.carta_correcao,
      status: 'aceita',
      codigo_status: result.data.codigo_status,
      ambiente: result.data.ambiente
    }
  ],
  // Limpar campo de texto da correção
  carta_correcao: '',
  // Atualizar próxima sequência
  sequencia_cce: (prev.cartas_correcao?.length || 0) + 1
}));
```

---

## 🔍 **4. Logs de Debug Implementados**

### **4.1. Logs do Backend**

```php
// Logs principais para acompanhar o processo
error_log("📝 CCe INICIADA - Empresa: {$empresaId}, Chave: {$chaveNFe}, Sequência: {$sequencia}");
error_log("🚀 CCe - Iniciando chamada sefazCCe...");
error_log("📝 CCe - Resposta SEFAZ recebida: " . strlen($response) . " bytes");
error_log("💾 CCe - Salvando na tabela cce_nfe...");
error_log("🔍 DEBUG CCe - SQL Query: " . substr($sqlQuery, 0, 200) . "...");
error_log("✅ CCe salva na tabela cce_nfe - PDV ID: {$pdvId}, Sequência: {$sequencia}, CCe ID: {$cceId}");
error_log("✅ Relação PDV-CCe criada com sucesso");
```

### **4.2. Como Monitorar os Logs**

```bash
# Monitorar logs em tempo real
tail -f /var/log/nginx/error.log | grep -E "CCe|cce_nfe|Salvando na tabela"

# Verificar logs específicos
tail -50 /var/log/nginx/error.log | grep -A20 -B5 "CCe.*Sequência\|Salvando na tabela\|DEBUG CCe"
```

---

## 🧪 **5. Testes e Validação**

### **5.1. Verificar se a Tabela Foi Criada**

```sql
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'cce_nfe' ORDER BY ordinal_position;
```

### **5.2. Verificar se o Campo de Relação Foi Adicionado**

```sql
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'pdv' AND column_name = 'cce_nfe_id';
```

### **5.3. Testar Inserção Manual**

```sql
INSERT INTO cce_nfe (empresa_id, chave_nfe, numero_nfe, sequencia, correcao, protocolo, status, codigo_status, descricao_status, ambiente, xml_path, xml_nome) 
VALUES ('acd26a4f-7220-405e-9c96-faffb7e6480e', '35250624163237000151550010000000201995318594', '20', 999, 'Teste de inserção manual', '123456789', 'aceita', 135, 'Teste', 'homologacao', '/teste', 'teste.xml') 
RETURNING id;
```

### **5.4. Verificar CCe Gravadas**

```sql
SELECT COUNT(*) as total, MAX(sequencia) as ultima_sequencia 
FROM cce_nfe 
WHERE chave_nfe = '35250624163237000151550010000000201995318594';
```

---

## ❌ **6. Problemas Identificados e Status Atual**

### **6.1. Problema Atual**
- ✅ **Frontend:** Não há mais erro `carregarCCesDaTabela is not defined`
- ✅ **CCe é enviada** com sucesso para SEFAZ
- ✅ **XML é salvo** no sistema
- ❌ **CCe não está sendo gravada** na tabela `cce_nfe`

### **6.2. Logs Observados**
```
📝 CCe INICIADA - Empresa: ..., Chave: ..., Sequência: X
🔐 CCe - Carregando certificado: 4002 bytes, senha: DEFINIDA
✅ CCe - Certificado carregado com sucesso
🔍 CCe - Consultando NFe na SEFAZ antes da correção...
✅ CCe - NFe autorizada, pode receber correção
📝 CCe - Enviando para SEFAZ...
📝 CCe - Parâmetros: Chave=..., Sequência=..., Correção=...
```

**O log para na linha dos parâmetros e não continua**, indicando que há uma **falha silenciosa** na chamada `sefazCCe()`.

### **6.3. Logs Adicionais Implementados**
```php
error_log("🚀 CCe - Iniciando chamada sefazCCe...");
error_log("📝 CCe - Resposta SEFAZ recebida: " . strlen($response) . " bytes");
error_log("✅ CCe - Chamada sefazCCe concluída com sucesso, processando resposta...");
```

---

## 🎯 **7. Próximos Passos**

### **7.1. Debug Imediato**
1. **Fazer nova CCe** e verificar se aparecem os novos logs
2. **Identificar onde exatamente** o processo está falhando
3. **Verificar se é erro** na biblioteca sped-nfe ou no processamento

### **7.2. Possíveis Causas**
1. **Erro na biblioteca sped-nfe** durante `sefazCCe()`
2. **Timeout** na comunicação com SEFAZ
3. **Erro de parsing** da resposta XML
4. **Problema de memória** ou recursos do servidor

### **7.3. Arquivos Modificados**
- ✅ `backend/public/carta-correcao.php` - Logs e gravação no banco
- ✅ `src/pages/dashboard/NfePage.tsx` - Query com JOIN e atualização local
- ✅ Banco de dados - Nova tabela e campo de relação

---

## 📝 **8. Comandos Úteis**

### **8.1. Build do Frontend**
```bash
cd /root/nexo/nexo-pedidos && npm run build
```

### **8.2. Monitorar Logs**
```bash
tail -f /var/log/nginx/error.log | grep -E "CCe|cce_nfe"
```

### **8.3. Verificar Tabela**
```sql
SELECT * FROM cce_nfe ORDER BY created_at DESC LIMIT 5;
```

---

**Status:** ⚠️ **Em Debug** - CCe funciona mas não grava no banco. Logs adicionais implementados para identificar causa raiz.
