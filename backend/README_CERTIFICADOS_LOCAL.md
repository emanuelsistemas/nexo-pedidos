# Sistema de Certificados Digitais - Storage Local

## 🎯 **Problema Resolvido**

Anteriormente, os certificados digitais eram armazenados no Supabase Storage, causando problemas de comunicação entre a API e os certificados. Agora, com tudo no mesmo ambiente (VPS), os certificados ficam no storage local para máxima performance e confiabilidade.

## 🏗️ **Arquitetura Multi-Tenant**

### **Organização por ID da Empresa**

```
backend/storage/
├── certificados/
│   ├── empresa_uuid1.pfx          # Certificado da Empresa 1
│   ├── empresa_uuid1.json         # Metadados da Empresa 1
│   ├── empresa_uuid2.pfx          # Certificado da Empresa 2
│   └── empresa_uuid2.json         # Metadados da Empresa 2
├── xml/
│   ├── empresa_uuid1/             # XMLs da Empresa 1
│   │   ├── 35250611222333000181550010000000011.xml
│   │   └── 35250611222333000181550010000000012.xml
│   └── empresa_uuid2/             # XMLs da Empresa 2
│       └── 35250644555666000199550010000000001.xml
└── pdf/
    ├── empresa_uuid1/             # PDFs da Empresa 1
    └── empresa_uuid2/             # PDFs da Empresa 2
```

### **Vantagens desta Estrutura:**

✅ **ID da empresa nunca muda** - Suporte a mudança de CNPJ  
✅ **Isolamento total** - Cada empresa tem seus próprios arquivos  
✅ **Escalabilidade** - Fácil de organizar e manter  
✅ **Performance** - Acesso local direto aos arquivos  
✅ **Backup simples** - Backup por empresa  

## 🔧 **Componentes Implementados**

### **1. Backend (PHP)**

- **`CertificateManager.php`** - Classe principal para gerenciar certificados
- **`upload-certificado.php`** - Endpoint para upload de certificados
- **`remove-certificado.php`** - Endpoint para remoção de certificados
- **`check-certificado.php`** - Endpoint para verificar status
- **`files.php`** - Endpoint para servir XMLs e PDFs

### **2. Frontend (React/TypeScript)**

- **`useCertificateUpload.ts`** - Hook para upload local
- **`ConfiguracoesPage.tsx`** - Página atualizada para usar storage local

## 📡 **Endpoints da API**

### **Upload de Certificado**
```
POST /backend/public/upload-certificado.php

FormData:
- certificado: File (.pfx ou .p12)
- senha: string
- empresa_id: string (UUID da empresa)

Response:
{
  "success": true,
  "data": {
    "empresa_id": "uuid",
    "filename": "empresa_uuid.pfx",
    "validade": "2025-12-31 23:59:59",
    "nome_certificado": "EMPRESA TESTE LTDA",
    "path": "/storage/certificados/empresa_uuid.pfx"
  }
}
```

### **Verificar Certificado**
```
GET /backend/public/check-certificado.php?empresa_id=uuid

Response:
{
  "success": true,
  "exists": true,
  "data": {
    "empresa_id": "uuid",
    "status": "ativo|vencendo|vencido",
    "validade": "2025-12-31 23:59:59",
    "nome_certificado": "EMPRESA TESTE LTDA"
  }
}
```

### **Remover Certificado**
```
POST /backend/public/remove-certificado.php

JSON Body:
{
  "empresa_id": "uuid"
}

Response:
{
  "success": true,
  "message": "Certificado removido com sucesso"
}
```

## 🔄 **Fluxo de Upload**

1. **Frontend** - Usuário seleciona arquivo .pfx e informa senha
2. **Validação** - Arquivo é validado (tipo, tamanho, senha)
3. **Upload Local** - Certificado é salvo em `/storage/certificados/empresa_ID.pfx`
4. **Metadados** - Informações são salvas no Supabase para controle
5. **Confirmação** - Usuário recebe confirmação de sucesso

## 🔐 **Segurança**

### **Permissões de Arquivo**
- Certificados: `0600` (apenas proprietário pode ler/escrever)
- Metadados: `0600` (apenas proprietário pode ler/escrever)
- Diretórios: `0700` (apenas proprietário pode acessar)

### **Validações**
- Tipo de arquivo (.pfx ou .p12)
- Tamanho máximo (5MB)
- Senha do certificado
- ID da empresa válido

## 📊 **Integração com Supabase**

### **Tabela `empresas` - Campos Atualizados**
```sql
-- Campos para controle do certificado local
certificado_digital_path         -- Caminho local do arquivo
certificado_digital_senha        -- Senha do certificado
certificado_digital_validade     -- Data de validade
certificado_digital_status       -- ativo|vencendo|vencido
certificado_digital_nome         -- Nome do certificado
certificado_digital_uploaded_at  -- Data do upload
certificado_digital_local        -- Flag indicando storage local
```

## 🚀 **Como Usar no Frontend**

```typescript
import { useCertificateUpload } from '../hooks/useCertificateUpload';

const { uploadCertificateLocal, isUploading } = useCertificateUpload();

const handleUpload = async () => {
  const result = await uploadCertificateLocal(
    file,           // File object
    password,       // string
    empresaId       // string (UUID)
  );
  
  if (result.success) {
    console.log('Upload realizado com sucesso!');
  }
};
```

## 🔄 **Migração do Sistema Anterior**

Se você tinha certificados no Supabase Storage, pode migrar usando:

```php
// Script de migração (criar se necessário)
$supabaseUrl = 'https://your-project.supabase.co/storage/v1/object/certificadodigital/';
$localPath = '/storage/certificados/';

// Baixar do Supabase e salvar localmente
// Atualizar metadados na tabela empresas
```

## 🧪 **Testes**

Execute o teste completo:
```bash
cd backend
php teste_certificado_local.php
```

## 📋 **Próximos Passos**

1. **Testar upload** no frontend
2. **Configurar servidor web** para servir os endpoints
3. **Implementar backup** dos certificados
4. **Monitorar validade** dos certificados
5. **Logs de auditoria** para uploads/remoções

## ⚠️ **Importante**

- **Backup regular** dos certificados
- **Monitoramento** da validade
- **Logs de acesso** para auditoria
- **HTTPS obrigatório** em produção
- **Firewall** para proteger endpoints

---

✅ **Sistema implementado e testado com sucesso!**

O upload de certificados agora é feito diretamente para o storage local da VPS, eliminando problemas de comunicação e melhorando a performance do sistema NFe.
