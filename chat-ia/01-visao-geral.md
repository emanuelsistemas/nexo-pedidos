# 🏗️ Visão Geral do Sistema NFe/NFC-e

## 📐 Arquitetura Atual

### 🎯 Modelo Híbrido
O sistema utiliza uma arquitetura híbrida que combina:
- **Frontend**: React/TypeScript local para interface
- **API NFe**: PHP no VPS para processamento fiscal
- **Database**: Supabase para dados gerais

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API NFe       │    │   Supabase      │
│   React/TS      │◄──►│   PHP/NFePHP    │    │   PostgreSQL    │
│   localhost     │    │   VPS Dedicado  │    │   Cloud         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🌐 Domínios e URLs

### Frontend
- **Desenvolvimento**: http://localhost:5173
- **Produção**: TBD (ainda não definido)

### API NFe
- **Domínio**: https://apinfe.nexopdv.com
- **Ambiente**: VPS dedicado
- **Certificados**: Armazenados no Supabase, enviados via API

### Database
- **Supabase**: Configurado no projeto
- **Projetos**: 
  - `nexo` (ID: xsrirnfwsjeovekwtluz)
  - `drive` (ID: jfyuecvxehazrvjdvcwx)

## 🛠️ Stack Tecnológico

### Frontend
```typescript
// Principais tecnologias
React 18+
TypeScript
Tailwind CSS
Vite (build tool)
Supabase Client
```

### Backend API NFe
```php
// Tecnologias do servidor
PHP 8+
NFePHP Library (nfephp-org/sped-nfe)
Nginx
Certificados PKCS#12
```

### Database
```sql
-- Supabase PostgreSQL
-- Tabelas principais:
- empresas (dados das empresas)
- clientes (destinatários)
- produtos (itens para NFe)
- pdv (vendas/NFe)
- pdv_itens (itens das vendas)
- nfe_config (configurações por empresa)
- nfe_natureza_op (naturezas de operação)
```

## 🔄 Fluxo de Dados

### Emissão de NFe
1. **Frontend** coleta dados do usuário
2. **Supabase** fornece dados de empresa/cliente/produtos
3. **API NFe** recebe dados + certificado do Supabase
4. **NFePHP** gera XML e comunica com SEFAZ
5. **Resultado** retorna para frontend
6. **Supabase** armazena NFe emitida

### Autenticação
- **Frontend**: Supabase Auth
- **API NFe**: Token removido (sem autenticação por enquanto)
- **Multi-tenant**: Por empresa_id

## 🎯 Características Principais

### Multi-Tenant SaaS
- Cada empresa tem seus próprios dados
- Certificados digitais por empresa
- Configurações independentes (homolog/prod)

### Ambientes NFe
- **Homologação**: Testes com SEFAZ
- **Produção**: NFe válidas

### Segurança
- Certificados armazenados no Supabase
- Senhas validadas antes do upload
- RLS (Row Level Security) implementado

## 📊 Status Atual

### ✅ Implementado
- Interface de emissão completa
- Validação de dados
- Integração com API NFe
- Sistema de logs detalhados
- Salvamento de rascunhos
- Verificação de status API/SEFAZ

### 🔄 Em Desenvolvimento
- Debug da geração de XML
- Configuração de certificados
- Numeração automática

### 📋 Pendente
- Cancelamento de NFe
- Inutilização de numeração
- Reenvio de email
- Relatórios e consultas
