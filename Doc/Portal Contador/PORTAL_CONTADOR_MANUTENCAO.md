# Portal do Contador - Guia de Manutenção

## 🔧 **TAREFAS COMUNS DE MANUTENÇÃO**

### **1. ADICIONAR NOVA EMPRESA**

#### **Passo 1: Obter dados da empresa**
```sql
-- Consultar dados reais da empresa no banco
SELECT 
    id,
    documento as cnpj,
    razao_social,
    nome_fantasia,
    inscricao_estadual,
    segmento
FROM empresas 
WHERE documento = 'NOVO_CNPJ';
```

#### **Passo 2: Atualizar Frontend**
**Arquivo:** `src/pages/public/ContadorPortalPage.tsx`
**Localização:** Linha ~138

```typescript
const empresas: Record<string, any> = {
  '24163237000151': { /* empresa existente */ },
  'NOVO_CNPJ_SEM_FORMATACAO': {
    id: 'uuid-da-empresa-do-banco',
    nome: 'RAZAO_SOCIAL_COMPLETA',
    cnpj: 'NOVO_CNPJ_SEM_FORMATACAO',
    razao_social: 'RAZAO_SOCIAL_COMPLETA',
    nome_fantasia: 'NOME_FANTASIA_DA_EMPRESA',
    inscricao_estadual: 'INSCRICAO_ESTADUAL',
    segmento: 'SEGMENTO_DA_EMPRESA'
  }
};
```

#### **Passo 3: Atualizar Backend**
**Arquivo:** `backend/public/contador-portal.php`
**Localização:** Linha ~50

```php
$empresas = [
    '24163237000151' => [ /* empresa existente */ ],
    'NOVO_CNPJ_SEM_FORMATACAO' => [
        'id' => 'uuid-da-empresa-do-banco',
        'nome' => 'RAZAO_SOCIAL_COMPLETA',
        'razao_social' => 'RAZAO_SOCIAL_COMPLETA',
        'nome_fantasia' => 'NOME_FANTASIA_DA_EMPRESA'
    ]
];
```

#### **Passo 4: Verificar estrutura de pastas**
```bash
# Verificar se existem arquivos XML para a empresa
ls -la /root/nexo-pedidos/backend/storage/xml/empresa_UUID-DA-EMPRESA/

# Se não existir, criar estrutura básica
mkdir -p /root/nexo-pedidos/backend/storage/xml/empresa_UUID-DA-EMPRESA/{producao,homologacao}/{55,65}/{Autorizados,Cancelados,CCe}
```

#### **Passo 5: Testar**
```bash
# Build e deploy
npm run build && nexo-dev

# Testar busca
curl -X POST "http://nexodev.emasoftware.app/backend/public/contador-portal.php" \
  -d '{"action":"buscar_empresa","cnpj":"NOVO_CNPJ"}'
```

---

### **2. CORRIGIR PROBLEMA "NENHUM ARQUIVO ENCONTRADO"**

#### **Diagnóstico:**

```bash
# 1. Verificar se a empresa existe
ls -la /root/nexo-pedidos/backend/storage/xml/ | grep empresa_UUID

# 2. Verificar estrutura de pastas
find /root/nexo-pedidos/backend/storage/xml/empresa_UUID -type d

# 3. Verificar arquivos XML
find /root/nexo-pedidos/backend/storage/xml/empresa_UUID -name "*.xml" -ls

# 4. Verificar permissões
ls -la /root/nexo-pedidos/backend/storage/xml/empresa_UUID/homologacao/55/Autorizados/2025/06/
```

#### **Soluções Comuns:**

**Problema:** Estrutura de pastas incorreta
```bash
# Corrigir estrutura
cd /root/nexo-pedidos/backend/storage/xml/empresa_UUID
mkdir -p {producao,homologacao}/{55,65}/{Autorizados,Cancelados,CCe}/{2025,2024}/{01,02,03,04,05,06,07,08,09,10,11,12}
```

**Problema:** Permissões incorretas
```bash
# Corrigir permissões
chown -R www-data:www-data /root/nexo-pedidos/backend/storage/xml/
chmod -R 755 /root/nexo-pedidos/backend/storage/xml/
```

**Problema:** Arquivos em local errado
```bash
# Mover arquivos para estrutura correta
# De: empresa_UUID/Autorizados/2025/06/arquivo.xml
# Para: empresa_UUID/homologacao/55/Autorizados/2025/06/arquivo.xml
```

---

### **3. CORRIGIR PROBLEMA DE DOWNLOAD**

#### **Diagnóstico:**

```bash
# 1. Verificar logs de erro
tail -f /var/log/nginx/nexo-dev-error.log

# 2. Testar download via curl
curl -X POST "http://nexodev.emasoftware.app/backend/public/contador-download.php" \
  -d '{"action":"download_mes_completo","empresa_id":"UUID","ano":"2025","mes":"06","modelo":"55","ambiente":"homologacao"}' \
  --output teste.zip

# 3. Verificar se ZIP foi criado
file teste.zip
unzip -l teste.zip
```

#### **Problemas Comuns:**

**Erro:** "Erro ao criar arquivo ZIP"
```bash
# Verificar se ZipArchive está habilitado
php -m | grep zip

# Verificar espaço em disco
df -h /tmp/

# Verificar permissões em /tmp
ls -la /tmp/ | head
```

**Erro:** "Nenhum arquivo XML encontrado para este período"
```bash
# Verificar se arquivos existem no período específico
ls -la /root/nexo-pedidos/backend/storage/xml/empresa_UUID/homologacao/55/Autorizados/2025/06/

# Verificar se filtros estão corretos
# Debug temporário no código:
error_log("DEBUG: Buscando em: {$tipoPath}");
error_log("DEBUG: Arquivos encontrados: " . count($xmlFiles));
```

---

### **4. CORRIGIR RELATÓRIO COM VALORES ZERADOS**

#### **Diagnóstico:**

```bash
# 1. Testar extração de dados de um XML específico
php -r "
include 'backend/public/contador-download.php';
\$dados = extrairDadosXML('/caminho/para/arquivo.xml');
print_r(\$dados);
"

# 2. Verificar estrutura do XML
head -20 /caminho/para/arquivo.xml
grep -E '<nNF>|<vNF>' /caminho/para/arquivo.xml
```

#### **Soluções:**

**Problema:** XML com namespace diferente
```php
// Adicionar tratamento de namespace na função extrairDadosXML
$namespaces = $xml->getNamespaces(true);
if (isset($namespaces[''])) {
    $xml->registerXPathNamespace('nfe', $namespaces['']);
}
```

**Problema:** Campos em localização diferente
```php
// Adicionar mais métodos de busca na função extrairDadosXML
// Método 4: Busca em nós específicos
$numeroNodes = $xml->xpath('//ide/nNF');
$valorNodes = $xml->xpath('//ICMSTot/vNF');
```

---

### **5. ADICIONAR NOVO FILTRO**

#### **Exemplo: Adicionar filtro por série**

**Passo 1: Frontend - Estado**
```typescript
// Em FileExplorer.tsx
const [filtroSerie, setFiltroSerie] = useState<string>('todas');
```

**Passo 2: Frontend - UI**
```typescript
// Adicionar dropdown de série
<select value={filtroSerie} onChange={(e) => setFiltroSerie(e.target.value)}>
  <option value="todas">Todas as Séries</option>
  <option value="1">Série 1</option>
  <option value="2">Série 2</option>
</select>
```

**Passo 3: Frontend - Requisição**
```typescript
// Incluir na requisição
body: JSON.stringify({
  action: 'listar_estrutura',
  empresa_id: empresaData.id,
  ambiente: filtroAmbiente,
  modelo: filtroModelo,
  serie: filtroSerie  // Novo parâmetro
})
```

**Passo 4: Backend - Processamento**
```php
// Em contador-portal.php
function listarEstrutura($input) {
    $serie = $input['serie'] ?? 'todas';
    
    // Aplicar filtro na busca de arquivos
    foreach ($xmlFiles as $xmlFile) {
        if ($serie !== 'todas') {
            $serieXML = extrairSerieXML($xmlFile);
            if ($serieXML !== $serie) {
                continue;
            }
        }
        // Processar arquivo
    }
}

// Função para extrair série
function extrairSerieXML($xmlFile) {
    $xmlContent = file_get_contents($xmlFile);
    if (preg_match('/<serie>(\d+)<\/serie>/', $xmlContent, $matches)) {
        return $matches[1];
    }
    return '1'; // Default
}
```

---

### **6. BACKUP E RESTORE**

#### **Backup dos Dados:**
```bash
# Backup da estrutura XML
tar -czf backup_xml_$(date +%Y%m%d).tar.gz /root/nexo-pedidos/backend/storage/xml/

# Backup do código
tar -czf backup_codigo_$(date +%Y%m%d).tar.gz /root/nexo-pedidos/src/pages/public/ContadorPortalPage.tsx /root/nexo-pedidos/src/components/contador/ /root/nexo-pedidos/backend/public/contador-*.php
```

#### **Restore:**
```bash
# Restore da estrutura XML
tar -xzf backup_xml_YYYYMMDD.tar.gz -C /

# Restore do código
tar -xzf backup_codigo_YYYYMMDD.tar.gz -C /root/nexo-pedidos/
```

---

### **7. MONITORAMENTO E LOGS**

#### **Logs Importantes:**
```bash
# Logs em tempo real
tail -f /var/log/nginx/nexo-dev-error.log

# Logs específicos do PHP
tail -f /var/log/php8.3-fpm.log

# Buscar erros específicos
grep -i "contador" /var/log/nginx/nexo-dev-error.log | tail -20
```

#### **Métricas de Performance:**
```bash
# Verificar uso de disco
du -sh /root/nexo-pedidos/backend/storage/xml/

# Verificar arquivos grandes
find /root/nexo-pedidos/backend/storage/xml/ -size +10M -ls

# Verificar quantidade de arquivos por empresa
find /root/nexo-pedidos/backend/storage/xml/ -name "*.xml" | cut -d'/' -f7 | sort | uniq -c
```

---

### **8. DEPLOY E VERSIONAMENTO**

#### **Processo de Deploy:**
```bash
# 1. Fazer alterações
# 2. Testar localmente
# 3. Build
npm run build

# 4. Deploy
nexo-dev

# 5. Testar em desenvolvimento
curl -I http://nexodev.emasoftware.app/contador

# 6. Commit e push
git add .
git commit -m "fix: descrição da correção"
git push origin dev
```

#### **Rollback em Caso de Problema:**
```bash
# Ver últimos commits
git log --oneline -5

# Voltar para commit anterior
git reset --hard HASH_DO_COMMIT_ANTERIOR

# Rebuild e redeploy
npm run build && nexo-dev
```

---

## 🚨 **CHECKLIST DE MANUTENÇÃO MENSAL**

- [ ] Verificar logs de erro
- [ ] Verificar espaço em disco
- [ ] Testar download de ZIP
- [ ] Verificar performance das consultas
- [ ] Backup dos dados XML
- [ ] Verificar permissões de arquivos
- [ ] Testar com diferentes empresas
- [ ] Verificar se novos XMLs estão sendo processados
- [ ] Validar relatórios de valores
- [ ] Testar filtros de ambiente e modelo

---

## 📞 **CONTATOS DE EMERGÊNCIA**

**Em caso de problemas críticos:**
1. Verificar logs primeiro
2. Tentar rollback se necessário
3. Documentar o problema
4. Implementar correção
5. Testar extensivamente
6. Fazer novo deploy

**Arquivos críticos para não perder:**
- `/root/nexo-pedidos/backend/storage/xml/` (dados)
- `src/pages/public/ContadorPortalPage.tsx` (frontend)
- `backend/public/contador-*.php` (backend)
- `Doc/PORTAL_CONTADOR_*.md` (documentação)
