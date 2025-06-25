# Espelho DANFE - Consultas SQL Úteis

## 📋 Consultas para Análise de Dados

### **1. Verificar Estrutura do JSON dados_nfe**

```sql
-- Ver todas as chaves do JSON
SELECT DISTINCT jsonb_object_keys(dados_nfe::jsonb) as chaves 
FROM pdv 
WHERE dados_nfe IS NOT NULL;

-- Ver estrutura completa de uma NFe específica
SELECT dados_nfe 
FROM pdv 
WHERE id = 'uuid-da-nfe';

-- Ver dados formatados (PostgreSQL)
SELECT jsonb_pretty(dados_nfe::jsonb) 
FROM pdv 
WHERE id = 'uuid-da-nfe';
```

### **2. Buscar Dados Específicos**

```sql
-- Buscar chaves de referência
SELECT 
    id,
    numero_documento,
    dados_nfe::jsonb->'chaves_ref' as chaves_referencia
FROM pdv 
WHERE empresa_id = 'uuid-empresa'
AND dados_nfe::jsonb ? 'chaves_ref';

-- Buscar intermediador
SELECT 
    id,
    numero_documento,
    dados_nfe::jsonb->'intermediador'->>'nome' as intermediador_nome,
    dados_nfe::jsonb->'intermediador'->>'cnpj' as intermediador_cnpj
FROM pdv 
WHERE empresa_id = 'uuid-empresa'
AND dados_nfe::jsonb->'intermediador'->>'nome' IS NOT NULL;

-- Buscar transportadora
SELECT 
    id,
    numero_documento,
    dados_nfe::jsonb->'transportadora'->>'transportadora_nome' as transportadora,
    dados_nfe::jsonb->'transportadora'->>'modalidade_frete' as modalidade
FROM pdv 
WHERE empresa_id = 'uuid-empresa'
AND dados_nfe::jsonb->'transportadora'->>'transportadora_nome' IS NOT NULL;
```

### **3. Análise de Informações Adicionais**

```sql
-- Buscar NFes com informações adicionais
SELECT 
    id,
    numero_documento,
    dados_nfe::jsonb->'identificacao'->>'informacao_adicional' as info_adicional
FROM pdv 
WHERE empresa_id = 'uuid-empresa'
AND dados_nfe::jsonb->'identificacao'->>'informacao_adicional' IS NOT NULL
AND dados_nfe::jsonb->'identificacao'->>'informacao_adicional' != '';

-- Contar NFes por tipo de informação adicional
SELECT 
    CASE 
        WHEN dados_nfe::jsonb->'identificacao'->>'informacao_adicional' IS NULL THEN 'Sem informação'
        WHEN dados_nfe::jsonb->'identificacao'->>'informacao_adicional' = '' THEN 'Vazio'
        ELSE 'Com informação'
    END as tipo_info,
    COUNT(*) as quantidade
FROM pdv 
WHERE empresa_id = 'uuid-empresa'
GROUP BY tipo_info;
```

### **4. Validação de Dados da Empresa**

```sql
-- Verificar dados completos da empresa
SELECT 
    id,
    documento as cnpj,
    nome,
    nome_fantasia,
    razao_social,
    inscricao_estadual,
    endereco,
    numero,
    bairro,
    cidade,
    estado as uf,
    cep,
    codigo_municipio
FROM empresas 
WHERE id = 'uuid-empresa';

-- Verificar empresas com dados incompletos
SELECT 
    id,
    nome,
    CASE WHEN documento IS NULL THEN 'CNPJ faltando' END as cnpj_status,
    CASE WHEN inscricao_estadual IS NULL THEN 'IE faltando' END as ie_status,
    CASE WHEN endereco IS NULL THEN 'Endereço faltando' END as endereco_status
FROM empresas 
WHERE documento IS NULL 
   OR inscricao_estadual IS NULL 
   OR endereco IS NULL;
```

### **5. Análise de Performance**

```sql
-- NFes com JSON dados_nfe muito grandes (>100KB)
SELECT 
    id,
    numero_documento,
    LENGTH(dados_nfe::text) as tamanho_json,
    pg_size_pretty(LENGTH(dados_nfe::text)::bigint) as tamanho_formatado
FROM pdv 
WHERE LENGTH(dados_nfe::text) > 100000
ORDER BY LENGTH(dados_nfe::text) DESC;

-- Estatísticas de uso do campo dados_nfe
SELECT 
    COUNT(*) as total_nfes,
    COUNT(dados_nfe) as com_dados_nfe,
    ROUND(COUNT(dados_nfe) * 100.0 / COUNT(*), 2) as percentual_com_dados,
    AVG(LENGTH(dados_nfe::text)) as tamanho_medio_json
FROM pdv 
WHERE empresa_id = 'uuid-empresa';
```

### **6. Consultas para Debug**

```sql
-- Buscar NFes com problemas no JSON
SELECT 
    id,
    numero_documento,
    CASE 
        WHEN dados_nfe IS NULL THEN 'JSON nulo'
        WHEN dados_nfe::text = '{}' THEN 'JSON vazio'
        WHEN dados_nfe::text = '' THEN 'String vazia'
        ELSE 'JSON válido'
    END as status_json
FROM pdv 
WHERE empresa_id = 'uuid-empresa'
AND (dados_nfe IS NULL OR dados_nfe::text IN ('{}', ''));

-- Verificar integridade dos dados essenciais
SELECT 
    id,
    numero_documento,
    CASE WHEN dados_nfe::jsonb ? 'identificacao' THEN '✓' ELSE '✗' END as tem_identificacao,
    CASE WHEN dados_nfe::jsonb ? 'produtos' THEN '✓' ELSE '✗' END as tem_produtos,
    CASE WHEN dados_nfe::jsonb ? 'totais' THEN '✓' ELSE '✗' END as tem_totais,
    CASE WHEN dados_nfe::jsonb ? 'empresa' THEN '✓' ELSE '✗' END as tem_empresa
FROM pdv 
WHERE empresa_id = 'uuid-empresa'
AND dados_nfe IS NOT NULL;
```

### **7. Limpeza e Manutenção**

```sql
-- Remover dados_nfe de NFes antigas (mais de 1 ano)
UPDATE pdv 
SET dados_nfe = NULL 
WHERE created_at < NOW() - INTERVAL '1 year'
AND dados_nfe IS NOT NULL;

-- Compactar JSON removendo espaços desnecessários
UPDATE pdv 
SET dados_nfe = dados_nfe::jsonb::text 
WHERE dados_nfe IS NOT NULL
AND LENGTH(dados_nfe::text) > LENGTH(dados_nfe::jsonb::text);

-- Backup de dados_nfe antes de alterações
CREATE TABLE pdv_dados_nfe_backup AS 
SELECT id, dados_nfe, created_at 
FROM pdv 
WHERE dados_nfe IS NOT NULL;
```

### **8. Relatórios Úteis**

```sql
-- Relatório de uso por empresa
SELECT 
    e.nome as empresa,
    COUNT(p.id) as total_nfes,
    COUNT(p.dados_nfe) as nfes_com_dados,
    COUNT(CASE WHEN p.dados_nfe::jsonb ? 'intermediador' THEN 1 END) as com_intermediador,
    COUNT(CASE WHEN p.dados_nfe::jsonb ? 'transportadora' THEN 1 END) as com_transportadora,
    COUNT(CASE WHEN p.dados_nfe::jsonb ? 'chaves_ref' THEN 1 END) as com_chaves_ref
FROM empresas e
LEFT JOIN pdv p ON e.id = p.empresa_id
GROUP BY e.id, e.nome
ORDER BY total_nfes DESC;

-- Relatório de modalidades de frete mais usadas
SELECT 
    dados_nfe::jsonb->'transportadora'->>'modalidade_frete' as modalidade,
    CASE 
        WHEN dados_nfe::jsonb->'transportadora'->>'modalidade_frete' = '0' THEN 'Emitente'
        WHEN dados_nfe::jsonb->'transportadora'->>'modalidade_frete' = '1' THEN 'Destinatário'
        WHEN dados_nfe::jsonb->'transportadora'->>'modalidade_frete' = '2' THEN 'Terceiros'
        WHEN dados_nfe::jsonb->'transportadora'->>'modalidade_frete' = '9' THEN 'Sem Transporte'
        ELSE 'Outros'
    END as descricao,
    COUNT(*) as quantidade
FROM pdv 
WHERE dados_nfe::jsonb->'transportadora'->>'modalidade_frete' IS NOT NULL
GROUP BY modalidade
ORDER BY quantidade DESC;
```

### **9. Índices Recomendados**

```sql
-- Índice principal para consultas no JSON
CREATE INDEX IF NOT EXISTS idx_pdv_dados_nfe_gin 
ON pdv USING GIN (dados_nfe);

-- Índice para empresa_id (se não existir)
CREATE INDEX IF NOT EXISTS idx_pdv_empresa_id 
ON pdv (empresa_id);

-- Índice composto para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_pdv_empresa_dados 
ON pdv (empresa_id) 
WHERE dados_nfe IS NOT NULL;

-- Índice para busca por chaves de referência
CREATE INDEX IF NOT EXISTS idx_pdv_chaves_ref 
ON pdv USING GIN ((dados_nfe::jsonb->'chaves_ref'));
```

### **10. Monitoramento**

```sql
-- Verificar tamanho total dos dados JSON
SELECT 
    pg_size_pretty(SUM(LENGTH(dados_nfe::text))::bigint) as tamanho_total_json,
    COUNT(*) as registros_com_json,
    pg_size_pretty(AVG(LENGTH(dados_nfe::text))::bigint) as tamanho_medio
FROM pdv 
WHERE dados_nfe IS NOT NULL;

-- Verificar crescimento mensal
SELECT 
    DATE_TRUNC('month', created_at) as mes,
    COUNT(*) as nfes_criadas,
    COUNT(dados_nfe) as nfes_com_dados,
    pg_size_pretty(SUM(LENGTH(dados_nfe::text))::bigint) as tamanho_dados
FROM pdv 
WHERE created_at >= NOW() - INTERVAL '12 months'
GROUP BY mes
ORDER BY mes DESC;
```

## 🔧 Dicas de Uso

### **Performance:**
- Use índices GIN para consultas em campos JSONB
- Limite consultas por empresa_id sempre
- Evite SELECT * em tabelas com JSON grandes

### **Manutenção:**
- Faça backup antes de alterações em massa
- Monitore o crescimento do campo dados_nfe
- Considere arquivamento de dados antigos

### **Debug:**
- Use `jsonb_pretty()` para visualizar JSON formatado
- Verifique sempre se o JSON é válido antes de consultar
- Use logs estruturados para rastrear problemas

---

**Última atualização:** 25/06/2025  
**Versão:** 1.0
