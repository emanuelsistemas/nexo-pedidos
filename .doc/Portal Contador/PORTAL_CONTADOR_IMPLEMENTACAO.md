# Portal do Contador - Documentação de Implementação

## 📋 **VISÃO GERAL**

O Portal do Contador é um sistema que permite aos contadores acessar e baixar arquivos XML de NFe/NFC-e das empresas de forma organizada, com filtros avançados e relatórios detalhados.

### **Funcionalidades Principais:**
- Busca de empresas por CNPJ
- Visualização da estrutura de arquivos XML
- Filtros por ambiente (Produção/Homologação/Todos)
- Filtros por modelo (NFe 55/NFC-e 65/Todos)
- Download de arquivos em formato ZIP
- Relatórios detalhados com valores contabilizados
- Histórico de CNPJs pesquisados

---

## 🏗️ **ARQUITETURA DO SISTEMA**

### **Frontend (React/TypeScript):**
```
src/pages/public/ContadorPortalPage.tsx     - Página principal
src/components/contador/FileExplorer.tsx    - Explorador de arquivos
```

### **Backend (PHP):**
```
backend/public/contador-portal.php          - API principal (listagem)
backend/public/contador-download.php        - API de download
backend/public/contador-relatorio.php       - API de relatórios
```

### **Estrutura de Arquivos XML:**
```
backend/storage/xml/
├── empresa_{ID}/
│   ├── producao/
│   │   ├── 55/                    # NFe modelo 55
│   │   │   ├── Autorizados/
│   │   │   ├── Cancelados/
│   │   │   └── CCe/
│   │   └── 65/                    # NFC-e modelo 65
│   │       ├── Autorizados/
│   │       ├── Cancelados/
│   │       └── CCe/
│   └── homologacao/
│       ├── 55/
│       └── 65/
```

---

## 🔧 **IMPLEMENTAÇÃO DETALHADA**

### **1. Busca de Empresas**

**Arquivo:** `src/pages/public/ContadorPortalPage.tsx`

```typescript
// Mapeamento CNPJ -> Dados da empresa
const empresas: Record<string, any> = {
  '24163237000151': {
    id: 'acd26a4f-7220-405e-9c96-faffb7e6480e',
    nome: 'EMANUEL LUIS PEREIRA SOUZA VALESIS INFORMATICA',
    cnpj: '24163237000151',
    razao_social: 'EMANUEL LUIS PEREIRA SOUZA VALESIS INFORMATICA',
    nome_fantasia: 'DISTRIBUIDORA EXEMPLO',
    inscricao_estadual: '392188360119',
    segmento: 'Bar'
  }
};
```

**⚠️ IMPORTANTE:** Para adicionar novas empresas, inclua no objeto `empresas` com os dados reais.

### **2. Listagem de Arquivos**

**Arquivo:** `backend/public/contador-portal.php`

**Função principal:** `listarEstrutura($input)`

```php
// Estrutura de busca por ambiente e modelo
$ambientes = $ambiente === 'todos' ? ['producao', 'homologacao'] : [$ambiente];
$modelos = $modelo === 'todos' ? ['55', '65'] : [$modelo];

foreach ($ambientes as $amb) {
    foreach ($modelos as $mod) {
        $basePath = "../storage/xml/empresa_{$empresaId}/{$amb}/{$mod}";
        // Busca arquivos em Autorizados, Cancelados, CCe
    }
}
```

### **3. Download de Arquivos**

**Arquivo:** `backend/public/contador-download.php`

**Função principal:** `downloadMesCompleto($input)`

```php
// Estrutura de download
foreach ($ambientes as $amb) {
    $basePath = "../storage/xml/empresa_{$empresaId}/{$amb}";
    
    foreach ($tipos as $tipo) {
        if ($modelo === '55') {
            $tipoPath = "{$basePath}/55/{$tipo}/{$ano}/{$mes}";
        } elseif ($modelo === '65') {
            $tipoPath = "{$basePath}/65/{$tipo}/{$ano}/{$mes}";
        }
        // Adiciona arquivos ao ZIP
    }
}
```

---

## 🔍 **LOCALIZAÇÃO DE ARQUIVOS E DADOS**

### **Para Adicionar Nova Empresa:**

1. **Frontend** - `src/pages/public/ContadorPortalPage.tsx` (linha ~138):
```typescript
const empresas: Record<string, any> = {
  'NOVO_CNPJ': {
    id: 'uuid-da-empresa',
    nome: 'RAZAO_SOCIAL',
    cnpj: 'NOVO_CNPJ',
    razao_social: 'RAZAO_SOCIAL',
    nome_fantasia: 'NOME_FANTASIA',
    inscricao_estadual: 'IE',
    segmento: 'SEGMENTO'
  }
};
```

2. **Backend** - `backend/public/contador-portal.php` (linha ~50):
```php
$empresas = [
    'NOVO_CNPJ' => [
        'id' => 'uuid-da-empresa',
        'nome' => 'RAZAO_SOCIAL',
        'razao_social' => 'RAZAO_SOCIAL',
        'nome_fantasia' => 'NOME_FANTASIA'
    ]
];
```

### **Para Modificar Estrutura de Pastas:**

**Arquivos a alterar:**
1. `backend/public/contador-portal.php` - função `listarEstrutura()`
2. `backend/public/contador-download.php` - função `downloadMesCompleto()`
3. `backend/public/contador-download.php` - função `gerarRelatorioMesCompletoMultiAmbiente()`

### **Para Adicionar Novos Filtros:**

1. **Frontend** - `src/components/contador/FileExplorer.tsx`:
   - Adicionar estado do filtro
   - Adicionar UI do filtro
   - Incluir parâmetro na requisição

2. **Backend** - `backend/public/contador-portal.php`:
   - Processar novo parâmetro
   - Aplicar lógica de filtro na busca

---

## 🐛 **TROUBLESHOOTING**

### **Problema: "Nenhum arquivo encontrado"**

**Verificações:**
1. Estrutura de pastas correta?
2. Permissões de leitura nas pastas?
3. Empresa ID correto?
4. Filtros aplicados corretamente?

**Debug:**
```bash
# Verificar estrutura
ls -la /root/nexo-pedidos/backend/storage/xml/empresa_ID/

# Verificar logs
tail -f /var/log/nginx/nexo-dev-error.log
```

### **Problema: "Erro ao baixar arquivo"**

**Verificações:**
1. Extensão ZipArchive habilitada no PHP?
2. Permissões de escrita em /tmp/?
3. Arquivos XML existem fisicamente?

**Debug:**
```php
// Adicionar logs temporários
error_log("DEBUG: Verificando path: {$tipoPath}");
error_log("DEBUG: Arquivos encontrados: " . count($xmlFiles));
```

### **Problema: Relatório com valores zerados**

**Verificações:**
1. Função `extrairDadosXML()` funcionando?
2. Estrutura do XML compatível?
3. Campos `<nNF>` e `<vNF>` presentes?

**Debug:**
```php
// Testar extração de dados
$dados = extrairDadosXML($xmlFile);
error_log("DEBUG: Dados extraídos: " . print_r($dados, true));
```

---

## 📝 **LOGS E MONITORAMENTO**

### **Logs Importantes:**
```bash
# Logs do Nginx
tail -f /var/log/nginx/nexo-dev-error.log

# Logs do PHP
tail -f /var/log/php8.3-fpm.log

# Logs customizados (se habilitados)
tail -f /tmp/contador-debug.log
```

### **Endpoints de Teste:**
```bash
# Testar listagem
curl -X POST "http://nexodev.emasoftware.app/backend/public/contador-portal.php" \
  -d '{"action":"listar_estrutura","empresa_id":"ID","ambiente":"homologacao","modelo":"55"}'

# Testar download
curl -X POST "http://nexodev.emasoftware.app/backend/public/contador-download.php" \
  -d '{"action":"download_mes_completo","empresa_id":"ID","ano":"2025","mes":"06","modelo":"55","ambiente":"homologacao"}'
```

---

## 🔄 **PROCESSO DE DEPLOY**

### **Após Modificações:**
1. Fazer alterações nos arquivos
2. Testar localmente
3. Fazer build: `npm run build && nexo-dev`
4. Testar em desenvolvimento
5. Commit e push: `git add . && git commit -m "..." && git push origin dev`

### **Estrutura de Branches:**
- `dev` - Desenvolvimento (onde trabalhamos)
- `main` - Produção (não mexer diretamente)

---

## 📞 **CONTATOS E SUPORTE**

Para dúvidas sobre esta implementação:
- Documentação criada em: 25/06/2025
- Versão do sistema: Portal do Contador v1.0
- Ambiente de desenvolvimento: http://nexodev.emasoftware.app/contador

**Arquivos críticos para backup:**
- `src/pages/public/ContadorPortalPage.tsx`
- `src/components/contador/FileExplorer.tsx`
- `backend/public/contador-portal.php`
- `backend/public/contador-download.php`
