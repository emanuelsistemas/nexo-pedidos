# ⚖️ Contexto Legal e Regras de Negócio - Sistema NFC-e

## 📋 **LEIS FUNDAMENTAIS DO PROJETO**

### **IMPORTANTE**: Este projeto segue 5 leis fundamentais documentadas na pasta `/root/nexo-pedidos/chat-ia/`. Consulte sempre esses arquivos antes de implementar qualquer funcionalidade fiscal.

### **Documentação Oficial Obrigatória**:
1. **sped-nfe**: https://github.com/nfephp-org/sped-nfe/blob/master/docs/Make.md
2. **Manual NFe**: https://www.mjailton.com.br/manualnfe/

## 🎯 **REGRAS DE NEGÓCIO IMPLEMENTADAS**

### **1. SÉRIES INDIVIDUAIS POR USUÁRIO**
- **Regra**: Cada usuário deve ter sua própria série de NFC-e
- **Implementação**: Campo `serie_nfce` na tabela `usuarios`
- **Validação**: Série 1 para usuário principal, séries customizadas para demais
- **Objetivo**: Evitar mistura de XMLs entre usuários

### **2. REGIME TRIBUTÁRIO E CAMPOS FISCAIS**
- **Regra**: Validar regime tributário da empresa antes de exibir campos
- **Simples Nacional (regime = 1)**: Mostrar campos CSOSN
- **Outros regimes**: Mostrar campos CST
- **Implementação**: Validação dinâmica nos modais de edição

### **3. CANCELAMENTO FISCAL NFC-e**
- **Prazo**: 15 minutos após emissão
- **Validação**: Verificar timestamp de emissão vs atual
- **Processo**: Cancelamento na SEFAZ + atualização local
- **Status**: `status_fiscal = 'cancelada'`

### **4. ARMAZENAMENTO DE ARQUIVOS**
- **Local**: `/root/nexo-pedidos/backend/storage/`
- **Estrutura**: Separação por modelo de documento
  - NFe (modelo 55): `/pdf55/` e `/xml55/`
  - NFC-e (modelo 65): `/pdf65/` e `/xml65/`
- **Organização**: `/empresa_ID/ambiente/modelo/TipoOperacao/`

### **5. CONFIGURAÇÃO DE EMAIL**
- **SMTP**: Gmail configurado em `/root/nexo-pedidos/backend/.env`
- **Credenciais**: nexopdv@gmail.com com TLS
- **Tratamento**: Erros de email como toast notifications

## 🔧 **IMPLEMENTAÇÕES ESPECÍFICAS**

### **CPF/CNPJ na Emissão**
- **Regra**: Quando CPF/CNPJ é informado, deve aparecer no card da venda
- **Implementação**: Campo `documento_cliente` sempre salvo
- **Exibição**: Acima de "Consumidor Final" no card
- **Formato**: Detecção automática CPF (11 dígitos) vs CNPJ (14 dígitos)

### **Filtros de Movimento**
- **Regra**: Listagem deve mostrar apenas vendas PDV e NFC-e
- **Exclusão**: NFe (modelo 55) não aparecem na listagem de movimentos
- **Implementação**: `.or('modelo_documento.is.null,modelo_documento.eq.65')`
- **Tipos exibidos**:
  - Vendas PDV normais (`modelo_documento = null`)
  - NFC-e emitidas (`modelo_documento = 65`)

### **Status Fiscal e Tags**
- **Estados possíveis**:
  - `pendente`: NFC-e com erro, precisa reprocessamento
  - `autorizada`: NFC-e válida na SEFAZ
  - `cancelada`: NFC-e cancelada fiscalmente
  - `nao_fiscal`: Venda sem documento fiscal
- **Exibição**: Tags coloridas nos cards das vendas

### **Emissão Retroativa**
- **Funcionalidade**: Emitir NFC-e para vendas já finalizadas
- **Localização**: Modal de itens da venda
- **Condição**: Apenas para vendas sem `tentativa_nfce`
- **Processo**: Reutiliza fluxo de emissão existente

## 📊 **ESTRUTURA DE DADOS FISCAL**

### **Tabela: `pdv`**
```sql
-- Campos fiscais principais
modelo_documento INTEGER,        -- null=PDV, 65=NFC-e, 55=NFe
numero_documento INTEGER,        -- Número sequencial do documento
serie_documento INTEGER,         -- Série do documento
status_fiscal TEXT,             -- Status na SEFAZ
chave_nfe TEXT,                 -- Chave de acesso (44 dígitos)
protocolo_nfe TEXT,             -- Protocolo de autorização
protocolo_cancelamento TEXT,    -- Protocolo de cancelamento
data_emissao_nfe TIMESTAMP,     -- Data/hora da autorização
erro_fiscal TEXT,               -- Mensagem de erro (se houver)
tentativa_nfce BOOLEAN,         -- Flag de tentativa de emissão

-- Campos do destinatário
documento_cliente TEXT,         -- CPF/CNPJ (apenas números)
tipo_documento_cliente TEXT,    -- 'cpf' ou 'cnpj'
nome_cliente TEXT,              -- Nome do cliente
telefone_cliente TEXT,          -- Telefone do cliente

-- Campos de cancelamento
cancelada_em TIMESTAMP,         -- Data/hora do cancelamento
motivo_cancelamento TEXT,       -- Motivo do cancelamento
cancelada_por_usuario_id UUID,  -- Usuário que cancelou
```

### **Tabela: `usuarios`**
```sql
-- Campo específico para NFC-e
serie_nfce INTEGER DEFAULT 1,   -- Série individual do usuário
```

### **Tabela: `empresas`**
```sql
-- Campos para NFC-e
regime_tributario INTEGER,      -- 1=Simples Nacional, 3=Lucro Real, etc.
csc_homologacao TEXT,          -- CSC para homologação
csc_id_homologacao INTEGER,    -- ID do CSC homologação
csc_producao TEXT,             -- CSC para produção
csc_id_producao INTEGER,       -- ID do CSC produção
```

## 🔄 **FLUXOS FISCAIS IMPLEMENTADOS**

### **1. Emissão de NFC-e**
1. Validação de dados da empresa
2. Geração do próximo número sequencial
3. Preparação dos dados fiscais
4. Envio para SEFAZ via backend PHP
5. Processamento da resposta
6. Atualização do banco de dados
7. Armazenamento de XML/PDF

### **2. Cancelamento Fiscal**
1. Validação do prazo (15 minutos)
2. Verificação de autorização prévia
3. Envio de cancelamento para SEFAZ
4. Atualização do status fiscal
5. Registro do protocolo de cancelamento

### **3. Reprocessamento de NFC-e**
1. Edição de dados fiscais (CFOP, CST, CSOSN, NCM)
2. Salvamento das modificações
3. Nova tentativa de emissão
4. Atualização do status

## ⚠️ **VALIDAÇÕES CRÍTICAS**

### **Documentos Fiscais**
- CPF: Validação com algoritmo padrão (11 dígitos)
- CNPJ: Validação com algoritmo padrão (14 dígitos)
- Formatação automática com máscaras
- Salvamento sempre em números (sem formatação)

### **Campos Obrigatórios NFC-e**
- Código do produto (sem fallback)
- NCM do produto (sem fallback)
- CFOP do produto (sem fallback)
- Unidade de medida (sem fallback)
- Dados completos da empresa

### **Ambiente SEFAZ**
- Homologação: Para testes
- Produção: Para documentos válidos
- CSC específico por ambiente
- Configuração na tabela `nfe_config`

## 🎯 **PADRÕES DE QUALIDADE**

### **Tratamento de Erros**
- Mensagens específicas da SEFAZ
- Logs detalhados para debugging
- Fallbacks para dados não encontrados
- Validações preventivas

### **Interface do Usuário**
- Feedback visual em tempo real
- Loading states durante processamento
- Toast notifications para resultados
- Validações com bordas coloridas

### **Performance**
- Consultas otimizadas no banco
- Limite de registros por consulta
- Estados locais para validações
- Debounce em campos de entrada

## 📝 **OBSERVAÇÕES IMPORTANTES**

### **Compatibilidade**
- Sistema funciona com sped-nfe library
- Backend PHP para integração SEFAZ
- Frontend React/TypeScript
- Banco Supabase PostgreSQL

### **Segurança**
- CSC nunca exposto no frontend
- Validações server-side obrigatórias
- Logs de auditoria para operações fiscais
- Controle de acesso por usuário

### **Manutenibilidade**
- Código documentado e comentado
- Padrões consistentes de nomenclatura
- Separação clara de responsabilidades
- Reutilização de componentes existentes

## 🚀 **PRÓXIMAS IMPLEMENTAÇÕES SUGERIDAS**

### **Melhorias Fiscais**
1. Carta de correção eletrônica
2. Inutilização de numeração
3. Consulta de status na SEFAZ
4. Backup automático de XMLs

### **Relatórios**
1. Relatório de vendas por status fiscal
2. Relatório de cancelamentos
3. Relatório de rejeições SEFAZ
4. Dashboard fiscal

### **Integrações**
1. Envio automático por email
2. Integração com contabilidade
3. Backup em nuvem
4. Monitoramento de status SEFAZ
