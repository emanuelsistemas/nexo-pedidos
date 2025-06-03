# 🔧 Detalhes Técnicos - Sistema NFe

## 📊 **CONFIGURAÇÃO ATUAL DO SISTEMA**

### **Nginx Configuration (nginx-production.conf):**
```nginx
server {
    listen 80 default_server;
    server_name _;
    root /root/nexo/nexo-pedidos/dist;
    index index.html index.php;
    
    # Frontend buildado
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Backend PHP com CORS
    location /backend/public/ {
        root /root/nexo/nexo-pedidos;
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
        
        location ~ \.php$ {
            fastcgi_pass unix:/var/run/php/php7.4-fpm.sock;
            fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
            include fastcgi_params;
        }
    }
}
```

### **Composer Dependencies (backend/composer.json):**
```json
{
    "require": {
        "nfephp-org/sped-nfe": "^5.1.27"
    }
}
```

### **Estrutura de Certificados:**
```
backend/storage/certificados/
├── empresa_acd26a4f-7220-405e-9c96-faffb7e6480e.pfx
├── empresa_acd26a4f-7220-405e-9c96-faffb7e6480e.json
└── .htaccess (deny all)
```

## 🔐 **SISTEMA DE CERTIFICADOS**

### **Upload Endpoint (upload-certificado.php):**
```php
// Recebe arquivo .pfx/.p12 + senha
// Valida certificado com OpenSSL
// Salva em storage/certificados/
// Retorna metadados em JSON
```

### **Verificação Endpoint (check-certificado.php):**
```php
// Verifica se certificado existe
// Retorna status e metadados
// Usado pelo frontend para exibir info
```

### **Metadados JSON:**
```json
{
    "empresa_id": "uuid",
    "filename": "empresa_uuid.pfx",
    "nome_certificado": "NOME EMPRESA:CNPJ",
    "validade": "2026-04-24 15:16:42",
    "status": "ativo",
    "uploaded_at": "2025-06-03 11:07:05"
}
```

## 🎨 **FRONTEND INTEGRATION**

### **Hook useCertificateUpload.ts:**
```typescript
// Gerencia upload de certificados
// Validação frontend + backend
// Estados de loading e erro
// Integração com API local
```

### **API certificateApi.js:**
```javascript
// checkCertificateStatus() - Verifica status
// extractCertificateInfo() - Extrai dados
// validateCertificatePassword() - Valida senha
```

### **Interface ConfiguracoesPage.tsx:**
```typescript
// Seção "Certificado Digital"
// Upload drag & drop
// Exibição de status
// Validação em tempo real
```

## 🚨 **REGRAS CRÍTICAS - BIBLIOTECA SPED-NFE**

### **⚠️ HOMOLOGAÇÃO FISCAL - NÃO VIOLAR:**
```php
// ❌ JAMAIS FAZER:
// - Modificar arquivos em vendor/nfephp-org/sped-nfe/
// - Alterar comunicação com SEFAZ
// - Modificar validações fiscais
// - Alterar estrutura de XML
// - Modificar cálculos de impostos

// ✅ PERMITIDO APENAS:
// - Configurar parâmetros via $config
// - Ajustar dados de entrada
// - Personalizar retorno para frontend
// - Logs e debug (sem alterar fluxo)
```

### **Uso Correto da Biblioteca:**
```php
// Sempre usar padrão nativo
$tools = new Tools(json_encode($config), $certificado, $senha);
$make = new Make();

// Configurar dados conforme documentação oficial
$std = new stdClass();
$std->versao = '4.00';
// ... seguir exatamente a documentação

// Usar métodos nativos
$xml = $make->getXML();
$xmlAssinado = $tools->signNFe($xml);
$response = $tools->sefazEnviaLote([$xmlAssinado], 1);
```

## 🏢 **SISTEMA MULTI-TENANT DETALHADO**

### **Como Funciona o Isolamento por Empresa:**
```php
// Exemplo prático de isolamento
$empresaId = $_GET['empresa_id'] ?? $_POST['empresa_id'];

// Certificado específico da empresa
$certificadoPath = "../storage/certificados/empresa_{$empresaId}.pfx";
$metadataPath = "../storage/certificados/empresa_{$empresaId}.json";

// Configuração específica da empresa
$config = [
    "razaosocial" => $dadosEmpresa['razao_social'],
    "cnpj" => $dadosEmpresa['cnpj'],
    "siglaUF" => $dadosEmpresa['uf'],
    // ... dados específicos desta empresa
];

// Numeração independente por empresa
$proximoNumero = getProximoNumeroNFe($empresaId, $serie);
```

### **Estrutura de Arquivos por Empresa:**
```
backend/storage/
├── certificados/
│   ├── empresa_acd26a4f-7220-405e-9c96-faffb7e6480e.pfx
│   ├── empresa_acd26a4f-7220-405e-9c96-faffb7e6480e.json
│   ├── empresa_def45678-1234-567e-8f90-abcdef123456.pfx
│   └── empresa_def45678-1234-567e-8f90-abcdef123456.json
├── xml/
│   ├── empresa_acd26a4f/
│   │   ├── 2025/
│   │   │   ├── 06/
│   │   │   │   ├── NFe_001.xml
│   │   │   │   └── NFe_002.xml
│   └── empresa_def45678/
└── pdf/
    ├── empresa_acd26a4f/
    └── empresa_def45678/
```

## 🗄️ **BANCO DE DADOS**

### **Supabase Tables Relacionadas:**
```sql
-- empresas: dados fiscais básicos
CREATE TABLE empresas (
    id UUID PRIMARY KEY,
    cnpj VARCHAR(14) UNIQUE,
    razao_social VARCHAR(255),
    nome_fantasia VARCHAR(255),
    endereco JSONB,
    regime_tributario INTEGER,
    -- ... outros campos
);

-- usuarios: acesso por empresa_id
CREATE TABLE usuarios (
    id UUID PRIMARY KEY,
    empresa_id UUID REFERENCES empresas(id),
    email VARCHAR(255),
    -- ... outros campos
);

-- nfe_config: configurações NFe por empresa
CREATE TABLE nfe_config (
    id UUID PRIMARY KEY,
    empresa_id UUID REFERENCES empresas(id),
    ambiente INTEGER, -- 1=Produção, 2=Homologação
    serie_nfe INTEGER DEFAULT 1,
    proximo_numero INTEGER DEFAULT 1,
    -- ... outros campos
);

-- nfe_emitidas: histórico NFe por empresa
CREATE TABLE nfe_emitidas (
    id UUID PRIMARY KEY,
    empresa_id UUID REFERENCES empresas(id),
    numero INTEGER,
    serie INTEGER,
    chave_acesso VARCHAR(44),
    protocolo VARCHAR(50),
    xml_path VARCHAR(500),
    pdf_path VARCHAR(500),
    status VARCHAR(50),
    -- ... outros campos
);
```

### **Estrutura Multi-tenant:**
- Tudo filtrado por `empresa_id`
- Certificados separados por empresa
- Configurações isoladas
- Numeração NFe independente
- Histórico separado por empresa

## 🚀 **PRÓXIMA IMPLEMENTAÇÃO: EMISSÃO NFe**

### **1. Endpoint emitir-nfe.php:**
```php
<?php
require_once '../vendor/autoload.php';

use NFePHP\NFe\Tools;
use NFePHP\NFe\Make;

// 1. Receber dados do pedido
// 2. Carregar certificado da empresa
// 3. Gerar XML NFe
// 4. Assinar digitalmente
// 5. Enviar para SEFAZ
// 6. Retornar protocolo
```

### **2. Dados Necessários para NFe:**
```json
{
    "empresa": {
        "cnpj": "string",
        "razao_social": "string",
        "endereco": "object",
        "regime_tributario": "number"
    },
    "cliente": {
        "documento": "string",
        "nome": "string",
        "endereco": "object"
    },
    "itens": [
        {
            "codigo": "string",
            "descricao": "string",
            "quantidade": "number",
            "valor_unitario": "number",
            "ncm": "string",
            "cfop": "string"
        }
    ]
}
```

### **3. Configuração sped-nfe:**
```php
$config = [
    "atualizacao" => date('Y-m-d H:i:s'),
    "tpAmb" => 2, // 1=Produção, 2=Homologação
    "razaosocial" => $empresa['razao_social'],
    "cnpj" => $empresa['cnpj'],
    "siglaUF" => $empresa['uf'],
    "schemes" => "PL_009_V4",
    "versao" => '4.00',
    "tokenIBPT" => "",
    "CSC" => "",
    "CSCid" => ""
];

$tools = new Tools(json_encode($config), $certificado);
```

## 📋 **CHECKLIST PARA PRÓXIMA IA**

### **Antes de Começar:**
- [ ] Verificar se Nginx está rodando: `systemctl status nginx`
- [ ] Testar certificados: `curl http://localhost/backend/public/test.php`
- [ ] Confirmar sped-nfe: `composer show nfephp-org/sped-nfe`

### **Durante Desenvolvimento:**
- [ ] Sempre fazer backup antes de mudanças grandes
- [ ] Testar em homologação antes de produção
- [ ] Manter logs detalhados para debug
- [ ] Fazer build após mudanças: `npm run build`

### **Estrutura de Testes:**
```bash
# Testar certificado
curl "http://localhost/backend/public/check-certificado.php?empresa_id=UUID"

# Testar emissão (futuro)
curl -X POST "http://localhost/backend/public/emitir-nfe.php" \
  -H "Content-Type: application/json" \
  -d '{"pedido_id": "123", "empresa_id": "UUID"}'
```

## 🔍 **DEBUGGING**

### **Logs Importantes:**
```bash
# Nginx
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log

# PHP-FPM
tail -f /var/log/php7.4-fpm.log

# Certificados
ls -la backend/storage/certificados/
```

### **Problemas Comuns:**
1. **CORS**: Headers duplicados (já resolvido)
2. **Permissões**: www-data precisa acessar storage
3. **Certificados**: Validar senha e formato
4. **Build**: Sempre rebuildar após mudanças

## 🎯 **METAS DE IMPLEMENTAÇÃO**

### **Fase 1: Configuração Empresa**
- Interface para dados fiscais
- Validação CNPJ/IE
- Configuração ambiente (homolog/prod)

### **Fase 2: Emissão Básica**
- Endpoint emitir-nfe.php
- Geração XML simples
- Assinatura digital
- Envio SEFAZ

### **Fase 3: Gestão Completa**
- Consulta status
- Cancelamento
- DANFE (PDF)
- Integração com pedidos

---

**🔧 Sistema preparado para implementação completa de NFe**  
**📊 Base sólida com certificados funcionando**  
**🚀 Pronto para próxima fase de desenvolvimento**
