# 🏢 Fluxo Multi-Tenant - Sistema Nexo Pedidos

## 📊 **COMO FUNCIONA O SISTEMA MULTI-TENANT**

### **Conceito Base:**
- **1 Sistema** → **N Empresas**
- Cada empresa tem **UUID único** (empresa_id)
- **Isolamento total** de dados entre empresas
- **Certificados separados** por empresa
- **Configurações independentes**

## 🔑 **EMPRESA_ID - CHAVE DE TUDO**

### **Formato do empresa_id:**
```
UUID v4: acd26a4f-7220-405e-9c96-faffb7e6480e
```

### **Como é usado em TODOS os lugares:**
```php
// Backend PHP - SEMPRE filtrar por empresa_id
$empresaId = $_GET['empresa_id'] ?? $_POST['empresa_id'];

// Certificados
$certificadoPath = "../storage/certificados/empresa_{$empresaId}.pfx";

// Configurações
$config = carregarConfigEmpresa($empresaId);

// Numeração NFe
$proximoNumero = getProximoNumeroNFe($empresaId, $serie);
```

```typescript
// Frontend React - SEMPRE enviar empresa_id
const response = await fetch('/backend/public/emitir-nfe.php', {
  method: 'POST',
  body: JSON.stringify({
    empresa_id: empresaId,
    pedido_id: pedidoId
  })
});
```

## 📁 **ESTRUTURA DE ARQUIVOS POR EMPRESA**

### **Certificados Digitais:**
```
backend/storage/certificados/
├── empresa_acd26a4f-7220-405e-9c96-faffb7e6480e.pfx    # Certificado Empresa A
├── empresa_acd26a4f-7220-405e-9c96-faffb7e6480e.json   # Metadados Empresa A
├── empresa_def45678-1234-567e-8f90-abcdef123456.pfx    # Certificado Empresa B
├── empresa_def45678-1234-567e-8f90-abcdef123456.json   # Metadados Empresa B
└── .htaccess (deny all - segurança)
```

### **XMLs NFe (Futuro):**
```
backend/storage/xml/
├── empresa_acd26a4f/
│   ├── 2025/
│   │   ├── 06/
│   │   │   ├── NFe_35250614200166000187550010000000001550010001.xml
│   │   │   └── NFe_35250614200166000187550010000000002550010002.xml
│   │   └── 07/
│   └── 2026/
└── empresa_def45678/
    ├── 2025/
    └── 2026/
```

### **PDFs DANFE (Futuro):**
```
backend/storage/pdf/
├── empresa_acd26a4f/
│   ├── 2025/
│   │   ├── 06/
│   │   │   ├── DANFE_001.pdf
│   │   │   └── DANFE_002.pdf
│   │   └── 07/
│   └── 2026/
└── empresa_def45678/
```

## 🗄️ **BANCO DE DADOS MULTI-TENANT**

### **Tabela empresas (Principal):**
```sql
CREATE TABLE empresas (
    id UUID PRIMARY KEY,                    -- empresa_id (chave de tudo)
    cnpj VARCHAR(14) UNIQUE NOT NULL,
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    endereco JSONB,
    regime_tributario INTEGER DEFAULT 3,
    inscricao_estadual VARCHAR(20),
    codigo_municipio VARCHAR(7),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### **Tabela usuarios (Vinculada à empresa):**
```sql
CREATE TABLE usuarios (
    id UUID PRIMARY KEY,
    empresa_id UUID REFERENCES empresas(id),  -- FILTRO PRINCIPAL
    email VARCHAR(255) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    tipo_user_config_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### **Tabela nfe_config (Por empresa):**
```sql
CREATE TABLE nfe_config (
    id UUID PRIMARY KEY,
    empresa_id UUID REFERENCES empresas(id),  -- FILTRO PRINCIPAL
    ambiente INTEGER DEFAULT 2,               -- 1=Produção, 2=Homologação
    serie_nfe INTEGER DEFAULT 1,
    proximo_numero INTEGER DEFAULT 1,
    csc VARCHAR(36),                          -- Código de Segurança do Contribuinte
    csc_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### **Tabela nfe_emitidas (Histórico por empresa):**
```sql
CREATE TABLE nfe_emitidas (
    id UUID PRIMARY KEY,
    empresa_id UUID REFERENCES empresas(id),  -- FILTRO PRINCIPAL
    numero INTEGER NOT NULL,
    serie INTEGER NOT NULL,
    chave_acesso VARCHAR(44) UNIQUE,
    protocolo VARCHAR(50),
    xml_path VARCHAR(500),
    pdf_path VARCHAR(500),
    status VARCHAR(50) DEFAULT 'emitida',
    valor_total DECIMAL(10,2),
    cliente_documento VARCHAR(14),
    cliente_nome VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Índices para performance
    INDEX idx_empresa_numero (empresa_id, numero, serie),
    INDEX idx_empresa_data (empresa_id, created_at),
    INDEX idx_chave_acesso (chave_acesso)
);
```

## 🔐 **SEGURANÇA MULTI-TENANT**

### **1. Validação de Acesso:**
```php
// SEMPRE verificar se usuário tem acesso à empresa
function verificarAcessoEmpresa($usuarioId, $empresaId) {
    // Consultar no Supabase se usuário pertence à empresa
    $query = "SELECT id FROM usuarios WHERE id = ? AND empresa_id = ?";
    $result = executarQuery($query, [$usuarioId, $empresaId]);
    
    if (!$result) {
        throw new Exception('Acesso negado a esta empresa');
    }
    
    return true;
}
```

### **2. Isolamento de Dados:**
```php
// NUNCA fazer consultas sem filtro de empresa_id
// ❌ ERRADO:
$nfes = "SELECT * FROM nfe_emitidas";

// ✅ CORRETO:
$nfes = "SELECT * FROM nfe_emitidas WHERE empresa_id = ?";
```

### **3. Validação de Certificados:**
```php
// Certificado deve pertencer à empresa
function validarCertificadoEmpresa($empresaId) {
    $certificadoPath = "../storage/certificados/empresa_{$empresaId}.pfx";
    
    if (!file_exists($certificadoPath)) {
        throw new Exception('Certificado não encontrado para esta empresa');
    }
    
    return $certificadoPath;
}
```

## 🔄 **FLUXO COMPLETO DE EMISSÃO NFe**

### **1. Frontend envia requisição:**
```typescript
const emitirNFe = async (pedidoId: string) => {
    // Obter empresa_id do usuário logado
    const { data: userData } = await supabase.auth.getUser();
    const { data: usuario } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', userData.user.id)
        .single();
    
    // Enviar para backend com empresa_id
    const response = await fetch('/backend/public/emitir-nfe.php', {
        method: 'POST',
        body: JSON.stringify({
            empresa_id: usuario.empresa_id,  // OBRIGATÓRIO
            pedido_id: pedidoId
        })
    });
};
```

### **2. Backend processa por empresa:**
```php
// 1. Validar empresa_id
$empresaId = $input['empresa_id'];
verificarAcessoEmpresa($usuarioId, $empresaId);

// 2. Carregar dados específicos da empresa
$dadosEmpresa = carregarDadosEmpresa($empresaId);
$certificado = carregarCertificadoEmpresa($empresaId);
$config = carregarConfigNFe($empresaId);

// 3. Gerar numeração específica da empresa
$proximoNumero = getProximoNumeroNFe($empresaId, $serie);

// 4. Emitir NFe com dados da empresa
$nfe = emitirNFe($dadosEmpresa, $certificado, $config, $proximoNumero);

// 5. Salvar histórico da empresa
salvarNFeEmitida($empresaId, $nfe);
```

## 📋 **CHECKLIST MULTI-TENANT**

### **Para TODA nova funcionalidade NFe:**
- [ ] Receber empresa_id como parâmetro
- [ ] Validar formato UUID do empresa_id
- [ ] Verificar acesso do usuário à empresa
- [ ] Filtrar TODOS os dados por empresa_id
- [ ] Usar certificado específico da empresa
- [ ] Salvar arquivos em pasta da empresa
- [ ] Numeração independente por empresa

### **Exemplo de Endpoint Correto:**
```php
// ✅ Template padrão para qualquer endpoint NFe
$empresaId = $_POST['empresa_id'] ?? null;

if (!$empresaId || !isValidUUID($empresaId)) {
    throw new Exception('empresa_id inválido');
}

verificarAcessoEmpresa($usuarioLogado, $empresaId);

// Agora pode processar com segurança...
```

---

**🎯 Sistema Multi-Tenant 100% Funcional**  
**🔐 Isolamento total entre empresas**  
**📊 Escalável para milhares de empresas**  
**🚀 Pronto para implementação NFe**
