# 📁 Estrutura do Projeto

## 🗂️ Arquivos Críticos

### Frontend Principal
```
src/
├── pages/dashboard/
│   └── NfePage.tsx              # ⭐ ARQUIVO PRINCIPAL - Interface completa NFe
├── components/
│   ├── ui/                      # Componentes base (Button, Input, etc.)
│   └── layout/                  # Layout components
├── lib/
│   └── supabase.ts             # Configuração Supabase
└── types/
    └── nfe.ts                  # Tipos TypeScript para NFe
```

### Configurações
```
├── package.json                # Dependências e scripts
├── tailwind.config.js         # Configuração Tailwind
├── vite.config.ts             # Configuração Vite
└── tsconfig.json              # Configuração TypeScript
```

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

#### `empresas`
```sql
CREATE TABLE empresas (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  cnpj VARCHAR UNIQUE,
  endereco TEXT,
  telefone VARCHAR,
  email VARCHAR,
  certificado_digital BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `clientes`
```sql
CREATE TABLE clientes (
  id UUID PRIMARY KEY,
  empresa_id UUID REFERENCES empresas(id),
  nome VARCHAR NOT NULL,
  documento VARCHAR, -- CPF/CNPJ
  endereco TEXT,
  cidade VARCHAR,
  estado VARCHAR,
  cep VARCHAR,
  emails JSONB, -- Array de emails
  telefones JSONB, -- Array de telefones
  observacao_nfe TEXT, -- Observação para NFe
  observacao_interna TEXT, -- Observação interna
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `produtos`
```sql
CREATE TABLE produtos (
  id UUID PRIMARY KEY,
  empresa_id UUID REFERENCES empresas(id),
  descricao VARCHAR NOT NULL,
  codigo VARCHAR,
  ncm VARCHAR,
  cfop VARCHAR,
  valor_unitario DECIMAL(10,2),
  -- Campos fiscais
  cst VARCHAR, -- Para regime normal
  csosn VARCHAR, -- Para Simples Nacional
  aliquota_icms DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `pdv` (Vendas/NFe)
```sql
CREATE TABLE pdv (
  id UUID PRIMARY KEY,
  empresa_id UUID REFERENCES empresas(id),
  cliente_id UUID REFERENCES clientes(id),
  numero_nfe INTEGER,
  chave_nfe VARCHAR,
  status VARCHAR DEFAULT 'rascunho', -- rascunho, emitido, cancelado
  modelo INTEGER DEFAULT 55, -- 55=NFe, 65=NFC-e
  ambiente INTEGER DEFAULT 2, -- 1=produção, 2=homologação
  valor_total DECIMAL(10,2),
  data_emissao TIMESTAMP,
  natureza_operacao VARCHAR,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `pdv_itens`
```sql
CREATE TABLE pdv_itens (
  id UUID PRIMARY KEY,
  pdv_id UUID REFERENCES pdv(id),
  produto_id UUID REFERENCES produtos(id),
  descricao VARCHAR NOT NULL,
  quantidade DECIMAL(10,3),
  valor_unitario DECIMAL(10,2),
  valor_total DECIMAL(10,2),
  ncm VARCHAR,
  cfop VARCHAR,
  cst VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `nfe_config`
```sql
CREATE TABLE nfe_config (
  id UUID PRIMARY KEY,
  empresa_id UUID REFERENCES empresas(id),
  ambiente VARCHAR DEFAULT 'homologacao', -- homologacao, producao
  ultimo_numero_nfe INTEGER DEFAULT 0,
  ultimo_numero_nfce INTEGER DEFAULT 0,
  serie_nfe INTEGER DEFAULT 1,
  serie_nfce INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `nfe_natureza_op`
```sql
CREATE TABLE nfe_natureza_op (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR NOT NULL, -- Código para XML
  descricao VARCHAR NOT NULL, -- Descrição amigável
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Storage Buckets
```
certificadodigital/
├── {empresa_id}/
│   └── certificado.p12    # Certificado PKCS#12
```

## 🔗 Endpoints da API NFe

### Base URL: `https://apinfe.nexopdv.com`

#### Status e Monitoramento
```http
GET /api/status
# Retorna status da API

GET /api/status-sefaz
# Retorna status do SEFAZ
```

#### Geração e Emissão
```http
POST /api/gerar-nfe
Content-Type: application/json
# Body: dados completos da NFe
# Retorna: XML gerado + chave

POST /api/enviar-sefaz
Content-Type: application/json
# Body: { xml, chave, empresa_id, ambiente }
# Retorna: protocolo SEFAZ
```

## 📦 Dependências Principais

### Frontend
```json
{
  "dependencies": {
    "react": "^18.0.0",
    "typescript": "^5.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "lucide-react": "^0.400.0",
    "tailwindcss": "^3.0.0"
  }
}
```

### API (PHP)
```json
{
  "require": {
    "nfephp-org/sped-nfe": "^6.0",
    "php": ">=8.0"
  }
}
```

## 🔧 Configurações Importantes

### Vite Config
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 5173,
    host: true
  }
});
```

### Supabase Config
```typescript
// src/lib/supabase.ts
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
```

### Tailwind Config
```javascript
// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { /* cores personalizadas */ }
      }
    }
  }
}
```
